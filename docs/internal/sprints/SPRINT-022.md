# SPRINT-022 --- Neon Operation Evidence

> **Status:** Complete **Depends on:** SPRINT-021 **Phase:**
> Investigation foundation / provider-native evidence **Type:** Third
> provider-evidence vertical slice **Primary goal:** Ingest compact Neon
> project operation history as trustworthy provider-native evidence with
> exact Neon project association and provider-native lifecycle
> semantics, then expose it through Combie's existing offline
> investigation path. **Provider scope:** Neon only **Generic Event /
> Evidence abstraction:** Not assumed **Cross-provider correlation:**
> None **AI / causality / telemetry:** None

------------------------------------------------------------------------

## Goal

Sprint 020 added Vercel deployment evidence.

Sprint 021 added GitHub workflow-run evidence.

Both independently converged around a candidate provider-evidence
envelope:

``` text
provider
native identity
exact Resource binding
state field(s)
provider-native timestamps
Combie observation time
refresh authority
compact evidence
```

But Sprint 021 concluded:

> **Recommendation B --- the candidate envelope exists, but a third
> provider is needed before a generic Event primitive is earned.**

Sprint 022 performs that third pressure test using **Neon project
operations**.

This is intentionally a different operational category:

``` text
Vercel Deployment
→ application delivery

GitHub Workflow Run
→ CI / automation execution

Neon Operation
→ database infrastructure operation
```

The goal is not to make Neon conform to the Vercel/GitHub model.

The goal is to implement Neon operations faithfully, then determine
whether the shared evidence envelope survives a third provider with
materially different semantics.

------------------------------------------------------------------------

## Core Principle

> **Three provider implementations may earn an abstraction. They do not
> owe us one.**

Implement Neon operations as Neon actually models them.

Reuse mechanics only where semantics are genuinely shared.

Do not flatten provider meaning for architectural symmetry.

------------------------------------------------------------------------

## Baseline

Sprint 022 must begin from the clean committed Sprint 021 baseline.

Expected baseline:

``` text
4c43acef877a328dc69975be38c75fb9c3909ad3
feat(github): persist workflow-run evidence for investigate
```

Verify the actual repository state before implementation.

Record the exact baseline SHA in completion notes.

Expected baseline validation:

``` text
466 tests passing
typecheck clean
worktree clean
```

If the repository differs, report the actual state before proceeding.

------------------------------------------------------------------------

## Target Vertical Slice

Conceptually:

``` text
Neon API
   ↓
project operations
   ↓
minimal normalization
   ↓
durable compact provider evidence
   ↓
exact Neon project Resource association
   ↓
offline investigation
   ↓
OPERATIONS
```

The actual API shape, endpoint, identity, state, timestamps, pagination,
retention, and permissions must be verified against current official
Neon documentation before implementation.

Do not assume Sprint 019 research is still current enough to code from
without re-verification.

------------------------------------------------------------------------

## Repository Understanding Report

Before coding, read:

-   `skills/build-combie/SKILL.md`
-   Combie Canon
-   Sprint 019 evidence research
-   Sprint 020 completion notes
-   Sprint 021 completion notes
-   Neon client
-   Neon adapter
-   Neon normalization
-   Neon authentication/scope resolution
-   provider contract and registry
-   sync orchestration
-   Neon Resource shape and project identity
-   Neon branch/database/endpoint metadata behavior
-   Resource / Change / Relationship models
-   Vercel deployment evidence implementation
-   GitHub workflow-run evidence implementation
-   provider-specific evidence tables and refresh-state tables
-   SQLite schema/store/upgrades
-   InvestigationContext
-   investigation formatter
-   one-hop neighbor evidence behavior
-   Change timeline
-   provider pagination/failure isolation
-   secret redaction

Report:

1.  How Neon projects are currently discovered.
2.  Exact Neon project Resource identity.
3.  Which Neon hierarchy is already represented as Resource metadata.
4.  What Sprint 020 and 021 taught about provider-native evidence.
5.  Which mechanics are duplicated across Vercel/GitHub evidence.
6.  Which semantics remain provider-specific.
7.  Where Neon operation retrieval should fit.
8.  Whether adding a third evidence family creates meaningful
    abstraction pressure before coding.
9.  Whether any existing shared helper can be reused without creating a
    domain abstraction.

Do not implement production code before this report.

------------------------------------------------------------------------

## Architecture Pressure Report

Verify current official Neon API documentation/specification and answer:

