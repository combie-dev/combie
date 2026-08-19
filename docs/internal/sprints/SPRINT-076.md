# SPRINT-076 — Named-id-only observe on investigate_resource

> **Status:** Complete
> **Depends on:** SPRINT-075 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.6 Investigation
> persistence (048 reopen by exact `inv:` id) plus v0.4 CLI + MCP
> parity for CLI `investigation <id>` / `--compare` (no
> `--resource`), after 071–075 named-id sidecars exist on
> `investigate_resource`. Sprint 075 leftover list is **not** a
> sequence. leftover[0] **group Investigations as Incident
> members** stays **unearned** (Investigation ≠ Incident; members
> stay `res:`). leftover[1] **fifth-tool snapshot reopen /
> `list_investigations`** is split: `get_investigation` /
> `list_investigations` stay frozen; this Sprint takes
> **named-id-only observe** on the existing
> `investigate_resource` (`resourceId` optional when
> `investigationId` is named; subject from the 048 row). Does
> **not** authorize Recommendation, Learning, similarity,
> Investigation lifecycle, MCP writes, a fifth tool, inferred
> Action, grouping snapshots as members, `occurredAt`, unfiltered
> list MCP, omitted-id live investigate, replacing live compose
> with snapshot JSON, or inferred latest.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.6 Investigation —
> **named-id snapshot observe without a required Resource id**,
> plus v0.4 CLI + MCP parity for CLI `investigation <id>` (no
> `--resource`); not lifecycle, not the Investigation Engine,
> not a fifth tool, not MCP writes, not grouping `inv:` as
> members, not `list_investigations`
> **Type:** Narrow input relaxation on existing
> `investigate_resource` when `investigationId` is named:
> `resourceId` becomes optional; subject is the 048 row’s
> `subjectResourceId`; then the existing 074 (Resource present)
> or 075 (Resource missing) path
> **Primary goal:** When an agent names an exact `inv:` id and
> omits `resourceId`, Combie derives the subject from that
> snapshot and returns the same named-id observe 071–075 already
> return for that subject — live compose + sidecars when the
> Resource exists, 075 orphan sidecars when it does not —
> omitted `investigationId` still requires `resourceId`, never a
> fifth tool, never an unfiltered list, never promoting snapshot
> fields to the live body — without grouping `inv:` as Incident
> members and without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. This
> Sprint makes `resourceId` **optional** on `investigate_resource`
> only when `investigationId` is named (reuses that input). No
> fifth tool. No writes. When both ids are passed, 075 is
> unchanged. When `investigationId` is omitted, `resourceId`
> stays required; missing Resource stays `RESOURCE_NOT_FOUND`.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 075 completed named-id observe **when the agent already
knows the Resource id**, including after that Resource is gone:

```text
investigate_resource({ resourceId, investigationId: inv:a })
  Resource exists → 074 (live compose + sidecars)
  Resource missing → 075 (sidecars; live keys omitted;
    compare currentStatus subject_missing)
```

CLI reopen never needed the Resource id:

```text
investigation inv:a              # 048; no --resource
investigation inv:a --compare    # 049; no --resource
investigate <id>                 # still requires the Resource
```

MCP `investigate_resource` still requires `resourceId` even
when the agent already named `inv:a`. `investigationHistory`
returns `{ id, composedAt }` only — not `subjectResourceId`.
An agent who stored an `inv:` id across turns, or who was
handed one, cannot reopen it without also knowing the Resource
id. That is the remaining 048 hole on the path already in use:
the durable row identifies its own subject; the tool still
demands the caller repeat it.

Sprint 075 leftover:

```text
076+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
075 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. leftover[0] stays
unearned.

leftover[1] **fifth-tool / `get_investigation` /
`list_investigations`** is why a dedicated reopen tool keeps
being proposed: CLI `investigation <id>` takes only the `inv:`
id. After 075, that reopen already lives on
`investigate_resource` **except** the schema still requires
`resourceId`. Named-id-only observe does **not** need
`get_investigation` if the existing tool can derive the subject
from the 048 row when the agent already named `inv:a`.
`list_investigations` (unfiltered list) still has no four-tool
home and stays frozen.

leftover **Investigation lifecycle** / **`occurredAt`** stay
unearned (process claim; second time field).

This Sprint **splits** leftover[1] as:

```text
fifth tool / list_investigations / get_investigation
  → still frozen
group inv: as Incident members
  → still frozen (Investigation ≠ Incident)
Investigation lifecycle / occurredAt
  → still frozen
named-id-only observe on existing investigate_resource
  (resourceId optional when investigationId is named;
   subject from the 048 row; 074 or 075 path)
  → this Sprint
