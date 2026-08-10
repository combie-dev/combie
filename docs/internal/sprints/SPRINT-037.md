# SPRINT-037 — Roadmap / Product Readiness Audit

**Type:** Research / Audit only  
**Status:** Complete  
**Date:** 2026-08-10  
**Production code changed:** None  
**Test / schema changes:** None  

---

## Baseline verification

| Item | Value |
|------|--------|
| Branch | `master` |
| Worktree | Clean |
| HEAD SHA (audit start) | `b85718f6bdebc102d4dfb857c6b1e1ba81e63e23` |
| Sprint 036 implementation | `b288c1e2b729d5af4491e166bd838a4227e1205b` — `feat(investigate): compact related context index with detailed evidence section` |
| Sprint 036 docs | `b85718f6bdebc102d4dfb857c6b1e1ba81e63e23` — `docs(sprint): record Sprint 036 completion` |
| Tests | **607 pass**, 0 fail (55 files) |
| Typecheck | Clean (`tsc --noEmit`) |

Sprint 036 is fully committed and separate from this audit. Baseline accepted.

---

# 1. What Combie is today (repository-grounded)

Combie is a **local-first CLI** that:

1. Connects selected engineering providers with **explicit** credentials  
2. Discovers and normalizes **Resources** into SQLite  
3. Infers a **small set of exact Relationships** when both providers sync successfully  
4. Records **Resource Changes** (name/metadata diffs) and **provider-native evidence** (Vercel deployments, GitHub workflow runs, Neon operations)  
5. Lets a human **inspect and investigate offline** over stored state  

It does **not** yet expose MCP/API, run models, group applications, ingest webhooks, rank attention, form hypotheses, or execute infrastructure.

### Truthful product promise (today)

> Connect Cloudflare, GitHub, Vercel, Sentry, Neon, and PlanetScale once. Combie inventories resources, builds exact cross-provider links it can prove, remembers resource changes and selected provider activity, and composes offline one-hop investigation context for humans via the CLI.

### Claims that must **not** be made yet

- Autonomous infrastructure agent  
- Root-cause / Investigation Engine  
- Incident response platform  
- Learning system  
- MCP-ready agent platform (code path absent)  
- Full Engineering Graph / application model  
- Real-time operational memory via webhooks  

---

# 2. Current product workflow

```text
install (clone + bun install)
    ↓
combie init
    ↓
combie connect <provider>   # explicit token / env / gh
    ↓
combie sync [provider]
    ↓
combie providers | resources | relationships | changes
    ↓
combie history | related | context <resource-id>
    ↓
combie investigate <resource-id>   # offline, read-only
```

### Exact CLI commands

| Command | Purpose | Network |
|---------|---------|---------|
| `init` | Create local state (`.combie` / `--dir` / `COMBIE_HOME`) | Offline |
| `connect <provider>` | Auth + store credentials + mark connected | Network |
| `sync [provider]` | Discover resources, Changes, evidence, relationships | Network |
| `providers` | List connected providers + last sync | Offline |
| `resources` | Inventory (`--provider`, `--kind`) | Offline |
| `relationships` | List edges | Offline |
| `changes` | List Resource Changes | Offline |
| `history <id>` | Current + change history | Offline |
| `related <id>` | One-hop related context | Offline |
| `context <id>` | Current + related + subject changes | Offline |
| `investigate <id>` | Full one-hop investigation composition | Offline |
| `help` | Help text | Offline |

**Resource id:** `provider:kind:providerResourceId`  
Example: `github:repository:1001`, `vercel:project:prj_abc`

### Connect auth surface

| Provider | Flags / env |
|----------|-------------|
| Cloudflare | `--token` / `--use-env` → `CLOUDFLARE_API_TOKEN` |
| GitHub | `--token` / `--use-env` (`GITHUB_TOKEN`/`GH_TOKEN`) / `--use-gh` |
| Vercel | `--token` / `--use-env` → `VERCEL_TOKEN` |
| Sentry | `--token` / `--use-env` → `SENTRY_AUTH_TOKEN` or `SENTRY_TOKEN` |
| Neon | `--token` / `--use-env` → `NEON_API_KEY` |
| PlanetScale | `--use-env` (`PLANETSCALE_SERVICE_TOKEN_ID` + `PLANETSCALE_SERVICE_TOKEN`) or `--token-id` + `--token`; multi-org → `--organization` |

No filesystem / shell-history / `.env` scanning. Credentials file mode `0600`, separate from domain DB.

---

# 3. Current providers, kinds, relationships, evidence

### Providers (registry)

`cloudflare`, `github`, `vercel`, `sentry`, `neon`, `planetscale`  
Source: `src/provider/registry.ts`

### Resource kinds

`worker` | `database` | `kv_namespace` | `zone` | `repository` | `project`  
Source: `src/domain/resource.ts`

| Provider | Kinds |
|----------|-------|
| Cloudflare | worker, database (D1), kv_namespace, zone |
| GitHub | repository |
| Vercel | project |
| Sentry | project |
| Neon | project |
| PlanetScale | database |

### Relationship kinds

| Kind | Direction | Mechanism |
|------|-----------|-----------|
| `source_for` | GitHub repository → Vercel project | `git_repository_reference` (repoId primary; fullName fallback) |
| `uses_domain_in` | Vercel project → Cloudflare zone | `custom_domain_apex` (exact normalized apex) |

No confidence scores, no user overrides, no multi-hop graph CLI.

### Evidence families (provider-native)

| Family | Provider | Sync on | Authority model |
|--------|----------|---------|-----------------|
| Vercel deployments | Vercel | sync | not_applicable / unknown / empty / populated |
| GitHub workflow runs | GitHub | sync | same (+ bounded ≤100 runs) |
| Neon operations | Neon | sync | same |

**Absent as evidence:** Sentry issues/events/releases, Cloudflare operational signals, PlanetScale ops, webhooks, alerts.

