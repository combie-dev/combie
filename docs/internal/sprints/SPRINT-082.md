# SPRINT-082 — Thin Named-Id MCP Snapshot Dumps

> **Status:** Complete
> **Depends on:** SPRINT-081 (complete)
> **Authorized by:** `docs/internal/ARCHITECTURE.md` Artifact-Backed
> Investigation and `docs/internal/ROADMAP.md` Next Work Sequence
> (post-Sprint 081) item 3 remaining. Sprint 081 shipped the
> read-time artifact handle. Sprint 078 leftovers stay **frozen**.
> Sprint 079 / 080 leftovers are not a sequence. Sprint 081 leftover
> is not a sequence. This Sprint takes **omitting the nested 048
> composition from MCP `investigationSnapshot` on named-id observe
> only**. Does **not** authorize a file store, ContextPack, a fifth
> tool, `skills/combie/SKILL.md`, `--json` on `investigation`,
> thinning CLI reopen, MCP writes, inferred Action, or more Incident
> mutations.
> **Roadmap:** remaining artifact-backed investigation — stop
> stuffing `snapshot_json` into the agent context window
> **Type:** Narrow MCP observe change over the existing named-id path
> **Primary goal:** Named-id `investigate_resource` returns the 081
> handle plus snapshot identity (and a bounded subject preview),
> not the full retained composition. Complete evidence stays on
> `combie investigation <id>`.
> **Provider scope:** None. No new provider reads.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. Named-id `investigationSnapshot`
> drops `.snapshot`. `investigationArtifact` unchanged.
> Live compose keys unchanged. `resolutionMemory` /
> `incidentMemory` unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# Baseline

- Baseline SHA: `13de906` (`feat(app): surface the investigation
  snapshot artifact handle`, SPRINT-081 shipped)
- Test count at baseline: **1177 pass / 0 fail across 80 files**
  (6121 `expect()` calls), `bun run typecheck` clean
- Working tree at baseline: `ARCHITECTURE.md`, `ROADMAP.md`,
  `SPRINT-081.md` modified; `SPRINT-082.md` untracked (authoring
  pass, not committed)

---

# This Is Not a Layer Transition

Sprint 081 named the local artifact. Named-id MCP still dumps it:

```text
investigate_resource { investigationId }
  investigationArtifact     ← handle, hash, counts, retrieve
  investigationSnapshot     ← { id, subjectResourceId, composedAt,
                                snapshot: InvestigationContext }
```

The nested `snapshot` is the 048 `InvestigationContext` (subject,
changes, related, evidence authorities). Live compose is already
the current body. The agent that asked for one `inv:` id still
receives two full compositions.

The missing claim:

```text
Named-id MCP observe cites the artifact. It does not paste the
retained composition into the context window. Retrieve the
complete snapshot with combie investigation <id>.
```

That is thinning. It is **not** deleting `snapshot_json`. It is
**not** changing CLI reopen. It is **not** `skills/combie`. It is
**not** a fifth tool.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Next Work Sequence (post-Sprint 081):

```text
source authority and freshness          ← shipped Sprint 079
    ↓
shell-native CLI contract               ← shipped Sprint 080
    ↓
artifact-backed investigation
    handle                              ← shipped Sprint 081
    thin MCP named-id dumps             ← this Sprint
    ↓
composition-oriented agent skill        ← not this Sprint
    ↓
operational-memory only if earned       ← 078 leftovers stay frozen
```

Sequencing Rule 2: reuse `investigationArtifact.retrieve` and
CLI `investigation <id>`. Do not add a retrieve tool.

Sequencing Rule 8: the thinned field is not a second snapshot.
`snapshot_json` stays the retained composition.

Sequencing Rule 9: no persistence. No new column.

Sequencing Rule 4: the new claim is “MCP named-id does not include
the 048 body,” not “agents can no longer reopen snapshots.”

---

# Problem

After 081, named-id observe still includes
`investigationSnapshot.snapshot`. That object is the full
retained compose. Combined with live `subject` / `related` /
evidence, the tool response doubles composition for every named
id. The handle already says how to retrieve the complete
artifact. The dump makes the handle ornamental.

CLI `investigation <id>` already reprints the full compose. That
path is the retrieve instruction. Leave it.

---

# Product Question

> After named-id MCP observe already returns
> `investigationArtifact`, can Combie omit the nested 048
> `InvestigationContext` from `investigationSnapshot` — keeping
> identity and a bounded subject preview, keeping CLI reopen as
> the full retrieve, without a fifth tool, without
> `skills/combie`, and without continuing Sprint 078 leftovers?

---

