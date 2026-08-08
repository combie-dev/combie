# SPRINT-010 — Resource Change Detection

> **Roadmap:** v0.3 — Memory foundation
> **Status:** Complete
> **Depends on:** SPRINT-009 — Vercel ↔ Cloudflare Domain Relationship
> **Scope:** Detect meaningful changes between authoritative Resource snapshots
> **Providers:** Provider-independent
> **Persistence:** Minimal durable Change records
> **Relationship work:** None

## Goal

Teach Combie to recognize when a Resource it already knows about changes between successful syncs.

Today Combie understands current state:

```text
Providers → Resources → Relationships → Related Context
```

After Sprint 010, Combie should also answer the first memory question:

> **What changed?**

Conceptually:

```text
previous authoritative Resource
             │
             │ compare
             ▼
current authoritative Resource
             │
             ▼
           Change
```

Sprint 010 is intentionally small. It is not a general event system, audit log, investigation engine, timeline engine, or AI memory layer.

It establishes one primitive:

> When a synchronized Resource's meaningful normalized state changes, Combie can detect that transition and retain a compact durable record of it.

---

## Why This Sprint Exists

Sprints 001–004 established provider connection and Resource discovery.

Sprints 005–009 established deterministic cross-provider Context:

```text
GitHub repository ── source_for ──→ Vercel project
                                      │
                                      │ uses_domain_in
                                      ▼
                                Cloudflare zone
```

Combie can answer `What exists?` and `What is related?`, but sync still converges Resources toward current state. Once a Resource is updated, the previous state disappears from operational context.

The next useful primitive is recognizing a transition:

```text
Before → After
```

This becomes the foundation for later questions such as what changed, when it changed, what else changed around the same time, and whether related Resources may have been affected. Those later capabilities are out of scope here.

---

## Sprint Principle

> **Detect facts before building memory around them.**

Do not build a MemoryEngine. Do not build investigations. Do not correlate changes. Do not infer causes. Do not use AI.

Detect deterministic changes in normalized provider state, persist a compact record, expose a minimal read path, and stop.

---

## Product Outcome

Given a Resource already stored locally:

```yaml
id: vercel:project:prj_123
name: combie-web
metadata:
  domains: []
```

and a later authoritative sync produces:

```yaml
id: vercel:project:prj_123
name: combie-web
metadata:
  domains:
    - hostname: app.combie.dev
      apexName: combie.dev
      custom: true
```

Combie should preserve the current Resource as usual and also record a compact Change describing the transition.

Conceptually:

```text
RESOURCE                         CHANGE       FIELD
vercel:project:prj_123           updated      metadata.domains
```

The exact CLI representation should follow repository conventions.

---

## Scope

Sprint 010 includes:

1. inspect how Resources are currently upserted during sync
2. define the smallest provider-independent `Change` domain primitive
3. compare the previously persisted Resource with the incoming normalized Resource before overwrite
4. detect meaningful normalized state changes
5. ignore unchanged Resources
6. avoid treating volatile bookkeeping fields as meaningful provider changes
7. persist compact durable Change records
8. preserve enough before/after evidence to explain the detected change
9. ensure initial discovery does not masquerade as an update
10. expose a minimal local CLI read path for Changes
11. ensure repeated identical syncs create no duplicate Changes
12. respect provider/resource authority and partial-sync semantics
13. preserve Resource and Relationship behavior
14. add focused tests
15. live-verify the no-change/idempotent path
16. use deterministic fixtures/tests to prove positive change detection without mutating production infrastructure

Everything else is out of scope.

---

## Change Primitive

Before implementation, inspect the repository and choose the smallest model that represents an observed Resource transition.

Conceptually:

```ts
type Change = {
  id: string
  resourceId: string
  kind: "updated"
  observedAt: string
  fields: ChangeField[]
}

type ChangeField = {
  path: string
  before: unknown
  after: unknown
}
```

