# SPRINT-056 — Resolution Recall on investigate_resource

> **Status:** Complete
> **Depends on:** SPRINT-055 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.7 Operational Memory
> (organizational precedent retrieval on the agent investigate path
> already in use). Sprint 055 leftover list is **not** a sequence;
> Resource-anchored Resolution remains unearned; inferred attribution
> from provider activity remains forbidden.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **exact-id Resolution recall on existing `investigate_resource`**,
> not a fifth tool, not snapshot MCP, not MCP writes, not Incident,
> not similarity, not Recommendation, not Resource-anchored Resolution,
> not inferred Action, not snapshot rewrite
> **Type:** Narrow additive MCP field over already-persisted Resolution
> rows
> **Primary goal:** When an agent investigates an exact Resource through
> the existing `investigate_resource` tool, Combie returns retained
> Resolutions for that exact subject as an additive structured field —
> the 052–054 RESOLUTION MEMORY projection, omitted when empty —
> without a fifth tool, without snapshot MCP, without mixing them into
> Known Facts, and without thawing MCP writes.
> **Provider scope:** None. No new provider reads. Lookup is local store
> only.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. This
> Sprint adds an optional field on `investigate_resource` only. No
> fifth tool. No snapshot / `list_resolutions` tools. No writes.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 051–055 shipped the smallest honest Operational Memory loop
on the CLI:

```text
051  persist decision / action / outcome on a saved Investigation
052  show those rows on investigate / investigation reopen
053  show the retained field text on those same paths
054  optional human-attached evidence ids on that response
055  retrieve by that exact evidence id on the resolutions list
```

That answers four ROADMAP v0.7 questions when a human already uses
the CLI:

```text
What did we decide last time?          ← 051–053
What action did we take?               ← 051–053
Did it work?                           ← 051–053
What evidence supported that decision?
        attach: the human named these ids     ← 054
        retrieve: which responses named this id  ← 055
```

`investigate_resource` still looks like no one responded. Agents
have no `resolutions` command. The 052 hole — “the path already in
use omits the record” — remains open on the agent interface.

Sprint 055 leftover:

```text
056+      Resource-anchored Resolution only if earned
          Incident grouping only if earned
          MCP read of snapshots / resolutions only if earned
          Investigation snapshot pointers on live investigate
            only if earned
          Investigation lifecycle only if earned
          inferred activity→Action (never, unless a later sprint
            explicitly reverses 051)
          similarity / recommendation / learning (v0.8)
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.

**Resource-anchored Resolution** is leftover #1 and is still
unearned. 055 retrieve does not change the write anchor (055
rejection table). Attachment remains Investigation.

**MCP read of snapshots / resolutions** conflates two objects 052
already split. Snapshot MCP is a v0.6 leftover (mixing retained
composition into live compose). Resolution recall on the existing
investigate tool is organizational response — the same object 052
put on CLI `investigate`.

This Sprint takes the smallest unfinished v0.7 capability that
051–055 already made necessary: the 052 lesson on the agent path
that already investigates.

```text
052–054  RESOLUTION MEMORY on CLI investigate / reopen
056      the same exact-id projection on investigate_resource
```

052–055 froze the MCP *payload* because the CLI projection was still
moving. After 054 the live-investigate projection (body + evidence)
is stable; 055 did not change it. Copying that stable projection
onto the existing tool does not replay 052–054 as three MCP sprints.

It is **not** similarity, Incident, Recommendation, or a fifth tool.

It is **not** Investigation lifecycle. Showing that a Resolution
exists does not close an Investigation and does not prove the
outcome.

It is **not** MCP writes. Founder override 2026-08-16 froze those.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Sequencing Rules (smallest deterministic
version; is persistence necessary; do not start a generic engine):

```text
exact evidence
    ↓
persist organizational response     ← 051
    ↓
recall on CLI investigate paths     ← 052–054
    ↓
retrieve by exact evidence id       ← 055
    ↓
recall on the agent investigate path ← this Sprint
    ↓
