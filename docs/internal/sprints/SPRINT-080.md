# SPRINT-080 — MCP-Parity CLI `--json`

> **Status:** Active
> **Depends on:** SPRINT-079 (complete)
> **Authorized by:** `docs/internal/ARCHITECTURE.md` Shell-Native
> Command Contract and `docs/internal/ROADMAP.md` Next Work Sequence
> (post-Sprint 079) item 2. Sprint 079 shipped Resource CURRENT
> observation clocks. Sprint 078 leftovers stay **frozen** (grouping
> `inv:` as Incident members; fifth MCP tool; Investigation
> lifecycle; `--occurred-at` on create). Sprint 079 leftover is not
> a sequence. This Sprint takes **`--json` on the four MCP-parity
> CLI reads only**. Does **not** authorize `--limit`, `--since`,
> `--output`, `--offline`, `--refresh`, artifact handles,
> `skills/combie/SKILL.md`, `--json` on writes, `--json` on
> non-MCP CLI commands, MCP writes, a fifth tool, inferred Action,
> or more Incident mutations.
> **Roadmap:** `docs/internal/ROADMAP.md` Shell-native CLI contract —
> structured JSON on MCP-parity reads over existing composers
> **Type:** Narrow additive CLI observe flag over existing MCP
> projections
> **Primary goal:** A human or agent can compose `providers`,
> `resources`, `related`, and `investigate` as JSON through the CLI
> without scraping tables and without a second schema beside MCP.
> **Provider scope:** None. No new provider reads. JSON is a
> projection of already-composed local state.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. CLI `--json` reuses those four tools'
> structured projections. Tool names and MCP wire format unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprint 040 shipped four read-only MCP tools that return
`structuredContent` from the same application composers the CLI
already calls. CLI stdout is still human tables and prose.

```text
combie providers | resources | related <id> | investigate <id>
  → formatProvidersTable / formatResourcesTable /
    formatRelatedContext / formatInvestigationContext
```

Agents that are not speaking MCP must scrape that text. jq, rg, and
shell pipelines cannot consume it. That is not an artifact store.
That is not a fifth MCP tool. That is not `--limit`.

The missing claim:

```text
The four MCP-parity CLI reads can emit the same structured JSON
MCP already returns. Human output remains the default.
```

That is shell-native observe. It is **not** `--json` on `sync` /
`connect` / `resolution` / `incident`. It is **not** artifact
handles. It is **not** `skills/combie`. It is **not** more Incident
work.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Next Work Sequence (post-Sprint 079):

```text
source authority and freshness          ← shipped Sprint 079
    ↓
shell-native CLI contract               ← this Sprint (smallest)
    ↓
artifact-backed investigation           ← not this Sprint
    ↓
composition-oriented agent skill        ← not this Sprint
    ↓
operational-memory only if earned       ← 078 leftovers stay frozen
```

Sequencing Rule 2: reuse the four MCP `structuredContent` builders
and the existing CLI composers. Do not invent a parallel JSON DTO.

Sequencing Rule 8: do not treat JSON as a second source of truth.
Default human output stays byte-stable when `--json` is omitted.

Sequencing Rule 9: no persistence. No snapshot rewrite. No new
column.

Sequencing Rule 4: the new claim is “this CLI read can emit the
same JSON MCP already emits,” not “every command is machine
readable,” and not “thin the investigation through an artifact
handle.”

---

# Problem

MCP already returns structured JSON. CLI does not:

```text
combie providers          # human table
combie resources          # human table
combie related <id>       # human prose
combie investigate <id>   # human prose
# no --json
```

An agent in a shell, or a human piping to jq, cannot compose those
reads without MCP stdio. Artifact-backed investigation and
`skills/combie` both assume structured CLI output exists first.

---

# Product Question

> After MCP already returns structured JSON from four read-only
> tools over the same composers, can the CLI emit that same JSON
> from `providers`, `resources`, `related`, and `investigate` via
> `--json` — without a second schema, without `--limit` /
> `--offline` / `--refresh`, without `--json` on writes, without a
> fifth MCP tool, and without continuing Sprint 078 leftovers?

---

# Why This Is the Next Roadmap Slice

