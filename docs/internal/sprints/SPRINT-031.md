# SPRINT-031 — Deterministic Attention Semantics

> **Status:** Complete
> **Depends on:** SPRINT-030
> **Type:** Research / semantic pressure
> **Primary goal:** Determine whether Combie can classify already-known investigation evidence into a small set of deterministic attention categories that reduce scanning without implying priority, importance, risk, correlation, causality, or recommended action.
> **Production code:** None expected
> **Test code:** None expected
> **Ranking / scoring:** None
> **Correlation / causality / AI:** None

---

## Goal

Sprint 030 completed the first explicit Missing Context surface.

Combie can now clearly separate:

```text
KNOWN FACTS
= what Combie knows

MISSING CONTEXT
= where Combie's knowledge stops

KNOWN PROVIDER ACTIVITY
= provider-native evidence ordered by provider time

COMBIE OBSERVATIONS
= Resource differences observed by Combie
```

Sprint 030 also identified the next remaining friction:

> **After gaps are visible and authority is trustworthy, investigators still have to visually choose among multiple valid signals.**

Examples include:

```text
failed provider-native states
unknown current authority
recorded Resource Changes
newest provider activity
```

The next question is NOT:

```text
Which item is most important?
What should the user inspect first?
What caused the issue?
```

The research question for Sprint 031 is:

> **Can Combie classify existing evidence into a few deterministic attention categories that reduce scanning without implying importance or prescribing an action?**

Sprint 031 does not implement those categories.

It determines whether they are semantically earned.

---

# Core Principle

> **Classification may describe evidence. It must not quietly become prioritization.**

A category such as:

```text
PROVIDER-NATIVE FAILURE STATE
```

may be safe because the provider itself exposes that state.

A label such as:

```text
HIGH PRIORITY
```

would not be safe because Combie has no authority for that significance.

---

# Baseline

Begin from the clean committed Sprint 030 baseline.

Expected Sprint 030 implementation commit:

```text
c6255b253a5608f9bd36d0791ca12449df63fbd7
feat(investigate): add deterministic missing context inventory
```

Sprint 030 also has a later documentation SHA record:

```text
6655f43
```

Verify the actual repository HEAD.

Run:

```bash
git status
git log -3 --oneline
bun test
bun run typecheck
```

Expected baseline:

```text
569 tests passing
typecheck clean
worktree clean
```

Record the exact current full HEAD SHA and commit message.

If Sprint 030 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 030 and Sprint 031.

---

# Sprint Type

Sprint 031 is:

```text
RESEARCH / SEMANTIC PRESSURE
```

Expected:

```text
zero production code changes
zero test changes
zero schema changes
zero provider changes
```

Primary artifact:

```text
docs/internal/sprints/SPRINT-031.md
```

The Sprint should end with one explicit recommendation for Sprint 032.

---

# Required Reading

Before research, read:

- `skills/build-combie/SKILL.md`
- Combie Canon
- SPRINT-024
- SPRINT-025
- SPRINT-026
- SPRINT-027
- SPRINT-028
- SPRINT-029
- SPRINT-030
- SPRINT-031

Focus on the progression:

```text
provider evidence
→ chronology
→ Known Facts
→ authority provenance
→ Missing Context
→ attention/navigation pressure
```

Do not reopen earlier architectural decisions unless current evidence creates a concrete contradiction.

---

# Repository Understanding Report

Inspect the complete current `combie investigate` experience.

At minimum inspect:

- `InvestigationContext`
- `composeInvestigationFacts()`
- `composeMissingContext()`
- `composeProviderActivityChronology()`
- `COMBIE OBSERVATIONS`
- provider-specific evidence sections
- Resource state
- Resource Changes
- Relationships
- subject/neighbor scope
- provider-native states
- provider authority states
- CLI formatter
- relevant fixtures/tests

Explicitly answer:

1. What signals are currently present in an investigation?
2. Which signals are provider-native?
3. Which signals are Combie-derived?
4. Which signals already have exact semantic categories?
5. Which signals currently require the most scanning?
6. Which signals already imply a state such as failure/error?
7. Which signals only expose recency?
8. Which signals represent trust/authority gaps?
9. Which signals are already summarized by Known Facts?
10. Which signals are already enumerated by Missing Context?
11. Where would an additional attention category reduce duplication rather than add another surface?
12. Can attention categories be derived entirely from current `InvestigationContext`?
13. Can they remain ephemeral?
14. Can they remain pure?
15. Is any persistence/schema work required? Expected: no.

No implementation before this report.

---

# Semantic Vocabulary

Use this vocabulary consistently.

## FACT

A deterministic summary over known evidence.

Example:

```text
1 workflow run has recorded conclusion: failure.
```

---

## MISSING CONTEXT

A deterministic statement about what Combie cannot currently establish or trust.

Example:

```text
GitHub workflow-run authority is currently unknown.
```

---

## ATTENTION CATEGORY

A descriptive classification over already-known evidence.

Example candidate:

```text
PROVIDER-NATIVE FAILURE STATE
```

This should mean only:

```text
the provider-native evidence currently contains a failure/error state
```

It must not mean:

```text
this is important
this caused the issue
inspect this first
```

---

## PRIORITY

An ordering based on significance or recommended action.

Example:

```text
HIGH PRIORITY
```

Out of scope.

---

## CORRELATION

An assertion that independent records are meaningfully related.

Out of scope.

---

## CAUSALITY

An assertion about why something happened.

