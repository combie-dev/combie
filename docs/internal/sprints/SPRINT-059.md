# SPRINT-059 — Incident Recall on investigate

> **Status:** Complete
> **Depends on:** SPRINT-058 (complete)
> **Authorized by:** founder override, 2026-08-17 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> Incident recall slice after grouping exists. Replaces the AGENTS.md
> line that 058 leftover is not a sequence and Incident recall on
> investigate remains unearned. Does **not** authorize
> Recommendation, Learning, similarity, Investigation lifecycle,
> MCP writes, inferred Action, `incidents --resource` list retrieve,
> or Incident-anchored Resolution write.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **exact-id Incident recall on existing Investigation read paths
> (CLI investigate / reopen + existing `investigate_resource`)**,
> not a fifth tool, not snapshot MCP, not MCP writes, not lifecycle,
> not inferred co-occurrence, not snapshot rewrite
> **Type:** Narrow read-time projection over already-persisted
> Incident rows
> **Primary goal:** When a human or agent investigates an exact
> Resource, or a human reopens a saved Investigation, Combie shows
> retained Incidents that group Resolutions for that exact identity
> — omitted when empty, never mixed into Known Facts, RESOLUTION
> MEMORY, or the snapshot — without a fifth tool, without thawing
> MCP writes, and without inferring a grouping.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. This
> Sprint adds an optional field on `investigate_resource` only. No
> fifth tool. No snapshot / `list_incidents` tools. No writes.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 058 shipped grouping + list + show:

```text
incident --resolution res:a --resolution res:b [--title]
incidents
incident <inc>
```

Those commands answer “what did we group?” only if the human already
knows to run them. Live `investigate`, `investigation <id>` reopen,
and `investigate_resource` still look like no grouping exists.

Sprint 058 leftover:

```text
059+      Incident recall on investigate / MCP only if earned
          incidents --resolution / --resource retrieve only if
            earned
          Incident-anchored Resolution write only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
058 did not earn this slice. AGENTS.md recorded that. 058’s founder
override froze recall on live `investigate` / MCP. This Sprint takes
it only under the founder override below.

It is **not** `incidents --resource` / `--resolution` as list
commands. Those are 055-shaped retrieve leftovers. This Sprint
filters at the existing investigate paths only.

It is **not** `resolution --incident`. That would be a third write
identity.

It is **not** MCP writes. Founder override 2026-08-16 froze those;
later overrides did not thaw them.

---

# Founder Override

`AGENTS.md` after Sprint 058 recorded that the 058 leftover is not a
sequence and Incident recall on investigate remains unearned.
`docs/internal/beta/INVESTIGATION-DOGFOOD.md` Scenario 8 is still
empty. Sequencing Rule 2 still holds: `incidents` and `incident <id>`
already retrieve the grouping.

On 2026-08-17 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  organizational precedent retrieval. Grouping is shipped; recall on
  the investigate paths already in use is not.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  the 052/056-shaped hole now that an Incident row exists, rather
  than waiting for a markdown ledger of “I had to remember `incidents`.”
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision rule,
  and it does not authorize Recommendation, Learning, similarity,
  Investigation lifecycle, MCP writes, inferred Action,
  `incidents --resource` list retrieve, or Incident-anchored write.
- Same pattern as Sprint 050 → 051, 056 → 057, and 057 → 058: the
  original evidence rule remains on record; the founder override
  chooses the next vertical slice.

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
group existing responses as one occurrence         ← 058
    ↓
recall that grouping on existing investigate paths ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: **no new persistence** for this claim. Filter the
058 table at read time (membership over existing Resolution rows).
Do not write Incidents into `snapshot_json`. Do not add `incident_id`
to `resolutions`.

---

# Problem

After `incident --resolution res:a --resolution res:b`, three
existing read commands still omit the grouping:

```text
combie investigate <resource-id>
combie investigation inv:…
investigate_resource(resourceId)
```

`incidents` exists, but it is a second command. RESOLUTION MEMORY
already shows the member responses. The missing claim is:

```text
The human named these responses as one occurrence.
That grouping is visible on the investigate path already in use.
```

That is the same epistemic class as 052/056: exact-id recall, not
inferred. It is **not** “Combie noticed two Resolutions and invented
an Incident.”

058 leftover listed CLI and MCP together because Incident recall
does not yet exist on either path. This Sprint takes both: CLI
first in the same slice as the 056 copy on the existing agent
investigate tool, so the agent path does not open a 052 hole.

---

# Product Question

> After an explicit Incident groups existing Resolution ids, can
> Combie show those retained groupings as a distinct section on live
> `investigate <resource-id>` and `investigation <id>` reopen, and as
> an additive field on existing `investigate_resource` — membership
> only (any member Resolution matches the exact subject /
> investigation identity), omitted when empty, never mixed into
> Known Facts / RESOLUTION MEMORY / snapshot JSON, without a fifth
> tool, without MCP writes, without `incidents --resource` list
> retrieve, and without inferred Action?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names organizational precedent
   retrieval. 058 stored the grouping. The next smallest version is
   recall on the paths already in use.
2. **Founder override 2026-08-17** replaces the unearned gate. 058
   leftover listed this first only *if earned*; the override is the
   earning act, not leftover order.
3. **Existing primitive check:** `incidents` / `incident <id>` still
   work and must keep working. Display on investigate is the new
   claim. Do not replace those commands.
4. **Sequencing Rule 9:** persistence is **not** required. Read-time
   membership over the 058 table.
5. **MCP** stays four read-only tools. Additive field on
   `investigate_resource` only (056 pattern). No writes. No fifth
   tool.

Rejected as 059 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| `incidents --resource` / `--resolution` list | 055-shaped leftover; this Sprint is investigate-path recall |
| `resolution --incident` | Third write identity; 058 groups existing rows |
| Add members after record | Mutation of an append-only grouping |
| Group Investigation snapshots directly | Different object |
| Infer Incident from same subject / evidence / time | Forbidden; membership is the 058 named ids |
| Fifth tool / snapshot MCP / `list_incidents` | Frozen four-tool contract |
| MCP writes | Founder override 2026-08-16 |
| Investigation / Incident lifecycle | Status is still a process claim |
| Incident section on `--compare` | Compare stays two InvestigationContext values |
| Putting Incidents on `InvestigationContext` / `snapshot_json` | Recall stays read-time |
| Similarity / “this has happened before” | v0.8 |
| Recommendation / Learning | v0.8 |

---

# Exact Capability

```text
combie investigate <resource-id>
        ↓
