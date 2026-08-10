# SPRINT-029 — Investigation Capability Pressure

> **Status:** Complete
> **Depends on:** SPRINT-028
> **Type:** Research / product pressure
> **Primary goal:** Pressure-test Combie's current investigation experience against realistic engineering scenarios and determine the smallest missing capability that prevents a human or agent from deciding what to inspect next.
> **Production code:** None expected
> **Test code:** None expected
> **Authority infrastructure:** Complete enough; do not extend without concrete pressure
> **AI / correlation / causality:** Research only; no implementation

---

## Goal

Sprints 016–028 progressively built Combie's investigation knowledge surface:

```text
Resource state
+
Resource Changes
+
one-hop Relationships
+
neighbor state/history
+
deterministic investigation timeline
+
provider-native evidence
+
provider activity chronology
+
KNOWN FACTS
+
refresh authority provenance
```

The authority track is now sufficiently complete.

After Sprint 028, Combie can distinguish:

```text
current evidence authority

latest refresh attempt
→ when Combie last checked

last successful refresh
→ when Combie last knew

last successful result count
→ what the provider returned during that successful refresh

retained local evidence
→ what Combie still remembers
```

Sprint 029 must **not** continue polishing this infrastructure without evidence that doing so is necessary.

Instead, return to the product.

The core question is:

> **What is the smallest missing capability that prevents a human or agent from using `combie investigate` to decide what to inspect next?**

This is not yet:

```text
What caused the problem?
```

It is:

```text
Given everything Combie already knows,
where should the investigator look next?
```

Sprint 029 studies that gap.

It does not implement the answer.

---

# Core Principle

> **Do not ask what Combie could infer next. Ask what the investigator still has to do manually.**

The next capability must be earned by real investigation pressure.

Do not assume the answer is:

- correlation
- causality
- AI
- another provider
- another evidence family
- more authority infrastructure
- a recommendation engine
- a scoring system

Study the current investigation experience first.

---

# Baseline

Begin from the clean committed Sprint 028 baseline.

Expected Sprint 028 implementation commit:

```text
94ff5a3dcf79530f9348f51ea3c16e3b80b15f3c
feat(storage): persist last successful refresh observation time
```

Sprint 028 may have a later documentation-only commit.

The reported Sprint 028 documentation SHA is:

```text
5345d74
```

Verify the actual current HEAD.

Run:

```bash
git status
git log -3 --oneline
bun test
bun run typecheck
```

Expected baseline:

```text
555 tests passing
typecheck clean
worktree clean
```

Record the exact full current HEAD SHA and commit message.

If Sprint 028 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 028 and Sprint 029.

---

# Sprint Type

Sprint 029 is a:

```text
RESEARCH / PRODUCT-PRESSURE SPRINT
```

Expected production diff:

```text
zero
```

Expected test diff:

```text
zero
```

Expected primary artifact:

```text
docs/internal/sprints/SPRINT-029.md
```

The Sprint should conclude with a single evidence-backed recommendation for Sprint 030.

---

# Required Reading

Before research:

- `skills/build-combie/SKILL.md`
- Combie Canon
- SPRINT-016
- SPRINT-017
- SPRINT-018
- SPRINT-019
- SPRINT-020
- SPRINT-021
- SPRINT-022
- SPRINT-023
- SPRINT-024
- SPRINT-025
- SPRINT-026
- SPRINT-027
- SPRINT-028

Focus particularly on the evolution:

```text
context
→ investigate
→ timeline
→ evidence research
→ provider evidence
→ provider chronology
→ Facts
→ authority provenance
```

Do not re-litigate settled architectural decisions unless current product pressure exposes a concrete contradiction.

---

# Repository Understanding Report

Before scenario analysis, inspect the complete current `combie investigate` path.

At minimum inspect:

- InvestigationContext
- investigation composition
- CLI investigation formatter
- `KNOWN FACTS`
- Fact composition
- `KNOWN PROVIDER ACTIVITY`
- provider activity chronology
- `COMBIE OBSERVATIONS`
- Resource Change timeline
- `RELATED CONTEXT`
- Relationship evidence
- subject Resource state
- neighbor Resource state
- Vercel deployments
- GitHub workflow runs
- Neon operations
- refresh authority DTOs
- latest-attempt provenance
- last-success provenance
- result-count provenance
- retained evidence behavior
- relevant fixtures/tests

Document the current flow conceptually:

```text
Resource
   │
   ├── CURRENT
   │
   ├── KNOWN FACTS
   │
   ├── KNOWN PROVIDER ACTIVITY
   │
   ├── COMBIE OBSERVATIONS
   │
   ├── SUBJECT CHANGES
   │
   ├── PROVIDER EVIDENCE
   │
   └── RELATED CONTEXT
           │
           ├── Relationship + evidence
           ├── neighbor Resource
           ├── neighbor Changes
           └── neighbor provider evidence
```

Use actual repository behavior rather than assuming this exact formatting if implementation differs.

Explicitly answer:

1. What information does `combie investigate` currently provide?
2. Which information is subject-scoped?
3. Which information is neighbor-scoped?
4. Which provider evidence families can participate?
5. How does one-hop Relationship traversal work?
6. How is Relationship provenance retained?
7. How are provider-native timestamps represented?
8. How are Combie observation timestamps represented?
9. How is refresh authority represented?
10. How do Known Facts currently reduce manual scanning?
11. What does provider activity chronology reduce?
12. Which sections can become large/noisy?
13. What does the user still have to mentally combine?
14. What information does Combie deliberately refuse to infer?
15. Which current limitations are architectural?
16. Which are evidence limitations?
17. Which are product/UX limitations?
18. Which are intentional semantic boundaries?

No implementation before completing this report.

---

# Investigation Capability Pressure

The product question is:

> **Can the existing investigation context help an investigator determine where to look next without crossing into unsupported interpretation?**

Study the difference between:

```text
showing evidence
```

and:

```text
helping navigate evidence
```

