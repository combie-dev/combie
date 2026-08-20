import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { CombieError } from "../app/errors.ts";
import { compareInvestigationToCurrent } from "../app/compare-investigation.ts";
import {
  listIncidentsForInvestigation,
  listIncidentsForSubject,
} from "../app/incidents.ts";
import { listInvestigations, getSavedInvestigation, getInvestigationArtifact } from "../app/investigations.ts";
import { listProviders, listResources } from "../app/list.ts";
import { listResolutions } from "../app/resolutions.ts";
import {
  projectInvestigateResourceLive,
  projectListProviders,
  projectListResources,
  projectRelatedContext,
  toIncidentMemory,
  toInvestigationHistory,
  toResolutionMemory,
} from "./projections.ts";
import { safeJson } from "./serialization.ts";

export interface ToolContext {
  baseDir: string;
}

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function toolError(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function registerTools(server: McpServer, ctx: ToolContext): void {
  const { baseDir } = ctx;

  server.registerTool(
    "list_resources",
    {
      description:
        "List all locally stored Combie Resources with their exact stable IDs. " +
        "Optionally filter by provider or kind. " +
        "Returns Resource identity fields: id, provider, kind, providerResourceId, and name. " +
        "Read-only; does not call providers or mutate state.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({
        provider: z.string().optional().describe("Filter by provider id (e.g. 'github', 'vercel')"),
        kind: z.string().optional().describe("Filter by resource kind (e.g. 'repository', 'project')"),
      }),
    },
    async ({ provider, kind }) => {
      try {
        const result = listResources({ baseDir, provider: provider ?? undefined, kind: kind ?? undefined });
        const projection = projectListResources(result.resources);
        return {
          content: [{ type: "text" as const, text: `${result.resources.length} resource(s) found.` }],
          structuredContent: safeJson(projection) as Record<string, unknown>,
        };
      } catch (err) {
        const message = err instanceof CombieError ? err.message : String(err);
        return toolError(message);
      }
    },
  );

  server.registerTool(
    "get_related_context",
    {
      description:
        "Return one-hop Relationships and neighbor Resources for an exact Combie Resource ID. " +
        "Preserves relationship kind, direction, evidence, source, and target. " +
        "Does not call providers, infer new relationships, or mutate state. " +
        "Requires a prior sync to populate local context.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({
        resourceId: z.string().describe("Exact Combie Resource ID (e.g. 'vercel:project:prj_abc')"),
      }),
    },
    async ({ resourceId }) => {
      try {
        const { getRelatedContext } = await import("../app/related.ts");
        const ctx = getRelatedContext({ baseDir, resourceRef: resourceId });
        const projection = projectRelatedContext(ctx);
        return {
          content: [{ type: "text" as const, text: `${ctx.related.length} relationship(s) found.` }],
          structuredContent: safeJson(projection) as Record<string, unknown>,
        };
      } catch (err) {
        const message = err instanceof CombieError ? err.message : String(err);
        return toolError(message);
      }
    },
  );

  server.registerTool(
    "investigate_resource",
    {
      description:
        "Return Combie's locally stored deterministic investigation context for an exact Resource ID, " +
        "including current state, changes, related Resources, provider evidence, authority, " +
        "and cross-provider shared commit context when available. " +
        "May also include retained organizational response (resolution memory) recorded for that " +
        "exact subject; that is not current provider truth and not a recommendation. " +
        "May also include retained organizational grouping (incident memory) whose members include " +
        "a Resolution for that exact subject; that is not current provider truth and not a recommendation. " +
        "May also include retained investigation history (snapshot summaries: exact inv: id and composedAt) " +
        "for that exact subject; that is retained composition, not current provider truth, not an incident, " +
        "and not a recommendation. " +
        "Optional investigationId (exact inv: id for this Resource) also returns the retained " +
        "048 snapshot composition for that id as investigationSnapshot (retained composition " +
        "at composedAt; not current provider truth, not an incident, not a recommendation) " +
        "plus an ephemeral snapshot-versus-current comparison; those are not current provider " +
        "truth, not an incident, not a recommendation, and not a rewrite of the snapshot row. " +
        "When investigationId is set, also returns investigationArtifact: a read-time handle " +
        "for that retained snapshot (exact inv: id, schema, sha256 of the stored snapshot text, " +
        "in-database location investigations.snapshot_json, record counts from the retained " +
        "snapshot only, and the CLI retrieve command); that is retained composition, not " +
        "current provider truth, not an incident, and not a recommendation. " +
        "When investigationId is set, may also include retained organizational response recorded " +
        "against that exact Investigation as investigationResolutionMemory; that is not current " +
        "provider truth, not an incident, and not a recommendation, and it does not replace " +
        "subject-scoped resolution memory. " +
        "When investigationId is set, may also include retained organizational grouping whose " +
        "members include a Resolution recorded against that exact Investigation as " +
        "investigationIncidentMemory; that is not current provider truth, not a recommendation, " +
        "and it does not replace subject-scoped incident memory. " +
        "Omit investigationId to skip snapshot, compare, investigation-scoped resolution memory, " +
        "and investigation-scoped incident memory. " +
        "resourceId is optional when investigationId is named: the subject is then taken from " +
        "that exact investigation's retained 048 row (subjectResourceId) instead of a named " +
        "Resource id. Omitted investigationId still requires resourceId. " +
        "When investigationId is set and the subject Resource is missing from the local store, " +
        "the tool still returns the retained snapshot, the snapshot-versus-current comparison " +
        "with currentStatus subject_missing, investigation history for that subject, " +
        "investigation-scoped resolution memory, and investigation-scoped incident memory, " +
        "omitting live compose keys; that is retained composition, not current provider truth, " +
        "and not a recommendation. " +
        "Omitted investigationId with a missing Resource still returns RESOURCE_NOT_FOUND. " +
        "Does not call providers, mutate state, or perform inference.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({
        resourceId: z
          .string()
          .optional()
          .describe(
            "Exact Combie Resource ID (e.g. 'vercel:project:prj_abc'). Optional when investigationId is named: the subject is then taken from that investigation's retained 048 row (subjectResourceId).",
          ),
        investigationId: z
          .string()
          .optional()
          .describe(
            "Exact saved Investigation id (inv:…). When set, also returns the retained 048 snapshot composition (investigationSnapshot), a read-time investigationArtifact handle (schema, sha256 of the stored snapshot text, in-database location, record counts), an ephemeral snapshot-versus-current comparison, investigation-scoped resolution memory, and investigation-scoped incident memory recorded against that id if any exist and the snapshot belongs to this Resource. resourceId may be omitted; the subject is then taken from this investigation's 048 row. Omit to skip snapshot, artifact, compare, investigation-scoped resolution memory, and investigation-scoped incident memory.",
          ),
      }),
    },
    async ({ resourceId, investigationId }) => {
      try {
        let investigationCompare: ReturnType<
          typeof compareInvestigationToCurrent
        > | undefined;
        let investigationSnapshot: ReturnType<
          typeof getSavedInvestigation
        > | undefined;
        let investigationArtifact: ReturnType<
          typeof getInvestigationArtifact
        > | undefined;
        let subjectRef: string;
        if (investigationId !== undefined) {
          const named = investigationId.trim();
          if (!named) {
            throw new CombieError(
              "INVESTIGATION_ID_REQUIRED",
              "Investigation id is required.\nPass an exact inv: id as investigationId, or omit investigationId.",
            );
          }
          const comparison = compareInvestigationToCurrent({
            baseDir,
            investigationId: named,
          });
          const namedResourceRef =
            resourceId === undefined ? "" : resourceId.trim();
          if (namedResourceRef !== "") {
            if (comparison.subjectResourceId !== resourceId) {
              throw new CombieError(
                "INVESTIGATION_SUBJECT_MISMATCH",
                `Investigation ${named} is retained for ${comparison.subjectResourceId}, not ${resourceId}.\nCompare a snapshot of this subject, or investigate that snapshot's subject.`,
              );
            }
            subjectRef = resourceId!;
          } else {
            subjectRef = comparison.subjectResourceId;
          }
          investigationCompare = comparison;
          investigationSnapshot = getSavedInvestigation(baseDir, named);
          investigationArtifact = getInvestigationArtifact(baseDir, named);
        } else {
          const namedResourceRef =
            resourceId === undefined ? "" : resourceId.trim();
          if (namedResourceRef === "") {
            throw new CombieError(
              "RESOURCE_ID_REQUIRED",
              "Resource id is required when investigationId is omitted.\nPass an exact resource id, or name an exact inv: id as investigationId.",
            );
          }
          subjectRef = resourceId!;
        }

        const investigationResolutionRows = investigationSnapshot
          ? listResolutions(baseDir, {
              investigationId: investigationSnapshot.id,
            })
          : [];
        const investigationIncidentRows = investigationSnapshot
          ? listIncidentsForInvestigation(
              baseDir,
              investigationSnapshot.id,
            )
          : [];

        try {
          const { getInvestigationContext } = await import("../app/investigate.ts");
          const ctx = getInvestigationContext({ baseDir, resourceRef: subjectRef });
          const resolutionRows = listResolutions(baseDir, {
            subjectResourceId: ctx.subject.id,
          });
          const incidentRows = listIncidentsForSubject(baseDir, ctx.subject.id);
          const investigationRows = listInvestigations(baseDir, {
            subjectResourceId: ctx.subject.id,
          });
          const liveProjection = projectInvestigateResourceLive({
            ctx,
            resolutionRows,
            incidentRows,
            investigationRows,
          });

          return {
            content: [
              {
                type: "text" as const,
                text: `Investigation context for ${ctx.subject.name}. ` +
                  `${ctx.subjectChanges.length} change(s), ${ctx.related.length} related resource(s).`,
              },
            ],
            structuredContent: safeJson({
              ...liveProjection,
              ...(investigationCompare
                ? { investigationCompare }
                : {}),
              ...(investigationSnapshot
                ? { investigationSnapshot }
                : {}),
              ...(investigationArtifact
                ? { investigationArtifact }
                : {}),
              ...(investigationResolutionRows.length > 0
                ? {
                    investigationResolutionMemory: toResolutionMemory(
                      investigationResolutionRows,
                    ),
                  }
                : {}),
              ...(investigationIncidentRows.length > 0
                ? {
                    investigationIncidentMemory: toIncidentMemory(
                      investigationIncidentRows,
                    ),
                  }
                : {}),
            }) as Record<string, unknown>,
          };
        } catch (err) {
          /**
           * Sprint 075: a named aligned investigationId keeps the named-id
           * sidecars when the subject Resource is gone from the local store;
           * live compose keys stay omitted. Retained composition, not current
           * provider truth, not an incident, not a recommendation.
           */
          if (
            err instanceof CombieError &&
            err.code === "RESOURCE_NOT_FOUND" &&
            investigationSnapshot !== undefined
          ) {
            const investigationRows = listInvestigations(baseDir, {
              subjectResourceId: investigationSnapshot.subjectResourceId,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `Investigation context for ${subjectRef} is unavailable: ` +
                    `the subject Resource is not in the local store. ` +
                    `Retained snapshot ${investigationSnapshot.id} (composed at ` +
                    `${investigationSnapshot.composedAt}) with comparison ` +
                    `currentStatus subject_missing.`,
                },
              ],
              structuredContent: safeJson({
                ...(investigationCompare
                  ? { investigationCompare }
                  : {}),
                ...(investigationSnapshot
                  ? { investigationSnapshot }
                  : {}),
                ...(investigationArtifact
                  ? { investigationArtifact }
                  : {}),
                ...(investigationRows.length > 0
                  ? {
                      investigationHistory: toInvestigationHistory(
                        investigationRows,
                      ),
                    }
                  : {}),
                ...(investigationResolutionRows.length > 0
                  ? {
                      investigationResolutionMemory: toResolutionMemory(
                        investigationResolutionRows,
                      ),
                    }
                  : {}),
                ...(investigationIncidentRows.length > 0
                  ? {
                      investigationIncidentMemory: toIncidentMemory(
                        investigationIncidentRows,
                      ),
                    }
                  : {}),
              }) as Record<string, unknown>,
            };
          }
          throw err;
        }
      } catch (err) {
        const message = err instanceof CombieError ? err.message : String(err);
        return toolError(message);
      }
    },
  );

  server.registerTool(
    "list_providers",
    {
      description:
        "List locally connected Combie providers with their status and account identity. " +
        "Read-only; uses persisted local state. Does not expose credentials or tokens.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const result = listProviders(baseDir);
        const projection = projectListProviders(result.providers);
        return {
          content: [{ type: "text" as const, text: `${result.providers.length} provider(s) found; ${result.providers.filter((p) => p.status === "connected").length} connected.` }],
          structuredContent: safeJson(projection) as Record<string, unknown>,
        };
      } catch (err) {
        const message = err instanceof CombieError ? err.message : String(err);
        return toolError(message);
      }
    },
  );
}
