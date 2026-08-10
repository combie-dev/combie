# SPRINT-030 — Missing Context

> **Status:** Complete
> **Depends on:** SPRINT-029
> **Type:** Implementation / investigation composition
> **Primary goal:** Add a pure, deterministic, ephemeral Missing Context projection that completely enumerates what Combie cannot currently establish or trust for the investigation subject and its one-hop context.
> **Persistence:** None
> **Provider calls:** None
> **Authority schema changes:** None expected
> **Correlation / causality / AI:** None
> **Ranking / scoring:** None

---

## Goal

Sprint 029 pressure-tested the current end-to-end investigation experience and concluded:

> **B — Explicit Missing-Context Reporting**

The largest remaining investigation gap is not lack of evidence composition, refresh authority, correlation, or AI.

It is this:

> **Combie does not yet provide a complete, structured inventory of what it does not currently know or cannot currently trust.**

Today Combie already provides:

```text
CURRENT
KNOWN FACTS
KNOWN PROVIDER ACTIVITY
COMBIE OBSERVATIONS
provider-specific evidence
RELATED CONTEXT
authority provenance
```

But `KNOWN FACTS` is intentionally bounded:

```text
MAX_INVESTIGATION_FACTS = 5
```

and optimized for useful compression.

It is not designed to provide a complete inventory of gaps.

Sprint 030 introduces a separate investigation surface:

```text
MISSING CONTEXT
```

with its own structured application-layer projection.

The target architecture is:

```text
InvestigationContext
        │
        ├── composeInvestigationFacts()
        │       ↓
        │   KNOWN FACTS
        │
        ├── composeMissingContext()
        │       ↓
        │   MISSING CONTEXT
        │
        ├── composeProviderActivityChronology()
        │       ↓
        │   KNOWN PROVIDER ACTIVITY
        │
        └── Resource Changes
                ↓
          COMBIE OBSERVATIONS
```

The new surface answers:

> **What context is missing or untrusted right now?**

It does NOT answer:

```text
What should I inspect first?
What caused the issue?
What is important?
What is correlated?
What is the root cause?
```

---

# Core Principle

> **Missing context describes the limits of Combie's current knowledge. It does not invent what should exist.**

A missing-context item must always be framed as a statement about:

```text
what Combie knows
what Combie does not know
what Combie cannot currently establish
what evidence authority is unknown
```

Never as an unsupported claim about the external world.

---

# Baseline

Begin from the clean committed Sprint 029 baseline.

Expected Sprint 029 research commits include:

```text
d6d8181ae7469037a6700cc8e0e7453063587054
docs(sprint): complete Sprint 029 investigation capability pressure research
```

and a later documentation SHA record:

```text
046395d
```

Do not assume those short SHAs are current HEAD.

Verify the actual repository state.

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

If Sprint 029 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 029 and Sprint 030.

---

# Sprint 029 Decisions Are Inputs

Sprint 030 should not reopen these decisions unless concrete repository pressure contradicts them.

Sprint 029 established:

## 1. Missing Context is the next product capability

The dominant remaining friction is:

```text
incomplete, scannable inventory
of what Combie cannot establish or trust
```

not:

```text
correlation
causality
AI
more authority infrastructure
multi-hop graph expansion
```

---

## 2. Do not answer "inspect X next"

Sprint 029 concluded that imperative focus language risks interpretation.

Sprint 030 should answer:

```text
What context is missing or untrusted?
```

not:

```text
Inspect this first.
```

---

## 3. One-hop scope remains sufficient

Current investigation scope remains:

```text
subject Resource
+
direct one-hop related Resources
```

Do not add recursive traversal.

Do not add two-hop traversal.

---

## 4. No application↔database Relationship is earned

Do not add or infer application/database Relationships.

The absence of such a Relationship may be surfaced only as a statement about Combie's graph knowledge where semantically safe.

---

## 5. Correlation remains deferred

GitHub↔Vercel correlation is tempting but not the dominant remaining investigation friction.

Do not implement correlation.

---

# Repository Understanding Report

Before coding, inspect:

- `skills/build-combie/SKILL.md`
- Combie Canon
- SPRINT-026
- SPRINT-027
- SPRINT-028
- SPRINT-029
- `InvestigationContext`
- `composeInvestigationFacts()`
- `InvestigationFact`
- `composeProviderActivityChronology()`
- investigate formatter
- Resource model
- Relationship model
- provider registry
- connected-provider persistence
- Vercel deployment authority
- GitHub workflow-run authority
- Neon operation authority
- subject / neighbor representation
- Relationship provenance/path
- provider evidence applicability
- provider-specific evidence reads
- CLI investigate tests
- current zero-state wording

Produce a concise Repository Understanding report.

Explicitly answer:

1. What exact data is available in `InvestigationContext`?
2. Which Resources are in scope?
3. How is subject versus neighbor represented?
4. How are Relationships represented?
5. How is provider evidence authority represented?
6. How can application code distinguish:
   - known populated
   - known empty
   - unknown
   - stale retained
   - never successfully refreshed
   - not applicable
7. How is provider connection state currently represented?
8. Is provider connection state already available inside `InvestigationContext`?
9. Can provider connection state be safely added without provider/network calls?
10. How does the repository determine whether an evidence family is applicable to a Resource?
11. Which Missing Context items can be computed solely from current `InvestigationContext`?
12. Which candidates would require additional local state?
13. Which candidates would incorrectly imply that a Relationship/evidence family should exist?
14. Can the composer remain pure and application-layer only?
15. Are any schema changes required? Expected: no.

No implementation before this report.

---

# Architecture Pressure Report

Answer before implementation:

1. Is a typed `MissingContextItem` DTO earned?
2. Should Missing Context be formatter-only or application-layer structured data?
3. Does it need stable identity?
4. Does it need persistence?
5. Does it need severity?
6. Does it need confidence?
7. Does it need ranking?
8. Does it need scoring?
9. Does it need timestamps?
10. What provenance must each item preserve?
11. Should items be exhaustive rather than capped?
12. Should exact duplicates be deduplicated?
13. Should semantically overlapping gaps be grouped?
14. Can provider connection state participate safely?
15. Can "no Relationships known" be stated safely?
16. How should unsupported/not-applicable evidence differ from missing evidence?
17. Should known-empty evidence count as missing context? Usually no; pressure-test.
18. Should stale retained evidence count as missing or untrusted? Pressure-test.
19. Should never-successfully-refreshed evidence differ from current unknown after prior success?
20. Can all items remain deterministic?
21. Is any new authority primitive required? Expected: no.
22. Is a generic MissingContextEngine required? Expected: no.
23. Does Canon need to change?

Prefer the smallest structured projection.

---

# Product Semantics

Use:

```text
Application type:
MissingContextItem

Composer:
composeMissingContext()

CLI heading:
MISSING CONTEXT
```

Exact naming may adapt to repository conventions.

Do not call the surface:

```text
Problems
Issues
Warnings
Recommendations
Attention
Focus
Findings
Insights
Risks
Gaps to Fix
```

Those terms imply significance or action.

`MISSING CONTEXT` means:

> deterministic statements describing context Combie cannot currently establish or trust.

---

# MissingContextItem

Implement the smallest typed discriminated union justified by repository pressure.

Conceptually:

```ts
type MissingContextItem =
  | UnknownEvidenceAuthority
  | NeverSuccessfullyRefreshed
  | NoKnownRelationships
  | ProviderNotConnected;
```

This is conceptual.

Do not copy it mechanically.

Possible variants should be implemented only if the repository can prove their semantics.

Do not create a generic optional-field bag such as:

```ts
{
  kind?: string;
  resourceId?: string;
  provider?: string;
  message?: string;
  ...
}
```

Prefer explicit discriminated variants.

---

# Identity

Missing Context is ephemeral.

Do not add:

```text
MissingContextItem.id
missing_context table
missing_context history
durable gap IDs
```

Stable durable identity is not required.

Items must be reconstructible deterministically from current local investigation state.

---

# Provenance

Every Missing Context item must preserve enough structured provenance to answer:

```text
What Resource does this gap apply to?
Is it the subject or a neighbor?
Which provider/evidence family does it concern?
What current authority proves the gap?
Was evidence previously known?
Was there a last successful refresh?
Which Relationship brought a neighbor into scope?
What exact local state proves this statement?
```

As applicable preserve:

- Resource ID
- subject/neighbor role
- provider
- evidence family
- authority
- latest attempt time
- last successful refresh time
- last successful result count
- retained evidence count
- Relationship IDs/path for neighbor Resources
- connection state if used

Do not rely only on rendered prose for provenance.

---

# Pure Composer

Implement:

```text
composeMissingContext(...)
```

The composer must be:

```text
pure
deterministic
offline
read-only
```

It must not:

- query providers;
- perform network calls;
- run sync;
- mutate SQLite;
- read current clock time;
- generate random IDs;
- infer Relationships;
- correlate evidence;
- score gaps;
- rank importance;
- call AI/models.

Prefer consuming already-composed investigation state.

If local provider connection state is needed, pressure-test the smallest clean input shape rather than making the composer read storage directly.

---

# Required Missing Context Categories

Sprint 029 earned a narrow initial taxonomy.

Implement only categories that repository evidence can prove.

---

## 1. Applicable Evidence With Unknown Current Authority

This is the highest-confidence category.

Example:

```text
GitHub workflow-run evidence is currently unknown for
github:repository:123.
```

If prior successful provenance exists:

```text
GitHub workflow-run evidence is currently unknown for
github:repository:123.

The last successful bounded refresh at T returned 3 runs;
7 previously recorded runs remain retained locally.
```

The detailed provenance may remain structured rather than all appearing in one CLI sentence.

Requirements:

- evidence family must actually be applicable to the Resource;
- current authority must be unknown;
- do not call unknown "missing evidence";
- retained evidence does not erase the unknown gap;
- previous success does not make current authority known.

This item means:

```text
Combie cannot currently establish current evidence authority.
```

---

## 2. Applicable Evidence Never Successfully Refreshed

This is distinct from:

```text
current authority unknown after prior success
```

Example:

```text
GitHub workflow-run evidence has not yet been successfully refreshed
for github:repository:123.
```

Requirements:

- evidence family applicable;
- no successful refresh provenance;
- current authority is unknown/uninitialized as repository semantics establish;
- do not infer provider-side absence.

If there was a prior successful refresh, use the unknown-current-authority category instead.

Do not emit both for the same Resource/family.

---

## 3. No Known One-Hop Relationships

Example safe wording:

```text
No one-hop Relationships are currently known to Combie for
neon:project:abc.
```

Unsafe:

```text
This Neon project has no Relationships.
```

The safe wording describes Combie's local knowledge graph.

Requirements:

- apply to the investigation subject only unless repository pressure supports a more useful neighbor case;
- `0 Relationships` must come from the canonical local Relationship store/composed context;
- do not imply a Relationship should exist;
- do not name a specific missing relationship such as application↔database unless provider evidence supports that expectation;
- do not treat this as an error.

This item is especially valuable for isolated Resource investigations where graph context is absent.

Pressure-test omission for Resource types where isolation is ordinary and the item provides no value.

---

## 4. Provider Not Connected — Optional and Evidence-Gated

Sprint 029 allowed this only if proven safe.

Implement this variant only if the repository can determine all of the following locally:

1. the evidence family is applicable to the Resource;
2. a specific provider is required for that evidence family;
3. that provider is not connected in Combie;
4. the claim does not require a provider/network call.

Possible example:

```text
GitHub workflow-run context is unavailable because GitHub is not
connected in Combie.
```

Do not emit generic:

```text
GitHub is missing.
```

Do not implement this category if provider connection state cannot be integrated cleanly without broadening `InvestigationContext` or coupling the composer to storage.

If unsafe, explicitly defer it in completion notes.

---

# Known-Empty Is Not Missing

This is a hard semantic boundary.

If the latest successful refresh establishes:

```text
known empty
```

then Combie DOES know the current result for that bounded evidence scope.

Example:

```text
latest successful Vercel deployment refresh returned 0 deployments
```

That is not missing context.

Do not emit:

```text
Vercel deployment context is missing.
```

Known-empty is knowledge.

Unknown is missing authority.

Keep them distinct.

---

# Retained Evidence + Unknown Authority

If evidence rows remain retained while current authority is unknown:

```text
retained historical evidence
+
current unknown authority
```

the Missing Context item should focus on:

```text
current authority is unknown
```

not:

```text
no evidence exists
```

