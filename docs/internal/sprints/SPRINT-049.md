# SPRINT-049 — Compare Saved Investigation to Current

> **Status:** Active
> **Depends on:** SPRINT-048 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.6 Investigation
> (smallest leftover after the Investigation object); Sprint 048 leftover
> “investigation lifecycle / compare-to-current”
> **Roadmap:** `docs/internal/ROADMAP.md` v0.6 Investigation —
> **compare-to-current only**, not Investigation lifecycle state,
> not the Investigation Engine, not Operational Memory
> **Type:** Narrow read-time comparison over an existing snapshot and
> the existing live `investigate` compose
> **Primary goal:** Given one saved Investigation snapshot, compose the
> current one-hop investigation of the **same subject** from the local
> store and report a bounded, deterministic comparison — without
> mutating the snapshot, without presenting either side as the other,
> and without introducing Incident / Decision / Action / Outcome.
> **Provider scope:** None. No new provider reads.
> **Generic Event / Correlation / Investigation Engine:** Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / hypotheses / confidence / telemetry:** None

---

# This Is Not a Layer Transition

Sprints 043–047 completed the earned v0.5 evidence and exact-shared-context
path. Sprint 048 started `docs/internal/ROADMAP.md` v0.6 Investigation
with the smallest durable Investigation object (explicit snapshot,
list, reopen).

Sprint 048 leftover:

```text
049+      investigation lifecycle / compare-to-current
          Context Pack / budgeting only if later earned
          Sentry deploy N+1 only if later earned
          hypotheses / confidence (ROADMAP v0.6, later)
          Operational Memory (ROADMAP v0.7)
```

This Sprint is **not** v0.5 Context Engine work.

This Sprint is **not** `docs/internal/ROADMAP.md` v0.7 Operational
Memory (Incident, Recommendation, Decision, Action, Outcome).

This Sprint is **not** the rest of v0.6 (Investigation Engine,
persisted open/closed status, hypotheses, confidence, summaries,
notifications, model reasoning).

It is the smallest deterministic version of 048's leftover line:
make the snapshot-versus-current distinction **operational**.

Persisted Investigation lifecycle (`status: open | closed`, trigger
types) remains later. 048 omitted those ARCHITECTURE fields on
purpose. A status enum without compare would label the object without
new evidence semantics. Compare does not require that enum.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Sequencing Rules (smallest deterministic
version; is persistence necessary; do not start a generic engine):

```text
exact evidence
    ↓
deterministic composition          ← 043–047
    ↓
persist the composition            ← 048
    ↓
compare composition to current     ← this Sprint
    ↓
earned abstraction                 ← not this Sprint
```

`docs/internal/ROADMAP.md` v0.6 Deterministic Investigation Foundation
already names the shipped primitives. Compare them. Do not replace
them with a reasoning engine.

048 proved persistence is necessary for the durable-object claim.
049's comparison is a **read-time query**. Sequencing Rule 9: do not
persist the comparison unless Phase 2 proves a durable compare object
is required. Expected: **it is not**.

---

# Problem

Sprint 048 can pin *what Combie assembled at time T* and reopen it as
retained composition. The reopen banner says the snapshot is not
current provider truth.

A human still cannot ask Combie the next deterministic question:

> Relative to this saved snapshot, what is different in a live
> one-hop compose of the same subject from the local store now?

Today that requires running `investigate <subject>` by hand and
visually diffing two CLI dumps. That is not a provenance-preserving
comparison. It also invites collapsing retained composition into
current authority.

`docs/internal/ROADMAP.md` v0.6 Investigation Flow already places
Historical Memory next to current evidence. 048 stored the historical
composition. 049 reports how it differs from current compose — and
stops there.

---

# Product Question

> After saving an offline `investigate` snapshot of an exact Resource,
> can Combie compose the current one-hop investigation of that same
> subject from the local store and report a bounded, deterministic
> comparison — with snapshot time and live-compose authority kept
> distinct, without mutating the snapshot or the graph, without adding
> MCP tools, and without introducing hypotheses, lifecycle status, or
> Operational Memory objects?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.6** already began at 048 with
   Investigation object. The next leftover is compare-to-current, not
   a new layer.
2. **Sprint 048 leftover** names `investigation lifecycle /
   compare-to-current` as 049+. Compare is the smallest deterministic
   version of that line. Persisted lifecycle status is larger and
   unearned.
3. **v0.5 is sufficiently complete for the earned path** (043–047 Safe
   Semantic Boundary; 048 said so). That does **not** authorize a jump
   to Operational Memory. Current Canon numbers Operational Memory as
   **v0.7**. Older sprint text that called it “v0.6 Operational
   Memory” is superseded by `docs/internal/ROADMAP.md`.
