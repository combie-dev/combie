# SPRINT-070 — Investigation History on investigate_resource

> **Status:** Complete
> **Depends on:** SPRINT-069 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.6 Investigation
> historical retrieval on the agent investigate path already in use,
> after 069 CLI pointers exist. Sprint 069 leftover list is **not**
> a sequence. leftover[0] **group Investigations as Incident
> members** stays **unearned** (Investigation ≠ Incident; members
> stay `res:`). leftover[1] **MCP observe of snapshot pointers**
> is this Sprint: the 052 → 056 analog now that CLI compose
> pointers exist. Fifth-tool snapshot MCP (`list_investigations`,
> snapshot reopen / compare tools) stays frozen. Does **not**
> authorize Recommendation, Learning, similarity, Investigation
> lifecycle, MCP writes, a fifth tool, inferred Action, grouping
> snapshots as members, `occurredAt`, or rewriting snapshot JSON.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.6 Investigation —
> **exact-id snapshot-pointer observe on existing
> `investigate_resource`**, plus v0.4 CLI + MCP parity for that
> live investigate surface; not lifecycle, not the Investigation
> Engine, not Operational Memory Incident grouping, not a fifth
> tool, not MCP writes
> **Type:** Narrow additive MCP field over already-persisted
> Investigation snapshot summaries (048 table, 050 filter, 069
> projection)
> **Primary goal:** When an agent investigates an exact Resource
> through the existing `investigate_resource` tool, Combie returns
> retained Investigation snapshot summaries for that exact subject
> as an additive structured field — the 069 INVESTIGATION HISTORY
> projection, omitted when empty — without a fifth tool, without
> mixing them into Known Facts, without rewriting snapshot JSON,
> and without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. This
> Sprint adds an optional field on `investigate_resource` only. No
> fifth tool. No snapshot / `list_investigations` / compare tools.
> No writes. `resolutionMemory` / `incidentMemory` unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 069 shipped CLI snapshot pointers:

```text
investigate <resource-id>              INVESTIGATION HISTORY
investigate <resource-id> --save       same wrap after insert
investigation <id>                     same subject list on reopen
```

`investigate_resource` still looks like no snapshots were saved.
Agents have no `investigations` command and no `investigation <id>`
reopen. The 052 hole — “the path already in use omits the record” —
is now open on the agent interface for retained composition.

Sprint 069 leftover:

```text
070+      group Investigations directly only if earned
          MCP observe of snapshot pointers only if earned
          Investigation lifecycle only if earned
          occurredAt only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.
069 did not earn leftover[0]. Grouping Investigation snapshots as
Incident members would store `inv:` ids as the occurrence. Members
stay `res:` ids. Investigation ≠ Incident. leftover[0] stays
unearned.

leftover[1] **MCP observe of snapshot pointers** is now earned.
069 skipped additive snapshot MCP because CLI compose pointers did
not exist yet (inverting 052 → 056). 069 shipped those CLI
pointers. Copying that stable summary projection onto the existing
tool is the 056 analog. It is **not** a fifth tool.

069 completion notes lumped “snapshot MCP / fifth tool” as
unearned. This Sprint **splits** that leftover the way 056 split
“MCP read of snapshots / resolutions”:

```text
fifth tool / list_investigations / snapshot reopen / compare MCP
  → still frozen
additive investigationHistory on existing investigate_resource
  → this Sprint (069 summaries; omit when empty)
```

No founder override is required. leftover[0] is skipped because it
conflicts with Investigation ≠ Incident, not because a later
leftover needs an override to start.

It is **not** grouping Investigation snapshots as Incident members.
`--investigation` on `incident` create stays usage.

It is **not** 050 `investigations --resource`. That list command
stays CLI. This Sprint is pointers on the live investigate tool
already in use.

It is **not** 048 snapshot JSON. Recall is read-time over the 048
table. `--save` still persists `InvestigationContext` only.

It is **not** 049 `--compare`, and it is not compare MCP.

It is **not** RESOLUTION MEMORY / `resolutionMemory` or INCIDENT
MEMORY / `incidentMemory`. Those stay organizational response.
This is retained composition.

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
compare retained vs current                        ← 049
    ↓
retrieve retained compositions by subject          ← 050
    ↓
point at those rows on the compose path in use     ← 069
    ↓
MCP observe of those pointers                      ← this Sprint
    ↓
earned abstraction                                 ← not this Sprint
```

