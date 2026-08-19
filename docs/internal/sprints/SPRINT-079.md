# SPRINT-079 — Resource CURRENT Observation Clocks

> **Status:** Complete
> **Depends on:** SPRINT-078 (complete)
> **Authorized by:** `docs/internal/ARCHITECTURE.md` Source Authority
> Contract and `docs/internal/ROADMAP.md` Next Work Sequence
> (post-Sprint 078). Remaining v0.3 freshness surface after
> provider-native evidence families already distinguish
> latest-attempt vs last-success. Sprint 078 leftovers stay
> **frozen** (grouping `inv:` as Incident members; fifth MCP tool;
> Investigation lifecycle; `--occurred-at` on create). This Sprint
> takes **Resource CURRENT + provider last-attempt vs last-success
> only**. Does **not** authorize CLI `--json`, artifact handles,
> `skills/combie/SKILL.md`, Relationship verification clocks,
> populated-membership id sets, a generic Observation type, MCP
> writes, a fifth tool, inferred Action, or more Incident mutations.
> **Roadmap:** `docs/internal/ROADMAP.md` v0.3 remaining freshness —
> **Resource snapshot is an observation**, not implied provider truth
> **Type:** Narrow additive provider clock + CURRENT / Missing Context
> observe of existing Resource `updatedAt` + that clock
> **Primary goal:** A human or agent reading CURRENT can tell when
> Combie last observed the Resource, when that provider last
> succeeded, and when Combie last attempted a sync — without deleting
> Resources, without claiming current provider inventory, and without
> thawing MCP writes.
> **Provider scope:** All connected providers. No new provider reads.
> Clocks are local sync metadata.
> **Generic Event / Correlation / Investigation Engine / Memory Engine:**
> Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools. No
> fifth tool. No MCP writes. Existing `list_providers` and
> `investigate_resource` observe the new attempt clock / CURRENT
> fields. `resolutionMemory` / `incidentMemory` unchanged.
> **AI / hypotheses / confidence / telemetry / execution:** None

---

# This Is Not a Layer Transition

Sprints 027–030 shipped refresh authority for provider-native
evidence families:

```text
latest attempt observedAt
last successful observedAt
last successful resultCount
known-empty ≠ unknown ≠ retained stale
MISSING CONTEXT never_successfully_refreshed / unknown_current_authority
```

Sprints 048–078 shipped retained Investigation composition and the
smallest v0.7 operational-memory capture slices.

Resource CURRENT did not receive that contract:

```text
investigate <id> / context <id> / history <id>
  CURRENT
  provider  github
  kind      repository
  name      "combie"
```

`providers.last_sync_at` is last **successful** sync only
(`Store.setLastSync` in `syncOne` after discovery). A later failed
`sync` leaves LAST SYNC unchanged. `Resource.updatedAt` is a Combie
upsert stamp and is excluded from Change diffs, but CURRENT does not
show it.

The missing claim:

```text
This Resource snapshot is what Combie last successfully observed
from that provider. A later failed sync attempt is visible.
CURRENT is not silent provider truth.
```

That is explicit observation. It is **not** Resource deletion. It is
**not** “this Resource no longer exists.” It is **not** CLI `--json`.
It is **not** an artifact store. It is **not** more Incident work.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Next Work Sequence (post-Sprint 078):

```text
source authority and freshness          ← this Sprint (smallest)
    ↓
shell-native CLI contract               ← not this Sprint
    ↓
artifact-backed investigation           ← not this Sprint
    ↓
composition-oriented agent skill        ← not this Sprint
    ↓
operational-memory only if earned       ← 078 leftovers stay frozen
```

Sequencing Rule 2: reuse `providers.last_sync_at` (already last
success) and `Resource.updatedAt` (already last successful upsert).
Add one missing clock: last attempt.

Sequencing Rule 8: do not copy `last_sync_at` over a failed attempt.
Do not treat `Resource.updatedAt` as provider-native event time.

Sequencing Rule 9: one additive nullable column on `providers`. No
new Resource column. No `incident_id`. No snapshot rewrite.

Sequencing Rule 4: the new claim is “Combie attempted a provider
sync at T and last succeeded at U,” not “this Resource is still in
the provider inventory,” and not “delete it.”

---

# Problem

