# SPRINT-078 — Clear an Existing Incident occurredAt

> **Status:** Complete
> **Depends on:** SPRINT-077 (complete)
> **Authorized by:** founder override, 2026-08-19 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> occurredAt-clear slice after 077 set-on-existing exists. Replaces
> the AGENTS.md line that 077 leftover is not a sequence and
> `--clear-occurred-at` remains unearned — leftover[0] **group
> Investigations as Incident members** stays **unearned**
> (Investigation ≠ Incident; members stay `res:`). leftover[1]
> **fifth-tool snapshot reopen / `list_investigations`** stays
> frozen. leftover **Investigation lifecycle** stays frozen
> (process claim). leftover **`--occurred-at` on create** stays
> frozen (077 / 068 create still omits). This Sprint takes leftover
> **`--clear-occurred-at` only**. Does **not** authorize
> Recommendation, Learning, similarity, Investigation lifecycle,
> MCP writes, a fifth tool, inferred Action, grouping snapshots as
> members, `--occurred-at` on create, blank `--occurred-at` as
> clear, rewriting `recordedAt` on this path, or `incident_id`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **explicit omit of an existing Incident's optional occurredAt**,
> not 077 set, not 068 restamp, not membership mutate, not deleting
> the Incident, not `incident_id` on `resolutions`, not inferred
> un-time, not snapshot rewrite, not MCP writes
> **Type:** Narrow optional field mutation on the existing Incident
> `occurred_at` column (SET NULL only)
> **Primary goal:** A human can omit the optional `occurredAt` on
> an exact existing `inc:` that currently has one — `recordedAt` /
> title / members unchanged — without inferring the clear, without
> grouping `inv:` snapshots as members, without adding
> `incident_id`, and without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. Existing `incidentMemory` omits
> `occurredAt` when the field is absent (077). `resolutionMemory`
> unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 077 shipped set-on-existing occurrence time:

```text
incident <inc> --occurred-at 2026-08-17T14:00:00.000Z
incident inc:…                             # Occurred at 2026-08-17T14:00:00.000Z
```

`occurredAt` can be set and replaced. It cannot return to omitted:

```text
incident inc:… --occurred-at
  # usage: --occurred-at requires an ISO timestamp
```

The 077 omitted-`occurredAt` shape is unreachable after a time
exists. 067 restored omitted title with a distinct boolean flag.
This Sprint is that inverse for the 077 field.

Sprint 077 leftover:

