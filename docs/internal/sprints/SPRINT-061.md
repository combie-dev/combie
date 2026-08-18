# SPRINT-061 — Incident-Anchored Resolution Write

> **Status:** Complete
> **Depends on:** SPRINT-060 (complete)
> **Authorized by:** founder override, 2026-08-18 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> third Resolution write identity after Incident grouping, recall,
> and list retrieve exist. Replaces the AGENTS.md line that 060
> leftover is not a sequence and `resolution --incident` remains
> unearned. Does **not** authorize Recommendation, Learning,
> similarity, Investigation lifecycle, MCP writes, inferred Action,
> add-members mutation of existing `res:` ids, or
> `incidents --investigation`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **resource-specific experience as an explicit write identity hung
> on an existing Incident**, not a second Resolution type, not
> `incident_id` on `resolutions`, not inferred Action, not snapshot
> rewrite, not MCP writes
> **Type:** Narrow optional write-anchor on the existing Resolution
> row, with membership completed on the existing Incident member
> array
> **Primary goal:** A human can record decision / action / outcome
> against an exact existing `inc:` id — same fields, same evidence
> rules, same append-only Resolution row — so the new `res:` is a
> member of that Incident, without inferring Action from provider
> activity, without adding `incident_id` to `resolutions`, without
> adding existing `res:` ids after the fact, and without thawing
> MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. The new row appears on existing
> `resolutionMemory` / `incidentMemory` via 056/059 membership.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 051–060 shipped two Resolution write identities, Incident
grouping, investigate-path recall, and list retrieve:

```text
resolution --investigation <inv>
resolution --resource <resource-id>
incident --resolution res:a --resolution res:b
incidents [--resolution|--resource]
INCIDENT MEMORY / incidentMemory
```

A later response about an occurrence that already has an `inc:`
still cannot hang on that Incident. The human must record with
`--investigation` or `--resource` (ungrouped) and has no authorized
way to name the existing grouping at write time.

Sprint 060 leftover:

