# SPRINT-023 --- Cross-Evidence Timeline Semantics

> **Status:** Complete **Depends on:** SPRINT-022 **Type:** Architecture
> / evidence investigation **Production code:** None
> **Primary goal:** Determine whether Combie can compose Resource
> Changes and provider-native evidence into one deterministic,
> trustworthy investigation chronology without flattening provider
> semantics or implying correlation/causality. **Implementation
> decision:** Research only. **Architecture recommendation:** B —
> provider-evidence chronology only; keep Resource Changes separate.
> **AI / correlation / causality:** None

------------------------------------------------------------------------

## Goal

Combie now has four temporal knowledge surfaces:

``` text
Resource Changes
Vercel Deployments
GitHub Workflow Runs
Neon Operations
```

Today they are intentionally presented separately:

``` text
TIMELINE
= Resource Changes

DEPLOYMENTS
= Vercel provider evidence

WORKFLOW RUNS
= GitHub provider evidence

OPERATIONS
= Neon provider evidence
```

That separation protected provider semantics while Combie learned what
operational evidence actually looks like.

Sprint 022 reached an important architectural conclusion:

> **Recommendation B --- shared mechanics are earned, while provider
> domain models should remain specific.**

Sprint 023 asks the next question:

> **Can those provider-specific evidence families be projected into one
> useful investigation chronology without creating a universal Event
> model?**

This Sprint is about **temporal composition**, not correlation.

------------------------------------------------------------------------

## Core Principle

> **Chronology is not correlation, and correlation is not causality.**

A unified chronology may safely say:

``` text
A was observed / recorded at 14:01
B was created at 14:03
C started at 14:04
```

It must not silently turn that into:

``` text
A caused B
B triggered C
these events are related
```

Temporal proximity alone is not relationship evidence.

------------------------------------------------------------------------

## Baseline

Begin from the clean committed Sprint 022 baseline:

``` text
8500da5
feat(neon): persist project operation evidence for investigate
```

Verify and record the exact SHA before research.

Expected baseline:

``` text
490 tests passing
typecheck clean
worktree clean
```

If actual repository state differs, report it before continuing.

------------------------------------------------------------------------

## Why This Sprint Exists

Sprint 017 introduced a deterministic investigation timeline for
Resource Changes.

Sprint 018 established a critical semantic boundary:

``` text
Change.observedAt
= when Combie observed a Resource difference

NOT
= when the provider-side event happened
```

Sprints 020--022 then added provider-native evidence with stronger
provider timestamps.

We can now pressure-test whether investigation chronology can become:

``` text
subject + one-hop context
        ↓
Resource Changes
Vercel Deployments
GitHub Workflow Runs
Neon Operations
        ↓
pure deterministic temporal projection
        ↓
investigation chronology
```

without changing the underlying domain models.

------------------------------------------------------------------------

## Hard Scope Rule

Sprint 023 is **research/documentation-first**.

Do not begin by adding:

``` text
Event
Evidence
TimelineEvent
TemporalEvent
Correlation
Observation
Incident
```

to the domain.

Do not modify production code merely to demonstrate an idea.

The deliverable is an evidence-backed architecture decision for Sprint
024.

------------------------------------------------------------------------

## Repository Understanding Report

Before analysis, read:

-   `skills/build-combie/SKILL.md`
-   Combie Canon
-   Sprint 016 investigation composition
-   Sprint 017 timeline
-   Sprint 018 observation/time-semantics research
-   Sprint 019 provider-event evidence research
-   Sprint 020 Vercel deployment completion notes
-   Sprint 021 GitHub workflow-run completion notes
-   Sprint 022 Neon operation completion notes
-   Resource / Change / Relationship domain models
-   Change timeline composer
-   InvestigationContext
-   investigate formatter
-   Vercel deployment DTO/store/query/formatting
-   GitHub workflow-run DTO/store/query/formatting
-   Neon operation DTO/store/query/formatting
-   refresh authority representations
-   one-hop neighbor evidence composition
-   SQLite ordering/query behavior

Report:

1.  Current investigation data flow.
2.  Exact scope of the existing Change timeline.
3.  How subject and one-hop neighbor Changes are merged.
4.  How Vercel deployments enter investigation context.
5.  How GitHub workflow runs enter investigation context.
6.  How Neon operations enter investigation context.
7.  Which evidence is available for subject versus neighbors.
8.  Existing ordering guarantees for each evidence family.
9.  Existing provider-time semantics for each family.
10. Existing `observedAt` semantics for each family.
11. Whether any generic temporal abstraction already exists.
12. Whether any storage/query refactor is required merely to compose
    chronology.

No production implementation before this report.

------------------------------------------------------------------------

## Temporal Authority Matrix

Build an explicit matrix for every temporal record Combie currently
knows.

At minimum compare:

### Resource Change

Document:

-   identity
-   subject Resource
-   `observedAt`
-   whether provider-native time exists
-   what the timestamp means
-   whether the record represents a state difference or provider action
-   mutable/immutable behavior

### Vercel Deployment

Document all persisted provider-native timestamps and their exact
semantics.

Determine which timestamp, if any, can represent the deployment in a
chronology without losing lifecycle meaning.

### GitHub Workflow Run

Document:

-   created time
-   started time
-   updated time
-   status
-   conclusion
-   rerun/attempt behavior

Determine whether a workflow run is one temporal item or a lifecycle
object with multiple meaningful temporal points.

### Neon Operation

Document:

-   operation action/type
-   lifecycle state
-   provider-native timestamps
-   mutability
-   target evidence

Determine whether one timestamp truthfully represents the operation.

------------------------------------------------------------------------

## The Central Architecture Question

Pressure-test two fundamentally different models.

### Model A --- One evidence object = one timeline entry

Example:

``` text
14:03  Vercel deployment dep_123  READY
14:04  GitHub workflow run 991     COMPLETED / SUCCESS
14:05  Neon operation op_55        FINISHED
```

Advantages:

-   simple
-   compact
-   easy to compose
-   no synthetic lifecycle events

Risks:

-   which timestamp represents the object?
-   lifecycle objects contain multiple meaningful times
-   final state may be shown beside creation time
-   chronology can become semantically misleading

### Model B --- One evidence object may project multiple temporal facts

Example:

