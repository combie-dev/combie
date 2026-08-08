# SPRINT-005 — First Cross-Provider Relationship

> **Roadmap:** v0.2 — Context
> **Status:** Complete
> **Depends on:** SPRINT-004 — Sentry Connection + v0.1 Connection Validation
> **Scope:** First deterministic cross-provider relationship vertical slice
> **Providers:** GitHub + Vercel

## Goal

Move Combie from a unified resource inventory into its first real cross-provider understanding.

Sprint 005 introduces the smallest useful relationship model and proves it with one deterministic relationship between an existing GitHub repository Resource and Vercel project Resource.

```text
GitHub repository
       ↓
 evidence-backed relationship
       ↓
Vercel project
```

The exact relationship kind must be derived from the provider evidence. Do not claim deployment semantics unless the evidence actually proves deployment.

At the end of this Sprint:

```text
Sync GitHub + Vercel
      ↓
Store Resources
      ↓
Inspect deterministic provider evidence
      ↓
Infer one supported cross-provider relationship
      ↓
Persist Relationship
      ↓
Expose through CLI
```

This is the first v0.2 Context slice. It is not the full Engineering Graph.

## Why This Sprint Exists

v0.1 answered:

> What engineering resources exist?

Across four provider categories:

```text
Cloudflare → infrastructure
GitHub     → source
Vercel     → application
Sentry     → operational context
```

v0.2 begins answering:

> How do those resources fit together?

GitHub and Vercel are the best first pair because Vercel may expose provider-backed Git repository metadata that can be matched against a GitHub repository without AI, embeddings, fuzzy names, or user guesswork.

The first relationship must be evidence-backed and deterministic.

## Sprint Principle

> **Evidence first. Graph later.**

Do not build a generic graph engine before Combie has proven one real relationship.

Do not infer relationships from similar names alone. Do not use an LLM. Do not add confidence scoring for deterministic evidence.

Add one small Relationship primitive, one deterministic inference path, one persistence path, and one inspection surface.

## User Outcome

After syncing connected GitHub and Vercel providers, a user can run:

```bash
combie sync
combie relationships
```

and inspect relationships conceptually like:

```text
FROM                     RELATIONSHIP   TO
GitHub sgr0691/combie     source_for     Vercel combie
```

Exact formatting and final relationship naming depend on the actual evidence.

The user should be able to tell:

- source Resource
- target Resource
- relationship kind
- evidence/provenance that established it

## Scope

Sprint 005 includes:

1. minimal provider-independent `Relationship` domain primitive
2. stable Relationship identity
3. Relationship persistence in existing SQLite storage
4. deterministic GitHub repository ↔ Vercel project matching
5. compact evidence/provenance
6. Relationship refresh during explicit sync
7. idempotent Relationship upsert
8. safe stale-Relationship cleanup for this inference path
9. `combie relationships` CLI inspection
10. regression coverage for all v0.1 providers
11. unit/integration tests for inference and persistence
12. representative live verification against real GitHub/Vercel Resources

Everything else is out of scope.

## Architecture Target

```text
GitHub adapter ──→ repository Resource ──┐
                                         ├─→ deterministic matcher
Vercel adapter ──→ project Resource ─────┘
                                                ↓
                                           Relationship
                                                ↓
                                             SQLite
                                                ↓
                                      combie relationships
```

Do not introduce a graph database. SQLite remains the persistence layer.

## Architecture Pressure Report

Before implementation, inspect the repository and answer:

1. What Vercel project metadata is currently persisted?
2. Does current Vercel discovery already contain reliable Git repository identity?
3. If not, what is the smallest additional read required to obtain deterministic Git linkage?
4. What stable GitHub repository fields are currently persisted?
5. Can matching use provider IDs or canonical repository identity instead of display names?
6. Where should relationship inference run without coupling provider adapters together?
7. Can SQLite support a small Relationship table cleanly?
8. How should stale inferred Relationships be removed when evidence disappears?
9. Can the existing sync flow remain explicit and deterministic?
10. Does any proposed change affect Cloudflare or Sentry?

Inspect real API shapes and current normalized metadata before deciding.

## Relationship Domain Primitive

Introduce the smallest provider-independent Relationship representation required today.

Conceptually:

```text
Relationship
- id
- sourceResourceId
- targetResourceId
- kind
- evidence
- createdAt
- updatedAt
```

This is illustrative. Follow repository conventions.

A Relationship must have stable identity, source Resource, target Resource, relationship kind, and enough evidence to explain why it exists.

Do not add speculative fields for future AI inference, confidence models, approvals, temporal graphs, or execution policies.

## Relationship Direction and Kind

