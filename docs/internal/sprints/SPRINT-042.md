# SPRINT-042 — Closed Beta: First Users

> **Status:** Complete — closed beta concluded by founder decision; next phase is Provider / Evidence Depth (Sentry operational evidence)
> **Depends on:** SPRINT-041, SPRINT-041A, SPRINT-041B
> **Closed:** 2026-08-15
> **Type:** Product learning / founder-led closed beta
> **Primary goal:** Validate whether real users can reach a useful, grounded
> Combie investigation and use the resulting evidence to select one earned
> post-beta product slice.
> **Product phase:** Closed beta
> **Release under test:** v0.1.1
> **Cohort promise:** GitHub-first
> **Timebox:** 10 business days beginning 2026-08-13; target review 2026-08-26
> **Feature development:** Frozen except for reproduced beta blockers
> **MCP contract:** Frozen at exactly four local read-only tools
> **Execution / internal AI / analytics:** Out of scope

---

# Goal

Run a two-wave beta with at least five suitable testers and determine, from
repeated evidence rather than roadmap speculation, which pressure Combie
should address next.

Sprint 042 succeeds when all of the following are true:

```text
5+ completed installations
3+ successful GitHub first syncs
3+ grounded agent investigations with actionable qualitative feedback
0 unresolved P0 or P1 blockers
1 evidence-backed next-phase decision
```

The sprint does not succeed merely because invitations were sent.

---

# Product Question

> Can a new GitHub-first user install Combie, synchronize real engineering
> context, reach a useful investigation through their existing agent, and
> explain what Combie made easier or what trustworthy context is still missing?

---

# Governing Boundaries

The existing product remains frozen:

- six provider adapters and current Resource kinds
- two deterministic Relationship kinds and their provenance semantics
- retained Change and provider-native evidence semantics
- exact Resource IDs and one-hop context
- local, offline investigation composition
- exactly four MCP tools:
  - `list_resources`
  - `list_providers`
  - `get_related_context`
  - `investigate_resource`
- read-only, non-destructive, idempotent, closed-world MCP annotations
- CLI and MCP non-mutation guarantees
- explicit credential authorization and secret-safe output

Do not add a feature because one tester requests it. Code changes require a
reproduced beta blocker and must be the smallest change that restores the
existing promise.

---

# Baseline

Sprint 042 begins after the v0.1.1 release gate closed:

```text
master: d8d0b5c
public release: v0.1.1
public commit: 1643252bb3e02325534330857617321ec1ca2df
tests at release: 699 pass
MCP: exactly four read-only tools
live validation: GitHub connect/sync + Codex MCP call
security gate: GO
release conditions: closed
worktree at start: clean
```

Preparation for this sprint corrects only active release-facing drift:

- `AGENTS.md` now describes the shipped Sprint 041B baseline and Sprint 042
  freeze rather than the historical Sprint 014 boundary.
- `docs/public/QUICKSTART.md` now identifies v0.1.1 and the validated
  GitHub-first cohort.

No canonical product material changes.

---

# Cohort

Invite 5–15 startup engineers, product engineers, or technical founders who:

- have a real GitHub account with repositories they may inspect
- are comfortable with a local CLI
- use Codex or Cursor; Codex is the primary validated path
- can provide direct qualitative feedback
- understand that Combie is read-only context infrastructure, not automation

The first cohort promise is GitHub-only. Other supported providers may be used
only as explicitly optional exploration and are not required for beta success.
Claude Code remains a recorded compatibility gap, not a promised path.

---

# Two-Wave Rollout

## Wave 1 — Three Testers

Invite exactly three testers first. Give each tester the v0.1.1 installer,
public Quickstart, support through the invitation thread, and the journey below.

Wave 1 exit gate:

```text
at least 2 of 3 complete the end-to-end journey
no unresolved P0 or P1 blocker
no credential or private-state exposure
all observed failures are classified
```

Do not start Wave 2 until this gate passes.

## Wave 2 — Reach Five or More

After the Wave 1 gate passes, invite at least two additional testers. Continue
toward 10–15 only while additional users produce materially new evidence.
Do not scale the cohort merely to increase an invitation count.

---

# Wave 1 Invitation Template

