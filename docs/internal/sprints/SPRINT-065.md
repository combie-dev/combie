# SPRINT-065 — Remove Existing Members from an Incident

> **Status:** Complete
> **Depends on:** SPRINT-064 (complete)
> **Authorized by:** founder override, 2026-08-18 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> membership-remove slice after append, list retrieve, and
> mixed-subject `--incident` write exist. Replaces the AGENTS.md
> line that 064 leftover is not a sequence and grouping
> Investigation snapshots as members remains unearned — leftover[0]
> stays **unearned** (Investigation ≠ Incident; members stay `res:`).
> This Sprint takes leftover[1]: member removal. Does **not**
> authorize Recommendation, Learning, similarity, Investigation
> lifecycle, MCP writes, inferred Action, grouping snapshots as
> members, retitle, or `incident_id`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **explicit ungrouping of named Resolution ids from an existing
> Incident**, not deleting Resolution rows, not deleting the
> Incident, not `incident_id` on `resolutions`, not inferred
> members, not snapshot rewrite, not MCP writes
> **Type:** Narrow optional membership mutation on the existing
> Incident `resolution_ids` array (remove named `res:` ids only)
> **Primary goal:** A human can detach one or more already-grouped
> `res:` ids from an exact existing `inc:` — named ids only, keep
> ≥2 members, Resolution rows unchanged — without inferring which
> members to drop, without grouping `inv:` snapshots as members,
> without adding `incident_id`, and without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. Existing `incidentMemory` observes the
> remaining member ids via 059 membership. `resolutionMemory`
> unchanged (the `res:` still exists).
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 058–064 shipped create, append, recall, list retrieve,
Incident-anchored write (homogeneous and mixed), and
investigation-scoped list:

```text
incident --resolution res:a --resolution res:b
incident <inc> --resolution res:d          # 062 append
resolution --incident <inc> [--resource]
incidents [--resolution|--resource|--investigation]
INCIDENT MEMORY / incidentMemory
```

A named member still cannot leave that `inc:`:

```text
incident inc:…                             # still lists res:d
resolution res:d                           # row exists; still grouped
```

Sprint 064 leftover:

```text
065+      group Investigations directly only if earned
          member removal / retitle only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
064 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. Leftover[0] stays
unearned.

This Sprint takes leftover[1] **member removal** only under the
founder override below. Retitle is a different mutate and stays
later.

It is **not** grouping Investigation snapshots as members.
`--investigation` on `incident` create stays usage.

It is **not** 062 append. `--resolution` with a positional `inc:`
stays append. Removal is a distinct flag (Phase 1 pins spelling;
expected `--remove-resolution`).

It is **not** deleting Resolution rows. The `res:` remains; it
becomes ungrouped. Exclusive membership: it may later join another
Incident via 062.

It is **not** deleting the Incident. 058: a grouping has ≥2
members. Removal that would leave 0 or 1 members fails; the
Incident stays.

It is **not** retitle / rewrite `recordedAt`. `--title` on remove
is usage (062 append freeze).

It is **not** `incident_id` on `resolutions`. Membership stays the
058 array.

It is **not** MCP writes, a fifth tool, lifecycle, or inferred
members.

---

# Founder Override

`AGENTS.md` after Sprint 064 recorded that the 064 leftover is not
a sequence and grouping Investigation snapshots as members remains
unearned. Sequencing Rule 2 still holds: the human can leave a
mis-named member on the grouping; 062 only appends. Grouping `inv:`
ids as members is not the next slice.

On 2026-08-18 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  resource-specific experience. A grouping that can accept a named
  member but cannot release a named member is a one-way mutate.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  the 062 inverse (named remove, keep ≥2) now that append exists,
  rather than waiting for a ledger of “I appended the wrong `res:`
  and had to live with it.”
- Leftover[0] (group snapshots as members) is **not** authorized.
  Investigation ≠ Incident. Members stay `res:`.
- Retitle is **not** authorized. Title stays create-time (058).
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision
  rule, and it does not authorize Recommendation, Learning,
  similarity, Investigation lifecycle, MCP writes, inferred Action,
  grouping snapshots as members, or retitle.
- Same pattern as Sprint 062 → 063 and 063 → 064: leftover order
  is not a sequence; leftover[0] is skipped because it conflicts
  with Investigation ≠ Incident.

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
recall / retrieve that grouping                    ← 059 / 060 / 063
    ↓
hang a new response on that grouping               ← 061 / 064
    ↓
detach a named response from that grouping         ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: persistence is an UPDATE of the 058 array
only. Do not delete Resolution rows. Do not delete the Incident.
Do not add `incident_id`.

Sequencing Rule 8: membership has one source of truth — the 058
array. Remove named ids from that array. Do not store a second
ungrouped flag on the Resolution.

Sequencing Rule 2: 062 append still works. 058 create still
requires ≥2. This Sprint does not replace either.

Sequencing Rule 4: the new claim is “the human named these member
ids to detach from this existing grouping,” not “Combie dropped
similar members” and not “these Investigations are now an
Incident.”

---

# Problem

After append:

```text
incident --resolution res:a --resolution res:b --resolution res:c
incident inc:… --resolution res:d
```

`res:d` was the wrong row. `incident inc:… --resolution res:e`
can add more. Nothing can take `res:d` off the grouping without
deleting organizational response.

The missing claim is the 062 inverse:

```text
The human named an existing member of this Incident to detach.
The Resolution remains. The grouping remains if ≥2 members stay.
```

That is explicit. It is **not** inferred from provider activity.
It is **not** grouping `inv:` snapshots as members. It is **not**
retitle.

---

# Product Question

> After explicit Incidents group existing Resolution ids and 062
> can append more, can Combie detach named `res:` ids from that
> exact `inc:` — keep ≥2 members, Resolution rows unchanged,
> `recordedAt` / title unchanged — without inferring members,
> without grouping Investigation snapshots as members, without
> `incident_id`, without MCP writes, and without a fifth tool?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names resource-specific
   experience. 062 shipped named append. Named remove is the
   bounded inverse, not a new model.
2. **Founder override 2026-08-18** replaces the unearned gate for
   leftover[1]. Leftover[0] stays frozen (Investigation ≠ Incident).
   Retitle stays later.
3. **Existing primitive check:** 062 append and 058 create still
   work. This Sprint is detach-of-existing members. Do not replace
   062. Do not delete Resolution rows.
4. **Sequencing Rule 8 / 9:** UPDATE `resolution_ids` only. No
   `incident_id`. No subject on the Incident row.
5. **MCP** stays four read-only tools. Existing 059 fields observe
   remaining member ids.

Rejected as 065 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | Leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Retitle / rewrite `recordedAt` | Different mutate; 058/062 freeze |
| Delete the Resolution row | Organizational response is append-only |
| Delete the Incident when <2 remain | 058: a grouping is ≥2; fail instead |
| Reuse `--resolution` for remove | 062 append; would collide |
| Infer which members to drop | Forbidden |
| `incident_id` on `resolutions` | Second source of truth |
| Fifth tool / MCP writes | Frozen |
| Investigation / Incident lifecycle | Status is still a process claim |
| Similarity | Forbidden |

---

# Exact Capability

```text
combie incident <inc-id> --remove-resolution <res-id>
        [--remove-resolution <res-id> …]
        ↓
Incident must exist
each named res: must exist (058)
each named res: is currently a member of this Incident
after first-seen unique, remaining members ≥ 2
        ↓
UPDATE that Incident's resolution_ids
  drop the named ids; keep relative order of the rest
  recordedAt / title unchanged
        ↓
Resolution rows unchanged (no delete, no incidentId)
confirmation names the inc: and the removed ids
```

Command modes on `incident` (Phase 1 pins copy; expected this
split):

```text
incident --resolution res:a --resolution res:b [--title]
  → 058 CREATE (unchanged)