``` text
14:03:00  Vercel deployment dep_123 created
14:03:08  Vercel deployment dep_123 building
14:03:31  Vercel deployment dep_123 ready

14:04:00  GitHub workflow run 991 created
14:04:03  GitHub workflow run 991 started
14:04:55  GitHub workflow run 991 updated/completed
```

Advantages:

-   preserves provider lifecycle time semantics
-   chronology reflects actual known temporal facts

Risks:

-   creates synthetic projection entries
-   may imply state transitions Combie never directly observed
-   provider APIs may expose timestamps without complete lifecycle
    history
-   more presentation complexity

Determine which model is trustworthy, or whether neither is ready.

------------------------------------------------------------------------

## Temporal Projection

Pressure-test whether the right abstraction is not a persisted Event at
all, but a pure projection such as:

``` text
TemporalEntry
```

Possible conceptual fields:

``` text
source
subjectResourceId
evidenceKind
evidenceId
time
timeSemantics
summary
provenance
```

These are research candidates, not implementation requirements.

The key questions are:

1.  Can this projection be computed entirely from existing persisted
    facts?
2.  Can every entry point back to its original Change/provider evidence?
3.  Can it remain ephemeral?
4.  Does it preserve provider-specific semantics?
5.  Can it avoid inventing a generic lifecycle vocabulary?
6.  Does it require a persisted identity?
7.  Is deterministic identity useful even if entries remain ephemeral?
8.  Can it be reconstructed identically offline?

------------------------------------------------------------------------

## Provenance Requirement

Any future cross-evidence chronology must preserve full provenance.

A timeline entry must never become an orphaned sentence.

It should remain traceable to:

``` text
Resource Change
Vercel deployment
GitHub workflow run
Neon operation
```

Pressure-test whether provenance requires:

-   evidence kind
-   native evidence ID
-   Resource ID
-   provider
-   original timestamp field
-   relationship path when evidence belongs to a neighbor

Do not duplicate the original provider evidence payload.

------------------------------------------------------------------------

## Subject and One-Hop Scope

Preserve the investigation boundary established in Sprint 016:

``` text
subject
+
directly related one-hop Resources
```

No recursive graph traversal.

For every projected temporal entry, determine whether it belongs to:

``` text
SUBJECT
```

or:

``` text
NEIGHBOR
```

and, for neighbor evidence, which canonical Relationship brought it into
scope.

Example:

``` text
Vercel project
← source_for —
GitHub repository
└── workflow run
```

The workflow run may be temporally visible because its repository is a
one-hop neighbor.

That does **not** mean the workflow run is correlated with the Vercel
deployment.

Preserve this distinction in any proposed output vocabulary.

------------------------------------------------------------------------

## Ordering Semantics

Determine a deterministic total ordering.

Pressure-test:

``` text
provider-native time DESC
```

with deterministic tie-breaking.

Questions:

1.  What happens when two entries have identical timestamps?
2.  Can stable evidence IDs provide deterministic tie-breaks?
3.  Should source/evidence kind participate in tie-breaking?
4.  How are Changes ordered against provider evidence?
5.  Is `observedAt` ever comparable to provider-native event time?
6.  If a Change has only `observedAt`, can it safely appear among
    provider-native times?
7.  Does mixing observer time and provider time require explicit
    labeling?
8.  Should chronology contain separate temporal authority classes?

Do not hide incomparable timestamp semantics.

------------------------------------------------------------------------

## Provider Time vs Observer Time

This is a critical boundary.

Possible chronology:

``` text
14:03  GitHub workflow started
14:04  Vercel deployment created
14:08  Combie observed Resource metadata changed
```

The third item is fundamentally different.

Research whether output should explicitly encode:

``` text
PROVIDER TIME
```

versus:

``` text
OBSERVATION TIME
```

or use precise verbs/labels so the distinction is obvious without adding
noisy UI.

Never rewrite a Resource Change as though it occurred at `observedAt`.

Safe:

``` text
14:08 — Combie observed Vercel project metadata change
```

Unsafe:

``` text
14:08 — Vercel project changed
```

unless provider evidence independently proves that event time.

------------------------------------------------------------------------

## Clock and Ordering Limitations

Research/document:

-   provider clock authority
-   timestamp precision
-   timestamp normalization
-   timezone handling
-   equal timestamps
-   delayed API visibility
-   provider-side eventual consistency
-   Combie sync timing
-   stale retained evidence
-   sequential provider sync behavior

A chronology can be deterministic without being a perfect reconstruction
of real-world order.

Document that boundary explicitly.

------------------------------------------------------------------------

## Mutable Evidence

Provider evidence objects can change across syncs.

Example:

``` text
workflow run:
in_progress
→ completed / failure
```

The durable row may now contain final state plus earlier provider
timestamps.

Ask:

> If Combie did not persist the intermediate state transition, what
> exactly may the chronology claim?

Do not reconstruct an unobserved lifecycle from the current object
unless provider-native timestamp fields explicitly establish those
temporal facts.

Differentiate:

``` text
provider asserts started_at
```

from:

``` text
Combie observed status transition to in_progress
```

They are not equivalent.

------------------------------------------------------------------------

## Refresh Authority and Stale Evidence

Sprints 020--022 established:

``` text
known populated
known empty
unknown / failed refresh
stale retained evidence
```

Determine how chronology should behave when evidence is stale.

Questions:

1.  Should stale retained evidence remain visible?
2.  Must entries carry an authority/staleness marker?
3.  Does an unknown current refresh invalidate historical evidence?
    Probably not; verify.
4.  How should known-empty affect chronology?
5.  Can chronology claim completeness for a time range?

Default assumption:

> A timeline is a composition of what Combie knows, not a guarantee that
> no unobserved events occurred.

Pressure-test and document this wording.

------------------------------------------------------------------------

## Completeness

Determine whether Combie can truthfully call the output:

``` text
TIMELINE
```

or whether a more precise label is needed, such as:

``` text
INVESTIGATION CHRONOLOGY
KNOWN ACTIVITY
TEMPORAL CONTEXT
```

A word like "timeline" may imply completeness.

Assess:

-   provider retention
-   bounded GitHub workflow retrieval
-   Vercel deployment retention/bounds
-   Neon operation retention
-   failed refreshes
-   disconnected providers
-   Resource Change observation frequency

Recommend vocabulary that is useful without overstating completeness.

------------------------------------------------------------------------

## Correlation Boundary

Explicitly define what temporal composition does **not** mean.

If output shows:

``` text
14:00 GitHub workflow completed
14:02 Vercel deployment created
14:05 Neon operation finished
```