4. **`docs/internal/ROADMAP.md` Sequencing Rule 9:** persistence is
   not necessary for this claim. Re-composing live and comparing to
   the frozen snapshot is the claim. Do not write a second snapshot
   or a compare row by default.
5. **Context Pack / fact-budget / Sentry deploy N+1 / hypotheses**
   remain “later if earned.” 047 fact-budget pressure still does not
   authorize redesigning `MAX_INVESTIGATION_FACTS`.
6. **Closed-beta / dogfood** exercised live investigate and Missing
   Context; they did not earn Incident linking, recommendations, or
   model-generated hypotheses. Herdr notes that mention “previous
   investigations” are launch-design language, not authorization to
   start v0.7.

---

# Exact Capability

```text
combie investigation <id> --compare
        ↓
load Investigation snapshot (048, unchanged)
        ↓
compose InvestigationContext for snapshot.subjectResourceId
  (existing getInvestigationContext, unchanged)
        ↓
emit InvestigationCompare (ephemeral, not stored)
  snapshot identity + composedAt
  current compose time (Combie observation of the compare)
  bounded SAME / SNAPSHOT ONLY / CURRENT ONLY / AUTHORITY CLOCK
        ↓
snapshot row unchanged
graph unchanged
```

Exact flag/command names may be the smallest that fit existing CLI
style. Phase 1 pins them. Default shape: a flag on
`investigation <id>`, not a new top-level command and not a new MCP
tool.

The comparison input is two `InvestigationContext` values (saved
snapshot vs live compose), plus the snapshot metadata 048 already
stores (`id`, `subjectResourceId`, `composedAt`).

Do not invent a ContextPack type (`docs/internal/ROADMAP.md` v0.5).
Do not invent a generic DiffEngine.

---

# Evidence / Claim Semantics

### KNOWN (about the comparison)

```text
Combie compared investigation snapshot <id>
composed at <composedAt> (retained composition)
with a live one-hop compose of <subjectResourceId>
from local store state at <comparedAt>.
```

Compared sections that are identical may be stated as unchanged.
Compared sections that differ may be stated as present in the
snapshot only, present in current only, or changed in identity.

### UNKNOWN / stale (required)

The snapshot remains **retained composition**, not current provider
authority.

The live compose remains **current local-store compose**, not a
proof that providers still agree, and not a proof that the
engineering system “changed” in the world.

If the subject Resource is missing from the current store, current
compose is **unavailable**. Report that. Do not invent an empty
investigation. Do not delete or rewrite the snapshot.

Authority/freshness clocks (`lastSuccessfulObservedAt`,
`refreshObservedAt`, result counts) must not be collapsed into
structural identity. A clock-only difference is not a claim that
resources, relationships, or evidence identities changed.

### Forbidden

```text
This investigation concluded that deployment D caused release V
The snapshot is now current provider truth
Current compose replaces the snapshot
The engineering system changed because observation clocks moved
Saving or comparing an investigation creates a Relationship
This comparison is an Incident / Decision / Outcome
```

Correlation remains not causality. Compare does not add claims 047
and 048 already forbade.

---

# Architecture

```text
getSavedInvestigation(id)          048, unchanged
        ↓
getInvestigationContext(subject)   live compose, unchanged
        ↓
InvestigationCompare               new ephemeral app result
  snapshotId
  subjectResourceId
  snapshotComposedAt
  comparedAt
  currentStatus                    available | subject_missing
  sections                         bounded, ordered
        ↓
CLI formatter
```

Ownership:

- **Domain:** no new durable Engineering Model object. Do not add
  Incident, Decision, Action, Outcome, Hypothesis, or persisted
  Investigation status. `InvestigationRecord` stays 048's snapshot
  identity (`id`, `subjectResourceId`, `composedAt`).
- **App:** compare / format. Compose stays in `investigate.ts`.
  Snapshot load stays in `investigations.ts`.
- **Store:** no new table expected. No snapshot rewrite on compare.
- **CLI:** compare flag on `investigation <id>`.
- **MCP:** no new tool. `investigate_resource` stays live compose.

Adapters do not participate.

---

# Persistence vs Read-Time

| Saved investigation | Compare | Live `investigate` |
| --- | --- | --- |
| Persisted snapshot | Ephemeral read | Read-time compose |
| Frozen at `composedAt` | Does not write | Changes when store changes |
| Retained composition | Labels both sides | Current local authority |

Comparing must **not**:

- update the snapshot JSON
- change `composedAt`
- insert a new investigation row
- create or delete Relationships
- write Changes
- refresh providers
- update resources
- auto-save the current compose

Deleting a snapshot remains out of scope unless already trivial from
048 (it was optional then; it is not required now).

---

# Historical / Current-Truth Semantics

Two clocks stay visible:

```text
snapshotComposedAt   when Combie assembled and saved the snapshot
comparedAt           when Combie ran this compare (Combie observation)
```

