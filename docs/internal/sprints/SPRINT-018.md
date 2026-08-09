# SPRINT-018 --- Observation Evidence Investigation

> **Status:** Complete **Depends on:** SPRINT-017 (`65b43e5`) **Phase:**
> Investigation foundation **Type:** Evidence / semantics / architecture
> investigation **Primary goal:** Determine which useful investigation
> observations Combie can derive deterministically from existing
> InvestigationContext + Timeline without inference, heuristics,
> arbitrary thresholds, or causal claims **Production code:** No changes
> expected **New durable domain model:** None **New persistence:** None
> **AI / LLM:** None

## Goal

Sprint 017 gave Combie a deterministic, provenance-preserving
cross-resource timeline.

Combie can now answer:

``` text
What do I know?
What is related?
What changed?
In what recorded order did those Changes occur?
```

The next question is more subtle:

> **Which useful statements can Combie safely derive from those facts
> without pretending to understand why they happened?**

Sprint 018 investigates that boundary.

This Sprint does **not** implement an Observation model or Observation
engine.

It determines:

1.  what an "observation" should mean in Combie
2.  which candidate observations are pure deterministic facts
3.  which require explicit product rules or thresholds
4.  which become correlation or interpretation
5.  which cross into causal/probabilistic reasoning and must remain out
    of the deterministic layer
6.  whether observations deserve a first-class primitive at all

The result should determine the smallest evidence-backed next step.

------------------------------------------------------------------------

## Why Now

Combie's investigation foundation now looks like:

``` text
Resource
   ↓
InvestigationContext
   ↓
Investigation Timeline
   ↓
ordered evidence
```

A timeline is useful, but it still leaves the human to manually inspect
the evidence and notice simple structural facts.

Example:

``` text
10:09  Cloudflare zone      changed
10:07  Vercel project       changed
10:03  GitHub repository    changed
```

There are several different kinds of statements we could make about
this:

``` text
FACT
Three Resources have recorded Changes.

ORDERED FACT
The Vercel Change was observed after the GitHub Change.

WINDOWED STATEMENT
The Vercel Change occurred within five minutes of the GitHub Change.

CORRELATION CLAIM
The GitHub and Vercel Changes are related.

CAUSAL CLAIM
The GitHub Change caused the Vercel Change.
```

These are not equivalent.

Sprint 018 exists to define the boundary before Combie turns any of them
into product behavior.

------------------------------------------------------------------------

## Core Principle

> **Derive only what the evidence proves.**

A deterministic observation must be reproducible from persisted Combie
facts and explicit semantics.

It must not depend on:

-   probability
-   AI interpretation
-   fuzzy similarity
-   arbitrary importance scoring
-   hidden thresholds
-   causal assumptions
-   domain guesses
-   provider-specific intuition disguised as a generic rule

------------------------------------------------------------------------

## Fact → Observation → Claim Boundary

Pressure-test this conceptual distinction:

### Fact

A directly persisted or composed fact.

Examples:

``` text
Change X has observedAt T.
Resource A has 4 Changes.
Relationship R connects A to B.
```

### Deterministic Observation

A reproducible statement derived only from known facts using explicit
semantics.

Examples to evaluate:

``` text
3 Resources in this InvestigationContext have recorded Changes.

The newest recorded Change belongs to the Vercel project.

The Vercel project has 4 recorded Changes after Change X's observedAt.

No Changes are recorded for the related Cloudflare zone.

Two Changes share the same observedAt timestamp.
```

### Interpretive Claim

A statement whose meaning exceeds the evidence.

Examples:

``` text
These Changes are related.
This Change is suspicious.
This sequence is unusual.
The GitHub Change likely triggered Vercel.
This is probably the root cause.
```

These should not enter the deterministic observation layer.

The Sprint should refine these definitions based on the actual
repository and evidence model.

------------------------------------------------------------------------

## Observation Classification

Classify every candidate observation using exactly one class:

### A --- Pure deterministic derivation

The statement follows directly from persisted/composed facts with no
arbitrary threshold, heuristic, provider-specific guess, or
interpretation.

Examples may include:

``` text
counts
presence / absence
exact ordering
first / latest recorded Change
exact timestamp equality
exact before / after ordering
which Resources have recorded Changes
which Relationship kinds connect changed Resources
```

A-class candidates may justify implementation in a future Sprint.

### B --- Deterministic with explicit product semantics required

The computation is deterministic, but the statement requires a
product-defined threshold, window, grouping rule, or semantic convention
that is not inherent in the evidence.

Examples:

``` text
within 5 minutes
recently
near in time
burst
change window
same investigation period
```

These are not necessarily bad, but the rule must be explicit and
justified before implementation.

### C --- Interpretive / correlational

The statement implies meaningful association beyond exact structural or
temporal facts.

Examples:

``` text
related changes
correlated changes
likely connected
significant sequence
suspicious pattern
```

Do not implement these in the deterministic layer.

### D --- Causal / probabilistic / AI reasoning

The statement asserts or estimates why something happened.

Examples:

``` text
caused
root cause
likely caused
confidence
probability
recommended explanation
```

Reject from this layer.

------------------------------------------------------------------------

## Central Research Question

> **Can Combie produce a small, universally trustworthy set of
> deterministic investigation observations from InvestigationContext +
> Timeline alone?**

"Universally trustworthy" matters.

The observation should work across:

``` text
GitHub
Vercel
Cloudflare
Sentry
Neon
PlanetScale
future providers
```

unless the investigation explicitly concludes that provider-specific
observations belong in a different future layer.

Do not smuggle provider semantics into generic observation rules.

------------------------------------------------------------------------

## Existing Evidence Boundary

Sprint 018 may use only evidence already available through current
Combie primitives:

``` text
Resource
Relationship
Relationship evidence
Change
History
Context
InvestigationContext
Investigation Timeline
```

No new provider calls.

No telemetry.

No logs.

No metrics.

No traces.

No source-code inspection.

No environment-variable values.

No secret ingestion.

No database queries against user databases.

No external AI.

------------------------------------------------------------------------

## Candidate Observation Matrix

Evaluate at least the following candidate families.

### 1. Count observations