```text
078+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          Investigation lifecycle only if earned
          --clear-occurred-at only if earned
          --occurred-at on create only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
077 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. leftover[0] stays
unearned.

leftover[1] **fifth-tool / `list_investigations` /
`get_investigation`** stays frozen. 076 already took named-id-only
observe. Unfiltered list still has no four-tool home.

leftover **Investigation lifecycle** stays frozen. Status is still
a process claim.

leftover **`--occurred-at` on create** is a different write
identity. 058 create still omits the field. 068 froze
`--recorded-at` on create the same way. This Sprint is
omit-on-existing.

This Sprint takes leftover **`--clear-occurred-at`** only under
the founder override below.

It is **not** grouping Investigation snapshots as members.
`--investigation` on `incident` create stays usage.

It is **not** 077 set. `--occurred-at` still requires a valid ISO
and still sets/replaces. Do not treat blank `--occurred-at` as
clear.

It is **not** 068 restamp. `--recorded-at` still replaces
`recordedAt`. This Sprint does not UPDATE `recorded_at`.

It is **not** 067 title-clear. `--clear-title` still omits title.
Title is unchanged on this path.

It is **not** 058 create. Create still stamps `recordedAt` as now
and still omits `occurredAt`. Do not add `--occurred-at` on create.

It is **not** membership change. `resolution_ids` stay as stored.

It is **not** `incident_id` on `resolutions`. Membership stays the
058 array.

It is **not** MCP writes, a fifth tool, lifecycle, or inferred
clear from members / subject / evidence / `recordedAt`.

---

# Founder Override

`AGENTS.md` after Sprint 077 recorded that the 077 leftover is not
a sequence, grouping Investigation snapshots as Incident members
remains unearned, fifth-tool snapshot reopen /
`list_investigations` remains unearned, Investigation lifecycle
remains unearned, `--clear-occurred-at` remains unearned, and
`--occurred-at` on create remains unearned. Sequencing Rule 2
still holds: 077 `--occurred-at` requires ISO. Grouping `inv:`
ids as members is not the next slice.

On 2026-08-19 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  resource-specific experience. A grouping whose occurrence time
  can be set and replaced but cannot return to omitted is a
  one-way clock — the same one-way label 066 had before 067.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  named `--clear-occurred-at` on an existing `inc:` now that 077
  set exists, rather than waiting for a ledger of “I named when it
  happened and cannot un-name it.”
- Leftover[0] (group snapshots as members) is **not** authorized.
  Investigation ≠ Incident. Members stay `res:`.
- Leftover[1] fifth-tool / `list_investigations` /
  `get_investigation` is **not** authorized.
- Investigation lifecycle is **not** authorized.
- `--occurred-at` on 058 create is **not** authorized. Create
  still omits the field.
- Blank `--occurred-at` is **not** authorized as clear. 077
  `--occurred-at` stays require-ISO. Clear is a distinct flag.
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision
  rule, and it does not authorize Recommendation, Learning,
  similarity, Investigation lifecycle, MCP writes, inferred Action,
  grouping snapshots as members, a fifth tool, or `--occurred-at`
  on create.
- Same pattern as Sprint 066 → 067: leftover order is not a
  sequence; leftover[0] is skipped because it conflicts with
  Investigation ≠ Incident. This Sprint takes occurredAt-clear
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
name / rename / un-name that grouping              ← 066 / 067
    ↓
replace when that grouping was recorded            ← 068
    ↓
name when that occurrence happened                 ← 077
    ↓
omit that occurrence time after record             ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: persistence is an UPDATE of the existing
`occurred_at` column to NULL only. Do not UPDATE `recorded_at`.
Do not UPDATE `title`. Do not UPDATE `resolution_ids`. Do not
delete the Incident. Do not add `incident_id`. No new column.

Sequencing Rule 8: occurrence time has one source of truth — the
077 `occurredAt` field. Omit it (SQL NULL / domain field absent).
Do not store empty string. Do not infer the clear. Do not copy
`recordedAt`.

Sequencing Rule 2: 077 `--occurred-at` still requires ISO. 067
`--clear-title` still omits title. 068 `--recorded-at` still
restamps `recordedAt`. This Sprint does not replace those.

Sequencing Rule 4: the new claim is “the human named this
existing grouping to omit its occurredAt,” not “Combie un-timed
it from Sentry lastSeen,” not “it happened at recordedAt,” and
not “these Investigations are now an Incident.”

---

# Problem

After 077 set:

```text
incident inc:… --occurred-at 2026-08-17T14:00:00.000Z
incident inc:…                             # Occurred at 2026-08-17T14:00:00.000Z
incident inc:… --occurred-at
  # usage: --occurred-at requires an ISO timestamp
```

Show, INCIDENT MEMORY, and `incidentMemory` keep the named time
unless replaced with another ISO. The 077 omitted shape is
unreachable.

The missing claim:

```text
The human named this exact Incident to omit its occurredAt.
recordedAt, title, and members are unchanged.
```

That is explicit. It is **not** inferred from provider activity.
It is **not** grouping `inv:` snapshots as members. It is **not**
077 set. It is **not** 068 restamp.

---

# Product Question

> After explicit Incidents can store an optional `occurredAt` on
> an existing `inc:`, can Combie omit that field — `recordedAt` /
> title / members unchanged — without inferring the clear, without
> treating blank `--occurred-at` as clear, without grouping
> Investigation snapshots as members, without `--occurred-at` on
> create, without `incident_id`, without MCP writes, and without a
> fifth tool?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names resource-specific
   experience. 077 can set/replace `occurredAt`. Named clear is
   the bounded inverse (067 analog), not a new model.
2. **Founder override 2026-08-19** replaces the unearned gate for
   `--clear-occurred-at`. Leftover[0] stays frozen (Investigation
   ≠ Incident). Leftover[1] stays frozen (four-tool / 076).
   Lifecycle stays frozen. `--occurred-at` on create stays frozen.
3. **Existing primitive check:** 077 `--occurred-at` still
   requires ISO. This Sprint is omit-on-existing. Do not replace
   set. Do not treat blank `--occurred-at` as clear. 067
   `clearIncidentTitle` / `title = NULL` is the store analog.
4. **Sequencing Rule 8 / 9:** UPDATE `occurred_at` to NULL only.
   No new column. No `incident_id`.
5. **MCP** stays four read-only tools. Existing 077 omit-when-
   absent `occurredAt` observes the clear.

Rejected as 078 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | Leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Fifth tool / `list_investigations` / `get_investigation` | Frozen four-tool; 076 already took named-id-only |
| Investigation / Incident lifecycle | Status is still a process claim |
| `--occurred-at` on 058 create | Different write identity; create still omits |
| Blank `--occurred-at` as clear | 077 freeze; `--occurred-at` requires ISO |
| `--clear-occurred-at` with set / restamp / title / clear-title / append / remove | Would mix mutates |
| Infer the clear from members / subject / `recordedAt` | Forbidden |
| `incident_id` on `resolutions` | Second source of truth |
| Fifth tool / MCP writes | Frozen |
| Similarity | Forbidden |

---

# Exact Capability

```text
combie incident <inc-id> --clear-occurred-at
        ↓
