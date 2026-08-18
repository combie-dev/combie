# SPRINT-060 — Retrieve Incidents by Exact Resolution or Resource Id

> **Status:** Complete
> **Depends on:** SPRINT-059 (complete)
> **Authorized by:** founder override, 2026-08-18 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> Incident list-retrieve slice after grouping and investigate-path
> recall exist. Replaces the AGENTS.md line that 059 leftover is not
> a sequence and `incidents --resource` / `--resolution` list
> retrieve remain unearned. Does **not** authorize Recommendation,
> Learning, similarity, Investigation lifecycle, MCP writes, inferred
> Action, Incident-anchored Resolution write, add-members mutation,
> or `incidents --investigation`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **exact-id retrieval of retained Incidents from the existing
> `incidents` list**, not a fifth tool, not snapshot MCP, not MCP
> writes, not lifecycle, not inferred co-occurrence, not snapshot
> rewrite
> **Type:** Narrow read-time filter over already-persisted Incident
> rows
> **Primary goal:** List retained Incidents whose named Resolution
> members include one exact `res:` id, or whose members include a
> Resolution for one exact subject Resource id — the 055 shape for
> the 058 table / 059 membership — without inferring a grouping,
> without a new list command, and without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No `list_incidents` tool. No writes. `incidentMemory`
> on `investigate_resource` stays 059.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 058–059 shipped grouping + investigate-path recall:

```text
incident --resolution res:a --resolution res:b [--title]
incidents
incident <inc>
investigate / investigation reopen / investigate_resource
  → INCIDENT MEMORY / incidentMemory
```

Those answers require either knowing the `inc:` id or investigating
a subject that already has a member. The global `incidents` list
still cannot answer:

```text
Which retained grouping named this exact res: id?
Which retained groupings include a response for this exact subject?
```

Sprint 059 leftover:

```text
060+      incidents --resolution / --resource retrieve only if
            earned
          Incident-anchored Resolution write (`resolution
            --incident`) only if earned
          add members after record only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
059 did not earn this slice. AGENTS.md recorded that. 059’s founder
override froze `incidents --resource` list retrieve. This Sprint
takes it only under the founder override below.

It is **not** `resolution --incident`. That is a third write
identity.

It is **not** add-members-after-record. 058 is append-only grouping.

It is **not** `incidents --investigation`. Leftover[0] named
`--resolution` / `--resource` only. Investigation-scoped list
retrieve stays unearned.

It is **not** MCP writes, a fifth tool, or `list_incidents`.
Investigate-path recall already shipped in 059. This Sprint is the
list command.

---

# Founder Override

`AGENTS.md` after Sprint 059 recorded that the 059 leftover is not a
sequence and `incidents --resource` / `--resolution` list retrieve
remain unearned. Sequencing Rule 2 still holds: `incidents` and
`incident <id>` already list and show; INCIDENT MEMORY already
recalls on investigate.

On 2026-08-18 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  organizational precedent retrieval. Grouping and investigate-path
  recall are shipped; exact-id retrieve on the existing list is not.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  the 050/055-shaped hole now that an Incident row and membership
  helper exist, rather than waiting for a ledger of “I had to scan
  `incidents` or already know the `inc:` id.”
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision rule,
  and it does not authorize Recommendation, Learning, similarity,
  Investigation lifecycle, MCP writes, inferred Action,
  Incident-anchored write, add-members mutation, or
  `incidents --investigation`.
- Same pattern as Sprint 050 → 051, 056 → 057, 057 → 058, and
  058 → 059: the original evidence rule remains on record; the
  founder override chooses the next vertical slice.

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
recall that grouping on investigate paths          ← 059
    ↓
retrieve that grouping from the existing list      ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: **no new persistence** for this claim. Filter the
058 table at read time (membership over existing Resolution rows /
stored member ids). Do not add `incident_id` to `resolutions`. Do
not copy a subject onto the Incident row.

---

# Problem

After `incident --resolution res:a --resolution res:b`, three list
questions still require scanning or already knowing `inc:`:

```text
combie incidents
combie incidents --resolution res:a      ← this Sprint
combie incidents --resource <resource-id> ← this Sprint
```

059 shows the grouping when you investigate a member’s subject.
That is recall on a compose path. It is **not** list retrieve.

The missing claim is the 050/055 shape:

```text
The human named these members.
The existing incidents list can retrieve by those exact ids.
```

That is identity lookup, not inferred. It is **not** “Combie noticed
two Resolutions on this Resource and invented an Incident.”

---

# Product Question

> After an explicit Incident groups existing Resolution ids, can
> Combie list retained groupings from the existing `incidents`
> command whose members include one exact `res:` id and/or a
> Resolution for one exact subject Resource id — membership only,
> summaries only, known-empty when none, surviving subject Resource
> deletion — without inferred members, without MCP writes, without a
> fifth tool, without `incidents --investigation`, and without
> Incident-anchored Resolution write?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names organizational precedent
   retrieval. 058 stored the grouping. 059 recalled it on
   investigate. The next smallest version is retrieve on the list
   already in use.
2. **Founder override 2026-08-18** replaces the unearned gate. 059
   leftover listed this first only *if earned*; the override is the
   earning act, not leftover order.
3. **Existing primitive check:** `incidents` / `incident <id>` still
   work and must keep working. 059 `listIncidentsForSubject` already
   implements subject membership. Display on the list is the new
   claim. Do not replace INCIDENT MEMORY.
4. **Sequencing Rule 9:** persistence is **not** required. Read-time
   membership over the 058 table.
5. **MCP** stays four read-only tools. List retrieve is CLI. No
   fifth tool. No writes.

Rejected as 060 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| `resolution --incident` | Third write identity; 058 groups existing rows |
| Add members after record | Mutation of an append-only grouping |
| `incidents --investigation` | Not leftover[0]; 059 reopen already covers investigation membership |
| Infer Incident from same subject / evidence / time | Forbidden; membership is the 058 named ids |
| Fifth tool / `list_incidents` / snapshot MCP | Frozen four-tool contract |
| MCP writes | Founder override 2026-08-16 |
| Investigation / Incident lifecycle | Status is still a process claim |
| Changing INCIDENT MEMORY / `incidentMemory` | 059 shipped; this Sprint is the list |
| Putting Incidents on `InvestigationContext` / `snapshot_json` | Recall stays read-time |
| Repeatable `--resolution` OR/AND on the list | One exact id (055). Record remains repeatable |
| Similarity / “this has happened before” | v0.8 |
| Recommendation / Learning | v0.8 |

---

# Exact Capability

```text
combie incidents
        ↓