```

No founder override is required. 048 already authorized reopen
by exact `inv:` id. v0.4 names CLI + MCP parity. 071–075 already
put named-id observe on this tool. The next smallest version is
that same observe when the caller names only the id CLI already
accepts. Do not infer “latest snapshot.” The agent must name the
`inv:` id.

It is **not** grouping Investigation snapshots as Incident members.
`--investigation` on `incident` create stays usage.

It is **not** a fifth tool. Live compose when the Resource exists
stays the body. When the Resource is missing, 075 omits live
keys — do not copy `investigationSnapshot.snapshot.subject`
to top-level `subject`.

It is **not** 050 `investigations` / unfiltered list MCP.

It is **not** changing 075 when both ids are passed.

It is **not** letting omitted `investigationId` survive deletion
or live-investigate without a Resource. Missing Resource +
omitted id stays `RESOURCE_NOT_FOUND`. Omitted both ids is
usage, not success.

It is **not** MCP writes, lifecycle, `occurredAt`, or inferred
snapshots from provider activity.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Sequencing Rules (smallest deterministic
version; is persistence necessary; do not start a generic engine):

```text
exact evidence
    ↓
persist retained composition                       ← 048
    ↓
compare retained vs current (incl. subject_missing)← 049
    ↓
retrieve by subject (survives deletion)            ← 050
    ↓
MCP named-id sidecars while Resource exists        ← 071–074
    ↓
MCP named-id sidecars when Resource is missing     ← 075
    ↓
MCP named-id observe without repeating resourceId  ← this Sprint
    ↓
earned abstraction / fifth tool /
  list_investigations                              ← not this Sprint
```

Sequencing Rule 9: persistence is **not** necessary. Reuse
`getSavedInvestigation`, `compareInvestigationToCurrent`,
`listInvestigations({ subjectResourceId })`,
`listResolutions({ investigationId })`,
`listIncidentsForInvestigation`. Do not rewrite `snapshot_json`.

Sequencing Rule 8: snapshot identity has one source of truth —
the 048 row. The agent names an exact `inv:` id. When
`resourceId` is also named, subject alignment stays 071
(`subjectResourceId` === `resourceId`). When `resourceId` is
omitted, the 048 row **is** the subject.

Sequencing Rule 2: live `investigate` / omitted-`investigationId`
MCP stays `RESOURCE_NOT_FOUND` when the Resource is gone. This
Sprint does not change that path. Omitted both ids is not live
investigate of a missing Resource.

Sequencing Rule 4: the new claim is “named snapshot `<inv:id>`
is retained composition for its stored subject; that subject is
taken from the 048 row because the caller did not name a
Resource id,” not “the snapshot is current provider truth,” not
“these Investigations are an Incident,” and not “top-level
subject is the frozen snapshot.”

---

# Problem

After 075:

```text
investigate_resource({ resourceId, investigationId: inv:a })
  Resource exists → 074
  Resource missing → 075

investigate_resource({ investigationId: inv:a })
  schema / handler still requires resourceId

investigation inv:a                               # CLI 048 works
investigation inv:a --compare                     # CLI 049 works
```

The named-id MCP contract is unreachable unless the agent also
repeats the Resource id. CLI `investigation <id>` does not.
`investigationHistory` does not include `subjectResourceId`.
That is the 048 hole for callers who only have the `inv:` id:
the durable row exists; the only MCP tool that can name it
still requires a second identifier the row already stores.

---

# Product Question

> After named-id snapshot, compare, investigation-scoped memory,
> and orphan-subject observe exist on `investigate_resource`,
> can that same named-id call succeed when `resourceId` is
> omitted — deriving the subject from the 048 row, returning the
> 074 path when the Resource exists and the 075 path when it
> does not, still requiring `resourceId` when `investigationId`
> is omitted, without a fifth tool, without an unfiltered list,
> without promoting snapshot JSON to the live body, without
> grouping `inv:` as Incident members, and without MCP writes?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.6** already shipped 048
   reopen by exact `inv:` id. **v0.4** names CLI + MCP parity.
   CLI `investigation <id>` never required `--resource`. 071–075
   put named-id observe on this tool only when the caller also
   passed `resourceId`. The next smallest version is that same
   observe when the 048 row supplies the subject.
2. **Sprint 075 leftover** lists grouping snapshots as members
   first, only *if earned*. leftover[0] stays frozen. Fifth-tool
   `get_investigation` / `list_investigations` stay frozen.
   Named-id-only observe on the existing tool is now earned.
3. **Existing primitive check:** `getSavedInvestigation` already
   returns `subjectResourceId`. `compareInvestigationToCurrent`
   already keys off the named `inv:` id. 074 / 075 paths already
   exist once a subject id is known. Four tools stay four tools.
4. **Sequencing Rule 9:** persistence is **not** required.
5. **Founder override 2026-08-16** froze MCP *writes*. This is a
   read. It does not authorize `list_investigations`, a fifth
   tool, or writes.

Rejected as 076 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Fifth tool / `get_investigation` / `list_investigations` | Frozen four-tool contract; unfiltered list still has no four-tool home |
| Omitted-id survival / live investigate without Resource | Live compose requires the Resource; omitted `investigationId` stays `RESOURCE_NOT_FOUND` when missing |
| Copy snapshot.subject to top-level `subject` | Mixes retained composition into current-truth keys |
| Change 075 when both ids are passed | 075 freeze |
| Infer latest `investigationHistory[0]` | Named id only |
| Add `subjectResourceId` to `investigationHistory` | Not required once named-id-only reopen exists; do not expand 070 in this Sprint |
| `occurredAt` | Second time field |
| Investigation lifecycle | Status is still a process claim |
| MCP writes | Founder override; policy is v0.9 |
| Similarity / “you should” | Forbidden |

---

# Exact Capability

```text
investigate_resource({ resourceId?, investigationId? })
        ↓
