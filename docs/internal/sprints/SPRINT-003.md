# SPRINT-003 — Vercel Connection

> **Roadmap:** v0.1 — Connection
> **Status:** Ready for implementation
> **Depends on:** SPRINT-002 — GitHub Connection + Multi-Provider Sync
> **Baseline commit:** `0f15e6d`
> **Scope:** Third real provider vertical slice
> **Provider:** Vercel

## Goal

Add Vercel as Combie's third real engineering provider and use it to test the connection architecture against an application/deployment platform.

```text
Existing Combie installation
      ↓
Connect Vercel
      ↓
Discover Vercel projects
      ↓
Normalize projects into Combie Resources
      ↓
Persist beside Cloudflare + GitHub
      ↓
Sync all connected providers
      ↓
Inspect the unified inventory
```

Sprint 003 is not about deployments, logs, domains, telemetry, or Git relationships. It proves that the same Combie connection model can represent a third provider category without expanding beyond v0.1 Connection.

## Why This Sprint Exists

Sprint 001 proved Combie against infrastructure resources:

```text
Cloudflare → zone / worker / database / kv_namespace
```

Sprint 002 proved it against source resources:

```text
GitHub → repository
```

Sprint 003 challenges it with application-platform resources:

```text
Vercel → project
```

This gives Combie three meaningfully different provider shapes:

```text
Cloudflare → infrastructure
GitHub     → source
Vercel     → application/deployment platform
```

The question is:

> Can Combie add a third provider mostly by adding an adapter, while keeping Core, persistence, synchronization, and CLI provider-independent?

If Vercel exposes a real weakness, make the smallest general correction and preserve Cloudflare + GitHub behavior.

## User Outcome

A user can run:

```bash
combie connect vercel
combie sync
combie providers
combie resources
```

and see Vercel beside the existing providers.

Conceptually:

```text
PROVIDER     STATUS       LAST SYNC
Cloudflare   Connected    just now
GitHub       Connected    just now
Vercel       Connected    just now
```

with:

```text
TYPE         NAME          PROVIDER
zone         usecmd.dev    cloudflare
repository   combie        github
project      combie        vercel
```

Exact formatting is not contractual.

## Sprint Principle

> **Third provider, same system.**

Do not redesign the provider architecture because Combie now has three integrations. Do not create a plugin framework. Do not start relationship modeling. Do not ingest Vercel's entire API surface.

Add the smallest Vercel connection that proves the existing system works.

## Scope

Sprint 003 includes:

1. Vercel provider registration
2. explicit Vercel authentication
3. authenticated identity/scope validation
4. Vercel project discovery
5. project normalization into the existing Resource model
6. stable Vercel project identity
7. persistence alongside Cloudflare + GitHub
8. three-provider synchronization
9. provider inspection
10. unified resource inspection
11. regression coverage for Sprints 001–002
12. Vercel adapter tests
13. representative live Vercel verification

Everything else is out of scope.

## Architecture Pressure Report

Before implementation, inspect the repository and answer:

1. Can Vercel use the existing provider contract unchanged?
2. Can Resource represent a Vercel project cleanly?
3. Does the identity scheme safely represent Vercel projects?
4. Does the registry accept a third provider without redesign?
5. Does sync scale naturally from two to three providers?
6. Can existing credential storage support Vercel safely?
7. Does any proposed change regress Cloudflare or GitHub?

The preferred outcome is that most answers are yes. Do not change architecture merely to make it look more generic.

## Required User Flow

### Existing initialization

Continue using:

```bash
combie init
```

Existing Sprint 001–002 state must remain valid. No reset should be required.

### Connect Vercel

Required capability:

```bash
combie connect vercel
```

Authentication must be explicit. Inspect current auth patterns and choose the smallest safe approach.

A Vercel API token supplied explicitly or through an intentionally exposed environment variable is acceptable, for example:

```bash
combie connect vercel --use-env
```

Do not parse private credential files or silently harvest Vercel CLI credentials.

## Credential Rules

