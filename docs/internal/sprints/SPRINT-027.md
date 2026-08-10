# SPRINT-027 — Provider Evidence Refresh Provenance

> **Status:** Complete
> **Depends on:** SPRINT-026
> **Type:** Implementation / authority semantics
> **Primary goal:** Add latest-success result-count provenance for Vercel deployment and GitHub workflow-run refreshes so Combie can distinguish current successful provider response cardinality from retained historical local evidence.
> **Provider scope:** Vercel + GitHub only
> **Neon:** Reference implementation / authority benchmark
> **Facts:** Existing Fact surface may consume stronger authority after implementation
> **AI / correlation / causality:** None

---

## Goal

Sprint 026 introduced deterministic `KNOWN FACTS` and exposed the smallest remaining authority gap:

> **Vercel deployment and GitHub workflow-run refreshes do not persist latest-success result-count provenance.**

Today Combie can truthfully say:

```text
Combie currently holds 3 workflow runs.
Combie currently holds 2 Vercel deployments.
```

But it cannot always truthfully say:

```text
The latest successful GitHub refresh returned 3 workflow runs.
The latest successful Vercel refresh returned 2 deployments.
```

because historical evidence rows are retained locally and current refresh records do not preserve enough provenance to distinguish:

```text
latest successful response cardinality
```

from:

```text
rows currently retained in local memory
```

Neon already provides the stronger authority pattern through persisted `result_count`.

Sprint 027 brings Vercel and GitHub refresh provenance up to the same authority standard without introducing a generic Event, Evidence, or refresh framework.

---

## Core Principle

> **Local memory and latest provider response are different facts. Preserve both.**

Combie should know:

```text
what the latest successful provider refresh returned
```

and separately:

```text
what historical provider evidence remains retained locally
```

Do not infer one from the other.

---

## Baseline

Begin from the clean committed Sprint 026 baseline.

Expected Sprint 026 commit:

```text
413594661a6a1eceacf8e75610a920593bc52863
```

Expected baseline:

```text
544 tests passing
typecheck clean
worktree clean
```

Verify:

```bash
git status
git log -1 --oneline
bun test
bun run typecheck
```

Record the exact current HEAD SHA and commit message.

If Sprint 026 is not committed or the worktree is not clean, STOP.

Do not combine Sprint 026 and Sprint 027.

---

# Repository Understanding Report

Before coding, inspect:

- `skills/build-combie/SKILL.md`
- Combie Canon
- Sprint 022 completion notes
- Sprint 025 research
- Sprint 026 completion notes
- Vercel deployment refresh storage/model
- GitHub workflow-run refresh storage/model
- Neon operation refresh storage/model
- SQLite schema and upgrade patterns
- provider evidence upsert/read helpers
- sync integration for Vercel deployments
- sync integration for GitHub workflow runs
- sync integration for Neon operations
- `InvestigationContext`
- `composeInvestigationFacts()`
- authority Fact variants/formatter
- relevant tests

Explicitly answer:

1. What refresh rows/tables exist for Vercel?
2. What refresh rows/tables exist for GitHub?
3. What refresh rows/tables exist for Neon?
4. Which fields Neon persists that Vercel/GitHub currently do not?
5. How is known-empty represented for each evidence family?
6. How is unknown represented?
7. How are retained historical rows preserved?
8. What sync path writes refresh authority?
9. What application-layer reads expose authority into `InvestigationContext`?
10. Which Facts currently weaken their wording because result-count provenance is missing?
11. Can Sprint 027 remain a narrow schema/storage/application authority enhancement?

No implementation before this report.

---

# Architecture Pressure Report

Answer before implementation:

1. Is result-count provenance the smallest sufficient fix?
2. What exact semantic should the stored count have?
3. Should it be nullable for old/unknown state?
4. Should last-success result count survive a later failed refresh?
5. Does the existing model distinguish latest attempt from latest successful refresh?
6. Is a separate `lastSuccessfulResultCount` field required?
7. Can Neon semantics be reused exactly?
8. Are provider-specific refresh tables still correct?
9. Is a generic refresh authority abstraction earned?
10. Are provider contracts affected?
11. Are provider adapters affected?
12. Are provider API calls changing? Expected: no.
13. Is evidence deletion required? Expected: no.
14. Can historical local evidence remain retained exactly as today?
15. What migration behavior is required for pre-027 DBs?
16. How should old DBs represent unknown historical result counts?
17. What exact Fact wording becomes newly safe?
18. What wording remains unsafe after Sprint 027?
19. Does the five-Fact budget remain sufficient?
20. Does Canon need to change?

Prefer the smallest authority enhancement.

---

# Semantic Contract

Define one exact semantic.

Recommended meaning:

```text
lastSuccessfulResultCount
=
number of normalized provider evidence records accepted by
the latest successful refresh for that exact Resource scope
```

It must **NOT** mean:

```text
number of evidence rows currently retained locally
```

Example:

```text
latest successful GitHub refresh returned 2 runs
locally retained workflow-run evidence = 7 rows
```

Both can be true.

The latest-success count represents:

```text
provider-response provenance
```

The retained count represents:

```text
Combie memory
```

Never conflate them.

---

# Provider Scope

Sprint 027 applies only to:

```text
Vercel Deployments
GitHub Workflow Runs
```

Neon is the semantic benchmark.

Do not modify Neon unless a tiny compatibility/refactor adjustment is genuinely required.

Do not add another provider or evidence family.

---

# Vercel Refresh Provenance

The Vercel refresh model must be able to distinguish:

```text
latest current authority
latest successful refresh result count
latest/last successful observation time
locally retained deployment row count
```

These are different facts.

## Successful populated refresh

Provider returns:

```text
2 deployments
```

Persist:

```text
latest successful result count = 2
authority = populated
```

Historical retained rows may be greater than `2`.

---

## Successful empty refresh

Provider returns:

```text
0 deployments
```

Persist:

```text
latest successful result count = 0
authority = empty
```

Do not delete historical deployments merely because the latest response is empty.

---

## Failed refresh after prior success

Previous successful refresh:

```text
result count = 2
```

Current refresh fails.

The system should preserve:

```text
last successful result count = 2
```

while current authority becomes:

```text
unknown
```

Combie must then be capable of representing:

```text
current Vercel deployment authority = unknown
last successful refresh returned = 2
local retained deployment rows = N
```

Do not rewrite failure as empty.

---

# GitHub Refresh Provenance

Apply the same authority distinction to workflow runs.

Pressure-test:

- successful populated refresh
- successful empty refresh
- failed refresh after success
- retained local rows > latest result count
- private/permission failure
- transient API failure
- Actions-disabled behavior if already modeled
- pagination/bounded-history semantics

---

## GitHub's 100-run bound

Sprint 021 currently uses:

```text
1 page × 100 most-recent runs per repository
```

Therefore:

```text
last successful result count = 100
```

means:

```text
the latest bounded workflow refresh returned 100 runs
```

It does **NOT** mean:

```text
the repository has exactly 100 workflow runs
```

This bounded authority must remain explicit in:

- storage semantics
- application DTOs
- Fact wording
- CLI copy
- tests
- completion notes

---

# Retention / Completeness

Result-count provenance improves authority.

It does not establish lifetime-complete history.

Safe:

```text
The latest successful Vercel deployment refresh returned 2 deployments.
```

Safe:

```text
The latest successful bounded GitHub workflow-run refresh returned 100 runs.
```

Unsafe:

```text
There are exactly 2 deployments in Vercel history.
```

Unsafe:

```text
There are exactly 100 workflow runs in this repository.
```

Provider retention and bounded retrieval semantics remain authoritative.

---

# Persistence

Use existing provider-specific SQLite refresh-state structures.

Prefer extending:

```text
vercel_deployment_refresh
github_workflow_run_refresh
```

with the minimum provenance fields required.

Do not introduce:

```text
provider_evidence_refresh
generic_refresh_authority
refresh_events
```

unless repository pressure proves provider-specific evolution impossible.

Possible field concepts include:

```text
result_count
last_success_result_count
```

but exact naming must follow existing repository semantics.