Incident must exist
stored occurredAt is present
no --resolution / --remove-resolution / --title /
  --clear-title / --recorded-at / --occurred-at
        ↓
UPDATE that Incident's occurred_at to NULL
  recorded_at / title / resolution_ids unchanged
        ↓
confirmation names the inc:
show omits Occurred at
INCIDENT MEMORY omits OCCURRED AT
incidentMemory omits occurredAt
```

Command modes on `incident` (Phase 1 pins copy; expected this
split):

```text
incident --resolution res:a --resolution res:b [--title]
  → 058 CREATE (unchanged; occurredAt still omitted)

incident <inc-id>
  → 058 SHOW (077 Occurred at line when present)

incident <inc-id> --resolution res:d
  → 062 APPEND (unchanged; --clear-occurred-at still usage)

incident <inc-id> --remove-resolution res:d
  → 065 REMOVE (unchanged; --clear-occurred-at still usage)

incident <inc-id> --title "Better name"
  → 066 RETITLE (unchanged)

incident <inc-id> --clear-title
  → 067 CLEAR TITLE (unchanged; occurredAt still untouched)

incident <inc-id> --recorded-at 2026-08-17T20:00:00.000Z
  → 068 RESTAMP (unchanged; occurredAt still untouched)

incident <inc-id> --occurred-at 2026-08-17T14:00:00.000Z
  → 077 SET (unchanged; --occurred-at still requires ISO)

incident <inc-id> --clear-occurred-at
  → this Sprint CLEAR (omit stored occurredAt; recordedAt /
     title / members unchanged)
```

Exact CLI flag spelling is Phase 1. Expected: `--clear-occurred-at`
(boolean; no value). Do not invent `--unoccurred` / `--forget-when`.
Do not overload blank `--occurred-at` as clear.

`--clear-occurred-at` without a positional `inc:` is usage.
`--clear-occurred-at` plus `--occurred-at` / `--recorded-at` /
`--title` / `--clear-title` is usage. `--clear-occurred-at` plus
`--resolution` or `--remove-resolution` is usage.
`--investigation` / `--resource` on `incident` stay usage.

Clear constraints:

- One exact Incident id (the positional). Unknown `inc:`:
  `INCIDENT_NOT_FOUND`, nothing cleared.
- `--clear-occurred-at` is a boolean flag. A following value is
  usage (Phase 1 confirms).
- Repeatable `--clear-occurred-at`: usage (one flag). Phase 1
  confirms.
- Stored `occurredAt` already omitted: fail. Expected: Phase 1
  pins the code (likely `INCIDENT_OCCURRED_AT_UNCHANGED`, 067
  reuse of the set-path unchanged code). Nothing written. Prefer
  this over a silent no-op. Message should say the field is
  already omitted (067 “already has no title” shape), not “already
  has that occurred time.”
- `recorded_at` / `title` / `resolution_ids` unchanged.
- Resolution rows unchanged. Resolution `recordedAt` unchanged.
- Domain field omitted (not empty string). SQL NULL.

058 create, 062 append, 065 remove, 066 retitle, 067 clear-title,
068 restamp, 077 set, 061/064 `--incident` write, 060/063 list,
and show are unchanged when this flag is absent, except show /
INCIDENT MEMORY / `incidentMemory` omit `occurredAt` after a
successful clear.

Live `investigate`, `investigation <id>` reopen, `--compare`, and
`investigate_resource` are unchanged except they observe omitted
`occurredAt` via the existing 077 field. Snapshot JSON is not
rewritten. 060 list RECORDED AT column unchanged (077 freeze: no
OCCURRED AT list column).

---

# Evidence / Claim Semantics

### KNOWN (about the grouping)

```text
Combie omitted this Incident's occurredAt because the human named
the clear. recordedAt, title, and members are the same. The
grouping is still retained organizational grouping. Combie again
does not know when the occurrence happened.
```

### UNKNOWN / stale (required)

The grouping is **retained organizational grouping**, not proof
the occurrence is still current, not a proven outage, and not
current provider authority. Omitting `occurredAt` is not “this
incident never had an occurrence time” and not “it happened at
`recordedAt`.”

### Forbidden

```text
You should rollback
These are similar incidents
This Investigation is now an Incident
resolved: true / this investigation is closed
Combie un-timed it from Sentry lastSeen
Omitted occurredAt means it happened at recordedAt
Blank --occurred-at cleared the field
```

---

# Architecture

```text
incidents.occurred_at (077)                        UPDATE NULL
incidents.recorded_at / title / resolution_ids     unchanged
resolutions rows                                   unchanged
        ↓
