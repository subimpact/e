import { readAppEnv } from "../config.ts";

// e fork: opt in with E_EXPERIMENTAL=1 (legacy PI_EXPERIMENTAL).
export function areExperimentalFeaturesEnabled(): boolean {
	return readAppEnv("EXPERIMENTAL") === "1";
}
