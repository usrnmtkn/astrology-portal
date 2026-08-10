#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { validateAll, listJsonFiles, listDirectJsonFiles, readJson } = require("./validate");

const root = path.resolve(__dirname, "..");
const dataRoot = path.join(root, "data");
const distRoot = path.join(root, "dist");
const entriesRoot = path.join(distRoot, "entries");
const packageJson = readJson(path.join(root, "package.json"));

function ensureCleanDist() {
  fs.mkdirSync(distRoot, { recursive: true });
  for (const name of fs.readdirSync(distRoot)) {
    if (name === ".gitkeep") continue;
    fs.rmSync(path.join(distRoot, name), { recursive: true, force: true });
  }
  fs.mkdirSync(entriesRoot, { recursive: true });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function loadPrimitiveCollections() {
  const primitives = {};
  for (const filePath of listJsonFiles(path.join(dataRoot, "primitives"))) {
    const collection = readJson(filePath);
    primitives[collection.kind] = collection.entries;
  }
  return primitives;
}

function loadEntries(dir) {
  return listJsonFiles(path.join(dataRoot, dir)).map((filePath) => readJson(filePath));
}

function loadDirectEntries(dir) {
  return listDirectJsonFiles(path.join(dataRoot, dir)).map((filePath) => readJson(filePath));
}

function loadJsonTree(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];

  return listJsonFiles(absoluteDir).map((filePath) => ({
    path: path.relative(root, filePath),
    ...readJson(filePath)
  }));
}

function loadVoiceProfiles() {
  const voiceRoot = path.join(root, "voice");
  if (!fs.existsSync(voiceRoot)) return {};

  const profiles = {};
  for (const voiceId of fs.readdirSync(voiceRoot)) {
    const voiceDir = path.join(voiceRoot, voiceId);
    if (!fs.statSync(voiceDir).isDirectory()) continue;

    const styleGuidePath = path.join(voiceDir, "style-guide.md");
    profiles[voiceId] = {
      voiceId,
      styleGuide: fs.existsSync(styleGuidePath) ? fs.readFileSync(styleGuidePath, "utf8") : "",
      bannedPhrases: fs.existsSync(path.join(voiceDir, "banned-phrases.json"))
        ? readJson(path.join(voiceDir, "banned-phrases.json"))
        : [],
      examples: fs.existsSync(path.join(voiceDir, "examples.json"))
        ? readJson(path.join(voiceDir, "examples.json"))
        : [],
      toneConfig: fs.existsSync(path.join(voiceDir, "tone-config.json"))
        ? readJson(path.join(voiceDir, "tone-config.json"))
        : {}
    };
  }

  return profiles;
}

function isRewriteCorpusEntry(entry) {
  return entry.path?.startsWith("generated/tldr-astro/rewrite-corpora/");
}

function safeCategory(category) {
  return category.replace(/[^a-z0-9-]/gi, "_");
}

function addEntry(index, entry, category) {
  const key = `${category}/${entry.id}`;
  const file = `entries/${safeCategory(category)}/${entry.id}.json`;
  index.entries[key] = {
    id: entry.id,
    category,
    file
  };
  if (!index.byId[entry.id]) index.byId[entry.id] = [];
  index.byId[entry.id].push(key);
  writeJson(path.join(distRoot, file), entry);
}

function withBundleMetadata(packageJson, generatedAt, collections) {
  return {
    version: packageJson.version,
    generatedAt,
    ...collections
  };
}

function pick(entry, keys) {
  return Object.fromEntries(keys
    .filter((key) => entry[key] !== undefined)
    .map((key) => [key, entry[key]]));
}

function pruneModifiersForWeb(modifiers) {
  return modifiers
    .map((modifier) => {
      const retrogrades = modifier.classes?.retrogrades;

      if (!retrogrades) {
        return null;
      }

      return {
        id: modifier.id,
        classes: {
          retrogrades: Object.fromEntries(Object.entries(retrogrades).map(([key, retrograde]) => [
            key,
            pick(retrograde, ["id", "planet", "plainTranslation", "status"])
          ]))
        },
        status: modifier.status
      };
    })
    .filter(Boolean);
}

