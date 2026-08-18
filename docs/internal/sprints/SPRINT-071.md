# SPRINT-071 — Investigation Compare on investigate_resource

> **Status:** Complete
> **Depends on:** SPRINT-070 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.6 Investigation
> historical retrieval on the agent investigate path already in use,
> after 070 snapshot pointers exist so an agent can name an exact
> `inv:` id. Sprint 070 leftover list is **not** a sequence.
> leftover[0] **group Investigations as Incident members** stays
> **unearned** (Investigation ≠ Incident; members stay `res:`).
> leftover[1] **snapshot reopen / list / compare MCP** is split:
> fifth-tool reopen / `list_investigations` stay frozen; this Sprint
> takes **named-id compare observe** on the existing
> `investigate_resource` (049 analog). Does **not** authorize
> Recommendation, Learning, similarity, Investigation lifecycle,
> MCP writes, a fifth tool, inferred Action, grouping snapshots as
> members, `occurredAt`, snapshot JSON on the live compose, or
> inferred “compare to latest.”
> **Roadmap:** `docs/internal/ROADMAP.md` v0.6 Investigation —
> **exact-id compare-to-current on existing `investigate_resource`**,
> plus v0.4 CLI + MCP parity for that 049 surface; not lifecycle,
> not the Investigation Engine, not snapshot reopen MCP, not a
> fifth tool, not MCP writes
> **Type:** Narrow additive MCP field over the existing ephemeral
> 049 `InvestigationCompare` (named `inv:` id; live compose of the
> same subject)
> **Primary goal:** When an agent investigates an exact Resource
> through the existing `investigate_resource` tool and names one
> exact snapshot id, Combie returns the 049 snapshot-versus-current
> comparison as an additive structured field — omitted when the id
> is not passed, never mixed into Known Facts, never persisted,
> never a fifth tool — without grouping `inv:` as Incident members
> and without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. This
> Sprint adds an optional **input** (`investigationId`) and an
> optional **field** on `investigate_resource` only. No fifth tool.
> No snapshot reopen / `list_investigations` / `compare_investigation`
> tools. No writes. `investigationHistory` / `resolutionMemory` /
> `incidentMemory` unchanged when the new input is omitted.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 070 shipped MCP snapshot **pointers** on live investigate:

```text
investigate_resource({ resourceId })
  live compose + investigationHistory [{ id, composedAt }, …]
```

Agents can see that `inv:` rows exist. They still cannot ask the
049 question on that same tool:

```text
What differs between this named snapshot and the current compose
of the same subject?
```

CLI already answers it:

```text
investigation <id> --compare
```

Sprint 070 leftover:

```text
071+      group Investigations directly only if earned
          snapshot reopen / list / compare MCP only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
070 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. leftover[0] stays
unearned.

leftover[1] **snapshot reopen / list / compare MCP** conflates three
objects. 070 already shipped subject-scoped **list observe**
(`investigationHistory`). **Reopen** (full snapshot JSON /
`InvestigationContext` as the tool body) stays a fifth tool or a
semantic replacement of live compose — frozen. **Compare** is the
049 object: ephemeral SAME / SNAPSHOT ONLY / CURRENT ONLY /
AUTHORITY CLOCK over two composes. It is not snapshot JSON. It is
not a fifth tool if it rides the existing live investigate tool
the way 056 / 070 did.

This Sprint **splits** leftover[1]:

```text
fifth tool / list_investigations / snapshot reopen
  → still frozen
additive investigationCompare on existing investigate_resource
  (optional investigationId; 049 semantics)
  → this Sprint
