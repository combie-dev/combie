import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const PROJECT_ROOT = dirname(dirname(import.meta.dir));

const COMBIE_SKILL_PATH = join(PROJECT_ROOT, "skills", "combie", "SKILL.md");
const BUILD_SKILL_PATH = join(PROJECT_ROOT, "skills", "build-combie", "SKILL.md");

function readOptional(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function frontmatterBlock(text: string): string {
  const firstClose = text.indexOf("\n---", 1);
  return firstClose === -1 ? text.slice(3) : text.slice(3, firstClose);
}

describe("skills/combie content contract (Sprint 083)", () => {
  const skillText = readOptional(COMBIE_SKILL_PATH);

  test("skills/combie/SKILL.md exists", () => {
    expect(skillText, "skills/combie/SKILL.md not found — Sprint 083 skill file missing").not.toBeNull();
  });

  test("starts with YAML frontmatter", () => {
    if (skillText === null) return;
    expect(skillText.startsWith("---")).toBe(true);
  });

  test("frontmatter declares name: combie", () => {
    if (skillText === null) return;
    expect(frontmatterBlock(skillText).split("\n").some((line) => line.trim() === "name: combie")).toBe(true);
  });

  test("frontmatter has a non-empty description", () => {
    if (skillText === null) return;
    const lines = frontmatterBlock(skillText).split("\n");
    const descriptionLine = lines.find((line) => line.trimStart().startsWith("description:"));
    expect(descriptionLine).toBeDefined();
    const description = descriptionLine!.slice(descriptionLine!.indexOf("description:") + "description:".length).trim();
    expect(description.length).toBeGreaterThan(0);
  });

  test("frontmatter omits disable-model-invocation", () => {
    if (skillText === null) return;
    expect(frontmatterBlock(skillText)).not.toContain("disable-model-invocation");
  });

  const SIX_STEPS = [
    "## 1. Run a compact investigation",
    "## 2. Inspect freshness and missing context",
    "## 3. Refresh only the necessary authoritative providers",
    "## 4. Filter structured results locally",
    "## 5. Retrieve deeper evidence only when necessary",
    "## 6. Cite the evidence used in a conclusion",
  ];

  test("body contains all six step headings", () => {
    if (skillText === null) return;
    for (const heading of SIX_STEPS) {
      expect(skillText.includes(heading), `missing heading: ${heading}`).toBe(true);
    }
  });

  test("six step headings appear in order", () => {
    if (skillText === null) return;
    const indexes = SIX_STEPS.map((heading) => skillText.indexOf(heading));
    expect(indexes.every((index) => index !== -1)).toBe(true);
    for (let i = 1; i < indexes.length; i++) {
      expect(indexes[i]!).toBeGreaterThan(indexes[i - 1]!);
    }
  });

  test("allowlist: compact investigation surfaces", () => {
    if (skillText === null) return;
    expect(skillText.includes("investigate_resource")).toBe(true);
    expect(skillText.includes("combie investigate")).toBe(true);
  });

  test("allowlist: scoped refresh surface", () => {
    if (skillText === null) return;
    expect(skillText.includes("combie sync")).toBe(true);
  });

  test("allowlist: local filtering surface", () => {
    if (skillText === null) return;
    expect(skillText.includes("--json")).toBe(true);
  });

  test("allowlist: complete snapshot retrieve surface", () => {
    if (skillText === null) return;
    expect(skillText.includes("combie investigation")).toBe(true);
    expect(skillText.includes("investigationArtifact")).toBe(true);
  });

  test("allowlist: freshness and missing context surface", () => {
    if (skillText === null) return;
    expect(skillText.includes("Missing Context")).toBe(true);
    expect(skillText.includes("unknown_provider_sync_authority")).toBe(true);
    expect(skillText.includes("unknown_relationship_authority")).toBe(true);
    expect(skillText.includes("not_in_last_successful_discovery")).toBe(true);
  });

  test("allowlist: MCP is read-only", () => {
    if (skillText === null) return;
    expect(skillText.includes("read-only")).toBe(true);
  });

  const DENYLIST = [
    "combie timeline",
    "combie memory",
    "combie ask",
    "--refresh",
    "--limit",
    "--offline",
    "list_investigations",
    "get_investigation",
    "investigationSnapshot.snapshot",
    "npx skills",
    "~/.cursor",
    "agent setup",
  ];

  test("denylist: no unshipped commands or surfaces", () => {
    if (skillText === null) return;
    for (const banned of DENYLIST) {
      expect(skillText.includes(banned), `forbidden string present: ${banned}`).toBe(false);
    }
  });

  test("denylist: no MCP sync or write claims", () => {
    if (skillText === null) return;
    expect(skillText.includes("MCP can sync")).toBe(false);
    expect(skillText.includes("MCP can write")).toBe(false);
    expect(skillText.includes("MCP writes")).toBe(false);
  });

  test("constitution guard: skills/build-combie/SKILL.md untouched by the skill claims", () => {
    const constitutionText = readOptional(BUILD_SKILL_PATH);
    expect(constitutionText, "skills/build-combie/SKILL.md not found").not.toBeNull();
    if (constitutionText === null) return;
    expect(constitutionText.includes("skills/combie")).toBe(false);
    expect(constitutionText.includes("six-step")).toBe(false);
  });
});