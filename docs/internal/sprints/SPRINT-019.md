# SPRINT-019 --- Provider-Native Event Evidence Investigation

> **Status:** Complete **Depends on:** SPRINT-018 (`9d87c6b`)
> **Baseline:** `9d87c6b` **Phase:** Investigation foundation / evidence
> enrichment **Type:** Provider evidence + architecture investigation
> **Primary goal:** Determine the smallest provider-native event
> evidence Combie can ingest read-only with authoritative provider time,
> stable Resource association, useful operational semantics, and
> acceptable cost/security **Production code:** No changes expected
> **New durable model:** None **New persistence:** None **AI / LLM:**
> None

------------------------------------------------------------------------

## Goal

Sprint 018 established an important limit in Combie's current evidence:

``` text
Change.observedAt
```

means:

``` text
when Combie observed a Resource diff during sync
```

not:

``` text
when the underlying provider event actually occurred
```

That makes the existing Change model trustworthy for:

``` text
current state diffs
history of what Combie observed
deterministic observation ordering
```

but weak for:

``` text
real-world chronology
temporal investigation
correlation
causal reasoning
```

Sprint 019 investigates the smallest next evidence primitive.

The central question is:

> **Which provider-native events can Combie obtain from its existing
> providers that carry authoritative provider timestamps, bind
> deterministically to existing Resources, provide materially richer
> investigation context than metadata diffs, and remain read-only,
> secure, and operationally reasonable?**

This Sprint does **not** implement event ingestion.

It discovers and ranks the evidence.

------------------------------------------------------------------------

## Why Now

Combie currently has:

``` text
Providers
   ↓
Resources
   ↓
Relationships
   ↓
Changes
   ↓
History / Context
   ↓
InvestigationContext
   ↓
Investigation Timeline
```

Sprint 018 proved that the next useful investigation layer cannot safely
be built by adding more interpretation over weak timestamps.

We need better evidence before better reasoning.

A likely future shape may resemble:

``` text
Provider
   │
   ├── Resource
   │
   ├── Resource Change
   │      └── observedAt
   │
   └── Provider-native Event ???
          ├── provider timestamp
          ├── observedAt
          ├── Resource association
          ├── semantic kind
          └── provider evidence
```

But `Event` is only a hypothesis.

Sprint 019 must determine whether a new primitive is actually warranted.

------------------------------------------------------------------------

## Core Principle

> **Improve evidence before improving interpretation.**

Do not compensate for weak evidence with:

``` text
heuristics
time windows
confidence scores
AI
correlation rules
provider-specific guesses
```

Find stronger facts first.

------------------------------------------------------------------------

## What Counts as Provider-Native Event Evidence

For this Sprint, a candidate event is a provider-exposed occurrence with
some or all of:

1.  provider-assigned identity
2.  provider-native timestamp
3.  explicit semantic meaning
4.  deterministic association to an existing Combie Resource
5.  read-only retrieval
6.  repeatable pagination/cursor semantics

Examples to investigate may include:

``` text
GitHub
- push / commit activity
- pull request merge
- release
- deployment / deployment status
- workflow run

Vercel
- deployment created
- deployment ready
- deployment failed/canceled
- project deployment history

Cloudflare
- Worker deployment/version history
- deployment/version metadata
- relevant audit/activity evidence if available and appropriately scoped

Sentry
- release
- issue/event occurrence
- deployment
- project operational event evidence

Neon
- branch creation/update lifecycle
- operation history
- project/branch events if exposed

PlanetScale
- deployment requests
- branch lifecycle
- schema/deployment activity
- audit/activity evidence if exposed
```

These are candidate families, not requirements.

Use current official provider documentation/API specifications and the
existing adapters to determine what actually exists.

Do not invent APIs.

------------------------------------------------------------------------

## Candidate Quality Dimensions

Evaluate every candidate across the same dimensions.

### 1. Provider-native time

Best:

``` text
occurredAt / createdAt / completedAt / updatedAt
```

where the provider defines the timestamp as part of the event/resource
lifecycle.

Distinguish:

``` text
event occurred time
event created time
event updated time
Combie observed time
```

Do not collapse them.

### 2. Stable identity

Prefer provider-native immutable IDs.

Avoid:

``` text
display name
URL text
timestamp-only identity
fuzzy composite identity
```

Determine whether repeated ingestion can deduplicate deterministically.

### 3. Stable Resource association

Best:

``` text
provider event contains exact project/repository/worker/database/resource ID
```

Acceptable only with strong deterministic evidence:

``` text
provider event → exact provider-native parent → existing Resource.providerResourceId
```

Reject:

``` text
name-only matching
URL guessing
fuzzy matching
AI matching
secret inspection
```

### 4. Semantic usefulness

Ask whether the event helps answer an investigation question better than
current Resource metadata diffs.

Examples:

``` text
deployment created
deployment ready
deployment failed
release published
workflow failed
branch created
schema deployment completed
```

may be more useful than:

``` text
metadata.foo changed
```

### 5. Read-only accessibility

Determine:

``` text
endpoint
required permission/scope
personal token support
service token support
organization/team requirements
```

Prefer evidence available with the read-oriented credentials Combie
already expects.

### 6. Pagination / bounded cost

Determine:

``` text
pagination model
default page size
maximum page size
retention
rate limits
number of requests per Resource
whether list-by-parent is possible
whether incremental reads are possible
```

Avoid choosing an evidence source that requires unbounded N+1 polling
across every Resource unless the value clearly justifies it.

### 7. Incremental sync potential

Investigate whether future ingestion could use:

``` text
cursor
since timestamp
event ID watermark
updatedSince
pagination checkpoint
```

Do not implement checkpoints.

Just determine whether an efficient future sync is possible.

### 8. Security / privacy

Determine whether the evidence includes:

``` text
secrets
environment values
connection strings
source contents
PII
request payloads
stack traces
user-generated content
```

Prefer compact metadata.

Document what must be excluded/redacted if implemented.

### 9. Retention / completeness

Determine whether the provider API exposes:

``` text
complete history
bounded recent history
audit retention only
current deployments only
plan-dependent history
```

Combie must not imply completeness when the provider does not guarantee
it.

------------------------------------------------------------------------

## Provider Scope

Investigate the six existing providers:

``` text
Cloudflare
GitHub
Vercel
Sentry
Neon
PlanetScale
```

Do not add providers.

The purpose is to enrich the provider set Combie already understands.

------------------------------------------------------------------------

## Research Order

Start with the existing provider adapters and current API usage.

Then use official provider documentation/API specs to investigate
candidate event evidence.

Prefer official sources.

For each provider, answer:

``` text
What event-like/lifecycle evidence exists?
What exact endpoint exposes it?
What timestamp fields exist?
What do those timestamps mean?
What stable ID exists?
What parent/resource ID exists?
What scopes are required?
How is it paginated?
What is retained?
What potentially sensitive fields appear?
How expensive would sync be?
```