1.  What exactly does Neon call an operation?
2.  What official endpoint(s) expose project operations?
3.  What API version/contract is current?
4.  Is operation history project-scoped?
5.  What stable native operation identity exists?
6.  Does every operation carry exact project identity?
7.  How does that identity map to the existing
    `neon:project:<providerResourceId>` Resource?
8.  What operation action/type fields exist?
9.  What lifecycle/status fields exist?
10. Are statuses mutable?
11. What error/failure fields exist, and are they safe/useful to
    persist?
12. What provider-native timestamps exist?
13. What does each timestamp mean?
14. Is there a truthful primary ordering timestamp?
15. Which timestamps should remain as compact evidence?
16. Are operation timestamps strings, numeric epochs, or mixed?
17. Are operations immutable records, mutable lifecycle objects, or
    both?
18. Can one operation be observed in multiple lifecycle states?
19. Does Neon expose retry/attempt semantics?
20. What target/resource descriptors are present (branch, endpoint,
    compute, project, database, etc.)?
21. Which target descriptors are safe and useful for investigation?
22. Do any returned fields contain connection details, hostnames,
    passwords, tokens, or other sensitive material?
23. What permissions are required?
24. Does the existing Neon credential architecture already provide
    sufficient read access?
25. What pagination/cursor semantics exist?
26. What request cost applies at current project scale?
27. Can operation retrieval be incremental?
28. What retention/completeness guarantees exist?
29. Does an empty response authoritatively mean no operations in the
    queried scope?
30. What does a permission/transient failure mean for refresh authority?
31. Should stale operations survive failed refresh?
32. Is absence from a later response authoritative deletion?
33. What is the smallest durable representation?
34. Should Neon operations remain provider-specific?
35. Do three evidence families now justify a shared provider-evidence
    domain primitive?
36. If a shared primitive appears justified, what is actually shared:
    storage mechanics, refresh authority, domain semantics, or all
    three?
37. Should Neon operations enter the existing Change timeline?
38. How should one-hop investigation composition behave?
39. Does Canon need to change?

Do not predetermine the abstraction answer.

------------------------------------------------------------------------

## Official API Verification

Use current official Neon documentation/API specification as primary
authority.

Verify at minimum:

-   operation listing endpoint
-   project scoping
-   pagination/cursor behavior
-   operation identity
-   project identity
-   action/type
-   lifecycle status
-   timestamps
-   permissions
-   retention/completeness where documented
-   error response semantics relevant to authority

If current Neon behavior differs from Sprint 019 assumptions, follow
current official evidence and document the deviation.

------------------------------------------------------------------------

## Exact Resource Binding

Neon operation evidence must bind to the existing Neon project Resource
using exact provider-native identity.

Conceptually:

``` text
Neon operation.project_id
→ Neon Resource.providerResourceId
→ neon:project:<project-id>
```

Verify the real field names.

Do not bind by:

-   project display name
-   branch name
-   database name
-   endpoint hostname
-   connection string
-   fuzzy matching
-   Vercel project name
-   GitHub repository
-   AI inference

If the operation endpoint is already project-scoped but does not echo
project ID, pressure-test whether the authoritative request scope plus
known Resource identity is sufficient. Document that contract
explicitly.

------------------------------------------------------------------------

## Evidence Contract

Every persisted Neon operation must be able to answer:

``` text
Which provider supplied this?
Which native operation is this?
Which exact Neon project Resource owns it?
What operation/action is represented?
What provider-native lifecycle state is known?
What provider-native time is known?
What target/context is safely known?
When did Combie observe this evidence?
What is the refresh authority?
```

Potential fields may include, only if verified and useful:

``` text
operation id
action / type
status
created/start time
updated/finished time
branch id/name
endpoint id
compute id
error category/code
```

Do not persist fields simply because Neon returns them.

Use a compact allowlist.

------------------------------------------------------------------------

## Operation Semantics

Do not assume a Neon operation is equivalent to:

``` text
Vercel deployment
GitHub workflow run
```

Pressure-test what operations actually represent.

Examples might include provider-side actions such as
branch/endpoint/compute/project operations, but only use categories
supported by the current API.

Preserve Neon terminology.

Do not rename all operation actions to generic event kinds during this
Sprint.

------------------------------------------------------------------------

## Lifecycle and Mutability

Pressure-test whether the same operation progresses through states.

For example, if supported:

``` text
running
→ finished
```

or:

``` text
scheduling
→ running
→ completed / failed
```

Use actual Neon values.

Stable operation identity must prevent duplicate rows across refreshes.

If lifecycle state changes, update the same persisted evidence record
unless the provider semantics prove otherwise.

Do not build a generic state-transition history engine.

