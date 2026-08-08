# SPRINT-007 — Relationship Evidence Discovery

> **Roadmap:** v0.2 — Context
> **Status:** Complete
> **Depends on:** SPRINT-006 — Related Resource Context
> **Scope:** Evidence investigation across existing providers; no new Relationship implementation
> **Providers:** Cloudflare, GitHub, Vercel, Sentry

## Goal

Determine the strongest next deterministic cross-provider Relationship Combie can support using the providers it already connects to.

Sprint 005 proved one real Relationship:

```text
GitHub repository
      │
      │ source_for
      ▼
Vercel project
```

Sprint 006 proved that stored Relationships can be queried as useful one-hop context from either endpoint.

Sprint 007 does **not** add another Relationship yet.

Instead, it inspects the real provider APIs, existing normalized Resources, and available read-only provider evidence to answer:

> Which second cross-provider Relationship can Combie defend with deterministic evidence and minimal additional data collection?

The output of this Sprint is an evidence-backed recommendation for the next Context slice.

---

## Why This Sprint Exists

The first Context resolver works:

```text
GitHub ↔ Vercel
```

But one resolver is not enough evidence to design a generalized relationship system.

The wrong move now would be to choose a relationship because it looks useful and then force provider data to fit it.

Potential candidates include:

```text
GitHub ↔ Sentry
Vercel ↔ Sentry
Vercel ↔ Cloudflare
GitHub ↔ Cloudflare
```

Some may have strong provider-backed identity.

Some may only expose names, URLs, domains, integration configuration, or indirect hints.

Some may require data Combie deliberately does not ingest yet.

Sprint 007 discovers which is which.

---

## Sprint Principle

> **Let provider evidence choose the next edge.**

Do not implement a relationship because it is plausible.

Do not use naming similarity.

Do not use AI.

Do not use fuzzy matching.

Do not expand telemetry ingestion.

Investigate first.

The best possible Sprint outcome may be:

> None of the current provider pairs expose sufficiently deterministic evidence within the current scope.

That is a valid result.

---

## User / Product Outcome

At completion, the repository should contain a Sprint report that clearly ranks the viable next Relationship candidates.

Conceptually:

```text
Candidate                Evidence Quality   Extra Reads   Recommendation
GitHub ↔ Sentry          Strong             1 endpoint    BEST
Vercel ↔ Sentry          Weak               —             Reject
Vercel ↔ Cloudflare      Medium             1 endpoint    Defer
GitHub ↔ Cloudflare      None               —             Reject
```

This table is illustrative only.

The actual conclusion must come from repository inspection and real provider API evidence.

Sprint 007 should answer:

1. What deterministic evidence exists?
2. Where does it come from?
3. What exact Resources can it connect?
4. What semantic Relationship does that evidence actually prove?
5. What additional read-only provider data, if any, is required?
6. What is the smallest defensible next Context Sprint?

---

## Scope

Sprint 007 includes:

1. inspect current normalized Resource metadata
2. inspect existing provider adapter/API response shapes
3. inspect provider documentation or live read-only API responses where necessary
4. evaluate deterministic evidence for:
   - GitHub ↔ Sentry
   - Vercel ↔ Sentry
   - Vercel ↔ Cloudflare
   - GitHub ↔ Cloudflare
5. identify any other obvious relationship candidate discovered naturally during inspection
6. distinguish direct evidence from indirect hints
7. identify the strongest semantically defensible Relationship kind for viable candidates
8. estimate the minimum provider enrichment required
9. evaluate whether current Resource identities are sufficient for exact matching
10. document security/scope implications of any required additional provider reads
11. produce a ranked recommendation
12. update Sprint completion notes
13. commit only documentation/tests or tiny investigation-support changes if genuinely required by the Sprint protocol

No new production Relationship resolver is in scope.

---

## Non-Goal

This is **not**:

```text
SPRINT-007 — Add GitHub ↔ Sentry
```

It is:

```text
SPRINT-007 — Determine what edge should come next
```

