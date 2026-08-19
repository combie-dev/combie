# SPRINT-075 — Orphan-subject named-id observe on investigate_resource

> **Status:** Complete
> **Depends on:** SPRINT-074 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.6 Investigation
> persistence (048 snapshots survive Resource deletion) plus v0.4
> CLI + MCP parity for CLI `investigation <id>` / `--compare`
> `subject_missing`, after 072–074 named-id sidecars exist on
> `investigate_resource`. Sprint 074 leftover list is **not** a
> sequence. leftover[0] **group Investigations as Incident
> members** stays **unearned** (Investigation ≠ Incident; members
> stay `res:`). leftover[1] **fifth-tool snapshot reopen /
> `list_investigations`** stays frozen. This Sprint takes
> **orphan-subject named-id observe** on the existing
> `investigate_resource` (048 / 049 deleted-subject analog).
> Does **not** authorize Recommendation, Learning, similarity,
> Investigation lifecycle, MCP writes, a fifth tool, inferred
> Action, grouping snapshots as members, `occurredAt`, replacing
> live compose with snapshot JSON when the Resource exists, or
> inferred latest.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.6 Investigation —
> **named-id snapshot observe when the subject Resource is
> missing**, plus v0.4 CLI + MCP parity for that 048 / 049
> deleted-subject surface; not lifecycle, not the Investigation
> Engine, not a fifth tool, not MCP writes, not grouping `inv:`
> as members
> **Type:** Narrow success path on existing `investigate_resource`
> when `investigationId` is named, the snapshot’s subject equals
> `resourceId`, and live compose reports `RESOURCE_NOT_FOUND`
> **Primary goal:** When an agent names an exact `inv:` id whose
> subject is the requested Resource, and that Resource is gone
> from the local store, Combie returns the 072–074 named-id
> sidecars (snapshot, compare with `currentStatus:
> subject_missing`, investigation-scoped memory, history) instead
> of failing the call — omitted when `investigationId` is not
> passed (still `RESOURCE_NOT_FOUND`), never promoting snapshot
> fields to the live body, never a fifth tool — without grouping
> `inv:` as Incident members and without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. This
> Sprint adds a **success path** on `investigate_resource` only
> (reuses `investigationId`). No fifth tool. No writes. When the
> Resource exists, 074 behavior is unchanged. When
> `investigationId` is omitted, missing Resource stays
> `RESOURCE_NOT_FOUND`.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 074 completed named-id observe **while the Resource
exists**:

```text
investigate_resource({ resourceId, investigationId: inv:a })
  live compose
  investigationSnapshot / investigationCompare
  investigationResolutionMemory / investigationIncidentMemory
```

CLI already survives subject deletion:

```text
investigation inv:a              # 048 reopen; Resource may be gone
investigation inv:a --compare    # 049 currentStatus subject_missing
investigations --resource <id>   # 050 list; never RESOURCE_NOT_FOUND
investigate <id>                 # still RESOURCE_NOT_FOUND
```

MCP `investigate_resource` still composes live first. Deleted
subject → `RESOURCE_NOT_FOUND`. The agent who stored `inv:a`
from `investigationHistory` cannot reopen it. That is the 048
hole on the path already in use: the durable row exists; the
only MCP tool that can name it requires the Resource.

Sprint 074 leftover:

```text
075+      group Investigations directly only if earned
          fifth-tool snapshot reopen / list_investigations
            only if earned
          orphan-subject MCP survival only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
074 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. leftover[0] stays
unearned.

leftover[1] **fifth-tool / `list_investigations`** stays frozen.
Orphan survival does **not** need `get_investigation` if the
existing tool can succeed when the agent already named `inv:a`
and `resourceId` is that snapshot’s subject.

leftover **orphan-subject MCP survival** is now earned. 048
snapshots persist beyond Resource deletion. 049 already returns
`subject_missing` without failing. 050 / 069 / 072–074 named-id
sidecars do not need live compose. 071 / 072 froze this path
until those sidecars existed. They exist.

This Sprint **splits** leftover as:

```text
fifth tool / list_investigations / get_investigation
  → still frozen
group inv: as Incident members
  → still frozen (Investigation ≠ Incident)
