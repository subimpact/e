import type { Tool } from "../types.ts";

/**
 * Session files written by e 0.99.12 and earlier record tool state as per-message deltas
 * (`toolsAdded`/`toolsRemoved`) on system messages. Current code expects one complete
 * snapshot per system message instead, so loading walks the transcript in order, keeps a
 * running tool map, and rewrites each legacy system message into a full snapshot.
 */

interface LegacyToolDelta {
	toolsAdded?: Tool[];
	toolsRemoved?: { name: string }[];
}

/**
 * Rewrite legacy tool deltas into snapshots. Messages that carry neither legacy field pass
 * through unchanged (same object identity). The input list is not mutated.
 */
export function upgradeLegacyToolDeltas<T extends { role: string }>(messages: readonly T[]): T[] {
	const current = new Map<string, Tool>();
	let sawDelta = false;
	const result: T[] = [];
	for (const message of messages) {
		const delta = message as { role: string; tools?: Tool[] } & LegacyToolDelta;
		const isLegacy = delta.toolsAdded !== undefined || delta.toolsRemoved !== undefined;
		if (!isLegacy) {
			if (message.role === "system" && delta.tools !== undefined) {
				current.clear();
				for (const tool of delta.tools) current.set(tool.name, tool);
			}
			result.push(message);
			continue;
		}
		sawDelta = true;
		const {
			toolsAdded: _added,
			toolsRemoved: _removed,
			...rest
		} = message as Record<string, unknown> & {
			role: string;
		};
		for (const tool of delta.toolsAdded ?? []) current.set(tool.name, tool);
		for (const tool of delta.toolsRemoved ?? []) current.delete(tool.name);
		result.push({ ...rest, tools: [...current.values()] } as unknown as T);
	}
	return sawDelta ? result : [...messages];
}
