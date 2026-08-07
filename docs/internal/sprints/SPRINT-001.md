# SPRINT-001 — Combie Foundation + First Provider

> **Roadmap:** v0.1 — Connection  
> **Status:** Implemented (live Cloudflare verification passed 2026-08-07)  
> **Scope:** One complete vertical slice  
> **Initial provider:** Cloudflare

---

# Goal

Build the smallest complete version of Combie that proves the core connection loop works against a real engineering provider.

At the end of this Sprint, a user should be able to:

```text
Initialize Combie
      ↓
Connect Cloudflare
      ↓
Discover supported Cloudflare resources
      ↓
Normalize those resources into Combie
      ↓
Persist them locally
      ↓
Inspect them through the CLI
```

This Sprint is not about building the full Combie platform.

It is about proving the first real vertical slice.

---

# Why This Sprint Exists

Combie's product thesis begins with connection.

Before Combie can understand relationships, build operational memory, investigate incidents, learn from outcomes, or safely execute actions, it must first prove that it can reliably connect to a provider and represent real engineering resources.

Cloudflare is the first test of that architecture.

This Sprint should answer:

> Can Combie connect to a real engineering provider, discover meaningful resources, represent them using a provider-independent model, persist them, and make them inspectable to the user?

If the answer is yes, we have the foundation required to introduce additional providers.

If the implementation reveals that the Resource model, provider boundary, authentication model, or persistence approach is wrong, we should learn that now—before building additional integrations.

---

# User Outcome

After Sprint 001, a user can install or run Combie locally and perform a workflow similar to:

```bash
combie init

combie connect cloudflare

combie sync

combie providers

combie resources
```

The user should be able to see that Cloudflare is connected and inspect the Cloudflare resources Combie discovered.

The experience should be functional, understandable, and demonstrable.

No AI is required.

---

# Sprint Principle

> **One provider. One complete connection loop. No future platform work.**

Cloudflare is not special architecture.

Cloudflare is the first real adapter used to prove Combie's architecture.

Build only what Cloudflare proves Combie needs today.

Do not design a universal integration framework based on hypothetical future providers.

---

# Scope

Sprint 001 includes:

1. minimal Combie repository/application foundation
2. CLI entry point
3. local initialization
4. minimal provider contract
5. Cloudflare provider adapter
6. explicit Cloudflare authentication
7. supported resource discovery
8. normalized Combie Resource model
9. local persistence
10. synchronization
11. provider inspection
12. resource inspection
13. focused automated tests
14. representative manual verification

Everything else is out of scope.

---

# Required User Flow

The implementation must support this complete flow.

## 1. Initialize

```bash
combie init
```

Combie creates the minimum local state required to operate.

Initialization should be:

- explicit
- repeatable
- safe
- understandable

Running initialization more than once should not corrupt existing state.

---

## 2. Connect Cloudflare

```bash
combie connect cloudflare
```

Combie guides the user through the supported Cloudflare authentication method.

Authentication must require explicit user authorization.

Combie must not scan the filesystem for credentials.

If an intentionally exposed credential source is supported, such as an environment variable, Combie may detect its availability and ask the user whether to use it.

Secrets must not be printed in normal command output.

Secrets must not be committed to the repository.

Secrets should not be persisted in plaintext application data when a safer supported mechanism is available.

For Sprint 001, choose the smallest secure authentication approach that can be implemented and tested reliably.

Do not build a generalized OAuth platform unless Cloudflare requires it for this Sprint.

---

## 3. Synchronize

```bash
combie sync
```

Combie connects to Cloudflare and discovers the supported resource types.

The sync operation should:

1. authenticate
2. query Cloudflare
3. discover supported resources
4. normalize them into Combie Resources
5. persist them locally
6. report a concise result

Example:

```text
Cloudflare sync complete.

Discovered:
3 Workers
2 D1 databases
4 KV namespaces
1 zone

10 resources stored.
```

Exact output may evolve during implementation.

The behavior matters more than matching this wording.

---

## 4. Inspect Providers

```bash
combie providers
```

The user can see configured providers.

At minimum, output should communicate:

- provider name
- connection/configuration state
- last successful sync when available

Example:

```text
PROVIDER      STATUS       LAST SYNC
Cloudflare    Connected    2 minutes ago
```

Do not expose credentials.

---

## 5. Inspect Resources

```bash
combie resources
```

The user can inspect normalized resources discovered from Cloudflare.

Example:

```text
TYPE            NAME                    PROVIDER
worker          api                     cloudflare
worker          webhooks                cloudflare
d1_database     production              cloudflare
kv_namespace    sessions                cloudflare
zone            example.com             cloudflare
```

