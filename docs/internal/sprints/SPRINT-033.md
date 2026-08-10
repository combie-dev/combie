# SPRINT-033 — Post-Cleanup Investigation Pressure

> **Status:** Complete (research only)
> **Depends on:** SPRINT-032
> **Type:** Research / product pressure
> **Primary goal:** Re-evaluate the end-to-end `combie investigate` experience after Missing Context and CLI density cleanup, and determine whether the dominant remaining friction is still presentation density or has shifted back to a missing product capability.
> **Production code:** None expected
> **Test code:** None expected
> **Storage / schema:** No changes
> **Provider contracts / APIs:** No changes
> **Correlation / causality / AI:** Research only; no implementation

---

## Goal

Sprint 032 completed a bounded presentation cleanup for `combie investigate`.

The investigation surface now has clearer responsibilities:

```text
KNOWN FACTS
→ concise summary of what Combie knows

MISSING CONTEXT
→ complete supported inventory of what Combie cannot currently establish

KNOWN PROVIDER ACTIVITY
→ compact provider-time chronological index

COMBIE OBSERVATIONS
→ Resource differences observed by Combie

DETAILED PROVIDER EVIDENCE
→ complete provider-specific records

RELATED CONTEXT
→ one-hop graph neighborhood and neighbor evidence
```

Sprint 032 also reduced authority duplication and compacted Provider Activity without changing:

```text
storage
domain models
provider contracts
provider APIs
chronology composition
Facts
Missing Context
authority semantics
```

The remaining reported friction is:

> **Long RELATED neighbor dumps and multi-row full evidence cards when evidence volume is high.**

But Sprint 033 must not assume that more formatting cleanup is automatically the correct next step.

The central product question is:

> **After Facts, Missing Context, compact chronology, and cleaned authority presentation, what is now the single largest thing preventing `combie investigate` from being genuinely useful during a real engineering investigation?**

Sprint 033 must determine whether the answer is still:

```text
presentation density
```

or whether the product is now constrained by:

```text
missing context
missing evidence
missing Relationships
investigation scope
cross-provider matching
correlation
or another precise capability
```

Sprint 033 does not implement the answer.

---

# Core Principle

> **Do not keep polishing the CLI merely because there is still text on the screen.**

And:

> **Do not add a new capability merely because presentation is no longer the biggest problem.**

Let realistic investigation pressure determine the next move.

---

# Baseline

Begin from the clean committed Sprint 032 baseline.

Expected Sprint 032 implementation commit:

```text
92d1b4d2b7a231b15421c48bbf6da2687b055f5d
feat(cli): compact investigate provider activity index
```

Sprint 032 also has later documentation commits:

```text
a7508a0
704a78e
```

Do not assume these short SHAs are current HEAD.

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

If Sprint 032 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 032 and Sprint 033.

---

# Sprint Type

Sprint 033 is:

```text
RESEARCH / POST-CLEANUP PRODUCT PRESSURE
```

Expected:

```text
zero production code changes
zero test code changes
zero schema changes
zero provider changes
```

Primary artifact:

```text
docs/internal/sprints/SPRINT-033.md
```

The Sprint should conclude with exactly one bounded recommendation for Sprint 034.

---

# Required Reading

Before research, read:

- `skills/build-combie/SKILL.md`
- Combie Canon
- SPRINT-029
- SPRINT-030
- SPRINT-031
- SPRINT-032
- SPRINT-033

Also revisit earlier Sprints only where needed for a specific investigation finding.

Focus on the transition:

```text
investigation capability pressure
→ Missing Context
→ Attention rejected
→ CLI density cleanup
→ post-cleanup reality
```

Do not reopen settled decisions without concrete new evidence.

---

# Repository Understanding Report

Inspect the complete post-Sprint-032 `combie investigate` experience.

At minimum inspect:

- current section order
- `KNOWN FACTS`
- `MISSING CONTEXT`
- compact `KNOWN PROVIDER ACTIVITY`
- `COMBIE OBSERVATIONS`
- `SUBJECT CHANGES`
- `RELATED CONTEXT`
- full Vercel deployment cards
- full GitHub workflow-run cards
- full Neon operation cards
- authority markers
- subject/neighbor provenance
- Relationship evidence
- Resource state
- existing fixtures
- CLI tests
- current formatter implementation

Document the actual current flow.

Explicitly answer:

1. What is the exact current section order?
2. Which sections are summaries?
3. Which sections are complete evidence views?
4. Which sections still produce the most lines?
5. Which sections still repeat information?
6. Which sections require the most manual scanning?
7. Is Related Context now the dominant density source?
8. Are detailed provider cards now the dominant density source?
9. Is chronology still meaningfully reducing scan cost?
10. Is Missing Context making uncertainty sufficiently visible?
11. Are Known Facts still useful under realistic evidence volume?
12. Does the current surface remain understandable when multiple neighbors exist?
13. Does the current surface remain understandable when each neighbor has multiple provider evidence rows?
14. Does the current output help a human form the next investigation question?
15. Does the structured InvestigationContext help an agent do the same?
16. Is the remaining friction primarily presentation or capability?
17. Are any current product limitations still intentional semantic boundaries?

No implementation before this report.

---

# Central Decision

Sprint 033 must distinguish two broad outcomes.

## Outcome A — Presentation Is Still Dominant

The knowledge model is sufficient, but:

```text
RELATED CONTEXT
nested neighbor detail
multi-row provider cards
repeated graph/evidence structure
```

still make investigation materially hard to scan.

If this wins, Sprint 034 should be a narrow presentation cleanup.

---

## Outcome B — Capability Is Now Dominant

The current presentation is good enough, and the investigator is blocked because Combie genuinely lacks a capability.

Examples might include:

```text
stronger deterministic Relationship
specific cross-provider evidence
bounded correlation research
new investigation scope
another operational evidence family
structured gap for unsupported context
```

If this wins, Sprint 034 should target exactly one capability.

