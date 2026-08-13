import { JsonConfigFile, unsafeConfigError } from "./config.ts";
import type { McpInvocation } from "./invocation.ts";
import type { McpEntry } from "./types.ts";

export function readJsonMcpEntry(
  file: JsonConfigFile,
  serverName: string,
): McpEntry | null {
  if (!file.exists()) {
    return null;
  }
  const servers = file.getTopLevelMember("mcpServers");
  if (servers === null) {
    return null;
  }
  if (typeof servers !== "object" || Array.isArray(servers)) {
    throw unsafeConfigError(file.path, '"mcpServers" is not an object');
  }
  const entry = (servers as Record<string, unknown>)[serverName];
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    return null;
  }
  const record = entry as Record<string, unknown>;
  if (typeof record.command !== "string" || !Array.isArray(record.args)) {
    return null;
  }
  return {
    command: record.command,
    args: record.args.filter((a): a is string => typeof a === "string"),
    env:
      typeof record.env === "object" &&
      record.env !== null &&
      !Array.isArray(record.env)
        ? (record.env as Record<string, string>)
        : {},
    cwd: typeof record.cwd === "string" ? record.cwd : undefined,
  };
}

export function writeJsonMcpEntry(
  file: JsonConfigFile,
  serverName: string,
  invocation: McpInvocation,
  extra: Record<string, unknown>,
): boolean {
  const servers = file.exists() ? file.getTopLevelMember("mcpServers") : null;
  let next: Record<string, unknown>;
  if (typeof servers === "object" && servers !== null && !Array.isArray(servers)) {
    next = { ...(servers as Record<string, unknown>) };
  } else if (servers === null) {
    next = {};
  } else {
    throw unsafeConfigError(file.path, '"mcpServers" is not an object');
  }
  const existing = next[serverName];
  const entry =
    typeof existing === "object" && existing !== null && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  entry.command = invocation.command;
  entry.args = invocation.args;
  entry.env = invocation.env;
  for (const [key, value] of Object.entries(extra)) {
    entry[key] = value;
  }
  next[serverName] = entry;
  file.setTopLevelMember("mcpServers", next);
  return true;
}

export function deleteJsonMcpEntry(
  file: JsonConfigFile,
  serverName: string,
): boolean {
  if (!file.exists()) {
    return false;
  }
  const servers = file.getTopLevelMember("mcpServers");
  if (servers === null) {
    return false;
  }
  if (typeof servers !== "object" || Array.isArray(servers)) {
    throw unsafeConfigError(file.path, '"mcpServers" is not an object');
  }
  const next = { ...(servers as Record<string, unknown>) };
  if (!(serverName in next)) {
    return false;
  }
  delete next[serverName];
  if (Object.keys(next).length === 0) {
    file.deleteTopLevelMember("mcpServers");
  } else {
    file.setTopLevelMember("mcpServers", next);
  }
  return true;
}
