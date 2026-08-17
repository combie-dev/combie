# SPRINT-050 — Subject-Scoped Investigation History

> **Status:** Active
> **Depends on:** SPRINT-049 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.6 Investigation
> **historical retrieval** (smallest remaining deterministic primitive
> after the Investigation object and compare-to-current)
> **Roadmap:** `docs/internal/ROADMAP.md` v0.6 Investigation —
> **historical retrieval of retained Investigation snapshots by
> subject**, not Investigation lifecycle, not the Investigation
> Engine, not Operational Memory
> **Type:** Narrow read over already-persisted Investigation rows
> **Primary goal:** List retained Investigation compositions for one
> exact Resource id so a human can retrieve *what Combie assembled
> about this subject at prior times* — including after the Resource
> is gone — without treating those rows as incidents, current
> provider truth, similar-case precedents, or an open/closed
> workflow.
> **Provider scope:** None. No new provider reads.
> **Generic Event / Correlation / Investigation Engine:** Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / hypotheses / confidence / telemetry:** None

---

# This Is Not a Layer Transition

Sprints 043–047 completed the earned v0.5 evidence path. Sprint 048
started `docs/internal/ROADMAP.md` v0.6 with the Investigation
object. Sprint 049 made snapshot-versus-current operational.

Sprint 049 leftover:

```text
050+      persisted Investigation lifecycle (open/closed) only if earned
          Context Pack / budgeting only if later earned
          Sentry deploy N+1 only if later earned
          hypotheses / confidence / summaries (ROADMAP v0.6, later)
          Operational Memory (ROADMAP v0.7)
```

Those leftovers are **not equivalent**, and they are not a sequence.

This Sprint does **not** take “persisted Investigation lifecycle”
by default. 049 already gated it: *only if earned*. Compare-to-current
did not earn it. A status enum (`open` / `closed` / `completed`) would
claim a process state Combie cannot prove from local-store evidence
without Decision / Action / Outcome (`docs/internal/ROADMAP.md` v0.7).

This Sprint does **not** start Operational Memory. v0.7 owns
**historical incident retrieval**, similarity, and incident linking.
v0.6 owns **historical retrieval** of Investigation objects.

This Sprint is the smallest unfinished v0.6 capability that 048/049
already made necessary:

```text
048  persist retained compositions, keyed by subjectResourceId
049  compare one snapshot at T₁ to local compose at T₂
050  retrieve the retained compositions for one subject
```

Without 050, the temporal dimension 049 added is only reachable if
the human already knows each `inv:` id.

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
compare composition to current     ← 049
    ↓
retrieve compositions by subject   ← this Sprint
    ↓
