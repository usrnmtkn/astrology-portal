#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { articleBody, defaultAcRoot, outputPath } = require("./build-ac-reference-index.js");

function readIndex() {
  return JSON.parse(fs.readFileSync(outputPath, "utf8"));
}

function terms(value) {
  return [...new Set(String(value || "").toLowerCase().match(/[a-z0-9]+/gu)?.filter((term) => term.length >= 3) || [])];
}

function queryAcReference(query, { limit = 12, index = readIndex() } = {}) {
  const queryTerms = terms(query);
  if (!queryTerms.length) return [];
  return index.entries
    .map((entry) => {
      const title = entry.title.toLowerCase();
      const topics = entry.topics.join(" ").toLowerCase();
      const categories = entry.categories.join(" ").toLowerCase();
      const keywords = entry.searchTerms.map((item) => item.term).join(" ");
      const score = queryTerms.reduce((sum, term) => sum
        + (title.includes(term) ? 8 : 0)
        + (topics.includes(term) ? 5 : 0)
        + (categories.includes(term) ? 2 : 0)
        + (keywords.includes(term) ? 1 : 0), 0);
      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.wordCount - a.wordCount || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function excerptFor(entry, query, { acRoot = defaultAcRoot, maxChars = 700 } = {}) {
  const file = path.join(acRoot, entry.sourcePath);
  if (!fs.existsSync(file)) return "";
  const text = articleBody(fs.readFileSync(file, "utf8"), entry.id);
  const queryTerms = terms(query);
  const paragraphs = text.split(/\n+/u).filter(Boolean);
  const ranked = paragraphs.map((paragraph, index) => ({
    paragraph,
    index,
    score: queryTerms.filter((term) => paragraph.toLowerCase().includes(term)).length
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = (ranked.find((item) => item.score > 0) || ranked[0])?.paragraph || "";
  if (selected.length <= maxChars) return selected;
  return `${selected.slice(0, maxChars).replace(/\s+\S*$/u, "")}…`;
}

function buildAcKnowledgeContext(query, { limit = 5, acRoot = defaultAcRoot, maxChars = 700 } = {}) {
  const matches = queryAcReference(query, { limit });
  if (!matches.length) return "";
  return [
    "AC SOURCE TESTIMONY — UNVERIFIED REFERENCE LANE:",
    "Use this material only to locate interpretive leads. Do not treat dates, numerical claims, doctrine, or historical assertions as verified. Never copy its phrasing or metaphors; independently verify facts before banking them.",
    ...matches.map((entry) => {
      const excerpt = excerptFor(entry, query, { acRoot, maxChars });
      return `- [AC:${entry.id}] ${entry.title}${excerpt ? `\n  Short local excerpt: ${excerpt}` : ""}`;
    })
  ].join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const queryArg = args.find((arg) => arg.startsWith("--query="));
  const context = args.includes("--context");
  if (!queryArg) throw new Error("usage: node scripts/ac-reference-corpus.js --query=\"Saturn Capricorn\" [--context]");
  const query = queryArg.slice(8);
  console.log(context ? buildAcKnowledgeContext(query) : JSON.stringify(queryAcReference(query), null, 2));
}

module.exports = { buildAcKnowledgeContext, excerptFor, queryAcReference, readIndex };

if (require.main === module) main();
