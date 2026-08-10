# SPRINT-028 — Last Successful Refresh Time Provenance

> **Status:** Complete
> **Depends on:** SPRINT-027
> **Type:** Implementation / authority semantics
> **Primary goal:** Persist durable last-success refresh observation time for Vercel deployment, GitHub workflow-run, and Neon operation evidence so Combie can distinguish when the latest refresh attempt occurred from when provider authority was last successfully established.
> **Provider scope:** Vercel + GitHub + Neon evidence refresh authority
> **Provider API behavior:** Unchanged
> **Provider contracts:** Unchanged
> **Facts:** Existing authority Facts may consume stronger provenance
> **AI / correlation / causality:** None

---

## Goal

Sprint 027 strengthened Combie's provider-evidence authority model by preserving:

```text
latest successful provider response result count
```

separately from:

```text
historical evidence retained locally
```

Sprint 027 also exposed the smallest remaining authority gap:

> **Combie does not durably preserve when the most recent successful evidence refresh established that authority.**

Today the existing refresh `observed_at` can represent the latest refresh attempt.

That means:

```text
12:00 successful refresh
  resultCount = 3

12:30 failed refresh
  current authority = unknown
  observed_at = 12:30
```

Combie now correctly retains:

```text
last successful result count = 3
```

but it does not necessarily retain:

```text
last successful refresh observed at = 12:00
```

as a separate durable authority fact.

Sprint 028 fixes exactly that distinction.

The desired model is conceptually:

```text
LATEST REFRESH ATTEMPT
├── authority
└── observedAt

LAST SUCCESSFUL REFRESH
├── resultCount
└── observedAt
```

These are different facts.

---

## Core Principle

> **When Combie last asked the provider and when the provider last answered successfully are different timestamps. Preserve both.**

A failed refresh attempt must never erase the time at which provider authority was last successfully established.

---

## Baseline

Begin from the clean committed Sprint 027 baseline.

Expected Sprint 027 implementation commit:

```text
b3400cc04a2cbd9a972d1349b010576b66c65d45
feat(storage): add refresh result-count provenance for Vercel and GitHub
```

Sprint 027 also recorded documentation completion separately.

Verify the actual current repository HEAD before implementation.

Run:

```bash
git status
git log -3 --oneline
bun test
bun run typecheck
```

Expected baseline:

```text
551 tests passing
typecheck clean
worktree clean
```

Record the exact full current HEAD SHA in Sprint 028 completion notes.

If Sprint 027 is not fully committed or the worktree is not clean:

**STOP.**

Do not combine Sprint 027 and Sprint 028.

---

# Repository Understanding Report

Before coding, inspect:

- `skills/build-combie/SKILL.md`
- Combie Canon
- Sprint 022 completion notes
- Sprint 026 completion notes
- Sprint 027 completion notes
- `vercel_deployment_refresh`
- `github_workflow_run_refresh`
- Neon operation refresh persistence
- Sprint 027 `result_count` implementation
- SQLite upgrade patterns
- refresh-state read/write helpers
- evidence sync paths
- `InvestigationContext`
- provider evidence authority DTOs
- `composeInvestigationFacts()`
- authority Fact formatting
- tests around populated / empty / unknown / stale
- offline investigation behavior

Produce a concise Repository Understanding report.

Explicitly answer:

1. What does each provider evidence refresh table currently persist?
2. What exactly does current `observed_at` mean?
3. Does `observed_at` represent the latest attempt, latest success, or something provider-specific?
4. What happens to `observed_at` after a failed refresh?
5. How is Sprint 027 `result_count` preserved across failure?
6. Does Neon currently preserve a separate successful-refresh time already?
7. Which providers require schema changes?
8. Which provider evidence authority DTOs need expansion?
9. Which existing Facts could become more precise with last-success time?
10. Can this remain a narrow persistence + authority DTO enhancement?

No implementation before this report.

---

# Architecture Pressure Report

Answer before implementation:

1. Is `lastSuccessfulObservedAt` the smallest sufficient primitive?
2. Should the value mean:
   - time Combie completed the successful refresh,
   - time Combie began the refresh,
   - provider event time,
   - or another exact semantic?
