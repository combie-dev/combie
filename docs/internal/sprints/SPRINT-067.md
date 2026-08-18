# SPRINT-067 — Clear an Existing Incident Title

> **Status:** Complete
> **Depends on:** SPRINT-066 (complete)
> **Authorized by:** founder override, 2026-08-18 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> title-clear slice after create, retitle, append, remove, list
> retrieve, and Incident-anchored write exist. Replaces the
> AGENTS.md line that 066 leftover is not a sequence and grouping
> Investigation snapshots as members remains unearned — leftover[0]
> stays **unearned** (Investigation ≠ Incident; members stay `res:`).
> This Sprint takes leftover[1] **title-clear only**. Does **not**
> authorize Recommendation, Learning, similarity, Investigation
> lifecycle, MCP writes, inferred Action, grouping snapshots as
> members, rewriting `recordedAt`, or `incident_id`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **explicit omit of an existing Incident's optional title**, not
> membership mutate, not deleting the Incident, not `incident_id`
> on `resolutions`, not inferred un-name, not snapshot rewrite,
> not MCP writes
> **Type:** Narrow optional field mutation on the existing Incident
> `title` column (SET NULL only)
> **Primary goal:** A human can omit the optional title on an exact
> existing `inc:` that currently has one — `recordedAt` / members
> unchanged — without inferring the clear, without grouping `inv:`
> snapshots as members, without adding `incident_id`, and without
> thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. Existing `incidentMemory` omits
> `title` when the field is absent (058). `resolutionMemory`
> unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 058–066 shipped create, append, remove, recall, list
retrieve, Incident-anchored write, and retitle:

```text
incident --resolution res:a --resolution res:b [--title]
incident <inc> --resolution res:d
incident <inc> --remove-resolution res:d
incident <inc> --title "Better name"
resolution --incident <inc> [--resource]
incidents [--resolution|--resource|--investigation]
INCIDENT MEMORY / incidentMemory
```

Title can be set at create and replaced later. It cannot return to
omitted:

```text
incident inc:… --title "Better name"
incident inc:…                             # TITLE Better name
# no path restores the 058 omitted-title shape
```

Sprint 066 leftover:

```text
067+      group Investigations directly only if earned
          clear title to omitted / rewrite recordedAt only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
066 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. Leftover[0] stays
unearned.

Leftover[1] bundled two mutates. They are not one slice.
Rewriting `recordedAt` would change when the grouping was
recorded. Title is the label; `recordedAt` is observation time.
This Sprint takes **clear title to omitted** only. `recordedAt`
rewrite stays later.

It is **not** grouping Investigation snapshots as members.
`--investigation` on `incident` create stays usage.

It is **not** 066 retitle. `--title` still requires text and still
replaces. Do not treat blank `--title` as clear.

It is **not** 058 create. `--title` with `--resolution` and no
positional still names the grouping at record time.

It is **not** rewriting `recordedAt`. Observation time of the
grouping stays create-time.

It is **not** membership change. `resolution_ids` stay as stored.

It is **not** `incident_id` on `resolutions`. Membership stays the
058 array.

It is **not** MCP writes, a fifth tool, lifecycle, or inferred
clear from members / subject / evidence.

---

# Founder Override

`AGENTS.md` after Sprint 066 recorded that the 066 leftover is not
a sequence, grouping Investigation snapshots as members remains
unearned, and `recordedAt` rewrite and title-clear remain
unearned. Sequencing Rule 2 still holds: 058/066 `--title` paths
require text. Grouping `inv:` ids as members is not the next
slice.

On 2026-08-18 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  resource-specific experience. A grouping whose label can be set
  and replaced but cannot return to omitted is a one-way name.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  named clear on an existing `inc:` now that retitle exists,
  rather than waiting for a ledger of “I named it and cannot
  un-name it.”
- Leftover[0] (group snapshots as members) is **not** authorized.
  Investigation ≠ Incident. Members stay `res:`.
- Rewriting `recordedAt` is **not** authorized. Title-clear is
  the label inverse; `recordedAt` is when the grouping was
  recorded.
- Blank `--title` is **not** authorized as clear. `--title`
  stays require-text (066). Clear is a distinct flag.
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision
  rule, and it does not authorize Recommendation, Learning,
  similarity, Investigation lifecycle, MCP writes, inferred Action,
  grouping snapshots as members, or `recordedAt` rewrite.
- Same pattern as Sprint 065 → 066: leftover order is not a
  sequence; leftover[0] is skipped because it conflicts with
  Investigation ≠ Incident. The bundled leftover[1] is split;
  this Sprint takes title-clear only.

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
omit that name after record                        ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: persistence is an UPDATE of the existing
`title` column to NULL only. Do not UPDATE `recorded_at`. Do not
UPDATE `resolution_ids`. Do not delete the Incident. Do not add
`incident_id`.

Sequencing Rule 8: title has one source of truth — the 058
`title` field. Omit it (SQL NULL / domain field absent). Do not
store empty string. Do not infer the clear.

Sequencing Rule 2: 058 create with `--title` still works. 066
retitle still requires text. 062 append and 065 remove still
reject `--title`. This Sprint does not replace those.

Sequencing Rule 4: the new claim is “the human named this
existing grouping to omit its title,” not “Combie un-named it
from the subject” and not “these Investigations are now an
Incident.”

---

# Problem

After retitle:

```text
incident --resolution res:a --resolution res:b --title "API error spike"
incident inc:… --title "Better name"
incident inc:… --title
  # usage: --title requires text
