export function isPlainSectionRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Keep sibling section keys (packageRecord, intro, blocks) unless the caller replaces them. */
export function mergeGeneratedInterpretationSections(existing: unknown, incoming: unknown) {
  if (incoming === null || Array.isArray(incoming) || !isPlainSectionRecord(incoming)) {
    return incoming;
  }
  if (!isPlainSectionRecord(existing)) {
    return incoming;
  }
  return { ...existing, ...incoming };
}
