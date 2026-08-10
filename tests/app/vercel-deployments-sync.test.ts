import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncVercelDeployments } from "../../src/app/vercel-deployments.ts";
import { createResource } from "../../src/domain/resource.ts";
import { createVercelProvider } from "../../src/providers/vercel/adapter.ts";
import userFixture from "../providers/vercel/fixtures/user.json";
import projectsFixture from "../providers/vercel/fixtures/projects.json";
import deploymentsFixture from "../providers/vercel/fixtures/deployments.json";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-deploy-sync-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const EMPTY_DOMAINS = { domains: [], pagination: { count: 0, next: null } };
const EMPTY_DEPLOYMENTS = {
  deployments: [],
  pagination: { count: 0, next: null, prev: null },
};

function projectResource(id: string, name = "demo") {
  return createResource({
    provider: "vercel",
    providerResourceId: id,
    kind: "project",
    name,
    metadata: { accountId: "user_abc123" },
  });
}

describe("syncVercelDeployments", () => {
  test("success populates deployments with exact project association", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource("prj_demo_hub", "demo-hub");
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });

    const result = await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () => Response.json(deploymentsFixture)) as unknown as typeof fetch,
    });

    expect(result.refreshed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.upserted).toBe(2);
    const list = store.listVercelDeploymentsForResource(project.id);
    expect(list).toHaveLength(2);
    expect(list.every((d) => d.resourceId === project.id)).toBe(true);
    expect(list.every((d) => d.projectId === "prj_demo_hub")).toBe(true);
    expect(store.getVercelDeploymentRefresh(project.id)?.status).toBe(
      "success",
    );
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("known-empty deployment result is success with zero rows", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource("prj_empty");
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () => Response.json(EMPTY_DEPLOYMENTS)) as unknown as typeof fetch,
    });
    expect(store.getVercelDeploymentRefresh(project.id)?.status).toBe(
      "success",
    );
    expect(store.listVercelDeploymentsForResource(project.id)).toEqual([]);
    store.close();
  });

  test("deployment retrieval failure retains prior evidence and marks failure", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource("prj_demo_hub");
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () => Response.json(deploymentsFixture)) as unknown as typeof fetch,
    });
    expect(store.countVercelDeployments()).toBe(2);

    await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T13:00:00.000Z",
      fetch: (async () =>
        Response.json(
          { error: { message: "rate limited" } },
          { status: 429 },
        )) as unknown as typeof fetch,
    });
    expect(store.getVercelDeploymentRefresh(project.id)?.status).toBe(
      "failure",
    );
    expect(store.countVercelDeployments()).toBe(2);
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("repeated sync does not duplicate deployments; status refresh is idempotent", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource("prj_demo_hub");
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    const buildingOnly = {
      deployments: [
        {
          uid: "dpl_building_002",
          projectId: "prj_demo_hub",
          created: 1723201000000,
          readyState: "BUILDING",
          state: "BUILDING",
        },
      ],
      pagination: { count: 1, next: null, prev: null },
    };
    await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () => Response.json(buildingOnly)) as unknown as typeof fetch,
    });
    const ready = {
      deployments: [
        {
          uid: "dpl_building_002",
          projectId: "prj_demo_hub",
          created: 1723201000000,
          readyState: "READY",
          state: "READY",
          ready: 1723201300000,
        },
      ],
      pagination: { count: 1, next: null, prev: null },
    };
    await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T13:00:00.000Z",
      fetch: (async () => Response.json(ready)) as unknown as typeof fetch,
    });
    const list = store.listVercelDeploymentsForResource(project.id);
    expect(list).toHaveLength(1);
    expect(list[0]!.readyState).toBe("READY");
    expect(list[0]!.readyAtMs).toBe(1723201300000);
    store.close();
  });

  test("Sprint 027: result_count 0, >0, retained > latest, failure preserves, idempotent", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource("prj_demo_hub");
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });

    // Successful empty
    await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () => Response.json(EMPTY_DEPLOYMENTS)) as unknown as typeof fetch,
    });
    expect(store.getVercelDeploymentRefresh(project.id)?.resultCount).toBe(0);

    // Successful populated
    await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:30:00.000Z",
      fetch: (async () => Response.json(deploymentsFixture)) as unknown as typeof fetch,
    });
    expect(store.getVercelDeploymentRefresh(project.id)?.resultCount).toBe(2);
    expect(store.listVercelDeploymentsForResource(project.id)).toHaveLength(2);

    // Successful smaller response retains prior rows; result_count is latest only
    const oneOnly = {
      deployments: [
        {
          uid: "dpl_building_002",
          projectId: "prj_demo_hub",
          created: 1723201000000,
          readyState: "READY",
          state: "READY",
        },
      ],
      pagination: { count: 1, next: null, prev: null },
    };
    await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:45:00.000Z",
      fetch: (async () => Response.json(oneOnly)) as unknown as typeof fetch,
    });
    expect(store.getVercelDeploymentRefresh(project.id)?.resultCount).toBe(1);
    expect(store.listVercelDeploymentsForResource(project.id).length).toBeGreaterThan(
      1,
    );

    // Failure preserves last successful result count and time
    await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T13:00:00.000Z",
      fetch: (async () =>
        Response.json(
          { error: { message: "rate limited" } },
          { status: 429 },
        )) as unknown as typeof fetch,
    });
    const failed = store.getVercelDeploymentRefresh(project.id);
    expect(failed?.status).toBe("failure");
    expect(failed?.observedAt).toBe("2026-08-09T13:00:00.000Z");
    expect(failed?.resultCount).toBe(1);
    expect(failed?.lastSuccessfulObservedAt).toBe("2026-08-09T12:45:00.000Z");

    // Idempotent success rewrite
    await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T13:30:00.000Z",
      fetch: (async () => Response.json(oneOnly)) as unknown as typeof fetch,
    });
    expect(store.getVercelDeploymentRefresh(project.id)).toEqual({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T13:30:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T13:30:00.000Z",
    });
    store.close();
  });

  test("ignores deployments that do not match exact project id", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource("prj_expected");
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    await syncVercelDeployments({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () =>
        Response.json({
          deployments: [
            {
              uid: "dpl_wrong",
              projectId: "prj_other",
              created: 1,
              readyState: "READY",
            },
            {
              uid: "dpl_ok",
              projectId: "prj_expected",
              created: 2,
              readyState: "READY",
            },
          ],
          pagination: { count: 2, next: null },
        })) as unknown as typeof fetch,
    });
    const list = store.listVercelDeploymentsForResource(project.id);
    expect(list.map((d) => d.uid)).toEqual(["dpl_ok"]);
    store.close();
  });
});