clearIncidentOccurredAt                            this Sprint
        ↓
CLI incident <inc> --clear-occurred-at
```

Ownership:

- **Domain / Store:** no new type. No new column. No `incident_id`.
  Do not denormalize subject onto the Incident. Add an
  occurredAt-clear UPDATE (`occurred_at = NULL`). Do not DELETE
  the Incident. Do not UPDATE `recorded_at`, `title`, or
  `resolution_ids`. Do not store `""`. Reuse the 067
  `clearIncidentTitle` shape; do not route NULL through
  `updateIncidentTextColumn` (that helper writes a string).
- **App:** a clear helper (name is Phase 1; expected
  `clearIncidentOccurredAt`) distinct from `setIncidentOccurredAt`
  (077), `clearIncidentTitle` (067), `restampIncident` (068),
  `retitleIncident` (066), `recordIncident` (058),
  `appendIncidentResolutions` (062), and
  `removeIncidentResolutions` (065). Named clear only.
- **CLI:** positional `inc:` plus `--clear-occurred-at` (no
  membership flags, no `--occurred-at`, no title flags, no
  `--recorded-at`) is clear, not show and not set. Help: clear
  usage + example. 058/062/065/066/067/068/077 rules unchanged.
- **MCP:** existing omit-when-absent `occurredAt` observes the
  clear. No new tool. No writes. `docs/public/MCP.md` unchanged
  unless Phase 1 finds a lie (expected: **no**).
- **Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to add `incident_id`, to store `inv:`
ids as members, to UPDATE `recorded_at` on this path, to infer a
clear, to treat blank `--occurred-at` as this path, to add
`--occurred-at` on create, to add a fifth tool, or to thaw MCP
writes: **STOP.**

---

# Persistence vs Read-Time

| Snapshot | Resolution rows | Incident occurredAt |
| --- | --- | --- |
| Frozen InvestigationContext | Unchanged | 077 column NULL (omit field) |
| Unchanged JSON | no `incident_id` | recordedAt / title / members unchanged |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- UPDATE `recorded_at` on this path
- DELETE Resolution rows
- DELETE the Incident
- rewrite snapshot JSON
- mutate `resolution_ids` or `title`
- store empty-string `occurredAt`
- treat blank `--occurred-at` as this path
- default omitted `occurredAt` to `recordedAt` on read
- add `--occurred-at` on 058 create
- create Relationships or Changes
- refresh providers
- add MCP tools or writes
- infer the clear from members / subject / evidence / `recordedAt`

---

# Boundedness

- One existing `incident` command. No new verb.
- Clear only when positional `inc:` **and** `--clear-occurred-at`
  are present, and `--resolution` / `--remove-resolution` /
  `--title` / `--clear-title` / `--recorded-at` / `--occurred-at`
  are absent.
- Named clear only. No inferred un-time. No "now" default.
- No grouping of Investigation snapshots as Incident members.
- No `--occurred-at` on create. No blank `--occurred-at` as clear.
- No membership change. No title change. No `recordedAt` change.
- No change to compare, snapshot schema, or MCP tools.
- No 060 list column for `occurredAt` (077 freeze).
- `MAX_INVESTIGATION_FACTS = 5` unchanged.
- No schema migration.

---

# Failure / Unknown Semantics

- Unknown `inc:`: `INCIDENT_NOT_FOUND`, nothing cleared.
- Blank positional: usage, exit 1.
- `--clear-occurred-at` without positional: usage, exit 1.
- `--clear-occurred-at` with a value: usage, exit 1.
- Repeatable `--clear-occurred-at`: usage, exit 1 (Phase 1
  confirms).
- `--clear-occurred-at` plus `--occurred-at` / `--recorded-at` /
  `--title` / `--clear-title`: usage, exit 1.
- `--clear-occurred-at` plus `--resolution` /
  `--remove-resolution`: usage, exit 1.
- `--investigation` / `--resource` on `incident`: existing usage.
- Stored `occurredAt` already omitted: fail (Phase 1 pins code;
  likely `INCIDENT_OCCURRED_AT_UNCHANGED`), nothing written.
- Pre-058 missing `incidents` table: `INCIDENT_NOT_FOUND`.
- Pre-077 databases: existing 077 column upgrade; NULL rows omit
  the field; clear of omitted still UNCHANGED.
- 058 create / 062 append / 065 remove / 066 retitle / 067
  clear-title / 068 restamp / 077 set unchanged when this flag is
  absent.

---

# Affected Surfaces

### CLI

- `incident <inc-id> --clear-occurred-at`
- confirmation distinct from 058 create, 062 append, 065 remove,
  066 retitle, 067 clear-title, 068 restamp, and 077 set; names
  `inc:`
- show: omits `Occurred at`; `Recorded by Combie at` unchanged
- INCIDENT MEMORY: omits OCCURRED AT block (077 omit-when-absent)
- help: `--clear-occurred-at` line + example
  `incident inc:… --clear-occurred-at`
- 058 / 062 / 065 / 066 / 067 / 068 / 077 unchanged when the flag
  is absent
- 060 `incidents` list RECORDED AT column unchanged

### MCP

Four tools. No writes. No new tools. `incidentMemory[].occurredAt`
omitted after clear (077 pattern). `docs/public/MCP.md` unchanged
unless Phase 1 finds a lie (expected: **no**).

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-077 `--occurred-at` set / `--clear-occurred-at`
freeze, SPRINT-067 `--clear-title` omit pattern /
`INCIDENT_TITLE_UNCHANGED` already-omitted, SPRINT-077 leftover
(members stay `res:`; fifth tool frozen), and inspect:

- CLI `incident`: `--occurred-at` exists; no `--clear-occurred-at`
  yet; `--clear-title` is the boolean-flag analog
- `clearIncidentTitle` / `store.clearIncidentTitle` (`title = NULL`)
- `setIncidentOccurredAt` / `updateIncidentOccurredAt` (string
  UPDATE; do not pass NULL through `updateIncidentTextColumn`)
- show `Occurred at` omit-when-absent
- `incidentMemoryFieldBlocks` optional OCCURRED AT
- MCP `toIncidentMemoryRow` optional `occurredAt`
- leftover[0] `incident --investigation` usage freeze

Report:

1. CLI: `incident <inc> --clear-occurred-at` omits stored
   `occurredAt`? Expected: **yes** (new boolean flag; 077 set
   still requires ISO).
2. `recordedAt` / title / members unchanged? Expected: **yes.**
3. Resolution rows not deleted; Resolution `recordedAt`
   unchanged? Expected: **yes.**
4. Incident row not deleted? Expected: **yes.**
5. Blank `--occurred-at` stays usage, not this path? Expected:
   **yes.**
6. 058 create / 066 retitle / 067 clear-title / 068 restamp /
   077 set unchanged when `--clear-occurred-at` is absent?
   Expected: **yes.**
7. Already-omitted fails; nothing written? Expected: **yes**
   (Phase 1 pins code; likely `INCIDENT_OCCURRED_AT_UNCHANGED`).
8. `incident_id` / `inv:` members / fifth tool / lifecycle /
   `--occurred-at` on create / blank `--occurred-at` as clear?
   Expected: **no.**
9. Confirmation distinct; show / INCIDENT MEMORY / MCP omit
   `occurredAt` after clear; 060 list RECORDED AT unchanged?
   Expected: **yes.** Copy expected: `Cleared incident occurrence`
   (067 `Cleared incident title`; 077 `Set incident occurrence`).
10. Group snapshots as members, infer clear, delete Incident,
    MCP writes, fifth tool, lifecycle? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **Yes** — `occurred_at = NULL` only.
   No new column. No membership UPDATE. No `recorded_at` UPDATE.
2. Second source of truth? **No** if omit stays the 077 field
   (SQL NULL / domain absent). Do not copy `recordedAt`.
3. Inferred clear? **No** — named `--clear-occurred-at` only.
4. 077 / 067 / 068 leak? **No** — set still requires ISO;
   title-clear still omits title; restamp still replaces
   `recordedAt`.
5. Grouping snapshots leak? **No** — leftover[0] stays frozen.
6. Fifth tool / `list_investigations` leak? **No** — leftover[1]
   stays frozen.
7. MCP tool / write needed? Expected: **no.** Existing omit
   observes the clear.
8. Compare / snapshot change? Expected: **no.**
9. `incident_id` / Incident delete / empty-string /
   `--occurred-at` on create / blank `--occurred-at` as clear?
   Expected: **no.**
10. Canon change? Expected: AGENTS.md operational baseline + CLI
    help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

If implementation is tempted to store `inv:` ids as members, to
treat blank `--occurred-at` as this path, to add `--occurred-at`
on create, to add a fifth tool, or to thaw MCP writes: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- `incident <inc> --clear-occurred-at` omits stored `occurredAt`;
  `recordedAt`, title, and members unchanged
- show omits `Occurred at`; `Recorded by Combie at` unchanged
- INCIDENT MEMORY omits OCCURRED AT; identity line stays
  `id  recordedAt`
- MCP `incidentMemory.occurredAt` omitted after clear; four tools;
  no writes
- 060 list RECORDED AT column unchanged
- already omitted fails; nothing written
- unknown `inc:` is `INCIDENT_NOT_FOUND`
- `--clear-occurred-at` with a value is usage
- `--clear-occurred-at` plus `--occurred-at` / `--recorded-at` /
  `--title` / `--clear-title` is usage
- `--clear-occurred-at` with append / remove is usage
- `--clear-occurred-at` without positional is usage
- blank `--occurred-at` remains usage (not this path)
- 077 set / 067 clear-title / 068 restamp unchanged when this
  flag is absent
- after clear, 077 `--occurred-at` can set a first occurredAt
  again
- confirmation distinct from 058 / 062 / 065 / 066 / 067 / 068 /
  077
- `--compare` / snapshot JSON unchanged
- no `incident_id` column; no `inv:` members
- help lists `--clear-occurred-at` and an example

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
resolution --resource <id> --decision "Rollback"     # res:a
resolution --resource <id> --decision "Hold"         # res:b
incident --resolution res:a --resolution res:b --title "API error spike"
incident <inc> --occurred-at 2026-08-17T14:00:00.000Z
incident <inc>                                       # Occurred at …
incident <inc> --clear-occurred-at                   # Cleared incident occurrence
incident <inc>                                       # no Occurred at
                                                     # Recorded by Combie at <unchanged>
                                                     # TITLE / members unchanged
incidents                                            # RECORDED AT column unchanged
investigate <id>                                     # INCIDENT MEMORY omits OCCURRED AT

# round-trip
incident <inc> --occurred-at 2026-08-17T14:00:00.000Z
incident <inc> --clear-occurred-at

# already omitted
incident <inc> --clear-occurred-at
  # UNCHANGED

# bounds
incident <inc> --clear-occurred-at 2026-08-17T14:00:00.000Z
  # usage (boolean; no value)
incident <inc> --occurred-at                         # usage (still requires ISO; not clear)
incident <inc> --clear-occurred-at --occurred-at 2026-08-17T14:00:00.000Z
  # usage (do not mix)
incident <inc> --clear-occurred-at --clear-title
  # usage
incident <inc> --recorded-at 2026-08-17T20:00:00.000Z --clear-occurred-at
  # usage
incident --clear-occurred-at                         # usage (no positional)
incident --investigation inv:a --investigation inv:b
  # still usage (leftover[0] frozen)
# four tools; no list_investigations / get_investigation
```

