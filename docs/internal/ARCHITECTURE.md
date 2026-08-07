# Combie — High-Level Architecture

## Architectural Goal

Combie must create a durable representation of an engineering system without becoming tightly coupled to any single provider, AI model, agent protocol, or observability backend.

The architecture should support this progression:

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

The first architectural rule is:

> **Provider-specific systems should feed Combie Core, but they should not define Combie Core.**

---

# System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                         INTERFACES                          │
│                                                             │
│      CLI        MCP        API        SDK        Slack      │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                       Combie CORE                           │
│                                                             │
│ Query Engine                 Investigation Engine           │
│ Context Engine               Recommendation Engine          │
│ Memory Engine                Learning Engine                │
│ Relationship Engine          Policy / Approval Engine       │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    ENGINEERING MODEL                        │
│                                                             │
│ Resources        Relationships       Observations           │
│ Changes          Deployments         Alerts                 │
│ Incidents        Investigations      Evidence               │
│ Decisions        Actions             Outcomes               │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Combie PLATFORM                       │
│                                                             │
│ Provider Registry     Authentication      Capabilities      │
│ Discovery             Synchronization    Event Ingestion    │
│ Webhooks              Queries            Action Adapters    │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                          ADAPTERS                            │
│                                                             │
│ GitHub | Cloudflare | Vercel | Railway | Sentry | Slack     │
│                  Future providers...                         │
└─────────────────────────────────────────────────────────────┘
```

---

# Architectural Layers

## 1. Interfaces

Interfaces expose Combie capabilities to humans, agents, and applications.

Initial interfaces:

- CLI
- MCP

Near-term:

- API
- SDK
- Slack

Later:

- web application
- additional agent protocols

The interface layer should contain minimal domain logic.

It translates user or agent requests into Combie Core operations.

---

## 2. Combie Core

Combie Core contains product behavior.

It should not directly contain provider API clients.

Core responsibilities include:

### Query Engine

Supports deterministic questions about the engineering system.

Examples:

- list resources
- find related resources
- retrieve recent changes
- query timelines
- retrieve historical incidents
- inspect provider capabilities

### Context Engine

Assembles relevant engineering context for a user, agent, or investigation.

Context may contain:

- application resources
- relationships
- current state
- recent changes
- historical memory
- evidence references

### Relationship Engine

Builds and maintains the Engineering Graph.

Relationships may be:

- explicitly reported by a provider
- discovered from configuration
- inferred from matching identifiers
- supplied by users
- inferred by Combie with confidence metadata

Relationships must record provenance.

### Memory Engine

Persists and retrieves operational history.

Memory should distinguish between:

- raw provider events
- normalized observations
- durable engineering memory

### Investigation Engine

Coordinates investigation workflows.

An investigation may:

1. identify affected resources,
2. traverse the Engineering Graph,
3. retrieve recent changes,
4. query telemetry evidence,
5. retrieve similar historical incidents,
6. construct hypotheses,
7. produce evidence-backed findings.

### Recommendation Engine

Converts investigation findings into proposed next actions.

Recommendations should include:

- proposed action
- reasoning
- evidence
- confidence
- historical precedents
- required permissions
- verification plan

### Learning Engine

Uses previous decisions and outcomes to improve retrieval and recommendation ranking.

Initial learning should use structured memory, similarity, scoring, and historical outcomes rather than continuous model fine-tuning.

### Policy / Approval Engine

Controls whether an operation may proceed.

Responsibilities include:

- permission checks
- capability checks
- approval requirements
- action risk classification
- audit records
- policy enforcement

---

# Engineering Model

The Engineering Model is the stable domain model underneath all providers.

Provider-specific data may be preserved as metadata, but Combie Core should reason primarily over normalized objects.

## Resource

A Resource represents something that exists inside the engineering system.

Examples:

- repository
- service
- deployment
- database
- domain
- Worker
- queue
- storage bucket
- Sentry project
- environment

Example:

```yaml
id: res_123
kind: service
provider: vercel
provider_resource_id: prj_abc
name: production-web
environment: production
metadata:
  framework: nextjs
