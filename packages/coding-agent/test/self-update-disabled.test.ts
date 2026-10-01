import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_NAME, PACKAGE_NAME } from "../src/config.ts";
import { handlePackageCommand } from "../src/package-manager-cli.ts";
import { allowNetwork } from "./test-network-env.ts";

beforeEach(() => {
	allowNetwork();
});

// e fork: self-update targets upstream's release channel (which serves the upstream package), so
// it is disabled via piConfig.selfUpdate = false and the command explains how to update manually.
describe("e disabled self-update", () => {
	it("prints guidance and fails when self-update is the requested target", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		try {
			expect(await handlePackageCommand(["update", "--self"])).toBe(true);
			expect(fetchMock).not.toHaveBeenCalled();
			const stderr = errorSpy.mock.calls.map(([message]) => String(message)).join("\n");
			expect(stderr).toContain(`${APP_NAME} self-update is disabled in this distribution.`);
			expect(stderr).toContain(`npm i -g ${PACKAGE_NAME}`);
			expect(process.exitCode).toBe(1);
		} finally {
			process.exitCode = undefined;
			logSpy.mockRestore();
			errorSpy.mockRestore();
			vi.unstubAllGlobals();
		}
	});
});
