import { createResource, type Resource } from "../../domain/resource.ts";
import type {
  CloudflareD1Database,
  CloudflareKvNamespace,
  CloudflareWorkerScript,
  CloudflareZone,
} from "./client.ts";

export const CLOUDFLARE_PROVIDER = "cloudflare";

export function normalizeWorker(
  script: CloudflareWorkerScript,
  accountId: string,
): Resource {
  const name = script.name ?? script.id;
  return createResource({
    provider: CLOUDFLARE_PROVIDER,
    providerResourceId: script.id,
    kind: "worker",
    name,
    metadata: {
      accountId,
      ...(script.modified_on ? { modifiedOn: script.modified_on } : {}),
      ...(script.created_on ? { createdOn: script.created_on } : {}),
      ...(script.usage_model ? { usageModel: script.usage_model } : {}),
      ...(script.handlers ? { handlers: script.handlers } : {}),
    },
  });
}

export function normalizeD1(
  db: CloudflareD1Database,
  accountId: string,
): Resource {
  return createResource({
    provider: CLOUDFLARE_PROVIDER,
    providerResourceId: db.uuid,
    kind: "database",
    name: db.name,
    metadata: {
      accountId,
      engine: "d1",
      ...(db.version ? { version: db.version } : {}),
      ...(db.created_at ? { createdAt: db.created_at } : {}),
      ...(db.num_tables != null ? { numTables: db.num_tables } : {}),
    },
  });
}

export function normalizeKvNamespace(
  ns: CloudflareKvNamespace,
  accountId: string,
): Resource {
  return createResource({
    provider: CLOUDFLARE_PROVIDER,
    providerResourceId: ns.id,
    kind: "kv_namespace",
    name: ns.title,
    metadata: {
      accountId,
      ...(ns.supports_url_encoding != null
        ? { supportsUrlEncoding: ns.supports_url_encoding }
        : {}),
    },
  });
}

export function normalizeZone(zone: CloudflareZone): Resource {
  return createResource({
    provider: CLOUDFLARE_PROVIDER,
    providerResourceId: zone.id,
    kind: "zone",
    name: zone.name,
    metadata: {
      ...(zone.status ? { status: zone.status } : {}),
      ...(zone.paused != null ? { paused: zone.paused } : {}),
      ...(zone.type ? { type: zone.type } : {}),
      ...(zone.account?.id ? { accountId: zone.account.id } : {}),
      ...(zone.name_servers ? { nameServers: zone.name_servers } : {}),
    },
  });
}
