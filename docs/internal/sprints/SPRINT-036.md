# SPRINT-036 — Related Context Density Cleanup

> **Status:** Implemented
> **Depends on:** SPRINT-035
> **Type:** Implementation / CLI presentation
> **Primary goal:** Reduce `combie investigate` scanning cost by turning RELATED CONTEXT into a compact one-hop graph-neighborhood index while preserving complete Resource, Relationship, Change, authority, and provider evidence elsewhere in the existing investigation output.
> **Storage changes:** None
> **Domain changes:** None
> **Provider changes:** None
> **Provider API changes:** None
> **InvestigationContext changes:** None expected
> **Relationship semantics:** Unchanged
> **Investigation scope:** One hop, unchanged
> **New product primitive:** None
> **Correlation / causality / AI:** None

---

## Goal

Sprint 035 completed Combie's first exact cross-provider evidence association:

```text
GitHub workflow run
        │
        │ headSha = X
        │
repository ── source_for ──> Vercel project
                              │
                              │ gitCommitSha = X
                              │
                         Vercel deployment

→ SHARED COMMIT CONTEXT
```

That capability removed a real structural investigation friction:

```text
manual Git commit SHA comparison
```

without introducing:

```text
generic correlation
durable evidence associations
lineage
causality
```

Sprint 035 then identified the largest remaining investigation friction as:

> **Long RELATED CONTEXT neighbor dumps and repeated nested evidence when one-hop context becomes rich.**

This is not currently a missing domain primitive.

It is a presentation-density problem.

Sprint 036 should apply the same successful principle used by Sprint 032:

> **Compact the index. Preserve the evidence.**

The target semantic jobs become:

```text
KNOWN FACTS
→ bounded high-value compression

MISSING CONTEXT
→ complete supported knowledge-gap inventory

SHARED COMMIT CONTEXT
→ exact cross-provider shared commit identity

KNOWN PROVIDER ACTIVITY
→ compact provider-time chronological index

COMBIE OBSERVATIONS
→ Combie observation-time Change chronology

RELATED CONTEXT
→ compact one-hop graph-neighborhood index

DETAILED EVIDENCE
→ complete provider-specific evidence
```

Sprint 036 changes only how RELATED CONTEXT is presented.

It must not change what Combie knows.

---

# Core Principle

> **Related Context should tell the investigator what is around the subject, not reproduce everything Combie knows about every neighbor.**

And:

> **Compact the graph view. Keep the evidence complete.**

---

# Baseline

Begin from the clean committed Sprint 035 baseline.

Expected Sprint 035 implementation commit:

```text
137ad9d5675f746d7b7968b54a0cb45b1b4d1e81
```

Expected current Sprint 035 documentation HEAD:

```text
8b099ae7b2c9027371c7396e01dc0ec8ca4a2d76
```

Do not assume either without verification.

Run:

```bash
git status
git log -4 --oneline
bun test
bun run typecheck
```

Expected baseline:

```text
595 tests passing
typecheck clean
worktree clean
```

Record:

- exact current full HEAD SHA;
- commit message;
- test count;
- typecheck result;
- worktree state.

If Sprint 035 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 035 and Sprint 036.

---

# Sprint 035 Decisions Are Inputs

Do not reopen these decisions unless concrete implementation pressure proves a contradiction.

## 1. Shared Commit Context is complete for its current semantic

Do not alter:

```text
composeSharedCommitContext()
GitCommitEvidenceGroup
Vercel gitCommitSha
source_for scoping
```

Sprint 036 is not shared-commit work.

---

## 2. No generic correlation

Do not introduce:

```text
CorrelationEngine
MatchingEngine
generic EvidenceRelationship
```

Related Context cleanup does not earn any of these.

---

## 3. One-hop investigation scope remains unchanged

Sprint 033 found one-hop scope product-useful enough.

Sprint 036 must not introduce:

```text
two-hop traversal
recursive traversal
graph expansion
```

---

## 4. RELATED CONTEXT density is presentation friction

The problem is:

```text
neighbor Resource
+
Relationship details
+
neighbor Changes
+
neighbor provider evidence
+
authority explanation
+
nested output
```

being repeated in one large section.

The solution should be:

```text
compact neighborhood summary
```

not:

```text
remove evidence
```

---

# Repository Understanding Report

Before implementation, inspect:

- `skills/build-combie/SKILL.md`
- Combie Canon
- SPRINT-029
- SPRINT-030
- SPRINT-032
- SPRINT-033
- SPRINT-035
- current `InvestigationContext`
- related-context application DTOs
- `getRelatedContextForResource`
- Relationship representation
- source/target direction
- Relationship evidence
- subject/neighbor representation
- neighbor Resource state
- neighbor Changes
- neighbor provider evidence
- provider authority on neighbors
- current RELATED CONTEXT formatter
- SHARED COMMIT CONTEXT formatter
- provider activity formatter
- detailed evidence formatter
- investigation CLI tests
- relevant realistic fixtures

Produce a concise Repository Understanding report.

Explicitly answer:

1. What exact data does each Related Context entry currently contain?
2. What does the RELATED CONTEXT formatter currently print?
3. Which fields are repeated elsewhere?
4. Which Resource fields are essential for neighbor identification?
5. Which Relationship fields are essential for graph comprehension?
6. Which Relationship evidence fields must remain visible somewhere?
7. Which neighbor Change details are already available elsewhere?
8. Which provider evidence details are already available elsewhere?
9. Which authority details are duplicated?
10. How are inbound/outbound directions currently rendered?
11. How are dangling Relationships rendered?
12. How does one neighbor reached through multiple Relationships behave?
13. Does current output group by neighbor or by Relationship?
14. Which representation creates less duplication?
15. Can all Sprint 036 changes remain formatter-only?
16. Does any application DTO need to change? Expected: no.
17. Does InvestigationContext need to change? Expected: no.
18. Is any storage/schema/provider work required? Expected: no.

No implementation before this report.

---

# Architecture Pressure Report

Before coding answer:

1. Can RELATED CONTEXT become a compact index using existing data?
2. Should compaction occur only in the CLI formatter?
3. Does the existing related-context DTO already contain sufficient summary fields?
4. Should output be grouped by Relationship or neighbor Resource?
5. What happens when one neighbor has multiple Relationships?
6. What happens when one Relationship is dangling?
7. What minimum Resource identity is required?
8. What minimum Relationship identity is required?
9. Should Relationship evidence be shown inline?
10. Should full Relationship evidence remain available elsewhere?
11. Should neighbor Change counts be shown?
12. Should provider evidence counts be shown?
13. Should authority summaries be shown?
14. Would counts accidentally imply significance?
15. How should known-empty evidence be summarized?
16. How should unknown evidence be summarized?
17. How should a neighbor with no provider evidence be summarized?
18. Should Shared Commit Context be referenced from Related Context? Expected: no.
19. Should Related Context include detailed evidence rows? Expected: no.
20. Should section ordering change?
21. Can all ordering remain deterministic and non-ranked?
22. Does any hidden Attention behavior risk appearing?
23. Does Canon need to change?

Prefer the smallest formatter-only solution.

---

# Product Job of RELATED CONTEXT

After Sprint 036, RELATED CONTEXT should answer:

> **Which Resources are directly connected to this subject, and by which canonical Relationships?**

It should provide enough additional summary to orient the investigator.

It should not answer:

```text
everything known about each neighbor
which neighbor matters most
which neighbor to inspect first
whether a neighbor caused anything
```

---

# Target Shape

Conceptually, move from a nested neighbor evidence dump toward something like:

```text
RELATED CONTEXT

GitHub repository  sgr0691/combie
← source_for
changes=2 · workflowRuns=7 · authority=populated

Cloudflare zone  usecmd.dev
→ uses_domain_in
changes=0
```

This is conceptual.

Do not copy mechanically.

Use existing CLI conventions.

The compact block should remain traceable to:

```text
neighbor Resource
Relationship
direction
```

---

# Required Visible Neighbor Identity

Each compact neighbor summary should preserve enough visible identity to answer:

```text
provider
Resource kind
display name
stable Resource reference when useful
```

Pressure-test whether printing the full stable Resource ID on every line adds unnecessary width.

If a compact display name is used, exact IDs must remain available somewhere in the investigation output or existing CLI workflows.

Do not remove exact lookup capability.

---

# Relationship Direction

Direction is semantically important.

Preserve query-perspective direction.

Examples:

```text
→ source_for
← source_for
→ uses_domain_in
← uses_domain_in
```

Follow current CLI conventions.

Do not reverse or invent canonical Relationship semantics.

Canonical storage direction remains unchanged.

---

# Relationship Kind

Always preserve exact Relationship kind.

Current kinds include:

```text
source_for
uses_domain_in
```

Do not convert them into vague prose such as:

```text
connected to
related to
```

unless additional copy supplements rather than replaces the exact kind.

---

# Relationship Evidence

Full Relationship evidence is valuable for auditability.

But RELATED CONTEXT does not necessarily need to print the entire evidence payload inline.

Pressure-test:

```text
compact relationship evidence hint
```

versus:

```text
full evidence elsewhere
```

For example:

```text
source_for · vercel git repository reference
```

may be enough for an index if full evidence remains available in canonical detailed output.

Do not delete evidence from structured DTOs or storage.

If no separate full Relationship evidence view exists, ensure Sprint 036 does not make provenance inaccessible.

---

# Neighbor Current State

Pressure-test whether neighbor Resource state belongs in the compact block.

Possible useful minimum:

```text
provider
kind
name
```

Potentially:

```text
selected provider-native state
```

But be conservative.

RELATED CONTEXT is graph context, not another CURRENT section.

Do not reprint full Resource metadata.

---

# Neighbor Change Summary

The full neighbor Change history should not be reproduced inline if it is already available in investigation detail.

A compact summary may include:

```text
changes=0
changes=3
```

if this materially helps scanning.

This is a count, not significance.

Do not render:

```text
3 important changes
3 recent issues
```

Do not sort neighbors by Change count.

Pressure-test whether even the count adds enough value to justify the field.

---

# Provider Evidence Summary

Related neighbors may have evidence such as:

```text
GitHub workflow runs
Vercel deployments
Neon operations
```

Pressure-test compact counts:

```text
workflowRuns=7
deployments=3
operations=5
```

Counts mean:

```text
Combie currently retains N evidence rows
```

They do NOT mean:

```text
latest provider response returned N
current provider records = N
```

unless exact authority semantics independently support that claim.

If retained row counts are used, label them carefully or keep them as simple inventory counts under an authority marker.

---

# Authority Summary

Neighbor evidence authority may be useful in a compact graph index.

Potential:

```text
workflowRuns=7 · authority=unknown
```

or:

```text
deployments=2 · authority=populated
```

But avoid recreating Missing Context.

The compact summary should not repeat:

```text
latest attempt
last success time
last success result count
retained count explanation
```

Missing Context remains the canonical explanatory owner of trust gaps.

---

# Known Empty

If a neighbor evidence family is known-empty:

Possible compact summary:

```text
deployments=0 · authority=empty
```

This is knowledge.

Do not turn it into Missing Context.

---

# Unknown With Retained Evidence

If:

```text
authority=unknown
retained rows=7
```

a compact summary must not make the seven rows look current.

Possible semantic:

```text
workflowRuns=7 retained · authority=unknown
```

Pressure-test exact wording.

Do not claim:

```text
7 current workflow runs
```

---

# Never Successfully Refreshed

Missing Context already explains this gap.

RELATED CONTEXT may show only:

```text
workflow authority=unknown
```

or omit evidence count if none exists.

Avoid repeating the full explanation.

---

# Evidence Family Applicability

Do not display counters for evidence families that do not apply to the neighbor Resource.

Example:

```text
Cloudflare zone
```

should not receive:

```text
workflowRuns=0
deployments=0
operations=0
```

unless those families genuinely apply.

Avoid zero-field noise.

---

# Grouping Strategy

Pressure-test two formatter strategies.

## Strategy A — One Block Per Relationship

```text
Neighbor A
← source_for

Neighbor A
→ other_relationship
```

Advantages:

```text
Relationship provenance direct
```

Disadvantages:

```text
duplicate neighbor identity
```

---

## Strategy B — One Block Per Neighbor

```text
Neighbor A
relationships:
  ← source_for
  → other_relationship
```

Advantages:

```text
less duplication
```

Disadvantages:

```text
more formatter grouping logic
```

Choose based on actual current graph model.

Do not change application semantics merely to make grouping convenient.

---

# Multiple Relationships

If the same neighbor Resource is connected through multiple canonical Relationships:

```text
show all Relationships
```

Do not silently choose one.

Do not rank Relationship kinds.

Do not merge semantically different kinds.

---

# Multiple Neighbors

Enumerate all one-hop neighbors.

Do not cap:

```text
top 5
most relevant
most recent
```

No ranking exists.

If volume is large, compact formatting—not omission—is the Sprint 036 solution.

---

# Dangling Relationships

Existing investigation semantics preserve dangling Relationships where neighbor Resource may be unavailable.

Sprint 036 must preserve that.

Conceptual compact output:

```text
[missing Resource]
← source_for
resource unavailable locally
```

Use repository conventions.

Do not silently drop the Relationship.

Do not classify it as causal/invalid.

---

# Subject vs Neighbor

RELATED CONTEXT contains neighbors by definition, but query perspective still matters.

Do not duplicate the subject itself as a neighbor unless existing relationship composition intentionally does so.

Preserve:

```text
canonical Resource IDs
query perspective
Relationship direction
```

---

# Shared Commit Context

