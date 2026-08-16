# SPRINT-048 — Durable Investigation Snapshot

> **Status:** Active
> **Depends on:** SPRINT-047 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.6 Investigation object
> (smallest deterministic version); Sprint 047 leftover after an
> unearned Sentry deploy N+1
> **Roadmap:** `docs/internal/ROADMAP.md` v0.6 Investigation —
> **Investigation object only**, not the Investigation Engine
> **Type:** Narrow persistence primitive over already-composed
> investigation context
> **Primary goal:** Persist one local, offline, read-only
> **Investigation snapshot** of an existing `investigate` composition
> so a human can list and reopen *what Combie assembled at time T*
> without re-calling providers and without mutating the Engineering
> Graph.
> **Provider scope:** None. No new provider reads.
> **Generic Event / Correlation / Investigation Engine:** Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / hypotheses / confidence / telemetry:** None

---

# This Is a Layer Transition

Sprints 043–047 completed the v0.5 evidence and exact-shared-context
path:

```text
043  Sentry releases
044  Sentry issue aggregates
045  code_mapped_to
046  release commit SHA + shared-commit inside code_mapped_to
047  same-SHA deploy↔release correspondence through two proven edges
```

`docs/internal/ROADMAP.md` v0.5 Safe Semantic Boundary is now
implemented for the earned pairs. Sprint 047 leftover:

```text
SPRINT 048+      Sentry release-deploy N+1 only if later earned
                 then Investigation object (ROADMAP v0.6)
```

Sentry `/releases/{version}/deploys/` N+1 was **not** earned (043
default-defer; 047 Phase 2: SHA + two edges is the join). It is not
048.

This Sprint is **not** another evidence or correspondence slice.

It is the smallest step from “compose investigation live” into the
ROADMAP v0.6 **Investigation object**.

It is **not** the Investigation Engine, lifecycle, hypotheses,
confidence, summaries, notifications, or model reasoning listed later
in `docs/internal/ROADMAP.md` v0.6.

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` Sequencing Rules (smallest deterministic
version; is persistence necessary; do not start a generic engine):

```text
exact evidence
    ↓
deterministic composition   ← 043–047
    ↓
real product pressure
    ↓
earned abstraction          ← this Sprint: persist the composition
```

`docs/internal/ROADMAP.md` v0.6 Deterministic Investigation Foundation
already names the shipped primitives (Known Facts, Missing Context,
one-hop, dual chronologies, provider-native evidence, authority,
exact shared-commit, detailed evidence). Those remain the snapshot
contents. They must not be replaced by a reasoning engine.

ARCHITECTURE may eventually hold trigger, hypotheses, recommendation,
and status. **048 stores none of those.** Snapshot the composition
that `getInvestigationContext` already returns.

---

# Problem

`combie investigate <resource-id>` is ephemeral. Close the terminal
and the assembled context is gone. The store still has resources,
relationships, and evidence, but not *this* bounded, one-hop
assembly with its facts, missing context, and shared-commit
correspondence.

`docs/internal/ARCHITECTURE.md` says an Investigation is a first-class
durable object and “persists beyond the lifetime of the underlying
telemetry.” Live compose cannot satisfy that sentence.

Agents already have `investigate_resource` (live, read-only). Humans
have no way to pin a composition. 048 adds that pin — not a second
graph, not a causal story.

---

# Product Question

> After a successful offline `investigate` of an exact Resource, can
> Combie save a deterministic snapshot of that composition, list saved
> investigations, and reopen one later — with explicit snapshot time
> and without presenting the snapshot as current provider truth,
> mutating relationships, adding MCP tools, or introducing hypotheses?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.6** lists Investigation object first
   among capabilities to add when earned.
2. **Sprint 047 leftover** places Investigation object next once
   deploy N+1 is not earned. It is not earned.
3. **043–047** finished the authorized v0.5 shared-evidence sequence.
   Another join would be speculative (N+1, release↔issue, multi-hop).
4. **`docs/internal/ROADMAP.md` v0.5** still names Context Pack,
   budgeting, and task-aware retrieval — and also says *do not create
   a generic ContextPack abstraction before repeated task pressure
   proves the boundary.* Sprint 047 fact-budget pressure is **not**
   authorization to redesign `MAX_INVESTIGATION_FACTS` (this Sprint
   must not).
5. **`docs/internal/ROADMAP.md` Sequencing Rule 9:** persistence is
   necessary *for this claim* (“durable object”). Re-composing from
   live store later is a different, current-state investigate — not
   an Investigation object.

---

# Exact Capability

```text
combie investigate <resource-id> --save
        ↓