Examples:

``` text
N Resources have recorded Changes.
The subject has N recorded Changes.
N directly related Resources have recorded Changes.
N timeline entries exist.
```

Determine whether these are useful enough to deserve product output or
merely redundant metadata.

### 2. Presence / absence observations

Examples:

``` text
The subject has no recorded Changes.
A directly related Resource has no recorded Changes.
No related Resources have recorded Changes.
Only the subject has recorded Changes.
Only related Resources have recorded Changes.
```

Pressure-test the semantics carefully:

> "No recorded Changes" means Combie has no Change records in its
> observed history.

It does **not** mean the real infrastructure never changed.

Authority and observation boundaries must remain explicit.

### 3. Exact ordering observations

Examples:

``` text
Change A was observed after Change B.
Change A was observed before Change B.
The newest recorded Change belongs to Resource X.
The oldest recorded Change belongs to Resource Y.
```

Determine when pairwise ordering becomes noisy or combinatorial.

Do not generate every possible pair merely because it is deterministic.

### 4. Cross-resource ordering observations

Examples:

``` text
The newest subject Change was observed after the newest GitHub neighbor Change.
The latest recorded Change in this context belongs to a related Resource.
The subject has recorded Changes after the latest Change on a related Resource.
```

Evaluate whether these remain generic and useful.

### 5. Exact timestamp equality

Examples:

``` text
Changes on Resource A and Resource B share the same observedAt timestamp.
```

Pressure-test what this actually means.

A shared timestamp may result from the same Combie sync pass and must
**not** be described as simultaneous real-world changes unless evidence
proves that.

### 6. Relationship-aware structural observations

Examples:

``` text
Resources connected through source_for both have recorded Changes.
Resources connected through uses_domain_in both have recorded Changes.
```

Determine whether this is merely a deterministic structural fact or
whether wording like "both changed" risks implying correlation.

Preserve canonical Relationship semantics and evidence.

### 7. Field-level observations

Examples:

``` text
The same field changed more than once on one Resource.
Multiple Resources have Changes touching a field with the same literal field name.
A field returned to a previous value.
```

Pressure-test whether generic field-name comparison across providers is
meaningful.

Do not assume identical field labels across providers share semantics.

### 8. Repetition observations

Examples:

``` text
The subject has multiple recorded Changes for the same field.
A field changed N times.
```

Determine whether this is a useful deterministic observation or just a
count.

Do not label it instability, flapping, churn, or anomaly.

### 9. Time-window candidates

Evaluate, but do not implement:

``` text
within N minutes
recent
nearby in time
burst
cluster
```

These are expected to be B-class unless the repository reveals an
existing explicit semantic.

Document what product rule would be required.

### 10. Negative / missing-context observations

Evaluate statements such as:

``` text
No database Relationship is known for this Vercel project.
No Changes are recorded for a related Resource.
No Relationship of kind X exists.
```

Be extremely conservative.

Absence from Combie's knowledge is not proof of absence in the user's
infrastructure.

Determine what wording remains trustworthy.

------------------------------------------------------------------------

## Usefulness Bar

A statement being deterministic does not automatically make it worth
surfacing.

For every A-class candidate, evaluate:

1.  Is it correct?
2.  Is it provider-independent?
3.  Is it understandable?
4.  Does it reduce manual investigation work?
5.  Is it non-redundant with the raw timeline?
6.  Can it be explained directly from evidence?
7.  Does it remain useful at 0, 1, 10, and 100 Changes?
8.  Does it avoid combinatorial output?
9.  Does it avoid accidental correlation language?

A deterministic but useless observation should not automatically become
product behavior.

------------------------------------------------------------------------

## Observation Granularity

Determine the correct unit if observations are eventually implemented.

Possible levels:

``` text
Investigation-level
Resource-level
Relationship-level
Change-level
Field-level
```

Do not create all of them.

Identify the smallest useful level supported by evidence.

Examples:

``` text
Investigation-level:
3 Resources have recorded Changes.

Resource-level:
The subject has 4 recorded Changes.

Relationship-level:
Both endpoints of source_for have recorded Changes.

Change-level:
Change A was observed after Change B.

Field-level:
field X changed 3 times on Resource A.
```

Rank their usefulness and semantic safety.

------------------------------------------------------------------------

## Output Pressure

Do not assume observations need a CLI section.

Evaluate future presentation possibilities such as:

``` text
OBSERVATIONS
...
```

inside `combie investigate`, but do not implement it.

Ask whether observations should be:

-   always rendered
-   requested explicitly
-   limited to a small deterministic set
-   structured application output first
-   omitted entirely until richer evidence exists

Sprint 018 should recommend, not ship, the surface.

------------------------------------------------------------------------

## No Observation Domain Model Yet

Do not add:

``` text
Observation
ObservationKind
ObservationEngine
ObservationStore
ObservationRule
ObservationSeverity
ObservationConfidence
```

unless the investigation proves a future implementation needs one.

Even then, document the pressure; do not implement it in Sprint 018.

A future implementation may only need ephemeral derived values.

------------------------------------------------------------------------

## No Thresholds Yet

Do not choose:

``` text
5 minutes
10 minutes
1 hour
3 changes
high activity
recent
frequent
```

without explicit product semantics.

If a candidate requires a threshold, classify it B and document:

``` text
what threshold is needed
why evidence alone cannot choose it
what product/user semantics could define it later
```

------------------------------------------------------------------------

## No Causality

Reject language such as:

``` text
caused
triggered
led to
resulted in
because
root cause
likely
probably
confidence
```

Also pressure-test softer words that may still imply correlation:

``` text
associated
related changes
connected events
pattern
signal
suspicious
significant
```

Structural Relationships may be described exactly as persisted, but do
not imply that two Changes are related merely because their Resources
are related.

------------------------------------------------------------------------

## Observation Authority

Define what Combie is authoritative about.

Combie may be authoritative about:

``` text
what it persisted
what it observed
what its deterministic composition contains
the exact order of persisted observedAt timestamps
canonical Relationships it has evidence for
```

Combie is not automatically authoritative about:

