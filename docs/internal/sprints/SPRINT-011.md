# SPRINT-011 — Resource History

> **Roadmap:** v0.3 — Memory
> **Status:** Complete
> **Depends on:** SPRINT-010 — Resource Change Detection
> **Scope:** Turn current Resource state + persisted Changes into useful per-Resource operational history
> **New durable domain primitives:** None
> **New provider reads:** None

## Goal

Make the history of a specific Resource directly inspectable from Combie's existing local knowledge.

Sprint 010 taught Combie to detect and persist meaningful Resource transitions:

```text
Previous Resource → compare → Incoming Resource
                         ├──→ Current Resource
                         └──→ Change
```

Sprint 011 should answer:

> **What has happened to this Resource over time?**

using only:

```text
Current Resource + ordered Changes
```

The preferred product surface is:

```bash
combie history <resource-id>
```

Sprint 011 does **not** introduce a Timeline model, History table, MemoryEngine, investigation system, or new provider ingestion. It proves whether the primitives Combie already has are sufficient to produce useful operational history.

## Why This Sprint Exists

Combie can now answer:

```text
combie resources
→ What exists?

combie relationships
→ How is it connected?

combie related <resource-id>
→ What is around this Resource?

combie changes
→ What changed across the system?
```

But `combie changes` is system-oriented. The next useful question is Resource-oriented:

```text
I am looking at this Vercel project.
What has changed about it?
```

A global Change stream is useful for observation. A Resource history is useful for understanding.

Sprint 011 should provide that understanding without creating another persistence concept.

## Sprint Principle

> **History is a read model over facts Combie already stores.**

Do not persist a second copy of history. Do not create timeline rows from Change rows. Do not build an event system. Do not call providers.

Read:

```text
Resource + Changes for Resource
```

and present them coherently.

## Product Outcome

Given a current Resource and persisted Changes, Combie should provide a Resource-focused history such as:

```text
$ combie history vercel:project:prj_123

Vercel project: combie-web
vercel:project:prj_123

CURRENT
name       combie-web

HISTORY

2026-08-12 14:31
metadata.domains
[] → [app.combie.dev]

2026-08-10 09:14
name
combie → combie-web
```

This output is illustrative. Follow the repository's actual CLI conventions and Sprint 010 Change evidence shape.

## Core Architectural Hypothesis

Sprint 011 tests:

> **Can useful Resource history be derived entirely from current Resource state plus ordered Change records?**

Preferred architecture:

```text
SQLite
   ├── Resource
   └── Change[]
          ↓
   Resource History read
          ↓
      CLI formatter
          ↓
   combie history
```

Not:

```text
Changes → Timeline table → History records → History engine
```

If current primitives are insufficient, document the exact missing requirement. Do not automatically solve it by introducing a new subsystem.

## Scope

Sprint 011 includes:

1. inspect the Sprint 010 `Change` primitive and persistence API
2. add the smallest storage query needed to list Changes for one Resource
3. define a lightweight application-level Resource History read model only if useful
4. order Changes deterministically
5. expose current Resource identity/context alongside its Changes
6. implement `combie history <resource-id>`
7. support Resources with zero Changes
8. support Resources with one or many Changes
9. preserve compact before/after evidence and multi-field grouping
10. ensure reads are fully offline
11. define minimal behavior for historical Changes without a current Resource only if that state is possible today
12. test persistence/restart behavior
13. preserve `combie changes`
14. preserve Resources, Relationships, sync, and Change detection
15. validate against the real local database
16. stop before investigations or multi-Resource timelines

Everything else is out of scope.

## No New Durable History Model

Do not add:

```text
history
resource_history
timeline
timeline_entries
memory
episodes
```

tables.

Sprint 010 already persisted the durable historical fact: `Change`.

A TypeScript read/view type such as:

```ts
type ResourceHistory = {
  resource: Resource
  changes: Change[]
}
```

is acceptable if it improves boundaries. It is not a new durable domain primitive.

## Storage

The expected storage addition is small, conceptually:

```ts
listChangesForResource(resourceId)
```

