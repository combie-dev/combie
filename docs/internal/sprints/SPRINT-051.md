# SPRINT-051 — Explicit Investigation Resolution Memory

> **Status:** Complete
> **Depends on:** SPRINT-050 (complete); ROADMAP v0.6 Investigation closed
> at the deterministic milestone
> **Authorized by:** founder override, 2026-08-16 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> honest capture slice. Replaces the unmet Scenario 8 / three-workflow
> dogfood threshold and the AGENTS.md line that closing v0.6 authorizes
> no Sprint 051. Does **not** authorize the rest of v0.7.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **explicit resolution capture + retained resolution memory +
> exact-id retrieval**, not Incident, not separate Decision / Action /
> Outcome models, not Recommendation, not Learning, not similarity
> **Type:** Narrow persistence primitive for human-attributed
> organizational response, hung on an existing saved Investigation
> **Primary goal:** After a saved Investigation, a human can explicitly
> record what they decided, what they actually did, and what happened
> afterward; Combie retains that record and can list it later by that
> Investigation and by the same exact subject Resource — without
> inferring Action from provider activity, without a content-free
> `resolved: true` flag, and without thawing MCP.
> **Provider scope:** None. No new provider reads.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is a Layer Transition

Sprints 048–050 closed ROADMAP v0.6 Investigation at the deterministic
milestone:

```text
048  durable Investigation snapshot
049  compare saved snapshot to current compose
050  subject-scoped Investigation history
```

Shipped loop:

```text
compose → save → reopen → compare → retrieve by subject
```

The engineer then leaves Combie to decide and act. v0.6 remembers what
Combie assembled. It does not remember what the team did with that
knowledge.

`docs/internal/ROADMAP.md` v0.7 Operational Memory is the next layer.
Its product question:

> Can Combie remember not only what happened, but how this engineering
> organization responded and what happened afterward?

Sprint 050 leftover listed persisted Investigation lifecycle first,
only if earned. Compare-to-current did **not** earn it. This Sprint
does **not** take that leftover.

This Sprint starts v0.7 at the smallest honest loop from the 2026-08-16
Operational Memory architecture audit:

```text
Investigation
      ↓
explicit resolution capture
      ↓
retained resolution memory
      ↓
retrieve by investigation / exact subject
```

It is **not** the ROADMAP v0.7 diagram:

```text
Incident → Investigation → Recommendation → Decision → Action → Outcome
```

It is **not** Learning (v0.8), Policy, or Execution (v0.9).

---

# Founder Override

`AGENTS.md` after Sprint 050 recorded that closing deterministic
Investigation authorizes no Sprint 051 and no v0.7 work, and that
`docs/internal/beta/INVESTIGATION-DOGFOOD.md` is the learning
mechanism. Scenario 8 in that protocol is still empty. The written
threshold (three genuine resolution workflows across two sessions) is
unmet.

On 2026-08-16 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction after v0.6 is v0.7
  Operational Memory.
- Evidence determines aggressiveness. Aggressiveness here is: ship the
  smallest capture surface now, and learn field language / attachment
  UX by using it, rather than waiting for a markdown ledger.
- The override replaces the unmet quantitative dogfood gate for
  **starting this slice**. It does not rewrite the dogfood protocol's
  decision rule, and it does not authorize Incident, Recommendation,
  Learning, similarity, Investigation lifecycle, or MCP writes.
- Same pattern as Sprint 042 → 043: the original evidence rule remains
  on record; the founder override chooses the next vertical slice.

`INVESTIGATION-DOGFOOD.md` remains useful. After this Sprint ships,
Scenario 8 can be filled **in product** on real fixes instead of only
as a gap note.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Sequencing Rules (smallest deterministic
version; is persistence necessary; do not start a generic engine):

```text
exact evidence
    ↓
deterministic composition          ← 043–047
    ↓
persist the composition            ← 048
    ↓
compare / retrieve compositions    ← 049–050
    ↓
explicit organizational response   ← this Sprint
    ↓
earned abstraction                 ← not this Sprint
```

ROADMAP v0.7 lists Incident, Decision, Action, Outcome, and
Recommendation as capabilities. Sequencing Rule 3: implement the
smallest deterministic version. Combined **Resolution** storage with
Decision / Action / Outcome as **fields** is that version. Three
durable models, Incident, and Recommendation are later if earned.