This shape is illustrative only. The repository implementation is authoritative.

The model should answer:

- Which Resource changed?
- When did Combie observe it?
- Which meaningful normalized facts changed?
- What were the previous and new values?

Nothing more.

---

## Change Identity

A Change is an observed transition, not a permanent Resource identity.

Its identity must prevent accidental duplicate insertion for the same observed transition while allowing a later transition back to an earlier value to become a new Change.

Inspect existing sync/run semantics first. Prefer the smallest deterministic identity tied to an observation boundary already available in the repository.

If Combie has no durable sync-run identity, do not build an elaborate run system solely for this Sprint. Choose a simple safe local strategy and document it.

---

## Meaningful State

Change detection operates over provider-normalized Resource state, not raw provider responses.

Candidate meaningful fields include existing Resource facts such as:

```text
name
kind-specific metadata
Git linkage
domain evidence
other compact normalized provider facts
```

Do not automatically treat every serialized field as meaningful.

### Exclude Operational Bookkeeping

Fields reflecting Combie synchronization mechanics should not create provider-state Changes, including actual repository equivalents of:

```text
updatedAt
lastSeenAt
sync timestamps
database row timestamps
internal serialization details
```

Inspect the real Resource model and explicitly document which fields participate in comparison.

---

## Provider Independence

Change detection belongs above provider adapters.

Preferred flow:

```text
Provider adapter
      ↓
normalized incoming Resource
      ↓
application/storage boundary
      │
      ├── load previous Resource
      ├── compare meaningful state
      ├── persist Change if needed
      └── persist current Resource
```

Do not implement provider-specific change detectors unless repository reality proves normalized Resources are insufficient.

Sprint 010 should validate whether normalized Resources are already a sufficient abstraction for basic change detection.

---

## Initial Discovery

A Resource appearing for the first time is not an `updated` Change.

Preferred behavior:

```text
previous Resource absent
current Resource present
→ store Resource
→ no updated Change
```

Default Sprint scope is `updated` only. Do not casually add `created`.

---

## Resource Deletion

Do not implement Resource deletion/tombstone Changes in Sprint 010 unless current synchronization already has trivial, authoritative deletion semantics.

A Resource disappearing can mean deleted, inaccessible, filtered, partial sync, or permission change. That deserves separate treatment.

Sprint 010 focuses on:

```text
known Resource → authoritative updated Resource
```

---

## Comparison Semantics

Comparison must be deterministic:

- compare normalized values
- object key order must not create Changes
- semantically identical serialized metadata must not create Changes
- array ordering must follow the meaning of the normalized field
- do not hide real provider changes through over-aggressive normalization
- no fuzzy comparison
- no AI interpretation

Where prior Sprints already canonicalize facts, reuse those normalized values.

Do not create a generic semantic-diff framework.

### Arrays

For arrays where order is not meaningful, provider ordering changes should not generate noise. For arrays where order is meaningful, preserve order.

Do not globally sort every array without understanding the normalized contract. Solve concrete current cases minimally and document the decision.

---

## Change Evidence

Persist enough evidence to explain the transition.

Example:

```yaml
resourceId: vercel:project:prj_123
kind: updated
fields:
  - path: metadata.domains
    before: []
    after:
      - hostname: app.combie.dev
        apexName: combie.dev
        custom: true
```

Keep it compact. Do not snapshot raw provider responses, credentials, or unrelated unchanged fields.

---

## Persistence

Sprint 010 may add the smallest SQLite persistence required for durable Change records.

A dedicated `changes` table is acceptable because Change is a new durable domain concept.

Conceptually:

```text
changes
- id
- resource_id
- kind
- observed_at
- evidence_json
```

Follow existing storage conventions.

Do not add events, observations, timeline entries, memory items, investigations, causes, or effects tables.

### Retention

Do not build pruning, archival, compaction, TTLs, quotas, or cloud storage. Local Change history may remain append-only for this early validation slice.

---

