# SPRINT-035 — Shared Git Commit Context

> **Status:** Complete
> **Depends on:** SPRINT-034
> **Type:** Implementation / cross-provider evidence composition
> **Primary goal:** Preserve exact Vercel deployment Git commit identity and compose an ephemeral shared-commit investigation surface that groups GitHub workflow-run evidence and Vercel deployment evidence referencing the same exact Git commit inside an already-proven `source_for` Resource relationship.
> **Persistence:** Vercel evidence enrichment only
> **Evidence association persistence:** None
> **Generic correlation:** None
> **Causality / lineage:** None
> **AI:** None
> **Sprint 034 baseline HEAD:** `7063eb8dd98f65e7b99447b5e928800be1addf85`
> **Final tests:** 595 pass

---

## Goal

Sprint 034 concluded:

> **A — Implement ephemeral shared-commit context next.**

The research established that:

```text
GitHub workflow-run evidence
already preserves:
headSha
```

while:

```text
Vercel raw deployment payload
already exposes:
meta.githubCommitSha
```

but:

```text
VercelDeploymentEvidence
currently drops that field during normalization.
```

Sprint 034 also established the safe cross-provider semantic:

> **These provider evidence records reference the same exact Git commit, within an already-proven `source_for` Resource relationship.**

This is not lineage.

This is not causality.

This is not a generic correlation engine.

Sprint 035 implements the smallest complete vertical slice:

```text
Vercel raw deployment
meta.githubCommitSha
        ↓
normalize + allowlist
        ↓
VercelDeploymentEvidence.gitCommitSha?
        ↓
SQLite nullable git_commit_sha
        ↓
InvestigationContext
        │
        ├── GitHub workflow runs headSha
        ├── Vercel deployments gitCommitSha
        └── source_for Relationship
                    ↓
        composeSharedCommitContext()
                    ↓
        GitCommitEvidenceGroup[]
                    ↓
        SHARED COMMIT CONTEXT
```

---

# Core Principle

> **Match exact identity only inside already-proven structural context.**

And:

> **Shared commit does not mean shared cause.**

---

# Baseline

Begin from the clean committed Sprint 034 baseline.

Expected Sprint 034 research commits include:

```text
c68cc6f57f34daef2474d3f171258486f334d928
```

and:

```text
7063eb8dd98f65e7b99447b5e928800be1addf85
```

Do not assume the latter is current HEAD without verification.

Run:

```bash
git status
git log -4 --oneline
bun test
bun run typecheck
```

Expected baseline:

```text
572 tests passing
typecheck clean
worktree clean
```

Record:

- exact current full HEAD SHA;
- commit message;
- test count;
- typecheck result;
- worktree state.

If Sprint 034 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 034 and Sprint 035.

---

# Sprint 034 Decisions Are Inputs

Do not reopen these unless implementation pressure proves a contradiction.

Sprint 034 established:

## 1. Vercel commit identity is reliable enough

When present and full-shaped:

```text
meta.githubCommitSha
```

is safe to preserve as exact provider-native deployment commit identity.

It is optional.

It may be absent for:

```text
non-Git deployments
CLI/drop paths
provider payloads without Git metadata
```

Missing commit identity means:

```text
no shared-commit association
```

Do not invent fallback identity.

---

## 2. GitHub `headSha` is already persisted

GitHub workflow-run evidence already includes:

```text
headSha
```

This remains provider-native evidence.

Do not redesign GitHub evidence.

---

## 3. SHA equality alone is insufficient

The candidate association requires:

```text
exact full Git SHA equality
+
existing canonical source_for Relationship
```

Global SHA matching is forbidden.

---

## 4. Pairwise associations are rejected

The evidence cardinality is naturally many-to-many:

```text
one commit
→ many workflow runs
→ many deployments
```

Therefore the implementation should group evidence by shared Git commit.

Do not create an N×M pairwise match list.

---

## 5. Association remains ephemeral

Do not persist:

```text
workflow↔deployment match
same-commit Relationship
evidence match table
commit group table
```

The group must be recomputed from current investigation evidence.

---

## 6. Safe semantic

Allowed:

```text
These provider evidence records reference the same exact Git commit.
```

Not allowed:

```text
The workflow created the deployment.
The deployment was triggered by this workflow.
The workflow caused the deployment.
These are part of the same incident.
```

---

# Repository Understanding Report

Before coding, inspect:

- `skills/build-combie/SKILL.md`
- Combie Canon
- SPRINT-005
- SPRINT-020
- SPRINT-021
- SPRINT-024
- SPRINT-027
- SPRINT-028
- SPRINT-033
- SPRINT-034
- Vercel raw deployment client types
- Vercel deployment normalizer
- VercelDeploymentEvidence model
- Vercel deployment SQLite schema
- Vercel deployment storage read/write helpers
- migration/upgrade patterns
- GitHubWorkflowRunEvidence
- GitHub workflow-run `headSha`
- `InvestigationContext`
- `source_for` Relationship structure
- provider evidence grouping
- investigate formatter
- relevant fixtures/tests