``` text
whether no real-world Change occurred
whether provider events happened exactly at observedAt
whether two Changes were simultaneous
whether a missing Relationship does not exist in reality
why a Change happened
whether a Change matters
```

Document these boundaries explicitly.

------------------------------------------------------------------------

## `observedAt` Semantics

This is critical.

Inspect how `observedAt` is created.

Determine whether it represents:

``` text
provider event time
Combie discovery time
sync observation time
some provider-specific timestamp
```

Do not describe ordering more strongly than the timestamp semantics
allow.

If multiple Changes receive the same `observedAt` because a sync
captures one timestamp for multiple detected Changes, document that
clearly.

This finding should constrain candidate observations.

For example:

``` text
"observed after"
```

may be safe.

``` text
"happened after"
```

may not be.

Use exact terminology.

------------------------------------------------------------------------

## Relationship Semantics

Inspect current canonical kinds:

``` text
source_for
uses_domain_in
```

A Relationship proves the semantics defined by its evidence contract.

It does **not** prove that Changes on both endpoints are causally or
operationally connected.

For example:

``` text
GitHub repository source_for Vercel project
```

plus:

``` text
GitHub Change at T1
Vercel Change at T2
```

allows:

``` text
A Change was observed on each endpoint of source_for.
T2 was observed after T1.
```

It does not automatically allow:

``` text
The source change triggered the project change.
```

------------------------------------------------------------------------

## Repository Understanding Report

Before research conclusions, inspect baseline `65b43e5`.

At minimum inspect:

-   `src/app/investigate.ts`
-   `src/app/timeline.ts`
-   `InvestigationContext`
-   timeline DTOs
-   timeline ordering
-   Change domain model
-   Change evidence shape
-   `observedAt` creation and persistence
-   sync Change-detection path
-   Relationship domain/evidence
-   Resource metadata
-   Context and History formatting
-   timeline/investigate tests
-   Sprint 016 completion notes
-   Sprint 017 completion notes
-   Canon

Report:

``` text
what facts exist
what timestamps mean
what provenance exists
what deterministic derivations are already possible
what evidence is absent
```

No production code before this report.

------------------------------------------------------------------------

## Architecture Pressure Report

Answer:

1.  What exactly does `observedAt` mean today?
2.  Can exact ordering support "observed before/after" safely?
3.  What does timestamp equality actually prove?
4.  Which facts are already directly available from
    InvestigationContext?
5.  Which facts require Timeline?
6.  Which candidate observations are A/B/C/D?
7.  Which A-class observations are actually useful?
8.  Which deterministic observations are redundant with raw output?
9.  What wording avoids overstating authority?
10. Can generic observations remain provider-independent?
11. Do Relationship kinds add useful deterministic structure without
    implying correlation?
12. Is field-level comparison safe across providers?
13. Can repetition be described without anomaly language?
14. How should absence/no-history be worded?
15. Would pairwise ordering create combinatorial noise?
16. What observation granularity is smallest and useful?
17. Would a future implementation need a domain type or only ephemeral
    DTOs?
18. Would a future implementation need persistence?
19. Would a future implementation require time-window semantics first?
20. Does any candidate require thresholds?
21. Should observations eventually appear inside `investigate` or remain
    an application primitive?
22. What evidence is missing for richer observations?
23. Does anything require Canon change?

------------------------------------------------------------------------

## Evidence Matrix

Produce a ranked matrix with at least:

  --------------------------------------------------------------------------------------------------------------------------------
  Candidate      Example                                      Class    Evidence   Product     Correlation   Usefulness   Verdict
                                                                       required   rule        risk                       
                                                                                  required?                              
  -------------- -------------------------------------------- -------- ---------- ----------- ------------- ------------ ---------
  Change count   `3 Resources have recorded Changes`          ?        ...        ...         ...           ...          ...

  Latest changed `Newest recorded Change belongs to Vercel`   ?        ...        ...         ...           ...          ...
  Resource                                                                                                               

  Exact ordering `A was observed after B`                     ?        ...        ...         ...           ...          ...

  Timestamp      `A and B share observedAt`                   ?        ...        ...         ...           ...          ...
  equality                                                                                                               

  Relationship   `Both endpoints have Changes`                ?        ...        ...         ...           ...          ...
  endpoints                                                                                                              
  changed                                                                                                                

  Repeated field `field X changed N times`                    ?        ...        ...         ...           ...          ...
  Change                                                                                                                 

  Returned value `field X returned to previous value`         ?        ...        ...         ...           ...          ...

  Within N       `A observed within 5m of B`                  ?        ...        ...         ...           ...          ...
  minutes                                                                                                                

  Missing        `No Changes recorded for X`                  ?        ...        ...         ...           ...          ...
  history                                                                                                                

  Missing        `No database Relationship known`             ?        ...        ...         ...           ...          ...
  relationship                                                                                                           
  --------------------------------------------------------------------------------------------------------------------------------

Add candidates discovered from the repository.

Do not force an A-class result.

------------------------------------------------------------------------

## Observation Vocabulary

Produce a small vocabulary review.

### Preferred factual terms to evaluate

``` text
recorded
observed
contains
has
before
after
same observedAt
connected by <RelationshipKind>
no recorded Changes
```

### Terms to reject or reserve

``` text
happened
caused
triggered
correlated
likely
suspicious
significant
anomalous
root cause
signal
pattern
```

Document final wording recommendations.

------------------------------------------------------------------------

## Production Code

Expected production diff:

``` text
None
```

Allowed changes:

``` text
docs/internal/sprints/SPRINT-018.md
```

and investigation artifacts explicitly allowed by repository
conventions.

Do not modify:

``` text
src/
tests/
SQLite schema
CLI
domain types
providers
Relationships
Change model
InvestigationContext
Timeline
```

If a serious correctness/security bug is discovered, stop and report it
rather than silently folding unrelated implementation into Sprint 018.

------------------------------------------------------------------------

## Validation

Run the unchanged baseline:

``` bash
bun test
bun run typecheck
```

Confirm:

-   Sprint 001--017 behavior remains green
-   zero production/test changes
-   secret scan clean
-   diff limited to investigation/docs
-   worktree clean after commit
-   Sprint 019 not started

------------------------------------------------------------------------

