# SPRINT-052 — Exact-Id Resolution Recall

> **Status:** Active
> **Depends on:** SPRINT-051 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.7 Operational Memory
> (investigation memory / organizational precedent retrieval — smallest
> deterministic version after capture). Sprint 051 leftover list is
> **not** a sequence; evidence-id attribution is unearned.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.7 Operational Memory —
> **exact-id Resolution recall on existing Investigation read paths**,
> not Incident, not similarity, not Recommendation, not MCP, not
> inferred Action, not snapshot rewrite
> **Type:** Narrow read-time projection over already-persisted
> Resolution rows
> **Primary goal:** When a human investigates an exact Resource, or
> reopens a saved Investigation, Combie shows retained Resolutions for
> that exact identity (subject id / investigation id) as a distinct
> organizational-response section — without baking them into the
> snapshot, Known Facts, Missing Context, compare, or MCP.
> **Provider scope:** None. No new provider reads.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 051 started ROADMAP v0.7 with capture + list:

```text
resolution --investigation <id> --decision/--action/--outcome
resolutions --investigation <id>
resolutions --resource <resource-id>
resolution <res-id>
```

Those commands answer “what did we record?” only if the human already
knows to run them. Live `investigate` and `investigation <id>` reopen
still look like no one responded.

Sprint 051 leftover:

```text
052+      optional evidence-id attribution only if earned
          Resource-anchored Resolution only if earned
          Incident grouping only if earned
          live-investigate historical Resolutions only if earned
          MCP read only if earned
          …
```

Those leftovers are **not equivalent**, and they are not a sequence.

Evidence-id attribution (“deployment abc was the fix”) is unearned:
no Scenario 8 run asked to join provider activity into Action, and
051 forbade inferring Action from deployments.

This Sprint takes the smallest unfinished v0.7 capability that 051
already made necessary — the 048→050 lesson applied to Resolution:

```text
051  persist + list by exact investigation / subject
052  show those rows on the Investigation read paths already in use
```

It is **not** similarity, Incident, Recommendation, or MCP.

It is **not** Investigation lifecycle. Showing that a Resolution
exists does not close the Investigation.

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
list by exact id                    ← 051
    ↓
recall at existing read paths       ← this Sprint
    ↓
earned abstraction                  ← not this Sprint
```

Sequencing Rule 9: **no new persistence** for this claim. Filter the
051 table at read time. Do not write Resolutions into
`snapshot_json`. Do not add columns to `investigations`.

---

# Problem

After `resolution --investigation inv:…`, two existing read commands
still omit the response:

```text
combie investigation inv:…     snapshot only (048)
combie investigate <resource>  live compose only
```

`resolutions --resource` exists, but it is a second command. v0.7’s
product questions — what did we decide last time, what did we do, did
it work — are supposed to be answerable when investigating the same
exact subject again, not only after remembering a new verb.

ROADMAP v0.7 names investigation memory and organizational precedent
retrieval. 051 stored the memory. This Sprint makes exact-id recall
visible where Investigation is already read.

---

# Product Question

> After one or more explicit Resolutions exist for a saved
> Investigation and/or exact subject Resource, can Combie show those
> retained records as a distinct organizational-response section on
> `investigation <id>` reopen and on live `investigate <resource-id>`
> — exact-id only, omitted when known-empty, never mixed into Known
> Facts or the snapshot, without MCP tools, similarity, Incident, or
> inferred Action?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.7** already began at 051 with
   capture. The next smallest version of “investigation memory” is
   recall on the paths humans already use.
2. **Sprint 051 leftover** lists evidence-id first, but only *if
   earned*. Capture did not earn joining deployments into Action.
3. **051 Deviation** kept investigation reopen byte-stable. That was
   correct for 051 scope. It left a hole: the Investigation you
   recorded against does not show the record.
4. **050 deferred** embedding prior *Investigation snapshots* into
   live investigate. This Sprint embeds *Resolution summaries* for
   the exact subject, labeled organizational response, not as
   historical compose pointers and not as Known Facts. Different
   object, exact id, distinct section.
5. **Sequencing Rule 9:** persistence is not necessary. Read
   `listResolutions`.
6. **MCP** stays frozen. CLI/MCP parity for snapshots was already
   CLI-only after 048–051. This Sprint does not thaw that.

Rejected as 052 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Evidence-id attribution | Unearned join; risks treating provider activity as Action |
| Resource-anchored Resolution (no Investigation) | Attachment still Investigation; no dogfood demanding otherwise |
| Incident grouping | Unearned; Investigation remains the anchor |
| MCP read of snapshots/resolutions | Frozen four-tool contract; not this slice |
| Investigation lifecycle | Status is still a process claim 051 forbade |
| Similarity / “you should” | v0.8; exact id first |
| Separate Decision/Action/Outcome types | Fields remain enough |

---

# Exact Capability

```text
combie investigation <id>
        ↓
