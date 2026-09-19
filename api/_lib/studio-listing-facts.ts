// Studio lists are served from table columns, without a row's documents. A row's group, title, and
// review-queue membership are decided from a few small facts inside sections, source_snapshot, and
// facts, so those facts travel with the list while the copy stays behind.
//
// The same key lists are computed in SQL by public.generated_interpretations_studio_facts and stored
// in the studio_facts column. scripts/test-studio-listing-facts.mjs fails when the two disagree.

export const listingSourceKeys = [
  "sourceType",
  "type",
  "sourcePackage",
  "contentType",
  "content_type",
  "contentRole",
  "content_role",
  "sourceRole",
  "source_role",
  "role",
  "bucket",
  "targetContentFamily",
  "contentFamily",
  "contentSystem",
  "review_status",
  "reviewStatus",
  "lane",
  "sourceFile"
] as const;

export const listingPackageRecordKeys = [
  "contentKey",
  "content_role",
  "render_policy",
  "studio_review_category",
  "review_status",
  "owner_approved",
  "reader_only",
  "serving_enabled"
] as const;

function objectOrNull(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function pickScalars(source: Record<string, unknown> | null, keys: readonly string[]) {
  if (!source) return null;
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    const value = source[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") picked[key] = value;
  }
  return Object.keys(picked).length ? picked : null;
}

export type StudioListingFacts = {
  source?: Record<string, unknown>;
  packageRecord?: Record<string, unknown>;
  fallbackArchitectureV3?: true;
};

// The projection a full row would store. Test fixtures use this to answer the way the column does.
export function studioListingFacts(row: {
  sections?: unknown;
  source_snapshot?: unknown;
  facts?: unknown;
}): StudioListingFacts {
  const snapshot = objectOrNull(row.source_snapshot);
  const source = pickScalars(snapshot, listingSourceKeys) ?? {};
  const flags = snapshot?.flags;
  if (Array.isArray(flags)) source.flags = flags;
  const packageRecord = pickScalars(objectOrNull(objectOrNull(row.sections)?.packageRecord), listingPackageRecordKeys);
  const facts: StudioListingFacts = {};
  if (Object.keys(source).length) facts.source = source;
  if (packageRecord) facts.packageRecord = packageRecord;
  if (objectOrNull(row.facts)?.fallbackArchitectureV3 === true) facts.fallbackArchitectureV3 = true;
  return facts;
}

// A list row: the listing facts in the shape the Studio already reads, and no saved copy.
export function studioListingRow(row: Record<string, unknown>, facts: StudioListingFacts) {
  const { studio_facts: _stored, ...rest } = row;
  return {
    ...rest,
    body: null,
    summary: null,
    sections: facts.packageRecord ? { packageRecord: facts.packageRecord } : null,
    facts: facts.fallbackArchitectureV3 ? { fallbackArchitectureV3: true } : null,
    source_snapshot: facts.source ?? null,
    inventory_only: true
  };
}
