# SPRINT-020 --- Vercel Deployment Evidence

> **Status:** Complete\
> **Depends on:** SPRINT-019\
> **Phase:** Investigation foundation / evidence enrichment\
> **Type:** Narrow provider-evidence vertical slice\
> **Primary goal:** Ingest compact Vercel project deployment history as
> trustworthy provider-native evidence with exact project association
> and provider-native time, then expose it through Combie's existing
> investigation path.\
> **Provider scope:** Vercel only\
> **Generic Event abstraction:** Not assumed\
> **AI / correlation / causality / telemetry:** None

## Goal

Sprint 019 concluded:

> **Recommendation A --- implement Vercel project deployment history
> next, while deferring a generic Event model until provider-first
> evidence is learned.**

Sprint 020 implements that recommendation as one deliberately narrow
vertical slice.

Combie already knows a Vercel project's current Resource state, Resource
Change history, proven Relationships, InvestigationContext, and
deterministic Change timeline. Sprint 020 adds one stronger evidence
family:

``` text
Vercel project
└── deployment history
```

Deployment evidence must come from Vercel's official read-only API,
carry stable provider identity and provider-native time, bind exactly to
an existing Vercel project Resource, persist deterministically, remain
compact and secret-safe, and be readable offline after sync.

Do not generalize to all provider events before learning from this
implementation.

## Why Now

Sprint 018 proved that `Change.observedAt` is Combie sync observation
time, not provider event time. Sprint 019 found Vercel deployment
history to be the strongest current improvement in investigation quality
per unit of architectural complexity.

The new evidence should let Combie truthfully present facts such as:

``` text
Vercel reports deployment D for project P.
Vercel reports provider-native lifecycle time T.
Combie observed this deployment evidence at O.
```

It must not claim that a GitHub Change caused a deployment, that a
deployment caused another Change, or that a deployment explains an
incident.

> **Add stronger evidence, not stronger claims.**

## Baseline

Before implementation, inspect the actual Sprint 019 baseline.

If Sprint 019 is still uncommitted, stop and report that it must be
committed first. Do not silently implement Sprint 020 on an ambiguous
working tree.

Record the exact Sprint 019 commit in completion notes.

Expected pre-Sprint state:

``` text
400 tests passing
typecheck clean
Sprint 019 research complete
production code unchanged by Sprint 019
```

## Target Vertical Slice

``` text
Vercel API
   ↓
deployment history
   ↓
minimal normalization
   ↓
durable compact provider evidence
   ↓
exact association to vercel:project:<providerResourceId>
   ↓
offline investigation composition
   ↓
DEPLOYMENTS
```

Use the existing provider sync boundary unless repository pressure
proves a smaller compatible integration point.

## Repository Understanding Report

Before coding, read `skills/build-combie/SKILL.md`, the Canon, Sprint
019 completion notes, and inspect:

-   Vercel client, adapter, and normalization
-   provider contract and registry
-   sync orchestration
-   Resource, Change, and Relationship models
-   SQLite schema/store and upgrade patterns
-   credential/redaction architecture
-   Context, InvestigationContext, and Timeline composition
-   `investigate` CLI formatting
-   provider pagination/failure-isolation patterns

Report:

-   how Vercel projects are discovered
-   exact persisted Vercel project identity
-   deployment endpoint/shape selected by Sprint 019
-   where deployment retrieval fits
-   reusable persistence/normalization patterns
-   architecture pressure created by provider-native historical evidence

No implementation before this report.

## Architecture Pressure Report

Answer:

1.  What exact official Vercel deployment endpoint/API version should be
    used?
2.  Can deployments be listed with exact project identity?
3.  What stable deployment ID exists?
4.  Which provider-native timestamps exist and what does each mean?
5.  Is there one truthful primary ordering timestamp?
6.  Which raw provider timestamps should remain as compact evidence?
7.  How does deployment evidence bind exactly to `vercel:project:<id>`?
8.  Can retrieval fit above/below the current provider contract without
    redesign?
9.  Is changing the Provider contract actually justified?
10. What is the smallest durable representation?
11. Has a generic `Event` primitive been earned?
12. Would extending `Change` distort its semantics?
13. Would Resource metadata be an inappropriate historical store?
14. Is a narrow deployment-specific durable model the best learning
    step?
