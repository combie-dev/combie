# SPRINT-073 — Investigation-scoped Resolution Memory on investigate_resource

> **Status:** Complete
> **Depends on:** SPRINT-072 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.7 Resolution
> recall (Sprint 052) on the agent investigate path already in
> use, after 072 named-id snapshot exists so the CLI
> `investigation <id>` wrap has an MCP home. Sprint 072 leftover
> list is **not** a sequence. leftover[0] **group Investigations
> as Incident members** stays **unearned** (Investigation ≠
> Incident; members stay `res:`). leftover[1] **fifth-tool
> snapshot reopen / `list_investigations`** stays frozen. This
> Sprint takes **investigation-scoped Resolution recall** (the
> 052 reopen wrap) on existing `investigate_resource` when
> `investigationId` is named. Does **not** authorize
> Recommendation, Learning, similarity, Investigation lifecycle,
> MCP writes, a fifth tool, inferred Action, grouping snapshots
> as members, `occurredAt`, incident-scoped memory on this path,
> orphan-subject MCP survival, replacing live compose, or
> changing 056 subject-scoped `resolutionMemory`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory
> — **exact-id Resolution recall scoped to a named Investigation
> on existing `investigate_resource`**, plus v0.4 CLI + MCP
> parity for that 052 reopen surface; not Incident recall on the
> snapshot path, not lifecycle, not the Investigation Engine, not
> a fifth tool, not MCP writes
> **Type:** Narrow additive MCP field over already-persisted
> Resolution rows (051 table, 052 `listResolutions({
> investigationId })`, 056 projection)
> **Primary goal:** When an agent investigates an exact Resource
> through the existing `investigate_resource` tool and names one
> exact snapshot id, Combie returns Resolution rows recorded
> against that Investigation as an additive structured field —
> omitted when the id is not passed or when that Investigation
> has none, never mixed into snapshot JSON or live Known Facts,
> never replacing 056 subject-scoped `resolutionMemory`, never a
> fifth tool — without grouping `inv:` as Incident members and
> without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. This
> Sprint adds an optional **field** on `investigate_resource` only
> (reuses the 071 `investigationId` input). No fifth tool. No
> writes. 056 `resolutionMemory` stays subject-scoped whether the
> id is omitted or named. 072 `investigationSnapshot` shape
> unchanged (no live memory keys on the 048 object). 059
> `incidentMemory` unchanged. 071 `investigationCompare`
> unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 072 shipped named-id **snapshot** on live investigate:

```text
investigate_resource({ resourceId, investigationId? })
  live compose
  resolutionMemory                 # 056, subject-scoped
  investigationSnapshot            # 048, when investigationId named
  investigationCompare             # 049, when investigationId named
```

Agents can name `inv:a` and see the frozen compose. They still
cannot ask the 052 reopen question on that same tool:

```text
Which Resolutions were recorded against this named Investigation?
```

CLI already answers it:

```text
investigation <id>
  RESOLUTION MEMORY     # listResolutions({ investigationId })
```

Live `investigate` and MCP `resolutionMemory` answer a different
question:

```text
Which Resolutions were recorded against this exact subject?
```

Those sets are not the same. Resource-anchored rows and other
Investigations’ rows for the same subject appear on 056 and do
not appear on CLI reopen of `inv:a`.

Sprint 072 leftover:

```text
073+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          orphan-subject MCP survival only if earned
          investigation-scoped memory on snapshot MCP only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
072 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. leftover[0] stays
unearned.

leftover[1] **fifth-tool / `list_investigations`** stays frozen.
072 already did 048 observe on the existing tool. Unfiltered list
and `get_investigation` have no four-tool home.

leftover **investigation-scoped memory on snapshot MCP**
conflates two wraps. CLI `investigation <id>` attaches
investigation-scoped RESOLUTION MEMORY (052) and investigation-
scoped INCIDENT MEMORY (059). 056 / 059 already shipped
**subject-scoped** recall on this tool. This Sprint takes the
052 wrap only (Resolution). Incident wrap stays a later slice.

This Sprint **splits** that leftover:

```text
fifth tool / list_investigations / get_investigation
  → still frozen
orphan-subject MCP survival
  → still frozen (live compose still requires the Resource)
investigation-scoped incident memory on this path
  → still frozen (059 analog; not this Sprint)
additive investigation-scoped Resolution list on existing
  investigate_resource (named investigationId; 052 semantics)
  → this Sprint
