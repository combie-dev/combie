# SPRINT-069 — Investigation Snapshot Pointers on Live Investigate

> **Status:** Complete
> **Depends on:** SPRINT-068 (complete)
> **Authorized by:** founder override, 2026-08-18 — continue
> `docs/internal/ROADMAP.md` v0.6 Investigation historical retrieval
> on the live compose path, after 048 save / 049 compare / 050
> subject list exist. Replaces the AGENTS.md line that 068 leftover
> is not a sequence and grouping Investigation snapshots as Incident
> members remains unearned — leftover[0] stays **unearned**
> (Investigation ≠ Incident; members stay `res:`). Leftover[1]
> **MCP read of snapshots / list_resolutions** is not this Sprint:
> `list_resolutions` already shipped as 056 `resolutionMemory`;
> snapshot MCP as a fifth tool stays frozen; additive snapshot MCP
> without CLI compose pointers would invert 052 → 056. This Sprint
> takes leftover[2] **CLI snapshot pointers only**. Does **not**
> authorize Recommendation, Learning, similarity, Investigation
> lifecycle, MCP writes, a fifth tool, inferred Action, grouping
> snapshots as members, `occurredAt`, or rewriting snapshot JSON.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.6 Investigation —
> **exact-id snapshot pointers on live `investigate` / investigation
> reopen**, not lifecycle, not the Investigation Engine, not
> Operational Memory Incident grouping, not snapshot MCP, not MCP
> writes
> **Type:** Narrow read-time list over the existing 048 Investigation
> table (050 filter), projected onto the compose / reopen paths
> **Primary goal:** When a human investigates an exact Resource, or
> reopens a saved snapshot, Combie shows retained Investigation
> snapshot summaries for that exact subject — omitted when empty —
> without mixing them into Known Facts, without rewriting snapshot
> JSON, without grouping `inv:` ids as Incident members, and without
> thawing MCP.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. No new `investigate_resource` field.
> `incidentMemory` / `resolutionMemory` unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 048–050 shipped save, reopen, compare, and subject-scoped
list:

```text
investigate <id> --save
investigations
investigations --resource <resource-id>
investigation <id>
investigation <id> --compare
```

Live compose still does not point at those rows:

```text
investigate github:repository:1001
  # live compose + RESOLUTION MEMORY + INCIDENT MEMORY
  # no pointer to inv:… saved for this subject
investigations --resource github:repository:1001
  # the human must already know to run a second command
```

Sprint 068 leftover:

```text
069+      group Investigations directly only if earned
          MCP read of snapshots / list_resolutions only if earned
          Investigation snapshot pointers on live investigate
            only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
068 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. Leftover[0] stays
unearned.

Leftover[1] **MCP read of snapshots / list_resolutions** conflates
two objects 056 already split. `list_resolutions` shipped as
additive `resolutionMemory` on the existing tool. Snapshot MCP as
a fifth tool stays frozen. Additive snapshot MCP without CLI
compose pointers would invert 052 → 056 (CLI path-in-use first).
Leftover[1] stays later.

This Sprint takes leftover[2] **CLI snapshot pointers** only under
the founder override below. Investigation lifecycle, grouping
`inv:` as members, `occurredAt`, and snapshot MCP stay later /
frozen.

It is **not** grouping Investigation snapshots as Incident members.
`--investigation` on `incident` create stays usage.

It is **not** 050 `investigations --resource`. That list command
stays. This Sprint is pointers on the compose / reopen path
already in use.

It is **not** 048 snapshot JSON. Recall is read-time over the 048
table. `--save` still persists `InvestigationContext` only.

It is **not** 049 `--compare`. Compare stays two
`InvestigationContext` values. No history section on `--compare`.

It is **not** RESOLUTION MEMORY or INCIDENT MEMORY. Those stay
organizational response. This is retained composition.

It is **not** MCP writes, a fifth tool, a new MCP field,
lifecycle, or inferred snapshots from provider activity.

---

# Founder Override

`AGENTS.md` after Sprint 068 recorded that the 068 leftover is not
a sequence, grouping Investigation snapshots as Incident members
remains unearned, and `occurredAt` remains unearned. Sequencing
Rule 2 still holds: Incident members stay `res:`. Grouping `inv:`
ids as members is not the next slice.

On 2026-08-18 the product owner recorded this explicit override:

- ROADMAP determines direction. Direction inside remaining v0.6
  historical retrieval includes live-investigate pointers now that
  050 subject list exists. A compose path that can save snapshots
  but does not point at them hides retained composition.
- Evidence determines aggressiveness. Aggressiveness here is: ship
  named pointers on live `investigate` / reopen now that 048–050
  exist, rather than waiting for a ledger of “I saved it and
  investigate still looks like I never did.”
- Leftover[0] (group snapshots as members) is **not** authorized.
  Investigation ≠ Incident. Members stay `res:`.
- Leftover[1] snapshot MCP / fifth tool / `list_resolutions` tool
  is **not** authorized. 056 already shipped Resolution recall on
  the existing tool. CLI pointers first (052 analog).
- `occurredAt` is **not** authorized. Second time field.
- Investigation lifecycle is **not** authorized. Status is still a
  process claim.
- The override replaces the “unearned” gate for **starting this
  slice**. It does not rewrite the dogfood protocol’s decision
  rule, and it does not authorize Recommendation, Learning,
  similarity, Investigation lifecycle, MCP writes, a fifth tool,
  grouping snapshots as members, or `occurredAt`.
- Same pattern as Sprint 067 → 068: leftover order is not a
  sequence; leftover[0] is skipped because it conflicts with
  Investigation ≠ Incident. Leftover[1] is skipped because it
  conflates objects and would invert 052 → 056. This Sprint takes
  CLI snapshot pointers only.

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
deterministic composition                          ← 043–047
    ↓
persist retained composition                       ← 048
    ↓
compare retained vs current                        ← 049
    ↓
retrieve retained compositions by subject          ← 050
    ↓
point at those rows on the compose path in use     ← this Sprint
    ↓
MCP observe of those pointers                      ← not this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

Sequencing Rule 9: persistence is **not** necessary. Read-time
list over the 048 table (050 `subjectResourceId` filter). Do not
add a column. Do not rewrite `snapshot_json`. Do not UPDATE
`composed_at`.

Sequencing Rule 8: snapshot identity has one source of truth —
the 048 Investigation row. Pointers name exact `inv:` ids. Do not
infer snapshots from provider activity or Incident members.

Sequencing Rule 2: 048 `--save`, 049 `--compare`, and 050
`investigations --resource` stay those paths. 052–059 memory
sections stay organizational response. This Sprint does not
replace those.

Sequencing Rule 4: the new claim is “Combie retained these
compositions of this exact subject,” not “these Investigations
are now an Incident” and not “this is current provider truth.”

---

# Problem

After save:

```text
investigate github:repository:1001 --save     # Saved investigation snapshot inv:…
investigate github:repository:1001
  # live compose; no inv: pointer
investigations --resource github:repository:1001
  # the human must already know the second command
```

The missing claim on the path already in use:

```text
Combie retained these Investigation snapshots of this exact
subject. They are not current provider truth.
```

That is explicit. It is **not** inferred from provider activity.
It is **not** grouping `inv:` snapshots as Incident members. It
is **not** snapshot MCP. It is **not** lifecycle.

---

# Product Question

> After Investigation snapshots can be saved, reopened, compared,
> and listed by subject, can Combie point at those exact `inv:`
> ids on live `investigate` and `investigation <id>` reopen —
> omitted when empty, not in snapshot JSON, not on `--compare` —
> without grouping them as Incident members, without a fifth
> tool, without MCP writes, and without Investigation lifecycle?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.6** names historical retrieval.
   050 lists by subject. Live compose still omits the pointer.
   That is the 052 hole for retained composition.
2. **Founder override 2026-08-18** replaces the unearned gate for
   CLI pointers. Leftover[0] stays frozen (Investigation ≠
   Incident). Leftover[1] snapshot MCP stays later (052 → 056).
3. **Existing primitive check:** 050 `listInvestigations({
   subjectResourceId })` already returns the rows. This Sprint is
   projection onto compose / reopen. Do not add a table. Do not
   replace `investigations --resource`.
4. **Sequencing Rule 8 / 9:** read-time only. No `incident_id`.
   No `inv:` as Incident members. No snapshot JSON rewrite.
5. **MCP** stays four read-only tools. No new field this Sprint.

Rejected as 069 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | Leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Fifth tool / `list_investigations` MCP | Frozen four-tool contract |
| Additive snapshot field on `investigate_resource` | 056 analog; CLI pointers first |
| `list_resolutions` MCP tool | Already 056 `resolutionMemory` |
| `--compare` history section | 049 freeze; ephemeral diff of two composes |
| Rewrite snapshot JSON | Recall is read-time |
| Investigation lifecycle | Status is still a process claim |
| `occurredAt` | Second time field; 068 leftover |
| Similarity | Forbidden |

---

# Exact Capability

```text
combie investigate <resource-id>
        ↓
