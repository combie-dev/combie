# SPRINT-008 — Vercel Domain Enrichment

> **Roadmap:** v0.2 — Context
> **Status:** Complete
> **Depends on:** SPRINT-007 — Relationship Evidence Discovery
> **Scope:** Acquire and normalize the missing Vercel domain evidence identified in Sprint 007
> **Provider:** Vercel
> **Relationship implementation:** None

## Goal

Acquire the minimum deterministic Vercel domain evidence required for a future Vercel project ↔ Cloudflare zone relationship.

Sprint 007 established the strongest next relationship candidate:

```text
Vercel project
      │
      │ custom domain apex
      ▼
Cloudflare zone
```

with the proposed future semantic:

```text
Vercel project ── uses_domain_in ──→ Cloudflare zone
```

But Sprint 007 also established that Combie does not yet persist the Vercel project-domain facts required to prove that relationship.

Sprint 008 fills only that evidence gap.

At the end of this Sprint, a synchronized Vercel project should contain compact, normalized domain metadata sufficient for a future deterministic comparison against Cloudflare zone names.

No new Relationship is created in this Sprint.

---

## Why This Sprint Exists

Sprint 007 classified Vercel ↔ Cloudflare as **Class B**:

> Deterministic evidence exists, but Combie needs one narrow provider enrichment before inference is possible.

The evidence rule is:

```text
vercel custom domain apex
        ==
cloudflare zone name
```

case-insensitively and using properly normalized DNS names.

Before Combie can infer anything from that rule, it must first know the Vercel project's relevant custom domains.

This Sprint acquires that fact cleanly.

---

## Sprint Principle

> **Acquire the evidence. Do not consume it yet.**

Do not implement `uses_domain_in`.

Do not query Cloudflare during Vercel discovery.

Do not add a second Relationship resolver.

Do not change the graph/context architecture.

Make Vercel Resources carry the smallest useful domain evidence, prove that it is correct, and stop.

---

## User / Product Outcome

After:

```bash
combie sync
```

Vercel project Resources should retain compact domain facts discovered from Vercel.

Conceptually:

```yaml
provider: vercel
kind: project
name: example-project
metadata:
  git:
    type: github
    org: example
    repo: app
    repoId: 123456
  domains:
    - hostname: app.example.com
      apexName: example.com
      custom: true
```

The exact stored representation must follow existing Resource metadata conventions.

Provider-owned default domains such as:

```text
project-name.vercel.app
```

must not be treated as custom-domain evidence for the future Cloudflare relationship.

They may be omitted entirely from normalized relationship-oriented metadata if that is the cleanest implementation.

---

## Scope

Sprint 008 includes:

1. inspect current Vercel project discovery implementation
2. inspect the Vercel domains endpoint/API shape validated in Sprint 007
3. add the smallest read-only domain discovery required per Vercel project
4. normalize relevant custom domain facts
5. compute or preserve a deterministic apex-domain value
6. exclude or clearly distinguish Vercel-owned/default domains
7. persist compact domain metadata on Vercel project Resources
8. preserve existing Git metadata
9. handle pagination if the chosen Vercel endpoint requires it
10. handle projects with zero custom domains
11. handle domain endpoint failures safely
12. preserve multi-provider sync behavior
13. preserve all Sprint 001–007 behavior
14. add focused tests
15. perform representative live verification
16. document whether the resulting metadata is sufficient for the future deterministic Cloudflare join

Everything else is out of scope.

---

## Architecture Target

Existing:

```text
Vercel API
   ↓
project discovery
   ↓
Vercel project Resource
   ├── identity
   └── git metadata
```

Sprint 008:

```text
Vercel API
   ├── project discovery
   └── project domain discovery
             ↓
       Vercel adapter
             ↓
       project Resource
       ├── identity
       ├── git metadata
       └── compact domain metadata
```

The output remains a normal provider-independent `Resource`.

No Relationship inference occurs here.

---

## Architecture Pressure Report

Before implementation, inspect the completed Sprint 007 repository and answer:

1. What exact Vercel domain endpoint/API shape was validated in Sprint 007?
2. Is domain data available in the existing project response, or is one additional read per project actually required?
3. Does the endpoint paginate?
4. What stable project identity is required to request domains?
5. What fields are necessary to preserve deterministic domain evidence?
6. Does Vercel return an apex/root domain directly, or must Combie derive it?
7. How should `*.vercel.app` and other provider-owned defaults be classified?
8. How should malformed internationalized, wildcard, trailing-dot, or case-variant hostnames be handled?
9. What should happen when project discovery succeeds but domain enrichment fails?
10. Can this remain entirely inside the Vercel adapter/normalization boundary?
11. Does any core Resource, Relationship, SQLite, or context-query model need to change?

