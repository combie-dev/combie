# SPRINT-025 — Deterministic Investigation Facts Research

> **Status:** Complete
> **Depends on:** SPRINT-024
> **Type:** Research / semantics / architecture
> **Primary goal:** Revisit Sprint 018 after provider-native evidence, refresh authority, one-hop provenance, and provider activity chronology; determine whether a small FACT-class investigation surface is now earned.
> **Production / test code:** No changes
> **Persistence / provider calls / AI:** None
> **Final recommendation:** **A — implement a minimal FACT surface next**

## Goal

Determine which small investigation summaries Combie can derive directly and
deterministically from facts already present in `InvestigationContext`, such
that they materially reduce scanning without interpretation, correlation,
causality, scoring, or AI.

The research boundary is:

```text
existing persisted provider evidence + Resource Changes + Relationships
        ↓
InvestigationContext
        ↓
pure deterministic derivation
        ↓
small FACT-class summaries
```

No production implementation is included in this Sprint.

## Completion Notes

### Sprint 024 baseline

Verified before research:

```text
7bb1146fe96b0811695d0694e6adb9d529d46b30
docs(sprint): mark Sprint 024 DoD commit checkboxes complete
```

Immediately preceding implementation commit:

```text
d9e50d9b4f8372d851220a4efcddcad2659fb15d
feat(investigate): compose known provider activity chronology
```

| Check | Result |
| --- | --- |
| Worktree | clean |
| Tests | 520 pass, 0 fail, 2114 assertions, 49 files |
| Typecheck | clean (`tsc --noEmit`) |
| Sprint separation | Sprint 024 committed; Sprint 025 began from its clean finalization commit |

### Repository Understanding

#### Current investigation data flow

```text
combie investigate <exact-resource-id>
  → getInvestigationContext
      ├─ subject Resource
      ├─ subject Resource Changes
      ├─ canonical one-hop Relationships
      ├─ directly related Resources + their Changes
      ├─ Vercel deployment authority/evidence
      ├─ GitHub workflow-run authority/evidence
      └─ Neon operation authority/evidence
  → composeProviderActivityChronology
      └─ pure provider-created-time projection
  → formatInvestigationContext
      ├─ detailed evidence sections
      ├─ KNOWN PROVIDER ACTIVITY
      └─ COMBIE OBSERVATIONS
```

`InvestigationContext` is ephemeral, offline, read-only, and exactly one hop.
The activity chronology is also ephemeral and pure. Neither requires a new
provider call or persistence read beyond context composition.

#### 1. Evidence currently available

| Evidence | Exact content | Time authority | Durable? |
| --- | --- | --- | --- |
| Resource | provider, kind, stable provider identity, name, normalized metadata | current persisted state; no event time | yes |
| Relationship | canonical source/target/kind plus evidence and timestamps | structural provenance, not event chronology | yes |
| Change | exact Resource, changed fields, before/after, `observedAt` | **Combie observation time only** | yes |
| Vercel deployment | uid, exact project binding, current state, target/source, created/building/ready, `observedAt` | provider `created` is primary; lifecycle fields remain named | yes |
| GitHub workflow run | run/repository/workflow identity, status, conclusion, attempt, branch/SHA, created/started/updated, `observedAt` | provider `created_at` is primary | yes |
| Neon operation | operation/project identity, action, status, failures, safe targets, created/updated/retry/duration, `observedAt` | provider `created_at` is primary | yes |
| Provider activity entry | original provider evidence, primary field/time, role, Resource, Relationship paths, authority | provider primary creation time | no; pure projection |

#### 2. Subject evidence

The subject always contributes its Resource and full Change history. If its
provider/kind is applicable, it also contributes exactly one provider evidence
authority family: Vercel project deployments, GitHub repository workflow runs,
or Neon project operations. Subject activity entries carry `role: subject` and
no Relationship path.

#### 3. One-hop neighbor evidence

Each canonical one-hop edge contributes its Relationship, direction from the
subject, the neighbor Resource when present, the neighbor's full Changes, and
the applicable provider evidence authority. Multi-edge neighbors are deduped
by Resource/native evidence identity while all canonical Relationship paths
are retained. Dangling neighbors contribute the edge but no fabricated
Resource, Change, or provider activity.

