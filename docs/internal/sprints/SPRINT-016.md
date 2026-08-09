# SPRINT-016 — Investigation Context

> **Status:** Complete
> **Depends on:** SPRINT-015 (`b58a50e`)
> **Phase:** Investigation foundation
> **Primary goal:** Compose deterministic investigation context around one Resource
> **AI / root-cause inference / scoring:** None
> **New provider calls:** None
> **New durable domain model:** Avoid unless proven necessary

## Goal

Introduce the smallest Investigation primitive in Combie:

> Given one Resource, assemble everything Combie already knows that is directly relevant to investigating it.

The output should combine:

1. the subject Resource
2. the subject's Change history
3. canonical one-hop Relationships
4. directly related Resources
5. Change history for those directly related Resources

All data must come from Combie's existing local persisted knowledge.

No provider calls.

No AI.

No root-cause claims.

No ranking or confidence.

No correlation engine.

Sprint 016 is composition, not reasoning.

---

## Why Now

Sprints 001–015 established the knowledge foundation:

```text
Providers
   ↓
Resources
   ↓
Relationships
   ↓
Changes
   ↓
History
   ↓
Context
```

Combie can already answer questions about an individual Resource through `context`.

But investigations are rarely isolated to one object.

For a Vercel project, useful context may include:

```text
GitHub repository
      │
  source_for
      ▼
Vercel project
      │
uses_domain_in
      ▼
Cloudflare zone
```

Each Resource can have its own Change history.

Today those facts exist, but they are not assembled into a single investigation-oriented view.

Sprint 016 should create that deterministic boundary.

---

## Product Question

The Sprint should answer:

> **Can Combie assemble a trustworthy investigation context from its existing Resource, Relationship, and Change memory without adding reasoning or new data sources?**

If yes, that becomes the substrate for later temporal analysis, observations, human investigation, AI reasoning, outcomes, and learning.

---

## Core Principle

> **Investigation starts by gathering known facts, not by guessing causes.**

The output should clearly separate:

```text
WHAT EXISTS
WHAT IS RELATED
WHAT CHANGED
WHAT COMBIE DOES NOT KNOW
```

It should not say:

```text
this probably caused...
likely root cause...
confidence...
anomaly...
incident...
```

unless a future Sprint introduces evidence-backed semantics for those concepts.

---

## Relationship Boundary

Sprint 016 is intentionally **one hop**.

Given:

```text
A ──→ B ──→ C
```

Investigating B may include A and C because both are directly related to B.

Investigating A includes B, but must not recursively traverse through B to C.

No recursive graph walk.

No depth option.

No transitive closure.

No graph engine.

One hop matches the existing trustworthy relationship boundary and keeps context understandable.

---

## Proposed Application Primitive

The implementation should evaluate a provider-independent shape conceptually similar to:

```ts
type InvestigationContext = {
  subject: Resource;
  subjectChanges: Change[];
  relationships: InvestigationRelationship[];
  related: InvestigationRelatedResource[];
};

type InvestigationRelatedResource = {
  resource: Resource;
  direction: "inbound" | "outbound";
  relationship: Relationship;
  changes: Change[];
};
```

This is conceptual, not mandatory syntax.

Reuse existing domain types directly where possible.

Do not create duplicate Investigation-specific copies of Resource, Change, or Relationship simply to rename fields.

The application-layer result may be ephemeral and non-persistent.

---

## Investigation Identity

Do not create a durable Investigation ID in this Sprint.

This Sprint is not yet:

```text
investigation:abc123
```

It is a deterministic read:

```text
resource-id
   ↓
InvestigationContext
```

No sessions.

No saved investigations.

No status/lifecycle.

No database table.

No append-only investigation record.

Those require future product justification.

---

## CLI

Add a minimal offline command:

```bash
combie investigate <resource-id>
```

The command should read only local persisted Combie state.

Exact stable Resource IDs only, consistent with `related`, `history`, and `context`.

Examples:

```bash
combie investigate vercel:project:<id>
combie investigate github:repository:<id>
combie investigate cloudflare:zone:<id>
```

No fuzzy name lookup.

No provider access.

No credentials required.

---

## CLI Output

Prefer a clear deterministic structure such as:

