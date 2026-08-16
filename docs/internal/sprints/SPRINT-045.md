# SPRINT-045 — GitHub ↔ Sentry Code-Mapping Relationship

> **Status:** Complete
> **Depends on:** SPRINT-044 (complete)
> **Authorized by:** Sprint 044 v0.5 sequence + ROADMAP v0.2 exact
> identity matching + ROADMAP v0.5 exact cross-provider shared evidence +
> Sprint 007 Class B evidence path
> **Roadmap:** v0.2 Context (third deterministic Relationship) in service
> of v0.5 Context Engine / Investigation foundation
> **Type:** Narrow cross-provider Relationship vertical slice
> **Primary goal:** Acquire compact Sentry **code-mapping** evidence and
> infer one new deterministic Relationship between an existing GitHub
> repository Resource and an existing Sentry project Resource, then expose
> it through already-shipped one-hop investigation surfaces.
> **Provider scope:** Sentry (code-mapping / SCM config reads) + GitHub
> (already-persisted repository identity only)
> **Generic Event abstraction:** Not assumed
> **New Relationship kinds:** Exactly one — `code_mapped_to`
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / correlation / causality / telemetry:** None

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

Sprint 044 recorded the next v0.5 direction as cross-provider
investigation. This Sprint takes the **first bounded step** of that
direction: prove how a GitHub repository and a Sentry project are
connected. It does **not** pull forward the rest of that direction.

```text
Follow the canonical roadmap by default.

Use dogfood and beta evidence to change the roadmap when evidence
contradicts it — not as paralysis before executing the next approved slice.
```

---

# Goal

Sprints 043–044 gave Investigation Sentry change-side and failure-side
evidence on the same project:

```text
Sentry project
├── release history     ✅  “what shipped?”
└── issue aggregates    ✅  “what broke?”
```

Sprint 044 classified the remaining gap:

```text
What shipped?              ✅  releases
What is deployed?          ⬜  release deploys (still later)
What code produced it?     ⬜  release commits (still later)
Did it cause failures?     ✅  issues (aggregates only)
How is it connected?       ⬜  cross-provider  ← this Sprint, first slice
```

This Sprint answers only the identity question:

```text
GitHub repository
      │
      │ Sentry code-mapping evidence
      ▼
Sentry project
```

After a successful GitHub + Sentry sync, Combie may persist:

```text
github:repository:<id>  ── code_mapped_to ──►  sentry:project:<id>
```

when — and only when — Sentry's own project-scoped code-mapping evidence
joins exactly to a discovered GitHub repository Resource.

Combie supplies that proven connection to humans and agents. Combie must
not upgrade it into error-reporting completeness, release lineage, or
causality.

> **Add a proven edge, not a stronger story.**

---

# Product Question

> After connecting GitHub and Sentry and syncing both, can Combie
> deterministically persist and expose a `code_mapped_to` Relationship
> between an exact GitHub repository and an exact Sentry project from
> provider-native code-mapping evidence — with explicit provenance,
> truthful Known Facts / Missing Context, offline one-hop investigation,
> and frozen MCP parity — without claiming that the repository reports
> every error to the project, that a release came from that repository, or
> that any release caused any issue?

---

# Why This Is the Next Roadmap Slice

This Sprint is not invented from the implementation prompt. The
authorization chain is:

1. **`docs/internal/ROADMAP.md` v0.2 Context** requires deterministic
   relationship discovery and exact cross-provider identity matching.
   Useful identity evidence already listed there includes repository
   identity and provider configuration references. Candidate /
   human-confirmed relationships remain later and must stay distinguishable
   from proven identity.
2. **`docs/internal/ROADMAP.md` v0.5 Context Engine** requires exact
   cross-provider shared evidence, deterministic Known Facts, and Missing
   Context as a first-class output. Context compilation must not silently
   become causal reasoning.
3. **Sprint 007** already ranked GitHub repository ↔ Sentry project
   (code mapping) as Class **B**: deterministic once project-scoped code
   mappings are collected; org-level repo list alone is Class **C**;
   project-name ≈ repo-name is Class **D** and forbidden. The semantic
   earned then was “configured for / code-mapped to,” not “reports every
   error to.”
4. **Sprint 043** explicitly deferred “GitHub ↔ Sentry `source_for` /
   code-mapping Relationship” and forbade upgrading temporal proximity
   into causality.
5. **Sprint 044** named the next slice:

   ```text
   SPRINT 045   Cross-provider investigation
                (relationships + earned joins)
   ```

   and assigned this Sprint GitHub ↔ Sentry code-mapping. It also deferred
   DSN and release commit/ref linkage used for correlation.
6. **Sprint 043 live dogfood** (2026-08-15) observed, on a real empty-then-
   seeded Sentry org, that nothing linked releases to code and that no
   Relationships existed. That is inventory-empty evidence for this slice,
   not a reason to invent a different slice.