Combie may say:

``` text
These records appear in this chronological order.
```

Combie may not automatically say:

``` text
The workflow triggered the deployment.
The deployment caused the database operation.
These records are correlated.
This sequence explains the incident.
```

Even exact SHA equality or close timestamps must remain separate future
evidence questions.

No correlation engine.

------------------------------------------------------------------------

## Observation Boundary

Sprint 018 concluded that useful deterministic observations were
premature because evidence was weak.

Now evidence is richer.

Sprint 023 should revisit, but not implement, whether chronology itself
enables safe deterministic observations.

Examples to classify:

``` text
"Three known records fall within a five-minute interval."
```

versus:

``` text
"These three records are related."
```

versus:

``` text
"The deployment caused the failure."
```

Classify each as:

``` text
FACT
DETERMINISTIC OBSERVATION
INTERPRETIVE
CAUSAL
```

Do not build an ObservationEngine.

------------------------------------------------------------------------

## Persistence Decision

Default recommendation to pressure-test:

``` text
provider-specific durable evidence
        ↓
pure temporal projection
        ↓
no new timeline persistence
```

Determine whether any reason exists to persist projected entries.

Potential reasons must be concrete:

-   expensive reconstruction
-   stable external references
-   lifecycle requirements
-   audit requirements

Do not persist simply because the UI might eventually need a timeline.

SQLite should remain the source of facts, not duplicated presentation
state.

------------------------------------------------------------------------

## Shared Mechanics from Sprint 022

Sprint 022 concluded shared mechanics are earned.

Sprint 023 may identify reusable read/composition mechanics, but it is
not automatically the refactor Sprint.

Document whether a future refactor should separate:

``` text
provider-specific evidence stores
```

from:

``` text
shared evidence query/authority utilities
```

and:

``` text
temporal projection
```

Do not combine these into one Event subsystem.

------------------------------------------------------------------------

## Evidence Matrix

Build a matrix with at least:

  ------------------------------------------------------------------------------
  Dimension          Change         Vercel         GitHub         Neon Operation
                                    Deployment     Workflow Run   
  ------------------ -------------- -------------- -------------- --------------
  Durable model                                                   

  Subject Resource                                                

  Native identity                                                 

  Provider-native                                                 
  time                                                            

  Observer time                                                   

  Multiple                                                        
  meaningful times                                                

  Mutable lifecycle                                               

  State semantics                                                 

  Retention bound                                                 

  Refresh authority                                               

  Can project                                                     
  temporal facts?                                                 

  Completeness                                                    
  caveat                                                          

  Subject/neighbor                                                
  provenance                                                      
  ------------------------------------------------------------------------------

Populate from actual implementation and documented provider semantics.

------------------------------------------------------------------------

## Candidate Output Study

Design at least three text-only investigation-output sketches.

### Option A --- Fully merged chronology

Example shape only:

``` text
KNOWN ACTIVITY (newest first)

14:08  OBSERVED   Vercel project metadata changed
14:05  NEON       operation finished
14:02  VERCEL     deployment created
14:00  GITHUB     workflow completed
```

### Option B --- Merged chronology with authority groups

Example:

``` text
PROVIDER ACTIVITY
...

COMBIE OBSERVATIONS
...
```

### Option C --- Existing separate evidence sections + compact chronological index

Example:

``` text
CHRONOLOGY INDEX
...

DEPLOYMENTS
...

WORKFLOW RUNS
...

OPERATIONS
...

CHANGES
...
```

Assess:

-   trustworthiness
-   readability
-   provenance
-   semantic loss
-   completeness implications
-   implementation complexity

Do not implement UI.

------------------------------------------------------------------------

## Architecture Decision

At completion choose exactly one:

### A --- Implement an ephemeral unified investigation chronology next

Evidence supports a pure deterministic temporal projection across
Change + provider-native evidence without a persisted generic Event
model.

Sprint 024 should implement the smallest projection and CLI composition.

### B --- Implement provider-evidence chronology only

Provider-native evidence can be merged safely, but Resource Changes
should remain separate because `observedAt` is not provider event time.

Sprint 024 should merge Deployments + Workflow Runs + Operations while
keeping Change observations separate.

### C --- Keep evidence sections separate

Timestamp semantics, lifecycle objects, retention, or completeness make
a merged chronology more misleading than useful.

Sprint 024 should address the highest-value evidence/authority gap
instead.

### D --- Research another temporal primitive first

A specific missing primitive prevents a trustworthy chronology. Name it
precisely.

Do not predetermine the result.

------------------------------------------------------------------------

## Tests / Validation

Because Sprint 023 is research-only by default:

-   run full existing test suite
-   run typecheck
-   verify zero unintended production/test changes
-   secret scan
-   whitespace/diff checks
-   worktree review

If useful, inspect existing fixture data to construct chronology
examples, but do not alter production behavior.

No new production tests are required unless scope changes for a concrete
reason documented before implementation.

------------------------------------------------------------------------

## Live Data Review

If existing local Combie data contains persisted Changes/provider
evidence, inspect it offline for representative temporal examples.

Do not require provider credentials merely for Sprint 023.

Do not perform expensive syncs unless needed to answer a specific
architecture question.

If local data lacks enough evidence, use existing test fixtures and
documented provider contracts.

Clearly distinguish:

``` text
live local evidence
```

from:

``` text
fixture-based architecture examples
```

------------------------------------------------------------------------

## Completion Notes

### Baseline

```text
8500da5b5c9c2c1767ef820e6d3b092d73b2c1ec
8500da5 feat(neon): persist project operation evidence for investigate
```

Verified before research:

| Check | Result |
| --- | --- |
| HEAD | `8500da5` (exact match to expected Sprint 022 baseline) |
| Tests | 490 pass, 0 fail, 2015 assertions, 47 files |
| Typecheck | clean (`tsc --noEmit`) |
| Worktree | clean except untracked `docs/internal/sprints/SPRINT-023.md` |

No production code was modified in this Sprint.

### Repository Understanding

#### Investigation data flow