Confirm founder `.combie/combie.db` mtime/size unchanged if it
exists. Isolated `--dir` only.

---

# Explicit Non-Goals

Do **not** implement:

- grouping Investigation snapshots as Incident members
- a fifth MCP tool (`list_investigations`, `get_investigation`)
- Investigation or Incident lifecycle / `resolved: true`
- `--occurred-at` on 058 create
- blank `--occurred-at` as clear
- `--clear-occurred-at` on 062 append, 065 remove, 066 retitle,
  067 clear-title, 068 restamp, or 077 set
- rewriting `recordedAt` on this path
- rewriting Resolution `recordedAt` or Investigation `composedAt`
- deleting Resolution rows
- deleting the Incident
- membership mutate
- title mutate on this path
- empty-string `occurredAt`
- `incident_id` on Resolution rows
- denormalized subject on Incident
- OCCURRED AT column on `incidents` list
- sort-by-`occurredAt`
- MCP writes or a fifth tool
- snapshot MCP / `list_incidents`
- Incident section on `--compare`
- putting Incidents on `InvestigationContext` or `snapshot_json`
- similarity, “you should”, Learning, Recommendation
- inferred clear from members / subject / evidence / `recordedAt`
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
051–077   (shipped; see SPRINT-077 leftover table)                 ✅
078       Clear an existing Incident occurredAt                    ✅
079+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          Investigation lifecycle only if earned
          --occurred-at on create only if earned
          inferred activity→Action (never, unless a later sprint
            explicitly reverses 051)
          similarity / recommendation / learning (v0.8)
          policy / execution (v0.9)
