# SPRINT-038 — Beta Readiness: Docs, UX Consistency, and Dogfood Prep

> **Status:** Planned
> **Depends on:** SPRINT-037
> **Type:** Hardening / documentation / launch preparation
> **Primary goal:** Make Combie understandable, installable, and usable by an invited technical user without requiring access to internal Sprint history or repository knowledge.
> **Product phase:** Closed-beta launch arc
> **Production architecture:** No new capability
> **Storage / schema:** No changes expected
> **Provider APIs:** No changes expected
> **MCP:** Not implemented in this Sprint
> **New provider support:** None
> **Investigation features:** Frozen
> **Beta blocker:** Yes

---

# Goal

Sprint 037 completed the Roadmap / Product Readiness Audit.

Its product-status conclusion was:

> **B — LATE ALPHA / CLOSED-BETA CANDIDATE**

The audit identified three hard blockers for the recommended intelligent closed beta:

```text
1. External documentation / onboarding
2. Read-only MCP Agent Access
3. Real multi-provider dogfood
```

Sprint 038 addresses the first blocker and prepares the third.

It does NOT begin Agent Access.

The purpose of Sprint 038 is:

> **A technically capable engineer who knows nothing about Combie should be able to understand what it is, install/run it, connect a supported stack, sync it, inspect the resulting context, and know what Combie does and does not claim.**

The user should not need:

```text
internal Sprint docs
internal architecture history
knowledge of provider implementation details
knowledge of Combie's development chronology
```

to succeed.

---

# Core Principle

> **Document the product that exists, not the product we intend to build.**

And:

> **The first external experience starts before MCP. If setup is confusing, agent access will not save it.**

---

# Baseline

Begin from the clean committed Sprint 037 baseline.

Expected Sprint 037 commit:

```text
f013a7d603d76337ae93e7d6a591ddabbc6336e3
docs(sprint): complete Sprint 037 roadmap and product readiness audit
```

Verify:

```bash
git status
git log -5 --oneline
bun test
bun run typecheck
```

Expected:

```text
607 tests passing
typecheck clean
worktree clean
```

Record:

- exact current HEAD SHA
- branch
- Sprint 037 SHA
- test count
- typecheck result
- worktree state

If Sprint 037 is incomplete or the worktree is dirty:

**STOP.**

Do not combine Sprint 037 and Sprint 038.

---

# Sprint 037 Decisions Are Inputs

Sprint 038 should treat the following as settled unless implementation reveals a concrete correctness issue.

## Product status

```text
Late Alpha / Closed-Beta Candidate
```

## Current truthful product

Combie is a:

```text
local-first engineering context CLI
```

that can:

```text
connect providers
discover Resources
infer exact Relationships
record Changes
persist selected provider-native evidence
compose offline deterministic investigation context
```

## Supported providers

Verify from repository, but Sprint 037 found:

```text
Cloudflare
GitHub
Vercel
Sentry
Neon
PlanetScale
```

## Agent Access

Not implemented.

Do not claim:

```text
MCP
API
agent tools
BYO model
AI reasoning
```

exist yet.

## Investigation

Product-useful enough.

Stop formatter/investigation polish.

## Not beta blockers

Do not add:

```text
Application grouping
Environment model
Webhooks
Background sync
Railway
Render
Fly.io
BYO model
Investigation Engine
Learning
Controlled Execution
```

---

# Repository Understanding

Before editing documentation or help copy, inspect the actual repository.

At minimum inspect:

- `README.md`
- `package.json`
- CLI entrypoint
- help command
- `init`
- `connect`
- `sync`
- `providers`
- `resources`
- `relationships`
- `changes`
- `history`
- `related`
- `context`
- `investigate`
- provider registry
- provider auth options
- supported environment variables
- state directory handling
- credential store
- permission behavior
- SQLite location
- provider-specific connection flags
- tests covering CLI help/errors
- current public docs directory
- `.gitignore`
- any install/release scripts
- current package/bin configuration

Produce a concise Repository Understanding report before editing.

Explicitly answer:

1. How does a new user run Combie today?
2. Does installation require cloning the repository?
3. Is `bun run combie` the canonical current path?
4. Is `bun link` viable?
5. Is Combie published anywhere? Expected: no.
6. What Bun version/runtime requirement exists?
7. What exact CLI commands exist?
8. Which flags exist for each command?
9. Which environment variables exist for each provider?
10. What is the default state directory?
11. How can users override it?
12. Where is the database stored?
13. Where are credentials stored?
14. What permissions are applied?
15. How does a user reset local Combie state?
16. Is there a disconnect command? Expected: no.
17. What exact Resource ID syntax is used?
18. Which providers have provider-specific caveats?
19. Which current README claims are stale or wrong?
20. Which CLI help strings are inconsistent with implementation?
21. Can all required Sprint 038 work remain docs/help/hardening only?

No documentation changes before this report.

---

# Primary Deliverable 1 — Rewrite README for the Current Product

The existing README is Sprint-001-era and no longer represents Combie.

Replace it with an external-facing README.

The README must be written for:

```text
startup engineer
product engineer
technical founder
AI-assisted developer
```

who is comfortable with:

```text
CLI
environment variables
provider API tokens
Bun
```

but has never heard of Combie before.

---

# README Required Structure

The exact headings may adapt to repository conventions, but the README must cover the following jobs.

---

## 1. What is Combie?

Use current truthful positioning:

> **Combie is an open engineering context layer.**

Explain in plain product terms.

Conceptually:

```text
Connect your engineering stack once.

Combie discovers Resources across providers, builds exact Relationships it can
prove, remembers Changes and selected provider activity, and lets you inspect
that context locally.
```

Do not lead with architecture terminology.

Do not describe future AI capabilities as current.

---

## 2. Why Combie?

Explain the problem:

Engineering context is fragmented across:

```text
GitHub
deployment providers
domains
databases
observability tools
```

Humans and agents otherwise reconstruct context manually.

Combie creates a shared deterministic local layer.

Avoid hype.

Do not claim:

```text
root cause
autonomous remediation
real-time incident response
complete graph
```

---

## 3. Current Capabilities

Document only actual capabilities.

Expected categories:

```text
Provider connections
Resource inventory
Exact Relationships
Resource Changes
History
Context
Investigation
Provider-native evidence
Offline reads
Shared Commit Context
```

Verify exact implementation.

---

## 4. What Combie Does Not Do Yet

This section is required.

Include truthful boundaries such as:

```text
No MCP yet
No AI/model reasoning
No autonomous execution
No webhook/background sync
No complete application graph
No root-cause claims
No generic correlation engine
```

This protects trust and sets beta expectations.

---

## 5. Supported Providers

Create an accurate table.

For each provider include:

```text
Provider
Resource kinds
Auth method
Environment variable(s)
Evidence support
Live verification note only if appropriate for public docs
```

Do not overload README with internal Sprint status.

Likely public table:

```text
Cloudflare
GitHub
Vercel
Sentry
Neon
PlanetScale
```

Use repository truth.

---

## 6. Requirements

Document:

```text
Bun version
supported OS assumptions if known
Git if required
provider credentials
```

Do not invent Node support.

---

## 7. Installation / Running

Document the actual supported path TODAY.

If repository is not published, say so clearly.

Example concept:

```bash
git clone ...
cd combie
bun install
bun run combie --help
```

If `bun link` is tested and safe, optionally document it.

Do not pretend:

```bash
bun add -g combie
npm install -g combie
brew install combie
```

exists if it does not.

---

## 8. Quickstart

The README must contain a short successful path.

Minimum recommended core:

```text
GitHub + Vercel
```

Optional third provider:

```text
Cloudflare
```

Example conceptual flow:

```bash
bun run combie init

export GITHUB_TOKEN=...
bun run combie connect github --use-env

export VERCEL_TOKEN=...
bun run combie connect vercel --use-env

bun run combie sync

bun run combie providers
bun run combie resources
bun run combie relationships
```

Then show how to obtain/use a Resource ID.

Then:

```bash
bun run combie investigate <resource-id>
```

Use actual syntax.

Do not fabricate example IDs inconsistent with provider Resource identity.

---

## 9. Resource IDs

Explain:

```text
provider:kind:providerResourceId
```

Examples:

```text
github:repository:...
vercel:project:...
cloudflare:zone:...
```

Explain that exact IDs are used intentionally.

No fuzzy name resolution.

---

## 10. Core Commands

Create a concise command table:

```text
init
connect
sync
providers
resources
relationships
changes
history
related
context
investigate
help
```

Use repository truth.

Document whether command is:

```text
offline
networked
read-only
mutating local state
```

where helpful.

---

## 11. How Sync Works

Explain simply:

```text
connect stores credentials locally
sync queries connected providers
Resources/evidence are persisted to SQLite
relationships are inferred only when exact evidence exists
offline commands read local state
```

Explain that Combie is not real-time today.

Manual sync is expected.

---

## 12. Investigation

Explain what:

```bash
combie investigate <resource-id>
```

does.

Use the post-Sprint-036 surface.

Do not list every internal DTO.

Describe:

```text
current state
known facts
missing context
changes
related resources
provider activity
shared commit context when available
detailed evidence
```

Emphasize:

```text
deterministic
read-only
offline
provenance-backed
```

Do not claim hypotheses/root cause.

---

## 13. Credentials and Security

Required.

Explain:

```text
state directory
credentials file
0600
state dir 0700
credentials separate from SQLite
prefer environment variables over CLI token flags
tokens are not included in investigation output
```

Document risk of command-history exposure when using token flags.

Do not oversell security.

State that OS keychain integration is not currently used if relevant.

---

## 14. State Directory

Document:

```text
./.combie
COMBIE_HOME
--dir
```

based on actual implementation.

Explain files conceptually.

Example:

```text
.combie/
├── combie.db
└── credentials
```

Verify exact filenames.

Explain reset:

```text
delete the local state directory
```

only if correct.

Include warning:

```text
this removes local Combie state and stored credentials
```

---

## 15. Provider Setup

README may keep this concise and link to a dedicated Quickstart/provider section.

At minimum document exact env vars.

---

## 16. Development

Keep contributor commands:

```bash
bun install
bun test
bun run typecheck
```

Use actual scripts.

---

## 17. Status

State honestly:

```text
Late alpha / preparing for closed beta
```

Do not call it production-ready.

---

# Primary Deliverable 2 — Public Quickstart

Create:

```text
docs/public/QUICKSTART.md
```

unless repository conventions suggest a different external docs location.

This should be more procedural than README.

Target:

> A technically capable invited beta user should complete the setup without asking us how Combie works.

---

# Quickstart Flow

Use a core stack:

```text
GitHub + Vercel
```

with optional:

```text
Cloudflare
Sentry
```

and a secondary optional section for:

```text
Neon
PlanetScale
```

Do not require all six providers.

---

## Quickstart Step 1 — Install

