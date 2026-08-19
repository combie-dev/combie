# SPRINT-074 — Investigation-scoped Incident Memory on investigate_resource

> **Status:** Complete
> **Depends on:** SPRINT-073 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.7 Incident
> recall (Sprint 059) on the agent investigate path already in
> use, after 073 named-id Resolution wrap exists so the CLI
> `investigation <id>` INCIDENT MEMORY wrap has an MCP home.
> Sprint 073 leftover list is **not** a sequence. leftover[0]
> **group Investigations as Incident members** stays **unearned**
> (Investigation ≠ Incident; members stay `res:`). leftover[1]
> **fifth-tool snapshot reopen / `list_investigations`** stays
> frozen. This Sprint takes **investigation-scoped Incident
> recall** (the 059 reopen wrap) on existing
> `investigate_resource` when `investigationId` is named. Does
> **not** authorize Recommendation, Learning, similarity,
> Investigation lifecycle, MCP writes, a fifth tool, inferred
> Action, grouping snapshots as members, `occurredAt`,
> orphan-subject MCP survival, replacing live compose, or
> changing 059 subject-scoped `incidentMemory`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory
> — **exact-id Incident recall scoped to a named Investigation
> on existing `investigate_resource`**, plus v0.4 CLI + MCP
> parity for that 059 reopen surface; not grouping `inv:` as
> members, not lifecycle, not the Investigation Engine, not a
> fifth tool, not MCP writes
> **Type:** Narrow additive MCP field over already-persisted
> Incident rows (058 table, 059
> `listIncidentsForInvestigation`, 059 projection)
> **Primary goal:** When an agent investigates an exact Resource
> through the existing `investigate_resource` tool and names one
> exact snapshot id, Combie returns Incident groupings whose
> members include a Resolution recorded against that
> Investigation as an additive structured field — omitted when
> the id is not passed or when that Investigation has none,
> never mixed into snapshot JSON or live Known Facts, never
> replacing 059 subject-scoped `incidentMemory`, never a fifth
> tool — without grouping `inv:` as Incident members and without
> thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. This
> Sprint adds an optional **field** on `investigate_resource` only
> (reuses the 071 `investigationId` input). No fifth tool. No
> writes. 059 `incidentMemory` stays subject-scoped whether the
> id is omitted or named. 073 `investigationResolutionMemory`
> unchanged. 072 `investigationSnapshot` shape unchanged (no live
> memory keys on the 048 object). 056 `resolutionMemory`
> unchanged. 071 `investigationCompare` unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 073 shipped named-id **Resolution** wrap on live
investigate:

```text
investigate_resource({ resourceId, investigationId? })
  live compose
  incidentMemory                        # 059, subject-scoped
  investigationResolutionMemory         # 073, when investigationId named
  investigationSnapshot                 # 048, when investigationId named
```

Agents can name `inv:a` and see Resolutions recorded against
that Investigation. They still cannot ask the 059 reopen
question on that same tool:

```text
Which Incidents include a Resolution recorded against this
named Investigation?
```

CLI already answers it:

```text
investigation <id>
  INCIDENT MEMORY     # listIncidentsForInvestigation(id)
```

Live `investigate` and MCP `incidentMemory` answer a different
question:

```text
Which Incidents include a Resolution recorded against this
exact subject?
```

Those sets are not the same. An Incident whose members are only
resource-anchored Resolutions for the subject appears on 059
and does not appear on CLI reopen of `inv:a`.

Sprint 073 leftover:

```text
074+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          investigation-scoped Incident memory on this path
            only if earned
          orphan-subject MCP survival only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
073 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. leftover[0] stays
unearned.

leftover[1] **fifth-tool / `list_investigations`** stays frozen.

leftover **investigation-scoped Incident memory on this path**
is now earned. 073 took the 052 wrap. This Sprint takes the 059
wrap. Same named id, same existing tool, same omit-empty sibling
field pattern.

This Sprint **splits** leftover as:

```text
fifth tool / list_investigations / get_investigation
  → still frozen
orphan-subject MCP survival
  → still frozen (live compose still requires the Resource)
group inv: as Incident members
  → still frozen (Investigation ≠ Incident)
additive investigation-scoped Incident list on existing
  investigate_resource (named investigationId; 059 semantics)
  → this Sprint
