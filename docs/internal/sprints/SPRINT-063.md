# SPRINT-063 — Retrieve Incidents by Exact Investigation Id

> **Status:** Complete
> **Depends on:** SPRINT-062 (complete)
> **Authorized by:** founder override, 2026-08-18 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> remaining Incident list-retrieve slice after `--resolution` /
> `--resource` exist. Replaces the AGENTS.md line that 062 leftover
> is not a sequence and `incidents --investigation` retrieve remains
> unearned. Does **not** authorize Recommendation, Learning,
> similarity, Investigation lifecycle, MCP writes, inferred Action,
> grouping Investigation snapshots as members, cross-resource
> `resolution --incident`, or member removal.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **exact-id retrieval of retained Incidents from the existing
> `incidents` list by Investigation**, not a fifth tool, not snapshot
> MCP, not MCP writes, not lifecycle, not inferred co-occurrence,
> not snapshot rewrite
> **Type:** Narrow read-time filter over already-persisted Incident
> rows
> **Primary goal:** List retained Incidents whose named Resolution
> members include a row recorded against one exact `inv:` id — the
> 060 shape for the 059 investigation membership helper — without
> inferring a grouping, without a new list command, and without
> thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No `list_incidents` tool. No writes. `incidentMemory`
> on `investigate_resource` stays 059. Investigation reopen stays
> 059 membership (this Sprint is the list command).
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 058–062 shipped grouping, investigate-path recall, list
retrieve by resolution / resource, Incident-anchored write, and
add-existing-members:

```text
incident --resolution res:a --resolution res:b
incident <inc> --resolution res:d
incidents [--resolution|--resource]
resolution --incident <inc>
INCIDENT MEMORY / incidentMemory
```

The global `incidents` list still cannot answer:

```text
Which retained groupings include a response recorded against
this exact inv: id?
```

059 already answers that on `investigation <id>` reopen
(`listIncidentsForInvestigation`). 060 lifted `--resolution` /
`--resource` onto the list and froze `--investigation` as usage.

Sprint 062 leftover:

```text
063+      incidents --investigation retrieve only if earned
          group Investigations directly only if earned
          Incident-anchored write for cross-resource Incidents
            only if earned
          member removal / retitle only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
062 did not earn this slice. AGENTS.md recorded that. 060 froze
`incidents --investigation`. This Sprint takes it only under the
founder override below.

It is **not** grouping Investigation snapshots as Incident members.
Members stay `res:` ids.

It is **not** a fifth MCP tool or snapshot MCP.

It is **not** cross-resource `resolution --incident`. 061
`INCIDENT_SUBJECT_AMBIGUOUS` stays.

It is **not** member removal, retitle, MCP writes, lifecycle, or
inferred members.

It is **not** `incident_id` on `resolutions`. Membership stays the
058 array; this Sprint is read-time over member
`investigationId` (051), same as 059.

---

# Founder Override

`AGENTS.md` after Sprint 062 recorded that the 062 leftover is not a
sequence and `incidents --investigation` retrieve remains unearned.
Sequencing Rule 2 still holds: `investigation <id>` reopen already
recalls INCIDENT MEMORY by investigation membership; `incidents
--resolution` / `--resource` already retrieve on the list.

On 2026-08-18 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  organizational precedent retrieval. Investigation-scoped recall
  exists on reopen; the same membership is missing from the list
  already in use.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  the 060-shaped hole now that `listIncidentsForInvestigation`
  exists, rather than waiting for a ledger of “I had to reopen the
  snapshot or already know the `inc:` id.”
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision rule,
  and it does not authorize Recommendation, Learning, similarity,
  Investigation lifecycle, MCP writes, inferred Action, grouping
  snapshots as members, cross-resource `resolution --incident`, or
  member removal.
- Same pattern as Sprint 059 → 060 and 061 → 062: the original
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
persist organizational response                    ← 051 / 057
    ↓
recall / retrieve Resolution                       ← 052–056
    ↓
group existing responses as one occurrence         ← 058 / 062
    ↓
recall that grouping on investigate                ← 059
    ↓
retrieve that grouping from the list               ← 060 by res:/resource
    ↓
retrieve that grouping by investigation            ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: persistence is **not** necessary. Read-time
membership over the 058 table and member `investigationId` (051).
Do not add `incident_id`. Do not copy an Investigation onto the
Incident row.

Sequencing Rule 8: membership has one source of truth — the 058
array. Investigation filter is “any named member was recorded
against this `inv:`”, not a second grouping column.

Sequencing Rule 2: reopen INCIDENT MEMORY already uses
`listIncidentsForInvestigation`. This Sprint displays that
predicate on `incidents`.

---

# Problem

After mixed 051/057 members are grouped:

```text
resolution --investigation inv:… --decision "Rollback"     # res:a
resolution --resource <id> --decision "Hold deploys"       # res:b
incident --resolution res:a --resolution res:b
```

`investigation inv:…` reopen shows the grouping in INCIDENT MEMORY.
`incidents --resolution res:a` lists it. `incidents --investigation
inv:…` is still usage:

```text
incidents lists retained groupings; it does not filter by
--investigation.
```

The missing claim is the 060 shape for Investigation:

```text
The human asked which retained groupings include a response
recorded against this exact Investigation.
```

That is explicit membership over member `investigationId`, not
inferred. It is **not** “Combie listed every Incident on the same
subject as this snapshot.”

---

# Product Question

> After explicit Incidents group existing Resolution ids, can Combie
> list retained groupings from the existing `incidents` command whose
> members include a Resolution recorded against one exact `inv:` id
> — 059 membership, 060 list shape, known-empty when none, AND with
> `--resolution` / `--resource` — without inferred members, without
> MCP writes, without a fifth tool, without grouping snapshots as
> members, and without cross-resource `resolution --incident`?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names organizational
   precedent retrieval. 060 retrieved by resolution / resource. The
   remaining list identity is Investigation.
2. **Founder override 2026-08-18** replaces the unearned gate. 062
   leftover listed this first only *if earned*; the override is the
   earning act, not leftover order.
3. **Existing primitive check:** `listIncidentsForInvestigation`
   already implements the predicate for reopen. Display on
   `incidents` is the new claim. Do not replace INCIDENT MEMORY.
4. **Sequencing Rule 9:** persistence is **not** required.
5. **MCP** stays four read-only tools. List retrieve is CLI.

Rejected as 063 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | Members stay `res:` ids |
| Cross-resource `resolution --incident` | 061 freeze |
| Member removal / retitle | Different mutate |
| Fifth tool / `list_incidents` | Frozen; CLI list already exists |
| MCP writes / snapshot MCP | Frozen |
| Investigation / Incident lifecycle | Status is still a process claim |
| Similarity / inferred members | Forbidden |
| `incident_id` on `resolutions` | Second source of truth |

---

# Exact Capability

```text
combie incidents
        ↓
list all Incident summaries (058, unchanged)

combie incidents --investigation <inv-id>
        ↓
list Incident summaries whose members include a Resolution
  with that exact investigationId
  (same membership as 059 listIncidentsForInvestigation)
        ↓
same 058 columns: id, title, member count, recordedAt
  order: recordedAt DESC, id DESC

combie incidents --investigation <inv-id> --resolution <res-id>
combie incidents --investigation <inv-id> --resource <resource-id>
combie incidents --investigation <inv-id> --resolution <res-id> --resource <resource-id>
        ↓
