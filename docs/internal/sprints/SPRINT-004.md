# SPRINT-004 — Sentry Connection

> **Roadmap:** v0.1 — Connection
> **Status:** Complete
> **Depends on:** SPRINT-003 — Vercel Connection
> **Scope:** Fourth and final provider-pressure slice for v0.1 Connection
> **Provider:** Sentry

## Goal

Add Sentry as Combie's fourth real engineering provider and validate the connection architecture against an operational/error-context system.

```text
Existing Combie installation
      ↓
Connect Sentry
      ↓
Discover Sentry projects
      ↓
Normalize projects into Combie Resources
      ↓
Persist beside Cloudflare + GitHub + Vercel
      ↓
Sync all connected providers
      ↓
Inspect the unified engineering inventory
```

Sprint 004 does not ingest Sentry issues, events, stack traces, logs, traces, metrics, alerts, or incident data. It proves connection and resource discovery only.

## Why This Sprint Exists

The first three Sprints established:

```text
Cloudflare → infrastructure
GitHub     → source
Vercel     → application platform
```

Sentry introduces:

```text
Sentry → operational / error context
```

This Sprint asks:

> Can Combie represent an engineering system whose primary purpose is observing software without changing the core connection architecture or prematurely becoming an observability platform?

If yes, the v0.1 provider foundation has been validated across four meaningfully different engineering-system categories.

## Strategic Role

Sprint 004 is intended to be the final provider-pressure Sprint before reassessing v0.1 Connection.

Success does not mean Combie supports every provider it eventually should. It means provider count no longer needs to be the primary architecture test.

Additional providers can then be prioritized by user demand and roadmap need.

## User Outcome

A user can run:

```bash
combie connect sentry
combie sync
combie providers
combie resources
```

and see Sentry beside existing providers.

Conceptually:

```text
PROVIDER     STATUS
Cloudflare   Connected
GitHub       Connected
Vercel       Connected
Sentry       Connected
```

with Resources such as:

```text
TYPE         NAME          PROVIDER
zone         usecmd.dev    cloudflare
repository   combie        github
project      combie        vercel
project      combie        sentry
```

Exact formatting is not contractual.

## Sprint Principle

> **Connect Sentry. Do not build observability.**

Issues, events, traces, telemetry, and investigations are highly relevant to Combie's long-term vision. They are intentionally excluded here.

## Scope

Sprint 004 includes:

1. Sentry provider registration
2. explicit Sentry authentication
3. identity/scope validation
4. organization discovery only as required to reach projects
5. Sentry project discovery
6. project normalization into existing Resource
7. stable Sentry project identity
8. persistence beside existing providers
9. four-provider synchronization
10. provider/resource inspection
11. Sprints 001–003 regression coverage
12. Sentry adapter tests
13. representative live Sentry verification
14. final v0.1 provider-architecture assessment in completion notes

Everything else is out of scope.

## Existing Architecture

Preserve:

```text
                             ┌→ Cloudflare adapter
                             ├→ GitHub adapter
CLI → Application → Provider contract
                             ├→ Vercel adapter
                             └→ Sentry adapter

Application → SQLite + credential storage
```

Sentry-specific API behavior belongs in the adapter.

## Architecture Pressure Report

Before implementation answer:

1. Can Sentry use the existing provider contract unchanged?
2. Can Resource represent a Sentry project cleanly?
3. Can Sentry and Vercel both use `project` without identity ambiguity?
4. Does provider-aware identity safely distinguish same-kind Resources?
5. Does the registry accept a fourth provider without redesign?
6. Does sync scale naturally from three to four providers?
7. Can existing credential storage support Sentry safely?
8. Can Sentry organizations remain provider-specific discovery context rather than new domain Resources?
9. Does any proposed change regress existing providers?

Prefer the smallest extension possible.

## Identity Pressure Test

Vercel and Sentry both expose `project`.

This is intentional.

Combie must preserve provider provenance. Conceptually:

```text
vercel + project + provider-id
sentry + project + provider-id
```

are distinct Resources.

Do not introduce `vercel_project` and `sentry_project` merely to avoid testing the identity model unless implementation proves the shared kind is genuinely wrong.

Normalization should create useful shared concepts without pretending providers are identical.