Do not hardcode `deploys_to` unless provider evidence proves that semantic.

A Vercel project's Git linkage proves at minimum that the project is connected to or sourced from a repository. It may not prove every deployment semantic.

Choose the strongest canonical relationship supported by actual data, for example:

```text
repository → source_for   → project
project    → sourced_from → repository
repository → connected_to → project
```

Choose one canonical direction/kind and document why.

Do not persist duplicate inverse rows merely for convenience.

## Deterministic Evidence Only

Create a Relationship only from deterministic provider evidence.

Acceptable evidence may include:

- provider-returned GitHub repository ID
- canonical GitHub owner/repository identity returned by Vercel
- another stable provider-backed repository reference

Name similarity alone is not enough.

Do not infer `github:combie ↔ vercel:combie` only because both are named `combie`.

Do not use fuzzy matching, embeddings, or AI.

If live Resources contain no deterministic match, `0 relationships discovered` is valid. Do not manufacture a demonstration edge.

## Provider Adapter Boundaries

Do not make the GitHub adapter call Vercel or the Vercel adapter call GitHub.

Adapters discover and normalize provider facts. Cross-provider interpretation belongs above adapters.

If Vercel must expose one additional Git fact, preserve only the minimal fact required. Do not dump provider responses into Resource metadata.

## Vercel Discovery Extension

First inspect whether existing Vercel project discovery already contains sufficient Git linkage.

If yes, reuse it.

If not, Sprint 005 may add the smallest read-only Vercel API call required to identify the project's GitHub repository.

Do not fetch deployments, deployment history, logs, environment variables, domains, functions, or analytics.

## GitHub Resource Requirements

Reuse existing GitHub repository Resources.

If current metadata lacks a canonical field required for deterministic matching, add only the smallest metadata addition already available from GitHub discovery.

Do not ingest repository contents, commits, branches, PRs, or Actions.

## Relationship Identity

Relationship identity must be stable and idempotent.

Conceptually derive it from:

```text
sourceResourceId + relationshipKind + targetResourceId
```

or an equivalent stable formula.

Repeated sync must not duplicate the same Relationship.

## Relationship Persistence

Persist Relationships in SQLite.

The model must:

- reference existing Resources
- prevent duplicate stable Relationships
- support listing
- support deterministic refresh
- avoid dangling references where practical
- survive process restart

Do not introduce Neo4j, graph extensions, vector stores, or remote databases.

## Relationship Lifecycle

For this deterministic inference path, `combie sync` should leave persisted Relationships consistent with current evidence.

If a previously inferred GitHub↔Vercel relationship is no longer supported by current synchronized evidence, remove or replace that stale inferred Relationship safely.

Do not build historical relationship timelines yet.

When required provider evidence is incomplete because a provider sync failed, do not destructively refresh that inference set.

## Sync Integration

Continue using explicit:

```bash
combie sync
```

Preferred sequence:

```text
1. Sync configured providers
2. Persist successful Resource discoveries
3. Run supported deterministic relationship inference
4. Upsert supported Relationships
5. Remove stale Relationships only when evidence is complete
6. Report sync result
```

Relationship inference must not prevent successful Resource persistence.

Do not add background processing, jobs, queues, webhooks, or watchers.

## CLI

Add:

```bash
combie relationships
```

Provide a compact human-readable view of known Relationships with source, kind, target, and useful evidence/provenance.

If none exist, provide a clear empty state.

Do not build graph visualization, TUI, web UI, natural-language query, or generic traversal commands.

## Evidence / Explainability

Combie's first relationship must be explainable.

Store only enough evidence to answer why Combie created it, conceptually:

```yaml
evidence:
  source: vercel
  mechanism: git_repository_reference
  repository: sgr0691/combie
```

Do not store entire provider responses as evidence.

## Testing Strategy

All existing tests must continue passing.

### Relationship Domain

Cover stable identity, source/target distinction, kind, deterministic evidence, and duplicate prevention.

### Inference

Cover:

- deterministic GitHub↔Vercel match
- no match
- same display name but different repository → no Relationship
- multiple repositories with unambiguous evidence
- Vercel rename stability when evidence remains
- GitHub rename behavior according to stable/canonical evidence
- malformed/missing metadata → no speculative Relationship

### Persistence

Cover insert/upsert, idempotent repeated sync, restart persistence, stale inferred Relationship removal, Resource/Relationship coexistence, and identity safety.

### Sync

Cover:

```text
GitHub success + Vercel success + relationship inferred
```

and incomplete evidence without destructive speculative refresh.

Preserve existing four-provider partial-failure behavior.

### CLI