---

# Problem

A saved Investigation pins *what Combie assembled at time T*. After
the engineer decides, acts, and sees a result, Combie still holds
only the snapshot and whatever provider activity later syncs.

Provider activity is not the answer. A later Vercel deployment, GitHub
workflow, or quieter Sentry issue does **not** entitle Combie to store
that the human decided to deploy, that the deployment was the
remediation, or that the outcome was success.

Those are three different epistemic claims. They require explicit
human attribution.

Without a capture surface, the next investigation of the same subject
can retrieve prior snapshots (050) but cannot retrieve *what the team
did last time*.

---

# Product Question

> After saving an offline `investigate` snapshot of an exact Resource,
> can a human explicitly record what they decided, what they actually
> did, and what happened afterward; can Combie retain that record as
> organizational response (not provider truth, not Investigation
> lifecycle); and can a human retrieve those records later by that
> Investigation id and by the same exact subject Resource — without
> adding MCP tools, Incident, inferred Actions, or a content-free
> resolved flag?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** is the next layer. v0.6
   Investigation is closed. Optional v0.6 leftovers are not unfinished
   foundation.
2. **Founder override (2026-08-16)** starts v0.7 at this slice rather
   than waiting for Scenario 8 recurrence.
3. **Existing primitive:** 048 already persists `investigations` keyed
   by `subjectResourceId`. That is the anchor. A Resolution hangs on a
   saved Investigation and copies the subject id so retrieval survives
   Resource deletion (049/050 lesson).
4. **Sequencing Rule 9:** persistence **is** necessary for this claim.
   Re-reading provider activity is not organizational response.
5. **Sprint 050 leftover** (lifecycle, live historical pointers,
   hypotheses) remains unearned and is not this Sprint.
6. **Incident** is unnamed in ARCHITECTURE (diagram only). It is not
   required before useful memory exists. Investigation is a sufficient
   first anchor. Do not auto-promote snapshots to incidents.

---

# Exact Capability

```text
saved Investigation (048, unchanged)
        ↓
human records explicit Resolution
  investigationId
  subjectResourceId     copied from the snapshot at record time
  recordedAt            Combie observation time of the record
  decision              free text, optional
  action                free text, optional
  outcome               free text, optional
        ↓
persist Resolution (new table, not a column on investigations)
        ↓
retrieve
  by exact investigationId
  by exact subjectResourceId
        ↓
snapshot row unchanged
graph unchanged
MCP unchanged
```

At least one of `decision`, `action`, `outcome` must be non-empty
after trim. All three may be present. Blank fields are omitted, not
defaulted to `"unknown"`.

Exact command names are **not** pinned here. Phase 1 picks the
smallest CLI that fits existing style. Constraints Phase 1 must obey:

- The verb must record what happened. It must **not** read as
  Investigation lifecycle (`resolved: true`, `open` / `closed`,
  `--resolve` as a status flip).
- Capture is flag/argument text, not an interactive questionnaire
  (this CLI is tested non-interactively; `confirmAction` is the only
  existing prompt).
- Retrieve by investigation and by exact subject must exist. Do not
  require the human to already know every `inv:` id to find prior
  response for a Resource.
- Unfiltered `investigations` and `investigation <id>` without the
  new write flags remain 048/049/050 behavior except for an additive
  distinct Resolution section **if** Phase 1 places read on reopen.
  Known Facts, Missing Context, and compare sections must not absorb
  Resolution text.

Candidates Phase 1 may choose among (or a smaller equivalent):

```text
combie investigation <id> --decision "…" --action "…" --outcome "…"
combie resolution --investigation <id> --decision "…" --action "…" --outcome "…"
```

Do not ship both. Do not add `resolved: true`.

---

# Evidence / Claim Semantics

### KNOWN (about the record)

```text
Combie retained an explicit Resolution for investigation <id>
(subject <subjectResourceId>) recorded at <recordedAt>.
The decision / action / outcome text is what the human supplied.
```

Retrieval lists those retained records. Zero rows for an
investigation or subject is **known-empty**, not Missing Context
about the graph.