```

---

## Relationship

A Relationship connects two resources.

Examples:

```text
repository DEPLOYS service
service USES database
domain ROUTES_TO service
service REPORTS_TO sentry_project
worker READS_FROM kv_namespace
deployment PRODUCED_BY commit
```

Relationships should include:

- source
- target
- relationship type
- provenance
- confidence
- timestamps
- provider metadata when relevant

The collection of resources and relationships forms the **Engineering Graph**.

---

## Observation

An Observation is a normalized signal about the engineering system.

Examples:

- service became unhealthy
- error rate increased
- deployment completed
- provider changed configuration
- latency crossed threshold
- incident opened

Observations may be created from:

- provider APIs
- webhooks
- telemetry systems
- Combie-derived correlation

---

## Change

A Change represents something that altered the engineering system.

Examples:

- commit merged
- deployment created
- configuration updated
- DNS changed
- environment variable changed
- infrastructure plan applied

Changes are critical for timeline reconstruction.

---

## Investigation

An Investigation is a first-class durable object.

It may contain:

```yaml
subject: production-api
trigger: elevated_error_rate

affected_resources:
  - railway/api-prod
  - sentry/api-prod

evidence:
  - deployment dpl_123
  - commit abc123
  - sentry issue 9832

hypotheses:
  - latest deployment introduced session regression

recommendation:
  - rollback deployment

status: completed
```

Investigations persist beyond the lifetime of the underlying telemetry.

---

## Decision

A Decision records human or policy response to a recommendation.

Examples:

- approved
- rejected
- modified
- ignored

Decisions are important learning signals.

---

## Action

An Action records an attempted operational change.

Examples:

- redeploy
- rollback
- restart
- invalidate cache
- acknowledge incident

Actions should have explicit lifecycle states and audit metadata.

---

## Outcome

An Outcome records what happened after an action or decision.

Examples:

- error rate recovered
- rollback failed
- latency unchanged
- service healthy
- incident reopened

Outcomes are the core feedback signal for learning.

---

## Evidence

Evidence points to information used during an investigation.

Examples:

- Sentry issue
- trace
- metric query
- deployment diff
- provider event
- commit
- log sample

Evidence may be stored directly when small or referenced externally when large.

The rule is:

> **Store the engineering meaning; reference the raw evidence.**

---

# Provider Architecture

Providers should implement a shared adapter contract.

A provider may expose some or all of these capabilities:

```text
AUTHENTICATE
DISCOVER
SYNC
OBSERVE
QUERY
EXECUTE
```

Providers should declare capabilities explicitly.

Example:

```yaml
provider: sentry

capabilities:
  authenticate: true
  discover: true
  sync: true
  observe: true
  query: true
  execute: false
```

This prevents Combie from assuming every provider supports the same operations.

---

# Initial Providers

The first provider set should remain intentionally small.

Recommended starting set:

- GitHub
- Cloudflare
- Vercel
- Sentry
- one application platform: Railway, Render, or Fly.io
- Slack

AWS, Azure, GCP, Kubernetes, Terraform, Datadog, Prometheus, and other larger ecosystems should come after the Engineering Model is validated.

---

# Telemetry Architecture

Combie should consume telemetry without becoming an observability database.

Telemetry may come from:

- Sentry
- Maple
- Datadog
- Prometheus
- OpenTelemetry-compatible systems
- provider-native metrics

Combie should initially:

1. query these systems when context is required,
2. normalize meaningful signals into Observations,
3. attach evidence references to Investigations,
4. preserve derived conclusions and outcomes.

Combie should not initially store:

- all raw logs
- all metric points
- every trace span
- full session replay data

A future `SignalSource` or `ObservationSource` interface should allow native OTLP ingestion without requiring changes to the core memory model.

---

# Intelligence Architecture

Combie should support multiple ways to perform reasoning.

```text
                    IntelligenceProvider
                           │
              ┌────────────┴────────────┐
              │                         │
        External Agent            Model Provider
              │                         │
      MCP / API / SDK        OpenAI / Anthropic /
                            Gemini / OpenRouter /
                            Ollama / Compatible
```

## External Agent Mode

Cursor, Codex, Claude Code, or another compatible agent performs the reasoning.

Combie supplies deterministic engineering context and tools.

No model API key is required by Combie.

Example:

```text
Cursor
   ↓ MCP
Combie
   ├── get_application
   ├── get_related_resources
   ├── get_recent_changes
   ├── get_incident_history
   └── query_provider
