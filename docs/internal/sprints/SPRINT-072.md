# SPRINT-072 — Investigation Snapshot on investigate_resource

> **Status:** Complete
> **Depends on:** SPRINT-071 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.6 Investigation
> historical retrieval on the agent investigate path already in use,
> after 071 named-id compare exists so an agent can name an exact
> `inv:` id. Sprint 071 leftover list is **not** a sequence.
> leftover[0] **group Investigations as Incident members** stays
> **unearned** (Investigation ≠ Incident; members stay `res:`).
> leftover[1] **snapshot reopen MCP / `list_investigations`** is
> split: fifth-tool `get_investigation` / `list_investigations`
> stay frozen; this Sprint takes **named-id snapshot observe** on
> the existing `investigate_resource` (048 analog). Does **not**
> authorize Recommendation, Learning, similarity, Investigation
> lifecycle, MCP writes, a fifth tool, inferred Action, grouping
> snapshots as members, `occurredAt`, replacing live compose with
> snapshot JSON, unfiltered list MCP, or inferred “latest
> snapshot.”
> **Roadmap:** `docs/internal/ROADMAP.md` v0.6 Investigation —
> **exact-id snapshot reopen on existing `investigate_resource`**,
> plus v0.4 CLI + MCP parity for that 048 surface; not lifecycle,
> not the Investigation Engine, not a fifth tool, not MCP writes,
> not `list_investigations`
> **Type:** Narrow additive MCP field over the existing 048
> `SavedInvestigation` snapshot (named `inv:` id; live compose of
> the same subject stays the tool body)
> **Primary goal:** When an agent investigates an exact Resource
> through the existing `investigate_resource` tool and names one
> exact snapshot id, Combie returns the 048 retained composition
> as an additive structured field — omitted when the id is not
> passed, never mixed into live Known Facts, never replacing live
> compose, never persisted as a rewrite, never a fifth tool —
> without grouping `inv:` as Incident members and without thawing
> MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. This
> Sprint adds an optional **field** on `investigate_resource` only
> (reuses the 071 `investigationId` input). No fifth tool. No
> `get_investigation` / `list_investigations` / snapshot-reopen
> tool. No writes. `investigationCompare` / `investigationHistory`
> / `resolutionMemory` / `incidentMemory` unchanged when the input
> is omitted. When `investigationId` is present and valid, 071
> compare stays; this Sprint adds the sibling snapshot field.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 071 shipped named-id **compare** on live investigate:

```text
investigate_resource({ resourceId, investigationId? })
  live compose
  investigationHistory [{ id, composedAt }, …]
  investigationCompare                 # when investigationId named
```

Agents can name `inv:a` and see SAME / SNAPSHOT ONLY / CURRENT
ONLY / AUTHORITY CLOCK. They still cannot ask the 048 question on
that same tool:

```text
What was the retained composition at composedAt for this named
snapshot?
```

CLI already answers it:

```text
investigation <id>
```

Sprint 071 leftover:

```text
072+      group Investigations directly only if earned
          snapshot reopen MCP / list_investigations only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
071 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. leftover[0] stays
unearned.

leftover[1] **snapshot reopen MCP / `list_investigations`**
conflates two objects. 070 already shipped subject-scoped **list
observe** (`investigationHistory`). Unfiltered `investigations`
and orphan-subject list have no four-tool home — frozen.
**Reopen** in 071 meant “full snapshot JSON /
`InvestigationContext` as the tool body” (fifth tool or a
semantic replacement of live compose) — that stay frozen. The
048 **object** is the retained composition: `id`, `composedAt`,
frozen `InvestigationContext`. It is not live compose. It is
not `investigationCompare`. It is not a fifth tool if it rides
the existing live investigate tool the way 056 / 070 / 071 did.

This Sprint **splits** leftover[1]:

```text
fifth tool / list_investigations / get_investigation
  / replace live body with snapshot JSON
  → still frozen
additive investigationSnapshot on existing investigate_resource
  (named investigationId already on the tool; 048 semantics)
  → this Sprint
