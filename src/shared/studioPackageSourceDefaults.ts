// These are legacy aliases for the primary copy. Friend copy is independent.
const aliases = ["body", "body_you", "Body", "text"];

export function studioPackageSourceDefaults(base: Record<string, unknown>, ...saved: Record<string, unknown>[]): Record<string, unknown> {
  const present = new Set(saved.flatMap(record => Object.keys(record)));
  const explicit = aliases.filter(field => present.has(field));
  const defaults = { ...base };
  for (const field of aliases) {
    if (explicit.some(other => other !== field)) delete defaults[field];
  }
  return defaults;
}