earned abstraction                  ← not this Sprint
```

Sequencing Rule 9: **no new persistence.** `listResolutions({
subjectResourceId })` already feeds CLI live `investigate`. Call it
from the existing tool handler. Do not write Resolutions into
`InvestigationContext`. Do not add columns.

`docs/internal/ROADMAP.md` v0.4 names CLI + MCP parity for core read
surfaces. `investigate_resource` is that surface for live
investigation. Snapshots stayed CLI-only after 048 on purpose;
Resolutions on CLI live investigate were accepted at 052 as a
different object. This Sprint is that same object, same live path,
agent interface.

---

# Problem

After `resolution --investigation inv:…`, two consumers investigate
the same exact subject:

```text
combie investigate <resource>     RESOLUTION MEMORY (052–054)
investigate_resource              live compose only
```

The CLI answers the v0.7 questions on the path already in use.
Agents using the frozen four-tool contract cannot. They cannot run
`resolutions --resource`. They cannot reopen `investigation <id>`.
The record exists and the subject is the one they are investigating.
The tool omits it.

ROADMAP v0.7 organizational precedent retrieval is supposed to be
answerable when investigating the same exact subject again — for
humans **and** agents. 052 said that for CLI. This Sprint says it
for `investigate_resource`.

---

# Product Question

> After explicit Resolutions exist for an exact subject Resource, can
> `investigate_resource` return those retained records as an additive
> structured field — exact-id only, omitted when empty, never mixed
> into Known Facts or `InvestigationContext`, without a fifth tool,
> without snapshot MCP, without MCP writes, without similarity,
> Incident, or inferred Action?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** already began at 051 with
   capture. 052–054 made investigation memory visible on CLI
   investigate. The next smallest version of that same claim is the
   agent investigate path that already exists.
2. **Sprint 055 leftover** lists Resource-anchored first, only *if
   earned*. Retrieve-by-evidence-id did not earn a new write anchor.
   The leftover bullet “MCP read of snapshots / resolutions” is two
   claims; this Sprint takes Resolution recall on the existing tool.
   Snapshot MCP stays frozen.
3. **052–055 payload freeze** was correct while CLI RESOLUTION
   MEMORY was still growing (summaries → body → evidence). That
   projection is now stable on live investigate. 055 added a list
   filter, not a new investigate section. The honest copy is one
   field, not three follow-up MCP sprints.
4. **Existing primitive check:** `listResolutions({ subjectResourceId
   })` is already the CLI live-investigate source. Additive MCP
   fields are the 047 pattern (`sharedCommitCorrespondences` on this
   same tool). Four tools stay four tools.
5. **Sequencing Rule 9:** persistence is **not** required.
6. **Founder override** froze MCP *writes*. This is a read. It does
   not authorize `list_resolutions`, snapshot tools, or writes.

Rejected as 056 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Resource-anchored Resolution (no Investigation) | 055 retrieve did not change the write anchor; no dogfood demanding otherwise |
| Incident grouping | Unearned; Investigation remains the anchor |
| Fifth tool (`list_resolutions`, `list_investigations`, snapshot reopen) | Four-tool contract; live investigate already has a tool |
| Snapshot fields on `investigate_resource` | 050 leftover; mixes retained composition into live compose; different object |
| MCP writes / record Resolution via MCP | Founder override; policy is v0.9 |
| Investigation lifecycle | Status is still a process claim |
| Similarity / “you should” / “has this happened before?” | v0.8; exact id + explicit text only |
| `resolutions --evidence` on MCP | 055 is a list query; this Sprint is investigate-path recall |
| Resolution / EVIDENCE section on `--compare` | Resolutions are not on `InvestigationContext` |
| Putting Resolutions on `InvestigationContext` / `snapshot_json` | Recall stays read-time; `--save` must not freeze response memory |
| Summaries-only MCP (replay 052 without body/evidence) | CLI projection is stable; do not open a 052 hole on the agent path |
| Inferred Action from newest deploy | Forbidden since 051 |

---

# Exact Capability

```text
investigate_resource(resourceId)
        ↓
compose InvestigationContext (unchanged)
listResolutions({ subjectResourceId: subject.id })   051 table
        ↓
