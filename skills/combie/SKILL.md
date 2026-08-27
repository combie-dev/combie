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

## Task profiles

For a task-scoped deterministic view, name one of three exact profiles instead
of hand-filtering the full document:

- `change-review` — what changed around this Resource. Subject/current
  authority, changes, one-hop evidence, provider activity, timeline, shared
  commits, relevant relationships/paths, evidence gaps. Chronology and
  correspondence, not causality.
- `dependency-impact` — what is connected to or potentially affected. Direct
  Relationships, directions, neighbors, two-hop paths, relationship evidence
  and verification clocks, graph/discovery gaps. Connectivity, not blast
  radius or runtime-dependency certainty.
- `response-recall` — what we investigated, decided, did, and observed
  previously. Investigation summaries, Resolution decision/action/outcome
  fields, evidence ids, Incident groupings, additive
  `structuredResponseMemory` (exact Recommendation→Decision→Action→Outcome
  chains for that subject; organizational memory, not current provider
  truth, not inferred Action), and additive `incidentPrecedentMemory` (one
  inspectable precedent set per exact Incident already in `incidentMemory`:
  explicit human/agent links plus deterministic exact-match candidates —
  not recommendations, not similarity), and additive
  `incidentResponseExperienceMemory` (always present; `[]` known-empty).
  Explicit known-empty arrays. Exact temporally prior records only
  (`effectiveAt = occurredAt ?? recordedAt`), not similar or later
  incidents. `incidentResponseExperienceMemory` groups those exact prior
  Recommendation→Decision→Action→Outcome rows by exact `actionKey`, keeping
  PROPOSED (Recommendations and Decisions by literal disposition) separate
  from ATTEMPTED (Actions and Outcomes by literal assessment). Assessments
  are recorded, not computed success — no score, rank, or percentage — and
  incomplete branches (Recommendation without Decision, Action without
  Outcome) are named.

Map a user's question to a profile explicitly; Combie itself never classifies
free-text intent.

```text
CLI: combie investigate <id> --task <profile> --json
MCP: investigate_resource { resourceId, task: "<profile>" }
```

`--task` is read-only and requires `--json`; it cannot be combined with
`--save`. MCP `task` cannot be combined with `investigationId`. When no profile
fits, fall back to full `combie investigate <id> --json`.

### `availableOnDemand` — deeper context without expanding the result

Every `--task` result carries one top-level `availableOnDemand` array: inert
retrieval descriptors, never executed by Combie. An omitted-task full
`investigate` has no such field. Two target kinds:

- `current-investigation` — exactly one, always first, for the exact subject.
  `cli.argv: ["combie", "investigate", "<id>", "--json"]`, or MCP
  `investigate_resource { resourceId: "<id>" }` (no `task`). This is a NEW live
  local compose, not frozen to the earlier task call; a sync between calls may
  change evidence and clocks.
- `retained-investigation` — only on `response-recall`, one per existing
  `investigationHistory` row, in the same order (`kind`, `investigationId`,
  `subjectResourceId`, `composedAt`). `cli.argv: ["combie", "investigation",
  "<investigationId>"]` retrieves the COMPLETE retained (frozen at `composedAt`)
  composition. MCP `investigate_resource { investigationId: "<id>" }` returns
  the thin named-id handle — snapshot identity, bounded subject preview, and
  artifact handle — NOT the snapshot body.

`change-review` and `dependency-impact` expose only the one current target
(no retained ids — those profiles exclude memory).

`argv` is an argument vector, never a shell command string. The descriptor is
guidance, not an automatic-retrieval policy: follow the current target only
when the task result is insufficient, and remember a current target is a live
re-compose while a retained target is frozen at `composedAt`.

### Optional structured response capture (CLI-only)

To retain an explicit Recommendation → Decision → Action → Outcome chain, use
`combie recommendation`, `combie decision`, `combie action`, and
`combie outcome`. Writes are CLI-only; MCP cannot write. Action is not
inferred from provider activity. An approved Decision is not permission to
execute. Outcome is a retained assessment — not current provider truth and
not a success score. Measurement is optional and atomic. This is optional
organizational memory, not a seventh loop step.

### Optional incident links and precedents (CLI-only)

To record that two exact Incidents belong together for an authored reason:

```bash
combie incident-link --incident inc:a --incident inc:b --reason "Same failure mode"
combie incident-link ilink:…
combie incident-links [--incident inc:…]
```

An explicit link is a human/agent organizational claim — not provider proof,
not graph Relationship truth, and not similarity.

