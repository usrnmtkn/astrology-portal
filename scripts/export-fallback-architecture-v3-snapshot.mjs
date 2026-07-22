#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const provider = "tldrastro-fallback-architecture-v3";

const outFiles = {
  authored: path.join(packageDir, "transit-synastry-rows-v1.json"),
  source: path.join(packageDir, "fallback-source-rows-v3.json"),
  templates: path.join(packageDir, "fallback-templates-v3.json")
};

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

  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(trimmed.slice(separatorIndex + 1));

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function adminHeaders() {
  const key = serviceRoleKey();

  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json"
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringFrom(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function rowSnapshot(row) {
  return isRecord(row.source_snapshot) ? row.source_snapshot : {};
}

function rowFacts(row) {
  return isRecord(row.facts) ? row.facts : {};
}

function rowSections(row) {
  return isRecord(row.sections) ? row.sections : {};
}

function packageRecord(row) {
  const sections = rowSections(row);
  return isRecord(sections.packageRecord) ? sections.packageRecord : {};
}

function bucketForRow(row) {
  const snapshot = rowSnapshot(row);
  const facts = rowFacts(row);

  return stringFrom(snapshot.contentType, snapshot.content_type, facts.packageBucket, facts.contentType, facts.content_type);
}

function roleForRow(row) {
  const snapshot = rowSnapshot(row);
  const facts = rowFacts(row);
  const record = packageRecord(row);

  return stringFrom(snapshot.content_role, snapshot.contentRole, facts.content_role, facts.contentRole, record.content_role, record.contentRole);
}

function reviewStatusForRow(row) {
  const snapshot = rowSnapshot(row);
  const facts = rowFacts(row);
  const record = packageRecord(row);

  return stringFrom(snapshot.review_status, snapshot.reviewStatus, facts.review_status, facts.reviewStatus, record.review_status, record.reviewStatus);
}

function recordWithDashboardEdits(row) {
  const record = { ...packageRecord(row) };
  const sections = rowSections(row);
  const role = roleForRow(row);
  const reviewStatus = reviewStatusForRow(row);

  record.contentKey = row.content_key;
  record.content_role = role || record.content_role;
  record.review_status = reviewStatus || record.review_status;

  if (typeof row.headline === "string" && row.headline.trim()) {
    record.headline = row.headline.trim();
  }

  if (role === "fallback_hook") {
    record.body_you = stringFrom(row.body, sections.body_you, record.body_you, record.body);
    record.body_they = stringFrom(sections.body_they, record.body_they, record.body_you);
  } else if (role === "template") {
    record.body = stringFrom(row.body, record.body);
    if (typeof sections.body_you === "string" || typeof record.body_you === "string") {
      record.body_you = stringFrom(sections.body_you, record.body_you);
    }
    if (typeof sections.body_they === "string" || typeof record.body_they === "string") {
      record.body_they = stringFrom(sections.body_they, record.body_they);
    }
  } else {
    record.body = stringFrom(row.body, record.body);
  }

  return record;
}

async function readDashboardRows() {
  const rows = [];

  for (let offset = 0; ; offset += 1000) {
    const url = `${supabaseUrl()}/rest/v1/generated_interpretations?select=content_key,headline,body,sections,facts,source_snapshot,provider&provider=eq.${provider}&limit=1000&offset=${offset}`;
    const response = await fetch(url, { headers: adminHeaders() });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`V3 snapshot export failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    if (!Array.isArray(payload)) {
      throw new Error(`V3 snapshot export expected an array, received ${typeof payload}.`);
    }

    rows.push(...payload);

    if (payload.length < 1000) break;
  }

  return rows;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

loadLocalWebEnv();

const existingAuthored = readJson(outFiles.authored);
const existingSource = readJson(outFiles.source);
const existingTemplates = readJson(outFiles.templates);
const rows = await readDashboardRows();

const authoredCards = [];
const vocabularyRows = [];
const fallbackSourceRows = [];
const hookRows = [];
const templates = [];

for (const row of rows) {
  const bucket = bucketForRow(row);
  const role = roleForRow(row);
  const record = recordWithDashboardEdits(row);

  if (!record.contentKey || !role) continue;

  if (bucket === "authored-content" && role === "full_copy") {
    authoredCards.push(record);
  } else if (bucket === "fallback-system" && role === "vocabulary") {
    vocabularyRows.push(record);
  } else if (bucket === "fallback-system" && role === "fallback_hook") {
    hookRows.push(record);
  } else if (bucket === "fallback-system" && role === "template") {
    templates.push(record);
  } else if (bucket === "source-material" || role === "fallback_source") {
    fallbackSourceRows.push(record);
  }
}

const byContentKey = (a, b) => String(a.contentKey).localeCompare(String(b.contentKey));
authoredCards.sort(byContentKey);
vocabularyRows.sort(byContentKey);
fallbackSourceRows.sort(byContentKey);
hookRows.sort(byContentKey);
templates.sort(byContentKey);

writeJson(outFiles.authored, {
  ...existingAuthored,
  note: `${existingAuthored.note ?? ""}\n\nExported from dashboard/Supabase on ${new Date().toISOString()}; this file is the emergency local snapshot, not the source of truth.`.trim(),
  authoredCards
});
writeJson(outFiles.source, {
  ...existingSource,
  note: `${existingSource.note ?? ""}\n\nExported from dashboard/Supabase on ${new Date().toISOString()}; this file is the emergency local snapshot, not the source of truth.`.trim(),
  vocabularyRows,
  fallbackSourceRows,
  hookRows
});
writeJson(outFiles.templates, {
  ...existingTemplates,
  note: `${existingTemplates.note ?? ""}\n\nExported from dashboard/Supabase on ${new Date().toISOString()}; this file is the emergency local snapshot, not the source of truth.`.trim(),
  templates
});

console.log(`exported ${rows.length} V3 dashboard rows into local emergency snapshot JSON`);
console.log(JSON.stringify({
  authoredCards: authoredCards.length,
  fallbackHooks: hookRows.length,
  vocabulary: vocabularyRows.length,
  templates: templates.length,
  sourceMaterial: fallbackSourceRows.length
}, null, 2));
