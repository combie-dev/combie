# SPRINT-034 — GitHub Workflow ↔ Vercel Deployment Commit Match Research

> **Status:** Complete (research only)
> **Depends on:** SPRINT-033
> **Type:** Research / cross-provider evidence pressure
> **Primary goal:** Determine whether GitHub workflow-run evidence and Vercel deployment evidence can be deterministically associated by exact Git commit identity within an already-proven `source_for` Resource relationship, without introducing generic correlation, causality, or fuzzy matching.
> **Production code:** None
> **Test code:** None
> **Storage / schema:** No changes
> **Provider contracts / APIs:** No changes
> **Correlation engine:** None
> **AI:** None
> **Recommendation:** A — Implement ephemeral shared-commit context next (enrich Vercel commit SHA + pure composition)
> **Sprint 033 baseline HEAD:** `e367e85d2cfbeba63df92943a4783393bc2664b8`

---

## Goal

Sprint 033 concluded:

> **D — Research one exact cross-provider match next.**

The dominant remaining investigation friction is no longer presentation.

It is structural:

> **Investigators manually compare Git commit SHAs across GitHub workflow-run evidence and Vercel deployment evidence in order to determine whether two provider records refer to the same source revision.**

Sprint 033 found:

```text
GitHubWorkflowRunEvidence
→ already preserves headSha

Vercel raw deployment payload
→ includes meta.githubCommitSha

VercelDeploymentEvidence
→ currently drops that commit SHA during normalization
```

The key research question is:

> **Is Vercel `meta.githubCommitSha` sufficiently reliable, stable, and semantically precise to support an exact deterministic evidence association with GitHub `headSha`, scoped only to Resources already connected through the canonical `source_for` Relationship?**

Sprint 034 does not implement the match.

It determines whether the match is earned and what the smallest safe implementation would be.

---

# Core Principle

> **Exact identity may establish shared source context. It does not establish execution lineage.**

If:

```text
GitHub workflow run
headSha = abc123
```

and:

```text
Vercel deployment
githubCommitSha = abc123
```

for Resources already connected by:

```text
GitHub repository
source_for
Vercel project
```

then Combie may potentially say:

```text
These provider records reference the same Git commit.
```

Combie must NOT automatically say:

```text
The workflow created the deployment.
The deployment was triggered by the workflow.
The workflow caused the deployment.
The deployment belongs to the workflow.
These records are part of the same incident.
```

Sprint 034 must preserve this distinction.

---

# Baseline

Begin from the clean committed Sprint 033 baseline.

Expected Sprint 033 research commits include:

```text
ae87e3e
research completion
```

and:

```text
e367e85
docs SHA record
```

Do not assume short SHAs are current HEAD.

Verify:

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

Record the exact full current HEAD SHA and commit message.

If Sprint 033 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 033 and Sprint 034.

---

# Sprint Type

Sprint 034 is:

```text
RESEARCH / EXACT CROSS-PROVIDER MATCH PRESSURE
```

Expected:

```text
zero production changes
zero test changes
zero schema changes
zero provider contract changes
```

Primary artifact:

```text
docs/internal/sprints/SPRINT-034.md
```

The Sprint must finish with exactly one bounded recommendation for Sprint 035.

---

# Required Reading

Before research, read:

- `skills/build-combie/SKILL.md`
- Combie Canon
- SPRINT-005
- SPRINT-006
- SPRINT-020
- SPRINT-021
- SPRINT-023
- SPRINT-024
- SPRINT-029
- SPRINT-031
- SPRINT-033
- SPRINT-034

Focus especially on:

```text
source_for relationship semantics
provider-native evidence models
provider chronology semantics
Fact semantics
investigation boundaries
correlation deferrals
```

Do not reopen unrelated architecture.

---

# Repository Understanding Report

Inspect the exact current models and normalization paths for:

- `GitHubWorkflowRunEvidence`
- GitHub workflow-run raw API response
- GitHub `headSha` normalization
- GitHub repository binding
- `VercelDeploymentEvidence`
- Vercel deployment raw API response
- Vercel `meta`
- `meta.githubCommitSha`
- any existing Vercel git metadata
- Vercel project binding
- canonical `source_for` Relationships
- `InvestigationContext`
- provider chronology
- provider evidence grouping
- detailed investigation formatter
- existing tests/fixtures

Explicitly answer:

1. Where does GitHub `headSha` come from?
2. Is `headSha` always present?
3. Is it normalized or stored exactly?
4. Is it commit identity for the workflow run itself?
5. Does GitHub expose repository identity separately?
6. Where does Vercel `meta.githubCommitSha` come from?
7. Is the field present in the raw response type today?
8. Is it currently dropped during normalization?
9. Is `meta.githubCommitSha` optional?
10. Under which deployment source types might it be absent?
11. Is Vercel repository identity already available elsewhere on deployment or project evidence?
12. Does project-level `source_for` provide enough Resource scope to prevent global SHA matching?
13. Could the same SHA legitimately appear across unrelated repositories?
14. Does exact SHA equality need repository scoping? Expected: yes.
15. Can all research remain offline over fixtures/current code?
16. Is any provider API call needed just to answer structural questions?

No implementation before this report.

---

# Architecture Pressure Report

Answer:

1. What exact semantic would an evidence match represent?
2. Does exact SHA equality prove only shared commit identity?
3. Does it prove workflow→deployment lineage? Expected: no.
4. Does `source_for` provide sufficient Resource-level scope?
5. Is `source_for` itself enough, or is explicit repo identity on both evidence rows also required?
6. Could monorepos complicate the meaning?
7. Could forks complicate the meaning?
8. Could mirrored repositories complicate the meaning?
9. Could identical commit SHAs exist in separate repositories?
10. Could merge commits / squash / rebases break matching?
11. Could Vercel use a commit SHA different from the GitHub workflow's `headSha`?
12. Could a deployment be created manually from the same commit without a corresponding workflow?
13. Could many workflow runs share the same SHA?
14. Could many deployments share the same SHA?
15. Is the match one-to-one, one-to-many, or many-to-many?
16. Should matching be ephemeral?
17. Should matching be persisted?
18. Should it become a Relationship?
19. Should it become a generic correlation primitive?
20. Does the match belong inside InvestigationContext composition?
21. Is any new generic domain abstraction earned?
22. Does Canon need to change?

Prefer the weakest safe semantic.

---

# Candidate Match Semantic

Pressure-test a narrow semantic such as:

```text
same_git_commit
```

or:

```text
references_same_commit
```

This is conceptual only.

Do not choose final naming without research.

The intended meaning would be:

> Two provider evidence records reference the same exact Git commit, and their owning Resources are already structurally connected by Combie.

This is an evidence association.

It is not an execution relationship.

---

# Scope Requirement

Global SHA matching is forbidden.

Never match:

```text
GitHub workflow run A
headSha = X
```

to:

```text
Vercel deployment B
gitCommitSha = X
```

solely because:

```text
X == X
```

