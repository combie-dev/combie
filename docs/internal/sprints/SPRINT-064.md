# SPRINT-064 — Incident-Anchored Write for Cross-Resource Incidents

> **Status:** Complete
> **Depends on:** SPRINT-063 (complete)
> **Authorized by:** founder override, 2026-08-18 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> remaining Incident-anchored write slice after homogeneous
> `resolution --incident` exists. Replaces the AGENTS.md line that
> 063 leftover is not a sequence and grouping Investigation
> snapshots as members remains unearned — leftover[0] stays
> **unearned** (Investigation ≠ Incident; members stay `res:`).
> This Sprint takes leftover[1]: cross-resource `--incident` write.
> Does **not** authorize Recommendation, Learning, similarity,
> Investigation lifecycle, MCP writes, inferred Action, grouping
> snapshots as members, member removal, or `incident_id`.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **resource-specific experience hung on an existing mixed-subject
> Incident**, not a second Resolution type, not `incident_id` on
> `resolutions`, not inferred Action, not snapshot rewrite, not
> MCP writes, not grouping `inv:` ids as members
> **Type:** Narrow subject disambiguator on the existing 061 write
> identity
> **Primary goal:** A human can record decision / action / outcome
> against an exact existing `inc:` whose loaded members span more
> than one subject — by naming `--resource` as the subject of the
> new row — without picking first-seen, without grouping
> Investigation snapshots as members, without adding `incident_id`,
> and without thawing MCP writes.
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

Sprints 058–063 shipped grouping, recall, list retrieve (including
by investigation), Incident-anchored write, and add-existing-members:

```text
incident --resolution res:a --resolution res:b
incident <inc> --resolution res:d
incidents [--resolution|--resource|--investigation]
resolution --incident <inc>          # homogeneous members only
INCIDENT MEMORY / incidentMemory
```

058 allows a grouping whose members sit on different subjects.
061 copies `subjectResourceId` only when every loadable member
shares one subject. Mixed groupings fail:

```text
Incident inc:… spans different subjects (…), so no single
subject can be copied.
Record with --resource or --investigation instead (ungrouped).
```

062 already lets the human record ungrouped with `--resource` and
append that `res:` onto the mixed `inc:`. The missing claim is the
061 one-command path for that same mixed grouping: hang a **new**
row on the Incident while naming which subject it is about.

Sprint 063 leftover:

```text
064+      group Investigations directly only if earned
          Incident-anchored write for cross-resource Incidents
            only if earned
          member removal / retitle only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
063 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. 063 forbade “This
Investigation is now an Incident.” Leftover[0] stays unearned.

This Sprint takes leftover[1] only under the founder override
below.

It is **not** grouping Investigation snapshots as members.
`--investigation` on `incident` create stays usage.

It is **not** picking the first member’s subject when they differ.
061 rejected that as inventing a subject. The human names
`--resource`.

It is **not** a fourth write identity. `--resource` with
`--incident` is a subject disambiguator on the existing 061
identity, not a second anchor. `--investigation` stays XOR with
`--incident`. `--resource` without `--incident` stays 057.

It is **not** `incident_id` on `resolutions`. Membership stays the
058 array.

It is **not** member removal, retitle, MCP writes, lifecycle, or
inferred members.

---

# Founder Override

`AGENTS.md` after Sprint 063 recorded that the 063 leftover is not
a sequence and grouping Investigation snapshots as members remains
unearned. Sequencing Rule 2 still holds: `resolution --resource`
plus `incident <inc> --resolution` already records a follow-up on
a mixed grouping in two commands. Grouping `inv:` ids as members
is not the next slice.

On 2026-08-18 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  resource-specific experience. Mixed Incidents already exist; the
  061 one-command write does not.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  the named-subject disambiguator on `--incident` now that 058
  mixed grouping and 061 homogeneous write exist, rather than
  waiting for a ledger of “I had to `--resource` then 062-append.”
- Leftover[0] (group snapshots as members) is **not** authorized.
  Investigation ≠ Incident. Members stay `res:`.
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision
  rule, and it does not authorize Recommendation, Learning,
  similarity, Investigation lifecycle, MCP writes, inferred Action,
  grouping snapshots as members, or member removal.
- Same pattern as Sprint 061 → 062 and 062 → 063: leftover order
  is not a sequence; the founder override chooses the next
  vertical slice. Here leftover[0] is skipped because it conflicts
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
recall that grouping on investigate                ← 059
    ↓
retrieve that grouping from the list               ← 060 / 063
    ↓
hang a new response on that grouping               ← 061 homogeneous
    ↓
hang a new response on a mixed grouping            ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: a new Resolution row is necessary (061).
Membership append stays the 058 array. Do not add `incident_id`.
Do not copy a subject onto the Incident row.

Sequencing Rule 8: membership has one source of truth — the 058
array. `--resource` here names the new row’s subject, not a second
grouping column.

Sequencing Rule 2: two-command 057+062 still works. This Sprint
does not replace it. Homogeneous `--incident` without `--resource`
stays 061.

Sequencing Rule 4: the new claim is “the human named this existing
mixed Incident and this existing member subject for a new
response,” not “Combie picked a subject” and not “these
Investigations are now an Incident.”

---

# Problem

After a cross-resource grouping:

```text
resolution --resource sentry:project:… --decision "Rollback"     # res:a
resolution --resource github:repository:… --decision "Hold"      # res:b
incident --resolution res:a --resolution res:b
```

`resolution --incident inc:… --decision "Keep holding"` still
fails `INCIDENT_SUBJECT_AMBIGUOUS`. The human can work around it:

```text
resolution --resource sentry:project:… --decision "Keep holding"
incident inc:… --resolution res:c
```

The missing claim is the 061 shape for mixed membership:

```text
The human named the existing mixed grouping and which of its
subjects this new response is about.
```

That is explicit. It is **not** first-seen subject. It is **not**
inferred from provider activity. It is **not** grouping `inv:`
snapshots as members.

---

# Product Question

> After explicit Incidents may group Resolutions on more than one
> subject, can Combie record a new decision / action / outcome
> against that exact `inc:` by naming `--resource` as the subject
> of the new row — 061 insert + append, named subject not
> first-seen, homogeneous `--incident` unchanged when `--resource`
> is absent — without grouping Investigation snapshots as members,
> without `incident_id`, without MCP writes, and without a fifth
> tool?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names resource-specific
   experience. 061 shipped hang-on-Incident for one subject. Mixed
   groupings already exist (058).
2. **Founder override 2026-08-18** replaces the unearned gate for
   leftover[1]. Leftover[0] stays frozen (Investigation ≠ Incident).
3. **Existing primitive check:** 057+062 still work. This Sprint
   is the 061 one-command path with a named subject. Do not
   replace 062 append. Do not replace 061 homogeneous copy.
4. **Sequencing Rule 8 / 9:** new Resolution row + 058 array
   append. No `incident_id`. No subject on the Incident row.
5. **MCP** stays four read-only tools. Existing 056/059 fields
   pick up the new row via subject / membership.

Rejected as 064 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | Leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Pick first-seen subject when members differ | 061 freeze; invents a subject |
| `--incident` + `--investigation` | XOR; 061 omits `investigationId` |
| `incident_id` on `resolutions` | Second source of truth |
| Copy `subjectResourceId` onto the Incident | 058: no single subject |
| Member removal / retitle | Different mutate |
| Fifth tool / MCP writes | Frozen |
| Investigation / Incident lifecycle | Status is still a process claim |
| Similarity / inferred members | Forbidden |

---

# Exact Capability

```text
combie resolution --incident <inc-id> --resource <resource-id>
        --decision/--action/--outcome
        [--evidence <id>]
        ↓
Incident must exist
named Resource must exist (057)
named Resource is a subjectResourceId of at least one
  loadable member (059 skip for missing rows)
