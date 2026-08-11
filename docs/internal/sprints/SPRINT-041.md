# SPRINT-041 — Closed Beta Release Candidate

> **Status:** Complete — CONDITIONAL GO; Sprint 042 blocked by recorded release conditions
> **Depends on:** SPRINT-040
> **Type:** Release readiness / validation / product hardening
> **Primary goal:** Validate Combie's complete closed-beta experience from clean installation through provider sync, investigation, and external-agent access; close only true release blockers; freeze the beta experience; and make an evidence-backed GO / CONDITIONAL GO / NO-GO decision for inviting external users.
> **Product phase:** Closed-beta release candidate
> **Feature development:** Frozen unless required to fix a beta blocker
> **MCP contract:** Frozen
> **Execution:** Out of scope
> **Internal AI/model reasoning:** Out of scope
> **Beta blocker:** Yes — final gate before invitations

---

# Goal

Sprint 037 established the closed-beta launch sequence:

```text
038 — Beta readiness
039 — MCP foundation
040 — MCP external-agent validation
041 — Closed beta release prep
042 — Invite closed-beta users
```

Sprints 038–040 are now complete.

Combie has crossed an important product boundary.

It is no longer only:

```text
Connect
→ Discover Resources
→ Build Relationships
→ Remember Changes
→ Investigate
```

It is now:

```text
Engineering Stack
      ↓
    Combie
      ↓
Connections
Resources
Relationships
Changes
Provider Evidence
Investigation Context
      ↓
Human CLI
   +
External AI Agents via MCP
```

Sprint 041 must NOT expand this architecture.

The question is now:

> **Can somebody who did not build Combie successfully install it, connect their engineering context, understand what Combie knows, and use that context from their coding agent?**

And:

> **Are we ready to intentionally invite real external users into this experience?**

Sprint 041 produces the answer.

---

# Core Principle

> **Stop proving that Combie can do more. Prove that the product we already built can be used.**

And:

> **A closed beta is not a promise of completeness. It is a promise that the product is coherent enough to learn from real users.**

---

# Product Status Entering Sprint 041

Sprint 037 classified Combie as:

```text
LATE ALPHA / CLOSED-BETA CANDIDATE
```

Sprint 038 completed:

```text
public README rewrite
multi-provider quickstart
beta readiness docs
dogfood workflow
CLI UX consistency fixes
real GitHub dogfood
```

Sprint 039 completed:

```text
read-only MCP foundation
stdio transport
4 MCP tools
structuredContent
offline/read-only agent boundary
```

Sprint 040 completed:

```text
external MCP validation
stdio runtime fixes
serialization fixes
canonical MCP tool implementation
MCP beta contract
tool surface freeze
agent-facing documentation
offline/read-only verification
```

Sprint 040 froze the beta MCP surface as:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

No fifth MCP tool was earned.

Agent Access is now considered beta-ready.

Sprint 041 is therefore NOT another Agent Access implementation Sprint.

It is the final product/release validation gate.

---

# Baseline

Begin from the clean committed Sprint 040 baseline.

Sprint 040 reported:

```text
Baseline: 1366849
Implementation: 1c44588
Docs completion: cf9cf87
Tests: 616 pass
Typecheck: clean
Worktree: clean
```

Verify actual repository state:

```bash
git status
git log -8 --oneline
bun test
bun run typecheck
```

Record:

- exact current HEAD SHA
- Sprint 040 implementation SHA
- Sprint 040 completion/docs SHA
- branch
- test count
- typecheck result
- worktree state

If Sprint 040 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 040 and Sprint 041.

---

# Sprint Mode

Sprint 041 is:

```text
RELEASE CANDIDATE
```

not:

```text
FEATURE DEVELOPMENT
```

Every proposed code change must answer:

> **What closed-beta failure does this fix?**

If that question cannot be answered concretely:

do not implement the change.

---

# Hard Product Freeze

Do NOT add:

```text
new providers
new MCP tools
new Resource kinds
new Relationship kinds
new evidence families
new investigation projections
new authority primitives
new graph abstractions
new AI/model integration
new execution capabilities
```

Sprint 041 may change code only when validation discovers a genuine closed-beta blocker.

Examples of valid changes:

```text
broken installation
incorrect command
bad path resolution
crash
secret leak
MCP startup failure
misleading onboarding copy
provider connection flow bug
broken clean-state behavior
incorrect package/bin configuration
beta-blocking CLI UX inconsistency
```

Examples of invalid changes:

```text
"it would be cool if..."
"agents might eventually need..."
"we already have the data..."
"this would make investigate richer..."
"the roadmap mentions this later..."
```

---

# Repository Understanding

Before making any changes, inspect:

- `skills/build-combie/SKILL.md`
- Combie Canon
- ROADMAP
- README
- `docs/public/QUICKSTART.md`
- `docs/public/MCP.md`
- `docs/internal/beta/DOGFOOD.md`
- `docs/internal/beta/READINESS.md`
- SPRINT-037
- SPRINT-038
- SPRINT-039
- SPRINT-040
- CLI entrypoint
- package metadata
- bin configuration
- provider connect flows
- provider sync flow
- MCP startup
- `COMBIE_HOME`
- credential storage
- initialization flow
- error handling
- existing release/distribution configuration
- current test scripts
- current repository license/contribution/support docs if present

