#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  skyArticleTemplateSlotNeedsAdditionalFacts,
  unfinishedSkyArticleTemplateSlots,
  validateSkyArticleTemplateSlotValues
} from "../api/_lib/sky-article-template-slots.ts";

const placeholders = [
  { name: "sign" },
  { name: "seasonOpener", description: "Open the edition in the current sign." },
  { name: "collectiveThemes", description: "Three grounded collective themes." },
  { name: "aspectHits", description: "Every exact dated aspect." },
  { name: "historyNarrative", description: "The previous historical era." },
  { name: "inheritanceLine", description: "What that era founded and this era renegotiates." },
  { name: "deliberateBlank", description: "Optional bridge." },
  { name: "risingBlocks", description: "Twelve house horoscopes." }
];

const unfinished = unfinishedSkyArticleTemplateSlots({
  placeholders,
  calculatedSlotValues: { sign: "Aquarius" },
  existingSlotValues: { deliberateBlank: "" }
});
assert.deepEqual(
  unfinished.map((slot) => slot.name),
  ["seasonOpener", "collectiveThemes", "aspectHits", "historyNarrative", "inheritanceLine"],
  "Calculated fields, deliberate blanks, and the compiler-owned rising blocks must not be sent to the model."
);
assert.equal(skyArticleTemplateSlotNeedsAdditionalFacts(unfinished[0]), false);
assert.equal(skyArticleTemplateSlotNeedsAdditionalFacts(unfinished[1]), false);
assert.equal(skyArticleTemplateSlotNeedsAdditionalFacts(unfinished[2]), true);
assert.equal(skyArticleTemplateSlotNeedsAdditionalFacts(unfinished[3]), true);
assert.equal(skyArticleTemplateSlotNeedsAdditionalFacts(unfinished[4]), true);

assert.deepEqual(
  validateSkyArticleTemplateSlotValues({
    seasonOpener: "People begin questioning the rule they have followed without checking.",
    collectiveThemes: "A group reviews who makes the decision and who carries out the work."
  }, unfinished.slice(0, 2)),
  {
    seasonOpener: "People begin questioning the rule they have followed without checking.",
    collectiveThemes: "A group reviews who makes the decision and who carries out the work."
  }
);
assert.throws(
  () => validateSkyArticleTemplateSlotValues({ seasonOpener: "Valid.", extra: "Not requested." }, [unfinished[0]]),
  /unrequested template slots/u
);
assert.throws(
  () => validateSkyArticleTemplateSlotValues({ seasonOpener: "A vague shift — without behavior." }, [unfinished[0]]),
  /em dash/u
);
assert.throws(
  () => validateSkyArticleTemplateSlotValues({ seasonOpener: "Notice whether the plan still works." }, [unfinished[0]]),
  /banned word whether/u
);

const generatorSource = fs.readFileSync(new URL("../api/_lib/content-generation.ts", import.meta.url), "utf8");
assert.match(generatorSource, /The template's fixed prose is immutable\. Do not rewrite it/u);
assert.match(generatorSource, /Name the behavior before naming the pattern/u);
assert.match(generatorSource, /prepareProductionPreCallGate\(generationInput\)/u);
assert.match(generatorSource, /contentGenerationProvider\(\{/u);

const adminSource = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
assert.match(adminSource, /Generate unfinished fields/u);
assert.match(adminSource, /if \(!Object\.prototype\.hasOwnProperty\.call\(slotValues, name\)\) slotValues\[name\] = value/u);
assert.match(adminSource, /slotGeneration: form\.slotGeneration/u);

const articleFactsSource = fs.readFileSync(new URL("../api/_lib/sky-article-facts.ts", import.meta.url), "utf8");
assert.match(articleFactsSource, /getAstrodienstSky/u, "Dated article facts must use the packaged Swiss Ephemeris engine.");
assert.match(articleFactsSource, /includeTransitWindows:\s*true/u, "Dated article facts must calculate the complete sign-residency window.");
assert.match(articleFactsSource, /local Swiss Ephemeris sign-residency calculation/u, "Dated article facts must report their calculation source.");

for (const endpoint of ["sky-article-facts.ts", "sky-article-template-slots.ts"]) {
  const endpointSource = fs.readFileSync(new URL(`../api/admin/${endpoint}`, import.meta.url), "utf8");
  assert.match(
    endpointSource,
    /calculateSkyArticleEditionFacts/u,
    `${endpoint} must use the governed local Swiss article-fact calculation.`
  );
  assert.doesNotMatch(
    endpointSource,
    /transitWindowPoints:\s*\[planet\]/u,
    `${endpoint} must not depend on the external current-sky transit-window response.`
  );
}

const readerSource = fs.readFileSync(new URL("../apps/web/src/features/sky/SkyDetailArticle.tsx", import.meta.url), "utf8");
assert.match(readerSource, /\{risingHoroscopesSection \? \(/u);
assert.doesNotMatch(readerSource, /detail\.personalizedPlacement && risingHoroscopesSection/u, "All-sign horoscopes remain available without a personal chart (PR #686).");
assert.ok(
  readerSource.indexOf("{detail.personalizedPlacement ? (")
    < readerSource.indexOf("{risingHoroscopesSection ? ("),
  "The personalized passage must render before the complete rising-sign horoscope list."
);

console.log("Sky article AI fills only unfinished safe slots, rejects banned voice language, preserves existing values, and calculates dated article windows with the local Swiss Ephemeris engine.");
