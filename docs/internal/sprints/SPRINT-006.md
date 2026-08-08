# SPRINT-006 — Related Resource Context

> **Roadmap:** v0.2 — Context
> **Status:** Complete
> **Depends on:** SPRINT-005 — First Cross-Provider Relationship
> **Scope:** First relationship-backed context query
> **Primary capability:** Inspect the context around one known Resource

## Goal

Make the relationship Combie earned in Sprint 005 useful to humans and future agents.

Sprint 005 proved:

```text
GitHub repository
      │
      │ source_for
      ▼
Vercel project
```

Sprint 006 adds the smallest query/read capability required to start from one Resource and inspect the Resources directly related to it.

Conceptually:

```text
Known Resource
      ↓
Find Relationships touching it
      ↓
Resolve neighboring Resources
      ↓
Present relationship-backed context
```

At the end of this Sprint, Combie should be able to answer:

> What is directly related to this Resource, and why?

This is not a general graph engine or traversal system.

It is a one-hop context query over the Resources and Relationships Combie already knows.

---

## Why This Sprint Exists

Combie has now proven two layers:

### v0.1 — Connection

```text
Providers → Resources
```

Combie knows what exists.

### v0.2 — Context, first slice

```text
Resources → Relationships
```

Combie knows that some Resources are connected.

Sprint 006 makes that context consumable:

```text
Resource + Relationships + Neighbor Resolution
                    ↓
                  Context
```

The purpose is not to create more data.

The purpose is to make existing evidence-backed context useful.

---

## Sprint Principle

> **Query the edge before expanding the graph.**

Do not add new relationship types merely to make the output richer.

Do not build recursive traversal.

Do not build natural-language querying.

Do not build AI summarization.

Take the trustworthy relationship model already implemented and create one useful read path over it.

---

## User Outcome

A user should be able to identify a Resource and ask Combie for its directly related context.

The exact CLI shape should follow the repository's conventions and be decided after inspecting the current command architecture.

A conceptual example is:

```bash
combie related <resource-reference>
```

which could return:

```text
RESOURCE
GitHub repository: sgr0691/demo-hub

RELATED RESOURCES

source_for →
  Vercel project: demo-hub
  Evidence: Vercel Git link → sgr0691/demo-hub
```

Starting from the Vercel project should also work:

```text
RESOURCE
Vercel project: demo-hub

RELATED RESOURCES

← source_for
  GitHub repository: sgr0691/demo-hub
  Evidence: Vercel Git link → sgr0691/demo-hub
```

The stored Relationship remains canonical:

```text
GitHub repository → source_for → Vercel project
```

Combie does not need to persist a second inverse edge merely to query from the target side.

---

## Scope

Sprint 006 includes:

1. a clear CLI-safe Resource reference/selection mechanism
2. lookup of one existing Resource
3. lookup of Relationships where that Resource is either source or target
4. resolution of the directly neighboring Resources
5. one-hop context representation in the application/domain boundary
6. bidirectional reading of a canonical stored Relationship
7. evidence/provenance surfaced with the relationship
8. a compact CLI command for related context
9. useful empty/not-found/ambiguous states
10. persistence query support required for the read path
11. regression coverage for Sprints 001–005
12. representative live verification against the six relationships discovered in Sprint 005

Everything else is out of scope.

---

## Architecture Target

Conceptually:

```text
                    ┌→ Resource
CLI → Application ──┤
                    └→ Relationships touching Resource
                                  ↓
                         Resolve neighbor Resources
                                  ↓
                            Related Context
                                  ↓
                                 CLI
```

The data already exists:

```text
Resources
Relationships
```

Sprint 006 adds a read model/query over those primitives.

Do not create another persistence representation of the graph.

---

## Architecture Pressure Report

Before implementation, inspect the current Sprint 005 repository and answer:

