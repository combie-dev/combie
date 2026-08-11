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
- [ ] `bun run combie --help` prints the full command list (12 commands) and connect options
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
- [ ] Invalid Resource ID format (e.g. `combie history not-an-id`) gives a clear parse error
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
