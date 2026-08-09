# SPRINT-012 — Resource Context Composition

> **Roadmap:** Investigation foundation
> **Status:** Complete
> **Depends on:** SPRINT-011 — Resource History (`82b0759`)
> **Scope:** Compose existing Resource, Relationship, and Change/History facts into one useful local context view
> **New durable primitives:** None
> **New providers / relationships / provider reads:** None

## Goal

Prove Combie can assemble the trusted facts it already has around one Resource into an investigation-ready context bundle.

Preferred surface:

```bash
combie context <resource-id>
```

The bundle is derived from:

```text
Current Resource
+ one-hop Relationships
+ target Resource Changes / History
= Resource Context
```

This Sprint is composition, not investigation reasoning.

## Why Now

Combie already answers:

```text
combie resources               → What exists?
combie related <resource>      → What is connected?
combie changes                 → What changed globally?
combie history <resource>      → What happened to this Resource?
```

Before adding Neon, PlanetScale, or deeper Investigation behavior, Sprint 012 should expose those primitives together and reveal—through actual use—what context is still missing.

## Sprint Principle

> **Compose before inventing.**

Do not add a Context table, Investigation model, ContextEngine, graph layer, AI summary, correlation system, or provider calls.

Reuse the existing facts and read paths.

## Product Outcome

Illustrative output:

```text
$ combie context vercel:project:prj_123

Vercel project: combie-web
vercel:project:prj_123

CURRENT
provider    vercel
kind        project
name        combie-web

RELATED

← source_for
GitHub repository: sgr0691/combie
github:repository:915052094
Evidence: vercel git_repository_reference (sgr0691/combie)

uses_domain_in →
Cloudflare zone: combie.dev
cloudflare:zone:zone_123
Evidence: vercel custom_domain_apex (combie.dev)

RECENT CHANGES

2026-08-12 14:31
metadata.domains
[] → [app.combie.dev]
```

Exact formatting must follow repository conventions.

## Architectural Hypothesis

Test:

> Can useful investigation context be derived entirely from existing local primitives?

Preferred shape:

```text
SQLite
 ├─ Resource
 ├─ Relationship[]
 └─ Change[]
       ↓
 getResourceContext
       ↓
 CLI formatter
       ↓
 combie context
```

`ResourceContext` may exist as an application/read-model type if useful, but it must not be persisted.

## Scope

Implement only:

1. Inspect Sprint 011 and existing Resource, related-context, and history read paths.
2. Compose the exact target Resource.
3. Compose canonical one-hop inbound/outbound Relationships.
4. Preserve Relationship kind, direction, related Resource identity, and evidence.
5. Compose the target Resource's ordered Changes/history.
6. Preserve grouped field evidence and exact `observedAt` semantics.
7. Add `combie context <resource-id>`.
8. Provide useful empty states for no Relationships and no Changes.
9. Keep exact stable-ID lookup and existing not-found semantics.
10. Keep the entire read offline and read-only.
11. Preserve every existing CLI command and sync behavior.
12. Validate representative context bundles.
13. Record the concrete missing context exposed by this view.
14. Stop.

## Reuse Existing Read Paths

Strongly prefer composing existing application behavior over parallel implementations.

Conceptually:

```text
Resource lookup ──────┐
Related-context read ─┼─→ ResourceContext
History read ─────────┘
```

Reuse application/domain facts, not CLI-formatted strings.

Avoid unnecessary duplicate Resource reads where straightforward, but do not build a generic query framework.

## Current State Contract

The Resource table remains current-state authority.

`combie context` describes what Combie currently knows locally. It does not promise a real-time provider snapshot and must not trigger sync.

Keep the current-state summary lean: provider, kind, name, stable ID, plus only compact metadata already justified by existing conventions.

## Relationship Contract

Use existing canonical Relationship rows and one-hop behavior.

Supported relationship kinds currently include:

```text
source_for
uses_domain_in
```

The context implementation must not special-case those kinds beyond existing generic formatting requirements.

Preserve:

- inbound/outbound direction
- relationship kind
- related Resource stable identity
- provider/kind/name
- evidence

Do not traverse more than one hop. Do not create inverse rows or infer new edges.

Relationship ordering must be deterministic. Reuse existing `related` ordering if explicit; otherwise define the smallest stable ordering and document it.

## History Contract

Reuse Sprint 011 semantics:

- newest-first
- deterministic tie-break
- exact `observedAt`
- grouped changed fields
- before/after evidence
- trustworthy zero-history state

Do not create a second Change representation.

The context view may show a small deterministic recent subset if that is clearly more useful, while `combie history` remains the complete history surface. If a limit is introduced, use a small explicit constant and document it. Do not add pagination or flags in this Sprint.

## Empty States