1. What stable Resource identifiers are exposed internally?
2. What identifiers are practical and safe for a human to supply through the CLI?
3. Can the existing storage layer query a Resource by stable ID?
4. Can it query Relationships by both `sourceResourceId` and `targetResourceId`?
5. Can neighboring Resources be resolved without introducing a graph abstraction?
6. How should the application layer represent relationship direction from the queried Resource's perspective?
7. Can evidence already stored in Sprint 005 be surfaced without provider-specific branching?
8. How should ambiguous human-readable Resource references be handled?
9. Can this read path remain independent of GitHub/Vercel-specific logic?
10. Does any proposed change require modification of provider adapters?

Preferred result:

> This feature should be almost entirely provider-independent.

Provider adapters should ideally require no changes.

---

## Resource Selection

The CLI needs a reliable way to identify one existing Resource.

Do not assume display names are globally unique.

The implementing agent must inspect the existing Resource identity and CLI conventions before selecting the syntax.

Possible approaches include a stable Combie Resource ID or another deterministic provider-aware reference.

For example, conceptually:

```text
github:repository:<provider-id>
```

or:

```text
<stable-combie-resource-id>
```

The exact syntax is not prescribed by this document.

### Requirements

Resource selection must:

- be deterministic
- avoid silently choosing between ambiguous Resources
- work across providers
- not depend on fuzzy matching
- not require provider-specific CLI commands

If convenient human-readable lookup is added, ambiguity must produce an explicit error rather than an arbitrary selection.

Do not build a search engine in this Sprint.

---

## Related Context Read Model

Introduce the smallest application/domain representation required to return related context.

Conceptually:

```ts
RelatedResourceContext {
  resource
  related: [
    {
      relationship
      direction
      resource
    }
  ]
}
```

This is illustrative only.

Use repository conventions.

The representation should allow the caller to understand:

- the queried Resource
- the neighboring Resource
- the canonical Relationship kind
- whether the queried Resource is the source or target
- the evidence/provenance

Do not add graph depth, paths, scores, summaries, or inferred application groupings.

---

## Bidirectional Reading, Canonical Storage

Sprint 005 stores one canonical edge:

```text
repository → source_for → project
```

Sprint 006 must support querying from either endpoint.

From the repository:

```text
repository
   │
   └─ source_for → project
```

From the project:

```text
project
   │
   └─ ← source_for ─ repository
```

Do not persist:

```text
project → sourced_from → repository
```

solely to make reverse lookup convenient.

Direction is a query/presentation concern.

Canonical storage remains unchanged unless implementation reveals a genuine defect.

---

## Persistence Queries

Add only the storage operations required by the feature.

Likely needs include:

- get Resource by stable identifier
- list Relationships touching a Resource
- resolve related Resource IDs

Prefer SQL over a graph abstraction.

A conceptual query may be equivalent to:

```sql
WHERE source_resource_id = ?
   OR target_resource_id = ?
```

Do not introduce recursive CTEs for future traversal unless actually required for this one-hop feature.

Do not introduce graph libraries.

---

## CLI Surface

Add one compact command for related context.

The final command name/syntax should fit the existing CLI.

A likely shape is:

```bash
combie related <resource>
```

but the implementing agent may choose a cleaner existing convention if repository inspection supports it.

### Output

The output should prioritize clarity over raw database identifiers.

It should communicate:

1. queried Resource
2. related Resource(s)
3. relationship kind
4. direction
5. compact evidence/provenance

Example:

```text
GitHub repository
sgr0691/demo-hub

RELATED

source_for →
Vercel project: demo-hub
Evidence: vercel git_repository_reference (sgr0691/demo-hub)
```

Reverse query:

```text
Vercel project
demo-hub

RELATED

← source_for
GitHub repository: sgr0691/demo-hub
Evidence: vercel git_repository_reference (sgr0691/demo-hub)
```

Exact formatting is not contractual.

Do not create a TUI.

---

## Empty State

A valid Resource may have no known Relationships.

This is not an error.

Return a clear state such as:

```text
No related resources discovered for this resource.
```

Do not imply that no relationship exists in reality.

Combie only knows what its current evidence supports.

---

## Resource Not Found

If the supplied Resource reference does not resolve:

```text
Resource not found.
```

Provide concise guidance consistent with existing CLI behavior.

If useful, point the user toward:

```bash
combie resources
```

Do not silently fall back to fuzzy matching.

---

## Ambiguous Resource Reference

If the implementation supports a human-readable reference that matches multiple Resources, fail explicitly.

Conceptually:

```text
Resource reference is ambiguous.
Use a stable resource identifier.
```

Do not choose the first match.

Do not introduce interactive selection in this Sprint.

---

## Evidence / Explainability

Sprint 005 deliberately stored compact evidence.

Sprint 006 should surface it.

Do not reinterpret or embellish the evidence.

If the stored relationship says:

```text
source: vercel
mechanism: git_repository_reference
repository: sgr0691/demo-hub
```

the CLI can explain that relationship using those facts.

Do not generate natural-language explanations with an LLM.

Do not make provider API calls while reading context.

This feature reads Combie's persisted understanding.

---

## Provider Independence

The related-context query must not know:

```text
GitHub
Vercel
Cloudflare
Sentry
```

as special cases.

It operates on:

```text
Resource
Relationship
```

If future Sprints add other Relationship kinds, the same query path should naturally be capable of returning them without redesign.

Do not build those future Relationships now.

---

## No New Provider Calls

`combie related` must not contact GitHub, Vercel, Cloudflare, or Sentry.

It reads local Combie state.

Freshness comes from:

```bash
combie sync
```

This preserves the current explicit local-first model.

---

## Testing Strategy

All existing tests must continue passing.

### Application / Domain Tests

Cover:

- source-side context lookup
- target-side context lookup
- canonical Relationship remains one row
- direction represented correctly
- multiple direct Relationships where present
- no Relationships
- missing Resource
- evidence preserved
- provider-independent behavior

### Persistence Tests

Cover:

- query Relationships by source
- query Relationships by target
- resolve neighbor Resource
- restart persistence
- no duplicate/inverse rows introduced
- dangling/missing Resource handling if relevant to current schema

### CLI Tests

Where practical, cover:

- related command parsing
- source-side output
- target-side output
- empty state
- not-found state
- ambiguous reference state if applicable
- evidence output
- no credentials/secrets
- stable exit behavior

Avoid brittle cosmetic snapshots.

### Regression Tests

Preserve:

- all four provider integrations
- Resource sync
- Sprint 005 inference
- stale Relationship cleanup
- idempotency
- partial-provider failure behavior
- `combie relationships`

---

## Manual Verification

Use the real relationships discovered during Sprint 005.

Representative flow:

```bash
bun run combie sync
bun run combie relationships
bun run combie related <github-resource-reference>
bun run combie related <vercel-resource-reference>
```

Choose one of the six live `source_for` Relationships and verify both directions.

Confirm:

- repository query resolves its Vercel project
- Vercel project query resolves its GitHub repository
- only one canonical Relationship is stored
- evidence is shown
- repeated reads do not mutate state
- no provider network calls are required for the read
- restart preserves the same result
- an unrelated Resource returns a valid empty state
- invalid Resource reference fails clearly
- Cloudflare/Sentry remain unaffected

Record concise results in Sprint completion notes.

---

## Regression Requirement

All behavior from Sprints 001–005 must remain functional.

Specifically preserve:

- Cloudflare connection/discovery
- GitHub connection/discovery
- Vercel connection/discovery
- Sentry connection/discovery
- provider-independent Resource model
- stable Resource identity
- provider-aware identity
- SQLite persistence
- multi-provider sync
- partial failure
- credentials boundary
- `source_for` inference
- Relationship persistence
- stale Relationship cleanup
- `combie relationships`
- secret safety

Sprint 006 is a read capability over existing context.

---

## Explicitly Out of Scope

Do not implement:

- new Relationship kinds
- Cloudflare relationships
- Sentry relationships
- relationship inference changes unless required to fix a regression
- recursive graph traversal
- multi-hop paths
- shortest path
- graph visualization
- graph database
- generic GraphEngine
- application topology
- application grouping
- environments
- search engine
- fuzzy Resource search
- interactive Resource picker
- natural-language query
- AI summaries
- LLM calls
- embeddings
- vector search
- confidence scoring
- Observations
- Changes
- timelines
- memory
- investigations
- recommendations
- learning loops
- telemetry/logs/metrics/traces
- Slack
- new providers
- MCP
- API server
- SDK
- web app
- controlled execution
- autonomous actions
- hosted Combie
- billing
- broad `combie resources` UX redesign

Do not scaffold these capabilities.

---

## Anti-Overengineering Rules

Do not introduce:

```text
GraphEngine
GraphQueryLanguage
GraphTraversalService
ContextEngine
TopologyEngine
SearchEngine
AgentContextService
AIContextSummarizer
```

The feature is:

```text
lookup Resource
      +
query touching Relationships
      +
resolve neighbors
      =
one-hop related context
```

Nothing more.

---

## Repository Understanding Requirement

Before coding, follow `skills/build-combie/SKILL.md` and inspect the completed Sprint 005 repository.

The Repository Understanding Report should identify:

- Resource domain shape
- stable Resource identity
- Relationship domain shape
- Relationship stable identity
- evidence representation
- SQLite Resource operations
- SQLite Relationship operations
- current CLI command architecture
- current `resources` output/reference availability
- current `relationships` command
- application-layer boundaries
- whether a new read model is actually needed
- smallest provider-independent insertion point for related-context lookup

The repository is implementation reality.

Do not assume this document's example syntax matches the code.

---

## Architecture Pressure Requirement

Before implementation explicitly answer:

1. Can related context be implemented entirely above provider adapters?
2. Can reverse lookup use the same canonical Relationship rows?
3. Does current Resource identity provide a practical CLI reference?
4. Are additional DB indexes justified by current queries and data size?
5. Can evidence be surfaced generically?
6. Does this feature expose any defect in Relationship storage?
7. Can the implementation remain one-hop without future graph abstractions?

Make only changes justified by the current Sprint.

---

## Implementation Plan Requirement

Before coding, produce a concise plan covering:

- Resource reference syntax
- Resource lookup
- Relationship lookup
- direction representation
- neighbor resolution
- evidence presentation
- persistence operations/indexes, if required
- CLI command
- error/empty states
- tests
- live verification

Then implement.

---

## Implementation Discipline

Follow:

```text
Red → Green → Refactor
```

Prefer read-path additions over domain redesign.

Do not modify provider adapters unless a genuine regression requires it.

Do not expand relationship inference.

---

## Documentation Rules

The permanent Combie Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Sprint 006 should not require Canon changes unless implementation establishes a durable product/architecture truth missing from the Canon.

Do not create additional permanent architecture documents.

---

## Sprint Completion Notes

### Implemented

- `Store.listRelationshipsForResource(resourceId)` — one-hop SQL (`source OR target`)
- App read model `getRelatedContext` / `formatRelatedContext` (`src/app/related.ts`)
  - resolves Resource by stable id
  - loads touching Relationships
  - resolves neighbor Resources
  - direction: `outbound` (source) / `inbound` (target) relative to query
  - surfaces stored evidence generically
- CLI: `combie related <resource-id>`
- Empty / not-found states; no provider network calls
- Tests: domain/app related, store touch-query, CLI not-found/help

### Resource Reference

**Stable Combie Resource id only:**

```text
provider:kind:providerResourceId
```

Examples:

```text
github:repository:915052094
vercel:project:prj_W7Eweo0ep9oKSczjgdJSZGeSeBvu
```

Chosen because it is already the primary key of the Resource model, is unique across providers, and never requires fuzzy or name-based disambiguation. Human-readable name lookup was **not** added (would need ambiguity handling and approaches a search surface out of scope).

### Architecture Pressure Results

