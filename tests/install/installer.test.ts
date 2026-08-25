import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

const PROJECT_ROOT = dirname(dirname(import.meta.dir));
const ROOT_INSTALL = join(PROJECT_ROOT, "install.sh");
const WORKER_INSTALL = join(PROJECT_ROOT, "src/install-worker/install.sh");

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("installer scripts", () => {
  test("root and worker install.sh copies are byte-identical", () => {
    expect(sha256(ROOT_INSTALL)).toBe(sha256(WORKER_INSTALL));
  });

  test("PATH hint names rc-files and does not instruct source ~/.profile", () => {
    const script = readFileSync(ROOT_INSTALL, "utf8");
    expect(script).toContain('export PATH="%s:$PATH"');
    expect(script).toContain(
      "To make this permanent, add that line to ~/.bashrc, ~/.zshrc, or ~/.profile.",
    );
    expect(script).not.toContain("source ~/.profile");
  });
});
