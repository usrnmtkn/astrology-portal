#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import {
  createPackageManifest,
  PACKAGE_VERSION
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { isGovernedReaderEligible } from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const outputPath = path.join(packageRoot, "bundled-manifest-v3.json");
const summaryOutputPath = path.join(packageRoot, "bundled-manifest-summary-v3.json");
const skyCoreOutputPath = path.join(packageRoot, "bundled-sky-core-rows-v3.json");
const deferredCoreOutputPath = path.join(packageRoot, "bundled-deferred-core-rows-v3.json");
const sharedPlacementOutputPath = path.join(packageRoot, "bundled-shared-placement-rows-v3.json");
const relationshipHookOutputPath = path.join(packageRoot, "bundled-relationship-hook-rows-v3.json");
const emptyHouseOutputPath = path.join(packageRoot, "bundled-empty-house-rows-v3.json");
const transitCoreAuthoredOutputPath = path.join(packageRoot, "bundled-transit-core-authored-cards-v3.json");
const relationshipAuthoredOutputPath = path.join(packageRoot, "bundled-relationship-authored-cards-v3.json");
const skyAuthoredOutputPath = path.join(packageRoot, "bundled-sky-authored-cards-v3.json");
const skyPlacementOutputPath = path.join(packageRoot, "bundled-sky-placement-rows-v3.json");
const skyPlacementHouseOutputPath = path.join(packageRoot, "bundled-sky-placement-house-rows-v3.json");
const initialReaderOutputPath = path.join(packageRoot, "bundled-initial-reader-rows-v3.json");
const lunationBookReaderOutputPath = path.join(packageRoot, "bundled-lunation-book-cards-v3.json");
const lunationEclipseSectionsReaderOutputPath = path.join(packageRoot, "bundled-lunation-eclipse-sections-v3.json");
const lunationEclipseHouseLayersReaderOutputPath = path.join(packageRoot, "bundled-lunation-eclipse-house-layers-v3.json");
const coreManifestOutputPath = path.join(packageRoot, "bundled-core-manifest-v3.json");
const skyPlacementManifestOutputPath = path.join(packageRoot, "bundled-sky-placement-manifest-v3.json");
const approvedServingProjectionOutputPath = path.join(
  packageRoot,
  "approved-serving-projection-v1.json"
);
const skyPlacementOwnerApprovedReaderOutputPath = path.join(
  packageRoot,
  "bundled-sky-placement-owner-approved-reader-v1.json"
);
const checkOnly = process.argv.includes("--check");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
}

function readSkySignCopySources() {
  return fs.readdirSync(path.join(packageRoot, "source-rows"))
    .filter((fileName) => /^sky-sign-copy-.*\.json$/u.test(fileName))
    .sort()
    .map((fileName) => readJson(`source-rows/${fileName}`));
}

const skyPlacementServingManifest = readJson("authored-inputs/sky-placement-serving-manifest-v1.json");
const skyPlacementReleaseByKey = new Map();
const skyPlacementReleaseByBatch = new Map();

if (skyPlacementServingManifest.runtime_capability !== "sky-placement-on-demand-v1") {
  throw new Error("Sky Placement serving manifest must require the sky-placement-on-demand-v1 runtime capability.");
}

