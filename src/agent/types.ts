export const AGENT_KINDS = ["claude", "codex", "cursor"] as const;

export type AgentKind = (typeof AGENT_KINDS)[number];

export type AgentStatus =
  | "not_detected"
  | "available"
  | "configured"
  | "stale"
  | "invalid";

export interface AgentDetection {
  detected: boolean;
  executablePath: string | null;
}

export interface McpEntry {
  command: string;
  args: string[];
  env: Record<string, string>;
  cwd?: string;
}

export interface AgentStatusInfo {
  kind: AgentKind;
  label: string;
  detected: boolean;
  status: AgentStatus;
  configPath: string;
  detail: string;
}

export interface AgentSetupResult {
  kind: AgentKind;
  label: string;
  configPath: string;
  changed: boolean;
  message: string;
}

export interface AgentRemoveResult {
  kind: AgentKind;
  label: string;
  configPath: string;
  changed: boolean;
  message: string;
}
