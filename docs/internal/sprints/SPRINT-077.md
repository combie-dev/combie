# SPRINT-077 — Optional Incident occurredAt

> **Status:** Complete
> **Depends on:** SPRINT-076 (complete)
> **Authorized by:** founder override, 2026-08-19 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> occurrence-time slice after create, retitle, title-clear,
> recordedAt rewrite, append, remove, list retrieve, Incident-anchored
> write, and 069–076 named-id Investigation observe exist. Replaces
> the AGENTS.md line that 076 leftover is not a sequence and
> `occurredAt` remains unearned — leftover[0] **group Investigations
> as Incident members** stays **unearned** (Investigation ≠ Incident;
> members stay `res:`). leftover[1] **fifth-tool snapshot reopen /
> `list_investigations`** stays frozen (076 already took named-id-only
> observe; unfiltered list still has no four-tool home). leftover
> **Investigation lifecycle** stays frozen (process claim). This
> Sprint takes leftover **`occurredAt` only**. Does **not** authorize
> Recommendation, Learning, similarity, Investigation lifecycle,
> MCP writes, a fifth tool, inferred Action, grouping snapshots as
> members, `--occurred-at` on create, `--clear-occurred-at`,
> rewriting `recordedAt` on this path, or `incident_id`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **explicit optional occurrence time on an existing Incident**,
> not observation-time rewrite (068), not membership mutate, not
> deleting the Incident, not `incident_id` on `resolutions`, not
> inferred time from members or evidence, not snapshot rewrite, not
> MCP writes
> **Type:** Narrow optional field on the existing Incident row
> (named ISO text; omitted when absent)
> **Primary goal:** A human can name `occurredAt` on an exact
> existing `inc:` — named ISO only, `recordedAt` / title / members
> unchanged — without inferring a time, without grouping `inv:`
> snapshots as members, without adding `incident_id`, and without
> thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. Existing `incidentMemory` observes the
> new field when present (omit when absent). `resolutionMemory`
> unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 058–068 shipped Incident create, append, remove, recall,
list retrieve, Incident-anchored write, retitle, title-clear, and
recordedAt rewrite. Sprints 069–076 closed v0.6 named-id
Investigation observe on CLI and on existing
`investigate_resource`:

```text
incident --resolution res:a --resolution res:b [--title]
incident <inc> --resolution res:d
incident <inc> --remove-resolution res:d
incident <inc> --title "Better name"
incident <inc> --clear-title
incident <inc> --recorded-at <iso>
resolution --incident <inc> [--resource]
incidents [--resolution|--resource|--investigation]
INCIDENT MEMORY / incidentMemory
investigate_resource({ investigationId })   # 076; no resourceId
```

The grouping still has one time:

```text
incident inc:…
  # Recorded by Combie at <recordedAt>
  # no path names when the occurrence happened
```

`recordedAt` is when Combie recorded (or the human restamped) the
grouping. ROADMAP v0.7’s Incident example is an occurrence
(“Production API error spike”) that may have happened at a
different instant than the grouping was written down. 068
explicitly refused a second column so restamp could stay one
field. That leftover remains.

Sprint 076 leftover:

```text
077+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
076 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. leftover[0] stays
unearned.

leftover[1] **fifth-tool / `list_investigations` /
`get_investigation`** cannot be split further on the existing
tool. 076 already took named-id-only observe (`get_investigation`
analog). Unfiltered `investigations` still has no four-tool home.
Omitted-both `investigate_resource` stays usage. leftover[1]
stays frozen.

leftover **Investigation lifecycle** stays frozen. Status is still
a process claim. 051 rejected `resolved: true`.

This Sprint takes leftover **`occurredAt`** only under the founder
override below. `--occurred-at` on 058 create, `--clear-occurred-at`,
and leftover[0] / leftover[1] / lifecycle stay later / frozen.

It is **not** grouping Investigation snapshots as members.
`--investigation` on `incident` create stays usage.

It is **not** 068 restamp. `--recorded-at` still replaces
`recordedAt`. This Sprint does not UPDATE `recorded_at`.

It is **not** 066 retitle or 067 title-clear. Title is unchanged
on this path.

It is **not** 058 create. Create still stamps `recordedAt` as now
and still omits `occurredAt`. Do not add `--occurred-at` on create.

It is **not** omitting a stored `occurredAt`. `--occurred-at`
requires a valid ISO. A later sprint may earn `--clear-occurred-at`.
Blank `--occurred-at` is usage, not clear.

It is **not** membership change. `resolution_ids` stay as stored.

It is **not** `incident_id` on `resolutions`. Membership stays the
058 array.

It is **not** MCP writes, a fifth tool, lifecycle, or inferred
time from members / subject / evidence / `recordedAt` / "now".

---

# Founder Override

`AGENTS.md` after Sprint 076 recorded that the 076 leftover is not
a sequence, grouping Investigation snapshots as Incident members
remains unearned, fifth-tool snapshot reopen /
`list_investigations` remains unearned, and `occurredAt` remains
unearned. Sequencing Rule 2 still holds: 068 restamp is
`recordedAt` only. Grouping `inv:` ids as members is not the next
slice. A fifth tool is not the next slice.

On 2026-08-19 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  resource-specific experience. A grouping whose observation time
  can be corrected but that cannot name when the occurrence
  happened conflates two clocks. 068 kept them apart on purpose;
  this Sprint adds the occurrence clock as an optional named
  field, not a restamp of `recordedAt`.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  named `--occurred-at` on an existing `inc:` now that 068 restamp
  exists and 069–076 closed the Investigation-observe detour,
  rather than waiting for a ledger of “I grouped it on Tuesday and
  cannot say the spike was Monday.”
- Leftover[0] (group snapshots as members) is **not** authorized.
  Investigation ≠ Incident. Members stay `res:`.
- Leftover[1] fifth-tool / `list_investigations` /
  `get_investigation` is **not** authorized. 076 already shipped
  named-id-only observe. Unfiltered list still has no four-tool
  home.
- Investigation lifecycle is **not** authorized. Status is still a
  process claim.
- `--occurred-at` on 058 create is **not** authorized. Create
  still omits the field. This Sprint is set-on-existing.
- `--clear-occurred-at` is **not** authorized. `--occurred-at`
  requires a valid ISO.
- Inferring `occurredAt` from Sentry `lastSeen`, member
  `recordedAt`, evidence timestamps, or "now" is **not**
  authorized.
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision
  rule, and it does not authorize Recommendation, Learning,
  similarity, Investigation lifecycle, MCP writes, inferred Action,
  grouping snapshots as members, a fifth tool, or
  `--clear-occurred-at`.
- Same pattern as Sprint 067 → 068: leftover order is not a
  sequence; leftover[0] is skipped because it conflicts with
  Investigation ≠ Incident. Leftover[1] is skipped because the
  four-tool contract is frozen and 076 already took the
  named-id-only split. This Sprint takes `occurredAt` only.

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
name when that occurrence happened                 ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: persistence **is** necessary — a new nullable
`occurred_at` column on the existing `incidents` table. Do not
UPDATE `recorded_at`. Do not UPDATE `title`. Do not UPDATE
`resolution_ids`. Do not delete the Incident. Do not add
`incident_id`. Reuse `ensureNullableTextColumn` (054 / 046
pattern). New databases get the column on `CREATE TABLE`.

Sequencing Rule 8: occurrence time has one source of truth — the
new `occurredAt` field. Observation time stays `recordedAt`. Do
not infer `occurredAt` from `recordedAt`. Do not store a second
display-time column. Do not sort the 060 list by `occurred_at`.

Sequencing Rule 2: 068 `--recorded-at` still restamps
`recordedAt`. 058 create still stamps `recordedAt` as now and
still omits `occurredAt`. This Sprint does not replace those.

Sequencing Rule 4: the new claim is “the human named this
occurrence time for this existing grouping,” not “Combie observed
the outage then,” not “this is when the grouping was recorded,”
and not “these Investigations are now an Incident.”

---

# Problem

After create and 068 restamp:

```text
incident --resolution res:a --resolution res:b --title "API error spike"
incident inc:…
  # Recorded by Combie at <create-or-restamp>
incident inc:… --occurred-at 2026-08-17T14:00:00.000Z
  # usage (no such flag)