Produce a concise Repository Understanding report before implementation.

Explicitly answer:

1. Where exactly is `meta.githubCommitSha` currently typed?
2. Where is it currently dropped?
3. How is Vercel deployment evidence normalized today?
4. What fields are persisted in the Vercel deployment table?
5. What is the exact upgrade pattern for additive nullable fields?
6. Is `headSha` nullable?
7. How is `headSha` normalized?
8. How are GitHub workflow runs bound to repository Resources?
9. How are Vercel deployments bound to project Resources?
10. How is `source_for` exposed inside InvestigationContext?
11. Are source/target direction semantics available?
12. Can shared-commit composition remain pure?
13. Can it operate entirely over already-loaded InvestigationContext?
14. Is any provider call needed? Expected: no.
15. Is any new durable association storage needed? Expected: no.

No implementation before this report.

---

# Architecture Pressure Report

Before coding, answer:

1. Should Vercel `gitCommitSha` be optional?
2. Should malformed/short SHAs be persisted?
3. Should canonicalization happen during normalization or composition?
4. Should exact full SHA shape be validated at ingestion?
5. Which SHA lengths are accepted?
6. Should case be normalized?
7. Should whitespace be trimmed?
8. Should raw provider value also be retained? Expected: no.
9. Does Vercel evidence need repo identity in addition to project binding?
10. Is existing `source_for` sufficient structural scope?
11. Should shared-commit groups be part of InvestigationContext itself?
12. Or should they be a pure projection over InvestigationContext?
13. Should the group be typed?
14. Does it need stable ID?
15. Does it need persistence?
16. Does it need authority status?
17. Should retained unknown-authority evidence be allowed into groups?
18. If yes, what wording is required?
19. Should a group require at least one workflow and one deployment? Expected: yes.
20. Should multiple source_for Relationships be handled?
21. Could one repository source multiple Vercel projects?
22. Could one Vercel project have multiple repository Relationships?
23. How should duplicate evidence rows be handled?
24. Should grouping be per:
    - commit only;
    - relationship + commit;
    - repository/project pair + commit?
25. Is a generic correlation abstraction required? Expected: no.
26. Is a generic GitCommit domain object earned? Expected: likely no.
27. Does Canon need to change?

Prefer the smallest composition primitive.

---

# Vercel Evidence Enrichment

Add exactly one new allowlisted field to normalized Vercel deployment evidence:

```text
gitCommitSha
```

Source:

```text
deployment.meta.githubCommitSha
```

Do not persist:

```text
commit message
commit author
raw meta
Git provider metadata blob
```

The field should be:

```text
string | null
```

or repository-equivalent optional semantics.

---

# SHA Validation

Sprint 034 recommended exact full-shaped SHA matching.

Accept only exact full hexadecimal Git object IDs.

Support:

```text
40 hex characters
64 hex characters
```

to remain compatible with SHA-1 and SHA-256 shaped Git object IDs.

Reject:

```text
short SHA
prefix SHA
non-hex
malformed
empty
whitespace-only
```

Pressure-test whether actual provider evidence requires only 40 chars today.

Even if current providers use SHA-1, accepting valid full 64-hex Git object IDs may keep the helper semantically future-safe.

Do not fuzzy match.

---

# Canonicalization

Use a minimal canonicalization rule:

```text
trim surrounding whitespace
lowercase
validate full hex shape
```

Invalid input becomes:

```text
null / absent
```

Do not preserve malformed identity for matching.

Do not transform short SHAs into full identities.

Do not infer missing characters.

---

# Storage

Add the smallest nullable field to Vercel deployment persistence.

Conceptually:

```text
git_commit_sha TEXT NULL
```

Use repository naming conventions.

Pre-Sprint-035 databases must upgrade safely.

Existing rows become:

```text
git_commit_sha = null
```

Do not backfill from:

```text
project metadata
deployment names
branch
URL
```

Only future/live normalized evidence may populate the field unless a current stored safe payload already provides exact evidence—which is not expected.

---

# Identity Stability

Adding commit SHA must not change:

```text
Vercel deployment evidence identity
native deployment UID
Resource binding
provider chronology ordering
refresh authority
```

Commit identity is evidence metadata.

It is not the row primary identity.

---

# Sync / Refresh Semantics

On successful Vercel deployment refresh:

```text
normalize deployment
→ canonicalize gitCommitSha
→ persist nullable commit SHA
```

Existing refresh authority behavior remains unchanged.

On failed refresh:

```text
retained rows remain retained
gitCommitSha remains whatever was previously persisted
current authority may become unknown
```