```

No founder override is required. 051 / 052 already authorized
Resolution capture and exact-id recall. 056 put subject-scoped
recall on this tool. 072 put the named snapshot on this tool.
Copying the stable 056 projection onto `listResolutions({
investigationId })` is the 069 → 070 analog for the reopen wrap.
Do not infer “latest snapshot.” The agent must name the id.
Do not add a second input; reuse `investigationId`.

It is **not** grouping Investigation snapshots as Incident members.
`--investigation` on `incident` create stays usage.

It is **not** changing 056 `resolutionMemory` when the id is
named. Subject-scoped live memory stays the live sidecar.
Investigation-scoped rows are a distinct field.

It is **not** putting live memory inside `investigationSnapshot`
or `snapshot_json`. The 048 object stays `{ id,
subjectResourceId, composedAt, snapshot }`.

It is **not** 059 investigation-scoped INCIDENT MEMORY on MCP.
`incidentMemory` stays subject-scoped.

It is **not** orphan-subject survival. Deleted Resource still
`RESOURCE_NOT_FOUND`.

It is **not** MCP writes, a fifth tool, lifecycle, `occurredAt`,
or inferred Resolutions from provider activity.

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
  Resolution recall on that named id               ← this Sprint
    ↓
earned abstraction / incident wrap / orphan
  survival / fifth tool                            ← not this Sprint
```

`docs/internal/ROADMAP.md` v0.4 names CLI + MCP parity for core
read surfaces. `investigate_resource` is that surface.
`investigation <id>` RESOLUTION MEMORY is the 052 reopen surface.
This Sprint puts that list on the existing tool when the agent
names an `inv:` id 072 already required for snapshot.

Sequencing Rule 9: persistence is **not** necessary. Reuse
`listResolutions({ investigationId })`. Do not rewrite Resolution
rows. Do not rewrite `snapshot_json`.

Sequencing Rule 8: Resolution identity has one source of truth —
the 051 table. Filter is the named `inv:` id. Do not infer
members, similarity, or Action.

Sequencing Rule 2: 056 subject-scoped `resolutionMemory` stays
that field. Do not replace it with the investigation-scoped
list when `investigationId` is named. CLI live `investigate`
and CLI `investigation <id>` already use those two filters;
MCP should keep both, not collapse them.

Sequencing Rule 4: the new claim is “these Resolution rows were
recorded against named snapshot `<inv:id>`,” not “these are all
responses for the subject,” not “these Investigations are an
Incident,” and not “this snapshot JSON contains Resolutions.”

---

# Problem

After 072:

```text
investigate_resource({ resourceId, investigationId: inv:a })
  resolutionMemory           # all subject rows (056)
  investigationSnapshot      # 048 body
  # no investigation-scoped Resolution list

investigation inv:a          # CLI 052 wrap: only that inv:’s rows
```

The agent can name `inv:a` and still cannot obtain the 052
reopen list without filtering 056 client-side — and 056 is the
wrong claim (subject, not Investigation). Resource-anchored
rows and other Investigations’ rows are in 056 and out of CLI
reopen. That is the 052 hole for the named-id MCP path: the
path already in use omits the scoped record the human already
has on CLI reopen.

---

# Product Question

> After the 048 snapshot exists on `investigate_resource`, can
> that same named-id call return Resolution rows recorded against
> that exact Investigation — omitted when the id is not passed
> or when none exist, never mixed into snapshot JSON or 056
> subject-scoped `resolutionMemory`, without a fifth tool,
> without investigation-scoped Incident memory, without grouping
> `inv:` as Incident members, and without MCP writes?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** already shipped 052
   investigation-scoped recall on CLI reopen. **v0.4** names
   CLI + MCP parity. 056 shipped subject-scoped recall on this
   tool. 072 made `investigationId` a named snapshot on this
   tool. The next smallest version of 052 is that same filter
   on that path.
2. **Sprint 072 leftover** lists grouping snapshots as members
   first, only *if earned*. leftover[0] stays frozen. Fifth-tool
   stays frozen. Orphan survival stays frozen (would change
   `RESOURCE_NOT_FOUND`). Investigation-scoped **Incident**
   memory is the 059 analog — later. This Sprint takes the 052
   wrap.
3. **Existing primitive check:** `listResolutions({
   investigationId })` and `toResolutionMemory` already exist.
   Additive MCP fields are the 056 / 070 / 071 / 072 pattern.
   Four tools stay four tools. Reuse `investigationId`.