structuredContent: existing compose keys unchanged
additive resolutionMemory when rows exist
  per row: id, investigationId, recordedAt,
           decision? / action? / outcome? / evidenceIds?
        ↓
omit the key when zero rows (Phase 1 may pin empty array)
InvestigationContext and snapshot_json unchanged
```

CLI `investigate`, `investigation <id>` reopen, `--compare`,
`resolutions --evidence`, and `resolution` record/show are
unchanged.

`get_related_context` is unchanged.

`--save` must **not** serialize `resolutionMemory` into
`snapshot_json`. Recall stays read-time against the resolutions
table, same as CLI.

Exact field spelling is Phase 1. Expected: **`resolutionMemory`**
(matches the CLI section name; `tests/app/mcp-protocol.test.ts`
already names this key in the freeze assertion). Not `resolutions`
(collides with the CLI list command). Not a formatted essay string.

Payload constraints:

- Same filter as CLI live `investigate`: exact `subjectResourceId`.
- Same order: `recordedAt` DESC, `id` DESC.
- Same fields CLI RESOLUTION MEMORY already shows. Omit absent
  optional fields; do not invent `"unknown"`.
- Distinct from `knownFacts`, `missingContext`, `providerActivity`,
  `timeline`, `sharedCommitContext`, and `sharedCommitCorrespondences`.
- Labeled retained organizational response, not current provider
  truth, not an incident, not a recommendation. Carry that label on
  the tool description (and Phase 1 may add a stable sibling
  disclaimer string — expected: **description only**, no new essay
  key).
- Known-empty: omit the field (052). Phase 1 may pin `[]` for
  key-stability (047 compose arrays). Pin one. Never emit a Missing
  Context item for “no resolutions.”
- `content[]` one-liner stays compose summary. Phase 1 may append a
  count when rows exist. Do not dump decision/action/outcome text
  into `content[]`.
- Subject Resource missing: existing `RESOURCE_NOT_FOUND` (the tool
  cannot compose). Orphaned Resolutions remain listable on CLI
  `resolutions --resource` / `--evidence`. This Sprint does not add
  a second MCP entry point for that survival path.

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
Combie has these retained Resolutions for subject <resource-id>,
recorded at their recordedAt times.
```

Zero rows for that subject is **known-empty for that subject**, not
Missing Context, not a tool error.

### UNKNOWN / stale (required)

Returned Resolutions remain **organizational response**, not current
provider authority. Returning them does not re-validate evidence ids
against live compose, does not imply the named evidence is still in
the compact activity window, and does not imply the outcome is still
true.

If evidence named at record time has aged out of this compose, the
Resolution still returns with those stored ids. The 054 claim is
“the human named this id,” not “this id is still attachable.”

### Forbidden

```text
These Resolutions prove dpl_abc was the Action
Newest deployment is the Action
You should rollback
These are similar incidents / this has happened before
resolved: true / this investigation is closed
This field is Known Facts
Saving an investigation freezes resolutionMemory into the snapshot
Combie inferred these rows because a deploy happened after composedAt
This is a prior Investigation snapshot
```

Provider activity remains provider activity. The Resolution remains
organizational response. The field is exact-id recall, not
causality, not a recommendation.

---

# Architecture

```text
resolutions table (051) + evidence_ids (054)   unchanged schema
        ↓
listResolutions({ subjectResourceId })         unchanged
        ↓
investigate_resource structuredContent
  additive resolutionMemory (this Sprint)
```

Ownership:

- **Domain:** no new durable object. `ResolutionRecord` stays 051+054.
- **Store:** no new columns, no new table, no new filter.
- **App:** reuse `listResolutions`. Do not put rows on
  `InvestigationContext`. A small MCP-facing projection (plain
  objects, omit empty optionals) may live next to the CLI formatter
  or in the tool handler — Phase 1 pins one. Do not reuse
  `formatResolutionMemorySection` as the structured payload.
- **MCP:** existing `investigate_resource` handler. Tool description
  gains one clause. `docs/public/MCP.md` investigate_resource row
  gains the field. No new tool registration.
