import {
  claudeConfigPath,
  readClaudeEntry,
  removeClaude,
  setupClaude,
} from "./claude.ts";
import {
  codexConfigPath,
  readCodexEntry,
  removeCodex,
  setupCodex,
} from "./codex.ts";
import {
  cursorConfigPath,
  readCursorEntry,
  removeCursor,
  setupCursor,
} from "./cursor.ts";
import type { AgentKind, McpEntry } from "./types.ts";

export interface AgentBackend {
  kind: AgentKind;
  label: string;
  configPath(): string;
  readEntry(): McpEntry | null;
  writeEntry(baseDir: string): boolean;
  removeEntry(): boolean;
}

const BACKENDS: AgentBackend[] = [
  {
    kind: "claude",
    label: "Claude Code",
    configPath: claudeConfigPath,
    readEntry: readClaudeEntry,
    writeEntry: setupClaude,
    removeEntry: removeClaude,
  },
  {
    kind: "codex",
    label: "Codex",
    configPath: codexConfigPath,
    readEntry: readCodexEntry,
    writeEntry: setupCodex,
    removeEntry: removeCodex,
  },
  {
    kind: "cursor",
    label: "Cursor",
    configPath: cursorConfigPath,
    readEntry: readCursorEntry,
    writeEntry: setupCursor,
    removeEntry: removeCursor,
  },
];

export function agentBackends(): AgentBackend[] {
  return [...BACKENDS];
}

export function agentBackend(kind: AgentKind): AgentBackend {
  const backend = BACKENDS.find((b) => b.kind === kind);
  if (!backend) {
    throw new Error(`Unreachable: unknown agent kind ${kind}`);
  }
  return backend;
}