A valid Resource may have no related context and no recorded Changes.

```text
RELATED
No relationships discovered yet.

RECENT CHANGES
No changes recorded yet.
```

Missing optional context is not an error.

## Resource Not Found

Use the exact stable Resource ID:

```text
provider:kind:providerResourceId
```

Unknown Resources should follow existing `related` / `history` non-success behavior.

No fuzzy search. No provider lookup.

## Offline + Read-Only Requirements

With provider credentials removed, this must still work:

```bash
combie context <resource-id>
```

It must not authenticate, sync, call provider APIs, perform DNS/network lookups, or mutate Resources, Relationships, Changes, credentials, or sync state.

Repeated reads over unchanged local state should be deterministic.

## Context Is Not Investigation

Prefer `context`, not `investigate`.

Sprint 012 assembles evidence an investigation could consume later. It does not answer:

```text
Why did this change?
What caused it?
What was impacted?
Are these two changes related?
```

Do not infer causality, impact, recommendations, or confidence.

## No Cross-Resource Temporal Correlation

Do not include histories of related Resources and do not correlate timestamps across them.

Sprint 012 composes:

```text
target current state
+ target one-hop Relationships
+ target Change history
```

Related Resources are identities/context, not recursively expanded histories.

## Presentation Independence

Keep context composition in the application layer so future interfaces could consume the same facts:

```text
ResourceContext
 ├─ CLI now
 ├─ MCP later
 ├─ API later
 └─ agent later
```

Implement only the CLI now.

## Architecture Pressure Report

Before implementation, inspect commit `82b0759` and answer:

1. What application API powers `combie related`?
2. What application API powers `combie history`?
3. Does history already include the current Resource?
4. Can context compose these without duplicating storage/provider logic?
5. What Relationship evidence shape is exposed?
6. What deterministic ordering does `related` use?
7. What deterministic ordering does `history` use?
8. Can both remain unchanged?
9. Is an application-level `ResourceContext` read model useful?
10. Is any new persistence required?
11. Can context remain one-hop and Resource-scoped?
12. Should context show full history or a small recent subset?
13. Can the operation remain completely offline/read-only?
14. Does composition reveal a missing primitive required before deeper Investigation?
15. Does anything require a Canon change?

Preferred results are no new persistence, no provider calls, no new durable domain primitive, and no AI—but repository reality wins.

## Repository Understanding Requirement

Follow `skills/build-combie/SKILL.md` and inspect the completed Sprint 011 repository at `82b0759`.

Identify:

- Resource model and exact lookup
- Relationship model/evidence
- related-context app and CLI paths
- Change model
- history app and CLI paths
- ordering contracts
- Store queries
- database schema
- not-found behavior
- timestamp/formatting utilities
- CLI registration/parser patterns
- test fixtures
- smallest clean composition boundary

Do not redesign validated Sprint 001–011 behavior.

## Implementation Plan Requirement

Before coding, produce a concise plan covering:

- context read shape
- Resource lookup reuse
- related-context reuse
- history reuse
- ordering
- optional recent-Change limit
- empty/not-found states
- offline/read-only guarantees
- CLI formatting
- tests
- live verification

Then implement.

## Implementation Discipline

Use:

```text
Red → Green → Refactor
```

Expected slice:

```text
existing Resource read ─┐
existing Related read ──┼→ Resource Context → CLI
existing History read ──┘
```

## Testing

All Sprint 001–011 tests must remain green.

### Application

Cover:

- no Relationships / no Changes
- inbound Relationship
- outbound Relationship
- both directions
- multiple Relationships
- `source_for`
- `uses_domain_in`
- one Change
- multiple Changes
- grouped multi-field Change
- deterministic ordering
- exact ID
- unknown Resource
- read-only behavior

### Composition Fixture

Use:

```text
GitHub repository
       │
   source_for
       ▼
Vercel project
       │
 uses_domain_in
       ▼
Cloudflare zone
```

For Vercel context prove the bundle can contain:

```text
current Vercel Resource
inbound GitHub Relationship
outbound Cloudflare Relationship
Vercel Change history
```

without recursively including GitHub/Cloudflare histories.

### CLI

Cover:

- missing argument
- unknown Resource
- no related/no history
- related only
- history only
- related + history
- inbound/outbound direction
- Relationship evidence
- grouped Change evidence
- deterministic output
- offline read

### Regression

Verify unchanged behavior for:

```text
providers
resources
relationships
related
changes
history
sync
```

plus all adapters and relationship resolvers.

## Live Verification

Use the existing local database.

Run:

```bash
bun run combie resources
bun run combie relationships
bun run combie context <known-resource-id>
```

Verify at least:

1. a Resource with a known Relationship
2. a Resource with no Relationships if available
3. a Resource with zero Change history