The CLI may support additional filtering if it naturally falls out of the implementation, but advanced query functionality is not required.

---

# Initial Cloudflare Resource Scope

Do not attempt to model every Cloudflare product.

Sprint 001 should support a deliberately small set of useful resource types.

Recommended initial targets:

- Workers
- D1 databases
- KV namespaces
- Zones

These give Combie several different infrastructure resource shapes without creating excessive scope.

If implementation research reveals that one of these resource types materially complicates the Sprint, it may be deferred with a documented reason.

Do not add additional Cloudflare products merely because the API exposes them.

Out of scope examples include:

- R2
- Queues
- Durable Objects
- Pages
- Hyperdrive
- Access
- Zero Trust
- WAF configuration
- detailed DNS record modeling
- analytics
- raw logs
- metrics ingestion

These may be introduced later if real product needs justify them.

---

# Minimal Engineering Model

Sprint 001 should introduce only the domain concepts required for connection and resource discovery.

The primary domain object is:

```text
Resource
```

A Resource represents something that exists inside the user's engineering system.

The implementation should support the conceptual information below:

```yaml
id: combie-generated identity
provider: cloudflare
provider_resource_id: provider identity
kind: worker
name: api
metadata:
  provider-specific information
```

The exact code representation should be determined during implementation based on the repository language and architecture.

Do not treat this YAML as a required serialization format.

---

# Resource Requirements

Every persisted Resource should have enough identity to:

- uniquely identify it inside Combie
- identify its provider
- identify the corresponding provider resource
- describe its normalized kind
- provide a human-readable name
- preserve useful provider-specific metadata
- survive repeated synchronization without creating duplicates

Stable identity matters.

Running:

```bash
combie sync
combie sync
```

should update existing resources rather than create duplicate copies of the same provider resource.

---

# Resource Kinds

Do not create an exhaustive global enum for every infrastructure resource Combie may someday support.

Sprint 001 only needs the resource kinds required by its supported Cloudflare resources.

For example:

```text
worker
database
kv_namespace
zone
```

Whether `d1_database` should normalize to `database` or remain more specific should be decided based on the smallest useful domain model.

Do not prematurely solve normalization for AWS, Kubernetes, Vercel, or other future providers.

---

# Provider Boundary

Cloudflare must remain an adapter.

Provider-specific API behavior belongs in the Cloudflare integration.

Combie Core should not require Cloudflare-specific concepts to function.

Conceptually:

```text
CLI
 ↓
Combie application/core
 ↓
Provider contract
 ↓
Cloudflare adapter
 ↓
Cloudflare API
```

The exact module structure may differ.

The architectural boundary must not.

---

# Minimal Provider Contract

Introduce only the provider behavior Sprint 001 requires.

Conceptually, that may include:

```text
identify provider
validate/authenticate configuration
discover resources
```

Do not implement future capabilities such as:

```text
observe
investigate
recommend
execute
rollback
stream telemetry
```

unless required for the Sprint—which they should not be.

The provider contract should be tested against Cloudflare.

Future providers will challenge and refine it.

---

# Authentication

Infrastructure credentials are sensitive.

Sprint 001 must follow these rules:

- explicit authorization
- no silent credential harvesting
- no shell-history scanning
- no arbitrary `.env` scanning
- no credentials in logs
- no credentials in normal CLI output
- no credentials committed to source control

If Combie supports an environment variable such as a Cloudflare API token, it should only use credentials intentionally exposed to the Combie process.

If secure operating-system credential storage is practical within Sprint scope, prefer it.

If introducing cross-platform credential storage would materially expand Sprint scope, use the smallest safe temporary approach and clearly document the limitation without designing the full future credential system.

Do not build the complete hosted authentication architecture.

---

# Persistence

Sprint 001 requires local persistence.

The persistence layer must store at least:

- Combie initialization state
- provider configuration metadata
- normalized resources
- synchronization metadata

Credentials should remain separate from normal persisted domain data whenever practical.

Choose the simplest persistence mechanism appropriate for the implementation language and expected near-term needs.

Avoid building distributed storage, hosted databases, synchronization services, or cloud persistence.

Local-first is enough.

---

# Synchronization Semantics

Synchronization should be deterministic and understandable.

At minimum:

```text
Provider API
     ↓
Discover
     ↓
Normalize
     ↓
Upsert
     ↓
Persist
```

Repeated syncs should not duplicate stable resources.

When a provider resource changes, Combie should update the locally persisted representation.