The match must be constrained by an already-proven Resource relationship.

Minimum expected scope:

```text
GitHub repository
source_for
Vercel project
```

Then:

```text
workflowRun.resourceId == GitHub repository
deployment.resourceId == Vercel project
```

and:

```text
workflowRun.headSha == deployment.gitCommitSha
```

Only then is the candidate association eligible.

Pressure-test whether this is sufficient.

---

# Exact Identity Only

Do not use:

```text
branch name
display name
repository name
deployment name
workflow name
timestamps
commit message
fuzzy SHA prefix
short SHA
```

as matching keys.

Candidate matching must use exact normalized full commit SHA equality.

Do not normalize by truncation.

Do not fuzzy-match.

---

# Case / Canonicalization

Research:

1. Are Git SHAs always lowercase hex in both provider payloads?
2. Can either provider return uppercase?
3. Should comparison normalize case?
4. Should whitespace be trimmed?
5. Should malformed values be rejected?
6. Should SHA length be validated?
7. Does Combie need a generic GitCommit identity helper?

Default conservative:

```text
normalize trivial representation only
do not invent identity where provider values are malformed
```

Do not add production helpers in this Sprint.

---

# Vercel Evidence Enrichment Pressure

Sprint 033 found:

```text
Vercel raw deployment meta.githubCommitSha
```

is typed but dropped.

Sprint 034 must determine whether Sprint 035 should first enrich Vercel deployment evidence with:

```text
gitCommitSha
```

before implementing matching.

Questions:

1. Is the field sufficiently stable?
2. Is it safe to persist?
3. Is it non-secret?
4. Does it create excessive metadata?
5. Is it provider-native evidence?
6. Does it belong on deployment evidence rather than project Resource metadata?
7. Should repo org/name/ref also be preserved?
8. What is the smallest needed enrichment?

Do not implement enrichment in Sprint 034.

---

# GitHub Evidence Pressure

Inspect whether GitHub `headSha` is already sufficient.

Questions:

1. Is it persisted on every workflow run fixture?
2. Is it optional?
3. Does rerun behavior preserve the same `headSha`?
4. Is it the branch head SHA or pull-request merge SHA?
5. Does GitHub Actions use merge commits for PR workflows?
6. Could this diverge from Vercel's deployment commit identity?
7. Does that make matching incomplete but still safe?

Important distinction:

```text
incomplete matching
```

can be acceptable.

```text
false matching
```

is not.

---

# Many-to-Many Pressure

Do not assume one workflow run maps to one deployment.

Research realistic cardinalities.

Possible:

```text
1 commit
→ multiple workflow runs
```

because multiple workflows can run for the same commit.

Possible:

```text
1 commit
→ multiple Vercel deployments
```

because preview/prod/redeployments can share the same commit.

Therefore:

```text
same commit
```

may naturally produce:

```text
many-to-many evidence groups
```

Pressure-test whether the product should show:

```text
COMMIT abc123

GitHub workflow runs
- 9001
- 9002

Vercel deployments
- dpl_1
- dpl_2
```

rather than pairwise "matches."

This may be semantically cleaner.

---

# Candidate Model A — Pairwise Ephemeral Association

Conceptually:

```text
ProviderEvidenceMatch {
  kind: "same_git_commit"
  left: GitHubWorkflowRunEvidence
  right: VercelDeploymentEvidence
  basis:
    gitCommitSha
    sourceForRelationship
}
```

Research:

- simple?
- too pairwise?
- duplicates under many-to-many?
- good for agents?
- easy to provenance?

Do not implement.

---

# Candidate Model B — Commit Group

Conceptually:

```text
GitCommitEvidenceGroup {
  commitSha
  sourceRepository
  targetProject
  sourceForRelationship
  workflowRuns[]
  deployments[]
}
```

This may better represent many-to-many shared identity without pretending each pair has special meaning.

Research:

1. Is this more semantically honest?
2. Is a group still ephemeral?
3. Does grouping look too much like correlation?
4. Is it merely identity-based organization?
5. Would the group be useful to humans?
6. Would it be useful to agents?
7. Would it require generic Event/EventGroup architecture? Expected: no.

Do not implement.

---

# Candidate Model C — Durable Evidence Relationship

Research whether to persist a narrow evidence-level relationship.

Potential concept:

```text
references_same_commit
```

Pressure-test carefully.

Questions:

1. Does the association remain stable across sync?
2. Can stale evidence make persisted associations misleading?
3. Would cleanup semantics be difficult?
4. Does persistence provide real value over recomputation?
5. Would this create a second Relationship system for evidence?
6. Does that architecture feel earned?

Default skepticism.

---

# Ephemeral vs Durable

Sprint 034 must explicitly compare.

## Ephemeral

Advantages:

```text
computed from evidence currently in InvestigationContext
no schema
no cleanup
no stale edge maintenance
easy to revise semantics
```

Risks:

```text
recomputed each read
not globally queryable
```

## Durable

Advantages:

```text
queryable
persistent association
```

Risks:

```text
staleness
cleanup
authority
new domain model
evidence relationship semantics
```

Given Combie's prior architecture, ephemeral is the expected default unless research proves otherwise.

---

# Authority Pressure

Matching must respect evidence authority.

Questions:

1. Can retained evidence with unknown current authority participate?
2. If yes, how must it be labeled?
3. Does matching two retained rows imply current relevance?
4. Should only known-populated evidence participate?
5. Does current row-membership uncertainty matter?
6. If exact row membership in latest success is unknown, can same-commit grouping still truthfully operate over "retained known evidence"?
7. Should output say:

```text
Combie holds evidence referencing commit X
```

rather than:

```text
current evidence references commit X
```

This boundary matters.

Do not require "current" semantics if the safe product claim is simply about retained known evidence.

---

# Time Semantics

Commit equality must not use temporal ordering as matching evidence.

Do not require:

```text
workflow before deployment
deployment after workflow
within N minutes
```

as part of the match.

Time can remain displayed evidence.

It must not be part of the candidate identity relationship unless future research separately earns that.

---

# Correlation Boundary

Sprint 034 is the first serious cross-provider evidence matching research.

Be precise.

Potentially safe:

```text
These provider records reference the same Git commit.
```

Potentially unsafe:

```text
These records correspond to the same deployment workflow.
```

Unsafe:

```text
The workflow triggered the deployment.
```

Unsafe:

```text
The deployment resulted from this workflow run.
```

Unsafe:

```text
The workflow failure caused the deployment failure.
```

Do not let `match` terminology imply causality.

---

# Relationship Boundary

The existing:

```text
source_for
```

Relationship is between:

```text
GitHub repository
→
Vercel project
```

The candidate same-commit association is between evidence records.

Do not overload `source_for`.

Do not create:

```text
workflow_run source_for deployment
```

That would be semantically wrong.

Research whether evidence associations should remain separate from Resource Relationships entirely.

---

# Scenario A — One Workflow, One Deployment, Same SHA

Use:

```text
GitHub workflow run
headSha = A

Vercel deployment
gitCommitSha = A

Resources connected by source_for
```

Ask:

1. Is the match deterministic?
2. Is the semantic useful?
3. Does any false-positive risk remain?
4. Is pairwise representation natural?

---

# Scenario B — One Workflow, Different Deployment SHA

Use:

```text
workflow A
deployment B
A != B
```

Expect:

```text
no match
```

No fuzzy fallback.

---

# Scenario C — Same SHA, Unrelated Resources

Use:

```text
repository X
project Y

same SHA
but no source_for
```

Expect:

```text
no match
```

This is a hard safety case.

---

# Scenario D — Multiple Workflow Runs, One Deployment

Use:

```text
workflow 1 SHA=A
workflow 2 SHA=A
deployment SHA=A
```

Ask:

1. Pairwise duplicates?
2. Would commit grouping be cleaner?
3. How should CLI represent it?

---

# Scenario E — One Workflow, Multiple Deployments

Use:

```text
workflow SHA=A
deployment 1 SHA=A
deployment 2 SHA=A
```

Ask the same cardinality questions.

---

# Scenario F — Multiple Workflows + Multiple Deployments

Use:

```text
2+ workflow runs
2+ deployments
same SHA
```

Pressure-test pairwise explosion.

This scenario should strongly test whether commit grouping is the better abstraction.

---

# Scenario G — Missing Vercel Commit SHA

Use:

```text
workflow headSha exists
deployment gitCommitSha missing
```

Expected:

```text
no association
```

Do not fallback to branch/name/time.

---

# Scenario H — Missing GitHub headSha

Use:

```text
deployment gitCommitSha exists
workflow headSha missing
```

Expected:

```text
no association
```

---

# Scenario I — Unknown Authority + Retained Same-SHA Evidence

Use retained rows where current authority is unknown.

Ask:

1. Can the evidence still be grouped truthfully?
2. Should output say retained/known evidence?
3. Does the association remain useful?
4. Would current-language be misleading?

---

# Scenario J — PR / Merge Commit Shape

Use fixture or documented GitHub behavior if represented.

Pressure-test:

```text
GitHub workflow headSha
```

versus:

```text
Vercel commit SHA
```

for PR workflows.

Determine whether safe matching may have false negatives.

False negatives may be acceptable.

False positives are not.

---

# Official Evidence Research

If repository inspection cannot establish the semantics of Vercel `meta.githubCommitSha` or GitHub `headSha`, use official provider documentation/API specifications.

Research only from primary sources.

Verify:

## Vercel

- deployment metadata fields
- `meta.githubCommitSha`
- when it is populated
- source provider conditions
- stability
- privacy/security implications
- commit identity semantics

## GitHub

- workflow run `head_sha`
- meaning for push/PR workflows
- rerun behavior
- exact identity semantics

Record source URLs in Sprint completion notes if the Sprint protocol allows links.

Do not rely on blogs or third-party docs for technical semantics.

---

# Security

Commit SHAs are not secrets.

Still verify:

- no tokens
- no auth headers
- no environment secrets
- no private payload dumping

Do not recommend persisting arbitrary Vercel `meta`.

Only the minimal allowlisted commit identity field should be considered.

---

# Human Value Study

Mock hypothetical investigation output.

Example:

```text
SHARED COMMIT CONTEXT

Commit abc123

GitHub workflow runs
• 9001 · ci · conclusion=failure

Vercel deployments
• dpl_1 · readyState=ERROR

Basis
• exact Git commit SHA
• repository source_for project
```

Do not treat this exact copy as required.

Ask:

1. Does this remove the manual SHA comparison?
2. Does it reduce scanning materially?
3. Does it imply too much?
4. Is "shared commit context" safer than "matched evidence"?
5. Is commit grouping easier to understand than pairwise edges?

---

# Agent Value Study

Ask:

1. Would structured commit groups reduce agent reasoning work?
2. Could agents currently derive the match themselves?
3. Does putting the rule in Combie improve determinism?
4. Does it reduce accidental fuzzy correlation by downstream agents?
5. Is a structured association more valuable than CLI copy?
6. Does provenance remain exact?

This is an important argument for implementing the rule centrally if earned.

---

# Naming Study

Evaluate terminology.

Candidates:

```text
shared_commit
same_git_commit
references_same_commit
commit_context
git_commit_group
provider_evidence_match
```

Reject names implying:

```text
triggered_by
deployed_by
caused_by
same_run
same_release
same_incident
```

Choose semantics before naming.

---

# Evidence Matrix

Produce a final matrix:

| Evidence | GitHub | Vercel | Authority | Required? | Notes |
|---|---|---|---|---|---|
| Full commit SHA | | | | | |
| Owning Resource | | | | | |
| Repository/project relationship | | | | | |
| Repo identity | | | | | |
| Branch/ref | | | | | |
| Provider timestamp | | | | | |

Separate:

```text
required for safe association
```

from:

```text
nice-to-have display context
```

---

# Match Safety Matrix

Evaluate:

| Scenario | Exact SHA | source_for | Match Safe? | Why |
|---|---:|---:|---|---|
| Same SHA, related Resources | yes | yes | | |
| Same SHA, unrelated Resources | yes | no | no | |
| Different SHA, related Resources | no | yes | no | |
| Missing SHA | partial | yes | no | |
| Same SHA, multiple runs/deployments | yes | yes | group? | |
| Unknown authority retained rows | yes | yes | qualified? | |

---

# Architecture Decision

At completion choose exactly one.

## A — Implement Ephemeral Shared-Commit Context

Choose if:

```text
exact SHA
+
existing source_for scope
```

is sufficiently reliable and useful.

Sprint 035 should:

1. enrich Vercel deployment evidence with commit SHA if required;
2. add a pure ephemeral shared-commit projection;
3. expose it in investigate;
4. preserve provider-specific evidence;
5. avoid durable association storage.

---

## B — Implement Vercel Commit Evidence Enrichment First

Choose if commit identity is useful but the safest next slice is only to preserve `meta.githubCommitSha` in normalized Vercel deployment evidence.

Sprint 035 should enrich evidence only.

Matching would wait for Sprint 036.

---

## C — Persist a Narrow Evidence Association

Choose only if durable persistence is clearly justified.

This should have a very high bar.

Explain why ephemeral recomputation is insufficient.

---

## D — Vercel Commit Identity Is Too Unreliable

Choose if the provider field is too inconsistent or ambiguous.

Name the next evidence improvement.

---

## E — Exact Same-Commit Association Is Safe but Not Product-Useful Enough

Choose if technically feasible but does not materially reduce investigation work.

Defer.

---

## F — Another Narrow Finding

Use only if research reveals a more precise result.

Name it exactly.

---

# Recommendation Criteria

The winning recommendation should maximize:

```text
false-positive resistance
determinism
provenance
investigation value
human scanning reduction
agent grounding value
```

while minimizing:

```text
semantic overreach
new persistence
generic architecture
provider coupling
```

False negatives are preferable to false positives.

