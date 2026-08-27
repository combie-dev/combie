#!/usr/bin/env bun
import { createInterface } from "node:readline/promises";
import {
  resolveAgentCombieHome,
  resolveBaseDir,
} from "../storage/paths.ts";
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
  composeTaskContext,
  normalizeTaskProfile,
} from "../app/task-context.ts";
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
  composeStructuredResponseMemory,
  formatAction,
  formatActionConfirmation,
  formatActionList,
  formatDecision,
  formatDecisionConfirmation,
  formatDecisionList,
  formatOutcome,
  formatOutcomeConfirmation,
  formatOutcomeList,
  formatRecommendation,
  formatRecommendationConfirmation,
  formatRecommendationList,
  getAction,
  getDecision,
  getOutcome,
  getRecommendation,
  listActions,
  listDecisions,
  listOutcomes,
  listRecommendations,
  recordAction,
  recordDecision,
  recordOutcome,
  recordRecommendation,
} from "../app/structured-response-memory.ts";
import type { DecisionDisposition } from "../domain/decision.ts";
import type { OutcomeAssessment } from "../domain/outcome.ts";
import {
  projectInvestigateResourceLive,
  projectInvestigationRetrieve,
  projectListInvestigations,
  projectListProviders,
  projectListResources,
  projectRelatedContext,
  projectResourceContext,
  projectTaskContext,
} from "../mcp/projections.ts";
import { safeJson } from "../mcp/serialization.ts";
import { serveMcp } from "../mcp/server.ts";
import { BINARY_NAME, VERSION } from "./constants.ts";

const JSON_COMMANDS = [
  "providers",
  "resources",
  "related",
  "investigate",
  "context",
  "investigations",
  "investigation",
] as const;
const JSON_USAGE =
  "--json is only available for: providers, resources, related, investigate, context, investigations, investigation.";

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
  recommendation               Record or show an explicit recommendation
  recommendations              List retained recommendation records
  decision                     Record or show an explicit decision on a recommendation
  decisions                    List retained decision records
  action                       Record or show an explicit attempted response
  actions                      List retained action records
  outcome                      Record or show an explicit outcome assessment
  outcomes                     List retained outcome records
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
                               related, investigate, context, investigations,
                               or investigation <id>

