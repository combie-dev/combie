# SPRINT-068 — Rewrite an Existing Incident recordedAt

> **Status:** Complete
> **Depends on:** SPRINT-067 (complete)
> **Authorized by:** founder override, 2026-08-18 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> recordedAt-rewrite slice after create, retitle, title-clear,
> append, remove, list retrieve, and Incident-anchored write exist.
> Replaces the AGENTS.md line that 067 leftover is not a sequence
> and grouping Investigation snapshots as members remains unearned
> — leftover[0] stays **unearned** (Investigation ≠ Incident;
> members stay `res:`). This Sprint takes leftover[1]
> **recordedAt rewrite only**. Does **not** authorize
> Recommendation, Learning, similarity, Investigation lifecycle,
> MCP writes, inferred Action, grouping snapshots as members,
> deleting the Incident, adding `occurredAt`, or `incident_id`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **explicit replace of an existing Incident's observation time**,
> not membership mutate, not deleting the Incident, not
> `incident_id` on `resolutions`, not inferred time from members
> or evidence, not a second time column, not snapshot rewrite, not
> MCP writes
> **Type:** Narrow required field mutation on the existing Incident
> `recorded_at` column (named ISO text only)
> **Primary goal:** A human can replace `recordedAt` on an exact
> existing `inc:` — named ISO only, title / members unchanged —
> without inferring a time, without grouping `inv:` snapshots as
> members, without adding `occurredAt` or `incident_id`, and
> without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. Existing `incidentMemory.recordedAt`
> observes the new value via the 058 field. `resolutionMemory`
> unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 058–067 shipped create, append, remove, recall, list
retrieve, Incident-anchored write, retitle, and title-clear:

```text
incident --resolution res:a --resolution res:b [--title]
incident <inc> --resolution res:d
incident <inc> --remove-resolution res:d
incident <inc> --title "Better name"
incident <inc> --clear-title
resolution --incident <inc> [--resource]
incidents [--resolution|--resource|--investigation]
INCIDENT MEMORY / incidentMemory
```

`recordedAt` is still create-time only:

```text
incident --resolution res:a --resolution res:b
incident inc:…                             # Recorded by Combie at <create>
# no path replaces that observation time
```

Sprint 067 leftover:

```text
068+      group Investigations directly only if earned
          rewrite recordedAt only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
067 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. Leftover[0] stays
unearned.

This Sprint takes leftover[1] **recordedAt rewrite** only under
the founder override below. Deleting the Incident, adding
`occurredAt`, and grouping `inv:` as members stay later / frozen.

It is **not** grouping Investigation snapshots as members.
`--investigation` on `incident` create stays usage.

It is **not** 066 retitle or 067 title-clear. `--title` still
requires text. `--clear-title` still omits title. Title is
unchanged on this path.

It is **not** 058 create. Create still stamps `recordedAt` as
now. Do not add `--recorded-at` on create.

It is **not** a second time column. Do not add `occurredAt` /
`happenedAt`. The field stays the 058 `recordedAt`.

It is **not** rewriting Resolution `recordedAt` or Investigation
`composedAt`.

It is **not** membership change. `resolution_ids` stay as stored.

It is **not** `incident_id` on `resolutions`. Membership stays the
058 array.

It is **not** MCP writes, a fifth tool, lifecycle, or inferred
time from members / subject / evidence / "now".

---

# Founder Override

`AGENTS.md` after Sprint 067 recorded that the 067 leftover is not
a sequence, grouping Investigation snapshots as members remains
unearned, and `recordedAt` rewrite remains unearned. Sequencing
Rule 2 still holds: 058/066/067 title paths do not restamp.
Grouping `inv:` ids as members is not the next slice.

On 2026-08-18 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  resource-specific experience. A grouping whose title can be set,
  replaced, and omitted but whose observation time is write-once
  cannot be corrected if stamped at the wrong moment.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  named `--recorded-at` on an existing `inc:` now that title
  mutate exists, rather than waiting for a ledger of “I grouped it
  at the wrong time and had to live with it.”
- Leftover[0] (group snapshots as members) is **not** authorized.
  Investigation ≠ Incident. Members stay `res:`.
- Adding `occurredAt` is **not** authorized. That would be a
  second time field (occurrence vs observation). This Sprint
  replaces the existing 058 `recordedAt`.
- Deleting the Incident is **not** authorized.
- `--recorded-at` on 058 create is **not** authorized. Create
  still stamps now. This Sprint is rewrite-on-existing.
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision
  rule, and it does not authorize Recommendation, Learning,
  similarity, Investigation lifecycle, MCP writes, inferred Action,
  grouping snapshots as members, or `occurredAt`.
- Same pattern as Sprint 066 → 067: leftover order is not a
  sequence; leftover[0] is skipped because it conflicts with
  Investigation ≠ Incident. This Sprint takes recordedAt rewrite
  only.

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
group existing responses as one occurrence         ← 058 / 062 / 065
    ↓
recall / retrieve that grouping                    ← 059 / 060 / 063
    ↓
hang a new response on that grouping               ← 061 / 064
    ↓
name / rename that grouping after record           ← 066
    ↓
omit that name after record                        ← 067
    ↓
replace when that grouping was recorded            ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: persistence is an UPDATE of the existing
`recorded_at` column only. Do not UPDATE `title`. Do not UPDATE
`resolution_ids`. Do not delete the Incident. Do not add
`incident_id`. Do not add `occurred_at`.

Sequencing Rule 8: recordedAt has one source of truth — the 058
`recordedAt` field. Persist canonical ISO (`Date#toISOString`).
Do not store empty string. Do not infer the time.

