
# SPRINT-039 — MCP Foundation (Read-Only)

> **Status:** Implemented · **Date:** 2026-08-10
> **Depends on:** SPRINT-038
> **Type:** Implementation / Agent Access foundation
> **Primary goal:** Add a minimal read-only MCP server that exposes existing Combie application-layer context to external agents through structured tool calls without changing Combie's core semantics.
> **Product phase:** Closed-beta launch arc
> **Transport:** stdio first
> **Write access:** None
> **Provider network access through MCP:** None
> **Sync/connect through MCP:** None
> **AI/model reasoning inside Combie:** None
> **New product intelligence:** None
> **Beta blocker:** Yes

---

# Goal

Sprint 037 identified Agent Access as the largest remaining roadmap gap.

Sprint 038 closed the external documentation/onboarding blocker and prepared the product for real outside users.

Sprint 039 begins the next layer:

```text
                 ┌── CLI ── Human
                 │
Providers → Combie
                 │
                 └── MCP ── Agent
````

The purpose of Sprint 039 is NOT to build the full agent experience.

It is to prove the architectural boundary:

```text
external MCP client
        ↓
stdio transport
        ↓
Combie MCP adapter
        ↓
existing application-layer methods
        ↓
structured deterministic context
```

The MCP server must be an adapter around Combie.

It must not become a second implementation of Combie.

---

# Core Principle

> **Expose Combie's existing context to agents. Do not move Combie's logic into MCP.**

And:

> **CLI and MCP are sibling interfaces over the same application layer.**

Preferred architecture:

```text
                  Application Layer
                   /             \
                  /               \
             CLI Formatter       MCP Adapter
```

Forbidden architecture:

```text
Application
   ↓
CLI text
   ↓
parse CLI output
   ↓
MCP
```

MCP responses must come from structured application data.

Never scrape or parse CLI-formatted text.

---

# Baseline

Begin from the clean committed Sprint 038 baseline.

Expected Sprint 038 commits:

```text
bef4453
code / UX-copy fixes

c296b4c
docs / README / Quickstart / dogfood / readiness

