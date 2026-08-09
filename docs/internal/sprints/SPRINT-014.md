# SPRINT-014 — PlanetScale Provider

> **Status:** Complete
> **Depends on:** SPRINT-013 (`ea7ba3e`)
> **Provider:** PlanetScale
> **Goal:** Add PlanetScale as Combie's sixth provider and pressure-test the database Resource model
> **New Relationships:** None

## Goal

Add PlanetScale without creating a new database subsystem.

Sprint 013 established Neon as a deterministic Project Resource with compact branch/database/endpoint evidence while generic Resource, Change, History, and Context behavior remained unchanged.

Sprint 014 asks independently:

> **What is the smallest trustworthy PlanetScale Resource representation that materially improves Combie's engineering context?**

Do not force PlanetScale into Neon's shape merely for symmetry.

## Why PlanetScale Now

Combie understands Cloudflare, GitHub, Vercel, Sentry, and Neon. PlanetScale gives us a second, meaningfully different database provider and therefore tests whether our core abstraction is actually generic.

Current PlanetScale supports database infrastructure across Postgres and Vitess/MySQL-style systems, database branches, and richer schema/operational capabilities.

The key architecture question is:

> Was the Neon representation genuinely compatible with Combie's model, or did it only happen to fit Neon?

## Current API Facts — Re-Verify Before Coding

Use current official PlanetScale docs/API as authority.

At Sprint-writing time:

- database discovery is organization-scoped and paginated
- databases expose stable IDs, database kind/engine, region, readiness, branch counts, and other metadata
- branches expose stable IDs plus production/readiness/parent/region and engine-specific facts
- service-token auth uses a two-part credential: service-token ID + service-token secret
- service tokens have granular organization/database permissions
- one token may have access scoped across organizations/databases

Do not rely on this document when live docs disagree.

## Principle

> **Use the same Combie architecture, not necessarily the same provider shape.**

Neon currently looks roughly like:

```text
Neon Project Resource
  ├── branch evidence
  ├── database evidence
  └── endpoint evidence
```

PlanetScale may naturally be:

```text
PlanetScale Database Resource
  └── branch evidence
```

That difference is healthy if it reflects provider truth.

## Provider Contract Pressure

Do not redesign the provider contract preemptively.

Determine whether PlanetScale can satisfy existing authenticate + discoverResources semantics. Two-part credentials and organization-scoped discovery may require provider-specific credential/connect handling, but should not automatically require a core domain redesign.

Document real pressure before changing generic contracts.

## Authentication

PlanetScale service tokens currently use:

```text
PLANETSCALE_SERVICE_TOKEN_ID
PLANETSCALE_SERVICE_TOKEN
```

Verify canonical names/current auth format.

Support explicit authorization through existing Combie patterns. `--use-env` should safely resolve both values if consistent with repository conventions.

Do not auto-read `.env`, connection strings, shell history, application credentials, or arbitrary machine secrets.

Never print or place either credential component into Resource/Change metadata.

## Credential Architecture Pressure

Inspect whether `CredentialsStore` assumes one opaque token.

If PlanetScale requires an extension, choose the smallest safe representation that preserves:

1. provider-scoped credentials
2. separation from Resource/domain state
3. compatibility with existing providers
4. no secret leakage
5. no generic secret-management framework

A small generic provider-credential payload may be justified. A CredentialVault/SecretManager subsystem is not.

Document the decision.

## Connection Scope

PlanetScale discovery is organization-scoped.

Use official organization APIs/scope behavior to establish trustworthy connection identity.

Prefer stable organization ID as `accountId` and organization name/slug as `accountName` when supported.

Do not fabricate account identity from service-token ID, billing email, database name, or local CLI config.

If a token can access multiple organizations, do not silently pick the first.

Evaluate deterministic behavior such as requiring explicit:

```bash
combie connect planetscale --organization <slug> --use-env
```

when ambiguity exists.

Prefer non-interactive behavior consistent with current Combie CLI conventions.

## Discovery

Start with:

```text
resolve/auth organization
        ↓
list databases
        ↓
optional branch enrichment
        ↓
normalize
        ↓
Resource[]
```

Do not fetch deploy requests, backups, schema recommendations, Insights, credentials, query data, or schema contents.

## Central Resource Decision

Evaluate:

### A — Database only
PlanetScale Database is a first-class generic `database` Resource. Branches remain compact metadata.

### B — Database + Branch
Branches become independently addressable Resources. Requires concrete product justification.

### C — Organization + Database + Branch
High bar. Organization is probably connection scope, not an engineering Resource.

### D — Additional operational objects
Out of scope.

Preferred bias: **Database Resource + compact branch evidence**, but repository/API evidence wins.

Document selected representation and rejected alternatives.

## Generic Resource Kinds

Reuse `database` when appropriate.

Do not create:

```text
planetscale_database
postgres_database
mysql_database
vitess_database
```

Provider/engine distinctions belong in provider + metadata unless generic architecture proves otherwise.

## Engine Metadata

PlanetScale supports multiple database technologies.

Prefer:

```text
kind: database
provider: planetscale
metadata.engine: <provider-backed value>
```

Normalize exact current API values without inventing taxonomy.

## Stable Identity

Use provider-native stable IDs:

```text
planetscale:database:<database-id>
```

If branch becomes first-class, use its native branch ID.

Do not use display names when stable IDs exist. Rename should preserve identity.

## Normalized Metadata

Keep only compact, deterministic, useful, non-secret facts.

Evaluate:

- engine/kind
- region
- readiness
- production/development branch counts
- compact branch summary
- production/default branch identity
- meaningful provider configuration

Do not persist raw responses, billing/account data, or noisy counters merely because they exist.

Exclude timestamps/counters that would create meaningless Change noise unless they represent meaningful engineering state.

## Branch Evidence

If branches are enriched as metadata, evaluate compact fields such as:

```text
id
name
production
ready
schemaReady
parentBranch
region
engine
```

Use only current provider-backed fields.

Normalize set-like branch collections deterministically.

Never fetch or persist branch passwords/connection credentials.

## Authority Semantics

Preserve:

```text
known empty ≠ unknown
```

Successful empty branch discovery may produce `branches: []`.

Failed optional branch enrichment must remain unknown/omitted according to existing conventions, not falsely empty.

Keep base database Resource when optional enrichment fails unless correctness requires otherwise.

## Pagination

Implement PlanetScale pagination for every endpoint used.

Test single page, multiple pages, empty results, termination, and no duplicate resources.

Do not assume default page size is complete.

## Change Detection

PlanetScale must use generic Change detection.

Do not add `detectPlanetScaleChanges`.

Prove:

```text
initial sync → baseline
identical sync → no Change
ordering noise → no Change
meaningful metadata difference → Change
branch evidence difference → Change (if selected)
```

## History + Context

These must work generically:

```bash
combie history planetscale:database:<id>
combie context planetscale:database:<id>
```

No PlanetScale-specific history/context logic.

Zero Relationships is expected in Sprint 014.

## Relationships

Do NOT implement:

```text
uses_database
contains
has_branch
schema_for
deployed_to
```

Do not join by matching names, Git branch names, hostnames without proven semantics, connection strings, or environment secrets.

Database Relationship work comes after Neon + PlanetScale evidence has been studied.

## Relationship Evidence Investigation

Inspect existing read-only PlanetScale responses for deterministic non-secret cross-provider evidence.

Ask:

- Does database metadata expose integration/source references?
- Do branches expose external source identities?
- Are stable hostnames/IDs safely shared with application providers?
- Does official integration metadata expose stable identities?
- Would targeted enrichment provide a deterministic join?

Do not add API calls solely to chase weak guesses.

Classify observed candidates:

```text
A — direct shared stable identity
B — deterministic join after targeted enrichment
C — weak/name-based evidence
D — secret/unsafe/ambiguous evidence
```

Do not implement a resolver.

## Neon Comparison

Completion notes must compare both database providers:

1. Neon primary Combie Resource
2. PlanetScale primary Combie Resource
3. generic Resource kinds reused
4. hierarchy retained as metadata
5. overlapping normalized concepts
6. provider-specific facts
7. pressure toward a generic database abstraction
8. whether that abstraction is actually necessary

Preferred result: no `DatabaseProvider` domain abstraction.

## Multi-Provider Sync

PlanetScale becomes provider six.

Existing partial failure must hold:

```text
Cloudflare   ✓
GitHub       ✓
Vercel       ✓
Sentry       ✓
Neon         ✓
PlanetScale  ✗
```