Use actual supported install path.

---

## Step 2 — Initialize

Example:

```bash
bun run combie init
```

Explain resulting state directory.

---

## Step 3 — Connect GitHub

Prefer env flow.

Document:

```text
GITHUB_TOKEN
GH_TOKEN
--use-gh
```

according to actual implementation.

Clearly distinguish alternatives.

Do not tell users to set both variables.

---

## Step 4 — Connect Vercel

Document:

```text
VERCEL_TOKEN
```

and exact command.

---

## Step 5 — Optional Cloudflare

Document:

```text
CLOUDFLARE_API_TOKEN
```

Use minimum required permission guidance only if supported by repository/docs.

Do not invent exact permission scopes if not documented.

If scope guidance is unknown, state that the user needs a token capable of the
discovery endpoints Combie currently calls.

---

## Step 6 — Optional Sentry

Document exact environment variable names accepted.

Sprint 037 found current support for:

```text
SENTRY_AUTH_TOKEN
SENTRY_TOKEN
```

Verify actual code.

---

## Step 7 — Sync

```bash
bun run combie sync
```

Explain partial provider failure behavior.

A failed provider should not invalidate successfully synced providers.

---

## Step 8 — Inspect Inventory

```bash
bun run combie providers
bun run combie resources
bun run combie relationships
```

Explain what a user should expect.

---

## Step 9 — Choose a Resource

Show how to copy an exact Resource ID from output.

---

## Step 10 — Investigate

```bash
bun run combie investigate <resource-id>
```

Explain useful starting targets:

```text
Vercel project
GitHub repository
```

especially where `source_for` may exist.

---

## Step 11 — Re-sync

Explain:

```text
Combie is currently operator-driven.
Run sync again when you want Combie to observe provider changes.
```

No background daemon.

No webhook claims.

---

# Primary Deliverable 3 — Provider Credential Matrix

Include in README or Quickstart, but maintain one canonical detailed matrix.

Verify exact code.

Expected:

| Provider | Env | Alternative |
|---|---|---|
| Cloudflare | `CLOUDFLARE_API_TOKEN` | `--token` |
| GitHub | `GITHUB_TOKEN` / `GH_TOKEN` | `--token`, `--use-gh` |
| Vercel | `VERCEL_TOKEN` | `--token` |
| Sentry | `SENTRY_AUTH_TOKEN` / `SENTRY_TOKEN` | `--token` |
| Neon | `NEON_API_KEY` | `--token` |
| PlanetScale | service token id + token | explicit flags |

For PlanetScale also document:

```text
--organization
```

when required.

Do not silently select the first organization.

---

# Primary Deliverable 4 — CLI Help Consistency Audit

Sprint 037 found minor user-facing inconsistency.

Audit every current CLI help surface.

Check:

```text
provider names
environment variable names
supported connect flags
error messages
empty states
PlanetScale display naming
Sentry env variable naming
```

Fix only clearly incorrect/inconsistent user-facing strings.

Do not refactor CLI architecture.

Do not change semantics.

---

# PlanetScale UX

Audit:

```text
help
provider display
connect guidance
empty sync messages
credential guidance
organization handling
```

Ensure naming consistently uses:

```text
PlanetScale
```

for display and:

```text
planetscale
```

for CLI/provider ID where appropriate.

Do not alter provider identity.

---

# Sentry UX

Audit env naming against actual implementation.

If code supports both:

```text
SENTRY_AUTH_TOKEN
SENTRY_TOKEN
```

public docs/help should represent that accurately.

Prefer one as recommended while documenting the fallback if appropriate.

Do not change auth semantics solely for wording.

---

# Primary Deliverable 5 — Product Promise Boundary

Create a small public-facing section or document that clearly distinguishes:

```text
WHAT COMBIE DOES TODAY
```

from:

```text
NOT YET
```

This may live in README rather than a separate file.

Required truthful current capabilities:

```text
local-first
multi-provider
exact deterministic relationships
resource history
provider activity
offline investigation
```

Required non-capabilities:

```text
not real-time
not autonomous
not root-cause engine
not MCP yet
not AI reasoning
not complete graph
not execution
```

Do not hide limitations.

They are part of the trust model.

---

# Primary Deliverable 6 — Dogfood Checklist

Create:

```text
docs/internal/beta/DOGFOOD.md
```

or another repository-consistent internal launch path.

This is for us, not external users.

The checklist should test a **fresh-user experience**.

---

# Dogfood Scenario A — Fresh Clone

Start from:

```text
clean clone
no .combie
no provider env vars
```

Verify:

1. setup docs make sense;
2. dependencies install;
3. help works;
4. init works;
5. state is created correctly.

---

# Dogfood Scenario B — Core Multi-Provider Stack

Minimum:

```text
GitHub
Vercel
```

Preferred:

```text
GitHub
Vercel
Cloudflare
```

Optional:

```text
Sentry
```

Verify:

```text
connect
providers
sync
resources
relationships
investigate
```

---

# Dogfood Scenario C — Relationship Aha

Use a real repo/project where possible.

Goal:

```text
GitHub repository
source_for
Vercel project
```

If Cloudflare custom domain exists:

```text
Vercel project
uses_domain_in
Cloudflare zone
```

Record whether these edges appear.

Do not manufacture fixtures for dogfood results.

---

# Dogfood Scenario D — Memory

Run sync twice.

If real provider state can safely be changed between runs, optionally observe a benign change.

Verify:

```text
changes
history
investigate
```

