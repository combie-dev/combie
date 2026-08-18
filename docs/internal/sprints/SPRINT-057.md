# SPRINT-057 — Resource-Anchored Resolution

> **Status:** Complete
> **Depends on:** SPRINT-056 (complete)
> **Authorized by:** founder override, 2026-08-17 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> write-anchor expansion after the Investigation-anchored capture /
> recall loop closed. Replaces the AGENTS.md line that 056 leftover
> is not a sequence and Resource-anchored Resolution remains unearned,
> and the unmet dogfood for `--save`-before-record friction. Does
> **not** authorize Incident, Recommendation, Learning, similarity,
> Investigation lifecycle, MCP writes, or inferred Action.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **resource-specific experience as an explicit write identity**, not
> Incident, not a second Resolution type, not auto-saved Investigation,
> not MCP writes, not inferred Action, not snapshot rewrite
> **Type:** Narrow optional write-anchor on the existing Resolution row
> **Primary goal:** A human can record decision / action / outcome
> against an exact Resource id without first saving an Investigation
> snapshot — same fields, same evidence rules, same append-only row —
> without inferring Action from provider activity, without inventing a
> phantom `inv:` id, and without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. Resource-anchored rows appear on existing
> `investigate_resource` `resolutionMemory` via the 056 subject filter.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 051–056 shipped the smallest honest Investigation-anchored
Operational Memory loop:

```text
051  persist decision / action / outcome on a saved Investigation
052  show those rows on investigate / investigation reopen
053  show the retained field text on those same paths
054  optional human-attached evidence ids on that response
055  retrieve by that exact evidence id on the resolutions list
056  show those rows on investigate_resource
```

Read is already Resource-scoped (`resolutions --resource`, live
`investigate` RESOLUTION MEMORY, MCP `resolutionMemory`). Write still
requires:

```text
investigate <id> --save
resolution --investigation inv:…
```

That is the 051 hang: organizational response is copied onto a
subject, but the write identity is the snapshot.

Sprint 056 leftover:

```text
057+      Resource-anchored Resolution only if earned
          Incident grouping only if earned
          MCP read of snapshots / list_resolutions only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
056 did not earn this slice. AGENTS.md recorded that. This Sprint
takes it only under the founder override below.

It is **not** Incident. A Resource is not an occurrence spanning
Investigations.

It is **not** an auto-saved Investigation. Do not insert a snapshot
in order to keep `investigation_id NOT NULL`.

It is **not** MCP writes. Founder override 2026-08-16 froze those;
this override does not thaw them.

---

# Founder Override

`AGENTS.md` after Sprint 056 recorded that the 056 leftover is not a
sequence and Resource-anchored Resolution remains unearned.
`docs/internal/beta/INVESTIGATION-DOGFOOD.md` Scenario 8 is still
empty. Sequencing Rule 2 still holds: `investigate --save` then
`resolution --investigation` records a response.

On 2026-08-17 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  resource-specific experience. Retrieve by Resource is shipped;
  write by Resource is not.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  the smallest second write identity now that Investigation-anchored
  capture and recall are complete on CLI and MCP, rather than waiting
  for a markdown ledger of `--save` ceremony friction.
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision rule,
  and it does not authorize Incident, Recommendation, Learning,
  similarity, Investigation lifecycle, MCP writes, or inferred Action.
- Same pattern as Sprint 050 → 051 and Sprint 042 → 043: the original
  evidence rule remains on record; the founder override chooses the
  next vertical slice.

`INVESTIGATION-DOGFOOD.md` remains the learning ledger for
capture-shape use.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Sequencing Rules (smallest deterministic
version; is persistence necessary; do not start a generic engine):

```text
exact evidence
    ↓
persist organizational response on Investigation   ← 051
    ↓
recall / retrieve / evidence / MCP recall          ← 052–056
    ↓
persist organizational response on Resource        ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: **persistence is required** for a row with no
Investigation. Do not fake an `inv:` id. Do not auto-save a snapshot.
Do not infer the Resource from newest provider activity.