Out of scope.

---

# Central Research Question

Pressure-test this distinction:

```text
classification
≠
ranking
≠
recommendation
```

A category may help the user notice evidence.

It must not silently answer:

```text
what matters most
```

unless that meaning is explicitly justified.

---

# Candidate Attention Category A — Provider-Native Failure State

This is the strongest candidate.

Examples:

```text
GitHub workflow run
status: completed
conclusion: failure
```

```text
Vercel deployment
readyState: ERROR
```

```text
Neon operation
status: failed
```

Potential category:

```text
PROVIDER-NATIVE FAILURE STATE
```

Research questions:

1. Are these states exact provider-native semantics?
2. Can the category preserve provider vocabulary?
3. Does the category require a generic success/failure enum?
4. Can the category avoid normalizing providers incorrectly?
5. Does it reduce scanning?
6. Does it duplicate Known Facts?
7. Should only current/newest evidence be included?
8. Should all retained failure states be included?
9. Does unknown authority change the wording?
10. Is a retained historical failure still eligible?
11. Would the label imply importance or merely classification?

Do not implement.

---

# Candidate Attention Category B — Unknown Current Authority

This is already represented by:

```text
MISSING CONTEXT
```

Research whether it also belongs in an attention surface.

Possible category:

```text
UNTRUSTED CURRENT EVIDENCE
```

or:

```text
UNKNOWN CURRENT AUTHORITY
```

Pressure-test duplication.

Questions:

1. Does attention add value beyond Missing Context?
2. Would duplicating authority gaps create noise?
3. Should Missing Context remain the single owner of trust gaps?
4. Is attention meant only for evidence that exists?
5. Would authority belong in the same conceptual surface as provider failure states?

Default assumption:

```text
Missing Context may already own this completely.
```

Do not force duplication.

---

# Candidate Attention Category C — Recorded Resource Change

Possible category:

```text
RECORDED RESOURCE CHANGE
```

This would classify Resource Changes already shown under:

```text
COMBIE OBSERVATIONS
```

Research:

1. Does the existence of any Change deserve attention?
2. Would this just duplicate the Change section?
3. Are all Changes equally meaningful?
4. Does classifying a Change imply significance?
5. Would grouping only certain changed fields be interpretation?
6. Could a count-based summary already solve the scanning issue better?
7. Are Changes lower-value than provider-native failure states for attention?

Be skeptical.

A Resource Change is a fact.

It is not automatically noteworthy.

---

# Candidate Attention Category D — Newest Provider Activity

Possible category:

```text
NEWEST KNOWN PROVIDER ACTIVITY
```

Known Facts already support this concept.

Research whether it belongs in Attention.

Questions:

1. Is recency alone attention-worthy?
2. Does newest imply importance?
3. Does the chronology already solve this?
4. Would this duplicate Known Facts?
5. Does stale/unknown authority complicate the category?
6. Could recency bias the investigator incorrectly?

Default assumption:

```text
likely too weak / redundant
```

Do not assume it belongs.

---

# Candidate Attention Category E — Known Empty

Possible category:

```text
KNOWN EMPTY
```

Research whether known-empty evidence deserves attention.

Example:

```text
latest successful Vercel deployment refresh returned 0
```

Questions:

1. Is empty evidence itself noteworthy?
2. Is it already communicated clearly elsewhere?
3. Would highlighting it imply something is wrong?
4. Is this better represented as a Fact or zero state?
5. Would it help in quiet/healthy investigations?

Default assumption:

```text
probably not an attention category
```

---

# Candidate Attention Category F — No Known Relationships

This already lives in Missing Context.

Research whether graph isolation belongs in Attention.

Questions:

1. Does this duplicate Missing Context?
2. Would "attention" imply isolation is abnormal?
3. Is graph absence just a context limitation?
4. Should Missing Context remain the sole owner?

Likely:

```text
Missing Context only
```

unless scenario evidence strongly disagrees.

---

# Candidate Attention Category G — Provider-Native Non-Success State

Pressure-test whether failure-only is too narrow.

Examples:

```text
GitHub status: queued
GitHub status: in_progress
Vercel state: BUILDING
Neon status: running
```

Possible classification:

```text
ACTIVE PROVIDER STATE
```

Research whether these deserve attention.

Questions:

1. Are active/running states meaningful to investigation?
2. Would this create excessive noise?
3. Is "non-success" too generic?
4. Would provider-native vocabulary be lost?
5. Are running states simply normal lifecycle state?
6. Should attention be reserved for explicit failures/errors only?

Default conservative.

---

# Candidate Attention Category H — Unsupported / Missing Evidence

Already represented by Missing Context where applicable.

Do not create:

```text
MISSING EVIDENCE ATTENTION
```

unless the research shows Missing Context is insufficient.

Avoid multiple surfaces representing the same semantic gap.

---

# Provider-Specific Failure Semantics

Do not normalize prematurely.

## GitHub

Potentially relevant fields:

```text
status
conclusion
```

Sprint history established:

```text
status != conclusion
```

Possible failure semantics may include provider-native conclusions such as:

```text
failure
cancelled
timed_out
action_required
stale
startup_failure
```

Do not assume all non-success conclusions are equivalent.

Research which exact values should qualify.

Do not invent:

```text
FAILED
```

as a generic normalized state unless a future implementation can preserve the original provider semantics.

---

## Vercel

Inspect current deployment evidence.

Research exact provider-native state vocabulary currently persisted.

