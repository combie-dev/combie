# SPRINT-041B — Agent Setup

> **Status:** Complete — AGENT SETUP GO; Sprint 042 blocked only by Sprint 041 release conditions
> **Depends on:** SPRINT-041A
> **Type:** Release-readiness follow-up — Agent Access configuration
> **Primary goal:** Remove agent-onboarding friction before closed beta by making Combie's EXISTING frozen MCP interface automatically configurable for Claude Code, Codex, and Cursor.
> **Product phase:** Closed-beta release candidate
> **Feature development:** Frozen
> **MCP contract:** Frozen
> **Beta invitations:** Blocked
> **Execution:** Out of scope
> **Internal AI/model reasoning:** Out of scope
> **Agent credential access:** Out of scope

---

# Why This Sprint Exists

Sprint 041 recorded a P1 closed-beta blocker:

```text
agent setup impossible for intended users
```

Sprint 041 completed with:

```text
CONDITIONAL GO
```

The intended closed-beta experience promises agent access. Manual MCP
configuration for Claude Code, Codex, and Cursor is documented but requires
users to hand-edit per-agent configuration files or run per-agent CLI commands.
Sprint 041 deferred the "Cursor natural call" and shipped no guided
configuration. Agent Access was declared beta-ready, but onboarding friction to
reach the existing interface remains.

The architecture canon already anticipates this capability:

- `docs/internal/ARCHITECTURE.md` — "Agent Discovery and Setup": Combie may
  safely detect compatible tools installed on the machine and configure
  supported agent integration formats such as MCP.
- `docs/internal/ROADMAP.md` v0.4 — Agent Access: "safe agent discovery" and
  "guided agent configuration" are declared capabilities of the already
  delivered phase.
- `docs/internal/beta/HERDR → COMBIE ADOPTION NOTES.md` — pre-launch scope
  classifies guided integration for Claude Code, Codex, and Cursor as P1.

Therefore Sprint 041B is NOT:

```text
building a new Agent Access capability
expanding the MCP contract
adding new MCP tools
building a generic agent framework
building a public AgentIntegration SDK
starting a new roadmap phase
```

It is:

> **A narrowly scoped, pre-beta follow-up that makes the existing frozen
> four-tool MCP interface automatically configurable for the supported agents.
> It improves access to an existing capability. It does NOT expand the
> capability itself.**

---

# Governing Principle

> **Make the existing Agent Access effortless before closed beta.
> Do not build more Agent Access. Make the existing Agent Access easier to
> reach.**

```text
Engineering providers
            ↓
          Combie
            ↓
    frozen four-tool MCP
            ↓
    Claude / Codex / Cursor
```

---

# Baseline

Sprint 041A reported:

```text
HEAD:          387304e — docs: update roadmap and agent integration planning
Tests:         635 pass across 57 files
Typecheck:     clean
git diff check: clean
Worktree:      clean
MCP contract:  exactly four read-only tools
041A gate:     SECURITY GO (cleared)
041 gate:      four release conditions still open
042:           not started
```

Verification commands:

```bash
git status
git log -5 --oneline
bun test
bun run typecheck
git diff --check
```

If Sprint 041B does not start from this recorded baseline, record the actual
baseline in Completion Notes and keep going only if the deviation is
documented. **STOP.** Do not combine Sprint 041B with Sprint 041 or 041A work.

---

# Sprint Mode

Sprint 041B is:

```text
RELEASE-READINESS FOLLOW-UP
```

not:

```text
FEATURE DEVELOPMENT
```

Every proposed code change must answer:

> **Does this change reduce agent-onboarding friction against the existing
> frozen MCP interface without touching the frozen surface?**

If that question cannot be answered concretely: do not implement the change.

---

# Hard Product Freeze

Freeze surface (unchanged from Sprint 041 / 041A):

- MCP tool count
- MCP tool names
- MCP schemas
- MCP semantics
- MCP read-only behavior
- providers
- Resource kinds
- relationship semantics
- Engineering Graph semantics
- evidence semantics
- investigation semantics
- memory semantics
- AI/model-provider behavior
- execution capabilities

The following four MCP tools must remain exactly the supported contract:

```text
list_resources
get_related_context
investigate_resource
list_providers
```