Combie already does substantial evidence composition.

Sprint 029 should determine whether the remaining problem is primarily:

```text
too much evidence
missing evidence
missing context
poor scope
lack of prioritization
lack of Relationships
lack of correlation
poor presentation
```

Do not assume which one wins.

---

# Semantic Boundary

Use the following vocabulary consistently.

## FACT

A deterministic statement directly supported by persisted/composed evidence.

Example:

```text
The latest successful bounded GitHub workflow-run refresh returned 3 runs.
```

---

## NAVIGATION

Helping the investigator find or inspect already-known evidence.

Example:

```text
GitHub workflow evidence is currently unknown.
```

or potentially:

```text
Inspect the GitHub repository evidence.
```

if that instruction can be derived from explicit deterministic rules.

Navigation does not assert why events are related.

---

## FOCUS / PRIORITY

Selecting or ordering evidence/Resources according to explicit deterministic rules.

Example candidate:

```text
Show Resources with unknown evidence authority before Resources
whose evidence is currently known.
```

This may or may not be semantically appropriate.

Sprint 029 must pressure-test it.

---

## CORRELATION

Asserting that two independent pieces of evidence are meaningfully related.

Example:

```text
This workflow run is associated with this deployment.
```

unless provider evidence directly establishes that relationship.

Correlation is stronger than ordering.

---

## INTERPRETATION

Assigning significance beyond explicit facts.

Example:

```text
This workflow failure is probably important to the deployment issue.
```

---

## CAUSALITY

Claiming why something happened.

Example:

```text
The failed workflow caused the deployment failure.
```

Sprint 029 must preserve these boundaries.

---

# Scenario Study A — GitHub ↔ Vercel

Use an existing or fixture-backed canonical relationship:

```text
GitHub repository
    source_for
Vercel project
```

The investigation should contain realistic evidence such as:

```text
GitHub Resource state
GitHub workflow-run evidence
Vercel Resource state
Vercel deployment evidence
KNOWN FACTS
KNOWN PROVIDER ACTIVITY
COMBIE OBSERVATIONS
Relationship evidence
refresh authority
```

Do not invent unsupported evidence.

## Investigator question

Use a practical question such as:

> A deployment appears unhealthy or failed. Where should I inspect next?

Do **not** ask:

> What caused the deployment failure?

That would prematurely frame the problem causally.

## Study

Document:

1. What does current `investigate` immediately tell the user?
2. Which section would the user inspect first?
3. What does the user need to scan manually?
4. Does the user need to compare GitHub and Vercel sections mentally?
5. Does Known Provider Activity help?
6. Do Known Facts help?
7. Does authority provenance materially change the next action?
8. Is anything missing?
9. Is the missing item already known but poorly surfaced?
10. Would deterministic focus help?
11. Would missing-context reporting help?
12. Would correlation actually be required?
13. Would additional provider evidence be required?
14. Would another Relationship be required?

Record the manual investigation steps.

---

# Scenario Study B — Partial / Unknown Evidence

Construct or use a fixture where:

```text
subject Resource exists
+
one-hop neighbor exists
+
retained provider evidence exists
+
latest refresh authority is unknown
+
last successful refresh provenance exists
```

Example conceptual state:

```text
GitHub workflow authority:
  current = unknown
  latest attempt = T2
  last successful refresh = T1
  last successful count = 3
  retained rows = 7
```

## Investigator question

> What can I trust right now, and what should I inspect next?

## Study

Determine:

1. Is current authority obvious enough?
2. Does retained evidence create visual ambiguity?
3. Does the user understand that retained evidence may not be current?
4. Does last-success provenance solve the trust question?
5. Does the user still need explicit missing-context guidance?
6. Would `MISSING CONTEXT` add value?
7. Would prioritization add more value?
8. Is correlation relevant at all?
9. Does the investigation surface distinguish:
   - unknown
   - empty
   - unsupported
   - disconnected
   - unavailable
   clearly enough?

This scenario should heavily pressure-test missing-context reporting.

---

# Scenario Study C — Neon

Use a Neon project with operation evidence.

Do not invent:

```text
Vercel ↔ Neon
GitHub ↔ Neon
```

Relationships that do not exist.

## Investigator question

> Something changed around this Neon project. What does Combie know, and where would I inspect next?

Study:

1. Current Resource state
2. Neon operation evidence
3. provider chronology
4. Known Facts
5. Combie observations
6. refresh authority
7. absence of cross-provider Relationships

Explicitly evaluate whether:

```text
absence of a Relationship
```

is itself useful context.

Ask whether Combie should eventually say something like:

```text
No proven application relationship is known for this database project.
```

without implying one should exist.

Determine whether the main limitation is:

```text
missing Relationship
missing evidence
missing-context visibility
or no meaningful limitation
```

---

# Scenario Study D — Change-Heavy Investigation

Construct or use fixtures with multiple Resource Changes plus provider-native evidence.

Include:

```text
multiple Change rows
provider activity
Known Facts
Relationship context where appropriate
authority provenance
```

## Investigator question

> This Resource has changed several times and has provider activity around it. What should I inspect first?

Study:

1. Does `COMBIE OBSERVATIONS` remain understandable?
2. Does `KNOWN PROVIDER ACTIVITY` remain understandable?
3. Is keeping provider time and Combie observation time separate still useful?
4. How much manual chronological scanning remains?
5. Would filtering help?
6. Would focus help?
7. Would merging clocks be tempting but unsafe?
8. Does the user need correlation, or merely better navigation?

Do not merge the clocks.

---

# Scenario Study E — Quiet / Healthy Investigation

Include at least one low-activity scenario.

Example:

```text
Resource exists
no Changes
no recent provider evidence
known-empty evidence
healthy provider-native state where available
```

## Investigator question

> Is there anything here that deserves further inspection?

This prevents Sprint 029 from optimizing only for failure-heavy fixtures.

Study whether current investigate output:

- communicates meaningful zero states;
- produces unnecessary noise;
- makes "nothing notable is known" difficult to determine;
- would benefit from focus/filtering;
- would benefit from explicit missing-context reporting.

---

# Manual Scanning Analysis

For every scenario, record the exact human work remaining.

Examples:

```text
scroll through 20 workflow runs
compare timestamps manually
find which neighbor has unknown authority
notice a failed state buried in provider evidence
determine that no Relationship exists
distinguish retained evidence from current authority
compare multiple Resources manually
```

Classify each manual step as:

```text
A. unavoidable investigation work
B. presentation problem
C. deterministic navigation problem
D. missing context
E. missing evidence
F. missing Relationship
G. correlation problem
H. interpretive problem
```

Rank by:

```text
frequency
effort
product impact
semantic risk
```

The most frequent manual work is not automatically the next feature.

Prefer high value + low semantic risk.

---

# Human vs Agent Pressure

Evaluate humans and AI agents separately.

## Human

Ask:

- Is the CLI too verbose?
- Is important evidence buried?
- Are zero/unknown states obvious?
- Does the human know what to inspect next?
- Is manual cross-section scanning excessive?

## Agent

Ask:

- Is InvestigationContext structurally sufficient?
- Can an agent identify missing evidence deterministically?
- Can it distinguish current vs retained evidence?
- Can it identify available neighboring Resources?
- Does it lack structured focus?
- Does it lack explicit missing-context representation?
- Would the agent need to parse human-oriented CLI copy unnecessarily?

Do not assume human and agent needs are identical.

---

# Candidate A — Deterministic Investigation Focus

Research whether Combie could safely surface something conceptually like:

```text
FOCUS

1. GitHub repository
   workflow evidence authority unknown

2. Vercel project
   latest deployment state = ERROR
```

without claiming:

```text
importance
risk
causality
```

Pressure-test possible deterministic rules:

- current unknown authority
- provider-native failed/error state
- Resource has Changes
- newest known provider activity
- subject vs neighbor
- evidence missing
- evidence known-empty

Ask:

1. Are these rules universally meaningful?
2. Would ordering imply significance?
3. Would ordering become an arbitrary scoring system?
4. Can the ordering be explained exactly?
5. Would agents benefit?
6. Would humans benefit?
7. Could simple categorization be safer than ranking?

Do not implement.

---

# Candidate B — Explicit Missing Context

Research a deterministic surface such as:

```text
MISSING CONTEXT

GitHub workflow evidence is currently unknown.
No proven application↔database Relationship is known.
No operational evidence family is available for this Resource.
```

Pressure-test distinctions between:

```text
unknown
known-empty
unsupported
not connected
not related
not observed
```

These are not interchangeable.

Ask:

1. Can each statement be proven from current state?
2. Is absence itself meaningful?
3. Can Combie say something is missing without implying it should exist?
4. Would this reduce manual investigation work?
5. Is this especially useful for agents?
6. Would it duplicate Known Facts?
7. Should missing context be Facts or a separate concept?

Do not implement.

---

# Candidate C — Evidence Filtering / Narrowing

Research whether the main problem is simply too much detail.

Possible concepts:

```text
recent only
failed/error only
subject only
neighbor only
provider family
changes only
```

Do not design CLI flags yet.

Ask:

1. Which current sections actually become noisy?
2. Does filtering hide important context?
3. Is filtering a UX concern rather than a domain capability?
4. Can filtering remain deterministic and lossless?
5. Is this more valuable than better composition?

Do not implement.

---

# Candidate D — Stronger Investigation Scope

Current investigation is one-hop.

Pressure-test whether realistic scenarios require:

```text
A → B → C
```

Example:

```text
repository
→ Vercel project
→ Cloudflare zone
```

Do not implement traversal.

Ask:

1. Does one-hop prevent realistic investigation?
2. Would two-hop traversal introduce irrelevant context?
3. Is recursive traversal actually needed?
4. Could explicit bounded two-hop traversal ever be justified?
5. Would richer scope make current scanning worse?

Do not assume more context is better.

---

# Candidate E — Relationship / Evidence Improvement

Determine whether investigation is blocked because Combie simply does not know an important deterministic relationship or evidence family.

Examples might include:

```text
missing application↔database relationship
missing operational state
missing deployment evidence
missing provider-specific activity
```

But only count a gap if:

```text
official provider evidence can establish it deterministically
```

Do not revive application↔database inference unless new evidence exists beyond Sprint 015.

Do not add providers during this Sprint.

---

# Candidate F — Correlation Research

Correlation is now a legitimate candidate for research, but it is **not automatically earned**.

Ask:

> Are humans repeatedly performing the same deterministic cross-provider matching step that Combie could reproduce without interpretation?

Possible future evidence pairs might include:

```text
GitHub workflow run
↔
Vercel deployment
```

Potential evidence:

```text
commit SHA
repository identity
provider-native references
```

But Sprint 029 must only identify whether this manual work is actually the dominant remaining problem.

Do not research correlation mechanics deeply unless scenario pressure makes it the leading candidate.

Do not implement correlation.

---

# Candidate G — UX / Presentation Cleanup

It is valid for Sprint 029 to conclude:

```text
The knowledge model is sufficient.
The next meaningful improvement is presentation.
```

Pressure-test:

- section order
- duplication
- verbosity
- headings
- zero states
- evidence density
- CLI scanning cost

Do not treat UX cleanup as less valuable merely because it adds no domain primitive.

Combie is a product.

---

# Missing Context Matrix

Produce a matrix with at least:

| Missing/Unavailable Context | Can Combie Detect It? | Exact Evidence | Safe to Surface? | Human Value | Agent Value |
|---|---|---|---|---|---|
| Current provider authority unknown | | | | | |
| Evidence known-empty | | | | | |
| Evidence family unsupported | | | | | |
| Provider not connected | | | | | |
| No proven Relationship | | | | | |
| Retained history but current authority unknown | | | | | |
| No Resource Changes | | | | | |
| No provider-native activity | | | | | |