Sequencing Rule 2: 058 create still stamps now. 066 retitle and
067 clear still leave `recordedAt` unchanged. 062 append and 065
remove still reject time flags. This Sprint does not replace
those.

Sequencing Rule 4: the new claim is “the human named this
existing grouping to use this recordedAt,” not “Combie inferred
when the outage happened” and not “these Investigations are now
an Incident.”

---

# Problem

After create:

```text
incident --resolution res:a --resolution res:b --title "API error spike"
incident inc:…
  # Recorded by Combie at <create-time>
incident inc:… --recorded-at 2026-08-17T20:00:00.000Z
  # usage (no such flag)
```

The list RECORDED AT column, show line, and INCIDENT MEMORY
identity stay create-time unless the row is deleted and recreated
(which would mint a new `inc:` and break membership exclusivity).

The missing claim:

```text
The human named this exact Incident to use this recordedAt.
Title and members are unchanged.
```

That is explicit. It is **not** inferred from provider activity.
It is **not** grouping `inv:` snapshots as members. It is **not**
membership mutate. It is **not** a new occurrence-time field.

---

# Product Question

> After explicit Incidents can be titled, retitled, and un-named,
> can Combie replace `recordedAt` on the exact `inc:` — named ISO
> only, title / members unchanged — without inferring the time,
> without grouping Investigation snapshots as members, without
> `occurredAt`, without `incident_id`, without MCP writes, and
> without a fifth tool?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names resource-specific
   experience. 058 stamps `recordedAt` at create. Title can be
   corrected. Observation time cannot. Named rewrite is the
   bounded correction, not a new model.
2. **Founder override 2026-08-18** replaces the unearned gate for
   recordedAt rewrite. Leftover[0] stays frozen (Investigation ≠
   Incident). `occurredAt` stays unearned.
3. **Existing primitive check:** 058 create still stamps now. This
   Sprint is rewrite-on-existing. Do not add `--recorded-at` on
   create. Do not treat a missing value as "now".
4. **Sequencing Rule 8 / 9:** UPDATE `recorded_at` only. No
   `incident_id`. No subject on the Incident row. No second time
   column.
5. **MCP** stays four read-only tools. Existing 059
   `incidentMemory.recordedAt` observes the new value.