3. Should the field use the same timestamp assigned to successful refresh authority today?
4. Should it be nullable?
5. What should pre-028 databases contain?
6. Should old rows be backfilled from current `observed_at`?
7. Under what exact conditions, if any, would such backfill be truthful?
8. Should a failed refresh preserve the prior success timestamp?
9. Should a successful empty refresh update last-success time? Expected: yes.
10. Should a successful populated refresh update last-success time? Expected: yes.
11. Should current attempt time continue updating after failures? Expected: yes.
12. Can the latest attempt time be earlier than last-success time? Expected: no under normal monotonic execution, but pressure-test assumptions.
13. Should Vercel/GitHub/Neon share exact field semantics?
14. Is a generic refresh authority abstraction needed?
15. Are provider contracts affected?
16. Are provider API requests affected?
17. Does any evidence row need modification?
18. Does historical evidence retention change? Expected: no.
19. Which Fact wording becomes newly safe?
20. What authority claims remain unsafe?
21. Does Canon need to change?

Prefer the smallest provider-authority change.

---

# Semantic Contract

Define the new field precisely.

Recommended semantic:

```text
lastSuccessfulObservedAt
=
the Combie observation timestamp associated with the most recent successful
provider evidence refresh for that exact Resource/evidence scope
```

It is a **Combie refresh observation time**.

It is NOT:

```text
provider event time
provider resource modification time
provider response generation time
deployment created time
workflow created_at
operation created_at
```

It describes Combie's evidence authority.

---

# Current Attempt vs Last Success

After Sprint 028, refresh authority should conceptually distinguish:

```text
latestAttemptObservedAt
currentAuthority

lastSuccessfulObservedAt
lastSuccessfulResultCount
```

Exact field names should follow repository conventions.

Do not rename existing fields unnecessarily if `observed_at` already clearly means latest attempt.

The semantic model matters more than naming symmetry.

---

# Example Authority Sequence

## First successful refresh

At:

```text
12:00
```

Provider returns:

```text
3 records
```

Persist:

```text
current authority = populated
latest attempt observedAt = 12:00
last successful observedAt = 12:00
last successful resultCount = 3
```

---

## Later failed refresh

At:

```text
12:30
```

Refresh fails.

Persist:

```text
current authority = unknown
latest attempt observedAt = 12:30
last successful observedAt = 12:00
last successful resultCount = 3
```

Retained evidence remains unchanged.

---

## Later successful empty refresh

At:

```text
13:00
```

Provider successfully returns:

```text
0 records
```

Persist:

```text
current authority = empty
latest attempt observedAt = 13:00
last successful observedAt = 13:00
last successful resultCount = 0
```

Historical retained evidence may still exist.

---

## Later successful populated refresh

At:

```text
14:00
```

Provider returns:

```text
2 records
```

Persist:

```text
current authority = populated
latest attempt observedAt = 14:00
last successful observedAt = 14:00
last successful resultCount = 2
```

---

# Pre-Sprint-028 Upgrade Semantics

Be extremely conservative.

Existing databases may contain:

```text
observed_at
result_count
```

but do not automatically assume:

```text
observed_at = last successful refresh time
```

if the current row may represent a later failed attempt.

Therefore default upgrade behavior should be:

```text
last_successful_observed_at = null
```

unless repository semantics can **prove** that the persisted row represents a successful refresh.

Pressure-test whether current refresh rows encode enough authority to safely backfill some rows.

Possible safe rule:

```text
if current authority definitively represents a successful populated/empty refresh
then observed_at may equal last_successful_observed_at
```

But do not assume this without inspecting the actual schema.

Never backfill success time from a row whose current authority is unknown.

Unknown provenance remains unknown.

Document the exact migration rule.

---

# Provider Scope

Apply the authority semantic consistently to:

```text
Vercel Deployments
GitHub Workflow Runs
Neon Operations
```

Sprint 027 did not change Neon.

Sprint 028 should inspect whether Neon already has enough successful-refresh time provenance.

If Neon already preserves equivalent semantics:

- reuse it;
- expose it consistently;
- do not add redundant storage.

If Neon lacks it:

- add the smallest equivalent field.

Do not modify Neon provider evidence semantics beyond refresh authority.

---

# Vercel

Persist durable last-success refresh observation time.

Pressure-test:

- first populated success
- repeated populated success
- successful empty
- failed refresh after success
- multiple failures after success
- later recovery
- pre-028 migration
- retained historical deployments

Do not change:

- Vercel deployment evidence rows
- API retrieval behavior
- provider contract
- provider timestamps
- evidence retention

---

# GitHub

Persist durable last-success refresh observation time.

Pressure-test:

- first successful bounded refresh
- successful zero-result refresh
- successful 1–100 result refresh
- failed refresh after success
- permission failure
- transient failure
- repeated failure
- recovery
- pre-028 upgrade

GitHub's bounded retrieval semantics remain unchanged.

`lastSuccessfulObservedAt` tells us when Combie successfully established authority over that **bounded evidence refresh**.

It does not imply lifetime-complete GitHub Actions history.

---

# Neon

Use Neon as an authority consistency check.

Pressure-test:

- current `result_count`
- current `observed_at`
- retained-history semantics
- successful empty behavior
- failed refresh behavior
- whether successful observation time already survives failure

If Neon requires a schema addition, keep it minimal and aligned with the same semantic contract.

Do not redesign Neon refresh storage.

---

# Persistence

Prefer additive SQLite changes.

Conceptually:

```text
vercel_deployment_refresh
  + last_successful_observed_at

github_workflow_run_refresh
  + last_successful_observed_at

neon_operation_refresh
  + last_successful_observed_at
```

Only add fields where necessary.

Use repository naming conventions.

Do not introduce:

```text
refresh_history
refresh_events
refresh_attempts
provider_refreshes
generic_authority
```

Sprint 028 does not need full refresh history.

It needs exactly:

```text
latest attempt
+
last successful authority
```

---

# Sync Writes

On successful provider evidence refresh:

```text
latest attempt observedAt = current successful refresh time
last successful observedAt = same timestamp
last successful resultCount = current normalized count
current authority = populated or empty
```

On failed refresh:

```text
latest attempt observedAt = failure attempt time
current authority = unknown
last successful observedAt = unchanged
last successful resultCount = unchanged
```

Retained evidence stays unchanged.

No new provider calls.

No provider contract changes.

---

# InvestigationContext

Expose last-success time through existing evidence authority DTOs.

Application-layer authority should be able to answer:

```text
current authority
latest attempt observedAt
last successful observedAt
last successful resultCount
retained local evidence count
```

Do not derive last-success time in:

```text
composeInvestigationFacts()
```

or in CLI formatting.

It must come from persisted authority provenance.

---

# Investigation Facts Refinement

Sprint 028 may make existing authority Facts more precise.

Potential wording:

```text
GitHub workflow-run evidence is currently unknown.

The last successful bounded refresh at 2026-08-10T12:00:00Z
returned 3 runs;
Combie retains 7 previously recorded runs locally.
```

Potential successful empty wording:

```text
The latest successful Vercel deployment refresh at
2026-08-10T13:00:00Z returned no deployments;
2 previously recorded deployments remain retained locally.
```

Potential current-success wording:

```text
The latest successful Neon operation refresh at
2026-08-10T14:00:00Z returned 2 operations.
```

Exact CLI copy should remain compact.

Do not create a new Fact variant solely for time if existing authority Facts can carry it.

Do not increase the five-Fact cap.

---

# Time Vocabulary

Use wording such as:

```text
last successful refresh at
latest refresh attempt at
Combie successfully refreshed at
```

Do not say:

```text
provider data was current at
provider event occurred at
resource changed at
```

unless independent provider-native evidence proves that.

This timestamp is about **Combie evidence authority**, not provider event time.

---

# Staleness

Sprint 028 should make stale/unknown authority more useful without inventing a staleness score.

Safe:

```text
GitHub workflow-run evidence is currently unknown;
the last successful refresh was observed by Combie at T.
```

Do not calculate:

```text
staleness score
freshness confidence
risk
severity
```

Do not introduce thresholds like:

```text
older than 1 hour = stale
```

unless a future Sprint explicitly researches that semantic.

The time is factual.

Its significance is not.

---

# No Refresh History

Do not persist every attempt.

Sprint 028 needs:

```text
latest attempt
last successful attempt
```

not:

```text
all refresh attempts
```

Do not add append-only refresh history.

Do not create refresh timelines.

That is outside scope.

---

# Tests

Use:

```text
Red → Green → Refactor
```

## Storage / Upgrade

Cover:

- pre-028 DB opens
- nullable last-success time
- safe backfill only where authority proves success
- unknown rows remain null
- populated success
- empty success
- failure preserves last success
- repeated failures preserve last success
- recovery updates last success
- deterministic reads