4. **Sequencing Rule 9:** persistence is **not** required.
5. **Founder override 2026-08-16** froze MCP *writes*. This is a
   read. 051 / 052 already authorized Resolution recall. It
   does not authorize Incident wrap, `list_investigations`, a
   fifth tool, or writes.

Rejected as 073 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Fifth tool / `get_investigation` / `list_investigations` | Frozen four-tool contract |
| Replace 056 `resolutionMemory` when id is named | Hides subject-scoped rows 071 / 072 callers already receive; 056 freeze |
| Put live memory inside `investigationSnapshot` | 072 SavedInvestigation shape; mixes live 051 into 048 |
| Investigation-scoped `incidentMemory` | 059 analog; leftover split; not this Sprint |
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
resolutionMemory = listResolutions({ subjectResourceId })   # 056
        ↓
if investigationId omitted / undefined:
  structuredContent unchanged from 072
  (no investigation-scoped Resolution field)
        ↓
if investigationId present (after 071 / 072 gates):
  rows = listResolutions({ investigationId: named })
  additive field = toResolutionMemory(rows)
  omit the key when rows is empty
        ↓
investigationSnapshot shape unchanged
snapshot_json unchanged
056 resolutionMemory unchanged (still subject-scoped)
```

CLI `investigate`, `investigation <id>` reopen, `--compare`,
056 / 059 / 070 / 071 / 072 MCP fields are unchanged when
`investigationId` is omitted. When the id is named, 072
snapshot and 071 compare stay; this field is added beside them
when that Investigation has Resolution rows.

`get_related_context` is unchanged.

`--save` must **not** serialize the new field into
`snapshot_json`.

Exact field spelling is Phase 1. Expected input: **reuse
`investigationId`** (no new input). Expected field: **a distinct
key, not `resolutionMemory`, not inside
`investigationSnapshot`.** Expected name:
**`investigationResolutionMemory`** (056 projection, 052
filter). Not a formatted essay. Not Incident rows.

Payload constraints:

- Named exact id only. No latest. No substring. No similarity.
- Same 071 / 072 gates: blank → usage; unknown → fail; subject
  mismatch → fail. Do not return a consolation list.
- Projection: reuse `toResolutionMemory` (`id`, `recordedAt`,
  optional `investigationId` / `decision` / `action` /
  `outcome` / `evidenceIds`). Order: existing
  `listResolutions` (`recordedAt` DESC, `id` DESC).
- Distinct from live `resolutionMemory` (subject-scoped 056).
  When both exist, they may overlap on rows whose
  `investigationId` equals the named id; that is the same 051
  row, two filters, not two truths.
- Distinct from `investigationSnapshot.snapshot` (048). Do not
  add `resolutionMemory` onto the SavedInvestigation object.
- Omit when `investigationId` is omitted. Omit when the named
  Investigation has zero Resolution rows (056 omit-empty).
- `content[]` one-liner stays compose summary.
- Live compose still requires the Resource. No orphan survival.
- Do not attach investigation-scoped Incident rows.

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
These Resolution rows were recorded against named snapshot
<inv:id> (decision / action / outcome as retained fields).
```

Omitting `investigationId` is **not** known-empty
investigation-scoped memory. It is the 072 tool. Do not invent
a list.

Empty for a named id is omit, not “no organizational response
for the subject” (056 may still have subject-scoped rows).

### UNKNOWN / stale (required)

The list is **not** current provider authority. It does not
re-validate providers, does not rewrite the snapshot, and does
not imply a recommendation, an Incident, or `resolved: true`.

056 `resolutionMemory` remains subject-scoped current local
recall. The new field is Investigation-scoped current local
recall. Neither is inside the frozen snapshot.

### Forbidden

```text
These rows prove the current provider state
These are all Resolutions for the subject (that is 056)
Reopen the latest investigationHistory row
These Investigations are an Incident
You should rollback
resolved: true
This field is live Known Facts
This field is inside snapshot JSON / investigationSnapshot
Saving an investigation freezes this list into the snapshot
```

---

# Architecture

```text
resolutions table (051)                            unchanged
        ↓
listResolutions({ investigationId })               052, unchanged
toResolutionMemory                                 056, unchanged
        ↓
investigate_resource structuredContent
  existing investigationId input (071)
  additive investigation-scoped Resolution field (this Sprint)
```

Ownership:

- **Domain / Store:** no new type. No new column. No `incident_id`.
  Do not store `inv:` ids as Incident members. Do not rewrite
  `snapshot_json` or Resolution rows.