---

# Problem

After 056, recording still needs a saved snapshot the human may not
want to keep:

```text
combie investigate vercel:project:prj_abc --save
combie resolution --investigation inv:… --decision "Rollback"
```

`resolutions --resource vercel:project:prj_abc` already lists
responses for that subject. Live `investigate` and
`investigate_resource` already show them. The missing claim is the
write identity:

```text
The human named this exact Resource as the subject of this response.
No Investigation snapshot was retained for it.
```

That is the same epistemic class as 051 `--investigation`: explicit
anchor, not inferred. It is **not** “Combie noticed activity on this
Resource and stored a Resolution.”

---

# Product Question

> After Investigation-anchored Resolution capture and Resource-scoped
> recall exist, can a human record decision / action / outcome against
> an exact local Resource id without a saved Investigation — same
> fields, same 054 evidence validation against live `investigate` of
> that Resource, same append-only row — omitted Investigation identity
> when absent, surviving later Resource deletion on list/recall,
> without auto-saving a snapshot, without Incident, without MCP
> writes, and without inferred Action?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names resource-specific
   experience. 051–056 shipped it as a *copied* subject on an
   Investigation-anchored row. The smallest remaining version is a
   Resource write identity.
2. **Founder override 2026-08-17** replaces the unearned gate. 056
   leftover listed this first only *if earned*; the override is the
   earning act, not leftover order.
3. **Existing primitive check:** `--save` then `--investigation` still
   works and must keep working. A second write path is the new claim.
   Do not replace the 051 path.
4. **Sequencing Rule 9:** persistence is required (`investigation_id`
   optional). Read-time cannot invent a Resource-anchored row.
5. **MCP** stays frozen at four read-only tools. 056 subject filter
   already returns these rows. No new field. No writes.

Rejected as 057 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Auto-save Investigation to keep `NOT NULL` | Invents retained composition the human did not ask to keep |
| Sentinel `inv:` / empty-string investigation id | Fake identity; 051 ids are real snapshots |
| Incident grouping | Unearned; Resource ≠ occurrence |
| MCP writes / record via `investigate_resource` | Founder override 2026-08-16; this override does not thaw writes |
| Fifth tool / snapshot MCP | Frozen four-tool contract |
| Investigation lifecycle / `resolved: true` | Status is still a process claim |
| Inferred Action from newest deploy | Forbidden since 051 |
| Similarity / “you should” | v0.8 |
| Updating 051 rows to drop `investigationId` | 051 is append-only; those rows stay Investigation-anchored |
| Both `--investigation` and `--resource` on one record | Two anchors; usage error, not silent pick |
| `--resource` as a filter on `resolution <id>` show | Show stays exact `res:` id |
| Resource-anchored `--evidence` against a different subject | 054 still validates against the named Resource’s live compose |

---

# Exact Capability

```text
combie resolution --resource <resource-id>
        --decision / --action / --outcome   051, still ≥1 required
        [--evidence <id>]                   054, optional, repeatable
        ↓
Resource must exist in the local store
        ↓
validate --evidence against live investigate of that Resource
  (same 054 allowlist; no provider refresh)
        ↓
persist Resolution
  investigationId omitted
  subjectResourceId = the named Resource id
        ↓
051 --investigation path unchanged
```

Exact CLI flag spelling is Phase 1. Expected: reuse `--resource <id>`
on the existing `resolution` record command (same flag family as
`resolutions --resource` and `investigations --resource`). One exact
id.

`--investigation` and `--resource` are **XOR** on record. Both
present: usage error; do not silent-last-wins; do not AND. Neither
present: existing show-if-`res:` positional / usage (051).

`--resource` on `resolutions` (list) remains 051/055. `--resource` on
`resolution` (record) is this Sprint. Different commands.

Constraints:

- At least one of decision / action / outcome remains required.
- Append-only. No UPDATE of existing rows. No rewrite of snapshots.
- Do not insert an `investigations` row.
- Do not invent `investigationId`. Domain field becomes optional.
- Unknown / missing Resource at record time: fail; say what to do
  next (`resources` / `investigate`). Expected: `RESOURCE_NOT_FOUND`,
  not a silent create.
- `--evidence` on a Resource-anchored record uses 054
  `attachableEvidenceIds` for that Resource. Unknown id still
  `EVIDENCE_ID_NOT_FOUND`. Subject that cannot be composed: same 054
  class of error (cannot attach).
- Recording without `--evidence` never attaches newest activity.

Display / recall (read-time; no new section):

- Live `investigate` RESOLUTION MEMORY (subject scope) includes these
  rows. Identity line omits the investigation token when absent.
- `investigation <id>` reopen remains investigation-scoped: does
  **not** include Resource-anchored rows (they have no
  `investigationId`).
- `--compare` unchanged.
- `resolutions --resource` includes them (already subject filter).
- `resolutions --investigation` does not.
- Global `resolutions` includes them. INVESTIGATION column: Phase 1
  pins a non-id placeholder when absent (expected: `-`). Do not print
  a fake `inv:`.
- `resolution <id>` show: omit the INVESTIGATION line when absent;
  SUBJECT remains.
- Record confirmation: omit the investigation line when absent;
  subject line remains.
- MCP `resolutionMemory`: omit `investigationId` when absent (056
  omit-optional). No new MCP key. No writes.

---

# Evidence / Claim Semantics

### KNOWN (about the record)

```text
Combie retained an explicit Resolution for subject <resource-id>
recorded at <recordedAt>. No Investigation snapshot was named.
The decision / action / outcome text is what the human supplied.
```

### UNKNOWN / stale (required)

The Resolution remains **organizational response**, not current
provider authority. Recording against a Resource does not save
composition, does not close an Investigation, and does not prove the
outcome.

If the subject Resource is later deleted, the row remains listable
by that exact `subjectResourceId` (051/050 survival). Live
`investigate` / `investigate_resource` of a missing Resource still
fail as `RESOURCE_NOT_FOUND` (existing compose). List/show by `res:`
id and `resolutions --resource` must not fail as `RESOURCE_NOT_FOUND`.

### Forbidden

```text
Combie saved an Investigation so the Resolution could exist
inv:none / empty investigation id is the Resource-anchored marker
This Resource is now an Incident
resolved: true / the Investigation is closed
Newest deployment is the Action
You should rollback
This has happened before
```

---

# Architecture

```text
resolutions table (051)
  investigation_id  nullable (this Sprint)
  subject_resource_id  NOT NULL (unchanged)
        ↓
recordResolution
  --investigation  051 (unchanged)
  --resource       this Sprint
        ↓
054 evidence validate via live compose of the subject
        ↓
CLI / RESOLUTION MEMORY / MCP 056 omit optional investigationId
```

Ownership:

- **Domain:** `ResolutionRecord.investigationId` becomes optional.
  Do not add a `kind` / `anchor` enum. Absence is the Resource-only
  claim. Do not add Incident.
- **Store:** `investigation_id` nullable. Existing 051 rows keep
  their ids. `CREATE TABLE` for new DBs; existing DBs need an
  upgrade because today’s column is `NOT NULL` (`CREATE TABLE IF NOT
  EXISTS` will not change it). Phase 1 pins the upgrade. Expected:
  rebuild-in-`init()` (copy rows; all current rows have an id).
  **Never** empty string. **Never** a sentinel `inv:`.
- **App:** second record path; 054 `validateEvidenceIds` already
  takes `subjectResourceId`. Resource existence check before insert.
- **CLI:** `--resource` on `resolution` record; XOR with
  `--investigation`. Help: add a Resource-anchored example; keep the
  051 `--investigation` example.
