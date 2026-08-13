import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { CombieError } from "../app/errors.ts";

export function homeDir(): string {
  return process.env.HOME ?? homedir();
}

export function unsafeConfigError(path: string, reason: string): CombieError {
  return new CombieError(
    "AGENT_CONFIG_UNSAFE",
    `Refusing to modify ${path}: ${reason}\nFix it manually, then re-run the agent command.`,
  );
}

function skipWhitespace(text: string, i: number): number {
  while (i < text.length && /\s/.test(text[i]!)) {
    i++;
  }
  return i;
}

function scanStringEnd(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length) {
    const c = text[i]!;
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === '"') {
      return i + 1;
    }
    i++;
  }
  return -1;
}

export function scanJsonValueEnd(text: string, start: number): number {
  const c = text[start]!;
  if (c === '"') {
    return scanStringEnd(text, start);
  }
  if (c === "{" || c === "[") {
    const open = c;
    const close = c === "{" ? "}" : "]";
    let depth = 0;
    let i = start;
    while (i < text.length) {
      const ch = text[i]!;
      if (ch === '"') {
        const end = scanStringEnd(text, i);
        if (end < 0) {
          return -1;
        }
        i = end;
        continue;
      }
      if (ch === open) {
        depth++;
      } else if (ch === close) {
        depth--;
        if (depth === 0) {
          return i + 1;
        }
      }
      i++;
    }
    return -1;
  }
  let i = start;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === "," || ch === "}" || ch === "]" || /\s/.test(ch)) {
      return i;
    }
    i++;
  }
  return i;
}

export interface TopLevelMember {
  keyStart: number;
  valueStart: number;
  valueEnd: number;
}

export function findTopLevelMember(
  text: string,
  key: string,
): TopLevelMember | null {
  let i = skipWhitespace(text, 0);
  if (text[i] !== "{") {
    return null;
  }
  let depth = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === '"') {
      const end = scanStringEnd(text, i);
      if (end < 0) {
        return null;
      }
      if (depth === 1) {
        const j = skipWhitespace(text, end);
        if (text[j] === ":" && text.slice(i + 1, end - 1) === key) {
          const valueStart = skipWhitespace(text, j + 1);
          const valueEnd = scanJsonValueEnd(text, valueStart);
          if (valueEnd < 0) {
            return null;
          }
          return { keyStart: i, valueStart, valueEnd };
        }
      }
      i = end;
      continue;
    }
    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
    }
    i++;
  }
  return null;
}

function findMatchingClose(
  text: string,
  openIndex: number,
  open: string,
  close: string,
): number {
  let depth = 0;
  let i = openIndex;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === '"') {
      const end = scanStringEnd(text, i);
      if (end < 0) {
        return -1;
      }
      i = end;
      continue;
    }
    if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
    i++;
  }
  return -1;
}

function reindentJson(json: string, baseIndent: string): string {
  const lines = json.split("\n");
  if (lines.length <= 1) {
    return json;
  }
  return lines
    .map((line, i) => (i === 0 ? line : `${baseIndent}  ${line}`))
    .join("\n");
}

export function setTopLevelMemberRaw(
  text: string,
  key: string,
  value: unknown,
): string {
  const valueJson = JSON.stringify(value, null, 2);
  const existing = findTopLevelMember(text, key);
  if (existing) {
    let lineStart = existing.keyStart;
    while (lineStart > 0 && text[lineStart - 1] !== "\n") {
      lineStart--;
    }
    const rawIndent = text.slice(lineStart, existing.keyStart);
    const memberIndent = /^\s*$/.test(rawIndent) ? rawIndent : "";
    return (
      text.slice(0, existing.valueStart) +
      reindentJson(valueJson, memberIndent) +
      text.slice(existing.valueEnd)
    );
  }
  const open = skipWhitespace(text, 0);
  const close = findMatchingClose(text, open, "{", "}");
  const member = `"${key}": ${reindentJson(valueJson, "  ")}`;
  if (close < 0) {
    return text;
  }
  const between = text.slice(open + 1, close);
  if (skipWhitespace(between, 0) >= between.length) {
    return `${text.slice(0, open + 1)}\n  ${member}\n${text.slice(close)}`;
  }
  const before = text.slice(0, close).replace(/\s+$/, "");
  return `${before},\n  ${member}\n${text.slice(close)}`;
}

