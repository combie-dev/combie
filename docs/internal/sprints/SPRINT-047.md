# SPRINT-047 — Same-SHA Release + Deployment through Two Proven Edges

> **Status:** Active
> **Depends on:** SPRINT-046 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.5 exact cross-provider
> shared evidence + Safe Semantic Boundary; Sprint 046 leftover
> “release↔deployment joins, if exact evidence exists”
> **Roadmap:** `docs/internal/ROADMAP.md` v0.5 Context Engine. Not v0.6
> Investigation Engine.
> **Type:** Narrow ephemeral composition slice (no new Relationship)
> **Primary goal:** When one InvestigationContext already holds **both**
> a `source_for` shared-commit group and a `code_mapped_to` shared-commit
> group for the **same exact Git commit SHA**, surface that the Vercel
> deployment records and Sentry release records reference that commit
> through two already-proven relationships that share a GitHub
> repository.
> **Provider scope:** No new provider reads. Reuse persisted Vercel
> `gitCommitSha`, Sentry `gitCommitSha`, and existing one-hop evidence.
> **Generic Event / Correlation engine:** Not assumed
> **New Relationship kinds:** None — including no Vercel↔Sentry edge
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / causality / telemetry:** None
> **Multi-hop traversal:** Forbidden

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` v0.5 Safe Semantic Boundary remains the
ceiling:

> These provider evidence records reference the same exact Git commit
> within an already-proven resource relationship.

Sprint 035 said that for `source_for` (workflow + Vercel deployment).
Sprint 046 said that for `code_mapped_to` (workflow + Sentry release).
Sprint 046 forbade merging those two kinds into one group and deferred:

```text
SPRINT 047+  release↔deployment joins, if exact evidence exists
```

The exact evidence now exists: both sides persist a canonical full Git
commit SHA, and both relationships can already sit on the same GitHub
repository as one-hop neighbors. No new provider field is required.

This Sprint does **not** create `vercel ↔ sentry`. Sprint 007 rejected
that pair without control-plane identity (DSN/env is Class D). Sprint
043 forbade a Vercel↔Sentry Relationship. `docs/internal/ROADMAP.md`
early-product exclusions still reject speculative relationship types.

It is **not** `docs/internal/ROADMAP.md` v0.6 (durable Investigation
object, hypotheses, confidence, managed model reasoning).

---

# Goal

After Sprint 046:

```text
source_for shared-commit        ✅  workflow + Vercel deploy
code_mapped_to shared-commit    ✅  workflow + Sentry release
same SHA on both edges          ⬜  release↔deploy presentation  ← this Sprint
Sentry release-deploy N+1       ⬜  still later
Vercel↔Sentry Relationship      ❌  not earned
Investigation object            ⬜  ROADMAP v0.6
```

Target vertical slice:

```text
InvestigationContext (already one-hop)
        │
        ├── source_for group     (SHA S, deployments)
        └── code_mapped_to group (SHA S, releases)
                    ↓
        ephemeral same-SHA correspondence
        (two proven relationship ids + one commit SHA)
                    ↓
        SHARED COMMIT CONTEXT + MCP parity
```

Reuse `composeSharedCommitContext()`. Do not fork a CorrelationEngine.
Do not collapse the two groups into one mixed-kind group (Sprint 046
lock).

> **Show that two proven edges already name the same commit. Do not
> invent a third edge.**

---

# Product Question

> When a GitHub repository is `source_for` a Vercel project and
> `code_mapped_to` a Sentry project, and a Vercel deployment and a
> Sentry release both carry the same canonical full Git commit SHA, can
> Combie truthfully say those deployment and release records reference
> that commit through those two already-proven relationships — offline,
> in CLI and MCP, without claiming the deployment produced the release
> or that either caused an issue?

---

# Why This Is the Next Roadmap Slice

1. **`docs/internal/ROADMAP.md` v0.5** requires exact cross-provider
   shared evidence and forbids silent causal upgrades.
2. **`docs/internal/ROADMAP.md` v0.2** already lists Git commit SHA as
   identity evidence; 034/046 persist that SHA on deploys and releases.
3. **Sprint 046 leftover** names release↔deployment joins next, *if
   exact evidence exists*. The exact evidence is the two SHAs plus the
   two proven edges. Not version strings. Not Sentry deploy N+1.
4. **Sprint 007 / 043** reject a Vercel↔Sentry Relationship without
   provider-native project identity. 047 must not reopen that.
5. **Investigation remains one-hop.** The GitHub repository is the only
   subject that naturally has **both** neighbors in scope. 047 must not
   walk a second hop from Vercel to Sentry or Sentry to Vercel.
6. **`docs/internal/ROADMAP.md` v0.6** still owns the Investigation
   object. 046 leftover lists it *after* this join.

Live dogfood (045/046): this org has **0** `code_mapped_to` and null
release SHAs. A populated correspondence is fixture-first. Known-empty
live is success. Do not create mappings or rewrite releases to force
the path.

---

# Governing Boundaries

Preserve:

- six providers; current Resource kinds
- three Relationship kinds only
- one-hop investigation
- `source_for` and `code_mapped_to` shared-commit groups unchanged
  (still one kind per group)
- Sentry issue envelope unchanged
- four read-only MCP tools
- no invented relationships

Sprint 047 may:

- add an ephemeral same-SHA correspondence over two already-built
  `GitCommitEvidenceGroup`s
- render it in SHARED COMMIT CONTEXT
- add a budget-fill Known Fact using ROADMAP wording that names **both**
  proven relationship ids
- add Missing Context when one edge’s group exists and the other does
  not, without scolding the user to connect a provider

It must not:

- add `uses_release_in`, `deployed_as`, or any Vercel↔Sentry kind
- merge kinds inside `GitCommitEvidenceGroup`
- globally match SHA without both groups present in this context
- query Sentry `/releases/{version}/deploys/`
- expand MCP tools

---

# Baseline

```text
HEAD:          a3237370609e0db3a5d2d7f336da5b942076347e
               (feat 4494569 + docs/beta dogfood)