- **MCP:** no new tool; `toResolutionMemoryRow` omits absent
  `investigationId`. `docs/public/MCP.md` unchanged unless Phase 2
  finds the row’s wording now lies (expected: **no** — it already
  says retained resolution memory for that exact subject).

Adapters do not participate.

---

# Persistence vs Read-Time

| 051 Investigation-anchored | 057 Resource-anchored |
| --- | --- |
| `investigationId` + copied subject | subject only |
| Snapshot must exist at record | Resource must exist at record |
| 054 evidence vs that subject’s compose | same, vs named Resource |

Must **not**:

- auto-insert Investigation snapshots
- UPDATE 051 rows
- rewrite snapshot JSON
- infer Resource from activity
- thaw MCP writes
- add an Evidence or Incident table
- mix into Known Facts

---

# Boundedness

- One new write identity. 051 path byte-stable except help/usage
  strings that must mention `--resource`.
- Exact Resource id. No name search, no glob.
- One `--resource` id on record. Not repeatable.
- XOR with `--investigation` on record.
- No fact-budget involvement.
- No extra hop. No provider calls.
- No MCP writes. No fifth tool.
- No `--compare` section.
- No Investigation lifecycle.

---

# Failure / Unknown Semantics

- Uninitialized store: same as other write commands.
- Missing / blank `--resource` value: usage error.
- Both `--investigation` and `--resource`: usage error.
- Unknown Resource id: `RESOURCE_NOT_FOUND`; do not insert.
- Unknown Investigation id on the 051 path: unchanged
  `INVESTIGATION_NOT_FOUND`.
- `--evidence` unknown: 054 `EVIDENCE_ID_NOT_FOUND`.
- `--evidence` when Resource cannot be composed: 054 class of error.
- Zero fields among decision/action/outcome: 051
  `RESOLUTION_FIELDS_REQUIRED`.
- Pre-057 DB `NOT NULL` investigation_id: upgrade on `init()`; do
  not crash; 051 rows remain valid.
- Resource deleted after record: list/show survive; live compose of
  that id still `RESOURCE_NOT_FOUND`.

---

# Affected Surfaces

### CLI

- `resolution --resource <id> --decision/--action/--outcome [--evidence]`
- Help: one Resource-anchored record example; 051 investigation
  example remains.
- `resolution --investigation …` unchanged in behavior.
- `resolutions` list: placeholder for missing investigation id.
- `resolution <id>` show / confirmation / subject-scoped RESOLUTION
  MEMORY: omit investigation identity when absent.
- `investigation <id>` reopen: still investigation-scoped only.

### MCP

Unchanged four tools. `resolutionMemory` already subject-scoped;
omit `investigationId` when absent. No writes. No `docs/public/MCP.md`
change expected.

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-051 write path, SPRINT-054 evidence validation,
SPRINT-056 `toResolutionMemoryRow`, and inspect:

- `src/domain/resolution.ts`, `src/app/resolutions.ts`
  `recordResolution`, store `insertResolution` /
  `investigation_id TEXT NOT NULL`
- CLI `resolution` record vs show vs `resolutions --resource`
- whether `flags.resource` is already parsed on `resolution` and
  ignored (055-class silent flag)
- 054 `validateEvidenceIds` / `RESOURCE_NOT_FOUND` during attach
- list / show / confirmation / memory identity lines that assume
  `investigationId` is always a string
- MCP `toResolutionMemoryRow` always setting `investigationId`

Report:

1. Flag: `--resource <id>` on `resolution` record? Expected: **yes.**
   One exact id. XOR with `--investigation`.
2. Silent existing `flags.resource` on record? Pin: honor it as this
   Sprint’s write identity, or it was unused — do not keep ignoring.
3. Resource existence: store Resource row vs successful
   `getInvestigationContext`? Expected: **Resource row required.**
   Compose is only required when `--evidence` is present (054).
4. `investigationId` optional in domain / SQL NULL? Expected:
   **yes.** Never `""`, never sentinel `inv:`.
5. Existing DB `NOT NULL` upgrade? Pin one (expected: rebuild in
   `init()`). 051 rows keep ids.