To retrieve precedents for one exact Incident:

```bash
combie precedents --incident inc:a
combie precedents --incident inc:a --json
```

Output separates `EXPLICIT PRECEDENTS` (durable prior links) from
`CANDIDATE PRECEDENTS` (ephemeral exact equality / proven one-hop graph /
exact Incident-anchored action-key matches). A peer is a precedent only when
it is temporally prior: `effectiveAt = occurredAt ?? recordedAt`, and
`peer.effectiveAt < query.effectiveAt`. Equal or later Incidents are never
precedents — including explicit link peers (those links remain on
`incident-links`). Candidates are inspectable retrieval aids, not
recommendations and not "similar Incidents."
`response-recall` also returns additive `incidentPrecedentMemory` for the
exact Incidents already in that subject's `incidentMemory` (`[]` known-empty).
MCP cannot write links.

`combie precedents --incident <inc>` also appends a `RECORDED RESPONSE EXPERIENCE` section (and additive `responseExperience` on `--json`): a
per-`actionKey` summary of the exact prior Incident-anchored
Recommendation/Decision/Action/Outcome rows, keeping PROPOSED separate from
ATTEMPTED. `response-recall`'s `incidentResponseExperienceMemory` carries the
same summary per Incident. Every count is backed by exact retained record
ids; Outcome values are recorded assessments, not success — no score, rank,
or recommendation; incomplete branches (Recommendation without Decision,
Action without Outcome) are named; only temporally prior precedents
contribute.

## 1. Run a compact investigation

MCP: `investigate_resource { resourceId }`

CLI: `combie investigate <id> [--json] [--save] [--task <profile>]`

A live investigate is CURRENT observation — what the providers and local relationships say now — not a stored snapshot. `--save` retains a snapshot for later reopen or compare, but saving is not needed for this loop.

## 2. Inspect freshness and missing context

Read the CURRENT clocks on the investigation result:

- `observed by Combie at`
- last successful provider sync
- last provider sync attempt

Then check the Missing Context items. `unknown_provider_sync_authority` names a provider whose last attempt is after its last success: that provider may have changed since Combie last observed it. `unknown_relationship_authority` names a one-hop edge whose required-provider last attempt is after last verified: retained RELATED is not current provider topology.

Also read `last successful discovery` (`included` / `not in last successful discovery`, omitted when never recorded). Do not infer membership from `updatedAt`. Missing Context `not_in_last_successful_discovery` is retained observation, not deletion.

MCP `get_related_context` on a 0-edge subject keeps `related` as `[]` and names the gap as `missingContext` kind `no_known_relationships`. When edges exist, omit `missingContext`. CLI `related --json` shares that projection. Do not add Missing Context to `combie context`.

When two stored Relationships form a path (subject —edge— middle —edge— far), `related` stays one-hop and additive `paths` lists those two hops with verification clocks. A path is not a Relationship. Do not treat a Vercel–Sentry path via GitHub as Vercel↔Sentry causality. `combie context --json` stays one-hop RELATED and omits `paths`.

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

`--json` is available on `providers`, `resources`, `related`, `context`, live `investigate`, `investigations`, and `precedents`. `combie investigation <id> --json` is the compact handle (`id`, `subjectResourceId`, `composedAt`, `subjectPreview`, `investigationArtifact`) — not the 048 body. Pipe to jq or rg to select the fields you need instead of dumping the whole compose:

```bash
combie investigate <id> --json | jq '.knownFacts'
combie investigate <id> --json | jq '.paths'
combie investigate <id> --json | jq '.subjectGitHubIssues'
combie investigate <id> --task change-review --json
combie investigate <id> --task dependency-impact --json
combie investigate <id> --task response-recall --json
combie precedents --incident <inc-id> --json
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

Cite exact local evidence ids and resource ids from the compose. Do not guess ids, do not invent evidence, and do not infer Action from provider activity — a deployment, workflow run, or GitHub issue is evidence, not a conclusion.

GitHub repositories expose GitHub issues on `subjectGitHubIssues` (and CLI GITHUB ISSUES), not Sentry `subjectIssues` (`not_applicable` on a repository). A two-hop `paths` entry is two proven edges, not a new edge and not a causal claim.

Resolution, Incident, structured response (recommendation / decision / action /
outcome), and incident-link recording is optional CLI work and is not part of
this loop; MCP cannot write. Precedent retrieval (`combie precedents`) is
read-only CLI (and additive on `response-recall`); candidates are exact matches,
not recommendations.