`docs/internal/ROADMAP.md` v0.4 names CLI + MCP parity for core
read surfaces. `investigate_resource` is that surface for live
investigation. 069 put INVESTIGATION HISTORY on CLI live
investigate. This Sprint puts the same summaries on that tool.

Sequencing Rule 9: persistence is **not** necessary. Read-time
list over the 048 table (050 `subjectResourceId` filter). Do not
add a column. Do not rewrite `snapshot_json`. Do not UPDATE
`composed_at`.

Sequencing Rule 8: snapshot identity has one source of truth —
the 048 Investigation row. Pointers name exact `inv:` ids. Do not
infer snapshots from provider activity or Incident members.

Sequencing Rule 2: 048 `--save`, 049 `--compare`, 050
`investigations --resource`, and 069 CLI INVESTIGATION HISTORY
stay those paths. 052–059 memory fields stay organizational
response. This Sprint does not replace those.

Sequencing Rule 4: the new claim is “Combie retained these
compositions of this exact subject,” not “these Investigations
are now an Incident,” not “this is current provider truth,” and
not “here is the snapshot JSON.”

---

# Problem

After save:

```text
combie investigate <resource> --save     # INVESTIGATION HISTORY inv:…
combie investigate <resource>            # INVESTIGATION HISTORY inv:…
investigate_resource                     # live compose only
```

The CLI answers “which retained compositions exist for this exact
subject?” on the path already in use. Agents using the frozen
four-tool contract cannot. They cannot run
`investigations --resource`. They cannot reopen `investigation <id>`.
The rows exist and the subject is the one they are investigating.
The tool omits them.

---

# Product Question

> After Investigation snapshot pointers exist on live CLI
> `investigate`, can `investigate_resource` return those retained
> snapshot summaries as an additive structured field — exact-id
> only, omitted when empty, never mixed into Known Facts or
> `InvestigationContext`, without a fifth tool, without snapshot
> JSON, without MCP writes, without grouping `inv:` ids as
> Incident members, and without Investigation lifecycle?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.6** names historical retrieval.
   069 pointed at 050 rows on CLI live investigate. The next
   smallest version of that same claim is the agent investigate
   path that already exists. **v0.4** already named CLI + MCP
   parity for core read surfaces.
2. **Sprint 069 leftover** lists grouping snapshots as members
   first, only *if earned*. Investigation ≠ Incident; members stay
   `res:`. leftover[0] stays frozen. leftover[1] MCP observe is
   now earned because 069 shipped CLI pointers (052 → 056).
3. **069 payload freeze** was correct while CLI INVESTIGATION
   HISTORY did not exist. That projection is now stable (id +
   `composedAt`, omit when empty). Copying it onto the existing
   tool does not replay 069 as a fifth tool and does not open
   snapshot reopen / compare MCP.
4. **Existing primitive check:** `listInvestigations({
   subjectResourceId })` is already the CLI live-investigate
   source. Additive MCP fields are the 047 / 056 / 059 pattern on
   this same tool. Four tools stay four tools.
5. **Sequencing Rule 9:** persistence is **not** required.
6. **Founder override 2026-08-16** froze MCP *writes*. This is a
   read. It does not authorize `list_investigations`, snapshot
   reopen / compare tools, or writes.

Rejected as 070 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Group Investigation snapshots as members | leftover[0]; Investigation ≠ Incident; members stay `res:` |
| Fifth tool / `list_investigations` / snapshot reopen | Frozen four-tool contract; live investigate already has a tool |
| Snapshot JSON / full `InvestigationContext` on MCP | 069 summaries only; JSON stays 048 reopen |
| Compare field / `--compare` MCP | 049 freeze; ephemeral diff of two composes |
| `occurredAt` | Second time field; 068 leftover |
| Investigation lifecycle | Status is still a process claim |
| MCP writes | Founder override; policy is v0.9 |
| Similarity / “you should” | Forbidden |
| Putting history on `InvestigationContext` / `snapshot_json` | Recall stays read-time |
| HISTORY section on `--compare` | 069 freeze |
| Mixing snapshots into Known Facts | Different object |
| Inferred snapshots from members / activity | Forbidden |

---

# Exact Capability

```text
investigate_resource(resourceId)
        ↓
compose InvestigationContext (unchanged)
listInvestigations({ subjectResourceId: subject.id })   050
        ↓
structuredContent: existing compose keys unchanged
additive investigationHistory when rows exist
  per row: id, composedAt
        ↓
omit the key when zero rows
InvestigationContext and snapshot_json unchanged
```

