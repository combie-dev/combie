# MCP — Local Agent Access (Closed Beta)

Combie exposes synchronized engineering context to local MCP clients through a
read-only stdio server. It is not a remote service and it cannot connect or
sync providers.

## Status

The protocol contract is validated end to end with the MCP TypeScript client:
tool discovery, calls, structured results, offline operation, and unchanged
database bytes after reads. Client configuration has been checked for Codex
0.146.0 and Cursor 3.15.6. A natural-language agent call remains a release
condition until it is repeated successfully on the final release commit.

## Before configuring an agent

Populate Combie through the CLI first:

```bash
bun run combie init
bun run combie connect github --use-gh
bun run combie sync
```

One provider is enough. Provider credentials are needed for `connect` and
`sync`, but not for MCP reads after state has been synchronized.

## Frozen beta contract

- Transport: local stdio only; no HTTP, SSE, or hosted endpoint.
- State: the same local SQLite state used by the CLI.
- Network: tools never call providers.
- Mutation: tools are annotated read-only, non-destructive, idempotent, and
  closed-world; protocol tests verify that calls leave the database unchanged.
- Lookup: exact stable Resource IDs; no fuzzy names.
- Scope: deterministic current state and one-hop relationships only.

| Tool | Input | Structured result |
| --- | --- | --- |
| `list_resources` | optional `provider`, `kind` | Resource identities and stable IDs |
| `list_providers` | none | provider status and persisted account identity |
| `get_related_context` | exact `resourceId` | one-hop edges, direction, neighbors, evidence |
| `investigate_resource` | exact `resourceId` | subject, changes, native evidence, related context, known facts, missing context, provider activity, timeline, and exact shared-commit groups |

There are no MCP tools for `init`, `connect`, `sync`, credential access,
provider calls, deploys, restarts, rollbacks, or any other write.

## State location

The default is `./.combie`. Agent processes often start elsewhere, so either
set `COMBIE_HOME` to the absolute state-directory path or pass `--dir` to the
server command. The examples below use `COMBIE_HOME`.

## Codex

Codex supports local stdio servers with a command, arguments, environment, and
working directory. Add Combie with:

```bash
codex mcp add combie \
  --env COMBIE_HOME=/absolute/path/to/.combie \
  -- bun run --cwd /absolute/path/to/combie combie mcp
```

Equivalent `~/.codex/config.toml`:

```toml
[mcp_servers.combie]
command = "bun"
args = ["run", "combie", "mcp"]
cwd = "/absolute/path/to/combie"

[mcp_servers.combie.env]
COMBIE_HOME = "/absolute/path/to/.combie"
```

Confirm with `codex mcp list`, then ask: “Use Combie to list the engineering
Resources it knows about.” Codex documentation:
<https://learn.chatgpt.com/docs/extend/mcp?surface=cli>.

## Cursor

Add this to `~/.cursor/mcp.json` and restart or refresh MCP servers:

```json
{
  "mcpServers": {
    "combie": {
      "command": "bun",
      "args": ["run", "--cwd", "/absolute/path/to/combie", "combie", "mcp"],
      "env": {
        "COMBIE_HOME": "/absolute/path/to/.combie"
      }
    }
  }
}
```

Configuration and tool discovery were checked on Cursor 3.15.6; a recorded
natural-language call is still required on the final release commit.

## Claude Code

Current Claude Code documentation uses this local stdio form:

```bash
claude mcp add --transport stdio \
  --env COMBIE_HOME=/absolute/path/to/.combie \
  combie -- bun run --cwd /absolute/path/to/combie combie mcp
```

Claude Code could not be validated on the release machine because the local
`claude` executable is broken/non-executable. This is a recorded deferral, not
a claim of compatibility. Documentation: <https://code.claude.com/docs/en/mcp>.

## Useful prompts

```text
Use Combie to list the engineering Resources it knows about.

Use Combie to investigate github:repository:123 and separate known facts from
missing context.

Use Combie to show the direct Relationships around this Resource and the
provider evidence for each one.
```

Do not ask Combie MCP to sync, mutate infrastructure, find a root cause, or fix
a deployment. It supplies bounded evidence; the external agent interprets it.

## Limitations

- State is only as fresh as the last manual CLI sync.
- Investigation output is unpaginated and can be large.
- Relationships are one hop and limited to the two deterministic kinds in the
  README.
- No root-cause analysis, recommendations, or autonomous action.
- Natural-agent validation on the final release build is still a release gate;
  protocol-level success alone does not satisfy it.
