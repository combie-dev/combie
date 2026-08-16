# SPRINT-046 — Sentry Release Commit Identity + Shared-Commit inside `code_mapped_to`

> **Status:** Active
> **Depends on:** SPRINT-045 (complete)
> **Authorized by:** `docs/internal/ROADMAP.md` v0.5 exact cross-provider
> shared evidence + Safe Semantic Boundary; Sprint 045 leftover earned-join
> slice; Sprint 035 shared-commit architecture
> **Roadmap:** `docs/internal/ROADMAP.md` v0.5 Context Engine (exact
> shared evidence). Not v0.6 Investigation Engine.
> **Type:** Narrow identifier + ephemeral composition vertical slice
> **Primary goal:** Persist a compact Sentry release **Git commit SHA**
> when the provider supplies one, then reuse the existing ephemeral
> shared-commit composer so GitHub workflow-run evidence and Sentry
> release evidence that share that exact SHA can be grouped **only
> inside an already-proven `code_mapped_to` relationship**.
> **Provider scope:** Sentry release normalization + existing GitHub
> workflow-run SHAs. No new providers.
> **Generic Event / Correlation engine:** Not assumed
> **New Relationship kinds:** None
> **MCP contract:** Frozen at exactly four local read-only tools
> **AI / causality / telemetry:** None

---

# Product Development Principle

> **Roadmap determines direction. Evidence determines how aggressively we
> move and whether we adjust the direction.**

`docs/internal/ROADMAP.md` v0.5 is the Context Engine. Its Safe Semantic
Boundary is the ceiling for this Sprint:

> These provider evidence records reference the same exact Git commit
> within an already-proven resource relationship.

It must not silently upgrade that into:

> This workflow caused this deployment.

Sprint 035 already implemented that sentence for `source_for`
(GitHub workflow run ↔ Vercel deployment). Sprint 045 proved
`code_mapped_to` (GitHub repository → Sentry project) but deliberately
did not persist release commit identifiers.

This Sprint is the next bounded v0.5 step: give Sentry releases a
joinable commit identity, then reuse the existing composer inside
`code_mapped_to`.

It is **not** ROADMAP v0.6 (durable Investigation object, hypotheses,
confidence, managed model reasoning). Sprint 044's older directional
label that numbered “046 = Durable Investigation object” is superseded
by Sprint 045's leftover sequence and by `docs/internal/ROADMAP.md`
v0.6, which still owns that work.

---

# Goal

After Sprint 045:

```text
What shipped?              ✅  Sentry releases
What broke?                ✅  Sentry issue aggregates
How is repo connected?     ✅  code_mapped_to (when mappings exist)
What commit shipped?       ⬜  release commit SHA     ← this Sprint
Shared commit in that edge ⬜  ephemeral grouping     ← this Sprint
What is deployed?          ⬜  release↔deployment     ← later
```

Target vertical slice:

```text
Sentry release list item
        ↓
Phase 2 pins a compact full Git commit SHA field
        ↓
SentryReleaseEvidence.gitCommitSha?
        ↓
SQLite nullable column + allowlist projection
        ↓
already-proven code_mapped_to
        │
        ├── GitHub workflow-run headSha
        └── Sentry release gitCommitSha
                    ↓
        composeSharedCommitContext()  (extend, do not fork)
                    ↓
        GitCommitEvidenceGroup (relationshipKind: code_mapped_to)
                    ↓
        SHARED COMMIT CONTEXT + MCP parity
```

Reuse `src/app/shared-commit-context.ts`. Do not create a second
correlation system.

> **Add a joinable identifier and one reused grouping. Do not add a
> stronger story.**

---

# Product Question

> After connecting GitHub and Sentry and syncing both, when a Sentry
> release carries a provider-native full Git commit SHA and a
> `code_mapped_to` edge already exists, can Combie truthfully say those
> workflow-run and release records reference the same exact Git commit
> inside that proven relationship — offline, in CLI and MCP, without
> claiming the workflow produced the release or that the release caused
> any issue?

---

# Why This Is the Next Roadmap Slice

Authorization is `docs/internal/ROADMAP.md` plus completed Sprint
leftovers. This prompt does not invent scope.

1. **`docs/internal/ROADMAP.md` v0.2 Identity Resolution** lists Git
   commit SHA as deterministic identity evidence.