```text
combie investigate <resource-id>
  → getInvestigationContext({ baseDir, resourceRef })
       Store open (offline, no provider calls, no writes)
       exact Resource id lookup
       getInvestigationContextForResource
         ├─ subject full Change history
         ├─ one-hop Relationships (source or target)
         ├─ per present neighbor: Changes + evidence authorities
         └─ subject evidence authorities
  → formatInvestigationContext
       SUBJECT / CURRENT
       SUBJECT CHANGES
       optional DEPLOYMENTS / WORKFLOW RUNS / OPERATIONS (subject)
       RELATED CONTEXT (per edge: CHANGES + optional evidence)
       TIMELINE (Change-only merge via composeInvestigationTimeline)
```

Key modules:

| Module | Role |
| --- | --- |
| `src/app/investigate.ts` | `InvestigationContext`, loaders, CLI formatting |
| `src/app/timeline.ts` | Pure Change-only temporal merge |
| `src/app/related.ts` | One-hop neighbor edges |
| `src/app/history.ts` | Per-Resource Change history |
| `src/domain/{resource,change,relationship}.ts` | Core domain |
| `src/providers/vercel/deployment.ts` | Deployment DTO + authority |
| `src/providers/github/workflow-run.ts` | Workflow-run DTO + authority |
| `src/providers/neon/operation.ts` | Operation DTO + authority |
| `src/storage/store.ts` | SQLite persistence + ordered lists |

#### Exact scope of the existing Change timeline

`composeInvestigationTimeline` merges **only Resource Changes** already
present on `InvestigationContext`:

- subject Changes → `role: "subject"`, empty relationships
- one-hop present neighbor Changes → `role: "related"`, all connecting
  Relationship paths
- order: `observedAt DESC`, then `change.id DESC` (raw string compare)
- multi-edge neighbors: Changes deduped by id; all Relationship paths kept
- dangling edges produce no timeline entries
- **never includes** deployments, workflow runs, or operations

#### Subject + one-hop Change merge

Pure in-memory view. Groups related neighbors by Resource id, accumulates
Relationship provenance, emits one entry per unique Change, sorts. No
extra storage reads.

#### How provider evidence enters investigations

| Family | Load path | Context fields | CLI section |
| --- | --- | --- | --- |
| Vercel deployments | `loadDeploymentAuthority` only for `vercel` + `project` | `subjectDeployments`, `related[].deployments` | `DEPLOYMENTS (newest first)` |
| GitHub workflow runs | `loadWorkflowRunAuthority` only for `github` + `repository` | `subjectWorkflowRuns`, `related[].workflowRuns` | `WORKFLOW RUNS (newest first)` |
| Neon operations | `loadNeonOperationAuthority` only for `neon` + `project` | `subjectOperations`, `related[].operations` | `OPERATIONS (newest first)` |

Each loader: refresh row + list rows → `compose*Authority` →
`not_applicable | unknown | empty | populated`.

#### Subject vs neighbor evidence availability

Identical loaders for subject and neighbors. Applicability is by Resource
provider/kind only. Dangling neighbors → `not_applicable`. No recursive
traversal. Neon operations are supported for one-hop Neon project
neighbors when a Relationship exists; no app↔database Relationship exists
today, so neighbor OPERATIONS is mechanical but rarely populated.

#### Existing ordering guarantees

| Family | Order | Tie-break |
| --- | --- | --- |
| Changes (history + timeline) | `observed_at` / `observedAt` DESC | `id` DESC |
| Vercel deployments | `created_at_ms` DESC | `uid` DESC |
| GitHub workflow runs | `created_at` DESC | `run_id` DESC |
| Neon operations | `created_at` DESC | `operation_id` DESC |

No cross-family total order exists today.

#### Provider-time and observedAt semantics (summary)

| Family | Provider-native times | Combie `observedAt` |
| --- | --- | --- |
| Change | none | sync observation time of Resource diff (shared stamp per provider pass) |
| Vercel deployment | `createdAtMs`, optional `buildingAtMs`, `readyAtMs` | last upsert / refresh observation |
| GitHub workflow run | `createdAt`, optional `runStartedAt`, `updatedAt` | last upsert / refresh observation |
| Neon operation | `createdAt`, `updatedAt`, optional `retryAt` + `totalDurationMs` | last upsert / refresh observation |

#### Generic temporal abstraction?

**None.** No `Event`, `Evidence`, `TimelineEvent`, `TemporalEvent`,
`Observation`, or `Correlation` domain type. Provider DTOs are
explicitly provider-specific. `InvestigationTimeline` is Change-only and
ephemeral.

#### Storage/query changes required to compose chronology?

**No.** All four families are already loaded into `InvestigationContext`
with deterministic per-family ordering. Chronology can be a pure
in-memory projection. Units must be normalized at projection time
(Vercel epoch ms vs ISO strings). Authority kinds must travel with
projected entries so stale/unknown/empty semantics are not lost.

### Temporal Authority Matrix

#### Resource Change

| Dimension | Fact |
| --- | --- |
| Identity | UUID `Change.id` |
| Subject Resource | `resourceId` (exact Combie Resource id) |
| Provider-native time | **None** |
| Primary time | `observedAt` only |
| Exact timestamp meaning | When Combie observed a name/metadata difference during sync |
| Not | When the provider-side change actually occurred |
| Represents | Observed Resource state difference (`kind: "updated"` + fields) |
| Mutability | Immutable once persisted (new Change rows for later diffs) |
| Ordering authority class | **OBSERVATION TIME** |

Sprint 018 boundary reaffirmed: equal `observedAt` usually means same
provider sync batch, not real-world simultaneity. Sequential multi-provider
sync invents cross-provider observation order.

#### Vercel Deployment

| Dimension | Fact |
| --- | --- |
| Identity | stable `uid` |
| Subject Resource | `vercel:project:<projectId>` |
| Provider-native times | `createdAtMs` (required; primary), `buildingAtMs?`, `readyAtMs?` |
| Exact meanings | creation; build-start when present; ready when present |
| State | mutable `readyState` / `state` on latest row |
| Mutability | upsert overwrites lifecycle fields; **not** transition history |
| Observer time | per-row + refresh `observedAt` |
| Ordering authority class | **PROVIDER TIME** (created) |

One timestamp does **not** fully represent a deployment if secondary
lifecycle times exist. Showing `READY` beside `createdAt` without naming
the field is misleading when `readyAt` differs.

#### GitHub Workflow Run

| Dimension | Fact |
| --- | --- |
| Identity | numeric `runId` |
| Subject Resource | `github:repository:<numeric-id>` |
| Provider-native times | `createdAt` (required; primary), `runStartedAt?`, `updatedAt?` |
| State | mutable `status` + `conclusion`; `runAttempt` updates on same row |
| Mutability | latest snapshot per run id; no per-attempt history |
| Observer time | per-row + refresh `observedAt` |
| Ordering authority class | **PROVIDER TIME** (created) |