```

No founder override is required. leftover[0] is skipped because it
conflicts with Investigation ≠ Incident. Compare-on-existing-tool
is earned because 070 shipped named `inv:` pointers on that tool
and CLI `--compare` already exists. Do not infer “latest snapshot.”
The agent must name the id.

It is **not** grouping Investigation snapshots as Incident members.
`--investigation` on `incident` create stays usage.

It is **not** 048 snapshot reopen MCP. Live compose stays the
tool body. Compare is a sidecar field. Do not return snapshot JSON
as `structuredContent` of the investigation.

It is **not** 050 `investigations` / unfiltered list MCP.

It is **not** 069 INVESTIGATION HISTORY on CLI `--compare`. CLI
`--compare` stays 049. MCP live compose may still include
`investigationHistory` (070) when rows exist; that is not a
HISTORY section inside the compare object.

It is **not** MCP writes, a fifth tool, lifecycle, `occurredAt`,
or inferred snapshots from provider activity.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Sequencing Rules (smallest deterministic
version; is persistence necessary; do not start a generic engine):

```text
exact evidence
    ↓
deterministic composition                          ← 043–047
    ↓
persist retained composition                       ← 048
    ↓
compare retained vs current                        ← 049 CLI
    ↓
retrieve retained compositions by subject          ← 050
    ↓
point at those rows on the compose path in use     ← 069 CLI / 070 MCP
    ↓
MCP observe of named-id compare                    ← this Sprint
    ↓
earned abstraction / fifth-tool reopen             ← not this Sprint
```

`docs/internal/ROADMAP.md` v0.4 names CLI + MCP parity for core
read surfaces. `investigate_resource` is that surface.
`--compare` is the 049 read surface. This Sprint puts that
comparison on the existing tool when the agent names an `inv:` id
070 already returned.

Sequencing Rule 9: persistence is **not** necessary. Reuse
`compareInvestigationToCurrent`. Do not store the comparison. Do
not rewrite `snapshot_json`. Do not UPDATE `composed_at`.

Sequencing Rule 8: snapshot identity has one source of truth —
the 048 Investigation row. The agent names an exact `inv:` id.
Do not infer “latest,” “similar,” or members.

Sequencing Rule 2: 049 CLI `--compare`, 069 HISTORY, and 070
`investigationHistory` stay those paths. This Sprint does not
replace them.

Sequencing Rule 4: the new claim is “for this named snapshot vs
the current compose of this exact subject, these sections are
SAME / SNAPSHOT ONLY / CURRENT ONLY / AUTHORITY CLOCK,” not
“this snapshot is current provider truth,” not “these
Investigations are an Incident,” and not “here is the snapshot
JSON.”

---

# Problem

After 070:

```text
investigate_resource({ resourceId })
  investigationHistory: [{ id: inv:a, composedAt: … }, …]

investigation inv:a --compare     # CLI 049
investigate_resource              # no compare field; no investigationId input
```

The agent can name `inv:a` and still cannot obtain the 049
comparison without a CLI. That is the 052 hole for compare:
the path already in use omits the record the human already has.

---

# Product Question

> After Investigation snapshot pointers exist on
> `investigate_resource`, can that same tool return the 049
> snapshot-versus-current comparison when the agent names one
> exact `inv:` id — omitted when the id is not passed, never
> mixed into Known Facts or snapshot JSON, without a fifth tool,
> without inferred “latest,” without grouping `inv:` as Incident
> members, and without MCP writes?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.6** already shipped 049 compare
   on CLI. **v0.4** names CLI + MCP parity. 070 made `inv:` ids
   visible on the agent investigate path. The next smallest
   version of 049 is that same comparison on that path.
2. **Sprint 070 leftover** lists grouping snapshots as members
   first, only *if earned*. leftover[0] stays frozen. leftover[1]
   is three claims; 070 already did list-observe. Reopen stays
   fifth-tool. This Sprint takes named-id compare.
3. **Existing primitive check:** `compareInvestigationToCurrent`
   already returns `InvestigationCompare`. Additive MCP fields
   are the 047 / 056 / 059 / 070 pattern. Four tools stay four
   tools. Optional `investigationId` is the named-id input 049
   already requires on CLI.
4. **Sequencing Rule 9:** persistence is **not** required.
5. **Founder override 2026-08-16** froze MCP *writes*. This is a
   read. It does not authorize `list_investigations`, snapshot
   reopen, or writes.

Rejected as 071 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Fifth tool / `list_investigations` / snapshot reopen | Frozen four-tool contract; reopen would replace live compose with snapshot JSON |
| Unfiltered investigations list MCP | No four-tool home; 070 left orphan-subject survival CLI-only |
| Infer compare vs latest `investigationHistory[0]` | 049 is named id; do not invent the snapshot |
| Put snapshot JSON / `InvestigationContext` on the live body | Mixes retained composition into current truth |
| HISTORY section inside the compare object | 069 freeze on CLI `--compare`; keep 070 history as the live sidecar |
| `occurredAt` | Second time field |
| Investigation lifecycle | Status is still a process claim |
| MCP writes | Founder override; policy is v0.9 |
| Similarity / “you should” | Forbidden |

---

# Exact Capability

```text
investigate_resource({ resourceId, investigationId? })
        ↓
