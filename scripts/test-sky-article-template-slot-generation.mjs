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

const generatorSource = fs.readFileSync(new URL("../api/_lib/content-generation.ts", import.meta.url), "utf8");
assert.match(generatorSource, /The template's fixed prose is immutable\. Do not rewrite it/u);
assert.match(generatorSource, /Name the behavior before naming the pattern/u);
assert.match(generatorSource, /prepareProductionPreCallGate\(generationInput\)/u);
assert.match(generatorSource, /contentGenerationProvider\(\{/u);

const adminSource = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
assert.match(adminSource, /Generate unfinished fields/u);
assert.match(adminSource, /if \(!Object\.prototype\.hasOwnProperty\.call\(slotValues, name\)\) slotValues\[name\] = value/u);
assert.match(adminSource, /slotGeneration: form\.slotGeneration/u);

for (const endpoint of ["sky-article-facts.ts", "sky-article-template-slots.ts"]) {
  const endpointSource = fs.readFileSync(new URL(`../api/admin/${endpoint}`, import.meta.url), "utf8");
  assert.match(
    endpointSource,
    /transitWindowPoints:\s*\[planet\]/u,
    `${endpoint} must request the governed calculation window instead of accepting missing dates.`
  );
}

const readerSource = fs.readFileSync(new URL("../apps/web/src/features/sky/SkyDetailArticle.tsx", import.meta.url), "utf8");
assert.match(readerSource, /<SkyRisingHoroscopes[\s\S]*?activeRisingSign=\{detail\.personalizedPlacement\?\.risingSign\}[\s\S]*?entries=\{detail\.risingHoroscopes\}/u);

console.log("Sky article AI fills only unfinished safe slots, preserves existing values, and gives the all-sign disclosure the same approved house passages as personalization.");
