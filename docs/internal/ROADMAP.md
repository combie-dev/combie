# Combie — Roadmap

## Roadmap Philosophy

Combie is the open engineering context layer.

It connects a user's engineering stack once, understands the resources and relationships that make up the system, remembers operational evidence over time, compiles the right context for humans and AI agents, supports investigation and organizational learning, and eventually enables controlled execution.

Combie should not begin as an autonomous infrastructure agent.

The product must earn its capabilities in order.

```text
CONNECTION
    ↓
CONTEXT
    ↓
MEMORY
    ↓
AGENT ACCESS
    ↓
CONTEXT ENGINE
    ↓
INVESTIGATION
    ↓
OPERATIONAL MEMORY
    ↓
LEARNING
    ↓
POLICY + CONTROLLED EXECUTION
    ↓
PLATFORM
````

The guiding principles are:

> **Intelligence follows understanding. Execution follows trust.**

> **Combie should not maximize context. It should maximize useful context per unit of attention.**

The sequence matters because every later capability depends on the trustworthiness of the layers beneath it.

Combie should first know what exists, then how it relates, then what happened, then expose and compile that knowledge for intelligence, then help investigate, then remember decisions and outcomes, then learn from them, and only then act.

The roadmap is directional, not authorization to build future layers early.

Real product pressure, dogfood, closed-beta evidence, and evaluation results should determine when each capability is earned.

---

# Product Model

Combie should evolve toward this architecture:

```text
                  ENGINEERING SYSTEMS
 GitHub · Vercel · Cloudflare · Sentry · Databases · CI · Deploys
                         │
                         ▼
                  INGESTION LAYER
                         │
                         ▼
                  RESOURCE GRAPH
             what exists + how it relates
                         │
                         ▼
                   EVIDENCE LAYER
             what changed + what happened
                         │
                         ▼
                   CONTEXT ENGINE
          what matters for the task at hand
                         │
                         ▼
                OPERATIONAL MEMORY
       incidents · decisions · actions · outcomes
                         │
                         ▼
                  AGENT INTERFACE
                 MCP · API · SDK
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
            Codex      ChatGPT     Humans
                         │
                         ▼
                POLICY + EXECUTION
```

Provider integrations are inputs to Combie.

They are not the product boundary.

Over time, provider resources should become evidence describing a broader engineering system rather than defining the system themselves.

---

# v0.1 — Connection

## Goal

Prove that Combie can connect a real engineering stack and accurately understand what resources exist.

## Product Question

> Can Combie reliably connect modern engineering providers and produce a trustworthy inventory of the user's engineering system?

## Initial Provider Strategy

Start with providers common in modern startup engineering stacks.

Examples:

* GitHub
* Cloudflare
* Vercel
* Sentry
* Neon
* PlanetScale
* Railway / Render / Fly.io as demand earns them

Provider count is not the primary success metric.

Depth, correctness, and usefulness matter more than checklist coverage.

## Capabilities

Build:

* project initialization
* provider registry
* provider authentication
* secure credential references
* provider capability declarations
* resource discovery
* synchronization
* normalized Resource model
* local persistence
* provider metadata
* CLI
* deterministic provider status
* safe error handling
* secret-safe output

## CLI

```bash
combie init

combie connect github
combie connect cloudflare
combie connect vercel
combie connect sentry