```text
SUBJECT
Vercel project: demo-hub
ID: vercel:project:...

CURRENT
...

SUBJECT CHANGES
...

RELATED CONTEXT

→ source_for
GitHub repository: sgr0691/demo-hub
ID: github:repository:...

CHANGES
...

→ uses_domain_in
Cloudflare zone: example.com
ID: cloudflare:zone:...

CHANGES
...
```

Actual formatting should follow existing Combie CLI conventions.

Do not add decorative complexity.

Evidence for each Relationship must remain available and understandable.

Inbound versus outbound direction must be explicit.

---

## Relationship Semantics

Use only persisted canonical Relationships.

Current examples include:

```text
source_for
uses_domain_in
```

Do not infer new edges during investigation composition.

Do not synthesize inverses as persisted Relationships.

For query presentation, existing direction semantics may display canonical rows from the subject's perspective:

```text
outbound →
inbound  ←
```

Reuse Sprint 006 behavior where appropriate.

---

## Changes

Investigation context should include:

```text
full subject Change history
full Change history for each directly related Resource
```

Use existing Change records.

Do not create a new Event/Timeline model.

Do not copy Changes into a new table.

Do not truncate history arbitrarily unless repository/CLI constraints prove necessary.

Preserve exact `observedAt`, evidence, absent values, and deterministic ordering already established by History.

---

## Ordering

Determinism is mandatory.

Define and test ordering for:

### Subject Changes

Reuse existing History ordering:

```text
newest first
stable ID tie-break
```

### Related Resources / Relationships

Prefer stable deterministic ordering based on existing Relationship/related-context conventions.

A reasonable hierarchy may be:

```text
relationship kind
direction
provider
resource kind
resource name
stable resource ID
relationship ID
```

but inspect current behavior before defining a new rule.

Reuse existing canonical ordering if one already exists.

### Related Changes

Reuse History ordering independently per Resource.

Do not let SQLite incidental row order leak into output.

---

## Missing Context

Sprint 015 established an important truth:

> Combie does not currently have deterministic application↔database Relationships.

Sprint 016 must not hide that limitation.

However, do not invent a broad "missing relationship detector."

The investigation view may communicate factual absence such as:

```text
No related database resource is known.
```

only if that statement can be derived generically and truthfully from current relationship/resource state without provider-specific guesses.

Prefer conservative zero states:

```text
No relationships discovered.
No changes recorded.
```

A generic `MissingContext` engine is out of scope.

---

## Difference From `combie context`

Do not replace or break `context`.

Current `context` answers roughly:

> What does Combie know about this Resource?

Sprint 016 `investigate` answers:

> What does Combie know around this Resource that may be useful for investigation?

Conceptually:

```text
context(subject)
  ├── subject
  ├── relationships
  └── subject history

investigate(subject)
  ├── subject
  ├── subject history
  ├── relationships
  ├── related Resources
  └── related Resource histories
```

Inspect the actual Sprint 012 implementation before relying on this conceptual distinction.

Reuse `context` internals where sensible, but do not make `investigate` a fragile text-parsing wrapper around formatted Context output.

Compose from application/domain/storage primitives.

---

## Architecture Boundary

Expected flow:

```text
CLI
 ↓
Application: getInvestigationContext
 ↓
Resource Store
Relationship Store
Change Store
```

No adapter/provider layer.

No network.

No auth.

No AI.

No writes.

The feature should work with all credential environment variables removed.

---

## Persistence

Sprint 016 should add **zero new persistence**.

No:

```text
investigations table
investigation_context table
timeline table
observations table
causes table
```

InvestigationContext is derived from existing persisted truth.

Reading it repeatedly must not mutate the database.

---

## Database Integrity

Prove the command is read-only.

A strong live/local validation should:

1. hash or otherwise verify the database state
2. run `combie investigate <resource-id>`
3. verify persisted state is unchanged

Follow the offline/read-only validation style from Sprint 012.

---

## Resource Lookup

Exact stable Resource ID only.

Behavior:

### Existing Resource + related context

Return composed InvestigationContext.

### Existing Resource + no Relationships

Return subject + subject history + trustworthy empty related state.

### Existing Resource + no Changes

Return subject and relationships normally with an explicit zero-history state.

### Related Resource with no Changes

Include the Resource and Relationship; show no recorded Changes.

### Missing Resource

Return clear not-found behavior consistent with existing commands.

Do not silently treat a missing subject as empty context.

---

## Relationship Integrity

