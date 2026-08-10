# SPRINT-032 — Investigation CLI Density Cleanup

> **Status:** Complete
> **Depends on:** SPRINT-031
> **Type:** Implementation / CLI presentation
> **Primary goal:** Reduce `combie investigate` scanning cost by making provider chronology and authority presentation denser and less repetitive while preserving all underlying evidence, provenance, and semantic boundaries.
> **Storage changes:** None
> **Domain changes:** None
> **Provider changes:** None
> **Provider API changes:** None
> **InvestigationContext changes:** None expected
> **New product primitive:** None
> **Correlation / causality / AI:** None

---

## Goal

Sprint 031 researched whether Combie needed a new deterministic Attention surface.

The result was:

> **C — Do not add Attention; perform bounded CLI density cleanup.**

Attention was not earned.

The research found that the dominant residual friction in `combie investigate` is now:

```text
full evidence dumps
+
provider activity re-listing detail already available elsewhere
+
repeated authority prose
```

The current knowledge model is not missing a classification primitive.

The presentation has become dense because Combie now correctly exposes:

```text
CURRENT
KNOWN FACTS
MISSING CONTEXT
SUBJECT CHANGES
RELATED CONTEXT
KNOWN PROVIDER ACTIVITY
COMBIE OBSERVATIONS
Vercel deployment evidence
GitHub workflow-run evidence
Neon operation evidence
authority provenance
```

Sprint 032 improves the readability of this existing information.

It must not change what Combie knows.

It must change only how efficiently the investigator can scan what Combie already knows.

---

# Core Principle

> **Make the index compact. Keep the evidence complete.**

And:

> **Presentation may remove repetition. It must not remove provenance or strengthen a claim.**

---

# Baseline

Begin from the clean committed Sprint 031 baseline.

Expected Sprint 031 research commit:

```text
a5b525913831c6f16b7c9ab38d64d204f25341d7
complete Sprint 031 attention semantics research
```

Sprint 031 may also have later documentation-only commits:

```text
5d49c03
ebcf733
```

Do not assume those short SHAs are current HEAD.

Verify:

```bash
git status
git log -4 --oneline
bun test
bun run typecheck
```

Expected baseline:

```text
569 tests passing
typecheck clean
worktree clean
```

Record the exact full current HEAD SHA and commit message.

If Sprint 031 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 031 and Sprint 032.

---

# Sprint 031 Decisions Are Inputs

Do not reopen these decisions unless concrete implementation pressure proves them wrong.

## 1. No Attention surface

Do not introduce:

```text
ATTENTION
AttentionItem
AttentionCategory
AttentionEngine
```

Sprint 031 concluded this does not currently provide a distinct enough product job.

---

## 2. Provider-native failures remain provider-native evidence

Current known clear failure semantics include fixture/code-grounded examples:

```text
GitHub
conclusion: failure

Vercel
readyState: ERROR

Neon
status: failed | error
```

Do not promote these into:

```text
current failure
high priority
important
attention
```

because exact latest-response row membership is not persisted.

---

## 3. Latest successful row membership is not known

Combie currently preserves:

```text
last successful result count
last successful refresh time
retained local evidence
```

but not:

```text
which exact retained row IDs belonged to the latest successful response
```

Therefore the CLI must not add labels such as:

```text
current
latest success
in latest refresh
latest provider record
```

to individual retained evidence rows unless existing independent evidence proves that semantic.

---

## 4. The friction is presentation density

The target Sprint 032 slice is:

```text
1. Compact KNOWN PROVIDER ACTIVITY
2. Reduce repeated authority prose
3. Preserve detailed provider evidence
4. Preserve every semantic boundary
```

No new architecture.

---

# Repository Understanding Report

Before implementation, inspect the current full `combie investigate` formatter.

At minimum inspect:

- investigation formatter
- `InvestigationContext`
- `composeInvestigationFacts()`
- `composeMissingContext()`
- `composeProviderActivityChronology()`
- `KNOWN FACTS`
- `MISSING CONTEXT`
- `SUBJECT CHANGES`
- `RELATED CONTEXT`
- `KNOWN PROVIDER ACTIVITY`
- `COMBIE OBSERVATIONS`
- detailed Vercel deployment output
- detailed GitHub workflow-run output
- detailed Neon operation output
- authority formatting
- subject/neighbor formatting
- Relationship provenance formatting
- zero states
- CLI snapshot/assertion tests if present
- live/example output recorded in Sprint docs

