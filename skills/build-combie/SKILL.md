---
name: build-combie
description: The canonical engineering playbook for building Combie. Use for every substantive implementation, architectural review, sprint execution, refactor, documentation update, provider integration, and engineering decision.
---

# SKILL.md

# Build Combie

> Engineering Constitution

This document defines how Combie is engineered.

It is the canonical engineering playbook for both human engineers and AI coding agents.

Its purpose is not to maximize code generation.

Its purpose is to maximize shipping velocity **without sacrificing architectural coherence**.

Combie should move fast because the product stays focused.

Every meaningful implementation should follow this document.

---

# Why This Document Exists

Software projects become complicated gradually.

Not because engineers intentionally overbuild them.

Because small local decisions accumulate:

- abstractions are introduced too early
- future roadmap concepts leak into current implementation
- provider-specific logic spreads into the core
- documentation grows faster than the product
- AI agents optimize for completeness instead of scope
- implementation begins to redefine the architecture

Combie intentionally avoids this.

The product should remain understandable.

The architecture should remain small.

The active Sprint should remain narrow.

The code should reflect what Combie needs **today**, not everything it may need someday.

---

# The Engineering North Star

Every implementation should make Combie better at one or more of these things:

```text
Connect
Understand
Remember
Investigate
Learn
Act
```

But only the capability required by the current roadmap phase should be implemented.

Whenever multiple implementation choices exist:

> Choose the smallest design that satisfies the active Sprint while preserving Combie's architectural boundaries.

---

# What Combie Is

Combie is the open engineering context layer that connects an engineering stack once, understands how its parts fit together, remembers what happens across them, and gives humans and AI agents a shared interface to investigate and safely operate that infrastructure.

Combie connects existing engineering systems such as:

- GitHub
- Cloudflare
- Vercel
- Sentry
- Railway
- Render
- Fly.io
- Slack

Over time it may connect larger systems such as:

- Kubernetes
- Terraform / OpenTofu
- Datadog
- Prometheus
- AWS
- GCP
- Azure

These providers remain integrations.

They never define Combie.

---

# What Combie Is Not

Combie is not:

- an observability platform
- a telemetry database
- an AI model
- an AI coding agent
- an MCP gateway product
- an infrastructure abstraction layer
- a Terraform replacement
- a Kubernetes replacement
- a Sentry replacement
- a Datadog replacement
- a generic workflow automation engine
- an autonomous DevOps agent

Combie may integrate with these systems.

It may expose itself through MCP.

It may use AI models.

It may eventually execute infrastructure actions.

None of those capabilities define the product.

---

# Product Philosophy

Combie begins with one belief:

> Engineering systems are fragmented across tools, but humans and AI agents need one durable understanding of how those tools fit together.

Combie exists to create that shared engineering understanding.

The product should remain valuable without AI.

Resources, relationships, changes, timelines, and operational memory should be deterministic wherever possible.

AI should reason over engineering context.

It should not replace engineering context.

---

# Engineering Philosophy

Combie should be built through short feedback loops.

Prefer shipping over predicting.

Prefer vertical slices over platform building.

Prefer real provider behavior over theoretical abstractions.

Prefer explicit behavior over hidden magic.

Prefer boring infrastructure over unnecessary cleverness.

Prefer changing code over maintaining speculative documentation.

The fastest path is not the one with the most code.

The fastest path is the one with the fewest wrong assumptions.

---

# The Combie Canon

Combie deliberately keeps its permanent documentation small.

The canonical product documents are:

1. `VISION.md`
2. `ARCHITECTURE.md`
3. `ROADMAP.md`
4. this `SKILL.md`

These are the guiding lights.

Everything else should exist only when it earns the right to exist.

---

# Product Canon

Read first:

- `VISION.md`

This answers:

> What is Combie?

> Why does it exist?

> What does it deliberately not become?

> What principles should remain true as the implementation evolves?

---

# Architecture Canon

Read second:

- `ARCHITECTURE.md`

This answers:

> How is Combie structured?

> What belongs in Combie Core?

> What belongs in providers?

> What does the Engineering Model own?

> How do memory, intelligence, telemetry, credentials, and execution fit together?

---

# Roadmap Canon

Read third:

- `ROADMAP.md`

This answers:

> What are we proving now?

> What comes later?

The Roadmap describes direction.

It is **not permission to implement future features early**.

Future roadmap concepts must not leak into the active Sprint unless explicitly required.

---

# Execution Canon

Read fourth:

- Active Sprint

This answers:

> What exactly are we building now?

The Sprint defines today's implementation boundary.

The Sprint never overrides the Vision or Architecture.

