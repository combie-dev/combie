# SPRINT-058 — Explicit Incident Grouping

> **Status:** Complete
> **Depends on:** SPRINT-057 (complete)
> **Authorized by:** founder override, 2026-08-17 — continue
> `docs/internal/ROADMAP.md` v0.7 Operational Memory at the smallest
> Incident slice after two Resolution write identities exist.
> Replaces the AGENTS.md line that 057 leftover is not a sequence
> and Incident grouping remains unearned, and the unmet dogfood for
> Scenario 8 question 4 (“the incident”). Does **not** authorize
> Recommendation, Learning, similarity, Investigation lifecycle,
> MCP writes, inferred Action, or Incident recall on investigate.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **Incident as an explicit grouping of existing Resolution records**,
> not lifecycle, not a third Resolution write identity, not inferred
> co-occurrence, not snapshot rewrite, not MCP writes
> **Type:** Narrow persistence primitive for a human-named occurrence
> that already elicited more than one retained response
> **Primary goal:** A human can group two or more existing `res:` ids
> as one Incident — append-only, exact ids, exclusive membership —
> without inferring the grouping from Resource / evidence / time,
> without open/closed status, and without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. No Incident field on `investigate_resource`.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 051–057 shipped the smallest honest Operational Memory loop
with two write identities:

```text
051  persist decision / action / outcome on a saved Investigation
052  show those rows on investigate / investigation reopen
053  show the retained field text on those same paths
054  optional human-attached evidence ids on that response
055  retrieve by that exact evidence id on the resolutions list
056  show those rows on investigate_resource
057  persist the same fields against an exact Resource (no --save)
```

A Resolution is still one response. Two responses about one
occurrence still sit as sibling rows:

```text
resolutions --resource vercel:project:prj_abc
  res:…  inv:…   vercel:project:prj_abc
  res:…  -       vercel:project:prj_abc
```

That is the 057 hang: Combie remembers each response and its subject.
It does not remember that the human says those responses belong to
**one occurrence**.

Sprint 057 leftover:

```text
058+      Incident grouping only if earned
          MCP read of snapshots / list_resolutions only if earned
          Investigation snapshot pointers on live investigate
            only if earned
          Investigation lifecycle only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
057 did not earn this slice. AGENTS.md recorded that. This Sprint
takes it only under the founder override below.

It is **not** Investigation lifecycle. Grouping responses is not
open / closed / `resolved: true`.

It is **not** `resolution --incident`. That would be a third write
identity (hang a new response on an Incident). This Sprint groups
rows that already exist.

It is **not** MCP writes. Founder override 2026-08-16 froze those;
the 057 override did not thaw them; this override does not either.

---

# Founder Override

`AGENTS.md` after Sprint 057 recorded that the 057 leftover is not a
sequence and Incident grouping remains unearned.
`docs/internal/beta/INVESTIGATION-DOGFOOD.md` Scenario 8 is still
empty. Sequencing Rule 2 still holds: `resolutions --resource` and
RESOLUTION MEMORY already list every response for a subject.

On 2026-08-17 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside v0.7 includes
  Incident. Capture and resource-specific experience are shipped;
  grouping one occurrence across responses is not.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  the smallest explicit grouping now that two write identities exist,
  rather than waiting for a markdown ledger of “I mentally think of
  this as the incident.”
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision rule,
  and it does not authorize Recommendation, Learning, similarity,
  Investigation lifecycle, MCP writes, inferred Action, or Incident
  recall on live `investigate` / MCP.
- Same pattern as Sprint 050 → 051 and Sprint 056 → 057: the original
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
persist organizational response on Investigation   ← 051
    ↓
recall / retrieve / evidence / MCP recall          ← 052–056
    ↓
persist organizational response on Resource        ← 057
    ↓
group existing responses as one occurrence         ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: **persistence is required** for the grouping
claim. Do not infer an Incident from shared `subjectResourceId`,
shared `--evidence`, or overlapping `recordedAt`. Do not UPDATE
Resolution rows with a back-filled `incident_id`.

---

# Problem

After 057, two responses about one occurrence are only adjacent in a
list:

```text
combie resolution --investigation inv:a --decision "Rollback"
combie resolution --resource vercel:project:prj_abc --decision "Hold deploys"
combie resolutions --resource vercel:project:prj_abc
```

The human can see both rows. Combie cannot retain:

```text
The human named these exact Resolution ids as one occurrence.
```

That is the same epistemic class as 054 `--evidence`: explicit
membership, not inferred. It is **not** “Combie noticed two
Resolutions on the same Resource and stored an Incident.”

051 leftover named the condition: **one occurrence spans multiple
investigations**. After 057 a response may have no Investigation.
Grouping **Resolution ids** covers both:

- two Investigation-anchored rows (possibly distinct `inv:`)
- two Resource-anchored rows
- a mix

Grouping Investigation snapshots directly, without the responses,
is a different claim (a set of retained compositions). Rejected as
058.

---

# Product Question

> After Investigation-anchored and Resource-anchored Resolution
> capture exist, can a human group two or more existing exact `res:`
> ids as one append-only Incident — exclusive membership, optional
> title, surviving later Resource deletion, without updating those
> Resolution rows, without lifecycle, without MCP writes, without
> inferred members, and without showing the grouping on live
> `investigate` / `investigate_resource`?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** names Incident as the
   occurrence that organizational response hangs from. 051–057 shipped
   the response. The smallest remaining version is explicit grouping
   of those responses.
2. **Founder override 2026-08-17** replaces the unearned gate. 057
   leftover listed this first only *if earned*; the override is the
   earning act, not leftover order.
3. **Existing primitive check:** `resolutions --resource` still lists
   sibling rows and must keep listing them. A grouping object is the
   new claim. Do not replace Resolution.
4. **Sequencing Rule 9:** persistence is required (new `incidents`
   table). Read-time adjacency is not this claim.
5. **MCP** stays frozen at four read-only tools. No Incident field.
   No writes. Recall on investigate is 052-shaped leftover, not this
   Sprint.

Rejected as 058 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Infer Incident from same Resource / evidence / time | Forbidden since 051; membership must be named |
| `incident_id` column on `resolutions` | Would UPDATE 051/057 rows; append-only |
| Single-member Incident | A wrapper, not grouping; 051 leftover is *multiple* |
| `resolution --incident` as a third write identity | New hang, not grouping of existing rows |
| Group `--investigation` snapshots directly | Different object; responses may have no `inv:` |
| Open / closed / `resolved: true` | Status is still a process claim |
| INCIDENT section on `investigate` / MCP | 052-shaped; 051 shipped record+list+show first |
| `incidents --resource` / `--resolution` retrieve | 055-shaped leftover |
| Add members after record | Mutation of an append-only grouping |
| Overlapping membership (one `res:` in two Incidents) | Tags, not one occurrence |
| MCP writes / fifth tool / snapshot MCP | Frozen four-tool contract |
| Similarity / “this has happened before” | v0.8 |
| Recommendation / Learning | v0.8 |
| Policy / execution | v0.9 |
| Relationship kind for Incident | Graph is still provider-proven edges |

---

# Exact Capability

```text
combie incident --resolution <res-id> --resolution <res-id>
        [--resolution <res-id> …]     required, repeatable
        [--title <text>]              optional
        ↓
each res: id must exist in the local store
        ↓
≥2 unique ids after first-seen collapse
        ↓
no named id is already a member of another Incident
        ↓
persist Incident
  id = inc:<uuid>
  resolutionIds = unique first-seen order
  title omitted when absent
        ↓
