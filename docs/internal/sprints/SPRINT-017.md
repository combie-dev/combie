# SPRINT-017 --- Investigation Timeline

> **Status:** Complete **Depends on:** SPRINT-016 (`b23073b`) **Phase:**
> Investigation foundation **Primary goal:** Merge the Changes already
> contained in one InvestigationContext into a single deterministic
> cross-resource chronological evidence view, preserving Resource and
> Relationship provenance **AI / root-cause inference / scoring:** None
> **New provider calls:** None **New durable domain model:** None ---
> ephemeral application DTO only **New persistence:** None

## Goal

Sprint 016 assembled what Combie knows around one Resource into a
bounded `InvestigationContext`:

``` text
InvestigationContext
        │
        ├── Subject Changes
        ├── Related Resource A Changes
        ├── Related Resource B Changes
        └── ...
```

That knowledge is grouped by Resource and presented per Resource.

Sprint 017 composes those already-collected Changes into **one
deterministic cross-resource chronological evidence view** --- the
Investigation Timeline:

``` text
10:03  GitHub repository   field X changed
10:07  Vercel project      field Y changed
10:09  Cloudflare zone     field Z changed
```

The timeline is a read-only derivation. It reorders nothing persistent,
invents nothing, and claims nothing.

It is the smallest missing primitive Sprint 016 explicitly identified:

> A deterministic cross-resource Change merge/timeline that orders
> Changes from the subject and its one-hop neighbors by `observedAt`
> (with stable tie-break) while preserving per-Resource identity and
> without claiming causality.

This Sprint builds exactly that, and nothing around it.

------------------------------------------------------------------------

## Why Now

Sprint 016 proved Combie can compose investigation context:

``` text
subject
  ├── subject Changes
  └── one-hop Relationships
        └── directly related Resources
              └── their Changes
```

But an investigator reading context still asks:

> What changed recently across everything related to this Resource, **in
> one order**?

Today that question is answered only Resource-by-Resource --- each
Change list is scoped to one Resource. Cross-Resource timing cannot even
be glanced at from a single read.

The Changes already exist in the `InvestigationContext`. The evidence
already exists. What is missing is a single, trustworthy temporal
composition over the bounded evidence set.

Sprint 017 adds that composition --- and nothing more.

------------------------------------------------------------------------

## Product Question

This Sprint should answer:

> **Can Combie deterministically order the Changes it already knows
> about a bounded InvestigationContext into one chronological sequence
> while preserving exactly which Resource and Relationship each Change
> belongs to?**

If yes, investigations gain a trustworthy "what happened when" view
built entirely from existing memory --- the substrate later Sprints may
build temporal observations on.

------------------------------------------------------------------------

## Core Principle

> **Time proximity is presentation, not causality.**

Combie may present:

``` text
10:03  GitHub repository   field X changed
10:07  Vercel project      field Y changed
```

It must never present:

``` text
10:03  GitHub repository   caused Vercel to change
10:07  Vercel project      correlated with GitHub change
10:03  …explains… 10:07
10:07  suspicious / important / root cause
```

Changes are observed facts. A timeline is how Combie presents them in
time order. Time order is not an inference. It is a deterministic
presentation of stored timestamps.

The timeline must remain:

-   deterministic
-   offline
-   read-only
-   provider-independent
-   derived entirely from the existing `InvestigationContext` and
    persisted Knowledge
-   free of AI, LLM reasoning, scoring, confidence, anomaly detection,
    correlation, observations, hypotheses, and root-cause analysis

------------------------------------------------------------------------

## Scope and Boundary

The timeline is **scoped to the bounded one-hop `InvestigationContext`**
for the requested subject Resource.

Given:

``` text
A → B → C
```

Investigating A may include:

``` text
A Changes
B Changes
```

and never C Changes solely because C is related to B.

No recursive graph traversal. No graph engine. No global timeline. No
provider reads. No new Relationships.

