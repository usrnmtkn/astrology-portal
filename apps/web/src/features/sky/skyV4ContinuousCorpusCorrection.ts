import correctionManifest from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1.json";
import correctionChunk1 from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-1.json";
import correctionChunk2 from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-2.json";
import correctionChunk3 from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-3.json";
import correctionChunk4 from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-4.json";

const continuousPlanets = ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"] as const;
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;

type CorrectionRecord = {
  ContentKey: string;
  TLDRWhat: string;
  TLDRTakeaway: string;
  PlacementArticle?: string;
  Fallback: { hook: string; lived: string; turn: string };
};
type CorrectionManifest = {
  schema: string;
  parent_canonical_package_version: string;
  parent_canonical_json_sha256: string;
  review_status: string;
  owner_approved: boolean;
  serving_enabled: boolean;
  expected_records: number;
  approval_id: string;
  release_id: string;
};
type CorrectionChunk = { schema: string; chunk: number; record_count: number; records: CorrectionRecord[] };
type CorrectionSource = CorrectionManifest & { records: CorrectionRecord[] };

const bundledChunks = [correctionChunk1, correctionChunk2, correctionChunk3, correctionChunk4] as CorrectionChunk[];

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function bundledSource(): CorrectionSource {
  return { ...(correctionManifest as CorrectionManifest), records: bundledChunks.flatMap((chunk) => chunk.records) };
}

function releasedPackage(source: CorrectionSource) {
  if (
    source.schema !== "tldrastro-sky-v4-continuous-corpus-correction/v1"
    || source.review_status !== "approved"
    || source.owner_approved !== true
    || source.serving_enabled !== true
    || source.expected_records !== 120
    || source.records.length !== 120
    || bundledChunks.some((chunk, index) => (
      chunk.schema !== "tldrastro-sky-v4-continuous-corpus-correction/chunk-v1"
      || chunk.chunk !== index + 1
      || chunk.record_count !== chunk.records.length
    ))
  ) return null;
  const expectedKeys = new Set(continuousPlanets.flatMap((planet) => signs.map((sign) => `sky-placement/article/${planet}/${sign}`)));
  const actualKeys = new Set(source.records.map((item) => item.ContentKey));
  if (actualKeys.size !== 120 || [...expectedKeys].some((key) => !actualKeys.has(key))) return null;
  if (source.records.some((item) => (
    !item.TLDRWhat.trim()
    || !item.TLDRTakeaway.trim()
    || !item.Fallback?.hook?.trim()
    || !item.Fallback?.lived?.trim()
    || !item.Fallback?.turn?.trim()
  ))) return null;
  return source;
}

export function applySkyV4ContinuousCorpusCorrection(corpus: unknown, source: CorrectionSource = bundledSource()) {
  const released = releasedPackage(source);
  if (!released) return corpus;
  const next = structuredClone(record(corpus));
  const content = record(next.content);
  const continuous = Array.isArray(content.continuous)
    ? content.continuous.map((item) => structuredClone(record(item)))
    : [];
  const corrections = new Map(released.records.map((item) => [item.ContentKey, item]));
  for (const article of continuous) {
    const correction = corrections.get(String(article.contentKey ?? ""));
    if (!correction) continue;
    article.tldrWhat = correction.TLDRWhat;
    article.tldrTakeaway = correction.TLDRTakeaway;
    if (correction.PlacementArticle?.trim()) article.placementArticle = correction.PlacementArticle;
    article.fallback = structuredClone(correction.Fallback);
    article.editorialStatus = "owner_approved_corpus_correction_2026_09_01";
    article.implementationStatus = "serving_via_owner_approved_correction_layer";
    article.ownerApprovedForV4Role = true;
    article.qa = "PASS_OWNER_APPROVED_CORPUS_CORRECTION";
  }
  content.continuous = continuous;
  next.content = content;
  next.activeContinuousCorrection = {
    schema: released.schema,
    approvalId: released.approval_id,
    releaseId: released.release_id,
    expectedRecords: released.expected_records
  };
  return next;
}

export function skyV4ContinuousCorrectionReleaseState() {
  const source = bundledSource();
  return {
    schema: source.schema,
    parentCanonicalPackageVersion: source.parent_canonical_package_version,
    parentCanonicalJsonSha256: source.parent_canonical_json_sha256,
    expectedRecords: source.expected_records,
    recordCount: source.records.length,
    ownerApproved: source.owner_approved === true,
    servingEnabled: source.serving_enabled === true,
    reviewStatus: source.review_status,
    approvalId: source.approval_id,
    releaseId: source.release_id
  };
}
