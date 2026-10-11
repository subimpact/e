import { Type } from "typebox";
import { describe, expect, test } from "vitest";
import { streamSimple } from "../src/compat.ts";
import type { Api, Context, Model, Tool } from "../src/types.ts";

class PayloadCaptured extends Error {}

function tool(name: string): Tool {
	return { name, description: `${name} tool`, parameters: Type.Object({}) };
}

async function capturePayload<T>(model: Model<Api>, context: Context): Promise<T> {
	let captured: T | undefined;
	const stream = streamSimple(model, context, {
		apiKey: "test-key",
		onPayload: (payload) => {
			captured = payload as T;
			throw new PayloadCaptured();
		},
	});
	await stream.result();
	if (!captured) throw new Error("Expected payload capture");
	return captured;
}

const modelBase = {
	baseUrl: "http://127.0.0.1:9",
	reasoning: true,
	input: ["text"] as ("text" | "image")[],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 100000,
	maxTokens: 1000,
};

const baseTool = tool("base_tool");
const lateTool = tool("late_tool");
const context: Context = {
	messages: [
		{
			role: "system",
			content: "base prompt",
			sections: { rules: "<rules>\nold rules\n</rules>", docs: "<docs>\nread docs\n</docs>" },
			toolsAdded: [baseTool],
			timestamp: 0,
		},
		{ role: "user", content: "before", timestamp: 1 },
		{
			role: "system",
			content: "updated guidance",
			sections: { rules: "<rules>\nnew rules\n</rules>", docs: null },
			toolsRemoved: [{ name: "base_tool" }],
			toolsAdded: [lateTool],
			timestamp: 2,
		},
	],
};
const additionContext: Context = {
	messages: [
		{ role: "system", content: "base prompt", toolsAdded: [baseTool], timestamp: 0 },
		{ role: "user", content: "before", timestamp: 1 },
		{ role: "system", content: "updated guidance", toolsAdded: [lateTool], timestamp: 2 },
	],
};

const anthropicNativeModel: Model<"anthropic-messages"> = {
	...modelBase,
	id: "claude-opus-5",
	name: "Claude Opus 5",
	api: "anthropic-messages",
	provider: "anthropic",
	compat: { supportsMidConvoSystemMessages: true, supportsMidConvoToolChanges: true },
};

const openAiNativeModel: Model<"openai-responses"> = {
	...modelBase,
	id: "gpt-5.5",
	name: "GPT 5.5",
	api: "openai-responses",
	provider: "openai",
	compat: { supportsAdditionalTools: true, supportsToolSearch: true },
};

const kimiNativeModel: Model<"openai-completions"> = {
	...modelBase,
	id: "kimi-k2.7-code",
	name: "Kimi K2.7 Code",
	api: "openai-completions",
	provider: "kimi",
	compat: { supportsMidConvoSystemMessages: true },
};

interface AnthropicPayload {
	betas?: string[];
	system?: Array<{ text: string }>;
	tools?: Array<{ name: string; defer_loading?: boolean; cache_control?: unknown }>;
	messages: Array<{ role: string; content: Array<{ type: string; text?: string; tool?: { name: string } }> }>;
}