Where practical, cover `relationships`, empty state, one/multiple Relationships, readable source/kind/target, and secret safety.

## Manual Verification

Sprint 005 is not complete until the real local Combie installation validates:

```bash
bun run combie sync
bun run combie relationships
```

Verify:

- GitHub/Vercel Resources remain correct
- deterministic matches become Relationships
- no name-only false positives
- repeated sync creates no duplicates
- Relationships survive restart
- stale lifecycle behaves safely where testable
- Cloudflare/Sentry remain unaffected
- no credentials appear in Relationship data/output

If real Vercel projects do not expose a matching GitHub repository, document that honestly. Do not manufacture a Relationship.

## Regression Requirement

All v0.1 Connection behavior remains intact: Cloudflare, GitHub, Vercel, Sentry, auth, discovery, normalization, stable identity, SQLite persistence, multi-provider sync, partial failure, restart persistence, and secret safety.

## Explicitly Out of Scope

Do not implement:

- full Engineering Graph or graph database
- generic graph traversal
- arbitrary relationship plugin/framework
- Cloudflare or Sentry relationships
- other cross-provider relationship pairs
- application grouping or environments
- user-authored relationships
- fuzzy/name-based matching
- AI/LLM inference
- embeddings/vector search
- confidence scoring
- approval workflows
- Observations, Changes, timelines/history
- operational memory
- Sentry issues/events
- logs/metrics/traces/telemetry
- investigations/recommendations/learning
- Slack or additional providers
- MCP/API/SDK/web app
- natural-language querying
- controlled/autonomous execution
- hosted Combie/billing
- resource-list UX redesign

Do not scaffold these capabilities.

## Anti-Overengineering Rules

Do not introduce:

```text
GraphEngine
GraphDatabase
RelationshipPluginRuntime
UniversalRelationshipResolver
AIInferenceEngine
ConfidenceEngine
ApplicationTopologyEngine
ContextEngine
MemoryEngine
```

One Relationship primitive plus one evidence-backed resolver is enough.

## Repository Understanding Requirement

Before coding, follow `skills/build-combie/SKILL.md` and inspect the completed Sprint 004 repository.

Identify:

- Resource model/identity
- SQLite boundaries
- provider registry/contract
- GitHub normalized repository metadata
- Vercel normalized project metadata
- real Vercel Git-link payload shape
- sync/partial-failure orchestration
- CLI command structure
- tests
- smallest insertion point for relationship inference
- whether extra provider metadata/API access is actually required

## Implementation Plan Requirement

Before coding, produce a concise plan covering:

- Relationship domain shape
- stable identity
- SQLite schema/repository changes
- exact deterministic GitHub↔Vercel evidence
- minimal provider metadata/discovery changes, if any
- inference location
- stale lifecycle
- sync integration
- CLI
- tests
- live verification

Then implement using Red → Green → Refactor.

If deterministic provider evidence is weaker than expected, do not compensate with heuristics. Report the limitation and implement only what is defensible.

## Documentation Rules

The permanent Combie Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Sprint 005 begins v0.2 Context, so Canon changes are appropriate only if implementation establishes a durable truth not already represented.

Do not create additional permanent architecture documents.

## Sprint Completion Notes

### Implemented

- Provider-independent `Relationship` domain primitive (`src/domain/relationship.ts`)
  - kind: `source_for` only
  - stable id: `rel:{sourceResourceId}:{kind}:{targetResourceId}`
  - compact evidence: source, mechanism, repository, optional githubRepoId / vercelLinkType
- SQLite `relationships` table + upsert/list/get/delete in `Store`
  - schema applied on open so pre-005 DBs gain the table without re-init
- Vercel normalize enrichment: compact `metadata.git` from existing `project.link`
  - no extra API call; only GitHub / github-limited links
  - fields: provider, org, repo, fullName, repoId, linkType
- Deterministic inference (`src/app/infer-github-vercel.ts`) above adapters
  - primary match: Vercel `git.repoId` === GitHub `providerResourceId`
  - fallback only when repoId absent: exact `fullName` equality
  - never matches project/repo display names alone
- Sync integration: refresh Relationships only when **both** GitHub and Vercel succeed this run
  - upsert inferred set; remove stale `source_for` github→vercel edges
  - incomplete evidence → no destructive refresh
- CLI: `combie relationships` with FROM / RELATIONSHIP / TO / EVIDENCE table

### Relationship Evidence

**Source:** Vercel `GET /v9/projects` response field `link` (already returned by list; was previously discarded).

**Shape used (live):**
```json
{
  "type": "github",
  "org": "sgr0691",
  "repo": "demo-hub",
  "repoId": 915052094
}
```