if investigationId omitted:
  resourceId required (blank / missing → usage;
    Phase 1 names the code; not RESOURCE_NOT_FOUND for an
    id that was never named)
  live compose as today
  missing Resource → RESOURCE_NOT_FOUND (isError)
        ↓
if investigationId present:
  existing 071 / 072 gates on the id (blank → usage; unknown →
    INVESTIGATION_NOT_FOUND)
        ↓
  if resourceId also named (non-blank after trim):
    existing 071 subject mismatch →
      INVESTIGATION_SUBJECT_MISMATCH
    subject = named resourceId
        ↓
  if resourceId omitted (or blank after trim):
    subject = investigationSnapshot.subjectResourceId
    (no mismatch check; the 048 row is the subject)
        ↓
  try live compose of that subject
  if available: 074 structuredContent unchanged
        ↓
  if RESOURCE_NOT_FOUND and named-id gates passed:
    075 orphan payload unchanged
        ↓
snapshot_json unchanged
```

When both ids are passed, 075 is unchanged.

`get_related_context` is unchanged (still requires `resourceId`;
still `RESOURCE_NOT_FOUND` for a missing Resource).

`--save` must **not** serialize MCP sidecar keys into
`snapshot_json`. Named-id-only observe is a read.

Exact omitted-both error code is Phase 1. Expected: **usage**,
not a silent live compose, not `RESOURCE_NOT_FOUND` for a
Resource that was never named, not `INVESTIGATION_ID_REQUIRED`
(that code is for a blank named `investigationId`). A new
`RESOURCE_ID_REQUIRED` is acceptable if no existing code fits.

Blank / whitespace `resourceId` with a named `investigationId`
is **omitted** `resourceId` (derive subject), not mismatch
against `""`.

The four-tool list is unchanged:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

---

# Evidence / Claim Semantics

### KNOWN (about the named-id-only path)

```text
Named snapshot <inv:id> is retained composition for its stored
subject <subjectResourceId>. The caller did not name a Resource
id; the 048 row did. Live compose of that subject is current
local store when the Resource exists. When it does not, compare
currentStatus is subject_missing (075).
```

Omitting `investigationId` is **not** named-id-only observe. It
is live investigate. `resourceId` remains required. Missing
Resource then is `RESOURCE_NOT_FOUND`.

### UNKNOWN / stale (required)

The snapshot is **not** current provider authority. Compare
`subject_missing` is not a recommendation to recreate the
Resource. Sidecars are not live Known Facts. Deriving the
subject from the 048 row is not “this is still the live
Resource.”

### Forbidden

```text
This snapshot proves the current provider state
Top-level subject is the frozen snapshot
Reopen the latest investigationHistory row
These Investigations are an Incident
You should recreate / rollback
resolved: true
Omitted investigationId still returns the snapshot
This payload is snapshot JSON as the live body
Omitted both ids investigates something
```

---

# Architecture

```text
investigations table (048)                         unchanged
        ↓
getSavedInvestigation / compareInvestigationToCurrent
  (already return subjectResourceId; 049 already handles
   RESOURCE_NOT_FOUND → subject_missing)
        ↓
investigate_resource
  existing investigationId gates (071 / 072)
  resourceId optional when those gates pass
  subject = named resourceId or snapshot.subjectResourceId
  existing 074 / 075 paths
