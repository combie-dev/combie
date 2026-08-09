# SPRINT-021 --- GitHub Workflow Run Evidence

> **Status:** Complete **Depends on:** SPRINT-020 **Type:** Second
> provider-native evidence vertical slice **Primary goal:** Persist
> compact GitHub Actions workflow-run evidence with exact repository
> binding and provider-native lifecycle time, then expose it through
> offline investigations. **Provider scope:** GitHub only **Generic
> Event abstraction:** Not assumed **Correlation / causality / AI /
> telemetry:** None

## Goal

Sprint 020 added Combie's first durable provider-native historical
evidence: Vercel deployments.

It revealed a candidate evidence envelope:

``` text
provider
native identity
exact Resource binding
state
provider-native timestamps
Combie observation time
refresh authority
compact evidence
```

But the Sprint concluded that a generic Event primitive was not yet
earned.

Sprint 021 pressure-tests that conclusion with a structurally different
provider-native evidence family:

``` text
GitHub repository
└── workflow runs
```

The goal is not to prove that everything is an Event. The goal is to
implement a second real evidence source faithfully and then compare what
actually converges.

## Baseline

Begin from the clean committed Sprint 020 baseline:

`2dd7f9d98a7c18674982576d6b1bad558cbf288c — feat(vercel): persist project deployment evidence for investigate`

Verify the actual repository state and record the exact SHA in
completion notes.

Expected baseline: 437 tests passing, typecheck clean, worktree clean.

## Target Vertical Slice

``` text
GitHub API
   ↓
repository workflow runs
   ↓
minimal normalization
   ↓
durable compact evidence
   ↓
exact github:repository:<numeric-id> binding
   ↓
offline investigation
   ↓
WORKFLOW RUNS
```

Use the existing GitHub connection and sync architecture. Do not add
another authentication system.

## Repository Understanding Report

Before coding, read the build skill, Canon, Sprint 020 completion notes,
and inspect the GitHub client/adapter/normalization/auth, provider
contract/registry, sync, Resource/Change/Relationship models, Vercel
deployment evidence implementation, SQLite upgrade/store patterns,
InvestigationContext, investigate formatter, Change timeline,
pagination, redaction, and provider failure isolation.

Report:

1.  How GitHub repositories are discovered.
2.  Exact repository identity persisted by Combie.
3.  How Sprint 020 integrated provider-native evidence without changing
    the Provider contract.
4.  Which Vercel deployment mechanics are reusable and which are
    provider-specific.
5.  Where workflow-run retrieval should occur.
6.  What pressure appears when adding a second provider-native evidence
    family.
7.  Whether abstraction pressure is already visible.

Do not implement before this report.

## Architecture Pressure Report

Verify the current official GitHub API and answer:

1.  Exact REST endpoint/API version for repository workflow runs.
2.  Required headers/media type.
3.  Stable workflow-run identity.
4.  Exact repository identity in/scoping the response.
5.  Best exact mapping to `github:repository:<numeric-id>`.
6.  Workflow identity/name fields.
7.  `status` semantics.
8.  `conclusion` semantics.
9.  Provider-native timestamps and their exact meanings.
10. Truthful primary ordering time, if one exists.
11. Raw timestamps worth preserving.
12. Mutable lifecycle behavior across syncs.
13. Rerun/run-attempt semantics.
14. Useful compact branch/SHA evidence.
15. Whether actor/user fields should be excluded to minimize PII.
16. Permissions/scopes for public/private repositories.
17. Compatibility with current token / `--use-gh` auth.
18. Pagination.
19. Request/rate-limit pressure at the previously observed \~310
    repositories.
20. Incremental or bounded retrieval opportunities.
21. Retention/completeness caveats.
22. Repositories without Actions.
23. 403/404/disabled/transient failure semantics.
24. Known-empty versus unknown.
25. Stale-evidence behavior after failed refresh.
26. Deletion/absence authority.
27. Smallest durable representation.
28. Whether a shared provider-evidence primitive is now justified.
29. Whether workflow runs belong in the existing Change timeline.
30. One-hop investigation behavior.
31. Canon impact.

