# SPRINT-026 — Deterministic Investigation Facts

> **Status:** Complete
> **Depends on:** SPRINT-025
> **Type:** Implementation
> **Primary goal:** Add the minimal deterministic, ephemeral Investigation Fact surface earned by Sprint 025.
> **Persistence / provider calls / AI:** None

## Goal

Compress evidence already present in one `InvestigationContext` into a small,
typed set of read-time facts that materially reduces scanning without turning
summaries into observations, events, correlations, interpretations, or causal
claims.

```text
existing persisted knowledge
        ↓
InvestigationContext
        ↓
composeProviderActivityChronology()   // existing
        ↓
composeInvestigationFacts()           // new
        ↓
InvestigationFact[]                   // ephemeral, max 5
        ↓
KNOWN FACTS
```

## Baseline

Sprint 025 was committed separately before implementation:

```text
a2bc82f33d7ce423fc0d0c1564c6031946f349a4
docs(sprint): complete Sprint 025 fact research
```

| Check | Result |
| --- | --- |
| Worktree | clean |
| Tests | 520 pass, 0 fail, 2114 assertions, 49 files |
| Typecheck | clean |
| Sprint separation | Sprint 025 committed; Sprint 026 began from its clean HEAD |

`docs/internal/sprints/SPRINT-026.md` was absent at baseline. The separately
supplied Sprint 026 implementation prompt was used as the active Sprint source,
matching the Sprint 025 documentation precedent.

## Repository Understanding

### Existing investigation composition

`getInvestigationContextForResource()` already composes everything required:

- subject Resource and full subject Change history;
- canonical one-hop Relationships and direction;
- present neighbor Resources and their Change histories;
- Vercel deployment authority/evidence;
- GitHub workflow-run authority/evidence;
- Neon operation authority/evidence.

The context is offline, read-only, and bounded to one hop. Dangling edges retain
their canonical Relationship but contribute no fabricated Resource or evidence.

### Existing chronology

`composeProviderActivityChronology()` already provides:

- one entry per provider evidence row;
- deduplication by Resource/native evidence identity;
- every canonical Relationship path for multi-edge neighbors;
- `subject | related` role;
- exact provider family/native identity;
- fixed provider primary creation time and field;
- row authority (`populated | empty | unknown`);
- stable total ordering by primary time, family, and native identity.

It intentionally omits rowless known-empty, rowless unknown, and
`not_applicable` sources. Authority Facts therefore must inspect raw
`InvestigationContext` authorities, while row aggregation and newest selection
can safely reuse chronology.

### Authority limitation carried forward

Neon persists latest successful `result_count`, so a known-empty current
retained response can coexist truthfully with prior locally retained operations.

Vercel and GitHub refresh rows do not persist result count, and evidence rows
are retained rather than deleted. Their current authority unions cannot prove
which locally held rows came from the latest successful response. Facts may say:

```text
Combie currently holds N deployments/workflow runs.
K have recorded readyState/conclusion X.
```

They must not say:

```text
The latest refresh returned N rows.
All rows are current.
All provider evidence is current.
```

### Sprint readiness

| Reuse | Addition | Unchanged |
| --- | --- | --- |
| InvestigationContext | Pure fact composer | Storage/schema |
| Provider activity chronology | Typed fact union | Provider adapters/contracts |
| Change timeline | CLI fact formatter | Domain Resource/Relationship/Change |
| Existing detailed sections | Focused pure and CLI tests | `combie context` and CLI routing |

## Architecture Pressure

The smallest viable boundary is one application module:

```text
src/app/investigation-facts.ts
  composeInvestigationFacts(context): InvestigationFact[]
```

No `InvestigationContext` expansion is required. Derived facts do not belong in
context construction, storage, provider adapters, or the domain model.

### Final architecture answers

