# SPRINT-081 — Investigation Snapshot Artifact Handle

> **Status:** Active
> **Depends on:** SPRINT-080 (complete)
> **Authorized by:** `docs/internal/ARCHITECTURE.md` Artifact-Backed
> Investigation and `docs/internal/ROADMAP.md` Next Work Sequence
> (post-Sprint 080) item 3. Sprint 080 shipped MCP-parity CLI
> `--json`. Sprint 078 leftovers stay **frozen** (grouping `inv:`
> as Incident members; fifth MCP tool; Investigation lifecycle;
> `--occurred-at` on create). Sprint 079 leftover is not a
> sequence. Sprint 080 leftover is not a sequence (`--json` on
> additional CLI reads stays unearned). This Sprint takes **a
> read-time artifact handle over existing
> `investigations.snapshot_json` only**. Does **not** authorize a
> file artifact store, ContextPack, thinning the MCP named-id
> dump, a fifth tool, `skills/combie/SKILL.md`, `--json` on
> `investigation`, MCP writes, inferred Action, or more Incident
> mutations.
> **Roadmap:** `docs/internal/ROADMAP.md` Artifact-backed
> investigation — handle, hash, counts, location over the 048 row
> **Type:** Narrow additive observe of an existing retained
> composition
> **Primary goal:** A human or agent that already holds an `inv:`
> id can name the local artifact (where it lives, its content
> hash, how large it is, how to reopen it) without copying
> `snapshot_json` into a new store and without treating the
> snapshot as current provider truth.
> **Provider scope:** None. No new provider reads. The artifact is
> already in local SQLite.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. Named-id `investigate_resource`
> observes an additive artifact handle. Full
> `investigationSnapshot` dump stays until a later sprint thins
> it. `resolutionMemory` / `incidentMemory` unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 048 persisted a retained Investigation composition as
`investigations.snapshot_json`. Sprint 072 returns that row as
MCP `investigationSnapshot` when `investigationId` is named.
CLI `investigation <id>` reprints the full human compose.

```text
investigate --save
        ↓
investigations.snapshot_json   ← already the complete artifact
        ↓
investigation <id>             ← full human dump
investigate_resource
  investigationId              ← full snapshot object in the
                                 agent context window
```

The missing claim:

```text
This inv: id is a handle to a local retained composition.
Here is its content hash, its record counts, and where it
lives in combie.db. Retrieve it with investigation <id>.
It is not current provider truth.
```

That is an artifact handle. It is **not** a new file format.
It is **not** thinning the MCP dump (later). It is **not**
`skills/combie`. It is **not** a fifth tool.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Next Work Sequence (post-Sprint 080):

```text
source authority and freshness          ← shipped Sprint 079
    ↓
shell-native CLI contract               ← shipped Sprint 080
    ↓
artifact-backed investigation           ← this Sprint (smallest)
    ↓
composition-oriented agent skill        ← not this Sprint
    ↓
operational-memory only if earned       ← 078 leftovers stay frozen
```

Sequencing Rule 2: reuse `investigations.snapshot_json` and
`inv:` ids. Do not copy the JSON to a new table or directory.

Sequencing Rule 8: the handle is retained composition, not a
second source of truth. Do not rewrite `snapshot_json`.

Sequencing Rule 9: no new column. Hash and counts are read-time
over the existing TEXT. Location is the investigations row.

Sequencing Rule 4: the new claim is “this snapshot is a local
artifact you can cite and reopen,” not “the agent no longer
receives the dump,” and not “Combie now has an Artifact type.”

---

# Problem

Named-id observe already returns the entire retained
composition. An agent that only needed “which snapshot, how
big, how do I get it later” still receives the full JSON.
CLI reopen has an ID banner and then the whole compose. There
is no content hash, no record counts, and no in-database
location.

`--json` on live `investigate` does not solve this: that is
current compose, not the 048 row.

---

# Product Question

> After `investigations.snapshot_json` already holds the complete
> retained composition, can Combie expose a read-time artifact
> handle (id, hash, counts, location, follow-up) on CLI
> `investigation <id>` and MCP named-id observe — without a file
> store, without thinning the dump, without a fifth tool, and
> without continuing Sprint 078 leftovers?

---

# Why This Is the Next Roadmap Slice

1. **ARCHITECTURE Artifact-Backed Investigation** and **ROADMAP
   sequence item 3** name handle / hash / counts / location over
   the existing 048 row. Thinning the dump is explicitly later.