Produce a concise Repository Understanding report.

Explicitly answer:

1. What is the exact user journey today?
2. How does a brand-new user install/run Combie?
3. Does that installation path actually work outside the repository?
4. What initialization is required?
5. How are credentials stored?
6. Which providers are supported?
7. Which provider connection flows have been live-tested?
8. Which providers have only fixture/test coverage?
9. How does a user sync?
10. How does a user discover Resources?
11. How does a user investigate?
12. How does an external agent access Combie?
13. What must happen before MCP can return useful context?
14. Is the MCP beta contract still exactly four tools?
15. What public documentation exists?
16. What release/distribution mechanism exists today?
17. What would prevent a user unfamiliar with the repo from getting started?
18. What remaining items in READINESS.md are true blockers?
19. What items are merely nice-to-have?
20. Can Sprint 041 remain primarily validation/docs/release work?

No implementation before this report.

---

# Beta Experience Under Test

The intended closed-beta journey is:

```text
1. Obtain Combie
2. Initialize local Combie state
3. Connect one or more providers
4. Sync
5. Inspect providers/resources
6. Investigate a Resource
7. Configure Combie MCP in coding agent
8. Ask agent to use Combie
9. Agent retrieves deterministic local context
10. User continues engineering investigation with grounded context
```

Sprint 041 must validate this journey end-to-end.

Not individual pieces.

The product is the journey.

---

# Fresh-Environment Test

Create a clean isolated environment.

Do NOT rely on:

```text
existing developer .combie state
existing repo cwd assumptions
shell aliases
unrecorded environment configuration
previous credentials
developer knowledge
```

Use a scratch location.

For example:

```text
/tmp/combie-beta-rc
```

or equivalent.

Use an isolated:

```text
COMBIE_HOME
```

Record every command required.

The test should reveal whether README/Quickstart are sufficient without tribal knowledge.

---

# Installation / Distribution Audit

This is a critical Sprint 041 question.

Determine exactly how an invited beta user obtains Combie.

Possible current realities:

```text
clone repository + bun install
GitHub repository install
bunx
npm package
binary
other
```

Do not assume package publishing exists.

Validate the ACTUAL current path.

Then choose one:

## A — Existing distribution is beta-sufficient

Document it precisely.

## B — Small distribution fix required

Implement only the minimum necessary for closed-beta installation.

## C — Distribution is a release blocker

STOP and define the smallest fix before invitations.

Do not build a sophisticated release pipeline unless required.

---

# Clean Install Validation

From outside the existing development checkout, validate the documented setup path.

Record:

```text
OS
runtime
runtime version
install command
startup command
init command
state directory
first successful CLI output
```

Success means a beta tester can reproduce the process from public docs.

---

# New User Journey — Scenario A

## Install / Start

Follow public documentation exactly.

Do not use undocumented knowledge.

Verify:

```text
command works
help works
version if available
errors are understandable
```

Record friction.

---

# New User Journey — Scenario B

## Initialize

Run:

```text
combie init
```

or actual equivalent.

Verify:

```text
state directory created
database initialized
credential handling explained
repeat init safe/understandable
```

Test from arbitrary cwd.

---

# New User Journey — Scenario C

## Connect First Provider

Preferred real provider:

```text
GitHub
```

because Sprint 038 proved live GitHub dogfood.

Follow docs exactly.

Verify:

```text
token guidance
environment fallback
success message
provider identity
secret safety
```

No undocumented setup.

---

# New User Journey — Scenario D

## First Sync

Run documented sync flow.

Verify:

```text
sync succeeds
Resource count understandable
provider errors isolated
no credential leakage
empty states understandable
```

Record duration where useful.

---

# New User Journey — Scenario E

## Discover Context

Run:

```text
combie providers
combie resources
```

Verify a new user can answer:

```text
What did Combie connect to?
What did Combie discover?
What exact Resource IDs can I investigate?
```

Resource IDs must be easy to copy.

---

# New User Journey — Scenario F

## First Investigation

Choose a real Resource.

Run:

```text
combie investigate <resource-id>
```

Verify:

```text
subject understandable
Known Facts understandable
Missing Context understandable
Changes understandable
Related Context understandable
provider evidence understandable
empty states truthful
```

Do not optimize formatter density unless a genuine usability blocker appears.

Sprint 036 already addressed density.

---

# New User Journey — Scenario G

## Offline Behavior

Unset provider credentials after sync.

Run:

```text
providers
resources
context
related
investigate
MCP
```

where applicable.

Expected:

```text
local reads continue to work
```

This is part of Combie's product value.

Document it clearly.

---

# New User Journey — Scenario H

## Agent Setup

Using verified Sprint 040 MCP documentation, configure at least one real external agent.

Preferred:

```text
Codex
```