1. **Did InvestigationFact remain ephemeral?** Yes. Reconstructed on every read.
2. **Did storage remain unchanged?** Yes. No table, migration, query, or write.
3. **Did provider adapters remain unchanged?** Yes.
4. **Did provider contracts remain unchanged?** Yes.
5. **Did InvestigationContext require expansion?** No.
6. **Was generic Event necessary?** No.
7. **Did any Fact require interpretation?** No.
8. **Did any Fact require correlation?** No.
9. **Did any Fact require causality?** No.
10. **Did any Fact require confidence or severity?** No.
11. **Did derivation remain outside the formatter?** Yes.
12. **Did structured provenance survive compression?** Yes.
13. **Did the five-Fact budget work?** Yes; output studies remain useful and bounded.
14. **Did GitHub/Vercel authority remain truthful?** Yes; only locally held/recorded wording is used for populated rows.
15. **Did Neon retained-history semantics remain truthful?** Yes; current retained-response emptiness and prior retained operations stay distinct.

Expected architecture conclusions remained true:

```text
generic Event       = NO
ObservationEngine   = NO
CorrelationEngine   = NO
```

## Implementation

### Public application API

```ts
export const MAX_INVESTIGATION_FACTS = 5;

export function composeInvestigationFacts(
  context: InvestigationContext,
): InvestigationFact[];
```

The function has no options or caller-defined cap. The five-Fact budget is
product semantics, not a tuning parameter.

The composer is:

- pure;
- deterministic;
- offline;
- read-only;
- free of storage/provider/model calls;
- free of current-clock reads and random IDs;
- non-mutating;
- derived only from the supplied context plus existing pure chronology/timeline
  composers.

### Final InvestigationFact shape

The closed discriminated union contains six variants:

```text
provider_evidence_authority
provider_state_summary
provider_activity_summary
provider_activity_scope
newest_provider_activity
resource_change_summary
```

There is no generic optional-field bag, prose statement field, durable ID,
confidence, severity, score, importance, relevance, lifecycle, or persistence.

Provider state dimensions remain native and typed:

| Family | Summary field | Other retained activity state |
| --- | --- | --- |
| Vercel deployment | `readyState` | `state` remains on activity provenance |
| GitHub workflow run | `conclusion` | `status` remains distinct on activity provenance |
| Neon operation | `status` | provider-native action remains detailed evidence |

One state Fact is emitted per family at most. Uniform multi-row distributions
remain useful compression (`2 deployments have readyState: READY`); single-row
state restatements are omitted.

### Structured provenance

Compact references preserve derivation operands without copying provider
payloads into every Fact.

Provider activity provenance includes:

- family and native evidence ID;
- exact Resource ID;
- `subject | related` role;
- canonical Relationship ID, kind, direction, source, and target for neighbor
  paths;
- exact refresh authority and successful refresh observation time where known;
- locally held native IDs for each contributing authority source;
- fixed provider primary timestamp field/value;
- evidence `observedAt`;
- provider-native recorded state fields.

Change provenance includes:

- Change ID;
- exact Resource ID and role;
- canonical Relationship paths for related Resources;
- exact `observedAt`;
- explicit `timeAuthority: combie_observation`.

Provider creation time and `Change.observedAt` never enter one comparison.

## Authority Behavior

| Source authority | Fact behavior |
| --- | --- |
| populated | No routine authority Fact; counts/state say locally held/recorded only |
| empty GitHub/Vercel | Successful-refresh known-empty Fact; zero rows |
| empty Neon, zero retained | No current operations in retained response |
| empty Neon, retained history | Current zero plus exact prior retained count |
| unknown, zero rows | Unknown current authority; no absence inferred |
| unknown, retained rows | Exact prior local count; may be stale; last-recorded state wording |
| not_applicable | Excluded, never treated as missing evidence |

Unknown wording deliberately does not claim that evidence has never refreshed:
the union may represent a previous success followed by a latest failure.

Neighbor-only activity prose also makes no negative claim about the subject.
It states only which locally held rows contribute to the scope.

## Deterministic Priority and Noise Rules

Candidates are appended in explicit priority order and the selected structured
result is capped at five:

1. unknown/stale authority;
2. known-empty authority;
3. one multi-row native state summary per family;
4. provider activity count/family summary;
5. subject/related Resource presence;
6. newest-known provider activity;
7. multi-row Resource Change summary.

