import type { ClassifierModel } from "../../src/types.ts";
import { defineProvider } from "../define.ts";

export default defineProvider({
	id: "typesafe",
	classifiers: (ctx): ClassifierModel<"typesafe-system-one">[] => {
		const metadata = ctx.sources.modelsDevDecisions["typesafe/jev-latest"];
		if (!metadata || metadata.type !== "decision") {
			if (ctx.strict) throw new Error("models.dev did not return decision model typesafe/jev-latest");
			return [];
		}
		return [
			{
				type: "classifier",
				id: "jev-latest",
				name: metadata.name,
				api: "typesafe-system-one",
				provider: "typesafe",
				baseUrl: "https://api.typesafe.ai/v1/",
				input: metadata.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
				// The canonical models.dev entry has no direct-provider pricing. System One reports token usage,
				// so classify() results carry token counts but price them at zero.
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
				contextWindow: metadata.limit?.context || 64000,
			},
		];
	},
});