2. **Sprint 080 leftover is not a sequence.** `--json` on
   `investigation` / `history` / `context` stays unearned.
3. **Sprint 078 leftover is not a sequence.** `inv:` as Incident
   members and fifth-tool `get_investigation` stay frozen.
4. **Existing primitive check:** `Store.getInvestigationRow`
   already returns `snapshotJson`. `inv:` is already the handle.
   CLI `formatSavedInvestigation` already banners id / subject /
   composedAt.
5. **Sequencing Rule 2 / 9:** sha256 of stored TEXT; counts from
   the parsed snapshot; location names the table and id. No
   schema migration.
6. **Later sequence stays later:** thin MCP dumps; then
   `skills/combie/SKILL.md`.

Rejected as 081 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| Copy `snapshot_json` to a file / artifacts dir | Parallel store; Rule 9 |
| Persist hash column | Read-time over existing TEXT is enough |
| Thin MCP `investigationSnapshot` | ROADMAP “later” |
| Fifth tool / `get_investigation` | Frozen four-tool |
| `--json` on `investigation` | 080 leftover; not MCP-parity CLI |
| `skills/combie/SKILL.md` | Sequence item 4 |
| Group snapshots as Incident members | 078 leftover[0] |
| Generic Artifact / ContextPack type | Unearned abstraction |
| Relabel INVESTIGATION SNAPSHOT heading | Copy churn; the handle is the claim |

---

# Exact Capability

```text
combie investigation <inv:id>
        ↓
existing SNAPSHOT banner
        ↓
ARTIFACT
  handle:     inv:…
  schema:     combie.investigation.snapshot.v048
  hash:       sha256:<hex of stored snapshot_json>
  location:   investigations.snapshot_json id=inv:…
  counts:     Phase 1 pins (from retained snapshot only)
  retrieve:   combie investigation <inv:id>
        ↓
existing full human compose (unchanged)

MCP investigate_resource { investigationId }
        ↓
additive investigationArtifact (same fields)
existing investigationSnapshot dump stays
omitted investigationId omits investigationArtifact
```

Pinned before implementation (Phase 1 may only tighten field
names and count inventory, not the command set):

```text
handle     = investigations.id (inv:…)
schema     = combie.investigation.snapshot.v048
hash       = sha256 of the stored snapshot_json TEXT
             (not of pretty-printed parse output)
location   = in-database: table investigations,
             column snapshot_json, id <inv:…>
             Do not emit an absolute filesystem path.
retrieve   = combie investigation <inv:id>
counts     = derived from the retained snapshot only
             (expected: related, subjectChanges; Phase 1
             may add byteLength of snapshot_json)
```

Do not persist the handle. Do not write a sidecar file. Do not
omit `investigationSnapshot` on MCP. Do not add `--json` to
`investigation`.

`investigations` list table stays identity-only (id, subject,
composedAt). Save confirmation may name the handle id as today;
do not expand it unless Phase 1 finds it is the same formatter.

---

# Evidence / Claim Semantics

### KNOWN

```text
This inv: id names a retained composition stored as
investigations.snapshot_json. Its sha256 matches that TEXT.
These counts describe that snapshot, not live compose.
```

### UNKNOWN / stale (required)

The artifact is retained composition at `composedAt`. It is
not current provider inventory. CURRENT clocks on live
investigate remain live-only (Sprint 079). Do not copy live
`providerSyncClocks` into the artifact handle.

### Forbidden

```text
This snapshot is current GitHub inventory
Delete the Resource; the snapshot is smaller
Open the artifact file at /Users/…/.combie/artifacts/
```

---

# Architecture

```text
investigations.snapshot_json     unchanged 048 TEXT
        ↓
read-time handle (sha256, counts, location)
        ↓
CLI investigation <id> ARTIFACT block
MCP investigate_resource investigationArtifact
        ↓
existing full dump / full human compose still present
```

Ownership:

- **App:** a pure handle builder over `snapshotJson` + parsed
  snapshot + id. Name is Phase 1 (expected
  `investigationArtifact` / `formatInvestigationArtifact`).
- **CLI:** `formatSavedInvestigation` shows the ARTIFACT block
  after the existing banner, before the compose. `--compare`
  stays human compare; do not add an artifact section there
  unless Phase 1 finds the reopen formatter is shared (prefer
  reopen-only).