Potentially relevant values may include:

```text
ERROR
CANCELED
READY
BUILDING
QUEUED
```

Use only actual persisted/current provider semantics.

Do not generalize based on memory.

---

## Neon

Inspect current operation status values actually modeled.

Determine which provider-native states clearly represent failure.

Do not assume any status not present in repository/provider evidence.

---

# Failure Category Boundary

The Sprint must answer:

> Is a provider-native explicit failure/error state a sufficiently objective attention category?

Potential safe formulation:

```text
ATTENTION

PROVIDER-NATIVE FAILURE STATES

GitHub workflow run ...
  conclusion: failure

Vercel deployment ...
  readyState: ERROR
```

This says:

```text
these records contain provider-native failure semantics
```

It does not say:

```text
these caused the incident
these are more important than everything else
inspect these first
```

Pressure-test whether users will nevertheless perceive ordering as priority.

---

# Category vs Item

Research whether future Sprint 032 should model:

```text
AttentionCategory
```

with evidence underneath,

or:

```text
AttentionItem
```

per evidence record.

Example A:

```text
category:
provider_native_failure

items:
- workflow run 123
- deployment abc
```

Example B:

```text
AttentionItem {
  kind: "provider_native_failure"
  ...
}
```

Questions:

1. Which representation preserves provenance better?
2. Which avoids duplicate category labels?
3. Which is better for agents?
4. Which is simpler?
5. Does either encourage future scoring?
6. Is a typed DTO even necessary?

Do not implement.

---

# Attention Provenance

Any candidate attention item must remain auditable.

Possible provenance:

- Resource ID
- subject/neighbor role
- provider
- evidence family
- native evidence ID
- provider-native state field
- exact state value
- primary provider timestamp
- current authority
- Relationship path for neighbor evidence

No rendered statement should exist without structured provenance.

---

# Subject vs Neighbor

Pressure-test whether attention should distinguish:

```text
subject
neighbor
```

Example:

```text
subject Vercel deployment = ERROR
neighbor GitHub workflow conclusion = failure
```

Both may qualify for the same descriptive category.

Do not rank subject above neighbor unless the category design explicitly defines that as organizational grouping rather than importance.

Possible grouping:

```text
SUBJECT
RELATED RESOURCES
```

may be safer than ranking.

---

# Current vs Retained Evidence

This is critical.

If current authority is unknown and a retained historical workflow run has:

```text
conclusion: failure
```

should it appear in Attention?

Possible wording:

```text
RETAINED PROVIDER-NATIVE FAILURE STATE
```

or perhaps no Attention entry at all because Missing Context already says current authority is unknown.

Research:

1. Does retained failure still help navigation?
2. Does surfacing it risk implying current relevance?
3. Can authority qualifier make it safe?
4. Would this create too much noise?
5. Should attention categories include only currently authoritative evidence?

This may become a central Sprint 031 decision.

---

# Current Evidence Definition

Research whether Sprint 032 would need a clear notion of:

```text
current authoritative provider evidence
```

Potentially:

```text
latest refresh authority is populated
+
evidence row included in latest successful result
```

But inspect actual Sprint 027/028 storage semantics carefully.

Result-count provenance does not necessarily identify exactly WHICH retained rows belonged to the latest successful response.

Do not assume current row membership can be proven if only count is persisted.

This is important.

If exact latest-response row membership is unavailable, do not create an attention semantic that falsely claims a retained failure is current.

Document this pressure explicitly.

---

# Attention and Result-Count Provenance

Sprint 027 added:

```text
last successful result count
```

but not necessarily:

```text
last successful result IDs
```

Therefore Combie may know:

```text
latest successful refresh returned 3 runs
```

while retaining:

```text
7 runs locally
```

without knowing exactly which 3 were in the latest response.

This limits claims such as:

```text
the current failed run is one of the latest 3
```

unless the row model or ordering contract proves it independently.

Sprint 031 must evaluate this carefully.

Do not recommend attention semantics that require unavailable membership provenance.

---

# Scenario Study A — Explicit Provider Failure

Use a fixture with:

```text
Vercel deployment readyState = ERROR
```

or equivalent actual provider-native failure.

Ask:

1. Does the current investigate output make this easy to notice?
2. Does Known Facts already surface it?
3. Does a dedicated category reduce scanning?
4. Does it add duplicate noise?
5. Does the category remain purely descriptive?

---

# Scenario Study B — GitHub Failure + Vercel Healthy

Use:

```text
GitHub workflow conclusion = failure
Vercel deployment state = READY
```

with canonical `source_for`.

Ask:

1. Would both appear in Attention?
2. Should only failure appear?
3. Does showing only failure imply it is the cause?
4. Does category wording avoid that implication?
5. Is the benefit substantial enough?

---

# Scenario Study C — Multiple Failures

Use:

```text
multiple workflow failures
multiple deployment errors
```

Ask:

1. Does attention significantly reduce scanning?
2. Would complete enumeration become noisy?
3. Would grouping by category help?
4. Is a cap necessary?
5. Would a cap become prioritization?
6. Could deterministic grouping solve volume without ranking?

---

# Scenario Study D — Retained Failure + Unknown Authority

Use:

```text
retained workflow failure
current authority unknown
last successful provenance available
```

Ask:

1. Should the retained failure appear in attention?
2. If yes, how must it be qualified?
3. Would Missing Context + provider evidence already suffice?
4. Is attention misleading under unknown authority?

---