earned abstraction                 ← not this Sprint
```

`docs/internal/ROADMAP.md` v0.6 Investigation Flow places Historical
Memory after current evidence and before Hypotheses. 048 stored that
memory. 049 compared one row to now. Retrieval by subject is the
missing query. It must not become hypotheses, summaries-as-ranking,
or Incident memory.

048 already persists `subjectResourceId`. Sequencing Rule 9: **no new
persistence is required** for this claim. Do not add `status`,
`comparedAt`, or a second history table.

---

# Problem

`combie investigations` lists every saved snapshot in the store.
`combie investigation <id>` reopens one. `combie investigation <id>
--compare` diffs one against current compose.

After more than one `--save`, Combie already holds a time-ordered
set of retained compositions per subject. A human still cannot ask:

> For this exact Resource, which Investigation snapshots exist?

Scanning a global list is not subject-scoped retrieval. It also
fails the 049 `subject_missing` lesson: historical knowledge must
remain findable after the current Resource disappears. A global list
does not state that claim. A Resource-not-found error on the live
graph must not hide retained compositions of that subject.

`docs/internal/ROADMAP.md` v0.6 lists **historical retrieval** among
capabilities to add when earned. Query Engine language about
“retrieve historical incidents” is **not** this Sprint: incidents
are v0.7. This Sprint retrieves Investigation snapshots.

---

# Product Question

> After one or more explicit `investigate --save` snapshots, can
> Combie list the retained compositions for one exact Resource id —
> in deterministic `composedAt` order, without requiring that
> Resource to still exist in the current store, without adding MCP
> tools, and without introducing lifecycle status, similarity,
> hypotheses, or Operational Memory objects?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.6** names historical retrieval as
   a capability. Investigation object (048) and persistence (048)
   are done. Compare (049) is done. Retrieval of those objects by
   subject is not.
2. **Sprint 049 leftover** lists lifecycle first, but only *if
   earned*. 049 Phase 1/2 expected persisted status **no**. Compare
   does not create an open/closed proof.
3. **049 `subject_missing`** established that retained composition
   survives Resource deletion. That is retrieval pressure, not
   lifecycle pressure: the next question is how to find those rows
   by subject when the Resource is gone.
4. **Existing primitive:** `investigations` already prints SUBJECT.
   That is a display column, not a query. 049 deferred
   list-by-subject as not required *for compare*. It did not retire
   v0.6 historical retrieval.
5. **Sequencing Rule 9:** persistence is not necessary. Filter the
   048 table.
6. **Context Pack / fact-budget / Sentry deploy N+1 / hypotheses**
   remain later-if-earned. v0.5 still forbids a generic ContextPack
   before task pressure. 047 fact-budget pressure still does not
   authorize redesigning `MAX_INVESTIGATION_FACTS`.
7. **Closed-beta / dogfood** did not earn Incident linking or
   recommendations. Herdr “previous investigations” language is
   launch design, not v0.7 authorization — and it points at
   retrieving prior investigations, which is this slice if kept as
   Investigation snapshots rather than Incidents.

Rejected as 050 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Persisted `open` / `closed` | Unearned process claim; 049 gate closed; Decision/Outcome are v0.7 |
| Context Pack / fact-budget | v0.5 gate still closed; live investigate already composes |
| Sentry deploy N+1 | Unearned provider depth; not Investigation product |
| Hypotheses / confidence / summaries | Interpretation layer; summaries-as-ranking risks hidden significance |
| Live-investigate “historical” section | Mixes retained pointers into current compose; larger than a list query |
| v0.7 Incident / Decision / Action / Outcome | Wrong layer |
| Similarity / “has this happened before?” | v0.7 historical incident retrieval |

---

# Exact Capability

```text
combie investigations --resource <resource-id>
        ↓
read Investigation summaries where
  subjectResourceId = <resource-id>
        ↓
list id, subject, composedAt
  order: composedAt DESC, id DESC (same as 048 global list)
```

Exact flag name may be the smallest that fits existing CLI style
(`--resource` vs `--subject`). Phase 1 pins it. Default shape: a
filter on `investigations`, not a new top-level command and not a
new MCP tool.

Unfiltered `investigations` remains the global list (048).

Reopen and compare remain `investigation <id>` / `--compare` (048 /
049). This Sprint does not add “compare latest for subject” as a
second entry point.

The list contents are **InvestigationRecord** summaries only
(`id`, `subjectResourceId`, `composedAt`). Do not embed snapshot
bodies, compare results, Known Facts, or Missing Context in the
list.

---

# Evidence / Claim Semantics

### KNOWN (about the list)

```text
Combie has these retained Investigation snapshots
for subject <resource-id>, saved at their composedAt times.
```

Zero rows for that subject is **known-empty for that subject**, not
Missing Context about the Engineering Graph.

### UNKNOWN / stale (required)

Listed snapshots remain **retained composition**, not current
provider authority. Listing them does not re-compose, does not
compare, and does not imply the Resource still exists.

If the subject Resource is absent from the current store, the list
must still return matching snapshot rows. Do not fail as
`RESOURCE_NOT_FOUND`. That would hide 049's `subject_missing`
survival.

### Forbidden

```text
These are prior incidents
This subject is still an open investigation
These snapshots are current provider truth
These snapshots are similar cases / precedents
Listing investigations creates a Relationship
```

Do not say “has this happened before?” in the Operational Memory
sense. This list is identity retrieval (same subject id), not
similarity.

---

# Architecture

```text
investigations table (048)        unchanged schema
        ↓
listInvestigationSummaries
  optional subjectResourceId filter
        ↓
