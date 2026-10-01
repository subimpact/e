import { DEFAULT_RADIUS_GATEWAY, normalizeRadiusGatewayUrl } from "@earendil-works/pi-ai/providers/radius-config";
import { readAppEnv } from "../config.ts";

export const RADIUS_PROVIDER_ID = "radius";
export const ENV_RADIUS_GATEWAY = "PI_RADIUS_GATEWAY";

/** Radius gateway origin, honoring the `PI_RADIUS_GATEWAY` override. */
export function getRadiusGatewayUrl(): string {
	return normalizeRadiusGatewayUrl(readAppEnv("RADIUS_GATEWAY") ?? DEFAULT_RADIUS_GATEWAY);
}