```

The list, show, and INCIDENT MEMORY TITLE stay “Better name”
unless replaced with other text. 058 omitted-title shape is
unreachable after a title exists.

The missing claim:

```text
The human named this exact Incident to omit its title.
Members and recordedAt are unchanged.
```

That is explicit. It is **not** inferred from provider activity.
It is **not** grouping `inv:` snapshots as members. It is **not**
membership mutate. It is **not** rewriting `recordedAt`.

---

# Product Question

> After explicit Incidents can be titled at create and retitled
> later, can Combie omit that title on the exact `inc:` —
> `recordedAt` / members unchanged — without inferring the clear,
> without grouping Investigation snapshots as members, without
> `incident_id`, without MCP writes, and without a fifth tool?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names resource-specific
   experience. 058 omitted title at create. 066 can set/replace.
   Named clear is the bounded inverse, not a new model.
2. **Founder override 2026-08-18** replaces the unearned gate for
   title-clear. Leftover[0] stays frozen (Investigation ≠
   Incident). `recordedAt` rewrite stays later.
3. **Existing primitive check:** 058 create and 066 retitle still
   require `--title` text. This Sprint is omit-on-existing. Do not
   replace retitle. Do not treat blank `--title` as clear.
4. **Sequencing Rule 8 / 9:** UPDATE `title` to NULL only. No
   `incident_id`. No subject on the Incident row.
5. **MCP** stays four read-only tools. Existing 059 omit-when-
   absent `title` observes the clear.

Rejected as 067 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | Leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Rewrite `recordedAt` | Different mutate; observation time stays create-time |
| Blank `--title` as clear | 066 freeze; `--title` requires text |
| `--title` / `--clear-title` with append / remove | 062 / 065 freeze; would mix mutates |
| Infer the clear from members / subject | Forbidden |
| `incident_id` on `resolutions` | Second source of truth |
| Fifth tool / MCP writes | Frozen |
| Investigation / Incident lifecycle | Status is still a process claim |
| Similarity | Forbidden |

---

# Exact Capability

```text
combie incident <inc-id> --clear-title
        ↓
Incident must exist
stored title is present
no --resolution / --remove-resolution / --title on this invocation
        ↓
UPDATE that Incident's title to NULL
  recordedAt / resolution_ids unchanged
        ↓
confirmation names the inc:
show omits the TITLE block
```

Command modes on `incident` (Phase 1 pins copy; expected this
split):

```text
incident --resolution res:a --resolution res:b [--title]
  → 058 CREATE (unchanged)

incident <inc-id>
  → 058 SHOW (unchanged)