A persisted Relationship should normally reference existing Resources.

Still inspect behavior if a target/source Resource is unexpectedly missing.

Do not crash or fabricate the missing Resource.

Choose the smallest trustworthy behavior consistent with storage invariants:

- surface an integrity error, or
- omit with explicit indication

Document the decision.

Do not build repair logic.

---

## Evidence

Relationship evidence is part of investigation context.

Do not reduce:

```text
GitHub repo → source_for → Vercel project
```

to a naked edge without its evidence.

Reuse complete canonical Relationship evidence.

Do not summarize or reinterpret evidence with AI.

---

## Time

Sprint 016 is **not temporal correlation**.

Although Changes have timestamps, do not yet create:

```text
combined cross-resource timeline
within 5 minutes
before/after causality
temporal clusters
incident window
```

Keep histories scoped to their Resources.

This is intentional.

A later Sprint can decide how cross-resource time should be composed without contaminating this primitive.

---

## Architecture Pressure Report

Before implementation, inspect baseline `b58a50e` and answer:

1. What exactly does `combie context` currently compose?
2. Can its application primitive be reused safely?
3. What does `getRelatedContext` already return?
4. Can existing relationship lookup retrieve all one-hop edges efficiently enough?
5. Can existing Change/history reads retrieve related histories without schema changes?
6. Is a new domain type needed, or only an application DTO/result?
7. Can InvestigationContext remain fully ephemeral?
8. What deterministic ordering already exists?
9. How should inbound/outbound relationship direction be represented?
10. How should missing related Resources be handled?
11. How should zero-history states be represented?
12. Can the feature remain completely offline/read-only?
13. Does repeated investigation leave persistence unchanged?
14. Does one-hop composition scale adequately with current SQLite/data sizes?
15. Is batching necessary now, or would it be premature?
16. Does anything require a new index?
17. Does anything require Canon change?

Do not code before producing this report.

---

## Repository Understanding

Follow `skills/build-combie/SKILL.md`.

Inspect:

- `src/app/context.ts`
- `src/app/history.ts`
- related-context application code
- Resource lookup/storage
- Relationship lookup/storage
- Change lookup/storage
- CLI parser/dispatch/help
- formatter conventions
- not-found/empty-state conventions
- deterministic sorting utilities
- tests from Sprints 006, 011, and 012
- Sprint 015 completion notes and Recommendation D

Identify reusable primitives before creating new ones.

---

## Implementation Plan

Before coding, produce a concise plan covering:

- application result shape
- reuse of Context/History/Related primitives
- exact Resource lookup
- one-hop Relationship composition
- related Resource hydration
- per-Resource Change lookup
- ordering
- direction semantics
- evidence preservation
- zero/not-found states
- integrity edge cases
- CLI formatting
- read-only/offline proof
- performance/query behavior
- tests

Then implement:

```text
Red → Green → Refactor
```

---

## Performance Boundary

Do not prematurely optimize.

At current Combie scale, straightforward SQLite reads may be sufficient.

Still record request/query behavior in completion notes:

```text
1 subject lookup
1 relationship lookup
N related resource lookups?
N history lookups?
```

If existing storage APIs naturally support batching, reuse them.

Do not add caching, graph databases, materialized views, or complex indexing without measured need.

If an obvious N+1 can be removed with a tiny generic store method, evaluate it in Architecture Pressure before changing storage.

---

## Tests

All Sprint 001–015 tests must remain green.

### Application

Cover:

- subject with no relationships/no changes
- subject changes only
- outbound related Resource
- inbound related Resource
- multiple relationship kinds
- multiple related Resources
- related Resource with changes
- related Resource with zero changes
- complete Relationship evidence
- deterministic ordering
- exact stable-ID lookup
- missing subject
- relationship integrity edge case
- no persistence mutation

### Direction

Prove canonical Relationship is not duplicated or rewritten.

From source:

```text
→ kind → target
```

From target:

```text
← kind ← source
```

or repository-consistent equivalent.

### History

Prove subject and related histories retain existing newest-first + stable tie-break ordering and exact evidence/timestamps.

### Offline

Unset provider credentials and prove `investigate` still works.

### Read-only

Prove repeated reads do not create Resources, Relationships, Changes, or other records.

### Regression

Existing:

```text
providers
resources
relationships
related
changes
history
context
sync
```

remain unchanged.