The timeline does not extend the context boundary --- it merges what the
context already contains.

------------------------------------------------------------------------

## Proposed Application Primitive

The smallest trustworthy shape conceptually resembles:

``` ts
type InvestigationTimelineEntry = {
  change: Change;                                // exact persisted Change record
  resource: Resource;                            // the Resource the Change belongs to
  role: "subject" | "related";                   // relation to the investigation
  relationships: {                              // provenance: canonical Relationship path(s)
    relationship: Relationship;                  // full canonical Relationship + evidence
    direction: RelatedDirection;                 // "outbound" | "inbound" from subject
  }[];                                           // empty for subject entries
};

type InvestigationTimeline = {
  subject: Resource;
  entries: InvestigationTimelineEntry[];         // deterministic order
};
```

This is a conceptual shape, not mandatory syntax.

Reuse existing domain types (`Change`, `Resource`, `Relationship`)
directly.

Prefer an ephemeral application DTO over a new domain model --- see
Architecture Pressure item 3.

Composition should be a pure function over the existing
`InvestigationContext`:

``` ts
composeInvestigationTimeline(context: InvestigationContext): InvestigationTimeline
```

No new storage reads are expected --- all input already exists in the
context.

------------------------------------------------------------------------

## Provenance Contract

Each timeline entry must answer every one of these questions
deterministically:

  --------------------------------------------------------------------------
  Question                            Where the answer lives
  ----------------------------------- --------------------------------------
  What Change is this?                `change.id`, `change.kind`, exact
                                      `change.fields` (before/after, absent
                                      values preserved)

  Which Resource changed?             `resource.id`, provider/kind/name of
                                      `resource`

  Is that Resource the subject or a   `role: "subject" \| "related"`
  related Resource?

  If related, what canonical          full `Relationship` object (id, kind,
  Relationship connects it?           evidence) in `relationships[]` --- one
                                      or more

  What direction is that Relationship `direction: "outbound" \| "inbound"`
  from the subject's perspective?     per Relationship

  When was the Change observed?       `change.observedAt` verbatim --- exact
                                      persisted string

  What exact Change evidence already  the full intact `Change` record ---
  exists?                             nothing truncated, nothing
                                      reinterpreted
  --------------------------------------------------------------------------

Decide and document how this lands in the final DTO in the Architecture
Pressure report; the requirements above are mandatory regardless.

------------------------------------------------------------------------

## Ordering

### Primary Ordinal

Order primarily by existing exact persisted `observedAt` timestamps.

`observedAt` is an ISO-8601 UTC string with millisecond precision, e.g.
`2026-08-08T10:03:00.000Z`. String comparison equals chronological
comparison. Use the persisted values verbatim. Do not parse, normalize,
round, or bucket.

### Direction --- newest first

**Decision: the timeline is presented newest → oldest.**

The existing History ordering (`observed_at DESC, id DESC`) is newest
first. The `SUBJECT CHANGES` and per-Related `CHANGES` blocks in Sprint
016 are also newest first. A timeline section that flipped direction
would break the reading flow of the whole view and force the reader to
re-think order between two adjacent sections.

But do not inherit blindly: History is a per-Resource ledger of change
records; Timeline is a cross-Resource evidence view for investigation.
The two may legitimately read in different directions. Justify, do not
inherit.

Reasoning for newest → oldest in the timeline:

1.  **Recency is the anchor of an investigation.** The
    InvestigationContext is anchored on the subject's CURRENT state. The
    reader's first question is "what changed recently" --- walking
    backward from now matches the direction of typical investigation
    reading: recent first.
2.  **Consistency.** The rest of the `investigate` output (subject
    Changes, related Changes, History) is newest-first. Ending the view
    with a section that flips order would create a two-directional
    document.
3.  **Determinism.** The presentation direction is orthogonal to the
    merge correctness: the same total order applies under either
    direction. Because the sort is total and the tie-break
    deterministic, ascending order is exactly the reversal --- no
    semantic change (the ordering key must be direction-agnostic). A
    future Sprint may flip presentation only.