incident <inc-id> --resolution res:d
  → 062 APPEND (unchanged; --title still usage)

incident <inc-id> --remove-resolution res:d
  → 065 REMOVE (unchanged; --title still usage)

incident <inc-id> --title "Better name"
  → 066 RETITLE (unchanged; --title still requires text)

incident <inc-id> --clear-title
  → this Sprint CLEAR (omit stored title; members / recordedAt unchanged)
```

Exact CLI flag spelling is Phase 1. Expected: `--clear-title`
(boolean; no value). Do not invent `--untitle` / `--rename`. Do
not overload blank `--title` as clear.

`--clear-title` without a positional `inc:` is usage. `--clear-title`
plus `--title` is usage. `--clear-title` plus `--resolution` or
`--remove-resolution` is usage. `--investigation` / `--resource`
on `incident` stay usage.

Clear constraints:

- One exact Incident id (the positional). Unknown `inc:`:
  `INCIDENT_NOT_FOUND`, nothing cleared.
- `--clear-title` is a boolean flag. A following value is usage
  (Phase 1 confirms).
- Repeatable `--clear-title`: usage (one flag). Phase 1 confirms.
- Stored title already omitted: fail. Expected: Phase 1 pins the
  code (likely `INCIDENT_TITLE_UNCHANGED`). Nothing written.
  Prefer this over a silent no-op (066 same-text shape).
- `recordedAt` / `resolution_ids` unchanged.
- Resolution rows unchanged.
- Domain field omitted (not empty string). SQL NULL.

058 create, 062 append, 065 remove, 066 retitle, 061/064
`--incident` write, 060/063 list, and show are unchanged when this
flag is absent.

Live `investigate`, `investigation <id>` reopen, `--compare`, and
`investigate_resource` are unchanged except they observe omitted
title via the existing 058 field. Snapshot JSON is not rewritten.

---

# Evidence / Claim Semantics

### KNOWN (about the grouping)

```text
Combie omitted this Incident's title because the human named the
clear. Members and recordedAt are the same. The grouping is still
retained organizational grouping.
```

### UNKNOWN / stale (required)

The grouping is **retained organizational grouping**, not proof
the occurrence is still current, not a proven outage, and not
current provider authority. Omitting the title is not “this
incident never had a name.”

### Forbidden

```text
You should rollback
These are similar incidents
This Investigation is now an Incident
resolved: true / this investigation is closed
Combie un-named it from the subject
```

---

# Architecture

```text
incidents.title (058)                              UPDATE NULL
incidents.recorded_at / resolution_ids             unchanged
resolutions rows                                   unchanged
        ↓
clearIncidentTitle                                 this Sprint
        ↓
