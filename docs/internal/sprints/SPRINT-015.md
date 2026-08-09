# SPRINT-015 — Application ↔ Database Relationship Evidence Discovery

> **Status:** Complete
> **Depends on:** SPRINT-014 (`f6e4d81`)
> **Type:** Evidence / architecture investigation
> **Production code:** No changes expected
> **Primary question:** Can Combie deterministically prove that an application uses a specific database without reading secrets?
> **New Relationships / providers:** None

## Goal

Determine whether Combie has, or can safely acquire through targeted read-only provider enrichment, deterministic non-secret evidence that proves:

```text
Application ── uses_database ──→ Database Infrastructure
```

Initial scope:

```text
Vercel project
      ↕
deterministic provider evidence
      ↕
Neon project / PlanetScale database
```

Sprint 015 does **not** implement `uses_database`. It decides whether a relationship is justified, what evidence proves it, what semantic that evidence actually supports, and the smallest next implementation.

## Why Now

Combie now understands Cloudflare, GitHub, Vercel, Sentry, Neon, and PlanetScale while retaining the same Resource, Relationship, Change, History, and Context primitives.

Sprints 013–014 deliberately added database context without manufacturing application/database edges.

Follow the successful Sprint 007 pattern:

```text
investigate evidence
→ rank candidates
→ identify targeted enrichment if justified
→ implement only when proof exists
```

## Principle

> **No edge is better than an untrustworthy edge.**

Plausibility, matching names, AI inference, or secret-derived identifiers are not proof. A future edge must be explainable by exact provider-backed facts.

## Relationship Hypothesis

Candidate semantic:

```text
Vercel project ── uses_database ──→ Neon / PlanetScale infrastructure
```

Do not assume `uses_database` is correct. Determine whether evidence proves actual usage, configuration, integration, provisioning, ownership, or merely association.

Possible semantics to evaluate include:

```text
uses_database
configured_with
integrates_with
provisions
references
```

Do not overstate what evidence proves.

## Hard Safety Boundary

Never use, request, decrypt, persist, log, hash, fingerprint, compare, or parse secret values for relationship discovery.

Explicitly excluded:

```text
DATABASE_URL
POSTGRES_URL / POSTGRES_PRISMA_URL
MYSQL_URL
connection strings
database passwords
environment-variable values
.env files / local secret files
Vercel environment secret values
Neon/PlanetScale connection credentials
```

Do not call endpoints whose purpose is to reveal database passwords or credential-bearing connection strings.

## Not Proof

Reject as standalone evidence:

```text
project name == database/project name
repository name == database name
same user/org display name
same region
similar creation date
Git branch == database branch
common metadata strings
AI semantic similarity
```

They may be research hints only.

## Evidence Classes

**A — Direct shared stable identity:** one provider explicitly references the other's stable object or both expose the same stable external identity.

**B — Deterministic join after targeted enrichment:** a small bounded read-only enrichment exposes non-secret facts that produce an exact, explainable join.

**C — Weak / heuristic:** names, labels, ambiguous hostnames, user-controlled strings, fuzzy association. Never implement an edge from C.

**D — Unsafe / invalid:** secrets, connection strings, credential-derived matching, unsafe access, probabilistic/AI inference. Reject.

Do not build confidence scores. Seek a proof contract:

```text
matched because source.fact == target.fact
```

## Investigation Order

1. Audit persisted Vercel, Neon, and PlanetScale metadata.
2. Audit raw API response fields/types/fixtures already fetched but discarded during normalization.
3. Research current official provider APIs/docs for non-secret integration/reference metadata.
4. Evaluate small targeted read-only enrichment candidates.
5. Evaluate whether GitHub can be a deterministic bridge.
6. Determine the exact Relationship semantic supported by strong evidence.

No production implementation.

## Vercel Investigation

Inspect current Vercel adapter + official APIs for non-secret database/integration facts such as Marketplace/integration installation references, project integration configuration, storage/database bindings, provider resource IDs, or project-level external-resource references.

Existing Combie Vercel evidence includes project identity, GitHub link metadata, and custom-domain/apex evidence.

Distinguish an integration installed in an account/project from proof that a specific project uses a specific database.

Do not read environment-variable values.

## Neon Investigation

Use Sprint 013 Evidence Report + current official Neon APIs/docs.