Do not erase commit SHA on refresh failure.

On a later successful refresh where the same deployment no longer exposes a valid SHA, pressure-test whether the persisted row should update to null.

Default expectation:

```text
upsert reflects normalized current row fields
```

but follow existing evidence update semantics.

Document the decision.

---

# Shared Commit Projection

Implement a pure application-layer function.

Recommended conceptual name:

```text
composeSharedCommitContext()
```

Alternative names may be chosen if repository conventions strongly favor another.

The function should return:

```text
GitCommitEvidenceGroup[]
```

or repository-equivalent typed output.

Do not implement a generic:

```text
EvidenceMatch[]
Correlation[]
```

---

# Group Semantic

A group means:

> **GitHub workflow-run evidence and Vercel deployment evidence held by Combie reference the same exact Git commit within an already-proven repository→project `source_for` relationship.**

This is the complete semantic.

Do not attach stronger meaning.

---

# Group Identity / Scope

Group by:

```text
source_for Relationship
+
canonical commit SHA
```

Conceptually:

```text
relationshipId
commitSha
```

This prevents evidence from separate repository/project pairs from collapsing simply because the SHA matches.

Do not group globally by SHA.

---

# Minimum Group Membership

A group should exist only when it has:

```text
>= 1 eligible GitHub workflow run
AND
>= 1 eligible Vercel deployment
```

A commit appearing on only one provider does not produce Shared Commit Context.

That evidence remains visible in its normal provider sections.

---

# Eligible GitHub Evidence

Workflow run qualifies only when:

```text
headSha exists
canonical full SHA is valid
workflow run belongs to source repository Resource
```

Do not require:

```text
success
failure
specific status
recent time
current authority
```

for basic held-evidence grouping.

Authority qualification is separate.

---

# Eligible Vercel Evidence

Deployment qualifies only when:

```text
gitCommitSha exists
canonical full SHA is valid
deployment belongs to target Vercel project Resource
```

Do not fallback to:

```text
branch
git ref
deployment name
timestamp
commit message
```

---

# Structural Scope

For every candidate group, require canonical:

```text
GitHub repository
source_for
Vercel project
```

Do not accept reverse semantic substitutes unless the stored Relationship row naturally appears inbound from the investigation query perspective.

The underlying canonical edge remains:

```text
repository → project
```

Do not create group matches across:

```text
same provider
unrelated Resources
different project/repository pair
```

---

# Many-to-Many Grouping

Example:

```text
Commit abc123

GitHub workflow runs
- 9001
- 9002

Vercel deployments
- dpl_1
- dpl_2
- dpl_3
```

Produce one group.

Do not produce:

```text
6 pairwise match records
```

unless pairwise associations are internal implementation details never exposed and cannot be avoided cleanly.

Prefer direct grouping.

---

# Deterministic Ordering

Order groups deterministically.

Recommended primary order:

```text
newest relevant provider activity time DESC
```

But pressure-test whether introducing activity-time ordering inside groups is necessary.

Safer alternative:

```text
commit SHA ASC/DESC
relationship ID
```

Since this is not a priority surface, ordering should be organizational only.

If using provider time, it must not imply significance.

Document final comparator.

Within groups:

GitHub workflow runs should retain their existing deterministic provider evidence ordering.

Vercel deployments should retain existing deterministic ordering.

Do not invent "best match."

---

# Authority Semantics

Shared Commit Context may operate over:

```text
evidence Combie currently holds
```

including retained evidence under unknown current authority.

Therefore the group itself must not claim:

```text
current workflow
current deployment
latest-response evidence
```

unless row-specific membership is independently known.

Possible group-level authority summary:

```text
GitHub workflow authority: unknown
Vercel deployment authority: populated
```

or structured equivalent.

Do not make authority a match criterion.

The match basis is:

```text
exact commit identity
+
source_for structural scope
```

---

# Row Membership Boundary

Sprint 031 established:

```text
latest successful response membership IDs are not persisted
```

Sprint 035 must preserve that boundary.

Do not label any individual retained evidence row:

```text
current
in latest successful refresh
latest-response record
```

because it is in a shared commit group.

Shared commit membership says nothing about refresh membership.

---

# PR / Merge False Negatives

Matching may miss valid real-world lineage when:

```text
GitHub headSha
!=
Vercel gitCommitSha
```

because of:

```text
PR merge commits
squash
rebase
different checked-out refs
deployment source variation
```

This is acceptable.

Do not add fallback matching.

False negatives are safer than false positives.

---

# No Time Matching

Do not use:

```text
created within N minutes
workflow before deployment
deployment after run
```

as match criteria.

Provider timestamps may be rendered for context only.

They are not part of identity.

---

# No Branch Matching

Do not use branch/ref as fallback identity.

