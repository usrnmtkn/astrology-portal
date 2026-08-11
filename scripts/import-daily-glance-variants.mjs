#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const rowsPath = path.join(packageRoot, "source-rows/fallback-source-rows-v3.json");
const outputPath = path.join(packageRoot, "source-rows/daily-glance-variants-v1.json");
const batch4Path = "packages/astro-knowledge/review/daily-glance-batch-4-owner-authored-2026-08-05.md";
const briefsPath = "packages/astro-knowledge/review/daily-glance-batch-4-writing-briefs-2026-08-05.md";

const batch4Text = fs.readFileSync(path.join(repoRoot, batch4Path), "utf8");
const briefsText = fs.readFileSync(path.join(repoRoot, briefsPath), "utf8");
const rows = JSON.parse(fs.readFileSync(rowsPath, "utf8"));
const hooks = new Map(rows.hookRows.map((row) => [row.contentKey, row]));

const batch4Headlines = [
  ["square/saturn", "Today feels heavier than it actually is."],
  ["square/saturn", "Stop moving the finish line."],
  ["square/saturn", "Rest does not need to be earned."],
  ["square/saturn", "Perfection is a moving target."],
  ["opposition/moon", "Someone else's mood is rewriting your schedule."],
  ["opposition/moon", "Offer support, not your last reserve."],
  ["opposition/moon", "Their impatience is not your emergency."],
  ["opposition/moon", "You don't have to abandon your day to prove you care."],
  ["opposition/saturn", "What you're building is being tested, not torn down."],
  ["opposition/saturn", "Their mood is not a measure of your effort."],
  ["opposition/saturn", "Stop working harder for a response they never promised to give."],
  ["opposition/saturn", "Are you meeting shared expectations or chasing a moving standard?"],
  ["soft/moon", "Drop the guard and trust in the flow"]
];

const phraseLibraryHeadlines = [
  ["square/saturn", "This heaviness is a phase with an end date."],
  ["square/neptune", "The plan looks blurry because it's still forming, not failing."],
  ["square/pluto", "What you can't control is not yours to carry."],
  ["opposition/mercury", "You're reading too much into a short message."],
  ["opposition/venus", "You want comfort more than company."],
  ["opposition/saturn", "Feeling forgotten doesn't mean you've been left."],
  ["opposition/uranus", "The surprise is doing you a favor."],
  ["opposition/neptune", "You don't have to figure everyone out today."],
  ["soft/moon", "Old feelings are visiting, not moving back in."],
  ["soft/venus", "Let someone make things easy for you."],
  ["soft/jupiter", "Things are leaning your way."],
  ["soft/jupiter", "It's a good time to ask for what you want."],
  ["soft/jupiter", "Room to grow just opened up."],
  ["soft/saturn", "A quiet day still counts as progress."],
  ["conjunction/venus", "Affection shows up in small, practical ways."]
];

const batch4Bodies = [
  ["square/mercury", "Your thoughts are moving faster than your judgment, creating an urge to answer before you have the full story. A missing detail, delayed response, or misunderstood message can push you toward a conclusion that has not earned your certainty. Are you trying to win the argument, or be understood? Slow down before you reply. Don't make permanent choices with temporary information."],
  ["square/sun", "What would happen if you stopped managing everyone's perception of you? A quiet conflict is running under your day between who you know yourself to be and the version you present so people will take you seriously, approve of you, or leave you alone. That version may have helped you avoid criticism, rejection, or conflict. But it is exhausting to keep presenting yourself as agreeable, capable, or unaffected when that is not how you actually feel."],
  ["square/saturn", "A slow start or unfinished task can make the whole day feel like proof that you are falling behind. You may respond by working through exhaustion, treating every minor delay as proof that you don't have it together. The standard keeps moving because the goal is no longer to finish the work. It is to silence the part of you that thinks rest must be earned. Choose the one task that matters today and stop moving the finish line."],
  ["opposition/saturn", "Someone else's emotional distance or rigid expectations can make you feel as though every effort is being graded. You show up, follow through, and still wonder what you missed, working harder for a response they never promised to give. Look at the dynamic honestly: are you meeting shared expectations, or is one person moving the standard every time you get close?"]
];