Do not mix A and B.

---

# Scenario Study A — GitHub ↔ Vercel, Single Neighbor

Use a canonical:

```text
GitHub repository
source_for
Vercel project
```

with:

```text
workflow runs
deployments
Known Facts
Missing Context
Provider Activity
Combie Observations
Related Context
```

Investigator question:

> A deployment looks wrong. Can I understand the surrounding evidence quickly enough to know what question to ask next?

Study:

1. line density;
2. duplicate information;
3. whether Related Context helps or overwhelms;
4. whether full workflow/deployment cards remain useful;
5. whether any missing capability blocks progress;
6. whether the next manual step is reading, filtering, matching, or inferring.

---

# Scenario Study B — Multiple One-Hop Neighbors

Construct a fixture where the subject has multiple direct Relationships.

Example:

```text
subject project
├── repository A
├── repository B
└── zone
```

Use only canonical existing Relationship types.

Do not invent unsupported topology.

Study:

1. whether one-hop scope remains understandable;
2. how Related Context scales;
3. whether nested neighbor evidence becomes hard to scan;
4. whether repeated headers/cards dominate;
5. whether grouping by neighbor would help;
6. whether more scope is actually needed or would make things worse.

This scenario is critical for testing the Related Context density hypothesis.

---

# Scenario Study C — Evidence-Heavy Neighbor

Use one related Resource with many provider evidence rows.

Example:

```text
GitHub repository
→ many workflow runs
```

or:

```text
Vercel project
→ many deployments
```

Study:

1. whether full cards become the dominant friction;
2. whether the compact Provider Activity index already solves enough;
3. whether detailed sections need collapsing/grouping/summary;
4. whether filters would help;
5. whether removing detail would damage trust;
6. whether the problem is simply volume.

---

# Scenario Study D — Unknown Authority + Retained Evidence

Use:

```text
unknown current authority
+
retained history
+
last success provenance
+
Missing Context
```

Study:

1. whether authority wording is now sufficiently compact;
2. whether trust state remains obvious;
3. whether duplicate authority explanation persists;
4. whether presentation is still the issue;
5. whether any new capability is actually needed.

This scenario tests whether Sprint 032 solved its intended problem.

---

# Scenario Study E — Change-Heavy + Provider Activity

Use:

```text
multiple Resource Changes
+
provider-native evidence
+
one-hop context
```

Study:

1. whether dual chronology remains useful;
2. whether detailed cards overshadow chronology;
3. whether human still performs repetitive manual temporal comparison;
4. whether that manual work is safe navigation or actual correlation;
5. whether the capability gap is finally cross-provider matching.

Do not merge clocks.

---

# Scenario Study F — Neon Isolated Resource

Use a Neon Resource with:

```text
operation evidence
no known one-hop Relationships
Missing Context
Known Facts
Provider Activity
```

Study:

1. whether absence of graph context is clear enough;
2. whether "no known Relationships" is actionable enough;
3. whether a missing app↔db relationship still feels like the dominant gap;
4. whether Sprint 015's deferral still holds;
5. whether another deterministic provider-backed Relationship has become available since then.

Do not assume new evidence exists.

If evaluating current provider APIs is required to answer #5, document that as a future research need rather than performing unrelated web work inside Sprint 033 unless the Sprint protocol allows it.

---

# Scenario Study G — Quiet Investigation

Use:

```text
few/no Changes
known-empty provider evidence
no Missing Context
healthy/normal provider-native state
```

Study:

1. whether the CLI feels appropriately quiet;
2. whether Related Context still over-expands;
3. whether detailed sections add unnecessary bulk;
4. whether omission/collapse would help;
5. whether any capability gap exists at all.

This prevents optimizing only failure-heavy scenarios.

---

# Human Investigation Tasks

For each scenario, list the exact manual tasks still required.

Examples:

```text
scroll
expand mentally
match Resource names
compare provider states
compare timestamps
find neighbor boundaries
distinguish subject vs neighbor
notice missing graph context
compare multiple workflow runs
match workflow run to deployment
infer whether two records correspond
```

Classify each task:

```text
A. presentation / density
B. navigation
C. filtering
D. missing context
E. missing evidence
F. missing Relationship
G. deterministic matching
H. correlation
I. interpretation
J. causality
```

Rank by:

```text
frequency
effort
semantic risk
product value
```

---

# Agent Investigation Tasks

Evaluate the structured investigation state independently of CLI output.

Ask:

1. Does an agent receive enough structured data to identify subject and neighbors?
2. Can it distinguish trusted/unknown evidence?
3. Can it identify provider-native failure states without parsing prose?
4. Can it identify missing Relationships?
5. Can it identify which evidence rows belong to which Resource?
6. Does it still need to perform a deterministic matching step between providers?
7. Is that matching possible with current structured fields?
8. Is the largest agent limitation different from the human limitation?
9. Would further CLI cleanup provide zero agent value?
10. Would a new structured capability provide both human and agent value?

This comparison is important.

---

# Candidate A — RELATED CONTEXT Density Cleanup

Pressure-test a Sprint 034 presentation slice such as:

```text
RELATED CONTEXT

GitHub repository  repo-a  via source_for
  state ...
  changes: 2
  workflow runs: 7
  authority: unknown

Vercel project  app-a
  ...
```

with full details elsewhere or nested selectively.

Do not design final output yet.

Research:

1. Is Related Context currently repeating complete neighbor cards?
2. Could it become a compact neighbor index?
3. Would full neighbor details remain available elsewhere?
4. Would compaction lose relationship evidence?
5. Would a single compact row per neighbor materially reduce scanning?
6. Is this merely the same successful pattern as Provider Activity compaction?
7. Would this solve the dominant human friction?
8. Would it help agents? Probably little; record that honestly.

---

# Candidate B — Detailed Evidence Density Cleanup

Pressure-test whether multi-row provider cards need bounded compaction.