Current Combie shape:

```text
Neon project Resource
  ├── branches
  ├── databases
  └── endpoints
```

Investigate explicit Vercel/application/GitHub/integration identities, installation/config IDs, external references, or safe provider-backed endpoint identity.

Endpoint hostnames are not automatically proof and must never be obtained by parsing secret connection strings.

## PlanetScale Investigation

Use Sprint 014 Evidence Report + current official PlanetScale APIs/docs.

Current shape:

```text
PlanetScale database Resource
  └── branches
```

Investigate explicit Vercel/application/GitHub/integration references, stable external IDs, or targeted endpoints whose documentation indicates strong evidence.

Do not expand into deploy requests merely because they exist. Branch/database names and connection credentials are not proof.

## GitHub Bridge

Combie already knows:

```text
GitHub repository ── source_for ──→ Vercel project
```

Determine whether Neon or PlanetScale exposes a trustworthy stable GitHub repository identity.

A valid bridge requires a stable external repository identity, not owner/name similarity. Also determine whether source association actually proves database usage.

## Existing Metadata Audit

Before external research, produce:

| Provider | Resource | Relevant persisted metadata | Stable external refs | Secret-free? | Potential class |
|---|---|---|---|---|---|
| Vercel | project | ... | ... | ... | ... |
| Neon | project | ... | ... | ... | ... |
| PlanetScale | database | ... | ... | ... | ... |

First answer whether the relationship is already possible with local evidence.

## Raw Response Audit

Repeat the discipline that found Vercel `project.link.repoId` before `source_for`.

For each provider record:

```text
fact exists in API?
already normalized?
safe?
stable?
semantic actually proven?
```

Identify strong facts currently discarded during normalization.

## Targeted Enrichment Bar

Recommend enrichment only when all are true:

1. official read-only API exists
2. evidence is non-secret
3. evidence is stable/deterministic
4. it materially improves proof
5. request volume is bounded
6. permissions are acceptable
7. failure can preserve unknown vs known-empty
8. normalized evidence can remain compact
9. resulting Relationship semantic is clear

Otherwise recommend no enrichment.

## Evidence Matrix

Rank at least:

```text
Vercel ↔ Neon
Vercel ↔ PlanetScale
GitHub bridge ↔ Neon
GitHub bridge ↔ PlanetScale
```

For each include source/target object, exact facts, join rule, class A/B/C/D, current availability, enrichment, request cost, permissions, authority semantics, semantic proven, and verdict.

Use actual evidence only.

## Semantic + Cardinality Review

For every A/B candidate, state exactly what it proves.

Review real cardinality:

```text
one app → one DB?
one app → many DBs?
many apps → one DB?
one Neon project → several logical DBs?
```

A future resolver must tolerate actual provider cardinality.

## Resource Granularity Pressure

Explicitly evaluate the asymmetry:

```text
Neon       → project Resource with logical DBs in metadata
PlanetScale → database Resource
```

If Vercel uses one logical Neon database within a multi-database Neon project, is a Vercel→Neon-project edge precise enough?

Possible findings:

- Neon Project is sufficient as infrastructure target.
- Current Neon granularity is insufficient for a precise database edge.
- The semantic should target infrastructure project rather than logical database.
- Modeling must change before a relationship is implemented.

Do not promote Neon databases to Resources in this Sprint.

## Authority Semantics

For future enrichment define:

```text
known match
known no-match
unknown: enrichment failed
unknown: permission denied
unknown: provider exposes no evidence
```

Temporary evidence unavailability must not cause destructive stale cleanup.

## No Production Code

Expected production diff:

```text
None
```

Allowed change: `docs/internal/sprints/SPRINT-015.md` and only investigation artifacts explicitly permitted by repo conventions.

Do not modify `src/`, tests, schema, CLI, adapters, domain types, or Relationship kinds.

If a serious bug/security issue is discovered, stop and report it rather than folding unrelated work into Sprint 015.

## Repository Understanding Report

Inspect baseline `f6e4d81` first. Identify Relationship model/kinds/evidence/identity; `source_for` and `uses_domain_in` resolvers; refresh/cleanup authority; normalized + raw/fixture Vercel/Neon/PlanetScale evidence; Sprint 013/014 Evidence Reports; Resource granularity; Context presentation; and existing client methods that may expose useful facts.

