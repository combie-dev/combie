import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { credentialsPath } from "./paths.ts";

type CredentialEntry = { token: string };
type CredentialsFile = Record<string, CredentialEntry>;

/**
 * File-backed credential store. Credentials live outside the domain DB.
 * Tokens are never logged by this module.
 */
export class CredentialStore {
  private readonly path: string;

  constructor(baseDir: string) {
    this.path = credentialsPath(baseDir);
  }

  setCredential(provider: string, token: string): void {
    const data = this.read();
    data[provider] = { token };
    this.write(data);
  }

  getCredential(provider: string): string | null {
    const entry = this.read()[provider];
    return entry?.token ?? null;
  }

  hasCredential(provider: string): boolean {
    return this.getCredential(provider) !== null;
  }

  deleteCredential(provider: string): void {
    const data = this.read();
    if (!(provider in data)) {
      return;
    }
    delete data[provider];
    if (Object.keys(data).length === 0) {
      if (existsSync(this.path)) {
        unlinkSync(this.path);
      }
      return;
    }
    this.write(data);
  }

  private read(): CredentialsFile {
    if (!existsSync(this.path)) {
      return {};
    }
    const raw = readFileSync(this.path, "utf8");
    if (!raw.trim()) {
      return {};
    }
    const parsed = JSON.parse(raw) as CredentialsFile;
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  private write(data: CredentialsFile): void {
    const dir = dirname(this.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    // Write with restrictive mode; chmod after write for overwrite cases.
    writeFileSync(this.path, JSON.stringify(data, null, 2) + "\n", {
      encoding: "utf8",
      mode: 0o600,
    });
    if (process.platform !== "win32") {
      chmodSync(this.path, 0o600);
    }
  }
}

/** Alias used by app layer (connect/sync). */
export { CredentialStore as CredentialsStore };