Therefore: **observedAt descending** with the tie-break below.

### Tie-break for identical `observedAt`

Identical timestamps are real: a single sync pass captures a `now` once
and applies it to many Changes (`src/app/sync.ts`). So identical
`observedAt` across and within Resources is a normal occurrence, not an
edge case.

For equal `observedAt`, order by existing stable identities --- the
persisted `Change.id`, descending:

``` text
observed_at DESC, id DESC
```

This mirrors the existing per-Resource History tie-break
(`Store.listChangesForResource`: `ORDER BY observed_at DESC, id DESC`)
and reuses a persistent stable identity. It does **not** rely on whether
another ordering (e.g. `rowid` in the global store list) exists; `rowid`
is incidental insertion order and must not be used.

Do not reinterpret or mutate Change records to create tie records. The
merge produces an ordered *view* over existing Change records.

Document the exact comparison implementation (string compare of
`observedAt`, then comparator on `id`) in the completion notes.

------------------------------------------------------------------------

## Ordering Choices to Pressure-Test in the Architecture Report

Answer explicitly:

-   **6. Chronological vs reverse chronological** --- recommend and
    justify one.
-   **7. Deterministic tie-break for identical `observedAt`** ---
    recommend the `observedAt DESC, id DESC` convention above or a
    documented alternative.

------------------------------------------------------------------------

## Chronology Boundaries

The timeline merges only:

``` text
subject Changes                                  (full history)
each related Resource's Changes                  (full history)
```

No new storage query. No new index. No batching.

------------------------------------------------------------------------

## CLI Placement --- Precisely Pressure-Tested

Two options exist:

**Option A --- extend `combie investigate <resource-id>`** with a
`TIMELINE` section appended under the existing output.

**Option B --- new narrow command `combie timeline <resource-id>`.**

Before deciding, inspect the current CLI and application boundaries (see
Repository Understanding Report below) and pressure-test:

-   Timelines for a subject and for related Resource A come from the
    *same* InvestigationContext --- no new capability is being added,
    only presentation. Investigate already resolves the subject,
    hydrates context, and formats everything.
-   A `timeline` command would need to re-resolve the Resource,
    re-compose the relatedness context algorithmically, idempotently
    re-run the merge pipeline --- or factor the shared work into a
    service both commands call. That is a real cost.
-   The investigation is the natural home of an investigation-scoped
    timeline: it is derived from the same bounded
    `InvestigationContext`, not from a new global or independently
    queried timeline capability.
-   Keeping the merge as a pure application primitive preserves the
    option to expose it through a dedicated command later if real
    product pressure appears, without committing Sprint 017 to a second
    CLI surface now.
-   The existing `formatInvestigationContext` output gives the timeline
    a section without adding a new command tangent.

### Recommendation

**Adopt Option A --- extend `combie investigate <resource-id>`.**

The application primitive for composition is extracted as a pure
function so it is independently testable and reviewable, and the CLI
keeps exactly one command. Record the complete decision rationale in the
Architecture Pressure report (item 5).

If later pressure (multi-resource or global timeline views) arrives, a
narrow `combie timeline <resource-id>` command can wrap the same pure
`composeInvestigationTimeline` primitive with small churn. That is
future pressure, not today's requirement.

------------------------------------------------------------------------

## CLI Output

Append a new deterministic section to the existing investigate output,
e.g.:

``` text
TIMELINE (newest first)

2026-08-08T10:09:00.000Z
Cloudflare zone: example.com
related to subject via uses_domain_in (outbound)
updated  field X: "old" → "new"

2026-08-08T10:07:00.000Z
Vercel project: demo-hub
subject
updated  field Y: "old" → "new"

2026-08-08T10:03:00.000Z
GitHub repository: sgr0691/demo-hub
related to subject via source_for (inbound)
updated  field Z: "old" → "new"
```

