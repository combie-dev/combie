# SPRINT-062 — Add Existing Members to an Incident

> **Status:** Complete
> **Depends on:** SPRINT-061 (complete)
> **Authorized by:** founder override, 2026-08-18 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> membership-append slice after Incident grouping, recall, list
> retrieve, and Incident-anchored Resolution write exist. Replaces
> the AGENTS.md line that 061 leftover is not a sequence and
> add-existing-members of already-recorded `res:` ids remains
> unearned. Does **not** authorize Recommendation, Learning,
> similarity, Investigation lifecycle, MCP writes, inferred Action,
> `incidents --investigation`, cross-resource `resolution --incident`,
> member removal, or `incident_id` on `resolutions`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **resource-specific experience as explicit membership of an
> already-recorded Resolution on an existing Incident**, not a new
> Incident, not a fourth Resolution write identity, not
> `incident_id` on `resolutions`, not inferred Action, not snapshot
> rewrite, not MCP writes
> **Type:** Narrow optional membership mutation on the existing
> Incident `resolution_ids` array (existing `res:` ids only)
> **Primary goal:** A human can attach one or more already-recorded
> ungrouped `res:` ids to an exact existing `inc:` — exclusive
> membership, first-seen unique, no new Resolution row — without
> inferring members from provider activity, without adding
> `incident_id` to `resolutions`, without creating a second
> grouping, and without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. Existing `incidentMemory` observes the
> appended member ids via 059 membership. `resolutionMemory`
> unchanged (the `res:` already existed).
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 058–061 shipped create-time grouping, recall, list retrieve,
and a third Resolution write identity that **creates** a new `res:`
already in that grouping:

```text
incident --resolution res:a --resolution res:b
resolution --incident <inc> --decision "…"
incidents [--resolution|--resource]
INCIDENT MEMORY / incidentMemory
```

An already-recorded ungrouped row still cannot join that `inc:`:

```text
resolution --resource <id> --decision "Scale up"   # res:d, ungrouped
incident --resolution res:c --resolution res:d     # 058 CREATE, or
                                                   # MEMBERSHIP_CONFLICT
                                                   # if res:c is already grouped
```

Sprint 061 leftover:

```text
062+      add existing members after Incident record only if
            earned
          incidents --investigation retrieve only if earned
          group Investigations directly only if earned
          Incident-anchored write for cross-resource Incidents
            only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
061 did not earn this slice. AGENTS.md recorded that. 058 and 061
froze `incident --resolution` as create-only. This Sprint takes
append-of-existing only under the founder override below.

It is **not** `resolution --incident`. That creates a **new**
Resolution already in the grouping. This Sprint names `res:` ids
that already exist.

It is **not** `incidents --investigation` list retrieve.

It is **not** cross-resource `resolution --incident`. 061
`INCIDENT_SUBJECT_AMBIGUOUS` stays. This Sprint is how a later
ungrouped 051/057 row can join a grouping whose members already
span subjects.

It is **not** `incident_id` on `resolutions`. Membership stays the
058 `resolution_ids` array. If implementation is tempted to add
`incident_id`: **STOP.**

It is **not** removing members, retitling, rewriting `recordedAt`,
MCP writes, a fifth tool, lifecycle, or inferred members.

---

# Founder Override

`AGENTS.md` after Sprint 061 recorded that the 061 leftover is not a
sequence and add-existing-members of already-recorded `res:` ids
remains unearned. Sequencing Rule 2 still holds: `incident --resolution`
already groups existing ids at **create**; `resolution --incident`
already records a **new** response into that grouping.

On 2026-08-18 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  resource-specific experience and organizational precedent. A
  grouping that cannot accept a later named response is incomplete
  experience: the human already recorded `res:d` and already named
  `inc:`.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  the 058-shaped membership append now that create, recall, retrieve,
  and Incident-anchored write exist, rather than waiting for a
  ledger of “I recorded `res:d` ungrouped and had to make a second
  Incident.”
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision rule,
  and it does not authorize Recommendation, Learning, similarity,
  Investigation lifecycle, MCP writes, inferred Action,
  `incidents --investigation`, cross-resource `resolution --incident`,
  member removal, or `incident_id`.
- Same pattern as Sprint 059 → 060 and 060 → 061: the original
  evidence rule remains on record; the founder override chooses the
  next vertical slice.

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
group existing responses as one occurrence         ← 058 create
    ↓
recall / retrieve that grouping                    ← 059–060
    ↓
persist a further response hung on that grouping   ← 061 new res:
    ↓
attach an already-recorded response to it          ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: persistence **is** necessary for membership.
The 058 `resolution_ids` array is the source of truth. Append the
named existing `res:` ids in one UPDATE. Do not add `incident_id`
to `resolutions`. Do not copy a subject onto the Incident.

Sequencing Rule 8: membership has one source of truth — the 058
array. A Resolution the human named onto an Incident that is
absent from that array would be invisible to `incidents
--resolution`, `incident <id>` show, and INCIDENT MEMORY.

Sequencing Rule 2: create-time grouping and Incident-anchored
**write** do not attach an already-recorded ungrouped row. This
Sprint is that missing mutate.

---

# Problem

After `incident --resolution res:a --resolution res:b`, a later
already-recorded response about that occurrence has only:

```text
resolution --incident <inc>     # creates res:c in the grouping
incident --resolution res:c --resolution res:d
                                # creates a second Incident, or
                                # MEMBERSHIP_CONFLICT if res:c is
                                # already grouped
