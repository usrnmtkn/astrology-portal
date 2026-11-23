#!/usr/bin/env node
import { projectReaderRow, READER_ROW_SCHEMA } from "../apps/web/src/content/readerRowProjection.mjs";
import { correctedReaderSummary } from "../apps/web/src/content/fallbackArchitectureV3/readerSummaryReferenceCorrections.mjs";
import { loadPrivacyPolicy, privateSafeExport } from "./lib/privacy-policy.mjs";
import { readPublicationSnapshot, publicationSnapshotIdentity, assertStablePublicationSnapshot, publishedSnapshotSchema, validateSnapshotPair, validateRecoverySnapshot, snapshotRowIsPublished } from "./lib/content-studio-snapshot.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSnapshotPath = path.join(repoRoot, "apps/web/public/content-studio-last-known-good.json");
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

function durableRow(row, publicationByKey) {
  if (row.status !== "LIVE" || row.lane !== "serving" || row.review_state != null || row.target_date != null) return false;
  if (row.provider === skyPlacementProvider && !publicationByKey.has(row.content_key)) return false;
  const key = String(row.content_key ?? "");
  if (!key || key.startsWith("sample-") || key.startsWith("sky/article-template/") || key.startsWith("sky-article-template/")) return false;
  if (row.provider !== coreProvider && row.provider !== skyPlacementProvider && !durablePrefixes.some((prefix) => key.startsWith(prefix))) return false;
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

async function readReaderSnapshot(readerUrl, fetchImpl) {
  const rows = [];
  let cursor = null;
  const maxPages = 200;
  for (let page = 0; page < maxPages; page += 1) {
    const response = await fetchImpl(readerUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cursor ? { afterId: cursor } : {}), signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`Reader snapshot query failed (${response.status}).`);
    const payload = await response.json();
    if (payload.schema !== READER_ROW_SCHEMA || !Array.isArray(payload.rows)
      || !(payload.nextCursor === null || typeof payload.nextCursor === "string")) throw new Error("Invalid reader snapshot response.");
    rows.push(...payload.rows);
    if (payload.nextCursor === null) break;
    if (cursor && payload.nextCursor <= cursor) throw new Error("Snapshot pagination did not advance.");
    cursor = payload.nextCursor;
    if (page === maxPages - 1) throw new Error("Snapshot pagination hit its safety limit; refusing a partial snapshot.");
  }

  return rows;
}