Do not mechanically mirror Neon if its refresh model is structurally different.

---

# Upgrade / Migration

Pre-Sprint-027 databases must open safely.

Existing Vercel/GitHub refresh rows without result-count provenance must become:

```text
unknown / null
```

Do **NOT** backfill using retained evidence row counts.

That would recreate the exact authority problem this Sprint exists to fix.

Never infer:

```text
retained row count == latest successful response count
```

for historical DB state.

Unknown history remains unknown.

---

# Sync Writes

On successful Vercel/GitHub evidence refresh:

1. Retrieve provider evidence using existing behavior.
2. Normalize evidence.
3. Determine the exact normalized result count for the refresh scope.
4. Persist evidence rows as today.
5. Persist successful refresh authority.
6. Persist latest-success result-count provenance.
7. Do so atomically where existing storage architecture permits.

On failed refresh:

- do not set successful result count to zero;
- mark current authority unknown using existing semantics;
- preserve retained evidence;
- preserve previous successful result-count provenance;
- preserve previous successful observation timestamp where modeled.

Do not modify provider authentication/discovery contracts.

---

# InvestigationContext

Expose stronger authority through the existing provider evidence authority DTOs.

Application code should be able to distinguish:

```text
current authority
latest successful result count
retained local evidence count
```

where available.

Do not calculate latest-success result count in the CLI formatter.

Do not infer it from evidence arrays.

The authority must come from persisted refresh provenance.

---

# Investigation Facts Refinement

Sprint 027 may refine existing Facts where stronger authority makes previously unsafe wording safe.

Potentially newly safe:

```text
The latest successful GitHub workflow-run refresh returned 3 runs.
Combie currently retains 7 workflow runs for this repository.
```

Potentially newly safe:

```text
The latest successful Vercel deployment refresh returned no deployments;
2 previously recorded deployments remain retained locally.
```

Do not add a new Fact family unless implementation pressure proves it necessary.

Prefer refining existing:

```text
provider_evidence_authority
provider_activity_summary
provider_state_summary
```

Do not increase:

```text
MAX_INVESTIGATION_FACTS = 5
```

Do not add confidence, severity, scoring, or ranking machinery.

---

# Fact Wording Rules

Distinguish three concepts.

## Latest successful response

```text
The latest successful GitHub workflow-run refresh returned 3 runs.
```

## Local retained memory

```text
Combie currently retains 7 workflow runs for this repository.
```

## Current authority unknown after prior success

```text
GitHub workflow-run evidence is currently unknown;
the last successful refresh returned 3 runs,
and 7 previously recorded runs remain retained locally.
```

Exact copy can follow CLI conventions.

Semantics cannot blur.

Avoid:

```text
GitHub has 3 runs.
```

Avoid:

```text
There are 3 current runs.
```

Avoid:

```text
All 7 retained runs are current.
```

---

# Authority Fact Priority

Authority remains the highest-priority Fact category.

Do not increase the Fact budget because stronger provenance exists.

Prefer compression into one authority Fact.

Example:

```text
GitHub workflow-run evidence is currently unknown;
the last successful refresh returned 3 runs,
and 7 previously recorded runs remain retained locally.
```

Prefer this over three separate Facts.

---

# No Evidence Deletion

Sprint 027 is not evidence cleanup.

Do not delete historical rows simply to make:

```text
retained count == latest-success result count
```

Historical provider evidence remains useful Combie memory.

The purpose of Sprint 027 is to distinguish those concepts.

---

# No Generic Refresh Framework

Do not introduce:

```text
RefreshEngine
ProviderRefresh
EvidenceRefresh
RefreshRegistry
RefreshAuthorityEngine
```

Provider-specific refresh state remains acceptable.

Shared helpers may be introduced only where they remove mechanical duplication without flattening provider semantics.

---

# Tests

Use:

```text
Red → Green → Refactor
```

## Storage / Upgrade

Test:

- pre-027 DB opens successfully
- new count provenance is null/unknown for historical rows
- no count is inferred from retained evidence
- successful populated write
- successful empty write
- failure after success preserves prior success provenance
- deterministic reads
- no secret fields

---

## Vercel