After a successful sync, CURRENT looks like live inventory. After a
later failed sync:

```text
combie providers          # LAST SYNC still the successful time
combie investigate <id>   # CURRENT unchanged; no attempt clock
combie context <id>       # same
combie history <id>       # CURRENT heading; Resource.updatedAt unused
```

Evidence families already say unknown vs populated. The Resource
snapshot does not.

---

# Product Question

> After provider-native evidence already distinguishes last attempt
> from last success, can Combie persist a provider last-attempt clock
> and show Resource CURRENT as a timestamped observation — without
> deleting Resources, without a generic Observation type, without CLI
> `--json`, without a fifth MCP tool, and without continuing Sprint
> 078 leftovers?

---

# Why This Is the Next Roadmap Slice

1. **ARCHITECTURE Source Authority Contract** and **ROADMAP v0.3
   remaining surface** name Resource CURRENT as the unfinished
   freshness gap. Evidence families already satisfy most of the
   contract.
2. **Sprint 078 leftover is not a sequence.** Grouping snapshots as
   Incident members, fifth-tool MCP, lifecycle, and `--occurred-at`
   on create stay frozen.
3. **Existing primitive check:** `last_sync_at` is last success;
   `Resource.updatedAt` is last upsert; evidence refresh tables
   already have attempt vs success. This Sprint adds the missing
   provider attempt clock and surfaces those three facts on CURRENT.
4. **Sequencing Rule 8 / 9:** one additive `last_attempt_at`. Do not
   invent per-Resource membership of the latest discovery page.
5. **Later sequence stays later:** `--json`, artifact handles, and
   `skills/combie/SKILL.md` depend on CURRENT not being silent
   provider truth.

Rejected as 079 (not equivalent leftovers):

| Candidate | Why not now |
| --- | --- |
| CLI `--json` on reads | Sequence item 2 |
| Snapshot hash / artifact location | Sequence item 3 |
| `skills/combie/SKILL.md` | Sequence item 4 |
| Group Investigation snapshots as members | 078 leftover[0]; Investigation ≠ Incident |
| Fifth tool / `list_investigations` | Frozen four-tool |
| Relationship last-verified clocks | Larger; needs this provider clock first |
| Persist latest-discovery Resource id sets | Membership proof; not this slice |
| Generic Observation / Evidence type | Unearned abstraction |
| Delete Resources absent from a sync | Absence is not deletion authority |
| Relabel CURRENT heading | Copy churn; clocks are the claim |

---

# Exact Capability

```text
combie sync [provider]
        ↓
every attempted provider writes last_attempt_at = now
successful discovery still writes last_sync_at = now
  and Resource.updatedAt as today
failed attempt leaves last_sync_at and Resources unchanged
        ↓
combie providers
  LAST SYNC = last_sync_at (success, relative as today)
  last attempt visible when it differs from last success
        ↓
investigate / context / history CURRENT
  observed by Combie at: Resource.updatedAt
  last successful provider sync: last_sync_at
  last provider sync attempt: last_attempt_at
        ↓
MISSING CONTEXT when last attempt is after last success
  (unknown current Resource snapshot authority)
        ↓
MCP list_providers observes lastAttemptAt
MCP investigate_resource subject observes the same CURRENT clocks
```

Exact CLI copy is Phase 1. Expected CURRENT lines (omit a clock
line only when that timestamp is null):

```text
CURRENT
provider  github
kind      repository
name      "combie"
observed by Combie at: 2026-08-19T12:00:00.000Z
last successful provider sync: 2026-08-19T12:00:00.000Z
last provider sync attempt: 2026-08-19T12:30:00.000Z
```

When last attempt equals last success, still show both clocks
(Phase 1 may collapse the attempt line when equal — pin it; prefer
showing both so the two meanings stay visible).

Do not invent `--freshness`. Do not add `--json`. Do not change
`resources` identity table columns in this slice.

---

# Evidence / Claim Semantics

### KNOWN

```text
Combie last successfully observed this Resource at updatedAt.
That provider last succeeded at last_sync_at.
Combie last attempted that provider at last_attempt_at.
```

### UNKNOWN / stale (required)

When `last_attempt_at` is later than `last_sync_at`, current
provider inventory is **unknown**. The Resource row is **retained
observation**, not proof the provider still has it, and not proof
it is gone.