compose InvestigationContext (unchanged)
listInvestigations({ subjectResourceId })   050, unchanged table
        ↓
print live compose
print additive INVESTIGATION HISTORY section if rows exist
  summaries only (id, composedAt)
        ↓
existing RESOLUTION MEMORY / INCIDENT MEMORY unchanged

combie investigation <id>
        ↓
load snapshot (048, unchanged JSON)
listInvestigations({ subjectResourceId })   same subject
        ↓
print 048 reopen body
print additive INVESTIGATION HISTORY section if rows exist
        ↓
snapshot row unchanged
```

`--save` still persists `InvestigationContext` only. After insert,
the live output’s history section includes the new `inv:`
(read-time). Confirmation banner stays 048.

`--compare` remains 049: two `InvestigationContext` values. No
history section.

Exact section title/copy is Phase 1. Expected: **INVESTIGATION
HISTORY** (050 language). Do not invent INVESTIGATION MEMORY
(would collide with RESOLUTION / INCIDENT MEMORY and with the
Investigation Engine noun).

`--investigation` / `--resource` on `incident` stay usage.

Pointer constraints:

- Exact subject id (live compose subject, or saved snapshot
  `subjectResourceId`). No substring. No similarity.
- Summaries only: exact `inv:` id + `composedAt`. Not snapshot
  JSON. Not Known Facts. Not essays.
- Order: 050 (`composedAt` DESC, `id` DESC). Phase 1 confirms.
- Omit the section when zero rows (052 omit-when-empty). Do not
  reuse the 050 known-empty list copy on investigate.
- Reopen includes the current snapshot in the list (honest 050
  membership). Phase 1 confirms.
- Subject Resource deleted: live investigate still
  `RESOURCE_NOT_FOUND` (compose fails). Reopen still works; history
  lists by copied `subjectResourceId` (050 survival).
- Resolution rows / Incident rows unchanged.
- Snapshot JSON unchanged.

058–068 Incident / Resolution paths are unchanged.

---

# Evidence / Claim Semantics

### KNOWN (about the snapshots)

```text
Combie retained these Investigation snapshots of this exact
subject. They are retained composition at composedAt, not current
provider truth.
```

### UNKNOWN / stale (required)

A snapshot is **retained composition**, not proof providers still
agree, not a proven outage, and not an Incident. Pointing at
`inv:` ids is not “these Investigations are now one occurrence.”

### Forbidden

```text
You should rollback
These are similar investigations
This Investigation is now an Incident
resolved: true / this investigation is closed
```

---

# Architecture

```text
investigations table (048)                         unchanged
        ↓
listInvestigations({ subjectResourceId })          050
        ↓
formatInvestigationHistory                         this Sprint
        ↓