```

Show, INCIDENT MEMORY, and `incidentMemory` can say when Combie
recorded the grouping. They cannot say when the human says the
occurrence happened. Recreating the Incident to encode that fact
would mint a new `inc:` and break membership exclusivity.

The missing claim:

```text
The human named this exact Incident to have this occurredAt.
recordedAt, title, and members are unchanged.
```

That is explicit. It is **not** inferred from provider activity.
It is **not** grouping `inv:` snapshots as members. It is **not**
068 restamp. It is **not** lifecycle.

---

# Product Question

> After explicit Incidents can be titled, un-named, and restamped
> on `recordedAt`, can Combie store an optional `occurredAt` on
> the exact `inc:` — named ISO only, `recordedAt` / title /
> members unchanged — without inferring the time, without grouping
> Investigation snapshots as members, without `--occurred-at` on
> create, without `--clear-occurred-at`, without `incident_id`,
> without MCP writes, and without a fifth tool?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names Incident as an
   occurrence. 058/068 store observation time. Occurrence time is
   a different claim. Named optional ISO is the bounded version,
   not a generic Event clock and not lifecycle.
2. **Founder override 2026-08-19** replaces the unearned gate for
   `occurredAt`. Leftover[0] stays frozen (Investigation ≠
   Incident). Leftover[1] stays frozen (four-tool / 076).
   Lifecycle stays frozen.
3. **Existing primitive check:** 068 `--recorded-at` stays
   observation restamp. This Sprint is a new optional field on
   existing rows. Do not add `--occurred-at` on create. Do not
   treat a missing value as "now". Do not copy `recordedAt`.
4. **Sequencing Rule 8 / 9:** nullable `occurred_at` only. No
   `incident_id`. No subject on the Incident row. Do not UPDATE
   `recorded_at` on this path.
5. **MCP** stays four read-only tools. Existing 059
   `incidentMemory` observes the new field when present (omit
   when absent, same as `title`).

Rejected as 077 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | Leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Fifth tool / `list_investigations` / `get_investigation` | Frozen four-tool; 076 already took named-id-only |
| Investigation / Incident lifecycle | Status is still a process claim |
| `--occurred-at` on 058 create | Different write identity; create still omits the field |
| `--clear-occurred-at` | 067 analog; `--occurred-at` requires ISO |
| `--occurred-at` with append / remove / title / clear-title / recorded-at | Would mix mutates |
| Infer time from members / evidence / `recordedAt` / "now" | Forbidden |
| Rewrite `recordedAt` on this path | 068 owns that field |
| `incident_id` on `resolutions` | Second source of truth |
| Sort `incidents` by `occurredAt` | Observation list order stays 058 `recorded_at` |
| Fifth tool / MCP writes | Frozen |
| Similarity | Forbidden |

---

# Exact Capability

```text
combie incident <inc-id> --occurred-at <iso>
        ↓
Incident must exist
named ISO is valid and (after canonicalize) different from
  stored occurredAt — including "was omitted" → set
no --resolution / --remove-resolution / --title /
  --clear-title / --recorded-at
        ↓
UPDATE that Incident's occurred_at
  recorded_at / title / resolution_ids unchanged
        ↓
confirmation names the inc:
show / INCIDENT MEMORY / incidentMemory observe the new time
  when present; omit when absent
060 list RECORDED AT column unchanged (no new list clock)
```

Command modes on `incident` (Phase 1 pins copy; expected this
split):

```text
incident --resolution res:a --resolution res:b [--title]
  → 058 CREATE (unchanged; recordedAt still now; occurredAt omitted)

incident <inc-id>
  → 058 SHOW (gains optional Occurred at line when present)

incident <inc-id> --resolution res:d
  → 062 APPEND (unchanged; --occurred-at still usage)

incident <inc-id> --remove-resolution res:d
  → 065 REMOVE (unchanged; --occurred-at still usage)

incident <inc-id> --title "Better name"
  → 066 RETITLE (unchanged; occurredAt still untouched)

incident <inc-id> --clear-title
  → 067 CLEAR (unchanged; occurredAt still untouched)

incident <inc-id> --recorded-at 2026-08-17T20:00:00.000Z
  → 068 RESTAMP (unchanged; occurredAt still untouched)

incident <inc-id> --occurred-at 2026-08-17T14:00:00.000Z
  → this Sprint SET (set/replace occurredAt; recordedAt / title /
     members unchanged)
```

Exact CLI flag spelling is Phase 1. Expected: `--occurred-at`
(text; required ISO). Do not invent `--happened-at` / `--when` /
`--occurred`. Do not overload missing value as "now". Do not
overload blank as clear.

`--occurred-at` without a positional `inc:` is usage.
`--occurred-at` plus `--title` / `--clear-title` / `--recorded-at`
is usage. `--occurred-at` plus `--resolution` or
`--remove-resolution` is usage. `--investigation` / `--resource`
on `incident` stay usage.

Set constraints:

- One exact Incident id (the positional). Unknown `inc:`:
  `INCIDENT_NOT_FOUND`, nothing written.
- `--occurred-at` requires text. Blank / boolean is usage
  (Phase 1 confirms). Not `--clear-occurred-at`.
- Repeatable `--occurred-at`: usage (one exact time). Phase 1
  confirms.
- Named value must parse as a date. Invalid ISO: fail. Expected:
  Phase 1 pins the code (likely `INCIDENT_OCCURRED_AT_INVALID`,
  parallel 068 `INCIDENT_RECORDED_AT_INVALID`). Nothing written.
  Prefer this over storing the raw string.
- Persist canonical ISO (`Date#toISOString()`). Phase 1 confirms.
  Reuse the 068 canonicalize helper if it stays field-agnostic;
  do not invent a second parser.
