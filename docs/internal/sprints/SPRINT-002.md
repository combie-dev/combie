# SPRINT-002 — GitHub Connection

> **Roadmap:** v0.1 — Connection
> **Status:** Complete
> **Depends on:** SPRINT-001 — Combie Foundation + Cloudflare Connection
> **Baseline commit:** `d156705`
> **Scope:** Second real provider vertical slice
> **Provider:** GitHub

## Goal

Add GitHub as Combie's second real engineering provider and use it to challenge the provider-independent architecture established in Sprint 001.

At the end of this Sprint:

```text
Existing Combie installation
      ↓
Connect GitHub
      ↓
Discover repositories
      ↓
Normalize repositories into Combie Resources
      ↓
Persist them alongside Cloudflare resources
      ↓
Sync multiple connected providers
      ↓
Inspect both providers and resources through the CLI
```

This Sprint is not about GitHub feature breadth. It proves whether the connection architecture built for Cloudflare actually generalizes.

## Why This Sprint Exists

Sprint 001 proved:

```text
Authenticate → Discover → Normalize → Persist → Expose
```

against one infrastructure provider.

GitHub introduces a fundamentally different provider shape: source-code resources.

The Sprint must answer:

> Did Sprint 001 create a provider-independent Combie connection model, or a Cloudflare-shaped implementation that only appears generic?

GitHub should pressure-test:

- provider contract
- Resource identity
- Resource kinds
- persistence
- provider configuration
- multi-provider synchronization
- CLI presentation

If GitHub exposes a weakness, make the smallest general correction required by this Sprint and preserve Cloudflare behavior.

## User Outcome

A user with Cloudflare already configured can run:

```bash
combie connect github
combie sync
combie providers
combie resources
```

and see both providers represented through the same Combie system.

Conceptually:

```text
PROVIDER     STATUS       LAST SYNC
Cloudflare   Connected    just now
GitHub       Connected    just now
```

and:

```text
TYPE         NAME          PROVIDER
zone         usecmd.dev    cloudflare
repository   combie        github
repository   rivora        github
```

Exact formatting is not contractual. The behavior is.

## Sprint Principle

> **Challenge the existing abstraction. Do not expand the platform.**

Reuse Sprint 001 architecture wherever it remains sound.

Do not create a parallel GitHub-specific application architecture. Do not force GitHub into an abstraction that clearly does not fit. When pressure appears:

1. identify the real mismatch,
2. make the smallest general improvement,
3. verify Cloudflare still works,
4. continue.

## Scope

Sprint 002 includes:

1. GitHub provider registration
2. explicit GitHub authentication
3. authenticated account/user validation
4. repository discovery
5. repository normalization into the existing Resource model
6. stable GitHub resource identity
7. persistence alongside Cloudflare resources
8. multi-provider synchronization
9. provider inspection for Cloudflare + GitHub
10. resource inspection for Cloudflare + GitHub
11. Sprint 001 regression coverage
12. GitHub adapter tests
13. representative live GitHub verification

Everything else is out of scope.

## Existing Architecture Must Be Reused

Sprint 001 established:

```text
CLI
 ↓
Application layer
 ↓
Provider contract
 ↓
Provider adapter
 ↓
Provider API

Application layer
 ↓
SQLite
```

Sprint 002 should produce:

```text
                         ┌→ Cloudflare adapter → Cloudflare API
CLI → Application → Provider contract
                         └→ GitHub adapter     → GitHub API

Application
    ↓
SQLite
```

The application layer must not become GitHub-aware when provider behavior can remain inside the adapter.

## Required User Flow

### 1. Existing initialization

Continue using:

```bash
combie init
```

Existing Sprint 001 installations and Cloudflare state must remain valid unless a minimal migration is genuinely required.

### 2. Connect GitHub

Required capability:

```bash
combie connect github
```

Authentication requires explicit authorization.

