# SPRINT-044 — Sentry Issue Evidence

> **Status:** Complete
> **Depends on:** SPRINT-043 (complete)
> **Roadmap:** v0.5 Investigation (deeper operational evidence)
> **Type:** Narrow provider-evidence vertical slice
> **Primary goal:** Ingest compact Sentry **issue aggregate** evidence as
> trustworthy provider-native failure-side context with exact project
> association and provider-native time, then expose it through Combie's
> existing offline investigation and frozen MCP path.
> **Provider scope:** Sentry only (issues — not raw error events)
> **Generic Event abstraction:** Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / correlation / causality / telemetry:** None

---

# Product Development Principle (from Sprint 044 onward)

> **Roadmap determines direction. Evidence determines how aggressively we move
> and whether we adjust the direction.**

Closed-beta and dogfood remain valuable. They are **not** a permission gate
for every roadmap milestone Combie has already earned through architecture
work and sequencing discipline.

```text
Follow the canonical roadmap by default.

Use dogfood and beta evidence to change the roadmap when evidence
contradicts it — not as paralysis before executing the next approved slice.
```

Sprint 043 validated the provider-first evidence envelope. Sprint 044
continues **v0.5 Investigation** without waiting for three independent users
to request the same capability.

---

# Goal

Sprint 043 added the first Sentry operational evidence family:

```text
Sentry project
└── release history   ✅   “what shipped?”
```

Live dogfood exposed the next v0.5 gap on the **failure side**:

```text
What shipped?              ✅  releases
What is deployed?          ⬜  release deploys (deferred)
What code produced it?     ⬜  release commits (deferred by design)
Did it cause failures?     ⬜  issues          ← Sprint 044
How is it connected?       ⬜  cross-provider  ← Sprint 045+
```

Sprint 044 adds compact **issue aggregate** evidence:

```text
Sentry project
└── issue aggregates   “what broke?”
```

Combie already has change-side evidence elsewhere:

```text
GitHub   → workflow runs
Vercel   → deployments
Sentry   → releases
```

Issue aggregates give investigations the first trustworthy failure-side
facts without becoming a telemetry warehouse.

The agent may reason across both sides. Combie must refuse to fabricate
causality:

```text
KNOWN FACTS

Release 1.4.2 created 14:31
Deployment completed 14:34
Sentry issue ABC first seen 14:37 · 42 events · last seen 15:08

MISSING CONTEXT

No deterministic evidence currently proves release 1.4.2 caused issue ABC.
```

That is the v0.5 Investigation contract.

---

# v0.5 Sprint Sequence (directional)

Exact sprint numbers may shift as records are authored. Direction is fixed:

```text
SPRINT 043   Sentry release evidence                    ✅
SPRINT 044   Sentry issue evidence                      ← active
SPRINT 045   Cross-provider investigation               (relationships + earned joins)
SPRINT 046   Durable Investigation object
SPRINT 047+  Hypotheses / confidence / summaries (carefully)
             → v0.5 Investigation milestone complete
             → v0.6 Operational Memory
```

Sprint 045 — not this Sprint — owns GitHub ↔ Sentry code-mapping,
release↔deployment joins, and other cross-provider composition once both
change-side and failure-side evidence exist.

---

# Product Question

> After connecting Sentry and syncing, can Combie truthfully show compact
> issue aggregate evidence for an exact Sentry project in CLI and MCP
> investigations — with provider-native time, authority semantics, event
> counts where the API provides them, and explicit refusal to claim release→
> issue or deploy→issue causality — so an external agent can begin answering
> “what broke around what shipped?”

---

# Why Now

The August 2026 roadmap audit placed Combie at **Intelligent MVP foundation**
with v0.5 Investigation as the active frontier. Sprint 043 was the first
bounded expansion of operational evidence, not the entirety of v0.5.

Sprint 019 classified Sentry **issue aggregates** as Class C (mutable
current state, not occurrence-level telemetry) and **error events** as Class
D (high-volume telemetry with stack/request/user risk). Sprint 044
pressure-tests whether a **strictly projected** issue-aggregate slice is
earned — not whether Combie should ingest raw events.