Branch names are display context only.

Two evidence rows on the same branch are not necessarily the same commit.

---

# No Generic Git Commit Entity

Do not create a durable:

```text
GitCommit
Commit
Revision
```

domain object unless implementation pressure proves it necessary.

The commit SHA is grouping identity inside a projection.

That is enough for Sprint 035.

---

# No Evidence Relationship Persistence

Do not add:

```text
same_git_commit Relationship rows
references_same_commit table
evidence_relationships
```

The projection is ephemeral.

No cleanup semantics.

No stale match maintenance.

---

# Suggested Typed Shape

Conceptually:

```ts
type GitCommitEvidenceGroup = {
  commitSha: string;
  sourceResourceId: string;
  targetResourceId: string;
  relationshipId: string;
  relationshipKind: "source_for";
  workflowRuns: GitHubWorkflowRunEvidence[];
  deployments: VercelDeploymentEvidence[];
  authority: {
    github: ...
    vercel: ...
  };
};
```

This is conceptual.

Follow repository conventions.

Do not duplicate full Resource objects if IDs/references are sufficient.

Preserve structured provenance.

---

# Provenance

Every group must make the basis auditable.

Preserve:

```text
commit SHA
source repository Resource ID
target Vercel project Resource ID
source_for Relationship ID
Relationship kind
Relationship direction
workflow native IDs
deployment native UIDs
provider evidence authority
subject/neighbor role where applicable
```

Do not rely solely on CLI copy.

---

# Investigation Integration

Extend the existing investigation composition with Shared Commit Context.

Do not make the composer read storage itself.

Preferred flow:

```text
getInvestigationContext()
        ↓
composeSharedCommitContext(context)
        ↓
investigate formatter
```

The projection should consume already-loaded evidence and Relationships.

No provider calls.

No mutation.

---

# CLI Section

Add:

```text
SHARED COMMIT CONTEXT
```

to:

```bash
combie investigate <resource-id>
```

This section should be supplemental.

Do not remove:

```text
KNOWN FACTS
MISSING CONTEXT
KNOWN PROVIDER ACTIVITY
COMBIE OBSERVATIONS
RELATED CONTEXT
full provider evidence
```

Pressure-test placement.

Likely near:

```text
KNOWN PROVIDER ACTIVITY
```

because it organizes provider evidence across families.

But use actual formatter structure.

---

# CLI Semantics

Example conceptual output:

```text
SHARED COMMIT CONTEXT

Commit abc123...

GitHub workflow runs
• 9001 · ci · status=completed · conclusion=failure
• 9002 · test · status=completed · conclusion=success

Vercel deployments
• dpl_1 · readyState=ERROR
• dpl_2 · readyState=READY

Basis
• exact Git commit SHA
• github:repository:123 source_for vercel:project:abc
```

Do not mechanically copy this format.

Keep it concise.

The full provider sections retain complete evidence.

---

# Safe Wording

Allowed:

```text
Shared Git commit
References same Git commit
Commit context
```

Allowed basis:

```text
exact Git commit SHA
source_for Resource relationship
```

Do not render:

```text
Matched workflow/deployment
Deployment produced by workflow
Workflow for deployment
Triggered by
Deployed by
Caused by
Same release
Same incident
```

unless future evidence proves those stronger semantics.

---

# Zero State

If no shared-commit groups exist:

Pressure-test whether to:

```text
omit SHARED COMMIT CONTEXT entirely
```

or show:

```text
No shared Git commit context is known within the current investigation scope.
```

Prefer minimizing noise.

Because this section is supplemental rather than an authority/gap surface, omission may be cleaner.

Document the decision.

---

# Missing Commit SHA

If Vercel deployment lacks commit SHA:

```text
no group
```

Do not emit Missing Context automatically.

The absence may be normal for non-Git deployment paths.

Do not imply an integration defect.

---

# Interaction With Missing Context

Do not add a Missing Context category for:

```text
deployment missing gitCommitSha
```

unless repository semantics prove the field should exist for that exact deployment source.

Sprint 035 should not broaden Missing Context taxonomy.

---

# Interaction With Known Facts

Do not automatically add a new Fact such as:

```text
2 providers reference the same commit.
```

unless implementation pressure strongly proves it provides distinct high-value compression.

Default:

```text
Shared Commit Context owns the grouping.
Known Facts unchanged.
```

Keep the five-Fact budget unchanged.

---

# Interaction With Provider Activity

Do not merge Shared Commit groups into the Provider Activity chronology.

Chronology remains:

```text
ordered provider activity
```

Shared Commit Context remains:

```text
identity-based cross-provider grouping
```

These are separate jobs.

---

# Interaction With Resource Relationships

Do not persist a new Resource Relationship.

`source_for` is the structural prerequisite.

Shared commit is evidence context layered above it.