compose InvestigationContext for resourceId (unchanged)
investigationHistory as 070 when rows exist
        ↓
if investigationId omitted / undefined:
  structuredContent unchanged from 070 (no investigationCompare)
        ↓
if investigationId present:
  require exact inv: id (blank → usage)
  compareInvestigationToCurrent({ investigationId })
  snapshot.subjectResourceId must equal resourceId
    else fail (do not compare a different subject)
  additive investigationCompare = InvestigationCompare
  (049 structured object; not CLI essay; not snapshot JSON)
        ↓
InvestigationContext and snapshot_json unchanged
comparison is not persisted
```

CLI `investigate`, `investigation <id>` reopen, `--compare`,
`investigations --resource`, 069 INVESTIGATION HISTORY, 070
`investigationHistory`, 052 RESOLUTION MEMORY, and 059 INCIDENT
MEMORY are unchanged when `investigationId` is omitted.

`get_related_context` is unchanged.

`--save` must **not** serialize `investigationCompare` into
`snapshot_json`. Compare stays ephemeral.

Exact field / input spelling is Phase 1. Expected input:
**`investigationId`**. Expected field:
**`investigationCompare`** (CLI banner INVESTIGATION COMPARE).
Not `compare`. Not `investigationHistory`. Not a formatted essay
string.

Payload constraints:

- Named exact id only. No latest. No substring. No similarity.
- Subject alignment: snapshot `subjectResourceId` === `resourceId`.
- Same 049 object: `snapshotId`, `subjectResourceId`,
  `snapshotComposedAt`, `comparedAt`, `currentStatus`, `sections`.
  Phase 1 may pin a subset if `safeJson` / size requires it;
  expected: **the existing `InvestigationCompare` shape** (already
  JSON-safe; no snapshot JSON inside).
- Distinct from `knownFacts`, `missingContext`, `providerActivity`,
  `timeline`, `sharedCommitContext`, `sharedCommitCorrespondences`,
  `resolutionMemory`, `incidentMemory`, and `investigationHistory`.
- Labeled ephemeral compare of retained composition vs current
  local compose; not current provider truth; not an incident.
  Tool description clause (expected: **description only**).
- Omit `investigationCompare` when `investigationId` is omitted.
  When the id is present and valid, **always include** the field
  (including all-SAME / MATCH). Requested compare is the answer.
- `content[]` one-liner stays compose summary. Do not dump compare
  essays or snapshot JSON into `content[]`.
- Live compose still requires the Resource. Deleted-subject
  `subject_missing` stays CLI `--compare` (070 did not add an MCP
  survival path; this Sprint does not either).
- Unknown `inv:`: existing `INVESTIGATION_NOT_FOUND` (fail the
  call; no consolation live compose mixed with a fake compare).
  Phase 1 confirms fail-the-call vs live-plus-error; expected:
  **fail the call** (CLI `--compare` does not print a live
  investigate body on missing id).
- Blank `investigationId`: usage, not “latest.”

The four-tool list is unchanged:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

---

# Evidence / Claim Semantics

### KNOWN (about the field)

```text
For named snapshot <inv:id> versus the current local compose of
subject <resource-id>, these 049 sections are SAME / SNAPSHOT ONLY
/ CURRENT ONLY / AUTHORITY CLOCK as of comparedAt.
```

Omitting `investigationId` is **not** known-empty compare. It is
the 070 tool. Do not invent a compare.

### UNKNOWN / stale (required)

The comparison is **not** current provider authority. It does not
re-validate providers, does not rewrite the snapshot, and does not
imply the snapshot is an Incident or a recommendation.

`currentStatus` on MCP is `available` when live compose ran
(required for this tool). Do not surface CLI `subject_missing` on
this path.

### Forbidden

```text
These snapshots prove the current provider state
Compare to the latest investigationHistory row
These Investigations are an Incident
You should reopen / rollback
resolved: true / this investigation is closed
This field is Known Facts
Saving an investigation freezes investigationCompare into the snapshot
This payload is the snapshot JSON / InvestigationContext
```

---

# Architecture

```text
investigations table (048)                         unchanged
        ↓