```

No founder override is required. leftover[0] is skipped because it
conflicts with Investigation ≠ Incident. Snapshot-on-existing-tool
is earned because 071 shipped named `inv:` input on that tool
and CLI `investigation <id>` already exists. Do not infer
“latest snapshot.” The agent must name the id. Do not add a
second input; reuse `investigationId`.

It is **not** grouping Investigation snapshots as Incident members.
`--investigation` on `incident` create stays usage.

It is **not** replacing live compose with snapshot JSON. Live
compose stays the tool body. Snapshot is a sidecar field.

It is **not** 050 `investigations` / unfiltered list MCP.

It is **not** CLI `investigation <id>` wrap parity
(investigation-scoped RESOLUTION MEMORY / INCIDENT MEMORY on
reopen). MCP live compose already has subject-scoped memory
(056 / 059). Investigation-scoped memory on the snapshot field
is a different slice.

It is **not** orphan-subject survival. Deleted Resource still
`RESOURCE_NOT_FOUND`. CLI `investigation <id>` stays the
deleted-subject reopen path.

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
compare retained vs current                        ← 049 CLI / 071 MCP
    ↓
retrieve retained compositions by subject          ← 050
    ↓
point at those rows on the compose path in use     ← 069 CLI / 070 MCP
    ↓
MCP observe of named-id compare                    ← 071
    ↓
MCP observe of named-id snapshot                   ← this Sprint
    ↓
earned abstraction / fifth-tool reopen /
  list_investigations                              ← not this Sprint
```

`docs/internal/ROADMAP.md` v0.4 names CLI + MCP parity for core
read surfaces. `investigate_resource` is that surface.
`investigation <id>` is the 048 read surface. This Sprint puts
that retained composition on the existing tool when the agent
names an `inv:` id 071 already required for compare.

Sequencing Rule 9: persistence is **not** necessary. Reuse
`getSavedInvestigation`. Do not rewrite `snapshot_json`. Do
not UPDATE `composed_at`.

Sequencing Rule 8: snapshot identity has one source of truth —
the 048 Investigation row. The agent names an exact `inv:` id.
Do not infer “latest,” “similar,” or members.

Sequencing Rule 2: 048 CLI reopen, 049 `--compare`, 069 HISTORY,
070 `investigationHistory`, and 071 `investigationCompare` stay
those paths. This Sprint does not replace them.

Sequencing Rule 4: the new claim is “for this named snapshot,
this is the retained InvestigationContext as of composedAt,”
not “this snapshot is current provider truth,” not “these
Investigations are an Incident,” and not “the live tool body
is the snapshot.”

---

# Problem

After 071:

```text
investigate_resource({ resourceId, investigationId: inv:a })
  live compose
  investigationCompare     # 049 diff
  # no retained composition body

investigation inv:a        # CLI 048 reopen
```

The agent can name `inv:a` and still cannot obtain the 048
snapshot without a CLI. Compare says what differs; it does not
return the frozen compose. That is the 052 hole for snapshot:
the path already in use omits the record the human already has.

---

# Product Question

> After named-id compare exists on `investigate_resource`, can
> that same tool return the 048 retained snapshot when the agent
> names one exact `inv:` id — omitted when the id is not passed,
> never mixed into live Known Facts, never replacing live compose,
> without a fifth tool, without `list_investigations`, without
> grouping `inv:` as Incident members, and without MCP writes?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.6** already shipped 048 reopen
   on CLI. **v0.4** names CLI + MCP parity. 071 made `investigationId`
   a named-id input on the agent investigate path. The next
   smallest version of 048 is that same retained composition on
   that path.
2. **Sprint 071 leftover** lists grouping snapshots as members
   first, only *if earned*. leftover[0] stays frozen. leftover[1]
   is two claims; 070 already did list-observe. Fifth-tool
   `get_investigation` / `list_investigations` stay frozen.
   This Sprint takes named-id snapshot observe.
3. **Existing primitive check:** `getSavedInvestigation` already
   returns `SavedInvestigation` (`id`, `subjectResourceId`,
   `composedAt`, `snapshot: InvestigationContext`). Additive MCP
   fields are the 047 / 056 / 059 / 070 / 071 pattern. Four tools
   stay four tools. Reuse the 071 `investigationId` input.
4. **Sequencing Rule 9:** persistence is **not** required.
5. **Founder override 2026-08-16** froze MCP *writes*. This is a
   read. It does not authorize `list_investigations`, a fifth
   tool, or writes.

