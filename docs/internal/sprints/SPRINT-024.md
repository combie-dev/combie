# SPRINT-024 — Provider Activity Chronology

> **Status:** Complete
> **Depends on:** SPRINT-023
> **Type:** Implementation
> **Primary goal:** Compose existing provider-native evidence into one deterministic, ephemeral investigation chronology while keeping Resource Changes in their separate Combie observation-time surface.
> **Persistence:** None
> **New domain abstraction:** None
> **Correlation / causality / AI:** None
> **Architecture:** Sprint 023 recommendation B — provider-evidence chronology only

## Goal

Sprint 023 established that Combie can safely compose its three provider-native evidence families into one chronological investigation view:

- Vercel Deployments
- GitHub Workflow Runs
- Neon Operations

The selected architecture recommendation was:

> **B — Implement provider-evidence chronology only.**

Provider-native evidence can share one temporal projection because each family contains provider-asserted timestamps.

Resource Changes must remain separate because:

```text
Change.observedAt
=
when Combie observed a Resource difference

NOT
=
when the provider-side change occurred
```

Sprint 024 implements the smallest production version of that decision.

Conceptually:

```text
InvestigationContext
        │
        ├── provider-native evidence
        │       ↓
        │  pure temporal projection
        │       ↓
        │  KNOWN PROVIDER ACTIVITY
        │
        └── Resource Changes
                ↓
           COMBIE OBSERVATIONS
```

No generic Event model is introduced.

## Baseline

Begin from the completed Sprint 023 baseline.

Expected Sprint 023 commits:

```text
217e320 docs(sprint): complete Sprint 023 chronology research
84bd864 docs(sprint): mark Sprint 023 DoD commit checkboxes complete
```

Verify and record the actual current HEAD SHA before implementation.

Expected repository state:

```text
490 tests passing
typecheck clean
worktree clean
```

If repository state differs, stop and report before implementation.

## Sprint 023 Decisions Are Inputs

Sprint 024 should not reopen these decisions without concrete repository evidence.

### Provider evidence can share chronology

These evidence families may participate:

```text
Vercel Deployment
GitHub Workflow Run
Neon Operation
```

### Resource Changes stay separate

Do not merge `Change.observedAt` into provider-native chronological ordering.

Provider time and Combie observation time remain separate temporal authority classes.

### Durable evidence remains provider-specific

Keep:

```text
VercelDeployment
GitHubWorkflowRun
NeonOperation
```

as their existing provider-native models.

Do not introduce:

```text
Event
Evidence
ProviderEvent
ActivityEvent
TimelineEvent
```

as a new durable domain abstraction.

### Chronology is ephemeral

Conceptually:

```text
provider-specific durable evidence
        ↓
InvestigationContext
        ↓
composeProviderActivityChronology()
        ↓
ephemeral activity entries
```

No SQLite table. No migration. No duplicated evidence.

### One evidence object produces one primary activity entry

Do not reconstruct synthetic lifecycle transitions.

A deployment with `createdAt`, `buildingAt`, `readyAt`, and `state = READY` does not automatically become three separate chronology entries. The durable object produces one primary entry ordered by the selected provider timestamp. Secondary lifecycle timestamps remain evidence attributes.

## Repository Understanding

Before coding, inspect:

- `skills/build-combie/SKILL.md`
- Combie Canon
- SPRINT-020 through SPRINT-023
- InvestigationContext
- investigation composition
- investigate formatter
- existing Change timeline
- Vercel deployment evidence
- GitHub workflow-run evidence
- Neon operation evidence
- one-hop evidence loading
- Relationship provenance
- refresh authority
- stale evidence handling
- relevant SQLite reads
- CLI tests
- investigation fixtures

Produce a concise Repository Understanding report before implementation.

Answer:

1. Where provider evidence currently enters InvestigationContext.
2. Exact DTO shapes for all three provider evidence families.
3. Which provider timestamp Sprint 023 selected as the primary ordering timestamp for each family.
4. Which secondary timestamps must remain visible.
5. How subject versus neighbor evidence is represented.
6. How Relationship provenance is currently available for neighbor evidence.
7. How refresh authority/staleness is represented.
8. How deterministic ordering is currently implemented elsewhere.
9. Whether chronology can be implemented as a pure application-layer function.
10. Whether any persistence/schema changes are actually required.

Expected answer to #10: `No.`

If repository reality contradicts this, stop and report before redesigning anything.