Do not duplicate Shared Commit Context inside RELATED CONTEXT.

If:

```text
GitHub repository source_for Vercel project
```

also has a Shared Commit group, the dedicated:

```text
SHARED COMMIT CONTEXT
```

section owns that evidence association.

Related Context should continue describing the Resource relationship only.

---

# Known Facts

Unchanged.

Do not add Related Context summaries to the five-Fact budget merely because the section becomes compact.

---

# Missing Context

Unchanged.

No new MissingContextItem categories.

No provider-not-connected work.

No graph-completeness claims.

---

# Known Provider Activity

Unchanged.

Do not move chronological evidence into RELATED CONTEXT.

---

# Combie Observations

Unchanged.

Do not move Change chronology into RELATED CONTEXT.

---

# Detailed Evidence

Full provider evidence remains available.

Do not hide:

```text
workflow runs
deployments
operations
secondary timestamps
native IDs
safe metadata
authority details
```

Sprint 036 compacts neighborhood orientation, not evidence access.

---

# No Collapse/Expand UI

This is CLI output.

Do not build interactive:

```text
expand/collapse
accordion
pager
TUI
```

Sprint 036 is formatter cleanup only.

---

# No New CLI Flags

Do not add:

```text
--compact
--verbose
--related-only
--depth
```

unless existing CLI architecture already has a required pattern—which is not expected.

The default `investigate` output should improve.

---

# Section Ordering

Pressure-test whether RELATED CONTEXT remains in the correct location after compaction.

Do not reorder based on perceived importance.

A conceptual flow could remain:

```text
KNOWN FACTS
MISSING CONTEXT
SUBJECT CHANGES
SHARED COMMIT CONTEXT
KNOWN PROVIDER ACTIVITY
COMBIE OBSERVATIONS
RELATED CONTEXT
DETAILED PROVIDER EVIDENCE
```

Follow actual current structure.

Only reorder if it clearly improves comprehension and tests are updated intentionally.

---

# No Hidden Attention

Do not:

```text
sort failed neighbors first
sort unknown authority first
sort changed Resources first
highlight "important" neighbors
```

Stable ordering is organizational only.

---

# Deterministic Ordering

Use existing canonical related-context order where possible.

If grouping changes formatter ordering, define a stable comparator using fields such as:

```text
neighbor Resource ID
Relationship kind
Relationship ID
```

Do not order by:

```text
Change count
evidence count
failure state
authority
recency
```

Those could imply priority.

---

# Density Goal

Sprint 036 should materially reduce lines generated by Related Context in evidence-heavy fixtures.

Completion notes should record representative:

```text
before line count
after line count
number of repeated Resource headers removed
number of repeated evidence cards removed
```

Do not enforce an arbitrary percentage target.

Correctness and traceability matter more.

---

# Golden Output Study

Before coding, produce realistic before/after sketches for:

## Scenario A — One GitHub Neighbor

```text
Vercel project
← source_for
GitHub repository
workflow evidence
Changes
```

---

## Scenario B — Multiple Neighbors

Use only canonical existing Relationships.

Example:

```text
Vercel project
├── GitHub repository
└── Cloudflare zone
```

if fixture-backed by actual Relationship kinds/directions.

---

## Scenario C — Evidence-Heavy Neighbor

Many workflow runs or deployments.

Test whether compact Related Context avoids reproducing full evidence.

---

## Scenario D — Unknown Authority

Neighbor with retained rows + unknown authority.

Ensure compact summary remains truthful.

---

## Scenario E — Known Empty

Neighbor evidence known-empty.

Ensure output is concise without treating empty as missing.

---

## Scenario F — Dangling Relationship

Ensure provenance remains visible.

---

# Tests

Use:

```text
Red → Green → Refactor
```

Most changes should be CLI/formatter tests.

---

## Single Neighbor

Test:

- neighbor identity
- provider
- Resource kind
- display name
- exact Relationship kind
- direction
- stable Resource traceability
- no full nested evidence card

---

## Multiple Neighbors

Test:

- all neighbors rendered
- deterministic order
- no cap
- no ranking
- no duplicate subject

---

## Multiple Relationships to One Neighbor

Test:

- all Relationships retained
- neighbor duplication controlled according to chosen strategy
- Relationship kinds not merged incorrectly
- Relationship IDs/provenance remain available

---

## Change Summary

If implemented:

- `changes=0`
- `changes=N`
- no "important" wording
- count does not affect ordering

If not implemented, record why in completion notes.

---

## Provider Evidence Summary

If implemented:

- workflow run retained count
- deployment retained count
- operation retained count
- only applicable families shown
- no false current-row semantics
- unknown authority qualifier
- known-empty semantics

