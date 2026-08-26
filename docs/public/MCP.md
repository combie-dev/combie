# MCP — Local Agent Access (Closed Beta)

Combie exposes synchronized engineering context to local MCP clients through a
read-only stdio server. It is not a remote service and it cannot connect or
sync providers.

## Status

The protocol contract is validated end to end with the MCP TypeScript client:
tool discovery, calls, structured results, offline operation, and unchanged
database bytes after reads. Codex 0.146.0 successfully invoked both Resource
listing and investigation through MCP against release commit `da03893` under
its `writes` approval mode. Cursor 3.15.6 configuration/tool discovery was
checked separately; no natural-language Cursor call is claimed.

## Before configuring an agent

Populate Combie through the CLI first:

```bash
combie init
combie connect github --use-gh
combie sync
```

One provider is enough. Provider credentials are needed for `connect` and
`sync`, but not for MCP reads after state has been synchronized.

## Automatic setup (preferred)

`combie agent setup` detects Claude Code, Codex, and Cursor, and configures the
Combie MCP server for each detected agent:

```bash
combie agent status          # what will be configured
combie agent setup           # configure everything (confirms on a TTY)
combie agent setup claude codex
combie agent setup --yes     # skip the confirmation prompt
combie agent remove claude   # remove only the Combie MCP entry
```

It works without any agent installed (the entry is written for when the agent
is installed later), never touches unrelated configuration, keeps an existing
correct entry as-is, updates a stale entry in place, and refuses to edit a
configuration it cannot safely read. When no `--dir` is passed, `agent setup`
and `agent status` resolve one deterministic home in this order: explicit
`--dir` (same value embedded via `COMBIE_HOME`), else `COMBIE_HOME` when set,
else an initialized store at `./.combie` in the current working directory
(when `combie.db` is present), else `$HOME/.combie` (with a one-line disclosure
on setup when that fallback is used). All other CLI commands keep the documented
`./.combie` default. To name a non-default store explicitly, pass `--dir`.

### Optional: install the composition skill

Agents that want the shipped six-step investigation loop (compact
investigation → freshness / Missing Context → scoped `combie sync [provider]`
refresh → local `--json` filtering → deeper evidence on demand → cite exact
evidence) can install it as a skill:

```bash
npx skills add combie-dev/combie --skill combie -a cursor -a claude-code -a codex
```

Installation is optional; Combie MCP and the CLI work without it. If you are
working inside the repository, you can instead follow `skills/combie/SKILL.md`
directly.

The manual instructions below remain available as a fallback.

## Frozen beta contract

- Transport: local stdio only; no HTTP, SSE, or hosted endpoint.
- State: the same local SQLite state used by the CLI.
- Network: tools never call providers.
- Mutation: tools are annotated read-only, non-destructive, idempotent, and
  closed-world; protocol tests verify that calls leave the database unchanged.
- Lookup: exact stable Resource IDs; no fuzzy names.
- Scope: deterministic current state and one-hop relationships; additive
  two-hop paths are stored-edge sequences (not Relationships).