compose InvestigationContext (unchanged)
listResolutions({ subjectResourceId })           052, unchanged
list Incidents whose members include a Resolution
  with that exact subjectResourceId              this Sprint
        ↓
print live compose
print RESOLUTION MEMORY if rows exist            052–054, unchanged
print additive INCIDENT MEMORY if rows exist
        ↓
--save still persists InvestigationContext only

combie investigation <id>
        ↓
load snapshot (048, unchanged JSON)
listResolutions({ investigationId })             052, unchanged
list Incidents whose members include a Resolution
  with that exact investigationId                this Sprint
        ↓
print 048 reopen body
print RESOLUTION MEMORY if rows exist
print additive INCIDENT MEMORY if rows exist

investigate_resource(resourceId)
        ↓
same subject filter as live investigate
        ↓
additive incidentMemory when rows exist
omit the key when zero rows
```

Membership (read-time; Phase 1 pins the helper):

- **Subject scope** (live `investigate` / MCP): an Incident is in
  if **any** of its stored `resolutionIds` is a Resolution whose
  `subjectResourceId` equals the composed subject. One Incident is
  listed once even if two members match.
- **Investigation scope** (reopen): an Incident is in if **any**
  member Resolution has that exact `investigationId`. Resource-
  anchored-only groupings (no member has an `investigationId`) do
  **not** appear on reopen — same 057 rule as Resolution memory.
- Cross-subject grouping: investigating either member’s subject
  shows the Incident. That is the 058 claim.
- Do not infer extra members. Do not require every member to match
  the current identity.

`--compare` remains 049. Must not grow an Incident section.

`investigate --save` must **not** serialize Incidents into
`snapshot_json`. Recall is always read-time against the 058 table.

Exact section / field spelling is Phase 1. Expected:

- CLI section: **`INCIDENT MEMORY`** (parallel `RESOLUTION MEMORY`)
- MCP key: **`incidentMemory`** (parallel `resolutionMemory`)
- Omit when empty (052 / 056). Never Missing Context for “no
  incidents.” Never `[]` unless Phase 1 finds a freeze assertion
  that already requires it (expected: **omit**).

Section / row constraints:

- Distinct from SUBJECT, KNOWN FACTS, MISSING CONTEXT, RESOLUTION
  MEMORY, and the 048 snapshot banner.
- Labeled retained organizational grouping, not current provider
  truth, not a recommendation, not “this Resource is an Incident.”
- Per Incident: `id`, `recordedAt`, optional `title`, `resolutionIds`
  in stored order. Do **not** embed decision / action / outcome
  bodies (those stay on RESOLUTION MEMORY / `resolution <id>`).
- Order: `recordedAt` DESC, `id` DESC (058 list).
- Pointer: `Show: combie incident <id>` (first row), like 052.
- Exact identity only. No name search, no similarity.

MCP payload: same rows as subject-scoped CLI. Omit absent `title`.
Do not add `incidentMemory` to `get_related_context`. `content[]`
one-liner unchanged (no count, no body dump). Tool description
gains a retained-grouping clause. `docs/public/MCP.md`
`investigate_resource` row: Phase 1 pins whether that row now lies
without mentioning retained incident grouping (expected: **update
that row only**, same as 056).

---

# Evidence / Claim Semantics

### KNOWN (about the section)

```text
Combie has these retained Incidents whose named Resolution members
include this exact subject / investigation, recorded at their
recordedAt times. The human named the members.
```

### UNKNOWN / stale (required)

The section is **retained organizational grouping**, not proof the
occurrence is still current, not a proven outage, and not current
provider authority.

Live investigate’s compose remains current local-store compose. The
Incident section is not a claim that the system “changed” because a
grouping exists.

An Incident recorded after a snapshot’s `composedAt` may appear on
that snapshot’s reopen when a member hangs on that investigation id.
That is correct (052 same rule). Do not rewrite `composedAt`.

### Forbidden

```text
You should rollback
These are similar incidents
This Resource is now an Incident
resolved: true / this investigation is closed
This section is Known Facts / Missing Context / RESOLUTION MEMORY
Saving an investigation freezes Incident memory into the snapshot
Combie grouped these because they share a subject
```

---

# Architecture

```text
incidents table (058)                 unchanged
resolutions table (051/057)           unchanged
        ↓