AND of the named predicates (060 shape)
```

Exact CLI flag spelling is Phase 1. Expected: reuse
`--investigation` on the existing `incidents` command (lift the
060 usage freeze).

- `--investigation` on `resolution` (record) stays 051 write.
- `--investigation` on `resolutions` (list) stays 051 list.
- `--investigation` on `incidents` (list) is this Sprint’s filter.
  Different commands. One exact id on the list. Repeatable
  `--investigation` on `incidents` is usage (060 `--resolution`).
- Blank / boolean `--investigation`: usage, exit 1.
- `--resolution` / `--resource` on `incidents` unchanged when
  `--investigation` is absent (060).

Unfiltered `incidents` remains the global list (058).

`incident <id>` show, `incident --resolution` create / 062 append,
live `investigate`, `investigation <id>` reopen, `--compare`, and
`investigate_resource` are unchanged.

List contents remain **058 summaries**: id, title placeholder `-`,
member **count**, recordedAt. Do not add a member-id essay column.
Show is still `incident <id>`.

Known-empty (exit 0, never `INVESTIGATION_NOT_FOUND` /
`RESOURCE_NOT_FOUND` / `RESOLUTION_NOT_FOUND` / `INCIDENT_NOT_FOUND`):

- `--investigation` with zero matching Incidents, including an
  unknown or later-deleted `inv:` id
- AND combinations that match nothing

Phase 1 pins the known-empty copy. Expected: distinct from the
global “No incidents recorded yet.” line and from the 060
resolution / subject copies, naming the filter id(s), stating this
is known-empty for that exact identity.

Membership (read-time; reuse 059):

- **`--investigation`:** any named member Resolution has that
  exact `investigationId`. Mixed 051+057 grouping **appears**
  (059). Resource-anchored-only grouping does **not**. 061
  incident-anchored rows omit `investigationId` and do not by
  themselves match.
- Missing member Resolution rows: skip for investigation match
  (059 skip). The grouping is omitted if no remaining member
  matches.
- Deleted Investigation snapshot: Resolution rows still carry
  `investigationId`; the filter still matches (list retrieve
  survives snapshot deletion, never `INVESTIGATION_NOT_FOUND`).
- **AND with `--resolution`:** stored member id array includes that
  exact `res:` (060; row need not still exist) **and** the
  investigation predicate.
- **AND with `--resource`:** 059 subject membership **and** the
  investigation predicate. The matching investigation member need
  not itself be on the named subject if another member is
  (cross-resource grouping is the 058 claim).
- Do not infer extra members.

---

# Evidence / Claim Semantics

### KNOWN (about the list)

```text
Combie has these retained Incidents whose named Resolution members
include a response recorded against this exact Investigation. The
human named the members and the Investigation.
```

### UNKNOWN / stale (required)

The list is **retained organizational grouping**, not proof the
occurrence is still current, not a proven outage, and not current
provider authority.

A filter id that is unknown, deleted, or never used as a write
identity is known-empty for that id, not a command failure.

### Forbidden

```text
You should rollback
These are similar incidents
This Investigation is now an Incident
resolved: true / this investigation is closed
Combie grouped these because they share an investigation
No incident found: inv:…   (that is show, not list)
```

---

# Architecture

```text
incidents table (058)                      unchanged
resolutions.investigation_id (051)         unchanged
        ↓
listIncidentsForInvestigation              059, reuse
listIncidentsFiltered + investigationId    this Sprint AND
        ↓
formatIncidentList (known-empty copy)      this Sprint
        ↓