2. **`docs/internal/ROADMAP.md` v0.5 Capabilities** require exact
   cross-provider shared evidence, deterministic Known Facts, and
   Missing Context.
3. **`docs/internal/ROADMAP.md` v0.5 Safe Semantic Boundary** states the
   only allowed shared-commit claim and forbids causal upgrades.
4. **`docs/internal/ROADMAP.md` v0.5 Context Pack** may include SHARED
   CONTEXT. Do not create a generic ContextPack abstraction
   (`docs/internal/ROADMAP.md`: earn the schema through use).
5. **`docs/internal/ROADMAP.md` v0.6** owns Investigation object,
   hypotheses, and model reasoning. Do not pull that forward.
6. **Sprint 043** persisted releases but forbade commit/ref blobs until
   a later Sprint earns them.
7. **Sprint 044** deferred “DSN, release commit/ref linkage used for
   correlation” and assigned earned joins after 045.
8. **Sprint 045** left this exact next work:

   ```text
   SPRINT 046+  earned joins (only after identifiers exist)
                - release commit/ref persistence, if earned
                - shared-commit grouping inside code_mapped_to
   ```

   and reserved the ROADMAP sentence for a later Sprint. That Sprint is
   this one, for `code_mapped_to` only.

9. **Sprint 035** already proved the composer. 046 extends it; it does
   not redesign it.

Release↔deployment joins remain later. They are a second pair and are
not required to earn the ROADMAP shared-commit sentence on the edge 045
just proved.

---

# Governing Boundaries

Preserve all shipped guarantees:

- six providers and current Resource kinds
- three Relationship kinds (`source_for`, `uses_domain_in`,
  `code_mapped_to`) with current provenance and refresh semantics
- existing `source_for` shared-commit groups unchanged
- Sentry issue envelope unchanged
- exact Resource IDs, one-hop investigation, offline composition
- exactly four MCP tools, frozen schemas, read-only
- no invented `code_mapped_to` edges

Sprint 046 may:

- add an optional compact `gitCommitSha` on Sentry release evidence
- persist it in the existing `sentry_releases` table
- widen `GitCommitEvidenceGroup.relationshipKind` to include
  `code_mapped_to`
- group GitHub workflow-run SHA + Sentry release SHA inside that edge
- surface groups through the existing SHARED COMMIT CONTEXT / MCP path
- add truthful Missing Context when a SHA is absent or one-sided

It must not add a Relationship kind, a CorrelationEngine, or a durable
shared-commit table.

---

# Baseline

Begin from the post–Sprint 045 product baseline:

```text
HEAD:          445ae6af2b2963d071b8c45fb4e388343bfcb459
tests:         794 pass across 74 files
typecheck:     clean
MCP:           exactly four read-only tools
Sprint 045:    Complete
Sprint 046:    not started (this record activates it)
live dogfood:  known-empty Sentry code mappings; 0 code_mapped_to
```

Verify the actual repository state before coding. Record the exact SHA
in completion notes. **STOP** if the worktree contains unrelated changes.

Already shipped:

```text
SentryReleaseEvidence     version, project binding, times — no commit SHA
VercelDeploymentEvidence  gitCommitSha?  (Sprint 034/035)
GitHub workflow runs      headSha        (canonicalized full SHA)
shared-commit composer    source_for only
code_mapped_to            relationship only; no release SHA join
```

---

# Claim Classes

### KNOWN

Provider-native evidence deterministically connects records.

Allowed when a group exists:

```text
These provider evidence records reference the same exact Git commit
within an already-proven code_mapped_to resource relationship.
```

That is `docs/internal/ROADMAP.md` v0.5 Safe Semantic Boundary applied
to the 045 edge. It is **not** a new Relationship.

Also allowed:

```text
Sentry reports release V for exact project P with git commit SHA S.
```

only when the SHA was persistable under the Phase 2 allowlist.

### CORRELATED

Timing or version-string resemblance without an exact SHA inside a
proven edge.

**This Sprint must not emit CORRELATED claims.** Semver proximity,
`package@version` resemblance, and temporal adjacency are unused or
Missing Context.

### UNKNOWN

Combie lacks deterministic evidence.