6. List column when null? Expected: **`-`.** Show/confirmation/memory
   omit the investigation line/token.
7. MCP omit `investigationId` when absent? Expected: **yes.**
8. Reopen investigation-scoped memory excludes these rows? Expected:
   **yes.**
9. Live investigate / `investigate_resource` include them via subject
   filter? Expected: **yes.**
10. Auto-save snapshot / MCP writes / inferred attach? Expected:
    **no.** 051 `--investigation` path behavior unchanged.

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **yes** (nullable
   `investigation_id`). A fake Investigation is not persistence of
   this claim.
2. Second source of truth? No. Same 051 table. Two write identities,
   one row shape.
3. Does Resource-anchored leak “this Resource is an Incident”? **No.**
   Still a Resolution. Still not lifecycle.
4. Does omitting Investigation leak “you should”? **No.** Same
   organizational-response label.
5. MCP tool / write needed? Expected: **no.**
6. Compare section? Expected: **no.**
7. Evidence table / Incident model? Expected: **no.**
8. Drop `investigation_id` from 051 rows? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline only.
   ROADMAP already names resource-specific experience — do not edit
   ROADMAP to add a Resolution heading.

If implementation is tempted to `investigate --save` internally, to
store `""` / `inv:none`, to thaw MCP writes, to treat the Resource as
an Incident, or to infer `--resource` from newest activity: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- 051 `--investigation` record/show/list/recall unchanged
- `--resource` records a row with omitted `investigationId` and the
  named `subjectResourceId`
- ≥1 of decision/action/outcome still required
- both `--investigation` and `--resource`: usage error; no insert
- missing / blank `--resource`: usage error
- unknown Resource: `RESOURCE_NOT_FOUND`; no insert
- `--evidence` valid for that subject: persists (054)
- `--evidence` unknown: `EVIDENCE_ID_NOT_FOUND`; no insert
- omitted `--evidence` never attaches newest activity
- `resolutions --resource` lists the row
- `resolutions --investigation <any>` does not list it
- global list shows `-` (or Phase 1 placeholder) in INVESTIGATION
- `resolution <id>` show omits INVESTIGATION line; SUBJECT present
- confirmation omits investigation line
- live `investigate` RESOLUTION MEMORY includes it; identity line
  has no `inv:` token
- `investigation <id>` reopen does **not** include it
- `--compare` unchanged
- `--save` snapshot JSON unchanged
- MCP `investigate_resource` includes the row; `investigationId` key
  omitted; still four tools; DB digest unchanged
- subject Resource deleted after record: `resolutions --resource`
  still lists (not `RESOURCE_NOT_FOUND`); live investigate of that
  id still `RESOURCE_NOT_FOUND`
- pre-057 `NOT NULL` DB: `init()` upgrade; 051 rows still load
- no MCP write tool

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
# 051 path still works
investigate <id> --save
resolution --investigation <inv> --decision "…"

# this Sprint
resolution --resource <id> --decision "…" --action "…" --outcome "…"
           --evidence <native-id>