```

Neither appends **existing** `res:d` to the Incident the human
already named.

The missing claim is the 058 shape after record:

```text
The human named these existing Resolution ids as additional
members of this exact existing Incident.
```

That is explicit, not inferred. It is **not** “Combie noticed an
ungrouped Resolution on the same subject and appended it.”

Today the CLI rejects the natural spelling:

```text
incident <inc-id> --resolution <res-id>
```

as usage (positional plus `--resolution` is create-only). This
Sprint uses that slot as append.

---

# Product Question

> After an explicit Incident exists, can a human attach one or more
> already-recorded ungrouped `res:` ids with `incident <inc-id>
> --resolution <res-id>` — exclusive membership, first-seen unique
> among current members plus the named ids, no new Resolution row,
> `recordedAt` / `title` unchanged — without `incident_id` on
> `resolutions`, without removing members, without a fifth tool,
> without MCP writes, and without inferred Action?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names resource-specific
   experience. 061 hangs a **new** response on an Incident. A
   response that already exists is the same experience with no
   second `res:`.
2. **Founder override 2026-08-18** replaces the unearned gate. 061
   leftover listed this first only *if earned*; the override is the
   earning act, not leftover order.
3. **Existing primitive check:** 058 create still groups **existing**
   ids into a **new** `inc:`. 061 still inserts a **new** `res:`.
   Neither appends. Do not replace 058 record.
4. **Sequencing Rule 8 / 9:** membership append on the 058 array
   required so retrieve stays true; no `incident_id` column.
5. **MCP** stays four read-only tools. No writes. Existing 059
   `incidentMemory` picks up the new member ids.

Rejected as 062 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| `incidents --investigation` list retrieve | Not leftover[0] |
| Cross-resource `resolution --incident` | 061 freeze; this Sprint is how an ungrouped row joins that grouping |
| `incident_id` on `resolutions` | Second source of truth vs `resolution_ids` |
| Remove / reorder members | Not leftover[0]; mutate-shrink is a different claim |
| Retitle or rewrite `recordedAt` | 061 freeze: append does not touch those fields |
| `--title` on append as a second mutate | Title stays create-time (058) |
| Pick members by subject / evidence / time | Inferred members; forbidden |
| Fifth tool / MCP writes | Frozen |
| Investigation / Incident lifecycle | Status is still a process claim |
| INCIDENT heading on `resolution <id>` show | 058 freeze |
| Similarity / inferred members | Forbidden |

---

# Exact Capability

```text
combie incident <inc-id> --resolution <res-id>
        [--resolution <res-id> …]
        ↓
Incident must exist
each named res: must exist (058)
after first-seen unique against current members,
  ≥1 id is new to this Incident
no named id belongs to a different Incident
        ↓
UPDATE that Incident's resolution_ids
  append the new ids in named first-seen order
  existing members keep their order
  recordedAt / title unchanged
        ↓