---

# Validation

Sprint 034 is research-only.

Run:

```bash
bun test
bun run typecheck
git diff --check
git status
```

Expected baseline:

```text
572 tests
```

Expected final:

```text
572 tests
```

unless baseline changes unrelatedly.

Perform:

- secret scan
- staged diff review
- full diff review

Expected:

```text
zero src changes
zero test changes
zero schema changes
zero provider changes
```

---

# Completion Notes

Update `docs/internal/sprints/SPRINT-034.md` with:

## Baseline

Exact Sprint 033 HEAD SHA.

## Repository Understanding

GitHub + Vercel evidence models.

## Architecture Pressure

Safe semantic boundary.

## GitHub headSha

Exact meaning, optionality, edge cases.

## Vercel githubCommitSha

Exact meaning, optionality, source conditions, normalization gap.

## source_for Scope

Why Resource scoping matters.

## Exact Match Rule

Candidate deterministic predicate.

## Many-to-Many

Cardinality findings.

## Ephemeral vs Durable

Decision pressure.

## Authority

Retained/current semantics.

## PR / Merge Commit Caveats

False-negative risks.

## Security

Commit metadata safety.

## Human Value

Output study.

## Agent Value

Structured match value.

## Naming Study

Recommended terminology.

## Evidence Matrix

Completed.

## Match Safety Matrix

Completed.

## Final Recommendation

Exactly one:

```text
A
B
C
D
E
F
```

## Sprint 035

One bounded next step.

## Validation

Tests/typecheck/diff/security.

## Canon Changes

Changes or `None`.

## Commit

Exact Sprint 034 SHA.

---

# Explicit Questions

Answer all:

1. Is GitHub `headSha` sufficiently authoritative for exact commit identity?
2. Is Vercel `meta.githubCommitSha` sufficiently authoritative?
3. Is the Vercel field currently dropped during normalization?
4. Is it safe to persist?
5. Is it always present?
6. When is it absent?
7. Does exact SHA equality alone suffice? Expected: no.
8. Is existing `source_for` scope sufficient?
9. Is additional repository identity required?
10. Can the same SHA appear across unrelated repositories?
11. Can multiple workflow runs share one SHA?
12. Can multiple deployments share one SHA?
13. Is pairwise matching the wrong abstraction under many-to-many?
14. Is commit grouping more semantically honest?
15. Can retained evidence with unknown authority participate?
16. What qualification is required?
17. Does row-membership uncertainty block same-commit grouping?
18. Can false negatives occur due to PR merge/squash semantics?
19. Are false negatives acceptable?
20. What would create false positives?
21. Does the association imply execution lineage? Expected: no.
22. Does it imply causality? Expected: no.
23. Should it be ephemeral?
24. Should it be persisted?
25. Does a new generic correlation primitive need to exist? Expected: no.
26. Does the match materially help humans?
27. Does it materially help agents?
28. Which A/B/C/D/E/F recommendation wins?
29. What exactly should Sprint 035 do?

---

# Definition of Done

- [ ] Sprint 033 clean baseline verified
- [ ] exact baseline SHA recorded
- [ ] SKILL protocol followed
- [ ] Canon read
- [ ] relevant Sprints reviewed
- [ ] Repository Understanding completed
- [ ] Architecture Pressure completed
- [ ] GitHub headSha semantics verified
- [ ] Vercel githubCommitSha semantics verified
- [ ] Vercel normalization gap confirmed or rejected
- [ ] source_for scoping analyzed
- [ ] global SHA matching rejected
- [ ] exact identity rule defined
- [ ] normalization/canonicalization analyzed
- [ ] many-to-many cardinality analyzed
- [ ] pairwise association pressure-tested
- [ ] commit-group model pressure-tested
- [ ] ephemeral model pressure-tested
- [ ] durable model pressure-tested
- [ ] authority semantics analyzed
- [ ] retained evidence semantics analyzed
- [ ] PR/merge caveats analyzed
- [ ] false-positive risks documented
- [ ] false-negative risks documented
- [ ] security reviewed
- [ ] human value studied
- [ ] agent value studied
- [ ] terminology studied
- [ ] Evidence Matrix completed
- [ ] Match Safety Matrix completed
- [ ] exactly one A/B/C/D/E/F recommendation selected
- [ ] Sprint 035 bounded precisely
- [ ] no production implementation
- [ ] no test implementation
- [ ] no schema changes
- [ ] no provider changes
- [ ] no matching implementation
- [ ] no correlation engine
- [ ] no causality
- [ ] no AI
- [ ] full tests pass
- [ ] typecheck passes
- [ ] secret scan clean
- [ ] diff/whitespace checks clean
- [ ] completion notes updated
- [ ] Canon changes recorded or None
- [ ] Sprint 034 committed separately
- [ ] worktree clean
- [ ] Sprint 035 not started

---

# Explicitly Out of Scope

Do not implement:

- Vercel commit enrichment
- shared-commit projection
- evidence matching
- commit groups
- evidence Relationships
- persistent match tables
- generic correlation
- CorrelationEngine
- MatchingEngine
- SHA fuzzy matching
- branch-name matching
- timestamp matching
- workflow→deployment lineage
- triggered_by
- deployed_by
- caused_by
- incident grouping
- causality
- root-cause analysis
- anomaly detection
- new providers
- new evidence families
- new Resource Relationships
- recursive traversal
- AI/LLM
- embeddings
- logs
- metrics
- traces
- webhooks
- MCP/API/SDK/UI
- controlled execution
- Sprint 035 scaffolding

---

# Final Principle

> **Match exact identity only inside already-proven structural context.**

And:

> **Shared commit does not mean shared cause.**

---

# Completion Notes — Sprint 034

> Research only. Zero production / test / schema / provider changes.

## Baseline

```text
Sprint 033 research commits present:
  ae87e3e docs(sprint): complete Sprint 033 post-cleanup investigation pressure research
  e367e85 docs(sprint): record Sprint 033 commit SHA

Exact baseline HEAD (start of Sprint 034):
  e367e85d2cfbeba63df92943a4783393bc2664b8
  message: docs(sprint): record Sprint 033 commit SHA

Validation at baseline:
  bun test      → 572 pass, 0 fail
  bun run typecheck → clean
  git status    → clean of tracked changes; only untracked SPRINT-034.md (this research)
```

Sprint 033 is complete. Worktree is research-only. Sprint 034 did not combine incomplete Sprint 033 work.

---

## Repository Understanding

### GitHub workflow-run evidence

| Layer | Finding |
|---|---|
| Type | `GitHubWorkflowRunEvidence` in `src/providers/github/workflow-run.ts` |
| Field | `headSha: string \| null` — “fact only — not used for correlation” (today) |
| Raw API | `GitHubWorkflowRunListItem.head_sha?: string` in `client.ts` |
| Normalize | `headSha: asNonEmptyString(raw.head_sha)` — optional; blank → `null`; run still accepted |
| Persistence | Column `github_workflow_runs.head_sha TEXT` (nullable); upserted and listed |
| Resource binding | `resourceId = github:repository:<numeric-id>`; `repositoryId` is exact join key |
| Investigation | Loaded on subject (GitHub repo) and one-hop neighbors; CLI prints `head sha:` when present |
| Authority | Refresh + `resultCount` cardinality; retained rows on failure/empty; not deletion authority |