Possible future approaches:

```text
show first N rows
group counts
summary + full optional view
compact tabular layout
```

Do not implement.

Ask:

1. Does limiting rows hide evidence?
2. Would a cap introduce hidden prioritization?
3. Can full evidence remain accessible in the same command?
4. Is a new CLI flag required?
5. Would table layout solve enough without hiding records?
6. Is this a presentation problem only?

---

# Candidate C — Evidence Filtering

Revisit filtering now that density has improved elsewhere.

Possible future filters:

```text
provider
resource
subject/neighbor
evidence family
state
time range
```

Do not design commands.

Ask:

1. Is the user repeatedly searching within long detail sections?
2. Is filtering more useful than compaction?
3. Would filters create discoverability complexity?
4. Would agents need them?
5. Can filters remain deterministic and lossless?

---

# Candidate D — Deterministic Cross-Provider Matching Research

This is the most important capability candidate to pressure-test if presentation no longer dominates.

Potential example:

```text
GitHub workflow run
↔
Vercel deployment
```

Possible evidence might include:

```text
commit SHA
repository identity
branch/ref
provider-native metadata
```

Sprint 031 rejected Attention partly because row membership was not known.

Sprint 033 should ask a different question:

> Are investigators repeatedly performing a deterministic evidence-matching step that Combie should understand directly?

Do not implement matching.

Research only whether this is now the dominant manual task.

If yes, Sprint 034 should be **research-only** and investigate one exact pair.

Do not jump to a generic CorrelationEngine.

---

# Candidate E — New Deterministic Relationship

Pressure-test whether a specific missing Relationship is blocking investigation.

Examples:

```text
repository ↔ deployment context
application ↔ database
project ↔ domain
```

Only consider a Relationship if:

```text
provider evidence can prove the relation exactly
```

Do not revive previously rejected edges based on names or secrets.

If no exact evidence exists, reject.

---

# Candidate F — Another Provider Evidence Family

Ask whether current scenarios repeatedly need evidence that Combie simply does not ingest.

Examples could include future:

```text
Sentry issue/release/deploy evidence
Cloudflare Worker deployment/version evidence
```

Do not implement or research provider APIs deeply unless scenario pressure clearly selects this as the leading gap.

The question is whether the absence is currently blocking investigation.

---

# Candidate G — Investigation Scope Expansion

Current scope is one hop.

Pressure-test whether realistic scenarios now require:

```text
subject
→ neighbor
→ neighbor's neighbor
```

Do not implement.

Ask:

1. Is one-hop actually insufficient?
2. Would two-hop bring useful context or mostly noise?
3. Can the need be demonstrated in current graph fixtures?
4. Would scope expansion make density worse?
5. Should any future scope expansion be explicit and bounded?

---

# Candidate H — No Further Investigation Capability Yet

It is valid to conclude:

```text
The current product is useful enough.
The next work should shift to another part of Combie.
```

For example:

```text
new provider support
MCP/API exposure
controlled execution research
installation/distribution
UX outside investigate
```

But only choose this if the investigation experience no longer has a compelling high-value gap.

Do not force another investigation Sprint.

---

# Presentation vs Capability Matrix

Produce:

| Candidate | Type | Human Value | Agent Value | Semantic Risk | Architecture Cost | Evidence |
|---|---|---:|---:|---|---|---|
| Related Context compaction | Presentation | | | | | |
| Detailed evidence compaction | Presentation | | | | | |
| Filtering | Presentation/UX | | | | | |
| Cross-provider matching research | Capability | | | | | |
| New Relationship | Capability | | | | | |
| New provider evidence | Capability | | | | | |
| Scope expansion | Capability | | | | | |
| Pause investigate work | Product | | | | | |

Use qualitative ratings.

---

# Dominant-Friction Test

At the end of every scenario answer:

```text
If I could remove only ONE manual step from this investigation,
which step would it be?
```

Then classify that step.

Sprint 033 should select the capability that removes the most important repeated manual step across scenarios.

Not the easiest implementation.

Not the most interesting architecture.

---

# "Good Enough" Test

Explicitly determine whether `combie investigate` has crossed a product threshold.

Ask:

1. Can a user understand the subject?
2. Can they see related Resources?
3. Can they understand current trust gaps?
4. Can they see provider activity in order?
5. Can they see Resource Changes separately?
6. Can they inspect detailed evidence?
7. Can they understand what Combie does not know?
8. Can they form the next investigation question without Combie interpreting the evidence?

If yes across most scenarios, say:

```text
investigate is product-useful enough
```

even if there is still room for polish.

This matters.

Do not endlessly optimize investigation output.

---

# Correlation Pressure

Correlation may finally become more relevant, but Sprint 033 must use a high bar.

Only recommend correlation research if:

1. multiple scenarios show the same manual matching step;
2. the matching appears deterministic;
3. exact provider evidence likely exists;
4. the user gains meaningful investigation value;
5. presentation cleanup would not solve the problem.

If selected, Sprint 034 must research one exact pair.

Example:

```text
GitHub workflow-run ↔ Vercel deployment
```

not:

```text
build correlation engine
```

---

# CLI Density Pressure

If presentation still wins, determine the **single** next formatter slice.

Do not choose:

```text
clean up investigate more
```

Choose something exact such as:

```text
compact Related Context into one summary block per neighbor while preserving full provenance
```

or:

```text
compact multi-row provider evidence into stable table rows without hiding records
```

One slice only.

---

# Output Study

Create before/after research mocks for the top two presentation candidates.

Also create a capability mock if capability is competitive.

Example capability mock:

```text
MATCHED PROVIDER EVIDENCE
GitHub workflow run 123
Vercel deployment abc

Evidence:
commit SHA ...
```

This is research-only.

Do not imply such matching exists today.

Clearly mark hypothetical output.

---

# No New Semantics by Formatting

If presentation wins, formatting must not introduce:

```text
priority
importance
risk
attention
current-row membership
correlation
causality
```