Investigation lifecycle / occurredAt
  → still frozen
named-id observe when live compose is RESOURCE_NOT_FOUND
  (subject-aligned inv:; live keys omitted; sidecars remain)
  → this Sprint
```

No founder override is required. 048 already authorized snapshot
survival. 049 already authorized `subject_missing` as status, not
failure. v0.4 names CLI + MCP parity. Do not infer “latest
snapshot.” The agent must name the id **and** the Resource id
that snapshot belongs to.

It is **not** grouping Investigation snapshots as Incident members.
`--investigation` on `incident` create stays usage.

It is **not** a fifth tool. Live compose when the Resource exists
stays the body. When the Resource is missing, live keys are
**omitted** — do not copy `investigationSnapshot.snapshot.subject`
to top-level `subject`.

It is **not** changing 074 when the Resource exists.

It is **not** letting omitted `investigationId` survive deletion
(that would be live investigate without a Resource). Missing
Resource + omitted id stays `RESOURCE_NOT_FOUND`.

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
MCP named-id sidecars when Resource is missing     ← this Sprint
    ↓
earned abstraction / fifth tool                    ← not this Sprint
```

Sequencing Rule 9: persistence is **not** necessary. Reuse
`getSavedInvestigation`, `compareInvestigationToCurrent`,
`listInvestigations({ subjectResourceId })`,
`listResolutions({ investigationId })`,
`listIncidentsForInvestigation`. Do not rewrite `snapshot_json`.

Sequencing Rule 8: snapshot identity has one source of truth —
the 048 row. The agent names an exact `inv:` id. Subject
alignment stays 071 (`subjectResourceId` === `resourceId`).

Sequencing Rule 2: live `investigate` / omitted-id MCP stays
`RESOURCE_NOT_FOUND` when the Resource is gone. This Sprint
does not change that path.

Sequencing Rule 4: the new claim is “named snapshot `<inv:id>`
is retained composition for this Resource id; the Resource is
not in the local store as of this call; compare
`currentStatus` is `subject_missing`,” not “the snapshot is
current provider truth,” not “these Investigations are an
Incident,” and not “top-level subject is the frozen snapshot.”

---

# Problem

After 074:

```text
investigate_resource({ resourceId })              # Resource gone
  RESOURCE_NOT_FOUND

investigate_resource({ resourceId, investigationId: inv:a })
  RESOURCE_NOT_FOUND     # compose runs first; sidecars never run

investigation inv:a                               # CLI 048 works
investigation inv:a --compare                     # CLI 049 subject_missing
```

The named-id MCP contract is unreachable after subject deletion.
That is the 052 hole for 048 durability: the path already in
use omits the record the human already has.

---

# Product Question

> After named-id snapshot, compare, and investigation-scoped
> memory exist on `investigate_resource`, can that same named-id
> call succeed when the subject Resource is missing — returning
> those sidecars with compare `currentStatus: subject_missing`,
> omitting live compose keys, failing as today when the id is
> not passed, without a fifth tool, without promoting snapshot
> JSON to the live body, without grouping `inv:` as Incident
> members, and without MCP writes?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.6** already shipped 048
   snapshots that survive Resource deletion and 049
   `subject_missing`. **v0.4** names CLI + MCP parity. 071–074
   put the named-id sidecars on this tool only when live compose
   succeeded. The next smallest version is that same observe
   when compose cannot run.
2. **Sprint 074 leftover** lists grouping snapshots as members
   first, only *if earned*. leftover[0] stays frozen. Fifth-tool
   stays frozen. Orphan survival is now earned.
3. **Existing primitive check:** `compareInvestigationToCurrent`
   already returns `currentStatus: "subject_missing"` without
   throwing. `getSavedInvestigation` does not require the
   Resource. Additive sidecar fields already exist. Four tools
   stay four tools.
4. **Sequencing Rule 9:** persistence is **not** required.
5. **Founder override 2026-08-16** froze MCP *writes*. This is a
   read. It does not authorize `list_investigations`, a fifth
   tool, or writes.