Produce a concise Repository Understanding report.

Explicitly answer:

1. What is the exact current section order?
2. Which sections are summaries/indexes?
3. Which sections are full evidence views?
4. Which fields repeat between Provider Activity and detailed evidence?
5. Which authority prose repeats between:
   - Known Facts
   - Missing Context
   - provider evidence sections
6. Which Relationship provenance repeats?
7. Which timestamps repeat?
8. Which repeated data is necessary for trust?
9. Which repeated data is merely formatting duplication?
10. Which zero states add useful clarity?
11. Which zero states create noise?
12. Which current sections are longest in realistic fixtures?
13. Can all desired cleanup remain formatter/application presentation only?
14. Are any domain/storage/provider changes required? Expected: no.

No implementation before this report.

---

# Architecture Pressure Report

Before coding, answer:

1. Can the cleanup remain entirely in formatting/presentation?
2. Does `composeProviderActivityChronology()` need to change structurally?
3. Can the chronology DTO remain unchanged?
4. Does detailed provider evidence need to change structurally?
5. Can authority prose be shortened without losing structured provenance?
6. Should Missing Context remain the canonical explanatory owner of authority gaps?
7. Should detailed evidence show compact authority markers instead?
8. Should Known Facts continue summarizing authority where useful?
9. Would removing all authority repetition make detailed evidence misleading when viewed alone?
10. What minimum local authority marker should detailed evidence retain?
11. Can section ordering improve scanning without implying priority?
12. Can compact one-line chronology entries retain enough identity to be useful?
13. Should chronology include subject/neighbor scope?
14. Should chronology include Relationship path on every row?
15. Can path details be abbreviated without losing provenance?
16. Should timestamps be consistently formatted?
17. Can zero-state noise be reduced safely?
18. Is any new CLI option needed? Expected: no.
19. Is any new domain abstraction needed? Expected: no.
20. Does Canon need to change?

Prefer the smallest formatter-only change.

---

# Product Jobs by Section

Sprint 032 should make each section's job clearer.

Target semantic roles:

```text
KNOWN FACTS
→ bounded high-value compression

MISSING CONTEXT
→ complete supported gap inventory

SUBJECT CHANGES
→ detailed subject Change history where currently used

KNOWN PROVIDER ACTIVITY
→ compact provider-time chronological index

COMBIE OBSERVATIONS
→ compact Combie observation-time chronology

RELATED CONTEXT
→ one-hop graph and neighbor context

DETAILED PROVIDER EVIDENCE
→ full provider-specific records
```

A section should not try to do another section's job.

---

# Cleanup 1 — Compact KNOWN PROVIDER ACTIVITY

This is the primary Sprint 032 change.

Sprint 031 found that Provider Activity currently re-lists too much card/detail information that already exists in provider-specific sections.

The chronology should become a compact chronological index.

Conceptually:

```text
KNOWN PROVIDER ACTIVITY

2026-08-10T14:02:00Z  Vercel  deployment  demo-hub  readyState=READY
2026-08-10T13:58:00Z  GitHub  workflow run  CI  conclusion=failure
2026-08-10T13:55:00Z  Neon    operation  create_branch  status=finished
```

This is conceptual.

Use repository CLI conventions.

Each row should preserve enough information to answer:

```text
when
provider
evidence family
which Resource/evidence
important provider-native snapshot field
subject vs neighbor if relevant
```

Do not turn the chronology into a full card.

---

# Chronology Field Budget

Pressure-test a compact field budget.

Likely useful fields:

```text
primary provider timestamp
provider
evidence family
compact name/native identity
provider-native state/status/conclusion
scope marker when neighbor
```

Avoid repeating:

```text
all secondary timestamps
full authority explanation
full Relationship evidence
all provider metadata
all safe evidence fields
```

Those remain in detailed sections.

Document the exact final row format.

---

# Provider-Native State Preservation

Compact output must preserve provider-specific semantics.

Examples:

## GitHub

Keep distinct:

```text
status
conclusion
```

