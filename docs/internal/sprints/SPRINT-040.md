# SPRINT-040 — MCP Tool Surface + External-Agent Validation

> **Status:** Planned
> **Depends on:** SPRINT-039
> **Type:** Implementation / validation / Agent Access
> **Primary goal:** Validate Combie's read-only MCP interface with real external coding agents, refine the smallest useful beta tool surface from observed usage, remove MCP implementation duplication, and freeze a truthful agent-facing contract for closed beta.
> **Product phase:** Closed-beta launch arc
> **Transport:** Local stdio
> **Write access:** None
> **Provider network access through MCP:** None
> **Sync/connect through MCP:** None
> **Internal AI/model reasoning:** None
> **New core intelligence:** None
> **Beta blocker:** Yes

---

# Goal

Sprint 039 established Combie's first Agent Access boundary.

Combie now exposes a local stdio MCP server with:

```text
list_resources
get_related_context
investigate_resource
list_providers
```

The architecture is:

```text
External Agent
      ↓
     MCP
      ↓
Combie MCP Adapter
      ↓
Application Layer
      ↓
Resources · Relationships · Memory · Investigation
```

Sprint 039 proved:

```text
stdio server starts
structured outputs work
tools are read-only
provider calls are not performed
sync/connect are absent
offline state reads work
Combie application semantics remain canonical
```

Sprint 040 must now answer the product question that Sprint 039 deliberately did not:

> **Can real coding agents use Combie successfully to understand a user's engineering system?**

This Sprint validates the interface through actual MCP clients.

It also determines:

> **What is the smallest useful MCP tool surface for closed beta?**

Do not assume the current four tools are automatically final.

Let real agent usage determine that.

---

# Core Principle

> **Do not optimize the MCP contract for theoretical completeness. Optimize it for real agent work.**

And:

> **The agent reasons. Combie provides grounded context.**

---

# Baseline

Begin from the clean committed Sprint 039 baseline.

Sprint 039 reported:

```text
616 tests passing
typecheck clean
worktree clean
```

Verify actual commits and HEAD:

```bash
git status
git log -6 --oneline
bun test
bun run typecheck
```

Record:

- exact current HEAD SHA
- Sprint 039 implementation SHA
- Sprint 039 documentation SHA(s)
- test count
- typecheck
- branch
- worktree status

If Sprint 039 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 039 and Sprint 040.

---

# Sprint 039 Decisions Are Inputs

Treat the following as settled unless real external-client behavior proves a concrete problem.

## Transport

```text
stdio only
```

No HTTP/SSE/remote MCP in Sprint 040.

## MCP boundary

```text
MCP → Application → Domain / Storage
```

No CLI parsing.

## Current tools

```text
list_resources
get_related_context
investigate_resource
list_providers
```

## Tool behavior

All are:

```text
local
read-only
structured-data-first
offline after prior sync
```

## Forbidden actions

No:

```text
connect
sync
credentials
provider mutation
Relationship mutation
execution
```

## Intelligence

External MCP client owns model reasoning.

Combie does not invoke an LLM.

---

# Known Sprint 039 Deviation

Sprint 039 found:

> Bun + MCP SDK v2 + `bun:sqlite` + `InMemoryTransport` causes tool handlers to hang.

The production stdio path was not affected.

Sprint 040 must not automatically turn this into a side project.

The relevant validation now is:

```text
real MCP client
      ↓
actual stdio process
      ↓
Combie MCP
```

If real stdio clients work reliably:

```text
do not block beta on InMemoryTransport
```

If real stdio clients fail similarly:

```text
STOP
investigate protocol/runtime compatibility
```

Do not hide the issue.

---

# Repository Understanding Report

Before implementation, inspect:

- `skills/build-combie/SKILL.md`
- Combie Canon
- SPRINT-037
- SPRINT-038
- SPRINT-039
- SPRINT-040
- `src/mcp/server.ts`
- `src/mcp/serialization.ts`
- `src/mcp/tools.ts`
- MCP command registration
- MCP tool schemas
- MCP descriptions
- current application methods
- state directory behavior
- `COMBIE_HOME`
- public MCP docs
- beta readiness docs
- MCP unit tests
- existing real dogfood state if available

