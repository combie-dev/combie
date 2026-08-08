import type { Resource } from "./resource.ts";

export interface ChangeField {
  path: string;
  before: unknown;
  after: unknown;
}

export interface Change {
  id: string;
  resourceId: string;
  kind: "updated";
  observedAt: string;
  fields: ChangeField[];
}

export interface ChangeObservation {
  id: string;
  observedAt: string;
}

export function createChange(input: Change): Change {
  if (!input.id || !input.resourceId || !input.observedAt) {
    throw new Error(
      "Change identity, Resource identity, and observation time are required.",
    );
  }
  if (input.fields.length === 0) {
    throw new Error("An updated Change must contain at least one changed field.");
  }
  return input;
}

/**
 * Compare provider-normalized facts. Resource identity and the top-level
 * createdAt/updatedAt synchronization timestamps are deliberately excluded.
 * Objects compare by key; arrays remain atomic and order-sensitive because
 * providers canonicalize only arrays whose normalized contract is set-like.
 */
export function diffResource(
  before: Resource,
  after: Resource,
  observation: ChangeObservation,
): Change | null {
  if (before.id !== after.id) {
    throw new Error(
      "Cannot compare Resources with different stable identities.",
    );
  }

  const fields: ChangeField[] = [];
  collectDifferences("name", before.name, after.name, fields);
  collectDifferences("metadata", before.metadata, after.metadata, fields);
  fields.sort((a, b) => compareText(a.path, b.path));

  if (fields.length === 0) return null;
  return createChange({
    ...observation,
    resourceId: after.id,
    kind: "updated",
    fields,
  });
}

function collectDifferences(
  path: string,
  before: unknown,
  after: unknown,
  fields: ChangeField[],
): void {
  if (Object.is(before, after)) return;

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of [...keys].sort()) {
      collectDifferences(
        `${path}.${key}`,
        before[key],
        after[key],
        fields,
      );
    }
    return;
  }

  if (arraysEqual(before, after)) return;
  fields.push({ path, before, after });
}

function arraysEqual(before: unknown, after: unknown): boolean {
  if (!Array.isArray(before) || !Array.isArray(after)) return false;
  if (before.length !== after.length) return false;
  return before.every((value, index) => valuesEqual(value, after[index]));
}

function valuesEqual(before: unknown, after: unknown): boolean {
  if (Object.is(before, after)) return true;
  if (Array.isArray(before) && Array.isArray(after)) {
    return arraysEqual(before, after);
  }
  if (isPlainObject(before) && isPlainObject(after)) {
    const beforeKeys = Object.keys(before).sort();
    const afterKeys = Object.keys(after).sort();
    return (
      beforeKeys.length === afterKeys.length &&
      beforeKeys.every(
        (key, index) =>
          key === afterKeys[index] && valuesEqual(before[key], after[key]),
      )
    );
  }
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