---

## Authority

Test:

- populated
- empty
- unknown with retained evidence
- never-successfully-refreshed
- no duplicate full Missing Context prose

---

## Relationship Evidence

Test:

- source_for evidence remains traceable
- uses_domain_in evidence remains traceable
- compact CLI does not delete structured evidence
- dangling Relationship survives

---

## Shared Commit Regression

Test:

- SHARED COMMIT CONTEXT still renders
- not duplicated in RELATED CONTEXT
- same-commit semantics unchanged

---

## Known Facts Regression

- unchanged
- five-Fact cap unchanged

---

## Missing Context Regression

- taxonomy unchanged
- uncapped
- full gap explanation remains

---

## Provider Activity Regression

- compact index unchanged
- ordering unchanged

---

## Combie Observations Regression

- unchanged

---

## Detailed Evidence Regression

- full provider-specific cards/details remain
- no provider evidence loss

---

## Section Ordering

If changed:

- explicit deterministic order test

If unchanged:

- regression confirms current order.

---

## Offline / Read-Only

- no provider calls
- no storage mutation
- repeated investigate identical

---

# Regression

Run:

```bash
bun test
bun run typecheck
git diff --check
git status
```

Expected baseline:

```text
595 tests
```

Final count should increase modestly.

Perform:

- focused tests
- full regression
- secret scan
- staged diff review
- full diff review

Preserve:

- Resources
- Relationships
- Changes
- History
- Context
- InvestigationContext
- Known Facts
- Missing Context
- Shared Commit Context
- Provider Activity
- Combie Observations
- detailed provider evidence
- authority provenance
- offline behavior

---

# Architecture Hard Boundary

Sprint 036 should not change:

```text
Resource
Relationship
Change
InvestigationContext
InvestigationFact
MissingContextItem
GitCommitEvidenceGroup
provider evidence models
provider contracts
provider adapters
SQLite schemas
refresh authority
```

If the formatter cleanup appears to require changing these:

**STOP and report before broadening scope.**

---

# Security

Do not expose new evidence.

Continue rendering only normalized safe fields.

Do not surface:

```text
credentials
tokens
auth headers
raw provider payloads
connection strings
secret metadata
```

Run secret scan.

---

# Architecture Review

Before completion answer:

1. Did Sprint 036 remain presentation-only?
2. Did storage change? Expected: no.
3. Did domain models change? Expected: no.
4. Did InvestigationContext change? Expected: no.
5. Did provider contracts/APIs change? Expected: no.
6. Did Relationship semantics change? Expected: no.
7. Is one-hop scope unchanged?
8. Is every neighbor still represented?
9. Are all Relationships still represented?
10. Is Relationship direction preserved?
11. Is Relationship evidence still traceable?
12. Are dangling Relationships preserved?
13. Are provider evidence details still available elsewhere?
14. Is authority summarized truthfully?
15. Are unknown retained rows still qualified?
16. Is known-empty still treated as knowledge?
17. Is Shared Commit Context unchanged?
18. Did any ranking/Attention appear? Expected: no.
19. Did any neighbor get hidden/capped? Expected: no.
20. Is Related Context materially easier to scan?
21. Does compacting Related Context materially improve `investigate` overall?
22. Is investigation polish now good enough to pause?
23. What real product pressure should determine Sprint 037?

---

# Completion Notes

Update `docs/internal/sprints/SPRINT-036.md` with:

## Baseline

Exact Sprint 035 HEAD SHA.

## Repository Understanding

Current Related Context formatter/data shape.

## Architecture Pressure

Why formatter-only cleanup was sufficient.

## Before / After

Representative output.

## Grouping Strategy

Relationship-per-block vs neighbor-per-block decision.

## Neighbor Identity

Fields retained.

## Relationship Provenance

Direction/kind/evidence treatment.

## Change Summary

Implemented or rejected.

## Evidence Summary

Implemented or rejected.

## Authority Summary

Final compact semantics.

## Known Empty

Behavior.

## Unknown + Retained

Behavior.

## Dangling Relationships

Behavior.

## Section Ordering

Changed or unchanged.

## Detailed Evidence

Confirmation that complete evidence remains.

## Shared Commit Regression

Confirmation.

## Density Reduction

Representative before/after line counts.

## Offline / Read-Only

Verification.

## Validation

Tests/typecheck/security/diff.

## Deviations

Any divergence.

## Learnings

Whether investigate polish should stop here.

## Canon Changes

Changes or:

```text
None
```

## Commit

Exact Sprint 036 SHA.

---

