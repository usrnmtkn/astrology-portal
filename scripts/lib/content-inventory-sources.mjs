import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const READER_ELIGIBLE = new Set(["approved", "approved_reuse", "reviewed"]);
const SIGNS = new Set(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]);
const OBJECTS = new Set(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "lilith", "black-moon-lilith", "north-node", "south-node", "ascendant", "midheaven"]);
const ASPECTS = new Set(["conjunction", "opposition", "square", "trine", "sextile"]);
const EVENTS = new Set(["ingress", "direct", "retrograde", "station", "conjunction", "opposition", "square", "trine", "sextile"]);
const WORDING_FIELDS = [
  "headline",
  "title",
  "tagline",
  "tag",
  "body",
  "body_you",
  "body_they",
  "body_sky",
  "question",
  "opening",
  "tension",
  "development",
  "close",
  "try_this",
  "fact_line",
  "aspect_insert",
  "aspect_units",
  "moon_entry_aspect_units",
  "key_dates",
];

function readJson(repoRoot, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function withSource(rows, relativePath) {
  return (rows ?? []).map((row) => ({ row, relativePath }));
}

function latestEligible(candidates, isDistributionEligible, allowBlank = false) {
  const grouped = new Map();
  for (const candidate of candidates) {
    const keyed = grouped.get(candidate.row.contentKey) ?? [];
    keyed.push(candidate);
    grouped.set(candidate.row.contentKey, keyed);
  }
  return [...grouped.values()]
    .map((keyed) => [...keyed].reverse().find(({ row }) => {
      const status = String(row.review_status ?? "").trim().toLowerCase();
      return (READER_ELIGIBLE.has(status) || (allowBlank && !status)) && isDistributionEligible(row);
    }))
    .filter(Boolean);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stableValue(value)), "utf8").digest("hex");
}

function contentFamily(contentKey) {
  if (contentKey.includes("house-horoscope-core")) return "house-horoscope-core";
  if (contentKey.includes("sky-placement") || contentKey.includes("sky-sign-copy")) return "sky-placement";
  if (contentKey.includes("sky-aspect")) return "sky-aspect";
  if (contentKey.includes("lunation") || contentKey.includes("moon-phase")) return "lunation";
  if (/\b(?:synastry|compat|bond|relationship|pair-daily)\b/u.test(contentKey)) return "synastry";
  if (contentKey.includes("decan")) return "decan";
  if (contentKey.includes("natal-aspect")) return "natal-aspect";
  if (contentKey.includes("natal") || contentKey.includes("placement-sentence")) return "natal-placement";
  if (contentKey.startsWith("fallback-template/")) return "template";
  if (contentKey.startsWith("fallback-vocab/")) return "vocabulary";
  if (contentKey.startsWith("authored/calendar")) return "calendar";
  if (contentKey.startsWith("authored/sky")) return "sky";
  return contentKey.split("/").slice(0, 2).join("/");
}

function astrologyFrom(row, contentKey) {
  const tokens = contentKey.toLowerCase().split("/").filter(Boolean);
  const direct = {};
  for (const key of ["planet", "sign", "house", "aspect", "event_type", "eventType", "kind", "motion", "rising_sign", "transit_sign"]) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) direct[key] = row[key];
  }
  return {
    ...direct,
    objects: [...new Set(tokens.filter((token) => OBJECTS.has(token)))],
    signs: [...new Set(tokens.filter((token) => SIGNS.has(token)))],
    aspects: [...new Set(tokens.filter((token) => ASPECTS.has(token)))],
    events: [...new Set(tokens.filter((token) => EVENTS.has(token)))],
    houses: [...new Set(tokens.filter((token) => /^(?:[1-9]|1[0-2])$/u.test(token)).map(Number))],
  };
}

function wordingFor(row) {
  const wording = Object.fromEntries(
    WORDING_FIELDS
      .filter((field) => row[field] !== undefined && row[field] !== null)
      .map((field) => [field, row[field]]),
  );
  if (Object.keys(wording).length === 0) {
    throw new Error(`Serving record has no recognized wording fields: ${row.contentKey}`);
  }
  return wording;
}

function sourceAuthorFor(row) {
  const explicit = row.sourceAuthor ?? row.source_author;
  if (explicit) return String(explicit);
  if (row.owner_authored === true || row.ownerAuthored === true) return "OWN";
  const sourceText = JSON.stringify(row.source_keys ?? row.sources ?? row.source ?? "");
  for (const code of ["AC", "CC", "ML"]) {
    if (new RegExp(`(?:^|[^A-Z])${code}(?:[^A-Z]|$)`, "u").test(sourceText.toUpperCase())) return code;
  }
  return "composed";
}

function provenanceFor(row) {
  if (row.owner_authored === true || row.ownerAuthored === true) return "owner-authored";
  if (row.owner_edited === true || row.ownerEdited === true) return "owner-edited";
  if (row.source_keys || row.sources || row.source) return "source-archive";
  return "generated";
}