# Why This Is the Next Roadmap Slice

1. **ARCHITECTURE Artifact-Backed Investigation** lists compact
   summary, bounded preview, location, hash, counts, and follow-up
   retrieve. 081 shipped location / hash / counts / retrieve.
   The remaining hole is the dump.
2. **Sprint 081 leftover is not a sequence.** The handle exists.
   Thinning is the leftover of item 3, not a new framework.
3. **Sprint 080 leftover is not a sequence.** `--json` on
   `investigation` stays unearned (CLI reopen remains human).
4. **Existing primitive check:** `investigationArtifact` plus
   `SavedInvestigation` identity keys. Drop `.snapshot` at the
   MCP projection boundary only.
5. **Sequencing Rule 2 / 9:** no new store. CLI retrieve stays
   `formatSavedInvestigation`.
6. **Later sequence stays later:** `skills/combie/SKILL.md`
   teaches this loop after the dump is gone.

Rejected as 082 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Omit `investigationSnapshot` entirely | Identity keys still earn the 072 named-id observe |
| Thin CLI `investigation <id>` | That is the retrieve path |
| `--json` on `investigation` | 080 leftover; CLI retrieve stays human |
| Fifth tool `get_investigation` | Frozen four-tool |
| File artifact / persist preview | Parallel store |
| `skills/combie/SKILL.md` | Sequence item 4 |
| Group snapshots as Incident members | 078 leftover[0] |
| Generic Artifact type | Unearned |

---

# Exact Capability

```text
MCP investigate_resource { investigationId }
        ↓
investigationArtifact          unchanged (081)
investigationSnapshot
  id
  subjectResourceId
  composedAt
  subjectPreview               { id, provider, kind, name }
                               from retained snapshot.subject
  (no .snapshot)
        ↓
live compose keys              unchanged when the Resource exists
075 orphan path                live keys omitted as today;
                               identity + preview + artifact remain

CLI investigation <id>         unchanged full human compose
                               (ARTIFACT block already present)
```

Pinned before implementation (Phase 1 may only tighten preview
fields, not the omit):

```text
Drop investigationSnapshot.snapshot (the InvestigationContext).
Keep investigationSnapshot.id / subjectResourceId / composedAt.
Add subjectPreview from retained snapshot.subject identity
  (id, provider, kind, name) — bounded preview, not evidence.
Omit subjectPreview fields that are null/absent the way other
  MCP identity projections do (name is always present on Resource).
investigationArtifact unchanged.
Omitted investigationId still omits both snapshot and artifact.
```

Do not rewrite `snapshot_json`. Do not change CLI reopen. Do not
add `--json` to `investigation`.

`docs/public/MCP.md` currently says named-id returns the retained
048 composition as `investigationSnapshot`. Implementation **must**
update that sentence so it does not lie (handle + identity +
preview; complete snapshot via CLI retrieve).

---

# Evidence / Claim Semantics

### KNOWN

```text
This inv: id is a retained composition stored locally.
MCP named-id cites it. The 048 body is not in this response.
Retrieve: combie investigation <id>.
```

### UNKNOWN / stale (required)

Thinned `investigationSnapshot` is not live compose. Live keys
remain current observation. Compare stays 049. Do not put live
clocks on the thinned snapshot.

### Forbidden

```text
The snapshot body is still in investigationSnapshot.snapshot
You cannot reopen this snapshot
Delete the Resource; the preview is smaller
```

---

# Architecture

```text
investigations.snapshot_json           unchanged
        ↓
getSavedInvestigation                  still parses for CLI / compare
MCP named-id projection                omits .snapshot;
                                       emits identity + subjectPreview
investigationArtifact                  unchanged
CLI investigation <id>                 full formatSavedInvestigation
```

Ownership:

- **MCP:** named-id `investigationSnapshot` projection in
  `src/mcp/tools.ts` (or a tiny helper next to 081). Happy path
  and 075 orphan path. Tool description must stop claiming the
  full 048 body is returned.
- **CLI:** no reopen change. Help only if the investigation line
  would otherwise lie (expected: no).
- **App:** `SavedInvestigation` / `getSavedInvestigation` stay
  for CLI and compare. Do not strip `.snapshot` from the domain
  record — only the MCP wire projection.
- **Store:** unchanged.

Adapters do not participate.

If implementation is tempted to add a fifth tool, to thin CLI
reopen, to add `--json` on `investigation`, to write a file, or
to thaw 078 leftovers: **STOP.**

---

# Persistence vs Read-Time