Rejected as 068 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | Leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Add `occurredAt` | Second time field; occurrence vs observation |
| `--recorded-at` on 058 create | Different write identity; create still stamps now |
| Delete the Incident | Different mutate |
| `--recorded-at` with append / remove / title / clear-title | Would mix mutates |
| Infer time from members / evidence / "now" | Forbidden |
| Rewrite Resolution `recordedAt` | Different object |
| `incident_id` on `resolutions` | Second source of truth |
| Fifth tool / MCP writes | Frozen |
| Investigation / Incident lifecycle | Status is still a process claim |
| Similarity | Forbidden |

---

# Exact Capability

```text
combie incident <inc-id> --recorded-at <iso>
        ↓
Incident must exist
named ISO is valid and different from stored recordedAt
no --resolution / --remove-resolution / --title / --clear-title
        ↓
UPDATE that Incident's recorded_at
  title / resolution_ids unchanged
        ↓
confirmation names the inc:
show / list / INCIDENT MEMORY observe the new time
```

Command modes on `incident` (Phase 1 pins copy; expected this
split):

```text
incident --resolution res:a --resolution res:b [--title]
  → 058 CREATE (unchanged; recordedAt still now)

incident <inc-id>
  → 058 SHOW (unchanged)

incident <inc-id> --resolution res:d
  → 062 APPEND (unchanged; --recorded-at still usage)

incident <inc-id> --remove-resolution res:d
  → 065 REMOVE (unchanged; --recorded-at still usage)

incident <inc-id> --title "Better name"
  → 066 RETITLE (unchanged; recordedAt still untouched)

incident <inc-id> --clear-title
  → 067 CLEAR (unchanged; recordedAt still untouched)

incident <inc-id> --recorded-at 2026-08-17T20:00:00.000Z
  → this Sprint RESTAMP (replace recordedAt; title / members unchanged)
```

Exact CLI flag spelling is Phase 1. Expected: `--recorded-at`
(text; required ISO). Do not invent `--backdate` / `--touch` /
`--occurred-at`. Do not overload missing value as "now".

`--recorded-at` without a positional `inc:` is usage.
`--recorded-at` plus `--title` / `--clear-title` is usage.
`--recorded-at` plus `--resolution` or `--remove-resolution` is
usage. `--investigation` / `--resource` on `incident` stay usage.

Restamp constraints:

- One exact Incident id (the positional). Unknown `inc:`:
  `INCIDENT_NOT_FOUND`, nothing restamped.
- `--recorded-at` requires text. Blank / boolean is usage
  (Phase 1 confirms).
- Repeatable `--recorded-at`: usage (one exact time). Phase 1
  confirms.
- Named value must parse as a date. Invalid ISO: fail. Expected:
  Phase 1 pins the code. Nothing written. Prefer this over
  storing the raw string.
- Persist canonical ISO (`Date#toISOString()`). Phase 1 confirms.
- Same timestamp as stored after canonicalize: fail. Expected:
  Phase 1 pins the code (likely `INCIDENT_RECORDED_AT_UNCHANGED`).
  Nothing written. Prefer this over a silent no-op (066
  same-text shape).
- Past and future instants are allowed. Do not clamp to now.
- `title` / `resolution_ids` unchanged.
- Resolution rows unchanged. Resolution `recordedAt` unchanged.
- Domain field remains required. SQL NOT NULL. Never `""`.

058 create, 062 append, 065 remove, 066 retitle, 067 clear,
061/064 `--incident` write, 060/063 list, and show are unchanged
when this flag is absent.

Live `investigate`, `investigation <id>` reopen, `--compare`, and
`investigate_resource` are unchanged except they observe the new
`recordedAt` via the existing 058 field. Snapshot JSON is not
rewritten. List sort (`recorded_at DESC, id DESC`) may change
order; that is the existing index, not a new feature.

---

# Evidence / Claim Semantics

### KNOWN (about the grouping)

```text
Combie replaced this Incident's recordedAt because the human
named the time. Title and members are the same. The grouping is
still retained organizational grouping.
```

### UNKNOWN / stale (required)

The grouping is **retained organizational grouping**, not proof
the occurrence is still current, not a proven outage, and not
current provider authority. The stored `recordedAt` is the
timestamp the human named for this grouping. It is **not** proof
of when an outage began.

### Forbidden