Resolution rows unchanged (no incidentId field)
051 / 057 record paths unchanged
```

Exact CLI flag spelling is Phase 1. Expected: new `incident` /
`incidents` commands (same family as `resolution` / `resolutions`).
Repeatable `--resolution <id>` (same repeatable-flag family as
`--evidence`). One `--title`. Do not reuse `--resource` or
`--investigation` as silent member inference.

`--resolution` on `incident` (record) is this Sprint.
`resolution` (record/show) is unchanged.

Constraints:

- At least two unique Resolution ids after trim + first-seen
  collapse. One id fails; zero ids is usage.
- Append-only. No UPDATE of Incident members after insert. No
  UPDATE of Resolution rows. No rewrite of snapshots.
- Do not invent members from newest activity, shared subject, or
  shared evidence.
- Unknown Resolution id: fail the whole record; nothing inserted.
  Expected: `RESOLUTION_NOT_FOUND`.
- A Resolution already grouped into another Incident: fail the
  whole record. Expected: exclusive membership error (Phase 1 pins
  the code). Do not silently steal the member.
- Blank / missing `--resolution` value: usage error.
- `--title` present but blank: usage error. Omitted `--title`
  omits the field (not `"unknown"`).
- Resource / Investigation deletion: Incident remains listable;
  member `res:` ids remain as stored (051/050 survival on the
  Resolution side). Do not cascade-delete.

Display / retrieve (this Sprint = 051-shaped; no new investigate
section):

- `incidents` lists retained Incident summaries (`recordedAt` DESC,
  `id` DESC). TITLE column uses `-` when omitted. List does **not**
  dump member essays; Phase 1 pins a compact member column
  (expected: count, not every `res:` id).
- `incident <id>` show: identity, recorded time, organizational-
  grouping label, optional TITLE, RESOLUTIONS as exact member ids
  in stored order. Do not embed decision / action / outcome bodies
  (those stay on `resolution <id>`).
- Record confirmation: incident id, optional title, member ids,
  show pointer.
- Zero rows: known-empty (exit 0), not `INCIDENT_NOT_FOUND`.
- Unknown show id: `INCIDENT_NOT_FOUND`.
- Live `investigate` RESOLUTION MEMORY unchanged (no Incident
  token).
- `investigation <id>` reopen unchanged.
- `--compare` unchanged.
- MCP `resolutionMemory` unchanged. No new key. No writes.

---

# Evidence / Claim Semantics

### KNOWN (about the record)

```text
Combie retained an explicit Incident grouping these Resolution ids
recorded at <recordedAt>. The human named the members.
The title text, when present, is what the human supplied.
```

### UNKNOWN / stale (required)

The Incident remains **organizational grouping**, not current
provider authority, not a proven outage, and not a rewrite of any
Resolution or snapshot.

`recordedAt` is Combie observation time of the grouping. It is not
provider-native event time and not the first member’s `recordedAt`.

If a member’s subject Resource is later deleted, the Incident still
lists; live `investigate` of that Resource still fails as
`RESOURCE_NOT_FOUND`.

Provider activity that happens after the grouping is **not** a new
member unless the human later records that (out of scope; no
mutation in this Sprint).

### Forbidden

```text
These Resolutions share a Resource, so they are one Incident
Newest deploys in this window are the Incident
This Resource is now an Incident
inc:none / empty incident id is the marker
resolved: true / the Incident is closed
You should rollback
This has happened before
Recording an Incident creates a Relationship
Investigation <id> is closed because it was grouped
```

---

# Architecture

```text
resolutions table (051/057)          unchanged
        ↓
incidents table (this Sprint)
  id                 inc:<uuid>
  recorded_at
  title              nullable
  resolution_ids     JSON array of exact res: ids
        ↓
recordIncident
  validate members exist
  collapse first-seen
  require ≥2 unique
  reject exclusive-membership conflict
        ↓