combie providers
combie resources
combie sync
```

## Explicitly Not Included

* AI reasoning
* autonomous behavior
* learning
* execution
* raw telemetry storage
* complex control-plane UI

## Success Condition

Combie can connect a real engineering stack and accurately inventory its engineering resources.

---

# v0.2 — Context

## Goal

Build the Engineering Graph and begin resolving the engineering system behind provider-specific resources.

## Product Question

> Can Combie understand how resources from different providers relate to one another without inventing relationships it cannot prove?

## Capabilities

Add or deepen:

* Relationship model
* relationship provenance
* deterministic relationship discovery
* exact cross-provider identity matching
* graph queries
* related-resource queries
* bounded graph traversal
* application/service grouping when earned
* environment modeling when earned
* user-defined relationship overrides
* candidate relationship confirmation when exact matching is insufficient

## Identity Resolution

Identity resolution becomes increasingly important as Combie grows.

The first strategy should remain deterministic.

Useful identity evidence may include:

* provider resource IDs
* repository identity
* Git commit SHA
* deployment source
* domains
* provider configuration references
* package metadata
* environment metadata
* service metadata

Later, Combie may surface candidate relationships for human confirmation.

Candidate identity must remain distinguishable from proven identity.

## Engineering Ontology

Over time, Combie should understand conceptual engineering entities such as:

* Organization
* Application
* Service
* Environment
* Repository
* Deployment
* Database
* Queue
* Domain
* Workflow
* Incident
* Decision
* Action
* Outcome

The ontology should emerge from product pressure rather than be designed speculatively.

A provider object is evidence about an engineering system; it is not necessarily the top-level engineering concept.

## Example

```text
checkout
├── service → checkout-api
│   ├── source → github/acme/checkout
│   ├── deploy → vercel/checkout
│   ├── domain → cloudflare/checkout.example.com
│   └── errors → sentry/checkout-production
└── environment → production
```

## Success Condition

Users recognize Combie's graph as a credible representation of their engineering system.

This is where Combie becomes more than a generic integration layer.

---

# v0.3 — Memory

## Goal

Understand what Combie has observed across the Engineering Graph over time.

## Product Question

> Can Combie reconstruct meaningful engineering history while preserving what was observed, when it was observed, and how trustworthy that evidence currently is?

## Capabilities

Add or deepen:

* Change model
* provider-native evidence
* deployment history
* workflow-run history
* database operation history
* provider event ingestion where useful
* periodic synchronization when earned
* webhook ingestion when earned
* timeline reconstruction
* resource history
* evidence provenance
* refresh authority
* last-attempt observation time
* last-success observation time
* retained evidence semantics
* known-empty vs unknown semantics
* operational memory foundation

## Freshness and Authority

Every important piece of operational context should eventually be able to answer:

```text
What does Combie know?
Where did it come from?
When did Combie observe it?
When did Combie last successfully verify it?
Did the latest retrieval succeed?
Could retained information now be stale?
```

Combie must distinguish:

* current known evidence
* known empty state
* unknown authority
* not-applicable evidence
* retained historical evidence
* provider-native event time
* Combie observation time

These clocks and meanings must not be silently collapsed.

Shipped for provider-native evidence families (Vercel deployments, GitHub workflow runs, Neon operations, Sentry releases and issues, Sentry code-mapping refresh): latest-attempt vs last-success observation time, known-empty vs unknown, retained stale rows, dual chronologies.

Sprint 079 shipped Resource CURRENT observation clocks and provider last-attempt vs last-success. Remaining v0.3 surface is Relationship currency. That is not the next implementation sequence — shell-native `--json` on MCP-parity CLI reads is.

## Example Timeline

```text
10:42 GitHub PR #391 merged
10:44 deployment started
10:47 deployment completed
10:51 Sentry errors increased
10:52 Combie observed the affected service state
```

## Success Condition

Combie can accurately reconstruct significant operational history across providers without confusing retained evidence with current provider truth.

## MVP Foundation

At this stage, Combie should already provide standalone value without requiring AI.

The product can:

```text
Connect
Understand
Remember
```

A user can connect a real engineering stack and inspect trustworthy resources, relationships, evidence, and history.

---

# v0.4 — Agent Access

## Goal

Make Combie's deterministic engineering context available to external AI agents through a stable, safe interface.

## Product Question

> Can an external agent reason more effectively about an engineering system through Combie than through isolated provider integrations?

## Capabilities

Add or deepen:

* read-only MCP server
* agent-facing query tools
* structured outputs
* provenance-preserving responses
* safe agent discovery
* guided agent configuration
* CLI + MCP parity for core read surfaces
* API foundation when product pressure earns it
* external agent validation
* agent-facing documentation

## External Agent Experience

```text
Codex / Cursor / Claude / ChatGPT
              │
             MCP
              ↓
           Combie
              ↓