describe("Vercel sync integration with deployment enrichment", () => {
  test("project discovery remains trustworthy when deployment retrieval fails", async () => {
    // Unit-level: discover via adapter succeeds; deployment sync fails separately.
    const provider = createVercelProvider({
      fetch: (async (input: string | URL | Request) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.includes("/v2/user")) return Response.json(userFixture);
        if (url.includes("/domains")) return Response.json(EMPTY_DOMAINS);
        if (url.includes("/v9/projects")) return Response.json(projectsFixture);
        return Response.json(
          { error: { message: "deploy fail" } },
          { status: 500 },
        );
      }) as unknown as typeof fetch,
    });
    const discovered = await provider.discoverResources("token", {
      accountId: "user_abc123",
    });
    expect(discovered.resources.length).toBeGreaterThan(0);

    const store = new Store(dir);
    store.init();
    for (const r of discovered.resources) {
      store.applyResource(r, {
        id: `obs-${r.id}`,
        observedAt: "2026-08-09T12:00:00.000Z",
      });
    }
    const result = await syncVercelDeployments({
      store,
      token: "token",
      projects: discovered.resources,
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () =>
        Response.json(
          { error: { message: "deploy fail" } },
          { status: 500 },
        )) as unknown as typeof fetch,
    });
    expect(result.failed).toBe(discovered.resources.length);
    expect(store.listResources({ provider: "vercel" }).length).toBe(
      discovered.resources.length,
    );
    store.close();
  });
});