The implementation agent must inspect the repository and choose the smallest safe mechanism consistent with existing patterns.

Preferred local developer path, if practical:

```text
GitHub CLI detected and authenticated.
Use this authenticated GitHub identity with Combie?
```

Explicit reuse of `gh` is preferred when it stays simple. A scoped GitHub token is also acceptable if materially simpler or safer.

Do not build a generalized authentication platform.

### GitHub credential rules

Combie may:

- detect whether `gh` is installed
- detect whether `gh` is authenticated
- explicitly authorize reuse of the authenticated CLI
- accept an explicitly supplied supported token
- use a token intentionally exposed to the Combie process

Combie must not:

- silently copy secrets from GitHub CLI files
- scan arbitrary files or `.env` files
- scan shell history
- print tokens
- store secrets in ordinary domain tables
- request write access unnecessarily

If GitHub CLI reuse is implemented, use supported `gh` behavior rather than parsing private credential files.

### Permissions

Sprint 002 needs read access sufficient to identify the authenticated user and list repositories visible to that identity.

Do not request repository mutation, workflow execution, organization administration, or other write capabilities.

Private repository access may work when explicitly authorized, but it is not required merely to prove the Sprint.

## Repository Discovery

The only required GitHub Resource type is:

```text
repository
```

Do not make commits, branches, PRs, Actions, issues, users, or organizations first-class Resources.

Conceptually:

```yaml
id: combie-stable-id
provider: github
provider_resource_id: github-stable-repository-id
kind: repository
name: combie
metadata:
  owner: example-user
  full_name: example-user/combie
  visibility: private
  default_branch: master
  archived: false
```

This is illustrative, not a required serialization format.

### Stable identity

Use a stable GitHub-provided repository identifier rather than repository name alone.

A repository rename should not create a second unrelated Combie Resource when GitHub identifies it as the same repository.

Do not build rename history.

### Metadata

Keep metadata useful and small:

- owner
- full name
- visibility/private state
- default branch
- archived state
- web URL
- primary language only if already available without additional API complexity

Do not add API calls solely for enrichment.

Do not ingest repository contents, README text, commits, branches, tags, contributors, issues, pull requests, releases, Actions, deployments, secrets, or environments.

## Resource Kind Pressure Test

Add only the `repository` kind required today.

Do not create a universal resource ontology or enumerate future AWS/Kubernetes/Vercel concepts.

If the existing Resource kind design needs adjustment, make the smallest provider-independent change.

## Multi-Provider Synchronization

This is a primary Sprint requirement.

After Sprint 002:

```bash
combie sync
```

must synchronize all connected providers.

Conceptually:

```text
Syncing Cloudflare...
✓ 1 resource

Syncing GitHub...
✓ 12 repositories

Sync complete.
13 resources stored.
```

Prefer:

```text
Configured providers
        ↓
Provider registry
        ↓
For each connected provider
        ↓
Discover
        ↓
Normalize
        ↓
Upsert
        ↓
Record sync result
```

Avoid provider-specific application branching when the provider contract can express the behavior.

### Partial failure

With multiple providers, one may fail.

Preferred simple behavior:

- attempt each configured provider
- persist successful results
- report failures clearly
- return non-success if any configured provider failed

Do not introduce queues, background workers, retry infrastructure, or orchestration systems.

### Idempotency

Repeated sync must not duplicate stable Cloudflare or GitHub Resources.

## Provider Inspection

Existing:

```bash
combie providers
```

must represent both providers and their individual sync state.

Do not redesign provider status unless GitHub exposes a real limitation.

## Resource Inspection

Existing:

```bash
combie resources
```

must show both providers' Resources.

A filter such as:

```bash
combie resources --provider github
```

is optional and not part of Definition of Done.

## Provider Contract Pressure Test

First attempt to use Sprint 001's minimal contract unchanged.

Conceptually:

```text
authenticate
discoverResources
```

If GitHub exposes a genuine weakness, modify it minimally.