function runtimeEligiblePlacements(placements) {
  return placements.filter((entry) => entry.runtimeEligible !== false);
}

function webSkyKnowledge(packageJson, generatedAt, collections) {
  return withBundleMetadata(packageJson, generatedAt, {
    primitives: collections.primitives,
    transits: collections.transits.map((entry) => pick(entry, [
      "id",
      "transiting",
      "aspect",
      "other",
      "readerCopy",
      "business",
      "shadow",
      "status"
    ])),
    placements: runtimeEligiblePlacements(collections.placements).map((entry) => pick(entry, [
      "id",
      "kind",
      "planet",
      "point",
      "key",
      "sign",
      "house",
      "tldr",
      "gift",
      "challenge",
      "status"
    ])),
    pointPlacements: collections.pointPlacements.map((entry) => pick(entry, [
      "id",
      "kind",
      "planet",
      "point",
      "key",
      "sign",
      "house",
      "tldr",
      "gift",
      "challenge",
      "note",
      "status"
    ])),
    modifiers: pruneModifiersForWeb(collections.modifiers),
    voiceContent: collections.voiceContent
  });
}

function webNatalKnowledge(packageJson, generatedAt, collections) {
  return withBundleMetadata(packageJson, generatedAt, {
    primitives: collections.primitives,
    insightCards: collections.insightCards.map((entry) => pick(entry, [
      "id",
      "kind",
      "summary",
      "body",
      "gift",
      "shadow",
      "integration",
      "lifeAreas",
      "intensity",
      "sourceFactors",
      "status"
    ])),
    transitNatal: collections.transitNatal.map((entry) => pick(entry, [
      "id",
      "transiting",
      "natal",
      "aspect",
      "plainTranslation",
      "policy",
      "readerCopy",
      "status"
    ])),
    placements: runtimeEligiblePlacements(collections.placements).map((entry) => pick(entry, [
      "id",
      "kind",
      "planet",
      "point",
      "key",
      "sign",
      "house",
      "tldr",
      "body",
      "gift",
      "challenge",
      "status"
    ])),
    pointPlacements: collections.pointPlacements.map((entry) => pick(entry, [
      "id",
      "kind",
      "planet",
      "point",
      "key",
      "sign",
      "house",
      "tldr",
      "body",
      "gift",
      "challenge",
      "note",
      "status"
    ])),
    angles: collections.angles.map((entry) => pick(entry, [
      "id",
      "kind",
      "point",
      "sign",
      "tldr",
      "body",
      "approach",
      "shadow",
      "note",
      "status"
    ])),
    modifiers: pruneModifiersForWeb(collections.modifiers),
    voiceContent: collections.voiceContent
  });
}

function webRelationshipKnowledge(packageJson, generatedAt, collections) {
  return withBundleMetadata(packageJson, generatedAt, {
    primitives: collections.primitives,
    synastryAspects: collections.synastryAspects.map((entry) => pick(entry, [
      "id",
      "planetA",
      "planetB",
      "aspect",
      "plainTranslation",
      "summaryShort",
      "summaryDeep",
      "tension",
      "advice",
      "policy",
      "status"
    ])),
    synastryHouseOverlays: collections.synastryHouseOverlays.map((entry) => pick(entry, [
      "id",
      "planet",
      "house",
      "plainTranslation",
      "summaryShort",
      "summaryDeep",
      "tension",
      "advice",
      "policy",
      "status"
    ])),
    composite: collections.composite.map((entry) => pick(entry, [
      "id",
      "placementType",
      "planet",
      "aspect",
      "sign",
      "house",
      "plainTranslation",
      "policy",
      "status"
    ])),
    voiceContent: collections.voiceContent
  });
}