---

# Source of Truth Order

When sources disagree, use this order:

```text
VISION.md
   ↓
ARCHITECTURE.md
   ↓
ROADMAP.md
   ↓
Active Sprint
   ↓
Current Code
```

The code reflects implementation reality.

It does not automatically redefine product direction.

If code conflicts with the Canon:

report the conflict.

Do not silently change the Canon to match the implementation.

---

# Core Product Progression

Combie evolves in this order:

```text
CONNECT
   ↓
DISCOVER
   ↓
RELATE
   ↓
OBSERVE
   ↓
REMEMBER
   ↓
INVESTIGATE
   ↓
LEARN
   ↓
RECOMMEND
   ↓
APPROVE
   ↓
ACT
   ↓
VERIFY
```

This order is intentional.

Do not skip ahead.

---

# Architectural Invariants

These rules must remain true.

## Invariant 1 — Providers Remain Adapters

Cloudflare is an adapter.

GitHub is an adapter.

Vercel is an adapter.

Sentry is an adapter.

Railway is an adapter.

No provider should become Combie Core.

Provider-specific API models should not spread through the domain.

---

## Invariant 2 — The Engineering Model Is Provider-Independent

Combie Core reasons about normalized engineering concepts.

Examples include:

- Resource
- Relationship
- Observation
- Change
- Deployment
- Alert
- Incident
- Investigation
- Decision
- Action
- Outcome
- Evidence

Provider-specific metadata may exist.

Provider-specific concepts must not define the core architecture.

---

## Invariant 3 — Context Comes Before Intelligence

Do not use an LLM where deterministic engineering context solves the problem.

Before introducing model reasoning, ask:

- Can the provider tell us this directly?
- Can the Engineering Graph tell us this?
- Can history tell us this?
- Can deterministic correlation tell us this?

AI should sit on top of real context.

---

## Invariant 4 — Memory Stores Engineering Meaning

Combie is not a raw telemetry warehouse.

Prefer storing:

```text
Deployment changed service.
Errors increased afterward.
Investigation identified regression.
Human approved rollback.
Rollback succeeded.
```

over storing millions of unstructured telemetry records.

Raw evidence may remain in the source system.

Combie should preserve the meaning, provenance, and outcome.

---

## Invariant 5 — Telemetry Is Evidence

Logs, traces, metrics, sessions, and telemetry are valuable.

They may be queried, normalized, or referenced.

They do not require Combie to become an observability backend.

The principle is:

> Store the engineering meaning; reference the raw evidence.

---

## Invariant 6 — Models Are Replaceable

Combie must remain model-independent.

Users may use:

- Cursor
- Codex
- Claude Code
- other compatible agents
- OpenAI
- Anthropic
- Gemini
- OpenRouter
- Ollama
- custom model providers

Operational memory must survive changes in model provider.

---

## Invariant 7 — MCP Is an Interface

MCP is supported as an agent interface.

MCP must never become Combie's internal architecture.

Combie Core should remain usable through:

- CLI
- API
- SDK
- MCP
- Slack
- future interfaces

---

## Invariant 8 — Execution Follows Trust

Do not introduce autonomous infrastructure writes early.

The progression is:

```text
Read
Observe
Query
Investigate
Recommend
Approve
Execute
Verify
```

Meaningful infrastructure actions require explicit capability and policy.

Human approval remains the default unless the Canon explicitly changes.

---

## Invariant 9 — Credentials Require Explicit Authorization

Combie must never silently harvest secrets.

It may detect compatible tools or environment-variable presence.

It must not search:

- shell history
- arbitrary `.env` files
- unrelated project folders
- plaintext files looking for credentials

The principle is:

> Detect capability. Request permission. Use the secret.

---

## Invariant 10 — Build Only the Active Vertical Slice

Do not implement future roadmap concepts because they may eventually be useful.

If the active Sprint does not require:

- MCP
- InvestigationEngine
- LearningEngine
- RecommendationEngine
- OTLP ingestion
- execution policies
- AWS support
- Kubernetes support

do not create them.

The Roadmap explains direction.

The Sprint defines scope.

---

# The Anti-Speculation Rule

Before creating any new abstraction, ask:

> Does the active Sprint require this abstraction today?

If the answer is no:

Do not create it.

Examples of premature abstractions include:

```text
LearningEngine
InvestigationEngine
ActionPolicy
AgentRegistry
OTLPReceiver
RecommendationScorer
AwsProvider
AzureProvider
KubernetesProvider
```

These concepts may be correct later.

That does not make them correct now.

Let real requirements earn abstractions.

---

# Provider Development Philosophy