list all Incident summaries (058, unchanged)

combie incidents --resolution <res-id>
        ↓
list Incident summaries whose stored resolutionIds
  include that exact string (membership, not substring)
        ↓
same 058 columns: id, title, member count, recordedAt
  order: recordedAt DESC, id DESC

combie incidents --resource <resource-id>
        ↓
list Incident summaries whose members include a Resolution
  with that exact subjectResourceId
  (same membership as 059 listIncidentsForSubject)

combie incidents --resolution <res-id> --resource <resource-id>
        ↓
AND of the two predicates (055 shape)
```

Exact CLI flag spelling is Phase 1. Expected: reuse `--resolution`
and `--resource` on the existing `incidents` command.

- `--resolution` on `incident` (record) stays 058 repeatable write.
- `--resolution` on `incidents` (list) is this Sprint’s filter.
  Different commands. One exact id on the list. Repeatable
  `--resolution` on `incidents` is usage (055 `--evidence`).
- `--resource` on `incidents` is subject membership. Blank flag is
  usage.
- `--investigation` on `incidents` remains 058 usage. Do not add
  that filter.

Unfiltered `incidents` remains the global list (058).

`incident <id>` show, `incident --resolution` record, live
`investigate`, `investigation <id>` reopen, `--compare`, and
`investigate_resource` are unchanged.

List contents remain **058 summaries**: id, title placeholder `-`,
member **count**, recordedAt. Do not add a member-id essay column.
The query already answered membership. Show is still
`incident <id>`.

Known-empty (exit 0, never `RESOURCE_NOT_FOUND` /
`RESOLUTION_NOT_FOUND` / `INCIDENT_NOT_FOUND`):

- `--resolution` with zero matching Incidents, including an unknown
  or later-deleted `res:` id
- `--resource` with zero matching Incidents, including a subject
  that never had a member and a deleted Resource whose Resolution
  rows still exist or do not

Phase 1 pins the known-empty copy. Expected: distinct from the
global “No incidents recorded yet.” line, naming the filter id,
stating this is known-empty for that exact identity.

Membership (read-time):

- **`--resolution`:** `incident.resolutionIds` includes that exact
  string. Exclusive 058 membership means at most one row. Still a
  list. Do not error as “already grouped” — this is retrieve, not
  record.
- **`--resource`:** reuse 059 subject membership (any member
  Resolution’s `subjectResourceId`). One Incident listed once even
  if two members match. Cross-subject grouping appears when
  filtering either member’s subject.
- **AND:** an Incident must satisfy both predicates. The named
  `res:` need not itself belong to the named subject if another
  member does (cross-resource grouping is the 058 claim).
- Missing member Resolution rows: `--resolution` still matches the
  stored id array (the human named it). `--resource` skips missing
  members for subject match (059 same rule).
- Do not infer extra members.

---

# Evidence / Claim Semantics

### KNOWN (about the list)

```text
Combie has these retained Incidents whose named Resolution members
include this exact resolution id and/or this exact subject, recorded
at their recordedAt times. The human named the members.
```

### UNKNOWN / stale (required)

The list is **retained organizational grouping**, not proof the
occurrence is still current, not a proven outage, and not current
provider authority.

A filter id that is unknown, deleted, or aged out of live compose
is known-empty for that id, not a command failure.

### Forbidden

```text
You should rollback
These are similar incidents
This Resource is now an Incident
resolved: true / this investigation is closed
Combie grouped these because they share a subject
No incident found: res:…   (that is show, not list)
```

---

# Architecture

```text
incidents table (058)                 unchanged
resolutions table (051/057)           unchanged
        ↓