# Scenario Study E — Quiet / Healthy

Use:

```text
successful/ready provider states
known-empty evidence
no Changes
no Missing Context
```

Ask:

1. Does Attention correctly render zero?
2. Does the product feel calmer?
3. Would category machinery invent unnecessary noise?
4. Is an explicit zero state useful or should the section be omitted entirely?

---

# Scenario Study F — Changes Without Provider Failure

Use:

```text
Resource Changes
no provider-native failure state
```

Ask:

1. Should Changes generate attention?
2. Does doing so imply significance?
3. Is Known Facts enough?
4. Would a no-attention state be more honest?

This scenario should strongly pressure-test the `recorded_change` candidate.

---

# Scanning Reduction Matrix

Produce a matrix:

| Candidate Category | Current Manual Scan | Reduction | Duplicate Surface? | Semantic Risk | Verdict |
|---|---|---:|---|---|---|
| Provider-native failure | | | | | |
| Unknown authority | | | | | |
| Recorded Change | | | | | |
| Newest activity | | | | | |
| Known empty | | | | | |
| No Relationships | | | | | |
| Active/running state | | | | | |

Use qualitative judgments.

---

# Semantic Safety Matrix

For every candidate classify:

```text
A — direct provider/Combie semantic category
B — deterministic but potentially importance-signaling
C — interpretive
D — recommendation/causal
```

Only A is an obvious implementation candidate.

B requires strong product justification and careful naming.

Reject C and D.

---

# Duplicate-Surface Test

Combie now has multiple useful surfaces:

```text
KNOWN FACTS
MISSING CONTEXT
KNOWN PROVIDER ACTIVITY
COMBIE OBSERVATIONS
detailed provider evidence
```

Sprint 031 must determine whether Attention adds a genuinely new job.

For each candidate ask:

```text
Could Known Facts already do this?
Could Missing Context already do this?
Could chronology already do this?
Could simple CLI section cleanup solve it?
```

If yes, reject the new category.

Do not add another surface merely because it is possible.

---

# CLI Density Alternative

Sprint 030 also recommended:

```text
CLI density cleanup
```

as a possible next step.

Sprint 031 must compare deterministic attention against presentation cleanup.

Pressure-test:

- redundant detailed sections;
- repeated authority wording;
- Known Facts duplication;
- chronology duplication;
- section ordering;
- long investigation output;
- zero-state noise.

Ask:

> Would better CLI density solve more scanning friction than a new Attention projection?

This comparison is required.

---

# Human vs Agent Value

Evaluate both.

## Human

Attention may help:

- notice explicit provider failure states;
- scan long evidence sections;
- understand what deserves visual notice.

But must avoid implying priority.

## Agent

A structured attention category could help agents:

- consume provider-native failure semantics without scanning all rows;
- preserve exact provenance;
- avoid NLP over CLI text.

But raw structured evidence may already be sufficient.

Ask whether a new DTO materially helps agents.

---

# Output Study

Mock at least three candidate outputs.

Example:

```text
KNOWN FACTS
...

MISSING CONTEXT
...

ATTENTION

PROVIDER-NATIVE FAILURE STATES
• GitHub workflow run 123 — conclusion: failure
• Vercel deployment abc — readyState: ERROR

KNOWN PROVIDER ACTIVITY
...
```

Alternative:

```text
ATTENTION
No deterministic attention categories are currently present.
```

Alternative:

```text
ATTENTION

RETAINED FAILURE STATE
• GitHub workflow run 123 — conclusion: failure
  Current workflow authority is unknown.
```

Study whether the wording remains safe.

Do not implement.

---

# Noise / Enumeration Pressure

If provider-native failure is earned, determine:

1. Should all failures be shown?
2. Should duplicates be grouped?
3. Should only newest failure be shown?
4. Would "newest only" become prioritization?
5. Is a cap needed?
6. Would a cap require ranking?
7. Can category grouping keep output manageable without ranking?

Default preference:

```text
complete deterministic enumeration within one-hop scope
```

if volume remains reasonable.

But do not assume.

---

# No Scoring

Do not design:

```text
attentionScore
importanceScore
riskScore
priorityScore
confidenceScore
severityScore
```

No weighted heuristics.

No numerical sorting by significance.

---

# No Recommendations

Do not render:

```text
Inspect this first.
Start with GitHub.
Check the failed deployment.
```

The attention layer, if earned, should classify.

It should not prescribe.

---

# No Correlation

A GitHub failure and Vercel failure appearing in the same category does not mean they are related.

Do not group them into:

```text
incident
sequence
cluster
related failure
```

The category may simply contain:

```text
independent provider-native failure evidence
```

---

# No Causality

Do not make:

```text
root cause
likely cause
caused by
resulted in
```

claims.

---

# No AI

No LLM-generated attention summaries.

The point of Sprint 031 is to determine whether deterministic semantics alone earn a new surface.

---

# Architecture Decision

At completion choose exactly one.

## A — Implement Provider-Native Failure Attention

Choose if explicit provider failure/error semantics materially reduce scanning and remain safely descriptive.

Sprint 032 should implement only that category.

---

## B — Implement a Small Multi-Category Attention Surface

Choose only if more than one category is clearly A-class and non-duplicative.

Name each category explicitly.

Do not leave Sprint 032 open-ended.

---

## C — Do Not Add Attention; Clean Up CLI Density

Choose if attention largely duplicates existing surfaces and presentation is the true friction.