Investigate options:
  --save                       Persist a retained investigation snapshot
  --task <profile>             With "investigate" + --json: select a task-scoped
                               view (change-review | dependency-impact | response-recall)
  --compare                    With "investigation <id>": compare snapshot to current compose
  --resource <resource-id>     With "investigations": list snapshots for one subject
                               With "resolutions": list resolutions for one subject
                               With "resolution": resource to record against (no saved investigation), or with --incident the subject of the new row (must already be a member subject)
                               With "incidents": list groupings with a member Resolution on one subject
                               With "recommendation": resource to record against, or with --incident the named member subject
                               With "recommendations": list recommendations for one subject
  --investigation <id>         With "resolution": investigation to record against
                               With "resolutions": list resolutions for one investigation
                               With "incidents": list groupings with a member Resolution recorded against that investigation (membership only; one exact id)
                               With "recommendation": investigation to record against
                               With "recommendations": list recommendations for one investigation
  --incident <incident-id>     With "resolution": existing incident grouping to record
                               against (subject copied from members, or named with --resource; one exact id)
                               With "recommendation": existing incident grouping to record against (requires --resource)
                               With "recommendations": list recommendations for one incident
  --decision <text>            Explicit decision (what you decided)
                               With "action": parent decision to record against
                               With "actions": list actions for one decision
  --action <text>              Explicit action (what you actually did)
                               With "outcome": parent action to record against
                               With "outcomes": list outcomes for one action
  --outcome <text>             Explicit outcome (what happened afterward)
  --evidence <id>              Attach an exact local evidence id (optional, repeatable; never inferred)
                               With "resolutions": list retained resolutions that attached that exact local id (membership only; one exact id)
                               With "recommendation" / "outcome": attach exact local evidence ids at record time (repeatable)
  --recommendation <id>        With "decision": parent recommendation to record against
                               With "decisions": list decisions for one recommendation
  --action-key <token>         Lower-kebab response category (recommendation / action)
  --proposal <text>            Explicit proposed response
  --rationale <text>           Optional recommendation rationale
  --disposition <value>        approved, rejected, deferred, or modified
  --note <text>                Optional decision note (required when disposition is modified)
  --summary <text>             Explicit action or outcome summary
  --performed-at <iso>         With "action": named attempt time (omit means unknown)
  --assessment <value>         positive, negative, mixed, neutral, or inconclusive
  --observed-at <iso>          With "outcome": named observation time (omit means unknown)
  --metric <name>              With "outcome": measurement metric (atomic with --before/--after/--unit)
  --before <number>            With "outcome": measurement before (finite number; atomic)
  --after <number>             With "outcome": measurement after (finite number; atomic)
  --unit <unit>                With "outcome": measurement unit (atomic)
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
  ${BINARY_NAME} investigate vercel:project:prj_abc --task change-review --json
  ${BINARY_NAME} investigate vercel:project:prj_abc --task dependency-impact --json
  ${BINARY_NAME} investigate vercel:project:prj_abc --task response-recall --json
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
  ${BINARY_NAME} recommendation --resource vercel:project:prj_abc --action-key rollback-deployment --proposal "Rollback the latest deployment"
  ${BINARY_NAME} recommendation --investigation inv:… --action-key inspect-database --proposal "Inspect the primary"
  ${BINARY_NAME} recommendation --incident inc:… --resource github:repository:1001 --action-key hold-deploys --proposal "Hold deploys"
  ${BINARY_NAME} recommendations --resource vercel:project:prj_abc
  ${BINARY_NAME} recommendation rec:…
  ${BINARY_NAME} decision --recommendation rec:… --disposition approved
  ${BINARY_NAME} decisions --recommendation rec:…
  ${BINARY_NAME} decision dec:…
  ${BINARY_NAME} action --decision dec:… --action-key rollback-deployment --summary "Rolled back dpl_abc"
  ${BINARY_NAME} actions --decision dec:…
  ${BINARY_NAME} action act:…
  ${BINARY_NAME} outcome --action act:… --assessment positive --summary "Error rate returned toward baseline"
  ${BINARY_NAME} outcome --action act:… --assessment positive --summary "Error rate dropped" --metric error-rate --before 12.4 --after 1.1 --unit percent
  ${BINARY_NAME} outcomes --action act:…
  ${BINARY_NAME} outcome out:…
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