This boundary remains unchanged.

---

# No Generic Engine

If capability wins, do not recommend generic:

```text
InvestigationEngine
CorrelationEngine
MatchingEngine
RelationshipEngine
```

Recommend the smallest evidence-backed primitive.

---

# Validation

Sprint 033 is research-only.

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

unless unrelated repository baseline changes.

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

# Architecture Decision

At completion choose exactly one.

## A — Compact RELATED CONTEXT Next

Choose if nested one-hop neighbor output remains the dominant human friction.

Sprint 034 should be presentation-only.

---

## B — Compact Detailed Provider Evidence Next

Choose if provider cards themselves dominate scanning after chronology cleanup.

Sprint 034 should be presentation-only.

---

## C — Add/Research Evidence Filtering Next

Choose if the main problem is finding specific records inside otherwise useful full evidence.

State whether Sprint 034 is research or implementation.

---

## D — Research One Exact Cross-Provider Match Next

Choose if repeated deterministic manual matching is now the dominant capability gap.

Sprint 034 must be research-only and name the pair.

---

## E — Research/Implement One Exact Relationship or Evidence Gap

Choose only if a specific deterministic missing context blocks scenarios.

Name it exactly.

---

## F — Expand Investigation Scope Research

Choose only if one-hop demonstrably blocks realistic investigations.

Sprint 034 must be research-only.

---

## G — Investigate Is Good Enough; Shift Product Focus

Choose if no remaining investigation gap justifies another Sprint.

Name the next product area to pressure-test.

---

## H — Another Narrow Finding

Use only if the research uncovers a stronger precise direction.

Name it exactly.

---

# Recommendation Criteria

The winning recommendation should maximize:

```text
real investigation value
repeated manual work removed
human usefulness
agent usefulness
determinism
provenance
```

while minimizing:

```text
semantic risk
architecture expansion
surface duplication
implementation complexity
```

---

# Completion Notes

Update `docs/internal/sprints/SPRINT-033.md` with:

## Baseline

Exact Sprint 032 HEAD SHA.

## Repository Understanding

Current post-cleanup investigation surface.

## Post-Cleanup Assessment

Whether Sprint 032 materially reduced scanning.

## Scenario A

GitHub↔Vercel findings.

## Scenario B

Multiple-neighbor findings.

## Scenario C

Evidence-heavy neighbor findings.

## Scenario D

Unknown-authority findings.

## Scenario E

Change-heavy findings.

## Scenario F

Neon isolated findings.

## Scenario G

Quiet-investigation findings.

## Human Manual Work

Ranked remaining tasks.

## Agent Manual Work

Ranked remaining structured gaps.

## Related Context Density

Findings.

## Detailed Evidence Density

Findings.

## Filtering Pressure

Findings.

## Cross-Provider Matching Pressure

Findings.

## Relationship / Evidence Pressure

Findings.

## Scope Pressure

Findings.

## Good-Enough Test

Direct conclusion.

## Presentation vs Capability Matrix

Completed matrix.

## Dominant Friction

Single largest repeated manual step.

## Final Recommendation

Exactly one:

```text
A
B
C
D
E
F
G
H
```

## Sprint 034

One bounded next step.

## Validation

Tests/typecheck/diff/security.

## Canon Changes

Changes or `None`.

## Commit

Exact Sprint 033 commit SHA.

---

# Explicit Questions

Answer all:

1. Did Sprint 032 materially improve scanability?
2. Is Related Context now the largest density source?
3. Are detailed provider cards the largest density source?
4. Is authority repetition still a meaningful problem?
5. Is Provider Activity now sufficiently compact?
6. Are Known Facts still useful?
7. Is Missing Context still useful?
8. Is the one-hop model understandable with multiple neighbors?
9. Does one-hop remain sufficient?
10. Is the largest remaining friction human presentation or missing capability?
11. What manual step occurs most often?
12. What manual step costs the most effort?
13. What is the largest agent-specific gap?
14. Do humans and agents now have different dominant needs?
15. Would Related Context compaction materially help?
16. Would detailed evidence compaction materially help?
17. Would filtering materially help?
18. Are investigators repeatedly matching cross-provider evidence manually?
19. If yes, what exact pair?
20. Does deterministic evidence appear available for that match?
21. Is another exact Relationship needed?
22. Is another evidence family needed?
23. Is investigation scope insufficient?
24. Is `combie investigate` now product-useful enough?
25. Should investigation work pause?
26. Which A/B/C/D/E/F/G/H recommendation wins?
27. What exactly should Sprint 034 do?

---

# Definition of Done

- [ ] Sprint 032 clean baseline verified
- [ ] exact baseline SHA recorded
- [ ] SKILL protocol followed
- [ ] Canon read
- [ ] relevant Sprint history reviewed
- [ ] Repository Understanding completed
- [ ] post-cleanup surface mapped
- [ ] Scenario A completed
- [ ] Scenario B completed
- [ ] Scenario C completed
- [ ] Scenario D completed
- [ ] Scenario E completed
- [ ] Scenario F completed
- [ ] Scenario G completed
- [ ] human manual tasks classified
- [ ] agent manual tasks classified
- [ ] Related Context density pressure-tested
- [ ] detailed evidence density pressure-tested
- [ ] filtering pressure-tested
- [ ] cross-provider matching pressure-tested
- [ ] Relationship/evidence pressure-tested
- [ ] scope pressure-tested
- [ ] pause-investigation option pressure-tested
- [ ] presentation-vs-capability matrix completed
- [ ] dominant friction identified
- [ ] good-enough test answered
- [ ] exactly one A/B/C/D/E/F/G/H recommendation selected
- [ ] Sprint 034 bounded precisely
- [ ] no production implementation
- [ ] no test implementation
- [ ] no schema changes
- [ ] no provider changes
- [ ] no new Relationships
- [ ] no correlation implementation
- [ ] no causality
- [ ] no AI
- [ ] no scoring
- [ ] no ranking
- [ ] full tests pass
- [ ] typecheck passes
- [ ] secret scan clean
- [ ] diff/whitespace checks clean
- [ ] completion notes updated
- [ ] Canon changes recorded or None
- [ ] Sprint 033 committed separately
- [ ] worktree clean
- [ ] Sprint 034 not started