No need to mutate infrastructure solely for this Sprint.

---

# Dogfood Scenario E — Shared Commit Context

If real GitHub/Vercel evidence has matching full commit SHA:

verify:

```text
SHARED COMMIT CONTEXT
```

appears.

If not:

record as:

```text
no live shared-commit example available
```

Do not force it.

---

# Dogfood Scenario F — Offline

After successful sync:

unset relevant credentials.

Run:

```text
providers
resources
relationships
history
context
investigate
```

Verify expected offline behavior.

---

# Dogfood Scenario G — Error UX

Test at least:

```text
invalid Resource ID
unknown Resource
missing provider token during connect
bad token if safe
unknown provider
empty relationships
```

Confirm errors are understandable and secret-safe.

---

# Dogfood Findings Template

DOGFOOD.md should include fields:

```text
Date
Commit SHA
Machine / OS
Bun version

Providers connected
Resources discovered
Relationships inferred
Evidence families populated
Investigations tested

Setup friction
Connection friction
Sync friction
Investigation friction
Security observations

Blocker
Severity
Reproduction
Recommended next step
```

Do not fix every dogfood finding inside Sprint 038.

Only fix small beta-blocking documentation/help defects clearly within scope.

Larger product issues become follow-up work.

---

# Primary Deliverable 7 — Beta Setup Checklist

Add a concise internal checklist for inviting future users.

Can be part of:

```text
docs/internal/beta/DOGFOOD.md
```

or:

```text
docs/internal/beta/READINESS.md
```

Include:

```text
README current
Quickstart current
credential docs current
test suite green
typecheck green
dogfood run complete
known limitations documented
MCP status
beta promise frozen
```

MCP should remain incomplete after Sprint 038.

Do not falsely check it.

---

# README / QUICKSTART Tone

Use:

```text
clear
technical
calm
specific
honest
```

Avoid:

```text
revolutionary
autonomous
magic
AI-powered
single pane of glass
observability platform
root-cause automatically
```

The product is strong enough without hype.

---

# Installation Honesty

If external installation still requires:

```text
git clone
bun install
```

say so.

Do not solve package distribution in Sprint 038 unless repository pressure reveals a tiny obvious change that is necessary for the documented path.

Publishing to npm/bun registry is NOT part of this Sprint.

Release packaging belongs in Sprint 041 unless audit findings materially contradict this.

---

# Public vs Internal Documentation

Maintain separation.

## Public

Expected:

```text
README.md
docs/public/QUICKSTART.md
```

Potentially:

```text
docs/public/SECURITY.md
```

only if needed.

## Internal

Expected:

```text
docs/internal/sprints/...
docs/internal/beta/DOGFOOD.md
```

Do not expose internal Sprint planning as the public onboarding path.

---

# Security Documentation

Document:

- credentials are stored locally;
- state directory permissions;
- credential file permissions;
- credentials are separate from the SQLite domain database;
- environment variables are preferred;
- CLI token flags may appear in shell history;
- provider reads occur on connect/sync;
- investigation is offline after sync.

Do not claim:

```text
encrypted at rest
OS keychain
zero-knowledge
enterprise-grade secret storage
```

unless implemented.

---

# UX Consistency Changes

Only make small code changes when:

```text
help text is wrong
provider display text is inconsistent
error guidance contradicts implementation
```

Allowed examples:

```text
correct environment variable name
correct provider display label
correct command example
fix misleading empty-state copy
```

Not allowed:

```text
new command
new auth method
new provider behavior
disconnect feature
new sync behavior
```

---

# No New Product Capability

Sprint 038 must not add:

```text
MCP
API
agent tools
BYO model
Sentry issue evidence
new provider
new Relationship
new evidence family
Application grouping
background sync
webhooks
Investigation feature
```

This is launch hardening.

---

# External User Test

After documentation is drafted, simulate an external user from the docs.

Do not rely on memory.

Follow the Quickstart line-by-line.

Record:

```text
command succeeds?
copy accurate?
expected output understandable?
missing prerequisite?
ambiguous token instruction?
internal knowledge required?
```

Fix docs where incorrect.

---

# Documentation Verification

Every command included in public docs must be verified against actual CLI implementation.

Every environment variable must be verified in code.

Every Resource kind/provider claim must be verified in registry/domain types.

Every security claim must be verified in storage/credentials implementation.

No copied stale Sprint summary claims.

---

# Tests

Most Sprint 038 changes are documentation.

If CLI help strings are changed, add/update focused tests as appropriate.

Do not add tests solely to increase count.

Run full regression.

Expected baseline:

```text
607 tests
```

Final count may remain:

```text
607
```

or increase slightly if CLI consistency tests are warranted.

---

# Validation

Run:

```bash
bun test
bun run typecheck
git diff --check
git status
```

Also:

```text
secret scan
README command verification
Quickstart command verification
public docs link/path verification
full diff review
```

If Markdown tooling exists, run it.

Do not introduce a new docs framework.

---

# Architecture Review

Before completion answer:

1. Did Sprint 038 add any new product capability? Expected: no.
2. Did storage/schema change? Expected: no.
3. Did provider behavior change? Expected: no.
4. Did investigation semantics change? Expected: no.
5. Is README now current?
6. Can an external user understand Combie without Sprint docs?
7. Can an external user install/run the current product?
8. Is GitHub+Vercel quickstart complete?
9. Are optional providers clearly separated?
10. Are credential instructions accurate?
11. Is security wording truthful?
12. Are limitations explicit?
13. Are CLI help strings consistent?
14. Is PlanetScale UX consistent?
15. Is Sentry token guidance consistent?
16. Is a real dogfood checklist ready?
17. Was actual multi-provider dogfood performed?
18. If not, what exact live prerequisite remains?
19. Is documentation still dependent on cloning the repo?
20. Is that acceptable for the target beta persona?
21. Is Sprint 039 now unblocked?
22. What beta blocker remains after Sprint 038?

