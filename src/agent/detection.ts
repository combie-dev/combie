import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
import type { AgentDetection, AgentKind } from "./types.ts";

const EXECUTABLES: Record<AgentKind, readonly string[]> = {
  claude: ["claude"],
  codex: ["codex"],
  cursor: ["cursor"],
};

export function findExecutable(
  kind: AgentKind,
  env: NodeJS.ProcessEnv = process.env,
): AgentDetection {
  const pathValue = env.PATH ?? "";
  for (const dir of pathValue.split(delimiter)) {
    if (dir.length === 0) {
      continue;
    }
    for (const name of EXECUTABLES[kind]) {
      const candidate = join(dir, name);
      try {
        accessSync(candidate, constants.X_OK);
        return { detected: true, executablePath: candidate };
      } catch {
        // not this candidate
      }
    }
  }
  return { detected: false, executablePath: null };
}
