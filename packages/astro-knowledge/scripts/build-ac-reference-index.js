#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const packageRoot = path.join(__dirname, "..");
const outputPath = path.join(packageRoot, "reference", "ac-reference-index.json");
const defaultAcRoot = path.join(
  os.homedir(),
  "Downloads",
  "us.sitesucker.mac.sitesucker",
  "austincoppock.com"
);

const KNOWLEDGE_CATEGORIES = new Set([
  "articles",
  "aspects-2",
  "jupiter-2",
  "mars-2",
  "nodes-eclipses",
  "planet-mercury",
  "planet-neptune",
  "planets-2",
  "retrograde",
  "saturn-2",
  "venus-2",
  "yearly-astrology"
]);
const EXCLUDED_CATEGORIES = new Set([
  "dailies",
  "dialogues-lon-duquette",
  "eavesdropping-at-midnight-podcast",
  "events",
  "holiday-features",
  "magick-2",
  "no-scopes"
]);
const STOP_WORDS = new Set(`
  about after again against also and another any are around because been before being between both but can could day
  days did does doing each even every for from further get gets got had has have having here how into its just like make
  may might more most much must new not now off often one only other our out over own really same since some still such
  than that the their them then there these they thing things this those through time too under until very was way ways
  week weeks well were what when where which while who will with within without would year years yet your
`.trim().split(/\s+/u));
const DOMAIN_WORDS = new Set(`
  astrology astrological astrologer horoscope horoscopes zodiac planet planets sign signs chart charts transit transits
  aspect aspects sun moon mercury venus mars jupiter saturn uranus neptune pluto aries taurus gemini cancer leo virgo
  libra scorpio sagittarius capricorn aquarius pisces january february march april may june july august september october
  november december monday tuesday wednesday thursday friday saturday sunday
`.trim().split(/\s+/u));
const TOPIC_ENTITIES = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
  "nodes", "eclipse", "retrograde", "conjunction", "opposition", "square", "trine", "sextile", "decans",
  "dignity", "houses", "electional", "mundane", "synastry", "magic", "timing"
];

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizeText(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/\r\n?/gu, "\n")
    .replace(/[\t ]+/gu, " ")
    .replace(/ *\n */gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function decodeHtml(text) {
  const named = {
    amp: "&", apos: "'", gt: ">", hellip: "…", laquo: "«", ldquo: '"', lsquo: "'", lt: "<",
    nbsp: " ", ndash: "–", quot: '"', raquo: "»", rdquo: '"', rsquo: "'"
  };
  return String(text).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (match, entity) => {
    if (entity[0] === "#") {
      const value = entity[1].toLowerCase() === "x"
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function words(text) {
  return normalizeText(text).toLowerCase().match(/[\p{L}]+(?:'[\p{L}]+)*/gu) || [];
}

function articleBody(html, file = "AC article") {
  const startMatch = html.match(/<div class="the_content_wrapper\s*"[^>]*>/iu);
  if (!startMatch || startMatch.index === undefined) throw new Error(`Cannot locate article body in ${file}`);
  const start = startMatch.index + startMatch[0].length;
  const endMarker = "</div></div></section>";
  const end = html.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Cannot locate article-body end in ${file}`);
  return normalizeText(decodeHtml(
    html.slice(start, end)
      .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
      .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
      .replace(/<(?:br|\/p|\/li|\/h[1-6]|\/blockquote|\/div)>/giu, "\n")
      .replace(/<[^>]+>/gu, " ")
  ));
}

function schemaArticle(html) {
  const match = html.match(/<script type="application\/ld\+json" class="yoast-schema-graph">([\s\S]*?)<\/script>/iu);
  if (!match) return null;
  try {
    const graph = JSON.parse(match[1])["@graph"] || [];
    return graph.find((entry) => entry["@type"] === "Article") || null;
  } catch {
    return null;
  }
}

function categoriesFor(html) {
  const article = html.match(/<article\b[^>]*class="([^"]*\bpost\b[^"]*)"/iu);
  return article
    ? [...article[1].matchAll(/\bcategory-([a-z0-9-]+)/gu)].map((match) => match[1])
    : [];
}

function searchTerms(text, limit = 32) {
  const counts = new Map();
  for (const word of words(text)) {
    if (word.length < 4 || STOP_WORDS.has(word) || DOMAIN_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, frequency]) => ({ term, frequency }));
}

function topicsFor(title, categories, text) {
  const searchable = `${title} ${categories.join(" ")} ${text}`.toLowerCase();
  return TOPIC_ENTITIES.filter((topic) => new RegExp(`\\b${topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "iu").test(searchable));
}

function selectedArticle(categories, wordCount) {
  if (categories.some((category) => EXCLUDED_CATEGORIES.has(category))) return false;
  return wordCount >= 60 && categories.some((category) => KNOWLEDGE_CATEGORIES.has(category));
}

function acDocuments(acRoot = defaultAcRoot) {
  if (!fs.existsSync(acRoot)) {
    throw new Error(`AC mirror not found. Pass --ac-root=/path/to/mirror.`);
  }
  const documents = [];
  for (const entry of fs.readdirSync(acRoot, { withFileTypes: true }).filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(acRoot, entry.name, "index.html");
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    const categories = categoriesFor(html);
    if (!categories.length) continue;
    let text;
    try { text = articleBody(html, entry.name); } catch { continue; }
    const wordCount = words(text).length;
    if (!selectedArticle(categories, wordCount)) continue;
    const schema = schemaArticle(html);
    documents.push({
      id: entry.name,
      source: "AC",
      sourceLabel: "AC",
      sourcePath: `${entry.name}/index.html`,
      title: decodeHtml(schema?.headline || entry.name),
      published: schema?.datePublished ? String(schema.datePublished).slice(0, 10) : null,
      categories: [...new Set(categories)].sort(),
      wordCount,
      text,
      sha256: sha256(text)
    });
  }
  const byTitle = new Map();
  for (const document of documents) {
    const titleKey = document.title.toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
    const existing = byTitle.get(titleKey);
    if (!existing || document.wordCount > existing.wordCount) byTitle.set(titleKey, document);
  }
  return [...byTitle.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function buildIndex({ acRoot = defaultAcRoot } = {}) {
  const documents = acDocuments(acRoot);
  const entries = documents.map((document) => ({
    id: document.id,
    source: "AC",
    status: "unverified-source-reference",
    readerServing: false,
    sourcePath: document.sourcePath,
    title: document.title,
    published: document.published,
    historicalDatePolicy: "archive metadata only; never a runtime astrology date",
    categories: document.categories,
    topics: topicsFor(document.title, document.categories, document.text),
    searchTerms: searchTerms(document.text),
    wordCount: document.wordCount,
    sha256: document.sha256
  }));
  return {
    schemaVersion: 1,
    id: "ac-reference-index-v1",
    sourceLabel: "AC",
    lane: "reference",
    readerServing: false,
    purpose: "Local editorial knowledge discovery and individual-word sampling.",
    policies: {
      sourceTestimonyIsNotVerifiedFact: true,
      historicalDatesNeverSupplyRuntimeFacts: true,
      phrasesAndMetaphorsNeverEnterGenerationPrompts: true,
      factsRequireIndependentVerification: true,
      fullBodiesRemainInOwnerProvidedLocalMirror: true
    },
    articleCount: entries.length,
    totalWordCount: entries.reduce((sum, entry) => sum + entry.wordCount, 0),
    manifestSha256: sha256(entries.map((entry) => `${entry.id}:${entry.sha256}`).join("\n")),
    entries
  };
}

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    if (arg.startsWith("--ac-root=")) options.acRoot = path.resolve(arg.slice(10));
    else if (arg === "--check") options.check = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const index = buildIndex(options);
  const json = `${JSON.stringify(index, null, 2)}\n`;
  if (options.check) {
    if (fs.readFileSync(outputPath, "utf8") !== json) throw new Error("AC reference index is stale.");
    console.log(`AC reference index is current (${index.articleCount} articles).`);
    return;
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, json);
  console.log(`Built ${path.relative(packageRoot, outputPath)} from ${index.articleCount} AC articles.`);
}

module.exports = { acDocuments, articleBody, buildIndex, defaultAcRoot, outputPath };

if (require.main === module) main();