`comparedAt` is not provider-native event time and is not persisted.

Reopen without `--compare` remains 048 behavior: snapshot banner, no
live compose.

Compare must not merge the two compositions into one “current
investigation.” Full current detail remains `investigate <subject>`.
Full snapshot detail remains `investigation <id>`.

---

# Retrieval Behavior

Unchanged from 048 except for the compare read:

- `investigations` lists saved snapshots
- `investigation <id>` reopens the snapshot
- `investigation <id> --compare` loads that snapshot and live-composes
  its subject

This Sprint does **not** add:

- list-by-subject as a product requirement (048 already prints
  SUBJECT; Phase 1 may add a trivial filter only if CLI selection is
  otherwise blocked)
- similarity search
- “has this happened before?”
- incident linking
- retrieval of other snapshots as precedents

Historical investigation retrieval in the Operational Memory sense
(similar incidents, prior decisions) is v0.7.

---

# Boundedness

Compare **sections**, in this order, using already-composed
structure — not a full JSON dump and not a formatted-text diff:

1. **SUBJECT** — Resource id must match. Report name / kind /
   provider identity drift. If the subject id is absent from the
   current store: stop further structural sections; `currentStatus =
   subject_missing`.
2. **RELATIONSHIPS** — one-hop relationship identity
   (`id`, `kind`, source id, target id). Added / removed / unchanged.
3. **RELATED RESOURCES** — neighbor Resource ids present, dangling,
   or newly present.
4. **KNOWN FACTS** — `composeInvestigationFacts` on each context.
   Compare by fact `kind` plus the stable identity fields that kind
   already carries (relationship id, commit SHA, activity family,
   native ids). Do not rank which difference “matters more.”
5. **MISSING CONTEXT** — `composeMissingContext` on each context.
   Compare by item `kind` plus scope identity.
6. **SHARED COMMIT CONTEXT** — groups by exact commit SHA.
7. **SHARED COMMIT CORRESPONDENCE** — correspondences by exact SHA.
8. **AUTHORITY CLOCKS** — separate section for refresh /
   last-success observation times and result counts on otherwise
   matching evidence families. Clock-only drift stays here.

Do **not** dump full deployment / release / issue / workflow lists
as the comparison body. Identity sets (native ids already held on
the context) may appear when they differ. Full evidence remains on
the existing live and snapshot commands.

Each side's Known Facts remain independently bounded by
`MAX_INVESTIGATION_FACTS = 5`. A fact present on one side and absent
on the other is a comparison observation. It is **not** authorization
to raise the budget. Facts truncated by the existing budget are not
secretly compared via a back door.

No extra hop. No provider calls. No second truncation layer.

---

# Failure / Unknown Semantics

- Missing / untrusted snapshot: same errors as 048 reopen.
- Subject missing from current store: compare succeeds as a report
  (`currentStatus = subject_missing`), exit code remains a normal
  successful report unless Phase 1 finds an existing CLI pattern that
  already uses non-zero for “resource not found” on live investigate.
  If live investigate's not-found is non-zero, Phase 1 must choose
  one consistent rule and test it. The snapshot must still be
  identifiable in the output.
- Uninitialized store / no credentials: same as other read commands.
- Empty difference: truthful “compared sections match” plus any
  authority-clock section. Do not invent Missing Context about the
  graph from a match.

---

# Affected Surfaces

### CLI

- `investigation <id> --compare` (or the smallest equivalent) prints
  the comparison, not a second full investigation dump.
- Help lists the flag next to existing Investigate options /
  examples.
- `investigation <id>` without the flag remains 048 reopen.
- `investigate --save` remains 048 save.

### MCP

Unchanged four tools. Agents keep calling `investigate_resource` for
**current** compose. 049 does not add `compare_investigation`,
`save_investigation`, or `list_investigations`.

### Graph / sync

Unchanged.

### Learning

None. Compare does not score, rank, or remember outcomes. Do not
write an experience record.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.6
and v0.7, ARCHITECTURE Investigation / Decision / Action / Outcome
sections, this Sprint, and inspect:

- `src/app/investigations.ts` (save / list / get / format)
- `src/app/investigate.ts` (`InvestigationContext`,
  `getInvestigationContext`)
- `src/app/investigation-facts.ts` / `src/app/missing-context.ts` /
  `src/app/shared-commit-context.ts`
- `src/cli/index.ts` investigation command
- MCP tool list (must remain four)

Report:

1. Can compare be a pure function of two `InvestigationContext`
   values plus snapshot metadata?
2. Stable identity keys per section (no hidden significance score).
3. CLI shape with least new surface.
4. How compare distinguishes snapshot vs current vs clock-only.
5. Subject-missing behavior vs live `RESOURCE_NOT_FOUND`.
6. Is InvestigationEngine earned? Expected: **no**.
7. Is persisted lifecycle status earned? Expected: **no**.
8. Is Operational Memory earned? Expected: **no**.

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **no** for the compare claim.
2. Second source of truth? Compare must label retained composition
   vs current compose; never merge them.