```

Ownership:

- **Domain / Store:** no new type. No new column. No `incident_id`.
  Do not store `inv:` ids as Incident members. Do not rewrite
  `snapshot_json`.
- **App:** reuse existing loaders. No new CLI helper. No new
  compare semantics.
- **CLI:** unchanged, including `investigation <id>` without
  `--resource`.
- **MCP:** optional `resourceId` on `investigate_resource` only
  when `investigationId` is named. Tool description clause.
  `docs/public/MCP.md` investigate_resource row only (input /
  named-id-only behavior).
- **075 when both ids are passed:** unchanged.
- **074 when Resource exists and both ids are passed:** unchanged.

Adapters do not participate.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as Incident members, to copy snapshot JSON to top-level
live keys, to infer latest, to add `list_investigations`, or to
let omitted-`investigationId` survive deletion: **STOP.**

---

# Persistence vs Read-Time

| Snapshot JSON | CLI `investigation <id>` | MCP named-id-only |
| --- | --- | --- |
| Frozen InvestigationContext | reopen / `--compare` without `--resource` | Same 074 / 075 payload; subject from 048 |
| Unchanged JSON | not rewritten | omitted `investigationId` still requires `resourceId` |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- rewrite snapshot JSON
- promote snapshot fields to live `subject` / `knownFacts`
- add MCP tools or writes
- infer latest snapshot
- change omitted-`investigationId` missing-Resource to success
- add Investigation lifecycle / `resolved: true`
- add `list_investigations` / `get_investigation`

---

# Boundedness

- Existing `investigate_resource` tool. No fifth tool. No new verb.
- Named-id-only path only when the agent names an exact `inv:` id
  and omits `resourceId`.
- No grouping of Investigation snapshots as Incident members.
- No CLI change. No snapshot schema change. No 075 change when
  both ids are passed.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.
- No extra hop. No provider calls. No schema migration.
- No unfiltered investigations list.

---

# Failure / Unknown Semantics

- `investigationId` omitted + omitted / blank `resourceId`:
  usage (Phase 1 names the code).
- `investigationId` omitted + missing Resource:
  `RESOURCE_NOT_FOUND` (unchanged).
- Named id + named matching `resourceId` + Resource exists: 074
  (unchanged).
- Named id + named matching `resourceId` + Resource missing: 075
  (unchanged).
- Named id + omitted `resourceId` + Resource exists: 074 for the
  048 subject.
- Named id + omitted `resourceId` + Resource missing: 075 for the
  048 subject.
- Named blank / unknown: existing 071 / 072 codes.
- Named id + named other `resourceId`:
  `INVESTIGATION_SUBJECT_MISMATCH` (unchanged).
- Untrusted snapshot JSON: existing
  `INVESTIGATION_SNAPSHOT_UNTRUSTED`.
- `--investigation` on `incident` create: existing usage.

---

# Affected Surfaces

### CLI

Unchanged. `investigation <id>` without `--resource` stays.

### MCP

Four tools. Optional `resourceId` on `investigate_resource` when
`investigationId` is named. Tool description clause.
`docs/public/MCP.md` investigate_resource row (expected:
**yes**, input / named-id-only).

### Compare / snapshot / 073 / 074 / 075 fields

Shapes unchanged. Named-id-only reuses 074 or 075 once the
subject is known.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md`
v0.6 048 reopen-by-id and v0.4 agent boundary, this Sprint,
SPRINT-072 leftover split / MCP freeze, SPRINT-075 both-ids
orphan path, and inspect:

- `src/mcp/tools.ts` `investigate_resource` `resourceId`
  required schema vs 071 / 072 / 075 gates
- `getSavedInvestigation` `subjectResourceId`
- `compareInvestigationToCurrent` (does not require a Resource
  id input)
- `tests/app/mcp-protocol.test.ts` required-`resourceId` and
  075 orphan cases
- CLI `investigation <id>` (no `--resource`)
- leftover[0] `incident --investigation` usage
- omitted-both vs omitted-`investigationId` error distinction

Report:

1. Today `resourceId` required even when `investigationId` is
   named? Expected: **yes.**
2. 048 row already stores `subjectResourceId`? Expected: **yes.**
3. Named-id-only + Resource exists: 074 payload (live keys +
   sidecars)? Expected: **yes.**
4. Named-id-only + Resource missing: 075 payload (live keys
   omitted; compare `subject_missing`)? Expected: **yes.**
5. Both ids passed: 075 unchanged (mismatch still mismatch;
   aligned still 074 / 075)? Expected: **yes.**
6. Omitted `investigationId` + omitted `resourceId`: usage, not
   success? Expected: **yes.** Phase 1 names the code.
7. Omitted `investigationId` + missing Resource: still
   `RESOURCE_NOT_FOUND`? Expected: **yes.**
8. Blank `resourceId` with named `investigationId`: treat as
   omitted (derive), not mismatch against `""`? Expected: **yes.**
9. `content[]`? Expected: **same one-liner family as 074 / 075**
   for the derived subject; not JSON dump.
10. Tool description + `docs/public/MCP.md` row? Expected:
    **yes**, that row only (input becomes optional `resourceId`
    when `investigationId` is named).
11. Fifth tool, grouping `inv:` as members, infer latest,
    `occurredAt`, omitted-id survival, `list_investigations`?
    Expected: **no.**