Rejected as 072 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Fifth tool / `get_investigation` / `list_investigations` | Frozen four-tool contract; unfiltered list has no four-tool home |
| Replace live compose with snapshot JSON | Mixes retained composition into current truth |
| Unfiltered investigations list MCP | No four-tool home; orphan-subject survival stays CLI |
| Infer reopen vs latest `investigationHistory[0]` | 048 is named id; do not invent the snapshot |
| Put snapshot JSON inside `investigationCompare` | Compare stays 049; snapshot stays 048 |
| Investigation-scoped resolution / incident memory on the snapshot field | CLI reopen wraps; MCP live already has subject-scoped 056 / 059; different slice |
| MCP `subject_missing` / deleted-Resource reopen | Live compose still requires the Resource; CLI `investigation <id>` stays that path |
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
  structuredContent unchanged from 071 (no investigationSnapshot)
        ↓
if investigationId present:
  existing 071 compare path (blank → usage; unknown → fail;
    subject mismatch → fail)
  additive investigationSnapshot = SavedInvestigation-shaped
    { id, subjectResourceId, composedAt, snapshot }
    (048 InvestigationContext; not CLI essay; not live compose)
        ↓
InvestigationContext (live) and snapshot_json unchanged
snapshot field is a read of the 048 row; not a rewrite
```

CLI `investigate`, `investigation <id>` reopen, `--compare`,
`investigations --resource`, 069 INVESTIGATION HISTORY, 070
`investigationHistory`, 071 `investigationCompare`, 052
RESOLUTION MEMORY, and 059 INCIDENT MEMORY are unchanged when
`investigationId` is omitted. When the id is named, 071 compare
stays and this field is added beside it.

`get_related_context` is unchanged.

`--save` must **not** serialize `investigationSnapshot` into
`snapshot_json`. The field is a read of an existing row.

Exact field spelling is Phase 1. Expected input: **reuse
`investigationId`** (no new input). Expected field:
**`investigationSnapshot`** (CLI banner INVESTIGATION SNAPSHOT).
Not `snapshot`. Not `investigation`. Not `investigationCompare`.
Not a formatted essay string.

Payload constraints:

- Named exact id only. No latest. No substring. No similarity.
- Subject alignment: snapshot `subjectResourceId` === `resourceId`
  (same 071 gate; fail `INVESTIGATION_SUBJECT_MISMATCH`).
- Shape: `id`, `subjectResourceId`, `composedAt`, `snapshot`
  where `snapshot` is the 048 `InvestigationContext` already
  stored in `snapshot_json`. Phase 1 may pin omitting
  `subjectResourceId` if it is redundant; expected: **include it**
  (`SavedInvestigation` / 048 record).
- Distinct from live `subject` / `knownFacts` / `missingContext`
  / `providerActivity` / `timeline` / `sharedCommitContext` /
  `sharedCommitCorrespondences` / `resolutionMemory` /
  `incidentMemory` / `investigationHistory` /
  `investigationCompare`.
- Labeled retained composition as of `composedAt`; not current
  provider truth; not an incident. Tool description clause
  (expected: **update the 071 “not snapshot reopen” sentence**;
  describe the sidecar).
- Omit `investigationSnapshot` when `investigationId` is omitted.
  When the id is present and valid, **always include** the field
  (including when the snapshot matches current). Requested
  reopen is the answer.
- `content[]` one-liner stays compose summary. Do not dump
  snapshot JSON or CLI essays into `content[]`.
- Live compose still requires the Resource. Deleted-subject
  reopen stays CLI `investigation <id>`. This Sprint does not
  add MCP orphan survival.
- Unknown / blank / mismatch: existing 071 fail-the-call
  (no consolation snapshot). Untrusted `snapshot_json`: existing
  `INVESTIGATION_SNAPSHOT_UNTRUSTED`.
- Do not attach investigation-scoped resolution / incident
  memory onto this field.

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
Named snapshot <inv:id> is the retained InvestigationContext
composed at composedAt for subject <resource-id>.
```

Omitting `investigationId` is **not** known-empty snapshot. It is
the 070 / 071 tool. Do not invent a snapshot.

### UNKNOWN / stale (required)

The snapshot is **not** current provider authority. It does not
re-validate providers, does not rewrite the row, and does not
imply the snapshot is an Incident or a recommendation.

Live `subject` / `knownFacts` remain the current local compose.
`investigationSnapshot.snapshot` is the frozen compose.

### Forbidden