Document what lifecycle detail the minimal representation preserves and
intentionally omits.

------------------------------------------------------------------------

## Time Semantics

Hard rule:

``` text
Neon provider-native time
≠
Combie observedAt
```

Preserve exact provider semantics.

Do not manufacture `occurredAt`.

If Neon exposes multiple times, keep their meaning explicit:

``` text
created at
started at
finished at
updated at
observed by Combie at
```

Only use labels supported by the actual API contract.

If timestamps use different units/formats from Vercel/GitHub, preserve
provider truth in normalization while producing deterministic
storage/output.

This difference is part of the abstraction pressure test.

------------------------------------------------------------------------

## Target / Context Evidence

Neon operations may reference sub-resources beneath the project.

Combie currently models Neon primarily as:

``` text
neon:project:<id>
```

with branch/database/endpoint information in compact metadata.

Sprint 022 must not automatically promote Neon
branches/endpoints/databases into new first-class Resources.

Operation target metadata may be persisted compactly if:

-   it is provider-native
-   it is non-secret
-   it materially improves investigation
-   it remains deterministic
-   it does not invent new Resource relationships

Do not expand the Neon Resource model merely to make operation evidence
prettier.

------------------------------------------------------------------------

## Sensitive Data

Database providers deserve stricter review.

Never persist:

-   API keys
-   Authorization headers
-   connection strings
-   database passwords
-   pooled/direct connection URIs
-   environment variable values
-   SQL query text
-   query parameters
-   arbitrary logs
-   full provider payloads

Pressure-test:

-   hostnames
-   endpoint URLs
-   database names
-   user names
-   error messages

Persist only what is needed and safe.

If an error message may echo sensitive provider/user data, prefer
normalized error category/code over raw text.

Use existing redaction defenses and add regression coverage where
needed.

------------------------------------------------------------------------

## Retrieval Strategy

Determine the official project-operation retrieval strategy.

Evaluate:

-   per-project requests
-   pagination/cursors
-   result limits
-   incremental cursors/time bounds if officially supported
-   current number of Neon projects in live state if known
-   failure isolation per project

Do not invent incremental semantics.

Do not silently truncate history without documenting the bound.

If a bounded history policy is necessary, make it deterministic and
explicit.

------------------------------------------------------------------------

## Refresh Authority

Preserve the three-state distinction learned in Sprints 020--021:

``` text
KNOWN POPULATED
KNOWN EMPTY
UNKNOWN / FAILED REFRESH
```

An API error is not empty.

A permission failure is not empty.

A malformed response is not empty.

If operation refresh fails after Neon Resource discovery succeeds:

-   preserve trustworthy Resource discovery
-   preserve prior operation evidence
-   mark refresh authority appropriately
-   do not replace unknown with empty

If the provider returns an authoritative empty result for the queried
scope, store known-empty refresh state.

------------------------------------------------------------------------

## Retention and Deletion

Research Neon operation-history retention/completeness.

Do not claim lifetime-complete history unless Neon guarantees it.

Do not delete previously observed operation evidence merely because it
disappears from a bounded/retained response unless absence is
authoritative.

Combie may preserve previously observed evidence beyond the provider's
current listing window as historical observation, provided provenance
remains truthful.

Document this explicitly.

------------------------------------------------------------------------

## Durable Representation

Do not force Neon operations into:

-   `Change`
-   Neon Resource metadata
-   `vercel_deployments`
-   `github_workflow_runs`
-   generic `Event` merely for symmetry

Choose the smallest representation supported by real pressure.

A provider-specific table such as a Neon operation store is acceptable.

However, this is the third evidence implementation. Before duplicating
mechanics blindly, inspect whether a small shared internal mechanism has
now clearly emerged.

Possible shared mechanics to pressure-test:

``` text
stable native evidence id
subject Resource id
observedAt
refresh state
known-empty / unknown authority
deterministic newest-first reads
```

Do not turn those mechanics into a shared domain abstraction unless
semantics support it.

------------------------------------------------------------------------

## Three-Provider Evidence Review

At completion compare:

``` text
Vercel Deployment
GitHub Workflow Run
Neon Operation
```

Across:

  Axis                      Vercel    GitHub                Neon
  ------------------------- --------- --------------------- ---------
  Native identity           ?         ?                     ?
  Resource binding          project   repository            project
  Primary action/type       ?         workflow              ?
  State model               ?         status + conclusion   ?
  Mutable lifecycle         ?         ?                     ?
  Provider timestamps       ?         ?                     ?
  Observation time          Combie    Combie                Combie
  Attempts/retries          ?         run_attempt           ?
  Pagination                ?         ?                     ?
  Refresh authority         ?         ?                     ?
  Retention                 ?         ?                     ?
  Compact target evidence   ?         branch/SHA            ?