Rejected as 075 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Fifth tool / `get_investigation` / `list_investigations` | Frozen four-tool contract |
| Omitted-id survival / live investigate without Resource | Live compose requires the Resource; that stays `RESOURCE_NOT_FOUND` |
| Copy snapshot.subject to top-level `subject` | Mixes retained composition into current-truth keys |
| Change 074 when Resource exists | 074 freeze |
| Infer latest `investigationHistory[0]` | Named id only |
| `occurredAt` | Second time field |
| Investigation lifecycle | Status is still a process claim |
| MCP writes | Founder override; policy is v0.9 |
| Similarity / “you should” | Forbidden |

---

# Exact Capability

```text
investigate_resource({ resourceId, investigationId? })
        ↓
if investigationId omitted:
  live compose as today
  missing Resource → RESOURCE_NOT_FOUND (isError)
        ↓
if investigationId present:
  existing 071 / 072 gates (blank → usage; unknown →
    INVESTIGATION_NOT_FOUND; subject mismatch →
    INVESTIGATION_SUBJECT_MISMATCH)
        ↓
  try live compose
  if available: 074 structuredContent unchanged
        ↓
  if RESOURCE_NOT_FOUND and gates passed:
    isError false
    omit live compose keys (subject, subjectChanges, related,
      knownFacts, missingContext, providerActivity, timeline,
      sharedCommit*, subjectDeployments/Runs/Operations/
      Releases/Issues, 056 resolutionMemory, 059 incidentMemory)
    include named-id sidecars:
      investigationSnapshot                 # 072
      investigationCompare                  # 071; currentStatus
                                            # subject_missing
      investigationHistory                  # 070 / 050; omit empty
      investigationResolutionMemory         # 073; omit empty
      investigationIncidentMemory           # 074; omit empty
    content[] one-liner: snapshot id + subject missing
      (not snapshot JSON dump, not CLI essay)
        ↓
snapshot_json unchanged
```

When the Resource exists, 074 is unchanged.

`get_related_context` is unchanged (still `RESOURCE_NOT_FOUND`
for a missing Resource).

`--save` must **not** serialize orphan keys into `snapshot_json`.
Orphan observe is a read.

Exact payload is Phase 1. Expected: **omit live keys** (do not
send `subject: null` via `safeJson` — conditional omit, not
null). Expected compare: **full 049 object** with
`currentStatus: "subject_missing"`. Expected content[]: **short
one-liner**, not JSON.

Named-id gates when `investigationId` is present apply **even
if the Resource is missing** (blank → usage; unknown →
`INVESTIGATION_NOT_FOUND`; mismatch →
`INVESTIGATION_SUBJECT_MISMATCH`). Do not hide a bad id behind
`RESOURCE_NOT_FOUND`.

The four-tool list is unchanged:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

---

# Evidence / Claim Semantics

### KNOWN (about the orphan path)

```text
Named snapshot <inv:id> is retained composition for resourceId
<id>. That Resource is not in the local store as of this call.
Compare currentStatus is subject_missing.
```

Omitting `investigationId` is **not** orphan observe. It is live
investigate. Missing Resource then is `RESOURCE_NOT_FOUND`.

### UNKNOWN / stale (required)

The snapshot is **not** current provider authority. Compare
`subject_missing` is not a recommendation to recreate the
Resource. Sidecars are not live Known Facts.

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
```

---

# Architecture

```text
investigations table (048)                         unchanged
        ↓
getSavedInvestigation / compareInvestigationToCurrent
  (049 already handles RESOURCE_NOT_FOUND → subject_missing)
        ↓
investigate_resource
  existing investigationId gates (071 / 072)
  catch RESOURCE_NOT_FOUND only after those gates pass
  orphan sidecar payload (this Sprint)