Tie behavior is explicit:

- authority sources: subject before related, then family and Resource ID;
- state families: GitHub, Neon, Vercel; values ascending;
- activity/newest: existing chronology order;
- Relationship refs: ID/direction/kind/source/target;
- Changes: existing observation timeline order.

Omissions:

- newest with fewer than two activity rows;
- single-row state restatements;
- zero or one Resource Change restatements;
- ordinary populated authority statements;
- generic zero Facts;
- duplicate presence/count facts superseded by a higher-value same-family
  state aggregate;
- dangling, self-edge, and `not_applicable` evidence;
- pairwise temporal narratives and every correlation/causality statement.

No scores or ranking engine exist.

## CLI

`combie investigate <resource-id>` now places `KNOWN FACTS` immediately after
`CURRENT` and before detailed evidence, so the summary can orient the reader
before scanning rows.

Example mixed GitHub/Vercel output:

```text
KNOWN FACTS

- Combie currently holds 2 provider activity records in scope: 1 GitHub workflow run and 1 Vercel deployment.
- Known provider activity appears on the subject and 1 directly related Resource through source_for.
- The newest known provider activity is GitHub workflow run 9002, by created_at 2026-08-09T11:00:00.000Z; its recorded conclusion is failure.
```

Example unknown authority:

```text
- Vercel deployment evidence for vercel:project:prj_app has unknown current refresh authority; 2 previously recorded deployments may be stale.
```

Example Neon retained-history authority:

```text
- The latest successful Neon operation refresh for neon:project:db returned no current operations; 2 previously recorded operations are retained.
- Among 2 previously recorded Neon operations, 1 has last recorded status: failed and 1 has last recorded status: finished.
```

When no useful Facts survive:

```text
KNOWN FACTS

No additional deterministic facts to summarize from the currently known investigation evidence.
```

The active Sprint explicitly requires this trustworthy zero state. Existing
detailed DEPLOYMENTS, WORKFLOW RUNS, OPERATIONS, RELATED CONTEXT, KNOWN PROVIDER
ACTIVITY, and COMBIE OBSERVATIONS sections remain present and semantically
unchanged.

## Testing

New focused tests cover:

- identical repeated composition and input immutability;
- input-order independence and five-Fact cap;
- populated, known-empty, unknown-without-rows, unknown-with-retained,
  Neon retained-empty, and `not_applicable` authority;
- Vercel/GitHub retained-row wording limitation;
- multiple/single/mixed-family activity counts;
- native Vercel readyState, GitHub conclusion, and Neon status summaries;
- uniform multi-row state compression;
- subject-only, related-only, mixed scope, multi-edge deduplication, and dangling
  neighbors;
- exact provider primary-time newest selection and equal-time tie behavior;
- secondary lifecycle/observer time non-selection;
- subject/related Change aggregation and explicit Combie observation authority;
- no cross-clock comparison;
- CLI heading, placement, zero state, authority wording, detailed-section
  preservation, and negative correlation/causality vocabulary;
- offline command execution and existing read-only behavior.

## Manual Verification

The local database was investigated with all provider credential variables
removed:

```text
subject: cloudflare:zone:78585893066d32991f2a74a1543c5b58
result: KNOWN FACTS zero state rendered before SUBJECT CHANGES
network/provider calls: none
```

SQLite SHA-256 before and after:

```text
64fc7029fb5c829c11ceeaea0edfe5ab332eab599113d829c6df5f7059105c3f
```

The local database had no representative multi-family evidence; mixed-family,
authority, and provenance behavior is verified through deterministic fixtures.

## Validation

```text
bun test          — 544 pass, 0 fail, 2196 assertions, 50 files
bun run typecheck — clean
```

Additional validation before completion:

- focused Facts/chronology/timeline/CLI tests: clean;
- offline manual investigate: clean;
- database hash before/after: unchanged;
- storage/schema diff: zero;
- provider adapter/contract diff: zero;
- domain model diff: zero;
- generic Event/ObservationEngine/CorrelationEngine: none;
- Canon changes: none.