compose InvestigationContext (existing, unchanged)
        ↓
persist Investigation snapshot
  id, subjectResourceId, composedAt, snapshot
        ↓
combie investigations              list
combie investigation <id>          reopen snapshot as CLI text
```

Exact flag/command names may be the smallest that fit existing CLI
style. Phase 1 pins them. No new MCP tool.

The snapshot **is** the already-composed InvestigationContext (or a
deterministic serialization of it). Do not invent a ContextPack type
(`docs/internal/ROADMAP.md` v0.5).

---

# Evidence / Claim Semantics

### KNOWN (about the snapshot)

```text
Combie saved an investigation snapshot of <subjectResourceId>
composed at <composedAt> from local store state.
```

Reopen shows the **same** facts, missing context, relationships, and
shared-commit correspondence that investigate showed at save time.

### UNKNOWN / stale (required)

The snapshot is **retained composition**, not current provider
authority.

Reopen must say it is a snapshot from `composedAt`. It must not imply
releases, issues, mappings, or correspondences are still current.

Do not silently re-compose on open (that would erase the object).

### Forbidden

```text
This investigation concluded that deployment D caused release V
This snapshot is the current system state
Saving an investigation creates a Relationship
```

Correlation remains not causality. Snapshotting does not add claims
047 already forbade.

---

# Architecture

```text
getInvestigationContext()     unchanged live compose
        ↓
InvestigationRecord           new domain/store primitive
  id
  subjectResourceId
  composedAt                  Combie observation time of the snapshot
  snapshot                    deterministic serialization
        ↓
SQLite investigations table
        ↓
