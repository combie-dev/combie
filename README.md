# Combie

**Connect your tools. Understand how they fit together. Give humans and AI shared context to work across them.**

Combie is an open-source connective layer for tools and agents.

Connect a tool once and Combie turns its resources, relationships, activity, and history into shared context that can be used by you, your scripts, and AI agents.

We're starting with engineering infrastructure — GitHub, Vercel, Cloudflare, Sentry, databases, and the systems around them — where understanding how everything fits together is still surprisingly difficult.

Combie is not another dashboard or an AI wrapper around APIs. It sits underneath them: building a shared understanding of what exists, how things relate, and what changed.

Today, Combie is local-first and focused on proving the foundation:

**connect → understand → investigate**

## Why Combie

Your tools already know a lot.

GitHub knows your source. Vercel knows your deployments. Cloudflare knows your domains and infrastructure. Sentry knows what broke. Your databases know what changed.

But none of them understand the whole system.

Combie connects those pieces and builds the relationships between them so humans and agents don't have to reconstruct that context every time they need to understand or work across your stack.

* **Connect once.** Bring tools into Combie through provider integrations.
* **Understand relationships.** Connect repositories, projects, domains, databases, deployments, and activity across providers.
* **Keep context.** Track what exists, what changed, and the evidence behind it.
* **Use it anywhere.** Query Combie from the CLI or expose the same context to agents through MCP.
* **Built for what comes next.** Context is the foundation for investigation, learning, and eventually controlled execution.

## Quick start

Install Combie on macOS or Linux:

```bash
curl -fsSL https://combie.dev/install | sh
```

Verify the installation:

```bash
combie --version
```

Initialize Combie and connect your tools:

```bash
combie init
combie connect github --use-gh
combie connect vercel --use-env
combie connect cloudflare --use-env
combie sync
```

See what Combie understands:

```bash
combie providers
combie resources
combie relationships
combie investigate <resource-id>
```

Or expose Combie's context to an MCP-compatible agent:

```bash
combie mcp
```

### Uninstall

```bash
rm ~/.local/bin/combie
```

This removes only the executable — your Combie state (`.combie` directory) and credentials are preserved. Delete them manually if desired.

### Build from source

Combie can also be built and run from the repository using Bun:

```bash
git clone https://github.com/BoringInfraCo/combie
cd combie
bun install
bun run combie init
```

For development commands, prefix with `bun run combie` instead of `combie`.

## Supported providers

Combie currently connects to:

* GitHub
* Vercel
* Cloudflare
* Sentry
* Neon
* PlanetScale

## Supported platforms

| Platform | Architecture | Status |
|----------|-------------|--------|
| macOS | arm64 (Apple Silicon) | Supported |
| macOS | x64 (Intel) | Supported |
| Linux | x64 (x86_64) | Supported |
| Linux | arm64 | Not yet supported |
| Windows | x64 / arm64 | Not yet supported |

Combie installs to `~/.local/bin/combie`. If that directory is not on your PATH, the installer will show you the command to add it.

## What Combie understands today

Combie can currently:

* discover and normalize resources across connected providers
* build evidence-backed relationships between resources
* track resource changes and history
* retain provider-native activity such as deployments and workflow runs
* compose investigation context around a resource
* expose synchronized context to agents through MCP

The current release is intentionally read-only through MCP. Combie does not perform autonomous actions or modify connected infrastructure.

## Development

```bash
bun install
bun test
bun run typecheck
```

## Status

Combie is early and under active development.

We're starting with engineering tools to prove the core model: connect systems once, understand how they fit together, and make that context available wherever it is needed.

## License

Apache-2.0