Successful providers remain persisted; PlanetScale failure must not corrupt unrelated Resources or Relationships.

## Persistence

Reuse provider connection, credential, Resource, Change, History, and Context persistence/read paths.

No PlanetScale-specific tables.

## CLI

Extend generic provider-aware surfaces only:

```text
connect planetscale
providers
sync
resources
changes
history
context
```

Exact connect syntax should follow architecture pressure findings.

No `combie planetscale ...` namespace.

## Error Handling

Cover:

- missing token ID
- missing token secret
- invalid pair
- unauthorized
- insufficient organization/database permissions
- inaccessible explicit organization
- multi-org ambiguity
- database-list failure
- branch-enrichment failure
- pagination/malformed response
- network failure
- rate limiting where applicable

Never echo either credential.

## Security

Do not call APIs that create/read database passwords or connection credentials.

Never persist/print:

- service-token secret
- service-token ID if treated as credential material
- database/branch passwords
- connection strings
- OAuth tokens
- Authorization headers

Redaction must cover both service-token components and provider errors that echo inputs.

## Architecture Pressure Report

Before coding, inspect `ea7ba3e` and answer:

1. Can existing provider contract support PlanetScale?
2. Can CredentialsStore safely represent two-part credentials?
3. What is the smallest safe credential adaptation?
4. What stable identity represents connection scope?
5. How are multiple organizations handled?
6. What is current database/branch object model?
7. Which objects have stable native IDs?
8. Should only database be first-class?
9. Can generic `database` kind be reused?
10. Does engine diversity belong in metadata?
11. What branch evidence improves context?
12. What is known-empty vs unknown?
13. Which fields/arrays need deterministic normalization?
14. Which fields are volatile/noisy?
15. Can generic Change detection remain unchanged?
16. Can generic History/Context remain unchanged?
17. What deterministic non-secret relationship evidence exists?
18. Does PlanetScale expose evidence Neon did not?
19. Is a generic database abstraction actually necessary?
20. Does Canon need change?

Do not code first.

## Repository Understanding

Follow `skills/build-combie/SKILL.md` and inspect `ea7ba3e`.

Identify:

- provider contract/registry
- CredentialsStore shape
- provider token resolution
- connect behavior/account validation
- Neon adapter/scope/normalization
- Resource kinds/stable IDs
- pagination patterns
- enrichment authority semantics
- multi-provider sync
- Resource+Change atomic persistence
- secret redaction
- CLI parser/help
- generic history/context paths
- provider fixture conventions

Reuse patterns, not provider assumptions.

## Implementation Plan

Before coding, plan:

- credential pair representation
- organization resolution
- auth validation
- database discovery
- optional branch enrichment
- Resource representation + rejected alternatives
- engine metadata
- stable IDs
- normalization/pagination
- authority semantics
- errors/redaction
- Change compatibility
- six-provider coexistence
- History/Context verification
- live verification

Then use Red → Green → Refactor.

## Testing

All Sprint 001–013 tests remain green.

### Auth/Credentials
Missing ID, missing secret, valid/invalid pair, redaction, scope identity, multi-org behavior, inaccessible org.

### Database Discovery
Zero/one/many databases, pagination, stable ID, rename stability, engine normalization, deterministic metadata.

### Branch Evidence
If used: empty/populated, pagination, production/development facts, deterministic ordering, failure, unknown vs empty, secret safety.

### Resource Contract
Every selected first-class Resource: stable Combie ID, provider=`planetscale`, generic kind, providerResourceId, name, metadata, persistence.

### Change Detection
Baseline, identical resync, meaningful change, ordering-noise stability.

### Multi-Provider
Six-provider coexistence and PlanetScale partial failure.

### Generic Reads
PlanetScale works with resources/changes/history/context without provider-specific read logic.

### Regression
All existing providers, relationships, memory, and context remain green.

## Live Verification

With a real service token, grant only minimum read permissions required.

Suggested flow:

```bash
export PLANETSCALE_SERVICE_TOKEN_ID="..."
export PLANETSCALE_SERVICE_TOKEN="..."

bun run combie connect planetscale --organization <org> --use-env
bun run combie sync
bun run combie providers
bun run combie resources
```

Then:

```bash
bun run combie history planetscale:database:<id>
bun run combie context planetscale:database:<id>
```

Sync twice.

Verify stable IDs, no duplicates, zero false Changes, deterministic metadata, existing providers intact, and no secrets in SQLite/output.

Remove PlanetScale env credentials and verify history/context still work offline.

Do not modify real database infrastructure merely to manufacture Change events.

If credentials are unavailable, explicitly defer live verification.

## Required PlanetScale Evidence Report

Completion notes must include:

### Resource Representation
Chosen first-class Resources and why.

### Rejected Alternatives
Why other objects remained metadata/excluded.

### Credential Contract
How two-part auth is safely represented/resolved.

### Connection Scope
Organization identity and ambiguity behavior.

### Stable Identities
Native IDs used.

### Useful Normalized Facts
Non-secret context retained.

### Authority Semantics
Known-empty vs unknown.

### Relationship Evidence Candidates
Observed A/B/C/D evidence only.

### Missing Evidence
What is absent for a trustworthy application→database join.

### Neon Comparison
What the second database provider taught Combie's generic model.

## Explicitly Out of Scope

Do not implement:

- `uses_database` or any new Relationship
- internal hierarchy Relationships
- deploy requests/schema diffs/recommendations/backups
- Query Insights/query execution/live connections
- SQL/schema/table discovery
- roles/passwords/connection strings
- `.env` or Vercel environment-variable ingestion
- PlanetScale MCP/OAuth/Terraform integration
- Investigation/correlation
- AI/Learning
- MCP/API/SDK/web UI
- execution/hosted Combie
- Sprint 015 scaffolding

## Anti-Overengineering

Do not introduce:

```text
DatabaseProvider
DatabaseResource
DatabaseEngine
DatabaseTopology
DatabaseGraph
PlanetScaleHierarchy
CredentialVault
SecretManager
```

A small generic credential-shape extension is acceptable only if PlanetScale's two-part auth proves it necessary.

## Canon

Permanent Canon remains VISION, ARCHITECTURE, ROADMAP, and SKILL.

Update only if implementation proves existing architecture materially inaccurate.

## Completion Notes

Record Implemented, Repository Understanding, Architecture Pressure, PlanetScale Resource Contract, Credential + Scope Contract, API Request Behavior, Change Compatibility, Validation, PlanetScale Evidence Report, Neon Comparison, Deviations, Learnings, and Canon Changes.

Explicitly answer:

> Can Combie represent PlanetScale database infrastructure using the same core Resource/Change/History/Context architecture validated by Neon?

And:

> After studying Neon and PlanetScale, what deterministic evidence should Combie investigate next for application→database relationships?

Do not implement that relationship.

## Completion Notes

### Implemented

- Added PlanetScale as provider six through the existing registry, connection,
  credential, sync, Resource, Change, History, and Context paths.
- Supported explicit two-part service-token authorization:
  `--use-env` with `PLANETSCALE_SERVICE_TOKEN_ID` + `PLANETSCALE_SERVICE_TOKEN`,
  or `--token-id` + `--token`. Multi-org requires deterministic
  `--organization <slug>` selection.
- Stored the credential pair as one opaque composite `id:secret` string in the
  existing CredentialsStore (no CredentialVault). Redaction covers both
  components.
- Added PlanetScale client/adapter with official Authorization header form
  (`id:secret`, no Bearer scheme), page/`per_page` pagination, optional branch
  enrichment, deterministic normalization, and partial-evidence handling.
- First-class Resource: generic `database` per PlanetScale Database (stable
  native database id). Compact branch evidence remains metadata.
- Engine/kind (`mysql` | `postgresql`) stays provider-backed metadata.
- Generic sync label for kind `database` is now provider-neutral (`database`
  rather than Cloudflare-only `D1 database`).
- Tests cover credential-pair resolution/redaction, organization ambiguity,
  zero/one/many databases, pagination, stable identity, rename stability,
  engine normalization, branch authority, six-provider coexistence, partial
  failure, generic Change/History/Context, and full prior-provider regression.

### Repository Understanding

- Baseline `ea7ba3e` (Sprint 013) already supplied the small Provider contract
  (`authenticate` + `discoverResources`), registry, separate credentials file,
  generic stable Resource identity, atomic Resource+Change persistence,
  optional-metadata preservation, multi-provider partial-failure sync, and
  offline History/Context reads.