Any change must:

- remain provider-independent
- preserve Cloudflare
- be covered by tests
- solve a current GitHub requirement
- avoid future capabilities

Do not add events, relationships, telemetry, actions, AI, or execution capabilities.

## Persistence Pressure Test

Continue using Sprint 001 SQLite persistence.

Verify:

- Cloudflare + GitHub resources coexist
- provider identity prevents collisions
- repeated upserts remain stable
- sync metadata remains provider-specific
- existing Sprint 001 data survives

Do not introduce another database, remote persistence, or speculative persistence framework.

## Cloudflare Regression Requirement

Sprint 002 is additive.

Sprint 001 behavior must remain intact, including:

- Cloudflare authentication
- discovery
- Resource normalization
- SQLite persistence
- stable upserts
- provider/resource CLI output
- credential safety

## Error Behavior

Errors should be actionable.

Examples:

```text
GitHub connection failed: GitHub CLI is not authenticated. Run `gh auth login` and retry.
```

```text
GitHub repository discovery failed: configured credentials are invalid.
```

Expected cases include:

- GitHub not configured
- requested auth source unavailable
- `gh` unavailable when explicitly requested
- `gh` unauthenticated
- invalid token
- insufficient access
- GitHub API unavailable
- malformed provider response
- persistence failure

Never expose secrets.

## Testing Strategy

All Sprint 001 tests must continue passing.

### GitHub adapter tests

Use mocks/fixtures so standard tests require no live credentials.

Test:

- authenticated identity validation
- repository discovery
- normalization
- stable repository IDs
- metadata mapping
- empty results
- auth failure
- API/provider failure

### Domain tests

Add only tests created by real GitHub pressure, such as:

- `repository` Resource kind
- cross-provider identity safety
- rename stability when provider ID is unchanged

### Persistence tests

Verify:

- GitHub Resources persist
- Cloudflare Resources remain
- multiple providers coexist
- repeated sync does not duplicate
- sync metadata remains provider-specific
- process restart preserves state

### Multi-provider sync tests

Cover:

```text
Cloudflare success + GitHub success
```

and a simple partial failure:

```text
Cloudflare success + GitHub failure
```

### CLI tests

Where practical, cover:

- GitHub connection command
- two-provider listing
- two-provider resource listing
- multi-provider sync summary
- relevant failures

Avoid cosmetic snapshot brittleness unless already conventional in the repo.

## Manual Verification

Sprint 002 is not complete until a real GitHub identity validates the end-to-end flow.

Representative flow:

```bash
bun run combie connect github <explicit-auth-option>
bun run combie sync
bun run combie providers
bun run combie resources
```

Verify:

- GitHub auth succeeds
- authenticated identity is correct
- real repositories are discovered
- repositories normalize as `repository`
- resources persist across process exit
- existing Cloudflare resources remain
- both providers show appropriate status
- repeated sync does not duplicate
- credentials do not appear in output
- Cloudflare still synchronizes

Record concise results in Sprint completion notes.

## Architecture Pressure Report

Before implementation, explicitly answer:

1. Can the existing provider contract support GitHub unchanged?
2. Can the existing Resource model represent repositories cleanly?
3. Can persistence identity safely support multiple providers?
4. Can sync iterate multiple providers without provider-specific application branching?
5. Can existing credential architecture support GitHub safely?
6. Does any proposed change affect Cloudflare behavior?

If changes are needed, explain why and make the smallest correction.

## Explicitly Out of Scope

Do not implement:

- commits
- branches as Resources
- tags
- pull requests
- issues
- Actions/workflows
- deployments
- releases
- GitHub webhooks
- repository contents
- README ingestion
- code indexing/search
- embeddings
- teams/users as first-class Resources
- Cloudflare ↔ GitHub relationships
- Engineering Graph
- relationship inference
- application grouping
- environments
- Observations
- Changes
- timelines
- memory engine
- Sentry
- Vercel
- Railway/Render/Fly.io
- Slack
- hyperscalers
- Kubernetes
- Terraform/OpenTofu
- Datadog/Prometheus/Maple
- OpenTelemetry ingestion
- MCP
- API server
- SDK
- web app
- natural-language querying
- AI providers
- investigations
- recommendations
- learning
- controlled execution
- autonomous actions
- hosted Combie
- billing
- provider marketplace

Do not scaffold these features.

## Anti-Overengineering Rules

Do not introduce:

```text
GitHubEventEngine
RepositoryGraph
SourceGraph
CodeIndexer
AgentRegistry
InvestigationEngine
LearningEngine
RecommendationEngine
MCPGateway
ActionPolicy
UniversalProviderFramework
```

Do not create a plugin architecture merely because Combie now has two providers.

Two providers are evidence—not proof that a platform framework is required.

## Repository Understanding Requirement

Before modifying code, follow `skills/build-combie/SKILL.md` and inspect the repository at baseline `d156705`.

The Repository Understanding Report should identify:

- Sprint 001 boundaries
- provider contract
- Cloudflare adapter
- Resource representation
- persistence schema
- provider configuration
- credential handling
- sync orchestration
- CLI structure
- existing tests
- where GitHub can reuse existing behavior
- where a second provider creates real pressure

Do not assume conceptual diagrams exactly match implementation.

## Implementation Plan Requirement

Before coding, produce a concise plan covering:

- authentication approach
- adapter location
- repository discovery
- normalization
- Resource changes, if any
- provider-contract changes, if any
- multi-provider sync
- persistence impact
- CLI impact
- tests
- live verification

Then implement using the full Sprint Execution Protocol.

## Implementation Discipline

Follow:

```text
Red → Green → Refactor
```

where practical.

Prefer extending existing structures.

Do not rewrite Sprint 001 without evidence.

If the design works, reuse it. If it almost works, make the smallest general correction. If it fundamentally fails, report the architectural conflict before a broad redesign.

## Documentation Rules

The permanent Combie Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Do not create additional permanent architecture documents.

Adding GitHub alone should not require Canon changes.

## Sprint Completion Notes

At completion record:

### Implemented
What actually shipped.

### Architecture Pressure Results
Whether these survived unchanged:

- provider contract
- Resource model
- identity model
- persistence
- sync orchestration
- CLI

Record minimal changes and why.

### Deviations
Intentional differences from this contract.

### Validation
Automated and manual verification.

### Learnings
What GitHub taught us about Combie's architecture.

Do not write Sprint 003 here.

### Canon Changes
List any changes to VISION, ARCHITECTURE, or ROADMAP. If none, state `None`.

## Definition of Done

Sprint 002 is complete only when:

- [x] Sprint 001 behavior remains functional
- [x] GitHub can be explicitly connected
- [x] auth does not silently harvest credentials
- [x] GitHub account identity is validated
- [x] real GitHub repositories can be discovered
- [x] repositories normalize into the provider-independent Resource model
- [x] repository identity uses a stable GitHub identifier
- [x] GitHub resources persist in existing local persistence
- [x] Cloudflare + GitHub resources coexist
- [x] `combie sync` handles both connected providers
- [x] repeated sync does not duplicate stable resources
- [x] `combie providers` represents both providers
- [x] `combie resources` represents both providers
- [x] multi-provider sync is tested
- [x] a simple partial-provider failure is tested
- [x] automated tests require no live GitHub credentials
- [x] all existing tests pass
- [x] repository typecheck/lint requirements pass
- [x] real GitHub connection is manually verified
- [x] Cloudflare behavior remains valid
- [x] credentials are absent from normal output and committed files
- [x] no future GitHub features were implemented
- [x] no graph, memory, AI, MCP, or execution work was introduced
- [x] full diff is reviewed
- [x] Canon remains accurate
- [x] completion notes are updated
- [x] repository state is clean