- Same timestamp as stored after canonicalize: fail. Expected:
  Phase 1 pins the code (likely `INCIDENT_OCCURRED_AT_UNCHANGED`).
  Nothing written. Prefer this over a silent no-op (066 / 068
  same-value shape). First set (stored field omitted) is not
  unchanged.
- Past and future instants are allowed. Do not clamp to now.
  Do not require `occurredAt <= recordedAt`.
- `recorded_at` / `title` / `resolution_ids` unchanged.
- Resolution rows unchanged. Resolution `recordedAt` unchanged.
- Domain field is optional. SQL NULL when omitted. Never `""`.

058 create, 062 append, 065 remove, 066 retitle, 067 clear,
068 restamp, 061/064 `--incident` write, 060/063 list, and show
are unchanged when this flag is absent, except show / INCIDENT
MEMORY / `incidentMemory` gain the optional field when a row
already has it.

Live `investigate`, `investigation <id>` reopen, `--compare`, and
`investigate_resource` are unchanged except they observe the new
optional field via existing 059 membership. Snapshot JSON is not
rewritten. List sort (`recorded_at DESC, id DESC`) is unchanged.
Do not add an OCCURRED AT list column in this Sprint (two clocks
on the 060 table would mix observation with occurrence; show is
the distinction).

---

# Evidence / Claim Semantics

### KNOWN (about the grouping)

```text
Combie stored this Incident's occurredAt because the human named
the time. recordedAt, title, and members are the same. The
grouping is still retained organizational grouping. occurredAt
is not when Combie recorded the grouping.
```

When `occurredAt` is omitted, Combie does **not** know when the
occurrence happened. That unknown is required. Do not fill it
from `recordedAt`.

### UNKNOWN / stale (required)

The grouping is **retained organizational grouping**, not proof
the occurrence is still current, not a proven outage, and not
current provider authority. Stored `occurredAt` is the timestamp
the human named for this occurrence. It is **not** proof of when
an outage began in a provider. Stored `recordedAt` is still when
the grouping was recorded (or restamped).

### Forbidden

```text
You should rollback
These are similar incidents
This Investigation is now an Incident
resolved: true / this investigation is closed
Combie inferred when it happened from Sentry lastSeen
occurredAt defaults to recordedAt
Omitted occurredAt means it happened at recordedAt
```

---

# Architecture

```text
incidents.occurred_at (nullable; this Sprint)        INSERT NULL
                                                     UPDATE named ISO
incidents.recorded_at / title / resolution_ids       unchanged
resolutions rows                                     unchanged
        ↓
updateIncidentOccurredAt                             this Sprint
        ↓
CLI incident <inc> --occurred-at <iso>
```

Ownership:

- **Domain / Store:** add optional `occurredAt?: string` on
  `IncidentRecord`. No `incident_id`. Do not denormalize subject
  onto the Incident. `CREATE TABLE incidents` gains nullable
  `occurred_at TEXT`. Existing databases: `ensureNullableTextColumn`
  on `incidents.occurred_at`. Add an occurredAt UPDATE
  (`occurred_at = ?`). Do not DELETE the Incident. Do not UPDATE
  `recorded_at`, `title`, or `resolution_ids` on this path. Do not
  store `""`.
- **App:** a set helper (name is Phase 1; expected
  `setIncidentOccurredAt` or `updateIncidentOccurredAt`) distinct
  from `restampIncident` / `updateIncidentRecordedAt` (068),
  `retitleIncident` (066), `clearIncidentTitle` (067),
  `recordIncident` (058), `appendIncidentResolutions` (062), and
  `removeIncidentResolutions` (065). Named ISO only.
- **CLI:** positional `inc:` plus `--occurred-at` (no membership
  flags, no title flags, no `--recorded-at`) is set, not show and
  not create. Help: set usage + example. 058/062/065/066/067/068
  rules unchanged.
- **MCP:** `toIncidentMemoryRow` includes `occurredAt` only when
  present (title pattern). No new tool. No writes.
  `docs/public/MCP.md` unchanged unless Phase 1 finds a lie
  (expected: **no** — the investigate_resource row does not
  enumerate Incident fields).