CLI list formatter (048, reuse)
```

Ownership:

- **Domain:** no new durable object. `InvestigationRecord` stays
  048's snapshot identity. Do not add `status`, Incident, Decision,
  Action, Outcome, or Hypothesis.
- **Store:** same table. Optional `WHERE subject_resource_id = ?`.
  No new columns. No new table.
- **App:** pass the filter through `listInvestigations`. Empty-state
  copy may distinguish global empty vs subject empty.
- **CLI:** filter flag on `investigations`.
- **MCP:** no new tool. `investigate_resource` stays live compose
  and must not gain snapshot history in this Sprint.

Adapters do not participate.

---

# Persistence vs Read-Time

| Global `investigations` | Subject-scoped list | Live `investigate` |
| --- | --- | --- |
| All 048 rows | Filter on existing column | Current compose |
| Retained composition ids | Same rows, one subject | Not a snapshot list |

Listing must **not**:

- insert or update investigation rows
- rewrite snapshot JSON
- create or delete Relationships
- write Changes
- refresh providers
- update resources
- auto-save a current compose

---

# Historical / Current-Truth Semantics

Two clocks stay distinct:

```text
composedAt     when each listed snapshot was saved (048)
now            irrelevant to the list; listing is not compare
```

This Sprint does **not** run compare. Current truth remains
`investigate <id>` and `investigation <id> --compare`.

Do not merge listed snapshots into one “history of the Resource”
that looks like `history <resource-id>` (Change / current-state
history). `history` is provider-resource memory. `investigations
--resource` is Investigation-object memory.

---

# Retrieval Behavior

- `investigations` — all snapshots (048)
- `investigations --resource <resource-id>` — snapshots whose
  `subjectResourceId` equals that id
- `investigation <id>` — reopen one snapshot (048)
- `investigation <id> --compare` — compare one snapshot (049)

This Sprint does **not** add:

- similarity search
- “has this happened before?” as incident/precedent retrieval
- incident linking
- retrieval by relationship, SHA, or time window
- embedding prior snapshot ids into live `investigate` output
  (leave for later if earned; mixing retained pointers into current
  compose is a larger semantic change)

---

# Boundedness

- Filter is exact `subjectResourceId` equality. No prefix match, no
  name search, no fuzzy identity.
- Order matches 048: `composedAt DESC`, `id DESC`.
- List rows are summaries only.
- No fact-budget involvement (`MAX_INVESTIGATION_FACTS` stays 5).
- No extra hop. No provider calls.
- No schema migration expected. A subject index is optional and not
  a product requirement.

---

# Failure / Unknown Semantics

- Uninitialized store: same as other read commands.
- Missing / blank `--resource` value: error that says what to pass;
  do not list globally as a silent fallback.
- Subject with zero snapshots: truthful empty-for-subject message;
  exit 0.
- Subject Resource missing from the store, but snapshots exist:
  list the snapshots; do not error.
- Corrupt snapshot JSON is irrelevant to summary list (048 list
  does not parse bodies). Keep that.
- Unfiltered list unchanged.

---

# Affected Surfaces

### CLI

- `investigations --resource <resource-id>` (or the smallest
  equivalent) prints the 048 list shape for that subject.
- Help lists the flag and one example.
- `investigations` with no filter remains 048.

### MCP

Unchanged four tools. Do not add `list_investigations`. Do not add
a snapshot-history field on `investigate_resource` in this Sprint.

### Graph / sync

Unchanged.

### Learning

None. A subject list is not precedent scoring and not an Outcome.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.6
historical retrieval vs v0.7 historical incident retrieval,
ARCHITECTURE Investigation vs Incident, this Sprint, and inspect:

- `src/storage/store.ts` `listInvestigationSummaries`
- `src/app/investigations.ts` `listInvestigations` /
  `formatInvestigationList`
- `src/cli/index.ts` `investigations` command and flag parsing
- MCP tool list (must remain four)

Report:

1. Can the filter be `WHERE subject_resource_id = ?` on the 048
   table with no schema change?
2. CLI flag with least new surface (`--resource` vs `--subject`).
3. Empty-for-subject copy vs global empty copy.
4. Subject-missing Resource vs empty snapshots vs uninitialized.
5. Is InvestigationEngine earned? Expected: **no**.
6. Is persisted lifecycle status earned? Expected: **no**.
7. Is Operational Memory earned? Expected: **no**.
8. Should live `investigate` mention saved snapshots? Expected:
   **no** in this Sprint.

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no**.
2. Second source of truth? List must remain retained-composition
   ids, never current graph authority.
3. Does ARCHITECTURE Investigation yaml `status` leak? **No.**
4. Do Incident / Decision / Action / Outcome leak? **No.** Do not
   rename this list “incidents”.
5. MCP tool needed? Expected: **no**.
6. Live-investigate historical section needed? Expected: **no**.
7. Canon change? Expected: AGENTS.md operational baseline only.

If retrieval requires similarity, a ContextPack, an Engine, or a
lifecycle state machine: **STOP**. Reduce to exact subject-id
filter over existing rows.

---

# Tests

Red → Green → Refactor. No live credentials.

- unfiltered list still returns all subjects (048 regression)
- filter returns only matching `subjectResourceId`
- mixed subjects: order inside the filter remains `composedAt`
  DESC, `id DESC`
- zero snapshots for a subject: empty-for-subject, not the global
  empty message, not `RESOURCE_NOT_FOUND`
- snapshots remain listed after the subject Resource row is
  deleted (049 survival applied to retrieval)
- filter does not insert investigations, Changes, or Relationships
- invalid / missing flag value errors
- MCP still exactly four tools; `investigate_resource` payload
  unchanged; read-only DB regression

---

# Live Dogfood

Optional. Isolated `COMBIE_HOME` / `--dir`. Never commit secrets or
private resource names.

```text
investigate <id-a> --save
investigate <id-a> --save          # second snapshot, same subject
investigate <id-b> --save
investigations                     # all three
investigations --resource <id-a>   # two rows, both id-a
investigations --resource <id-a>   # still two after deleting resource a
investigations --resource <id-c>   # known-empty for unused id
```

Known-empty subjects are valid. Do not force shared-commit evidence.

---

# Explicit Non-Goals

Do **not** implement:

- InvestigationEngine
- persisted Investigation lifecycle (`open` / `closed` /
  `completed`, trigger types)
- hypotheses, confidence, findings, recommendations, summaries
- Incident, Decision, Action, or Outcome models
- incident linking, similarity search, memory summaries
- “has this happened before?” as precedent retrieval
- embedding prior snapshots into live `investigate` / MCP
  `investigate_resource`
- “compare latest snapshot for subject” convenience
- ContextPack type or fact-budget redesign
- Sentry release-deploy N+1
- new Relationship or multi-hop
- release↔issue causality
- generic Event / Correlation engine
- new MCP tools
- auto-save, background sync, webhooks
- learning, policy, execution
- hosted Combie
- model reasoning

Do not scaffold these.

Do not collapse Investigation, Incident, Decision, Action, and
Outcome into one generic memory object.

---

# What This Sprint Leaves for Later

```text
043–047   v0.5 evidence + exact shared-commit + correspondence     ✅
048       durable Investigation snapshot (smallest v0.6 object)    ✅
049       compare saved snapshot to current compose                ✅
050       subject-scoped historical retrieval                      ← this
051+      persisted Investigation lifecycle (open/closed) only if earned
          live-investigate historical pointers only if earned
          Context Pack / budgeting only if later earned
          Sentry deploy N+1 only if later earned
          hypotheses / confidence / summaries (ROADMAP v0.6, later)
          Operational Memory (ROADMAP v0.7)
            Incident ≠ Investigation ≠ Decision ≠ Action ≠ Outcome
            historical incident retrieval ≠ this list