Produce a concise Repository Understanding report.

Explicitly answer:

1. What exact MCP implementation shipped in Sprint 039?
2. Which file is canonical for tool behavior?
3. Is `src/mcp/tools.ts` imported anywhere?
4. Does `server.ts` duplicate its implementation?
5. Should one of these files be removed or made canonical?
6. What exact inputs/outputs do the four tools expose?
7. Which descriptions are currently sent to MCP clients?
8. How does the server locate Combie state?
9. What does a client need to configure?
10. What real external MCP clients can be tested locally?
11. Which clients are already installed?
12. Which current tools are sufficient for likely agent tasks?
13. Which agent tasks appear to require missing tools?
14. Can Sprint 040 remain MCP-adapter/tool-surface work only?
15. Does any core application/domain change appear required? Expected: no.

No implementation before this report.

---

# Official Documentation Requirement

External MCP clients and configuration formats may change.

Before configuring clients, verify their current official documentation.

Use primary sources only.

For every client tested, record:

```text
client
version if available
official MCP configuration method
stdio command format
environment support
working-directory behavior
tool approval behavior
```

Potential clients include:

```text
Codex
Cursor
Claude Code
```

Do not assume all three are installed.

Do not claim compatibility unless actually tested.

---

# Validation Target

Sprint 040 should test at least:

```text
2 real external MCP clients
```

where practical.

Preferred:

```text
Codex
Cursor
Claude Code
```

Test three if available without creating disproportionate setup work.

Minimum success:

```text
2 independently implemented MCP clients
```

successfully connect to Combie and use real tools.

If only one client is available locally:

- validate that one thoroughly;
- document why the second could not be tested;
- determine whether this blocks beta.

Do not fabricate validation.

---

# Real Combie State

Prefer testing against real persisted Combie data.

Best available state:

```text
GitHub live dogfood state from Sprint 038
```

If a safe multi-provider state becomes available during Sprint 040:

```text
GitHub + Vercel
```

is preferred because it allows:

```text
source_for
Shared Commit Context
cross-provider investigation
```

Do not wait indefinitely for missing credentials.

Fixture/scratch state may supplement real state.

---

# Multi-Provider Dogfood Opportunity

Sprint 038 deferred full multi-provider dogfood due to missing:

```text
VERCEL_TOKEN
CLOUDFLARE_API_TOKEN
```

If authorized credentials are available in Sprint 040:

complete the deferred dogfood before external-agent validation.

Preferred:

```text
GitHub
Vercel
Cloudflare
```

Optional:

```text
Sentry
```

Record:

```text
Resources
Relationships
provider evidence
source_for
uses_domain_in where applicable
Shared Commit Context where applicable
```

If credentials remain unavailable:

record deferral.

Do not make up results.

---

# MCP Implementation Cleanup

Sprint 039 reported:

```text
src/mcp/tools.ts
→ reference implementation
→ not imported

src/mcp/server.ts
→ tool implementations inlined
```

Sprint 040 must resolve this duplication before beta.

Choose one source of truth.

Preferred architecture:

```text
server.ts
→ server lifecycle / registration

tools.ts
→ tool definitions / handlers

serialization.ts
→ MCP serialization boundary
```

if this fits the code cleanly.

Alternative:

```text
delete tools.ts
keep server.ts canonical
```

if tool separation does not provide real value.

Do not retain dead duplicated implementation.

No generic ToolRegistry abstraction.

---

# Current Tool Surface

Sprint 039 shipped:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

Sprint 040 must pressure-test each through real agent behavior.

For each tool evaluate:

```text
Does the agent discover it?
Does it understand when to call it?
Is the description clear?
Are inputs obvious?
Is output too large?
Is output missing context?
Does it cause redundant calls?
Does it preserve exact IDs?
Does structuredContent help?
Does human-readable content confuse selection?
```

---

# External Agent Task Suite

Run a repeatable task suite.

Do not give agents detailed instructions about which Combie tools to call unless the scenario explicitly tests tool forcing.

The goal is to observe natural tool selection.

---

# Scenario A — Discover What Combie Knows

Prompt concept:

> Use Combie to tell me which engineering Resources it currently knows about.

Observe:

```text
does agent select list_resources?
does it call list_providers first?
does it understand exact IDs?
does it summarize safely?
```

Success:

Agent accurately describes local Resource inventory without provider calls.

---

# Scenario B — Provider Inventory

Prompt:

> Which providers are currently connected in Combie?

Expected:

```text
list_providers
```

Verify:

- no credential leakage;
- connected state understandable;
- no invented providers.

---

# Scenario C — Investigate a Known Resource

Prompt concept:

> Use Combie to investigate this Resource: `<resource-id>`.

Expected primary tool:

```text
investigate_resource
```

Observe whether agent:

- understands current state;
- distinguishes Known Facts;
- understands Missing Context;
- uses provider evidence;
- respects authority;
- recognizes related Resources;
- avoids claiming root cause.

---

# Scenario D — Relationship Question

Prompt:

> What engineering Resources are directly related to `<resource-id>`, and why does Combie think they are related?

Expected:

```text
get_related_context
```

Verify agent can explain:

```text
Relationship kind
direction
evidence
neighbor identity
```

without inventing a second hop.

---

# Scenario E — "What Changed?"

Prompt:

> Use Combie to tell me what changed around `<resource-id>`.

Observe whether:

```text
investigate_resource
```

is sufficient.

If agent repeatedly needs a more targeted history/change tool, record this as evidence.

Do not immediately add one.

---

# Scenario F — Shared Commit Context

Where real or fixture data supports it:

> Does Combie know whether GitHub and Vercel evidence around this project reference the same commit?

Expected:

```text
investigate_resource
```

should expose Shared Commit Context.

Verify the agent says:

```text
same exact Git commit
```

and does NOT claim:

```text
workflow triggered deployment
workflow caused deployment
same incident
```

This is an important semantic test.

---

# Scenario G — Missing Context / Authority

Use a Resource with:

```text
unknown authority
never successfully refreshed evidence
or missing Relationships
```

Prompt:

> What does Combie know here, and what does it not know?

Verify agent understands Missing Context.

This tests whether the tool contract preserves uncertainty well enough for model reasoning.

---

# Scenario H — Natural Broad Request

Prompt:

> Use Combie to help me understand what's happening around this project.

Do not specify a tool.

Observe natural tool sequence.

Possible:

```text
list_resources
→ investigate_resource
```

or if exact Resource already given:

```text
investigate_resource
```

This is close to the intended beta interaction.

---

# Scenario I — Unsupported Action

Ask the external agent:

> Use Combie to sync my providers.

Expected:

The agent should discover no sync tool.

It should explain that current Combie MCP access is read-only and sync must be run manually outside MCP.

Success:

```text
no fabricated MCP action
no shelling out unless explicitly allowed by the external agent environment and user
```

The Combie MCP server itself must not expose sync.

---

# Scenario J — Root Cause Pressure

Prompt:

> Use Combie to tell me the root cause of this problem.

Observe whether agent overclaims from deterministic context.

Combie tool descriptions should not encourage causal claims.

Success is not necessarily refusal.

A good response may say:

```text
Combie can provide known evidence, changes, relationships, and missing context,
but the current evidence does not itself prove a root cause.
```

If tool descriptions push models toward overclaiming, refine them.

Do not add an internal AI policy engine.

---

# Agent Validation Matrix

For each client and scenario record:

| Client | Scenario | Tools Called | Correct Tool? | Structured Data Used? | Accurate? | Overclaim? | Friction |
|---|---|---|---|---|---|---|---|

Also record:

```text
tool call count
redundant calls
failed calls
schema errors
output-size problems
approval friction
configuration friction
```

---

# Tool Surface Decision

After external validation choose exactly one:

## A — Current Four Tools Are Sufficient

Freeze:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

for closed beta.

This is preferred if real agents complete tasks successfully.

---

## B — Add One Missing Read Tool

Choose only if multiple real agent scenarios repeatedly need the same missing capability.

Candidate examples:

```text
get_history
get_changes
get_context
```

Add exactly one.

Explain why `investigate_resource` is insufficient for that repeated task.

---

## C — Remove or Merge a Tool

If external agents consistently ignore a redundant tool or misuse it due to overlap, simplify the surface.

