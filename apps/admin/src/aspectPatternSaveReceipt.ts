// JSONB object key order is not a saved-copy difference. Array order and every
// character of the author's text remain significant.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

export function sameAspectPatternContent(saved: unknown, submitted: unknown) {
  return JSON.stringify(canonical(saved)) === JSON.stringify(canonical(submitted));
}
