# SPRINT-066 — Retitle an Existing Incident

> **Status:** Complete
> **Depends on:** SPRINT-065 (complete)
> **Authorized by:** founder override, 2026-08-18 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> title-mutate slice after create, append, remove, list retrieve,
> and Incident-anchored write exist. Replaces the AGENTS.md line
> that 065 leftover is not a sequence and grouping Investigation
> snapshots as members remains unearned — leftover[0] stays
> **unearned** (Investigation ≠ Incident; members stay `res:`).
> This Sprint takes leftover[1]: retitle. Does **not** authorize
> Recommendation, Learning, similarity, Investigation lifecycle,
> MCP writes, inferred Action, grouping snapshots as members,
> rewriting `recordedAt`, clearing title to omitted, or
> `incident_id`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **explicit rename of an existing Incident's optional title**,
> not membership mutate, not deleting the Incident, not
> `incident_id` on `resolutions`, not inferred title from members
> or subject, not snapshot rewrite, not MCP writes
> **Type:** Narrow optional field mutation on the existing Incident
> `title` column (named `--title` text only)
> **Primary goal:** A human can replace the optional title on an
> exact existing `inc:` — named text only, `recordedAt` / members
> unchanged — without inferring a name, without grouping `inv:`
> snapshots as members, without adding `incident_id`, and without
> thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. Existing `incidentMemory` observes the
> new title via the 058 field. `resolutionMemory` unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 058–065 shipped create, append, remove, recall, list
retrieve, and Incident-anchored write (homogeneous and mixed):

```text
incident --resolution res:a --resolution res:b [--title]
incident <inc> --resolution res:d          # 062 append
incident <inc> --remove-resolution res:d   # 065 remove
resolution --incident <inc> [--resource]
incidents [--resolution|--resource|--investigation]
INCIDENT MEMORY / incidentMemory
```

Title is still create-time only:

```text
incident --resolution res:a --resolution res:b --title "API error spike"
incident inc:… --title "Better name"       # usage (requires --resolution)
```

A mis-named grouping can gain and lose members. It cannot be
renamed.

Sprint 065 leftover:

```text
066+      group Investigations directly only if earned
          retitle only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
065 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. Leftover[0] stays
unearned.

This Sprint takes leftover[1] **retitle** only under the founder
override below. Clearing title to omitted, and rewriting
`recordedAt`, are different mutates and stay later.

It is **not** grouping Investigation snapshots as members.
`--investigation` on `incident` create stays usage.

It is **not** 062 append. `--resolution` with a positional `inc:`
stays append. `--title` with append stays usage (062 freeze).

It is **not** 065 remove. `--remove-resolution` stays remove.
`--title` with remove stays usage (065 freeze).

It is **not** 058 create. `--title` with `--resolution` and no
positional still names the grouping at record time.

It is **not** rewriting `recordedAt`. Observation time of the
grouping stays create-time.

It is **not** clearing title to omitted. `--title` still requires
text (058 trim). A later sprint may earn clear.

It is **not** membership change. `resolution_ids` stay as stored.

It is **not** `incident_id` on `resolutions`. Membership stays the
058 array.

It is **not** MCP writes, a fifth tool, lifecycle, or inferred
title from members / subject / evidence.

---

# Founder Override

`AGENTS.md` after Sprint 065 recorded that the 065 leftover is not
a sequence, grouping Investigation snapshots as members remains
unearned, and retitle remains unearned. Sequencing Rule 2 still
holds: 058/062/065 membership paths do not rename. Grouping `inv:`
ids as members is not the next slice.

On 2026-08-18 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  resource-specific experience. A grouping whose members can change
  but whose human-facing name cannot is a one-way label.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  named `--title` on an existing `inc:` now that create / append /
  remove exist, rather than waiting for a ledger of “I grouped it
  under the wrong name and had to live with it.”
- Leftover[0] (group snapshots as members) is **not** authorized.
  Investigation ≠ Incident. Members stay `res:`.
- Rewriting `recordedAt` is **not** authorized. Title is the
  label; `recordedAt` is when the grouping was recorded.
- Clearing title to omitted is **not** authorized. `--title`
  requires text.
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision
  rule, and it does not authorize Recommendation, Learning,
  similarity, Investigation lifecycle, MCP writes, inferred Action,
  grouping snapshots as members, or `recordedAt` rewrite.
- Same pattern as Sprint 064 → 065: leftover order is not a
  sequence; leftover[0] is skipped because it conflicts with
  Investigation ≠ Incident.

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
name that grouping after record                    ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: persistence is an UPDATE of the existing
`title` column only. Do not UPDATE `recorded_at`. Do not UPDATE
`resolution_ids`. Do not delete the Incident. Do not add
`incident_id`.

Sequencing Rule 8: title has one source of truth — the 058
`title` field. Replace it with the named text. Do not infer from
members. Do not store a second display-name column.

Sequencing Rule 2: 058 create with `--title` still works. 062
append and 065 remove still reject `--title`. This Sprint does not
replace those.

Sequencing Rule 4: the new claim is “the human named this title
for this existing grouping,” not “Combie named it from the
subject” and not “these Investigations are now an Incident.”

---

# Problem

After create:

```text
incident --resolution res:a --resolution res:b --title "API error spike"
incident inc:… --title "Better name"
  # usage: Recording an incident requires --resolution ids