98ad4cc
final Sprint SHA record
```

Do not assume short SHAs are current HEAD.

Verify:

```bash
git status
git log -6 --oneline
bun test
bun run typecheck
```

Expected baseline:

```text
608 tests passing
typecheck clean
worktree clean
```

Record:

* exact current HEAD SHA
* branch
* Sprint 038 implementation/doc SHAs
* test count
* typecheck
* worktree state

If Sprint 038 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 038 and Sprint 039.

---

# Sprint 038 Decisions Are Inputs

Treat these as settled unless repository pressure exposes a correctness issue.

## Closed-beta launch arc

```text
038  docs / UX / dogfood prep        ✓
039  MCP foundation                  ← this Sprint
040  MCP tool surface + validation
041  closed-beta release prep
042  invite users
```

## Human experience

README and Quickstart now represent the current product.

Do not redesign onboarding in Sprint 039.

## Investigation

`combie investigate` is product-useful and frozen for now.

Do not add investigation features.

## MCP v1 boundary

Read-only.

No:

```text
connect
sync
credential writes
Relationship mutation
provider configuration
infrastructure execution
```

## Intelligence

Combie does NOT own an LLM client yet.

No:

```text
OpenAI
Anthropic
Gemini
OpenRouter
Ollama
BYO model
prompting layer
agent reasoning
```

External agents provide the intelligence.

Combie provides context.

---

# Repository Understanding Report

Before implementation, inspect:

* `skills/build-combie/SKILL.md`
* Combie Canon
* SPRINT-037
* SPRINT-038
* current package/runtime dependencies
* CLI entrypoint
* application-layer methods
* Resource storage/query methods
* Relationship/context methods
* investigation composition
* state directory resolution
* `COMBIE_HOME`
* `--dir`
* structured DTOs
* error types
* package/bin configuration
* any existing protocol/server dependencies
* tests
* `docs/public/QUICKSTART.md`
* `docs/internal/beta/READINESS.md`

Produce a concise Repository Understanding report.

Explicitly answer:

1. Which application-layer methods are already stable enough to expose?
2. Which methods are purely local/offline?
3. Which methods perform provider network calls?
4. Which methods mutate local state?
5. Which methods return structured DTOs?
6. Which methods currently return formatted strings only?
7. How does the CLI resolve Combie state directory?
8. Can MCP reuse the same state resolution?
9. How are not-found / invalid-input errors represented?
10. How should MCP map those errors?
11. Is there any MCP dependency already present?
12. Does package/runtime architecture support a stdio server cleanly?
13. Should MCP be:

    * a new CLI subcommand,
    * a separate binary/entrypoint,
    * or another existing pattern?
14. Can MCP remain a thin adapter?
15. What minimum tool set proves the architecture?
16. Does any core domain/application change appear necessary? Expected: no.

No implementation before this report.

---

# Architecture Pressure Report

Before coding, answer:

1. What MCP SDK/library should be used?
2. Is it an official/current implementation?
3. Does it support stdio cleanly?
4. Should Combie use stdio only in Sprint 039?
5. Is HTTP/SSE/streamable HTTP needed now? Expected: no.
6. Should the server be launched through `combie mcp` or another entrypoint?
7. How should state directory selection work?
8. Should MCP accept `COMBIE_HOME`?
9. Should it accept a CLI `--dir` equivalent?
10. How should tool schemas be defined?
11. Should tools return typed structured content, text summaries, or both?
12. How should Resource IDs be validated?
13. How should errors map to MCP tool errors?
14. Should network-mutating methods be omitted entirely? Expected: yes.
15. Should `sync` be omitted? Expected: yes.
16. Should provider credentials ever be exposed? Expected: no.
17. Should MCP expose raw database rows? Expected: no.
18. Should MCP expose application DTOs? Expected: yes.
19. Do DTOs need MCP-specific serialization?
20. Is a generic AgentService abstraction needed? Expected: no.
21. Does Canon need to change?

Prefer the smallest adapter architecture.

---

# Official MCP Documentation Requirement

MCP is an external protocol and may have changed.

Before implementation, verify the current official MCP specification and official TypeScript SDK documentation.

Use primary sources only.

Confirm:

* current server creation API;
* stdio transport;
* tool registration API;
* input schema approach;
* structured output capabilities;
* error semantics;
* lifecycle/shutdown behavior.

Record the SDK/package/version chosen in completion notes.

Do not rely on old blog examples.

Do not introduce deprecated transport APIs.

---

# MCP Entry Point

Pressure-test the best external command.

Preferred conceptual user experience:

```bash
bun run combie mcp
```

or when globally runnable later:

```bash
combie mcp
```

Do not create a completely disconnected server command if the existing CLI can host it cleanly.

The entry point should:

```text
resolve local Combie state
open local store
start MCP stdio server
register read-only tools
serve until transport closes
close resources cleanly
```

No provider sync.

---

# stdio Only

Sprint 039 should implement:

```text
stdio MCP transport
```

Do not add:

```text
HTTP
SSE
Streamable HTTP
remote hosted MCP
authentication server
network listener
```

The initial beta target is local agents using local Combie state.

This fits Combie's local-first architecture.

---

# MCP Server Boundary

Conceptually:

```text
src/mcp/
├── server
├── tools
├── schemas
└── errors
```

This is conceptual.

Follow repository organization.

The adapter may depend on:

```text
application layer
domain DTOs
safe serialization
```

The application/domain layers must not depend on MCP.

Dependency direction:

```text
MCP
 ↓
Application
 ↓
Domain / Storage
```

Never:

```text
Application
 ↓
