import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getCurrentTools } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import { SessionManager } from "../src/core/session-manager.ts";

const cleanupPaths: string[] = [];

afterEach(() => {
	for (const path of cleanupPaths.splice(0)) rmSync(path, { recursive: true, force: true });
});

function toolA(): { name: string; description: string; parameters: Record<string, never> } {
	return { name: "a_tool", description: "tool a", parameters: {} };
}

function toolB(): { name: string; description: string; parameters: Record<string, never> } {
	return { name: "b_tool", description: "tool b", parameters: {} };
}

/** A session file in the legacy (e 0.99.12 and earlier) toolsAdded/toolsRemoved delta format. */
describe("legacy session tool deltas", () => {
	it("loads a legacy JSONL session with tool deltas and yields the right current tools", () => {
		const dir = mkdtempSync(join(tmpdir(), "pi-legacy-session-"));
		cleanupPaths.push(dir);
		const sessionFile = join(dir, "legacy.jsonl");

		const lines: string[] = [JSON.stringify({ type: "session", version: 3, id: "legacy-session", cwd: dir })];
		let prevId: string | null = null;
		const appendEntry = (entry: Record<string, unknown>): string => {
			const id = `e${lines.length}`;
			lines.push(JSON.stringify({ ...entry, id, parentId: prevId }));
			prevId = id;
			return id;
		};
		// Deltas: add a_tool and b_tool, then remove b_tool.
		appendEntry({
			type: "message",
			message: { role: "system", content: "base", toolsAdded: [toolA(), toolB()], timestamp: 1 },
		});
		appendEntry({ type: "message", message: { role: "user", content: "hello", timestamp: 2 } });
		appendEntry({
			type: "message",
			message: { role: "system", content: "after", toolsRemoved: [{ name: "b_tool" }], timestamp: 3 },
		});
		writeFileSync(sessionFile, `${lines.join("\n")}\n`);

		const session = SessionManager.open(sessionFile);
		session.setSessionFile(sessionFile);
		const messages = session.buildSessionContext().messages;
		const systemMessages = messages.filter((message) => message.role === "system");
		// Every legacy delta is rewritten into a complete snapshot.
		expect(systemMessages.every((message) => (message.tools?.length ?? 0) > 0)).toBe(true);
		expect(messages.some((message) => "toolsAdded" in (message as object))).toBe(false);
		expect(messages.some((message) => "toolsRemoved" in (message as object))).toBe(false);
		// The current tool list matches what the deltas produced.
		expect(getCurrentTools(messages).map((tool) => tool.name)).toEqual(["a_tool"]);
	});

	it("upgrades on projection without persistence", () => {
		const session = SessionManager.inMemory();
		session.appendMessage({
			role: "system",
			content: "base",
			toolsAdded: [toolA()],
			timestamp: 1,
		} as never);
		session.appendMessage({ role: "user", content: "hello", timestamp: 2 });
		const messages = session.buildSessionContext().messages;
		expect(getCurrentTools(messages).map((tool) => tool.name)).toEqual(["a_tool"]);
		expect(messages.some((message) => "toolsAdded" in (message as object))).toBe(false);
	});
});