for (const release of skyPlacementServingManifest.releases ?? []) {
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
      || !Array.isArray(approval.approved_keys)
      || JSON.stringify(approval.approved_keys) !== JSON.stringify(approvedKeys)
    ) {
      throw new Error(`Serving release ${release.release_id ?? "unknown"} is missing its exact owner-approved serving diff.`);
    }

    if (Number(release.release_batch) >= 2) {
      const migrationGate = release.migration_gate;

      if (
        release.transition !== "staged_to_serving"
        || release.required_runtime_capability !== skyPlacementServingManifest.runtime_capability
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
  if (!releaseBatch || skyPlacementReleaseByBatch.has(releaseBatch)) {
    throw new Error(`Sky Placement serving manifest has a missing or duplicate release_batch: ${releaseBatch || "unknown"}.`);
  }
  skyPlacementReleaseByBatch.set(releaseBatch, release);

  for (const contentKey of approvedKeys) {
    if (skyPlacementReleaseByKey.has(contentKey)) {
      throw new Error(`Sky Placement serving manifest repeats ${contentKey}.`);
    }
    skyPlacementReleaseByKey.set(contentKey, release);
  }
}

function isContinuousSkyPlacementRow(row) {
  return row?.render_policy === "sky-placement-continuous-v2"
    || String(row?.contentKey ?? "").startsWith("fallback-hook/sky-sign-copy/");
}

function isSkyPlacementDeferredHook(row) {
  const contentKey = String(row?.contentKey ?? "");
  return contentKey.startsWith("fallback-hook/sky-sign-copy/")
    || contentKey.startsWith("fallback-hook/sky-placement-sign/")
    || (
      contentKey.startsWith("fallback-hook/sky-placement-")
    );
}

function isEmptyHouseHook(row) {
  return String(row?.contentKey ?? "").startsWith("fallback-hook/empty-house/");
}

function isSharedPlacementHook(row) {
  return String(row?.contentKey ?? "").startsWith("fallback-hook/placement-sentence/");
}

function isRelationshipHook(row) {
  const contentKey = String(row?.contentKey ?? "");

  return [
    "fallback-hook/bond-effect-",
    "fallback-hook/compat-domain/",
    "fallback-hook/element-pattern/",
    "fallback-hook/planet-grates/",
    "fallback-hook/planet-mode/",
    "fallback-hook/synastry-aspect-type/",
    "fallback-hook/synastry-pair/"
  ].some((prefix) => contentKey.startsWith(prefix));
}

function isDistributionEligible(row) {
  if (!isContinuousSkyPlacementRow(row)) return true;
  const release = skyPlacementReleaseByKey.get(row.contentKey)
    ?? skyPlacementReleaseByBatch.get(String(row.release_batch ?? "").trim());
  return release?.distribution_state === "serving"
    && release.approved_keys?.includes(row.contentKey);
}

function skyPlacementOwnerApprovedReaderRows() {
  const source = readJson("source-rows/sky-placement-owner-approved-fallbacks-v1.json");

  return {
    schemaVersion: 1,
    generatedFrom: "source-rows/sky-placement-owner-approved-fallbacks-v1.json",
    rows: source.rows
      .filter((row) => row.rendered_as_body_copy !== false)
      .map(({ body_you: _legacyBody, note: _note, source_keys: _sourceKeys, approved_via: _approvedVia, ...row }) => row)
  };
}

function skyPlacementHouseTemplateReaderRows() {
  const source = readJson("source-rows/sky-placement-house-templates-v1.json");

  return source.rows.map((row) => ({
    contentKey: row.contentKey,
    content_role: row.content_role,
    grammar_frame: row.grammar_frame,
    body_you: row.body_you,
    review_status: row.review_status,
    ...(row.source_release ? { source_release: row.source_release } : {}),
    ...(row.copy_protection ? { copy_protection: row.copy_protection } : {})
  }));
}

function isReaderEligible(row, allowBlank = false) {
  const status = String(row.review_status ?? "").trim().toLowerCase();
  return (
    ["approved", "approved_reuse", "reviewed"].includes(status)
    || (allowBlank && !status)
  )
    && isDistributionEligible(row)
    && (allowBlank && !status ? true : isGovernedReaderEligible(row));
}

function latestReaderEligible(rows, allowBlank = false) {
  const candidates = new Map();

  for (const row of rows) {
    const keyed = candidates.get(row.contentKey) ?? [];
    keyed.push(row);
    candidates.set(row.contentKey, keyed);
  }

  return [...candidates.values()]
    .map((keyed) => [...keyed].reverse().find((row) => isReaderEligible(row, allowBlank)))
    .filter(Boolean);
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

function isSkyCoreHook(row) {
  return [
    "fallback-hook/sky-",
    "fallback-hook/lunation-",
    "fallback-hook/transit-retro/",
    "fallback-hook/transit-effect-soft/",
    "fallback-hook/transit-effect-hard/",
    "fallback-hook/dignity-line/"
  ].some((prefix) => row.contentKey.startsWith(prefix));
}

function isRelationshipAuthoredCard(row) {
  const contentKey = String(row?.contentKey ?? "");
  return [
    "authored/compat-",
    "authored/relationship-",
    "authored/synastry-"
  ].some((prefix) => contentKey.startsWith(prefix));
}

function fullReaderBundle() {
  const sourceRows = readJson("source-rows/fallback-source-rows-v3.json");
  const dailyGlanceVariants = approvedDailyGlanceVariants(
    readJson("source-rows/daily-glance-variants-v1.json")
  );
  const transitRows = readJson("source-rows/transit-synastry-rows-v1.json");
  const bondLanguage = readJson("source-rows/bond-language-pass-2.json");
  const lunationRows = readJson("source-rows/lunation-blend-units-v1.json");
  const placementRows = readJson("source-rows/placement-interim-fixes-v1.json");
  const pairDailyFrames = readJson("source-rows/pair-daily-frames-v1.json");
  const pairDailyClauses = readJson("source-rows/pair-daily-clauses-v1.json");
  const skyArticleRows = readJson("source-rows/sky-article-v1.json");
  const skyAspectRows = readJson("source-rows/sky-aspect-phrasebook-v1.json");
  const skyPlanetRows = readJson("source-rows/sky-planet-frames-v1.json");
  const skyPlacementRows = readJson("source-rows/sky-placement-inventories-voice-pass-v1.json");
  const skySignRows = readSkySignCopySources().flatMap((source) => source.rows ?? []);
  const skyPlacementOwnerApprovedRows = skyPlacementOwnerApprovedReaderRows();
  const skyPlacementHouseTemplateRows = skyPlacementHouseTemplateReaderRows();
  const sunLeoHouseCoreRows = readJson("source-rows/sun-leo-house-cores-v1.json").rows
    .map(({ notes: _notes, source_keys: _sourceKeys, approved_via: _approvedVia, ...row }) => row);
  const venusLibraHouseCoreRows = readJson("source-rows/venus-libra-house-cores-v1.json").rows
    .map(({ notes: _notes, source_keys: _sourceKeys, approved_via: _approvedVia, ...row }) => row);
  const timingEventRows = readJson("source-rows/timing-event-reader-copy-v2.json");
  const weeklyRows = readJson("source-rows/station-cards-week-openers-v1.json");
  const templates = readJson("templates/fallback-templates-v3.json");

  return {
    transitLib: {
      authoredCards: latestReaderEligible([
        ...transitRows.authoredCards,
        ...lunationRows.authoredCards,
        ...skyArticleRows.authoredCards,
        ...weeklyRows,
        ...timingEventRows.authoredCards
      ])
    },
    rowsFile: {
      hookRows: latestReaderEligible([
        ...bondLanguage.rows,
        ...sourceRows.hookRows,
        ...lunationRows.hookRows,
        ...pairDailyFrames.rows,
        ...pairDailyClauses.rows,
        ...skyArticleRows.hookRows,
        ...skyAspectRows.hookRows,
        ...skyPlanetRows.rows,
        ...skyPlacementRows.rows,
        ...skySignRows,
        ...skyPlacementOwnerApprovedRows.rows,
        ...skyPlacementHouseTemplateRows,
        ...sunLeoHouseCoreRows,
        ...venusLibraHouseCoreRows
      ]),
      vocabularyRows: latestReaderEligible([
        ...sourceRows.vocabularyRows,
        ...placementRows.vocabularyRows,
        ...skyArticleRows.vocabularyRows
      ]),
      dailyGlanceVariants
    },
    templatesFile: {
      templates: latestReaderEligible([
        ...templates.templates,
        ...placementRows.templates
      ], true)
    }
  };
}

const manifest = createPackageManifest(fullReaderBundle(), PACKAGE_VERSION);
const sourceRows = readJson("source-rows/fallback-source-rows-v3.json");
const dailyGlanceVariants = approvedDailyGlanceVariants(
  readJson("source-rows/daily-glance-variants-v1.json")
);
const transitRows = readJson("source-rows/transit-synastry-rows-v1.json");
const pairDailyFrames = readJson("source-rows/pair-daily-frames-v1.json");
const pairDailyClauses = readJson("source-rows/pair-daily-clauses-v1.json");
const skyAspectPhrasebookRows = readJson("source-rows/sky-aspect-phrasebook-v1.json");
const skyPlacementVoicePassRows = readJson("source-rows/sky-placement-inventories-voice-pass-v1.json");
const skyPlanetFrameRows = readJson("source-rows/sky-planet-frames-v1.json");
const skyPlacementOwnerApprovedRows = skyPlacementOwnerApprovedReaderRows();
const skyPlacementHouseTemplateRows = skyPlacementHouseTemplateReaderRows();
const sunLeoHouseCoreRows = readJson("source-rows/sun-leo-house-cores-v1.json").rows
  .map(({ notes: _notes, source_keys: _sourceKeys, approved_via: _approvedVia, ...row }) => row);
const venusLibraHouseCoreRows = readJson("source-rows/venus-libra-house-cores-v1.json").rows
  .map(({ notes: _notes, source_keys: _sourceKeys, approved_via: _approvedVia, ...row }) => row);
const skySignCopyRows = readSkySignCopySources().flatMap((source) => source.rows ?? []);
const lunationBlendRows = readJson("source-rows/lunation-blend-units-v1.json");
const placementInterimRows = readJson("source-rows/placement-interim-fixes-v1.json");
const skyArticleRows = readJson("source-rows/sky-article-v1.json");
const timingEventReaderRows = readJson("source-rows/timing-event-reader-copy-v2.json");
const weeklySourceRows = readJson("source-rows/station-cards-week-openers-v1.json");
const fallbackTemplateRows = readJson("templates/fallback-templates-v3.json");
const lunationBookRows = readJson("source-rows/lunation-book-cards-v1.json");
const lunationEclipseSectionRows = readJson("source-rows/lunation-eclipse-sections-v1.json");
const lunationEclipseHouseLayerRows = readJson("source-rows/lunation-eclipse-house-layers-v1.json");

function assertAuthoringSourceIntegrity() {
  const articles = skyArticleRows.authoredCards;
  const articleKeys = new Set(articles.map((row) => row.contentKey));
  const skyVocabulary = skyArticleRows.vocabularyRows;
  const skyVocabularyKeys = new Set(skyVocabulary.map((row) => row.contentKey));
  if (
    articles.length !== articleKeys.size
    || skyVocabulary.length !== 25
    || skyVocabularyKeys.size !== 25
    || skyVocabulary.some((row) => !row.contentKey.startsWith("fallback-vocab/sky-"))
    || skyArticleRows.hookRows.length !== 14
    || skyArticleRows.hookRows.some((row) => row.review_status !== "approved")
    || skyVocabulary.some((row) => row.review_status !== "approved")
  ) {
    throw new Error("Sky article authoring source integrity failed.");
  }
  const literalSkyRowDate = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{4})\b/u;
  if (skyArticleRows.hookRows.some((row) => literalSkyRowDate.test(row.body_you))) {
    throw new Error("Sky article authoring source contains a literal date in a reusable hook.");
  }
  const saturnArchive = articles.find((row) => row.contentKey === "sky-article/saturn/pisces/2023");
  const saturnAries = articles.find((row) => row.contentKey === "sky-article/saturn/aries/2026");
  if (
    !saturnArchive
    || saturnArchive.archive_only !== true
    || saturnArchive.key_dates.length !== 9
    || !saturnAries
    || saturnAries.review_status !== "approved"
    || saturnAries.article_variant !== "retrograde"
    || saturnAries.key_dates_mode !== "engine"
  ) {
    throw new Error("Sky article Saturn calibration integrity failed.");
  }

  const phrasebookRows = skyAspectPhrasebookRows.hookRows;
  const expectedFamilies = new Map([
    ["fallback-hook/sky-aspect-pair/", 30],
    ["fallback-hook/sky-aspect-exact/", 4],
    ["fallback-hook/sky-placement-sign/", 36],
    ["fallback-hook/sky-aspect-sign/", 78]
  ]);
  if (phrasebookRows.length !== 148 || phrasebookRows.some((row) => !["reviewed", "approved"].includes(row.review_status))) {
    throw new Error("Sky aspect phrasebook authoring source integrity failed.");
  }
  for (const [prefix, expected] of expectedFamilies) {
    if (phrasebookRows.filter((row) => row.contentKey.startsWith(prefix)).length !== expected) {
      throw new Error(`Sky aspect phrasebook ${prefix} coverage mismatch.`);
    }
  }

  const timingCards = timingEventReaderRows.authoredCards;
  if (
    timingEventReaderRows.version !== "timing-event-reader-copy-v2"
    || timingCards.length !== 4
    || new Set(timingCards.map((card) => card.contentKey)).size !== 4
    || timingCards.some((card) => card.review_status !== "approved")
    || timingCards.some((card) => card.content_role !== "full_copy")
    || timingCards.some((card) => !card.owner_authored)
    || timingCards.some((card) => !card.headline.trim() || !card.body.includes("\n\n"))
    || timingCards.some((card) => !card.source_keys.includes("owner/timing-event-reader-copy-v2-approved"))
  ) {
    throw new Error("Timing-event reader copy authoring source integrity failed.");
  }

  const stagedRulers = lunationBlendRows.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/lunation-ruler-house/"));
  if (
    stagedRulers.length !== 12
    || stagedRulers.filter((row) => row.review_status === "needs_review").length !== 11
    || stagedRulers.filter((row) => row.review_status === "approved").map((row) => row.contentKey).join("") !== "fallback-hook/lunation-ruler-house/11"
  ) {
    throw new Error("Lunation ruler authoring staging integrity failed.");
  }
}

assertAuthoringSourceIntegrity();
const skyCoreRows = {
  hookRows: latestReaderEligible(
    sourceRows.hookRows.filter((row) => isSkyCoreHook(row) && !isSkyPlacementDeferredHook(row))
  ),
  // Several reader modules construct shared vocabulary constants at module
  // evaluation time. Keep this relatively small bank eager until those
  // constants become route-local.
  vocabularyRows: latestReaderEligible(sourceRows.vocabularyRows)
};
const deferredCoreRows = {
  hookRows: latestReaderEligible([
    ...sourceRows.hookRows.filter((row) => (
      !isSkyCoreHook(row)
      && !isEmptyHouseHook(row)
      && !isSharedPlacementHook(row)
      && !isRelationshipHook(row)
    ))
  ]),
  vocabularyRows: [],
  dailyGlanceVariants
};
const sharedPlacementRows = {
  hookRows: latestReaderEligible(sourceRows.hookRows.filter(isSharedPlacementHook)),
  vocabularyRows: []
};
const relationshipHookRows = {
  hookRows: latestReaderEligible([
    ...sourceRows.hookRows.filter(isRelationshipHook),
    ...pairDailyFrames.rows,
    ...pairDailyClauses.rows
  ]),
  vocabularyRows: []
};
const emptyHouseRows = {
  hookRows: latestReaderEligible(sourceRows.hookRows.filter(isEmptyHouseHook)),
  vocabularyRows: []
};
const transitCoreAuthoredCards = {
  authoredCards: latestReaderEligible(
    transitRows.authoredCards.filter((row) => !isRelationshipAuthoredCard(row))
  )
};
const relationshipAuthoredCards = {
  authoredCards: latestReaderEligible(transitRows.authoredCards.filter(isRelationshipAuthoredCard))
};
const skyAuthoredCards = {
  authoredCards: latestReaderEligible(
    transitRows.authoredCards.filter((row) => row.contentKey.startsWith("authored/sky-"))
  )
};
const skyPlacementBaseRows = {
  hookRows: latestReaderEligible([
    ...sourceRows.hookRows.filter(isSkyPlacementDeferredHook),
    ...skyAspectPhrasebookRows.hookRows.filter((row) => (
      String(row.contentKey ?? "").startsWith("fallback-hook/sky-placement-sign/")
    )),
    ...(skyPlanetFrameRows.rows ?? []),
    ...(skyPlacementVoicePassRows.rows ?? []),
    ...skySignCopyRows,
    ...skyPlacementOwnerApprovedRows.rows
  ]).filter((row) => isGovernedReaderEligible(row)),
  vocabularyRows: []
};
const skyPlacementHouseRows = {
  hookRows: latestReaderEligible([
    ...skyPlacementHouseTemplateRows,
    ...sunLeoHouseCoreRows,
    ...venusLibraHouseCoreRows
  ]).filter((row) => isGovernedReaderEligible(row)),
  vocabularyRows: []
};
const skyPlacementRows = {
  hookRows: latestReaderEligible([
    ...skyPlacementBaseRows.hookRows,
    ...skyPlacementHouseRows.hookRows
  ]),
  vocabularyRows: []
};
function approvedSupplement(baseRows, additionalRows) {
  const baseByKey = new Map(baseRows.map((row) => [row.contentKey, row]));
  return latestReaderEligible([...baseRows, ...additionalRows]).filter((row) => {
    const base = baseByKey.get(row.contentKey);
    return !base || !isDeepStrictEqual(base, row);
  });
}
const initialReaderRows = {
  authoredCards: latestReaderEligible([
    ...lunationBlendRows.authoredCards,
    ...skyArticleRows.authoredCards,
    ...weeklySourceRows,
    ...timingEventReaderRows.authoredCards
  ]),
  hookRows: approvedSupplement(skyCoreRows.hookRows, [
    ...lunationBlendRows.hookRows,
    ...skyArticleRows.hookRows,
    ...skyAspectPhrasebookRows.hookRows.filter(
      (row) => !row.contentKey.startsWith("fallback-hook/sky-placement-sign/")
    )
  ]),
  vocabularyRows: approvedSupplement(skyCoreRows.vocabularyRows, [
    ...placementInterimRows.vocabularyRows,
    ...skyArticleRows.vocabularyRows
  ]),
  templates: latestReaderEligible([
    ...fallbackTemplateRows.templates,
    ...placementInterimRows.templates
  ], true)
};
const lunationBookReaderRows = {
  schema: "tldrastro-approved-lunation-book-reader/v1",
  packageVersion: PACKAGE_VERSION,
  sources: {
    book: { schema: lunationBookRows.schema, count: lunationBookRows.count },
    eclipseSections: { schema: lunationEclipseSectionRows.schema, count: lunationEclipseSectionRows.count },
    eclipseHouseLayers: { schema: lunationEclipseHouseLayerRows.schema, count: lunationEclipseHouseLayerRows.count }
  },
  bookCards: latestReaderEligible(lunationBookRows.authoredCards),
  eclipseSections: latestReaderEligible(lunationEclipseSectionRows.authoredCards),
  eclipseHouseLayers: latestReaderEligible(lunationEclipseHouseLayerRows.authoredCards)
};

function assertApprovedOnlyRows(label, rows, { allowBlank = false } = {}) {
  const ineligible = rows.filter((row) => !isReaderEligible(row, allowBlank));
  if (ineligible.length > 0) {
    throw new Error(
      `${label} contains non-serving rows: ${ineligible.slice(0, 5).map((row) => row.contentKey).join(", ")}`
    );
  }
}

function assertApprovedOnlyVariants(source) {
  for (const [contentKey, set] of Object.entries(source.keys ?? {})) {
    const headlineIds = new Set(set.headlines.map((item) => item.id));
    const bodyIds = new Set(set.bodies.map((item) => item.id));
    const all = [
      ...set.headlines.map((item) => ["headline", item]),
      ...set.bodies.map((item) => ["body", item]),
      ...set.pairings.map((item) => ["pairing", item])
    ];
    for (const [kind, item] of all) {
      if (!isGovernedReaderEligible({
        ...item,
        contentKey: `daily-glance-variant/${contentKey}/${kind}/${item.id}`
      })) {
        throw new Error(`Approved serving projection contains an ineligible daily variant: ${contentKey}/${kind}/${item.id}`);
      }
    }
    for (const pairing of set.pairings) {
      if (!headlineIds.has(pairing.headline_id) || !bodyIds.has(pairing.body_id)) {
        throw new Error(`Approved serving projection contains an unresolved daily pairing: ${contentKey}/${pairing.id}`);
      }
    }
  }
}

assertApprovedOnlyRows("sky core hooks", skyCoreRows.hookRows);
assertApprovedOnlyRows("sky core vocabulary", skyCoreRows.vocabularyRows);
assertApprovedOnlyRows("deferred core hooks", deferredCoreRows.hookRows);
assertApprovedOnlyRows("shared placement hooks", sharedPlacementRows.hookRows);
assertApprovedOnlyRows("relationship hooks", relationshipHookRows.hookRows);
assertApprovedOnlyRows("empty-house hooks", emptyHouseRows.hookRows);
assertApprovedOnlyRows("transit authored cards", transitCoreAuthoredCards.authoredCards);
assertApprovedOnlyRows("relationship authored cards", relationshipAuthoredCards.authoredCards);
assertApprovedOnlyRows("sky authored cards", skyAuthoredCards.authoredCards);
assertApprovedOnlyRows("sky-placement hooks", skyPlacementRows.hookRows);
assertApprovedOnlyRows("initial reader authored cards", initialReaderRows.authoredCards);
assertApprovedOnlyRows("initial reader hooks", initialReaderRows.hookRows);
assertApprovedOnlyRows("initial reader vocabulary", initialReaderRows.vocabularyRows);
assertApprovedOnlyRows("initial reader templates", initialReaderRows.templates, { allowBlank: true });
assertApprovedOnlyRows("lunation book reader cards", [
  ...lunationBookReaderRows.bookCards,
  ...lunationBookReaderRows.eclipseSections,
  ...lunationBookReaderRows.eclipseHouseLayers
]);
assertApprovedOnlyVariants(dailyGlanceVariants);

const skyPlacementKeySet = new Set(skyPlacementRows.hookRows.map((row) => row.contentKey));
const completeReaderBundle = fullReaderBundle();
const coreReaderBundle = {
  transitLib: completeReaderBundle.transitLib,
  templatesFile: completeReaderBundle.templatesFile,
  rowsFile: {
    hookRows: completeReaderBundle.rowsFile.hookRows.filter((row) => !skyPlacementKeySet.has(row.contentKey)),
    vocabularyRows: completeReaderBundle.rowsFile.vocabularyRows,
    dailyGlanceVariants: completeReaderBundle.rowsFile.dailyGlanceVariants
  }
};
const skyPlacementReaderBundle = {
  transitLib: { authoredCards: [] },
  templatesFile: { templates: [] },
  rowsFile: skyPlacementRows
};
const coreManifest = createPackageManifest(coreReaderBundle, PACKAGE_VERSION);
const skyPlacementManifest = createPackageManifest(skyPlacementReaderBundle, PACKAGE_VERSION);
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
const summary = {
  packageVersion: manifest.packageVersion,
  contentHash: manifest.contentHash,
  keyManifestHash: manifest.keyManifestHash,
  keyCount: manifest.keyCount,
  runtimeCapability: skyPlacementServingManifest.runtime_capability,
  partitions: {
    core: {
      contentHash: coreManifest.contentHash,
      keyManifestHash: coreManifest.keyManifestHash,
      keyCount: coreManifest.keyCount
    },
    skyPlacement: {
      contentHash: skyPlacementManifest.contentHash,
      keyManifestHash: skyPlacementManifest.keyManifestHash,
      keyCount: skyPlacementManifest.keyCount
    }
  }
};
const serializedSummary = `${JSON.stringify(summary, null, 2)}\n`;
const serializedSkyCore = `${JSON.stringify(skyCoreRows, null, 2)}\n`;
const serializedDeferredCore = `${JSON.stringify(deferredCoreRows, null, 2)}\n`;
const serializedSharedPlacement = `${JSON.stringify(sharedPlacementRows, null, 2)}\n`;
const serializedRelationshipHooks = `${JSON.stringify(relationshipHookRows, null, 2)}\n`;
const serializedEmptyHouse = `${JSON.stringify(emptyHouseRows, null, 2)}\n`;
const serializedTransitCoreAuthored = `${JSON.stringify(transitCoreAuthoredCards, null, 2)}\n`;
const serializedRelationshipAuthored = `${JSON.stringify(relationshipAuthoredCards, null, 2)}\n`;
const serializedSkyAuthored = `${JSON.stringify(skyAuthoredCards, null, 2)}\n`;
const serializedSkyPlacement = `${JSON.stringify(skyPlacementBaseRows, null, 2)}\n`;
const serializedSkyPlacementHouses = `${JSON.stringify(skyPlacementHouseRows, null, 2)}\n`;
const serializedInitialReader = `${JSON.stringify(initialReaderRows, null, 2)}\n`;
const serializedLunationBookReader = `${JSON.stringify({
  schema: "tldrastro-approved-lunation-book-cards/v1",
  packageVersion: PACKAGE_VERSION,
  source: lunationBookReaderRows.sources.book,
  authoredCards: lunationBookReaderRows.bookCards
}, null, 2)}\n`;
const serializedLunationEclipseSectionsReader = `${JSON.stringify({
  schema: "tldrastro-approved-lunation-eclipse-sections/v1",
  packageVersion: PACKAGE_VERSION,
  source: lunationBookReaderRows.sources.eclipseSections,
  authoredCards: lunationBookReaderRows.eclipseSections
}, null, 2)}\n`;
const serializedLunationEclipseHouseLayersReader = `${JSON.stringify({
  schema: "tldrastro-approved-lunation-eclipse-house-layers/v1",
  packageVersion: PACKAGE_VERSION,
  source: lunationBookReaderRows.sources.eclipseHouseLayers,
  authoredCards: lunationBookReaderRows.eclipseHouseLayers
}, null, 2)}\n`;
const serializedCoreManifest = `${JSON.stringify(coreManifest, null, 2)}\n`;
const serializedSkyPlacementManifest = `${JSON.stringify(skyPlacementManifest, null, 2)}\n`;
const skyPlacementOwnerApprovedReader = skyPlacementOwnerApprovedReaderRows();
const serializedSkyPlacementOwnerApprovedReader = `${JSON.stringify(skyPlacementOwnerApprovedReader, null, 2)}\n`;
const approvedServingProjection = {
  schema: "tldrastro-approved-serving-projection/v1",
  packageVersion: PACKAGE_VERSION,
  policy: {
    eligibleReviewStatuses: ["approved", "approved_reuse", "reviewed"],
    exactApprovalPrefixes: [
      "authored/transit-",
      "fallback-hook/daily-",
      "fallback-hook/natal-aspect-lived/",
      "fallback-hook/synastry-pair/",
      "daily-glance-variant/"
    ],
    pendingRowsPresent: false,
    runtimeFilter: "defense-in-depth"
  },
  manifest: {
    contentHash: manifest.contentHash,
    keyManifestHash: manifest.keyManifestHash,
    keyCount: manifest.keyCount
  },
  partitions: {
    skyCore: {
      file: "bundled-sky-core-rows-v3.json",
      hookRows: skyCoreRows.hookRows.length,
      vocabularyRows: skyCoreRows.vocabularyRows.length
    },
    deferredCore: {
      file: "bundled-deferred-core-rows-v3.json",
      hookRows: deferredCoreRows.hookRows.length
    },
    sharedPlacement: {
      file: "bundled-shared-placement-rows-v3.json",
      hookRows: sharedPlacementRows.hookRows.length
    },
    relationshipHooks: {
      file: "bundled-relationship-hook-rows-v3.json",
      hookRows: relationshipHookRows.hookRows.length
    },
    emptyHouses: {
      file: "bundled-empty-house-rows-v3.json",
      hookRows: emptyHouseRows.hookRows.length
    },
    transitCards: {
      file: "bundled-transit-core-authored-cards-v3.json",
      authoredCards: transitCoreAuthoredCards.authoredCards.length
    },
    relationshipCards: {
      file: "bundled-relationship-authored-cards-v3.json",
      authoredCards: relationshipAuthoredCards.authoredCards.length
    },
    skyCards: {
      file: "bundled-sky-authored-cards-v3.json",
      authoredCards: skyAuthoredCards.authoredCards.length
    },
    skyPlacementBase: {
      file: "bundled-sky-placement-rows-v3.json",
      hookRows: skyPlacementBaseRows.hookRows.length
    },
    skyPlacementHouses: {
      file: "bundled-sky-placement-house-rows-v3.json",
      hookRows: skyPlacementHouseRows.hookRows.length
    },
    initialReader: {
      file: "bundled-initial-reader-rows-v3.json",
      authoredCards: initialReaderRows.authoredCards.length,
      hookRows: initialReaderRows.hookRows.length,
      vocabularyRows: initialReaderRows.vocabularyRows.length,
      templates: initialReaderRows.templates.length
    },
    lunationBookReader: {
      file: "bundled-lunation-book-cards-v3.json",
      authoredCards: lunationBookReaderRows.bookCards.length
    },
    lunationEclipseSectionsReader: {
      file: "bundled-lunation-eclipse-sections-v3.json",
      authoredCards: lunationBookReaderRows.eclipseSections.length
    },
    lunationEclipseHouseLayersReader: {
      file: "bundled-lunation-eclipse-house-layers-v3.json",
      authoredCards: lunationBookReaderRows.eclipseHouseLayers.length
    }
  }
};
const serializedApprovedServingProjection = `${JSON.stringify(approvedServingProjection, null, 2)}\n`;

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  const existingSummary = fs.existsSync(summaryOutputPath) ? fs.readFileSync(summaryOutputPath, "utf8") : "";
  const existingSkyCore = fs.existsSync(skyCoreOutputPath) ? fs.readFileSync(skyCoreOutputPath, "utf8") : "";
  const existingDeferredCore = fs.existsSync(deferredCoreOutputPath) ? fs.readFileSync(deferredCoreOutputPath, "utf8") : "";
  const existingSharedPlacement = fs.existsSync(sharedPlacementOutputPath) ? fs.readFileSync(sharedPlacementOutputPath, "utf8") : "";
  const existingRelationshipHooks = fs.existsSync(relationshipHookOutputPath) ? fs.readFileSync(relationshipHookOutputPath, "utf8") : "";
  const existingEmptyHouse = fs.existsSync(emptyHouseOutputPath) ? fs.readFileSync(emptyHouseOutputPath, "utf8") : "";
  const existingTransitCoreAuthored = fs.existsSync(transitCoreAuthoredOutputPath) ? fs.readFileSync(transitCoreAuthoredOutputPath, "utf8") : "";
  const existingRelationshipAuthored = fs.existsSync(relationshipAuthoredOutputPath) ? fs.readFileSync(relationshipAuthoredOutputPath, "utf8") : "";
  const existingSkyAuthored = fs.existsSync(skyAuthoredOutputPath) ? fs.readFileSync(skyAuthoredOutputPath, "utf8") : "";
  const existingSkyPlacement = fs.existsSync(skyPlacementOutputPath) ? fs.readFileSync(skyPlacementOutputPath, "utf8") : "";
  const existingSkyPlacementHouses = fs.existsSync(skyPlacementHouseOutputPath)
    ? fs.readFileSync(skyPlacementHouseOutputPath, "utf8")
    : "";
  const existingInitialReader = fs.existsSync(initialReaderOutputPath) ? fs.readFileSync(initialReaderOutputPath, "utf8") : "";
  const existingLunationBookReader = fs.existsSync(lunationBookReaderOutputPath) ? fs.readFileSync(lunationBookReaderOutputPath, "utf8") : "";
  const existingLunationEclipseSectionsReader = fs.existsSync(lunationEclipseSectionsReaderOutputPath)
    ? fs.readFileSync(lunationEclipseSectionsReaderOutputPath, "utf8")
    : "";
  const existingLunationEclipseHouseLayersReader = fs.existsSync(lunationEclipseHouseLayersReaderOutputPath)
    ? fs.readFileSync(lunationEclipseHouseLayersReaderOutputPath, "utf8")
    : "";
  const existingCoreManifest = fs.existsSync(coreManifestOutputPath) ? fs.readFileSync(coreManifestOutputPath, "utf8") : "";
  const existingSkyPlacementManifest = fs.existsSync(skyPlacementManifestOutputPath) ? fs.readFileSync(skyPlacementManifestOutputPath, "utf8") : "";
  const existingSkyPlacementOwnerApprovedReader = fs.existsSync(skyPlacementOwnerApprovedReaderOutputPath)
    ? fs.readFileSync(skyPlacementOwnerApprovedReaderOutputPath, "utf8")
    : "";
  const existingApprovedServingProjection = fs.existsSync(approvedServingProjectionOutputPath)
    ? fs.readFileSync(approvedServingProjectionOutputPath, "utf8")
    : "";

  if (
    existing !== serialized
    || existingSummary !== serializedSummary
    || existingSkyCore !== serializedSkyCore
    || existingDeferredCore !== serializedDeferredCore
    || existingSharedPlacement !== serializedSharedPlacement
    || existingRelationshipHooks !== serializedRelationshipHooks
    || existingEmptyHouse !== serializedEmptyHouse
    || existingTransitCoreAuthored !== serializedTransitCoreAuthored
    || existingRelationshipAuthored !== serializedRelationshipAuthored
    || existingSkyAuthored !== serializedSkyAuthored
    || existingSkyPlacement !== serializedSkyPlacement
    || existingSkyPlacementHouses !== serializedSkyPlacementHouses
    || existingInitialReader !== serializedInitialReader
    || existingLunationBookReader !== serializedLunationBookReader
    || existingLunationEclipseSectionsReader !== serializedLunationEclipseSectionsReader
    || existingLunationEclipseHouseLayersReader !== serializedLunationEclipseHouseLayersReader
    || existingCoreManifest !== serializedCoreManifest
    || existingSkyPlacementManifest !== serializedSkyPlacementManifest
    || existingSkyPlacementOwnerApprovedReader !== serializedSkyPlacementOwnerApprovedReader
    || existingApprovedServingProjection !== serializedApprovedServingProjection
  ) {
    console.error("Bundled fallback manifest is stale. Run npm run build:fallback-manifest.");
    process.exit(1);
  }

  console.log(`Bundled fallback manifest is current (${manifest.keyCount} keys).`);
} else {
  fs.writeFileSync(outputPath, serialized);
  fs.writeFileSync(summaryOutputPath, serializedSummary);
  fs.writeFileSync(skyCoreOutputPath, serializedSkyCore);
  fs.writeFileSync(deferredCoreOutputPath, serializedDeferredCore);
  fs.writeFileSync(sharedPlacementOutputPath, serializedSharedPlacement);
  fs.writeFileSync(relationshipHookOutputPath, serializedRelationshipHooks);
  fs.writeFileSync(emptyHouseOutputPath, serializedEmptyHouse);
  fs.writeFileSync(transitCoreAuthoredOutputPath, serializedTransitCoreAuthored);
  fs.writeFileSync(relationshipAuthoredOutputPath, serializedRelationshipAuthored);
  fs.writeFileSync(skyAuthoredOutputPath, serializedSkyAuthored);
  fs.writeFileSync(skyPlacementOutputPath, serializedSkyPlacement);
  fs.writeFileSync(skyPlacementHouseOutputPath, serializedSkyPlacementHouses);
  fs.writeFileSync(initialReaderOutputPath, serializedInitialReader);
  fs.writeFileSync(lunationBookReaderOutputPath, serializedLunationBookReader);
  fs.writeFileSync(lunationEclipseSectionsReaderOutputPath, serializedLunationEclipseSectionsReader);
  fs.writeFileSync(lunationEclipseHouseLayersReaderOutputPath, serializedLunationEclipseHouseLayersReader);
  fs.writeFileSync(coreManifestOutputPath, serializedCoreManifest);
  fs.writeFileSync(skyPlacementManifestOutputPath, serializedSkyPlacementManifest);
  fs.writeFileSync(skyPlacementOwnerApprovedReaderOutputPath, serializedSkyPlacementOwnerApprovedReader);
  fs.writeFileSync(approvedServingProjectionOutputPath, serializedApprovedServingProjection);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${manifest.keyCount} keys).`);
  console.log(`Wrote ${path.relative(repoRoot, summaryOutputPath)}.`);
  console.log(`Wrote ${path.relative(repoRoot, skyCoreOutputPath)} (${skyCoreRows.hookRows.length} hooks, ${skyCoreRows.vocabularyRows.length} vocabulary rows).`);
  console.log(`Wrote ${path.relative(repoRoot, deferredCoreOutputPath)} (${deferredCoreRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, sharedPlacementOutputPath)} (${sharedPlacementRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, relationshipHookOutputPath)} (${relationshipHookRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, emptyHouseOutputPath)} (${emptyHouseRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, transitCoreAuthoredOutputPath)} (${transitCoreAuthoredCards.authoredCards.length} authored cards).`);
  console.log(`Wrote ${path.relative(repoRoot, relationshipAuthoredOutputPath)} (${relationshipAuthoredCards.authoredCards.length} authored cards).`);
  console.log(`Wrote ${path.relative(repoRoot, skyAuthoredOutputPath)} (${skyAuthoredCards.authoredCards.length} authored cards).`);
  console.log(`Wrote ${path.relative(repoRoot, skyPlacementOutputPath)} (${skyPlacementBaseRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, skyPlacementHouseOutputPath)} (${skyPlacementHouseRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, initialReaderOutputPath)} (${initialReaderRows.authoredCards.length} cards, ${initialReaderRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, lunationBookReaderOutputPath)} (${lunationBookReaderRows.bookCards.length} cards).`);
  console.log(`Wrote ${path.relative(repoRoot, lunationEclipseSectionsReaderOutputPath)} (${lunationBookReaderRows.eclipseSections.length} cards).`);
  console.log(`Wrote ${path.relative(repoRoot, lunationEclipseHouseLayersReaderOutputPath)} (${lunationBookReaderRows.eclipseHouseLayers.length} cards).`);
  console.log(`Wrote ${path.relative(repoRoot, coreManifestOutputPath)} (${coreManifest.keyCount} keys).`);
  console.log(`Wrote ${path.relative(repoRoot, skyPlacementManifestOutputPath)} (${skyPlacementManifest.keyCount} keys).`);
  console.log(`Wrote ${path.relative(repoRoot, skyPlacementOwnerApprovedReaderOutputPath)} (${skyPlacementOwnerApprovedReader.rows.length} metadata-free reader rows).`);
  console.log(`Wrote ${path.relative(repoRoot, approvedServingProjectionOutputPath)} (approved-only partition contract).`);
}
