# SPRINT-013 — Neon Provider

> **Roadmap:** Provider evidence expansion before deeper Investigation
> **Status:** Complete
> **Depends on:** SPRINT-012 (`00825d1`)
> **Provider:** Neon
> **New Relationships:** None

## Goal

Add Neon as Combie's fifth provider and determine the smallest trustworthy representation of database infrastructure that materially improves Combie's context.

```text
Neon credentials → authenticate → discover → normalize → Resource[]
                                                   ↓
                                      existing persistence/memory/context
```

Sprint 013 is not about maximizing Neon coverage. It asks:

> **What is the smallest useful Neon Resource representation Combie actually needs?**

## Why Neon Now

Sprint 012 proved:

```text
Resource + Relationships + Changes = Resource Context
```

Database infrastructure is now a meaningful missing part of that context. Neon is a useful pressure test because its API exposes a hierarchy of projects, branches, databases, and compute endpoints.

Do not assume every Neon object deserves to become a Combie Resource.

## Current API Facts to Re-Verify

Before coding, verify the current official Neon API/schema. At Sprint-writing time, Neon provides read APIs for projects, project branches, branch databases, and compute endpoints. Project and branch listing use pagination, and project scope can differ between personal and organization API keys.

Treat the current official API as authoritative if it differs from this document.

## Sprint Principle

> **Discover the provider's real shape before deciding Combie's shape.**

Before choosing Resource kinds, inspect:

1. stable identities
2. lifecycle/ownership hierarchy
3. independently meaningful objects
4. compact facts that improve context
5. deterministic non-secret evidence that might later support cross-provider joins
6. request cost and enrichment failure semantics

## Provider Contract Pressure Test

Do not redesign the existing provider contract preemptively.

First answer whether Neon can satisfy the existing authenticate + discoverResources contract. The preferred result is yes.

If genuine correctness pressure appears, document it before changing the contract.

## Authentication

Support explicit credentials through existing Combie patterns, preferably:

```bash
combie connect neon --token <token>
export NEON_API_KEY=...
combie connect neon --use-env
```

Validate the actual environment convention during implementation.

Do not auto-read `.env`, arbitrary machine secrets, or connection strings. Reuse existing credential persistence/security.

### Connection Identity

Determine what trustworthy account/scope identity Neon exposes.

Do not fabricate identity from token prefixes, email guesses, project names, or local config.

Personal and organization API keys may have different discovery scope. Document exactly what Combie's Neon `accountId` / `accountName` represent.

If this pressures the current connection model, report it explicitly rather than silently weakening semantics.

## Discovery Strategy

Begin from authoritative project discovery. Add per-project reads only when they answer a concrete context question.

Potential hierarchy:

```text
Project
  ├── Branch
  │    ├── Database
  │    └── Compute Endpoint
  └── ...
```

Do not fetch the entire hierarchy merely because it exists.

## Central Resource Decision

Evaluate at least:

### A — Project only
Neon Project is first-class; selected branch/database/endpoint facts remain compact metadata.

### B — Project + Database
Database becomes independently addressable, but identity and branch ownership must remain trustworthy.

### C — Project + Branch + Database
More faithful hierarchy, but potentially leaks provider internals into Combie.

### D — Project + Branch + Database + Endpoint
Highest complexity. Requires strong evidence that each object matters independently.

Choose the smallest representation that materially improves context. Document the chosen model and rejected alternatives.

## Resource Kinds

Reuse generic kinds when semantics match.

If Neon Project is first-class, existing `project` may be appropriate.

If database is first-class, inspect whether existing `database` (already used for Cloudflare D1) is the correct broad concept.

Do not add provider-specific kinds like `neon_project`.

## Stable Identity

Use provider-native deterministic identity.

Conceptually:

```text
neon:project:<project-id>
```

Nested objects may require scoped identities only if they become first-class.

Never use display names when stronger native identity exists. Renames should not change identity when Neon exposes stable IDs.

## Normalized Metadata

Persist only compact, deterministic, useful, non-secret provider facts.