---

# Completion Notes — Sprint 038 (2026-08-10)

## Baseline

```text
Sprint 037 HEAD: f013a7d603d76337ae93e7d6a591ddabbc6336e3
  docs(sprint): complete Sprint 037 roadmap and product readiness audit
Branch: master
Worktree: clean (only untracked SPRINT-038.md)
Tests: 607 passing
Typecheck: clean
```

Sprint 037 verified complete. Baseline accepted.

## Repository Understanding

Inspected via exploration agents + direct reads of `src/cli/index.ts`,
`src/app/connect.ts`, `src/app/sync.ts`, `src/app/list.ts` (and
history/context/related/investigate formatters), `src/provider/registry.ts`,
`src/domain/resource.ts`, `src/domain/relationship.ts`, `src/storage/paths.ts`
+ `credentials.ts` + `store.ts`, `package.json`, `.gitignore`, and the CLI/app
test suites.

| Question | Answer |
|---|---|
| How does a user run Combie? | Clone + `bun install` + `bun run combie <command>` (`package.json` script). Bin entry `./src/cli/index.ts` with Bun shebang; local `bun link` also works. |
| Installation requires clone? | Yes — `"private": true`, not published anywhere. |
| Commands | `init`, `connect <provider>`, `sync [provider]`, `providers`, `resources` (`--provider`, `--kind`), `relationships`, `changes`, `history/related/context/investigate <resource-id>`, `help`; global `--dir`, `--help/-h`. |
| Provider IDs | `cloudflare`, `github`, `vercel`, `sentry`, `neon`, `planetscale` (registry.ts:9-16). |
| Resource kinds | `worker`, `database`, `kv_namespace`, `zone`, `repository`, `project`. |
| Relationship kinds | `source_for` (GitHub repo → Vercel project), `uses_domain_in` (Vercel project → Cloudflare zone); exact-evidence only. |
| Env vars | `CLOUDFLARE_API_TOKEN`; `GITHUB_TOKEN`/`GH_TOKEN` (+ `--use-gh`); `VERCEL_TOKEN`; `SENTRY_AUTH_TOKEN`/`SENTRY_TOKEN`; `NEON_API_KEY`; `PLANETSCALE_SERVICE_TOKEN_ID`+`PLANETSCALE_SERVICE_TOKEN` (+ `--organization`). |
| Token flags | `--token` (all), `--token-id`/`--organization` (PlanetScale), `--use-env`, `--use-gh` (GitHub only). |
| State dir | `./.combie` default; `--dir` or `COMBIE_HOME` override; mode `0700`. |
| Credentials | `{state}/credentials` JSON, mode `0600`, separate from the domain DB. |
| DB | `{state}/combie.db` (SQLite, WAL). |
| Reset | Delete the state directory; no `disconnect`/`reset` command exists. |
| Offline | All read commands are offline; network only on `connect`/`sync`. |

## README Audit

The old README was Sprint-001-era:

- Claimed "Sprint 001 status" and an active-sprint link to SPRINT-001.
- Quick start covered only Cloudflare (`CLOUDFLARE_API_TOKEN`).
- Documented only a Cloudflare single-provider architecture chain.
- Omitted `relationships`, `changes`, `history`, `related`, `context`,
  `investigate`, the other five providers, all evidence families, state-dir
  permissions, `--dir`/`COMBIE_HOME`, and the reset path.

## README Rewrite

`README.md` fully rewritten for an external technical user (255 lines). 17
sections: What is Combie? · Why Combie? · Current capabilities · What Combie
does not do yet · Supported providers · Requirements · Installation/running ·
Quickstart (GitHub + Vercel default) · Resource IDs · Core commands table
(with network/read-only columns) · How sync works · Investigation · Credentials
and security · State directory · Provider setup · Development · Status.

Truthful positioning only: "Combie is an open engineering context layer: a
local-first CLI". Explicit NOT-YET list: MCP, API/SDK, AI reasoning, automatic
sync, webhooks, complete graph, root cause, autonomous execution, correlation,
incident platform, learning. Install honesty: clone-based, not published,
optional `bun link`. No internal/sprint references anywhere in the README.

## Quickstart

Created `docs/public/QUICKSTART.md` (260 lines, 15 procedural steps):
requirements → clone/install → init → connect GitHub → connect Vercel →
optional Cloudflare → optional Sentry → optional Neon/PlanetScale → sync →
inspect (providers/resources/relationships) → choose a Resource ID →
investigate → re-sync → offline verification → troubleshooting table. Every
command and env var verified against `src/cli/index.ts` and `src/app/connect.ts`
before and after writing.

## Provider Credential Matrix

All verified from `src/app/connect.ts`; no invented aliases:

| Provider | Env vars (verified) | Alternatives |
|---|---|---|
| Cloudflare | `CLOUDFLARE_API_TOKEN` | `--token` |
| GitHub | `GITHUB_TOKEN` or `GH_TOKEN` | `--token`, `--use-gh` |
| Vercel | `VERCEL_TOKEN` | `--token` |
| Sentry | `SENTRY_AUTH_TOKEN` or `SENTRY_TOKEN` | `--token` |
| Neon | `NEON_API_KEY` | `--token` |
| PlanetScale | `PLANETSCALE_SERVICE_TOKEN_ID` + `PLANETSCALE_SERVICE_TOKEN` | `--token-id` + `--token`, `--organization` for multi-org |