---

## Live / Local Verification

Use the existing local Combie database if it contains useful Resources/Relationships.

Ideal subject: a Vercel project with both:

```text
GitHub source_for
Cloudflare uses_domain_in
```

if available.

Example:

```bash
bun run combie investigate vercel:project:<id>
```

Verify:

- subject rendered correctly
- inbound GitHub relationship shown
- outbound Cloudflare relationship shown where present
- full Relationship evidence shown
- subject history shown
- related histories shown
- legitimate empty histories remain explicit
- no Neon/PlanetScale relationship invented
- command works with provider credential env vars removed
- repeated invocation is identical
- database remains unchanged

If the live database lacks a Resource with multiple relationship kinds, validate those semantics through fixtures/tests and document the live limitation.

---

## CLI Help

Update generic help to include:

```text
investigate <resource-id>
```

Keep wording narrow.

Do not advertise:

```text
root cause analysis
incident diagnosis
AI investigation
automatic debugging
```

The command composes investigation context only.

---

## Naming

Preferred CLI:

```text
combie investigate <resource-id>
```

Preferred application primitive:

```text
getInvestigationContext(...)
```

But inspect repository naming conventions.

Avoid introducing multiple competing terms:

```text
investigation bundle
debug context
incident context
correlation context
diagnostic graph
```

One concept is enough.

---

## No AI

Do not call an LLM.

Do not add model/provider configuration.

Do not generate summaries.

Do not produce suggested causes.

Do not label Changes as important/unimportant.

Do not rank Resources.

The deterministic structure itself is the product of this Sprint.

---

## No Investigation Lifecycle Yet

Do not add:

```text
start investigation
close investigation
investigation status
owner
notes
hypothesis
decision
outcome
```

Those belong later if the product needs persistent investigations.

Sprint 016 proves the read model first.

---

## Explicitly Out of Scope

Do not implement:

- recursive relationship traversal
- graph engine
- cross-resource combined timeline
- temporal correlation
- change clustering
- incident windows
- root-cause inference
- causal claims
- anomaly detection
- scoring/confidence
- observations
- hypotheses
- investigation sessions
- investigation persistence
- investigation outcomes
- Learning
- AI/LLM
- embeddings
- telemetry/logs/metrics/traces
- new provider APIs
- new provider enrichment
- new Relationship kinds
- `uses_database`
- secret/env ingestion
- MCP/API/SDK/web UI
- controlled execution
- hosted Combie
- Sprint 017 scaffolding

---

## Anti-Overengineering

Do not create:

```text
InvestigationEngine
CorrelationEngine
TimelineEngine
GraphTraversal
Incident
RootCause
ObservationGraph
InvestigationRepository
InvestigationStore
```

unless an existing simple application result absolutely cannot satisfy the Sprint, which would require documented Architecture Pressure first.

Expected architecture is much smaller:

```text
existing persisted facts
        ↓
application composition
        ↓
CLI read
```

---

## Canon

Permanent Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Update only if implementation proves an existing statement materially inaccurate.

Beginning Investigation does not automatically require a Canon change if the current roadmap already describes it.

---

## Completion Notes

### Repository Understanding

Baseline `b58a50e` (Sprint 015) already provided:

- Exact stable Resource ID lookup (`getResource`) with `RESOURCE_NOT_FOUND` /
  `RESOURCE_REF_REQUIRED` patterns shared by history, related, and context.
- One-hop Relationships via `listRelationshipsForResource` ordered by
  `kind, source_resource_id, target_resource_id`.
- `getRelatedContextForResource` with inbound/outbound direction and dangling
  neighbor as `resource: null` (no fabrication).
- Per-Resource history via `listChangesForResource` ordered
  `observed_at DESC, id DESC` (newest first + stable tie-break).
- `getResourceContext` composing subject + related neighbors + **subject-only**
  history (does not hydrate neighbor histories).
- Offline, credential-free, read-only CLI commands with no provider calls.
- Sprint 015: no application↔database Relationships; Recommendation D was
  evidence classification only — not a license to invent `uses_database` here.

### Architecture Pressure

1. **`combie context` composes:** subject Resource, one-hop RelatedNeighbor[],
   subject Change[] only. No related Resource histories.
2. **Reuse of context primitive:** Internals (`getRelatedContextForResource`,
   `getResourceHistoryForResource`) are reused safely. Investigation is a
   separate composition, not a parser of formatted context text. `context` is
   unchanged.