A result with populated `RELATED` and `No changes recorded yet` is valid.

Remove provider credential environment variables and repeat the context read. It must still succeed.

Do not mutate external infrastructure merely to manufacture richer context.

Positive Change composition can be fixture-proven.

## Required Missing Context Assessment

Sprint completion notes must include a **Missing Context** section based on the actual composed experience.

Answer:

> What concrete evidence is missing that would most improve a future investigation?

Keep this evidence-driven and ranked. Do not create a broad provider wishlist.

Database infrastructure may emerge as a high-value gap, but Sprint 012 must prove that from the resulting context rather than assuming it.

This assessment will inform the planned Neon / PlanetScale expansion before deeper Investigation work.

## Explicitly Out of Scope

Do not implement:

- Neon or PlanetScale
- any new provider
- database relationships
- new Relationship kinds
- Investigation domain/session
- root-cause analysis
- cross-Resource Change correlation
- related Resource histories
- multi-hop traversal
- graph algorithms/database
- Resource snapshots
- Relationship history
- telemetry/logs/metrics/traces
- Sentry events/issues
- deployment or Git history
- AI/LLM summaries
- embeddings/vector storage
- recommendations/confidence
- learning loops
- Slack
- MCP
- API/SDK/web UI
- controlled/autonomous execution
- hosted Combie/billing
- broad CLI redesign

Do not scaffold them.

## Anti-Overengineering

Do not introduce:

```text
ContextEngine
InvestigationEngine
GraphEngine
MemoryEngine
ContextStore
ContextRepository
ContextSnapshot
ContextCache
```

The expected implementation is close to:

```text
getResourceContext(resourceId)
formatResourceContext(context)
```

built from existing reads.

## Canon

Permanent Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Update only if implementation proves an existing statement materially inaccurate.

## Sprint Completion Notes

### Implemented

- Added the derived application-level `ResourceContext` read model and
  `getResourceContext`, composed from the exact current Resource, its existing
  one-hop related-context logic, and its existing scoped history logic.
- Added store-scoped application helpers so context reuses validated
  Relationship direction and history behavior while opening SQLite once and
  resolving the target Resource once.
- Added `formatResourceContext` with compact `CURRENT`, `RELATED`, and `CHANGES`
  sections, related Resource stable identities, generic complete Relationship
  evidence, exact observation timestamps, and grouped before/after fields.
- Added `combie context <resource-id>` with help text, actionable missing-input
  guidance, and existing exact Resource not-found behavior.
- Added focused application and CLI coverage, including the deterministic
  GitHub repository → Vercel project → Cloudflare zone composition fixture.

### Context Contract

- The target is the entire trimmed opaque stable ID
  `provider:kind:providerResourceId`; no fuzzy, display-name, or provider lookup
  occurs.
- `CURRENT` comes from the authoritative persisted Resource and shows its
  provider, kind, name, and stable ID. The derived application read retains the
  full Resource; the CLI keeps the current-state presentation intentionally
  lean.
- `RELATED` contains only canonical Relationship rows touching the target.
  Direction is relative to the target, related Resource identity is resolved
  without traversal, and the complete typed evidence object is retained.
  Ordering remains `kind ASC, source Resource ID ASC, target Resource ID ASC`.
- `CHANGES` contains the target Resource's full scoped history. No recent
  subset was introduced because repository evidence did not justify an
  arbitrary limit. Ordering remains `observedAt DESC, Change ID DESC`; exact
  observation times and grouped field evidence remain unchanged.
- Related Resource histories are never read. Context performs no multi-hop
  traversal, temporal correlation, causality inference, or recommendation.
- Empty Relationships and Changes are valid states with explicit messages.
  Unknown Resources preserve the existing `RESOURCE_NOT_FOUND` non-success
  behavior.
- The operation uses one local Store lifecycle, never reads credentials or
  calls a provider, and does not mutate Resources, Relationships, Changes,
  credentials, provider configuration, or sync state.

### Architecture Pressure Results

- Existing Resource, Relationship/related-context, and Change/history facts
  were sufficient to produce the bundle.
- `ResourceContext` is a transient application read model only. No Context,
  Investigation, Timeline, Graph, Memory, snapshot, or cache was persisted.
- SQLite required no table, migration, index, or new query. Provider adapters,
  Relationship resolvers, Change detection, credentials, and sync remained
  unchanged.
- The first composition pass exposed a duplicate exact Resource read. A narrow
  refactor extracted store-scoped composition helpers from `related` and
  `history`, allowing context to preserve both contracts in one Store lifecycle
  without introducing a generic query framework.
- No provider-specific composition logic, network access, AI, or Canon change
  was required.

### Validation

- Red was confirmed by the missing application module and unknown CLI command.
  After Green/refactor, focused context/related/history/CLI validation passed:
  54 tests and 310 expectations.