## Live / Local Investigation

Use existing local data only if it helps validate semantics.

Safe questions include:

``` text
What observedAt values actually look like?
How often do equal timestamps occur?
How many Resources currently have Changes?
How noisy would candidate observations be?
```

Do not mutate the DB.

Do not call providers.

Do not require credentials.

Do not treat lack of local Changes as evidence that a candidate is
invalid; use tests/fixtures and implementation semantics where
appropriate.

------------------------------------------------------------------------

## Required Final Recommendation

End Sprint 018 with **exactly one** recommendation:

### A --- Implement a minimal deterministic observation layer next

Choose only if a small set of useful, provider-independent, A-class
observations is clearly justified.

Specify:

-   exact observation candidates
-   exact wording
-   input primitive(s)
-   ephemeral shape
-   ordering/deduplication
-   CLI/application placement
-   why no thresholds/inference are needed

### B --- Define temporal-window semantics next

Choose if useful observations primarily require explicit window
semantics before they can be trustworthy.

Specify the semantic decision required; do not choose arbitrary
thresholds.

### C --- Improve evidence richness next

Choose if current Resource/Relationship/Change evidence is too shallow
for useful observations.

Specify exactly what evidence is missing.

Do not automatically interpret this as "add telemetry."

### D --- Defer observations

Choose if deterministic observations are mostly redundant, noisy, or not
yet valuable enough to justify a primitive.

State what product capability should come next instead and why.

Only one recommendation.

Do not predefine Sprint 019.

------------------------------------------------------------------------

## Success

Any of these can be a successful Sprint:

``` text
A: a tiny deterministic observation primitive is justified
B: explicit time semantics are the actual missing primitive
C: richer evidence is required first
D: observations are premature
```

The Sprint succeeds by reducing uncertainty, not by producing code.

------------------------------------------------------------------------

## Explicitly Out of Scope

Do not implement:

-   Observation model
-   Observation engine
-   Observation rules
-   Observation CLI section
-   thresholds
-   time windows
-   temporal clustering
-   correlation
-   causality
-   root-cause analysis
-   anomaly detection
-   scoring
-   confidence
-   hypotheses
-   investigation persistence/lifecycle
-   AI/LLM
-   embeddings
-   recursive graph traversal
-   new Relationships
-   `uses_database`
-   provider enrichment
-   new providers
-   logs
-   metrics
-   traces
-   source-code analysis
-   environment-variable ingestion
-   MCP/API/SDK/UI
-   controlled execution
-   Sprint 019 scaffolding

------------------------------------------------------------------------

## Anti-Overengineering

Do not create:

``` text
ObservationEngine
RuleEngine
SignalEngine
CorrelationEngine
PatternDetector
AnomalyDetector
TemporalAnalyzer
EvidenceScorer
```

Sprint 018 is:

``` text
read
inspect
classify
define semantics
recommend
stop
```

------------------------------------------------------------------------

## Canon

Permanent Canon remains:

-   `VISION.md`
-   `ARCHITECTURE.md`
-   `ROADMAP.md`
-   `SKILL.md`

Do not change Canon merely because Combie has entered the Investigation
phase.

Update only if the investigation proves an existing statement materially
inaccurate.

------------------------------------------------------------------------

## Completion Notes

### Repository Understanding

Baseline: `65b43e5 feat(investigate): add deterministic investigation timeline`.

Sprint 016/017 completion notes, Canon (`VISION` / `ARCHITECTURE` /
`ROADMAP` / `SKILL`), and implementation at that commit were inspected
before conclusions. Production code was not modified.

#### Repository Summary

| Area | State at baseline |
|------|-------------------|
| Investigation foundation | `InvestigationContext` (016) + `InvestigationTimeline` (017) |
| App modules | `src/app/investigate.ts`, `src/app/timeline.ts`, `history.ts`, `context.ts`, `related.ts`, `sync.ts` |
| Domain | `Change`, `ChangeField`, `Resource`, `Relationship` (`source_for`, `uses_domain_in`) |
| Persistence | SQLite `changes` / `resources` / `relationships`; credentials separate |
| Providers | Cloudflare, GitHub, Vercel, Sentry, Neon, PlanetScale |
| Tests | 400 pass at baseline; timeline + investigate fixtures cover multi-resource order, ties, dangling edges |
| Local `./.combie` | 45 Resources, **0** Relationships, **0** Changes (empty history is a valid product state) |

#### Facts that exist today

```text
Resource               current normalized name + metadata
Relationship           source_for | uses_domain_in + evidence
Change                 kind=updated only; fields[{path,before,after}]; observedAt
InvestigationContext   subject + subjectChanges + one-hop related(+changes)
InvestigationTimeline  merge of those Changes with role + relationship paths
```

Composition is read-only, offline, ephemeral. Timeline adds **zero**
storage reads beyond context construction. Ordering is
`observedAt DESC, id DESC` via raw string comparison (never parsed).

#### Sprint readiness for observations

| Exists | Reusable as input | Must not add in 018 |
|--------|-------------------|---------------------|
| Context + Timeline DTOs | Pure derivation over them | Observation domain/engine/store |
| Exact Change evidence | Counts, presence, order | Thresholds, windows, scoring |
| Relationship provenance | Structural endpoint facts | Correlation language |
| Sync-stamped `observedAt` | Constrains temporal claims | Causal chronology claims |

#### Canon alignment

Investigation is composition over existing knowledge (consistent with
INVESTIGATE progression). Architecture names a future Observation
primitive in the Engineering Model; that Canon concept is broader than
"CLI observation statements" and must not be implemented early. No
architectural drift required a Canon rewrite for this Sprint.

#### Risks relevant to observation semantics

1. **`observedAt` is not provider event time** — temporal statements are
   easy to overstate.
2. **One timestamp per provider sync pass** — equality and cross-resource
   order are partly sync artifacts.
3. **Multi-provider sequential sync** (`listProviders` ordered by `id`)
   — later providers in the same multi-sync run receive later
   `observedAt` values when both detect diffs.
4. **Field path strings are not a shared ontology** across providers.
5. **Investigate already renders** subject history, related history, and
   timeline — many A-class summaries are redundant.

