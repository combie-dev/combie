# SPRINT-053 — Resolution Body Recall

> **Status:** Active
> **Depends on:** SPRINT-052 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.7 Operational Memory
> (organizational precedent retrieval — smallest deterministic version
> after exact-id recall). Sprint 052 leftover list is **not** a
> sequence; evidence-id attribution is unearned.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **show retained decision / action / outcome text on existing
> Resolution recall paths**, not Incident, not similarity, not
> Recommendation, not MCP, not inferred Action, not snapshot rewrite,
> not evidence-id joins
> **Type:** Narrow formatter change over already-read Resolution rows
> **Primary goal:** When RESOLUTION MEMORY appears on live `investigate`
> or `investigation <id>` reopen, Combie shows the retained decision,
> action, and outcome text for those exact-id rows — so “what did we
> decide / do / observe last time?” is answered on the path already in
> use, without baking that text into the snapshot, Known Facts, Missing
> Context, compare, or MCP.
> **Provider scope:** None. No new provider reads.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 051 captured organizational response. Sprint 052 made those
rows visible on Investigation read paths as summaries:

```text
RESOLUTION MEMORY
id / recordedAt / which fields present
Show: combie resolution <id>
```

That answers “is there a retained response?” It does not answer the
ROADMAP v0.7 questions that justified capture:

```text
What did we decide last time?
What action did we take?
Did it work?
```

Those answers still live only on `resolution <id>`. 052 recall left
the same hole 051 list had: a second command you must remember.

Sprint 052 leftover:

```text
053+      optional evidence-id attribution only if earned
          Resource-anchored Resolution only if earned
          Incident grouping only if earned
          MCP read of snapshots / resolutions only if earned
          Investigation snapshot pointers on live investigate
            only if earned
          Investigation lifecycle only if earned
          similarity / recommendation / learning (v0.8)
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.

Evidence-id attribution (“deployment abc was the fix”) is the fourth
ROADMAP question — *what evidence supported that* — and is still
unearned. Joining provider activity into Action remains forbidden.

This Sprint takes the smallest unfinished v0.7 capability that 052
already made necessary: the recorded text on the recall section 052
opened.

```text
051  persist + list by exact investigation / subject
052  show those rows on Investigation read paths (summaries)
053  show the decision / action / outcome text on those same paths
```

It is **not** similarity, Incident, Recommendation, or MCP.

It is **not** Investigation lifecycle. Showing outcome text does not
close the Investigation and does not mean the response is still
correct.

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
recall at existing read paths       ← 052
    ↓
show the retained answers           ← this Sprint
    ↓
earned abstraction                  ← not this Sprint
```

Sequencing Rule 9: **no new persistence.** The 051 table already
holds the text. 052 already SELECTs those columns for field presence.
This Sprint formats them. Do not write Resolutions into
`snapshot_json`. Do not add columns.

---

# Problem

After 052, live `investigate` and `investigation <id>` reopen can
look like this:

```text
RESOLUTION MEMORY
res:…  2026-08-16T14:00:00.000Z  decision, action, outcome
Show: combie resolution res:…
```

The human still cannot see what was decided, done, or observed
without a third command. ROADMAP v0.7 organizational precedent
retrieval, at this grain, is the retained answers — not a pointer
that answers exist.

---

# Product Question

> After exact-id Resolution recall exists as summaries, can Combie
> show the retained decision / action / outcome text in that same
> distinct RESOLUTION MEMORY section on `investigation <id>` reopen
> and live `investigate <resource-id>` — exact-id only, omitted when
> known-empty, never mixed into Known Facts or the snapshot, without
> MCP tools, similarity, Incident, evidence-id joins, or inferred
> Action?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** already names the questions
   051 stored and 052 pointed at. The smallest version of
   “organizational precedent retrieval” after exact-id recall is the
   precedent text itself.
2. **Sprint 052 leftover** lists evidence-id first, but only *if
   earned*. Showing field presence did not earn joining deployments
   into Action.
3. **052 Deviation** kept live summaries without essays so compose
   stayed readable and snapshot JSON stayed clean. That was correct
   for 052 scope. It left the ROADMAP questions unanswered on the
   path 052 opened.
4. **Sequencing Rule 9:** persistence is not necessary. Format
   columns 052 already reads.
5. **MCP** stays frozen. CLI/MCP parity for snapshots and
   resolutions remains CLI-only.

Rejected as 053 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Evidence-id attribution | Unearned join; fourth ROADMAP question; still risks treating provider activity as Action |
| Resource-anchored Resolution (no Investigation) | Attachment still Investigation |
| Incident grouping | Unearned; Investigation remains the anchor |
| MCP read of snapshots/resolutions | Frozen four-tool contract |
| Investigation lifecycle | Status is still a process claim |
| Similarity / “you should” | v0.8; exact id + explicit text first |
| Resolution section on `--compare` | Resolutions are not on `InvestigationContext`; clocks would mix |
| Live-investigate pointers to prior Investigation snapshots | 050 leftover; still unearned; different object |

---

