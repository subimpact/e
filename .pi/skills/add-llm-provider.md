---
name: add-llm-provider
description: Checklist for adding a new LLM provider to packages/ai. Covers core types, provider implementation, lazy registration, model generation, the full test matrix, coding-agent wiring, and docs.
---

# Adding a New LLM Provider (packages/ai)

A new provider touches multiple files. Work through these steps in order.

## 1. Core Types (`packages/ai/src/types.ts`)

- Add API identifier to `Api` type union (e.g. `"bedrock-converse-stream"`).
- Create options interface extending `StreamOptions`.
- Add mapping to `ApiOptionsMap`.
- Add provider name to `KnownProvider` type union.

## 2. Provider Implementation (`packages/ai/src/providers/`)

Create a provider file exporting:

- `stream<Provider>()` returning `AssistantMessageEventStream`.
- `streamSimple<Provider>()` for `SimpleStreamOptions` mapping.
- Provider-specific options interface.
- Message/tool conversion functions.
- Response parsing that emits standardized events (`text`, `tool_call`, `thinking`, `usage`, `stop`).

## 3. Model Catalog (`packages/ai/catalog/providers/<id>.ts`)

- Add a provider definition with `defineProvider()` and register it in `catalog/providers/index.ts`. Read `packages/ai/catalog/README.md` first.
- For a models.dev provider, use `modelsDevModels()`; set compat defaults per API in `compat` and provider-specific behavior in `finalize`.
- Regenerate with `npm run generate-models` in `packages/ai`. This writes the stable catalog wrapper `src/providers/<id>.models.ts` (exporting `<ID>_MODELS`) that the provider factory imports, and updates `src/models.generated.ts`.

## 4. Provider Factory and Auth (`packages/ai/src/providers/`)

- Create `src/providers/<id>.ts` exporting `<id>Provider()`, which calls `createProvider({ id, name, baseUrl, auth, models, api })`. `name` is the display name shown by `/login` and related UI. See `deepseek.ts` for a minimal example.
- Auth: `envApiKeyAuth()` for standard API keys, a custom `ApiKeyAuth` for ambient credentials (AWS profiles, ADC), `lazyOAuth()` where an OAuth flow exists.
- Pass the lazy API wrapper (e.g. `openAICompletionsApi()`) as `api`; do not statically import API implementation modules.
- Register the factory in `src/providers/all.ts`.
- Add the env var to `src/env-api-keys.ts` so the compat `getEnvApiKey()` finds it.

## 5. Tests (`packages/ai/test/`)

- Always add the provider to `stream.test.ts` with at least one representative model, even if it reuses an existing API impl such as `openai-completions`.
- Add the provider to the broader matrix where applicable: `tokens.test.ts`, `abort.test.ts`, `empty.test.ts`, `context-overflow.test.ts`, `unicode-surrogate.test.ts`, `tool-call-without-result.test.ts`, `image-tool-result.test.ts`, `total-tokens.test.ts`, `cross-provider-handoff.test.ts`.
- For `cross-provider-handoff.test.ts`, add at least one provider/model pair. If the provider exposes multiple model families (e.g. GPT and Claude), add at least one pair per family.
- For non-standard auth, create a utility (e.g. `bedrock-utils.ts`) with credential detection.

## 6. Coding Agent (`packages/coding-agent/`)

- `src/core/model-resolver.ts`: add default model ID to `defaultModelPerProvider`.
- `src/core/provider-display-names.ts`: add API-key login display name so `/login` and related UI show the provider for built-in API-key auth.
- `src/cli/args.ts`: add env var documentation.
- `README.md`: add provider setup instructions.
- `docs/providers.md`: add setup instructions, env var, and `auth.json` key.

## 7. Documentation

- `packages/ai/README.md`: add to providers table, document options/auth, add env vars.
- `packages/ai/CHANGELOG.md`: add entry under `## [Unreleased]`.