Sprint 032 should be a bounded CLI/formatter cleanup.

---

## D — Do Not Add Attention; Existing Investigation Is Sufficient

Choose if no material product value is demonstrated.

Sprint 032 should pursue another pressure-backed capability.

---

## E — Another Narrow Finding

Use only if research uncovers a stronger precise direction.

Name it exactly.

---

# Recommendation Criteria

The winning recommendation must maximize:

```text
scanning reduction
semantic clarity
determinism
provenance
human usefulness
agent usefulness
```

while minimizing:

```text
surface duplication
implied importance
ranking
interpretation
architecture expansion
```

---

# Sprint 032 Boundary

Sprint 031 must recommend one narrow Sprint 032.

Good:

```text
Implement provider_native_failure AttentionItems only.
```

Good:

```text
Remove duplicated provider detail from chronology and tighten investigate section ordering.
```

Bad:

```text
Build AttentionEngine.
```

Bad:

```text
Add smart prioritization.
```

Bad:

```text
Build recommendations.
```

---

# Validation

Sprint 031 is research-only.

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

Expected final:

```text
569 tests
```

unless baseline changes for unrelated reasons.

Also perform:

- secret scan
- staged diff review
- full diff review

Expected:

```text
zero src/ changes
zero test changes
zero schema changes
zero provider changes
```

---

# Architecture Review

Before completion answer:

1. Is provider-native failure a safe attention category?
2. Which exact provider states qualify?
3. Can provider semantics remain unnormalized?
4. Does the category reduce scanning?
5. Does it duplicate Known Facts?
6. Does it imply importance?
7. Does it imply priority?
8. Does it imply correlation?
9. Should unknown authority live only in Missing Context?
10. Should Resource Changes generate attention?
11. Should newest provider activity generate attention?
12. Should known-empty generate attention?
13. Should no-Relationships generate attention?
14. Should active/running provider states generate attention?
15. Can retained evidence safely participate?
16. Does latest-success result-count provenance identify current rows sufficiently?
17. Is row-membership provenance a blocker?
18. Is a typed DTO earned?
19. Is complete enumeration feasible?
20. Would CLI density cleanup solve more friction?
21. Does attention materially help humans?
22. Does it materially help agents?
23. Which A/B/C/D/E recommendation wins?
24. What exactly should Sprint 032 do?

---

# Completion Notes

## Baseline

```text
6655f43b1022d08c08579ff69c22125e826bee82
docs(sprint): record Sprint 030 commit SHA

Sprint 030 implementation:
c6255b253a5608f9bd36d0791ca12449df63fbd7
feat(investigate): add deterministic missing context inventory

569 tests passing
typecheck clean
```

## Repository Understanding

### Signals present today

| Surface | Job | Signals |
|---------|-----|---------|
| SUBJECT / CURRENT | identity | provider, kind, name |
| KNOWN FACTS (≤5) | compression | authority, multi-row state counts, activity totals/scope, newest activity, change counts |
| MISSING CONTEXT | trust inventory | never-refreshed, unknown-after-success, no known Relationships |
| SUBJECT CHANGES | Combie diffs | field changes |
| DEPLOYMENTS / WORKFLOW RUNS / OPERATIONS | full cards | every retained row, multi-line |
| RELATED CONTEXT | one-hop graph | edge + nested dumps |
| KNOWN PROVIDER ACTIVITY | chronology | re-lists every activity row |
| COMBIE OBSERVATIONS | Change clock | observation-time Changes |

### Provider-native vs Combie-derived

- **Provider-native:** readyState, conclusion, operation status, primary created times  
- **Combie-derived:** refresh authority, result_count, last success time, Missing Context, Facts, dual chronology labels  

### Highest manual scanning

1. Full multi-line evidence dumps (subject + each neighbor)  
2. **Re-list** of the same rows in KNOWN PROVIDER ACTIVITY  
3. RELATED nested dumps  
4. Authority wording repeated across Facts, Missing Context, headers, and activity  

Trust gaps after Sprint 030 are relatively cheap to scan (MISSING CONTEXT).

### New product job?

A multi-category ATTENTION surface is **mostly not new**: trust → Missing Context; compression/state/newest → Facts; chronology → Provider Activity.

The only *plausible* net-new job is **instance listing of provider-native failure-valued rows**, and even that is partially covered by multi-row state Facts and is **unsafe to label “current”** without row membership (see below).

### Persistence

Ephemeral pure projection over InvestigationContext would be possible **if** Attention were implemented — **no schema required**. Research concludes not to implement it now.

---

## Semantic Vocabulary

| Term | Meaning |
|------|---------|
| FACT | Deterministic summary of known evidence |
| MISSING CONTEXT | What Combie cannot establish/trust |
| ATTENTION | Descriptive class over already-known evidence |
| PRIORITY | Importance / action ordering — out of scope |
| CORRELATION | Meaningful link between independent records — out of scope |
| CAUSALITY | Why something happened — out of scope |

```text
classification ≠ ranking ≠ recommendation
```

---

## Provider Failure Semantics

**No production allowlist.** Values are pass-through strings. Keep provider-specific fields; no generic failure enum.

### GitHub (`status` + `conclusion` remain distinct)

| Class | Values grounded in repo |
|-------|-------------------------|
| Clear failure | `conclusion: failure` |
| Ambiguous non-success | `conclusion: cancelled` (do **not** auto-bucket as failure) |
| Active | `status: in_progress` (conclusion often null) |
| Healthy terminal | `status: completed` + `conclusion: success` |