resolutions --resource <id>          # both rows if same subject
investigate <id>                     # RESOLUTION MEMORY includes Resource-anchored
investigation <inv>                  # investigation-scoped only (051 row)
investigation <inv> --compare        # no new section
# MCP investigate_resource: row present, investigationId omitted
resolution --investigation <inv> --resource <id>   # usage error
```

---

# Explicit Non-Goals

Do **not** implement:

- auto-saving an Investigation to satisfy `NOT NULL`
- sentinel / empty `investigationId`
- MCP writes or a fifth tool
- Incident model or linking
- Investigation lifecycle / `resolved: true`
- inferred Action / `--resource` / `--evidence` from provider activity
- similarity, “you should”, Learning, Recommendation
- putting Resolutions on `InvestigationContext` or `snapshot_json`
- Resolution section on `--compare`
- updating 051 rows to drop their investigation id
- Resource-anchored Resolution as a new type or table
- Evidence table, MemoryEngine, RecommendationEngine
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
051       explicit Resolution capture + list                       ✅
052       exact-id Resolution recall on investigate / reopen       ✅
053       Resolution body recall on those same paths               ✅
054       explicit evidence references on a Resolution             ✅
055       retrieve Resolutions by exact evidence id                ✅
056       Resolution recall on investigate_resource                ✅
057       Resource-anchored Resolution                             ← this
058+      Incident grouping only if earned
          MCP read of snapshots / list_resolutions only if earned
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
  `investigate_resource` (exactly four; still read-only; no writes)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 051 `--investigation` write still requires a saved snapshot; still
  ≥1 of decision/action/outcome; append-only
- 054 `--evidence` validation unchanged (live compose of the subject)
- 055 `resolutions --evidence` unchanged
- 056 `resolutionMemory` subject filter unchanged (omit optional
  `investigationId`)
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

Required. Today `investigation_id TEXT NOT NULL`. Resource-anchored
rows need NULL.

Phase 1 pins the `init()` upgrade. Expected: rebuild `resolutions`
so the column is nullable; copy existing rows unchanged. New DBs:
`CREATE TABLE` with nullable `investigation_id`.

Pre-051 missing table: empty, then new schema on create.

If implementation is tempted to keep `NOT NULL` and insert a snapshot
or `""`: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 057 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `resolution --resource <id>` records an append-only
      Resolution with omitted `investigationId`; 051 path unchanged;
      XOR with `--investigation`; Resource must exist at record time
- [x] if earned: no auto-saved snapshot; no sentinel id; no MCP write;
      no Incident; no inferred Action; recall via existing subject
      filters; investigation reopen stays investigation-scoped
- [x] if not earned: rejection documented; do not fake an Investigation
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline

---

# Final Principle

> **Sprint 051 hung organizational response on a saved Investigation.
> Sprint 057 may hang the same response on an exact Resource instead.
> Combie must not invent a snapshot, must not invent an Investigation
> id, and must not treat the Resource as an Incident.**

---

# Completion Notes

## Baseline (2026-08-17)

```text
HEAD:          cf8d1547ec902bc597930b7af8341e7543afcc46
               (056 complete; 057 activation edits were present
               but uncommitted at baseline)
tests:         929 pass across 77 files (3927 expect() calls)
typecheck:     clean
worktree:      activation edits (AGENTS.md, SPRINT-056.md,
               SPRINT-057.md) + implementation after Red
