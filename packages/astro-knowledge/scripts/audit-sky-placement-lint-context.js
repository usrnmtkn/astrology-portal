#!/usr/bin/env node
"use strict";

// Deterministic audit of the 84 four-slot recovery candidates. This script
// deliberately reports context validity separately from copy findings. Its
// purpose is to prevent an omitted planet/sign from being counted as worse
// prose, and to make temporary/legacy exemptions visible in the report.

const fs = require("fs");
const path = require("path");
const { lintArticle } = require("./lint-placement-voice.js");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const sourcePath = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "fallback-source-rows-v3.json");
const candidatePlanets = ["jupiter", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node"];
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const slots = ["tagline", "hook", "lived", "turn"];

function countBy(items, key) {
  const counts = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] || 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function loadCandidates() {
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const rows = new Map(source.hookRows.map((row) => [row.contentKey, row]));
  const candidates = candidatePlanets.flatMap((planet) => signs.map((sign) => {
    const article = {};
    for (const slot of slots) {
      const key = `fallback-hook/sky-placement-${slot}/${planet}/${sign}`;
      const row = rows.get(key);
      if (!row) throw new Error(`Missing recovery row ${key}`);
      article[slot] = row.body_you ?? "";
    }
    return { id: `${planet}/${sign}`, planet, sign, article };
  }));
  if (candidates.length !== 84) throw new Error(`Expected 84 recovery candidates; found ${candidates.length}`);
  return candidates;
}

function runScenario(candidates, scenario) {
  const rows = candidates.map((candidate) => {
    const article = scenario.allowLegacyTagline
      ? { hook: candidate.article.hook, lived: candidate.article.lived, turn: candidate.article.turn }
      : candidate.article;
    const options = {
      allowLegacyTagline: scenario.allowLegacyTagline,
      allowLegacyGenericPeople: scenario.allowLegacyGenericPeople
    };
    const result = scenario.supplyContext
      ? lintArticle(article, { ...options, planet: candidate.planet, sign: candidate.sign })
      : lintArticle(article, options);
    return { id: candidate.id, result };
  });
  const findings = rows.flatMap(({ id, result }) => result.findings.map((finding) => ({ id, ...finding })));
  const failingRows = rows.filter(({ result }) => result.auditValid && result.fails > 0);
  const unscoredFindingRows = rows.filter(({ result }) => !result.auditValid && result.fails > 0);
  return {
    id: scenario.id,
    description: scenario.description,
    contextValid: rows.filter(({ result }) => result.auditValid).length,
    contextInvalid: rows.filter(({ result }) => !result.auditValid).length,
    scoredFailingPages: failingRows.length,
    unscoredCopyFindingPages: unscoredFindingRows.length,
    totalFails: findings.filter((finding) => finding.severity === "fail").length,
    totalWarnings: findings.filter((finding) => finding.severity === "warn").length,
    failuresByRule: countBy(findings.filter((finding) => finding.severity === "fail"), (finding) => finding.decisionId || finding.term),
    invalidContextByField: countBy(rows.flatMap(({ result }) => result.contextErrors), (entry) => entry.field),
    failedPageIds: failingRows.map(({ id }) => id)
  };
}

function main() {
  const candidates = loadCandidates();
  const scenarios = [
    {
      id: "missing-astrology-context",
      description: "Invalid control: July fragment taglines excluded, but planet/sign omitted. Copy findings are not a valid placement score.",
      supplyContext: false,
      allowLegacyTagline: true,
      allowLegacyGenericPeople: false
    },
    {
      id: "explicit-context-current-policy",
      description: "Valid body-slot audit with planet/sign supplied through lintArticle's context argument; July fragment taglines excluded.",
      supplyContext: true,
      allowLegacyTagline: true,
      allowLegacyGenericPeople: false
    },
    {
      id: "explicit-context-people-diagnostic-exemption",
      description: "Compatibility control: valid context plus the retired people exemption; results must match current policy because CF-001 is non-blocking. July fragment taglines excluded.",
      supplyContext: true,
      allowLegacyTagline: true,
      allowLegacyGenericPeople: true
    },
    {
      id: "explicit-context-no-legacy-exemptions",
      description: "Valid full current-policy audit. This includes the newer full-sentence tagline rule.",
      supplyContext: true,
      allowLegacyTagline: false,
      allowLegacyGenericPeople: false
    }
  ].map((scenario) => runScenario(candidates, scenario));
  process.stdout.write(`${JSON.stringify({
    schema: "sky-placement-lint-context-audit-v1",
    source: path.relative(repoRoot, sourcePath),
    candidatePages: candidates.length,
    scenarios
  }, null, 2)}\n`);
}

main();