compareInvestigationToCurrent                      049, unchanged
        ↓
investigate_resource structuredContent
  optional investigationId input
  additive investigationCompare (this Sprint)
```

Ownership:

- **Domain / Store:** no new type. No new column. No `incident_id`.
  Do not store `inv:` ids as Incident members. Do not rewrite
  `snapshot_json` or `composed_at`. Do not persist `comparedAt`.
- **App:** reuse `compareInvestigationToCurrent`. No new CLI
  helper. MCP projection name is Phase 1; expected pass the
  `InvestigationCompare` object through `safeJson` (no essay
  formatter).
- **CLI:** unchanged, including `--compare` and 069 HISTORY.
- **MCP:** optional `investigationId` on `investigate_resource`.
  Additive `investigationCompare` when that id is valid and
  subject-aligned. Tool description clause.
  `docs/public/MCP.md` investigate_resource row only (input +
  result).
- **Compare CLI / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as Incident members, to put snapshot JSON on the live body, to
infer latest, or to persist compare: **STOP.**

---

# Persistence vs Read-Time

| Snapshot JSON | 049 compare | investigate_resource |
| --- | --- | --- |
| Frozen InvestigationContext | Ephemeral object | Additive field when named |
| Unchanged JSON | not stored | omitted when id omitted |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- rewrite snapshot JSON
- rewrite `composed_at`
- put snapshots on `InvestigationContext`
- persist `investigationCompare` / `comparedAt`
- add MCP tools or writes
- return snapshot JSON as the live body
- infer compare vs `investigationHistory[0]`
- create Relationships or Changes
- refresh providers
- add Investigation lifecycle / `resolved: true`

---

# Boundedness

- Existing `investigate_resource` tool. No fifth tool. No new verb.
- Compare only when the agent names an exact `inv:` id whose
  subject is this Resource.
- No grouping of Investigation snapshots as Incident members.
- No CLI change. No `--compare` change. No snapshot schema change.
- `MAX_INVESTIGATION_FACTS = 5` unchanged. Compare is not facts.
- No extra hop. No provider calls. No schema migration.

---

# Failure / Unknown Semantics

- `investigationId` omitted: 070 behavior. No compare field.
- Blank `investigationId`: usage (require an id).
- Unknown `inv:`: `INVESTIGATION_NOT_FOUND`. Fail the call.
- Snapshot subject ≠ `resourceId`: fail. Phase 1 names the code
  (expected: distinct from `INVESTIGATION_NOT_FOUND`; do not
  silently compare the snapshot’s subject).
- Resource missing: existing `RESOURCE_NOT_FOUND` (compose did not
  run). No consolation compare. CLI `subject_missing` stays
  `--compare` only.
- Untrusted snapshot JSON: existing 048
  `INVESTIGATION_SNAPSHOT_UNTRUSTED` from
  `compareInvestigationToCurrent` / `getSavedInvestigation`.
- `--investigation` / `--resource` on `incident`: existing usage.

---

# Affected Surfaces

### CLI

Unchanged. 049 `--compare` stays. 069 HISTORY stays. 070 is MCP-only
for this Sprint.

### MCP

Four tools. Optional `investigationId` on `investigate_resource`.
Additive `investigationCompare` when that id is valid and
subject-aligned. `docs/public/MCP.md` investigate_resource row
(expected: **yes**, input + result). Tool description clause
(expected: **yes**).

### Compare (CLI)

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.6
049 compare and v0.4 agent boundary, this Sprint, SPRINT-049
`InvestigationCompare`, SPRINT-070 leftover split / MCP freeze,
and inspect:

- `src/mcp/tools.ts` `investigate_resource` inputSchema and
  `investigationHistory` spread
- `compareInvestigationToCurrent` / `InvestigationCompare`
- `tests/app/mcp-protocol.test.ts` four-tool freeze
- `docs/public/MCP.md` investigate_resource row
- leftover[0] `incident --investigation` usage
- `safeJson` on nested compare sections

Report:

1. Input name: `investigationId` vs `snapshotId`? Expected:
   **`investigationId`.**
2. Field name: `investigationCompare` vs `compare`? Expected:
   **`investigationCompare`.**
3. Omit when id omitted vs always-present `null`? Expected:
   **omit.** `safeJson` undefined→null; use conditional spread.
4. Full `InvestigationCompare` vs summaries? Expected: **049
   object** (not snapshot JSON, not CLI essay).
5. Subject mismatch: fail vs silent? Expected: **fail.**
6. Unknown id: fail the call vs live compose without compare?
   Expected: **fail the call.**
7. `content[]` one-liner unchanged? Expected: **yes.**
8. Tool description + `docs/public/MCP.md` row? Expected: **yes**,
   that row only (input + result).
9. Fifth tool, grouping `inv:` as members, infer latest,
   `occurredAt`? Expected: **no.**
10. CLI `--compare` / snapshot JSON / `get_related_context`?
    Expected: **no change.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? Compare is ephemeral 049; snapshot
   remains 048; live compose remains current local store.
3. Does showing SAME / SNAPSHOT ONLY leak “you should”? **No**, if
   labeled not a recommendation — no rank, no “reopen.”
4. Does this become snapshot reopen MCP? **No.** Live compose stays
   the body. Compare is not snapshot JSON.
5. Fifth tool needed? Expected: **no.**
6. Grouping snapshots leak? **No.** leftover[0] frozen.
7. Infer latest from `investigationHistory`? Expected: **no.**
8. `incident_id` / lifecycle / `occurredAt`? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + the
   existing `docs/public/MCP.md` investigate_resource row. Not
   VISION / ARCHITECTURE / ROADMAP / SKILL.

If implementation is tempted to add `compare_investigation` /
`get_investigation`, to put snapshot JSON on the live body, to
infer latest, to store `inv:` as Incident members, or to persist
compare: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- still exactly four tools; annotations unchanged
- omitted `investigationId`: no `investigationCompare` key; 070
  `investigationHistory` still works
- named matching `inv:`: `investigationCompare.snapshotId` equals
  that id; `currentStatus` is `available`; sections present;
  digest unchanged
- other subject’s snapshot id fails (no silent cross-subject
  compare)
- unknown id fails; no compare payload
- blank id is usage
- not present on `knownFacts` / `missingContext` / snapshot JSON
- `--save` snapshot JSON still has no compare field
- CLI `--compare` unchanged
- leftover[0]: `incident --investigation` still usage
- no `list_investigations` / `compare_investigation` /
  `get_investigation` tool
- no write tool; no `occurredAt` on the compare object beyond 049
  `comparedAt`
- do not auto-compare `investigationHistory[0]` when id omitted

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names. Never
write to `./.combie`. Use a **script file** for argv (not
`bun -e … "$DIR"`). Invoke the CLI as `bun src/cli/index.ts … --dir`
(not `bun run`, which can swallow `--dir`). Run MCP scripts from
the repo so `@modelcontextprotocol/client` resolves.

```text
investigate <id> --save                          # inv:a
# MCP investigate_resource({ resourceId }): investigationHistory,
#   no investigationCompare
# MCP investigate_resource({ resourceId, investigationId: inv:a }):
#   investigationCompare.snapshotId = inv:a; currentStatus available
# MCP with other subject’s inv: fail
# MCP with inv:missing: fail
# MCP with investigationId "": usage / fail
investigation inv:a --compare                    # CLI unchanged
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
- a fifth MCP tool (`list_investigations`, snapshot reopen, compare
  tool)