Do not predetermine the abstraction answer.

## Exact Resource Binding

Workflow-run evidence must bind deterministically to an existing GitHub
repository Resource.

Prefer verified numeric identity:

``` text
workflow repository.id
→ GitHub Resource.providerResourceId
→ github:repository:<numeric-id>
```

Do not bind by display name, workflow name, branch, SHA, URL, Vercel
metadata, fuzzy matching, or AI inference.

## Evidence Contract

Every persisted workflow run must answer:

-   provider
-   native workflow-run identity
-   exact repository Resource
-   workflow identity/name
-   provider-native status
-   provider-native conclusion
-   provider-native lifecycle time(s)
-   Combie observation time
-   compact supporting evidence
-   refresh authority

Candidate fields, only if verified/useful, include run ID, workflow
ID/name, run number/attempt, trigger, status, conclusion, head branch,
head SHA, created_at, run_started_at, and updated_at.

Use an explicit allowlist. Do not persist the full GitHub payload.

## Identity and Reruns

Pressure-test `run id`, `run_number`, and `run_attempt`.

Document:

-   stable identity
-   attempt semantics
-   whether reruns mutate one persisted record or represent
    distinguishable provider evidence
-   what the minimal representation intentionally loses

Do not build an execution-attempt engine.

## Lifecycle and Time

Preserve `status` and `conclusion` separately if the API gives them
distinct semantics.

Repeated sync must update the same workflow-run identity rather than
create duplicates.

Keep provider time separate from Combie observation time:

``` text
GitHub provider time ≠ Combie observedAt
```

Use precise wording such as created at, started at, updated at, observed
by Combie at. Do not manufacture `occurredAt`.

Do not build full state-transition history unless required for
correctness.

## Branch / SHA Evidence

Branch and head SHA may be stored as compact provider facts if useful.

They must not be used in Sprint 021 to correlate GitHub workflow runs
with Vercel deployments.

Even if:

``` text
workflow.headSha == deployment.gitSha
```

do not infer `triggered`, `caused`, `corresponds_to`, or any
evidence-to-evidence Relationship.

Record future deterministic opportunities only in completion notes.

## Retrieval Strategy and Cost

The account previously exposed roughly 310 GitHub repositories, so
request pressure matters.

Compare authoritative strategies supported by the official API. If
retrieval is one request per repository, quantify the cost and
pagination pressure. If a lower-cost official account-level endpoint
exists with exact repository identity, evaluate it. Do not invent one.

Choose based on correctness, exact binding, failure isolation,
pagination, rate limits, and future incremental potential.

Do not silently skip repositories. If a bounded policy is necessary,
make it explicit and evidence-backed.

## Authority, Failure, and Retention

Distinguish:

``` text
KNOWN POPULATED
KNOWN EMPTY
UNKNOWN / FAILED REFRESH
```

A permission failure is not empty. A transient API error is not empty.
Disabled Actions may require distinct handling based on official
semantics.

Repository discovery must remain trustworthy if workflow enrichment
fails.

Preserve stale workflow evidence after non-authoritative failures rather
than erasing it.

Research GitHub retention/deletion behavior. Do not claim
lifetime-complete history unless guaranteed. Do not destructively delete
previously observed runs merely because they disappear from a bounded or
retention-limited response.

## Security and Privacy

Persist compact workflow-run metadata only.

Never persist tokens, Authorization headers, Actions secrets,
environment values, job/step logs, artifacts, source files, or arbitrary
payloads.

Pressure-test actor/triggering-actor fields. Prefer excluding PII unless
it materially improves investigation value.

Sprint 021 is workflow-run metadata, not workflow-log ingestion.

## Durable Representation

Do not force workflow runs into:

-   Change
-   Resource metadata
-   `vercel_deployments`
-   generic Event solely for symmetry

