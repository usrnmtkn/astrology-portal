#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  assertCompiledSkyArticleEdition,
  compileSkyArticleEdition,
  extractSkyArticleTemplateBody,
  hasExactSkyArticleOwnerApproval,
  selectActiveSkyArticleEdition,
  skyArticleAspectPassageForTransit,
  skyArticleTemplatePlaceholders
} from "../apps/web/src/content/skyArticleTemplateCompiler.ts";

const template = `# Templated article — Pluto Enters {{sign}}

Reference notes that must never serve.

---

## PART 1 — Ingress template

# Pluto Enters {{sign}}

{{seasonOpener}}

Pluto enters {{sign}} on {{entryDate}}. {{collectiveThemes: authored for this edition}}

## Key Dates

{{aspectHits: engine-confirmed hits}}

## Horoscopes for Pluto in {{sign}}

Read your Rising Sign.

{{risingBlocks: twelve blocks with {{transitThreads}} supplied by the engine}}

---

## PART 2 — Station editions

Internal station instructions.

## Status

needs_review`;

const extracted = extractSkyArticleTemplateBody(template);
assert.match(extracted, /^# Pluto Enters \{\{sign\}\}/u);
assert.doesNotMatch(extracted, /Reference notes|PART 2|needs_review/u);
assert.deepEqual(
  skyArticleTemplatePlaceholders(template).map((placeholder) => placeholder.name),
  ["sign", "seasonOpener", "entryDate", "collectiveThemes", "aspectHits", "risingBlocks"]
);

const houses = Array.from({ length: 12 }, (_, index) => ({
  house: index + 1,
  risingSign: ["aquarius", "capricorn", "sagittarius", "scorpio", "libra", "virgo", "leo", "cancer", "gemini", "taurus", "aries", "pisces"][index],
  contentKey: `house-horoscope-core/pluto/aquarius/house-${index + 1}`,
  body: `Owner horoscope for house ${index + 1}.`
}));

const compiled = await compileSkyArticleEdition({
  templateBody: template,
  templateKey: "sky/article-template/pluto/ingress",
  planet: "pluto",
  sign: "aquarius",
  entryYear: 2024,
  validFrom: "2024-11-19",
  validTo: "2043-03-08",
  transitStartInstant: "2024-11-19T20:29:00.000Z",
  transitEndInstant: "2043-03-09T00:00:00.000Z",
  slotValues: {
    sign: "Aquarius",
    seasonOpener: "Owner opener.",
    entryDate: "November 19, 2024",
    collectiveThemes: "Owner collective themes.",
    aspectHits: "No exact hits are listed in this edition."
  },
  housePassages: houses,
  aspectPassages: [{
    contentKey: "authored/transit-aspect/pluto/sun/conjunction",
    natalPoint: "sun",
    aspect: "conjunction",
    body: "Owner aspect passage."
  }]
});

assert.equal(compiled.contentKey, "sky-article/pluto/aquarius/2024");
assert.equal(compiled.headline, "Pluto Enters Aquarius");
assert.equal(compiled.housePassages.length, 12);
assert.equal(compiled.aspectPassages.length, 1);
assert.doesNotMatch(compiled.body, /Horoscopes|Owner horoscope|\{\{/u);
assert.match(compiled.compiledMarkdown, /Owner horoscope for house 12/u);
assert.equal(assertCompiledSkyArticleEdition(compiled), compiled);
assert.equal(
  skyArticleAspectPassageForTransit([{
    contentKey: "authored/transit-aspect/pluto/sun/hard",
    natalPoint: "sun",
    aspect: "hard",
    body: "Owner hard-aspect passage."
  }], { aspect: "square", natalPoint: "sun", transitingPlanet: "pluto" })?.body,
  "Owner hard-aspect passage.",
  "Exact natal squares must resolve to an approved hard-aspect passage."
);

const ownerApproval = {
  approved: true,
  action: "approve-sky-article-edition",
  contentKey: compiled.contentKey,
  templateKey: compiled.templateKey,
  templateHash: compiled.templateHash,
  fixedProseHash: compiled.fixedProseHash,
  compiledHash: compiled.compiledHash
};
assert.equal(hasExactSkyArticleOwnerApproval(compiled, { ownerApproval }), true);
assert.equal(hasExactSkyArticleOwnerApproval(compiled, { ownerApproval: { ...ownerApproval, templateHash: "changed" } }), false);
assert.equal(
  selectActiveSkyArticleEdition([{
    id: "edition-1",
    contentKey: compiled.contentKey,
    sections: { skyArticleEdition: compiled },
    sourceSnapshot: { ownerApproval }
  }], { activeInstant: "2026-08-21T12:00:00.000Z", planet: "pluto", sign: "aquarius" })?.edition,
  compiled
);
assert.equal(
  selectActiveSkyArticleEdition([{
    id: "edition-1",
    contentKey: compiled.contentKey,
    sections: { skyArticleEdition: compiled },
    sourceSnapshot: { ownerApproval: { ...ownerApproval, fixedProseHash: "changed" } }
  }], { activeInstant: "2026-08-21T12:00:00.000Z", planet: "pluto", sign: "aquarius" }),
  null,
  "Reader selection must reject an approval that does not match the exact compiled prose."
);

await assert.rejects(
  compileSkyArticleEdition({
    templateBody: template,
    templateKey: "sky/article-template/pluto/ingress",
    planet: "pluto",
    sign: "aquarius",
    entryYear: 2024,
    validFrom: "2024-11-19",
    validTo: "2043-03-08",
    transitStartInstant: "2024-11-19T20:29:00.000Z",
    transitEndInstant: "2043-03-09T00:00:00.000Z",
    slotValues: { sign: "Aquarius" },
    housePassages: houses
  }),
  /missing template values/u
);

await assert.rejects(
  compileSkyArticleEdition({
    templateBody: template,
    templateKey: "sky/article-template/pluto/ingress",
    planet: "pluto",
    sign: "aquarius",
    entryYear: 2024,
    validFrom: "2024-11-19",
    validTo: "2043-03-08",
    transitStartInstant: "2024-11-19T20:29:00.000Z",
    transitEndInstant: "2043-03-09T00:00:00.000Z",
    slotValues: {
      sign: "Aquarius",
      seasonOpener: "Owner opener.",
      entryDate: "November 19, 2024",
      collectiveThemes: "Owner collective themes.",
      aspectHits: "No exact hits are listed in this edition."
    },
    housePassages: houses.slice(0, 11)
  }),
  /missing house horoscopes: 12/u
);

console.log("Sky article templates compile only complete editions and preserve all 12 house passages.");
