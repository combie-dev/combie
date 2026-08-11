# Combie

Combie is an open engineering context layer: a local-first CLI that connects
your engineering stack once and keeps a deterministic, offline record of what
you run, where it lives, and what is known to be related.

## What is Combie?

Connect your engineering stack once. Combie inventories the resources your
providers report (repositories, projects, databases, deployments), records how
they change over time, and builds only the cross-provider relationships it can
prove from provider evidence. All of it lives in a local state directory.

## Why Combie?

Engineering context is fragmented: a deploy lives in Vercel, the source that
produced it in GitHub, the domain in Cloudflare, the database in a managed
provider. No single tool holds all of it, so recreating that context means
switching between dashboards and API explorers. Combie gathers the provider
facts into one local, queryable state — no AI needed, no hosted backend, just
deterministic data you can inspect.

## Current capabilities

- Connect six providers: Cloudflare, GitHub, Vercel, Sentry, Neon, PlanetScale.
- Inventory normalized Resources across them (`worker`, `database`,
  `kv_namespace`, `zone`, `repository`, `project`).
- Build exactly two Relationships, only with deterministic evidence and only
  when both involved providers are synced:
  - `source_for`: GitHub repository → Vercel project (evidence: Vercel Git
    repository link).
  - `uses_domain_in`: Vercel project → Cloudflare zone (evidence: custom
    domain apex match).
- Remember Resource changes (`changes`) and per-resource history.
- Persist selected provider-native evidence: Vercel deployments, GitHub
  workflow runs (bounded to 100), Neon operations.
- Compose offline one-hop investigation context for any resource
  (`investigate`), with provenance for every fact.

## What Combie does not do yet

- No MCP server or protocol support.
- No API or SDK.
- No AI or model-based reasoning.
- No automatic or background sync (sync is manual).
- No webhooks.
- No complete application graph.
- No root-cause analysis.
- No autonomous execution or actions.
- No generic cross-provider correlation.
- No incident response platform.
- No learning or self-improving behavior.

## Supported providers

| Provider    | Resource kinds discovered               | Env vars                                              | Alternatives                                |
| ----------- | --------------------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| Cloudflare  | worker, database (D1), kv_namespace, zone | `CLOUDFLARE_API_TOKEN`                              | `--token`                                   |
| GitHub      | repository                              | `GITHUB_TOKEN` or `GH_TOKEN`                          | `--token`, `--use-gh` (`gh auth token`)     |
| Vercel      | project                                 | `VERCEL_TOKEN`                                        | `--token`                                   |
| Sentry      | project                                 | `SENTRY_AUTH_TOKEN` or `SENTRY_TOKEN`                 | `--token`                                   |
| Neon        | project                                 | `NEON_API_KEY`                                        | `--token`                                   |
| PlanetScale | database                                | `PLANETSCALE_SERVICE_TOKEN_ID` + `PLANETSCALE_SERVICE_TOKEN` (both required) | `--token-id <id> --token <secret>`; multi-org requires `--organization <slug>` |

Neon and PlanetScale are optional additions; they are not required for the
core connect → sync → investigate loop.

## Requirements

- [Bun](https://bun.sh) ≥ 1.1 (the CLI uses `bun:sqlite`; tests use
  `bun:test`). Node.js is not supported.
- The package is `private` and not published to any package registry —
  installation requires cloning the repository.
- Provider credentials (API tokens) per provider, listed above.

## Installation / running

```bash
git clone <combie-repository-url>
cd combie
bun install
bun run combie --help
```

The `<combie-repository-url>` placeholder is filled in by the invite that
grants you access to the repository.

Combie is not on npm. The only route to a global `combie` command is a local
`bun link` from the repository root (the `bin` entry ships with a
`#!/usr/bin/env bun` shebang):

```bash
bun link
combie --help
```

In this README, `combie <command>` and `bun run combie <command>` are
interchangeable.

## Quickstart

This walks the default stack: GitHub + Vercel.

```bash
bun install
bun run combie init
export GITHUB_TOKEN=<your-token>        # or use `gh` CLI: bun run combie connect github --use-gh
bun run combie connect github --use-env
export VERCEL_TOKEN=<your-token>
bun run combie connect vercel --use-env
bun run combie sync
bun run combie providers
bun run combie resources
bun run combie relationships
bun run combie investigate <resource-id>
```

Optional follow-ups, in any order:

```bash
bun run combie connect cloudflare --use-env   # expect CLOUDFLARE_API_TOKEN
bun run combie connect sentry --use-env       # expect SENTRY_AUTH_TOKEN or SENTRY_TOKEN
bun run combie connect neon --use-env         # expect NEON_API_KEY
bun run combie connect planetscale --use-env  # expect PLANETSCALE_SERVICE_TOKEN_ID + PLANETSCALE_SERVICE_TOKEN
```

## Resource IDs