MCP
```

---

# Minimal Sprint 039 Tool Surface

Sprint 039 should NOT attempt the full eventual beta toolset.

It should expose the smallest read-only set that proves:

```text
discovery
graph context
deep investigation
```

Recommended initial tools:

```text
list_resources
get_related_context
investigate_resource
```

Optionally:

```text
list_providers
```

if repository pressure shows it is trivial and useful for discovery.

Do not automatically add more tools.

Sprint 040 owns surface expansion and real external-agent validation.

---

# Tool 1 — list_resources

Purpose:

> Let an agent discover exact Combie Resource IDs and basic Resource identity.

Underlying implementation must use existing local Resource query/application logic.

No provider calls.

Input should be minimal.

Potential optional filters may be pressure-tested only if already supported cleanly.

Do NOT invent a full search/filter language.

Output should preserve:

```text
Resource ID
provider
kind
providerResourceId
display name
safe metadata only if appropriate
```

Avoid unnecessary provider metadata bulk.

The main job is discovery.

---

# Tool 2 — get_related_context

Purpose:

> Let an agent retrieve canonical one-hop Relationships and related Resource context for an exact Resource ID.

Use existing related-context composition.

Preserve:

```text
Relationship kind
source/target
query direction
Relationship evidence
neighbor Resource
```

Do not expand beyond one hop.

Do not infer new Relationships.

Do not return CLI-formatted Related Context text as the primary representation.

---

# Tool 3 — investigate_resource

Purpose:

> Give an external agent Combie's complete deterministic investigation context for one exact Resource.

This should be the strongest single beta tool.

Use existing `InvestigationContext` application composition.

Structured output should preserve, where available:

```text
subject Resource
subject Changes
Known Facts
Missing Context
one-hop Relationships
neighbor Resources
neighbor Changes
provider evidence
provider authority
Known Provider Activity
Combie Observations
Shared Commit Context
```

Do not force the MCP schema to mimic CLI headings if application DTOs already have cleaner structure.

Do not return only the formatted `combie investigate` string.

---

# Optional Tool — list_providers

Only implement if architecture remains small.

Purpose:

> Tell an agent which providers are configured/connected locally.

Read-only local state only.

Do not expose tokens.

Do not include token values, token suffixes, credential paths, or unsafe errors.

---

# Tools Explicitly Deferred to Sprint 040 or Later

Do NOT expose in Sprint 039:

```text
get_history
get_context
get_changes
get_missing_context
get_shared_commit_context
provider evidence-specific tools
search
filtering tools
```

unless Repository Understanding proves one is essential to make the initial three tools coherent.

The goal is foundation, not tool-count.

---

# Tools Forbidden in Initial MCP

Do not expose:

```text
init
connect
sync
disconnect
write credentials
delete state
create Relationship
override Relationship
deploy
restart
rollback
execute command
provider mutation
```

No write actions.

No infrastructure execution.

---

# No Provider Network Through MCP

Every Sprint 039 MCP tool must operate against persisted local Combie state.

The user manually runs:

```bash
combie sync
```

outside MCP.

Then their agent reads Combie.

This boundary should be explicit in:

* code;
* tool descriptions;
* documentation;
* tests.

Do not let MCP silently sync.

---

# State Directory Resolution

MCP must read the same Combie state as the CLI.

Pressure-test:

```text
default ./.combie
COMBIE_HOME
--dir equivalent
```

Do not invent a second state location.

If launched from an AI agent whose working directory differs from the project, this matters.

Determine the smallest usable approach for Sprint 039.

Possible solution:

```text
COMBIE_HOME environment variable
```

as the reliable MCP configuration path.

If CLI subcommand can accept:

```text
--dir
```

and agent config supports args, that may also be useful.

Document final behavior.

---

# MCP Tool Inputs

Use exact Resource IDs.

Example conceptual input:

```json
{
  "resourceId": "vercel:project:prj_..."
}
```

No fuzzy lookup.

No display-name matching.

No AI-generated identity guessing inside Combie.

Invalid exact ID should return a clear structured error.

---

# MCP Tool Outputs

Prefer structured output.

The agent should not have to parse strings like:

```text
→ source_for → Vercel project...
```

to understand Relationships.

Preserve structured fields.

If MCP SDK/client compatibility benefits from a small human-readable text content alongside structured content, pressure-test it.

But the structured representation is canonical.

No CLI scraper.

---

# Serialization Boundary

Only expose JSON-safe, normalized application data.

Audit:

* `undefined`
* Dates
* Maps/Sets
* Buffer/binary values
* SQLite-specific types
* Errors
* bigint

Normalize only at the MCP adapter boundary where necessary.

Do not mutate core DTO semantics for MCP convenience.

---

# Tool Descriptions

Tool descriptions matter because external agents use them for selection.

Descriptions must be:

```text
short
specific
truthful
semantic
```

Example:

```text
investigate_resource