### Forbidden

```text
This Resource currently exists in GitHub
Delete it; the last sync failed
Production is currently healthy
You should re-sync
```

---

# Architecture

```text
providers.last_sync_at          unchanged meaning (last success)
providers.last_attempt_at       this Sprint (every try)
resources.updated_at            unchanged (last successful upsert)
        ↓
syncOne / syncProviders catch   write attempt; success still setLastSync
        ↓
CLI CURRENT (investigate, context, history)
CLI providers (attempt when present)
Missing Context                 unknown provider-sync authority
MCP list_providers / investigate_resource subject
```

Ownership:

- **Store:** additive nullable `last_attempt_at` on `providers`.
  `setLastAttempt` (name is Phase 1) on every try. `setLastSync`
  remains success-only. Safe backfill:
  `last_attempt_at = last_sync_at` only where attempt is NULL and
  success is present — that success was an attempt. Never copy a
  guessed failure.
- **App:** CURRENT formatters read provider clocks +
  `Resource.updatedAt`. New Missing Context kind (Phase 1 pins the
  identifier; expected `unknown_provider_sync_authority`) on the
  subject when attempt is after success. Do not emit it when
  clocks are equal or attempt is null.
- **CLI:** no new command. No `--json`. Help: providers LAST SYNC
  meaning stays success; attempt is additional.
- **MCP:** observe the new fields on existing tools. No new tool.
  `docs/public/MCP.md` only if `list_providers` / investigate
  subject fields would otherwise lie.
- **Compare:** AUTHORITY CLOCKS may include provider-sync clocks
  if Phase 1 finds they already belong there; do not invent a
  fifth compare section. Snapshot JSON is not rewritten for old
  rows.

Adapters do not participate.

If implementation is tempted to delete Resources, to add `--json`,
to add a fifth tool, to persist discovery id sets, to add a generic
Observation type, or to thaw 078 leftovers: **STOP.**

---

# Persistence vs Read-Time

| Resource row | Provider clocks | CURRENT |
| --- | --- | --- |
| Unchanged on failed sync | attempt updated; success unchanged | observation + unknown when attempt > success |
| `updatedAt` still last success upsert | `last_sync_at` last success | not provider-native event time |

Must **not**:

- delete Resources on failed or empty discovery
- treat list absence as deletion authority
- store empty-string clocks
- default omitted attempt to now
- copy `updatedAt` into `last_attempt_at`
- rewrite `snapshot_json`
- add MCP tools or writes
- add CLI `--json` / `--offline` / `--refresh`

---

# Boundedness

- One additive provider column.
- CURRENT on existing `investigate`, `context`, `history` only.
- `providers` table may show the attempt clock; `resources` list
  stays identity-only.
- Missing Context: subject provider-sync unknown only. Do not fan
  out to every related neighbor in this slice unless Phase 1 finds
  it is the same helper (prefer subject-only).
- `MAX_INVESTIGATION_FACTS = 5` unchanged.
- Four MCP tools. No writes.
- No Relationship, Incident, Resolution, or snapshot schema change.

---

# Failure / Unknown Semantics

- Failed `sync` of a connected provider: `last_attempt_at` set,
  `last_sync_at` unchanged, Resources unchanged, exit 1 as today.
- Provider never successfully synced: `last_sync_at` null; no
  Resources; CURRENT is unreachable (`RESOURCE_NOT_FOUND`).
- Pre-079 databases: backfill attempt from success where success
  exists; attempt null and success null stay unknown.
- Known-empty provider discovery (success, zero resources) is
  still success: both clocks equal. Do not call that unknown.

---

# Affected Surfaces

### CLI

- `sync` writes attempt on every try
- `providers` observes attempt vs success
- `investigate` / `context` / `history` CURRENT clocks
- MISSING CONTEXT new kind when attempt > success
- help: LAST SYNC remains last successful sync (Phase 1: one
  sentence if the providers column set grows)

### MCP

Four tools. `list_providers` gains `lastAttemptAt` (omit when
null, matching other optional fields). `investigate_resource`
subject / live CURRENT projection observes the same clocks.
No writes. No new tools.

### Compare