| `snapshot_json` | CLI reopen | MCP named-id |
| --- | --- | --- |
| Unchanged 048 TEXT | Full human compose | Identity + preview + artifact; no `.snapshot` |

Must **not**:

- persist a preview column
- rewrite `snapshot_json`
- omit `investigationArtifact`
- omit `investigationSnapshot` identity
- dump `.snapshot` under a renamed key
- add MCP tools or writes
- put secrets in the preview

---

# Boundedness

- MCP named-id path only (happy + 075 orphan).
- Preview is subject identity, not related / changes / evidence.
- Four MCP tools. No writes.
- No Relationship, Incident, Resolution, or snapshot schema
  change.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- Unknown `inv:` still `INVESTIGATION_NOT_FOUND`.
- Untrusted `snapshot_json` still
  `INVESTIGATION_SNAPSHOT_UNTRUSTED`.
- Omitted `investigationId`: no `investigationSnapshot`, no
  `investigationArtifact` (unchanged).
- 075 orphan: live keys omitted; identity + preview + artifact +
  compare `subject_missing` remain.

---

# Affected Surfaces

### CLI

Unchanged reopen. Help unchanged unless Phase 1 finds a lie.

### MCP

Four tools. Named-id `investigationSnapshot` thinned.
`investigationArtifact` unchanged. `docs/public/MCP.md` named-id
sentence must match.

### Compare

Unchanged. `--compare` / `investigationCompare` still use the
parsed 048 body internally. Do not put `.snapshot` on compare.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ARCHITECTURE.md`
Artifact-Backed Investigation, `docs/internal/ROADMAP.md` Next
Work Sequence, this Sprint, SPRINT-081 completion notes, and
inspect:

- MCP named-id assembly of `investigationSnapshot`
- `SavedInvestigation` shape (`id`, `subjectResourceId`,
  `composedAt`, `snapshot`)
- 081 `investigationArtifact`
- tests asserting `investigationSnapshot.snapshot` exists
- `docs/public/MCP.md` named-id sentence

Report:

1. Nested `.snapshot` is the 048 InvestigationContext? Expected:
   **yes.** That is what to omit.
2. Identity keys exist without the body? Expected: **yes.**
3. CLI reopen is the retrieve path? Expected: **yes.** Leave it.
4. Fifth tool / `--json` on `investigation`? Expected: **no.**
   Stay frozen.
5. `skills/combie` / file store / 078 leftovers? Expected:
   **no.** Stay frozen.
6. Preview fields pinned (subject id / provider / kind / name)?
7. 075 orphan still has the 048 row so preview can be built?
   Expected: **yes.**
8. Which tests assert `.snapshot` today (must be updated, not
   silently kept)?

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? **No** if the body remains only in
   `snapshot_json` and CLI reopen.
3. Inferred deletion / existence? **No.**
4. Evidence-refresh leak? **No.**
5. `--json` on `investigation` / file / skill leak? **No.**
6. 078 leftover leak? **No.**
7. MCP tool / write needed? Expected: **no.**
8. Thin CLI reopen? Expected: **no.**
9. Canon change during implementation? Expected: AGENTS.md
   operational baseline + `docs/public/MCP.md` named-id sentence.
   ARCHITECTURE / ROADMAP already updated in the planning pass
   that opened this Sprint. CLI help expected unchanged.

If implementation is tempted to add a fifth tool, thin CLI
reopen, or continue 078 leftovers: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- named-id MCP: `investigationSnapshot` has id / subjectResourceId
  / composedAt / subjectPreview; **no** `.snapshot`
- `JSON.stringify(investigationSnapshot)` does not contain related
  evidence bodies / `subjectChanges` arrays from the 048 compose
- `investigationArtifact` still present and unchanged vs 081
- omitted `investigationId`: still omits snapshot and artifact
- 075 orphan: identity + preview + artifact; live keys omitted;
  no `.snapshot`
- four tools; no writes; database bytes unchanged; `snapshot_json`
  bytes unchanged
- CLI `investigation <id>` still prints ARTIFACT + full compose
- `--json` still absent from `investigation`
- `incident --investigation` still usage (078 leftover[0])
- `--compare` / snapshot JSON unchanged
- `docs/public/MCP.md` no longer claims the full 048 body is in
  `investigationSnapshot`

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
combie investigate <id> --save
# MCP named-id: investigationArtifact present;
# investigationSnapshot has no .snapshot
combie investigation <inv:…>     # still full compose
```

Confirm founder `.combie/combie.db` mtime/size unchanged if it
exists. Isolated `--dir` only.

---

# Explicit Non-Goals

Do **not** implement:

- thinning CLI `investigation <id>`
- omitting `investigationSnapshot` identity
- `--json` on `investigation` / `investigations`
- `--limit`, `--since`, `--output`, `--offline`, `--refresh`
- filesystem artifact directory
- persisted preview / hash columns
- `skills/combie/SKILL.md` or unshipped behavior in
  `skills/build-combie/SKILL.md`
- grouping Investigation snapshots as Incident members
- a fifth MCP tool
- Investigation or Incident lifecycle
- `--occurred-at` on create
- generic Artifact / ContextPack types
- deleting Resources
- inferred Action, Recommendation, Learning, similarity
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
082       Thin named-id MCP investigationSnapshot dumps              ← this Sprint
083+      composition-oriented skills/combie/SKILL.md
          --json on additional CLI reads only if earned
          Relationship verification clocks only if earned
          populated evidence membership id sets only if earned
          078 leftovers only if separately earned
          inferred activity→Action (never, unless reversed)
          similarity / recommendation / learning (v0.8)
          policy / execution (v0.9)
```

---

# Product / Contract Freezes

- MCP tools: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource` (exactly four; still read-only; no writes)
- Relationship kinds unchanged
- 048 snapshot schema unchanged
- 049 compare semantics unchanged
- grouping `inv:` as Incident members frozen
- fifth tool / `get_investigation` / `list_investigations` frozen
- Investigation lifecycle frozen
- CLI `investigation <id>` full reopen frozen (retrieve path)
- `--json` on non-080 commands frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / SKILL unchanged unless Phase 2 finds a material conflict
  — report it
- ARCHITECTURE / ROADMAP already record this sequence from the
  planning pass; do not reopen them unless implementation proves a
  lie

---

# Migration / Upgrade

No schema change. MCP clients that read
`investigationSnapshot.snapshot` must follow the handle's
`retrieve` line instead. Identity keys stay. 081
`investigationArtifact` stays.

If implementation is tempted to add a fifth tool, to thin CLI
reopen, or to write a file: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 082 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: named-id MCP omits `.snapshot`; identity +
      preview + artifact remain; CLI reopen full; no fifth tool
- [x] if earned: no `--json` on `investigation`; no
      `skills/combie`; no 078 leftover thaw
- [x] if not earned: rejection documented; do not keep the dump
      (not applicable — the slice was earned)
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md, `docs/public/MCP.md`
      named-id sentence, and CLI help unless Phase 2 found a lie

---

# Final Principle

> **The handle already says where the snapshot lives. Named-id MCP
> must stop pasting it. Retrieve stays the CLI.**

---

# Repository Understanding (Phase 1)

1. Nested `.snapshot` is the 048 InvestigationContext? **Yes** —
   `SavedInvestigation.snapshot` (`src/app/investigations.ts:13-15`),
   assembled into the MCP wire at `src/mcp/tools.ts` (loaded at 198,
   spread happy 254-256 / orphan 307-309 pre-change).
2. Identity keys exist without the body? **Yes** — `InvestigationRecord`
   (`src/domain/investigation.ts:7-12`); the projection can keep
   `id` / `subjectResourceId` / `composedAt` without `.snapshot`.
3. CLI reopen is the retrieve path? **Yes** —
   `src/cli/index.ts:605-623` `formatSavedInvestigation` full compose;
   compare consumes the parsed body internally
   (`src/app/compare-investigation.ts:930-944, 964`). Separate from MCP.
4. Fifth tool / `--json` on `investigation`? **No** — four tools
   enforced by tests; `investigation` not in `JSON_COMMANDS`.
5. `skills/combie` / file store / 078 leftovers? **No** — none exist
   or are touched.
6. Preview fields pinned: `Resource` (`src/domain/resource.ts:9-18`)
   has required `id` / `provider` / `kind` / `name`; identity
   projections emit them unconditionally
   (`src/mcp/projections.ts:88-94` style).
7. 075 orphan still has the 048 row for the preview? **Yes** —
   `getSavedInvestigation` runs before the live-compose try, so
   `snapshot.subject` is always in memory on the orphan path.
8. Tests asserting `.snapshot` on the wire (must change, not silently
   kept): `tests/app/mcp-protocol.test.ts` 2683-2686 (072), 2978-2983
   (073 key set), 3303-3308 (074 key set), 4808 + test name 4737
   (081). Domain-level `.snapshot` usages in investigations /
   compare-investigation / resolutions / incidents tests stay.
9. `docs/public/MCP.md` line 65: two fragments claiming the retained
   048 composition is returned as `investigationSnapshot` (named-id
   and orphan tail) — both must change.