Provider contracts should evolve from real integrations.

Do not design a universal provider framework from imagination.

If Sprint 001 uses Cloudflare:

build the smallest provider contract Cloudflare proves we need.

When GitHub arrives:

test the abstraction.

When Vercel arrives:

test it again.

When Sentry arrives:

test it again.

The abstraction should become stronger through evidence.

Not prediction.

---

# Vertical Slice Discipline

Combie is built through complete vertical slices.

Every Sprint should leave the repository in a working and demonstrable state.

Prefer:

```text
One provider
↓
Real authentication
↓
Real resource discovery
↓
Persistence
↓
CLI inspection
```

over:

```text
Five unfinished providers
+
future MCP framework
+
partial graph layer
+
placeholder AI system
```

Depth wins over breadth.

---

# Documentation Discipline

Permanent documentation should remain intentionally small.

Do not create new permanent architectural documents unless explicitly requested or clearly justified by complexity.

Examples of documents that should **not** be created speculatively:

- `MEMORY_MODEL.md`
- `PROVIDER_MODEL.md`
- `INTELLIGENCE_MODEL.md`
- `MCP_SPEC.md`
- `LEARNING_MODEL.md`
- `EXECUTION_MODEL.md`

If a subsystem eventually becomes complicated enough that contributors cannot understand it from:

- `ARCHITECTURE.md`
- code
- tests

then a dedicated document may be warranted.

Documentation must be earned by complexity.

---

# Documentation Update Rules

During implementation:

### If product direction changed materially

Update:

- `VISION.md`

### If architectural boundaries changed materially

Update:

- `ARCHITECTURE.md`

### If release sequencing changed materially

Update:

- `ROADMAP.md`

### If implementation details changed

Prefer:

- code
- tests
- inline documentation

### If nothing canonical changed

Do not touch the canonical docs.

Avoid documentation churn.

---

# Repository Reading Order

Before implementing any meaningful change:

1. Read `AGENTS.md`
2. Read this `SKILL.md`
3. Read `VISION.md`
4. Read `ARCHITECTURE.md`
5. Read `ROADMAP.md`
6. Read the Active Sprint
7. Inspect relevant source code and tests

Do not read every historical sprint unless required.

Do not let old implementation plans override current architecture.

---

# Sprint Execution Protocol

When the user says:

```text
Implement Sprint X
```

or requests a substantive implementation belonging to an active Sprint, the coding agent MUST:

1. Read `AGENTS.md`
2. Read `SKILL.md`
3. Read `VISION.md`
4. Read `ARCHITECTURE.md`
5. Read `ROADMAP.md`
6. Read the Active Sprint
7. Inspect the repository
8. Produce the Repository Understanding Report
9. Validate architecture and Sprint scope
10. Produce an implementation plan
11. Implement using Red → Green → Refactor
12. Perform architecture review
13. Perform engineering review
14. Run focused validation
15. Run the full relevant test suite
16. Perform manual verification
17. Review the complete diff
18. Update documentation only when required
19. Commit when authorized
20. Verify repository state
21. Stop after the active Sprint

Do not continue into future Sprint work.

---

# Phase 1 — Understand Combie

Before changing code, understand the current product boundary.

Answer:

- What problem is this Sprint solving?
- Which roadmap version does it belong to?
- Which Canon documents govern this work?
- Which architectural invariants apply?
- What is explicitly out of scope?

If the Sprint conflicts with the Canon:

STOP.

Explain the conflict.

Do not silently choose one interpretation.

---

# Phase 2 — Repository Understanding

Inspect the current repository.

Produce a concise Repository Understanding Report.

Include:

## Repository Summary

- repository structure
- important modules
- current implementation maturity
- relevant tests
- relevant commands

## Sprint Readiness

- what already exists
- what can be reused
- what must be added
- what should remain untouched

## Canon Alignment

- whether current implementation matches the Vision and Architecture
- any architectural drift relevant to the Sprint

## Risks

Identify concrete implementation risks.

Do not invent theoretical risks unrelated to the active work.

---

# Phase 3 — Scope Validation

Confirm:

- the Sprint belongs to the current Roadmap phase
- the Sprint is a complete vertical slice
- no future phase work is being introduced
- no unnecessary provider abstraction is being introduced
- no AI layer is being added unless required
- no execution capability is being added unless required
- canonical documentation does not need speculative expansion

If the proposed implementation exceeds Sprint scope:

reduce it.

---

# Phase 4 — Implementation Plan

Before modifying code, produce a concise implementation plan.

Include:

- files or modules to modify
- new modules if required
- responsibilities
- public interfaces
- tests to add
- migration considerations
- meaningful risks