Unchanged unless Phase 1 reuses AUTHORITY CLOCKS for the provider
row. Do not add Incident/Resolution compare.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ARCHITECTURE.md`
Source Authority Contract, `docs/internal/ROADMAP.md` Next Work
Sequence, this Sprint, SPRINT-028 last-success vs latest-attempt
on evidence refresh, and inspect:

- `Store.setLastSync` / `providers.last_sync_at`
- `syncOne` success path vs `syncProviders` catch
- `Resource.updatedAt` / `diffResource` exclusion
- `formatInvestigationContext` / `formatResourceContext` /
  `formatResourceHistory` CURRENT blocks
- `composeMissingContext` evidence kinds
- MCP `list_providers` `lastSyncAt`

Report:

1. Failed sync currently leaves `last_sync_at` unchanged? Expected:
   **yes.**
2. `Resource.updatedAt` unused on CURRENT today? Expected: **yes.**
3. Evidence families already have attempt vs success? Expected:
   **yes.** Reuse the meaning, not those tables.
4. CLI `--json` exists? Expected: **no.** Stay that way.
5. `inv:` as Incident members / fifth tool? Expected: **no.** Stay
   frozen.
6. Copy for CURRENT clocks and Missing Context kind identifier
   pinned?
7. MCP observe-only of the new fields; no fifth tool?
8. No Resource deletion; no generic Observation type?

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? **Yes** — `last_attempt_at` only. Success
   clock already exists.
2. Second source of truth? **No** if CURRENT cites provider clocks
   + `updatedAt` and does not invent a parallel Resource freshness
   row.
3. Inferred deletion / existence? **No.**
4. Evidence-refresh leak? **No** — those tables stay as they are.
5. CLI `--json` / artifact / skill leak? **No.**
6. 078 leftover leak? **No.**
7. MCP tool / write needed? Expected: **no.** Observe existing
   tools.
8. Compare / snapshot change? Expected: **no** unless AUTHORITY
   CLOCKS already reads provider rows (Phase 1).
9. Canon change during implementation? Expected: AGENTS.md
   operational baseline + CLI help. ARCHITECTURE / ROADMAP already
   updated in the planning pass that opened this Sprint.

If implementation is tempted to delete Resources, add `--json`,
add a fifth tool, or continue 078 leftovers: **STOP.**

---

# Tests

Red → Green → Refactor. No live credentials.

- failed `sync` sets `lastAttemptAt` and leaves `lastSyncAt` /
  Resources unchanged
- successful `sync` sets both clocks equal (same ISO)
- `providers` shows last success; attempt visible when different
- CURRENT on `investigate`, `context`, and `history` shows
  `updatedAt` and provider clocks
- MISSING CONTEXT emits the new kind only when attempt > success
- equal clocks do not emit that Missing Context kind
- MCP `list_providers.lastAttemptAt` present after a failed attempt
- MCP `investigate_resource` subject observes the clocks
- four tools; no writes; database bytes unchanged on MCP reads
- `--json` still absent from help
- `incident --investigation` still usage (078 leftover[0] frozen)
- `--compare` / snapshot JSON unchanged for this path
- backfill: pre-079 success-only row gets attempt = success

---

# Live Dogfood

Isolated `--dir`. Never commit secrets or private names.

```text
# after a real successful sync in isolated dir
combie investigate <id>     # CURRENT shows observed-at + both clocks equal
combie providers            # LAST SYNC recent; attempt equals success