- Neon established the enrichment-authority precedent reused here: omitted
  metadata means unknown; explicit `[]` means known-empty; failed optional
  enrichment must not wipe prior evidence or invent false Changes.
- CredentialsStore assumed a single opaque `token: string` per provider. That
  shape is retained by encoding PlanetScale's pair into one composite string
  matching the official Authorization header material.
- Core remains provider-independent. Adapter owns HTTP, pagination, auth pair
  decoding, org resolution, and normalization. No PlanetScale-specific tables
  or read paths were added.

### Architecture Pressure

1. **Provider contract:** Existing `authenticate` / `discoverResources` suffice.
   Optional `ProviderAuthOptions.organization` was added so multi-org tokens can
   select scope without a domain redesign.
2. **CredentialsStore:** Still single-token per provider. PlanetScale pair is
   encoded as `id:secret` (official Authorization form). No CredentialVault.
3. **Smallest credential adaptation:** encode/decode helpers + connect-layer
   dual env-var resolution; Provider still receives one string.
4. **Connection scope:** Organization stable `id` → `accountId`; organization
   `name` (slug) → `accountName`. API paths use the slug; discovery re-resolves
   the connected org by id.
5. **Multi-org:** Zero orgs → fail; one org → accept; many orgs without
   `--organization` → fail listing accessible slugs; explicit inaccessible
   slug → fail. Never silent first-org choice.
6. **Object model:** Organization → Database → Branch. Deploy requests,
   passwords, Insights, schema, backups remain out of scope.
7. **Stable native IDs:** Organization `id`, Database `id`, Branch `id`.
8. **First-class selection:** Database only. Branches are compact metadata.
9. **Generic `database` kind:** Reused (already used by Cloudflare D1). No
   `planetscale_database` / engine-specific kinds.
10. **Engine diversity:** `metadata.engine` from API `kind` (`mysql` |
    `postgresql`).
11. **Branch evidence:** id, name, production, ready, schemaReady, parentBranch,
    region slug, engine. Sorted by name.
12. **Known-empty vs unknown:** Successful empty branch list → `branches: []`.
    Failed branch enrichment → key omitted; sync preserves prior value.
13. **Deterministic normalization:** Branch arrays sorted by name; noisy counters
    (insights, recommendations, sleep/resize flags, plan, raw hosts) excluded.
14. **Volatile/noisy fields:** Database `state` (includes sleep cycles), plan,
    insights flags, IP lists, host addresses, schema recommendation counts.
15. **Change detection:** Unchanged generic engine. Proven baseline, identical
    resync, ordering noise, rename/meaningful metadata Change.
16. **History/Context:** Unchanged generic paths; zero Relationships expected.
17. **Relationship evidence:** See Evidence Report (no A-class joins observed).
18. **vs Neon:** PlanetScale exposes production branch flags and engine kind at
    the Database level more directly; still no shared stable app→DB identity.
19. **DatabaseProvider abstraction:** Not necessary. Two database providers fit
    Resource + metadata.
20. **Canon:** No VISION / ARCHITECTURE / ROADMAP / SKILL change required.
    AGENTS.md operational baseline updated to list PlanetScale.