```

`--title` on append / remove is usage. The list, show, and
INCIDENT MEMORY TITLE stay “API error spike” forever.

The missing claim:

```text
The human named a new title for this exact Incident.
Members and recordedAt are unchanged.
```

That is explicit. It is **not** inferred from provider activity.
It is **not** grouping `inv:` snapshots as members. It is **not**
membership mutate.

---

# Product Question

> After explicit Incidents group existing Resolution ids and 062 /
> 065 can change membership, can Combie replace the optional title
> on that exact `inc:` — `recordedAt` / members unchanged — without
> inferring a name, without grouping Investigation snapshots as
> members, without `incident_id`, without MCP writes, and without a
> fifth tool?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names resource-specific
   experience. 058 shipped optional title at create. Named retitle
   is the bounded label mutate, not a new model.
2. **Founder override 2026-08-18** replaces the unearned gate for
   leftover[1]. Leftover[0] stays frozen (Investigation ≠ Incident).
   `recordedAt` rewrite and title-clear stay later.
3. **Existing primitive check:** 058 create with `--title` still
   works. 062/065 `--title` with membership flags stays usage. This
   Sprint is title-on-existing. Do not replace create.
4. **Sequencing Rule 8 / 9:** UPDATE `title` only. No
   `incident_id`. No subject on the Incident row.
5. **MCP** stays four read-only tools. Existing 059 `title` field
   observes the new text.

Rejected as 066 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | Leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Rewrite `recordedAt` | Different mutate; observation time stays create-time |
| Clear title to omitted | `--title` requires text; clear is a different mutate |
| `--title` with append / remove | 062 / 065 freeze; would mix mutates |
| Infer title from members / subject | Forbidden |
| `incident_id` on `resolutions` | Second source of truth |
| Fifth tool / MCP writes | Frozen |
| Investigation / Incident lifecycle | Status is still a process claim |
| Similarity | Forbidden |

---

# Exact Capability

```text
combie incident <inc-id> --title <text>
        ↓
Incident must exist
--title is non-blank text (058 trim)
no --resolution / --remove-resolution on this invocation
        ↓
UPDATE that Incident's title
  recordedAt / resolution_ids unchanged
        ↓
confirmation names the inc: and the new title
```

Command modes on `incident` (Phase 1 pins copy; expected this
split):

```text
incident --resolution res:a --resolution res:b [--title]
  → 058 CREATE (unchanged; --title still optional at create)

incident <inc-id>
  → 058 SHOW (unchanged)

incident <inc-id> --resolution res:d
  → 062 APPEND (unchanged; --title still usage)

incident <inc-id> --remove-resolution res:d
  → 065 REMOVE (unchanged; --title still usage)

incident <inc-id> --title "Better name"
  → this Sprint RETITLE (named text; members / recordedAt unchanged)