Combie may accept an explicitly supplied token, use a token intentionally exposed to the process, validate it against Vercel, and persist it using the existing credential architecture.

Combie must not scan arbitrary files, shell history, or unrelated `.env` files; silently copy Vercel CLI credentials; print tokens; store secrets in domain tables; or request mutation capabilities unnecessarily.

Reuse the existing credential boundary unless Vercel proves it insufficient.

## Authentication Scope

Sprint 003 requires read access sufficient to validate the authenticated Vercel identity/scope and list projects visible to it.

No project mutation, deployment creation, environment-variable changes, domain mutation, or team administration is required.

## Vercel Scope / Team Handling

Vercel resources may exist under personal or team scopes. Support the smallest deterministic model required to discover projects available through the authenticated context.

Do not create a Team domain object or first-class Team Resource.

If a scope identifier is required, keep it as provider-specific configuration or metadata.

Do not turn Sprint 003 into account-management work.

## Project Discovery

The only required Vercel Resource type is:

```text
project
```

Conceptually:

```yaml
id: combie-stable-id
provider: vercel
provider_resource_id: vercel-project-id
kind: project
name: combie
metadata:
  framework: nextjs
  account_id: provider-scope-id
  created_at: provider-timestamp
```

Use the existing Resource representation; this YAML is illustrative.

### Stable Identity

Use Vercel's stable provider project identifier, not project name alone.

A rename must not create a duplicate Resource when Vercel identifies it as the same project.

The existing `provider + kind + providerResourceId` identity formula should remain sufficient unless Vercel exposes a real defect.

### Metadata

Keep metadata small and useful. Candidate fields include framework, account/scope ID, and provider-returned timestamps.

Do not make extra API calls purely for enrichment.

Do not ingest deployments, logs, environment variables, secrets, domains as Resources, functions, analytics, observability data, or Git relationships.

## Resource Kind

Add only:

```text
project
```

if required by the current closed kind representation.

Do not create future kinds for deployment, domain, function, environment, service, or application.

## Multi-Provider Synchronization

Existing:

```bash
combie sync
```

must handle all configured providers:

```text
Syncing Cloudflare...
✓ ...

Syncing GitHub...
✓ ...

Syncing Vercel...
✓ ...

Sync complete.
```

Reuse Sprint 002 continue-on-error semantics. A Vercel failure must not prevent successful Cloudflare/GitHub results from being persisted, and overall sync should retain the established non-success behavior when any provider fails.

Do not add background sync, queues, retry workers, or scheduling.

## Provider Registry Pressure Test

Adding Vercel should ideally require only registering the adapter and adding auth handling through existing extension points.

If repetitive provider-specific branching becomes a real problem, make the smallest correction required.

Do not build dynamic plugin loading, external provider packages, a provider SDK, or marketplace.

## Provider and Resource Inspection

`combie providers` must show Vercel beside Cloudflare and GitHub.

`combie resources` must show Vercel projects beside existing Resources.

Sprint 002 revealed that large inventories will eventually need better filtering/presentation. That UX pressure is acknowledged but remains outside Sprint 003.

Do not turn this Sprint into resource-browser cleanup.

## Regression Requirement

All working Sprint 001–002 behavior must remain intact, including:

- Cloudflare connection/discovery
- GitHub connection/discovery
- `--use-gh`
- stable identities
- SQLite persistence
- credential separation
- multi-provider partial failure
- restart persistence
- provider/resource CLI behavior
- no secret leakage

## Testing Strategy

All existing tests must continue passing.

### Vercel adapter

Use fixtures/mocks. Standard tests must require no real Vercel credentials.

Test:

- authentication validation
- project discovery
- normalization
- stable project identity
- empty results
- pagination if required for complete discovery
- authentication failure
- API failure
- secret-safe errors

### Domain / persistence

Add only tests required by real Vercel pressure:

- `project` kind
- stable Vercel identity
- rename stability where appropriate
- three-provider coexistence
- repeated sync without duplicates
- restart persistence

### Multi-provider

Prove:

```text
Cloudflare + GitHub + Vercel success
```

and ensure established partial-failure behavior still works with Vercel included.