Known Facts and detailed evidence can continue showing retained history.

Missing Context should explain the trust gap.

---

# Unsupported / Not Applicable

An evidence family that does not apply to a Resource is not missing context.

Example:

```text
GitHub workflow-run evidence
```

does not automatically apply to:

```text
cloudflare:zone:...
```

unless the architecture explicitly defines such applicability.

Do not enumerate every unsupported evidence family as missing.

That would produce noise and imply missing integrations.

Only applicable missing/untrusted context belongs in this surface.

---

# Missing Relationship Semantics

Be conservative.

Allowed:

```text
No one-hop Relationships are currently known to Combie for this Resource.
```

Not allowed:

```text
The Vercel project is missing a database Relationship.
```

unless a future exact provider-backed relationship contract proves such an edge should be discoverable.

Do not resurrect Sprint 015's deferred application↔database Relationship.

Do not infer expected topology.

---

# Complete Enumeration

Unlike `KNOWN FACTS`, Missing Context should not use the five-Fact cap.

The purpose is to provide a complete deterministic gap inventory for the bounded investigation scope.

However:

- deduplicate exact semantic duplicates;
- group equivalent items deterministically where it preserves provenance;
- avoid repeated copies caused by multiple Relationship paths;
- avoid unsupported/not-applicable families.

Do not arbitrarily truncate the result.

If realistic fixtures produce unreasonable volume, document that pressure before adding any cap.

---

# Deterministic Ordering

Missing Context items are not ranked by importance.

Use a stable presentation order based on category and stable provenance.

Recommended category order:

```text
1. never successfully refreshed
2. current authority unknown
3. provider not connected
4. no known Relationships
```

Pressure-test this order.

The ordering is organizational only.

It must not communicate:

```text
severity
importance
risk
recommended next action
```

Within categories use stable:

```text
Resource ID
provider
evidence family
```

or repository-consistent tie-breakers.

Document the comparator.

---

# Subject vs Neighbor

Missing Context must preserve scope.

Example:

```text
SUBJECT
vercel:project:abc

NEIGHBOR
github:repository:123
via source_for
```

A gap concerning the GitHub repository must retain that it belongs to a one-hop neighbor.

Do not flatten all gaps onto the subject.

For neighbor items preserve canonical Relationship provenance.

---

# CLI Integration

Extend:

```bash
combie investigate <resource-id>
```

with:

```text
MISSING CONTEXT
```

Recommended conceptual placement:

```text
SUBJECT
CURRENT

KNOWN FACTS

MISSING CONTEXT

KNOWN PROVIDER ACTIVITY

COMBIE OBSERVATIONS

RELATED CONTEXT

detailed provider evidence
```

But inspect current output before choosing exact placement.

Goals:

1. show what Combie knows;
2. then show what Combie cannot currently establish;
3. then let the investigator inspect evidence.

Avoid duplicating full authority detail already visible elsewhere.

Missing Context should be concise.

---

# Zero State

If no deterministic missing/untrusted context exists:

```text
MISSING CONTEXT

No missing or untrusted context is currently known for this
investigation scope.
```

Pressure-test wording.

Do not say:

```text
Combie has complete context.
```

That would overstate completeness.

A zero state only means:

```text
no gaps represented by the currently supported Missing Context taxonomy
were detected.
```

Keep the wording modest.

---

# Interaction With KNOWN FACTS

Known Facts and Missing Context have different jobs.

```text
KNOWN FACTS
= highest-value compressed known evidence
```

```text
MISSING CONTEXT
= complete bounded inventory of deterministic knowledge gaps
```

It is acceptable for both to mention the same underlying authority condition if their purposes differ, but avoid redundant prose when possible.

Example:

Known Fact:

```text
GitHub workflow-run evidence is currently unknown;
the last successful refresh returned 3 runs.
```

Missing Context:

```text
GitHub workflow-run current authority is unknown.
```

Pressure-test whether this duplication is useful.

If not, determine whether authority Facts should defer gap enumeration to Missing Context while retaining other high-value summary Facts.

Do not modify Fact semantics unnecessarily.

Document the final choice.

---

# Interaction With Provider Activity

Missing Context does not alter:

```text
KNOWN PROVIDER ACTIVITY
```