# Exact Capability

```text
combie investigation <id>
        ↓
048 snapshot body (unchanged JSON)
052 listResolutions({ investigationId })
        ↓
RESOLUTION MEMORY section with retained field text
  per row: id, recordedAt, then DECISION / ACTION / OUTCOME
  when that field is present
        ↓
snapshot row unchanged

combie investigate <resource-id>
        ↓
live compose (unchanged InvestigationContext)
052 listResolutions({ subjectResourceId })
        ↓
RESOLUTION MEMORY section with retained field text
  per row: id, investigationId, recordedAt, then field text
        ↓
--save still persists InvestigationContext only
```

`--compare` remains 049. No Resolution section.

`investigate --save` must **not** serialize Resolution bodies into
`snapshot_json`. Recall stays read-time.

Exact layout is Phase 1. Constraints:

- Stay inside the existing RESOLUTION MEMORY section. Do not create
  a second banner. Do not reuse the single-record `RESOLUTION`
  show banner on investigate/reopen (collision with 051 show).
- Distinct from SUBJECT, KNOWN FACTS, MISSING CONTEXT, and the 048
  snapshot banner.
- Labeled retained organizational response, not current provider
  truth, not an incident, not a recommendation.
- Omit the section when zero rows (unchanged).
- Print only fields that were recorded. Do not invent `"unknown"`.
  Do not infer Action from deployments.
- Order: `recordedAt` DESC, `id` DESC (051/052).
- Exact identity only. No name search, no SHA join, no similarity.
- `resolution <id>` remains the dedicated show command. A `Show:`
  line may stay; it is not a substitute for printing the text.
- No silent drop. Do not invent ranking. If Phase 2 finds huge
  lists, keep 051 order and a count; do not hide older bodies.

---

# Evidence / Claim Semantics

### KNOWN (about the section)

```text
Combie has these retained Resolutions for investigation <id>
/ subject <resource-id>, recorded at their recordedAt times,
with this decision / action / outcome text as explicitly recorded.
```

### UNKNOWN / stale (required)

The text is **retained organizational response**, not proof the
response is still correct, and not current provider authority.

An outcome of “errors returned to baseline” is what the human
wrote. It is not a claim that errors are still at baseline.

A Resolution recorded after a snapshot’s `composedAt` may still
appear on that snapshot’s reopen (hangs on investigation id).
Do not hide it. Do not rewrite `composedAt`.

### Forbidden

```text
You should rollback
These are similar incidents
Newest deployment is the Action
resolved: true / this investigation is closed
This section is Known Facts
This section is Missing Context
Saving an investigation freezes Resolution bodies into the snapshot
```

---

# Architecture

```text
listResolutions()                      051/052, unchanged table
        ↓
formatResolutionMemorySection          052 formatter, now includes bodies
        ↓
CLI investigate / investigation reopen 052 wiring, unchanged call sites
```

Ownership:

- **Domain / Store:** no new type, table, or column. 052 already
  lists decision/action/outcome for presence; keep reading them.
- **App:** formatter only. Do **not** add Resolutions to
  `InvestigationContext`.
- **CLI:** existing `formatWithResolutionMemory` call sites.
  Expected: no new commands.
- **MCP:** no new tool; `investigate_resource` payload unchanged.
- **Compare:** unchanged. Must not read the resolutions table.

Adapters do not participate.

---

# Persistence vs Read-Time

| Snapshot | Resolution body recall | Live compose |
| --- | --- | --- |
| Frozen InvestigationContext | Read-time format of 051 text | Current local compose |
| 048 JSON | 051 table | Not a snapshot |

Recall must **not**:

- insert or update resolution or investigation rows
- rewrite snapshot JSON
- create Relationships or Changes
- refresh providers
- add MCP fields

---

# Boundedness

- Same two read paths as 052. No `context`, `related`, `history`,
  or `investigations` list changes.
- `MAX_INVESTIGATION_FACTS = 5` unchanged. Resolution bodies are
  not facts.
- No extra hop. No provider calls. No schema migration.
- `formatResolution` (051 show) and `formatResolutionList` (051
  list) stay essay-on-show / summary-on-list. This Sprint changes
  the 052 memory section only.

---

# Failure / Unknown Semantics

Unchanged from 052:

- Missing investigation / resource: existing errors; no section.
- Missing `resolutions` table: empty list → omit section.
- Deleted subject: live investigate still `RESOURCE_NOT_FOUND`;
  reopen still shows that investigation’s Resolution bodies.
- Corrupt row: skip or error without inventing text; do not appear
  as empty Known Facts. Phase 1 pins one rule. Expected: same as
  052 mapping (omit empty fields).

---

# Affected Surfaces

### CLI

- `investigation <id>` — RESOLUTION MEMORY includes field text.
- `investigate <resource-id>` — same, subject-scoped.
- `investigate --save` — live print may include bodies; persisted
  snapshot must not.
- Help: one line that the section includes the recorded text when
  records exist.

### MCP

Unchanged four tools. Do not add Resolution fields on
`investigate_resource`.