Sprint 044's phrase “relationships + earned joins” is the **direction**.
This Sprint implements only the **relationship**. Earned joins
(release↔deployment, shared-commit extension to Sentry, release↔issue)
remain later v0.5 work. They require identifiers this Sprint still must
not persist (release commits/refs) and would widen the slice past one
resolver.

This is **not** ROADMAP v0.6 Investigation Engine work (durable
Investigation object, hypotheses, confidence, managed model reasoning).

---

# Governing Boundaries

Preserve all shipped guarantees:

- six provider adapters and current Resource kinds
- existing Relationship kinds `source_for` and `uses_domain_in` with
  their current provenance, refresh, and stale-cleanup semantics
- retained Change and provider-native evidence semantics
- exact Resource IDs and one-hop context
- local, offline investigation composition
- exactly four MCP tools with frozen schemas and read-only annotations
- explicit credential authorization and secret-safe output

Sprint 045 may add:

- compact Sentry code-mapping (and, if Phase 2 requires it, compact
  Sentry org-repo lookup) persistence
- exactly one new Relationship kind, `code_mapped_to`
- one application-layer resolver beside
  `infer-github-vercel.ts` / `infer-vercel-cloudflare.ts`
- truthful Known Facts / Missing Context for mapping authority and the
  new edge

It must not expand MCP tools, add write paths, reuse `source_for` for
Sentry, or introduce a parallel correlation system.

---

# Baseline

Begin from the post–Sprint 044 product baseline:

```text
HEAD:          393e9a6ee988c7f1a044ac8d588836db93e726bb
tests:         758 pass across 69 files
typecheck:     clean
worktree:      clean
MCP:           exactly four read-only tools
Sprint 044:    Complete
Sprint 045:    not started (this record activates it)
```

Verify the actual repository state before coding. Record the exact SHA in
completion notes. **STOP** if the worktree contains unrelated changes.

Expected already-shipped graph and evidence:

```text
Relationships
  source_for        GitHub repository → Vercel project
  uses_domain_in    Vercel project → Cloudflare zone

Sentry project
  discovery         slug, organization_slug/id, platform, status
  sentry_release    compact release history
  sentry_issue      compact issue aggregates

GitHub repository
  identity          numeric id as providerResourceId
  metadata          owner, fullName, defaultBranch, …
  github_workflow_run   (unchanged; not a join key in this Sprint)
```

Sentry project Resources currently carry **no** repository or
code-mapping facts (`src/providers/sentry/normalize.ts`).

---

# Target Vertical Slice

```text
connect github + sentry
        ↓
sync (both succeed)
        ↓
Sentry adapter reads project-scoped code mappings
        ↓
persist compact mapping facts on the Sentry project
        ↓
application resolver joins mapping → GitHub repository
        ↓
upsert code_mapped_to + resolver-scoped stale cleanup
        ↓
relationships | related | investigate | MCP
        ↓
offline, provenance-backed one-hop context
```

Use the existing relationship architecture. Do not invent a second graph.

---

# Claim Classes

Combie may only make the following classes of claim. These are product
rules, not optional wording.

### KNOWN

Provider-native evidence deterministically connects two exact Resources.

Allowed after this Sprint when a `code_mapped_to` edge exists:

```text
Sentry code-mapping evidence deterministically connects
GitHub repository github:repository:<id>
to Sentry project sentry:project:<id>.
```

This is a **Relationship**, not a correlation.

### CORRELATED

Evidence or timing suggests association but does not prove a Relationship
or causality.

**This Sprint must not emit CORRELATED claims.** Later v0.5 earned joins
may introduce an explicit correlated-but-not-proven surface. Until a later
Sprint authorizes that surface, temporal adjacency, shared version
strings, and similar hints are either unused or Missing Context.

### UNKNOWN

Combie lacks deterministic evidence.

Allowed examples:

```text
Sentry code-mapping evidence has not been successfully refreshed
for sentry:project:<id>.

Sentry reports no project-scoped code mappings for sentry:project:<id>.

Sentry reports a code mapping, but Combie has no matching
GitHub repository Resource.

No one-hop Relationships are currently known to Combie for
sentry:project:<id>.
```

### Forbidden upgrades

Never allow:

```text
Release X caused Issue Y
Repository R reports every error to Project P
Repository R is the Git source for Sentry project P
  (do not reuse source_for)
This mapping proves the repository is deployed by Vercel / served
  by Cloudflare
Workflow run W produced release X
Deployment D created release X
Issue I started because mapping M exists
These records are correlated because they happened near each other
```

Correlation is not causation. A proven `code_mapped_to` edge is still
not a release→issue, deploy→issue, or commit→issue claim.

The ROADMAP v0.5 safe semantic remains the ceiling:

> These provider evidence records reference the same exact Git commit
> within an already-proven resource relationship.