at least one of decision / action / outcome (051)
optional --evidence validated against that named subject's
  live compose (054/057)
        ↓
insert Resolution
  investigationId omitted (SQL NULL)
  subjectResourceId = the named Resource
        ↓
append the new res: id to incidents.resolution_ids
  (same transaction; no other members added or removed)
        ↓
confirmation names the new res: and the inc:
  (061 confirmation; show has no INCIDENT heading)
```

Write identities after this Sprint (Phase 1 pins usage copy):

```text
exactly one of:
  --investigation <inv>
  --resource <resource-id>          # 057; no --incident
  --incident <inc-id>               # 061 homogeneous copy
  --incident <inc-id> --resource <resource-id>
                                    # this Sprint; named subject
```

`--investigation` still XOR with `--incident` and with `--resource`.
`--incident` without `--resource` stays 061 (homogeneous copy;
`INCIDENT_SUBJECT_AMBIGUOUS` when mixed; `INCIDENT_MEMBERS_UNRESOLVED`
when no member rows load).

`--resource` with `--incident` is **not** a second write identity.
It names the new row’s subject. It does not copy a subject onto
the Incident.

Subject rule (read-time over current members; not stored on the
Incident):

- Load each stored member id. Skip missing Resolution rows (059).
- The named `--resource` must equal `subjectResourceId` of at
  least one loaded member. If not: fail. Do not invent a new
  subject for the occurrence. Expected: Phase 1 pins the code
  (likely `INCIDENT_SUBJECT_NOT_MEMBER` / similar). Next step:
  record with `--resource` (ungrouped) and 062-append, or pick a
  subject that is already on a member.
- Named Resource must still exist (057 `RESOURCE_NOT_FOUND`).
- Homogeneous `--incident` **with** `--resource`: allowed when the
  named id is that shared subject; fail the same not-a-member
  error when it is not. Do not treat redundant `--resource` as
  usage.
- Do not pick first-seen when `--resource` is absent and members
  differ (061 `INCIDENT_SUBJECT_AMBIGUOUS` unchanged).

Blank / boolean `--resource` with `--incident`: usage, exit 1
(existing `--resource` missing-value). Repeatable `--resource` on
record: usage (one exact id). Repeatable `--incident` stays 061
usage.

054 evidence: validate against the named (or 061-copied) subject,
not against every member subject.

Unfiltered `incidents`, 060/063 list filters, 062 append, 058
create, and homogeneous `--incident` without `--resource` are
unchanged.

`incident <id>` show, live `investigate`, `investigation <id>`
reopen, `--compare`, and `investigate_resource` are unchanged
except they observe the new member via existing membership.

---

# Evidence / Claim Semantics

### KNOWN (about the new row)

```text
Combie recorded this organizational response against this exact
Incident. The human named the Incident and, for a mixed grouping,
the subject this row is about. Membership is the 058 array.
```

### UNKNOWN / stale (required)

The row is **retained organizational response**, not proof the
occurrence is still current, not a proven outage, and not current
provider authority.

### Forbidden

```text
You should rollback
These are similar incidents
This Investigation is now an Incident
resolved: true / this investigation is closed
Combie picked the Sentry project because it was listed first
```

---

# Architecture

```text
incidents.resolution_ids (058)                 unchanged shape
resolutions row (051)                          new insert
        ↓
recordResolution --incident + optional --resource
  homogeneous, no --resource: 061 copy
  with --resource: named member subject
        ↓
insertResolutionForIncident                    061, reuse
        ↓