CLI investigate / investigation <id>
```

Ownership:

- **Domain / Store:** no new type. No new column. No `incident_id`.
  Do not store `inv:` ids as Incident members. Do not DELETE
  snapshots. Do not rewrite `snapshot_json` or `composed_at`.
- **App:** a history helper (name is Phase 1; expected
  `formatInvestigationHistorySection` /
  `formatWithInvestigationHistory`) distinct from 050 list copy
  (known-empty) and from RESOLUTION / INCIDENT MEMORY. Read-time
  050 list only.
- **CLI:** wrap live compose and reopen with the section when rows
  exist. Help: one line that investigate / reopen show retained
  snapshots when present. 048/049/050 commands unchanged.
- **MCP / Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as Incident members, to put snapshots on
`InvestigationContext` / `snapshot_json`, to add MCP fields, or
to infer snapshots: **STOP.**

---

# Persistence vs Read-Time

| Snapshot JSON | 050 table | Live investigate |
| --- | --- | --- |
| Frozen InvestigationContext | Unchanged rows | Read-time 050 list |
| Unchanged JSON | no new column | omitted when empty |

Must **not**:

- add `incident_id` on `resolutions`
- store `inv:` ids as Incident members
- rewrite snapshot JSON
- rewrite `composed_at`
- put snapshots on `InvestigationContext`
- add a history section to `--compare`
- add MCP tools or writes or a new MCP field
- treat 050 known-empty copy as the investigate section
- create Relationships or Changes
- refresh providers
- infer snapshots from members / evidence / activity
- add Investigation lifecycle / `resolved: true`

---

# Boundedness

- Existing `investigate` and `investigation <id>` commands. No new
  verb.
- Pointers only for the exact subject of that compose / snapshot.
- Named 050 membership only. No inferred snapshots.
- No grouping of Investigation snapshots as Incident members.
- No MCP change. No `--compare` change. No snapshot schema change.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- Subject Resource missing on live investigate: existing
  `RESOURCE_NOT_FOUND`. No history section (compose did not run).
- Unknown `inv:` on reopen: existing `INVESTIGATION_NOT_FOUND`.
- Zero snapshots for that subject: omit the section (exit 0).
- 050 `investigations --resource` known-empty copy unchanged.
- Untrusted snapshot JSON on reopen: existing
  `INVESTIGATION_SNAPSHOT_UNTRUSTED`; do not invent history from
  a corrupt row. Phase 1 confirms sibling list still uses the
  050 table (row metadata), not the JSON.
- `--compare`: no history section.
- `--investigation` / `--resource` on `incident`: existing usage.

---

# Affected Surfaces

### CLI

- `investigate <resource-id>` additive INVESTIGATION HISTORY
  (omitted when empty)
- `investigate <resource-id> --save` same wrap on live output;
  048 confirmation unchanged
- `investigation <id>` additive INVESTIGATION HISTORY (omitted
  when empty)
- help: one line that investigate / reopen show retained
  snapshots when present
- 048 / 049 / 050 unchanged on their paths

### MCP

Four tools. No writes. No new fields. `docs/public/MCP.md`
unchanged unless Phase 1 finds a lie (expected: **no**).

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md`
v0.6 historical retrieval, this Sprint, SPRINT-050 list shape /
known-empty, SPRINT-052 omit-when-empty wrap, SPRINT-056 leftover
split (snapshot MCP frozen), SPRINT-068 leftover[0] (members stay
`res:`), and inspect:

- CLI `investigate` / `--save` / `investigation <id>` wrap order
  (resolution then incident)
- `listInvestigations({ subjectResourceId })` / 050 order
- `formatInvestigationList` known-empty copy (must not reuse on
  investigate)
- `InvestigationContext` / `snapshot_json` fields (must not add
  history)
- MCP `investigate_resource` fields (must not add this Sprint)

Report:

1. CLI: live `investigate` / reopen show 050 summaries for that
   exact subject? Expected: **yes** (new omit-when-empty section).
2. 050 `investigations --resource` unchanged? Expected: **yes.**
3. Snapshot JSON / `InvestigationContext` unchanged? Expected:
   **yes.**
4. `--compare` unchanged? Expected: **yes.**
5. `--save` still persists compose only; history is read-time
   after insert? Expected: **yes.**
6. Zero rows omit the section (not 050 known-empty copy)?
   Expected: **yes.**
7. MCP four tools, no new field? Expected: **yes.**
8. `incident_id` / `inv:` members / `occurredAt`? Expected: **no.**
9. Section distinct from RESOLUTION / INCIDENT MEMORY; names
   `inv:` ids? Expected: **yes.**
10. Group snapshots as members, fifth tool, MCP writes, lifecycle,
    snapshot MCP? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **No** — read-time 050 list.
2. Second source of truth? **No** if pointers stay 048 ids.
3. Inferred snapshots? **No** — exact subject membership only.
4. 050 / 052 / 059 leak? **No** — list command and memory
   sections stay those paths.
