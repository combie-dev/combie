# SPRINT-009 — Vercel ↔ Cloudflare Domain Relationship

> **Roadmap:** v0.2 — Context
> **Status:** Complete
> **Depends on:** SPRINT-008 — Vercel Domain Enrichment
> **Scope:** Second deterministic cross-provider Relationship resolver
> **Providers:** Vercel + Cloudflare
> **Relationship:** `uses_domain_in`

## Goal

Implement Combie's second evidence-backed cross-provider Relationship.

Sprint 007 identified the strongest next candidate:

```text
Vercel project
      │
      │ custom domain apex
      ▼
Cloudflare zone
```

Sprint 008 acquired and normalized the missing Vercel-side evidence. Sprint 009 now consumes that evidence to infer:

```text
Vercel project ── uses_domain_in ──→ Cloudflare zone
```

only when:

```text
normalized Vercel custom-domain apex
        ==
normalized Cloudflare zone name
```

The resolver must be deterministic, explainable, idempotent, and safe under partial sync/enrichment failure. No new provider enrichment is added in this Sprint.

## Why This Sprint Exists

Combie currently has one production resolver:

```text
GitHub repository ── source_for ──→ Vercel project
```

Sprint 006 made that context queryable. Sprint 007 proved provider evidence—not graph infrastructure—is the bottleneck. Sprint 008 acquired the exact Vercel domain facts needed for the strongest second edge.

Sprint 009 asks:

> Can the same Relationship infrastructure support a second resolver across a different provider pair and different evidence without redesign?

If yes, the Context layer is no longer a one-off GitHub↔Vercel implementation.

## Sprint Principle

> **Consume only evidence Combie has already earned.**

Do not add DNS heuristics, query DNS, inspect Cloudflare DNS records, add Vercel enrichment, match display names, or use AI.

Use persisted synchronized Resource facts only.

## Current Evidence Contract

Sprint 008 established Vercel project domain evidence conceptually like:

```yaml
provider: vercel
kind: project
providerResourceId: prj_...
metadata:
  git:
    ...
  domains:
    - hostname: app.example.com
      apexName: example.com
      custom: true
```

Important semantics:

```text
domains: []
```

means domain enrichment succeeded and there are no matchable custom domains.

Missing/omitted domain evidence means enrichment is unknown because it failed or was unavailable.

Cloudflare already exposes zone Resources with a stable provider identity and zone name, conceptually:

```yaml
provider: cloudflare
kind: zone
providerResourceId: ...
name: example.com
```

Sprint 009 joins those facts.

## Relationship Semantic

The canonical new Relationship kind is:

```text
uses_domain_in
```

Direction:

```text
Vercel project ── uses_domain_in ──→ Cloudflare zone
```

It means:

> The Vercel project has a custom domain whose normalized apex belongs to the discovered Cloudflare zone.

It does **not** mean Cloudflare hosts the application, either provider deploys to the other, Cloudflare necessarily proxies all traffic, or current DNS records point to Vercel.

Do not strengthen the semantic beyond the evidence.

## Deterministic Join Rule

Create a Relationship only when a normalized custom Vercel domain apex exactly equals a normalized Cloudflare zone name.

Conceptually:

```ts
vercelDomain.custom === true
&& normalizeDnsName(vercelDomain.apexName)
   === normalizeDnsName(cloudflareZone.name)
```

No fuzzy matching. No name matching. No DNS/network lookup. No suffix guessing beyond Sprint 008's provider-backed normalized apex.

### Examples

Custom apex:

```text
Vercel: hostname=example.com, apexName=example.com
Cloudflare: zone.name=example.com
→ one uses_domain_in edge
```

Custom subdomain:

```text
Vercel: hostname=app.example.com, apexName=example.com
Cloudflare: zone.name=example.com
→ one uses_domain_in edge
```

Multiple hostnames with the same apex:

```text
app.example.com
api.example.com
www.example.com
```

must create only one project→zone Relationship.

If one project has domains in two discovered Cloudflare zones, two distinct Relationships are valid.

`*.vercel.app` must never create this Relationship.

## Scope

Sprint 009 includes:

1. add `uses_domain_in` to the existing Relationship kind model
2. implement deterministic Vercel project ↔ Cloudflare zone inference
3. use only persisted Resource evidence
4. store compact evidence/provenance
5. reuse existing stable Relationship identity
6. idempotent upsert through existing persistence
7. stale cleanup owned by this resolver
8. safe known-empty handling
9. safe unknown-enrichment handling
10. safe Vercel/Cloudflare partial-sync behavior
11. preserve the existing `source_for` resolver
12. expose the new kind through existing `combie relationships`
13. expose it through existing bidirectional `combie related`
14. focused resolver/persistence/sync/read-path tests
15. representative live verification
16. architecture review proving the Relationship infrastructure remains reusable

Everything else is out of scope.

## Architecture Target

```text
Resources
   │
   ├── GitHub + Vercel
   │        ↓
   │     source_for
   │
   └── Vercel + Cloudflare
            ↓
      uses_domain_in
            ↓
      Relationships
            ↓
          SQLite
            ↓
 relationships / related
```

Do not introduce a graph engine, graph database, or resolver plugin runtime. Two concrete resolvers remain a small system.

## Architecture Pressure Report

Before implementation, inspect the completed Sprint 008 repository and answer:

1. Where does current `source_for` inference run?
2. How are Relationship kinds represented?
3. How are stable Relationship IDs generated?
4. How is resolver ownership represented or implied for stale cleanup?
5. How does sync decide when GitHub↔Vercel inference is safe to refresh?
6. How should Vercel↔Cloudflare refresh safety fit that model?
7. Can `uses_domain_in` use the existing evidence shape unchanged?
8. Can `relationships` and `related` render the new kind naturally?
9. Is Cloudflare zone `name` already normalized sufficiently, or is a tiny shared DNS-name normalization helper justified?
10. Can domain unknown vs known-empty be respected without changing Resource architecture?
11. Does a second resolver create enough real duplication to justify any tiny shared helper?
12. Does any proposed abstraction solve today's two resolvers, or only hypothetical future ones?

Prefer concrete code over speculative framework design.

## Resolver Boundary

The resolver belongs beside existing cross-provider inference in the application/context layer.

Do not make provider adapters call one another.

Adapters discover provider facts. Resolvers interpret persisted facts across providers.

## Relationship Kind

Add `uses_domain_in` through the smallest existing Relationship-kind extension.

Do not introduce a Relationship ontology, registry, schema language, or plugin system.

The system has two kinds:

```text
source_for
uses_domain_in
```

A simple model remains appropriate.

## Evidence / Provenance

Store enough compact evidence to explain why the edge exists.

Conceptually:

```yaml
source: vercel
mechanism: custom_domain_apex
apexName: example.com
hostnames:
  - app.example.com
```

Follow the existing evidence model.

Evidence should identify the provider fact, normalized apex, and optionally compact relevant hostname(s).

Do not store entire provider responses, credentials, or unrelated metadata.

If multiple hostnames support the same project→zone edge, retain one canonical Relationship row.

## Relationship Identity

Reuse the existing stable formula, conceptually:

```text
sourceResourceId + relationshipKind + targetResourceId
```

Relationship identity must not depend on hostname.

Changing `app.example.com` to `www.example.com` while the project still uses `example.com` should not create a different project→zone edge.

## Known-Empty Domain Evidence

When Sprint 008 has authoritatively stored:

```yaml
domains: []
```

the project currently provides no evidence for `uses_domain_in`.

If both required providers synchronized successfully, stale `uses_domain_in` Relationships for that project may be removed when no supporting custom apex remains.

This remains a current-state Relationship model, not historical topology.

## Unknown Domain Evidence

Missing domain metadata caused by enrichment failure is not negative evidence.

Do not destructively remove existing `uses_domain_in` Relationships for that project solely because current domain evidence is unknown.

Conceptually:

```text
known empty → stale cleanup may proceed
unknown     → preserve prior affected edge
```

Make this behavior explicit and testable. Do not add a general uncertainty engine.

## Provider Sync Failure Safety

The resolver requires trustworthy current evidence from both Vercel and Cloudflare.