Post-043 dogfood confirmed releases work and classified issue/error evidence
as the largest remaining failure-side gap for the test org.

---

# Governing Boundaries

Preserve all shipped guarantees:

- six provider adapters and current Resource kinds
- two deterministic Relationship kinds and their provenance semantics
- retained Change and provider-native evidence semantics
- exact Resource IDs and one-hop context
- local, offline investigation composition
- exactly four MCP tools with frozen schemas and read-only annotations
- explicit credential authorization and secret-safe output
- Sprint 043 release evidence behavior unchanged

Sprint 044 may add Sentry issue persistence and investigation surfacing only.

---

# Baseline

Begin from committed Sprint 043 closure:

```text
HEAD:          2dd4d3e (record actual SHA at sprint start)
tests:         728 pass across 64 files
typecheck:     clean
MCP:           exactly four read-only tools
Sentry today:  project discovery + release evidence
Sentry issues: not persisted
```

Verify the actual repository state before coding. Record the exact SHA in
completion notes. **STOP** if the worktree contains unrelated changes.

Reuse Sprint 043 patterns:

- `src/providers/sentry/release.ts`
- `src/app/sentry-releases.ts`
- `sentry_releases` / `sentry_release_refresh` store tables
- investigate `RELEASES` + `sentry_release` provider-activity family

---

# Target Vertical Slice

```text
Sentry API (read-only)
   ↓
project-scoped issue list (aggregates only)
   ↓
minimal normalization (strict allowlist)
   ↓
durable compact provider evidence
   ↓
exact association to sentry:project:<providerResourceId>
   ↓
offline investigation composition
   ↓
ISSUES
```

Use the existing Sentry connection and sync architecture. Mirror Sprint 043
envelope; do not redesign provider sync.

---

# Phase 1 — Repository Understanding Report

Before coding, read `skills/build-combie/SKILL.md`, the Canon,
`docs/internal/ROADMAP.md` (v0.5 Investigation), Sprint 019 Sentry issue
findings, Sprint 043 completion notes, and inspect:

- `src/providers/sentry/release.ts`, `src/app/sentry-releases.ts`
- Sentry client, adapter, project metadata (`organization_slug`)
- store release tables and upgrade patterns
- `provider-activity.ts`, `investigate.ts`, `missing-context.ts`
- MCP `investigate_resource` structured output

Report:

1. How Sprint 043 integrated release evidence end-to-end.
2. What can be reused verbatim vs what is issue-specific.
3. Where issue retrieval belongs in the Sentry sync path.
4. How issue aggregates differ semantically from releases (mutability,
   first/last seen, counts).
5. What investigation surfaces change (new `ISSUES` section, provider
   activity family, Known Facts / Missing Context).
6. Whether a generic Event primitive is earned (expected: no).

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure Report

Verify the official Sentry **issue list** API (not event/occurrence
endpoints) against docs and, when authorized, a live probe.

Answer:

1. Exact read endpoint(s) for project-scoped issue aggregates.
   - Starting candidates from Sprint 019:
     - organization/project issues list endpoints
   - Reject raw error-event and occurrence endpoints (Class D).
2. Required auth scopes / token permissions.
3. Stable issue identity for upsert (issue id vs short id — pin one key).
4. Exact project binding field (`project.id` or equivalent).
5. Provider-native timestamps:
   - `firstSeen` / `lastSeen` semantics (mutable aggregates — document clearly)
   - any `dateCreated` / status transition times worth preserving
6. Safe aggregate fields:
   - status, level, type/category (if compact and non-sensitive)
   - `count`, `userCount`, or equivalent event-frequency fields when present
   - title/short identifier only if it cannot contain user PII or secrets
     (pressure-test; exclude if risky)