#### 4. Provider-native evidence families

Exactly three exist:

```text
VercelDeploymentEvidence
GitHubWorkflowRunEvidence
NeonOperationEvidence
```

They remain provider-specific. There is no generic Event or Evidence domain
object.

#### 5. Chronology authority

| Family | Primary chronology field | Secondary fields that do not reposition the row |
| --- | --- | --- |
| Vercel deployment | `created` / `createdAtMs` | building, ready |
| GitHub workflow run | `created_at` / `createdAt` | run_started_at, updated_at |
| Neon operation | `created_at` / `createdAt` | updated_at, retry_at, duration |

The primary field is fixed by family. Combie never dynamically chooses the
newest lifecycle timestamp.

#### 6. Exact meaning of `Change.observedAt`

`Change.observedAt` is the timestamp captured by Combie when sync detected a
normalized Resource difference. It is not provider event time. A provider
pass may stamp multiple Changes equally, and sequential provider sync can
create observer-order artifacts. It supports only wording such as "Combie
observed" or "recorded," never "the provider change happened at."

#### 7. Known-empty, unknown, and stale

| Authority | Meaning | Row behavior |
| --- | --- | --- |
| populated | latest stored refresh succeeded and Combie holds rows | rows are known locally; for Vercel/GitHub this does **not** prove every row was returned by that refresh |
| empty | latest successful refresh returned zero and Combie holds no rows, except Neon's explicit retained-history case | Vercel/GitHub have no rows; Neon may retain older rows outside its current retained response |
| unknown | never refreshed or latest refresh failed | prior rows may remain and must be labeled potentially stale |
| not_applicable | Resource provider/kind has no such evidence family | not a missing/empty assertion |

Unknown must never become empty. Retained rows remain historical facts; their
currency and completeness are unknown.

##### Current Vercel/GitHub authority limitation

Neon persists `result_count`, so it can distinguish a current successful
empty response from previously retained operations. Vercel and GitHub refresh
rows persist only outcome/time/message, while evidence rows are retained and
not destructively deleted. Their composers derive `populated` versus `empty`
from all locally stored rows. Therefore:

- a later successful empty Vercel/GitHub response after earlier rows still
  appears `populated` locally;
- a successful bounded refresh can coexist with older retained rows;
- no Fact may claim "the latest refresh returned N deployments/runs," "all
  rows are current," or "all evidence is current" from those unions;
- safe wording is "Combie currently holds N records" plus the stored refresh
  outcome/authority;
- `lastSuccessAt` is currently always `null` under unknown authority, so no
  Fact may invent the age of the last successful refresh.

This is a documented evidence limitation, not a production fix in this
research-only Sprint.

#### 8–10. Trivial zero-cost derivations

The following require zero new persistence and zero provider calls:

- counts of Resources, Relationships, Changes, activity rows, families, roles,
  states, statuses, and conclusions;
- presence of evidence families and provider sources;
- newest known activity by the already-established primary provider time;
- subject versus neighbor coverage and exact Relationship-path coverage;
- known-empty / unknown / stale authority summaries;
- exact Resource Change counts on the separate Combie observation clock.

All are pure computations over `InvestigationContext` and the existing
provider activity chronology.

#### 11–13. Unsafe or redundant derivations

- **Accidental correlation:** "workflow and deployment occurred together,"
  "both endpoints changed," "these records form a sequence," SHA equality as
  an evidence relationship, and pairwise cross-provider before/after narration.
- **Accidental causality:** triggered, caused, fixed, produced, explains,
  regressed, recovered, or root cause.
- **Redundant row restatements:** one deployment has READY, one run has failure,
  one Relationship exists, or one row was created at T when the same row is
  immediately visible. Aggregation must save counting, filtering, authority
  inspection, or scope tracing to earn output.

### Architecture Pressure