Engineering Graph + Memory
```

The external agent may supply the intelligence.

Combie does not need to own the model in order to provide valuable engineering context.

## Initial Agent Boundary

The first agent interface should remain read-only.

Useful surfaces include:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

Connect, sync, credential management, and infrastructure writes should remain outside the initial MCP boundary.

The CLI remains the primary composable primitive. MCP already returns structured JSON from those four tools over the same application core. CLI reads still render human tables by default. Structured `--json` on the four MCP-parity CLI reads is the next sequence item after Sprint 079; do not add `--limit`, `--since`, `--offline`, or `--refresh` flags merely to complete a composition checklist. Refresh is `sync`. Reads are already offline.

## BYO Models

Bring-your-own-model support may eventually include:

* OpenAI
* Anthropic
* Gemini
* OpenRouter
* Ollama
* OpenAI-compatible endpoints

But BYO model support is not required for Combie to be useful to external agents.

## Success Condition

An external agent can answer real engineering questions more effectively because Combie supplies cross-provider, provenance-backed context.

---

# v0.5 — Context Engine

## Goal

Turn Combie's Engineering Graph and Memory into the smallest trustworthy context required for a specific engineering task.

## Product Question

> Can Combie determine what context matters for a task, assemble it with provenance, identify what is missing, and expose deeper evidence progressively without overwhelming the consumer?

This is the layer where Combie evolves from an engineering graph that agents can query into a context compiler for engineering intelligence.

## Context Compilation

```text
Task / Question
      ↓
Subject Resolution
      ↓
Engineering Graph
      +
Memory / Evidence
      ↓
Context Selection
      ↓
Context Budget
      ↓
Context Pack
      ↓
Human / Agent
```

## Context Pack

A Context Pack is a bounded, task-relevant, provenance-backed projection of Combie's knowledge.

A pack may contain:

```text
SUBJECT

KNOWN FACTS

RELEVANT RESOURCES

RELATIONSHIPS

RECENT CHANGES

PROVIDER ACTIVITY

SHARED CONTEXT

HISTORICAL CONTEXT

MISSING CONTEXT

PROVENANCE

AVAILABLE ON DEMAND
```

The exact schema should be earned through product use.

Do not create a generic ContextPack abstraction before repeated task pressure proves the boundary.

## Capabilities

Add or deepen:

* task-aware retrieval
* subject/entity resolution
* bounded graph expansion
* deterministic context selection
* context prioritization without hidden significance scoring
* context budgeting
* progressive context disclosure
* evidence freshness and authority
* Missing Context as a first-class output
* provenance-preserving compression
* deterministic Known Facts
* exact cross-provider shared evidence
* on-demand detailed evidence
* context evaluation suite
* agent task-success evaluations

## Task-Aware Retrieval

Different tasks require different slices of the engineering system.

Examples:

```text
"Fix this bug"
→ repository + changes + workflows + deployments + errors

"Why is production slow?"
→ service + deployments + database + metrics + traces

"Can I delete this worker?"
→ dependencies + domains + callers + history

"How does authentication work?"
→ repositories + services + configuration + architecture history
```

Combie should eventually choose a retrieval strategy based on the task rather than returning the entire graph.

## Context Budgeting

More context is not automatically better.

Combie should eventually support bounded context such as:

```text
MUST INCLUDE
SUPPORTING
HISTORICAL
AVAILABLE ON DEMAND
```

This enables progressive context disclosure.

For example:

```text
Level 1
subject + critical relationships + recent changes

Level 2
provider evidence

Level 3
historical incidents and decisions

Level 4
raw detailed evidence
```

## Missing Context

Combie should understand not only what it knows, but where its knowledge stops.

Example:

```text
Known:
✓ repository
✓ deployment
✓ commit
✓ workflow
✓ domain

Missing or untrusted:
✕ production errors
✕ database operations
✕ service logs
```

Eventually Combie may explain which additional context source could close a gap, but it should not pretend missing evidence exists.

## Safe Semantic Boundary

Context compilation must not silently become causal reasoning.

Combie may say:

> These provider evidence records reference the same exact Git commit within an already-proven resource relationship.

It must not silently upgrade that into:

> This workflow caused this deployment.

Context compilation organizes evidence.

Investigation interprets evidence.

## Success Condition

Humans and agents receive a compact, trustworthy context package that materially reduces manual navigation across engineering systems.

---

# v0.6 — Investigation

## Goal

Turn compiled context and memory into evidence-backed operational investigations.

## Product Question

> Can Combie help explain what is happening and why while preserving the boundary between evidence, hypothesis, and conclusion?

## Investigation Flow

```text
Signal
   ↓
Subject Resolution
   ↓
Context Pack
   ↓
Affected Resources
   ↓
Graph Expansion
   ↓
Recent Changes
   ↓
External Evidence
   ↓