1. **ARCHITECTURE Shell-Native Command Contract** and **ROADMAP
   sequence item 2** name `--json` on MCP-parity reads as the
   unfinished composition surface. MCP already has the JSON.
2. **Sprint 079 leftover is not a sequence.** CURRENT clocks
   shipped. Relationship currency stays later. WAL checkpoint and
   missing-column-as-null already shipped in 079.
3. **Sprint 078 leftover is not a sequence.** Grouping snapshots as
   Incident members, fifth-tool MCP, lifecycle, and `--occurred-at`
   on create stay frozen.
4. **Existing primitive check:** `listProviders`, `listResources`,
   `getRelatedContext`, `getInvestigationContext` plus MCP
   projections in `src/mcp/tools.ts`. CLI already calls the
   composers; it lacks the JSON emit.
5. **Sequencing Rule 2 / 9:** extract or share those projections.
   Do not persist. Do not add `--limit`.
6. **Later sequence stays later:** artifact handles and
   `skills/combie/SKILL.md` depend on `--json` existing.

Rejected as 080 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| `--json` on `history` / `context` / `changes` / `relationships` | Not MCP tools |
| `--json` on `investigation` / `investigations` / `resolutions` / `incidents` | Not the four-tool contract; fifth-tool / list retrieve stay frozen |
| `--json` on `sync` / `connect` / `resolution` / `incident` | Writes |
| `investigate --json --save` mix | Write plus observe; save confirmation would break jq |
| `--limit` / `--since` / `--output` / `--offline` / `--refresh` | Checklist flags; refresh is `sync`; reads are already offline |
| Artifact hash / snapshot location | Sequence item 3 |
| `skills/combie/SKILL.md` | Sequence item 4 |
| Group Investigation snapshots as members | 078 leftover[0]; Investigation ≠ Incident |
| Fifth tool / `list_investigations` | Frozen four-tool |
| JSON error objects | Keep existing stderr + exit codes |
| Relabel human tables | Copy churn; `--json` is the claim |

---

# Exact Capability

```text
combie providers --json
        ↓
MCP list_providers structuredContent
        ↓
combie resources [--provider] [--kind] --json
        ↓
MCP list_resources structuredContent
        ↓
combie related <resource-id> --json
        ↓
MCP get_related_context structuredContent
        ↓
combie investigate <resource-id> --json
        ↓
MCP investigate_resource structuredContent
   (omitted investigationId path: live compose + optional
    resolutionMemory / incidentMemory / investigationHistory)
```

Omitted `--json` keeps today’s human stdout.

`--json` is a boolean flag (no value). One JSON document on
stdout. Errors stay on stderr with today’s exit codes. No prompt
in `--json` mode (these four reads already do not prompt).

Exact JSON keys are the existing MCP projections (Phase 1 confirms
they remain the shared builders). Do not emit a JSON wrapper of
the human formatter.

Pinned before implementation (Phase 1 may only tighten copy, not
the command set):

```text
providers --json
resources [--provider <id>] [--kind <kind>] --json
related <resource-id> --json
investigate <resource-id> --json
```

`--json` on any other command fails with a clear next-step error
(name the four supported commands). Do not silently ignore it.

`investigate --json --save` fails with a clear error. Human
`investigate --save` is unchanged. JSON is read-only observe.

Known-empty lists (`{ "providers": [] }`, `{ "resources": [] }`)
remain exit 0, matching MCP.

Do not invent `--pretty`. Phase 1 pins compact vs 2-space; prefer
`JSON.stringify(value, null, 2)` plus a trailing newline so jq and
humans both work.

---

# Evidence / Claim Semantics

### KNOWN

```text
This CLI read emitted the same structured projection MCP already
returns for that tool. It is local composed state, not a live
provider call.
```

### UNKNOWN / stale (required)

JSON includes the same freshness and Missing Context fields MCP
already includes (CURRENT clocks, `unknown_provider_sync_authority`
when attempt > success). `--json` does not invent a freshness
flag.

### Forbidden

```text
This JSON is current GitHub inventory
Re-sync because the clocks differ
Every CLI command now has --json
```

---

# Architecture

```text
existing composers (list / related / investigate)
        ↓
shared MCP structured projections (extract from tools.ts)
        ↓
MCP structuredContent          CLI --json stdout
human formatters (default)     unchanged when --json omitted
```