---

## Vercel

Cover:

```text
success at T1
failure at T2
```

assert:

```text
latest attempt = T2
last success = T1
resultCount preserved
authority unknown
```

Also:

- success → success
- success populated → success empty
- multiple failures
- recovery
- retained rows unchanged

---

## GitHub

Same authority cases.

Also preserve:

```text
bounded refresh semantics
```

The last-success timestamp refers to the bounded refresh contract.

---

## Neon

Regression/compatibility coverage:

- successful populated
- successful empty
- failed refresh after success
- resultCount retained
- last success time retained
- historical operation retention unchanged

---

## InvestigationContext

Test exposure of:

```text
latestAttemptObservedAt
lastSuccessfulObservedAt
lastSuccessfulResultCount
retainedCount
authority
```

where relevant.

Test pre-028 unknown last-success time.

---

## Facts

Cover:

- current unknown + known last-success time
- current unknown + last-success count
- successful empty with retained history
- populated current success
- bounded GitHub wording
- no provider-event-time implication
- no staleness interpretation
- five-Fact cap unchanged
- deterministic priority unchanged

---

## CLI

Verify `combie investigate` can clearly communicate:

```text
latest refresh attempt
last successful refresh
latest successful result count
retained local evidence
```

without excessive verbosity.

Do not print four timestamps per Fact if a more concise truthful sentence works.

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
551 tests
```

Final count should increase.

Perform:

- focused tests
- full regression
- secret scan
- staged diff review
- full diff review

Preserve all existing:

- providers
- Resources
- Relationships
- Changes
- History
- Context
- Investigation
- KNOWN FACTS
- KNOWN PROVIDER ACTIVITY
- COMBIE OBSERVATIONS
- Vercel deployments
- GitHub workflow runs
- Neon operations
- result-count provenance
- partial failures
- offline investigation

---

# Live Verification

If authorized provider credentials are available, perform read-only verification.

Ideal scenario:

```text
successful evidence refresh
→ capture last successful time
→ induce/observe safe failure if practical
→ verify latest attempt changes
→ verify last success remains unchanged
```

Do NOT intentionally break production credentials or cause harmful provider failures solely for verification.

A controlled mocked/fixture failure is acceptable.

For GitHub, avoid expensive account-wide sync solely for Sprint 028.

After any live successful sync:

```bash
unset VERCEL_TOKEN
unset GITHUB_TOKEN
unset GH_TOKEN
unset NEON_API_KEY
```

Verify `combie investigate` still renders authority provenance offline.

If credentials are unavailable, explicitly defer live verification.

---

# Architecture Review

Before completion answer:

1. Does Combie now distinguish latest refresh attempt time from last successful refresh time?
2. Does failure preserve last-success time?
3. Does successful empty refresh advance last-success time?
4. Does successful populated refresh advance last-success time?
5. Are provider-native event timestamps still separate?
6. Did any provider contract change?
7. Did any provider API behavior change?
8. Did retained evidence behavior change?
9. Was refresh history required?
10. Was a generic RefreshEngine required?
11. Did Fact semantics become more truthful?
12. Did any freshness interpretation get introduced?
13. What authority primitive remains missing, if any?
14. Is refresh authority now sufficiently complete to stop iterating until real investigation pressure exposes another gap?

---

# Completion Notes

## Baseline

```text
5bf16550f5e2ae6897738cce4e4a37a409fdbbf7
docs(sprint): record Sprint 027 commit SHA

Sprint 027 implementation:
b3400cc04a2cbd9a972d1349b010576b66c65d45
feat(storage): add refresh result-count provenance for Vercel and GitHub