Do not remove retained provider evidence because authority is unknown.

Do not filter chronology based on missing-context items.

Chronology remains what Combie knows.

Missing Context explains trust boundaries.

---

# Interaction With COMBIE OBSERVATIONS

Do not modify:

```text
COMBIE OBSERVATIONS
```

Missing Context does not merge provider time and Combie observation time.

Do not create missing-context items from timestamp comparisons.

---

# No Imperative Recommendations

Do not render:

```text
Inspect GitHub next.
Check Vercel first.
Investigate this Resource.
Start with the failed workflow.
```

Sprint 029 explicitly rejected imperative focus as the next capability.

A user or agent may choose an action based on Missing Context.

Combie should provide the deterministic gap, not the imperative.

---

# No Scoring / Ranking

Do not add:

```text
priority
severity
risk
importance
confidence
relevance
attention score
```

Do not numerically rank Missing Context items.

Category ordering is allowed only for stable presentation.

---

# No Correlation

Do not derive gaps such as:

```text
No correlation between GitHub and Vercel is known.
```

unless a future correlation primitive exists and has explicit authority semantics.

The absence of correlation logic is not itself Missing Context in Sprint 030.

---

# No AI

No LLM-generated missing-context summaries.

Every item must be deterministically reproducible from structured local state.

This structured surface should itself be useful grounding for future agents.

---

# Tests

Use:

```text
Red → Green → Refactor
```

---

## Pure Composer Tests

Cover:

- deterministic output;
- no input mutation;
- no clock reads;
- no provider reads;
- no storage writes;
- input ordering does not change output ordering;
- exact deduplication.

---

## Unknown Authority

Cover:

- Vercel deployment authority unknown;
- GitHub workflow authority unknown;
- Neon operation authority unknown;
- unknown with retained rows;
- unknown without retained rows;
- prior last-success provenance preserved;
- subject vs neighbor.

---

## Never Successfully Refreshed

Cover:

- applicable evidence family;
- no last-success time;
- no successful result count;
- current unknown/uninitialized;
- does not duplicate unknown-after-success;
- deterministic wording/provenance.

---

## Known Empty

Cover:

- successful empty Vercel evidence;
- successful empty GitHub bounded evidence;
- successful empty Neon evidence;
- retained history where applicable.

Assert:

```text
known empty DOES NOT create a Missing Context item
```

unless another independent gap exists.

---

## No Known Relationships

Cover:

- subject with zero Relationships;
- subject with one Relationship;
- subject with multiple Relationships;
- dangling Relationships if repository supports them;
- no implication that a specific Relationship should exist;
- exact safe wording.

---

## Provider Not Connected

Only if implemented.

Cover:

- applicable family + provider disconnected;
- applicable family + provider connected;
- non-applicable provider;
- no provider calls;
- no duplicate unknown/never-refreshed gap if grouping rules prevent it.

If not implemented, completion notes must explicitly record why.

---

## Scope / Provenance

Cover:

- subject gap;
- neighbor gap;
- inbound Relationship;
- outbound Relationship;
- multiple paths to same neighbor;
- deduplication while preserving Relationship provenance;
- no second-hop context.

---

## Ordering

Cover:

- deterministic category order;
- deterministic Resource/provider/family tie-break;
- no scoring;
- repeated composition identical.

---

## Zero State

Cover:

- no supported gap categories present;
- truthful zero wording;
- does not claim complete context.

---

## Fact Interaction

Cover:

- Missing Context coexists with Known Facts;
- five-Fact cap unchanged;
- no uncontrolled duplicate authority prose;
- any Fact refinement is intentional and tested.

---

## CLI

Test:

```bash
combie investigate <resource-id>
```

for:

- `MISSING CONTEXT` heading;
- unknown authority item;
- never-success item;
- no-Relationships item;
- neighbor provenance;
- zero state;
- known-empty exclusion;
- detailed evidence still visible;
- `KNOWN FACTS` still visible;
- `KNOWN PROVIDER ACTIVITY` unchanged;
- `COMBIE OBSERVATIONS` unchanged;
- deterministic output;
- no secrets.

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
555 tests
```

Final count should increase.

Perform:

- focused tests;
- full regression;
- secret scan;
- staged diff review;
- full diff review.

Preserve:

- provider connections
- Resources
- Relationships
- Changes
- History
- Context
- Investigation
- Known Facts
- Provider Activity Chronology
- Combie Observations
- refresh authority
- Vercel deployment evidence
- GitHub workflow evidence
- Neon operation evidence
- partial-failure behavior
- offline/read-only investigation

---

# Offline Requirement

Missing Context must work entirely from local persisted/composed state.

After evidence has been synced:

```bash
unset VERCEL_TOKEN
unset GITHUB_TOKEN
unset GH_TOKEN
unset NEON_API_KEY
```

then:

```bash
bun run combie investigate <resource-id>
```

must still render identical Missing Context.

No provider calls.

No refresh.

No mutation.

---

# Read-Only Requirement

Running `investigate` must not change SQLite state.

Verify repeated reads leave persisted state unchanged.

No migration is expected for Sprint 030.

---

# Performance

Missing Context composition should operate over the bounded current investigation scope.

Expected cost should remain small and proportional to:

```text
subject
+
one-hop neighbors
+
applicable evidence authority records
```

Do not introduce recursive graph scans.

Do not introduce N+1 provider reads.

Avoid storage reads inside the pure composer.

---

# Security

Use normalized local evidence and safe authority metadata only.

Do not expose:

- provider tokens;
- auth headers;
- connection strings;
- environment variables;
- raw API payloads;
- unsafe provider errors.

Missing Context provenance should use stable safe identifiers already allowed elsewhere.

---

# Architecture Review

Before completion explicitly answer:

1. Did `MissingContextItem` remain ephemeral?
2. Did it remain application-layer structured data?
3. Did storage remain unchanged?
4. Did provider contracts remain unchanged?
5. Were provider API calls unchanged?
6. Was any new authority primitive required?
7. Is known-empty excluded from Missing Context?
8. Is unknown distinct from never-successfully-refreshed?
9. Are retained rows compatible with an unknown gap?
10. Is "no Relationships known" worded as a Combie-knowledge claim?
11. Was provider-not-connected implemented?
12. If yes, was it proven locally/applicably?
13. If no, why was it deferred?
14. Is Missing Context exhaustive for its supported taxonomy?
15. Was any arbitrary cap required?
16. Are exact duplicates deduplicated?
17. Is subject/neighbor provenance preserved?
18. Was any imperative recommendation introduced?
19. Was scoring introduced?
20. Was correlation introduced?
21. Was causality introduced?
22. Was AI introduced?
23. Does Missing Context materially improve humans?
24. Does it materially improve agents?
25. What is the next largest investigation friction after Sprint 030?

---

# Completion Notes

## Baseline

```text
046395d5c4598dcb89c9d226edc86eabe26d6bcc
docs(sprint): record Sprint 029 commit SHA

Sprint 029 research:
d6d8181ae7469037a6700cc8e0e7453063587054

555 tests passing
typecheck clean
```

## Repository Understanding

`InvestigationContext` already carries subject + one-hop neighbors with three authority DTOs each (`not_applicable` | `unknown` | `empty` | `populated`), including last-success time/count on Vercel/GitHub unknown, and lastSuccessAt on Neon unknown.

Applicability = DTO not `not_applicable` (provider+kind match). Known empty/populated are successful authority. Unknown with null last-success provenance means never proven success; unknown with lastSuccessAt/resultCount means prior success then untrusted current state.

Provider connection state lives in `providers` table but is **not** on InvestigationContext. Adding it would expand the pure composer contract or force storage reads inside composition — deferred.

No schema changes required.

## Architecture Pressure

1. Typed DTO earned — same pattern as InvestigationFact.  
2. Application-layer structured data (not formatter-only).  
3. No stable durable IDs.  
4–8. No persistence, severity, confidence, ranking, scoring.  
9. Attempt/success times carried as provenance only.  
10. Resource, role, family, authority fields, times, counts, Relationship paths.  
11. Exhaustive for supported taxonomy (not 5-capped).  
12–13. Dedup multi-edge neighbors; one item per family/resource.  
14. Provider-not-connected deferred.  
15. No-Relationships safe as Combie knowledge claim.  
16. not_applicable silent.  
17. Known-empty is **not** missing context.  
18. Unknown + retained = untrusted gap, not “no evidence”.  
19. never-success vs unknown-after-success split.  
20. Pure deterministic.  
21. No new authority primitive.  
22. No MissingContextEngine.  
23. Canon unchanged.

## MissingContextItem Shape

```ts
type MissingContextItem =
  | never_successfully_refreshed
  | unknown_current_authority
  | no_known_relationships;