Ownership:

- **CLI:** boolean `--json` on the four commands. Help lists the
  flag. Other commands reject it. `investigate --json --save`
  rejected. Default human paths unchanged.
- **App / MCP:** extract the four `structuredContent` builders so
  CLI and MCP share one projection. `safeJson` stays the JSON-safe
  boundary. Do not change tool names, input schemas, or MCP wire
  annotations.
- **Store:** unchanged. Reads stay read-only. No ALTER.
- **Compare / snapshots:** unchanged. `--json` is not
  `investigation <id> --compare`.

Adapters do not participate.

If implementation is tempted to add `--json` on writes, to add
`--limit`, to add a fifth tool, to persist a new JSON artifact, to
add `skills/combie`, or to thaw 078 leftovers: **STOP.**

---

# Persistence vs Read-Time

| Human CLI | `--json` | MCP |
| --- | --- | --- |
| Unchanged default | Same projection as MCP `structuredContent` | Unchanged tools |

Must **not**:

- persist JSON
- rewrite `snapshot_json`
- dump live clocks into snapshots
- add MCP tools or writes
- add `--limit` / `--since` / `--output` / `--offline` / `--refresh`
- print human tables on stdout when `--json` is set
- print JSON on stderr
- put secrets or credential material in JSON (MCP already omits them)

---

# Boundedness

- Four CLI commands. One boolean flag.
- `resources --json` still honors existing `--provider` / `--kind`.
- `investigate --json` is the omitted-`investigationId` MCP path
  only (live subject compose). Do not add CLI `investigationId`.
- Optional MCP fields stay omitted when empty
  (`resolutionMemory`, `incidentMemory`, `investigationHistory`).
- Four MCP tools. No writes.
- No Relationship, Incident, Resolution, or snapshot schema change.

---

# Failure / Unknown Semantics

- `--json` on an unsupported command: exit 1, stderr names the four
  supported commands, no JSON on stdout.
- `investigate --json --save`: exit 1, stderr says `--json` is
  read-only observe; use `investigate --save` for the human save
  path. No snapshot row written.
- `RESOURCE_NOT_FOUND` / not-initialized / usage errors: same
  codes and stderr as today; stdout is not a JSON error document.
- Known-empty provider or resource lists: JSON empty arrays, exit 0.

---

# Affected Surfaces

### CLI

- `providers --json`
- `resources [--provider] [--kind] --json`
- `related <resource-id> --json`
- `investigate <resource-id> --json`
- help: `--json` on those four reads
- reject `--json` elsewhere and reject `--json --save`

### MCP

Unchanged contract. May call extracted projection helpers.
Four tools. No writes. No new tools.

### Compare