- **CLI:** unchanged.
- **Adapters:** do not participate. No provider refresh.

047 added a compose array that is always present (`[]` when empty)
because it is InvestigationContext projection. This field is
organizational response. Default expectation: **omit when empty**,
like CLI. If Phase 1 finds client key-stability more important,
`[]` is allowed. Do not mix the two reasons.

---

# Persistence vs Read-Time

| Snapshot | Resolution | MCP investigate_resource |
| --- | --- | --- |
| Frozen InvestigationContext | Human-attached 051 row | Live compose + read-time list |
| 048 JSON | 054 column | Additive field; not in snapshot JSON |

Must **not**:

- insert or update Resolution rows
- rewrite snapshot JSON
- infer ids or rows at read time when none exist
- re-validate listed ids against live compose
- create Relationships or Changes
- refresh providers
- add a fifth MCP tool
- add snapshot / compare / evidence-list tools
- UPDATE existing Resolution rows
- add an Evidence table
- mix Resolutions into Known Facts or provider activity

---

# Boundedness

- Live `investigate_resource` only.
- Exact subject id. No name search, no glob, no similarity.
- One subject per call (the tool’s existing `resourceId`).
- Order matches 051: `recordedAt` DESC, `id` DESC.
- Rows are Resolution records (051+054 columns), not essays about
  them and not snapshot bodies.
- No fact-budget involvement (`MAX_INVESTIGATION_FACTS` stays 5).
- No extra hop. No provider calls.
- No schema migration.
- No retrieve-by-evidence on MCP.
- No `investigation <id>` reopen / `--compare` on MCP.
- No `context`, `related`, `history`, or CLI list changes.

---

# Failure / Unknown Semantics

- Uninitialized store: same as other MCP reads.
- Unknown `resourceId`: existing `RESOURCE_NOT_FOUND`; do not return
  orphaned Resolutions as a consolation payload.
- Subject exists, zero Resolutions: successful compose; omit
  `resolutionMemory` (or `[]` if Phase 1 pins that). Exit is the
  tool’s normal success.
- Named evidence no longer in live compose: still return the stored
  ids; do not re-validate; do not error.
- Corrupt stored JSON: 054 omit; those rows have no `evidenceIds`;
  they still return if they match the subject.
- Pre-054 DB / missing column: rows return without `evidenceIds`.
- DB bytes after the call: unchanged (existing MCP read-only
  contract).

---

# Affected Surfaces

### MCP

- `investigate_resource` — additive `resolutionMemory` when the
  exact subject has retained Resolutions.
- Tool description: one clause that retained organizational response
  may be present; not a recommendation; not current provider truth.
- `docs/public/MCP.md` — investigate_resource structured-result row
  only. Do not write `MCP_SPEC.md`.
- Still exactly four tools. `get_related_context` unchanged.

### CLI

Unchanged. `investigate` / reopen RESOLUTION MEMORY, `resolutions
--evidence`, record, show, and `--compare` stay byte-stable for this
Sprint’s purposes.

### Compare

Unchanged. No Resolution / EVIDENCE section.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7
and v0.4 agent boundary, this Sprint, SPRINT-052–055 completion
notes, and inspect:

- `src/mcp/tools.ts` `investigate_resource` handler and description
- `src/app/resolutions.ts` `listResolutions` /
  `formatResolutionMemorySection`
- `tests/app/mcp-protocol.test.ts` four-tool + freeze assertions
  (`resolutionMemory` / `resolutions` keys)
- `docs/public/MCP.md` investigate_resource row
- 047 additive `sharedCommitCorrespondences` tests (parity pattern,
  not the compose semantics)

Report:

1. Field name: `resolutionMemory` vs `resolutions`? Expected:
   **`resolutionMemory`.**
2. Omit when empty vs always-present `[]`? Expected: **omit.** Pin
   one. Never Missing Context.
3. Full 053+054 fields vs summaries-only? Expected: **full**
   (id, investigationId, recordedAt, optional decision / action /
   outcome / evidenceIds).