| Option | Finding | Verdict |
| --- | --- | --- |
| **A — minimal FACT surface** | Multiple authority, count/state, scope, cross-provider-presence, and newest-known summaries now save real scanning; all are pure and provenance-preserving. | **Selected** |
| B — improve evidence/context first | Sprint 018's evidence gaps were materially filled by three provider-native families, named provider times, authority, exact bindings, and chronology. More evidence would help but no longer blocks a useful first fact set. | Reject |
| C — formatter-only summaries | Human text alone could render the facts, but agent consumers need deterministic typed semantics and evidence references. A pure application DTO is small and avoids formatter-owned business rules. | Reject |
| D — defer deterministic facts | Still correct for temporal narratives and single-row restatements, but too conservative for authority and multi-row compression. | Reject |

Post-Sprint-024 evidence **materially changes Sprint 018's conclusion**. Sprint
018 correctly found that counts over Resource diffs and observer timestamps
were mostly redundant or misleading. Sprint 025 has exact provider-native
records, provider-created chronology, current state fields, explicit refresh
authority, and one-hop provenance. Those additions make a bounded set of
summaries both trustworthy and useful.

### Semantic Vocabulary

| Term | Assessment |
| --- | --- |
| Fact | Correct semantic class but too broad alone in APIs/documentation |
| Investigation Fact | **Recommended application type:** scoped, derived at read time, distinct from durable domain facts |
| Known Fact | **Recommended product/CLI wording:** truthfully limits the statement to what Combie currently knows |
| Summary | Too presentation-oriented; does not promise deterministic semantics |
| Evidence Summary | Useful prose, but ambiguous between raw evidence and derivation |
| Deterministic Fact | Accurate but redundant in product copy; determinism is a contract, not a label users need repeatedly |
| Observation | Reject for this surface; COMBIE OBSERVATIONS already means persisted Resource differences on observation time |

Recommended names:

```text
application DTO: InvestigationFact
composer:         composeInvestigationFacts()
CLI heading:      KNOWN FACTS
```

An Investigation Fact is a deterministic read-time summary over known
investigation evidence. It is not persisted and is not a Combie Observation.

### Candidate Fact Matrix

Classes: **A** direct deterministic fact; **B** deterministic but wording /
authority-sensitive; **C** interpretive/correlational; **D** causal.

`P` = populated, `E` = known empty, `U` = unknown, `S` = stale retained.

