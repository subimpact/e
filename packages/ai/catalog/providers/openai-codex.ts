import type { Model } from "../../src/types.ts";
import { defineProvider, mergeThinking } from "../define.ts";
import {
	enableOpenAiGrammarTools,
	enableOpenAiMidConvoSystemMessages,
	openAiStandardCost,
	supportsOpenAiXhigh,
} from "../families/openai.ts";

// ChatGPT OAuth models. models.dev does not list them; keep a small, explicit
// list without aliases. Only list models the Codex backend accepts for ChatGPT
// accounts: GPT-5.5 and GPT-5.3 Codex Spark are rejected with "not supported
// when using Codex with a ChatGPT account".
const MODELS = [
	// GPT-6.2 is not in Codex's bundled catalog yet; use Codex's 272k default until
	// /backend-api/codex/models is checked.
	{ id: "gpt-6.2-astra", name: "GPT-6.2 Astra", contextWindow: 272000 },
	{ id: "gpt-6.2-sol", name: "GPT-6.2 Sol", contextWindow: 272000 },
	// GPT-6.1 uses the 500k default returned by /backend-api/codex/models.
	{ id: "gpt-6.1-sol", name: "GPT-6.1 Sol", contextWindow: 500000 },
	{ id: "gpt-6.1-terra", name: "GPT-6.1 Terra", contextWindow: 500000 },
	// GPT-5.6 and GPT-6 use Codex's 272k default catalog limit.
	{ id: "gpt-6-astra", name: "GPT-6 Astra", contextWindow: 272000 },
	{ id: "gpt-6-sol", name: "GPT-6 Sol", contextWindow: 272000 },
	{ id: "gpt-6-luna", name: "GPT-6 Luna", contextWindow: 272000 },
	{ id: "gpt-5.6-luna", name: "GPT-5.6 Luna", contextWindow: 272000 },
	{ id: "gpt-5.6-sol", name: "GPT-5.6 Sol", contextWindow: 272000 },
	{ id: "gpt-5.6-terra", name: "GPT-5.6 Terra", contextWindow: 272000 },
];

// Codex's GPT-6 models accept developer messages after the conversation has started.
export default defineProvider({
	id: "openai-codex",
	models: () =>
		MODELS.map(
			({ id, name, contextWindow }): Model<"openai-codex-responses"> => ({
				id,
				name,
				api: "openai-codex-responses",
				provider: "openai-codex",
				baseUrl: "https://chatgpt.com/backend-api",
				reasoning: true,
				input: ["text", "image"],
				cost: openAiStandardCost(id),
				contextWindow,
				maxTokens: 128000,
			}),
		),
	finalize: (model) => {
		if (supportsOpenAiXhigh(model.id)) mergeThinking(model, { minimal: "low" });
		enableOpenAiGrammarTools(model);
		enableOpenAiMidConvoSystemMessages(model);
	},
});
