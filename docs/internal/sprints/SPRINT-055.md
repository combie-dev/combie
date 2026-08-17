# SPRINT-055 — Retrieve Resolutions by Exact Evidence Id

> **Status:** Complete
> **Depends on:** SPRINT-054 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.7 Operational Memory
> (what evidence supported that decision — retrieve half after 054
> attach). Sprint 054 leftover list is **not** a sequence; inferred
> attribution from provider activity remains unearned and forbidden.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **exact-id retrieval of Resolutions by a human-attached evidence
> identity**, not inferred Action, not Incident, not similarity, not
> Recommendation, not MCP, not snapshot rewrite, not Resource-anchored
> Resolution
> **Type:** Narrow read-time filter over already-persisted Resolution
> rows
> **Primary goal:** List retained Resolutions whose human-attached
> evidence references include one exact local evidence id — the 050
> shape for the 054 column — without inferring Action from newest
> provider activity, without a new Evidence table, and without thawing
> MCP.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 051–054 shipped the smallest honest Operational Memory loop:

```text
051  persist decision / action / outcome on a saved Investigation
052  show those rows on investigate / investigation reopen
053  show the retained field text on those same paths
054  optional human-attached evidence ids on that response
```

That answers four ROADMAP v0.7 questions on the path already in use —
except the fourth is only half-answered:

```text
What did we decide last time?          ← 051–053
What action did we take?               ← 051–053
Did it work?                           ← 051–053
What evidence supported that decision?
        attach: the human named these ids     ← 054
        retrieve: which responses named this id  ← not yet
```

Sprint 054 leftover:

```text
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
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.

**Inferred** attribution (“newest Vercel deployment is the Action”)
is still unearned and still forbidden. Retrieve-by-id is not
inference. It is identity lookup over ids a human already named.

This Sprint takes the smallest unfinished v0.7 capability that 054
already made necessary: the 050-shaped query over the 054 column.

```text
048  persist snapshots          →  050  retrieve by exact subject id
054  persist evidence ids       →  055  retrieve by exact evidence id
```

054 itself deferred this: display first; query-by-evidence-id is a
later exact-id retrieve, like 050 after 048. Attachment without
retrieve leaves the same hole 048 had before 050: the human must
already know each `res:` id.

It is **not** similarity, Incident, Recommendation, or MCP.

It is **not** Investigation lifecycle. Listing who named `dpl_abc`
does not close an Investigation and does not prove the outcome.

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
human names supporting evidence     ← 054
    ↓
retrieve by that exact evidence id  ← this Sprint
    ↓
earned abstraction                  ← not this Sprint
```

Sequencing Rule 9: **no new persistence.** The 054 `evidence_ids`
column already holds the claim. Filter it. Do not write a child
table. Do not add an Evidence model. Do not infer ids at read time
when the column is empty.

---

# Problem

After 054, a human can record:

```text
combie resolution --investigation inv:…
        --decision "Rollback"
        --action "Reverted deploy"
        --outcome "Errors dropped"
        --evidence dpl_abc
```

`resolution <id>` and RESOLUTION MEMORY can show `dpl_abc` in an
EVIDENCE block. `resolutions` and `resolutions --investigation` /
`--resource` still cannot answer:

> Which retained responses named this exact evidence id?

Scanning a global list, or reopening every `res:` row, is not
evidence-id retrieval. ROADMAP v0.7 organizational precedent
retrieval, at this grain, is identity lookup over ids the human
already attached — not “has this happened before?” similarity, and
not “newest deploy was the fix.”

054 Problem already named this hole. 054 Boundedness deferred it.

---

# Product Question

> After explicit Resolution evidence references exist, can Combie
> list retained Resolutions whose human-attached evidence ids include
> one exact local evidence identity — summaries only, omitted when
> known-empty, surviving subject Resource deletion and evidence aging
> out of live compose — without inferring them from provider activity,
> without mixing them into Action, without Known Facts / snapshot JSON
> / compare / MCP, and without Incident or similarity?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names four questions. 051–053
   shipped the first three. 054 shipped the attach half of the
   fourth. Retrieve-by-that-id is the missing query, not Incident
   and not Recommendation.