A workflow run is a **lifecycle object** with multiple provider-asserted
temporal fields. Provider asserts `run_started_at`; Combie does **not**
observe intermediate transitions unless intermediate rows were persisted
(they are not).

#### Neon Operation

| Dimension | Fact |
| --- | --- |
| Identity | UUID `operationId` |
| Subject Resource | `neon:project:<projectId>` |
| Provider-native times | `createdAt` (primary), `updatedAt` (required), `retryAt?`, `totalDurationMs` |
| State | mutable provider `status`; `action` type; `failuresCount` aggregate |
| Mutability | latest snapshot per operation id |
| Targets | optional `branchId` / `endpointId` |
| Observer time | per-row + refresh `observedAt` |
| Ordering authority class | **PROVIDER TIME** (created) |

One primary created time is the truthful chronology anchor; status +
`updatedAt` describe latest known lifecycle, not a reconstructed event
log.

### Lifecycle Analysis

#### Model A pressure test (one object = one timeline entry)

Simple and compact, but dangerous if the summary claims current state at
the primary timestamp:

```text
Unsafe:  14:03  Vercel deployment dep_123 READY
Safe:    14:03  Vercel deployment dep_123 created
                (current readyState=READY; provider ready at 14:06)
```

#### Model B pressure test (one object → multiple temporal facts)

Valid **only** for provider-asserted timestamp fields. Combie may project:

```text
created / building / ready     (Vercel, when fields present)
created / run_started_at       (GitHub, when present)
created / updated_at / retry_at (Neon, when present)
```

Invalid reconstructions:

```text
"transitioned to in_progress at T"   // unless a persisted timestamp asserts that
"completed at updated_at"            // updated_at is last update, not proven completion time
"failed at observedAt"               // observer time is not provider failure time
```

#### Decision on object vs temporal-fact

| Principle | Choice |
| --- | --- |
| Durable storage | remains one provider-specific evidence row per native id |
| Projection | **may** emit multiple ephemeral temporal facts when the provider asserts multiple times |
| Sprint 024 default | **conservative Model A-prime**: one entry per evidence object at **primary created time**, with other provider times and current state as **attributes**, not synthetic transition rows |
| Later optional | multi-fact expansion only with explicit `timeSemantics` naming the exact provider field |

Conceptual ephemeral projection (research only — **not implemented**):

```text
TemporalEntry {
  sourceScope          // subject | neighbor
  subjectResourceId
  evidenceResourceId
  evidenceKind         // change | vercel_deployment | github_workflow_run | neon_operation
  evidenceId
  time                 // comparable instant
  timeSemantics        // e.g. vercel.created | github.created_at | change.observed_at
  timeAuthority        // PROVIDER | OBSERVATION
  summary              // provider-native vocabulary preserved
  provenance           // relationship path when neighbor; refresh authority
}
```

Answers:

1. Yes — every entry is computable from persisted facts.
2. Yes — every entry points back via `evidenceKind` + native id + Resource id.
3. Yes — projection can remain ephemeral.
4. Yes — summaries keep provider vocabulary (`readyState`, `conclusion`, `action`).
5. Yes — avoid generic lifecycle words like “completed” unless the provider field says so.
6. No persistent identity required for projection entries.
7. Deterministic reconstructability offline is required and achievable.

### Ordering Analysis

#### Can a deterministic total order be defined?

Yes, for a **single time-authority class**. Across authority classes, a
single numeric sort is still implementable but is **not** a truthful
real-world total order.

Recommended total order for **provider-evidence chronology**:

```text
1. primary provider time DESC
     (Vercel createdAtMs as ISO; GitHub createdAt; Neon createdAt)
2. evidenceKind ASC  (stable family participation)
3. native evidence id DESC
4. evidenceResourceId ASC
```

#### Explicit answers

| # | Question | Answer |
| --- | --- | --- |
| 1 | Equal timestamps? | Deterministic tie-break; never treat equality as relationship |
| 2 | Stable evidence IDs? | Yes — uid / runId / operationId |
| 3 | Family in tie-break? | Yes — for stability, not priority ranking |
| 4 | Changes vs provider evidence? | **Do not co-order as one authority class** |
| 5 | Is Change.observedAt comparable to provider event time? | **No** for “happened before” claims |
| 6 | Can a Change safely appear in the same chronology? | Only if labeled **OBSERVATION TIME** and visually separated (Option B) |
| 7 | Visible authority classes? | **Yes** — PROVIDER vs OBSERVATION |
| 8 | Precision differences? | Normalize to comparable instants; do not invent sub-second meaning across providers |

#### Clock / ordering limitations (documented)

- each provider is its own clock authority
- Vercel ms integers vs GitHub/Neon ISO strings
- timezone: normalize to UTC ISO at projection
- equal timestamps: tie-break only
- eventual consistency and delayed API visibility
- sequential Combie provider sync (affects observation stamps heavily)
- stale retained evidence after failed refresh
- bounded retrieval (GitHub 100 runs; Vercel plan retention; Neon ~6 months)

**A deterministic chronology is not perfect real-world causal order.**

### Provenance Model

Every projected entry must retain:

| Provenance field | Why |
| --- | --- |
| evidence family/kind | which durable model |
| provider | vercel / github / neon / (combie for Changes) |
| native evidence id | uid / runId / operationId / change id |
| evidence Resource id | exact binding |
| original timestamp field / semantic | e.g. `created_at`, `observedAt` |
| time authority class | PROVIDER or OBSERVATION |
| subject vs neighbor scope | investigation boundary |
| Relationship path when neighbor | kind + direction + relationship id + edge evidence |
| refresh authority when applicable | populated / empty / unknown (+ stale retained) |

Do **not** duplicate full provider payloads into chronology records.
Do **not** invent Relationship edges for temporal proximity.

### Provider Time vs Observer Time

These must coexist as **explicit authority classes**, not merely different
verbs if co-sorted.

| Safe | Unsafe |
| --- | --- |
| `14:03 — GitHub workflow run 9001 created` | `14:03 — workflow happened` |
| `14:08 — Combie observed Vercel project metadata change` | `14:08 — Vercel project changed` |
| separate PROVIDER ACTIVITY and COMBIE OBSERVATIONS sections | one unlabeled mixed list ordered as if one clock |

