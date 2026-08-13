import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  deleteTopLevelMemberRaw,
  findTopLevelMember,
  JsonConfigFile,
  parseTomlSectionLines,
  parseTomlValue,
  scanJsonValueEnd,
  setTopLevelMemberRaw,
  TomlConfigFile,
  tomlString,
} from "../../src/agent/config.ts";

const SAMPLE = `{
  "globalAccountId": "abc-123",
  "mcpServers": {
    "other": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "other"]
    }
  },
  "oauthAccount": {
    "email": "user@example.com"
  }
}
`;

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "combie-config-"));
}

describe("JSON byte surgery", () => {
  test("findTopLevelMember finds a top-level key", () => {
    const m = findTopLevelMember(SAMPLE, "mcpServers");
    expect(m).not.toBeNull();
    expect(SAMPLE.slice(m!.valueStart, m!.valueEnd)).toContain('"other"');
  });

  test("findTopLevelMember does not match nested keys", () => {
    expect(findTopLevelMember(SAMPLE, "other")).toBeNull();
    expect(findTopLevelMember(SAMPLE, "email")).toBeNull();
  });

  test("findTopLevelMember returns null for non-object text", () => {
    expect(findTopLevelMember("[1, 2]", "mcpServers")).toBeNull();
    expect(findTopLevelMember("not json", "mcpServers")).toBeNull();
    expect(findTopLevelMember("", "mcpServers")).toBeNull();
  });

  test("scanJsonValueEnd handles strings, objects, arrays, scalars", () => {
    expect(scanJsonValueEnd('"hello"', 0)).toBe(7);
    expect(scanJsonValueEnd('{"a": 1}', 0)).toBe(8);
    expect(scanJsonValueEnd('["x", "y"]', 0)).toBe(10);
    expect(scanJsonValueEnd("123", 0)).toBe(3);
    expect(scanJsonValueEnd("true", 0)).toBe(4);
  });

  test("scanJsonValueEnd handles escaped quotes in strings", () => {
    expect(scanJsonValueEnd('"a\\"b"', 0)).toBe(6);
  });

  test("setTopLevelMemberRaw replaces an existing value preserving the rest", () => {
    const next = setTopLevelMemberRaw(SAMPLE, "mcpServers", {
      combie: { command: "bun" },
    });
    const parsed = JSON.parse(next) as Record<string, unknown>;
    expect(parsed.globalAccountId).toBe("abc-123");
    expect(parsed.oauthAccount).toEqual({ email: "user@example.com" });
    expect(parsed.mcpServers).toEqual({ combie: { command: "bun" } });
  });

  test("setTopLevelMemberRaw replaces a member in a single-line file cleanly", () => {
    const text = '{"mcpServers":{"combie":{"command":"bun","args":[]}}}';
    const next = setTopLevelMemberRaw(text, "mcpServers", {
      combie: { command: "bun", args: ["mcp"] },
    });
    expect(() => JSON.parse(next)).not.toThrow();
    expect(JSON.parse(next)).toEqual({
      mcpServers: { combie: { command: "bun", args: ["mcp"] } },
    });
  });

  test("setTopLevelMemberRaw inserts a new member into a non-empty object", () => {
    const next = setTopLevelMemberRaw('{"a": 1}', "b", [1, 2]);
    expect(JSON.parse(next)).toEqual({ a: 1, b: [1, 2] });
  });

  test("setTopLevelMemberRaw inserts into an empty object", () => {
    expect(JSON.parse(setTopLevelMemberRaw("{}", "a", 1))).toEqual({ a: 1 });
    expect(JSON.parse(setTopLevelMemberRaw("{ }", "a", 1))).toEqual({ a: 1 });
  });

  test("deleteTopLevelMemberRaw removes a leading member", () => {
    const next = deleteTopLevelMemberRaw('{\n  "a": 1,\n  "b": 2\n}', "a");
    expect(JSON.parse(next)).toEqual({ b: 2 });
  });

  test("deleteTopLevelMemberRaw removes a trailing member", () => {
    const next = deleteTopLevelMemberRaw('{\n  "a": 1,\n  "b": 2\n}', "b");
    expect(JSON.parse(next)).toEqual({ a: 1 });
  });

  test("deleteTopLevelMemberRaw removes the only member", () => {
    expect(JSON.parse(deleteTopLevelMemberRaw('{"a": 1}', "a"))).toEqual({});
  });

  test("deleteTopLevelMemberRaw is a no-op when the key is missing", () => {
    const text = '{"a": 1}';
    expect(deleteTopLevelMemberRaw(text, "b")).toBe(text);
  });
});