Avoid long implementation essays.

The plan should make the change understandable.

Then implement.

---

# Phase 5 — Red → Green → Refactor

Use test-driven development where practical.

## Red

Add or update tests that express the required Sprint behavior.

Confirm the required behavior is not already satisfied.

## Green

Implement the smallest amount of code required to satisfy the Sprint.

Do not build future capability.

## Refactor

Improve:

- naming
- organization
- clarity
- error handling
- duplication

without increasing scope.

---

# Phase 6 — Architecture Review

After implementation, review the system architecture.

Ask:

- Did provider-specific concepts leak into Combie Core?
- Does the Engineering Model remain provider-independent?
- Did we introduce intelligence where deterministic context was enough?
- Did we accidentally create observability infrastructure?
- Did we introduce future execution capability?
- Did we add speculative abstractions?
- Did we weaken credential boundaries?
- Did we make MCP or another interface part of the core?
- Did we stay within the active Sprint?

Resolve architectural drift before declaring completion.

---

# Phase 7 — Engineering Review

Review implementation quality.

Evaluate:

- readability
- naming
- module boundaries
- error handling
- test quality
- dead code
- duplication
- complexity
- unnecessary dependencies
- hidden state
- performance concerns relevant to the Sprint

Prefer simplification whenever possible.

---

# Phase 8 — Testing

Run focused validation first.

Examples:

- unit tests
- provider adapter tests
- persistence tests
- CLI tests
- integration tests

Then run the full relevant project suite.

All required tests must pass.

Do not hide failing tests.

Do not disable tests merely to make the build green.

---

# Phase 9 — Manual Verification

Perform representative manual verification whenever the Sprint produces user-visible or integration behavior.

Examples:

```text
combie init
combie connect cloudflare
combie sync
combie resources
```

Verify:

- expected workflow succeeds
- errors are understandable
- state persists correctly
- existing behavior remains unchanged
- the Sprint is demonstrable

Automated tests do not replace representative manual verification.

---

# Phase 10 — Documentation Review

Ask:

Did the product change?

Did architecture change?

Did roadmap sequencing change?

If no:

leave canonical docs unchanged.

If yes:

update only the affected canonical document.

Do not create new permanent documentation by default.

---

# Phase 11 — Review the Complete Diff

Review every modified file.

Remove:

- temporary debugging
- abandoned experiments
- unnecessary TODOs
- commented-out code
- unused imports
- unused abstractions
- future-facing placeholders
- dead configuration

The final diff should read like one coherent implementation.

---

# Phase 12 — Commit

Commit only when authorized by repository policy or the user.

Commits should represent meaningful engineering steps.

Prefer messages such as:

```text
feat(provider): add Cloudflare resource discovery
feat(cli): list discovered resources
fix(storage): preserve provider resource identity
```

Avoid generic messages such as:

```text
update
fix
changes
stuff
```

---

# Phase 13 — Push

Push only when:

- repository policy explicitly allows it

or

- the user explicitly requests it

Never assume pushing is desired.

---

# Phase 14 — Verification

After committing or pushing, verify:

- correct repository
- correct branch
- expected commit
- clean working tree
- tests remain passing
- only intended files changed

Report exactly what was completed.

---

# Phase 15 — Sprint Completion

A completed Sprint should record enough implementation context for the next Sprint to begin safely.

Update the Active Sprint with concise completion notes if that is the repository practice.

Do not rewrite historical Sprint intent.

Do not begin the next Sprint.

---

# Phase 16 — Stop

Stop after the active Sprint.

Never:

- partially implement the next Sprint
- create scaffolding for later roadmap versions
- add future providers "while already here"
- build generic systems for hypothetical needs
- introduce autonomous execution early
- silently redesign Combie

One finished vertical slice is better than several partial ones.

---

# Definition of Done

A Sprint is complete only when:

✓ Sprint requirements are satisfied.

✓ Canon remains intact.

✓ Scope remains narrow.

✓ Architecture remains provider-independent.

✓ No speculative future work was introduced.

✓ Tests pass.

✓ Manual verification succeeds where applicable.

✓ Documentation is accurate.

✓ The full diff was reviewed.

✓ Repository state is clean.

Anything less is incomplete.

---

# Engineering Decision Rules

Before implementing anything substantial, ask:

### Product

Does this strengthen Combie's ability to connect, understand, remember, investigate, learn, or act?

Is that capability part of the current roadmap phase?

### Architecture

Does this belong in:

- interface
- Combie Core
- Engineering Model
- provider platform
- adapter
- persistence

