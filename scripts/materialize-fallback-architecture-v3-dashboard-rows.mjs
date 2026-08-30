#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  createPackageManifest,
  PACKAGE_VERSION
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { isGovernedReaderEligible } from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const defaultOutPath = path.join(repoRoot, "scripts/generated/fallback-architecture-v3-dashboard-rows.json");
const importBatchId = `fallback-architecture-${PACKAGE_VERSION}`;
const placementSentencePositiveTest = "passed-jul29-criteria";
let packageManifest;
let packagePartitionManifests;
let continuousFallbackImportManifest;
let skyPlacementServingManifest;
let skyPlacementReleaseByKey;
let skyPlacementReleaseByBatch;

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const verify = args.has("--verify");
const outPath = process.argv.find((arg) => arg.startsWith("--out="))?.slice("--out=".length) ?? defaultOutPath;
const contentKeyFilter = process.argv.find((arg) => arg.startsWith("--content-key="))?.slice("--content-key=".length) ?? null;

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadLocalWebEnv() {
  const envPath = path.join(repoRoot, "apps/web/.env.local");

  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(trimmed.slice(separatorIndex + 1));

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(packageDir, fileName), "utf8"));
}

function readSkySignCopySources() {
  return fs.readdirSync(path.join(packageDir, "source-rows"))
    .filter((fileName) => /^sky-sign-copy-.*\.json$/u.test(fileName))
    .sort()
    .map((fileName) => readJson(`source-rows/${fileName}`));
}

function isContinuousSkyPlacementRecord(record, contentKey) {
  return record.render_policy === "sky-placement-continuous-v2"
    || contentKey.startsWith("fallback-hook/sky-sign-copy/");
}

function isSkyPlacementPartitionKey(contentKey) {
  return contentKey.startsWith("sky-placement/")
    || contentKey.startsWith("house-horoscope-core/")
    || contentKey.startsWith("fallback-hook/sky-sign-copy/")
    || contentKey.startsWith("fallback-hook/sky-placement-sign/")
    || (
      contentKey.startsWith("fallback-hook/sky-placement-")
    );
}

function loadSkyPlacementServingManifest() {
  const manifest = readJson("authored-inputs/sky-placement-serving-manifest-v1.json");
  const releaseByKey = new Map();
  const releaseByBatch = new Map();

  if (manifest.runtime_capability !== "sky-placement-on-demand-v1") {
    throw new Error("Sky Placement serving manifest must require the sky-placement-on-demand-v1 runtime capability.");
  }

  for (const release of manifest.releases ?? []) {
    const approvedKeys = Array.isArray(release.approved_keys) ? release.approved_keys : [];
    const approval = release.owner_approval;

    if (release.distribution_state === "serving") {
      if (
        !approval
        || typeof approval.statement !== "string"
        || !approval.statement.trim()
        || typeof approval.approved_at !== "string"
        || !approval.approved_at.trim()
        || typeof approval.source !== "string"
        || !approval.source.trim()
        || JSON.stringify(approval.approved_keys) !== JSON.stringify(approvedKeys)
      ) {
        throw new Error(`Serving release ${release.release_id ?? "unknown"} lacks an explicit owner-approved serving diff.`);
      }

      if (Number(release.release_batch) >= 2) {
        const migrationGate = release.migration_gate;

        if (
          release.transition !== "staged_to_serving"
          || release.required_runtime_capability !== manifest.runtime_capability
          || migrationGate?.status !== "verified"
          || typeof migrationGate.deployed_package_version !== "string"
          || !migrationGate.deployed_package_version.trim()
          || typeof migrationGate.verified_at !== "string"
          || !migrationGate.verified_at.trim()
          || typeof migrationGate.source !== "string"
          || !migrationGate.source.trim()
        ) {
          throw new Error(`Serving release ${release.release_id ?? "unknown"} is blocked until the on-demand runtime deployment is verified.`);
        }
      }
    }

    const releaseBatch = String(release.release_batch ?? "").trim();
    if (!releaseBatch || releaseByBatch.has(releaseBatch)) {
      throw new Error(`Sky Placement serving manifest has a missing or duplicate release_batch: ${releaseBatch || "unknown"}.`);
    }
    releaseByBatch.set(releaseBatch, release);

    for (const contentKey of approvedKeys) {
      if (releaseByKey.has(contentKey)) {
        throw new Error(`Sky Placement serving manifest repeats ${contentKey}.`);
      }
      releaseByKey.set(contentKey, release);
    }
  }

  return { manifest, releaseByKey, releaseByBatch };
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function adminHeaders(extra = {}) {
  const key = serviceRoleKey();

  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra
  };
}

