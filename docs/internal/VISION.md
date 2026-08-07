# Combie — Vision

## What Combie Is

Combie is the open engineering context layer that connects an engineering stack once, understands how its parts fit together, remembers what happens across them, and gives humans and AI agents a shared interface to investigate and safely operate that infrastructure.

Today, engineering systems are fragmented across providers.

A single application might depend on:

- GitHub for source code
- Vercel for frontend deployments
- Cloudflare for Workers, DNS, D1, KV, and edge infrastructure
- Railway for backend services and databases
- Sentry for errors and incidents
- Datadog, Prometheus, or Maple for telemetry
- Slack for team communication

Each provider understands its own piece of the system.

What is usually missing is the layer that understands:

> These resources belong to the same application.  
> This deployment changed that service.  
> These errors started after that deployment.  
> This incident happened before.  
> This team investigated it in this way.  
> This action solved it.  
> Here is what usually works when this pattern appears again.

Combie exists to create that shared understanding.

---

## Product Thesis

> **Connect your engineering stack once.**

Combie discovers resources, determines relationships between them, observes meaningful changes, builds operational memory, and exposes that context through interfaces humans and agents already use.

Combie is not primarily an AI agent.

Combie is not primarily an MCP gateway.

Combie is not an observability database.

Combie is the durable engineering context underneath those interfaces.

The system should remain valuable without AI.

Users should be able to inspect resources, relationships, changes, timelines, and memory deterministically. AI becomes an optional reasoning layer over that foundation.

---

## The Core Product Loop

Combie develops through six core capabilities:

```text
CONNECT
   ↓
UNDERSTAND
   ↓
REMEMBER
   ↓
INVESTIGATE
   ↓
LEARN
   ↓
ACT
   │
   └──────────────↺
```

### 1. Connect

Users connect the engineering providers they already use.

Combie handles:

- authentication
- capability discovery
- resource discovery
- event ingestion
- synchronization
- provider-specific queries

The initial provider strategy should focus on modern startup infrastructure rather than hyperscalers.

Early targets:

- GitHub
- Cloudflare
- Vercel
- Sentry
- Railway, Render, or Fly.io
- Slack

AWS, Azure, GCP, Kubernetes, Datadog, Terraform, and other large ecosystems come after the core model is validated.

---

### 2. Understand

Combie normalizes provider-specific resources into a shared engineering model and determines how those resources relate.

Example:

```text
GitHub repository
       ↓ deploys
Vercel project
       ↓ serves
production-web
       ↓ domain
Cloudflare zone
       ↓ reports errors to
Sentry project
```

This produces the **Engineering Graph**.

The graph is one of Combie's most important product assets.

Combie should understand that multiple provider resources may collectively represent one application, service, environment, or dependency.

---

### 3. Remember

Combie persists meaningful operational history.

It does not need to store every raw log line, span, or metric point.

Instead, Combie stores the engineering meaning extracted from those systems.

Core memory objects may include:

- Resource
- Relationship
- Observation
- Change
- Deployment
- Alert
- Incident
- Investigation
- Hypothesis
- Recommendation
- Decision
- Action
- Outcome
- Evidence

This forms **Operational Memory**.

The goal is not simply historical storage.

The goal is to preserve the knowledge required to understand what happened, why it mattered, how people responded, and whether the response worked.

---

### 4. Investigate

Combie can combine:

- current resource state
- the Engineering Graph
- recent changes
- historical memory
- provider events
- external telemetry
- previous incidents and outcomes

to answer questions such as:

- What changed?
- What broke?
- Which resources are affected?
- What happened immediately beforehand?
- Did this happen before?
- How was it resolved previously?
- What evidence supports this hypothesis?

External telemetry systems are evidence sources.

Combie may query systems such as Sentry, Maple, Datadog, Prometheus, or OpenTelemetry-backed platforms during an investigation without becoming the primary telemetry datastore itself.

The guiding rule is:

> **Store the engineering meaning; reference the raw evidence.**

---

### 5. Learn

Combie should improve as it accumulates experience.

This does not initially mean continuously retraining an AI model.

Instead, Combie learns through structured operational memory.

```text
Recommendation
      ↓
Human decision
      ↓
Action
      ↓
Outcome
      ↓
Experience
      ↓
Future retrieval and scoring
```

Combie can learn from:

- approved recommendations
- rejected recommendations
- modified recommendations
- successful actions
- failed actions
- recurring incident patterns
- resource-specific behavior
- team preferences

For example:

```text
Pattern detected

Similar incidents: 6

Previous responses:
├── rollback deployment → 5
└── investigate database → 1

Successful outcomes:
├── rollback → 5/5
└── database investigation → unrelated
```

Combie can use that experience to produce better future recommendations.

The operational memory belongs to Combie.

The reasoning model does not.

This keeps Combie model-independent.

---

### 6. Act

Controlled execution comes after Combie has earned trust.

The default model should be:

```text
Combie proposes
        ↓
Human reviews
        ↓
Human approves
        ↓
Combie executes
        ↓
Combie verifies
        ↓
Outcome becomes memory
```

Combie should expose explicit provider capabilities such as:

```text
READ
OBSERVE
QUERY
PLAN
EXECUTE
```