551 tests passing
typecheck clean
```

Only untracked file at start: `SPRINT-028.md`.

## Repository Understanding

Before Sprint 028:

| Table | Fields |
|-------|--------|
| `vercel_deployment_refresh` | status, observed_at, message, result_count |
| `github_workflow_run_refresh` | status, observed_at, message, result_count |
| `neon_operation_refresh` | status, observed_at, message, result_count |

1. `observed_at` meant **latest refresh attempt** (success or failure).
2. Failure always rewrote `observed_at` to the failure attempt time.
3. Vercel/GitHub preserved `result_count` on failure; Neon still nulls `result_count` on failure.
4. Neon did **not** persist a separate last-success time. Authority DTOs had `lastSuccessAt` but compose always set it to `null`.
5. All three providers needed `last_success_observed_at`.
6. Implementation stayed a narrow additive column + DTO wiring + Fact wording change.

## Architecture Pressure

1. **Yes** — last successful refresh observation time is the smallest missing primitive after result count.
2. Meaning: Combie observation timestamp when the successful refresh completed (same clock as existing successful `observed_at` writes).
3. **Yes** — reuses the same success timestamp assigned on successful refresh.
4. **Nullable** for unknown history.
5. Pre-028: null unless safely backfilled.
6–7. Safe backfill **only** when `status = 'success'` (then `observed_at` is proven success time). Failure rows stay null — never copy attempt time.
8. Failure preserves last-success time.
9–10. Empty and populated success both advance it.
11. Latest attempt (`observed_at`) continues advancing on failure.
12. Under normal monotonic sync, attempt ≥ last success; not enforced by schema.
13. Shared semantic across Vercel/GitHub/Neon.
14. No generic refresh abstraction.
15–16. Provider contracts/APIs unchanged.
17–18. Evidence rows and retention unchanged.
19. Facts can include “last successful refresh at T”.
20. Still unsafe: freshness scores, “resource changed at”, lifetime completeness.
21. Canon: none.

## Semantic Contract

```text
lastSuccessfulObservedAt
=
Combie observation timestamp of the most recent successful
provider evidence refresh for that exact Resource/evidence scope
```

Combie authority time — **not** provider event time (`created`, `created_at`, etc.).

## Upgrade Semantics

- Additive `last_success_observed_at TEXT` on all three refresh tables.
- On column add: `UPDATE … SET last_success_observed_at = observed_at WHERE status = 'success'`.
- Failure rows remain `NULL`.
- No invention of authority history.

## Vercel

Success (populated or empty): `observed_at = last_success_observed_at = now`, `result_count = N`.

Failure: `observed_at = failure time`, preserve `result_count` and `last_success_observed_at`.

Recovery success advances both attempt and last-success times.

## GitHub

Same as Vercel.

Bounded semantics: last-success time is when Combie completed the ≤100-run refresh — not complete history establishment. Facts keep “bounded” wording when count is 100.

## Neon

Minimal change: same `last_success_observed_at` field + preserve on failure.

`result_count` still nulls on failure (Sprint 022/027 regression preserved).

## InvestigationContext

Refresh records:

```text
observedAt                    // latest attempt
lastSuccessfulObservedAt      // last success (nullable)
resultCount                   // last success count (Vercel/GitHub preserve; Neon nulls on failure)
```

Authority DTOs:

```text
unknown:
  latestAttemptObservedAt
  lastSuccessAt               // wired from lastSuccessfulObservedAt
  resultCount                 // Vercel/GitHub
  message

empty | populated:
  observedAt                  // success time
  resultCount                 // when modeled
```

Facts source: `lastSuccessfulObservedAt`, `lastSuccessfulResultCount`, retained ids — never inferred in the formatter.

## Fact Refinement

Newly safe:

```text
… is currently unknown; the last successful refresh at T returned N …;
M previously recorded … remain retained locally.

