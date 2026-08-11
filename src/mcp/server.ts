import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export interface McpOptions {
  baseDir: string;
}

export function createMcpServer(options: McpOptions): McpServer {
  const server = new McpServer({ name: "combie", version: "0.1.0" });
  const { baseDir } = options;

  server.registerTool(
    "list_resources",
    {
      description:
        "List all locally stored Combie Resources with their exact stable IDs. " +
        "Optionally filter by provider or kind. " +
        "Read-only; does not call providers or mutate state.",
      inputSchema: z.object({
        provider: z.string().optional().describe("Filter by provider id"),
        kind: z.string().optional().describe("Filter by resource kind"),
      }),
    },
    async ({ provider, kind }) => {
      const { listResources } = await import("../app/list.ts");
      const { CombieError } = await import("../app/errors.ts");
      const { safeJson } = await import("./serialization.ts");
      try {
        const result = listResources({ baseDir, provider: provider ?? undefined, kind: kind ?? undefined });
        const resources = result.resources.map((r) => ({
          id: r.id, provider: r.provider, kind: r.kind,
          providerResourceId: r.providerResourceId, name: r.name,
        }));
        return {
          content: [{ type: "text" as const, text: `${resources.length} resource(s) found.` }],
          structuredContent: safeJson({ resources }) as Record<string, unknown>,
        };
      } catch (err) {
        const message = err instanceof CombieError ? err.message : String(err);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.registerTool(
    "get_related_context",
    {
      description:
        "Return one-hop Relationships and neighbor Resources for an exact Combie Resource ID. " +
        "Does not call providers, infer new relationships, or mutate state.",
      inputSchema: z.object({
        resourceId: z.string().describe("Exact Combie Resource ID"),
      }),
    },
    async ({ resourceId }) => {
      const { getRelatedContext } = await import("../app/related.ts");
      const { CombieError } = await import("../app/errors.ts");
      const { safeJson } = await import("./serialization.ts");
      try {
        const ctx = getRelatedContext({ baseDir, resourceRef: resourceId });
        const related = ctx.related.map((neighbor) => ({
          direction: neighbor.direction,
          relationship: {
            id: neighbor.relationship.id, kind: neighbor.relationship.kind,
            sourceResourceId: neighbor.relationship.sourceResourceId,
            targetResourceId: neighbor.relationship.targetResourceId,
            evidence: neighbor.relationship.evidence, createdAt: neighbor.relationship.createdAt,
          },
          resource: neighbor.resource
            ? { id: neighbor.resource.id, provider: neighbor.resource.provider, kind: neighbor.resource.kind, name: neighbor.resource.name }
            : null,
        }));
        return {
          content: [{ type: "text" as const, text: `${related.length} relationship(s) found.` }],
          structuredContent: safeJson({ subject: { id: ctx.resource.id, name: ctx.resource.name }, related }) as Record<string, unknown>,
        };
      } catch (err) {
        const message = err instanceof CombieError ? err.message : String(err);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.registerTool(
    "investigate_resource",
    {
      description:
        "Return Combie's locally stored deterministic investigation context for an exact Resource ID. " +
        "Does not call providers, mutate state, or perform inference.",
      inputSchema: z.object({
        resourceId: z.string().describe("Exact Combie Resource ID"),
      }),
    },
    async ({ resourceId }) => {
      const { getInvestigationContext } = await import("../app/investigate.ts");
      const { CombieError } = await import("../app/errors.ts");
      const { safeJson } = await import("./serialization.ts");
      try {
        const ctx = getInvestigationContext({ baseDir, resourceRef: resourceId });
        const subject = {
          id: ctx.subject.id, provider: ctx.subject.provider, kind: ctx.subject.kind,
          providerResourceId: ctx.subject.providerResourceId, name: ctx.subject.name,
          metadata: ctx.subject.metadata, createdAt: ctx.subject.createdAt, updatedAt: ctx.subject.updatedAt,
        };
        const subjectChanges = ctx.subjectChanges.map((c) => ({
          id: c.id, kind: c.kind, observedAt: c.observedAt, fields: c.fields,
        }));
        const related = ctx.related.map((n) => ({
          direction: n.direction,
          relationship: { id: n.relationship.id, kind: n.relationship.kind, sourceResourceId: n.relationship.sourceResourceId, targetResourceId: n.relationship.targetResourceId, evidence: n.relationship.evidence },
          resource: n.resource ? { id: n.resource.id, provider: n.resource.provider, kind: n.resource.kind, name: n.resource.name } : null,
          changes: n.changes.map((c) => ({ id: c.id, kind: c.kind, observedAt: c.observedAt, fields: c.fields })),
          deployments: n.deployments, workflowRuns: n.workflowRuns, operations: n.operations,
        }));
        return {
          content: [{ type: "text" as const, text: `Investigation context for ${subject.name}.` }],
          structuredContent: safeJson({ subject, subjectChanges, related }) as Record<string, unknown>,
        };
      } catch (err) {
        const message = err instanceof CombieError ? err.message : String(err);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.registerTool(
    "list_providers",
    {
      description:
        "List locally connected Combie providers with their status and account identity. " +
        "Read-only; does not expose credentials or tokens.",
      inputSchema: z.object({}),
    },
    async () => {
      const { listProviders } = await import("../app/list.ts");
      const { CombieError } = await import("../app/errors.ts");
      const { safeJson } = await import("./serialization.ts");
      try {
        const result = listProviders(baseDir);
        const providers = result.providers.map((p) => ({
          id: p.id, name: p.name, status: p.status, lastSyncAt: p.lastSyncAt,
          accountId: p.config?.accountId ?? null, accountName: p.config?.accountName ?? null,
        }));
        return {
          content: [{ type: "text" as const, text: `${providers.length} provider(s) found.` }],
          structuredContent: safeJson({ providers }) as Record<string, unknown>,
        };
      } catch (err) {
        const message = err instanceof CombieError ? err.message : String(err);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  return server;
}

let _serveMcp: ((options: McpOptions) => Promise<void>) | null = null;

export async function serveMcp(options: McpOptions): Promise<void> {
  if (!_serveMcp) {
    const mod = await import("@modelcontextprotocol/server/stdio");
    _serveMcp = async (opts) => {
      await mod.serveStdio(() => createMcpServer(opts));
    };
  }
  await _serveMcp(options);
}