## Architecture Pressure

Confirm the smallest viable projection.

The expected conceptual boundary is an application-layer function such as:

```text
composeProviderActivityChronology(investigationContext)
```

Design the smallest ephemeral DTO justified by the repository. Do not copy speculative interfaces mechanically.

The projection must:

1. Read already-loaded provider evidence.
2. Project Vercel Deployments.
3. Project GitHub Workflow Runs.
4. Project Neon Operations.
5. Preserve provider-specific evidence.
6. Preserve subject/neighbor scope.
7. Preserve Relationship provenance for neighbor evidence.
8. Preserve refresh/staleness authority where relevant.
9. Select the provider-native primary timestamp established in Sprint 023.
10. Sort deterministically newest-first.
11. Return ephemeral activity entries.

It must NOT:

- query providers
- query SQLite directly if InvestigationContext already contains the evidence
- persist anything
- mutate InvestigationContext
- infer relationships
- correlate records
- calculate causality
- modify provider evidence
- modify Resource Changes

## Provider-Specific Projection

### Vercel Deployments

Preserve deployment identity, exact Vercel project Resource, state, provider-native primary timestamp, secondary lifecycle timestamps, safe deployment metadata, Combie observation time, authority, subject/neighbor scope, and Relationship provenance.

Do not create synthetic `created`, `building`, `ready`, or `failed` timeline records.

### GitHub Workflow Runs

Preserve run identity, repository Resource, status, conclusion, run attempt, provider-native primary timestamp, secondary timestamps, safe workflow evidence, Combie observation time, authority, subject/neighbor scope, and Relationship provenance.

Do not convert `created`, `started`, and `completed` into synthetic independent entries.

### Neon Operations

Preserve operation identity, Neon project Resource, action/type, lifecycle state, provider-native primary timestamp, secondary timestamps, safe target evidence, Combie observation time, authority, subject/neighbor scope, and Relationship provenance.

Do not promote branch/database/endpoint targets into Resources.

## Ordering

Primary ordering:

```text
provider-native primary timestamp DESC
```

Use the exact timestamp choice established in Sprint 023.

Do not dynamically choose whichever timestamp happens to be newest.

Equal timestamps must use a deterministic total ordering, conceptually:

```text
primaryTime DESC
family/provider stable ordering
nativeId DESC
```

or another repository-compatible stable comparator.

Document the exact comparator.

Repeated reads over unchanged data must produce identical ordering.

Do not rely on incidental array, SQLite, provider response, or object enumeration order.

## Time Semantics

Every projected entry must preserve which provider timestamp drove its position.

Do not reduce everything to a generic `timestamp` without semantics.

Keep secondary lifecycle timestamps visible as evidence.

Do not position an item at a later lifecycle timestamp merely because that timestamp is newer unless Sprint 023 explicitly selected it.

## Resource Changes

Resource Changes remain separate.

Do not modify the Change model.

Do not put Change records into provider activity entries.

Do not compare `Change.observedAt` against provider-native activity timestamps to create one total order.

Investigation should conceptually expose:

```text
KNOWN PROVIDER ACTIVITY (newest first)

...

COMBIE OBSERVATIONS (newest first)

...
```

If the CLI currently calls the Change section `TIMELINE`, pressure-test the smallest truthful naming adjustment. Avoid unnecessary CLI churn.

## Investigation Composition

Extend:

```text
combie investigate <resource-id>
```

with provider chronology.

Use repository formatting conventions.

The output must make it clear that provider chronology is incomplete-by-design.

Prefer compact wording equivalent to:

```text
Known provider activity
```

or:

```text
Provider activity currently known to Combie
```

Do not imply complete history, all events, everything that happened, or a full provider timeline.

## Empty State

When no provider evidence exists, render a truthful empty state equivalent to:

```text
No provider activity known for this investigation.
```

Do not say no provider activity occurred.

## Unknown / Stale Authority

Preserve existing distinctions:

```text
known empty
unknown
stale retained
```

Historical evidence may remain visible after a failed refresh.

A failed current refresh does not invalidate previously observed evidence.

Reuse existing authority semantics and wording.

## Subject vs Neighbor

Provider activity must identify whether evidence belongs to the subject or a one-hop neighbor.

Neighbor evidence must preserve the canonical Relationship that brought it into scope.

No inferred edges. No recursive traversal.

## Correlation Boundary

Chronology is not correlation.

If output shows:

```text
14:00 GitHub workflow run
14:02 Vercel deployment
14:05 Neon operation
```

Combie asserts only that these known provider records are within investigation scope, carry those provider-native timestamps, and sort in that order.

It does NOT assert that one triggered, caused, explains, or correlates with another.

Avoid causal/correlative language.

## No Generic Event Model

Do not introduce new durable concepts such as:

```text
Event
Evidence
ProviderEvent
ActivityEvent
TimelineEvent
```

Do not add:

```text
events table
provider_events table
evidence table
activity table
timeline table
```

Provider evidence remains durable in provider-specific storage. Chronology is a read-time projection.

## No Persistence

Running `combie investigate <resource-id>` must not modify the database.

No migration should be required.

Repeated reads should leave persisted state unchanged.

## Offline Requirement

After evidence has been synced:

```bash
unset VERCEL_TOKEN
unset GITHUB_TOKEN
unset GH_TOKEN
unset NEON_API_KEY
```

then:

```bash
bun run combie investigate <resource-id>
```

must still compose provider activity entirely from local persistence.

No network calls.

## Testing Strategy

Use Red → Green → Refactor.

### Pure Projection

Cover:

- Vercel-only
- GitHub-only
- Neon-only
- all three
- empty evidence
- newest-first ordering
- equal timestamps
- stable tie-break
- repeated composition identical
- no input mutation
- provider semantics preserved
- primary timestamp preserved
- secondary timestamps preserved
- observedAt preserved but not used as chronology authority

### Subject / Neighbor

Cover:

- subject evidence
- neighbor evidence
- mixed subject + neighbor
- inbound Relationship
- outbound Relationship
- provenance preserved
- no second-hop evidence
- no invented Relationships

### Authority

Cover:

- known populated
- known empty
- unknown refresh
- stale retained evidence

Ensure unknown never becomes empty.

### CLI

Cover:

- KNOWN PROVIDER ACTIVITY renders
- all three provider families render
- provider-native terminology preserved
- primary timestamp semantics clear
- secondary timestamps available where appropriate
- subject/neighbor distinction visible where needed
- truthful empty state
- incompleteness wording truthful
- Change section remains separate
- no correlation/causal language
- deterministic output

### Regression

Preserve:

- resources
- relationships
- related
- changes
- history
- context
- investigate
- existing Change timeline
- Vercel deployments
- GitHub workflow runs
- Neon operations
- `source_for`
- `uses_domain_in`
- provider partial failures
- refresh authority
- credential safety

## Detailed Provider Sections

Before deleting existing:

```text
DEPLOYMENTS
WORKFLOW RUNS
OPERATIONS
```

determine whether chronology contains enough provider detail to replace them without information loss.

Default preference:

```text
KNOWN PROVIDER ACTIVITY
= chronological index / composition

existing detailed evidence
= retained if they still provide useful detail
```

Avoid duplicate noise, but do not sacrifice evidence richness simply to shorten output.

Document the final choice.

## Performance

Composition should operate over already-loaded evidence and be approximately:

```text
O(N log N)
```

for N provider evidence records.

Do not add provider requests.

Avoid new N+1 SQLite reads if InvestigationContext already contains required evidence.

## Security

Use already-normalized safe evidence.

Do not expose:

- API keys
- Authorization headers
- database credentials
- connection strings
- environment variables
- raw provider payloads
- unsafe raw errors
- arbitrary logs

Run the existing secret scan.

## Validation

Run:

```bash
bun test
bun run typecheck
```

plus focused chronology tests, CLI smoke tests, secret scan, whitespace checks, staged diff review, and full diff review.

Expected baseline: 490 tests.

## Live Verification

If local persisted provider evidence exists, verify offline against it.

Sprint 023 reported the local database was pre-Sprint-020 and lacked evidence tables, so live chronology may require a fresh sync.

Do not make live provider sync a blocker if credentials are unavailable.

If authorized credentials are available and live verification is safe:

1. sync
2. investigate a Resource with provider evidence
3. remove provider credentials
4. investigate again
5. verify identical chronology
6. verify deterministic repeated reads
7. verify DB unchanged
8. verify no secrets

If unavailable, explicitly defer live verification.

## Completion Notes

### Baseline

```text
84bd8647078c773b89fc6fe35d84af3a9d0cbe1c
84bd864 docs(sprint): mark Sprint 023 DoD commit checkboxes complete
```

Sprint 023 research commit immediately prior: `217e320`.