Actions should be narrowly defined, auditable, permission-aware, reversible where possible, and verified after execution.

Human approval should remain the default for meaningful infrastructure changes.

---

# Who Combie Is For

Combie is primarily for engineers and teams whose applications span several modern engineering providers.

The initial audience is likely:

- startups
- small engineering teams
- platform engineers
- infrastructure engineers
- AI-native engineering teams
- developers using agents such as Cursor, Codex, Claude Code, or similar tools

Combie should be especially useful when the team's engineering system is distributed across several specialized providers rather than concentrated inside one hyperscaler.

---

# The Agent Model

Combie should not require users to reorganize their AI stack.

A user may:

1. use the AI agent they already have,
2. bring their own model API key,
3. run a local model,
4. eventually use a hosted Combie-provided model.

## Existing Agent

If the user already uses Cursor, Codex, Claude Code, or another compatible agent, Combie should integrate as a context and tool provider.

```text
Cursor / Codex / Claude
          │
          │ MCP / API / SDK
          ↓
      Combie
          │
          ├── Engineering Graph
          ├── Operational Memory
          ├── Provider Context
          └── Investigation Evidence
```

The external agent continues using its own configured models and credentials.

Combie does not need the user's OpenAI, Anthropic, or other model key.

---

## Bring Your Own Model

Users who want Combie itself to perform reasoning can configure a model provider.

Potential providers include:

- OpenAI
- Anthropic
- Gemini
- OpenRouter
- Ollama
- custom OpenAI-compatible endpoints

Credentials should be explicitly authorized and stored using secure operating-system credential stores where possible.

Combie may detect that a compatible environment variable exists, but it should not silently scan a user's filesystem for credentials.

The principle is:

> **Detect capability. Request permission. Use the secret.**

Combie should never silently harvest credentials.

---

# Product Interfaces

Combie should expose the engineering system through interfaces users already understand.

Primary interfaces:

- CLI
- MCP
- API
- SDK
- Slack

A web application may exist later, but it should not be required to prove the product.

The CLI should remain a first-class interface.

Example:

```bash
combie init
combie connect github
combie connect cloudflare
combie connect vercel
combie connect sentry

combie resources
combie graph
combie timeline production-api
combie memory production-api
combie investigate production-api
combie ask "what changed before yesterday's outage?"
```

---

# Open Source and Hosted

Combie should support two natural deployment modes.

## Open Source

Users can run Combie themselves.

They bring:

- their own infrastructure credentials
- their own storage
- their own AI agent or model provider
- their own operational memory

This mode should be local-first and transparent.

## Combie Cloud

A hosted version may provide:

- managed persistence
- managed event ingestion
- OAuth connections
- hosted memory
- team access
- Slack integration
- hosted investigations
- optional hosted AI inference

The hosted service should be an operational convenience layer over the same underlying product model rather than a fundamentally different product.

---

# Hard Product Boundaries

## Combie is not an observability platform

Combie may consume telemetry, query telemetry systems, and normalize important signals.

It should not initially compete with:

- Datadog
- Maple
- Sentry
- Grafana
- Honeycomb
- other telemetry databases

Combie uses telemetry as evidence for understanding the engineering system.

---

## Combie is not an AI model

Combie owns:

- engineering context
- relationships
- memory
- evidence
- decisions
- actions
- outcomes

Models reason over that context.

Combie should remain model-independent.

---

## Combie is not an infrastructure abstraction layer

Cloudflare remains Cloudflare.

Vercel remains Vercel.

Railway remains Railway.

Kubernetes remains Kubernetes.

Combie should normalize enough information to understand relationships without pretending every provider exposes identical concepts or capabilities.

---

## Combie does not replace the engineering stack

> **Combie does not replace the engineering stack. Combie understands the engineering stack.**

Providers remain systems of record for the capabilities they own.

Combie connects their information into shared operational understanding.

---

# Product Principles

### Connect Once

Users should not have to configure every AI agent independently against every engineering provider.

### Context Before Intelligence

AI reasoning should sit on top of deterministic resource relationships, state, and memory.

### Memory Is Operational Knowledge

Combie should remember decisions and outcomes, not merely retain raw events.

### Evidence Before Conclusions

Investigations should expose the evidence that supports their conclusions.

### Human Authority

Users remain responsible for meaningful operational decisions.

### Execution Follows Trust

Read and understand first. Recommend next. Execute last.

### Open Interfaces

MCP should be supported, but MCP must not become the internal architecture.

### Model Independence

Combie should work with external agents, hosted models, BYO model providers, and local models.

---

# The Long-Term Vision

A mature Combie installation should allow an engineer or agent to ask:

> What is running in production?

> What changed before this incident?

> Which providers and resources make up this application?

> Have we seen this failure pattern before?

> How did we resolve it last time?

> What action would you recommend?

> What evidence supports that recommendation?

> Execute the approved rollback and verify the result.

Combie should answer using the accumulated understanding of that specific engineering system.

The end state is not an autonomous DevOps agent.

The end state is a persistent, shared engineering context layer through which humans and AI agents can understand and safely operate complex engineering systems.

> **Intelligence follows understanding. Execution follows trust.**