| Rank | Exact candidate wording | Evidence / derivation | Time authority | Refresh requirement | Scope | Class | Scan value | Existing-output redundancy | Risk | Complexity | Verdict |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `GitHub workflow-run evidence for github:repository:101 is unknown; 3 previously recorded runs may be stale.` | authority kind + retained run count | refresh observation only | U + retained rows | subject or neighbor | A | very high | low; requires joining authority and rows | low | trivial | **Implement** |
| 2 | `The latest successful Neon refresh returned no current operations; 2 previously recorded operations are retained.` | Neon E authority + retained rows | refresh observation; no event claim | E required | subject or neighbor | A | very high | low | low | trivial | **Implement** |
| 3 | `Combie currently holds 3 workflow runs; 1 has recorded conclusion: failure.` | count locally held runs + group non-null conclusion | none; row state snapshot | under U say previously recorded/may be stale | subject or neighbor | A/B wording | high | low for multi-row section | low with authority qualifier | trivial | **Implement** |
| 4 | `Known provider activity includes GitHub workflow runs and Vercel deployments.` | distinct chronology families/providers | provider evidence presence | no; surface U/S markers separately | whole scope | A | high | moderate; avoids scanning family blocks | low | trivial | **Implement** |
| 5 | `Known provider activity appears on the subject and 1 directly related Resource.` | distinct role/resource groups in chronology | none | no; preserve each source authority | whole scope | A | high | low; path tracing otherwise required | low | trivial | **Implement** |
| 6 | `The newest known provider activity is GitHub workflow run 9002, created at T; its last recorded conclusion is failure.` | chronology first row + current evidence snapshot | provider `created_at` | P preferred; U/S must say retained/last recorded | whole scope | B | high with multiple rows | moderate | medium if state sounds contemporaneous | trivial | **Implement with precise fields** |
| 7 | `Combie has recorded 2 Resource Changes for the subject.` | `subjectChanges.length` | Combie observation clock | none | subject | A | medium | moderate | low | trivial | **Implement only when count reduces scanning** |
| 8 | `2 directly related Resources have recorded Changes.` | unique neighbor Resources with non-empty Changes | Combie observation clock | none | neighbors | A | medium | moderate | low | trivial | optional |
| 9 | `This investigation contains 3 Resources.` | subject + unique present neighbor ids | none | none | whole scope | A | low–medium | high for small scope | low | trivial | omit unless scope is large |
| 10 | `The subject has 2 directly related Resources through 2 canonical Relationships.` | unique neighbor count + edge count | none | none | whole scope | A | medium for multi-edge cases | moderate | low | trivial | optional |
| 11 | `Provider evidence has successful latest-refresh authority for 2 of 3 applicable Resources; 1 is unknown.` | applicable authority outcomes by unique Resource | refresh observation | must distinguish P/E/U/not-applicable | whole scope | A | very high | low | low when phrased as stored refresh outcome | small | **Implement as authority summary** |
| 12 | `The latest successful GitHub refresh returned no workflow runs.` | GitHub E authority | refresh observation | E required | subject or neighbor | A | high | moderate | low | trivial | **Implement when zero is decision-relevant** |
| 13 | `Combie currently holds 7 provider activity records in scope.` | chronology length | provider-created rows, not completeness | under U/S qualify retained | whole scope | A/B wording | medium | moderate | medium if read as provider-complete | trivial | group with family counts |
| 14 | `2 known deployments have recorded readyState: READY.` | count deployment `readyState` snapshots | no event time; latest stored state | P; under U use last recorded | subject or neighbor | A/B wording | high for multiple rows | low | medium if “at creation” implied | trivial | **Implement with “recorded”** |
| 15 | `1 known Neon operation has recorded status: failed.` | count operation status snapshots | no failure-time claim | P; under U use last recorded | subject or neighbor | A/B wording | high for multiple rows | low | medium if currentness overclaimed | trivial | **Implement with authority** |
| 16 | `The newest known Vercel deployment has recorded readyState: READY.` | newest deployment by `created`; read current snapshot | provider `created` | P preferred; S requires “last recorded” | subject or neighbor | B | medium | high for one row, lower for many | medium | trivial | emit only for 2+ rows |
| 17 | `The newest known provider activity has provider time T.` | chronology first row | family primary provider time | no; U/S labeled | whole scope | A/B wording | low without identity/state | high | low | trivial | fold into rank 6 |
| 18 | `Known provider activity currently spans provider timestamps T1–T2.` | min/max primary times | provider primary times across clocks | no; U/S labeled | whole scope | B | low–medium | chronology already shows order | medium; sounds complete/duration-like | trivial | defer |
| 19 | `The investigation contains workflow-run and deployment evidence.` | family presence | none | no | whole scope | A | medium | overlaps rank 4 | low | trivial | fold into rank 4 |
| 20 | `1 GitHub repository is source_for the Vercel project.` | exact canonical Relationship count | structural, not temporal | none | subject/neighbor | A | medium in complex scope | high for one edge | low | trivial | omit unless aggregating multiple edges |
| 21 | `A directly related GitHub repository contributes workflow-run evidence.` | neighbor role + exact Relationship provenance + run presence | none | no; authority qualifier | neighbor | A/B wording | high | low | low | fold into scope fact |
| 22 | `The subject has no recorded Resource Changes.` | zero `subjectChanges` | Combie observation clock | no Change completeness authority exists | subject | A | low | exact current output already says it | medium if read as never changed | trivial | reject as new fact |
| 23 | `There are no Neon operations.` | empty list only | none | **unsafe unless E** | subject or neighbor | B unsafe wording | medium | moderate | high; U becomes false empty | trivial | reject; use rank 2/12 wording |
| 24 | `All provider evidence in this investigation is current.` | all applicable authorities P/E | refresh observation, provider bounds remain | every applicable family must be P/E | whole scope | B | high | low | high; “current” exceeds retention/completeness | small | reject wording; say latest refresh succeeded for all applicable families |
| 25 | `GitHub activity preceded Vercel activity.` | pairwise/cross-family primary-time comparison | provider primary clocks | no | whole scope | B/C product meaning | low; chronology already shows it | high | high correlation/sequence implication | trivial | reject |
| 26 | `A workflow run and deployment occurred together.` | temporal proximity/window | provider clocks + arbitrary window | product threshold needed | whole scope | C | apparent high | n/a | very high | small | reject |
| 27 | `The workflow and deployment form a sequence.` | ordered coexistence | provider primary times | no | whole scope | C | apparent high | n/a | very high | trivial | reject |
| 28 | `The workflow produced the deployment.` | no supporting evidence | none | impossible | cross-provider | D | n/a | n/a | causal | n/a | reject |
| 29 | `The deployment fixed the incident.` | no Incident/outcome evidence | none | impossible | cross-provider | D | n/a | n/a | causal | n/a | reject |
| 30 | `The newest Combie observation changed metadata.` | first Change + field path | Combie observation clock | none | subject or scope | A | low | visible in first row | low | trivial | reject as redundant |

