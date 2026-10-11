#!/usr/bin/env node
// Commitment 3 guard (e.subimpact.net/promise/): no tool search, no deferred or hidden
// tools, no mid-conversation tool changes. Fails when any forbidden identifier appears
// in shipped source or the model generator. Tests may name these identifiers (they
// assert absence); source may not, except the two allow-listed files below.
//
// Run: node scripts/check-promise.mjs
// Wired into `npm run check` as `check:promise`.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

const FORBIDDEN = [
	"toolsAdded",
	"toolsRemoved",
	"supportsMidConvoToolChanges",
	"supportsMidConvoToolAdditions",
	"supportsAdditionalTools",
	"supportsToolSearch",
	"toolSearchResult",
	"defer_loading",
	"anchorsAdditions",
	"resolveTranscriptTools",
	"hasNonAdditiveToolChanges",
	"hasToolRedefinitions",
	"getDeclaredTools",
	"getToolStateChanges",
	"ToolStateChanges",
	"declareToolChanges",
	"withToolChanges",
	"tool_addition",
	"tool_removal",
	"mid-conversation-tool-changes",
	"prepareLoadout",
	"ToolLoadout",
	"ToolExposure",
	"_getToolExposure",
	"model-only",
	"_pendingToolNames",
	"_hiddenDeclarations",
	"_restoreToolsFromTranscript",
	"_applyToolLoadout",
];

// Files allowed to name forbidden identifiers, and why.
const ALLOW = new Map([
	// Reads tool deltas from session files written by e 0.99.12 and earlier, converting
	// them to snapshots. It must name the legacy fields to read them.
	["packages/ai/src/utils/legacy-tool-deltas.ts", ["toolsAdded", "toolsRemoved"]],
	// Scans third-party extensions for unsupported surfaces so e can warn the user.
	[
		"packages/coding-agent/src/core/extensions/compat-check.ts",
		["prepareLoadout", "model-only", "defer_loading", "tool_addition", "tool_removal", "toolsAdded", "toolsRemoved"],
	],
]);

const SCAN_DIRS = ["packages"];
const SOURCE_EXT = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;

function isScanned(rel) {
	const parts = rel.split(sep);
	if (parts.includes("node_modules") || parts.includes("dist") || parts.includes("test")) return false;
	if (rel.includes(`${sep}providers${sep}data${sep}`)) return false; // generated, checked separately below
	// packages/<pkg>/src/** and packages/<pkg>/scripts/**
	return parts[0] === "packages" && (parts[2] === "src" || parts[2] === "scripts");
}

function walk(dir, out) {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) {
			if (name === "node_modules" || name === "dist" || name === ".git") continue;
			walk(full, out);
		} else if (SOURCE_EXT.test(name) && !/\.test\.|\.spec\./.test(name)) {
			out.push(full);
		}
	}
}

const files = [];
for (const d of SCAN_DIRS) walk(join(root, d), files);

const violations = [];
for (const file of files) {
	const rel = relative(root, file);
	if (!isScanned(rel)) continue;
	const allowed = ALLOW.get(rel.split(sep).join("/")) ?? [];
	const lines = readFileSync(file, "utf8").split("\n");
	lines.forEach((line, i) => {
		for (const id of FORBIDDEN) {
			if (allowed.includes(id)) continue;
			if (line.includes(id)) violations.push(`${rel}:${i + 1}: ${id}`);
		}
	});
}

// Generated model data must not carry the removed compat flags either.
const dataDir = join(root, "packages/ai/src/providers/data");
try {
	for (const name of readdirSync(dataDir)) {
		if (!name.endsWith(".json")) continue;
		const text = readFileSync(join(dataDir, name), "utf8");
		for (const id of [
			"supportsMidConvoToolChanges",
			"supportsMidConvoToolAdditions",
			"supportsAdditionalTools",
			"supportsToolSearch",
		]) {
			if (text.includes(id)) violations.push(`packages/ai/src/providers/data/${name}: ${id}`);
		}
	}
} catch {
	// Data is generated and gitignored; absent in a fresh clone before build.
}

if (violations.length > 0) {
	console.error(`check:promise FAILED: ${violations.length} forbidden reference(s) (commitment 3, no tool search):`);
	for (const v of violations.slice(0, 200)) console.error(`  ${v}`);
	if (violations.length > 200) console.error(`  ... and ${violations.length - 200} more`);
	process.exit(1);
}
console.log(`check:promise OK: ${files.length} files scanned, 0 forbidden references`);
