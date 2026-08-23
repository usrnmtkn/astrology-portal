#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import {
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  renderLunationHoroscope as renderNodeLunationHoroscope
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import {
  normalizeLunationSign
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/lunationNormalization.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(packageDir, relativePath), "utf8")
);
const eligible = new Set(["approved", "approved_reuse", "reviewed"]);
const isReaderEligible = (row) => eligible.has(String(row.review_status ?? "").toLowerCase());

const baseLibrary = readJson("source-rows/transit-synastry-rows-v1.json");
const baseRows = readJson("source-rows/fallback-source-rows-v3.json");
const blend = readJson("source-rows/lunation-blend-units-v1.json");
const templates = readJson("templates/fallback-templates-v3.json");
const makeRenderer = ({ reader = false } = {}) => createTransitSynastryRenderer(
  {
    authoredCards: [
      ...baseLibrary.authoredCards,
      ...blend.authoredCards
    ].filter((row) => !reader || isReaderEligible(row))
  },
  templates,
  {
    ...baseRows,
    hookRows: [
      ...baseRows.hookRows,
      ...blend.hookRows
    ].filter((row) => !reader || isReaderEligible(row))
  }
);
const qaRenderer = makeRenderer();
const readerRenderer = makeRenderer({ reader: true });
const rulerRows = blend.hookRows.filter((row) => row.contentKey.includes("/lunation-ruler-house/"));
const uranusRows = blend.hookRows.filter((row) => row.contentKey.includes("/lunation-uranus-layer/"));
const retainedUranusRows = baseRows.hookRows.filter((row) => (
  row.contentKey.startsWith("fallback-hook/lunation-uranus-layer/")
));

assert.equal(normalizeLunationSign(" Aquarius "), "aquarius");
assert.equal(normalizeLunationSign(null), "");

assert.equal(blend.authoredCards.length, 1);
assert.equal(rulerRows.length, 12);
assert.equal(uranusRows.length, 1);
assert.equal(retainedUranusRows.length, 12, "All Uranus layer content rows must remain retained and reversible.");
assert.equal(rulerRows.filter(isReaderEligible).length, 1);
assert.equal(rulerRows.filter((row) => row.review_status === "needs_review").length, 11);
assert.equal(uranusRows[0].review_status, "approved");
assert.ok(
  [...rulerRows, ...uranusRows].every(
    (row) => !/\byour\s+(?:1st|2nd|3rd|\d+th)\s+house\b/iu.test(
      row.contentKey.includes("/lunation-ruler-house/") ? row.body_you : ""
    )
  ),
  "Moving-body house numbers must remain computed slots, never authored ruler-hook copy."
);

const macro = readerRenderer.renderLunationMacro({
  kind: "full-moon",
  sign: "aquarius"
});
assert.equal(macro.headline, blend.authoredCards[0].headline);
assert.equal(macro.body, blend.authoredCards[0].body);

const aquariusFullMoonCycle = {
  eventDate: "2026-07-29T14:35:00.000Z",
  matchingNewMoon: {
    exactAt: "2026-02-17T12:01:00.000Z",
    sign: "aquarius"
  }
};

const geminiFacts = {
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "gemini",
  moonHouse: 9,
  sunHouse: 3,
  ruler: "saturn",
  rulerHouse: 11,
  uranusLayerActive: true,
  uranusHouse: 1,
  ...aquariusFullMoonCycle
};
const geminiQa = qaRenderer.renderLunationHoroscope(geminiFacts);
const geminiReader = readerRenderer.renderLunationHoroscope(geminiFacts);
const geminiCounterpoint = geminiQa.parts.findIndex((part) => part.includes("The friction this week"));
const geminiRuler = geminiQa.parts.findIndex((part) => part.startsWith("Saturn rules this Full Moon"));
const geminiUranus = geminiQa.parts.findIndex((part) => part.startsWith("Uranus in your 1st house"));
assert.match(geminiQa.parts[0], /9th house/u);
assert.equal(
  geminiQa.parts[1],
  "Six months ago, consciously or not, this lunar cycle began with the New Moon in Aquarius on February 17."
);
assert.ok(geminiCounterpoint >= 1, "Counterpoint must follow the house frame.");
assert.ok(geminiRuler > geminiCounterpoint, "Traditional ruler localization must follow the counterpoint.");
assert.equal(geminiUranus, -1, "The retained Uranus layer must not render for readers.");
assert.match(geminiQa.parts[geminiCounterpoint], /3rd house/u);
assert.match(
  geminiQa.parts[geminiRuler],
  /^Saturn rules this Full Moon from your 11th house, so friends, organizations, professional contacts, and shared commitments are part of the answer\./u
);
assert.match(
  geminiReader.body,
  /Saturn rules this Full Moon from your 11th house, so friends, organizations, professional contacts, and shared commitments are part of the answer\./u,
  "The approved 11th-house ruler row must remain in reader output."
);
assert.doesNotMatch(
  geminiReader.body,
  /Uranus in your 1st house adds a more personal element of change/u,
  "The retained Uranus layer must remain non-serving even when the caller passes the former active condition."
);