function titleFromKey(key) {
  const leaf = key.split("/").filter(Boolean).pop() ?? key;

  return leaf
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function statusForReview(role, reviewStatus, contentKey) {
  if (contentKey.startsWith("authored/profection-year/")) {
    return { status: "DRAFT", lane: "reference", reviewState: "needs-review" };
  }

  if (
    ["full_copy", "house_horoscope_core"].includes(role)
    && ["approved", "approved_reuse", "reviewed"].includes(reviewStatus)
  ) {
    return { status: "LIVE", lane: "serving", reviewState: null };
  }

  if (reviewStatus === "needs_review") {
    return { status: "DRAFT", lane: "reference", reviewState: "needs-review" };
  }

  return { status: "DRAFT", lane: "reference", reviewState: "fallback-system-reference" };
}

function surfaceForKey(key, explicitSurface) {
  if (explicitSurface === "friends") {
    return "relationship";
  }
  if (explicitSurface === "weekly-station" || explicitSurface === "weekly-opener") {
    return "you";
  }

  if (["sky", "you", "natal", "synastry", "composite", "relationship", "modifier"].includes(explicitSurface ?? "")) {
    return explicitSurface;
  }

  if (key.includes("/compat-") || key.startsWith("fallback-hook/compat")) return "relationship";
  if (key.startsWith("fallback-hook/lunation-")) return "you";
  if (key.includes("synastry")) return "synastry";
  if (key.includes("/transit-") || key.startsWith("fallback-hook/transit") || key.includes("/empty-house")) return "you";
  if (key.startsWith("fallback-vocab/") || key.startsWith("fallback-template/")) return "modifier";
  if (key.startsWith("fallback-source/")) return "modifier";

  return "sky";
}

function modeForKey(key) {
  if (key.startsWith("sky-placement/article/") || key.startsWith("sky-placement/seasonal-context/") || key.includes("/sky-season/") || key.includes("/sky-newmoon/") || key.includes("/sky-fullmoon/") || key.includes("/sky-lunation-macro/")) return "article";
  if (key.includes("/compat-deep/") || key.includes("/empty-house/") || key.includes("/profection-year/")) return "in_depth";
  return "feed";
}

function eventTypeForKey(key, role) {
  if (role === "template") return "fallback-template";
  if (role === "vocabulary") return "vocab";
  if (role === "fallback_source") return "fallback-source";
  if (key.startsWith("fallback-hook/")) return "fallback-hook";
  if (key.startsWith("sky-placement/article/") || key.startsWith("sky-placement/seasonal-context/")) return "planetary-ingress";
  if (key.includes("/compat-")) return "friends.compatibility";
  if (key.includes("/transit-aspect/")) return "transit-to-natal-aspect";
  if (key.includes("/sky-newmoon/")) return "sky-newmoon";
  if (key.includes("/sky-fullmoon/")) return "sky-fullmoon";
  if (key.includes("/sky-lunation-macro/")) return "sky-lunation-macro";
  if (key.includes("/sky-season/")) return "planetary-ingress";
  if (key.startsWith("authored/station/")) return "planetary-station";
  if (key.startsWith("authored/week-opener/")) return "weekly-horoscope-opener";
  return "fallback-architecture-v3";
}

function rowBody(record) {
  if (
    record.render_policy === "sky-placement-continuous-v2"
    && typeof record.body_you !== "string"
  ) {
    const era = record.era_layer ?? {};
    return [
      record.opening,
      record.tension,
      record.development,
      era.frame,
      era.handoff,
      era.recurrence,
      era.collective_lesson,
      record.close
    ].filter((part) => typeof part === "string" && part.trim()).join("\n\n");
  }
  return String(record.body_you ?? record.body ?? record.text ?? "").trim();
}

function rowSummary(record) {
  return String(record.summary ?? record.intention ?? record.energy ?? record.note ?? record.notes ?? "").trim();
}

function requiresPlacementPositiveTest(record, contentKey, reviewStatus) {
  return contentKey.startsWith("fallback-hook/placement-sentence/")
    && (
      reviewStatus === "needs_review"
      || record.positive_test != null
      || String(record.note ?? record.notes ?? "").includes("TLDR-Placement-Copy-Audit-Batch1.md")
    );
}

function blockTypeForPackageRecord(contentRole, contentKey) {
  if (contentRole === "template") return "fallback_template";
  if (contentRole === "full_copy" || contentKey.startsWith("sky-placement/article/")) return "fallback_article";
  if (
    contentRole === "fallback_hook"
    || contentRole === "house_horoscope_core"
    || contentKey.startsWith("fallback-hook/")
  ) return "fallback_hook";
  return null;
}

function isRetiredPlanetInSignModule(contentKey) {
  const retirement = continuousFallbackImportManifest?.retired_module_rows;

  if (!retirement || !Array.isArray(retirement.key_families)) {
    return false;
  }

  const planets = new Set(retirement.planets ?? []);

  return retirement.key_families.some((family) => {
    const escaped = family.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const pattern = escaped
      .replace("\\{planet\\}", `(?:${[...planets].join("|")})`)
      .replace("\\{sign\\}", "[^/]+")
      .replace("\\{rest\\}", ".+");

    return new RegExp(`^${pattern}$`, "u").test(contentKey);
  });
}

function mapPackageRecord(record, bucket) {
  const contentKey = String(record.contentKey ?? record.content_key ?? "").trim();

  if (!contentKey) {
    throw new Error(`V3 ${bucket} row is missing contentKey.`);
  }

  if (isRetiredPlanetInSignModule(contentKey)) {
    record = {
      ...record,
      review_status: "superseded",
      render_eligible: false,
      superseded_by: "sky-placement-continuous-v2"
    };
  }

  const contentRole = String(record.content_role ?? bucket).trim();
  const stageOnly = bucket === "sky-placement-v4-stage";
  const sourceReviewStatus = String(record.review_status ?? "").trim();
  // Package templates without an explicit editorial status are already
  // reader-eligible in the bundled resolver. Normalize only the mirror
  // metadata so Supabase RLS exposes the same complete package.
  const reviewStatus = contentRole === "template" && !sourceReviewStatus
    ? "approved_reuse"
    : sourceReviewStatus;
  const requiresServingManifest = isContinuousSkyPlacementRecord(record, contentKey)
    && reviewStatus !== "superseded";
  const distributionRelease = requiresServingManifest
    ? skyPlacementReleaseByKey.get(contentKey)
      ?? skyPlacementReleaseByBatch.get(String(record.release_batch ?? "").trim())
    : null;
  const distributionApproved = distributionRelease?.distribution_state === "serving"
    && distributionRelease.approved_keys?.includes(contentKey);
  const serving = requiresServingManifest && !distributionRelease
    ? { status: "DRAFT", lane: "reference", reviewState: "serving-manifest-required" }
    : !distributionApproved && requiresServingManifest
      ? { status: "DRAFT", lane: "reference", reviewState: "serving-awaiting-owner-approval" }
    : statusForReview(contentRole, reviewStatus, contentKey);
  const packagePartition = isSkyPlacementPartitionKey(contentKey) ? "sky-placement" : "core";
  const packagePartitionManifest = packagePartitionManifests[packagePartition];
  const surface = surfaceForKey(contentKey, record.surface);
  const body = rowBody(record);

  if (
    requiresPlacementPositiveTest(record, contentKey, reviewStatus)
    && record.positive_test !== placementSentencePositiveTest
  ) {
    throw new Error(`${contentKey} must carry positive_test="${placementSentencePositiveTest}" before dashboard import.`);
  }

  return {
    content_key: contentKey,
    surface,
    mode: modeForKey(contentKey),
    status: serving.status,
    event_type: eventTypeForKey(contentKey, contentRole),
    target_date: null,
    headline: String(record.headline ?? titleFromKey(contentKey)).trim(),
    summary: rowSummary(record),
    body,
    sections: {
      packageRecord: record,
      body_you: record.body_you ?? null,
      body_they: record.body_they ?? null,
      positive_test: record.positive_test ?? null,
      intention: record.intention ?? null,
      ritual: record.ritual ?? null,
      energy: record.energy ?? null
    },
    block_type: blockTypeForPackageRecord(contentRole, contentKey),
    lane: serving.lane,
    review_state: serving.reviewState,
    evergreen: true,
    evergreen_at: new Date().toISOString(),
    evergreen_by: importBatchId,
    facts: {
      fallbackArchitectureV3: true,
      packageVersion: packageManifest.packageVersion,
      packageContentHash: packageManifest.contentHash,
      packageKeyManifestHash: packageManifest.keyManifestHash,
      packageKeyCount: packageManifest.keyCount,
      packagePartition,
      packagePartitionContentHash: packagePartitionManifest.contentHash,
      packagePartitionKeyManifestHash: packagePartitionManifest.keyManifestHash,
      packagePartitionKeyCount: packagePartitionManifest.keyCount,
      distributionState: distributionRelease?.distribution_state ?? null,
      releaseBatch: distributionRelease?.release_batch ?? null,
      packageBucket: bucket,
      content_role: contentRole,
      review_status: reviewStatus,
      positive_test: record.positive_test ?? null,
      readerServing: serving.status === "LIVE" && serving.lane === "serving" && !serving.reviewState,
      stageOnly,
      ownerApproved: record.owner_approved ?? null,
      sourceSchemaVersion: record.source_schema_version ?? null
    },
    knowledge_ids: [],
    source_snapshot: {
      contentType: bucket,
      content_role: contentRole,
      review_status: reviewStatus,
      positive_test: record.positive_test ?? null,
      approved_via: record.approved_via ?? null,
      source_keys: record.source_keys ?? [],
      importBatchId,
      sourcePackage: stageOnly ? "sky-placement-v4-sun-corpus-stage" : "tldrastro-fallback-architecture-v3",
      sourceFile: bucket,
      packageVersion: packageManifest.packageVersion,
      packageContentHash: packageManifest.contentHash,
      packageKeyManifestHash: packageManifest.keyManifestHash,
      packageKeyCount: packageManifest.keyCount,
      packagePartition,
      packagePartitionContentHash: packagePartitionManifest.contentHash,
      packagePartitionKeyManifestHash: packagePartitionManifest.keyManifestHash,
      packagePartitionKeyCount: packagePartitionManifest.keyCount,
      distributionState: distributionRelease?.distribution_state ?? null,
      releaseBatch: distributionRelease?.release_batch ?? null,
      note: stageOnly
        ? "V4 stage-only review mirror. This record is not present in the reader package and cannot serve without exact owner approval plus a separate serving release."
        : "V3 package mirror for dashboard editing. fallback_source rows are source material and must never render directly."
    },
    reviewer_notes: String(record.note ?? record.notes ?? "").trim(),
    prompt_version: importBatchId,
    provider: packagePartition === "sky-placement"
      ? "tldrastro-fallback-architecture-v3-sky-placement"
      : "tldrastro-fallback-architecture-v3",
    model: "manual",
    updated_at: new Date().toISOString()
  };
}

function editorialSourceBankRecords(bank) {
  const reviewStatus = String(bank.authoring?.review_status ?? "").trim();
  const approvedVia = String(bank.authoring?.approved_via ?? "").trim();

  if (reviewStatus !== "approved" || approvedVia !== "owner-authored") {
    throw new Error("Editorial source bank must preserve its owner-authored approved provenance.");
  }

  return bank.collections.flatMap((collection) =>
    collection.entries.map((entry) => {
      const entryId = String(entry.id ?? "").trim();
      const body = String(entry.body ?? "").trim();

      if (!entryId || !body) {
        throw new Error(`Editorial source bank collection "${collection.id}" has an incomplete entry.`);
      }

      return {
        ...entry,
        contentKey: `fallback-source/editorial/${collection.id}/${entryId}`,
        headline: entry.headline ?? titleFromKey(entryId),
        body,
        surface: collection.surface,
        content_role: "fallback_source",
        review_status: reviewStatus,
        approved_via: approvedVia,
        owner_authored: true,
        family: collection.family,
        collection_id: collection.id,
        collection_title: collection.title,
        judge_profile: collection.judgeProfile,
        source_keys: collection.source_keys ?? [],
        bank_version: bank.bankVersion,
        note: "Owner-authored and approved. Preserve exact wording. Optional phrase-judge results are advisory and never revoke approval."
      };
    })
  );
}

function readPackageSources() {
  const sourceRows = readJson("source-rows/fallback-source-rows-v3.json");
  const dailyGlanceVariants = readJson("source-rows/daily-glance-variants-v1.json");
  const editorialSourceBank = readJson("source-rows/editorial-source-bank-v1.json");
  const authoredRows = readJson("source-rows/transit-synastry-rows-v1.json");
  const bondLanguagePass2 = readJson("source-rows/bond-language-pass-2.json");
  const lunationBlendRows = readJson("source-rows/lunation-blend-units-v1.json");
  const lunationEclipseVariants = readJson("source-rows/lunation-eclipse-variants-v1.json");
  const placementInterimRows = readJson("source-rows/placement-interim-fixes-v1.json");
  const pairDailyFrames = readJson("source-rows/pair-daily-frames-v1.json");
  const pairDailyClauses = readJson("source-rows/pair-daily-clauses-v1.json");
  const skyArticleRows = readJson("source-rows/sky-article-v1.json");
  const skyAspectPhrasebook = readJson("source-rows/sky-aspect-phrasebook-v1.json");
  const skyPlacementVoicePass = readJson("source-rows/sky-placement-inventories-voice-pass-v1.json");
  const skyPlacementOwnerApprovedFallbacks = readJson("source-rows/sky-placement-owner-approved-fallbacks-v1.json");
  const skyPlacementHouseTemplates = readJson("source-rows/sky-placement-house-templates-v1.json");
  const sunLeoHouseCores = readJson("source-rows/sun-leo-house-cores-v1.json");
  const venusLibraHouseCores = readJson("source-rows/venus-libra-house-cores-v1.json");
  const skyPlacementOwnerApprovedReaderFallbacks = readJson("bundled-sky-placement-owner-approved-reader-v1.json");
  const skyPlanetFrames = readJson("source-rows/sky-planet-frames-v1.json");
  const skySignCopySources = readSkySignCopySources();
  const skySignCopy = {
    rows: skySignCopySources.flatMap((source) => source.rows ?? []),
    superseded_rows: skySignCopySources.flatMap((source) => source.superseded_rows ?? [])
  };
  const timingEventRows = readJson("source-rows/timing-event-reader-copy-v2.json");
  const weeklyRows = readJson("source-rows/station-cards-week-openers-v1.json");
  const templateRows = readJson("templates/fallback-templates-v3.json");
  const skyPlacementV4SunStage = readJson("authored-inputs/sky-placement-v4-sun-corpus-stage-v1.json");
  continuousFallbackImportManifest = readJson("authored-inputs/sky-placement-continuous-v2-pending.json");
  ({
    manifest: skyPlacementServingManifest,
    releaseByKey: skyPlacementReleaseByKey,
    releaseByBatch: skyPlacementReleaseByBatch
  } = loadSkyPlacementServingManifest());

  return {
    sourceRows,
    dailyGlanceVariants,
    editorialSourceBank,
    authoredRows,
    bondLanguagePass2,
    lunationBlendRows,
    lunationEclipseVariants,
    placementInterimRows,
    pairDailyFrames,
    pairDailyClauses,
    skyArticleRows,
    skyAspectPhrasebook,
    skyPlacementVoicePass,
    skyPlacementOwnerApprovedFallbacks,
    skyPlacementHouseTemplates,
    sunLeoHouseCores,
    venusLibraHouseCores,
    skyPlacementOwnerApprovedReaderFallbacks,
    skyPlanetFrames,
    skySignCopy,
    timingEventRows,
    weeklyRows,
    templateRows,
    skyPlacementV4SunStage
  };
}

function skyPlacementV4StageRecords(source) {
  if (
    source.editorial_status !== "proposed_v4"
    || source.implementation_status !== "stage_only"
    || source.owner_approved !== false
  ) {
    throw new Error("Sky Placement V4 staging source must remain proposed_v4, stage_only, and not owner-approved.");
  }

  const common = {
    surface: "sky",
    review_status: "needs_review",
    editorial_status: source.editorial_status,
    implementation_status: source.implementation_status,
    owner_approved: source.owner_approved,
    source_schema_version: source.schema_version,
    note: "Sky Placement V4 stage-only review record. It is excluded from every reader package until exact owner approval and a separate serving release."
  };
  const articles = (source.sun_articles ?? []).map((article) => ({
    ...common,
    ...article,
    contentKey: article.content_key,
    headline: `Sun in ${article.sign}`,
    content_role: "full_copy",
    body_you: article.placement_article,
    summary: article.tldr_takeaway,
    render_policy: "sky-placement-v4-stage-preview"
  }));
  const contexts = (source.seasonal_contexts ?? []).map((context) => ({
    ...common,
    ...context,
    contentKey: context.content_key,
    headline: `${context.sign} seasonal context (${context.hemisphere})`,
    content_role: "fallback_hook",
    body_you: context.copy,
    source_keys: [context.source],
    render_policy: "sky-placement-v4-stage-preview"
  }));
  const templates = (source.templates ?? []).map((template) => ({
    ...common,
    ...template,
    contentKey: `fallback-template/stage/${template.template_id}`,
    headline: template.purpose,
    content_role: "template",
    body_you: template.template,
    render_policy: "sky-placement-v4-stage-preview"
  }));

  return [...articles, ...contexts, ...templates];
}

function readerEligibleReviewStatus(row, allowBlank = false) {
  const reviewStatus = String(row.review_status ?? "").trim().toLowerCase();
  const contentKey = String(row.contentKey ?? "");
  const distributionRelease = skyPlacementReleaseByKey.get(contentKey)
    ?? skyPlacementReleaseByBatch.get(String(row.release_batch ?? "").trim());
  const distributionEligible = !isContinuousSkyPlacementRecord(row, contentKey)
    || (
      distributionRelease?.distribution_state === "serving"
      && distributionRelease.approved_keys?.includes(contentKey)
    );

  const editoriallyEligible = (
    ["approved", "approved_reuse", "reviewed"].includes(reviewStatus)
    || (allowBlank && !reviewStatus)
  );

  return editoriallyEligible
    && distributionEligible
    && (allowBlank && !reviewStatus ? true : isGovernedReaderEligible(row));
}

function packageRowsWithLatestEligibleOverride(rows, allowBlank = false) {
  const candidates = new Map();
  for (const row of rows) {
    const keyed = candidates.get(row.contentKey) ?? [];
    keyed.push(row);
    candidates.set(row.contentKey, keyed);
  }

  return [...candidates.values()]
    .map((keyed) => [...keyed]
      .reverse()
      .find((row) => readerEligibleReviewStatus(row, allowBlank)))
    .filter(Boolean);
}

function skyPlacementHouseTemplateReaderRows(rows) {
  return rows.map((row) => ({
    contentKey: row.contentKey,
    content_role: row.content_role,
    grammar_frame: row.grammar_frame,
    body_you: row.body_you,
    review_status: row.review_status,
    ...(row.source_release ? { source_release: row.source_release } : {}),
    ...(row.copy_protection ? { copy_protection: row.copy_protection } : {})
  }));
}

function approvedDailyGlanceVariants(source) {
  const keys = Object.fromEntries(Object.entries(source.keys ?? {}).map(([contentKey, set]) => {
    const eligible = (kind, item) => isGovernedReaderEligible({
      ...item,
      contentKey: `daily-glance-variant/${contentKey}/${kind}/${item.id}`
    });
    const headlines = (set.headlines ?? []).filter((item) => eligible("headline", item));
    const bodies = (set.bodies ?? []).filter((item) => eligible("body", item));
    const headlineIds = new Set(headlines.map((item) => item.id));
    const bodyIds = new Set(bodies.map((item) => item.id));
    const pairings = (set.pairings ?? []).filter((item) => (
      eligible("pairing", item)
      && headlineIds.has(item.headline_id)
      && bodyIds.has(item.body_id)
    ));

    return [contentKey, {
      pairing_policy: set.pairing_policy,
      headlines,
      bodies,
      pairings
    }];
  }));

  return {
    schema: source.schema,
    version: source.version,
    note: "Generated approved-only serving projection. Pending text and pairings are intentionally absent.",
    keys
  };
}

function readerPackageBundle(sources) {
  return {
    transitLib: {
      authoredCards: packageRowsWithLatestEligibleOverride([
        ...sources.authoredRows.authoredCards,
        ...sources.lunationBlendRows.authoredCards,
        ...sources.skyArticleRows.authoredCards,
        ...sources.weeklyRows,
        ...sources.timingEventRows.authoredCards
      ])
    },
    rowsFile: {
      hookRows: packageRowsWithLatestEligibleOverride([
        ...sources.bondLanguagePass2.rows,
        ...sources.sourceRows.hookRows,
        ...sources.lunationBlendRows.hookRows,
        ...sources.pairDailyFrames.rows,
        ...sources.pairDailyClauses.rows,
        ...sources.skyArticleRows.hookRows,
        ...sources.skyAspectPhrasebook.hookRows,
        ...sources.skyPlanetFrames.rows,
        ...sources.skyPlacementVoicePass.rows,
        ...sources.skySignCopy.rows,
        ...sources.skyPlacementOwnerApprovedReaderFallbacks.rows,
        ...skyPlacementHouseTemplateReaderRows(sources.skyPlacementHouseTemplates.rows),
        ...sources.sunLeoHouseCores.rows.map(({
          notes: _notes,
          source_keys: _sourceKeys,
          approved_via: _approvedVia,
          ...row
        }) => row),
        ...sources.venusLibraHouseCores.rows.map(({
          notes: _notes,
          source_keys: _sourceKeys,
          approved_via: _approvedVia,
          ...row
        }) => row)
      ]),
      vocabularyRows: packageRowsWithLatestEligibleOverride([
        ...sources.sourceRows.vocabularyRows,
        ...sources.placementInterimRows.vocabularyRows,
        ...sources.skyArticleRows.vocabularyRows
      ]),
      dailyGlanceVariants: approvedDailyGlanceVariants(sources.dailyGlanceVariants)
    },
    templatesFile: {
      templates: packageRowsWithLatestEligibleOverride([
        ...sources.templateRows.templates,
        ...sources.placementInterimRows.templates
      ], true)
    }
  };
}

function materializeRows(sources) {
  const rows = [
    ...sources.authoredRows.authoredCards.map((row) => mapPackageRecord(row, "authored-content")),
    ...sources.lunationBlendRows.authoredCards.map((row) => mapPackageRecord(row, "authored-content")),
    ...sources.lunationEclipseVariants.authoredCards.map((row) => mapPackageRecord(row, "authored-content")),
    ...sources.skyArticleRows.authoredCards.map((row) => mapPackageRecord(row, "authored-content")),
    ...sources.weeklyRows.map((row) => mapPackageRecord(row, "authored-content")),
    ...sources.timingEventRows.authoredCards.map((row) => mapPackageRecord(row, "authored-content")),
    ...sources.bondLanguagePass2.rows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.sourceRows.hookRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.lunationBlendRows.hookRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.pairDailyFrames.rows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.pairDailyClauses.rows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.skyArticleRows.hookRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.skyAspectPhrasebook.hookRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.skyPlanetFrames.rows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.skyPlacementVoicePass.rows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...(sources.skySignCopy.superseded_rows ?? []).map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.skySignCopy.rows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.skyPlacementOwnerApprovedFallbacks.rows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.skyPlacementHouseTemplates.rows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.sunLeoHouseCores.rows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.venusLibraHouseCores.rows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.sourceRows.vocabularyRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.placementInterimRows.vocabularyRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.skyArticleRows.vocabularyRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.templateRows.templates.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.placementInterimRows.templates.map((row) => mapPackageRecord(row, "fallback-system")),
    ...skyPlacementV4StageRecords(sources.skyPlacementV4SunStage)
      .map((row) => mapPackageRecord(row, "sky-placement-v4-stage")),
    ...sources.sourceRows.fallbackSourceRows.map((row) => mapPackageRecord(row, "source-material")),
    ...editorialSourceBankRecords(sources.editorialSourceBank)
      .map((row) => mapPackageRecord(row, "editorial-source-bank"))
  ];

  // Runtime maps use later rows as intentional overrides. Mirror that exact
  // precedence while emitting one deterministic dashboard row per content key.
  return [...new Map(rows.map((row) => [row.content_key, row])).values()];
}

async function upsertRows(rows) {
  const upserted = [];

  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key`, {
      method: "POST",
      headers: adminHeaders({
        prefer: "resolution=merge-duplicates,return=representation"
      }),
      body: JSON.stringify(batch)
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Fallback architecture V3 upsert failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    upserted.push(...payload);
  }

  return upserted;
}

function restString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}

function restInFilter(values) {
  return `in.(${values.map(restString).join(",")})`;
}

async function deleteStaleRows(currentRows) {
  const currentKeys = new Set(currentRows.map((row) => row.content_key));
  const staleKeys = [];

  for (const provider of [
    "tldrastro-fallback-architecture-v3",
    "tldrastro-fallback-architecture-v3-sky-placement"
  ]) {
    for (let offset = 0; ; offset += 1000) {
      const response = await fetch(
        `${supabaseUrl()}/rest/v1/generated_interpretations?select=id,content_key&provider=eq.${provider}&order=content_key.asc,id.asc&limit=1000&offset=${offset}`,
        {
          method: "GET",
          headers: adminHeaders()
        }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(`Fallback architecture V3 stale-row scan failed with ${response.status}: ${JSON.stringify(payload)}`);
      }

      for (const row of payload ?? []) {
        if (row?.content_key && !currentKeys.has(row.content_key)) {
          staleKeys.push({ contentKey: row.content_key, provider });
        }
      }

      if (!Array.isArray(payload) || payload.length < 1000) {
        break;
      }
    }
  }

  for (let index = 0; index < staleKeys.length; index += 100) {
    const batch = staleKeys.slice(index, index + 100);
    for (const provider of new Set(batch.map((row) => row.provider))) {
      const keys = batch.filter((row) => row.provider === provider).map((row) => row.contentKey);
      const response = await fetch(
        `${supabaseUrl()}/rest/v1/generated_interpretations?provider=eq.${provider}&content_key=${encodeURIComponent(restInFilter(keys))}`,
        {
          method: "DELETE",
          headers: adminHeaders({ prefer: "return=minimal" })
        }
      );
      const payload = await response.text().catch(() => "");

      if (!response.ok) {
        throw new Error(`Fallback architecture V3 stale-row delete failed with ${response.status}: ${payload}`);
      }
    }
  }

  return staleKeys.length;
}

async function readImportedRows() {
  const imported = [];

  for (const provider of [
    "tldrastro-fallback-architecture-v3",
    "tldrastro-fallback-architecture-v3-sky-placement"
  ]) {
    for (let offset = 0; ; offset += 1000) {
      const response = await fetch(
        `${supabaseUrl()}/rest/v1/generated_interpretations?select=id,content_key,surface,mode,status,lane,review_state,event_type,target_date,headline,summary,body,sections,block_type,facts,source_snapshot,prompt_version,provider,model&provider=eq.${provider}&order=content_key.asc,id.asc&limit=1000&offset=${offset}`,
        {
          method: "GET",
          headers: adminHeaders()
        }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(`Fallback architecture V3 verify failed with ${response.status}: ${JSON.stringify(payload)}`);
      }

      imported.push(...payload);

      if (!Array.isArray(payload) || payload.length < 1000) {
        break;
      }
    }
  }

  return imported;
}

function packageRole(row) {
  return row?.source_snapshot?.content_role ?? row?.facts?.content_role ?? "";
}

function packageBucket(row) {
  return row?.source_snapshot?.contentType ?? row?.facts?.packageBucket ?? "";
}

function importedCounts(rows) {
  return {
    authoredCards: countBy(rows, (row) => packageBucket(row) === "authored-content"),
    fallbackHooks: countBy(rows, (row) => packageBucket(row) === "fallback-system" && packageRole(row) === "fallback_hook"),
    vocabulary: countBy(rows, (row) => packageBucket(row) === "fallback-system" && packageRole(row) === "vocabulary"),
    templates: countBy(rows, (row) => packageBucket(row) === "fallback-system" && packageRole(row) === "template"),
    sourceMaterial: countBy(rows, (row) => packageBucket(row) === "source-material"),
    liveServing: countBy(rows, (row) => row.status === "LIVE" && row.lane === "serving" && row.review_state === null)
  };
}

function countBy(rows, predicate) {
  return rows.filter(predicate).length;
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])])
  );
}

function mirrorComparable(row) {
  return stableValue({
    content_key: row.content_key,
    surface: row.surface,
    mode: row.mode,
    status: row.status,
    lane: row.lane,
    review_state: row.review_state,
    event_type: row.event_type,
    target_date: row.target_date,
    headline: row.headline,
    summary: row.summary,
    body: row.body,
    sections: row.sections,
    block_type: row.block_type,
    facts: row.facts,
    source_snapshot: row.source_snapshot,
    prompt_version: row.prompt_version,
    provider: row.provider,
    model: row.model
  });
}

function verifyImportedMirror(expectedRows, expectedCounts, importedRows) {
  const liveCounts = importedCounts(importedRows);
  const expectedKeys = new Set(expectedRows.map((row) => row.content_key));
  const importedKeys = new Set(importedRows.map((row) => row.content_key));
  const missingKeys = [...expectedKeys].filter((key) => !importedKeys.has(key));
  const staleKeys = [...importedKeys].filter((key) => !expectedKeys.has(key));
  const expectedByKey = new Map(expectedRows.map((row) => [row.content_key, row]));
  const importedByKey = new Map(importedRows.map((row) => [row.content_key, row]));
  const changedKeys = [...expectedKeys].filter((key) => (
    importedByKey.has(key)
    && JSON.stringify(mirrorComparable(expectedByKey.get(key))) !== JSON.stringify(mirrorComparable(importedByKey.get(key)))
  ));

  const countMismatches = Object.entries(expectedCounts).flatMap(([bucket, expected]) => {
    const actual = liveCounts[bucket];
    return actual === expected ? [] : [{ bucket, expected, actual }];
  });
  if (
    countMismatches.length
    || missingKeys.length
    || staleKeys.length
    || importedRows.length !== expectedRows.length
    || changedKeys.length
  ) {
    throw new Error(`Dashboard mirror mismatch:\n${JSON.stringify({
      expectedRows: expectedRows.length,
      importedRows: importedRows.length,
      countMismatches,
      missingCount: missingKeys.length,
      missingKeys: missingKeys.slice(0, 50),
      staleCount: staleKeys.length,
      staleKeys: staleKeys.slice(0, 50),
      changedCount: changedKeys.length,
      changedKeys: changedKeys.slice(0, 50)
    }, null, 2)}`);
  }

  return liveCounts;
}

loadLocalWebEnv();

const packageSources = readPackageSources();
packageManifest = createPackageManifest(readerPackageBundle(packageSources), PACKAGE_VERSION);
packagePartitionManifests = {
  core: readJson("bundled-core-manifest-v3.json"),
  "sky-placement": readJson("bundled-sky-placement-manifest-v3.json")
};
if (
  packageManifest.contentHash !== readJson("bundled-manifest-v3.json").contentHash
  || packagePartitionManifests.core.packageVersion !== packageManifest.packageVersion
  || packagePartitionManifests["sky-placement"].packageVersion !== packageManifest.packageVersion
) {
  throw new Error("Fallback package or partition manifests are stale. Run npm run build:fallback-manifest.");
}
const allRows = materializeRows(packageSources);
const rows = contentKeyFilter
  ? allRows.filter((row) => row.content_key === contentKeyFilter)
  : allRows;
if (contentKeyFilter && rows.length !== 1) {
  throw new Error(`Expected one materialized row for ${contentKeyFilter}, found ${rows.length}.`);
}
const counts = {
  authoredCards: countBy(rows, (row) => row.source_snapshot.contentType === "authored-content"),
  fallbackHooks: countBy(rows, (row) => row.source_snapshot.contentType === "fallback-system" && row.source_snapshot.content_role === "fallback_hook"),
  vocabulary: countBy(rows, (row) => row.source_snapshot.contentType === "fallback-system" && row.source_snapshot.content_role === "vocabulary"),
  templates: countBy(rows, (row) => row.source_snapshot.contentType === "fallback-system" && row.source_snapshot.content_role === "template"),
  sourceMaterial: countBy(rows, (row) => row.source_snapshot.contentType === "source-material"),
  liveServing: countBy(rows, (row) => row.status === "LIVE" && row.lane === "serving" && row.review_state === null)
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify({
  schema: "tldrastro-fallback-architecture-v3-dashboard-rows",
  generatedAt: new Date().toISOString(),
  packageManifest,
  packagePartitionManifests,
  skyPlacementServingManifest,
  counts,
  rows
}, null, 2)}\n`);

console.log(`materialized ${rows.length} V3 dashboard rows -> ${path.relative(repoRoot, outPath)}`);
console.log(JSON.stringify({
  packageManifest: {
    packageVersion: packageManifest.packageVersion,
    contentHash: packageManifest.contentHash,
    keyManifestHash: packageManifest.keyManifestHash,
    keyCount: packageManifest.keyCount
  }
}, null, 2));
console.log(JSON.stringify(counts, null, 2));

if (apply) {
  const upserted = await upsertRows(rows);
  console.log(`upserted ${upserted.length} V3 dashboard rows into generated_interpretations`);
  if (!contentKeyFilter) {
    const deleted = await deleteStaleRows(rows);
    console.log(`deleted ${deleted} stale V3 dashboard rows from generated_interpretations`);
  }
}

if (verify) {
  const importedRows = (await readImportedRows())
    .filter((row) => !contentKeyFilter || row.content_key === contentKeyFilter);
  const liveCounts = verifyImportedMirror(rows, counts, importedRows);
  console.log(`verified ${importedRows.length} imported V3 dashboard rows in generated_interpretations`);
  console.log(JSON.stringify(liveCounts, null, 2));
}
