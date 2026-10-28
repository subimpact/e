import { CLOUDFLARE_WORKERS_AI_BASE_URL, CLOUDFLARE_WORKERS_AI_REST_BASE_URL } from "../../src/api/cloudflare.ts";
import type { ClassifierModel } from "../../src/types.ts";
import { defineProvider, modelsDevModels } from "../define.ts";

// Workers AI has no unauthenticated catalog and models.dev does not list its
// System One models yet. Cloudflare publishes pricing only in the dashboard.
// https://developers.cloudflare.com/ai/models/typesafe/jev/
const CLASSIFIER_MODELS: ClassifierModel<"cloudflare-workers-ai-system-one">[] = [
	{
		type: "classifier",
		id: "typesafe/jev",
		name: "Jev",
		api: "cloudflare-workers-ai-system-one",
		provider: "cloudflare-workers-ai",
		baseUrl: CLOUDFLARE_WORKERS_AI_REST_BASE_URL,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 32000,
	},
];

export default defineProvider({
	id: "cloudflare-workers-ai",
	models: (ctx) =>
		modelsDevModels(ctx, "cloudflare-workers-ai", {
			api: "openai-completions",
			baseUrl: CLOUDFLARE_WORKERS_AI_BASE_URL,
			compat: { sendSessionAffinityHeaders: true },
		}),
	classifiers: () => CLASSIFIER_MODELS,
	compat: {
		"openai-completions": {
			supportsStore: false,
			supportsDeveloperRole: false,
			supportsStrictMode: true,
			supportsLongCacheRetention: false,
		},
	},
});