GitHub ↔ Sentry is a candidate, not an assumption.

---

## Current Context Baseline

Combie currently has:

```text
Cloudflare → Resources
GitHub     → Resources
Vercel     → Resources
Sentry     → Resources
```

and:

```text
GitHub repository ── source_for ──→ Vercel project
```

with:

- stable Resource identity
- stable Relationship identity
- compact evidence/provenance
- SQLite Relationship persistence
- deterministic stale cleanup
- `combie relationships`
- one-hop `combie related <resource-id>`
- offline context reads

Do not redesign these primitives during Sprint 007.

---

## Candidate 1 — GitHub ↔ Sentry

Investigate whether Sentry exposes deterministic source repository identity for a Sentry project.

Potential evidence sources may include, if available:

- Sentry source-code integrations
- organization integrations
- repository objects
- project integration configuration
- release/source metadata that directly identifies a repository without requiring event ingestion

Questions:

1. Can a Sentry project be deterministically tied to a specific GitHub repository?
2. Is that relationship project-specific, organization-wide, or merely an installed integration?
3. Does Sentry expose a stable GitHub repository ID?
4. If only owner/repository is available, is that canonical enough to map to an existing GitHub Resource without fuzzy matching?
5. What semantic edge is actually proven?

Do **not** assume that an organization having GitHub installed means every Sentry project is related to every repository.

That would be a false graph.

---

## Candidate 2 — Vercel ↔ Sentry

Investigate whether either provider exposes deterministic linkage between a Vercel project and Sentry project.

Potential evidence might include provider integrations or explicit project configuration.

Questions:

1. Does either API expose the other provider's stable project identity?
2. Is linkage project-specific?
3. Is it merely an environment/configuration hint?
4. Would proving the edge require reading secrets or environment variables?

If deterministic matching requires reading environment variable values, secrets, DSNs containing sensitive material, runtime telemetry, or source code, reject or defer the candidate for this phase.

Do not weaken credential/security boundaries to create an edge.

---

## Candidate 3 — Vercel ↔ Cloudflare

Investigate deterministic evidence connecting a Vercel project to a Cloudflare Resource.

Potential evidence may involve domains, DNS, or provider-returned routing configuration.

Questions:

1. Does Vercel expose project domains through a small read-only endpoint?
2. Does Cloudflare expose zone/DNS identity that can deterministically match those domains?
3. Would a matching domain prove a relationship between the Vercel project and a Cloudflare zone?
4. What relationship semantic is defensible?

Be careful with semantics.

A domain existing in a Cloudflare zone and being assigned to a Vercel project may prove something like:

```text
project → uses_domain_in → zone
```

It does not automatically prove:

```text
project → hosted_by → Cloudflare
```

or:

```text
zone → deploys_to → project
```

Do not overclaim.

---

## Candidate 4 — GitHub ↔ Cloudflare

Investigate whether current Cloudflare Resources expose deterministic source repository identity.

Questions:

1. Do Workers or related Cloudflare resources expose Git repository linkage?
2. Is that linkage available through current discovery APIs?
3. Does obtaining it require a different Cloudflare product/API surface?
4. Is the relationship stable and resource-specific?

Do not infer from matching Worker/repository names.

---

## Other Candidate Discovery

If repository/API inspection reveals another clearly stronger deterministic edge among already supported providers, document it.

Do not broaden into a provider-market survey.

The candidate must involve Resources Combie already supports.

---

## Evidence Classification

For each candidate, classify evidence.

### A — Deterministic

Examples:

```text
provider returns GitHub repository numeric ID
provider returns canonical owner/repository tied to the specific Resource
provider returns stable ID of another supported Resource
```

Suitable for automatic Relationship inference.

### B — Deterministic but requires minimal enrichment

The evidence is strong, but Combie needs one small read-only endpoint or compact metadata field not currently collected.

Potentially suitable for the next Sprint.

### C — Indirect

Examples:

```text
same domain string without enough scope
integration installed at organization level
matching project/repository names
generic URL references
```