Add findings discovered during repository research.

---

# Investigation Friction Matrix

Produce a ranked matrix:

| Friction | Scenario(s) | Human Cost | Agent Cost | Deterministic Fix? | Semantic Risk | New Evidence Required? |
|---|---|---:|---:|---|---|---|

Rank actual observed friction rather than theoretical possibilities.

---

# Candidate Capability Matrix

Compare at least:

| Candidate | Scanning Reduction | Deterministic | Provenance | Human Value | Agent Value | Scope | Semantic Risk |
|---|---:|---|---|---:|---:|---|---|
| Investigation focus | | | | | | | |
| Missing-context reporting | | | | | | | |
| Evidence filtering | | | | | | | |
| Stronger scope | | | | | | | |
| Relationship/evidence improvement | | | | | | | |
| Correlation research | | | | | | | |
| UX/presentation cleanup | | | | | | | |

Use qualitative rankings.

Do not fabricate numerical precision.

---

# Output Study

Mock current and hypothetical output for the highest-ranked candidates.

For example:

```text
KNOWN FACTS
...

MISSING CONTEXT
...

KNOWN PROVIDER ACTIVITY
...

COMBIE OBSERVATIONS
...
```

or:

```text
FOCUS
...

WHY THIS IS SURFACED
...
```

These are research mocks only.

Do not modify production CLI output.

For each candidate output answer:

1. Does this materially reduce scanning?
2. Does it duplicate Known Facts?
3. Does it imply importance?
4. Does it imply correlation?
5. Does it imply causality?
6. Can every line carry exact provenance?
7. Would an agent benefit from the structured DTO independently of CLI formatting?

---

# "What Should I Inspect Next?" Test

This is the central product test.

For every scenario ask:

> Can Combie answer "what should I inspect next?" using deterministic evidence alone?

Possible outcomes:

### Outcome 1

```text
Yes, through explicit missing context.
```

Example:

```text
GitHub evidence is currently unknown.
```

The obvious next action may be to inspect GitHub.

### Outcome 2

```text
Yes, through deterministic focus categories.
```

Example:

```text
FAILED PROVIDER STATE
Vercel deployment ...
```

### Outcome 3

```text
No. Choosing the next Resource requires interpreting significance.
```

If so, do not disguise interpretation as deterministic ranking.

### Outcome 4

```text
The question itself is too strong.
```

Maybe Combie should instead answer:

```text
What evidence deserves attention?
```

or:

```text
What context is missing?
```

Pressure-test the product language.

---

# No Scoring

Do not design:

```text
relevanceScore
riskScore
importanceScore
confidenceScore
attentionScore
incidentScore
```

Do not use weighted heuristics.

If a focus capability requires arbitrary numeric scoring, treat that as evidence against it.

Prefer:

```text
explicit categories
deterministic predicates
provenance-backed facts
```

---

# No Causality

Sprint 029 must not produce claims such as:

```text
X caused Y
X likely caused Y
X explains Y
X is the root cause
```

Even in mock output.

---

# No AI

Do not select AI summaries merely because investigation output is verbose.

First determine whether deterministic structure can solve the scanning problem.

LLMs may eventually consume Combie's context.

That does not mean Combie's domain model should outsource missing semantics to an LLM.

---

# No More Authority Infrastructure by Default

Sprint 028 concluded that refresh authority now durably contains:

1. current authority
2. latest attempt time
3. last successful time
4. last successful result count
5. retained local evidence

Treat that track as complete.

Only recommend another authority primitive if a concrete scenario demonstrates that an investigator cannot make a necessary trust decision without it.

The bar is high.

---

# Architecture Decision

At completion, choose **exactly one** recommendation.

## A — Deterministic Investigation Focus

Choose only if explicit, non-scored rules materially reduce investigation work without implying unsupported significance.

Sprint 030 should then implement the smallest focus surface.

---

## B — Explicit Missing-Context Reporting

Choose if the largest remaining friction is understanding:

```text
what Combie does not currently know
```

Sprint 030 should implement the smallest deterministic missing-context projection.

---

## C — Evidence Filtering / Narrowing

Choose if the knowledge is sufficient but evidence volume creates the dominant investigation friction.

Sprint 030 should implement one bounded filtering capability.

---

## D — Stronger Scope / Relationship / Evidence

Choose if a concrete investigation is blocked by missing deterministic context.

Name exactly what is missing.

Do not choose generic "more context."

---

## E — Correlation Research

Choose only if scenario studies show investigators repeatedly perform the same cross-provider matching operation and deterministic evidence appears capable of reproducing it.

Sprint 030 should be research-only.

Do not jump directly to correlation implementation.

---

## F — UX / CLI Cleanup

Choose if the domain model is sufficient and presentation is the dominant friction.

Name the exact cleanup.

---

## G — Another Narrow Capability

Choose only if the research exposes a stronger candidate not represented above.

Name it precisely.

Do not use G as a vague escape hatch.

---

# Recommendation Criteria

The winning candidate should maximize:

```text
investigation value
+
manual scanning reduction
+
determinism
+
provenance
+
human usefulness
+
agent usefulness
```

while minimizing:

```text
semantic ambiguity
interpretation
architecture expansion
new persistence
new provider work
```

Prefer the smallest capability that changes the investigation experience materially.

---

# Sprint 030 Boundary

Sprint 029 must recommend exactly one bounded Sprint 030.

Good:

```text
Implement a pure ephemeral MissingContext projection over InvestigationContext.
```

Good:

```text
Research exact GitHub workflow-run ↔ Vercel deployment SHA evidence.
```

Good:

```text
Add deterministic focus categories for unknown authority and provider-native failed states.
```

Bad:

```text
Build smarter investigations.
```

Bad:

```text
Build correlation.
```

Bad:

```text
Add an investigation engine.
```

Bad:

```text
Add AI.
```

---

# Validation