function formatAgentHomeFallbackDisclosure(home: string): string {
  return `Combie home: ${home}. Run \`${BINARY_NAME} init --dir ${home}\` to create a store there.`;
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

  if (flags.task !== undefined && command !== "investigate") {
    console.error(
      `--task is only available with investigate.\nUsage: ${BINARY_NAME} investigate <resource-id> --task <profile> --json`,
    );
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
        if (flags.json === true) {
          console.log(
            JSON.stringify(safeJson(projectResourceContext(context)), null, 2),
          );
        } else {
          console.log(formatResourceContext(context));
        }
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
        const taskValue = flags.task;
        if (taskValue !== undefined) {
          if (typeof taskValue !== "string") {
            console.error(
              `--task requires a profile.\nUsage: ${BINARY_NAME} investigate <resource-id> --task <profile> --json\nProfiles: change-review, dependency-impact, response-recall`,
            );
            return 1;
          }
          if (flags.save === true) {
            console.error(
              `--task is read-only and cannot be combined with --save.\nUse: ${BINARY_NAME} investigate <resource-id> --task <profile> --json`,
            );
            return 1;
          }
          if (flags.json !== true) {
            console.error(
              `--task requires --json in Sprint 109 task mode.\nUsage: ${BINARY_NAME} investigate <resource-id> --task <profile> --json`,
            );
            return 1;
          }
          const profile = normalizeTaskProfile(taskValue.trim());
          const investigation = getInvestigationContext({
            baseDir,
            resourceRef,
          });
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
                projectTaskContext(
                  composeTaskContext({
                    task: profile,
                    ctx: investigation,
                    resolutionRows,
                    incidentRows,
                    investigationRows,
                    structuredResponseChains: composeStructuredResponseMemory(
                      baseDir,
                      investigation.subject.id,
                    ),
                  }),
                ),
              ),
              null,
              2,
            ),
          );
          return 0;
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
        if (flags.json === true) {
          console.log(
            JSON.stringify(safeJson(projectListInvestigations(records)), null, 2),
          );
        } else {
          console.log(formatInvestigationList(records, resource));
        }
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
        if (flags.json === true && flags.compare === true) {
          console.error(
            `--json is read-only observe. Use: ${BINARY_NAME} investigation <investigation-id> --compare`,
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
        if (flags.json === true) {
          console.log(
            JSON.stringify(
              safeJson(projectInvestigationRetrieve(saved, artifact)),
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
      case "recommendation": {
        const usage =
          `Usage: ${BINARY_NAME} recommendation --investigation <investigation-id> --action-key <token> --proposal <text>\n` +
          `Usage: ${BINARY_NAME} recommendation --resource <resource-id> --action-key <token> --proposal <text>\n` +
          `Usage: ${BINARY_NAME} recommendation --incident <incident-id> --resource <resource-id> --action-key <token> --proposal <text>`;
        const investigationFlag = optionalFlagId(flags.investigation);
        if (investigationFlag === "missing") {
          console.error(`--investigation requires an investigation id.\n${usage}`);
          return 1;
        }
        if ((repeated.investigation ?? []).length > 0) {
          console.error(`--investigation takes one exact id on record.\n${usage}`);
          return 1;
        }
        const resourceFlag = optionalFlagId(flags.resource);
        if (resourceFlag === "missing") {
          console.error(`--resource requires a resource id.\n${usage}`);
          return 1;
        }
        if ((repeated.resource ?? []).length > 0) {
          console.error(`--resource takes one exact id on record.\n${usage}`);
          return 1;
        }
        const incidentFlag = optionalFlagId(flags.incident);
        if (incidentFlag === "missing") {
          console.error(`--incident requires an incident id.\n${usage}`);
          return 1;
        }
        if ((repeated.incident ?? []).length > 0) {
          console.error(`--incident takes one exact id on record.\n${usage}`);
          return 1;
        }
        const actionKey = optionalFlagText(flags["action-key"]);
        if (actionKey === "missing") {
          console.error(`--action-key requires a token.\n${usage}`);
          return 1;
        }
        const proposal = optionalFlagText(flags.proposal);
        if (proposal === "missing") {
          console.error(`--proposal requires text.\n${usage}`);
          return 1;
        }
        const rationale = optionalFlagText(flags.rationale);
        if (rationale === "missing") {
          console.error(`--rationale requires text.\n${usage}`);
          return 1;
        }
        const evidenceParts = [
          ...(repeated.evidence ?? []),
          ...(typeof flags.evidence === "string" ? [flags.evidence] : []),
        ];
        if (flags.evidence === true || evidenceParts.some((id) => id.trim().length === 0)) {
          console.error(`--evidence requires an evidence id.\n${usage}`);
          return 1;
        }
        const hasAnchor =
          investigationFlag !== undefined ||
          resourceFlag !== undefined ||
          incidentFlag !== undefined;
        if (hasAnchor) {
          if (positionals[0]) {
            console.error(`${usage}\nShow: ${BINARY_NAME} recommendation <recommendation-id>`);
            return 1;
          }
          if (!actionKey) {
            console.error(`--action-key requires a token.\n${usage}`);
            return 1;
          }
          if (!proposal) {
            console.error(`--proposal requires text.\n${usage}`);
            return 1;
          }
          const recorded = recordRecommendation({
            baseDir,
            ...(investigationFlag ? { investigationId: investigationFlag } : {}),
            ...(resourceFlag ? { subjectResourceId: resourceFlag } : {}),
            ...(incidentFlag ? { incidentId: incidentFlag } : {}),
            actionKey,
            proposal,
            ...(rationale ? { rationale } : {}),
            ...(evidenceParts.length > 0 ? { evidenceIds: evidenceParts } : {}),
          });
          console.log(formatRecommendationConfirmation(recorded));
          return 0;
        }
        const recommendationId = positionals[0];
        if (!recommendationId) {
          console.error(
            `${usage}\nShow: ${BINARY_NAME} recommendation <recommendation-id>\nList ids: ${BINARY_NAME} recommendations`,
          );
          return 1;
        }
        if (actionKey || proposal || rationale || evidenceParts.length > 0) {
          console.error(
            `Recording a recommendation requires --investigation, --resource, or --incident.\n${usage}`,
          );
          return 1;
        }
        const record = getRecommendation(baseDir, recommendationId);
        console.log(formatRecommendation(record));
        return 0;
      }
      case "recommendations": {
        const usage = `Usage: ${BINARY_NAME} recommendations [--resource <resource-id>] [--investigation <investigation-id>] [--incident <incident-id>]`;
        const investigationFlag = optionalFlagId(flags.investigation);
        if (investigationFlag === "missing") {
          console.error(`--investigation requires an investigation id.\n${usage}`);
          return 1;
        }
        if ((repeated.investigation ?? []).length > 0) {
          console.error(
            `--investigation takes one exact id on the recommendations list.\n${usage}`,
          );
          return 1;
        }
        const resourceFlag = optionalFlagId(flags.resource);
        if (resourceFlag === "missing") {
          console.error(`--resource requires a resource id.\n${usage}`);
          return 1;
        }
        if ((repeated.resource ?? []).length > 0) {
          console.error(
            `--resource takes one exact id on the recommendations list.\n${usage}`,
          );
          return 1;
        }
        const incidentFlag = optionalFlagId(flags.incident);
        if (incidentFlag === "missing") {
          console.error(`--incident requires an incident id.\n${usage}`);
          return 1;
        }
        if ((repeated.incident ?? []).length > 0) {
          console.error(
            `--incident takes one exact id on the recommendations list.\n${usage}`,
          );
          return 1;
        }
        const filter = {
          ...(resourceFlag ? { subjectResourceId: resourceFlag } : {}),
          ...(investigationFlag ? { investigationId: investigationFlag } : {}),
          ...(incidentFlag ? { incidentId: incidentFlag } : {}),
        };
        const listFilter =
          resourceFlag || investigationFlag || incidentFlag ? filter : undefined;
        const records = listRecommendations(baseDir, listFilter);
        console.log(formatRecommendationList(records, listFilter));
        return 0;
      }
      case "decision": {
        const usage = `Usage: ${BINARY_NAME} decision --recommendation <recommendation-id> --disposition approved|rejected|deferred|modified [--note <text>]`;
        const recommendationFlag = optionalFlagId(flags.recommendation);
        if (recommendationFlag === "missing") {
          console.error(`--recommendation requires a recommendation id.\n${usage}`);
          return 1;
        }
        if ((repeated.recommendation ?? []).length > 0) {
          console.error(`--recommendation takes one exact id on record.\n${usage}`);
          return 1;
        }
        const disposition = optionalFlagText(flags.disposition);
        if (disposition === "missing") {
          console.error(`--disposition requires a value.\n${usage}`);
          return 1;
        }
        const note = optionalFlagText(flags.note);
        if (note === "missing") {
          console.error(`--note requires text.\n${usage}`);
          return 1;
        }
        if (recommendationFlag && disposition) {
          if (positionals[0]) {
            console.error(`${usage}\nShow: ${BINARY_NAME} decision <decision-id>`);
            return 1;
          }
          const recorded = recordDecision({
            baseDir,
            recommendationId: recommendationFlag,
            disposition: disposition as DecisionDisposition,
            ...(note ? { note } : {}),
          });
          console.log(formatDecisionConfirmation(recorded));
          return 0;
        }
        const decisionId = positionals[0];
        if (!decisionId) {
          console.error(
            `${usage}\nShow: ${BINARY_NAME} decision <decision-id>\nList ids: ${BINARY_NAME} decisions`,
          );
          return 1;
        }
        if (recommendationFlag || disposition || note) {
          console.error(
            `Recording a decision requires --recommendation and --disposition.\n${usage}`,
          );
          return 1;
        }
        const record = getDecision(baseDir, decisionId);
        console.log(formatDecision(record));
        return 0;
      }
      case "decisions": {
        const usage = `Usage: ${BINARY_NAME} decisions [--recommendation <recommendation-id>]`;
        const recommendationFlag = optionalFlagId(flags.recommendation);
        if (recommendationFlag === "missing") {
          console.error(`--recommendation requires a recommendation id.\n${usage}`);
          return 1;
        }
        if ((repeated.recommendation ?? []).length > 0) {
          console.error(
            `--recommendation takes one exact id on the decisions list.\n${usage}`,
          );
          return 1;
        }
        const filter = recommendationFlag
          ? { recommendationId: recommendationFlag }
          : undefined;
        const records = listDecisions(baseDir, filter);
        console.log(formatDecisionList(records, filter));
        return 0;
      }
      case "action": {
        const usage = `Usage: ${BINARY_NAME} action --decision <decision-id> --action-key <token> --summary <text> [--performed-at <iso>]`;
        const decisionFlag = optionalFlagId(flags.decision);
        if (decisionFlag === "missing") {
          console.error(`--decision requires a decision id.\n${usage}`);
          return 1;
        }
        if ((repeated.decision ?? []).length > 0) {
          console.error(`--decision takes one exact id on record.\n${usage}`);
          return 1;
        }
        const actionKey = optionalFlagText(flags["action-key"]);
        if (actionKey === "missing") {
          console.error(`--action-key requires a token.\n${usage}`);
          return 1;
        }
        const summary = optionalFlagText(flags.summary);
        if (summary === "missing") {
          console.error(`--summary requires text.\n${usage}`);
          return 1;
        }
        const performedAt = optionalFlagText(flags["performed-at"]);
        if (performedAt === "missing") {
          console.error(`--performed-at requires an ISO timestamp.\n${usage}`);
          return 1;
        }
        if (decisionFlag && actionKey && summary) {
          if (positionals[0]) {
            console.error(`${usage}\nShow: ${BINARY_NAME} action <action-id>`);
            return 1;
          }
          const recorded = recordAction({
            baseDir,
            decisionId: decisionFlag,
            actionKey,
            summary,
            ...(performedAt ? { performedAt } : {}),
          });
          console.log(formatActionConfirmation(recorded));
          return 0;
        }
        const actionId = positionals[0];
        if (!actionId) {
          console.error(
            `${usage}\nShow: ${BINARY_NAME} action <action-id>\nList ids: ${BINARY_NAME} actions`,
          );
          return 1;
        }
        if (decisionFlag || actionKey || summary || performedAt) {
          console.error(
            `Recording an action requires --decision, --action-key, and --summary.\n${usage}`,
          );
          return 1;
        }
        const record = getAction(baseDir, actionId);
        console.log(formatAction(record));
        return 0;
      }
      case "actions": {
        const usage = `Usage: ${BINARY_NAME} actions [--decision <decision-id>]`;
        const decisionFlag = optionalFlagId(flags.decision);
        if (decisionFlag === "missing") {
          console.error(`--decision requires a decision id.\n${usage}`);
          return 1;
        }
        if ((repeated.decision ?? []).length > 0) {
          console.error(`--decision takes one exact id on the actions list.\n${usage}`);
          return 1;
        }
        const filter = decisionFlag ? { decisionId: decisionFlag } : undefined;
        const records = listActions(baseDir, filter);
        console.log(formatActionList(records, filter));
        return 0;
      }
      case "outcome": {
        const usage =
          `Usage: ${BINARY_NAME} outcome --action <action-id> --assessment positive|negative|mixed|neutral|inconclusive --summary <text> [--observed-at <iso>] [--evidence <id>]\n` +
          `Usage: ${BINARY_NAME} outcome --action <action-id> --assessment <assessment> --summary <text> --metric <name> --before <number> --after <number> --unit <unit>`;
        const measurementUsage = `Usage: ${BINARY_NAME} outcome --action <action-id> --assessment <assessment> --summary <text> --metric <name> --before <number> --after <number> --unit <unit>`;
        const actionFlag = optionalFlagId(flags.action);
        if (actionFlag === "missing") {
          console.error(`--action requires an action id.\n${usage}`);
          return 1;
        }
        if ((repeated.action ?? []).length > 0) {
          console.error(`--action takes one exact id on record.\n${usage}`);
          return 1;
        }
        const assessment = optionalFlagText(flags.assessment);
        if (assessment === "missing") {
          console.error(`--assessment requires a value.\n${usage}`);
          return 1;
        }
        const summary = optionalFlagText(flags.summary);
        if (summary === "missing") {
          console.error(`--summary requires text.\n${usage}`);
          return 1;
        }
        const observedAt = optionalFlagText(flags["observed-at"]);
        if (observedAt === "missing") {
          console.error(`--observed-at requires an ISO timestamp.\n${usage}`);
          return 1;
        }
        const evidenceParts = [
          ...(repeated.evidence ?? []),
          ...(typeof flags.evidence === "string" ? [flags.evidence] : []),
        ];
        if (flags.evidence === true || evidenceParts.some((id) => id.trim().length === 0)) {
          console.error(`--evidence requires an evidence id.\n${usage}`);
          return 1;
        }
        const metricRaw = flags.metric;
        const beforeRaw = flags.before;
        const afterRaw = flags.after;
        const unitRaw = flags.unit;
        const anyMeasurement =
          metricRaw !== undefined ||
          beforeRaw !== undefined ||
          afterRaw !== undefined ||
          unitRaw !== undefined;
        const allMeasurement =
          typeof metricRaw === "string" &&
          typeof beforeRaw === "string" &&
          typeof afterRaw === "string" &&
          typeof unitRaw === "string";
        if (anyMeasurement && !allMeasurement) {
          console.error(
            `A measurement requires a non-blank --metric, finite numeric --before and --after, and a non-blank --unit supplied together.\n${measurementUsage}`,
          );
          return 1;
        }
        if (actionFlag && assessment && summary) {
          if (positionals[0]) {
            console.error(`${usage}\nShow: ${BINARY_NAME} outcome <outcome-id>`);
            return 1;
          }
          const recorded = recordOutcome({
            baseDir,
            actionId: actionFlag,
            assessment: assessment as OutcomeAssessment,
            summary,
            ...(observedAt ? { observedAt } : {}),
            ...(allMeasurement
              ? {
                  measurement: {
                    metric: metricRaw,
                    before: Number(beforeRaw),
                    after: Number(afterRaw),
                    unit: unitRaw,
                  },
                }
              : {}),
            ...(evidenceParts.length > 0 ? { evidenceIds: evidenceParts } : {}),
          });
          console.log(formatOutcomeConfirmation(recorded));
          return 0;
        }
        const outcomeId = positionals[0];
        if (!outcomeId) {
          console.error(
            `${usage}\nShow: ${BINARY_NAME} outcome <outcome-id>\nList ids: ${BINARY_NAME} outcomes`,
          );
          return 1;
        }
        if (
          actionFlag ||
          assessment ||
          summary ||
          observedAt ||
          evidenceParts.length > 0 ||
          anyMeasurement
        ) {
          console.error(
            `Recording an outcome requires --action, --assessment, and --summary.\n${usage}`,
          );
          return 1;
        }
        const record = getOutcome(baseDir, outcomeId);
        console.log(formatOutcome(record));
        return 0;
      }
      case "outcomes": {
        const usage = `Usage: ${BINARY_NAME} outcomes [--action <action-id>]`;
        const actionFlag = optionalFlagId(flags.action);
        if (actionFlag === "missing") {
          console.error(`--action requires an action id.\n${usage}`);
          return 1;
        }
        if ((repeated.action ?? []).length > 0) {
          console.error(`--action takes one exact id on the outcomes list.\n${usage}`);
          return 1;
        }
        const filter = actionFlag ? { actionId: actionFlag } : undefined;
        const records = listOutcomes(baseDir, filter);
        console.log(formatOutcomeList(records, filter));
        return 0;
      }
      case "mcp": {
        await serveMcp({ baseDir });
        return 0;
      }
      case "agent": {
        const agentHome = resolveAgentCombieHome(flags);
        const agentBaseDir = agentHome.baseDir;
        const sub = positionals[0];
        const usage = `Usage: ${BINARY_NAME} agent <setup|status|remove> [agent...]\nAgents: claude, codex, cursor`;
        if (!sub) {
          console.error(usage);
          return 1;
        }
        if (sub === "status") {
          const statuses = inspectAgents(agentBaseDir);
          console.log(formatAgentStatusTable(statuses));
          return 0;
        }
        if (sub === "setup") {
          const names = positionals.length > 1 ? positionals.slice(1) : null;
          const planned = resolveAgentBackends(names);
          const configured = new Set(
            inspectAgents(agentBaseDir)
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
          if (agentHome.usedHomeFallback) {
            console.log(formatAgentHomeFallbackDisclosure(agentBaseDir));
          }
          const results = setupAgents(names, agentBaseDir);
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
