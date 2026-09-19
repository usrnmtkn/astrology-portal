import assert from "node:assert/strict";
import { astro101ContentKey, astro101HasReaderCopy, astro101LocationState, astro101PageIsServable, astro101PublicationIssue, astro101ReaderPath, isAstro101ContentKey, isStandaloneLearnPath } from "../apps/web/src/content/astro101.ts";
import { inferArticleBlockStyle, splitIntroParagraphs } from "../apps/web/src/content/articleBlockStyle.ts";
import { houseCatalog, houseNumberFromContentKey } from "../apps/web/src/content/learnCatalog.ts";
import { mergeGeneratedInterpretationSections } from "../api/_lib/generated-interpretation-sections.ts";

assert.equal(isAstro101ContentKey("education/astro-101/sign/aries"), true);
assert.equal(isStandaloneLearnPath("/learn/signs/aries"), true);
assert.deepEqual(astro101LocationState("/learn"), { hub: true, slug: null });
assert.deepEqual(astro101LocationState("/learn/signs/aries"), { hub: false, slug: "/learn/signs/aries" });
assert.deepEqual(
  mergeGeneratedInterpretationSections({ intro: "keep", packageRecord: { a: 1 } }, { blocks: [{ heading: "H" }] }),
  { intro: "keep", packageRecord: { a: 1 }, blocks: [{ heading: "H" }] }
);
assert.equal(inferArticleBlockStyle({ heading: "The Sun in the 2nd house", body: "x" }), "placement");
assert.equal(inferArticleBlockStyle({ heading: "Affirmation for the 2nd house", body: "x" }), "affirmation");
assert.equal(inferArticleBlockStyle({ heading: "", body: "Note: A house says where." }), "note");
assert.equal(inferArticleBlockStyle({ heading: "The ruler of your 2nd house", body: "x" }), "h2");
assert.equal(inferArticleBlockStyle({ heading: "The Sun in the 2nd house", body: "x", style: "callout" }), "callout");
assert.equal(houseNumberFromContentKey("education/astro-101/house/02"), 2);
assert.equal(astro101HasReaderCopy({ body: "", sections: { blocks: [] } }), false);
assert.equal(astro101HasReaderCopy({ body: "", sections: { intro: "Written lede." } }), true);
assert.equal(astro101ContentKey("chapter", "What is a birth chart?"), "education/astro-101/chapter/what-is-a-birth-chart");
assert.equal(astro101ReaderPath("resources", "resources"), "/learn/astro-101/resources");
assert.equal(astro101PageIsServable({
  headline: "Resources",
  body: "",
  sections: {},
  facts: { slug: "/learn/astro-101/resources" }
}), false);
assert.equal(astro101PublicationIssue({
  content_key: "education/astro-101/resources/resources",
  surface: "education",
  headline: "Resources",
  body: "",
  sections: {},
  facts: { slug: "/learn/astro-101/resources" }
}), "Write the article before publishing. Empty Astro 101 pages stay drafts.");
assert.equal(astro101PublicationIssue({
  content_key: "education/astro-101/chapter/what-is-a-birth-chart",
  surface: "education",
  headline: "What is a birth chart?",
  body: "A chart is a map.",
  sections: { kind: "chapter" },
  facts: { slug: "/learn/astro-101/what-is-a-birth-chart" }
}), null);
assert.equal(houseCatalog(2)?.angularity, "Succedent");
assert.deepEqual(splitIntroParagraphs("Lede paragraph.\n\nSecond paragraph.\n\nNote: Keep this as a note."), {
  lede: "Lede paragraph.",
  paragraphs: ["Second paragraph."],
  notes: ["Keep this as a note."]
});
console.log("Astro 101 education helpers passed.");