CLI incidents --investigation
```

Ownership:

- **Domain / Store:** no new type. No `incident_id`. Do not
  denormalize Investigation onto the Incident row.
- **App:** add `investigationId` to `ListIncidentsOptions` /
  `listIncidentsFiltered`. Reuse 059 membership. Known-empty list
  copy for the new filter (and AND combinations).
- **CLI:** lift the 060 rejection of `--investigation` on
  `incidents`. One exact id. Help list line + example.
- **MCP / Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to add `incident_id`, to group
`inv:` ids as members, to thaw MCP writes, or to add a fifth
tool: **STOP.**

---

# Persistence vs Read-Time

| Snapshot | Incident list retrieve | Live compose |
| --- | --- | --- |
| Frozen InvestigationContext | Read-time membership | Current local compose |
| 048 JSON | 058 table + 051 `investigationId` | Not a snapshot |

Retrieve must **not**:

- rewrite snapshot JSON
- insert or append Incidents / Resolutions
- create Relationships or Changes
- refresh providers
- add MCP tools or writes
- copy `investigationId` onto the Incident row

---

# Boundedness

- One existing list flag on `incidents`. No new command.
- One exact `inv:` id. Repeatable is usage.
- AND with existing 060 flags. No OR. No substring.
- No `list_incidents` MCP tool. No snapshot MCP.
- No grouping of Investigation snapshots as members.
- No change to compare, snapshot schema, or MCP tools.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- Blank `--investigation`: usage, exit 1.
- Repeatable `--investigation` on the list: usage, exit 1.
- Unknown / unused `inv:`: known-empty, exit 0 — never
  `INVESTIGATION_NOT_FOUND`.
- Pre-058 missing `incidents` table: known-empty, no crash.
- 060 `--resolution` / `--resource` paths unchanged when
  `--investigation` is absent.

---

# Affected Surfaces

### CLI

- `incidents --investigation <inv-id>` list
- AND with `--resolution` / `--resource`
- known-empty copy for the investigation filter (and AND)
- help: list line + `incidents --investigation inv:…`
- 060 `--resolution` / `--resource` unchanged when the new flag
  is absent
- `investigation <id>` reopen INCIDENT MEMORY unchanged (059)

### MCP

Four tools. No writes. No new fields. `docs/public/MCP.md`
unchanged unless Phase 1 finds a lie (expected: **no**).

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-059 `listIncidentsForInvestigation`, SPRINT-060
`--resolution` / `--resource` / AND / known-empty, SPRINT-062 leftover,
and inspect:

- CLI `incidents`: `--investigation` currently usage
- `ListIncidentsOptions` / `listIncidentsFiltered`
- `formatIncidentList` known-empty copies
- 059 mixed vs resource-only investigation membership
- MCP four-tool freeze

Report:

1. CLI: `incidents --investigation <inv-id>` list, one exact id?
   Expected: **yes.**
2. Reuse 059 `listIncidentsForInvestigation` membership?
   Expected: **yes.** Mixed grouping appears; resource-only does
   not.
3. AND with `--resolution` / `--resource`?
   Expected: **yes.**
4. Known-empty exit 0, never `INVESTIGATION_NOT_FOUND`?
   Expected: **yes.** Distinct copy.
5. Repeatable / blank `--investigation` usage? Expected: **yes.**
6. 060 filters unchanged when `--investigation` absent?
   Expected: **yes.**
7. Reopen INCIDENT MEMORY unchanged? Expected: **yes.**
8. `incident_id` / Investigation copied onto Incident?
   Expected: **no.**
9. List stays 058 summaries (count, not member essays)?
   Expected: **yes.**
10. Group snapshots as members, MCP writes, fifth tool,
    cross-resource `resolution --incident`, member removal,
    lifecycle? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **No** — read-time membership.
2. Second source of truth? **No** if the predicate stays member
   `investigationId` over the 058 array.
3. Does list retrieve leak “this Investigation is an Incident”?
   **No** if members stay `res:` ids and show stays Incident-shaped.
4. Does AND leak inferred members? **No** if only named flags
   apply.
5. MCP tool / write needed? Expected: **no.**
6. Compare / snapshot change? Expected: **no.**
7. `incident_id` / denormalized Incident investigation?
   Expected: **no.**
8. Lifecycle / group snapshots as members? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + CLI
   help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

If implementation is tempted to add `incident_id`, to store
`inv:` ids as members, to thaw MCP writes, or to add a fifth
tool: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- `incidents --investigation <inv>` lists groupings with a 051
  member on that id; omits resource-anchored-only groupings
- mixed 051+057 grouping appears (059)
- 061 incident-anchored-only grouping does not appear
- unknown `inv:` is known-empty, exit 0, never
  `INVESTIGATION_NOT_FOUND`
- deleted Investigation snapshot: matching rows still list
- missing member Resolution rows: skip (059); unmatched omitted
- AND with `--resolution` / `--resource` / both
- known-empty copies distinct per filter (and AND)
- one exact id; repeatable / blank usage exit 1
- 060 `--resolution` / `--resource` unchanged when
  `--investigation` absent
- unfiltered `incidents` unchanged
- list summaries stay 058-shaped (count, not essays)
- reopen INCIDENT MEMORY unchanged
- `--compare` / snapshot JSON / MCP four tools / no writes
- help lists the investigation list line and example

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
investigate <id> --save
resolution --investigation <inv> --decision "Rollback"
resolution --resource <id> --decision "Hold deploys"
incident --resolution <res-a> --resolution <res-b> --title "…"
investigation <inv>              # INCIDENT MEMORY unchanged
incidents                        # unfiltered unchanged
incidents --resolution <res-a>   # 060 unchanged

# this Sprint
incidents --investigation <inv>  # that grouping; summaries only
incidents --investigation <inv> --resource <id>
incidents --investigation inv:missing   # known-empty, exit 0

# bounds
incidents --investigation <inv> --investigation <inv>  # usage
resolution --incident <cross-inc> --decision "…"       # still SUBJECT_AMBIGUOUS
```