Official API facts verified against PlanetScale docs (2026-08-08):
[service tokens](https://planetscale.com/docs/api/reference/service-tokens),
[list organizations](https://planetscale.com/docs/api/reference/list_organizations),
[list databases](https://planetscale.com/docs/api/reference/list_databases),
[list branches](https://planetscale.com/docs/api/reference/list_branches),
[pagination](https://planetscale.com/docs/api/reference/pagination).

### PlanetScale Resource Contract

```text
kind: database
provider: planetscale
id: planetscale:database:<database-id>
providerResourceId: <database-id>
name: <database name>
metadata:
  engine?: mysql | postgresql
  region?: <region slug>
  ready?: boolean
  defaultBranch?: string
  productionBranchesCount?: number
  developmentBranchesCount?: number
  branches?: [            # omitted = unknown; [] = known empty
    {
      id, name, production, ready,
      schemaReady?, parentBranch?, region?, engine?
    }
  ]  # sorted by name
```

### Credential + Scope Contract

| Concern | Decision |
|---------|----------|
| Storage | Existing `CredentialEntry = { token: string }` |
| Encoding | `PLANETSCALE_SERVICE_TOKEN_ID:PLANETSCALE_SERVICE_TOKEN` |
| Auth header | `Authorization: <id>:<secret>` (no Bearer) |
| Env | `--use-env` requires both env vars |
| Flags | `--token-id` + `--token`; optional `--organization` |
| Scope | `accountId = organization.id`, `accountName = organization.name` |

### API Request Behavior

```text
GET /v1/organizations?page&per_page
  → resolve organization scope
GET /v1/organizations/{org}/databases?page&per_page
  → first-class database Resources
GET /v1/organizations/{org}/databases/{db}/branches?page&per_page
  → optional branch enrichment (failure → unknown)
```

No password, role, deploy-request, Insights, or schema endpoints.

### Change Compatibility

| Case | Result |
|------|--------|
| Initial sync | Baseline (no Change) |
| Identical resync | No Change |
| Reversed branch order | No Change (sorted) |
| Database rename | Generic `updated` Change |
| Branch enrichment failure after known branches | No false removal (preserve keys) |

### Validation

- `bun test` — 378 pass, 0 fail
- `bun run typecheck` — clean
- Secret scan of implementation: both credential components redacted; hosts,
  passwords, and connection strings never persisted in Resources
- Live verification: **deferred** — no authorized PlanetScale service token in
  the environment at implementation time. Offline History/Context paths proven
  via fixtures/multi-provider tests without live credentials.

### PlanetScale Evidence Report

#### Resource Representation

Chosen first-class Resource: PlanetScale **Database** as generic Combie
`database`. One Resource per database; stable identity is the provider database
id. Branches are compact nested evidence.

#### Rejected Alternatives

| Alternative | Why rejected |
|-------------|--------------|
| Database + Branch as Resources | Branches are environment topology within a database; no independent cross-provider product value yet; would invent hierarchy Relationships |
| Organization as Resource | Connection scope, not engineering inventory |
| Deploy requests / Insights / schema / passwords | Out of scope; secret-adjacent or operational noise |
| Engine-specific kinds | Engine is metadata; generic `database` already exists |

#### Credential Contract

Two-part service token encoded as one opaque provider-scoped string. Both
components redacted on errors. No generic secret-management subsystem.

#### Connection Scope

Organization-scoped. Stable org id + name slug. Multi-org requires explicit
`--organization`. Token id is never used as account identity.

#### Stable Identities

- Database: `planetscale:database:<id>`
- Branch ids retained only in metadata

#### Useful Normalized Facts

Engine, region slug, ready, default branch name, production/development branch
counts, compact branch summary (id/name/production/ready/schemaReady/parent/region/engine).

#### Authority Semantics

Known-empty ≠ unknown. Optional branch enrichment failures omit `branches`.
Sync preserves prior branch evidence when re-enrichment fails.

#### Relationship Evidence Candidates

| Candidate | Class | Notes |
|-----------|-------|-------|
| Shared stable GitHub/Vercel/Sentry ids on PS resources | — | **Not observed** in list database/branch responses |
| Branch / database hostnames (`*.psdb.cloud`) | D | Connection infrastructure; secret-adjacent; not a proven app join |
| Database / branch display names matching apps | C | Weak name collision only |
| `html_url` app paths | C | Provider-local URLs, not shared stable foreign ids |
| Targeted enrichment for integration metadata | B | Not present on current list endpoints used; not chased with extra calls |

#### Missing Evidence for application→database join

- No shared project/repo/deployment id on PlanetScale list responses
- No safe non-secret connection identity that other providers also expose
  deterministically
- No authorized environment-variable or Vercel env ingestion in scope

### Neon Comparison

| Dimension | Neon (Sprint 013) | PlanetScale (Sprint 014) |
|-----------|-------------------|--------------------------|
| Primary Resource | `project` | `database` |
| Hierarchy as metadata | branches, default-branch databases, endpoints | branches |
| Generic kinds reused | `project` | `database` |
| Overlapping concepts | region, branches, readiness-ish facts, stable provider ids | engine, region, branches, ready, default branch |
| Provider-specific | pg_version, endpoint ids, org_name on project | production branch flag, mysql/postgresql kind, production/dev branch counts |
| Credential shape | single API key | service-token id + secret pair |
| Scope ambiguity | multi-org personal keys rejected | multi-org requires `--organization` |
| Generic database abstraction needed? | No | No — two different primary kinds still fit one Resource model |

**Conclusion:** Combie can represent PlanetScale database infrastructure with the
same Resource / Change / History / Context architecture validated by Neon. The
providers do not need identical internal models. A `DatabaseProvider` abstraction
is not justified.

**Next relationship investigation (do not implement):** deterministic evidence for
application→database joins after studying both Neon and PlanetScale. Prefer
future provider-backed integration ids (class A/B) over name matching (C) or
connection strings/hosts (D). Candidates to investigate later: authorized
environment variable references from application providers, official integration
metadata if exposed, and any shared stable project identifiers—not hostname or
name collision alone.

### Deviations

- None material. Preferred Database + branch-metadata representation was
  confirmed by API evidence.
- Sync kind label for `database` generalized from `D1 database` → `database` so
  PlanetScale and Cloudflare share accurate user-facing wording.

### Learnings

1. Two-part credentials do not require a secret-management subsystem when the
   Provider contract remains single-token and encoding matches the provider's
   own Authorization form.
2. Organization-scoped discovery with multi-org ambiguity is solved at connect
   time with explicit selection — same trust posture as Neon's single-org rule.
3. Reusing generic `database` for PlanetScale while Neon uses `project` is
   healthy provider truth, not inconsistency.
4. Engine diversity belongs in metadata; inventing `vitess_database` /
   `postgres_database` kinds would overfit.
5. Second database provider still does not justify a domain-level
   `DatabaseProvider`.

### Canon Changes

- Permanent Canon (VISION, ARCHITECTURE, ROADMAP, SKILL): **unchanged**
- `AGENTS.md` operational baseline updated to include PlanetScale credentials
  and provider list

### Explicit answers

> Can Combie represent PlanetScale database infrastructure using the same core
> Resource/Change/History/Context architecture validated by Neon?

**Yes.** PlanetScale enters as generic `database` Resources with optional branch
metadata. Generic Change detection, History, and Context work without provider-
specific logic.

> After studying Neon and PlanetScale, what deterministic evidence should Combie
> investigate next for application→database relationships?

Provider-backed integration or environment references that expose stable foreign
ids (class A/B), not database names, Git branch names, or hostnames (C/D). Do not
implement that relationship in this Sprint.

## Definition of Done

- [x] inspect `ea7ba3e`
- [x] verify current official PlanetScale API/docs
- [x] Repository Understanding + Architecture Pressure reports
- [x] provider contract preserved unless proven insufficient
- [x] safe two-part credential handling
- [x] explicit auth
- [x] deterministic organization scope/multi-org behavior
- [x] paginated database discovery
- [x] smallest useful Resource representation
- [x] rejected alternatives documented
- [x] generic `database` kind reused if appropriate
- [x] stable native IDs
- [x] engine in metadata
- [x] compact non-secret metadata
- [x] deterministic branch evidence if used
- [x] known-empty vs unknown preserved
- [x] credentials/passwords/connection strings absent
- [x] both auth components redacted
- [x] generic provider flows registered
- [x] generic Change/History/Context work
- [x] six-provider partial failure works
- [x] no new Relationship/resolver
- [x] PlanetScale Evidence Report + Neon comparison
- [x] repeated sync idempotent
- [x] live verification or explicit defer
- [x] offline read verification if live data exists
- [x] all prior/full tests + typecheck pass
- [x] secret scan + full diff clean
- [x] Canon accurate
- [x] completion notes updated
- [x] worktree clean
- [x] Sprint 015 not started

## What Sprint 014 Proves

```text
Neon                    PlanetScale
  │                          │
  └──── database context ────┘
               │
               ▼
       same Combie primitives
 Resource + Change + History + Context
```

The providers do not need identical internal models. They need to enter the same small Combie knowledge model truthfully.

## Final Principle

> **The provider keeps its native truth; Combie normalizes only what humans and agents need to understand the engineering system.**

Connect PlanetScale.

Resolve its real scope.

Discover databases.

Enrich only when useful.

Normalize deterministic non-secret evidence.

Let Memory and Context work automatically.

Compare Neon and PlanetScale.

Do not infer database relationships yet.

Then stop.