If Vercel provider sync fails, do not refresh/delete `uses_domain_in`.

If Cloudflare provider sync fails, do not refresh/delete `uses_domain_in`.

If both provider syncs succeed but some Vercel projects have unknown domain enrichment, refresh only where evidence is authoritative and preserve prior edges for unknown projects.

Successful provider Resource work must survive unrelated failures.

## Stale Cleanup

The new resolver owns only `uses_domain_in` Relationships it infers.

It must not delete or modify `source_for`.

Examples:

### Custom Domain Removed

Before:

```text
project custom apex = example.com
Cloudflare zone example.com exists
edge exists
```

After authoritative Vercel enrichment:

```text
domains: []
```

with successful Vercel + Cloudflare sync:

```text
edge removed
```

### Domain Enrichment Failed

Existing edge + current unknown domain enrichment:

```text
edge preserved
```

### Zone Removed

If Vercel and Cloudflare sync both complete successfully and the previously matching Cloudflare zone is authoritatively absent, the stale `uses_domain_in` edge may be removed.

## Cloudflare Zone Matching

Use discovered Cloudflare `zone` Resources only.

Do not add DNS-record discovery or provider calls during resolver execution.

Normalize zone names deterministically for comparison without changing Cloudflare Resource identity.

## Existing `source_for` Resolver

Do not regress:

```text
GitHub repository ── source_for ──→ Vercel project
```

The two resolvers should coexist.

A Vercel project may become a junction:

```text
GitHub repository
      │
      │ source_for
      ▼
Vercel project
      │
      │ uses_domain_in
      ▼
Cloudflare zone
```

Do not add multi-hop traversal merely because this topology exists.

## Existing CLI Read Surfaces

`combie relationships` should naturally render both kinds.

`combie related` should naturally render `uses_domain_in` from either endpoint while storing only the canonical edge.

Do not redesign either command unless the new kind exposes a concrete current defect.

Do not persist inverse rows.

## Live Account Reality

Sprint 008 verified:

```text
44 Vercel projects
44 authoritative domain checks
0 custom domains
0 unknown enrichments
```

Therefore the expected live result today is likely:

```text
0 uses_domain_in Relationships
```

That is successful.

Do not manufacture a custom domain or mutate DNS to create a demo edge.

Positive matching must be proven deterministically through automated fixtures/integration tests if no real custom domain exists.

## Testing Strategy

All existing tests must continue passing.

### Relationship Kind

Cover:

- `uses_domain_in` is valid
- stable identity differs from `source_for`
- existing Relationship behavior remains intact

### Resolver

Cover:

- exact custom-apex match → one edge
- custom subdomain with matching apex → one edge
- case/trailing-dot normalization where applicable
- multiple hostnames same apex → one edge
- multiple matching zones → distinct valid edges
- custom apex with no Cloudflare zone → no edge
- known-empty domains → no edge
- unknown domains → no new speculative edge
- unknown domains preserve prior affected edge during refresh
- `vercel.app` never matches
- display-name similarity never matches

### Stale Cleanup

Cover:

- supported edge remains
- authoritative custom-domain removal deletes stale edge
- authoritative zone removal after complete sync deletes stale edge
- Vercel provider failure preserves existing edges
- Cloudflare provider failure preserves existing edges
- project-level unknown preserves that project's prior edges
- cleanup does not touch `source_for`

### Persistence

Cover:

- insert/upsert
- repeated inference is idempotent
- restart persistence
- one edge per project-zone pair despite multiple hostnames
- coexistence with `source_for`

### Context Reads

Verify existing `relationships` and `related` support the new kind in both directions without inverse storage.

### Regression

Preserve all Sprint 001–008 behavior.

## Manual Verification

Run against the real local installation:

```bash
bun run combie sync
bun run combie relationships
```

Expected current behavior:

- Vercel and Cloudflare sync successfully when configured
- Vercel domain enrichment remains authoritative
- zero custom domains remains valid
- zero `uses_domain_in` edges is acceptable
- existing `source_for` Relationships remain unchanged

Then verify existing Vercel related context still works:

```bash
bun run combie related <existing-vercel-resource-id>
```