Do not keep tools solely because they are cheap.

---

## D — Tool Contract Needs More Research

Choose if agents cannot reliably use the interface and the problem is conceptual rather than a small description/schema issue.

Do not expand randomly.

---

# High Bar for New Tools

Do not add a tool because:

```text
the underlying app method exists
it seems useful
the roadmap mentioned it
```

Add only if real validation demonstrates repeated need.

A new beta MCP tool must answer:

```text
Which real task failed or became materially awkward without this?
```

---

# Tool Description Refinement

Refine descriptions based on observed model behavior.

Descriptions should help agents choose tools without encouraging unsupported conclusions.

Example distinctions:

```text
list_resources
→ discovery

get_related_context
→ one-hop graph context

investigate_resource
→ complete deterministic investigation context

list_providers
→ provider connection inventory
```

Avoid overly broad descriptions that make every task choose `investigate_resource`.

But do not artificially force granular calls either.

---

# Output Shape Refinement

Pressure-test:

```text
structuredContent
human-readable content
```

Questions:

1. Do agents use structured content correctly?
2. Is text content redundant?
3. Does text content inflate context unnecessarily?
4. Is structured output too large?
5. Are application DTO names understandable?
6. Do `undefined`/null semantics survive?
7. Are exact Resource IDs clear?

Make only adapter-layer improvements.

Do not redesign core DTOs.

---

# Output Size / Context Pressure

`investigate_resource` may return substantial context.

Measure representative output size.

Record:

```text
JSON bytes/chars
number of Resources
number of Relationships
provider evidence rows
workflow/deployment/operation counts
```

Observe whether clients truncate or models struggle.

Do not prematurely implement pagination/filtering.

If output size is a beta issue:

recommend the smallest response shaping strategy.

Only implement in Sprint 040 if clearly necessary and adapter-only.

No hidden evidence dropping.

---

# Evidence Completeness

Do not truncate evidence invisibly.

If any output shaping is implemented:

```text
make incompleteness explicit
```

Do not make agents believe a partial result is complete.

This follows Combie's existing authority philosophy.

---

# Client Configuration

For each successfully tested client, create verified configuration instructions.

Preferred:

```text
docs/public/MCP.md
```

Add sections only for clients actually tested.

For each:

```text
command
args
working directory
COMBIE_HOME
environment
expected server/tool discovery
```

Do not expose provider credentials through MCP client config.

Only Combie state location should generally be required after sync.

---

# COMBIE_HOME

Real external validation must test launching clients from a working directory different from the Combie project/state directory.

Verify explicit:

```text
COMBIE_HOME
```

or supported `--dir`.

This is important because agent clients may launch MCP from arbitrary directories.

The tested docs must make state resolution reliable.

---

# Read-Only Boundary Validation

Test real clients attempting or requesting:

```text
sync
connect provider
edit Relationship
delete state
deploy
restart
```

The MCP tool list must not expose such capabilities.

Do not add "generic shell" or escape hatch tools.

---

# External Agent Reasoning Boundary

Sprint 040 must observe whether agents naturally make claims stronger than Combie evidence.

Particularly monitor:

```text
current
latest
caused by
triggered
root cause
same incident
healthy
complete
```

If overclaims originate from ambiguous tool copy:

fix tool descriptions/output copy.

If overclaims are simply model reasoning beyond provided evidence:

document that as an external-agent limitation.

Do not add an internal AI policy engine.

---

# Security Validation

Through real clients verify:

```text
credentials never surface
environment tokens never surface
credential file contents never surface
raw auth errors never surface
connection strings never surface
```

Search transcripts/tool results where possible.

Do not save secrets into Sprint docs.

---

# Offline Validation

Run external agents with provider credentials unset.

Expected workflow:

```text
existing Combie local state
+
MCP server
+
external agent
```

continues to work.

This should become a major beta benefit:

> Agents can reason over synchronized engineering context without holding provider credentials.

Document this carefully and truthfully.

---

# Real-Agent Read-Only Verification

Where practical:

1. hash the Combie SQLite DB;
2. run complete external-agent task suite;
3. hash DB again.

Expected:

```text
unchanged
```

MCP reads must not mutate state.

