#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(root, "generated", "tldr-astro", "rewrite-corpora");

const sourceSets = [
  {
    id: "tldr-v4",
    version: "v4",
    label: "V4 tarot-core rewrite sources",
    sourceDir: "tldr-astrology-tarot-rewrites-v4",
    logicFile: "TLDR_ASTRO_TAROT_LOGIC_V4.md",
    logicSummary: "Planet=function, sign=style, house=life area, aspect=relationship, tarot=meaning layer, TLDR=gift plus friction plus evolution.",
    sources: [
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
    ]
  },
  {
    id: "tldr-rewrite-csvs",
    version: "rewrite-csvs",
    label: "TLDR rewrite CSV sources",
    sourceDir: "tldr-astrology-rewrite-csvs",
    logicFile: "tldr_voice_rewrite_schema_examples.csv",
    logicSummary: "Experience first, astrology explains after. Preserve factual astrology headlines and generate readable, actionable voice from source-backed fields.",
    sources: [
      {
        id: "tldr-rewrite-schema-examples",
        kind: "rewrite-schema-examples",
        surface: "all",
        title: "TLDR Astro Rewrite Schema Examples",
        file: "tldr_voice_rewrite_schema_examples.csv"
      },
      {
        id: "tldr-rewrite-sky-rewrites",
        aliases: ["tldr-v4-sky-rewrites"],
        kind: "rewrite-corpus",
        surface: "sky",
        title: "TLDR Astro Sky Transit Aspect Rewrites",
        file: "tldr_sky_transit_aspect_rewrites.csv"
      },
      {
        id: "tldr-rewrite-natal-chart-rewrites",
        aliases: ["tldr-v4-natal-chart-rewrites"],
        kind: "rewrite-corpus",
        surface: "natal",
        title: "TLDR Astro Natal Chart Rewrites",
        file: "tldr_natal_chart_rewrites.csv"
      },
      {
        id: "tldr-rewrite-transit-to-natal-rewrites",
        aliases: ["tldr-v4-transit-to-natal-rewrites"],
        kind: "rewrite-corpus",
        surface: "transit-to-natal",
        title: "TLDR Astro Transit To Natal Rewrites",
        file: "tldr_transit_to_natal_rewrites.csv"
      }
    ]
  }
];

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

function importCsvSource(sourceSet, source, logic) {
  const sourceRoot = path.join(root, "sources", sourceSet.sourceDir);
  const filePath = path.join(sourceRoot, source.file);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const rows = parseCsv(readIfExists(filePath));
  const isRewriteCorpus = source.kind === "rewrite-corpus";
  const entries = isRewriteCorpus ? rows.map(rewriteEntry) : rows.map(compactRecord);
  const output = compactRecord({
    id: source.id,
    aliases: source.aliases,
    voiceId: "tldr-astro",
    kind: source.kind,
    surface: source.surface,
    version: sourceSet.version,
    title: source.title,
    sourceFile: path.relative(root, filePath),
    logic: logic ? {
      sourceFile: path.join("sources", sourceSet.sourceDir, sourceSet.logicFile),
      summary: sourceSet.logicSummary
    } : undefined,
    entries
  });

  writeJson(path.join(outputRoot, sourceSet.id, `${source.id}.json`), output);
  return { id: source.id, count: entries.length };
}

function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const name of fs.readdirSync(outputRoot)) {
    if (name.startsWith("tldr-v4") || name.startsWith("tldr-rewrite")) {
      fs.rmSync(path.join(outputRoot, name), { recursive: true, force: true });
    }
  }

  const imports = [];

  for (const sourceSet of sourceSets) {
    const sourceRoot = path.join(root, "sources", sourceSet.sourceDir);

    if (!fs.existsSync(sourceRoot)) {
      continue;
    }

    const logic = readIfExists(path.join(sourceRoot, sourceSet.logicFile));
    const sourceImports = sourceSet.sources
      .map((source) => importCsvSource(sourceSet, source, logic))
      .filter(Boolean);

    if (sourceImports.length) {
      imports.push({ label: sourceSet.label, imports: sourceImports });
    }
  }

  if (!imports.length) {
    console.log("No rewrite CSV source files found. Skipping rewrite import.");
    return;
  }

  console.log(imports.map((sourceSet) => (
    `Imported ${sourceSet.label}: ${sourceSet.imports.map((item) => `${item.id}=${item.count}`).join(", ")}`
  )).join("\n"));
}

main();