Because Sprint 029 is research-only, production behavior must remain unchanged.

Run:

```bash
bun test
bun run typecheck
git diff --check
git status
```

Expected baseline:

```text
555 tests
```

Expected final tests:

```text
555 tests
```

unless unrelated baseline behavior requires otherwise.

Also perform:

- secret scan
- staged diff review
- full diff review

Verify:

```text
zero src/ changes
zero test changes
zero schema changes
zero provider changes
zero Canon changes unless research genuinely requires documentation correction
```

Use fixtures and existing offline data.

Provider credentials should not be required.

---

# Architecture Review

Before completion explicitly answer:

1. Is `combie investigate` useful end-to-end today?
2. What is the largest remaining source of manual scanning?
3. What is the largest human investigation friction?
4. What is the largest agent investigation friction?
5. Are those the same?
6. Is important evidence buried or actually missing?
7. Is missing-context reporting needed?
8. Is deterministic focus needed?
9. Can focus be implemented without scoring?
10. Would focus ordering imply unsupported significance?
11. Is evidence filtering enough?
12. Is one-hop scope blocking realistic investigations?
13. Is another deterministic Relationship required?
14. Is another provider evidence family required?
15. Are users repeatedly performing cross-provider matching manually?
16. Is correlation therefore earned as the next research topic?
17. Is AI required? Why or why not?
18. Is more authority infrastructure required?
19. Can Combie safely answer "what should I inspect next?"
20. Or should Combie instead answer the narrower "what deserves attention / what context is missing?"
21. What exactly should Sprint 030 do?

---

# Completion Notes

## Baseline

```text
5345d74345a73f747ded48dac4b15fabe733ea43
docs(sprint): record Sprint 028 commit SHA

Sprint 028 implementation:
94ff5a3dcf79530f9348f51ea3c16e3b80b15f3c
feat(storage): persist last successful refresh observation time

555 tests passing
typecheck clean
```

Only untracked file at start: `SPRINT-029.md`.

## Repository Understanding

### End-to-end investigate path

```text
combie investigate <resource-id>
  → local Store only (no provider calls)
  → InvestigationContext
  → formatInvestigationContext
```

**CLI section order (actual):**

1. `SUBJECT` / `CURRENT`
2. `KNOWN FACTS` (≤5 deterministic bullets; zero-state sentence if none)
3. `SUBJECT CHANGES`
4. Subject evidence (conditional): `DEPLOYMENTS` | `WORKFLOW RUNS` | `OPERATIONS`
5. `RELATED CONTEXT` (one-hop edges; nested neighbor CHANGES + evidence)
6. `KNOWN PROVIDER ACTIVITY (newest first; incomplete)` — provider created-time chronology
7. `COMBIE OBSERVATIONS (newest first)` — Resource Change observation-time chronology

### What investigate already provides

| Surface | Content |
|---------|---------|
| Identity | provider, kind, name, stable id |
| Facts | authority, state aggregates, activity counts, scope, newest activity, change counts |
| Changes | subject + neighbor field diffs |
| Provider evidence | Vercel deployments, GitHub workflow runs, Neon operations |
| Authority | unknown / empty / populated + last success time/count + retained rows |
| Relationships | one-hop only, with evidence provenance |
| Dual chronologies | provider-created vs Combie-observed (never mixed) |

### Deliberately not inferred

- multi-hop graph traversal
- relationship inference at investigate time
- correlation (SHA, time windows, workflow↔deployment)
- causality / root cause
- “inspect next” recommendations
- scores of any kind
- that retained history is complete or current
- absence under bare unknown without empty provenance

### Scope

**One hop only.** Subject + direct neighbors. Multi-edge neighbors appear once in chronology with all path provenance retained.

### Known Facts scanning reduction

Facts prioritize **unknown authority** first, then empty, then retained≠returned populated, then state/activity/newest/changes — hard cap **5**.

They orient trust and multi-row state but:

- more than five concurrent unknown sources truncates some authority gaps
- do not emit a complete inventory of knowledge gaps
- do not issue navigation directives
- compete for slots with activity/state facts after authority queue drains

### Where manual work remains

1. Re-rank subject vs neighbors vs evidence families across long sections
2. Mentally separate trust (authority) from chronology appearance
3. Dual-clock reading (provider vs Combie)
4. Interpret silence (“No relationships discovered”) without guided gap language
5. Cross-provider matching (runs ↔ deployments) without product support
6. Agents parse prose CLI; no structured “gaps” DTO beyond nested context

### Limitation classes

| Class | Examples |
|-------|----------|
| Intentional safety | no correlation, no causality, dual clocks separate |
| Product/UX | long dumps; 5-fact cap; no dedicated missing-context surface |
| Evidence | no app↔db Relationship (no deterministic provider proof) |
| Architectural | one-hop; offline read-only; provider-specific evidence types |

---

## Investigation Capability Pressure

Combie already **shows** substantial composed evidence.

The residual product problem is not “need more authority infrastructure” and not yet “need correlation.”

It is:

```text
navigating already-known evidence under incomplete knowledge,
without Combie listing knowledge gaps completely or
claiming what the investigator should prioritize.
```

Dominant remaining problem class:

```text
missing-context completeness
  → then navigation / attention categories
```

Not:

```text
more refresh provenance
AI
more providers
generic engines
```

---

## Scenario A — GitHub ↔ Vercel

**Setup (fixtures/tests):**  
`github:repository:*` —`source_for`→ `vercel:project:*`  
Workflow runs + deployments; optional Changes.

**Investigator question:**  
What is unhealthy / what should I open next between the project and its source repo?

**Combie provides:**  
Related edge provenance; both evidence families; mixed-family facts (counts, scope, newest); dual chronologies; authority when present.

**Manual steps still required:**

1. Open DEPLOYMENTS and neighbor WORKFLOW RUNS separately
2. Compare `readyState` vs `conclusion` without a join key
3. Decide whether newest failed run outranks subject deployment ERROR
4. Decide whether unknown authority (if any) outranks native failure state

