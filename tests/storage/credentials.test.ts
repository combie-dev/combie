import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { CredentialStore } from "../../src/storage/credentials.ts";
import { credentialsPath, dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "combie-creds-"));
}

describe("CredentialStore", () => {
  let dirs: string[] = [];

  afterEach(() => {
    for (const d of dirs) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
    dirs = [];
  });

  function fresh(): { store: CredentialStore; dir: string } {
    const dir = tempDir();
    dirs.push(dir);
    return { store: new CredentialStore(dir), dir };
  }

  test("set and get credential", () => {
    const { store } = fresh();
    expect(store.hasCredential("cloudflare")).toBe(false);
    expect(store.getCredential("cloudflare")).toBeNull();

    store.setCredential("cloudflare", "cf-token-secret");
    expect(store.hasCredential("cloudflare")).toBe(true);
    expect(store.getCredential("cloudflare")).toBe("cf-token-secret");
  });

  test("delete credential", () => {
    const { store } = fresh();
    store.setCredential("cloudflare", "tok");
    store.deleteCredential("cloudflare");
    expect(store.hasCredential("cloudflare")).toBe(false);
    expect(store.getCredential("cloudflare")).toBeNull();
  });

  test("credentials file has mode 0600 on unix", () => {
    if (process.platform === "win32") {
      return;
    }
    const { store, dir } = fresh();
    store.setCredential("cloudflare", "secret-token");

    const path = credentialsPath(dir);
    expect(existsSync(path)).toBe(true);
    const mode = statSync(path).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  test("credentials are not stored in the domain database", () => {
    const { store: creds, dir } = fresh();
    const token = "super-secret-cf-token-xyz";
    creds.setCredential("cloudflare", token);

    const domain = new Store(dir);
    domain.init();
    domain.upsertProvider({
      id: "cloudflare",
      name: "Cloudflare",
      status: "connected",
      config: { accountId: "acc" },
    });
    domain.close();

    const db = new Database(dbPath(dir), { readonly: true });
    const tables = db
      .query(`SELECT name FROM sqlite_master WHERE type='table'`)
      .all() as Array<{ name: string }>;
    expect(tables.map((t) => t.name)).not.toContain("credentials");

    // Scan all text cells for the token
    for (const { name } of tables) {
      if (name.startsWith("sqlite_")) continue;
      const rows = db.query(`SELECT * FROM "${name}"`).all() as Array<
        Record<string, unknown>
      >;
      const blob = JSON.stringify(rows);
      expect(blob).not.toContain(token);
    }
    db.close();

    // Token lives only in the credentials file
    const fileBody = readFileSync(credentialsPath(dir), "utf8");
    expect(fileBody).toContain(token);
    expect(fileBody).not.toContain("sqlite");
  });

  test("overwrites existing credential for same provider", () => {
    const { store } = fresh();
    store.setCredential("cloudflare", "old");
    store.setCredential("cloudflare", "new");
    expect(store.getCredential("cloudflare")).toBe("new");
  });
});