CLI `investigate`, `investigation <id>` reopen, `--compare`,
`investigations --resource`, 069 INVESTIGATION HISTORY, 052
RESOLUTION MEMORY, and 059 INCIDENT MEMORY are unchanged.

`get_related_context` is unchanged.

`--save` must **not** serialize `investigationHistory` into
`snapshot_json`. Recall stays read-time against the 048 table,
same as CLI.

Exact field spelling is Phase 1. Expected:
**`investigationHistory`** (matches the CLI section name
INVESTIGATION HISTORY; 069 MCP freeze already names this key).
Not `investigationMemory` (would collide with RESOLUTION /
INCIDENT MEMORY and with the Investigation Engine noun). Not
`savedInvestigations` / `investigationSnapshots`. Not a formatted
essay string.

Payload constraints:

- Same filter as CLI live `investigate`: exact `subjectResourceId`.
- Same order: `composedAt` DESC, `id` DESC.
- Same summaries CLI INVESTIGATION HISTORY already shows: exact
  `inv:` id + `composedAt`. No snapshot JSON. No subject column
  (redundant on this path). Phase 1 may pin `subjectResourceId`;
  expected: **omit** (069 summaries).
- Distinct from `knownFacts`, `missingContext`, `providerActivity`,
  `timeline`, `sharedCommitContext`, `sharedCommitCorrespondences`,
  `resolutionMemory`, and `incidentMemory`.
- Labeled retained composition, not current provider truth, not an
  incident. Carry that label on the tool description (and Phase 1
  may add a stable sibling disclaimer string — expected:
  **description only**, no new essay key).
- Known-empty: omit the field (069 / 052). Never emit a Missing
  Context item for “no snapshots.” Do not reuse the 050
  known-empty list copy.
- `content[]` one-liner stays compose summary. Phase 1 may append
  a count when rows exist. Do not dump snapshot JSON or id essays
  into `content[]`.
- Subject Resource missing: existing `RESOURCE_NOT_FOUND` (the tool
  cannot compose). Orphaned snapshots remain listable on CLI
  `investigations --resource`. This Sprint does not add a second
  MCP entry point for that survival path.

The four-tool list is unchanged:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

069’s MCP freeze that forbids `investigationHistory` after
`--save` was “no new field this Sprint,” not a permanent ban.
This Sprint updates that assertion: the key is present when rows
exist and omitted when empty. Four-tool / no-writes freeze
remains.

---

# Evidence / Claim Semantics

### KNOWN (about the field)

```text
Combie has these retained Investigation snapshots of subject
<resource-id>, composed at their composedAt times.
```

Zero rows for that subject is **known-empty for that subject**, not
Missing Context, not a tool error.

### UNKNOWN / stale (required)

Returned rows remain **retained composition**, not current provider
authority. Returning them does not re-compose the snapshot, does
not imply the subject Resource still exists as current graph truth
beyond this live compose, and does not imply the snapshot is an
Incident or a recommendation.

### Forbidden

```text
These snapshots prove the current provider state
These Investigations are an Incident
You should reopen inv:…
resolved: true / this investigation is closed
This field is Known Facts
Saving an investigation freezes investigationHistory into the snapshot
Combie inferred these rows because a deploy happened after composedAt
This payload is the snapshot JSON / InvestigationContext
```

Provider activity remains provider activity. The field is exact-id
pointer observe, not causality, not a recommendation, not reopen.

---

# Architecture

```text
investigations table (048)                         unchanged
        ↓
listInvestigations({ subjectResourceId })          050
        ↓
investigate_resource structuredContent
  additive investigationHistory (this Sprint)
```

Ownership:

- **Domain / Store:** no new type. No new column. No `incident_id`.
  Do not store `inv:` ids as Incident members. Do not DELETE
  snapshots. Do not rewrite `snapshot_json` or `composed_at`.
- **App:** no new CLI helper. Reuse `listInvestigations`. MCP
  projection name is Phase 1; expected `toInvestigationHistory`
  next to `toResolutionMemory` / `toIncidentMemory` in
  `src/mcp/tools.ts`.
- **CLI:** unchanged, including 069 INVESTIGATION HISTORY.
- **MCP:** additive optional field on `investigate_resource`.
  Tool description clause. `docs/public/MCP.md` investigate_resource
  row only.