### Investigation surfaces (post-036 section order)

```text
SUBJECT
CURRENT
KNOWN FACTS
MISSING CONTEXT
SUBJECT CHANGES
[DEPLOYMENTS | WORKFLOW RUNS | OPERATIONS]   # subject-only if applicable
RELATED CONTEXT                              # compact one-hop index
[SHARED COMMIT CONTEXT]                      # optional exact SHA join
KNOWN PROVIDER ACTIVITY (newest first; incomplete)
COMBIE OBSERVATIONS (newest first)
[DETAILED EVIDENCE]                          # neighbor archives
```

### Persistence / security

| Concern | Behavior |
|---------|----------|
| State dir | `./.combie` default; `0o700` |
| Domain DB | `{state}/combie.db` (SQLite WAL) |
| Credentials | `{state}/credentials` JSON, `0o600` |
| Migrations | Idempotent `CREATE TABLE IF NOT EXISTS` + additive column guards; meta `schema_version` stays `"1"` |
| Secret redaction | Provider errors redact tokens; investigate has no credential path |
| Offline | All list/history/related/context/investigate reads |
| Network | connect + sync only |

### Live verification (sprint records)

| Provider | Live |
|----------|------|
| Cloudflare | Yes (SPRINT-001) |
| GitHub | Yes (SPRINT-002, large inventory) |
| Vercel | Yes (SPRINT-003; identity fix) |
| Sentry | Yes (0 projects account) |
| GitHub↔Vercel relationships | Yes (SPRINT-005) |
| Neon | Fixture-only; live deferred (no key) |
| PlanetScale | Fixture-only; live deferred (no token) |

---

# 4. Roadmap capability matrix (v0.1–v0.5)

Status vocabulary: **IMPLEMENTED** | **PARTIAL** | **NOT STARTED** | **DEFERRED BY EVIDENCE** | **SUPERSEDED BY BETTER PRIMITIVE** | **NOT CURRENTLY EARNED**

### v0.1 — Connection

| Capability | Status | Evidence | Maturity | User-facing | Tests | Live | Beta? | MVP? | Deferred? | Recommendation |
|------------|--------|----------|----------|-------------|-------|------|-------|-------|-----------|----------------|
| Project init | IMPLEMENTED | `src/app/init.ts` | Strong | Y | Y | Y | Y | Y | N | Keep |
| Provider registry | IMPLEMENTED | `src/provider/registry.ts` | Strong | Y | Y | Y | Y | Y | N | Keep |
| Provider authentication | IMPLEMENTED | adapters + `connect.ts` | Strong | Y | Y | Partial (N/PS no live) | Y | Y | N | Harden UX messages |
| Secure credential refs | PARTIAL | file `0600`, not keychain | Usable | Y | Y | Y | Y | Y | Keychain deferred 001 | File OK for beta |
| Resource discovery | IMPLEMENTED | 6 providers | Strong | Y | Y | Partial | Y | Y | N | Keep |
| Synchronization | IMPLEMENTED | multi-provider isolation | Strong | Y | Y | Partial | Y | Y | N | Keep |
| Normalized Resource | IMPLEMENTED | `domain/resource.ts` | Strong | Y | Y | Y | Y | Y | N | Keep |
| Local persistence | IMPLEMENTED | `store.ts` | Strong | Y | Y | Y | Y | Y | N | Keep |
| CLI | IMPLEMENTED | `cli/index.ts` | Strong | Y | Y | Y | Y | Y | N | Docs/README catch-up |
| Railway/Render/Fly | NOT STARTED | — | — | N | N | N | N | N | Roadmap initial unused | Do not block beta |
| Neon / PlanetScale | IMPLEMENTED | adapters 013/014 | Usable (fixture-strong) | Y | Y | N | Optional | Optional | Ahead of “Next” list | Label as optional extras |

### v0.2 — Context

| Capability | Status | Evidence | Maturity | User-facing | Tests | Live | Beta? | MVP? | Deferred? | Recommendation |
|------------|--------|----------|----------|-------------|-------|------|-------|-------|-----------|----------------|
| Relationship model | IMPLEMENTED | `relationship.ts` | Strong (2 kinds) | Y | Y | Partial | Y | Y | N | Keep earning edges |
| Environment model | NOT STARTED | only deploy `target` string | — | N | N | N | N | N | Premature | Wait for feedback |
| Application/service grouping | NOT STARTED | no type/table/CLI | — | N | N | N | N | N | Premature | Not beta blocker |
| Relationship provenance | IMPLEMENTED | `RelationshipEvidence` | Strong | Y | Y | Y | Y | Y | N | Keep |
| Relationship confidence | NOT STARTED | exact-only edges | — | N | N | N | N | N | Exact > score | Do not add yet |
| Deterministic discovery | IMPLEMENTED | 2 resolvers | Strong | Y | Y | Partial | Y | Y | N | Keep exact-only |
| Cross-provider identity | PARTIAL | git id, apex, shared SHA | Usable | Y | Y | Partial | Y | Y | N | Earn joins one-by-one |
| User relationship overrides | NOT STARTED | — | — | N | N | N | N | N | No false-positive pressure yet | Post-beta |
| Graph queries / multi-hop | NOT STARTED | one-hop only | — | N | N | N | N | Partial | Boundary | Accept for beta |
| `combie graph` CLI | NOT STARTED | `relationships`/`related` exist | — | N | N | N | N | N | Superfluous if related works | Optional later |
| `uses_database` | DEFERRED BY EVIDENCE | SPRINT-015 rec D | — | N | research | N | N | N | No safe join | Stay deferred |

### v0.3 — Memory

