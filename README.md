# Combie

Open engineering context layer: connect providers once, inventory resources, and build toward shared operational understanding.

> **Sprint 001 status:** Cloudflare connection vertical slice.

## Requirements

- [Bun](https://bun.sh) ≥ 1.1

## Quick start

```bash
bun install

# Initialize local state (creates ./.combie)
bun run combie init

# Connect Cloudflare (explicit auth only — no credential scanning)
export CLOUDFLARE_API_TOKEN=...   # token needs Account + Workers + D1 + KV + Zone read
bun run combie connect cloudflare --use-env

# Or pass a token directly (avoid in shared shells)
bun run combie connect cloudflare --token "$CLOUDFLARE_API_TOKEN"

bun run combie sync
bun run combie providers
bun run combie resources
```

## Development

```bash
bun test
bun run typecheck
```

Automated tests use fixtures and mocks; they do **not** require live Cloudflare credentials.

## Architecture (Sprint 001)

```text
CLI → app services → provider contract → Cloudflare adapter → Cloudflare API
                  ↘ local SQLite + separate credentials file
```

Cloudflare remains an adapter. The domain `Resource` model is provider-independent.

## Canon

1. `docs/internal/VISION.md`
2. `docs/internal/ARCHITECTURE.md`
3. `docs/internal/ROADMAP.md`
4. `skills/build-combie/SKILL.md`

Active sprint: `docs/internal/sprints/SPRINT-001.md`

See `AGENTS.md` for agent working rules.