- **Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to add `incident_id`, to store `inv:`
ids as members, to UPDATE `recorded_at` on this path, to infer a
time, to treat a missing `--occurred-at` as now or as
`recordedAt`, to add `--occurred-at` on create, to add
`--clear-occurred-at`, to add a fifth tool, or to thaw MCP writes:
**STOP.**

---

# Persistence vs Read-Time

| Snapshot | Resolution rows | Incident occurredAt |
| --- | --- | --- |
| Frozen InvestigationContext | Unchanged | New nullable column |
| Unchanged JSON | no `incident_id` | recordedAt / title / members unchanged |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- UPDATE `recorded_at` on this path
- DELETE Resolution rows
- DELETE the Incident
- rewrite snapshot JSON
- rewrite Resolution `recordedAt`
- mutate `resolution_ids` or `title`
- store empty-string `occurredAt`
- treat missing `--occurred-at` as now or as `recordedAt`
- default omitted `occurredAt` to `recordedAt` on read
- add `--occurred-at` on 058 create
- add `--clear-occurred-at`
- create Relationships or Changes
- refresh providers
- add MCP tools or writes
- infer the time from members / subject / evidence

---

# Boundedness

- One existing `incident` command. No new verb.
- Set only when positional `inc:` **and** `--occurred-at`
  are present, and `--resolution` / `--remove-resolution` /
  `--title` / `--clear-title` / `--recorded-at` are absent.
- Named ISO only. No inferred time. No "now" default. No
  `recordedAt` default.
- No grouping of Investigation snapshots as Incident members.
- No `--occurred-at` on create. No `--clear-occurred-at`.
- No membership change. No title change. No `recordedAt` change.
- No change to compare, snapshot schema, or MCP tools.
- No 060 list column for `occurredAt`.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- Unknown `inc:`: `INCIDENT_NOT_FOUND`, nothing written.
- Blank positional: usage, exit 1.
- `--occurred-at` without positional: usage, exit 1.
- `--occurred-at` blank / boolean: usage, exit 1 (not clear).
- `--occurred-at` plus `--title` / `--clear-title` /
  `--recorded-at`: usage, exit 1.
- `--occurred-at` plus `--resolution` / `--remove-resolution`:
  usage, exit 1.
- Repeatable `--occurred-at`: usage, exit 1 (Phase 1 confirms).
- Invalid ISO: fail (Phase 1 pins code), nothing written.
- Same canonical timestamp as stored: fail (Phase 1 pins code;
  likely `INCIDENT_OCCURRED_AT_UNCHANGED`), nothing written.
- First set when stored field is omitted: success.
- `--investigation` / `--resource` on `incident`: existing usage.
- Pre-058 missing `incidents` table: `INCIDENT_NOT_FOUND`.
- Pre-077 databases: `ensureNullableTextColumn`; existing rows
  omit `occurredAt` (NULL). Show / memory / MCP omit the field.
- 058 create / 062 append / 065 remove / 066 retitle / 067
  clear / 068 restamp unchanged when this flag is absent.

---

# Affected Surfaces

### CLI

- `incident <inc-id> --occurred-at <iso>`
- confirmation distinct from 058 create, 062 append, 065 remove,
  066 retitle, 067 clear, and 068 restamp; names `inc:`
- show: optional `Occurred at <iso>` line, omitted when absent;
  `Recorded by Combie at` unchanged
- INCIDENT MEMORY: optional OCCURRED AT block (title pattern),
  not folded into the `id  recordedAt` identity line
- help: `--occurred-at` line + example
  `incident inc:… --occurred-at 2026-08-17T14:00:00.000Z`
- 058 / 062 / 065 / 066 / 067 / 068 unchanged when the flag is
  absent
- 060 `incidents` list RECORDED AT column unchanged

### MCP

Four tools. No writes. No new tools. `incidentMemory[].occurredAt`
present only when stored (title pattern). `docs/public/MCP.md`
unchanged unless Phase 1 finds a lie (expected: **no**).

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-068 `recordedAt` restamp / `occurredAt` freeze,
SPRINT-066 same-text `INCIDENT_TITLE_UNCHANGED`, SPRINT-067
`--clear-title` omit pattern, SPRINT-076 leftover (members stay
`res:`; fifth tool frozen), and inspect:

- CLI `incident`: `--recorded-at` exists; no `--occurred-at` yet
- `IncidentRecord` / `CREATE TABLE incidents` / `toIncidentRow`
- `ensureNullableTextColumn` (054 / 046)
- 068 canonicalize helper (`Date.parse` then `toISOString()`)
- show `Recorded by Combie at ${recordedAt}`
- `incidentMemoryIdentityLine` (`id  recordedAt`) /
  `incidentMemoryFieldBlocks` (optional TITLE)