```

Ownership:

- **Domain / Store:** no new type. No new column. No `incident_id`.
  Do not store `inv:` ids as Incident members. Do not rewrite
  `snapshot_json`.
- **App:** reuse existing loaders. No new CLI helper. No new
  compare semantics.
- **CLI:** unchanged, including deleted-subject reopen and
  `--compare` `subject_missing`.
- **MCP:** orphan success path on `investigate_resource` only.
  Tool description clause. `docs/public/MCP.md`
  investigate_resource row only (result / missing-Resource
  named-id behavior).
- **074 when Resource exists:** unchanged.

Adapters do not participate.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as Incident members, to copy snapshot JSON to top-level
live keys, to infer latest, or to let omitted-id survive
deletion: **STOP.**

---

# Persistence vs Read-Time

| Snapshot JSON | CLI deleted-subject | MCP orphan named-id |
| --- | --- | --- |
| Frozen InvestigationContext | reopen / `--compare` | Sidecars; live keys omitted |
| Unchanged JSON | not rewritten | omitted investigationId still errors |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- rewrite snapshot JSON
- promote snapshot fields to live `subject` / `knownFacts`
- add MCP tools or writes
- infer latest snapshot
- change omitted-id missing-Resource to success
- add Investigation lifecycle / `resolved: true`

---

# Boundedness

- Existing `investigate_resource` tool. No fifth tool. No new verb.
- Orphan path only when the agent names an exact `inv:` id whose
  subject is the requested (missing) Resource.
- No grouping of Investigation snapshots as Incident members.
- No CLI change. No snapshot schema change. No 074 change when
  the Resource exists.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.
- No extra hop. No provider calls. No schema migration.

---

# Failure / Unknown Semantics

- `investigationId` omitted + missing Resource:
  `RESOURCE_NOT_FOUND` (unchanged).
- Named id + Resource exists: 074 (unchanged).
- Named blank / unknown / mismatch: existing 071 / 072 codes,
  including when the Resource is missing.
- Named aligned id + missing Resource: success; live keys
  omitted; compare `subject_missing`.
- Untrusted snapshot JSON: existing
  `INVESTIGATION_SNAPSHOT_UNTRUSTED`.
- `--investigation` on `incident` create: existing usage.

---

# Affected Surfaces

### CLI

Unchanged. 048 deleted-subject reopen stays. 049
`subject_missing` stays.

### MCP

Four tools. Orphan named-id success path on
`investigate_resource`. Tool description clause.
`docs/public/MCP.md` investigate_resource row (expected:
**yes**, result / missing-Resource named-id).

### Compare / snapshot / 073 / 074 fields

Shapes unchanged. Orphan path sets compare `currentStatus` to
`subject_missing` via existing 049.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md`
v0.6 048 / 049 `subject_missing` and v0.4 agent boundary, this
Sprint, SPRINT-049 `currentStatus`, SPRINT-072 / 074 leftover
split / MCP freeze, and inspect:

- `src/mcp/tools.ts` `investigate_resource` compose-first
  `RESOURCE_NOT_FOUND` vs 071 / 072 gates
- `compareInvestigationToCurrent` `subject_missing` path
- `getSavedInvestigation` (does not require the Resource)
- `tests/app/mcp-protocol.test.ts` missing-resource cases
  (today `RESOURCE_NOT_FOUND` even with `investigationId`)
- CLI `investigation <id>` after `DELETE FROM resources`
- leftover[0] `incident --investigation` usage
- `safeJson` omit vs null for live keys

Report:

1. Orphan trigger: named aligned `investigationId` +
   `RESOURCE_NOT_FOUND`? Expected: **yes.**
2. Omitted id + missing Resource: still `RESOURCE_NOT_FOUND`?
   Expected: **yes.**
3. `isError` on orphan success? Expected: **false** (049
   `subject_missing` is not a command failure).
4. Live keys: omit vs null vs fill from snapshot? Expected:
   **omit.** Do not copy snapshot into `subject` / `knownFacts`.
5. Include 071–074 sidecars + 070 history? Expected: **yes**
   (omit empty memory / history as today). Omit 056 / 059
   subject-scoped fields (those ride live compose).
6. Compare `currentStatus`? Expected: **`subject_missing`.**
7. Named-id gates when Resource is missing? Expected: **yes**
   (blank / unknown / mismatch unchanged codes).
8. `content[]`? Expected: **short one-liner** (snapshot id +
   subject missing); not JSON dump.
9. Tool description + `docs/public/MCP.md` row? Expected:
   **yes**, that row only.
10. Fifth tool, grouping `inv:` as members, infer latest,
    `occurredAt`, omitted-id survival? Expected: **no.**
11. CLI reopen / `--compare` / 074-when-present /
    `get_related_context`? Expected: **no change.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? Snapshot remains 048; compare remains
   ephemeral 049; live compose remains current local store when
   the Resource exists.