### Compare

Unchanged. No Resolution section. Bodies must not leak into
compare output.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-052 completion notes, and inspect:

- `src/app/resolutions.ts` (`formatResolutionMemorySection`,
  `formatWithResolutionMemory`, `formatResolution`)
- `src/cli/index.ts` investigate / investigation / --save (052
  call sites)
- 052 tests that assert essays are **absent** from the memory
  section (`not.toContain("Rollback 1.4.2")` and similar)
- `src/app/compare-investigation.ts` and MCP payload tests

Report:

1. Can bodies land only in `formatResolutionMemorySection` without
   changing CLI call sites or `InvestigationContext`? Expected:
   **yes**.
2. Exact per-row layout for reopen vs live (investigationId on
   live only).
3. Reuse `formatResolution` blocks, or a compact memory-row
   formatter that does not print a nested `RESOLUTION` banner?
   Expected: **compact memory-row; do not nest the 051 show
   banner.**
4. Empty = omit section? Expected: **unchanged.**
5. `--save` serialize still clean? Expected: **yes.**
6. 052 summary-only tests must flip for the memory section, but
   snapshot JSON / `formatInvestigationContext` / `--compare` must
   still omit essays. Confirm.
7. MCP? Expected: **no.**
8. Compare? Expected: **no.**
9. Evidence-id / Incident / lifecycle? Expected: **no.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? Bodies stay labeled retained response;
   never current compose; never snapshot JSON.
3. Does printing outcome text leak into Known Facts / “errors
   stopped therefore success”? **No.** Keep the 052 stale label.
4. Does live investigate become a recommendation? **No.**
5. MCP tool needed? Expected: **no.**
6. Compare section needed? Expected: **no.**
7. Canon change? Expected: AGENTS.md operational baseline only.

If implementation is tempted to add Resolutions to
`InvestigationContext`, `snapshot_json`, MCP, or to join
deployment / workflow / release / issue ids: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- reopen / live with zero Resolutions remains 052-identical
  (section omitted)
- reopen with one/many Resolutions prints decision/action/outcome
  text in RESOLUTION MEMORY; snapshot JSON /
  `formatInvestigationContext(snapshot)` / `formatSavedInvestigation`
  still omit that text
- live investigate prints bodies for that subject only (mixed
  subjects excluded); compose formatter without the memory wrapper
  still omits bodies
- omitted fields stay omitted (decision-only row has no ACTION
  block)
- `--save` then reopen: snapshot body has no Resolution text from
  save-time print; read-time section may list bodies for that
  `inv:` id
- `--compare` output unchanged when Resolution bodies exist
- `resolution <id>` / `resolutions` list unchanged (list still
  summaries; show still the dedicated essay)
- MCP still exactly four tools; `investigate_resource` payload
  unchanged
- untrusted / missing investigation or resource: existing errors;
  no invented Resolution section

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
investigate <id> --save
resolution --investigation <inv> --decision "…" --action "…" --outcome "…"
investigation <inv>          # bodies present in RESOLUTION MEMORY
investigate <id>             # bodies present for that subject
investigation <inv> --compare  # no Resolution section
```

---

# Explicit Non-Goals

Do **not** implement:

- evidence-id attribution to deployments / workflows / releases /
  issues / SHAs
- Resource-anchored Resolution without an Investigation
- Incident model or linking
- similarity, embeddings, “you should”, Learning
- Investigation lifecycle / `resolved: true`
- putting Resolutions on `InvestigationContext` or `snapshot_json`
- Resolution section on `--compare`
- new MCP tools or `investigate_resource` fields
- live-investigate pointers to prior *Investigation snapshots*
- ContextPack / fact-budget redesign
- MemoryEngine / RecommendationEngine
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
051       explicit Resolution capture + list                       ✅
052       exact-id Resolution recall on investigate / reopen       ✅
053       Resolution body recall on those same paths               ← this
054+      evidence-id attribution only if earned
          Resource-anchored Resolution only if earned
          Incident grouping only if earned
          MCP read of snapshots / resolutions only if earned
          Investigation snapshot pointers on live investigate
            only if earned
          Investigation lifecycle only if earned
          similarity / recommendation / learning (v0.8)
          policy / execution (v0.9)
```

---

# Product / Contract Freezes

- MCP: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource`
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged (no Resolution section)
- 051 resolution table and write CLI unchanged
- 052 call sites unchanged (formatter payload grows; wiring stays)
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None.

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [ ] Sprint 053 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: RESOLUTION MEMORY on reopen and live investigate
      shows retained decision / action / outcome text; omitted when
      empty; not in snapshot JSON
- [ ] if earned: no MCP change; compare unchanged; no evidence-id;
      no Incident; no recommendation copy
- [ ] if not earned: rejection documented; do not mix into Known Facts
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged except AGENTS.md operational baseline

---

# Final Principle

> **Sprint 052 showed that a response was recorded. Sprint 053 may
> show what that response was. It must not recommend, infer evidence,
> or freeze the answers into the snapshot.**