```text
Subject: Combie v0.1.1 closed-beta invitation

You are invited to try Combie, a local-first engineering context layer. This
first beta is GitHub-first and read-only. The goal is to learn whether Combie
helps you and your coding agent reach useful engineering context with less
manual navigation.

Please reserve about 20–30 minutes and use a GitHub account whose repositories
you are authorized to inspect. Codex is the primary validated agent path;
Cursor is also welcome.

Install:
  curl -fsSL https://combie.dev/install | sh
  combie --version

Expected version:
  combie 0.1.1

Then follow:
  https://github.com/combie-dev/combie/blob/main/docs/public/QUICKSTART.md

Reply in this invitation thread with setup questions and sanitized feedback.
Do not send API tokens, Authorization headers, .combie/credentials, an
unredacted database, private repository names, or unredacted logs. If a log
may contain a secret, rotate the secret before sharing anything.

Combie will not modify GitHub or your infrastructure. Provider synchronization
is explicit; agent access is local, offline, and read-only.
```

Use a separate invitation thread per tester so feedback and support remain
attributable without placing private engineering details in the sprint record.

---

# Tester Journey

Each tester attempts this sequence with minimal maintainer intervention:

```bash
curl -fsSL https://combie.dev/install | sh
combie --version
combie init
combie connect github --use-gh
combie sync github
combie providers
combie resources --provider github
combie investigate <exact-github-resource-id>
combie agent status
combie agent setup
```

If the tester does not use GitHub CLI authentication, the documented
`GITHUB_TOKEN` / `GH_TOKEN` flow is acceptable.

The tester then asks their agent:

```text
Use Combie to list the engineering Resources it knows about.

Use Combie to investigate <exact-resource-id>. Separate known facts from
missing context, cite the available provider evidence, and do not claim a root
cause.
```

A grounded agent investigation must:

- invoke Combie through MCP
- identify the exact subject Resource
- distinguish Known Facts from Missing Context
- preserve evidence authority and uncertainty
- avoid unsupported causality or root-cause claims

---

# Evidence to Record

Record one anonymized row per tester. Use tester identifiers such as `W1-T1`;
do not record private names or provider resource identities.

| Tester | Wave | OS/arch | Agent | Install | GitHub sync | Grounded investigation | Time to first useful investigation | Assistance | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W1-T1 | 1 | pending | pending | pending | pending | pending | pending | pending | pending |
| W1-T2 | 1 | pending | pending | pending | pending | pending | pending | pending | pending |
| W1-T3 | 1 | pending | pending | pending | pending | pending | pending | pending | pending |
| W2-T1 | 2 | pending | pending | pending | pending | pending | pending | pending | pending |
| W2-T2 | 2 | pending | pending | pending | pending | pending | pending | pending | pending |

For each tester, capture sanitized answers to:

1. Where did setup require help?
2. Did Resources and exact IDs make sense?
3. Did Known Facts, Missing Context, and authority wording feel trustworthy?
4. Did MCP reduce manual context gathering for a real task?
5. What question could Combie not answer?
6. Which missing relationship, provider evidence, or context selection blocked
   repeat use?
7. What capability did the tester expect next?

Feedback stays in invitation threads during the sprint. Consolidate only
anonymized findings in this document.

Never request or record:

- raw tokens, credentials, or Authorization headers
- `.combie/credentials`
- an unredacted Combie database
- unredacted logs that may contain secrets
- private repository or resource names

If a secret may have been exposed, stop the journey and instruct the tester to
rotate it before any diagnostic sharing.

---

# Failure Classification and Response

## P0 — Stop Invitations

Examples: credential exposure, destructive behavior, state corruption,
security-boundary failure, or an installed binary that cannot perform the
promised journey.

Stop both waves immediately. Reproduce safely, add a failing regression test,
fix the smallest root cause, run the complete release validation, and publish
a new patch release before resuming.

## P1 — Block the Current Wave

Examples: a tester cannot install, connect GitHub, sync, configure a supported
agent, or obtain grounded MCP output using the documented path.

Require a reproducible failure. Fix only the existing promise, cover it with a
regression test, and re-run the affected tester journey. Executable behavior
changes require a patch release.

## P2 — Record for Selection

Examples: confusing copy, excessive output, exact-ID friction, or a missing
context capability that does not prevent the journey.

Record the evidence. Do not implement during Sprint 042 unless repeated impact
reclassifies it as a blocker.

## P3 — Future Roadmap

Examples: new providers, hosted service, models, write tools, execution,
learning, or broad platform work.

Record only when it helps explain user expectations. Do not implement.