Unchanged. `investigation <id> --compare` stays human. No
`--json` on compare in this slice.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ARCHITECTURE.md`
Shell-Native Command Contract, `docs/internal/ROADMAP.md` Next Work
Sequence, this Sprint, SPRINT-079 leftover (not a sequence), and
inspect:

- `src/cli/index.ts` `parseArgs` / `providers` / `resources` /
  `related` / `investigate`
- MCP `structuredContent` builders in `src/mcp/tools.ts`
- `src/mcp/serialization.ts` `safeJson`
- tests asserting `--json` absent from help

Report:

1. CLI `--json` exists today? Expected: **no.**
2. Four MCP tools already return structured JSON from existing
   composers? Expected: **yes.**
3. CLI `providers` / `resources` / `related` / `investigate`
   already call those composers? Expected: **yes.**
4. `history` / `context` / `changes` / `relationships` /
   `investigation(s)` / `resolutions` / `incidents` are MCP tools?
   Expected: **no.** Stay deferred.
5. `investigate --save` is a write? Expected: **yes.** Refuse mix
   with `--json`.
6. Artifact handles / `skills/combie` / 078 leftovers? Expected:
   **no.** Stay frozen.
7. stdout JSON, stderr errors, exit codes unchanged from today’s
   non-JSON failures?
8. Shared MCP projections; no second schema; no fifth tool?

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no.**
2. Second source of truth? **No** if CLI `--json` and MCP share
   the same projection helpers.
3. Inferred deletion / existence? **No.**
4. Evidence-refresh leak? **No.**
5. Artifact / skill leak? **No.**
6. 078 leftover leak? **No.**
7. MCP tool / write needed? Expected: **no.**
8. Compare / snapshot change? Expected: **no.**
9. Canon change during implementation? Expected: AGENTS.md
   operational baseline + CLI help. ARCHITECTURE / ROADMAP already
   updated in the planning pass that opened this Sprint.

If implementation is tempted to add `--json` on writes, add
`--limit`, add a fifth tool, or continue 078 leftovers: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- help lists `--json` and does not list `--limit` / `--offline` /
  `--refresh`
- `providers --json` parses as JSON and matches
  `list_providers` projection keys (`id`, `name`, `status`,
  `lastSyncAt`, optional `lastAttemptAt`, `accountId`,
  `accountName`); empty list is `{ "providers": [] }` exit 0
- `resources --json` matches `list_resources` identity fields;
  `--provider` / `--kind` still filter
- `related <id> --json` matches `get_related_context` (`subject`,
  `related`)
- `investigate <id> --json` matches omitted-`investigationId`
  `investigate_resource` live keys; omits empty
  `resolutionMemory` / `incidentMemory` / `investigationHistory`
- omitted `--json` keeps human tables/prose (existing assertions
  still pass)
- `--json` on `history` / `sync` / `investigation` exits 1 and
  names the four supported commands
- `investigate --json --save` exits 1, writes no snapshot
- four MCP tools unchanged; MCP reads still do not change DB bytes
- `incident --investigation` still usage (078 leftover[0] frozen)
- `--compare` / snapshot JSON unchanged
- secrets never appear in `--json` stdout

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
combie providers --json | jq .
combie resources --json | jq .
combie related <id> --json | jq .
combie investigate <id> --json | jq .
# omitted --json still human
```

Confirm founder `.combie/combie.db` mtime/size unchanged if it
exists. Isolated `--dir` only.

---

# Explicit Non-Goals

Do **not** implement:

- `--json` on `history`, `context`, `changes`, `relationships`,
  `investigations`, `investigation`, `resolutions`, `incidents`,
  `sync`, `connect`, `resolution`, `incident`, `init`, `mcp`,
  `agent`
- `--limit`, `--since`, `--output`, `--offline`, `--refresh`
- `investigate --json --save`
- JSON error documents
- artifact hash / snapshot location / thinning MCP
  `investigationSnapshot`
- `skills/combie/SKILL.md` or edits to `skills/build-combie/SKILL.md`
  that describe unshipped behavior
- grouping Investigation snapshots as Incident members
- a fifth MCP tool
- Investigation or Incident lifecycle
- `--occurred-at` on create
- Relationship last-verified clocks
- generic Observation / Evidence / Query / Artifact types
- deleting Resources
- inferred Action, Recommendation, Learning, similarity
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
080       MCP-parity CLI --json                                      ← this Sprint
081+      artifact-backed investigation on existing snapshot_json
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
- `--limit` / `--since` / `--output` / `--offline` / `--refresh` frozen
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / SKILL unchanged unless Phase 2 finds a material conflict
  — report it
- ARCHITECTURE / ROADMAP already record this sequence from the
  planning pass; do not reopen them unless implementation proves a
  lie

---

# Migration / Upgrade

No schema change. `--json` is additive. Callers who never pass it
keep today’s human stdout.

If implementation is tempted to add a fifth tool, to add `--json`
on writes, or to add `--limit`: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [ ] Sprint 080 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: `--json` on the four MCP-parity reads shares MCP
      projections; human default unchanged; unsupported `--json`
      and `--json --save` fail clearly; no `--limit`; no fifth tool
- [ ] if earned: no artifact handles; no `skills/combie`; no 078
      leftover thaw
- [ ] if not earned: rejection documented; do not invent a second
      JSON schema
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged except AGENTS.md operational baseline and CLI
      help unless Phase 2 found a lie

---

# Final Principle

> **MCP already speaks structured JSON. The CLI is the primary
> composable primitive. Those four reads must not require scraping
> a table — and they must not grow a second schema to avoid it.**