```

Exact CLI shape is Phase 1. Expected: positional `inc:` plus
`--title`, and neither membership flag. Do not invent a second
flag (`--rename`, `--retitle`). Reuse 058 `--title`.

`--title` without a positional `inc:` stays 058 create when
`--resolution` is present, and usage when it is not. `--title`
plus `--resolution` on a positional stays 062 usage. `--title`
plus `--remove-resolution` stays 065 usage.
`--investigation` / `--resource` on `incident` stay usage.

Retitle constraints:

- One exact Incident id (the positional). Unknown `inc:`:
  `INCIDENT_NOT_FOUND`, nothing renamed.
- `--title` requires text. Blank / boolean: existing usage, exit 1.
- Repeatable `--title`: usage (one exact title). Phase 1 confirms.
- First-seen trim: same 058 `trimField`. Empty after trim is
  usage, not clear-to-omitted.
- Same text as the stored title (after trim): fail. Expected:
  Phase 1 pins the code (likely `INCIDENT_TITLE_UNCHANGED`).
  Nothing written. Prefer this over a silent no-op (062
  `INCIDENT_MEMBERS_UNCHANGED` shape).
- Setting a first title on a grouping that omitted one at create
  is allowed (stored title is absent; named text is new).
- `recordedAt` / `resolution_ids` unchanged.
- Resolution rows unchanged.

058 create, 062 append, 065 remove, 061/064 `--incident` write,
060/063 list, and show are unchanged when this path is absent
(positional + `--title` with no membership flags).

Live `investigate`, `investigation <id>` reopen, `--compare`, and
`investigate_resource` are unchanged except they observe the new
title via the existing 058 field. Snapshot JSON is not rewritten.

---

# Evidence / Claim Semantics

### KNOWN (about the grouping)

```text
Combie replaced this Incident's title with the text the human
named. Members and recordedAt are the same. The grouping is
still retained organizational grouping.
```

### UNKNOWN / stale (required)

The grouping is **retained organizational grouping**, not proof
the occurrence is still current, not a proven outage, and not
current provider authority. A new title is not “this is a
different incident.”

### Forbidden

```text
You should rollback
These are similar incidents
This Investigation is now an Incident
resolved: true / this investigation is closed
Combie named it from the subject
```

---

# Architecture

```text
incidents.title (058)                              UPDATE replace
incidents.recorded_at / resolution_ids             unchanged
resolutions rows                                   unchanged
        ↓
retitleIncident                                    this Sprint
        ↓
