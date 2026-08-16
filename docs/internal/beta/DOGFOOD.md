# DOGFOOD.md — Closed-Beta Dogfood Checklist (internal)

For Combie maintainers only. Purpose: verify the fresh-user experience and the
real multi-provider loop before inviting external users (Sprint 037 blocker #3;
prepared by Sprint 038, Deliverable 6).

## Rule of honesty

- Record what actually happened. Never manufacture results.
- Do not fabricate fixtures for dogfood output. If a relationship or evidence
  family does not appear, record its absence.
- If live credentials are unavailable, record the exact deferral and the exact
  missing prerequisite. Do not mark the run complete.
- Only fix small beta-blocking doc/help defects inside Sprint 038. Larger issues
  become follow-up work.

## How to run

1. Pick a scenario (A–G). Use a fresh clone for A; the others can share state.
2. Run each command listed, then tick the box and fill the Record line.
3. After all scenarios, fill the per-run capture table and append findings to
   the Findings log.

---

## Per-run capture fields

| Field | Value |
|-------|-------|
| Date | |
| Commit SHA | |
| Machine / OS | |
| Bun version (`bun --version`) | |
| Providers connected | |
| Resources discovered (count + kinds) | |
| Relationships inferred (kinds + count) | |
| Evidence populated (families + counts) | |
| Investigate targets tested | |
| Setup friction | |
| Connection friction | |
| Sync friction | |
| Investigation friction | |
| Security observations | |

Record:

---

## Scenario A — Fresh clone

Goal: verify the documented install path for someone who has never seen Combie.
Start: clean clone, no `.combie` state, no provider env vars.

Checklist:
- [ ] Clean clone and `bun install` complete without errors
- [ ] `bun run combie --help` prints the full command list (14 commands) and connect options
- [ ] `bun run combie init` succeeds
- [ ] State dir created at `./.combie` with mode `0700`
- [ ] `./.combie/combie.db` exists (SQLite)
- [ ] `./.combie/credentials` exists (empty or absent until first connect)
- [ ] `bun run combie init` re-run is safe (idempotent message)
- [ ] Re-running `init` with `--dir <path>` and `COMBIE_HOME` honored

Record: (install/help/init results, state dir listing with `ls -la`, any friction)

---

## Scenario B — Core stack

Goal: verify the real multi-provider loop. Minimum: GitHub + Vercel. Preferred:
GitHub + Vercel + Cloudflare (+ optional Sentry). Optional extras: Neon,
PlanetScale.

Checklist:
- [ ] `bun run combie connect github` (one of `--token`, `--use-env` with `GITHUB_TOKEN`/`GH_TOKEN`, or `--use-gh`)
- [ ] `bun run combie connect vercel` (`--token` or `--use-env` with `VERCEL_TOKEN`)
- [ ] Optional: `bun run combie connect cloudflare` (`--use-env` with `CLOUDFLARE_API_TOKEN`)
- [ ] Optional: `bun run combie connect sentry` (`SENTRY_AUTH_TOKEN` or `SENTRY_TOKEN`)
- [ ] `bun run combie providers` lists connected providers with account identity
- [ ] `bun run combie sync` succeeds for all connected providers
- [ ] `bun run combie resources` lists discovered resources
- [ ] `bun run combie resources --provider <id>` and `--kind <kind>` filter correctly
- [ ] `bun run combie relationships` runs (may be empty)
- [ ] `bun run combie investigate <resource-id>` completes for at least one target
- [ ] A single provider failing does not invalidate successful providers (partial failure behavior)

Record: (per-command results, resource counts, any failure messages)

---

## Scenario C — Relationships

Goal: verify exact, evidence-backed edges. `source_for` appears only when
GitHub repository evidence links to a Vercel project (`git_repository_reference`).
`uses_domain_in` only when a Vercel custom-domain apex equals a Cloudflare zone.

Checklist:
- [ ] `source_for` edge appears for a real repo + Vercel project pair
- [ ] `uses_domain_in` edge appears where a real Vercel domain matches a Cloudflare zone
- [ ] No relationship appears without matching provider evidence
- [ ] `relationships` output shows provenance (evidence source/mechanism) for each edge