Requirements:

- exact stable Resource ID
- deterministic ordering
- no provider calls
- no mutation
- efficient enough for current SQLite scale

If an index on `changes.resource_id` is clearly justified by the actual schema/query, use repository conventions and document it. Do not broaden this into optimization work.

## Ordering

History ordering must be explicit and deterministic.

Preferred user-facing order:

```text
newest → oldest
```

If timestamps can tie, use the smallest deterministic secondary ordering already supported by Change identity/storage.

Do not rely on incidental SQLite row order.

## Current State vs Historical Changes

Make a clear distinction between:

```text
CURRENT
```

and:

```text
HISTORY
```

The Resource table remains authoritative current state. Changes remain observed transitions.

Do not reconstruct the current Resource from Changes when the current Resource exists.

Preferred model:

```text
Current Resource = Resource table
Past transitions = Change table
```

## Historical Reconstruction

Full point-in-time state reconstruction is out of scope.

Sprint 011 does not need to answer:

```text
What did the entire Resource look like at 10:32 AM?
```

Do not implement event replay, Resource snapshots, reverse-diff reconstruction, or temporal queries.

## CLI Contract

Preferred command:

```bash
combie history <resource-id>
```

Use the deterministic Resource reference established by earlier Sprints:

```text
provider:kind:providerResourceId
```

Do not add fuzzy name resolution or ambiguous display-name lookup.

## CLI Output

Prioritize:

1. which Resource this is
2. compact current state
3. what changed
4. when Combie observed each Change
5. before/after evidence

Avoid dumping full Resource JSON unless existing CLI conventions demand it.

If a Change contains multiple field diffs, group them under the same observed Change rather than pretending each field was a separate observation.

## Current Resource Summary

Keep `CURRENT` lean.

At minimum, identify:

```text
provider
kind
name
stable Resource id
```

Reuse existing compact formatting where appropriate. This Sprint is not a new `resource inspect` feature.

## Zero-History State

A Resource with no Changes is valid:

```text
Cloudflare zone: usecmd.dev
cloudflare:zone:...

No changes recorded yet.
```

Do not imply the Resource never changed before Combie observed it.

The precise meaning is:

> Combie has not recorded a Change for this Resource since its trustworthy Change baseline.

## Resource Not Found

For an unknown exact Resource ID, return a clear non-success result consistent with `combie related` or existing exact-reference commands.

Do not fuzzy search. Do not call providers.

## Historical Changes Without Current Resource

Inspect whether current storage semantics can produce:

```text
Change rows exist
Resource row absent
```

Resource deletion history is not part of Sprint 010, so this may be impossible normally.

Do not invent tombstone semantics. Handle this only if repository reality requires it, and keep the behavior explicit and minimal.

## `combie changes` Relationship

`combie changes` remains the global system Change feed.

`combie history <resource-id>` becomes the Resource-scoped view.

```text
combie changes
→ system perspective

combie history <resource>
→ Resource perspective
```

Do not merge or replace the commands.

## Related Context

Do not automatically include Relationships in `combie history`.

Keep:

```text
combie related <resource>
```

and:

```text
combie history <resource>
```

separate.

If tiny shared Resource-header formatting emerges naturally, reuse it. Do not create a generalized ResourceView framework.

## Change Evidence Formatting

Consume Sprint 010 evidence faithfully.

Do not reinterpret:

```text
metadata.domains changed
```

into:

```text
production domain migrated
```

Do not infer causes, impact, or intent. Do not summarize with AI.

Display facts.

## Multiple Field Changes

If one Change observed:

```text
name:
  combie → combie-web

metadata.domains:
  [] → [app.combie.dev]
```

show both fields under the same Change observation.

Preserve the fact that Combie observed them together.

## Time Semantics

Use Sprint 010's `observedAt` semantics.

Do not relabel it as `occurredAt`, `providerChangedAt`, or `deployedAt`.

Combie knows when **Combie observed the transition**, not necessarily when the external system originally changed.

## Offline Requirement

The entire history path must work with provider credentials unavailable.