| Capability | Status | Evidence | Maturity | User-facing | Tests | Live | Beta? | MVP? | Deferred? | Recommendation |
|------------|--------|----------|----------|-------------|-------|------|-------|-------|-----------|----------------|
| Observation model (generic) | DEFERRED BY EVIDENCE | SPRINT-018 | — | N | research | N | N | N | Provider evidence better | Stay deferred |
| Change model | IMPLEMENTED | `change.ts`, `changes` CLI | Strong | Y | Y | Y | Y | Y | N | Keep |
| Provider events | PARTIAL | 3 families, not generic Event | Usable | Y | Y | Partial | Y | Partial | Generic Event not earned 019–022 | Provider-first path |
| Webhook ingestion | NOT STARTED | — | — | N | N | N | N | N | Manual sync enough | Post-beta |
| Periodic sync | NOT STARTED | CLI-only | — | N | N | N | N | N | Operator-driven OK | Post-beta |
| Deployment history | IMPLEMENTED | Vercel deployments | Strong | Y | Y | Partial | Y | Y | N | Keep |
| Alert normalization | NOT STARTED | — | — | N | N | N | N | N | Sentry gap | After MCP or with Sentry evidence |
| Timeline reconstruction | PARTIAL | Provider Activity + Changes separate | Usable | Y | Y | Partial | Y | Partial | No causal merge (023) | Good enough |
| Resource history | IMPLEMENTED | `history` | Strong | Y | Y | Y | Y | Y | N | Keep |
| Operational memory foundation | PARTIAL | evidence+authority | Usable | Y | Y | Partial | Y | Partial | No incidents/outcomes | Sufficient for beta foundation |

### v0.4 — Agent Access

| Capability | Status | Evidence | Maturity | User-facing | Tests | Live | Beta? | MVP Intelligent? | Deferred? | Recommendation |
|------------|--------|----------|----------|-------------|-------|------|-------|------------------|-----------|----------------|
| MCP server | NOT STARTED | docs only | — | N | N | N | **Yes (recommended)** | Y | Intentional anti-speculation | **Highest-value next layer** |
| Agent query tools | NOT STARTED | app methods exist | — | N | N | N | Yes | Y | — | Wrap existing app methods |
| Agent discovery/config | NOT STARTED | — | — | N | N | N | Soft | Y | — | Minimal docs + config sample |
| Combie API foundation | NOT STARTED | — | — | N | N | N | N | Soft | MCP first | After MCP |
| IntelligenceProvider | NOT STARTED | — | — | N | N | N | N | N | Mode B later | After MCP validates value |
| External agent mode | NOT STARTED | — | — | N | N | N | Yes via MCP | Y | — | Mode A first |
| BYO model | NOT STARTED | — | — | N | N | N | N | N | Separate from MCP | After Mode A |

### v0.5 — Investigation (roadmap engine vs repo)

| Capability | Status | Evidence | Maturity | User-facing | Tests | Live | Beta? | MVP Intelligent? | Deferred? | Recommendation |
|------------|--------|----------|----------|-------------|-------|------|-------|------------------|-----------|----------------|
| Investigation CLI / composition | IMPLEMENTED (foundation) | `investigate.ts` 016–036 | Strong | Y | Y | Partial | Y | Y | Engine deferred | **Stop polish** |
| Investigation object (durable) | NOT STARTED | ephemeral context | — | N | N | N | N | Soft | Not earned | Later |
| Investigation Engine | NOT STARTED | — | — | N | N | N | N | N | Premature | Later |
| Graph traversal (multi-hop) | NOT STARTED | one-hop | — | N | N | N | N | Soft | Boundary | Later |
| Recent-change correlation | PARTIAL | shared commit only | Usable | Y | Y | Partial | Soft | Soft | Exact joins only | Earn individually |
| Telemetry adapters | NOT STARTED | Sentry inventory only | — | N | N | N | Soft | Soft | — | Sentry evidence next gap |
| Hypotheses / confidence | NOT STARTED | forbidden by design | — | N | N | N | N | N | Correct deferral | Never pre-MCP hype |
| Slack notifications | NOT STARTED | — | — | N | N | N | N | N | — | Much later |
| Model reasoning | NOT STARTED | — | — | N | N | N | N | N | After Mode A | Later |

### v0.6–v1.0 (summary)

| Area | Status |
|------|--------|
| Operational Memory (incidents/decisions/outcomes) | NOT STARTED — correctly later |
| Learning | NOT STARTED |
| Controlled Execution | NOT STARTED — remain deferred |
| Platform / Provider SDK | NOT STARTED |
| Hosted Combie | NOT STARTED |

---

# 5. Audit findings by area

## 5.1 Connection — beta readiness

**Verdict: Connection is beta-ready for local CLI use of the six providers**, with known caveats.

| Q | Answer |
|---|--------|
| 1. Beta-ready? | **Yes** for core path (CF/GH/Vercel/Sentry); Neon/PS fixture-validated |
| 2. Live verified? | CF, GH, Vercel, Sentry yes; Neon/PS no |
| 3. Fixture-only? | Neon, PlanetScale |
| 4. Actionable errors? | Yes — next-step guidance, redaction |
| 5. Credential setup understandable? | Yes for flags; README outdated |
| 6. Onboarding friction? | Acceptable for technical beta users; README/docs gap dominates |
| 7. Another provider required? | **No** |
| 8. Railway/Render/Fly block beta? | **No** |
| 9. Neon/PS role? | Useful optional differentiators, not required for core loop |
| 10. Hardening before outsiders? | README/quickstart; minor message consistency (PlanetScale display); optional disconnect; dogfood with real tokens |

## 5.2 Context / Engineering Graph

| Missing item | A coherence? | B beta? | C premature? | D research first? | E user feedback? |
|--------------|--------------|---------|--------------|-------------------|------------------|
| Environment model | No | No | Yes | Optional | Yes |
| Application grouping | Improves UX, not correctness | **No** | Partially (2 edges only) | Yes if many islands | **Yes** |
| Confidence | No (exact edges) | No | Yes | No | Maybe |
| User overrides | Not yet | No | Yes until false positives | No | Yes |
| Graph CLI | Nice-to-have | No | Superfluous | No | Maybe |