incident <inc-id>
  → 058 SHOW (unchanged)

incident <inc-id> --resolution res:d
  → 062 APPEND (unchanged)

incident <inc-id> --remove-resolution res:d
  → this Sprint REMOVE (≥1 named current member; remaining ≥2)
```

Exact CLI flag spelling is Phase 1. Expected: `--remove-resolution`
(repeatable, one family with `--resolution`). Do not overload
`--resolution` as remove.

`--remove-resolution` without a positional `inc:` is usage (cannot
remove at create). `--resolution` plus `--remove-resolution` on
the same invocation is usage. `--title` with remove is usage.
`--investigation` / `--resource` on `incident` stay usage.

Remove constraints:

- One exact Incident id (the positional). Unknown `inc:`:
  `INCIDENT_NOT_FOUND`, nothing removed.
- Repeatable `--remove-resolution`. Blank / boolean: usage, exit 1.
- Each named id must exist: `RESOLUTION_NOT_FOUND`, nothing
  removed (058).
- First-seen unique: trim, drop blanks, collapse duplicates in
  the named list.
- Each remaining named id must currently be a member of **this**
  Incident. If any is not: fail. Expected: Phase 1 pins the code
  (likely `INCIDENT_MEMBER_NOT_ON_INCIDENT`). Nothing removed.
- After applying the named removals, remaining unique members
  must be ≥2 (058). If the result would be 0 or 1: fail. Expected:
  Phase 1 pins the code (likely `INCIDENT_MEMBERS_REQUIRED`).
  Nothing removed. Do not delete the Incident.
- Named set that removes nothing (empty after unique): usage or
  `INCIDENT_MEMBERS_UNCHANGED` — Phase 1 pins. Prefer usage when
  no ids were named; `UNCHANGED` is for 062 append-of-already-on-this.
- Resolution rows are not deleted. Detached ids are ungrouped and
  may later 062-append onto this or another Incident.
- `recordedAt` / title unchanged.

058 create, 062 append, 061/064 `--incident` write, 060/063 list,
and show are unchanged when `--remove-resolution` is absent.

Live `investigate`, `investigation <id>` reopen, `--compare`, and
`investigate_resource` are unchanged except they observe remaining
members via existing membership. Snapshot JSON is not rewritten.

---

# Evidence / Claim Semantics

### KNOWN (about the grouping)

```text
Combie detached these named Resolution ids from this exact
Incident. The human named the members. The Resolution rows still
exist. The grouping still exists because ≥2 members remain.
```

### UNKNOWN / stale (required)

The grouping is **retained organizational grouping**, not proof
the occurrence is still current, not a proven outage, and not
current provider authority. Detach is not “this response never
happened.”

### Forbidden

```text
You should rollback
These are similar incidents
This Investigation is now an Incident
resolved: true / this investigation is closed
Combie dropped the oldest member
```

---

# Architecture

```text
incidents.resolution_ids (058)                 UPDATE remove named
resolutions rows                               unchanged
        ↓
removeIncidentResolutions                      this Sprint
        ↓
