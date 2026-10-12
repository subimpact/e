import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

interface CodingAgentPackageJson {
	bin: { e: string };
	dependencies: Record<string, string>;
	main: string;
	exports: {
		".": { import: string; types?: string };
		"./client": { source: string };
		"./experimental/plugin": { source: string };
		"./rpc-entry": { import: string };
	};
}

const packageJson = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as CodingAgentPackageJson;

describe("package distribution entrypoints", () => {
	// e publishes one self-contained bundle for the CLI and the library, so no unbundled
	// file that resolves workspace packages from npm is ever an entry point.
	test("uses the self-contained bundle for executables and libraries", () => {
		expect(packageJson.bin.e).toBe("dist/bundle/cli.js");
		expect(packageJson.main).toBe("./dist/bundle/index.js");
		expect(packageJson.exports["."].import).toBe("./dist/bundle/index.js");
		expect(packageJson.exports["."].types).toBeUndefined();
		expect(packageJson.exports["./rpc-entry"].import).toBe("./dist/bundle/rpc-entry.js");
	});

	test("installs nothing from the upstream @earendil-works scope", () => {
		expect(Object.keys(packageJson.dependencies).sort()).toEqual(["@silvia-odwyer/photon-node", "jiti"]);
	});

	// Regression for #9132: internal experimental entrypoints must not be published runtime exports.
	test("keeps experimental exports source-only", () => {
		expect(packageJson.exports["./client"]).toEqual({ source: "./src/client/index.ts" });
		expect(packageJson.exports["./experimental/plugin"]).toEqual({ source: "./src/experimental/plugin.ts" });
	});
});