load snapshot (048, unchanged JSON)
listResolutions({ investigationId })   051, unchanged table
        ↓
print 048 reopen body
print additive RESOLUTION MEMORY section if rows exist
  summaries only (id, recordedAt, which fields present)
        ↓
snapshot row unchanged

combie investigate <resource-id>
        ↓
compose InvestigationContext (unchanged)
listResolutions({ subjectResourceId })
        ↓
print live compose
print additive RESOLUTION MEMORY section if rows exist
  summaries only (id, investigationId, recordedAt)
        ↓
--save still persists InvestigationContext only
```

`--compare` remains 049: two `InvestigationContext` values. Resolution
rows are not on that type. Compare must not grow a Resolution section
in this Sprint.

`investigate --save` must **not** serialize Resolutions into
`snapshot_json`. Recall is always read-time against the resolutions
table.

Exact section title/copy is Phase 1. Constraints:

- Distinct from SUBJECT, KNOWN FACTS, MISSING CONTEXT, and the 048
  snapshot banner.
- Labeled retained organizational response, not current provider
  truth, not an incident, not a recommendation.
- Omit the section when zero rows (known-empty is the list command’s
  job; do not add Missing Context for “no resolutions”).
- Summaries, not full decision/action/outcome essays. Full text
  remains `resolution <id>`.
- Order: `recordedAt` DESC, `id` DESC (051).
- Exact identity only. No name search, no SHA join, no similarity.

---

# Evidence / Claim Semantics

### KNOWN (about the section)

```text
Combie has these retained Resolutions for investigation <id>
/ subject <resource-id>, recorded at their recordedAt times.
```

### UNKNOWN / stale (required)

The section is **retained organizational response**, not proof the
response is still correct, and not current provider authority.

Live investigate’s compose remains current local-store compose. The
Resolution section is not a claim that the system “changed” because
a record exists.

A Resolution recorded after a snapshot’s `composedAt` may appear on
that snapshot’s reopen (it hangs on the investigation id, not on
compose time). That is correct: the response is about that
Investigation object. Do not hide it because it is newer than
`composedAt`. Do not rewrite `composedAt`.

### Forbidden

```text
You should rollback
These are similar incidents
Newest deployment is the Action
resolved: true / this investigation is closed
This section is Known Facts
This section is Missing Context
Saving an investigation freezes Resolution memory into the snapshot
```

---

# Architecture

```text
listResolutions()                 051, unchanged
        ↓
formatResolutionMemorySection     new read-time formatter
        ↓