**Missing capability:**  
Deterministic gap inventory + attention categories — **not** SHA correlation as the first step.

| Attribute | Value |
|-----------|--------|
| Deterministic vs interpretive | prioritization leans interpretive if scored |
| New evidence? | no for navigation |
| New Relationship? | no (`source_for` exists) |
| Correlation required? | no for “where next”; only for “which run maps to which deploy” |
| AI? | no |
| Product value | high |
| Implementation scope | small–medium (surface only) |

---

## Scenario B — Partial / Unknown Evidence

**Setup:**  
Unknown authority + retained rows; last success time/count provenance; optional multi-neighbor unknowns.

**Investigator question:**  
What can I trust, and what must I re-check?

**Combie provides:**  
Strong authority language in FACTS and detail blocks; retained vs last-success distinction; “no absence can be inferred” for bare unknown.

**Manual steps:**

1. Re-read long retained evidence under “may be stale”
2. If many unknown sources, scan RELATED because FACTS may truncate past five unknowns
3. Decide refresh vs continue with stale memory

**Missing capability:**  
**Complete missing-context list** uncapped by mixed Fact budget.

Correlation not relevant. Authority infrastructure sufficient.

---

## Scenario C — Neon

**Setup:**  
Neon project + operations; typically **no** Relationships.

**Investigator question:**  
Is this database isolated, incomplete, or healthy-and-quiet?

**Combie provides:**  
OPERATIONS + authority; RELATED “No relationships discovered.”

**Manual steps:**

1. Interpret zero relationships as isolation vs incomplete discovery
2. Map operations to application impact with no neighbors
3. Quiet success with no Changes → no guided next step

**Missing capability:**  
Explicit missing-context phrasing for absence of related application Resources — **without** inventing app↔db edges.

Do **not** invent Vercel↔Neon Relationships (Sprint 015 boundary stands).

---

## Scenario D — Change-Heavy

**Setup:**  
Multiple Resource Changes + provider activity; subject + neighbors.

**Investigator question:**  
Did Combie observe configuration drift related to provider activity?

**Combie provides:**  
Useful separation: SUBJECT CHANGES / RELATED CHANGES / COMBIE OBSERVATIONS vs KNOWN PROVIDER ACTIVITY.

**Manual steps:**

1. Dual-clock merge in human head
2. Notice neighbor Changes only under RELATED or OBSERVATIONS
3. Rank failed provider state vs recent metadata Change

**Missing capability:**  
Missing-context / attention categories beat “merge clocks” (merging would be semantic regression).

---

## Scenario E — Quiet / Healthy

**Setup:**  
Populated success, empty success with no retained drama, no Changes, zero or healthy relationships.

**Investigator question:**  
Is there anything to do?

**Combie provides:**  
Zero-state FACTS sentence or ordinary activity summaries; empty sections clear.

**Manual steps:**  
Low. Product is already adequate for quiet cases.

**Finding:**  
Improvements must not invent drama on healthy systems. Missing-context must use careful language (“not known to Combie” not “missing and required”).

---

## Human Investigation Friction

1. **Re-prioritizing** multi-resource multi-family output after reading FACTS  
2. **Trust vs chronology** re-check under unknown authority  
3. **Dual-clock** Change vs activity reading  
4. **Silence interpretation** (no relationships / N/A families)  
5. **Volume** of full evidence cards when many rows retained  

---

## Agent Investigation Friction

1. No dedicated structured **gap list** (must parse FACTS + omit sections + RELATED empty string)  
2. No stable “attention categories” DTO — only human prose  
3. 5-fact cap may hide lower-priority but still true gaps  
4. Same non-correlation boundary as humans (correct; agents must not invent joins)  

Humans and agents share the navigation gap; agents suffer more from **incomplete structured missing-context**.

---

## Missing Context Matrix

| Missing/Unavailable Context | Detectable? | Exact Evidence | Safe to Surface? | Human | Agent |
|----------------------------|-------------|----------------|------------------|-------|-------|
| Current provider authority unknown | Yes | refresh status ≠ success | Yes | High | High |
| Evidence known-empty | Yes | success + resultCount 0 | Yes | High | High |
| Evidence family unsupported for kind | Yes | `not_applicable` | Careful — silence is OK; avoid “missing deployments on a zone” | Low | Medium |
| Provider not connected | Yes (providers table) | provider record absent | Yes if phrased as “not connected in Combie” | Medium | High |
| No proven Relationship | Yes | `related.length === 0` | Yes if “none known to Combie” | High (Neon) | High |
| Retained history + current unknown | Yes | unknown + retained rows | Yes (already in FACTS) | High | High |
| No Resource Changes | Yes | empty changes | Yes but low value alone | Low | Low |
| No provider-native activity | Yes | empty chronology after successful empty | Yes | Medium | Medium |
| Never refreshed (no refresh row) | Yes | refresh null + applicable kind | Yes — stronger than generic unknown | High | High |
| Last-success time/count unknown (pre-028/027) | Yes | null provenance fields | Yes | Medium | Medium |
| No app↔database Relationship | Detectable as no edge; **not** as “should exist” | related empty for Neon | Surface absence of known edges only | Medium | Medium |

---

## Investigation Friction Matrix

| Friction | Scenario(s) | Human | Agent | Deterministic Fix? | Semantic Risk | New Evidence? |
|----------|-------------|-------|-------|--------------------|---------------|---------------|
| Incomplete gap inventory under 5-fact cap | B, A multi-neighbor | High | High | Yes — dedicated missing-context | Low | No |
| Re-rank subject vs neighbor signals | A, D | High | High | Partial — categories not scores | Medium if “inspect next” | No |
| Dual-clock scanning | D | Medium | Medium | No merge (intentional) | High if merged | No |
| Silent zero Relationships | C, E | Medium | High | Yes — explicit absence language | Low if careful | No |
| Cross-provider matching temptation | A | Medium | Medium | Only via future correlation research | High | Maybe SHA |
| Evidence volume | A, B, D | Medium | Low–Med | Filtering | Medium (hide rows) | No |

