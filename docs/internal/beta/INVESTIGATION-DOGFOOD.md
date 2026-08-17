# INVESTIGATION-DOGFOOD.md — Post-Sprint-050 Investigation Dogfood Protocol (internal)

For Combie maintainers only. Purpose: exercise the complete deterministic
Investigation workflow (compose → save → reopen → compare → retrieve by subject)
against real engineering questions, and record repeated friction as a learning
protocol and evidence ledger. This is **not** Sprint 051 and does not authorize
one.

Baseline: Sprints 001–050 complete; no active Sprint; HEAD `2cb724a`;
ROADMAP v0.6 Investigation is closed at the deterministic milestone.
Shipped loop: `investigate`, `investigate --save`, `investigations`,
`investigations --resource <id>`, `investigation <id>`,
`investigation <id> --compare`. Operational Memory (v0.7) has not started.
Sprint 051 stays unauthorized until the evidence threshold in "Decision
rule for proposing Sprint 051" is met and maintainers explicitly decide.
One observation is never roadmap authorization.

Intentional next activity: run Scenario 8 on real engineering resolutions.
Do not author Sprint 051, and do not sit idle on architecture. Use Combie
(CLI and/or the four-tool agent integration) through genuine investigation
→ fix → record cycles. Normal engineering problems count (CI failure,
provider sync failure, Sentry error, deployment regression, configuration
mistake, broken integration). Do not manufacture outages or diffs.

## Hard boundaries

- Do not modify product code. No edits under `src/`, `tests/`, or `package.json`.
- Do not create `SPRINT-051.md` or any sprint document.
- Do not change `VISION.md`, `ARCHITECTURE.md`, `ROADMAP.md`, or `SKILL.md`.
- Do not declare, scope, or implement a next feature. Do not start Operational
  Memory (Decision / Action / Outcome models).
- The only permitted output of this protocol is this document and its appended
  per-run records.
- Isolated state: use a dedicated `COMBIE_HOME` / `--dir` per run. Never commit
  secrets or private resource names; redact output before appending to the
  Findings log.

## Rule of honesty

- Record what actually happened. Never manufacture results.
- Do not manufacture product behavior merely to create a diff. If provider or
  local-store state did not change between runs, record that and the reason
  (e.g. "no new deployment shipped").
- Do not fabricate an engineering problem to fill a scenario. Use only real
  questions that came up while working on real infrastructure.
- If live credentials or a needed Relationship are unavailable, record the
  exact deferral and the exact missing prerequisite. Do not mark the run
  complete.
- Every observation requires all ten ledger fields. An observation without a
  candidate bucket and severity is not recorded.
- Fixing a small doc/help defect discovered while dogfooding is allowed only if
  it is a beta-blocking defect and is recorded as a Deviation here. Anything
  larger becomes follow-up work; it is not authorized by this protocol.

## How to run

1. Pick one or more scenarios (1–8). Scenarios can share state within a run
   (same `--dir`); do not reuse state across runs if the ledger will conflate
   them.
2. Run each command listed, then tick the box and fill the Record line.
3. For every friction event, fill one Observation entry in the Findings log
   using the ten-field template in "Observation record".
4. After all scenarios, fill the per-run capture table, update the recurrence
   counts for any bucket touched, and write the run Decision line.
5. Before closing the run, complete the Canon confirmation checklist.

---

## Per-run capture fields

| Field | Value |
|-------|-------|
| Date | |
| Commit SHA | |
| Machine / OS | |
| Bun version (`bun --version`) | |
| `COMBIE_HOME` / `--dir` used | |
| Providers connected | |
| Resources discovered (count + kinds) | |
| Relationships present (kinds + count) | |
| Subjects investigated (resource ids) | |
| Snapshots saved / reopened / compared | |
| Agent backend tested (Codex / Claude / Cursor / none) | |
| State changed naturally between runs? (what, how) | |
| Setup friction | |
| Sync friction | |
| Investigation friction (per bucket A–H counts) | |
| Security observations | |

Record:

---

## Scenario 1 — Current investigation

Goal: verify `investigate` answers the three working questions — what changed /
what is known / what is missing — for a real Resource.

Pick one real Resource per run, prefer one with provider activity (e.g. a
Sentry `project` with releases/issues, a Vercel `project` with deployments, a
GitHub `repository` with workflow runs).