Facts summarize **`conclusion` only** (≥2 rows).

### Vercel (`readyState` primary for Facts; `state` often mirrors)

| Class | Values in fixtures/tests |
|-------|--------------------------|
| Clear failure | `readyState: ERROR` (and state often `ERROR`) |
| Active | `BUILDING` |
| Healthy | `READY` |

### Neon (`status` free-form + OpenAPI from Sprint 022)

| Class | Values |
|-------|--------|
| Clear failure | `failed` (fixture); `error` (OpenAPI terminal) |
| Active | `running` (tests); `scheduling`/`cancelling` (docs) |
| Healthy | `finished` |
| Ambiguous | `cancelled`, `skipped` |

**Attention failure allowlist if ever implemented (minimal, fixture+doc clear only):**

```text
GitHub conclusion = failure
Vercel readyState = ERROR
Neon status ∈ {failed, error}
```

Do **not** include cancelled/skipped/BUILDING/in_progress as “failure Attention.”

---

## Candidate A — Provider-Native Failure

- **Safety:** A if phrased as “held evidence has native field=value”  
- **Not safe:** “current production failure” / latest-response failure  
- **Overlap:** multi-row `provider_state_summary` already counts failure values  
- **Gap:** single-row failures omit state Facts; failures buried in long dumps  
- **Verdict:** Plausible thin category **only with non-current wording**; **does not win** vs density cleanup given membership hole + fourth surface cost  

## Candidate B — Unknown Authority

**Reject for Attention.** Owned exclusively by Missing Context (+ authority Facts). Duplication would add density without new semantics.

## Candidate C — Resource Changes

**Reject.** Changes are ordinary Combie observations. Labeling them Attention implies significance (Safety B→C). Facts + COMBIE OBSERVATIONS suffice.

## Candidate D — Newest Activity

**Reject.** Already `newest_provider_activity` Fact + chronology. Recency ≠ attention category.

## Candidate E — Known Empty

**Reject.** Knowledge, not attention. Missing Context correctly excludes it.

## Candidate F — No Relationships

**Reject.** Missing Context only.

## Candidate G — Active/Running

**Reject.** Normal lifecycle noise (BUILDING, in_progress, running). Labeling as Attention invents concern.

---

## Current vs Retained Evidence

- Upsert-only retention; list absence ≠ deletion  
- Under `populated`, chronology marks **all** retained rows with resource-level authority  
- Facts state summary aggregates **all** held rows  
- Empty success: retained rows are explicitly historical  

**Implication:** Any failure Attention over held rows mixes possibly historical failures with latest-response members when `retained > result_count`.

---

## Row Membership Provenance

### Finding

```text
Latest successful response membership is NOT stored per evidence row.
```

Refresh stores only:

```text
status, observed_at, message, result_count, last_success_observed_at
```

`result_count` proves **cardinality** of last successful normalized response — **not** which native IDs.

Per-row `observed_at` is stamped on upsert with batch time and *could* approximate membership vs `last_success_observed_at`, but:

- not product-defined as membership  
- unused by Facts / Missing Context / CLI  
- null when last-success time unknown  

**Combie cannot prove a retained failure row is “current” in the general case.**

**Does this block Attention?** It blocks any Attention that claims **current/latest-response** failure. It does **not** block purely “among held evidence” classification — but that form is weak and overlaps Facts.

**Do not recommend row-membership persistence** for Sprint 032: Attention is not earned strongly enough to justify a new provenance primitive.

---

## Scenario Studies A–F

### A — Explicit Vercel ERROR

- Facts: state summary only if ≥2 deployments; single ERROR may appear only in DEPLOYMENTS dump or newest Fact if multi-family  
- MC: silent if authority populated  
- Manual: scan full deployment cards  
- Hypothetical Attention: lists ERROR row(s) with held-evidence wording  
- Duplication: medium with Facts when multi-row  
- Verdict: mild scan help; not enough alone to earn a new surface given density elsewhere  

### B — GitHub failure + Vercel READY

- Showing only failure Attention would **omit** READY (correct if category is failure-only)  
- Risk: reader infers “GitHub caused the problem” — **wording must not imply correlation**  
- Benefit: moderate for multi-family dump  
- Verdict: category can be descriptive; still second to density cleanup  

### C — Multiple failures

- Complete enumeration of failure-valued held rows is deterministic  
- Cap would become prioritization — reject  
- Grouping by family/resource is fine  
- Volume manageable at one-hop  
- Membership hole still forbids “current failures only”  

### D — Retained failure + unknown authority

- MC already states unknown + last success  
- Listing failure rows as Attention under unknown is **misleading** without heavy “may be stale” qualification  
- Verdict: **do not** put unknown-authority failures in Attention; leave to MC + detail sections  

### E — Quiet / healthy

- Attention should be empty/omitted  
- Zero section machinery risks noise  
- Prefer omit section if no items (if ever implemented)  
- Density cleanup must not invent drama  

### F — Changes only, no provider failure

- Changes must **not** become Attention  
- Facts + OBSERVATIONS enough  
- Honest product: no Attention section  

---

## Scanning Reduction Matrix