```

No founder override is required. 058 / 059 already authorized
Incident grouping and exact-id recall. 059 put subject-scoped
recall on this tool. 073 put the named Resolution wrap on this
tool. Copying the stable 059 projection onto
`listIncidentsForInvestigation` is the 073 analog for the
reopen Incident wrap. Do not infer “latest snapshot.” The agent
must name the id. Do not add a second input; reuse
`investigationId`.

It is **not** grouping Investigation snapshots as Incident members.
`--investigation` on `incident` create stays usage.

It is **not** changing 059 `incidentMemory` when the id is
named. Subject-scoped live memory stays the live sidecar.
Investigation-scoped rows are a distinct field.

It is **not** putting live memory inside `investigationSnapshot`
or `snapshot_json`. The 048 object stays `{ id,
subjectResourceId, composedAt, snapshot }`.

It is **not** changing 073 `investigationResolutionMemory`.

It is **not** orphan-subject survival. Deleted Resource still
`RESOURCE_NOT_FOUND`.

It is **not** MCP writes, a fifth tool, lifecycle, `occurredAt`,
or inferred Incidents from provider activity.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Sequencing Rules (smallest deterministic
version; is persistence necessary; do not start a generic engine):

```text
exact evidence
    ↓
deterministic composition                          ← 043–047
    ↓
persist retained composition                       ← 048
    ↓
MCP observe of named-id snapshot                   ← 072
    ↓
MCP observe of 052 investigation-scoped
  Resolution recall                                ← 073
    ↓
MCP observe of 059 investigation-scoped
  Incident recall on that named id                 ← this Sprint
    ↓
earned abstraction / orphan survival / fifth tool  ← not this Sprint
```

`docs/internal/ROADMAP.md` v0.4 names CLI + MCP parity for core
read surfaces. `investigate_resource` is that surface.
`investigation <id>` INCIDENT MEMORY is the 059 reopen surface.
This Sprint puts that list on the existing tool when the agent
names an `inv:` id 073 already required for the Resolution wrap.

Sequencing Rule 9: persistence is **not** necessary. Reuse
`listIncidentsForInvestigation`. Do not rewrite Incident rows.
Do not rewrite `snapshot_json`. Do not add `incident_id` on
resolutions.

Sequencing Rule 8: Incident identity has one source of truth —
the 058 table. Membership is stored `res:` ids. Filter is
member Resolutions whose `investigationId` equals the named
`inv:`. Do not infer members, similarity, or Action. Do not
store `inv:` as members.

Sequencing Rule 2: 059 subject-scoped `incidentMemory` stays
that field. Do not replace it with the investigation-scoped
list when `investigationId` is named. CLI live `investigate`
and CLI `investigation <id>` already use those two filters;
MCP should keep both, not collapse them.

Sequencing Rule 4: the new claim is “these Incident rows have a
member Resolution recorded against named snapshot `<inv:id>`,”
not “these are all groupings for the subject,” not “these
Investigations are an Incident,” and not “this snapshot JSON
contains Incidents.”

---

# Problem

After 073:

```text
investigate_resource({ resourceId, investigationId: inv:a })
  incidentMemory                      # all subject incidents (059)
  investigationResolutionMemory       # that inv:’s res: rows
  # no investigation-scoped Incident list

investigation inv:a          # CLI 059 wrap: only incidents
                             # whose members include that inv:
```

The agent can name `inv:a` and still cannot obtain the 059
reopen list without joining 059 `incidentMemory.resolutionIds`
to 073 rows. 059 is the wrong claim (subject, not
Investigation). Resource-anchored-only Incidents are in 059
and out of CLI reopen. That is the 059 hole for the named-id
MCP path: the path already in use omits the scoped record the
human already has on CLI reopen.

---

# Product Question

> After investigation-scoped Resolution recall exists on
> `investigate_resource`, can that same named-id call return
> Incident rows whose members include a Resolution recorded
> against that exact Investigation — omitted when the id is not
> passed or when none exist, never mixed into snapshot JSON or
> 059 subject-scoped `incidentMemory`, without a fifth tool,
> without grouping `inv:` as Incident members, and without MCP
> writes?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** already shipped 059
   investigation-scoped recall on CLI reopen. **v0.4** names
   CLI + MCP parity. 059 shipped subject-scoped recall on this
   tool. 073 shipped the named Resolution wrap on this tool.
   The next smallest version of 059 is that same filter on that
   path.
2. **Sprint 073 leftover** lists grouping snapshots as members
   first, only *if earned*. leftover[0] stays frozen. Fifth-tool
   stays frozen. Orphan survival stays frozen. Investigation-
   scoped **Incident** memory is now earned (073 took
   Resolutions).
3. **Existing primitive check:** `listIncidentsForInvestigation`
   and `toIncidentMemory` already exist. Additive MCP fields are
   the 059 / 073 pattern. Four tools stay four tools. Reuse
   `investigationId`.
4. **Sequencing Rule 9:** persistence is **not** required.
5. **Founder override 2026-08-16** froze MCP *writes*. This is a
   read. 058 / 059 already authorized Incident recall. It does
   not authorize grouping `inv:` as members, `list_investigations`,
   a fifth tool, or writes.

Rejected as 074 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Fifth tool / `get_investigation` / `list_investigations` | Frozen four-tool contract |
| Replace 059 `incidentMemory` when id is named | Hides subject-scoped rows 071 / 073 callers already receive; 059 freeze |
| Put live memory inside `investigationSnapshot` | 072 SavedInvestigation shape; mixes live 058 into 048 |
| Change 073 `investigationResolutionMemory` | 073 freeze |
| Orphan-subject MCP survival | Live compose still requires the Resource; changes `RESOURCE_NOT_FOUND` |
| Infer latest `investigationHistory[0]` | Named id only |
| `occurredAt` | Second time field |
| Investigation lifecycle | Status is still a process claim |
| MCP writes | Founder override; policy is v0.9 |
| Similarity / “you should” / inferred Action | Forbidden |

---

# Exact Capability

```text
investigate_resource({ resourceId, investigationId? })
        ↓
compose InvestigationContext for resourceId (unchanged)
incidentMemory = listIncidentsForSubject(subject.id)   # 059
        ↓
if investigationId omitted / undefined:
  structuredContent unchanged from 073
  (no investigation-scoped Incident field)
        ↓
if investigationId present (after 071 / 072 gates):
  rows = listIncidentsForInvestigation(named)
  additive field = toIncidentMemory(rows)
  omit the key when rows is empty
        ↓
investigationSnapshot shape unchanged
snapshot_json unchanged
059 incidentMemory unchanged (still subject-scoped)
073 investigationResolutionMemory unchanged
```

CLI `investigate`, `investigation <id>` reopen, `--compare`,
056 / 059 / 070 / 071 / 072 / 073 MCP fields are unchanged when
`investigationId` is omitted. When the id is named, 073
Resolution wrap, 072 snapshot, and 071 compare stay; this field
is added beside them when that Investigation has Incident rows.

`get_related_context` is unchanged.

`--save` must **not** serialize the new field into
`snapshot_json`.

Exact field spelling is Phase 1. Expected input: **reuse
`investigationId`** (no new input). Expected field: **a distinct
key, not `incidentMemory`, not inside
`investigationSnapshot`.** Expected name:
**`investigationIncidentMemory`** (059 projection, 059
investigation filter). Not a formatted essay. Not Resolution
rows. Not `inv:` member ids.

Payload constraints:

- Named exact id only. No latest. No substring. No similarity.
- Same 071 / 072 gates: blank → usage; unknown → fail; subject
  mismatch → fail. Do not return a consolation list.
- Projection: reuse `toIncidentMemory` (`id`, `recordedAt`,
  `resolutionIds`, optional `title`). Order: existing
  `listIncidentsForInvestigation` / 059 list order.
- Distinct from live `incidentMemory` (subject-scoped 059).
  When both exist, they may overlap on Incidents that have a
  member Resolution for this Investigation; that is the same
  058 row, two filters, not two truths.
- Distinct from `investigationSnapshot.snapshot` (048). Do not
  add `incidentMemory` onto the SavedInvestigation object.
- Omit when `investigationId` is omitted. Omit when the named
  Investigation has zero matching Incident rows (059
  omit-empty).
- `content[]` one-liner stays compose summary.
- Live compose still requires the Resource. No orphan survival.
- Members stay `res:` ids. Do not store or return `inv:` as
  Incident members.

The four-tool list is unchanged:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

---

# Evidence / Claim Semantics

### KNOWN (about the field)

```text
These Incident rows have a member Resolution recorded against
named snapshot <inv:id> (exact stored member res: ids).
```

Omitting `investigationId` is **not** known-empty
investigation-scoped Incident memory. It is the 073 tool. Do
not invent a list.

Empty for a named id is omit, not “no organizational grouping
for the subject” (059 may still have subject-scoped rows).

### UNKNOWN / stale (required)

The list is **not** current provider authority. It does not
re-validate providers, does not rewrite the snapshot, and does
not imply a recommendation, a lifecycle status, or
`resolved: true`.

059 `incidentMemory` remains subject-scoped current local
recall. The new field is Investigation-scoped current local
recall. Neither is inside the frozen snapshot.

### Forbidden

```text
These rows prove the current provider state
These are all Incidents for the subject (that is 059)
Reopen the latest investigationHistory row
These Investigations are an Incident
You should rollback
resolved: true
This field is live Known Facts
This field is inside snapshot JSON / investigationSnapshot
Saving an investigation freezes this list into the snapshot
Incident members include inv: ids
```

---

# Architecture

```text
incidents table (058)                              unchanged
        ↓