If a Cloudflare zone has no related Vercel project, its related-context result should remain validly empty.

Positive `uses_domain_in` behavior may be fixture-proven when no real custom domain exists.

## No New Provider Reads

The resolver must not call Vercel, Cloudflare, DNS, WHOIS, public-suffix services, or HTTP endpoints.

All inference evidence comes from local synchronized state.

## No New Persistence Model

Reuse existing Resources and Relationships.

Do not add domain, topology, edges-v2, or relationship-evidence tables.

SQLite remains sufficient.

## Performance

Expected volume is small. Straightforward application-layer matching is acceptable.

Do not add indexes, caches, graph structures, or optimization infrastructure unless a real measured issue appears.

## Regression Requirement

Preserve all behavior from Sprints 001–008, including:

- four provider integrations
- explicit auth
- Resource normalization and stable identity
- SQLite persistence
- multi-provider sync and partial failure
- Vercel Git metadata
- Vercel domain enrichment
- known-empty vs unknown semantics
- GitHub↔Vercel `source_for`
- Relationship persistence and stale cleanup
- `combie relationships`
- `combie related`
- offline context reads
- secret safety

Sprint 009 is additive.

## Explicitly Out of Scope

Do not implement:

- additional Vercel enrichment
- Cloudflare DNS record discovery
- DNS resolution/validation/mutation
- domain creation/deletion
- a third Relationship resolver
- GitHub↔Sentry
- Vercel↔Sentry
- GitHub↔Cloudflare
- multi-hop traversal
- path finding
- topology/application grouping
- environments
- graph database
- GraphEngine
- resolver plugin framework
- confidence scoring
- fuzzy matching
- AI/LLM inference
- embeddings
- source-code scanning
- environment-variable values
- telemetry/logs/metrics/traces
- Sentry issues/events
- Observations
- Changes
- timelines
- memory
- investigations
- recommendations
- learning loops
- new providers
- Slack
- MCP
- API server
- SDK
- web app
- controlled/autonomous execution
- hosted Combie
- billing
- broad CLI UX redesign

Do not scaffold these capabilities.

## Anti-Overengineering Rules

Do not introduce:

```text
GraphEngine
ResolverRegistry
RelationshipPluginRuntime
DomainEngine
DNSEngine
TopologyEngine
EvidenceEngine
ConfidenceEngine
```

Two concrete resolvers do not require a framework.

If both share a tiny obvious operation, extract only that operation. Do not abstract provider-specific evidence into a fake universal model.

## Repository Understanding Requirement

Before coding, follow `skills/build-combie/SKILL.md` and inspect the completed Sprint 008 repository at commit `71aa8c2`.

The Repository Understanding Report should identify:

- Relationship domain shape and kinds
- stable Relationship identity
- evidence representation
- SQLite Relationship operations
- current `source_for` resolver
- stale cleanup behavior
- sync success/failure tracking
- exact Vercel `metadata.domains` representation
- known-empty representation
- unknown enrichment representation
- Cloudflare zone Resource shape
- zone-name normalization
- `relationships` command
- `related` command
- smallest insertion point for the second resolver

The repository is implementation reality. Do not force illustrative shapes onto it.

## Implementation Plan Requirement

Before coding, produce a concise plan covering:

- `uses_domain_in` kind extension
- Vercel domain evidence parsing
- Cloudflare zone normalization
- deterministic matching
- evidence representation
- Relationship identity/upsert
- resolver refresh ownership
- known-empty handling
- unknown handling
- provider-failure safety
- stale cleanup
- coexistence with `source_for`
- CLI/read-path compatibility
- tests
- live verification

Then implement.

## Implementation Discipline

Follow:

```text
Red → Green → Refactor
```

Prefer one concrete resolver.

Do not generalize until duplication is real and harmful.

## Documentation Rules

The permanent Combie Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

A second production Relationship resolver may establish a durable Context-layer architectural truth. Update Canon only if the existing documents become materially inaccurate without it.

Do not create a new permanent graph/relationship architecture document.

## Sprint Completion Notes

### Implemented

- Added `uses_domain_in` as the second `RelationshipKind` through the existing
  union, stable identity, evidence model, and SQLite persistence.