| Candidate | Current scan | Reduction | Duplicate? | Risk | Verdict |
|-----------|--------------|-----------|------------|------|---------|
| Provider-native failure | Full dumps | Medium | Facts state counts | Medium if “current” | Conditional; not Sprint 032 winner |
| Unknown authority | Low after MC | Low | MC/Facts | Low | **Reject** |
| Resource Change | OBSERVATIONS | Low | Facts | Medium | **Reject** |
| Newest activity | Chronology/Facts | Low | Facts | Low | **Reject** |
| Known empty | Headers/Facts | None | — | Low | **Reject** |
| No Relationships | MC | None | MC | Low | **Reject** |
| Active/running | Dumps | Low | — | High (noise) | **Reject** |
| **CLI density cleanup** | **Dumps + re-list** | **High** | **N/A (presentation)** | **Low** | **Win** |

---

## Semantic Safety Matrix

| Candidate | Class |
|-----------|-------|
| Held native failure field=value | A (if not “current”) / B if ordered |
| Unknown authority | A but owned by MC |
| Resource Change as Attention | B→C |
| Newest as Attention | B |
| Known empty as Attention | C |
| No Relationships as Attention | A but owned by MC |
| Active as Attention | C |
| Inspect-first / priority | D |

---

## Duplicate-Surface Analysis

```text
Trust gaps     → Missing Context (keep sole owner)
Compression    → Known Facts (keep)
Chronology     → Provider Activity
Changes        → COMBIE OBSERVATIONS + Facts
Failure counts → Facts state summary (multi-row)
Full cards     → family evidence sections
```

A fourth “ATTENTION” section would re-state failure counts as instance lists while **authority already appears 3–4 times**. Net density often **increases**.

---

## CLI Density Comparison

Measured dominant friction after Sprint 030:

```text
full evidence cards × (subject + neighbors)
+ full re-list in KNOWN PROVIDER ACTIVITY
+ repeated authority preambles
```

**CLI density cleanup** attacks that friction directly without new ranking semantics.

**Attention** only shaves failure-finding within dumps and cannot honestly mark currency.

**Winner for Sprint 032: C.**

---

## Human Value

- Humans struggle with **length and repetition**, not missing failure vocabulary  
- After MC, “where knowledge stops” is clear  
- Failure states are readable when found; finding them requires scrolling  

## Agent Value

- Agents already have structured authorities, Facts, Missing Context, and raw evidence arrays  
- Filtering `conclusion === "failure"` is trivial for agents  
- New Attention DTO is **low agent value** vs pure CLI human density  

---

## Output Study (research mocks only)

### Current (abridged multi-family)

```text
KNOWN FACTS
- … unknown authority …
- Of 2 workflow runs held by Combie, 1 has recorded conclusion: failure …

MISSING CONTEXT
- …

DEPLOYMENTS (newest first)
[full cards READY + ERROR]

WORKFLOW RUNS
[full cards]

KNOWN PROVIDER ACTIVITY
[same rows again, multi-line]
```

### Hypothetical ATTENTION (not recommended now)

```text
ATTENTION — PROVIDER-NATIVE FAILURE STATE (among held evidence; not proven latest-response membership)

- github:repository:101 run 9002 conclusion=failure (authority: populated)
- vercel:project:prj deployment dpl_x readyState=ERROR (authority: populated)
```

Risks: fourth surface; “attention” word implies priority; membership caveats hard for humans.

### Hypothetical density cleanup (recommended direction)

```text
KNOWN PROVIDER ACTIVITY (newest first; incomplete; compact)

github run 9002  created_at=…  conclusion=failure  authority=populated  role=related
vercel dpl_x     created=…     readyState=ERROR    authority=populated  role=subject
…
```

Family sections keep full cards; activity stops re-printing entire cards. Authority preamble shortened when MC already listed the gap.

---

## Enumeration / Noise

If failure Attention were shipped:

- Complete enumeration by family/resource, no score cap  
- Newest-only or N-cap = hidden prioritization — reject  
- Under unknown authority: exclude or force “may be stale” — prefer exclude  

Research: volume not the reason to reject A; **semantics + duplication + density priority** are.

---

## Final Recommendation

```text
C — Do not add Attention; perform bounded CLI density cleanup.
```

**Attention is not earned as a product surface in Sprint 032.**

Reasons:

1. Latest-response **row membership is not stored** → cannot safely advertise “current” failures.  
2. Multi-row failure **counts already live in Known Facts**.  
3. Trust gaps already live in **Missing Context**.  
4. Dominant residual scan cost is **presentation density**, not missing classification.  
5. Agents gain little from another DTO.  
6. Adding ATTENTION risks importance-signaling via naming alone.

Provider-native failure **classification remains a future candidate** only if density cleanup proves insufficient **and** wording stays “held evidence” without currency claims — not now.

---

## Sprint 032

**Bounded CLI density cleanup** for `combie investigate` (formatter-level; no AttentionEngine):

1. **Compact KNOWN PROVIDER ACTIVITY** to one-line (or short) entries: native id, primary time, one provider-native state field, authority tag, role/resource — **do not** re-print full multi-line evidence cards already shown in family sections.  
2. **Shorten duplicated authority preambles** in DEPLOYMENTS/WORKFLOW RUNS/OPERATIONS when Missing Context already enumerates the same resource/family gap (pointer, not second essay).  
3. **Do not** invent per-row “in latest success” labels (membership not stored).  
4. **Do not** add ATTENTION / ranking / scoring / inspect-next.  
5. Preserve Facts, Missing Context semantics, dual clocks, offline/read-only.  

TDD against formatter output fixtures; no schema; no provider API changes.

---

## Validation