Not sufficient for automatic inference without stronger evidence.

### D — Speculative

Requires fuzzy matching, AI, source-code inspection, secret inspection, or assumptions.

Reject for current automatic inference.

---

## Relationship Semantics

For every viable candidate, state the strongest semantic actually proven.

Do not start with a desired verb.

Start with evidence.

Examples:

```text
repository → source_for → project
project → uses_domain_in → zone
project → reports_to → error_project
repository → configured_for → error_project
```

These examples are not approved Relationship kinds.

Only use a semantic if the provider evidence supports it.

If evidence proves only generic association, say so.

---

## Resource Identity Analysis

For each candidate, identify the exact join keys.

Examples:

```text
GitHub providerResourceId
canonical GitHub owner/repo
Vercel project ID
Sentry project ID
Cloudflare zone ID
normalized domain/hostname
```

State whether matching can use stable provider identity directly or requires a canonical provider-backed identifier.

Reject name-only joins.

---

## Minimal Enrichment Analysis

For every viable candidate, document whether current Combie metadata is sufficient.

If not, specify the smallest additional provider read.

Example:

```text
Provider: Cloudflare
Endpoint purpose: list DNS records for already-discovered zone
Reason: obtain deterministic hostname evidence
Write permissions: none
Secrets required beyond existing token: none
```

Do not implement the enrichment in this Sprint unless a tiny read-only probe is genuinely required to validate the API shape and the Sprint protocol allows it.

Production ingestion belongs in the next implementation Sprint.

---

## Security Boundary

A candidate should be downgraded or rejected if it requires:

- environment variable values
- secrets
- source-code scanning
- arbitrary local filesystem scanning
- shell history
- broader write permissions
- telemetry/event payload ingestion
- private runtime data unrelated to the Resource identity

Prefer relationships proven from provider control-plane metadata.

---

## Investigation Method

Follow this order:

```text
1. Inspect current repository
2. Inspect existing normalized metadata
3. Inspect adapter fixtures/tests
4. Inspect provider response types already modeled
5. Consult official provider API documentation if needed
6. Use minimal live read-only probes if needed and authorized
7. Record evidence
8. Rank candidates
```

Do not start by coding.

---

## Live Investigation

Where credentials are already explicitly available and safe to use, minimal read-only live probes may be used to validate uncertain API shapes.

Requirements:

- no mutation
- no new secret harvesting
- no token output
- no persistent production feature added merely for probing
- document endpoint purpose and result
- sanitize captured fixtures

If credentials are unavailable, use official API documentation and existing fixtures and mark live verification as unavailable.

A candidate must not be promoted to deterministic solely because a hypothetical API field might exist.

---

## Deliverable

The primary deliverable is the completed `SPRINT-007.md` completion section containing a Relationship Evidence Matrix.

Use a structure equivalent to:

```text
Candidate
Evidence source
Evidence class
Exact join key
Semantic proven
Additional read required
Security impact
Live verified?
Recommendation
```

Then provide a ranked conclusion.

### Required Final Recommendation

Choose exactly one:

**A. Implement candidate X next**

Evidence is sufficiently deterministic and the next Sprint can safely implement it.

**B. Perform targeted provider enrichment next**

A candidate is promising but one narrow provider-data capability must be added before inference.

**C. Do not add another Relationship yet**

None of the investigated candidates meet Combie's deterministic-evidence bar.

Do not force an implementation recommendation.

---

## No Production Resolver

Sprint 007 must not add:

```text
inferGithubSentryRelationships()
inferVercelSentryRelationships()
inferVercelCloudflareRelationships()
inferGithubCloudflareRelationships()
```

or equivalents.

That work belongs to the next Sprint after evidence review.

---

## Testing

This Sprint is investigation-first.

All existing tests must continue passing:

```bash
bun test
bun run typecheck
```

If tiny investigation-support code is introduced, add focused tests and remove temporary code that is not part of the intended repository state.

Do not add speculative production tests for a Relationship that is not implemented.

---

## Regression Requirement