```

---

## Combie-Managed Model Mode

Combie itself invokes a configured model.

Users may configure:

- OpenAI
- Anthropic
- Gemini
- OpenRouter
- Ollama
- custom compatible provider

The model abstraction must remain outside the domain model.

Combie should not couple operational memory to a specific inference provider.

---

# Credential Architecture

Combie must never silently harvest secrets.

Acceptable sources may include:

- OAuth
- provider device authorization
- explicit user-entered tokens
- credentials intentionally exposed through environment variables
- existing provider CLIs when the user authorizes reuse

Combie may detect compatible applications or the existence of known environment variables.

It should not scan:

- shell history
- arbitrary `.env` files
- unrelated project directories
- plaintext files looking for API keys

Secrets should use secure operating-system credential storage where available.

Examples:

- macOS Keychain
- Windows Credential Manager
- Linux Secret Service-compatible keyrings

Configuration files should reference stored credentials rather than embed raw secrets.

---

# Agent Discovery and Setup

Combie may safely detect compatible tools installed on the machine.

Examples:

- Cursor
- Codex
- Claude Code

Detection should only identify capability.

Configuration changes require user approval.

Example onboarding:

```text
Detected:
✓ Cursor
✓ Claude Code
✓ OPENAI_API_KEY

Configure Combie in:
[x] Cursor
[x] Claude Code

Use an AI provider directly inside Combie?
[Optional]
```

Combie can then configure supported agent integration formats such as MCP.

---

# Memory Architecture

Operational memory should have multiple layers.

```text
External Evidence
Sentry / Maple / Datadog / provider APIs
              ↓
Normalized Signals
Observations / Events / Changes / Alerts
              ↓
Operational Memory
Investigations / Decisions / Actions / Outcomes
              ↓
Learned Experience
Patterns / Precedents / Preferences / Success history
```

This separation prevents Combie from becoming a giant telemetry datastore while preserving the information required for future reasoning.

---

# Execution Architecture

Execution must be capability-driven and policy-controlled.

A proposed action should include:

```yaml
action: rollback
provider: vercel
resource: production-web
target: deployment_123

risk: medium

requires_approval: true

verification:
  - deployment status healthy
  - error rate returns toward baseline
```

Execution flow:

```text
Recommendation
      ↓
Capability check
      ↓
Policy check
      ↓
Human approval
      ↓
Provider action
      ↓
Verification
      ↓
Outcome
      ↓
Memory
```

Combie should not allow arbitrary shell execution against infrastructure as its initial action model.

Start with narrow, typed provider actions.

---

# Persistence

Combie should support local-first persistence for open-source use.

The persistence layer should be abstracted so hosted Combie can use managed storage later.

Likely data categories:

- provider configuration metadata
- resources
- relationships
- observations
- changes
- investigations
- memory
- decisions
- actions
- outcomes
- audit records

Raw credentials should not live in the primary application database when secure credential stores or secret-management systems are available.

---

# Deployment Modes

## Local / Self-Hosted

```text
CLI / Agent
     ↓
Combie Core
     ↓
Local Persistence
     ↓
Provider APIs
```

Users own their engineering data and credentials.

## Combie Cloud

```text
Humans / Agents
       ↓
Combie API
       ↓
Managed Combie Core
       ↓
Managed Persistence
       ↓
Provider APIs / Webhooks
```

Hosted Combie may provide OAuth applications, durable webhook ingestion, team access, hosted intelligence, and managed memory.

Both deployment modes should preserve the same Engineering Model.

---

# Architectural Boundaries

### MCP Is an Interface, Not the Core

Combie should support MCP without modeling the system around MCP concepts.

### Providers Do Not Define the Domain

Provider APIs are adapters.

Combie's Engineering Model is the stable internal contract.

### Telemetry Is Evidence

Combie consumes telemetry but does not initially become the primary telemetry datastore.

### Models Are Replaceable

Operational memory must survive model changes.

### Actions Are Typed

Controlled execution should use explicit provider capabilities rather than arbitrary commands.

### Every Important Conclusion Has Provenance

Relationships, investigations, recommendations, and outcomes should retain evidence and provenance.

---

# Architectural Principle

> **Combie owns durable engineering understanding. Providers own their capabilities. Models supply reasoning. Humans retain authority.**