list / show CLI
```

Ownership:

- **Domain:** smallest `Investigation` / `InvestigationRecord` type.
  Not InvestigationEngine, not lifecycle state machine.
- **Store:** new table, upgrade-safe. Not mixed into Resources or
  Relationships.
- **App:** save / list / get. Compose stays in `investigate.ts`.
- **CLI:** save option + list + show.
- **MCP:** no new tool. `investigate_resource` stays live compose.

Adapters do not participate.

---

# Persistence vs Read-Time

| Live `investigate` | Saved investigation |
| --- | --- |
| Read-time compose from current store | Persisted snapshot |
| Changes when store changes | Frozen at `composedAt` |
| Current authority / missing context | Retained composition |

Saving must **not**:

- create or delete Relationships
- write Changes
- refresh providers
- update resources

Deleting a snapshot (if implemented) deletes only the row. Default:
list + show is enough; delete is optional if trivial, not a product
requirement.

---

# Boundedness

- One snapshot per `--save` invocation (not auto-save every
  investigate).
- Snapshot contents are the existing one-hop composition only.
- No extra hop at save time.
- No fact-budget change (`MAX_INVESTIGATION_FACTS` stays 5).
- Snapshot size is whatever investigate already assembled — do not
  add a second truncation layer unless Phase 2 proves SQLite cannot
  hold it (unexpected).

---

# Failure / Unknown Semantics

- Save of a missing resource id fails like live investigate.
- Corrupt / unreadable snapshot: error that says the row is untrusted;
  do not invent empty Known Facts.
- List of zero investigations is a truthful empty state, not missing
  context about the graph.
- Uninitialized store / no credentials: same as other read commands.

---

# Affected Surfaces

### CLI

- `investigate <id> --save` (or equivalent) prints live output **and**
  persists a snapshot, printing the new investigation id.
- `investigations` lists id, subject, composedAt.
- `investigation <id>` renders the snapshot with a snapshot banner
  (composedAt, subject). Prefer reusing `formatInvestigationContext`
  on the deserialized snapshot.

### MCP

Unchanged four tools. Agents keep calling `investigate_resource` for
**current** compose. 048 does not add `save_investigation` or
`list_investigations`.

### Graph / sync

Unchanged.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.6,
ARCHITECTURE Investigation section, this Sprint, and inspect:

- `src/app/investigate.ts` (`InvestigationContext`, format)
- `src/cli/index.ts` investigate command
- `src/storage/store.ts` upgrade patterns
- MCP tool list (must remain four)

Report:

1. Can the snapshot be a JSON serialization of `InvestigationContext`?
2. Stable investigation id scheme (do not use Resource id).
3. CLI shape with least new surface.
4. How reopen distinguishes snapshot vs live investigate.
5. Is InvestigationEngine earned? Expected: **no**.

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

Answer:

1. Persistence necessary? Expected: **yes** for the durable-object
   claim; re-compose is not an Investigation object.
2. Second source of truth? Snapshot must be labeled retained
   composition, never current graph authority.
3. Does ARCHITECTURE’s full Investigation yaml (trigger, hypotheses,
   recommendation, status) leak? **No — omit those fields.**
4. MCP tool needed? Expected: **no**.
5. Auto-save on every investigate? Expected: **no** (explicit save).
6. Canon change? Expected: AGENTS.md operational baseline only.

If snapshotting `InvestigationContext` requires a generic ContextPack
or Engine: **STOP**. Reduce to a smaller explicit field set (subject,
composedAt, formatted text + structured facts/missing/related ids)
rather than invent an engine.

---

# Tests

Red → Green → Refactor. No live credentials.

- `--save` persists one row; live output unchanged aside from the id
- list empty / one / many; deterministic order (`composedAt` DESC,
  stable id tie-break)
- reopen equals the formatted composition from save time
- after later sync mutates store, reopen is unchanged (not re-composed)
- snapshot banner present; no “current” wording
- save does not create Changes or Relationships
- pre-048 DB upgrade
- invalid id / uninitialized errors
- MCP still exactly four tools; investigate_resource still live
  compose; read-only DB regression

---

# Live Dogfood

Optional. Isolated `COMBIE_HOME` / `--dir`.

```text
investigate <sentry-or-github-id>
investigate <same-id> --save
investigations
investigation <id>
sync   # or other store mutation
investigation <id>   # must match the saved snapshot, not the new live compose
```

Never commit secrets or private names. Known-empty shared-commit
snapshots are valid.

---

# Explicit Non-Goals

Do **not** implement:

- InvestigationEngine, lifecycle (open/closed), trigger types
- hypotheses, confidence, findings, recommendations
- ContextPack type or fact-budget redesign
- Sentry release-deploy N+1
- new Relationship or multi-hop
- release↔issue causality
- generic Event / Correlation engine
- new MCP tools
- auto-save, background sync, webhooks
- Operational Memory (Incident / Decision / Outcome)
- learning, policy, execution
- hosted Combie

Do not scaffold these.

---

# What This Sprint Leaves for Later

```text
043–047   v0.5 evidence + exact shared-commit + correspondence     ✅
048       durable Investigation snapshot (smallest v0.6 object)    ← this
049+      investigation lifecycle / compare-to-current
          Context Pack / budgeting only if later earned
          Sentry deploy N+1 only if later earned
          hypotheses / confidence (ROADMAP v0.6, later)
          Operational Memory (ROADMAP v0.7)
```

---

# Product / Contract Freezes

- MCP: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource`
- Relationship kinds unchanged
- one-hop live investigate unchanged
- `MAX_INVESTIGATION_FACTS = 5` unchanged
- no generic Event abstraction
- VISION / ARCHITECTURE / ROADMAP / SKILL unchanged unless Phase 2
  finds a material conflict — report it; do not edit ROADMAP to
  justify a larger engine

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [ ] Sprint 048 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: Investigation snapshot persist + list + reopen
- [ ] if earned: snapshot vs live authority is explicit
- [ ] if earned: no graph mutation; MCP still four tools
- [ ] if not earned: rejection documented; do not invent an Engine
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged unless material semantics require an update

---

# Final Principle

> **`docs/internal/ROADMAP.md` v0.6 begins with an Investigation
> object, not an Investigation Engine. Sprint 048 may remember what
> Combie assembled. It must not decide what happened.**