**Answers (repo code):**

1. **Where does headSha come from?** GitHub Actions list/get workflow-run payload field `head_sha`.
2. **Always present?** Official schema marks `head_sha` **required**. Combie treats it optional for defensive normalization.
3. **Normalized or stored exactly?** Trimmed via `asNonEmptyString`; otherwise stored as provided (no case fold today).
4. **Commit identity for the run itself?** Yes — the head commit SHA the workflow run is associated with (provider-native).
5. **Repository identity separately?** Yes — `repository.id` required for normalize; bound to Resource `github:repository:<id>`.

### Vercel deployment evidence

| Layer | Finding |
|---|---|
| Type | `VercelDeploymentEvidence` — **no commit SHA field** |
| Raw | `meta?: unknown` on `VercelDeploymentRaw` / list item — **not** a typed `githubCommitSha` property |
| Fixture | `meta.githubCommitSha: "abc123def456"` (short) plus secret-like message/author |
| Normalize | Parameter type **omits `meta`**; whole bag dropped |
| Test proof | `deployment-normalize.test.ts` freezes key allowlist; excludes `githubCommitMessage` / meta |
| Persistence | `vercel_deployments` has no SHA column |
| Resource binding | Exact `projectId` → `vercel:project:<id>` |
| Project git | `metadata.git` from `project.link` (org/repo/repoId) used for `source_for` only |
| Investigation | Deployments on subject/neighbors; CLI shows uid/state/times/source — **no commit** |

**Answers (repo code):**

6. **Where does githubCommitSha come from?** Vercel deployment `meta` object (“Metadata information from the Git provider” per list-deployments API).
7. **Present in raw type today?** Only as untyped `meta?: unknown`; not a named typed field.
8. **Dropped during normalization?** **Yes.** Entire `meta` unread.
9. **Optional?** Yes. Fixture CLI deployment has no meta; git deployment has it.
10. **Absent under which sources?** CLI without meta, drop/import, non-Git-provider deployments, or any path that does not populate Git provider meta.
11. **Repo identity elsewhere?** Project-level `metadata.git` (for Relationships); not on deployment evidence today.
12. **source_for enough to prevent global SHA match?** Yes, when match requires existing `source_for` between owning Resources.
13. **Same SHA across unrelated repos?** Possible in principle (forks/mirrors/identical content objects) — global match forbidden.
14. **SHA equality need repo scoping?** Yes via Resource `source_for` (preferred) and already-bound `resourceId`s.
15. **Offline research sufficient?** Yes for structure.
16. **Live API needed?** No for structural answers; official docs used for field semantics.

### source_for, InvestigationContext, authority

- Relationships: only `source_for` | `uses_domain_in`.
- `source_for`: GitHub repository → Vercel project from project `metadata.git` (`repoId` primary, exact `fullName` fallback).
- InvestigationContext is **ephemeral**, one-hop, offline composition.
- No existing evidence-row association / match types.
- Sprint 031: latest-response **row membership not stored**; `result_count` is cardinality only.
- Sprint 033: selected **D**; identified Vercel drop of `githubCommitSha` as the blocker for deterministic match.

---

## Architecture Pressure

| # | Question | Answer |
|---|---|---|
| 1 | Exact semantic? | Owning provider evidence records **reference the same exact Git commit**, within an already-proven Resource relationship. |
| 2 | SHA equality prove only shared commit? | Yes, when scoped. |
| 3 | Prove workflow→deployment lineage? | **No.** |
| 4 | source_for sufficient Resource scope? | **Yes** as minimum structural gate. |
| 5 | Explicit repo identity on both rows also required? | **Not additionally** if both rows’ `resourceId`s are the endpoints of a proven `source_for`. Repo identity is already encoded by those Resources + Relationship evidence. |
| 6 | Monorepos? | One repo may source multiple projects; grouping is per `(commitSha, source_for edge)`. Not false positive. |
| 7 | Forks? | Different repo Resources; no `source_for` to wrong project → no match. |
| 8 | Mirrors? | Same — only proven edges match. |
| 9 | Identical SHAs in separate repos? | Content-addressed objects / shared history can share SHAs → **global equality forbidden**. |
| 10 | Merge/squash/rebase break matching? | Can cause **false negatives** (different SHAs for related work); never force a fuzzy match. |
| 11 | Vercel SHA differ from workflow headSha? | Yes under PR merge-commit workflows, squash merge after CI, redeploys of different refs, CLI meta injection. |
| 12 | Manual deploy same commit without workflow? | Yes → commit group may show deployments only (or workflows only); still truthful as shared commit among present evidence. |
| 13 | Many workflows same SHA? | Yes (multiple workflows on one push). |
| 14 | Many deployments same SHA? | Yes (preview/prod/redeploy). |
| 15 | Cardinality? | **Many-to-many.** |
| 16 | Ephemeral? | **Yes (default).** |
| 17 | Persisted association? | **No** — high bar not met. |
| 18 | New Relationship kind? | **No** — do not overload Resource Relationships. |
| 19 | Generic correlation primitive? | **No.** |
| 20 | Belong in InvestigationContext composition? | **Yes** as ephemeral projection (like Facts / Provider Activity). |
| 21 | New generic domain abstraction? | **No** — narrow commit-group projection only. |
| 22 | Canon change? | **None.** |

**Weakest safe semantic:**

```text
Combie holds GitHub and/or Vercel evidence that reference the same exact Git commit,
for Resources already connected by source_for.
```

Not:

```text
current production pipeline ran this commit
the workflow created the deployment
same incident / release / cause
```

---

## GitHub headSha semantics

