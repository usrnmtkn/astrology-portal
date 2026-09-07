type CopyRecord = Record<string, unknown>;

const record = (value: unknown): value is CopyRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Three-way merge: retain remote metadata and disjoint edits; never overwrite a
// competing change to the same leaf. Callers supply the editor-open baseline.
export function recoverContentStudioCopy(baseline: CopyRecord, edited: CopyRecord, saved: CopyRecord): CopyRecord {
  const conflicts: string[] = [];
  function merge(base: CopyRecord, local: CopyRecord, remote: CopyRecord, prefix = ""): CopyRecord {
    const result = structuredClone(remote);
    for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
      if (equal(base[key], local[key])) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      if (record(base[key]) && record(local[key]) && record(remote[key])) {
        result[key] = merge(base[key], local[key], remote[key], path);
      } else if (equal(remote[key], base[key]) || equal(remote[key], local[key])) {
        if (local[key] === undefined) delete result[key];
        else result[key] = structuredClone(local[key]);
      } else conflicts.push(path);
    }
    return result;
  }
  const result = merge(baseline, edited, saved);
  if (conflicts.length) throw new Error(`Your edits are still here. The saved copy also changed in ${conflicts.join(", ")}. Review the saved version before replacing that text.`);
  return result;
}