Verified before implementation:

| Check | Result |
| --- | --- |
| HEAD | `84bd864` (Sprint 023 DoD finalization) |
| Tests | 490 pass at clean baseline; red Sprint 024 tests were untracked WIP |
| Typecheck | clean at baseline |
| Worktree | clean except untracked `SPRINT-024.md` + pre-written red tests |

Sprint 023 and Sprint 024 were not combined into one commit.

### Repository Understanding

1. **Where provider evidence enters InvestigationContext**  
   `getInvestigationContextForResource` loads subject + one-hop neighbors via
   `loadDeploymentAuthority` / `loadWorkflowRunAuthority` /
   `loadNeonOperationAuthority` into `subjectDeployments|WorkflowRuns|Operations`
   and each `related[]` neighbor field. Offline store reads only.

2. **Vercel DTO** — `VercelDeploymentEvidence`: `uid`, `resourceId`, `projectId`,
   `readyState`, `state`, `target`, `createdAtMs`, `buildingAtMs?`, `readyAtMs?`,
   `observedAt`, `source`.

3. **GitHub DTO** — `GitHubWorkflowRunEvidence`: `runId`, `resourceId`,
   `repositoryId`, workflow metadata, `status`, `conclusion`, `createdAt`,
   `runStartedAt?`, `updatedAt?`, `observedAt`, …

4. **Neon DTO** — `NeonOperationEvidence`: `operationId`, `resourceId`,
   `projectId`, `action`, `status`, `failuresCount`, targets, `createdAt`,
   `updatedAt`, `retryAt?`, `totalDurationMs`, `observedAt`.

5. **Primary times (Sprint 023)** — Vercel `created` / `createdAtMs`; GitHub
   `created_at` / `createdAt`; Neon `created_at` / `createdAt`.

6. **Secondary times** — Vercel building/ready; GitHub started/updated; Neon
   updated/retry + duration. Remain attributes on the evidence object.

7. **Subject vs neighbor** — subject authorities vs `related[]` with
   `direction` + `relationship` + optional Resource.

8. **Relationship provenance** — canonical `Relationship` +
   `RelatedDirection` already on each neighbor edge.

9. **Refresh/staleness** — authority unions
   `not_applicable | unknown | empty | populated`; stale rows under `unknown`;
   Neon `empty` may retain historical operations.

10. **Pure application projection?** — **Yes.** All evidence is already on
    `InvestigationContext`.

11. **Schema/storage changes required?** — **No.** Confirmed; none made.

### Architecture Pressure

Smallest viable design:

```text
src/app/provider-activity.ts
  composeProviderActivityChronology(InvestigationContext)
    → ProviderActivityChronology { subject, entries }

src/app/investigate.ts
  formatInvestigationContext
    → KNOWN PROVIDER ACTIVITY (newest first; incomplete)
    → existing DEPLOYMENTS / WORKFLOW RUNS / OPERATIONS (supplemented)
    → COMBIE OBSERVATIONS (newest first)  // renamed Change timeline
```

No provider-adapter, storage, or CLI-parser ownership of chronology.

### Projection Model

Ephemeral discriminated union `ProviderActivityEntry` per family, holding a
**reference** to the original evidence object (not a payload copy), plus:

| Field | Purpose |
| --- | --- |
| `family` | vercel_deployment / github_workflow_run / neon_operation |
| `primaryTime` | ISO string of provider created time |
| `primaryTimeField` | `created` \| `created_at` (exact field semantic) |
| `role` | subject \| related |
| `resourceId` | exact Combie Resource binding |
| `relationships` | Relationship paths when neighbor (multi-edge accumulated) |
| `authority` | populated \| empty \| unknown |

One durable evidence object → **exactly one** primary activity entry. No
synthetic lifecycle transitions.

### Provider Mapping

| Family | Source authority fields | Native id |
| --- | --- | --- |
| Vercel | subject/neighbor `deployments` | `uid` |
| GitHub | subject/neighbor `workflowRuns` | `runId` |
| Neon | subject/neighbor `operations` | `operationId` |

Multi-edge neighbors: evidence deduped by native id; all Relationship paths kept
(same pattern as Change timeline).

### Primary Time Semantics

| Family | Primary field | Projection |
| --- | --- | --- |
| Vercel Deployment | provider `created` (`createdAtMs`) | `new Date(ms).toISOString()` |
| GitHub Workflow Run | provider `created_at` (`createdAt`) | ISO as stored |
| Neon Operation | provider `created_at` (`createdAt`) | ISO as stored |

