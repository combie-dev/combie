export type ResourceKind = "worker" | "database" | "kv_namespace" | "zone";

export interface Resource {
  id: string;
  provider: string;
  providerResourceId: string;
  kind: ResourceKind;
  name: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Stable identity: `${provider}:${kind}:${providerResourceId}` */
export function resourceId(
  provider: string,
  kind: ResourceKind,
  providerResourceId: string,
): string {
  return `${provider}:${kind}:${providerResourceId}`;
}

export function createResource(
  input: Omit<Resource, "id" | "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
): Resource {
  const now = new Date().toISOString();
  return {
    id: resourceId(input.provider, input.kind, input.providerResourceId),
    provider: input.provider,
    providerResourceId: input.providerResourceId,
    kind: input.kind,
    name: input.name,
    metadata: input.metadata,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}