- MCP `toIncidentMemoryRow` (optional `title`)
- leftover[0] `incident --investigation` usage freeze

Report:

1. CLI: `incident <inc> --occurred-at <iso>` sets stored
   `occurredAt`? Expected: **yes** (new text flag; create still
   omits the field).
2. `recordedAt` / title / members unchanged? Expected: **yes.**
3. Resolution rows not deleted; Resolution `recordedAt`
   unchanged? Expected: **yes.**
4. Incident row not deleted? Expected: **yes.**
5. Missing / blank `--occurred-at` stays usage, not "now", not
   clear, not `recordedAt`? Expected: **yes.**
6. 058 create / 066 retitle / 067 clear / 068 restamp unchanged
   when `--occurred-at` is absent? Expected: **yes.**
7. Same canonical timestamp fails; first set from omitted
   succeeds; nothing written on unchanged? Expected: **yes**
   (Phase 1 pins codes).
8. `incident_id` / `inv:` members / fifth tool / lifecycle /
   `--occurred-at` on create / `--clear-occurred-at`? Expected:
   **no.**
9. Confirmation distinct; show / INCIDENT MEMORY / MCP observe
   the new time when present and omit when absent; 060 list
   RECORDED AT unchanged? Expected: **yes.**
10. Group snapshots as members, infer time, delete Incident,
    MCP writes, fifth tool, lifecycle? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **Yes** — nullable `occurred_at`
   column + UPDATE of that column only. No membership UPDATE.
   No `recorded_at` UPDATE.
2. Second source of truth? **No** if occurrence stays
   `occurredAt` and observation stays `recordedAt` (do not copy
   one onto the other; do not infer).
3. Inferred time? **No** — named `--occurred-at` only.
4. 058 / 066 / 067 / 068 leak? **No** — create still omits
   `occurredAt`; title / restamp paths still leave it untouched.
5. Grouping snapshots leak? **No** — leftover[0] stays frozen.
6. Fifth tool / `list_investigations` leak? **No** — leftover[1]
   stays frozen.
7. MCP tool / write needed? Expected: **no.** Optional observe
   field only.
8. Compare / snapshot change? Expected: **no.**
9. `incident_id` / Incident delete / empty-string time /
   `--occurred-at` on create / `--clear-occurred-at`? Expected:
   **no.**
10. Canon change? Expected: AGENTS.md operational baseline + CLI
    help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

If implementation is tempted to store `inv:` ids as members, to
UPDATE `recorded_at` on this path, to treat missing
`--occurred-at` as now or as `recordedAt`, to add a fifth tool,
or to thaw MCP writes: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- `incident <inc> --occurred-at <iso>` sets stored `occurredAt`;
  `recordedAt`, title, and members unchanged
- show gains `Occurred at` when present; omits it when absent;
  `Recorded by Combie at` unchanged
- INCIDENT MEMORY gains an OCCURRED AT block when present; identity
  line stays `id  recordedAt`
- MCP `incidentMemory.occurredAt` present only when stored;
  omitted when absent; four tools; no writes
- 060 list RECORDED AT column unchanged (no OCCURRED AT column)
- first set from omitted succeeds
- same canonical timestamp fails; nothing written
- invalid ISO fails; nothing written
- unknown `inc:` is `INCIDENT_NOT_FOUND`
- blank / missing `--occurred-at` is usage, not "now", not clear
- `--occurred-at` plus `--title` / `--clear-title` /
  `--recorded-at` is usage
- `--occurred-at` with append / remove is usage
- `--occurred-at` without positional is usage
- 058 create still omits `occurredAt`; 066 / 067 / 068 leave
  `occurredAt` unchanged when this flag is absent
- confirmation distinct from 058 / 062 / 065 / 066 / 067 / 068
- `--compare` / snapshot JSON unchanged
- no `incident_id` column; no `inv:` members
- help lists `--occurred-at` and an example
- pre-077 DB: nullable column added; existing rows omit the field

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
resolution --resource <id> --decision "Rollback"     # res:a
resolution --resource <id> --decision "Hold"         # res:b
incident --resolution res:a --resolution res:b --title "API error spike"
incident <inc>                                       # no Occurred at
incident <inc> --occurred-at 2026-08-17T14:00:00.000Z
incident <inc>                                       # Occurred at 2026-08-17T14:00:00.000Z
                                                     # Recorded by Combie at <unchanged>
                                                     # TITLE / members unchanged
