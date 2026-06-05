#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "sources", "tldr-astrology-tarot-rewrites-v4");
const outputRoot = path.join(root, "generated", "tldr-astro", "v4");

const csvSources = [
  {
    id: "tldr-v4-content-architecture",
    kind: "content-architecture",
    surface: "all",
    title: "TLDR Astro V4 Content Architecture",
    file: "tldr_content_architecture_v4.csv"
  },
  {
    id: "tldr-v4-tarot-ontology",
    kind: "tarot-ontology",
    surface: "all",
    title: "TLDR Astro V4 Tarot Ontology Mapping",
    file: "tldr_tarot_ontology_mapping_v4.csv"
  },
  {
    id: "tldr-v4-sky-rewrites",
    kind: "rewrite-corpus",
    surface: "sky",
    title: "TLDR Astro V4 Sky Transit Aspect Rewrites",
    file: "tldr_sky_transit_aspect_rewrites_v4_tarot_core.csv"
  },
  {
    id: "tldr-v4-natal-chart-rewrites",
    kind: "rewrite-corpus",
    surface: "natal",
    title: "TLDR Astro V4 Natal Chart Rewrites",
    file: "tldr_natal_chart_rewrites_v4_tarot_core.csv"
  },
  {
    id: "tldr-v4-transit-to-natal-rewrites",
    kind: "rewrite-corpus",
    surface: "transit-to-natal",
    title: "TLDR Astro V4 Transit To Natal Rewrites",
    file: "tldr_transit_to_natal_rewrites_v4_tarot_core.csv"
  }
];

const logicFile = "TLDR_ASTRO_TAROT_LOGIC_V4.md";

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (character === "\"" && next === "\"") {
        value += "\"";
        index += 1;
      } else if (character === "\"") {
        quoted = false;
      } else {
        value += character;
      }
      continue;
    }

    if (character === "\"") {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (character !== "\r") {
      value += character;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows;
  const normalizedHeaders = headers.map((header) => header.trim());

  return dataRows
    .filter((dataRow) => dataRow.some((cell) => cell.trim()))
    .map((dataRow) => Object.fromEntries(normalizedHeaders.map((header, index) => [
      header,
      (dataRow[index] ?? "").trim()
    ])));
}

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== "" && value !== undefined));
}

function rewriteEntry(row) {
  const compact = compactRecord(row);
  const archetypes = compactRecord({
    planet: row.planet_archetype,
    sign: row.sign_archetype,
    house: row.house_archetype,
    aspect: row.aspect_archetype,
    natalPoint: row.natal_point_archetype
  });

  return compactRecord({
    id: row.id,
    title: row.title,
    surface: row.surface,
    itemType: row.item_type,
    sourceFile: row.source_file,
    originalSourceMeaning: row.original_source_meaning,
    baseMeaningRewrite: row.base_meaning_rewrite,
    observableExperience: row.observable_experience,
    observableTendency: row.observable_tendency,
    observableCurrentActivation: row.observable_current_activation,
    shadowPattern: row.shadow_pattern,
    pressurePoint: row.pressure_point,
    whereItHelps: row.where_it_helps,
    whereItCanBecomeDifficult: row.where_it_can_become_difficult,
    bestMove: row.best_move,
    businessLens: row.business_lens,
    readerFacingSummary: row.reader_facing_summary,
    closingReflection: row.closing_reflection,
    voiceNotes: row.voice_notes,
    archetypes: Object.keys(archetypes).length ? archetypes : undefined,
    symbolicStory: row.symbolic_story,
    lesson: row.lesson,
    tldr: row.tldr,
    raw: compact
  });
}

function importCsvSource(source, logic) {
  const filePath = path.join(sourceRoot, source.file);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const rows = parseCsv(readIfExists(filePath));
  const isRewriteCorpus = source.kind === "rewrite-corpus";
  const entries = isRewriteCorpus ? rows.map(rewriteEntry) : rows.map(compactRecord);
  const output = compactRecord({
    id: source.id,
    voiceId: "tldr-astro",
    kind: source.kind,
    surface: source.surface,
    version: "v4",
    title: source.title,
    sourceFile: path.relative(root, filePath),
    logic: logic ? {
      sourceFile: path.join("sources", "tldr-astrology-tarot-rewrites-v4", logicFile),
      summary: "Planet=function, sign=style, house=life area, aspect=relationship, tarot=meaning layer, TLDR=gift plus friction plus evolution."
    } : undefined,
    entries
  });

  writeJson(path.join(outputRoot, `${source.id}.json`), output);
  return { id: source.id, count: entries.length };
}

function main() {
  if (!fs.existsSync(sourceRoot)) {
    console.log("No V4 rewrite source folder found. Skipping V4 import.");
    return;
  }

  fs.mkdirSync(outputRoot, { recursive: true });
  for (const name of fs.readdirSync(outputRoot)) {
    if (name.startsWith("tldr-v4-") && name.endsWith(".json")) {
      fs.rmSync(path.join(outputRoot, name), { force: true });
    }
  }

  const logic = readIfExists(path.join(sourceRoot, logicFile));
  const imports = csvSources
    .map((source) => importCsvSource(source, logic))
    .filter(Boolean);

  if (!imports.length) {
    console.log("No V4 rewrite CSV files found. Skipping V4 import.");
    return;
  }

  console.log(`Imported V4 rewrite sources: ${imports.map((item) => `${item.id}=${item.count}`).join(", ")}`);
}

main();