Test:

- successful count = 0
- successful count > 0
- retained rows > latest result count
- failure after prior success
- latest authority unknown + previous result count retained
- repeated sync idempotency

---

## GitHub

Test:

- successful count = 0
- successful count from 1–100
- count = 100 does not imply complete repository history
- retained rows > latest bounded result count
- failure after success
- permission failure
- transient failure
- repeated sync idempotency

---

## Neon Regression

Confirm Neon:

- `result_count`
- retained-history
- known-empty
- unknown

behavior remains unchanged.

---

## InvestigationContext

Test exposure of:

```text
current authority
latest successful result count
retained evidence count
```

Also test:

- pre-027 unknown provenance
- no inferred latest-success count from retained rows

---

## Investigation Facts

Test newly safe wording:

- latest successful count
- successful empty refresh
- current unknown + prior success + retained history
- retained local rows > latest result count
- bounded GitHub wording
- no lifetime-completeness claims
- five-Fact cap remains five
- priority remains deterministic

---

## CLI

Verify `combie investigate` clearly distinguishes:

```text
latest successful provider response
retained local evidence
current refresh authority
```

without redundant output.

---

# Regression

Run:

```bash
bun test
bun run typecheck
git diff --check
git status
```

Expected baseline:

```text
544 tests
```

Final count should increase.

Perform:

- focused tests
- full suite
- secret scan
- staged diff review
- full diff review

Preserve:

- provider connections
- Resources
- Relationships
- Changes
- History
- Context
- Investigation
- Provider Activity Chronology
- `KNOWN FACTS`
- `COMBIE OBSERVATIONS`
- Vercel deployments
- GitHub workflow runs
- Neon operations
- partial-failure semantics
- offline/read-only investigation

---

# Live Verification

If authorized credentials exist locally, perform read-only verification.

## Vercel

Verify:

```text
latest successful refresh result count
retained local deployment count
```

Repeat sync and verify idempotency.

---

## GitHub

Given the previously observed repository scale, avoid triggering hundreds of requests solely to validate Sprint 027.

Prefer:

- a bounded test repository;
- existing fixture coverage;
- or explicit live-verification deferral.

If live GitHub verification is performed, record:

```text
latest bounded result count
retained local workflow-run count
```

After verification:

```bash
unset VERCEL_TOKEN
unset GITHUB_TOKEN
unset GH_TOKEN
```

Run `combie investigate` offline and verify identical authority output.

If credentials are unavailable, explicitly defer live verification.

---

# Architecture Review

Before completion answer:

1. Did result-count provenance solve the Sprint 026 authority gap?
2. Was a generic refresh abstraction required?
3. Did provider contracts change?
4. Did provider API behavior change?
5. Did historical evidence retention remain unchanged?
6. Can latest-success count differ from retained local count?
7. Can Facts now represent that difference truthfully?
8. Does GitHub's bounded retrieval remain explicit?
9. Did Neon behavior remain unchanged?
10. What authority gap remains after Sprint 027, if any?
11. Did the five-Fact budget remain sufficient?
12. Did any correlation or causality logic appear?

Expected for #12:

```text
No.
```

---

# Completion Notes

Update `docs/internal/sprints/SPRINT-027.md` with:

## Baseline

Exact Sprint 026 SHA.

## Repository Understanding

Refresh-state architecture before Sprint 027.

## Architecture Pressure

Why result-count provenance was the smallest fix.

## Semantic Contract

Exact meaning of persisted count provenance.

## Schema / Upgrade

Fields added and unknown semantics for old DBs.

## Vercel

Populated / empty / failure behavior.

## GitHub

Populated / empty / failure / bounded behavior.

## Neon Regression

Confirm unchanged semantics.

## InvestigationContext

Final authority DTO shape.

## Fact Refinement

Wording newly made safe.

## Retained vs Latest

Examples showing the difference.

## Validation

Focused tests, full tests, typecheck, security, diff review.

## Live Verification

Results or explicit deferral.

## Deviations

Any divergence from Sprint plan.

## Learnings

What stronger provider authority enables next.

## Canon Changes

Changes or `None`.