export function deleteTopLevelMemberRaw(text: string, key: string): string {
  const member = findTopLevelMember(text, key);
  if (!member) {
    return text;
  }
  let from = member.keyStart;
  while (from > 0 && /\s/.test(text[from - 1]!)) {
    from--;
  }
  if (text[from - 1] === ",") {
    from--;
    while (from > 0 && /\s/.test(text[from - 1]!)) {
      from--;
    }
    return text.slice(0, from) + text.slice(member.valueEnd);
  }
  let to = member.valueEnd;
  while (to < text.length && /\s/.test(text[to]!)) {
    to++;
  }
  if (text[to] === ",") {
    to++;
    while (to < text.length && /\s/.test(text[to]!)) {
      to++;
    }
    return text.slice(0, member.keyStart) + text.slice(to);
  }
  const next = text.slice(0, member.keyStart) + text.slice(member.valueEnd);
  return /^\s*\{\s*\}\s*$/.test(next) ? next.replace(/\{\s*\}/, "{}") : next;
}

export class JsonConfigFile {
  constructor(readonly path: string) {}

  exists(): boolean {
    return existsSync(this.path);
  }

  read(): string {
    return readFileSync(this.path, "utf8");
  }

  private write(text: string): void {
    let mode: number | undefined;
    try {
      mode = statSync(this.path).mode;
    } catch {
      mode = undefined;
    }
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, text, {
      mode: mode === undefined ? 0o644 : mode & 0o777,
    });
  }

  private assertEditable(): string {
    if (!this.exists()) {
      return "";
    }
    const text = this.read();
    const first = skipWhitespace(text, 0);
    if (first >= text.length) {
      return text;
    }
    if (text[first] !== "{") {
      throw unsafeConfigError(this.path, "it is not a JSON object");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw unsafeConfigError(this.path, "it contains invalid JSON");
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw unsafeConfigError(this.path, "it is not a JSON object");
    }
    return text;
  }

  getTopLevelMember(key: string): unknown | null {
    if (!this.exists()) {
      return null;
    }
    const text = this.assertEditable();
    const member = findTopLevelMember(text, key);
    if (!member) {
      return null;
    }
    try {
      return JSON.parse(text.slice(member.valueStart, member.valueEnd));
    } catch {
      throw unsafeConfigError(this.path, `"${key}" is not valid JSON`);
    }
  }

  setTopLevelMember(key: string, value: unknown): void {
    const text = this.assertEditable();
    if (skipWhitespace(text, 0) >= text.length) {
      this.write(`${JSON.stringify({ [key]: value }, null, 2)}\n`);
      return;
    }
    this.write(setTopLevelMemberRaw(text, key, value));
  }

  deleteTopLevelMember(key: string): void {
    const text = this.assertEditable();
    if (skipWhitespace(text, 0) >= text.length) {
      return;
    }
    this.write(deleteTopLevelMemberRaw(text, key));
  }
}

function tomlSectionStart(text: string, header: string): number {
  let i = 0;
  while (i <= text.length) {
    const lineEnd = text.indexOf("\n", i);
    const end = lineEnd < 0 ? text.length : lineEnd;
    if (text.slice(i, end).trim() === header) {
      return i;
    }
    if (lineEnd < 0) {
      return -1;
    }
    i = lineEnd + 1;
  }
  return -1;
}

