> **Outdated as of Aug 12 2026.**
# Combie — Roadmap

## Roadmap Philosophy

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
INVESTIGATION
    ↓
OPERATIONAL MEMORY
    ↓
LEARNING
    ↓
CONTROLLED EXECUTION
    ↓
PLATFORM
```

The guiding principle is:

> **Intelligence follows understanding. Execution follows trust.**

v0.1 through v0.3 form the initial product-validation arc.

By v0.3, Combie should already provide standalone value without requiring AI.

---

# v0.1 — Connection

## Goal

Prove that Combie can connect a real engineering stack and accurately understand what resources exist.

## Product Question

> Can Combie reliably connect several modern engineering providers and produce a trustworthy inventory of the user's engineering system?

## Initial Providers

Recommended:

- GitHub
- Cloudflare
- Vercel
- Sentry
- one of Railway, Render, or Fly.io

Slack may be introduced here for authentication/integration groundwork or deferred until investigations.

## Capabilities

Build:

- project initialization
- provider registry
- provider authentication
- secure credential references
- provider capability declarations
- resource discovery
- synchronization
- normalized Resource model
- local persistence
- basic provider metadata
- CLI

## CLI

```bash
combie init

combie connect github
combie connect cloudflare
combie connect vercel
combie connect sentry
combie connect railway

combie providers
combie resources
combie sync
```

## Explicitly Not Included

- AI reasoning
- MCP
- investigations
- learning
- execution
- raw telemetry storage
- complex web UI

## Success Condition

Combie can connect a real startup application and accurately inventory its engineering resources.

---

# v0.2 — Context

## Goal

Build the Engineering Graph.

## Product Question

> Can Combie understand how resources from different providers relate to one another?

## Capabilities

Add:

- Relationship model
- environment model
- application/service grouping
- relationship provenance
- relationship confidence
- deterministic relationship discovery
- cross-provider identity matching
- user-defined relationship overrides
- graph queries
- graph CLI

## Example

```text
production-web
├── source → github/acme/web
├── deploy → vercel/web
├── domain → cloudflare/acme.com
└── errors → sentry/web-production
```

## CLI

```bash
combie graph
combie graph production-web
combie related production-web
```

## Success Condition

Users recognize Combie's graph as a credible representation of their application and infrastructure.

This is the release where Combie becomes more than a generic integration layer.

---

# v0.3 — Memory

## Goal

Understand what has happened across the Engineering Graph over time.

## Product Question

> Can Combie reconstruct meaningful engineering history across providers?

## Capabilities

Add:

- Observation model
- Change model
- provider events
- webhook ingestion
- periodic synchronization
- deployment history
- alert normalization
- timeline reconstruction
- resource history
- operational memory foundation

## Example Timeline

```text
10:42 GitHub PR #391 merged
10:44 Railway deployment started
10:47 Railway deployment completed
10:51 Sentry error rate increased
10:52 production-api marked unhealthy
```

## CLI

```bash
combie timeline production-api
combie changes production-api
combie history production-api
```

## Success Condition

Combie can accurately reconstruct significant operational timelines involving multiple providers.

## MVP Milestone

At the end of v0.3, Combie should be useful without AI.

The product can:

- connect the engineering stack
- inventory resources
- build cross-provider relationships
- record meaningful operational events
- reconstruct application history

That is the first complete MVP.

---

# v0.4 — Agent Interface

## Goal

Make Combie's deterministic context available to external AI agents.

## Product Question

> Can an arbitrary compatible agent reason meaningfully about a user's engineering system through one Combie interface?

## Capabilities

Add:

- MCP server
- agent-facing query tools
- safe agent discovery
- guided agent configuration
- Combie API foundation
- IntelligenceProvider abstraction
- external agent mode
- optional BYO model provider configuration
- secure model credential management

## External Agent Experience

```text
Cursor / Codex / Claude
          │
         MCP
          ↓
      Combie
          ↓