CLI incident <inc> --remove-resolution
```

Ownership:

- **Domain / Store:** no new type. No `incident_id`. Do not
  denormalize subject onto the Incident. Add a remove-members
  UPDATE (062 append inverse). Do not DELETE from `resolutions`.
  Do not DELETE the Incident row.
- **App:** `removeIncidentResolutions` (name is Phase 1) distinct
  from `appendIncidentResolutions` (062) and `recordIncident`
  (058). Named current members only. Remaining ≥2.
- **CLI:** positional `inc:` plus `--remove-resolution` is remove,
  not show and not append. Help: remove usage + example. 058/062
  unchanged when that flag is absent.
- **MCP / Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to add `incident_id`, to store `inv:`
ids as members, to delete Resolution rows, to delete the Incident,
to infer ids, to retitle, or to thaw MCP writes: **STOP.**

---

# Persistence vs Read-Time

| Snapshot | Resolution rows | Incident membership |
| --- | --- | --- |
| Frozen InvestigationContext | Unchanged (no delete) | 058 array remove (named ids only) |
| Unchanged JSON | no `incident_id` | `recorded_at` / `title` unchanged |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- DELETE Resolution rows
- DELETE the Incident
- rewrite snapshot JSON
- create Relationships or Changes
- refresh providers
- add MCP tools or writes
- append, reorder (except by dropping named ids), or retitle

---

# Boundedness

- One existing `incident` command. No new verb.
- Remove only when positional `inc:` **and** `--remove-resolution`
  are present.
- Named current member `res:` ids only. No inferred members.
- Remaining members ≥2. No Incident delete.
- No grouping of Investigation snapshots as members.
- No retitle. No 062 append change.
- No change to compare, snapshot schema, or MCP tools.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- Unknown `inc:`: `INCIDENT_NOT_FOUND`, nothing removed.
- Blank positional / blank `--remove-resolution`: usage, exit 1.
- `--remove-resolution` without positional: usage, exit 1.
- `--resolution` plus `--remove-resolution`: usage, exit 1.
- `--title` with remove: usage, exit 1.
- `--investigation` / `--resource` on `incident`: existing usage.
- Unknown `res:`: `RESOLUTION_NOT_FOUND` (058), nothing removed.
- Named id not a member of this Incident: not-on-this error
  (Phase 1 pins), nothing removed.
- Named set would leave <2 members: `INCIDENT_MEMBERS_REQUIRED`
  (or Phase 1 pin), nothing removed.
- Pre-058 missing `incidents` table: `INCIDENT_NOT_FOUND`.
- 058 create / 062 append unchanged when the new flag is absent.

---

# Affected Surfaces

### CLI

- `incident <inc-id> --remove-resolution <res-id>` (repeatable)
- confirmation distinct from 058 create and 062 append; names
  `inc:` and removed ids
- help: remove usage + example
- 058 create / 062 append / show unchanged when the flag is absent

### MCP

Four tools. No writes. No new fields. `docs/public/MCP.md`
unchanged unless Phase 1 finds a lie (expected: **no**).

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-058 ≥2 members, SPRINT-062 append / exclusive
membership / `INCIDENT_MEMBERS_UNCHANGED`, SPRINT-064 leftover[0]
(members stay `res:`), and inspect:

- CLI `incident`: positional + `--resolution` is 062 append
- `appendIncidentResolutions` / `appendIncidentMembers`
- 058 `INCIDENT_MEMBERS_REQUIRED`
- MCP four-tool freeze

Report:

1. CLI: `incident <inc> --remove-resolution <res>` removes named
   current members? Expected: **yes** (new flag; `--resolution`
   stays 062).
2. Keep ≥2 remaining members? Expected: **yes.** Fail the whole
   named set if not.
3. Resolution rows not deleted? Expected: **yes.**
4. Incident row not deleted? Expected: **yes.**
5. `recordedAt` / title unchanged; `--title` on remove is usage?
   Expected: **yes.**
6. Named id not on this Incident fails; nothing removed?
   Expected: **yes.**
7. 058 create / 062 append unchanged when flag absent?
   Expected: **yes.**
8. `incident_id` / `inv:` members? Expected: **no.**
9. Confirmation distinct; show lists remaining member ids?
   Expected: **yes.**
10. Group snapshots as members, retitle, MCP writes, fifth tool,
    lifecycle? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **Yes** — membership UPDATE only. No
   new column. No Resolution DELETE.
2. Second source of truth? **No** if membership stays the 058
   array.
3. Inferred members? **No** — named `--remove-resolution` ids only.
4. 062 append leak? **No** — `--resolution` stays append.
5. Grouping snapshots leak? **No** — leftover[0] stays frozen.
6. MCP tool / write needed? Expected: **no.**
7. Compare / snapshot change? Expected: **no.**
8. `incident_id` / Incident delete / Resolution delete / retitle?
   Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + CLI
   help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

If implementation is tempted to DELETE `resolutions` or the
Incident, to store `inv:` ids as members, to overload `--resolution`
as remove, or to thaw MCP writes: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- `incident <inc> --remove-resolution` drops a current member;
  remaining ≥2; Resolution row still loads
- two named ids remove in first-seen order; remaining keep order
- duplicates collapse first-seen
- named id not on this Incident fails; nothing removed
- unknown `res:` is `RESOLUTION_NOT_FOUND`; unknown `inc:` is
  `INCIDENT_NOT_FOUND`
- named set that would leave <2 fails; Incident and members
  unchanged
- `--title` on remove is usage
- `--resolution` plus `--remove-resolution` is usage
- `--remove-resolution` without positional is usage
- 062 append / 058 create unchanged when the new flag is absent
- detached id may later 062-append onto the same or another
  Incident
- confirmation distinct from 058 / 062; show lists remaining ids
- `incidents` count decrements; `--resolution <removed>` no longer
  lists this Incident (060); live INCIDENT MEMORY observes remaining
- `--compare` / snapshot JSON / MCP four tools / no writes
- no `incident_id` column; no `inv:` members
- help lists the remove line and example

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
resolution --resource <id> --decision "Rollback"     # res:a
resolution --resource <id> --decision "Hold"         # res:b
resolution --resource <id> --decision "Scale up"     # res:c
incident --resolution res:a --resolution res:b --resolution res:c
incident <inc> --remove-resolution res:c             # Updated/Removed
incident <inc>                                       # res:a, res:b
resolution res:c                                     # still exists; no INCIDENT heading
incidents --resolution res:c                         # known-empty for that id
incident <inc> --resolution res:c                    # 062 can re-append

# bounds
incident <inc> --remove-resolution res:a --remove-resolution res:b
  # would leave 0; MEMBERS_REQUIRED; nothing removed
incident --remove-resolution res:a                   # usage (no positional)
incident <inc> --resolution res:x --remove-resolution res:c
  # usage (do not mix)
incident --investigation inv:a --investigation inv:b
  # still usage (leftover[0] frozen)
```

