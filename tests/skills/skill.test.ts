import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse } from "yaml";

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

  test("frontmatter parses as YAML with name combie and quoted description", () => {
    if (skillText === null) return;
    const parsed = parse(frontmatterBlock(skillText)) as { name: string; description: string };
    expect(parsed.name).toBe("combie");
    expect(typeof parsed.description).toBe("string");
    expect(parsed.description.length).toBeGreaterThan(0);
  });

  test("frontmatter description value is a quoted scalar", () => {
    if (skillText === null) return;
    const descriptionLine = frontmatterBlock(skillText).split("\n").find((line) => line.trimStart().startsWith("description:"));
    expect(descriptionLine).toBeDefined();
    const value = descriptionLine!.slice(descriptionLine!.indexOf("description:") + "description:".length).trim();
    expect(value.startsWith('"')).toBe(true);
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

  test("allowlist: context --json local-filter surface (Sprint 095)", () => {
    if (skillText === null) return;
    expect(skillText.includes("combie context")).toBe(true);
    expect(skillText.includes("combie context <id> --json")).toBe(true);
  });

  test("allowlist: list_investigations MCP surface", () => {
    if (skillText === null) return;
    expect(skillText.includes("list_investigations")).toBe(true);
  });

  test("allowlist: investigations --json local-filter surface", () => {
    if (skillText === null) return;
    expect(skillText.includes("combie investigations")).toBe(true);
    expect(skillText.includes("--json")).toBe(true);
  });

  test("allowlist: named empty related missingContext", () => {
    if (skillText === null) return;
    expect(skillText.includes("no_known_relationships")).toBe(true);
  });

  test("allowlist: two-hop paths vs one-hop related", () => {
    if (skillText === null) return;
    expect(skillText.includes("paths")).toBe(true);
    expect(skillText.includes("not a Relationship")).toBe(true);
  });

  test("allowlist: GitHub issues family field", () => {
    if (skillText === null) return;
    expect(skillText.includes("subjectGitHubIssues")).toBe(true);
    expect(skillText.includes("GITHUB ISSUES") || skillText.includes("GitHub issue")).toBe(true);
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

  test("allowlist: task-scoped profiles (Sprint 109)", () => {
    if (skillText === null) return;
    expect(skillText.includes("--task")).toBe(true);
    expect(skillText.includes("change-review")).toBe(true);
    expect(skillText.includes("dependency-impact")).toBe(true);
    expect(skillText.includes("response-recall")).toBe(true);
  });

  test("allowlist: task-scoped availableOnDemand (Sprint 110)", () => {
    if (skillText === null) return;
    expect(skillText.includes("availableOnDemand")).toBe(true);
    expect(skillText.includes("current-investigation")).toBe(true);
    expect(skillText.includes("retained-investigation")).toBe(true);
  });

  test("allowlist: structuredResponseMemory (Sprint 111)", () => {
    if (skillText === null) return;
    expect(skillText.includes("structuredResponseMemory")).toBe(true);
  });

  test("allowlist: structured response CLI capture (Sprint 111)", () => {
    if (skillText === null) return;
    expect(skillText.includes("combie recommendation")).toBe(true);
    expect(skillText.includes("combie decision")).toBe(true);
    expect(skillText.includes("combie action")).toBe(true);
    expect(skillText.includes("combie outcome")).toBe(true);
  });

  test("allowlist: incidentPrecedentMemory (Sprint 112)", () => {
    if (skillText === null) return;
    expect(skillText.includes("incidentPrecedentMemory")).toBe(true);
  });

  test("allowlist: incident-link and precedents CLI (Sprint 112)", () => {
    if (skillText === null) return;
    expect(skillText.includes("combie incident-link")).toBe(true);
    expect(skillText.includes("combie precedents")).toBe(true);
    expect(skillText.includes("effectiveAt")).toBe(true);
    expect(skillText.includes("temporally prior")).toBe(true);
  });

  test("allowlist: responseExperience and incidentResponseExperienceMemory (Sprint 113)", () => {
    if (skillText === null) return;
    expect(skillText.includes("responseExperience")).toBe(true);
    expect(skillText.includes("incidentResponseExperienceMemory")).toBe(true);
    expect(skillText.includes("RECORDED RESPONSE EXPERIENCE")).toBe(true);
  });

  test("allowlist: response experience is not a success claim (Sprint 113)", () => {
    if (skillText === null) return;
    expect(skillText.includes("success rate")).toBe(false);
  });

  const DENYLIST = [
    "combie timeline",
    "combie memory",
    "combie ask",
    "--refresh",
    "--limit",
    "--offline",
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