Resolution rows unchanged (no incidentId)
confirmation names the inc: and the appended ids
```

Command modes on `incident` (Phase 1 pins copy; expected this
split):

```text
incident --resolution res:a --resolution res:b [--title]
  → 058 CREATE (unchanged; ≥2 unique ids; new inc:)

incident <inc-id>
  → 058 SHOW (unchanged)

incident <inc-id> --resolution res:d [--resolution res:e …]
  → this Sprint APPEND (≥1 new ungrouped id)
```

`--resolution` on `incident` with a positional `inc:` is this
Sprint. `--resolution` without a positional remains 058 create.
`--incident` on `resolution` remains 061 write. Different
commands.

Append constraints:

- One exact Incident id (the positional). Unknown `inc:`:
  `INCIDENT_NOT_FOUND` (show-style), nothing appended.
- Repeatable `--resolution` (058 family). Blank / boolean
  `--resolution`: usage, exit 1.
- Each named id must exist: `RESOLUTION_NOT_FOUND`, nothing
  appended (058).
- First-seen unique: trim, drop blanks, collapse duplicates in
  the named list, skip ids already on **this** Incident.
- After that collapse, at least one **new** id is required.
  Expected: `INCIDENT_MEMBERS_UNCHANGED` (Phase 1 pins the code)
  when the named set adds nothing. Nothing appended.
- Exclusive membership: a named id already on **another**
  Incident is `INCIDENT_MEMBERSHIP_CONFLICT` (058), nothing
  appended. Do not steal.
- Create still requires ≥2 unique ids. Append requires ≥1 new
  id (the grouping already exists).
- `--title` with append: usage, exit 1. Title stays create-time.
  Do not retitle.
- `--investigation` / `--resource` on `incident` remain usage
  (058).
- 058 create unchanged when the positional is absent.
- 061 `resolution --incident` unchanged (still homogeneous-subject
  copy; still cannot add existing `res:` ids).

Membership append:

- UPDATE that Incident’s `resolution_ids` JSON to append only the
  new ids (named first-seen order).
- Do not change `recordedAt` or `title`.
- Do not add `incident_id` to any Resolution row.
- Do not remove or reorder existing members.
- Exclusive membership remains.

Show / list / recall (no new sections required):

- `incident <inc>` show lists the appended ids in stored order
  (058: ids, not bodies).
- `incidents` member **count** increments.
- `incidents --resolution <appended-res>` lists that Incident
  (060).
- Live `investigate` INCIDENT MEMORY member ids include the
  appended `res:` (059). RESOLUTION MEMORY already listed that
  row if it was in subject scope.
- MCP `incidentMemory` follows 059 (member id array grows). No
  payload schema change. No writes. Four tools.
- `resolution <id>` show still has no INCIDENT heading (058).

`--compare` / `snapshot_json` / `InvestigationContext`: unchanged.

Cross-resource: **allowed** on append (058 create already allows
mixed subjects). That is why this Sprint is not
`resolution --incident` for mixed groupings.

---

# Evidence / Claim Semantics

### KNOWN (about the grouping)

```text
The human named these existing Resolution ids as additional
members of this exact existing Incident. Combie appended only
those ids. It did not infer them from subject, evidence, or time.
```

### UNKNOWN / stale (required)

Appending a Resolution does not prove the Incident “is” that
Resource. Cross-resource grouping remains the 058 claim.

The Incident is retained organizational grouping, not current
provider truth, not a recommendation.

### Forbidden

```text
You should add this resolution
Combie appended this because it shares a subject
incident_id on the Resolution row
removed members
INCIDENT heading on resolution show
```

---

# Architecture

```text
incidents.resolution_ids (058)        append named existing res: ids
resolutions table (051/057/061)       unchanged
        ↓
appendIncidentMembers(incidentId, ids)   this Sprint
        ↓