Checklist:
- [ ] `bun run combie investigate <resource-id>` completes for the chosen subject
- [ ] Output contains known facts, missing context, provider activity, and a timeline
- [ ] As an engineer, I can answer "what changed recently" from the output alone
- [ ] As an engineer, I can answer "what is known about this subject" from the output alone
- [ ] As an engineer, I can answer "what is missing / where to look next" from the output alone
- [ ] I did not need a second command or the provider dashboard to answer any of the three
- [ ] State the real engineering question the output was used for

Record: (the question, the subject, which of the three questions the output
answered unaided, which required extra work, any confusing section)

---

## Scenario 2 — Cross-provider context

Goal: verify deterministic Relationship context (`source_for`, `uses_domain_in`,
`code_mapped_to`) is understandable and useful in investigate output.

Use a subject that holds a Relationship when available (e.g. GitHub repository
→ Vercel project via `source_for`; GitHub repository → Sentry project via
`code_mapped_to`). If no Relationship exists in the current state, record the
deferral — do not fabricate one.

Checklist:
- [ ] Subject chosen is one side of a real Relationship, or deferral recorded
- [ ] `investigate` shows the related neighbor Resources and relationship kind
- [ ] Related provider evidence (e.g. Sentry releases/issues, Vercel deployments) is understandable without the provider UI
- [ ] Evidence is labeled by source provider and mechanism
- [ ] Nothing in the related sections reads as speculative or unsupported
- [ ] A human could plan a next action (open Sentry issue, check Vercel deploy) from the output

Record: (relationship kinds observed, whether related evidence was actually
useful for the question, any place the output demanded provider knowledge to
interpret)

---

## Scenario 3 — Save

Goal: verify `investigate --save` retains a usable snapshot and record why a
human would want to keep it.

Checklist:
- [ ] `bun run combie investigate <resource-id> --save` prints the snapshot id
- [ ] `bun run combie investigations` lists the snapshot
- [ ] `bun run combie investigation <id>` reopens it with the "not current provider truth" banner
- [ ] Reopened output matches the saved composition (same facts/missing/relationships)
- [ ] I can articulate the reason I would retain this snapshot (e.g. "freeze the state before I change X", "leave a breadcrumb for later")
- [ ] Saving required no extra steps I would not repeat

Record: (snapshot id prefix only, the retention reason in the engineer's own
words, any friction in the save/reopen flow)

---

## Scenario 4 — Change

Goal: allow real provider or local-store state to evolve and observe it. Do
**not** manufacture product behavior to create a diff (no artificial resource
mutation, no fabricated sync).

Checklist:
- [ ] Re-run `sync` after real activity occurred (a deployment, a workflow run, a release, a merged PR) — or deferral recorded
- [ ] `bun run combie changes` reflects the real change, or absence recorded honestly
- [ ] `bun run combie history <resource-id>` shows the change, or absence recorded honestly
- [ ] No step in this scenario fabricated state solely to produce a diff
- [ ] If nothing changed naturally, the deferral is recorded with the reason

Record: (what actually changed and via which provider, what `changes`/`history`
showed, or the exact deferral)

---

## Scenario 5 — Compare

Goal: verify `investigation <id> --compare` explains what changed between a
retained snapshot and the live compose of the same subject.

Checklist:
- [ ] `bun run combie investigation <id> --compare` runs against the snapshot saved in Scenario 3
- [ ] Output is bounded to SAME / SNAPSHOT ONLY / CURRENT ONLY / AUTHORITY CLOCK per section
- [ ] The diff maps to the real state evolution recorded in Scenario 4 (or is honestly empty)
- [ ] A human can explain "what changed" from the compare output alone
- [ ] `--compare` did not rewrite the snapshot; reopening without `--compare` still shows the original
- [ ] A `subject_missing` subject reports as a status (exit 0), not a failure — if exercised

Record: (which sections differed, whether the compare told the story of the
real change, anything the compare hid or overstated)

---

## Scenario 6 — Historical retrieval

Goal: verify `investigations --resource <id>` retrieves prior snapshots for one
exact subject, and judge whether that is sufficient without embedding history
in live `investigate`.

Checklist:
- [ ] `bun run combie investigations --resource <resource-id>` lists only that subject's snapshots
- [ ] Ordering is `composedAt` DESC, `id` DESC
- [ ] A subject with zero snapshots prints the known-empty copy (exit 0)
- [ ] Filtering survives the subject Resource being deleted (if exercised)
- [ ] After retrieval, I could locate the snapshot I wanted without leaving the CLI
- [ ] Record whether "history only on demand" (not embedded in live investigate) was sufficient for the question

