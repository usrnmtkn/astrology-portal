import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(import.meta.dirname, "..");
const outFile = path.join(os.tmpdir(), `tldr-soul-career-contract-${Date.now()}.mjs`);

await build({
  absWorkingDir: repoRoot,
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: outFile,
  write: true,
  logLevel: "silent",
  define: {
    "import.meta.env": JSON.stringify({
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: ""
    })
  },
  stdin: {
    resolveDir: repoRoot,
    loader: "tsx",
    contents: `
      export { resolveCareerArchetypeProfile } from "./apps/web/src/services/careerArchetype.ts";
      export { resolveSoulRoadmapProfile } from "./apps/web/src/components/charts/SoulRoadmapCard.tsx";
    `
  }
});

const { resolveCareerArchetypeProfile, resolveSoulRoadmapProfile } = await import(pathToFileURL(outFile));

const bannedVisiblePatterns = [
  /Interpretation unavailable\./i,
  /SOURCE_GAP/i,
  /DRAFT\s+—\s+NOT READER AUTHORITY/i,
  /\bMy mission\b/i,
  /\bhouse \d+ says\b/i,
  /\bmutable movement\b/i,
  /\b[A-Z][a-z]+ \/ [A-Z][a-z]+ Career\b/,
  /reviewed placement bank/i,
  /Use the calculated/i,
  /entries are ordered/i,
  /Do not apply/i,
  /West hemisphere|East hemisphere|North hemisphere|South hemisphere/i,
  /innovation, independence, community/i,
  /\{\{[^}]+}}/
];

function textOfCareer(profile) {
  return [
    profile.title,
    profile.tldr,
    profile.summary,
    ...profile.sections.flatMap((section) => [section.label, section.headline, section.body])
  ].join("\n");
}

function textOfSoul(profile) {
  return [
    profile.label,
    profile.title,
    profile.tldr,
    ...profile.sections.flatMap((section) => [section.heading, section.body])
  ].join("\n");
}

function assertReaderClean(label, text) {
  assert.ok(text.trim(), `${label} should render visible text`);
  for (const pattern of bannedVisiblePatterns) {
    assert.equal(pattern.test(text), false, `${label} contains banned visible text: ${pattern}`);
  }
}

function position(planet, sign, house) {
  return {
    planet,
    glyph: planet,
    sign,
    signGlyph: sign,
    degree: 12,
    house,
    motion: "direct"
  };
}

const careerSky = {
  location: { label: "Test", latitude: 0, longitude: 0 },
  generatedAt: "2026-07-15T00:00:00.000Z",
  ascendant: "Gemini",
  midheaven: "Pisces",
  moonPhase: "Waxing",
  dominantElement: "Water",
  positions: [
    position("Sun", "Aquarius", 9),
    position("Moon", "Scorpio", 6),
    position("Mercury", "Pisces", 10),
    position("Jupiter", "Aquarius", 9),
    position("Saturn", "Virgo", 4),
    position("North Node", "Virgo", 3)
  ],
  aspects: []
};

const selfCareer = resolveCareerArchetypeProfile(careerSky);
assert.ok(selfCareer, "self career profile should render");
assert.equal(selfCareer.title, "Your career pattern");
assertReaderClean("self career", textOfCareer(selfCareer));
assert.ok(selfCareer.summary.split(/\s+/).length >= 70, "career should render as a paragraph, not a stub");
assert.equal(selfCareer.sections.length, 1, "career should not emit one public section per chart factor");

const friendCareer = resolveCareerArchetypeProfile(careerSky, null, { ownerName: "Jordan", pronouns: { subject: "he", object: "him", possessive: "his", reflexive: "himself" } });
assert.ok(friendCareer, "friend career profile should render");
assert.equal(friendCareer.title, "Jordan's career pattern");
assertReaderClean("friend career", textOfCareer(friendCareer));
assert.equal(/\byour\b/i.test(textOfCareer(friendCareer)), false, "friend career should not leak self pronouns");

const selfSoul = resolveSoulRoadmapProfile({
  sun: "Sun in Aquarius",
  moon: "Moon in Scorpio",
  northNode: "North Node in Gemini",
  rising: "Gemini",
  risingPending: false
});
assert.ok(selfSoul, "self soul profile should render");
assert.equal(selfSoul.title, "Your mission statement");
assertReaderClean("self soul", textOfSoul(selfSoul));
assert.ok(selfSoul.tldr.split(/\s+/).length >= 50, "soul purpose should render a developed paragraph");

const friendSoul = resolveSoulRoadmapProfile({
  ownerKind: "person",
  ownerName: "Maya",
  sun: "Sun in Libra",
  moon: "Moon in Cancer",
  northNode: "North Node in Virgo",
  rising: "Rising pending",
  risingPending: true
});
assert.ok(friendSoul, "friend soul profile should render");
assert.equal(friendSoul.title, "Maya's mission statement");
assertReaderClean("friend soul", textOfSoul(friendSoul));

fs.rmSync(outFile, { force: true });

console.log("Soul Purpose and Career contract ok: runtime resolvers render clean, sentence-level fallback copy for self and friend contexts.");