4. On `InvestigationContext`? Expected: **no.** Handler calls
   `listResolutions`.
5. `content[]` one-liner: count when present? Pin one. No body dump.
6. Tool description clause? Expected: **yes.**
7. `docs/public/MCP.md` row? Expected: **yes**, that row only.
8. CLI / compare / snapshot JSON / `get_related_context`? Expected:
   **no change.**
9. Fifth tool, snapshot MCP, evidence-id list on MCP? Expected:
   **no.**
10. Inferred attach, MCP writes, Resource-anchored write? Expected:
    **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no** (the claim is already on
   the 051 table).
2. Second source of truth? The field is retained organizational
   response, never current compose, never snapshot JSON, never
   Action, never Known Facts.
3. Does showing outcome text on MCP leak “you should”? **No**, if
   labeled not a recommendation — same CLI intro constraint. Do not
   rank, score, or suggest.
4. Does this become snapshot MCP? **No.** Different object. Live
   subject filter only.
5. Fifth tool needed? Expected: **no.**
6. Compare section needed? Expected: **no.**
7. Resource-anchored write needed? Expected: **no.**
8. Evidence table / generic join engine? Expected: **no.**
9. Canon change? Expected: AGENTS.md operational baseline + the
   existing `docs/public/MCP.md` investigate_resource row. Not
   VISION / ARCHITECTURE / ROADMAP / SKILL.

If implementation is tempted to add `list_resolutions`, to put rows
on `InvestigationContext`, to mix them into `knownFacts` or
`providerActivity`, to treat a match as outcome proof, to return
snapshot ids, or to record a Resolution via MCP: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- still exactly four tools; annotations unchanged
- `get_related_context` payload unchanged
- empty subject: no `resolutionMemory` key (or `[]` if Phase 1 pins
  that); compose keys still present; not Missing Context
- record a Resolution for subject A; `investigate_resource(A)`
  returns that row (id, investigationId, recordedAt, field text,
  evidence ids when attached)
- subject B does not receive subject A’s rows
- omitted optional fields are absent, not `"unknown"`
- order: `recordedAt` DESC, `id` DESC
- not present on `knownFacts`, `missingContext`, `providerActivity`,
  `timeline`, `sharedCommitContext`, `sharedCommitCorrespondences`
- DB digest unchanged after the call
- CLI `investigate` / reopen / `--compare` / `resolutions --evidence`
  unchanged when the MCP field is populated
- `--save` snapshot JSON still has no Resolution payload
- unknown resourceId: existing error; no consolation Resolutions
- corrupt / pre-054 evidence JSON: row still returns; no invented
  ids; no Known Facts
- no write tool appears

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
investigate <id> --save
resolution --investigation <inv> --decision "…" --action "…" --outcome "…"
           --evidence <native-id>
investigate <id>                   # RESOLUTION MEMORY unchanged
# MCP investigate_resource on that id: resolutionMemory contains the row
# MCP investigate_resource on a subject with none: field omitted / []
investigation <inv> --compare      # no Resolution / EVIDENCE section
resolutions --evidence <native-id> # unchanged
```

---

# Explicit Non-Goals

Do **not** implement:

- a fifth MCP tool (`list_resolutions`, snapshot list/reopen/compare)
- snapshot or compare fields on `investigate_resource`
- MCP writes / record Resolution via MCP
- Resource-anchored Resolution without an Investigation
- Incident model or linking
- similarity, embeddings, “you should”, “has this happened before?”,
  Learning
- Investigation lifecycle / `resolved: true`
- putting Resolutions on `InvestigationContext` or `snapshot_json`
- Resolution / EVIDENCE section on `--compare`
- retrieve-by-evidence on MCP
- mixing Resolutions into Known Facts or provider activity
- inferred `--evidence` or Action from provider activity
- SHA-only joins, shared-commit correspondence as attribution
- Evidence table, MemoryEngine, RecommendationEngine
- updating existing Resolution rows
- new `MCP_SPEC.md`
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
056       Resolution recall on investigate_resource                ← this
057+      Resource-anchored Resolution only if earned
          Incident grouping only if earned
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

- MCP tools: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource` (still exactly four; still read-only)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- 051 write still requires ≥1 of decision/action/outcome; append-only
- 054 `--evidence` on record unchanged
- 055 `resolutions --evidence` unchanged
- 052–054 CLI RESOLUTION MEMORY unchanged
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None expected. Field is read-time over the 051 table.