```text
This snapshot proves the current provider state
Reopen the latest investigationHistory row
These Investigations are an Incident
You should rollback
resolved: true / this investigation is closed
This field is live Known Facts
The live tool body is the snapshot
Saving an investigation freezes investigationSnapshot into itself
This payload is investigationCompare
```

---

# Architecture

```text
investigations table (048)                         unchanged
        ↓
getSavedInvestigation                              048, unchanged
        ↓
investigate_resource structuredContent
  existing investigationId input (071)
  additive investigationSnapshot (this Sprint)
```

Ownership:

- **Domain / Store:** no new type. No new column. No `incident_id`.
  Do not store `inv:` ids as Incident members. Do not rewrite
  `snapshot_json` or `composed_at`.
- **App:** reuse `getSavedInvestigation`. No new CLI helper. MCP
  projection name is Phase 1; expected pass the
  `SavedInvestigation` object through `safeJson` (no essay
  formatter).
- **CLI:** unchanged, including `investigation <id>` reopen and
  `--compare`.
- **MCP:** additive `investigationSnapshot` when `investigationId`
  is valid and subject-aligned. Update the 071 tool description
  clause that currently says “not snapshot reopen.”
  `docs/public/MCP.md` investigate_resource row only (result).
- **Compare / InvestigationContext (live):** unchanged.

Adapters do not participate.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as Incident members, to replace live compose with snapshot
JSON, to infer latest, or to rewrite `snapshot_json`: **STOP.**

---

# Persistence vs Read-Time

| Snapshot JSON | 048 reopen | investigate_resource |
| --- | --- | --- |
| Frozen InvestigationContext | Read of that row | Additive field when named |
| Unchanged JSON | not rewritten | omitted when id omitted |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- rewrite snapshot JSON
- rewrite `composed_at`
- put snapshots on live `InvestigationContext`
- replace live structuredContent with the snapshot
- add MCP tools or writes
- infer reopen vs `investigationHistory[0]`
- create Relationships or Changes
- refresh providers
- add Investigation lifecycle / `resolved: true`

---

# Boundedness

- Existing `investigate_resource` tool. No fifth tool. No new verb.
- Snapshot only when the agent names an exact `inv:` id whose
  subject is this Resource.
- No grouping of Investigation snapshots as Incident members.
- No CLI change. No `--compare` change. No snapshot schema change.
- `MAX_INVESTIGATION_FACTS = 5` unchanged. Snapshot is not facts.
- No extra hop. No provider calls. No schema migration.

---

# Failure / Unknown Semantics

- `investigationId` omitted: 071 behavior. No snapshot field.
- Blank `investigationId`: existing 071 usage.
- Unknown `inv:`: `INVESTIGATION_NOT_FOUND`. Fail the call.
- Snapshot subject ≠ `resourceId`: `INVESTIGATION_SUBJECT_MISMATCH`.
- Resource missing: existing `RESOURCE_NOT_FOUND` (compose did not
  run). No consolation snapshot. CLI deleted-subject reopen stays
  `investigation <id>`.
- Untrusted snapshot JSON: existing 048
  `INVESTIGATION_SNAPSHOT_UNTRUSTED` from `getSavedInvestigation`.
- `--investigation` / `--resource` on `incident`: existing usage.

---

# Affected Surfaces

### CLI

Unchanged. 048 reopen stays. 049 `--compare` stays. 069 HISTORY
stays. 070 / 071 are MCP-only for this Sprint.

### MCP

Four tools. Additive `investigationSnapshot` when `investigationId`
is valid and subject-aligned. Update tool description (071 “not
snapshot reopen” clause). `docs/public/MCP.md` investigate_resource
row (expected: **yes**, result only; input already names
`investigationId`).

### Compare (CLI / MCP)

Unchanged. Compare stays a sibling field, not a container for
snapshot JSON.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.6
048 reopen and v0.4 agent boundary, this Sprint, SPRINT-048
`SavedInvestigation`, SPRINT-071 leftover split / MCP freeze,
and inspect:

- `src/mcp/tools.ts` `investigate_resource` `investigationId` and
  `investigationCompare` spread
- `getSavedInvestigation` / `SavedInvestigation` /
  `parseInvestigationSnapshot`
- `tests/app/mcp-protocol.test.ts` four-tool freeze and 071
  named-id cases
- `docs/public/MCP.md` investigate_resource row
- leftover[0] `incident --investigation` usage
- `safeJson` on nested `InvestigationContext`

Report:

1. Field name: `investigationSnapshot` vs `snapshot`? Expected:
   **`investigationSnapshot`.**
2. New input vs reuse `investigationId`? Expected: **reuse
   `investigationId`.**
3. Shape: `{ id, subjectResourceId, composedAt, snapshot }` vs
   snapshot only? Expected: **048 `SavedInvestigation` fields.**
4. Omit when id omitted vs always-present `null`? Expected:
   **omit.** Conditional spread.
5. Full `InvestigationContext` vs 070 summaries? Expected:
   **full 048 snapshot object** (not CLI essay, not live compose).
6. Subject mismatch / unknown / blank: same 071 fail-the-call?
   Expected: **yes.**
7. `content[]` one-liner unchanged? Expected: **yes.**
8. Tool description + `docs/public/MCP.md` row? Expected: **yes**,
   that row only (result; update the 071 “not snapshot reopen”
   wording).
9. Fifth tool, `list_investigations`, grouping `inv:` as members,
   infer latest, `occurredAt`, orphan MCP survival,
   investigation-scoped memory on this field? Expected: **no.**
10. CLI reopen / `--compare` / live compose / snapshot JSON
    rewrite / `get_related_context`? Expected: **no change.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? Snapshot remains 048; live compose
   remains current local store; compare remains ephemeral 049.
3. Does showing the frozen compose leak “you should”? **No**, if
   labeled not current provider truth, not an incident, not a
   recommendation — no rank, no “rollback.”
4. Does this become snapshot-as-live-body? **No.** Live compose
   stays the body. Snapshot is a sidecar.
5. Fifth tool needed? Expected: **no.**
6. Grouping snapshots leak? **No.** leftover[0] frozen.
7. Infer latest from `investigationHistory`? Expected: **no.**
8. `incident_id` / lifecycle / `occurredAt` / `list_investigations`?
   Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + the
   existing `docs/public/MCP.md` investigate_resource row. Not
   VISION / ARCHITECTURE / ROADMAP / SKILL.

If implementation is tempted to add `get_investigation` /
`list_investigations`, to put snapshot JSON on the live body, to
infer latest, to store `inv:` as Incident members, or to rewrite
`snapshot_json`: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- still exactly four tools; annotations unchanged
- omitted `investigationId`: no `investigationSnapshot` key; 071
  `investigationCompare` still omitted; 070 history still works
- named matching `inv:`: `investigationSnapshot.id` equals that
  id; `composedAt` matches the row; `snapshot.subject.id` equals
  `resourceId`; digest unchanged; 071 `investigationCompare`
  still present
- live `knownFacts` stay the current compose; snapshot known
  facts are not mixed into that live array
- other subject’s snapshot id fails (no silent cross-subject
  snapshot)
- unknown id fails; no snapshot payload
- blank id is usage
- not present on `knownFacts` / `missingContext` / compare object
- `--save` snapshot JSON still has no `investigationSnapshot` key
- CLI `investigation <id>` unchanged
- leftover[0]: `incident --investigation` still usage
- no `list_investigations` / `get_investigation` /
  `compare_investigation` tool
- no write tool; no `occurredAt` on the snapshot field
- do not auto-reopen `investigationHistory[0]` when id omitted
- `content[]` stays the compose one-liner

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
#   no investigationCompare, no investigationSnapshot
# MCP investigate_resource({ resourceId, investigationId: inv:a }):
#   investigationSnapshot.id = inv:a; snapshot.subject.id = resourceId
#   investigationCompare.snapshotId = inv:a (071 unchanged)
# MCP with other subject’s inv: fail
# MCP with inv:missing: fail
# MCP with investigationId "": usage / fail
investigation inv:a                              # CLI reopen unchanged
investigation inv:a --compare                    # CLI compare unchanged
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
- a fifth MCP tool (`list_investigations`, `get_investigation`,
  snapshot-reopen tool)
- replacing live compose / `structuredContent` body with snapshot
  JSON
- inferred reopen vs latest history row
- MCP writes
- snapshot JSON rewrite
- unfiltered `investigations` list MCP
- orphan-subject MCP survival / `subject_missing` on this path
- investigation-scoped resolution / incident memory on the
  snapshot field
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
051–071   (shipped; see SPRINT-071 leftover table)                 ✅
072       Investigation snapshot on investigate_resource           ← this
073+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          orphan-subject MCP survival only if earned
          investigation-scoped memory on snapshot MCP only if earned
          inferred activity→Action (never, unless a later sprint
            explicitly reverses 051)
          similarity / recommendation / learning (v0.8)
          policy / execution (v0.9)