Possible facts to evaluate include region, Postgres version, default/root branch identity, branch/database summaries, and compute summaries.

Do not persist raw API responses.

Never persist:

```text
API keys
database passwords
connection strings / URIs containing credentials
authorization headers
```

## Connection Strings

Connection URIs are explicitly out of scope.

Do not parse or store application `DATABASE_URL` values. Do not use secrets to manufacture relationships.

Future application→database relationships must first look for deterministic non-secret evidence.

## Pagination

Correctly implement pagination for every endpoint used.

Tests must cover single-page, multi-page, empty results, and termination semantics.

## Optional Enrichment Authority

If project discovery succeeds but optional branch/database/endpoint enrichment fails, preserve:

```text
known empty ≠ unknown
```

Do not convert failed enrichment into empty facts.

Keep the base project if optional enrichment fails unless the selected Resource contract makes that evidence essential.

## Deterministic Normalization

Nested provider collections whose order is not semantically meaningful must normalize deterministically.

Provider ordering noise must not create false Changes.

Exclude volatile/noisy fields unless they represent meaningful engineering state worth tracking.

## Existing Memory Compatibility

Neon must automatically work with provider-independent Change detection.

Do not create `detectNeonChanges`.

Prove:

```text
initial discovery → baseline
identical sync → no Change
meaningful normalized difference → Change
ordering noise → no Change
```

## Existing History + Context Compatibility

Without Neon-specific read code, these should work:

```bash
combie changes
combie history <neon-resource-id>
combie context <neon-resource-id>
```

A Neon context with zero Relationships is valid in Sprint 013.

## Relationships

Do not implement any new Relationship kind, including:

```text
uses_database
contains
has_branch
has_database
runs_on
```

Do not turn Neon hierarchy into Combie Relationships yet.

Sprint 013 acquires Resource/evidence only.

## Future Relationship Evidence

Inspect Neon responses for deterministic, non-secret facts that could later connect Neon to GitHub, Vercel, or another provider.

Classify only evidence actually observed:

```text
A — direct shared stable identity
B — deterministic join after targeted enrichment
C — weak/name-based evidence
D — secret/unsafe/ambiguous evidence
```

Do not consume candidates into Relationships in this Sprint.

## Multi-Provider Sync

Neon becomes provider five and must preserve existing partial-failure behavior.

```text
Cloudflare ✓
GitHub ✓
Vercel ✓
Sentry ✓
Neon ✗
```

must preserve successful providers and report Neon failure according to existing semantics.

Neon failure must not mutate unrelated provider Resources/Relationships.

## Persistence

Reuse generic provider connection, credentials, Resource, and Change persistence.

No Neon-specific tables.

No hierarchy schema unless generic architecture pressure genuinely proves it necessary.

## CLI

Extend existing generic provider surfaces only:

```text
connect neon
providers
sync
resources
changes
history
context
```

No Neon-specific command namespace.

## Error Handling

Map Neon failures into existing provider-error conventions.

Cover at minimum:

- unauthorized / invalid token
- forbidden / insufficient scope
- network failure
- malformed response
- project-list failure
- optional enrichment failure
- rate-limit behavior if applicable

Never leak credentials or unsafe response bodies.

## Architecture Pressure Report

Before implementation, inspect `00825d1` and answer:

1. Can the provider contract support Neon unchanged?
2. What trustworthy identity/scope can Neon auth return?
3. How do personal vs organization keys affect discovery?
4. What is the current Neon hierarchy?
5. Which objects have stable native IDs?
6. Which objects deserve first-class Combie Resources?
7. Can existing `project` / `database` kinds be reused?
8. What minimum requests provide useful context?
9. Which enrichment states are known-empty vs unknown?
10. Which collections require set-like normalization?
11. Which fields are volatile/noisy?
12. Can generic Change detection remain unchanged?
13. Can generic history/context remain unchanged?
14. What deterministic non-secret relationship evidence exists?
15. Does anything require Canon changes?

## Repository Understanding