Populate this from implementation evidence, not assumptions.

Then choose exactly one recommendation:

### A --- Shared provider-evidence primitive is earned

The three implementations demonstrate sufficiently stable semantics to
justify a small generic domain/storage abstraction.

If A wins, **do not implement the refactor in Sprint 022**. Define the
smallest candidate abstraction for Sprint 023.

### B --- Shared mechanics are earned, but provider-specific domain models should remain

There is enough repetition for storage/query/refresh helpers, but not
enough semantic convergence for a generic Event/Evidence domain object.

### C --- Another provider is still needed

The third implementation introduces enough new semantic variation that
abstraction remains premature.

### D --- Provider-specific evidence is the correct long-term architecture

A universal event/evidence model would erase useful provider semantics.

No predetermined answer.

------------------------------------------------------------------------

## Investigation Composition

After successful sync, Neon operation evidence must work fully offline:

``` bash
unset NEON_API_KEY
bun run combie investigate neon:project:<id>
```

Prefer a separate section:

``` text
OPERATIONS (newest first)
```

Use Neon terminology in the output.

Potential presentation:

``` text
Operation: <action/type>
ID: <native id>
Status: <provider state>
Target: <safe compact target>
Created at: ...
Finished at: ...
Observed by Combie at: ...
```

Only show fields supported by actual evidence.

Known-empty and unknown must be distinct.

------------------------------------------------------------------------

## One-Hop Investigation

Pressure-test Neon operation evidence when a Neon project is a one-hop
neighbor of another Resource.

Do not invent a new application↔database Relationship.

Sprint 015 explicitly deferred application↔database relationships due to
insufficient exact binding evidence.

Therefore, Neon operations should only appear as neighbor evidence where
an already-proven Relationship actually exists.

Do not create one for convenience.

Preserve one-hop depth.

------------------------------------------------------------------------

## Timeline Interaction

Default:

``` text
TIMELINE
= Change-only

DEPLOYMENTS
= Vercel evidence

WORKFLOW RUNS
= GitHub evidence

OPERATIONS
= Neon evidence
```

Do not merge Neon operations into the Change timeline by default.

Sprint 022's purpose is evidence-model pressure, not temporal
unification.

If three evidence families now suggest a trustworthy cross-evidence
timeline model, record that as a future Sprint candidate.

Do not implement it here.

------------------------------------------------------------------------

## No Correlation or Causality

Do not correlate Neon operations with:

-   Vercel deployments
-   GitHub workflow runs
-   Resource Changes
-   database metadata changes
-   branch names
-   timestamps
-   SHA values
-   project names

Do not claim:

``` text
deployment caused database operation
workflow triggered Neon operation
Neon operation caused application failure
```

Temporal proximity remains evidence, not causality.

------------------------------------------------------------------------

## Sync Integration

Preserve existing multi-provider behavior.

Neon Resource discovery must remain trustworthy if operation enrichment
fails.

Prefer the evidence-refresh-after-Resource-apply pattern if it remains
architecturally appropriate.

Do not change the Provider contract unless pressure proves it necessary.

Do not let Neon evidence failure break unrelated provider successes.

------------------------------------------------------------------------

## Tests

Use:

``` text
Red → Green → Refactor
```

### Neon API

Cover:

-   authentication
-   official operation endpoint
-   project scoping
-   pagination/cursor
-   populated response
-   empty response
-   malformed response
-   permission failure
-   transient failure
-   redaction
-   stable operation identity
-   lifecycle states
-   timestamp variants
-   sensitive-field handling

### Normalization

Cover:

-   exact Neon project Resource binding
-   stable operation identity
-   action/type
-   status
-   timestamps
-   safe target/context fields
-   optional fields
-   deterministic allowlist
-   secret exclusion
-   raw-error-message safety

### Persistence

Cover:

-   insert
-   upsert
-   repeated-sync idempotency
-   mutable status refresh
-   exact Resource association
-   deterministic newest-first ordering
-   stable tie-break
-   safe pre-022 DB upgrade
-   known-empty
-   unknown refresh
-   stale preservation
-   no destructive cleanup from non-authoritative absence

### Sync

Cover:

-   Neon Resource + operations success
-   known-empty operations
-   operation refresh failure
-   successful Neon Resource discovery preserved
-   coexistence with Vercel deployments
-   coexistence with GitHub workflow runs
-   coexistence with all providers
-   partial failure behavior
-   repeated sync no duplicates
-   zero false Resource Changes from operation evidence