3. Does `subject_missing` leak “you should recreate”? **No**, if
   labeled not current provider truth, not a recommendation.
4. Does this become snapshot-as-live-body? **No** if live keys
   stay omitted and snapshot stays `investigationSnapshot`.
5. Fifth tool needed? Expected: **no.**
6. Grouping snapshots leak? **No.** leftover[0] frozen.
7. Infer latest from `investigationHistory`? Expected: **no.**
8. Omitted-id survival? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + the
   existing `docs/public/MCP.md` investigate_resource row. Not
   VISION / ARCHITECTURE / ROADMAP / SKILL.

If implementation is tempted to add `get_investigation`, to copy
snapshot JSON onto live keys, to infer latest, to store `inv:`
as Incident members, or to succeed when `investigationId` is
omitted: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- still exactly four tools; annotations unchanged
- omitted `investigationId` + deleted Resource:
  `RESOURCE_NOT_FOUND` / `isError`
- named matching `inv:` + Resource exists: 074 unchanged
  (live `subject` present; compare `available`)
- named matching `inv:` + deleted Resource: `isError` not true;
  no live `subject` / `knownFacts` / `resolutionMemory` /
  `incidentMemory`; `investigationSnapshot.id` matches;
  `investigationCompare.currentStatus` is `subject_missing`;
  digest unchanged
- 073 / 074 scoped fields still appear on orphan when rows
  exist; omitted when empty
- 070 `investigationHistory` still lists that subject’s `inv:`
  rows after deletion
- other subject’s `inv:` + deleted requested Resource:
  mismatch; no consolation snapshot
- unknown / blank id + deleted Resource: 071 / 072 codes (not
  silent `RESOURCE_NOT_FOUND` hiding a named id)
- snapshot JSON still has no MCP sidecar keys
- live keys are absent (not `null`) on the orphan payload
- `content[]` is a one-liner; not snapshot JSON
- CLI `investigation <id>` and `--compare` unchanged
- leftover[0]: `incident --investigation` still usage
- no `list_investigations` / `get_investigation` tool
- no write tool; no `occurredAt`; no `inv:` members
- `get_related_context` on missing Resource still errors
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
# delete the Resource row from the isolated DB
# MCP omitted id: RESOURCE_NOT_FOUND
# MCP named inv:a: investigationSnapshot.id = inv:a;
#   investigationCompare.currentStatus = subject_missing;
#   no top-level subject / knownFacts
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
- omitted-id survival / live investigate without a Resource
- copying snapshot JSON onto live `subject` / `knownFacts`
- changing 074 when the Resource exists
- inferred latest snapshot
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
051–074   (shipped; see SPRINT-074 leftover table)                 ✅
075       Orphan-subject named-id observe on
          investigate_resource                                     ← this
076+      group Investigations directly only if earned
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
  existing `investigationId`; orphan named-id success path)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 072–074 sidecar shapes unchanged
- 049 compare semantics unchanged (`subject_missing` already exists)
- 056 / 059 subject-scoped fields still require live compose
- grouping `inv:` as Incident members frozen
- `occurredAt` frozen
- fifth tool / `get_investigation` / `list_investigations` frozen
- omitted-id missing-Resource success frozen
- inferred latest-snapshot frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP
- `docs/public/MCP.md` investigate_resource row only (this Sprint)

---

# Migration / Upgrade

None required. Orphan observe is a read of existing 048 / 049 /
051 / 058 rows. No schema change.

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

- [ ] Sprint 075 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: named aligned `investigationId` + missing
      Resource returns 072–074 sidecars with compare
      `subject_missing` and omits live compose keys; omitted id
      still `RESOURCE_NOT_FOUND`; not a fifth tool; not snapshot
      JSON as the live body
- [ ] if earned: CLI unchanged; 074 unchanged when Resource
      exists; no inferred latest; no `inv:` members; no
      `incident_id`; no MCP writes; no fifth tool
- [ ] if not earned: rejection documented; do not add a fifth tool
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged except AGENTS.md operational baseline and the
      `docs/public/MCP.md` investigate_resource row

---

# Final Principle