Follow `skills/build-combie/SKILL.md` and inspect `00825d1`.

Identify provider contract/registry, adapter conventions, auth result shape, token resolution, credential store, Resource kinds/IDs, normalization, pagination patterns, Vercel enrichment authority patterns, multi-provider failure semantics, atomic Resource+Change persistence, baselines, CLI registration/help, provider tests, and generic history/context paths.

## Implementation Plan

Before coding, produce a concise plan covering:

- authentication and connection identity
- project discovery
- selected Resource representation
- rejected alternatives
- stable IDs
- normalized metadata
- pagination
- enrichment authority
- errors/security
- Change compatibility
- registry/CLI integration
- coexistence tests
- live verification

Then implement with Red → Green → Refactor.

## Testing

All Sprint 001–012 tests must remain green.

### Authentication
Valid auth/scope, invalid token, missing identity/scope, personal/org behavior where relevant, secret safety.

### Discovery
Zero/one/many projects, pagination, stable identity, rename stability, normalization.

### Nested Evidence
If fetched: known-empty, populated, deterministic ordering, pagination, enrichment failure, unknown vs empty, no secrets.

### Resource Contract
Every selected first-class kind: stable ID, provider=`neon`, providerResourceId, name, metadata, persistence.

### Change Detection
Initial baseline, identical second sync, meaningful change, ordering noise.

### Multi-Provider
Five-provider coexistence and partial failure.

### Generic Reads
Neon works through resources/changes/history/context without provider-specific read logic.

## Live Verification

With a real Neon API key if available:

```bash
export NEON_API_KEY="..."
bun run combie connect neon --use-env
bun run combie sync
bun run combie providers
bun run combie resources
```

Then:

```bash
bun run combie history <neon-resource-id>
bun run combie context <neon-resource-id>
```

Run a second sync and verify stable IDs, no duplicates, no false Changes, deterministic metadata, and existing providers intact.

Inspect SQLite/output for API keys, passwords, authorization headers, and credential-bearing connection URIs. None may appear.

If no live Neon account is available, mark live verification deferred rather than manufacturing results.

Do not create/delete production database infrastructure merely for testing.

## Required Neon Evidence Report

Completion notes must include:

### Resource Representation
What became first-class and why.

### Rejected Alternatives
Why other Neon objects remained metadata/excluded.

### Stable Identities
Native/scoped IDs used.

### Useful Normalized Facts
Non-secret facts that improve context.

### Relationship Evidence Candidates
Classify observed evidence A/B/C/D. Do not implement edges.

### Missing Evidence
What Neon does not expose that would be required for a trustworthy application→database join.

## Explicitly Out of Scope

Do not implement:

- PlanetScale
- `uses_database` or any new Relationship
- `.env` scanning / `DATABASE_URL` ingestion
- SQL/schema/table/data discovery
- query logs/metrics/traces
- database credentials
- Neon Data API/Auth/Functions/Object Storage/AI Gateway
- Investigation sessions/root-cause analysis
- cross-Resource temporal correlation
- AI summaries
- MCP/API/SDK/web UI
- execution
- hosted Combie
- future roadmap scaffolding

Branches/endpoints should become first-class only if the required Architecture Pressure report establishes concrete value.

## Anti-Overengineering

Do not introduce:

```text
DatabaseProvider abstraction
DatabaseEngine
DatabaseGraph
NeonHierarchy
ResourceHierarchyEngine
```

Neon should feed the same existing Combie primitives.

## Canon

Permanent Canon remains VISION, ARCHITECTURE, ROADMAP, and SKILL.

Update only if Neon proves an existing architectural statement materially inaccurate.

## Completion Notes

### Implemented

- Added Neon as provider five through the existing registry, connection,
  credential, sync, Resource, Change, History, and Context paths.
- Added explicit `--token` and consented `--use-env` authentication through
  `NEON_API_KEY`; credentials remain in the existing separate `0600` store.
- Added a Neon API client and adapter with typed/redacted errors, organization-
  scoped project discovery, project and branch pagination, optional hierarchy
  enrichment, deterministic normalization, and partial-evidence handling.