Deletion reconciliation may remain simple in Sprint 001.

If resource deletion handling would materially complicate the vertical slice, document the chosen behavior rather than introducing a complex reconciliation engine.

---

# CLI Requirements

The CLI is the primary user interface for Sprint 001.

Required commands:

```bash
combie init
combie connect cloudflare
combie sync
combie providers
combie resources
```

Commands should:

- have understandable help text
- return useful errors
- avoid leaking secrets
- use meaningful exit codes where practical
- remain script-friendly
- avoid unnecessary interactive complexity

A polished terminal UI is not required.

Correctness and clarity matter more than visual decoration.

---

# Error Behavior

Errors should explain what the user can do next.

Prefer:

```text
Cloudflare authentication failed: the configured token does not have permission to list Workers.
```

over:

```text
Request failed.
```

Relevant provider errors may be preserved or wrapped.

Secrets, authorization headers, and sensitive credential material must never be included in error output.

Expected failure cases should include:

- Combie not initialized
- Cloudflare not configured
- invalid credentials
- insufficient permissions
- provider API unavailable
- malformed provider response
- local persistence failure

Do not build an elaborate global error framework unless the implementation genuinely requires one.

---

# Testing Strategy

Sprint 001 must test behavior, not implementation trivia.

## Domain Tests

Test:

- Resource identity
- provider identity
- stable normalization
- duplicate prevention/upsert behavior

## Provider Tests

Test Cloudflare response normalization using fixtures or mocks.

Do not require live Cloudflare credentials for the standard automated test suite.

Test supported resource mapping.

Test relevant provider errors.

## Persistence Tests

Test:

- initialization
- resource persistence
- resource retrieval
- repeated upserts
- provider metadata persistence

## CLI Tests

Where practical, test:

- initialization
- invalid state behavior
- provider listing
- resource listing
- command failure behavior

## Integration Boundary

Keep live-provider verification separate from deterministic automated tests.

The normal test suite should remain runnable by contributors without Cloudflare credentials.

---

# Manual Verification

The Sprint is not complete until the real Cloudflare flow has been manually verified.

Use a real test or development Cloudflare account.

Representative verification:

```bash
combie init

combie connect cloudflare

combie sync

combie providers

combie resources
```

Verify:

- Combie initializes successfully
- authentication works
- Cloudflare resources are discovered
- supported resources normalize correctly
- resources persist after process exit
- repeated sync does not duplicate resources
- provider state is inspectable
- credentials do not appear in output
- errors are understandable

Record concise verification results in the Sprint completion notes.

Do not commit real credentials or sensitive provider data.

---

# Architecture Validation

Before implementation, confirm the proposed design preserves these Combie invariants.

## Providers Remain Adapters

Cloudflare-specific logic remains inside the provider integration.

## Engineering Model Is Provider-Independent

The Resource model is not a renamed Cloudflare API response.

## Context Comes Before Intelligence

No LLM or agent reasoning is required.

## Telemetry Is Evidence

No telemetry system is required for this Sprint.

## Models Are Replaceable

No model provider architecture is needed.

## MCP Is an Interface

No MCP implementation is required.

## Execution Follows Trust

Cloudflare access is read-oriented for discovery.

No infrastructure mutation is required.

## Credentials Require Authorization

No silent credential discovery.

## Build Only the Active Slice

No future roadmap architecture.

---

# Explicitly Out of Scope

Sprint 001 must not implement:

- GitHub
- Vercel
- Sentry
- Railway
- Render
- Fly.io
- Slack
- AWS
- Azure
- GCP
- Kubernetes
- Terraform / OpenTofu
- Datadog
- Prometheus
- Maple integration
- OpenTelemetry ingestion
- MCP
- API server
- SDK
- web application
- Slack bot
- AI model providers
- natural-language queries
- Engineering Graph
- Relationships
- Observations
- operational timelines
- memory engine
- investigations
- recommendations
- learning
- controlled execution
- autonomous actions
- hosted Combie
- team accounts
- billing
- plugin marketplace
- universal provider framework

Do not create placeholder implementations for these concepts.

Do not create empty modules for them.

Do not add TODO scaffolding for future roadmap phases unless absolutely required to explain a current limitation.

---

# Anti-Overengineering Rules

During this Sprint:

Do not create an `InvestigationEngine`.

Do not create a `LearningEngine`.

Do not create a `RecommendationEngine`.

Do not create an `AgentRegistry`.

Do not create an `MCPGateway`.

Do not create an `OTLPReceiver`.

Do not create execution policy infrastructure.

Do not create hypothetical AWS abstractions.