### UNKNOWN / stale (required)

The Resolution is **organizational response**, not current provider
authority and not a rewrite of the snapshot.

`recordedAt` is Combie observation time of the record. It is not
provider-native event time.

If the subject Resource is later deleted, Resolution rows for that
`subjectResourceId` remain listable (same survival rule as 050).

If the Investigation snapshot is missing, recording against that id
fails. Do not create a Resolution that points at nothing.

Provider activity that happens after the record is **not** the
Outcome unless the human later records that (out of scope to infer).

### Forbidden

```text
resolved: true
This investigation is closed
Newest Vercel deployment is the Action
Sentry issue count dropped, therefore the Outcome is success
This Resolution is an Incident
This snapshot is now current provider truth
Recording a Resolution creates a Relationship
You should rollback (recommendation)
Similar incidents exist (similarity)
```

Correlation remains not causality. Capture does not add claims 047–050
already forbade.

---

# Architecture

```text
InvestigationRecord (048)          unchanged
        ↓
ResolutionRecord                   new domain/store primitive
  id                               res:<uuid>
  investigationId
  subjectResourceId                copy; not a live FK
  recordedAt
  decision? / action? / outcome?   free text
        ↓
SQLite resolutions table
  CREATE TABLE IF NOT EXISTS; pre-051 DBs upgrade on init()
        ↓
save / list / show CLI
```

Ownership:

- **Domain:** smallest `Resolution` / `ResolutionRecord` type. Not
  Incident, not Decision/Action/Outcome as separate types, not
  MemoryEngine, not Investigation status.
- **Store:** new table, upgrade-safe. Not mixed into `investigations`
  snapshot JSON. Not columns `status` / `resolved` on investigations.
- **App:** record / list / get / format. Compose stays in
  `investigate.ts`. Snapshot load stays in `investigations.ts`.
  Compare stays in `compare-investigation.ts` and must ignore
  Resolution rows.
- **CLI:** Phase 1 pins. Least new surface that satisfies capture +
  retrieve-by-investigation + retrieve-by-subject.
- **MCP:** no new tool. `investigate_resource` stays live compose and
  must not gain Resolution fields in this Sprint.

Adapters do not participate.

Decision, Action, and Outcome remain **distinguishable meanings** as
fields. They must not be concatenated into one undifferentiated blob
if the human supplied them separately. They must not become three
tables in this Sprint.

---

# Persistence vs Read-Time

| Saved investigation | Resolution | Live `investigate` |
| --- | --- | --- |
| Persisted snapshot | Persisted organizational response | Read-time compose |
| Frozen at `composedAt` | Frozen at `recordedAt` | Changes when store changes |
| Retained composition | Human-attributed sequel | Current local authority |

Recording must **not**:

- rewrite snapshot JSON or `composedAt`
- insert a new investigation row
- set Investigation lifecycle status
- create or delete Relationships
- write Changes
- refresh providers
- update resources
- copy provider activity rows in as the Action
- auto-save a current compose

Compare (`--compare`) remains 049: snapshot vs live compose. It does
not diff Resolutions.

---

# Boundedness

- One Sprint: capture + retain + exact-id retrieve.
- Append-only. Multiple Resolutions per Investigation are allowed
  (tried X, then Y). Do not overwrite. Do not add supersedes.
- Filter is exact `investigationId` or exact `subjectResourceId`.
  No prefix match, no name search, no similarity, no embeddings.
- Order: `recordedAt` DESC, `id` DESC (match 048 list discipline).
- List rows are summaries (id, investigationId, subjectResourceId,
  recordedAt). Full decision/action/outcome belong on show.
- No fact-budget involvement (`MAX_INVESTIGATION_FACTS` stays 5).
- No extra hop. No provider calls.
- No evidence-id columns (deployment id, issue id, SHA). Free text
  may mention them; Combie does not join them in this Sprint.
- No outcome enum. Language is discovered in use.

---

# Failure / Unknown Semantics

- Uninitialized store: same as other write/read commands.
- Missing / unknown investigation id on record: error; say how to
  list investigations; do not create an orphan Resolution.
- All of decision/action/outcome blank or whitespace: error; say that
  at least one is required; do not insert `resolved: true`.