listIncidentsForSubject               059, reuse for --resource
listIncidentsForResolution            this Sprint, exact member id
        ↓
formatIncidentList (known-empty copy) this Sprint
        ↓
CLI incidents [--resolution] [--resource]
```

Ownership:

- **Domain / Store:** no new type. No `incident_id` on
  `resolutions`. Do not denormalize subject onto the Incident row.
- **App:** filter helpers + known-empty list copy. Reuse 059
  subject membership. `--resolution` is membership over the stored
  id array (no Resolution row required).
- **CLI:** lift the 058 blanket rejection of `--resolution` /
  `--resource` on `incidents`. Keep `--investigation` as usage.
- **MCP / Compare / InvestigationContext:** unchanged.

Adapters do not participate.

---

# Persistence vs Read-Time

| Snapshot | Incident list retrieve | Live compose |
| --- | --- | --- |
| Frozen InvestigationContext | Read-time membership | Current local compose |
| 048 JSON | 058 table + 051 members | Not a snapshot |

Retrieve must **not**:

- insert or update incident, resolution, or investigation rows
- rewrite snapshot JSON
- create Relationships or Changes
- refresh providers
- add MCP tools or writes

---

# Boundedness

- One existing list command. Two optional exact-id filters. AND when
  both present.
- One exact `--resolution` id on the list. One exact `--resource` id.
- No `incidents --investigation`. No `incidents --evidence`.
- No change to `context`, `related`, `history`, investigate, reopen,
  compare, or MCP.
- `MAX_INVESTIGATION_FACTS = 5` unchanged. Incidents are not facts.
- No cap that silently drops rows. No ranking.
- No extra hop. No provider calls. No schema migration.

---

# Failure / Unknown Semantics

- Blank `--resource` / `--resolution`: usage, exit 1 (055/050).
- Repeatable `--resolution` on `incidents`: usage, exit 1.
- `--investigation` on `incidents`: usage, exit 1 (058 remains).
- `--title` on `incidents`: usage (not a list flag).
- Unknown / deleted filter ids: known-empty, exit 0. Never
  `RESOURCE_NOT_FOUND` / `RESOLUTION_NOT_FOUND` /
  `INCIDENT_NOT_FOUND` on this list.
- Incidents table missing (pre-058 DB): empty list → known-empty for
  that filter, or global empty when unfiltered.
- Subject Resource deleted: `--resource` still lists Incidents whose
  stored member Resolutions keep that `subjectResourceId` (051
  copy). If no such members remain, known-empty.
- Uninitialized store: existing not-initialized error.

---

# Affected Surfaces

### CLI

- `incidents [--resolution] [--resource]`: additive filters
- unfiltered `incidents` unchanged
- `incident` record/show unchanged
- INCIDENT MEMORY / RESOLUTION MEMORY unchanged
- `--compare` unchanged
- help: `--resource` / `--resolution` list lines + examples

### MCP

Four tools. No `list_incidents`. `incidentMemory` unchanged. Do not
edit `docs/public/MCP.md` unless Phase 1 finds a lie (expected:
**no** — that row is investigate_resource, not this list).

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-050 / 055 list retrieve, SPRINT-058 list
rejection, SPRINT-059 `listIncidentsForSubject`, and inspect:

- `case "incidents"` blanket flag rejection
- `repeated.resolution` vs one exact id (055 `repeated.evidence`)
- `formatIncidentList` empty copy
- `listIncidentsForSubject` reuse
- whether `--resource` on `incidents` collides with investigations /
  resolutions / resolution record (expected: same flag, different
  command — document in help like 055)
- compare / investigate tests that must stay green

Report:

1. Flags: reuse `--resolution` / `--resource` on `incidents`?
   Expected: **yes.**
2. One exact `--resolution` on the list; repeatable is usage?
   Expected: **yes.**
3. `--investigation` on `incidents` remains usage? Expected:
   **yes.**
4. `--resource` membership: reuse `listIncidentsForSubject`?
   Expected: **yes.**
5. `--resolution` membership: exact `resolutionIds.includes`?
   Expected: **yes.** Missing Resolution row still matches the
   stored id.
6. AND when both flags present? Expected: **yes.**
7. Known-empty copy distinct per filter, exit 0? Expected: **yes.**
8. List columns unchanged (count, not member essays)? Expected:
   **yes.**
9. MCP / compare / snapshot / INCIDENT MEMORY: no change?
   Expected: **yes.**
10. Fifth tool, MCP writes, `resolution --incident`, inferred
    members? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? No. Read-time grouping already stored.
3. Does `--resource` leak “this Resource is an Incident”? **No** if
   the list remains groupings and membership is explicit 058 ids.
4. Does `--resolution` leak “you should”? **No.**
5. MCP tool / write needed? Expected: **no.**
6. Compare / INCIDENT MEMORY change? Expected: **no.**
7. `incident_id` on resolutions / denormalized subject? Expected:
   **no.**
8. Lifecycle? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + CLI
   help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md
   unless Phase 1 finds the investigate_resource row now lies
   (expected: **no**).

If implementation is tempted to infer an Incident, to UPDATE
`resolutions`, to add `incidents --investigation`, to thaw MCP
writes, to add a fifth tool, or to put Incidents on
`InvestigationContext`: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- 058 unfiltered `incidents` unchanged
- 058 record/show unchanged
- 059 INCIDENT MEMORY / `incidentMemory` unchanged
- `incidents --resolution <id>` lists the grouping that named that
  exact id; omits others; exclusive membership still at most one row
- substring / prefix of a `res:` id does not match
- unknown `res:` id is known-empty, exit 0, never
  `RESOLUTION_NOT_FOUND`
- repeatable `--resolution` on `incidents` is usage, exit 1
- `incidents --resource <id>` matches 059 subject membership
  (cross-subject grouping appears on either subject)
- unknown Resource id is known-empty, exit 0, never
  `RESOURCE_NOT_FOUND`
- subject Resource deleted: `--resource` still lists when member
  Resolution rows keep that subject id
- AND of `--resolution` and `--resource`
- `--investigation` on `incidents` still usage
- blank flags usage
- `--compare` / snapshot JSON / MCP four tools unchanged
- pre-058 missing `incidents` table: known-empty, no crash
- help lists the two list examples

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
# 058 / 059 still work
investigate <id> --save
resolution --investigation <inv> --decision "…"
resolution --resource <other> --decision "…"
incident --resolution <res-a> --resolution <res-b> --title "…"
investigate <id>                 # INCIDENT MEMORY unchanged
incidents                        # unfiltered unchanged

# this Sprint
incidents --resolution <res-a>   # that grouping; summaries only
incidents --resource <id>        # groupings with a member on that subject
incidents --resolution <res-a> --resource <id>
incidents --resolution res:missing   # known-empty, exit 0
incidents --investigation inv:…      # usage, exit 1
incident <inc> / incident --resolution …  # unchanged
```