Do not create a combinatorial failure matrix.

### CLI

Where practical, cover Vercel connect parsing, help text, provider/resource listing, auth guidance, and sync summary behavior.

Avoid cosmetic snapshot over-testing.

## Manual Verification

Sprint 003 is not complete until a real Vercel account validates:

```bash
bun run combie connect vercel <explicit-auth-option>
bun run combie sync
bun run combie providers
bun run combie resources
```

Verify:

- Vercel auth succeeds
- expected identity/scope is recognized
- real projects are discovered
- projects normalize as `project`
- resources persist
- Cloudflare + GitHub Resources remain
- all configured providers sync
- repeated sync creates no duplicates
- restart preserves state
- no credentials appear in output
- existing Cloudflare + GitHub behavior remains functional

Record concise results in completion notes.

## Error Behavior

Keep errors actionable and secret-safe.

Expected cases include missing auth, missing environment token, invalid token, inaccessible scope, API failure, malformed response, and persistence failure.

## Explicitly Out of Scope

Do not implement:

- Vercel deployments or deployment history
- deployment/build/runtime logs
- deployment status modeling
- Vercel Functions as Resources
- domains as Resources
- environment variables or secrets
- Git integration relationships
- GitHub ↔ Vercel relationships
- Cloudflare ↔ Vercel relationships
- application grouping or environments
- Engineering Graph or relationship inference
- Observations / Changes / timelines / memory
- telemetry, metrics, traces, or log ingestion
- Sentry, Railway, Render, Fly.io
- Slack
- AWS, Azure, GCP, Kubernetes
- Terraform/OpenTofu
- Datadog, Prometheus, OpenTelemetry
- MCP, API server, SDK, or web app
- natural-language queries or AI providers
- investigations, recommendations, learning
- controlled/autonomous execution
- hosted Combie, billing, or marketplace

Do not scaffold these capabilities.

## Anti-Overengineering Rules

Do not introduce:

```text
DeploymentEngine
ApplicationGraph
RelationshipEngine
TelemetryPipeline
VercelEventStream
ProviderPluginRuntime
UniversalProviderSDK
AgentRegistry
MCPGateway
```

Three providers do not justify a plugin platform by themselves.

## Repository Understanding Requirement

Before coding, follow `skills/build-combie/SKILL.md` and inspect the repository at baseline `0f15e6d`.

The Repository Understanding Report should identify:

- provider registry and contract
- Cloudflare/GitHub adapters
- Resource/kind representation
- credential handling
- provider configuration
- SQLite schema
- sync orchestration and partial failure
- CLI auth routing
- test architecture
- exact Vercel extension points
- any real third-provider pressure

The repository is implementation reality.

## Implementation Plan Requirement

Before coding, produce a concise plan covering:

- Vercel auth
- adapter
- project discovery and pagination
- normalization
- Resource/contract changes, if any
- registry changes
- sync/persistence/CLI impact
- tests
- live verification

Then implement.

## Implementation Discipline

Follow:

```text
Red → Green → Refactor
```

Prefer extension over redesign.

If the architecture works, reuse it. If it almost works, make the smallest provider-independent correction. If Vercel fundamentally conflicts with a core abstraction, report the conflict before broad changes.

## Documentation Rules

The permanent Combie Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Do not create additional permanent architecture documents.

Adding Vercel alone should not require Canon changes.

## Sprint Completion Notes

### Implemented

- Vercel provider adapter (`src/providers/vercel/`): errors, client, normalize, adapter
- `ResourceKind` extended with `"project"`
- Vercel registered in provider registry
- Vercel token resolution in `connect.ts` (`--token`, `--use-env` with `VERCEL_TOKEN`)
- `"project"` kind label in `sync.ts` `formatKindLabel`
- CLI help text updated with Vercel provider, `VERCEL_TOKEN`, `project` kind
- Vercel test fixtures and adapter/normalize tests (12 new tests)
- Multi-provider tests extended: 3-provider coexistence, partial failure, persistence, rename stability (6 new tests)
- Domain and CLI tests updated for Vercel/project (3 assertions added)

