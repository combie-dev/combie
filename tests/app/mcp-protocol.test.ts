import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createResource } from "../../src/domain/resource.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

describe("MCP stdio contract", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("discovers exactly four read-only tools and returns full investigation context without mutating state", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-"));
    dirs.push(dir);
    const store = new Store(dir);
    store.init();
    store.upsertResource(
      createResource({
        provider: "github",
        providerResourceId: "123",
        kind: "repository",
        name: "example/repo",
        metadata: { fullName: "example/repo" },
      }),
    );
    store.close();

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["run", "src/cli/index.ts", "mcp", "--dir", dir],
      cwd: process.cwd(),
      stderr: "pipe",
    });

    try {
      await client.connect(transport);
      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
        "get_related_context",
        "investigate_resource",
        "list_providers",
        "list_resources",
      ]);
      for (const tool of listed.tools) {
        expect(tool.annotations).toMatchObject({
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        });
      }

      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: "github:repository:123" },
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        subject: { id: "github:repository:123" },
      });
      for (const key of [
        "knownFacts",
        "missingContext",
        "providerActivity",
        "timeline",
        "subjectReleases",
        "sharedCommitContext",
      ]) {
        expect(result.structuredContent).toHaveProperty(key);
      }
    } finally {
      await client.close();
    }

    expect(digest()).toBe(before);
  }, 15_000);
});