CLI incident <inc> --title
```

Ownership:

- **Domain / Store:** no new type. No `incident_id`. Do not
  denormalize subject onto the Incident. Add a title UPDATE
  (058 insert inverse for the label only). Do not DELETE the
  Incident. Do not UPDATE `recorded_at` or `resolution_ids`.
- **App:** `retitleIncident` (name is Phase 1) distinct from
  `recordIncident` (058), `appendIncidentResolutions` (062), and
  `removeIncidentResolutions` (065). Named text only.
- **CLI:** positional `inc:` plus `--title` (no membership flags)
  is retitle, not show and not create. Help: retitle usage +
  example. 058/062/065 `--title` rules unchanged on those paths.
- **MCP / Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to add `incident_id`, to store `inv:`
ids as members, to rewrite `recordedAt`, to infer a title, to
clear title to omitted, or to thaw MCP writes: **STOP.**

---

# Persistence vs Read-Time

| Snapshot | Resolution rows | Incident title |
| --- | --- | --- |
| Frozen InvestigationContext | Unchanged | 058 column replace (named text) |
| Unchanged JSON | no `incident_id` | `recorded_at` / members unchanged |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- DELETE Resolution rows
- DELETE the Incident
- rewrite snapshot JSON
- rewrite `recorded_at`
- mutate `resolution_ids`
- create Relationships or Changes
- refresh providers
- add MCP tools or writes
- infer title from members / subject / evidence

---

# Boundedness

- One existing `incident` command. No new verb.
- Retitle only when positional `inc:` **and** `--title` are
  present, and `--resolution` / `--remove-resolution` are absent.
- Named non-blank text only. No inferred title.
- No grouping of Investigation snapshots as members.
- No `recordedAt` rewrite. No membership change.
- No change to compare, snapshot schema, or MCP tools.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- Unknown `inc:`: `INCIDENT_NOT_FOUND`, nothing renamed.
- Blank positional / blank `--title`: usage, exit 1.
- `--title` without positional and without `--resolution`:
  existing usage, exit 1.
- `--title` plus `--resolution` on a positional: existing 062
  usage, exit 1.
- `--title` plus `--remove-resolution`: existing 065 usage,
  exit 1.
- Repeatable `--title`: usage, exit 1 (Phase 1 confirms).
- `--investigation` / `--resource` on `incident`: existing usage.
- Same text as stored title: `INCIDENT_TITLE_UNCHANGED` (or Phase
  1 pin), nothing written.
- Pre-058 missing `incidents` table: `INCIDENT_NOT_FOUND`.
- 058 create / 062 append / 065 remove unchanged when this path
  is absent.

---

# Affected Surfaces

### CLI

- `incident <inc-id> --title <text>`
- confirmation distinct from 058 create, 062 append, and 065
  remove; names `inc:` and the new title
- help: `--title` line covers create **or** retitle; example
  `incident inc:… --title "…"`
- 058 create / 062 append / 065 remove / show unchanged when this
  path is absent

### MCP

Four tools. No writes. No new fields. `docs/public/MCP.md`
unchanged unless Phase 1 finds a lie (expected: **no**). Existing
`incidentMemory[].title` observes the new text.

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-058 optional title / `trimField`, SPRINT-062 /
065 `--title` usage on membership paths, SPRINT-065 leftover[0]
(members stay `res:`), and inspect:

- CLI `incident`: positional + `--title` without membership flags
  is currently usage (“requires --resolution ids”)
- `recordIncident` title persist / omit
- MCP four-tool freeze; `incidentMemory` already has `title`

Report:

1. CLI: `incident <inc> --title <text>` retitles? Expected:
   **yes** (reuse `--title`; append / remove still reject it).
2. `recordedAt` / members unchanged? Expected: **yes.**
3. Resolution rows not deleted? Expected: **yes.**
4. Incident row not deleted? Expected: **yes.**
5. `--title` with append / remove stays usage? Expected: **yes.**
6. 058 create with `--title` unchanged when positional is absent?
   Expected: **yes.**
7. Same text as stored title fails; nothing written? Expected:
   **yes** (Phase 1 pins code).
8. `incident_id` / `inv:` members? Expected: **no.**
9. Confirmation distinct; show / list / INCIDENT MEMORY observe
   the new title? Expected: **yes.**
10. Group snapshots as members, `recordedAt` rewrite, title-clear,
    MCP writes, fifth tool, lifecycle? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **Yes** — `title` UPDATE only. No new
   column. No membership UPDATE.
2. Second source of truth? **No** if title stays the 058 field.
3. Inferred title? **No** — named `--title` text only.
4. 062 / 065 leak? **No** — `--title` with membership flags stays
   usage.
5. Grouping snapshots leak? **No** — leftover[0] stays frozen.
6. MCP tool / write needed? Expected: **no.**
7. Compare / snapshot change? Expected: **no.**
8. `incident_id` / Incident delete / `recordedAt` rewrite /
   title-clear? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + CLI
   help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

If implementation is tempted to store `inv:` ids as members, to
rewrite `recordedAt`, to infer a title, or to thaw MCP writes:
**STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- `incident <inc> --title` replaces the stored title; members and
  `recordedAt` unchanged
- grouping that omitted title at create can gain a first title
- same text as stored title fails; nothing written
- unknown `inc:` is `INCIDENT_NOT_FOUND`
- `--title` with append is still usage
- `--title` with remove is still usage
- `--title` without positional and without `--resolution` is still
  usage
- 058 create with `--title` unchanged when positional is absent
- confirmation distinct from 058 / 062 / 065; show TITLE block
  matches
- `incidents` list TITLE column updates; live INCIDENT MEMORY
  observes the new title
- `--compare` / snapshot JSON / MCP four tools / no writes
- no `incident_id` column; no `inv:` members
- help lists retitle on `--title` and an example

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
resolution --resource <id> --decision "Rollback"     # res:a
resolution --resource <id> --decision "Hold"         # res:b
incident --resolution res:a --resolution res:b --title "API error spike"
incident <inc> --title "Better name"                 # Renamed
incident <inc>                                       # TITLE Better name; same members
incidents                                            # TITLE column Better name
investigate <id>                                     # INCIDENT MEMORY TITLE Better name

# omitted-at-create
incident --resolution res:a --resolution res:b       # no --title
incident <inc2> --title "Named later"                # first title

# bounds
incident <inc> --title "Better name"                 # UNCHANGED
incident <inc> --resolution res:x --title "Nope"     # usage (062)
incident <inc> --remove-resolution res:b --title "Nope"
  # usage (065)
incident --title "Nope"                              # usage (no positional)
incident --investigation inv:a --investigation inv:b
  # still usage (leftover[0] frozen)
```

---

# Explicit Non-Goals

Do **not** implement:

- grouping Investigation snapshots as Incident members
- rewriting `recordedAt`
- clearing title to omitted
- `--title` on 062 append or 065 remove
- deleting Resolution rows
- deleting the Incident
- membership mutate
- `incident_id` on Resolution rows
- denormalized subject on Incident
- MCP writes or a fifth tool
- snapshot MCP / `list_incidents`
- Investigation or Incident lifecycle / `resolved: true`
- Incident section on `--compare`
- putting Incidents on `InvestigationContext` or `snapshot_json`
- similarity, “you should”, Learning, Recommendation
- inferred title from members / subject / evidence
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
066       retitle an existing Incident                             ← this
067+      group Investigations directly only if earned
          clear title to omitted / rewrite recordedAt only if earned
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
  observing the new title)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 058 create with `--title` unchanged when positional is absent