### Application / service grouping assessment

Current `Resource + Relationship` already delivers value for:

- GitHub ↔ Vercel (`source_for`)  
- Vercel ↔ Cloudflare (`uses_domain_in`)  
- One-hop investigate from any leaf  

It does **not** deliver the roadmap tree:

```text
production-web
├── GitHub repo
├── Vercel project
├── domain
└── Sentry project
```

Sentry/Neon/PlanetScale/Workers remain **inventory islands** unless the user starts from them.

**Recommendation:** Do **not** build Application grouping before beta. Resource+Relationship is enough for a closed-beta aha on the GH↔Vercel↔CF spine. Revisit if beta users repeatedly ask “show me my app.”

## 5.3 Memory

| Q | Answer |
|---|--------|
| 1. Generic Observation still required? | **No** — deferred by 018 with good reason |
| 2. Provider-specific evidence better path? | **Yes** — proven across three families |
| 3. Chronology vs v0.3 promise? | **Partial but useful** — deployments/runs/ops + Changes; not alerts/causal incidents |
| 4. Manual sync enough for beta? | **Yes** |
| 5. Webhooks before beta? | **No** |
| 6. Background sync before beta? | **No** |
| 7. Conspicuously absent events? | Sentry issues/errors/releases; CF ops; PR merge events; deploy ↔ error causality |
| 8. Sentry most obvious gap? | **Yes** for “what went wrong” after “what changed” |
| 9. Memory useful without AI? | **Yes** — CLI investigate is product-useful offline |
| 10. Reconstruct meaningful history? | **Yes, within bounds** — not full incident narratives |

## 5.4 Investigation (`combie investigate`)

| Q | Answer |
|---|--------|
| 1. Product-useful? | **Yes** |
| 2. Readable after 032/036? | **Yes** — index → archive layout |
| 3. Stop formatter work? | **Yes** (SPRINT-036 learning) |
| 4. Top 3 limitations | (1) narrow evidence families (2) one-hop local-only (3) thin exact joins (shared commit only) |
| 5. Gaps vs boundaries | Families/joins = gaps; one-hop/offline/no ranking = acceptable boundaries |
| 6. Broad correlation needed? | **No** |
| 7. Exact joins individually? | **Yes** — Shared Commit validates this |
| 8. Shared Commit validates approach? | **Yes** |
| 9. Sentry evidence > more investigate abstraction? | **Yes** |
| 10. Another investigate sprint before beta? | **No** (not polish; only if new evidence lands) |

## 5.5 Agent Access / MCP

**Repository inspection:** **zero** MCP server, protocol deps, API layer, agent tools, IntelligenceProvider, or model SDKs under `src/`. Mentions are Canon/docs only.

| Q | Answer |
|---|--------|
| 1. Largest roadmap gap? | **Yes** for Intelligent MVP / vision “shared interface for agents” |
| 2. Context mature enough to expose? | **Yes** — deterministic, offline, read-only methods exist |
| 3. Methods ready as tools? | `listProviders`, `listResources`, `getRelatedContext`, `listChanges`/`getResourceHistory`, `getResourceContext`, `getInvestigationContext`, `composeSharedCommitContext`, `composeMissingContext` |
| 4. Not expose yet? | `connectProvider` (creds/interactive), relationship inference mutators, any write/exec |
| 5. Minimum MCP surface? | See §12 |
| 6. Read-only initially? | **Yes** |
| 7. Sync to agents initially? | **Pressure-test: default No for first MCP**; optional later with explicit user policy |
| 8. Writes excluded? | **Yes** |
| 9. Single investigate tool? | **Primary yes** + a few inventory tools |
| 10. Granular vs single? | **Both**: `investigate_resource` primary; granular for agents that prefer smaller calls |
| 11. Provenance? | Return structured DTOs from app methods; do not re-summarize with models inside Combie |

### Agent action boundary

| Class | Examples | Safe now? |
|-------|----------|-----------|
| READ / QUERY | investigate, resources, related, history | **Yes** |
| SYNC | `combie sync` | **Later** — mutates local DB; network; partial failure semantics |
| CONFIGURE | connect provider | **No** for initial MCP — credentials / human authorization |
| MUTATE graph | relationship overrides | **N/A** — not implemented |
| EXECUTE INFRA | deploy/rollback | **Absolutely later** |

## 5.6 BYO model / IntelligenceProvider

| Mode | Exists? | Closed beta? |
|------|---------|--------------|
| **A — External agent via MCP** | No | **Recommended for Intelligent closed beta** |
| **B — Combie-managed model** | No | **Not required** |

**Sequence:** MCP (Mode A) → validate agents gain value → optional smallest `IntelligenceProvider` (Mode B).  
Building both simultaneously would overcomplicate beta.

## 5.7 Sentry / operational signals

Sentry today:

- Connect + discover **projects** only  
- Metadata: slug, org, platform, status, dateCreated  
- **No** issues, events, releases, deploys, code mappings  
- No relationships to other providers  

**Ranked future evidence value (deterministic):**

1. **Issues / issue summaries** (error rate, first/last seen) — bridges “what changed” → “what broke”  
2. **Releases** — join to deploy/commit identity when exact  
3. **Recent error events (bounded)** — evidence, not telemetry warehouse  
4. Deploys (if distinct from releases)  
5. Project health aggregates  

**Verdict:** Highest remaining **operational** gap, but **not** a closed-beta hard blocker if MCP + CLI memory already deliver “what exists / relates / changed.” Prefer **after** first MCP slice unless dogfood proves investigate dead-ends without errors.

## 5.8 Release / distribution readiness

