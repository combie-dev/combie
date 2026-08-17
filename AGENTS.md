# AGENTS.md — Combie

Combie is the open engineering context layer. Sprints 001–047 implement the
local multi-provider context foundation through **Cloudflare**, **GitHub**,
**Vercel**, **Sentry**, **Neon**, and **PlanetScale**, including deterministic
Relationships (including GitHub↔Sentry `code_mapped_to`), retained provider
evidence (including Sentry releases, release commit identities, and Sentry
issue aggregates), offline investigation, read-only MCP, release distribution,
guided agent setup, and a concluded GitHub-first closed beta. Sprint 047 shipped
same-SHA release↔deployment correspondence (two proven edges; no new
Relationship). Sprint 048 shipped the smallest durable Investigation snapshot
(list + reopen of an explicit `investigate --save`; not the
Investigation Engine). Sprint 049 shipped compare-to-current: `investigation
<id> --compare` diffs one retained snapshot against a live one-hop compose of
the same subject (SAME / SNAPSHOT ONLY / CURRENT ONLY / AUTHORITY CLOCK).
Sprint 050 shipped subject-scoped Investigation history: `investigations
--resource <resource-id>` lists retained snapshots for one exact subject id
(ROADMAP v0.6 historical retrieval; not lifecycle, not Operational
Memory, not the Investigation Engine). Sprint 051 shipped explicit
Investigation resolution memory: `resolution --investigation <id>` records
decision / action / outcome as fields on a saved Investigation;
`resolutions --investigation` / `--resource` retrieve them (ROADMAP v0.7
smallest capture; founder override 2026-08-16; not Incident, not separate
Decision / Action / Outcome models, not Recommendation, not the
Investigation Engine). Sprint 052 shipped exact-id Resolution recall
on live `investigate` and `investigation <id>` reopen (ROADMAP v0.7;
read-time list over the 051 table; not snapshot JSON, not Known Facts,
not evidence-id joins, not Incident, not MCP, not the Investigation
Engine). No next sprint is Active.

## Mandatory reading order before any substantive change

Per `skills/build-combie/SKILL.md` (the canonical Engineering Constitution), read in this order:

1. `skills/build-combie/SKILL.md`
2. `docs/internal/VISION.md`
3. `docs/internal/ARCHITECTURE.md`
4. `docs/internal/ROADMAP.md`
5. Active Sprint under `docs/internal/sprints/`
6. Relevant code and tests under `src/` and `tests/`

## Source-of-truth hierarchy

`VISION.md` → `ARCHITECTURE.md` → `ROADMAP.md` → Active Sprint → Code.

- If implementation conflicts with the Canon, **report the conflict — do not silently change the Canon or the code to mask it.**
- Do not create new permanent documents (e.g. `MEMORY_MODEL.md`, `MCP_SPEC.md`) unless explicitly requested. Canon = VISION, ARCHITECTURE, ROADMAP, SKILL.
- Update only the canonical doc whose *material* content changed; otherwise leave docs untouched.
- `.history/` contains editor backups — never treat as canonical or edit.

## Current baseline: Sprints 001–052 complete

Multi-provider connection loop:

```text
combie init
  → connect cloudflare | github | vercel | sentry | neon | planetscale
  → sync (all connected providers)
  → providers | resources | relationships | changes | history | context
  → investigate (deterministic, offline, one hop)
  → agent setup | mcp (four read-only local tools)
```

Supported resource kinds: `worker`, `database` (Cloudflare D1 / PlanetScale), `kv_namespace`, `zone`, `repository`, `project` (Vercel / Sentry / Neon).

Providers: Cloudflare, GitHub, Vercel, Sentry, Neon, PlanetScale.

- Current proven graph scope: `source_for` (GitHub repository → Vercel
  project), `uses_domain_in` (Vercel project → Cloudflare zone), and
  `code_mapped_to` (GitHub repository → Sentry project), derived only from
  exact provider evidence. `code_mapped_to` means Sentry configured the
  repository as source-context for the project; it does not prove
  error-reporting completeness or release/issue causality.
- Current agent scope: exactly four local, offline, read-only MCP tools:
  `list_resources`, `list_providers`, `get_related_context`, and
  `investigate_resource`.
- **Shipped Sentry evidence:** compact release history and compact issue
  aggregates on `sentry:project:<id>`, offline `RELEASES` and `ISSUES`,
  `sentry_release` / `sentry_issue` provider activity, and compact
  project-scoped GitHub code-mapping facts used only for `code_mapped_to`.
  Issue rows are current-state snapshots (`firstSeen` / `lastSeen` /
  `count`), not an occurrence log. Sentry releases carry an optional
  compact full Git commit SHA (`lastCommit.id` / `ref` allowlist) shown
  as `git commit` in RELEASES and used only for shared-commit grouping
  inside `code_mapped_to`.
