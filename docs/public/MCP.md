# MCP — Agent Access (Beta Foundation)

Combie exposes a **local stdio MCP server** that gives external AI agents read-only access to your synchronized Combie engineering context.

## Status

**MCP foundation: available.** This is a read-only, local-only, stdio-only beta interface. It requires a prior `combie sync` to populate local Combie state. Agents cannot connect providers, sync, or mutate data through MCP.

## Quickstart

1. Initialize Combie and connect at least one provider:

   ```bash
   bun run combie init
   bun run combie connect github --use-gh
   bun run combie sync
   ```

2. Start the MCP server:

   ```bash
   bun run combie mcp
   ```

3. Configure your MCP-compatible agent (Cursor, Codex, Claude Code, etc.) to launch `bun run combie mcp` as a local stdio server.

## State Directory

The MCP server reads from the same Combie state as the CLI:

- Default: `./.combie`
- Override: `COMBIE_HOME` environment variable
- Or: `--dir <path>` CLI flag

When configuring an external MCP client that may launch from a different working directory, set `COMBIE_HOME` to point at your Combie state directory.

## Tools

| Tool | Input | Description |
|------|-------|-------------|
| `list_resources` | optional `provider`, `kind` filters | List locally stored Combie Resources with their exact stable IDs |
| `get_related_context` | exact `resourceId` | Return one-hop Relationships and neighbor Resources |
| `investigate_resource` | exact `resourceId` | Return full deterministic investigation context (changes, relationships, provider evidence, authority) |
| `list_providers` | none | List locally connected providers (status and account identity only; no credentials) |

All tools are:

- **Read-only** — no state mutation
- **Offline** — no provider network calls
- **Deterministic** — based on persisted local Combie state
- **Exact-ID** — no fuzzy name matching

## Not Exposed

MCP tools do NOT expose:

- `init`, `connect`, `sync`, `disconnect`
- Credential writes or credential data
- Infrastructure execution (deploy, rollback, restart)
- Provider network calls

## Prior Sync Required

MCP tools read from local Combie state. Run `combie sync` outside MCP to populate data before an agent uses MCP tools.

## Transport

**stdio only.** No HTTP, SSE, Streamable HTTP, or remote hosting in this release. Agents connect to a local process.

## Limitations

- Client-specific configuration guides (Cursor, Codex, Claude Code) are not yet included; they will be validated in a follow-up release.
- Structured content is available alongside human-readable summaries; full structured schemas will be refined with client feedback.
- Provider credentials must be configured through the CLI before MCP use.