function build() {
  const errors = validateAll();
  if (errors.length > 0) {
    console.error(`Validation failed: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  ensureCleanDist();

  const primitives = loadPrimitiveCollections();
  const pairs = loadEntries("pairs");
  const transits = loadDirectEntries("transits");
  const transitNatal = loadEntries(path.join("transits", "natal"));
  const transitHouses = loadEntries(path.join("transits", "house"));
  const planetary = loadEntries("planetary");
  const points = loadDirectEntries("points");
  const pointPlacements = loadEntries(path.join("points", "placements"));
  const pointAspects = loadEntries(path.join("points", "aspects"));
  const pointTransitHouses = loadEntries(path.join("points", "transits", "house"));
  const placements = loadEntries("placements");
  const angles = loadEntries("angles");
  const modifiers = loadEntries("modifiers");
  const chartRulers = loadEntries("chart-rulers");
  const composite = loadEntries("composite");
  const lunations = loadEntries("lunations");
  const guides = loadEntries("guides");
  const frameworks = loadEntries("frameworks");
  const templates = loadEntries("templates");
  const correspondences = loadEntries("correspondences");
  const synastry = loadDirectEntries("synastry");
  const synastryAspects = loadEntries(path.join("synastry", "aspects"));
  const synastryPointContacts = loadEntries(path.join("synastry", "point-contacts"));
  const synastryHouseOverlays = loadEntries(path.join("synastry", "house-overlays"));
  const insightCards = loadEntries("insights");
  const manifestationSetCollections = loadEntries("manifestation-sets");
  const voiceProfiles = loadVoiceProfiles();
  const generatedContent = loadJsonTree("generated");
  const rewriteCorpora = generatedContent.filter(isRewriteCorpusEntry);
  const voiceContent = generatedContent.filter((entry) => !isRewriteCorpusEntry(entry));

  const generatedAt = new Date().toISOString();
  const knowledge = withBundleMetadata(packageJson, generatedAt, {
    primitives,
    pairs,
    transits,
    transitNatal,
    transitHouses,
    planetary,
    points,
    pointPlacements,
    pointAspects,
    pointTransitHouses,
    placements,
    angles,
    modifiers,
    chartRulers,
    composite,
    lunations,
    guides,
    frameworks,
    templates,
    correspondences,
    synastry,
    synastryAspects,
    synastryPointContacts,
    synastryHouseOverlays,
    insightCards,
    manifestationSetCollections,
    voiceProfiles,
    voiceContent
  });

  const skyKnowledge = withBundleMetadata(packageJson, generatedAt, {
    primitives,
    pairs,
    transits,
    planetary,
    points,
    pointTransitHouses,
    placements,
    pointPlacements,
    modifiers,
    lunations,
    frameworks: frameworks.filter((entry) => [
      "traditional-transit-framework",
      "lunar-cycle-framework",
      "lunar-event-content-architecture",
      "transit-lifecycle-framework",
      "predictive-trigger-method-framework",
      "transit-sect-guide",
      "circle-feed-logic-framework"
    ].includes(entry.id)),
    templates,
    voiceProfiles,
    voiceContent
  });

  const natalKnowledge = withBundleMetadata(packageJson, generatedAt, {
    primitives,
    pairs,
    transitNatal,
    planetary,
    points,
    pointPlacements,
    pointAspects,
    placements,
    angles,
    modifiers,
    chartRulers,
    insightCards,
    manifestationSetCollections,
    frameworks: frameworks.filter((entry) => [
      "natal-synthesis-framework",
      "body-astrology-framework",
      "chiron-method-framework",
      "developmental-age-map-framework",
      "circle-feed-logic-framework"
    ].includes(entry.id)),
    voiceProfiles,
    voiceContent
  });

  const relationshipKnowledge = withBundleMetadata(packageJson, generatedAt, {
    primitives,
    pairs,
    planetary,
    points,
    synastry,
    synastryAspects,
    synastryPointContacts,
    synastryHouseOverlays,
    composite,
    frameworks: frameworks.filter((entry) => [
      "synastry-composite-method-framework",
      "relationship-dynamics-framework",
      "synastry-bond-types-framework",
      "asteroid-synastry-policy",
      "composite-synthesis-examples",
      "circle-feed-logic-framework"
    ].includes(entry.id)),
    voiceProfiles,
    voiceContent
  });

  const synastryKnowledge = withBundleMetadata(packageJson, generatedAt, {
    primitives,
    pairs,
    planetary,
    points,
    synastry,
    synastryAspects,
    synastryPointContacts,
    synastryHouseOverlays,
    frameworks: frameworks.filter((entry) => [
      "synastry-composite-method-framework",
      "relationship-dynamics-framework",
      "synastry-bond-types-framework",
      "asteroid-synastry-policy",
      "circle-feed-logic-framework"
    ].includes(entry.id)),
    voiceProfiles,
    voiceContent
  });

  const compositeKnowledge = withBundleMetadata(packageJson, generatedAt, {
    primitives,
    pairs,
    planetary,
    points,
    composite,
    frameworks: frameworks.filter((entry) => [
      "synastry-composite-method-framework",
      "relationship-dynamics-framework",
      "composite-synthesis-examples",
      "circle-feed-logic-framework"
    ].includes(entry.id)),
    voiceProfiles,
    voiceContent
  });

  const webKnowledge = withBundleMetadata(packageJson, generatedAt, {
    primitives,
    pairs,
    transits,
    transitNatal,
    planetary,
    points,
    pointPlacements,
    placements,
    angles,
    modifiers,
    chartRulers,
    insightCards,
    voiceProfiles,
    voiceContent
  });

  const webRuntimeCollections = {
    primitives,
    transits,
    transitNatal,
    placements,
    pointPlacements,
    angles,
    modifiers,
    insightCards,
    synastryAspects,
    synastryHouseOverlays,
    composite,
    voiceContent
  };
  const skyWebKnowledge = webSkyKnowledge(packageJson, generatedAt, webRuntimeCollections);
  const natalWebKnowledge = webNatalKnowledge(packageJson, generatedAt, webRuntimeCollections);
  const relationshipWebKnowledge = webRelationshipKnowledge(packageJson, generatedAt, webRuntimeCollections);

  const index = {
    version: packageJson.version,
    generatedAt: knowledge.generatedAt,
    bundle: "knowledge.json",
    entries: {},
    byId: {}
  };

  for (const collectionName of Object.keys(primitives).sort()) {
    for (const entry of primitives[collectionName]) addEntry(index, entry, `primitive/${collectionName}`);
  }
  for (const entry of pairs) addEntry(index, entry, "pair");
  for (const entry of transits) addEntry(index, entry, "transit");
  for (const entry of transitNatal) addEntry(index, entry, "transit/natal");
  for (const entry of transitHouses) addEntry(index, entry, "transit/house");
  for (const entry of planetary) addEntry(index, entry, "planetary");
  for (const entry of points) addEntry(index, entry, "point");
  for (const entry of pointPlacements) addEntry(index, entry, `point/placement/${entry.kind}`);
  for (const entry of pointAspects) addEntry(index, entry, `point/aspect/${entry.kind}`);
  for (const entry of pointTransitHouses) addEntry(index, entry, "point/transit/house");
  for (const entry of placements) addEntry(index, entry, `placement/${entry.kind}`);
  for (const entry of angles) addEntry(index, entry, `angle/${entry.kind}`);
  for (const entry of modifiers) addEntry(index, entry, "modifier");
  for (const entry of chartRulers) addEntry(index, entry, `chart-ruler/${entry.kind}`);
  for (const entry of composite) addEntry(index, entry, `composite/${entry.placementType}`);
  for (const entry of lunations) addEntry(index, entry, `lunation/${entry.kind}`);
  for (const entry of guides) addEntry(index, entry, "guide");
  for (const entry of frameworks) addEntry(index, entry, "framework");
  for (const entry of templates) addEntry(index, entry, "template");
  for (const entry of correspondences) addEntry(index, entry, "correspondence");
  for (const entry of synastry) addEntry(index, entry, "synastry");
  for (const entry of synastryAspects) addEntry(index, entry, "synastry/aspect");
  for (const entry of synastryPointContacts) addEntry(index, entry, "synastry/point-contact");
  for (const entry of synastryHouseOverlays) addEntry(index, entry, "synastry/house-overlay");
  for (const entry of insightCards) addEntry(index, entry, `insight/${entry.kind}`);
  for (const collection of manifestationSetCollections) {
    for (const [id, entry] of Object.entries(collection.records)) {
      addEntry(index, { id, ...entry }, `manifestation-set/${entry.factorType}`);
    }
  }
  for (const entry of voiceContent) addEntry(index, entry, `voice-content/${entry.voiceId ?? "unknown"}`);

  writeJson(path.join(distRoot, "knowledge.json"), knowledge);
  writeJson(path.join(distRoot, "sky.json"), skyKnowledge);
  writeJson(path.join(distRoot, "natal.json"), natalKnowledge);
  writeJson(path.join(distRoot, "relationships.json"), relationshipKnowledge);
  writeJson(path.join(distRoot, "sky-web.json"), skyWebKnowledge);
  writeJson(path.join(distRoot, "natal-web.json"), natalWebKnowledge);
  writeJson(path.join(distRoot, "relationships-web.json"), relationshipWebKnowledge);
  writeJson(path.join(distRoot, "synastry.json"), synastryKnowledge);
  writeJson(path.join(distRoot, "composite.json"), compositeKnowledge);
  writeJson(path.join(distRoot, "web.json"), webKnowledge);
  writeJson(path.join(distRoot, "knowledge.index.json"), index);
  writeJson(path.join(distRoot, "rewrite-corpora.json"), withBundleMetadata(packageJson, generatedAt, {
    voiceProfiles,
    rewriteCorpora
  }));
  writeJson(
    path.join(distRoot, "manifestation-sets.json"),
    withBundleMetadata(packageJson, generatedAt, { collections: manifestationSetCollections })
  );

  const counts = {
    primitives: Object.values(primitives).reduce((total, entries) => total + entries.length, 0),
    pairs: pairs.length,
    transits: transits.length,
    transitNatal: transitNatal.length,
    transitHouses: transitHouses.length,
    planetary: planetary.length,
    points: points.length,
    pointPlacements: pointPlacements.length,
    pointAspects: pointAspects.length,
    pointTransitHouses: pointTransitHouses.length,
    placements: placements.length,
    angles: angles.length,
    modifiers: modifiers.length,
    chartRulers: chartRulers.length,
    composite: composite.length,
    lunations: lunations.length,
    guides: guides.length,
    frameworks: frameworks.length,
    templates: templates.length,
    correspondences: correspondences.length,
    synastry: synastry.length,
    synastryAspects: synastryAspects.length,
    synastryPointContacts: synastryPointContacts.length,
    synastryHouseOverlays: synastryHouseOverlays.length,
    insightCards: insightCards.length,
    manifestationSets: manifestationSetCollections.reduce(
      (total, collection) => total + Object.keys(collection.records).length,
      0
    ),
    voiceProfiles: Object.keys(voiceProfiles).length,
    voiceContent: voiceContent.length,
    rewriteCorpora: rewriteCorpora.length,
    indexedEntries: Object.keys(index.entries).length
  };

  console.log("Validation passed: all data files match their schemas.");
  console.log(`Built dist/knowledge.json version ${packageJson.version}.`);
  console.log(`Entry counts: primitives=${counts.primitives}, pairs=${counts.pairs}, transits=${counts.transits}, transitNatal=${counts.transitNatal}, transitHouses=${counts.transitHouses}, planetary=${counts.planetary}, points=${counts.points}, pointPlacements=${counts.pointPlacements}, pointAspects=${counts.pointAspects}, pointTransitHouses=${counts.pointTransitHouses}, placements=${counts.placements}, angles=${counts.angles}, modifiers=${counts.modifiers}, chartRulers=${counts.chartRulers}, composite=${counts.composite}, lunations=${counts.lunations}, guides=${counts.guides}, frameworks=${counts.frameworks}, templates=${counts.templates}, correspondences=${counts.correspondences}, synastry=${counts.synastry}, synastryAspects=${counts.synastryAspects}, synastryPointContacts=${counts.synastryPointContacts}, synastryHouseOverlays=${counts.synastryHouseOverlays}, insightCards=${counts.insightCards}, manifestationSets=${counts.manifestationSets}, voiceProfiles=${counts.voiceProfiles}, voiceContent=${counts.voiceContent}, rewriteCorpora=${counts.rewriteCorpora}, indexedEntries=${counts.indexedEntries}`);
}

build();