```

---

# Product / Contract Freezes

- MCP tools: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource` (exactly four; still read-only; no writes;
  existing `investigationId` + additive `investigationSnapshot`)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 CLI compare semantics unchanged
- 071 `investigationCompare` unchanged
- 050 `investigations --resource` unchanged
- 069 CLI INVESTIGATION HISTORY unchanged
- 070 `investigationHistory` unchanged when `investigationId` omitted
- 052 / 056 resolution memory unchanged
- 059 incident memory unchanged
- grouping `inv:` as Incident members frozen
- `occurredAt` frozen
- fifth tool / `get_investigation` / `list_investigations` frozen
- live body = snapshot JSON frozen
- inferred latest-snapshot reopen frozen
- MCP orphan-subject survival frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP
- `docs/public/MCP.md` investigate_resource row only (this Sprint)

---

# Migration / Upgrade

None required. Snapshot is a read of the 048 row. No schema change.

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

- [ ] Sprint 072 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: `investigate_resource` with named `investigationId`
      returns 048 `investigationSnapshot` for that exact subject;
      omitted when the id is not passed; not a fifth tool; not
      snapshot JSON as the live body
- [ ] if earned: CLI unchanged; no inferred latest; no `inv:`
      members; no `incident_id`; no MCP writes; no fifth tool
- [ ] if not earned: rejection documented; do not add a fifth tool
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged except AGENTS.md operational baseline and the
      `docs/public/MCP.md` investigate_resource row

---

# Final Principle

> **Sprint 071 let agents name one exact `inv:` id and observe the
> 049 compare. Sprint 072 may let them observe the 048 retained
> composition on that same named id. Combie must not invent the
> id, must not treat an Investigation as an Incident, must not
> put snapshot JSON on the live body, must not add a fifth tool,
> and must not thaw MCP writes to ship the snapshot.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `5c77604` (authoring-only working tree: AGENTS.md Active +
untracked `SPRINT-072.md`; baseline 1098 pass / 78 files / 5329
expect()). Pins:

1. Field name: **`investigationSnapshot`.**
2. Input: **reuse `investigationId`** (071 input; no new input).
3. Shape: **`{ id, subjectResourceId, composedAt, snapshot }`** —
   the 048 `SavedInvestigation` object passed through `safeJson`
   (no essay formatter).
4. Omit when id omitted: **omit the key** (conditional spread).
5. Payload: **full 048 snapshot `InvestigationContext`** (not 070
   summaries, not live compose, not CLI essay).
6. Subject mismatch / unknown / blank: **same 071 fail-the-call**
   (`INVESTIGATION_SUBJECT_MISMATCH` / `INVESTIGATION_NOT_FOUND` /
   `INVESTIGATION_ID_REQUIRED`).
7. `content[]` one-liner: **unchanged.**
8. Tool description + `docs/public/MCP.md` investigate_resource
   row: **yes**, that row only (update the 071 “not snapshot
   reopen” clause).
9. Fifth tool / `list_investigations` / grouping `inv:` as
   members / infer latest / `occurredAt` / orphan MCP survival /
   investigation-scoped memory on the field: **no.**
10. CLI reopen / `--compare` / live compose / snapshot JSON
    rewrite / `get_related_context`: **no change.**

Wrap site: `src/mcp/tools.ts` `investigate_resource` inside the
existing 071 `investigationId` branch, after the gates pass and
`investigationCompare` is set. Reuse `getSavedInvestigation`
(`src/app/investigations.ts`), which already returns
`SavedInvestigation` and surfaces the existing
`INVESTIGATION_SNAPSHOT_UNTRUSTED` for unreadable rows.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **No.** Read of the 048 row only.
2. Second source of truth? **No.** Snapshot stays 048; live
   compose stays current local store; compare stays ephemeral 049.
3. “You should” leak? **No** — labeled retained composition as of
   `composedAt`, not current provider truth, not an incident, not
   a recommendation; no rank, no rollback.
4. Snapshot-as-live-body? **No.** Live compose stays the body;
   snapshot is a sidecar field.
5. Fifth tool needed? **No.**
6. Grouping snapshots leak? **No.** leftover[0] frozen;
   `incident --investigation` stays usage.