Actual formatting should follow existing Combie CLI conventions (see
`formatInvestigationContext` / `formatChange` in
`src/app/investigate.ts`). Every entry must answer the Provenance
Contract above.

Zero state is explicit, e.g.:

``` text
TIMELINE
No changes recorded in this context yet.
```

------------------------------------------------------------------------

## Persistence

This Sprint adds **zero new persistence**:

No:

``` text
timeline table
event table
observation table
investigations table
```

No durable timeline IDs. No timeline copy. No Change duplication.

The timeline is reproducible at any moment from the existing persisted
truth (Resources + Relationships + Changes). Use Sprint 016's
read-versus-mutation verification pattern.

------------------------------------------------------------------------

## Relationship and Direction Semantics

Reuse Sprint 016's direction semantics verbatim:

-   outbound: subject is Relationship source → `kind →`
-   inbound: subject is Relationship target → `← kind`
-   canonical `relationship.id` is never rewritten
-   Relationship evidence is carried in full, never summarized

When a related Resource has multiple Relationships to the subject
(e.g. two canonical edges), each entry must carry **all** connecting
Relationships with their evidence and directions; do not arbitrarily
pick one. Deterministic rule: list them in the same deterministic order
already established by `listRelationshipsForResource` (kind, then source
id, then target id --- the existing store ordering Sprint 016 reused for
related neighbors).

------------------------------------------------------------------------

## Read-Only and Offline

Composition reads only the already-composed `InvestigationContext` (or
the store reads Sprint 016 already performs). It must not require:

-   credentials
-   network
-   provider tokens
-   any new store writes

Prove with tests:

-   all credential env vars unset → timeline still composes
-   `fetch` that throws → still composes
-   DB content hash + record counts unchanged after repeated composition

------------------------------------------------------------------------

## Repository Understanding

Before implementation, produce a concise Repository Understanding
report. Inspect at minimum:

-   Sprint 016 `InvestigationContext` and `InvestigationNeighbor`
    (`src/app/investigate.ts`)
-   `getInvestigationContext` and `getInvestigationContextForResource`
    (`src/app/investigate.ts` --- note the resource-ref
    validation/resolution pattern shared with `related`, `history`, and
    `context` app functions)
-   the `related` composition in `src/app/related.ts`
-   `Change` domain model: `id`, `resourceId`, `kind`, `observedAt`,
    `fields` (`src/domain/change.ts`)
-   History ordering: `listChangesForResource` SQL
    (`src/storage/store.ts`) and `src/app/history.ts`
-   Relationship direction/provenance representation
    (`src/domain/relationship.ts`, `src/app/related.ts`)
-   related-context ordering (`listRelationshipsForResource` ordering,
    `src/storage/store.ts`)
-   Resource identity (`src/domain/resource.ts`)
-   CLI `investigate` formatting and dispatch (`src/cli/index.ts`,
    `src/app/investigate.ts` format functions)
-   Change storage/query APIs (`src/storage/store.ts`: `listChanges`,
    `listChangesForResource`, `mapChange`)
-   current tests: `tests/app/investigate.test.ts` (including `seedHub`,
    `snapshotPersistence` for read-only/offline proofs),
    `tests/app/history.test.ts`, `tests/cli/commands.test.ts` (help and
    command regressions)
-   current SQLite behavior: fixtures ordering, migration/schema
    versioning, and `observed_at`/`id` type and index definitions

Report what already exists, what can be reused, what must be added, and
what must remain untouched.

------------------------------------------------------------------------

## Architecture Pressure

Before implementing, inspect baseline `b23073b` and answer these
questions.

Write the answers to completion notes.

1.  Can the timeline be derived directly from `InvestigationContext`,
    without new storage queries?
2.  Is any additional storage query necessary?
3.  Is a new domain type required, or only an application DTO?
4.  Should timeline composition live inside an existing app module (e.g.
    related/history/investigate) or as a separate application primitive?