describe("transcript system messages", () => {
	test("never sends Anthropic native tool changes (carve: no tool-search surface)", async () => {
		const payload = await capturePayload<AnthropicPayload>(anthropicNativeModel, context);
		expect(payload.betas ?? []).not.toContain("mid-conversation-tool-changes-2026-07-01");
		expect(payload.tools?.some((tool) => tool.name === "__pi_deferred_placeholder__")).toBe(false);
		expect(payload.tools?.some((tool) => tool.defer_loading === true)).toBe(false);
		const serialized = JSON.stringify(payload.messages);
		expect(serialized).not.toContain("tool_addition");
		expect(serialized).not.toContain("tool_removal");
	});

	test("sends the current Anthropic tool list when native tool changes cannot express the history", async () => {
		const redefinedTool = { ...baseTool, description: "changed" };
		const fallbackContexts: Context[] = [
			// Same-name redefinition: blocks reference tools by name only.
			{
				messages: [
					{ role: "system", content: "base prompt", toolsAdded: [baseTool], timestamp: 0 },
					{
						role: "system",
						content: "updated guidance",
						toolsRemoved: [{ name: "base_tool" }],
						toolsAdded: [redefinedTool],
						timestamp: 2,
					},
				],
			},
			// No initial tool: Anthropic rejects an all-deferred tool list.
			{
				messages: [
					{ role: "system", content: "base prompt", timestamp: 0 },
					{ role: "system", content: "updated guidance", toolsAdded: [redefinedTool], timestamp: 2 },
				],
			},
		];
		for (const fallbackContext of fallbackContexts) {
			const payload = await capturePayload<AnthropicPayload>(anthropicNativeModel, fallbackContext);
			expect(payload.betas ?? []).not.toContain("mid-conversation-tool-changes-2026-07-01");
			expect(payload.tools).toMatchObject([
				{ name: "base_tool", description: "changed", cache_control: { type: "ephemeral" } },
			]);
			expect(payload.tools?.[0]?.defer_loading).toBeUndefined();
			expect(payload.messages.at(-1)?.content.map((block) => block.type)).toEqual(["text"]);
		}
	});

	test("folds Anthropic updates into the system prompt without native support", async () => {
		const model: Model<"anthropic-messages"> = {
			...modelBase,
			id: "claude-sonnet-4-5",
			name: "Claude Sonnet 4.5",
			api: "anthropic-messages",
			provider: "anthropic",
		};
		const payload = await capturePayload<{
			betas?: string[];
			system?: Array<{ text: string }>;
			tools?: Array<{ name: string }>;
			messages: Array<{ role: string }>;
		}>(model, context);

		expect(payload.betas ?? []).not.toContain("mid-conversation-tool-changes-2026-07-01");
		expect(payload.system?.map((block) => block.text)).toEqual([
			"base prompt\n\nupdated guidance\n\n<rules>\nnew rules\n</rules>",
		]);
		expect(payload.tools?.map((value) => value.name)).toEqual(["late_tool"]);
		expect(payload.messages.map((message) => message.role)).toEqual(["user"]);
	});

	test("requires both Anthropic capabilities for native tool changes", async () => {
		const model: Model<"anthropic-messages"> = {
			...modelBase,
			id: "claude-opus-5",
			name: "Claude Opus 5",
			api: "anthropic-messages",
			provider: "anthropic",
			compat: { supportsMidConvoToolChanges: true },
		};
		const payload = await capturePayload<{
			betas?: string[];
			tools?: Array<{ name: string }>;
			messages: Array<{ role: string }>;
		}>(model, context);

		expect(payload.betas ?? []).not.toContain("mid-conversation-tool-changes-2026-07-01");
		expect(payload.tools?.map((value) => value.name)).toEqual(["late_tool"]);
		expect(payload.messages.map((message) => message.role)).toEqual(["user"]);
	});

	test("never anchors OpenAI tool additions (carve: no tool-search surface)", async () => {
		const payload = await capturePayload<{ tools?: unknown[]; input?: unknown[] }>(openAiNativeModel, context);
		expect(JSON.stringify(payload)).not.toContain("defer_loading");
		expect(JSON.stringify(payload)).not.toContain("tool_search");
	});

	test("never maps system-message additions into tool search (carve)", async () => {
		const payload = await capturePayload<{ tools?: unknown[]; input?: unknown[] }>(openAiNativeModel, context);
		expect(JSON.stringify(payload)).not.toContain("tool_search");
		expect(JSON.stringify(payload)).not.toContain("defer_loading");
	});

	test("folds OpenAI updates into the leading developer message without native support", async () => {
		const model: Model<"openai-responses"> = {
			...modelBase,
			id: "gpt-4.1",
			name: "GPT-4.1",
			api: "openai-responses",
			provider: "openai",
			compat: { supportsAdditionalTools: true },
		};
		const payload = await capturePayload<{
			tools?: Array<{ name: string }>;
			input: Array<{ type?: string; role?: string; content?: string }>;
		}>(model, context);

		expect(payload.tools?.map((value) => value.name)).toEqual(["late_tool"]);
		expect(payload.input.map((item) => item.type ?? item.role)).toEqual(["developer", "user"]);
		expect(payload.input[0]?.content).toBe("base prompt\n\nupdated guidance\n\n<rules>\nnew rules\n</rules>");
	});

	test("falls back to the complete current tool state when removals are unsupported", async () => {
		const model: Model<"openai-responses"> = {
			...modelBase,
			id: "gpt-5.4",
			name: "GPT-5.4",
			api: "openai-responses",
			provider: "openai",
			compat: { supportsMidConvoSystemMessages: true, supportsAdditionalTools: true },
		};
		const payload = await capturePayload<{
			tools?: Array<{ name: string }>;
			input: Array<{ type?: string; role?: string }>;
		}>(model, context);

		expect(payload.tools?.map((value) => value.name)).toEqual(["late_tool"]);
		expect(payload.input.some((item) => item.type === "additional_tools")).toBe(false);
		expect(payload.input.filter((item) => item.role === "developer")).toHaveLength(2);
	});

	test("never anchors Kimi tool additions (carve)", async () => {
		const payload = await capturePayload<{ tools?: unknown[]; messages?: unknown[] }>(kimiNativeModel, context);
		expect(JSON.stringify(payload)).not.toContain("defer_loading");
		expect(JSON.stringify(payload)).not.toContain("tool_addition");
	});

	test("keeps Kimi K2 system text inline without dynamic tool messages", async () => {
		const model: Model<"openai-completions"> = {
			...modelBase,
			id: "kimi-k2.7-code",
			name: "Kimi K2.7 Code",
			api: "openai-completions",
			provider: "moonshotai",
			compat: { supportsMidConvoSystemMessages: true },
		};
		const payload = await capturePayload<{
			tools?: Array<{ function?: { name: string } }>;
			messages: Array<{ role: string; content?: string; tools?: Array<{ function?: { name: string } }> }>;
		}>(model, additionContext);

		expect(payload.tools?.map((value) => value.function?.name)).toEqual(["base_tool", "late_tool"]);
		expect(payload.messages.some((message) => message.tools !== undefined)).toBe(false);
		expect(payload.messages.filter((message) => message.role === "system").map((message) => message.content)).toEqual(
			["base prompt", "updated guidance"],
		);
	});

	test("folds OpenAI-compatible updates into the system prompt without native support", async () => {
		const model: Model<"openai-completions"> = {
			...modelBase,
			id: "custom-model",
			name: "Custom model",
			api: "openai-completions",
			provider: "custom-provider",
			reasoning: false,
		};
		const payload = await capturePayload<{
			tools?: Array<{ function?: { name: string } }>;
			messages: Array<{ role: string; content?: string }>;
		}>(model, context);

		expect(payload.tools?.map((value) => value.function?.name)).toEqual(["late_tool"]);
		expect(payload.messages.map((message) => message.role)).toEqual(["system", "user"]);
		expect(payload.messages[0]?.content).toBe("base prompt\n\nupdated guidance\n\n<rules>\nnew rules\n</rules>");
	});
});