- Implemented the deterministic Vercel project ↔ Cloudflare zone resolver in the
  application/context layer (`src/app/infer-vercel-cloudflare.ts`), beside the
  existing `source_for` resolver. Provider adapters remain independent.
- Reused `relationshipId(source, kind, target)`, `upsertRelationship`,
  `deleteRelationshipsByIds`, `listRelationshipsForResource`, and both CLI read
  surfaces unchanged in architecture.
- Added a second sync-owned refresh gate (`refreshVercelCloudflareRelationships`)
  mirroring the existing GitHub↔Vercel gate, with resolver-scoped stale cleanup.
- Extended `RelationshipEvidence` with optional `apexName`/`hostnames`; made
  `repository` optional. No new evidence table, type hierarchy, or registry.
- Exposed `SyncProviderResult.discoveredResourceIds` so resolver cleanup can
  distinguish live from stale persisted zone Resources without deleting
  Resources.
- Added resolver unit tests, sync-integration tests (positive, subdomain,
  multi-hostname, multi-zone, no-match, `vercel.app`, known-empty, unknown,
  Vercel failure, Cloudflare failure, stale domain/zone removal, idempotency,
  restart persistence, `source_for` coexistence), bidirectional `related` tests,
  and CLI surface tests.

### Evidence Contract

Matching uses only persisted synchronized Resource facts:

- Vercel side: `vercel:project:*` Resource `metadata.domains[]` entries
  `{hostname, apexName, custom: true}` produced by Sprint 008. `[]` is
  authoritative known-empty; an omitted `domains` key is unknown.
- Cloudflare side: `cloudflare:zone:*` Resource `name`.
- Join rule: `normalize(apexName) === normalize(zone.name)` where normalization
  is lowercase + trailing-dot trim, applied for comparison only. Zone Resource
  identity is never mutated. Malformed/`custom !== true`/`vercel.app` entries
  are dropped.

### Relationship Semantic

`uses_domain_in` is the strongest supported semantic because the only shared,
provider-backed fact is that a Vercel custom domain's normalized apex equals a
discovered Cloudflare zone name. It does **not** claim Cloudflare hosts the app,
that either provider deploys to the other, that Cloudflare proxies all traffic,
or that current DNS records point to Vercel. Identity is endpoint+kind based and
never hostname based, so hostname churn within the same apex keeps one edge.

### Refresh / Cleanup Semantics

- Full success (Vercel + Cloudflare both ok this run): infer, upsert, and clean
  stale `uses_domain_in` edges only.
- Known-empty (`domains: []`) with no supporting apex: stale edge removed.
- Unknown enrichment (omitted `domains`): prior affected edges preserved; never
  treated as negative evidence.
