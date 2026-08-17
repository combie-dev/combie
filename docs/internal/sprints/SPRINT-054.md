# SPRINT-054 — Explicit Resolution Evidence References

> **Status:** Complete
> **Depends on:** SPRINT-053 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.7 Operational Memory
> (what evidence supported that decision — smallest deterministic
> version: human-attached exact ids). Sprint 053 leftover list is
> **not** a sequence; inferred attribution from provider activity
> remains unearned and forbidden.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **explicit evidence references on a Resolution**, not inferred
> Action, not Incident, not similarity, not Recommendation, not MCP,
> not snapshot rewrite
> **Type:** Narrow optional persistence on the existing Resolution row
> **Primary goal:** When recording a Resolution, a human can name one
> or more exact evidence identities Combie already retains (deployment,
> workflow run, release, issue, operation) as what they say supported
> that response — without Combie inferring Action from newest
> provider activity, without a content-free evidence flag, and without
> thawing MCP.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 051–053 shipped the smallest honest Operational Memory loop:

```text
051  persist decision / action / outcome on a saved Investigation
052  show those rows on investigate / investigation reopen
053  show the retained field text on those same paths
```

That answers three ROADMAP v0.7 questions on the path already in use:

```text
What did we decide last time?
What action did we take?
Did it work?
```

The fourth question is still unanswered:

```text
What evidence supported that decision?
```

Sprint 053 leftover:

```text
054+      optional evidence-id attribution only if earned
          Resource-anchored Resolution only if earned
          Incident grouping only if earned
          MCP read of snapshots / resolutions only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.

**Inferred** attribution (“newest Vercel deployment is the Action”)
is still unearned and still forbidden. 051–053 repeated that rule
because provider activity already answers what the system did. It
does not prove a human remediating this Investigation.

This Sprint takes a different claim, the smallest deterministic
version of the fourth ROADMAP question:

```text
The human named these exact local evidence ids when they recorded
this Resolution.
```

That is the same epistemic class as `--action`: explicit, optional,
not inferred. It is **not** “Combie noticed a deploy and stored it
as the fix.”

```text
051–053  explicit response text + exact-id recall
054      optional human-attached evidence ids on that response
```

It is **not** similarity, Incident, Recommendation, or MCP.

It is **not** Investigation lifecycle. Naming evidence does not close
the Investigation and does not prove the outcome.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Sequencing Rules (smallest deterministic
version; is persistence necessary; do not start a generic engine):

```text
exact evidence
    ↓
persist organizational response     ← 051
    ↓
recall the answers                  ← 052–053
    ↓
human names supporting evidence     ← this Sprint
    ↓
earned abstraction                  ← not this Sprint
```

Sequencing Rule 9: **persistence is necessary** for this claim. The
051 table does not hold evidence ids. Do not write them into
`snapshot_json`. Do not infer them at read time from deployments.

---

# Problem

After 053, RESOLUTION MEMORY can say:

```text
DECISION
Rollback

ACTION
Reverted deploy

OUTCOME
Errors dropped
```

Combie also already retains, on the same subject, Vercel deployments,
GitHub workflow runs, Sentry releases/issues, Neon operations. None
of that is attached to the Resolution. The human cannot record
“deployment `dpl_abc` is the evidence I mean” without stuffing the
id into Action free text, and Combie cannot later retrieve Resolutions
by that exact evidence id.

ROADMAP v0.7 asks what evidence supported the decision. The honest
first version is: the human points at ids Combie already has.

---

# Product Question

> After Resolution capture and body recall exist, can a human
> optionally attach one or more exact locally retained evidence
> identities when recording a Resolution, and can Combie show those
> references on `resolution <id>` and in RESOLUTION MEMORY — without
> inferring them from provider activity, without mixing them into
> Action, without Known Facts / snapshot JSON / compare / MCP, and
> without Incident or similarity?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names four questions. 051–053
   shipped the first three. The fourth is evidence, not Incident and
   not Recommendation.
2. **Sprint 053 leftover** lists evidence-id first, but only *if
   earned*, and the earned shape is **explicit attachment**, not
   inferred join. Body recall did not earn “newest deploy was the
   fix.”
3. **Existing primitive check:** Action free text can already hold an
   id, but then Combie cannot distinguish a sentence from an exact
   identity, cannot validate it, and cannot retrieve by it. A typed
   optional reference is the smallest new claim.
4. **Sequencing Rule 9:** persistence is required. Read-time joining
   of newest activity would invent the claim 051 forbade.
5. **MCP** stays frozen.

Rejected as 054 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Infer Action/outcome from newest deploy / quieter issues | Forbidden since 051; still unearned |
| Resource-anchored Resolution (no Investigation) | Attachment still Investigation |
| Incident grouping | Unearned; Investigation remains the anchor |
| MCP read of snapshots/resolutions | Frozen four-tool contract |
| Investigation lifecycle | Status is still a process claim |
| Similarity / “you should” | v0.8 |
| SHA-only joins / shared-commit as Action | 047 correspondence is compose, not OM attribution |
| Resolution section on `--compare` | Resolutions are not on `InvestigationContext` |
| Updating an existing Resolution with evidence later | 051 is append-only; record another row |

---

# Exact Capability

```text
combie resolution --investigation <inv>
        --decision / --action / --outcome   051, still ≥1 required
        --evidence <id>                     this Sprint, optional, repeatable
        ↓