A provider-specific durable model is acceptable.

A small shared implementation helper is acceptable if it removes
mechanical duplication without imposing shared domain semantics.

Explicitly distinguish shared implementation utility from shared domain
abstraction.

## Generic Primitive Pressure Test

At completion compare Vercel Deployment vs GitHub Workflow Run across:

-   provider
-   native identity
-   Resource binding
-   mutable state
-   secondary state/conclusion
-   provider timestamps
-   Combie observation time
-   authority
-   retention
-   pagination
-   evidence payload
-   deduplication
-   investigation formatting

Then recommend exactly one:

**A --- Generic provider-evidence/Event primitive is now earned.**

**B --- Candidate envelope exists, but a third provider is needed.**

**C --- Provider-specific evidence should remain the model.**

Do not implement Sprint 022 or a broad abstraction here unless
repository correctness absolutely requires a tiny shared utility.

## Investigation Composition

After successful sync, credential-free:

``` bash
bun run combie investigate github:repository:<id>
```

must show persisted workflow evidence without network access.

Prefer:

``` text
WORKFLOW RUNS (newest first)
```

with compact fields such as workflow, run ID, status, conclusion,
branch, SHA, provider-native timestamps, and Combie observation time.

Use actual verified fields and existing CLI style.

Known-empty and unknown states must render differently.

Pressure-test one-hop behavior: when investigating a Vercel project
whose GitHub repository is a `source_for` neighbor, determine whether
that neighbor's workflow evidence should appear. Prefer consistency with
Sprint 020 without increasing graph depth.

## Timeline

Default:

``` text
TIMELINE = Change-only
DEPLOYMENTS = separate provider evidence
WORKFLOW RUNS = separate provider evidence
```

Do not merge workflow runs into the Change timeline by default. Record
cross-evidence temporal composition as future architecture pressure if
it emerges.

## Tests

Use Red → Green → Refactor.

Cover client/API auth, headers/version, exact repository scope,
pagination, empty/malformed/error responses, permission/disabled
behavior where distinguishable, redaction, stable IDs, rerun attempts,
timestamps.

Cover normalization for exact Resource binding, identity, workflow
fields, status/conclusion, branch/SHA, timestamps, optional fields,
deterministic allowlisting, PII minimization, secret exclusion.

Cover persistence for insert/upsert, mutable state/conclusion refresh,
attempts, exact Resource association, deterministic newest-first
ordering/tie-breaks, safe DB upgrade, known-empty/unknown, stale
preservation, and non-authoritative absence.

Cover sync for success, empty, evidence refresh failure with repository
success preserved, coexistence with Vercel deployments/all providers,
partial failures, idempotency, and zero false Resource Changes.

Cover investigation for populated/empty/unknown states, ordering,
timestamps, status/conclusion, branch/SHA, one-hop behavior, offline
reads, no network, DB immutability, unchanged Change timeline, and
unchanged Vercel deployment behavior.

Run the full regression suite.

## Live Verification

If authorized GitHub credentials are locally available, perform
read-only live verification without printing credentials.

Record repositories discovered/checked, workflow runs persisted, request
count if observable, pagination, known-empty/unknown counts,
representative non-sensitive statuses/conclusions, repeated-sync
idempotency, duplicate count, zero false Resource Changes,
credential-free offline investigation, and read-only DB behavior.

Given the repository count, stop and report if live verification would
create unreasonable API request volume rather than hammering GitHub.

If credentials are unavailable, explicitly defer live verification.

## Explicitly Out of Scope

Do not implement generic Event infrastructure, cross-provider event
correlation, workflow↔deployment/SHA correlation, workflow
jobs/steps/logs/artifacts, commit/PR/release ingestion, other providers'
event evidence, observations, temporal correlation windows,
causality/root-cause analysis, anomaly detection/scoring/confidence,
AI/LLM/embeddings, webhooks, logs/metrics/traces, new Resource
Relationships, evidence-to-evidence Relationships, recursive traversal,
MCP/API/SDK/UI, execution, or Sprint 022 scaffolding.