```text
Sentry release V has no provider-native full Git commit SHA.

A code_mapped_to relationship exists, but no shared full commit SHA
is currently held on both a workflow run and a Sentry release.

No code_mapped_to relationship is currently known.
```

### Forbidden upgrades

```text
Release X caused Issue Y
Workflow W produced release V
Release V is the Vercel deployment D
These records are correlated because they happened near each other
code_mapped_to exists, therefore every release belongs to that repo
Version string 1.4.2 equals commit abcdef
```

`docs/internal/ROADMAP.md`: context compilation organizes evidence;
investigation interprets evidence. This Sprint organizes. It does not
interpret.

---

# Exact Deterministic Evidence

## What may persist as `gitCommitSha`

Only a **canonical full Git commit SHA** (40 or 64 lowercase hex),
extracted from a Phase-2-pinned Sentry release field, using the existing
`canonicalizeFullGitCommitSha` helper (or an equivalent shared helper).

Starting candidates (Phase 2 must pin or reject):

```text
lastCommit.id     only the id string, never the blob
ref               only if it canonicalizes as a full SHA
```

Sprint 043 fixture `lastCommit.id` is `"abc123"` — that is **not** a
full SHA and must be dropped.

## What must never establish a join

- Sentry `version` / `shortVersion` parsed as a SHA or tag heuristic
- `combie-dogfood@1.0.1` style versions
- `lastCommit` message, author, email
- `commits[]` arrays
- DSN, env, issue `firstRelease` / `lastRelease`
- temporal proximity
- display-name / slug matching
- inventing `code_mapped_to` to host a group
- global SHA matching outside a proven relationship

`docs/internal/ROADMAP.md` v0.5: exact shared evidence, not hidden
significance scoring, not generic correlation
(`docs/internal/ROADMAP.md` early-product exclusions: generic Event and
generic Correlation engine without proven need).

## Resource / evidence types

| Side | Evidence | Identity |
| --- | --- | --- |
| GitHub repository | existing workflow-run `headSha` | already persisted |
| Sentry project | release row on `sentry:project:<id>` | new optional `gitCommitSha` |
| Relationship | existing `code_mapped_to` | must already exist |

No new Resource kinds. No new Relationship kinds.

---

# Relationship / Composition Semantics

Do **not** add a Relationship.

Shared-commit groups remain **ephemeral**, as in Sprint 035:

- not stored as rows
- not lineage
- not causality
- one group per `(relationshipId, commitSha)`
- `source_for` groups stay GitHub workflow + Vercel deployment
- `code_mapped_to` groups are GitHub workflow + Sentry release
- do not mix the two kinds into one group
- do not emit a group unless **both** sides have the exact SHA

One-sided SHA (release has SHA, no matching workflow run, or the reverse)
is not a group. It may be Missing Context.

If no `code_mapped_to` exists, Sentry SHAs stay on the release row and
are displayable as release metadata. They must not globally match a
GitHub SHA.

---

# Persistence Behavior

Extend the existing `sentry_releases` table with a nullable
`git_commit_sha` (same pattern as Vercel `git_commit_sha`).

- upsert by existing `(version, resource_id)`
- missing/invalid SHA stores null
- no Resource Changes from SHA backfill
- pre-046 databases upgrade safely (`ALTER` / rebuild per store
  conventions)
- still never persist lastCommit blobs, authors, URLs, data, DSN

Release refresh isolation is unchanged. SHA extraction failure for one
row is a null SHA, not a failed refresh.

---

# Authority and Failure Semantics

Release refresh authority (`populated` / `empty` / `unknown`) is
unchanged. A populated release page with zero extractable SHAs is still
a successful populated release refresh.

Code-mapping / `code_mapped_to` refresh stays Sprint 045's job. 046
must not re-infer or stale-clean that edge.

---

# Offline / CLI / Investigation

After sync, no network:

```bash
bun run combie -- investigate <sentry-project-or-github-repo-id>
```

### RELEASES

Show optional `git commit` when a SHA is present. Do not imply every
release has one.

### SHARED COMMIT CONTEXT

Existing section. Add `code_mapped_to` groups with the ROADMAP wording.
Keep `source_for` groups unchanged.

If no groups exist, keep the current empty/absent presentation. Do not
add a CORRELATIONS section.

### Known Facts / Missing Context