Record: (counts per subject, whether the split between live compose and
retained history felt natural, any moment I wanted history surfaced inside
`investigate` itself — bucket C or B if it recurs)

---

## Scenario 7 — Agent workflow

Goal: test the existing four-tool MCP contract (`list_resources`,
`list_providers`, `get_related_context`, `investigate_resource`) by asking a
real agent (Codex / Claude / Cursor) to investigate real Resources. Record
repeated friction caused by agents having only live compose and no historical
access.

Checklist:
- [ ] `bun run combie agent setup <codex|claude|cursor>` produces working config, or deferral recorded
- [ ] Agent can list resources and pick a subject from `list_resources`
- [ ] Agent composes an investigation for a real subject with `investigate_resource`
- [ ] Agent interprets known facts / missing context / related context sensibly (record its summary)
- [ ] Agent asked for or needed something the four tools cannot answer (history, comparison, saved snapshots, cross-subject questions)
- [ ] Record any agent-visible friction that repeats across attempts (e.g. cannot see prior snapshots, must re-ask for resource ids, fact budget cuts needed context)

Record: (backend tested, the question asked, the tool sequence the agent
chose, each capability gap observed, whether the agent left Combie to answer)

---

## Scenario 8 — Resolution workflow

Goal: after a real engineering problem has been investigated **and resolved**,
record what Combie fails to retain about the resolution. Observation only — do
not implement Operational Memory. This scenario is the evidence that would
choose capture shape and memory anchor for a possible first v0.7 primitive.
It does not authorize that primitive.

Checklist:
- [ ] A real problem was investigated with Combie earlier in this run or a prior one
- [ ] The problem is now resolved (decision made, action taken, outcome known)
- [ ] I can state what Combie still holds about this problem (snapshots, facts, evidence)
- [ ] I can state what Combie does NOT hold: the decision, the action, the outcome
- [ ] The gap between "what Combie knows" and "what resolved it" is recorded verbatim
- [ ] No Decision / Action / Outcome model or Incident object was created to close the gap

Record the four capture questions in the engineer's own words. Do **not**
infer the Action from provider activity Combie already retains. A later
GitHub workflow, Vercel deployment, or quieter Sentry issue is not
automatically the remediation or the outcome.

1. **What did you decide?**
2. **What did you actually do?** The human action — not what GitHub / Vercel /
   Sentry happened to observe.
3. **What happened afterward?** Worked, didn't work, mixed, unknown — or
   whatever language feels natural.
4. **Where would you naturally attach this?** The saved investigation, the
   Resource, or something you mentally think of as "the incident."

Question 4 is required. It is the evidence that chooses the memory anchor
(`Investigation → Resolution` vs `Resource → Resolution` vs later
`Incident → Investigation + Resolution`). Do not decide the anchor from a
diagram. A content-free `resolved: true` checkbox would not satisfy this
scenario: it would create a process claim while teaching almost nothing.

---

## Friction taxonomy

Classify every observation into exactly one bucket. A bucket is a **candidate
area of future work**, never an authorization.

| Bucket | Name | Definition |
|--------|------|------------|
| A | Investigation lifecycle | Friction wanting open/closed/completed status, trigger types, or workflow state on snapshots |
| B | Live historical pointers | Friction wanting history/prior snapshots surfaced inside live `investigate` or `investigate_resource` |
| C | Agent historical retrieval | Friction from agents (MCP) lacking access to saved snapshots, compare, or subject history |
| D | Context/fact ranking or budgeting | Friction with the fixed fact budget (`MAX_INVESTIGATION_FACTS = 5`) or ordering/selection of what compose includes |
| E | Hypotheses / confidence / summaries | Friction wanting Combie to interpret, rank, summarize, or attach confidence/hypotheses to evidence |
| F | Additional provider evidence | Friction from missing provider evidence families (deploy↔release, release↔issue, telemetry, N+1 detail) |
| G | Operational Memory: Decision / Action / Outcome | Friction wanting retention of what was decided, done, and resulted after resolution |
| H | Other | Anything not fitting A–G; name it explicitly when used |

Assignment rules:
- Classify the *missing capability*, not the surface symptom.
- If a single event touches two buckets, record two observations (one per
  bucket) with the same question and subject, and note the linkage.
- Do not treat classification as scoping. Buckets exist to count recurrence
  only.

## Observation record

Every Findings log entry must fill all ten fields:

| # | Field | Meaning |
|---|-------|---------|
| 1 | Engineering question | The real question being asked |
| 2 | Subject Resource | Exact `resource-id` (redacted if private) |
| 3 | Workflow | `human` or `agent` (+ backend) |
| 4 | What Combie answered | The useful part of the response |
| 5 | What Combie could not answer | The gap |
| 6 | Left Combie? | `yes` / `no` — did the gap force leaving the CLI/agent tools? |
| 7 | Workaround used | What was done instead (dashboard, notes, memory, manual diff) |
| 8 | Candidate bucket | A–H |
| 9 | Severity | `blocker` / `major` / `minor` / `nit` |
| 10 | Recurrence count | Total distinct observations (this run + prior runs) sharing bucket + capability |

Severity meanings: `blocker` = the Investigation loop is unusable for the
question; `major` = the loop works but the answer is materially incomplete or
misleading; `minor` = the answer needed extra effort to interpret; `nit` =
cosmetic or convenience.

Recurrence counting: increment the count only when the *same capability* gap
reappears in a distinct observation (different question, subject, or run).
Counting is per bucket+capability, not per run.

---

## Findings log

Append per run, newest last. One entry per observation using the ten fields;
link entries to the scenario and run date.

| Run | Date | Scenario | Question (redacted) | Subject (redacted) | Workflow | Combie answered | Combie could not answer | Left Combie? | Workaround | Bucket | Severity | Recurrence |
|-----|------|----------|----------------------|---------------------|----------|-----------------|--------------------------|--------------|------------|--------|----------|------------|
| | | | | | | | | | | | | |

Run Decision line (per run, after the table):
Decision from this run: **<GO / CONDITIONAL GO / NO-GO — with one-sentence basis>**.
Sprint 051 is **not** proposed or authorized by this decision.

---

## Decision rule for proposing Sprint 051

This protocol only produces evidence. Sprint 051 may be **proposed** — by
maintainers, outside this document — when either condition is met:

1. **Repeated friction:** the same bucket + capability gap recurs across
   multiple real investigations — defined as at least three distinct
   observations (different questions or subjects, spanning at least two
   sessions) in the same bucket, at `major` severity or above, with no
   workaround that made Combie sufficient. Distinct end users are **not**
   required. Three genuine maintainer/dogfood resolution workflows (Scenario
   8, typically bucket G) across at least two sessions are enough to make a
   founder product decision about capture shape. This stage discovers what
   is worth recording and where it attaches; it does not statistically
   validate market demand; or
2. **Severe blocker:** a single `blocker`-severity observation where the
   missing capability prevents the existing Investigation loop (compose →
   save → reopen → compare → retrieve by subject) from being useful for a real
   question, and no workaround exists within the loop.

Meeting the threshold **proposes** a slice; it does not choose it, and it
does not choose CLI syntax (`--resolve` vs `resolution add` vs other).
Before any Sprint 051 could start, maintainers must still decide scope from
the canonical process (`SKILL.md`), and the slice must stay within what the
ledger evidences — including the four Scenario 8 capture answers and the
observed attachment target. Observations in bucket H, or single-occurrence
buckets, do not meet the threshold on their own. A `resolved: true` process
flag without decision/action/outcome content would not meet it either.

## Canon confirmation checklist

Complete per run before closing. All must hold; a violation stops the run.

- [ ] `git status` shows no product code changes (`src/`, `tests/`, `package.json` untouched)
- [ ] No `SPRINT-051.md` or any new sprint document was created
- [ ] `VISION.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `SKILL.md` are unmodified
- [ ] `AGENTS.md` is unmodified
- [ ] The only new/changed file this run is under `docs/internal/beta/`
- [ ] No Operational Memory (Decision / Action / Outcome) was implemented or declared
- [ ] HEAD unchanged by the run (unless a doc-only commit to `docs/internal/beta/` was explicitly authorized)

---

## What this protocol is not

- Not a Sprint 051 spec, scope, or authorization.
- Not an Investigation Engine, lifecycle, or Operational Memory design.
- Not a substitute for the canonical process in `SKILL.md`.
- Not permission to change product behavior, MCP tools, or the fact budget.

Cross-references: `DOGFOOD.md` (honesty and per-run conventions), `RELEASE.md`
(closed-beta gates), `READINESS.md` (release readiness), sprint docs
`SPRINT-048.md` / `SPRINT-049.md` / `SPRINT-050.md` (shipped Investigation
surface and their explicit non-goals).

*Blank protocol. Keep one canonical instance and append per run. Never treat
appended observations as roadmap authorization.*