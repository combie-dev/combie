# Closed-Beta Release Gate (internal)

Updated 2026-08-11 during Sprint 041. The evidence source is the repository,
not earlier completion claims. Decision: **CONDITIONAL GO**; Sprint 042
invitations remain blocked by the conditions below.

## Gate items

- [x] **README matches the product.** It documents all six providers, the
  repository-only run path, manual sync, exact Relationships, offline
  investigation, and four-tool read-only MCP. The former “No MCP” contradiction
  and `bun link` path are removed.
- [x] **Quickstart matches implementation.** One provider is sufficient;
  GitHub + Vercel is recommended. Credential creation timing, Cloudflare
  all-or-nothing permissions, Sentry organization access, Vercel team scope,
  and offline environment variables are explicit.
- [x] **Credential matrix matches `src/app/connect.ts`.** Authorization remains
  explicit and the credentials file is separate with mode `0600`.
- [x] **Current / NOT YET boundary is clear.** No AI reasoning, root cause,
  background sync, autonomous action, remote MCP, API/SDK, or complete graph is
  promised.
- [x] **Read behavior is non-mutating.** `Store.isInitialized()` now opens the
  database read-only; writes reopen through `init()`. A legacy-database hash and
  table-count regression plus a real stdio protocol test cover the boundary.
- [x] **Credential error redaction covers exact secrets.** Cloudflare, GitHub,
  Vercel, and Sentry now scrub the credential itself in response and network
  errors, including short echoed values.
- [x] **CLI identity and recovery are usable.** `version`/`--version` reports
  `0.1.0`, missing `--dir` fails clearly, recovery commands use the canonical
  `bun run combie` path, and `providers` displays account identity.
- [x] **MCP beta contract is exactly four tools.** Every tool is annotated
  read-only/non-destructive/idempotent/closed-world. `investigate_resource`
  returns Known Facts, Missing Context, provider activity, timeline, and exact
  shared-commit context as documented.
- [x] **Protocol-level MCP validation is real.** The test client discovers
  exactly four tools, calls investigation, verifies the complete structured
  keys, and observes unchanged database bytes.
- [x] **Natural Codex agent execution succeeded.** Codex CLI 0.146.0 under
  `default_tools_approval_mode="writes"` called `list_resources` and
  `investigate_resource` without shell use or provider credentials and produced
  grounded known-versus-missing output from an isolated state directory.
- [x] **Cursor validation level is stated precisely.** Configuration and tool
  discovery were checked on Cursor 3.15.6; no natural-language Cursor call is
  claimed.
- [x] **Claude Code deferral is precise.** Current official stdio syntax is
  documented; the installed executable is broken/non-executable, so no tool
  discovery or call is claimed.
- [x] **Beta audience, learning goals, support, safe bug reporting, rollback,
  known limitations, and release conditions are defined** in `RELEASE.md`.
- [x] **Accessible release artifact is ready.** Published as v0.1.1 on
  `https://github.com/combie-dev/combie` (tag `v0.1.1` → commit
  `1643252bb3e02325534330857617321ec1ca2df`) with three binaries + checksums,
  Apache-2.0 LICENSE and license field committed, owner-approved. Downloaded
  checksums matched; `combie --version` reports `0.1.1`; the binary exposes
  exactly the four MCP tools. Evidence 2026-08-13.
- [x] **Fresh live provider journey is complete on the final build.** The
  installed v0.1.1 binary, in a fresh isolated state, ran
  `connect github --use-gh` (account `sgr0691`) and a live `sync github`:
  312 repositories, 611 workflow runs recorded, second sync stable. Recorded
  in `DOGFOOD.md`. Evidence 2026-08-13.
- [x] **Live multi-provider relationship/shared-commit dogfood is complete.**
  The first cohort and invitation promise are explicitly narrowed to the
  validated GitHub-only configuration; owner-approved. A GitHub + Vercel run
  remains a deferred condition for a later cohort.
- [x] **Release-SHA validation is complete.** Commit
  `da038939e1def0cf3b2888ec973a8ca465955425` passed a clean clone, frozen
  install, help/version/init, 624 tests, typecheck, committed-diff secret scan,
  and a natural Codex prompt that invoked both listing and investigation.
  The v0.1.1 build (`1643252bb3e02325534330857617321ec1ca2df`) additionally
  passed the full suite (699 tests) on all three CI matrix targets and a clean
  installer install with matching published checksums.

## Classified findings

P0 fixed:

- Public README denied the shipped MCP surface.
- Read/MCP paths applied schema migrations.
- Four provider error paths could echo an exact credential.

P1 fixed:

- MCP investigation structured output did not match its documented contract.
- MCP tools lacked read-only annotations, triggering write-style approvals.
- `--dir` without a value silently used the current directory.
- Build version and provider account identity were absent from CLI output.
- Recovery commands and the documented install path disagreed.

P1 accepted as release conditions/limitations:

- No accessible remote, tag, committed license, or beta-use terms in checkout.
- Vercel team scope (`teamId`) is not implemented.
- Cloudflare multi-account selection is implicit and unsafe for that cohort.
- Live GitHub + Vercel dogfood is unavailable without authorized credentials.

P2 deferred:

- No npm package, standalone binary, automated release pipeline, or in-product
  feedback system.
- Cursor natural-agent and Claude Code client execution are unvalidated.

## Decision

**CONDITIONAL GO.** The local product and read-only agent boundary are coherent
enough for a small closed beta, but invitations must not start until the
unchecked conditions above are either completed with evidence or explicitly
narrowed in the invitation. Sprint 042 is therefore **blocked** at this commit.

## Update 2026-08-13 — Sprint 041B / v0.1.1 closure

The previously unchecked gate items (accessible release artifact, fresh live
provider journey, multi-provider dogfood or narrowed cohort) are now closed
with evidence above: v0.1.1 is published with verified artifacts, a fresh live
GitHub connect/sync ran on the installed binary (312 repositories, 611
workflow runs), and the cohort is explicitly narrowed to GitHub-only with
owner approval. The release conditions in `RELEASE.md` are all satisfied.
Sprint 042 is unblocked at commit `1643252bb3e02325534330857617321ec1ca2df`
(public) / `830384e` (master).