### Authority Matrix

| Candidate family | Known populated | Known empty | Unknown, no rows | Unknown, stale rows | Safe rule |
| --- | --- | --- | --- | --- | --- |
| Activity count | count rows Combie currently holds | zero locally held rows (Neon may retain history under E) | omit count; emit authority warning | count only as previously recorded / retained and may be stale | never imply provider completeness or latest-response count |
| State/conclusion count | `Of N rows held by Combie, K have recorded X` | omit | omit | `among N previously recorded rows, …; evidence may be stale` | state is a stored snapshot, not state at primary time |
| Newest known activity | safe among known rows | none | omit | safe only as newest **retained** row with unknown marker | name exact provider primary field |
| Absence | do not infer beyond rows | `latest successful refresh returned zero` | forbidden | forbidden | absence requires successful refresh authority |
| Coverage | count applicable scopes with successful stored refresh outcome | E is successful authority but no current rows | label unknown separately | label unknown and retained separately | exclude `not_applicable`; do not say all rows are current |
| Cross-provider presence | list families represented by rows | absent family may be E, U, or not-applicable | never narrate absence | retained family can be listed as previously recorded/stale | presence is not correlation |
| Resource Change count | safe recorded count | n/a | n/a | n/a | keep on Combie observation clock |

Facts safe over stale retained evidence:

- retained row count;
- provider/family presence;
- state/conclusion count as **last recorded** values;
- newest retained row by provider primary time;
- subject/neighbor scope and Relationship provenance.

Facts that must never appear while authority is unknown:

- no activity / zero provider records;
- latest refresh returned empty;
- all evidence is current or complete;
- current provider state without “last recorded / may be stale” qualification;
- coverage claims that silently count unknown as empty.

### Scanning-Value Findings

Facts earn output when they remove at least one of these manual tasks:

1. count several rows;
2. group states/conclusions across several rows;
3. inspect refresh authority before trusting an empty or stale section;
4. trace which Resources/families contribute evidence;
5. find the newest item among multiple provider families.

Facts do not earn output when they merely rewrite one visible row, repeat an
existing zero-state sentence, narrate pairwise chronology, or restate a single
Relationship.

The highest-value, lowest-risk set is:

1. unknown / stale / known-empty authority facts;
2. per-family multi-row counts with state/status/conclusion breakdowns;
3. cross-provider family presence;
4. subject-versus-neighbor evidence coverage;
5. newest-known provider activity with exact primary-time semantics;
6. Resource Change counts on the separate Combie observation clock.

### Output Study A — GitHub + Vercel

Fixture shape:

```text
GitHub repository acme/app
    source_for
Vercel project app (subject)

2 workflow runs: one success, one failure
2 deployments: one READY, one ERROR
1 subject Resource Change
all provider evidence populated
```

Current investigate output requires scanning:

```text
DEPLOYMENTS (newest first)
uid: dpl_new ... readyState: READY
uid: dpl_old ... readyState: ERROR

RELATED CONTEXT
← source_for
GitHub repository: acme/app
WORKFLOW RUNS (newest first)
run id: 9002 ... conclusion: failure
run id: 9001 ... conclusion: success

KNOWN PROVIDER ACTIVITY
... four detailed rows ...

COMBIE OBSERVATIONS
... one Change ...
```