Preferred result:

> This should be a Vercel adapter enrichment, not a Combie architecture change.

---

## Evidence Contract

Sprint 007 identified the future join as conceptually:

```text
normalizedVercelDomain.apexName
        ==
normalizedCloudflareZone.name
```

Sprint 008 must produce the Vercel side of that contract.

The normalized fact must be deterministic enough that a future resolver does not need to reinterpret raw provider responses.

At minimum, each relevant domain fact should allow Combie to know:

- the hostname
- the registrable/apex domain used for matching
- whether it is custom vs provider-owned/default

Do not store entire Vercel domain API responses.

---

## Domain Classification

### Custom Domains

Examples:

```text
example.com
www.example.com
api.example.com
```

These may provide useful evidence for the future relationship.

### Vercel-Owned Defaults

Examples:

```text
project.vercel.app
project-git-main-user.vercel.app
```

These do not provide evidence that a Cloudflare zone is used by the Vercel project.

Do not include them as matchable custom-domain evidence.

### Wildcards

If Vercel returns:

```text
*.example.com
```

normalize carefully.

The future matching apex is still conceptually:

```text
example.com
```

Do not implement wildcard relationship semantics in this Sprint.

### Case and Trailing Dot

DNS names are case-insensitive.

Normalize appropriately so:

```text
Example.COM
example.com.
example.com
```

do not become meaningfully different evidence.

---

## Apex / Registrable Domain Derivation

Do not derive apex domains by simply taking the last two labels.

That fails for public suffixes such as:

```text
example.co.uk
example.com.au
```

Use the strongest source available in this order:

1. a trustworthy apex/registrable-domain field returned directly by Vercel, if available
2. an existing repository dependency already capable of public-suffix-aware domain parsing
3. the smallest justified public-suffix-aware dependency if derivation is truly necessary

Do not introduce a large networking/domain subsystem.

If Sprint 007's validated Vercel response already provides `apexName`, preserve that provider-backed value rather than recomputing it.

Document the actual decision in completion notes.

---

## Provider API Reads

Use only read-only Vercel API access already authorized by the existing token.

Do not request broader permissions.

Do not read:

- environment variable values
- secrets
- deployment logs
- runtime logs
- analytics
- functions
- source code
- deployment history

The only new data allowed is what is required to discover project domain identity.

---

## Request Efficiency

Sprint 008 may require an additional request per Vercel project.

Do not prematurely build batching, queues, caching infrastructure, background jobs, or concurrency frameworks.

However, inspect the API carefully before accepting N+1 behavior.

If Vercel provides a single account/team-scoped endpoint that can deterministically associate domains to project IDs more efficiently, prefer the simpler and safer API shape.

Choose based on the actual API, not abstract optimization.

Record the request model in completion notes.

---

## Partial Enrichment Failure

A Vercel project's domain enrichment failing must not automatically erase an otherwise valid project Resource.

Preserve the project discovered from the primary project endpoint.

Do not fabricate domain metadata.

The implementation must define simple, explicit behavior for:

```text
project discovery succeeds
domain discovery fails
```

Preferred principle:

> Preserve known Resource facts; do not replace unknown evidence with false emptiness.

Be especially careful that a transient domain API failure does not make a future resolver interpret "unknown" as "no domains."

Sprint 008 does not implement the future resolver, but the metadata/error semantics should not make that mistake inevitable.

---

## Zero Custom Domains

A project with no custom domains is valid.

Sprint 007's live account found:

```text
44 Vercel projects
44/44 with only vercel.app domains
0 custom apexes
```

That is expected data, not an error.

The normalized result may be:

```yaml
domains: []
```

or the repository's equivalent explicit representation.

The implementation should distinguish:

```text
successfully checked; no custom domains
```

from:

```text
domain enrichment failed / unknown
```

if that distinction is necessary for future safe inference.

Do not invent placeholder domains.

---

## Metadata Shape

Keep Resource metadata compact.

Conceptually:

```ts
metadata: {
  git?: {
    type: "github"
    org: string
    repo: string
    repoId: number
  }
  domains?: [
    {
      hostname: string
      apexName: string
      custom: true
    }
  ]
}
```

This is illustrative only.

Follow the repository's existing metadata conventions and serialization rules.

Do not create a new `Domain` domain entity unless implementation proves it is necessary.

For this Sprint, domain information is evidence attached to the Vercel project Resource.

---

## Resource Identity