- **MCP:** additive `investigationArtifact` when
  `investigationId` is named (live and orphan-subject 075
  paths that already return `investigationSnapshot`). Omit
  when the id is not passed. Four tools. No writes.
- **Store:** unchanged. No ALTER.

Adapters do not participate.

If implementation is tempted to write a file, add a fifth
tool, thin the dump, add `--json` on `investigation`, or thaw
078 leftovers: **STOP.**

---

# Persistence vs Read-Time

| `snapshot_json` | Handle | Dump |
| --- | --- | --- |
| Unchanged 048 TEXT | Read-time sha256 + counts | MCP `investigationSnapshot` unchanged |

Must **not**:

- persist hash / schema / counts
- rewrite `snapshot_json`
- copy JSON to the filesystem
- add MCP tools or writes
- omit `investigationSnapshot` in this slice
- add `--json` on `investigation` / `investigations`
- put secrets in the handle (hash the stored TEXT as-is;
  do not add credential fields)

---

# Boundedness

- One read-time handle on named-id observe.
- CLI reopen `investigation <id>` only (not the list, not
  live `investigate`, not `--save` confirmation unless shared).
- MCP: existing `investigate_resource` named-id path only.
- Four MCP tools. No writes.
- No Relationship, Incident, Resolution, or snapshot schema
  change.
- `MAX_INVESTIGATION_FACTS = 5` unchanged.

---

# Failure / Unknown Semantics

- Unknown `inv:` still `INVESTIGATION_NOT_FOUND` as today.
  No artifact handle on that error.
- Unreadable `snapshot_json` still
  `INVESTIGATION_SNAPSHOT_UNTRUSTED`. Do not emit a handle
  for untrusted bytes.
- Omitted MCP `investigationId`: no `investigationArtifact`.
- Hash is of stored TEXT. Pretty-printing the parsed snapshot
  must not change the hash.

---

# Affected Surfaces

### CLI

- `investigation <id>` ARTIFACT block
- help: one sentence that a saved snapshot is a local artifact
  reopenable by id (Phase 1: only if the reopen line would
  otherwise lie)

### MCP

Four tools. Additive `investigationArtifact` on named-id
`investigate_resource`. `investigationSnapshot` dump stays.
No writes. No new tools.

### Compare

Unchanged. `--compare` is not an artifact retrieve.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ARCHITECTURE.md`
Artifact-Backed Investigation, `docs/internal/ROADMAP.md` Next
Work Sequence, this Sprint, SPRINT-080 leftover (not a
sequence), and inspect:

- `Store.getInvestigationRow` / `snapshot_json`
- `serializeInvestigationSnapshot` / `parseInvestigationSnapshot`
- `formatSavedInvestigation` / save confirmation
- MCP named-id `investigationSnapshot` assembly
- 048 snapshot fields actually present (no `knownFacts` in JSON)

Report:

1. `snapshot_json` is already the complete retained
   composition? Expected: **yes.**
2. Hash can be sha256 of stored TEXT with no new column?
   Expected: **yes.**
3. MCP named-id already dumps the full snapshot object?
   Expected: **yes.** Keep it this Sprint.
4. Fifth tool / `list_investigations`? Expected: **no.** Stay
   frozen.
5. `--json` on `investigation` exists? Expected: **no.** Stay
   that way.
6. `skills/combie` / file artifact store / 078 leftovers?
   Expected: **no.** Stay frozen.
7. Exact count inventory from retained snapshot (not live
   compose)? Pin it.
8. Orphan-subject 075 named-id path still has the 048 row so
   the handle can be emitted? Expected: **yes.**

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? **No** if the handle cites the 048
   row and does not duplicate JSON.
3. Inferred deletion / existence? **No.**
4. Evidence-refresh leak? **No.**
5. `--json` on `investigation` / artifact-file / skill leak?
   **No.**
6. 078 leftover leak? **No.**
7. MCP tool / write needed? Expected: **no.**
8. Thin the dump this Sprint? Expected: **no.**
9. Canon change during implementation? Expected: AGENTS.md
   operational baseline + CLI help. ARCHITECTURE / ROADMAP
   already updated in the planning pass that opened this Sprint.

If implementation is tempted to write a file, add a fifth
tool, thin the dump, or continue 078 leftovers: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- `investigation <id>` shows ARTIFACT handle, schema, sha256,
  location (table/column/id, no absolute path), counts, retrieve
  line
- hash matches sha256 of stored `snapshot_json` TEXT
- counts come from the retained snapshot, not live compose
  (change live Resource after save; artifact counts stay)
- MCP named-id observes `investigationArtifact` with the same
  fields; omitted id omits it
- MCP `investigationSnapshot` dump still present on named-id
- four tools; no writes; database bytes unchanged on MCP reads
- `--json` still absent from `investigation` / help except the
  four 080 commands
- `incident --investigation` still usage (078 leftover[0])
- `--compare` / snapshot JSON unchanged
- untrusted snapshot still errors; no handle
- secrets never appear in the handle fields

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
combie investigate <id> --save
combie investigation <inv:…>     # ARTIFACT then full compose
# MCP named-id: investigationArtifact present; dump still present
```

