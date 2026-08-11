# Closed-Beta Release Note — Sprint 041

Date: 2026-08-11

Package version: `0.1.0`

Release commit: recorded in the invitation after the Sprint 041 commit exists

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

- [ ] Publish or grant access to a repository and insert its URL plus the final
  Sprint 041 SHA into every invitation.
- [ ] Add owner-approved license/beta-use terms, or explicitly grant beta-use
  permission in the invitation.
- [ ] Complete one fresh live GitHub connect/sync using the public quickstart.
- [ ] Complete one GitHub + Vercel live run, or explicitly narrow the cohort
  and invitation promise to a validated provider configuration.
- [ ] Complete one natural-language Codex or Cursor MCP call against the final
  release commit and record the result in `DOGFOOD.md`.
- [ ] Re-run `bun test`, `bun run typecheck`, secret scan, and clean-checkout
  install verification at the final SHA.

Until these boxes have real evidence, Sprint 042 invitations are blocked.

## Rollback

If a release blocker appears, stop sending invitations and tell current
testers to stop at the pinned SHA. Preserve their state directory for diagnosis
unless credential exposure is suspected; in that case rotate the affected
credential and remove the state directory. Fix the blocker in a new reviewed
commit and issue a new pinned SHA. There is no auto-update or remote service to
roll back.