This Sprint does **not** implement that shared-commit sentence for
Sentry. It only establishes the relationship that a later Sprint may
join through.

---

# Exact Deterministic Evidence

## What may establish the Relationship

Only **project-scoped Sentry code-mapping** facts, joined to an already
stored GitHub repository Resource.

Sprint 007's join key remains the starting contract. Phase 2 must pin
the official field names before implementation:

```text
Sentry code mapping
  project id     ==  sentry Resource.providerResourceId
AND
Sentry repository identity
  GitHub numeric id   ==  github Resource.providerResourceId
  OR, only when numeric id is absent from Sentry evidence:
  exact owner/repo    ==  github Resource.metadata.fullName
AND
the mapped SCM provider is GitHub
```

Same display names alone never create a Relationship.

`GET /api/0/organizations/{organization_id_or_slug}/repos/` is an
**org-level lookup**, not a project join key. It may be used only to
resolve a mapping's Sentry-internal repository id to a canonical
`owner/repo` (and provider) when the mapping payload itself lacks that
identity. Org repo membership must never create an edge.

## What must never establish the Relationship

- Sentry project slug / name ≈ GitHub repository name
- organization-level GitHub install with no project mapping
- DSN, environment variables, build config, or secret values
- Sentry issue `firstRelease` / `lastRelease`
- Sentry release `version`, `ref`, `commit`, or `url`
- GitHub workflow-run head SHA
- Vercel git linkage or `source_for`
- temporal proximity of releases, issues, deploys, or workflow runs
- LLM / embedding / fuzzy matching

## Starting API candidates (Phase 2 must pin or reject)

Documented org repositories:

```text
GET /api/0/organizations/{organization_id_or_slug}/repos/
```

Documented response shape (official docs): `id`, `name` (e.g.
`owner/repo`), `dateCreated`. Scopes: `org:read` / `org:integrations` /
`org:ci` / `org:write` / `org:admin`.

Project-scoped code mappings were identified in Sprint 007 as the actual
join. They are **not** currently collected by Combie. Community /
Terraform references describe an organization code-mappings resource
with `project_id` + repository id. Phase 2 must verify the official
read-only list endpoint and field names against current Sentry docs
and, when authorized, a live probe.

If Phase 2 cannot find a project-scoped, secret-safe, deterministic
read path:

```text
STOP. Document rejection. Do not invent a join.
Do not fall back to name matching or org-repo membership.
```

## Resource types involved

| Side | Provider | Kind | Combie id | Identity used |
| --- | --- | --- | --- | --- |
| Source | GitHub | `repository` | `github:repository:<numeric id>` | `providerResourceId` (numeric), fallback `metadata.fullName` |
| Target | Sentry | `project` | `sentry:project:<numeric id>` | `providerResourceId` must equal mapping `project_id` |

No new Resource kinds. Non-GitHub SCM mappings (GitLab, Bitbucket,
self-hosted, unknown) are ignored, not coerced.

## Compact mapping fact (illustrative)

Phase 2 pins names. Conceptually each Sentry project may persist:

```yaml
codeMappings:
  - sentryRepoId: "3"
    repository: owner/repo          # canonical owner/repo
    githubRepoId: "915052094"       # only if Sentry exposes it
    mappingId: "…"                  # stable mapping id if present
    scmProvider: github
```

```text
codeMappings: []
```

means enrichment succeeded and there are no matchable GitHub mappings.

Omitted `codeMappings` means enrichment is unknown (failed or not run).

Do not persist stack roots, source roots, auth, tokens, DSN, clone URLs
with credentials, integration secrets, or raw API payloads. Default-branch
and path-root fields are out of scope unless Phase 2 proves they are
required for the join — they are not required for identity.

---

# Relationship Semantics

The canonical new Relationship kind is:

```text
code_mapped_to
```

Direction:

```text
GitHub repository  ── code_mapped_to ──►  Sentry project
```

It means:

> Sentry reports a project-scoped code mapping that configures this
> GitHub repository as source-context for this Sentry project.

It does **not** mean:

- the repository reports every error to the project
- the repository is the Git source for a Vercel project (`source_for`)
- Sentry is installed in the repository
- current issues or releases belong to particular commits
- Cloudflare, Vercel, Neon, or PlanetScale are involved

Do not reuse `source_for`. That kind is owned by the GitHub↔Vercel git
link (`src/domain/relationship.ts`, `infer-github-vercel.ts`) and proves
a different provider fact.

Do not name the kind `reports_to`, `errors_from`, or `caused_by`.

### Identity

Reuse the existing stable formula:

```text
rel:${sourceResourceId}:${kind}:${targetResourceId}
```

Multiple mappings from the same repository to the same project collapse
to one Relationship. Distinct projects remain distinct edges.

### Evidence / provenance