# Explicit Questions

Answer all:

1. What exact density problem did Sprint 036 solve?
2. Is RELATED CONTEXT now an index rather than a nested evidence dump?
3. What grouping strategy shipped?
4. Which neighbor identity fields remain visible?
5. Are stable Resource references still traceable?
6. Are Relationship kinds preserved?
7. Is Relationship direction preserved?
8. Is full Relationship evidence still accessible?
9. Are dangling Relationships preserved?
10. Are neighbor Change counts shown?
11. Are provider evidence counts shown?
12. If counts are shown, what do they mean?
13. Are unknown retained evidence rows qualified?
14. Is known-empty treated correctly?
15. Are unsupported evidence families silent?
16. Did any neighbor get hidden or capped?
17. Did ordering change?
18. Was any ranking introduced? Expected: no.
19. Did InvestigationContext change? Expected: no.
20. Did domain/storage/provider architecture change? Expected: no.
21. Is Shared Commit Context unchanged?
22. Is detailed evidence still complete?
23. How much density was removed?
24. Is `combie investigate` now product-useful and readable enough to pause formatter work?
25. What actual product pressure should Sprint 037 investigate?

---

# Definition of Done

- [ ] Sprint 035 clean baseline verified
- [ ] exact baseline SHA recorded
- [ ] SKILL protocol followed
- [ ] Canon read
- [ ] relevant Sprint notes reviewed
- [ ] Repository Understanding completed
- [ ] Architecture Pressure completed
- [ ] before/after output study completed
- [ ] RELATED CONTEXT compacted
- [ ] compact graph-neighborhood job established
- [ ] every one-hop neighbor preserved
- [ ] every canonical Relationship preserved
- [ ] direction preserved
- [ ] Relationship kind preserved
- [ ] Relationship provenance remains traceable
- [ ] dangling Relationships preserved
- [ ] no recursive traversal
- [ ] no two-hop expansion
- [ ] neighbor identity remains clear
- [ ] detailed neighbor evidence not duplicated inline
- [ ] full provider evidence remains available
- [ ] authority summary truthful
- [ ] unknown retained evidence qualified
- [ ] known-empty remains knowledge
- [ ] unsupported evidence families remain silent
- [ ] no arbitrary cap
- [ ] deterministic ordering
- [ ] no priority ordering
- [ ] Known Facts unchanged
- [ ] Missing Context unchanged
- [ ] Shared Commit Context unchanged
- [ ] Provider Activity unchanged
- [ ] Combie Observations unchanged
- [ ] no InvestigationContext change
- [ ] no domain model change
- [ ] no storage/schema change
- [ ] no provider contract/API change
- [ ] no Attention
- [ ] no ranking
- [ ] no scoring
- [ ] no recommendation
- [ ] no correlation
- [ ] no causality
- [ ] no AI
- [ ] focused tests added
- [ ] full tests pass
- [ ] typecheck passes
- [ ] secret scan clean
- [ ] diff/whitespace checks clean
- [ ] offline/read-only behavior preserved
- [ ] completion notes updated
- [ ] Canon changes recorded or None
- [ ] Sprint 036 committed separately
- [ ] worktree clean
- [ ] Sprint 037 not started

---

# Explicitly Out of Scope

Do not implement:

- new investigation primitive
- Attention
- Focus
- recommendations
- ranking
- scoring
- filtering flags
- expand/collapse UI
- TUI
- multi-hop traversal
- recursive traversal
- new Relationships
- application↔database inference
- shared-commit changes
- new evidence associations
- new provider evidence
- new providers
- row-membership persistence
- correlation
- MatchingEngine
- CorrelationEngine
- SHA fuzzy matching
- temporal matching
- sequence detection
- incident grouping
- causality
- root-cause analysis
- anomaly detection
- generic Event
- generic Evidence
- ObservationEngine
- RefreshEngine
- more authority storage
- AI/LLM summaries
- embeddings
- logs
- metrics
- traces
- webhooks
- MCP/API/SDK/UI
- controlled execution
- Sprint 037 scaffolding

---

# Final Principle

> **Compact the neighborhood. Preserve the graph. Keep the evidence complete.**

And:

> **Once investigation is readable enough, stop polishing it and let real usage determine what comes next.**

---

# Completion Notes

## Baseline

```text
HEAD:   8b099ae7b2c9027371c7396e01dc0ec8ca4a2d76 (docs(sprint): record Sprint 035 commit SHA)
Tests:  595 passing
Typecheck: clean
Worktree: SPRINT-036 test file + sprint doc pending (Red)
```

## Repository Understanding