```text
061+      Incident-anchored Resolution write (`resolution
            --incident`) only if earned
          add members after record only if earned
          incidents --investigation retrieve only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
060 did not earn this slice. AGENTS.md recorded that. 058 and 060
froze `resolution --incident` as a third write identity. This Sprint
takes it only under the founder override below.

It is **not** add-members-after-record. That leftover is: attach
**existing** `res:` ids to an already-recorded Incident
(`incident --resolution` against an `inc:` that already exists).
This Sprint creates a **new** Resolution already in that grouping.

It is **not** `incident_id` on `resolutions`. 058 / 060: membership
is the stored `resolution_ids` array. A second column would be a
second source of truth (Sequencing Rule 8). If implementation is
tempted to add `incident_id`: **STOP.**

It is **not** copying `subjectResourceId` onto the Incident row.
058: an Incident has no single subject. Cross-resource grouping is
the claim.

It is **not** MCP writes, a fifth tool, lifecycle, or inferred
members.

---

# Founder Override

`AGENTS.md` after Sprint 060 recorded that the 060 leftover is not a
sequence and `resolution --incident` remains unearned. Sequencing
Rule 2 still holds: `resolution --investigation` / `--resource`
already record a response; `incident --resolution` already groups
existing ids.

On 2026-08-18 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  resource-specific experience and organizational precedent. Grouping
  and retrieve are shipped; write hung on the grouping is not.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  the 057-shaped third write identity now that an Incident row and
  membership retrieve exist, rather than waiting for a ledger of
  “I recorded a third response and it sat ungrouped.”
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision rule,
  and it does not authorize Recommendation, Learning, similarity,
  Investigation lifecycle, MCP writes, inferred Action, add-members
  of existing `res:` ids, or `incidents --investigation`.
- Same pattern as Sprint 056 → 057 and 059 → 060: the original
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
group existing responses as one occurrence         ← 058
    ↓
recall / retrieve that grouping                    ← 059–060
    ↓
persist a further response hung on that grouping   ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: persistence **is** necessary for the new
Resolution row (051 table). Persistence of membership stays the
058 `resolution_ids` array: **append only the newly inserted
`res:` id** in the same record transaction. Do not add
`incident_id` to `resolutions`. Do not copy a subject onto the
Incident.

Sequencing Rule 8: membership has one source of truth — the 058
array. A Resolution recorded with `--incident` that is absent from
that array would be invisible to `incidents --resolution`,
`incident <id>` show, and INCIDENT MEMORY.

---

# Problem

After `incident --resolution res:a --resolution res:b`, a later
response about that occurrence has only the 051/057 anchors:

```text
resolution --investigation inv:…
resolution --resource <id>
```

Neither names the `inc:`. The new row is ungrouped. 060 can
retrieve the original grouping by `res:a`; it cannot make `res:c`
a member.

The missing claim is the 057 shape for Incident:

```text
The human named this existing Incident as the write identity.
The new Resolution is a member of that grouping.
```

That is explicit, not inferred. It is **not** “Combie noticed a
Resolution on the same subject and appended it.”

---

# Product Question

> After an explicit Incident exists, can a human record decision /
> action / outcome with `resolution --incident <id>` as a third XOR
> write identity — copying `subjectResourceId` only when every
> current member shares one subject, omitting `investigationId`,
> appending the new `res:` to that Incident’s stored member array
> in the same transaction, validating 054 evidence against that
> subject’s live compose — without `incident_id` on `resolutions`,
> without adding existing `res:` ids, without a fifth tool, without
> MCP writes, and without inferred Action?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names resource-specific
   experience. 057 shipped Resource as a write identity. Incident
   is the occurrence the human already named; hang the next
   response on it.
2. **Founder override 2026-08-18** replaces the unearned gate. 060
   leftover listed this first only *if earned*; the override is the
   earning act, not leftover order.
3. **Existing primitive check:** `--investigation` / `--resource`
   still work. `incident --resolution` still groups **existing**
   ids at Incident record time. This Sprint is a new Resolution
   already in an existing grouping. Do not replace 058 record.
4. **Sequencing Rule 8 / 9:** new Resolution row required;
   membership append on the 058 array required so retrieve stays
   true; no `incident_id` column.
5. **MCP** stays four read-only tools. No writes. Existing 056/059
   fields pick up the new row via subject / membership.

Rejected as 061 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Add existing `res:` ids to an Incident after record | Leftover[1]; different command |
| `incident_id` on `resolutions` | Second source of truth vs `resolution_ids` |
| Copy `subjectResourceId` onto the Incident | 058: no single subject |
| `--incident` plus `--resource` as two identities | 057 XOR; subject copy is the 051 parallel |
| Pick subject from the first member when subjects differ | Invents a subject for a cross-resource grouping |
| `incidents --investigation` list retrieve | Not leftover[0] |
| Fifth tool / MCP writes | Frozen |
| Investigation / Incident lifecycle | Status is still a process claim |
| INCIDENT heading on `resolution <id>` show | 058: a Resolution is not an Incident |
| Similarity / inferred members | Forbidden |

---

# Exact Capability

```text
combie resolution --incident <inc-id>
        --decision/--action/--outcome
        [--evidence <id>]
        ↓
Incident must exist
every current member Resolution that still loads
  shares one subjectResourceId
that Resource must exist (057)
at least one of decision / action / outcome (051)
optional --evidence validated against that subject's
  live compose (054/057)
        ↓
insert Resolution
  investigationId omitted (SQL NULL)
  subjectResourceId = that shared subject
        ↓
append the new res: id to incidents.resolution_ids
  (same transaction; no other members added or removed)
        ↓
confirmation names the new res: and the inc:
```

XOR write identities (Phase 1 pins the error code; expected
`RESOLUTION_ANCHOR_CONFLICT` / `RESOLUTION_ANCHOR_REQUIRED`
widened to three):

```text
exactly one of:
  --investigation <inv>
  --resource <resource-id>
  --incident <inc-id>
