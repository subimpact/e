# e

e is a minimal terminal coding harness, forked from
[earendil-works/pi](https://github.com/earendil-works/pi) (MIT). It is **not affiliated with
the upstream project**.

e keeps the original pi promise, as code: one model, one loop, four tools (read, write, edit,
bash). The `mcp`, `codemode`, and `tool-search` built-in extensions are **removed, not
disabled**: there is no setting that brings them back. See the root
[README](../../README.md) for the full fork story and the compatibility scope.

## Getting started

Install the command-line interface with npm:

```bash
npm install -g --ignore-scripts @subimpact/e
```

This requires Node.js 22.19 or newer. e does not require dependency lifecycle scripts for a
normal npm installation.

Start e in the directory where you want it to work:

```bash
cd /path/to/project
e
```

For a built-in AI provider, run `/login` inside e to connect a subscription or API key.
Then give e a task.

To reuse an existing pi installation's config, point `E_CODING_AGENT_DIR` (or the legacy
`PI_CODING_AGENT_DIR`) at `~/.pi/agent`.

Classical pi packages, extensions, skills, prompt templates, and themes install with
`e install <package>` exactly as before. Packages that require the 0.99 built-in MCP,
codemode, or tool-search APIs do not work in e, by design.

See the [documentation](docs/index.md) for full setup and usage instructions.

## Development

```bash
npm install --ignore-scripts  # Install all dependencies without running lifecycle scripts
npm run build         # Refresh model data, then build all packages
npm run build:offline # Rebuild using existing model data without network access
npm run check         # Lint, format, and type check
./test.sh             # Run tests (skips LLM-dependent tests without API keys)
./pi-test.sh          # Run e from sources (can be run from any directory)
```

## License

MIT. See [../../LICENSE](../../LICENSE).