#!/usr/bin/env bun
import { createInterface } from "node:readline/promises";
import { resolveBaseDir } from "../storage/paths.ts";
import { CombieError } from "../app/errors.ts";
import { initCombie } from "../app/init.ts";
import { connectProvider } from "../app/connect.ts";
import { syncProviders } from "../app/sync.ts";
import {
  listProviders,
  listResources,
  listRelationships,
  listChanges,
  formatProvidersTable,
  formatResourcesTable,
  formatRelationshipsTable,
  formatChangesTable,
} from "../app/list.ts";
import {
  formatAgentStatusTable,
  formatSkillInstallHint,
  inspectAgents,
  removeAgents,
  resolveAgentBackends,
  setupAgents,
} from "../app/agent.ts";
import { getRelatedContext, formatRelatedContext } from "../app/related.ts";
import { getResourceHistory, formatResourceHistory } from "../app/history.ts";
import { getResourceContext, formatResourceContext } from "../app/context.ts";
import {
  getInvestigationContext,
  formatInvestigationContext,
} from "../app/investigate.ts";
import {
  formatInvestigationList,
  formatSaveConfirmation,
  formatSavedInvestigation,
  formatWithInvestigationHistory,
  getInvestigationArtifact,
  getSavedInvestigation,
  listInvestigations,
  saveInvestigation,
} from "../app/investigations.ts";
import {
  formatRecordConfirmation,
  formatResolution,
  formatResolutionList,
  formatWithResolutionMemory,
  getResolution,
  listResolutions,
  recordResolution,
} from "../app/resolutions.ts";
import {
  formatIncident,
  formatIncidentAppendConfirmation,
  formatIncidentConfirmation,
  formatIncidentList,
  formatIncidentRemoveConfirmation,
  formatIncidentRetitleConfirmation,
  formatIncidentClearTitleConfirmation,
  formatIncidentRestampConfirmation,
  formatIncidentOccurredAtConfirmation,
  formatWithIncidentMemory,
  getIncident,
  listIncidents,
  listIncidentsFiltered,
  listIncidentsForInvestigation,
  listIncidentsForSubject,
  recordIncident,
  appendIncidentResolutions,
  removeIncidentResolutions,
  retitleIncident,
  clearIncidentTitle,
  restampIncident,
  setIncidentOccurredAt,
  clearIncidentOccurredAt,
  formatIncidentClearOccurredAtConfirmation,
} from "../app/incidents.ts";
import {
  compareInvestigationToCurrent,
  formatInvestigationCompare,
} from "../app/compare-investigation.ts";
import {
  projectInvestigateResourceLive,
  projectListProviders,
  projectListResources,
  projectRelatedContext,
} from "../mcp/projections.ts";
import { safeJson } from "../mcp/serialization.ts";
import { serveMcp } from "../mcp/server.ts";
import { BINARY_NAME, VERSION } from "./constants.ts";

const JSON_COMMANDS = ["providers", "resources", "related", "investigate"] as const;
const JSON_USAGE =
  "--json is only available for: providers, resources, related, investigate.";

