import type { Resource } from "../domain/resource.ts";
import {
  createRelationship,
  type Relationship,
  type RelationshipEvidence,
} from "../domain/relationship.ts";

/**
 * Compact custom-domain evidence stored on Vercel project Resource metadata by
 * Sprint 008 enrichment. `[]` means a successful check found no custom domains;
 * an omitted `domains` key means enrichment is unknown.
 */
export interface VercelDomainEvidence {
  hostname: string;
  apexName: string;
  custom: true;
}

const VERCEL_DEFAULT_APEX = "vercel.app";

/**
 * Deterministic DNS-name normalization for comparison only. Never mutates
 * stored Resource identity. Vercel apexes arrive already normalized by the
 * Vercel adapter; zone names are raw provider strings.
 */
function normalizeDnsNameForComparison(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().toLowerCase().replace(/\.+$/, "");
  return name.length > 0 ? name : null;
}

/** Defensively parse Sprint 008 domain evidence; malformed entries are dropped. */
function asDomainEvidence(value: unknown): VercelDomainEvidence[] {
  if (!Array.isArray(value)) return [];
  const out: VercelDomainEvidence[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const d = entry as Record<string, unknown>;
    if (
      typeof d.hostname !== "string" ||
      d.hostname.length === 0 ||
      typeof d.apexName !== "string" ||
      d.apexName.length === 0 ||
      d.custom !== true
    ) {
      continue;
    }
    out.push({ hostname: d.hostname, apexName: d.apexName, custom: true });
  }
  return out;
}

function evidenceFor(apexName: string, hostnames: string[]): RelationshipEvidence {
  return {
    source: "vercel",
    mechanism: "custom_domain_apex",
    apexName,
    hostnames: [...hostnames].sort(),
  };
}

/**
 * Infer Vercel project → uses_domain_in → Cloudflare zone Relationships from
 * currently stored Resources. Deterministic only: exact normalized custom
 * domain apex == normalized zone name. No fuzzy matching, no DNS lookups,
 * no display-name matching.
 */
export function inferVercelCloudflareRelationships(
  resources: Resource[],
): Relationship[] {
  const zones = resources.filter(
    (r) => r.provider === "cloudflare" && r.kind === "zone",
  );
  const projects = resources.filter(
    (r) => r.provider === "vercel" && r.kind === "project",
  );

  if (zones.length === 0 || projects.length === 0) {
    return [];
  }

  const zonesByName = new Map<string, Resource[]>();
  for (const zone of zones) {
    const key = normalizeDnsNameForComparison(zone.name);
    if (!key) continue;
    const existing = zonesByName.get(key);
    if (existing) {
      existing.push(zone);
    } else {
      zonesByName.set(key, [zone]);
    }
  }

  const results: Relationship[] = [];
  const seen = new Set<string>();

  for (const project of projects) {
    const domains = asDomainEvidence(project.metadata.domains);
    if (domains.length === 0) continue;

    const hostnamesByApex = new Map<string, Set<string>>();
    for (const domain of domains) {
      const apex = normalizeDnsNameForComparison(domain.apexName);
      if (
        !apex ||
        apex === VERCEL_DEFAULT_APEX ||
        domain.hostname === VERCEL_DEFAULT_APEX ||
        domain.hostname.endsWith(`.${VERCEL_DEFAULT_APEX}`)
      ) {
        continue;
      }
      const hostnames = hostnamesByApex.get(apex) ?? new Set<string>();
      hostnames.add(domain.hostname);
      hostnamesByApex.set(apex, hostnames);
    }

    for (const [apex, hostnames] of hostnamesByApex) {
      const matchingZones = zonesByName.get(apex);
      if (!matchingZones) continue;

      for (const zone of matchingZones) {
        const relationship = createRelationship({
          sourceResourceId: project.id,
          targetResourceId: zone.id,
          kind: "uses_domain_in",
          evidence: evidenceFor(apex, [...hostnames]),
        });
        if (seen.has(relationship.id)) continue;
        seen.add(relationship.id);
        results.push(relationship);
      }
    }
  }

  return results;
}

/** Whether a stored Relationship belongs to this Sprint 009 inference path. */
export function isVercelCloudflareUsesDomainIn(rel: {
  kind: string;
  sourceResourceId: string;
  targetResourceId: string;
}): boolean {
  return (
    rel.kind === "uses_domain_in" &&
    rel.sourceResourceId.startsWith("vercel:project:") &&
    rel.targetResourceId.startsWith("cloudflare:zone:")
  );
}

/**
 * Whether a Vercel project Resource carries authoritative domain evidence
 * (enrichment succeeded; possibly empty). Missing `domains` means unknown.
 */
export function hasAuthoritativeDomainEvidence(resource: Resource): boolean {
  return Array.isArray(resource.metadata.domains);
}