```text
bun test          — 569 pass (unchanged; research-only)
bun run typecheck — clean
production/test code diff — zero
```

Live verification: not required.

## Architecture Review (research answers)

1. Attention not a genuinely new job at this stage (mostly redundant).  
2. Provider-native failure is strongest *candidate* but not enough to implement.  
3–5. Failure values: GH `failure`; Vercel `ERROR`; Neon `failed`/`error`.  
6. Stay provider-specific.  
7. No generic failure enum.  
8. Unknown → Missing Context only.  
9–13. Changes/newest/empty/no-rels/active → not Attention.  
14. Retained failure only with strong qualification; under unknown, prefer MC only.  
15. **Cannot** prove latest-response membership.  
16. Yes — blocks current-failure Attention.  
17. Scanning reduction insufficient vs density cleanup.  
18. Typed Attention DTO **not** earned now.  
19–21. Cap bad; grouping OK; density cleanup wins.  
22–24. Humans: density; agents: low need.  
25. **C**.  
26. Sprint 032 density cleanup as specified.

## Explicit Questions

1. **No** (not as a separate surface now).  
2. Strongest *candidate* among Attention ideas; still not Sprint 032.  
3. `conclusion: failure`.  
4. `readyState: ERROR`.  
5. `status: failed` / `error`.  
6. **Yes.**  
7. **No.**  
8. **Missing Context only.**  
9. **No.**  
10. **No.**  
11. **No.**  
12. **No** (MC only).  
13. **No.**  
14. Only with held/stale qualification; not as current.  
15. **No.**  
16. **Yes.**  
17. **Not enough** vs density.  
18. **Not now.**  
19. Cap would be ranking — reject.  
20. **Yes.**  
21. Grouping yes; still prefer C.  
22. **Yes — more value.**  
23. Density more than Attention.  
24. Low.  
25. **C.**  
26. Compact Provider Activity + dedupe authority preambles; no Attention section.

## Deviations

None material. Sprint 030 suggested Attention pressure; research **disproves** implementation readiness and redirects to density.

## Learnings

1. Another investigation surface is not free — duplication multiplies scanning.  
2. Missing Context worked because it owned a **unique job** (trust inventory). Attention lacks that uniqueness.  
3. Row membership remains a hard semantic boundary; do not paper over it with Attention marketing.  
4. `result_count` is cardinality provenance, not a set of current IDs.

## Canon Changes

```text
None
```

## Commit

```text
docs(sprint): complete Sprint 031 attention semantics research
```

Exact SHA after commit.

---

# Definition of Done

- [x] Sprint 030 clean baseline verified
- [x] exact baseline SHA recorded
- [x] SKILL protocol followed
- [x] Canon read
- [x] relevant Sprint history reviewed
- [x] Repository Understanding completed
- [x] semantic vocabulary documented
- [x] provider-native failure semantics analyzed
- [x] unknown-authority candidate evaluated
- [x] Resource Change candidate evaluated
- [x] newest-activity candidate evaluated
- [x] known-empty candidate evaluated
- [x] no-Relationships candidate evaluated
- [x] active-state candidate evaluated
- [x] current-vs-retained evidence analyzed
- [x] latest-response row membership pressure analyzed
- [x] Scenario A completed
- [x] Scenario B completed
- [x] Scenario C completed
- [x] Scenario D completed
- [x] Scenario E completed
- [x] Scenario F completed
- [x] Scanning Reduction Matrix completed
- [x] Semantic Safety Matrix completed
- [x] duplicate-surface analysis completed
- [x] CLI density comparison completed
- [x] human value analyzed
- [x] agent value analyzed
- [x] output study completed
- [x] enumeration/noise analyzed
- [x] exactly one A/B/C/D/E recommendation selected
- [x] Sprint 032 bounded precisely
- [x] no production implementation
- [x] no test implementation
- [x] no schema changes
- [x] no provider changes
- [x] no scoring
- [x] no ranking
- [x] no recommendations
- [x] no correlation
- [x] no causality
- [x] no AI
- [x] full tests pass (569)
- [x] typecheck clean
- [x] completion notes updated
- [x] Canon None
- [x] committed separately
- [x] worktree clean
- [x] Sprint 032 not started
- [ ] no causality
- [ ] no AI
- [ ] full tests pass
- [ ] typecheck passes
- [ ] secret scan clean
- [ ] diff/whitespace checks clean
- [ ] completion notes updated
- [ ] Canon changes recorded or None
- [ ] Sprint 031 committed separately
- [ ] worktree clean
- [ ] Sprint 032 not started

---

# Explicitly Out of Scope

Do not implement:

- AttentionItem
- AttentionCategory
- ATTENTION CLI section
- AttentionEngine
- FocusEngine
- RecommendationEngine
- ranking
- scoring
- severity
- confidence
- priority
- risk
- correlation
- SHA matching
- temporal matching
- sequence detection
- causality
- root-cause analysis
- incident grouping
- anomaly detection
- new Relationships
- new provider evidence
- new providers
- row-membership persistence
- refresh-history system
- generic Event
- generic Evidence
- ObservationEngine
- CorrelationEngine
- AI/LLM summaries
- embeddings
- recursive traversal
- logs
- metrics
- traces
- webhooks
- MCP/API/SDK/UI
- controlled execution
- Sprint 032 scaffolding

---

# Final Principle

> **Surface explicit states. Do not convert them into importance.**

And:

> **Attention may classify evidence. It must never become a hidden ranking system.**