058 create / 061 write / 059–060 reads   unchanged filters
```

Ownership:

- **Domain / Store:** no `incident_id` column. Reuse or widen 061
  `appendIncidentMember` to append N existing ids in one UPDATE
  (expected: **yes**, small). Do not denormalize subject onto
  Incident. Do not add `updateIncident` as a general mutate.
- **App:** `appendIncidentResolutions` (name is Phase 1) distinct
  from `recordIncident` (create). Exclusive membership over
  **other** Incidents; skip already-on-this. Same 058 existence
  checks.
- **CLI:** positional `inc:` plus `--resolution` is append, not
  usage. Help: append usage + example. 058 create / show
  unchanged when that combination is absent.
- **MCP / Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to UPDATE `resolutions` with
`incident_id`, to remove members, to infer ids from a subject, to
thaw MCP writes, or to add a fifth tool: **STOP.**

---

# Persistence vs Read-Time

| Snapshot | Resolution rows | Incident membership |
| --- | --- | --- |
| Frozen InvestigationContext | Unchanged | 058 array append (named existing ids only) |
| Unchanged JSON | no `incident_id` | `recorded_at` / `title` unchanged |

Must **not**:

- add `incident_id` on `resolutions`
- insert a new Resolution
- rewrite snapshot JSON
- create Relationships or Changes
- refresh providers
- add MCP tools or writes
- mutate an Incident except appending the named new member ids
- remove, reorder, or retitle

---

# Boundedness

- One existing `incident` command. No new verb.
- Append only when positional `inc:` **and** `--resolution` are
  present.
- Existing ungrouped `res:` ids only. No inferred members.
- No `incidents --investigation`. No cross-resource
  `resolution --incident`. No member removal.
- No change to compare, snapshot schema, or MCP tools.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- Unknown `inc:`: `INCIDENT_NOT_FOUND`, nothing appended.
- Blank positional / blank `--resolution`: usage, exit 1.
- `--title` with append: usage, exit 1.
- Named `--resolution` plus `--investigation` / `--resource`:
  existing 058 usage, nothing appended.
- Unknown `res:`: `RESOLUTION_NOT_FOUND` (058), nothing appended.
- Named id already on another Incident:
  `INCIDENT_MEMBERSHIP_CONFLICT` (058), nothing appended.
- Named set adds no new ids: `INCIDENT_MEMBERS_UNCHANGED`
  (Phase 1 pins code/copy), nothing appended.
- Pre-058 missing `incidents` table: `INCIDENT_NOT_FOUND` — do
  not create the Incident.
- 058 create (no positional) still requires ≥2 unique ids.

---

# Affected Surfaces

### CLI

- `incident <inc-id> --resolution <res-id>` append
- confirmation distinct from 058 create; names `inc:` and the
  appended ids
- `incident <id>` show: member ids include the new ones
- `incidents` count increments
- help: append usage + example
- 058 create / show unchanged when positional+`--resolution`
  is absent
- 061 `resolution --incident` unchanged
- `incidents --investigation` still usage (060)

### MCP

Four tools. No writes. No new fields. 059 `incidentMemory`
observes the new member ids. `docs/public/MCP.md` unchanged
unless Phase 1 finds a lie (expected: **no**).

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-058 create / exclusive membership / no
`incident_id`, SPRINT-061 `appendIncidentMember` / leftover[1]
freeze, SPRINT-059/060 retrieve, and inspect:

- `recordIncident` create-only (no positional target)
- CLI `incident`: positional plus `--resolution` currently usage
- `appendIncidentMember` (061; one new id; Incident must exist)
- 058 `INCIDENT_MEMBERSHIP_CONFLICT`
- MCP four-tool freeze

Report:

1. CLI: `incident <inc-id> --resolution <res-id>` append, one
   exact Incident positional, repeatable `--resolution`?
   Expected: **yes.**
2. 058 create unchanged when positional absent? Expected:
   **yes** (≥2 unique ids, new `inc:`).
3. `incident_id` column? Expected: **no.**
4. Membership: append named existing `res:` ids to
   `resolution_ids` in one UPDATE? Expected: **yes.**
5. Exclusive membership vs other Incidents? Expected: **yes**
   (`INCIDENT_MEMBERSHIP_CONFLICT`). Already-on-this skipped.
6. Zero new ids fail (no silent no-op)? Expected: **yes.**
7. Resolution rows unchanged? Expected: **yes.**
8. `recordedAt` / `title` unchanged; `--title` on append is
   usage? Expected: **yes.**
9. Confirmation names `inc:` and appended ids; show has no
   INCIDENT heading on `resolution <id>`? Expected: **yes.**
10. `incidents --investigation`, cross-resource
    `resolution --incident`, member removal, MCP writes, fifth
    tool, lifecycle? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **Yes** — membership append on the
   existing Incident row (named existing ids only). No new
   Resolution row.
2. Second source of truth? **No** if membership stays the 058
   array and there is no `incident_id` column.
3. Does append leak inferred members? **No** if only
   human-named `--resolution` ids are added.
4. Does append leak 061 write? **No** if no Resolution is
   inserted.
5. Does append leak leftover `incidents --investigation`?
   **No.**
6. MCP tool / write needed? Expected: **no.**
7. Compare / snapshot change? Expected: **no.**
8. `incident_id` / denormalized Incident subject / member
   removal / retitle? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + CLI
   help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

If implementation is tempted to add `incident_id`, to insert a
Resolution, to remove members, to infer ids, to thaw MCP writes,
or to add a fifth tool: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- 058 create unchanged when positional is absent (≥2 ids, new
  `inc:`, `--title` still create-time)
- `incident <inc> --resolution res:d` appends that id only;
  `recordedAt` / title unchanged; Resolution row unchanged
- confirmation distinct from create; names `inc:` and appended
  ids; `incident <id>` show lists them; `resolution <id>` show
  has no INCIDENT heading
- two `--resolution` ids append in named first-seen order
- already-on-this ids collapse; leftover new ids still append
- named set is only already-on-this: `INCIDENT_MEMBERS_UNCHANGED`,
  member array unchanged
- named id on another Incident: `INCIDENT_MEMBERSHIP_CONFLICT`,
  nothing appended
- unknown `inc:` is `INCIDENT_NOT_FOUND`; unknown `res:` is
  `RESOLUTION_NOT_FOUND`; nothing appended
- `--title` with append is usage
- cross-resource append is allowed (058 mixed members)
- 061 `resolution --incident` still homogeneous-only; still
  cannot add existing `res:` ids
- `incidents --resolution <appended>` lists that Incident;
  list count increments
- live `investigate` INCIDENT MEMORY member ids include the
  appended `res:`
- `--compare` / snapshot JSON / MCP four tools / no writes
- no `incidentId` on Resolution records
- help lists the append example
- `incidents --investigation` still usage

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
# 058 grouping
resolution --resource <id> --decision "Rollback"
resolution --resource <id> --decision "Hold deploys"
incident --resolution <res-a> --resolution <res-b> --title "…"

# ungrouped later response (same or other subject)
resolution --resource <id> --decision "Scale up"

# this Sprint
incident <inc> --resolution <res-d>
incident <inc>                         # three member ids
incidents --resolution <res-d>         # that grouping
investigate <id>                       # INCIDENT MEMORY includes res:d

# bounds
incident <inc> --resolution <res-d>              # UNCHANGED (already a member)
incident --resolution <res-c> --resolution <res-e>
                                                 # 058 CREATE, not append
resolution --incident <cross-inc> --decision "…" # still SUBJECT_AMBIGUOUS
incidents --investigation <inv>                  # still usage
```