5.  Should the CLI extend `combie investigate` with a timeline section,
    or introduce a `timeline` command?
6.  What ordering is best for investigation --- chronological or reverse
    chronological? Document reasoning; do not just repeat History's
    choice.
7.  What deterministic tie-break should apply for identical `observedAt`
    timestamps?
8.  How is subject vs related provenance represented?
9.  How is Relationship provenance preserved for related changes?
10. What happens when a related Resource has multiple Relationships to
    the subject?
11. What happens when a Resource has zero Changes?
12. What happens when the entire InvestigationContext has zero Changes?
13. What happens with dangling Relationships (target Resource missing)?
14. Can this remain completely offline and read-only?
15. Does repeated composition produce byte/logically identical results?
16. Does this require any new indexes or batching?
17. Does anything require Canonical change?

Do not write code before this report exists.

------------------------------------------------------------------------

## Implementation Plan

Before coding, produce a concise plan covering:

-   `InvestigationTimelineEntry` / `InvestigationTimeline` DTO shape
-   composition function signature and whether a new
    `src/app/timeline.ts` is warranted
-   ordering comparator (observedAt, then id --- both descending)
-   how subject vs related and multi-relational edges are represented
-   how existing `RESOURCE_REF_REQUIRED` / `RESOURCE_NOT_FOUND`
    validation flows are reused; empty/zero timeline behavior and CLI
    output