Historical Memory
   ↓
Hypotheses
   ↓
Findings
```

## Capabilities

Add when earned:

* Investigation object
* Investigation lifecycle
* Investigation Engine
* context-pack consumption
* evidence collection
* bounded graph traversal
* historical retrieval
* telemetry query adapters
* hypotheses
* evidence-backed confidence
* investigation summaries
* investigation persistence
* notifications
* optional Combie-managed model reasoning

## Deterministic Investigation Foundation

Deterministic investigation remains valuable even before model reasoning.

Useful primitives include:

* Known Facts
* Missing Context
* one-hop related context
* dual chronologies
* provider-native evidence
* authority semantics
* exact shared-commit context
* complete detailed evidence

These should remain trustworthy foundations rather than being replaced by a generic reasoning engine.

Large evidence sets should not be pushed wholesale through an agent context window. Artifact-backed investigation (compact summary, bounded preview, location of the complete local artifact, record count, schema version, content hash, follow-up retrieval) is later in the post-078 sequence. Reuse the Sprint 048 `investigations.snapshot_json` row. Do not invent a generic artifact framework, ContextPack, or fifth MCP tool.

## Telemetry

Combie may query systems such as:

* Sentry
* Datadog
* Prometheus
* Grafana
* provider-native metrics
* logs and traces through their owning systems

Combie should not become a general raw telemetry datastore.

## Success Condition

Combie produces useful, evidence-backed investigations that require information from more than one provider and clearly separate evidence from interpretation.

---

# v0.7 — Operational Memory

## Goal

Turn investigations, recommendations, human decisions, actions, and outcomes into durable organizational knowledge.

## Product Question

> Can Combie remember not only what happened, but how this engineering organization responded and what happened afterward?

## Memory Model

```text
Incident
   ↓
Evidence
   ↓
Investigation
   ↓
Recommendation
   ↓
Human Decision
   ↓
Action
   ↓
Outcome
```

## Capabilities

Add:

* Incident model
* Investigation memory
* Decision model
* Recommendation model
* Action record model
* Outcome model
* evidence retention
* historical incident retrieval
* similarity search
* incident linking
* memory summaries
* resource-specific experience
* organizational precedent retrieval

## Example Memory

```text
Incident:
Production API error spike

Evidence:
Sentry issue
deployment
workflow run
Git commit

Investigation:
Session validation regression

Recommendation:
Rollback

Decision:
Approved

Action:
Rollback deployment

Outcome:
Error rate returned to baseline in four minutes
```

Decision, Action, and Outcome records should capture information that cannot reliably be reconstructed from the authoritative systems alone. Resource observation and Relationship evidence are not operational memory. A retained Investigation snapshot is frozen composition, not an Incident.

## Product Value

Operational Memory allows Combie to answer more than:

> Has this happened before?

It should eventually answer:

> What did we decide last time?

> What action did we take?

> Did it work?

> What evidence supported that decision?

## Success Condition

Historical operational knowledge measurably improves future investigations and decisions.

---

# v0.8 — Learning

## Goal

Use historical decisions and outcomes to improve future retrieval, recommendations, and operational guidance.

## Product Question

> Can Combie become more useful because it remembers how this specific engineering system and organization behave?

## Capabilities

Add:

* experience retrieval
* precedent retrieval
* pattern detection
* recommendation ranking
* historical success evidence
* user/team preference memory
* approved/rejected recommendation history
* action success history
* outcome scoring
* learned operational precedents
* transparent explanation of why prior experience is relevant

## Learning Model

```text
Recommendation
      ↓
Human Decision
      ↓
Action
      ↓
Outcome
      ↓
Experience
      ↓
Future Retrieval / Recommendation
```

No continuous model fine-tuning is required.

The first learning system should be transparent, inspectable, and grounded in stored outcomes.

## Example

```text
Similar incidents: 6

Previous responses:
rollback deployment → 5
database investigation → 1

Observed outcomes:
rollback restored baseline → 5/5

Relevant precedent:
incident-81

Recommendation:
consider rollback of latest deployment
```

Learning must not erase uncertainty or provenance.

## Success Condition

Users can observe that Combie becomes more useful because it has learned from the history of their own engineering system.

---

# v0.9 — Policy + Controlled Execution

## Goal

Allow Combie to understand operational policy and safely execute a small number of typed, approved actions.

## Product Question

> Can Combie determine what is allowed, obtain the required approval, perform a bounded operation, and verify the result?

Policy should precede meaningful execution.

## Operational Model

```text
STATE
What exists?
   ↓