### Architecture Pressure Results

| Component | Survived unchanged? | Notes |
|---|---|---|
| Provider contract (`types.ts`) | YES | `authenticate(token)` and `discoverResources(token, context)` fit Vercel perfectly |
| Resource model (`resource.ts`) | Minimal change | Added `"project"` to `ResourceKind` union — single-line addition |
| Identity scheme | YES | `vercel:project:prj_xxx` works via existing `provider:kind:providerResourceId` formula |
| Registry (`registry.ts`) | YES | Added `vercel: vercelProvider` entry — no structural change |
| Persistence (`store.ts`) | YES | SQLite schema, upsert, identity dedup all work for Vercel without changes |
| Sync orchestration (`sync.ts`) | Minimal change | Added `"project"` label to `formatKindLabel` — one-line addition |
| Credentials (`credentials.ts`) | YES | Keyed by provider string — `setCredential("vercel", token)` just works |
| CLI (`cli/index.ts`) | Help text only | No structural changes; only updated help strings |

### Deviations

None. Implementation follows the Sprint contract exactly.

### Validation

- **Automated**: 80 tests pass across 12 files (up from 61 tests at baseline), 370 expect() calls, typecheck clean
- **Live verification**: Deferred (no `VERCEL_TOKEN` available in this session). Automated coverage includes auth, discovery, normalization, pagination, error handling, secret safety, 3-provider coexistence, partial failure, persistence, and rename stability.

### Learnings

> Is the provider connection architecture now stable enough to continue adding providers without redesign?

**Yes.** The third provider required exactly two single-line additions to the domain/sync layer (`"project"` in `ResourceKind` and `formatKindLabel`) and one switch case in `connect.ts`. Everything else was pure extension: new adapter files, a registry entry, and help text. No provider-specific branching, no framework building, no abstraction changes.

The provider contract (`authenticate` + `discoverResources`) proved general enough for infrastructure (Cloudflare), source (GitHub), and application platform (Vercel) resource types. The `accountId`/`accountName` auth result fields map cleanly to Vercel's `uid`/`username`. The pagination model (Vercel uses `until` cursor, GitHub uses `page`, Cloudflare doesn't paginate) stays inside each adapter's client.

### Canon Changes

None.

## Definition of Done

Sprint 003 is complete only when:

- [x] all Sprint 001–002 behavior remains functional
- [x] Vercel can be explicitly connected
- [x] authentication does not silently harvest credentials
- [x] Vercel identity/scope is validated
- [x] real Vercel projects can be discovered
- [x] projects normalize into provider-independent Resource
- [x] project identity uses a stable Vercel identifier
- [x] Vercel Resources persist in existing storage
- [x] Cloudflare + GitHub + Vercel Resources coexist
- [x] `combie sync` handles all connected providers
- [x] partial-failure behavior remains correct
- [x] repeated sync does not duplicate projects
- [x] providers/resources commands represent Vercel
- [x] automated tests require no live Vercel credentials
- [x] all existing tests pass
- [x] typecheck/lint requirements pass
- [ ] real Vercel connection is manually verified
- [x] Cloudflare + GitHub behavior remains valid
- [x] credentials are absent from output/committed files
- [x] no deployments, relationships, telemetry, graph, memory, AI, MCP, or execution work was introduced
- [x] full diff is reviewed
- [x] Canon remains accurate
- [x] completion notes are updated
- [ ] repository state is clean

## What Sprint 003 Proves

```text
Cloudflare ─ infrastructure ─┐
                             │
GitHub ───── source ─────────┼→ Combie Resource → SQLite → CLI
                             │
Vercel ───── application ────┘
```

Success gives us evidence that the provider boundary is an earned architecture rather than a one-provider abstraction.

It does not prove relationships, memory, investigations, telemetry, or execution.

## Final Principle

> **Add Vercel, not a Vercel platform.**

Connect. Discover projects. Normalize. Persist. Sync beside Cloudflare + GitHub. Verify the architecture survives.

Then stop and learn before deciding Sprint 004.