CLI list / show
investigate / MCP / compare / snapshot JSON unchanged
```

Ownership:

- **Domain:** smallest `IncidentRecord` type (`src/domain/incident.ts`
  expected). Members are Resolution ids. Do not add `incidentId` on
  `ResolutionRecord`. Do not add status / severity / kind enum.
- **Store:** new `incidents` table; `CREATE TABLE IF NOT EXISTS`.
  Pre-058 DBs upgrade by creating the empty table. No rebuild of
  `resolutions`. **Never** empty-string incident id. **Never** a
  sentinel `inc:`.
- **App:** record / list / get / formatters. Do not call
  `getInvestigationContext` to infer members. Do not mix into
  `InvestigationContext` or RESOLUTION MEMORY.
- **CLI:** `incident` record-or-show; `incidents` list. Help: one
  grouping example; 051/057 resolution examples remain.
- **MCP:** no new tool; no new field. `docs/public/MCP.md` unchanged
  unless Phase 2 finds existing wording now lies (expected: **no**).

Adapters do not participate.

---

# Persistence vs Read-Time

| 051/057 Resolution | 058 Incident |
| --- | --- |
| decision / action / outcome | grouping of existing `res:` ids |
| write identity Investigation XOR Resource | no write identity on Resolution |
| optional `--evidence` | required ≥2 `--resolution` |
| subject copied onto the row | no single subject |

Must **not**:

- infer members
- UPDATE Resolution rows
- rewrite snapshot JSON
- thaw MCP writes
- add an Evidence or MemoryEngine table
- mix into Known Facts
- add an Incident section on `--compare`
- treat list adjacency as the grouping

---

# Boundedness

- One new persistence object. 051/057 record paths byte-stable
  except help/usage strings that must mention `incident`.
- Exact `res:` ids. No name search, no glob, no “all resolutions
  for this resource.”
- Repeatable `--resolution` on record. Not a single CSV string.
- Exclusive membership.
- No fact-budget involvement.
- No extra hop. No provider calls.
- No MCP writes. No fifth tool.
- No `--compare` section.
- No Investigation or Incident lifecycle.

---

# Failure / Unknown Semantics

- Uninitialized store: same as other write commands.
- Missing / blank `--resolution` value: usage error.
- Fewer than two unique ids after collapse: usage / validation
  error; do not insert.
- Unknown Resolution id: `RESOLUTION_NOT_FOUND`; do not insert.
- Member already grouped: exclusive-membership error; do not insert.
- Unknown `incident <id>`: `INCIDENT_NOT_FOUND`.
- Empty `incidents` list: known-empty, exit 0.
- `--title` without `--resolution`: usage (show path if positional
  `inc:` only).
- Repeatable `--title`: Phase 1 pins (expected: one title; extra is
  usage, not silent last-wins — or last-wins if that matches an
  existing single-value flag; pin one, do not invent merge).

---

# Affected Surfaces

### CLI

- `incident --resolution <id> --resolution <id> [--resolution …] [--title]`
- `incident <id>` show
- `incidents` list
- Help: one grouping example; 051/057 examples remain
- `resolution` / `resolutions` / `investigate` / `investigation`
  behavior unchanged

### MCP

Unchanged four tools. No Incident key. No writes. No
`docs/public/MCP.md` change expected.

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-051 write path, SPRINT-054 repeatable `--evidence`,
SPRINT-057 optional `investigationId`, and inspect:

- `src/domain/resolution.ts` / `investigation.ts` id helpers
- store `insertResolution` / `listResolutionSummaries` (no
  `incident_id` today)
- CLI `parseArgs` repeated-flag map (054 `--evidence`)
- whether `incident` / `incidents` collide with any command
- RESOLUTION MEMORY / MCP paths (must stay Incident-free)
- `docs/public/MCP.md` investigate_resource row

Report:

1. Commands: `incident` / `incidents`? Expected: **yes.** Record vs
   show on `incident` like `resolution`.
2. Flag: repeatable `--resolution <id>`? Expected: **yes.** Reuse
   the 054 repeated-flag map. Not a CSV.
3. Member type: Resolution ids, not Investigation ids? Expected:
   **yes.** `--investigation` on `incident` record is usage, not a
   member.
4. Minimum unique members? Expected: **2.**
5. Exclusive membership? Expected: **yes.** One `res:` in at most
   one Incident.
6. Store: new table + JSON array of ids, no `incident_id` on
   `resolutions`? Expected: **yes.** `CREATE TABLE IF NOT EXISTS`.
7. Optional `--title` omitted when absent; list placeholder `-`?
   Expected: **yes.**
8. List member column: count vs ids? Pin one (expected: **count**).
9. Investigate / reopen / `--compare` / MCP: no Incident surface?
   Expected: **yes.**
10. Infer members / UPDATE resolutions / MCP writes / lifecycle?
    Expected: **no.** 051/057 record paths unchanged.

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **yes** (new table). List
   adjacency is not this claim.
2. Second source of truth? No. Members are exact existing
   Resolution ids. Incident does not copy decision / action /
   outcome. Resolutions remain the response.
3. Does grouping leak “this Resource is an Incident”? **No.** The
   members are responses. No subject is promoted to occurrence.
4. Does grouping leak “you should” / “this has happened before”?
   **No.** No similarity, no recommendation copy.
5. MCP tool / write / Incident field needed? Expected: **no.**
6. Compare section? Expected: **no.**
7. `incident_id` on resolutions / join engine? Expected: **no.**
8. Lifecycle / severity? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline only.
   ROADMAP already names Incident — do not edit ROADMAP to add an
   Incident heading.

If implementation is tempted to infer members from a Resource, to
UPDATE `resolutions` with `incident_id`, to thaw MCP writes, to add
open/closed, to group snapshots instead of `res:` ids, or to show
the grouping on live `investigate`: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- 051/057 resolution record/show/list/recall unchanged
- `--resolution` twice records `inc:` with omitted title and those
  two ids in first-seen order
- duplicate `--resolution` collapses; two copies of one id fail as
  <2 unique
- one `--resolution` fails; zero fails usage
- unknown `res:` fails `RESOLUTION_NOT_FOUND`; no insert
- member already in another Incident fails; no insert
- mix of Investigation-anchored and Resource-anchored members is
  allowed
- `--title` persists; blank `--title` is usage; omitted title omits
- `--investigation` / `--resource` on `incident` record do not infer
  members (usage or ignored-as-error — pin: **usage error** if
  present)
- `incidents` lists `recordedAt` DESC, `id` DESC; TITLE `-` when
  omitted; no decision/action/outcome essays
- `incident <id>` show lists member ids, not bodies; omits TITLE
  line when absent
- confirmation lists member ids
- empty list is known-empty exit 0
- unknown show id is `INCIDENT_NOT_FOUND`
- live `investigate` / reopen / `--compare` have no Incident section
- `--save` snapshot JSON unchanged
- MCP still four tools; `resolutionMemory` unchanged; DB digest
  unchanged after MCP reads
- subject Resource deleted after members exist: `incidents` /
  `incident <id>` still list (not `RESOURCE_NOT_FOUND`)
- pre-058 DB: `init()` creates empty `incidents`; 051/057 rows
  still load
- no MCP write tool; no `incidentId` on Resolution records

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
# two responses (051 + 057)
investigate <id> --save
resolution --investigation <inv> --decision "…"
resolution --resource <id> --decision "…"

# this Sprint
incident --resolution <res-a> --resolution <res-b> --title "…"
incidents
incident <inc>
resolution <res-a>                 # unchanged; no INCIDENT line
investigate <id>                   # RESOLUTION MEMORY unchanged
investigation <inv> --compare      # no new section
# MCP investigate_resource: resolutionMemory unchanged; four tools
incident --resolution <res-a> --resolution <res-c>   # exclusive fail
```