- snapshot JSON / full `InvestigationContext` as the live body
- inferred compare vs latest history row
- MCP writes
- snapshot JSON rewrite
- INVESTIGATION HISTORY on CLI `--compare`
- Investigation or Incident lifecycle / `resolved: true`
- `occurredAt`
- `incident_id` on Resolution rows
- deleting snapshots
- similarity, “you should”, Learning, Recommendation
- CLI copy / help changes
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
051–070   (shipped; see SPRINT-070 leftover table)                 ✅
071       Investigation compare on investigate_resource            ← this
072+      group Investigations directly only if earned
          snapshot reopen MCP / list_investigations only if earned
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
  optional `investigationId` + additive `investigationCompare`)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 CLI compare semantics unchanged
- 050 `investigations --resource` unchanged
- 069 CLI INVESTIGATION HISTORY unchanged
- 070 `investigationHistory` unchanged when `investigationId` omitted
- 052 / 056 resolution memory unchanged
- 059 incident memory unchanged
- grouping `inv:` as Incident members frozen
- `occurredAt` frozen
- fifth tool / snapshot reopen / `list_investigations` frozen
- inferred latest-snapshot compare frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP
- `docs/public/MCP.md` investigate_resource row only (this Sprint)

---

# Migration / Upgrade

None required. Compare is ephemeral 049. No schema change.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as members, to rewrite `snapshot_json`, to return snapshot
JSON as the live body, or to infer latest: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 071 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `investigate_resource` with named `investigationId`
      returns 049 `investigationCompare` for that exact subject;
      omitted when the id is not passed; not a fifth tool; not
      snapshot JSON as the live body