------------------------------------------------------------------------

### Architecture Pressure

1. **What does `observedAt` mean today?**

   **Combie sync observation time**: after a successful
   `provider.discoverResources`, `syncOne` sets
   `const now = new Date().toISOString()` once and passes that same
   string to every `applyResource` in the provider pass
   (`src/app/sync.ts`). It is also stored as `providers.last_sync_at`.
   It is **not** provider event time. Confirmed by Sprint 010/011 notes
   and production code.

2. **Can exact ordering support "observed before/after" safely?**

   **Yes**, if wording means *Combie's recorded observation timestamps
   order as strings*. Lexicographic order of `toISOString()` values
   matches chronology. It does **not** safely support "happened before."

3. **What does timestamp equality prove?**

   Two Changes share the **same observation stamp string**. Typical
   cause: multiple Resources produced Changes in the **same provider
   sync pass** (shared `now`). Does **not** prove simultaneous
   real-world infrastructure events, shared causality, or even that two
   providers ran in the same multi-provider invocation (clock collision
   possible but rare).

4. **Which facts are already directly available from InvestigationContext?**

   Subject Resource; full subject Changes; one-hop Relationships +
   direction; neighbor Resources or dangling null; per-neighbor
   Changes; all counts/presence/field evidence by iteration.

5. **Which facts require Timeline?**

   Cross-resource total order; unique Change merge across edge-shaped
   neighbors; per-entry role + multi-path Relationship provenance in one
   sequence. Counts of unique Changes in context are easier from
   Timeline (deduped).

6. **Which candidates are A/B/C/D?**

   See Evidence Matrix. Pure counts/presence/exact order/equality are
   A when carefully worded. Windows are B. Correlation language is C.
   Causality is D.

7. **Which A-class observations are actually useful?**

   Few. Compact investigation-level summaries (resource-with-changes
   count; newest recorded Change's Resource) add mild glance value.
   Most A-class statements repeat what SUBJECT CHANGES / RELATED
   CONTEXT / TIMELINE already show.

8. **Which deterministic observations are redundant with raw output?**

   Per-resource change lists, pairwise orderings, empty-history lines
   already printed, full field diffs already printed, timeline length
   ≈ number of printed timeline entries.

9. **What wording avoids overstating authority?**

   Prefer *recorded*, *observed*, *no recorded Changes*, *same
   observedAt*, *connected by `<kind>`*. Avoid *happened*, *caused*,
   *simultaneous*, *related changes*, *pattern*, *signal*.

10. **Can generic observations remain provider-independent?**

    Yes for structural/temporal-observation facts over domain types.
    No for field-path equality across providers or provider-specific
    "importance" of metadata keys.

11. **Do Relationship kinds add useful deterministic structure without
    implying correlation?**

    Structural endpoint presence is A-class if worded carefully. Risk of
    C is high if product says "both endpoints changed" without
    "recorded" and without disclaiming operational linkage.

12. **Is field-level comparison safe across providers?**

    **Literal path equality is deterministic; semantic equality is not.**
    Colliding keys (`accountId`, `status`, `createdAt`, `defaultBranch`,
    `engine`, `branches`) do not share meaning. Cross-provider same-path
    observations should not enter a generic layer.

13. **Can repetition be described without anomaly language?**

    Yes: "field `metadata.X` appears in N recorded Changes on Resource
    R." Do not say flapping, churn, instability, suspicious.

14. **How should absence/no-history be worded?**

    "No Changes are recorded for … (Combie has no Change rows since the
    trustworthy baseline)." Not "never changed." "No Relationship of
    kind K is known" means no persisted edge, not "systems are
    unrelated."

15. **Would pairwise ordering create combinatorial noise?**

    **Yes.** N Changes → O(N²) pairs. Reject emitting all pairs.
    Timeline already provides total order; if anything, surface
    first/latest only.

16. **What observation granularity is smallest and useful?**

    **Investigation-level summaries** are the only granularity with a
    non-trivial usefulness case (compact view over already-visible
    detail). Resource-level zero states are already explicit. Field-level
    same-resource repetition is A but low value. Change-level pairwise
    and Relationship-level "both changed" are low value / high risk.

17. **Future domain type or ephemeral DTOs?**

    If ever implemented: **ephemeral derived values only** — no
    Observation table, no IDs, no lifecycle. Same pattern as Timeline.

18. **Would a future implementation need persistence?**

    **No** for deterministic investigation observations over current
    memory.

19. **Would a future implementation require time-window semantics first?**

    **No for A-class.** Windows would only matter for B-class candidates,
    and windows over sync-observation timestamps remain weak.

20. **Does any candidate require thresholds?**

    Time-window / burst / "recently" / "frequent" candidates require
    explicit product rules (B). Counts do not.

21. **Should observations appear inside `investigate` or remain an
    application primitive?**

    If ever: application-level derivation first; CLI only if a tiny
    non-redundant set is proven. Prefer **not** always-on OBSERVATIONS
    section today — it would mostly restate the timeline.

22. **What evidence is missing for richer observations?**

    - Provider event time distinct from Combie observation time
    - Higher-meaning Change/event kinds (deployments, releases, alerts)
      beyond `updated` name/metadata diffs
    - Richer operational facts that still fit memory-not-telemetry
      discipline (not automatic log/metric warehouse)
    - Additional Relationship kinds only when evidence contracts exist
      (not invented)

23. **Does anything require Canon change?**

    **None.** Semantics refined in this Sprint doc only.

------------------------------------------------------------------------

### Timestamp Semantics

| Question | Finding |
|----------|---------|
| Source | `src/app/sync.ts`: `now = new Date().toISOString()` after discovery, before apply loop |
| Meaning | **Sync observation / discovery-application time** for one provider pass |
| Not | Provider event time; not "when infrastructure mutated" |
| Granularity | **One stamp per successful provider sync**, shared by all Changes created in that pass |
| Multi-provider | Each `syncOne` gets its own `now`; providers run sequentially |
| Format | ISO-8601 UTC with milliseconds (`…Z`); stored as TEXT verbatim |
| Parse on order? | No — timeline/history use raw string compare |
| Equality | Shared observation stamp (usually same provider pass) — **not** real-world simultaneity |
| Safe phrase | "was observed after" / "recorded with later observedAt" |
| Unsafe phrase | "happened after" / "occurred simultaneously" |