```text
You should rollback
These are similar incidents
This Investigation is now an Incident
resolved: true / this investigation is closed
Combie inferred when it happened from Sentry lastSeen
```

---

# Architecture

```text
incidents.recorded_at (058)                        UPDATE
incidents.title / resolution_ids                   unchanged
resolutions rows                                   unchanged
        ↓
updateIncidentRecordedAt                           this Sprint
        ↓
CLI incident <inc> --recorded-at <iso>
```

Ownership:

- **Domain / Store:** no new type. No `incident_id`. No
  `occurredAt`. Do not denormalize subject onto the Incident.
  Add a recordedAt UPDATE (`recorded_at = ?`). Do not DELETE the
  Incident. Do not UPDATE `title` or `resolution_ids`. Do not
  store `""`.
- **App:** a restamp helper (name is Phase 1; expected
  `restampIncident` or `updateIncidentRecordedAt`) distinct from
  `retitleIncident` (066), `clearIncidentTitle` (067),
  `recordIncident` (058), `appendIncidentResolutions` (062), and
  `removeIncidentResolutions` (065). Named ISO only.
- **CLI:** positional `inc:` plus `--recorded-at` (no membership
  flags, no title flags) is restamp, not show and not create.
  Help: restamp usage + example. 058/062/065/066/067 rules
  unchanged.
- **MCP / Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to add `incident_id`, to store `inv:`
ids as members, to add `occurredAt`, to infer a time, to treat a
missing `--recorded-at` as now, or to thaw MCP writes: **STOP.**

---

# Persistence vs Read-Time

| Snapshot | Resolution rows | Incident recordedAt |
| --- | --- | --- |
| Frozen InvestigationContext | Unchanged | 058 column replaced |
| Unchanged JSON | no `incident_id` | title / members unchanged |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- add `occurredAt` / `happenedAt`
- DELETE Resolution rows
- DELETE the Incident
- rewrite snapshot JSON
- rewrite Resolution `recordedAt`
- mutate `resolution_ids` or `title`
- store empty-string `recordedAt`
- treat missing `--recorded-at` as now
- add `--recorded-at` on 058 create
- create Relationships or Changes
- refresh providers
- add MCP tools or writes
- infer the time from members / subject / evidence

---

# Boundedness

- One existing `incident` command. No new verb.
- Restamp only when positional `inc:` **and** `--recorded-at`
  are present, and `--resolution` / `--remove-resolution` /
  `--title` / `--clear-title` are absent.
- Named ISO only. No inferred time. No "now" default.
- No grouping of Investigation snapshots as members.
- No `occurredAt`. No membership change. No title change.
- No change to compare, snapshot schema, or MCP tools.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- Unknown `inc:`: `INCIDENT_NOT_FOUND`, nothing restamped.
- Blank positional: usage, exit 1.
- `--recorded-at` without positional: usage, exit 1.
- `--recorded-at` blank / boolean: usage, exit 1.
- `--recorded-at` plus `--title` / `--clear-title`: usage, exit 1.
- `--recorded-at` plus `--resolution` / `--remove-resolution`:
  usage, exit 1.
- Repeatable `--recorded-at`: usage, exit 1 (Phase 1 confirms).
- Invalid ISO: fail (Phase 1 pins code), nothing written.
- Same canonical timestamp as stored: fail (Phase 1 pins code;
  likely `INCIDENT_RECORDED_AT_UNCHANGED`), nothing written.
- `--investigation` / `--resource` on `incident`: existing usage.
- Pre-058 missing `incidents` table: `INCIDENT_NOT_FOUND`.
- 058 create / 062 append / 065 remove / 066 retitle / 067
  clear unchanged when this flag is absent.

---

# Affected Surfaces

### CLI

- `incident <inc-id> --recorded-at <iso>`
- confirmation distinct from 058 create, 062 append, 065 remove,
  066 retitle, and 067 clear; names `inc:`
- help: `--recorded-at` line + example
  `incident inc:… --recorded-at 2026-08-17T20:00:00.000Z`
- 058 / 062 / 065 / 066 / 067 unchanged when the flag is absent