Known Facts may use the ROADMAP sentence when a group exists, only if
it fits `MAX_INVESTIGATION_FACTS` without displacing higher-priority
authority/release/issue facts. Prefer omitting the fact over exceeding
the budget.

Missing Context may say:

- release SHA unknown/absent (not a scare if releases are otherwise
  populated)
- `code_mapped_to` present but no two-sided SHA
- existing `no_deterministic_release_issue_linkage` **unchanged**
- existing `no_known_relationships` / unmatched mapping **unchanged**

A shared-commit group does **not** close release↔issue causality.

### Provider activity / timeline

No new family. Do not merge shared-commit groups into TIMELINE.

---

# MCP Parity

Exactly:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

`investigate_resource` already returns shared-commit structure for
`source_for`. Extend that existing payload so `code_mapped_to` groups
appear with `relationshipKind` preserved. **No new tools.** Default:
no new top-level MCP fields unless a test proves the current shared-
commit array cannot represent the second kind.

Database bytes must remain unchanged after MCP calls.

---

# Sync Integration

No new sync hook. SHA extraction happens inside existing
`normalizeSentryRelease` / `syncSentryReleases`.

Shared-commit composition remains read-time only (Sprint 035).

---

# Security

Persist only the canonical SHA.

Never persist:

- lastCommit message / author / email
- commits[] blobs
- tokens, DSN, URLs, raw payloads
- issue titles, stacks, traces, metrics, logs

`docs/internal/ROADMAP.md`: store engineering meaning; do not become a
telemetry warehouse.

---

# Phase 1 — Repository Understanding Report

Before coding, read `skills/build-combie/SKILL.md`,
`docs/internal/ROADMAP.md` v0.5, this Sprint, Sprint 035, Sprint 043
completion notes, and inspect:

- `src/providers/sentry/release.ts` and store `sentry_releases`
- `canonicalizeFullGitCommitSha`
- `src/app/shared-commit-context.ts`
- `investigate.ts` SHARED COMMIT CONTEXT + MCP `investigate_resource`

Report:

1. Exact current release persist shape.
2. How Vercel `gitCommitSha` was added (Sprint 034/035).
3. Whether `GitCommitEvidenceGroup` can widen `relationshipKind`
   without a generic engine.
4. How one-sided SHA should appear in Missing Context.
5. Whether a generic Correlation primitive is earned (expected: no).

**Do not implement before this report.**

---

# Phase 2 — Architecture Pressure Report

Verify the official Sentry **release list** payload (already used by
043) for a compact commit identity. Do not add event/occurrence
endpoints.

Answer:

1. Which field, if any, is a full Git commit SHA?
2. Is `lastCommit.id` ever a full SHA? When is it abbreviated?
3. Is `ref` a SHA, a branch, a tag, or mixed? Persist only if it
   canonicalizes as a full SHA.
4. Must Combie N+1 a commit or release-details endpoint? Default:
   **no**. If the list payload cannot supply a full SHA, **STOP** and
   document rejection. Do not invent a version-string join.
5. Fields that must never persist.
6. Live `combie-dogfood` releases: do they carry a SHA? Known-empty
   SHA is an acceptable dogfood outcome.
7. Does Canon require a change? Expected: no, except AGENTS.md after
   implementation.

Record the report in completion notes before implementation.

If Phase 2 rejects persistence, do **not** extend the composer. Stop.
Do not implement shared-commit-without-identifier.

---

# Tests

Red → Green → Refactor. No live credentials.

### Normalization

- full SHA persisted; short / missing / invalid → null
- `lastCommit` blob, authors, message excluded
- version / shortVersion never used as SHA
- existing release identity and project binding unchanged

### Persistence / sync

- nullable column; pre-046 upgrade
- upsert refreshes SHA when present
- no Change rows
- release / issue / mapping isolation unchanged

### Shared-commit composer

- `source_for` groups unchanged (regression)
- `code_mapped_to` + matching SHAs → one group
- no `code_mapped_to` → no Sentry group even if SHAs match globally
- one-sided SHA → no group
- two kinds do not merge into one group
- no causality vocabulary

### Investigation / MCP

- RELEASES shows SHA when present
- SHARED COMMIT CONTEXT shows `code_mapped_to` groups
- Missing Context truthful
- `no_deterministic_release_issue_linkage` unchanged
- MCP parity; still four tools; read-only DB regression