- **App:** reuse `listResolutions` + `toResolutionMemory`. No new
  CLI helper.
- **CLI:** unchanged, including `investigation <id>` RESOLUTION
  MEMORY.
- **MCP:** additive field when `investigationId` is valid and
  subject-aligned and rows exist. Tool description clause.
  `docs/public/MCP.md` investigate_resource row only (result).
- **056 `resolutionMemory` / 072 `investigationSnapshot`:**
  unchanged.

Adapters do not participate.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as Incident members, to replace 056 `resolutionMemory`, to
put live memory inside `investigationSnapshot`, to attach
Incident rows, or to add orphan survival: **STOP.**

---

# Persistence vs Read-Time

| Snapshot JSON | 052 CLI reopen | investigate_resource |
| --- | --- | --- |
| Frozen InvestigationContext | Live investigation-scoped list | Additive field when named |
| Unchanged JSON | not stored in snapshot | omitted when id omitted or empty |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- rewrite snapshot JSON
- change 056 `resolutionMemory` filter
- put live memory on `investigationSnapshot`
- add MCP tools or writes
- infer latest snapshot
- infer Action from provider activity
- add Investigation lifecycle / `resolved: true`

---

# Boundedness

- Existing `investigate_resource` tool. No fifth tool. No new verb.
- Investigation-scoped Resolutions only when the agent names an
  exact `inv:` id whose subject is this Resource.
- No grouping of Investigation snapshots as Incident members.
- No CLI change. No snapshot schema change. No 056 schema change.
- `MAX_INVESTIGATION_FACTS = 5` unchanged. Resolutions are not facts.
- No extra hop. No provider calls. No schema migration.

---

# Failure / Unknown Semantics

- `investigationId` omitted: 072 behavior. No new field.
- Named id with zero investigation-scoped rows: omit the key
  (exit success; 056 may still be present).
- Blank / unknown / mismatch: existing 071 / 072 fail-the-call.
- Resource missing: existing `RESOURCE_NOT_FOUND`. No consolation
  list. CLI deleted-subject reopen stays `investigation <id>`.
- `--investigation` on `incident` create: existing usage.

---

# Affected Surfaces

### CLI

Unchanged. 052 reopen wrap stays. 056 is MCP-only for this
Sprint.

### MCP

Four tools. Additive investigation-scoped Resolution field when
`investigationId` is valid, subject-aligned, and rows exist.
Tool description clause. `docs/public/MCP.md` investigate_resource
row (expected: **yes**, result only).

### Compare / snapshot