const HELP = `combie — engineering context layer

Usage:
  ${BINARY_NAME} <command> [options]

Commands:
  init                         Initialize local Combie state
  connect <provider>           Connect a provider (cloudflare, github, vercel, sentry, neon, planetscale)
  sync [provider]              Discover and store resources
  providers                    List configured providers
                               LAST SYNC is last successful sync; LAST ATTEMPT
                               is shown when a later try failed
  resources                    List discovered resources
  relationships                List known cross-provider relationships
  changes                      List observed Resource changes
  history <resource-id>        Show current state and observed history
  related <resource-id>        Show one-hop related context for a resource
  context <resource-id>        Compose current, related, and Change context
  investigate <resource-id>    Compose one-hop investigation context around a resource
  investigations               List saved investigation snapshots
  investigation <id>           Reopen a saved investigation snapshot (--compare: diff against current compose)
  resolution                   Record or show an explicit investigation resolution
  resolutions                  List retained resolution records
  incident                     Record, show, add, or remove members of an explicit incident grouping of resolutions
  incidents                    List retained incident groupings
  mcp                          Start read-only MCP server over stdio
  agent status                 Show MCP integration status for claude, codex, cursor
  agent setup [agent...]       Configure MCP access for agents (default: all supported)
  agent remove <agent...>      Remove Combie MCP access from agent configs
  version                      Show build version
  help                         Show this help

Connect options:
  --token <token>              API token (avoid in shared shells; prefer --use-env / --use-gh)
  --token-id <id>              PlanetScale service-token ID (use with --token secret)
  --organization <slug>        PlanetScale organization when the token sees multiple orgs
  --use-env                    Use provider token from the environment
                               cloudflare: CLOUDFLARE_API_TOKEN
                               github: GITHUB_TOKEN or GH_TOKEN
                               vercel: VERCEL_TOKEN
                               sentry: SENTRY_AUTH_TOKEN or SENTRY_TOKEN
                               neon: NEON_API_KEY
                               planetscale: PLANETSCALE_SERVICE_TOKEN_ID + PLANETSCALE_SERVICE_TOKEN
  --use-gh                     GitHub only: reuse authenticated GitHub CLI (\`gh auth token\`)

Resources options:
  --provider <id>              Filter by provider
  --kind <kind>                Filter by kind (worker, database, kv_namespace, zone, repository, project)

Read options:
  --json                       Emit structured JSON for providers, resources,
                               related, or investigate

Investigate options:
  --save                       Persist a retained investigation snapshot
  --compare                    With "investigation <id>": compare snapshot to current compose
  --resource <resource-id>     With "investigations": list snapshots for one subject
                               With "resolutions": list resolutions for one subject
                               With "resolution": resource to record against (no saved investigation), or with --incident the subject of the new row (must already be a member subject)
                               With "incidents": list groupings with a member Resolution on one subject
  --investigation <id>         With "resolution": investigation to record against
                               With "resolutions": list resolutions for one investigation
                               With "incidents": list groupings with a member Resolution recorded against that investigation (membership only; one exact id)
  --incident <incident-id>     With "resolution": existing incident grouping to record
                               against (subject copied from members, or named with --resource; one exact id)
  --decision <text>            Explicit decision (what you decided)
  --action <text>              Explicit action (what you actually did)
  --outcome <text>             Explicit outcome (what happened afterward)
  --evidence <id>              Attach an exact local evidence id (optional, repeatable; never inferred)
                               With "resolutions": list retained resolutions that attached that exact local id (membership only; one exact id)
  --resolution <resolution-id> With "incident": exact Resolution id to group at create (repeatable), or to append to incident <id>
                               With "incidents": list groupings that named that exact resolution id (membership only; one exact id)
  --remove-resolution <resolution-id> With "incident <id>": exact current member Resolution id to detach (repeatable; remaining members must stay ≥2)
  --title <text>               Optional name for an incident grouping at create, or to retitle incident <id>
  --clear-title                With "incident <id>": omit the stored title (members and recordedAt unchanged)
  --recorded-at <iso>          With "incident <id>": replace recordedAt (title and members unchanged)
  --occurred-at <iso>          With "incident <id>": set occurredAt (recordedAt, title, and members unchanged)
  --clear-occurred-at           With "incident <id>": omit the stored occurredAt (recordedAt, title, and members unchanged)

Investigation history appears on investigate and investigation reopen
when snapshots exist.
Resolution memory appears on investigate and investigation reopen
when records exist, including the recorded text.
Incident memory appears on those same paths when groupings exist.

Resource references:
  <resource-id>                Stable id: provider:kind:providerResourceId
                               Example: github:repository:1001

Global:
  --dir <path>                 Combie state directory (default: ./.combie)
  --yes                        Skip confirmation prompts (non-interactive)
  --help, -h                   Show help
  --version                    Show build version

Examples:
  ${BINARY_NAME} init
  ${BINARY_NAME} connect cloudflare --use-env
  ${BINARY_NAME} connect github --use-gh
  ${BINARY_NAME} connect vercel --use-env
  ${BINARY_NAME} connect sentry --use-env
  ${BINARY_NAME} connect neon --use-env
  ${BINARY_NAME} connect planetscale --use-env
  ${BINARY_NAME} connect planetscale --organization acme --use-env
  ${BINARY_NAME} sync
  ${BINARY_NAME} providers
  ${BINARY_NAME} resources
  ${BINARY_NAME} relationships
  ${BINARY_NAME} changes
  ${BINARY_NAME} history github:repository:1001
  ${BINARY_NAME} related github:repository:1001
  ${BINARY_NAME} context github:repository:1001
  ${BINARY_NAME} investigate vercel:project:prj_abc
  ${BINARY_NAME} investigate vercel:project:prj_abc --save
  ${BINARY_NAME} investigations
  ${BINARY_NAME} investigations --resource github:repository:1001
  ${BINARY_NAME} investigation inv:…
  ${BINARY_NAME} investigation inv:… --compare
  ${BINARY_NAME} resolution --investigation inv:… --decision "Rollback" --action "Reverted deploy" --outcome "Errors dropped"
  ${BINARY_NAME} resolution --resource vercel:project:prj_abc --decision "Rollback"
  ${BINARY_NAME} resolution --incident inc:… --decision "Keep holding" --action "Held deploys"
  ${BINARY_NAME} resolution --incident inc:… --resource github:repository:1001 --decision "Keep holding"
  ${BINARY_NAME} resolutions --investigation inv:…
  ${BINARY_NAME} resolutions --resource github:repository:1001
  ${BINARY_NAME} resolutions --evidence dpl_abc
  ${BINARY_NAME} resolution res:…
  ${BINARY_NAME} incident --resolution res:… --resolution res:… --title "API error spike"
  ${BINARY_NAME} incident inc:… --resolution res:…
  ${BINARY_NAME} incident inc:… --remove-resolution res:…
  ${BINARY_NAME} incident inc:… --title "Better name"
  ${BINARY_NAME} incident inc:… --clear-title
  ${BINARY_NAME} incident inc:… --recorded-at 2026-08-17T20:00:00.000Z
  ${BINARY_NAME} incident inc:… --occurred-at 2026-08-17T14:00:00.000Z
  ${BINARY_NAME} incident inc:… --clear-occurred-at
  ${BINARY_NAME} incidents
  ${BINARY_NAME} incidents --resolution res:…
  ${BINARY_NAME} incidents --resource github:repository:1001
  ${BINARY_NAME} incidents --investigation inv:…
  ${BINARY_NAME} incident inc:…
  ${BINARY_NAME} mcp
  ${BINARY_NAME} agent status
  ${BINARY_NAME} agent setup
  ${BINARY_NAME} agent setup claude codex
  ${BINARY_NAME} agent remove claude
`;

