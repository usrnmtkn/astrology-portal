#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildFallbackImportAudit,
  loadFallbackImportRows,
  writeFallbackImportDryRunArtifacts
} from "./import-authored-fallback-rows-dry-run.mjs";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const recordsPath = "/Users/mprez/Downloads/us.sitesucker.mac.sitesucker/www.chani.com/tldr-astro-records.json";
const satoriFallbackRowsPath = "/Users/mprez/Downloads/us.sitesucker.mac.sitesucker/www.chani.com/tldr-astro-satori-fallback-rows.json";
const dependencyMapPath = path.join(repoRoot, "apps", "web", "src", "content", "fallback-vocabulary-dependencies.json");
const phraseBookPath = path.join(repoRoot, "apps", "web", "src", "content", "metaphor-specificity-phrasebook.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function materialize(pattern, values) {
  return pattern.replace(/\{([a-zA-Z]+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}

function phraseFlags(text, contentKey = "test-row") {
  const phraseBook = readJson(phraseBookPath);
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return phraseBook.validationPhrases.flatMap((phrase) => {
    const sentence = sentences.find((item) => item.toLowerCase().includes(phrase.toLowerCase()));
    return sentence ? [{ contentKey, phrase, sentence }] : [];
  });
}

function storeRows() {
  const payload = readJson(recordsPath);
  return Array.isArray(payload) ? payload : payload.records;
}

function storeKeys(rows) {
  return new Set(rows.map((row) => row.key || row.content_key || row.contentKey).filter(Boolean));
}

export function runFallbackWiringAndPhraseBookTests() {
  const sourceRows = loadFallbackImportRows();
  const auditRows = buildFallbackImportAudit(sourceRows);

  assert.equal(sourceRows.length, 55, "expected the supplied 55 authored fallback rows");
  assert.equal(auditRows.length, 55);
  assert(auditRows.every((row) => row.status === "DRAFT"), "all fallback rows must remain DRAFT");
  assert(auditRows.every((row) => row.lane === "serving"), "all fallback rows must be serving-lane candidates");
  assert(auditRows.every((row) => row.review_state === "editorial-review-required"), "all rows require editorial review");
  assert(auditRows.every((row) => !row.canonical_key.startsWith("store/")), "no row may use a blanket store prefix");
  assert.equal(auditRows.filter((row) => row.mapping_action === "CONFLICT").length, 0);
  assert.equal(auditRows.filter((row) => row.mapping_action === "UNMAPPED").length, 0);
  assert(auditRows.some((row) => row.existing_canonical_match === "fallback-hook/friends.same-planet"), "same-planet synastry fallback family should be registered");

  const satoriSourceRows = loadFallbackImportRows(satoriFallbackRowsPath);
  const satoriAuditRows = buildFallbackImportAudit(satoriSourceRows);
  assert.equal(satoriSourceRows.length, 18, "expected the Satori authored fallback package rows");
  assert.equal(satoriAuditRows.filter((row) => row.mapping_action === "CONFLICT").length, 0);
  assert.equal(satoriAuditRows.filter((row) => row.mapping_action === "UNMAPPED").length, 0);
  assert.equal(satoriAuditRows.filter((row) => row.mapping_action === "NEW_CANONICAL_KEY").length, 10);
  assert.equal(satoriAuditRows.filter((row) => row.mapping_action === "MATCH_EXISTING").length, 8);
  assert(satoriAuditRows.every((row) => row.status === "DRAFT"), "Satori fallback rows must remain DRAFT");
  assert(satoriAuditRows.every((row) => row.review_state === "editorial-review-required"), "Satori rows require editorial review");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fallback-v18-dry-run-"));
  const result = writeFallbackImportDryRunArtifacts({ outDir: tempDir });
  assert.equal(result.rows.length, 205);
  assert.equal(result.rows.filter((row) => row.content_family === "planetary-placement-child-fallback").length, 132);
  assert(result.rows.some((row) => row.canonical_key === "fallback-hook/sky.planetary-placement/sun/cancer"), "placement child rows must be included");
  assert(result.rows.some((row) => row.canonical_key === "fallback-hook/sky.aspect-detail/conjunction/card"), "sky aspect rows must be children of sky.aspect-detail");

  const sql = fs.readFileSync(path.join(tempDir, "tldr-astro-fallback-dry-run.sql"), "utf8");
  assert(sql.includes("'DRAFT'"), "dry-run SQL must emit DRAFT rows");
  assert(!sql.includes("'LIVE'"), "dry-run SQL must not emit LIVE rows");
  assert(sql.includes("on conflict (content_key, target_date, mode) do nothing"), "dry-run SQL must preserve existing rows");

  const rows = storeRows();
  const keys = storeKeys(rows);
  const dependencyData = readJson(dependencyMapPath);
  const sampleValues = {
    aspect: "square",
    planetA: "mars",
    planetB: "saturn",
    planet: "mars",
    sign: "aries",
    phase: "retrograde",
    type: "lunar",
    contact: "sun-conjunct-moon",
    context: "friends",
    house: "7",
    facet: "function",
    modifier: "aspect-conjunction"
  };

  for (const family of dependencyData.families) {
    for (const pattern of [...family.required, ...family.optional].filter((item) => !item.includes("*") && item !== "house-reliability")) {
      const key = materialize(pattern, sampleValues);
      assert(keys.has(key), `${family.id} dependency should resolve to store key ${key}`);
      const record = rows.find((item) => item.key === key);
      if (key.startsWith("cc/")) {
        assert.equal(record?.lane, "reference", `${key} must remain reference-lane generation context`);
      }
    }
  }

  const theirToYourRule = dependencyData.houseReliabilityRules.find((rule) => rule.direction === "their-planet-in-your-house");
  const yourToTheirRule = dependencyData.houseReliabilityRules.find((rule) => rule.direction === "your-planet-in-their-house");
  assert.equal(theirToYourRule.requires, "yourReliableBirthTime");
  assert.equal(yourToTheirRule.requires, "theirReliableBirthTime");

  const flags = phraseFlags("This contact asks one plain question. Do not sign the thing yet.", "seeded/blocklist");
  assert.equal(flags.length, 3);
  assert.equal(flags[0].contentKey, "seeded/blocklist");
  assert(flags.some((flag) => flag.sentence.includes("This contact asks one plain question")));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFallbackWiringAndPhraseBookTests();
  console.log("fallback wiring and phrasebook tests passed");
}