Also validate:

```text
Cursor
```

if practical.

The goal is not to redo Sprint 040.

The goal is to prove that a user following public docs can reproduce Agent Access.

---

# New User Journey — Scenario I

## First Agent Request

Use a natural prompt such as:

```text
Use Combie to tell me what engineering Resources it knows about.
```

Then:

```text
Use Combie to investigate <resource-id> and explain what it knows and what context is missing.
```

Success:

```text
agent discovers Combie
tool call succeeds
Combie state is used
no provider credentials required by agent
answer is grounded in Combie context
```

If the client environment blocks interactive calls due approval mechanics, distinguish:

```text
configuration/protocol success
```

from:

```text
full natural agent execution
```

Do not overstate validation.

---

# Multi-Provider Dogfood

This remains the most important deferred live-validation item.

Sprint 038 had:

```text
GitHub live
Vercel deferred
Cloudflare deferred
```

Sprint 040 still listed multi-provider dogfood as a remaining blocker.

If authorized credentials are available, Sprint 041 should complete a real multi-provider dogfood run.

Preferred:

```text
GitHub
Vercel
Cloudflare
```

Optional:

```text
Sentry
Neon
PlanetScale
```

Do not connect providers merely to maximize count.

The useful target is enough real data to validate cross-provider context.

---

# Multi-Provider Scenario

Ideal:

```text
GitHub repository
      ↓ source_for
Vercel project
      ↓ uses_domain_in
Cloudflare zone
```

Validate where actual data supports it:

```text
Resources
Relationships
Related Context
provider evidence
Shared Commit Context
Missing Context
investigate
MCP serialization
```

Do not require every possible Relationship to exist.

Report actual discovered state.

---

# Shared Commit Live Validation

If real GitHub + Vercel evidence contains matching full SHAs:

validate:

```text
SHARED COMMIT CONTEXT
```

through:

```text
CLI
MCP structuredContent
external agent if practical
```

Expected semantic:

> These provider evidence records reference the same exact Git commit within an existing `source_for` relationship.

Forbidden conclusion:

```text
GitHub caused Vercel
workflow triggered deployment
same incident
root cause
```

If no matching real evidence exists:

record that.

Fixtures/tests remain valid.

---

# Claude Code Validation

Sprint 040 did not validate Claude Code.

Sprint 041 should attempt it only if practical.

First verify current official Claude Code MCP configuration documentation.

If installed and configuration is reasonably accessible:

test Combie.

Record:

```text
version
configuration
tool discovery
stdio startup
COMBIE_HOME
one successful read call if possible
```

If not installed or setup would materially distract from release prep:

defer.

Claude Code validation is desirable, not automatically a release blocker.

Do not install unrelated infrastructure merely to check a box.

---

# Codex Validation Precision

Sprint 040 found:

```text
Codex v0.146.0
stdio tool discovery works
exec-mode approval blocked interactive calls
```

Sprint 041 must preserve this distinction.

Do not publicly claim:

```text
fully validated natural Codex agent workflow
```

unless Sprint 041 actually proves it.

Safe claim if unchanged:

```text
Combie MCP is discoverable by Codex over stdio.
```

If interactive use is successfully validated:

update the claim.

---

# Cursor Validation Precision

Sprint 040 validated Cursor primarily through configuration/protocol behavior.

If possible, complete one real user-style Cursor MCP interaction.

If not:

document exact validation level.

Again:

```text
tested configuration
```

is not identical to:

```text
full agent interaction tested
```

Truthful claims matter more than a compatibility logo list.

---

# Provider Connection UX Audit

Do not redesign connection architecture.

Run supported provider help/connect flows and inspect consistency.

Providers:

```text
Cloudflare
GitHub
Vercel
Sentry
Neon
PlanetScale
```

Check:

```text
display names
token flag naming
environment fallback
account/org/project guidance
success output
failure output
secret safety
providers listing
```

Only fix inconsistencies that materially hurt onboarding.

---

# Error Journey

A beta user will make mistakes.

Test:

```text
no init
bad Resource ID
unknown Resource
missing token
invalid token
provider API failure
empty provider
sync with one provider failing
MCP before init
MCP with empty DB
MCP unknown Resource
invalid --dir
```

For each ask:

> Can the user understand what happened and what to do next?

Do not attempt perfect error design.

Fix only blockers/confusing dead ends.

---

# Empty-State Journey

Validate:

```text
0 providers
provider connected but 0 Resources
0 Relationships
0 Changes
0 evidence
0 Shared Commit Context
0 Missing Context where appropriate
```

Empty is not failure.

Combie should communicate absence truthfully.

---

# Credential Safety Audit

Inspect:

```text
credential file permissions
CLI output
errors
MCP output
docs
debug output
git status
test fixtures
```

Verify no secrets appear.

Search for token-like values after live testing.

Do not record real credentials in Sprint notes.

---

# Local Data Safety

Combie is local-first.

Validate:

```text
COMBIE_HOME behavior
database location
credential location
file permissions
re-init behavior
multiple state directories
arbitrary cwd
```

