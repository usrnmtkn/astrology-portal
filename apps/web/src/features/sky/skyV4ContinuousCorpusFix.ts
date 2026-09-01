import packageMeta from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-fix-v1.json";
import sunRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-fix-sun-v1.json";
import mercuryRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-fix-mercury-v1.json";
import venusRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-fix-venus-v1.json";
import marsRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-fix-mars-v1.json";
import jupiterRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-fix-jupiter-v1.json";
import saturnRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-fix-saturn-v1.json";
import uranusRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-fix-uranus-v1.json";
import neptuneRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-fix-neptune-v1.json";
import plutoRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-fix-pluto-v1.json";
import chironRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-fix-chiron-v1.json";

type FixRow = {
  ContentKey: string; Planet: string; Sign: string;
  tldrWhat: string; tldrTakeaway: string; placementArticle?: string;
  fallback: { hook: string; lived: string; turn: string };
  ReviewStatus: string; OwnerApproved: boolean; ServingEnabled: boolean;
};
type FixMeta = {
  schema: string; parent_canonical_package_version: string; parent_canonical_json_sha256: string;
  review_status: string; owner_approved: boolean; serving_enabled: boolean;
  approval_id: string; expected_records: number; record_files: string[];
};

const parentPackage = "SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30";
const parentSha = "9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750";
const planets = ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"];
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const rowFiles = [sunRows, mercuryRows, venusRows, marsRows, jupiterRows, saturnRows, uranusRows, neptuneRows, plutoRows, chironRows] as Array<{ planet: string; records: FixRow[] }>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function slug(value: unknown) { return String(value ?? "").trim().toLowerCase().replace(/[\s_]+/gu, "-"); }
function approvedRows(meta: FixMeta) {
  const rows = rowFiles.flatMap((file) => file.records);
  if (meta.schema !== "tldrastro-sky-v4-continuous-corpus-fix/v1"
    || meta.parent_canonical_package_version !== parentPackage
    || meta.parent_canonical_json_sha256 !== parentSha
    || meta.review_status !== "approved" || meta.owner_approved !== true || meta.serving_enabled !== true
    || meta.expected_records !== 120 || meta.record_files.length !== 10 || rows.length !== 120) {
    throw new Error("SKY_V4_CORPUS_FIX_GOVERNANCE: correction package is not approved for serving.");
  }
  const keys = new Set<string>();
  for (const row of rows) {
    const expectedKey = `sky-placement/article/${slug(row.Planet)}/${slug(row.Sign)}`;
    if (row.ContentKey !== expectedKey || !planets.includes(slug(row.Planet)) || !signs.includes(slug(row.Sign))
      || row.ReviewStatus !== "approved" || row.OwnerApproved !== true || row.ServingEnabled !== true
      || !row.tldrWhat?.trim() || !row.tldrTakeaway?.trim()
      || (row.placementArticle !== undefined && !row.placementArticle.trim())
      || !row.fallback?.hook?.trim() || !row.fallback?.lived?.trim() || !row.fallback?.turn?.trim()
      || keys.has(row.ContentKey)) {
      throw new Error(`SKY_V4_CORPUS_FIX_GOVERNANCE: invalid row ${row.ContentKey || expectedKey}.`);
    }
    keys.add(row.ContentKey);
  }
  return rows;
}

export function applySkyV4ContinuousCorpusFix(corpus: unknown) {
  const meta = packageMeta as FixMeta;
  const rows = approvedRows(meta);
  const base = record(corpus);
  if (String(base.packageVersion ?? "") !== parentPackage) {
    throw new Error("SKY_V4_CORPUS_FIX_GOVERNANCE: parent package mismatch.");
  }
  const content = record(base.content);
  const continuous = Array.isArray(content.continuous) ? content.continuous.map(record) : [];
  if (continuous.length !== 120) throw new Error("SKY_V4_CORPUS_FIX_GOVERNANCE: expected 120 parent records.");
  const patches = new Map(rows.map((row) => [row.ContentKey, row]));
  const baseKeys = new Set(continuous.map((row) => String(row.contentKey ?? "")));
  if (baseKeys.size !== 120 || [...patches.keys()].some((key) => !baseKeys.has(key))) {
    throw new Error("SKY_V4_CORPUS_FIX_GOVERNANCE: correction key set does not match the parent corpus.");
  }
  const next = structuredClone(base);
  const nextContent = record(next.content);
  nextContent.continuous = continuous.map((row) => {
    const patch = patches.get(String(row.contentKey ?? ""));
    if (!patch) throw new Error(`SKY_V4_CORPUS_FIX_GOVERNANCE: missing correction for ${String(row.contentKey ?? "")}.`);
    return {
      ...row,
      tldrWhat: patch.tldrWhat,
      tldrTakeaway: patch.tldrTakeaway,
      ...(patch.placementArticle !== undefined ? { placementArticle: patch.placementArticle } : {}),
      fallback: structuredClone(patch.fallback),
      editorialStatus: "owner_approved_corpus_defect_rewrite_2026_09_01",
      implementationStatus: "serving_via_owner_approved_corpus_fix_v1",
      ownerApprovedForV4Role: true,
      qa: "PASS_OWNER_APPROVED_CROSS_FIELD_DISTINCT"
    };
  });
  next.content = nextContent;
  return next;
}

export function skyV4ContinuousCorpusFixReleaseState() {
  const meta = packageMeta as FixMeta;
  return {
    schema: meta.schema,
    expectedRecords: meta.expected_records,
    recordCount: rowFiles.flatMap((file) => file.records).length,
    ownerApproved: meta.owner_approved === true,
    servingEnabled: meta.serving_enabled === true,
    reviewStatus: meta.review_status,
    approvalId: meta.approval_id
  };
}
