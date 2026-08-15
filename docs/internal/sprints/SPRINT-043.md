# SPRINT-043 — Sentry Release Evidence

> **Status:** Active
> **Depends on:** SPRINT-042 (complete)
> **Authorized by:** SPRINT-042 next-phase decision (founder override, 2026-08-15)
> **Roadmap:** v0.5 Investigation foundation + v0.3 Memory evidence depth
> **Type:** Narrow provider-evidence vertical slice
> **Primary goal:** Ingest compact Sentry release history as trustworthy
> provider-native evidence with exact project association and provider-native
> time, then expose it through Combie's existing offline investigation and
> frozen MCP path.
> **Provider scope:** Sentry only (releases)
> **Generic Event abstraction:** Not assumed
> **New Relationship kinds:** None in this Sprint
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / correlation / causality / telemetry:** None

---

# Goal

Sprint 042 concluded the GitHub-first closed-beta decision phase. The
shipped Intelligent MVP loop remains:

```text
INSTALL → CONNECT → SYNC → AGENT SETUP → GROUNDED INVESTIGATION
```

Authorization for this sprint is the **Sprint 042 next-phase handoff**, not
the pre-beta roadmap audit. The founder selected the Provider / Evidence
Depth branch and this Sentry operational-evidence slice. The written 042
three-independent-tester threshold was not met in the repository record;
the founder override replaces that unmet quantitative threshold for
choosing the next phase. See `SPRINT-042.md` Completion Notes.

Sprint 019 ranked Sentry releases as the next Sentry evidence family after
Vercel deployments, GitHub workflow runs, and Neon operations — three
families Combie already persists. That ranking is architectural context,
not authorization. Sprint 043 implements the authorized slice.

Combie already knows Sentry project Resources, proven Relationships,
InvestigationContext, Known Facts, Missing Context, and provider-activity
chronology for Vercel and GitHub. Sprint 043 adds one stronger evidence
family:

```text
Sentry project
└── release history
```

Release evidence must come from Sentry's official read-only API, carry stable
provider identity and provider-native time, bind exactly to an existing
`sentry:project:<providerResourceId>` Resource, persist deterministically,
remain compact and secret-safe, and be readable offline after sync.

Do not generalize to all provider events before learning from this
implementation.

---

# Product Question

> After connecting Sentry and syncing, can Combie truthfully show release
> evidence for an exact Sentry project in CLI and MCP investigations — with
> provider-native time, authority semantics, and no unsupported causal claims —
> so an external agent can reason about operational history across GitHub,
> Vercel, and Sentry?

---

# Why Now

Sprint 018 proved `Change.observedAt` is Combie observation time, not provider
event time. Sprints 020–021 established the provider-first evidence envelope
for Vercel deployments and GitHub workflow runs. Sprint 037 identified Sentry
issues/releases as the most conspicuous missing operational evidence family.
That pre-beta audit is architectural context only.

Sprint 042's recorded next-phase decision (founder override, 2026-08-15)
selects this direction:

```text
Do not finish v0.2 ontology first.
Do not add providers.
Do not build an Investigation Engine or BYO model layer.
Do add the operational evidence Investigations are missing.
```

The target investigation chain:

```text
GitHub workflow / commit evidence
        ↓
Vercel deployment evidence
        ↓
Sentry release evidence          ← this Sprint
```

Combie supplies facts. The agent reasons. Combie must not upgrade temporal
proximity into causality.

> **Add stronger evidence, not stronger claims.**

---

# Governing Boundaries

Preserve all shipped beta guarantees:

- six provider adapters and current Resource kinds
- two deterministic Relationship kinds (`source_for`, `uses_domain_in`)
- retained Change and provider-native evidence semantics
- exact Resource IDs and one-hop context
- local, offline investigation composition
- exactly four MCP tools with frozen schemas and read-only annotations
- explicit credential authorization and secret-safe output

Sprint 043 may add Sentry release persistence and investigation surfacing
only. It must not expand MCP tools, add write paths, or introduce speculative
relationships.

---

# Baseline

Begin from the post–Sprint 042 / v0.1.1 product baseline:

```text
HEAD:          f0d1f91 (record actual SHA at sprint start in completion notes)
public release: v0.1.1
tests:         699 pass across 59 files (record actual count at sprint start)
typecheck:     clean
MCP:           exactly four read-only tools
Sentry today:  project discovery only — no release/issue/event evidence
```

Verify the actual repository state before coding. Record the exact SHA in
completion notes. **STOP** if the worktree contains unrelated changes.

Expected pre-Sprint evidence families already shipped:

```text
vercel_deployments + vercel_deployment_refresh
github_workflow_runs + github_workflow_run_refresh
neon_operations + neon_operation_refresh (fixture-strong)
```

---

# Target Vertical Slice

```text
Sentry API
   ↓
organization/project-filtered releases
   ↓
minimal normalization (allowlist projection)
   ↓
durable compact provider evidence
   ↓
exact association to sentry:project:<providerResourceId>
   ↓
offline investigation composition
   ↓
RELEASES
```

Use the existing Sentry connection and sync architecture. Do not add another
authentication system.

---

# Phase 1 — Repository Understanding Report

Before coding, read `skills/build-combie/SKILL.md`, the Canon, Sprint 019
Sentry findings, Sprint 042 learnings, and inspect:

- Sentry client, adapter, and normalization
- Vercel deployment evidence (`deployment.ts`, store tables, sync hook)
- GitHub workflow-run evidence (`workflow-run.ts`, store tables, sync hook)
- provider contract and registry
- sync orchestration (`src/app/sync.ts`)
- Resource, Change, and Relationship models
- SQLite schema/store and upgrade patterns
- `provider-activity.ts`, `investigate.ts`, `missing-context.ts`
- MCP `investigate_resource` structured output
- credential/redaction architecture

Report:

1. How Sentry projects are discovered and which org context is persisted.
2. Exact persisted Sentry project identity (`sentry:project:<id>`).
3. How Sprint 020/021 integrated provider-native evidence without changing the
   Provider contract.
4. Which Vercel/GitHub mechanics are reusable and which are Sentry-specific.
5. Where release retrieval should occur in the sync path.
6. How organization slug is obtained for release listing per project.
7. What pressure appears when adding a fourth provider-native evidence family.
8. Whether abstraction pressure justifies a generic Event primitive yet.

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure Report

Verify the current official Sentry API and answer:

1. What exact endpoint(s) should be used?
   - Preferred starting point from Sprint 019:
     `GET /api/0/organizations/{organization_slug}/releases/?project={project_id}`
   - Also evaluate project-scoped listing if it reduces ambiguity.
2. Required auth scopes / token permissions.
3. Stable release identity (version string vs internal id — pin one upsert key).
4. Exact project identity in the response (`projects[].id` vs other fields).
5. Best exact mapping to `sentry:project:<providerResourceId>`.
6. Provider-native timestamps and their exact meanings:
   - `dateCreated`
   - nullable `dateReleased`
   - any other lifecycle fields worth preserving compactly
7. Truthful primary ordering time for investigation display.
8. Multi-project releases: how to bind one release fact to one project
   Resource without inventing per-project copies that disagree with provider
   truth.
9. Mutable lifecycle behavior across syncs (new release vs updated release).
10. Pagination (`Link` header / cursor) and bounded refresh strategy.
11. Expected request pressure at current project counts.
12. Retention / completeness guarantees (or lack thereof).
13. Fields that must never be persisted (authors, commits, user blobs, URLs,
    arbitrary `data`, issue payloads).
14. Failure semantics when project discovery succeeds but release refresh fails.
15. Whether release **deploy** enrichment (`…/releases/{version}/deploys/`) is
    in scope — default **no** (N+1; defer unless probe proves trivial cost).
16. Has a generic `Event` primitive been earned?
17. Does Canon require a change?

Prefer the smallest architecture that preserves truth and lets us learn.

Record the report in completion notes before implementation.

---

# Modeling Constraints

Do **not** begin by creating:

```text
Event
EventKind
EventStore
EventProvider
EventRegistry
EventEngine
```

Sprint 019 explicitly deferred that abstraction through three shipped families.

A narrow Sentry release evidence model is acceptable if repository pressure
supports it.

### Do not overload Change

`Change` means a provider-independent diff in persisted Resource state observed
by Combie. A release is not automatically a Resource field diff.

### Do not embed history in Resource metadata

Do not store a growing release list inside Sentry project metadata.

### Do not ingest issue or error event telemetry

Sprint 019 classified Sentry issue aggregates as Class C and error events as
Class D. They are out of scope for Sprint 043.

---

# Evidence Contract

Every persisted release record must answer:

- which provider supplied it
- which release it represents (stable provider identity)
- which exact existing Combie Resource it belongs to
- provider-native status/version fields when material
- relevant provider-native lifecycle time(s)
- when Combie observed the evidence
- compact evidence supporting the record

### Identity

Use stable Sentry release identity agreed in the Architecture Pressure Report.
Repeated sync must not create duplicates.

### Resource association

Use exact provider-native project identity only:

```text
release.projects[].id (or equivalent verified field)
→ Sentry project providerResourceId
→ Combie Resource.id
```

No slug/name fuzzy matching. No URL matching. No AI inference.

When a release spans multiple projects, persist association per exact project
Resource only when the provider fact includes that project id. Do not infer
project membership.

### Time

Keep provider-native time distinct from Combie observation time:

```text
providerTime ≠ observedAt
```

Prefer explicit language such as:

```text
created at
released at (when provider supplies dateReleased)
observed by Combie at
```

### Truthful investigation wording

Combie may say:

```text
Sentry reports release X/version V is associated with exact project P,
with dateCreated T1 and optional dateReleased T2.
```

Combie must not say:

```text
this release caused errors
this release deployed production
this release corresponds to Vercel deployment D
```

---

# Retrieval, Pagination, and Cost

Use the official release API verified in Phase 2.

Requirements:

- exact project association
- deterministic pagination within explicit bounds
- duplicate protection (upsert by stable release identity + project binding)
- stable normalization
- bounded/request-aware behavior

Document explicit bounds (for example `RELEASES_MAX_PAGES` and
`RELEASES_PER_PAGE`) in sync summary output when capped.

If history is bounded, never imply lifetime-complete release history.

Multi-org accounts must use the correct organization slug per project (from
persisted project metadata or discovery context).

---

# Authority and Failure Semantics

Match the established pattern from Vercel deployments and GitHub workflow
runs:

```text
populated
known empty
unknown / failed refresh
not applicable
```

Pressure-test:

```text
auth succeeds
project discovery succeeds
release retrieval fails
```

Preserve trustworthy project discovery. Never turn unknown into known-empty.

If stale release evidence is retained after failed refresh, document why.

Do not delete persisted releases merely because they disappear from a bounded
API response unless the response is authoritative for deletion.

---

# Security

Persist compact investigation-relevant metadata only.

Never persist:

- tokens or authorization headers
- DSN values or secret config
- commit metadata blobs unless a future Sprint explicitly earns them
- author/user/email/IP fields
- arbitrary release `data` payloads
- issue/event/stack-trace material
- full API response bodies

Existing secret redaction must remain intact. Pressure-test error paths for
token echo.

---

# Sync Integration

After Sentry project Resources are applied during `sync sentry` (or
multi-provider sync including Sentry):

1. Refresh release evidence per discovered project Resource.
2. Record per-project refresh authority (`success` / `failure`, counts, times).
3. Upsert normalized release rows idempotently.
4. Leave unrelated providers unchanged.

Release enrichment failure must not fail the entire multi-provider sync unless
architecture pressure proves narrower isolation is impossible. Prefer the
GitHub workflow-run pattern: project discovery succeeds independently.

---

# Investigation Composition

Release evidence must be useful offline.

After successful sync:

```bash
unset SENTRY_AUTH_TOKEN SENTRY_TOKEN
bun run combie investigate <sentry-project-resource-id>
```

must display persisted release evidence without network access.

### CLI section

Add a separate section consistent with existing style:

```text
RELEASES (newest first)
```

showing exact release identity, provider-native time(s), compact status/version
fields, and Combie observation provenance where modeled.

Zero/unknown states must be explicit and distinct.

### One-hop neighbors

When investigating a Resource with one-hop Sentry project neighbors, include
neighbor release evidence only if consistent with the existing Investigation
pattern for deployments and workflow runs. Never expand beyond one hop.

### Provider Activity chronology

Extend `provider-activity.ts` with a `sentry_release` family so dual
chronologies can include Sentry release facts alongside Vercel/GitHub evidence
when present. Do not merge unrelated evidence into the Change `TIMELINE`.

### Known Facts / Missing Context

Update composition so investigations truthfully report when Sentry is
connected but release evidence is unknown, empty, or populated. Preserve
authority wording established in Sprints 023–036.

### MCP

`investigate_resource` must surface the same release evidence offline through
the existing structured output. **No new MCP tools. No schema expansion beyond
what investigation already carries** unless a minimal additive field is
required for parity — prefer fitting within existing provider-activity /
evidence keys.

---

# Timeline Interaction

Default expectation:

```text
TIMELINE           → Change-only (unchanged)
DEPLOYMENTS        → Vercel evidence
WORKFLOW RUNS      → GitHub evidence
RELEASES           → Sentry evidence (new)
PROVIDER ACTIVITY  → cross-family chronology when composed
```

Do **not** automatically merge releases into Sprint 017's Change timeline.
Releases introduce a different time model.

Do **not** add cross-evidence causal correlation.

---

# No Correlation