export async function exportContentStudioSnapshots({
  outPath = defaultSnapshotPath, publishedPath = null, ifChanged = false,
  readerUrl = process.env.CONTENT_READER_URL ?? "https://tldrastro.vercel.app/api/content-reader",
  fetchImpl = fetch, privacyPolicy = loadPrivacyPolicy(repoRoot)
} = {}) {
  const publicationOptions = { supabaseUrl, publishableKey, fetchImpl };
  const initialPublications = await readPublicationSnapshot(publicationOptions);
  let previous = null;
  try {
    previous = JSON.parse(fs.readFileSync(outPath, "utf8"));
  } catch {}
  // Scheduled articles can become public without changing the ledger. The complete
  // archive must always enumerate the controlled reader; only the legacy recovery-
  // only CLI retains its metadata shortcut. Identical bytes still create no commit.
  if (!publishedPath && ifChanged && previous?.schema === 'content-studio-last-known-good-v2'
    && publicationSnapshotIdentity(previous.publications ?? []) === publicationSnapshotIdentity(initialPublications)) {
    validateRecoverySnapshot(previous, projectReaderRow);
    return { state: 'unchanged', rowCount: previous.rowCount };
  }
  const rows = await readReaderSnapshot(readerUrl, fetchImpl);
  if (publishedPath) {
    // The reusable-key ledger does not version dated instances. A second full
    // enumeration detects their edits, deletions, new editions and timed release
    // transitions too; never replace either artifact from a changing inventory.
    const confirmation = await readReaderSnapshot(readerUrl, fetchImpl);
    const identity = values => JSON.stringify(values.map(row => projectReaderRow(row))
      .sort((a, b) => String(a?.id).localeCompare(String(b?.id))));
    if (identity(rows) !== identity(confirmation)) throw new Error('Published reader inventory changed during export; retry.');
  }

  // Export the same durable lifecycle records used by Studio and the reader.
  const publications = await readPublicationSnapshot(publicationOptions);
  assertStablePublicationSnapshot(initialPublications, publications);
  const publicationByKey = new Map(publications.map((record) => [record.content_key, record]));
  const isCurrentPublication = row => snapshotRowIsPublished(row, publicationByKey);

  const candidates = rows.filter(row => durableRow(row, publicationByKey)).filter(isCurrentPublication).sort((a, b) => {
    const time = Date.parse(b.updated_at) - Date.parse(a.updated_at);
    return time || String(b.id).localeCompare(String(a.id));
  });
  const newest = new Map();
  for (const row of candidates) if (!newest.has(row.content_key)) newest.set(row.content_key, row);
  const snapshotRows = [...newest.values()].map((source) => projectReaderRow({
    ...source, summary: correctedReaderSummary(source.content_key, source.summary)
  })).filter(Boolean).sort((a, b) => String(a.content_key).localeCompare(String(b.content_key)));
  if (snapshotRows.length < 100) throw new Error(`Refusing implausibly small last-known-good snapshot (${snapshotRows.length} rows).`);

  if (
    previous?.rowCount > 0
    && snapshotRows.length < Math.floor(previous.rowCount * 0.5)
    && process.env.ALLOW_LKG_ROW_DROP !== "1"
  ) {
    throw new Error(`Refusing >50% last-known-good row-count drop (${previous.rowCount} -> ${snapshotRows.length}). Set ALLOW_LKG_ROW_DROP=1 only after deliberate review.`);
  }

  const sourceRevision = snapshotRows.reduce((latest, row) => row.updated_at > latest ? row.updated_at : latest, "");
  const snapshot = {
    schema: "content-studio-last-known-good-v2",
    sourceRevision,
    publications,
    rowCount: snapshotRows.length,
    rows: snapshotRows
  };
  const artifacts = [[outPath, snapshot]];
  if (publishedPath) {
    // The reader already applies every family's publication, approval and release-
    // time rules. Do not add a prefix/provider/date allowlist here: new published
    // families must be backed up without another exporter release.
    const publishedRows = rows.map(row => {
      if (!isCurrentPublication(row)) throw new Error('Reader publication identity changed during export.');
      const projected = projectReaderRow(row);
      if (!projected) throw new Error('Invalid published reader row.');
      return projected;
    }).sort((a, b) => a.content_key.localeCompare(b.content_key)
      || String(a.target_date ?? "").localeCompare(String(b.target_date ?? ""))
      || String(a.mode ?? "").localeCompare(String(b.mode ?? "")) || a.id.localeCompare(b.id));
    const archive = { schema: publishedSnapshotSchema,
      sourceRevision: publishedRows.reduce((latest, row) => row.updated_at > latest ? row.updated_at : latest, ""),
      publications, rowCount: publishedRows.length, rows: publishedRows };
    let previousArchive = null;
    try { previousArchive = JSON.parse(fs.readFileSync(publishedPath, "utf8")); } catch {}
    if (previousArchive?.rowCount > 0 && archive.rowCount < Math.floor(previousArchive.rowCount * 0.5)
      && process.env.ALLOW_LKG_ROW_DROP !== "1") throw new Error('Refusing >50% published archive row-count drop.');
    artifacts.push([publishedPath, archive]);
  }
  const safe = artifacts.map(([file, value]) => [file, privateSafeExport(value, privacyPolicy)]);
  if (publishedPath) validateSnapshotPair(safe[0][1], safe[1][1], projectReaderRow);
  else validateRecoverySnapshot(safe[0][1], projectReaderRow);
  // Prepare both files before replacing either. Delivery publishes their Git tree
  // atomically, and restores source bytes on every failure.
  try {
    for (const [file, value] of safe) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(value)}\n`);
    }
    for (const [file] of safe) fs.renameSync(`${file}.tmp`, file);
  } finally { for (const [file] of safe) fs.rmSync(`${file}.tmp`, { force: true }); }
  return { rowCount: snapshot.rowCount, publishedRowCount: safe[1]?.[1].rowCount,
    sourceRevision: snapshot.sourceRevision };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const index = process.argv.indexOf('--published-output');
  if (index >= 0 && (!process.argv[index + 1] || process.argv[index + 1].startsWith('--'))) {
    throw new Error('--published-output requires an archive file path.');
  }
  console.log(JSON.stringify(await exportContentStudioSnapshots({
    ifChanged: process.argv.includes('--if-changed'),
    publishedPath: index < 0 ? null : path.resolve(process.argv[index + 1])
  })));
}