12. CLI `investigation <id>` / `--compare` / 075-when-both-ids /
    `get_related_context`? Expected: **no change.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? Snapshot remains 048; compare remains
   ephemeral 049; live compose remains current local store when
   the Resource exists; derived subject is the 048
   `subjectResourceId`, not a first-seen heuristic.
3. Does deriving the subject leak “this Resource still exists”?
   **No**, if 075 still omits live keys when compose cannot run.
4. Does this become snapshot-as-live-body? **No** if live keys
   stay omitted on the orphan path and snapshot stays
   `investigationSnapshot`.
5. Fifth tool needed? Expected: **no.** Named-id-only on this
   tool is the four-tool analog of `get_investigation`.
   `list_investigations` still has no four-tool home — do not
   add it.
6. Grouping snapshots leak? **No.** leftover[0] frozen.
7. Infer latest from `investigationHistory`? Expected: **no.**
8. Omitted-`investigationId` survival? Expected: **no.**
9. Does optional `resourceId` change `investigate_resource`
   identity into `get_investigation`? **No** if omitted
   `investigationId` still requires `resourceId` and live
   compose remains the body when the Resource exists.
10. Canon change? Expected: AGENTS.md operational baseline + the
    existing `docs/public/MCP.md` investigate_resource row. Not
    VISION / ARCHITECTURE / ROADMAP / SKILL.

If implementation is tempted to add `get_investigation` or
`list_investigations`, to copy snapshot JSON onto live keys, to
infer latest, to store `inv:` as Incident members, or to succeed
when `investigationId` is omitted: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- still exactly four tools; annotations unchanged
- omitted `investigationId` + omitted `resourceId`: usage /
  `isError` (Phase 1 code)
- omitted `investigationId` + deleted Resource:
  `RESOURCE_NOT_FOUND` / `isError` (075 freeze)
- named matching `inv:` + named `resourceId` + Resource exists:
  074 unchanged
- named matching `inv:` + named `resourceId` + deleted Resource:
  075 unchanged
- named `inv:` + omitted `resourceId` + Resource exists: 074
  for the 048 subject (`investigationSnapshot.id` matches;
  live `subject.id` is that snapshot’s `subjectResourceId`)
- named `inv:` + omitted `resourceId` + deleted Resource: 075
  for the 048 subject (`isError` not true; no live `subject` /
  `knownFacts`; compare `subject_missing`; digest unchanged)
- named `inv:` + blank / whitespace `resourceId`: same as omitted
  `resourceId` (derive; not mismatch against `""`)
- named `inv:` + other `resourceId`: mismatch (unchanged)
- unknown / blank `investigationId` with omitted `resourceId`:
  071 / 072 codes (not a derived consolation snapshot)
- 073 / 074 scoped fields still appear on named-id-only when
  rows exist; omitted when empty
- snapshot JSON still has no MCP sidecar keys
- `content[]` is a one-liner; not snapshot JSON
- CLI `investigation <id>` and `--compare` unchanged
- leftover[0]: `incident --investigation` still usage
- no `list_investigations` / `get_investigation` tool
- no write tool; no `occurredAt`; no `inv:` members
- `get_related_context` still requires `resourceId`
- do not auto-use `investigationHistory[0]` when id omitted

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names. Never
write to `./.combie`. Use a **script file** for argv (not
`bun -e … "$DIR"`). Invoke the CLI as `bun src/cli/index.ts … --dir`
(not `bun run`, which can swallow `--dir`). Run MCP scripts from
the repo so `@modelcontextprotocol/client` resolves.

```text
investigate <id> --save                          # inv:a
# MCP named inv:a without resourceId: snapshot id match;
#   live subject present (074)
# delete the Resource row from the isolated DB
# MCP omitted investigationId: RESOURCE_NOT_FOUND
# MCP named inv:a without resourceId: 075 orphan
#   (compare subject_missing; no top-level subject)
# MCP named inv:a + original resourceId: 075 unchanged
investigation inv:a                              # CLI reopen unchanged
investigation inv:a --compare                    # CLI subject_missing
incident --investigation inv:a --investigation inv:b
  # still usage (leftover[0] frozen)
# four tools; digest unchanged after MCP reads
```

Confirm founder `.combie/combie.db` mtime/size unchanged if it
exists.

---

# Explicit Non-Goals

Do **not** implement:

- grouping Investigation snapshots as Incident members
- a fifth MCP tool (`list_investigations`, `get_investigation`)
- unfiltered investigations list on any existing tool
- omitted-id survival / live investigate without a Resource
- copying snapshot JSON onto live `subject` / `knownFacts`
- changing 075 when both ids are passed
- inferred latest snapshot
- adding `subjectResourceId` to `investigationHistory`
- MCP writes
- snapshot JSON rewrite
- Investigation or Incident lifecycle / `resolved: true`
- `occurredAt`
- `incident_id` on Resolution rows
- inferred Action from provider activity
- similarity, “you should”, Learning, Recommendation
- CLI copy / help changes
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
051–075   (shipped; see SPRINT-075 leftover table)                 ✅
076       Named-id-only observe on investigate_resource            ← this
077+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          inferred activity→Action (never, unless a later sprint
            explicitly reverses 051)
          similarity / recommendation / learning (v0.8)
          policy / execution (v0.9)
```

---

# Product / Contract Freezes

- MCP tools: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource` (exactly four; still read-only; no writes;
  existing `investigationId`; optional `resourceId` only when
  `investigationId` is named)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 071–075 sidecar shapes unchanged
- 049 compare semantics unchanged
- 056 / 059 subject-scoped fields still require live compose
- grouping `inv:` as Incident members frozen
- `occurredAt` frozen
- fifth tool / `get_investigation` / `list_investigations` frozen
- omitted-`investigationId` missing-Resource success frozen
- inferred latest-snapshot frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP
- `docs/public/MCP.md` investigate_resource row only (this Sprint)

---

# Migration / Upgrade

None required. Named-id-only observe is a read of existing 048 /
049 / 051 / 058 rows. No schema change. Callers who still pass
`resourceId` are unchanged.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as members, to rewrite `snapshot_json`, to copy snapshot JSON
onto live keys, or to succeed when `investigationId` is omitted:
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

- [ ] Sprint 076 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: named `investigationId` without `resourceId`
      derives the 048 subject and returns 074 (Resource exists)
      or 075 (Resource missing); omitted `investigationId` still
      requires `resourceId`; both-ids 075 unchanged; not a fifth
      tool; not snapshot JSON as the live body; not
      `list_investigations`
- [ ] if earned: CLI unchanged; no inferred latest; no `inv:`
      members; no `incident_id`; no MCP writes; no fifth tool
- [ ] if not earned: rejection documented; do not add a fifth tool
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged except AGENTS.md operational baseline and the
      `docs/public/MCP.md` investigate_resource row

---

# Final Principle

> **Sprint 075 let agents name an exact `inv:` id only if they
> also repeated the Resource id. Sprint 076 may let them omit
> that Resource id and take the subject from the 048 row.
> Combie must not invent the id, must not treat an Investigation
> as an Incident, must not put snapshot JSON on the live body,
> must not succeed when the id is omitted, must not add a fifth
> tool or an unfiltered list, and must not thaw MCP writes to
> ship CLI `investigation <id>` parity.**

---

# Completion Notes (2026-08-19)

## Phase 1 — Repository Understanding

HEAD `fd60ef3` (authoring-only working tree: AGENTS.md Active +
untracked `SPRINT-076.md`). Pins:

1. Today `resourceId` required even when `investigationId` is
   named? **Yes** — `z.string()` (no `.optional()`)
   (`src/mcp/tools.ts:238`); zod rejects a call without
   `resourceId` before the handler runs.
2. 048 row already stores `subjectResourceId`? **Yes** —
   `getSavedInvestigation` returns it
   (`src/app/investigations.ts:141`), and
   `compareInvestigationToCurrent` already keys off the named
   `inv:` id and returns `subjectResourceId` without any Resource
   id input (`src/app/compare-investigation.ts:949-983`).
3. Named-id-only + Resource exists: 074 payload (live keys +
   sidecars)? **Yes** — once the subject is known, the existing
   074 branch is byte-identical.
4. Named-id-only + Resource missing: 075 payload (live keys
   omitted; compare `subject_missing`)? **Yes** — the orphan gate
   (`tools.ts:415-419`) only needs `investigationSnapshot !==
   undefined`; its history lookup already keys off
   `investigationSnapshot.subjectResourceId`.
5. Both ids passed: 075 unchanged (mismatch still mismatch;
   aligned still 074 / 075)? **Yes** — when `resourceId` is
   non-blank the existing 071 mismatch gate runs verbatim.
6. Omitted `investigationId` + omitted `resourceId`: usage, not
   success? **Yes.** Phase 1 names the code: new
   `RESOURCE_ID_REQUIRED` (parallel to the tool's own
   `INVESTIGATION_ID_REQUIRED`; `RESOURCE_REF_REQUIRED` is the
   app-layer CLI-flavored code and never fit the MCP input
   contract, which zod previously rejected before the handler).
7. Omitted `investigationId` + missing Resource: still
   `RESOURCE_NOT_FOUND`? **Yes** — `investigationSnapshot ===
   undefined` rethrows, outer catch → `toolError`, `isError`
   true.