## Architecture Pressure Report

Answer:

1. Is A/B-class app↔database evidence already persisted?
2. Are adapters discarding strong non-secret identity facts?
3. Does Vercel expose database/integration references without env-secret access?
4. Does Neon expose external integration/application identities?
5. Does PlanetScale?
6. Can GitHub deterministically bridge either?
7. Does evidence prove usage or only configuration/association?
8. Is `uses_database` semantically justified?
9. Is Neon Project granular enough?
10. Is PlanetScale Database granular enough?
11. Is targeted enrichment bounded/safe?
12. What permissions does it require?
13. How are unknown/empty states represented?
14. What cardinalities must a future resolver support?
15. Can existing Relationship/evidence primitives remain unchanged?
16. Can a future resolver remain app-layer?
17. If no A/B evidence exists, exactly what is missing?
18. Does Canon need change?

## Research Requirements

Use current official Vercel, Neon, and PlanetScale docs/API specifications as primary sources. Integration docs may clarify product semantics. Community material may provide hints but cannot establish the evidence contract.

Verify important candidates against official docs or authorized read-only API behavior.

## Live Investigation

If authorized credentials are locally available, perform safe read-only calls only. Never ask the user to paste secrets into chat.

Allowed goals include confirming response shapes, stable IDs, integration/config metadata, and cardinality.

Do not fetch environment values, database credentials, or query data.

Unavailable credentials are a documented validation gap, not permission to invent evidence.

## Security Review

Completion notes must confirm the Sprint did not access:

```text
environment-variable values
database passwords
connection strings
secret stores
application .env files
production query data
```

If the only deterministic join requires secret material, classify it D and reject it.

## Required Final Recommendation

End with **exactly one**:

### A — Implement relationship next
Only if A-class proof exists now. Specify exact semantic, join, source/target, evidence payload, authority, request behavior.

### B — Perform targeted enrichment next
Use when a B-class deterministic path exists. Specify exact endpoint/fact and why.

### C — Change Resource granularity before relationship
Use when strong evidence exists but current Resources cannot express it precisely. Specify minimal modeling pressure only.

### D — Defer app↔database relationship
Use when only C/D evidence exists. State exactly what evidence is missing.

Never recommend heuristics to preserve roadmap momentum.

## Success

This is a successful result:

```text
No trustworthy application ↔ database relationship can currently be proven.
```

The Sprint succeeds when uncertainty is reduced and the next action is evidence-backed.

## Validation

Production code should remain unchanged. Run:

```bash
bun test
bun run typecheck
```

Verify baseline remains green, diff is docs/investigation-only, secret scan clean, no credentials committed, and Sprint 016 not started.

## Explicitly Out of Scope

No `uses_database`, new Relationship/resolver, provider enrichment implementation, Resource-kind changes, Neon DB promotion, PlanetScale branch promotion, `.env`/env-value ingestion, connection parsing, secret hashing, telemetry, SQL/schema discovery, deployment correlation, Investigation/root-cause work, temporal correlation, AI/embeddings/confidence scoring, Learning, MCP/API/SDK/UI, execution, hosted Combie, or Sprint 016 scaffolding.

## Anti-Overengineering

Do not create `DatabaseRelationshipEngine`, `EvidenceScorer`, `CorrelationEngine`, `IntegrationGraph`, `IdentityGraph`, `ConfidenceModel`, or `DatabaseResolver`.

This Sprint is reading, inspecting, documenting, and deciding.

## Canon

VISION, ARCHITECTURE, ROADMAP, and SKILL remain Canon. Update only if research proves an existing statement materially inaccurate.

## Completion Notes

Record:

- Repository Understanding
- Architecture Pressure
- Existing Metadata Audit
- Raw Response Audit
- Provider Research
- Evidence Matrix
- Relationship Semantic Review
- Resource Granularity Review
- Cardinality
- Authority semantics
- Security Review
- Live Investigation
- exactly one Final Recommendation (A/B/C/D)
- Learnings
- Canon Changes

Explicitly answer:

> Can Combie deterministically prove application→database context without touching secrets?

> What is the smallest evidence-backed next step?

Do not define or implement Sprint 016.

## Definition of Done