---

# Explicit Non-Goals

Do **not** implement:

- inferred members from Resource / evidence / time / activity
- `incident_id` on Resolution rows / UPDATE of 051/057 rows
- single-member Incident
- `resolution --incident` third write identity
- grouping Investigation snapshots as members
- MCP writes or a fifth tool
- Incident field on `investigate_resource` / RESOLUTION MEMORY
- Investigation or Incident lifecycle / `resolved: true`
- `incidents --resource` / `--resolution` retrieve
- add-member-after-record mutation
- overlapping membership
- similarity, “you should”, Learning, Recommendation
- putting Incidents on `InvestigationContext` or `snapshot_json`
- Incident section on `--compare`
- Relationship kind, Evidence table, MemoryEngine
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
058       explicit Incident grouping of existing Resolutions       ← this
059+      Incident recall on investigate / MCP only if earned
          incidents --resolution / --resource retrieve only if
            earned
          Incident-anchored Resolution write (`resolution
            --incident`) only if earned
          add members after record only if earned
          group Investigations directly only if earned
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
  `investigate_resource` (exactly four; still read-only; no writes)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 051 `--investigation` write unchanged
- 054 `--evidence` validation unchanged
- 055 `resolutions --evidence` unchanged
- 056 `resolutionMemory` subject filter unchanged
- 057 `--resource` write unchanged (XOR with `--investigation`)
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

Required. No `incidents` table exists.

Phase 1 pins `CREATE TABLE IF NOT EXISTS` on `init()`. Pre-058 DBs
gain an empty table. New DBs include it in `SCHEMA`.

Do **not** rebuild `resolutions`. Do **not** add `incident_id` to
that table.

If implementation is tempted to keep grouping as a JSON column on
the first Resolution, or to back-fill `incident_id`: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 058 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `incident --resolution` records an append-only
      Incident grouping ≥2 existing `res:` ids; exclusive membership;
      Resolution rows unchanged; 051/057 paths unchanged
- [x] if earned: no inferred members; no lifecycle; no MCP write;
      no Incident surface on investigate / compare / MCP
- [x] if not earned: rejection documented; do not infer an Incident
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline

---

# Final Principle

> **Sprint 051–057 remembered each organizational response. Sprint 058
> may remember that the human named several of those responses as one
> occurrence. Combie must not invent the grouping, must not invent
> lifecycle, and must not treat a Resource as an Incident.**

---

# Completion Notes

## Baseline (2026-08-17)

```text
HEAD:          a31d430b19c84b8e54f76c69793cd010ab7738c7
               (057 complete; 058 activation edits were present
               but uncommitted at baseline)
tests:         945 pass across 77 files (4013 expect() calls)
typecheck:     clean
worktree:      activation edits (AGENTS.md, SPRINT-058.md)
MCP:           exactly four read-only tools
Sprint 057:    Complete
Sprint 058:    Active (single Active sprint)
```