Vercel project Resource identity must remain unchanged.

Domain changes must not create a new project Resource.

Existing:

```text
vercel:project:<project-id>
```

remains authoritative.

Adding/removing/renaming a custom domain updates project metadata only.

---

## Persistence

Use existing Resource persistence.

No new table should be required solely for Vercel domain metadata.

Do not add:

```text
domains
project_domains
domain_evidence
```

tables unless the existing Resource metadata mechanism genuinely cannot support the required compact facts.

Preferred result:

> No SQLite schema change.

---

## Relationship Layer

The Relationship layer must remain unchanged.

Do not add:

```text
uses_domain_in
```

to production Relationship kinds.

Do not modify the Sprint 005 GitHub↔Vercel resolver.

Do not inspect Cloudflare Resources while enriching Vercel.

Sprint 009, if justified after Sprint 008, can consume the evidence.

---

## CLI

No new CLI command is required.

Existing:

```bash
combie sync
combie resources
combie relationships
combie related
```

must continue working.

If the existing `resources` output does not show metadata, do not redesign it merely to display domains.

Verification may inspect persisted Resource data through tests or existing developer/debug mechanisms consistent with the repository.

Do not turn Sprint 008 into a resource-inspection UX Sprint.

---

## Testing Strategy

All existing tests must continue passing.

### Vercel Client Tests

Cover:

- domain endpoint success
- zero domains
- only `vercel.app` domains
- custom apex domain
- custom subdomain
- multiple custom domains
- pagination if applicable
- API failure
- malformed response where meaningful
- secret-safe errors

### Normalization Tests

Cover:

- custom-domain preservation
- provider-owned default exclusion/classification
- hostname lowercase normalization
- trailing-dot normalization if applicable
- wildcard normalization if supported by actual API shape
- apex handling
- public-suffix-aware behavior if Combie derives apex
- Git metadata remains unchanged
- project identity remains unchanged

### Sync / Adapter Tests

Cover:

```text
project discovery + domain enrichment success
```

```text
project discovery + zero custom domains
```

```text
project discovery success + domain enrichment failure
```

Ensure a domain enrichment failure does not incorrectly delete the project Resource.

### Regression Tests

Preserve:

- all four provider connections
- Resource identities
- GitHub↔Vercel `source_for`
- Relationship persistence
- stale cleanup
- `combie relationships`
- `combie related`
- partial provider failure
- credential boundaries

Domain enrichment must not break existing relationship inference.

---

## Manual Verification

Use the real Vercel account from Sprint 007.

Representative flow:

```bash
bun run combie sync
```

Verify:

- all existing Vercel projects still sync
- the current account's `vercel.app` domains are correctly treated as non-custom
- normalized domain evidence is empty for projects with no custom domains
- existing `metadata.git` remains present where applicable
- existing six GitHub↔Vercel `source_for` Relationships remain intact
- repeated sync is idempotent
- no credentials appear in metadata or output
- Cloudflare, GitHub, and Sentry behavior remains unchanged

### Optional Stronger Live Verification

If a safe disposable/test Vercel project with a real custom domain already exists, verify its normalized hostname/apex.

Do not purchase, configure, or mutate DNS/domain infrastructure merely to satisfy this Sprint.

The known 0-custom-domain account result is sufficient to validate the empty live path when paired with deterministic fixture tests for custom domains.

---

## Performance Observation

Because the live account contains 44 Vercel projects, record the practical request behavior and sync impact.

Do not optimize unless there is an actual problem.

Completion notes should state:

- number of Vercel projects
- number of domain API requests
- whether pagination occurred
- approximate qualitative sync impact if noticeable
- whether a more efficient provider endpoint was available

This is observation, not a performance project.

---

## Regression Requirement

All behavior from Sprints 001–007 must remain functional:

- Cloudflare
- GitHub
- Vercel
- Sentry
- explicit auth
- Resource discovery
- stable Resource identity
- SQLite persistence
- multi-provider sync
- partial failure
- secret safety
- GitHub↔Vercel deterministic inference
- `source_for`
- Relationship persistence
- stale cleanup
- `combie relationships`
- one-hop `combie related`
- offline context reads

Sprint 008 adds provider evidence only.

---

## Explicitly Out of Scope

Do not implement:

- `uses_domain_in`
- Vercel↔Cloudflare inference
- any second Relationship resolver
- Cloudflare DNS-record discovery for relationship inference
- new Relationship kinds
- graph traversal
- graph database
- GraphEngine
- multi-hop context
- domain management
- DNS mutation
- Vercel domain creation/deletion
- Cloudflare zone mutation
- environment variable values
- secrets ingestion
- deployments
- logs
- metrics
- traces
- telemetry
- Sentry issues/events
- Observations
- Changes
- timelines
- memory
- investigations
- recommendations
- learning loops
- AI
- embeddings
- new providers
- Slack
- MCP
- API server
- SDK
- web app
- controlled execution
- hosted Combie
- billing
- broad CLI/resource UX redesign

Do not scaffold these capabilities.

---

## Anti-Overengineering Rules

Do not introduce:

```text
DomainEngine
DNSEngine
DomainRegistry
NetworkTopologyEngine
EvidenceEngine
RelationshipPluginRuntime
GraphEngine
```

The feature is:

```text
read Vercel project domains
        ↓
normalize compact domain facts
        ↓
store them on the existing project Resource
```

Nothing more.

---

## Repository Understanding Requirement

Before coding, follow `skills/build-combie/SKILL.md` and inspect the completed Sprint 007 repository.

The Repository Understanding Report should identify:

- current Vercel client endpoints
- project pagination
- Vercel adapter flow
- Vercel project normalization
- current `metadata.git`
- Resource metadata serialization/persistence
- existing fixtures/tests
- exact Sprint 007 evidence findings
- the live domain endpoint/API shape
- whether `apexName` is provider-returned
- provider-owned domain behavior
- error handling
- sync partial-failure behavior
- smallest insertion point for domain enrichment

---

## Implementation Plan Requirement

Before coding, produce a concise plan covering:

- Vercel domain endpoint/request strategy
- pagination
- custom/default classification
- hostname normalization
- apex handling
- compact metadata shape
- enrichment failure semantics
- zero-custom-domain semantics
- Resource persistence
- tests
- live verification
- expected request count for the current account

Then implement.

---

## Implementation Discipline

Follow:

```text
Red → Green → Refactor
```

Prefer the smallest Vercel-only change.

Do not modify core Relationship architecture.

Do not implement the future resolver.

---

## Documentation Rules

The permanent Combie Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Sprint 008 should not require Canon changes unless implementation establishes a durable architectural truth missing from the Canon.

Do not create a permanent domain architecture document.

---

## Sprint Completion Notes

### Implemented

- Added read-only, cursor-paginated Vercel project-domain discovery.
- Enriched each Vercel project independently with compact custom-domain facts.
- Preserved stable project identity and existing Git metadata.
- Kept successful empty enrichment distinct from failed/unknown enrichment.
- Added client, normalization, adapter, failure, empty-state, pagination,
  idempotency, malformed-input, secret-safety, and regression coverage.

### Domain Evidence Contract

Successfully enriched Vercel project Resources now include:

```ts
metadata.domains: Array<{
  hostname: string;
  apexName: string;
  custom: true;
}>
```

`hostname` and `apexName` are lowercase ASCII DNS names without a trailing dot.
Internationalized names are canonicalized with `domainToASCII`. A wildcard may
remain as the leading `*.` on `hostname`; `apexName` is never derived from the
hostname and never contains a wildcard. The array contains only matchable
custom domains and is deterministic and deduplicated by hostname.

### API / Request Model

- Project inventory remains `GET /v9/projects`.
- Domain enrichment uses `GET /v9/projects/{projectId}/domains`, with the stable
  `prj_*` id URL-encoded into the path.
- Both collections follow `pagination.next` through the `until` query parameter.
- Requests are sequential and isolated per project: one domain request per
  project plus another only if that project's domain response paginates.
- Live verification: 44 projects required 3 project-list requests and 44 domain
  requests. No domain response required another page. End-to-end sync took
  approximately 6–10 seconds locally; the added reads were noticeable but not
  problematic, so no batching/concurrency infrastructure was added.
- Vercel's returned `apexName` is preserved. Combie does not derive a
  registrable domain and added no public-suffix dependency.
- No simpler account-scoped endpoint was suitable: the account apex-domain
  endpoint requires already knowing each apex and therefore cannot replace
  project-scoped discovery.

### Classification

- Valid domains with a valid provider-backed apex are custom unless the
  normalized hostname is `vercel.app`/below `vercel.app`, or the returned apex
  is `vercel.app`.
- Vercel defaults are omitted from relationship-oriented metadata rather than
  stored as matchable facts.
- Leading wildcard hostnames are retained as `*.example.com`; their matching
  apex remains Vercel's normalized `apexName` (`example.com`).
- A successful check with no custom domains stores `domains: []`.
- A failed or malformed domain response preserves the project but omits the
  `domains` key, which means unknown rather than authoritative empty.