Confirm founder `.combie/combie.db` mtime/size unchanged if it
exists. Isolated `--dir` only.

---

# Explicit Non-Goals

Do **not** implement:

- filesystem artifact directory / hash-addressed files
- persisted hash / schema / count columns
- thinning or omitting MCP `investigationSnapshot`
- `--json` on `investigation`, `investigations`, `history`,
  `context`, `changes`, `relationships`, writes
- `--limit`, `--since`, `--output`, `--offline`, `--refresh`
- `skills/combie/SKILL.md` or unshipped behavior in
  `skills/build-combie/SKILL.md`
- grouping Investigation snapshots as Incident members
- a fifth MCP tool
- Investigation or Incident lifecycle
- `--occurred-at` on create
- generic Artifact / Evidence / Query / ContextPack types
- deleting Resources
- inferred Action, Recommendation, Learning, similarity
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
081       Investigation snapshot artifact handle                     ← this Sprint
082+      thin MCP named-id investigationSnapshot dumps
          composition-oriented skills/combie/SKILL.md
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
- MCP `investigationSnapshot` dump frozen (thin later)
- `--json` on non-080 commands frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / SKILL unchanged unless Phase 2 finds a material conflict
  — report it
- ARCHITECTURE / ROADMAP already record this sequence from the
  planning pass; do not reopen them unless implementation proves a
  lie

---

# Migration / Upgrade

No schema change. Handles are read-time. Old 048 rows hash as
their stored TEXT. Callers who never read the new fields keep
today’s reopen and named-id dump.

If implementation is tempted to add a fifth tool, to write a
file, or to thin the dump: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [ ] Sprint 081 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: CLI reopen and MCP named-id observe a read-time
      handle over `snapshot_json`; dump stays; no file store; no
      fifth tool
- [ ] if earned: no `--json` on `investigation`; no
      `skills/combie`; no 078 leftover thaw
- [ ] if not earned: rejection documented; do not invent an
      Artifact type
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged except AGENTS.md operational baseline and CLI
      help unless Phase 2 found a lie

---

# Final Principle

> **The snapshot is already the artifact. Name it, hash it, count
> it, and say where it lives — without copying it, and without
> pretending the dump has already been thinned.**

---

# Completed — 2026-08-19

## Repository Understanding (Phase 1)

1. `snapshot_json` is already the complete retained composition — **yes.**
   `serializeInvestigationSnapshot` is compact `JSON.stringify` of the
   `InvestigationContext` minus `providerSyncClocks`; stored verbatim as
   TEXT. Eight top-level keys; no `knownFacts` / `missingContext` /
   `providerActivity` / `timeline` in the JSON (all read-time).
2. sha256 of stored TEXT with no new column — **yes.**
   `Store.getInvestigationRow` returns `snapshotJson` verbatim.
   `SavedInvestigation` was deliberately left unchanged so the MCP
   `investigationSnapshot` dump stays byte-identical; a separate
   `getInvestigationArtifact` loader reads the row directly.
3. MCP named-id already dumps the full snapshot object — **yes.** Kept.
4. Fifth tool / `list_investigations` — **no.** Frozen.
5. `--json` on `investigation` — **no.** `JSON_COMMANDS` unchanged.
6. `skills/combie` / file artifact store / 078 leftovers — **none.**
7. Count inventory pinned: `related`, `subjectChanges` from the retained
   snapshot, plus `byteLength` of the stored TEXT (Phase-1 allowance).
8. Orphan-subject 075 path — **yes.** The 048 row is loaded before live
   compose; the artifact loader is row-based and works on both paths.

## Architecture Pressure (Phase 2)