```

---

# Product / Contract Freezes

- MCP tools: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource` (exactly four; still read-only; no writes;
  `incidentMemory.occurredAt` omitted when absent)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 077 `occurred_at` column unchanged (NULL on clear)
- 049 compare semantics unchanged
- 068 `--recorded-at` unchanged
- 077 `--occurred-at` unchanged (still requires ISO)
- grouping `inv:` as Incident members frozen
- fifth tool / `get_investigation` / `list_investigations` frozen
- Investigation lifecycle frozen
- `--occurred-at` on create frozen
- blank `--occurred-at` as clear frozen
- inferred time / inferred clear frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP
- `docs/public/MCP.md` unchanged unless Phase 1 finds a lie
  (expected: no)

---

# Migration / Upgrade

None required. Clear is `occurred_at = NULL` on the existing 077
column. No schema change. Callers who never pass
`--clear-occurred-at` are unchanged.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as members, to treat blank `--occurred-at` as clear, or to
add `--occurred-at` on create: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 078 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `incident <inc> --clear-occurred-at` omits stored
      `occurredAt`; `recordedAt` / title / members unchanged;
      058 create / 066 retitle / 067 clear-title / 068 restamp /
      077 set / 062 append / 065 remove unchanged on their paths;
      already-omitted fails
