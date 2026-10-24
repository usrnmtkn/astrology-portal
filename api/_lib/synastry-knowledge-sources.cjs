"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const root = path.resolve(__dirname, "../..");

function withSynastryKnowledgeSources(input) {
  const snapshot = input.sourceSnapshot ?? {};
  if (snapshot.knowledgeSource || Array.isArray(snapshot.knowledgeSources) && snapshot.knowledgeSources.length) return input;
  const facts = input.facts;
  const key = value => String(value ?? "").trim().toLowerCase().replace(/[_\s]+/gu, "-");
  const planetA = key(facts.planetA ?? facts.body1 ?? facts.from);
  const planetB = key(facts.planetB ?? facts.body2 ?? facts.to);
  const aspect = key(facts.aspect);
  const members = aspect === "soft" ? ["trine", "sextile"] : aspect === "hard" ? ["square", "opposition"] : [aspect];
  const fail = () => { throw new Error("SYNASTRY_KNOWLEDGE_UNAVAILABLE: complete directional relationship sources are required before generation."); };
  if (![planetA, planetB].every(value => /^[a-z][a-z_-]*$/u.test(value))
    || members.some(value => !["conjunction", "square", "opposition", "trine", "sextile"].includes(value))) return fail();
  const sources = members.map(member => {
    const relative = `packages/astro-knowledge/data/synastry/aspects/A-${planetA}_B-${planetB}_${member}.json`;
    let bytes, record;
    try { bytes = fs.readFileSync(path.join(root, relative), "utf8"); record = JSON.parse(bytes); } catch { return fail(); }
    if (record.kind !== "interaspect" || record.planetA !== planetA || record.planetB !== planetB
      || record.aspect !== member || !record.plainTranslation?.trim()) return fail();
    return { path: relative, sha256: createHash("sha256").update(bytes).digest("hex"), record };
  });
  return { ...input, sourceSnapshot: { ...snapshot, knowledgeSources: sources } };
}

module.exports = { withSynastryKnowledgeSources };