If only one fits in the compact index, determine which field is most informative while retaining the other in detail.

Do not invent a generic `state`.

Do not convert:

```text
conclusion=failure
```

into:

```text
FAILED
```

unless that literal normalization already exists and is semantically established.

---

## Vercel

Preserve actual persisted deployment state vocabulary such as:

```text
readyState=ERROR
```

or repository-equivalent.

Do not reinterpret it.

---

## Neon

Preserve operation status/action semantics.

Example:

```text
create_branch  status=finished
```

or actual fixture-grounded values.

---

# Neighbor Scope

Chronology may contain subject and one-hop neighbor evidence.

A compact row must not make that distinction disappear.

Pressure-test a concise marker such as:

```text
subject
neighbor
via source_for
```

Possible:

```text
GitHub workflow run · neighbor via source_for
```

Do not print the full Relationship evidence blob on every chronology row.

The detailed Related Context remains the canonical full provenance view.

---

# Relationship Provenance

Compact chronology must remain auditable.

If a neighbor row is shown, preserve enough structured data internally to resolve:

```text
neighbor Resource
Relationship ID
Relationship kind
direction
```

The CLI does not need to print every field each time.

Do not remove provenance from DTOs merely because the formatter is compact.

---

# Cleanup 2 — Authority Prose Ownership

Sprint 030 introduced a dedicated:

```text
MISSING CONTEXT
```

surface for trust/context gaps.

Sprint 032 should reduce repetitive explanatory authority prose elsewhere.

Pressure-test the ownership model:

```text
MISSING CONTEXT
→ full explanatory gap statement

KNOWN FACTS
→ concise high-value authority summary when selected by the five-Fact budget

DETAILED EVIDENCE
→ compact local authority marker
```

Example:

```text
MISSING CONTEXT

GitHub workflow-run current authority is unknown.
Last successful bounded refresh: T · 3 runs.
7 previously recorded runs remain retained locally.
```

Then later:

```text
WORKFLOW RUNS
authority: unknown · 7 retained
```

rather than reprinting the full explanation.

Do not mechanically use this exact wording.

Pressure-test current CLI conventions.

---

# Authority Marker Semantics

A compact detailed-evidence authority marker may include only what is necessary to avoid misleading the reader.

Potential fields:

```text
authority: known | empty | unknown
retained: N
last success: T
```

Do not print:

```text
last successful result count
latest attempt
last success
retained count
full explanation
```

everywhere unless necessary.

Missing Context is the explanatory owner.

---

# Unknown Authority

When detailed rows are retained but current authority is unknown, the detailed section must still make that clear.

Safe compact marker:

```text
authority: unknown · retained history
```

or repository-equivalent.

Do not display retained rows without any authority qualifier if that could make them look current.

---

# Known Empty

Known-empty evidence is not Missing Context.

Detailed evidence may show:

```text
latest refresh: empty
historical rows retained: N
```

if retained rows are still listed.

Do not call those historical rows current.

---

# Never Successfully Refreshed

If provider evidence has never successfully refreshed, Missing Context should own the explanatory prose.

Detailed evidence may simply show its truthful zero/unavailable state.

Avoid repeating a multi-line explanation.

---

# Cleanup 3 — Detailed Evidence Duplication

Do not remove detailed provider evidence sections.

Sprint 031 explicitly chose presentation cleanup, not evidence hiding.

The detailed sections remain the full source for:

- secondary timestamps
- provider-specific metadata
- safe normalized evidence
- native IDs
- full state/status/conclusion
- detailed provenance

However, remove formatting duplication that exists solely because chronology copied these same fields.

Do not make detailed evidence less trustworthy.

---

# Cleanup 4 — Zero-State Density

Audit zero states such as:

```text
No provider activity known...
No Resource Changes...
No Missing Context...
No deployments...
No workflow runs...
No operations...
No Relationships...
```

Some are useful.

Some may create a long stack of empty sections.

Pressure-test whether sections with no content should:

```text
render concise zero state
or
be omitted when another canonical section already explains the absence
```

Hard rule:

Do not remove a zero state if its absence would become ambiguous.

Do not say:

```text
complete
healthy
nothing happened
```

unless actually proven.

---

# Section Ordering

Pressure-test whether current order remains best after Sprint 030.

