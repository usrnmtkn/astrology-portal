import { isExplicitRomanticRelationship, relationshipContextStorageKey } from "../services/relationshipContext";

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/** Read complete saved fields; Studio and the reader use the same variant schema. */
export function compositeRelationshipCopy(sections: unknown, type: string) {
  const variants = record(record(sections)?.byRelationshipType);
  const value = variants?.[type];
  if (typeof value === "string") return value.trim() ? value : "";
  const variant = record(value);
  if (!variant) return "";
  for (const field of ["body", "summary", "copy"]) {
    if (typeof variant[field] === "string" && variant[field].trim()) return variant[field];
  }
  // Preserve the older structured records without adding labels or punctuation.
  return ["experience", "advice", "astro"].map(field => variant[field])
    .filter((text): text is string => typeof text === "string" && Boolean(text.trim())).join("\n\n");
}

export function compositeReaderRelationshipCopy(sections: unknown, relationshipType?: string | null) {
  if (!relationshipType?.trim()) return "";
  const type = relationshipContextStorageKey(relationshipType);
  if (type === "romantic" && !isExplicitRomanticRelationship(relationshipType)) return "";
  return compositeRelationshipCopy(sections, type);
}