## Minimal CLI

Expose a compact local read path.

Preferred command:

```bash
combie changes
```

Conceptually:

```text
WHEN       RESOURCE                    CHANGE    FIELDS
just now   vercel:project:prj_123      updated   metadata.domains
```

A resource filter such as `combie changes <resource-id>` may be added only if it is a tiny natural extension useful for validation.

Do not add search, timeline UX, natural language, or investigation commands.

`combie changes` must read local state only and make no provider calls.

---

## Sync Integration

Change detection must occur where Combie has both:

1. an authoritative incoming normalized Resource
2. the previously persisted version of the same stable Resource identity

Order matters:

```text
load previous
compare
record Change if meaningful
persist current
```

or an equivalent transactionally safe ordering.

Do not compare after overwriting the only previous state.

---

## Transaction / Failure Safety

Inspect existing storage transaction behavior.

Avoid inconsistent outcomes such as a Change persisting while the Resource update fails, or the Resource updating while Change persistence silently fails, if current SQLite abstractions can reasonably keep them consistent.

Do not introduce distributed transactions. Use the smallest SQLite transaction boundary justified by the current Store architecture and document it.

---

## Partial Provider Failure and Unknown Evidence

Only Resources returned through successful authoritative discovery/enrichment are candidates for update detection.

A provider sync failure must not generate Changes.

Unknown enrichment must not become a fabricated Change.

For example:

```text
previous domains: [example.com]
current domain enrichment: unknown
```

must not become:

```text
domains changed to empty
```

because that fact was never observed.

Respect existing field-authority semantics. If safely merging authoritative and unknown fields becomes complex, prefer correctness and document the limitation rather than broadening the Sprint.

---

## Relationship Interaction

Relationships remain current-state Context.

Sprint 010 does not record Relationship Changes. If a Resource change later causes `source_for` or `uses_domain_in` to refresh, those current-state updates remain separate from Resource Change history.

Do not add `relationship_created` or `relationship_removed` kinds.

Existing relationship inference, stale cleanup, provider success gates, `relationships`, and `related` must remain correct.

---

## Architecture Pressure Report

Before implementation, inspect the completed Sprint 009 repository and answer:

1. Where are incoming Resources compared/upserted today?
2. Can the previous Resource be read before overwrite without redesign?
3. Which Resource fields are provider facts versus Combie bookkeeping?
4. Is normalized Resource state stable enough for provider-independent comparison?
5. Which arrays/metadata structures require canonical comparison?
6. How are Vercel known-empty vs unknown enrichment states represented?
7. Can Change persistence use existing Store/SQLite patterns?
8. Is a SQLite transaction needed around Change + Resource persistence?
9. Does current sync expose an observation/run boundary useful for Change identity?
10. Can initial discovery remain distinct from update detection?
11. Can `combie changes` reuse existing CLI/application patterns?
12. Does anything discovered require a Canon change?

Do not modify architecture simply because these questions are asked.

---

## Repository Understanding Requirement

Before coding, follow `skills/build-combie/SKILL.md` and inspect Sprint 009 at commit `b44ecad`.

Identify:

- Resource domain model and stable identity
- Resource metadata representation
- Store Resource read/upsert methods
- SQLite schema/open behavior
- sync orchestration
- provider success/failure semantics
- Vercel enrichment unknown semantics
- Relationship refresh ordering
- CLI command structure
- timestamp/time utilities
- testing patterns
- smallest insertion point for change detection

The repository is implementation reality.

---

## Implementation Plan Requirement

Before coding, produce a concise plan covering:

- Change domain shape
- meaningful Resource projection/comparison
- ignored bookkeeping fields
- deterministic diff representation
- Change identity
- persistence schema
- transaction behavior
- sync insertion point
- initial-discovery behavior
- unknown/partial-failure behavior
- CLI read path
- tests
- live verification

Then implement.

---

## Testing Strategy

All existing tests must continue passing.