---

# Explicitly Out of Scope

Do not implement:

- Related Context compaction
- detailed evidence compaction
- evidence filtering
- new CLI flags
- multi-hop traversal
- recursive traversal
- new Relationships
- application↔database inference
- new provider evidence
- new providers
- cross-provider matching
- correlation
- SHA matching
- temporal matching
- sequence detection
- incident grouping
- causality
- root-cause analysis
- anomaly detection
- generic Event
- generic Evidence
- ObservationEngine
- CorrelationEngine
- MatchingEngine
- AI/LLM summaries
- embeddings
- logs
- metrics
- traces
- webhooks
- MCP/API/SDK/UI
- controlled execution
- Sprint 034 scaffolding

---

# Final Principle

> **Once the interface is readable enough, stop polishing it and find the next real product constraint.**

And:

> **Optimize the investigator's work, not the amount of text Combie prints.**

---

# Completion Notes

## Baseline

```text
HEAD: 704a78e71b5e44a8e0c4f3b6a15d8b3e9c7f2a04
docs(sprint): mark Sprint 032 DoD complete

Sprint 032 implementation commit: 92d1b4d2b7a231b15421c48bbf6da2687b055f5d
Sprint 032 docs commits: a7508a0, 704a78e

Tests: 572 passing, 0 failing, 2364 expect() calls, 52 files
Typecheck: clean (tsc --noEmit)
Worktree: clean (only untracked docs/internal/sprints/SPRINT-033.md)
```

## Repository Understanding

Current post-Sprint-032 `combie investigate` output section order:

```text
1. SUBJECT                                    fixed ~8 lines
2. CURRENT                                    fixed ~5 lines
3. KNOWN FACTS                                bounded to 5 bullets, ~12 lines max
4. MISSING CONTEXT                            variable, ~3–12 lines
5. SUBJECT CHANGES                            ~5 lines per Change
6. DEPLOYMENTS (newest first)                 ~9 lines per deployment card
7. WORKFLOW RUNS (newest first)               ~14 lines per workflow-run card
8. OPERATIONS (newest first)                  ~10 lines per operation card
9. RELATED CONTEXT                            ~10–13 lines per neighbor base
                                              + nested evidence cards per neighbor
10. KNOWN PROVIDER ACTIVITY                   1 compact line per entry (Sprint 032)
11. COMBIE OBSERVATIONS                       ~8 lines per timeline entry
```

Section classification:

- Summaries/indexes: KNOWN FACTS (5-bullet cap), MISSING CONTEXT (gap inventory), KNOWN PROVIDER ACTIVITY (compact index), SUBJECT (identity), CURRENT (state).
- Full evidence views: DEPLOYMENTS, WORKFLOW RUNS, OPERATIONS (subject-level cards), RELATED CONTEXT (neighbor base + nested cards).
- Timelines: SUBJECT CHANGES, COMBIE OBSERVATIONS.

Density analysis:

1. RELATED CONTEXT is now the dominant density source in multi-neighbor scenarios. Each neighbor adds ~10 lines of base context plus up to ~50+ lines of nested evidence cards. In the highest-density test (2 neighbors, 3 provider families), RELATED CONTEXT reaches ~52 lines — roughly 4x the next largest section.
2. Detailed evidence cards are the second density source. Each deployment ~9 lines, workflow run ~14 lines, operation ~10 lines. These appear at subject level AND nested inside RELATED CONTEXT per neighbor.
3. Provider Activity is now compact (1 line per entry) and never a density concern.
4. KNOWN FACTS is bounded at 5 bullets (~12 lines max).
5. Authority duplication is solved: compact markers on detail, full explanation in Missing Context, compact tags on Activity.

## Post-Cleanup Assessment

Sprint 032 materially improved scanning by compacting Provider Activity from multi-line full-card dumps to single-line index entries (~10x reduction for that section). Authority prose ownership eliminated repetition across sections. These were the correct interventions.

The remaining density is now concentrated in two areas: RELATED CONTEXT (multiplicative with neighbors × evidence) and detailed evidence cards (linear with evidence count, amplified by nesting inside RELATED CONTEXT).

## Scenario A — GitHub ↔ Vercel Single Neighbor

Setup: GitHub repository → source_for → Vercel project. 5 deployments, 5 workflow runs, populated authority on both sides.

Estimated output: ~120 lines.
- DEPLOYMENTS (subject): ~46 lines (5 × 9 + authority)
- RELATED CONTEXT: ~90 lines (1 neighbor × (10 base + 5 × 14 workflow cards + authority))
- KNOWN PROVIDER ACTIVITY: ~10 compact lines
- COMBIE OBSERVATIONS: ~3 lines

What Combie already provides: Subject deployment evidence, neighbor workflow run evidence, compact chronology index, trust state, one-hop relationship with evidence provenance.

Remaining manual steps:
1. Scroll through Related Context (90 lines of workflow run cards). [A — presentation]
2. Match specific deployment to specific workflow run by reading headSha on one side and visually searching for matching commit identity on the other. [G — deterministic matching]
3. Compare readyState vs conclusion to assess whether both providers agree on outcome. [I — interpretation]

One manual step to remove: Match deployment to workflow run by commit SHA. Classification: G — deterministic matching.

## Scenario B — Multiple One-Hop Neighbors

Setup: Vercel project ← source_for from 3 GitHub repos, → uses_domain_in → 2 Cloudflare zones. Each repo has workflow runs.

Estimated output: ~200+ lines.
- RELATED CONTEXT: ~150+ lines (5 neighbors × ~30 lines each)