- Empty, malformed, non-string, invalid IDN, wildcard-apex, or apex-less entries
  are omitted rather than guessed.

### Architecture Pressure Results

- `Resource` remained unchanged; compact facts use existing metadata.
- Project identity remains `vercel:project:<project-id>`.
- SQLite schema and persistence remained unchanged.
- Relationship model, kinds, persistence, and related-context reads remained
  unchanged. No `uses_domain_in` resolver was implemented.
- Provider API models, classification, and enrichment remain inside the Vercel
  adapter boundary.
- Existing Git metadata and GitHub→Vercel `source_for` inference are unchanged;
  the complete relationship sync/context regression suite passes.

### Deviations

None.

### Validation

- Focused Vercel suite: 45 tests pass after final edge-case coverage.
- Full suite: 193 tests pass across 19 files.
- Typecheck: `bun run typecheck` passes.
- Live `bun run combie -- sync`: 44 Vercel projects persisted; 44/44 have an
  authoritative `domains: []`; 0 custom domains; 0 unknown enrichments; existing
  Git metadata remains on 10 projects. Repeated sync remained at 44 Resources
  with identical normalized domain evidence.
- Custom apex/subdomain, wildcard, IDN, trailing-dot/case, `example.co.uk`,
  default-domain, malformed-response, partial-failure, and pagination behavior
  are proven with deterministic fixtures/tests.
- The currently connected local state contains only Vercel, so it cannot
  reproduce Sprint 005's six live `source_for` rows. Their evidence path remains
  covered by passing relationship sync tests, and the Vercel identity/Git fields
  they depend on are regression-tested unchanged.
- No credentials appeared in Resource metadata, CLI output, errors, or commits.

### Learnings

**Yes.** For every successfully checked project, a future deterministic resolver
can compare each normalized `metadata.domains[].apexName` directly with a
normalized Cloudflare zone name. It does not need to reinterpret raw Vercel
responses or perform further Vercel enrichment. Missing `domains` must be treated
as unknown; an empty array is authoritative evidence that no custom domain was
found at that sync.

**No.** Acquiring the evidence required only Vercel client, normalization, and
adapter enrichment. Existing Resource metadata serialization and persistence
were sufficient.

### Canon Changes

`None`.

Do not define or implement Sprint 009 here.

---

## Definition of Done

Sprint 008 is complete only when:

- [x] completed Sprint 007 repository is inspected first
- [x] exact Vercel domain API shape is confirmed
- [x] project domain discovery is implemented read-only
- [x] pagination is handled if required
- [x] relevant custom domains are normalized
- [x] `vercel.app` defaults are excluded or explicitly non-matchable
- [x] hostname normalization is deterministic
- [x] apex-domain handling is correct and not naive
- [x] successful zero-custom-domain state is represented safely
- [x] enrichment failure does not masquerade as authoritative empty evidence
- [x] Vercel project Resource identity remains unchanged
- [x] existing Git metadata remains intact
- [x] compact domain evidence persists through existing Resource storage
- [x] repeated sync is idempotent
- [x] project Resources survive domain-enrichment failure
- [x] existing six live `source_for` Relationships remain valid
- [x] Cloudflare, GitHub, and Sentry remain unaffected
- [x] no `uses_domain_in` Relationship is implemented
- [x] no second resolver is implemented
- [x] automated tests require no live credentials
- [x] all existing tests pass
- [x] typecheck/lint requirements pass
- [x] live zero-custom-domain path is verified
- [x] custom-domain behavior is proven through deterministic tests and live data if naturally available
- [x] request behavior is recorded
- [x] no secrets are stored or printed
- [x] full diff is reviewed
- [x] Canon remains accurate
- [x] completion notes are updated
- [x] repository state is clean

---

## What Sprint 008 Proves

Sprint 007:

```text
Potential relationship
Vercel project ─────────→ Cloudflare zone

Missing:
Vercel custom-domain evidence
```

Sprint 008:

```text
Vercel project
{
  git: {...},
  domains: [
    {
      hostname,
      apexName,
      custom
    }
  ]
}
```

Now Combie possesses the provider fact required to evaluate:

```text
vercelDomain.apexName
        ==
cloudflareZone.name
```

But it does not evaluate that rule yet.

That distinction matters.

---

## Final Principle

> **Acquire the fact before inferring the relationship.**

Read the domains.

Normalize only what Combie can defend.

Preserve unknown vs empty.

Keep the Resource stable.

Do not draw the edge.

Then stop.

Only after Sprint 008 is implemented and validated should Combie decide whether the evidence is ready to support its second Relationship resolver.