- [x] inspect `f6e4d81`
- [x] read Neon + PlanetScale Evidence Reports
- [x] inspect existing Vercel evidence/fixtures
- [x] Repository Understanding + Architecture Pressure
- [x] Existing Metadata + Raw Response audits
- [x] official Vercel/Neon/PlanetScale research
- [x] Vercel↔Neon evaluated
- [x] Vercel↔PlanetScale evaluated
- [x] GitHub bridge↔Neon evaluated
- [x] GitHub bridge↔PlanetScale evaluated
- [x] all candidates A/B/C/D classified
- [x] no name-only or secret-derived join accepted
- [x] semantics + Resource granularity + cardinality reviewed
- [x] authority/failure semantics documented
- [x] enrichment permissions/request cost documented if applicable
- [x] security review confirms no secret access
- [x] safe live investigation where credentials allow
- [x] validation gaps explicit
- [x] exactly one A/B/C/D recommendation
- [x] zero production code / Relationship/resolver changes
- [x] tests/typecheck green
- [x] secret scan + diff clean
- [x] Canon accurate
- [x] completion notes updated
- [x] worktree clean
- [x] Sprint 016 not started

## What Sprint 015 Proves

```text
Vercel ── ? ──→ Neon / PlanetScale
```

becomes exactly one of:

```text
deterministic proof exists
safe targeted enrichment can create proof
Resource granularity blocks precise proof
no trustworthy proof exists yet
```

Every outcome is useful.

## Final Principle

> **Relationships are claims about the user's engineering system. Combie should be able to show the evidence behind every claim.**

Inspect what we know.

Inspect what providers expose.

Reject secrets and heuristics.

Find deterministic evidence if it exists.

Choose only the semantic that evidence proves.

Recommend one next step.

Change no production code.

Then stop.

## Completion Notes

### Repository Understanding

- Baseline `f6e4d81` is both the required Sprint 014 commit and the current
  parent commit. Sprint 015 began with only this Sprint document untracked.
- `src/domain/relationship.ts` defines a small provider-independent primitive:
  stable identity is source Resource + kind + target Resource, while compact
  evidence explains the provider fact and mechanism. The only kinds are
  `source_for` and `uses_domain_in`.
- `source_for` is resolved in `src/app/infer-github-vercel.ts` from Vercel's
  exact GitHub repository reference. Numeric `repoId` is primary; exact
  canonical `owner/repo` is used only when Vercel omits the numeric ID. It
  deliberately claims source association, not deployment.
- `uses_domain_in` is resolved in `src/app/infer-vercel-cloudflare.ts` from an
  exact normalized custom-domain apex to Cloudflare zone-name join. It claims
  domain use, not hosting or routing.
- `src/app/sync.ts` owns resolver refresh. `source_for` stale cleanup requires
  both GitHub and Vercel to succeed in the same run. `uses_domain_in` also
  requires both providers, and deletes a project edge only when Vercel domain
  evidence is authoritative; omitted enrichment remains unknown and preserves
  prior evidence.
- The storage layer upserts a Relationship by stable identity and can delete
  only resolver-owned IDs. Context remains an offline one-hop composition of
  the exact Resource, Relationships with evidence and direction, and that
  Resource's Changes. It needs no database-provider special case.
- Vercel, Neon, and PlanetScale adapters own raw API shapes, pagination,
  optional enrichment, secret redaction, and normalization. Application code
  owns generic sync, persistence, Change, History, Context, and resolver
  authority.
- Tests cover stable Relationship identity/evidence, both resolvers, complete
  versus incomplete refresh, known-empty versus unknown enrichment, stale
  cleanup, persistence, CLI rendering, and Context composition.

Sprint readiness: the existing Relationship/evidence/storage/Context
primitives could support another deterministic edge without redesign, and a
future resolver could remain in the application layer. What is missing is not
framework code but an authoritative cross-provider fact. Production modules,
tests, schema, CLI, adapters, Resource kinds, Relationship kinds, and current
resolvers therefore remained untouched.

Canon alignment is intact. Sprint 015 belongs to the deterministic Context
work of v0.2 and applies the Canon's Context Before Intelligence, providers-as-
adapters, credential authorization, evidence provenance, and active-slice
invariants. No Canon conflict or relevant architectural drift was found.

Concrete risks were overclaiming integration as runtime use, treating
installation-wide access as a resource connection, joining user-controlled
names, collapsing failed enrichment into known-empty, targeting a nested Neon
logical database that has no Resource, and accidentally inspecting secret
environment or connection material.