`combie history <resource-id>` must read SQLite only and must not require a sync first.

## Architecture Pressure Report

Before implementation, inspect the completed Sprint 010 repository and answer:

1. What is the exact `Change` domain shape?
2. How is `resourceId` represented?
3. How is `observedAt` stored?
4. How are changed fields/evidence represented?
5. What Change-listing APIs already exist?
6. Is per-Resource filtering already supported internally?
7. What ordering does `combie changes` currently use?
8. Is ordering deterministic under equal timestamps?
9. How does `combie related` resolve exact Resource IDs and handle not-found?
10. Can those patterns be reused for `history` without coupling commands?
11. Is a Resource History application read model useful, or is a simple function sufficient?
12. Is any new persistence concept actually required?
13. Does `changes.resource_id` need an index at current scale?
14. Can history remain entirely offline?
15. Does implementation pressure reveal any reason Change is insufficient as the durable history primitive?

The preferred answer to #12 is `no`, but repository reality wins.

## Repository Understanding Requirement

Before coding, follow `skills/build-combie/SKILL.md` and inspect Sprint 010 at commit:

```text
faa4d4b
```

Identify:

- Resource domain model
- Change domain model
- Change identity
- Change evidence shape
- Change persistence schema
- Store Change APIs
- current Change ordering
- `combie changes` application/CLI path
- exact Resource lookup behavior
- `combie related` not-found behavior
- timestamp formatting utilities
- CLI formatting conventions
- test fixture patterns
- smallest insertion point for Resource History

Do not redesign working Sprint 010 behavior.

## Implementation Plan Requirement

Before coding, produce a concise plan covering:

- storage query
- ordering contract
- optional application read model
- exact Resource lookup
- current Resource summary
- Change evidence formatting
- zero-history behavior
- not-found behavior
- offline behavior
- CLI command wiring
- tests
- live verification

Then implement.

## Implementation Discipline

Follow:

```text
Red → Green → Refactor
```

Prefer the smallest vertical slice:

```text
Store query → App read → CLI
```

Do not build infrastructure for future investigations.

## Testing Strategy

All Sprint 001–010 tests must remain green.

### Storage Tests

Cover:

- no Changes for Resource
- one Change
- multiple Changes
- Changes for other Resources excluded
- newest-first ordering
- deterministic tie ordering if relevant
- persistence across reopen/restart
- read does not mutate state

### Application Tests

Cover:

- existing Resource + zero Changes
- existing Resource + one Change
- existing Resource + multiple Changes
- one Change with multiple field diffs remains grouped
- exact Resource identity
- unknown Resource
- observed timestamp preserved
- before/after evidence preserved

### CLI Tests

Cover `combie history <resource-id>` for:

- zero history
- one Change
- multiple Changes
- multiple fields in one Change
- invalid/missing argument
- unknown Resource
- representative provider Resources
- offline read

Fixtures are sufficient when live Resources have no Changes.

### Regression Tests

Verify:

- `combie changes` unchanged
- `combie resources` unchanged
- `combie relationships` unchanged
- `combie related` unchanged
- sync unchanged
- Change detection unchanged
- no provider calls from history

## Live Verification

Use the existing local Combie database created through Sprint 010.

Run:

```bash
bun run combie changes
bun run combie resources
bun run combie history <resource-id>
```

Given Sprint 010's live verification created zero false Changes, a valid current result may be:

```text
No changes recorded yet.
```

That is successful.

Then verify the command remains functional with provider credentials removed from the environment.

Do not mutate Vercel, Cloudflare, GitHub, or Sentry merely to manufacture live history.

Positive history rendering should be proven through deterministic tests/fixtures if the live DB has no Changes.

## Validation Questions

At completion answer:

1. Can Resource history be derived without new durable state?
2. Does history preserve observation-time semantics?
3. Is the zero-Change state useful and accurate?
4. Does one Change with multiple field diffs remain one observation?
5. Is Change sufficient as the durable historical primitive?

Do not speculate beyond what Sprint 011 proves.

## No Timeline Model