A beta user should understand:

```text
where Combie remembers context
```

without needing internal architecture knowledge.

---

# Documentation Audit

Treat public docs as product UI.

Review:

```text
README.md
docs/public/QUICKSTART.md
docs/public/MCP.md
```

Check every command against current CLI behavior.

Verify:

```text
provider list
Resource kinds
Relationship kinds
investigate description
MCP tool names
MCP limitations
offline behavior
installation
state location
credential guidance
```

No stale roadmap claims.

No future functionality presented as current.

---

# CURRENT / NOT YET Boundary

Public docs should clearly distinguish:

## CURRENT

Examples:

```text
local-first
six provider integrations
Resource inventory
exact deterministic Relationships
Change memory
provider evidence
offline investigate
Shared Commit Context
read-only MCP Agent Access
```

Only include capabilities actually shipped.

## NOT YET

Examples:

```text
background sync
webhooks
alerts
application grouping
multi-hop graph
internal AI
BYO model
hypotheses
root cause engine
operational learning
controlled execution
```

This boundary should make Combie feel focused, not unfinished.

---

# Product Positioning Check

Ensure the product still reads as:

> **Combie is the open engineering context layer.**

The closed-beta experience should demonstrate:

```text
connect engineering tools once
build context across them
remember what Combie has observed
investigate deterministically
give humans and AI agents the same grounded context
```

Do not reposition Combie as:

```text
AI agent
observability platform
deployment platform
workflow engine
generic MCP server
incident-response bot
```

MCP is an access surface.

It is not the product.

---

# README First Impression

Review the first screenful of README.

A new visitor should quickly understand:

```text
what Combie is
why it exists
what it connects
what it can do today
how to try it
```

Do not bury the product under architecture terminology.

Technical depth can follow.

---

# Beta Audience

Define the initial closed-beta user.

Recommended profile:

```text
engineers / product engineers / technical founders
using modern multi-provider stacks
comfortable with CLI tools
using coding agents
willing to provide direct feedback
```

Likely stacks:

```text
GitHub
Vercel
Cloudflare
Sentry
Neon
PlanetScale
```

Not every user must use every provider.

---

# Closed Beta Size

Sprint 037 recommended:

```text
5–15 users
```

Validate that this remains appropriate.

Do not optimize infrastructure for hundreds of users.

This beta is for learning.

---

# Beta Success Criteria

Before invitations, define what we want to learn.

Recommended questions:

1. Can users install Combie without help?
2. Can users successfully connect their stack?
3. Do Resources make sense?
4. Do Relationships feel trustworthy?
5. Does investigate reduce manual context gathering?
6. Do users understand Missing Context?
7. Do users trust retained evidence/authority wording?
8. Do coding agents use Combie effectively?
9. Which MCP tool is most valuable?
10. What questions do users ask that Combie cannot answer?
11. Which missing provider creates the most friction?
12. Does Combie save investigation time?
13. Do users return after the first session?
14. What capability do they expect next?

These are learning goals.

Do not build analytics infrastructure in Sprint 041 to measure all of them.

---

# Beta Feedback Mechanism

Determine the smallest practical feedback channel.

Examples:

```text
GitHub Issues
private Discord/Slack
email
shared feedback form
direct founder conversations
```

Prefer simple.

Document:

```text
where users report bugs
where users request providers/features
where users ask for help
what diagnostic information they should include
```

Do not collect credentials.

Do not build an in-product feedback system.

---

# Bug Report Template

Create or verify a lightweight beta bug template.

Useful fields:

```text
Combie version / commit
OS
runtime version
command
expected
actual
provider involved
sanitized output
whether issue reproduces offline
```

Explicit warning:

```text
Do not include API tokens, credentials, or connection strings.
```

---

# Beta Support Expectations

Closed beta means users may need help.

Define:

```text
support channel
expected response style
known limitations
what diagnostics are safe to request
```

No formal SLA required.

---

# Release Identity

Determine how beta users identify the build they are running.

Preferred:

```text
version
commit SHA
or both
```

If `combie --version` already exists, validate it.

If not, determine whether lack of build identity materially blocks beta debugging.

A tiny version/build identifier may be implemented if clearly necessary.

Do not create a complex release/versioning system.

---

# Versioning

Do not let semantic version debate block beta.

A reasonable beta identity could be:

```text
v0.1.0-beta.1
```

or equivalent.

But use repository conventions if already established.

The important property is:

```text
user can tell us what build they ran
```

not theoretical version purity.

---

# Release Artifact Decision

Choose the exact way Sprint 042 users receive Combie.

Select one:

## A — Repository-based closed beta

Users clone/install from GitHub at a known tag/SHA.

## B — Package-based closed beta

Users install a published package.

## C — Binary-based closed beta

Only if already supported cleanly.

## D — Other existing mechanism

Document it.

Do not implement multiple distribution channels.

Choose one reliable path.

---

# Release Candidate Tag

If repository conventions and authorization permit, prepare a release candidate identity.

Examples:

```text
v0.1.0-beta.1
```

Do not publish publicly unless explicitly authorized.

The Sprint may prepare release instructions without performing an external release.

Follow repository commit/tag authorization rules.

---

# Release Checklist

Create or finalize:

```text
docs/internal/beta/RELEASE.md
```

Suggested sections:

```text
baseline
tests
typecheck
clean install
provider dogfood
investigate
MCP
offline
security
docs
known limitations
release artifact
rollback
beta invite readiness
```

Keep it executable.

---

# Known Limitations

Create a truthful closed-beta limitations list.

Potential examples:

```text
manual sync
no background refresh
MCP read-only
one-hop relationships
limited Relationship kinds
provider evidence varies by provider
not all provider history is retained/available
GitHub workflow runs bounded by retrieval policy
Shared Commit Context requires exact full SHA
no causality/root-cause claims
no internal AI
no controlled execution
```

Verify each against implementation.

Do not apologize for intentional boundaries.

---

# Do Not Hide Incompleteness

Combie's design already distinguishes:

```text
known
empty
unknown
retained
stale
missing
```

Closed-beta docs should preserve that philosophy.

Do not market:

```text
complete infrastructure visibility
real-time state
full event history
root cause
```

unless actually true.

---

# Release Blocker Classification

Every issue found in Sprint 041 must be classified:

## P0 — Blocks beta

Examples:

```text
cannot install
cannot initialize
credentials exposed
sync corrupts state
MCP unusable
docs fundamentally wrong
database mutation from read-only MCP
```

Must fix before GO.

## P1 — Strongly harms beta

Examples:

```text
common onboarding dead end
major provider connection inconsistency
frequent crash
agent setup impossible for intended users
```

Usually fix before GO.

## P2 — Beta feedback candidate

Examples:

```text
minor copy
extra command friction
formatter preference
nice-to-have provider
```

Do not automatically fix.

## P3 — Future roadmap

Examples:

```text
background sync
execution
multi-hop graph
AI reasoning
```

Do not touch.

---

# Scope Discipline

If Sprint 041 discovers an appealing feature request:

record it.

Do not implement it.

The correct response to beta feedback before beta starts is usually:

```text
learn whether users actually encounter it
```

---

# Final Regression Suite

Run full:

```bash
bun test
bun run typecheck
git diff --check
git status
```

Record exact test count.

Starting baseline:

```text
616 tests
```

Also run release-specific checks:

```text
clean environment
fresh init
live provider connect
sync
providers
resources
investigate
offline reads
MCP startup
MCP tool discovery
external client
secret scan
DB integrity/read-only checks
documentation command verification
```

---

# Optional Packaging Smoke Test

If package/distribution configuration exists:

test the actual artifact rather than only source execution.

For example:

```text
pack
install artifact into scratch directory
run Combie
```

Use repository-supported tooling.

Do not invent a packaging system solely for the test.

---

# Performance Sanity

This is not a benchmarking Sprint.

Record only obvious product-impacting behavior:

```text
startup feels broken
sync takes unexpectedly long
investigate output explodes
MCP response hangs
```

Do not optimize milliseconds.

---

# Beta Security Boundary

The beta release must preserve:

```text
local-first state
local credentials
read-only MCP
no provider credentials sent through MCP
no execution
no remote Combie service requirement
```

If any validation contradicts this:

STOP and investigate.

---

# Final Product Walkthrough

At the end of Sprint 041, perform one uninterrupted walkthrough:

```text
fresh environment
↓
install
↓
init
↓
connect
↓
sync
↓
providers
↓
resources
↓
investigate
↓
configure MCP
↓
agent discovers Combie
↓
agent reads engineering context
↓
credentials removed
↓
offline investigation still works
```

Record exact outcome.

This is the release-candidate acceptance test.

---

# Beta Readiness Matrix

Produce final matrix:

| Area | Status | Evidence | Blocker? |
|---|---|---|---|
| Installation | | | |
| Initialization | | | |
| Provider connection | | | |
| Sync | | | |
| Resource discovery | | | |
| Relationships | | | |
| Investigation | | | |
| Offline reads | | | |
| MCP startup | | | |
| MCP tools | | | |
| External agent | | | |
| Multi-provider dogfood | | | |
| Credential safety | | | |
| Documentation | | | |
| Distribution | | | |
| Feedback/support | | | |

Statuses:

```text
PASS
PARTIAL
FAIL
DEFERRED
```

---

# Final Release Decision

Sprint 041 MUST end with exactly one:

## A — GO

Meaning:

```text
No P0 blockers
No unacceptable P1 blockers
release path reproducible
docs truthful
agent access usable
closed-beta learning can begin
```

Sprint 042 may invite users.

---

## B — CONDITIONAL GO

Meaning:

```text
core beta is usable
one or more bounded issues remain
issues do not invalidate the product
explicit conditions must be satisfied before invites
```

List exact conditions.

Sprint 042 cannot invite until conditions are closed.

---

## C — NO-GO

Meaning:

```text
a real release blocker exists
```