tests:         821 pass across 74 files (record actual count at start)
typecheck:     clean
MCP:           exactly four read-only tools
Sprint 046:    Complete
Sprint 047:    not started (this record activates it)
live dogfood:  known-empty mappings; release SHAs null; 0 groups
```

Verify repository state before coding. **STOP** if the worktree has
unrelated changes.

Already shipped:

```text
VercelDeploymentEvidence.gitCommitSha
SentryReleaseEvidence.gitCommitSha
composeSharedCommitContext()
  source_for     → workflows + deployments
  code_mapped_to → workflows + releases
  kinds never merge
```

---

# Claim Classes

### KNOWN

Allowed when both groups for SHA S exist in this context:

```text
These provider evidence records reference the same exact Git commit
within already-proven source_for and code_mapped_to relationships.
```

Name the two relationship ids. This is still the
`docs/internal/ROADMAP.md` v0.5 sentence (two proven relationships, one
SHA). It is **not** a Vercel↔Sentry Relationship.

### CORRELATED

Temporal proximity or version resemblance without exact SHA + both
edges.

**This Sprint must not emit CORRELATED claims.**

### UNKNOWN

```text
A source_for shared-commit group exists for SHA S, but this context
has no code_mapped_to group for that SHA.

A code_mapped_to shared-commit group exists for SHA S, but this
context has no source_for group for that SHA.

No one-hop Vercel↔Sentry relationship exists; Sentry release evidence
is outside this Vercel subject's one-hop scope.
```

Do not phrase the last item as “connect Sentry.”

### Forbidden

```text
Vercel deployment D is Sentry release V
Deployment D produced release V
Release V deployed production
Release V caused issue I
These records are correlated because they happened near each other
code_mapped_to + source_for implies one application
```

---

# Exact Deterministic Evidence

A correspondence exists only when **all** of:

1. InvestigationContext contains a `source_for` shared-commit group
   with `commitSha === S` and at least one deployment member
2. The same context contains a `code_mapped_to` shared-commit group
   with `commitSha === S` and at least one release member
3. Both groups share the same GitHub `sourceResourceId`
4. S is a canonical full SHA (already guaranteed by the composer)

No new identifiers. No Sentry deploy list. No version/tag match.

If the subject is a Vercel project, Sentry is two hops away — condition
2 will fail. That is correct one-hop behavior, not a bug to fix with
multi-hop.

---

# Composition Semantics

Add a sibling ephemeral type, conceptually:

```text
SharedCommitCorrespondence
  commitSha
  sourceForRelationshipId
  codeMappedToRelationshipId
  githubRepositoryId