### Domain

Cover valid `updated` Change, stable identity requirements, compact changed-field evidence, and serialization round trip.

### Comparison

Cover:

- identical Resource → no Change
- changed name → Change
- changed meaningful metadata → Change
- multiple changed fields → one observed Change with multiple field entries if that matches the chosen model
- object key-order difference → no Change
- bookkeeping-only difference → no Change
- normalized identical domain evidence → no Change
- real domain evidence change → Change
- provider-return ordering noise does not create a Change where ordering is semantically irrelevant

### Initial Discovery

```text
no previous Resource + incoming Resource
→ no updated Change
```

### Unknown Evidence

```text
previous authoritative domains
+ current unknown enrichment
→ no fabricated domain removal Change
```

### Persistence

Cover insert, list, restart persistence, chronological ordering, repeated identical sync without duplicates, and later A→B→A transitions remaining distinct observations where applicable.

### Sync Integration

Cover initial sync, unchanged second sync, changed second sync, provider failure, partial multi-provider failure, and Resource update/Change persistence consistency.

### CLI

Cover no Changes, one Change, multiple Changes, compact field rendering, offline behavior, and invalid optional Resource reference if filtering is implemented.

### Regression

Preserve all Sprint 001–009 behavior and tests.

---

## Manual Verification

Use the real local environment without mutating external infrastructure:

```bash
bun run combie sync
bun run combie changes
bun run combie sync
bun run combie changes
```

Expected when providers have not changed:

```text
first post-upgrade sync:
only genuine normalized differences, if any, may be recorded

second identical sync:
no additional Changes
```

Be cautious with the first sync after introducing comparison. Existing persisted Resources may differ because Combie normalization code evolved rather than because the external provider changed.

If this occurs, document it as a baseline/migration issue rather than pretending it is an external operational event.

Positive Change behavior should be proven through deterministic tests/fixtures rather than modifying real provider resources solely for validation.

---

## Baseline / Upgrade Semantics

The local database already contains Resources created by earlier Combie versions.

A first-run difference may represent either an actual provider change or a normalization/schema behavior change between Combie versions.

Do not overclaim historical truth.

Inspect whether current Resource representation is stable enough to compare against the existing DB safely. If not, use the smallest baseline strategy necessary so Sprint 010 begins observing trustworthy transitions going forward.

Do not build a migration framework solely for this. Record the chosen behavior in completion notes.

---

## No Interpretation or Correlation

Sprint 010 records facts like:

```text
metadata.domains changed
```

It does not infer:

```text
"the production domain was migrated"
```

It also does not correlate changes across Vercel, Cloudflare, GitHub, or Sentry even if they occur in the same sync.

Interpretation and correlation belong later.

---

## No Memory Engine Yet

A durable Change record is a building block for operational memory, not a large Memory subsystem.

Do not introduce Memory, MemoryStore, MemoryEngine, OperationalMemoryEngine, Episode, Experience, or LearningRecord concepts.

---

## Explicitly Out of Scope

Do not implement:

- Resource deletion/tombstones unless already trivially authoritative
- Relationship change history
- provider events/webhooks
- logs, metrics, traces, or telemetry
- Sentry issues/events
- deployment history
- Git commit history
- generalized Observations
- timelines
- investigations
- correlation or causality
- impact analysis
- recommendations
- learning loops
- AI/LLM interpretation
- embeddings/vector storage
- graph traversal/database
- new Relationships
- new providers
- Slack
- MCP
- API server
- SDK
- web app
- controlled/autonomous execution
- hosted Combie
- billing
- retention policies
- broad CLI redesign

Do not scaffold these capabilities.

---

## Anti-Overengineering Rules

Do not introduce:

```text
MemoryEngine
EventBus
EventSourcingFramework
ObservationEngine
DiffEngine framework
TimelineEngine
HistoryEngine
ChangePluginRuntime
```

A small pure comparison function plus a durable Change record is likely enough.