Candidate `KNOWN FACTS`:

```text
Combie currently holds 4 provider activity records in scope:
2 GitHub workflow runs and 2 Vercel deployments.

Of 2 workflow runs held by Combie, 1 has recorded conclusion: failure.

Of 2 deployments held by Combie, 1 has recorded readyState: READY and
1 has recorded readyState: ERROR.

Known provider activity appears on the subject and 1 directly related
Resource through source_for.

The newest known provider activity is GitHub workflow run 9002,
created_at T; its recorded conclusion is failure.

Combie has recorded 1 Resource Change for the subject.
```

Useful: aggregates, authority, scope, and newest selection. Redundant: “the
deployment state is READY” for a single visible row and “one Relationship is
source_for.” Unsafe: “the failed workflow led to the deployment,” “the
workflow and deployment occurred together,” or “GitHub activity preceded the
deployment” as narrative.

### Output Study B — Neon

Fixture shape:

```text
Neon project database (subject)
2 retained operations
  op-new  action=start_compute  status=failed
  op-old  action=start_compute  status=finished
latest successful refresh result_count=0
```

Current output correctly distinguishes current retained empty from history,
but the reader must combine the authority sentence and historical rows.

Candidate `KNOWN FACTS`:

```text
The latest successful Neon refresh returned no current operations;
2 previously recorded operations are retained.

Among 2 previously recorded Neon operations, 1 has last recorded status:
failed and 1 has last recorded status: finished.

The newest retained Neon operation is op-new, created_at T;
its last recorded status is failed.
```

Useful: authority plus state distribution. Redundant: “op-new action is
start_compute” when only one row exists. Unsafe: “there are no Neon
operations,” “the operation failed at created_at,” or “the operation caused a
database change.” No Vercel↔Neon Relationship is invented.

### Output Study C — Partial Authority

Fixture shape:

```text
Vercel subject
  deployment authority: unknown
  2 retained deployments

GitHub source_for neighbor
  workflow authority: known empty
  0 rows

1 Combie Resource Change on the subject
```

Candidate `KNOWN FACTS`:

```text
Vercel deployment evidence is currently unknown;
2 previously recorded deployments may be stale.

The latest successful GitHub workflow-run refresh returned no runs.

2 provider activity records are retained, all from evidence with unknown
refresh authority.

Combie has recorded 1 Resource Change for the subject.
```

Trustworthy wording never converts unknown into empty. The following are
rejected:

```text
No GitHub workflows ran.
There are 2 current deployments.
All provider evidence is current.
The newest provider activity is deployment X.   // missing retained/stale qualifier
```

### Fact Object Pressure

| Question | Decision |
| --- | --- |
| Model? | ephemeral typed application DTO, not a durable domain model |
| Stable identity? | no; reconstruct deterministically from inputs |
| Persistence? | no |
| Confidence? | no; truth comes from explicit derivation + authority |
| Severity? | no; authority priority is deterministic presentation order, not severity |
| Provenance? | yes, structured and mandatory |
| Category? | a small closed discriminated union of earned fact kinds, not a generic string taxonomy |
| Evidence references? | yes: Resource ids, Relationship ids, provider family/native ids or Change ids, authority, and primary timestamp field when temporal |
| Subject/neighbor scope? | yes; role and Relationship paths must be retained |

A formatter-only implementation would hide derivation semantics in text and
provide little structured value to agents. The smallest earned shape is an
application-layer discriminated union, conceptually:

```ts
type InvestigationFact =
  | AuthorityFact
  | ActivitySummaryFact
  | StateSummaryFact
  | ScopePresenceFact
  | NewestKnownActivityFact
  | ChangeSummaryFact;
```

This is a Sprint 026 direction, not a Sprint 025 implementation. Avoid a bag
of optional fields and avoid durable IDs, confidence, severity, scoring, or a
generic Observation framework.

Required provenance for any fact:

- fact kind and exact operands used by the derivation;
- subject Resource id;
- contributing Resource ids and `subject | neighbor` roles;
- canonical Relationship ids/directions for neighbor evidence;
- provider family and native evidence ids when rows contribute;
- refresh authority per applicable contributing Resource/family;
- `created` / `created_at` field semantic when newest/provider-time is used;
- Change ids and explicit Combie observation authority for Change facts.