## Connect Sentry

Required capability:

```bash
combie connect sentry
```

Authentication must be explicit.

Use the smallest safe mechanism consistent with existing auth patterns, such as an explicitly supplied Sentry token or intentionally exposed environment variable.

Do not silently read private Sentry credential/config files.

## Credential Rules

Combie may accept an explicit token, use an intentionally exposed token, validate it, and persist it through the existing credential boundary.

It must not scan arbitrary files, shell history, unrelated `.env` files, silently copy credentials, print tokens, store secrets in domain tables, or request unnecessary write access.

## Authentication Scope

Require only read access sufficient to validate identity/scope and discover organizations/projects.

Do not request issue mutation, project/release/alert/team/org administration, event deletion, or other write capabilities.

## Organization Handling

Sentry projects belong to organizations.

For Sprint 004:

> Organization is discovery context, not a required first-class Combie Resource.

Keep organization identity in provider configuration or project metadata where useful.

Do not add `organization` to the Engineering Model solely because the Sentry API uses organization scope.

## Project Discovery

The only required Sentry Resource type is:

```text
project
```

Conceptually:

```yaml
provider: sentry
provider_resource_id: stable-sentry-project-id
kind: project
name: combie
metadata:
  slug: combie
  organization_slug: example-org
  platform: javascript-nextjs
```

Use the repository's actual Resource representation.

### Stable Identity

Use Sentry's stable project identifier where available, not name/slug alone.

Rename or slug changes should not create duplicate Resources when the provider identifies the same underlying project.

### Metadata

Keep metadata small and use fields already available during discovery, such as slug, organization identifier, platform, status, or creation date.

Do not make extra API calls purely for enrichment.

## Four-Provider Sync

Existing:

```bash
combie sync
```

must handle all configured providers and preserve Sprint 002 continue-on-error semantics.

A Sentry failure must not discard successful results from other providers.

Do not add queues, background workers, retry engines, scheduling, webhooks, or event streams.

## Provider Registry Pressure

Four providers still do not justify a plugin runtime.

Adding Sentry should ideally require adapter implementation, registration, auth resolution, and tests.

If repetitive branching has become a concrete current problem, make only the smallest correction required by these four real providers.

## CLI

`combie providers` must represent Sentry.

`combie resources` must show Sentry projects.

The known large-inventory UX issue remains deferred. Do not turn this Sprint into resource-browser redesign.

## Regression Requirement

Preserve all Sprint 001–003 behavior, including Cloudflare/GitHub/Vercel connection and discovery, the Vercel identity correction, stable identities, SQLite persistence, credential separation, partial failure, restart persistence, CLI behavior, and secret-safe errors.

## Testing

All existing tests must pass.

### Sentry Adapter

Use fixtures/mocks so normal tests require no live credentials.

Cover:

- authentication/identity validation
- organization discovery where required
- project discovery
- pagination where required
- normalization
- stable identity
- empty results
- multiple organizations if supported by chosen behavior
- auth/permission/API failures
- meaningful malformed responses
- secret-safe errors

### Identity

Explicitly prove that a Vercel `project` and Sentry `project` with equal provider resource IDs cannot collide because provider provenance participates in identity.

### Persistence

Verify Sentry persistence, four-provider coexistence, repeated-sync idempotency, restart persistence, and independent sync metadata.

### Multi-provider

Prove all four providers can succeed together and include one representative partial failure involving Sentry.

Do not build a combinatorial failure matrix.

### CLI

Where practical, cover Sentry connect parsing, help, provider/resource listing, auth guidance, and sync errors/summaries.

## Manual Verification

Sprint 004 is not complete until a real Sentry account validates:

```bash
bun run combie connect sentry <explicit-auth-option>
bun run combie sync
bun run combie providers
bun run combie resources
```

Verify real projects are discovered as `project`, persist without duplicates, coexist with existing provider Resources, survive restart, and expose no credentials.

Record concise live results in completion notes.

## Error Behavior

Errors must be actionable and secret-safe.

Expected cases include missing auth, invalid/expired token, insufficient permissions, no accessible scope, API failure, malformed response, and persistence failure.

## Explicitly Out of Scope

Do not implement:

- Sentry issues/events/stack traces
- issue/event ingestion
- releases, commits, deploys
- alerts or monitors
- sessions/replays
- logs, metrics, traces, spans
- profiling/performance data
- OpenTelemetry or telemetry storage
- Sentry webhooks/background polling
- relationships of any kind
- Engineering Graph
- application grouping/environments
- Observations, Changes, timelines, memory
- investigations/recommendations/learning
- Slack
- Railway/Render/Fly.io
- hyperscalers/Kubernetes/Terraform
- Datadog/Prometheus
- MCP/API/SDK/web app
- AI/model providers
- controlled/autonomous execution
- hosted Combie/billing/marketplace
- resource-list UX redesign

Do not scaffold these capabilities.

## Anti-Overengineering Rules

Do not introduce:

```text
ObservabilityEngine
SentryIssueStore
TelemetryPipeline
EventIngestionEngine
IncidentEngine
RelationshipEngine
EngineeringGraph
ProviderPluginRuntime
UniversalProviderSDK
MCPGateway
```

Sentry is evidence for Connection, not permission to start Context, Memory, Investigation, or Execution early.

## Repository Understanding Requirement

Before coding, follow `skills/build-combie/SKILL.md` and inspect the completed Sprint 003 repository.

Identify the provider contract/registry, three adapters, Resource/kind model, identity formula, Vercel identity fix, credentials, provider config, SQLite schema, sync/partial failure, CLI auth routing, tests, Sentry extension points, and any concrete fourth-provider pressure.

## Implementation Plan

Before coding, produce a concise plan covering Sentry auth, organization/scope discovery, project discovery/pagination, adapter/normalization, any Resource/contract/registry changes, sync/persistence/CLI impact, tests, and live verification.

Then implement using Red → Green → Refactor.

## Documentation Rules

The permanent Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Do not create additional permanent architecture documents. Adding Sentry alone should not require Canon changes.

## Sprint Completion Notes

### Implemented

- Sentry provider adapter (`src/providers/sentry/`): errors, client, normalize, adapter
- Identity via live-compatible `GET /auth/` (personal tokens often 403 on `/users/me/`)
- Organization discovery as adapter-local context only; projects via `GET /organizations/{slug}/projects/` with Link-header pagination
- Shared `project` kind reused (no `organization` ResourceKind; no `sentry_project` kind)
- Stable identity: `sentry:project:{numeric-id}` via existing `provider:kind:providerResourceId`
- Registry entry `sentry`; connect auth `--token` / `--use-env` (`SENTRY_AUTH_TOKEN`, fallback `SENTRY_TOKEN`)
- CLI help lists Sentry and env var
- Fixtures + adapter/normalize tests; multi-provider four-provider coexistence, partial failure, persistence, and Vercel↔Sentry identity collision tests
- Carried Sprint 003 Vercel live identity fix (`id`/`uid` + connect requires string `accountId`) into the same commit baseline

### Architecture Pressure Results

| Component | Survived unchanged? | Notes |
|---|---|---|
| Provider contract (`types.ts`) | YES | No changes |
| Resource model (`resource.ts`) | YES | Reused existing `project` kind from Sprint 003 |
| Shared `project` kind | YES | Vercel + Sentry both use `project`; provenance is the provider field |
| Identity scheme | YES | `vercel:project:X` ≠ `sentry:project:X` proven in unit + multi-provider tests |
| Registry (`registry.ts`) | YES | One map entry |
| Persistence (`store.ts`) | YES | No schema changes |
| Sync orchestration (`sync.ts`) | Minimal | NO_PROVIDERS help text only; `project` label already present |
| Credentials | YES | `setCredential("sentry", token)` |
| CLI | Help text only | Provider list, env var, example |
| Organizations as domain Resources | Not required | Org slug/id live only in adapter discovery + project metadata |

### Deviations

- Identity endpoint: sprint conceptually said “validate identity/scope”; implementation uses `GET /auth/` rather than `/users/me/` because live personal tokens return 403 on `/users/me/` while `/auth/` returns user `id`/`username`/`email`. Discovery path (orgs → projects) unchanged.
- Live account inventory had **zero** Sentry projects; discovery and empty-result path verified live; non-empty normalization covered by fixtures/mocks.