- **Compare / InvestigationContext:** unchanged.

Adapters do not participate.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as Incident members, to put snapshots on
`InvestigationContext` / `snapshot_json`, to return snapshot JSON
on MCP, or to infer snapshots: **STOP.**

---

# Persistence vs Read-Time

| Snapshot JSON | 050 table | investigate_resource |
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
- add MCP tools or writes
- return snapshot JSON / full compose as the new field
- treat 050 known-empty list copy as the MCP payload
- create Relationships or Changes
- refresh providers
- infer snapshots from members / evidence / activity
- add Investigation lifecycle / `resolved: true`

---

# Boundedness

- Existing `investigate_resource` tool. No fifth tool. No new verb.
- Pointers only for the exact subject of that live compose.
- Named 050 membership only. No inferred snapshots.
- No grouping of Investigation snapshots as Incident members.
- No CLI change. No `--compare` change. No snapshot schema change.
- `MAX_INVESTIGATION_FACTS = 5` unchanged. Snapshots are not facts.
- No cap that silently drops rows. No ranking.
- No extra hop. No provider calls. No schema migration.

---

# Failure / Unknown Semantics

- Subject Resource missing: existing `RESOURCE_NOT_FOUND`. No
  consolation history field (compose did not run).
- Zero snapshots for that subject: omit the field.
- 050 `investigations --resource` known-empty copy unchanged (CLI).
- Untrusted snapshot JSON on CLI reopen: unchanged 048 error. This
  Sprint lists row metadata (`id`, `composedAt`), not the JSON, so
  a corrupt JSON body does not invent MCP history and does not
  fail live `investigate_resource` (050 summaries do not parse
  JSON). Phase 1 confirms `listInvestigationSummaries` stays
  metadata-only.
- `--investigation` / `--resource` on `incident`: existing usage.
- Pre-048 database with no investigations table: existing upgrade
  already creates it; list empty → omit the field.

---

# Affected Surfaces

### CLI

Unchanged. 069 INVESTIGATION HISTORY stays. 048 / 049 / 050 stay.

### MCP

Four tools. Additive `investigationHistory` on
`investigate_resource` only, omitted when empty. No writes.
`docs/public/MCP.md` investigate_resource row (expected: **yes**,
that row only). Tool description clause (expected: **yes**).

### Compare

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.6
historical retrieval and v0.4 agent boundary, this Sprint,
SPRINT-069 CLI projection / MCP freeze, SPRINT-056 / 059 additive
fields, and inspect:

- `src/mcp/tools.ts` `investigate_resource` handler and description
- `listInvestigations({ subjectResourceId })` / 050 order
- `formatInvestigationHistorySection` (CLI summaries to copy)
- `tests/app/mcp-protocol.test.ts` four-tool + 069 freeze
  (`investigationHistory` / `savedInvestigations` keys)
- `docs/public/MCP.md` investigate_resource row
- 056 `resolutionMemory` omit-when-empty + `safeJson` undefined→null
- leftover[0] `incident --investigation` usage freeze

Report:

1. Field name: `investigationHistory` vs `investigationMemory`?
   Expected: **`investigationHistory`.**
2. Omit when empty vs always-present `[]`? Expected: **omit.**
   Never Missing Context.
3. Summaries (`id`, `composedAt`) vs snapshot JSON? Expected:
   **summaries.** No JSON. No subject column unless Phase 1 pins
   otherwise (expected: omit).
4. On `InvestigationContext`? Expected: **no.** Handler calls
   `listInvestigations`.
5. `content[]` one-liner: count when present? Pin one. No JSON dump.
6. Tool description clause? Expected: **yes.**
7. `docs/public/MCP.md` row? Expected: **yes**, that row only.
8. CLI / compare / snapshot JSON / `get_related_context`? Expected:
   **no change.**
9. Fifth tool, grouping `inv:` as members, `occurredAt`? Expected:
   **no.**
10. MCP writes, lifecycle, inferred snapshots? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no** (the claim is already on
   the 048 table).
2. Second source of truth? The field is retained composition,
   never current compose, never snapshot JSON, never Incident,
   never Known Facts.
3. Does showing `inv:` ids on MCP leak “you should reopen”? **No**,
   if labeled not current provider truth and not an incident —
   same CLI intro constraint. Do not rank, score, or suggest.