3. **`getRelatedContext` returns:** `{ resource, related: [{ relationship,
   direction, resource | null }] }` — perfect one-hop boundary.
4. **Relationship lookup efficiency:** One SQL query for all touching edges.
5. **Change/history reads:** Existing `listChangesForResource` per Resource;
   no schema change.
6. **New domain type?** No. Application DTO only (`InvestigationContext` /
   `InvestigationNeighbor`) holding existing Resource/Relationship/Change.
7. **Ephemeral:** Yes — no table, ID, session, or lifecycle.
8. **Existing ordering:** Relationships: SQL kind/source/target. Changes:
   observedAt DESC, id DESC. Reused as-is.
9. **Direction:** Presentation-only `outbound` / `inbound` on canonical rows;
   Relationship identity never rewritten.
10. **Missing related Resource:** Include edge, `resource: null`, `changes: []`,
    CLI shows id + `(missing resource)`.
11. **Zero history:** Explicit `No changes recorded yet.` per subject and per
    related Resource.
12. **Offline/read-only:** Yes — local SQLite only; proven by tests + live hash.
13. **Repeated investigation:** Identical composition; DB hash unchanged.
14. **Scale:** One-hop + N neighbor history reads is adequate at current sizes.
15. **Batching:** Premature; not added.
16. **Indexes:** Not required.
17. **Canon:** No VISION/ARCHITECTURE/ROADMAP/SKILL change required.

### Implementation

- Added `src/app/investigate.ts`:
  - `getInvestigationContext` / `getInvestigationContextForResource`
  - `formatInvestigationContext`
- Wired `combie investigate <resource-id>` in CLI help and dispatch.
- Tests: `tests/app/investigate.test.ts` + CLI coverage.
- Zero new persistence. Zero provider code. Zero AI.

### Investigation Context Contract

```ts
InvestigationContext = {
  subject: Resource
  subjectChanges: Change[]          // full history, newest first
  related: InvestigationNeighbor[]  // one hop only
}

InvestigationNeighbor = {
  relationship: Relationship        // canonical persisted edge + full evidence
  direction: "inbound" | "outbound" // from subject's perspective
  resource: Resource | null         // null if dangling
  changes: Change[]                 // neighbor history; [] if missing/zero
}
```

Boundary: exactly one hop. Given A→B→C, investigating A yields B only;
investigating B may yield A and C; never A→B→C transitive walk.

No Relationship inference. No combined timeline. No temporal correlation.

### Reuse

| Primitive | Role |
|-----------|------|
| `getRelatedContextForResource` | One-hop edges + direction + neighbor hydration |
| `getResourceHistoryForResource` | Subject and each neighbor Change history |
| Store `getResource` / `listRelationshipsForResource` / `listChangesForResource` | Persistence reads |
| Context evidence formatting style | Full Relationship evidence in CLI |

### Ordering

- **Subject / related Changes:** existing History order (`observed_at DESC, id DESC`).
- **Related neighbors:** existing Relationship store order
  (`kind, source_resource_id, target_resource_id`).
- No incidental SQLite row-order dependence beyond these explicit ORDER BYs.

### Direction

- Outbound: subject is source → `kind →`
- Inbound: subject is target → `← kind`
- Canonical `relationship.id` / source / target unchanged.

### Zero / Error States

| Case | Behavior |
|------|----------|
| No Relationships | `related: []` / "No relationships discovered." |
| No subject Changes | empty array / "No changes recorded yet." |
| Related zero Changes | neighbor present; CHANGES zero state |
| Missing subject | `RESOURCE_NOT_FOUND` (not empty context) |
| Blank ref | `RESOURCE_REF_REQUIRED` with investigate usage |
| Dangling edge | neighbor null, changes [], explicit missing marker |

### Query Behavior

```text
1× getResource(subject)
1× listRelationshipsForResource(subject)
N× getResource(neighborId)          // via related context
1× listChangesForResource(subject)
N× listChangesForResource(neighbor) // when neighbor present
```

No storage API changes. No batching/indexes/caching.

### Read-Only / Offline Verification

- Tests unset all provider credential env vars and break `fetch`.
- DB content hash + resource/relationship/change counts identical before/after.
- Live local `./.combie`: SHA-256 of `combie.db` unchanged across investigate.