listIncidentsForSubject /
listIncidentsForInvestigation         this Sprint, read-time
        ↓
formatIncidentMemorySection
        ↓
CLI investigate / investigation reopen
MCP investigate_resource incidentMemory
```

Ownership:

- **Domain / Store:** no new type required. No `incident_id` on
  `resolutions`. Phase 1 may add a store helper that scans Incident
  member arrays (expected: **yes**, small). Do not denormalize
  subject onto the Incident row.
- **App:** formatter over existing `IncidentRecord`. Do **not** add
  Incidents to `InvestigationContext`.
- **CLI:** append INCIDENT MEMORY after RESOLUTION MEMORY when
  both exist (responses first, grouping second). Phase 1 pins that
  order.
- **MCP:** `toIncidentMemoryRow` parallel to `toResolutionMemoryRow`.
  Conditional spread; `safeJson` maps `undefined` → `null`.
- **Compare:** unchanged. Must not read the incidents table.

Adapters do not participate.

---

# Persistence vs Read-Time

| Snapshot | Incident recall | Live compose |
| --- | --- | --- |
| Frozen InvestigationContext | Read-time membership | Current local compose |
| 048 JSON | 058 table + 051 members | Not a snapshot |

Recall must **not**:

- insert or update incident, resolution, or investigation rows
- rewrite snapshot JSON
- create Relationships or Changes
- refresh providers
- add MCP tools or writes

---

# Boundedness

- Three read paths: live `investigate` (subject membership),
  `investigation <id>` reopen (investigation membership),
  `investigate_resource` (same subject membership).
- No `incidents --resource` / `--resolution` list flags.
- No `context`, `related`, `history` changes.
- `MAX_INVESTIGATION_FACTS = 5` unchanged. Incidents are not facts.
- No cap that silently drops rows. No ranking.
- No extra hop. No provider calls. No schema migration.

---

# Failure / Unknown Semantics

- Missing investigation id / resource: same errors as 048 / live
  investigate. Do not print an Incident section on those failures.
- Incidents table missing (pre-058 DB): list empty → omit section.
- Subject Resource missing: live investigate / MCP still
  `RESOURCE_NOT_FOUND`. Reopen of a snapshot whose subject is gone
  still shows that investigation’s Incidents if any (052 survival).
- Member Resolution later missing: skip that member for
  membership match; do not invent a subject. If no remaining member
  matches, omit that Incident. Do not fail the investigate command.
- Corrupt Incident `resolution_ids`: 058 parse already omits
  invented members; that Incident will not match. Do not surface it
  as Known Facts.

---

# Affected Surfaces

### CLI

- `investigate <id>` / `investigate --save` live body: additive
  INCIDENT MEMORY when membership is non-empty
- `investigation <id>` reopen: additive INCIDENT MEMORY (investigation
  membership)
- `--compare` unchanged
- `incidents` / `incident` record/show unchanged
- RESOLUTION MEMORY unchanged

### MCP

Four tools. Additive `incidentMemory` on `investigate_resource`
only, omitted when empty. No writes. `docs/public/MCP.md`
investigate_resource row only if Phase 1 finds it now lies
(expected: **yes**, that row only).

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-052 / 056 recall, SPRINT-058 membership, and
inspect:

- `formatWithResolutionMemory` / CLI investigate + reopen
- `toResolutionMemoryRow` / `investigate_resource` conditional spread
- `listIncidentSummaries` / `listResolutionSummaries`
- whether `flags.incident` is a silent unused flag (expected: no
  such flag; do not add `--incident` on `resolution`)
- `docs/public/MCP.md` investigate_resource row
- compare tests that ignore Resolution / Incident

Report:

1. Section name: `INCIDENT MEMORY`? Expected: **yes.**
2. MCP key: `incidentMemory`? Expected: **yes.** Omit when empty.
3. Membership: any member Resolution matches subject /
   investigationId? Expected: **yes.** Dedup by Incident id.
4. Helper location: app vs store scan? Pin one (expected: app
   reads both lists; no schema change).
5. Order relative to RESOLUTION MEMORY: after? Expected: **yes.**
6. Row fields: id, recordedAt, title?, resolutionIds? Expected:
   **yes.** No decision/action/outcome bodies.
7. Reopen excludes resource-anchored-only Incidents? Expected:
   **yes** (no member `investigationId`).
8. `--compare` / snapshot JSON / `get_related_context`: no change?
   Expected: **yes.**
9. `docs/public/MCP.md` investigate_resource row: update that row
   only? Expected: **yes.**
10. Fifth tool, MCP writes, `incidents --resource`,
    `resolution --incident`, inferred members? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? No. Read-time grouping already stored.
3. Does subject-scoped recall leak “this Resource is an Incident”?
   **No** if labeled organizational grouping and membership is
   explicit 058 ids.
4. Does showing member ids leak “you should”? **No.**
5. MCP tool / write needed? Expected: **no** (additive field).
6. Compare section? Expected: **no.**
7. `incident_id` on resolutions / denormalized subject? Expected:
   **no.**
8. Lifecycle? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + the
   existing `docs/public/MCP.md` investigate_resource row. Not
   VISION / ARCHITECTURE / ROADMAP / SKILL.

If implementation is tempted to infer an Incident, to UPDATE
`resolutions`, to add `incidents --resource`, to thaw MCP writes,
to add a fifth tool, or to put Incidents on `InvestigationContext`:
**STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- 058 record/list/show unchanged
- 052–057 RESOLUTION MEMORY unchanged when no Incident exists
- live `investigate` includes INCIDENT MEMORY for a grouping whose
  member shares that subject; omits when none
- identity line / block has `inc:` id; optional title; member `res:`
  ids; no decision/action/outcome essays
- an Incident with members on subjects A and B appears on
  investigate of A and of B
- `investigation <id>` reopen includes Incidents with a member on
  that investigation; excludes resource-anchored-only groupings
- `--compare` unchanged (before/after identity)
- `--save` snapshot JSON unchanged
- MCP `investigate_resource` includes `incidentMemory` when rows
  exist; omits key when empty; same membership as live investigate;
  still four tools; `resolutionMemory` unchanged; DB digest
  unchanged
- unknown `resourceId` keeps `RESOURCE_NOT_FOUND` with no
  consolation Incident payload
- subject Resource deleted: live investigate still
  `RESOURCE_NOT_FOUND`; `incidents` / show still list (058)
- pre-058 missing `incidents` table: omit section, no crash
- no MCP write tool; no `incidentId` on Resolution records

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
# 058 grouping still works
investigate <id> --save
resolution --investigation <inv> --decision "…"
resolution --resource <id> --decision "…"
incident --resolution <res-a> --resolution <res-b> --title "…"

# this Sprint
investigate <id>                 # RESOLUTION MEMORY + INCIDENT MEMORY
investigation <inv>              # INCIDENT MEMORY if a member hangs on inv
investigation <inv> --compare    # no Incident section
# MCP investigate_resource: incidentMemory present; four tools
incidents / incident <inc>       # unchanged
```