Follow `RelationshipEvidence`. Compact conceptual shape:

```yaml
source: sentry
mechanism: code_mapping
repository: owner/repo
githubRepoId: "915052094"    # when known
sentryRepoId: "3"            # when known
```

Do not add confidence, scores, or candidate flags. Proven edges are
boolean.

Extend `RelationshipEvidence` with the smallest optional fields the
resolver needs. Do not create a second evidence type.

---

# Architecture Target

Reuse the established path. Do not create a parallel correlation system.

```text
Sentry adapter
  list projects
  list code mappings (+ org repos lookup if required)
  normalize compact facts onto sentry:project
        ↓
GitHub adapter (unchanged identity)
        ↓
Application resolver
  infer-github-sentry.ts
  (beside infer-github-vercel.ts and infer-vercel-cloudflare.ts)
        ↓
Relationship kind code_mapped_to
        ↓
SQLite Relationships
        ↓
relationships / related / investigate / MCP
```

Adapters discover provider facts. Resolvers interpret persisted facts
across providers. Adapters must not call one another.

One-hop `related`, investigation RELATED CONTEXT, and
`get_related_context` are already kind-agnostic. They should render the
new kind without a new traversal model.

---

# Persistence Behavior

### Mapping facts

Prefer compact facts on the Sentry project Resource metadata, matching
Sprint 008 domain evidence, **unless** Phase 2 shows mappings cannot be
represented that way without bloating Resource rows. A dedicated
`sentry_code_mappings` / refresh-authority table is acceptable only if
the metadata path is a poor fit. Do not create both.

Requirements:

- exact project Resource association
- idempotent upsert
- known-empty (`[]`) vs unknown (omitted / failed refresh)
- no secrets
- safe upgrade for pre-045 databases
- no Resource Changes caused by mapping refresh

### Relationships

Use existing `upsertRelationship` and resolver-scoped
`deleteRelationshipsByIds`.

Refresh `code_mapped_to` only when **both** GitHub and Sentry succeeded
in this sync run (complete evidence). Incomplete evidence never triggers
destructive stale cleanup.

Stale cleanup is scoped to this resolver's edges only:

```text
kind === "code_mapped_to"
source starts with github:repository:
target starts with sentry:project:
```

Never touch `source_for` or `uses_domain_in`.

Projects whose mapping enrichment is unknown keep prior
`code_mapped_to` edges. Projects with authoritative `codeMappings: []`
may have this resolver's edges removed. A mapping whose GitHub
repository is no longer present must not be recreated; whether a prior
edge is removed follows the same complete-evidence gate as Sprint 009
(do not delete merely because the other provider was not attempted).

### Change / timeline

Mapping refresh and Relationship upserts must not create Change rows or
appear on the Change `TIMELINE`.

---

# Authority and Failure Semantics

Match the existing four-way authority:

```text
populated     ≥1 matchable GitHub mapping persisted
known empty   enrichment succeeded, zero matchable GitHub mappings
unknown       refresh failed / not run / org slug missing
not applicable  subject is not a Sentry project
```

Isolation rules:

- Sentry project discovery success survives mapping enrichment failure.
- Sentry release refresh and issue refresh remain independent of mapping
  refresh. One family's failure is not the others' known-empty.
- GitHub-only or Sentry-only sync does not refresh `code_mapped_to`.
- 403 / missing `org:read` or `org:integrations` is **unknown**, not
  empty. Existing connect tokens may lack the new scope. Tell the user
  what to do next without leaking the token.
- Unknown must never be rewritten as known-empty.
- Multi-provider sync still persists successes, reports failures, and
  exits non-zero if any provider fails.

---

# Offline Behavior

After sync, these commands and tools must work with no provider network
and no credentials:

```bash
bun run combie -- relationships
bun run combie -- related <github-or-sentry-resource-id>
bun run combie -- investigate <github-or-sentry-resource-id>
```

and MCP `get_related_context` / `investigate_resource` on the same ids.

Investigation composition remains local and one-hop. Do not fetch Sentry
or GitHub during investigate.

---

# CLI / Investigation Behavior

### `combie relationships`

List `code_mapped_to` with the same table as existing kinds. Show
source, kind, target, and enough evidence to explain the join
(repository identity + mechanism).

### `combie related`

Bidirectional one-hop. From the repository, outbound `code_mapped_to`
the Sentry project. From the project, inbound `code_mapped_to` from the
repository.

### `combie investigate`

No new CLI section is required for mapping rows themselves.

Reuse:

```text
RELATED CONTEXT     one-hop neighbors, already kind-agnostic
KNOWN FACTS         truthful mapping / relationship facts
MISSING CONTEXT     unknown / empty / unmatched / no edges
```

Do **not** add `CODE MAPPINGS`, `CORRELATIONS`, or a release↔issue
join section.