- Subject Resource missing, Investigation still present: recording
  still succeeds (subject id is copied from the snapshot). Listing by
  that subject id still returns the row.
- Zero Resolutions for an investigation or subject: known-empty, exit
  0, distinct copy from global empty if a global list exists.
- Corrupt Resolution row: error that the row is untrusted; do not
  invent decision/action/outcome text.
- `--compare` and `--save` behavior unchanged.

---

# Affected Surfaces

### CLI

Phase 1 pins names. Help lists capture and retrieve. Examples use
non-secret fixture-shaped ids.

### MCP

Unchanged four tools. Do not add `record_resolution`,
`list_resolutions`, or Resolution fields on `investigate_resource`.

### Graph / sync

Unchanged.

### Live investigate

Unchanged. Do not embed prior Resolutions into current compose
(that is live historical pointers; 050 deferred it).

### Learning / recommendation

None. Listing prior Resolutions is not ranking and not “you should.”

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
ARCHITECTURE Decision / Action / Outcome / Investigation sections
(note: no Incident section), this Sprint, `AGENTS.md`,
`docs/internal/beta/INVESTIGATION-DOGFOOD.md` Scenario 8, and inspect:

- `src/domain/investigation.ts`
- `src/app/investigations.ts`
- `src/storage/store.ts` `investigations` table and upgrade patterns
- `src/cli/index.ts` `investigation` / `investigations` commands
- MCP tool list (must remain four)

Report:

1. Can Resolution be a new table + domain type without touching
   snapshot JSON?
2. CLI shape with least new surface that still retrieves by subject.
3. How reopen/list distinguish Resolution from retained composition.
4. One-vs-many per Investigation (expected: many, append-only).
5. Required fields (expected: ≥1 of decision/action/outcome).
6. Is Incident earned? Expected: **no**.
7. Are separate Decision/Action/Outcome types earned? Expected: **no**.
8. Is Investigation lifecycle earned? Expected: **no**.
9. Is MCP write earned? Expected: **no**.
10. Does ROADMAP’s missing `Resolution` noun conflict with storing
    one combined record? Expected: **report; do not create three
    tables to match the diagram.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **yes**.
2. Second source of truth? Resolution must be labeled organizational
   response; never current graph authority; never a snapshot rewrite.
3. Does ARCHITECTURE Investigation yaml `status` / recommendation
   leak onto the snapshot? **No.**
4. Does Incident leak? **No.** Do not name the table or CLI
   `incidents`.
5. Do three Decision/Action/Outcome tables leak? **No.** Fields only.
6. MCP tool needed? Expected: **no**.
7. Live-investigate historical Resolutions? Expected: **no**.
8. Evidence-id joins to deployments/issues? Expected: **no**.
9. Canon change? Expected: AGENTS.md operational baseline only.
   VISION / ARCHITECTURE / ROADMAP / SKILL unchanged. Do not edit
   ROADMAP to add a Resolution heading or to justify an Engine.

If implementation is tempted to add Investigation `status`, infer
Action from newest provider activity, or introduce MemoryEngine /
RecommendationEngine: **STOP**.

---

# Tests

Red → Green → Refactor. No live credentials.

- record against a saved snapshot persists one row; snapshot reopen
  body (048) is unchanged aside from any additive distinct Resolution
  section Phase 1 chose
- at least one of decision/action/outcome required; all-blank fails
  and inserts nothing
- action omitted, decision+outcome present: allowed
- append-only: two records on one investigation both list; neither
  overwrites
- list by investigation returns only that investigation’s rows
- list by exact `subjectResourceId` returns matching rows
- mixed subjects: order inside the filter is `recordedAt` DESC,
  `id` DESC
- after subject Resource deletion, subject-filtered list still
  returns the rows (not `RESOURCE_NOT_FOUND`)
- unknown investigation id: error, no insert
- record does not insert Changes, Relationships, or extra
  investigations; does not rewrite snapshot JSON
- `--compare` ignores Resolution rows (049 regression)
- unfiltered `investigations` unchanged (050 regression)
- MCP still exactly four tools; `investigate_resource` payload
  unchanged; read-only DB regression
- pre-051 DB upgrade: missing resolutions table lists empty

---