### Investigation

Cover:

-   Neon project with operations
-   known-empty operations
-   unknown/unrefreshed operations
-   deterministic ordering
-   provider-native timestamps
-   Combie observation time
-   lifecycle state
-   safe target evidence
-   offline read
-   no network during investigation
-   DB unchanged after repeated reads
-   Change timeline unchanged
-   Vercel deployments unchanged
-   GitHub workflow runs unchanged
-   one-hop behavior only where existing Relationships support it

### Regression

Preserve all existing providers and:

-   resources
-   relationships
-   related
-   changes
-   history
-   context
-   investigate
-   Change timeline
-   Vercel deployments
-   GitHub workflow runs
-   `source_for`
-   `uses_domain_in`
-   provider partial failures
-   credential safety

------------------------------------------------------------------------

## Live Verification

If an authorized Neon credential is available locally, perform read-only
live verification without exposing it.

Record:

-   Neon projects discovered
-   projects checked for operations
-   operations discovered/persisted
-   request count
-   pagination/cursor behavior
-   known-empty count
-   unknown/failure count
-   representative non-sensitive action/status examples
-   timestamp behavior
-   repeated-sync idempotency
-   duplicate count
-   zero false Resource Changes
-   credential-free offline investigation
-   DB unchanged by investigation reads

If no authorized credential is available, explicitly defer live
verification.

Do not weaken correctness to force a live test.

------------------------------------------------------------------------

## Completion Notes

### Baseline

Verified the exact Sprint 021 baseline:

``` text
4c43acef877a328dc69975be38c75fb9c3909ad3
feat(github): persist workflow-run evidence for investigate
```

The tracked tree was clean. This Sprint file was the sole untracked
file supplied for the task.

### Repository Understanding

Neon discovers projects through the organization-scoped `GET /projects`
cursor walk. Each project is normalized to
`neon:project:<project-id>` with `providerResourceId = project.id`, then
optionally enriched with branches, default-branch databases, and
endpoints. Those sub-resources remain compact Resource metadata; they
were not promoted to Resources.

Sprints 020 and 021 established provider-specific evidence rows,
per-Resource refresh authority, stable native-ID upserts, deterministic
newest-first reads, stale preservation, post-Resource sync enrichment,
offline investigation composition, and separation from `Change`.
Their storage, refresh, and investigation plumbing is structurally
duplicated, while identity, lifecycle, time, retry, target, pagination,
and retention semantics remain provider-specific. Neon operation
retrieval therefore fits after successful Neon Resource application in
`syncOne`; neither the Provider contract nor registry needed to change.
Existing Resource ID, SQLite schema application, related-context, and
history helpers were reused without introducing a domain abstraction.

### Architecture Pressure

Neon calls an Operation an asynchronous action performed on project
resources. Current official v2 evidence exposes project operations at
`GET /api/v2/projects/{project_id}/operations` and individual operations
at `GET /api/v2/projects/{project_id}/operations/{operation_id}`. The
list is project-scoped, and every current Operation requires both a UUID
`id` and an echoed `project_id`. Combie requires that echo to equal the
requested Resource's `providerResourceId`, then derives the exact
`neon:project:<project_id>` binding. Names and indirect metadata never
participate.

The provider-native `action` is preserved without a closed local enum so
future Neon actions remain representable. Current statuses are
`scheduling`, `running`, `finished`, `failed`, `error`, `cancelling`,
`cancelled`, and `skipped`. Status is mutable. Current OpenAPI describes
`error` as terminal; Neon guidance says `failed` can retry. Re-observing
one UUID updates one row rather than creating transition history.
`failures_count` and optional `retry_at` preserve the available aggregate
retry evidence; Neon exposes no attempt objects.

Required times are `created_at` (operation creation) and `updated_at`
(last status update). Optional `retry_at` is the last retry time, and
`total_duration_ms` is a required integer duration. The three dates are
provider RFC 3339 strings normalized to ISO; duration remains
milliseconds. `created_at` is the truthful primary chronology, with UUID
as a deterministic tie-break. No field is relabeled as start, finish, or
generic occurrence time. All remain distinct from Combie `observedAt`.

Safe target context is limited to `branch_id` and `endpoint_id`. The
required project ID is also retained for provenance. The response has no
database target field. Raw `error` is human-readable and lacks a safe
category/code contract, so it is excluded, as are arbitrary fields,
connection material, hostnames, database/role names, URLs, logs, and full
payloads.