interface ParsedArgs {
  command: string | null;
  positionals: string[];
  flags: Record<string, string | boolean>;
  /** Values of flags repeated across argv, in first-seen order (last value also in `flags`). */
  repeated: Record<string, string[]>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const repeated: Record<string, string[]> = {};
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") {
      flags.help = true;
      continue;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        if (typeof flags[key] === "string") {
          (repeated[key] ??= []).push(flags[key] as string);
        }
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
      continue;
    }
    if (a.startsWith("-") && a.length === 2) {
      flags[a.slice(1)] = true;
      continue;
    }
    positionals.push(a);
  }
  return {
    command: positionals[0] ?? null,
    positionals: positionals.slice(1),
    flags,
    repeated,
  };
}

function baseDirFromFlags(flags: Record<string, string | boolean>): string {
  const dir = flags.dir;
  if (typeof dir === "string" && dir.length > 0) {
    return resolveBaseDir(dir);
  }
  return resolveBaseDir();
}

async function confirmAction(prompt: string, yes: boolean): Promise<boolean> {
  if (yes) {
    return true;
  }
  if (!process.stdout.isTTY) {
    return true;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${prompt} [Y/n] `);
    const trimmed = answer.trim().toLowerCase();
    return trimmed === "" || trimmed === "y" || trimmed === "yes";
  } finally {
    rl.close();
  }
}

function optionalFlagId(
  value: string | boolean | undefined,
): string | undefined | "missing" {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return "missing";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "missing";
}

function optionalFlagText(
  value: string | boolean | undefined,
): string | undefined | "missing" {
  return optionalFlagId(value);
}

async function main(argv: string[]): Promise<number> {
  const { command, positionals, flags, repeated } = parseArgs(argv);

  if (command === "version" || flags.version === true) {
    console.log(`combie ${VERSION}`);
    return 0;
  }

  if (!command || command === "help" || flags.help) {
    console.log(HELP.trimEnd());
    return 0;
  }

  if (flags.dir === true) {
    console.error(`--dir requires a path.\nUsage: ${BINARY_NAME} <command> --dir <path>`);
    return 1;
  }

  if (typeof flags.json === "string") {
    console.error(`--json does not take a value.\n${JSON_USAGE}`);
    return 1;
  }

  if (
    flags.json === true &&
    !JSON_COMMANDS.some((jsonCommand) => jsonCommand === command)
  ) {
    console.error(JSON_USAGE);
    return 1;
  }

  const baseDir = baseDirFromFlags(flags);

  try {
    switch (command) {
      case "init": {
        const result = initCombie(baseDir);
        console.log(result.message);
        return result.created ? 0 : 0;
      }
      case "connect": {
        const providerId = positionals[0];
        if (!providerId) {
          console.error(
            `Usage: ${BINARY_NAME} connect <provider>\nExample: ${BINARY_NAME} connect cloudflare\n         ${BINARY_NAME} connect github --use-gh`,
          );
          return 1;
        }
        const token = typeof flags.token === "string" ? flags.token : undefined;
        const tokenId =
          typeof flags["token-id"] === "string" ? flags["token-id"] : undefined;
        const organization =
          typeof flags.organization === "string"
            ? flags.organization
            : undefined;
        const useEnvToken = flags["use-env"] === true;
        const useGh = flags["use-gh"] === true;
        const result = await connectProvider({
          baseDir,
          providerId,
          token,
          tokenId,
          organization,
          useEnvToken,
          useGh,
        });
        console.log(result.message);
        return 0;
      }
      case "sync": {
        const providerId = positionals[0];
        const result = await syncProviders({
          baseDir,
          providerId,
        });
        console.log(result.message);
        return result.ok ? 0 : 1;
      }
      case "providers": {
        const { providers } = listProviders(baseDir);
        if (flags.json === true) {
          console.log(
            JSON.stringify(safeJson(projectListProviders(providers)), null, 2),
          );
        } else {
          console.log(formatProvidersTable(providers));
        }
        return 0;
      }
      case "resources": {
        const provider = typeof flags.provider === "string" ? flags.provider : undefined;
        const kind = typeof flags.kind === "string" ? flags.kind : undefined;
        const { resources } = listResources({ baseDir, provider, kind });
        if (flags.json === true) {
          console.log(
            JSON.stringify(safeJson(projectListResources(resources)), null, 2),
          );
        } else {
          console.log(formatResourcesTable(resources));
        }
        return 0;
      }
      case "relationships": {
        const { relationships, labels } = listRelationships(baseDir);
        console.log(formatRelationshipsTable(relationships, labels));
        return 0;
      }
      case "changes": {
        const { changes } = listChanges(baseDir);
        console.log(formatChangesTable(changes));
        return 0;
      }
      case "history": {
        const resourceRef = positionals[0];
        if (!resourceRef) {
          console.error(
            `Usage: ${BINARY_NAME} history <resource-id>\nExample: ${BINARY_NAME} history github:repository:1001\nList ids: ${BINARY_NAME} resources`,
          );
          return 1;
        }
        const history = getResourceHistory({ baseDir, resourceRef });
        console.log(formatResourceHistory(history));
        return 0;
      }
      case "related": {
        const resourceRef = positionals[0];
        if (!resourceRef) {
          console.error(
            `Usage: ${BINARY_NAME} related <resource-id>\nExample: ${BINARY_NAME} related github:repository:1001\nList ids: ${BINARY_NAME} resources`,
          );
          return 1;
        }
        const ctx = getRelatedContext({ baseDir, resourceRef });
        if (flags.json === true) {
          console.log(
            JSON.stringify(safeJson(projectRelatedContext(ctx)), null, 2),
          );
        } else {
          console.log(formatRelatedContext(ctx));
        }
        return 0;
      }
      case "context": {
        const resourceRef = positionals[0];
        if (!resourceRef) {
          console.error(
            `Usage: ${BINARY_NAME} context <resource-id>\nExample: ${BINARY_NAME} context github:repository:1001\nList ids: ${BINARY_NAME} resources`,
          );
          return 1;
        }
        const context = getResourceContext({ baseDir, resourceRef });
        console.log(formatResourceContext(context));
        return 0;
      }
      case "investigate": {
        const resourceRef = positionals[0];
        if (!resourceRef) {
          console.error(
            `Usage: ${BINARY_NAME} investigate <resource-id> [--save]\nExample: ${BINARY_NAME} investigate vercel:project:prj_abc\nList ids: ${BINARY_NAME} resources`,
          );
          return 1;
        }
        if (flags.json === true && flags.save === true) {
          console.error(
            `--json is read-only observe. Use: ${BINARY_NAME} investigate <resource-id> --save`,
          );
          return 1;
        }
        if (flags.save === true) {
          const saved = saveInvestigation({ baseDir, resourceRef });
          console.log(
            formatWithIncidentMemory(
              formatWithResolutionMemory(
                formatWithInvestigationHistory(
                  saved.liveOutput,
                  listInvestigations(baseDir, {
                    subjectResourceId: saved.record.subjectResourceId,
                  }),
                ),
                listResolutions(baseDir, {
                  subjectResourceId: saved.record.subjectResourceId,
                }),
                "subject",
              ),
              listIncidentsForSubject(
                baseDir,
                saved.record.subjectResourceId,
              ),
              "subject",
            ),
          );
          console.log("");
          console.log(formatSaveConfirmation(saved.record));
          return 0;
        }
        const investigation = getInvestigationContext({
          baseDir,
          resourceRef,
        });
        if (flags.json === true) {
          const resolutionRows = listResolutions(baseDir, {
            subjectResourceId: investigation.subject.id,
          });
          const incidentRows = listIncidentsForSubject(
            baseDir,
            investigation.subject.id,
          );
          const investigationRows = listInvestigations(baseDir, {
            subjectResourceId: investigation.subject.id,
          });
          console.log(
            JSON.stringify(
              safeJson(
                projectInvestigateResourceLive({
                  ctx: investigation,
                  resolutionRows,
                  incidentRows,
                  investigationRows,
                }),
              ),
              null,
              2,
            ),
          );
          return 0;
        }
        console.log(
          formatWithIncidentMemory(
            formatWithResolutionMemory(
              formatWithInvestigationHistory(
                formatInvestigationContext(investigation),
                listInvestigations(baseDir, {
                  subjectResourceId: investigation.subject.id,
                }),
              ),
              listResolutions(baseDir, {
                subjectResourceId: investigation.subject.id,
              }),
              "subject",
            ),
            listIncidentsForSubject(baseDir, investigation.subject.id),
            "subject",
          ),
        );
        return 0;
      }
      case "investigations": {
        const resource =
          typeof flags.resource === "string" ? flags.resource.trim() : undefined;
        if (flags.resource !== undefined && !resource) {
          console.error(
            `--resource requires a resource id.\nUsage: ${BINARY_NAME} investigations [--resource <resource-id>]\nExample: ${BINARY_NAME} investigations --resource github:repository:1001`,
          );
          return 1;
        }
        const records = listInvestigations(
          baseDir,
          resource !== undefined ? { subjectResourceId: resource } : undefined,
        );
        console.log(formatInvestigationList(records, resource));
        return 0;
      }
      case "investigation": {
        const investigationId = positionals[0];
        if (!investigationId) {
          console.error(
            `Usage: ${BINARY_NAME} investigation <investigation-id> [--compare]\nList ids: ${BINARY_NAME} investigations`,
          );
          return 1;
        }
        if (flags.compare === true) {
          const comparison = compareInvestigationToCurrent({
            baseDir,
            investigationId,
          });
          console.log(formatInvestigationCompare(comparison));
          return 0;
        }
        const saved = getSavedInvestigation(baseDir, investigationId);
        const artifact = getInvestigationArtifact(baseDir, saved.id);
        console.log(
          formatWithIncidentMemory(
            formatWithResolutionMemory(
              formatWithInvestigationHistory(
                formatSavedInvestigation(saved, artifact),
                listInvestigations(baseDir, {
                  subjectResourceId: saved.subjectResourceId,
                }),
              ),
              listResolutions(baseDir, { investigationId: saved.id }),
              "investigation",
            ),
            listIncidentsForInvestigation(baseDir, saved.id),
            "investigation",
          ),
        );
        return 0;
      }
      case "resolution": {
        const investigationFlag = optionalFlagId(flags.investigation);
        if (investigationFlag === "missing") {
          console.error(
            `--investigation requires an investigation id.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        const resourceFlag = optionalFlagId(flags.resource);
        if (resourceFlag === "missing") {
          console.error(
            `--resource requires a resource id.\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        const incidentFlag = optionalFlagId(flags.incident);
        if (incidentFlag === "missing") {
          console.error(
            `--incident requires an incident id.\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        if ((repeated.incident ?? []).length > 0) {
          console.error(
            `--incident takes one exact id on record.\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        const decision = optionalFlagText(flags.decision);
        const action = optionalFlagText(flags.action);
        const outcome = optionalFlagText(flags.outcome);
        if (decision === "missing" || action === "missing" || outcome === "missing") {
          const flag =
            decision === "missing"
              ? "decision"
              : action === "missing"
                ? "action"
                : "outcome";
          console.error(
            `--${flag} requires text.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        const evidenceParts = [
          ...(repeated.evidence ?? []),
          ...(typeof flags.evidence === "string" ? [flags.evidence] : []),
        ];
        if (flags.evidence === true || evidenceParts.some((id) => id.trim().length === 0)) {
          console.error(
            `--evidence requires an evidence id.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        if ((repeated.resource ?? []).length > 0) {
          console.error(
            `--resource takes one exact id on record.\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        if (
          investigationFlag &&
          (resourceFlag !== undefined || incidentFlag !== undefined)
        ) {
          console.error(
            `Use exactly one of --investigation, --resource, or --incident.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        const hasAnchor =
          investigationFlag !== undefined ||
          resourceFlag !== undefined ||
          incidentFlag !== undefined;
        if (hasAnchor) {
          if (positionals[0]) {
            console.error(
              `Usage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nShow: ${BINARY_NAME} resolution <resolution-id>`,
            );
            return 1;
          }
          const recorded = recordResolution({
            baseDir,
            ...(investigationFlag ? { investigationId: investigationFlag } : {}),
            ...(resourceFlag ? { subjectResourceId: resourceFlag } : {}),
            ...(incidentFlag ? { incidentId: incidentFlag } : {}),
            ...(decision ? { decision } : {}),
            ...(action ? { action } : {}),
            ...(outcome ? { outcome } : {}),
            ...(evidenceParts.length > 0 ? { evidenceIds: evidenceParts } : {}),
          });
          console.log(
            formatRecordConfirmation(recorded, incidentFlag ?? undefined),
          );
          return 0;
        }
        const resolutionId = positionals[0];
        if (!resolutionId) {
          console.error(
            `Usage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nShow: ${BINARY_NAME} resolution <resolution-id>\nList ids: ${BINARY_NAME} resolutions`,
          );
          return 1;
        }
        if (decision || action || outcome || evidenceParts.length > 0) {
          console.error(
            `Recording a resolution requires --investigation, --resource, or --incident.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --incident <incident-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        const record = getResolution(baseDir, resolutionId);
        console.log(formatResolution(record));
        return 0;
      }
      case "resolutions": {
        const investigation =
          optionalFlagId(flags.investigation);
        if (investigation === "missing") {
          console.error(
            `--investigation requires an investigation id.\nUsage: ${BINARY_NAME} resolutions [--investigation <investigation-id>] [--resource <resource-id>] [--evidence <evidence-id>]`,
          );
          return 1;
        }
        const resource =
          typeof flags.resource === "string" ? flags.resource.trim() : undefined;
        if (flags.resource !== undefined && !resource) {
          console.error(
            `--resource requires a resource id.\nUsage: ${BINARY_NAME} resolutions [--investigation <investigation-id>] [--resource <resource-id>] [--evidence <evidence-id>]`,
          );
          return 1;
        }
        const evidence =
          typeof flags.evidence === "string" ? flags.evidence.trim() : undefined;
        if (flags.evidence !== undefined && !evidence) {
          console.error(
            `--evidence requires an evidence id.\nUsage: ${BINARY_NAME} resolutions [--investigation <investigation-id>] [--resource <resource-id>] [--evidence <evidence-id>]`,
          );
          return 1;
        }
        if ((repeated.evidence ?? []).length > 0) {
          console.error(
            `--evidence takes one exact id on the resolutions list.\nUsage: ${BINARY_NAME} resolutions [--investigation <investigation-id>] [--resource <resource-id>] [--evidence <evidence-id>]`,
          );
          return 1;
        }
        const records = listResolutions(baseDir, {
          ...(investigation ? { investigationId: investigation } : {}),
          ...(resource !== undefined ? { subjectResourceId: resource } : {}),
          ...(evidence !== undefined ? { evidenceId: evidence } : {}),
        });
        console.log(
          formatResolutionList(records, {
            ...(investigation ? { investigationId: investigation } : {}),
            ...(resource !== undefined ? { subjectResourceId: resource } : {}),
            ...(evidence !== undefined ? { evidenceId: evidence } : {}),
          }),
        );
        return 0;
      }
      case "incident": {
        if (flags.investigation !== undefined || flags.resource !== undefined) {
          console.error(
            `Recording an incident groups existing --resolution ids; do not pass --investigation or --resource.\nUsage: ${BINARY_NAME} incident --resolution <resolution-id> --resolution <resolution-id> [--title <text>]\nShow: ${BINARY_NAME} incident <incident-id>`,
          );
          return 1;
        }
        const resolutionParts = [
          ...(repeated.resolution ?? []),
          ...(typeof flags.resolution === "string" ? [flags.resolution] : []),
        ];
        const removeParts = [
          ...(repeated["remove-resolution"] ?? []),
          ...(typeof flags["remove-resolution"] === "string"
            ? [flags["remove-resolution"]]
            : []),
        ];
        if (
          flags.resolution === true ||
          resolutionParts.some((id) => id.trim().length === 0)
        ) {
          console.error(
            `--resolution requires a resolution id.\nUsage: ${BINARY_NAME} incident --resolution <resolution-id> --resolution <resolution-id> [--title <text>]`,
          );
          return 1;
        }
        if (
          flags["remove-resolution"] === true ||
          removeParts.some((id) => id.trim().length === 0)
        ) {
          console.error(
            `--remove-resolution requires a resolution id.\nUsage: ${BINARY_NAME} incident <incident-id> --remove-resolution <resolution-id>`,
          );
          return 1;
        }
        const title = optionalFlagText(flags.title);
        if (title === "missing") {
          console.error(
            `--title requires text.\nUsage: ${BINARY_NAME} incident --resolution <resolution-id> --resolution <resolution-id> [--title <text>]\nUsage: ${BINARY_NAME} incident <incident-id> --title <text>`,
          );
          return 1;
        }
        if ((repeated.title ?? []).length > 0) {
          console.error(
            `--title takes one exact title on retitle.\nUsage: ${BINARY_NAME} incident <incident-id> --title <text>`,
          );
          return 1;
        }
        const clearTitleFlag = flags["clear-title"];
        if (typeof clearTitleFlag === "string") {
          console.error(
            `--clear-title does not take a value.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-title`,
          );
          return 1;
        }
        if ((repeated["clear-title"] ?? []).length > 0) {
          console.error(
            `--clear-title takes one flag.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-title`,
          );
          return 1;
        }
        const clearTitle = clearTitleFlag === true;
        const recordedAt = optionalFlagText(flags["recorded-at"]);
        if (recordedAt === "missing") {
          console.error(
            `--recorded-at requires an ISO timestamp.\nUsage: ${BINARY_NAME} incident <incident-id> --recorded-at <iso>`,
          );
          return 1;
        }
        if ((repeated["recorded-at"] ?? []).length > 0) {
          console.error(
            `--recorded-at takes one exact timestamp.\nUsage: ${BINARY_NAME} incident <incident-id> --recorded-at <iso>`,
          );
          return 1;
        }
        const occurredAt = optionalFlagText(flags["occurred-at"]);
        if (occurredAt === "missing") {
          console.error(
            `--occurred-at requires an ISO timestamp.\nUsage: ${BINARY_NAME} incident <incident-id> --occurred-at <iso>`,
          );
          return 1;
        }
        if ((repeated["occurred-at"] ?? []).length > 0) {
          console.error(
            `--occurred-at takes one exact timestamp.\nUsage: ${BINARY_NAME} incident <incident-id> --occurred-at <iso>`,
          );
          return 1;
        }
        const clearOccurredAtFlag = flags["clear-occurred-at"];
        if (typeof clearOccurredAtFlag === "string") {
          console.error(
            `--clear-occurred-at does not take a value.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-occurred-at`,
          );
          return 1;
        }
        if ((repeated["clear-occurred-at"] ?? []).length > 0) {
          console.error(
            `--clear-occurred-at takes one flag.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-occurred-at`,
          );
          return 1;
        }
        const clearOccurredAt = clearOccurredAtFlag === true;
        if (recordedAt && title) {
          console.error(
            `Use --title to retitle or --recorded-at to restamp; not both.\nUsage: ${BINARY_NAME} incident <incident-id> --title <text>\nUsage: ${BINARY_NAME} incident <incident-id> --recorded-at <iso>`,
          );
          return 1;
        }
        if (recordedAt && clearTitle) {
          console.error(
            `Use --clear-title to omit the title or --recorded-at to restamp; not both.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-title\nUsage: ${BINARY_NAME} incident <incident-id> --recorded-at <iso>`,
          );
          return 1;
        }
        if (clearTitle && title) {
          console.error(
            `Use --title to retitle or --clear-title to omit; not both.\nUsage: ${BINARY_NAME} incident <incident-id> --title <text>\nUsage: ${BINARY_NAME} incident <incident-id> --clear-title`,
          );
          return 1;
        }
        if (resolutionParts.length > 0 && removeParts.length > 0) {
          console.error(
            `Use --resolution to append or --remove-resolution to detach; not both.\nUsage: ${BINARY_NAME} incident <incident-id> --resolution <resolution-id>\nUsage: ${BINARY_NAME} incident <incident-id> --remove-resolution <resolution-id>`,
          );
          return 1;
        }
        if (
          recordedAt &&
          (resolutionParts.length > 0 || removeParts.length > 0)
        ) {
          console.error(
            `Use --recorded-at without --resolution or --remove-resolution.\nUsage: ${BINARY_NAME} incident <incident-id> --recorded-at <iso>`,
          );
          return 1;
        }
        if (occurredAt && title) {
          console.error(
            `Use --title to retitle or --occurred-at to set occurrence time; not both.\nUsage: ${BINARY_NAME} incident <incident-id> --title <text>\nUsage: ${BINARY_NAME} incident <incident-id> --occurred-at <iso>`,
          );
          return 1;
        }
        if (occurredAt && clearTitle) {
          console.error(
            `Use --clear-title to omit the title or --occurred-at to set occurrence time; not both.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-title\nUsage: ${BINARY_NAME} incident <incident-id> --occurred-at <iso>`,
          );
          return 1;
        }
        if (occurredAt && recordedAt) {
          console.error(
            `Use --recorded-at to restamp or --occurred-at to set occurrence time; not both.\nUsage: ${BINARY_NAME} incident <incident-id> --recorded-at <iso>\nUsage: ${BINARY_NAME} incident <incident-id> --occurred-at <iso>`,
          );
          return 1;
        }
        if (
          occurredAt &&
          (resolutionParts.length > 0 || removeParts.length > 0)
        ) {
          console.error(
            `Use --occurred-at without --resolution or --remove-resolution.\nUsage: ${BINARY_NAME} incident <incident-id> --occurred-at <iso>`,
          );
          return 1;
        }
        if (clearOccurredAt && occurredAt) {
          console.error(
            `Use --clear-occurred-at to omit occurrence time or --occurred-at to set occurrence time; not both.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-occurred-at\nUsage: ${BINARY_NAME} incident <incident-id> --occurred-at <iso>`,
          );
          return 1;
        }
        if (clearOccurredAt && recordedAt) {
          console.error(
            `Use --recorded-at to restamp or --clear-occurred-at to omit occurrence time; not both.\nUsage: ${BINARY_NAME} incident <incident-id> --recorded-at <iso>\nUsage: ${BINARY_NAME} incident <incident-id> --clear-occurred-at`,
          );
          return 1;
        }
        if (clearOccurredAt && title) {
          console.error(
            `Use --title to retitle or --clear-occurred-at to omit occurrence time; not both.\nUsage: ${BINARY_NAME} incident <incident-id> --title <text>\nUsage: ${BINARY_NAME} incident <incident-id> --clear-occurred-at`,
          );
          return 1;
        }
        if (clearOccurredAt && clearTitle) {
          console.error(
            `Use --clear-title to omit the title or --clear-occurred-at to omit occurrence time; not both.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-title\nUsage: ${BINARY_NAME} incident <incident-id> --clear-occurred-at`,
          );
          return 1;
        }
        if (
          clearOccurredAt &&
          (resolutionParts.length > 0 || removeParts.length > 0)
        ) {
          console.error(
            `Use --clear-occurred-at without --resolution or --remove-resolution.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-occurred-at`,
          );
          return 1;
        }
        if (
          clearTitle &&
          (resolutionParts.length > 0 || removeParts.length > 0)
        ) {
          console.error(
            `Use --clear-title without --resolution or --remove-resolution.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-title`,
          );
          return 1;
        }
        if (removeParts.length > 0) {
          if (!positionals[0]) {
            console.error(
              `--remove-resolution requires an existing incident id.\nUsage: ${BINARY_NAME} incident <incident-id> --remove-resolution <resolution-id>`,
            );
            return 1;
          }
          if (title) {
            console.error(
              `--title is only for recording a new incident grouping.\nUsage: ${BINARY_NAME} incident <incident-id> --remove-resolution <resolution-id>`,
            );
            return 1;
          }
          const result = removeIncidentResolutions({
            baseDir,
            incidentId: positionals[0],
            resolutionIds: removeParts,
          });
          console.log(
            formatIncidentRemoveConfirmation(
              result.record,
              result.removedIds,
            ),
          );
          return 0;
        }
        if (resolutionParts.length > 0) {
          if (positionals[0]) {
            if (title) {
              console.error(
                `--title is only for recording a new incident grouping.\nUsage: ${BINARY_NAME} incident <incident-id> --resolution <resolution-id>`,
              );
              return 1;
            }
            const result = appendIncidentResolutions({
              baseDir,
              incidentId: positionals[0],
              resolutionIds: resolutionParts,
            });
            console.log(
              formatIncidentAppendConfirmation(
                result.record,
                result.appendedIds,
              ),
            );
            return 0;
          }
          const recorded = recordIncident({
            baseDir,
            resolutionIds: resolutionParts,
            ...(title ? { title } : {}),
          });
          console.log(formatIncidentConfirmation(recorded));
          return 0;
        }
        const incidentShowId = positionals[0];
        if (!incidentShowId) {
          if (occurredAt) {
            console.error(
              `--occurred-at requires an existing incident id.\nUsage: ${BINARY_NAME} incident <incident-id> --occurred-at <iso>`,
            );
          } else if (clearOccurredAt) {
            console.error(
              `--clear-occurred-at requires an existing incident id.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-occurred-at`,
            );
          } else if (recordedAt) {
            console.error(
              `--recorded-at requires an existing incident id.\nUsage: ${BINARY_NAME} incident <incident-id> --recorded-at <iso>`,
            );
          } else if (clearTitle) {
            console.error(
              `--clear-title requires an existing incident id.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-title`,
            );
          } else {
            console.error(
              `Usage: ${BINARY_NAME} incident --resolution <resolution-id> --resolution <resolution-id> [--title <text>]\nShow: ${BINARY_NAME} incident <incident-id>\nList ids: ${BINARY_NAME} incidents`,
            );
          }
          return 1;
        }
        if (occurredAt) {
          const updated = setIncidentOccurredAt({
            baseDir,
            incidentId: incidentShowId,
            occurredAt,
          });
          console.log(formatIncidentOccurredAtConfirmation(updated));
          return 0;
        }
        if (clearOccurredAt) {
          const clearedOccurred = clearIncidentOccurredAt({
            baseDir,
            incidentId: incidentShowId,
          });
          console.log(
            formatIncidentClearOccurredAtConfirmation(clearedOccurred),
          );
          return 0;
        }
        if (recordedAt) {
          const restamped = restampIncident({
            baseDir,
            incidentId: incidentShowId,
            recordedAt,
          });
          console.log(formatIncidentRestampConfirmation(restamped));
          return 0;
        }
        if (clearTitle) {
          const cleared = clearIncidentTitle({
            baseDir,
            incidentId: incidentShowId,
          });
          console.log(formatIncidentClearTitleConfirmation(cleared));
          return 0;
        }
        if (title) {
          const renamed = retitleIncident({
            baseDir,
            incidentId: incidentShowId,
            title,
          });
          console.log(formatIncidentRetitleConfirmation(renamed));
          return 0;
        }
        const incident = getIncident(baseDir, incidentShowId);
        console.log(formatIncident(incident));
        return 0;
      }
      case "incidents": {
        const investigationFlag = optionalFlagId(flags.investigation);
        if (investigationFlag === "missing") {
          console.error(
            `--investigation requires an investigation id.\nUsage: ${BINARY_NAME} incidents [--resolution <resolution-id>] [--resource <resource-id>] [--investigation <investigation-id>]`,
          );
          return 1;
        }
        if ((repeated.investigation ?? []).length > 0) {
          console.error(
            `--investigation takes one exact id on the incidents list.\nUsage: ${BINARY_NAME} incidents [--resolution <resolution-id>] [--resource <resource-id>] [--investigation <investigation-id>]`,
          );
          return 1;
        }
        const resolution =
          typeof flags.resolution === "string"
            ? flags.resolution.trim()
            : undefined;
        if (flags.resolution !== undefined && !resolution) {
          console.error(
            `--resolution requires a resolution id.\nUsage: ${BINARY_NAME} incidents [--resolution <resolution-id>] [--resource <resource-id>] [--investigation <investigation-id>]`,
          );
          return 1;
        }
        if ((repeated.resolution ?? []).length > 0) {
          console.error(
            `--resolution takes one exact id on the incidents list.\nUsage: ${BINARY_NAME} incidents [--resolution <resolution-id>] [--resource <resource-id>] [--investigation <investigation-id>]`,
          );
          return 1;
        }
        const resource =
          typeof flags.resource === "string" ? flags.resource.trim() : undefined;
        if (flags.resource !== undefined && !resource) {
          console.error(
            `--resource requires a resource id.\nUsage: ${BINARY_NAME} incidents [--resolution <resolution-id>] [--resource <resource-id>] [--investigation <investigation-id>]`,
          );
          return 1;
        }
        const filter =
          resolution !== undefined ||
          resource !== undefined ||
          investigationFlag !== undefined
            ? {
                ...(resolution !== undefined ? { resolutionId: resolution } : {}),
                ...(resource !== undefined
                  ? { subjectResourceId: resource }
                  : {}),
                ...(investigationFlag !== undefined
                  ? { investigationId: investigationFlag }
                  : {}),
              }
            : undefined;
        const records = filter
          ? listIncidentsFiltered(baseDir, filter)
          : listIncidents(baseDir);
        console.log(formatIncidentList(records, filter));
        return 0;
      }
      case "mcp": {
        await serveMcp({ baseDir });
        return 0;
      }
      case "agent": {
        const sub = positionals[0];
        const usage = `Usage: ${BINARY_NAME} agent <setup|status|remove> [agent...]\nAgents: claude, codex, cursor`;
        if (!sub) {
          console.error(usage);
          return 1;
        }
        if (sub === "status") {
          const statuses = inspectAgents(baseDir);
          console.log(formatAgentStatusTable(statuses));
          return 0;
        }
        if (sub === "setup") {
          const names = positionals.length > 1 ? positionals.slice(1) : null;
          const planned = resolveAgentBackends(names);
          const configured = new Set(
            inspectAgents(baseDir)
              .filter((s) => s.status === "configured")
              .map((s) => s.kind),
          );
          const toConfigure = planned.filter((b) => !configured.has(b.kind));
          if (toConfigure.length === 0) {
            console.log("All requested agents are already configured.");
            console.log(formatSkillInstallHint());
            return 0;
          }
          const ok = await confirmAction(
            `Configure MCP access for ${toConfigure.map((b) => b.label).join(", ")}?`,
            flags.yes === true,
          );
          if (!ok) {
            console.log("Skipped. No changes made.");
            return 0;
          }
          const results = setupAgents(names, baseDir);
          for (const result of results) {
            console.log(result.message);
          }
          console.log(formatSkillInstallHint());
          return 0;
        }
        if (sub === "remove") {
          const names = positionals.slice(1);
          if (names.length === 0) {
            console.error(
              `Usage: ${BINARY_NAME} agent remove <agent...>\nAgents: claude, codex, cursor`,
            );
            return 1;
          }
          const backends = resolveAgentBackends(names);
          const ok = await confirmAction(
            `Remove Combie MCP access from ${backends.map((b) => b.label).join(", ")}?`,
            flags.yes === true,
          );
          if (!ok) {
            console.log("Skipped. No changes made.");
            return 0;
          }
          const results = removeAgents(names);
          for (const result of results) {
            console.log(result.message);
          }
          return 0;
        }
        console.error(`Unknown agent command: ${sub}\n${usage}`);
        return 1;
      }
      default:
        console.error(`Unknown command: ${command}\n\n${HELP.trimEnd()}`);
        return 1;
    }
  } catch (err) {
    if (err instanceof CombieError) {
      console.error(err.message);
      return err.exitCode;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    return 1;
  }
}

if (import.meta.main) {
  const code = await main(process.argv.slice(2));
  process.exit(code);
}

export { main, parseArgs, HELP };