- [x] if earned: no inferred clear; no blank `--occurred-at` as
      clear; no `inv:` members; no `incident_id`; no
      `--occurred-at` on create; no MCP writes; no fifth tool
- [x] if not earned: rejection documented; do not invent a clear
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 077 remembered when the human said an occurrence
> happened. Sprint 078 may let them omit that time. Combie must
> not invent the clear, must not treat a blank --occurred-at as
> this path, must not mix the two clocks, must not treat an
> Investigation as an Incident, must not add a fifth tool, and
> must not rewrite who is in the grouping.**

---

# Completion Notes (2026-08-19)

## Phase 1 — Repository Understanding

HEAD `f30ae96` plus uncommitted Sprint 077. Pins:

1. CLI `incident <inc> --clear-occurred-at` omits stored
   `occurredAt` — **yes** (new boolean flag; 077 set still
   requires ISO).
2. `recordedAt` / title / members unchanged — **yes.**
3. Resolution rows not deleted; Resolution `recordedAt`
   unchanged — **yes.**
4. Incident row not deleted — **yes.**
5. Blank `--occurred-at` stays usage, not this path — **yes.**
6. 058 create / 066 retitle / 067 clear-title / 068 restamp /
   077 set unchanged when `--clear-occurred-at` is absent —
   **yes.**
7. Already-omitted fails; nothing written — **yes.** Code:
   `INCIDENT_OCCURRED_AT_UNCHANGED` (“already has no occurred
   time”).