**Critical multi-provider artifact:** full multi-provider sync walks
providers ordered by provider `id`. When several providers each record
Changes in one multi-sync invocation, later-synced providers receive
later `observedAt` values regardless of real-world event order. Cross-
resource "newest belongs to X" and "A observed after B" can therefore
reflect **sync schedule**, not infrastructure chronology.

Within a single Resource across multiple syncs, later `observedAt` still
only means Combie recorded a later state transition observation — useful
as Combie memory chronology, still not provider event chronology.

------------------------------------------------------------------------

### Observation Authority

**Combie is authoritative about:**

```text
what it persisted in local memory
what InvestigationContext / Timeline composition contains
exact recorded observedAt strings and their string order
canonical Relationships it has evidence for
field-level before/after evidence it stored
explicit zero states for recorded Changes / known Relationships
```

**Combie is not authoritative about:**

```text
whether the real infrastructure never changed
whether provider events occurred at observedAt
whether two Changes were simultaneous in the real world
whether a missing Relationship does not exist outside Combie
why a Change happened
whether a Change matters
operational coupling of Changes on related Resources
semantic identity of field paths across providers
```

#### Semantic boundary (refined)

| Class | Definition |
|-------|------------|
| **FACT** | Persisted or directly held values (Change row, Relationship edge, Resource fields) |
| **DETERMINISTIC OBSERVATION** | Reproducible statement from facts + explicit composition semantics only |
| **INTERPRETIVE CLAIM** | Implies association, importance, pattern, or correlation beyond evidence |
| **CAUSAL / PROBABILISTIC CLAIM** | Why, likelihood, confidence, root cause |

------------------------------------------------------------------------

### Candidate Evidence Matrix

Classes: **A** pure deterministic · **B** deterministic + product rule ·
**C** interpretive/correlational · **D** causal/probabilistic.

| Candidate | Example | Class | Evidence required | Product rule required? | Correlation risk | Usefulness | Verdict |
|-----------|---------|-------|-------------------|------------------------|------------------|------------|---------|
| Resource change count | `3 Resources have recorded Changes` | A | Context/Timeline resource sets with `changes.length > 0` | No | Low if "recorded" | Mild summary; mostly redundant with scanning timeline | **Hold** — correct but thin |
| Subject change count | `Subject has 4 recorded Changes` | A | `subjectChanges.length` | No | None | Redundant with SUBJECT CHANGES | **Reject as product surface** |
| Timeline length | `Timeline contains N entries` | A | `timeline.entries.length` | No | None | Redundant with printed list length | **Reject as product surface** |
| Related with changes count | `N related Resources have recorded Changes` | A | Neighbors with history | No | Low | Mild; zero states already explicit per neighbor | **Hold** |
| Subject no history | `Subject has no recorded Changes` | A | Empty `subjectChanges` | No | None if "recorded" | Already shown | **Reject as new surface** |
| Related no history | `Related Resource X has no recorded Changes` | A | Neighbor `changes: []` | No | Medium if read as "stable" | Already shown per neighbor | **Reject as new surface**; keep existing wording |
| Only subject changed | `Only the subject has recorded Changes` | A | Subject has history; all related empty | No | Medium ("isolated change") | Some investigation focus value | **Hold** with careful wording |
| Exact pairwise order | `Change A was observed after Change B` | A | Two `observedAt` strings | No | High if many pairs | Combinatorial noise; timeline exists | **Reject pairwise emission** |
| Newest resource | `Newest recorded Change belongs to Resource X` | A | First timeline entry | No | **High** under multi-provider sync artifact | Glance value undermined by sync order | **Defer** until stronger time evidence |
| Oldest resource | `Oldest recorded Change belongs to Resource Y` | A | Last timeline entry | No | Same as newest | Low | **Defer** |
| Cross-resource after | `Newest subject Change observed after newest related GitHub Change` | A (wording) / misleading product | Per-resource max `observedAt` | No | **Very high** | Weak under sync-time semantics | **Reject as product surface** |
| Timestamp equality | `A and B share the same observedAt` | A | Equal strings | No | High if called "simultaneous" | Low; usually sync batch | **Reject** unless debugging sync semantics |
| Equality group size | `K Changes share observedAt T` | A | Group by stamp | No | Medium | Low for investigation | **Reject** |
| Both endpoints recorded | `Both endpoints of source_for have recorded Changes` | A structural | Edge + both histories non-empty | No | **High** toward C | Structural curiosity; weak investigation value | **Reject** without stronger event evidence |
| Same field multi-change (one Resource) | `metadata.framework appears in 3 recorded Changes on R` | A | Field paths across R's Changes | No | Medium if labeled churn | Low–moderate | **Hold** only for same Resource |
| Field returned to previous value | `path P after value equals an earlier before on same Resource` | A | Ordered Changes on one Resource | No | Medium (looks like flapping) | Low without anomaly framing | **Hold / low priority** |
| Same field path across Resources | `Two Resources have Changes with path metadata.status` | A literal / **C semantic** | Path strings | Ontology if claiming same meaning | **High** | Misleading across providers | **Reject** generic use |
| Within N minutes | `A observed within 5m of B` | B | Parsed timestamps + delta | **Yes** — window definition; still weak because stamps are sync times | High | Tempting but untrustworthy now | **Do not implement** |
| Recently / burst / cluster | `Changes clustered recently` | B | Window + grouping rule | **Yes** — arbitrary without product semantics | High | Premature | **Do not implement** |
| No database Relationship known | `No database Relationship is known for this Vercel project` | A absence-of-knowledge | No edge of that kind (and kind may not exist) | Careful wording only | High if "no DB" | Dangerous; Combie has no `uses_database` | **Reject** kind-specific invented absences |
| No Relationship known | `No relationships discovered` | A | `related: []` | No | Medium | Already shown | **Keep existing copy only** |
| Related Changes | `These Changes are related` | C | — | — | Inherent | — | **Reject** |
| Suspicious / significant pattern | `Unusual sequence` | C | — | — | Inherent | — | **Reject** |
| Caused / triggered / root cause | `GitHub Change caused Vercel Change` | D | — | — | Inherent | — | **Reject** |
| Confidence / likely | `Likely deployment regression` | D | — | — | Inherent | — | **Reject** |

