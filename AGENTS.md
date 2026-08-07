# AGENTS.md — Combie

Combie is the open engineering context layer. Sprints 001–002 implement the connection loop for **Cloudflare** and **GitHub**.

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

## Current baseline: Sprints 001–002 complete

Multi-provider connection loop:

```text
combie init
  → connect cloudflare | github
  → sync (all connected providers)
  → providers | resources
```

Supported resource kinds: `worker`, `database` (D1), `kv_namespace`, `zone`, `repository`.

Providers: Cloudflare (infrastructure resources), GitHub (repositories).

- **Anti-speculation rule:** build only what the active Sprint requires; no Investigation/Learning/Recommendation engines, MCP, AI layer, OTLP, execution policies, universal provider framework, or other roadmap concepts — not even as scaffolding.
- Explicitly out of scope unless the active Sprint requires it: additional providers, Engineering Graph, memory, investigations, API server, SDK, hosted Combie.

## Repository layout

```text
src/
  cli/                 CLI entry and commands
  app/                 Application services (init, connect, sync, list)
  domain/              Provider-independent Resource model
  provider/            Minimal provider contract + registry
  providers/cloudflare Cloudflare adapter (HTTP client, normalize, errors)
  providers/github     GitHub adapter (HTTP client, normalize, errors)
  storage/             SQLite domain store + separate credentials file
tests/                 bun:test suites (no live provider credentials required)
```

## Conventions

- Stack: TypeScript + Bun (`bun:sqlite`, `bun:test`).
- TDD: Red → Green → Refactor; smallest implementation that satisfies the Sprint; provider-specific logic stays inside the provider adapter.
- Test suite must run **without live provider credentials** (fixtures/mocks).
- Credentials: explicit authorization only.
  - Cloudflare: `--token` or `--use-env` with `CLOUDFLARE_API_TOKEN`
  - GitHub: `--token`, `--use-env` with `GITHUB_TOKEN`/`GH_TOKEN`, or `--use-gh` (`gh auth token`)
  - No filesystem/shell-history/`.env` scanning. Secrets never appear in logs, normal output, errors, or commits. Credentials file is mode `0600` and separate from the domain DB.
- Errors must say what the user can do next and preserve provider context without leaking secrets.
- Multi-provider sync attempts each connected provider, persists successes, reports failures, and exits non-zero if any provider fails.
- Commits only when authorized; conventional style (`feat(provider): …`, `fix(storage): …`).
- When a Sprint completes, record Implemented / Deviations / Validation / Learnings / Canon Changes notes in the Sprint doc; never start the next Sprint.

## Commands

```bash
bun install
bun test
bun run typecheck
bun run combie -- help
```