```

---

# Product / Contract Freezes

- MCP: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource`
- Relationship kinds unchanged
- one-hop live investigate unchanged (no historical section)
- 048 snapshot schema and 049 compare semantics unchanged
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- no generic Event abstraction
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP to
  justify lifecycle, an Engine, or Operational Memory

---

# Migration / Upgrade

No database migration is expected.

Pre-050 DBs already have `investigations.subject_resource_id`.
Filter is read-time. Missing table remains 048 empty-list behavior.

If implementation is tempted to add `status` or `comparedAt`
columns: **STOP**. Those are not required for this Sprint.

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 050 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: list retained snapshots for one exact subject id
- [x] if earned: listing survives subject Resource deletion; empty
      subject is known-empty; snapshots are not called incidents
- [x] if earned: no lifecycle status; no Incident / Decision /
      Action / Outcome; MCP still four tools; live investigate
      unchanged
- [x] if not earned: rejection documented; do not invent an Engine
      or start Operational Memory
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged unless material semantics require an update

---

# Final Principle

> **`docs/internal/ROADMAP.md` v0.6 historical retrieval is not
> v0.7 historical incident retrieval. Sprint 050 may list retained
> Investigation compositions for one subject. It must not decide
> whether an investigation is open, whether cases are similar, or
> what happened.**

