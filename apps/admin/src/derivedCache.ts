/**
 * Small memo helpers for pure row derivations.
 *
 * The dashboard derives titles, type labels and search text for every row on
 * every load page and inside sort comparators. With ~9,000 rows that work was
 * repeated hundreds of thousands of times per load. Row objects are immutable
 * once they arrive (a save replaces the object), so a WeakMap keyed by the row
 * makes each derivation run once per row object. String-keyed derivations
 * (content-key parsers) get a bounded Map.
 */

export function memoByObject<R extends object, T>(compute: (row: R) => T): (row: R) => T {
  const cache = new WeakMap<R, T>();
  return (row: R) => {
    if (cache.has(row)) return cache.get(row) as T;
    const value = compute(row);
    cache.set(row, value);
    return value;
  };
}

export function memoByString<T>(compute: (key: string) => T, limit = 50_000): (key: string) => T {
  const cache = new Map<string, T>();
  return (key: string) => {
    if (cache.has(key)) return cache.get(key) as T;
    const value = compute(key);
    if (cache.size >= limit) cache.clear();
    cache.set(key, value);
    return value;
  };
}

/** One collator for every natural-order sort; `localeCompare` with options builds one per call. */
export const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