CLI resolution --incident [--resource]
```

Ownership:

- **Domain / Store:** no new type. No `incident_id`. Do not
  denormalize subject onto the Incident row. Reuse 061
  `insertResolutionForIncident`.
- **App:** when `--incident` and `--resource` are both present,
  use the named Resource as `subjectResourceId` after the
  member-subject check. Homogeneous copy unchanged when
  `--resource` is absent. Known 061 errors unchanged for that
  path. New not-a-member error for this path.
- **CLI:** allow `--incident` together with `--resource`. Keep
  `--investigation` XOR with both. Help: mixed example.
- **MCP / Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to add `incident_id`, to store `inv:`
ids as members, to pick first-seen subject, to thaw MCP writes, or
to add a fifth tool: **STOP.**

---

# Persistence vs Read-Time

| Snapshot | New Resolution | Incident membership |
| --- | --- | --- |
| Frozen InvestigationContext | 051 insert | 058 array append (new id only) |
| Unchanged JSON | `investigation_id` NULL | `recorded_at` / `title` unchanged |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- rewrite snapshot JSON
- create Relationships or Changes
- refresh providers
- add MCP tools or writes
- mutate an Incident except appending the new member id
- copy a subject onto the Incident row

---

# Boundedness

- One existing `resolution` command. No new verb.
- `--incident` + `--resource` is the new combination. `--incident`
  alone stays 061.
- Named `--resource` must already be a member subject. No inferred
  subject. No first-seen.
- No grouping of Investigation snapshots as members.
- No `incidents` flag change. 063 retrieve unchanged.
- No change to compare, snapshot schema, or MCP tools.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- `--incident` without `--resource` on mixed members:
  `INCIDENT_SUBJECT_AMBIGUOUS` (061), nothing inserted.
- `--incident` + `--resource` whose id is not a loadable member
  subject: not-a-member error (Phase 1 pins), nothing inserted.
- Unknown `inc:`: `INCIDENT_NOT_FOUND` (061).
- Unknown / deleted Resource: `RESOURCE_NOT_FOUND` (057).
- `--incident` + `--investigation`: XOR usage, exit 1.
- Blank `--resource` / `--incident`: usage, exit 1.
- Repeatable `--incident` / `--resource` on record: usage, exit 1.
- Zero loadable members: `INCIDENT_MEMBERS_UNRESOLVED` (061).
- 054 unknown evidence id: fail the whole record.
- Homogeneous `--incident` without `--resource`: 061 unchanged.

---

# Affected Surfaces

### CLI

- `resolution --incident <inc> --resource <resource-id>` record
- 061 `--incident` without `--resource` unchanged
- 057 `--resource` without `--incident` unchanged
- XOR: `--investigation` still exclusive
- help: mixed example
- confirmation / `resolution <id>` show: 061 (names `inc:`; no
  INCIDENT heading)

### MCP

Four tools. No writes. No new fields. `docs/public/MCP.md`
unchanged unless Phase 1 finds a lie (expected: **no**).

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-061 XOR / homogeneous copy / `INCIDENT_SUBJECT_AMBIGUOUS`,
SPRINT-062 leftover freeze, SPRINT-063 leftover[0] (members stay
`res:`), and inspect:

- CLI `resolution` XOR (`anchorCount > 1`)
- `recordResolution` incident branch
- `insertResolutionForIncident`
- 061 CLI tests that expect SUBJECT_AMBIGUOUS
- MCP four-tool freeze

Report:

1. CLI: `resolution --incident --resource` records with named
   subject? Expected: **yes** (was XOR usage).
2. Named Resource must be a loadable member subject?
   Expected: **yes.**
3. Homogeneous `--incident` without `--resource` unchanged (061)?
   Expected: **yes.** Mixed without `--resource` still
   `INCIDENT_SUBJECT_AMBIGUOUS`?
   Expected: **yes.**
4. `--investigation` still XOR with `--incident` / `--resource`?
   Expected: **yes.**
5. No first-seen subject when members differ? Expected: **yes.**
6. `incident_id` / subject copied onto Incident? Expected: **no.**
7. Group `inv:` ids as members? Expected: **no.**
8. 062 append / 058 create unchanged? Expected: **yes.**
9. Confirmation names `inc:`; show has no INCIDENT heading?
   Expected: **yes** (061).
10. MCP writes, fifth tool, member removal, lifecycle?
    Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **Yes** — new Resolution row + 058
   append (061). No new column.
2. Second source of truth? **No** if membership stays the 058
   array and `--resource` only names the new row’s subject.
3. First-seen leak? **No** if mixed without `--resource` still
   `INCIDENT_SUBJECT_AMBIGUOUS`.
4. `--resource` leak a fourth write identity? **No** if it is a
   disambiguator on `--incident`, and `--resource` alone stays 057.
5. Grouping snapshots leak? **No** — leftover[0] stays frozen.
6. MCP tool / write needed? Expected: **no.**
7. Compare / snapshot change? Expected: **no.**
8. `incident_id` / denormalized Incident subject? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + CLI
   help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

If implementation is tempted to add `incident_id`, to store `inv:`
ids as members, to pick first-seen subject, or to thaw MCP writes:
**STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- `resolution --incident --resource` on a mixed grouping inserts
  and appends; subject is the named Resource
- named Resource that is not a loadable member subject fails;
  nothing inserted
- mixed `--incident` without `--resource` still
  `INCIDENT_SUBJECT_AMBIGUOUS`
- homogeneous `--incident` without `--resource` still 061
- homogeneous `--incident --resource` matching the shared subject
  succeeds; mismatch fails not-a-member
- `--incident` + `--investigation` still XOR usage
- 057 `--resource` without `--incident` unchanged
- unknown `inc:` / unknown Resource unchanged
- 054 evidence validated against the named subject
- confirmation names `inc:`; `resolution <id>` has no INCIDENT
  heading; `investigationId` omitted
- 062 append / 058 create / 063 `--investigation` list unchanged
- `--compare` / snapshot JSON / MCP four tools / no writes
- no `incident_id` column
- help lists the mixed example

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
resolution --resource <sentry> --decision "Rollback"
resolution --resource <github> --decision "Hold deploys"
incident --resolution <res-a> --resolution <res-b> --title "…"

# 061 freeze still holds without --resource
resolution --incident <inc> --decision "Keep holding"
  # INCIDENT_SUBJECT_AMBIGUOUS

# this Sprint
resolution --incident <inc> --resource <sentry> --decision "Keep holding"
resolution <new>                 # no INCIDENT heading
incident <inc>                   # three members
incidents --resolution <new>
investigate <sentry>             # INCIDENT MEMORY observes new res:

# bounds
resolution --incident <inc> --resource <unrelated>
  # not-a-member; nothing inserted
resolution --incident <inc> --investigation <inv> --decision "…"
  # XOR usage
incident --investigation <inv> --investigation <inv>
  # still usage (leftover[0] frozen)
```

