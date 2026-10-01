import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shouldRunFirstTimeSetup } from "../src/cli/startup-ui.ts";
import { ENV_AGENT_DIR } from "../src/config.ts";

// e fork: the package identity is not the official upstream pi distribution, so the first-time
// setup wizard never runs — even with experimental features and the default agent dir.
describe("shouldRunFirstTimeSetup (e fork)", () => {
	const originalPiExperimental = process.env.PI_EXPERIMENTAL;
	const originalAgentDir = process.env[ENV_AGENT_DIR];
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "e-first-time-setup-"));
		process.env.PI_EXPERIMENTAL = "1";
		delete process.env[ENV_AGENT_DIR];
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
		if (originalPiExperimental === undefined) {
			delete process.env.PI_EXPERIMENTAL;
		} else {
			process.env.PI_EXPERIMENTAL = originalPiExperimental;
		}
		if (originalAgentDir === undefined) {
			delete process.env[ENV_AGENT_DIR];
		} else {
			process.env[ENV_AGENT_DIR] = originalAgentDir;
		}
	});

	it("does not run for an unofficial distribution with no settings.json", () => {
		expect(shouldRunFirstTimeSetup(join(tempDir, "settings.json"))).toBe(false);
	});

	it("does not run even when settings.json already exists", () => {
		expect(shouldRunFirstTimeSetup(tempDir)).toBe(false);
	});
});