The existing Bearer `NEON_API_KEY` architecture is sufficient for
projects the credential can read; no new credential shape is needed.
The least-privilege current option is a project-scoped organization key.
Permission, authentication, lock, rate-limit, network, malformed-payload,
and server failures provide no refresh authority.

The list accepts `limit` from 1 through 1000 and an opaque cursor. Combie
uses 1000 and walks cursors unchanged, rejects malformed/non-advancing
cursors, and applies a 100-page safety bound. Retrieval is one complete
walk per discovered project, therefore O(projects x pages). Neon exposes
no documented `since`, `until`, or update filter and no cursor durability
contract, so no incremental watermark is invented. Official rate limits
are relevant operational cost; no per-request monetary or compute-wake
claim is made.

Neon documents that operations older than six months may be deleted.
A completed empty page walk is authoritative only for the project's
current retained response, not for lifetime history. Later absence is
not deletion authority. Previously observed rows survive empty and
failed refreshes. `result_count` records whether the latest successful
walk was empty even when historical rows remain.

The smallest durable record is provider, operation UUID, exact Resource
ID, echoed project ID, action, status, failure count, optional branch and
endpoint IDs, created/updated/retry times, total duration, and
`observedAt`, plus per-Resource refresh outcome and result count. Neon
operations remain provider-specific. Three providers prove a thin
mechanical envelope and refresh-authority pattern, but not shared domain
semantics. Operations remain outside the Change timeline. Investigation
loads only the subject and already-persisted one-hop neighbors; no
canonical Relationship currently connects a Neon project, so no
application-to-database edge was invented for a positive neighbor case.
Canon remains consistent and needs no change.

### Neon API Evidence Contract

Verified on 2026-08-09 against the official v2 OpenAPI and Neon API
documentation. The contract is project-scoped `GET
/projects/{project_id}/operations`; stable identity is the operation UUID;
exact ownership is the echoed `project_id`; provider-native action/status
and named timestamps are preserved. Pagination uses `limit=1000` and an
opaque cursor. Existing read access to the project is sufficient.

### Retrieval Strategy

After Neon Resources are applied, each exact project is refreshed
independently through a complete cursor walk. Cursors are passed through
unchanged, repetition and malformed pages fail authority, and 100 pages
is the explicit defensive bound. There is no unsupported incremental
cursor or time watermark. A failure for one project preserves discovery
and prior evidence for all projects.

### Durable Representation

Added provider-specific `neon_operations` and
`neon_operation_refresh` tables through the existing additive schema
path. Operation UUID is the stable upsert key. Reads are scoped by exact
Resource ID and ordered by `created_at DESC, operation_id DESC`. Refresh
state stores outcome, observation time, safe message, and current result
count. This keeps operation history out of Resource metadata, `Change`,
and the earlier provider tables.

### Operation Identity / Lifecycle

One Neon UUID represents one mutable lifecycle object. Repeated
observations update its current action/status/times and never duplicate
it. `failures_count` and optional `retry_at` are aggregate retry facts;
no attempt history or generic transition model was created.

### Time Semantics

`createdAt`, `updatedAt`, and optional `retryAt` retain the provider's
named semantics; `totalDurationMs` retains its unit. `createdAt` drives
ordering. `observedAt` records when Combie saw the row and is never used
as a provider event time.

### Authority / Retention

Successful complete walks are known populated or known empty for the
current retained response. Never-refreshed, failed, malformed,
permission-denied, rate-limited, and transient states are unknown.
Stale rows survive failures. Historical rows also survive later
successful empty results, while the persisted result count keeps that
current response truthfully known empty. Because Neon may remove records
older than six months, absence is never used as deletion authority.

### Security

The allowlist contains only stable IDs, provider action/status values,
counters, named times, duration, and `observedAt`. UUIDs, IDs, actions,
and statuses are shape-validated and control characters are rejected.
Raw operation
`error`, arbitrary payload fields, connection URIs, hosts, credentials,
SQL, logs, and database/user names are excluded. Persisted refresh errors
are normalized safe messages rather than provider text.

### Sync Behavior

Operation enrichment runs only after Neon project Resources are applied.
Each project's payload is fully validated and exactly bound before any
of its rows are written. Stable upserts make repeated sync idempotent and
lifecycle updates mutable. Evidence errors do not invalidate successful
Resource discovery, do not delete prior evidence, and create no Resource
Changes.

### Investigation Composition

