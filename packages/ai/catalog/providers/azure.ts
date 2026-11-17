import { type ChatModel, defineProvider } from "../define.ts";
import { enableOpenAiGrammarTools } from "../families/openai.ts";

// Azure Foundry deploys these with larger context windows than OpenAI's own short-tier defaults.
// See models-sold-directly-by-azure docs.
const CONTEXT_WINDOW_OVERRIDES: Record<string, number> = {
	"gpt-5.4": 1050000,
	"gpt-5.5": 1050000,
	"gpt-5.6-luna": 1050000,
	"gpt-5.6-sol": 1050000,
	"gpt-5.6-terra": 1050000,
	"gpt-6-astra": 1050000,
	"gpt-6-luna": 1050000,
	"gpt-6-sol": 1050000,
	"gpt-6.1-sol": 1050000,
	"gpt-6.1-terra": 1050000,
	"gpt-6.2-astra": 1050000,
	"gpt-6.2-sol": 1050000,
};

/** OpenAI models as Azure deploys them, including OpenAI's long-context price tier above 272K input tokens. */
function openAiModels(models: ChatModel[]): ChatModel[] {
	return models
		.filter((model) => model.api === "openai-responses")
		.map((model) => ({
			...model,
			api: "azure-openai-responses",
			provider: "azure-openai-responses",
			baseUrl: "",
			contextWindow: CONTEXT_WINDOW_OVERRIDES[model.id] ?? model.contextWindow,
		}));
}

export default defineProvider({
	id: "azure-openai-responses",
	models: (ctx) => openAiModels(ctx.providerModels("openai")),
	finalize: (model) => {
		enableOpenAiGrammarTools(model);
	},
});