All Sprint 001–006 behavior must remain unchanged:

- four provider connections
- Resource discovery
- stable Resource identity
- SQLite persistence
- multi-provider sync
- partial failure
- GitHub↔Vercel `source_for`
- Relationship persistence
- stale cleanup
- `combie relationships`
- `combie related`
- offline related-context reads
- credential boundaries
- secret safety

Ideally, Sprint 007 changes no production behavior.

---

## Explicitly Out of Scope

Do not implement:

- a second Relationship resolver
- new Relationship kinds in production
- graph traversal
- multi-hop context
- graph database
- GraphEngine
- relationship confidence
- fuzzy matching
- AI/LLM inference
- embeddings
- source-code scanning
- environment-variable value ingestion
- secrets ingestion
- Sentry issue/event ingestion
- telemetry
- logs
- metrics
- traces
- Observations
- Changes
- timelines
- memory
- investigations
- recommendations
- learning
- new providers
- Slack
- MCP
- API server
- SDK
- web app
- execution
- hosted Combie
- billing
- broad CLI UX redesign

Do not scaffold these capabilities.

---

## Anti-Overengineering Rules

Do not introduce:

```text
RelationshipRegistry
RelationshipPluginRuntime
UniversalResolver
GraphEngine
EvidenceEngine
ConfidenceEngine
TopologyEngine
```

Sprint 007 is an evidence review, not a framework Sprint.

---

## Repository Understanding Requirement

Before investigation, follow `skills/build-combie/SKILL.md` and inspect the completed Sprint 006 repository.

The Repository Understanding Report should identify:

- Resource model
- Relationship model
- current `source_for` resolver
- evidence representation
- GitHub Resource metadata
- Vercel Resource metadata
- Cloudflare Resource metadata
- Sentry Resource metadata
- adapter response models/fixtures
- available stable provider IDs
- existing auth scopes
- where additional read-only provider data could be added later without coupling adapters

---

## Architecture Pressure Requirement

Explicitly answer:

1. Does the current Relationship primitive appear reusable for a second resolver?
2. Does evidence representation need any change before another Relationship kind?
3. Can another resolver remain in the application/context layer?
4. Are provider adapters exposing enough normalized identity facts?
5. Is the main missing capability relationship logic or provider evidence?
6. Does the current one-hop context read path naturally support another Relationship kind without changes?

Do not modify architecture simply because these questions are being asked.

---

## Documentation Rules