Do not create durable concepts such as:

```text
Timeline
TimelineEntry
HistoryEvent
HistoricalResource
ResourceSnapshot
```

A presentation-only structure is acceptable if necessary, but it must not become another persisted source of truth.

## No Cross-Resource History

Do not turn Sprint 011 into:

```text
show everything that changed around this Resource
```

That requires combining Relationships + Changes + time and begins to approach investigations.

Sprint 011 is one Resource only.

## No Investigation Yet

Do not answer:

```text
Why did this change?
What caused it?
What was impacted?
What else changed?
Was this related to an incident?
```

Sprint 011 answers only:

```text
What did Combie observe changing on this Resource?
```

## Explicitly Out of Scope

Do not implement:

- new durable history/timeline tables
- Resource snapshots
- point-in-time reconstruction
- event replay
- Resource deletion history
- Relationship history
- cross-Resource timelines
- multi-hop traversal
- investigation sessions
- incident correlation
- causality
- impact analysis
- recommendations
- confidence scores
- AI summaries
- embeddings/vector storage
- telemetry/logs/metrics/traces
- Sentry issues/events
- deployment history
- Git commit history
- webhooks
- polling beyond existing sync
- new providers
- new Relationship kinds
- Slack
- MCP
- API server
- SDK
- web app
- controlled/autonomous execution
- hosted Combie
- billing
- retention/pruning
- broad CLI redesign

Do not scaffold them.

## Anti-Overengineering Rules

Do not introduce:

```text
HistoryEngine
TimelineEngine
MemoryEngine
EventStore
EventBus
HistoryRepository abstraction
ResourceView framework
```

The expected implementation is small:

```text
listChangesForResource
        ↓
getResourceHistory
        ↓
formatResourceHistory
        ↓
combie history
```

Even `getResourceHistory` should exist only if it creates a useful application boundary.

## Canon

Permanent Combie Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Sprint 011 should not require a new permanent document.

Update Canon only if existing descriptions of Memory become materially inaccurate.

## Sprint Completion Notes

### Implemented

- Added `Store.listChangesForResource(resourceId)` as an exact SQLite query over
  Sprint 010 Change records, with a matching composite index.
- Added the application-level `ResourceHistory` read model and local-only
  `getResourceHistory` service.
- Added compact formatting that keeps `CURRENT` and `HISTORY` distinct, shows
  exact observation timestamps, and preserves each Change's grouped field
  evidence, including absent values.
- Added `combie history <resource-id>` with exact lookup, actionable missing and
  not-found behavior, help text, and no provider or credential dependency.
- Added storage, application, and CLI coverage for zero, one, and multiple
  Changes, exact filtering, deterministic ordering, restart persistence,
  evidence preservation, no mutation, and offline reads.

### History Contract

- Resource lookup uses the entire trimmed deterministic ID
  `provider:kind:providerResourceId` as an opaque exact key. No display-name or
  fuzzy resolution occurs.
- The current Resource comes only from Resource persistence. Historical
  transitions come only from persisted Change records; history does not replay
  Changes or reconstruct current state.
- Scoped history is newest-first by `observed_at DESC`, with stable Change
  identity `id DESC` as the deterministic equal-time tie-break. A timestamp tie
  carries no finer chronological or causal claim. The unchanged global
  `combie changes` feed retains Sprint 010's `rowid DESC` tie-break.
- `observedAt` is displayed exactly as the time Combie observed the transition,
  not the time the provider necessarily changed.
- All field diffs belonging to one Change remain grouped as one observation;
  compact before/after values preserve arrays, objects, `null`, and absent
  values without interpretation.
- `No changes recorded yet` means Combie has recorded no Change for the Resource
  since its trustworthy Change baseline. It does not claim the Resource never
  changed earlier.
- A Change without a current Resource is not produced by normal application
  behavior. History requires a current exact Resource and returns not-found
  rather than inventing deletion or tombstone semantics.

### Architecture Pressure Results

- Change remained sufficient as the sole durable historical primitive, while
  Resource remained authoritative current state.