---

# Tests

Use:

```text
Red → Green → Refactor
```

---

## Vercel Normalization

Test:

- valid 40-char lowercase SHA
- valid 40-char uppercase SHA → canonical lowercase
- valid 64-char SHA
- surrounding whitespace → trimmed
- short SHA → null
- malformed hex → null
- empty string → null
- missing `meta`
- missing `githubCommitSha`
- raw message/author/meta not persisted

---

## Vercel Storage

Test:

- nullable `git_commit_sha`
- pre-035 DB upgrade
- old rows null
- successful persisted SHA
- upsert updates SHA
- failure retains existing row
- no secret fields
- deployment identity unchanged

---

## Existing GitHub Regression

Confirm:

```text
headSha
```

behavior remains unchanged.

No GitHub schema change expected.

---

## Exact Match

Test:

```text
workflow SHA=A
deployment SHA=A
source_for exists
```

→ one shared commit group.

---

## SHA Mismatch

```text
A != B
```

→ no group.

---

## Missing Structural Relationship

Same SHA but no `source_for`:

```text
no group
```

Hard safety regression.

---

## Multiple Relationships

Test same SHA across different source_for Resource pairs.

Groups must remain separate by relationship scope.

No global collapse.

---

## Many Workflow Runs

Two or more workflow runs same SHA + one deployment:

```text
one group
multiple workflow runs
```

---

## Many Deployments

One workflow + multiple deployments same SHA:

```text
one group
multiple deployments
```

---

## Many-to-Many

Multiple runs + multiple deployments:

```text
one group
no pairwise explosion
```

---

## Missing SHA

- missing GitHub SHA
- missing Vercel SHA
- malformed SHA

→ no group.

No fallback.

---

## Unrelated Same SHA

Same SHA in:

```text
repository A → project A
repository B → project B
```

must form separate groups if both pairs have canonical relationships.

Same SHA without relationship:

```text
no group
```

---

## Authority

Test:

- both populated
- GitHub unknown / Vercel populated
- GitHub populated / Vercel unknown
- both unknown with retained evidence
- known-empty family with no rows
- last-success provenance

Group may exist from retained held evidence.

Rendered wording must not claim current row membership.

---

## Subject / Neighbor

Test investigation initiated from:

```text
GitHub repository
```

and:

```text
Vercel project
```

The same canonical group should be discoverable from either endpoint when both Resources/evidence are in one-hop scope.

Preserve query-perspective subject/neighbor roles separately from canonical relationship direction.

---

## Determinism

Test:

- shuffled input evidence
- shuffled Relationships
- repeated composition
- stable group order
- stable item order
- no mutation

---

## CLI

Test:

```text
SHARED COMMIT CONTEXT
```

for:

- one group
- many-to-many group
- exact SHA shown
- workflow summaries
- deployment summaries
- source_for basis
- subject/neighbor context
- authority qualification
- no lineage wording
- no causal wording
- no "current" membership claim
- zero-state/omission behavior

---

# Security

Commit SHA is safe evidence.

Still verify:

- raw Vercel meta is not stored;
- commit message is not newly persisted;
- commit author is not newly persisted;
- no auth headers;
- no provider tokens;
- no raw payload dump.

Run secret scan.

---

# Offline Requirement

After evidence is persisted:

```bash
unset VERCEL_TOKEN
unset GITHUB_TOKEN
unset GH_TOKEN
```

then:

```bash
bun run combie investigate <resource-id>
```

must produce Shared Commit Context entirely offline.

No provider calls.

---

# Read-Only Requirement

Running `investigate` must not mutate:

```text
Resources
Relationships
provider evidence
refresh state
shared commit context
```

The association is ephemeral.

Repeated reads must leave the DB unchanged.

---

# Performance

Composition should be bounded by current one-hop InvestigationContext.

Do not scan all database evidence globally.

Preferred conceptual complexity:

```text
for each source_for relationship in scope:
  index workflow runs by canonical SHA
  index deployments by canonical SHA
  intersect keys
  build groups
```

Avoid N×M comparison where practical.

Do not over-engineer.

---

# No Generic Correlation

Do not introduce:

```text
Correlation
CorrelationEngine
EvidenceMatcher
MatchingEngine
EvidenceRelationship
AssociationRegistry
```

unless the implementation becomes impossible without one—which is not expected.

If such pressure appears:

**STOP and report before broadening scope.**

---

# No Causality / Lineage

No fields like:

```text
triggeredBy
deployedBy
causedBy
sourceRun
deploymentRun
parentEvent
```

Shared commit identity does not prove any of those.

---

# Architecture Review

Before completion answer:

1. Was Vercel `gitCommitSha` added safely?
2. Was only the allowlisted SHA persisted?
3. Were short/malformed SHAs rejected?
4. Did deployment identity remain unchanged?
5. Did refresh authority remain unchanged?
6. Did GitHub evidence remain unchanged?
7. Did matching require `source_for`?
8. Is global SHA matching impossible?
9. Are groups scoped by Relationship + commit?
10. Does many-to-many produce one group?
11. Is the projection ephemeral?
12. Was any match association persisted?
13. Was any generic correlation abstraction introduced?
14. Can retained unknown-authority evidence participate truthfully?
15. Does output avoid "current" row claims?
16. Does output avoid lineage claims?
17. Does output avoid causality?
18. Does it materially remove manual SHA comparison?
19. Does it help agents?
20. What is now the largest remaining investigation friction?

---

# Completion Notes

Update `docs/internal/sprints/SPRINT-035.md` with:

## Baseline

Exact Sprint 034 HEAD SHA.

## Repository Understanding

Relevant evidence/storage/composition paths.

## Architecture Pressure

Final implementation choices.

## Vercel Commit Enrichment

Exact normalized field semantics.

## SHA Canonicalization

Accepted/rejected shapes.

## Storage Upgrade

Nullable column and pre-035 behavior.

## Shared Commit Model

Final DTO shape.

## Match Rule

Exact deterministic predicate.

## Structural Scope

How `source_for` gates matching.

## Many-to-Many

Grouping behavior.

## Authority

Retained/current wording.

## CLI

Final section placement and examples.

## Zero State

Omit/render decision.

## Security

Allowlist and secret review.

## Offline / Read-Only

Verification.

## Validation

Tests/typecheck/diff.

## Live Verification

If credentials available:
- sync Vercel + GitHub
- inspect shared commit groups
- repeat sync
- unset credentials
- verify offline output

If no matching live data exists, fixture verification is valid.

## Deviations

Anything different from Sprint 034 recommendation.

## Learnings

Whether this cross-provider primitive earns broader matching research.

## Canon Changes

Changes or `None`.

## Commit

Exact Sprint 035 SHA.

---

# Explicit Questions

Answer all:

1. Was `gitCommitSha` added to Vercel evidence?
2. What exact source field populates it?
3. Which SHA shapes are accepted?
4. Are values canonicalized?
5. What happens to malformed/short SHA?
6. Did schema upgrade safely set old rows to null?
7. Did GitHub require changes?
8. What exact match predicate shipped?
9. Is `source_for` mandatory?
10. Can same SHA across unrelated Resources match? Expected: no.
11. Are groups scoped by relationship + commit?
12. Can multiple workflows share a group?
13. Can multiple deployments share a group?
14. Does many-to-many avoid pairwise duplication?
15. Can unknown-authority retained evidence participate?
16. How is it qualified?
17. Does row-membership uncertainty remain respected?
18. Is group persistence used? Expected: no.
19. Is a generic correlation model used? Expected: no.
20. Does shared commit imply workflow→deployment lineage? Expected: no.
21. Does shared commit imply causality? Expected: no.
22. Did Known Facts change?
23. Did Missing Context change?
24. Did Provider Activity change?
25. Does Shared Commit Context reduce real manual investigation work?
26. Does it benefit agents?
27. What is the next largest investigation gap?
28. What exact Sprint 036 direction is earned?

---

# Definition of Done

- [ ] Sprint 034 clean baseline verified
- [ ] exact baseline SHA recorded
- [ ] SKILL protocol followed
- [ ] Canon read
- [ ] relevant Sprint history reviewed
- [ ] Repository Understanding completed
- [ ] Architecture Pressure completed
- [ ] Vercel `gitCommitSha` normalized
- [ ] only allowlisted SHA persisted
- [ ] malformed/short SHA rejected
- [ ] canonicalization deterministic
- [ ] nullable schema field added
- [ ] pre-035 DB upgrade safe
- [ ] deployment identity unchanged
- [ ] refresh authority unchanged
- [ ] GitHub `headSha` unchanged
- [ ] typed ephemeral shared-commit projection implemented
- [ ] exact SHA equality required
- [ ] canonical `source_for` required
- [ ] global SHA matching impossible
- [ ] groups scoped by Resource pair/Relationship
- [ ] minimum one run + one deployment required
- [ ] many-to-many grouped without pairwise explosion
- [ ] no branch fallback
- [ ] no timestamp fallback
- [ ] no fuzzy SHA
- [ ] retained unknown-authority evidence handled truthfully
- [ ] no unsupported current-row claims
- [ ] SHARED COMMIT CONTEXT added to investigate
- [ ] detailed provider evidence preserved
- [ ] Known Facts semantics unchanged
- [ ] Missing Context semantics unchanged
- [ ] Provider Activity semantics unchanged
- [ ] no durable association
- [ ] no evidence Relationship table
- [ ] no generic correlation engine
- [ ] no lineage claims
- [ ] no causality
- [ ] no AI
- [ ] focused tests added
- [ ] full tests pass
- [ ] typecheck passes
- [ ] secret scan clean
- [ ] diff/whitespace checks clean
- [ ] offline behavior verified
- [ ] read-only behavior verified
- [ ] completion notes updated
- [ ] Canon changes recorded or None
- [ ] Sprint 035 committed separately
- [ ] worktree clean
- [ ] Sprint 036 not started