---

# Explicit Non-Goals

Do **not** implement:

- grouping Investigation snapshots as Incident members
- cross-resource `resolution --incident`
- member removal / retitle
- `incident_id` on Resolution rows
- denormalized investigation on Incident
- MCP writes or a fifth tool
- snapshot MCP / `list_incidents`
- Investigation or Incident lifecycle / `resolved: true`
- Incident section on `--compare`
- putting Incidents on `InvestigationContext` or `snapshot_json`
- similarity, “you should”, Learning, Recommendation
- inferred members from subject / evidence / time
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
057       Resource-anchored Resolution                             ✅
058       explicit Incident grouping of existing Resolutions       ✅
059       Incident recall on investigate / investigate_resource    ✅
060       incidents --resolution / --resource list retrieve        ✅
061       Incident-anchored Resolution write (`resolution
            --incident`)                                           ✅
062       add existing members after Incident record               ✅
063       incidents --investigation list retrieve                  ← this
064+      group Investigations directly only if earned
          Incident-anchored write for cross-resource Incidents
            only if earned
          member removal / retitle only if earned
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
  `investigate_resource` (exactly four; still read-only; no writes;
  `incidentMemory` / `resolutionMemory` filters unchanged)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 058 create / 062 append unchanged
- 059 INCIDENT MEMORY on reopen / `investigate_resource` unchanged
- 060 `--resolution` / `--resource` unchanged when
  `--investigation` is absent
- 061 `resolution --incident` unchanged (homogeneous-subject copy)
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None required. No new column. Membership stays `resolution_ids`.
Investigation identity stays `resolutions.investigation_id`.

If implementation is tempted to add `incident_id` on `resolutions`
or to store `inv:` ids as Incident members: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 063 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `incidents --investigation` lists by 059
      membership; known-empty exit 0; AND with 060 flags; 058
      summaries
- [x] if earned: no inferred members; no lifecycle; no MCP writes;
      060 filters unchanged when `--investigation` absent; reopen
      INCIDENT MEMORY unchanged
- [x] if not earned: rejection documented; do not infer a grouping
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 059 remembered which groupings include a response hung
> on a saved Investigation. Sprint 060 retrieved groupings from
> the list by resolution and resource. Sprint 063 may retrieve
> those same groupings by the Investigation the human already
> named. Combie must not invent the grouping, must not treat an
> Investigation as an Incident, and must not store a second
> membership column.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `7e302ef` (authoring-only working tree). Pins:

1. CLI `incidents --investigation <inv-id>` list, one exact id —
   **yes** (was usage).