### MCP

Four tools. No writes. No new fields. `docs/public/MCP.md`
unchanged unless Phase 1 finds a lie (expected: **no**). Existing
`incidentMemory[].recordedAt` observes the new value.

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-058 `recordedAt` create-time / list sort,
SPRINT-066 same-text `INCIDENT_TITLE_UNCHANGED`, SPRINT-067
`--clear-title` leaves `recordedAt` untouched, SPRINT-067
leftover[0] (members stay `res:`), and inspect:

- CLI `incident`: no `--recorded-at` yet; 058 create stamps now
- `insertIncident` / `clearIncidentTitle` / `updateIncidentTitle`
  do not UPDATE `recorded_at`
- list `ORDER BY recorded_at DESC, id DESC`
- show `Recorded by Combie at ${recordedAt}`
- MCP `toIncidentMemoryRow` always includes `recordedAt`

Report:

1. CLI: `incident <inc> --recorded-at <iso>` replaces stored
   `recordedAt`? Expected: **yes** (new text flag; create still
   stamps now).
2. Title / members unchanged? Expected: **yes.**
3. Resolution rows not deleted; Resolution `recordedAt`
   unchanged? Expected: **yes.**
4. Incident row not deleted? Expected: **yes.**
5. Missing / blank `--recorded-at` stays usage, not "now"?
   Expected: **yes.**
6. 058 create / 066 retitle / 067 clear unchanged when
   `--recorded-at` is absent? Expected: **yes.**
7. Same canonical timestamp fails; nothing written? Expected:
   **yes** (Phase 1 pins code).
8. `incident_id` / `inv:` members / `occurredAt`? Expected:
   **no.**
9. Confirmation distinct; show / list / INCIDENT MEMORY / MCP
   observe the new time? Expected: **yes.**
10. Group snapshots as members, `occurredAt`, delete Incident,
    MCP writes, fifth tool, lifecycle? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **Yes** — `recorded_at` UPDATE only.
   No new column. No membership UPDATE.
2. Second source of truth? **No** if time stays the 058 field
   (do not add `occurredAt`).
3. Inferred time? **No** — named `--recorded-at` only.
4. 058 / 066 / 067 leak? **No** — create still stamps now;
   title paths still leave `recordedAt` untouched.
5. Grouping snapshots leak? **No** — leftover[0] stays frozen.
6. MCP tool / write needed? Expected: **no.**
7. Compare / snapshot change? Expected: **no.**
8. `incident_id` / Incident delete / `occurredAt` / empty-string
   time? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + CLI
   help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

If implementation is tempted to store `inv:` ids as members, to
add `occurredAt`, to treat missing `--recorded-at` as now, or to
thaw MCP writes: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- `incident <inc> --recorded-at <iso>` replaces stored
  `recordedAt`; title and members unchanged
- show `Recorded by Combie at` observes the new time; list
  RECORDED AT column observes it; INCIDENT MEMORY identity
  observes it
- same canonical timestamp fails; nothing written
- invalid ISO fails; nothing written
- unknown `inc:` is `INCIDENT_NOT_FOUND`
- blank / missing `--recorded-at` is usage, not "now"
- `--recorded-at` plus `--title` / `--clear-title` is usage
- `--recorded-at` with append / remove is usage
- `--recorded-at` without positional is usage
- 058 create still stamps now; 066 / 067 leave `recordedAt`
  unchanged when this flag is absent
- confirmation distinct from 058 / 062 / 065 / 066 / 067
- `--compare` / snapshot JSON / MCP four tools / no writes;
  `incidentMemory.recordedAt` observes the new value
- no `incident_id` column; no `inv:` members; no `occurredAt`
- help lists `--recorded-at` and an example

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
resolution --resource <id> --decision "Rollback"     # res:a
resolution --resource <id> --decision "Hold"         # res:b
incident --resolution res:a --resolution res:b --title "API error spike"
incident <inc> --recorded-at 2026-08-17T20:00:00.000Z
incident <inc>                                       # Recorded by Combie at 2026-08-17T20:00:00.000Z
                                                     # TITLE / members unchanged