| Q | Answer |
|---|--------|
| How run? | `bun run combie` / bin → `src/cli/index.ts` |
| Clone required? | Effectively yes today |
| Package/binary? | No published package; private package.json |
| Globally installable? | Via local `bun link` only; not documented |
| Runtime docs? | Bun ≥1.1 in README; Node not supported |
| SQLite location? | Predictable `.combie/combie.db` |
| Migrations automatic? | Yes (idempotent schema apply) |
| Credentials portable? | Copy state dir; 0600 file |
| Uninstall/reset? | Delete `.combie`; no `disconnect` CLI |
| Version metadata? | package `0.1.0` only |
| CI? | **No** `.github` workflows |
| Release builds? | No |
| External README? | **Stale** (Sprint 001 Cloudflare-only) |
| Public quickstart? | **No** (`docs/public/` empty) |
| Sample/demo? | No |

**Assessment:** Distribution/docs are **more blocking for outside users** than another provider or more investigate polish.

## 5.9 Security / trust

| Concern | Status | Beta? |
|---------|--------|-------|
| Credential file 0600 + dir 0700 | Implemented | OK |
| Separate credentials vs DB | Implemented | OK |
| Explicit auth only | Implemented | OK |
| Secret redaction in errors | Implemented (provider helpers) | OK |
| Token on CLI flag | Supported with warning | Soft risk — document prefer env |
| No secret harvest | Implemented | OK |
| Domain DB may hold metadata | Expected | Document |
| OS keychain | Deferred 001 | Post-beta OK |
| Logs leaking tokens | Tests assert redaction | OK |

**Beta blockers:** none beyond clear credential UX docs.  
**Post-beta:** keychain, disconnect/rotate CLI, formal threat model.

---

# 6. Ahead of roadmap

1. **Deterministic investigation foundation** before Agent Access (016–036)  
2. **Provider-native evidence families** with authority / last-success / result-count (020–028)  
3. **KNOWN FACTS + MISSING CONTEXT** (025–030)  
4. **Shared Commit Context** exact multi-provider join (034–035)  
5. **CLI density productization** (032, 036)  
6. **Neon + PlanetScale** ahead of roadmap “Next” providers  
7. Depth of refresh provenance beyond v0.3 sketch  

## Behind roadmap

| Item | Product value rank | Beta blocker? |
|------|--------------------|---------------|
| **MCP / Agent Access** | **1 — highest** | **Yes for Intelligent beta** |
| Public/onboarding docs + distribution | **2** | **Yes for any external beta** |
| Full Engineering Graph (app group, multi-hop, environments) | 4 | No |
| Full Memory (webhooks, periodic, alerts) | 5 | No |
| Sentry operational evidence | 3 | Soft (strong differentiator) |
| Investigation Engine / hypotheses | 6 | No |
| BYO model / IntelligenceProvider | 7 | No |
| Railway/Render/Fly/Slack | 8 | No |
| Learning / Execution / Platform | 9 | No |

## Intentionally deferred (earned by evidence)

| Item | Source | Keep deferred? |
|------|--------|----------------|
| Generic Observation product surface | 018 | Yes |
| Generic Event model | 019–022 | Yes |
| Merged Change+provider chronology | 023 | Yes |
| Attention / ranking | 031 | Yes |
| `uses_database` | 015 | Yes |
| Sentry/CF Worker edges without evidence | 007 | Yes |
| Durable association tables | 034–035 | Yes |
| MCP scaffolding without Sprint | AGENTS/SKILL | Until next Sprint authorizes |
| OS keychain | 001 | Post-beta OK |
| Controlled Execution | Canon | Yes |

## Stop building for now

```text
STOP BUILDING FOR NOW
─────────────────────
• Investigation CLI formatter / density polish
• Further KNOWN FACTS refinements without new evidence
• Attention / ranking / “what to inspect next”
• Generic Observation / Event abstractions
• Application grouping scaffolding
• Relationship confidence scores
• User relationship overrides (until false-positive pressure)
• Multi-hop graph engine
• Webhook / background sync infrastructure
• IntelligenceProvider / BYO model client
• Investigation Engine / hypotheses / confidence scoring
• Controlled execution / policies
• Additional providers solely for checklist completeness
• Provider-specific evidence tables “just in case” without a proven join or user pain
```

**Preserve:** exact-only joins, provider-first evidence, dual clocks, authority honesty, offline read composition, anti-speculation.

---

# 7. Closed beta readiness

## MUST HAVE BEFORE CLOSED BETA

1. **External-facing quickstart** (README + multi-provider flow; Bun install; credential matrix)  
2. **Dogfood on a real multi-provider stack** (at least GitHub + Vercel + one of CF/Sentry)  
3. **Read-only MCP surface** *if* beta promise includes agents (recommended)  
4. **Connection UX consistency** (PlanetScale in help/display/sync empty messages; Sentry env naming in help)  
5. **Clear product promise boundary** (what it does / does not do)  
6. **Credential security notes** for beta users  

## SHOULD HAVE DURING CLOSED BETA

1. Optional `disconnect` / credential rotation  
2. Sentry operational evidence (issues or releases)  
3. Minimal agent configuration samples (Cursor/Codex MCP config)  
4. CI for test + typecheck  
5. Better large GitHub inventory ergonomics (filter/search later)  

## CAN WAIT UNTIL AFTER BETA

- Application grouping, environments, confidence, overrides  
- Webhooks, periodic sync  
- BYO model / IntelligenceProvider  
- Investigation Engine / Slack / telemetry warehouse  
- Railway/Render/Fly  
- Learning, execution, provider SDK, hosted control plane  
- OS keychain  

### Beta persona

| Dimension | Definition |
|-----------|------------|
| Who | Startup engineer / product engineer / technical founder |
| Stack | GitHub + Vercel (+ Cloudflare and/or Sentry); optional Neon/PS |
| Agent | Uses Cursor / Codex / Claude Code |
| Sophistication | Comfortable with CLI, tokens, env vars |
| Install tolerance | Clone or `bun install` from repo; no enterprise SSO required |
| Workflow | init → connect 2–4 providers → sync → investigate or agent query |
| Aha moment | “Combie linked my repo to my Vercel project (and domain), showed deploys/runs, and my coding agent answered from that context” |

