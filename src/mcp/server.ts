import { McpServer } from "@modelcontextprotocol/server";
import { registerTools } from "./tools.ts";
import { VERSION } from "../cli/constants.ts";

export interface McpOptions {
  baseDir: string;
}

export function createMcpServer(options: McpOptions): McpServer {
  const server = new McpServer({ name: "combie", version: VERSION });
  registerTools(server, { baseDir: options.baseDir });
  return server;
}

let _serveMcp: ((options: McpOptions) => Promise<void>) | null = null;

export async function serveMcp(options: McpOptions): Promise<void> {
  if (!_serveMcp) {
    const mod = await import("@modelcontextprotocol/server/stdio");
    _serveMcp = async (opts) => {
      mod.serveStdio(async () => createMcpServer(opts));

      await new Promise<void>((resolve) => {
        if (!process.stdin.readable) {
          resolve();
          return;
        }
        process.stdin.on("end", resolve);
        process.stdin.on("close", resolve);
      });
    };
  }
  await _serveMcp(options);
}