```

Discriminated union with full provenance fields (family, provider, scope, retainedCount, attempt/success times, result count, message, Relationship refs).

## Supported Taxonomy

| Category | Shipped |
|----------|---------|
| never_successfully_refreshed | Yes |
| unknown_current_authority | Yes |
| no_known_relationships | Yes |
| provider_not_connected | **Deferred** |

## Unknown Authority

`authority.kind === "unknown"` **and** last-success provenance present (`lastSuccessAt != null` or `resultCount != null` for Vercel/GitHub; Neon uses `lastSuccessAt` only).

## Never Successfully Refreshed

`authority.kind === "unknown"` **and** no last-success provenance. Exclusive with unknown-after-success for the same family/resource.

## Known Empty

Successful empty (`kind === "empty"`) is knowledge of a zero current response. **Never** emits Missing Context. Retained history under empty remains visible in evidence/Facts only.

## No Known Relationships

```text
No one-hop Relationships are currently known to Combie for <resource-id>.
```

Claims Combie graph knowledge only. Does not name missing app↔db edges.

## Provider Not Connected

**Deferred.** Requires InvestigationContext expansion or pure-composer storage access. Not available cleanly on the pure `InvestigationContext`-only input without architectural broadening.

## Provenance

Subject: `role: "subject"`, empty relationships.  
Neighbor: `role: "related"`, normalized Relationship refs (id, kind, direction, endpoints). Multi-edge same neighbor → one gap item, multiple path refs.

## Enumeration

Complete for the three shipped categories across subject + one-hop. No arbitrary cap. Noise controlled by applicability, exclusivity rules, and one-hop scope.

## Ordering / Deduplication

Category order:

1. `never_successfully_refreshed`
2. `unknown_current_authority`
3. `no_known_relationships`

Within: `resourceId ASC`, family (`github` → `neon` → `vercel`), role. Neighbors deduped by resource id.

## Fact Interaction

Known Facts unchanged (`MAX_INVESTIGATION_FACTS = 5`). Missing Context coexists; may overlap thematically with authority Facts but serves complete inventory vs compression.

## CLI Composition

```text
SUBJECT / CURRENT
KNOWN FACTS
MISSING CONTEXT          ← new
SUBJECT CHANGES
[DEPLOYMENTS|WORKFLOW RUNS|OPERATIONS]
RELATED CONTEXT
KNOWN PROVIDER ACTIVITY
COMBIE OBSERVATIONS
```

Sample:

```text
MISSING CONTEXT