- [x] if earned: CLI unchanged; no inferred latest; no `inv:`
      members; no `incident_id`; no MCP writes; no fifth tool
- [x] if not earned: rejection documented; do not add a fifth tool
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and the
      `docs/public/MCP.md` investigate_resource row

---

# Final Principle

> **Sprint 070 showed agents which snapshots exist. Sprint 071 may
> let them name one exact `inv:` id and observe the 049 compare
> already on CLI. Combie must not invent the id, must not treat an
> Investigation as an Incident, must not put snapshot JSON on the
> live body, must not add a fifth tool, and must not thaw MCP
> writes to ship the compare.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `57ce977` (authoring-only working tree: AGENTS.md Active +
untracked `SPRINT-071.md`). Pins:

1. Input name: **`investigationId`.**
2. Field name: **`investigationCompare`.**
3. Omit when id omitted: **omit the key** (conditional spread;
   `safeJson` maps `undefined`→`null`).
4. Payload: **full 049 `InvestigationCompare` object** (not CLI
   essay, not snapshot JSON).
5. Subject mismatch: **fail**, `INVESTIGATION_SUBJECT_MISMATCH`.
6. Unknown id: **fail the call**, `INVESTIGATION_NOT_FOUND`.
7. `content[]` one-liner: **unchanged.**
8. Tool description + `docs/public/MCP.md` investigate_resource
   row: **yes**, that row only (input + result).
9. Fifth tool / grouping `inv:` as members / infer latest /
   `occurredAt`: **no.**
10. CLI `--compare` / snapshot JSON / `get_related_context`: **no
    change.**

Wrap site: `src/mcp/tools.ts` `investigate_resource` after live
compose + 070 history loads. Reuse `compareInvestigationToCurrent`.
leftover[0] `incident --investigation` stays usage. On this MCP
path after successful live compose + subject match,
`currentStatus` is `"available"`.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **No.**
2. Second source of truth? **No.** Compare is ephemeral 049;
   snapshot remains 048; live compose remains current local store.