### Live Verification

Local database at `./.combie` had 45 Resources, **0 Relationships**, 0 Changes
(relationships never refreshed after providers were connected).

```bash
bun run combie investigate vercel:project:prj_5A61TMHrgHKDrTYm0VAluARw1mrQ --dir ./.combie
```

Demonstrated: subject CURRENT, explicit zero SUBJECT CHANGES, explicit
"No relationships discovered.", offline with credentials unset, read-only
hash proof. Multi-kind inbound/outbound + related histories proven by
fixtures/tests (cannot invent edges for live multi-kind demo). No
Neon/PlanetScale relationship invented.

### Validation

- `bun test` — 392 pass, 0 fail
- `bun run typecheck` — clean
- Secret scan: no credentials in new code
- Full diff reviewed: investigate app module + CLI + tests + sprint notes only

### Deviations

- None material. Combined `related` array carries relationship + neighbor +
  changes (avoids duplicating relationship list separately).
- Live multi-relationship subject unavailable; multi-kind coverage is fixture-based.

### Learnings

> Can Combie compose useful investigation context entirely from its existing knowledge layer?

**Yes.** Subject state, full subject history, canonical one-hop Relationships
with evidence, related Resources, and their full histories compose without
provider calls, AI, or new persistence. Usefulness is bounded by what has
already been connected, related, and observed — empty related/history states
remain explicit.

> What is the smallest missing primitive before Combie can begin ordering cross-resource evidence in time?

A **deterministic cross-resource Change merge/timeline** that orders Changes
from the subject and its one-hop neighbors by `observedAt` (with stable
tie-break) while preserving per-Resource identity and without claiming
causality. That is the smallest next primitive for temporal composition —
not implemented in Sprint 016.

### Canon Changes

**None.** Permanent Canon unchanged. Investigation foundation is composition
over existing knowledge, consistent with roadmap INVESTIGATE progression.

Do not define or implement Sprint 017.

---

## Definition of Done

- [x] inspect `b58a50e`
- [x] follow `SKILL.md`
- [x] Repository Understanding report
- [x] Architecture Pressure report
- [x] inspect Context/History/Related implementations
- [x] minimal InvestigationContext application primitive
- [x] exact stable Resource ID lookup
- [x] subject current state included
- [x] full subject Change history included
- [x] canonical one-hop Relationships included
- [x] related Resources included
- [x] full related Resource Change histories included
- [x] Relationship evidence preserved
- [x] inbound/outbound direction explicit
- [x] deterministic relationship/resource ordering
- [x] deterministic Change ordering reused
- [x] no recursive traversal
- [x] no inferred Relationships
- [x] no database relationship invented
- [x] trustworthy zero-history state
- [x] trustworthy zero-relationship state
- [x] clear not-found behavior
- [x] relationship integrity edge case handled
- [x] `combie investigate <resource-id>`
- [x] generic CLI help updated
- [x] fully offline
- [x] fully read-only
- [x] no new persistence/table
- [x] repeated reads idempotent
- [x] database unchanged by reads
- [x] no provider calls
- [x] no AI
- [x] no scoring/correlation/causal inference
- [x] query behavior documented
- [x] all prior tests pass
- [x] new focused tests pass
- [x] full suite/typecheck pass
- [x] secret scan clean
- [x] full diff reviewed
- [x] Canon accurate
- [x] completion notes updated
- [x] worktree clean
- [x] Sprint 017 not started

---

## What Sprint 016 Proves

Before:

```text
Resource A
  ├── its Relationships
  └── its History

Resource B
  └── its History

Resource C
  └── its History
```

After:

```text
              Investigation Context
                       │
              ┌────────┴────────┐
              │                 │
           Subject          Relationships
              │                 │
           Changes       ┌──────┴──────┐
                         │             │
                    Related B      Related C
                         │             │
                      Changes       Changes
```

No reasoning has occurred.

But Combie now has a deterministic boundary containing the facts needed for reasoning later.

---

## Final Principle

> **Before Combie explains what happened, it should be able to assemble what it actually knows.**

Start with one Resource.

Gather its history.

Gather its proven neighbors.

Gather their histories.

Preserve evidence.

Do not cross another graph hop.

Do not correlate time yet.

Do not guess.

Do not persist an investigation.

Return the facts.

Then stop.