HISTORY
What happened?
   ↓
POLICY
What are we allowed to do?
   ↓
PLAN
What should happen?
   ↓
APPROVAL
May we do it?
   ↓
ACTION
Execute typed capability
   ↓
VERIFY
Did it work?
```

## Policy as Context

Combie should eventually understand operational constraints such as:

```text
production deploys require approval
database migrations require review
production databases cannot be restarted automatically
preview deployments may be deleted
rollback is allowed only to an approved healthy deployment
```

Policy is useful to agents even before execution is enabled.

## Capabilities

Add:

* operational policy model
* action capability declarations
* resource/action permissions
* Policy / Approval Engine
* human approval workflows
* risk classification
* typed provider actions
* dry-run support where providers allow it
* action audit trail
* outcome verification
* rollback semantics where possible

## Initial Actions

Keep the set deliberately small.

Candidates:

* rollback deployment
* redeploy
* restart service
* invalidate cache
* acknowledge incident

## Capability Model

```text
READ
OBSERVE
QUERY
PLAN
APPROVE
EXECUTE
VERIFY
```

## Default Rule

> Human approval is required for meaningful infrastructure changes.

## Success Condition

Combie safely performs a limited number of well-defined operations under explicit policy and verifies whether they produced the intended outcome.

---

# Platform — Extensibility

Platform work should emerge as the product contracts stabilize rather than forcing premature abstractions into early versions.

## Goal

Make Combie extensible beyond first-party provider development.

## Product Question

> Can developers outside the core project extend Combie without modifying Combie Core?

## Capabilities

Add when contracts are proven:

* Provider SDK
* provider templates
* capability contracts
* custom resource types
* custom relationship resolvers
* custom evidence sources
* custom context contributors
* custom actions
* provider testing framework
* compatibility/versioning model
* documentation for community adapters

## Developer Experience

Potential workflow:

```bash
combie provider new
combie provider test
combie provider validate
combie provider publish
```

## Success Condition

A third-party developer can build and distribute a useful provider adapter using documented stable contracts without weakening Combie's core semantics.

---

# v1.0 — Engineering Context Layer

## Goal

Deliver the complete Combie product loop.

## Product Question

> Can Combie serve as the durable engineering context layer through which humans and AI agents understand, investigate, remember, learn from, and safely operate an engineering system?

## Complete Loop

```text
CONNECT
   ↓
DISCOVER
   ↓
IDENTIFY
   ↓
RELATE
   ↓
OBSERVE
   ↓
REMEMBER
   ↓
EXPOSE
   ↓
COMPILE CONTEXT
   ↓
INVESTIGATE
   ↓
RECALL
   ↓
LEARN
   ↓
RECOMMEND
   ↓
CHECK POLICY
   ↓
APPROVE
   ↓
ACT
   ↓
VERIFY
   │
   └────────────────↺
```

## v1.0 Capabilities

Combie should be able to:

* connect several engineering providers
* discover and normalize resources
* resolve trustworthy cross-provider identities
* build an Engineering Graph
* preserve relationship provenance
* record meaningful operational evidence and history
* distinguish current authority from retained history
* expose deterministic context through CLI/API/MCP/SDK
* integrate with external AI agents
* compile task-relevant Context Packs
* identify missing or untrusted context
* budget and progressively disclose context
* investigate cross-provider incidents
* use telemetry as evidence without replacing telemetry systems
* preserve investigations and outcomes
* recall organizational precedents
* learn from previous decisions and outcomes
* understand operational policy
* recommend bounded next actions
* execute a limited set of approved operations
* verify outcomes
* support third-party providers and context contributors

## v1.0 Product Promise

> **Connect your engineering stack once.**
>
> Combie gives humans and AI agents a shared, trustworthy understanding of your engineering system — what exists, how it relates, what changed, what matters for the task at hand, what happened before, and what can safely happen next.

---

# Context as the Product Boundary

Combie should not become a collection of provider wrappers.

The long-term product boundary is:

> **Combie compiles fragmented engineering state into trustworthy, task-relevant context for humans and AI agents.**

Individual provider MCP servers can expose provider data.

Combie should provide what isolated integrations cannot easily provide:

* cross-provider identity
* cross-provider relationships
* operational history
* freshness and authority
* missing-context awareness
* organizational memory
* task-aware retrieval
* policy
* learned precedent

That is the durable differentiation.

---

# Evaluation Strategy

Evaluation should become a first-class product capability as Combie moves from deterministic retrieval into context compilation, investigation, learning, and execution.

The evaluation ladder is:

```text
Provider Correctness
        ↓