`combie investigate` renders one-hop neighbors inside `RELATED CONTEXT` via
`formatRelatedNeighbor()`, which reproduced per neighbor:

```text
direction + identity + stable id
Evidence line (full payload)
CHANGES section (full Change cards)
DEPLOYMENTS / WORKFLOW RUNS / OPERATIONS sections (full evidence cards)
```

Every neighbor repeated this nested dump. Rule checks answered:

1. Each Related Context entry contained: canonical Relationship, direction, neighbor Resource, neighbor full Change history, and neighbor Deployment/WorkflowRun/Operation authorities with all evidence rows.
2. The formatter printed all of the above inline.
3. Repeated elsewhere: Change cards (also in COMBIE OBSERVATIONS), evidence cards (also in KNOWN PROVIDER ACTIVITY index rows and subject sections), authority markers (also in MISSING CONTEXT explanation).
4. Neighbor identification needs: provider, kind, display name, stable Resource id.
5. Graph comprehension needs: exact Relationship kind + query-perspective direction.
6. Full Relationship evidence must remain visible somewhere (kept inline per block — compact, one line).
7. Neighbor Change details remain available via `history`-style COMBIE OBSERVATIONS entries.
8. Provider evidence details remain available in the new DETAILED EVIDENCE section.
9. Authority details were duplicated (detail markers + activity tags + Missing Context prose).
10. Directions render as `kind →` (outbound) / `← kind` (inbound); preserved.
11. Dangling Relationships render a `(missing resource)` identity; preserved.
12. One neighbor through multiple Relationships produced one entry per Relationship; each has full history + authorities.
13. Old output grouped by Relationship (identity duplicated per edge).
14. Grouping by neighbor (Strategy B) removes identity duplication with zero data loss.
15. All Sprint 036 changes are formatter-only.
16. No application DTO changed.
17. `InvestigationContext` unchanged.
18. No storage/schema/provider work.

## Architecture Pressure

1. Yes — RELATED CONTEXT is now a compact index over existing data.
2. Yes — compaction is formatter-only in `src/app/investigate.ts`.
3. Yes — `InvestigationNeighbor` already carried every field needed.
4. Grouped by neighbor Resource (Strategy B).
5. Multiple Relationships to one neighbor: every edge rendered in one block (direction + Evidence per edge), identity once.
6. Dangling Relationship: one block, no counts, no evidence section.
7. Minimum neighbor identity: provider, kind, display name, stable id.
8. Minimum Relationship identity: exact kind + direction + Evidence line.
9. Relationship evidence stays inline (compact single-line `Evidence:` per edge).
10. Full Relationship evidence remains available in the same line (full payload, same `formatEvidence`).
11. Change counts shown (`changes=N`) — plain inventory, no significance wording.
12. Evidence family counts shown only for families that apply (`workflowRuns=N` / `deployments=N` / `operations=N`).
13. Authority summarized as one tag per family (`authority=populated|empty|unknown`).
14. Counts never drive ordering; no ranking, no priority, no Attention.
15. Known-empty: `deployments=0 · authority=empty` — knowledge, not Missing Context.
16. Unknown with retained rows: `workflowRuns=2 retained · authority=unknown` — rows never look current.
17. Neighbor with no provider evidence: no family token at all (no zero-field noise).
18. Shared Commit Context not referenced from Related Context.
19. No detailed evidence rows inside Related Context (moved to DETAILED EVIDENCE).
20. Section ordering: RELATED CONTEXT and all prior sections unchanged; new DETAILED EVIDENCE appended at the very end (after COMBIE OBSERVATIONS).
21. All ordering deterministic and non-ranked (store canonical order preserved).
22. No hidden Attention behavior.
23. Canon unchanged.

## Before / After

Evidence-heavy fixture (Vercel project subject; GitHub repo neighbor with 2
Changes + 5 workflow runs; Cloudflare zone neighbor with 1 Change):

```text
RELATED CONTEXT (before, ~97 lines)

← source_for
GitHub repository: sgr0691/demo-hub
github:repository:915052094
Evidence: vercel git_repository_reference (githubRepoId="915052094"; …)

CHANGES

Observed: …
updated
metadata.fullName
  …
(… full Change cards …)

WORKFLOW RUNS (newest first)

authority: populated · latest successful response returned 5; Combie retains 5 (…)
(… 5 full run cards ≈ 70 lines …)

uses_domain_in →
Cloudflare zone: example.com
cloudflare:zone:zone_example
Evidence: vercel custom_domain_apex (…)

CHANGES

Observed: …
updated
metadata.status
  …
```