- No History, Timeline, snapshot, event, replay, or other durable model was
  required.
- SQLite remained sufficient. The only persistence addition was a scoped query
  and its narrowly matched composite index.
- Existing exact-resource lookup, not-found, Store lifecycle, and CLI dispatch
  patterns were reusable without coupling `history` to `related`.
- No provider reads, credentials, sync changes, Relationship reads, or new
  provider/domain behavior were required.

### Validation

- Focused history/storage/CLI validation: 53 tests passed.
- Full regression suite: 261 tests and 1,031 expectations passed across 23 files.
- `bun run typecheck` passed.
- `bun run combie -- help` and `git diff --check` passed.
- Existing local Sprint 010 database: 45 current Resources and zero false
  Changes. `combie changes` returned its existing zero state; `combie resources`
  listed the current inventory.
- Live local read of
  `cloudflare:zone:78585893066d32991f2a74a1543c5b58` rendered current
  `usecmd.dev` state and the accurate trustworthy zero-history message.
- The same `history`, `changes`, and `resources` reads succeeded with all
  supported provider credential environment variables removed.
- Deterministic fixtures prove positive one/many Change rendering, multi-field
  grouping, exact evidence, observation timestamps, restart persistence, and no
  Resource/Change/Relationship mutation.
- Independent storage/domain, application/CLI, and architecture/scope reviews
  reported no actionable code defects or scope regressions.

### Deviations

None.

### Learnings

- Yes. Combie can produce useful Resource history entirely from authoritative
  current Resource state plus ordered, grouped Change records.
- No. Implementation revealed no concrete need for another memory primitive
  before investigations are explored. Sprint 010's Change evidence and current
  Resource persistence were sufficient for this read model.

### Canon Changes

None.

## Definition of Done

Sprint 011 is complete only when:

- [x] Sprint 010 repository at `faa4d4b` is inspected first
- [x] Repository Understanding report is produced
- [x] Architecture Pressure report is produced
- [x] no new durable History/Timeline model is introduced
- [x] exact stable Resource reference is used
- [x] per-Resource Changes can be queried
- [x] Change ordering is explicit and deterministic
- [x] current Resource remains current-state authority
- [x] Change remains historical-transition authority
- [x] `combie history <resource-id>` is implemented
- [x] current Resource identity is shown compactly
- [x] zero-history state is clear and accurate
- [x] one Change renders correctly
- [x] multiple Changes render correctly
- [x] multiple fields from one Change remain grouped
- [x] before/after evidence is preserved
- [x] observed-time semantics are preserved
- [x] unknown Resource behavior is explicit
- [x] history reads work offline
- [x] history reads do not mutate state
- [x] no provider API calls occur during history reads
- [x] `combie changes` remains unchanged
- [x] `combie related` remains unchanged
- [x] `source_for` remains correct
- [x] `uses_domain_in` remains correct
- [x] sync and Change detection remain correct
- [x] positive history is fixture/test proven
- [x] real local zero-history or existing-history path is verified
- [x] all Sprint 001–010 behavior remains functional
- [x] all tests pass
- [x] typecheck/lint requirements pass
- [x] no secrets are stored or printed
- [x] full diff is reviewed
- [x] Canon remains accurate
- [x] completion notes are updated
- [x] repository state is clean

## What Sprint 011 Proves

Before Sprint 011:

```text
Engineering stack
      ↓
Resources
   ├── current state
   ├── Relationships
   └── Changes

combie changes
→ global change feed
```

After Sprint 011:

```text
Resource
   ├── Current State
   └── Ordered Changes
          ↓
   Resource History

combie history <resource>
→ operational history for one thing
```

The key architectural result is:

```text
History ≠ new stored object

History =
Current Resource
+
Observed Changes
```

If this holds under implementation pressure, Combie's Memory foundation remains extremely small.

## Final Principle

> **Do not store history twice.**

The Resource tells Combie what is true now.

Changes tell Combie what it observed becoming different.

Sprint 011 simply makes those facts useful together.

Build the read path.

Prove the primitive.

Then stop.