---

# Explicit Non-Goals

Do **not** implement:

- `incidents --resource` / `--resolution` list retrieve
- `resolution --incident` third write identity
- add-member-after-record mutation
- inferred members / inferred Incident
- `incident_id` on Resolution rows
- MCP writes or a fifth tool
- snapshot MCP / `list_incidents` tool
- Investigation or Incident lifecycle / `resolved: true`
- Incident section on `--compare`
- putting Incidents on `InvestigationContext` or `snapshot_json`
- similarity, “you should”, Learning, Recommendation
- grouping Investigation snapshots as members
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
059       Incident recall on investigate / investigate_resource    ← this
060+      incidents --resolution / --resource retrieve only if
            earned
          Incident-anchored Resolution write (`resolution
            --incident`) only if earned
          add members after record only if earned
          group Investigations directly only if earned
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
  additive `incidentMemory` on investigate_resource only)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 051–057 Resolution write / recall unchanged
- 058 `incident` record/list/show unchanged (no list filters)
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None. `CREATE TABLE IF NOT EXISTS` already created `incidents` in
058. Pre-058 DBs: missing table → empty list → omit section.

If implementation is tempted to add `incident_id` on `resolutions`
or to copy `subjectResourceId` onto the Incident row: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 059 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: live `investigate` / investigation reopen /
      `investigate_resource` show retained Incidents by membership;
      omitted when empty; not in Known Facts; not a fifth tool