```

Derived only from groups `composeSharedCommitContext()` already
returned. One correspondence per SHA (collapse if multiple groups of
the same kind share SHA — should not happen under current identity).

Do **not**:

- store correspondences
- add a Relationship row
- put deployments onto a `code_mapped_to` group
- put releases onto a `source_for` group

---

# Persistence

None. Read-time only, like Sprint 035/046 groups.

---

# Offline / CLI / Investigation

### SHARED COMMIT CONTEXT

Keep existing per-kind groups.

When a correspondence exists, add a short ROADMAP-worded note that
names both relationship ids and the SHA. Do not add CORRELATIONS or
RELEASE↔DEPLOY sections.

### Known Facts / Missing Context

Known Fact only if a correspondence exists and it fits
`MAX_INVESTIGATION_FACTS` without displacing authority facts. Append
last (same budget rule as 046).

Missing Context:

- one group present, the other absent, in a context that has both
  relationship kinds but no shared SHA
- Vercel (or Sentry) subject with a group, noting the other family is
  out of one-hop scope — not a prompt to add a provider
- existing `no_deterministic_release_issue_linkage` **unchanged**

### Provider activity / timeline

Unchanged. No new family.

---

# MCP Parity

Exactly four tools. Extend the existing `sharedCommitContext` payload
with an additive correspondences array only if required. Default:
smallest additive field on the existing shared-commit structure. No new
tools. Read-only DB regression.

---

# Phase 1 — Repository Understanding

Read `skills/build-combie/SKILL.md`, `docs/internal/ROADMAP.md` v0.5,
this Sprint, Sprint 046 completion notes, and inspect:

- `src/app/shared-commit-context.ts`
- `src/app/investigate.ts` SHARED COMMIT CONTEXT
- which subjects actually load both deploy and release neighbor evidence
- MCP `investigate_resource` shared-commit payload

Report:

1. Does a GitHub-repository investigation already include Vercel
   deployments and Sentry releases on one-hop neighbors?
2. Can correspondence be a pure function of existing groups?
3. What Vercel-subject / Sentry-subject Missing Context is truthful
   without multi-hop?
4. Is a generic Correlation engine earned? Expected: no.

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure

No new Sentry/Vercel endpoints are assumed.

Answer:

1. Is any provider-native Vercel↔Sentry project id available without
   DSN/env? Expected: **no** (Sprint 007).
2. Does Sentry release-deploy N+1 add a deterministic Vercel
   deployment id? Default: **do not call it**. SHA + two proven edges
   is the earned join. If Phase 2 finds a compact, secret-safe deploy
   id that exact-matches `vercel` deployment uid, record it and
   **stop** — that would be a different slice.
3. Does one-hop prevent the correspondence except on the GitHub hub?
   Expected: **yes**. Document; do not walk a second hop.
4. Canon change? Expected: no, except AGENTS.md after implementation.

If Phase 2 finds the correspondence cannot be built from evidence
already in InvestigationContext without multi-hop or a new
Relationship: **STOP**. Do not invent a join.

---

# Tests

Red → Green → Refactor. No live credentials.

- GitHub subject + both edges + same SHA → one correspondence
- same SHA globally but missing one edge → no correspondence
- kinds remain unmerged in `GitCommitEvidenceGroup`
- `source_for` / `code_mapped_to` group regression
- Vercel subject: no correspondence; truthful one-hop Missing Context
- Sentry subject: same
- no causality vocabulary
- `no_deterministic_release_issue_linkage` unchanged
- MCP parity; four tools; read-only DB

---

# Live Dogfood

Optional when GitHub, Vercel, and Sentry are authorized.

045/046 org: 0 `code_mapped_to`, null release SHAs. Treat empty
correspondence as success. Do not create mappings or commits.

If a real hub exists (repo with both edges and matching SHAs), confirm
ROADMAP wording and no Vercel↔Sentry Relationship row.

---

# Explicitly Out of Scope

- new Relationship kind (including Vercel↔Sentry)
- multi-hop traversal
- Sentry `/releases/{version}/deploys/` N+1
- merging kinds inside `GitCommitEvidenceGroup`
- release↔issue joins
- shared-commit on issues
- durable shared-commit / correspondence tables
- CORRELATED claims
- version/tag heuristics
- Class D events, stacks, traces, metrics, logs
- generic Event / Correlation / Graph engine
- durable Investigation object (`docs/internal/ROADMAP.md` v0.6)
- hypotheses, confidence, AI
- new MCP tools, providers, webhooks, execution

---

# What This Sprint Leaves for Later

```text
SPRINT 043–046   Sentry evidence + code_mapped_to + SHA groups     ✅
SPRINT 047       same-SHA deploy + release via two proven edges    ← this
SPRINT 048+      Sentry release-deploy N+1 only if later earned
                 then Investigation object (ROADMAP v0.6)
                 then hypotheses / confidence
```

---

# Product / Contract Freezes

- four MCP tools, local, offline, read-only
- Resource kinds unchanged
- Relationship kinds unchanged
- one-hop investigation unchanged
- issue envelope unchanged
- no generic Event abstraction

Do not edit `docs/internal/ROADMAP.md` unless Phase 2 finds a material
conflict — report it.

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

---

# Definition of Done

- [ ] Sprint 047 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: ephemeral same-SHA correspondence from existing groups
- [ ] if earned: CLI + MCP presentation inside SHARED COMMIT CONTEXT
- [ ] if earned: claim classes respected; no Vercel↔Sentry edge
- [ ] if not earned: rejection documented; no multi-hop workaround
- [ ] existing shared-commit groups unchanged
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged unless material semantics require an update

---

# Final Principle

> **`docs/internal/ROADMAP.md` v0.5 allows Combie to say two records
> share an exact Git commit inside proven relationships. Sprint 047 may
> say a deployment and a release share a commit through `source_for`
> and `code_mapped_to`. It must not say they are the same event, or
> that either caused the other.**