Do not reorder sections based on importance.

Section ordering should support comprehension.

Possible conceptual flow:

```text
SUBJECT
CURRENT

KNOWN FACTS
MISSING CONTEXT

SUBJECT CHANGES

KNOWN PROVIDER ACTIVITY
COMBIE OBSERVATIONS

RELATED CONTEXT

DETAILED PROVIDER EVIDENCE
```

This is not a required order.

Inspect current implementation and choose the smallest improvement.

Document why.

---

# No Hidden Attention

Formatting must not recreate Attention under another name.

Do not:

- bold failures specially based on significance;
- move errors to the top;
- sort failures before successes;
- label rows "important";
- label rows "attention";
- highlight provider errors as priority;
- create an "issues" subsection.

Chronology remains chronological.

Detailed evidence remains deterministic.

Presentation density is not prioritization.

---

# No Latest-Response Row Labels

This is a hard rule from Sprint 031.

Do not label individual retained evidence rows as:

```text
current
latest
in latest successful refresh
latest response
```

unless existing row-specific provenance independently establishes that.

Combie currently does not persist latest-success response membership IDs.

Result-count provenance alone is insufficient.

---

# Timestamp Formatting

Pressure-test whether timestamps are currently verbose or inconsistent.

If cleanup includes timestamp formatting:

- preserve exact timestamp value/authority;
- keep deterministic timezone behavior;
- do not convert to relative time like:
  `2m ago`
  unless deterministic testability and current CLI conventions already support it;
- prefer a stable machine-readable or concise exact representation.

Do not introduce current-clock-dependent formatting.

---

# Compact Identity

Chronology rows should remain understandable without exposing huge stable IDs where a safe name already exists.

Pressure-test:

```text
display name
+
provider/native type
```

while retaining native ID in structured provenance.

Do not remove IDs from detailed evidence if they are currently valuable for exact lookup.

Do not make chronology rows impossible to trace back to detail.

---

# Human Readability

Evaluate:

1. total line count before/after;
2. time needed to visually locate:
   - newest provider activity
   - current authority gap
   - full provider detail
3. repeated prose eliminated;
4. whether the section roles feel clearer;
5. whether compact rows are still understandable.

Do not optimize for minimum line count alone.

---

# Agent Compatibility

The CLI is human-facing, but structured application DTOs may also be agent-consumed later.

Do not degrade structured DTOs merely to simplify CLI text.

Formatter cleanup should stay in formatting where possible.

If chronology DTO changes are unnecessary, do not change them.

---

# Golden Output Study

Before implementation, create representative before/after output sketches for:

## Scenario A — GitHub + Vercel

Include:

```text
Known Facts
Missing Context
workflow evidence
deployment evidence
Provider Activity
Related Context
```

---

## Scenario B — Unknown authority + retained rows

Ensure:

```text
Missing Context owns the explanation
detailed evidence keeps a compact authority marker
```

---

## Scenario C — Neon operation evidence

Ensure compact chronology remains useful.

---

## Scenario D — Quiet / mostly empty investigation

Ensure zero-state cleanup does not imply completeness.

---

# Measurable Sprint Goal

Sprint 032 should reduce duplicated investigation output without reducing evidence fidelity.

Completion notes should report:

```text
representative before line count
representative after line count
duplicate authority prose removed
chronology row field count before/after
```

Do not treat a specific percentage reduction as a hard target.

Qualitative correctness matters more.

---

# Tests

Use:

```text
Red → Green → Refactor
```

Most changes should be formatter/CLI tests.

---

## Provider Activity Formatting

Test:

- one-line/compact Vercel deployment activity
- one-line/compact GitHub workflow activity
- one-line/compact Neon operation activity
- exact primary timestamp preserved
- provider-native state terminology preserved
- native evidence remains traceable
- subject row
- neighbor row
- Relationship provenance preserved structurally
- deterministic order unchanged
- no secondary timestamp dump in chronology

---

## Authority Formatting

Test:

- known populated
- known empty
- unknown with retained evidence
- never-successfully-refreshed
- last success provenance
- retained count
- compact detail marker
- Missing Context retains explanatory wording
- no misleading "current row" claim

---

## Row Membership Safety

Add explicit regression tests that output never says:

```text
in latest refresh
current deployment
current workflow run
latest-success row
```

for retained provider evidence when row membership is not known.

---

## Fact Interaction

Test:

- Known Facts unchanged semantically
- five-Fact cap unchanged
- no accidental removal of useful authority Fact
- reduced duplicate copy where intended

---

## Missing Context

Test:

- full supported inventory remains unchanged
- explanatory gap prose remains available
- no category removed
- no cap introduced
- zero state truthful

---

## Detailed Evidence

Test:

- full provider-specific details still render
- secondary timestamps still available
- provider-native metadata preserved
- authority marker remains truthful
- no evidence fields silently lost from full detail

---

## Zero States

Test:

- quiet investigation
- no provider activity
- no Changes
- no Relationships
- known-empty provider evidence
- no Missing Context

Ensure any omitted zero section remains unambiguous.

---

## Section Ordering

If order changes, assert exact deterministic order.

Do not let implementation-specific map/object ordering control sections.

---

## Offline / Read-Only

Regression:

- no provider calls
- no storage mutation
- repeated investigate output identical

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
569 tests
```

Final test count should increase modestly.

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
- Provider Activity data
- Combie Observations
- detailed provider evidence
- authority provenance
- provider contracts
- storage schemas
- offline behavior

---

# Architecture Constraints

Sprint 032 must not change:

```text
Resource
Relationship
Change
InvestigationFact
MissingContextItem
Provider evidence models
provider contracts
provider adapters
SQLite schemas
refresh authority storage
```

unless a concrete correctness defect is discovered.

If such a defect appears:

**STOP and report before broadening scope.**

---

# Security

Do not expose any new raw provider data.

Compact formatting must continue using normalized safe evidence.

Do not surface:

- credentials
- auth headers
- database secrets
- connection strings
- raw provider payloads
- unsafe error strings

Run the existing secret scan.

---

# Architecture Review

Before completion answer:

1. Did Sprint 032 remain formatter/presentation-focused?
2. Did storage change? Expected: no.
3. Did domain models change? Expected: no.
4. Did provider contracts change? Expected: no.
5. Did provider APIs change? Expected: no.
6. Did InvestigationContext change?
7. Did chronology DTOs change?
8. Is compact Provider Activity still fully traceable?
9. Are provider-native semantics preserved?
10. Is authority less repetitive?
11. Does Missing Context remain the canonical gap explanation?
12. Does detailed evidence still retain enough authority context?
13. Were any useful details removed?
14. Were zero states reduced safely?
15. Did any hidden ranking/Attention behavior appear? Expected: no.
16. Did any row get falsely labeled current/latest-success? Expected: no.
17. Is the output materially easier to scan?
18. What is now the largest remaining investigation friction?

---

# Completion Notes

## Baseline

```text
ebcf7333f22ca0612fad590fa4a86137d427a74d
docs(sprint): mark Sprint 031 DoD complete

Sprint 031 research:
a5b525913831c6f16b7c9ab38d64d204f25341d7