function approvalFor(row, defaultRecord) {
  const explicit = row.approval?.recordPath ?? row.approval_record;
  return {
    record: explicit || defaultRecord,
    versionOrDate: row.approval?.approvedAt ?? row.approved_via ?? row.approvedVia ?? "package-owner-approval",
  };
}

function fallbackRecord(candidate, bucket) {
  const { row, relativePath } = candidate;
  const wording = wordingFor(row);
  const approval = approvalFor(row, "apps/web/src/content/fallbackArchitectureV3/dist/README.md");
  return {
    contentKey: row.contentKey,
    contentFamily: contentFamily(row.contentKey),
    runtimeSource: relativePath,
    runtimeBucket: bucket,
    status: "owner-approved",
    sourceStatus: String(row.review_status ?? "package-approved"),
    provenance: provenanceFor(row),
    sourceAuthor: sourceAuthorFor(row),
    approvalRecord: approval.record,
    approvalVersionDate: approval.versionOrDate,
    contentHash: hash(wording),
    wording,
    astrology: astrologyFrom(row, row.contentKey),
  };
}

function matrixV9Records(repoRoot) {
  const relativeRoot = "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-labeled";
  const rowsPath = `${relativeRoot}/knowledge-matrix-v9-owner-approved-rows.json`;
  const matrix = readJson(repoRoot, rowsPath);
  const approvalRecord = "packages/astro-knowledge/review/knowledge-matrix-v9/OWNER-APPROVAL-AND-CANONICAL-INGESTION.md";
  const records = [];
  const seenTransit = new Set();
  for (const row of matrix.transit_meanings ?? []) {
    const runtimeKey = [row.Planet, row.Sign, row.Event]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .join("|");
    if (
      row.Governance !== "owner-approved"
      || !row.Planet
      || !row.Sign
      || !row.Event
      || !row.Copy
      || row.Copy.startsWith("[EXCLUDE FROM FALLBACK]")
      || seenTransit.has(runtimeKey)
    ) continue;
    seenTransit.add(runtimeKey);
    const wording = { body: row.Copy };
    records.push({
      contentKey: `knowledge-matrix-v9/transit/${runtimeKey}`,
      contentFamily: "transit-meaning",
      runtimeSource: rowsPath,
      runtimeBucket: "knowledge-matrix-transit",
      status: "owner-approved",
      sourceStatus: row.Governance,
      provenance: "source-archive",
      sourceAuthor: row.Archive ?? "composed",
      approvalRecord,
      approvalVersionDate: "2026-08-09",
      contentHash: hash(wording),
      wording,
      astrology: {
        objects: [String(row.Planet).toLowerCase()],
        signs: String(row.Sign).toLowerCase() === "any" ? [] : [String(row.Sign).toLowerCase()],
        events: [String(row.Event).toLowerCase()],
      },
      judgeLineage: row.Judge,
      sourceRow: row.source_row,
    });
  }

  const seenHouse = new Set();
  for (const row of matrix.house_activations ?? []) {
    const risingSign = String(row["Rising sign"] ?? "").trim();
    const planet = String(row.Planet ?? "").trim();
    const transitSign = String(row["Transit sign"] ?? "").trim();
    const house = Number(row.House);
    const event = String(row.Event ?? "").trim();
    const copy = String(row.Experience ?? "");
    const runtimeKey = [risingSign, planet, transitSign, house, event]
      .map((value) => String(value).toLowerCase())
      .join("|");
    if (
      row.Governance !== "owner-approved"
      || !risingSign
      || !planet
      || !transitSign
      || !Number.isInteger(house)
      || house < 1
      || house > 12
      || !event
      || !copy
      || copy.startsWith("[EXCLUDE FROM FALLBACK]")
      || seenHouse.has(runtimeKey)
    ) continue;
    seenHouse.add(runtimeKey);
    const wording = { body: copy };
    records.push({
      contentKey: `knowledge-matrix-v9/house/${runtimeKey}`,
      contentFamily: "house-activation",
      runtimeSource: rowsPath,
      runtimeBucket: "knowledge-matrix-house",
      status: "owner-approved",
      sourceStatus: row.Governance,
      provenance: "source-archive",
      sourceAuthor: row.Archive ?? "composed",
      approvalRecord,
      approvalVersionDate: "2026-08-09",
      contentHash: hash(wording),
      wording,
      astrology: {
        risingSign: risingSign.toLowerCase(),
        objects: [planet.toLowerCase()],
        signs: [transitSign.toLowerCase()],
        houses: [house],
        events: [event.toLowerCase()],
      },
      judgeLineage: row.Judge,
      sourceRow: row.source_row,
    });
  }
  return records;
}

