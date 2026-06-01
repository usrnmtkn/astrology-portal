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
  const guides = loadEntries("guides");
  const frameworks = loadEntries("frameworks");
  const templates = loadEntries("templates");
  const correspondences = loadEntries("correspondences");
  const synastry = loadEntries("synastry");

  const knowledge = {
    version: packageJson.version,
    generatedAt: new Date().toISOString(),
    primitives,
    pairs,
    transits,
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
    guides,
    frameworks,
    templates,
    correspondences,
    synastry
  };

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
  for (const entry of guides) addEntry(index, entry, "guide");
  for (const entry of frameworks) addEntry(index, entry, "framework");
  for (const entry of templates) addEntry(index, entry, "template");
  for (const entry of correspondences) addEntry(index, entry, "correspondence");
  for (const entry of synastry) addEntry(index, entry, "synastry");

  writeJson(path.join(distRoot, "knowledge.json"), knowledge);
  writeJson(path.join(distRoot, "knowledge.index.json"), index);

  const counts = {
    primitives: Object.values(primitives).reduce((total, entries) => total + entries.length, 0),
    pairs: pairs.length,
    transits: transits.length,
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
    guides: guides.length,
    frameworks: frameworks.length,
    templates: templates.length,
    correspondences: correspondences.length,
    synastry: synastry.length,
    indexedEntries: Object.keys(index.entries).length
  };

  console.log("Validation passed: all data files match their schemas.");
  console.log(`Built dist/knowledge.json version ${packageJson.version}.`);
  console.log(`Entry counts: primitives=${counts.primitives}, pairs=${counts.pairs}, transits=${counts.transits}, transitHouses=${counts.transitHouses}, planetary=${counts.planetary}, points=${counts.points}, pointPlacements=${counts.pointPlacements}, pointAspects=${counts.pointAspects}, pointTransitHouses=${counts.pointTransitHouses}, placements=${counts.placements}, angles=${counts.angles}, modifiers=${counts.modifiers}, chartRulers=${counts.chartRulers}, guides=${counts.guides}, frameworks=${counts.frameworks}, templates=${counts.templates}, correspondences=${counts.correspondences}, synastry=${counts.synastry}, indexedEntries=${counts.indexedEntries}`);
}

build();
