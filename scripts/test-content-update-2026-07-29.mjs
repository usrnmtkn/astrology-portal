import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderBondTransit,
  renderTransitAspect,
  renderTransitHouse,
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const transitRows = JSON.parse(fs.readFileSync(path.join(packageRoot, "source-rows/transit-synastry-rows-v1.json"), "utf8"));
const fallbackRows = JSON.parse(fs.readFileSync(path.join(packageRoot, "source-rows/fallback-source-rows-v3.json"), "utf8"));
const app = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const contentBook = fs.readFileSync(path.join(packageRoot, "content-book.html"), "utf8");

const pointHouseCards = transitRows.authoredCards.filter((row) =>
  /^authored\/transit-house\/(?:south-node|north-node|chiron|lilith)\/(?:[1-9]|1[0-2])$/u.test(row.contentKey)
);
assert.equal(pointHouseCards.length, 48, "The point house library must contain 48 cards.");
assert.equal(pointHouseCards.filter((row) => row.body.split("\n\n").length === 2).length, 48, "Every point house card must preserve two paragraphs.");

const southNodeFourth = renderTransitHouse({ planet: "south-node", house: 4, sign: "virgo", window: "Until Aug 10" });
assert.equal(southNodeFourth.templateKey, "authored/transit-house", "South Node 4H must supersede the thin fallback.");
assert.equal(southNodeFourth.body.split("\n\n").length, 2, "South Node 4H must render as two paragraphs.");
assert.doesNotMatch(southNodeFourth.body, /Until Aug 10|South Node in Virgo|moving through your 4th house/u, "South Node 4H must not add a date line or sign-color copy.");

const marsCards = transitRows.authoredCards.filter((row) =>
  /^authored\/transit-aspect\/mars\/(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|midheaven|ascendant)\/(?:soft|hard)$/u.test(row.contentKey)
);
assert.equal(marsCards.length, 24, "Mars Batch 13 must contain 24 existing-key cards.");
assert.equal(marsCards.filter((row) => row.body_you.includes("{{aspectWord}}") && row.body_you.includes("{{untilDate}}")).length, 24, "Every Mars card must retain both engine slots.");
assert.equal(marsCards.filter((row) => row.body_you.includes("Aug 10")).length, 0, "The Mars example date must not enter canonical copy.");
const marsSun = renderTransitAspect({ transiting: "mars", natal: "sun", aspect: "square", window: "Until Aug 12" });
assert.match(marsSun.body, /Pick the battles that protect your integrity/u, "Mars Sun-pressure rev-2 copy must serve.");
assert.match(marsSun.body, /Mars square your Sun until Aug 12/u, "Mars runtime aspect and date slots must resolve.");

const bondAspectRows = fallbackRows.hookRows.filter((row) =>
  /^fallback-hook\/bond-effect-(?:conjunction|sextile|trine|square|opposition)\/(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron)$/u.test(row.contentKey)
);
assert.equal(bondAspectRows.length, 55, "Bond Batch 14 must contain 55 per-aspect effects.");

const sunSquare = renderBondTransit({ transiting: "sun", aspect: "square", planetA: "venus", planetB: "mars", otherName: "Sofia" });
assert.match(sunSquare.body, /^Pride gets between you: who gets credit, who decides, whose day mattered more\./u, "Sun square must use the exact-aspect effect.");

const approvedSaturnSquare = "The next few months test this connection: less credit for good intentions, more weight on what actually happens. Show up when you said you would; that is most of the work.";
const saturnSquare = renderBondTransit({ transiting: "saturn", aspect: "square", planetA: "venus", planetB: "mars", otherName: "Sofia" });
assert.ok(saturnSquare.body.startsWith(approvedSaturnSquare), "Saturn square must preserve the approved rev-2 line byte-for-byte.");

const northNodeHardVariant = fallbackRows.hookRows.find((row) => row.contentKey === "fallback-hook/bond-effect-hard/north-node/variant-2")?.body_you;
const northNodeSquare = renderBondTransit({ transiting: "north-node", aspect: "square", planetA: "venus", planetB: "mars", otherName: "Sofia", variant: 2 });
assert.ok(northNodeHardVariant && northNodeSquare.body.startsWith(northNodeHardVariant), "North Node square must retain soft/hard variant fallback.");
assert.match(
  app,
  /transiting === "lilith" && activationAspect !== "conjunction" && activationAspect !== "opposition"/u,
  "The App must retain the Lilith conjunction/opposition-only gate."
);

assert.match(contentBook, /Home should offer real comfort/u, "The rebuilt Content Book must contain the owner-licensed South Node 4H line.");
assert.match(contentBook, /The next few months test this connection: less credit for good intentions/u, "The rebuilt Content Book must contain the approved Saturn-square line.");

console.log("2026-07-29 content update acceptance checks passed.");