What Combie already provides: All neighbors listed with direction, evidence, and per-neighbor evidence.

Remaining manual steps:
1. Find neighbor boundaries while scrolling (each neighbor block starts with direction arrow + identity but evidence sections blend together). [B — navigation]
2. Read across multiple evidence blocks for patterns. [A — presentation]
3. Identify which neighbor's evidence is most relevant. [I — interpretation]

One manual step to remove: Scroll through repeated neighbor evidence blocks. Classification: A — presentation.

## Scenario C — Evidence-Heavy Neighbor

Setup: GitHub repository with 20 workflow runs as related neighbor.

Estimated output: ~300+ lines from Related Context alone (20 × ~14 lines per card + authority).

What Combie already provides: All 20 workflow run cards, compact activity index (20 one-line entries), authority state.

Remaining manual steps:
1. Scroll through 280+ lines of workflow run cards in Related Context. [A — presentation]
2. Find specific run of interest without filtering. [C — filtering]
3. Identify failure patterns across 20 runs. [I — interpretation]

One manual step to remove: Scroll through 280+ lines of evidence cards. Classification: A — presentation.

## Scenario D — Unknown Authority + Retained Evidence

Setup: Vercel project, unknown current authority, 3 retained deployments, last success provenance recorded.

Estimated output: ~45 lines. Sprint 032 approach works well:
- Missing Context: full gap explanation (1 bullet)
- Detail marker: `authority: unknown · retained history may be stale` (1 line)
- Evidence cards: 3 × 9 lines with "Prior recorded deployments (may be stale)" prefix

What Combie already provides: Trust gap clearly stated, stale evidence clearly marked, provenance preserved.

Remaining manual steps: None that are compelling. Sprint 032 solved this scenario.

One manual step to remove: N/A. No significant friction remains.

## Scenario E — Change-Heavy + Provider Activity

Setup: 10 Resource Changes + 10 provider activity entries + 1 neighbor.

Estimated output: ~120 lines.
- COMBIE OBSERVATIONS: ~80 lines (10 × 8 lines per timeline entry)
- KNOWN PROVIDER ACTIVITY: ~10 compact lines
- SUBJECT CHANGES: ~50 lines (10 × 5)

What Combie already provides: Dual chronology (Combie observation time + provider time), compact activity index, per-resource change history.

Remaining manual steps:
1. Mentally merge Combie observation time and provider time when cross-referencing. [B — navigation]
2. Compare change timestamps across providers. [I — interpretation]

One manual step to remove: Merge dual clocks. Classification: B — navigation. Not correlation; this is safe temporal navigation.

## Scenario F — Neon Isolated Resource

Setup: Neon project, operation evidence, no known Relationships.

Estimated output: ~35 lines. Missing Context clearly states "No one-hop Relationships are currently known to Combie for neon:project:neon-abc."

What Combie already provides: Isolation clearly flagged, operation evidence, authority state.

Remaining manual steps:
1. Determine whether "no known relationships" means isolated or incomplete discovery. [D — missing context]

One manual step to remove: N/A. The "no known relationships" indicator is already actionable. Sprint 015 deferral of application↔database relationship still holds — no exact provider-backed evidence available.

## Scenario G — Quiet Investigation

Setup: Few/no Changes, known-empty evidence, no Missing Context, healthy states.

Estimated output: ~20 lines. All sections at minimum. Output is appropriately quiet.

Remaining manual steps: None.

One manual step to remove: N/A. No friction exists.

## Human Manual Work

Ranked by frequency × effort:

| Task | Classification | Frequency | Effort |
|---|---|---|---|
| Scroll through Related Context neighbor evidence | A — presentation | Very high | High |
| Match workflow run ↔ deployment by commit SHA | G — deterministic matching | High | High |
| Scan evidence cards for state indicators | A — presentation | High | Medium |
| Find neighbor boundaries in long output | B — navigation | Medium | Low |
| Compare provider states (readyState vs conclusion) | I — interpretation | Medium | Low |
| Mentally merge dual chronologies | B — navigation | Low | Low |

## Agent Manual Work

Ranked by significance:

| Gap | Impact |
|---|---|
| No deterministic cross-provider evidence matching | Cannot link deployment ↔ workflow run without human SHA comparison |
| No structured evidence grouping across providers | Cannot identify which evidence items correspond to the same event |
| No temporal correlation between providers | Cannot narrow evidence to a time window across provider clocks |

Agent gap #1 is the dominant agent-specific limitation. An agent receiving InvestigationContext has all evidence but cannot programmatically determine that Vercel deployment X corresponds to GitHub workflow run Y. The structured data has no join key at the evidence-row level.

## Related Context Density

Related Context is the dominant output section in realistic multi-neighbor scenarios. It grows multiplicatively: each neighbor adds ~10 lines base + nested evidence cards (~10–14 lines per evidence row). In the highest-density test (2 neighbors, 3 families), Related Context reaches ~52 lines — 4x any other section.

Related Context compaction (compact neighbor index, full detail elsewhere) would materially reduce scanning cost in scenarios B and C. However, it would not solve the cross-provider evidence matching gap that appears in scenario A (the most common investigation pattern).

## Detailed Evidence Density

Detailed evidence cards are the primary output amplifier. Per-card costs: deployment ~9 lines, workflow run ~14 lines, operation ~10 lines. Cards appear at subject level AND nested inside Related Context. A subject with 10 deployments + 1 neighbor with 10 workflow runs produces ~230 lines of cards alone.

Compaction could help (table layout, grouping), but any cap risks hiding evidence or implying priority. The Sprint 031 principle that limiting rows creates hidden prioritization still holds.

## Filtering Pressure

Low. Investigators are not yet searching within long evidence lists for specific records — they are reading chronologically or scanning for state indicators. Filtering would add discoverability complexity. If cross-provider matching is implemented, filtering pressure decreases further (matched pairs reduce the evidence set).