- Added one generic `project` Resource per Neon project. Branches, databases on
  the default branch, and compute endpoint summaries remain compact metadata.
- Added focused client/adapter/normalization tests plus five-provider,
  partial-failure, idempotency, Change, History, Context, and CLI coverage.

### Repository Understanding

- Baseline `00825d1` already supplied the small provider contract, registry,
  explicit token resolution, separate credential store, generic stable Resource
  identity, atomic Resource+Change persistence, optional-metadata preservation,
  multi-provider partial-failure sync, and offline History/Context reads.
- Provider adapters own HTTP shapes, pagination, auth, errors, and
  normalization. Core application code owns orchestration and generic storage;
  no provider-specific tables or read paths existed or were needed.
- Vercel established the relevant enrichment-authority precedent: omitted
  metadata means unknown, while an explicit empty array means known-empty.
- `00825d1` is both the required Sprint 012 baseline and the current parent
  commit. No relevant Canon drift or baseline conflict was found.

### Architecture Pressure

1. The provider contract supports Neon unchanged. `authenticate` resolves one
   trustworthy organization identity; `discoverResources` uses that identity.
2. `GET /auth` supplies `account_id` and `auth_method`. The connected
   `accountId` is the one organization returned by
   `GET /users/me/organizations`; `accountName` is that organization's name.
3. Organization and project-scoped keys resolve their owning organization;
   the latter may discover only its authorized project. A personal key is
   accepted only when exactly one organization is visible. Multiple or zero
   organizations fail with guidance instead of choosing a scope silently.
4. The verified hierarchy is Project → Branch → Database and Project/Branch →
   Compute Endpoint. Only the Project crosses the first-class Resource bar.
5. Projects, branches, database records, and endpoints expose native IDs.
   First-class identity uses the stable project ID; stable branch/endpoint IDs
   are retained only as compact metadata.
6. Project is independently meaningful as the ownership, region, Postgres
   version, branching, logical-database, and compute boundary. Nested objects
   do not independently improve current generic context enough to justify more
   Resources or hierarchy Relationships.
7. Existing generic `project` is correct. Existing `database` was evaluated but
   rejected because databases are branch-owned logical objects and this Sprint
   has no trustworthy generic containment/dependency model.
8. Minimum base cost is one paginated project listing. Selected useful context
   adds one paginated branch listing, one default-branch database listing when a
   default exists, and one endpoint listing per project.
9. Successful empty lists are known-empty. Failed branch enrichment makes both
   branches and default-branch databases unknown; failed database or endpoint
   enrichment makes only that fact unknown. Known branches with no default make
   the reported default-branch database set known-empty.
10. Branch, database, and endpoint arrays are set-like and sorted by stable
    normalized keys before persistence.
11. Usage counters, active/current state, mutable timestamps, logical sizes,
    and other noisy fields are excluded. Endpoint host is excluded because the
    current Neon schema marks it sensitive.
12. Generic Change detection remains unchanged and correctly handles baseline,
    repeated sync, meaningful normalized differences, and ordering noise.
13. Generic History and Context remain unchanged; a Neon project with zero
    Relationships is a valid context.
14. No direct cross-provider stable identity was observed. Current evidence is
    classified in the Neon Evidence Report below and no edge is created.
15. No Vision, Architecture, Roadmap, provider-contract, domain-schema, or
    persistence-schema change was required.