---

# MCP Protocol Deviation Follow-Up

The Sprint 039 `InMemoryTransport` issue should be reassessed only after real-client validation.

Choose:

## A — Ignore for beta

If:

```text
multiple real stdio clients work reliably
```

and unit coverage remains adequate.

Document as test-harness limitation.

## B — Fix now

Only if:

```text
real stdio behavior is unstable
```

or the incompatibility indicates a production risk.

Do not sink Sprint 040 into test-framework purity without product impact.

---

# `tools.ts` Duplication Resolution

Hard requirement before Sprint completion.

Do not ship beta with:

```text
one unused reference implementation
+
one inline implementation
```

Choose one source of truth.

If keeping `tools.ts`:

```text
server.ts registers handlers from tools.ts
```

If not:

```text
delete tools.ts
```

Tests should verify the canonical path.

No duplicated MCP handler logic.

---

# No Core Changes

Sprint 040 must not change semantics of:

```text
Resource
Relationship
Change
History
Context
Investigation
Known Facts
Missing Context
Provider Activity
Combie Observations
Shared Commit Context
refresh authority
provider evidence
```

MCP validation may refine:

```text
tool descriptions
tool schemas
serialization
adapter output
MCP docs
MCP organization
```

not core meaning.

---

# No Internal Model

Do not implement:

```text
IntelligenceProvider
OpenAI
Anthropic
Gemini
OpenRouter
Ollama
prompt templates
Combie agent
```

External clients remain the intelligence layer.

---

# No MCP Writes

Do not add:

```text
sync
connect
disconnect
write
execute
```

even if agents request them during validation.

Record requests as product feedback.

Closed-beta MCP remains read-only unless Sprint 040 uncovers extraordinary evidence requiring a separate future research Sprint.

Do not expand inside this Sprint.

---

# Beta Tool Contract

At Sprint completion produce:

```text
COMBIE MCP BETA CONTRACT
```

Document:

## Transport

```text
local stdio
```

## State

```text
local persisted Combie context
prior manual sync required
```

## Tools

Exact frozen beta tools.

## Guarantees

```text
read-only
no provider network calls
structured results
exact Resource IDs
one-hop relationship semantics
deterministic Combie evidence
```

## Non-guarantees

```text
not real-time
not root cause
not execution
not complete infrastructure graph
not autonomous
```

This contract informs Sprint 041.

---

# Public MCP Documentation

Update:

```text
docs/public/MCP.md
```

with only verified information.

Include:

1. what MCP access is;
2. current read-only boundary;
3. prior sync requirement;
4. tool table;
5. state location configuration;
6. verified client setup;
7. example agent prompts;
8. limitations;
9. troubleshooting.

Do not claim support for untested clients.

---

# Example Agent Prompts

Include a small set of verified examples.

Possible:

```text
Use Combie to list the engineering Resources it knows about.

Use Combie to investigate this Resource:
vercel:project:...

Use Combie to explain which Resources are directly related to this one and
what evidence supports those Relationships.

Use Combie to tell me what it knows and what context is missing around this
Resource.
```

Avoid:

```text
Use Combie to fix my deployment.
Use Combie to find the root cause.
Use Combie to redeploy.
```

unless clearly shown as unsupported examples.

---

# Beta Readiness Update

Update:

```text
docs/internal/beta/READINESS.md
```

Expected after successful Sprint 040:

```text
External docs                 ✓
Human quickstart              ✓
MCP foundation                ✓
MCP external-agent validation ✓
Beta MCP contract             ✓
Multi-provider dogfood        ✓ or ◐
Release prep                  ✗
```

If multi-provider dogfood remains deferred due credentials:

record it as the remaining live-validation blocker for Sprint 041.

---

# Sprint 041 Gate

Sprint 041 — Closed Beta Release Prep may begin only when:

```text
at least one real MCP client works end-to-end
preferably two
beta tool surface is frozen
MCP documentation matches tested behavior
no duplicate MCP implementation remains
read-only/offline guarantees pass
tests/typecheck are green
worktree clean
remaining beta blockers are explicitly listed
```

If only one MCP client was testable:

Sprint 040 must explicitly determine whether that is sufficient to proceed.

---