3. Does ARCHITECTURE’s full Investigation yaml (trigger, hypotheses,
   recommendation, status) leak? **No — omit those fields.**
4. Do Incident / Decision / Action / Outcome leak? **No.**
5. MCP tool needed? Expected: **no**.
6. Auto-save current compose on compare? Expected: **no**.
7. Fact-budget redesign because differences can be truncated?
   Expected: **no**.
8. Canon change? Expected: AGENTS.md operational baseline only.

If comparison requires a generic ContextPack, DiffEngine, Correlation
engine, or InvestigationEngine: **STOP**. Reduce to an explicit
section list over existing compose outputs.

---

# Tests

Red → Green → Refactor. No live credentials.

- compare of a just-saved snapshot against an unchanged store:
  structural sections match
- after a later store mutation (resource rename, new/removed
  relationship, new evidence identity), compare reports the affected
  section and leaves the snapshot reopen unchanged
- authority-clock-only change does not appear as a relationship /
  resource / SHA identity change
- subject deleted from store: `currentStatus = subject_missing`;
  snapshot row still loads; no graph rewrite
- compare does not insert investigations, Changes, or Relationships
- reopen without `--compare` remains 048 output
- invalid id / uninitialized errors
- MCP still exactly four tools; `investigate_resource` still live
  compose; read-only DB regression

---

# Live Dogfood

Optional. Isolated `COMBIE_HOME` / `--dir`. Never commit secrets or
private resource names.

```text
investigate <id> --save
investigation <inv-id>
investigation <inv-id> --compare    # match on unchanged store
# mutate local store (rename is enough; sync if already connected)
investigation <inv-id> --compare    # reports the mutation
investigation <inv-id>              # still the original snapshot
investigate <id>                    # live compose reflects the mutation
```

Known-empty snapshots are valid. Do not force shared-commit evidence.

---

# Explicit Non-Goals

Do **not** implement:

- InvestigationEngine
- persisted Investigation lifecycle (`open` / `closed` / `completed`,
  trigger types)
- hypotheses, confidence, findings, recommendations, summaries
- Incident, Decision, Action, or Outcome models
- incident linking, similarity search, memory summaries
- ContextPack type or fact-budget redesign
- Sentry release-deploy N+1
- new Relationship or multi-hop
- release↔issue causality
- generic Event / Correlation / Diff engine
- new MCP tools
- auto-save, background sync, webhooks
- persisting the comparison as a row or as snapshot mutation
- learning, policy, execution
- hosted Combie
- model reasoning

Do not scaffold these.

Do not collapse Investigation, Incident, Decision, Action, and
Outcome into one generic memory object.
`docs/internal/ARCHITECTURE.md` and `docs/internal/ROADMAP.md` v0.7
keep them distinct. This Sprint does not start v0.7.

---

# What This Sprint Leaves for Later

```text
043–047   v0.5 evidence + exact shared-commit + correspondence     ✅
048       durable Investigation snapshot (smallest v0.6 object)    ✅
049       compare saved snapshot to current compose                ← this
050+      persisted Investigation lifecycle (open/closed) only if earned
          Context Pack / budgeting only if later earned
          Sentry deploy N+1 only if later earned
          hypotheses / confidence / summaries (ROADMAP v0.6, later)
          Operational Memory (ROADMAP v0.7)
            Incident ≠ Investigation ≠ Decision ≠ Action ≠ Outcome
```

---

# Product / Contract Freezes

- MCP: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource`
- Relationship kinds unchanged
- one-hop live investigate unchanged
- 048 snapshot schema and reopen semantics unchanged
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- no generic Event abstraction
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP to
  justify Operational Memory or an Engine

---

# Migration / Upgrade

No database migration is expected.

Pre-049 DBs already have `investigations` from 048. Compare is
read-time. Missing table remains 048 empty-list behavior.

If implementation is tempted to add `comparedAt` or `status` columns:
**STOP**. Those are not required for this Sprint.

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [ ] Sprint 049 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: compare saved snapshot to live compose of the same
      subject
- [ ] if earned: snapshot vs current vs authority-clock claims stay
      distinct; snapshot is not rewritten
- [ ] if earned: no Incident / Decision / Action / Outcome; no
      persisted lifecycle status; MCP still four tools
- [ ] if not earned: rejection documented; do not invent an Engine or
      start Operational Memory
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged unless material semantics require an update

---

# Final Principle

> **`docs/internal/ROADMAP.md` v0.6 continues with compare-to-current
> before Operational Memory. Sprint 049 may show how a saved
> composition differs from a live compose. It must not decide what
> happened, record what people did, or treat the snapshot as current
> truth.**