## Sprint Completion Notes

### Implemented

- GitHub provider adapter (`src/providers/github/`) with authenticate + repository discovery
- Explicit GitHub auth paths: `--token`, `--use-env` (`GITHUB_TOKEN` / `GH_TOKEN`), `--use-gh` (`gh auth token`)
- `repository` Resource kind with stable identity from GitHub numeric repository id
- Registry registration for `github` alongside `cloudflare`
- Multi-provider `combie sync` with per-provider success/failure (partial failure continues; non-zero exit if any fail)
- CLI help and empty-state messaging updated for two providers
- Fixture-based GitHub adapter tests; multi-provider app tests; domain/CLI coverage extensions

### Architecture Pressure Results

| Area | Survived unchanged? | Notes |
|------|---------------------|--------|
| Provider contract | **Yes** | `authenticate` / `discoverResources(token, { accountId })` reused; GitHub maps user id → `accountId`, login → `accountName` |
| Resource model | **Minimal change** | Added `"repository"` to closed `ResourceKind` union only |
| Identity model | **Yes** | `${provider}:${kind}:${providerResourceId}`; GitHub uses `String(repo.id)` |
| Persistence | **Yes** | Existing SQLite schema + credentials file support multi-provider without migration |
| Sync orchestration | **Minimal change** | Loop already multi-provider; changed fail-fast → continue-on-error + aggregate `ok` |
| CLI | **Minimal change** | Added `--use-gh`; help/examples list github; exit code reflects multi-provider sync failure |

No plugin framework, universal provider SDK, or auth platform was introduced.

### Deviations

- Live dual-provider verification used real GitHub only; Cloudflare live token was not available in the environment. Cloudflare behavior remains covered by full Sprint 001 automated suite + multi-provider mock tests (CF success + GH success / CF success + GH failure).
- Interactive “detected gh, confirm reuse?” prompt was not built; non-interactive `--use-gh` is the explicit authorization path (matches CLI non-interactive style of Sprint 001).

### Validation

**Automated**

- `bun test` — 61 pass, 0 fail
- `bun run typecheck` — clean
- Multi-provider tests cover dual connect/sync, idempotent upserts, partial failure, restart persistence, rename-stable identity

**Manual (live GitHub)**

```text
combie init
combie connect github --use-gh
→ Connected GitHub (account: sgr0691)

combie sync
→ ✓ 310 repositories; 310 resources stored

combie providers
→ GitHub Connected just now

combie resources
→ repository rows for discovered repos

combie sync (repeat)
→ still 310 resources (no duplicates)

credentials file mode 0600; no tokens in CLI output
```

### Learnings

- Sprint 001’s provider contract generalized to a second, differently shaped provider without interface changes when optional auth fields are treated as generic identity.
- Real multi-provider pressure was mostly in the **application layer** (token resolution, error copy, sync partial failure), not in storage or the domain model.
- GitHub’s stable numeric repository id is an excellent fit for Combie resource identity; name/full_name belong in metadata.
- Two providers still do not require a plugin architecture—static registry registration remains sufficient.

### Canon Changes

None.

## What Sprint 002 Proves

If successful:

```text
Cloudflare
Infrastructure resources
       │
       └──────────┐
                  ↓
            Combie Resource
                  ↑
       ┌──────────┘
       │
GitHub
Source resources
```

This gives stronger evidence that:

- providers really are adapters
- Resource is provider-independent
- persistence supports multiple providers
- synchronization coordinates multiple integrations
- one CLI can expose a shared engineering inventory

The value is architectural proof, not GitHub feature breadth.

## Final Principle

> **The second provider exists to test the first abstraction.**

Connect GitHub.

Discover repositories.

Put them beside Cloudflare Resources.

Make sure the architecture survives.

Then stop.

Only after Sprint 002 is implemented, validated, and reviewed should Combie decide what Sprint 003 needs to be.