> **Sprint 074 let agents name one exact `inv:` id while the
> Resource still existed. Sprint 075 may let them observe that
> same named snapshot after the Resource is gone. Combie must not
> invent the id, must not treat an Investigation as an Incident,
> must not put snapshot JSON on the live body, must not succeed
> when the id is omitted, must not add a fifth tool, and must not
> thaw MCP writes to ship the survival path.**

# Completion Notes (2026-08-19)

## Phase 1 — Repository Understanding

HEAD `d31b75c` (authoring-only working tree: AGENTS.md Active +
untracked `SPRINT-075.md`). Pins:

1. Orphan trigger: named aligned `investigationId` +
   `RESOURCE_NOT_FOUND`? **Yes.** `getInvestigationContext`
   throws `RESOURCE_NOT_FOUND` (`src/app/investigate.ts:145`)
   before the 071 / 072 gates ran, so compose-first made the
   named-id contract unreachable after subject deletion.
2. Omitted id + missing Resource: still `RESOURCE_NOT_FOUND`?
   **Yes** — untouched.
3. `isError` on orphan success? **False** (049
   `subject_missing` is status, not failure).
4. Live keys: **omit**, never null — conditional spreads, same
   pattern as 056/059/070–074 keys.
5. Sidecars on orphan: **yes** — 071 `investigationCompare`
   (`currentStatus: subject_missing`, full 049 object via
   `compareInvestigationToCurrent`, which already catches
   `RESOURCE_NOT_FOUND`), 072 `investigationSnapshot`,
   070/050 `investigationHistory` (keyed off
   `snapshot.subjectResourceId`, not `ctx.subject.id`), 073
   `investigationResolutionMemory`, 074
   `investigationIncidentMemory`; omit empty. 056 / 059
   subject-scoped fields omitted (they ride live compose).
6. Named-id gates when Resource is missing? **Yes** — moved
   ahead of live compose: blank → `INVESTIGATION_ID_REQUIRED`;
   unknown → `INVESTIGATION_NOT_FOUND`; mismatch →
   `INVESTIGATION_SUBJECT_MISMATCH`. A bad id is never hidden
   behind `RESOURCE_NOT_FOUND`.
7. `content[]`: **short one-liner** (snapshot id + subject
   missing), not JSON dump, not CLI essay.
8. Tool description + `docs/public/MCP.md` investigate_resource
   row: **yes**, that row only.
9. Fifth tool / grouping `inv:` as members / infer latest /
   `occurredAt` / omitted-id survival / snapshot JSON rewrite /
   CLI change: **no.**
10. CLI reopen / `--compare` subject_missing /
    `get_related_context` error / 074 when Resource exists:
    **no change.**

Wrap site: `src/mcp/tools.ts` `investigate_resource` — the
071 / 072 named-id gate block moved before live compose; live
compose wrapped in an inner try that catches
`RESOURCE_NOT_FOUND` only after gates passed and an aligned
snapshot is loaded, returning the orphan sidecar payload;
compose-success path byte-identical. leftover[0]
`incident --investigation` stays usage.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **No.** Read of existing 048 / 049 /
   051 / 058 rows only.
2. Second source of truth? **No.** Snapshot = 048 row; compare =
   ephemeral 049; live compose = current local store when the
   Resource exists.
3. “You should”? **No** — one-liner and description label
   retained composition, not current provider truth, not a
   recommendation.
4. Snapshot-as-live-body? **No** — live keys omitted; snapshot
   stays `investigationSnapshot`.
5. Fifth tool needed? **No.** Reuses `investigationId`.
6. Grouping snapshots leak? **No.** leftover[0] frozen.
7. Infer latest? **No.** Named id only; test asserts the named
   (older) id wins while a newer snapshot exists.
8. Omitted-id survival? **No.**
9. Canon? AGENTS.md operational baseline + `docs/public/MCP.md`
   investigate_resource row only.

No STOP conflict.

## Implemented