- **Sprint 046 shipped:** persist a compact Sentry release Git commit
  SHA when the provider supplies a full SHA, and extend existing
  ephemeral shared-commit grouping to `code_mapped_to` only (ROADMAP
  v0.5 Safe Semantic Boundary).
- **Sprint 047 shipped:** when one investigation already holds both a
  `source_for` and a `code_mapped_to` shared-commit group for the same
  exact SHA, Combie surfaces that those Vercel deployment and Sentry
  release records reference the commit through those two proven edges —
  a read-time `SharedCommitCorrespondence` (one per SHA) shown in the
  CLI SHARED COMMIT CONTEXT note and an additive
  `sharedCommitCorrespondences` MCP field, plus a
  `shared_commit_correspondence_missing` Missing Context item for
  one-sided groups. No Vercel↔Sentry Relationship, multi-hop
  traversal, Sentry deploy N+1, version-string joins, release↔issue
  joins, new MCP tools, a generic Event or Correlation abstraction,
  Class D events, additional providers, model reasoning, background
  sync, webhooks, telemetry ingestion, operational learning, policy, or
  execution.
- **Sprint 048 shipped:** persist a local, explicit, read-only snapshot
  of an already-composed `investigate` result (`investigate --save`,
  `investigations`, `investigation <id>`). The snapshot is retained
  composition at `composedAt`, not current provider truth. Do not add
  an Investigation Engine, hypotheses, confidence, ContextPack,
  fact-budget redesign, Sentry deploy N+1, new MCP tools, graph
  mutation, multi-hop, generic Event/Correlation abstractions, or
  execution.
- **Sprint 049 shipped:** compare one saved Investigation snapshot to a
  live one-hop compose of the same subject (`investigation <id>
  --compare`), bounded to SAME / SNAPSHOT ONLY / CURRENT ONLY /
  AUTHORITY CLOCK per section. The comparison is ephemeral, persists
  nothing, and never rewrites the snapshot; a missing subject Resource
  is the reported status `subject_missing` (exit 0), not a command
  failure. Do not add Investigation lifecycle status, Incident /
  Decision / Action / Outcome, hypotheses, ContextPack, fact-budget
  redesign, new MCP tools, graph mutation, multi-hop, or execution.
- **Sprint 050 shipped:** subject-scoped Investigation history:
  `investigations --resource <resource-id>` lists retained snapshot
  summaries for one exact `subjectResourceId` (`composedAt` DESC, `id`
  DESC; same 048 table, read-time filter, no schema migration).
  Filtered listing survives subject Resource deletion (never
  `RESOURCE_NOT_FOUND`); a subject with zero snapshots is
  known-empty (exit 0) with distinct copy; unfiltered `investigations`
  is unchanged. Reopen/compare remain `investigation <id>` /
  `--compare`. Do not add lifecycle status, live-investigate
  historical sections, similarity, Incident / Decision / Action /
  Outcome, hypotheses, ContextPack, new MCP tools, graph mutation,
  or execution.
- **Sprint 051 shipped:** explicit Resolution capture on a saved
  Investigation (`resolution --investigation <id> --decision/--action/
  --outcome`, `resolution <id>`, `resolutions [--investigation|--resource]`).
  Decision, action, and outcome are distinguishable free-text fields on
  one record (append-only, `res:` ids, `subjectResourceId` copied so
  listing survives Resource deletion). At least one field is required;
  there is no `resolved: true`, no inferred Action from provider
  activity, no Incident, no Investigation lifecycle, no snapshot rewrite,
  and no MCP change. Founder override 2026-08-16 started this smallest
  v0.7 slice; it does not authorize Recommendation, Learning, similarity,
  or MCP writes. `docs/internal/beta/INVESTIGATION-DOGFOOD.md` remains
  the learning ledger for capture-shape use.
- **Sprint 052 shipped:** exact-id Resolution recall on live
  `investigate` and `investigation <id>` reopen (read-time list over
  the 051 table; distinct RESOLUTION MEMORY section omitted when empty;
  summaries only, not essays; not in snapshot JSON, not Known Facts,
  not `--compare`, not MCP, not evidence-id attribution, not Incident).