The permanent Combie Canon remains:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SKILL.md`

Sprint 007 should not require Canon changes unless the evidence investigation establishes a durable truth that materially changes the roadmap or architecture.

Do not create a permanent relationship-design document.

The Sprint itself is the working evidence record.

---

## Sprint Completion Notes

### Investigation Performed

Inspected completed Sprint 006 repository at `8ef0ce3`:

| Source | What was reviewed |
|---|---|
| Resource / Relationship domain | `src/domain/resource.ts`, `src/domain/relationship.ts` |
| Existing resolver | `src/app/infer-github-vercel.ts`, sync refresh, `related` one-hop path |
| Provider normalize + clients | Cloudflare, GitHub, Vercel, Sentry |
| Fixtures | `tests/providers/*/fixtures/*` |
| Local DBs | `.combie` (Vercel only), `/tmp/combie-s006-*` (GitHub+Vercel with `metadata.git`) |
| Official docs | Sentry org repos API; Sentry GitHub integration / code mappings; Vercel project domains API; Cloudflare Workers scripts list schema |
| Live read-only probes | Vercel `GET /v9/projects` + `GET /v9/projects/{id}/domains` (existing local token). Sentry/Cloudflare tokens unavailable this session → docs + existing adapter models only. No secrets printed or committed. |

**Current normalized metadata (production Combie):**

| Provider | Kind | Metadata today | Stable id |
|---|---|---|---|
| GitHub | repository | owner, fullName, visibility, defaultBranch, htmlUrl, language… | numeric repo id |
| Vercel | project | accountId, framework?, timestamps, **git?** (repoId/org/repo from `link`) | `prj_*` |
| Sentry | project | slug, organization_slug/id, platform, status, dateCreated | numeric project id |
| Cloudflare | worker / database / kv_namespace / zone | accountId, zone status/nameServers, etc. **no git** | provider resource id |

No second Relationship resolver was implemented.

---

### Relationship Evidence Matrix

#### 1) GitHub ↔ Sentry

| Field | Finding |
|---|---|
| **Evidence source** | Current project list: **no** repository fields. Org-level SCM: `GET /api/0/organizations/{org}/repos/` returns Sentry-internal repo objects (`id`, `name` e.g. `owner/repo`). Project-specific linkage in product: **code mappings** (Sentry project ↔ repository) via integration config / code-mappings APIs (documented product + Terraform/issue references; not in Combie today). |
| **Evidence class** | **B** if code mappings (or equivalent project↔repo config) are collected; **C** if only org-level GitHub install or org repo list is used (not project-scoped); **D** if matching project name ≈ repo name. |
| **Exact join key** | Prefer: code mapping `project_id` → Sentry `providerResourceId` + repository identity → GitHub `fullName` (canonical `owner/repo`) or GitHub numeric id if Sentry ever exposes external provider id. Org `repos[].name` alone is **not** a project join key. |
| **Semantic proven** | At best: repository is **configured for** / **code-mapped to** a Sentry project (source context for that project). Does **not** prove “reports every error to” without telemetry. |
| **Additional read required** | Yes: read-only org repos + project-scoped code mappings (or equivalent). Current project discovery insufficient. |
| **Security** | Needs broader Sentry scopes (`org:read` / `org:integrations` / possibly `org:ci`). No secrets required. Do not ingest issue/event payloads. |
| **Live verified?** | **No** this session (no Sentry token). Sprint 004 live: org with **0 projects**. |
| **Recommendation** | **Defer.** Promising only after a dedicated Sentry SCM enrichment probe; not implementable from current metadata. |

#### 2) Vercel ↔ Sentry

| Field | Finding |
|---|---|
| **Evidence source** | Vercel project list/detail: **no** Sentry project id, org, or integration id in Combie models or live list shape. Typical linkage is SDK env (`SENTRY_DSN`, project slug in build config) — secret/config plane. |
| **Evidence class** | **D** (env/secrets/source config) or **C** (name-only). |
| **Exact join key** | None defensible without reading env values or marketplace install payloads not currently used. |
| **Semantic proven** | None from control-plane inventory data. |
| **Additional read required** | Would require env var **values** or sensitive marketplace data — out of security bar. |
| **Security** | **Reject** paths that read DSNs/env secrets. |
| **Live verified?** | Project list inspected live: no Sentry fields. |
| **Recommendation** | **Reject** for automatic inference. |

#### 3) Vercel ↔ Cloudflare

| Field | Finding |
|---|---|
| **Evidence source** | Cloudflare zone Resources already store **zone apex** as `name` + stable zone id. Vercel: `GET /v9/projects/{idOrName}/domains` returns `name`, `apexName`, `projectId`, `verified` (docs + **live probe**). Not stored in Combie today. |
| **Evidence class** | **B** — deterministic once project domains are collected; exact apex match to `cloudflare` zone `name` (case-normalized DNS). Platform domains (`*.vercel.app`) must be ignored (apex `vercel.app` is not a user zone). |
| **Exact join key** | `vercelDomain.apexName` (or registrable apex of `name`) **===** Cloudflare zone Resource `name` (exact, case-insensitive). Optionally require `verified: true`. Not project display name. |
| **Semantic proven** | Strongest defensible: Vercel project **`uses_domain_in`** / is **configured with a domain under** Cloudflare zone. Does **not** prove `hosted_by` Cloudflare or DNS correctness. |
| **Additional read required** | Yes: per-project domains list (read-only). Cloudflare zone list already sufficient for apex identity; DNS record enumeration not required for apex-level join. |
| **Security** | Existing Vercel token scopes; no secrets; no mutation. |
| **Live verified?** | **Yes** domains API shape. **44/44** projects on this account only expose `*.vercel.app` domains → **0** custom apexes → **0** matchable edges on this inventory even after enrichment. Pattern remains valid for accounts with custom domains on both sides. |
| **Recommendation** | **Best next technical candidate** (after enrichment). |

#### 4) GitHub ↔ Cloudflare

| Field | Finding |
|---|---|
| **Evidence source** | Current Workers list + normalize: script id/handlers/timestamps — **no git**. Official `GET /accounts/{id}/workers/scripts` response schema has no GitHub repo id/owner/repo. Workers Builds Git integration is primarily dashboard-driven; public API surface for git linkage is incomplete/not on the current discovery path. |
| **Evidence class** | **C/D** with current APIs. Name match Worker↔repo = **D**. |
| **Exact join key** | None available in current discovery. |
| **Semantic proven** | None. |
| **Additional read required** | Would need a different CF product API if/when git linkage is exposed per Worker; not proven today. |
| **Security** | N/A. |
| **Live verified?** | Docs/schema; no CF token this session. Adapter fixtures confirm no git fields. |
| **Recommendation** | **Reject** for now. |

#### Other candidate (natural discovery)

No stronger pair among already-supported Resource kinds. Indirect: Vercel `git` already yields GitHub↔Vercel (`source_for`) — already shipped. No third-provider stable id appeared on list endpoints without enrichment.

---

### Ranked summary

| Rank | Candidate | Class | Extra reads | Verdict |
|---|---|---|---|---|
| 1 | Vercel project ↔ Cloudflare zone (custom domain apex) | **B** | Vercel project domains | Best path after enrichment |
| 2 | GitHub repository ↔ Sentry project (code mapping) | **B** | Sentry repos + code mappings | Defer; more complex; no live projects |
| 3 | Vercel ↔ Sentry | **D/C** | would need secrets/env | Reject |
| 4 | GitHub ↔ Cloudflare Worker | **C/D** | unknown/unsupported on list API | Reject |

---

### Architecture Pressure Results

1. **Is Relationship primitive reusable for a second resolver?**  
   **Yes.** Stable id, kind, evidence JSON, SQLite upsert/stale pattern from Sprint 005 are pair-agnostic. A new kind (e.g. `uses_domain_in`) fits without redesign.

2. **Does evidence representation need change?**  
   **No** for a second edge. Compact `{ source, mechanism, … }` remains enough. Optional fields stay free-form in the evidence object.

3. **Can another resolver stay in the application layer?**  
   **Yes.** Same pattern as `infer-github-vercel.ts` + sync refresh; adapters only normalize provider facts.

4. **Are adapters exposing enough identity facts?**  
   **Partially.** GitHub numeric id + Vercel `git.repoId` are strong (already used). Sentry and Cloudflare lack cross-provider join keys for the evaluated pairs without enrichment.

5. **Is the missing capability relationship logic or provider evidence?**  
   **Provider evidence.** Inference/read path is proven; the bottleneck is control-plane facts not yet collected (domains, code mappings).

6. **Does one-hop `related` support another kind without changes?**  
   **Yes.** It is kind-agnostic (source/target + direction presentation).

**Main gap:** evidence collection, not graph infrastructure.

---

### Recommendation

**B. Perform targeted provider enrichment next.**

**Chosen focus:** Vercel project **custom domains** (read-only `GET /v9/projects/{id}/domains`), persist compact domain facts on Vercel project Resources (e.g. verified hostnames / apex names; exclude secrets).

**Why not A (implement relationship immediately):** Current Combie metadata has **no** domain facts, so a production resolver would always emit zero edges until enrichment lands. Sprint 007 must not implement the second resolver.

**Why not C:** A concrete deterministic join path exists (apex name ↔ Cloudflare zone name) with documented + live-validated API shape and acceptable security. This account’s lack of custom domains is inventory-empty, not evidence-invalid — analogous to Sprint 004’s empty Sentry projects.

**Why Vercel↔CF over GitHub↔Sentry enrichment:**  
- Smaller surface (one endpoint pattern already live-probed)  
- Join key is already on Cloudflare Resources (`zone.name`)  
- Semantic is clear and limited (`uses_domain_in` zone, not `hosted_by`)  
- Sentry path needs multi-endpoint SCM plumbing and had zero live projects previously  

**Explicit next-step boundary (not Sprint 008 definition):**  
1) Enrichment-only slice collecting domain metadata.  
2) Only after enrichment proves non-empty matchable domains against real Cloudflare zones should a later Sprint implement `uses_domain_in` inference.

---

### Rejected Assumptions

| Attractive idea | Why rejected |
|---|---|
| Match Vercel project name ↔ Sentry project name | Name-only; multi-provider `project` kind collision risk; **D** |
| Match GitHub repo name ↔ Worker name | Name-only; **D** |
| Org-level Sentry GitHub install ⇒ all projects related to all repos | False graph; not project-scoped |
| `*.vercel.app` domain ⇒ Cloudflare zone | Platform domain; not customer zone |
| Domain match proves `hosted_by` / deploy path | Overclaim; only co-configuration of domain identity |
| Read `SENTRY_DSN` / env for Vercel↔Sentry | Secrets boundary |
| Infer from source code or local `.env` | Explicitly out of scope / security |

---

### Validation

- **Automated:** `bun test` — **165 pass** / 18 files / 713 expects; `bun run typecheck` clean.  
- **Production code:** no resolver, no adapter behavior change (docs-only Sprint).  
- **Live probes (Vercel token already authorized locally):**  
  - Domains endpoint 200; fields `name`, `apexName`, `projectId`, `verified`.  
  - 44 projects scanned → 0 non-`vercel.app` apexes on this account.  
- **Not live:** Sentry SCM endpoints, Cloudflare DNS (tokens unavailable). Docs/schema used instead; candidates not upgraded to class A on speculation.

### Canon Changes

`None`.

Do not implement or define Sprint 008 here.

---

## Definition of Done

Sprint 007 is complete only when:

- [x] completed Sprint 006 repository is inspected first
- [x] current metadata for all four providers is reviewed
- [x] GitHub ↔ Sentry is evaluated
- [x] Vercel ↔ Sentry is evaluated
- [x] Vercel ↔ Cloudflare is evaluated
- [x] GitHub ↔ Cloudflare is evaluated
- [x] any naturally discovered stronger candidate is documented
- [x] each candidate receives an evidence classification
- [x] exact deterministic join keys are identified where available
- [x] relationship semantics are not stronger than the evidence
- [x] required provider enrichment is identified where applicable
- [x] security implications are evaluated
- [x] no name-only/fuzzy/AI inference is accepted
- [x] minimal live read-only verification is performed where practical
- [x] a ranked evidence matrix is recorded
- [x] exactly one final recommendation (A/B/C) is made
- [x] no second production Relationship resolver is implemented
- [x] all Sprint 001–006 behavior remains valid
- [x] all tests pass
- [x] typecheck/lint requirements pass
- [x] no secrets are committed or printed
- [x] full diff is reviewed
- [x] Canon remains accurate
- [x] completion notes are updated
- [x] repository state is clean

---

## What Sprint 007 Proves

Sprints 005–006 established:

```text
Evidence
   ↓
Relationship
   ↓
Related Context
```

Sprint 007 establishes the discipline for growing that Context layer:

```text
Potential edge
     ↓
Evidence investigation
     ↓
Deterministic?
   ↙       ↘
 yes       no
  ↓         ↓
next       reject/
Sprint     defer
```

Combie's graph should grow because engineering systems expose facts, not because a diagram looks compelling.

---

## Final Principle

> **Do not draw the next edge until the providers prove it exists.**

Inspect.

Classify.

Reject weak assumptions.

Rank strong evidence.

Recommend one next move.

Then stop.

Only after Sprint 007 is complete should Combie implement its second Relationship slice.