Identify the smallest corrective Sprint.

Do not disguise NO-GO as more research.

---

# Sprint 042 Boundary

If Sprint 041 ends GO:

Sprint 042 becomes:

```text
CLOSED BETA — FIRST USERS
```

It should focus on:

```text
inviting 5–15 users
onboarding
support
observing usage
collecting feedback
recording failures
identifying next product pressure
```

Sprint 042 should NOT begin with a predetermined feature.

Real users determine the next pressure.

---

# Roadmap Boundary

Do not begin later roadmap work during Sprint 041.

Specifically do not begin:

```text
Operational Memory expansion
Learning
Controlled Execution
Investigation Engine
Application grouping
multi-hop graph
background sync
webhooks
alerts
BYO AI
```

Those remain future product stages.

Closed-beta evidence should influence their sequencing.

---

# Architecture Review

Before completion answer:

1. What exact build/commit was tested?
2. What is the current product classification?
3. What installation path was tested?
4. Did it work from a clean environment?
5. Could setup be completed using public docs only?
6. Was `combie init` successful?
7. Was first provider connection successful?
8. Which provider was used?
9. Was sync successful?
10. Were Resources understandable?
11. Were exact Resource IDs usable?
12. Was investigate useful without developer knowledge?
13. Did offline reads work after credentials were removed?
14. Did MCP work from the clean environment?
15. Which external clients were validated?
16. At what validation level was each client tested?
17. Was Codex interactive use fully validated?
18. Was Cursor interactive use fully validated?
19. Was Claude Code validated?
20. Is Claude Code required for beta?
21. Was multi-provider live dogfood completed?
22. Which providers?
23. Which real Relationships were discovered?
24. Was Shared Commit Context observed live?
25. Did MCP remain read-only?
26. Did provider credentials remain absent from MCP?
27. Did arbitrary `COMBIE_HOME` work?
28. Were credential files protected correctly?
29. Were any P0 issues found?
30. Were any P1 issues found?
31. What was fixed?
32. What was deliberately deferred?
33. Are README commands accurate?
34. Is QUICKSTART accurate?
35. Is MCP.md accurate?
36. What is the chosen beta distribution path?
37. Can a user identify their running build?
38. What are the known beta limitations?
39. What is the beta feedback channel?
40. Who is the target beta user?
41. How many users should Sprint 042 invite?
42. What are the beta learning goals?
43. Did Sprint 041 add any new product capability?
44. If yes, why was it a release blocker?
45. Did the frozen four-tool MCP contract change?
46. Did any core domain semantics change?
47. Did the roadmap change?
48. What is the final readiness matrix?
49. Final decision: GO / CONDITIONAL GO / NO-GO?
50. Is Sprint 042 authorized to begin inviting users?

---

# Completion Notes

## Baseline

Sprint 040 HEAD was `cf9cf8776e890776248e7ccc6b6d3e564ab1e92a` on
`master`. `1366849` and `1c44588` were present in history. Baseline validation:
616 tests passed across 56 files; typecheck clean; worktree contained only this
user-supplied Sprint 041 document as untracked input.

## Repository Understanding

Combie is a Bun/TypeScript local CLI backed by SQLite domain state and a
separate restricted-permission credentials file. Six provider adapters feed
normalized Resources; deterministic projections expose two Relationship
kinds, Changes/history, selected native evidence, and one-hop investigation.
The only distribution is a private repository checkout. MCP is a local stdio
read surface with exactly four tools and requires state populated by a prior
manual CLI sync. The full report was delivered before implementation.

## Product Freeze

Confirmed. No provider, Resource kind, Relationship kind, evidence family,
investigation primitive, or fifth MCP tool was added. Every code change maps to
a reproduced beta failure.

## Installation Audit

Clean local clone plus `bun install --frozen-lockfile`, help, and init passed on
Bun 1.3.5 / macOS 26.5.2 arm64. The package is private, unpublished, and has no
binary/build artifact. `bun link` worked but changed the tracked CLI file mode
and dirtied the clone, so it was removed from the beta path.

## Release Artifact Decision

**C — external distribution remains a release condition.** Repository-based,
pinned-SHA distribution is sufficient for a closed cohort, but this checkout
has no remote or tag and no committed license/use terms. An invite cannot be
sent until it supplies an accessible URL, exact SHA, and authorized use terms.

## Clean Environment

Fresh clones were created under `/tmp`; isolated state used absolute `--dir`
and `COMBIE_HOME` paths. Existing workspace `.combie`, aliases, and provider
environment variables were not used.

## Scenario A — Install

Passed for a local clean clone. `--version` now reports `combie 0.1.0`; help
shows 14 commands. External accessibility remains deferred to the invite URL.

## Scenario B — Init

Passed in clean and arbitrary-cwd paths. Repeated init is safe. Missing `--dir`
now fails instead of silently creating state in the current directory.

## Scenario C — Connect

Live validation deferred: all six provider credential variables were absent
and both local GitHub CLI accounts were invalid. Mocked provider journeys and
error UX passed; no fixture result is represented as live validation.