Official facts were verified against Neon's current
[OpenAPI v2 specification](https://neon.com/api_spec/release/v2.json),
[authentication reference](https://api-docs.neon.tech/reference/authentication),
[project listing](https://api-docs.neon.tech/reference/listprojects), and
[branch listing](https://api-docs.neon.tech/reference/listprojectbranches).

### Neon Resource Contract

- First-class: `neon:project:<project-id>`, `provider=neon`, `kind=project`,
  native `providerResourceId`, provider name, and compact metadata.
- Project metadata: region ID, Postgres version, organization facts when
  returned, creation time, normalized branch summaries, logical databases on
  the default branch, and compute endpoint summaries.
- Branch summaries retain stable ID, name, default, and protected state.
  Database summaries retain name and owner name. Endpoint summaries retain
  stable ID, branch ID, and read/write type.
- Rejected Project + Database: a logical database is branch-owned, while
  Sprint 013 forbids the hierarchy/dependency Relationship needed to explain
  it honestly as a separate Resource.
- Rejected Project + Branch + Database: this mirrors provider hierarchy without
  adding a current cross-provider or investigation capability.
- Rejected Project + Branch + Database + Endpoint: the extra Resources and
  implied containment model exceed the smallest useful evidence slice.

### API Request, Pagination, and Enrichment Behavior

- Auth uses Bearer token against `GET /auth`, then resolves the one owning
  organization through `GET /users/me/organizations` without using token
  prefixes, emails, project names, local config, or connection strings.
- Project discovery sends the resolved `org_id`, requests up to 400 projects,
  and follows `pagination.cursor` opaquely until absent/empty. Malformed items,
  non-advancing/excessive cursors, and `unavailable_project_ids` reject the
  inventory instead of persisting a falsely complete result.
- Branch discovery requests deterministic name/ascending order, up to 10,000
  branches per page, and follows `pagination.next` opaquely. Database and
  project-endpoint list endpoints are unpaginated in the verified schema.
- Base project-list failure fails that provider sync. Branch, database, and
  endpoint failures are optional and independently omitted as unknown while the
  authoritative base Project remains. Previously authoritative optional facts
  survive an unknown read and therefore do not fabricate removal Changes.
- HTTP 401/403, 404, 429, network failure, invalid JSON, malformed successful
  bodies, and safe provider detail are mapped into actionable redacted errors.
  Sprint 013 reports 429 clearly but does not add speculative automatic retry.

### Change Compatibility

- Initial project discovery creates the trustworthy baseline without a Change.
- Identical discovery and provider ordering noise create no duplicate Resource
  and no Change.
- A project rename retains `neon:project:<id>` and creates one generic grouped
  Resource Change. The same evidence is available through generic `changes`,
  `history`, and `context` reads with no Neon-specific memory code.
- Optional-enrichment failure after a successful read preserves the last
  authoritative nested facts and does not create a false Change.
- Five-provider partial failure preserves successful provider state and does
  not mutate unrelated Resources or existing Relationship kinds.

### Live Verification

- No real Neon API key/account was available in the authorized environment, so
  live connection and sync verification are explicitly deferred.
- Deterministic HTTP fixtures exercise current official response shapes,
  organization/project scope semantics, paginated reads, two successive syncs,
  generic reads, failure states, and secret safety without live credentials.
- Manual local verification completed with `bun run combie -- help`. No
  production database infrastructure was created, changed, or deleted.

### Neon Evidence Report

#### Resource Representation

One Neon Project is first-class because it is the smallest stable boundary that
collects database infrastructure ownership, region, Postgres version, branches,
logical databases, and computes without inventing a hierarchy model.

#### Rejected Alternatives

Database, Branch, and Endpoint stay metadata because they are nested provider
objects and Sprint 013 has neither an established containment Relationship nor
evidence that independently addressing them improves current Combie context.

#### Stable Identities

- Resource: native Project ID in `neon:project:<project-id>`.
- Metadata only: native `br-*` branch IDs and `ep-*` endpoint IDs.
- Database numeric IDs were observed but are excluded because the compact
  default-branch summary does not expose databases as independent Resources.

#### Useful Normalized Facts

Region, Postgres version, organization ownership when present, stable creation
time, branch ID/name/default/protection, default-branch database name/owner, and
endpoint ID/branch/type improve deterministic infrastructure context without
storing raw responses or credentials.

#### Relationship Evidence Candidates

- **A — direct shared stable identity:** none observed.
- **B — deterministic join after targeted enrichment:** none established by
  the endpoints used in this Sprint.
- **C — weak/name-based evidence:** Project, branch, database, and owner names;
  the project-list `applications`/`integrations` maps identify categories such
  as GitHub or Vercel but provide no external Resource ID.
- **D — secret/unsafe/ambiguous evidence:** endpoint host and credential-bearing
  connection details. Neon marks host sensitive, and application
  `DATABASE_URL`/connection strings are deliberately neither read nor stored.

#### Missing Evidence

A trustworthy application→database join still needs a shared external stable
identifier—for example a provider-backed GitHub repository ID, Vercel project
ID, or another non-secret application identity associated with the Neon
Project. Current integration categories and names are insufficient.

### Deviations

- Live verification is deferred because no authorized Neon credential was
  available.
- Personal keys with multiple visible organizations are rejected rather than
  adding an unrequested provider-specific organization-selection CLI. Users can
  connect with an organization- or project-scoped key.
- Endpoint host was removed from the initial progress after current OpenAPI
  verification identified it as sensitive.

### Learnings

Yes. Combie can represent useful Neon database infrastructure without changing
its core provider, Resource, Memory, or Context architecture. The existing
Project Resource plus compact authoritative metadata supplies useful database
context, while existing Change/History/Context behavior applies automatically.

No deterministic cross-provider Relationship is currently justified. The best
observed signals are category/name evidence (class C); a future trustworthy
application edge requires a shared non-secret external stable identity.

### Validation

- Red was confirmed for universal scope identity, branch cursor pagination,
  sensitive-host exclusion, and five-provider/generic-memory coverage.
- Focused validation passed: 86 tests and 400 expectations across the Neon and
  multi-provider suites.
- Full regression passed: 334 tests and 1,345 expectations across 27 files.
- `bun run typecheck`, `bun run combie -- help`, and `git diff --check` passed.
- Secret inspection found no API key, Bearer header, password, PostgreSQL URI,
  or credential-bearing connection string in normalized/persisted test state.

### Canon Changes

None.

Explicitly answer:

> Can Combie represent useful Neon database infrastructure without changing its core provider/Resource/Memory/Context architecture?

and:

> What deterministic evidence, if any, could eventually connect a Neon Resource to an application Resource?

Do not define or implement Sprint 014.

## Definition of Done

- [x] Inspect `00825d1`
- [x] Verify current official Neon API
- [x] Repository Understanding report
- [x] Architecture Pressure report
- [x] Provider contract reused unless real pressure proves otherwise
- [x] Explicit Neon auth and trustworthy scope identity
- [x] Correct paginated discovery
- [x] Smallest useful Resource representation chosen
- [x] Rejected alternatives documented
- [x] Stable provider-native identities
- [x] Compact non-secret normalized metadata
- [x] No secrets/connection URIs persisted
- [x] Known-empty vs unknown preserved
- [x] Deterministic normalization
- [x] Neon registered in generic provider flows
- [x] Partial failure remains correct
- [x] Generic Resource/Change/history/context behavior works
- [x] No new Relationship
- [x] Neon Evidence Report complete
- [x] Repeated sync idempotent
- [x] Live verification or explicit defer
- [x] Secret scan clean
- [x] All prior tests + full suite/typecheck pass
- [x] Full diff reviewed
- [x] Canon accurate
- [x] Completion notes updated
- [x] Worktree clean
- [x] Sprint 014 not started

## What Sprint 013 Proves

```text
Before:
GitHub ─→ Vercel ─→ Cloudflare
            +
          Sentry
            ↓
Resource + Relationship + Change → Context

After:
same architecture
+
Neon database infrastructure Resources
            ↓
same Resource + Change + History + Context primitives
```

There may be no application→Neon edge yet. That is intentional.

## Final Principle

> **Do not add Neon so Combie can display another provider logo. Add Neon so Combie can understand a missing part of the engineering system.**

Connect it.

Discover its real shape.

Choose the smallest useful Resources.

Normalize trustworthy evidence.

Let existing Memory and Context work automatically.

Record what could prove a future relationship.

Then stop.