## Commit

Exact Sprint 027 SHA.

---

# Explicit Questions

Answer:

1. What exactly does the new result-count provenance mean?
2. Is it the latest successful normalized response count?
3. How is retained local evidence count determined?
4. Can latest successful count and retained count differ?
5. What happens after a failed refresh?
6. What happens after a successful empty refresh?
7. What happens when opening a pre-027 DB?
8. Is any result count backfilled from retained rows?
9. Does GitHub's count remain explicitly bounded by the 100-run policy?
10. Which Fact wording is newly safe?
11. Which completeness claims remain unsafe?
12. Was a generic refresh abstraction needed?
13. Did Neon require changes?
14. What authority primitive remains missing, if any?
15. What should Sprint 028 do next?

---

# Definition of Done

- [x] Sprint 026 clean baseline verified
- [x] exact baseline SHA recorded
- [x] SKILL protocol followed
- [x] Canon read
- [x] relevant Sprint notes reviewed
- [x] Repository Understanding completed
- [x] Architecture Pressure completed
- [x] exact result-count semantics defined
- [x] Vercel refresh provenance enhanced
- [x] GitHub refresh provenance enhanced
- [x] Neon behavior preserved
- [x] safe DB upgrade implemented
- [x] old rows do not infer result count
- [x] successful populated count persisted
- [x] successful empty count persisted
- [x] failed refresh preserves prior success provenance
- [x] retained historical evidence unchanged
- [x] provider contracts unchanged
- [x] provider API behavior unchanged
- [x] InvestigationContext exposes stronger authority
- [x] Facts refined only where newly safe
- [x] five-Fact cap unchanged
- [x] no generic Event
- [x] no generic refresh engine
- [x] no ObservationEngine
- [x] no CorrelationEngine
- [x] no confidence/severity/scoring
- [x] no correlation/causality
- [x] focused tests added
- [x] full tests pass
- [x] typecheck passes
- [x] secret scan clean
- [x] diff/whitespace checks clean
- [x] live verification completed or deferred
- [x] completion notes updated
- [x] Canon changes recorded or None
- [x] Sprint 027 committed separately
- [x] worktree clean
- [x] Sprint 028 not started

---

# Completion Notes

## Baseline

Sprint 026 HEAD verified before any Sprint 027 code:

```text
413594661a6a1eceacf8e75610a920593bc52863
feat(investigate): add deterministic known facts
544 tests passing
typecheck clean
```

Worktree contained only the untracked `SPRINT-027.md` plan document (not Sprint 026 residue).

## Repository Understanding

Before Sprint 027:

| Family | Refresh table | Fields | Empty detection |
|--------|---------------|--------|-----------------|
| Neon | `neon_operation_refresh` | status, observed_at, message, **result_count** | `resultCount === 0` even when historical ops retained |
| Vercel | `vercel_deployment_refresh` | status, observed_at, message | inferred from local `deployments.length === 0` |
| GitHub | `github_workflow_run_refresh` | status, observed_at, message | inferred from local `runs.length === 0` |

Vercel/GitHub therefore could not distinguish:

- latest successful provider response cardinality
- rows currently retained in local memory

when historical evidence remained after a later empty or smaller successful refresh. Neon already persisted `result_count` for that distinction on success (failure currently nulls Neon’s count — left unchanged).

Historical evidence upserts never delete prior rows. Sync paths write refresh authority after evidence normalization.

## Architecture Pressure