```

`--incident` on `resolution` (record) is this Sprint. `--resolution`
on `incident` (record) remains 058 grouping of existing ids.
Different commands.

Subject derivation (read-time over current members; not stored on
the Incident):

- Load each stored member id. Skip missing Resolution rows (059
  skip rule) for the homogeneity check.
- If zero members still load: fail. Do not invent a subject.
  Expected: `INCIDENT_MEMBERS_UNRESOLVED` (Phase 1 pins the code).
- If loaded members’ `subjectResourceId` values are not all equal:
  fail. Do not pick first-seen. Expected:
  `INCIDENT_SUBJECT_AMBIGUOUS`. Next step: record with `--resource`
  / `--investigation` (ungrouped). Add-members leftover is how a
  later sprint may attach that row to a cross-resource Incident.
- If they are equal: that string is the subject. Resource must
  exist at record time (`RESOURCE_NOT_FOUND` if deleted — 057).

Unknown `inc:`: `INCIDENT_NOT_FOUND` (show-style), nothing inserted.

`--incident` blank / boolean flag: usage, exit 1. One exact id.
Repeatable `--incident` is usage.

`--incident` together with `--investigation` or `--resource`:
anchor conflict, nothing inserted.

051/057 paths unchanged when `--incident` is absent.

Membership append:

- UPDATE that Incident’s `resolution_ids` JSON to append the new
  id (first-seen unique; it cannot already be present).
- Do not change `recordedAt` or `title` of the Incident.
- Do not add `incident_id` to the Resolution row.
- Exclusive membership remains: the new id belongs to this
  Incident only.

Show / list / recall (no new sections required):

- `resolution <id>` show: 057-shaped (no INVESTIGATION line). 058
  freeze: no `INCIDENT` heading on Resolution show. Confirmation
  **may** name `incident <inc>` (write identity), like 051 names
  the investigation. Phase 1 pins confirmation copy. Expected:
  **yes, name the `inc:` on confirmation; omit INCIDENT heading on
  show.**
- `resolutions --resource` includes the row (copied subject).
- Live `investigate` RESOLUTION MEMORY includes the row; INCIDENT
  MEMORY lists the Incident with the new member id.
- `investigation <id>` reopen does **not** include the row
  (no `investigationId` — 057).
- `incidents --resolution <new-res>` lists that Incident (060).
- `incident <inc>` show lists the appended id. Member **count**
  on `incidents` increments.
- MCP `resolutionMemory` / `incidentMemory` follow 056/059. No
  payload schema change. No writes. Four tools.

`--compare` / `snapshot_json` / `InvestigationContext`: unchanged.

---

# Evidence / Claim Semantics

### KNOWN (about the new row)

```text
The human recorded this organizational response hung on this
exact existing Incident. Combie copied the subject from the
members that still load, because they all share it. The new
res: id is a member of that grouping.
```

### UNKNOWN / stale (required)

Copied subject is not proof the Incident “is” that Resource.
Cross-resource Incidents cannot use this write identity in this
Sprint.

The row is retained organizational response, not current provider
truth, not a recommendation.

### Forbidden

```text
You should rollback
This Resource is now an Incident
resolved: true
Combie appended this because it shares a subject
incident_id on the Resolution row
INCIDENT heading on resolution show
```

---

# Architecture

```text
incidents.resolution_ids (058)        append new res: only
resolutions table (051/057)           insert; investigation_id NULL
        ↓
recordResolution({ incidentId })      this Sprint
        ↓