4. Does this become a fifth tool / snapshot reopen MCP? **No.**
   Live subject filter only. Summaries only.
5. Grouping snapshots leak? **No** — leftover[0] stays frozen.
6. Compare section / compare MCP needed? Expected: **no.**
7. CLI HISTORY change needed? Expected: **no.**
8. `incident_id` / `inv:` members / lifecycle / `occurredAt`?
   Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + the
   existing `docs/public/MCP.md` investigate_resource row. Not
   VISION / ARCHITECTURE / ROADMAP / SKILL.

If implementation is tempted to add `list_investigations`, to put
rows on `InvestigationContext`, to mix them into `knownFacts`, to
return snapshot JSON, to store `inv:` as Incident members, or to
save via MCP: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- still exactly four tools; annotations unchanged
- `get_related_context` payload unchanged
- empty subject: no `investigationHistory` key; compose keys still
  present; not Missing Context
- `--save` then `investigate_resource` returns that row (`id`,
  `composedAt`); order `composedAt` DESC, `id` DESC when several
- subject B does not receive subject A’s rows
- not present on `knownFacts`, `missingContext`, `providerActivity`,
  `timeline`, `sharedCommitContext`, `sharedCommitCorrespondences`,
  `resolutionMemory`, or `incidentMemory`
- DB digest unchanged after the call
- CLI `investigate` / reopen / `--compare` / `investigations
  --resource` unchanged when the MCP field is populated
- `--save` snapshot JSON still has no history field / heading
- unknown resourceId: existing error; no consolation snapshots
- 069 MCP freeze updated: key exists when rows exist; still no
  `savedInvestigations` / `investigationSnapshots` / fifth tool
- leftover[0]: `incident --investigation` still usage
- no write tool appears
- no `occurredAt` on the new rows

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names. Never
write to `./.combie`. Use a **script file** for argv (not
`bun -e … "$DIR"`). Invoke the CLI as `bun src/cli/index.ts … --dir`
(not `bun run`, which can swallow `--dir`).