Do not create a universal resource ontology.

Do not create a provider marketplace.

Do not create distributed event infrastructure.

If the active Cloudflare vertical slice does not need it:

do not build it.

---

# Repository Understanding Requirement

Before modifying code, the implementing agent must inspect the repository and produce a concise Repository Understanding Report as required by `SKILL.md`.

The report should identify:

- current repository structure
- existing language/tooling
- reusable code
- test infrastructure
- relevant architectural constraints
- whether any Sprint requirements already exist
- concrete implementation risks

If this is a new or nearly empty repository, say so.

Do not invent architecture merely to fill an empty repository.

---

# Implementation Planning Requirement

After repository inspection and before coding, produce a concise implementation plan.

The plan should identify:

- modules/files to add or change
- Resource ownership
- provider boundary
- persistence approach
- authentication approach
- CLI structure
- tests
- manual verification plan

If there are meaningful implementation alternatives, explain the tradeoff briefly and choose the smallest approach consistent with the Canon.

Then implement.

---

# Implementation Discipline

Use:

```text
Red
 ↓
Green
 ↓
Refactor
```

where practical.

Build the smallest working implementation.

Avoid speculative abstractions.

Keep the diff coherent.

Every abstraction introduced should have a current user or architectural need.

---

# Documentation Rules

The permanent Combie Canon is:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Do not create additional permanent product or architecture documents during Sprint 001 unless explicitly requested.

Update `ARCHITECTURE.md` only if implementation reveals a material architectural decision that should remain true beyond this Sprint.

Update `VISION.md` only if product identity or principles materially change.

Update `ROADMAP.md` only if implementation changes release sequencing or scope.

Implementation details should primarily live in:

- code
- tests
- this Sprint document
- concise code-level documentation

---

# Sprint Completion Notes

At completion, append or update a concise section recording:

## Implemented

What actually shipped.

## Deviations

Any intentional difference from this Sprint contract.

## Validation

Tests and manual verification performed.

## Learnings

Important discoveries that should influence Sprint 002.

## Canon Changes

Any updates made to:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`

If none:

state `None`.

Do not redesign future Sprints inside the completion notes.

---

# Definition of Done

Sprint 001 is complete only when:

- [x] Combie can initialize locally
- [x] Cloudflare can be explicitly connected
- [x] authentication is handled without unsafe credential harvesting
- [x] Combie can discover the supported Cloudflare resources
- [x] discovered resources normalize into the Combie Resource model
- [x] resources persist locally
- [x] repeated synchronization does not duplicate stable resources
- [x] `combie providers` exposes provider state
- [x] `combie resources` exposes discovered resources
- [x] useful provider failures produce understandable errors
- [x] automated tests cover the important domain, provider, persistence, and CLI behavior
- [x] the standard test suite does not require live Cloudflare credentials
- [x] the real Cloudflare flow has been manually verified *(2026-08-07 — see Completion Notes)*
- [x] credentials do not appear in logs or normal output
- [x] Combie architectural invariants remain intact
- [x] no future roadmap capabilities were implemented
- [x] the complete diff has been reviewed
- [x] canonical documentation remains accurate
- [x] repository state is clean *(Sprint 001 committed as the initial repository commit)*

---

# What Sprint 001 Proves

If successful, Sprint 001 proves that Combie can:

```text
Connect
   ↓
Discover
   ↓
Normalize
   ↓
Persist
   ↓