incidents                                            # RECORDED AT column unchanged
investigate <id>                                     # INCIDENT MEMORY OCCURRED AT block

# same timestamp
incident <inc> --occurred-at 2026-08-17T14:00:00.000Z
  # UNCHANGED

# bounds
incident <inc> --occurred-at                         # usage (requires text; not now; not clear)
incident <inc> --occurred-at "Nope"                  # invalid; nothing written
incident <inc> --occurred-at 2026-08-17T14:00:00.000Z --title "Nope"
  # usage (do not mix)
incident <inc> --recorded-at 2026-08-17T20:00:00.000Z --occurred-at 2026-08-17T14:00:00.000Z
  # usage
incident <inc> --clear-title --occurred-at 2026-08-17T14:00:00.000Z
  # usage
incident <inc> --resolution res:x --occurred-at 2026-08-17T14:00:00.000Z
  # usage
incident --occurred-at 2026-08-17T14:00:00.000Z      # usage (no positional)
incident --investigation inv:a --investigation inv:b
  # still usage (leftover[0] frozen)
# four tools; no list_investigations / get_investigation
```

Confirm founder `.combie/combie.db` mtime/size unchanged if it
exists, except this Sprint’s schema migration may add
`occurred_at` on open — **do not migrate founder DBs during
dogfood.** Isolated `--dir` only.

---

# Explicit Non-Goals

Do **not** implement:

- grouping Investigation snapshots as Incident members
- a fifth MCP tool (`list_investigations`, `get_investigation`)
- Investigation or Incident lifecycle / `resolved: true`
- `--occurred-at` on 058 create
- `--clear-occurred-at`
- missing `--occurred-at` as "now" or as `recordedAt`
- defaulting omitted `occurredAt` to `recordedAt` on read
- `--occurred-at` on 062 append, 065 remove, 066 retitle,
  067 clear, or 068 restamp
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
- inferred time from members / subject / evidence / `recordedAt`
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
051–076   (shipped; see SPRINT-076 leftover table)                 ✅
077       Optional Incident occurredAt                             ✅
078+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          Investigation lifecycle only if earned
          --clear-occurred-at only if earned
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
  `incidentMemory.occurredAt` observes the new value when present)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 071–076 sidecar shapes unchanged except optional
  `incidentMemory[].occurredAt` / `investigationIncidentMemory[].occurredAt`
- 049 compare semantics unchanged
- 068 `--recorded-at` unchanged
- grouping `inv:` as Incident members frozen
- fifth tool / `get_investigation` / `list_investigations` frozen
- Investigation lifecycle frozen
- `--occurred-at` on create frozen
- `--clear-occurred-at` frozen
- inferred time frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP
- `docs/public/MCP.md` unchanged unless Phase 1 finds a lie
  (expected: no)

---

# Migration / Upgrade

Required. Nullable `occurred_at TEXT` on `incidents`:

- new databases: column on `CREATE TABLE`
- existing databases: `ensureNullableTextColumn` (NULL; existing
  rows omit `occurredAt`)

No rewrite of `recorded_at`, `title`, `resolution_ids`, or
`snapshot_json`. Callers who never pass `--occurred-at` are
unchanged.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as members, to copy `recordedAt` onto `occurredAt`, or to
succeed when `--occurred-at` is omitted: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 077 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `incident <inc> --occurred-at <iso>` sets stored
      `occurredAt`; `recordedAt` / title / members unchanged;
      058 create / 066 retitle / 067 clear / 068 restamp / 062
      append / 065 remove unchanged on their paths; omit when
      absent
- [x] if earned: no inferred time; no `inv:` members; no
      `incident_id`; no `--occurred-at` on create; no
      `--clear-occurred-at`; no MCP writes; no fifth tool
- [x] if not earned: rejection documented; do not invent a second
      clock
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 068 remembered when the human said Combie recorded a
> grouping. Sprint 077 may remember when the human said that
> occurrence happened. Combie must not invent the time, must not
> treat a missing flag as now or as recordedAt, must not mix the
> two clocks, must not treat an Investigation as an Incident, must
> not add a fifth tool, and must not rewrite who is in the
> grouping.**

---

# Completion Notes (2026-08-19)

## Phase 1 — Repository Understanding

HEAD `f30ae96` (authoring-only working tree: AGENTS.md leftover +
`SPRINT-077.md`). Pins:

1. CLI `incident <inc> --occurred-at <iso>` sets stored
   `occurredAt` — **yes** (new text flag; create still omits).
2. `recordedAt` / title / members unchanged — **yes.**
3. Resolution rows not deleted; Resolution `recordedAt`
   unchanged — **yes.**
4. Incident row not deleted — **yes.**
5. Missing / blank `--occurred-at` stays usage, not "now", not
   clear, not `recordedAt` — **yes.**
6. 058 create / 066 retitle / 067 clear / 068 restamp unchanged
   when the flag is absent — **yes.**
7. Same canonical timestamp fails; first set from omitted
   succeeds — **yes.** Codes: `INCIDENT_OCCURRED_AT_UNCHANGED`,
   `INCIDENT_OCCURRED_AT_INVALID`.
8. `incident_id` / `inv:` members / fifth tool / lifecycle /
   `--occurred-at` on create / `--clear-occurred-at` — **no.**
9. Confirmation `Set incident occurrence`; show `Occurred at`
   when present; INCIDENT MEMORY `OCCURRED AT` block; 060 list
   RECORDED AT unchanged; MCP omits when absent — **yes.**
10. Group snapshots / infer time / delete Incident / MCP writes /
    fifth tool / lifecycle — **no.**

Canonicalize via `Date.parse` then `toISOString()` (shared with
068). Repeatable `--occurred-at` is usage.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **Yes** — nullable `occurred_at` plus
   UPDATE of that column only.
2. Second source of truth? **No** — occurrence is `occurredAt`;
   observation stays `recordedAt`.
3. Inferred time? **No.**
4. 058 / 066 / 067 / 068 leak? **No.**
5. Grouping snapshots leak? **No.** leftover[0] frozen.
6. Fifth tool / `list_investigations` leak? **No.** leftover[1]
   frozen.
7. MCP tool / write needed? **No.** Optional observe field.
8. Compare / snapshot change? **No.**
9. `incident_id` / Incident delete / empty-string /
   `--occurred-at` on create / `--clear-occurred-at` — **no.**
10. Canon change? AGENTS.md operational baseline + CLI help. Not
    VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

No STOP conflict.

## Implemented

- `IncidentRecord.occurredAt?: string`. `incidents.occurred_at`
  nullable TEXT on CREATE; `ensureNullableTextColumn` for
  pre-077 databases. `mapIncidentRow` omits when NULL.
  `updateIncidentOccurredAt` UPDATEs that column only.
- `setIncidentOccurredAt` / `formatIncidentOccurredAtConfirmation`
  (`Set incident occurrence`). Shared ISO parser with 068.
  Show: `Occurred at` when present. INCIDENT MEMORY: `OCCURRED AT`
  block; identity line stays `id  recordedAt`.
- CLI `--occurred-at` XOR with `--title` / `--clear-title` /
  `--recorded-at` / `--resolution` / `--remove-resolution`. Help
  flag + example. 060 list unchanged.
- MCP `toIncidentMemoryRow` includes `occurredAt` only when
  stored.

## Deviations

None. Confirmation copy pinned as `Set incident occurrence`
(distinct from 068 `Set incident time`). Shared ISO parser and
store UPDATE helper are 068-compatible refactors, not scope.

## Validation

```text
baseline:          f30ae96 docs(sprints): mark 076 complete
                   1110 pass / 78 files / 5663 expect()