Precise language alone is helpful but **insufficient** if entries from both
authority classes share one sorted stream without markers. Recommendation:
keep sections separate by authority (Option B), or if a compact index is
shown, prefix every row with `PROVIDER` / `OBSERVED` and never claim
cross-class ordering is real-world order.

### Authority / Completeness

#### Refresh authority behavior in chronology

| Kind | Chronology behavior |
| --- | --- |
| populated | include known evidence rows |
| empty | no current provider-returned items; may still show retained historical rows where modeled (Neon) with caveat |
| unknown / failed refresh | retained rows may appear only if marked **stale / last known** |
| not_applicable | omit family |

#### Stale evidence answers

1. Stale retained evidence may remain visible when that is all Combie knows.
2. Staleness / unknown refresh **must** be visible at section or entry level.
3. Failed current refresh does **not** invalidate previously observed
   historical rows as non-facts; it invalidates **currency / completeness**.
4. Known-empty means “provider returned zero in the current authoritative
   walk,” not “never existed.”
5. Chronology **cannot** claim completeness for a time range.

#### Completeness vocabulary

Avoid bare `TIMELINE` for a merged cross-evidence view (implies complete
history). Prefer:

```text
KNOWN PROVIDER ACTIVITY
```

or:

```text
KNOWN ACTIVITY (incomplete; what Combie currently knows)
```

Existing Change section can remain:

```text
TIMELINE (Combie observations of Resource changes)
```

or more precisely:

```text
COMBIE OBSERVATIONS
```

#### Completeness caveats (all families)

| Source | Bound |
| --- | --- |
| Vercel deployments | plan/provider retention; multi-page list; list absence ≠ deletion |
| GitHub workflow runs | **1 page × 100** most recent; Actions retention |
| Neon operations | ops older than ~6 months may be deleted; empty = current retained response |
| Changes | only diffs Combie detected at sync frequency; no provider event feed |
| Disconnected providers / failed refreshes | gaps |

Truthful claim:

> This chronology represents what Combie currently knows from local
> memory. It does not prove that no other activity occurred.

### Correlation Boundary

Chronological composition **does not** imply:

- correlation between records
- causality
- that a workflow triggered a deployment
- that a deployment caused a Neon operation
- that temporal proximity is Relationship evidence
- that SHA equality is Relationship evidence
- that one-hop graph proximity is temporal relatedness beyond scope

Safe:

```text
These known records appear in this chronological order by their
provider-asserted primary timestamps.
```

Unsafe:

```text
These events are related / explain the incident / caused each other.
```

No correlation engine. No new Relationships. No SHA correlation.

### Observation Boundary

Sprint 018 deferred ObservationEngine because evidence was weak. Evidence
is richer now, but chronology still does **not** earn an ObservationEngine.

| Statement | Class |
| --- | --- |
| “Three known provider records have primary timestamps within a five-minute interval.” | **FACT** (if computed from persisted times) |
| “These three records are related.” | **INTERPRETIVE** (unless a Relationship edge exists; even then, only graph-related) |
| “The workflow triggered the deployment.” | **CAUSAL** — forbidden |
| “The deployment caused the failure.” | **CAUSAL** — forbidden |
| “Combie observed a metadata change after the last successful Vercel refresh.” | **DETERMINISTIC OBSERVATION** only if carefully scoped to observation times, not provider causality |
| “Known provider activity for this subject+one-hop context, newest first.” | **FACT** about composition |

Useful deterministic observations remain limited to **counting, ordering,
authority, and explicit field values**. Do not implement ObservationEngine
in Sprint 024.

### Persistence Decision

```text
provider-specific durable evidence
        ↓
pure temporal projection (ephemeral)
        ↓
no timeline persistence
```

No concrete reason found to persist projected entries:

| Candidate reason | Verdict |
| --- | --- |
| Reconstruction cost | trivial in-memory sort over already-loaded context |
| Stable external references | not required; native evidence ids already stable |
| Audit/lifecycle of timeline | not a product requirement |
| Future UI convenience | insufficient alone |

SQLite remains the source of facts. Presentation state is not duplicated.

### Shared mechanics note (Sprint 022)

Sprint 022 earned shared **storage/refresh mechanics** as a future
refactor candidate while keeping domain models provider-specific. Sprint
023 does **not** undo that. Chronology projection is a separate pure
composition concern. Future refactor pressure remains valid for:

```text
provider-specific evidence stores
shared evidence query/authority utilities
temporal projection
```

Do **not** collapse these into a generic Event subsystem.

### Evidence Matrix

| Dimension | Resource Change | Vercel Deployment | GitHub Workflow Run | Neon Operation |
| --- | --- | --- | --- | --- |
| Durable model | `Change` domain | `VercelDeploymentEvidence` | `GitHubWorkflowRunEvidence` | `NeonOperationEvidence` |
| Subject Resource | any Resource | vercel project | github repository | neon project |
| Native identity | Change UUID | `uid` | `runId` | `operationId` |
| Provider-native time | none | created/building/ready (ms) | created/started/updated (ISO) | created/updated/retry (ISO) + duration |
| Observer time | `observedAt` (only time) | `observedAt` | `observedAt` | `observedAt` |
| Multiple meaningful times | no | yes | yes | yes |
| Mutable lifecycle | immutable row | yes (latest snapshot) | yes (incl. rerun attempt) | yes (status/failures) |
| State semantics | field diffs | readyState/state | status/conclusion | action + status |
| Retention bound | all detected diffs kept | plan/list bounds | 100 most recent/page | ~6 months provider + local retain |
| Refresh authority | n/a (Change history) | populated/empty/unknown | populated/empty/unknown | populated/empty(+history)/unknown |
| Can project temporal facts? | observation facts only | yes (named provider fields) | yes | yes |
| Completeness caveat | sync-frequency limited | incomplete provider history | incomplete by design | incomplete retained window |
| Subject/neighbor provenance | timeline role + relationships | same loaders; scope labels needed | same | same; rare neighbor edges |

### Candidate Output Study

Conceptual only — not implemented.

#### Option A — Fully merged chronology (all four families)

```text
KNOWN ACTIVITY (newest first; incomplete)

14:08  OBSERVED  Vercel project metadata change     [subject]
14:05  NEON      operation finished (created)       [subject]
14:02  VERCEL    deployment created (READY)         [subject]
14:00  GITHUB    workflow completed (created)       [neighbor ← source_for]
```