# Live Dogfood

Use real engineering resolutions when available (`COMBIE_HOME` /
`--dir`). Never commit secrets or private resource names.

```text
investigate <id> --save
# fix the problem normally (outside Combie execution)
# record decision / action / outcome in the human's words
# list by investigation and by subject
# reopen the snapshot — composition unchanged; response distinct
```

Do not infer Action from a post-fix `sync`. If nothing was actually
decided, do not fabricate a Resolution to fill a test. Fixture tests
cover the mechanics; dogfood covers whether the CLI feels like
“record what happened.”

After ship, Scenario 8 in `INVESTIGATION-DOGFOOD.md` can cite these
in-product records (redacted). Filling the ledger is not a Sprint 051
implementation requirement.

---

# Explicit Non-Goals

Do **not** implement:

- Incident model, incident linking, incident retrieval
- separate Decision, Action, or Outcome tables/types
- Recommendation model or “you should”
- Learning, ranking, success scoring, embeddings, similarity
- Investigation lifecycle (`open` / `closed` / `completed`,
  `resolved: true`, trigger types)
- InvestigationEngine, MemoryEngine, RecommendationEngine,
  LearningEngine
- hypotheses, confidence, findings, summaries-as-ranking
- inferring Action or Outcome from provider activity, compare
  CURRENT ONLY, or authority clocks
- evidence-id foreign keys to deployments, workflows, releases,
  issues, or SHAs
- embedding Resolutions into live `investigate` / MCP
  `investigate_resource`
- ContextPack / fact-budget redesign
- Sentry release-deploy N+1
- new Relationship or multi-hop
- new MCP tools (read or write)
- auto-save, background sync, webhooks
- policy, execution, hosted Combie
- model reasoning

Do not scaffold these.

Do not collapse Investigation and Resolution into one row.
Investigation remains retained composition. Resolution remains
organizational response.

Decision, Action, and Outcome stay distinguishable **fields**.
That is not permission to pretend Canon’s later split was
implemented.

---

# What This Sprint Leaves for Later

```text
043–047   v0.5 evidence + exact shared-commit + correspondence     ✅
048       durable Investigation snapshot                           ✅
049       compare saved snapshot to current compose                ✅
050       subject-scoped Investigation history                     ✅
051       explicit Resolution on a saved Investigation             ← this
052+      optional evidence-id attribution (“deployment abc was
          the fix”) only if earned
          Resource-anchored Resolution (no Investigation) only if
          dogfood attachment answers demand it
          Incident grouping only if one occurrence spans multiple
          investigations
          live-investigate historical Resolutions only if earned
          MCP read of snapshots / resolutions only if earned
          Investigation lifecycle only if earned
          separate Decision/Action/Outcome objects only if
          recommendations, execution, or scoring exist
          similarity / recommendation / learning (v0.8)
          policy / execution (v0.9)
```

---

# Product / Contract Freezes

