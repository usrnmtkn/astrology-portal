#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const aspectsDir = join(repoRoot, "packages/astro-knowledge/data/synastry/aspects");
const overlaysDir = join(repoRoot, "packages/astro-knowledge/data/synastry/house-overlays");
const promptVersion = "synastry-kb-v1";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function jsonFiles(path) {
  return readdirSync(path)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => join(path, file));
}

function titlePart(value) {
  return String(value ?? "")
    .replace(/[()]/g, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function slugPart(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stringOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nonEmptyStrings(values) {
  return values
    .map(stringOrNull)
    .filter((value) => value !== null);
}

function numberedHouse(value) {
  const raw = String(value ?? "").trim();
  const number = raw.match(/\d+/)?.[0] ?? raw;

  return number;
}

function ordinalHouse(value) {
  const number = Number(numberedHouse(value));
  const suffix = number % 100 >= 11 && number % 100 <= 13
    ? "th"
    : number % 10 === 1
      ? "st"
      : number % 10 === 2
        ? "nd"
        : number % 10 === 3
          ? "rd"
          : "th";

  return Number.isFinite(number) ? `${number}${suffix}` : `${value}`;
}

function aspectContentKey(entry) {
  return entry.id;
}

function overlayContentKey(entry) {
  const planet = entry.planet === "(personal)" ? "personal-planet" : slugPart(entry.planet);

  return `synastry-${planet}-in-${numberedHouse(entry.house)}-house`;
}

function aspectHeadline(entry) {
  return `${titlePart(entry.planetA)} ${titlePart(entry.aspect)} ${titlePart(entry.planetB)}`;
}

function overlayHeadline(entry) {
  const planet = entry.planet === "(personal)" ? "Personal planet" : titlePart(entry.planet);

  return `${planet} in ${ordinalHouse(entry.house)} house`;
}

function sectionsFromEntry(entry) {
  const sections = [];
  const summaryDeep = stringOrNull(entry.summaryDeep);
  const tension = stringOrNull(entry.tension);
  const advice = stringOrNull(entry.advice);
  const plainTranslation = stringOrNull(entry.plainTranslation);

  if (summaryDeep) {
    sections.push({ heading: "Deep meaning", body: summaryDeep });
  }

  if (tension) {
    sections.push({ heading: "Tension", body: tension });
  }

  if (advice) {
    sections.push({ heading: "Advice", body: advice });
  }

  if (!sections.length && plainTranslation) {
    sections.push({ heading: "Translation", body: plainTranslation });
  }

  return {
    sections,
    synastryKb: {
      id: entry.id,
      kind: entry.kind,
      plainTranslation: entry.plainTranslation ?? null,
      summaryDeep: entry.summaryDeep ?? null,
      tension: entry.tension ?? null,
      advice: entry.advice ?? null,
      policy: entry.policy ?? null,
      note: entry.note ?? null,
      status: entry.status ?? null,
      authoringStatus: entry.authoringStatus ?? null,
      weight: entry.weight ?? null
    }
  };
}

function bodyFromEntry(entry) {
  const requestedParts = [];
  const summaryDeep = stringOrNull(entry.summaryDeep);

  if (summaryDeep) {
    requestedParts.push(summaryDeep);
  }

  for (const value of [entry.tension, entry.advice]) {
    const text = stringOrNull(value);

    if (text && !requestedParts.some((part) => part.includes(text))) {
      requestedParts.push(text);
    }
  }

  if (requestedParts.length) {
    return requestedParts.join("\n\n");
  }

  return stringOrNull(entry.plainTranslation) ?? "";
}

function sourceSnapshot(path, entry, collection) {
  return {
    contentType: "synastry-kb-seed",
    source: "packages/astro-knowledge",
    sourcePath: relative(repoRoot, path),
    collection,
    kbId: entry.id,
    importedStatus: entry.status ?? null
  };
}

function aspectRow(path) {
  const entry = readJson(path);

  return {
    content_key: aspectContentKey(entry),
    surface: "synastry",
    mode: "in_depth",
    status: "LIVE",
    event_type: "synastry-aspect",
    target_date: null,
    facts: {
      kind: entry.kind,
      planetA: entry.planetA,
      planetB: entry.planetB,
      aspect: entry.aspect
    },
    knowledge_ids: [
      entry.id,
      `synastry-${slugPart(entry.planetA)}-${slugPart(entry.aspect)}-${slugPart(entry.planetB)}`,
      `relationship-${slugPart(entry.planetA)}-${slugPart(entry.aspect)}-${slugPart(entry.planetB)}`
    ],
    source_snapshot: sourceSnapshot(path, entry, "synastry/aspects"),
    prompt_version: promptVersion,
    model: null,
    headline: aspectHeadline(entry),
    summary: stringOrNull(entry.summaryShort),
    body: bodyFromEntry(entry),
    sections: sectionsFromEntry(entry),
    block_type: "synastry_aspect",
    reviewer_notes: "Seeded from authored synastry KB. summaryShort is preserved as NULL when absent or null.",
    published_at: "now()"
  };
}

function overlayRow(path) {
  const entry = readJson(path);
  const planet = entry.planet === "(personal)" ? "personal-planet" : slugPart(entry.planet);
  const house = numberedHouse(entry.house);

  return {
    content_key: overlayContentKey(entry),
    surface: "synastry",
    mode: "in_depth",
    status: "LIVE",
    event_type: "synastry-house-overlay",
    target_date: null,
    facts: {
      kind: entry.kind,
      planet: entry.planet,
      house
    },
    knowledge_ids: [
      entry.id,
      `synastry-${planet}-in-${house}-house`,
      `relationship-${planet}-in-${house}-house`
    ],
    source_snapshot: sourceSnapshot(path, entry, "synastry/house-overlays"),
    prompt_version: promptVersion,
    model: null,
    headline: overlayHeadline(entry),
    summary: stringOrNull(entry.summaryShort),
    body: bodyFromEntry(entry),
    sections: sectionsFromEntry(entry),
    block_type: "house",
    reviewer_notes: "Seeded from authored synastry KB. block_type uses existing generated_interpretations house equivalent for synastry overlays.",
    published_at: "now()"
  };
}

function buildRows() {
  return [
    ...jsonFiles(aspectsDir).map(aspectRow),
    ...jsonFiles(overlaysDir).map(overlayRow)
  ].sort((first, second) => first.content_key.localeCompare(second.content_key));
}

function sqlString(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function sqlTextArray(values) {
  return `ARRAY[${values.map(sqlString).join(", ")}]::text[]`;
}

function sqlDate(value) {
  return value ? `${sqlString(value)}::date` : "null::date";
}

function sqlTimestamp(value) {
  return value === "now()" ? "now()" : `${sqlString(value)}::timestamptz`;
}

function rowValues(row) {
  return [
    sqlString(row.content_key),
    sqlString(row.surface),
    sqlString(row.mode),
    sqlString(row.status),
    sqlString(row.event_type),
    sqlDate(row.target_date),
    sqlJson(row.facts),
    sqlTextArray(row.knowledge_ids),
    sqlJson(row.source_snapshot),
    sqlString(row.prompt_version),
    sqlString(row.model),
    sqlString(row.headline),
    sqlString(row.summary),
    sqlString(row.body),
    sqlJson(row.sections),
    sqlString(row.block_type),
    sqlString(row.reviewer_notes),
    sqlTimestamp(row.published_at)
  ];
}

function renderSql(rows) {
  const columns = [
    "content_key",
    "surface",
    "mode",
    "status",
    "event_type",
    "target_date",
    "facts",
    "knowledge_ids",
    "source_snapshot",
    "prompt_version",
    "model",
    "headline",
    "summary",
    "body",
    "sections",
    "block_type",
    "reviewer_notes",
    "published_at"
  ];

  return [
    "-- Generated by scripts/import-synastry-kb-generated-interpretations.mjs",
    "-- Review before running. This seed replaces only rows previously emitted with prompt_version synastry-kb-v1.",
    "begin;",
    "",
    "delete from public.generated_interpretations",
    `where prompt_version = ${sqlString(promptVersion)}`,
    "  and surface = 'synastry'",
    "  and event_type in ('synastry-aspect', 'synastry-house-overlay');",
    "",
    `insert into public.generated_interpretations (${columns.join(", ")})`,
    "values",
    rows.map((row, index) => `  (${rowValues(row).join(", ")})${index === rows.length - 1 ? ";" : ","}`).join("\n"),
    "",
    "commit;",
    ""
  ].join("\n");
}

function report(rows) {
  const countByBlockType = rows.reduce((counts, row) => {
    counts[row.block_type] = (counts[row.block_type] ?? 0) + 1;
    return counts;
  }, {});
  const nullSummaryRows = rows.filter((row) => row.summary === null).length;
  const sampleRow = rows.find((row) => row.content_key === "A-venus_B-mars_trine") ?? rows[0];

  return {
    promptVersion,
    totalRows: rows.length,
    countByBlockType,
    nullSummaryRows,
    sampleRow
  };
}

const args = new Set(process.argv.slice(2));
const outIndex = process.argv.indexOf("--out");
const rows = buildRows();

if (args.has("--report")) {
  process.stdout.write(`${JSON.stringify(report(rows), null, 2)}\n`);
} else {
  const sql = renderSql(rows);

  if (outIndex !== -1) {
    const outPath = process.argv[outIndex + 1];

    if (!outPath) {
      throw new Error("--out requires a path");
    }

    writeFileSync(resolve(process.cwd(), outPath), sql);
  } else {
    process.stdout.write(sql);
  }
}