### Smallest compelling beta loop

```text
install Combie (Bun)
  → init
  → connect GitHub + Vercel (+ optional Cloudflare/Sentry)
  → sync
  → Resources + Relationships + Memory exist
  → human: combie investigate <vercel project>
     OR agent: MCP investigate_resource
  → grounded answer about what exists, relates, and recently happened
  → re-sync as system changes
```

Achievable with current product + **~3–4 focused Sprints** (docs + MCP + release prep).

### Beta blockers (count)

**Hard blockers for Intelligent closed beta: 3**

1. External docs / onboarding  
2. Read-only MCP (agent access)  
3. Real multi-provider dogfood validation  

**Soft blockers (nice before invite): 2**

4. Connection UX consistency  
5. First Sentry operational evidence (optional path)  

**Non-blockers:** application grouping, webhooks, background sync, BYO model, new hosting providers, Investigation Engine, learning, execution.

---

# 8. Product maturity scorecard

### FOUNDATION

| Area | Score | Note |
|------|-------|------|
| Connection | **STRONG** | Six providers; multi-sync isolation |
| Resources | **STRONG** | Stable ids; normalization |
| Persistence | **STRONG** | SQLite + migrations-by-apply |
| Security | **USABLE** | 0600 file; keychain later |

### CONTEXT

| Area | Score | Note |
|------|-------|------|
| Relationships | **USABLE** | Two exact kinds |
| Cross-provider identity | **USABLE** | git id, apex, shared SHA |
| Graph usability | **PARTIAL** | One-hop CLI; no app tree |
| Application grouping | **NOT STARTED** | Intentionally deferred |

### MEMORY

| Area | Score | Note |
|------|-------|------|
| Changes | **STRONG** | Diff + history |
| History | **STRONG** | Per resource |
| Provider events | **USABLE** | Three families |
| Chronology | **USABLE** | Provider Activity + Changes separate |
| Operational signals | **PARTIAL** | Missing Sentry/errors |

### ACCESS

| Area | Score | Note |
|------|-------|------|
| CLI | **STRONG** | Full human surface |
| MCP | **NOT STARTED** | Highest gap |
| API | **NOT STARTED** | After MCP |
| BYO model | **NOT STARTED** | After Mode A |

### INVESTIGATION

| Area | Score | Note |
|------|-------|------|
| Composition | **STRONG** | Offline one-hop |
| Provenance | **STRONG** | Authority honesty |
| Missing Context | **STRONG** | Exhaustive gaps |
| Cross-provider joins | **USABLE** | Shared commit only |
| Operational evidence | **PARTIAL** | No Sentry issues |
| Hypotheses/AI | **INTENTIONALLY DEFERRED** | Correct |

### LATER

| Area | Score |
|------|-------|
| Operational Memory | NOT STARTED |
| Learning | NOT STARTED |
| Controlled Execution | INTENTIONALLY DEFERRED |
| Provider SDK | NOT STARTED |

---

# 9. Positioning and release strategy

### Current truthful positioning

**“Open engineering context layer (local CLI alpha)”** — connect a modern app stack, inventory resources, prove selected relationships, remember changes and provider activity, investigate offline.

### Closed-beta promise (after recommended pre-beta Sprints)

> Connect your stack once. Combie builds a deterministic inventory of resources, exact relationships, and recent provider activity. Humans use the CLI; coding agents query the same context through a **read-only MCP** interface — without Combie owning your model keys.

### Release strategy recommendation

**A then B: DOGFOOD FIRST → PRIVATE CLOSED BETA**

| Phase | Users | Goal |
|-------|-------|------|
| Dogfood | 1–3 (founders/core) | Real stack validation |
| Private closed beta | **5–15** startup engineers with GH+Vercel (+ agent) | Product learning |
| Public alpha | Later | After MCP + docs prove value |

Not public alpha/beta yet (no packaging/CI/docs maturity).

**Feedback questions that matter:**

1. Did Relationships match your mental model?  
2. Did investigate answer something you care about without AI?  
3. Did MCP improve agent answers vs raw provider tools?  
4. What missing context blocked you?  
5. Would you re-sync daily?  

**Continuation signals:** voluntary re-use after week 1; agents actually calling MCP; concrete missing-evidence requests (Sentry, etc.).

---

# 10. Next 3–5 Sprints (exact plan)

Do **not** begin these here. Sequence determined by repository evidence: **stop investigate polish → fix external readiness → expose deterministic context via MCP → invite users**. Sentry evidence is high value but ranks **after** first agent access unless dogfood proves otherwise.

### SPRINT-038 — Beta readiness: docs, UX consistency, dogfood prep

| Field | Content |
|-------|---------|
| Type | Hardening / documentation |
| Goal | Make Combie installable and understandable by an invited technical user without reading internal sprints |
| Why now | README is Sprint-001-era; distribution is the practical gate to any outside use |
| User value | Clear multi-provider quickstart; accurate auth matrix; honest capability boundary |
| Architecture value | None new — align public surface with code |
| Beta blocker? | **Yes** |
| Code areas | `README.md`, maybe `docs/public/QUICKSTART.md`, minor CLI help/list display strings (`planetscale`, Sentry env), no schema |
| Explicitly not | MCP, Sentry evidence, new providers, investigate polish |
| Exit | External user can follow docs end-to-end; typecheck/tests green; secrets docs clear |
| OpenCode Go model | `grok-4.5` (or default) |
| Thinking | Medium |

### SPRINT-039 — MCP foundation (read-only)