### Architecture Pressure

1. No A/B-class application-to-database evidence is already persisted.
2. Current adapters are not discarding a strong non-secret cross-provider
   identity in their typed responses or fixtures.
3. Vercel exposes non-secret integration configuration and Marketplace
   resource concepts, but the documented account configuration read identifies
   installation-to-project access, not a readable specific project-to-specific
   provider-resource binding.
4. Neon's current public project/branch/database/endpoint reads expose Neon
   identities. Integration/category signals do not expose a Vercel project or
   GitHub repository ID.
5. PlanetScale's current public database/branch reads expose PlanetScale
   identities but no Vercel or GitHub identity.
6. GitHub cannot bridge either database provider because neither exposes a
   stable repository identity matching Combie's GitHub Resource.
7. Official integration guides prove that managed configuration can inject
   database settings into selected Vercel projects. They do not make current
   persisted/provider-API facts prove runtime database use.
8. `uses_database` is not justified. If a future readable connection record
   exists, its safest initial semantic would be `configured_with` (or an equally
   narrow provider-backed configuration semantic), not runtime usage.
9. A Neon Project is sufficient only when evidence identifies project-level
   infrastructure. It is insufficient when evidence identifies one logical
   database nested under a branch.
10. PlanetScale Database is already the correct granularity for a binding to a
    PlanetScale database.
11. No currently verified enrichment clears the full targeted-enrichment bar.
    Vercel configuration listing is bounded and safe but too coarse; the
    Marketplace resource reads are documented for integration installation
    credentials and do not document a customer-account read of per-project
    resource connections.
12. Vercel account/configuration reads require a Vercel access token with the
    correct account/team scope. Marketplace resource reads require the
    installation access token described for the integration provider. Neon and
    PlanetScale list reads use their existing scoped API credentials, but those
    responses lack the needed foreign identity.
13. Future evidence must represent known match, known no-match, unknown due to
    failed request, unknown due to permission denial, and unknown because the
    provider exposes no evidence. Only an authoritative successful complete
    read may support stale cleanup.
14. A future resolver must support one app to many databases, many apps to one
    database, and many-to-many configuration. Neon also permits one project to
    contain multiple logical databases across branches.
15. Existing generic Relationship identity, evidence, persistence, and Context
    presentation can remain unchanged in principle; evidence fields/kinds are
    Sprint-specific production decisions and were not changed here.
16. A future resolver can remain application-layer orchestration over compact
    provider metadata, as the current resolvers do.
17. The exact missing fact is an official, readable, non-secret record that
    binds one stable Vercel project ID (or exact GitHub repository ID) to one
    stable Neon project/logical-database ID or PlanetScale database ID, with
    documented authority and semantics.
18. Canon does not need change.

### Existing Metadata Audit

| Provider | Resource | Relevant persisted metadata | Stable external refs | Secret-free? | Potential class |
|---|---|---|---|---|---|
| Vercel | `project` | Native project ID/name, account ID, framework, timestamps, compact GitHub link, authoritative custom domains | GitHub numeric `repoId`; domain apex | Yes | A for existing GitHub/domain edges; none for databases |
| Neon | `project` | Native project ID/name, region, Postgres version, org facts, creation time, branches, default-branch logical databases, endpoints | None outside Neon | Yes; endpoint host excluded | No app/DB candidate |
| PlanetScale | `database` | Native database ID/name, engine, region, readiness, default branch, branch counts and compact branches | None outside PlanetScale | Yes; hosts/passwords excluded | No app/DB candidate |

Local answer: Combie cannot create an A/B-class Vercel-to-Neon or
Vercel-to-PlanetScale edge from persisted evidence. Matching project/database
names, organizations, branches, regions, or timestamps remains class C.

### Raw Response Audit