---

# Explicit Non-Goals

Do **not** implement:

- `incidents --investigation` list retrieve
- cross-resource `resolution --incident`
- `incident_id` on Resolution rows
- denormalized subject on Incident
- removing, reordering, or retitling members
- MCP writes or a fifth tool
- snapshot MCP
- Investigation or Incident lifecycle / `resolved: true`
- Incident section on `--compare`
- putting Incidents on `InvestigationContext` or `snapshot_json`
- INCIDENT heading on `resolution <id>` show
- similarity, “you should”, Learning, Recommendation
- grouping Investigation snapshots as members
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
063+      incidents --investigation retrieve only if earned
          group Investigations directly only if earned
          Incident-anchored write for cross-resource Incidents
            only if earned
          member removal / retitle only if earned
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
  `incidentMemory` / `resolutionMemory` filters unchanged)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 058 `incident` **create** still groups existing ids into a **new**
  `inc:` when no positional is present
- 061 `resolution --incident` unchanged (homogeneous-subject copy;
  new `res:` only)
- 059 INCIDENT MEMORY / 060 list retrieve unchanged except they
  observe the new member
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None required. Membership append uses the existing
`resolution_ids` JSON. `appendIncidentMember` (061) already
UPDATEs that column for one id.

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

- [x] Sprint 062 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `incident <inc> --resolution` appends existing
      ungrouped `res:` ids; exclusive membership; no `incident_id`
      column; 058 create unchanged