Relationship Correctness
        ↓
Evidence / Freshness Correctness
        ↓
Context Correctness
        ↓
Retrieval Quality
        ↓
Agent Task Success
        ↓
Investigation Quality
        ↓
Recommendation Quality
        ↓
Execution Safety
```

## Context Evaluations

Measure:

* relationship precision
* relationship recall where ground truth exists
* provenance correctness
* freshness correctness
* authority correctness
* Missing Context accuracy
* retrieval precision
* retrieval recall
* context completeness
* token/context efficiency
* deterministic output stability

## Agent Evaluations

Example questions:

```text
"What deployment contains commit abc123?"

"What changed before this Sentry issue?"

"What database belongs to checkout?"

"What context is missing before this incident can be investigated?"

"Has this happened before, and what did the team do?"
```

Evaluate whether the agent:

* retrieves the correct evidence
* uses the correct relationships
* preserves uncertainty
* avoids unsupported causal claims
* identifies missing context
* completes the engineering task
* uses less context than naïve provider dumping

## Later Evaluations

As Combie gains intelligence:

* investigation grounding
* hypothesis quality
* precedent relevance
* recommendation quality
* policy compliance
* approval correctness
* execution safety
* outcome verification

Unit tests remain necessary.

They are not sufficient for evaluating an engineering context system.

---

# Provider Expansion Strategy

Provider count should not be treated as the primary success metric.

Expansion should follow validated user demand and context value.

## Current / Early

Prioritize providers that help Combie understand a modern application's source, deployment, infrastructure, errors, and data layer.

Examples:

* GitHub
* Cloudflare
* Vercel
* Sentry
* Neon
* PlanetScale

## Next

Potential additions should be chosen because they close repeated context gaps.

Examples:

* Railway
* Render
* Fly.io
* Supabase
* Better Stack
* Grafana Cloud
* Datadog
* Prometheus
* Slack

## Later

Large infrastructure ecosystems:

* AWS
* GCP
* Azure
* Kubernetes
* Terraform / OpenTofu

The core model must be proven before Combie absorbs the complexity of hyperscale providers.

A new provider should ideally answer a repeated question that Combie currently cannot answer.

---

# What Combie Should Not Build During the Early Product

To prevent scope expansion, the following should remain out of scope until product pressure earns them:

* general-purpose observability datastore
* log indexing platform
* full distributed tracing backend
* metrics database
* generic workflow automation engine
* autonomous unrestricted infrastructure agent
* replacement for Terraform
* replacement for Kubernetes
* replacement for Sentry or Datadog
* large dashboard-heavy control plane
* proprietary model training infrastructure
* generic Event abstraction without proven need
* generic Observation engine without proven need
* generic Correlation engine without proven need
* hidden significance or attention scoring
* speculative relationship types
* speculative application ontology
* durable associations for relationships that can be derived safely
* broad write-enabled MCP before policy and approval semantics exist

Combie integrates with these systems rather than replacing them.

---

# Product Validation Thresholds

Version numbers are milestones, not the strategy.

The capabilities matter more than forcing implementation to match a version label exactly.

## Foundation

Combie can:

```text
Connect
Understand
Remember
```

A user can connect a real engineering stack and inspect trustworthy resources, relationships, evidence, and history without AI.

## Agent-Useful Product

Combie can:

```text
Connect
Understand
Remember
Expose Context
```

An external agent can use Combie as a trustworthy read-only context source rather than integrating separately with every provider.

## Context-Intelligent Product

Combie can:

```text
Connect
Understand
Remember
Expose
Compile
Investigate
```

Combie can select and assemble the context relevant to a task, identify missing context, and support evidence-backed investigation.

## Durable Moat

Everything after this deepens the system-specific advantage:

```text
Operational Memory
Learning
Policy
Controlled Execution
Platform Ecosystem
```

---

# Closed-Beta Principle

Closed beta is not a pause before the roadmap continues.

Closed beta is evidence that determines which roadmap branch deserves to move next.

Potential post-beta pressure may point toward:

```text
                     Combie
                        │
                Closed-beta evidence
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     users need     agents need    investigations
     better system  better context  lack evidence
     identity            │             │
          │              │             │
          ▼              ▼             ▼
      Ontology       Context Engine   Telemetry /
      + Identity     + Context Packs   Provider Depth