1. Persistence: **no.** 2. Second source of truth: **no** — the handle
   cites the 048 row and duplicates no JSON. 3. Inferred deletion /
   existence: **no.** 4. Evidence-refresh leak: **no** — counts come from
   the retained snapshot only; no live clocks in the handle.
5. `--json` on `investigation` / artifact-file / skill leak: **no.**
6. 078 leftover leak: **no.** 7. MCP tool / write: **no** — additive
   field on the existing tool. 8. Thin the dump: **no.**
9. Canon change: AGENTS.md operational baseline only. CLI help unchanged:
   the reopen line ("Reopen a saved investigation snapshot") does not
   lie, so the Phase-1 conditional did not require a help edit.

## Implemented

- `src/app/investigations.ts`: `INVESTIGATION_SNAPSHOT_SCHEMA`
  (`combie.investigation.snapshot.v048`), `InvestigationArtifact`,
  pure `buildInvestigationArtifact(id, snapshotJson, snapshot)` (sha256
  of the stored TEXT, counts from the retained snapshot, byteLength,
  in-database location, retrieve line), `getInvestigationArtifact`
  loader (same `INVESTIGATION_ID_REQUIRED` / `INVESTIGATION_NOT_FOUND`
  / `INVESTIGATION_SNAPSHOT_UNTRUSTED` semantics as
  `getSavedInvestigation` via a shared `loadInvestigationRow`),
  `formatInvestigationArtifact` (ARTIFACT block), and
  `formatSavedInvestigation(record, artifact?)` — artifact rendered
  between the banner and the compose, omitted when not provided.
- `src/cli/index.ts`: `investigation <id>` reopen builds the handle and
  prints the ARTIFACT block. `--compare` and save confirmation unchanged.
- `src/mcp/tools.ts`: additive `investigationArtifact` on named-id
  `investigate_resource` (happy path and orphan-subject 075 path),
  omitted when `investigationId` is not passed; `investigationSnapshot`
  dump stays; tool description documents the new additive field.
- No schema change, no file store, no fifth tool, no `--json` on
  `investigation`, no `skills/combie`, no 078 leftover thaw.

## Validation

- `bun test`: 1177 tests pass (1171 baseline + 6 new). Two earlier
  combined-run failures were the pre-existing stdio-MCP flake already
  observed on the untouched baseline SHA; clean on re-run.
- `bun run typecheck`: clean. `git diff --check`: clean.
- Live dogfood (isolated `--dir`): `investigate <id> --save` →
  `investigation <inv:…>` prints ARTIFACT (handle / schema / hash /
  location / counts / retrieve) between banner and compose; hash equals
  `sha256` of the stored `snapshot_json` TEXT; `--compare` unchanged.
- New tests: 4 app-layer (`tests/app/investigations.test.ts` — handle
  fields + hash-vs-stored-TEXT, counts frozen vs live mutation, unknown
  id / untrusted snapshot fail without a handle, ARTIFACT block
  rendering and ordering), extended CLI reopen assertions
  (`tests/cli/commands.test.ts` — ARTIFACT block, no absolute path,
  `--compare` without ARTIFACT), 2 stdio MCP tests
  (`tests/app/mcp-protocol.test.ts` — named-id `investigationArtifact`
  with same fields, omitted id omits it, dump still present, four
  tools, DB bytes unchanged, row untouched; orphan-subject path keeps
  the handle).

## Learnings

- Keeping `SavedInvestigation` shape frozen (so the MCP dump does not
  change) meant the raw TEXT had to be re-read for the hash; a shared
  `loadInvestigationRow` keeps the two loaders' error semantics
  identical.
- The banner already contains `SUBJECT:`, so ordering assertions in
  tests must anchor on the compose body, not the word `SUBJECT`.
- Baseline SHA: `ed5362b06612c08f6008f9bd2bf4cf68acb1ef73`, 1171 tests.

## Canon Changes

- `AGENTS.md`: operational baseline updated to Sprints 001–081 with the
  Sprint 081 paragraph. CLI help, ARCHITECTURE, ROADMAP, SKILL, VISION
  unchanged (ARCHITECTURE / ROADMAP were already updated in the
  planning pass that opened this Sprint).

## Definition of Done

- [x] Sprint 081 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] CLI reopen and MCP named-id observe a read-time handle over
      `snapshot_json`; dump stays; no file store; no fifth tool
- [x] no `--json` on `investigation`; no `skills/combie`; no 078
      leftover thaw
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help (help unchanged by the Phase-1 conditional)