Subject Sentry releases and issues remain as shipped. Neighbor GitHub
workflow-run evidence may appear through existing one-hop rules when
the new edge exists. That is related-resource evidence, not a claim
that those workflow runs produced Sentry releases.

### Provider activity / timeline

No new provider-activity family. Code mappings are control-plane
configuration, not operational activity. Do not merge them into
`PROVIDER ACTIVITY` or `TIMELINE`.

---

# MCP Parity

The MCP contract remains exactly these four read-only tools:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

`get_related_context` already returns kind, direction, evidence, source,
and target. It must include `code_mapped_to` without schema redesign.

`investigate_resource` already returns related neighbors, Known Facts,
and Missing Context. Additive fields only if a test proves a structured
gap that existing related/facts payloads cannot express. Default
expectation: **no new MCP fields**.

No new tools. No write path. Database bytes must remain unchanged after
MCP calls (existing read-only regression).

---

# Known Facts / Missing Context

### Known Facts may say

```text
Sentry code-mapping evidence deterministically connects
github:repository:<id> to sentry:project:<id>.
```

when the edge exists.

They may summarize mapping authority on a Sentry subject:

```text
Sentry code-mapping evidence is populated for sentry:project:<id>.
Sentry reports no GitHub code mappings for sentry:project:<id>.
```

They must not invent a fifth investigation-fact slot by dropping a more
useful current fact. Stay inside `MAX_INVESTIGATION_FACTS`. Prefer
omitting a mapping-authority fact over exceeding the budget or
displacing release/issue facts that already save scanning.

### Missing Context must say

- mapping refresh unknown (and retain-vs-current wording when prior
  mappings exist)
- authoritative empty mappings, only when that absence is the reason
  no GitHub edge can exist — do not turn known-empty into a scare
- a persisted mapping whose GitHub repository is not in inventory
- no one-hop Relationships (existing `no_known_relationships`)
- existing `no_deterministic_release_issue_linkage` when releases and
  issues coexist — **unchanged**; the new Relationship does not close
  that gap

The new edge does **not** authorize deleting
`no_deterministic_release_issue_linkage`. A repository mapped to a
project still does not prove that any retained release caused any
retained issue.

Do not add Missing Context that scolds the user for not connecting
unrelated providers. If GitHub is not connected, say so as unknown
cross-provider identity, not as a prompt to adopt GitHub.

---

# Sync Integration

After Sentry project Resources are applied, and independently of release
and issue refresh:

1. Refresh code-mapping evidence per project (or per org, then bind by
   exact project id — Phase 2 pins the cheaper correct shape).
2. Record mapping-refresh authority (populated / empty / failure).
3. Persist compact facts idempotently.
4. After both GitHub and Sentry have succeeded in this run, run
   `inferGitHubSentryRelationships` and resolver-scoped stale cleanup.
5. Leave unrelated providers and the other two resolvers unchanged.

Document bounds (page size / max pages) in the sync summary the same way
releases and issues do. Never imply complete mapping history if the API
is bounded.

---

# Security

Persist compact investigation-relevant identity only.

Never persist:

- tokens, DSN, secrets, webhook URLs
- clone URLs that embed credentials
- stack traces, issue titles, request data, user identifiers
- raw API payloads
- integration OAuth material

Existing secret redaction must remain intact. Errors must say what the
user can do next (reconnect with `org:read` / the Phase-2-pinned scope)
without printing the token.

---

# Phase 1 — Repository Understanding Report

Before coding, read `skills/build-combie/SKILL.md`, the Canon, this
Sprint, Sprint 007 GitHub↔Sentry findings, Sprint 009 resolver
mechanics, Sprint 043/044 completion notes, and inspect:

- `src/domain/relationship.ts`
- `src/app/infer-github-vercel.ts`, `src/app/infer-vercel-cloudflare.ts`
- `src/app/sync.ts` refresh gates and stale cleanup
- `src/app/related.ts`, `investigate.ts`, `investigation-facts.ts`,
  `missing-context.ts`
- `src/providers/sentry/normalize.ts`, client, adapter, sync hooks
- `src/providers/github/normalize.ts` (`providerResourceId`, `fullName`)
- MCP `get_related_context` / `investigate_resource`

Report:

1. How the two existing resolvers refresh and isolate stale cleanup.
2. What Sentry project metadata exists today.
3. Whether mapping facts belong on Resource metadata or a table.
4. Whether `related` / investigate / MCP need any code change beyond a
   new kind flowing through existing types.
5. How Known Facts / Missing Context should mention the new edge without
   exceeding the fact budget or weakening release/issue wording.
6. Whether a generic correlation primitive is earned (expected: no).

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure Report

Verify the official Sentry **code-mapping** read path (not issue, event,
or release-commit endpoints) against current docs and, when authorized,
a live probe.

Answer:

1. Exact read endpoint(s) for project-scoped code mappings.
2. Whether org `repos` is required as a lookup, and what join field
   binds `repos[].id` to a mapping.
3. Required auth scopes / token permissions.
4. Stable mapping identity and stable repository identity.
5. Exact project binding field. No slug-only matching.
6. Whether Sentry exposes a GitHub numeric repository id. If yes, it is
   the primary join key. If no, exact `owner/repo` ===
   `metadata.fullName` is the only fallback.
7. How non-GitHub SCM providers are represented — they must be ignored.
8. Fields that must never persist.
9. Pagination and bounds.
10. Mutable lifecycle (mapping added / removed across syncs).
11. Failure semantics when project discovery succeeds and mapping
    refresh fails.
12. Whether `code_mapped_to` still matches the evidence. If the official
    payload cannot support a project-scoped deterministic join, **stop**.
13. Does Canon require a change? Expected: no, except AGENTS.md
    operational baseline after implementation.

Record the report in completion notes before implementation.

---

# Tests

Red → Green → Refactor. No live provider credentials required.

### Client / normalization

- project-scoped binding; org repos never create an edge alone
- GitHub-only mappings kept; GitLab/Bitbucket/unknown dropped
- primary numeric-id match; fullName fallback only when id absent
- display-name / slug match rejected
- malformed responses, token redaction, excluded-field enforcement
- known-empty vs omitted vs failed refresh

### Resolver

- exact matches produce one `code_mapped_to` edge
- duplicate mappings to the same pair collapse
- one repo → two projects produces two edges
- no GitHub inventory → no edge
- existing `source_for` / `uses_domain_in` fixtures unaffected
- evidence provenance contains source `sentry` and mechanism
  `code_mapping`

### Persistence / sync

- upsert idempotency; pre-045 DB upgrade
- refresh only when GitHub **and** Sentry succeeded
- Sentry-only or GitHub-only sync does not stale-clean this kind
- mapping refresh failure preserves projects, releases, issues, and
  prior `code_mapped_to` edges
- release / issue refresh isolation unchanged
- no Change rows from mapping refresh

### Investigation / MCP

- `relationships` and `related` show the new kind both directions
- `investigate` RELATED CONTEXT includes the neighbor
- Known Facts wording stays inside the allowed claim classes
- Missing Context: unknown mapping, unmatched repo, and unchanged
  `no_deterministic_release_issue_linkage`
- MCP `get_related_context` / `investigate_resource` parity
- read-only DB regression
- still exactly four MCP tools

---

# Live Dogfood Requirements

Optional when **both** `GITHUB_TOKEN`/`GH_TOKEN`/`--use-gh` and
`SENTRY_AUTH_TOKEN`/`SENTRY_TOKEN` are explicitly authorized.

```text
connect github  (existing authorization path)
connect sentry --use-env
sync
relationships
related <github:repository:…>
related <sentry:project:…>
investigate <both ids>
MCP get_related_context + investigate_resource (offline, DB unchanged)
```

Record sanitized results in `docs/internal/beta/DOGFOOD.md` or
completion notes.

Sprint 043 dogfood used a test org with **no** Relationships and a
seeded `combie-dogfood` Sentry project. That inventory may still be
known-empty for mappings. Treat known-empty as a successful dogfood
outcome, not a reason to create a mapping or to fall back to name
matching.

If a real code mapping exists, confirm:

- the edge is `code_mapped_to`, not `source_for`
- evidence names Sentry + `code_mapping`
- investigate does not claim release→issue causality
- offline replay matches the live investigate output

Never commit secrets or private resource names. Do not create Sentry
code mappings, GitHub repos, or releases unless the user explicitly
authorizes a write outside Combie.

---

# Explicitly Out of Scope

Do not implement:

- a second new Relationship kind
- reuse of `source_for` for Sentry
- Vercel ↔ Sentry Relationship
- GitHub ↔ Cloudflare Relationship
- release deploy N+1 enrichment
- Sentry release commit / ref / author persistence
- shared-commit extension to Sentry releases or issues
- release↔deployment or release↔issue joins
- CORRELATED claim surfaces
- raw Sentry error events or occurrence-level telemetry (Class D)
- stack traces, traces, metrics, logs, session replays
- issue detail / event drill-down
- DSN or environment-variable reads
- generic Event / Correlation / Graph / Resolver engine
- multi-hop traversal, path finding, application ontology
- durable Investigation object
- hypotheses, confidence scoring, summaries, managed AI
- new MCP tools or MCP semantic changes beyond parity
- new providers, webhooks, background sync
- operational memory / learning / execution
- user-defined relationship overrides or candidate confirmation UI

Do not scaffold these capabilities.

---

# What This Sprint Deliberately Leaves for Later v0.5 Work

Sprint 044's directional sequence continues after this slice:

```text
SPRINT 043   Sentry release evidence                         ✅
SPRINT 044   Sentry issue evidence                           ✅
SPRINT 045   GitHub ↔ Sentry code-mapping Relationship       ← this Sprint
SPRINT 046+  earned joins (only after identifiers exist)
             - release commit/ref persistence, if earned
             - shared-commit grouping inside code_mapped_to
             - release↔deployment joins, if exact evidence exists
             then durable Investigation object
             then hypotheses / confidence (carefully)
             → v0.5 milestone
             → v0.6 Operational Memory
```

Exact later sprint numbers may shift. Direction is fixed: **do not**
implement earned joins in 045, and **do not** start the Investigation
Engine.

A later Sprint may say:

```text
KNOWN: these records reference the same exact Git commit
inside an already-proven code_mapped_to relationship.
```

This Sprint must not say that. It also must not persist the commit
identifiers that sentence would require.

---

# Product / Contract Freezes

Frozen unless this Sprint's Phase 2 records a Canon-required change
(expected: none):

- MCP tools: `list_resources`, `list_providers`,
  `get_related_context`, `investigate_resource`
- MCP remains local, offline, read-only
- Resource kinds unchanged
- existing Relationship kinds and resolvers unchanged
- Change / timeline semantics unchanged
- Sentry release and issue envelopes unchanged
- no generic Event abstraction
- no write-enabled MCP
- no hosted Combie, API, or SDK

After implementation, AGENTS.md may list `code_mapped_to` as a third
proven graph edge. VISION, ARCHITECTURE, ROADMAP, and SKILL stay
unchanged unless Phase 2 finds a material Canon conflict — report it;
do not silently edit Canon to match a desired join.

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

Confirm exactly four MCP tools remain registered.

---

# Definition of Done

- [x] Sprint 045 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: compact Sentry code-mapping persistence + authority
- [x] if earned: `code_mapped_to` resolver + scoped stale cleanup
- [x] if earned: CLI `relationships` / `related` / `investigate` surfaces
- [x] if earned: Known Facts / Missing Context stay inside claim classes
- [x] if earned: MCP parity through the existing four tools
- [x] if not earned: rejection documented; no invented join
- [x] existing `source_for` and `uses_domain_in` behavior unchanged
- [x] no Change pollution; no secrets in output, errors, or fixtures
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged unless material semantics require an update

---

# Anti-Overengineering Rules

Do not introduce:

```text
CorrelationEngine
GraphEngine
ResolverRegistry
RelationshipPluginRuntime
EventStore
SharedCommitV2
HypothesisEngine
```

Three concrete resolvers remain a small system. The third must copy the
shape of the first two, not replace them.

---

# Final Principle

> **Sprint 045 may prove that Sentry configured a GitHub repository as
> source-context for a project. It must not pretend to know what that
> mapping caused.**

---

# Completion Notes

## Baseline (2026-08-15)

```text
HEAD:          d7ab0b0737710c0f2fcf030bcf20588910e975d0
               docs(sprints): activate 045 GitHub↔Sentry code-mapping
worktree:      clean
tests:         758 pass across 69 files
typecheck:     clean
MCP:           exactly four read-only tools
Sprint 044:    Complete
Sprint 045:    Active (authoring commit only)
```

## Repository Understanding

1. **Existing resolvers.** `infer-github-vercel.ts` and
   `infer-vercel-cloudflare.ts` are application-layer, read stored
   Resources only, and refresh from `sync.ts` only when both providers
   succeed. Stale cleanup is resolver-scoped (`isGitHubVercelSourceFor` /
   `isVercelCloudflareUsesDomainIn`). `related`, investigate RELATED
   CONTEXT, and MCP `get_related_context` are kind-agnostic.
2. **Sentry metadata today.** `normalizeProject` stores slug,
   organization_slug/id, platform, status, dateCreated. No repository or
   mapping facts.
3. **Where mapping facts belong.** Vercel domains live on Resource
   metadata but are attached during discover, so later diffs can emit
   Changes. Mapping refresh after first 045 sync would therefore pollute
   the Change timeline if written through `applyResource`. Compact facts
   stay on the Sentry project Resource (`codeMappings` +
   `codeMappingRefresh`) and are written with
   `Store.replaceResourceMetadata` (no Change). Not a second mappings
   table.
4. **Surfaces.** No new CLI section or MCP fields. The new kind flows
   through existing `relationships` / `related` / investigate / MCP.
5. **Facts budget.** `code_mapping_relationship` is appended after
   existing candidates so it fills remaining `MAX_INVESTIGATION_FACTS`
   slots and does not displace release/issue facts.
6. **Generic correlation.** Not earned. One concrete resolver.

## Architecture Pressure

Official Sentry source (not public OpenAPI):
`OrganizationCodeMappingsEndpoint` at
`GET /api/0/organizations/{organization_id_or_slug}/code-mappings/`.
GET publish status is PRIVATE; this is the production UI/Terraform read
path identified in Sprint 007. Serializer
`RepositoryProjectPathConfigSerializer` returns:

```text
id, projectId, projectSlug, repoId, repoName,
integrationId, provider.{key,slug,name,…},
stackRoot, sourceRoot, defaultBranch, automaticallyGenerated
```

1. **Endpoint.** `GET /organizations/{slug}/code-mappings/?project={id}`.
   Filter is the official `project` query used by `get_projects`.
2. **Org repos.** Not required. `repoName` and `provider.key` are on the
   mapping payload. Org `repos/` is not a project join key.
3. **Scopes.** `OrganizationIntegrationsLoosePermission`. 403 is unknown,
   not empty. Existing tokens may lack `org:read` / `org:integrations`.
4. **Identity.** Mapping `id` (optional display), Sentry-internal
   `repoId`, canonical `repoName` (`owner/repo`).
5. **Project binding.** `projectId` must equal
   `Resource.providerResourceId`. No slug matching.
6. **GitHub numeric id.** Not in the official payload. Join key is exact
   `repoName` === GitHub `metadata.fullName`. `githubRepoId` is accepted
   only if a payload later supplies it.
7. **Non-GitHub SCM.** `provider.key` !== `github` is dropped
   (GitLab/Bitbucket/unknown).
8. **Never persist.** stackRoot, sourceRoot, defaultBranch,
   automaticallyGenerated, projectSlug, integration OAuth, DSN, tokens,
   raw payloads.
9. **Pagination / bounds.** Offset paginator + Link header.
   `CODE_MAPPINGS_PER_PAGE=100`, `CODE_MAPPINGS_MAX_PAGES=1`.
10. **Lifecycle.** Same mapping id/repo upserts; `[]` is known-empty;
    disappearance under a successful refresh is stale-cleanup authority
    for this resolver only.
11. **Failure.** Project discovery, releases, and issues survive mapping
    refresh failure. Unknown ≠ empty. Prior mappings and edges retained.
12. **Verdict: implement.** `code_mapped_to` matches the evidence.
    Deterministic project-scoped join exists. Do not invent a name match.
13. **Canon.** VISION / ARCHITECTURE / ROADMAP / SKILL unchanged.
    AGENTS.md operational baseline lists the third proven edge after
    implementation.

## Implemented

- `src/providers/sentry/code-mapping.ts` — normalize, authority,
  GitHub-only allowlist
- `SentryClient.listOrganizationCodeMappings`
- `src/app/sentry-code-mappings.ts` — isolated sync hook after issues
- `src/app/infer-github-sentry.ts` — `code_mapped_to` resolver
- `Store.replaceResourceMetadata` — metadata write without Changes
- `sync.ts` refresh gate: both GitHub and Sentry must succeed; scoped
  stale cleanup; unknown mapping refresh keeps prior edges
- Known Facts: `code_mapping_relationship` (budget-fill only)
- Missing Context: `code_mapping_refresh_unknown`,
  `code_mapping_unmatched_repository`;
  `no_deterministic_release_issue_linkage` unchanged
- MCP: existing four tools; kind flows through `get_related_context` and
  `investigate_resource`

## Deviations

- Live GitHub+Sentry dogfood was not run: no authorized
  `SENTRY_AUTH_TOKEN` / `SENTRY_TOKEN` in this session; `~/.combie` has
  no connected providers. Fixture/E2E coverage in
  `tests/app/github-sentry-relationships-sync.test.ts`.
- Mapping GET is Sentry-private (not public OpenAPI). Implementation
  follows the production endpoint + serializer Sprint 007 already ranked
  Class B, not an invented join.

## Validation

```text
bun test:          794 pass across 74 files (was 758 / 69)
bun run typecheck: clean
git diff --check:  clean
MCP tools:         get_related_context, investigate_resource,
                   list_providers, list_resources
live GitHub+Sentry: skipped (no authorized Sentry token)
```

## Learnings

- Code-mapping list items already carry `projectId`, `repoName`, and
  `provider.key`. Org repos lookup is unnecessary for the join.
- Writing mapping facts through `applyResource` would create Resource
  Changes on the first 045 sync of existing Sentry projects. A metadata
  replace that skips `diffResource` is the smallest way to keep the
  Sprint 008 metadata shape without violating the no-Change rule.
- A proven `code_mapped_to` edge does not close
  `no_deterministic_release_issue_linkage`. That remains a later earned
  join, and it still requires identifiers this Sprint does not persist.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL are unchanged. No new Resource
kinds, MCP tools, Event primitive, or earned-join surface.

AGENTS.md operational baseline becomes Sprints 001–045 complete: proven
graph now includes `code_mapped_to` (GitHub repository → Sentry project)
from project-scoped Sentry code-mapping evidence only. Earned joins
remain later. Sprint 046 is not started.