```

Do not predetermine the branch.

Build the smallest next capability justified by repeated real-world friction.

---

# Next Work Sequence (post-Sprint 079)

Sprints 001–079 shipped the local multi-provider foundation, deterministic Investigation (v0.6 closed), the smallest v0.7 capture slices (Resolution, Incident grouping, recall, named clocks), and Resource CURRENT observation clocks (provider last-attempt vs last-success).

Sprint 078 leftovers are **not a sequence** and remain frozen until separately earned:

- grouping Investigation snapshots as Incident members (`inv:` as members; Investigation ≠ Incident)
- fifth MCP tool / `list_investigations` / `get_investigation`
- Investigation lifecycle
- `--occurred-at` on Incident create
- inferred Action from provider activity
- Recommendation, Learning, similarity

Sprint 079 leftover is **not a sequence**. Source authority on Resource CURRENT is shipped. Relationship currency remains later. Artifact-backed investigation and a composition-oriented agent skill depend on shell-native `--json` existing first so agents can compose without scraping human tables.

Minimum correctly ordered work:

```text
1. Source authority and freshness              ← shipped Sprint 079
   smallest: Resource CURRENT observation clocks + provider last-attempt vs last-success
   not: generic Observation type, Relationship verification clocks, populated-membership id sets

2. Shell-native CLI contract                   ← next (Sprint 080)
   smallest: `--json` on MCP-parity read commands over existing composers
   not: `--limit` / time filters / `--output` / `--offline` / `--refresh` as synonyms
   not: a fifth MCP tool
   not: `--json` on writes or on non-MCP CLI commands in this slice

3. Artifact-backed investigation
   smallest: treat existing `investigations.snapshot_json` as the complete local artifact
            (handle, hash/counts/location); thin MCP named-id dumps later
   not: a generic artifact framework, ContextPack, or fifth snapshot tool

4. Composition-oriented agent skill
   `skills/combie/SKILL.md` teaching the six-step investigate → freshness →
   scoped sync → local filter → deeper evidence → cite loop
   not: a large collection of narrow tools
   not: describing unshipped behavior in `skills/build-combie/SKILL.md`

5. Operational-memory behavior only when evidence authorizes it
   078 leftovers stay frozen
   content boundary is an invariant, not a validator sprint
```

Do not skip ahead. Do not reopen completed sprints.

---

# Sequencing Rules

Before starting a major roadmap layer, ask:

1. What repeated user or agent friction proves this capability is needed?
2. Can the problem be solved with an existing primitive?
3. What is the smallest deterministic version?
4. What new semantic claim would the feature introduce?
5. Can Combie prove that claim?
6. Does the feature preserve provenance?
7. Does it preserve unknown and stale states?
8. Does it create a second source of truth?
9. Is persistence actually necessary?
10. Is the abstraction earned by more than one concrete use case?
11. How will the capability be evaluated?
12. What must explicitly remain out of scope?

Prefer:

```text
exact evidence
    ↓
deterministic composition
    ↓
real product pressure
    ↓
earned abstraction
```

over:

```text
future architecture guess
    ↓
generic engine
    ↓
complexity
    ↓
search for a use case
```

---

# Final Roadmap Principle

Combie should never rush toward autonomy.

The sequence matters.

```text
First know what exists.

Then know what it is.

Then know how it relates.

Then know what happened.

Then know what is trustworthy.

Then expose that context.

Then compile what matters.

Then help investigate.

Then remember what people decided.

Then learn from the outcome.

Then understand what is allowed.

Only then act.

Then verify.
```

Or, more compactly:

> **Connect → Understand → Remember → Expose → Compile → Investigate → Recall → Learn → Govern → Act.**

Combie's long-term advantage is not that it can call every engineering API.

It is that it can turn fragmented engineering systems into durable, provenance-backed, task-relevant context for humans and AI agents — and eventually use that understanding to help teams act safely.