`investigate neon:project:<id>` adds `OPERATIONS (newest first)` with
Neon-native labels and distinct populated, current-retained-empty, and
unknown/stale states. The same loader is applied only to exact persisted
one-hop neighbors. Tests prove unrelated Neon evidence cannot cross an
existing GitHub-to-Vercel edge and no Relationship is added. Repeated
offline reads produced identical output and an unchanged SQLite SHA-256.

### Timeline Decision

The timeline remains strictly Change-only. A Neon operation is
provider-native infrastructure evidence, not a Combie-observed Resource
before/after transition. No causal or cross-provider temporal claim is
made.

### Three-Provider Evidence Matrix

| Axis | Vercel Deployment | GitHub Workflow Run | Neon Operation |
| --- | --- | --- | --- |
| Native identity | string `uid` | numeric run ID | UUID `id` |
| Resource binding | exact project ID | exact repository numeric ID | exact echoed project ID |
| Primary action/type | deployment/source | workflow/event | provider `action` |
| State model | `readyState` + `state` | `status` + `conclusion` | mutable `status` |
| Provider timestamps | epoch-ms created/building/ready | ISO created/started/updated | RFC 3339 created/updated/retry + duration ms |
| Attempts/retries | none exposed | `run_attempt` | `failures_count` + `retry_at` |
| Pagination | `until` cursor walk | explicit one page x 100 | opaque cursor, 1000/page, 100-page guard |
| Refresh authority | per project | per repository | per project + current result count |
| Retention | plan/provider dependent | Actions retention policy | older than six months may be deleted |
| Compact target evidence | target + source | branch + SHA | branch ID + endpoint ID |

### Abstraction Decision

**B --- Shared mechanics are earned, but provider-specific domain models
should remain.**

All three share provider/native identity, exact Resource binding,
provider-native state and time fields, Combie observation time, compact
allowlisting, stable upsert, refresh authority, deterministic reads, and
offline composition. Their lifecycle vocabulary, identity types, time
units and meanings, retries, targets, pagination, and retention are not
a coherent generic Event model. A future refactor may consolidate narrow
storage/query/refresh mechanics, including the distinction between a
current empty result and retained historical rows, while leaving domain
types and formatters provider-specific.

### Validation

-   Focused client, normalization, storage, sync, investigation,
    multi-provider, and timeline suites passed.
-   Full suite: 490 passed, 0 failed, 2015 assertions across 47 files.
-   `bun run typecheck` passed.
-   Secret scan found only deliberately synthetic fixture/test values;
    no credential or raw sensitive provider data is persisted.
-   `git diff --check` passed; implementation and test diffs were
    reviewed, including untracked additions.
-   Manual offline CLI investigation was deterministic; the database
    SHA-256 remained
    `a209ba85773882b79b8147779c406fbb67a12dcb723ba7c4ea7ca3168e651cc8`
    before and after two reads.

### Live Verification

Explicitly deferred: no authorized `NEON_API_KEY` was available in the
environment. Credential-free fixture and mocked integration validation
covered the current official response contract without weakening safety.

### Deviations

-   Current OpenAPI requires `total_duration_ms`, includes a larger action
    enum, and defines terminal `error` status; these current facts replace
    older Sprint 019 assumptions.
-   Refresh state includes `result_count` so an authoritative later empty
    response remains representable while previously observed history is
    retained.
-   Positive one-hop Neon evidence could not be constructed without
    inventing the explicitly deferred application-to-database
    Relationship. The implementation supports any future canonical edge;
    this Sprint tests the negative boundary and non-invention behavior.
-   Live verification was deferred because no authorized credential was
    available.

### Learnings

1.  Yes. The thin evidence envelope survives exact Neon project binding,
    mutable status, provider times, observation time, compact evidence,
    and explicit refresh authority.
2.  Stable native identity, exact Resource binding, provider-native
    lifecycle/time preservation, `observedAt`, safe allowlisting, latest
    row upsert, per-Resource authority, deterministic local reads, stale
    preservation, and offline investigation are shared.
3.  Identity types, action/state vocabulary, timestamp names and units,
    retry semantics, target context, pagination, result completeness,
    and retention remain provider-specific.
4.  No. A shared domain Event/Evidence primitive would currently erase
    useful meaning or become an unhelpful bag of optional fields.
5.  Yes. Narrow storage/query/refresh mechanics are now earned candidates,
    but this Sprint intentionally did not refactor prior families.
6.  Sprint 023 should pressure-test and, if still justified, consolidate
    only the refresh-authority and evidence-store mechanics, especially
    current-result counts versus retained historical rows. Provider
    domain records and presentation should remain specific. This is a
    recommendation only; Sprint 023 was not started.