listIncidentsForInvestigation                      059, unchanged
toIncidentMemory                                   059, unchanged
        ↓
investigate_resource structuredContent
  existing investigationId input (071)
  additive investigation-scoped Incident field (this Sprint)
```

Ownership:

- **Domain / Store:** no new type. No new column. No `incident_id`
  on resolutions. Do not store `inv:` ids as Incident members.
  Do not rewrite `snapshot_json` or Incident rows.
- **App:** reuse `listIncidentsForInvestigation` +
  `toIncidentMemory`. No new CLI helper.
- **CLI:** unchanged, including `investigation <id>` INCIDENT
  MEMORY.
- **MCP:** additive field when `investigationId` is valid and
  subject-aligned and rows exist. Tool description clause.
  `docs/public/MCP.md` investigate_resource row only (result).
- **059 `incidentMemory` / 073 `investigationResolutionMemory` /
  072 `investigationSnapshot`:** unchanged.

Adapters do not participate.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as Incident members, to replace 059 `incidentMemory`, to
put live memory inside `investigationSnapshot`, or to add
orphan survival: **STOP.**

---

# Persistence vs Read-Time

| Snapshot JSON | 059 CLI reopen | investigate_resource |
| --- | --- | --- |
| Frozen InvestigationContext | Live investigation-scoped list | Additive field when named |
| Unchanged JSON | not stored in snapshot | omitted when id omitted or empty |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- rewrite snapshot JSON
- change 059 `incidentMemory` filter
- put live memory on `investigationSnapshot`
- change 073 `investigationResolutionMemory`
- add MCP tools or writes
- infer latest snapshot
- infer Action from provider activity
- add Investigation lifecycle / `resolved: true`

---

# Boundedness

- Existing `investigate_resource` tool. No fifth tool. No new verb.
- Investigation-scoped Incidents only when the agent names an
  exact `inv:` id whose subject is this Resource.
- No grouping of Investigation snapshots as Incident members.
- No CLI change. No snapshot schema change. No 059 schema change.
- `MAX_INVESTIGATION_FACTS = 5` unchanged. Incidents are not facts.
- No extra hop. No provider calls. No schema migration.

---

# Failure / Unknown Semantics

- `investigationId` omitted: 073 behavior. No new field.
- Named id with zero investigation-scoped Incident rows: omit
  the key (exit success; 059 may still be present).
- Blank / unknown / mismatch: existing 071 / 072 fail-the-call.
- Resource missing: existing `RESOURCE_NOT_FOUND`. No consolation
  list. CLI deleted-subject reopen stays `investigation <id>`.
- `--investigation` on `incident` create: existing usage.

---

# Affected Surfaces

### CLI

Unchanged. 059 reopen wrap stays. 059 MCP subject-scoped field
stays. This Sprint is MCP-only for the investigation-scoped
list.

### MCP

Four tools. Additive investigation-scoped Incident field when
`investigationId` is valid, subject-aligned, and rows exist.
Tool description clause. `docs/public/MCP.md` investigate_resource
row (expected: **yes**, result only).

### Compare / snapshot / 073 Resolution wrap

Unchanged. Do not put Incidents inside `investigationCompare`,
`investigationSnapshot`, or `investigationResolutionMemory`.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md`
v0.7 059 recall and v0.4 agent boundary, this Sprint, SPRINT-059
projection, SPRINT-073 leftover split / MCP freeze, and inspect:

- `src/mcp/tools.ts` `investigate_resource` `incidentMemory`
  spread and 071 / 072 / 073 `investigationId` branch