validate each id is an allowed, locally retained
  provider-native evidence identity reachable from this
  Investigation's subject the same way investigate already
  shows it (Phase 1 pins the allowlist)
        ↓
persist ids on the Resolution row (append-only; no UPDATE)
        ↓
resolution <id>           EVIDENCE block when present
RESOLUTION MEMORY         same references on investigate / reopen
resolutions list          summaries; Phase 1 may omit evidence
                          columns (expected: omit)
```

`--evidence` alone is **not** a Resolution. At least one of
decision / action / outcome remains required. A content-free
evidence flag is the same class of mistake as `resolved: true`.

Exact CLI flag spelling is Phase 1. Expected: `--evidence <id>`,
repeatable. Constraints:

- Optional. Existing 051–053 rows have zero references.
- Exact identity only. No name search, no glob, no URL, no SHA
  string unless that string **is** the native evidence id Combie
  already stores (Sentry `version` may look like a tag; it is still
  the release row id, not a Git join).
- Unknown / disallowed id: fail the record, insert nothing, say what
  to do next (use an id investigate already shows for this subject).
- Duplicate ids in one record: Phase 1 pins one rule. Expected:
  unique, stable order (first-seen).
- Never copy the evidence row into Action. Never treat the reference
  as proof the outcome followed.
- No silent attach of newest deployment when `--evidence` is omitted.

Display constraints:

- Distinct EVIDENCE block on `resolution <id>` and inside RESOLUTION
  MEMORY, not mixed into DECISION / ACTION / OUTCOME.
- Labeled human-attached references, not current provider truth, not
  a recommendation, not proof.
- Omit the block when zero references (do not print `EVIDENCE` with
  empty / `"unknown"`).
- Show the exact id. Phase 1 may add a family label if it is already
  known from the lookup; do not invent a narrative.

---

# Evidence / Claim Semantics

### KNOWN (about the references)

```text
When this Resolution was recorded, the human attached these exact
local evidence ids.
```

### UNKNOWN / stale (required)

Attachment is **not** proof that:

- the named deployment/workflow/release/issue **was** the Action
- the outcome followed from that evidence
- the evidence is still current provider authority
- other unattached evidence is irrelevant

Provider activity remains provider activity. The Resolution remains
organizational response. The link is human attribution of support,
not causality.

### Forbidden

```text
Newest deployment is the Action
Errors dropped, therefore dpl_abc worked
You should rollback
These are similar incidents
resolved: true / this investigation is closed
This EVIDENCE block is Known Facts
Saving an investigation freezes evidence references into the snapshot
Combie inferred --evidence because a deploy happened after composedAt
```

---

# Architecture

```text
recordResolution({ evidenceIds })
        ↓
validate ids against local store / Investigation compose
        ↓
persist on resolutions row
        ↓