If official documentation is ambiguous, record the ambiguity.

Do not fill gaps with assumptions.

------------------------------------------------------------------------

## Provider Evidence Matrix

Produce a matrix containing at least:

  -----------------------------------------------------------------------------------------------------------------------------------------------------------
  Provider   Candidate   Endpoint/API   Stable   Provider-native   Exact      Semantics   Read    Pagination   Incremental   Sensitive   Expected   Verdict
                                        event ID time              Resource               scope                potential     payload     request
                                                                   binding                                                   risk        cost
  ---------- ----------- -------------- -------- ----------------- ---------- ----------- ------- ------------ ------------- ----------- ---------- ---------

  -----------------------------------------------------------------------------------------------------------------------------------------------------------

Include multiple candidates per provider where useful.

Do not force every provider to have a winning candidate.

------------------------------------------------------------------------

## Evidence Classification

Classify each candidate:

### A --- Strong first-class event evidence

Has:

``` text
stable provider identity
clear provider-native time
deterministic Resource binding
useful semantics
reasonable read-only retrieval
manageable payload/security
```

Strong candidate for first implementation.

### B --- Useful but needs explicit enrichment or product semantics

Evidence is real but requires:

``` text
additional parent lookup
scope decisions
retention caveat
higher request cost
careful event-kind semantics
```

May be implementable later.

### C --- Weak / ambiguous evidence

Examples:

``` text
name-only binding
unclear timestamp semantics
current-state object masquerading as history
unbounded polling
weak operational meaning
```

Do not prioritize.

### D --- Reject

Requires or depends on:

``` text
secrets
environment inspection
fuzzy matching
write access
AI inference
unsafe payload ingestion
unsupported/private APIs
```

------------------------------------------------------------------------

## Event Primitive Pressure Test

Do not assume the future model is named `Event`.

Evaluate whether the winning evidence fits:

### Option A --- Extend Change

Could provider-native lifecycle evidence be represented as richer
Changes?

Pressure-test carefully.

A deployment creation is not necessarily a Resource field diff.

Do not overload Change merely to avoid a new type.

### Option B --- New Event primitive

Conceptually:

``` text
Event
├── id
├── provider
├── kind
├── providerEventId
├── resourceId
├── occurredAt / providerTime
├── observedAt
└── evidence
```

This is only conceptual.

Determine whether a distinct primitive is justified.

### Option C --- Provider evidence attached to existing Resources

Could compact event history remain Resource metadata?

Pressure-test persistence growth, semantics, history, and diff behavior.

Expected to be weak for historical evidence, but investigate rather than
assume.

### Option D --- No generic primitive yet

If providers expose incompatible evidence shapes, the correct answer may
be to implement one provider-specific enrichment first and learn before
generalizing.

This is allowed.

------------------------------------------------------------------------

## Time Model Pressure Test

If provider-native events are eventually added, Combie may need to
distinguish:

``` text
providerTime
observedAt
```

Potential provider-time meanings include:

``` text
createdAt
startedAt
readyAt
completedAt
failedAt
updatedAt
publishedAt
```

Do not prematurely force all provider timestamps into `occurredAt`.

Determine whether:

1.  one canonical provider event timestamp is defensible
2.  an event may need multiple provider timestamps
3.  provider-native timestamp name/value should remain in evidence
4.  a normalized primary time can coexist with raw evidence

The Sprint should recommend the smallest truthful model.

------------------------------------------------------------------------

## Resource Association Pressure Test

For every A/B candidate, prove the join path.

Examples:

``` text
Vercel deployment.projectId
→ vercel:project:<projectId>
```

or:

``` text
GitHub workflow_run.repository.id
→ github:repository:<repoId>
```

These are illustrative.

Use actual API evidence.

Document:

``` text
event field
existing Resource.providerResourceId
normalization
identity stability
failure behavior
```

No fuzzy joins.

------------------------------------------------------------------------

## Relationship Interaction

Do not infer new Relationships from events in Sprint 019.

But evaluate whether event evidence could later enrich an investigation
across existing Relationships.

Example:

``` text
GitHub repository
    source_for
Vercel project

GitHub event
Vercel deployment event
```

The Relationship establishes Resource structure.

The events establish facts about each Resource.

Do not conclude the events are correlated.

------------------------------------------------------------------------

## Investigation Value

For each top candidate, show how it would improve an existing
investigation.

Example format:

``` text
Current evidence:
Vercel project metadata changed during sync.

With candidate:
Vercel deployment dep_123
status: READY
provider time: 2026-08-09T...
project: prj_...
```

Then state what Combie could truthfully say.

Do not add causal interpretation.

------------------------------------------------------------------------

## Logs / Metrics / Traces Boundary

Sprint 019 is **not** the telemetry Sprint.

Do not investigate broad ingestion architectures for:

``` text
logs
metrics
traces
continuous observability streams
```

Provider-native lifecycle/event evidence is the bridge being tested
first because it is:

``` text
smaller
more structured
more semantically explicit
more naturally tied to Resources
```

If a provider candidate is essentially a high-volume telemetry stream,
mark it as deferred rather than designing ingestion.

Sentry requires special care here: distinguish compact
issue/release/deployment metadata from raw event payload or stack-trace
ingestion.

------------------------------------------------------------------------

## Webhooks / Push Boundary

Do not implement webhooks.

Investigate whether candidates are retrievable by read-only polling/API.

You may note webhook availability as future evidence, but it must not be
required for the first implementation recommendation unless no safe read
path exists.

Do not design a webhook server.

------------------------------------------------------------------------

## Retention and Authority

For each candidate, document what Combie could truthfully claim.

Examples:

Safe:

``` text
Provider reports deployment D was created at T.
Combie observed deployment D at O.
```

Potentially unsafe:

``` text
This is the complete deployment history.
```

unless the provider guarantees the queried retention/history.

Distinguish:

``` text
provider authority
Combie observation
API retention
Combie persistence
```

------------------------------------------------------------------------

## Repository Understanding Report

Before external research conclusions, inspect baseline `9d87c6b`.

At minimum inspect:

-   provider contract
-   provider registry
-   Cloudflare adapter/client/normalize
-   GitHub adapter/client/normalize
-   Vercel adapter/client/normalize
-   Sentry adapter/client/normalize
-   Neon adapter/client/normalize
-   PlanetScale adapter/client/normalize
-   Resource model
-   Change model
-   Relationship model
-   sync orchestration
-   credentials architecture
-   SQLite schema/store
-   InvestigationContext
-   Timeline
-   Sprint 018 completion notes
-   Canon

Report:

``` text
what provider identity is already persisted
what Resource IDs are available for joins
what credential scopes are currently expected
what adapter patterns are reusable
what storage primitives exist
where an event primitive would pressure architecture
```

No production code before this report.

------------------------------------------------------------------------

## Architecture Pressure Report

Answer:

1.  Does Combie actually need richer provider-native evidence before
    observations?
2.  Which existing provider offers the strongest first candidate?
3.  Which provider offers the weakest/no candidate?
4.  Are provider-native event timestamps materially stronger than
    Change.observedAt?
5.  What does each candidate timestamp actually mean?
6.  Can each candidate bind exactly to an existing Resource?
7.  Can repeated ingestion deduplicate deterministically?
8.  Is the evidence compact enough to persist safely?
9.  Does the API expose sensitive payloads that should be excluded?
10. What scopes are required?
11. Can retrieval remain read-only?
12. What is the pagination model?
13. What is the likely request cost at current Combie scale?
14. Can future sync be incremental?
15. What retention/completeness caveats exist?
16. Does a generic Event primitive appear justified?
17. Could Change be extended instead without semantic distortion?
18. Would Resource metadata be an inappropriate historical store?
19. Should Combie implement one provider first before generalizing?
20. Which exact candidate should be implemented first?
21. What is the smallest truthful time model?
22. Does anything require Canon changes?

------------------------------------------------------------------------

## Candidate Ranking

Rank the strongest candidates across all providers.

At minimum provide:

``` text
Rank
Provider
Candidate
Why useful
Provider-time quality
Resource-binding quality
Read/access quality
Request cost
Security risk
Architecture pressure
Recommendation
```

A candidate may rank highly even if it is not from Vercel.

Do not predetermine the winner.

------------------------------------------------------------------------

## Expected Hypotheses to Test

These are hypotheses, not decisions:

### Vercel deployments may be strong because:

``` text
project association
deployment identity
lifecycle semantics
provider timestamps
startup-stack relevance
```

### GitHub workflow/deployment/release evidence may be strong because:

``` text
repository association
stable IDs
rich timestamps
clear source-side activity
```

### Sentry releases/deployments may be useful because:

``` text
operational semantics
release association
timestamps
```

but may have weaker direct binding depending on available
projects/resources.

### Cloudflare may expose useful deployment/version history

but exact availability and binding must be verified.

### Neon / PlanetScale may expose lifecycle or operation history

but may be more control-plane than investigation-rich.

Validate or reject these with evidence.

------------------------------------------------------------------------

## Production Code

Expected production diff:

``` text
None
```

Allowed changes:

``` text
docs/internal/sprints/SPRINT-019.md
```

and repository-approved research artifacts if needed.

Do not modify:

``` text
src/
tests/
SQLite schema
CLI
domain models
provider adapters
sync
credentials
InvestigationContext
Timeline
```

If a serious correctness/security bug is found, stop and report it
rather than silently expanding Sprint scope.

------------------------------------------------------------------------

## Validation

Run:

``` bash
bun test
bun run typecheck
```

Confirm:

-   400+ baseline tests remain green
-   zero production/test changes
-   no credentials or secrets committed
-   official-source URLs/evidence recorded in Sprint notes
-   diff limited to research/docs
-   worktree clean after commit
-   Sprint 020 not started

------------------------------------------------------------------------

## Required Final Recommendation

End Sprint 019 with **exactly one** recommendation:

### A --- Implement one provider-native event source next

Choose when one candidate clearly wins.

Specify:

``` text
provider
endpoint
event family
stable identity
Resource join
provider timestamp semantics
minimal persisted shape
pagination
incremental strategy
security exclusions
CLI/investigation impact
```

Do not implement it in Sprint 019.

### B --- Define the generic Event primitive before provider implementation

Choose only if multiple strong candidates clearly share a stable
cross-provider shape and implementing one without the primitive would
create obvious rework.

Specify the smallest model.

Do not implement it.

### C --- Perform targeted provider enrichment first

Choose if a promising event source lacks one exact Resource-binding fact
or scope fact that should be added/verified before event ingestion.

Specify the smallest enrichment.

### D --- Defer provider-native events

Choose if current APIs do not provide sufficiently strong, accessible,
or useful event evidence.

State what evidence capability should come next instead.

Only one recommendation.

Do not define Sprint 020.

------------------------------------------------------------------------

## Success

Sprint 019 succeeds if it tells us exactly what richer evidence Combie
should ingest next --- or proves that it should not.

Success may be:

``` text
A: one event source clearly wins
B: generic Event primitive is already earned
C: one targeted enrichment must come first
D: event evidence is not viable yet
```

No code is required.

------------------------------------------------------------------------

## Explicitly Out of Scope

Do not implement:

-   Event domain model
-   Event table/store
-   event ingestion
-   event sync/checkpoints
-   event CLI
-   Observation model
-   observations
-   time windows
-   correlation
-   causality
-   root-cause analysis
-   anomaly detection
-   scoring/confidence
-   AI/LLM
-   webhooks
-   webhook server
-   logs
-   metrics
-   traces
-   high-volume telemetry
-   new providers
-   new Relationships
-   `uses_database`
-   source-code ingestion
-   environment-variable ingestion
-   secret ingestion
-   MCP/API/SDK/UI
-   execution
-   Sprint 020 scaffolding

------------------------------------------------------------------------

## Anti-Overengineering

Do not create:

``` text
EventEngine
EventBus
EventRegistry
EventStore
EventKind taxonomy
TemporalDatabase
CorrelationEngine
TelemetryPipeline
WebhookGateway
```

Sprint 019 is:

``` text
inspect
research
verify
compare
rank
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

Change Canon only if Sprint 019 proves an existing permanent statement
materially inaccurate.

------------------------------------------------------------------------

## Completion Notes

### Implemented

Completed the six-provider evidence investigation, repository and architecture
pressure reports, provider evidence matrix, cross-provider ranking, security
and retention review, investigation-value examples, and one final
recommendation. This Sprint intentionally changes documentation only. It
adds no production code, tests, persistence, provider adapter, CLI surface,
generic Event model, webhook, or telemetry ingestion.

### Deviations

No scope deviation. Production implementation was explicitly prohibited and
was not started. The worktree is not literally clean because no commit was
authorized; the only worktree entry is this intended Sprint document, which
was already untracked at baseline and now contains the completed research.

### Validation

- `bun test`: 400 passed, 0 failed, 1632 assertions across 32 files.
- `bun run typecheck`: passed (`tsc --noEmit`).
- Production and test diff: empty.
- Provider adapter diff: empty.
- Credential-pattern scan of this Sprint document: clean.
- Scope review: documentation/research only; Sprint 020 not started.
- Repository state: only `docs/internal/sprints/SPRINT-019.md` is untracked;
  no commit was created without authorization.

### Repository Understanding

Baseline `9d87c6b` was inspected before provider research. The baseline
matches the Sprint 018 dependency exactly.

The provider contract is deliberately small: authenticate and discover
Resources. The registry contains exactly Cloudflare, GitHub, Vercel,
Sentry, Neon, and PlanetScale. Existing clients already provide useful
patterns for a later implementation: typed read-only HTTP calls, bounded
pagination, provider-context errors, credential redaction, and optional
enrichment that preserves unknown data rather than guessing.

Persisted provider identity is sufficient for exact joins in the strongest
candidates:

| Provider Resource | Persisted `providerResourceId` | Relevant exact join |
| --- | --- | --- |
| Cloudflare Worker | Worker script `id` (the script name) | deployment/version endpoint parent `script_name` |
| Cloudflare D1 | database `uuid` | no strong first candidate found |
| Cloudflare KV | namespace `id` | no strong first candidate found |
| Cloudflare zone | zone `id` | Audit Log `zone.id`/resource ID only when exact equality is present |
| GitHub repository | numeric repository `id` as text | workflow `repository.id`; release/deployment endpoint parent |
| Vercel project | project `id` | deployment `projectId` |
| Sentry project | numeric project `id` as text | release `projects[].id` or exact project endpoint parent |
| Neon project | project `id` | operation `project_id` |
| PlanetScale database | database `id` | deploy-request request context from the exact database Resource |

Cloudflare Worker identity has an important limitation: Combie persists the
script name, while Cloudflare also exposes a separate immutable Worker
`tag`. The deployment path join is exact for the current name, but it is not
an immutable Worker identity claim.

Credentials remain separate from the domain database in a mode-`0600`
file. Existing connections store only the credentials explicitly authorized
by each provider's connect flow. Successful connection proves current
discovery access, not every candidate's additional fine-grained read scope.
No provider adapter currently records capability scopes.

The SQLite domain store contains Providers, Resources, Relationships,
Changes, and Change baselines. `Change` has strict Resource-diff semantics:
`kind: updated`, field-level before/after values, and the sync pass's
`observedAt`. `InvestigationContext` and Timeline are ephemeral read models.
There is no event store, event model, webhook surface, or telemetry store.

Provider-native lifecycle evidence pressures the architecture because it is
neither current Resource state nor a Combie-observed field diff. It must not
be placed in Resource metadata or silently relabeled as `Change`.

### Architecture Pressure

1. **Richer evidence is needed before richer observations.** Sprint 018's
   `Change.observedAt` is trustworthy observation time but cannot establish
   when a provider lifecycle fact occurred.
2. **Vercel is the strongest first provider.** Deployment history combines
   stable identity, exact project binding, explicit creation/build/ready
   times, server-side project filtering, and time-window pagination.
3. **Sentry is the weakest safe first-provider candidate.** Releases and
   deploys are useful but releases may span projects, deploy retrieval is
   N+1 with an under-documented response, and error events cross the raw
   telemetry/privacy boundary. This does not mean Sentry has no evidence.
4. **Provider times are materially stronger than `Change.observedAt`.** They
   are assigned inside the provider lifecycle; `observedAt` remains the time
   Combie first or most recently read the record.
5. **Timestamp meaning is candidate-specific.** Creation, build start,
   readiness, publication, action, merge, record update, and Combie
   observation are not interchangeable. Exact meanings are recorded below.
6. **Every A candidate has an exact join.** It is either a response-native ID
   equal to `Resource.providerResourceId`, or a request issued through the
   exact stored parent Resource. Request-context joins are labeled as such.
7. **Repeated ingestion can deduplicate by provider ID.** Mutable lifecycle
   records must be upserted and nonterminal records revisited; timestamp-only
   identity is never used.
8. **The winning evidence is compact only with an allowlist.** Deployment
   identity, project identity, state, target, named times, and observation
   time are sufficient.
9. **All providers expose fields that must be excluded.** Examples include
   actors, email/IP data, commit messages, arbitrary metadata/payloads,
   environment material, URLs, DDL, request data, logs, stack traces, and
   source contents.
10. **Scopes vary.** Vercel uses the bearer token in the correct account/team
    context; GitHub fine-grained tokens need candidate-specific read scopes;
    Cloudflare Worker history uses Worker read permission while Audit Logs
    needs Account Settings Read; Neon uses the existing API key;
    PlanetScale deploy requests need `read_deploy_request`; Sentry accepts
    documented project/release read scopes.
11. **Retrieval can remain read-only.** Every retained candidate has a GET
    polling path. Webhooks are not required.
12. **Pagination is provider-specific.** It includes timestamp page markers,
    cursors, page/per-page, or bounded newest-first lists. Cloudflare Worker
    deployments document no pagination controls.
13. **Current-scale cost favors Vercel.** Up to 20 project IDs can be filtered
    per owner context. Neon, Cloudflare Worker, and PlanetScale candidates are
    at least one request per Resource; Sentry deploys and GitHub deployment
    statuses add N+1 enrichment.
14. **Incremental reads are strongest for Vercel deployments, GitHub workflow
    runs, Cloudflare Audit Logs, and Neon cursors.** Every implementation still
    needs overlap plus stable-ID deduplication, and mutable nonterminal records
    need refresh.
15. **No candidate permits a universal completeness claim.** Retention may be
    provider-, plan-, account-, or user-action-dependent; several APIs publish
    no history guarantee at all.
16. **A distinct occurrence/evidence concept is justified, but a generic
    durable `Event` primitive is not yet earned.** Shapes and time meanings
    differ too much.
17. **Extending `Change` would cause semantic distortion.** A deployment or
    release is not necessarily a Resource field transition observed by
    Combie.
18. **Resource metadata is an inappropriate historical store.** It would grow
    without bound, generate misleading metadata diffs, obscure identity, and
    make retention/query behavior accidental.
19. **Combie should learn from one provider first.** A provider-specific
    Vercel deployment record can validate polling, deduplication, lifecycle
    refresh, time vocabulary, and investigation presentation before a shared
    abstraction is frozen.
20. **The first exact candidate should be Vercel project deployment history.**
21. **The smallest truthful time model keeps named provider times and a
    separate `observedAt`.** For Vercel: `created`, optional `buildingAt`, and
    optional `ready`; do not synthesize completion/failure time from an update.
22. **No Canon change is required.** The research confirms the existing
    evidence-first and anti-speculation boundaries.

### Provider Evidence Research

Research used current official API/reference documentation and compared it
with the six existing adapters. Important ambiguities are retained below.

**Cloudflare.** Worker deployments are the best direct candidate: a stable
deployment UUID, `created_on`, source/strategy, and served version IDs are
available through the exact account and Worker script-name parent. The same
Worker read permission accepted by discovery can read them. The endpoint
documents neither pagination nor retention, so it cannot prove complete
history. Worker versions have stable UUIDs and creation times but prove an
upload/configuration version, not traffic change. Audit Logs v2 has strong
IDs, `action.time`, cursors, filters, and 18-month retention, but requires
Account Settings Read, carries actor/request risk, and does not document an
exact Worker/D1/KV `resource.id` representation for current Combie IDs.

**GitHub.** Workflow runs are the strongest GitHub candidate: stable run ID,
exact numeric repository ID, creation/start times, current status/conclusion,
`created` filtering, and Actions Read. There is no documented completion
timestamp; `updated_at` must not be called failure/completion time, and rerun
attempt history needs targeted verification. Deployments, releases, and pull
request merges provide stable records and useful provider times. Deployment
statuses add lifecycle state but previous statuses are retained only 90 days
and retrieval is N+1. Repository activity events are capped at 300/30 days;
commit dates are Git-authored metadata, not authoritative GitHub push time.

**Vercel.** Project deployments expose stable `uid`, exact `projectId`,
creation (`created`), build-start (`buildingAt`), readiness (`ready`), target,
and current state. The official current list page documents
`GET /v7/deployments`; older overview/examples reference `/v6/deployments`,
so implementation must re-verify and pin the supported version. Filtering by
`projectId` or up to 20 `projectIds`, owner/team context, `since`/`until`, and
timestamp pagination make polling tractable. Retention is configurable and
plan-dependent; 2026 Hobby policy is bounded, so returned records are not a
complete-history guarantee. User/Activity Events have unique IDs and
generation times, but complete pagination and payload-independent project
binding are insufficiently documented. Deployment build events are logs and
are rejected as telemetry.

**Sentry.** Organization releases filtered by project are compact and useful:
provider release ID, `dateCreated`, nullable `dateReleased`, status, and exact
`projects[].id`. A release can span multiple projects, so it is one fact with
multiple Resource associations. ID scope/immutability and list sort watermark
are not fully documented. Release deploys add `dateStarted` and `dateFinished`
but require release-to-project binding and potentially large N+1 reads; the
official list-deploys response schema is under-documented. Issue objects are
mutable aggregates, not occurrences. Error events are high-volume telemetry
with source/user/request risk and are deferred.

**Neon.** Project operations are exceptionally clean evidence. The project
operations endpoint returns operation UUID, exact `project_id`, action,
status, `failures_count`, `created_at`, and `updated_at`; the latter is last
record update, not an exact completion time. Finished/skipped/cancelled are
terminal, while failed operations may be retried. Cursor pagination supports
up to 1000 results, but there is no `since`; future polling should overlap the
newest page, deduplicate IDs, and revisit nonterminal records. Neon may delete
operations older than six months. Current branch endpoints are current state,
not history.

**PlanetScale.** Deploy requests have stable request IDs/numbers and useful
request/deployment lifecycle fields. Retrieval is nested under the exact
organization/database Resource, but the path uses the current database name
and the response does not prove the persisted database ID; binding therefore
depends on preserved request context. `read_deploy_request` is required,
pagination defaults to 25, and retrieval is per database. Raw notes, actors,
DDL, schema/table/keyspace details, lint output, and errors must be excluded.
Deployment details are an enrichment, not safe raw evidence. Organization
Audit Logs have stable IDs/times and cursor pagination but only 15-day
retention, sensitive actor/IP/location/metadata fields, and no documented
exact database-ID join. Branch lists are current state, not event history.

### Provider Evidence Matrix

| Provider | Candidate | Endpoint/API | Stable ID and provider time | Exact Resource binding | Read scope | Pagination / incremental | Risk and request cost | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cloudflare | Worker deployments | `GET /accounts/{account}/workers/scripts/{script}/deployments` | deployment UUID; `created_on` = deployment record creation | exact request parent: Worker script ID/name | Workers Scripts Read (accepted) | no controls documented; reread and ID-dedupe only | compact allowlist; exclude author/message; one request per Worker; retention unknown | A |
| Cloudflare | Worker versions | `GET .../scripts/{script}/versions` | version UUID; metadata creation/modification times | exact Worker request parent | Workers Scripts Read (accepted) | page/per-page; no `since` | upload is not deployment; exclude author/content/bindings; per Worker | B |
| Cloudflare | Audit Logs v2 | `GET /accounts/{account}/logs/audit` | audit ID; `action.time` | exact for zones when IDs match; unproven for Worker/D1/KV | Account Settings Read | cursor, limit up to 1000, `since`/`before` | 18 months; high-risk actor/request data; account-wide | B for exact zone, C otherwise |
| GitHub | Workflow runs | `GET /repos/{owner}/{repo}/actions/runs` | run ID; created/start/update; no completion time | `repository.id` = repository Resource ID | Actions Read; classic private `repo` | page max 100; `created` range; filtered results cap 1000 | exclude actors/commit text/email/logs; one family per repository | A |
| GitHub | Deployments | `GET /repos/{owner}/{repo}/deployments` | deployment ID; `created_at`/`updated_at` | exact repository request parent | Deployments Read | page max 100; no `since` | exclude arbitrary payload/creator; one family per repository | A |
| GitHub | Deployment statuses | `GET .../deployments/{id}/statuses` | status ID; state-record creation time | exact repository + deployment parent | Deployments Read | page max 100; N+1 | prior statuses retained 90 days; exclude descriptions/URLs/creator | B |
| GitHub | Releases | `GET /repos/{owner}/{repo}/releases` | release ID; `published_at` strongest | exact repository request parent | Contents Read | page max 100; no `since` | excludes ordinary tags; exclude body/assets/author; per repository | A |
| GitHub | PR merges | `GET /repos/{owner}/{repo}/pulls` | PR ID; `merged_at` | `base.repo.id` = repository Resource ID | Pull requests Read | page max 100; updated-order overlap | source fact, not deployment; large user payload must be projected | B |
| GitHub | Repository events / commits | activity or commits endpoints | event ID/time; commit SHA with user-authored Git dates | exact repository ID/parent | Metadata or Contents Read | events: 300/30 days; commits: since/until | incomplete/heavy or weak chronology | C |
| Vercel | Project deployments | current docs: `GET /v7/deployments` (older references `/v6`) | deployment `uid`; `created`, optional `buildingAt`, `ready` | `projectId` = project Resource ID | bearer token in correct owner/team context | timestamp next/prev; `since`/`until`; up to 20 project IDs | allowlist only; owner-batched pages; retention plan-dependent | A |
| Vercel | User/Activity Events | `GET /v3/events` | event ID; `createdAt` = generated time | exact single-project filter; payload ID optional | bearer token / owner context | since/until but exhaustive pagination semantics unclear | payload is highly sensitive; strict projection required | B |
| Vercel | Deployment/build events | `GET /v3/deployments/{id}/events` | log/event IDs/times | deployment parent | bearer token | stream/time filters | raw logs, request paths/IPs/text; high volume | D |
| Sentry | Releases | `GET /api/0/organizations/{org}/releases?project={id}` | release ID; `dateCreated`; nullable `dateReleased` | `projects[].id` = project Resource ID | accepted project/release read scopes | cursor; `per_page` max 100; watermark order unclear | multi-project fact; exclude authors/data/commit/user blobs | B |
| Sentry | Release deploys | `GET /api/0/organizations/{org}/releases/{version}/deploys/` | deploy ID; start/finish record times | deploy -> release -> exact project IDs | accepted project/release read scopes | cursor; potentially N+1 per release | response schema/retention unclear; exclude name/URL | B |
| Sentry | Issue aggregates | organization/project issues endpoint | issue ID; mutable first/last seen | exact project ID/parent | event/project read depending endpoint | cursor max 100 | aggregate current state, not occurrence; source/user text | C |
| Sentry | Error events | project/issue event endpoints | event ID; `dateCreated` | exact project ID/parent | event/project read depending endpoint | cursor and time windows | telemetry, stack/request/user/source risk and high volume | D |
| Neon | Project operations | `GET /projects/{project_id}/operations` | operation UUID; `created_at`, last `updated_at` | `project_id` = project Resource ID | existing Neon API key | cursor, up to 1000; no `since` | compact; one family per project; older than 6 months may disappear | A |
| Neon | Branch list | project branches endpoint | branch ID and state timestamps | exact project parent | existing Neon API key | list pagination | current state, not lifecycle history | C |
| PlanetScale | Deploy requests | `GET /organizations/{org}/databases/{database}/deploy-requests` | request ID/number; request/deployment lifecycle fields | exact database request context; body ID proof absent | `read_deploy_request` | page default 25; limited filters; per database | exclude notes/actors/DDL/lint/schema/errors | B |
| PlanetScale | Audit Log | `GET /organizations/{org}/audit-log` | audit ID; created/updated | database ID join not documented | `read_audit_logs` | cursor max 100 | 15 days; actor/IP/location/arbitrary metadata | C |
| PlanetScale | Branch list | database branches endpoint | branch ID/state timestamps | exact database parent | database read access | list pagination | current state, not lifecycle history | C |

### Timestamp Semantics

The safe claims for the strongest candidates are:

- Vercel reports deployment `uid` was created at `created`; it began building
  at `buildingAt` and became ready at `ready` only when those optional fields
  are present. Current `state` is not an exact failure/cancellation time.
- Neon reports operation UUID was created at `created_at` and its record was
  last updated at `updated_at`. `updated_at` is not an independently defined
  completion time.
- GitHub reports workflow run ID was created at `created_at`, started at
  `run_started_at`, and currently has a status/conclusion. `updated_at` is not
  an exact failure/completion timestamp.
- Cloudflare reports Worker deployment UUID was created at `created_on` and
  references the returned versions/traffic percentages. The list is not
  proven complete.
- PlanetScale reports the named request/deployment lifecycle fields for a
  deploy request. Preserve their provider names; do not invent one occurrence
  time.
- Sentry reports release ID with `dateCreated` and, when present,
  `dateReleased`; the field names do not prove runtime deployment.

All future records also need `observedAt`, meaning only when Combie read the
provider record. Named provider times and observation time must not collapse
into one field. A normalized primary time may coexist with the named values
only when its `timeKind` is explicit, for example `created`.

### Resource Binding

The preferred join is response-native equality: Vercel `projectId`, GitHub
workflow `repository.id`, Sentry release `projects[].id`, and Neon operation
`project_id` equal the existing `Resource.providerResourceId` after the same
string normalization used by discovery.

An exact request-context join is acceptable when the list endpoint is issued
from one existing parent Resource and the association is part of the endpoint
contract. This applies to Cloudflare Worker deployment paths, GitHub
repository-scoped releases/deployments, and PlanetScale database-scoped
deploy requests. Such records must preserve association provenance and must
not be reassigned by display-name matching.

On rename/deletion or missing parent context, ingestion must fail closed for
that association. No URL guessing, fuzzy matching, AI matching, or credential
inspection is acceptable.

### Identity / Deduplication

Use the provider-assigned record ID inside provider/account scope, never a
timestamp or display name. For the recommended Vercel source, deployment
`uid` is the deduplication key and `projectId` is verified on every record.
Repeated reads upsert the compact record because current state and later
lifecycle timestamps can change. Polling uses an overlap window and stable-ID
deduplication; known nonterminal deployments are refreshed until terminal.

Equivalent rules apply to operation/run/release/deploy-request IDs. A rerun,
retry, deployment status, or shared release must not be split or merged until
the provider's identity semantics prove that choice.

### Access / Permissions

All candidates are available through read-only GETs, but current connection
success is not a universal capability check.

- Vercel needs the existing bearer token and correct project owner/team
  context. Future reads should use the project's persisted `accountId` where
  required and must verify personal-account behavior.
- GitHub fine-grained tokens need Actions, Deployments, Contents, or Pull
  requests Read for the corresponding family; classic private-repository
  access generally uses `repo` or the documented narrower classic scope.
- Cloudflare Worker history accepts Worker Scripts Read. Audit Logs adds
  Account Settings Read.
- Neon operations use the existing bearer API key. Project-scoped API keys
  are least privilege, but their compatibility with current organization
  discovery must be verified before recommending a credential change.
- PlanetScale deploy requests require `read_deploy_request`; Audit Logs need
  `read_audit_logs`.
- Sentry releases/deploys accept documented project/release read scopes, but
  Combie currently does not inspect stored token scopes.

Permission failures must retain provider/resource context and tell the user
which read capability is missing without echoing tokens.

### Pagination / Cost

Vercel has the best cost shape: deployments can be filtered by exact project
IDs, with current docs allowing batches of up to 20 in the same owner/team
context, and adjacent pages use provider timestamp markers. Cost is roughly
owner contexts × project batches × returned pages.

GitHub list families cost at least one paginated request family per
repository; deployment statuses add one family per deployment. Cloudflare
Worker history, Neon operations, and PlanetScale deploy requests are per
Resource. Sentry release listing can be organization/project-filtered, but
deploy enrichment becomes per release. Cloudflare Audit Logs are account-wide
and efficient but add permission and payload risk.

Future code must obey provider rate-limit response headers, cap pages, retain
partial-provider failure reporting, and never interpret a truncated page walk
as complete history.

### Incremental Potential

Vercel deployment creation windows (`since`/`until`) plus timestamp page
markers and stable deployment IDs provide the clearest incremental strategy.
Use an overlap because boundary inclusivity and equal-timestamp ordering are
not sufficiently explicit. Refresh known nonterminal deployments separately.

GitHub workflow runs offer a `created` range but filtered results cap at
1000. Neon and Sentry provide cursors but do not define a durable timestamp
watermark for these lists. Cloudflare Audit Logs provide cursor plus
`since`/`before`; Cloudflare Worker deployments provide no documented
incremental control. PlanetScale deploy-request filters are partial. No
checkpoint design or persistence is introduced in this Sprint.

### Retention / Authority

Combie may say, “Provider reports record D with named provider time T; Combie
observed it at O.” It may not say, “This is the complete history,” unless the
specific API guarantees that window.

Known limits include Neon operations older than six months potentially being
deleted, PlanetScale Audit Logs retained for 15 days, Cloudflare Audit Logs
retained for 18 months, GitHub previous deployment statuses retained for 90
days, GitHub repository events limited to 300 events/30 days, and Vercel
deployment retention varying by plan/project policy. Other candidate list
APIs publish no completeness guarantee, and user deletion can also remove
records. Provider authority over returned record fields is distinct from API
history completeness and from Combie's future persistence.

### Security Review

Future ingestion must be projection-first. For Vercel deployments, the safe
initial allowlist is deployment `uid`, exact `projectId`, current
`state`/`readyState`, target, `created`, optional `buildingAt`, optional
`ready`, and Combie `observedAt`. Source/error code may be added only after a
separate necessity and sensitivity review.

Exclude creator/user/email/IP data, arbitrary `meta`/payload/text, commit
messages and author data, environment values/names, aliases and internal URLs,
build logs, request details, stack traces, source contents, DDL/schema/table
details, free-form notes/descriptions, audit request/response bodies, actors,
locations, and tokens. Never persist whole provider response objects. Existing
credential redaction and separate mode-`0600` storage remain mandatory.

### Event Primitive Pressure

`Change` remains a Combie-observed Resource before/after diff. Extending it
with deployment/release/operation occurrences would corrupt that meaning.
Resource metadata is current compact state and cannot safely hold an
unbounded historical array; doing so would create diff churn and accidental
event persistence.

The candidates do demonstrate a distinct provider-evidence concept, but they
do not share a sufficiently stable generic time or lifecycle taxonomy.
Vercel deployments have multiple lifecycle times, Neon operations are mutable
control-plane operations, GitHub workflows lack exact completion time,
Sentry releases can bind to multiple projects, Cloudflare's best list has an
unknown history window, and PlanetScale deploy requests require request-scope
association. A broad `Event`, EventStore, event-kind registry, or correlation
engine would therefore encode guesses.

The smallest safe next step is provider-first: a Vercel-specific compact
deployment evidence record, with only a minimal envelope if implementation
proves it necessary. The likely envelope fields are provider, provider record
ID, exact Resource ID, semantic record kind, named provider times,
`observedAt`, and compact allowlisted evidence. This is a research conclusion,
not a model implemented or specified by this Sprint.

### Investigation Value

Current evidence can say only that project/repository/worker metadata differed
when Combie synced. Top candidates would permit these stronger, still
non-causal statements:

- **Vercel:** “Vercel reports deployment `dpl_X` for project `prj_Y`, created
  at T1, building at T2, ready at T3, and currently READY; Combie observed the
  record at O.”
- **Neon:** “Neon reports operation UUID X with action A for exact project P,
  created at T1, last updated at T2, and currently status S.”
- **GitHub:** “GitHub reports workflow run X for repository numeric ID R and
  SHA S was created at T and currently concluded failure.” It cannot assign
  failure time from `updated_at`.
- **Cloudflare:** “Cloudflare reports Worker deployment X was created at T and
  configured versions/traffic percentages V.” It cannot claim the returned
  list is complete.
- **PlanetScale:** “PlanetScale reports deploy request X, retrieved through
  exact database Resource D, with provider lifecycle fields S/T.” It cannot
  infer a database-ID join from the response body.
- **Sentry:** “Sentry reports release X/version V is associated with exact
  project P, with `dateCreated` T1 and optional `dateReleased` T2.” It cannot
  claim the release caused an error or proves runtime deployment.

Existing Relationships may later place facts about related Resources in one
investigation. They do not prove correlation or causation between those
facts.

### Ranked Candidates

| Rank | Provider / candidate | Why useful | Time / binding / access | Cost / security / pressure | Recommendation |
| ---: | --- | --- | --- | --- | --- |
| 1 | Vercel project deployments | Direct operational deployment chronology and state | explicit creation/build/ready times; exact project ID; existing bearer context | owner-batched, incremental; strict projection and retention caveat; learn provider-first | implement next |
| 2 | Neon project operations | Clean control-plane action/status history | strong created/update times and project ID; existing API key | cursor but per project/no since; six-month caveat; compact | retain as second learning candidate |
| 3 | GitHub workflow runs | High-value CI state for exact repository/SHA | strong creation/start, weak completion time; Actions Read | per repository and filtered cap; redact source/user data | targeted follow-up after first provider |
| 4 | Cloudflare Worker deployments | Strong evidence of versions assigned traffic | stable UUID/creation time; exact current script-name path; Worker read | per Worker, no documented pagination/retention; identity rename caveat | useful provider-specific candidate |
| 5 | GitHub deployments/releases | Strong deployment-created or release-published facts | stable IDs and provider times; exact repository parent | per repository; deployment status is N+1; integration-dependent | useful enrichment, not first |
| 6 | PlanetScale deploy requests | Useful schema-deployment lifecycle | stable request ID; exact request context but no body database-ID proof | per database; complex/sensitive payload and product semantics | needs explicit projection/binding design |
| 7 | Sentry releases/deploys | Compact release/deploy evidence | release/project association; mixed/multi-project times | deploy N+1, unclear ID scope/schema/retention | targeted research before implementation |
| 8 | Cloudflare Audit Logs exact records | Excellent audit action time and cursor mechanics | exact only for proven IDs; new Account Settings Read | account-wide but sensitive; product coverage/binding caveats | later tightly projected source |
| 9 | Vercel Activity Events | Real provider-generated activity records | stable ID/time; project binding may depend on filter/payload | pagination unclear and payload high risk | do not choose first |
| 10 | current-state lists / aggregates / raw telemetry | weak history or excessive payload | ambiguous occurrence semantics | incomplete, mutable, or high-volume | C/D: reject or defer |

### Final Recommendation

**A --- Implement one provider-native event source next: Vercel project
deployment history.**

- **Provider/API:** Vercel deployment list; current official endpoint page
  documents `GET /v7/deployments`. Re-verify the `/v7` versus older `/v6`
  version discrepancy at implementation time and pin one supported contract.
- **Family and identity:** one deployment lifecycle record keyed by stable
  deployment `uid`.
- **Resource join:** require `deployment.projectId ===
  Resource.providerResourceId`; group requests by the Resource's persisted
  owner/account context.
- **Time semantics:** preserve `created` (deployment created), optional
  `buildingAt` (build began), optional `ready` (became ready), plus independent
  Combie `observedAt`. Do not derive failure/completion time from state or an
  update field.
- **Minimal persisted shape:** provider, deployment `uid`, exact project
  Resource ID/project ID, current state/readyState, target, the three named
  provider times when present, and `observedAt`. Do not standardize a generic
  event taxonomy yet.
- **Pagination/incremental:** filter exact project IDs (batched only within the
  same owner context), walk timestamp page markers with explicit page caps,
  poll an overlapping `since`/`until` creation window, deduplicate by `uid`,
  and refresh known nonterminal deployments.
- **Security:** persist only the allowlist. Exclude arbitrary metadata,
  creators/emails, commit material, environment data, URLs/aliases, detail
  endpoint private fields, and deployment/build logs.
- **Investigation impact:** enable a truthful provider chronology statement
  for an exact Vercel project while keeping Resource diffs and provider facts
  separate. No causal inference, correlation engine, webhook, or telemetry
  ingestion is implied.

This recommendation intentionally stops before implementation and does not
define Sprint 020.

### Learnings

> Which provider-native evidence source gives Combie the strongest
> improvement in investigation quality per unit of architectural
> complexity?

**Vercel project deployment history.** It adds stable, exact-project,
provider-timed deployment lifecycle evidence using a read-only, filterable,
incremental list API. It improves operational chronology more directly than
control-plane operations or source/release facts and requires less enrichment
than deployment-status or release-deploy N+1 paths.

> Has a generic Event primitive been earned, or should Combie learn from
> one provider first?

**Combie should learn from one provider first.** A distinct evidence concept
has been earned, but a generic durable Event primitive has not. The providers
do not yet share one truthful timestamp vocabulary, association cardinality,
mutability model, retention contract, or polling shape. Implementing Vercel
deployments first will produce evidence for the abstraction rather than
forcing the providers into a speculative model.

### Canon Changes

None. `VISION.md`, `ARCHITECTURE.md`, `ROADMAP.md`, and
`skills/build-combie/SKILL.md` remain accurate.

### Official Sources

Cloudflare:

- <https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/>
- <https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/list/>
- <https://developers.cloudflare.com/fundamentals/account/account-security/audit-logs/>
- <https://developers.cloudflare.com/fundamentals/api/reference/limits/>

GitHub:

- <https://docs.github.com/en/rest/actions/workflow-runs>
- <https://docs.github.com/en/rest/deployments/deployments>
- <https://docs.github.com/en/rest/deployments/statuses>
- <https://docs.github.com/en/rest/releases/releases>
- <https://docs.github.com/en/rest/pulls/pulls>
- <https://docs.github.com/en/rest/activity/events>
- <https://docs.github.com/en/rest/commits/commits>

Vercel:

- <https://vercel.com/docs/rest-api/deployments/list-deployments>
- <https://vercel.com/docs/rest-api/deployments/get-a-deployment-by-id-or-url>
- <https://vercel.com/docs/rest-api/user/list-user-events>
- <https://vercel.com/docs/rest-api/deployments/get-deployment-events>
- <https://vercel.com/docs/deployment-retention>

Sentry:

- <https://docs.sentry.io/api/releases/list-an-organizations-releases/>
- <https://docs.sentry.io/api/releases/list-a-projects-releases/>
- <https://docs.sentry.io/api/releases/list-a-releases-deploys/>
- <https://docs.sentry.io/api/releases/create-a-deploy/>
- <https://docs.sentry.io/api/events/list-a-projects-error-events/>
- <https://docs.sentry.io/api/pagination/>
- <https://docs.sentry.io/api/permissions/>

Neon:

- <https://api-docs.neon.tech/reference/listprojectoperations>
- <https://api-docs.neon.tech/reference/pagination>
- <https://api-docs.neon.tech/reference/authentication>
- <https://neon.com/docs/manage/operations>

PlanetScale:

- <https://planetscale.com/docs/api/reference/list_deploy_requests>
- <https://planetscale.com/docs/api/reference/get_deploy_request>
- <https://planetscale.com/docs/api/reference/get_deployment>
- <https://planetscale.com/docs/api/reference/list_audit_logs>
- <https://planetscale.com/docs/security/audit-log>

Do not define or implement Sprint 020.

------------------------------------------------------------------------

## Definition of Done

-   [x] inspect baseline `9d87c6b`
-   [x] follow `skills/build-combie/SKILL.md`
-   [x] read Canon + Sprint 018 completion notes
-   [x] Repository Understanding report
-   [x] Architecture Pressure report
-   [x] research all six existing providers
-   [x] official APIs/docs preferred
-   [x] multiple candidates investigated where useful
-   [x] provider-native timestamp semantics verified
-   [x] stable event identity verified
-   [x] exact Resource-binding path verified
-   [x] read-only scope/access verified
-   [x] pagination documented
-   [x] request-cost pressure reviewed
-   [x] incremental-sync potential reviewed
-   [x] retention/completeness reviewed
-   [x] sensitive payload/security reviewed
-   [x] Provider Evidence Matrix completed
-   [x] candidates classified A/B/C/D
-   [x] top candidates ranked cross-provider
-   [x] Event primitive pressure-tested
-   [x] Change extension pressure-tested
-   [x] Resource-metadata storage rejected/accepted with reasoning
-   [x] one-provider-first strategy pressure-tested
-   [x] investigation value demonstrated
-   [x] logs/metrics/traces remain out of scope
-   [x] no production code changes
-   [x] no test changes
-   [x] no provider adapter changes
-   [x] baseline tests pass
-   [x] typecheck passes
-   [x] secret scan clean
-   [x] diff research/docs-only
-   [x] exactly one A/B/C/D final recommendation
-   [x] completion notes updated
-   [x] Canon accurate
-   [ ] worktree clean (commit not authorized; only this intended Sprint
    document remains untracked)
-   [x] Sprint 020 not started

------------------------------------------------------------------------

## What Sprint 019 Proves

Before:

``` text
Resource Changes
      ↓
observedAt
      ↓
Combie observation chronology
```

After:

``` text
existing providers
      ↓
provider-native evidence candidates
      ↓
verified identity + time + Resource binding
      ↓
ranked evidence quality
      ↓
one smallest next implementation
```

No Event system exists yet.

Combie simply knows what stronger evidence is actually available.

------------------------------------------------------------------------

## Final Principle

> **Do not build a reasoning layer on timestamps that describe the
> observer instead of the event.**

Find provider-native facts.

Verify their time semantics.

Bind them exactly to Resources.

Keep the evidence compact.

Choose the smallest high-value source.

Then stop.