function tomlSectionRange(
  text: string,
  header: string,
): { start: number; end: number } | null {
  const start = tomlSectionStart(text, header);
  if (start < 0) {
    return null;
  }
  let cursor = start;
  while (cursor < text.length) {
    const lineEnd = text.indexOf("\n", cursor);
    if (lineEnd < 0) {
      return { start, end: text.length };
    }
    const next = lineEnd + 1;
    const nextLineEnd = text.indexOf("\n", next);
    const end = nextLineEnd < 0 ? text.length : nextLineEnd;
    if (/^\s*\[/.test(text.slice(next, end))) {
      return { start, end: next };
    }
    cursor = next;
  }
  return { start, end: text.length };
}

export function splitTomlTopLevel(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]!;
    if (inString) {
      current += ch;
      if (ch === "\\") {
        if (i + 1 < inner.length) {
          current += inner[i + 1]!;
          i++;
        }
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      current += ch;
    } else if (ch === "{" || ch === "[") {
      depth++;
      current += ch;
    } else if (ch === "}" || ch === "]") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) {
    parts.push(current);
  }
  return parts;
}

function unquoteToml(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return value;
}

export function parseTomlValue(raw: string): unknown {
  const value = raw.trim();
  if (value.startsWith('"')) {
    return unquoteToml(value);
  }
  if (value.startsWith("[")) {
    const inner = value.slice(1, value.lastIndexOf("]"));
    return splitTomlTopLevel(inner).map((part) => parseTomlValue(part));
  }
  if (value.startsWith("{")) {
    const inner = value.slice(1, value.lastIndexOf("}"));
    const object: Record<string, unknown> = {};
    for (const part of splitTomlTopLevel(inner)) {
      const eq = part.indexOf("=");
      if (eq < 0) {
        continue;
      }
      object[unquoteToml(part.slice(0, eq))] = parseTomlValue(part.slice(eq + 1));
    }
    return object;
  }
  return value;
}

export function tomlString(value: string): string {
  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")}"`;
}

export function parseTomlSectionLines(
  text: string,
  header: string,
): Record<string, unknown> {
  const range = tomlSectionRange(text, header);
  if (!range) {
    return {};
  }
  const body = text.slice(range.start + header.length, range.end);
  const result: Record<string, unknown> = {};
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#") || line.startsWith("[")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq < 0) {
      continue;
    }
    result[line.slice(0, eq).trim()] = parseTomlValue(line.slice(eq + 1));
  }
  return result;
}

export class TomlConfigFile {
  constructor(readonly path: string) {}

  exists(): boolean {
    return existsSync(this.path);
  }

  read(): string {
    return readFileSync(this.path, "utf8");
  }

  private write(text: string): void {
    let mode: number | undefined;
    try {
      mode = statSync(this.path).mode;
    } catch {
      mode = undefined;
    }
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, text, {
      mode: mode === undefined ? 0o644 : mode & 0o777,
    });
  }

  hasSection(header: string): boolean {
    if (!this.exists()) {
      return false;
    }
    return tomlSectionRange(this.read(), header) !== null;
  }

  setSection(header: string, body: string[]): void {
    const text = this.exists() ? this.read() : "";
    const block = `${header}\n${body.join("\n")}`;
    const range = tomlSectionRange(text, header);
    let next: string;
    if (range) {
      const after = text.slice(range.end).replace(/^\n+/, "");
      const before = text.slice(0, range.start).replace(/\s+$/, "");
      if (after.length === 0) {
        next = before.length > 0 ? `${before}\n${block}\n` : `${block}\n`;
      } else {
        next = `${before}\n${block}\n\n${after}`;
      }
    } else {
      const base =
        text.length === 0 ? "" : text.endsWith("\n") ? text : `${text}\n`;
      const prefix = base.length === 0 || base.endsWith("\n\n") ? base : `${base}\n`;
      next = `${prefix}${block}\n`;
    }
    this.write(next);
  }

  deleteSection(header: string): boolean {
    if (!this.exists()) {
      return false;
    }
    const text = this.read();
    const range = tomlSectionRange(text, header);
    if (!range) {
      return false;
    }
    const after = text.slice(range.end).replace(/^\n+/, "");
    const before = text.slice(0, range.start).replace(/\s+$/, "");
    if (after.length === 0) {
      this.write(before.length > 0 ? `${before}\n` : "");
    } else if (before.length === 0) {
      this.write(after);
    } else {
      this.write(`${before}\n\n${after}`);
    }
    return true;
  }
}