Public docs prefer env-var flows and warn that CLI `--token` flags may persist
in shell history (documented in README credentials/security section and
Quickstart step 8 note).

## CLI Consistency Audit

Five in-scope copy defects found and fixed:

1. `src/app/sync.ts` — "No connected providers to sync" enumerated 5 of 6
   providers (missing `planetscale`). Added the missing `or:` line.
2. `src/app/list.ts` — "No providers connected" empty state listed only 2 of 6
   providers. Now enumerates all six (matching the sync.ts convention).
3. `src/app/{list,history,context,related}.ts` — `PROVIDER_DISPLAY` maps
   omitted `planetscale`, rendering "Planetscale" in `history`/`context`/
   `related`/`relationships` output. Added `planetscale: "PlanetScale"` to all
   four (matching `investigate.ts`).
4. `src/cli/index.ts` help — Sentry line showed only `SENTRY_AUTH_TOKEN` while
   code accepts `SENTRY_TOKEN` as fallback. Now: `sentry: SENTRY_AUTH_TOKEN or
   SENTRY_TOKEN`.
5. `src/app/connect.ts` — Sentry "no token" options list omitted the
   `SENTRY_TOKEN` fallback it acknowledges one block earlier. Option 1 now:
   `Export SENTRY_AUTH_TOKEN (or SENTRY_TOKEN) and run: combie connect sentry
   --use-env`.

Plus one external-user blocker found during dogfood (see Dogfood Run):
`combie resources` never printed the stable Resource ID, contradicting the
help text "List ids: combie resources" and making the documented
copy-ID → investigate loop impossible. `formatResourcesTable` now renders an
`ID` column (TYPE / NAME / ID / PROVIDER) using the existing stable
`provider:kind:providerResourceId` — a display-only presentation of stored
data, not a new capability.

## PlanetScale UX

Findings: display name was inconsistent — "PlanetScale" (correct) everywhere
except the four `PROVIDER_DISPLAY` maps (fallback "Planetscale"). Token
guidance, `--organization` handling, and multi-org error copy were already
correct and consistent. Fix: the four maps.

## Sentry UX

Findings: help and connect-guidance listed only `SENTRY_AUTH_TOKEN` while
`resolveSentryToken` accepts `SENTRY_TOKEN` as fallback (connect.ts:151-154).
Fix: both surfaces now document both names, with `SENTRY_AUTH_TOKEN` clearly
primary. No auth semantics changed.

## Security Documentation

README "Credentials and security" + "State directory" sections and Quickstart
steps 3/14 now truthfully document: state dir default `./.combie` with mode
`0700`; credentials file mode `0600`; credentials separate from the SQLite
domain DB; env vars preferred; CLI token flag shell-history risk; network only
during connect/sync; all investigation/read commands offline after sync;
explicit authorization only (no scanning); reset by deleting the state dir.
Explicitly NOT claimed: encryption at rest, OS keychain, zero-knowledge, secret
vaults.

## Product Promise Boundary

README "What Combie does not do yet" + "Status" + Quickstart intro state the
boundary explicitly:

```text
CURRENT: local-first CLI; six providers; normalized Resources; exactly two
proven Relationships; Changes/history; Vercel deployments, GitHub workflow
runs, Neon operations evidence; offline one-hop investigate; Shared Commit
Context where exact evidence exists.

NOT YET: MCP, API/SDK, AI/model reasoning, automatic sync, webhooks, complete
application graph, root cause, autonomous execution, generic correlation,
incident response platform, learning.
```

## Dogfood Checklist

Created `docs/internal/beta/DOGFOOD.md` (196 lines): honesty rule; per-run
capture fields (date/SHA/machine/Bun/providers/resources/relationships/
evidence/investigate targets/friction/security); scenarios A–G (fresh clone,
core stack, relationships, memory, shared commit, offline, error UX); blank
checklists with Record lines; findings log with severity/repro/next-step and
the Sprint-038 fix boundary.

## Dogfood Run

**Live dogfood performed (GitHub only — real stack on real account `sgr0691`)**
in a scratch `COMBIE_HOME` (never touched the workspace state dir):

| Step | Result |
|---|---|
| `init` | ✓ state dir created mode 0700 |
| `connect github --use-gh` | ✓ live auth via `gh` CLI (keyring), credentials file 0600 |
| `sync github` | ✓ **310 repositories**, **606 workflow runs** recorded (174 repos refreshed; 136 failed refresh — prior evidence retained, rate limits; documented partial behavior observed in the wild) |
| `providers` | ✓ GitHub Connected |
| `resources` | ✓ 310 repos listed with stable IDs |
| `investigate github:repository:1138749915` (`Rivora-AI/mvp`) | ✓ real evidence: 100 workflow runs, KNOWN FACTS (99 failure conclusions), provider activity chronology, full run cards |
| offline reads (`providers`, `resources`, `relationships`, `changes`, `history`, `related`, `context`, `investigate`) | ✓ all offline with creds env unset |
| error UX | ✓ unknown resource, malformed id, unknown provider (`gitlab` → full provider list), missing Sentry token (new guidance) — all secret-safe |

**Multi-provider portion deferred** — prerequisites missing on the dogfood
machine:

```text
VERCEL_TOKEN: unset
CLOUDFLARE_API_TOKEN: unset
SENTRY_AUTH_TOKEN / SENTRY_TOKEN: unset
NEON_API_KEY: unset
PLANETSCALE_SERVICE_TOKEN_ID / PLANETSCALE_SERVICE_TOKEN: unset
```

Scenarios deferred with it: C (relationships `source_for`/`uses_domain_in`),
E (shared commit context live), and the Vercel/Cloudflare half of B and D.
Commands to run later, once credentials exist:

```text
export VERCEL_TOKEN=... && bun run combie connect vercel --use-env
export CLOUDFLARE_API_TOKEN=... && bun run combie connect cloudflare --use-env
bun run combie sync
bun run combie relationships
bun run combie investigate <vercel-project-id>
```

Blocker discovered and fixed during the run (see CLI Consistency Audit):
`resources` printed no stable ID, breaking the documented copy-ID → investigate
loop. Fixed with the ID column; live re-verified.

## External User Simulation

Followed the new Quickstart line-by-line as written (no undocumented knowledge):

- init, connect (`--use-gh` path validated live), sync, providers, resources,
  relationships, changes, history, related, context, investigate — every
  command exists with the documented flags.
- Every documented env var matches `connect.ts` verbatim.
- Missing-token paths (Vercel above) produce exactly the directional guidance
  documented in the troubleshooting table.
- Reset path (`rm -rf` state dir → "Combie is not initialized") matches docs.
- One mismatch found: `resources` had no ID → fixed (docs then re-verified
  against live output).
- No other mismatches remain.

## Distribution Reality

Today: clone + `bun install` + `bun run combie`; optional local `bun link` for
a global `combie` command. Not published (package `private`, no CI/release).
This is the documented path in both public docs. The Sprint intentionally does
not solve packaging (belongs to Sprint 041). Acceptable for the 5–15-person
invited beta.

## Validation

```text
bun test           608 passing (607 baseline + 1 new; focused tests added
                   for the help/empty-state/ID-column fixes)
bun run typecheck  clean
git diff --check   clean
secret scan        no credentials/tokens in the diff (env-var names only)
docs verification  README/Quickstart commands + env vars + security claims
                   re-checked against src/cli/index.ts, src/app/connect.ts,
                   src/storage/* after every edit
```

## Deviations

- One scope-bounded hardening change beyond copy: the `resources` ID column
  (display of existing stable IDs). Classified as external-user blocker
  discovered by dogfood, fixed minimally and display-only. No behavior,
  storage, or semantic change.
- No other scope change.

## Learnings

1. The external-user loop cannot survive "the ID is somewhere" — exact stable
   IDs must be visible where docs tell users to find them.
2. Empty-state provider enumeration should always be generated exhaustively;
   two hand-maintained lists had already drifted.
3. The README/help surfaces drifted apart at different rates; every env var and
   command must be re-verified from source per release.
4. Real single-provider dogfood (GitHub) already exercised partial sync
   failure, refresh bound, authority wording, and error UX — high value even
   without the multi-provider half.

## Beta Blockers Remaining

```text
1. External documentation / onboarding        → RESOLVED in Sprint 038
2. Read-only MCP Agent Access                 → Sprint 039 (NOT STARTED)
3. Real multi-provider dogfood                → deferred: requires
   VERCEL_TOKEN + CLOUDFLARE_API_TOKEN (GitHub-only live run completed)
```

Soft blockers from Sprint 037 unchanged: connection UX consistency (addressed
for PlanetScale/Sentry copy), optional Sentry operational evidence.

## Canon Changes

```text
None
```

## Commit

```text
bef4453 fix(cli): consistent provider display, empty states, and token guidance
c296b4c docs(sprint): complete Sprint 038 external docs, dogfood, and UX fixes
```

---

# Explicit Questions — Answers