Do not add, remove, rename, or alter any MCP tool.

Sprint 041B may change code only in the agent-integration surface
(`src/agent/`, `src/app/agent.ts`, the `agent` CLI group) and the
documentation this sprint explicitly targets.

---

# Target Experience

The target experience for the primary command:

```text
$ combie agent setup

Detected AI agents:

✓ Claude Code
✓ Codex
✓ Cursor

Configure Combie for detected agents? [Y/n]

✓ Claude Code configured
✓ Codex configured
✓ Cursor configured

Your agents can now access Combie.
```

A user should be able to install Combie, connect providers, run one setup
command, and use the existing Combie MCP interface from their existing coding
agent.

---

# Supported Agents

Only:

```text
Claude Code    (id: claude)
Codex          (id: codex)
Cursor         (id: cursor)
```

Do not implement: Pi, OpenCode, Kimi, Grok, Copilot CLI, or other agents.
Those remain future planning items (HERDR adoption notes, deferred).

---

# Agent Detection

Conservative detection using only appropriate documented signals:

```text
executable availability on PATH
known application locations (Cursor.app on macOS)
documented configuration locations
```

Detection answers only: "Does this supported agent appear available?"

Do NOT:

```text
inspect shell history
scan arbitrary directories
scan arbitrary .env files
retrieve model API keys
inspect unrelated credentials
search for secrets
```

---

# Configuration Inspection

For each supported agent, determine whether Combie's existing MCP server is:

```text
not detected      agent not installed / no config location present
available         agent detected but not configured
configured        Combie MCP entry present and correct
stale             Combie MCP entry present but outdated or incorrect
invalid           configuration cannot be safely read or parsed
```

Terminology is consistent with existing CLI output (plain text, `✓`/`✗`,
tables with uppercase headers).

---

# Configuration Formats

The automation targets exactly the known-good manual setups:

| Agent | File | Structure |
| --- | --- | --- |
| Claude Code | `~/.claude.json` | top-level `mcpServers` object |
| Codex | `~/.codex/config.toml` | `[mcp_servers.combie]` + `[mcp_servers.combie.env]` sections |
| Cursor | `~/.cursor/mcp.json` | `mcpServers` object |

The entry installed is the documented invocation, with the state directory
embedded via `COMBIE_HOME`:

```text
command: bun
args:    run --cwd <project> combie mcp   (checkout form)
         or the compiled-binary form when Combie is not run from a checkout
env:     COMBIE_HOME=<resolved state directory>
```

Both documented Codex shapes (top-level `cwd` field and `--cwd` inside args)
are accepted as correct.

---

# Configuration Ownership Invariant

Treat another application's configuration as user-owned. The invariant:

> **Combie owns only the Combie MCP entry. The user owns everything else.**

- Never replace an entire config file when a targeted mutation is possible.
- Never delete unrelated configuration.
- Never normalize or reformat unrelated configuration unnecessarily:
  - JSON mutations preserve the existing file's indentation, key order,
    trailing newline, file mode, and all unrelated keys byte-content.
  - TOML mutations replace only the `mcp_servers.combie` sections; every other
    section and all preamble content is preserved byte-for-byte.
- If an existing correct Combie entry exists: setup is a no-op
  ("already configured").
- If an existing stale Combie entry exists: update only that entry when safe.
- If a configuration cannot be safely mutated: fail safely, explain why, and
  point to the manual setup fallback.
- Do not risk user configuration for convenience.

---

# Security Boundary

Agent Setup MUST NOT involve AI-provider credentials. Architecture remains:

```text
Agent's model/auth
           ↓
         Agent
           ↓
      Combie MCP
           ↓
    Combie context
```

NOT:

```text
AI API key
        ↓
      Combie
```

Do not:

```text
discover model API keys
copy model API keys
migrate model API keys
persist model API keys
expose model API keys
```

No agent credential files (`~/.claude/`, `~/.codex/auth.json`, editor
credential stores) are read, written, or referenced. Agent configuration
files are mutated only in the Combie MCP entry, with file modes preserved.

---

# Minimal Internal Architecture

Create only the abstraction necessary to avoid three unrelated one-off
implementations. Each integration exposes behavior equivalent to:

```text
detect()
status()
install()
remove()
```

A tiny internal registry of the three supported integrations is acceptable.
Do not build:

```text
a generic plugin platform
a public AgentIntegration SDK
speculative abstractions for future agents
```

New surface:

```text
src/agent/types.ts        agent ids, statuses, shared types
src/agent/config.ts       targeted JSON + TOML config mutation helpers
src/agent/detection.ts    conservative executable / config-location detection
src/agent/invocation.ts   Combie MCP invocation builder + entry comparison
src/agent/claude.ts       Claude Code integration
src/agent/codex.ts        Codex integration
src/agent/cursor.ts       Cursor integration
src/agent/registry.ts     tiny internal registry
src/app/agent.ts          command services + output formatting
```

All agent I/O is synchronous local filesystem access; no new dependencies.

---

# CLI Surface

Add an `agent` command group to `src/cli/index.ts`:

```text
combie agent setup [agent ...]   Detect and configure supported AI agents
combie agent status              Show detection and integration status
combie agent remove <agent ...>  Remove Combie MCP configuration from agents
```

- `setup` accepts optional agent ids to scope configuration; with no ids it
  configures all detected supported agents.
- `setup` supports `--yes` and a TTY-only `[Y/n]` confirmation. In non-TTY
  contexts (automation, tests) setup proceeds without prompting.
- `status` prints a table (AGENT / DETECTED / INTEGRATION) using the existing
  table formatting conventions.
- `remove` removes only the Combie MCP entry, is idempotent, and preserves
  unrelated MCP servers and configuration.
- Unknown agent ids or subcommands produce usage errors, mirroring
  `combie connect`.

---

# Definition of Done

---

- [x] SPRINT-041B.md created with the lettered follow-up conventions
- [x] exact baseline SHA recorded
- [x] no source files outside the agent surface and CLI modified
- [x] MCP server source untouched
- [x] MCP exactly-four-tool contract preserved and re-verified
- [x] detection implemented for Claude Code, Codex, Cursor
- [x] conservative detection only (PATH, known app locations, documented config locations)
- [x] no shell-history scanning
- [x] no .env scanning
- [x] no model API key retrieval, copying, migration, or persistence
- [x] claude install preserves unrelated configuration
- [x] claude install idempotent
- [x] claude removal surgical
- [x] codex install preserves unrelated configuration
- [x] codex install idempotent
- [x] codex removal surgical
- [x] cursor install preserves unrelated configuration
- [x] cursor install idempotent
- [x] cursor removal surgical
- [x] stale Combie entries updated, not duplicated
- [x] malformed configuration fails safely with manual fallback guidance
- [x] config file modes preserved on mutation
- [x] `combie agent setup` implemented
- [x] `combie agent status` implemented
- [x] `combie agent remove` implemented
- [x] setup no longer prompts when stdin is not a TTY
- [x] help text includes the agent commands
- [x] tests cover agent missing / detected / config missing / empty / unrelated /
      correct / stale / malformed / install / repeated install / removal /
      repeated removal / preservation
- [x] CLI behavior tested through `main`
- [x] full test suite passes
- [x] typecheck passes
- [x] git diff check clean
- [x] E2E validation performed or explicitly recorded as manual
- [x] docs/public/MCP.md updated with automatic setup as the preferred path
- [x] manual config instructions remain available as fallback
- [x] HERDR adoption notes updated with delivered scope only
- [x] completion notes written
- [x] Canon changes recorded or None
- [x] Sprint 041 release conditions recorded as unchanged
- [x] Sprint 041A security status recorded as unchanged
- [x] Sprint 042 not started

---

# Explicitly Out of Scope

Do not implement:

- Pi
- OpenCode
- generic third-party agent framework
- public AgentIntegration SDK
- new MCP tools (including timeline, memory, or current-context tools)
- new context primitives
- model-provider integrations
- BYO model credentials
- lifecycle tracking
- idle/working/blocked detection
- terminal management
- session restore
- agent orchestration
- infrastructure execution
- autonomous actions
- Sprint 041 release-condition closure
- Sprint 042 beta invitations

If implementation appears to require any of these:

**STOP.** Explain why. Do not silently expand scope.

---

# Final Principle