| Question | Result |
|---|---|
| Provider adapters unchanged? | **Yes** — zero adapter edits |
| Canonical Relationship storage unchanged? | **Yes** — no inverse rows |
| Reverse lookup without inverse edges? | **Yes** — same `source_for` row, inbound presentation |
| Evidence provider-independent? | **Yes** — generic `evidence.source` / `mechanism` / `repository` |
| SQLite sufficient? | **Yes** — one additional SELECT, no indexes required |
| Entirely above adapters? | **Yes** — app + storage only |

### Deviations

None material. `combie resources` still does not print resource ids (pre-existing list UX; redesign out of scope). Users supply the stable id from domain identity knowledge or DB/relationships workflows.

### Validation

- **Automated:** 164 tests / 18 files / 703 expects; typecheck clean.
- **Live** (temp dir, real GitHub + Vercel):
  - sync → 6 relationships (unchanged from Sprint 005)
  - `related github:repository:915052094` → outbound `source_for →` Vercel demo-hub + evidence
  - `related vercel:project:prj_W7Eweo0ep9oKSczjgdJSZGeSeBvu` → inbound `← source_for` GitHub sgr0691/demo-hub + evidence
  - empty resource → clear empty state
  - invalid id → not found, exit 1
  - re-read does not change relationship count (still 6)
  - related works with tokens unset (local state only)

### Learnings

> Did Sprint 006 make Combie's existing relationship data useful as context without requiring a generalized graph/query platform?

**Yes.** One SQL touch-query, one app read model, one CLI command turned stored edges into navigable context from either endpoint.

> Is one-hop related context a sufficient primitive for the next Context experiments, or did real usage expose a narrower missing capability?

One-hop is a solid first read primitive. The practical friction is **discovering the resource id** from the CLI (resources table shows name/provider, not id). That is a presentation gap, not a graph/query platform need — and intentionally out of scope for this Sprint.

Do not define Sprint 007 here.

### Canon Changes

None.

---

## Definition of Done

Sprint 006 is complete only when:

- [x] all Sprint 001–005 behavior remains functional
- [x] one existing Resource can be selected deterministically
- [x] direct Relationships can be queried from the source side
- [x] direct Relationships can be queried from the target side
- [x] neighboring Resources are resolved
- [x] canonical Relationship rows are not duplicated for reverse lookup
- [x] relationship direction is understandable from the queried Resource's perspective
- [x] stored evidence/provenance is surfaced
- [x] a valid Resource with no Relationships returns a clear empty state
- [x] missing Resource references fail clearly
- [x] ambiguous references fail clearly if human-readable lookup is supported
- [x] related-context reads make no provider network calls
- [x] related context survives process restart
- [x] `combie related` or equivalent CLI surface works
- [x] Sprint 005 relationship inference remains unchanged and valid
- [x] Cloudflare and Sentry remain unaffected
- [x] automated tests require no live credentials
- [x] all tests pass
- [x] typecheck/lint requirements pass
- [x] both directions of at least one real Sprint 005 Relationship are manually verified
- [x] no new Relationship types, graph traversal, AI, telemetry, memory, MCP, or execution work was introduced
- [x] full diff is reviewed
- [x] Canon remains accurate
- [x] completion notes are updated
- [x] repository state is clean

---

## What Sprint 006 Proves

Sprint 005:

```text
GitHub ● ─────────→ ● Vercel
          source_for
```

Sprint 006:

```text
                ┌──────────────────────┐
                │ GitHub repository    │
                │ sgr0691/demo-hub     │
                └──────────┬───────────┘
                           │
                    source_for →
                           │
                ┌──────────▼───────────┐
                │ Vercel project       │
                │ demo-hub             │
                └──────────────────────┘

                Evidence:
                Vercel Git reference
                sgr0691/demo-hub
```

Combie can now move from:

> These Resources are connected.

to:

> Show me the engineering context directly around this Resource.

That is the first useful read primitive over Combie's emerging Engineering Graph.

---

## Final Principle

> **Make context useful before making it bigger.**

Do not add another edge.

Do not add another provider.

Do not build a graph platform.

Take the trustworthy context Combie already has and make it navigable.

Then stop and learn before deciding Sprint 007.