3. “You should reopen”? **No** — description label only; no rank,
   no Show line on MCP.
4. Snapshot reopen MCP? **No.** Live compose stays the body.
   Compare is not snapshot JSON.
5. Fifth tool needed? **No.**
6. Grouping snapshots leak? **No.** leftover[0] frozen.
7. Infer latest from `investigationHistory`? **No.**
8. `incident_id` / lifecycle / `occurredAt`? **No.**
9. Canon? AGENTS.md operational baseline + `docs/public/MCP.md`
   investigate_resource row only.

No STOP conflict.

## Implemented

- Optional `investigationId` on existing `investigate_resource`.
- Additive `investigationCompare` = 049 `InvestigationCompare`
  when that id is valid and `subjectResourceId` equals
  `resourceId`. Omit the key when the input is omitted. Always
  include when named and valid (including all-SAME).
- Blank / whitespace `investigationId`: `INVESTIGATION_ID_REQUIRED`.
- Unknown id: existing `INVESTIGATION_NOT_FOUND` (fail the call).
- Cross-subject id: `INVESTIGATION_SUBJECT_MISMATCH` (fail; no
  silent compare of the snapshot’s subject).
- Tool description clause: ephemeral snapshot-versus-current
  comparison; not current provider truth, not an incident, not a
  recommendation, not snapshot reopen.
- `docs/public/MCP.md` investigate_resource row only (input +
  result).
- `content[]` one-liner unchanged. Compare not mixed into Known
  Facts / Missing Context / snapshot JSON.
- CLI `--compare`, 069 HISTORY, 070 `investigationHistory` when
  id omitted, `get_related_context` unchanged.
- leftover[0]: `incident --investigation` still usage.
- Four tools. No `list_investigations` / `compare_investigation` /
  `get_investigation`. No MCP writes.

## Deviations

None.

## Validation

```text
baseline:          57ce977 docs(sprints): mark 070 complete
                   1097 pass / 78 files / 5283 expect()
                   (first 070-complete run: 1096 pass / 1 fail
                   MCP 066 digest flake, not this slice)
bun test:          1098 pass across 78 files (5329 expect() calls)
                   (first post-impl run: 1097 pass / 1 fail MCP
                   061 digest flake; isolation + retry passed)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-071-dogfood.* (never ./.combie)
                   investigate --save inv:a / inv:b
                   MCP omitted id: investigationHistory, no
                     investigationCompare
                   MCP named inv:a: investigationCompare.snapshotId
                     = inv:a; currentStatus available
                   MCP other subject’s inv: fail
                   MCP inv:missing: fail
                   MCP investigationId "": fail
                   investigation inv:a --compare: INVESTIGATION
                     COMPARE, no HISTORY
                   incident --investigation still usage
                   four tools; digest unchanged after MCP reads
                   snapshot JSON has no compare field / heading
                   Isolated dogfood left founder .combie/combie.db
                   mtime/size unchanged.
```

One MCP stdio digest assertion (Sprint 056/061/066, not this
slice) can flake under parallel `bun test`; isolation and this
full-suite retry passed. Four tools and no writes held.

## Learnings

- Compare after live compose is required so a missing Resource
  stays `RESOURCE_NOT_FOUND`; subject mismatch must still fail
  the whole call because `compareInvestigationToCurrent` always
  composes the snapshot’s subject.
- Do not auto-compare `investigationHistory[0]`. Omitted id is
  the 070 tool, not known-empty compare.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md
baseline becomes Sprints 001–071 complete.
`docs/public/MCP.md` investigate_resource row gains optional
`investigationId` and ephemeral `investigationCompare`. Sprint
072 is not started. Grouping Investigation snapshots as Incident
members remains unearned. Fifth-tool snapshot reopen /
`list_investigations` remains unearned. `occurredAt` remains
unearned.