incidents                                            # RECORDED AT column observes the new time
investigate <id>                                     # INCIDENT MEMORY identity observes it

# same timestamp
incident <inc> --recorded-at 2026-08-17T20:00:00.000Z
  # UNCHANGED

# bounds
incident <inc> --recorded-at                         # usage (requires text; not now)
incident <inc> --recorded-at "Nope"                  # invalid; nothing written
incident <inc> --recorded-at 2026-08-17T20:00:00.000Z --title "Nope"
  # usage (do not mix)
incident <inc> --clear-title --recorded-at 2026-08-17T21:00:00.000Z
  # usage
incident <inc> --resolution res:x --recorded-at 2026-08-17T20:00:00.000Z
  # usage
incident --recorded-at 2026-08-17T20:00:00.000Z      # usage (no positional)
incident --investigation inv:a --investigation inv:b
  # still usage (leftover[0] frozen)
```

---

# Explicit Non-Goals

Do **not** implement:

- grouping Investigation snapshots as Incident members
- adding `occurredAt` / `happenedAt`
- `--recorded-at` on 058 create
- missing `--recorded-at` as "now"
- `--recorded-at` on 062 append, 065 remove, 066 retitle, or
  067 clear
- rewriting Resolution `recordedAt` or Investigation `composedAt`
- deleting Resolution rows
- deleting the Incident
- membership mutate
- title mutate on this path
- empty-string `recordedAt`
- `incident_id` on Resolution rows
- denormalized subject on Incident
- MCP writes or a fifth tool
- snapshot MCP / `list_incidents`
- Investigation or Incident lifecycle / `resolved: true`
- Incident section on `--compare`
- putting Incidents on `InvestigationContext` or `snapshot_json`
- similarity, “you should”, Learning, Recommendation
- inferred time from members / subject / evidence
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
051       explicit Resolution capture + list                       ✅
052       exact-id Resolution recall on live investigate / reopen  ✅
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
063       incidents --investigation list retrieve                  ✅
064       Incident-anchored write for mixed-subject Incidents      ✅
065       remove existing members after Incident record            ✅
066       retitle an existing Incident                             ✅
067       clear an existing Incident title                         ✅
068       rewrite an existing Incident recordedAt                  ← this
069+      group Investigations directly only if earned
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
  `incidentMemory.recordedAt` observes the new value)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 058 create still stamps `recordedAt` as now
- 066 `--title` still requires text; still leaves `recordedAt`
  untouched
- 067 `--clear-title` still omits title; still leaves
  `recordedAt` untouched
- 062 append / 065 remove: `--recorded-at` stays usage
- 061 / 064 `resolution --incident` unchanged
- 063 `incidents --investigation` unchanged
- grouping `inv:` as Incident members frozen
- `occurredAt` frozen
- `--recorded-at` on create frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None required. Restamp uses the existing `recorded_at` column.
`insertIncident` (058) still stamps now.

If implementation is tempted to add `incident_id`, to store `inv:`
ids as members, to add `occurredAt`, or to treat missing
`--recorded-at` as now: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 068 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `incident <inc> --recorded-at <iso>` replaces
      stored `recordedAt`; title / members unchanged; 058 create /
      066 retitle / 067 clear / 062 append / 065 remove unchanged
      on their paths
- [x] if earned: no inferred time; no `inv:` members; no
      `incident_id`; no `occurredAt`; no MCP writes; no
      `--recorded-at` on create
- [x] if not earned: rejection documented; do not invent a restamp
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 058 remembered when Combie recorded a grouping. Sprint
> 066 and 067 may change the name of that grouping. Sprint 068 may
> replace that observation time because the human named a
> timestamp. Combie must not invent the time, must not treat a
> missing flag as now, must not add a second occurrence clock, must
> not treat an Investigation as an Incident, and must not rewrite
> who is in the grouping.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `3cd926a` (authoring-only working tree). Pins:

1. CLI `incident <inc> --recorded-at <iso>` replaces stored
   `recordedAt` — **yes** (new text flag; create still stamps now).
2. Title / members unchanged — **yes.**
3. Resolution rows not deleted; Resolution `recordedAt`
   unchanged — **yes.**
4. Incident row not deleted — **yes.**
5. Missing / blank `--recorded-at` stays usage, not "now" —
   **yes.**
6. 058 create / 066 retitle / 067 clear unchanged when the flag
   is absent — **yes.**
7. Same canonical timestamp fails; nothing written — **yes.**
   Code: `INCIDENT_RECORDED_AT_UNCHANGED`. Invalid ISO:
   `INCIDENT_RECORDED_AT_INVALID`.
8. `incident_id` / `inv:` members / `occurredAt` — **no.**
9. Confirmation distinct; show / list / INCIDENT MEMORY / MCP
   observe the new time — **yes.** Copy: `Set incident time`.
10. Group snapshots / `occurredAt` / delete Incident / MCP writes
    / fifth tool / lifecycle — **no.**

Canonicalize via `Date.parse` then `toISOString()`. Repeatable
`--recorded-at` is usage.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **Yes** — `recorded_at` UPDATE only.
2. Second source of truth? **No.**
3. Inferred time? **No.**
4. 058 / 066 / 067 leak? **No.**
5. Grouping snapshots leak? **No.**
6. MCP tool / write? **No.**
7. Compare / snapshot? **No.**
8. `incident_id` / Incident delete / `occurredAt` / empty-string
   time? **No.**
9. Canon? AGENTS.md operational baseline + CLI help only.

No STOP conflict.

## Implemented

- `incident <inc> --recorded-at <iso>`: replace stored
  `recordedAt`. Title / `resolution_ids` unchanged. Persist
  canonical ISO.
- Same canonical timestamp is `INCIDENT_RECORDED_AT_UNCHANGED`;
  nothing written. Invalid ISO is `INCIDENT_RECORDED_AT_INVALID`.
  Unknown `inc:` is `INCIDENT_NOT_FOUND`.
- `--recorded-at` plus `--title` / `--clear-title` /
  `--resolution` / `--remove-resolution` is usage. `--recorded-at`
  without positional is usage. Blank / boolean is usage, not
  "now". `--investigation` / `--resource` on `incident` stay
  usage (leftover[0] frozen).
- Confirmation: `Set incident time` (distinct from 058 / 062 /
  065 / 066 / 067). Show, list RECORDED AT, INCIDENT MEMORY, and
  MCP `incidentMemory.recordedAt` observe the new value.
- Store: `updateIncidentRecordedAt` UPDATEs `recorded_at` only.
  App: `restampIncident`. Help: `--recorded-at` line + example.
- MCP four tools, no writes. No `incident_id`. No `occurredAt`.
  058 create still stamps now.

## Deviations

None.

## Validation

```text
baseline:          3cd926a docs(sprints): mark 067 complete
                   1080 pass / 78 files / 5051 expect()
bun test:          1090 pass across 78 files (5142 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-068-dogfood.* (never ./.combie)
                   create stamps now → --recorded-at 2026-08-17T20:00:00.000Z
                   → show/list/INCIDENT MEMORY observe new time; title /
                   members unchanged → same timestamp UNCHANGED → blank
                   usage → invalid ISO fail → mix --title / --clear-title
                   / append usage → --recorded-at without positional
                   usage → incident --investigation still usage → no
                   incident_id; no occurred_at.
                   Isolated dogfood left founder .combie/combie.db
                   mtime/size unchanged.
```

One MCP stdio digest assertion (Sprint 056, not this slice)
failed under parallel load and passed on isolation and full-suite
retry. Four tools and no writes held.

## Learnings

- `--recorded-at` is a string flag like `--title`, not a boolean
  like `--clear-title`; missing value is usage, never "now".
- Canonical `toISOString()` plus same-value
  `INCIDENT_RECORDED_AT_UNCHANGED` means an offset form of the
  stored instant does not look like a successful restamp.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–068 complete.
Sprint 069 is not started. Grouping Investigation snapshots as
Incident members remains unearned. `occurredAt` remains unearned.