Engineering Graph + Memory
```

Combie does not require the user's model API key when the external agent supplies its own intelligence.

## Candidate MCP Tools

```text
get_resources
get_application
get_related_resources
get_recent_changes
get_timeline
get_incident_history
query_provider
get_evidence
```

## BYO Model

Optional support may begin for:

- OpenAI
- Anthropic
- Gemini
- OpenRouter
- Ollama
- OpenAI-compatible endpoints

## Success Condition

An external agent can answer engineering questions more effectively through Combie than through isolated provider integrations.

---

# v0.5 — Investigation

## Goal

Turn context and memory into evidence-backed operational investigations.

## Product Question

> Can Combie explain what is happening and why by correlating information across multiple engineering systems?

## Capabilities

Add:

- Investigation object
- Investigation Engine
- evidence collection
- graph traversal
- recent-change correlation
- historical retrieval
- telemetry query adapters
- hypotheses
- confidence
- investigation summaries
- Slack notifications
- investigation CLI
- optional Combie-managed model reasoning

## Investigation Flow

```text
Signal
   ↓
Affected resources
   ↓
Graph traversal
   ↓
Recent changes
   ↓
External evidence
   ↓
Historical memory
   ↓
Hypotheses
   ↓
Findings
```

## Telemetry

Combie may query:

- Sentry
- Maple
- Datadog
- Prometheus
- provider-native metrics

Combie should not yet become a general raw telemetry datastore.

## Slack Experience

Example:

```text
Combie detected elevated errors in production-api.

Related change:
Railway deployment dpl_91af

Related commit:
GitHub 98a3fc

Sentry errors increased 183% four minutes later.

[Investigate] [Ignore]
```

## Success Condition

Combie produces useful, evidence-backed investigations that require information from more than one provider.

---

# v0.6 — Operational Memory

## Goal

Turn investigations and human decisions into durable organizational knowledge.

## Product Question

> Does historical operational knowledge improve future investigations?

## Capabilities

Add:

- Incident model
- Decision model
- Recommendation model
- Action record model
- Outcome model
- evidence retention
- historical incident retrieval
- similarity search
- incident linking
- memory summaries
- resource-specific experience

## Example Memory

```text
Incident:
Production API error spike

Cause:
Deployment 81af92

Investigation:
Session validation regression

Recommendation:
Rollback

Decision:
Approved

Outcome:
Error rate returned to baseline

Evidence:
Sentry issue
Railway deployment
GitHub PR
```

## Success Condition

Combie can answer:

> Has this happened before?

with relevant incidents, previous decisions, actions, and outcomes.

---

# v0.7 — Learning

## Goal

Use historical outcomes to improve future recommendations.

## Product Question

> Can Combie become more useful because it remembers how this specific engineering system behaves?

## Capabilities

Add:

- experience retrieval
- pattern detection
- recommendation ranking
- historical success scoring
- user/team preference memory
- approved/rejected recommendation history
- action success history
- outcome scoring
- learned precedents

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
Future Recommendation
```

No continuous model fine-tuning is required.

The first learning system should be transparent and inspectable.

## Example

```text
Similar incidents: 6

Previous responses:
rollback deployment → 5
database investigation → 1

Successful outcomes:
rollback → 5/5

Recommended:
rollback latest deployment
```

## Success Condition

Users can observe that Combie's recommendations improve because of historical experience from their own engineering system.

---

# v0.8 — Controlled Execution

## Goal

Allow Combie to safely execute a small number of typed operational actions.

## Product Question

> Can Combie perform approved infrastructure operations safely, audibly, and verifiably?

## Capabilities

Add:

- action capability declarations
- Policy / Approval Engine
- human approval workflows
- risk classification
- typed provider actions
- dry-run support where providers allow it
- action audit trail
- outcome verification
- rollback semantics where possible

## Initial Actions

Keep the set deliberately small.