Never dynamically chooses ready/started/updated because they are newer.

### Secondary Time Semantics

Remain on `entry.evidence` and are rendered in both the activity summary
(reusing existing formatters) and detailed DEPLOYMENTS / WORKFLOW RUNS /
OPERATIONS sections. They do **not** produce additional chronology rows.

### Ordering / Tie-break

```text
1. primaryTime DESC          (ISO string compare)
2. family ASC                (github_workflow_run < neon_operation < vercel_deployment)
3. nativeEvidenceId DESC     (numeric if pure digits; else string DESC)
```

Repeated composition over unchanged input is identical. No reliance on array
insertion order or SQLite order for the merged list.

### Provenance

Every entry answers:

- provider + family via `family` / evidence.provider
- native object via `nativeEvidenceId`
- Resource via `resourceId`
- subject vs neighbor via `role`
- Relationship path(s) via `relationships[]` when related
- positioning field via `primaryTimeField` + `primaryTime`
- refresh class via `authority`

### Subject / Neighbor Behavior

- Subject evidence: `role: "subject"`, empty relationships
- Neighbor evidence: `role: "related"`, all connecting edges
- Dangling neighbors contribute nothing
- One-hop only; no invented Relationships

### Authority / Completeness

| Authority | Projection |
| --- | --- |
| populated | include rows; Authority: populated |
| empty (Vercel/GitHub, zero rows) | no entries |
| empty (Neon with retained history) | include retained rows; Authority: empty (previously recorded) |
| unknown with rows | include; Authority: unknown (may be stale) |
| unknown without rows | no entries |
| not_applicable | omit |

CLI heading: `KNOWN PROVIDER ACTIVITY (newest first; incomplete)`.  
Empty: `No provider activity known for this investigation.`  
Never: “no activity occurred” / “complete history”.

### CLI Composition

```text
SUBJECT / CURRENT
SUBJECT CHANGES
[DEPLOYMENTS / WORKFLOW RUNS / OPERATIONS when applicable]
RELATED CONTEXT (per-edge CHANGES + detailed evidence)
KNOWN PROVIDER ACTIVITY (newest first; incomplete)
COMBIE OBSERVATIONS (newest first)   ← was TIMELINE
```

### Detailed Provider-Section Decision

**A — Supplement.** Detailed DEPLOYMENTS / WORKFLOW RUNS / OPERATIONS remain.
KNOWN PROVIDER ACTIVITY is the chronological index/composition across families
and scope. No evidence richness lost.

### Offline Behavior

Investigate still uses only local Store reads. Tests assert `fetch` is not
called and credential env vars may be unset. No refresh/sync during investigate.

### Persistence Confirmation

- No chronology tables
- No migrations
- Investigate remains read-only (DB hash stable across reads)
- Projection is ephemeral

### Correlation Boundary

Output asserts ordered known provider records only. No “triggered”, “caused”,
“correlated”, or “explains” language (asserted by CLI tests).

### Explicit Answers

1. **Pure projection over InvestigationContext?** Yes.
2. **Storage/schema changes?** No.
3. **Primary timestamps?** Vercel `created`/`createdAtMs`; GitHub `created_at`;
   Neon `created_at`.
4. **Equal timestamps?** family ASC, then native id DESC (numeric when pure digits).
5. **One object → one primary entry?** Yes.
6. **Secondary times preserved without synthetic events?** Yes.
7. **Subject + neighbor without correlation?** Yes (role + Relationship provenance only).
8. **Relationship provenance?** `relationships: [{ relationship, direction }, …]`.
9. **Stale/unknown?** authority field + CLI wording “may be stale” /
   “previously recorded”.
10. **Incompleteness clear?** Yes (`incomplete` heading + empty wording).
11. **Changes separate?** Yes — `COMBIE OBSERVATIONS`; not co-ordered.
12. **Generic Event needed?** **No.** Discriminated projection entries suffice.
13. **Smallest missing primitive for useful deterministic observations?**  
    Still not a generic ObservationEngine. Highest-value next candidates are
    **bounded, non-causal counts over already-known fields** (e.g. “N known
    provider-activity entries in scope”) or **richer provider evidence** /
    **canonical app↔database Relationships** that expand true investigation
    scope — not correlation windows over timestamps.