5. Grouping snapshots leak? **No** — leftover[0] stays frozen.
6. MCP tool / write / new field needed? Expected: **no.**
7. Compare / snapshot change? Expected: **no.**
8. `incident_id` / `inv:` members / lifecycle / `occurredAt`?
   Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + CLI
   help. Not VISION / ARCHITECTURE / ROADMAP / SKILL / MCP.md.

If implementation is tempted to store `inv:` ids as members, to
add a fifth tool, to put snapshots on `InvestigationContext`, or
to thaw MCP writes: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- live `investigate` shows INVESTIGATION HISTORY with exact `inv:`
  ids + `composedAt` for that subject; omitted when empty
- `investigation <id>` reopen shows the same subject list
- `--save` live output includes the new `inv:` (read-time); snapshot
  JSON still has no history field
- 050 `investigations --resource` unchanged (including known-empty)
- `--compare` has no INVESTIGATION HISTORY
- other subjects’ snapshots do not appear
- subject Resource deleted: live investigate still
  `RESOURCE_NOT_FOUND`; reopen still lists by copied subject id
- RESOLUTION MEMORY / INCIDENT MEMORY unchanged
- `--compare` / snapshot JSON / MCP four tools / no writes / no new
  MCP field
- no `incident_id` column; no `inv:` Incident members
- help mentions investigate / reopen snapshot history
- leftover[0]: `incident --investigation` still usage

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
investigate <id>                                 # no INVESTIGATION HISTORY
investigate <id> --save                          # inv:a; history names inv:a
investigate <id>                                 # INVESTIGATION HISTORY inv:a
investigate <id> --save                          # inv:b; history names both
investigation inv:a                              # history names inv:a and inv:b
investigations --resource <id>                   # 050 list unchanged
investigation inv:a --compare                    # no INVESTIGATION HISTORY

# bounds
incident --investigation inv:a --investigation inv:b
  # still usage (leftover[0] frozen)
```

---

# Explicit Non-Goals

Do **not** implement:

- grouping Investigation snapshots as Incident members
- additive snapshot field on `investigate_resource`
- fifth tool / `list_investigations` / `list_resolutions` MCP
- MCP writes
- snapshot JSON rewrite
- putting snapshots on `InvestigationContext`
- INVESTIGATION HISTORY on `--compare`
- Investigation or Incident lifecycle / `resolved: true`
- `occurredAt`
- `incident_id` on Resolution rows
- deleting snapshots or the Incident
- membership mutate
- similarity, “you should”, Learning, Recommendation
- inferred snapshots from members / subject / evidence
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
066       retitle an existing Incident                             ✅
067       clear an existing Incident title                         ✅
068       rewrite an existing Incident recordedAt                  ✅
069       Investigation snapshot pointers on live investigate      ← this
070+      group Investigations directly only if earned
          MCP observe of snapshot pointers only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          inferred activity→Action (never, unless a later sprint
            explicitly reverses 051)
          similarity / recommendation / learning (v0.8)
          policy / execution (v0.9)
```

---

# Product / Contract Freezes

