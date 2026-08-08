import { createResource, type Resource } from "../../domain/resource.ts";
import type { VercelProject } from "./client.ts";

export const VERCEL_PROVIDER = "vercel";

export function normalizeProject(project: VercelProject): Resource {
  const metadata: Record<string, unknown> = {
    accountId: project.accountId,
  };
  if (project.framework) metadata.framework = project.framework;
  if (project.createdAt != null) {
    metadata.createdAt = new Date(project.createdAt).toISOString();
  }
  if (project.updatedAt != null) {
    metadata.updatedAt = new Date(project.updatedAt).toISOString();
  }

  return createResource({
    provider: VERCEL_PROVIDER,
    providerResourceId: project.id,
    kind: "project",
    name: project.name,
    metadata,
  });
}