export function buildCanonicalContentRecords(repoRoot) {
  const packageRoot = "apps/web/src/content/fallbackArchitectureV3";
  const source = (file) => `${packageRoot}/${file}`;
  const skyServing = readJson(repoRoot, source("authored-inputs/sky-placement-serving-manifest-v1.json"));
  const releaseByKey = new Map();
  const releaseByBatch = new Map();
  for (const release of skyServing.releases ?? []) {
    releaseByBatch.set(String(release.release_batch ?? ""), release);
    for (const key of release.approved_keys ?? []) releaseByKey.set(key, release);
  }
  const isContinuous = (row) => row?.render_policy === "sky-placement-continuous-v2" || String(row?.contentKey ?? "").startsWith("fallback-hook/sky-sign-copy/");
  const isDistributionEligible = (row) => {
    if (!isContinuous(row)) return true;
    const release = releaseByKey.get(row.contentKey) ?? releaseByBatch.get(String(row.release_batch ?? ""));
    return release?.distribution_state === "serving" && release.approved_keys?.includes(row.contentKey);
  };

  const rows = (relativePath, property) => withSource(readJson(repoRoot, source(relativePath))[property], source(relativePath));
  const rootRows = (relativePath) => withSource(readJson(repoRoot, source(relativePath)), source(relativePath));
  const skySigns = fs.readdirSync(path.join(repoRoot, packageRoot, "source-rows"))
    .filter((fileName) => /^sky-sign-copy-.*\.json$/u.test(fileName))
    .sort()
    .flatMap((fileName) => rows(`source-rows/${fileName}`, "rows"));

  const authored = latestEligible([
    ...rows("source-rows/transit-synastry-rows-v1.json", "authoredCards"),
    ...rows("source-rows/lunation-blend-units-v1.json", "authoredCards"),
    ...rows("source-rows/sky-article-v1.json", "authoredCards"),
    ...rootRows("source-rows/station-cards-week-openers-v1.json"),
    ...rows("source-rows/timing-event-reader-copy-v2.json", "authoredCards"),
  ], isDistributionEligible);
  const hooks = latestEligible([
    ...rows("source-rows/fallback-source-rows-v3.json", "hookRows"),
    ...rows("source-rows/lunation-blend-units-v1.json", "hookRows"),
    ...rows("source-rows/bond-language-pass-2.json", "rows"),
    ...rows("source-rows/pair-daily-frames-v1.json", "rows"),
    ...rows("source-rows/pair-daily-clauses-v1.json", "rows"),
    ...rows("source-rows/sky-article-v1.json", "hookRows"),
    ...rows("source-rows/sky-aspect-phrasebook-v1.json", "hookRows"),
    ...rows("source-rows/sky-planet-frames-v1.json", "rows"),
    ...rows("source-rows/sky-placement-inventories-voice-pass-v1.json", "rows"),
    ...skySigns,
    ...rows("source-rows/sky-placement-owner-approved-fallbacks-v1.json", "rows"),
    ...rows("source-rows/sky-placement-house-templates-v1.json", "rows"),
    ...rows("source-rows/sun-leo-house-cores-v1.json", "rows"),
    ...rows("source-rows/venus-libra-house-cores-v1.json", "rows"),
  ], isDistributionEligible);
  const vocabulary = latestEligible([
    ...rows("source-rows/fallback-source-rows-v3.json", "vocabularyRows"),
    ...rows("source-rows/placement-interim-fixes-v1.json", "vocabularyRows"),
    ...rows("source-rows/sky-article-v1.json", "vocabularyRows"),
  ], isDistributionEligible);
  const templates = latestEligible([
    ...rows("templates/fallback-templates-v3.json", "templates"),
    ...rows("source-rows/placement-interim-fixes-v1.json", "templates"),
  ], isDistributionEligible, true);

  const fallbackCandidates = [
    ...authored.map((candidate) => fallbackRecord(candidate, "authored")),
    ...hooks.map((candidate) => fallbackRecord(candidate, "hook")),
    ...vocabulary.map((candidate) => fallbackRecord(candidate, "vocabulary")),
    ...templates.map((candidate) => fallbackRecord(candidate, "template")),
  ];
  const manifest = readJson(repoRoot, source("bundled-manifest-v3.json"));
  const expectedManifestKeys = [...manifest.keys].sort();
  const manifestSet = new Set(expectedManifestKeys);
  const candidateByManifestKey = new Map(fallbackCandidates.map((record) => [`${record.runtimeBucket}:${record.contentKey}`, record]));
  const missing = expectedManifestKeys.filter((key) => !candidateByManifestKey.has(key));
  if (missing.length) {
    throw new Error(`Fallback inventory is missing ${missing.length} serving manifest keys: ${JSON.stringify(missing)}.`);
  }
  const fallbackRecords = fallbackCandidates.filter((record) => manifestSet.has(`${record.runtimeBucket}:${record.contentKey}`));

  const records = [...fallbackRecords, ...matrixV9Records(repoRoot)]
    .sort((a, b) => a.contentKey.localeCompare(b.contentKey));
  const duplicates = records.filter((record, index) => index > 0 && records[index - 1].contentKey === record.contentKey);
  if (duplicates.length) throw new Error(`Canonical inventory has duplicate runtime addresses: ${duplicates.map((record) => record.contentKey).join(", ")}`);
  return records;
}

export function contentInventoryFingerprint(records) {
  return crypto.createHash("sha256").update(JSON.stringify(records.map((record) => ({
    contentKey: record.contentKey,
    wording: stableValue(record.wording),
    status: record.status,
  }))), "utf8").digest("hex");
}