formatResolution / formatResolutionMemorySection
```

Ownership:

- **Domain:** optional `evidenceIds?: string[]` on `ResolutionRecord`.
  Not a new type. Not Evidence-as-a-table. Not Incident.
- **Store:** persist the ids. Smallest: a column on `resolutions`
  (JSON array) **or** a child table. Phase 1 pins one. Expected:
  column on the existing row (optional, empty = none). Missing
  column on pre-054 DBs lists empty (same class of probe as 051
  missing table).
- **App:** validate at record time; format at show / memory recall.
  Do **not** add evidence ids to `InvestigationContext`.
- **CLI:** `--evidence` on record; show/memory formatters grow.
  Expected: no new command.
- **MCP:** no new tool; `investigate_resource` payload unchanged.
- **Compare:** unchanged. Must not grow an EVIDENCE section.

Adapters do not participate. No provider refresh.

---

# Persistence vs Read-Time

| Snapshot | Resolution + evidence refs | Live compose / activity |
| --- | --- | --- |
| Frozen InvestigationContext | Human-attached ids on 051 row | Current local evidence |
| 048 JSON | 054 column | Not the Action |

Must **not**:

- rewrite snapshot JSON
- infer ids at read time when the column is empty
- create Relationships or Changes
- refresh providers
- add MCP fields
- UPDATE existing Resolution rows

---

# Boundedness

- Record-time attach only, on `resolution --investigation`.
- Same two recall paths as 052–053 for display.
- No `context`, `related`, `history`, or `investigations` list
  changes.
- `MAX_INVESTIGATION_FACTS = 5` unchanged. Evidence references are
  not Known Facts.
- No extra hop beyond what Phase 1 pins as “already visible on
  investigate of this subject.”
- No retrieve-by-evidence-id list in this Sprint unless Phase 1
  proves it is a one-line filter on the existing `resolutions`
  command. Expected: **not this Sprint** (display first; query-by-
  evidence-id is a later exact-id retrieve, like 050 after 048).
- No schema beyond the Resolution row (or one child table). No
  Evidence model. No generic join engine.

---

# Failure / Unknown Semantics

- Missing investigation / not initialized: 051 errors; no insert.
- `--evidence` without a value: usage error.
- Unknown or disallowed id: error, insert nothing. Do not store the
  string “anyway.”
- Evidence row exists but is not reachable from this subject under
  the Phase 1 allowlist: same as unknown (do not attach neighbor
  evidence from an unrelated Resource).
- Pre-054 DB / missing column: list/show/memory treat as zero
  references; write `init()` upgrades.
- Corrupt stored JSON: skip or error without inventing ids; do not
  appear as Known Facts. Phase 1 pins one rule. Expected: treat as
  untrusted, omit EVIDENCE block, do not crash investigate.

---

# Affected Surfaces

### CLI

- `resolution --investigation … --evidence <id>` — optional,
  repeatable.
- `resolution <id>` — EVIDENCE block when references exist.
- `investigate` / `investigation <id>` reopen — RESOLUTION MEMORY
  includes the same block per row when present.
- `investigate --save` — live print may include it; snapshot JSON
  must not.
- `resolutions` list — expected unchanged (no evidence essays).
- Help: one line that `--evidence` attaches exact local ids; not
  inferred.

### MCP

Unchanged four tools. Do not add evidence or Resolution fields on
`investigate_resource`.

### Compare

Unchanged. No Resolution / EVIDENCE section.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-051–053 completion notes, and inspect:

- `src/domain/resolution.ts`, `src/app/resolutions.ts`, store
  `resolutions` table
- `src/app/provider-activity.ts` (`nativeEvidenceId`, families)
- Investigation compose: which evidence ids `investigate` already
  shows for subject vs one-hop neighbor
- CLI `resolution` record path and 053 memory formatter
- 051 append-only / no-UPDATE tests

Report:

1. Allowlist of attachable identities (expected: provider-native
   evidence ids already retained and shown for this Investigation
   subject the way `investigate` shows them — Vercel deployment uid,
   GitHub workflow `runId`, Neon `operationId`, Sentry release
   `version`, Sentry `issueId`). Confirm whether one-hop neighbor
   evidence already in that compose is in or out. Expected: **in, if
   and only if investigate already displays that id for this
   subject.** Out: Resource ids, Relationship ids, Change ids, Git
   SHAs as such, `inv:` / `res:` ids, free text.
2. Persist as JSON column vs child table? Expected: **column on
   `resolutions`.**
3. Validate via live `getInvestigationContext` collect, or store
   family tables directly? Pin one. Must not refresh providers.
4. `--evidence` flag shape (repeatable vs comma-separated).
   Expected: **repeatable `--evidence <id>`.**
5. Display on show + RESOLUTION MEMORY; list unchanged?
   Expected: **yes.**
6. Retrieve-by-evidence-id? Expected: **not this Sprint.**
7. MCP / compare / snapshot JSON? Expected: **no change.**
8. Inferred attach when omitted? Expected: **no.**
9. Evidence-only record (no decision/action/outcome)? Expected:
   **still `RESOLUTION_FIELDS_REQUIRED`.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **yes** (the claim is the
   human-attached ids). Read-time inference is the forbidden
   alternative.
2. Second source of truth? References are labeled human-attached,
   never current compose, never snapshot JSON, never Action.
3. Does attaching a deployment uid leak “this was the Action”?
   **No.** Action text stays a separate field. EVIDENCE is not ACTION.
4. Does live investigate become a recommendation? **No.**
5. MCP tool needed? Expected: **no.**
6. Compare section needed? Expected: **no.**
7. Evidence table / generic join engine? Expected: **no.**
8. Canon change? Expected: AGENTS.md operational baseline only.

If implementation is tempted to auto-fill `--evidence` from newest
activity, to put ids on `InvestigationContext`, or to treat a
reference as outcome proof: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- record without `--evidence` is 051-identical (no EVIDENCE block)
- record with one/many valid ids persists them; show and RESOLUTION
  MEMORY list those exact ids; Action/Decision/Outcome text unchanged
- duplicate ids: Phase 1 rule (expected unique, first-seen order)
- unknown / disallowed id fails with next-step copy; no insert
- `--evidence` without decision/action/outcome still fails
  `RESOLUTION_FIELDS_REQUIRED`
- omitted `--evidence` does **not** attach newest deployment /
  workflow / release / issue
- `--save` snapshot JSON has no evidence ids from the Resolution
- `--compare` unchanged when references exist
- `resolutions` list still omits essays and (expected) omits evidence
  ids
- MCP still exactly four tools; `investigate_resource` payload
  unchanged
- pre-054 DB missing column: list/show/memory empty references;
  write upgrades
- missing investigation / untrusted stored payload: existing errors
  or omit EVIDENCE; no invented Known Facts

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
investigate <id> --save
resolution --investigation <inv> --decision "…" --action "…" --outcome "…"
           --evidence <native-id>
resolution <res>                 # EVIDENCE block present
investigation <inv>              # same ids in RESOLUTION MEMORY
investigate <id>                 # same
investigation <inv> --compare    # no Resolution / EVIDENCE section
```