10. Tool description (`src/mcp/tools.ts:113-117`) and
    `investigationId` describe (156) claim the 048 body — both
    rewritten, keeping the description-regex phrases required by
    tests (072/073/075/076/081 sets).

# Architecture Pressure (Phase 2)

1. Persistence necessary? **No** — preview derived read-time from
   `snapshot_json`'s subject; no new column.
2. Second source of truth? **No** — body remains only in
   `snapshot_json` and CLI reopen; MCP stops carrying the second copy.
3. Inferred deletion / existence? **No.**
4. Evidence-refresh leak? **No** — thinned snapshot stays
   retained-at-`composedAt`; no clocks added.
5. `--json` on `investigation` / file / skill leak? **No.**
6. 078 leftover leak? **No** — `incident --investigation` untouched.
7. MCP tool / write needed? **No** — projection edit inside
   `investigate_resource` on both spread paths only.
8. Thin CLI reopen? **No** — retrieve path unchanged.
9. Canon change? AGENTS.md operational baseline +
   `docs/public/MCP.md` named-id sentence. CLI help
   (`src/cli/index.ts:115`) holds no lie; unchanged.
   ARCHITECTURE / ROADMAP already updated in the planning pass.
10. Verdict: omitting `.snapshot` at the MCP projection boundary only
    is the cleanest cut; orphan path and compare carry no risk (row
    loaded before live compose; compare uses the parsed body
    internally). No STOP condition violated.

# Implemented

- `src/mcp/projections.ts`: `projectInvestigationSnapshot(record)` —
  `{ id, subjectResourceId, composedAt, subjectPreview: { id,
  provider, kind, name } }` from `record.snapshot.subject`; style
  matches the sibling identity projections.
- `src/mcp/tools.ts`: full record renamed `investigationSnapshotRecord`
  (sidecar lookups / orphan text unchanged); thinned projection
  emitted as `investigationSnapshot` on both happy and 075 orphan
  paths; tool description + `investigationId` describe rewritten to
  claim identity + preview (not the 048 body), keeping every
  description-regex phrase the tests require.
- `SavedInvestigation` / `getSavedInvestigation` /
  `snapshot_json` untouched — the domain record keeps `.snapshot`
  for CLI reopen and compare.
- `docs/public/MCP.md` line 65: named-id and orphan fragments now
  say snapshot identity + bounded subjectPreview; complete snapshot
  via `combie investigation <id>`.
- Tests: 4 changed (072 asserts no `.snapshot` + exact key set +
  serialized body excludes `subjectChanges`; 073/074 key sets; 081
  renamed to assert thinning + `subjectPreview`), 3 added in
  `describe("MCP stdio contract (Sprint 082)")` (thinned happy-path
  with rename flow + artifact hash + `snapshot_json` byte-identical,
  omitted-id control, orphan path with live keys omitted + digest
  unchanged).

# Validation

- Red phase: `bun test tests/app/mcp-protocol.test.ts` → 6 failures
  in the expected set (072/073/074/081 + 2 new 082 tests) before the
  src change; green after.
- `bun test` full suite: **1180 pass / 0 fail across 80 files**
  (1177 baseline + 3 new). One transient combined-run failure was the
  pre-existing stdio-MCP flake already observed on the untouched
  baseline SHA in Sprint 081; two consecutive clean re-runs.
- `bun run typecheck`: clean. `git diff --check`: clean.
- Live dogfood: not performed (no live credentials; wire shape
  covered by stdio MCP tests end-to-end).

# Learnings

- The projection boundary is the right place: the domain record keeps
  `.snapshot` for CLI / compare while the wire thins — no schema or
  store change, and the 075 orphan path gets the preview for free
  because the 048 row is loaded before the live-compose try.
- Renaming the internal record (`investigationSnapshotRecord`) kept
  sidecar lookups (`listResolutions`, `listIncidentsForInvestigation`)
  and the orphan text working unchanged while the emitted value
  became the thinned projection.
- The tool-description regex constraints are the trap: claims must be
  rewritten without dropping the required phrases (`retained
  composition`, `subject_missing`, `optional when investigationId is
  named`, `investigationArtifact`, …).

# Canon Changes

- `AGENTS.md`: operational baseline updated to Sprints 001–082 with
  the Sprint 082 paragraph.
- `docs/public/MCP.md`: `investigate_resource` row no longer claims
  the retained 048 composition is returned; complete retrieve stays
  CLI `investigation <id>`.
- CLI help, ARCHITECTURE, ROADMAP, SKILL, VISION unchanged
  (ARCHITECTURE / ROADMAP were already updated in the planning pass
  that opened this Sprint).