> **This sprint exists to make the already-supported Combie Agent Access
> experience effortless before closed beta. Do not build more Agent Access.
> Make the existing Agent Access easier to reach.**

# Completion Notes — Sprint 041B (2026-08-12)

## Baseline

- **Sprint 041A HEAD**: `387304e7ec61bc419da979a50bfbe9b62efdcee5` (master)
- **Tests**: 635 pass across 57 files
- **Typecheck**: clean
- **Worktree**: clean (only SPRINT-041B.md and implementation untracked at start)
- **Verification**: baseline matches as recorded.

## Implemented

- `src/agent/` — types, targeted JSON/TOML config mutation, conservative
  detection, MCP invocation builder, Claude/Codex/Cursor integrations, and a
  tiny internal registry (detect / status / install / remove per agent).
- `src/app/agent.ts` — `inspectAgents`, `setupAgents`, `removeAgents` services
  with per-agent results and formatted output.
- `src/cli/index.ts` — `agent setup [agent...]`, `agent status`,
  `agent remove <agent...>` command group; TTY-only confirmation with `--yes`;
  help text updated.
- `docs/public/MCP.md` — automatic setup documented as the preferred path;
  manual instructions retained as fallback.
- `docs/internal/beta/HERDR → COMBIE ADOPTION NOTES.md` — delivered-scope
  record only; deferred items untouched.

## Config Formats Covered

- Claude Code: `~/.claude.json` top-level `mcpServers` entry, `type: "stdio"`.
- Codex: `~/.codex/config.toml` `[mcp_servers.combie]` +
  `[mcp_servers.combie.env]` sections; both documented command shapes
  accepted.
- Cursor: `~/.cursor/mcp.json` `mcpServers` entry.

## Validation

```text
Tests:       699 pass across 59 files (up from 635 baseline across 57 files)
Typecheck:   clean
Diff check:  clean
MCP contract: exactly four read-only tools unchanged
              list_resources / get_related_context / investigate_resource / list_providers
Worktree:    only SPRINT-041B files
```

## E2E

- Codex: automated configuration validation via `codex mcp list` against a
  temp-HOME installation produced by `combie agent setup` — the `combie`
  server is listed as `enabled` with the expected command, args, and
  `COMBIE_HOME`.
- MCP boot: the exact installed invocation
  (`bun run --cwd <project> combie mcp` with `COMBIE_HOME`) was executed
  directly; the stdio server booted and answered the `initialize` request.
- Cursor: configuration validation only; GUI refresh is manual validation.
- Claude Code: configuration validation only; the local `claude` executable
  remains the recorded broken shim, so a live Claude MCP call is manual
  validation.

## Sprint 041 Conditions

Sprint 041B does NOT automatically close these existing conditions:

```text
accessible repository/release URL
authorized beta-use/license terms
fresh live provider sync on final build
GitHub + Vercel dogfood OR explicitly narrowed cohort
```

Track them separately. They remain open and unchanged.

> **Updated 2026-08-13 (release closure):** all four Sprint 041 conditions were
> subsequently closed by the v0.1.1 publication — public release URL/SHA on
> `github.com/combie-dev/combie` (tag `v0.1.1` → `1643252…`), Apache-2.0
> LICENSE (owner-approved), fresh live GitHub sync on the installed binary
> (312 repositories, 611 workflow runs), and the cohort explicitly narrowed to
> GitHub-only (owner-approved). Evidence in `docs/internal/beta/RELEASE.md`,
> `READINESS.md`, `DOGFOOD.md`. The only Sprint 041B fix at the release gate
> was a hermetic test change (`830384e`); no product behavior changed.

## Sprint 042 Gate

Sprint 042 remains **blocked** by the unresolved Sprint 041 release conditions
listed above. The **Sprint 041A security gate** remains **CLEARED** and is not
re-opened or re-scored by this sprint. Sprint 042 **has not started**.

## Canon Changes

None. The implementation fits the current Vision, Architecture, and Roadmap
(Agent Discovery and Setup; v0.4 Agent Access "safe agent discovery" and
"guided agent configuration" capabilities) without material Canon changes.

## Commit

Implementation + completion record: single commit per Sprint 041B
authorization (`feat(agents): add automatic MCP agent setup`). No push.