```text
RELATED CONTEXT (after, 12 lines)

GitHub repository: sgr0691/demo-hub
github:repository:915052094
← source_for
Evidence: vercel git_repository_reference (githubRepoId="915052094"; repository="sgr0691/demo-hub"; vercelLinkType="github")
changes=2 · workflowRuns=5 · authority=populated

Cloudflare zone: example.com
cloudflare:zone:zone_example
uses_domain_in →
Evidence: vercel custom_domain_apex (apexName="example.com"; hostnames=["app.example.com"])
changes=1
```

The full neighbor evidence remains under `DETAILED EVIDENCE` at the end of the
output (84 lines in the same fixture — nothing removed, just relocated).

## Grouping Strategy

Strategy B — one block per neighbor Resource, all canonical Relationships
listed inside (direction + Evidence per edge). Identity is printed once.
Order: store canonical order (kind, source, target) via first-appearance of
`neighborId`; no sorting by counts or authority.

## Neighbor Identity

Provider, Resource kind, display name, and the exact stable Resource id
(`provider:kind:providerResourceId`) remain on the first two lines of each
block. Dangling blocks print the neighbor id + `(missing resource)`.

## Relationship Provenance

Exact kind and query-perspective direction preserved on every edge
(`kind →` / `← kind`). Full evidence payload rendered inline per edge via the
existing `formatEvidence` one-liner.

## Change Summary

Implemented as plain counts: `changes=N`. No "important"/"most recent"
wording; counts never affect ordering.

## Evidence Summary

Implemented per applicable family only:

```text
deployments=N · authority=populated
workflowRuns=N · authority=populated
operations=N · authority=populated
```

Counts mean "Combie currently retains N rows", never latest-response membership.

## Authority Summary

One compact tag per family (`authority=populated|empty|unknown`) inside the
family token. Full authority markers remain in DETAILED EVIDENCE; Missing
Context remains the canonical explanatory owner of trust gaps.

## Known Empty

`deployments=0 · authority=empty` / `workflowRuns=0 · authority=empty` render
in the block — treated as knowledge, not Missing Context.

## Unknown + Retained

`workflowRuns=2 retained · authority=unknown` — retained rows are explicitly
qualified and never look current. Unknown with zero retained rows renders no
token (no absence claim).

## Dangling Relationships

Preserved: block with neighbor id + `(missing resource)`, direction and
Evidence lines, and no made-up counts. Never appears in DETAILED EVIDENCE.

## Section Ordering

Unchanged sections: SUBJECT, KNOWN FACTS, MISSING CONTEXT, SUBJECT CHANGES,
subject DEPLOYMENTS/WORKFLOW RUNS/OPERATIONS, RELATED CONTEXT, SHARED COMMIT
CONTEXT, KNOWN PROVIDER ACTIVITY, COMBIE OBSERVATIONS. New terminal section:
DETAILED EVIDENCE (omitted entirely when no neighbor holds evidence rows).

## Detailed Evidence

`formatWorkflowRunsBlock`, `formatDeploymentsBlock`, and
`formatNeonOperationsBlock` are reused unchanged inside DETAILED EVIDENCE —
every card, secondary timestamp, native id, and authority marker remains
available.

## Shared Commit Regression

`composeSharedCommitContext` / `formatSharedCommitContext` untouched;
`investigate-shared-commit.test.ts` passes unchanged.

## Density Reduction

Representative fixture (subject + 1 evidence-rich neighbor + 1 zone neighbor):

```text
RELATED CONTEXT:      ~97 lines  →  12 lines
neighbor Change cards:  14 lines  →   0 (retained in COMBIE OBSERVATIONS)
neighbor evidence cards: ~70 lines →   0 (relocated to DETAILED EVIDENCE)
repeated identity headers:  2    →   0
```

Total output for the fixture: 173 lines, down from ~258.

## Offline / Read-Only

No provider calls, no storage mutation; repeated `investigate` output
byte-identical (asserted in the new test file).

## Validation

```text
bun test       607 passing (595 baseline + 12 new)
bun run typecheck  clean
git diff --check  clean
secret scan    no credentials/tokens in diff
```

## Deviations

None. Two assertions in the new test file were corrected during Green
(run cards label the SHA as `head sha:`, and the known-empty/truthfulness
fixtures investigate the neighbor from the matching subject).

## Learnings

Formatter-only compaction achieved the density goal without touching any DTO,
storage, or domain model. The Subject/neighbor split already existed; only
presentation duplicated it. Investigation polish is now compact end-to-end;
per the Sprint principle, stop polishing here and let real usage determine
what comes next.

## Canon Changes

None

## Commit

Recorded when committed (see git log for `SPRINT-036`).