1. **Smallest fix:** nullable `result_count` on provider-specific Vercel/GitHub refresh rows.
2. **Semantic:** last successful normalized response cardinality for the exact Resource scope.
3. **Nullable:** yes — pre-027 / never-provenanced success → null.
4. **Survive failure:** yes for Vercel/GitHub — sync failure re-writes prior `resultCount` (does not force zero/null).
5. **Latest attempt vs success:** `status`/`observed_at`/`message` = latest attempt; `result_count` = last successful count when known.
6. **Separate lastSuccessfulResultCount column:** not required — one nullable field with success-write / failure-preserve semantics is enough.
7. **Neon reuse:** same field name/shape; Neon failure-null behavior left intact as benchmark for empty detection, not copied for failure preservation.
8. **Provider-specific tables:** remain correct; no generic refresh table.
9. **Generic refresh abstraction:** not earned.
10–12. **Provider contracts / adapters / API calls:** unchanged.
13–14. **Evidence deletion:** not required; retention intact.
15–16. **Migration:** `ALTER TABLE … ADD COLUMN result_count INTEGER` via `PRAGMA table_info`; old values null; never backfilled from retained rows.
17. **Newly safe Fact wording:** latest-success counts, empty+retained, unknown+prior success, retained > latest, bounded GitHub 100.
18. **Still unsafe:** lifetime completeness, “exactly N in provider history”, “all retained rows are current”.
19. **Five-Fact budget:** sufficient with one compressed authority Fact.
20. **Canon:** none.

## Semantic Contract

```text
result_count / lastSuccessfulResultCount
=
number of normalized provider evidence rows accepted by
the latest successful refresh for that exact Resource scope
```

It is **not** the number of evidence rows currently retained locally.

Those counts may differ. Example:

```text
latest successful GitHub refresh returned = 3
local retained workflow-run memory = 7
```

GitHub `result_count = 100` means only the bounded refresh returned 100 runs (1 page × 100), not complete repository history.

## Schema / Upgrade

- `vercel_deployment_refresh.result_count INTEGER` (nullable)
- `github_workflow_run_refresh.result_count INTEGER` (nullable)
- Additive upgrade via `ensureRefreshResultCountColumns`
- Pre-027 rows: `result_count = NULL` (unknown provenance)
- No backfill from retained evidence counts

## Vercel

On success: `resultCount = normalized.length` (including 0).

On failure: preserve prior `resultCount`; authority becomes unknown.

Empty authority may retain historical deployments (Neon-style).

## GitHub

Same authority distinction.

Bounded retrieval (Sprint 021) unchanged: ≤100 most-recent runs per repository.

`resultCount = 100` is explicitly bounded in Facts/CLI/tests/notes.

## Neon Regression

Unchanged:

- `neon_operation_refresh.result_count` write/read
- empty with retained history
- unknown after failure (`resultCount: null` on failure path)

No Neon schema or sync modifications.

## InvestigationContext authority shape

Vercel `DeploymentEvidenceAuthority` / GitHub `WorkflowRunEvidenceAuthority`:

- `unknown`: `resultCount: number | null` (last successful when preserved)
- `empty`: `resultCount: number | null` + retained evidence arrays
- `populated`: `resultCount: number | null` + evidence arrays

`InvestigationFactAuthorityRef.lastSuccessfulResultCount` surfaces persisted provenance into Facts. Composition never infers it from retained arrays.

## Fact Refinement

Refined `provider_evidence_authority` wording only:

- unknown + prior success count + retained
- empty + retained (Vercel/GitHub, matching Neon style)
- populated when retained ≠ latest success count
- bounded GitHub wording when count = 100

`MAX_INVESTIGATION_FACTS = 5` unchanged. Authority remains highest priority.

## Retained vs Latest examples

```text
The latest successful GitHub workflow-run refresh returned 3 runs;
Combie currently retains 7 workflow runs for this repository.

Vercel deployment evidence is currently unknown;
the last successful refresh returned 2 deployments,
and 5 previously recorded deployments remain retained locally.

The latest successful Vercel deployment refresh returned no deployments;
2 previously recorded deployments remain retained locally.

The latest successful bounded GitHub workflow-run refresh returned 100 runs;
Combie currently retains N workflow runs for this repository.
```

## Validation

```text
bun test          — 551 pass, 0 fail
bun run typecheck — clean
git diff --check  — clean
```

Focused coverage: storage/upgrade, Vercel/GitHub compose authority, sync result_count paths, investigation Facts/CLI wording, Neon suite still green.

Secret scan: only fixture placeholder tokens (`token: "token"`) in tests; no live secrets.

## Live Verification

**Deferred.** No `VERCEL_TOKEN`, `GITHUB_TOKEN`, or `GH_TOKEN` present in the environment. Fixture and unit coverage validate provenance semantics without live provider calls. Prefer not to hammer ~310 GitHub repositories solely for this authority field.