- MCP: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource`
- Relationship kinds unchanged
- one-hop live investigate unchanged (no Resolution section)
- 048 snapshot schema and 049 compare semantics unchanged
- 050 `investigations --resource` remains snapshot summaries, not
  Resolutions (unless Phase 1 proves a single list is smaller *and*
  still distinguishes the two kinds — expected: keep them distinct)
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- no generic Event abstraction
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP to add
  Resolution as a new Canon heading or to justify an Engine

---

# Migration / Upgrade

New `resolutions` table (name may be `investigation_resolutions` if
Phase 1 prefers; pin one). `CREATE TABLE IF NOT EXISTS` plus the
existing `init()` upgrade path. Pre-051 DBs grow the table on next
write `init()`. Read of a missing table is empty (same `sqlite_master`
probe pattern as 048 investigations if needed).

If implementation is tempted to add `status` on `investigations`:
**STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 051 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: explicit Resolution capture on a saved Investigation
- [x] if earned: retrieve by investigation id and by exact subject id;
      subject deletion does not hide rows
- [x] if earned: decision/action/outcome remain distinct fields;
      ≥1 required; no `resolved: true`; no inferred Action
- [x] if earned: no Incident; no separate D/A/O types; no lifecycle
      status; MCP still four tools; snapshot schema unchanged
- [x] if not earned: rejection documented; do not invent an Engine or
      Incident
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline

---

# Final Principle

> **`docs/internal/ROADMAP.md` v0.7 begins by remembering what people
> decided, did, and observed afterward. Sprint 051 may retain that
> explicit response on a saved Investigation. It must not infer what
> happened, close the investigation, or recommend the next action.**

---

# Completion Notes

## Baseline (2026-08-16)

```text
HEAD:          5d08bd404d9951e6cb2c62e5584b3a5f21ee5560
tests:         872 pass across 76 files
typecheck:     clean
worktree:      clean
MCP:           exactly four read-only tools
Sprint 050:    Complete
Sprint 051:    Active
```

## Repository Understanding

1. **New table, no snapshot rewrite.** `investigations.snapshot_json` stays
   048. Resolution is a sibling table + `ResolutionRecord` (`res:` id).
2. **CLI shape.** 048-parallel noun: `resolution --investigation <id>
   --decision/--action/--outcome` to record; `resolution <res-id>` to show;
   `resolutions [--investigation|--resource]` to list. Investigation reopen
   remains 048-identical (no Resolution section) so retrieve-by-investigation
   is the list command, not a lifecycle status on the snapshot.
3. **Distinguish composition from response.** Snapshot banner vs RESOLUTION
   banner ("organizational response", "not current provider truth"). List
   columns are ID / INVESTIGATION / SUBJECT / RECORDED AT — no decision text.
4. **Many, append-only.** Two records on one investigation both list;
   `recordedAt` DESC, `id` DESC.
5. **≥1 of decision/action/outcome** after trim. Whitespace-only is omitted.
   No `"unknown"` default. No `resolved: true`.
6. **Incident.** Not earned.
7. **Separate Decision/Action/Outcome types.** Not earned; fields only.
8. **Investigation lifecycle.** Not earned.
9. **MCP write.** Not earned. Four tools unchanged.
10. **ROADMAP noun.** `Resolution` is not a ROADMAP heading. Combined storage
    is the smallest version of Decision/Action/Outcome. Do not create three
    tables to match the diagram. ROADMAP/VISION/ARCHITECTURE/SKILL unchanged.

## Architecture Pressure

1. Persistence is required for organizational response; provider activity
   is not the Action.
2. Resolution is labeled retained organizational response, never current
   graph authority, never a snapshot rewrite.
3. No `status` / recommendation leakage onto `investigations`.
4. No Incident vocabulary in table, CLI, or formatter.
5. No Decision/Action/Outcome tables.
6. No MCP tool.
7. No live-investigate Resolution section.
8. No evidence-id joins.
9. Canon: AGENTS.md operational baseline only.

## Implemented

- `src/domain/resolution.ts` — `ResolutionRecord`, `res:` id
- `Store`: `resolutions` table (`CREATE TABLE IF NOT EXISTS`), insert /
  list / get; missing table lists empty; write `init()` upgrades pre-051 DBs
- `src/app/resolutions.ts` — record / list / get / format; copies
  `subjectResourceId` from the snapshot; requires ≥1 field
- CLI: `resolution`, `resolutions`, `--decision` / `--action` / `--outcome` /
  `--investigation`; help examples
- Compare ignores Resolution rows; investigation reopen unchanged

## Deviations

- None on product semantics. CLI uses a new `resolution`/`resolutions`
  pair rather than flags on `investigation <id>` so `--compare` / reopen
  stay read-only and 048 output stays byte-stable.

## Validation

```text
bun test:          886 pass across 77 files (was 872 / 76)
bun run typecheck: clean
git diff --check:  clean
MCP tools:         get_related_context, investigate_resource,
                   list_providers, list_resources
live (isolated):   investigate --save → resolution --decision/--action/
                   --outcome → resolutions --investigation / --resource
                   → resolution <id> show; snapshot reopen unchanged
```

## Learnings

- Checking fields before Investigation lookup lets a missing-text error
  surface even against a fake `inv:` id — useful for CLI usage tests.
- `listResolutionSummaries` needs the same `sqlite_master` probe as 048
  because `isInitialized()` is read-only and does not migrate.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md baseline
becomes Sprints 001–051 complete. Sprint 052 is not started.