| Axis | Assessment |
| --- | --- |
| Trustworthiness | **Weak** unless authority markers are perfect; mixed clocks invite false “happened after” reading |
| Readability | High single-stream UX |
| Provenance | Possible but dense |
| Semantic loss | High risk (observer time co-sorted with provider time) |
| Completeness implications | “KNOWN ACTIVITY” helps; still overclaims interleaving |
| Implementation complexity | Medium |

#### Option B — Provider chronology + separate Combie observations

```text
KNOWN PROVIDER ACTIVITY (newest first; incomplete)

14:05  NEON    operation op_55 created  status=finished  [subject]
14:02  VERCEL  deployment dpl_x created readyState=READY readyAt=14:06  [subject]
14:00  GITHUB  workflow run 991 created status=completed conclusion=success  [neighbor ← source_for]

COMBIE OBSERVATIONS (Resource Changes; observation time)

14:08  Combie observed Vercel project metadata change  [subject]
09:30  Combie observed GitHub repository metadata change  [neighbor]
```

| Axis | Assessment |
| --- | --- |
| Trustworthiness | **Strongest** among merge options |
| Readability | High; preserves two authority classes |
| Provenance | Clear per section |
| Semantic loss | Low if provider vocabulary retained |
| Completeness implications | Honest with “KNOWN … incomplete” |
| Implementation complexity | Low–medium pure projection |

#### Option C — Compact chronological index + existing detailed sections

```text
CHRONOLOGY INDEX (provider primary times; incomplete)
...

DEPLOYMENTS
...
WORKFLOW RUNS
...
OPERATIONS
...
CHANGES / TIMELINE
...
```

| Axis | Assessment |
| --- | --- |
| Trustworthiness | Strong (detail sections remain source of truth) |
| Readability | Good for power users; more vertical space |
| Provenance | Best (index points to detailed blocks) |
| Semantic loss | Lowest |
| Completeness implications | Clear if index labeled incomplete |
| Implementation complexity | Medium (index + keep sections) |

#### Comparison conclusion

**Option B is the best default product shape** for Sprint 024. Option C is
an acceptable presentation refinement once B’s projection exists. Option A
is rejected for v1 because mixing observer and provider clocks in one
sorted stream is the largest trustworthiness failure mode identified by
Sprints 018–023.

### Architecture Recommendation

## **B — Implement provider-evidence chronology only**

Vercel Deployments + GitHub Workflow Runs + Neon Operations can be merged
safely into one deterministic **ephemeral** provider chronology when:

- primary ordering uses provider-asserted **created** times
- current state and secondary times are labeled attributes (not wrong-time claims)
- subject vs neighbor + Relationship provenance is retained
- refresh authority / staleness / incompleteness remain visible
- no generic Event model is introduced
- no correlation/causality language appears

Resource Changes must **remain separate** because `Change.observedAt` is
observer time, not provider event time. Co-ordering them with provider
created times would produce a false total order of real-world activity.

Rejected alternatives:

| Option | Why not |
| --- | --- |
| A | Mixed authority clocks make one stream misleading even with careful verbs |
| C | Over-conservative; provider times are already comparable enough for a useful known-activity projection |
| D | No missing primitive blocks progress; ephemeral projection is sufficient |

### Sprint 024 Recommendation

Implement the **smallest pure projection** of provider-native evidence
already present on `InvestigationContext`:

1. Pure function, e.g. `composeProviderActivityChronology(context)`,
   producing ephemeral entries only.
2. Sources: subject + one-hop neighbor deployments, workflow runs, and
   operations (skip `not_applicable`; include stale rows only with
   authority markers).
3. One entry per evidence object at primary **created** time; include
   current provider state and secondary provider times as attributes.
4. Deterministic order: primary created DESC + evidenceKind + native id.
5. CLI section: `KNOWN PROVIDER ACTIVITY (newest first; incomplete)` —
   or keep existing detailed sections and add this as an additional
   index (Option B primary; Option C-compatible).
6. Preserve existing `TIMELINE` / CHANGES as Combie observation surfaces.
7. Tests for ordering, ties, subject/neighbor provenance, authority
   kinds, and non-inclusion of Changes.
8. **No** Event/Evidence domain type, **no** persistence, **no**
   correlation, **no** ObservationEngine, **no** new provider evidence.

Do not scaffold beyond that vertical slice.

### Explicit answers

1. **Can Combie compose provider-native evidence into one trustworthy
   chronology?**  
   **Yes**, as an ephemeral labeled projection of known provider activity
   ordered by provider-asserted primary created times, with incompleteness
   and authority caveats.

2. **Can Resource Changes safely participate in that SAME chronology?**  
   **Not as co-ordered peers.** They may appear in a separate observation
   section. Mixing observer time with provider event time in one stream
   is not trustworthy.

3. **One evidence object = one temporal entry, or multiple facts?**  
   Durable object remains one row. Projection **may** emit multiple
   temporal facts when provider fields assert them. Sprint 024 should
   start with **one primary entry per object** plus labeled attributes.

4. **What timestamp authority should drive ordering?**  
   Provider-asserted **created** times for provider chronology;
   `observedAt` only within the Change/observation section.

5. **How should provider time and Combie observation time coexist?**  
   As separate authority classes / sections (PROVIDER vs OBSERVATION),
   never collapsed into a single unlabeled clock.

6. **Does chronology require persistence?**  
   **No.**

7. **Does it require a generic Event/Evidence domain primitive?**  
   **No.**

8. **What provenance must every projected entry retain?**  
   evidence kind, provider, native id, Resource id, timestamp field
   semantic + authority class, subject/neighbor scope, Relationship path
   when neighbor, refresh/staleness authority when applicable.

9. **What completeness claim can Combie truthfully make?**  
   “What Combie currently knows from local memory” — **not** complete
   provider history and **not** “no other activity occurred.”

10. **What exactly should Sprint 024 implement, if anything?**  
    Smallest ephemeral provider-evidence chronology projection + CLI
    composition for investigate, keeping Changes separate; no generic
    Event model; no correlation.

### Validation

| Check | Result |
| --- | --- |
| Full `bun test` | 490 pass, 0 fail (baseline unchanged; research-only) |
| `bun run typecheck` | clean |
| Production code changes | **none** |
| Test code changes | **none** |
| Secret scan | no secrets introduced (docs-only Sprint) |
| Diff / whitespace | Sprint doc only |
| Worktree after commit | clean expected after Sprint 023 commit |