Pre-051 DBs with no `resolutions` table already list empty (051
probe). Omit the field (or `[]`). Do not rewrite snapshots.

If implementation is tempted to add `list_resolutions` or to put
Resolutions on `InvestigationContext`: **STOP.** Those are not
required for this Sprint.

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 056 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: `investigate_resource` returns retained Resolutions
      for that exact subject as an additive field; omitted when empty;
      not in Known Facts; not a fifth tool; not snapshot MCP
- [x] if earned: CLI unchanged; compare unchanged; no inferred Action;
      no Incident; no recommendation copy; no MCP writes
- [x] if not earned: rejection documented; do not add a fifth tool
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and the
      existing `docs/public/MCP.md` investigate_resource row

---

# Final Principle

> **Sprint 052–054 showed organizational response when a human
> investigates. Sprint 056 may show that same exact-id record when an
> agent investigates through the tool already in use. Combie must not
> add a fifth tool, must not recommend, and must not freeze response
> memory into the snapshot.**

---

# Completion Notes

## Baseline (2026-08-17)

```text
HEAD:          637ba3c45e9c9ef8a0d24999e4e7b551cd383695
               (055 completion + 056 activation edits were present
               but uncommitted at baseline)
tests:         927 pass across 77 files (3898 expect() calls; Red
               confirmed before implementation — 2 of 2 new tests
               failed for the right reasons)
typecheck:     clean
worktree:      activation edits (AGENTS.md, SPRINT-055.md,
               SPRINT-056.md) + 2 files modified for the Sprint
MCP:           exactly four read-only tools
Sprint 055:    Complete
Sprint 056:    Active (single Active sprint)
```

## Repository Understanding

1. **Field name: `resolutionMemory`.** Matches the CLI section name;
   the existing freeze assertions in `tests/app/mcp-protocol.test.ts`
   already name this key; `resolutions` would collide with the CLI
   list command. Not a formatted essay string.
2. **Known-empty: omit the key** (052 CLI semantics). The existing
   mcp-protocol freeze assertions (`not.toHaveProperty(
   "resolutionMemory")`) already pinned omission, so the pin was
   free; never a Missing Context item, never an error.
3. **Full 053+054 fields**: per row `id`, `investigationId`,
   `recordedAt`, optional `decision` / `action` / `outcome` /
   `evidenceIds`. Absent optionals are omitted — no `"unknown"`.
4. **Not on `InvestigationContext`.** The handler calls
   `listResolutions(baseDir, { subjectResourceId: ctx.subject.id })`
   — the exact call CLI live `investigate` already uses (same filter,
   same `recordedAt` DESC, `id` DESC order, read-time over the 051
   table).
5. **`content[]` one-liner pinned unchanged**: stays the compose
   summary (no count, no body dump). The structured field carries the
   rows.
6. **Tool description clause: yes** — retained organizational
   response may be present; not current provider truth; not a
   recommendation.
7. **`docs/public/MCP.md` investigate_resource row: yes**, that row
   only.
8. **CLI / compare / snapshot JSON / `get_related_context`: no
   change.** `--save` never serializes `resolutionMemory` into
   `snapshot_json` (recall is read-time, same as CLI).
9. **Fifth tool, snapshot MCP, evidence-id list on MCP: no.** The
   four-tool freeze and annotations are untouched.
10. **Inferred attach, MCP writes, Resource-anchored write: no.**
    Nothing records or updates Resolution rows.

Projection location pinned: a small MCP-facing mapping in the tool
handler (`toResolutionMemoryRow` in `src/mcp/tools.ts`), not
`formatResolutionMemorySection`, not `InvestigationContext`.

## Architecture Pressure