| Provider object | Fact exists in current response/fixture but is discarded | Safe/stable? | Semantic proven | Verdict |
|---|---|---|---|---|
| Vercel project link | GitHub owner ID, production branch, Git credential ID, deploy hooks | Some stable, all Git/Vercel-local | Git authorization/source configuration only | No database join |
| Vercel project domain | Project ID, verification and domain configuration details | Safe; project ID repeats request ownership | Project/domain configuration | No database join |
| Neon project | Platform/provisioner, owner ID, creation source, proxy host, usage/state fields | Owner ID is Neon-local; proxy host is sensitive | Neon ownership/operation only | No database join; host D |
| Neon branch | Project/parent IDs, primary/state/source/timestamps | Stable Neon hierarchy refs | Neon hierarchy only | No external join |
| Neon logical database | Numeric ID, branch ID, timestamps | Stable provider-local facts | Precise Neon hierarchy | Granularity evidence, not app evidence |
| Neon endpoint | Project ID, region/state/autoscaling and host | IDs internal; host sensitive | Compute hierarchy/operation | No external join; host D |
| PlanetScale database | Provider URLs, region details, timestamps, plan/state/feature fields | Mostly safe but provider-local/noisy | PlanetScale identity/operation | No external join |
| PlanetScale branch | Provider URLs, actor/operation fields and connection addresses | IDs internal; addresses secret-adjacent | Branch operation/connection infrastructure | No app join; addresses D |

The audit repeated the Sprint 007 `project.link.repoId` discipline. It found no
equivalent strong foreign database/application identity already being fetched
and discarded.

### Provider Research

Research used current official documentation and provider-owned API/SDK
specifications only for conclusions.

#### Vercel

- Vercel's current REST API lists integration configuration reads and a
  `Connect Integration Resource to Project` write. The provider-owned SDK
  documents configuration responses with stable `icfg_*` IDs, integration
  identity/slug, and a `projects` array of Vercel project IDs. This proves the
  installation has access to or is configured for projects; it does not name a
  specific database resource for each project.
- The Marketplace API models an integration resource with a third-party
  provider `id`, Vercel `internalId`, product ID, name, status, and metadata.
  Its read endpoints are scoped by installation ID. Vercel documents the
  bearer credential as the access token received by the integration provider
  during installation, not as an ordinary customer account inventory contract.
- The documented resource-connect write establishes that Vercel internally
  has a project/resource connection. No current official customer-readable
  GET response was verified that returns both the stable Vercel project ID and
  the specific provider resource ID for all connected resources. A write
  endpoint is not evidence Combie may safely read.
- `vercel integration list [project]` demonstrates a project-scoped user
  experience, but its public documentation does not specify an authoritative
  response contract or guarantee that the displayed provider ID equals Neon's
  project ID or PlanetScale's database ID.