- 062 append / 065 remove: `--title` stays usage
- 061 / 064 `resolution --incident` unchanged
- 063 `incidents --investigation` unchanged
- grouping `inv:` as Incident members frozen
- `recordedAt` rewrite frozen
- title-clear-to-omitted frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None required. Retitle uses the existing `title` column.
`appendIncidentMembers` / `removeIncidentMembers` stay membership.

If implementation is tempted to add `incident_id`, to store `inv:`
ids as members, or to rewrite `recorded_at`: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 066 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `incident <inc> --title` replaces the stored
      title; members / `recordedAt` unchanged; 058 create / 062
      append / 065 remove unchanged on their paths
- [x] if earned: no inferred title; no `inv:` members; no
      `incident_id`; no MCP writes; no `recordedAt` rewrite
- [x] if not earned: rejection documented; do not invent a title
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 058 remembered that the human named several responses as
> one occurrence, optionally with a title. Sprint 062 and 065 may
> change who is in that occurrence. Sprint 066 may replace the
> name the human gave that occurrence. Combie must not invent the
> title, must not treat an Investigation as an Incident, and must
> not rewrite when the grouping was recorded.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `bc34ce2` (authoring-only working tree). Pins:

1. CLI `incident <inc> --title` retitles; reuse `--title` —
   **yes** (was usage). Append / remove still reject `--title`.
2. `recordedAt` / members unchanged — **yes.**
3. Resolution rows not deleted — **yes.**
4. Incident row not deleted — **yes.**
5. `--title` with append / remove stays usage — **yes.**
6. 058 create with `--title` unchanged when positional is absent —
   **yes.**
7. Same text as stored title fails; nothing written — **yes.**
   Code: `INCIDENT_TITLE_UNCHANGED`.
8. `incident_id` / `inv:` members — **no.**
9. Confirmation distinct; show / list / INCIDENT MEMORY observe
   the new title — **yes.** Copy: `Renamed incident`.
10. Group snapshots / `recordedAt` rewrite / title-clear / MCP
    writes / fifth tool / lifecycle — **no.**

Repeatable `--title` is usage (one exact title). First title on
omitted-at-create is allowed.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **Yes** — `title` UPDATE only.
2. Second source of truth? **No.**
3. Inferred title? **No.**
4. 062 / 065 leak? **No.**
5. Grouping snapshots leak? **No.**
6. MCP tool / write? **No.**
7. Compare / snapshot? **No.**
8. `incident_id` / Incident delete / `recordedAt` rewrite /
   title-clear? **No.**
9. Canon? AGENTS.md operational baseline + CLI help only.

No STOP conflict.

## Implemented

- `incident <inc> --title <text>`: replace the stored title.
  `recordedAt` / `resolution_ids` unchanged. Groupings that
  omitted title at create can gain a first title.
- Same text after trim is `INCIDENT_TITLE_UNCHANGED`; nothing
  written. Unknown `inc:` is `INCIDENT_NOT_FOUND`.
- `--title` with append / remove stays usage. `--title` without
  positional stays 058 create or usage. Repeatable `--title` is
  usage. `--investigation` / `--resource` on `incident` stay
  usage (leftover[0] frozen).
- Confirmation: `Renamed incident` (distinct from 058 / 062 /
  065). Show TITLE, list TITLE column, and INCIDENT MEMORY observe
  the new text.
- Store: `updateIncidentTitle` UPDATEs `title` only. App:
  `retitleIncident`. Help: `--title` covers create or retitle;
  example `incident inc:… --title "Better name"`.
- MCP four tools, no writes. `incidentMemory.title` observes the
  new text. No `incident_id` column.

## Deviations

None.

## Validation

```text
baseline:          bc34ce2 docs(sprints): mark 065 complete
                   1062 pass / 78 files / 4897 expect()
bun test:          1071 pass across 78 files (4976 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-066-dogfood.* (never ./.combie)
                   create with title → --title Better name →
                   show/list/INCIDENT MEMORY observe → omitted
                   create then first title → same text UNCHANGED
                   → append+title usage → remove+title usage →
                   --title without positional usage → incident
                   --investigation still usage → no incident_id.
                   Founder .combie/combie.db mtime/size unchanged.
```

One MCP stdio digest assertion (Sprint 056, not this slice)
failed under parallel load and passed on full-suite retry. Four
tools and no writes held.

## Learnings

- `--title` on a positional with no membership flags is retitle;
  the same flag on create / append / remove stays those paths.
- Same-text `INCIDENT_TITLE_UNCHANGED` matches 062's fail-closed
  no-op, so a mis-paste does not look like a successful rename.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–066 complete.
Sprint 067 is not started. Grouping Investigation snapshots as
Incident members remains unearned. `recordedAt` rewrite and
title-clear remain unearned.