### Human vs Agent Value

| Consumer | Value |
| --- | --- |
| Humans | less row counting, faster failure/state scanning, visible evidence freshness, clear subject/neighbor coverage, less chance of reading unknown as empty |
| Agents | typed deterministic inputs, explicit authority and provenance, reproducible summaries, fewer tokens than full repeated evidence, no hidden model interpretation |

The same facts benefit both groups. No MCP/API/SDK surface is needed in the
next Sprint; a typed application result is enough to preserve future agent
value.

### Noise Budget

Smallest useful rules for Sprint 026:

1. Cap rendered facts at **5** by deterministic priority (hard maximum **7**);
   the typed result may contain only those same selected facts so CLI and
   agent semantics do not diverge.
2. Authority warnings and known-empty distinctions outrank counts.
3. Multi-row state/conclusion summaries outrank generic presence.
4. Subject/neighbor coverage outranks single-Relationship restatements.
5. Newest-known facts require at least two provider activity rows and must name
   the primary provider time field.
6. Resource Change counts are lower priority and remain on the Combie
   observation clock.
7. Omit ordinary zero-value facts; retain zero only when successful authority
   makes absence informative.
8. Omit facts that restate one visible evidence row.
9. Group state counts into one fact per family instead of one fact per state.
10. Use deterministic priority and tie-break rules, not scoring.

### Rejected Statements

| Statement | Reason |
| --- | --- |
| `There were 3 workflow runs.` | implies provider completeness; say currently known to Combie |
| `No Neon operations exist.` | unknown/retention can make this false |
| `The latest thing that happened was deployment X.` | overstates primary provider timestamp and history completeness |
| `Deployment X was READY at created_at.` | current snapshot state is not necessarily state at creation |
| `GitHub activity preceded Vercel activity.` | pairwise narrative adds correlation pressure and no value beyond chronology |
| `The workflow and deployment form a sequence.` | interpretive/correlational |
| `The SHA proves the workflow produced the deployment.` | evidence-to-evidence inference not implemented |
| `The deployment caused the failure.` | causal |
| `The deployment fixed the incident.` | causal and lacks Incident/Outcome evidence |
| `Activity increased unusually.` | anomaly interpretation and threshold |
| `All evidence is trustworthy/current.` | confidence/completeness claim exceeds refresh semantics |

### Final Recommendation

## **A — Implement a minimal FACT surface next**

The implementation is now earned because multiple facts:

- materially reduce scanning;
- are pure deterministic derivations;
- remain truthful under populated/empty/unknown/stale authority;
- preserve exact provider and Relationship provenance;
- require no provider calls or persistence;
- introduce no correlation, causality, scoring, AI, or generic Event;
- add value beyond current row formatting.

The correct boundary is **Known Investigation Facts**, not Observations.

### Smallest Sprint 026 direction

Implement only:

```text
InvestigationContext
        ↓
composeProviderActivityChronology()   // existing
        ↓
composeInvestigationFacts()           // new pure application function
        ↓
ephemeral InvestigationFact[]
        ↓
KNOWN FACTS                            // max 5
```

Earned fact families:

1. authority / stale / known-empty facts, derived from raw context authorities
   rather than chronology alone (rowless authorities do not enter chronology);
2. provider activity count + family breakdown;
3. multi-row state/status/conclusion breakdown;
4. subject-versus-neighbor / cross-provider presence;
5. newest-known provider activity with exact primary-time field;
6. lower-priority Resource Change count on observation time.

Constraints:

- no persistence, IDs, confidence, severity, scoring, or ranking engine;
- no provider/storage reads inside the composer;
- no generic Event/Evidence/Observation model;
- no pairwise cross-provider time narration;
- no correlation, SHA matching, causality, or AI;
- focused pure-function + formatter tests, then existing full regression.

### Explicit Answers