Expose
```

for one real engineering provider.

That is enough.

Sprint 001 does not need to prove the entire Combie vision.

It only needs to establish the first trustworthy connection between Combie and a real engineering system.

The next Sprint should be written **after** Sprint 001 is implemented and reviewed.

Its scope should be informed by what we learn from the actual repository and the Cloudflare integration.

---

# Final Principle

> **Do not build the platform. Prove the connection.**

One real provider.

One complete workflow.

One demonstrable result.

Then learn.

Then decide what comes next.

---

# Sprint Completion Notes

> Completed: 2026-08-07  
> Status: **Implemented** — live Cloudflare verification passed (operator token, `usecmd.dev` zone)

## Implemented

- Bun + TypeScript application foundation (`package.json`, `tsconfig`, `.gitignore`, `README.md`, updated `AGENTS.md`)
- CLI: `combie init | connect cloudflare | sync | providers | resources`
- Domain `Resource` model with stable ids: `provider:kind:providerResourceId`
- Minimal provider contract (`authenticate`, `discoverResources`) + registry (Cloudflare only)
- Cloudflare adapter: Workers, D1 → `database`, KV namespaces, Zones
- Local persistence: SQLite domain store under `.combie/combie.db`
- Credentials: separate `.combie/credentials` file (mode `0600`); set only after successful auth via `--token` or `--use-env` + `CLOUDFLARE_API_TOKEN`
- Upsert semantics: repeated sync does not duplicate stable resources
- Automated tests (domain, storage, provider fixtures, app vertical slice, CLI)

## Deviations

1. **Credential storage:** OS keychain not used. Tokens stored in a mode-`0600` file separate from the domain DB — smallest secure approach within sprint scope. Documented limitation for later hardening.
2. **Connect UX:** Non-interactive flags (`--token`, `--use-env`) rather than a full interactive prompt loop. Explicit authorization preserved; no silent harvesting.
3. **Live CLI auth:** No `CLOUDFLARE_API_TOKEN` was available in the agent environment, so live CLI verification was performed by the operator with a real token (2026-08-07 — see Validation). Live API **shape** had previously been verified via Cloudflare MCP (accounts/workers/d1/kv/zones succeed; sample zone `usecmd.dev`).
4. **D1 kind:** Normalized as `database` with `metadata.engine: "d1"` (not `d1_database`).

## Validation

### Automated

```text
bun test     → 42 pass, 0 fail (after live-shape test)
bun run typecheck → clean
```

Coverage: resource identity, credential isolation, store upsert, CF normalize/adapter mocks, full app flow with mocked fetch, CLI init/errors/secret non-leakage.

### Manual

| Step | Result |
|------|--------|
| `combie init` | Creates `./.combie` + SQLite DB; idempotent re-run |
| `combie init` (again) | "already initialized"; no corruption |
| `combie providers` (no connect) | Clear empty state |
| `combie resources` (no sync) | Clear empty state |
| `combie sync` (no provider) | Actionable error |
| `combie connect cloudflare --use-env` (no env) | Actionable error |
| `combie connect github` | Unknown provider error |
| `combie connect --token fake…` | Auth fails; token not printed; provider not marked connected |
| Live `connect` (operator, real token) | **Passed** — authentication succeeded; Cloudflare marked connected; token persisted only in mode-`0600` credentials file, never printed |
| Live `sync` (operator) | **Passed** — real resources discovered, including the real zone `usecmd.dev` |
| Live `providers` (operator) | **Passed** — Cloudflare shows `Connected` with last sync timestamp |
| Live `resources` (operator) | **Passed** — discovered resources listed, including `zone usecmd.dev`; no secrets in output |
| Persistence (operator) | **Passed** — resources retained across process exits (separate CLI invocations) |
| Repeated live `sync` | **Passed** — second sync updated existing resources without duplicates |
| Live CF API endpoints (MCP) | Accounts + zones OK; workers/d1/kv empty on test account; shapes match adapter |

### Operator live verification (passed 2026-08-07)

The operator ran the real flow with a scoped `CLOUDFLARE_API_TOKEN` (Account + Workers Scripts Read + D1 Read + Workers KV Storage Read + Zone Read):

```bash
bun run combie init
bun run combie connect cloudflare --use-env
bun run combie sync
bun run combie providers
bun run combie resources
bun run combie sync
```

All steps passed:

- **Authentication** — token accepted; Cloudflare marked connected; credentials stored only in the mode-`0600` credentials file; token never printed.
- **Sync / discovery** — live resources discovered and stored, including the real zone `usecmd.dev`.
- **Persistence** — resources present in SQLite and visible across process exits.
- **Provider status** — `providers` lists Cloudflare as `Connected` with the last sync timestamp.
- **Resource listing** — `resources` shows the discovered resources (incl. `zone usecmd.dev`); no credentials in output.
- **Repeated sync** — second `sync` updated existing resources, no duplicates.

## Learnings

1. Cloudflare Workers list uses script `id` as the name; D1 uses `uuid` + `name`; KV uses `id` + `title`; zones use `id` + `name` — stable identity should key off provider resource id, not display name alone.
2. A file-backed credential store is enough for local-first v0.1; keychain can wait until multi-provider auth friction appears.
3. All-or-nothing discovery is simple; partial permission failures may need per-type warnings in a later sprint if real tokens are often under-scoped.
4. Injecting `fetch` into the Cloudflare client made fixture tests straightforward without a heavy HTTP mock framework.

## Canon Changes

None.

- `VISION.md` — unchanged  
- `ARCHITECTURE.md` — unchanged  
- `ROADMAP.md` — unchanged  

Implementation details live in code, tests, this sprint doc, and `README.md` / `AGENTS.md`.
