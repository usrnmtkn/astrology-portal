import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const phrasebankDir = path.join(repoRoot, "tldr-astro-phrasebank", "phrasebank");
const outputPath = path.join(repoRoot, "apps", "web", "src", "content", "placementScaffoldData.json");

const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(phrasebankDir, filename), "utf8"));
}

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function setText(target, key, value) {
  const text = clean(value);
  if (text) target[key] = text;
}

function rows(filename) {
  const json = readJson(filename);
  return Array.isArray(json.reviewed) ? json.reviewed : [];
}

const signStories = {};
for (const row of rows("cc-planet-in-sign-reviewed.json")) {
  setText(signStories, `${slug(row.body)}.${slug(row.sign)}`, row.natal_sign_story);
}

const houseStories = {};
for (const row of rows("cc-planet-in-house-reviewed.json")) {
  setText(houseStories, `${slug(row.body)}.${Number(row.house)}`, row.house_integration);
}

const retrograde = {};
for (const row of rows("cc-natal-retrograde-authored.json")) {
  setText(retrograde, slug(row.body), row.text || row.restrained_sentence);
}

const data = {
  version: "placement-scaffold-v1",
  source: "tldr-astro-COMPLETE-phrasebank",
  generatedAt: new Date().toISOString(),
  servedFieldsOnly: true,
  planets,
  signs,
  signStories,
  houseStories,
  retrograde
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
console.log(`signStories=${Object.keys(signStories).length}`);
console.log(`houseStories=${Object.keys(houseStories).length}`);
console.log(`retrograde=${Object.keys(retrograde).length}`);
