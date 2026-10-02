<p align="center">
  <img alt="e" src="packages/coding-agent/docs/images/exy.png" width="128">
</p>

# e (Euler's number), a minimal terminal coding harness

A minimal terminal coding harness. **e** is a fork of
[earendil-works/pi](https://github.com/earendil-works/pi) (MIT); it is **not
affiliated with the upstream project**.

e keeps the original pi promise, as code: one model, one loop, four tools
(read, write, edit, bash). **MCP, codemode, tool-search, and sub-agents are
removed, not disabled.** There is no setting that brings them back, and no
update ever will. The features on the box are the ones you get: all of them,
and nothing else.

```bash
npm i -g @subimpact/e
```

## The pi 0.99.0 story, briefly

pi earned its reputation on a list of refusals: no MCP, no sub-agents, no plan
mode. Version 0.99.0 (2026-09-29) shipped the refusals anyway, as built-in
extensions. e is the fork that keeps the founding promise: the addon systems are
carved out of the codebase entirely. Arguing on an issue tracker is one way to
dissent; forking is the other.

## Why e exists: the receipts

- **The original promise, in the creator's own words**: the pi blog post
  ["What I learned building an opinionated and minimal coding agent"](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)
  states that pi *"does not and will not support MCP"* and ships without
  sub-agents, plan mode, or permission popups. That post is the founding
  document e holds itself to.
- **The moment the promise broke**: pi
  [0.99.0](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/CHANGELOG.md)
  shipped MCP, codemode, and tool-search as built-in extensions on 2026-09-29.
  On top of that, the upstream tree now carries sub-agent plumbing
  (`src/experimental/durable/subagent.ts`, a `/agents` command, and a
  sub-agent example extension). The community reaction (r/PiCodingAgent: "Pi
  is becoming bloated", "Removed mcp extensions and cannot be happier") is the
  same argument from many directions: the refusals were the product.
- **e's answer**: [the e promise](https://e.subimpact.net/promise/) (nine
  binding commitments, checkable in source),
  [the story](https://e.subimpact.net/story/) (why the fork is the argument),
  and [pi vs e](https://e.subimpact.net/pi-vs-e/) (the one-table comparison).
- **No attribution, no ping (0.99.6)**: a codebase audit against the founding
  post's full list found one quiet phone-home left: with upstream's default
  `enableInstallTelemetry: true`, requests to OpenRouter, NVIDIA, and
  Cloudflare carried pi branding (`pi.dev` referer, "Pi" billing origin). e
  defaults it to `false`: nothing about e's users leaves by default, not even
  attribution upstream's way.

## What compatibility means

e keeps compatibility with the **classical pi package ecosystem**: packages,
extensions, skills, prompt templates, and themes built on the original tool set
install and run unmodified.

Packages that require the 0.99 built-in MCP, codemode, or tool-search APIs do
not work in e. That is not a bug; it is the point.

Sub-agents do not exist in e either: the upstream sub-agent machinery
(`src/experimental/durable/subagent.ts` and the sub-agent example extension)
is carved out of this tree (0.99.4), and the `subagents` directory that
classical pi packages could ship remains inert unless a package registers
tools itself.

Classifier models (such as TypeSafe's Jev) remain in the provider catalogs as
inert model entries. Nothing in e loads or invokes a classifier; the only
execution path it ever had was codemode, which does not exist in e.

## e vs pi

| | e (`@subimpact/e`, binary `e`) | pi (`@earendil-works/pi-coding-agent`, binary `pi`) |
|---|---|---|
| Core tools | read, write, edit, bash | read, write, edit, bash (same) |
| `mcp`, `codemode`, `tool-search` | **Removed** | Built-in extensions |
| Sub-agents | **Removed** (carved out) | Experimental tree (`durable/subagent.ts`), example extension |
| Classical pi packages | Work unmodified | Work |
| Packages needing 0.99 built-in APIs | Do not (by design) | Do |
| `llama.cpp` provider | Included | Included |
| User config dir | `~/.e/agent` (override: `E_CODING_AGENT_DIR`) | `~/.pi/agent` |
| Project config dir | `.pi/` (same as pi, stays shared) | `.pi/` |
| Startup update check | Disabled (no pi.dev calls) | On |
| Upstream fixes | Cherry-picked weekly; addons never flow back | Source |

## Attribution and licenses

- e is a fork of [earendil-works/pi](https://github.com/earendil-works/pi), MIT licensed.
  All credit for the agent harness, tools, TUI, provider layer, and extension system goes
  to the upstream project and its contributors.
- The npm publishing name, binary name, defaults, and docs differ; the code lineage does
  not. See [LICENSE](LICENSE) (MIT, unchanged).
- Third-party pi extensions, packages, and SDK usage built on the classical tool set
  keep working unmodified.

## Development

```bash
npm install --ignore-scripts  # Install all dependencies without running lifecycle scripts
npm run build                 # Refresh model data, then build all packages
npm run build:offline         # Rebuild using existing model data without network access
npm run check                 # Lint, format, and type check
./test.sh                     # Run tests (skips LLM-dependent tests without API keys)
./pi-test.sh                  # Run the agent from sources (can be run from any directory)
```

## Permissions & Containerization

e does not include a built-in permission system for restricting filesystem, process,
network, or credential access. By default, it runs with the permissions of the user and
process that launched it.

If you need stronger boundaries, containerize or sandbox e. See
[packages/coding-agent/docs/containerization.md](packages/coding-agent/docs/containerization.md)
for three patterns:

- **Gondolin extension**: keep the executable and provider auth on the host while routing
  built-in tools and `!` commands into a local Linux micro-VM.
- **Plain Docker**: run the whole process in a local container for simple isolation.
- **OpenShell**: run the whole process in a policy-controlled sandbox.

## License

MIT