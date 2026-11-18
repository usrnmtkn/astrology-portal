const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const studioPackageRecord = (value: unknown): Record<string, unknown> | null => object(value) ? value : null;
export const studioPackageObject = (value: unknown): Record<string, unknown> => studioPackageRecord(value) ?? {};

// Missing properties inherit. Present values, including empty objects and
// arrays, are replacements. A composition replaces its complete dependency set.
export function mergeStudioPackagePatch(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(patch)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) continue;
    result[key] = key !== "ingress" && object(value) && object(base[key]) && Object.keys(value).length
      ? mergeStudioPackagePatch(base[key], value) : structuredClone(value);
  }
  return result;
}