If a helper naturally emerges, name it for what it does today.

---

## Canon

Permanent Combie Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Sprint 010 may mark the beginning of the roadmap's Memory capability. Update Canon only if existing documents become materially inaccurate.

Do not create a permanent Memory architecture document yet.

---

## Sprint Completion Notes

### Implemented

- Added the provider-independent `Change`/`ChangeField` domain primitive and a
  pure normalized-Resource comparison over `name` and `metadata`.
- Added durable SQLite `changes` storage plus one atomic `applyResource`
  boundary that reads previous state, resolves explicitly unknown metadata,
  records at most one Change, and upserts current state in one transaction.
- Integrated successful syncs at that boundary with one provider observation
  timestamp and a unique local UUID for each observed Resource transition.
- Canonicalized only proven set-like normalized arrays: Vercel custom domains,
  Cloudflare Worker handlers, and Cloudflare zone name servers. Other arrays
  remain order-sensitive.
- Preserved last authoritative Vercel domain facts when enrichment is unknown,
  while separately tracking current-run domain authority so stale evidence can
  neither create a new `uses_domain_in` edge nor trigger unsupported cleanup.
- Added the offline `combie changes` read path with compact time, Resource,
  kind, and changed-field output.
- Added focused domain, normalization, persistence, sync, authority, failure,
  relationship-regression, restart, transaction, baseline, and CLI tests.

### Change Contract

`Change` contains `id`, `resourceId`, `kind: "updated"`, `observedAt`, and a
sorted list of `{path, before, after}` fields. The ID is a UUID generated for
the local observation; unchanged repeated syncs produce no row, while a later
A→B→A transition produces two distinct Changes. `observedAt` is captured once
after a provider's authoritative discovery succeeds and is shared by its
Resources for that sync boundary.

Meaningful comparison includes Resource `name` and normalized `metadata`.
Stable identity (`id`, `provider`, `providerResourceId`, `kind`) is not mutable
state. Top-level Resource `createdAt`/`updatedAt` are Combie bookkeeping and are
ignored; provider timestamps inside metadata remain meaningful facts. Storage
uses explicit presence flags so added/removed fields survive JSON round trips
without losing `undefined` before/after evidence.

### Comparison Semantics

Objects compare recursively by sorted keys, so serialization/key order cannot
create noise. Changed object leaves become compact field paths; arrays are
atomic evidence and remain order-sensitive by default. Set-like provider facts
are deterministically sorted at their existing normalization boundary rather
than globally sorted by the detector.

Vercel `metadata.domains: []` is authoritative known-empty. An omitted
`domains` key is unknown enrichment, so the prior authoritative value is
preserved for comparison and current-state persistence. Other omitted metadata
remains authoritative; for example, missing Git linkage can still remove a
`source_for` edge.

### Baseline Semantics

The one-time `change_detection_v1` migration records per-Resource baseline
markers for rows that predate Sprint 010. Each marker is consumed only when
that exact Resource next arrives through a successful sync; current state is
updated without fabricating historical Change evidence. Fresh databases seed
no markers, and initial discovery naturally creates no `updated` Change.
Per-Resource consumption remains safe when only some providers succeed.

### Failure Semantics

Provider discovery failures never enter Resource comparison and produce no
Changes. Successful providers still persist valid Changes during a partial
multi-provider failure. Unknown Vercel domain enrichment preserves the last
authoritative fact and produces no fabricated removal. Change insertion and
Resource upsert share a per-Resource SQLite transaction; if Change persistence
fails, the Resource update rolls back. Relationship refresh retains its
existing provider-success gates and does not gain history.

### Architecture Pressure Results

Normalized Resource state was sufficient for provider-independent detection;
no provider-specific detector was required. The existing Resource identity,
provider adapters, sync success boundaries, Store conventions, and SQLite
database all held. Relationship semantics remained current-state Context.