- Vercel provider failure: refresh skipped; existing edges preserved.
- Cloudflare provider failure: refresh skipped; existing edges preserved.
- Stale domain removal (authoritative custom-domain loss): edge removed.
- Stale zone removal (zone absent from this run's discovered ids): edge removed
  even if a stale persisted zone Resource still supports inference.
- Cleanup never modifies or deletes `source_for`. Single-provider syncs never
  refresh either resolver.

### Architecture Pressure Results

- Relationship primitive, stable identity, evidence serialization, and SQLite
  schema survived unchanged; only two optional evidence fields were added.
- The app-layer resolver boundary held: a second concrete resolver dropped in
  beside the first with no provider-adapter coupling and no shared runtime.
- `combie relationships` and `combie related` rendered the new kind with no
  redesign; inverse rows remain unpersisted.
- Real abstraction pressure appeared but stayed small: the two refresh gates and
  stale-cleanup flow are visibly similar. It was deliberately **not** extracted
  into a framework (see Learnings). The one genuinely new concept
  (`discoveredResourceIds`) reflects a real gap — Combie does not delete stale
  Resources — not speculation.

### Deviations

None.

### Validation

- Automated: resolver + sync + related + CLI + domain-kind tests added; full
  suite 226 tests pass across 21 files; `bun run typecheck` clean. Positive
  matching proven via deterministic fixtures (custom apex, subdomain,
  multi-hostname, multi-zone, IDN/case/trailing-dot normalization).
- Live: connected Cloudflare and Vercel; `combie sync` stored 1 Cloudflare zone
  (`usecmd.dev`) and 44 Vercel projects (44 known-empty domain checks, 0 custom
  domains, 0 unknown). `combie relationships` correctly reported 0
  `uses_domain_in` edges; `combie related` on both the zone and a Vercel project
  returned validly-empty context. Repeated sync remained idempotent.
- Secret safety: credentials remain in the separate mode-0600 file; the token is
  absent from the domain DB, Resource metadata, and all CLI output.

### Learnings

> Did Combie support a second deterministic cross-provider Relationship without
> generalized graph infrastructure?

**Yes.** The second resolver reused the existing Relationship kind model, stable
identity, evidence representation, SQLite persistence, app-layer boundary,
stale-cleanup model, and both CLI surfaces. No graph engine, registry, or plugin
runtime was needed.

> Is the resolver architecture still appropriately concrete, or has real
> duplication appeared that should influence a future Sprint?

Still appropriately concrete, with acknowledged small duplication. The two
resolvers share an obvious refresh-gate + infer/upsert/cleanup shape. With only
two concrete cases and different evidence semantics, extracting a generic
resolver framework now would be speculation. If a third resolver arrives, that
is the point to revisit whether the shared flow deserves a tiny extraction.

### Canon Changes

`None`.

Do not define or implement Sprint 010 here.

## Definition of Done

Sprint 009 is complete only when:

- [x] Sprint 008 repository is inspected first
- [x] `uses_domain_in` exists as the second Relationship kind
- [x] inference uses only persisted synchronized Resource facts
- [x] custom-domain apex matches Cloudflare zone deterministically
- [x] no name/fuzzy/AI/DNS inference is used
- [x] `vercel.app` never creates an edge
- [x] multiple hostnames in one zone create one project→zone edge
- [x] multiple matching zones can create distinct valid edges
- [x] compact evidence/provenance is stored
- [x] existing stable Relationship identity is reused
- [x] repeated sync does not duplicate edges
- [x] authoritative domain removal cleans stale edges
- [x] authoritative zone removal cleans stale edges after complete sync
- [x] unknown domain enrichment preserves prior affected edges
- [x] Vercel failure prevents destructive resolver refresh
- [x] Cloudflare failure prevents destructive resolver refresh
- [x] stale cleanup does not affect `source_for`
- [x] existing GitHub↔Vercel Relationships remain valid
- [x] `combie relationships` renders both kinds
- [x] `combie related` reads the new kind from both endpoints
- [x] no inverse rows are stored
- [x] no new provider API calls occur during inference
- [x] no new persistence model is introduced
- [x] automated positive matching is proven
- [x] current live zero-edge path is verified honestly
- [x] all Sprint 001–008 behavior remains functional
- [x] all tests pass
- [x] typecheck/lint requirements pass
- [x] no secrets are stored or printed
- [x] no third resolver, graph engine, telemetry, memory, AI, MCP, or execution work is introduced
- [x] full diff is reviewed
- [x] Canon remains accurate
- [x] completion notes are updated
- [x] repository state is clean

## What Sprint 009 Proves

Before:

```text
GitHub repository
      │
      │ source_for
      ▼
Vercel project

Cloudflare zone
      ●
```

When evidence exists after Sprint 009:

```text
GitHub repository
      │
      │ source_for
      ▼
Vercel project
      │
      │ uses_domain_in
      ▼
Cloudflare zone
```

Every edge exists because synchronized provider control-plane facts support it.

Combie now has two different cross-provider evidence mechanisms:

```text
GitHub provider identity
        ↓
source_for

custom-domain apex
        ↓
uses_domain_in
```

That is the meaningful Context architecture test.

## Final Principle

> **The graph grows only when synchronized facts justify an edge.**

Use the evidence Sprint 008 acquired.

Match exactly.

Respect unknown evidence.

Preserve existing context.

Create one second Relationship kind.

Then stop.

Only after Sprint 009 is implemented and validated should Combie decide what the Context layer needs next.