- `listIncidentsForInvestigation` / `toIncidentMemory`
- CLI `investigation <id>` `formatWithIncidentMemory(...,
  "investigation")`
- `tests/app/mcp-protocol.test.ts` 059 / 073 contracts
  (073 already asserts no `investigationIncidentMemory`)
- `docs/public/MCP.md` investigate_resource row
- leftover[0] `incident --investigation` usage

Report:

1. Field name: `investigationIncidentMemory` vs nest on
   `investigationSnapshot` vs replace `incidentMemory`?
   Expected: **distinct sibling `investigationIncidentMemory`.**
2. New input vs reuse `investigationId`? Expected: **reuse.**
3. Projection: reuse `toIncidentMemory`? Expected: **yes.**
4. Omit when id omitted vs always-present `null`? Expected:
   **omit.** Omit when empty too.
5. 059 `incidentMemory` when id named: unchanged subject
   filter? Expected: **yes.**
6. 072 `investigationSnapshot` keys unchanged? Expected:
   **yes.**
7. 073 `investigationResolutionMemory` unchanged? Expected:
   **yes.**
8. `content[]` one-liner unchanged? Expected: **yes.**
9. Tool description + `docs/public/MCP.md` row? Expected:
   **yes**, that row only.
10. Fifth tool, `list_investigations`, grouping `inv:` as members,
    infer latest, `occurredAt`, orphan MCP survival? Expected:
    **no.**
11. CLI reopen / `--compare` / snapshot JSON rewrite /
    `get_related_context`? Expected: **no change.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? Same 058 rows as 059; different
   exact-id filter (Investigation membership vs subject
   membership). Not a new table.
3. Does listing Incidents leak “you should”? **No**, if labeled
   not current provider truth, not a recommendation — no rank,
   no rollback. Members stay `res:`.
4. Does this become snapshot JSON rewrite? **No.** Live list;
   048 object unchanged.
5. Fifth tool needed? Expected: **no.**
6. Grouping snapshots leak? **No.** leftover[0] frozen.
7. Infer latest from `investigationHistory`? Expected: **no.**
8. Replace 059 when named? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + the
   existing `docs/public/MCP.md` investigate_resource row. Not
   VISION / ARCHITECTURE / ROADMAP / SKILL.

If implementation is tempted to add `get_investigation`, to
replace 059 `incidentMemory`, to put live memory inside
`investigationSnapshot`, to store `inv:` as Incident members,
or to add orphan survival: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- still exactly four tools; annotations unchanged
- omitted `investigationId`: no new key; 056 / 059 / 070 / 071 /
  072 / 073 unchanged
- named matching `inv:` with an 058 grouping whose members
  include a Resolution for that Investigation: new field
  contains that `inc:` id; `resolutionIds` stay `res:`; digest
  unchanged
- an Incident whose members are only resource-anchored
  Resolutions for the same subject appears in 059
  `incidentMemory` and does **not** appear in the new field
- named `inv:` with zero investigation-scoped Incident rows:
  omit the new key; 059 may still be present
- 073 `investigationResolutionMemory` still lists only that
  Investigation’s `res:` rows
- 072 `investigationSnapshot` keys remain `id`,
  `subjectResourceId`, `composedAt`, `snapshot`
- other subject’s snapshot id fails (no consolation list)
- unknown / blank id fail as 071 / 072
- new field not present on `knownFacts` / `missingContext` /
  `investigationSnapshot` / `investigationCompare` /
  `investigationResolutionMemory`
- `--save` snapshot JSON still has no new key
- CLI `investigation <id>` unchanged
- leftover[0]: `incident --investigation` still usage
- no `list_investigations` / `get_investigation` tool
- no write tool; no `occurredAt`; no `inv:` member ids
- do not auto-use `investigationHistory[0]` when id omitted
- `content[]` stays the compose one-liner

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names. Never
write to `./.combie`. Use a **script file** for argv (not
`bun -e … "$DIR"`). Invoke the CLI as `bun src/cli/index.ts … --dir`
(not `bun run`, which can swallow `--dir`). Run MCP scripts from
the repo so `@modelcontextprotocol/client` resolves.