| Tool | Input | Structured result |
| --- | --- | --- |
| `list_resources` | optional `provider`, `kind` | Resource identities and stable IDs (identity only; not lastSuccessfulDiscovery) |
| `list_providers` | none | provider status and persisted account identity |
| `get_related_context` | exact `resourceId` | one-hop edges, direction, neighbors, evidence; related entries observe lastVerifiedAt and lastRequiredProviderAttemptAt (omit when null) and are not silent current topology; when related is empty, structured result includes missingContext with kind no_known_relationships (related stays []); when edges exist, omit missingContext; when a two-hop path of stored Relationships exists, additive `paths` (exactly two hops, clocks per hop, via/far ids — not a Relationship, not hop-2 evidence); omit `paths` when none |
| `investigate_resource` | exact `resourceId` (optional when `investigationId` is named); optional `investigationId` | subject observes lastSuccessfulDiscovery; GitHub repositories also observe `subjectGitHubIssues` (not Sentry `subjectIssues`); when two stored Relationship hops exist, additive `paths` (not a Relationship, not hop-2 evidence, omitted when none);  (`included` / `not_in_last_successful_discovery`, omit when never recorded; not deletion, not current provider inventory), changes, native evidence, related context (related rows observe lastVerifiedAt and lastRequiredProviderAttemptAt, omit when null, not silent current topology), known facts, missing context, provider activity, timeline, exact shared-commit groups, retained resolution memory for that exact subject (organizational response, not current provider truth, not a recommendation; omitted when none), retained incident grouping for that exact subject (organizational grouping, not current provider truth, not a recommendation; omitted when none), retained investigation history for that exact subject (retained composition summaries: exact `inv:` id and `composedAt`; not current provider truth, not an incident, not a recommendation; omitted when none), and when `investigationId` is passed: the snapshot identity for that id as `investigationSnapshot` (`id`, `subjectResourceId`, `composedAt`, and a bounded `subjectPreview` from the retained snapshot's subject — not the 048 body; retrieve the complete snapshot with `combie investigation <id>`), an ephemeral snapshot-versus-current `investigationCompare` (049 shape; not current provider truth, not an incident, not a recommendation), and retained resolution memory recorded against that Investigation as `investigationResolutionMemory` (organizational response, not current provider truth, not an incident, not a recommendation, not a replacement of subject-scoped `resolutionMemory`; omitted when none), and retained incident grouping whose members include a Resolution recorded against that Investigation as `investigationIncidentMemory` (organizational grouping, not current provider truth, not an incident, not a recommendation, not a replacement of subject-scoped `incidentMemory`; omitted when none); when `investigationId` is named without `resourceId`, the subject is taken from that investigation's retained 048 row (`subjectResourceId`); when `investigationId` names a snapshot of that subject and the subject Resource is missing from the local store, the live compose keys are omitted and the retained snapshot identity and bounded subject preview, the snapshot-versus-current comparison with `currentStatus: subject_missing` (049 shape, not a failure), retained investigation history for that subject, `investigationResolutionMemory`, and `investigationIncidentMemory` are still returned (retained composition, not current provider truth, not an incident, not a recommendation); snapshot, compare, investigation-scoped resolution memory, investigation-scoped incident memory, and the missing-Resource named-id observe are omitted when `investigationId` is not passed, omitted `investigationId` with a missing Resource still returns `RESOURCE_NOT_FOUND`, and omitted `investigationId` with no `resourceId` is usage |
| `list_investigations` | optional `resourceId` | retained snapshot summaries only (`id`, `subjectResourceId`, `composedAt`); optional exact-subject filter; known-empty is not an error (including unknown/missing subject); no snapshot body |

There are no MCP tools for `init`, `connect`, `sync`, credential access,
provider calls, deploys, restarts, rollbacks, or any other write. Named-id
snapshot retrieve stays `investigate_resource` with `investigationId`; there
is no sixth tool.

## State location

The default is `./.combie`. Agent processes often start elsewhere, so either
set `COMBIE_HOME` to the absolute state-directory path or pass `--dir` to the
server command. `combie agent setup` embeds the resolved home using the
deterministic order in **Automatic setup** above (not the raw current-working-
directory default). The examples below use `COMBIE_HOME`.

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

Configuration and tool discovery were checked on Cursor 3.15.6; no recorded
natural-language Cursor call is claimed.

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

Use Combie to list retained investigation snapshots for this Resource.
```

Do not ask Combie MCP to sync, mutate infrastructure, find a root cause, or fix
a deployment. It supplies bounded evidence; the external agent interprets it.

## Limitations

- State is only as fresh as the last manual CLI sync.
- Investigation output is unpaginated and can be large.
- Relationships are one hop and limited to the two deterministic kinds in the
  README.
- No root-cause analysis, recommendations, or autonomous action.
- Codex natural-agent execution is validated; Cursor natural-agent execution
  and Claude Code execution are not.