7. Fields that must **never** persist:
   - stack traces, breadcrumbs, request bodies/headers
   - user emails, IPs, usernames, device IDs
   - `metadata`, `tags` blobs, arbitrary `context`
   - culprit/source-file paths with sensitive project structure (default exclude
     unless proven safe and necessary)
   - DSN, release commit/ref linkage used for correlation (defer to Sprint 045+)
8. Pagination, bounds (`ISSUES_PER_PAGE`, `ISSUES_MAX_PAGES`), request pressure.
9. Retention / completeness guarantees (or lack thereof).
10. Mutable lifecycle: same issue id updating `lastSeen` / `count` across syncs.
11. Failure semantics when project discovery succeeds and issue refresh fails.
12. Whether Class C aggregate semantics are implementable with truthful authority
    wording — if not, **stop** and document rejection; do not ingest events.
13. Does Canon require a change?

Record the report in completion notes before implementation.

---

# Modeling Constraints

Do **not** create:

```text
Event / EventKind / EventStore / EventEngine
IssueEvent / Occurrence / Telemetry*
```

Do **not** overload `Change` or embed issue history in Resource metadata.

Issue aggregates are **current-state snapshots** refreshed by sync, not an
occurrence log. Wording must not imply Combie observed every individual error
event.

---

# Evidence Contract

Every persisted issue row must answer:

- which provider supplied it
- which issue it represents (stable provider identity)
- which exact Combie Resource it belongs to
- compact status / level / count fields when material
- relevant provider-native times (`firstSeen`, `lastSeen`, …)
- when Combie observed the evidence

### Identity

Upsert by stable issue id + exact project Resource id. Repeated sync updates
mutable fields; no duplicate rows.

### Resource association

```text
issue.project.id
→ Sentry project providerResourceId
→ Combie Resource.id
```

No slug-only matching. No cross-project inference.

### Time

```text
providerTime ≠ observedAt
```

Prefer explicit wording:

```text
first seen at
last seen at
observed by Combie at
```

Document that `lastSeen` is a mutable aggregate field, not proof Combie
witnessed each occurrence.

### Truthful investigation wording

Combie may say:

```text
Sentry reports issue I for exact project P with first seen T1, last seen T2,
and N events in the current aggregate snapshot.
```

Combie must not say:

```text
this issue was caused by release R
this issue proves a deployment failure
this issue count is complete lifetime telemetry
```

### Release / deploy adjacency

When both releases and issues appear in one investigation, Missing Context
must explicitly state when **no deterministic join** proves linkage between
them. Temporal proximity is not causality.

---

# Retrieval, Pagination, and Cost

Requirements:

- exact project association via org slug + project id filter
- deterministic bounded pagination (mirror release caps unless probe proves
  otherwise)
- duplicate protection
- stable normalization
- sync summary documents bounds

Never imply complete issue history if the API response is bounded.

---

# Authority and Failure Semantics

Match Sprint 043 / GitHub / Vercel patterns:

```text
populated
known empty
unknown / failed refresh
not applicable
```

Project discovery success must survive issue refresh failure.

Never turn unknown into known-empty.

---

# Security

Persist compact investigation-relevant metadata only.

Never persist:

- tokens, DSN, secrets
- stack traces, request data, user identifiers
- raw API payloads
- event-level occurrence streams

Existing secret redaction must remain intact.

---

# Sync Integration

After Sentry project Resources are applied:

1. Refresh issue evidence per project (same isolation model as releases).
2. Record per-project `sentry_issue_refresh` authority.
3. Upsert normalized issue rows idempotently.
4. Leave unrelated providers unchanged.

Release refresh and issue refresh may run in the same Sentry sync pass but
must fail independently with clear authority per family.

---

# Investigation Composition

Offline after sync:

```bash
bun run combie investigate <sentry-project-resource-id>
```

### CLI section

```text
ISSUES (newest or most-recently-active first — pin ordering in Phase 2)
```

Show exact issue id, status, counts when present, first/last seen, compact
title/short id only if allowlisted, and Combie observation provenance.

Keep existing `RELEASES` section unchanged.