---

# Explicit Non-Goals

Do **not** implement:

- inferring `--evidence` or Action from provider activity
- treating attached ids as causality or outcome proof
- Resource-anchored Resolution without an Investigation
- Incident model or linking
- similarity, embeddings, “you should”, Learning
- Investigation lifecycle / `resolved: true`
- putting Resolutions or evidence ids on `InvestigationContext` or
  `snapshot_json`
- Resolution / EVIDENCE section on `--compare`
- new MCP tools or `investigate_resource` fields
- retrieve-by-evidence-id (unless Phase 1 proves a one-line list
  filter — expected no)
- SHA-only joins, shared-commit correspondence as attribution
- Evidence table, MemoryEngine, RecommendationEngine
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
051       explicit Resolution capture + list                       ✅
052       exact-id Resolution recall on investigate / reopen       ✅
053       Resolution body recall on those same paths               ✅
054       explicit evidence references on a Resolution             ← this
055+      retrieve Resolutions by exact evidence id only if earned
          Resource-anchored Resolution only if earned
          Incident grouping only if earned
          MCP read of snapshots / resolutions only if earned
          Investigation snapshot pointers on live investigate
            only if earned
          Investigation lifecycle only if earned
          inferred activity→Action (never, unless a later sprint
            explicitly reverses 051)
          similarity / recommendation / learning (v0.8)
          policy / execution (v0.9)
```

---

# Product / Contract Freezes

- MCP: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource`
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 051 write still requires ≥1 of decision/action/outcome; append-only
- 052–053 recall paths unchanged except additive EVIDENCE when
  present
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

Additive. Pre-054 `resolutions` rows have no references. Write
`init()` must add the column (or child table) without rewriting
snapshots. Read-only missing-column probe lists empty.

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 054 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: optional `--evidence` exact ids persist on a
      Resolution; shown on `resolution <id>` and RESOLUTION MEMORY;
      omitted when empty; not inferred; not in snapshot JSON
- [x] if earned: no MCP change; compare unchanged; no inferred Action;
      no Incident; no recommendation copy
- [x] if not earned: rejection documented; do not infer from activity
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline

---

# Final Principle

> **Sprint 053 showed what people recorded. Sprint 054 may let them
> name which local evidence they say supported it. Combie must not
> guess, must not treat that name as the Action, and must not freeze
> it into the snapshot.**

---

# Completion Notes

## Baseline (2026-08-17)

```text
HEAD:          b40c7e3b921356dc666a3ab1354ad041592bd766
tests:         907 pass across 77 files (final; Red confirmed before
               implementation — 12 failures in the three targeted suites)
typecheck:     clean
worktree:      clean before changes; 7 files modified for the Sprint
MCP:           exactly four read-only tools
Sprint 053:    Complete
Sprint 054:    Active
```