- [x] if earned: no member removal; no lifecycle; no MCP writes;
      061 `resolution --incident` unchanged; `incidents
      --investigation` still usage
- [x] if not earned: rejection documented; do not infer a member
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 058 remembered that the human named several responses as
> one occurrence. Sprint 061 may hang a new response on that
> Incident. Sprint 062 may attach a response the human already
> recorded. Combie must not invent the member, must not store a
> second membership column, must not steal from another grouping,
> and must not quietly create a second Incident.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `9d1e09c` (authoring-only working tree). Pins:

1. CLI `incident <inc> --resolution` append — **yes** (was usage).
2. 058 create unchanged when positional absent — **yes.**
3. `incident_id` column — **no.**
4. Append named existing `res:` to `resolution_ids` in one UPDATE —
   **yes** (`appendIncidentMembers`).
5. Exclusive vs other Incidents; skip already-on-this — **yes.**
6. Zero new ids fail `INCIDENT_MEMBERS_UNCHANGED` — **yes.**
7. Resolution rows unchanged — **yes.**
8. `recordedAt` / `title` unchanged; `--title` on append is usage —
   **yes.**
9. Confirmation `Updated incident`; show has no INCIDENT heading —
   **yes.**
10. `incidents --investigation`, cross-resource
    `resolution --incident`, member removal, MCP writes, fifth tool,
    lifecycle — **no.**

## Phase 2 — Architecture Pressure

1. Persistence necessary? **Yes** — membership UPDATE only.
2. Second source of truth? **No.**
3. Inferred members? **No** — named `--resolution` ids only.
4. 061 write leak? **No** — no Resolution insert.
5. `incidents --investigation` leak? **No.**
6. MCP tool / write? **No.**
7. Compare / snapshot? **No.**
8. `incident_id` / removal / retitle? **No.**
9. Canon? AGENTS.md + CLI help only.

No STOP conflict.

## Implemented

- `incident <inc-id> --resolution <res-id>` (repeatable): append
  already-recorded ungrouped Resolution ids to that Incident.
  App: `appendIncidentResolutions`. Store: `appendIncidentMembers`
  (N ids, one UPDATE). 061 `appendIncidentMember` is a one-id
  wrapper.
- Exclusive membership vs other Incidents
  (`INCIDENT_MEMBERSHIP_CONFLICT`). Already-on-this skipped.
  Named set with no new ids: `INCIDENT_MEMBERS_UNCHANGED`.
- Confirmation `Updated incident` names the `inc:` and appended
  ids only (distinct from 058 `Recorded incident`).
- `--title` on append is usage. `recordedAt` / title unchanged.
- Cross-resource append allowed. 061 `resolution --incident`
  stays `INCIDENT_SUBJECT_AMBIGUOUS` on mixed subjects.
- 058 create (no positional, ≥2 ids) unchanged. Help: append
  usage + `incident inc:… --resolution res:…`.
- MCP four tools, no writes. `incidentMemory` observes new member
  ids. No `incident_id` column.

## Deviations

- None material.

## Validation

```text
baseline:          9d1e09c docs(sprints): mark 061 complete
                   1016 pass / 78 files / 4531 expect()
bun test:          1029 pass across 78 files (4626 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-062-dogfood.* (never ./.combie)
                   058 grouping → ungrouped --resource →
                   incident <inc> --resolution append
                   (Updated incident) → show three members →
                   resolution show no INCIDENT heading →
                   incidents count 3 → incidents --resolution
                   lists grouping → live INCIDENT MEMORY →
                   second append UNCHANGED → --title usage →
                   cross-resource append → resolution --incident
                   SUBJECT_AMBIGUOUS → 058 create membership
                   conflict → incidents --investigation usage →
                   --compare unchanged → no incident_id
```

## Learnings

- Append is a different command mode from 058 create, not a
  second Incident. The previously rejected positional +
  `--resolution` slot is the smallest spelling.
- Membership still has one source of truth: the 058 array.
  Widening 061's single-id append to N existing ids kept
  `insertResolutionForIncident` on the same path.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–062 complete.
Sprint 063 is not started. `incidents --investigation` and
cross-resource `resolution --incident` remain unearned.