CLI incident <inc> --clear-title
```

Ownership:

- **Domain / Store:** no new type. No `incident_id`. Do not
  denormalize subject onto the Incident. Add a title-clear UPDATE
  (`title = NULL`). Do not DELETE the Incident. Do not UPDATE
  `recorded_at` or `resolution_ids`. Do not store `""`.
- **App:** `clearIncidentTitle` (name is Phase 1) distinct from
  `retitleIncident` (066), `recordIncident` (058),
  `appendIncidentResolutions` (062), and
  `removeIncidentResolutions` (065). Named clear only.
- **CLI:** positional `inc:` plus `--clear-title` (no membership
  flags, no `--title`) is clear, not show and not retitle. Help:
  clear usage + example. 058/062/065/066 `--title` rules
  unchanged.
- **MCP / Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to add `incident_id`, to store `inv:`
ids as members, to rewrite `recordedAt`, to infer a clear, to
treat blank `--title` as clear, or to thaw MCP writes: **STOP.**

---

# Persistence vs Read-Time

| Snapshot | Resolution rows | Incident title |
| --- | --- | --- |
| Frozen InvestigationContext | Unchanged | 058 column NULL (omit field) |
| Unchanged JSON | no `incident_id` | `recorded_at` / members unchanged |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- DELETE Resolution rows
- DELETE the Incident
- rewrite snapshot JSON
- rewrite `recorded_at`
- mutate `resolution_ids`
- store empty-string title
- treat blank `--title` as this path
- create Relationships or Changes
- refresh providers
- add MCP tools or writes
- infer the clear from members / subject / evidence

---

# Boundedness

- One existing `incident` command. No new verb.
- Clear only when positional `inc:` **and** `--clear-title` are
  present, and `--resolution` / `--remove-resolution` / `--title`
  are absent.
- Named clear only. No inferred un-name.
- No grouping of Investigation snapshots as members.
- No `recordedAt` rewrite. No membership change.
- No change to compare, snapshot schema, or MCP tools.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- Unknown `inc:`: `INCIDENT_NOT_FOUND`, nothing cleared.
- Blank positional: usage, exit 1.
- `--clear-title` without positional: usage, exit 1.
- `--clear-title` plus `--title`: usage, exit 1.
- `--clear-title` plus `--resolution` / `--remove-resolution`:
  usage, exit 1.
- `--clear-title` with a value: usage, exit 1.
- Repeatable `--clear-title`: usage, exit 1 (Phase 1 confirms).
- `--investigation` / `--resource` on `incident`: existing usage.
- Stored title already omitted: `INCIDENT_TITLE_UNCHANGED` (or
  Phase 1 pin), nothing written.
- Pre-058 missing `incidents` table: `INCIDENT_NOT_FOUND`.
- 058 create / 062 append / 065 remove / 066 retitle unchanged
  when this flag is absent.

---

# Affected Surfaces

### CLI

- `incident <inc-id> --clear-title`
- confirmation distinct from 058 create, 062 append, 065 remove,
  and 066 retitle; names `inc:`
- help: `--clear-title` line + example
  `incident inc:… --clear-title`
- 058 / 062 / 065 / 066 unchanged when the flag is absent

### MCP

Four tools. No writes. No new fields. `docs/public/MCP.md`
unchanged unless Phase 1 finds a lie (expected: **no**). Existing
`incidentMemory[].title` is omitted when the field is absent.

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-058 omitted title / list `-`, SPRINT-066
`--title` requires text / `INCIDENT_TITLE_UNCHANGED`, SPRINT-066
leftover[0] (members stay `res:`), and inspect:

- CLI `incident`: `--title` boolean/blank is usage; positional +
  `--title` text is 066 retitle
- `retitleIncident` / `updateIncidentTitle`
- MCP `toIncidentMemoryRow` omits `title` when undefined
- list TITLE column uses `-` when omitted

Report:

1. CLI: `incident <inc> --clear-title` omits the stored title?
   Expected: **yes** (new boolean flag; `--title` stays require-
   text).
2. `recordedAt` / members unchanged? Expected: **yes.**
3. Resolution rows not deleted? Expected: **yes.**
4. Incident row not deleted? Expected: **yes.**
5. Blank `--title` stays usage, not clear? Expected: **yes.**
6. 066 retitle unchanged when `--clear-title` is absent?
   Expected: **yes.**
7. Already-omitted title fails; nothing written? Expected:
   **yes** (Phase 1 pins code).
8. `incident_id` / `inv:` members? Expected: **no.**
9. Confirmation distinct; show omits TITLE; list `-`; INCIDENT
   MEMORY omits TITLE; MCP omits `title`? Expected: **yes.**
10. Group snapshots as members, `recordedAt` rewrite, blank
    `--title` as clear, MCP writes, fifth tool, lifecycle?
    Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **Yes** — `title` UPDATE to NULL only.
   No new column. No membership UPDATE.
2. Second source of truth? **No** if title stays the 058 field.
3. Inferred clear? **No** — named `--clear-title` only.
4. 066 retitle leak? **No** — `--title` stays require-text.
5. Grouping snapshots leak? **No** — leftover[0] stays frozen.
6. MCP tool / write needed? Expected: **no.**
7. Compare / snapshot change? Expected: **no.**
8. `incident_id` / Incident delete / `recordedAt` rewrite /
   empty-string title? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + CLI
   help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

If implementation is tempted to store `inv:` ids as members, to
rewrite `recordedAt`, to treat blank `--title` as clear, or to
thaw MCP writes: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- `incident <inc> --clear-title` omits a stored title; members and
  `recordedAt` unchanged
- show omits TITLE; list TITLE column is `-`; INCIDENT MEMORY
  omits TITLE
- already-omitted title fails; nothing written
- unknown `inc:` is `INCIDENT_NOT_FOUND`
- blank `--title` is still usage, not clear
- `--clear-title` plus `--title` is usage
- `--clear-title` with append / remove is usage
- `--clear-title` without positional is usage
- 066 retitle / 058 create unchanged when the flag is absent
- after clear, 066 `--title` can set a first title again
- confirmation distinct from 058 / 062 / 065 / 066
- `--compare` / snapshot JSON / MCP four tools / no writes;
  `incidentMemory` omits `title`
- no `incident_id` column; no `inv:` members
- help lists `--clear-title` and an example

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
resolution --resource <id> --decision "Rollback"     # res:a
resolution --resource <id> --decision "Hold"         # res:b
incident --resolution res:a --resolution res:b --title "API error spike"
incident <inc> --clear-title                         # Cleared
incident <inc>                                       # no TITLE block; same members
incidents                                            # TITLE column -
investigate <id>                                     # INCIDENT MEMORY omits TITLE

# round-trip
incident <inc> --title "Named again"                 # 066 still works
incident <inc> --clear-title

# already omitted
incident --resolution res:c --resolution res:d       # no --title
incident <inc2> --clear-title                        # UNCHANGED

# bounds
incident <inc> --title                               # usage (requires text; not clear)
incident <inc> --clear-title --title "Nope"          # usage (do not mix)
incident <inc> --resolution res:x --clear-title      # usage
incident --clear-title                               # usage (no positional)
incident --investigation inv:a --investigation inv:b
  # still usage (leftover[0] frozen)
```

