import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { CombieError } from "../app/errors.ts";
import { composeInvestigationFacts } from "../app/investigation-facts.ts";
import { listProviders, listResources } from "../app/list.ts";
import { composeMissingContext } from "../app/missing-context.ts";
import { composeProviderActivityChronology } from "../app/provider-activity.ts";
import { listResolutions } from "../app/resolutions.ts";
import {
  composeSharedCommitContext,
  composeSharedCommitCorrespondences,
} from "../app/shared-commit-context.ts";
import { composeInvestigationTimeline } from "../app/timeline.ts";
import type { ResolutionRecord } from "../domain/resolution.ts";
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

/**
 * MCP-facing Resolution projection (Sprint 056): plain objects, absent
 * optional fields omitted. Retained organizational response — not current
 * provider truth, not a recommendation.
 */
function toResolutionMemoryRow(
  record: ResolutionRecord,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: record.id,
    recordedAt: record.recordedAt,
  };
  if (record.investigationId !== undefined) {
    row.investigationId = record.investigationId;
  }
  if (record.decision !== undefined) row.decision = record.decision;
  if (record.action !== undefined) row.action = record.action;
  if (record.outcome !== undefined) row.outcome = record.outcome;
  if (record.evidenceIds !== undefined) row.evidenceIds = record.evidenceIds;
  return row;
}

function toResolutionMemory(records: ResolutionRecord[]) {
  return records.map(toResolutionMemoryRow);
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
        const resources = result.resources.map((r) => ({
          id: r.id,
          provider: r.provider,
          kind: r.kind,
          providerResourceId: r.providerResourceId,
          name: r.name,
        }));
        return {
          content: [{ type: "text" as const, text: `${resources.length} resource(s) found.` }],
          structuredContent: safeJson({ resources }) as Record<string, unknown>,
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
        const related = ctx.related.map((neighbor) => ({
          direction: neighbor.direction,
          relationship: {
            id: neighbor.relationship.id,
            kind: neighbor.relationship.kind,
            sourceResourceId: neighbor.relationship.sourceResourceId,
            targetResourceId: neighbor.relationship.targetResourceId,
            evidence: neighbor.relationship.evidence,
            createdAt: neighbor.relationship.createdAt,
          },
          resource: neighbor.resource
            ? {
                id: neighbor.resource.id,
                provider: neighbor.resource.provider,
                kind: neighbor.resource.kind,
                providerResourceId: neighbor.resource.providerResourceId,
                name: neighbor.resource.name,
              }
            : null,
        }));
        return {
          content: [{ type: "text" as const, text: `${related.length} relationship(s) found.` }],
          structuredContent: safeJson({
            subject: {
              id: ctx.resource.id,
              provider: ctx.resource.provider,
              kind: ctx.resource.kind,
              providerResourceId: ctx.resource.providerResourceId,
              name: ctx.resource.name,
            },
            related,
          }) as Record<string, unknown>,
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
        "Does not call providers, mutate state, or perform inference.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({
        resourceId: z.string().describe("Exact Combie Resource ID (e.g. 'vercel:project:prj_abc')"),
      }),
    },
    async ({ resourceId }) => {
      try {
        const { getInvestigationContext } = await import("../app/investigate.ts");
        const ctx = getInvestigationContext({ baseDir, resourceRef: resourceId });

        const subject = {
          id: ctx.subject.id,
          provider: ctx.subject.provider,
          kind: ctx.subject.kind,
          providerResourceId: ctx.subject.providerResourceId,
          name: ctx.subject.name,
          metadata: ctx.subject.metadata,
          createdAt: ctx.subject.createdAt,
          updatedAt: ctx.subject.updatedAt,
        };

        const subjectChanges = ctx.subjectChanges.map((c) => ({
          id: c.id,
          kind: c.kind,
          observedAt: c.observedAt,
          fields: c.fields,
        }));

        const sharedCommitGroups = composeSharedCommitContext(ctx);

        const resolutionRows = listResolutions(baseDir, {
          subjectResourceId: ctx.subject.id,
        });

        const related = ctx.related.map((n) => ({
          direction: n.direction,
          relationship: {
            id: n.relationship.id,
            kind: n.relationship.kind,
            sourceResourceId: n.relationship.sourceResourceId,
            targetResourceId: n.relationship.targetResourceId,
            evidence: n.relationship.evidence,
          },
          resource: n.resource
            ? {
                id: n.resource.id,
                provider: n.resource.provider,
                kind: n.resource.kind,
                providerResourceId: n.resource.providerResourceId,
                name: n.resource.name,
              }
            : null,
          changes: n.changes.map((c) => ({
            id: c.id,
            kind: c.kind,
            observedAt: c.observedAt,
            fields: c.fields,
          })),
          deployments: n.deployments,
          workflowRuns: n.workflowRuns,
          operations: n.operations,
          releases: n.releases,
          issues: n.issues,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: `Investigation context for ${subject.name}. ` +
                `${subjectChanges.length} change(s), ${related.length} related resource(s).`,
            },
          ],
          structuredContent: safeJson({
            subject,
            subjectChanges,
            subjectDeployments: ctx.subjectDeployments,
            subjectWorkflowRuns: ctx.subjectWorkflowRuns,
            subjectOperations: ctx.subjectOperations,
            subjectReleases: ctx.subjectReleases,
            subjectIssues: ctx.subjectIssues,
            related,
            knownFacts: composeInvestigationFacts(ctx),
            missingContext: composeMissingContext(ctx),
            providerActivity: composeProviderActivityChronology(ctx),
            timeline: composeInvestigationTimeline(ctx),
            sharedCommitContext: sharedCommitGroups,
            sharedCommitCorrespondences: composeSharedCommitCorrespondences(
              sharedCommitGroups,
            ),
            ...(resolutionRows.length > 0
              ? { resolutionMemory: toResolutionMemory(resolutionRows) }
              : {}),
          }) as Record<string, unknown>,
        };
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
        const providers = result.providers.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          lastSyncAt: p.lastSyncAt,
          accountId: p.config?.accountId ?? null,
          accountName: p.config?.accountName ?? null,
        }));
        return {
          content: [{ type: "text" as const, text: `${providers.length} provider(s) found; ${providers.filter((p) => p.status === "connected").length} connected.` }],
          structuredContent: safeJson({ providers }) as Record<string, unknown>,
        };
      } catch (err) {
        const message = err instanceof CombieError ? err.message : String(err);
        return toolError(message);
      }
    },
  );
}