---

# Explicit Non-Goals

Do **not** implement:

- grouping Investigation snapshots as Incident members
- retitle / rewrite `recordedAt`
- deleting Resolution rows
- deleting the Incident
- overloading `--resolution` as remove
- `incident_id` on Resolution rows
- denormalized subject on Incident
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
063       incidents --investigation list retrieve                  ✅
064       Incident-anchored write for mixed-subject Incidents      ✅
065       remove existing members after Incident record            ← this
066+      group Investigations directly only if earned
          retitle only if earned
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
  observing remaining members)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 058 create / 062 append unchanged when `--remove-resolution` is
  absent
- 061 / 064 `resolution --incident` unchanged
- 063 `incidents --investigation` unchanged
- grouping `inv:` as Incident members frozen
- retitle frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None required. Membership remove uses the existing
`resolution_ids` JSON. `appendIncidentMembers` (062) stays append.

If implementation is tempted to DELETE `resolutions` or the
Incident, to add `incident_id`, or to store `inv:` ids as members:
**STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 065 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `incident <inc> --remove-resolution` detaches
      named current members; remaining ≥2; Resolution rows
      unchanged; 058 create / 062 append unchanged
- [x] if earned: no Incident delete; no inferred members; no
      `inv:` members; no `incident_id`; no MCP writes; no retitle
- [x] if not earned: rejection documented; do not infer a member
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 058 remembered that the human named several responses as
> one occurrence. Sprint 062 may attach a response the human already
> recorded. Sprint 065 may detach a response the human named as
> leaving that occurrence. Combie must not invent the member, must
> not delete the response, must not treat an Investigation as an
> Incident, and must not drop a grouping below two members.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `5ee1996` (authoring-only working tree). Pins:

1. CLI `incident <inc> --remove-resolution` removes; `--resolution`
   stays 062 — **yes.** New flag; `flags["remove-resolution"]`.