const houseOne = readerRenderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "gemini",
  moonHouse: 9,
  sunHouse: 3,
  ruler: "saturn",
  rulerHouse: 1,
  ...aquariusFullMoonCycle
});
assert.doesNotMatch(
  houseOne.body,
  /Saturn rules this Full Moon/u,
  "A needs-review 1st-house ruler row must remain out of reader output."
);

const leoReader = readerRenderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "leo",
  moonHouse: 7,
  sunHouse: 1,
  ruler: "saturn",
  rulerHouse: 9,
  ...aquariusFullMoonCycle
});
assert.match(leoReader.parts[0], /7th house/u);
assert.match(leoReader.body, /your 1st house/u);
assert.doesNotMatch(leoReader.body, /Saturn rules this Full Moon/u);

const cancerNewMoon = readerRenderer.renderLunationHoroscope({
  kind: "new-moon",
  sign: "cancer",
  risingSign: "aries",
  moonHouse: 4,
  sunHouse: 4,
  ruler: "moon",
  rulerHouse: 4
});
assert.doesNotMatch(cancerNewMoon.body, /The friction this week/u);
assert.doesNotMatch(cancerNewMoon.body, /ruling this lunation/u);

const crossYear = readerRenderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "cancer",
  risingSign: "cancer",
  eventDate: "2026-01-03T10:00:00.000Z",
  matchingNewMoon: {
    exactAt: "2025-06-25T10:00:00.000Z",
    sign: "cancer"
  }
});
assert.match(crossYear.body, /New Moon in Cancer on June 25, 2025\./u);
assert.throws(
  () => readerRenderer.renderLunationHoroscope({
    kind: "full-moon",
    sign: "cancer",
    risingSign: "cancer",
    eventDate: "2026-01-03T10:00:00.000Z"
  }),
  /invalid matching New Moon/u,
  "Ordinary Full Moon assembly must fail closed when the calculated cycle anchor is missing."
);

const vite = await createServer({
  root: path.join(repoRoot, "apps", "web"),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true, hmr: false }
});
try {
  const browserModule = await vite.ssrLoadModule(
    "/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts"
  );
  const browserReader = browserModule.createTransitSynastryRenderer(
    {
      authoredCards: [...baseLibrary.authoredCards, ...blend.authoredCards].filter(isReaderEligible)
    },
    templates,
    {
      ...baseRows,
      hookRows: [...baseRows.hookRows, ...blend.hookRows].filter(isReaderEligible)
    }
  );
  const expected = renderNodeLunationHoroscope(geminiFacts);
  assert.deepEqual(browserReader.renderLunationHoroscope(geminiFacts), expected);
  assert.deepEqual(readerRenderer.renderLunationHoroscope(geminiFacts), expected);
} finally {
  await vite.close();
}

const ariesMacro = readerRenderer.renderLunationMacro({ kind: "full-moon", sign: "aries" });
assert.match(ariesMacro.headline, /Aries Full Moon/u);
assert.match(ariesMacro.body, /^Full Moons bring what has been building into clearer view\./u);

const skyArticle = readerRenderer.renderSkyLunation({
  kind: "full-moon",
  sign: "aquarius",
  dateLine: "On July 29"
});
assert.ok(
  skyArticle.body.startsWith(blend.authoredCards[0].body),
  "The approved macro must lead the matching Sky lunation article."
);

console.log(
  "lunation blend assembly checks passed: 1 macro, 12 traditional-ruler rows, 12 retained non-serving Uranus rows, review gating, and skip rules"
);