---

# Next-Phase Decision Rule

At the sprint review, classify independent tester evidence into three branches:

## Identity / Ontology

Choose this branch when at least three testers cannot recognize or resolve
their engineering system because identity or Relationship semantics are
insufficient.

## v0.5 Context Engine

Choose this branch when the necessary evidence already exists, but at least
three testers repeatedly struggle to select, budget, or assemble the right
task-specific context.

## Provider / Evidence Depth

Choose this branch when at least three testers are blocked by the same missing
provider capability or evidence family.

Break ties in this order:

1. blocker severity
2. number of independent testers affected
3. measured effect on time to useful investigation
4. smallest deterministic vertical slice

If no branch has evidence from at least three independent testers, expand the
cohort within the 15-user limit. Do not select a feature from isolated
requests. Sprint 043 must implement one winning slice only.

---

# Validation

Before Wave 1:

```bash
bun test
bun run typecheck
git diff --check
```

Also verify:

- clean isolated installation resolves to v0.1.1
- initialization creates isolated state
- live GitHub connect/sync succeeds when explicitly authorized credentials are
  available
- resource listing and exact-resource investigation succeed
- MCP discovers exactly four tools
- an MCP investigation leaves the local database unchanged

For every blocker fix:

- reproduce with a failing test before implementation where practical
- run focused tests, then the full suite and typecheck
- repeat the clean installer and representative CLI/MCP journey
- review the complete diff for secrets and scope expansion

---

# Completion Notes

The written cohort and exit thresholds were not fully evidenced in this
repository. The founder closed the sprint on 2026-08-15 by explicit owner
decision. Historical intent, the original decision rule, and the empty
evidence ledger above are preserved. They are not rewritten to appear
satisfied.

## Implemented

- Sprint 042 rollout protocol and evidence ledger created.
- Active release-facing baseline corrected in AGENTS and Quickstart.
- No product capability added during preparation.
- Feature development remained frozen; no reproduced P0 or P1 beta-blocker
  fix was required in this repository.
- Closed-beta invitations were sent and real user feedback was received
  (founder-reported at handoff; see Next-Phase Decision). Anonymized tester
  rows were not consolidated into this ledger.
- The closed-beta decision phase is concluded. Sprint 043 is authorized as
  the single next vertical slice.

## Deviations

- Cohort execution was not recorded in this document. The evidence table
  (`W1-T1` … `W2-T2`) remains pending.
- The written success thresholds (5+ installations, 3+ GitHub first syncs,
  3+ grounded agent investigations with actionable qualitative feedback
  recorded here) are not evidenced in the repository.
- The next-phase branch is selected by founder override, not by the written
  three-independent-tester rule. The original rule is unchanged.

## Validation

Preparation passed on 2026-08-13:

```text
bun test: 699 pass across 59 files
bun run typecheck: clean
git diff --check: clean
published installer: checksum verified, installed v0.1.1 in isolated HOME
installed binary help/version: pass
live GitHub connect: account scope verified through explicit --use-gh
live GitHub sync: 312 repositories, 611 workflow runs
workflow evidence refresh: 176 repositories refreshed, 136 failed with prior
  evidence retained, matching the documented bounded semantics
offline CLI investigation: Known Facts and Missing Context present
installed-binary MCP: exactly four tools; exact subject investigation passed
MCP read-only check: database SHA-256 unchanged after the call
Codex setup: isolated config written and reported configured when detected
```

Repository record at closure (2026-08-15):

```text
HEAD:            f0d1f91
public release:  v0.1.1
tests:           699 pass across 59 files (unchanged product baseline)
typecheck:       clean
MCP:             exactly four read-only tools
evidence ledger: all tester rows still pending
P0 / P1:         none recorded against the closed-beta journey
cohort expansion: not recorded
```

No product source or tests changed to close this sprint.

## Learnings

No anonymized tester quotes, counts, classifications, or next-capability
requests are recorded in this sprint or in `docs/internal/beta/`. Invitation
threads were the designated collection channel; they were not consolidated
here.

