import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	EXTENSIONS_COMPAT_URL,
	formatCompatWarning,
	scanExtensionSource,
} from "../src/core/extensions/compat-check.ts";
import { loadExtensions } from "../src/core/extensions/loader.ts";

const toolWithRemovedFeatures = `
	import { Type } from "typebox";
	globalThis.__eCompatHookCalls = 0;
	export default function(pi) {
		pi.registerTool({
			name: "ghost",
			label: "Ghost",
			description: "Ghost tool",
			parameters: Type.Object({}),
			exposure: "hidden",
			prepareLoadout: (tools) => {
				globalThis.__eCompatHookCalls++;
				return tools;
			},
			execute: async () => ({ content: [{ type: "text", text: "ok" }] }),
		});
	}
`;

const cleanExtension = `
	export default function(pi) {
		pi.registerCommand("clean", { handler: async () => {} });
	}
`;

describe("extension compatibility check", () => {
	it("detects every unsupported pattern, alone and combined", () => {
		expect(scanExtensionSource("pi.prepareLoadout?.(tools)")).toEqual(["tool loadout hooks (prepareLoadout)"]);
		expect(scanExtensionSource('exposure: "hidden"')).toEqual([
			'deferred or hidden tools (exposure: "hidden" / "model-only")',
		]);
		expect(scanExtensionSource("exposure: 'model-only'")).toEqual([
			'deferred or hidden tools (exposure: "hidden" / "model-only")',
		]);
		expect(scanExtensionSource("tool.additions ?? item.tool_addition")).toEqual(["mid-conversation tool changes"]);
		expect(scanExtensionSource("item.tool_removal?.map")).toEqual(["mid-conversation tool changes"]);
		expect(scanExtensionSource('session: "toolsAdded"')).toEqual(["mid-conversation tool changes"]);
		expect(scanExtensionSource("message.toolsRemoved ?? []")).toEqual(["mid-conversation tool changes"]);
		// Everything at once: labels are deduplicated.
		expect(
			scanExtensionSource(
				`def.toolsAdded = x; def.toolsRemoved = y; exposure: "hidden", defer_loading: true, def.prepareLoadout = () => {};`,
			),
		).toEqual([
			"tool loadout hooks (prepareLoadout)",
			'deferred or hidden tools (exposure: "hidden" / "model-only")',
			"mid-conversation tool changes",
		]);
	});

	it("accepts a clean extension and normal exposure", () => {
		expect(scanExtensionSource(cleanExtension)).toEqual([]);
		expect(scanExtensionSource('def.exposure = "direct"; def.name = "regular"')).toEqual([]);
	});

	it("formats one short warning block with the URL and never with dashes", () => {
		const warning = formatCompatWarning("legacy-ext", [
			"tool loadout hooks (prepareLoadout)",
			"mid-conversation tool changes",
		]);
		expect(warning).toContain('extension "legacy-ext"');
		expect(warning).toContain(EXTENSIONS_COMPAT_URL);
		// No em dash or en dash anywhere in the warning text.
		expect(warning.includes("\u2014")).toBe(false);
		expect(warning.includes("\u2013")).toBe(false);
	});

	it("loads a legacy tool as an ordinary tool and warns instead of failing", async () => {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-compat-ext-"));
		const extensionPath = path.join(tempDir, "legacy-tool.ts");
		fs.writeFileSync(extensionPath, toolWithRemovedFeatures);

		const result = await loadExtensions([extensionPath], tempDir);

		expect(result.errors).toEqual([]);
		expect(result.extensions).toHaveLength(1);
		const extension = result.extensions[0]!;
		// The tool is registered as an ordinary tool.
		const registered = extension.tools.get("ghost");
		expect(registered).toBeDefined();
		const definition = registered?.definition as unknown as Record<string, unknown>;
		expect(definition.exposure).toBeUndefined();
		expect(definition.prepareLoadout).toBeUndefined();
		// The hook was never called and the exposure is ignored.
		expect((globalThis as { __eCompatHookCalls?: number }).__eCompatHookCalls).toBe(0);
		// The warning is reported with the URL.
		const warning = (result.warnings ?? []).find((entry) => entry.path === extensionPath);
		// The loader channel already names the extension (warning.path), so the text must not repeat it.
		expect(warning?.path).toBe(extensionPath);
		expect(warning?.warning).not.toContain("Warning:");
		expect(warning?.warning).toContain(EXTENSIONS_COMPAT_URL);
		expect(warning?.warning).toContain("deferred or hidden tools");
		expect(warning?.warning).toContain("tool loadout hooks");
	});
});

afterEach(() => {
	delete (globalThis as { __eCompatHookCalls?: number }).__eCompatHookCalls;
});
