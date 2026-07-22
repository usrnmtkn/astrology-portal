#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultPhrasebankPath = path.join(repoRoot, "tldr-astro-phrasebank", "phrasebank", "cc-compatibility-writeups.json");
const renderedLibraryManifest = {
  moon: path.join(repoRoot, "tldr-astro-phrasebank", "phrasebank", "moon-compatibility-library.json")
};
const defaultOutPath = path.join(repoRoot, "scripts", "generated", "compatibility-dashboard-rows.json");
const signs = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
];

function argValue(name) {
  const found = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : null;
}

const requestedPlanet = (argValue("--planet") ?? "venus").trim().toLowerCase();
const options = {
  inputPath: argValue("--input") ?? (renderedLibraryManifest[requestedPlanet] && fs.existsSync(renderedLibraryManifest[requestedPlanet])
    ? renderedLibraryManifest[requestedPlanet]
    : defaultPhrasebankPath),
  outPath: argValue("--out") ?? defaultOutPath,
  planet: requestedPlanet,
  status: (argValue("--status") ?? "DRAFT").trim().toUpperCase(),
  apply: process.argv.includes("--apply")
};

function loadLocalWebEnv() {
  const envPath = path.join(repoRoot, "apps", "web", ".env.local");

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
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const quote = rawValue[0];
    const value = (quote === "\"" || quote === "'") && rawValue.endsWith(quote)
      ? rawValue.slice(1, -1)
      : rawValue;

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function contentKey(planet, readerSign, otherSign) {
  return `compatibility.${planet}.${readerSign}.${otherSign}`;
}

function normalizeSign(value) {
  return String(value ?? "").trim().toLowerCase();
}

function paragraphList(text) {
  return String(text ?? "")
    .trim()
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function renderedRecordSign(record, planet, role) {
  const planetKey = normalizeSign(planet);
  const fieldName = `${role}_${planetKey}`;

  return normalizeSign(record[fieldName]);
}

function renderedRecordSourceFile() {
  return path.basename(options.inputPath);
}

function cardParagraphs(card) {
  const paragraphs = [
    card.function,
    card.your_line,
    card.same_sign ? card.same_sign_line : card.their_line,
    card.verdict
  ].map((value) => String(value ?? "").trim()).filter(Boolean);

  if (paragraphs.length !== 4) {
    throw new Error(`Compatibility card ${card.id ?? "unknown"} must have 4 render paragraphs.`);
  }

  return paragraphs;
}

function rowFromRenderedRecord(record) {
  const planet = options.planet;
  const readerSign = renderedRecordSign(record, planet, "reader");
  const otherSign = renderedRecordSign(record, planet, "other");

  if (!signs.includes(readerSign) || !signs.includes(otherSign)) {
    throw new Error(`Invalid ${planet} compatibility signs in ${renderedRecordSourceFile()}: ${readerSign || "missing"} + ${otherSign || "missing"}.`);
  }

  const key = contentKey(planet, readerSign, otherSign);
  const planetLabel = titleCase(planet);
  const readerLabel = titleCase(readerSign);
  const otherLabel = titleCase(otherSign);
  const body = String(record.text ?? "").trim();
  const paragraphs = paragraphList(body);

  if (paragraphs.length !== 4) {
    throw new Error(`${key} must have exactly 4 rendered paragraphs.`);
  }

  if (record.format !== "multi-paragraph") {
    throw new Error(`${key} must use format "multi-paragraph".`);
  }

  const now = new Date().toISOString();

  return {
    content_key: key,
    surface: "relationship",
    mode: "in_depth",
    status: options.status,
    event_type: "friends.compatibility.planet-card",
    target_date: null,
    headline: `${planetLabel} compatibility: ${readerLabel} + ${otherLabel}`,
    summary: `${planetLabel}-to-${planetLabel} compatibility for ${readerLabel} and ${otherLabel}.`,
    body,
    sections: [
      { heading: `${planetLabel} function`, body: paragraphs[0] },
      { heading: `${planetLabel} for you`, body: paragraphs[1] },
      { heading: readerSign === otherSign ? `${planetLabel} shared pattern` : `${planetLabel} for them`, body: paragraphs[2] },
      { heading: `${planetLabel} verdict`, body: paragraphs[3] }
    ],
    block_type: "compatibility_planet_card",
    lane: "serving",
    review_state: options.status === "LIVE" || options.status === "REVIEWED" ? null : "dashboard_confirmation_required",
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "compatibility-dashboard-materialization",
    facts: {
      tldrDashboardSource: true,
      contentSystem: "authored",
      contentLevel: "source-grounded",
      contentFamily: "friends.compatibility.planet-card",
      planet,
      readerSign,
      otherSign,
      format: record.format,
      directional: true,
      requiresFriendNameInterpolation: true,
      sameSign: readerSign === otherSign,
      relationship: record.relation ?? null,
      relationTagSeed: record.tag ?? null,
      source: record.source ?? null,
      domain: record.domain ?? null
    },
    knowledge_ids: [key],
    source_snapshot: {
      contentType: "friends.compatibility.planet-card",
      contentSystem: "authored",
      contentLevel: "source-grounded",
      canonicalKey: key,
      sourceFile: renderedRecordSourceFile(),
      sourceKey: key,
      sourceType: "authored-rendered-compatibility-library",
      singleSourceOfTruth: true,
      requiresFriendNameInterpolation: true,
      tier: "author-final",
      status: options.status,
      planet,
      readerSign,
      otherSign,
      format: record.format,
      sameSign: readerSign === otherSign,
      relationship: record.relation ?? null,
      relationTagSeed: record.tag ?? null,
      route: "friends.compatibility"
    },
    reviewer_notes: "",
    prompt_version: "compatibility-dashboard-materialization-v2",
    provider: `${planet}-compatibility-library-materialization`,
    model: "manual",
    updated_at: now
  };
}

function rowFromCard(planet, readerSign, otherSign, card) {
  const key = contentKey(planet, readerSign, otherSign);
  const planetLabel = titleCase(planet);
  const readerLabel = titleCase(readerSign);
  const otherLabel = titleCase(otherSign);
  const paragraphs = cardParagraphs(card);
  const format = typeof card.format === "string" && card.format.trim() ? card.format.trim() : null;
  const authoredBody = typeof card.body === "string"
    ? card.body.trim().split(/\n\n+/).map((paragraph) => paragraph.trim().replace(/[ \t]+/g, " ")).filter(Boolean).join("\n\n")
    : "";
  const body = (format === "single-paragraph" || format === "multi-paragraph") && authoredBody
    ? authoredBody
    : paragraphs.join("\n\n");
  const now = new Date().toISOString();

  return {
    content_key: key,
    surface: "relationship",
    mode: "in_depth",
    status: options.status,
    event_type: "friends.compatibility.planet-card",
    target_date: null,
    headline: `${planetLabel} compatibility: ${readerLabel} + ${otherLabel}`,
    summary: `${planetLabel}-to-${planetLabel} compatibility for ${readerLabel} and ${otherLabel}.`,
    body,
    sections: [
      { heading: `${planetLabel} function`, body: paragraphs[0] },
      { heading: `${planetLabel} for you`, body: paragraphs[1] },
      { heading: card.same_sign ? `${planetLabel} shared pattern` : `${planetLabel} for them`, body: paragraphs[2] },
      { heading: `${planetLabel} verdict`, body: paragraphs[3] }
    ],
    block_type: "compatibility_planet_card",
    lane: "serving",
    review_state: options.status === "LIVE" || options.status === "REVIEWED" ? null : "dashboard_confirmation_required",
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "compatibility-dashboard-materialization",
    facts: {
      tldrDashboardSource: true,
      contentSystem: "authored",
      contentLevel: "source-grounded",
      contentFamily: "friends.compatibility.planet-card",
      planet,
      readerSign,
      otherSign,
      format,
      sameSign: Boolean(card.same_sign),
      relationship: card.relationship ?? null
    },
    knowledge_ids: [key],
    source_snapshot: {
      contentType: "friends.compatibility.planet-card",
      contentSystem: "authored",
      contentLevel: "source-grounded",
      canonicalKey: key,
      sourceFile: "cc-compatibility-writeups.json",
      sourceKey: `cards.${planet}.${readerSign}.${otherSign}`,
      sourceType: "authored-phrasebank-dashboard-row",
      tier: card.tier ?? null,
      status: options.status,
      planet,
      readerSign,
      otherSign,
      format,
      sameSign: Boolean(card.same_sign),
      relationship: card.relationship ?? null,
      route: "friends.compatibility"
    },
    reviewer_notes: "",
    prompt_version: "compatibility-dashboard-materialization-v1",
    provider: "phrasebank-dashboard-materialization",
    model: "manual",
    updated_at: now
  };
}

function materializeRows() {
  const phrasebank = JSON.parse(fs.readFileSync(options.inputPath, "utf8"));

  if (Array.isArray(phrasebank)) {
    const rowsByKey = new Map();

    for (const record of phrasebank) {
      const row = rowFromRenderedRecord(record);

      if (rowsByKey.has(row.content_key)) {
        throw new Error(`Duplicate ${options.planet} compatibility key: ${row.content_key}.`);
      }

      rowsByKey.set(row.content_key, row);
    }

    for (const readerSign of signs) {
      for (const otherSign of signs) {
        const key = contentKey(options.planet, readerSign, otherSign);

        if (!rowsByKey.has(key)) {
          throw new Error(`Missing ${options.planet} compatibility record for ${readerSign} + ${otherSign}.`);
        }
      }
    }

    return signs.flatMap((readerSign) => (
      signs.map((otherSign) => rowsByKey.get(contentKey(options.planet, readerSign, otherSign)))
    ));
  }

  const planetCards = phrasebank.cards?.[options.planet];

  if (!planetCards) {
    throw new Error(`No compatibility cards found for planet "${options.planet}" in ${options.inputPath}.`);
  }

  return signs.flatMap((readerSign) => (
    signs.map((otherSign) => {
      const card = planetCards[readerSign]?.[otherSign];

      if (!card) {
        throw new Error(`Missing ${options.planet} compatibility card for ${readerSign} + ${otherSign}.`);
      }

      return rowFromCard(options.planet, readerSign, otherSign, card);
    })
  ));
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
}

function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function upsertRows(rows) {
  loadLocalWebEnv();

  if (!supabaseUrl() || !serviceRoleKey()) {
    throw new Error("SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply.");
  }

  const headers = {
    apikey: serviceRoleKey(),
    authorization: `Bearer ${serviceRoleKey()}`,
    "content-type": "application/json",
    prefer: "resolution=merge-duplicates,return=representation"
  };
  const upserted = [];
  const protectedContentKeys = new Set();

  for (let index = 0; index < rows.length; index += 100) {
    const keys = rows.slice(index, index + 100).map((row) => row.content_key);
    const query = new URLSearchParams({
      select: "content_key,provider,source_snapshot,prompt_version,evergreen_by",
      content_key: `in.(${keys.join(",")})`
    });
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${query}`, {
      headers
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Compatibility dashboard protection check failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    for (const row of payload ?? []) {
      const sourceSnapshot = row.source_snapshot && typeof row.source_snapshot === "object"
        ? row.source_snapshot
        : {};
      const authoringSource = sourceSnapshot.authoringSource ?? sourceSnapshot.authoring_source;
      const materialized = row.provider === "phrasebank-dashboard-materialization"
        || row.provider === "moon-compatibility-library-materialization"
        || row.prompt_version === "compatibility-dashboard-materialization-v1"
        || row.prompt_version === "compatibility-dashboard-materialization-v2"
        || row.evergreen_by === "compatibility-dashboard-materialization";

      if (authoringSource === "admin-dashboard" || !materialized) {
        protectedContentKeys.add(row.content_key);
      }
    }
  }

  const rowsToUpsert = rows.filter((row) => !protectedContentKeys.has(row.content_key));

  async function postBatch(batch) {
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key`, {
      method: "POST",
      headers,
      body: JSON.stringify(batch)
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const blockTypeConstraint = response.status === 400
        && payload?.code === "23514"
        && /generated_interpretations_block_type_check/.test(String(payload?.message ?? payload?.details ?? ""));

      if (blockTypeConstraint && batch.some((row) => row.block_type === "compatibility_planet_card")) {
        const constraintSafeBatch = batch.map((row) => (
          row.block_type === "compatibility_planet_card"
            ? {
              ...row,
              block_type: null,
              source_snapshot: {
                ...row.source_snapshot,
                databaseBlockTypeFallback: "compatibility_planet_card"
              }
            }
            : row
        ));

        return postBatch(constraintSafeBatch);
      }

      throw new Error(`Compatibility dashboard upsert failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    return payload;
  }

  for (let index = 0; index < rowsToUpsert.length; index += 100) {
    const batch = rowsToUpsert.slice(index, index + 100);
    const payload = await postBatch(batch);

    upserted.push(...payload);
  }

  return { upserted, protectedCount: protectedContentKeys.size };
}

const rows = materializeRows();
fs.mkdirSync(path.dirname(options.outPath), { recursive: true });
fs.writeFileSync(options.outPath, `${JSON.stringify({
  schema: "tldrastro-compatibility-dashboard-rows-v1",
  generatedAt: new Date().toISOString(),
  source: path.relative(repoRoot, options.inputPath),
  planet: options.planet,
  status: options.status,
  rows
}, null, 2)}\n`);

console.log(`materialized ${rows.length} ${options.planet} compatibility dashboard rows -> ${path.relative(repoRoot, options.outPath)}`);

if (options.apply) {
  const { upserted, protectedCount } = await upsertRows(rows);
  console.log(`upserted ${upserted.length} rows into generated_interpretations${protectedCount ? `; preserved ${protectedCount} existing dashboard-edited rows` : ""}`);
}