| Field | Content |
|-------|---------|
| Type | Implementation |
| Goal | Expose Combie as a local MCP server wrapping existing app read methods |
| Why now | Largest roadmap/product gap; context is mature enough to expose safely |
| User value | “Use Combie from Codex/Cursor to investigate this project” becomes possible |
| Architecture value | MCP as **interface only**; no IntelligenceProvider; no core rewrite |
| Beta blocker? | **Yes** (Intelligent beta) |
| Code areas | new `src/mcp/` (or `src/interfaces/mcp/`), package dep for MCP SDK if justified, wire to `list*` / `getInvestigationContext` / related, CLI entry `combie mcp` or `combie serve` |
| Explicitly not | connect/sync tools, writes, BYO models, HTTP multi-tenant API, schema changes to domain |
| Exit | Local MCP server starts; tools return structured data from fixtures/tests; no secrets in tool output |
| OpenCode Go model | `grok-4.5` |
| Thinking | High |

### SPRINT-040 — MCP tool surface + external-agent validation

| Field | Content |
|-------|---------|
| Type | Implementation + validation |
| Goal | Minimum useful tool set + documented agent configs + end-to-end “agent investigates via Combie” proof |
| Why now | Foundation alone is not product; tools must map to real aha |
| User value | Agent answers grounded in Resources/Relationships/investigate |
| Architecture value | Stabilize tool names around app methods; preserve provenance in responses |
| Beta blocker? | **Yes** |
| Code areas | MCP tools, tests, sample configs, optional structured (non-text-only) investigate DTO |
| Explicitly not | sync/connect tools by default; model client; ranking; multi-hop engine |
| Exit | Documented Cursor/Codex/Claude config; offline tools work; at least one live dogfood agent session recorded |
| OpenCode Go model | `grok-4.5` |
| Thinking | High |

### SPRINT-041 — Closed beta release prep (+ optional soft Sentry spike decision)

| Field | Content |
|-------|---------|
| Type | Release / hardening |
| Goal | Package invite path: versioning note, beta promise doc, known limitations, dogfood checklist, invite criteria |
| Why now | After MCP works, freeze scope and invite |
| User value | Clear expectations; safe credentials guidance |
| Architecture value | None |
| Beta blocker? | **Yes** for invite quality |
| Code areas | docs, maybe CI workflow, package metadata; **optional research** whether Sentry issues are required before invite |
| Explicitly not | Learning, execution, webhooks, app grouping, BYO model |
| Exit | Written beta brief; invite list criteria; green suite; product-status still B→C candidate |
| OpenCode Go model | `grok-4.5` |
| Thinking | Medium |

### SPRINT-042 — Closed beta start (process, not feature)

| Field | Content |
|-------|---------|
| Type | Release |
| Goal | Invite first external cohort (5–15); collect structured feedback |
| Why now | Product loop complete enough for learning |
| User value | Real usage |
| Architecture value | Feedback-driven backlog |
| Beta blocker? | N/A — this **is** beta start |
| Code areas | Bugfixes only from dogfood |
| Explicitly not | New roadmap phases |
| Exit | Invites sent; feedback channel live; no silent scope expansion |
| OpenCode Go model | `grok-4.5` |
| Thinking | Low |

### Optional insert (only if dogfood demands)

**SPRINT-041b — Sentry operational evidence (issues or releases)**  
Insert **between** 040 and 041 only if agent/CLI investigate consistently fails “what went wrong?” questions. Otherwise ship beta and learn.

---

# 11. Where closed beta should start

```text
After Sprint 041 exit conditions:
  ✓ docs quickstart multi-provider
  ✓ read-only MCP with investigate + inventory tools
  ✓ at least one real dogfood stack (GH+Vercel±CF/Sentry)
  ✓ 607+ tests green, typecheck clean
  ✓ written limitations / promise boundary

Then: invite 5–15 persona-matched users (Sprint 042).
```

**Not earlier** if the beta claims agent access.  
**Earlier dogfood-only** (internal) can start immediately with CLI.

---

# 12. Proposed minimum MCP tool surface

*(Design only — not implemented in Sprint 037.)*

| Tool name | Input | Output | Underlying method | R/W | Offline | Network | Safe for beta? | Reason |
|-----------|-------|--------|-------------------|-----|---------|---------|----------------|--------|
| `get_providers` | none / baseDir | provider list | `listProviders` | R | Y | N | Y | Inventory |
| `get_resources` | provider?, kind? | resources | `listResources` | R | Y | N | Y | Inventory |
| `get_resource` | resourceId | resource | Store/get via list or history | R | Y | N | Y | Exact id |
| `get_relationships` | none | edges | `listRelationships` | R | Y | N | Y | Graph spine |
| `get_related_context` | resourceId | one-hop | `getRelatedContext` | R | Y | N | Y | Graph |
| `get_changes` | none or resourceId | changes | `listChanges` / history | R | Y | N | Y | Memory |
| `get_history` | resourceId | history | `getResourceHistory` | R | Y | N | Y | Memory |
| `get_context` | resourceId | composed | `getResourceContext` | R | Y | N | Y | Lightweight |
| **`investigate_resource`** | resourceId | InvestigationContext (+ optional formatted text) | `getInvestigationContext` | R | Y | N | **Y — primary** | Full deterministic package |
| `get_missing_context` | resourceId | gaps | `composeMissingContext` on investigate | R | Y | N | Y | Trust boundaries |
| `get_shared_commit_context` | resourceId | groups | `composeSharedCommitContext` | R | Y | N | Y | Exact join |

**Exclude initially:** `connect_*`, `sync`, any mutate/execute, `query_provider` live fetch, model completion tools.

**Feasibility of aha:**  
“Use Combie to tell me what changed around this Vercel project” → `investigate_resource` → agent reasons over subject changes + deployments + related GitHub runs + shared commits. **Feasible now** once MCP wraps existing methods.

---

# 13. Final decision questions

