import { createResource, type Resource } from "../../domain/resource.ts";
import type { SentryProject } from "./client.ts";

export const SENTRY_PROVIDER = "sentry";

export function normalizeProject(project: SentryProject): Resource {
  const metadata: Record<string, unknown> = {};

  if (project.slug) metadata.slug = project.slug;

  const orgSlug = project.organization?.slug;
  const orgId = project.organization?.id;
  if (orgSlug) metadata.organization_slug = orgSlug;
  if (orgId != null && String(orgId) !== "") {
    metadata.organization_id = String(orgId);
  }

  if (project.platform) metadata.platform = project.platform;
  if (project.status) metadata.status = project.status;
  if (project.dateCreated) metadata.dateCreated = project.dateCreated;

  return createResource({
    provider: SENTRY_PROVIDER,
    providerResourceId: String(project.id),
    kind: "project",
    name: project.name || project.slug,
    metadata,
  });
}