**Primary source:** [GitHub REST — workflow runs](https://docs.github.com/en/rest/actions/workflow-runs)

- Response schema: `head_sha` is **required string** on Workflow Run objects.
- Filter parameter `head_sha` returns runs associated with that SHA — confirms it is the association key for the run.
- Reruns keep the same run id; head commit identity for the run remains the head SHA of that run (attempt number updates).

**PR / merge caveat (primary source):** [Events that trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)

- For `pull_request`, `GITHUB_SHA` is the **last merge commit of the PR merge branch**, not necessarily `pull_request.head.sha`.
- Workflow run `head_sha` for PR events commonly tracks that merge test commit.
- Vercel Git integrations typically deploy the **PR head commit** (branch tip), not GitHub’s synthetic merge commit.

**Implication:** Exact SHA equality can **miss** true “same PR work” pairs → **false negatives**. Acceptable. Never fallback to branch/time.

**Authoritative enough for exact identity?** **Yes** — when present, it is provider-native commit identity for that workflow run. Incomplete coverage under PR merge semantics does not make matches unsafe.

---

## Vercel githubCommitSha semantics

**Primary sources:**

- [List deployments](https://vercel.com/docs/rest-api/reference/endpoints/deployments/list-deployments) — `meta`: “Metadata information from the Git provider.”
- [Get deployment](https://vercel.com/docs/rest-api/reference/endpoints/deployments/get-a-deployment-by-id-or-url) — `meta` is object of string properties; also documents `sha` query filter on list.
- [vercel list CLI](https://vercel.com/docs/cli/list) — official filter example:

```text
vercel ls -m githubCommitSha=de8b89f13b2bc164cf07e735921bf5513e17951d
```

- [Vercel KB branch meta](https://vercel.com/kb/guide/branch-variables-and-domains-not-linked-to-cli-deployments) documents meta keys including `githubCommitSha`, `githubCommitRef`, `githubCommitOrg`, `githubCommitRepo`, `githubCommitMessage` for GitHub-linked deploys / CLI meta injection.

**Semantics:** Provider-supplied Git commit identity for the deployment when Git provider metadata is present. Used officially as a deployment filter key.

**Optional:** Yes — not present for all sources (CLI without meta, drop, non-git).

**Authoritative enough?** **Yes for exact identity when present and full-shaped.** Not a lineage/trigger claim.

**Short values:** Fixture uses 12-char hex; KB CLI example used a short form. Matching must **reject non-full SHAs** (no prefix equality). Prefer requiring canonical full hex length (40 for SHA-1; 64 if SHA-256 appears).

---

## Vercel normalization gap

**Confirmed.**

```text
Raw list item: meta?: unknown  (may contain githubCommitSha)
normalizeDeployment: does not accept or read meta
VercelDeploymentEvidence: no gitCommitSha
SQLite vercel_deployments: no sha column
Test: freezes evidence keys without any commit field
```

Enrichment prerequisite for any match: allowlist **only** `meta.githubCommitSha` → optional `gitCommitSha` on evidence. Never store raw `meta`, messages, authors, env, urls.

---

## source_for scope

```text
GitHub repository Resource
  --source_for-->
Vercel project Resource

workflowRun.resourceId  === repository.id
deployment.resourceId   === project.id
```

**Global SHA equality is FORBIDDEN.**

`source_for` is the structural scope. Do **not** create `workflow source_for deployment`. Evidence associations stay separate from Resource Relationships.

Is repo identity additionally required on evidence rows? **No extra field required for the gate** beyond:

1. owning Resource ids on each evidence row (already present), and  
2. a persisted `source_for` edge between those Resources.

Optional display of `repository` / `fullName` from Relationship evidence is fine; not a match key.

---

## Exact candidate match rule

```text
ELIGIBLE when all of:

1. exists Relationship R where
     R.kind == "source_for"
     AND R.sourceResourceId == workflowRun.resourceId
     AND R.targetResourceId == deployment.resourceId

2. workflowRun.headSha is present and match-canonical

3. deployment.gitCommitSha is present and match-canonical
   (after future enrichment; not available today)

4. canonical(workflowRun.headSha) == canonical(deployment.gitCommitSha)

NOT used as match keys:
  branch, deployment name, workflow name, timestamps,
  commit message, short SHA, fuzzy prefix, time windows
```

### Canonicalization (comparison only; research prescription)

```text
1. require string
2. trim whitespace
3. lowercase hex
4. accept only full shape: /^[0-9a-f]{40}$/ or /^[0-9a-f]{64}$/
5. equality of full strings
6. never truncate
7. never accept prefixes
8. malformed → ineligible (no inventing identity)
```

Do not implement a generic GitCommit domain helper until a second consumer appears.

---

## Many-to-many findings

| Pattern | Realistic? | Pairwise effect | Group effect |
|---|---|---|---|
| 1 workflow × 1 deployment | Yes | Natural | Natural |
| N workflows × 1 deployment | Yes (many workflows per push) | N pair edges | One group |
| 1 workflow × M deployments | Yes (preview/prod/redeploy) | M pair edges | One group |
| N × M | Yes | N×M explosion | One group |

**Pairwise is unnecessarily combinatorial** under realistic cardinality. It implies each pair is a special association when the honest fact is shared identity.

---

## Pairwise vs commit-group

| Model | Verdict |
|---|---|
| Pairwise `same_git_commit(run, deployment)` | Simple for 1:1; duplicative and misleading under N×M |
| **Commit group** | **Preferred.** One identity, two member lists |

Conceptual (not implemented):

```text
GitCommitEvidenceGroup {
  commitSha            // canonical full SHA
  sourceRepositoryId   // github resource id
  targetProjectId      // vercel resource id
  sourceForRelationshipId
  workflowRuns[]       // GitHubWorkflowRunEvidence members
  deployments[]        // VercelDeploymentEvidence members
  basis: "exact_git_commit_sha + source_for"
}
```

Still **ephemeral** identity-based organization — **not** a CorrelationEngine, EventGroup architecture, or incident.

---

## Ephemeral vs durable

| | Ephemeral | Durable association table |
|---|---|---|
| Schema | None for association | New tables + cleanup |
| Staleness | Recomputed from held evidence | Stale edges risk |
| Authority | Inherits evidence authority wording | Easy to over-claim “current” |
| Value of persistence | Low — pure function of known fields | Queryability not needed yet |
| Second relationship system | Avoided | Created |

**Decision: ephemeral only.** Persistence fails the high bar (C).

---

## Authority / retained evidence / row membership

Sprint 031: exact latest-response row membership is **not** persisted.

| Claim | Safe? |
|---|---|
| “Among retained known evidence, these records reference commit X” | **Yes** |
| “Current GitHub and Vercel evidence both reference commit X” | **Only if** membership proven — **not available today** |
| Group retained rows under `unknown` | **Yes**, with qualification (`may be stale` / retained) |
| Block all grouping until membership exists | **No** — membership blocks **current** claims, not shared-identity claims over held evidence |

Safe product language:

```text
SHARED COMMIT CONTEXT (among held evidence)

Commit <fullsha>
…
Basis: exact Git commit SHA · repository source_for project
Authority follows each member’s provider evidence authority
```

---

## PR / merge caveats (false negatives)

| Case | Risk |
|---|---|
| PR workflow `head_sha` = merge commit; Vercel = PR head | FN |
| Squash merge: CI on pre-squash SHA; deploy post-squash | FN |
| Rebase rewrites SHAs | FN |
| Force-push | FN for old runs/deploys |
| Rerun same head | Still same SHA — OK |
| CLI deploy with incomplete/short meta | No match / ineligible |
| Non-git Vercel source | No SHA → no match |

**False negatives acceptable. False positives not.**

---

## False-positive risks

What would create FPs:

1. Global SHA equality without `source_for`
2. Short / prefix SHA matching
3. Branch-name or timestamp proximity fallbacks
4. Treating match as trigger/lineage/incident
5. Matching across wrong Resource endpoints

Mitigations: exact full SHA + `source_for` only; no fallbacks; careful wording.

---

## Security

| Item | Verdict |
|---|---|
| Full commit SHA | Non-secret public object id (same class as GitHub `headSha` already stored) |
| Commit message | **Do not persist** (fixture proves secret-like content) |
| Author name/email | Do not persist for this purpose |
| Raw `meta` blob | Do not persist |
| Env / urls / creator | Already excluded — keep excluded |
| Allowlist | Only `gitCommitSha` from `meta.githubCommitSha` |

---

## Human value

Hypothetical output:

```text
SHARED COMMIT CONTEXT

Commit abc123def4567890abc123def4567890abc123de

GitHub workflow runs
• 9001 · CI · conclusion=failure

Vercel deployments
• dpl_1 · readyState=ERROR

Basis
• exact Git commit SHA
• repository source_for project
```

| Question | Answer |
|---|---|
| Removes manual SHA comparison? | **Yes** — primary Sprint 033 friction |
| Reduces scanning? | Yes for the common deploy↔workflow question |
| Implies too much if worded carefully? | No |
| “Shared commit context” safer than “matched evidence”? | **Yes** — identity group, not pair magic |
| Group easier than pairwise edges? | **Yes** |

---

## Agent value

| Question | Answer |
|---|---|
| Structured groups reduce agent work? | **Yes** — join is deterministic product output |
| Agents can derive match themselves? | Only after Vercel SHA enrichment; still error-prone wording/fuzzy risk |
| Central rule improves determinism? | **Yes** |
| Reduces accidental fuzzy correlation? | **Yes** |
| Structured association > CLI-only? | **Yes** for agents; CLI still helps humans |
| Provenance exact? | Yes if basis fields and Relationship id are carried |

---

## Naming study

| Candidate | Verdict |
|---|---|
| `shared_commit` | Good short label |
| `same_git_commit` | Precise; good basis kind |
| `references_same_commit` | Safest long form for claims |
| `commit_context` / `git_commit_group` | Good product section / model names |
| `provider_evidence_match` | Too generic — reject as type name |

**Reject:** `triggered_by`, `deployed_by`, `caused_by`, `same_run`, `same_release`, `same_incident`.

**Recommended product name:** `SHARED COMMIT CONTEXT`  
**Recommended basis kind:** `same_git_commit` / `references_same_commit`  
**Recommended model name:** `GitCommitEvidenceGroup` (ephemeral)

---

## Scenarios A–J

| Scenario | Eligible? | Safe association? | FP risk | FN risk | Output semantics | Model |
|---|---|---|---|---|---|---|
| A same SHA + source_for | Yes | Yes | Low | Low | Shared commit group | Group |
| B different SHA + source_for | No | No | None | N/A | No group | None |
| C same SHA without source_for | No | **No** | High if allowed | N/A | Must not associate | None |
| D many workflows + one deploy | Yes | Yes | Low | Low | One group, N runs | **Group** |
| E one workflow + many deploys | Yes | Yes | Low | Low | One group, M deploys | **Group** |
| F many×many same SHA | Yes | Yes | Low if grouped | Low | One group | **Group** (pairwise explodes) |
| G missing Vercel SHA | No | No | None | High (enrichment gap today) | No association | None |
| H missing GitHub SHA | No | No | None | Low (rare per schema) | No association | None |
| I unknown authority + retained same SHA | Qualified yes | Yes as held evidence | Medium if worded “current” | Low | “Among held evidence…” | Group + authority tags |
| J PR/merge mismatch | No (SHA differs) | N/A | None | **High FN** | Acceptable miss | None |

---

## Evidence Matrix

| Evidence | GitHub | Vercel | Authority | Required for association? | Notes |
|---|---|---|---|---|---|
| Full commit SHA | `headSha` | `meta.githubCommitSha` → future `gitCommitSha` | Per-row optional | **Required** (both, full shape) | Exact identity |
| Owning Resource id | `resourceId` repo | `resourceId` project | N/A | **Required** | Binding |
| `source_for` Relationship | source endpoint | target endpoint | Relationship persisted | **Required** | Structural scope |
| Repo identity (repoId/fullName) | Resource + Relationship evidence | project `metadata.git` | On Relationship | Display / provenance; not extra gate if edge exists | Already used to create edge |
| Branch / ref | `headBranch` | future `githubCommitRef` optional | Optional | **Display only** | Not a match key |
| Provider timestamps | `createdAt` etc. | `createdAtMs` etc. | Optional | **Display only** | Not a match key |
| Workflow/deploy names | optional | n/a | Optional | Display only | Not a match key |
| Commit message | excluded | exclude | — | **Forbidden** | Secrets risk |
| Latest-response membership | not stored | not stored | — | Not required for held-evidence claim | Blocks “current” claim only |

---

## Match Safety Matrix

| Scenario | Exact SHA | source_for | Match safe? | Why |
|---|---:|---:|---|---|
| Same SHA, related Resources | yes | yes | **Yes** | Exact identity in proven structure |
| Same SHA, unrelated Resources | yes | no | **No** | Global match forbidden |
| Different SHA, related | no | yes | **No** | Exact only |
| Missing SHA either side | partial | yes | **No** | No inventing identity |
| Same SHA, many runs/deploys | yes | yes | **Yes (group)** | Many-to-many natural |
| Unknown authority retained rows | yes | yes | **Yes, qualified** | Held-evidence wording; not “current” |
| Short / prefix SHA | n/a | yes | **No** | Malformed / incomplete identity |
| Branch-only “match” | n/a | yes | **No** | Not exact commit identity |

---

## Final Recommendation

```text
A — Implement ephemeral shared-commit context next.
```

### Why A (not B/C/D/E/F)

| Option | Why not / why |
|---|---|
| **A** | **Wins.** Field semantics are reliable enough; match is product-valuable; false positives controllable; vertical slice removes Sprint 033 dominant friction. Enrichment is required but insufficient alone. |
| B | Valid smaller slice, but leaves the investigation gap open after one more sprint of work that still requires manual SHA comparison. Prefer completing the earned product value. |
| C | Durable associations fail high bar (staleness, cleanup, second relationship system). |
| D | Vercel identity is **not** too unreliable when present + full-shaped + scoped. |
| E | Material human + agent value confirmed. |
| F | No more precise alternative found. |

### Safe semantic (frozen for Sprint 035)

```text
These provider evidence records reference the same exact Git commit,
within an already-proven source_for Resource relationship.

Shared commit ≠ execution lineage.
Shared commit ≠ causality.
Shared commit ≠ same incident.
```

### Model choices for Sprint 035

```text
enrichment: yes (Vercel gitCommitSha allowlist)
association storage: ephemeral only
representation: commit group (not pairwise edges)
scope: source_for only
match keys: full canonical commit SHA only
```

---

## Sprint 035 — exact bounded slice

**Type:** Implementation (small vertical slice)

**In scope:**

1. **Vercel enrichment only for commit identity**
   - Add optional `gitCommitSha: string | null` to `VercelDeploymentEvidence`
   - Extract solely from `raw.meta.githubCommitSha` when meta is a plain object with string value
   - Persist nullable `git_commit_sha` column + upsert/list mapping
   - Update normalize tests: allowlist the new field; still forbid message/author/env/urls/raw meta
   - Display commit SHA on deployment cards when present (parity with workflow `head sha`)

2. **Ephemeral shared-commit composition**
   - Pure function over `InvestigationContext` + known `source_for` edges already in context
   - Build `GitCommitEvidenceGroup[]` by exact canonical full SHA among:
     - subject + one-hop neighbor workflow runs and deployments
   - Only pairs/groups whose owning Resources are endpoints of an in-context `source_for`
   - Many-to-many group model (lists of runs + deployments), not pairwise edges

3. **Investigate presentation**
   - Optional section e.g. `SHARED COMMIT CONTEXT`
   - Show full SHA, member run ids + conclusions, deployment uids + readyState
   - Basis lines: exact Git commit SHA · repository source_for project
   - Authority/stale markers from existing evidence authority — no “current membership” claim

4. **Tests**
   - Normalize/persist enrichment
   - Scenarios A–H at least (eligible, non-eligible, unrelated Resources, many-to-many)
   - Wording does not contain lineage/causality phrases
   - Offline, no credentials

**Explicitly out of Sprint 035:**

- Durable evidence association tables
- Generic CorrelationEngine / MatchingEngine
- Fuzzy/short/prefix SHA matching
- Branch/time matching
- triggered_by / deployed_by / causality / incident grouping
- New Resource Relationship kinds
- Recursive multi-hop
- Persisting commit messages or full meta
- Other providers / evidence families
- AI, MCP, API, SDK, UI
- Scaffolding beyond this slice

**Success criteria:**

```text
Investigator no longer manually compares SHAs for the common
GitHub workflow ↔ Vercel deployment question when both full SHAs
are present and source_for exists.
```

---

## Explicit Answers (1–29)

1. **Is GitHub headSha authoritative enough?** Yes for exact commit identity of the workflow run when present.
2. **Is Vercel githubCommitSha authoritative enough?** Yes for exact deployment commit identity when present and full-shaped.
3. **Is Vercel currently dropping it?** **Yes** — entire `meta` dropped.
4. **Is it safe to persist?** **Yes** as allowlisted SHA only (not full meta / message).
5. **Is it always present?** **No.**
6. **When absent?** Non-git / CLI without meta / drop / incomplete Git provider metadata.
7. **Does SHA equality alone suffice?** **No** — requires `source_for` scope.
8. **Is source_for sufficient scoping?** **Yes.**
9. **Is additional repo identity required?** Not beyond owning Resource ids + existing edge.
10. **Can unrelated repos share a SHA?** Yes in principle (forks/mirrors/identical objects) → global match forbidden.
11. **Can multiple workflows share one SHA?** Yes.
12. **Can multiple deployments share one SHA?** Yes.
13. **Is pairwise too duplicative?** **Yes** under many-to-many.
14. **Is commit grouping safer/cleaner?** **Yes.**
15. **Can retained unknown-authority evidence participate?** Yes, as held/retained evidence.
16. **What qualification?** Do not claim “current”; mark may-be-stale / retained.
17. **Does row-membership uncertainty block the safe semantic?** Blocks **current** claims only; not held-evidence shared-commit claims.
18. **Can PR/merge cause false negatives?** **Yes.**
19. **Are false negatives acceptable?** **Yes.**
20. **What creates false positives?** Global SHA, short SHA, branch/time fallbacks, wrong Resource scope, overclaiming lineage.
21. **Does shared commit imply lineage?** **No.**
22. **Does it imply causality?** **No.**
23. **Should the result be ephemeral?** **Yes.**
24. **Should it be persisted?** **No.**
25. **Is generic correlation required?** **No.**
26. **Does it help humans?** **Yes** — removes manual SHA comparison.
27. **Does it help agents?** **Yes** — deterministic structured join + safer grounding.
28. **Which recommendation wins?** **A.**
29. **What exactly should Sprint 035 do?** Enrich Vercel `gitCommitSha` + ephemeral commit-group shared-commit context in investigate, scoped by `source_for`, exact full SHA only.

---

## Validation

```text
Research-only Sprint 034

Production changes: zero
Test changes: zero
Schema changes: zero
Provider contract changes: zero
Matching implementation: zero

Commands (post-research):
  bun test           → 572 pass expected
  bun run typecheck  → clean expected
  git diff --check   → clean expected
  git status         → only SPRINT-034.md research doc

Secret scan: documentation only; no credentials; official URLs only
```

---

## Canon Changes

**None.**

VISION / ARCHITECTURE / ROADMAP / SKILL unchanged. Evidence association remains ephemeral composition; no Engineering Model expansion in this Sprint.

---

## Commit

Sprint 034 research commit SHA recorded after commit:

```text
(pending commit)
```

---

## Definition of Done (Sprint 034)

- [x] Sprint 033 clean baseline verified
- [x] exact baseline SHA recorded (`e367e85d2cfbeba63df92943a4783393bc2664b8`)
- [x] SKILL protocol followed
- [x] Canon read
- [x] relevant Sprints reviewed (005, 006, 020, 021, 023, 024, 029, 031, 033, 034)
- [x] Repository Understanding completed
- [x] Architecture Pressure completed
- [x] GitHub headSha semantics verified (code + official docs)
- [x] Vercel githubCommitSha semantics verified (code + official docs)
- [x] Vercel normalization gap confirmed
- [x] source_for scoping analyzed
- [x] global SHA matching rejected
- [x] exact identity rule defined
- [x] normalization/canonicalization analyzed
- [x] many-to-many cardinality analyzed
- [x] pairwise association pressure-tested
- [x] commit-group model pressure-tested
- [x] ephemeral model pressure-tested
- [x] durable model pressure-tested
- [x] authority semantics analyzed
- [x] retained evidence semantics analyzed
- [x] PR/merge caveats analyzed
- [x] false-positive risks documented
- [x] false-negative risks documented
- [x] security reviewed
- [x] human value studied
- [x] agent value studied
- [x] terminology studied
- [x] Evidence Matrix completed
- [x] Match Safety Matrix completed
- [x] exactly one A/B/C/D/E/F recommendation selected → **A**
- [x] Sprint 035 bounded precisely
- [x] no production implementation
- [x] no test implementation
- [x] no schema changes
- [x] no provider changes
- [x] no matching implementation
- [x] no correlation engine
- [x] no causality
- [x] no AI
- [ ] full tests pass (pre-commit validation)
- [ ] typecheck passes (pre-commit validation)
- [ ] secret scan clean (pre-commit validation)
- [ ] diff/whitespace checks clean (pre-commit validation)
- [x] completion notes updated
- [x] Canon changes recorded: **None**
- [ ] Sprint 034 committed separately
- [ ] worktree clean
- [x] Sprint 035 not started