function slug(value) {
  return value.toLowerCase()
    .replace(/[’']/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 56);
}

function assertVerbatim(text, sourceText, sourcePath) {
  if (!sourceText.includes(text)) {
    throw new Error(`Seed is no longer verbatim in ${sourcePath}: ${text}`);
  }
}

const keys = {};
for (const group of ["conjunction", "square", "opposition", "soft"]) {
  for (const target of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"]) {
    const key = `${group}/${target}`;
    const headlineKey = `fallback-hook/daily-headline/${key}`;
    const bodyKey = `fallback-hook/daily-body/${key}`;
    const headline = hooks.get(headlineKey)?.body_you;
    const body = hooks.get(bodyKey)?.body_you;
    if (!headline || !body) throw new Error(`Missing primary daily-glance pair for ${key}`);
    keys[key] = {
      pairing_policy: "explicit_pairs_only",
      headlines: [{ id: "primary", text: headline, review_status: "approved", provenance: { source_path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", content_key: headlineKey } }],
      bodies: [{ id: "primary", text: body, review_status: "approved", provenance: { source_path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", content_key: bodyKey } }],
      pairings: [{ id: "primary", headline_id: "primary", body_id: "primary", review_status: "approved", provenance: { source_path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json" } }]
    };
  }
}
for (let house = 1; house <= 12; house += 1) {
  const key = `house/${house}`;
  const headlineKey = `fallback-hook/daily-headline/${key}`;
  const bodyKey = `fallback-hook/daily-body/${key}`;
  const headline = hooks.get(headlineKey)?.body_you;
  const body = hooks.get(bodyKey)?.body_you;
  if (!headline || !body) throw new Error(`Missing primary daily-glance pair for ${key}`);
  keys[key] = {
    pairing_policy: "explicit_pairs_only",
    headlines: [{ id: "primary", text: headline, review_status: "approved", provenance: { source_path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", content_key: headlineKey } }],
    bodies: [{ id: "primary", text: body, review_status: "approved", provenance: { source_path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", content_key: bodyKey } }],
    pairings: [{ id: "primary", headline_id: "primary", body_id: "primary", review_status: "approved", provenance: { source_path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json" } }]
  };
}

function addSeed([key, text], kind, sourcePath, sourceText, locator) {
  assertVerbatim(text, sourceText, sourcePath);
  const collection = kind === "headline" ? keys[key].headlines : keys[key].bodies;
  if (collection.some((item) => item.text === text)) return;
  const baseId = `${kind}-${slug(text)}`;
  let id = baseId;
  let suffix = 2;
  while (collection.some((item) => item.id === id)) id = `${baseId}-${suffix++}`;
  collection.push({
    id,
    text,
    review_status: "review_needed",
    provenance: { source_path: sourcePath, locator }
  });
}

for (const seed of batch4Headlines) addSeed(seed, "headline", batch4Path, batch4Text, "preserved owner-supplied alternative title hook");
for (const seed of phraseLibraryHeadlines) addSeed(seed, "headline", briefsPath, briefsText, "PL TITLE governed mirror; original phrase-library file absent from main");
for (const seed of batch4Bodies) addSeed(seed, "body", batch4Path, batch4Text, "preserved non-canonical body");

const output = {
  schema: "tldrastro-daily-glance-variants-v1",
  version: "1.0.0",
  note: "Primary pairs mirror the shipped owner-approved rows. Imported alternatives are review_needed and cannot serve until the owner approves both their text and an explicit headline/body pairing.",
  keys: Object.fromEntries(Object.entries(keys).sort(([a], [b]) => a.localeCompare(b)))
};

if (fs.existsSync(outputPath) && !process.argv.includes("--force")) {
  throw new Error(`Refusing to replace ${path.relative(repoRoot, outputPath)} without --force.`);
}
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${Object.keys(output.keys).length} keys).`);