The only concrete pressure was field-level authority: persisted last-known
domain facts must be distinct from current-run authority during relationship
refresh. This required one small sync-result fact, not a general authority,
event, diff, or memory framework.

### Deviations

`None`.

### Validation

- Automated: 251 tests pass across 22 files; `bun run typecheck` passes. Tests
  cover identity, bookkeeping, object order, relevant array semantics, initial
  discovery, multiple fields, unknown enrichment, provider/partial failure,
  persistence/restart, rollback, baseline consumption, repeated identical
  sync, A→B→A, CLI output/offline behavior, and all prior relationships.
- Live: the upgraded local database baselined 45 existing Resources. Two
  read-only Cloudflare/Vercel syncs each stored the same 1 zone + 44 projects;
  `combie changes` remained empty after both, proving no duplicate/noise path
  without mutating external infrastructure.
- Secret safety: provider tokens remained in the separate credential store and
  did not appear in Change evidence, the domain database output, errors, or CLI
  output.

### Learnings

> Can Combie reliably detect meaningful Resource transitions without provider-specific change detectors?

**Yes.** A small recursive comparison over normalized Resource facts detected
the required transitions. Concrete set semantics stayed in provider
normalizers, while the detector remained provider-independent.

> Is a compact durable Change primitive sufficient as the next foundation, or did implementation reveal a missing prerequisite before broader operational memory?

**It is sufficient for this foundation.** The implementation required only
compact field evidence, durable local ordering, a safe update transaction, and
an upgrade baseline. It did not reveal a prerequisite for a MemoryEngine,
events, observations, timelines, correlation, or interpretation.

### Canon Changes

`None`.

Do not define or implement Sprint 011 here.

---

## Definition of Done

Sprint 010 is complete only when:

- [x] Sprint 009 repository is inspected first
- [x] Repository Understanding report is produced
- [x] Architecture Pressure report is produced
- [x] meaningful Resource comparison boundary is explicitly defined
- [x] bookkeeping does not create false Changes
- [x] provider-normalized state drives comparison
- [x] initial discovery does not masquerade as an update
- [x] meaningful update creates one compact durable Change
- [x] unchanged repeated sync creates no Change
- [x] before/after evidence explains the transition
- [x] Change identity does not collapse legitimate later transitions
- [x] unknown Vercel enrichment does not fabricate domain removal
- [x] provider failure does not fabricate Changes
- [x] persistence survives restart
- [x] Resource update + Change persistence failure semantics are explicit and safe
- [x] baseline behavior for existing databases is documented
- [x] `combie changes` reads local state offline
- [x] no Relationship history is added
- [x] `source_for` remains correct
- [x] `uses_domain_in` remains correct
- [x] provider adapters remain independent
- [x] no AI/fuzzy/correlation logic is introduced
- [x] positive change detection is fixture/test proven
- [x] live repeated-sync no-change path is verified
- [x] all Sprint 001–009 behavior remains functional
- [x] all tests pass
- [x] typecheck/lint requirements pass
- [x] no secrets are stored or printed
- [x] full diff is reviewed
- [x] Canon remains accurate
- [x] completion notes are updated
- [x] repository state is clean

---

## What Sprint 010 Proves

Before:

```text
Engineering world
      ↓ sync
current Resources
      ↓
Relationships
      ↓
Context
```

After:

```text
Engineering world
      ↓ sync
incoming Resource
      │
      ├──── compare ──── previous Resource
      │                      │
      │                      ▼
      │                    Change
      ▼
current Resource
      ↓
Relationships
      ↓
Context
```

Combie begins preserving not only `what is true now`, but also `what became different`.

That is the first primitive required for operational memory.

---

## Final Principle

> **Before Combie can remember what happened, it must reliably recognize that something changed.**

Compare normalized facts.

Ignore synchronization noise.

Preserve compact evidence.

Do not infer meaning.

Do not correlate.

Do not build the memory system yet.

Detect the transition.

Then stop.