## Architecture Review answers

1. Yes — result-count provenance closes the Sprint 026 gap.
2. No generic refresh abstraction required.
3. Provider contracts unchanged.
4. Provider API behavior unchanged.
5. Historical evidence retention intact.
6. Yes — latest success count and retained local count may differ.
7. Yes — Facts can state that difference truthfully.
8. GitHub remains explicitly bounded.
9. Neon unchanged.
10. Remaining gap: no separate durable last-success *timestamp* (observed_at still reflects latest attempt); no cross-provider correlation of events.
11. Five-Fact budget still enough.
12. No correlation or causality introduced.

Expected non-introductions confirmed:

```text
generic Event = NO
ObservationEngine = NO
CorrelationEngine = NO
generic RefreshEngine = NO
```

## Explicit Questions (answered)

1. Latest successful normalized response cardinality for exact Resource scope.
2. Yes.
3. Count of evidence rows currently stored for that Resource (memory).
4. Yes, they may differ.
5. Authority unknown; prior result_count preserved (Vercel/GitHub); evidence retained.
6. result_count = 0; authority empty; historical rows retained.
7. Opens safely; result_count null; no inference.
8. No backfill.
9. Yes — 100 is bounded response size only.
10. See Fact Refinement.
11. Lifetime completeness / “exactly N in provider” claims.
12. No.
13. No Neon changes.
14. Smallest remaining primitive: richer last-success *time* provenance and/or cross-family temporal correlation (not implemented).
15. Sprint 028 should be chosen from real investigation pressure after this authority is live — likely the next smallest investigation primitive earned by retained evidence + provenance (not a generic Event system).

## Deviations

1. Vercel/GitHub failure **preserves** prior `result_count`; Neon still nulls on failure (benchmark left alone).
2. Empty authority for Vercel/GitHub now carries retained evidence arrays (parity with Neon), enabling truthful empty+history Facts.
3. Populated authority Facts emit only when retained count ≠ last successful result count (budget compression).

## Learnings

1. Local memory and latest provider response are different facts; storage must preserve both.
2. Inferring latest response size from retained rows recreates the authority bug permanently for upgrades — null is correct for old data.
3. Bounded GitHub retrieval must stay explicit whenever the count is 100.
4. Neon’s empty-with-retained pattern was the right template for Vercel/GitHub empty authority.

## Canon Changes

**None.**

## Commit

```text
feat(storage): add refresh result-count provenance for Vercel and GitHub
```

Exact SHA is the Sprint 027 commit on `master` (`git log -1 --grep 'result-count provenance'`).

## Files Changed

```text
src/storage/store.ts
src/providers/vercel/deployment.ts
src/providers/github/workflow-run.ts
src/app/vercel-deployments.ts
src/app/github-workflow-runs.ts
src/app/provider-activity.ts
src/app/investigation-facts.ts
src/app/investigate.ts
tests/storage/vercel-deployments.test.ts
tests/storage/github-workflow-runs.test.ts
tests/providers/vercel/deployment-normalize.test.ts
tests/providers/github/workflow-run-normalize.test.ts
tests/app/vercel-deployments-sync.test.ts
tests/app/github-workflow-runs-sync.test.ts
tests/app/investigation-facts.test.ts
tests/app/* (fixture resultCount updates)
docs/internal/sprints/SPRINT-027.md
```

---

# Explicitly Out of Scope

Do not implement:

- new provider evidence
- new providers
- generic Event
- generic Evidence
- generic refresh engine
- correlation
- causality
- temporal windows
- SHA correlation
- incident grouping
- root-cause analysis
- anomaly detection
- confidence
- severity
- scoring
- AI/LLM summaries
- embeddings
- new Relationships
- application↔database inference
- evidence deletion cleanup
- recursive traversal
- logs
- metrics
- traces
- webhooks
- MCP/API/SDK/UI
- controlled execution
- Sprint 028 scaffolding

---

# Final Principle

> **Remember what Combie has seen. Also remember what the provider most recently told us. Never confuse the two.**