------------------------------------------------------------------------

### Usefulness Review

Applied to every A-class candidate:

| Question | Result for current knowledge |
|----------|------------------------------|
| Correct? | Yes for carefully worded A-class |
| Provider-independent? | Structural/temporal-observation counts yes; field paths no across providers |
| Understandable? | Yes if "recorded/observed" vocabulary enforced |
| Reduces manual work? | **Rarely** — investigate already shows the evidence |
| Non-redundant with timeline? | Mostly **no** |
| Explainable from evidence? | Yes |
| Scales to 0/1/10/100 Changes? | Pairwise and equality groups degrade; counts stay fine |
| Avoids combinatorial output? | Only if pairs/windows rejected |
| Avoids correlation language? | Only with strict vocabulary |

**Conclusion:** Deterministic ≠ product-worthy. The set of *safe* observations
is larger than the set of *useful* ones. Usefulness is the binding
constraint, not computability.

------------------------------------------------------------------------

### Observation Granularity

| Level | Semantic safety | Usefulness now | Rank |
|-------|-----------------|----------------|------|
| Investigation-level | High if compact counts only | Mild | 1 (only candidate level) |
| Resource-level | High | Mostly redundant with sections | 2 |
| Relationship-level | Medium (correlation risk) | Low | 4 |
| Change-level pairwise | High safety / high noise | Low | 5 |
| Field-level (same Resource) | High | Low–moderate | 3 |
| Field-level (cross Resource) | Low semantic safety | Misleading | Reject |

**Smallest useful granularity supported by evidence:** investigation-level
summaries — and even those are **not justified as a product layer yet**.

------------------------------------------------------------------------

### Vocabulary

#### Preferred (factual)

```text
recorded
observed
contains
has
before / after          (only with "observed" / "recorded")
same observedAt
connected by <RelationshipKind>
no recorded Changes
in this InvestigationContext
since the trustworthy Change baseline
```

#### Rejected or reserved (not for deterministic layer)

```text
happened
occurred simultaneously
caused / triggered / led to / resulted in
correlated / associated changes
related changes          (ambiguous with Relationship)
likely / probably / confidence
suspicious / significant / anomalous
root cause
signal / pattern
flapping / churn / instability
burst / cluster / recently   (until explicit B-class rules exist)
```

#### Wording templates that remain truthful

```text
N Resources in this InvestigationContext have recorded Changes.
Resource X has no recorded Changes since its trustworthy baseline.
Change A was observed after Change B (by recorded observedAt).
Changes A and B share the same observedAt stamp.
Resources connected by source_for each have at least one recorded Change.
No Relationship of kind source_for is known for this Resource in Combie.
```

------------------------------------------------------------------------

### Threshold / Window Findings

| Candidate family | Class | Required product rule if ever pursued |
|------------------|-------|----------------------------------------|
| within N minutes | B | Explicit window definition + statement that stamps are Combie observation times, not event times |
| recently | B | Anchor time (wall clock vs last sync vs investigation open) + window |
| burst / cluster | B | Density rule + window + minimum count — none inherent in evidence |
| frequent field changes | B | Count threshold and period — do not invent "3 = flapping" |

No thresholds were chosen. Windows over current `observedAt` would often
measure **sync proximity**, not infrastructure event proximity — so B-class
rules would still be weak product.

------------------------------------------------------------------------

### Relationship Findings

| Kind | Proves | Does not prove |
|------|--------|----------------|
| `source_for` | GitHub repo is Git source for Vercel project per Vercel link evidence | Deployment, production branch, runtime coupling, Change causality |
| `uses_domain_in` | Vercel custom-domain apex matches Cloudflare zone name | DNS routing, hosting, traffic, Change causality |

Persisted Relationship + Changes on both endpoints allows only:

```text
Both endpoints of <kind> have recorded Changes in Combie memory.
```

It does **not** allow:

```text
The Changes are related / connected events / one triggered the other.
```

------------------------------------------------------------------------

### Missing Context Findings

Useful future observations (especially temporal or operational) need richer
evidence than name/metadata diffs stamped at sync time. Missing today:

1. **Provider event time** (or a second timestamp field) distinct from
   Combie observation time
2. **Higher-meaning events** — deployments, releases, incident/alert
   states — as first-class memory where providers expose them
3. **Provenance of when a fact became true in the provider**, not only
   when Combie noticed a metadata delta
4. **Relationship kinds** only when deterministic evidence contracts
   exist (database links remain intentionally absent per Sprint 015)

Not automatically required: raw log/metric/trace warehouse, AI, scoring.

Sprint 017's learning named a gap for non-Change operational facts. This
Sprint refines that: implementing *derived observation statements* over
current Change memory is premature; **evidence richness** is the binding
constraint.

------------------------------------------------------------------------

### Live / Fixture Investigation

**Local `./.combie` (read-only):**

| Metric | Value |
|--------|-------|
| Resources | 45 |
| Relationships | 0 |
| Changes | 0 |
| observedAt equality frequency | N/A (no Changes) |
| Observation noise | Empty-history path dominates live data |

Local emptiness is **not** used as evidence against candidate validity.
It does show that investigation often presents zero-state wording, where
additional OBSERVATIONS would restate "no recorded Changes."

**Fixtures / tests / implementation:**

- Timeline tests prove identical `observedAt` + `id DESC` ties are normal.
- Store tests prove A→B→A yields two Changes; initial discovery yields none.
- `sync.ts` proves shared `now` per provider pass.
- Multi-provider sequential sync + `ORDER BY id` provider listing supports
  the sync-order chronology artifact finding.

No provider APIs called. No credentials required. Database not mutated.

------------------------------------------------------------------------

### Security Review

| Check | Result |
|-------|--------|
| Provider calls | None |
| Credential / env secret reads | None for investigation work |
| User application DB queries | None |
| Production `src/` / tests / schema | Unchanged |
| Secret patterns in Sprint 018 docs | None introduced |
| Local DB access | Read-only inspection of counts only |

