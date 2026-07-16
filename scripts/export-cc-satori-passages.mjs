import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const outDir = path.join(repoRoot, "exports", "cc-satori-passages-review-20260715");

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const writeJson = (fileName, value) => fs.writeFileSync(path.join(outDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
const writeText = (fileName, value) => fs.writeFileSync(path.join(outDir, fileName), value);

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) || typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n") + "\n";
}

function writeCsv(fileName, rows, columns) {
  writeText(fileName, toCsv(rows, columns));
}

function formatMarkdownRows(title, rows, renderRow) {
  return `# ${title}\n\n${rows.map(renderRow).join("\n\n---\n\n")}\n`;
}

ensureDir(outDir);

const ccSourcePath = "apps/web/src/content/templateHandoffV2/sources/cc-source-phrases.json";
const ccSourcePhrases = readJson(ccSourcePath);
const ccRuntimeRows = Object.entries(ccSourcePhrases)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([source_key, text]) => ({
    source_key,
    text,
    source_file: `tldrastro/${ccSourcePath}`,
  }));

writeJson("cc-runtime-source-phrases.json", ccRuntimeRows);
writeCsv("cc-runtime-source-phrases.csv", ccRuntimeRows, ["source_key", "text", "source_file"]);
writeText(
  "cc-runtime-source-phrases.md",
  formatMarkdownRows("CC Runtime Source Phrases", ccRuntimeRows, (row) => `## ${row.source_key}\n\n${row.text}`),
);

const mappingPath = "scripts/generated/phrasebank-import-20260714-v8/tldr-astro-store-import-mapping.json";
const phrasebankMapping = readJson(mappingPath);
const ccPhrasebankRows = phrasebankMapping
  .filter((row) => row.incoming_key?.startsWith("cc/") || row.source_file?.includes("/cc-"))
  .map((row) => ({
    incoming_key: row.incoming_key,
    target_database_key: row.target_database_key,
    target_content_family: row.target_content_family,
    target_surface: row.target_surface,
    mode: row.mode,
    mapped_status: row.mapped_status,
    lane: row.lane,
    action: row.action,
    source_file: row.source_file,
    text: row.text,
    generated_headline: row.generated_headline,
    generated_summary: row.generated_summary,
    generated_body: row.generated_body,
    generated_feed_body: row.generated_feed_body,
    provenance: row.provenance,
    generated_sections: row.generated_sections,
  }))
  .sort((a, b) => `${a.source_file}:${a.incoming_key}`.localeCompare(`${b.source_file}:${b.incoming_key}`));

writeJson("cc-phrasebank-import-used-rows.json", ccPhrasebankRows);
writeCsv("cc-phrasebank-import-used-rows.csv", ccPhrasebankRows, [
  "incoming_key",
  "target_database_key",
  "target_content_family",
  "target_surface",
  "mode",
  "mapped_status",
  "lane",
  "action",
  "source_file",
  "text",
  "generated_headline",
  "generated_summary",
  "generated_body",
  "generated_feed_body",
  "provenance",
  "generated_sections",
]);
writeText(
  "cc-phrasebank-import-used-rows.md",
  formatMarkdownRows(
    "CC Phrasebank Import Rows",
    ccPhrasebankRows,
    (row) => [
      `## ${row.incoming_key}`,
      `- Target: ${row.target_database_key}`,
      `- Family: ${row.target_content_family}`,
      `- Surface/mode: ${row.target_surface ?? ""} / ${row.mode ?? ""}`,
      `- Status/lane/action: ${row.mapped_status ?? ""} / ${row.lane ?? ""} / ${row.action ?? ""}`,
      `- Source file: ${row.source_file}`,
      "",
      row.text ?? row.generated_body ?? "",
    ].join("\n"),
  ),
);

const satoriQuotesPath = "tldr-astro-phrasebank/phrasebank/ms-satori-articles-confirmed.json";
const satoriQuotes = readJson(satoriQuotesPath);
const satoriQuoteRows = satoriQuotes.quotes.map((quote) => ({
  id: quote.id,
  text: quote.text,
  tier: quote.tier,
  source: quote.source,
  register: quote.register,
  serving: quote.serving,
  themes: quote.themes,
  source_file: `tldrastro/${satoriQuotesPath}`,
}));
writeJson("satori-confirmed-article-quotes.json", {
  meta: satoriQuotes._meta,
  quotes: satoriQuoteRows,
});
writeCsv("satori-confirmed-article-quotes.csv", satoriQuoteRows, [
  "id",
  "text",
  "tier",
  "source",
  "register",
  "serving",
  "themes",
  "source_file",
]);
writeText(
  "satori-confirmed-article-quotes.md",
  formatMarkdownRows("Satori Confirmed Article Quotes", satoriQuoteRows, (row) => `## ${row.id}\n\n${row.text}\n\nSource: ${row.source}`),
);