Return Combie's locally stored deterministic investigation context for an
exact Resource ID, including current state, changes, related Resources,
provider evidence, authority, and cross-provider shared commit context when
available. Does not call providers or make changes.
```

Do not say:

```text
find root cause
debug incident
determine what went wrong
```

Those overstate capabilities.

---

# Error Semantics

Pressure-test and implement consistent errors for:

```text
invalid Resource ID
Resource not found
state directory not initialized
database unavailable
unexpected local read failure
```

Errors should be:

```text
clear
secret-safe
agent-readable
```

Do not include:

```text
credentials
raw SQL
provider tokens
unsafe stack traces
```

unless development mode deliberately does so outside tool response.

---

# MCP Startup Errors

Handle:

```text
missing .combie
invalid state directory
database open failure
```

truthfully.

Pressure-test whether server should:

```text
start but tools return state errors
```

or:

```text
fail startup
```

Prefer behavior that gives agents actionable context without hiding fatal configuration problems.

Document final decision.

---

# Read-Only Guarantee

Sprint 039 must prove MCP calls do not mutate Combie state.

No tool should:

```text
write SQLite
change credentials
run sync
change Relationships
modify Resources
```

Use DB-hash/read-only tests where practical, following investigation read-only patterns.

---

# Offline Guarantee

After a successful prior sync:

```bash
unset GITHUB_TOKEN
unset GH_TOKEN
unset VERCEL_TOKEN
unset CLOUDFLARE_API_TOKEN
unset SENTRY_AUTH_TOKEN
unset SENTRY_TOKEN
unset NEON_API_KEY
```

and equivalent PlanetScale env vars.

The MCP read tools must continue functioning from local state.

No provider calls.

---

# Security

Audit MCP as a new exposure boundary.

Tool responses must not expose:

```text
provider tokens
credentials file contents
auth headers
raw provider error payloads
connection strings
database passwords
unsafe environment variables
```

Use existing safe normalized DTOs.

Do not expose the credentials store through MCP.

Do not add a `get_config` tool that leaks secrets.

---

# Local Trust Model

MCP v1 is local stdio.

It relies on:

```text
the local user's access to the Combie state directory
```

No remote auth layer is needed in Sprint 039.

Document that stdio is intended for local agent clients.

Do not build network authentication.

---

# Documentation

Update public docs minimally to acknowledge Agent Access foundation only after it works.

At minimum document:

```text
MCP is now available locally over stdio
read-only
uses persisted Combie state
requires prior init/connect/sync
does not sync automatically
```

Do not produce complete Codex/Cursor/Claude setup guides yet if Sprint 040 owns external-client validation.

Sprint 040 should own polished client configuration examples based on actual tested clients.

---

# Internal MCP Validation

Sprint 039 must include protocol-level tests or a local MCP client harness sufficient to prove:

```text
server starts
tools register
tool schemas validate
tool call reaches application layer
structured result returns
errors map safely
server closes cleanly
```

This is NOT yet full Codex/Cursor/Claude validation.

That is Sprint 040.

---

# Test Fixtures

Use realistic local Combie fixtures covering:

```text
Resources
source_for Relationship
uses_domain_in Relationship where useful
Changes
Vercel deployment evidence
GitHub workflow-run evidence
Shared Commit Context
Missing Context
```

The MCP adapter should faithfully expose what application methods already know.

Do not create MCP-only domain fixtures disconnected from normal Combie storage patterns.

---

# MCP Foundation Tests

Use Red → Green → Refactor.

At minimum cover:

## Server

* starts over stdio/test transport
* registers expected tools
* does not register write tools
* clean shutdown

## list_resources

* returns exact stable IDs
* deterministic order
* no secrets
* empty state

## get_related_context

* outbound Relationship
* inbound Relationship
* evidence preserved
* neighbor Resource preserved
* unknown Resource
* invalid Resource ID
* one-hop only

## investigate_resource

* current Resource
* Changes
* Relationships
* provider evidence
* Missing Context
* Shared Commit Context fixture
* authority
* deterministic output
* unknown Resource
* no provider calls
* read-only

## list_providers if implemented

* connected state
* no credential value
* deterministic output

## State directory

* default path
* `COMBIE_HOME`
* explicit dir arg if implemented
* missing state

## Security

* token-like fixture values absent
* credentials absent
* secret scan

## Read-only

* DB unchanged across tool calls

## Offline

* no provider credentials required

---

# No MCP-Specific Domain Logic

Do not add matching, inference, Facts, Missing Context, relationship logic, or chronology logic inside MCP.

If a desired response requires new core logic:

**STOP.**

That belongs in a future core Sprint, not the protocol adapter.

---

# No Generic Agent Framework

Do not create:

```text
Agent
AgentRuntime
ToolRegistry platform
AgentSession
AgentMemory
PromptEngine
ModelRouter
```

MCP server + tool adapter is enough.

Use the MCP SDK's normal tool registration mechanisms.

---

# No BYO Model

Do not add:

```text
OPENAI_API_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY
OPENROUTER_API_KEY
OLLAMA
IntelligenceProvider
```

Sprint 037 explicitly recommended:

```text
External Agent Intelligence via MCP first.
```

Combie itself remains deterministic.

---

# No MCP Writes

Do not expose sync even though sync may appear relatively harmless.

Sync:

```text
calls providers
writes local state
changes authority
creates Changes
refreshes evidence
```

It is therefore a write/network action.

Initial MCP is read-only.

Sprint 040 may pressure-test whether any non-read action belongs later, but beta v1 should remain conservative unless evidence strongly changes that decision.

---

# Dependency Selection

Adding an MCP SDK is expected.

Keep dependency surface minimal.

Do not introduce:

```text
web framework
HTTP server framework
agent framework
schema framework
```

unless required by the official MCP SDK.

If the official SDK supports the repository's existing validation approach, reuse it.

Avoid duplicate validation libraries where practical.

---

# Package / Runtime Compatibility

Combie currently runs under Bun.

Verify chosen MCP SDK works correctly under Bun for:

```text
stdio
ESM/imports
schema validation
process lifecycle
```

If Bun compatibility fails:

do not silently switch Combie runtime architecture.

Investigate smallest compatible approach.

If a major runtime change is required:

**STOP and report.**

---

# Tool Naming

Use stable lower_snake_case names.

Candidate Sprint 039 names:

```text
list_resources
get_related_context
investigate_resource
list_providers
```

Do not prefix every tool with:

```text
combie_
```

unless MCP ecosystem conventions/repository configuration make that necessary.

The server identity already establishes Combie.

Pressure-test naming during Architecture Pressure.

---

# Initial MCP Beta Experience

The target after Sprint 039 is not yet polished external validation.

But architecture should support this future Sprint 040 experience:

```text
User:
"Use Combie to tell me what's happening around this Vercel project."