------------------------------------------------------------------------

### Final Recommendation

## **C — Improve evidence richness next**

### Why not A

A small set of A-class statements *can* be derived, but they are largely
**redundant** with InvestigationContext + Timeline output and do not
materially reduce investigation work. Cross-resource temporal A-class
statements are especially weak because `observedAt` is sync observation
time and multi-provider sync order invents chronology. Implementing an
observation layer now would mostly restate facts the user already sees.

### Why not B

Time windows would formalize proximity over **sync stamps**, not provider
event times. That makes "within N minutes" look more meaningful than the
evidence supports. Windows should not be defined until temporal evidence
is stronger.

### Why not D alone

"Defer observations" is directionally correct, but the concrete next
capability is not an arbitrary other feature: it is **richer memory
evidence** so that any future deterministic observations (or timelines)
can speak about more than metadata-diff sync batches.

### Why C

Current Resource/Relationship/Change evidence is too shallow for useful
investigation observations:

| Gap | Why it blocks useful observations |
|-----|-----------------------------------|
| No provider event time | Cannot truthfully order real-world events |
| Only `kind: "updated"` metadata/name diffs | Missing deployments, releases, operational state transitions |
| Sync-batch `observedAt` | Equality and cross-resource order are often sync artifacts |
| Narrow Relationships | Structural graph is thin; no invented edges |

**Smallest evidence-backed next step (not a Sprint 019 design):** strengthen
what Combie remembers so chronology and presence statements become
investigation-valuable — especially distinguishing **when Combie observed**
from **when a provider event occurred**, and capturing higher-meaning
events where adapters can prove them. Do **not** start ObservationEngine,
windows, correlation, or causality.

If evidence later supports a tiny non-redundant A-class set, revisit A with
ephemeral DTOs only.

------------------------------------------------------------------------

### Validation

```bash
bun test          # 400 pass, 0 fail
bun run typecheck # clean
```

- Production code diff: **zero**
- Test diff: **zero**
- Schema / CLI / domain / providers: **untouched**
- Secret scan: clean (docs only; no credentials)
- Full diff review: Sprint 018 documentation only
- Sprint 019: not defined or scaffolded

### Deviations

None material. Investigation-only Sprint as planned. Recommendation is C
rather than implementing observations.

### Learnings

1. **Can Combie derive useful investigation observations deterministically
   from its current knowledge without crossing into correlation or
   causality?**

   **Partially computable; not product-useful yet.**

   Combie *can* derive many correct A-class statements (counts, recorded
   presence/absence, exact observedAt order/equality, same-Resource field
   repetition) without heuristics or AI. Those statements are trustworthy
   only with strict vocabulary ("recorded" / "observed", not "happened").

   They are **not sufficiently useful** as a product surface today because:
   (a) investigate already presents the underlying evidence;
   (b) cross-resource temporal claims are weakened by sync-time stamps and
   sequential multi-provider sync order;
   (c) field/relationship-aware statements easily slide into accidental
   correlation language.

2. **What is the smallest evidence-backed next step?**

   **Improve evidence richness (Recommendation C)** — especially temporal
   authority and higher-meaning events — before implementing an observation
   layer, time windows, or interpretive claims.

### Canon Changes

**None.** VISION, ARCHITECTURE, ROADMAP, and SKILL remain unchanged.

Do not define or implement Sprint 019.

------------------------------------------------------------------------

## Definition of Done

-   [x] inspect baseline `65b43e5`
-   [x] follow `skills/build-combie/SKILL.md`
-   [x] read Canon + Sprint 016/017 completion notes
-   [x] Repository Understanding report
-   [x] Architecture Pressure report
-   [x] inspect exact `observedAt` creation semantics
-   [x] document timestamp authority
-   [x] define Fact / Deterministic Observation / Interpretive Claim
    boundary
-   [x] classify candidates A/B/C/D
-   [x] evaluate count observations
-   [x] evaluate presence/absence observations
-   [x] evaluate exact ordering observations
-   [x] evaluate cross-resource ordering observations
-   [x] evaluate timestamp-equality observations
-   [x] evaluate Relationship-aware observations
-   [x] evaluate field-level observations
-   [x] evaluate repetition observations
-   [x] evaluate time-window candidates
-   [x] evaluate negative/missing-context observations
-   [x] usefulness bar applied to all A-class candidates
-   [x] provider-independence reviewed
-   [x] combinatorial-noise risk reviewed
-   [x] observation granularity reviewed
-   [x] vocabulary recommendations documented
-   [x] authority/absence wording documented
-   [x] no arbitrary thresholds chosen
-   [x] no correlation/causality accepted as deterministic
-   [x] no production code changes
-   [x] no test changes
-   [x] no provider calls
-   [x] no secrets/env values/user DB data accessed
-   [x] baseline tests pass
-   [x] typecheck passes
-   [x] secret scan clean
-   [x] diff docs/investigation-only
-   [x] exactly one A/B/C/D recommendation
-   [x] completion notes updated
-   [x] Canon accurate
-   [x] worktree clean
-   [x] Sprint 019 not started

------------------------------------------------------------------------

## What Sprint 018 Proves

Before:

``` text
Investigation Timeline
        ↓
ordered facts
```

After:

``` text
Investigation Timeline
        ↓
semantic boundary understood
        ↓
┌─────────────────────────────────────────────┐
│ safe deterministic derivations             │
│ explicit-product-rule derivations           │
│ interpretive/correlation claims             │
│ causal/probabilistic claims                 │
└─────────────────────────────────────────────┘
        ↓
one evidence-backed next step
```

No reasoning engine has been built.

Combie simply knows where deterministic evidence ends.

------------------------------------------------------------------------

## Final Principle

> **Before Combie starts making observations, define exactly what it is
> allowed to observe.**

Order gave us sequence.

Sequence does not give us meaning.

Derive only what the evidence proves.

Name uncertainty precisely.

Reject hidden thresholds.

Reject correlation disguised as fact.

Reject causality disguised as chronology.

Choose one next step.

Then stop.