# failed attempt (revoke/misconfigure only in isolated dir, or
# simulate via tests if live failure is unsafe)
# CURRENT still shows last successful observation
# MISSING CONTEXT names unknown provider-sync authority
# Resources still listed
```

Confirm founder `.combie/combie.db` mtime/size unchanged if it
exists. Isolated `--dir` only.

---

# Explicit Non-Goals

Do **not** implement:

- CLI `--json`, `--limit`, `--since`, `--output`, `--offline`,
  `--refresh`
- artifact hash / snapshot location / thinning MCP
  `investigationSnapshot`
- `skills/combie/SKILL.md` or edits to `skills/build-combie/SKILL.md`
  that describe unshipped behavior
- grouping Investigation snapshots as Incident members
- a fifth MCP tool
- Investigation or Incident lifecycle
- `--occurred-at` on create
- Relationship last-verified clocks
- latest-discovery Resource id membership
- generic Observation / Evidence / Query / Artifact types
- deleting Resources
- relabeling the CURRENT heading
- inferred Action, Recommendation, Learning, similarity
- policy, execution, hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
079       Resource CURRENT observation clocks                         ← this Sprint
080+      shell-native CLI `--json` on MCP-parity reads
          artifact-backed investigation on existing snapshot_json
          composition-oriented skills/combie/SKILL.md
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
- 049 compare semantics unchanged unless AUTHORITY CLOCKS already
  owns provider rows
- grouping `inv:` as Incident members frozen
- fifth tool / `get_investigation` / `list_investigations` frozen
- Investigation lifecycle frozen
- CLI `--json` frozen (sequence item 2)
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- VISION / SKILL unchanged unless Phase 2 finds a material conflict
  — report it
- ARCHITECTURE / ROADMAP already record this sequence from the
  planning pass; do not reopen them unless implementation proves a
  lie

---

# Migration / Upgrade

Additive `providers.last_attempt_at`. Backfill from `last_sync_at`
where attempt is NULL and success is present. Callers who never
read the new field are unchanged except CURRENT / providers /
Missing Context copy after this Sprint.

If implementation is tempted to add a fifth tool, to delete
Resources, or to add `--json`: **STOP.**

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [x] Sprint 079 is the single Active sprint
- [x] baseline SHA and test count recorded
- [x] Repository Understanding report completed
- [x] Architecture Pressure report completed before implementation
- [x] if earned: failed sync records last attempt; CURRENT shows
      observation clocks; Missing Context when attempt > success;
      Resources not deleted; MCP observes clocks on existing tools
- [x] if earned: no `--json`; no fifth tool; no 078 leftover thaw;
      no generic Observation type
- [x] if not earned: rejection documented; do not invent CURRENT
      authority
- [x] full test suite and typecheck pass
- [x] completion notes finalized
- [x] Canon unchanged except AGENTS.md operational baseline and CLI
      help unless Phase 2 found a lie

---

# Final Principle

> **Provider-native evidence already knows attempt from success.
> Resource CURRENT must learn the same distinction. Combie must not
> present a stored Resource as quieter, newer truth than the
> provider that owns it.**

---

# Completion Notes (2026-08-19)

## Phase 1 — Repository Understanding

HEAD `d440f4d` (Canon authorization). Pins:

1. Failed sync currently leaves `last_sync_at` unchanged?
   **Yes.** `Store.setLastSync` runs only at the end of `syncOne`.
   `syncProviders` catch now stamps `last_attempt_at` without
   touching success or Resources.
2. `Resource.updatedAt` unused on CURRENT today? **Was yes.**
   CURRENT on `investigate` / `context` / `history` now prints
   `observed by Combie at: ${updatedAt}`.
3. Evidence families already have attempt vs success? **Yes.**
   Meaning reused; those refresh tables untouched.
4. CLI `--json` exists? **No.** Help still omits it.
5. `inv:` as Incident members / fifth tool? **No.**
   `incident --investigation` still usage.
6. CURRENT clock copy pinned:
   `observed by Combie at` / `last successful provider sync` /
   `last provider sync attempt`. Missing Context kind pinned:
   `unknown_provider_sync_authority`. Equal clocks still show
   both provider lines; omit a line only when that timestamp is
   null. `providers` LAST ATTEMPT column shows `—` when attempt
   equals success or is null.
7. MCP observe-only of the new fields; no fifth tool. **Yes.**
   `list_providers.lastAttemptAt` omitted when null.
   `investigate_resource` subject observes
   `lastSuccessfulProviderSyncAt` /
   `lastProviderSyncAttemptAt` when present.
8. No Resource deletion; no generic Observation type. **Yes.**

## Phase 2 — Architecture Pressure

1. Persistence necessary? **Yes** — nullable
   `providers.last_attempt_at` plus `setLastAttempt`. Success
   clock unchanged.
2. Second source of truth? **No.** CURRENT cites provider clocks
   + `Resource.updatedAt`. No parallel Resource freshness row.
3. Inferred deletion / existence? **No.**
4. Evidence-refresh leak? **No.**
5. CLI `--json` / artifact / skill leak? **No.**
6. 078 leftover leak? **No.**
7. MCP tool / write needed? **No.** Existing tools observe.
8. Compare / snapshot change? **No fifth section.** Live
   `unknown_provider_sync_authority` can appear as MISSING
   CONTEXT CURRENT ONLY. Snapshot JSON strips
   `providerSyncClocks` so 048 schema stays unchanged.
   AUTHORITY CLOCKS remains evidence-family refresh clocks.
9. Canon? AGENTS.md operational baseline + CLI help. ARCHITECTURE
   / ROADMAP already recorded this sequence in `d440f4d`.
   `docs/public/MCP.md` unchanged (high-level tool table; does
   not enumerate `lastSyncAt` fields).

No STOP conflict.

## Implemented

- Additive nullable `providers.last_attempt_at`.
  `setLastAttempt` does not change `last_sync_at`. Safe backfill:
  `last_attempt_at = last_sync_at` only where attempt is NULL and
  success is present.
- `syncOne` success writes both clocks to the same ISO.
  `syncProviders` catch stamps attempt only when the provider
  row exists (missing row is not a sync try).
- CURRENT on `investigate` / `context` / `history` shows
  Combie observation time and both provider clocks.
- Missing Context `unknown_provider_sync_authority` on the
  subject only when attempt > success. Equal / null clocks do
  not emit it.
- `providers` table: LAST SYNC remains last success; LAST
  ATTEMPT is visible when it differs.
- MCP `list_providers` / `investigate_resource` subject observe
  the clocks; four tools; read-only.
- `serializeInvestigationSnapshot` strips `providerSyncClocks`.
- `Store.close()` checkpoints WAL so `combie.db` hashes include
  committed rows (MCP digest tests were hashing the 4 KiB WAL
  header).
- Read-path `getProvider` / `listProviders` treat a missing
  `last_attempt_at` column as null. Pre-079 DBs are migrated
  only on writable `init()`; MCP/CLI reads do not ALTER.

## Deviations

None that change the claim. Phase 1 pinned showing both provider
clock lines when equal (not collapsing CURRENT). The providers
table still shows `—` for LAST ATTEMPT when equal — that is the
sprint's "attempt visible when different" pin for `providers`,
not CURRENT.

## Validation

```text
baseline:          d440f4d docs(canon): record source-authority
                   invariants and open Sprint 079
                   HEAD tests: Sprint 078 suite (1132 pass /
                   78 files / 5893 expect in SPRINT-078 notes).
                   Isolated HEAD worktree without node_modules
                   could not load MCP modules (4 import errors);
                   not a product regression.