---

# Explicitly Out of Scope

Do not implement:

- durable shared-commit associations
- evidence Relationship tables
- generic correlation
- CorrelationEngine
- MatchingEngine
- fuzzy SHA matching
- short-SHA matching
- branch matching
- timestamp matching
- commit-message matching
- workflow→deployment lineage
- triggered_by
- deployed_by
- caused_by
- incident grouping
- root-cause analysis
- anomaly detection
- new Resource Relationships
- new providers
- new provider evidence families
- recursive traversal
- generic Event
- generic Evidence
- ObservationEngine
- AI/LLM summaries
- embeddings
- logs
- metrics
- traces
- webhooks
- MCP/API/SDK/UI
- controlled execution
- Sprint 036 scaffolding

---

# Final Principle

> **Match exact identity only inside already-proven structural context.**

And:

> **Shared commit does not mean shared cause.**

---

# Completion Notes — Sprint 035

## Baseline

```text
Sprint 034 HEAD: 7063eb8dd98f65e7b99447b5e928800be1addf85
  docs(sprint): record Sprint 034 commit SHA
Also present: c68cc6f research completion

Baseline: 572 tests, typecheck clean, worktree clean (only untracked SPRINT-035.md)
```

## Repository Understanding

| Question | Answer |
|---|---|
| Where is meta.githubCommitSha typed? | Only as untyped `meta?: unknown` on raw list items |
| Where dropped? | `normalizeDeployment` omitted `meta` entirely pre-035 |
| Normalize today (pre) | uid/projectId/times/readyState/state/target/source |
| Persist (pre) | no SHA column |
| Upgrade pattern | `ensureNullableTextColumn` + CREATE TABLE column; PRAGMA table_info |
| headSha nullable? | Yes `string \| null` |
| headSha normalize | `asNonEmptyString` (trim only; no full-shape gate at ingest) |
| Workflow Resource binding | `github:repository:<id>` via repository.id match |
| Deployment Resource binding | `vercel:project:<id>` via projectId match |
| source_for in InvestigationContext | `related[].relationship` with kind + endpoints + direction |
| Pure composition? | Yes — over InvestigationContext only |
| Provider calls? | No |
| Durable association? | No |

## Architecture Pressure (decisions implemented)

1. `gitCommitSha` optional (`string | null`)
2. Short/malformed not persisted (null)
3. Canonicalize at **ingestion** (Vercel) and re-validate at **composition** (both sides)
4. Full shape at ingestion for Vercel
5. Accept 40 and 64 hex
6. Lowercase
7. Trim
8. No raw provider value retained
9. No extra repo identity on deployment evidence (source_for scopes)
10. source_for sufficient
11–12. Pure projection over InvestigationContext (not stored on context type)
13. Typed `GitCommitEvidenceGroup`
14. No stable durable id (relationshipId + commitSha identity)
15. No persistence of groups
16. `includesUnknownAuthority` flag only
17. Unknown retained evidence may participate
18. Wording: among held evidence; may be stale
19. ≥1 run AND ≥1 deployment required
20–22. Multiple source_for handled; monorepo/multi-project separate groups
23. Evidence listed as held (no dedupe beyond native lists)
24. Group by **relationship + commit**
25. No generic correlation
26. No generic GitCommit domain object
27. Canon unchanged

## Vercel commit normalization

```text
canonicalizeFullGitCommitSha(value)
  trim → lowercase → /^[0-9a-f]{40}$/ or /^[0-9a-f]{64}$/ else null

extractGitCommitShaFromMeta(meta)
  only meta.githubCommitSha

normalizeDeployment → gitCommitSha: extract...
```

Never stores message, author, raw meta, urls, env, creator.

## Schema upgrade

```text
vercel_deployments.git_commit_sha TEXT NULL
```

- New CREATE TABLE includes column
- Additive: `ensureNullableTextColumn(db, "vercel_deployments", "git_commit_sha")`
- Pre-035 rows → null
- Upsert reflects current normalized value (including update to null)
- Failure retention unchanged (no delete of rows)
- Identity remains `uid`

## Exact group DTO

```text
GitCommitEvidenceGroup {
  commitSha
  relationshipId
  relationshipKind: "source_for"
  sourceResourceId
  targetResourceId
  workflowRuns: { evidence, authorityKind, role }[]
  deployments: { evidence, authorityKind, role }[]
  includesUnknownAuthority
}
```