8. `incident_id` / `inv:` members / fifth tool / lifecycle /
   `--occurred-at` on create / blank `--occurred-at` as clear —
   **no.**
9. Confirmation `Cleared incident occurrence`; show / INCIDENT
   MEMORY / MCP omit `occurredAt` after clear; 060 list
   RECORDED AT unchanged — **yes.**
10. Group snapshots / infer clear / delete Incident / MCP writes /
    fifth tool / lifecycle — **no.**

`--clear-occurred-at` with a value is usage. Repeatable string
`--clear-occurred-at` is usage (same boolean-repeat gap as 067
`--clear-title`).

## Phase 2 — Architecture Pressure

1. Persistence necessary? **Yes** — `occurred_at = NULL` only.
   No new column. No membership UPDATE. No `recorded_at` UPDATE.
2. Second source of truth? **No.**
3. Inferred clear? **No.**
4. 077 / 067 / 068 leak? **No.**
5. Grouping snapshots leak? **No.** leftover[0] frozen.
6. Fifth tool / `list_investigations` leak? **No.** leftover[1]
   frozen.
7. MCP tool / write needed? **No.** Existing omit observes the
   clear.
8. Compare / snapshot? **No.**
9. `incident_id` / Incident delete / empty-string /
   `--occurred-at` on create / blank `--occurred-at` as clear —
   **no.**
10. Canon? AGENTS.md operational baseline + CLI help. Not VISION /
    ARCHITECTURE / ROADMAP / SKILL / MCP.md.

No STOP conflict.

## Implemented

- `clearIncidentOccurredAt` SET `occurred_at = NULL`. Does not
  route NULL through `updateIncidentTextColumn`. Domain field
  omitted; never `""`.
- App `clearIncidentOccurredAt` /
  `formatIncidentClearOccurredAtConfirmation`
  (`Cleared incident occurrence`). Already omitted is
  `INCIDENT_OCCURRED_AT_UNCHANGED` (“already has no occurred
  time”).
- CLI `--clear-occurred-at` XOR with `--occurred-at` /
  `--recorded-at` / `--title` / `--clear-title` / `--resolution` /
  `--remove-resolution`. Help flag + example.
- Show / INCIDENT MEMORY / MCP omit `occurredAt` via existing 077
  omit-when-absent. 060 list RECORDED AT unchanged.

## Deviations

None. Confirmation copy pinned as `Cleared incident occurrence`
(distinct from 077 `Set incident occurrence` and 067 `Cleared
incident title`). Store NULL UPDATE mirrors `clearIncidentTitle`.

## Validation

```text
baseline:          f30ae96 docs(sprints): mark 076 complete
                   + uncommitted Sprint 077
                   1123 pass / 78 files / 5779 expect()
bun test:          1132 pass across 78 files (5893 expect()
                   calls) — 9 new Sprint 078 tests
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-dogfood-078.* (never ./.combie)
                   seed sentry:project:450
                   resolution --resource ×2 → incident grouping
                   --occurred-at 2026-08-17T14:00:00.000Z
                   incident <inc> --clear-occurred-at
                     confirmation Cleared incident occurrence
                   show: no Occurred at; Recorded by Combie at /
                     TITLE / members unchanged
                   incidents list: RECORDED AT only
                   investigate: INCIDENT MEMORY omits OCCURRED AT
                   second --clear-occurred-at: already has no
                     occurred time
                   --clear-occurred-at <iso>: usage
                   blank --occurred-at: still requires ISO
                   mix --clear-occurred-at --occurred-at: usage
                   incident --investigation inv:a --investigation
                     inv:b: still usage (leftover[0] frozen)
                   help lists --clear-occurred-at
                   founder .combie/combie.db mtime/size unchanged
```

## Learnings

- 067's title-clear path was the complete analog: boolean flag,
  SET NULL, already-omitted UNCHANGED with “already has no …”
  copy, blank set-flag stays usage. The only new claim is that
  077's optional clock can return to omitted.
- Boolean-repeat detection still only fires when parseArgs sees
  a string value twice (same 067 gap). Not a 078 leak.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–078 complete.
CLI help gains `--clear-occurred-at`. Grouping Investigation
snapshots as Incident members remains unearned. Fifth-tool
snapshot reopen / `list_investigations` remains unearned.
Investigation lifecycle remains unearned. `--occurred-at` on
create remains unearned.
