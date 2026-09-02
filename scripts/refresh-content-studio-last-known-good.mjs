#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(repoRoot, "apps/web/public/content-studio-last-known-good.json");
const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "https://hdmdufozrgrajkfhydit.supabase.co").replace(/\/$/u, "");
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.SUPABASE_PUBLISHABLE_KEY
  ?? "sb_publishable_iX90KdzcQzw8a8OydBHHXA_COnEMcns";
if (!supabaseUrl || !publishableKey) throw new Error("A Supabase project URL and publishable key are required.");

const coreProvider = "tldrastro-fallback-architecture-v3";
const skyPlacementProvider = "tldrastro-fallback-architecture-v3-sky-placement";
const durablePrefixes = [
  "cms/",
  "fallback-hook/",
  "fallback-vocab/",
  "fallback-template/",
  "slot-template/",
  "vocab/",
  "guide-phrase/",
  "authored/compat-pair/",
  "cc/planet/",
  "cc/sign/"
];
const approvedReviews = new Set(["approved", "approved_reuse", "reviewed"]);
const unsafeMarkers = [
  "unsafe",
  "editorial-only",
  "editorial_only",
  "superseded",
  "reference-only",
  "raw_quarantine",
  "revoice-pending",
  "revoice_pending"
];

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function roleAndReview(row) {
  const source = isRecord(row.source_snapshot) ? row.source_snapshot : {};
  const facts = isRecord(row.facts) ? row.facts : {};
  const sections = isRecord(row.sections) ? row.sections : {};
  const record = isRecord(sections.packageRecord) ? sections.packageRecord : {};
  return {
    role: String(source.content_role ?? source.contentRole ?? facts.content_role ?? facts.contentRole ?? record.content_role ?? record.contentRole ?? ""),
    review: String(source.review_status ?? source.reviewStatus ?? facts.review_status ?? facts.reviewStatus ?? record.review_status ?? record.reviewStatus ?? "")
  };
}

function durableRow(row) {
  if (row.status !== "LIVE" || row.lane !== "serving" || row.review_state != null || row.target_date != null) return false;
  if (row.provider === skyPlacementProvider) return false;
  const key = String(row.content_key ?? "");
  if (!key || key.startsWith("sample-") || key.startsWith("sky/article-template/") || key.startsWith("sky-article-template/")) return false;
  if (row.provider !== coreProvider && !durablePrefixes.some((prefix) => key.startsWith(prefix))) return false;
  const source = isRecord(row.source_snapshot) ? row.source_snapshot : {};
  const facts = isRecord(row.facts) ? row.facts : {};
  if (source.sampleOnly === true || facts.sampleOnly === true) return false;
  const { role, review } = roleAndReview(row);
  if (["fallback_source", "source_material"].includes(role)) return false;
  if (review && !approvedReviews.has(review)) return false;
  const metadata = [
    key,
    row.provider ?? "",
    JSON.stringify(source),
    JSON.stringify(facts),
    ...(Array.isArray(row.flags) ? row.flags : [])
  ].join(" ").toLowerCase();
  if (unsafeMarkers.some((marker) => metadata.includes(marker))) return false;
  const flags = new Set(Array.isArray(row.flags) ? row.flags : []);
  if (
    flags.has("REFERENCE_ONLY_NEVER_SERVE_VERBATIM")
    || flags.has("PARAPHRASE_PENDING")
    || flags.has("BLOCKLIST_MATCH")
  ) return false;
  return true;
}

const select = "id,content_key,surface,mode,status,lane,review_state,event_type,target_date,facts,source_snapshot,headline,summary,body,sections,block_type,flags,provider,judge_score,judge_gate,model,updated_at";
const rows = [];
let cursor = null;
const pageSize = 200;
for (let page = 0; page < 100; page += 1) {
  const url = new URL(`${supabaseUrl}/rest/v1/generated_interpretations`);
  url.searchParams.set("select", select);
  url.searchParams.set("status", "eq.LIVE");
  url.searchParams.set("lane", "eq.serving");
  url.searchParams.set("review_state", "is.null");
  url.searchParams.set("target_date", "is.null");
  url.searchParams.set("order", "id.asc");
  url.searchParams.set("limit", String(pageSize));
  if (cursor) url.searchParams.set("id", `gt.${cursor}`);
  const response = await fetch(url, {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`
    }
  });
  if (!response.ok) throw new Error(`Snapshot query failed (${response.status}): ${await response.text()}`);
  const pageRows = await response.json();
  if (!Array.isArray(pageRows)) throw new Error("Snapshot query returned a non-array payload.");
  rows.push(...pageRows);
  const lastId = pageRows.at(-1)?.id ?? null;
  if (pageRows.length < pageSize) {
    cursor = null;
    break;
  }
  if (!lastId) throw new Error("Snapshot pagination did not return a stable id cursor.");
  cursor = lastId;
  if (page === 99) throw new Error("Snapshot pagination hit its safety page limit; refusing a partial snapshot.");
}

const candidates = rows.filter(durableRow).sort((a, b) => {
  const time = Date.parse(b.updated_at) - Date.parse(a.updated_at);
  return time || String(b.id).localeCompare(String(a.id));
});
const newest = new Map();
for (const row of candidates) if (!newest.has(row.content_key)) newest.set(row.content_key, row);
const snapshotRows = [...newest.values()].sort((a, b) => String(a.content_key).localeCompare(String(b.content_key)));
if (snapshotRows.length < 100) throw new Error(`Refusing implausibly small last-known-good snapshot (${snapshotRows.length} rows).`);

let previous = null;
try {
  previous = JSON.parse(fs.readFileSync(outPath, "utf8"));
} catch {}
if (
  previous?.rowCount > 0
  && snapshotRows.length < Math.floor(previous.rowCount * 0.5)
  && process.env.ALLOW_LKG_ROW_DROP !== "1"
) {
  throw new Error(`Refusing >50% last-known-good row-count drop (${previous.rowCount} -> ${snapshotRows.length}). Set ALLOW_LKG_ROW_DROP=1 only after deliberate review.`);
}

const sourceRevision = snapshotRows.reduce((latest, row) => row.updated_at > latest ? row.updated_at : latest, "");
const snapshot = {
  schema: "content-studio-last-known-good-v1",
  sourceRevision,
  rowCount: snapshotRows.length,
  rows: snapshotRows
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const tmpPath = `${outPath}.tmp`;
fs.writeFileSync(tmpPath, `${JSON.stringify(snapshot)}\n`);
fs.renameSync(tmpPath, outPath);
console.log(JSON.stringify({ rowCount: snapshot.rowCount, sourceRevision: snapshot.sourceRevision }));