Unchanged. Do not put Resolutions inside `investigationCompare`
or `investigationSnapshot`.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md`
v0.7 052 recall and v0.4 agent boundary, this Sprint, SPRINT-052
/ SPRINT-056 projection, SPRINT-072 leftover split / MCP freeze,
and inspect:

- `src/mcp/tools.ts` `investigate_resource` `resolutionMemory`
  spread and 071 / 072 `investigationId` branch
- `listResolutions({ investigationId })` / `toResolutionMemory`
- CLI `investigation <id>` `formatWithResolutionMemory(...,
  "investigation")`
- `tests/app/mcp-protocol.test.ts` 056 / 072 contracts
- `docs/public/MCP.md` investigate_resource row
- leftover[0] `incident --investigation` usage

Report:

1. Field name: `investigationResolutionMemory` vs nest on
   `investigationSnapshot` vs replace `resolutionMemory`?
   Expected: **distinct sibling `investigationResolutionMemory`.**
2. New input vs reuse `investigationId`? Expected: **reuse.**
3. Projection: reuse `toResolutionMemory`? Expected: **yes.**
4. Omit when id omitted vs always-present `null`? Expected:
   **omit.** Omit when empty too.
5. 056 `resolutionMemory` when id named: unchanged subject
   filter? Expected: **yes.**
6. 072 `investigationSnapshot` keys unchanged? Expected:
   **yes.**
7. `content[]` one-liner unchanged? Expected: **yes.**
8. Tool description + `docs/public/MCP.md` row? Expected:
   **yes**, that row only.
9. Fifth tool, `list_investigations`, grouping `inv:` as members,
   infer latest, `occurredAt`, orphan MCP survival,
   investigation-scoped Incident memory? Expected: **no.**
10. CLI reopen / `--compare` / snapshot JSON rewrite /
    `get_related_context`? Expected: **no change.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? Same 051 rows as 056; different
   exact-id filter (Investigation vs subject). Not a new table.
3. Does listing Resolutions leak “you should”? **No**, if labeled
   not current provider truth, not an incident, not a
   recommendation — no rank, no rollback.
4. Does this become snapshot JSON rewrite? **No.** Live list;
   048 object unchanged.
5. Fifth tool needed? Expected: **no.**
6. Grouping snapshots leak? **No.** leftover[0] frozen.
7. Infer latest from `investigationHistory`? Expected: **no.**
8. Replace 056 when named? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + the
   existing `docs/public/MCP.md` investigate_resource row. Not
   VISION / ARCHITECTURE / ROADMAP / SKILL.

If implementation is tempted to add `get_investigation`, to
replace 056 `resolutionMemory`, to put live memory inside
`investigationSnapshot`, to attach Incident rows, to store `inv:`
as Incident members, or to add orphan survival: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- still exactly four tools; annotations unchanged
- omitted `investigationId`: no new key; 056 / 070 / 071 / 072
  unchanged
- named matching `inv:` with a 051 row: new field contains that
  `res:` id; `investigationId` on the row matches; digest
  unchanged
- resource-anchored Resolution for the same subject appears in
  056 `resolutionMemory` and does **not** appear in the new field
- other Investigation’s Resolution for the same subject does
  **not** appear in the new field
- named `inv:` with zero investigation-scoped rows: omit the new
  key; 056 may still be present
- other subject’s snapshot id fails (no consolation list)
- unknown / blank id fail as 071 / 072
- new field not present on `knownFacts` / `missingContext` /
  `investigationSnapshot` / `investigationCompare`
- `--save` snapshot JSON still has no new key
- 072 `investigationSnapshot` keys remain `id`,
  `subjectResourceId`, `composedAt`, `snapshot`
- CLI `investigation <id>` unchanged
- leftover[0]: `incident --investigation` still usage
- no `list_investigations` / `get_investigation` tool
- no write tool; no `occurredAt`; no investigation-scoped
  Incident field
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
investigate <id> --save                          # inv:a
resolution --investigation inv:a --decision …
resolution --resource <id> --decision …          # resource-anchored
# MCP omitted id: resolutionMemory may include both; no new field
# MCP named inv:a: new field lists only the investigation-anchored
#   row; 056 still lists subject-scoped rows; snapshot shape
#   unchanged
# MCP named inv:a after only resource-anchored rows: omit new key
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
- replacing 056 `resolutionMemory` when `investigationId` is named
- live memory keys on `investigationSnapshot` / snapshot JSON
- investigation-scoped Incident memory on this path
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
051–072   (shipped; see SPRINT-072 leftover table)                 ✅
073       Investigation-scoped Resolution memory on
          investigate_resource                                     ← this
074+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          investigation-scoped Incident memory on this path
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
  Resolution field)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 072 `investigationSnapshot` shape unchanged
- 049 / 071 compare unchanged
- 056 subject-scoped `resolutionMemory` unchanged
- 059 subject-scoped `incidentMemory` unchanged
- grouping `inv:` as Incident members frozen
- `occurredAt` frozen
- fifth tool / `get_investigation` / `list_investigations` frozen
- orphan-subject MCP survival frozen
- investigation-scoped Incident memory on MCP frozen
- inferred latest-snapshot frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP
- `docs/public/MCP.md` investigate_resource row only (this Sprint)

---

# Migration / Upgrade

None required. Recall is a read of the 051 table. No schema change.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as members, to rewrite `snapshot_json`, to replace 056
`resolutionMemory`, or to put live memory inside
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

- [x] Sprint 073 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `investigate_resource` with named `investigationId`
      returns investigation-scoped Resolution rows as an additive
      field; omitted when the id is not passed or empty; 056
      unchanged; not on snapshot JSON; not a fifth tool
- [x] if earned: CLI unchanged; no inferred latest; no `inv:`
      members; no `incident_id`; no MCP writes; no fifth tool;
      no investigation-scoped Incident field
- [x] if not earned: rejection documented; do not add a fifth tool
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and the
      `docs/public/MCP.md` investigate_resource row

---

# Final Principle

> **Sprint 072 let agents name one exact `inv:` id and observe the
> 048 snapshot. Sprint 073 may let them observe the 052
> Resolutions recorded against that same id. Combie must not
> invent the id, must not treat an Investigation as an Incident,
> must not hide subject-scoped 056 memory, must not put live
> memory inside snapshot JSON, must not add a fifth tool, and
> must not thaw MCP writes to ship the list.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `327342c` (authoring-only working tree: AGENTS.md Active +
untracked `SPRINT-073.md`). Pins:

1. Field name: **`investigationResolutionMemory`.** Distinct
   sibling; do not nest on `investigationSnapshot` or replace
   `resolutionMemory`.
2. Input: **reuse `investigationId`.**
3. Projection: **reuse `toResolutionMemory`.**
4. Omit when id omitted: **omit the key.** Omit when empty too.
   Conditional spread (`safeJson` maps `undefined`→`null`).
5. 056 `resolutionMemory` when id named: **unchanged** subject
   filter.
6. 072 `investigationSnapshot` keys: **`id`,
   `subjectResourceId`, `composedAt`, `snapshot`.**
7. `content[]` one-liner: **unchanged.**
8. Tool description + `docs/public/MCP.md` investigate_resource
   row: **yes**, that row only.
9. Fifth tool / `list_investigations` / grouping `inv:` as
   members / infer latest / `occurredAt` / orphan MCP survival /
   investigation-scoped Incident memory: **no.**
10. CLI reopen / `--compare` / snapshot JSON rewrite /
    `get_related_context`: **no change.**

Wrap site: `src/mcp/tools.ts` `investigate_resource` after the
071 / 072 named-id gates; `listResolutions({ investigationId })`
ordered `recorded_at` DESC, `id` DESC. leftover[0]
`incident --investigation` stays usage.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **No.**
2. Second source of truth? **No.** Same 051 rows as 056;
   Investigation vs subject filter.
3. “You should”? **No** — labeled not current provider truth,
   not an incident, not a recommendation.
4. Snapshot JSON rewrite? **No.**
5. Fifth tool needed? **No.**
6. Grouping snapshots leak? **No.** leftover[0] frozen.
7. Infer latest? **No.**
8. Replace 056 when named? **No.**
9. Canon? AGENTS.md operational baseline + `docs/public/MCP.md`
   investigate_resource row only.

No STOP conflict.

## Implemented

- Additive `investigationResolutionMemory` on existing
  `investigate_resource` when `investigationId` is present,
  valid, subject-aligned, and that Investigation has Resolution
  rows. 056 `toResolutionMemory` projection.
- Reuses the 071 `investigationId` input. Omit when id omitted
  or empty.
- 056 `resolutionMemory` stays `listResolutions({
  subjectResourceId })` whether the id is named or not.
- 072 `investigationSnapshot` shape unchanged (no live memory
  keys).
- Tool description clause + `docs/public/MCP.md`
  investigate_resource row only.
- leftover[0]: `incident --investigation` still usage.
- Four tools. No `list_investigations` / `get_investigation`.
  No MCP writes. No investigation-scoped Incident field.

## Deviations

None.

## Validation

```text
baseline:          327342c docs(sprints): mark 072 complete
                   1099 pass / 78 files / 5382 expect()