057/059/060 read paths                unchanged filters
```

Ownership:

- **Domain / Store:** no `incident_id` column. Phase 1 may add
  `appendIncidentMember(incidentId, resolutionId)` (expected:
  **yes**, small). Do not denormalize subject onto Incident.
- **App:** third XOR branch in `recordResolution`. Subject
  homogeneity over loaded members. 054 evidence against that
  subject. Same transaction: insert Resolution, then append
  member.
- **CLI:** `--incident` on `resolution` record. Widen XOR usage.
  Help third usage / example.
- **MCP / Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to UPDATE `resolutions` with
`incident_id`, to append **existing** `res:` ids, to pick a subject
when members disagree, or to thaw MCP writes: **STOP.**

---

# Persistence vs Read-Time

| Snapshot | New Resolution | Incident membership |
| --- | --- | --- |
| Frozen InvestigationContext | 051 insert | 058 array append (new id only) |
| Unchanged JSON | `investigation_id` NULL | `recorded_at` / `title` unchanged |

Must **not**:

- add `incident_id` on `resolutions`
- rewrite snapshot JSON
- create Relationships or Changes
- refresh providers
- add MCP tools or writes
- mutate an Incident except appending the new member id

---

# Boundedness

- One new write flag on existing `resolution` record.
- XOR with `--investigation` / `--resource`.
- Homogeneous-subject Incidents only. Cross-resource write stays
  unearned (use 057, then leftover[1] if earned).
- No `incidents --investigation`. No add-existing-members.
- No change to compare, snapshot schema, or MCP tools.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- Unknown `inc:`: `INCIDENT_NOT_FOUND`, nothing inserted.
- Blank `--incident`: usage, exit 1.
- Repeatable `--incident`: usage, exit 1.
- `--incident` + `--investigation` / `--resource`:
  `RESOLUTION_ANCHOR_CONFLICT`, nothing inserted.
- No write identity: `RESOLUTION_ANCHOR_REQUIRED` (three usages).
- No decision/action/outcome: `RESOLUTION_FIELDS_REQUIRED`.
- Zero loadable members: `INCIDENT_MEMBERS_UNRESOLVED` (Phase 1
  pins code/copy), nothing inserted.
- Members disagree on subject: `INCIDENT_SUBJECT_AMBIGUOUS`,
  nothing inserted.
- Copied subject Resource missing: `RESOURCE_NOT_FOUND` (057).
- Unknown `--evidence`: `EVIDENCE_ID_NOT_FOUND` (054), nothing
  inserted (Incident member array unchanged).
- Pre-058 missing `incidents` table: `INCIDENT_NOT_FOUND` / empty
  get — do not create the Incident.

---

# Affected Surfaces

### CLI

- `resolution --incident <id>` record
- confirmation names `inc:`
- `resolution <id>` show: no INCIDENT heading (058)
- `incident <id>` show / `incidents` count: new member
- help: third write usage + example
- 051/057 record unchanged when `--incident` absent
- `incidents --investigation` still usage (060)

### MCP

Four tools. No writes. No new fields. 056/059 filters observe the
new row. `docs/public/MCP.md` unchanged unless Phase 1 finds a lie
(expected: **no**).

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-057 XOR, SPRINT-058 membership / no
`incident_id`, SPRINT-059/060 retrieve, and inspect:

- `recordResolution` XOR and `RESOLUTION_ANCHOR_*`
- `insertIncident` / `resolution_ids` JSON
- `flags.incident` (expected: unused; add as one exact id, not
  repeatable on record)
- 058 resolution show freeze (`not.toMatch(/INCIDENT/)`)
- 057 confirmation omits investigation
- MCP four-tool freeze

Report:

1. Flag: `--incident` on `resolution` record, one exact id?
   Expected: **yes.**
2. XOR three write identities? Expected: **yes.**
3. `incident_id` column? Expected: **no.**
4. Membership: append new `res:` to `resolution_ids` in the same
   transaction? Expected: **yes.**
5. Subject: copy iff all loaded members share one
   `subjectResourceId`; else `INCIDENT_SUBJECT_AMBIGUOUS`?
   Expected: **yes.** Do not pick first member.
6. Zero loadable members fail (no invented subject)? Expected:
   **yes.**
7. `investigationId` omitted? Expected: **yes.**
8. Resource must exist at record time? Expected: **yes** (057).
9. Confirmation names `inc:`; show has no INCIDENT heading?
   Expected: **yes.**
10. Add existing members, MCP writes, fifth tool, lifecycle?
    Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **Yes** — new Resolution row. Membership
   append on existing Incident row (new id only).
2. Second source of truth? **No** if membership stays the 058
   array and there is no `incident_id` column.
3. Does copying a homogeneous subject leak “this Resource is an
   Incident”? **No** if the Incident row still has no subject and
   confirmation/show stay Resolution vs grouping.
4. Does appending the new member leak leftover[1]? **No** if
   existing `res:` ids cannot be passed and `incident --resolution`
   against an existing `inc:` remains 058-create-only.
5. MCP tool / write needed? Expected: **no.**
6. Compare / snapshot change? Expected: **no.**
7. `incident_id` / denormalized Incident subject? Expected: **no.**
8. Lifecycle? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + CLI
   help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

If implementation is tempted to add `incident_id`, to UPDATE
`resolution_ids` with existing ids, to pick a subject when members
disagree, to thaw MCP writes, or to add a fifth tool: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- 051 `--investigation` and 057 `--resource` unchanged when
  `--incident` absent
- XOR: `--incident` + `--resource` / `--investigation` fails,
  nothing inserted
- `--incident` records a row: `investigationId` omitted, subject
  equals the shared member subject, Incident member array appends
  the new id only, `recordedAt` / title of Incident unchanged
- confirmation contains `inc:`; `resolution <id>` show has no
  INCIDENT heading
- live `investigate` RESOLUTION MEMORY includes the row; INCIDENT
  MEMORY member ids include the new `res:`
- `investigation` reopen excludes the row
- `incidents --resolution <new>` lists that Incident; list count
  increments
- unknown `inc:` is `INCIDENT_NOT_FOUND`, no Resolution insert
- members on subjects A and B: `INCIDENT_SUBJECT_AMBIGUOUS`, no
  insert, member array unchanged
- all members’ Resolution rows deleted: unresolved, no insert
- copied subject Resource deleted: `RESOURCE_NOT_FOUND`, no insert
- `--evidence` still 054/057 against the copied subject
- exclusive membership: new id is not on another Incident
- 058 `incident --resolution` still cannot retarget an existing
  Incident (leftover[1] still usage / membership conflict as today)
- `--compare` / snapshot JSON / MCP four tools / no writes
- no `incidentId` on Resolution records
- help lists the third write example

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
# 058 grouping of two same-subject responses
resolution --resource <id> --decision "Rollback"
resolution --resource <id> --decision "Hold deploys"
incident --resolution <res-a> --resolution <res-b> --title "…"

# this Sprint
resolution --incident <inc> --decision "Keep holding"
resolution <res-c>                 # no INCIDENT heading
incident <inc>                     # three member ids
incidents --resolution <res-c>     # that grouping
investigate <id>                   # RESOLUTION MEMORY + INCIDENT MEMORY

# bounds
resolution --incident <inc> --resource <id> --decision "…"   # XOR fail
# cross-resource Incident: --incident fails SUBJECT_AMBIGUOUS
incident --resolution <res-c> --resolution <res-d>           # 058 create, not add-to-existing
```