- `src/mcp/tools.ts` `investigate_resource`: named-id gates
  (071 / 072) run before live compose whenever
  `investigationId` is present; live compose wrapped so a
  `RESOURCE_NOT_FOUND` after aligned gates returns an orphan
  success payload — `isError` false, live compose keys omitted
  (subject, subjectChanges, related, knownFacts, missingContext,
  providerActivity, timeline, subjectDeployments/WorkflowRuns/
  Operations/Releases/Issues, sharedCommitContext,
  sharedCommitCorrespondences, resolutionMemory,
  incidentMemory), sidecars included: `investigationCompare`
  (049 full object, `currentStatus: subject_missing`),
  `investigationSnapshot` (072), `investigationHistory`
  (070/050 via snapshot subject), `investigationResolutionMemory`
  (073), `investigationIncidentMemory` (074); empty lists
  omitted; `content[]` one-liner. Tool description gains the
  missing-Resource named-id clause and the omitted-id
  `RESOURCE_NOT_FOUND` sentence.
- `tests/app/mcp-protocol.test.ts` new Sprint 075 describe: three
  tests — (a) four tools + annotations, description clauses,
  omitted-id still `Resource not found`, orphan payload with all
  live keys absent (not null), exact snapshot / compare id (older
  named while newer exists), gates on deleted Resource
  (unknown / blank / whitespace / mismatch), `get_related_context`
  still errors, digest unchanged, `snapshot_json` free of sidecar
  keys; (b) 073 / 074 sidecars present on orphan when rows exist,
  omitted when empty, history `composedAt DESC`, per-subject
  isolation; (c) 074 unchanged when the Resource exists (live
  `subject` present, compare `available`, `knownFacts` present).
- `docs/public/MCP.md` investigate_resource row: missing-Resource
  named-id observe sentence (omitted-id still
  `RESOURCE_NOT_FOUND`).

## Deviations

None.

## Validation

```text
baseline:          d31b75c docs(sprints): mark 074 complete
                   1101 pass / 78 files / 5480 expect()
bun test:          1104 pass across 78 files (5563 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-075-dogfood (never ./.combie)
                   init + fixture (sentry project + github repo +
                     code_mapped_to relationship)
                   investigate --save → inv:ec4f4432…
                   DELETE FROM resources (both rows)
                   MCP omitted id: RESOURCE_NOT_FOUND / isError
                   MCP named inv:ec4f4432…: isError not set;
                     investigationSnapshot.id matches;
                     investigationCompare.currentStatus =
                     subject_missing; keys = [investigationCompare,
                     investigationHistory, investigationSnapshot];
                     no top-level subject / knownFacts /
                     resolutionMemory / incidentMemory;
                     content one-liner; digest unchanged
                   get_related_context on missing Resource:
                     isError
                   investigation inv:ec4f4432…: CLI reopen
                     unchanged (exit 0, snapshot banner)
                   investigation inv:ec4f4432… --compare:
                     subject_missing, remains reopenable (exit 0)
                   incident --investigation … --investigation …:
                     still usage (exit 1) (leftover[0] frozen)
                   investigate <id>: Resource not found (exit 1)
                   four tools; NO_FIFTH_TOOL=true
                   Founder .combie/combie.db (245760 bytes) and
                     ~/.combie/combie.db (135168 bytes) mtime/size
                     unchanged.
```

## Learnings

- Run the 071 / 072 gates before live compose so a named id is
  never hidden behind `RESOURCE_NOT_FOUND`; the orphan catch
  needs the already-loaded snapshot as its guard, which makes
  “gates passed” and “named id” the same condition.
- `investigationHistory` on the orphan path must key off
  `investigationSnapshot.subjectResourceId` (050 read-time
  filter), not `ctx.subject.id` — the live context does not
  exist there, and the durable row outlives the Resource.
- `compareInvestigationToCurrent` already returns the full 049
  object with `currentStatus: "subject_missing"` when the
  subject is gone; the orphan path needed zero new compare
  semantics.
- 056 / 059 subject-scoped fields stay glued to live compose;
  only the named-id sidecars (071–074) and 070 history survive
  subject deletion, which keeps “current local store” and
  “retained composition” visibly separate in the payload.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md
baseline becomes Sprints 001–075 complete.
`docs/public/MCP.md` investigate_resource row gains the
missing-Resource named-id observe. Grouping Investigation
snapshots as Incident members remains unearned. Fifth-tool
snapshot reopen / `list_investigations` remains unearned.
`occurredAt` remains unearned.