bun test:          1123 pass across 78 files (5779 expect()
                   calls) — 13 new Sprint 077 tests
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir $TMP/combie-dogfood-077.* (never ./.combie)
                   seed sentry:project:450
                   resolution --resource ×2 → incident grouping
                   show: no Occurred at
                   incident <inc> --occurred-at 2026-08-17T14:00:00.000Z
                     confirmation Set incident occurrence
                   show: Occurred at + Recorded by Combie at unchanged
                   incidents list: RECORDED AT only (no occurred ISO)
                   investigate: INCIDENT MEMORY OCCURRED AT block
                   --occurred-at --title: usage
                   incident --investigation inv:a --investigation inv:b:
                     still usage (leftover[0] frozen)
                   help lists --occurred-at
```

## Learnings

- 068's restamp path was the complete analog: same XOR, same
  canonicalize, same UNCHANGED/INVALID codes, optional field
  omit like title. The only new claim is the second clock, kept
  off the 060 list so observation and occurrence stay distinct.
- Pre-077 `CREATE TABLE IF NOT EXISTS` does not add columns;
  `ensureNullableTextColumn` is the upgrade path, matching 054.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–077 complete.
CLI help gains `--occurred-at`. Grouping Investigation snapshots
as Incident members remains unearned. Fifth-tool snapshot reopen
/ `list_investigations` remains unearned. Investigation lifecycle
remains unearned. `--clear-occurred-at` remains unearned.
`--occurred-at` on create remains unearned.