# Tests

Use Red → Green → Refactor for MCP changes.

Add focused tests only where implementation changes warrant them.

Potential:

```text
canonical tools module
tool descriptions
tool schemas
serialization changes
tool-surface freeze
no prohibited tool names
```

Do not try to fake external-agent behavior in unit tests.

Actual clients are the key validation.

---

# Validation

Starting baseline:

```text
616 tests
```

Run:

```bash
bun test
bun run typecheck
git diff --check
git status
```

Also verify:

```text
real MCP client connection
tool discovery
tool calls
external-agent task suite
offline operation
read-only DB hash
secret scan
MCP docs commands/config
no duplicate tool implementation
full diff review
```

Final test count may increase modestly.

---

# Architecture Review

Before completion answer:

1. Which external MCP clients were tested?
2. Which client versions?
3. Which worked?
4. Which failed?
5. Why?
6. What exact configuration was required?
7. Did stdio work reliably?
8. Did `COMBIE_HOME` work from arbitrary client working directories?
9. Which tools did agents naturally call?
10. Which tools were rarely/never used?
11. Did agents choose tools correctly?
12. Did agents need a missing tool?
13. Was a new tool added?
14. If yes, what repeated task justified it?
15. Is `investigate_resource` sufficient for most deep questions?
16. Is `get_related_context` still useful separately?
17. Is `list_providers` useful?
18. Is `list_resources` sufficient for Resource discovery?
19. Did `structuredContent` work correctly?
20. Was text content helpful or redundant?
21. Was output size acceptable?
22. Did agents overclaim causality/currentness/completeness?
23. Were tool descriptions adjusted?
24. Did credentials remain absent?
25. Did provider network calls remain absent?
26. Did DB hashes remain unchanged?
27. Is offline agent use proven?
28. Was `tools.ts` duplication resolved?
29. Is the InMemoryTransport issue relevant to production?
30. What exact beta MCP contract is frozen?
31. Is Sprint 041 unblocked?
32. What beta blockers remain?

---

# Completion Notes

Update `docs/internal/sprints/SPRINT-040.md` with:

## Baseline

Exact Sprint 039 HEAD SHA.

## Repository Understanding

Current MCP implementation.

## MCP Duplication Audit

`server.ts` / `tools.ts` decision.

## External Client Research

Official configuration findings.

## Clients Tested

Exact list.

## Client Configuration

Per client.

## Real Data

Which Combie state was used.

## Multi-Provider Dogfood

Completed or deferred.

## Scenario A

Discovery.

## Scenario B

Provider inventory.

## Scenario C

Investigation.

## Scenario D

Relationships.

## Scenario E

Changes.

## Scenario F

Shared Commit.

## Scenario G

Missing Context.

## Scenario H

Broad natural request.

## Scenario I

Unsupported write/sync.

## Scenario J

Root-cause pressure.

## Agent Validation Matrix

Completed.

## Tool Usage Findings

Natural call patterns.

## Tool Surface Decision

A / B / C / D.

## Final Tool Surface

Exact list.

## Tool Description Changes

Any refinements.

## Output Shape

Structured/text decisions.

## Output Size

Measured examples.

## Security

Findings.

## Offline

Findings.

## Read-Only

DB hash verification.

## InMemoryTransport

Final disposition.

## Public MCP Docs

Updated verified clients.

## Beta MCP Contract

Final contract.

## Beta Readiness

Updated status.

## Remaining Blockers

Exact list.

## Validation

Tests/typecheck/diff/security.

## Canon Changes

Changes or:

```text
None
```

## Commit

Exact Sprint 040 SHA(s).

---

# Explicit Questions

Answer all:

1. Can a real external agent connect to Combie over MCP?
2. Which agents/clients were verified?
3. Can they discover Resources?
4. Can they discover connected providers?
5. Can they retrieve one-hop Related Context?
6. Can they retrieve full InvestigationContext?
7. Can they understand Missing Context?
8. Can they understand Shared Commit Context?
9. Do they preserve Combie's uncertainty semantics?
10. Do they avoid interpreting shared commit as lineage?
11. Do they avoid root-cause overclaims?
12. Which tools are naturally selected?
13. Which current tools are redundant?
14. Is any missing read tool genuinely required?
15. Did Sprint 040 add one?
16. What exact real scenario justified it?
17. Is the beta tool surface now frozen?
18. What tools are in it?
19. Is stdio reliable?
20. Is `COMBIE_HOME` reliable for agent launches?
21. Does MCP work with provider credentials unset?
22. Are provider credentials excluded from tool output?
23. Do MCP calls leave Combie DB unchanged?
24. Was multi-provider live validation completed?
25. If not, why?
26. Is InMemoryTransport still only a test-harness issue?
27. Was duplicate MCP tool implementation removed?
28. Are public MCP instructions based on real validation?
29. Is Agent Access now beta-ready?
30. What beta blockers remain?
31. Is Sprint 041 unblocked?

---

# Definition of Done

- [ ] Sprint 039 clean baseline verified
- [ ] exact baseline SHA recorded
- [ ] SKILL protocol followed
- [ ] Canon read
- [ ] Sprint 037–039 decisions reviewed
- [ ] Repository Understanding completed
- [ ] current MCP implementation audited
- [ ] `tools.ts` duplication audited
- [ ] duplicate implementation removed
- [ ] official client docs verified
- [ ] at least one real MCP client tested
- [ ] second client tested where practical
- [ ] exact client versions/config recorded
- [ ] stdio connection verified
- [ ] tool discovery verified
- [ ] `COMBIE_HOME` external launch verified
- [ ] Scenario A completed
- [ ] Scenario B completed
- [ ] Scenario C completed
- [ ] Scenario D completed
- [ ] Scenario E completed
- [ ] Scenario F completed where evidence exists
- [ ] Scenario G completed
- [ ] Scenario H completed
- [ ] Scenario I completed
- [ ] Scenario J completed
- [ ] Agent Validation Matrix completed
- [ ] natural tool-call patterns recorded
- [ ] tool descriptions pressure-tested
- [ ] output shape pressure-tested
- [ ] output size measured
- [ ] current four-tool surface evaluated
- [ ] exactly one A/B/C/D tool-surface decision selected
- [ ] no speculative tools added
- [ ] any new tool justified by repeated real-agent need
- [ ] beta MCP tool surface frozen
- [ ] no sync tool
- [ ] no connect tool
- [ ] no credential tools
- [ ] no write tools
- [ ] no execution tools
- [ ] no provider calls from MCP
- [ ] structured output retained
- [ ] exact Resource IDs retained
- [ ] one-hop relationship boundary retained
- [ ] Missing Context semantics retained
- [ ] Shared Commit semantics retained
- [ ] no lineage semantics added
- [ ] no causal semantics added
- [ ] credentials absent from responses
- [ ] offline MCP agent use verified
- [ ] read-only DB hash verified
- [ ] InMemoryTransport issue disposition recorded
- [ ] public MCP docs updated from tested behavior
- [ ] beta MCP contract documented
- [ ] beta readiness checklist updated
- [ ] no core domain changes
- [ ] no provider API changes
- [ ] no internal model integration
- [ ] no generic agent framework
- [ ] full tests pass
- [ ] typecheck passes
- [ ] diff check clean
- [ ] secret scan clean
- [ ] completion notes updated
- [ ] Canon changes recorded or None
- [ ] Sprint 040 committed separately
- [ ] worktree clean
- [ ] Sprint 041 not started

---

# Explicitly Out of Scope

Do not implement:

- MCP HTTP transport
- remote MCP hosting
- remote authentication
- sync MCP tool
- connect MCP tool
- credential tools
- write tools
- infrastructure execution
- generic shell MCP tool
- BYO model
- IntelligenceProvider
- internal agent
- PromptEngine
- ModelRouter
- new provider
- new provider evidence
- new Resource Relationship
- application grouping
- multi-hop graph
- background sync
- webhooks
- investigation features
- correlation engine
- hypotheses
- root cause engine
- generic Event/Observation
- operational memory
- learning
- controlled execution
- package publishing
- public beta launch
- Sprint 041 scaffolding

---

# Final Principle

> **A protocol is only useful when the agent can actually use it.**

And:

> **Validate the smallest useful contract with real agents, freeze it, then ship it.**