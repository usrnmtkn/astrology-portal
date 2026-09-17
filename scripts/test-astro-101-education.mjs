import assert from "node:assert/strict";
import { astro101LocationState, isAstro101ContentKey, isStandaloneLearnPath } from "../apps/web/src/content/astro101.ts";
import { mergeGeneratedInterpretationSections } from "../api/_lib/generated-interpretation-sections.ts";

assert.equal(isAstro101ContentKey("education/astro-101/sign/aries"), true);
assert.equal(isStandaloneLearnPath("/learn/signs/aries"), true);
assert.deepEqual(astro101LocationState("/learn"), { hub: true, slug: null });
assert.deepEqual(astro101LocationState("/learn/signs/aries"), { hub: false, slug: "/learn/signs/aries" });
assert.deepEqual(
  mergeGeneratedInterpretationSections({ intro: "keep", packageRecord: { a: 1 } }, { blocks: [{ heading: "H" }] }),
  { intro: "keep", packageRecord: { a: 1 }, blocks: [{ heading: "H" }] }
);
console.log("Astro 101 education helpers passed.");