- [x] if earned: no inferred members; no lifecycle; no MCP writes;
      compare unchanged; snapshot JSON unchanged; 058 commands
      unchanged
- [x] if not earned: rejection documented; do not infer an Incident
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and the
      existing `docs/public/MCP.md` investigate_resource row

---

# Final Principle

> **Sprint 058 remembered that the human named several responses as
> one occurrence. Sprint 059 may show that grouping when a human or
> agent investigates on the paths already in use. Combie must not
> invent the grouping, must not invent lifecycle, and must not treat
> a Resource as an Incident.**

---

# Completion Notes

**Baseline:** `c9edb1e` (docs(sprints): mark 058 complete).
`bun test`: 970 pass / 78 files / 4139 expects. `bun run typecheck`:
clean.

## Repository Understanding

1. **Section name: `INCIDENT MEMORY`.** Parallel `RESOLUTION MEMORY`
   (`src/app/resolutions.ts` `formatResolutionMemorySection`).
2. **MCP key: `incidentMemory`.** Omit when empty. `safeJson` maps
   `undefined` → `null`; conditional spread like 056
   `resolutionMemory` (`src/mcp/tools.ts`).
3. **Membership: any member Resolution matches.** Subject:
   `subjectResourceId`. Reopen: `investigationId`. Dedup by Incident
   id (filter over `listIncidentSummaries`).
4. **Helper location: app.** `listIncidentsForSubject` /
   `listIncidentsForInvestigation` in `src/app/incidents.ts` read
   `listIncidentSummaries` + `listResolutionSummaries` in one Store
   session. No schema change. No denormalized subject.
5. **Order: after RESOLUTION MEMORY.** CLI wraps
   `formatWithIncidentMemory(formatWithResolutionMemory(...), ...)`.