The latest successful … refresh at T returned no …
```

Still forbidden: freshness scores, “provider activity was current at”, provider-event-time implication, completeness claims.

`MAX_INVESTIGATION_FACTS = 5` unchanged.

## Time Authority

| Clock | Meaning |
|-------|---------|
| Provider event time | deployment created / run created_at / op created_at |
| Latest attempt `observed_at` | when Combie last checked |
| Last successful `last_success_observed_at` | when Combie last knew |

## Validation

```text
bun test          — 555 pass
bun run typecheck — clean
git diff --check  — clean
```

Secret scan: fixture placeholder tokens only.

## Live Verification

**Deferred.** No Vercel/GitHub/Neon credentials in environment.

## Architecture Review answers

1. Yes — latest attempt vs last success are distinct.
2. Yes — failure preserves last success time.
3. Yes — populated success advances it.
4. Yes — empty success advances it.
5. Yes — clearly Combie authority time, not provider event time.
6. Provider contracts unchanged.
7. APIs unchanged.
8. Retained evidence behavior unchanged.
9. Refresh history not required.
10. Generic RefreshEngine not required.
11. Known Facts more truthful with “at T”.
12. No age-based freshness interpretation.
13. Refresh-authority infrastructure is now complete enough: attempt, success time, success count, retained memory.
14. Yes — stop authority infrastructure until real investigation pressure exposes another gap.

## Explicit Questions (answered)

1. Combie observation time of latest successful evidence refresh for exact scope.
2. No — not provider-native time.
3. Yes — distinct from latest attempt.
4. Yes.
5. Yes.
6. Yes.
7. Success rows backfilled; failure rows null.
8. No unsafe backfill.
9–11. Yes for all three (additive column).
12–13. No.
14. No.
15. Unknown/empty/populated wording with last-success time.
16. Freshness, completeness, provider-event conflation.
17–18. No.
19. No further refresh-authority primitive required before product pressure.
20. Yes — Sprint 029 should return to product/investigation capability.

## Deviations

1. Neon still nulls `result_count` on failure (intentionally preserved); only last-success **time** is preserved for Neon.
2. Safe backfill for `status = 'success'` only (stronger than “always null”).

## Learnings

1. “When Combie last checked” and “when Combie last knew” must both be durable.
2. Existing `lastSuccessAt` DTO fields were placeholders; wiring required persisted provenance.
3. Refresh-authority stack (attempt, success time, success count, retained memory) is now complete enough to pause infrastructure work.

## Canon Changes

**None.**

## Commit

```text
94ff5a3dcf79530f9348f51ea3c16e3b80b15f3c
feat(storage): persist last successful refresh observation time
```

## Files Changed

```text
src/storage/store.ts
src/providers/vercel/deployment.ts
src/providers/github/workflow-run.ts
src/providers/neon/operation.ts
src/app/vercel-deployments.ts
src/app/github-workflow-runs.ts
src/app/neon-operations.ts
src/app/investigation-facts.ts
src/app/investigate.ts
tests/... (storage, sync, authority, facts)
docs/internal/sprints/SPRINT-028.md
```

---

# Definition of Done

- [x] Sprint 027 clean baseline verified
- [x] exact baseline SHA recorded
- [x] SKILL protocol followed
- [x] Canon read
- [x] relevant Sprint notes reviewed
- [x] Repository Understanding completed
- [x] Architecture Pressure completed
- [x] exact last-success-time semantics defined
- [x] latest attempt semantics preserved
- [x] last successful refresh time persisted
- [x] Vercel covered
- [x] GitHub covered
- [x] Neon covered or proven already sufficient
- [x] safe upgrade implemented
- [x] unknown historical success time remains unknown
- [x] no unsafe backfill
- [x] populated success updates last-success time
- [x] empty success updates last-success time
- [x] failure preserves last-success time
- [x] recovery updates last-success time
- [x] result-count provenance preserved
- [x] historical evidence retention unchanged
- [x] provider contracts unchanged
- [x] provider API behavior unchanged
- [x] InvestigationContext exposes time provenance
- [x] Known Facts refined only where safe
- [x] five-Fact cap unchanged
- [x] no generic Event
- [x] no generic refresh engine
- [x] no refresh-history subsystem
- [x] no ObservationEngine
- [x] no CorrelationEngine
- [x] no confidence/severity/scoring
- [x] no freshness interpretation
- [x] no correlation/causality
- [x] focused tests added
- [x] full tests pass
- [x] typecheck passes
- [x] secret scan clean
- [x] diff/whitespace checks clean
- [x] live verification complete or deferred
- [x] completion notes updated
- [x] Canon changes recorded or None
- [x] Sprint 028 committed separately
- [x] worktree clean
- [x] Sprint 029 not started

---

# Explicitly Out of Scope

Do not implement:

- generic RefreshEngine
- refresh-history table
- refresh-attempt log
- freshness score
- staleness score
- confidence
- severity
- generic Event
- generic Evidence
- ObservationEngine
- CorrelationEngine
- temporal correlation
- SHA matching
- causal inference
- root-cause analysis
- incident grouping
- anomaly detection
- AI/LLM summaries
- embeddings
- new providers
- new provider evidence
- new Relationships
- application↔database inference
- recursive traversal
- logs
- metrics
- traces
- webhooks
- MCP/API/SDK/UI
- controlled execution
- Sprint 029 scaffolding

---

# Final Principle

> **Know when Combie last checked. Know when Combie last knew. Those are not the same moment.**