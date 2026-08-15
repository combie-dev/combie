# AGENTS.md — Combie

Combie is the open engineering context layer. Sprints 001–042 implement the
local multi-provider context foundation through **Cloudflare**, **GitHub**,
**Vercel**, **Sentry**, **Neon**, and **PlanetScale**, including deterministic
Relationships, retained provider evidence, offline investigation, read-only MCP,
release distribution, guided agent setup, and a concluded GitHub-first closed
beta. Sprint 043 is the active Sentry release-evidence slice.

## Mandatory reading order before any substantive change

Per `skills/build-combie/SKILL.md` (the canonical Engineering Constitution), read in this order:

1. `skills/build-combie/SKILL.md`
2. `docs/internal/VISION.md`
3. `docs/internal/ARCHITECTURE.md`
4. `docs/internal/ROADMAP.md`
5. Active Sprint under `docs/internal/sprints/`
6. Relevant code and tests under `src/` and `tests/`

## Source-of-truth hierarchy

`VISION.md` → `ARCHITECTURE.md` → `ROADMAP.md` → Active Sprint → Code.

- If implementation conflicts with the Canon, **report the conflict — do not silently change the Canon or the code to mask it.**
- Do not create new permanent documents (e.g. `MEMORY_MODEL.md`, `MCP_SPEC.md`) unless explicitly requested. Canon = VISION, ARCHITECTURE, ROADMAP, SKILL.
- Update only the canonical doc whose *material* content changed; otherwise leave docs untouched.
- `.history/` contains editor backups — never treat as canonical or edit.

## Current baseline: Sprints 001–042 complete (043 is active)

Multi-provider connection loop:

```text
combie init
  → connect cloudflare | github | vercel | sentry | neon | planetscale
  → sync (all connected providers)
  → providers | resources | relationships | changes | history | context
  → investigate (deterministic, offline, one hop)
  → agent setup | mcp (four read-only local tools)
```

Supported resource kinds: `worker`, `database` (Cloudflare D1 / PlanetScale), `kv_namespace`, `zone`, `repository`, `project` (Vercel / Sentry / Neon).

Providers: Cloudflare, GitHub, Vercel, Sentry, Neon, PlanetScale.

- Current proven graph scope: `source_for` (GitHub repository → Vercel
  project) and `uses_domain_in` (Vercel project → Cloudflare zone), derived
  only from exact provider evidence.
- Current agent scope: exactly four local, offline, read-only MCP tools:
  `list_resources`, `list_providers`, `get_related_context`, and
  `investigate_resource`.
- **Sprint 043 scope:** add compact Sentry release evidence and surface it
  through existing offline investigation and the frozen MCP path. The Sprint
  042 closed-beta feature freeze has ended. Do not expand MCP tools or
  schemas, add write paths, speculative relationships, a generic Event
  abstraction, Sentry issues/error telemetry, additional providers, broader
  ontology/identity, model reasoning, background sync, webhooks, telemetry
  ingestion, operational learning, policy, or execution.
- Explicitly out of scope unless Sprint 043 later authorizes a change: new
  MCP tools or semantics, API, SDK, hosted Combie, and in-product analytics
  or feedback collection.

## Repository layout

```text
src/
  cli/                 CLI entry and commands
  agent/               Claude Code, Codex, and Cursor MCP configuration
  app/                 Application services and deterministic context composition
  domain/              Provider-independent Resource, Relationship, and Change models
  mcp/                 Local stdio read-only agent interface
  provider/            Minimal provider contract + registry
  providers/cloudflare  Cloudflare adapter (HTTP client, normalize, errors)
  providers/github      GitHub adapter (HTTP client, normalize, errors)
  providers/vercel      Vercel adapter
  providers/sentry      Sentry adapter
  providers/neon        Neon adapter
  providers/planetscale PlanetScale adapter
  storage/              SQLite domain store + separate credentials file
tests/                 bun:test suites (no live provider credentials required)
```

## Conventions

- Stack: TypeScript + Bun (`bun:sqlite`, `bun:test`).
- TDD: Red → Green → Refactor; smallest implementation that satisfies the Sprint; provider-specific logic stays inside the provider adapter.
- Test suite must run **without live provider credentials** (fixtures/mocks).
- Credentials: explicit authorization only.
  - Cloudflare: `--token` or `--use-env` with `CLOUDFLARE_API_TOKEN`
  - GitHub: `--token`, `--use-env` with `GITHUB_TOKEN`/`GH_TOKEN`, or `--use-gh` (`gh auth token`)
  - Vercel: `--token` or `--use-env` with `VERCEL_TOKEN`
  - Sentry: `--token` or `--use-env` with `SENTRY_AUTH_TOKEN`/`SENTRY_TOKEN`
  - Neon: `--token` or `--use-env` with `NEON_API_KEY`
  - PlanetScale: `--use-env` with `PLANETSCALE_SERVICE_TOKEN_ID` + `PLANETSCALE_SERVICE_TOKEN`, or `--token-id` + `--token`; multi-org requires `--organization <slug>`
  - No filesystem/shell-history/`.env` scanning. Secrets never appear in logs, normal output, errors, or commits. Credentials file is mode `0600` and separate from the domain DB.
- Errors must say what the user can do next and preserve provider context without leaking secrets.
- Multi-provider sync attempts each connected provider, persists successes, reports failures, and exits non-zero if any provider fails.
- Commits only when authorized; conventional style (`feat(provider): …`, `fix(storage): …`).
- When a Sprint completes, record Implemented / Deviations / Validation / Learnings / Canon Changes notes in the Sprint doc; never start the next Sprint.
- Never request credentials, authorization headers, unredacted state
  databases, or private resource names.

## Commands

```bash
bun install
bun test
bun run typecheck
bun run combie -- help
```