## Scenario D — Sync

Live sync deferred for the same authorization prerequisite. Multi-provider
success and partial failure remain covered by the test suite.

## Scenario E — Discover

CLI Resource discovery passed against isolated local state. `providers` now
shows the persisted account identity needed to verify connection scope.

## Scenario F — Investigate

CLI and stdio protocol investigation passed on an exact synthetic Resource.
The MCP result now includes the documented Known Facts, Missing Context,
provider activity, timeline, and shared-commit structures.

## Scenario G — Offline

Passed through CLI, MCP protocol client, and Codex with provider variables
absent. The protocol test and a legacy database regression verified unchanged
database bytes; read probes no longer apply migrations.

## Scenario H — Agent Setup

Codex CLI 0.146.0 accepted invocation-only stdio configuration with an absolute
state path. Cursor 3.15.6 configuration/tool discovery remains the precise
validation level. Current Claude syntax was verified from official docs.

## Scenario I — Agent Request

Passed twice with real Codex natural prompts under
`default_tools_approval_mode="writes"`: `list_resources` returned the exact
Resource ID, and `investigate_resource` separated known state from missing
workflow/relationship context without shell access or provider credentials.

## Multi-Provider Dogfood

Deferred because no authorized credentials were available. A final GitHub +
Vercel run is a release condition unless the cohort/promise is explicitly
narrowed.

## Shared Commit Live Validation

No live matching evidence was available. Exact full-SHA semantics remain
covered in unit tests and the structured field is present in MCP; no live claim
is made.

## Codex

Full local natural-agent calls succeeded for Resource listing and
investigation on the worktree candidate. Repeat on the final release SHA.

## Cursor

Configuration and protocol/tool discovery only; no natural-language Cursor
interaction is claimed.

## Claude Code

Deferred. The installed `claude` path resolves to a broken/non-executable text
file. Current official stdio setup syntax is documented accurately.

## Connection UX

Canonical recovery commands now use `bun run combie`; version, account scope,
missing path, credential-file wording, and provider limitations are explicit.

## Error Journey

Uninitialized, missing argument, unknown provider/Resource, missing credential,
partial sync, and provider error paths are actionable in tests. Exact short
credential echo regressions pass for Cloudflare, GitHub, Vercel, and Sentry.

## Empty States

Providers, Resources, Relationships, Changes, investigation evidence, MCP
uninitialized state, and no-relationship states remain truthful and covered.

## Credential Safety

The P0 exact-secret leak is fixed. Credentials remain explicit, separate from
domain state, mode `0600`, and unnecessary for offline/MCP reads. Encryption
and keychain storage remain explicitly NOT YET.

## Local Data

Read-only SQLite handles are used until an explicit write path reopens and
applies schema. Connection/sync call `init()` before mutation. Clean-current
and legacy-state regressions cover non-mutation and additive migration timing.

## Documentation Audit

README, QUICKSTART, and MCP.md now match the command surface, install path,
credential timing, permissions/failure semantics, client validation level, and
known provider scope limits. The historical Sprint 040 document remains
incomplete evidence; Sprint 041 records actual validation rather than rewriting
history.

## Product Positioning

Unchanged: “open engineering context layer.” MCP is an access surface, not the
product identity. No Canon material changed.

## Beta Audience

5–15 startup engineers with multi-provider applications, repository/Bun
comfort, and preferably Codex or Cursor. Exclude multi-account Cloudflare and
unvalidated Vercel-team-only journeys unless explicitly testing those gaps.

## Beta Learning Goals

Time to first useful investigation; connection/permission friction; trust in
Known Facts/Missing Context/authority; incremental value of MCP; and the next
missing relationship/evidence family that blocks repeat use.

## Feedback Channel

Reply to the invitation thread. `RELEASE.md` contains the safe bug-report
template and explicitly forbids sharing credentials or unredacted state.

## Release Identity

Package version `0.1.0` plus exact git SHA. No tag/package/binary is claimed.
The invitation must pin the final Sprint 041 commit.

## Known Limitations

Manual sync; exact IDs; two one-hop Relationship kinds; bounded/unpaginated
evidence; local plaintext credentials; Vercel team scope absent; Cloudflare
first-account selection; no package/binary; Cursor/Claude validation gaps; live
multi-provider/shared-commit dogfood deferred.

## Issues Found

P0: README/MCP contradiction, read-path migrations, four exact-secret error
leaks — fixed. P1: MCP contract fields/annotations, version/path/account UX,
canonical command drift, distribution/use terms, Vercel team scope,
Cloudflare multi-account scope, live dogfood — code/docs fixes or explicit
release conditions. P2: package pipeline, Cursor natural call, Claude call,
in-product feedback — deferred. No P3 affected release.

## Fixes Made

Read-only store opening; explicit write initialization; exact credential
redaction; MCP read annotations and full documented structured response; stdio
contract regression; CLI version/path/account/recovery UX; accurate public
docs and release/dogfood/readiness records.

## Deferred