## Files Changed

```text
src/app/investigation-facts.ts
src/app/investigate.ts
tests/app/investigation-facts.test.ts
tests/cli/commands.test.ts
docs/internal/sprints/SPRINT-026.md
```

No dependency, configuration, provider, storage, domain, or CLI-routing files
changed.

## Deviations

1. `SPRINT-026.md` did not exist at baseline; the user-supplied implementation
   prompt was the active Sprint source and this file records completion.
2. The research allowed a normal maximum of five and hard maximum of seven.
   Implementation uses the stricter fixed maximum of five; no caller override.
3. GitHub status and conclusion remain structurally distinct, but only the
   higher-value conclusion dimension consumes a state-summary Fact slot. Status
   remains exact activity provenance and detailed evidence.
4. Resource Change summary requires at least two unique Changes. One visible
   Change is treated as a redundant row restatement.
5. The explicit `KNOWN FACTS` zero state is always rendered when the structured
   result is empty, as required by the active Sprint.

## Learnings

1. Raw authorities and chronology have complementary roles: chronology is the
   correct deduplicated row projection, while raw context is required for
   rowless absence/unknown semantics.
2. A closed typed projection exposes wording bugs early. The implementation
   review caught both an unknown-subject absence claim and wording that could
   deny a prior successful refresh.
3. Compact provenance references preserve auditability without copying full
   provider evidence into every aggregate.
4. Uniform multi-row native state is useful compression; the single-row rule,
   not distribution diversity, is the correct noise boundary.
5. The five-Fact budget forces useful product choices, especially one state
   summary per family.

## Smallest Missing Primitive After Known Facts

The smallest concrete evidence primitive exposed by implementation is
**latest-success result-count provenance for Vercel deployment and GitHub
workflow-run refreshes**, equivalent in purpose to Neon `result_count`.

Without it, retained local rows cannot prove exact latest-response cardinality.
This is a provider refresh-authority/storage concern, not a Fact-layer concern,
and was deliberately not implemented in Sprint 026. It does not justify a
generic Event, ObservationEngine, correlation system, or Sprint 027 scaffold.

## Canon Changes

**None.** Vision, Architecture, Roadmap, and the Engineering Constitution remain
accurate. The implementation is an application-layer deterministic read view.

## Definition of Done

- [x] exact Sprint 025 baseline verified
- [x] build skill and Canon read in order
- [x] relevant Sprint completion notes reviewed
- [x] Repository Understanding completed before implementation
- [x] Architecture Pressure completed before implementation
- [x] red pure-function tests added before production module
- [x] typed ephemeral InvestigationFact union implemented
- [x] pure composeInvestigationFacts implemented
- [x] no InvestigationContext expansion
- [x] no storage/schema changes
- [x] no provider adapter/contract changes
- [x] no new provider calls
- [x] no current-clock/random/model calls
- [x] authority/empty/unknown/stale/not-applicable semantics covered
- [x] Vercel/GitHub retained-row limitation preserved
- [x] Neon retained-empty behavior preserved
- [x] provider-native state fields preserved
- [x] subject/related roles and Relationship paths preserved
- [x] newest-known fixed primary-time semantics preserved
- [x] Change observation clock kept separate
- [x] deterministic five-Fact cap enforced
- [x] redundant single-row/ordinary-zero Facts omitted
- [x] explicit CLI zero state rendered
- [x] existing detailed evidence sections retained
- [x] no correlation/causality/AI/scoring
- [x] focused tests pass
- [x] full suite passes (544)
- [x] typecheck passes
- [x] manual offline/read-only verification succeeds
- [x] secret scan clean
- [x] whitespace/diff checks clean
- [x] complete staged diff reviewed
- [x] Canon changes recorded as None
- [x] Sprint 026 committed separately
- [x] worktree clean
- [x] Sprint 027 not started

## Final Principle

> **Compress what Combie knows. Never upgrade a summary into a story.**