bun test:          1100 pass across 78 files (5425 expect() calls)
                   (MCP stdio digest flake on 065/066/067 under
                   parallel file run; isolation + this full-suite
                   run passed)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-073-dogfood.* (never ./.combie)
                   investigate --save inv:a / inv:b
                   resolution --investigation inv:a
                   resolution --resource <subject>
                   MCP omitted id: 056 lists both; no
                     investigationResolutionMemory
                   MCP named inv:a: scoped field is only the
                     investigation-anchored row; 056 unchanged;
                     snapshot keys unchanged
                   MCP named inv:b (no rows): omit scoped field;
                     snapshot present
                   investigation inv:a: CLI wrap unchanged
                   incident --investigation still usage
                   four tools; digest unchanged after MCP reads
                   Isolated dogfood left founder
                     .combie/combie.db and ~/.combie/combie.db
                     mtime/size unchanged.
```

## Learnings

- Keep 056 as the subject claim and add a sibling for the
  Investigation claim. Replacing `resolutionMemory` when the id
  is named would hide resource-anchored rows 071 / 072 callers
  already receive.
- Load the scoped list only after the 071 / 072 gates pass so
  unknown / cross-subject ids fail the whole call with no
  consolation list.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md
baseline becomes Sprints 001–073 complete.
`docs/public/MCP.md` investigate_resource row gains
`investigationResolutionMemory`. Sprint 074 is not started.
Grouping Investigation snapshots as Incident members remains
unearned. Fifth-tool snapshot reopen / `list_investigations`
remains unearned. Investigation-scoped Incident memory on this
path remains unearned. Orphan-subject MCP survival remains
unearned. `occurredAt` remains unearned.