### Live / Fixture Evidence

#### Live local evidence

Path: `/Users/sergio/Documents/Developer/combie/.combie/combie.db`

| Table / fact | Observation |
| --- | --- |
| resources | 45 |
| changes | 0 |
| relationships | 0 |
| providers | vercel + cloudflare connected (last sync 2026-08-08) |
| vercel_deployments / github_workflow_runs / neon_operations | **tables absent** (DB predates Sprints 020–022 schema) |

Live data was **resource-inventory only** and did **not** provide
representative multi-family chronology examples. No credentials used; no
sync performed.

#### Fixture-based architecture examples

| Fixture | Temporal content used |
| --- | --- |
| `tests/providers/vercel/fixtures/deployments.json` | multi-lifecycle times + partial lifecycle |
| `tests/providers/github/fixtures/workflow-runs.json` | created/started/updated; success vs failure attempt |
| `tests/providers/neon/fixtures/operations.json` | finished vs failed; retry_at; duration |
| `tests/app/timeline.test.ts` | multi-resource Change merge + equal-`observedAt` ties |
| `tests/app/investigate-*.test.ts` | per-family ordering, authority, one-hop isolation |

Example multi-family stress (fixture composition only):

```text
PROVIDER  GitHub run 9001 created     2026-08-09T10:00:00Z
PROVIDER  GitHub run 9001 started     2026-08-09T10:00:05Z
PROVIDER  Neon op start_compute       2026-08-09T08:47:52Z
PROVIDER  Vercel dpl_ready created    2024-08-09T... (epoch fixture)
OBSERVER  Vercel project Change       (investigate seed observedAt)
```

Shows why provider times and observer times must not share one unlabeled
ordering authority.

### Deviations

- Sprint 022 completion notes suggested Sprint 023 might consolidate
  shared refresh/storage mechanics. The active Sprint 023 document instead
  researched **cross-evidence chronology**. Shared mechanics remain a
  valid later refactor; they were not selected as the Sprint 023 primary
  question.
- No multi-family live chronology sample was available offline; conclusions
  use implementation contracts + fixtures + prior Sprint notes.
- No production chronology was implemented (research-only by design).

### Learnings

1. Four temporal families are already fully available offline on
   `InvestigationContext`; chronology is a **presentation/composition**
   problem, not a storage gap.
2. The hard boundary is **time authority**, not “do we have enough rows.”
3. Provider evidence can share a chronology; Changes cannot honestly share
   that same authority class.
4. Lifecycle objects must not be rendered as “state at created time”
   without careful language.
5. Chronology ≠ correlation ≠ causality remains the correct product rule.
6. Ephemeral projection is enough; generic Event is still not earned.
7. Completeness vocabulary matters as much as sort order.

### Canon Changes

**None.** Research conclusions fit Vision (deterministic investigation
context), Architecture (provider adapters feed core; no speculative Event
engine), and Roadmap sequencing without requiring Canon edits.

Do not implement Sprint 024 in this Sprint.

------------------------------------------------------------------------

## Definition of Done

-   [x] Sprint 022 baseline verified
-   [x] SKILL protocol followed
-   [x] Canon read
-   [x] relevant Sprints 016--022 read
-   [x] Repository Understanding complete
-   [x] all four temporal record families inspected
-   [x] Temporal Authority Matrix complete
-   [x] provider-native timestamp semantics preserved
-   [x] Change `observedAt` semantics preserved
-   [x] lifecycle-object vs temporal-fact question answered
-   [x] subject/neighbor scope analyzed
-   [x] provenance requirements defined
-   [x] deterministic ordering options analyzed
-   [x] equal timestamp/tie behavior analyzed
-   [x] provider time vs observer time analyzed
-   [x] mutable evidence behavior analyzed
-   [x] stale evidence behavior analyzed
-   [x] retention/completeness limitations documented
-   [x] chronology vocabulary pressure-tested
-   [x] correlation boundary explicit
-   [x] causality boundary explicit
-   [x] observation boundary revisited
-   [x] persistence decision made
-   [x] generic Event abstraction not assumed
-   [x] candidate output options compared
-   [x] A/B/C/D recommendation selected
-   [x] Sprint 024 recommendation explicit
-   [x] full tests pass
-   [x] typecheck passes
-   [x] secret scan clean
-   [x] zero unintended production changes
-   [x] diff/whitespace checks clean
-   [x] completion notes updated
-   [x] Canon changes recorded or None
-   [ ] Sprint 023 committed separately
-   [ ] worktree clean
-   [x] Sprint 024 not started

------------------------------------------------------------------------

## Explicitly Out of Scope

Do not implement:

-   unified production timeline
-   generic Event
-   generic Evidence domain object
-   EventEngine
-   EvidenceEngine
-   ObservationEngine
-   CorrelationEngine
-   causal graph
-   cross-provider relationships
-   SHA correlation
-   time-window correlation
-   root-cause analysis
-   anomaly detection
-   confidence/scoring
-   AI/LLM/embeddings
-   webhooks
-   logs/metrics/traces
-   new provider evidence
-   new providers
-   recursive traversal
-   incident lifecycle
-   persisted investigations
-   MCP/API/SDK/UI
-   controlled execution
-   Sprint 024 scaffolding

------------------------------------------------------------------------

## Anti-Overengineering

Sprint 023 is not:

``` text
"Build a universal timeline system."
```

It is:

``` text
inspect four real temporal knowledge families
        ↓
understand timestamp authority
        ↓
understand lifecycle semantics
        ↓
understand provenance + completeness
        ↓
test whether pure chronology is trustworthy
        ↓
choose the smallest next step
        ↓
stop
```

------------------------------------------------------------------------

## What Sprint 023 Should Prove

Combie already knows more than it did when Sprint 018 rejected
deterministic observations as premature.

The question now is whether that richer evidence can be made easier to
reason about **without pretending it means more than it does**.

A successful Sprint 023 does not require a merged timeline.

A successful Sprint 023 gives us a precise answer about whether one is
trustworthy.

------------------------------------------------------------------------

## Final Principle

> **Order what Combie knows. Do not infer why it happened.**

If a cross-evidence chronology can preserve that boundary, Sprint 024
can implement it.

If it cannot, keep the evidence separate.

Either result is architectural progress.
