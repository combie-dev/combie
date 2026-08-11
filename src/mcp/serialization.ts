/**
 * JSON-safe serialization for MCP adapter boundary.
 * Normalizes domain objects to plain JSON without date/bigint/Map/Set types.
 * Never mutates core DTO semantics — only converts types at the boundary.
 */

function safeValue(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
  depth: number = 0,
): unknown {
  if (depth > 100) return "[max depth]";
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Map) return safeValue(Object.fromEntries(value), seen, depth + 1);
  if (value instanceof Set) return safeValue([...value], seen, depth + 1);
  if (Array.isArray(value)) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    return value.map((v) => safeValue(v, seen, depth + 1));
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") {
    if (seen.has(value as object)) return "[Circular]";
    seen.add(value as object);
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      result[key] = safeValue(
        (value as Record<string, unknown>)[key],
        seen,
        depth + 1,
      );
    }
    return result;
  }
  return value;
}

export function safeJson(value: unknown): Record<string, unknown> | unknown[] | string | number | boolean | null {
  return safeValue(value) as Record<string, unknown> | unknown[] | string | number | boolean | null;
}