---

# Explicit Non-Goals

Do **not** implement:

- grouping Investigation snapshots as Incident members
- first-seen subject when members differ
- `--incident` + `--investigation`
- member removal / retitle
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
064       Incident-anchored write for mixed-subject Incidents      ← this
065+      group Investigations directly only if earned
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
- 058 create / 062 append unchanged
- 059 INCIDENT MEMORY on reopen / `investigate_resource` unchanged
  except observing the new member
- 061 `--incident` without `--resource` unchanged (homogeneous
  copy; `INCIDENT_SUBJECT_AMBIGUOUS` when mixed)
- 063 `incidents --investigation` unchanged
- grouping `inv:` as Incident members frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None required. No new column. Membership stays `resolution_ids`.
Subject stays on the Resolution row.

If implementation is tempted to add `incident_id` on `resolutions`,
to store `inv:` ids as Incident members, or to pick first-seen
subject: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 064 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `resolution --incident --resource` records on a
      mixed grouping with the named member subject; 061
      homogeneous path unchanged; mixed without `--resource` still
      `INCIDENT_SUBJECT_AMBIGUOUS`
- [x] if earned: no first-seen subject; no `inv:` members; no
      `incident_id`; no MCP writes; 057 / 062 / 063 unchanged
- [x] if not earned: rejection documented; do not invent a subject
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 061 hung a new response on an Incident when every member
> shared one subject. Sprint 058 already allowed members on more
> than one subject. Sprint 064 may hang a new response on that
> mixed grouping only when the human names which subject the row
> is about. Combie must not pick a subject, must not treat an
> Investigation as an Incident, and must not store a second
> membership column.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `4688145` (authoring-only working tree). Pins:

1. CLI `--incident --resource` records with named subject — **yes**
   (was XOR usage). Lift only that pair.
2. Named Resource must be a loadable member subject — **yes.**
   Code: `INCIDENT_SUBJECT_NOT_MEMBER`.
3. Homogeneous `--incident` without `--resource` unchanged — **yes.**
   Mixed without `--resource` still `INCIDENT_SUBJECT_AMBIGUOUS` —
   **yes.**
4. `--investigation` still XOR with `--incident` / `--resource` —
   **yes.**
5. No first-seen subject when members differ — **yes.**
6. `incident_id` / subject copied onto Incident — **no.**
7. Group `inv:` ids as members — **no.**
8. 062 append / 058 create unchanged — **yes.**
9. Confirmation names `inc:`; show has no INCIDENT heading — **yes.**
10. MCP writes, fifth tool, member removal, lifecycle — **no.**

## Phase 2 — Architecture Pressure

1. Persistence necessary? **Yes** — 061 insert + 058 append. No
   new column.
2. Second source of truth? **No.**
3. First-seen leak? **No.**
4. Fourth write identity? **No** — `--resource` is a disambiguator.
5. Grouping snapshots leak? **No.**
6. MCP tool / write? **No.**
7. Compare / snapshot? **No.**
8. `incident_id` / denormalized subject? **No.**
9. Canon? AGENTS.md + CLI help only.

No STOP conflict.

## Implemented

- `resolution --incident <inc> --resource <resource-id>`: hang a
  new Resolution on a mixed-subject Incident. Named Resource must
  exist and be a `subjectResourceId` of a loadable member (059
  skip). `investigationId` omitted. 061
  `insertResolutionForIncident` reused.
- Mixed `--incident` without `--resource` still
  `INCIDENT_SUBJECT_AMBIGUOUS`. Homogeneous `--incident` without
  `--resource` still copies the shared subject.
- Homogeneous `--incident --resource` matching the shared subject
  succeeds; mismatch is `INCIDENT_SUBJECT_NOT_MEMBER`.
- `--investigation` stays XOR. Repeatable `--resource` on record
  is usage. Confirmation names the `inc:`; show has no INCIDENT
  heading.
- Help: `--resource` / `--incident` lines + mixed example.
- MCP four tools, no writes. No `incident_id` column. Leftover[0]
  grouping snapshots as members stays frozen.

## Deviations

- `INCIDENT_SUBJECT_AMBIGUOUS` copy gained a one-line pointer to
  `--incident --resource`. Error code and fail-closed behavior
  unchanged.

## Validation

```text
baseline:          4688145 docs(sprints): mark 063 complete
                   1040 pass / 78 files / 4725 expect()
bun test:          1050 pass across 78 files (4790 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-064-dogfood.* (never ./.combie)
                   mixed grouping → --incident without --resource
                   SUBJECT_AMBIGUOUS → --incident --resource records
                   → show no INCIDENT heading → incident three
                   members → incidents --resolution lists it →
                   investigate INCIDENT MEMORY → unrelated
                   SUBJECT_NOT_MEMBER → --investigation XOR →
                   incident --investigation usage → no incident_id
```

## Learnings

- `--resource` with `--incident` is a subject disambiguator, not a
  fourth write identity. XOR stays for `--investigation`.
- Member-subject membership (not Resource existence alone) keeps
  the occurrence from silently gaining a third subject.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–064 complete.
Sprint 065 is not started. Grouping Investigation snapshots as
Incident members remains unearned.

