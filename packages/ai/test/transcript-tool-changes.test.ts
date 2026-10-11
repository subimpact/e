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

// A transcript whose tool list changes mid-conversation: the later system message carries the
// complete snapshot that replaces the earlier list.
const context: Context = {
	messages: [
		{
			role: "system",
			content: "base prompt",
			sections: { rules: "<rules>\nold rules\n</rules>", docs: "<docs>\nread docs\n</docs>" },
			tools: [baseTool],
			timestamp: 0,
		},
		{ role: "user", content: "before", timestamp: 1 },
		{
			role: "system",
			content: "updated guidance",
			sections: { rules: "<rules>\nnew rules\n</rules>", docs: null },
			tools: [lateTool],
			timestamp: 2,
		},
		{ role: "user", content: "after", timestamp: 3 },
	],
};
// A snapshot that removes every tool.
const removalContext: Context = {
	messages: [
		{ role: "system", content: "base prompt", tools: [baseTool], timestamp: 0 },
		{ role: "user", content: "before", timestamp: 1 },
		{ role: "system", content: "updated guidance", tools: [], timestamp: 2 },
		{ role: "user", content: "after", timestamp: 3 },
	],
};
const redefinedContext: Context = {
	messages: [
		{ role: "system", content: "base prompt", tools: [baseTool], timestamp: 0 },
		{ role: "user", content: "before", timestamp: 1 },
		{
			role: "system",
			content: "updated guidance",
			tools: [{ ...baseTool, description: "changed definition" }],
			timestamp: 2,
		},
		{ role: "user", content: "after", timestamp: 3 },
	],
};

const anthropicNativeModel: Model<"anthropic-messages"> = {
	...modelBase,
	id: "claude-opus-5",
	name: "Claude Opus 5",
	api: "anthropic-messages",
	provider: "anthropic",
	compat: { supportsMidConvoSystemMessages: true },
};

const openAiNativeModel: Model<"openai-responses"> = {
	...modelBase,
	id: "gpt-5.5",
	name: "GPT 5.5",
	api: "openai-responses",
	provider: "openai",
	compat: { supportsMidConvoSystemMessages: true },
};

const kimiNativeModel: Model<"openai-completions"> = {
	...modelBase,
	id: "kimi-k3",
	name: "Kimi K3",
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
	test("Anthropic: a mid-conversation tool change sends the current full list and no change surface", async () => {
		const payload = await capturePayload<AnthropicPayload>(anthropicNativeModel, context);
		expect(payload.tools?.map((tool) => tool.name)).toEqual(["late_tool"]);
		expect(payload.tools?.some((tool) => tool.defer_loading === true)).toBe(false);
		expect(payload.betas ?? []).not.toContain("mid-conversation-tool-changes");
		const serialized = JSON.stringify(payload);
		expect(serialized).not.toContain("tool_addition");
		expect(serialized).not.toContain("tool_removal");
		expect(serialized).not.toContain("defer_loading");
		expect(serialized).not.toContain("mid-conversation-tool-changes");
		// Mid-conversation system messages carry text only, never tools.
		expect(payload.messages.filter((message) => message.role === "system")).toHaveLength(1);
	});

	test("Anthropic: an empty snapshot removes the tools", async () => {
		const payload = await capturePayload<AnthropicPayload>(anthropicNativeModel, removalContext);
		expect(payload.tools ?? []).toEqual([]);
	});

	test("Anthropic: a redefining snapshot carries the current definition", async () => {
		const payload = await capturePayload<AnthropicPayload>(anthropicNativeModel, redefinedContext);
		expect(payload.tools).toMatchObject([{ name: "base_tool", description: "changed definition" }]);
	});

	test("Anthropic: folds updates into the system prompt without native system-message support", async () => {
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

		expect(payload.betas ?? []).not.toContain("mid-conversation-tool-changes");
		expect(payload.system?.map((block) => block.text)).toEqual([
			"base prompt\n\nupdated guidance\n\n<rules>\nnew rules\n</rules>",
		]);
		expect(payload.tools?.map((value) => value.name)).toEqual(["late_tool"]);
		expect(payload.messages.map((message) => message.role)).toEqual(["user", "user"]);
	});

	test("OpenAI Responses: a mid-conversation tool change sends the current full list and no search surface", async () => {
		const payload = await capturePayload<{ tools?: Array<{ name: string }>; input?: unknown[] }>(
			openAiNativeModel,
			context,
		);
		expect(payload.tools?.map((tool) => tool.name)).toEqual(["late_tool"]);
		const serialized = JSON.stringify(payload);
		expect(serialized).not.toContain("defer_loading");
		expect(serialized).not.toContain("tool_search");
		expect(serialized).not.toContain("tool_addition");
		expect(serialized).not.toContain("tool_removal");
		expect(serialized).not.toContain("additional_tools");
		expect(serialized).not.toContain("mid-conversation-tool-changes");
	});

	test("OpenAI Responses: folds updates into the leading developer message without native support", async () => {
		const model: Model<"openai-responses"> = {
			...modelBase,
			id: "gpt-4.1",
			name: "GPT-4.1",
			api: "openai-responses",
			provider: "openai",
		};
		const payload = await capturePayload<{
			tools?: Array<{ name: string }>;
			input: Array<{ type?: string; role?: string; content?: string }>;
		}>(model, context);

		expect(payload.tools?.map((value) => value.name)).toEqual(["late_tool"]);
		expect(payload.input.map((item) => item.type ?? item.role)).toEqual(["developer", "user", "user"]);
		expect(payload.input[0]?.content).toBe("base prompt\n\nupdated guidance\n\n<rules>\nnew rules\n</rules>");
	});

	test("Kimi: a mid-conversation tool change sends the current full list with no dynamic tool messages", async () => {
		const payload = await capturePayload<{
			tools?: Array<{ function?: { name: string } }>;
			messages: Array<{ role: string; content?: string; tools?: unknown }>;
		}>(kimiNativeModel, context);
		expect(payload.tools?.map((value) => value.function?.name)).toEqual(["late_tool"]);
		expect(payload.messages.some((message) => message.tools !== undefined)).toBe(false);
		const serialized = JSON.stringify(payload);
		expect(serialized).not.toContain("defer_loading");
		expect(serialized).not.toContain("tool_addition");
		expect(serialized).not.toContain("tool_removal");
		expect(serialized).not.toContain("mid-conversation-tool-changes");
	});

	test("OpenAI-compatible: folds updates into the system prompt without native support", async () => {
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
		expect(payload.messages.map((message) => message.role)).toEqual(["system", "user", "user"]);
		expect(payload.messages[0]?.content).toBe("base prompt\n\nupdated guidance\n\n<rules>\nnew rules\n</rules>");
	});
});
