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
  formatIncidentConfirmation,
  formatIncidentList,
  getIncident,
  listIncidents,
  recordIncident,
} from "../app/incidents.ts";
import {
  compareInvestigationToCurrent,
  formatInvestigationCompare,
} from "../app/compare-investigation.ts";
import { serveMcp } from "../mcp/server.ts";
import { BINARY_NAME, VERSION } from "./constants.ts";

const HELP = `combie — engineering context layer

Usage:
  ${BINARY_NAME} <command> [options]

Commands:
  init                         Initialize local Combie state
  connect <provider>           Connect a provider (cloudflare, github, vercel, sentry, neon, planetscale)
  sync [provider]              Discover and store resources
  providers                    List configured providers
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
  incident                     Record or show an explicit incident grouping of resolutions
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

Investigate options:
  --save                       Persist a retained investigation snapshot
  --compare                    With "investigation <id>": compare snapshot to current compose
  --resource <resource-id>     With "investigations": list snapshots for one subject
                               With "resolutions": list resolutions for one subject
                               With "resolution": resource to record against (no saved investigation)
  --investigation <id>         With "resolution": investigation to record against
                               With "resolutions": list resolutions for one investigation
  --decision <text>            Explicit decision (what you decided)
  --action <text>              Explicit action (what you actually did)
  --outcome <text>             Explicit outcome (what happened afterward)
  --evidence <id>              Attach an exact local evidence id (optional, repeatable; never inferred)
                               With "resolutions": list retained resolutions that attached that exact local id (membership only; one exact id)
  --resolution <resolution-id> With "incident": exact Resolution id to group (repeatable; never inferred)
  --title <text>               Optional name for an incident grouping

Resolution memory appears on investigate and investigation reopen
when records exist, including the recorded text.

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
  ${BINARY_NAME} resolutions --investigation inv:…
  ${BINARY_NAME} resolutions --resource github:repository:1001
  ${BINARY_NAME} resolutions --evidence dpl_abc
  ${BINARY_NAME} resolution res:…
  ${BINARY_NAME} incident --resolution res:… --resolution res:… --title "API error spike"
  ${BINARY_NAME} incidents
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
        console.log(formatProvidersTable(providers));
        return 0;
      }
      case "resources": {
        const provider = typeof flags.provider === "string" ? flags.provider : undefined;
        const kind = typeof flags.kind === "string" ? flags.kind : undefined;
        const { resources } = listResources({ baseDir, provider, kind });
        console.log(formatResourcesTable(resources));
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
        console.log(formatRelatedContext(ctx));
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
        if (flags.save === true) {
          const saved = saveInvestigation({ baseDir, resourceRef });
          console.log(
            formatWithResolutionMemory(
              saved.liveOutput,
              listResolutions(baseDir, {
                subjectResourceId: saved.record.subjectResourceId,
              }),
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
        console.log(
          formatWithResolutionMemory(
            formatInvestigationContext(investigation),
            listResolutions(baseDir, {
              subjectResourceId: investigation.subject.id,
            }),
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
        console.log(
          formatWithResolutionMemory(
            formatSavedInvestigation(saved),
            listResolutions(baseDir, { investigationId: saved.id }),
            "investigation",
          ),
        );
        return 0;
      }
      case "resolution": {
        const investigationFlag = optionalFlagId(flags.investigation);
        if (investigationFlag === "missing") {
          console.error(
            `--investigation requires an investigation id.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        const resourceFlag = optionalFlagId(flags.resource);
        if (resourceFlag === "missing") {
          console.error(
            `--resource requires a resource id.\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
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
            `--${flag} requires text.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        const evidenceParts = [
          ...(repeated.evidence ?? []),
          ...(typeof flags.evidence === "string" ? [flags.evidence] : []),
        ];
        if (flags.evidence === true || evidenceParts.some((id) => id.trim().length === 0)) {
          console.error(
            `--evidence requires an evidence id.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        if (investigationFlag && resourceFlag) {
          console.error(
            `Use exactly one of --investigation or --resource.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
          );
          return 1;
        }
        if (investigationFlag || resourceFlag) {
          if (positionals[0]) {
            console.error(
              `Usage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nShow: ${BINARY_NAME} resolution <resolution-id>`,
            );
            return 1;
          }
          const recorded = recordResolution({
            baseDir,
            ...(investigationFlag ? { investigationId: investigationFlag } : {}),
            ...(resourceFlag ? { subjectResourceId: resourceFlag } : {}),
            ...(decision ? { decision } : {}),
            ...(action ? { action } : {}),
            ...(outcome ? { outcome } : {}),
            ...(evidenceParts.length > 0 ? { evidenceIds: evidenceParts } : {}),
          });
          console.log(formatRecordConfirmation(recorded));
          return 0;
        }
        const resolutionId = positionals[0];
        if (!resolutionId) {
          console.error(
            `Usage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nShow: ${BINARY_NAME} resolution <resolution-id>\nList ids: ${BINARY_NAME} resolutions`,
          );
          return 1;
        }
        if (decision || action || outcome || evidenceParts.length > 0) {
          console.error(
            `Recording a resolution requires --investigation or --resource.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]\nUsage: ${BINARY_NAME} resolution --resource <resource-id> --decision <text> [--action <text>] [--outcome <text>] [--evidence <id>]`,
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
        if (
          flags.resolution === true ||
          resolutionParts.some((id) => id.trim().length === 0)
        ) {
          console.error(
            `--resolution requires a resolution id.\nUsage: ${BINARY_NAME} incident --resolution <resolution-id> --resolution <resolution-id> [--title <text>]`,
          );
          return 1;
        }
        const title = optionalFlagText(flags.title);
        if (title === "missing") {
          console.error(
            `--title requires text.\nUsage: ${BINARY_NAME} incident --resolution <resolution-id> --resolution <resolution-id> [--title <text>]`,
          );
          return 1;
        }
        if (resolutionParts.length > 0) {
          if (positionals[0]) {
            console.error(
              `Usage: ${BINARY_NAME} incident --resolution <resolution-id> --resolution <resolution-id> [--title <text>]\nShow: ${BINARY_NAME} incident <incident-id>`,
            );
            return 1;
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
          console.error(
            `Usage: ${BINARY_NAME} incident --resolution <resolution-id> --resolution <resolution-id> [--title <text>]\nShow: ${BINARY_NAME} incident <incident-id>\nList ids: ${BINARY_NAME} incidents`,
          );
          return 1;
        }
        if (title) {
          console.error(
            `Recording an incident requires --resolution ids.\nUsage: ${BINARY_NAME} incident --resolution <resolution-id> --resolution <resolution-id> [--title <text>]\nShow: ${BINARY_NAME} incident <incident-id>`,
          );
          return 1;
        }
        const incident = getIncident(baseDir, incidentShowId);
        console.log(formatIncident(incident));
        return 0;
      }
      case "incidents": {
        if (
          flags.resolution !== undefined ||
          flags.resource !== undefined ||
          flags.investigation !== undefined
        ) {
          console.error(
            `incidents lists retained groupings; it does not filter by --resolution, --resource, or --investigation.\nUsage: ${BINARY_NAME} incidents`,
          );
          return 1;
        }
        console.log(formatIncidentList(listIncidents(baseDir)));
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