CLI investigate / investigation reopen
```

Ownership:

- **Domain / Store:** no new type, table, or column.
- **App:** formatter over existing `ResolutionRecord` summaries.
  Do **not** add Resolutions to `InvestigationContext`.
- **CLI:** append the section after the existing formatted body.
- **MCP:** no new tool; `investigate_resource` payload unchanged.
- **Compare:** unchanged. Must not read the resolutions table.

Adapters do not participate.

---

# Persistence vs Read-Time

| Snapshot | Resolution recall | Live compose |
| --- | --- | --- |
| Frozen InvestigationContext | Read-time list | Current local compose |
| 048 JSON | 051 table | Not a snapshot |

Recall must **not**:

- insert or update resolution or investigation rows
- rewrite snapshot JSON
- create Relationships or Changes
- refresh providers
- add MCP fields

---

# Boundedness

- Two read paths only: `investigation <id>` (filter investigationId)
  and `investigate <resource-id>` (filter subjectResourceId).
- No `context`, `related`, `history`, or `investigations` list
  changes unless Phase 1 proves a one-line pointer is required for
  selection — expected: **no**.
- `MAX_INVESTIGATION_FACTS = 5` unchanged. Resolutions are not facts.
- No cap that silently drops rows. If Phase 2 finds huge lists, show
  a count + the existing 051 order; do not invent ranking.
- No extra hop. No provider calls. No schema migration.

---

# Failure / Unknown Semantics

- Missing investigation id / resource: same errors as 048 / live
  investigate. Do not print a Resolution section on those failures.
- Resolutions table missing (pre-051 DB, read-only): 051 list is
  empty → omit section.
- Subject Resource missing: live investigate still `RESOURCE_NOT_FOUND`
  (unlike 050 list). Recall does not change that. Reopen of a snapshot
  whose subject is gone still shows that investigation’s Resolutions
  if any (049 survival applied to response memory).
- Corrupt Resolution row: skip or error without inventing text;
  Phase 1 pins one rule. Expected: untrusted row does not appear as
  empty Known Facts.

---

# Affected Surfaces

### CLI

- `investigation <id>` — additive section when that investigation has
  Resolutions.
- `investigate <resource-id>` — additive section when that subject has
  Resolutions.
- `investigate --save` — live output may show the section; persisted
  snapshot must not include it. Reopen without Resolutions in the
  048 body; reopen *may* still show the section via read-time list
  (same investigation id).
- Help: one line that Resolution memory can appear on investigate /
  reopen when records exist.

### MCP

Unchanged four tools. Do not add Resolution fields on
`investigate_resource`.

### Compare

Unchanged. No Resolution section.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.7,
this Sprint, SPRINT-051 completion notes, and inspect:

- `src/app/resolutions.ts` (`listResolutions`, formatters)
- `src/app/investigations.ts` (`formatSavedInvestigation`)
- `src/app/investigate.ts` (`formatInvestigationContext`)
- `src/cli/index.ts` investigate / investigation / --save
- `src/app/compare-investigation.ts` (must not grow a section)
- MCP `investigate_resource` payload tests

Report:

1. Can recall be CLI-appended after existing formatters without
   changing `InvestigationContext`?
2. Exact summary fields per path (reopen vs live).
3. Empty = omit section?
4. Does `--save` live output including the section require stripping
   before serialize? Expected: **section is not on the context, so
   serialize is already clean; live CLI print is separate.**
5. Reopen of a snapshot with later Resolutions: show them? Expected:
   **yes** (hang on investigation id).
6. MCP? Expected: **no**.
7. Compare? Expected: **no**.
8. Evidence-id / Incident / lifecycle? Expected: **no**.

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no**.
2. Second source of truth? Section must be labeled retained response;
   never current compose; never snapshot JSON.
3. Does mixing into Known Facts / Missing Context leak? **No.**
4. Does live investigate become a recommendation? **No.**
5. MCP tool needed? Expected: **no**.
6. Compare section needed? Expected: **no**.
7. Canon change? Expected: AGENTS.md operational baseline only.

If implementation is tempted to add Resolutions to
`InvestigationContext`, `snapshot_json`, or MCP: **STOP**.

---

# Tests

Red → Green → Refactor. No live credentials.

- reopen without Resolutions is 048-identical
- reopen with one/many Resolutions appends a distinct section;
  snapshot JSON / `formatInvestigationContext(snapshot)` unchanged
- live investigate with zero Resolutions is unchanged compose
- live investigate with Resolutions for that subject only (mixed
  subjects excluded)
- `--save` then reopen: snapshot body has no Resolution text from
  save-time print; read-time section may still list rows for that
  `inv:` id
- `--compare` output unchanged when Resolutions exist (049
  regression from 051 still holds)
- `resolutions --resource` / `--investigation` unchanged
- MCP still exactly four tools; `investigate_resource` payload
  unchanged; read-only DB regression
- untrusted / missing investigation or resource: existing errors;
  no invented Resolution section

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
investigate <id> --save
resolution --investigation <inv> --decision "…" --action "…" --outcome "…"
investigation <inv>          # section present
investigate <id>             # section present for that subject
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
  (050 leftover; still unearned)
- ContextPack / fact-budget redesign
- MemoryEngine / RecommendationEngine
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
051       explicit Resolution capture + list                       ✅
052       exact-id Resolution recall on investigate / reopen       ← this
053+      evidence-id attribution only if earned
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
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP

---

# Migration / Upgrade

None. Pre-051 DBs with no `resolutions` table already list empty
(051 probe). Omit section.

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [ ] Sprint 052 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: exact-id Resolution section on reopen and live
      investigate; omitted when empty; not in snapshot JSON
- [ ] if earned: no MCP change; compare unchanged; no evidence-id;
      no Incident; no recommendation copy
- [ ] if not earned: rejection documented; do not mix into Known Facts
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged except AGENTS.md operational baseline

---

# Final Principle

> **Sprint 051 remembered what people recorded. Sprint 052 may show
> that record when they investigate the same exact Investigation or
> Resource again. It must not recommend, infer, or freeze response
> memory into the snapshot.**