- Full regression passed: 269 tests and 1,129 expectations across 24 files.
- `bun run typecheck`, `bun run combie -- help`, and `git diff --check` passed.
- The deterministic fixture proves one Vercel Resource simultaneously exposes
  an inbound GitHub `source_for` Relationship, an outbound Cloudflare
  `uses_domain_in` Relationship, full evidence for both, and only its own two
  ordered Changes, including one grouped multi-field Change. Sentinel GitHub
  and Cloudflare Changes do not enter the bundle.
- Offline/read-only tests remove all supported provider credential environment
  variables, make `fetch` fail, compare repeated results, preserve a credential
  file byte-for-byte, and verify non-empty provider state plus Resources,
  Relationships, and Changes remain unchanged.
- The existing local database contained 45 Resources (44 Vercel projects and
  one Cloudflare zone), two connected providers, zero Relationships, and zero
  Changes. Offline context reads for the Cloudflare zone and a Vercel project
  both rendered correct current state plus the two valid empty states.
- The live database's schema-and-data SHA-3 remained
  `ac1892c111718a70e68283d7efcc432972f50d92296fa6f36ec96dc4` before and after
  the credential-free context reads. The database had no known Relationship to
  demonstrate live; positive Relationship composition is therefore proven by
  the deterministic fixture without syncing or mutating external systems.

### Missing Context

Ranked from the actual composed fixture and live database experience:

1. **Relationship coverage around deployed projects.** The live inventory has
   44 Vercel projects and one Cloudflare zone but zero Relationship rows, so no
   live context can identify source ownership or domain dependency. GitHub
   Resources are absent entirely, making `source_for` evidence unavailable;
   the existing Vercel/Cloudflare inventory also currently yields no
   `uses_domain_in` edge. This is the largest immediate investigation gap.
2. **Observed target history and freshness.** All 45 live Resources have zero
   recorded Changes. The trustworthy zero state is correct, but a future
   investigation has no preceding transition or per-target observation time
   from which to evaluate the current state.
3. **Application data-dependency evidence.** The live inventory contains only
   Vercel projects and a Cloudflare zone—no database Resource or dependency
   Relationship—so context cannot show whether a target depends on a data
   service. This is a concrete graph gap exposed by the inventory, not a broad
   request for additional providers in this Sprint.

### Learnings

- Yes. Current Resource state, canonical one-hop Relationships, and exact
  target Change history compose into a deterministic, investigation-ready fact
  bundle without a new durable primitive or reasoning layer.
- The next evidence gap worth filling before deeper Investigation is not a new
  Context model. It is trustworthy Relationship coverage around real deployed
  projects, followed by meaningful observed history. Data-service dependency
  evidence is the next concrete graph-coverage gap shown by the current
  inventory. None of those gaps is implemented here.

### Canon Changes

None.

## Definition of Done

- [x] Inspect `82b0759` first
- [x] Repository Understanding report
- [x] Architecture Pressure report
- [x] No new durable Context/Investigation model
- [x] Exact stable Resource ID
- [x] Current Resource from existing persistence
- [x] One-hop canonical Relationships
- [x] Direction and evidence preserved
- [x] Target Changes from existing history
- [x] Change grouping/timestamps preserved
- [x] Deterministic ordering
- [x] `combie context <resource-id>` implemented
- [x] Useful no-Relationship/no-Change states
- [x] Explicit unknown Resource behavior
- [x] Offline and read-only
- [x] No provider calls
- [x] No recursive related history
- [x] No cross-Resource correlation
- [x] No AI interpretation
- [x] Existing `related`, `changes`, `history`, and sync unchanged
- [x] `source_for` and `uses_domain_in` remain correct
- [x] Deterministic Resource + Relationships + Changes fixture
- [x] Live context read
- [x] Offline live context read
- [x] All prior behavior remains functional
- [x] All tests/typecheck pass
- [x] No secrets stored/printed
- [x] Full diff reviewed
- [x] Missing Context assessment completed
- [x] Canon accurate
- [x] Completion notes updated
- [x] Clean repository

## What Sprint 012 Proves

```text
Resource
   ├── Current
   ├── Relationships
   └── Changes
          ↓
     Resource Context
```

The desired architectural result:

```text
Context Bundle ≠ new stored primitive

Context Bundle =
Resource
+ Relationships
+ Changes
```

This deterministic evidence package can later feed humans, agents, MCP/API surfaces, and investigation logic without implementing those systems now.

## Final Principle

> **Before Combie reasons about an engineering system, it should assemble the facts it already knows about that system.**

Compose current state.

Compose relationships.

Compose observed history.

Do not infer.

Do not correlate.

Do not persist the composition.

Prove what context is missing.

Then stop.
