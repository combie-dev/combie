# Closed-Beta Release Note — Sprint 041

Date: 2026-08-11

Package version: `0.1.0`

Release commit: `da038939e1def0cf3b2888ec973a8ca465955425`

Decision: **CONDITIONAL GO**

## Who this beta is for

Invite 5–15 startup engineers whose applications span at least two of
GitHub, Vercel, Cloudflare, Sentry, Neon, and PlanetScale. Prefer people who
already use Codex or Cursor and are comfortable running a local CLI from a
repository checkout. This cohort is for product learning, not production
automation.

## What they receive

The invitation must contain:

1. An accessible repository URL.
2. The exact Sprint 041 release commit SHA.
3. Permission to use the repository for the closed beta (or a committed,
   owner-approved license/terms file).
4. A support contact: reply to the invitation thread.

Install only from the pinned repository commit:

```bash
git clone <repository-url-from-invite>
cd combie
git checkout <release-sha-from-invite>
bun install --frozen-lockfile
bun run combie --version
bun run combie help
```

Combie is private, unpublished, and has no standalone binary. `bun link` is
not part of the beta path because it changes the tracked executable mode in a
clean checkout on the validated Bun version.

## Beta promise

Current:

- Explicitly connect one or more of six supported providers.
- Manually sync normalized Resources and selected provider evidence.
- Inspect deterministic two-kind, one-hop Relationships and Resource Changes.
- Investigate an exact Resource offline through the CLI.
- Give a local MCP client the same context through exactly four read-only
  stdio tools.

Not yet:

- Background or automatic sync, webhooks, or real-time state.
- Complete application graphs, fuzzy lookup, or generic correlation.
- Root-cause analysis, recommendations, internal AI, or autonomous action.
- Remote/hosted MCP, an API/SDK, npm package, or standalone binary.

## Known limitations

- Vercel calls do not pass `teamId`; team-owned projects may be absent. Limit
  the first cohort to a personal-scope project or treat this as an explicit
  test condition.
- Cloudflare authentication selects the first returned account and discovery
  combines account resources with visible zones. Do not enroll multi-account
  Cloudflare users until explicit account selection exists.
- Cloudflare discovery is all-or-nothing when a required endpoint is denied.
- GitHub workflow evidence is bounded to 100 runs; investigation MCP output is
  not paginated.
- Resource lookup uses exact stable IDs and Relationships are one hop.
- State and credentials are local plaintext files protected by directory/file
  permissions (`0700`/`0600`); there is no encryption at rest or keychain.
- Codex and Cursor configuration/tool discovery are validated; a recorded
  natural-language call on the final release build remains a launch condition.
- Claude Code is unvalidated because the executable on the release machine is
  broken/non-executable.
- Live GitHub + Vercel dogfood, including a real `source_for` edge and shared
  commit evidence, is deferred because no valid authorized credentials were
  available during Sprint 041.

## Learning goals

1. Can a new user reach a useful first investigation without maintainer help?
2. Which provider connection or permission step creates the most friction?
3. Do Known Facts, Missing Context, and evidence authority earn trust?
4. Does MCP context improve a real engineering investigation compared with
   isolated provider tools?
5. Which missing relationship or evidence family blocks repeated use?

Success is 5+ installs, 3+ successful first syncs, and at least 3 grounded
agent investigations with actionable qualitative feedback. This is a learning
target, not telemetry built into Combie.

## Feedback and support

Use the invitation thread for setup help and feedback. Ask testers to include:

```text
Combie version: output of `bun run combie --version`
Release SHA: output of `git rev-parse HEAD`
OS / architecture:
Bun version: output of `bun --version`
Command run (redact token arguments):
Expected behavior:
Actual behavior:
Provider involved:
Relevant output with secrets and private names removed:
```

Never request `.combie/credentials`, raw tokens, Authorization headers, or an
unredacted database. If logs may contain a secret, rotate it before sharing.

## Release conditions before invitations