2. Keep ≥2 remaining; fail the whole named set if not — **yes.**
   Reuse `INCIDENT_MEMBERS_REQUIRED`.
3. Resolution rows not deleted — **yes.**
4. Incident row not deleted — **yes.**
5. `recordedAt` / title unchanged; `--title` on remove is usage —
   **yes.**
6. Named id not on this Incident fails; nothing removed — **yes.**
   Code: `INCIDENT_MEMBER_NOT_ON_INCIDENT`.
7. 058 create / 062 append unchanged when flag absent — **yes.**
8. `incident_id` / `inv:` members — **no.**
9. Confirmation distinct; show lists remaining members — **yes.**
   Copy: `Removed from incident`.
10. Group snapshots / retitle / MCP writes / fifth tool /
    lifecycle — **no.**

## Phase 2 — Architecture Pressure

1. Persistence necessary? **Yes** — membership UPDATE only. No new
   column. No Resolution DELETE.
2. Second source of truth? **No.**
3. Inferred members? **No** — named `--remove-resolution` ids only.
4. 062 append leak? **No** — `--resolution` stays append.
5. Grouping snapshots leak? **No.**
6. MCP tool / write? **No.**
7. Compare / snapshot? **No.**
8. `incident_id` / Incident delete / Resolution delete / retitle?
   **No.**
9. Canon? AGENTS.md operational baseline + CLI help only.

No STOP conflict.

## Implemented

- `incident <inc> --remove-resolution <res>` (repeatable): detach
  named current members. Remaining members keep relative order
  and must stay ≥2. `recordedAt` / title unchanged.
- Resolution rows are not deleted. Detached ids are ungrouped and
  may later 062-append onto this or another Incident.
- Fail-closed: unknown `inc:` `INCIDENT_NOT_FOUND`; unknown `res:`
  `RESOLUTION_NOT_FOUND`; named id not on this Incident
  `INCIDENT_MEMBER_NOT_ON_INCIDENT`; remaining <2
  `INCIDENT_MEMBERS_REQUIRED`. Nothing removed on those paths.
  Do not delete the Incident.
- `--remove-resolution` without positional is usage. Mixing
  `--resolution` and `--remove-resolution` is usage. `--title` on
  remove is usage. `--investigation` / `--resource` on `incident`
  stay usage (leftover[0] frozen).
- Confirmation: `Removed from incident` (distinct from 058
  `Recorded incident` and 062 `Updated incident`). Show lists
  remaining member ids. `incidents` count decrements; `--resolution
  <removed>` is known-empty for that grouping.
- Store: `removeIncidentMembers` UPDATEs `resolution_ids` only.
  App: `removeIncidentResolutions`. Help: remove usage + example.
- MCP four tools, no writes. `incidentMemory` observes remaining
  members. No `incident_id` column.

## Deviations

None.

## Validation

```text
baseline:          5ee1996 docs(sprints): mark 064 complete
                   1050 pass / 78 files / 4790 expect()
bun test:          1062 pass across 78 files (4897 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-065-dogfood.* (never ./.combie)
                   three --resource resolutions → incident with 3
                   members → --remove-resolution res:c → show a, b
                   → resolution res:c still exists; no INCIDENT
                   heading → incidents --resolution res:c
                   known-empty → 062 re-append works → remove a+b+c
                   MEMBERS_REQUIRED; nothing removed →
                   --remove-resolution without positional usage →
                   mix --resolution/--remove-resolution usage →
                   incident --investigation still usage →
                   INCIDENT MEMORY remaining members → no
                   incident_id. Founder .combie/combie.db mtime/size
                   unchanged.
```

## Learnings

- Remove is the inverse of 062 append on the same `resolution_ids`
  array. A distinct flag keeps `--resolution` as create/append.
- Remaining ≥2 is the same 058 grouping invariant: detach is not
  Incident delete and not Resolution delete.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–065 complete.
Sprint 066 is not started. Grouping Investigation snapshots as
Incident members remains unearned. Retitle remains unearned.