```text
investigate <id>                                 # no INVESTIGATION HISTORY
# MCP investigate_resource: no investigationHistory key
investigate <id> --save                          # inv:a; CLI history names inv:a
# MCP investigate_resource: investigationHistory names inv:a
investigate <id> --save                          # inv:b
# MCP investigate_resource: both ids, composedAt DESC
investigations --resource <id>                   # 050 list unchanged
investigation inv:a --compare                    # no INVESTIGATION HISTORY
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
- a fifth MCP tool (`list_investigations`, snapshot reopen, compare)
- snapshot JSON / full `InvestigationContext` on MCP
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
- CLI copy / help changes (069 already shipped)
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
069       Investigation snapshot pointers on live investigate      ✅
070       Investigation history on investigate_resource            ← this
071+      group Investigations directly only if earned
          snapshot reopen / list / compare MCP only if earned
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
  additive `investigationHistory` on `investigate_resource` only)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 050 `investigations --resource` unchanged
- 069 CLI INVESTIGATION HISTORY unchanged
- 052 RESOLUTION MEMORY / 056 `resolutionMemory` unchanged
- 059 INCIDENT MEMORY / `incidentMemory` unchanged
- grouping `inv:` as Incident members frozen
- `occurredAt` frozen
- fifth tool / snapshot reopen / compare MCP frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP
- `docs/public/MCP.md` investigate_resource row only (this Sprint)

---

# Migration / Upgrade

None required. Pointers are a read-time 050 list. No schema change.

If implementation is tempted to add a fifth tool, to store `inv:`
ids as members, to rewrite `snapshot_json`, or to return snapshot
JSON on MCP: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 070 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `investigate_resource` returns retained snapshot
      summaries for that exact subject as an additive field;
      omitted when empty; not in Known Facts; not a fifth tool;
      not snapshot JSON
- [x] if earned: CLI unchanged; compare unchanged; no inferred
      snapshots; no `inv:` members; no `incident_id`; no MCP
      writes; no fifth tool
- [x] if not earned: rejection documented; do not add a fifth tool
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and the
      `docs/public/MCP.md` investigate_resource row

---

# Final Principle

> **Sprint 069 pointed at retained compositions on CLI investigate.
> Sprint 070 may observe those same exact pointers on the
> investigate tool agents already use. Combie must not invent the
> pointer, must not treat an Investigation as an Incident, must not
> put snapshot JSON on the tool, must not add a fifth tool, and
> must not thaw MCP writes to ship the pointer.**

---

# Completion Notes (2026-08-18)

## Phase 1 — Repository Understanding

HEAD `a56236d` (authoring-only working tree: AGENTS.md Active +
untracked `SPRINT-070.md`). Pins:

1. Field name: **`investigationHistory`.**
2. Known-empty: **omit the key.**
3. Rows: **`{ id, composedAt }` only**; no snapshot JSON; omit
   `subjectResourceId`.
4. Not on `InvestigationContext` — handler calls
   `listInvestigations`.
5. `content[]` one-liner **unchanged** (no count, no JSON dump).
6. Tool description clause: **yes.**
7. `docs/public/MCP.md` investigate_resource row: **yes**, that
   row only.
8. CLI / compare / snapshot JSON / `get_related_context`: **no
   change.**
9. Fifth tool / `inv:` members / `occurredAt`: **no.**
10. MCP writes / lifecycle / inferred snapshots: **no.**

`listInvestigations({ subjectResourceId })` is metadata-only
(`composedAt DESC, id DESC`). Corrupt snapshot JSON cannot fail
live MCP history. leftover[0] `incident --investigation` stays
usage. Wrap site: conditional spread next to `incidentMemory`.

## Phase 2 — Architecture Pressure

1. Persistence necessary? **No.**
2. Second source of truth? **No.**
3. “You should reopen”? **No** — description label only; no Show
   line on MCP.
4. Fifth tool / snapshot reopen MCP? **No.**
5. Grouping snapshots leak? **No.** leftover[0] frozen.
6. Compare / compare MCP? **No.**
7. CLI HISTORY change? **No.**
8. `incident_id` / `inv:` members / lifecycle / `occurredAt`?
   **No.**
9. Canon? AGENTS.md operational baseline + `docs/public/MCP.md`
   investigate_resource row only.

No STOP conflict.

## Implemented

- Additive `investigationHistory` on existing
  `investigate_resource`: `{ id, composedAt }[]`, omit when empty,
  `composedAt` DESC `id` DESC via `listInvestigations`.
- Helpers: `toInvestigationHistory` / `toInvestigationHistoryRow`
  in `src/mcp/tools.ts`. Conditional spread (not `undefined` →
  `null` via `safeJson`).
- Tool description clause: retained composition, not current
  provider truth, not an incident, not a recommendation.
- `docs/public/MCP.md` investigate_resource row only.
- 069 MCP freeze updated: key present when rows exist; still no
  fifth tool / `savedInvestigations` / `investigationSnapshots`.
- CLI INVESTIGATION HISTORY, `--compare`, 050 list, snapshot JSON,
  `resolutionMemory`, `incidentMemory` unchanged.
- leftover[0]: `incident --investigation` still usage.

## Deviations

None.

## Validation

```text
baseline:          a56236d docs(sprints): mark 069 complete
                   1096 pass / 78 files / 5240 expect()
bun test:          1097 pass across 78 files (5283 expect() calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   --dir /tmp/combie-070-dogfood.* (never ./.combie)
                   investigate: no INVESTIGATION HISTORY
                   MCP empty: no investigationHistory key
                   --save inv:a: CLI history + MCP names inv:a
                   --save inv:b: MCP lists inv:b then inv:a
                   investigations --resource: 050 table, no
                     HISTORY heading
                   --compare: INVESTIGATION COMPARE, no HISTORY
                   incident --investigation still usage
                   four tools; digest unchanged after MCP reads
                   snapshot JSON has no history field / heading
                   Isolated dogfood left founder .combie/combie.db
                   mtime/size unchanged.
```

One MCP stdio digest assertion (Sprint 056, not this slice) can
flake under parallel `bun test`; isolation and this full-suite
run passed. Four tools and no writes held.

## Learnings

- 069’s MCP freeze that forbade `investigationHistory` was “no
  new field this Sprint,” not a permanent ban; 070 updates that
  assertion in place.
- `content[]` stays the compose one-liner; dumping ids there
  would duplicate the structured field and look like a Show
  suggestion.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md
baseline becomes Sprints 001–070 complete.
`docs/public/MCP.md` investigate_resource row gains retained
investigation history. Sprint 071 is not started. Grouping
Investigation snapshots as Incident members remains unearned.
Fifth-tool snapshot reopen / list / compare MCP remains unearned.
`occurredAt` remains unearned.