---

# Completion Notes

## Baseline (2026-08-16)

```text
HEAD:          6f7230e76d5e52422b17a76aa9f3c3d2d88c7194
tests:         865 pass across 76 files
typecheck:     clean
worktree:      clean
MCP:           exactly four read-only tools
Sprint 049:    Complete
Sprint 050:    Active
```

## Repository Understanding

1. **Filter without schema change.** `investigations.subject_resource_id`
   exists (048 DDL); `listInvestigationSummaries` (store.ts) already
   orders `composed_at DESC, id DESC` behind a `sqlite_master` table
   probe (pre-048 DBs list empty). Optional `WHERE subject_resource_id
   = ?` rides the existing index. No migration.
2. **CLI flag.** `--resource <resource-id>` — matches Sprint default
   shape and existing vocabulary (`resources --provider/--kind`,
   `investigate <resource-id>`). `--subject` would be a new word for
   the same concept.
3. **Empty copy.** Distinct: global `No investigation snapshots saved
   yet.` (048, unchanged) vs subject `No investigation snapshots saved
   for subject <id>.` Both exit 0.
4. **Subject-missing vs empty vs uninitialized.** The filter path reads
   only the `investigations` table — it never calls `getResource`, so
   `RESOURCE_NOT_FOUND` cannot fire. Missing Resource + rows → list;
   zero rows → known-empty; uninitialized → `NOT_INITIALIZED` like all
   read commands.
5. **InvestigationEngine.** Not earned.
6. **Persisted lifecycle status.** Not earned (049 gate still closed).
7. **Operational Memory.** Not earned (v0.7).
8. **Live investigate.** No snapshot pointers (not this Sprint).

## Architecture Pressure

1. Persistence not necessary — read-time filter over 048 rows
   (Sequencing Rule 9).
2. No second source of truth — output is retained-composition ids from
   `investigations` only; no re-compose; no authority claim.
3. No ARCHITECTURE `status` / trigger / hypotheses / recommendation
   leakage into the list or its rows.
4. No Incident / Decision / Action / Outcome vocabulary; list is
   "investigation snapshots", never "incidents".
5. No MCP tool; `investigate_resource` stays live compose.
6. No live-investigate historical section.
7. Canon change: AGENTS.md operational baseline only.

## Implemented

- `Store.listInvestigationSummaries(filter?: { subjectResourceId?: string })`
  — optional `WHERE subject_resource_id = ?`, same ORDER BY, same
  table probe; unfiltered call unchanged (048).
- `listInvestigations(baseDir, options?)` — passes the filter through.
- `formatInvestigationList(records, subjectResourceId?)` — distinct
  subject-empty copy; global empty copy unchanged.
- CLI `investigations [--resource <resource-id>]` — trims and validates
  the flag (bare or blank value → usage error, exit 1; never a silent
  global fallback); help lists the flag and one example.
- No schema migration; no new MCP tools; no live-investigate changes.

## Deviations

- None. Flag name `--resource` (Phase 1 pin); subject-empty copy text
  chosen as `No investigation snapshots saved for subject <id>.`

## Validation

```text
bun test:          872 pass across 76 files (was 865 / 76; +7 tests)
bun run typecheck: clean
git diff --check:  clean
MCP tools:         get_related_context, investigate_resource,
                   list_providers, list_resources (read-only annotations)
dogfood:           isolated /tmp/combie-050-dogfood: 3 saves (2× dog-a,
                   1× dog-b); unfiltered lists all 3; --resource dog-a
                   lists 2; after deleting resource dog-a still lists 2
                   (exit 0); --resource never-used is known-empty
                   (exit 0); --resource with no value errors (exit 1)
```

## Learnings

- The 048 SQL `ORDER BY composed_at DESC, id DESC` was already the
  correct contract for the filtered variant; the filter is a pure
  WHERE addition.
- The `sqlite_master` probe means a pre-050 DB (or a store opened
  before a write `init()`) lists empty for both global and
  subject-scoped reads without any upgrade step.
- Test-authoring trap: an expected tie-break list must group by
  `composedAt` first, then id DESC *within* the group — a plain
  string-DESC sort of mixed `composedAt` ids is not the SQL contract
  and fails nondeterministically with random `inv:` UUIDs.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md baseline
becomes Sprints 001–050 complete. Sprint 051 is not started.
