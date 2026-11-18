type CopyRecord = Record<string, unknown>;

const record = (value: unknown): value is CopyRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function contentStudioCopyChanges(before: CopyRecord, after: CopyRecord) {
  return Object.fromEntries(Object.keys({ ...before, ...after })
    .filter(key => !equal(before[key], after[key]))
    .map(key => [key, after[key]]));
}

// Three-way merge: retain remote metadata and disjoint edits; never overwrite a
// competing change to the same leaf. Callers supply the editor-open baseline.
export function recoverContentStudioCopy(baseline: CopyRecord, edited: CopyRecord, saved: CopyRecord): CopyRecord {
  const conflicts: string[] = [];
  function merge(base: CopyRecord, local: CopyRecord, remote: CopyRecord, prefix = ""): CopyRecord {
    const result = structuredClone(remote);
    for (const [key, value] of Object.entries(contentStudioCopyChanges(base, local))) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (record(base[key]) && record(value) && record(remote[key])) {
        result[key] = merge(base[key], value, remote[key], path);
      } else if (equal(remote[key], base[key]) || equal(remote[key], value)) {
        if (value === undefined) delete result[key];
        else result[key] = structuredClone(value);
      } else conflicts.push(path);
    }
    return result;
  }
  const result = merge(baseline, edited, saved);
  if (conflicts.length) throw new Error(`Your edits are still here. The saved copy also changed in ${conflicts.join(", ")}. Review the saved version before replacing that text.`);
  return result;
}