Candidates:

- rollback deployment
- redeploy
- restart service
- invalidate cache
- acknowledge incident

## Capability Model

```text
READ
OBSERVE
QUERY
PLAN
EXECUTE
```

## Default Rule

> Human approval is required for meaningful infrastructure changes.

## Success Condition

Combie safely performs a limited number of well-defined operations and verifies whether they produced the intended outcome.

---

# v0.9 — Platform

## Goal

Make Combie extensible beyond first-party provider development.

## Product Question

> Can developers outside the core project extend Combie without modifying Combie Core?

## Capabilities

Add:

- Provider SDK
- provider templates
- capability contracts
- custom resource types
- custom relationship resolvers
- custom observation sources
- custom actions
- provider testing framework
- compatibility/versioning model
- documentation for community adapters

## Developer Experience

Potential workflow:

```bash
combie provider new
combie provider test
combie provider validate
combie provider publish
```

## Success Condition

A third-party developer can build and distribute a useful provider adapter using documented stable contracts.

---

# v1.0 — Engineering Context Layer

## Goal

Deliver the complete Combie product loop.

## Product Question

> Can Combie serve as the durable shared engineering context through which humans and AI agents understand and safely operate an engineering system?

## Complete Loop

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
   │
   └──────────────↺
```

## v1.0 Capabilities

Combie should be able to:

- connect several engineering providers
- discover resources
- build an Engineering Graph
- record meaningful operational history
- expose deterministic context through CLI/API/MCP/SDK
- integrate with external AI agents
- support BYO model providers
- investigate cross-provider incidents
- use telemetry as evidence
- preserve investigations and outcomes
- learn from previous decisions
- recommend next actions
- execute a limited set of approved operations
- verify outcomes
- support third-party providers

## v1.0 Product Promise

> **Connect your engineering stack once.**
>
> Combie gives humans and AI agents a shared understanding of your infrastructure — what exists, how it relates, what changed, what happened before, and what to do next.

---

# Provider Expansion Strategy

Provider count should not be treated as the primary success metric.

Expansion should follow validated user demand.

## Initial

- GitHub
- Cloudflare
- Vercel
- Sentry
- Railway / Render / Fly.io
- Slack

## Next

Potential additions:

- remaining startup application platforms
- Neon
- Supabase
- PlanetScale
- Better Stack
- Grafana Cloud
- Maple
- Datadog
- Prometheus

## Later

Large infrastructure ecosystems:

- AWS
- GCP
- Azure
- Kubernetes
- Terraform / OpenTofu

The core model must be proven before Combie absorbs the complexity of hyperscale providers.

---

# What Combie Should Not Build During the MVP

To prevent scope expansion, the following should remain out of scope for early releases:

- general-purpose observability datastore
- log indexing platform
- full distributed tracing backend
- metrics database
- generic workflow automation engine
- autonomous unrestricted infrastructure agent
- replacement for Terraform
- replacement for Kubernetes
- replacement for Sentry or Datadog
- large dashboard-heavy control plane
- proprietary model training infrastructure

Combie integrates with these systems rather than replacing them.

---

# MVP Definition

The product has two important validation thresholds.

## MVP Foundation — v0.3

Combie can:

```text
Connect
Understand
Remember
```

A user can connect a real engineering stack and inspect a trustworthy graph and timeline.

## Intelligent MVP — v0.5

Combie can:

```text
Connect
Understand
Remember
Expose Context
Investigate
```

External agents and Combie itself can use cross-provider context to produce useful investigations.

Everything after v0.5 deepens the moat:

```text
Operational Memory
Learning
Controlled Execution
Platform Ecosystem
```

---

# Final Roadmap Principle

Combie should never rush toward autonomy.

The sequence matters.

```text
First know what exists.

Then know how it relates.

Then know what happened.

Then help explain why.

Then remember what worked.

Then learn from it.

Only then act.
```
