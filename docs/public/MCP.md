# MCP — Agent Access (Beta)

Combie exposes a **local stdio MCP server** that gives external AI agents read-only access to your synchronized Combie engineering context.

## Status

**MCP beta: validated.** Read-only, local-only, stdio-only. Requires prior `combie sync`. Agents cannot connect providers, sync, or mutate data through MCP.

## Quickstart

1. Initialize Combie and connect at least one provider:

   ```bash
   bun run combie init
   bun run combie connect github --use-gh
   bun run combie connect vercel --use-env
   bun run combie sync
   ```

2. The MCP server reads from the same Combie state as the CLI. Configure your state location.

3. Start the MCP server (or let your MCP client launch it):

   ```bash
   bun run combie mcp
   ```

## State Directory

The MCP server reads from the same Combie state as the CLI:

- Default: `./.combie`
- Override: `COMBIE_HOME` environment variable
- Or: `--dir <path>` CLI flag

When configuring an external MCP client that may launch from a different working directory, set `COMBIE_HOME` to point at your Combie state directory.

## Beta MCP Contract

### Transport
- **Local stdio only** — no HTTP, SSE, Streamable HTTP, or remote hosting.

### State
- **Local persisted Combie context** — requires prior manual `combie sync`.
- MCP tools never call providers or mutate state.

### Tools (frozen for beta)

| Tool | Input | Description |
|------|-------|-------------|
| `list_resources` | `provider?`, `kind?` (optional filters) | List locally stored Combie Resources with exact stable IDs (provider:kind:providerResourceId). Use for Resource discovery. |
| `list_providers` | none | List locally connected providers with status and account identity. No credentials or tokens exposed. |
| `get_related_context` | `resourceId` (exact) | Return one-hop Relationships and neighbor Resources for an exact Resource ID. Preserves relationship kind, direction, and evidence. |
| `investigate_resource` | `resourceId` (exact) | Return complete deterministic investigation context: current state, changes, related Resources, provider evidence (deployments, workflow runs, operations), authority, and cross-provider shared commit context when available. |

### Guarantees
- **Read-only** — no state mutation
- **No provider network calls** — reads local persisted state only
- **Structured results** — `structuredContent` with JSON-safe data
- **Exact Resource IDs** — no fuzzy name matching
- **One-hop relationships** only
- **Deterministic evidence** with authority provenance
- **Offline** after prior sync — no provider credentials required for reads

### Non-guarantees
- Not real-time — requires manual `combie sync` outside MCP
- Not root cause analysis — provides context, not causality
- Not infrastructure execution — no deploy, rollback, or restart
- Not complete graph — one-hop relationships only
- Not autonomous — external agent provides reasoning

## Verified Client Configuration

### Codex

Tested with: Codex CLI v0.146.0

Configure via `~/.codex/config.toml`:

```toml
[mcp_servers.combie]
command = "bun"
args = ["run", "--cwd", "/path/to/combie", "combie", "mcp"]

[mcp_servers.combie.env]
COMBIE_HOME = "/path/to/.combie"
```

Or using the CLI:

```bash
codex mcp add combie --env "COMBIE_HOME=/path/to/.combie" -- bun run --cwd /path/to/combie combie mcp
```

**Known limitation:** Codex exec mode (non-interactive) may require explicit MCP tool approval. Interactive sessions work as expected.

### Cursor

Tested with: Cursor 3.15.6

Configure via `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "combie": {
      "command": "bun",
      "args": ["run", "--cwd", "/path/to/combie", "combie", "mcp"],
      "env": {
        "COMBIE_HOME": "/path/to/.combie"
      }
    }
  }
}
```

### Claude Code

Not yet validated — configuration mechanism varies by version. Will be validated in a follow-up release.

## Prior Sync Required

MCP tools read from local Combie state. Run `combie sync` outside MCP to populate data before an agent uses MCP tools.

## Not Exposed

MCP tools do NOT expose:
- `init`, `connect`, `sync`, `disconnect`
- Credential writes or credential data
- Infrastructure execution (deploy, rollback, restart)
- Provider network calls

## Example Agent Prompts

```
Use Combie to list the engineering Resources it knows about.

Use Combie to investigate this Resource: vercel:project:prj_...

Use Combie to explain which Resources are directly related to this one
and what evidence supports those Relationships.

Use Combie to tell me what it knows and what context is missing around
this Resource.
```

Avoid:
```
Use Combie to fix my deployment.
Use Combie to find the root cause.
Use Combie to sync my providers.
```

## Limitations

- Client-specific configuration currently verified for Codex and Cursor only.
- Tool schemas may be refined based on beta feedback.
- Provider credentials must be configured through the CLI before MCP use.
- Output size for `investigate_resource` varies with data; no pagination in beta.