---

# Live Dogfood Requirements

Optional when GitHub (`--use-gh` / env) and Sentry (`--use-env`) are
explicitly authorized.

```text
connect github
connect sentry --use-env
sync
investigate <sentry:project:…>
investigate <github:repository:…>   # only if a code_mapped_to exists
MCP investigate_resource (offline, DB unchanged)
```

Sprint 045 live org: known-empty mappings, **0** `code_mapped_to`,
releases named `combie-dogfood@1.x`. Treat:

- no extractable SHA → successful known-empty identifier
- no `code_mapped_to` → no Sentry shared-commit groups (do not invent
  the edge)
- populated SHA + populated mapping → then assert the ROADMAP sentence
  and no causality

Never commit secrets or private resource names. Do not create Sentry
code mappings or rewrite releases to force a SHA.

---

# Explicitly Out of Scope

Do not implement:

- a new Relationship kind
- inventing or relaxing `code_mapped_to`
- release↔deployment joins
- release↔issue joins
- shared-commit extension to issues
- durable shared-commit associations
- CORRELATED claim surfaces
- version/tag/branch heuristics
- N+1 commit/deploy/event endpoints (unless Phase 2 proves list SHA
  impossible **and** a single secret-safe detail field is trivial —
  default is STOP, not N+1)
- Class D events, stacks, traces, metrics, logs
- generic Event / Correlation / Graph engine
- durable Investigation object (ROADMAP v0.6)
- hypotheses, confidence, summaries, managed AI
- new MCP tools
- new providers, webhooks, background sync
- operational memory / learning / execution

Do not scaffold these capabilities.

---

# What This Sprint Deliberately Leaves for Later v0.5 Work

```text
SPRINT 043   Sentry release evidence                         ✅
SPRINT 044   Sentry issue evidence                           ✅
SPRINT 045   GitHub ↔ Sentry code_mapped_to                  ✅
SPRINT 046   release commit SHA + shared-commit
             inside code_mapped_to                           ← this Sprint
SPRINT 047+  release↔deployment joins, if exact evidence
             then durable Investigation object (ROADMAP v0.6)
             then hypotheses / confidence (carefully)
```

`docs/internal/ROADMAP.md` v0.6 remains later. Exact later numbers may
shift.

---

# Product / Contract Freezes

- MCP: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource`
- MCP local, offline, read-only
- Resource kinds unchanged
- Relationship kinds unchanged (no fourth kind)
- `source_for` shared-commit semantics unchanged
- issue envelope unchanged
- no generic Event abstraction
- no write-enabled MCP

VISION, ARCHITECTURE, ROADMAP, and SKILL stay unchanged unless Phase 2
finds a material Canon conflict — report it; do not edit
`docs/internal/ROADMAP.md` to match a desired join.

---

# Validation

```bash
bun test
bun run typecheck
git diff --check
```

Confirm exactly four MCP tools remain registered.

---

# Definition of Done

- [ ] Sprint 046 is the single Active sprint
- [ ] baseline SHA and test count recorded
- [ ] Repository Understanding report completed
- [ ] Architecture Pressure report completed before implementation
- [ ] if earned: compact release `gitCommitSha` persist + allowlist
- [ ] if earned: shared-commit composer supports `code_mapped_to`
- [ ] if earned: CLI SHARED COMMIT CONTEXT + RELEASES SHA display
- [ ] if earned: Known Facts / Missing Context stay inside claim classes
- [ ] if earned: MCP parity through the existing four tools
- [ ] if not earned: rejection documented; no version-string join
- [ ] existing `source_for` shared-commit behavior unchanged
- [ ] no Change pollution; no secrets in output, errors, or fixtures
- [ ] full test suite and typecheck pass
- [ ] completion notes finalized
- [ ] Canon unchanged unless material semantics require an update

---

# Anti-Overengineering Rules

Do not introduce:

```text
CorrelationEngine
SharedCommitV2
EventStore
HypothesisEngine
InvestigationEngine
```

One composer, two relationship kinds, exact SHA, already-proven edges.

---

# Final Principle

> **`docs/internal/ROADMAP.md` v0.5 allows Combie to say two records
> share an exact Git commit inside a proven relationship. Sprint 046
> may say that for `code_mapped_to`. It must not say what that commit
> caused.**