Sources: [Vercel REST API](https://vercel.com/docs/rest-api),
[provider-owned SDK integration operations](https://github.com/vercel/sdk/blob/main/docs/sdks/integrations/README.md),
[configuration response](https://github.com/vercel/sdk/blob/main/docs/models/getconfigurationsresponsebody.md),
[Marketplace resource read](https://vercel.com/docs/integrations/create-integration/marketplace-api/reference/vercel/get-integration-resource),
and [Integrations REST API authentication](https://vercel.com/docs/integrations/create-integration/marketplace-api).

#### Neon

- Neon's public API retrieves Projects, Branches, Databases, and Endpoints with
  Neon-native identities. The current API describes logical databases as
  branch-owned objects.
- Official transfer behavior acknowledges that a Neon project can have GitHub
  or Vercel integrations installed, but exposes no external installation,
  project, or repository ID. It is also a write endpoint and is not an
  acceptable discovery probe.
- Neon product documentation says the native Vercel integration connects a
  Vercel project to a Neon database and may create preview branches. This
  establishes product semantics, not a public read contract that Combie can
  join without secret material.
- Manual connection documentation depends on connection strings and is class D
  for this Sprint.

Sources: [Neon API reference](https://api-docs.neon.tech/reference/getting-started-with-neon-api),
[retrieve project](https://api-docs.neon.tech/reference/getproject),
[project transfer integration constraint](https://api-docs.neon.tech/reference/transferprojectsfromorgtoorg),
and [Neon native Vercel integration](https://neon.com/blog/neon-vercel-native-integration).

#### PlanetScale

- PlanetScale's public API database/branch contracts expose PlanetScale-native
  objects and scoped permissions, not application or integration foreign IDs.
- The official Vercel integration guide explicitly lets a user select a Vercel
  project and a PlanetScale database, supports multiple databases per project,
  and removes/regenerates environment settings when configuration changes.
  That strongly defines a configuration relationship in the product, but the
  documented PlanetScale API does not expose that binding as a read-only
  object.
- Manual setup requires a password/connection URL and is class D.

Sources: [PlanetScale API documentation](https://planetscale.com/docs/api),
[database API reference](https://planetscale.com/docs/api/reference/get_database),
and [PlanetScale/Vercel integration guide](https://planetscale.com/docs/vitess/tutorials/nextjs-deploy-to-vercel).

### Evidence Matrix

| Candidate | Exact facts / proposed join | Class | Available now? | Enrichment, cost, permissions, failure semantics | Cardinality / authority | Semantic actually proven | Verdict |
|---|---|---:|---|---|---|---|---|
| Vercel ↔ Neon, persisted/raw | Vercel project ID or GitHub repo ID has no matching Neon external fact | C/D alternatives only | No | None safe; secret connection data rejected | Unknown | Names suggest association at most | Reject |
| Vercel configuration ↔ Neon installation | Configuration `projects[]` + integration slug/category | C | Readable from Vercel account, not currently fetched | One bounded configuration list; Vercel account/team scope; 403/failure must be unknown | One installation may cover many projects/resources | Integration installed/authorized for project(s), not a specific Neon project | Reject as edge |
| Vercel Marketplace project/resource connection ↔ Neon project | Desired exact join: Vercel project ID + provider resource ID == Neon project ID | Potential B, not established | No verified read contract or ID equivalence | Would require configuration list plus per-installation/resource reads; installation-provider credential documented; permission/404/failure unknown | Many-to-many | At best `configured_with`; not runtime use | Defer pending official readable contract, so not B now |
| Vercel ↔ PlanetScale, persisted/raw | Vercel project ID has no matching PlanetScale external fact | C/D alternatives only | No | None safe; connection URL/password rejected | Unknown | Names suggest association at most | Reject |
| Vercel configuration ↔ PlanetScale installation | Configuration `projects[]` + PlanetScale integration identity | C | Potential installation association only | One bounded configuration list; correct team scope; failure unknown | Installation can span projects/databases | Integration access, not specific database | Reject as edge |
| Vercel/PlanetScale product configuration | Official UI selects exact Vercel project and PlanetScale database | Potential B, not established as API evidence | Product behavior yes; readable API fact no | No official read-only binding endpoint verified | One app→many DB and many app→one DB allowed | `configured_with` if a record becomes readable | Defer |
| GitHub bridge ↔ Neon | Exact GitHub repository ID required on Neon project | No A/B | No | No official read enrichment found | Could be many-to-many | Source/integration association only | Reject |
| GitHub bridge ↔ PlanetScale | Exact GitHub repository ID required on PlanetScale database | No A/B | No | No official read enrichment found | Could be many-to-many | Source/integration association only | Reject |
| Name/org/region/branch/time matches | User-controlled or common strings | C | Yes | No enrichment justified | Ambiguous | Plausibility only | Never implement |
| Env values, connection strings, hosts, credentials or hashes | Secret-derived comparison | D | Explicitly prohibited | Unsafe and excluded | Irrelevant | Could leak connectivity but violates trust | Reject |

### Relationship Semantic Review

No current evidence supports `uses_database`. Runtime usage would require
runtime/query/connection evidence outside this Sprint and would still need a
safe authority model. A provider-backed Vercel Marketplace connection record,
if exposed with exact project and provider resource IDs, would support the
narrower `configured_with` semantic: the database resource is configured for
that Vercel project. An installation configuration without a resource ID
supports only installation access/association and is too coarse for a
Resource-to-Resource edge. Provisioning would require evidence that Vercel
created the database; neither current response proves that. A GitHub identity,
if later exposed, would prove source/integration association, not runtime use.

### Resource Granularity Review

PlanetScale's `database` Resource is precise enough for a future exact
project-to-database configuration record.

Neon's `project` Resource is truthful only when the provider record identifies
the Neon Project as database infrastructure. It can support a semantic such as
`configured_with` Neon infrastructure without claiming which logical database
is used. If strong evidence instead identifies a logical database ID/name on a
specific branch, targeting the parent Project would lose material precision;
the current Resource model could not express that exact database edge. That is
real modeling pressure, but no strong application-binding evidence exists now,
so recommendation C would be premature. No Resource model changed.

### Cardinality

- One Vercel project may be configured with multiple databases.
- One database may be configured into multiple Vercel projects.
- One integration installation may cover multiple projects and resources.
- One Neon Project contains multiple branches, and each branch may contain
  multiple logical databases; preview integrations may create per-deployment
  branches.
- PlanetScale's selected object is already a first-class Database, while its
  branches remain nested metadata.

A future resolver must be many-to-many and must not collapse installation,
project, resource, branch, or logical-database cardinality.

### Authority Semantics

- **Known match:** a successful authoritative read returns the exact Vercel
  project ID and exact provider resource ID, and that provider ID matches one
  current Neon/PlanetScale Resource identity under documented semantics.
- **Known no-match:** a complete successful authoritative listing for the
  relevant project/installations returns no binding.
- **Unknown — enrichment failed:** preserve previously supported evidence; do
  not delete.
- **Unknown — permission denied:** preserve evidence and report the required
  account/team/installation scope; do not convert 403 to empty.
- **Unknown — provider exposes no evidence:** create no edge and do not infer
  from names or secrets.

Cleanup must be resolver-owned, require complete successful reads of all facts
participating in the join, tolerate partial per-installation failure, and never
delete from a merely missing optional key.

### Security Review

Sprint 015 did not access, request, decrypt, persist, log, hash, fingerprint,
compare, or parse environment-variable values, database passwords, connection
strings, Vercel environment values, Neon/PlanetScale credentials, application
`.env` files, local secret stores, or production query data. No credential-
revealing endpoint was called. Hosts and connection addresses were classified
as D and rejected. Documentation examples containing redacted placeholder
connection syntax were not copied into the investigation findings.

### Live Investigation

No provider API calls were made. The repository contains a local Combie state
directory, but accessing its credential store would violate this Sprint's
explicit security-review boundary; no credentials were separately authorized
for Sprint 015. Current official API/SDK specifications, product documentation,
and deterministic repository fixtures were used instead.

The live-validation gap is material: a safely authorized Vercel account with a
real Neon or PlanetScale integration could confirm whether any undocumented or
under-documented customer-readable response returns a project/resource pair
and whether the provider resource ID equals Combie's native database Resource
ID. Until official documentation or authorized response evidence establishes
that contract, Combie must treat it as unknown, not B-class proof.

### Final Recommendation — D: Defer application ↔ database relationship

Only C/D evidence is currently available. Combie is missing an official,
readable, non-secret record that binds an exact Vercel project ID (or exact
GitHub repository ID) to an exact Neon Project/logical database ID or
PlanetScale database ID. Installation/project access is too coarse; names and
hostnames are heuristic; environment and connection material is prohibited.

The smallest evidence-backed next step is to wait for or obtain documented,
authorized read-only provider evidence of a specific project/resource binding,
then repeat this proof-contract review. Do not implement `uses_database`, do
not add enrichment based only on integration installation lists, and do not
change Neon Resource granularity before strong evidence identifies the target
object.

### Learnings

Combie cannot currently prove application-to-database context without touching
secrets. Provider integration products do maintain meaningful configuration,
but the public customer-readable APIs inspected here do not expose a complete
specific binding that Combie can join to its database Resources. Product UI
behavior and installation identity are not substitutes for an authoritative
Resource-to-Resource fact.

The existing architecture is not the blocker. Relationship identity,
provenance, resolver ownership, unknown/empty preservation, generic storage,
and Context presentation remain adequate. Evidence availability and, for a
logical Neon database, target granularity are the unresolved constraints.

### Validation

- Production diff: none.
- Sprint 016: not started or scaffolded.
- Full regression passed: 378 tests, 1,492 expectations, 30 files.
- `bun run typecheck` passed.
- `git diff --check` passed.
- A targeted credential-pattern scan of the Sprint artifact found no token,
  authorization-header value, password-bearing PostgreSQL/MySQL URI, or common
  provider-key pattern. Prohibited secret sources were never opened.
- `git diff --quiet f6e4d81 -- src tests` confirmed zero production/test diff.
- Complete diff review found only this Sprint report, exactly one completion
  recommendation, no Sprint 016 scaffold, and no temporary artifacts.
- Commit and clean-worktree verification follow this report update.

### Canon Changes

None. VISION, ARCHITECTURE, ROADMAP, and SKILL remain accurate.