bun test:          1160 pass across 79 files (6001 expect()
                   calls)
bun run typecheck: clean
git diff --check:  clean
live (isolated):   not performed (no live-provider dogfood this
                   slice; clocks are local sync metadata)
founder .combie:   combie.db mtime/size/hash unchanged
```

## Learnings

- `last_sync_at` was already last success. The missing clock was
  last attempt, not a per-Resource membership set.
- CURRENT can cite `Resource.updatedAt` without treating it as
  provider-native event time. The new Missing Context kind is
  the unknown-inventory claim; clocks alone are not deletion
  authority.
- WAL mode left committed rows in `combie.db-wal`. Hashing only
  `combie.db` made MCP "bytes unchanged" tests hash the same
  4 KiB header (`a209ba85…`) until a later connection
  checkpointed. `close()` now `PRAGMA wal_checkpoint(TRUNCATE)`.
- Snapshot JSON must not retain live provider clocks. Reopen
  still shows `observed by Combie at` from the retained
  Resource.updatedAt; provider attempt/success stay live-only.
- `listProviders` / `investigate` open the store read-only and
  never `init()`. A new providers column must SELECT as NULL
  when missing, or a pre-079 DB crashes on the first read
  before `sync`. Do not ALTER on MCP reads.

## Canon Changes

VISION, ARCHITECTURE, ROADMAP, SKILL, and `docs/public/MCP.md`
unchanged during implementation. AGENTS.md baseline becomes
Sprints 001–079 complete. CLI help records LAST SYNC vs LAST
ATTEMPT. Grouping Investigation snapshots as Incident members
remains unearned. Fifth-tool snapshot reopen /
`list_investigations` remains unearned. CLI `--json` remains
sequence item 2.