### Provider Activity

Add `sentry_issue` family to `provider-activity.ts` so dual chronologies can
include failure-side facts alongside `sentry_release`, GitHub, and Vercel
evidence on the same project subject.

Do not merge issues into the Change `TIMELINE`.

### Known Facts / Missing Context

- Truthful authority for issue evidence (populated / empty / unknown).
- When releases and issues coexist, Missing Context may note absent
  deterministic release↔issue linkage without implying causality.

### One-hop neighbors

Mirror Sprint 043: neighbor `ISSUES` only through existing one-hop
Relationship patterns when a test/fixture seeds an edge. No new Relationship
kinds in this Sprint.

### MCP

`investigate_resource` parity through existing structured output. Minimal
additive fields only if required (e.g. `subjectIssues` / `related[].issues`
mirroring releases). **No new MCP tools.**

---

# Timeline Interaction

```text
TIMELINE           → Change-only (unchanged)
DEPLOYMENTS        → Vercel
WORKFLOW RUNS      → GitHub
RELEASES           → Sentry
ISSUES             → Sentry (new)
PROVIDER ACTIVITY  → may include sentry_issue + sentry_release
```

---

# Storage

Expect tables analogous to:

```text
sentry_issues
sentry_issue_refresh
```

SQLite upgrade via `CREATE TABLE IF NOT EXISTS`. Idempotent upsert, bounded
reads, pre-044 migration safety.

---

# Tests

Red → Green → Refactor. No live Sentry credentials required.

### Client / normalization

- project scoping, pagination, allowlist projection
- mutable field refresh on same issue id
- malformed responses, token redaction
- excluded-field enforcement (no stack/user payloads)

### Persistence

- upsert idempotency, ordering, upgrade from pre-044 DB
- empty vs unknown authority

### Sync

- success, known-empty, failure isolation vs project discovery
- coexistence with release refresh
- multi-provider sync unchanged for other providers

### Investigation / MCP

- `ISSUES` section offline
- provider-activity `sentry_issue`
- Missing Context when releases present but no causal join
- MCP parity + read-only DB regression

---

# Explicitly Out of Scope

Do not implement:

- raw Sentry error events or occurrence-level telemetry (Class D)
- traces, metrics, logs, session replays
- issue detail / event drill-down endpoints
- release deploy N+1 enrichment
- release↔issue or deploy↔issue correlation
- GitHub ↔ Sentry Relationship (Sprint 045)
- Vercel ↔ Sentry Relationship
- shared-commit extension to issues
- multi-hop traversal
- durable Investigation object
- hypotheses, confidence scoring, summaries, managed AI
- generic Event abstraction
- new MCP tools
- new providers, webhooks, background sync
- operational memory / learning / execution

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

Optional live dogfood when `SENTRY_AUTH_TOKEN` / `SENTRY_TOKEN` authorized:

```text
connect sentry --use-env
sync sentry
investigate <sentry-project-id>
MCP investigate_resource (offline, DB unchanged)
```

Record sanitized results in `docs/internal/beta/DOGFOOD.md` or completion
notes. Never commit secrets or private resource names.

---

# Definition of Done

- [x] Sprint 044 active record exists
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: issue client + normalization + store + sync
- [x] if earned: CLI `ISSUES`, provider-activity, investigate + MCP parity
- [x] if earned: Missing Context truthful for release/issue adjacency
- [x] if not earned: rejection documented (do not ingest Class D events)
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged unless material semantics require an update

---

# Completion Notes

## Baseline (2026-08-15)

```text
HEAD:          2dd4d3e docs(beta): record Sprint 043 live Sentry dogfood run
worktree:      SPRINT-044.md untracked only
tests:         728 pass across 64 files (Sprint 043 recorded count)
MCP:           exactly four read-only tools
Sentry today:  project discovery + release evidence
```

## Repository Understanding