8. Blank `resourceId` with named `investigationId`: treat as
   omitted (derive), not mismatch against `""`? **Yes** — trim
   gate: `resourceId === undefined || resourceId.trim() === ""`
   → derive; only non-blank ids reach the raw-value mismatch
   check (unchanged behavior for padded ids).
9. `content[]`? **Same one-liner family** — 074 one-liner is
   ctx-derived (`subject.name`), 075 one-liner now interpolates
   the effective subject ref (identical to the caller-named
   `resourceId` when both ids are passed; names the derived
   subject on named-id-only, never `undefined`).
10. Tool description + `docs/public/MCP.md` row? **Yes**, that
    row only (input becomes optional `resourceId` when
    `investigationId` is named; derived-subject clause).
11. Fifth tool, grouping `inv:` as members, infer latest,
    `occurredAt`, omitted-id survival, `list_investigations`?
    **No.**
12. CLI `investigation <id>` / `--compare` / 075-when-both-ids /
    `get_related_context`? **No change.**

Wrap site: `src/mcp/tools.ts` `investigate_resource` — the
handler now computes a single effective `subjectRef`: named-id
gate block derives it from `comparison.subjectResourceId` when
`resourceId` is omitted/blank (no mismatch check), else keeps
the raw named id with the existing 071 mismatch gate; omitted
`investigationId` + omitted/blank `resourceId` throws
`RESOURCE_ID_REQUIRED`. Live compose (`getInvestigationContext`)
and the 075 orphan one-liner consume `subjectRef`. Everything
downstream (074 payload, 075 payload, sidecars) is untouched.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **No.** Read of existing 048 / 049 /
   051 / 058 rows only; reuses `compareInvestigationToCurrent`
   (returns `subjectResourceId`), `getSavedInvestigation`,
   `listInvestigations`, `listResolutions`,
   `listIncidentsForInvestigation`. No schema migration, no
   snapshot JSON rewrite.
2. Second source of truth? **No.** Snapshot = 048 row; compare =
   ephemeral 049; live compose = current local store when the
   Resource exists; derived subject = the 048
   `subjectResourceId`, not a first-seen heuristic.
3. Does deriving the subject leak "this Resource still exists"?
   **No** — 075 still omits live keys when compose cannot run.
4. Does this become snapshot-as-live-body? **No** — live keys
   stay omitted on the orphan path; snapshot stays
   `investigationSnapshot`; never copied to top-level `subject`.
5. Fifth tool needed? **No.** Named-id-only on this tool is the
   four-tool analog of `get_investigation`. `list_investigations`
   still has no four-tool home — not added.
6. Grouping snapshots leak? **No.** leftover[0] frozen;
   `incident --investigation` create stays usage.
7. Infer latest from `investigationHistory`? **No.** Named id
   only; test asserts the named (older) id wins while a newer
   snapshot exists; omitted id never auto-uses history[0].
8. Omitted-`investigationId` survival? **No.**
9. Does optional `resourceId` change `investigate_resource`
   identity into `get_investigation`? **No** — omitted
   `investigationId` still requires `resourceId` (new usage
   code) and live compose remains the body when the Resource
   exists.
10. Canon change? AGENTS.md operational baseline + the existing
    `docs/public/MCP.md` investigate_resource row. Not VISION /
    ARCHITECTURE / ROADMAP / SKILL.

No STOP conflict.

## Implemented

- `src/mcp/tools.ts` `investigate_resource`: `resourceId`
  schema becomes `.optional()` with a describe clause
  ("Optional when investigationId is named: the subject is then
  taken from that investigation's retained 048 row
  (subjectResourceId)"); tool description gains the
  named-id-only clause and keeps every existing sentence
  (`subject Resource is missing`, `subject_missing`,
  omitted-id `RESOURCE_NOT_FOUND` all intact). Handler computes
  `subjectRef`: named `investigationId` + omitted/blank
  `resourceId` → subject from `comparison.subjectResourceId`,
  no mismatch check; named + non-blank → existing 071 raw-value
  mismatch gate, `subjectRef` = named id; omitted
  `investigationId` + omitted/blank `resourceId` → new
  `RESOURCE_ID_REQUIRED` usage error (never
  `RESOURCE_NOT_FOUND` for an id never named, never
  `INVESTIGATION_ID_REQUIRED`); live compose consumes
  `subjectRef`; 075 one-liner names `subjectRef`. Both-ids path,
  074 payload, 075 payload, sidecar shapes: unchanged.
- `tests/app/mcp-protocol.test.ts` new Sprint 076 describe: six
  tests — (a) named-id-only + Resource exists → 074 (named
  older snapshot wins over newer, live `subject.id` =
  `subjectResourceId`, compare `available`, `knownFacts`
  present, history DESC, one-liner, four tools + annotations +
  no fifth tool, description clauses, digest unchanged,
  `snapshot_json` free of sidecar keys); (b) named-id-only +
  Resource deleted → 075 (no live keys, compare
  `subject_missing`, snapshot id matches, one-liner never says
  `undefined`, both-ids orphan unchanged, digest unchanged);
  (c) blank / whitespace `resourceId` + named id → derived, not
  mismatch, one-liner equals the derived-subject text; (d)
  omitted `investigationId` + omitted / blank `resourceId` →
  `RESOURCE_ID_REQUIRED` usage, not "Resource not found"; (e)
  unknown `investigationId` without `resourceId` →
  `INVESTIGATION_NOT_FOUND`, no consolation snapshot; (f)
  named-id-only shows `investigationResolutionMemory` /
  `investigationIncidentMemory` / `investigationHistory` when
  rows exist and omits them when empty (per-subject isolation).
- `docs/public/MCP.md` investigate_resource row: input becomes
  "exact `resourceId` (optional when `investigationId` is
  named); optional `investigationId`"; structured-result prose
  gains the derived-subject clause and the omitted-both usage
  sentence. That row only.