No issues/events/telemetry, relationships, graph, memory, AI, MCP, or execution.

### Validation

- **Automated**: 111 tests across 14 files, 529 expect() calls, typecheck clean. No live Sentry credentials required for the suite.
- **Live verification** (temp dir, real personal token):
  - `combie init` → `connect sentry --use-env` → Connected Sentry (account: sgr0691@gmail.com)
  - `combie sync` → 0 resources (org `sergio-3l` has no projects); exit 0; repeated sync still 0, no duplicates
  - `combie providers` → Sentry Connected
  - `combie resources` → empty inventory message
  - Credentials file mode `0600`; token absent from domain tables / CLI output
- **Live identity learning**: `/users/me/` → 403; `/auth/` → 200 with user id — adapter updated accordingly.

### Learnings

> Has the v0.1 provider connection foundation now been validated across enough distinct provider categories to stop using provider count as the primary architecture test?

**Yes.** Four real categories exercised the same path without redesign:

```text
Cloudflare ─ infrastructure
GitHub     ─ source
Vercel     ─ application platform
Sentry     ─ operational / error context
```

Sprint 004 required **no** ResourceKind additions, **no** contract changes, and **no** persistence/sync redesign. Shared `project` with provider-aware identity held under intentional collision tests. Org scoping stayed adapter-local. Fourth-provider registry pressure was a single map entry — not a plugin runtime.

Live API field/endpoint mismatch (Vercel `id`/`uid` in Sprint 003; Sentry `/auth/` vs `/users/me/` here) remains the main residual risk: fixtures must track live auth shapes, not only docs historical paths.

### v0.1 Connection Assessment

Provider-pressure for v0.1 Connection is **validated** across four distinct engineering-system categories. Provider count no longer needs to be the primary architecture test.

What may still remain before treating v0.1 Connection as product-complete (not required by this Sprint):

- Optional additional providers driven by demand (e.g. Railway/Render/Fly, Slack) — not architecture validation
- Resource-list UX for large inventories (already deferred)
- Moving from inventory (**what exists**) to relationships (**how it fits together**) — that is v0.2 Context, not more Connection pressure

Do **not** define or start Sprint 005 here.

### Canon Changes

None.

## Definition of Done

Sprint 004 is complete only when:

- [x] all Sprint 001–003 behavior remains functional
- [x] Sentry can be explicitly connected
- [x] auth does not silently harvest credentials
- [x] Sentry identity/scope is validated sufficiently for discovery
- [x] real Sentry projects can be discovered
- [x] projects normalize into provider-independent Resource
- [x] Sentry project identity uses a stable provider ID
- [x] Vercel and Sentry `project` Resources cannot collide
- [x] Sentry Resources persist locally
- [x] all four provider Resources coexist
- [x] `combie sync` handles all connected providers
- [x] partial-failure behavior remains correct
- [x] repeated sync does not duplicate Sentry projects
- [x] provider/resource commands represent Sentry
- [x] automated tests require no live Sentry credentials
- [x] all existing tests pass
- [x] typecheck/lint requirements pass
- [x] real Sentry connection is manually verified
- [x] existing providers remain valid
- [x] credentials are absent from output/committed files
- [x] no issues, events, telemetry, relationships, graph, memory, AI, MCP, or execution work was introduced
- [x] full diff is reviewed
- [x] Canon remains accurate
- [x] completion notes include the v0.1 Connection assessment
- [x] repository state is clean

## What Sprint 004 Proves

```text
Cloudflare ─ infrastructure ───────┐
GitHub ───── source ───────────────┤
Vercel ───── application ──────────┼→ Combie Resource → SQLite → CLI
Sentry ───── operational context ──┘
```

Success validates the connection foundation across four distinct engineering-system categories.

The next major product question becomes:

> How does Combie understand how these Resources fit together?

That belongs after Sprint 004.

## Final Principle

> **Connect operational context without becoming an observability platform.**

Connect Sentry. Discover projects. Normalize them through the same Resource model. Persist them beside the rest of the engineering stack. Verify the architecture one final time.

Then stop.

Only after Sprint 004 is complete and reviewed should Combie decide how to move from **what exists** toward **how it fits together**.