- **ROADMAP v0.6 Investigation is closed at the deterministic
  milestone** (post-Sprint-050 architecture audit). Shipped minimum
  loop: compose → save retained composition (`investigate --save`) →
  reopen (`investigation <id>`) → compare retained vs current
  (`--compare`) → retrieve retained compositions by subject
  (`investigations --resource <id>`). The deterministic foundation
  (exact Resource subject, one-hop deterministic Relationships, Known
  Facts, Missing Context, provider-native evidence, provider activity,
  dual chronologies / authority semantics, exact shared-commit
  context, same-SHA correspondence) is complete.
  `getInvestigationContext` and its projections satisfy the
  deterministic Investigation coordination responsibility; do not
  introduce a redundant InvestigationEngine abstraction merely to
  match an architectural noun. Remaining v0.6 Capabilities (narrative
  summaries, hypotheses, confidence, live historical pointers, MCP
  snapshot/history/compare access, multi-hop graph expansion, telemetry
  query adapters, additional provider evidence, ContextPack /
  fact-budget redesign, notifications / Signal-driven investigation,
  Combie-managed model reasoning) are optional and evidence-gated, not
  unfinished v0.6 work; persisted open/closed/completed lifecycle is
  not unfinished v0.6 work either. Operational Memory remains ROADMAP
  v0.7 and stays distinct: Investigation ≠ Incident ≠ Decision ≠
  Action ≠ Outcome. Closing v0.6 did not by itself authorize Sprint 051.
  On 2026-08-16 a founder override started Sprint 051 as the smallest
  v0.7 slice: explicit Resolution capture on a saved Investigation
  (decision / action / outcome as fields, exact-id retrieve, no inferred
  Action, MCP frozen). Sprint 051 shipped that slice. It does not
  authorize Incident, Recommendation, Learning, similarity,
  Investigation lifecycle, or MCP writes. Sprint 052 shipped exact-id
  Resolution recall on live `investigate` and `investigation <id>`
  reopen. 051 leftover is not a sequence; evidence-id attribution
  remains unearned. Sprint 053 is not started.
  `docs/internal/beta/INVESTIGATION-DOGFOOD.md` remains the learning
  ledger for capture-shape use.
- Explicitly out of scope until a later sprint authorizes a change: new MCP
  tools or semantics, API, SDK, hosted Combie, and in-product analytics or
  feedback collection.

## Repository layout

```text
src/
  cli/                 CLI entry and commands
  agent/               Claude Code, Codex, and Cursor MCP configuration
  app/                 Application services and deterministic context composition
  domain/              Provider-independent Resource, Relationship, and Change models
  mcp/                 Local stdio read-only agent interface
  provider/            Minimal provider contract + registry
  providers/cloudflare  Cloudflare adapter (HTTP client, normalize, errors)
  providers/github      GitHub adapter (HTTP client, normalize, errors)
  providers/vercel      Vercel adapter
  providers/sentry      Sentry adapter
  providers/neon        Neon adapter
  providers/planetscale PlanetScale adapter
  storage/              SQLite domain store + separate credentials file
tests/                 bun:test suites (no live provider credentials required)
```

## Conventions

- Stack: TypeScript + Bun (`bun:sqlite`, `bun:test`).
- TDD: Red → Green → Refactor; smallest implementation that satisfies the Sprint; provider-specific logic stays inside the provider adapter.
- Test suite must run **without live provider credentials** (fixtures/mocks).
- Credentials: explicit authorization only.
  - Cloudflare: `--token` or `--use-env` with `CLOUDFLARE_API_TOKEN`
  - GitHub: `--token`, `--use-env` with `GITHUB_TOKEN`/`GH_TOKEN`, or `--use-gh` (`gh auth token`)
  - Vercel: `--token` or `--use-env` with `VERCEL_TOKEN`
  - Sentry: `--token` or `--use-env` with `SENTRY_AUTH_TOKEN`/`SENTRY_TOKEN`
  - Neon: `--token` or `--use-env` with `NEON_API_KEY`
  - PlanetScale: `--use-env` with `PLANETSCALE_SERVICE_TOKEN_ID` + `PLANETSCALE_SERVICE_TOKEN`, or `--token-id` + `--token`; multi-org requires `--organization <slug>`
  - No filesystem/shell-history/`.env` scanning. Secrets never appear in logs, normal output, errors, or commits. Credentials file is mode `0600` and separate from the domain DB.
- Errors must say what the user can do next and preserve provider context without leaking secrets.
- Multi-provider sync attempts each connected provider, persists successes, reports failures, and exits non-zero if any provider fails.
- Commits only when authorized; conventional style (`feat(provider): …`, `fix(storage): …`).
- When a Sprint completes, record Implemented / Deviations / Validation / Learnings / Canon Changes notes in the Sprint doc; never start the next Sprint.
- Never request credentials, authorization headers, unredacted state
  databases, or private resource names.

## Commands

```bash
bun install
bun test
bun run typecheck
bun run combie -- help
```