---

# Explicit Non-Goals

Do **not** implement:

- grouping Investigation snapshots as Incident members
- rewriting `recordedAt`
- blank `--title` as clear
- `--clear-title` on 062 append or 065 remove
- deleting Resolution rows
- deleting the Incident
- membership mutate
- empty-string title
- `incident_id` on Resolution rows
- denormalized subject on Incident
- MCP writes or a fifth tool
- snapshot MCP / `list_incidents`
- Investigation or Incident lifecycle / `resolved: true`
- Incident section on `--compare`
- putting Incidents on `InvestigationContext` or `snapshot_json`
- similarity, “you should”, Learning, Recommendation
- inferred clear from members / subject / evidence
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
067       clear an existing Incident title                         ← this
068+      group Investigations directly only if earned
          rewrite recordedAt only if earned
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
  `incidentMemory` / `resolutionMemory` filters unchanged except
  observing omitted title)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 058 create with `--title` unchanged
- 066 `--title` still requires text; still retitles
- 062 append / 065 remove: `--title` stays usage
- 061 / 064 `resolution --incident` unchanged
- 063 `incidents --investigation` unchanged
- grouping `inv:` as Incident members frozen
- `recordedAt` rewrite frozen
- blank `--title` as clear frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None required. Title-clear uses the existing `title` column
(NULL). `updateIncidentTitle` (066) stays replace-with-text.

If implementation is tempted to add `incident_id`, to store `inv:`
ids as members, to rewrite `recorded_at`, or to treat blank
`--title` as clear: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 067 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `incident <inc> --clear-title` omits the stored
      title; members / `recordedAt` unchanged; 058 create / 066
      retitle / 062 append / 065 remove unchanged on their paths
- [x] if earned: no inferred clear; no `inv:` members; no
      `incident_id`; no MCP writes; no `recordedAt` rewrite; no
      blank `--title` as clear
- [x] if not earned: rejection documented; do not invent a clear
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 058 remembered that a grouping may omit a title. Sprint
> 066 may name or rename that grouping. Sprint 067 may omit that
> name again because the human asked. Combie must not invent the
> clear, must not treat blank --title as that ask, must not treat
> an Investigation as an Incident, and must not rewrite when the
> grouping was recorded.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `6ea04a5` (authoring-only working tree). Pins:

1. CLI `incident <inc> --clear-title` omits the stored title —
   **yes** (new boolean flag; `--title` stays require-text).
2. `recordedAt` / members unchanged — **yes.**
3. Resolution rows not deleted — **yes.**
4. Incident row not deleted — **yes.**
5. Blank `--title` stays usage, not clear — **yes.**
6. 066 retitle unchanged when `--clear-title` is absent — **yes.**
7. Already-omitted title fails; nothing written — **yes.**
   Code: `INCIDENT_TITLE_UNCHANGED` (“already has no title”).
8. `incident_id` / `inv:` members — **no.**
9. Confirmation distinct; show omits TITLE; list `-`; INCIDENT
   MEMORY omits TITLE; MCP omits `title` — **yes.** Copy:
   `Cleared incident title`.
10. Group snapshots / `recordedAt` rewrite / blank `--title` as
    clear / MCP writes / fifth tool / lifecycle — **no.**

`--clear-title` with a value is usage. Repeatable `--clear-title`
is usage.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **Yes** — `title` UPDATE to NULL only.
2. Second source of truth? **No.**
3. Inferred clear? **No.**
4. 066 retitle leak? **No.**
5. Grouping snapshots leak? **No.**
6. MCP tool / write? **No.**
7. Compare / snapshot? **No.**
8. `incident_id` / Incident delete / `recordedAt` rewrite /
   empty-string title? **No.**
9. Canon? AGENTS.md operational baseline + CLI help only.

No STOP conflict.

## Implemented

- `incident <inc> --clear-title`: omit the stored title.
  `recordedAt` / `resolution_ids` unchanged. Domain field omitted;
  SQL NULL; never `""`.
- Already omitted is `INCIDENT_TITLE_UNCHANGED`; nothing written.
  Unknown `inc:` is `INCIDENT_NOT_FOUND`.
- `--clear-title` plus `--title` / `--resolution` /
  `--remove-resolution` is usage. `--clear-title` without
  positional is usage. A following value is usage. Repeatable
  flag is usage. Blank `--title` stays `--title requires text`
  (066 freeze). `--investigation` / `--resource` on `incident`
  stay usage (leftover[0] frozen).
- Confirmation: `Cleared incident title` (distinct from 058 / 062 /
  065 / 066). Names the `inc:`; does not dump the old title. Show
  omits TITLE; list TITLE column is `-`; INCIDENT MEMORY omits
  TITLE; MCP `incidentMemory` omits `title`.
- After clear, 066 `--title` can set a first title again.
- Store: `clearIncidentTitle` SET `title = NULL`. App:
  `clearIncidentTitle`. Help: `--clear-title` line + example
  `incident inc:… --clear-title`.
- MCP four tools, no writes. No `incident_id` column.

## Deviations

None.

## Validation

```text
baseline:          6ea04a5 docs(sprints): mark 066 complete
                   1071 pass / 78 files / 4976 expect()
bun test:          1080 pass across 78 files (5051 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-067-dogfood.* (never ./.combie)
                   create with title → --clear-title →
                   show omits TITLE; list TITLE -; INCIDENT MEMORY
                   omits TITLE; members / recordedAt unchanged →
                   --title Named again → --clear-title → omitted
                   create then --clear-title UNCHANGED → blank
                   --title usage → mix --clear-title --title usage
                   → append+clear usage → --clear-title without
                   positional usage → incident --investigation
                   still usage → no incident_id; title SQL NULL.
                   Isolated dogfood left founder .combie/combie.db
                   mtime/size unchanged.
```

## Learnings

- `--clear-title` is the omit inverse of 066 `--title`; blank
  `--title` stays require-text so a mistyped clear cannot look
  like a successful un-name.
- Reusing `INCIDENT_TITLE_UNCHANGED` for already-omitted matches
  066 same-text fail-closed, so a second clear does not look like
  a successful omit.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–067 complete.
Sprint 068 is not started. Grouping Investigation snapshots as
Incident members remains unearned. `recordedAt` rewrite remains
unearned.