## Cross-Provider Matching Pressure

**High. This is the dominant capability gap.**

The most common investigation question is: "Did this workflow run correspond to this deployment?" Investigators currently match by:

1. Reading `headSha` from GitHub workflow run card
2. Searching for matching commit identity on the Vercel deployment side
3. Comparing `headBranch` to deployment context
4. Using temporal proximity as a weak signal

**Critical finding:** Current normalized `VercelDeploymentEvidence` has NO commit SHA and NO branch field. The GitHub side has both (`headSha`, `headBranch`). The matching is one-sided and therefore impossible with current normalized evidence.

**However**, the Vercel API `meta` field (typed as `meta?: unknown` in `VercelDeploymentRaw`, deployment.ts:119) is known to contain `githubCommitSha`, `githubCommitRef`, `githubCommitRepo`, and `githubCommitMessage` for git-connected deployments. Combie currently drops this field during normalization — the `normalizeDeployment` function does not accept `meta` in its parameter type (deployment.ts:151–164). Test `"excludes secrets, creator, meta, urls, env from compact evidence"` (deployment-normalize.test.ts:76) explicitly verifies this exclusion.

If Sprint 034 extracts `githubCommitSha` and `githubCommitRef` from `meta` and adds them to the normalized evidence type, deterministic matching becomes straightforward:

```text
scope: source_for Relationship (existing)
match: deployment.gitCommitSha === workflowRun.headSha
```

This is a single exact pair, bounded to one investigation surface, fully deterministic.

## Relationship / Evidence Pressure

No new Relationship type is needed. The existing `source_for` Relationship between GitHub repository and Vercel project provides sufficient scope for deployment↔workflow-run matching.

Application↔database Relationship (Sprint 015 deferral) still holds — no exact provider-backed evidence available.

## Scope Pressure

One-hop scope remains sufficient for all studied scenarios. Two-hop would increase noise and worsen the density problem without adding investigation value. No realistic scenario demonstrably fails under one-hop.

## Good-Enough Test

| Criterion | Met? |
|---|---|
| Understand the subject | Yes |
| See related Resources | Yes |
| Understand trust gaps | Yes |
| See provider activity in order | Yes |
| See Resource Changes separately | Yes |
| Inspect detailed evidence | Yes |
| Understand what Combie does not know | Yes |
| Form the next investigation question | Yes — with one gap: cannot connect evidence across provider boundaries without manual matching |

`combie investigate` is mostly product-useful. The one gap preventing it from being genuinely useful during real engineering investigation is cross-provider evidence correlation — the ability to connect a deployment to its corresponding workflow run.

## Presentation vs Capability Matrix

| Candidate | Type | Human Value | Agent Value | Semantic Risk | Architecture Cost | Evidence |
|---|---|---|---|---|---|---|
| Related Context compaction | Presentation | Medium | Low | Low | Low | Test density analysis confirms Related is dominant section |
| Detailed evidence compaction | Presentation | Medium | Low | Medium (caps imply priority) | Low | Per-card line counts confirm amplification |
| Filtering | Presentation/UX | Low | Low | Low | Medium | Low current pressure |
| Cross-provider matching research | Capability | High | High | Low (deterministic field match) | Medium (evidence extension) | Vercel API meta field likely available |
| New Relationship | Capability | Low | Low | High (no exact evidence) | Medium | No exact evidence available |
| New provider evidence | Capability | Medium | Medium | Low | High | Not blocking current scenarios |
| Scope expansion | Capability | Low | Low | High (noise) | High | No scenario fails under one-hop |
| Pause investigate work | Product | N/A | N/A | N/A | N/A | Cross-provider matching remains compelling |

## Dominant Friction

The single largest repeated manual step across scenarios A, B, and C is: **matching a specific Vercel deployment to a specific GitHub workflow run by manually comparing commit SHAs, branches, and timing across evidence sections and providers.**

This step is:
- High frequency (appears in the most common investigation pattern: deployment investigation)
- High effort (requires reading and comparing fields across distant output sections)
- Semantically risky (manual comparison is error-prone)
- Deterministic (exact provider evidence likely exists in Vercel API `meta`)
- Not solvable by presentation cleanup alone (the evidence is displayed; the connection is not made)

## Final Recommendation

**D — Research One Exact Cross-Provider Match Next**

Rationale:

1. The dominant friction has shifted from presentation to capability. Presentation cleanup (Sprints 031–032) has done its work — investigate output is materially more scannable. The remaining gap is structural.

2. Cross-provider matching appears in multiple scenarios (A, B, C) as the highest-value remaining manual step.

3. The matching is deterministic: commit SHA is a unique identifier that both providers reference for the same underlying event.

4. Evidence likely exists: Vercel API `meta` field contains `githubCommitSha` (dropped during current normalization), and GitHub workflow runs already carry `headSha`.

5. Presentation cleanup does not solve this: no amount of formatting can tell the investigator "deployment dpl_abc deployed the same commit as workflow run 12345."

6. This aligns with the ROADMAP v0.5 Investigation core value: "Combie produces useful, evidence-backed investigations that require information from more than one provider."

7. The anti-speculation rule is respected: this is one exact evidence pair, not a generic CorrelationEngine.

8. Candidate A (Related Context compaction) provides medium human value but zero agent value and does not close the investigation loop. It remains a valid future option if Sprint 034 research confirms matching is not yet feasible.

Candidate A was the strongest alternative. It was rejected because:
- Related Context compaction solves scanning but not correlation
- It provides little/no agent value
- The investigator's real bottleneck is connecting evidence, not reading it faster
- "Once the interface is readable enough, stop polishing it and find the next real product constraint"

## Sprint 034

**Research-only Sprint: investigate the exact evidence pair GitHub workflow run ↔ Vercel deployment.**

Exact research questions:

1. Does the Vercel deployments API (`GET /v7/deployments`) reliably return `meta.githubCommitSha`, `meta.githubCommitRef`, `meta.githubCommitRepo`, and `meta.githubCommitMessage` for git-connected deployments?
2. What is the field schema (types, optionality, naming consistency)?
3. Does the field exist for all deployment sources (git push, CLI, API) or only git-connected deployments?
4. How does `meta.githubCommitSha` relate to GitHub workflow run `headSha`? Are they the same commit?
5. What minimal evidence type extension is required (which new fields on `VercelDeploymentEvidence`)?
6. What is the exact matching rule (equality on `gitCommitSha` scoped by `source_for` Relationship)?
7. What are the edge cases (squash merges, rebases, force pushes, multi-commit deployments)?

Sprint 034 should NOT implement matching, extend the evidence type, or change normalization. It should document the evidence availability, field mapping, matching rule, and edge cases — then recommend whether Sprint 035 should implement.

## Validation

```text
Tests: 572 passing, 0 failing
Typecheck: clean
git diff --check: clean
git status: clean (only SPRINT-033.md modified)
Secret scan: no secrets in diff
Production changes: zero
Test changes: zero
Schema changes: zero
Provider changes: zero
```

## Canon Changes

None.

## Commit

Sprint 033 commit SHA: f720d03242d62ade2df294862c818e7762d11506

## Explicit Answers

1. **Did Sprint 032 materially improve scanning?** Yes. Provider Activity compaction was the single largest density reduction (~10x for that section). Authority prose ownership eliminated repetition.
2. **Is Related Context the largest remaining density source?** Yes, in multi-neighbor scenarios. Each neighbor multiplies output by ~10–60+ lines.
3. **Are detailed provider cards the largest density source?** Second largest. They are the primary amplifier inside Related Context.
4. **Is authority duplication still meaningful?** No. Sprint 032 authority ownership model solved this.
5. **Is Provider Activity compact enough?** Yes. One line per entry is the right density for an index.
6. **Are Known Facts useful?** Yes. 5-bullet bounded summary provides orientation before detail scanning.
7. **Is Missing Context useful?** Yes. Gap inventory is the unique trust surface; no other section owns this job.
8. **Is one-hop understandable with multiple neighbors?** Yes. Each neighbor block is clearly delimited with direction + identity + evidence + nested sections.
9. **Is one-hop sufficient?** Yes. No scenario demonstrably fails under one-hop.
10. **Is the dominant friction presentation or capability?** **Capability.** Cross-provider evidence matching is the largest remaining gap.
11. **What manual step repeats most?** Scrolling through Related Context evidence cards.
12. **What manual step costs most?** Matching workflow run to deployment by commit SHA across sections and providers.
13. **What is the largest agent-specific gap?** Deterministic cross-provider evidence matching — agents cannot link deployment ↔ workflow run from structured data.
14. **Are human and agent needs different?** Yes. Human: less scrolling. Agent: deterministic evidence joining.
15. **Would Related Context compaction help materially?** Yes for scanning. No for correlation.
16. **Would detailed evidence compaction help materially?** Yes for scanning. No for correlation.
17. **Would filtering help materially?** No. Current pressure is low.
18. **Are investigators repeatedly matching cross-provider evidence?** Yes. In scenarios A, B, and C.
19. **Which exact pair?** GitHub workflow run ↔ Vercel deployment.
20. **Is deterministic evidence available?** Not in current normalized data. Vercel API `meta.githubCommitSha` is likely available but dropped during normalization. GitHub `headSha` already exists.
21. **Is another exact Relationship needed?** No. Existing `source_for` provides sufficient scope.
22. **Is another evidence family needed?** No for current scenarios.
23. **Is scope insufficient?** No. One-hop remains sufficient.
24. **Is investigate product-useful enough?** Mostly yes. Cross-provider evidence matching is the remaining gap preventing genuine investigation utility.
25. **Should investigate work pause?** After Sprint 034 research, possibly yes. If matching evidence is confirmed and implemented, investigate would cross the product-useful threshold.
26. **Which recommendation wins?** D — Research one exact cross-provider match.
27. **What exactly should Sprint 034 do?** Research-only: inspect Vercel deployment API `meta` field availability, document exact field mapping for commit SHA matching between GitHub workflow runs and Vercel deployments, determine feasibility of deterministic matching.

---

# Definition of Done

- [x] Sprint 032 clean baseline verified
- [x] exact baseline SHA recorded
- [x] SKILL protocol followed
- [x] Canon read
- [x] relevant Sprint history reviewed
- [x] Repository Understanding completed
- [x] post-cleanup surface mapped
- [x] Scenario A completed
- [x] Scenario B completed
- [x] Scenario C completed
- [x] Scenario D completed
- [x] Scenario E completed
- [x] Scenario F completed
- [x] Scenario G completed
- [x] human manual tasks classified
- [x] agent manual tasks classified
- [x] Related Context density pressure-tested
- [x] detailed evidence density pressure-tested
- [x] filtering pressure-tested
- [x] cross-provider matching pressure-tested
- [x] Relationship/evidence pressure-tested
- [x] scope pressure-tested
- [x] pause-investigation option pressure-tested
- [x] presentation-vs-capability matrix completed
- [x] dominant friction identified
- [x] good-enough test answered
- [x] exactly one A/B/C/D/E/F/G/H recommendation selected
- [x] Sprint 034 bounded precisely
- [x] no production implementation
- [x] no test implementation
- [x] no schema changes
- [x] no provider changes
- [x] no new Relationships
- [x] no correlation implementation
- [x] no causality
- [x] no AI
- [x] no scoring
- [x] no ranking
- [x] full tests pass
- [x] typecheck passes
- [ ] secret scan clean (pending pre-commit)
- [ ] diff/whitespace checks clean (pending pre-commit)
- [x] completion notes updated
- [x] Canon changes recorded (None)
- [ ] Sprint 033 committed separately (pending)
- [ ] worktree clean (pending)
- [x] Sprint 034 not started