## Definition of Done

-   [x] Sprint 020 baseline verified
-   [x] build skill and Canon read
-   [x] Repository Understanding complete
-   [x] Architecture Pressure complete
-   [x] official GitHub API verified
-   [x] auth/permissions documented
-   [x] stable run identity established
-   [x] rerun/attempt semantics documented
-   [x] exact repository binding established
-   [x] status/conclusion semantics preserved
-   [x] provider timestamp semantics documented
-   [x] provider time distinct from observedAt
-   [x] retrieval/rate-limit strategy justified
-   [x] pagination correct
-   [x] retention/completeness documented
-   [x] populated/empty/unknown authority modeled
-   [x] stale evidence preserved on non-authoritative failure
-   [x] compact allowlist implemented
-   [x] unnecessary PII excluded
-   [x] secrets/logs/artifacts excluded
-   [x] Change not overloaded
-   [x] Resource metadata not used as history
-   [x] generic Event abstraction not assumed
-   [x] smallest durable representation implemented
-   [x] SQLite upgrade safe
-   [x] repeated sync idempotent
-   [x] no duplicate runs
-   [x] mutable lifecycle refresh works
-   [x] zero false Resource Changes
-   [x] offline investigation works
-   [x] WORKFLOW RUNS exposed
-   [x] one-hop boundary preserved
-   [x] Change timeline unchanged
-   [x] Vercel deployment behavior preserved
-   [x] no cross-provider correlation/causality
-   [x] focused/full tests pass
-   [x] typecheck passes
-   [x] secret/whitespace/diff checks clean
-   [x] live verification completed or deferred
-   [x] completion notes updated
-   [x] Canon changes recorded or None
-   [x] Sprint 021 committed
-   [x] worktree clean
-   [x] Sprint 022 not started

## Completion Notes

### Sprint 020 baseline

``` text
2dd7f9d98a7c18674982576d6b1bad558cbf288c
feat(vercel): persist project deployment evidence for investigate
```

Verified clean `master` HEAD at start; only untracked `SPRINT-021.md`.

### Repository Understanding

1. **GitHub discovery:** `GET /user/repos` (page+per_page=100, affiliation
   owner/collaborator/organization_member) via `GitHubClient.listRepositories`,
   normalized to Resources.
2. **Exact repository identity:**
   `providerResourceId = String(repo.id)` →
   `Resource.id = github:repository:<numeric-id>`. Display
   `fullName`/`owner`/`name` live in metadata for path construction only.
3. **Sprint 020 integration pattern:** Provider contract unchanged (auth +
   discover). After successful Resource apply in `syncOne`, provider-specific
   `syncVercelDeployments` writes separate SQLite tables. Investigate reads
   offline.
4. **Reusable vs provider-specific (from Vercel):**
   - Reusable *mechanics*: post-discover sync helper; natural-key upsert;
     refresh success/failure table; known populated/empty/unknown; stale
     retention; offline investigate section; zero Change churn.
   - Provider-specific: table names/fields; timestamp shapes; API path/query;
     pagination; identity type; dual status/conclusion; attempt/rerun.
5. **Where workflow retrieval belongs:** same as deployments —
   `syncGitHubWorkflowRuns` after GitHub Resource apply inside `syncOne`.
6. **Second-family pressure:** two durable evidence tables with parallel
   plumbing; InvestigationContext gains a second optional evidence field;
   mechanical similarity rises without a shared domain type.
7. **Abstraction pressure:** visible as duplicated authority/formatting
   patterns, but field vocabularies and time models still diverge enough that
   a generic Event type would force premature naming.

### Architecture Pressure (selected answers)

1. **Endpoint:** `GET /repos/{owner}/{repo}/actions/runs` (official REST).
2. **Headers:** existing client — `Accept: application/vnd.github+json`,
   `X-GitHub-Api-Version: 2022-11-28`, `Authorization: Bearer`, `User-Agent: combie`.