Existing Relationships connect Resources, not events.

Even if a GitHub repository is `source_for` a Vercel project and Sentry release
evidence exists near deployment or workflow evidence in time, do not say:

- release triggered errors
- deployment caused a release
- workflow run produced a release
- release explains an incident

Temporal proximity is not causality.

---

# Storage

Use SQLite and existing upgrade conventions.

Expect tables analogous to:

```text
sentry_releases
sentry_release_refresh
```

Require:

- stable identity
- exact Resource association
- idempotent upsert
- deterministic newest-first reads with stable tie-break
- safe upgrade for pre-043 databases
- no secrets
- no duplicate rows
- read-only investigation
- scoped cleanup only when authority is proven

Do not add another datastore.

---

# Tests

Use Red → Green → Refactor. No live Sentry credentials required for the suite.

Cover at minimum:

### Client/API

- auth / request shape
- organization + project scoping
- pagination / Link header handling
- empty results
- malformed responses
- API errors
- token redaction
- timestamp variants
- stable IDs
- multi-project release payload

### Normalization

- stable identity
- exact Resource association
- compact deterministic evidence
- provider timestamp preservation
- optional fields
- secret / payload exclusion
- multi-project binding behavior

### Persistence

- insert/upsert
- repeated-sync idempotency
- state refresh behavior
- exact Resource association
- deterministic ordering/tie-break
- pre-043 DB upgrade
- empty vs unknown behavior
- no destructive cleanup after non-authoritative failure

### Sync

- Sentry project + release success
- known-empty release result
- release retrieval failure with preserved projects
- multi-provider coexistence
- repeated sync no duplicates
- no false Resource Changes caused by release history

### Investigation / MCP

- offline `investigate` shows `RELEASES`
- authority classes (`populated` / `empty` / `unknown`)
- one-hop neighbor release surfacing (if implemented)
- provider-activity chronology includes `sentry_release`
- MCP `investigate_resource` parity without network
- database bytes unchanged after MCP call (existing read-only regression)

---

# Explicitly Out of Scope

Do not implement:

- Sentry issues, error events, or issue aggregates
- Sentry release deploy N+1 enrichment (unless Phase 2 unexpectedly reclassifies
  it as trivial — default defer)
- GitHub ↔ Sentry `source_for` / code-mapping Relationship (separate Sprint;
  optional read-only probe only if zero-risk and does not expand scope)
- Vercel ↔ Sentry Relationship
- generic Event abstraction / EventEngine
- cross-provider causal correlation
- multi-hop graph traversal
- durable Investigation object
- hypothesis engine / confidence scoring
- investigation summaries with managed AI
- Slack / API / SDK
- new providers (Railway, Render, Fly, AWS, …)
- webhooks / background sync / daemon
- new MCP tools or MCP semantic changes beyond investigation parity
- operational memory (Incident/Decision/Outcome models)
- learning / execution / platform SDK
- application/service grouping ontology
- user-defined relationship overrides
- OS keychain
- in-product analytics

Do not scaffold future engines.

---

# Validation

Before marking the Sprint complete:

```bash
bun test
bun run typecheck
git diff --check
```

If live Sentry credentials are locally available and authorized, optionally
record a sanitized dogfood row:

```text
connect sentry --use-env
sync sentry
investigate <sentry-project-resource-id>
MCP investigate_resource on same subject
```

Never commit tokens, credentials, or private resource names.

---

# Definition of Done

- [ ] Sprint 043 active record exists
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] Sentry release client retrieval implemented (fixture-tested)
- [ ] compact normalization + allowlist projection
- [ ] SQLite persistence + pre-043 migration
- [ ] sync integration with authority semantics
- [ ] offline CLI `RELEASES` section in investigate output
- [ ] provider-activity chronology includes Sentry releases
- [ ] Known Facts / Missing Context remain truthful
- [ ] MCP `investigate_resource` parity without new tools
- [ ] full test suite and typecheck pass
- [ ] no secrets in output, errors, or fixtures
- [ ] completion notes finalized
- [ ] Canon unchanged unless material evidence requires an update

---

# Completion Notes

Complete this section only after implementation.

## Implemented

Pending.

## Deviations

Pending.

## Validation

Pending.

## Learnings

Pending.

## Canon Changes

None expected. Reassess only if implementation materially changes investigation
or evidence semantics.

---

# Final Principle

> **Sprint 043 does not build Investigation intelligence. It gives
> Investigation the Sentry operational evidence the Sprint 042 founder
> handoff authorized as the next earned slice — using the same
> provider-first, deterministic envelope Combie already proved with
> Vercel and GitHub.**