15. What exactly should Combie `observedAt` mean for deployment
    evidence?
16. How are repeated syncs deduplicated?
17. How are deployment state/status updates handled?
18. Is a deployment record immutable evidence, mutable latest state, or
    both?
19. What pagination/request pattern is required?
20. Can ingestion be incremental or safely bounded?
21. What happens if deployment retrieval fails after project discovery
    succeeds?
22. Should that failure fail the whole Vercel sync?
23. What fields must never be persisted?
24. What deterministic offline ordering should be used?
25. How should deployments enter investigation composition?
26. Should they enter Sprint 017's existing `TIMELINE` now?
27. What is the expected read/request cost at current scale?
28. Does Canon require a change?

Prefer the smallest architecture that preserves truth and lets us learn.

## Modeling Constraints

Do **not** begin by creating:

``` text
Event
EventKind
EventStore
EventProvider
EventRegistry
EventEngine
```

Sprint 019 explicitly deferred that abstraction.

A narrow Vercel deployment evidence model is acceptable if repository
pressure supports it.

### Do not overload Change

`Change` means a provider-independent diff in persisted Resource state
observed by Combie. A deployment is not automatically a Resource field
diff.

### Do not embed history in Resource metadata

Do not store a growing deployment list inside Vercel project metadata.
That would create Resource churn and false Changes.

## Evidence Contract

Every persisted deployment record must answer:

-   which provider supplied it
-   which deployment it represents
-   which exact existing Combie Resource it belongs to
-   provider-native state/status
-   relevant provider-native lifecycle time(s)
-   when Combie observed the evidence, if modeled
-   compact evidence supporting the record

### Identity

Use stable Vercel deployment identity. Repeated sync must not create
duplicates.

### Resource association

Use exact provider-native project identity only:

``` text
deployment project identity
→ Vercel project providerResourceId
→ Combie Resource.id
```

No name, URL, Git repository, fuzzy, or AI matching.

### Time

Keep provider-native time distinct from Combie observation time:

``` text
providerTime ≠ observedAt
```

Do not manufacture a universal `occurredAt` unless the API semantics
truly support one.

Prefer explicit language such as `created at`, `ready at`, and
`observed by Combie at`.

## Deployment State Updates

Pressure-test a lifecycle such as:

``` text
sync 1: deployment D → BUILDING
sync 2: deployment D → READY
```

The same deployment must not become duplicate evidence.

Choose the smallest truthful behavior. Evaluate upserting latest
evidence and preserving useful provider lifecycle timestamps. Do not
build a full deployment transition-history engine unless architecture
pressure proves it necessary.

Document what the minimal choice preserves and what it intentionally
does not.

## Retrieval, Pagination, and Cost

Use the official deployment API verified by Sprint 019/current
documentation.

Requirements:

-   exact project association
-   deterministic pagination
-   no arbitrary first-page-only behavior
-   duplicate protection
-   stable normalization
-   bounded/request-aware behavior

Current Vercel scale is approximately 44 projects. If retrieval is
per-project, record the expected request pressure. If an account/team
deployment listing provides authoritative exact project identity,
compare it against N+1 project requests.

Choose based on correctness first, then request cost and future
incremental potential.

Do not invent cursors, watermarks, or `since` semantics. If the API
offers them, use/preserve them only if they simplify trustworthy
ingestion.

If history is bounded, never imply lifetime-complete deployment history.

## Authority and Failure Semantics

Do not make trustworthy Vercel project discovery brittle merely because
deployment enrichment fails unless architecture pressure justifies it.

Pressure-test:

``` text
auth succeeds
project discovery succeeds
deployment retrieval fails
```

Preserve the distinction between:

``` text
known populated
known empty
unknown / failed refresh
```

Never turn unknown into known-empty.

If stale deployment evidence is retained after failed refresh, document
why.

Do not delete persisted deployments merely because they disappear from a
bounded/retained API response unless the response is authoritative for
deletion.

## Security

Persist compact investigation-relevant metadata only.

Never persist:

-   tokens or authorization headers
-   environment variable values
-   deployment secrets
-   connection strings
-   source file contents
-   full build logs
-   request payloads/private runtime data

