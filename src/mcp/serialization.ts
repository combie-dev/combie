/**
 * JSON-safe serialization for MCP adapter boundary.
 * Normalizes domain objects to plain JSON without date/bigint/Map/Set types.
 * Never mutates core DTO semantics — only converts types at the boundary.
 */

function safeValue(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Map) return safeValue(Object.fromEntries(value));
  if (value instanceof Set) return safeValue([...value]);
  if (Array.isArray(value)) return value.map(safeValue);
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      result[key] = safeValue((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

export function safeJson(value: unknown): Record<string, unknown> | unknown[] | string | number | boolean | null {
  return safeValue(value) as Record<string, unknown> | unknown[] | string | number | boolean | null;
}