3. **Stable identity:** workflow run `id` (integer).
4–5. **Repository identity / join:** response `repository.id` →
   `providerResourceId` → `github:repository:<id>`. Reject mismatches. API
   path uses owner/repo from Resource metadata `fullName` or `owner`+`name`
   (routing only, not identity).
6. **Workflow identity:** `workflow_id`, `name`.
7–8. **status** vs **conclusion** kept separate (e.g. completed + failure).
9–11. **Times:** `created_at` (primary ordering), optional `run_started_at`,
   optional `updated_at`. No generic `occurredAt`.
12. **Mutable lifecycle:** upsert same `run_id` as status/conclusion change.
13. **Reruns:** same `id`; `run_attempt` increments. Minimal model stores
   latest attempt on that id (no attempt history engine).
14. **Branch/SHA:** stored as facts; **not** used for correlation.
15. **Actor fields:** excluded (PII).
16–17. **Permissions:** public read; private needs classic `repo` scope.
   Compatible with existing `--token` / `--use-env` / `--use-gh` tokens.
18. **Pagination:** page + per_page (max 100).
19–20. **Cost:** per-repository listing only (no official account-wide
   workflow-run list with exact repo ids). At ~310 repos, unbounded full
   history pagination would be expensive. **Explicit bound:** 1 page × 100
   most-recent runs per repository (~310 requests/sync ≪ 5000/hr auth limit).
21. **Retention:** not lifetime-complete; GitHub/Actions retention policies
   apply. Combie never claims complete history.
22–24. **No Actions / 403 / empty:** successful empty list → known empty;
   403/404/transient → failure/unknown, not empty.
25–26. **Stale/deletion:** retain prior rows on failure; list absence not
   deletion authority.
27. **Durable model:** provider-specific `github_workflow_runs` +
   `github_workflow_run_refresh`.
28. **Generic Event:** **not earned** (recommendation B below).
29. **Change timeline:** not merged.
30. **One-hop:** GitHub neighbor workflow runs included (mirrors Vercel
    deployments on neighbors).
31. **Canon:** no material change required.

### GitHub API Evidence Contract

``` text
GET /repos/{owner}/{repo}/actions/runs?per_page=100&page=1
```

Allowlist: run id, repository id, workflow id/name, run number/attempt,
event, status, conclusion, head branch/SHA, created/started/updated times,
Combie observedAt.

### Retrieval / rate-limit strategy

- No lower-cost official account-level endpoint with exact repository ids
  was found.
- Per-repo listing is correct for binding and failure isolation.
- **Bound (explicit):** `WORKFLOW_RUNS_MAX_PAGES=1`,
  `WORKFLOW_RUNS_PER_PAGE=100`. Documented in sync summary output.
- Expected request count ≈ repository count (~310), not 310×N pages.

### Durable Representation

Tables `github_workflow_runs` (PK `run_id`) and
`github_workflow_run_refresh`. Not Change, not Resource metadata, not
`vercel_deployments`, not Event*.

### Identity / Attempts

| Concept | Semantics |
| --- | --- |
| `run_id` | Stable GitHub identity; upsert key |
| `run_number` | Sequential number within workflow |
| `run_attempt` | Latest attempt for that run id |

**Intentionally loses:** historical prior attempts as separate rows.

### Time Semantics

| Wording | Source |
| --- | --- |
| created at | `created_at` |
| started at | `run_started_at` |
| updated at | `updated_at` |
| observed by Combie at | sync `observedAt` |

`PROVIDER TIME ≠ COMBIE OBSERVATION TIME`.

### Authority / Retention

populated / empty / unknown as Sprint 020. No destructive cleanup from
bounded list windows.

### Security / Privacy

Exclude actors, triggering_actor, head_commit messages/authors, logs URLs,
jobs URLs, tokens, secrets, artifacts, full payloads.

### Sync Behavior