**Why deterministic:** `repoId` is GitHub’s numeric repository id — the same stable identity Combie already uses as GitHub `providerResourceId`. Matching is exact id equality, not names.

**Why `source_for` (not `deploys_to`):** `link` proves the Vercel project is connected to a Git repository as its source. It does not prove every deployment semantic.

**Direction:** GitHub repository → `source_for` → Vercel project.

### Architecture Pressure Results

| Component | Survived? | Notes |
|---|---|---|
| Resource model | YES | Unchanged |
| Provider contract | YES | Unchanged |
| GitHub adapter | YES | Unchanged |
| Vercel adapter | Minimal | Parse `link` into compact `metadata.git` only |
| Cloudflare / Sentry | YES | Untouched |
| SQLite | Extended | One `relationships` table |
| Sync orchestration | Extended | Post-success inference + stale cleanup |
| CLI | Extended | `relationships` command |
| Cross-provider logic | New | App-layer matcher only — adapters stay independent |

### Deviations

- None material. Live inventory had 10 Vercel projects with GitHub `link` and 6 matched visible GitHub repositories; 4 linked repos were not present in the authenticated GitHub inventory — correctly reported as non-matches (zero manufacturing).

### Validation

- **Automated:** 146 tests across 17 files, 635 expect() calls; `bun run typecheck` clean. No live credentials required.
- **Live** (temp dir, real tokens via `--use-gh` + existing Vercel token):
  - connect GitHub + Vercel → sync → 310 repositories + 44 projects
  - **6** `source_for` Relationships inferred (repoId matches)
  - repeated sync: still 6, no duplicates
  - relationships survive re-open
  - credentials absent from relationship evidence and CLI output
  - name-collision Vercel projects without matching repoId did not create edges

### Learnings

> Did this Sprint prove that Combie can move from resource inventory to evidence-backed cross-provider context without requiring a generalized graph platform?

**Yes.** One Relationship primitive, one SQLite table, one deterministic matcher, and one CLI list surface produced real cross-provider context. Provider adapters remained independent. Matching used provider-backed repository identity already present on the Vercel project list response — no graph database, confidence engine, or AI.

Key learning: list-level Vercel project payloads already expose deterministic Git linkage (`link.repoId`). Sprint 005 only needed to **stop discarding** that fact.

Known limitation (pre-existing, not introduced here): Resources are upserted but not garbage-collected on provider-side deletion. Ghost Resources can therefore retain Relationships until a later lifecycle Sprint addresses Resource GC.

### Canon Changes

None. VISION / ARCHITECTURE / ROADMAP already describe Relationships and v0.2 Context; this Sprint implements the first slice without changing permanent Canon documents.

Do not define Sprint 006 here.

## Definition of Done

Sprint 005 is complete only when:

- [x] all Sprint 001–004 behavior remains functional
- [x] minimal provider-independent Relationship primitive exists
- [x] Relationship identity is stable/idempotent
- [x] Relationships persist in SQLite
- [x] deterministic GitHub↔Vercel evidence is identified
- [x] no name-only/fuzzy inference is used
- [x] supported Relationships are inferred
- [x] compact evidence/provenance is stored
- [x] repeated sync does not duplicate Relationships
- [x] stale inferred Relationships are handled safely
- [x] incomplete provider sync does not cause destructive refresh
- [x] `combie relationships` exposes known Relationships
- [x] Relationships survive restart
- [x] Cloudflare/Sentry behavior remains unchanged
- [x] all provider/resource behavior remains valid
- [x] automated tests require no live credentials
- [x] all tests pass
- [x] typecheck/lint requirements pass
- [x] representative live verification is completed
- [x] no speculative Relationship is manufactured when live evidence is absent
- [x] credentials are absent from Relationship data/output
- [x] no graph engine, AI inference, telemetry, memory, MCP, or execution work was introduced
- [x] full diff is reviewed
- [x] Canon remains accurate
- [x] completion notes are updated
- [x] repository state is clean

## What Sprint 005 Proves

Before:

```text
GitHub repository     Vercel project
       ●                    ●
```

After:

```text
GitHub repository ─────────→ Vercel project
                 evidence
```

That edge is the beginning of Combie's Context layer.

Combie no longer only knows:

> These resources exist.

It begins to know:

> These resources are connected, and here is the evidence.

## Final Principle

> **The first edge matters more than the first graph.**

Create one trustworthy cross-provider Relationship. Make it deterministic. Make it explainable. Persist it. Expose it.

Then stop.

Only after Sprint 005 is implemented and validated should Combie decide what the next Context slice needs to be.