1. **Does post-Sprint-024 evidence change Sprint 018?** Yes, materially. Provider-native records, named provider time, exact bindings, authority, and chronology make a small fact set useful rather than merely computable.
2. **Can facts materially reduce scanning now?** Yes: authority, aggregate state/conclusion, scope coverage, cross-provider presence, and newest-known selection.
3. **Highest-value 3–7 facts?** The six listed under Scanning-Value Findings.
4. **Which require known refresh authority?** Strong absence, successful-refresh, current coverage, and unqualified current-state facts.
5. **Which remain safe over stale retained evidence?** Retained counts/presence, last-recorded state counts, newest retained row, and structural scope/provenance when explicitly labeled stale/unknown.
6. **Which must not appear under unknown authority?** Zero/absence, complete/current coverage, unqualified current state, and successful-refresh claims.
7. **Is Fact the correct term?** Yes as the semantic class; use `InvestigationFact` in code and `KNOWN FACTS` in product output.
8. **Typed DTO or formatter-only?** A typed ephemeral application DTO is earned.
9. **Persistence?** No.
10. **Stable IDs?** No.
11. **Confidence?** No.
12. **Severity?** No.
13. **Provenance?** Resources, roles, Relationships, native evidence/Change ids, authority, and exact time field/authority.
14. **Distinguish subject and neighbor facts?** Yes, structurally; group them when useful but preserve roles/paths.
15. **Summarize cross-provider presence?** Yes, as coexistence of known families only.
16. **Narrate cross-provider temporal order?** Do not emit pairwise narratives. A single newest-known selection is acceptable when it names the primary fields and authority.
17. **Which candidates cross into correlation?** occurred together, form a sequence, related records, SHA-based matching, and Relationship endpoints phrased as related activity.
18. **Which cross into causality?** triggered, caused, produced, fixed, regressed, recovered, explains, and root cause.
19. **Agent benefit?** Yes; typed deterministic compression with provenance reduces tokens and ambiguity without model inference.
20. **Generic Event required?** No.
21. **ObservationEngine required?** No.
22. **Exact Sprint 026?** The pure, ephemeral, capped `composeInvestigationFacts()` slice above—and nothing beyond it.

### Validation

```text
bun test          — 520 pass, 0 fail
bun run typecheck — clean
```

- Production code diff: zero.
- Test code diff: zero.
- Schema/provider/CLI/domain diff: zero.
- Secret scan: clean.
- `git diff --check`: clean.
- Complete diff review: Sprint 025 research document only.
- Canon changes: **None**.
- Sprint 026: not implemented or scaffolded.

### Deviations

`docs/internal/sprints/SPRINT-025.md` was not present at the clean Sprint 024
baseline; the user-supplied Sprint 025 specification was therefore executed
as the source and this canonical Sprint file was created to record the
research and completion notes. No production scope deviation occurred.

### Learnings

1. Evidence richness changed the usefulness boundary, not the semantic safety
   boundary. Combie can compress more without claiming more.
2. Authority facts are often more valuable than activity facts because they
   tell readers what absence and retained rows mean.
3. Current provider state beside creation time must remain explicitly a
   recorded snapshot, never state-at-time.
4. Structured provenance is what makes deterministic facts useful to agents
   without introducing confidence or AI.
5. A small fact budget is essential; deterministic noise is still noise.

### Canon Changes

**None.** Vision, Architecture, Roadmap, and the build skill remain accurate.

## Definition of Done

- [x] exact Sprint 024 baseline verified
- [x] build skill and Canon read
- [x] Sprints 016–024 read
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed
- [x] semantic vocabulary established
- [x] candidate fact matrix completed
- [x] authority matrix completed
- [x] scanning-value test applied
- [x] three fixture-based output studies completed
- [x] Fact Object pressure completed
- [x] human vs agent value evaluated
- [x] noise budget defined
- [x] unsafe/correlational/causal statements rejected
- [x] exactly one A/B/C/D recommendation selected
- [x] smallest Sprint 026 direction specified
- [x] all 22 explicit questions answered
- [x] zero production/test changes
- [x] tests and typecheck pass
- [x] secret/whitespace/diff review clean
- [x] Canon changes recorded as None
- [x] Sprint 026 not started

## Final Principle

> **Compress what Combie knows. Never upgrade a summary into a story.**