```text
investigate <id> --save                          # inv:a, inv:b
resolution --investigation inv:a --decision …    # res:a1
resolution --investigation inv:a --decision …    # res:a2
resolution --resource <id> --decision …          # res:r1, res:r2
incident --resolution res:a1 --resolution res:a2 # inc:inv-scoped
incident --resolution res:r1 --resolution res:r2 # inc:resource-only
# MCP omitted id: incidentMemory may include both; no new field
# MCP named inv:a: new field lists only inc:inv-scoped;
#   059 still lists subject-scoped rows; snapshot shape unchanged
# MCP named inv:b (no incident members): omit new key
investigation inv:a                              # CLI wrap unchanged
incident --investigation inv:a --investigation inv:b
  # still usage (leftover[0] frozen)
# four tools; digest unchanged after MCP reads
```

Confirm founder `.combie/combie.db` mtime/size unchanged if it
exists.

---

# Explicit Non-Goals

Do **not** implement:

- grouping Investigation snapshots as Incident members
- a fifth MCP tool (`list_investigations`, `get_investigation`)
- replacing 059 `incidentMemory` when `investigationId` is named
- live memory keys on `investigationSnapshot` / snapshot JSON
- changing 073 `investigationResolutionMemory`
- orphan-subject MCP survival / `subject_missing`
- replacing live compose with snapshot JSON
- inferred latest snapshot
- MCP writes
- snapshot JSON rewrite
- Investigation or Incident lifecycle / `resolved: true`
- `occurredAt`
- `incident_id` on Resolution rows
- inferred Action from provider activity
- similarity, “you should”, Learning, Recommendation
- CLI copy / help changes
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
051–073   (shipped; see SPRINT-073 leftover table)                 ✅
074       Investigation-scoped Incident memory on
          investigate_resource                                     ← this
075+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          orphan-subject MCP survival only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          inferred activity→Action (never, unless a later sprint
            explicitly reverses 051)
          similarity / recommendation / learning (v0.8)
          policy / execution (v0.9)
```

---

# Product / Contract Freezes

- MCP tools: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource` (exactly four; still read-only; no writes;
  existing `investigationId` + additive investigation-scoped
  Incident field)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 072 `investigationSnapshot` shape unchanged
- 073 `investigationResolutionMemory` unchanged
- 049 / 071 compare unchanged
- 056 subject-scoped `resolutionMemory` unchanged
- 059 subject-scoped `incidentMemory` unchanged
- grouping `inv:` as Incident members frozen
- `occurredAt` frozen
- fifth tool / `get_investigation` / `list_investigations` frozen
- orphan-subject MCP survival frozen
- inferred latest-snapshot frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP
- `docs/public/MCP.md` investigate_resource row only (this Sprint)

---

# Migration / Upgrade

None required. Recall is a read of the 058 table. No schema change.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as members, to rewrite `snapshot_json`, to replace 059
`incidentMemory`, or to put live memory inside
`investigationSnapshot`: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 074 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `investigate_resource` with named `investigationId`
      returns investigation-scoped Incident rows as an additive
      field; omitted when the id is not passed or empty; 059
      unchanged; not on snapshot JSON; not a fifth tool; members
      stay `res:`
- [x] if earned: CLI unchanged; no inferred latest; no `inv:`
      members; no `incident_id`; no MCP writes; no fifth tool
- [x] if not earned: rejection documented; do not add a fifth tool
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and the
      `docs/public/MCP.md` investigate_resource row

---

# Final Principle

> **Sprint 073 let agents name one exact `inv:` id and observe the
> 052 Resolutions recorded against it. Sprint 074 may let them
> observe the 059 Incidents whose members include those
> Resolutions. Combie must not invent the id, must not treat an
> Investigation as an Incident, must not hide subject-scoped 059
> memory, must not put live memory inside snapshot JSON, must not
> add a fifth tool, and must not thaw MCP writes to ship the
> list.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `78c91dd` (authoring-only working tree: AGENTS.md Active +
untracked `SPRINT-074.md`). Pins:

1. Field name: **`investigationIncidentMemory`.** Distinct
   sibling; do not nest on `investigationSnapshot` or replace
   `incidentMemory`.
2. Input: **reuse `investigationId`.**
3. Projection: **reuse `toIncidentMemory`** over
   `listIncidentsForInvestigation` rows.
4. Omit when id omitted: **omit the key.** Omit when empty too.
   Conditional spread (`safeJson` maps `undefined`→`null`).
5. 059 `incidentMemory` when id named: **unchanged** subject
   filter.
6. 072 `investigationSnapshot` keys: **`id`,
   `subjectResourceId`, `composedAt`, `snapshot`.**
