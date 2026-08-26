---
name: combie
description: "Use Combie to investigate engineering context across connected providers (Cloudflare, GitHub, Vercel, Sentry, Neon, PlanetScale): run a compact investigation, inspect freshness and missing context, sync only the necessary providers, filter structured results locally, retrieve deeper evidence only when necessary, and cite exact evidence in conclusions. Use when investigating a resource, checking whether observed evidence is fresh, or comparing live observation against retained snapshots."
---

# Combie

Combie is the offline, deterministic engineering context layer for connected providers: Cloudflare, GitHub, Vercel, Sentry, Neon, PlanetScale.

It exposes exactly five read-only local MCP tools plus a CLI:

- `list_resources`
- `list_providers`
- `get_related_context`
- `investigate_resource`
- `list_investigations`

The five MCP tools are read-only: they cannot sync and they cannot write. Sync is CLI-only.

This skill teaches the six-step composition loop over shipped primitives:

```text
1. investigate
2. inspect clocks and Missing Context
3. sync only the stale providers
4. filter results locally
5. retrieve deeper evidence only when needed
6. cite exact evidence
```

## 1. Run a compact investigation

MCP: `investigate_resource { resourceId }`

CLI: `combie investigate <id> [--json] [--save]`

A live investigate is CURRENT observation — what the providers and local relationships say now — not a stored snapshot. `--save` retains a snapshot for later reopen or compare, but saving is not needed for this loop.

## 2. Inspect freshness and missing context

Read the CURRENT clocks on the investigation result:

- `observed by Combie at`
- last successful provider sync
- last provider sync attempt

Then check the Missing Context items. `unknown_provider_sync_authority` names a provider whose last attempt is after its last success: that provider may have changed since Combie last observed it. `unknown_relationship_authority` names a one-hop edge whose required-provider last attempt is after last verified: retained RELATED is not current provider topology.

Also read `last successful discovery` (`included` / `not in last successful discovery`, omitted when never recorded). Do not infer membership from `updatedAt`. Missing Context `not_in_last_successful_discovery` is retained observation, not deletion.

MCP `get_related_context` on a 0-edge subject keeps `related` as `[]` and names the gap as `missingContext` kind `no_known_relationships`. When edges exist, omit `missingContext`. CLI `related --json` shares that projection. Do not add Missing Context to `combie context`.

CLI: `combie providers [--json]` shows LAST SYNC (last success) and LAST ATTEMPT per provider.

MCP: `list_providers` includes `lastAttemptAt`.

Never guess freshness from wall-clock "now". Surface what the clocks say.

## 3. Refresh only the necessary authoritative providers

When a provider is stale or unknown, sync only that provider:

```bash
combie sync github
```

Bare `combie sync` syncs all connected providers; prefer scoping to the authoritative provider(s) that are stale or unknown. MCP never syncs — the five tools are read-only, so a refresh happens only through the CLI. After syncing, re-run the investigation (step 1) and read the clocks again.

## 4. Filter structured results locally

`--json` is available on `providers`, `resources`, `related`, `context`, live `investigate`, and `investigations`. `combie investigation <id> --json` is the compact handle (`id`, `subjectResourceId`, `composedAt`, `subjectPreview`, `investigationArtifact`) — not the 048 body. Pipe to jq or rg to select the fields you need instead of dumping the whole compose:

```bash
combie investigate <id> --json | jq '.knownFacts'
combie context <id> --json | jq '.related'
combie providers --json | jq '.providers[] | {name, lastSyncAt, lastAttemptAt}'
combie investigations --json
```

`combie context <id> --json` is the compact local-filter document for CURRENT + RELATED + CHANGES. Deep investigation fields — Known Facts, provider activity, timeline, Missing Context, memory sidecars — stay on `combie investigate --json` and MCP `investigate_resource`; context does not replace investigate.

Filter locally with jq; do not invent new flags.

## 5. Retrieve deeper evidence only when necessary

MCP `list_investigations` (optional `resourceId`) lists retained snapshot summaries: `id`, `subjectResourceId`, `composedAt`. Known-empty is not an error. Use it to find `inv:` ids. It does not return the snapshot body.

Named-id MCP `investigate_resource` with `investigationId` (and optionally `resourceId`) returns identity, `subjectPreview`, and `investigationArtifact` — sha256, record counts, and in-database location — for a retained snapshot. It does NOT return the retained body: the 048 snapshot body is not on the wire.

Complete snapshot retrieve stays on the CLI: `combie investigation <id>`.

A retained snapshot is composition at `composedAt`, NOT current truth. Do not paste it as if it were live; re-run `investigate` for current observation.

## 6. Cite the evidence used in a conclusion

Cite exact local evidence ids and resource ids from the compose. Do not guess ids, do not invent evidence, and do not infer Action from provider activity — a deployment or workflow run is evidence, not a conclusion.

Resolution and Incident recording is optional CLI work and is not part of this loop; MCP cannot write.