What the repository *does* record is maintainer/founder dogfood used to
unblock invitations (Sprint 041B / this sprint's preparation): a live
GitHub-first install, connect, sync, offline investigation, and four-tool
MCP path on v0.1.1. That is not independent-tester evidence.

The founder reports that closed-beta users were invited and that real user
feedback was reviewed before concluding the decision phase. That review is
not reproduced as fabricated ledger rows.

## Next-Phase Decision

### Original decision rule

Unchanged. At sprint review, classify independent tester evidence into one
of three branches — Identity / Ontology, v0.5 Context Engine, or Provider /
Evidence Depth — when at least three independent testers share the same
pressure. If no branch reaches that threshold, expand the cohort. Do not
select a feature from isolated requests.

### Actual observed evidence

The written three-independent-tester threshold is **not** satisfied in the
repository record.

- Wave 1 / Wave 2 ledger rows remain `pending`.
- No independent tester IDs, OS/arch, agent, install, sync, or grounded
  investigation outcomes are recorded here.
- No tester quote requesting Sentry, another evidence family, ontology
  work, or a Context Engine is recorded here.
- Cohort expansion within the 15-user limit is not recorded.
- No unresolved P0 or P1 closed-beta blocker is recorded that should
  prevent closure.
- The August 2026 / Sprint 037 roadmap audit is pre-beta architectural
  context. It is not a substitute for 042 tester evidence and is not the
  authorization source for the next phase.

### Founder decision / override

On 2026-08-15 the product owner recorded this explicit override:

- Sprint 042 closed-beta learning has been reviewed.
- The founder has intentionally concluded the beta decision phase.
- The founder is authorizing the Provider / Evidence Depth branch.
- The selected next slice is Sentry operational evidence.
- This override replaces the unmet quantitative threshold for the purpose
  of choosing the next phase.
- The reason is recorded here rather than retroactively changing the
  evidence ledger or the original decision rule.

Rationale, without inventing tester demand: Combie already persists Vercel
deployments, GitHub workflow runs, and Neon operations. Sentry is a shipped
connected provider whose investigations still have project discovery only.
Sprint 019 ranked Sentry releases as the next Sentry evidence family. The
roadmap's post-beta Provider / Evidence Depth branch is the matching
capability. The founder chooses that branch and that one slice now.

### Selected next branch

```text
Provider / Evidence Depth
```

### Selected implementation slice

```text
Sentry operational evidence (release history)
```

Sprint 043 must implement that one winning slice only. It must not treat
the pre-beta roadmap audit as its authorization source.

## Canon Changes

- `SPRINT-042.md` status changes from Active to Complete.
- `AGENTS.md` current baseline becomes Sprints 001–042 complete; Sprint 043
  is the single active sprint; the Sprint 042 product freeze ends.
- `SPRINT-043.md` is activated as the Sentry release-evidence slice,
  authorized by this handoff.

VISION, ARCHITECTURE, and ROADMAP are unchanged. The four-tool MCP
contract, relationship semantics, Resource kinds, and provider contracts
are unchanged.

---

# Definition of Done

- [x] Sprint 042 active record exists
- [x] rollout is split into two waves
- [x] first-cohort promise is GitHub-only
- [x] sanitized evidence schema exists
- [x] blocker policy exists
- [x] next-phase decision rule exists
- [x] preparation validation passes
- [ ] Wave 1 invites sent to three suitable testers
- [ ] Wave 1 gate passes
- [ ] Wave 2 reaches at least five total testers
- [ ] 5+ installations complete
- [ ] 3+ GitHub first syncs complete
- [ ] 3+ grounded agent investigations complete
- [ ] actionable qualitative feedback recorded
- [x] no unresolved P0 or P1 blocker (none recorded against the closed-beta journey)
- [ ] exactly one next-phase branch selected from repeated evidence
- [x] Sprint 043 proposed as one narrow vertical slice
- [x] completion notes finalized

Closure note (2026-08-15): this sprint is **Complete** by founder decision.
Unchecked cohort and “repeated evidence” items remain historically unmet in
this record. They are not rewritten to appear satisfied. The next-phase
branch is recorded under Completion Notes as a founder override.

---

# Explicitly Out of Scope

- v0.5 Context Engine implementation
- speculative Context Pack abstraction
- new identity or ontology semantics
- additional providers or evidence families
- new MCP tools, schemas, or semantics
- background sync, webhooks, or telemetry ingestion
- internal model reasoning or BYO model support
- operational memory, learning, recommendation, policy, or execution engines
- API, SDK, hosted Combie, remote MCP, dashboards, or in-product analytics
- automated feedback collection

---

# Final Principle

> **Sprint 042 does not build the next feature. It earns the evidence required
> to choose the next feature.**