## Repository Understanding

1. **Allowlist pinned to what investigate already shows.** Attachable
   exact ids = `nativeEvidenceId` of retained provider-native evidence
   families (`src/app/provider-activity.ts:131`): Vercel deployment
   `uid`, GitHub workflow `String(runId)`, Neon `operationId`, Sentry
   release `version`, Sentry `issueId`. Subject evidence **and** one-hop
   neighbor evidence already displayed in that compose are in. Out:
   Resource ids, Relationship ids, Change ids, Git SHAs as such,
   `inv:` / `res:` ids, free text. No family tables are consulted for
   persistence; the investigation compose is the object of record.
2. **JSON column on `resolutions`** (`evidence_ids TEXT`), not a child
   table — 051 rows stay append-only; there is no join engine.
3. **Validate via live `getInvestigationContext` collect.** Local store
   reads only; `composeProviderActivityChronology` + `nativeEvidenceId`
   produce the attachable set. Never refreshes providers.
4. **Flag shape: repeatable `--evidence <id>`.** `parseArgs` gains a
   `repeated` map; duplicates collapse to unique first-seen order inside
   the app layer.
5. **Display: `resolution <id>` show and per-row RESOLUTION MEMORY**
   gain a distinct `EVIDENCE` block (header + exact ids); `resolutions`
   list unchanged. Omitted when absent — 051/053 output is
   byte-identical otherwise.
6. **No retrieve-by-evidence-id.**
7. **MCP / compare / snapshot JSON: no change.**
8. **No inferred attach** — recording without `--evidence` never
   attaches the newest activity; a pre-054 DB (missing column) reads
   empty without crashing.
9. **Evidence-only records still `RESOLUTION_FIELDS_REQUIRED`.**

## Architecture Pressure

1. **Persistence necessary.** The claim is the human-attached ids at
   record time; read-time inference is the forbidden alternative.
2. **Labeled human-attached references** — never current compose, never
   snapshot JSON, never Action; the snapshot keeps no `EVIDENCE` and
   recording never rewrites `snapshotJson`.
3. **EVIDENCE is not ACTION** — a deployment uid points at what
   supported the decision; the `action` field stays the human's text.
4. **Live investigate stays non-recommendatory**; the ids it displays
   come from its own evidence authorities and nothing is auto-filled.
5. **No MCP tool.**
6. **No compare section.**
7. **No evidence table / generic join engine.**
8. **Canon: AGENTS.md operational baseline only.**

## Implemented

- `ResolutionRecord.evidenceIds?: string[]` (`src/domain/resolution.ts`)
- `resolutions.evidence_ids TEXT` column; `applySchema` probe; read-time
  per-row probe (`hasResolutionEvidenceColumn`); `insertResolution`
  persists the JSON; `parseResolutionEvidence` treats corrupt /
  non-array payloads as untrusted and omits them
- `recordResolution` accepts `--evidence` ids, de-dupes first-seen,
  validates each against the live-compose allowlist, and rejects
  unknown ids with `EVIDENCE_ID_NOT_FOUND` (whole record fails, nothing
  inserted)
- `formatResolution` (show) and `formatResolutionMemorySection` (per
  row) print a distinct `EVIDENCE` block when present; `resolutions`
  list unchanged
- CLI: repeatable `--evidence <id>` parsing, help line, usage errors
  for value-less flag, evidence without `--investigation`

## Deviations

- None material. Snapshot-JSON test asserts byte-identical
  `snapshotJson` (not "no deployment uid in JSON" — the retained
  snapshot legitimately contains the deployment; the sprint contract is
  that recording never rewrites it).

## Validation

```text
bun test:          907 pass across 77 files (3820 expect() calls)
bun run typecheck: clean
git diff --check:  clean
MCP tools:         get_related_context, investigate_resource,
                   list_providers, list_resources
Red:               12 failures across tests/app/resolutions.test.ts,
                   tests/app/compare-investigation.test.ts,
                   tests/cli/commands.test.ts before implementation
```

## Learnings

- `parseArgs` previously dropped repeated flags silently; the repeated
  map is the smallest change that keeps `--evidence` order and
  duplicates visible to the app layer.
- The snapshot's own deployment evidence already contains the uid, so
  "no `dpl_abc` in snapshot JSON" is the wrong assertion; immutability
  (byte-identical JSON) expresses the 054 contract correctly.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md baseline
becomes Sprints 001–054 complete. Sprint 055 is not started.