1. **Persistence necessary? No.** The claim already lives on the 051
   table (Sequencing Rule 9); this Sprint adds no columns, no table,
   no migration.
2. **Second source of truth? No.** The field is retained
   organizational response, read-time only — never current compose,
   never snapshot JSON, never Action, never Known Facts.
3. **Does outcome text on MCP leak "you should"? No.** The tool
   description labels the field as organizational response, not
   current provider truth, not a recommendation; nothing ranks,
   scores, or suggests.
4. **Snapshot MCP? No.** Different object; live subject filter only.
5. **Fifth tool? No.**
6. **Compare section? No.**
7. **Resource-anchored write? No.**
8. **Evidence table / generic join engine? No.**
9. **Canon change? AGENTS.md operational baseline + the existing
   `docs/public/MCP.md` investigate_resource row. Not VISION /
   ARCHITECTURE / ROADMAP / SKILL.

## Implemented

- `investigate_resource` handler: additive `resolutionMemory`
  structured field — `listResolutions(baseDir, { subjectResourceId:
  ctx.subject.id })` projected by a module-level `toResolutionMemoryRow`
  (plain objects, absent optional fields omitted), conditionally
  spread into `structuredContent` only when rows exist;
  `content[]` one-liner unchanged; tool description gains the
  retained-organizational-response clause (`src/mcp/tools.ts`)
- Tests: 2 stdio e2e tests in a new "MCP stdio contract (Sprint 056)"
  block of `tests/app/mcp-protocol.test.ts` — additive rows (full
  fields + evidence ids, `recordedAt` DESC), omitted optionals, rows
  never mixed into knownFacts / missingContext / providerActivity /
  timeline / sharedCommitContext / sharedCommitCorrespondences,
  `resolutions` key still absent, one-liner unchanged, subject B
  omits the key, unknown `resourceId` keeps the existing
  `Resource not found` error with no consolation payload, DB
  SHA-256 digest unchanged; corrupt evidence JSON and a pre-054
  `DROP COLUMN evidence_ids` DB both still return the row without
  invented ids

## Deviations

- None material. Phase 1 pinned "omit when empty" (not `[]`) and the
  one-liner unchanged (no count); both were explicitly allowed by the
  Sprint.

## Validation

```text
bun test:          929 pass across 77 files (3927 expect() calls;
                   was 927 pass / 3898 at baseline)
bun run typecheck: clean
git diff --check:  clean
MCP tools:         get_related_context, investigate_resource,
                   list_providers, list_resources (annotations
                   unchanged)
Red:               2 of 2 new tests failed before implementation
live (isolated):   investigate <id> --save → resolution
                   --investigation <inv> --decision/--action/--outcome
                   --evidence frontend@1.4.0 → investigate <id>
                   RESOLUTION MEMORY unchanged (body + EVIDENCE) →
                   investigation <inv> reopen unchanged → --compare
                   has no Resolution/EVIDENCE section → resolutions
                   --evidence frontend@1.4.0 and --resource unchanged
                   → MCP investigate_resource on that id returns the
                   row (id, investigationId, recordedAt, decision,
                   action, outcome, evidenceIds) → MCP on a subject
                   with no Resolutions omits the field → four tools
                   still listed → get_related_context unchanged →
                   DB SHA-256 unchanged after tool calls
```

## Learnings

- `safeJson` maps `undefined` to `null`, so true omission needs an
  explicit conditional spread — a property set to `undefined` would
  surface as `resolutionMemory: null`, not as a missing key.
- The 047 "always-present `[]`" pattern belongs to InvestigationContext
  projections; this field is organizational response, so omit-when-
  empty (052 CLI semantics) wins — and the pre-existing freeze
  assertions already made that pin free.
- `listResolutions` already returns full records (the store SELECT
  carries decision / action / outcome / evidence_ids), so the MCP
  projection needed no new store work — only the omit-optionals
  mapping.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, and SKILL unchanged. AGENTS.md
baseline becomes Sprints 001–056 complete (shipped bullet + v0.7
paragraph), and `docs/public/MCP.md` investigate_resource row gains
retained resolution memory. Sprint 057 is not started.
