import { describe, expect, test } from "bun:test";
import {
  formatInvestigationContext,
  type InvestigationContext,
} from "../../src/app/investigate.ts";
import { composeInvestigationTimeline } from "../../src/app/timeline.ts";
import type { Change } from "../../src/domain/change.ts";
import {
  createRelationship,
  type Relationship,
} from "../../src/domain/relationship.ts";
import { createResource, type Resource } from "../../src/domain/resource.ts";

const CREATED_AT = "2026-08-08T08:00:00.000Z";

function resource(
  provider: string,
  kind: Resource["kind"],
  providerResourceId: string,
  name: string,
): Resource {
  return createResource({
    provider,
    kind,
    providerResourceId,
    name,
    metadata: {},
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

function change(
  id: string,
  resourceId: string,
  observedAt: string,
  fields: Change["fields"] = [
    { path: "name", before: "before", after: "after" },
  ],
): Change {
  return { id, resourceId, observedAt, kind: "updated", fields };
}

const NO_DEPLOYMENTS = { kind: "not_applicable" as const };
const NO_WORKFLOWS = { kind: "not_applicable" as const };
const NO_OPERATIONS = { kind: "not_applicable" as const };

function relationship(
  sourceResourceId: string,
  targetResourceId: string,
  kind: Relationship["kind"],
  mechanism: string,
): Relationship {
  return createRelationship({
    sourceResourceId,
    targetResourceId,
    kind,
    evidence: {
      source: "fixture",
      mechanism,
      repository:
        kind === "source_for" ? "acme/application" : undefined,
      apexName: kind === "uses_domain_in" ? "example.com" : undefined,
    },
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

describe("Investigation timeline composition", () => {
  test("subject-only entries preserve the exact Resource, Change, timestamp, and complete evidence", () => {
    const subject = resource("vercel", "project", "subject", "application");
    const subjectChange = change(
      "subject-change",
      subject.id,
      "2026-08-08T10:03:00.123Z",
      [
        { path: "metadata.framework", before: "nextjs", after: undefined },
        { path: "metadata.region", before: undefined, after: "iad1" },
      ],
    );
    const context: InvestigationContext = {
      subject,
      subjectChanges: [subjectChange],
      related: [],
      subjectDeployments: NO_DEPLOYMENTS,
      subjectWorkflowRuns: NO_WORKFLOWS,
      subjectOperations: NO_OPERATIONS,
    };

    const timeline = composeInvestigationTimeline(context);

    expect(timeline.subject).toBe(subject);
    expect(timeline.entries).toHaveLength(1);
    expect(timeline.entries[0]!.resource).toBe(subject);
    expect(timeline.entries[0]!.change).toBe(subjectChange);
    expect(timeline.entries[0]!.change.observedAt).toBe(
      "2026-08-08T10:03:00.123Z",
    );
    expect(timeline.entries[0]!.change.fields).toEqual([
      { path: "metadata.framework", before: "nextjs", after: undefined },
      { path: "metadata.region", before: undefined, after: "iad1" },
    ]);
    expect(timeline.entries[0]!.role).toBe("subject");
    expect(timeline.entries[0]!.relationships).toEqual([]);
  });

  test("related-only entries preserve Resource and canonical Relationship provenance", () => {
    const subject = resource("vercel", "project", "subject", "application");
    const repository = resource("github", "repository", "repo", "application");
    const edge = relationship(
      repository.id,
      subject.id,
      "source_for",
      "git_repository_reference",
    );
    const repositoryChange = change(
      "repository-change",
      repository.id,
      "2026-08-08T10:03:00.000Z",
    );
    const context: InvestigationContext = {
      subject,
      subjectChanges: [],
      related: [
        {
          relationship: edge,
          direction: "inbound",
          resource: repository,
          changes: [repositoryChange],
          deployments: NO_DEPLOYMENTS,
          workflowRuns: NO_WORKFLOWS,
          operations: NO_OPERATIONS,
        },
      ],
      subjectDeployments: NO_DEPLOYMENTS,
      subjectWorkflowRuns: NO_WORKFLOWS,
      subjectOperations: NO_OPERATIONS,
    };

    const entry = composeInvestigationTimeline(context).entries[0]!;

    expect(entry.role).toBe("related");
    expect(entry.resource).toBe(repository);
    expect(entry.change).toBe(repositoryChange);
    expect(entry.relationships).toHaveLength(1);
    expect(entry.relationships[0]!.relationship).toBe(edge);
    expect(entry.relationships[0]!.direction).toBe("inbound");
    expect(entry.relationships[0]!.relationship.evidence).toEqual({
      source: "fixture",
      mechanism: "git_repository_reference",
      repository: "acme/application",
      apexName: undefined,
    });
  });

  test("interleaves subject and multiple related Resources newest first", () => {
    const subject = resource("vercel", "project", "subject", "application");
    const repository = resource("github", "repository", "repo", "application");
    const zone = resource("cloudflare", "zone", "zone", "example.com");
    const sourceFor = relationship(repository.id, subject.id, "source_for", "git");
    const usesDomain = relationship(
      subject.id,
      zone.id,
      "uses_domain_in",
      "domain",
    );
    const context: InvestigationContext = {
      subject,
      subjectChanges: [
        change("subject-middle", subject.id, "2026-08-08T10:07:00.000Z"),
      ],
      related: [
        {
          relationship: sourceFor,
          direction: "inbound",
          resource: repository,
          changes: [
            change("repository-old", repository.id, "2026-08-08T10:03:00.000Z"),
          ],
          deployments: NO_DEPLOYMENTS,
          workflowRuns: NO_WORKFLOWS,
          operations: NO_OPERATIONS,
        },
        {
          relationship: usesDomain,
          direction: "outbound",
          resource: zone,
          changes: [
            change("zone-new", zone.id, "2026-08-08T10:09:00.000Z"),
          ],
          deployments: NO_DEPLOYMENTS,
          workflowRuns: NO_WORKFLOWS,
          operations: NO_OPERATIONS,
        },
      ],
      subjectDeployments: NO_DEPLOYMENTS,
      subjectWorkflowRuns: NO_WORKFLOWS,
      subjectOperations: NO_OPERATIONS,
    };

    const timeline = composeInvestigationTimeline(context);

    expect(timeline.entries.map((entry) => entry.change.id)).toEqual([
      "zone-new",
      "subject-middle",
      "repository-old",
    ]);
    expect(timeline.entries.map((entry) => entry.resource.id)).toEqual([
      zone.id,
      subject.id,
      repository.id,
    ]);
  });

  test("orders equal timestamps by Change id descending and repeats identically", () => {
    const subject = resource("vercel", "project", "subject", "application");
    const repository = resource("github", "repository", "repo", "application");
    const edge = relationship(repository.id, subject.id, "source_for", "git");
    const timestamp = "2026-08-08T10:03:00.000Z";
    const context: InvestigationContext = {
      subject,
      subjectChanges: [change("change-a", subject.id, timestamp)],
      related: [
        {
          relationship: edge,
          direction: "inbound",
          resource: repository,
          changes: [
            change("change-z", repository.id, timestamp),
            change("change-m", repository.id, timestamp),
          ],
          deployments: NO_DEPLOYMENTS,
          workflowRuns: NO_WORKFLOWS,
          operations: NO_OPERATIONS,
        },
      ],
      subjectDeployments: NO_DEPLOYMENTS,
      subjectWorkflowRuns: NO_WORKFLOWS,
      subjectOperations: NO_OPERATIONS,
    };

    const first = composeInvestigationTimeline(context);
    const second = composeInvestigationTimeline(context);

    expect(first.entries.map((entry) => entry.change.id)).toEqual([
      "change-z",
      "change-m",
      "change-a",
    ]);
    expect(first.entries.every((entry) => entry.change.observedAt === timestamp)).toBe(
      true,
    );
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  test("one related Change carries every connecting path once in context order", () => {
    const subject = resource("vercel", "project", "subject", "application");
    const neighbor = resource("github", "repository", "neighbor", "application");
    const sourceFor = relationship(
      neighbor.id,
      subject.id,
      "source_for",
      "git_repository_reference",
    );
    const usesDomain = relationship(
      subject.id,
      neighbor.id,
      "uses_domain_in",
      "custom_domain_apex",
    );
    const neighborChange = change(
      "neighbor-change",
      neighbor.id,
      "2026-08-08T10:03:00.000Z",
    );
    const context: InvestigationContext = {
      subject,
      subjectChanges: [],
      related: [
        {
          relationship: sourceFor,
          direction: "inbound",
          resource: neighbor,
          changes: [neighborChange],
          deployments: NO_DEPLOYMENTS,
          workflowRuns: NO_WORKFLOWS,
          operations: NO_OPERATIONS,
        },
        {
          relationship: usesDomain,
          direction: "outbound",
          resource: neighbor,
          changes: [neighborChange],
          deployments: NO_DEPLOYMENTS,
          workflowRuns: NO_WORKFLOWS,
          operations: NO_OPERATIONS,
        },
      ],
      subjectDeployments: NO_DEPLOYMENTS,
      subjectWorkflowRuns: NO_WORKFLOWS,
      subjectOperations: NO_OPERATIONS,
    };

    const timeline = composeInvestigationTimeline(context);

    expect(timeline.entries).toHaveLength(1);
    expect(timeline.entries[0]!.change).toBe(neighborChange);
    expect(
      timeline.entries[0]!.relationships.map((path) => [
        path.relationship,
        path.direction,
      ]),
    ).toEqual([
      [sourceFor, "inbound"],
      [usesDomain, "outbound"],
    ]);
  });

  test("formats exact related Change and multi-Relationship provenance deterministically", () => {
    const subject = resource("vercel", "project", "subject", "application");
    const neighbor = resource("github", "repository", "neighbor", "application");
    const sourceFor = relationship(
      neighbor.id,
      subject.id,
      "source_for",
      "git_repository_reference",
    );
    const usesDomain = relationship(
      subject.id,
      neighbor.id,
      "uses_domain_in",
      "custom_domain_apex",
    );
    const observedAt = "2026-08-08T10:03:00.123Z";
    const neighborChange = change(
      "neighbor-change-exact",
      neighbor.id,
      observedAt,
      [
        { path: "metadata.framework", before: "nextjs", after: undefined },
        { path: "metadata.region", before: undefined, after: "iad1" },
      ],
    );
    const context: InvestigationContext = {
      subject,
      subjectChanges: [],
      related: [
        {
          relationship: sourceFor,
          direction: "inbound",
          resource: neighbor,
          changes: [neighborChange],
          deployments: NO_DEPLOYMENTS,
          workflowRuns: NO_WORKFLOWS,
          operations: NO_OPERATIONS,
        },
        {
          relationship: usesDomain,
          direction: "outbound",
          resource: neighbor,
          changes: [neighborChange],
          deployments: NO_DEPLOYMENTS,
          workflowRuns: NO_WORKFLOWS,
          operations: NO_OPERATIONS,
        },
      ],
      subjectDeployments: NO_DEPLOYMENTS,
      subjectWorkflowRuns: NO_WORKFLOWS,
      subjectOperations: NO_OPERATIONS,
    };

    const first = formatInvestigationContext(context);
    const second = formatInvestigationContext(context);

    expect(first).toBe(second);
    expect(first).toContain("TIMELINE (newest first)");
    expect(first).toContain(`Change ID: ${neighborChange.id}`);
    expect(first).toContain(`Observed: ${observedAt}`);
    expect(first).toContain('"nextjs" → (absent)');
    expect(first).toContain('(absent) → "iad1"');

    const sourceKind = "Relationship: source_for (inbound)";
    const domainKind = "Relationship: uses_domain_in (outbound)";
    expect(first).toContain(sourceKind);
    expect(first).toContain(`Relationship ID: ${sourceFor.id}`);
    expect(first).toContain("fixture git_repository_reference");
    expect(first).toContain(domainKind);
    expect(first).toContain(`Relationship ID: ${usesDomain.id}`);
    expect(first).toContain("fixture custom_domain_apex");
    expect(first.indexOf(sourceKind)).toBeLessThan(first.indexOf(domainKind));
  });

  test("zero-change and dangling neighbors add no entries or fabricated Resources", () => {
    const subject = resource("vercel", "project", "subject", "application");
    const zeroChangeNeighbor = resource(
      "cloudflare",
      "zone",
      "zone",
      "example.com",
    );
    const zeroEdge = relationship(
      subject.id,
      zeroChangeNeighbor.id,
      "uses_domain_in",
      "domain",
    );
    const danglingEdge = relationship(
      "github:repository:missing",
      subject.id,
      "source_for",
      "git",
    );
    const context: InvestigationContext = {
      subject,
      subjectChanges: [],
      related: [
        {
          relationship: zeroEdge,
          direction: "outbound",
          resource: zeroChangeNeighbor,
          changes: [],
          deployments: NO_DEPLOYMENTS,
          workflowRuns: NO_WORKFLOWS,
          operations: NO_OPERATIONS,
        },
        {
          relationship: danglingEdge,
          direction: "inbound",
          resource: null,
          changes: [],
          deployments: NO_DEPLOYMENTS,
          workflowRuns: NO_WORKFLOWS,
          operations: NO_OPERATIONS,
        },
      ],
      subjectDeployments: NO_DEPLOYMENTS,
      subjectWorkflowRuns: NO_WORKFLOWS,
      subjectOperations: NO_OPERATIONS,
    };

    const timeline = composeInvestigationTimeline(context);

    expect(timeline.subject).toBe(subject);
    expect(timeline.entries).toEqual([]);
  });

  test("composes only the one-hop Changes present in the bounded context", () => {
    const subject = resource("github", "repository", "a", "a");
    const direct = resource("vercel", "project", "b", "b");
    const secondHop = resource("cloudflare", "zone", "c", "c.example");
    const directEdge = relationship(subject.id, direct.id, "source_for", "git");
    const directChange = change(
      "direct-change",
      direct.id,
      "2026-08-08T10:03:00.000Z",
    );
    const secondHopChange = change(
      "second-hop-change",
      secondHop.id,
      "2026-08-08T10:09:00.000Z",
    );
    const context: InvestigationContext = {
      subject,
      subjectChanges: [],
      related: [
        {
          relationship: directEdge,
          direction: "outbound",
          resource: direct,
          changes: [directChange],
          deployments: NO_DEPLOYMENTS,
          workflowRuns: NO_WORKFLOWS,
          operations: NO_OPERATIONS,
        },
      ],
      subjectDeployments: NO_DEPLOYMENTS,
      subjectWorkflowRuns: NO_WORKFLOWS,
      subjectOperations: NO_OPERATIONS,
    };

    const timeline = composeInvestigationTimeline(context);

    expect(timeline.entries.map((entry) => entry.change)).toEqual([
      directChange,
    ]);
    expect(timeline.entries.some((entry) => entry.resource === secondHop)).toBe(
      false,
    );
    expect(
      timeline.entries.some((entry) => entry.change === secondHopChange),
    ).toBe(false);
  });
});