---

# Explicit Non-Goals

Do **not** implement:

- add existing `res:` ids to an Incident after record
- `incident_id` on Resolution rows
- denormalized subject on Incident
- picking a subject when members disagree
- `incidents --investigation` list retrieve
- MCP writes or a fifth tool
- snapshot MCP
- Investigation or Incident lifecycle / `resolved: true`
- Incident section on `--compare`
- putting Incidents on `InvestigationContext` or `snapshot_json`
- INCIDENT heading on `resolution <id>` show
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
060       incidents --resolution / --resource list retrieve        ✅
061       Incident-anchored Resolution write (`resolution
            --incident`)                                           ✅
062+      add existing members after Incident record only if
            earned
          incidents --investigation retrieve only if earned
          group Investigations directly only if earned
          Incident-anchored write for cross-resource Incidents
            only if earned
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
- 051 `--investigation` / 057 `--resource` unchanged when
  `--incident` absent
- 058 `incident` record still groups **existing** ids at create
  (no add-to-existing)
- 059 INCIDENT MEMORY / 060 list retrieve unchanged except they
  observe the new member
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None required for a new column. `resolutions.investigation_id`
already nullable (057). Membership append uses the existing
`resolution_ids` JSON.

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

- [x] Sprint 061 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `resolution --incident` XOR write; homogeneous
      subject copy; new `res:` appended to that Incident only; no
      `incident_id` column; show has no INCIDENT heading
- [x] if earned: no add-existing-members; no lifecycle; no MCP
      writes; 051/057 unchanged when `--incident` absent;
      cross-resource Incidents fail without inventing a subject
- [x] if not earned: rejection documented; do not infer a member
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 058 remembered that the human named several responses as
> one occurrence. Sprint 061 may hang a further response on that
> exact Incident when every current member shares a subject. Combie
> must not invent the subject, must not store a second membership
> column, must not treat a Resource as an Incident, and must not
> quietly add existing resolutions to a grouping.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

Working-tree pins (expected answers):

1. `--incident` on `resolution` record, one exact id — **yes.**
2. XOR three write identities — **yes.**
3. `incident_id` column — **no.**
4. Append new `res:` to `resolution_ids` in the same transaction —
   **yes** (`insertResolutionForIncident`).
5. Copy subject iff every loaded member shares one
   `subjectResourceId`; else `INCIDENT_SUBJECT_AMBIGUOUS` — **yes.**
   Do not pick first member.