## Deviations

None. Phase 1 named the omitted-both code: `RESOURCE_ID_REQUIRED`
(not `RESOURCE_REF_REQUIRED`, which is the app-layer code for
blank resource refs on the investigate path and was never the
MCP input contract; the sprint allowed a new code if none fit).

## Validation

```text
baseline:          fd60ef3 docs(sprints): mark 075 complete
                   1104 pass / 78 files / 5563 expect()
bun test:          1110 pass across 78 files (5663 expect()
                   calls) — 6 new Sprint 076 tests
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir $TMP/combie-dogfood-076.* (never ./.combie)
                   seed sentry:project:450 (Store fixture)
                   investigate sentry:project:450 --save → inv:2c1672e7…
                   MCP named inv:2c1672e7… without resourceId:
                     snapshot.id matches; live subject.id =
                     sentry:project:450 (074); compare available;
                     one-liner "Investigation context for combie…";
                     digest unchanged
                   DELETE FROM resources WHERE id = 'sentry:project:450'
                   MCP omitted investigationId: RESOURCE_NOT_FOUND /
                     isError
                   MCP named inv:8b727057… without resourceId: 075
                     orphan — isError not set; no top-level subject /
                     knownFacts; compare currentStatus subject_missing;
                     snapshot.id matches; one-liner names the derived
                     subject (no "undefined"); digest unchanged
                   MCP named inv:8b727057… + original resourceId: 075
                     unchanged (subject_missing)
                   MCP omitted both ids: RESOURCE_ID_REQUIRED usage /
                     isError
                   investigation inv:2c1672e7…: CLI reopen unchanged
                     (exit 0, snapshot banner)
                   investigation inv:8b727057… --compare: subject_missing
                     (exit 0; "Current compose is unavailable … remains
                     reopenable")
                   incident --investigation inv:a --investigation inv:b:
                     still usage (leftover[0] frozen)
                   four tools; no list_investigations / get_investigation
                   Founder .combie/combie.db (245760 bytes) and
                     ~/.combie/combie.db (135168 bytes) mtime/size
                     unchanged.
```

## Learnings

- The 048 row already was the subject authority inside the MCP
  tool: `compareInvestigationToCurrent` returns
  `subjectResourceId` and the 075 orphan history lookup already
  keyed off `investigationSnapshot.subjectResourceId`. Making
  `resourceId` optional was a single `subjectRef` derivation in
  the handler — zero app/store changes, matching Sequencing Rule
  9 (persistence not necessary).
- The trim gate must distinguish "named but blank" from "omitted"
  per input: blank `investigationId` stays
  `INVESTIGATION_ID_REQUIRED` (071 gate), while blank
  `resourceId` with a named id means "derive the subject" (076)
  — and blank `resourceId` with omitted id means usage
  (`RESOURCE_ID_REQUIRED`). One trim helper, three different
  meanings, each already covered by the 071 / 076 tests.
- The 075 orphan one-liner interpolated the caller-named
  `resourceId`; switching it to the effective `subjectRef` is
  exactly the same string when both ids are passed (aligned) and
  becomes the derived subject on named-id-only — the one-liner
  never shows "undefined".
- Existing 071 / 075 test blocks still pass untouched: the
  both-ids and omitted-id paths were preserved byte-for-byte by
  keeping the raw-value mismatch check and rethrow branch as-is.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md
baseline becomes Sprints 001–076 complete.
`docs/public/MCP.md` investigate_resource row gains the
named-id-only observe (optional `resourceId` when
`investigationId` is named; derived subject; omitted-both usage).
Grouping Investigation snapshots as Incident members remains
unearned. Fifth-tool snapshot reopen / `list_investigations`
remains unearned. `occurredAt` remains unearned.