7. Infer latest from `investigationHistory`? **No.** Named id
   only; omitted id is the 070 / 071 tool.
8. `incident_id` / lifecycle / `occurredAt` /
   `list_investigations`? **No.**
9. Canon? AGENTS.md operational baseline + `docs/public/MCP.md`
   investigate_resource row only.

No STOP conflict.

## Implemented

- Additive `investigationSnapshot` on existing
  `investigate_resource`: when `investigationId` is present,
  valid, and subject-aligned, the tool returns the 048
  `SavedInvestigation` (`id`, `subjectResourceId`, `composedAt`,
  `snapshot` = frozen `InvestigationContext`) through `safeJson`.
- Reuses the 071 `investigationId` input; no new input; no fifth
  tool; key omitted when the id is omitted.
- Blank / whitespace `investigationId`:
  `INVESTIGATION_ID_REQUIRED` (071 unchanged).
- Unknown id: `INVESTIGATION_NOT_FOUND` (fail the call; no
  consolation snapshot).
- Cross-subject id: `INVESTIGATION_SUBJECT_MISMATCH` (fail; no
  silent snapshot of the snapshot’s subject).
- `investigationCompare` (071) unchanged and present beside the
  snapshot field when the id is named.
- Tool description + `investigationId` input description updated:
  the 071 “not snapshot reopen” sentence now describes the
  retained-composition sidecar (not a rewrite of the snapshot
  row). `docs/public/MCP.md` investigate_resource row only
  (result; input already named `investigationId`).
- `content[]` one-liner unchanged. Snapshot never mixed into live
  `knownFacts` / `missingContext` / compare; snapshot JSON and
  `composed_at` never rewritten; `--save` never serializes
  `investigationSnapshot`.
- CLI `investigate`, `investigation <id>` reopen, `--compare`,
  `investigations --resource`, 069 HISTORY, 070
  `investigationHistory`, 052 / 056 resolution memory, 059
  incident memory, `get_related_context` unchanged.
- leftover[0]: `incident --investigation` still usage.
- Four tools. No `list_investigations` / `get_investigation` /
  `compare_investigation`. No MCP writes.

## Deviations

None.

## Validation

```text
baseline:          5c77604 docs(sprints): mark 071 complete
                   1098 pass / 78 files / 5329 expect()
bun test:          1099 pass across 78 files (5382 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-072-dogfood.* (never ./.combie)
                   investigate --save inv:a / inv:b on real
                     github:repository subjects
                   MCP omitted id: investigationHistory, no
                     investigationSnapshot, no investigationCompare
                   MCP named inv:a: investigationSnapshot.id =
                     inv:a; subjectResourceId = subject;
                     composedAt = row; snapshot.subject.id =
                     subject; no occurredAt;
                     investigationCompare.snapshotId = inv:a
                     (071 unchanged); currentStatus available
                   MCP other subject’s inv: fail
                     (INVESTIGATION_SUBJECT_MISMATCH text)
                   MCP inv:missing: fail
                   MCP investigationId "": usage / fail
                   investigation inv:a: INVESTIGATION SNAPSHOT
                     reopen unchanged
                   investigation inv:a --compare: INVESTIGATION
                     COMPARE unchanged
                   incident --investigation still usage (exit 1)
                   four tools; dogfood DB sha256 unchanged after
                     MCP reads; snapshot_json has no
                     investigationSnapshot key
                   Isolated dogfood left founder
                     ~/.combie/combie.db mtime 1786499534 /
                     size 135168 unchanged.
```

## Learnings

- Load the snapshot only after the 071 gates pass so unknown /
  cross-subject ids fail the whole call with no consolation
  snapshot; `getSavedInvestigation` re-parses the row that
  `compareInvestigationToCurrent` already validated, so no new
  error path exists.
- Omitted `investigationId` is the 070 / 071 tool, not
  known-empty snapshot. Do not auto-reopen
  `investigationHistory[0]`.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md
baseline becomes Sprints 001–072 complete (Sprint 073 not
started). `docs/public/MCP.md` investigate_resource row gains
`investigationSnapshot` and drops the “not snapshot reopen”
phrase. Grouping Investigation snapshots as Incident members
remains unearned. Fifth-tool snapshot reopen /
`list_investigations` remains unearned. `occurredAt` remains
unearned.
