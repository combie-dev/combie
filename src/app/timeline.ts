import type { Change } from "../domain/change.ts";
import type { Relationship } from "../domain/relationship.ts";
import type { Resource } from "../domain/resource.ts";
import type { InvestigationContext } from "./investigate.ts";
import type { RelatedDirection } from "./related.ts";

export interface InvestigationTimelineRelationship {
  relationship: Relationship;
  direction: RelatedDirection;
}

export interface InvestigationTimelineEntry {
  change: Change;
  resource: Resource;
  role: "subject" | "related";
  relationships: InvestigationTimelineRelationship[];
}

export interface InvestigationTimeline {
  subject: Resource;
  entries: InvestigationTimelineEntry[];
}

interface RelatedTimelineSource {
  resource: Resource;
  relationships: InvestigationTimelineRelationship[];
  changes: Map<string, Change>;
}

function compareDescending(left: string, right: string): number {
  return left < right ? 1 : left > right ? -1 : 0;
}

/**
 * Merge the Changes already present in one bounded InvestigationContext.
 * This pure view adds no reads, writes, traversal, or temporal inference.
 */
export function composeInvestigationTimeline(
  context: InvestigationContext,
): InvestigationTimeline {
  const entries: InvestigationTimelineEntry[] = context.subjectChanges.map(
    (change) => ({
      change,
      resource: context.subject,
      role: "subject",
      relationships: [],
    }),
  );

  const relatedByResource = new Map<string, RelatedTimelineSource>();
  for (const neighbor of context.related) {
    if (!neighbor.resource || neighbor.resource.id === context.subject.id) {
      continue;
    }

    let source = relatedByResource.get(neighbor.resource.id);
    if (!source) {
      source = {
        resource: neighbor.resource,
        relationships: [],
        changes: new Map(),
      };
      relatedByResource.set(neighbor.resource.id, source);
    }

    source.relationships.push({
      relationship: neighbor.relationship,
      direction: neighbor.direction,
    });
    for (const change of neighbor.changes) {
      source.changes.set(change.id, source.changes.get(change.id) ?? change);
    }
  }

  for (const source of relatedByResource.values()) {
    for (const change of source.changes.values()) {
      entries.push({
        change,
        resource: source.resource,
        role: "related",
        relationships: source.relationships,
      });
    }
  }

  entries.sort((left, right) => {
    const observedAt = compareDescending(
      left.change.observedAt,
      right.change.observedAt,
    );
    return observedAt || compareDescending(left.change.id, right.change.id);
  });

  return { subject: context.subject, entries };
}