1. **Sprint 043 end-to-end.** Sentry releases are not on the Provider
   contract. The path is:
   `SentryClient.listOrganizationReleases` → `normalizeSentryRelease` →
   `Store.upsertSentryRelease` / `setSentryReleaseRefresh` →
   `syncSentryReleases` after `applyResource` in `sync.ts` (Sentry branch) →
   `subjectReleases` on `InvestigationContext` → CLI `RELEASES (newest first)`
   → `sentry_release` in provider-activity / Known Facts / Missing Context →
   MCP `subjectReleases` and `related[].releases`.
2. **Reusable vs issue-specific.** Reuse: org slug from
   `metadata.organization_slug`; Link-header pagination; refresh authority
   (`success`/`failure`, `resultCount`, `lastSuccessfulObservedAt`);
   upsert-without-Change; failure isolation (discovery survives enrichment
   failure; unknown ≠ empty); bounded 1×100 page; investigation heading +
   provider-activity family + MCP additive fields. Issue-specific: endpoint
   (`/issues/` not `/releases/`), upsert key (`id` not `version`), mutable
   `firstSeen`/`lastSeen`/`count`, default Sentry query `is:unresolved`,
   `event:read` scope, exclude title/culprit/assignee/metadata.
3. **Sync placement.** Issue retrieval belongs in the same Sentry `syncOne`
   pass as releases, after project Resources are applied, as a second
   isolated hook (`syncSentryIssues`) that fails independently of
   `syncSentryReleases`.

### 043 tables to mirror

```text
sentry_releases PK (version, resource_id)
sentry_release_refresh PK resource_id
```

Issue tables should be `sentry_issues` PK `(issue_id, resource_id)` and
`sentry_issue_refresh` PK `resource_id`.

## Architecture Pressure

Official source:
https://docs.sentry.io/api/events/list-an-organizations-issues/

1. **Endpoint.** `GET /api/0/organizations/{organization_id_or_slug}/issues/`
   with `project={numeric project id}`. Project-scoped
   `GET /projects/{org}/{project}/issues/` is deprecated; do not use it.
   Reject event/occurrence endpoints (Class D).
2. **Scopes.** Bearer token; documented `event:read` (also `event:write` /
   `event:admin`). Existing Sentry connect tokens may lack this — treat 403
   as refresh failure, not known-empty.
3. **Upsert key.** Sentry issue `id` (string) + exact project Resource id.
   `shortId` is display-only and can change with project slug; persist as
   optional compact label, not identity.
4. **Project binding.** `project.id` must equal
   `Resource.providerResourceId`. No slug matching.
5. **Times.** `firstSeen` and `lastSeen` are ISO aggregate fields. `lastSeen`
   and `count` mutate across syncs. There is no occurrence-level
   `dateCreated` on the list item that Combie should treat as event time.
   Primary display order: `lastSeen` DESC, then `issue_id` DESC.
6. **Allowlist.** Persist: `id`, `project.id`, `status`, `level`, `count`,
   `userCount`, `firstSeen`, `lastSeen`, optional `shortId`, optional
   `issueCategory`. Exclude `title` and `culprit` (often contain interpolated
   user/source text). Exclude `assignedTo` (email/name PII).
7. **Never persist.** Stack traces, breadcrumbs, request bodies/headers,
   user emails/IPs, `metadata`, `tags`, `stats`, `activity`, `annotations`,
   `owners`, `derivedData`, `permalink`, `shareId`, `firstRelease` /
   `lastRelease`, `matchingEventId`, DSN, tokens, raw payloads.
8. **Pagination / bounds.** Cursor + `limit` max 100. Mirror releases:
   `ISSUES_PER_PAGE=100`, `ISSUES_MAX_PAGES=1`. Use `sort=date` (last seen).
   Override the default `is:unresolved` query with `query=` (empty) so the
   bounded page is a last-seen snapshot across statuses, not an unresolved
   filter silently presented as “no issues.”
9. **Retention.** No completeness guarantee. Bounded page is not lifetime
   history. Disappearance from the page is not deletion authority.