6. **Row fields: id, recordedAt, title?, resolutionIds.** No
   decision / action / outcome bodies. Pointer:
   `Show: combie incident <first-id>`.
7. **Reopen excludes resource-anchored-only Incidents.** No member
   has `investigationId`. Mixed membership appears on that
   investigation's reopen and on live investigate of the subjects.
8. **`--compare` / snapshot JSON / `get_related_context`: no
   change.** Compare still ignores Incident rows. `--save` still
   serializes InvestigationContext only.
9. **`docs/public/MCP.md` investigate_resource row: updated that
   row only.**
10. **No fifth tool, no MCP writes, no `incidents --resource`, no
    `resolution --incident`, no inferred members.** No unused
    `flags.incident`. `incidents` list still refuses those filters.

## Architecture Pressure

1. **Persistence necessary? No.** Read-time membership over 058 +
   051 tables.
2. **Second source of truth? No.** The grouping is the 058 row.
3. **Does subject-scoped recall leak “this Resource is an
   Incident”? No.** Labeled retained organizational grouping;
   membership is explicit 058 ids.
4. **Does showing member ids leak “you should”? No.**
5. **MCP tool / write needed? No.** Additive field on
   `investigate_resource`.
6. **Compare section? No.**
7. **`incident_id` on resolutions / denormalized subject? No.**
8. **Lifecycle? No.**
9. **Canon change? AGENTS.md operational baseline + the existing
   `docs/public/MCP.md` investigate_resource row.** Not VISION /
   ARCHITECTURE / ROADMAP / SKILL.

## Implemented

- `listIncidentsForSubject` / `listIncidentsForInvestigation` +
  `formatIncidentMemorySection` / `formatWithIncidentMemory`
  (`src/app/incidents.ts`)
- CLI live `investigate` / `--save` live body / `investigation`
  reopen append INCIDENT MEMORY after RESOLUTION MEMORY; help
  one-liner (`src/cli/index.ts`)
- `investigate_resource`: additive `incidentMemory`, omitted when
  empty; description grouping clause; `content[]` one-liner
  unchanged (`src/mcp/tools.ts`)
- `docs/public/MCP.md` investigate_resource row only

## Deviations

- None material. The 058 MCP freeze that asserted
  `incidentMemory` absent was updated in place: four tools,
  `resolutionMemory`, no `incidents` key, and grouping title not
  leaking into `resolutionMemory` remain; presence is asserted in
  the Sprint 059 block. That is the authorized unfreeze, not a
  scope expansion.

## Validation

```text
bun test:          978 pass across 78 files (4261 expect() calls;
                   was 970 pass / 78 files / 4139 at baseline)
bun run typecheck: clean
git diff --check:  clean
MCP tools:         get_related_context, investigate_resource,
                   list_providers, list_resources
Red:               tests/app/incidents.test.ts failed to load
                   (recall exports missing); CLI/MCP asserts
                   INCIDENT MEMORY / incidentMemory absent
live (isolated):   investigate --save → 051 --investigation + 057
                   --resource → incident --resolution with title →
                   live investigate RESOLUTION MEMORY then
                   INCIDENT MEMORY (title + member ids, no other-
                   subject essay) → other subject sees the same
                   Incident → reopen includes mixed grouping →
                   resource-anchored-only grouping excluded from
                   reopen and included on live investigate →
                   --compare has no INCIDENT MEMORY → --save
                   snapshot JSON omits Incident ids → incidents /
                   incident show unchanged → MCP four tools;
                   incidentMemory present; no incidents key;
                   one-liner unchanged; DB SHA-256 unchanged
```

## Learnings

- Cross-resource grouping is the 058 claim; subject membership
  must be “any member,” not “every member” and not a copied
  subject column on the Incident row.
- Resource-anchored-only Incidents follow the 057 reopen rule:
  no member `investigationId` means the grouping is invisible on
  `investigation <id>` and visible on live `investigate`.
- Missing member Resolution rows are skipped, not invented. If
  no remaining member matches, omit the Incident rather than
  failing investigate.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md
baseline becomes Sprints 001–059 complete (shipped bullet + v0.7
paragraph). `docs/public/MCP.md` investigate_resource row names
retained incident grouping. Sprint 060 is not started.