After GitHub Resource apply → `syncGitHubWorkflowRuns`. Repository
discovery remains trustworthy on workflow failure. Coexists with Vercel
deployment enrichment on multi-provider syncs.

### Investigation Composition

`subjectWorkflowRuns` + neighbor `workflowRuns`. CLI section
`WORKFLOW RUNS (newest first)`. Offline; no network.

### Timeline Decision

``` text
TIMELINE = Change-only
DEPLOYMENTS = Vercel evidence
WORKFLOW RUNS = GitHub evidence
```

Cross-evidence temporal composition deferred (future pressure).

### Vercel vs GitHub Evidence Comparison

| Axis | Vercel deployment | GitHub workflow run |
| --- | --- | --- |
| provider | vercel | github |
| native id | string `uid` | integer `run_id` |
| Resource bind | projectId → vercel:project:… | repository.id → github:repository:… |
| primary state | readyState/state | status |
| secondary state | target/source | conclusion + run_attempt |
| provider times | epoch ms created/building/ready | ISO created/started/updated |
| observedAt | Combie ISO | Combie ISO |
| authority | per project refresh | per repository refresh |
| retention | plan/policy; not complete | Actions retention; not complete |
| pagination | until cursor | page/per_page |
| evidence payload | compact allowlist | compact allowlist (no actor) |
| dedupe | upsert uid | upsert run_id |
| investigate section | DEPLOYMENTS | WORKFLOW RUNS |

### Generic Primitive Pressure

**Recommendation: B — Candidate envelope exists, but a third provider is needed.**

Candidate cross-provider envelope (survives both implementations):

``` text
provider
native identity
exact Resource binding
provider-native state field(s)
provider-native lifecycle time(s)
Combie observedAt
refresh authority (populated/empty/unknown)
compact allowlisted evidence
```

Still provider-specific: identity type, dual status models, timestamp
names/units, pagination, request path construction, retention contracts,
attempt/rerun.

Do **not** implement Event in Sprint 021. Smallest future abstraction
(Sprint 022 pressure-test if still wanted after a third source): a thin
*persistence/investigation envelope interface*, not a universal event
taxonomy or engine.

### Future deterministic cross-provider opportunities

Exact SHA equality between `workflow.headSha` and any future deployment
commit field could be researched later as a **deterministic fact pair**.
Sprint 021 records the opportunity and implements **zero** correlation.

### Validation

- Focused Sprint 021 tests: client, normalize, store, sync, investigate.
- Full suite: **466 pass, 0 fail**.
- `bun run typecheck`: clean.
- Secret scan: fixture tokens only; no live secrets.

### Live verification

**Explicitly deferred.** `GITHUB_TOKEN` / `GH_TOKEN` unset. Even with
credentials, ~310-repo full live verification would be intentionally
bounded by the 1×100 policy; no live run performed here.

### Deviations

- Used existing `X-GitHub-Api-Version: 2022-11-28` (matches current GitHub
  client) rather than the docs' newer example date — consistent with repo
  auth/discovery.
- Explicit first-page bound (not full pagination) for rate-limit safety.

### Learnings

1. **Envelope survival:** Yes — Sprint 020's candidate envelope still
   describes both families at a high level.
2. **Cross-provider vs specific:** shared: provider, native id, Resource
   bind, state-ish fields, provider times, observedAt, authority, compact
   allowlist. Specific: field names, dual status/conclusion, attempt,
   timestamp units, pagination, API path needs.
3. **Generic Event earned?** **No** (recommendation B).
4. **If yes (not chosen):** N/A.
5. **Third source for next pressure:** Neon project operations (Sprint 019
   rank 2) — control-plane actions, cursor pagination, six-month caveat —
   would stress the envelope differently from deploy/CI families.

### Canon changes

None.

## Final Principle

> **Two real implementations are evidence. They are not automatically an
> abstraction.**

Implement GitHub workflow runs faithfully. Preserve GitHub semantics.
Reuse mechanics only where they are truly shared. Compare what actually
emerged. Then stop.