---

# Explicit Non-Goals

Do **not** implement:

- `incidents --investigation` list retrieve
- `resolution --incident` third write identity
- add-member-after-record mutation
- inferred members / inferred Incident
- `incident_id` on Resolution rows
- MCP writes or a fifth tool / `list_incidents`
- snapshot MCP
- Investigation or Incident lifecycle / `resolved: true`
- Incident section on `--compare`
- putting Incidents on `InvestigationContext` or `snapshot_json`
- changing INCIDENT MEMORY / `incidentMemory`
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
059       Incident recall on investigate / investigate_resource    ✅
060       incidents --resolution / --resource list retrieve        ← this
061+      Incident-anchored Resolution write (`resolution
            --incident`) only if earned
          add members after record only if earned
          incidents --investigation retrieve only if earned
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
  `incidentMemory` on investigate_resource unchanged)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 051–057 Resolution write / recall unchanged
- 058 `incident` record/show unchanged (record `--resolution` still
  repeatable)
- 059 INCIDENT MEMORY / `incidentMemory` unchanged
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None. Pre-058 DBs: missing table → empty list → known-empty for a
filter.

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

- [ ] Sprint 060 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: `incidents --resolution` / `--resource` list
      retained Incidents by membership; known-empty exit 0; AND;
      unfiltered list unchanged; not a fifth tool