2. Reuse 059 `listIncidentsForInvestigation` membership — **yes.**
   Mixed 051+057 grouping appears; resource-anchored-only does not.
   061 incident-anchored rows omit `investigationId` and do not
   match by themselves.
3. AND with `--resolution` / `--resource` — **yes.**
4. Known-empty exit 0, never `INVESTIGATION_NOT_FOUND` — **yes.**
   Distinct copy naming the filter id(s).
5. Repeatable / blank `--investigation` usage — **yes.**
6. 060 filters unchanged when `--investigation` absent — **yes.**
7. Reopen INCIDENT MEMORY unchanged — **yes** (same helper).
8. `incident_id` / Investigation copied onto Incident — **no.**
9. List stays 058 summaries (count, not member essays) — **yes.**
10. Group snapshots as members, MCP writes, fifth tool,
    cross-resource `resolution --incident`, member removal,
    lifecycle — **no.**

## Phase 2 — Architecture Pressure

1. Persistence necessary? **No** — read-time membership.
2. Second source of truth? **No.** Predicate stays member
   `investigationId` over the 058 array.
3. List retrieve leak “this Investigation is an Incident”? **No.**
4. AND leak inferred members? **No.**
5. MCP tool / write needed? **No.**
6. Compare / snapshot change? **No.**
7. `incident_id` / denormalized Incident investigation? **No.**
8. Lifecycle / group snapshots as members? **No.**
9. Canon? AGENTS.md + CLI help only.

No STOP conflict.

## Implemented

- `incidents --investigation <inv-id>`: list retained groupings
  whose named members include a Resolution recorded against that
  exact `inv:` (059 membership). App:
  `ListIncidentsOptions.investigationId` + AND in
  `listIncidentsFiltered`. `listIncidentsForInvestigation` is a
  wrapper over that filter (reopen unchanged).
- Mixed 051+057 grouping appears. Resource-anchored-only and
  061-incident-anchored-only do not. Missing member rows skip
  (059). Deleted Investigation snapshot still matches because
  Resolution rows keep `investigationId`.
- AND with `--resolution` / `--resource` / both (060 shape).
- Known-empty exit 0, never `INVESTIGATION_NOT_FOUND`. Distinct
  copies for investigation alone and AND combinations.
- One exact id. Repeatable / blank `--investigation` is usage.
  060 `--resolution` / `--resource` unchanged when the new flag
  is absent. Unfiltered `incidents` unchanged. List stays 058
  summaries (count, not essays).
- Help: `--investigation` “With incidents” line +
  `incidents --investigation inv:…`.
- MCP four tools, no writes. No `incident_id` column.

## Deviations

- None material. Cross-resource `resolution --incident` freeze
  remains `INCIDENT_SUBJECT_AMBIGUOUS`; user-facing copy names
  the spanning subjects rather than the code string.

## Validation

```text
baseline:          7e302ef docs(sprints): mark 062 complete
                   1029 pass / 78 files / 4626 expect()
bun test:          1040 pass across 78 files (4725 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-063-dogfood.* (never ./.combie)
                   investigate --save → resolution --investigation
                   + --resource → incident group → resource-only
                   grouping → reopen INCIDENT MEMORY (mixed only)
                   → unfiltered incidents unchanged → 060
                   --resolution unchanged → incidents
                   --investigation (mixed only; summaries) → AND
                   --resource → inv:missing known-empty exit 0 →
                   repeatable usage → blank usage →
                   cross-resource --incident SUBJECT_AMBIGUOUS →
                   --compare unchanged → no incident_id
```

## Learnings

- The 060 usage freeze was the only missing claim. 059 already
  implemented the membership predicate; displaying it on
  `incidents` did not require a new table or a second grouping
  identity.
- Investigation-anchored list retrieve is membership over member
  `investigationId`, not “every Incident on the same subject as
  this snapshot.” Resource-anchored-only groupings correctly stay
  off that list.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–063 complete.
Sprint 064 is not started. Grouping Investigation snapshots as
Incident members remains unearned.