14. **Sprint 025 revisit deterministic observations?**  
    **Only lightly**, if at all. Prefer either (a) one more evidence-richness
    improvement that expands truthful investigation context, or (b) a tiny
    observation surface limited to FACT-class summaries over chronology/
    authority already implemented — still no ObservationEngine.

### Validation

| Check | Result |
| --- | --- |
| Focused projection + CLI tests | pass |
| Full `bun test` | **520 pass**, 0 fail, 2114 assertions, 49 files |
| `bun run typecheck` | clean |
| Secret scan | clean (no new secrets; only safe evidence fields) |
| Whitespace / diff check | clean |
| Production schema | unchanged |
| Generic Event types | none introduced |

### Live Verification

**Explicitly deferred.** Local `.combie/combie.db` remains pre–Sprint-020
(no evidence tables; 0 Changes; 0 Relationships). No authorized live sync was
required for this Sprint. Fixture and offline integration tests cover the
chronology contract without credentials.

### Deviations

- Renamed CLI heading `TIMELINE` → `COMBIE OBSERVATIONS` for truthful
  observation-time language (smallest wording change; pure-merge module
  `composeInvestigationTimeline` retained).
- GitHub native-id tie-break uses numeric compare for pure-digit ids so
  `10` ranks before `9`, matching store `run_id DESC` semantics (string
  DESC would mis-order multi-digit run ids).
- Pre-existing untracked red tests were adopted as the Sprint 024 contract
  (plus minor TypeScript narrowing fixes).

### Learnings

1. Sprint 023’s pure-projection design was correct and sufficient.
2. Discriminated unions over existing DTOs avoid a generic Event bag.
3. Authority classes must travel with projected rows or Neon retained-history
   and Vercel stale rows become invisible or mislabeled.
4. CLI incompleteness wording is as important as sort order for trust.
5. Renaming TIMELINE reduces Change/provider clock confusion without changing
   the Change domain model.

### Canon Changes

**None.** Implementation fits Vision (deterministic investigation context),
Architecture (adapters remain specific; composition is application-layer),
and Roadmap without material Canon edits.

Do not implement Sprint 025 in this Sprint.

## Definition of Done

- [x] Sprint 023 baseline verified
- [x] SKILL protocol followed
- [x] Canon read
- [x] Sprints 020–023 reviewed
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed
- [x] pure provider activity projection implemented
- [x] no generic Event model
- [x] no new durable chronology model
- [x] no SQLite migration required
- [x] Vercel deployments projected
- [x] GitHub workflow runs projected
- [x] Neon operations projected
- [x] provider-specific semantics preserved
- [x] one evidence object → one primary activity entry
- [x] primary timestamp deterministic per family
- [x] secondary timestamps preserved
- [x] deterministic newest-first ordering
- [x] deterministic equal-time tie-break
- [x] subject scope preserved
- [x] neighbor scope preserved
- [x] Relationship provenance preserved
- [x] one-hop boundary preserved
- [x] refresh authority preserved
- [x] stale evidence behavior preserved
- [x] truthful empty state
- [x] incompleteness language truthful
- [x] Resource Changes remain separate
- [x] provider time not mixed with Change observation time
- [x] no correlation semantics
- [x] no causality semantics
- [x] offline investigation works
- [x] investigation remains read-only
- [x] repeated reads deterministic
- [x] no provider network calls during investigation
- [x] no secrets exposed
- [x] focused tests pass
- [x] full tests pass (520)
- [x] typecheck passes
- [x] secret scan clean
- [x] whitespace/diff checks clean
- [x] completion notes updated
- [x] Canon changes recorded or None
- [x] Sprint 024 committed separately (`d9e50d9`)
- [x] worktree clean
- [x] Sprint 025 not started

## Explicitly Out of Scope

Do not implement:

- generic Event / Evidence
- EventEngine / EvidenceEngine
- ObservationEngine
- CorrelationEngine
- persisted chronology/timeline entries
- Resource Changes in provider chronology
- synthetic lifecycle events
- correlation windows
- SHA correlation
- cross-provider causal relationships
- root-cause analysis
- anomaly detection
- scoring/confidence
- AI/LLM
- embeddings
- webhooks
- logs
- metrics
- traces
- new providers
- new provider evidence
- application↔database relationships
- recursive traversal
- persisted investigations
- MCP/API/SDK/UI
- controlled execution
- Sprint 025 scaffolding

## Final Principle

> **Compose the evidence. Preserve its meaning. Do not infer the story.**