Accessible remote/tag/use terms; live provider and relationship/shared-commit
dogfood; Vercel team selection; Cloudflare account selection; package/binary;
Cursor natural call; Claude execution; any feature beyond the frozen surface.

## Final Walkthrough

Local clean install/init and isolated CLI/MCP/Codex walkthrough succeeded.
External clone and live connect/sync portions remain explicit release
conditions; therefore the walkthrough is not represented as uninterrupted
live multi-provider success.

## Beta Readiness Matrix

See `docs/internal/beta/READINESS.md`; local product/MCP gates pass, four
release conditions remain unchecked.

## Final Decision

**CONDITIONAL GO.** The candidate is coherent and safe enough for the intended
small cohort after the release conditions are satisfied or the invitation
scope is explicitly narrowed.

## Sprint 042 Gate

**Blocked.** Do not invite until `RELEASE.md` conditions have real evidence.

## Validation

`bun test`: 624 pass, 0 fail, 57 files. `bun run typecheck`: clean.
`git diff --check`: clean. Added-line secret scan: clean. Final clean-clone and
agent replay are recorded during release-SHA handoff. Worktree changes are
Sprint 041 only.

## Canon Changes

None.

## Commit

Implementation/release commit: pending final commit. Completion-record commit:
pending. Sprint 042 was not started.

---

# Definition of Done

- [x] Sprint 040 clean baseline verified
- [x] exact baseline SHA recorded
- [x] SKILL protocol followed
- [x] Canon reviewed
- [x] roadmap reviewed
- [x] Sprint 037–040 reviewed
- [x] Repository Understanding completed
- [x] Sprint declared release-candidate mode
- [x] feature freeze enforced
- [x] current installation path identified
- [x] distribution path validated
- [x] clean environment created
- [x] public docs used as primary setup instructions
- [x] clean install/start validated
- [x] init validated
- [x] arbitrary cwd validated
- [x] `COMBIE_HOME` validated
- [ ] first provider connection validated
- [ ] sync validated
- [x] providers output validated
- [x] resources output validated
- [x] exact Resource IDs validated
- [x] investigate validated
- [x] offline reads validated
- [x] provider credentials removed during offline test
- [x] MCP startup validated
- [x] MCP four-tool surface unchanged unless true blocker
- [x] external-agent configuration validated
- [x] at least one real agent/client validated
- [x] Codex validation level recorded
- [x] Cursor validation level recorded
- [x] Claude Code attempted if practical
- [x] multi-provider dogfood completed if credentials available
- [x] multi-provider deferral explicitly recorded otherwise
- [x] real Relationships inspected where available
- [x] Shared Commit live behavior checked where evidence permits
- [x] provider connection UX audited
- [x] common error journeys tested
- [x] empty states tested
- [x] credential safety audited
- [x] local data behavior audited
- [x] credential file permissions verified
- [x] README audited
- [x] QUICKSTART audited
- [x] MCP.md audited
- [x] every public command verified
- [x] CURRENT / NOT YET boundary verified
- [x] positioning remains "open engineering context layer"
- [x] MCP remains an access surface, not product identity
- [x] beta audience defined
- [x] beta size confirmed
- [x] beta learning goals defined
- [x] feedback mechanism selected
- [x] safe bug-report guidance documented
- [x] beta support path documented
- [x] running build can be identified
- [ ] exact release artifact/path chosen
- [x] known limitations documented
- [x] all discovered issues classified P0/P1/P2/P3
- [x] only beta blockers fixed
- [x] no speculative features added
- [ ] final uninterrupted product walkthrough completed
- [x] Beta Readiness Matrix completed
- [x] exactly one GO / CONDITIONAL GO / NO-GO decision selected
- [x] Sprint 042 gate explicitly recorded
- [x] full test suite passes
- [x] typecheck passes
- [x] diff check clean
- [x] secret scan clean
- [ ] worktree clean
- [x] completion notes written
- [x] Canon changes recorded or None
- [ ] Sprint 041 committed separately
- [x] Sprint 042 not started

---

# Explicitly Out of Scope

Do not implement:

- new provider
- new Resource kind
- new Relationship kind
- new provider evidence family
- new investigate feature
- new investigation projection
- Attention
- ranking
- confidence scores
- correlation engine
- root-cause engine
- hypotheses
- generic Event
- generic Observation
- RefreshEngine
- multi-hop graph
- application grouping
- background sync
- webhooks
- alerts
- scheduled sync
- remote Combie service
- MCP HTTP
- MCP authentication
- fifth MCP tool
- MCP sync
- MCP connect
- MCP write operations
- execution
- shell tool
- BYO model
- internal AI
- IntelligenceProvider
- prompt engine
- agent framework
- operational learning
- controlled execution
- large packaging infrastructure
- analytics platform
- in-product feedback system
- public launch
- Sprint 042 implementation

---

# Final Principle

> **Sprint 041 is where we stop asking whether Combie can become a product and prove that it already is one.**

And:

> **If the release candidate is coherent, safe, useful, and truthful, ship it to a small group and let real users determine what Combie needs next.**
