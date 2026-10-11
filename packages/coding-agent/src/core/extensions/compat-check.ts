// e does not support tool search, deferred or hidden tools, or mid-conversation tool changes.
// Third-party extensions written for older e versions may still use those surfaces, so this
// scanner detects them in extension source and callers warn the user (without blocking).

import { existsSync, readdirSync, type Stats, statSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

export const EXTENSIONS_COMPAT_URL = "https://e.subimpact.net/extensions/";

const FEATURE_PATTERNS: [RegExp, string][] = [
	[/prepareLoadout/, "tool loadout hooks (prepareLoadout)"],
	[/exposure\s*:\s*["'](hidden|model-only)["']/, 'deferred or hidden tools (exposure: "hidden" / "model-only")'],
	[/defer_loading/, "mid-conversation tool changes"],
	[/tool_addition/, "mid-conversation tool changes"],
	[/tool_removal/, "mid-conversation tool changes"],
	[/toolsAdded/, "mid-conversation tool changes"],
	[/toolsRemoved/, "mid-conversation tool changes"],
];

/** Human labels of the unsupported features a piece of extension source uses. */
export function scanExtensionSource(text: string): string[] {
	const labels = new Set<string>();
	for (const [pattern, label] of FEATURE_PATTERNS) {
		if (pattern.test(text)) labels.add(label);
	}
	return [...labels];
}

/**
 * Every extension source file of an installed package: the given entry files plus all
 * .ts/.js/.mjs/.cjs files under `dir`, skipping node_modules, capped at `limit` files.
 */
export function collectExtensionSourceFiles(dir: string, entries: readonly string[], limit = 500): string[] {
	const files: string[] = [];
	const seen = new Set<string>();
	const visit = (path: string): void => {
		if (files.length >= limit || seen.has(path) || !existsSync(path)) return;
		seen.add(path);
		files.push(path);
	};
	const walk = (current: string): void => {
		let names: string[];
		try {
			names = readdirSync(current);
		} catch {
			return;
		}
		for (const name of names) {
			if (files.length >= limit) return;
			if (name === "node_modules") continue;
			const full = join(current, name);
			let st: Stats;
			try {
				st = statSync(full);
			} catch {
				continue;
			}
			if (st.isDirectory()) walk(full);
			else if (st.isFile() && /\.(ts|js|mjs|cjs)$/.test(name)) visit(full);
		}
	};
	// Entries first, so the cap can never crowd out the files e actually loads.
	for (const entry of entries) visit(entry);
	if (existsSync(dir)) walk(dir);
	return files;
}

/** Scan extension source files, merging findings from all of them. Unreadable and oversized files are skipped. */
export async function scanExtensionFiles(paths: string[]): Promise<string[]> {
	const labels = new Set<string>();
	for (const path of paths) {
		try {
			const stats = await stat(path);
			if (stats.size > 1024 * 1024) continue;
			const text = await readFile(path, "utf8");
			for (const label of scanExtensionSource(text)) labels.add(label);
		} catch {}
	}
	return [...labels];
}

/** The findings sentence, for channels that already name the extension (the loader). */
export function formatCompatFindings(findings: string[]): string {
	return (
		`uses features e does not support: ${findings.join("; ")}. ` +
		`e ignores them, so the extension may not work as intended. Why: ${EXTENSIONS_COMPAT_URL}`
	);
}

/** One short warning block naming the unsupported features an extension uses. */
export function formatCompatWarning(name: string, findings: string[]): string {
	return `Warning: extension "${name}" ${formatCompatFindings(findings)}`;
}

/**
 * Labels of the unsupported features a registered tool definition uses: an `exposure` other
 * than `"direct"` (deferred or hidden tools) or a `prepareLoadout` hook.
 */
export function scanToolDefinition(definition: unknown): string[] {
	if (typeof definition !== "object" || definition === null) return [];
	const fields = definition as { exposure?: unknown; prepareLoadout?: unknown };
	const labels = new Set<string>();
	if (fields.exposure !== undefined && fields.exposure !== "direct") {
		labels.add('deferred or hidden tools (exposure: "hidden" / "model-only")');
	}
	if ("prepareLoadout" in fields) labels.add("tool loadout hooks (prepareLoadout)");
	return [...labels];
}

/**
 * Strip the unsupported surfaces from a registered tool definition so it loads as an ordinary
 * tool: `exposure` is ignored and `prepareLoadout` is never called. Mutates and returns the
 * definition when it carries either field.
 */
export function sanitizeToolDefinition<T>(definition: T): T {
	if (typeof definition !== "object" || definition === null) return definition;
	const fields = definition as Record<string, unknown>;
	if ("exposure" in fields) delete fields.exposure;
	if ("prepareLoadout" in fields) delete fields.prepareLoadout;
	return definition;
}