Is ownership clear?

### Scope

Does the active Sprint require it?

If not:

do not build it.

### Providers

Is this abstraction based on real provider behavior?

Or are we guessing about future providers?

### AI

Do we need model reasoning?

Or can deterministic context solve it?

### Telemetry

Do we need the raw telemetry?

Or only the engineering meaning and evidence reference?

### Documentation

Did something canonical actually change?

Or can the code and tests remain the source of truth?

---

# Working With AI Coding Agents

AI coding agents are engineering partners.

They are not autonomous product designers.

Agents should:

- understand before implementing
- inspect before assuming
- plan before modifying
- test before claiming completion
- explain architectural uncertainty
- stay inside Sprint scope
- stop when the Sprint is done

Agents should never:

- invent product requirements
- silently change architecture
- implement future roadmap phases
- create speculative abstractions
- harvest credentials
- bypass policy boundaries
- expand documentation unnecessarily

When genuinely uncertain about a canonical architectural conflict:

report it.

Do not guess.

---

# Coding Philosophy

Prefer explicit code over clever code.

Prefer small interfaces over broad frameworks.

Prefer composition.

Prefer predictable data flow.

Prefer typed domain concepts where they remove ambiguity.

Avoid:

- speculative abstractions
- premature optimization
- unnecessary dependencies
- provider-specific core logic
- hidden mutable state
- framework-building without evidence

Code should remain understandable months later.

---

# Dependency Philosophy

New dependencies must justify their cost.

Before adding one, ask:

- Does the standard library already solve this adequately?
- Does the current repository already contain an appropriate dependency?
- Is this dependency maintained?
- Does it materially simplify the active Sprint?
- Does it introduce unnecessary architectural commitment?

Do not add frameworks because they may be useful later.

---

# Error Philosophy

Errors should help humans understand what failed.

Provider errors should preserve useful provider context without leaking secrets.

Prefer:

```text
Cloudflare authentication failed: token lacks Worker read permission
```

over:

```text
request failed
```

But avoid exposing:

- raw credentials
- secrets
- sensitive headers
- tokens

---

# Security Philosophy

Infrastructure credentials are highly sensitive.

Security is not future cleanup.

Always:

- minimize credential exposure
- prefer scoped authorization
- avoid plaintext secrets
- preserve provider permission boundaries
- validate external input
- avoid arbitrary command execution
- maintain auditability for meaningful actions

Convenience must not override trust.

---

# Performance Philosophy

Do not prematurely optimize.

But do not ignore obvious scalability boundaries.

During early versions, prioritize:

- correctness
- clarity
- predictable synchronization
- understandable persistence
- deterministic behavior

Optimize only after measurement or real user need.

---

# Open Source Philosophy

Combie should remain understandable and useful when self-hosted.

Avoid architecture that requires a hosted control plane for basic functionality.

Hosted Combie may provide convenience:

- OAuth
- managed persistence
- durable webhooks
- team access
- hosted intelligence

But the core product model should remain portable.

---

# The Combie Flywheel

The long-term system is:

```text
Connect
   ↓
Discover
   ↓
Relate
   ↓
Observe
   ↓
Remember
   ↓
Investigate
   ↓
Recommend
   ↓
Human Decision
   ↓
Act
   ↓
Verify
   ↓
Outcome
   ↓
Learn
   │
   └──────────────↺
```

Do not attempt to build the whole flywheel at once.

Each roadmap version earns the next capability.

---

# Current Build Strategy

Combie should move through narrow, provider-backed vertical slices.

For early development:

```text
One provider
   ↓
Authentication
   ↓
Discovery
   ↓
Normalized resource
   ↓
Persistence
   ↓
CLI inspection
```

Then add the next provider.

Use each real provider to challenge and improve the Engineering Model.

Do not design for dozens of integrations before the first few are working.

---

# Success Criteria

Every Sprint should improve one of Combie's current roadmap capabilities while preserving the architectural foundation.

A good Sprint:

- solves one clear problem
- is demonstrable
- has a narrow diff
- strengthens real product behavior
- teaches us something about the architecture
- avoids future work
- leaves the repository easier to understand

The goal is not to produce the largest change.

The goal is to produce the smallest valuable learning loop.

---

# Final Principle

Combie should move fast because it stays small.

The Vision defines **why Combie exists**.

The Architecture defines **what must remain true**.

The Roadmap defines **what we prove next**.

The Sprint defines **what we build today**.

The code brings that one slice to life.

Do not predict complexity.

Let real users, real providers, and real implementation pressure reveal it.

> **Connect first. Understand next. Remember what matters. Earn everything after that.**