Pressure-test URLs and commit metadata before persisting them. Commit
metadata must not be used to infer GitHub relationships or causality.

Existing secret redaction must remain intact.

## Investigation Composition

Deployment evidence must be useful offline.

After successful sync:

``` bash
unset VERCEL_TOKEN
bun run combie investigate <vercel-project-resource-id>
```

must display persisted deployment evidence without network access.

Prefer a separate section:

``` text
DEPLOYMENTS (newest first)
```

showing exact deployment identity, provider-native time(s),
status/state, compact evidence, and Combie observation provenance where
modeled.

Use existing CLI style.

Zero/unknown states must be explicit and distinct.

Pressure-test whether a one-hop related Vercel project should contribute
deployment evidence when another Resource is investigated. Prefer
consistency with the existing one-hop InvestigationContext if achievable
without redesign. Never expand beyond one hop.

## Timeline Interaction

Default expectation:

``` text
existing Change TIMELINE → unchanged
DEPLOYMENTS → separate evidence section
```

Do **not** automatically merge deployments into Sprint 017's timeline.
Deployments introduce a different time model.

Only merge them if Architecture Pressure proves the semantics are
already clean and doing so does not force a premature generic Event
abstraction.

## No Correlation

Existing Relationships connect Resources, not events.

Even if a GitHub repository is `source_for` a Vercel project and both
have evidence near each other in time, do not say:

-   GitHub Change triggered deployment
-   deployment corresponds to Change
-   deployment was caused by commit
-   deployment explains project Change

Temporal proximity is not causality.

## Storage

Use SQLite and existing upgrade conventions.

Require:

-   stable identity
-   exact Resource association
-   idempotent upsert
-   deterministic newest-first reads with stable tie-break
-   safe upgrade for pre-020 databases
-   no secrets
-   no duplicate rows
-   read-only investigation
-   scoped cleanup only when authority is proven

Do not add another datastore.

## Tests

Use Red → Green → Refactor.

Cover at minimum:

### Client/API

-   auth
-   deployment request shape
-   project association
-   pagination
-   empty results
-   malformed responses
-   API errors
-   token redaction
-   timestamp variants
-   stable IDs

### Normalization

-   stable identity
-   exact Resource association
-   compact deterministic evidence
-   provider timestamp preservation
-   optional fields
-   secret exclusion

### Persistence

-   insert/upsert
-   repeated-sync idempotency
-   state/status refresh behavior
-   exact Resource association
-   deterministic ordering/tie-break
-   pre-020 DB upgrade
-   empty vs unknown behavior
-   no destructive cleanup after non-authoritative failure

### Sync

-   Vercel project + deployment success
-   known-empty deployment result
-   deployment retrieval failure
-   successful project discovery preserved
-   multi-provider coexistence
-   existing partial-failure behavior
-   repeated sync no duplicates
-   no false Resource Changes caused by deployment history

### Investigation

-   Vercel subject with deployments
-   zero deployments
-   unknown/unrefreshed evidence
-   deterministic deployment ordering
-   exact provider timestamps
-   Combie observation semantics
-   chosen one-hop neighbor behavior
-   dangling Relationship safety
-   existing Change timeline unchanged unless explicitly justified
-   offline/no-fetch operation
-   database unchanged after repeated reads

### Regression

Preserve all existing providers, resources, relationships, related,
changes, history, context, investigate, timeline, `source_for`,
`uses_domain_in`, partial sync failures, and credential safety.

## Live Verification

If an authorized Vercel credential is available, perform read-only live
verification without exposing or committing it.

Run sync twice and investigate a real Vercel project.

Record:

-   projects discovered
-   deployments discovered/persisted
-   request/pagination count if observable
-   representative non-sensitive states
-   provider timestamp behavior
-   repeated-sync idempotency
-   duplicate count
-   credential-free offline investigation
-   unchanged DB after investigation reads

If no credential is available, explicitly defer live verification. Do
not weaken implementation to force it.

## Explicitly Out of Scope

Do not implement:

-   generic Event platform/registry/engine
-   other providers' events
-   deployment↔commit correlation
-   observations
-   temporal windows
-   causality/root-cause analysis
-   anomaly detection/scoring/confidence
-   AI/LLM/embeddings
-   webhooks/webhook server
-   logs/metrics/traces/continuous telemetry
-   new Relationships
-   `uses_database`
-   recursive traversal
-   MCP/API/SDK/UI
-   controlled execution
-   Sprint 021 scaffolding

## Completion Notes

### Sprint 019 baseline

``` text
b3c1efe8be40fe180064467a10a0e1d56f693cb8
docs(sprint): complete provider event evidence research
```

Working tree at start of implementation had only untracked
`SPRINT-020.md`. Production code was unchanged by Sprint 019.

### Repository Understanding

- **Vercel discovery:** `GET /v9/projects` (paginated via
  `pagination.next` → `until`) then optional per-project domain enrichment
  via `GET /v9/projects/{id}/domains`. Domain failure omits `domains`
  (unknown); success with zero custom domains sets `domains: []` (known
  empty).
- **Exact Vercel project identity:**
  `Resource.id = vercel:project:<project.id>` with
  `providerResourceId = project.id` (not name).
- **Sprint 019 selected contract:** `GET /v7/deployments`, identity
  `uid`, join `projectId === providerResourceId`, times `created` /
  optional `buildingAt` / optional `ready`.
- **Where retrieval fits:** Provider contract remains auth +
  `discoverResources` only. Deployment retrieval runs in sync after
  successful Vercel Resource apply (`syncVercelDeployments`), not inside
  Resource metadata and not by widening the Provider interface.
- **Reusable patterns:** Vercel `until` pagination; domain
  known-empty vs unknown authority; optional enrichment failure isolation;
  relationship-style natural-key upsert; idempotent
  `CREATE TABLE IF NOT EXISTS` schema upgrade; offline investigate
  composition.
- **Architecture pressure:** historical provider-native evidence is not a
  Resource field diff and must not live in Resource metadata (would churn
  Changes). No non-Resource historical evidence store existed before this
  Sprint.

### Architecture Pressure (answers)

1. **Endpoint:** official `GET /v7/deployments` (verified
   vercel.com/docs/rest-api/deployments/list-deployments; not `/v6`).
2. **Exact project association:** yes — `projectId` query filter plus
   response field `projectId`.
3. **Stable identity:** deployment `uid`.
4. **Provider timestamps:** `created` (deployment created), optional
   `buildingAt` (build started), optional `ready` (became ready). Sibling
   `createdAt` accepted when `created` absent. `deleted` / retention
   fields exist but are not primary lifecycle ordering.
5. **Primary ordering time:** `created` (required for list items;
   truthful creation chronology). Not a synthetic generic `occurredAt`.
6. **Compact retained times:** `created` / `buildingAt` / `ready` as
   epoch ms on the durable row.
7. **Join:**
   `deployment.projectId → providerResourceId → vercel:project:<id>`.
   Reject mismatches. No name/URL/git/AI matching.
8. **Fit without Provider redesign:** yes — Vercel client method +
   post-discover sync helper + store tables.
9. **Provider contract change:** not justified.
10. **Smallest durable representation:** Vercel-specific tables
    `vercel_deployments` + `vercel_deployment_refresh` (not Event*).
11. **Generic Event earned?** No (see learnings).
12. **Extending Change:** rejected — would distort Resource-diff
    semantics.
13. **Resource metadata history:** rejected — false Change churn.
14. **Narrow deployment model:** chosen as the learning step.
15. **`observedAt`:** Combie sync observation/upsert time (ISO),
    independent of provider lifecycle times.
16. **Dedup:** `PRIMARY KEY (uid)` + upsert.
17. **State updates:** upsert refreshes readyState/state/lifecycle times
    and Combie `observedAt`. No transition-history engine.
18. **Record shape:** latest evidence per uid (mutable latest state +
    preserved provider lifecycle timestamps). Does **not** store full
    BUILDING→READY transition logs.
19. **Pagination:** walk `pagination.next` with `until`; cap 100 pages;
    `limit=100`; `projectId` filter.
20. **Incremental:** API offers `since`/`until` filters; **not**
    invented into a checkpoint engine this Sprint. Full per-project walk
    each sync is acceptable at current scale.