| # | Question | Answer |
|---|----------|--------|
| 1 | Drifting from vision? | **No major drift.** Investigate-before-MCP is Vision-aligned (“context before intelligence”) but **ROADMAP phase-order divergent**. |
| 2 | Over-engineering? | **Mild risk** on investigation presentation depth (now frozen). Authority model is justified, not waste. |
| 3 | Stop building? | Investigate polish; generic Event/Observation; attention; app grouping; execution; BYO model. |
| 4 | Return to which roadmap part? | **v0.4 Agent Access** (while treating investigate foundation as earned pre-v0.5). |
| 5 | Agent Access highest-value missing? | **Yes** (for intelligent product). |
| 6 | MCP right first surface? | **Yes** — Canon: MCP is interface. |
| 7 | MCP read-only initially? | **Yes**. |
| 8 | Sync to agents initially? | **No** (default). |
| 9 | Connect to agents initially? | **No**. |
| 10 | BYO before/after MCP? | **After** MCP (Mode A first). |
| 11 | Sentry ops beta blocker? | **No** (soft differentiator). |
| 12 | Background/webhook beta blocker? | **No**. |
| 13 | App grouping beta blocker? | **No**. |
| 14 | Another provider beta blocker? | **No**. |
| 15 | investigate good enough? | **Yes** — stop polish. |
| 16 | CLI good enough? | **Yes** for technical users; docs lag. |
| 17 | Mandatory distribution work? | README/quickstart + honest limitations; optional CI. |
| 18 | Smallest compelling beta? | Connect GH+Vercel → sync → investigate / MCP → grounded answer. |
| 19 | Invite first externals? | After Sprint 041 (MCP + docs + dogfood). |
| 20 | Next 3–5 Sprints? | 038 docs → 039 MCP foundation → 040 tools/validate → 041 release prep → 042 invite. |
| 21 | Not before beta? | Execution, learning, BYO model, webhooks, app grouping, Investigation Engine, extra hosts. |
| 22 | Promise today? | Local CLI engineering context inventory + exact links + offline investigate. |
| 23 | Promise at closed beta? | Same + read-only MCP for external agents. |
| 24 | Roadmap modification required? | **No rewrite.** Optional later sequencing note only. |
| 25 | Sequencing adjustment? | Record: investigation foundation landed before Agent Access; next phase returns to Agent Access without undoing investigate. Version labels may remap later. |

---

# 14. Product-status conclusion

## **B — LATE ALPHA / CLOSED-BETA CANDIDATE**

### Why not A (Early Alpha)

- Six real providers with vertical connect/sync  
- Relationships + Change/history + three evidence families  
- Mature offline investigate  
- 607 tests; security baseline  
- Clear product value without AI  

### Why not C (Closed-beta ready now)

- No MCP/agent interface despite vision  
- External README/docs unusable for outsiders  
- Neon/PS not live-verified  
- No CI/release packaging  
- No documented invite path  

### Why not D (Public alpha)

- Private package; no distribution; incomplete graph story; no agent surface  

### Repository evidence summary

```text
Connection ........ STRONG (v0.1 largely done)
Context ........... USABLE thin graph (partial v0.2)
Memory ............ USABLE partial (partial v0.3)
Investigate ....... STRONG foundation (ahead of v0.4; pre-engine v0.5)
Agent Access ...... NOT STARTED (behind v0.4)
Distribution ...... WEAK for outsiders
```

---

# 15. Canon changes

**None required.**

No hard contradiction between Canon invariants and code.  

**Sequencing note (not a Canon rewrite):**  
ROADMAP lists Agent Access before Investigation; repository earned deterministic investigate first. That is compatible with VISION (“intelligence follows understanding”) and SKILL anti-speculation. Do **not** rewrite ROADMAP merely to renumber. Future ROADMAP edit may add a short “implementation sequencing” note after product decision — out of scope for this Sprint unless requested.

**AGENTS.md hygiene (optional, non-blocking):** baseline still says Sprints 001–013/014; reality is 036. May update in a docs hygiene Sprint, not required for Canon.

---

# 16. Completion checklist

| Item | Status |
|------|--------|
| Production code unchanged | ✓ |
| Tests unchanged (still 607) | ✓ (baseline; re-run on complete) |
| Typecheck clean | ✓ |
| Sprint 037 doc only | ✓ |
| Separate commit | ✓ (this Sprint) |
| Do not start 038 | ✓ |

---

# 17. Sprint 037 summary box

| Field | Value |
|-------|--------|
| Product status | **B — LATE ALPHA / CLOSED-BETA CANDIDATE** |
| Hard beta blockers | **3** (docs, MCP, dogfood) |
| Soft blockers | **2** (UX consistency, optional Sentry) |
| Next Sprints | **038 → 039 → 040 → 041 → 042** |
| Beta start point | After **041** exit; invites in **042** |
| Roadmap rewrite? | **No** |
| investigate polish? | **Stop** |
| Highest-value missing layer | **Agent Access / read-only MCP** |
| Canon changes | **None** |

---

## Implemented

- Full repository vs roadmap audit (Sprints 001–036 + live code)  
- Capability matrix v0.1–v0.5  
- Ahead / behind / deferred / stop-building lists  
- Beta persona, loop, blockers  
- Next 3–5 Sprint plan with model/thinking guidance  
- MCP tool surface design (not implemented)  
- Product-status conclusion **B**  

## Deviations

- None from Sprint 037 scope (research-only).  

## Validation

- Baseline: 607 tests, typecheck clean, clean tree at `b85718f…`  
- Final: re-run after docs commit; production/test diff zero  

## Learnings

1. Combie is **product-useful without AI** today — CLI investigate is a real surface, not a stub.  
2. The largest remaining gap vs vision is **not** deeper investigate polish — it is **exposing** what already exists to agents.  
3. Provider-specific evidence + exact joins beat premature Observation/Event/Application abstractions.  
4. Distribution/docs can block beta harder than missing Railway/Fly.  
5. Sentry is the obvious **operational** next evidence family, but **MCP unlocks more product narrative** first.  

## Canon Changes

None.

---

*End of Sprint 037 audit.*