6. Zero loadable members fail `INCIDENT_MEMBERS_UNRESOLVED` — **yes.**
7. `investigationId` omitted — **yes.**
8. Resource must exist at record time — **yes.**
9. Confirmation names `inc:`; show has no INCIDENT heading — **yes.**
10. Add existing members, MCP writes, fifth tool, lifecycle — **no.**

## Phase 2 — Architecture Pressure

1. Persistence necessary? **Yes** — new Resolution row; membership
   append of that new id only.
2. Second source of truth? **No** — membership stays the 058 array.
3. Homogeneous subject leak “this Resource is an Incident”? **No.**
4. Append leak leftover[1]? **No** — only the newly inserted id;
   `incident --resolution` remains 058-create-only.
5. MCP tool / write needed? **No.**
6. Compare / snapshot change? **No.**
7. `incident_id` / denormalized Incident subject? **No.**
8. Lifecycle? **No.**
9. Canon change? AGENTS.md operational baseline + CLI help. Not
   VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

No STOP conflict.

## Implemented

- `resolution --incident <inc-id>`: third XOR write identity with
  `--investigation` / `--resource`. Incident must exist
  (`INCIDENT_NOT_FOUND`). Subject is copied only when every
  currently loadable member shares one `subjectResourceId`
  (059 skip for missing rows). Zero loadable members:
  `INCIDENT_MEMBERS_UNRESOLVED`. Mixed subjects:
  `INCIDENT_SUBJECT_AMBIGUOUS` (do not pick first). Copied Resource
  must exist (`RESOURCE_NOT_FOUND`).
- Insert Resolution with `investigationId` omitted (SQL NULL). Same
  051 fields and 054 evidence rules against that subject's live
  compose.
- Same transaction: `insertResolutionForIncident` inserts the row
  then appends the new `res:` to that Incident's `resolution_ids`.
  Incident `recordedAt` / `title` unchanged. No `incident_id`
  column. Exclusive membership unchanged.
- Confirmation names `incident <inc>`. `resolution <id>` show stays
  057-shaped (no INCIDENT heading, no INVESTIGATION line).
- CLI: `--incident` one exact id; blank / repeatable usage exit 1;
  XOR usage lists three identities; help third usage + example.
- 056/059 `resolutionMemory` / `incidentMemory` observe the new
  row via existing filters. Four tools. No writes. No new MCP
  fields. `docs/public/MCP.md` unchanged.
- 051 `--investigation` and 057 `--resource` unchanged when
  `--incident` is absent. 058 `incident --resolution` still cannot
  add existing `res:` ids after record. `incidents --investigation`
  still usage.

## Deviations

- None material. `appendIncidentMember` throws if the Incident row
  is missing after the existence check so the insert cannot commit
  an ungrouped Resolution; that is transaction integrity, not a
  second membership source.

## Validation

```text
baseline:          f5571a1 docs(sprints): mark 060 complete
                   992 pass / 78 files / 4366 expect()
bun test:          1016 pass across 78 files (4531 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-061-dogfood.* (never ./.combie)
                   two same-subject --resource responses → incident
                   grouping → resolution --incident confirmation
                   names inc: and subject → show has no INCIDENT
                   heading → incident show three members →
                   incidents count 3 → incidents --resolution
                   <new> lists that grouping → live investigate
                   RESOLUTION MEMORY + INCIDENT MEMORY →
                   investigation reopen excludes the new row →
                   XOR --incident + --resource fail → unknown inc
                   INCIDENT_NOT_FOUND → leftover[1] membership
                   conflict → 051 --investigation still records →
                   cross-resource Incident SUBJECT_AMBIGUOUS →
                   incidents --investigation still usage →
                   --compare has no INCIDENT MEMORY → PRAGMA
                   resolutions has no incident_id
```

## Learnings

- Membership has one source of truth: the 058 `resolution_ids`
  array. A third write identity is a new Resolution already in
  that array, not `incident_id` on `resolutions`.
- Homogeneous-subject copy is read-time over members that still
  load. Cross-resource Incidents stay unearned for this write;
  the next step remains `--resource` / `--investigation`
  (ungrouped), then leftover[1] only if earned.
- Isolated dogfood must pass an explicit Store dir; omitting it
  writes to cwd `.combie`.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–061 complete
(shipped bullet + v0.7 paragraph + summary line). Sprint 062 is
not started. Leftover[1] add-existing-members remains unearned.