- MCP: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource` (exactly four; still read-only; no writes;
  no new field)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 050 `investigations --resource` unchanged
- 052 RESOLUTION MEMORY / 059 INCIDENT MEMORY unchanged
- grouping `inv:` as Incident members frozen
- `occurredAt` frozen
- snapshot MCP / fifth tool frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None required. Pointers are a read-time 050 list. No schema change.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as members, to rewrite `snapshot_json`, or to add MCP fields:
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

- [x] Sprint 069 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: live `investigate` / `investigation <id>` show
      050 summaries for that exact subject; omitted when empty;
      048 / 049 / 050 unchanged on their paths
- [x] if earned: no inferred snapshots; no `inv:` members; no
      `incident_id`; no MCP writes; no fifth tool; no new MCP
      field; no snapshot JSON rewrite
- [x] if not earned: rejection documented; do not invent pointers
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help

---

# Final Principle

> **Sprint 048 remembered a composition. Sprint 050 can list those
> compositions by subject. Sprint 069 may point at those exact
> snapshots on the investigate path already in use. Combie must not
> invent the pointer, must not treat an Investigation as an
> Incident, must not put those rows on the snapshot JSON, and must
> not thaw MCP to ship the pointer.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `5afa171` (authoring-only working tree: AGENTS.md Active +
untracked `SPRINT-069.md`). Pins:

1. CLI: live `investigate` / reopen show 050 summaries for that
   exact subject — **yes** (`INVESTIGATION HISTORY`, omit-when-empty).
2. 050 `investigations --resource` unchanged — **yes.**
3. Snapshot JSON / `InvestigationContext` unchanged — **yes.**
4. `--compare` unchanged — **yes** (no wrap).
5. `--save` still persists compose only; history is read-time
   after insert — **yes.** `saveInvestigation.liveOutput` stays
   compose-only; CLI wraps after insert.
6. Zero rows omit the section (not 050 known-empty copy) — **yes.**
7. MCP four tools, no new field — **yes.**
8. `incident_id` / `inv:` members / `occurredAt` — **no.**
9. Section distinct from RESOLUTION / INCIDENT MEMORY; names
   `inv:` ids — **yes.** Wrap order: compose → history →
   resolution → incident.
10. Group snapshots as members, fifth tool, MCP writes, lifecycle,
    snapshot MCP — **no.** leftover[0] `incident --investigation`
    stays usage.

`listInvestigations({ subjectResourceId })` is `composedAt DESC,
id DESC`. Reopen includes the current snapshot (honest 050
membership). Corrupt JSON still fails reopen before wrap.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **No** — read-time 050 list.
2. Second source of truth? **No.**
3. Inferred snapshots? **No.**
4. 050 / 052 / 059 leak? **No.**
5. Grouping snapshots leak? **No.** leftover[0] frozen.
6. MCP tool / write / new field needed? **No.**
7. Compare / snapshot change? **No.**
8. `incident_id` / `inv:` members / lifecycle / `occurredAt`?
   **No.**
9. Canon? AGENTS.md operational baseline + CLI help only.

No STOP conflict.

## Implemented

- Live `investigate`, `investigate --save` live output, and
  `investigation <id>` reopen wrap 050 subject summaries as
  **INVESTIGATION HISTORY** when rows exist (id + `composedAt`;
  subject column omitted). Omit when empty. Show first `inv:`.
- Helpers: `formatInvestigationHistorySection` /
  `formatWithInvestigationHistory` in `src/app/investigations.ts`.
- `--save` confirmation stays 048. Snapshot JSON /
  `InvestigationContext` unchanged. `--compare` has no history
  section. 050 list known-empty copy unchanged.
- Help: one line that investigate / reopen show retained
  snapshots when present.
- leftover[0]: `incident --investigation` still usage.
- MCP: four tools, no new field, no writes.

## Deviations

Tightened one Sprint 051 CLI assertion from `/incident/i` to
`INCIDENT MEMORY` / `INCIDENT` heading so authorized history copy
("They are not an incident.") does not false-fail. Product
behavior of that 051 path is unchanged.

## Validation

```text
baseline:          5afa171 docs(sprints): mark 068 complete
                   1090 pass / 78 files / 5142 expect()
bun test:          1096 pass across 78 files (5240 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-069-dogfood.* (never ./.combie)
                   investigate: no INVESTIGATION HISTORY
                   --save inv:a: history names inv:a
                   investigate: history names inv:a
                   --save inv:b: history names both
                   investigation inv:a: history names both
                     (composedAt DESC)
                   investigations --resource: 050 table, no
                     HISTORY heading
                   --compare: INVESTIGATION COMPARE, no HISTORY
                   incident --investigation still usage
                   snapshot JSON has no history field / heading
                   Isolated dogfood left founder .combie/combie.db
                   mtime/size unchanged.
```

One MCP stdio digest assertion (Sprint 056, not this slice) can
flake under parallel `bun test`; isolation and this full-suite
run passed. Four tools and no writes held.

## Learnings

- History wrap belongs on the CLI compose / reopen / `--save`
  live-output paths, not inside `saveInvestigation.liveOutput`,
  so 048 "live output matches unsaved investigate" stays true.
- 050 known-empty list copy must not leak onto investigate;
  omit-when-empty is the 052 shape.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged. AGENTS.md baseline becomes Sprints 001–069 complete.
Sprint 070 is not started. Grouping Investigation snapshots as
Incident members remains unearned. Snapshot MCP / fifth tool
remains unearned. `occurredAt` remains unearned.