21–22. **Failure:** deployment failure marks refresh failure, retains
    prior rows, does **not** fail Vercel project discovery or overall
    Vercel resource sync success.
23. **Never persist:** tokens, Authorization, env values, secrets,
    connection strings, source contents, build logs, creator/email, meta
    commit payloads, URLs/aliases/inspectorUrl, request payloads.
24. **Ordering:** `created_at_ms DESC, uid DESC`.
25. **Investigation:** subject + one-hop Vercel neighbors get
    `DEPLOYMENTS (newest first)`; offline store reads only.
26. **TIMELINE:** remains Change-only. Deployments stay separate.
27. **Request cost:** ~1 deployment list stream per project (plus
    pagination). At ~44 projects, ~44 first-page requests (same N family
    as existing domain enrichment). Correctness and per-project authority
    preferred over owner-batch for failure isolation.
28. **Canon change:** none required.

### Vercel API Evidence Contract

``` text
GET https://api.vercel.com/v7/deployments?projectId=<id>&limit=100
  + &until=<pagination.next> for subsequent pages
Authorization: Bearer <token>
```

Persisted allowlist: `uid`, `projectId`/`resourceId`, `readyState`,
`state`, `target`, `source`, `created`/`buildingAt`/`ready` as ms,
Combie `observedAt`.

### Durable Representation

- Table `vercel_deployments` keyed by `uid`.
- Table `vercel_deployment_refresh` keyed by `resource_id` with
  `success|failure` + `observedAt` + safe message.
- Module types live under `src/providers/vercel/deployment.ts` — explicitly
  Vercel-specific, not `Event` / `EventStore` / `EventEngine`.

**Why not generalized:** one provider, one evidence family, distinct
timestamp vocabulary and retention semantics. Sprint 019 deferred Event;
implementation pressure did not force a universal abstraction.

**Preserves:** latest status/state, provider lifecycle timestamps, exact
Resource association, Combie observation time, refresh authority.

**Intentionally does not:** transition history, complete lifetime history
claims, deletion of rows when absent from a list page, correlation to
commits/Changes, generic event taxonomy.

### Time Semantics

| Field | Meaning |
| --- | --- |
| `created at` | Vercel deployment creation time (`created` / `createdAt`) |
| `building at` | Vercel build-start time when present |
| `ready at` | Vercel ready time when present |
| `observed by Combie at` | Combie sync observation/upsert time |

`PROVIDER TIME ≠ COMBIE OBSERVATION TIME`.

### Authority

| State | Meaning |
| --- | --- |
| populated | last refresh success and ≥1 persisted row |
| empty | last refresh success and 0 persisted rows |
| unknown | never refreshed or last refresh failed (may show stale rows) |
| not_applicable | non-Vercel-project subject/neighbor |

Retention: Vercel deployment retention is plan/policy dependent. Combie
never claims complete lifetime history. List absence is **not** deletion
authority; rows are not destructively cleaned on non-authoritative failure
or empty subsequent pages that do not prove deletion.

### Sync behavior

After Vercel Resources are applied, `syncVercelDeployments` runs per
project. Project discovery success is independent of deployment
enrichment. Multi-provider partial failure behavior unchanged.

### Storage / upgrade / idempotency

- Additive `CREATE TABLE IF NOT EXISTS` in `Store` schema (pre-020 DBs
  open safely via `init` / `isInitialized`).
- Upsert by `uid`; repeated sync yields one row per deployment.
- Zero false Resource Changes from deployment ingestion.

### Security exclusions

Allowlist-only projection. Creator, meta/git commit material, env,
URLs, logs, and secrets are dropped at normalize time. Existing Vercel
token redaction remains intact.

### Investigation composition

`InvestigationContext.subjectDeployments` + per-neighbor `deployments`.
CLI section `DEPLOYMENTS (newest first)` with precise time wording.
One-hop only. `combie context` unchanged.

### Offline proof

Investigate path performs store reads only (no provider client). Tests
force-fail `fetch` and hash the DB before/after repeated reads.

### Timeline decision

**Separation.** `TIMELINE` remains Sprint 017 Change chronology.
Deployments are a separate provider-evidence section. Merging would force
a premature multi-time-model Event abstraction.

### Validation