569 tests → 572 tests
typecheck clean
```

## Repository Understanding

`formatInvestigationContext` in `src/app/investigate.ts` composed:

```text
SUBJECT / CURRENT
KNOWN FACTS
MISSING CONTEXT
SUBJECT CHANGES
[DEPLOYMENTS | WORKFLOW RUNS | OPERATIONS]
RELATED CONTEXT (nested full evidence)
KNOWN PROVIDER ACTIVITY  ← was multi-line full cards
COMBIE OBSERVATIONS
```

Pre-032 Provider Activity called `formatDeployment` / `formatWorkflowRun` / `formatNeonOperation` per entry, plus Role, full Relationship evidence blocks, and authority lines — re-dumping the same cards already in family sections.

Detailed sections used multi-sentence authority preambles that restated Missing Context.

## Architecture Pressure

1. Formatter-only change is sufficient.  
2. No InvestigationContext / Facts / Missing Context / chronology DTO / storage / provider changes.  
3. Compact index + short authority markers remove the measured density without a new domain primitive.  
4. Row membership still unavailable — no current/latest labels.  
5. Canon unchanged.

## Before / After Output

### Before (activity entry, conceptual)

```text
Vercel deployment: dpl_1
Resource: vercel:project:…
Role: subject
Authority: populated
primary time field: created
uid: dpl_1
created at: …
building at: …
ready at: …
readyState: READY
…
observed by Combie at: …
```

(~12+ lines per activity row)

### After

```text
2026-08-09T10:02:00.000Z  Vercel deployment  dpl_1  readyState=READY  role=subject  authority=populated  resource=vercel:project:…
```

(1 line per activity row)

### Authority detail before

```text
Deployment evidence has not been successfully refreshed.
(List deployments failed…)
Prior recorded deployments (may be stale):
```

### After

```text
authority: unknown · retained history may be stale
(List deployments failed…)
Prior recorded deployments (may be stale):
```

## KNOWN PROVIDER ACTIVITY

Final compact format:

```text
{primaryTime}  {Provider} {family}  {nativeId}[ name=…][ state fields]  role=…  authority=…  resource={id}
```

Examples:

```text
2026-08-09T10:05:00.000Z  Neon operation  op_1  action=start_compute  status=finished  role=related via uses_domain_in  authority=populated  resource=neon:project:…
2026-08-09T10:00:00.000Z  GitHub workflow run  9001 name="ci" status=completed conclusion=success  role=related via source_for  authority=populated  resource=github:repository:…
```

Entries joined by single newlines (not blank-line-separated full cards).

## Authority Ownership

| Surface | Owns |
|---------|------|
| MISSING CONTEXT | Full gap explanation (unchanged taxonomy) |
| KNOWN FACTS | Bounded compression (unchanged) |
| Detailed evidence | Compact local marker only (`authority: …`) + retained/empty labels |
| Provider Activity | Compact `authority=` tag only |

## Detailed Evidence

Unchanged full cards: native IDs, secondary timestamps, metadata, provider-native fields, Combie `observedAt`.

When `result_count` known and `retained ≠ result_count`:

```text
authority: populated · latest successful response returned N; Combie retains M (membership of retained rows is not proven)
```

Explicitly refuses row-membership claims.

## Zero States

- Empty provider activity: unchanged  
- Empty detailed authority (unknown/empty with 0 rows): compact marker only (shorter)  
- Known Facts / Missing Context zero states: unchanged  

## Section Ordering

Unchanged. Chronology still newest-first by provider primary time (no failure-first sort).

## Row Membership Safety

Regression tests assert absence of:

```text
in latest refresh
current deployment
current workflow run
latest-success record
from latest response
```

## Human Scan Reduction

Representative multi-family investigation (3 activity rows):

| Surface | Before (approx lines) | After |
|---------|----------------------:|------:|
| Provider Activity block | ~40 | ~4 |
| Detail authority preambles | multi-sentence | 1 marker line |

Secondary timestamps still available under DEPLOYMENTS/WORKFLOW/OPERATIONS.

## Agent Compatibility

InvestigationContext, Facts, Missing Context, ProviderActivityEntry DTOs **unchanged**. Only `formatInvestigationContext` presentation changed.

## Validation

```text
bun test          — 572 pass (+3 density tests; presentation expectations updated)
bun run typecheck — clean
```

## Live Verification

Deferred (no credentials). Formatter fixtures sufficient.

## Architecture Review

1. Presentation-focused — yes  
2. Storage — no  
3. Domain models — no  
4. Provider contracts/APIs — no  
5. InvestigationContext — no  
6. Chronology DTOs — no (compose unchanged; format only)  
7. Provider Activity compact — yes  
8. Traceable — yes (time, id, resource, role, state, auth)  
9. Provider-native states intact — yes  
10. Missing Context canonical for gaps — yes  
11. Detail authority truthful — yes  
12. Evidence not removed — yes  
13. Zero states improved safely — yes  
14. No Attention/ranking — yes  
15. No false current/latest labels — yes  
16. Easier to scan — yes  
17. Next friction: large multi-neighbor RELATED dumps / multi-row detail cards still long when evidence volume is high  

## Explicit Questions

1. Duplicate full-card chronology + long authority prose.  
2. Multi-line cards → one-line chronological index.  
3. primaryTime, provider, family, native id, compact state, role/via, authority tag, resource id.  
4. Secondary timestamps, full relationship evidence blocks, multi-line field dumps from chronology.  
5. Yes — id + resource + time.  
6. Compact markers; full essays only in Missing Context.  
7. Yes.  
8. `authority: unknown|empty|populated` with retained/empty notes.  
9. No semantic change.  
10. No.  
11. No.  
12. Shortened empty/unknown-only detail blocks.  
13. No.  
14–16. No.  
17. No.  
18. No (composition unchanged).  
19. No.  
20. No.  
21. ~10× fewer lines in activity index for multi-family cases.  
22. Yes for chronology; detail volume still scales with evidence count.  
23. Long RELATED + multi-row full cards when many resources/evidence rows.  
24. Sprint 033: optional further presentation (e.g. RELATED neighbor evidence density) **or** leave investigate and return to product pressure — not Attention/correlation engines.

## Deviations

None from Sprint 031 recommendation C.

## Learnings

1. Index vs archive section roles must stay explicit.  
2. Stating “membership not proven” is better than silent cardinality equality assumptions.  
3. Formatter-only sprints still need broad expectation updates across historical investigate tests.

## Files Changed

```text
src/app/investigate.ts
tests/app/investigate-provider-activity.test.ts
tests/app/investigate-deployments.test.ts
tests/app/investigate-workflow-runs.test.ts
tests/app/investigate-operations.test.ts
tests/app/investigate-cli-density.test.ts  (new)
docs/internal/sprints/SPRINT-032.md
```

## Canon Changes

```text
None
```

## Commit

```text
92d1b4d2b7a231b15421c48bbf6da2687b055f5d
feat(cli): compact investigate provider activity index
```

---

# Definition of Done

- [x] Sprint 031 clean baseline verified
- [x] exact baseline SHA recorded
- [x] SKILL protocol followed
- [x] Canon read
- [x] relevant Sprint notes reviewed
- [x] Repository Understanding completed
- [x] Architecture Pressure completed
- [x] before/after output study completed
- [x] KNOWN PROVIDER ACTIVITY compacted
- [x] chronology remains deterministic
- [x] provider-native state semantics preserved
- [x] primary provider timestamps preserved
- [x] subject/neighbor scope preserved
- [x] Relationship provenance preserved
- [x] no full provider cards repeated in chronology
- [x] authority prose reduced where duplicated
- [x] Missing Context retains full gap explanation
- [x] detailed evidence keeps truthful authority marker
- [x] detailed provider evidence remains complete
- [x] secondary timestamps remain available in detail
- [x] no unsupported current-row membership claims
- [x] zero-state density pressure-tested
- [x] section order pressure-tested
- [x] Known Facts semantics unchanged
- [x] five-Fact cap unchanged
- [x] Missing Context semantics unchanged
- [x] Missing Context remains uncapped
- [x] Combie Observations semantics unchanged
- [x] no domain changes
- [x] no storage/schema changes
- [x] no provider contract/API changes
- [x] no Attention/ranking/scoring
- [x] focused tests added
- [x] full tests pass (572)
- [x] typecheck clean
- [x] completion notes updated
- [x] Canon None
- [x] committed separately
- [x] worktree clean
- [x] Sprint 033 not started
- [ ] no provider contract changes
- [ ] no provider API changes
- [ ] no new provider evidence
- [ ] no Attention surface
- [ ] no ranking
- [ ] no scoring
- [ ] no recommendations
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
- [ ] Sprint 032 committed separately
- [ ] worktree clean
- [ ] Sprint 033 not started

---

# Explicitly Out of Scope

Do not implement:

- AttentionItem
- AttentionCategory
- ATTENTION section
- AttentionEngine
- FocusEngine
- recommendations
- priority
- ranking
- scoring
- severity
- confidence
- filtering CLI
- new evidence filters
- multi-hop traversal
- recursive traversal
- row-membership persistence
- new Relationships
- application↔database inference
- new provider evidence
- new providers
- correlation
- SHA matching
- time-window matching
- sequence detection
- incident grouping
- causality
- root-cause analysis
- anomaly detection
- generic Event
- generic Evidence
- ObservationEngine
- CorrelationEngine
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
- Sprint 033 scaffolding

---

# Final Principle

> **Index compactly. Explain gaps once. Keep the evidence complete.**

And:

> **Make Combie easier to read without making Combie claim more than it knows.**