Record: (edge kinds + counts observed; expected edges that were ABSENT and why
— record honestly, e.g. "Vercel project not linked to a Git repo", "no
Cloudflare zone for domain")

---

## Scenario D — Memory

Goal: verify Changes, history, and investigation reflect a second sync.

Checklist:
- [ ] First `sync` completes
- [ ] Second `sync` completes against the same stack
- [ ] `bun run combie changes` lists observed resource changes (may be empty)
- [ ] `bun run combie history <resource-id>` shows current state and observed history
- [ ] `bun run combie investigate <resource-id>` reflects re-synced evidence

Optional (only if a benign provider change is safe and available — no need to
mutate infrastructure for this checklist):
- [ ] One benign change observed (e.g. a Vercel deployment) and visible in `changes`/`history`/`investigate`

Record: (change counts, whether history accumulated across runs)

---

## Scenario E — Shared commit context

Goal: verify `SHARED COMMIT CONTEXT` in investigate output when exact evidence
exists. Requires matching full Git commit SHAs across GitHub workflow-run
evidence and Vercel deployment evidence inside a `source_for` relationship.

Checklist:
- [ ] A `source_for` pair exists (else record deferral)
- [ ] Exact commit SHA evidence exists on both sides
- [ ] `SHARED COMMIT CONTEXT` section appears in investigate output for the pair
- [ ] Section lists workflow runs and deployments with the exact-SHA basis line

Record: ("no live shared-commit example available" if evidence does not match,
or the observed groups and SHAs)

---

## Scenario F — Offline

Goal: verify all read commands work with no network and no credentials.

Checklist:
- [ ] After a successful sync, unset all credential env vars (`unset GITHUB_TOKEN VERCEL_TOKEN CLOUDFLARE_API_TOKEN ...`)
- [ ] `providers` works offline
- [ ] `resources` works offline
- [ ] `relationships` works offline
- [ ] `changes` works offline
- [ ] `history <resource-id>` works offline
- [ ] `related <resource-id>` works offline
- [ ] `context <resource-id>` works offline
- [ ] `investigate <resource-id>` works offline
- [ ] No credential error surfaces from any offline command

Record: (any command that failed or touched the network)

---

## Scenario G — Error UX

Goal: verify errors are understandable, actionable, and secret-safe.

Checklist:
- [ ] Invalid Resource ID format (e.g. `bun run combie history not-an-id`) gives a clear parse error
- [ ] Unknown Resource (valid format, no such resource) gives a clear not-found error
- [ ] `connect <provider>` with no token and no env var explains the options
- [ ] Bad token (safe to try with a throwaway token) fails with redacted error
- [ ] Unknown provider (e.g. `connect gitlab`) rejects with valid provider list
- [ ] `relationships`/`resources` empty-state output is understandable
- [ ] No error message contains a raw token or secret

Record: (error strings verbatim, redaction check, which messages were unclear)

---

## Findings log

| Finding | Severity (blocker/major/minor/nit) | Reproduction steps | Recommended next step |
|---------|-----------------------------------|--------------------|-----------------------|
| | | | |
| | | | |
| | | | |

Notes:
- Only small beta-blocking doc/help defects are fixed inside Sprint 038.
- Everything else becomes follow-up work (Sprint 039+ or post-beta backlog).

---

*Blank template. Copy the file or keep one canonical instance and append per run.*

---

## Sprint 041 release-candidate run — 2026-08-11

| Field | Value |
| --- | --- |
| Date | 2026-08-11 |
| Baseline commit | `cf9cf8776e890776248e7ccc6b6d3e564ab1e92a` |
| Release commit | `da038939e1def0cf3b2888ec973a8ca465955425` |
| Machine / OS | macOS 26.5.2, arm64 |
| Bun | 1.3.5 |
| Providers connected | none — every provider environment variable was absent and both configured `gh` accounts had invalid authentication |
| Resources | one synthetic local Resource used only for MCP/client journey validation; no fixture is represented as live dogfood |
| Relationships / evidence | none in synthetic state |
| Investigate target | `github:repository:123` (synthetic local state) |
| Security | exact-secret echo tests passed; protocol database hash unchanged; no credential file was created in the synthetic state |

### Scenario A — clean install/start

- [x] A clean local clone outside the development checkout completed `bun
  install --frozen-lockfile`, `bun run combie help`, and `bun run combie init`.
- [x] Repository-only distribution was confirmed: package is private, `bin`
  points at TypeScript source, and no registry package or standalone binary
  exists.
- [x] `bun run combie --version` reports `combie 0.1.0` after the Sprint 041 fix.
- [x] `--dir` without a path now exits non-zero with a usable command.
- [x] Arbitrary-cwd operation with an absolute `COMBIE_HOME` succeeded.
- [ ] Accessible external clone URL/pin: deferred because this checkout has no
  remote or tags. The invitation must provide both.

Friction: the former optional `bun link` path made the command work but changed
the tracked `src/cli/index.ts` mode from 0644 to 0777, dirtying a clean clone on
Bun 1.3.5. It was removed from the beta journey.

### Scenarios B–E — live provider journey

Deferred. No authorized token was present for Cloudflare, GitHub, Vercel,
Sentry, Neon, or PlanetScale, and `gh auth status` reported invalid credentials.
Therefore no fresh live connect, sync, Resource inventory, Relationship, or
shared-commit result is claimed. Fixture/unit coverage remains green but is not
substituted for dogfood.

### Scenario F — offline/read-only

- [x] CLI Resource reads succeeded from an isolated state using only
  `COMBIE_HOME` and no provider environment variables.
- [x] The stdio protocol client listed tools and called investigation offline.
- [x] Database SHA-256 was unchanged after MCP calls.
- [x] A legacy initialized database retained the same SHA and table set after
  the initialization probe.

### Scenario G — errors and credential safety

- [x] Uninitialized, unknown Resource, missing argument, empty state, unknown
  provider, and missing-token paths are covered and use `bun run combie`
  recovery commands.
- [x] Cloudflare, GitHub, Vercel, and Sentry mocked upstream responses that
  echoed `short-secret-123`; every user-visible error contained `[REDACTED]`
  and not the credential.
- [x] Multi-provider partial-failure behavior remains covered without live
  credentials.

### Scenarios H–I — real MCP client and agent

- [x] MCP TypeScript client discovered exactly `list_resources`,
  `list_providers`, `get_related_context`, and `investigate_resource`.
- [x] Every tool advertised read-only, non-destructive, idempotent, closed-world
  annotations.
- [x] Codex CLI 0.146.0, configured only through invocation overrides and run
  with `default_tools_approval_mode="writes"`, invoked `list_resources` and
  returned exact ID `github:repository:123` without shell use.
- [x] A second natural prompt invoked `investigate_resource` and accurately
  separated the known Resource identity/zero states from never-refreshed
  workflow evidence and absent Relationships.
- [x] Final release-SHA replay from a clean clone invoked both tools in one
  natural Codex prompt and returned the exact ID plus grounded known/missing
  context.
- [ ] Cursor 3.15.6 natural-language interaction: deferred; configuration and
  tool discovery only.
- [ ] Claude Code: deferred; the installed path resolves to a broken,
  non-executable file. Current official stdio configuration is documented.

### Sprint 041 findings

| Finding | Severity | Outcome |
| --- | --- | --- |
| README said MCP did not exist | blocker / P0 | fixed |
| Read probe applied schema migrations | blocker / P0 | fixed with read-only open + regression |
| Four providers could echo exact short secrets | blocker / P0 | fixed + four regressions |
| MCP investigation response omitted promised projections | major / P1 | fixed + protocol assertion |
| MCP tools lacked read-only annotations | major / P1 | fixed; real Codex call now succeeds |
| No accessible repository remote/tag or use terms | major / P1 | release condition |
| No live provider credentials | major / P1 | explicit deferral / release condition |
| Vercel team and Cloudflare multi-account scope ambiguity | major / P1 | documented; restrict cohort |
| `bun link` dirtied a clean clone | major / P1 | removed from beta path |

Decision from this run: **CONDITIONAL GO**. Product-level local/MCP blockers are
fixed; Sprint 042 invitations remain blocked by the release conditions in
`RELEASE.md`.

---

## Sprint 041B release-candidate run — 2026-08-13 (v0.1.1)

| Field | Value |
| --- | --- |
| Date | 2026-08-13 |
| Release | v0.1.1 — `https://github.com/combie-dev/combie/releases/tag/v0.1.1` |
| Public commit | `1643252bb3e02325534330857617321ec1ca2df` (+ main) |
| Private commits | `830384e` (test hermeticity fix) on `118a3c9` (Sprint 041B) |
| Machine / OS | macOS 26.5.2, arm64 (darwin-arm64 binary validated) |
| Distribution | standalone binary via `install.sh` (byte-identical sha
  `89f621ef…` locally, in repo, and served at `https://combie.dev/install`) |
| Providers connected | GitHub via `connect github --use-gh` (account `sgr0691`) |
| Resources | 312 repositories (GitHub); 611 workflow runs recorded |
| Relationships / evidence | workflow-run evidence: 176 repositories refreshed, 136 failed (prior evidence retained, bound ≤100 runs each) |
| Investigate targets | `github:repository:1331212396` (combie-dev/combie) —
  live release workflow run #3 `31553844937`, head sha `c18e997…`, branch
  `v0.1.0`, success |
| Agent runs | agent integration (Claude Code, Codex, Cursor setups) |
| Security | credentials file mode `0600`; no provider env vars set on the
  run; state in isolated home dirs |

### Release pipeline (CI)

- [x] `v0.1.1` tag push triggered `release.yml`; all three matrix targets
  (bun-linux-x64, bun-darwin-arm64, bun-darwin-x64 cross-compile) and the
  GitHub Release job succeeded.
- [x] Artifacts: `combie-darwin-arm64`, `combie-darwin-x64`,
  `combie-linux-x64` + `.sha256`; all downloaded checksums matched.
- [x] Smoke tests (`--version` → `combie 0.1.1`, `--help`) passed in CI and on
  the downloaded binary.
- [x] MCP contract freeze on the distributed binary: exactly
  `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource`.

### Scenario A — clean install (isolated HOME)

- [x] `curl https://combie.dev/install` served the script byte-identical to
  repo `install.sh` (sha `89f621ef…`).
- [x] Installed into an isolated `$HOME` (`~/.local/bin/combie`); binary
  SHA-256 matched the published `combie-darwin-arm64` exactly.
- [x] `combie --version` → `combie 0.1.1` (release tag embedded via
  `BUN_BUILD_VERSION`; installer resolves latest release dynamically, not the
  `v0.1.0` fallback).

### Scenario B — fresh live provider journey (final build)

- [x] `connect github --use-gh` → account `sgr0691`, credential stored in
  `0600` file.
- [x] `sync github` on the installed binary: 312 repositories, 611 workflow
  runs recorded (2 new: the v0.1.1 CI runs themselves).
- [x] Second `sync` stable; `providers`, `resources`, `relationships`,
  `changes`, `history`, and `investigate` all worked from the fresh state.

### Scenarios H–I — real MCP client and agent (final build)

- [x] `combie agent setup --yes` with the installed binary configured Claude
  Code (`~/.claude.json`), Codex (`~/.codex/config.toml`), and Cursor
  (`~/.cursor/mcp.json`) in an isolated HOME, each pointing at the installed
  binary with `COMBIE_HOME` embedded.
- [x] Real Codex CLI called through the installed binary (invocation override,
  `default_tools_approval_mode="writes"`): listed the four tools and returned
  312 repositories from the live dogfood state.
- [ ] Cursor / Claude Code natural-language calls: configuration validation
  only (agent binaries not exercised for a live prompt on this machine).

### Sprint 041B findings

| Finding | Severity | Outcome |
| --- | --- | --- |
| Agent CLI test depended on host PATH (agents present locally, absent on CI) | blocker / release gate | fixed: hermetic stub executables (`830384e` / `1643252`); 699 tests green on all matrix targets |
| `mcp_servers.combie.env` override via Codex CLI `-c` not honored in `exec` | info | worked around by exporting `COMBIE_HOME` for the Codex process (env propagates to the MCP child, same mechanism the agent configs embed) |
| `DEFAULT_VERSION="v0.1.0"` in `install.sh` is a fallback only (dynamic latest-release lookup) | nit | consistent with the established release process; no change |

Decision from this run: **ALL RELEASE CONDITIONS CLOSED**. Sprint 042
invitations are unblocked at v0.1.1.

---

## Sprint 043 Sentry release-evidence live run — 2026-08-15

| Field | Value |
| --- | --- |
| Date | 2026-08-15 |
| Sprint 043 commit | `d59080d6b384ad3b72580f300c5107ffd6993d70` |
| Machine / OS | macOS (darwin, arm64) |
| Bun | 1.3.5 |
| Providers connected | Cloudflare + Vercel (pre-existing), Sentry (new, live) |
| Resources | 1 Sentry project (`sentry:project:4511917355565056`, test project `combie-dogfood`) + pre-existing Cloudflare/Vercel resources |
| Relationships | none (no edges exist in this org) |
| Evidence populated | `sentry_release`: 3 releases recorded for 1 project |
| Investigate targets | `sentry:project:4511917355565056` |
| Security | token never echoed/logged/committed; credentials file `0600`; no secrets in any output or error |

Scope note: Sprint 043 requires a live Sentry environment. The connected org
(`sergio-3l`, account `sgr0691@gmail.com`) initially contained **zero
projects**, which validated the real known-empty discovery path. The user then
created the test project `combie-dogfood`, and — because the connected read
token returned 403 on release creation — the maintainer created three test
releases (`combie-dogfood@1.0.0`, `@1.0.1` with `dateReleased`,
`@1.1.0`) with the user's write token. This is a user-authorized deviation
from the strict read-only dogfood stance; the created test data remains in
Sentry and can be deleted by the user.

### Connection and discovery

- [x] `connect sentry --use-env` → account `sgr0691@gmail.com`, credential
  stored `0600`; `providers` shows Sentry Connected with no token exposure.
- [x] Live sync against a real **empty org** (before the test project existed):
  `✓ 0 resources` — discovery succeeded authoritatively, no error, no
  false claims. Release refresh correctly did not run (no projects).
- [x] After test project creation: `sync sentry` → `✓ 1 resource`,
  `Release evidence: 1 project refreshed (bound: ≤100 most-recent releases each)`.

### Sync and release refresh

- [x] First populated sync: `3 releases recorded`.
- [x] Repeated sync idempotent: still `3 releases recorded`, no duplicates.
- [x] Known-empty release result validated live (0 releases before creation):
  refresh ran, `authority: empty`, and the sync summary intentionally omits
  the count line (by design, `sentry-releases.ts:149`).
- [x] No false Resource Changes: `changes` and `history` remain empty for the
  subject after two release refreshes.
- [x] Exact project binding: Sentry reports all three releases under
  `projects: [4511917355565056]`, matching `sentry:project:4511917355565056`.
  Multi-project binding was not naturally present (single-project org).

### CLI investigation (`investigate sentry:project:4511917355565056`)

- [x] `RELEASES (newest first)`, `authority: populated` — ordering matches
  provider truth: `1.0.1` → `1.1.0` → `1.0.0` (dateCreated DESC).
- [x] Each release shows `created at` (provider-native), `released at` only
  where the provider supplies it (`1.0.1`), and `observed by Combie at`
  (distinct Combie observation time).
- [x] `KNOWN FACTS`: "Of 3 Sentry releases held by Combie, 3 have recorded
  status: open" + newest-activity fact with exact version and dateCreated.
- [x] `MISSING CONTEXT`: no one-hop Relationships (truthful; no edges exist).
- [x] `SUBJECT CHANGES` / `COMBIE OBSERVATIONS` remain empty — release history
  does not pollute the Change timeline.

### Provider activity

- [x] `KNOWN PROVIDER ACTIVITY (newest first; incomplete)` contains exactly
  the 3 `sentry_release` rows, newest first, `role=subject`,
  `authority=populated`, with resource id and status.

### Offline

- [x] Proven by DB-only replay: copied `combie.db*` (no credentials file) to
  an isolated dir, unset `SENTRY_AUTH_TOKEN`/`SENTRY_TOKEN`, ran
  `investigate` from `COMBIE_HOME` — identical `RELEASES` output with all
  3 releases. No network, no credential, no environment dependency.

### MCP parity

- [x] stdio MCP server (same binary/state Codex would spawn) exposes exactly
  4 tools: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource` — all read-only annotated.
- [x] `investigate_resource` offline returns `subjectReleases`
  `{kind: populated, resultCount: 3}` with the same 3 releases, same
  version/status/dateCreated/dateReleased/observedAt values as the CLI;
  `providerActivity` has 3 entries; `timeline` 0 entries — full CLI/MCP parity.
- [x] Read-only regression: DB SHA-256 unchanged after calling all four tools.
- [ ] Codex natural-language prompt: deferred — the current Codex config
  (`~/.codex/config.toml`) points `COMBIE_HOME` at a deleted temp dir
  (`agent status` reports stale). MCP was validated via direct stdio against
  the repo state instead; refresh the agent configs to re-enable this path.

### Agent questions (maintainer agent against grounded output)

- "What releases does Combie know about for this project?" → fully answered
  from persisted evidence: 3 releases, versions, status open, created/released
  times, Combie observation time.
- "What changed recently for this Sentry project?" → partially: the 3 newest
  releases with times; what code changed in them is not persisted (commits
  explicitly out of scope in Sprint 043).
- "What operational activity happened recently?" → releases only; no
  deploy/workflow/issue context exists for this org.
- "Do you have enough evidence to explain what happened?" → no: nothing links
  the releases to code, deploys, or errors.

### Missing-context classification (observed only)

| Gap | Question attempted | Evidence had | Evidence lacked | Blocked a useful answer? | Family |
| --- | --- | --- | --- | --- | --- |
| Release → code mapping | "what changed in 1.0.1?" | release version/time/status | commits/ref (not persisted by design) | partially | C (GitHub ↔ Sentry) |
| Release → deployment state | "is 1.1.0 deployed/running?" | release metadata | deploy enrichment (deferred by design) | yes | B (deploy enrichment) |
| Release → health | "did 1.0.1 cause errors?" | release metadata | issue/error evidence (out of scope by design) | yes | A (issues/error evidence) |
| Cross-provider chain | "full investigation across GitHub/Vercel/Sentry" | release evidence | any Relationships/edges in this org | yes | C (relationships) |

No evidence that a generic Event abstraction (family D) was needed.

### Sprint 043 findings

| Finding | Severity | Outcome |
| --- | --- | --- |
| No Sprint-043 correctness defects in live run | — | validated: populated/empty/known-empty authority, ordering, times, offline, MCP parity all correct |
| Sync summary omits release-count line on known-empty | nit | by design (`sentry-releases.ts:149`); investigation still shows `authority: empty` |
| `combie version` reports `0.1.0` from repo while release tag is v0.1.1 | nit | pre-existing packaging constant, unrelated to Sprint 043 |
| Codex agent config points at a stale temp `COMBIE_HOME` | nit (environment) | MCP validated via direct stdio; re-run `combie agent setup` to refresh |
| Connected read token cannot create releases (403) | info | expected; read-only scope is the correct product posture |

Decision from this run: **SPRINT 043 VALIDATED LIVE** — connection, discovery
(including a real known-empty org), bounded release refresh, populated and
empty authority classes, offline investigation, and MCP parity all confirmed
on the Sprint-043 build. No defects. The missing-context observations come
from one small test org with no cross-provider edges; they are not sufficient
to rank the next sprint direction.

## Sprint 045 GitHub↔Sentry code-mapping live run — 2026-08-15

| Field | Value |
| --- | --- |
| Date | 2026-08-15 |
| Sprint 045 commit | `87e372afb87582f367d22dc7e67a7b6a246bda3c` |
| Machine / OS | macOS (darwin, arm64) |
| Bun | 1.3.5 |
| Isolated state | `/tmp/combie-045-dogfood` (not the repo `.combie`) |
| GitHub | connected via `--use-gh`; sync stored 312 repositories |
| Sentry CLI connect | **failed** — org auth token returns HTTP 400 on `GET /auth/` (empty body) and 403 on `/users/me/`, `/organizations/`, and `/organizations/{org}/projects/` |
| Sentry live API probe | same authorized token, redacted; org-scoped `repos` and `code-mappings` return **200 `[]`**; org-scoped `releases` still return the 3 Sprint 043 test releases |
| Relationships | 0 (`code_mapped_to` not inferred — no project-scoped mapping rows, and Sentry was not connectable through Combie) |
| Security | token never committed or written into the repo; credentials file mode `0600`; no token in this record |

### What the live probe proved

- [x] GitHub `--use-gh` connect + sync works independently (312 repositories).
- [x] Official `GET /organizations/{org}/code-mappings/` is reachable with this
      org token and returns a truthful known-empty page (`[]`).
- [x] Official `GET /organizations/{org}/repos/` is also known-empty (`[]`).
      There is no Sentry-side GitHub repository identity to join.
- [x] No display-name fallback was used. Empty mappings stay empty.
- [ ] `combie connect sentry --use-env` with this org token — blocked by
      Combie's identity check (`GET /auth/`) and by missing project-list
      permission. Not a Sprint 045 resolver defect.
- [ ] End-to-end `sync` → `relationships` / `investigate` / MCP on a live
      `code_mapped_to` edge — not exercised. This org has no code mappings.

### Missing-context classification (observed only)

| Gap | Evidence had | Evidence lacked | Family |
| --- | --- | --- | --- |
| Combie Sentry connection | authorized org token | `/auth/` + project-list scopes | auth/scope (pre-045) |
| GitHub ↔ Sentry edge | GitHub inventory; empty Sentry mapping list | any project-scoped GitHub mapping | C (known-empty mappings) |

Known-empty mappings on this test org are a successful 045 dogfood outcome,
not a reason to invent a join.

Decision from this run: **SPRINT 045 MAPPING API VALIDATED LIVE;
COMBIE CONNECT NOT VALIDATED WITH THIS TOKEN.** Re-run the full CLI/MCP
path with a Sentry token that can pass `GET /auth/` and list projects
(the Sprint 043 personal-token shape, or an org token with `org:read` /
`project:read`). Do not rotate product behavior to accommodate this
token's missing identity/project scopes.

### Retry with a user token — 2026-08-15 / 2026-08-16

| Field | Value |
| --- | --- |
| Isolated state | `/tmp/combie-045-dogfood` (same dir; GitHub already connected) |
| Sentry connect | `connect sentry --use-env` succeeded (`sgr0691@gmail.com`) |
| Sync | GitHub + Sentry both ok |
| Sentry resources | 1 project `sentry:project:4511917355565056` (`combie-dogfood`) |
| Release / issue | 3 releases recorded; issue refresh known-empty |
| Code mappings | 1 project refreshed; `codeMappings: []`; authority **empty**; resultCount 0 |
| Relationships | `0 GitHub → Sentry code_mapped_to (no deterministic matches)` |
| Changes | 0 |
| Security | user token never committed; credentials file `0600`; no token in this record |

- [x] `connect sentry --use-env` + `providers` show Sentry Connected; no token in output.
- [x] `sync` refreshes releases, issues, and code mappings independently.
- [x] Known-empty mappings do **not** invent a `code_mapped_to` edge.
- [x] `related` on the Sentry project and on a GitHub repository: no one-hop neighbors.
- [x] `investigate` shows RELATED CONTEXT empty, MISSING CONTEXT
      `no_known_relationships` only (does not scare on known-empty mappings),
      no `caused` / `CORRELATED` wording, existing RELEASES/ISSUES unchanged.
- [x] MCP: exactly four tools; `get_related_context` relatedLen 0;
      `investigate_resource` facts/missing match CLI; DB SHA-256 unchanged.

Decision from this retry: **SPRINT 045 CLI+MCP VALIDATED LIVE ON
KNOWN-EMPTY MAPPINGS.** This org still has no Sentry GitHub code mapping,
so a populated `code_mapped_to` edge remains untested live. That is
inventory-empty, not a product defect. Do not create a mapping to force
an edge.