- [ ] if earned: no inferred members; no lifecycle; no MCP writes;
      compare unchanged; 058 record/show unchanged; 059 memory
      unchanged
- [ ] if not earned: rejection documented; do not infer an Incident
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 058 remembered that the human named several responses as
> one occurrence. Sprint 059 may show that grouping on investigate.
> Sprint 060 may retrieve that grouping from the list already in
> use, by the exact ids the human named. Combie must not invent the
> grouping, must not invent lifecycle, and must not treat a Resource
> as an Incident.**

---

# Completion Notes (2026-08-18)

## Implemented

- `incidents --resolution <res-id>`: list retained Incident
  summaries whose stored member `resolutionIds` include that exact
  string (membership, not substring; no Resolution row required —
  the human named it; exclusive 058 membership means at most one
  row). `src/app/incidents.ts` `listIncidentsForResolution`.
- `incidents --resource <resource-id>`: list Incident summaries
  whose members include a Resolution with that exact
  `subjectResourceId` — the same 059 `listIncidentsForSubject`
  membership (any member, missing member rows skipped).
- AND when both flags present: `listIncidentsFiltered` (the named
  `res:` need not itself belong to the named subject if another
  member does — cross-resource grouping is the 058 claim).
- Known-empty per filter, exit 0, never `RESOURCE_NOT_FOUND` /
  `RESOLUTION_NOT_FOUND` / `INCIDENT_NOT_FOUND`: distinct copy per
  filter in `formatIncidentList` (resolution / subject / both),
  distinct from the global “No incidents recorded yet.” line.
- Pre-058 missing `incidents` table: filtered paths return `[]`
  through `hasIncidentsTable`, known-empty copy renders.
- CLI: lifted the 058 blanket rejection of `--resolution` /
  `--resource` on `incidents`; `--investigation` remains usage
  exit 1; blank flags usage exit 1; repeatable `--resolution` on
  the list usage exit 1 (`--resolution takes one exact id on the
  incidents list.`); unfiltered `incidents` unchanged.
- Help: `With "incidents":` list lines for `--resolution` and
  `--resource` plus two list examples
  (`incidents --resolution res:…`, `incidents --resource
  github:repository:1001`).
- List contents remain 058 summaries (id, title `-`, member count,
  recordedAt; `recordedAt DESC, id DESC`); no member-id essay
  column. Show is still `incident <id>`.

## Deviations

- None material. `--title` on `incidents` is documented as a record
  flag (help already says “Optional name for an incident
  grouping”) and is not rejected as a list flag — matching the
  repository precedent that `resolutions` does not reject unused
  flags and the Sprint's deliberate omission of “exit 1” from the
  `--title` failure bullet.
- AND known-empty copy names both exact ids (not a single-filter
  precedence copy); 055 pinned no AND-empty copy, so the combined
  copy is this Sprint's Phase 1 pin.

## Validation

```text
bun test:          992 pass across 78 files (4366 expect() calls;
                   was 978 pass / 78 files / 4261 at baseline)
bun run typecheck: clean
git diff --check:  clean
Red:               app suite failed to load (listIncidentsFiltered /
                   listIncidentsForResolution exports missing);
                   CLI `incidents --resolution` exit 1 from the 058
                   blanket rejection
live (isolated):   investigate --save → 051 --investigation + 057
                   --resource → incident --resolution with title →
                   live investigate INCIDENT MEMORY unchanged →
                   incidents unfiltered unchanged → incidents
                   --resolution lists that grouping (summaries
                   only) → incidents --resource lists it on the
                   subject → AND lists it → incidents --resolution
                   res:missing known-empty exit 0 → incidents
                   --resource unknown subject known-empty exit 0 →
                   incidents --investigation usage exit 1 →
                   repeatable --resolution usage exit 1 → blank
                   --resolution / --resource usage exit 1 →
                   incident <inc> show unchanged → --compare
                   unchanged
```

## Learnings

- `--resolution` on the list is membership over the incident's own
  stored id array; it must not require the Resolution row to still
  exist. The 059 member-predicate engine cannot express that, so
  `listIncidentsWhere` generalizes the read path and 059 wrappers
  stay behavior-identical.
- Filtered ordering and known-empty come free from the 058 store
  query (`recordedAt DESC, id DESC`) and the `hasIncidentsTable`
  guard; no schema change, no `incident_id` on `resolutions`, no
  subject copied onto the Incident row.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–060 complete
(shipped bullet + v0.7 paragraph + summary line). Sprint 061 is
not started.