1. **Can a new user understand what Combie is from README alone?** Yes — the 17-section rewrite opens with a plain-language "What is Combie?" and "Why Combie?" before any commands.
2. **Can they understand what it does not do?** Yes — dedicated "What Combie does not do yet" section with an explicit NOT-YET list.
3. **Can they run Combie without reading internal docs?** Yes — Quickstart is self-contained; verified command-by-command against the CLI (External User Simulation).
4. **What is the current supported installation path?** Clone + `bun install` + `bun run combie`; optional local `bun link`. Documented honestly in README + Quickstart step 2.
5. **Is the runtime requirement explicit?** Yes — Bun >= 1.0, Node 20+, OS support; in README Requirements + Quickstart step 1.
6. **Are all supported providers documented?** Yes — all six with command examples and prefix; list matches `src/provider/registry.ts`.
7. **Are all auth environment variables accurate?** Yes — verified verbatim against `src/app/connect.ts`; Sentry dual-var and PlanetScale two-var forms included.
8. **Is GitHub + Vercel a complete quickstart?** Yes — steps 5–6 connect exactly those two; the rest are optional.
9. **Is Cloudflare optional in the quickstart?** Yes — labeled optional, moved after GitHub+Vercel.
10. **Is Sentry optional?** Yes — optional step with accurate env vars.
11. **Are Neon/PlanetScale positioned as optional extras?** Yes — optional path with both token forms documented.
12. **Can the user find a Resource ID?** Yes now — `combie resources` prints the ID column (fix was required; discovered during dogfood).
13. **Can they understand `investigate`?** Yes — dedicated section explains resource ID, evidence kinds, KNOWN FACTS, and offline history.
14. **Is manual sync behavior explicit?** Yes — "How sync works" + core commands table show sync is the only network write and is manual.
15. **Is offline behavior explicit?** Yes — offline section + read-only column in the command table.
16. **Is credential storage documented truthfully?** Yes — 0600 file, separate from DB, `./.combie` mode 0700, and explicit non-claims.
17. **Is shell-history risk documented?** Yes — README credentials section + Quickstart step 8 note warning against `--token` in shared shells.
18. **Are limitations explicit?** Yes — NOT-YET list plus exact-evidence-only relationships and partial-sync honesty.
19. **Did any CLI wording need fixes?** Yes, five small copy defects (sync.ts provider enumeration, list.ts empty state, four PlanetScale display maps, help Sentry line, connect Sentry guidance) — all fixed with tests.
20. **Did any behavior need architecture changes? Expected: no.** Confirmed — display-only ID column; no storage, schema, provider, or protocol change.
21. **Was real multi-provider dogfood completed?** Partially — live GitHub-only dogfood completed; Vercel/Cloudflare/Sentry/Neon/PlanetScale deferred (no credentials on machine).
22. **If yes, what stack?** GitHub on a real account (310 repos, 606 workflow runs) with `--use-gh` auth.
23. **Did `source_for` work live?** Not testable — deferred with Vercel credentials.
24. **Did `uses_domain_in` work live where applicable?** Not testable — deferred with Cloudflare credentials.
25. **Did Shared Commit Context work live where applicable?** Not testable (needs both providers).
26. **Were any beta-blocking setup bugs found?** One: `resources` printed no stable ID, breaking the documented copy-ID → investigate loop. Fixed, tested, live re-verified.
27. **What beta blockers remain?** MCP access (Sprint 039), real multi-provider dogfood (credentials), plus soft blockers from Sprint 037 (Sentry optional evidence). External docs blocker fully resolved.
28. **Is Sprint 039 MCP Foundation now ready to start?** Yes — prerequisites met; blockers recorded; no code debt carried from Sprint 038 pushes out of scope.

---

# Definition of Done

- [x] Sprint 037 clean baseline verified
- [x] exact baseline SHA recorded
- [x] SKILL protocol followed
- [x] Canon read
- [x] actual CLI inspected
- [x] provider registry inspected
- [x] credential implementation inspected
- [x] Repository Understanding completed
- [x] stale README audited
- [x] README rewritten for current product
- [x] product positioning truthful
- [x] not-yet boundaries explicit
- [x] supported providers documented
- [x] Resource kinds documented accurately
- [x] Relationship semantics documented accurately
- [x] Bun/runtime requirements documented
- [x] current install path documented
- [x] GitHub+Vercel quickstart written
- [x] optional Cloudflare/Sentry path written
- [x] Neon/PlanetScale optional path documented
- [x] credential matrix verified from code
- [x] Resource ID format documented
- [x] sync behavior documented
- [x] offline behavior documented
- [x] investigate behavior documented
- [x] security/storage behavior documented
- [x] shell-history token risk documented
- [x] public Quickstart created
- [x] CLI help consistency audited
- [x] PlanetScale wording audited
- [x] Sentry auth wording audited
- [x] only small in-scope UX copy fixes made
- [x] Dogfood checklist created
- [x] fresh-user scenario included
- [x] multi-provider scenario included
- [x] relationship scenario included
- [x] memory scenario included
- [x] shared-commit scenario included
- [x] offline scenario included
- [x] error UX scenario included
- [x] beta readiness checklist created
- [x] external-user simulation completed
- [x] every documented command checked against CLI
- [x] every env var checked against code
- [x] every security claim checked against implementation
- [x] no new provider
- [x] no MCP
- [x] no API
- [x] no model integration
- [x] no investigation feature
- [x] no application grouping
- [x] no webhooks/background sync
- [x] no schema changes
- [x] no provider API changes
- [x] full tests pass
- [x] typecheck passes
- [x] diff check clean
- [x] secret scan clean
- [x] completion notes updated
- [x] Canon changes recorded or None
- [x] Sprint 038 committed separately
- [x] worktree clean
- [x] Sprint 039 not started

---

# Explicitly Out of Scope

Do not implement:

- MCP
- MCP tools
- Agent Access
- API server
- BYO model
- IntelligenceProvider
- Sentry issues/events/releases
- additional provider evidence
- new Relationships
- application grouping
- environment model
- user relationship overrides
- graph engine
- multi-hop
- background sync
- webhook ingestion
- disconnect command
- OS keychain
- package publishing
- hosted Combie
- dashboard/UI
- investigate formatter polish
- Attention
- ranking
- scoring
- hypotheses
- root cause
- correlation engine
- generic Event/Observation
- operational memory
- learning
- execution
- Sprint 039 scaffolding

---

# Sprint 039 Gate

Sprint 039 — MCP Foundation may begin only when:

```text
README accurately describes current Combie
Quickstart is usable
credential matrix is verified
product limitations are explicit
dogfood checklist exists
tests/typecheck are green
worktree is clean
```

Real multi-provider dogfood should be completed in Sprint 038 where credentials
are available.

If dogfood cannot be completed due only to credential availability, document
the exact deferral and Sprint 039 may still proceed if the current live-verified
core providers remain sound.

---

# Final Principle

> **Before Combie becomes accessible to agents, make Combie accessible to humans who did not build it.**

And:

> **Document reality. Dogfood reality. Then expose reality through MCP.**