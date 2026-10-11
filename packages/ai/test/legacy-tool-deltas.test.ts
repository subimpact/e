import { Type } from "typebox";
import { describe, expect, test } from "vitest";
import type { Tool } from "../src/types.ts";
import { upgradeLegacyToolDeltas } from "../src/utils/legacy-tool-deltas.ts";
import { getCurrentTools } from "../src/utils/transcript.ts";

function tool(name: string, description = `${name} tool`): Tool {
	return { name, description, parameters: Type.Object({}) };
}

interface LegacyMessage {
	role: string;
	content?: string;
	tools?: Tool[];
	toolsAdded?: Tool[];
	toolsRemoved?: { name: string }[];
	timestamp: number;
}

describe("upgradeLegacyToolDeltas", () => {
	test("applies additions and rewrites the delta into a snapshot", () => {
		const first = tool("a");
		const second = tool("b");
		const firstAdd = { role: "system", content: "one", toolsAdded: [first], timestamp: 1 } satisfies LegacyMessage;
		const secondAdd = { role: "system", content: "two", toolsAdded: [second], timestamp: 2 } satisfies LegacyMessage;
		const user = { role: "user", content: "hi", timestamp: 3 } satisfies LegacyMessage;
		const upgraded = upgradeLegacyToolDeltas([firstAdd, user, secondAdd]);
		expect(upgraded[0]).toMatchObject({ role: "system", content: "one", tools: [first] });
		expect(upgraded[1]).toBe(user);
		expect(upgraded[2]).toMatchObject({ role: "system", content: "two", tools: [first, second] });
		expect(getCurrentTools(upgraded).map((tool) => tool.name)).toEqual(["a", "b"]);
	});

	test("applies removals", () => {
		const first = tool("a");
		const messages: LegacyMessage[] = [
			{ role: "system", content: "", toolsAdded: [first, tool("b")], timestamp: 1 },
			{ role: "system", content: "", toolsRemoved: [{ name: "b" }], timestamp: 2 },
		];
		const upgraded = upgradeLegacyToolDeltas(messages);
		expect(getCurrentTools(upgraded).map((tool) => tool.name)).toEqual(["a"]);
	});

	test("rewrites a redefinition with the current definition", () => {
		const messages: LegacyMessage[] = [
			{ role: "system", content: "", toolsAdded: [tool("a")], timestamp: 1 },
			{ role: "system", content: "", toolsAdded: [tool("a", "changed")], timestamp: 2 },
		];
		const upgraded = upgradeLegacyToolDeltas(messages);
		expect(getCurrentTools(upgraded).map((tool) => tool.description)).toEqual(["changed"]);
	});

	test("passthrough without legacy fields keeps object identity", () => {
		const first = tool("a");
		const system = { role: "system", content: "", tools: [first], timestamp: 1 } satisfies LegacyMessage;
		const user = { role: "user", content: "hi", timestamp: 2 } satisfies LegacyMessage;
		const upgraded = upgradeLegacyToolDeltas([system, user]);
		expect(upgraded).toEqual([system, user]);
		expect(upgraded[0]).toBe(system);
		expect(upgraded[1]).toBe(user);
	});

	test("rewritten messages carry no legacy fields", () => {
		const messages: LegacyMessage[] = [{ role: "system", content: "", toolsAdded: [tool("a")], timestamp: 1 }];
		const upgraded = upgradeLegacyToolDeltas(messages) as LegacyMessage[];
		expect("toolsAdded" in upgraded[0]).toBe(false);
		expect("toolsRemoved" in upgraded[0]).toBe(false);
	});
});