- [x] Publish or grant access to a repository and insert its URL plus the final
  Sprint 041 SHA into every invitation.
  Evidence (2026-08-13): public repo `https://github.com/combie-dev/combie`
  (Apache-2.0), release `v0.1.1` at tag `v0.1.1` → commit
  `1643252bb3e02325534330857617321ec1ca2df`, three binaries plus three
  `.sha256` files; every downloaded checksum matched; `combie --version`
  reports `0.1.1`; the binary exposes exactly the four MCP tools.
- [x] Add owner-approved license/beta-use terms, or explicitly grant beta-use
  permission in the invitation.
  Evidence (2026-08-13): `LICENSE` (Apache-2.0) and package.json
  `"license": "Apache-2.0"` committed in the public repo; owner-approved.
- [x] Complete one fresh live GitHub connect/sync using the public quickstart.
  Evidence (2026-08-13): the installed v0.1.1 binary, fresh isolated state,
  `connect github --use-gh` (account `sgr0691`), `sync github` →
  312 repositories, 611 workflow runs recorded; second sync stable. Full
  record in `DOGFOOD.md`.
- [x] Complete one GitHub + Vercel live run, or explicitly narrow the cohort
  and invitation promise to a validated provider configuration.
  Evidence (2026-08-13): cohort explicitly narrowed to the validated
  GitHub-only configuration; owner-approved. Vercel remains a deferred
  condition for a later cohort.
- [x] Complete one natural-language Codex or Cursor MCP call against the final
  release commit and record the result in `DOGFOOD.md`.
  Evidence (2026-08-13): Codex called `list_resources` through the installed
  v0.1.1 binary against the live dogfood state and reported 312 repositories.
- [x] Re-run `bun test`, `bun run typecheck`, secret scan, and clean-checkout
  install verification at the final SHA.
  Evidence (2026-08-13): the v0.1.1 tag build ran the full suite on all three
  matrix targets (linux-x64, darwin-arm64, darwin-x64) — 699 tests,
  typecheck clean; clean install from `https://combie.dev/install` into an
  isolated HOME produced the exact published binary hash.

All release conditions are closed. Sprint 042 invitations are unblocked at
this commit.

## Rollback

If a release blocker appears, stop sending invitations and tell current
testers to stop at the pinned SHA. Preserve their state directory for diagnosis
unless credential exposure is suspected; in that case rotate the affected
credential and remove the state directory. Fix the blocker in a new reviewed
commit and issue a new pinned SHA. There is no auto-update or remote service to
roll back.

## Closure record — Sprint 041B / v0.1.1 (2026-08-13)

The Sprint 041 note above pinned a repository checkout at `0.1.0`
(`da038939`). Sprint 041B added automatic MCP agent setup and the release was
published as **v0.1.1** through the release pipeline in
`.github/workflows/release.yml`:

- Public release: `https://github.com/combie-dev/combie/releases/tag/v0.1.1`
- Public commit: `1643252bb3e02325534330857617321ec1ca2df`
- Binaries: `combie-darwin-arm64`, `combie-darwin-x64`, `combie-linux-x64`
  (+ `.sha256` each); checksums verified on download.
- The "Not yet" line above ("no standalone binary") is superseded: a
  standalone binary, installer (`install.sh` / `https://combie.dev/install`),
  and tag-triggered release pipeline now exist. The four-tool read-only MCP
  contract is unchanged.
- Distribution defect found and fixed at the release gate: the agent CLI test
  asserted a short-circuit message that only fires when agent executables are
  detected in PATH, so CI hosts (no agents installed) failed the suite. The
  test now uses stub executables in a temp bin dir on PATH
  (fix `830384e`, public `1643252`); 699 tests pass on all matrix targets.
- One deviation: the `v0.1.1` tag was force-updated once to the fixed commit
  before any release object or artifact existed (CI tests had failed on the
  first tag push); no release, artifact, or consumer was affected.
- The v0.1.0 release (2026-08-12, tag → `c18e997`) remains untouched.