7. 073 `investigationResolutionMemory`: **unchanged.**
8. `content[]` one-liner: **unchanged.**
9. Tool description + `docs/public/MCP.md` investigate_resource
   row: **yes**, that row only.
10. Fifth tool / `list_investigations` / grouping `inv:` as
    members / infer latest / `occurredAt` / orphan MCP survival:
    **no.**
11. CLI reopen / `--compare` / snapshot JSON rewrite /
    `get_related_context`: **no change.**

Wrap site: `src/mcp/tools.ts` `investigate_resource` after the
071 / 072 named-id gates; `listIncidentsForInvestigation` (059)
+ `toIncidentMemory` (059 projection); read-time membership join
over the 058 table. leftover[0] `incident --investigation` stays
usage.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **No.**
2. Second source of truth? **No.** Same 058 rows as 059;
   Investigation vs subject filter.
3. “You should”? **No** — labeled not current provider truth,
   not a recommendation.
4. Snapshot JSON rewrite? **No.**
5. Fifth tool needed? **No.**
6. Grouping snapshots leak? **No.** leftover[0] frozen.
7. Infer latest? **No.**
8. Replace 059 when named? **No.**
9. Canon? AGENTS.md operational baseline + `docs/public/MCP.md`
   investigate_resource row only.

No STOP conflict.

## Implemented

- Additive `investigationIncidentMemory` on existing
  `investigate_resource` when `investigationId` is present,
  valid, subject-aligned, and an 058 Incident has a member
  Resolution recorded against that Investigation. 059
  `toIncidentMemory` projection over
  `listIncidentsForInvestigation`.
- Reuses the 071 `investigationId` input and the 071 / 072 gates
  (blank → usage; unknown → fail; subject mismatch → fail). Omit
  when id omitted or empty.
- 059 `incidentMemory` stays `listIncidentsForSubject` whether
  the id is named or not.
- 073 `investigationResolutionMemory` unchanged; 072
  `investigationSnapshot` keys unchanged (no live memory keys).
- Tool description + input-schema clause +
  `docs/public/MCP.md` investigate_resource row only.
- leftover[0]: `incident --investigation` still usage.
- Four tools. No `list_investigations` / `get_investigation`.
  No MCP writes. Members stay `res:`; no `inv:` member ids; no
  `occurredAt`.

## Deviations

None.

## Validation

```text
baseline:          78c91dd docs(sprints): mark 073 complete
                   1100 pass / 78 files / 5425 expect()
bun test:          1101 pass across 78 files (5480 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-074-dogfood.* (never ./.combie)
                   investigate --save inv:a / inv:b
                   resolution --investigation inv:a (res:a1, res:a2)
                   resolution --resource <subject> (res:r1, res:r2)
                   incident (res:a1, res:a2) → inc:inv-scoped
                   incident (res:r1, res:r2) → inc:resource-only
                   MCP omitted id: 059 incidentMemory includes
                     both inc: rows; no investigationIncidentMemory
                   MCP named inv:a: new field lists only
                     inc:inv-scoped; 059 unchanged; snapshot keys
                     unchanged; members stay res:
                   MCP named inv:b (no incident members): omit
                     new key; 059 still present
                   investigation inv:a: CLI INCIDENT MEMORY
                     wrap unchanged (only inv-scoped grouping)
                   incident --investigation … still usage (exit 1)
                   four tools; digest unchanged after MCP reads
                   Isolated dogfood left founder
                     .combie/combie.db and ~/.combie/combie.db
                     mtime/size unchanged.
```

## Learnings

- Keep 059 as the subject claim and add a sibling for the
  Investigation claim. Replacing `incidentMemory` when the id
  is named would hide resource-anchored-only groupings 071 / 073
  callers already receive.
- Exclusive 058 membership means fixture `res:` ids cannot
  overlap Incident groupings; the mixed and resource-anchored-only
  groupings need disjoint members.
- Load the scoped list only after the 071 / 072 gates pass so
  unknown / cross-subject ids fail the whole call with no
  consolation list.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md
baseline becomes Sprints 001–074 complete.
`docs/public/MCP.md` investigate_resource row gains
`investigationIncidentMemory`. Sprint 075 is not started.
Grouping Investigation snapshots as Incident members remains
unearned. Fifth-tool snapshot reopen / `list_investigations`
remains unearned. Orphan-subject MCP survival remains unearned.
`occurredAt` remains unearned.
