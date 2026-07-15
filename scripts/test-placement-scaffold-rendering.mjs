import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/web/src/content/placementScaffoldData.json"), "utf8"));

const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const forbidden = [
  /takes on a tone that is/i,
  /The theme of/i,
  /Notice the first response/i,
  /lands in/i,
  /\bSYNTHESIS\b/i,
  /brings\b/i,
  /into .+ expression/i,
  /through .+ conditions/i,
  /reviewed placement bank/i,
  /You answer to an inner authority/i,
  /standards you hold yourself to live inside you/i,
  /entries are ordered/i,
  /do not apply/i,
  /review_note/i,
  /doctrine_source/i,
  /\bslots\b/i
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function textFor(record, key) {
  return String(record[key] ?? "").trim();
}

function checkReaderText(label, text) {
  assert(text, `${label} is missing`);
  for (const pattern of forbidden) {
    assert(!pattern.test(text), `${label} contains forbidden text: ${pattern}`);
  }
}

for (const planet of planets) {
  for (const sign of signs) {
    for (let house = 1; house <= 12; house += 1) {
      const signText = textFor(data.signStories, `${planet}.${sign}`);
      const houseText = textFor(data.houseStories, `${planet}.${house}`);
      checkReaderText(`${planet}.${sign}.${house}.sign`, signText);
      checkReaderText(`${planet}.${sign}.${house}.house`, houseText);
    }
  }
}

assert(Object.keys(data.signStories).length === 120, "Expected 120 sign-story rows");
assert(Object.keys(data.houseStories).length === 120, "Expected 120 house-story rows");
assert(Object.keys(data.retrograde).length === 9, "Expected 9 natal retrograde rows");

for (const [planet, text] of Object.entries(data.retrograde)) {
  checkReaderText(`${planet}.retrograde`, text);
}
assert(
  data.retrograde.saturn.includes("Your relationship with authority develops from the inside out."),
  "Saturn retrograde should render the rewritten full-sentence paragraph."
);

const scaffoldSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/content/placementScaffold.ts"), "utf8");
for (const blocked of [
  /section\("dignity"/,
  /section\("sect"/,
  /section\("aspects"/,
  /\baspectLeadins\b/
]) {
  assert(!blocked.test(scaffoldSource), `Placement scaffold source contains removed scaffold layer: ${blocked}`);
}
assert(scaffoldSource.includes("ruler_bridge"), "Placement scaffold must include the conditional 5H-style ruler bridge layer.");
assert(!scaffoldSource.includes("data.rulerBridge"), "Placement scaffold must not use the deleted static ruler-bridge bank.");

console.log("Placement scaffold coverage ok: 1,440 planet/sign/house combinations have sign and house paragraphs; optional retrograde rows are clean.");