MCP:           exactly four read-only tools
Sprint 056:    Complete
Sprint 057:    Active (single Active sprint)
```

## Repository Understanding

1. **Flag: `--resource <id>` on `resolution` record.** One exact id.
   XOR with `--investigation` at both CLI and `recordResolution`.
2. **Silent existing `flags.resource`:** the flag was globally parsed
   and ignored on `resolution` record. Honored as this Sprint's write
   identity — not left as a silent no-op.
3. **Resource existence:** `store.getResource`. Compose runs only when
   `--evidence` is present (054 `validateEvidenceIds`).
4. **`investigationId` optional:** domain field optional; SQL NULL;
   mapper omits empty. Never `""`, never sentinel `inv:`.
5. **Existing DB `NOT NULL` upgrade:** rebuild `resolutions` in
   `init()` (`ensureResolutionsInvestigationIdNullable`). 051 rows
   keep their ids. New DBs use nullable `CREATE TABLE`.
6. **List column when null: `-`.** Show, confirmation, and subject-
   scoped RESOLUTION MEMORY omit the investigation line/token.
7. **MCP omit `investigationId` when absent:** `toResolutionMemoryRow`
   already omitted optional fields; Resource-anchored rows now hit
   that path.
8. **Reopen investigation-scoped memory excludes these rows:**
   `listResolutions({ investigationId })` does not match NULL.
9. **Live investigate / `investigate_resource` include them** via
   existing `subjectResourceId` filter.
10. **No auto-save, no MCP writes, no inferred attach.** 051
    `--investigation` path still copies `investigationId` from the
    saved snapshot.

## Architecture Pressure

1. **Persistence necessary? Yes.** Nullable `investigation_id`. A fake
   Investigation would not persist this claim.
2. **Second source of truth? No.** Same 051 table. Two write
   identities, one row shape. No `kind` / `anchor` enum.
3. **Does Resource-anchored leak “this Resource is an Incident”? No.**
   Still a Resolution. Still not lifecycle.
4. **Does omitting Investigation leak “you should”? No.** Same
   organizational-response label.
5. **MCP tool / write needed? No.**
6. **Compare section? No.**
7. **Evidence table / Incident model? No.**
8. **Drop `investigation_id` from 051 rows? No.** Append-only.
9. **Canon change? AGENTS.md operational baseline only.** ROADMAP
   already names resource-specific experience — not edited.

## Implemented

- `ResolutionRecord.investigationId` optional (`src/domain/resolution.ts`)
- `resolutions.investigation_id` nullable; `init()` rebuild for
  pre-057 `NOT NULL` tables; insert binds SQL NULL; mapper omits
  empty (`src/storage/store.ts`)
- `recordResolution` XOR anchors: `--investigation` copies subject
  from the snapshot (051); `--resource` requires an existing Resource
  row and omits `investigationId`; 054 evidence validation unchanged
  (`src/app/resolutions.ts`)
- List placeholder `-`; show / confirmation / subject-scoped memory
  omit the investigation identity when absent; known-empty subject
  copy names `--resource`
- CLI: `--resource` on `resolution` record, XOR usage errors, help
  example kept beside the 051 `--investigation` example
  (`src/cli/index.ts`)
- MCP: `toResolutionMemoryRow` omits absent `investigationId`
  (`src/mcp/tools.ts`)

## Deviations

- None material. Known-empty copy for `resolutions --resource` now
  names `--resource` as the record path (still exact-id, still not
  inferred). Global empty list mentions both write identities.

## Validation

```text
bun test:          945 pass across 77 files (4013 expect() calls;
                   was 929 pass / 3927 at baseline)
bun run typecheck: clean
git diff --check:  clean
MCP tools:         get_related_context, investigate_resource,
                   list_providers, list_resources
Red:               new tests in tests/app/resolutions.test.ts,
                   tests/cli/commands.test.ts,
                   tests/app/compare-investigation.test.ts,
                   tests/app/mcp-protocol.test.ts failed before
                   implementation
live (isolated):   051 --save + --investigation still records with
                   investigation line → 057 --resource confirmation
                   omits investigation; show omits INVESTIGATION;
                   EVIDENCE attaches native id → resolutions
                   --resource lists both (057 INVESTIGATION column
                   `-`) → XOR both flags usage error exit 1 → live
                   investigate RESOLUTION MEMORY includes 057 row
                   without inv: token; 051 row still has inv id →
                   investigation reopen investigation-scoped only
                   (051 row) → --compare has no Resolution/EVIDENCE
                   section → MCP investigate_resource: 057 row
                   omits investigationId; four tools; DB SHA-256
                   unchanged
```

## Learnings

- `flags.resource` was already parsed globally and ignored on
  `resolution` record — the 055-class silent-flag trap. Honoring it
  is the write identity; leaving it ignored would have been a
  second silent no-op.
- SQLite cannot `ALTER COLUMN` to drop `NOT NULL`. Rebuild-in-`init()`
  copies rows unchanged and never invents an investigation id; that
  is the honest persistence of “omitted,” not a fake `inv:`.
- Investigation-scoped list already filtered `investigation_id = ?`,
  so Resource-anchored NULL rows were excluded with no extra query
  work. Subject-scoped recall was already the 052/056 path.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md baseline
becomes Sprints 001–057 complete (shipped bullet + v0.7 paragraph).
Sprint 058 is not started.