10. **Mutability.** Same `id` upserts `status` / `level` / `count` /
    `userCount` / `lastSeen` / `firstSeen` / `observedAt`.
11. **Failure.** Project discovery success is preserved. Refresh `failure`
    retains prior rows and last-success provenance. Missing org slug is
    failure, not empty.
12. **Verdict: implement.** Class C aggregates are implementable with
    truthful wording: “Sentry reports issue I as a current aggregate
    snapshot for exact project P.” Do not ingest events.
13. **Canon.** No change required.

### Recommended persisted shape

```text
provider: sentry
issueId
resourceId          sentry:project:<id>
projectId
shortId?            display only
status?
level?
count?              aggregate snapshot, not occurrence log
userCount?
issueCategory?
firstSeen           ISO
lastSeen            ISO  (primary order)
observedAt          Combie observation time
```

### Truthful wording

```text
Sentry reports issue I for exact project P
with first seen T1, last seen T2, and N events
in the current aggregate snapshot.
```

Must not say the issue was caused by a release or deployment, or that the
count is complete lifetime telemetry.

When releases and issues coexist, Missing Context must state that no
deterministic join proves linkage.

## Implemented

Issue aggregates follow the Sprint 043 release envelope. No generic Event
primitive. No new MCP tools, Relationship kinds, or Class D event ingestion.

- `src/providers/sentry/issue.ts` — `SentryIssueEvidence`,
  `IssueEvidenceAuthority`, `normalizeSentryIssue`, `composeIssueAuthority`
- `SentryClient.listOrganizationIssues` — org issues list with
  `project={id}`, empty `query=`, `sort=date`, bound 1×100
- `src/app/sentry-issues.ts` — isolated `syncSentryIssues` after releases
- Store: `sentry_issues` PK `(issue_id, resource_id)`,
  `sentry_issue_refresh`
- Investigation: `subjectIssues` / `related[].issues`, CLI
  `ISSUES (most-recently-active first)`, family `sentry_issue`
  (`primaryTimeField: lastSeen`, native id = `issueId`)
- Missing Context: issue refresh gaps plus
  `no_deterministic_release_issue_linkage` when retained releases and
  issues coexist
- MCP `investigate_resource`: additive `subjectIssues` and
  `related[].issues` only

## Deviations

- Live Sentry issue dogfood was not run: optional, and no authorized
  `SENTRY_AUTH_TOKEN` / `SENTRY_TOKEN` was used in this close.

## Validation

```text
bun test:          758 pass across 69 files (was 728 / 64)
bun run typecheck: clean
git diff --check:  clean
MCP tools:         get_related_context, investigate_resource,
                   list_providers, list_resources
live Sentry:       skipped (optional; no authorized issue dogfood)
```

Contract tests added for empty `query=`, malformed non-array responses,
pre-044 store upgrade, known-empty vs 403 unknown, release/issue refresh
isolation, multi-provider `/issues` mock, `sentry_issue` Known Facts, and
MCP `investigate_resource` `subjectIssues` payload.

## Learnings

- Official org issues list is the correct read path; project issues list is
  deprecated.
- Default `is:unresolved` would silently under-count; empty `query=` is
  required for a truthful bounded snapshot.
- `event:read` is a new scope relative to Sprint 043 release reads
  (`project:read`). 403 must stay unknown.
- Multi-provider Sentry mocks must handle `/issues` before the generic
  `/organizations` matcher; otherwise an org-list array is treated as a
  successful issue page and written as known-empty.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL are unchanged. No new Resource
kinds, Relationship kinds, MCP tools, or Event primitive.

AGENTS.md operational baseline becomes Sprints 001–044 complete: shipped
Sentry evidence now includes compact issue aggregates (`ISSUES`,
`sentry_issue`). Class D error events remain forbidden. Sprint 045 is
not started.

---

# Final Principle

> **Sprint 044 gives Investigation the failure side of the story. Combie may
> report what Sentry's issue aggregates currently show; it must not pretend to
> know why.**