---

## Candidate Capability Matrix

| Candidate | Scan ↓ | Deterministic | Provenance | Human | Agent | Scope | Semantic Risk |
|-----------|--------|---------------|------------|-------|-------|-------|---------------|
| A Focus / priority | High | If categories only | Yes | High | High | Small | Medium–High (ordering implies weight) |
| **B Missing-context** | **High** | **Yes** | **Yes** | **High** | **Very High** | **Small** | **Low** |
| C Filtering | Medium | Yes | Yes | Medium | Medium | Small | Medium (hide evidence) |
| D Scope/Relationship/evidence | Low now | — | — | Low | Low | Large | High if inventing edges |
| E Correlation research | Medium later | Research | — | Medium | Medium | Research | High if rushed |
| F UX cleanup | Medium | Yes | N/A | Medium | Low | Small | Low |
| G (other) | — | — | — | — | — | — | — |

---

## Focus Pressure

Safe **if** expressed as **explicit categories** (unknown authority; never refreshed; provider-native failed/error states) **without ranks or scores**.

Unsafe if:

- numeric weights
- “most important”
- single ordered “inspect first” without provenance

Focus is valuable **after** gaps are completely listed. Alone, focus becomes a recommendation engine.

---

## Missing-Context Pressure

**Highest value / lowest risk.**

- Fully deterministic from `InvestigationContext` (+ optional local provider connection records)
- Complements FACTS: FACTS summarize; missing-context can be **complete** for gap types without competing with activity facts for the same 5 slots
- Directly answers the narrower product question Combie can truthfully own:

```text
What context is missing or untrusted right now?
```

Agents gain a structured checklist; humans stop reverse-engineering silence.

---

## Filtering Pressure

Volume is real but secondary. Filtering without first surfacing gaps risks hiding stale retained rows that FACTS correctly treat as important. Not the Sprint 030 winner.

---

## Scope Pressure

One-hop is **sufficient** for studied scenarios. GitHub↔Vercel is exactly one hop. Neon isolation is not fixed by two-hop. Recursive traversal would increase noise.

---

## Relationship / Evidence Pressure

No new Relationship is earned. Official provider evidence still does not establish application↔database edges. No new evidence family is required for the dominant navigation friction.

---

## Correlation Pressure

Investigators **are tempted** to match GitHub runs to Vercel deployments, but:

- that is not the **dominant** remaining friction vs gap/navigation
- fixtures forbid product language of correspondence
- correlation is **not** earned as Sprint 030

May become a later research Sprint if missing-context + attention categories still leave matching as the top manual step.

---

## Output Study (research mocks only)

### Current (abridged Scenario A+B)

```text
KNOWN FACTS
- GitHub workflow-run evidence for github:repository:101 is currently unknown; …
- Combie currently holds 2 provider activity records in scope: …
- Known provider activity appears on the subject and 1 directly related Resource through source_for.

SUBJECT CHANGES
…

DEPLOYMENTS
…

RELATED CONTEXT
← source_for
…

KNOWN PROVIDER ACTIVITY
…

COMBIE OBSERVATIONS
…
```

### Hypothetical MISSING CONTEXT (recommended direction)

```text
MISSING CONTEXT

- GitHub workflow-run evidence for github:repository:101: current refresh authority unknown
  (last successful refresh at T returned 3; 7 rows retained locally).
- Vercel deployment evidence for vercel:project:prj_app: never successfully refreshed in Combie.
- No one-hop Relationships are known for neon:project:db.

(No ranking. No “inspect next.” No scores.)
```

### Hypothetical FOCUS (not selected for 030)

```text
ATTENTION CATEGORIES

Unknown authority:
- github:repository:101 workflow runs

Provider-native failed state (populated only):
- vercel:project:prj_app deployment dpl_x readyState=ERROR
```

Safer as categories than as ordered priority. Deferred until missing-context exists.

**Mock evaluation (MISSING CONTEXT):**

1. Reduces scanning? Yes — complete gap list up front  
2. Duplicates FACTS? Partial overlap; different job (complete inventory vs mixed 5-slot summary)  
3. Implies importance? No if unordered  
4. Correlation? No  
5. Causality? No  
6. Provenance? Yes — resource id + family + authority fields  
7. Agent DTO value? High  

---

## "What Should I Inspect Next?" Test

| Outcome | Verdict |
|---------|---------|
| Answer “inspect X next” universally? | **No** — often interpretive |
| Answer via missing context? | **Yes** — “authority unknown / never refreshed / no known relationships” |
| Answer via failed native state categories? | **Sometimes** — only with explicit non-scored categories |
| Dominant truthful product question | **What context is missing or untrusted?** |

Outcome:

```text
The question "what should I inspect next?" is often too strong.
Combie should first answer: what context is missing or untrusted?
That enables the investigator (human or agent) to choose the next action.
```

---

## Final Recommendation

```text
B — Explicit Missing-Context Reporting
```

**Reasoning:**

1. Scenario B shows trust language works but is **incomplete** under the mixed 5-fact budget  
2. Scenario C shows silent absence of Relationships is a real navigation hole  
3. Scenario A’s residual “what next?” is largely **trust + coverage**, not correlation  
4. Lowest semantic risk among high-value candidates  
5. No new persistence, providers, Relationships, or engines  
6. Unblocks safer future attention categories without building a recommendation engine now  

---

## Sprint 030

**Bounded slice:**