describe("JsonConfigFile", () => {
  let dirs: string[] = [];

  afterEach(() => {
    for (const d of dirs) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    dirs = [];
  });

  function freshFile(content?: string): { file: JsonConfigFile; dir: string } {
    const dir = tempDir();
    dirs.push(dir);
    const file = new JsonConfigFile(join(dir, "claude.json"));
    if (content !== undefined) {
      writeFileSync(file.path, content);
    }
    return { file, dir };
  }

  test("setTopLevelMember creates a fresh file for a missing config", () => {
    const { file } = freshFile();
    file.setTopLevelMember("mcpServers", { combie: { command: "bun" } });
    const parsed = JSON.parse(file.read()) as Record<string, unknown>;
    expect(parsed.mcpServers).toEqual({ combie: { command: "bun" } });
    expect(file.read().endsWith("\n")).toBe(true);
  });

  test("setTopLevelMember preserves unrelated top-level keys byte-content", () => {
    const { file } = freshFile(SAMPLE);
    file.setTopLevelMember("mcpServers", { combie: { command: "bun" } });
    const text = file.read();
    expect(text).toContain('"globalAccountId": "abc-123"');
    expect(text).toContain('"email": "user@example.com"');
  });

  test("getTopLevelMember returns the parsed member or null", () => {
    const { file } = freshFile(SAMPLE);
    expect((file.getTopLevelMember("mcpServers") as Record<string, unknown>).other).toBeDefined();
    expect(file.getTopLevelMember("missing")).toBeNull();
  });

  test("deleteTopLevelMember removes the member", () => {
    const { file } = freshFile(SAMPLE);
    file.deleteTopLevelMember("oauthAccount");
    const parsed = JSON.parse(file.read()) as Record<string, unknown>;
    expect(parsed.oauthAccount).toBeUndefined();
    expect(parsed.globalAccountId).toBe("abc-123");
  });

  test("invalid JSON fails safely", () => {
    const { file } = freshFile("{ not json");
    expect(() => file.setTopLevelMember("mcpServers", {})).toThrow(
      /Refusing to modify/,
    );
  });

  test("non-object top-level fails safely", () => {
    const { file } = freshFile("[1, 2, 3]");
    expect(() => file.setTopLevelMember("mcpServers", {})).toThrow(
      /Refusing to modify/,
    );
  });

  test("file mode is preserved on mutation", () => {
    if (process.platform === "win32") {
      return;
    }
    const { file, dir } = freshFile(SAMPLE);
    chmodSync(file.path, 0o600);
    file.setTopLevelMember("mcpServers", { combie: { command: "bun" } });
    const mode = statSync(join(dir, "claude.json")).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe("TOML section editing", () => {
  const TOML = `# Codex configuration

[model]
model = "gpt-5"

[mcp_servers.combie]
command = "bun"
args = ["run", "--cwd", "/abs/repo", "combie", "mcp"]
env = { COMBIE_HOME = "/abs/.combie" }

[mcp_servers.other]
command = "node"

[experimental]
enabled = true
`;

  let dirs: string[] = [];

  afterEach(() => {
    for (const d of dirs) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    dirs = [];
  });

  function freshFile(content?: string): { file: TomlConfigFile; dir: string } {
    const dir = tempDir();
    dirs.push(dir);
    const file = new TomlConfigFile(join(dir, "config.toml"));
    if (content !== undefined) {
      writeFileSync(file.path, content);
    }
    return { file, dir };
  }

  test("setSection replaces an existing section preserving the rest", () => {
    const { file } = freshFile(TOML);
    file.setSection("[mcp_servers.combie]", [
      'command = "bun"',
      'args = ["run", "--cwd", "/new/repo", "combie", "mcp"]',
    ]);
    const text = file.read();
    expect(text).toContain('# Codex configuration');
    expect(text).toContain("[model]");
    expect(text).toContain('model = "gpt-5"');
    expect(text).toContain("[mcp_servers.other]");
    expect(text).toContain("[experimental]");
    expect(text).not.toContain("/abs/repo");
    expect(text).toContain("/new/repo");
    expect(parseTomlSectionLines(text, "[mcp_servers.combie]").command).toBe("bun");
  });

  test("setSection appends a missing section at the end", () => {
    const { file } = freshFile(TOML.replace(/\[mcp_servers\.combie\][\s\S]*?(?=\[mcp_servers\.other\])/, ""));
    file.setSection("[mcp_servers.combie]", [
      'command = "bun"',
      'args = ["run", "--cwd", "/abs/repo", "combie", "mcp"]',
    ]);
    const text = file.read();
    expect(text).toContain("[mcp_servers.combie]");
    expect(parseTomlSectionLines(text, "[mcp_servers.combie]").command).toBe("bun");
    expect(text).toContain('model = "gpt-5"');
  });

  test("setSection works on a missing file", () => {
    const { file } = freshFile();
    file.setSection("[mcp_servers.combie]", ['command = "bun"']);
    expect(file.read()).toContain("[mcp_servers.combie]");
  });

  test("deleteSection removes the section", () => {
    const { file } = freshFile(TOML);
    expect(file.deleteSection("[mcp_servers.combie]")).toBe(true);
    const text = file.read();
    expect(text).not.toContain("mcp_servers.combie");
    expect(text).toContain("[model]");
    expect(text).toContain("[experimental]");
  });

  test("deleteSection is a no-op when the section is missing", () => {
    const { file } = freshFile(TOML);
    expect(file.deleteSection("[mcp_servers.nope]")).toBe(false);
    expect(file.read()).toBe(TOML);
  });

  test("deleteSection removes the env sub-section", () => {
    const { file } = freshFile(
      `${TOML}\n[mcp_servers.combie.env]\nCOMBIE_HOME = "/abs/.combie"\n`,
    );
    expect(file.deleteSection("[mcp_servers.combie.env]")).toBe(true);
    expect(file.read()).not.toContain("mcp_servers.combie.env");
    expect(parseTomlSectionLines(file.read(), "[mcp_servers.combie]").command).toBe("bun");
  });

  test("parseTomlSectionLines parses strings, arrays, and inline tables", () => {
    const parsed = parseTomlSectionLines(TOML, "[mcp_servers.combie]");
    expect(parsed.command).toBe("bun");
    expect(parsed.args).toEqual(["run", "--cwd", "/abs/repo", "combie", "mcp"]);
    expect(parsed.env).toEqual({ COMBIE_HOME: "/abs/.combie" });
  });

  test("parseTomlSectionLines parses a cwd field and sub-section env", () => {
    const text = `[mcp_servers.combie]\ncommand = "bun"\nargs = ["combie", "mcp"]\ncwd = "/abs/repo"\n\n[mcp_servers.combie.env]\nCOMBIE_HOME = "/abs/.combie"\n`;
    const main = parseTomlSectionLines(text, "[mcp_servers.combie]");
    expect(main.cwd).toBe("/abs/repo");
    const env = parseTomlSectionLines(text, "[mcp_servers.combie.env]");
    expect(env.COMBIE_HOME).toBe("/abs/.combie");
  });

  test("tomlString escapes quotes and backslashes", () => {
    expect(tomlString('a"b\\c')).toBe('"a\\"b\\\\c"');
  });

  test("parseTomlValue parses scalar values", () => {
    expect(parseTomlValue('"str"')).toBe("str");
    expect(parseTomlValue("123")).toBe("123");
    expect(parseTomlValue('["a", "b"]')).toEqual(["a", "b"]);
    expect(parseTomlValue('{ K = "v" }')).toEqual({ K: "v" });
  });
});