7.  Cross-evidence temporal composition is still secondary. Correct
    shared authority/storage mechanics and another bounded evidence
    problem are more important before attempting correlation or causal
    timelines.

### Canon Changes

None. The implementation fits the current Vision, Architecture, and
Roadmap without material Canon changes.

------------------------------------------------------------------------

## Definition of Done

-   [x] Sprint 021 baseline verified
-   [x] SKILL protocol followed
-   [x] Canon read
-   [x] Sprints 019--021 relevant notes read
-   [x] Repository Understanding complete
-   [x] Architecture Pressure complete
-   [x] current official Neon operations API verified
-   [x] exact Neon project binding established
-   [x] stable operation identity established
-   [x] action/type semantics preserved
-   [x] lifecycle/status semantics preserved
-   [x] provider timestamp semantics documented
-   [x] provider time distinct from Combie observedAt
-   [x] retrieval strategy justified
-   [x] pagination/cursor correct
-   [x] retention/completeness documented
-   [x] populated/empty/unknown authority modeled
-   [x] stale evidence preserved after non-authoritative failure
-   [x] compact evidence allowlist implemented
-   [x] sensitive database/provider fields excluded
-   [x] Change not overloaded
-   [x] Neon Resource metadata not used as operation history
-   [x] generic Event/Evidence abstraction not assumed
-   [x] smallest durable representation implemented
-   [x] safe SQLite upgrade
-   [x] repeated sync idempotent
-   [x] no duplicate operations
-   [x] mutable lifecycle refresh works where applicable
-   [x] zero false Resource Changes
-   [x] offline investigation works
-   [x] OPERATIONS surfaced
-   [x] one-hop boundary preserved
-   [x] no invented application↔database Relationship
-   [x] Change timeline unchanged
-   [x] Vercel deployment behavior preserved
-   [x] GitHub workflow behavior preserved
-   [x] no cross-provider correlation
-   [x] no causality
-   [x] three-provider evidence comparison completed
-   [x] A/B/C/D abstraction recommendation selected
-   [x] focused tests pass
-   [x] full suite passes
-   [x] typecheck passes
-   [x] secret scan clean
-   [x] whitespace/diff checks clean
-   [x] live verification completed or explicitly deferred
-   [x] completion notes updated
-   [x] Canon changes recorded or None
-   [x] Sprint 022 committed
-   [x] worktree clean
-   [x] Sprint 023 not started

------------------------------------------------------------------------

## Explicitly Out of Scope

Do not implement:

-   generic Event platform
-   generic EvidenceEngine
-   provider-evidence refactor
-   cross-provider correlation
-   Vercel↔GitHub SHA correlation
-   Neon↔Vercel correlation
-   Neon↔GitHub correlation
-   application↔database Relationships
-   operation logs
-   SQL/query history
-   database metrics
-   database traces
-   branch promotion logic
-   endpoint control
-   database execution
-   observations
-   temporal correlation windows
-   causality/root-cause analysis
-   anomaly detection
-   scoring/confidence
-   AI/LLM/embeddings
-   webhooks
-   continuous telemetry
-   new providers
-   recursive traversal
-   MCP/API/SDK/UI
-   controlled execution
-   Sprint 023 scaffolding

------------------------------------------------------------------------

## Anti-Overengineering

Do not build:

``` text
EventEngine
EvidenceEngine
EvidenceRegistry
OperationEngine
TemporalGraph
CorrelationEngine
DatabaseActivityEngine
UniversalEvent
```

Sprint 022 is:

``` text
Neon operations
      ↓
exact project binding
      ↓
provider-native semantics
      ↓
compact durable evidence
      ↓
offline investigation
      ↓
compare against Vercel + GitHub
      ↓
make the abstraction decision
      ↓
stop
```

------------------------------------------------------------------------

## What Sprint 022 Proves

After Sprint 022, Combie should have three distinct operational evidence
families:

``` text
GitHub repository
└── WORKFLOW RUNS

Vercel project
└── DEPLOYMENTS

Neon project
└── OPERATIONS
```

Each remains provider-faithful.

Together they answer a much more important architectural question:

> Is Combie discovering a real universal provider-evidence primitive, or
> merely a family resemblance between provider-specific operational
> records?

Sprint 022 should give us enough implementation evidence to make that
decision deliberately.

------------------------------------------------------------------------

## Final Principle

> **Do not abstract because the tables look similar. Abstract only when
> the semantics survive.**

Implement Neon operations faithfully.

Preserve database-provider safety.

Keep provider time separate from observer time.

Do not correlate.

Compare all three evidence families.

Make the recommendation.

Then stop.