- GitHub workflow-run evidence is currently unknown for github:repository:101; the last successful refresh at 2026-08-09T11:00:00.000Z returned 3 records; 2 previously recorded rows remain retained locally.
- No one-hop Relationships are currently known to Combie for github:repository:101.
```

Zero state:

```text
No missing or untrusted context is currently known for the supported investigation scope.
```

## Offline / Read-Only

Composer and formatter use only `InvestigationContext` already loaded offline. No network. No storage writes. Credentials not required for tests.

## Validation

```text
bun test          — 569 pass (+14)
bun run typecheck — clean
git diff --check  — clean
```

## Live Verification

Deferred (no credentials). Fixture coverage is sufficient for this pure projection.

## Architecture Review answers

1. Ephemeral — yes.  
2. Typed DTO justified — yes.  
3. Storage unchanged — yes.  
4–5. Provider contracts/APIs unchanged — yes.  
6. No new authority primitive — yes.  
7. Known-empty excluded — yes.  
8. Never-success distinct — yes.  
9. Retained coexists with unknown gap — yes.  
10. No-Relationships is Combie knowledge claim — yes.  
11. Provider-not-connected deferred — yes.  
12. Enumeration complete for taxonomy — yes.  
13. Cap not required — yes.  
14. Duplicates controlled — yes.  
15. Provenance complete for shipped items — yes.  
16–20. No imperative focus / scoring / correlation / causality / AI.  
21. Largest remaining friction: multi-signal **attention categorization** without scoring (after gaps are listed).  
22. Sprint 031: optional non-ranked attention categories (failed native state / unknown already listed) or UX density — not correlation engines.

## Explicit Questions

1. Complete inventory of untrusted/unknown Combie knowledge for one-hop investigate.  
2. never-success, unknown-after-success, no-known-relationships.  
3. provider_not_connected; focus ranking; filtering; correlation.  
4. Empty = successful zero result; unknown = untrusted/unestablished authority.  
5. Never-success has no last-success provenance; unknown-after-success has it.  
6. Yes — retained rows are memory; gap is current authority.  
7. Combie has zero one-hop edges for the subject.  
8. No.  
9. No — deferred.  
10. Authority DTO not `not_applicable`.  
11. No cap.  
12. Applicability + exclusivity + one-hop.  
13. Neighbor resource id key + multi-path merge.  
14. Stable category then resource/family.  
15. Scope refs + Relationship paths.  
16. Fact semantics unchanged.  
17. Five-Fact budget unchanged.  
18–20. No storage/provider/API changes.  
21–25. No.  
26–27. Yes (humans scan gaps first; agents get structured DTO).  
28. Choosing among concurrent **trusted** signals (failed native state, newest activity, Changes) without scoring.  
29. Attention categories (non-ranked) or filtering — not correlation first.  
30. Optional: non-ranked ATTENTION CATEGORIES for populated provider-native failed states, or CLI density cleanup — research if needed.

## Deviations

1. Provider-not-connected deferred (as Sprint allowed).  
2. No Known Fact wording redesign beyond coexistence.

## Learnings

1. Gap inventory and summary Facts are complementary, not substitutes.  
2. Never-success vs unknown-after-success needs last-success provenance (Sprint 027/028 paid off).  
3. Imperative “inspect next” remains unearned; gaps enable human/agent choice.

## Canon Changes

```text
None
```

## Files Changed

```text
src/app/missing-context.ts          (new)
src/app/investigate.ts              (format wiring)
tests/app/missing-context.test.ts   (new)
docs/internal/sprints/SPRINT-030.md
```

## Commit

```text
feat(investigate): add deterministic missing context inventory
```

Exact SHA after commit.

---

# Definition of Done

- [x] Sprint 029 clean baseline verified
- [x] exact baseline SHA recorded
- [x] SKILL protocol followed
- [x] Canon read
- [x] relevant Sprint notes reviewed
- [x] Repository Understanding completed
- [x] Architecture Pressure completed
- [x] typed `MissingContextItem` implemented
- [x] `composeMissingContext()` implemented
- [x] composer pure
- [x] no provider calls
- [x] no storage writes
- [x] no clock/random dependence
- [x] no persistence added
- [x] no schema migration
- [x] unknown authority category implemented
- [x] never-successfully-refreshed category implemented
- [x] known-empty excluded
- [x] no-known-Relationships category implemented if supported
- [x] provider-not-connected implemented or explicitly deferred
- [x] subject/neighbor provenance preserved
- [x] enumeration complete for taxonomy
- [x] no arbitrary scoring/ranking
- [x] no correlation/causality/AI
- [x] Known Facts five-cap unchanged
- [x] CLI MISSING CONTEXT section
- [x] zero state truthful
- [x] focused tests pass
- [x] full suite pass
- [x] typecheck clean
- [x] completion notes updated
- [x] Canon None
- [x] committed separately
- [x] worktree clean
- [x] Sprint 031 not started

---

# Explicitly Out of Scope

Do not implement:

- investigation priority ranking
- "inspect next" recommendations
- FocusEngine
- RecommendationEngine
- relevance scoring
- risk scoring
- confidence
- severity
- evidence filters
- multi-hop traversal
- recursive traversal
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
- more refresh-authority schema
- AI/LLM summaries
- embeddings
- logs
- metrics
- traces
- webhooks
- MCP/API/SDK/UI
- controlled execution
- Sprint 031 scaffolding

---

# Final Principle

> **Known Facts tell the investigator what Combie knows. Missing Context tells the investigator where Combie's knowledge stops.**

And:

> **Expose the gap. Do not prescribe the conclusion.**