-   how the CLI wires the new section into `combie investigate`
-   reuse of `formatChange`-style evidence rendering
-   read-only/offline proof
-   query profile (no reads beyond Sprint 016's current reads)
-   the test matrix of the Tests section

Then implement Red → Green → Refactor.

------------------------------------------------------------------------

## Performance

The merge is over the already-composed context (`subjectChanges` plus
per-related `changes` arrays). At current Combie scale this is trivial.

Avoid:

-   new indexes
-   new queries
-   caching
-   denormalized timeline tables
-   any batching

Record the read profile in the completion notes and prove it adds no new
queries beyond Sprint 016's existing composition reads.

------------------------------------------------------------------------

## Tests

All Sprint 001--016 tests must remain green.

New test coverage (application + CLI):

1.  subject Changes only (no related changes)
2.  related resource Changes only (no subject Changes)
3.  subject + related Changes interleaved in time at exact timestamp
    order
4.  multiple related resources in the timeline
5.  inbound and outbound Relationships both present
6.  multiple Relationship kinds
7.  identical timestamps across Resources → deterministic tie-break
    `id DESC`
8.  deterministic tie-breaking (identical timestamps) verified
9.  exact `observedAt` value preservation (string, spelled with
    precision)
10. complete Change evidence preservation: fields with before/after, and
    absent-values
11. Relationship provenance: evidence carried through onto the timeline
12. subject provenance: subject-defined entries correctly identified
13. zero Changes context (whole context, no entries)
14. related resource with zero Changes (no entries; zero context
    rendered without noise)
15. dangling Relationship behavior (missing neighbor → no fabricated
    Resource; no entry or explicit marker --- decide & test the chosen
    semantics)
16. no second-hop Changes: given A→B→C, timeline for A excludes C's
    changes
17. repeated composition run twice → byte-identical output
18. offline operation (all credentials envs unset, fetch broken)
19. database unchanged after reads (hash + record counts identical)
20. all existing commands/regressions still pass

Also CLI-level tests: `combie investigate <id>` renders the TIMELINE
section; the help test still passes; all Sprint 001--016 tests remain
green.

------------------------------------------------------------------------

## Live / Local Verification

Use the existing local database if it has useful
Resources/Relationships. E.g.:

``` bash
bun run combie investigate vercel:project:prj_abc --dir ./.combie
```

Check:

-   TIMELINE rendered in deterministic order
-   entries carry Resource + Relationship provenance
-   offline with credentials unset
-   database byte-identical after multiple invocations
-   if the live DB lacks Changes or multi-relation fixtures, document
    and validate via tests/fixtures

------------------------------------------------------------------------

## No Causality, No Scoring

The timeline must not:

-   claim that one Change `caused` another
-   claim correlation between Changes
-   label Changes as suspicious / important / root cause
-   rank Resources or Changes
-   produce confidence numbers

This is presentation of persisted timestamps with provenance, not an
inference engine.

------------------------------------------------------------------------

## Anti-Overengineering

Do NOT create:

``` text
TimelineEngine
Event model
TimelineStore
Event table
merged timeline copy
causal assertions
correlation models
score/composite fields
```

unless architecture pressure proves the absolute necessity --- which it
very likely does not. Expected scope:

``` text
existing InvestigationContext
        ↓
 pure deterministic merge (app DTO)
        ↓
 TIMELINE section in CLI
```

------------------------------------------------------------------------

## Explicitly Out of Scope

Do not implement:

-   recursive / multi-hop traversal
-   graph engine
-   global timeline (across all resources, unsupervised)
-   time filtering arguments (`--since`, `--before`, `--after`,
    `--last`)
-   incident windows / time buckets / clustering
-   causal inference
-   correlation
-   anomaly detection
-   anomaly / significance scoring
-   observations
-   hypotheses
-   investigation lifecycle, sessions, persistence
-   Timeline table / IDs
-   new Relationship kinds
-   `uses_database`
-   telemetry / logs / metrics / traces
-   AI / LLM
-   new provider calls / enrichment
-   MCP / API / SDK / web UI
-   Sprint 018 implementation or scaffolding

------------------------------------------------------------------------

## Canon

Before implementation the Canon is expected to need **no changes**: the
timeline is a presentation of existing memory and the roadmap already
anticipates timelines for memory context. Verify Q17 in Architecture
Pressure. If any material drift is uncovered in the VISION /
ARCHITECTURE / ROADMAP, report it per SKILL.md.

------------------------------------------------------------------------

## Completion Notes

### Repository Understanding

- Baseline `b23073b` already supplied exact-ID Resource resolution, subject
  History, canonical one-hop Relationships, related Resources, full related
  Histories, dangling-edge representation, and deterministic CLI formatting in
  `src/app/investigate.ts`.
- `Change`, `Resource`, `Relationship`, and `RelatedDirection` contain all
  required facts and provenance. Change persistence preserves absent values
  explicitly and returns exact persisted timestamps and stable IDs.
- Per-Resource History is ordered by `observed_at DESC, id DESC`.
  Relationships are ordered by `kind, source_resource_id, target_resource_id`.
- Existing Sprint 016 offline, broken-`fetch`, repeated-read, and database-hash
  fixtures were reusable. The focused baseline was green before Sprint work.
- Concrete risk: `InvestigationContext.related` is edge-shaped. Multiple edges
  to one Resource repeat that Resource's History, so a naive flatten would
  duplicate Changes and retain only one path per duplicate.
- Canon alignment was intact. Provider adapters, domain persistence, schema,
  credentials, sync, and all non-investigation commands remained untouched.

### Architecture Pressure

1. **Derive from context?** Yes, directly from `InvestigationContext`.
2. **Additional query?** No.
3. **New domain type?** No; ephemeral application DTO only.
4. **Module boundary?** Pure composition lives in `src/app/timeline.ts`;
   investigation presentation remains in `src/app/investigate.ts`.
5. **CLI surface?** Extend `investigate`; no separate `timeline` command.
6. **Direction?** Newest first, anchored on current state and consistent with
   adjacent History/context reading.
7. **Tie-break?** Exact `observedAt` string descending, then `Change.id`
   descending.
8. **Subject provenance?** Original Resource plus `role: "subject"` and no
   Relationship paths.
9. **Related provenance?** Original Resource plus `role: "related"` and full
   canonical Relationship/direction pairs.
10. **Multiple Relationships?** Group by related Resource ID, retain every path
    in existing deterministic context order, and emit each Change once.
11. **Resource with zero Changes?** It contributes no timeline entries.
12. **Whole context with zero Changes?** Explicit timeline zero state.
13. **Dangling Relationship?** Existing related context shows the edge; timeline
    fabricates neither Resource nor Change and emits no entry.
14. **Offline/read-only?** Yes; pure composition has no I/O.
15. **Repeated composition?** Total ordering and stable path order produce
    byte/logically identical results.
16. **Indexes/batching?** None required.
17. **Canon change?** None required.

### Implementation Plan and Result

Red added pure composition and integration/CLI tests before the module existed.
Green added the smallest implementation; review then found and corrected a
missing rendered Change ID with a formatter-level regression.

- Added `InvestigationTimelineEntry` and `InvestigationTimeline` application
  DTOs plus `composeInvestigationTimeline(context)` in `src/app/timeline.ts`.
- The composer retains original `Change`, `Resource`, and `Relationship`
  objects, groups same-Resource paths, deduplicates repeated Change IDs caused
  by edge-shaped context, copies into a new entries array, and never mutates the
  input.
- `formatInvestigationContext` now appends `TIMELINE (newest first)` and renders
  Change ID, Resource identity, subject/related role, every Relationship ID,
  direction, full evidence, exact timestamp, kind, and unchanged before/after
  evidence.
- `src/cli/index.ts` required no change: existing investigate resolution and
  dispatch automatically use the extended formatter.

### Investigation Timeline Contract

```ts
InvestigationTimeline = {
  subject: Resource
  entries: InvestigationTimelineEntry[]
}

InvestigationTimelineEntry = {
  change: Change
  resource: Resource
  role: "subject" | "related"
  relationships: {
    relationship: Relationship
    direction: "outbound" | "inbound"
  }[]
}
```

The boundary is exactly the supplied one-hop context. No traversal, provider
read, inference, causal claim, scoring, copy, or persistence occurs.

### Ordering and Provenance

Comparator implementation uses raw string comparison only:

```text
change.observedAt DESC
change.id DESC
```

The persisted `observedAt` string is never parsed, rounded, normalized, or
rewritten. Subject entries have no Relationship paths. Related entries retain
all canonical paths in the store/context order. Direction remains presentation
from the subject's perspective: source is outbound; target is inbound. No
inverse Relationship is persisted or synthesized.

### Zero and Error States

- Entire context empty: `No changes recorded in this context yet.`
- Related Resource with zero Changes: no timeline entry; existing per-neighbor
  zero state remains visible in RELATED CONTEXT.
- Dangling edge: related context preserves the canonical edge and missing marker;
  timeline emits no fabricated entry.
- Blank/missing Resource references continue using Sprint 016
  `RESOURCE_REF_REQUIRED` / `RESOURCE_NOT_FOUND` behavior.

### Query / Read Profile

Timeline composition adds **zero** reads. Investigation construction remains:

```text
1× getResource(subject)
1× listChangesForResource(subject)
1× listRelationshipsForResource(subject)
R× getResource(neighbor)                 (one per edge)
U× listChangesForResource(neighbor)       (one per present edge)
```

No schema, query, index, batch, cache, or persistence change was introduced.

### Offline / Read-Only and Live / Local Verification

- Tests unset all nine supported provider credential variables, replace
  `fetch` with a throwing function, compose repeatedly, and compare complete
  persisted ID sets plus the SQLite SHA-256 before/after.
- Local `./.combie` verification ran `investigate` twice with all credential
  variables unset. The database SHA-256 remained
  `5db1fd4171992c0e3dd19b15779fe3514cdb4be415b8eeb5a01c1741940e1061`.
- The local database had a valid Vercel subject but no Relationships or Changes,
  so it demonstrated the explicit timeline zero state. Interleaved, tied,
  multi-Resource, multi-kind, inbound/outbound, multi-edge, full evidence, and
  one-hop behavior are validated through deterministic fixtures.

### Validation

- Focused Sprint 017/application/CLI tests: 59 pass, 0 fail.
- Full regression suite after final formatter regression: 400 pass, 0 fail.
- `bun run typecheck`: clean.
- `git diff --check`: clean.
- Secret scan: no credential/private-key patterns found in changed files.
- Complete final diff review: clean; no debug code, speculative scaffolding, or
  unrelated changes retained.

### Deviations

None material. The implementation follows the proposed separate pure
application primitive and extends `investigate`. Same-neighbor histories are
deduplicated by stable persisted Change ID while all canonical Relationship
paths are retained.

### Learnings

1. **Can Combie deterministically order Change evidence across a bounded
   InvestigationContext while preserving provenance?**

   **Yes.** A pure merge over existing memory produces a total newest-first
   order while retaining exact Change evidence, Resource identity/role, and all
   canonical Relationship paths without new I/O or persistence.

2. **What is the smallest missing primitive after a trustworthy cross-resource
   timeline exists?**

   A deterministic, provider-independent **Observation** primitive is the
   smallest evidence gap revealed by the implementation. The timeline can now
   order every persisted Resource Change it receives, but it cannot represent
   non-Change operational facts (for example a provider-backed health or alert
   state). No temporal window, investigation lifecycle, correlation, or
   inference abstraction was pressured by this Sprint. This answer identifies
   the gap only; Sprint 018 is not implemented or scaffolded.

### Canon Changes

None. VISION, ARCHITECTURE, ROADMAP, and SKILL remain unchanged.

------------------------------------------------------------------------

## Definition of Done

-   [x] follow `skills/build-combie/SKILL.md` (reading order and
    protocol)
-   [x] Repository Understanding report produced before implementation
-   [x] Architecture Pressure report produced before implementation (17
    items above)
-   [x] `combie investigate <resource-id>` presents the cross-resource
    deterministic timeline section (or decided alternative with
    rationale)
-   [x] timeline derived from existing `InvestigationContext` ---
    timeline composition adds no storage reads beyond
    InvestigationContext construction
-   [x] exact `observedAt` preserved
-   [x] deterministic total order: `observed_at DESC, id DESC` tie-break
-   [x] no incidental SQLite row order dependency
-   [x] all Change evidence preserved exactly (no
    mutation/reinterpretation)
-   [x] Resource + Relationship provenance in every entry
-   [x] one-hop boundary proven (A→B→C does not include C for subject A)
-   [x] empty/zero states proven (no Changes, no related, dangling edge)
-   [x] fully offline and read-only (credential- and network-free; DB
    unchanged)
-   [x] zero new persistence of any kind
-   [x] full regression suite passes (Sprints 001--016)
-   [x] new test list from "Tests" passes
-   [x] `bun run typecheck`, secret scan, full diff review
-   [x] Canon unchanged unless material drift discovered (and then
    reported)
-   [x] completion notes answer the two explicit questions above
-   [x] worktree is clean
-   [x] Sprint 018 must not be started

------------------------------------------------------------------------

## What Sprint 017 Proves

Before:

``` text
SUBJECT CHANGES (newest first)          RELATED A CHANGES          RELATED B CHANGES
time A                                 time P                    time X
...

no shared order across resources
```

After:

``` text
TIMELINE (newest first, deterministic)

10:09  Cloudflare zone        field Z changed   (related · uses_domain_in / outbound)
10:07  Vercel project         field Y changed   (subject)
10:03  GitHub repository      field X changed   (related · source_for / inbound)
```

Facts are still just facts in order. No causality. No correlation. No
scoring.

------------------------------------------------------------------------

## Final Principle

> **Time proximity is presentation, not causality.**

Combie can now put what it already knows in sequence, without claiming
it understands why the sequence is what it is.

First order the evidence. Then someone else --- later --- may ask why.