Every resource has a stable id of the form
`provider:kind:providerResourceId`:

- `github:repository:915052094`
- `vercel:project:prj_abc`
- `cloudflare:zone:zone_example`

There is no fuzzy name lookup. Copy the exact id from `bun run combie
resources`.

## Core commands

| Command                | Purpose                                           | Network | Read-only |
| ---------------------- | ------------------------------------------------- | ------- | --------- |
| `init`                 | Initialize local Combie state                     | No      | No        |
| `connect <provider>`   | Connect a provider (network)                      | Yes     | No        |
| `sync [provider]`      | Discover and store resources                      | Yes     | No        |
| `providers`            | List configured providers                         | No      | Yes       |
| `resources`            | List resources (`--provider <id>`, `--kind <kind>`) | No    | Yes       |
| `relationships`        | List known cross-provider relationships           | No      | Yes       |
| `changes`              | List observed Resource changes                    | No      | Yes       |
| `history <resource-id>`| Show current state and observed history           | No      | Yes       |
| `related <resource-id>`| One-hop related context for a resource            | No      | Yes       |
| `context <resource-id>`| Current, related, and Change context              | No      | Yes       |
| `investigate <resource-id>` | One-hop investigation context                | No      | Yes       |
| `help`                 | Show help                                         | No      | Yes       |

Global flags: `--dir <path>` (state directory override, default `./.combie`),
`--help` / `-h`.

Connect flags: `--token <token>` (all providers), `--token-id <id>` +
`--organization <slug>` (PlanetScale), `--use-env`, `--use-gh` (GitHub only).

## How sync works

- `connect <provider>` authenticates the provider, stores the credential
  locally, and records the connected provider.
- `sync` queries every connected provider, normalizes the results into
  Resources, and persists them.
- Read commands (`providers`, `resources`, `relationships`, `changes`,
  `history`, `related`, `context`, `investigate`) read only local state.
- Sync is manual and expected to be re-run; nothing is real-time.
- If one provider fails during sync, the failures do not invalidate the
  successful providers: sync reports per-provider results and persists what
  succeeded.

## Investigation

`investigate <resource-id>` composes a deterministic, read-only, offline
report around a single resource. You receive:

- The subject's current state and observed history.
- Known facts from provider evidence, and explicitly listed missing context.
- Provider-native evidence where available: `DEPLOYMENTS` (Vercel),
  `WORKFLOW RUNS` (GitHub), `OPERATIONS` (Neon).
- A compact one-hop `RELATED CONTEXT` index, plus `SHARED COMMIT CONTEXT` when
  exact Git commit SHA evidence matches across GitHub and Vercel within a
  `source_for` relationship.
- Known provider activity, Combie observations, and detailed evidence cards
  for every related resource.

Sections appear in a fixed order: SUBJECT, CURRENT, KNOWN FACTS, MISSING
CONTEXT, SUBJECT CHANGES, subject provider evidence, RELATED CONTEXT, SHARED
COMMIT CONTEXT, KNOWN PROVIDER ACTIVITY, COMBIE OBSERVATIONS, DETAILED
EVIDENCE. Every fact is provenance-backed. The report offers no hypotheses
and no root cause.

## Credentials and security

- Tokens are stored only after explicit authorization: `--token`,
  `--use-env`, or `--use-gh` (GitHub CLI) — no filesystem or shell-history
  scanning.
- Prefer `--use-env` over CLI token flags: token flags can appear in your
  shell history.
- Credentials live in a separate file from the domain database, written with
  mode `0600`.
- Secrets never appear in logs, normal output, errors, or commits.
- The state directory is created with mode `0700`.
- Network access happens only during `connect` and `sync`. All investigation
  and read commands work offline against stored state.
- What is not implemented: encryption at rest, OS keychain integration,
  zero-knowledge storage, secret vaults.

## State directory

Combie keeps everything under one state directory, `./.combie` by default:

```text
.combie/
  combie.db      SQLite database (WAL) with providers, resources,
                 relationships, changes, history, evidence
  credentials    JSON file with provider tokens (mode 0600)
```

Override the location with `--dir <path>` on any command, or with the
`COMBIE_HOME` environment variable.

To reset Combie, delete the state directory:

```bash
rm -rf .combie
```

or the equivalent `--dir`/`COMBIE_HOME` path you used. This removes local
state and stored credentials. There is no `disconnect` or `reset` command.

## Provider setup

Each provider needs a credential with read access. Full setup for every
provider (and scopes) is in
[docs/public/QUICKSTART.md](docs/public/QUICKSTART.md).

## Development

```bash
bun install
bun test
bun run typecheck
```

The test suite runs without live provider credentials (fixtures and mocks).

## Status

Late alpha, preparing for a closed beta. The core connect → sync →
investigate loop works for the six providers above. Changes to state layout
or command semantics are still possible.