## Repository Understanding

1. **Commands: `incident` / `incidents`.** No collision. Record vs
   show on `incident` copies `resolution`.
2. **Flag: repeatable `--resolution <id>`.** Reuses the 054
   `repeated` map. Not a CSV. Blank / boolean flag is usage.
3. **Member type: Resolution ids.** `--investigation` / `--resource`
   on `incident` record are usage errors, not members.
4. **Minimum unique members: 2** after trim + first-seen collapse
   (`INCIDENT_MEMBERS_REQUIRED`).
5. **Exclusive membership: yes.** `INCIDENT_MEMBERSHIP_CONFLICT`.
   One `res:` in at most one Incident.
6. **Store: new `incidents` table** + JSON `resolution_ids`. No
   `incident_id` on `resolutions`. `CREATE TABLE IF NOT EXISTS`.
7. **Optional `--title`:** omitted when absent; list placeholder
   `-`. Blank CLI `--title` is usage; app-layer whitespace trims to
   omit (same as Resolution fields).
8. **List member column: count**, not ids, not essays.
9. **Investigate / reopen / `--compare` / MCP: no Incident surface.**
10. **No inferred members, no Resolution UPDATE, no MCP writes, no
    lifecycle.** `--title` last-wins like `--decision` (existing
    single-value flags). 051/057 record paths unchanged.

## Architecture Pressure

1. **Persistence necessary? Yes.** New table. List adjacency is not
   this claim.
2. **Second source of truth? No.** Members are exact existing
   Resolution ids. Incident does not copy decision / action /
   outcome.
3. **Does grouping leak “this Resource is an Incident”? No.**
   Members are responses. No subject is promoted to occurrence.
4. **Does grouping leak “you should” / “this has happened before”?
   No.** No similarity, no recommendation copy.
5. **MCP tool / write / Incident field? No.**
6. **Compare section? No.**
7. **`incident_id` on resolutions / join engine? No.**
8. **Lifecycle / severity? No.**
9. **Canon change? AGENTS.md operational baseline only.** ROADMAP
   already names Incident — not edited.

## Implemented

- `IncidentRecord` + `incidentId()` (`src/domain/incident.ts`)
- `incidents` table (`id`, `recorded_at`, nullable `title`,
  `resolution_ids` JSON); `CREATE TABLE IF NOT EXISTS`; insert /
  list / get; missing table lists empty (`src/storage/store.ts`)
- `recordIncident` / `listIncidents` / `getIncident` + list / show /
  confirmation formatters (`src/app/incidents.ts`)
- CLI: `incident` record-or-show, `incidents` list; repeatable
  `--resolution`; optional `--title`; `--investigation` /
  `--resource` usage on record; list does not filter
  (`src/cli/index.ts`)

## Deviations

- None material. App-layer `title: "   "` omits the field (trim);
  CLI blank `--title` is usage — same split as 051 field flags.

## Validation

```text
bun test:          970 pass across 78 files (4139 expect() calls;
                   was 945 pass / 77 files / 4013 at baseline)
bun run typecheck: clean
git diff --check:  clean
MCP tools:         get_related_context, investigate_resource,
                   list_providers, list_resources
Red:               tests/app/incidents.test.ts failed to load
                   (`src/app/incidents.ts` missing) before Green
live (isolated):   investigate --save → 051 --investigation + 057
                   --resource → incident --resolution twice with
                   title → incidents lists count 2 and title →
                   incident show lists member ids not bodies →
                   resolution show has no INCIDENT heading → live
                   investigate RESOLUTION MEMORY unchanged (no
                   Incident section) → --compare has no Incident
                   section → exclusive rematch exit 1 → MCP four
                   tools; resolutionMemory two rows; no incident
                   key; title absent from payload; DB SHA-256
                   unchanged
```

## Learnings

- Exclusive membership cannot live as `incident_id` on Resolution
  rows without UPDATE. Scanning stored member arrays at record time
  keeps 051/057 rows append-only.
- `incidents` list must print a count, not member ids: the table
  would otherwise look like a Resolution essay dump. Show is the
  place for exact `res:` ids.
- `--resolution` was not previously a parsed write flag (the command
  is `resolution`). The 054 repeated-flag map still handles it the
  same way as `--evidence`.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md baseline
becomes Sprints 001–058 complete (shipped bullet + v0.7 paragraph).
Sprint 059 is not started.