Module: `src/app/shared-commit-context.ts`  
Function: `composeSharedCommitContext(context)`

## Exact match predicate

```text
isGitHubVercelSourceFor(relationship)
AND workflow.resourceId == relationship.sourceResourceId
AND deployment.resourceId == relationship.targetResourceId
AND canonicalize(workflow.headSha) == canonicalize(deployment.gitCommitSha)
AND both full-shaped
AND ≥1 run AND ≥1 deployment
```

Global SHA equality impossible: only iterates `source_for` edges in context.

## Many-to-many

One group per `(relationshipId, commitSha)` with member lists. No pairwise rows.

## Authority semantics

- Operates over held evidence (populated / empty retained / unknown retained)
- `includesUnknownAuthority` when any member is unknown
- CLI: “among held evidence; not proven latest-response membership”
- Never claims current/latest-response membership

## CLI

Section: `SHARED COMMIT CONTEXT` after RELATED CONTEXT, before KNOWN PROVIDER ACTIVITY.  
Omitted when empty.  
Deployment cards show `git commit sha:` when present.

Safe wording only (no triggered/caused/deployed by/same incident).

## Security

- Commit SHA allowlisted only
- Fixture message/author never appear in evidence JSON
- No credentials in diff

## Offline / read-only

Investigate uses local store only; repeated investigate does not mutate DB; fetch would throw if used (tests cover).

## Live verification

Deferred — no live provider credentials required for this slice; fixture/offline tests cover the vertical path.

## Architecture review answers

1. gitCommitSha safely allowlisted? **Yes**
2. Malformed/short rejected? **Yes**
3. Deployment identity unchanged? **Yes (uid)**
4. Refresh authority unchanged? **Yes**
5. GitHub schema changes? **No**
6. source_for mandatory? **Yes**
7. Global SHA impossible? **Yes**
8. Groups scoped by relationship + commit? **Yes**
9. Many-to-many one group? **Yes**
10. Composition ephemeral? **Yes**
11. Persisted besides Vercel commit field? **No associations**
12. Unknown-authority participation safe? **Yes with wording**
13. Current-row claims avoided? **Yes**
14. Lineage avoided? **Yes**
15. Causality avoided? **Yes**
16. Removes manual SHA comparison? **Yes when both full SHAs present**
17. Benefits agents? **Yes — structured groups**
18. Largest remaining investigation gap? **PR/merge false negatives and one-sided SHA absence; density of Related Context; no other exact cross-provider join keys yet**
19. Sprint 036 direction? See below

## Sprint 036 recommendation (evidence-backed)

```text
B — Bounded investigate density / Related Context compaction research or small slice

Rationale:
- Shared-commit identity friction is closed when both SHAs exist.
- Remaining gaps: PR merge false negatives (accept), presentation density,
  and absence of other exact multi-provider joins (do not invent).
- Do not build CorrelationEngine.
- Optional small follow-up: surface gitCommitSha in Known Facts only if density
  pressure proves it; default leave Facts unchanged.
```

Primary earned next step after 035: **presentation density for Related Context** (Sprint 033 candidate A) or pause investigation feature expansion and dogfood shared-commit in real stacks.

## Validation

```text
bun test        → 595 pass, 0 fail
bun run typecheck → clean
git diff --check → clean
Secret scan     → clean
Generic correlation architecture → NOT introduced
```

## Canon Changes

**None.**

## Definition of Done

- [x] Sprint 034 clean baseline verified
- [x] exact baseline SHA recorded
- [x] SKILL protocol followed
- [x] Canon read
- [x] relevant Sprints reviewed
- [x] Repository Understanding completed
- [x] Architecture Pressure completed
- [x] Vercel gitCommitSha enrichment
- [x] SHA validation/canonicalization
- [x] schema upgrade
- [x] pre-035 rows null
- [x] GitHub headSha unchanged (schema)
- [x] composeSharedCommitContext pure
- [x] source_for mandatory
- [x] global SHA forbidden
- [x] minimum one run + one deployment
- [x] many-to-many grouped
- [x] no branch/time/fuzzy fallback
- [x] unknown authority truthful
- [x] SHARED COMMIT CONTEXT in investigate
- [x] Known Facts / Missing Context / Provider Activity unchanged
- [x] no durable association / correlation engine / lineage / causality / AI
- [x] full tests pass (595)
- [x] typecheck / secret scan / offline / read-only
- [x] completion notes
- [x] Canon None
- [x] commit `137ad9d5675f746d7b7968b54a0cb45b1b4d1e81`
- [x] worktree clean
- [x] Sprint 036 not started

## Commit

```text
137ad9d5675f746d7b7968b54a0cb45b1b4d1e81
feat(investigate): shared Git commit context for workflow runs and deployments
```