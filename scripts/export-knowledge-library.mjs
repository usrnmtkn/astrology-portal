import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "packages/astro-knowledge/dist/knowledge.json");
const outDir = path.join(root, "exports");
const csvPath = path.join(outDir, "knowledge-library.csv");
const mdPath = path.join(outDir, "knowledge-library.md");

const knowledge = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const collections = Object.entries(knowledge)
  .filter(([, value]) => Array.isArray(value))
  .filter(([key]) => key !== "primitives");

const titleFrom = (entry) =>
  entry.title ??
  entry.displayTitle ??
  entry.heading ??
  entry.name ??
  [
    entry.phase,
    entry.sign,
    entry.planet,
    entry.point,
    entry.transiting,
    entry.aspect,
    entry.other,
    entry.natal,
    entry.house ? `House ${entry.house}` : "",
    entry.risingSign
  ]
    .filter(Boolean)
    .join(" ");

const keyFieldsFrom = (entry) => {
  const keys = [
    "kind",
    "surface",
    "mode",
    "phase",
    "sign",
    "planet",
    "point",
    "transiting",
    "natal",
    "aspect",
    "other",
    "planetA",
    "planetB",
    "house",
    "risingSign",
    "placementType",
    "category",
    "role"
  ];

  return keys
    .filter((key) => entry[key] !== undefined && entry[key] !== null && entry[key] !== "")
    .map((key) => `${key}: ${Array.isArray(entry[key]) ? entry[key].join(" | ") : entry[key]}`)
    .join("; ");
};

const textFrom = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textFrom).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, nested]) => `${key}: ${textFrom(nested)}`)
      .join("\n");
  }
  return String(value);
};

const pickText = (entry, keys) => keys.map((key) => textFrom(entry[key])).find(Boolean) ?? "";

const metadataFrom = (entry) => {
  const primaryKeys = new Set([
    "id",
    "title",
    "displayTitle",
    "heading",
    "status",
    "kind",
    "surface",
    "mode",
    "phase",
    "sign",
    "planet",
    "point",
    "transiting",
    "natal",
    "aspect",
    "other",
    "planetA",
    "planetB",
    "house",
    "risingSign",
    "placementType",
    "category",
    "role",
    "summary",
    "tldr",
    "overview",
    "plainTranslation",
    "body",
    "meaning",
    "voiceNeutral"
  ]);

  return Object.fromEntries(Object.entries(entry).filter(([key]) => !primaryKeys.has(key)));
};

const csvEscape = (value) => {
  const text = textFrom(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const rows = [];
for (const [collection, entries] of collections) {
  entries.forEach((entry, index) => {
    rows.push({
      collection,
      index: index + 1,
      id: entry.id ?? "",
      status: entry.status ?? "",
      title: titleFrom(entry),
      key_fields: keyFieldsFrom(entry),
      summary: pickText(entry, ["summary", "tldr", "overview", "plainTranslation"]),
      body: pickText(entry, ["body", "meaning"]),
      voice_neutral: textFrom(entry.voiceNeutral),
      metadata_json: JSON.stringify(metadataFrom(entry))
    });
  });
}

const columns = [
  "collection",
  "index",
  "id",
  "status",
  "title",
  "key_fields",
  "summary",
  "body",
  "voice_neutral",
  "metadata_json"
];

const csv = [
  columns.join(","),
  ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
].join("\n");

const md = [
  "# TLDR Astro Knowledge Library",
  "",
  `Generated from \`${path.relative(root, inputPath)}\`.`,
  "",
  `Version: ${knowledge.version ?? "unknown"}`,
  "",
  `Generated at: ${knowledge.generatedAt ?? "unknown"}`,
  "",
  `Total exported entries: ${rows.length}`,
  "",
  "## Collections",
  "",
  ...collections.map(([collection, entries]) => `- ${collection}: ${entries.length}`),
  "",
  ...collections.flatMap(([collection, entries]) => [
    `## ${collection}`,
    "",
    ...entries.flatMap((entry, index) => {
      const lines = [
        `### ${index + 1}. ${titleFrom(entry) || entry.id || "Untitled"}`,
        "",
        `- ID: ${entry.id ?? ""}`,
        `- Status: ${entry.status ?? ""}`,
        `- Key fields: ${keyFieldsFrom(entry) || ""}`
      ];

      const summary = pickText(entry, ["summary", "tldr", "overview", "plainTranslation"]);
      const body = pickText(entry, ["body", "meaning"]);
      const voiceNeutral = textFrom(entry.voiceNeutral);

      if (summary) lines.push("", "**Summary**", "", summary);
      if (body) lines.push("", "**Body**", "", body);
      if (voiceNeutral) lines.push("", "**Voice Neutral**", "", voiceNeutral);

      return [...lines, ""];
    })
  ])
].join("\n");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(csvPath, `${csv}\n`);
fs.writeFileSync(mdPath, `${md}\n`);

console.log(`Exported ${rows.length} entries.`);
console.log(csvPath);
console.log(mdPath);