const satoriBookPath = "packages/astro-knowledge/sources/authored/marie-satori-book/celestial-alchemy-natal-placement-excerpts.json";
const satoriBook = readJson(satoriBookPath);
const satoriBookRows = satoriBook.sections.map((section) => ({
  id: section.id,
  title: section.title,
  match_type: section.matchType,
  sign: section.sign,
  house: section.house,
  source_line_range: section.sourceLineRange,
  usage: section.usage,
  edit_status: section.editStatus,
  source_type: section.sourceType,
  direct_use_allowed: section.directUseAllowed,
  used_astrology_body: section.astrologyBody,
  preserved_source_body: section.sourceBody,
  tarot_notes: section.tarotNotes,
  business_notes: section.businessNotes,
  source_file: `tldrastro/${satoriBookPath}`,
}));
writeJson("satori-book-natal-placement-excerpts.json", {
  meta: {
    id: satoriBook.id,
    kind: satoriBook.kind,
    sourceDocument: satoriBook.sourceDocument,
    note: satoriBook.note,
  },
  sections: satoriBookRows,
});
writeCsv("satori-book-natal-placement-excerpts.csv", satoriBookRows, [
  "id",
  "title",
  "match_type",
  "sign",
  "house",
  "source_line_range",
  "usage",
  "edit_status",
  "source_type",
  "direct_use_allowed",
  "used_astrology_body",
  "preserved_source_body",
  "tarot_notes",
  "business_notes",
  "source_file",
]);
writeText(
  "satori-book-natal-placement-excerpts.md",
  formatMarkdownRows(
    "Satori Book Natal Placement Excerpts",
    satoriBookRows,
    (row) => [
      `## ${row.title}`,
      `- ID: ${row.id}`,
      `- Source lines: ${row.source_line_range}`,
      `- Usage: ${row.usage}`,
      "",
      "### Used Astrology Body",
      "",
      row.used_astrology_body || "",
      "",
      "### Preserved Source Body",
      "",
      row.preserved_source_body || "",
    ].join("\n"),
  ),
);

const satoriFallbackDir = "scripts/generated/satori-fallback-row-import-v19";
for (const fileName of [
  "tldr-astro-fallback-row-audit.csv",
  "tldr-astro-fallback-import-report.md",
  "tldr-astro-fallback-conflicts.csv",
  "tldr-astro-fallback-unmapped.csv",
]) {
  fs.copyFileSync(path.join(repoRoot, satoriFallbackDir, fileName), path.join(outDir, `satori-fallback-${fileName.replace(/^tldr-astro-fallback-/, "")}`));
}

const manifest = {
  generated_at: new Date().toISOString(),
  output_directory: outDir,
  sources: {
    cc_runtime_source_phrases: {
      source_file: `tldrastro/${ccSourcePath}`,
      rows: ccRuntimeRows.length,
    },
    cc_phrasebank_import_used_rows: {
      source_file: `tldrastro/${mappingPath}`,
      rows: ccPhrasebankRows.length,
      filter: "incoming_key starts with cc/ OR source_file contains /cc-",
    },
    satori_confirmed_article_quotes: {
      source_file: `tldrastro/${satoriQuotesPath}`,
      rows: satoriQuoteRows.length,
    },
    satori_book_natal_placement_excerpts: {
      source_file: `tldrastro/${satoriBookPath}`,
      rows: satoriBookRows.length,
      note: "used_astrology_body is the app-source field called out by the source usage note; preserved_source_body is included for review.",
    },
    satori_fallback_import_audit: {
      source_directory: `tldrastro/${satoriFallbackDir}`,
      rows: 18,
      note: "Copied latest v19 dry-run audit/report files.",
    },
  },
};

writeJson("manifest.json", manifest);
writeText(
  "README.md",
  [
    "# CC and Satori Passages Review Export",
    "",
    "This folder contains reviewable exports of passages and phrases used from CC and Satori sources.",
    "",
    "## Contents",
    "",
    "- `cc-runtime-source-phrases.*`: active keyed CC phrases imported by the source-grounded runtime.",
    "- `cc-phrasebank-import-used-rows.*`: latest phrasebank import rows whose incoming key/source file is CC.",
    "- `satori-confirmed-article-quotes.*`: confirmed Marie Satori article quotes marked serve-verbatim.",
    "- `satori-book-natal-placement-excerpts.*`: natal placement excerpts from the Marie Satori book source; includes the used astrology body plus preserved source body for review.",
    "- `satori-fallback-*`: copied v19 Satori fallback dry-run audit/report files.",
    "- `manifest.json`: source paths and row counts.",
    "",
  ].join("\n"),
);

console.log(`Wrote ${outDir}`);
console.log(JSON.stringify(manifest.sources, null, 2));