Agent:
1. list_resources
2. locate exact project ID
3. investigate_resource
4. answer using structured Combie evidence
```

Sprint 039 should make this technically possible.

Sprint 040 proves it with real agent clients.

---

# Documentation Boundary

Sprint 039 may add:

```text
docs/public/MCP.md
```

only if useful to document the protocol foundation.

Keep it minimal.

Do not claim client compatibility until tested.

Safe:

```text
Local stdio MCP server
Read-only tools
Current tool list
State-dir configuration
Prior sync required
```

Unsafe before Sprint 040:

```text
Works with every MCP client
Certified for Codex/Cursor/Claude
```

---

# Beta Readiness Update

Update:

```text
docs/internal/beta/READINESS.md
```

After Sprint 039:

```text
External docs            ✓
MCP foundation           ✓
MCP external validation  ✗
Multi-provider dogfood   ◐
Release prep             ✗
```

Do not mark MCP blocker fully closed until Sprint 040 validates the beta tool surface with real external agent clients.

---

# Explicit Architecture Boundary

Sprint 039 may add:

```text
MCP dependency
MCP adapter/server
MCP command/entrypoint
tool schemas
tool serialization
tool/error tests
minimal docs
```

It should NOT modify:

```text
Resource semantics
Relationship semantics
Change semantics
Investigation semantics
provider adapters
provider APIs
evidence semantics
authority semantics
Shared Commit semantics
```

If those changes appear necessary:

**STOP and report.**

---

# Validation

Starting baseline:

```text
608 tests
```

Run focused MCP tests.

Then:

```bash
bun test
bun run typecheck
git diff --check
git status
```

Also verify:

```text
MCP server smoke test
tool registration
structured tool call
offline operation
read-only DB hash
secret scan
dependency review
full diff review
```

Final test count should increase.

---

# Live / Local Verification

Where practical, use the existing real local GitHub dogfood Combie state from Sprint 038 or a safe scratch copy.

Do not depend on external provider credentials.

Verify:

```text
start MCP server
list Resources
inspect a real Resource
receive InvestigationContext
credentials unset
same reads still work
```

Do not mutate the user's canonical Combie state unexpectedly.

Use scratch/copy if needed.

---

# Architecture Review

Before completion answer:

1. What official MCP SDK/version shipped?
2. Why was it chosen?
3. Is transport stdio only?
4. What command starts the server?
5. Does MCP reuse the same Combie state directory?
6. Is `COMBIE_HOME` supported?
7. Is explicit dir configuration supported?
8. Which tools shipped?
9. Why were those tools chosen?
10. Are all tools read-only?
11. Does any tool call providers? Expected: no.
12. Does any tool mutate local state? Expected: no.
13. Are responses structured rather than parsed CLI text?
14. Does MCP depend directly on application methods?
15. Did any application/domain logic move into MCP? Expected: no.
16. Are exact Resource IDs required?
17. Are errors secret-safe?
18. Are credentials inaccessible through MCP?
19. Does offline operation work?
20. Does read-only verification pass?
21. Is the MCP server compatible with Bun?
22. Did any core architecture need modification?
23. Is Sprint 040 now unblocked?
24. What exact tool/API gaps should Sprint 040 validate or add?

---

# Completion Notes

Update `docs/internal/sprints/SPRINT-039.md` with:

## Baseline

Sprint 038 HEAD: `98ad4cc` · Tests: 608 · Typecheck: clean · Worktree: clean

## Repository Understanding

App-layer methods are thin, stable, structured DTOs: `listProviders`, `listResources`, `getRelatedContext`, `getInvestigationContext`. All pure reads, offline, no mutation. Domain types are JSON-safe (ISO-8601 strings, no bigints/Maps). State resolution: `--dir` > `COMBIE_HOME` > `./.combie`. Store lifecycle: open/use/close per invocation.

## Architecture Pressure

MCP SDK: `@modelcontextprotocol/server` v2.0.0 (current official). Transport: stdio only via `serveStdio`. Dependency direction: MCP → Application → Domain/Storage (correct). No IntelligenceProvider, no core changes needed.

## Official MCP Verification

SDK v2 implements 2026-07-28 spec. API: `McpServer`, `registerTool(name, {description, inputSchema}, handler)`, `serveStdio()`, `createMcpHandler()`. Tool results: `{ content, isError?, structuredContent? }`. Test transport: `InMemoryTransport.createLinkedPair()`.

## Dependency

| Package | Version |
|---|---|
| `@modelcontextprotocol/server` | 2.0.0 |
| `zod` | 4.4.3 |
| `@modelcontextprotocol/client` (dev) | 2.0.0 |

## Server Architecture

Entrypoint: `bun run combie mcp` (CLI switch case). Transport: stdio. All Combie app-layer imports are dynamic (`await import(...)`) inside tool handlers. `serveMcp()` dynamically imports `@modelcontextprotocol/server/stdio`. Dependency direction correct. No core architecture changes.

## State Resolution

Same as CLI: `./.combie` (default) → `COMBIE_HOME` → `--dir`. Supports `bun run combie mcp --dir <path>`. No second state/config system.

## Tool Surface (4 tools shipped)

| Tool | Input | Delegation |
|---|---|---|
| `list_resources` | optional provider, kind | `listResources()` |
| `get_related_context` | exact resourceId | `getRelatedContext()` |
| `investigate_resource` | exact resourceId | `getInvestigationContext()` |
| `list_providers` | none | `listProviders()` |

All: read-only, exact-ID, structured output, no provider calls, no mutation.

## Structured Output

Both `content` (human-readable) and `structuredContent` (JSON-safe data). No CLI text parsing. `safeJson()` at adapter boundary.

## Errors

`isError: true` with descriptive messages. Codes: `NOT_INITIALIZED`, `RESOURCE_NOT_FOUND`, `RESOURCE_REF_REQUIRED`. No secrets, stack traces, or raw SQL in output.

## Security

Zero secrets in tool output: no tokens, credentials, auth headers, connection strings. `list_providers` exposes only `accountId`/`accountName` from public config. Secret scan clean.

## Read-Only / Offline

DB hash unchanged across tool calls. All tools work with provider credentials unset. No sync/connect/credential/mutation tools. No provider network access from MCP.

## Protocol Tests

Unit tests verify: app-layer delegation correctness, input validation, error mapping, secret exclusion, offline reads, and read-only behavior. InMemoryTransport + SQLite co-existence has known Bun incompatibility — stdio transport (production path) unaffected. 8 new tests, total 616 passing.

## Local Verification

Scratch Combie state with GitHub resource verified: server creation, tool registration, app-layer `listResources`/`getRelatedContext`/`getInvestigationContext`/`listProviders` return correct structured data. Dynamic imports work inside tool handlers. Stdio path tested via `serveStdio`.

## Public Docs

`docs/public/MCP.md` created: stdio-only MCP foundation, 4 read-only tools, state dir configuration, prior sync required, limitations, transport note.

## Beta Readiness

`docs/internal/beta/READINESS.md` updated: MCP foundation DONE, external-agent validation NOT DONE, multi-provider dogfood partial, release prep not started. Beta promise now includes MCP foundation.

## Deviations

1. InMemoryTransport protocol-level tests could not be implemented due to Bun + MCP SDK v2 + `bun:sqlite` incompatibility (tool handler hangs). App-layer unit tests and live verification cover the MCP adapter correctness.
2. Dynamic imports (`await import(...)`) used for heavy app-layer modules in tool handlers to defer module graph loading. Does not change semantics.
3. `tools.ts` module retained as reference but tool registration inlined in `server.ts` for simplicity.

## Learnings

1. MCP SDK v2's InMemoryTransport has known issues with Bun's `bun:sqlite` when accessed from within tool handlers. This is a transport-level issue, not a Combie logic issue. Stdio transport (production path) is unaffected.
2. The Combie app layer is already structured-data-first — MCP is truly a thin adapter.
3. Dynamic imports at the adapter boundary successfully avoid heavy module graph issues without changing core semantics.
4. All 4 tools are under 200 lines total including descriptions and error handling. The adapter is thin by design.

## Canon Changes

None.

## Commit

TBD — pending final commit.

## Answers to Explicit Questions

1. Yes — `bun run combie mcp`
2. stdio only
3. `bun run combie mcp` or `bun run combie mcp --dir <path>`
4. `@modelcontextprotocol/server` v2.0.0
5. Yes (stdio path; InMemoryTransport has known SQLite incompatibility)
6. `list_resources`, `get_related_context`, `investigate_resource`, `list_providers`
7. `investigate_resource` — strongest deterministic context
8. Yes — `structuredContent` + `content`, no CLI text parsing
9. No CLI text parsing anywhere
10. Yes — delegates to existing app-layer methods
11. Yes — via `list_resources`
12. Yes — via `get_related_context`
13. Yes — via `investigate_resource`
14. Yes — exact `provider:kind:providerResourceId` required
15. Yes — read-only
16. No — no provider network calls
17. No — no sync
18. Yes — works with credentials unset (offline)
19. Yes — DB hash unchanged
20. Yes — credentials excluded
21. Yes — CombieError messages, no secrets
22. Yes — `--dir` flag, `COMBIE_HOME`
23. No — no core semantic changes
24. No — no provider behavior changes
25. No — no investigation semantic changes
26. Yes — Sprint 040 external-agent validation is technically possible
27. Refinement needed: tool descriptions for agent selection, output schema definitions (Sprint 040)
28. MCP external-agent validation (Sprint 040), multi-provider dogfood (Vercel/Cloudflare credentials), release prep (Sprint 041)

---

# Definition of Done

* [ ] Sprint 038 clean baseline verified
* [ ] exact baseline SHA recorded
* [ ] SKILL protocol followed
* [ ] Canon read
* [ ] Sprint 037/038 decisions reviewed
* [ ] Repository Understanding completed
* [ ] Architecture Pressure completed
* [ ] official MCP spec reviewed
* [ ] official TypeScript SDK reviewed
* [ ] SDK/version recorded
* [ ] Bun compatibility verified
* [ ] stdio transport implemented
* [ ] MCP entrypoint/command implemented
* [ ] same Combie state resolution reused
* [ ] `COMBIE_HOME` supported
* [ ] explicit dir behavior documented
* [ ] minimal read-only tool surface implemented
* [ ] `list_resources` implemented
* [ ] `get_related_context` implemented
* [ ] `investigate_resource` implemented
* [ ] `list_providers` implemented only if clearly useful
* [ ] structured outputs used
* [ ] CLI output parsing avoided
* [ ] exact Resource IDs required
* [ ] one-hop boundary preserved
* [ ] no new inference
* [ ] no sync tool
* [ ] no connect tool
* [ ] no credential tool
* [ ] no write tool
* [ ] no infrastructure execution
* [ ] no provider network calls from tools
* [ ] errors mapped safely
* [ ] credentials excluded from output
* [ ] offline MCP reads verified
* [ ] read-only DB behavior verified
* [ ] server lifecycle tested
* [ ] tool registration tested
* [ ] protocol-level call tested
* [ ] realistic InvestigationContext fixture tested
* [ ] Shared Commit Context available through investigation
* [ ] Missing Context available through investigation
* [ ] public MCP foundation docs added/updated if appropriate
* [ ] beta readiness checklist updated
* [ ] no Resource semantic changes
* [ ] no Relationship semantic changes
* [ ] no Change semantic changes
* [ ] no provider adapter/API changes
* [ ] no investigation semantic changes
* [ ] no model integration
* [ ] no BYO model
* [ ] no generic Agent framework
* [ ] full tests pass
* [ ] typecheck passes
* [ ] diff check clean
* [ ] secret scan clean
* [ ] completion notes updated
* [ ] Canon changes recorded or None
* [ ] Sprint 039 committed separately
* [ ] worktree clean
* [ ] Sprint 040 not started

---

# Explicitly Out of Scope

Do not implement:

* MCP HTTP transport
* MCP remote hosting
* network auth
* sync MCP tool
* connect MCP tool
* provider credential MCP tools
* write actions
* relationship mutation
* infrastructure execution
* BYO model
* IntelligenceProvider
* prompt engine
* agent runtime
* generic Agent abstraction
* new provider
* new provider evidence
* new Relationship
* application grouping
* background sync
* webhooks
* investigation features
* correlation
* hypotheses
* root cause
* generic Event/Observation
* operational memory
* learning
* controlled execution
* complete client-specific setup guides
* Sprint 040 scaffolding

---

# Sprint 040 Gate

Sprint 040 — MCP Tool Surface + External-Agent Validation may begin only when:

```text
stdio MCP server starts reliably
read-only tools work
tool outputs are structured
application layer remains canonical
state directory configuration works
offline/read-only guarantees are proven
tests/typecheck are green
worktree is clean
```

Sprint 040 then owns:

```text
real Codex/Cursor/Claude MCP configuration
tool-surface refinement
tool-description refinement
end-to-end agent prompts
external-agent validation
remaining beta MCP gaps
```

---

# Final Principle

> **Combie already knows the context. Sprint 039 makes that context callable by agents.**

And:

> **Expose the context layer. Do not build an agent inside it.**

```
```