2. **Sprint 054 leftover** lists retrieve-by-evidence-id first, only
   *if earned*. That list is **not** a sequence (052–053 skipped
   leftover #1). This Sprint takes retrieve because 054 made it
   necessary the same way 048 made 050 necessary: a persisted exact
   identity with no query. Display did not earn “newest deploy was
   the fix,” Resource-anchored Resolution, or MCP. Canonical ROADMAP
   does not name Sprint 055; the fourth v0.7 question’s retrieve half
   is the unfinished claim.
3. **Existing primitive check:** `resolutions --investigation` and
   `--resource` already filter the 051 table. `--evidence` already
   means an exact native id on record. A list filter on membership
   is the smallest new claim. Action free text still cannot be
   queried as identity.
4. **Sequencing Rule 9:** persistence is **not** required. Read-time
   membership over `evidence_ids`. Inferring from live activity would
   invent the claim 051 forbade.
5. **MCP** stays frozen.

Rejected as 055 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Infer Action/outcome from newest deploy / quieter issues | Forbidden since 051; still unearned |
| Resource-anchored Resolution (no Investigation) | Attachment still Investigation; retrieve does not change the write anchor |
| Incident grouping | Unearned; Investigation remains the anchor |
| MCP read of snapshots/resolutions | Frozen four-tool contract |
| Investigation lifecycle | Status is still a process claim |
| Similarity / “you should” / “has this happened before?” | v0.8 / v0.7 historical incident retrieval; this list is exact-id membership |
| SHA-only joins / shared-commit as Action | 047 correspondence is compose, not OM attribution |
| Resolution / EVIDENCE section on `--compare` | Resolutions are not on `InvestigationContext` |
| Live-investigate retrieve-by-evidence | Mixes a list query into current compose; 052–053 already show attached ids per row |
| Evidence table / generic join engine | 054 stored ids on the Resolution row; membership does not earn a model |
| Updating an existing Resolution with evidence later | 051 is append-only; record another row |
| Repeatable `--evidence` OR/AND on the list | One exact id (050 is one subject). Multi-id query is a later claim |
| Echo evidence ids on record confirmation / rewrite the 054 record help example | 054 polish, not retrieve; list-flag help only |

---

# Exact Capability

```text
combie resolutions --evidence <id>
        ↓
read Resolution summaries whose stored evidenceIds
  contain that exact string (membership, not substring)
        ↓
list id, investigation, subject, recordedAt
  order: recordedAt DESC, id DESC (same as 051 global list)
```

Exact CLI flag spelling is Phase 1. Expected: reuse `--evidence <id>`
on the existing `resolutions` command (same flag family as record;
same pattern as `--resource` on `investigations` and `resolutions`).
One exact id. Not repeatable on the list in this Sprint.

Unfiltered `resolutions` remains the global list (051).

`resolutions --investigation` and `--resource` remain 051. Phase 1
pins combination. Expected: **AND** with `--evidence` when both are
present (051 already ANDs investigation + resource).

`resolution <id>` show, live `investigate`, `investigation <id>`
reopen, and `--compare` are unchanged. This Sprint does not add
“list by evidence on investigate” as a second entry point.

The list contents are **ResolutionRecord summaries only** (051
columns: id, investigation, subject, recordedAt). Do not add an
evidence-id essay column. The query already answered membership.
054 list omitted evidence columns; keep that.

`--evidence` alone on `resolution` (record) remains 054 attach.
`--evidence` on `resolutions` (list) is this Sprint's filter.
Different commands.

---

# Evidence / Claim Semantics

### KNOWN (about the list)

```text
Combie has these retained Resolutions whose human-attached
evidence ids include <id>, recorded at their recordedAt times.
```

Zero rows for that id is **known-empty for that evidence id**, not
Missing Context, not `EVIDENCE_ID_NOT_FOUND` (that code is the 054
write-path error). Retrieve is not attach. An id that was never
attached, or is unknown to live compose, is still a valid query:
the answer is empty.

### UNKNOWN / stale (required)

Listed Resolutions remain **organizational response**, not current
provider authority. Listing them does not re-compose, does not
re-validate ids against live `investigate`, and does not imply the
named evidence is still in the compact activity window.

If the subject Resource is absent from the current store, the list
must still return matching Resolution rows. Do not fail as
`RESOURCE_NOT_FOUND`. That would hide the 049/050/051 survival
lesson.

If `dpl_abc` has aged out of live investigate, Resolutions that
named it at record time must still list. The 054 claim is “the
human named this id,” not “this id is still attachable.”

### Forbidden

```text
These Resolutions prove dpl_abc was the Action
Newest deployment is the Action
Errors dropped, therefore dpl_abc worked
You should rollback
These are similar incidents / this has happened before
resolved: true / this investigation is closed
This list is Known Facts
Saving an investigation freezes evidence references into the snapshot
Combie inferred --evidence because a deploy happened after composedAt
Substring match: dpl_ab lists the row that named dpl_abc
LIKE / glob / URL / SHA-as-such search
```

Provider activity remains provider activity. The Resolution remains
organizational response. The filter is human-attached identity
membership, not causality.

---

# Architecture

```text
resolutions table (051) + evidence_ids (054)   unchanged schema
        ↓
listResolutionSummaries
  optional evidenceId membership filter
        ↓
CLI list formatter (051, reuse)
```

Ownership:

- **Domain:** no new durable object. `ResolutionRecord.evidenceIds`
  stays 054's optional array. Do not add an Evidence type, Incident,
  or join engine.
- **Store:** same table. Optional filter: stored `evidenceIds`
  contains this exact string. No new columns. No new table.
- **App:** pass the filter through `listResolutions`. Empty-state
  copy may distinguish global empty vs investigation empty vs
  subject empty vs evidence-id empty.
- **CLI:** filter flag on `resolutions`. Expected: no new command.
- **MCP:** no new tool; `investigate_resource` payload unchanged.

Adapters do not participate. No provider refresh.

Phase 1 pins membership implementation. Expected: exact string
equality against the already-parsed 054 array (app-layer after
SELECT, **or** SQLite `json_each` if bun:sqlite proves it without a
schema change). **Never** `LIKE` / substring on the JSON text.
Corrupt / non-array payloads stay 054-untrusted (no ids) and
therefore do not match.

---

# Persistence vs Read-Time

| Snapshot | Resolution + evidence refs | Live compose / activity |
| --- | --- | --- |
| Frozen InvestigationContext | Human-attached ids on 051 row | Current local evidence |
| 048 JSON | 054 column; 055 filters it | Not the Action |

Must **not**:

- insert or update Resolution rows
- rewrite snapshot JSON
- infer ids at read time when the column is empty
- re-validate listed ids against live `investigate`
- create Relationships or Changes
- refresh providers
- add MCP fields
- UPDATE existing Resolution rows
- add an Evidence table

---

# Boundedness

- List-time filter only, on `resolutions`.
- Exact membership. No prefix match, no name search, no glob, no
  URL, no SHA string unless that string **is** the native evidence
  id stored on a Resolution (same 054 identity rule).
- One exact id per invocation. Repeatable `--evidence` on the list
  is **not** this Sprint.
- Order matches 051: `recordedAt DESC`, `id DESC`.
- List rows are summaries only (051 columns).
- No fact-budget involvement (`MAX_INVESTIGATION_FACTS` stays 5).
- No extra hop. No provider calls.
- No schema migration. Pre-054 missing column: those rows have zero
  references and cannot match the filter (same class of probe as 054
  read-empty).
- No retrieve on live `investigate` / reopen / `--compare`.
- No `context`, `related`, `history`, or `investigations` list
  changes.

---

# Failure / Unknown Semantics

- Uninitialized store: same as other read commands.
- Missing / blank `--evidence` value: error that says what to pass;
  do not list globally as a silent fallback.
- Evidence id with zero matching Resolutions: truthful
  empty-for-that-id message; exit 0. Not `EVIDENCE_ID_NOT_FOUND`.
- Subject Resource missing from the store, but Resolutions exist:
  list the matching rows; do not error.
- Named evidence no longer in live compose: list the matching rows;
  do not re-validate; do not error.
- Pre-054 DB / missing column: filter matches nothing (empty-for-
  that-id); do not crash.
- Corrupt stored JSON: 054 omit; not a match; do not invent ids;
  do not appear as Known Facts.
- Unfiltered list unchanged.

---

# Affected Surfaces

### CLI

- `resolutions --evidence <id>` — filter the 051 list by exact
  membership in stored `evidenceIds`.
- Help: one line that the flag lists Resolutions that attached that
  exact local id; not inferred; not a search.
- `resolutions` with no filter remains 051.
- `resolutions --investigation` / `--resource` remain 051; AND with
  `--evidence` if Phase 1 confirms combination.
- `resolution --investigation … --evidence` remains 054 record.
- `resolution <id>`, `investigate`, `investigation <id>` reopen,
  `--compare`: unchanged.

### MCP

Unchanged four tools. Do not add `list_resolutions`. Do not add
evidence or Resolution fields on `investigate_resource`.

### Compare

Unchanged. No Resolution / EVIDENCE section.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-051–054 completion notes, and inspect:

- `src/domain/resolution.ts`, `src/app/resolutions.ts`, store
  `listResolutionSummaries` / `evidence_ids`
- CLI `resolutions` list path (`--investigation`, `--resource`)
- 054 parse / untrusted JSON / missing-column probe
- 050 `investigations --resource` empty-state and survival tests
  (the analog, not the table)

Report:

1. Flag on `resolutions`: `--evidence <id>` vs a new name?
   Expected: **reuse `--evidence <id>`.** One exact id, not
   repeatable on the list.
2. Combine with `--investigation` / `--resource`? Expected: **AND.**
3. Membership: app-layer over parsed `evidenceIds` vs
   `json_each`? Pin one. Must be exact string equality. Must not
   `LIKE` the JSON text.
4. List columns unchanged (no evidence essay)? Expected: **yes.**
5. Empty copy distinct from investigation/subject empty?
   Expected: **yes.** Exit 0.
6. Re-validate against live `investigate`? Expected: **no.**
7. Survive subject Resource deletion and evidence aging out of
   compose? Expected: **yes.**
8. Missing-column / corrupt JSON? Expected: **no match; no crash.**
9. MCP / compare / snapshot JSON / RESOLUTION MEMORY?
   Expected: **no change.**
10. Inferred attach or write-path change? Expected: **no.** Do not
    echo evidence ids on record confirmation. Do not rewrite the
    054 record help example; add the list-flag help line only.

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no** (the claim is already on
   the 054 column). A child table or Evidence model is not required
   for membership.
2. Second source of truth? The list is retained human-attached
   references, never current compose, never snapshot JSON, never
   Action.
3. Does listing by a deployment uid leak “this was the Action”?
   **No.** Action text stays a separate field. The filter is
   membership, not causality.
4. Does this become “has this happened before?” similarity? **No.**
   Exact id only. Different deployments are different ids.
5. MCP tool needed? Expected: **no.**
6. Compare section needed? Expected: **no.**
7. Live-investigate retrieve needed? Expected: **no.**
8. Evidence table / generic join engine? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline only.

If implementation is tempted to auto-fill `--evidence` from newest
activity, to `LIKE` JSON text, to re-validate listed ids against
live compose, to put ids on `InvestigationContext`, or to treat a
match as outcome proof: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- unfiltered `resolutions` is 051-identical
- `--investigation` / `--resource` lists are 051-identical when
  `--evidence` is omitted
- record with `--evidence dpl_abc`; `resolutions --evidence dpl_abc`
  lists that row (and only rows that contain that exact id)
- a different id (`dpl_xyz`) does not list the `dpl_abc` row
- substring / prefix (`dpl_ab`) does not match `dpl_abc`
- duplicate ids on the record still match once (054 first-seen)
- zero matches: distinct empty-for-that-id copy; exit 0; not
  `EVIDENCE_ID_NOT_FOUND`
- missing / blank `--evidence` value: usage error; does not list
  globally
- AND with `--investigation` / `--resource` (if Phase 1 confirms):
  intersection only
- subject Resource deleted: matching rows still list (not
  `RESOURCE_NOT_FOUND`)
- named id no longer in live compose: matching rows still list;
  listing does not call `getInvestigationContext` for validation
- omitted `--evidence` on record still never attaches newest
  activity (054 regression)
- `--save` snapshot JSON unchanged when listing by evidence
- `--compare` unchanged when matching Resolutions exist
- `resolution <id>` / RESOLUTION MEMORY still show the EVIDENCE
  block; list still omits evidence essays
- MCP still exactly four tools; `investigate_resource` payload
  unchanged
- pre-054 DB missing column: filter is empty-for-that-id; no crash
- corrupt stored JSON: not a match; no invented Known Facts

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
investigate <id> --save
resolution --investigation <inv> --decision "…" --action "…" --outcome "…"
           --evidence <native-id>
resolutions --evidence <native-id>     # that row listed
resolutions --evidence <other-id>      # known-empty
resolution <res>                       # EVIDENCE block unchanged
investigation <inv>                    # RESOLUTION MEMORY unchanged
investigate <id>                       # unchanged
investigation <inv> --compare          # no Resolution / EVIDENCE section
```

---

# Explicit Non-Goals

Do **not** implement:

- inferring `--evidence` or Action from provider activity
- treating listed ids as causality or outcome proof
- substring / LIKE / glob / name / URL / SHA-as-such search
- repeatable multi-id OR/AND on the list (one exact id)
- Resource-anchored Resolution without an Investigation
- Incident model or linking
- similarity, embeddings, “you should”, “has this happened before?”,
  Learning
- Investigation lifecycle / `resolved: true`
- putting Resolutions or evidence ids on `InvestigationContext` or
  `snapshot_json`
- Resolution / EVIDENCE section on `--compare`
- retrieve-by-evidence on live `investigate` / reopen
- new MCP tools or `investigate_resource` fields
- SHA-only joins, shared-commit correspondence as attribution
- Evidence table, MemoryEngine, RecommendationEngine
- updating existing Resolution rows
- echoing evidence ids on 054 record confirmation, or rewriting the
  record-path help example (list-flag help only)
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
051       explicit Resolution capture + list                       ✅
052       exact-id Resolution recall on investigate / reopen       ✅
053       Resolution body recall on those same paths               ✅
054       explicit evidence references on a Resolution             ✅
055       retrieve Resolutions by exact evidence id                ← this
056+      Resource-anchored Resolution only if earned
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
- 054 `--evidence` on record unchanged (validate at write; do not
  re-validate at list)
- 052–053 recall paths unchanged
- 051 list columns unchanged
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None expected. Filter is read-time over the 054 column.

Pre-054 `resolutions` rows have no references and cannot match.
Missing-column probe lists empty for the filter (054 read-empty
class). Do not rewrite snapshots. Do not UPDATE rows.

If implementation is tempted to add an `evidence_id` child table or
an Evidence model: **STOP.** Those are not required for this Sprint.

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 055 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `resolutions --evidence <id>` lists retained rows
      whose stored evidence ids include that exact string; known-empty
      when none; survives subject deletion and evidence aging out of
      compose; not inferred; not substring
- [x] if earned: no MCP change; compare unchanged; no inferred Action;
      no Incident; no recommendation copy; no Evidence table
- [x] if not earned: rejection documented; do not infer from activity
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline

---

# Final Principle

> **Sprint 054 let people name which local evidence they say supported
> a response. Sprint 055 may list which responses named one exact id.
> Combie must not guess, must not search, and must not treat a match
> as the Action.**

---

# Completion Notes

## Baseline (2026-08-17)

```text
HEAD:          1e65f1c09744b202072f8a98b42e943ba5e57550
                (after committing the finished Sprint 054 worktree:
                b40c7e3 was 054 activation; 520186a + 1e65f1c completed it)
tests:         907 pass across 77 files (3820 expect() calls; Red
               confirmed before implementation — 12 of 20 new tests
               failed for the right reasons)
typecheck:     clean
worktree:      clean before changes; 5 files modified for the Sprint
MCP:           exactly four read-only tools
Sprint 054:    Complete
Sprint 055:    Active (single Active sprint)
```

## Repository Understanding

1. **Flag reused: `--evidence <id>` on `resolutions`.** parseArgs already
   accepted `flags.evidence` on the list command but it was silently
   ignored (`src/cli/index.ts:517-545`); the gap was only the filter.
   One exact id: a repeated `--evidence` (record-path-only per 054) is a
   usage error on the list, never silent last-wins.
2. **AND with `--investigation` / `--resource`.** `listResolutionSummaries`
   already ANDs both clauses (`src/storage/store.ts:1569-1577`); evidence
   membership composes as a third constraint.
3. **Membership pinned: post-SELECT exact-string equality over the
   already-parsed 054 array.** `parseResolutionEvidence` yields
   `undefined` for corrupt / non-array payloads (untrusted, never
   invented) and `hasResolutionEvidenceColumn` handles the pre-054
   missing column — both produce no match. No `json_each`, no `LIKE`,
   no new SQL, no schema change.
4. **List columns unchanged** — `formatResolutionList` keeps the fixed
   ID / INVESTIGATION / SUBJECT / RECORDED AT table; no evidence essay
   column (054 list omission preserved).
5. **Distinct empty copy, checked first.** `No resolutions recorded for
   evidence <id>.` / `This is known-empty for that exact local evidence
   id — no retained resolution attached it.` Exit 0. Never
   `EVIDENCE_ID_NOT_FOUND` (054 write-path error).
6. **No re-validation.** The list is a pure store read; nothing calls
   `getInvestigationContext`. Subject Resource deletion and evidence
   aging out of live compose both survive.
7. **MCP / compare / snapshot JSON / RESOLUTION MEMORY: no change.**
   `listResolutionSummaries` has exactly one caller; the three memory
   call sites pass literal filter objects without `evidenceId`.
8. **No inferred attach, no write-path change.** Record confirmation
   echo and the 054 record help line stay byte-identical; only the
   list-flag help line and one list example were added.

## Architecture Pressure

1. **Persistence necessary? No.** The claim already lives on the 054
   `evidence_ids` column; membership is read-time (Sequencing Rule 9).
2. **Second source of truth? No.** The list reads retained
   human-attached references on the 051 row — never current compose,
   never snapshot JSON, never Action.
3. **Does listing by a deployment uid leak "this was the Action"? No.**
   `action` stays a separate free-text field; the filter is identity
   membership, not causality.
4. **Similarity? No.** Exact id only; different deployments are
   different ids; no "has this happened before?" copy.
5. **MCP tool? No.**
6. **Compare section? No.**
7. **Live-investigate retrieve? No.**
8. **Evidence table / generic join engine? No.**
9. **Canon change? AGENTS.md operational baseline only.**

## Implemented

- `listResolutionSummaries` filter gains `evidenceId?: string`; rows
  filtered after mapping by `row.evidenceIds?.includes(id)` — exact
  membership over the parsed 054 array (`src/storage/store.ts`)
- `ListResolutionsOptions.evidenceId`; `listResolutions` passes it
  through; `formatResolutionList` gains the evidence empty branch,
  checked before investigation/subject/global (`src/app/resolutions.ts`)
- CLI `resolutions --evidence <id>`: value required (usage error,
  exit 1), one exact id (repeat → usage error, exit 1), AND with
  `--investigation` / `--resource`; usage strings gain
  `[--evidence <evidence-id>]`; help gains the list-flag line and the
  `resolutions --evidence dpl_abc` example; 054 record help line
  byte-identical (`src/cli/index.ts`)
- Tests: 13 app-layer (`tests/app/resolutions.test.ts`) + 7 CLI
  (`tests/cli/commands.test.ts`)

## Deviations

- None material. The AND-with-subject fixture records resB against a
  different deployment uid then raw-SQL-updates `evidence_ids` to
  `["dpl_abc"]` because `vercel_deployments.uid` is a global PRIMARY
  KEY (two rows cannot share the uid at record time); SQL surgery is an
  established pattern in this suite and the stored claim is identical.

## Validation

```text
bun test:          927 pass across 77 files (3898 expect() calls)
bun run typecheck: clean
git diff --check:  clean
MCP tools:         get_related_context, investigate_resource,
                   list_providers, list_resources
Red:               12 of 20 new tests failed before implementation
live (isolated):   investigate --save → resolution --evidence dpl_abc →
                   resolutions --evidence dpl_abc lists that row →
                   --evidence dpl_xyz and dpl_ab known-empty (exit 0) →
                   --evidence (no value) and repeated --evidence usage
                   errors (exit 1) → resolution <id> EVIDENCE block
                   unchanged → investigation reopen RESOLUTION MEMORY
                   unchanged → live investigate unchanged → --compare
                   has no Resolution/EVIDENCE section → global list
                   unchanged → AND with --investigation works → after
                   deleting all deployments AND the subject Resource,
                   resolutions --evidence dpl_abc still lists the row
                   (exit 0, no RESOURCE_NOT_FOUND, no
                   EVIDENCE_ID_NOT_FOUND)
```

## Learnings

- `parseArgs` already accepted `--evidence` on the `resolutions` list
  silently; the smallest honest shape is a real filter, not a silent
  drop — a repeat on the list is a usage error, mirroring how the
  record path owns repeatability.
- The evidence empty copy is checked before investigation/subject so
  the most specific filter names itself even when ANDed; exit 0 keeps
  known-empty distinct from usage failure.
- Post-SELECT membership over the already-parsed 054 array reuses the
  054 untrusted-JSON semantics for free: corrupt payloads and the
  pre-054 missing column both simply never match.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md baseline
becomes Sprints 001–055 complete. Sprint 056 is not started.