- Focused Sprint 020 tests: client, normalize, store, sync, investigate.
- Full suite: **437 pass, 0 fail**.
- `bun run typecheck`: clean.
- Secret scan: no live credentials; test fixtures use non-secret tokens.
- Diff review: Vercel-only evidence path; no Event platform; no Sprint
  021 scaffolding.

### Live verification

**Explicitly deferred.** `VERCEL_TOKEN` was not set in the implementation
environment. Correctness is covered by fixtures and offline tests. Do not
weaken implementation to force a live run.

### Deviations

- Used **per-project** `projectId` retrieval (not owner-batched
  `projectIds` up to 20) for clearer failure isolation and known-empty
  authority at current ~44 project scale. Cost is same N-family as domain
  enrichment.
- Did not implement `since`/`until` incremental watermarks or nonterminal
  refresh-only polling — full list walk each successful Vercel sync is
  sufficient for this learning Sprint.

### Learnings

1. **Did implementing Vercel deployments reveal a stable provider-evidence
   shape that could plausibly generalize to another provider?**

   Partially. A useful envelope appears:

   ``` text
   provider + stable native id + exact Resource association
   + provider-native state + provider lifecycle time(s)
   + Combie observedAt + compact allowlisted evidence
   + refresh authority (populated/empty/unknown)
   ```

   But timestamp names, mutability (latest state vs immutable occurrence),
   pagination, and retention still look provider-specific. The shape is a
   candidate, not a proven universal type.

2. **Has a generic Event primitive now been earned?**

   **No.** Combie should implement at least one more provider-native
   evidence source (Sprint 019 ranked Neon operations or GitHub workflow
   runs next) before naming `Event`. One provider is insufficient to fix
   vocabulary, cardinality, and retention contracts.

### Canon changes

None. `VISION.md`, `ARCHITECTURE.md`, `ROADMAP.md`, and
`skills/build-combie/SKILL.md` remain accurate without edits.

## Definition of Done

-   [x] Sprint 019 committed; exact baseline recorded
-   [x] SKILL protocol followed
-   [x] Canon and Sprint 019 notes read
-   [x] Repository Understanding report
-   [x] Architecture Pressure report
-   [x] official Vercel deployment API verified
-   [x] stable deployment identity
-   [x] exact Vercel project Resource join
-   [x] provider timestamp semantics documented
-   [x] provider time distinct from Combie observation time
-   [x] generic Event abstraction not assumed
-   [x] Change not overloaded
-   [x] deployment history not embedded in Resource metadata
-   [x] smallest durable representation implemented
-   [x] SQLite upgrade safe
-   [x] pagination correct
-   [x] request cost reviewed
-   [x] populated / empty / unknown authority modeled
-   [x] retention/deletion authority documented
-   [x] sensitive fields excluded
-   [x] repeated sync idempotent
-   [x] no duplicate deployment evidence
-   [x] no false Resource Changes
-   [x] offline reads work
-   [x] `combie investigate` exposes deployments
-   [x] provider-time wording accurate
-   [x] one-hop boundary preserved
-   [x] existing Change timeline semantics preserved
-   [x] no correlation/causality
-   [x] no new provider or telemetry
-   [x] focused tests pass
-   [x] full suite passes
-   [x] typecheck passes
-   [x] secret scan clean
-   [x] complete diff review
-   [x] live verification complete or deferred explicitly
-   [x] completion notes updated
-   [x] Canon accurate
-   [x] commit created
-   [x] worktree clean
-   [x] Sprint 021 not started

## What Sprint 020 Proves

Before:

``` text
Vercel project
├── Resource state
└── Combie-observed Resource Changes
```

After:

``` text
Vercel project
├── Resource state
├── Combie-observed Resource Changes
└── Vercel-native deployment evidence
    ├── stable deployment identity
    ├── provider-native lifecycle time
    ├── exact project association
    └── Combie observation provenance
```

Combie gains stronger evidence, not stronger opinions.

## Final Principle

> **Learn the shape of real provider evidence before naming the
> universal abstraction.**

Implement Vercel deployments faithfully.

Keep provider time separate from observer time.

Bind evidence exactly.

Persist only what helps.

Do not infer.

Do not generalize early.

Then stop.