```text
Implement a pure ephemeral MissingContext projection over InvestigationContext
(and only already-local Store facts required for “provider connected?” if proven safe).

Surface it from combie investigate as a dedicated section (or equivalent structured
block) that completely enumerates deterministic knowledge gaps for the subject and
one-hop neighbors:

- applicable evidence family with unknown current authority
- applicable evidence family with no successful refresh provenance (never known)
- known-empty latest success (optional if not already redundant with FACTS)
- zero known one-hop Relationships for the subject
- optional: provider not connected in Combie (local providers table only)

Rules:
- no ranking, scores, or “inspect next” imperatives
- no correlation / causality
- no new Relationships or evidence families
- no refresh-authority schema work
- language: "not known to Combie" / "current authority unknown" — never "must exist"
- TDD; offline fixtures; no live credentials required
```

**Non-goals for 030:** focus ranking, filtering flags, two-hop scope, correlation research implementation, AI.

---

## Validation

```text
bun test          — 555 pass (unchanged)
bun run typecheck — clean
git diff --check  — clean (docs only)
production/test code diff — zero
```

Secret scan: N/A (docs-only). Live verification: not required (research).

## Canon Changes

```text
None
```

## Deviations

1. User prompt listed scenarios A–D; Sprint template also required Scenario E (quiet/healthy) — completed.  
2. Recommendation is B rather than A: focus is valuable but higher semantic risk until missing-context is complete.

## Learnings

1. Authority track is complete enough; product pressure moved to **navigation under incomplete knowledge**.  
2. KNOWN FACTS are a **summary budget**, not a **complete gap inventory**.  
3. “What should I inspect next?” is often the wrong product question; **“what is missing or untrusted?”** is safer and still actionable.  
4. Correlation is tempting on GitHub↔Vercel but is not the dominant remaining friction.

## Commit

```text
d6d8181ae7469037a6700cc8e0e7453063587054
docs(sprint): complete Sprint 029 investigation capability pressure research
```

---

# Explicit Questions

1. **Yes** — useful offline end-to-end for inventory, authority, one-hop context, dual chronologies, and capped facts.  
2. Re-prioritize multi-section output; re-check trust vs stale chronology; dual-clock reading; interpret silence.  
3. Derive a complete gap list and next-action policy from prose; no structured MissingContext DTO.  
4. RELATED CONTEXT + full evidence cards + dual chronologies (not FACTS alone).  
5. Mostly **buried / incomplete surface**, not missing raw evidence for GitHub↔Vercel.  
6. **Complete deterministic missing-context reporting.**  
7. **Yes.**  
8. **Yes** from InvestigationContext (+ local connection state carefully).  
9. Partial overlap with authority Facts; different job (complete inventory vs 5-slot summary).  
10. Useful later as **categories**, not scores.  
11. Yes via categories; not via weighted ranks.  
12. Ordered focus **can** imply significance — risk.  
13. Filtering helps volume; does not replace gap reporting.  
14. **Yes** for studied scenarios.  
15. **No** (no invented app↔db).  
16. **No** for the dominant gap.  
17. **Not yet** as next Sprint.  
18. Optional future: matching deploy `meta`/commit to workflow `head_sha` — not dominant now.  
19. **No.**  
20. **No.**  
21. **No.**  
22. **Not universally / not safely as an imperative.**  
23. **What context is missing or untrusted?**  
24. **B.**  
25. Ephemeral MissingContext projection + CLI section; no ranking/scoring/correlation.

---

# Definition of Done

- [x] Sprint 028 clean baseline verified
- [x] exact baseline SHA recorded
- [x] SKILL protocol followed
- [x] Canon read
- [x] relevant Sprint history reviewed
- [x] Repository Understanding completed
- [x] current investigate surface mapped
- [x] semantic boundary documented
- [x] Scenario A completed
- [x] Scenario B completed
- [x] Scenario C completed
- [x] Scenario D completed
- [x] Scenario E completed
- [x] human friction analyzed
- [x] agent friction analyzed
- [x] manual scanning steps classified
- [x] Missing Context Matrix completed
- [x] Investigation Friction Matrix completed
- [x] Candidate Capability Matrix completed
- [x] deterministic focus pressure-tested
- [x] missing-context reporting pressure-tested
- [x] evidence filtering pressure-tested
- [x] stronger scope pressure-tested
- [x] Relationship/evidence pressure-tested
- [x] correlation pressure-tested
- [x] UX/presentation pressure-tested
- [x] output study completed
- [x] "what should I inspect next?" test answered
- [x] exactly one A/B/C/D/E/F/G recommendation selected
- [x] Sprint 030 bounded precisely
- [x] no production implementation
- [x] no test implementation
- [x] no schema changes
- [x] no provider changes
- [x] no new authority infrastructure
- [x] no generic Event
- [x] no ObservationEngine
- [x] no CorrelationEngine
- [x] no scoring
- [x] no causality
- [x] no AI
- [x] full tests pass
- [x] typecheck passes
- [x] secret scan clean
- [x] diff/whitespace checks clean
- [x] completion notes updated
- [x] Canon changes recorded as None
- [x] Sprint 029 committed separately
- [x] worktree clean
- [x] Sprint 030 not started
- [ ] completion notes updated
- [ ] Canon changes recorded or None
- [ ] Sprint 029 committed separately
- [ ] worktree clean
- [ ] Sprint 030 not started

---

# Explicitly Out of Scope

Do not implement:

- investigation focus
- recommendations
- missing-context production surface
- evidence filters
- multi-hop traversal
- recursive traversal
- new Relationships
- new provider evidence
- new providers
- correlation
- SHA matching
- time-window matching
- workflow↔deployment grouping
- causality
- root-cause analysis
- incident model
- anomaly detection
- relevance scoring
- risk scoring
- importance scoring
- confidence scoring
- severity
- generic Event
- generic Evidence
- ObservationEngine
- CorrelationEngine
- RefreshEngine
- refresh history
- additional refresh authority
- AI/LLM summaries
- embeddings
- logs
- metrics
- traces
- webhooks
- MCP/API/SDK/UI
- controlled execution
- Sprint 030 scaffolding

---

# Final Principle

> **Do not ask what Combie could infer next. Ask what the investigator still has to do manually.**

And then:

> **Build the smallest deterministic capability that removes the most important part of that work.**