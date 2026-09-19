import assert from "node:assert/strict";
import SwissEph from "swisseph-wasm";
import { astro101BlocksFromSections, astro101ContentKey, astro101HasReaderCopy, astro101IsLiveOnLearn, astro101LocationState, astro101PageIsServable, astro101PublicationIssue, astro101ReaderPath, astro101ResolvedReaderPath, isAstro101ContentKey, isStandaloneLearnPath } from "../apps/web/src/content/astro101.ts";
import { ASTRO_101_EPHEMERIS_PHRASES, astro101RxPhrasesFromMeans, fillAstro101EphemerisSlots } from "../apps/web/src/content/astro101Ephemeris.ts";
import { inferArticleBlockStyle, splitIntroParagraphs } from "../apps/web/src/content/articleBlockStyle.ts";
import { houseCatalog, houseNumberFromContentKey } from "../apps/web/src/content/learnCatalog.ts";
import { LEARN_HOUSE_INDEX, LEARN_SIGN_INDEX } from "../apps/web/src/content/learnIndexCatalog.ts";
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
assert.equal(inferArticleBlockStyle({ heading: "South Node in the 2nd house", body: "x" }), "placement");
assert.equal(inferArticleBlockStyle({ heading: "An empty 2nd house", body: "x" }), "placement");
assert.equal(inferArticleBlockStyle({ heading: "Affirmation for the 2nd house", body: "x" }), "affirmation");
assert.equal(inferArticleBlockStyle({ heading: "", body: "Note: A house says where." }), "note");
assert.equal(inferArticleBlockStyle({ heading: "The ruler of your 2nd house", body: "x" }), "h2");
assert.equal(inferArticleBlockStyle({ heading: "The Sun in the 2nd house", body: "x", style: "callout" }), "callout");
assert.equal(houseNumberFromContentKey("education/astro-101/house/02"), 2);
assert.equal(astro101HasReaderCopy({ body: "", sections: { blocks: [] } }), false);
assert.equal(astro101HasReaderCopy({ body: "", sections: { intro: "Written lede." } }), true);
assert.equal(astro101ContentKey("chapter", "What is a birth chart?"), "education/astro-101/chapter/what-is-a-birth-chart");
assert.equal(astro101ReaderPath("point", "chiron"), "/learn/points/chiron");
assert.equal(astro101ReaderPath("retrograde", "mercury-rx-sky"), "/learn/retrogrades/mercury-rx-sky");
assert.equal(astro101ReaderPath("phase", "new-moon"), "/learn/moon/new-moon");
assert.equal(astro101ResolvedReaderPath("education/astro-101/point/chiron", { slug: "/learn/points/chiron" }), "/learn/points/chiron");
assert.equal(astro101HasReaderCopy({
  body: "",
  sections: { blocks: [{ heading: "How to read yours", list: [{ ordered: true, items: ["Start with the big three."] }] }] }
}), true);
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
assert.equal(astro101ResolvedReaderPath("education/astro-101/chapter/01-what-is-a-birth-chart", {}), "/learn/astro-101/01-what-is-a-birth-chart");
assert.equal(astro101IsLiveOnLearn({
  content_key: "education/astro-101/chapter/01-what-is-a-birth-chart",
  surface: "education",
  status: "LIVE",
  lane: "serving",
  review_state: null,
  headline: "What is a birth chart?",
  body: "A birth chart is a map of the sky.",
  sections: { packageRecord: { content_role: "education_article", review_status: "needs_review" } },
  facts: { slug: "/learn/astro-101/what-is-a-birth-chart" }
}), true);
assert.equal(astro101IsLiveOnLearn({
  content_key: "education/astro-101/chapter/01-what-is-a-birth-chart",
  status: "DRAFT",
  lane: "serving",
  headline: "What is a birth chart?",
  body: "A birth chart is a map of the sky.",
  facts: { slug: "/learn/astro-101/what-is-a-birth-chart" }
}), false);
assert.equal(houseCatalog(2)?.angularity, "Succedent");
assert.equal(houseCatalog(2)?.name, "Livelihood");
assert.equal(LEARN_HOUSE_INDEX[0]?.roman, "I");
assert.equal(LEARN_HOUSE_INDEX[0]?.glyph.includes("\uFE0E"), true);
assert.equal(LEARN_HOUSE_INDEX[2]?.name, "Siblings & the daily round");
assert.equal(LEARN_SIGN_INDEX[0]?.mode, "Cardinal");
assert.equal(LEARN_SIGN_INDEX[0]?.element, "Fire");
assert.deepEqual(splitIntroParagraphs("Lede paragraph.\n\nSecond paragraph.\n\nNote: Keep this as a note."), {
  lede: "Lede paragraph.",
  paragraphs: ["Second paragraph."],
  notes: ["Keep this as a note."]
});
assert.equal(
  fillAstro101EphemerisSlots("Jupiter is retrograde for {{ephemeris:jupiter_rx_span}}."),
  `Jupiter is retrograde for ${ASTRO_101_EPHEMERIS_PHRASES.jupiter_rx_span}.`
);
assert.equal(astro101PageIsServable({
  headline: "What Jupiter retrograde actually does",
  body: "Jupiter is retrograde for {{ephemeris:jupiter_rx_span}}.",
  facts: { slug: "/learn/retrogrades/jupiter-rx-sky" }
}), true);
assert.deepEqual(
  astro101BlocksFromSections({
    blocks: [{ heading: "How to read yours", body: "1. Start.", list: [{ ordered: true, items: ["Start with the big three."] }] }]
  })[0]?.list,
  [{ ordered: true, items: ["Start with the big three."] }]
);

const swe = new SwissEph();
await swe.initSwissEph();
const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
function planetSpeed(id, date) {
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 12);
  return swe.calc_ut(jd, id, flags)[3];
}
function rxMeans(id) {
  const step = 1;
  let rxDays = 0;
  let total = 0;
  let inRx = false;
  let start = 0;
  const periods = [];
  const starts = [];
  let date = new Date(Date.UTC(1950, 0, 1));
  const end = new Date(Date.UTC(2050, 0, 1));
  while (date < end) {
    const rx = planetSpeed(id, date) < 0;
    total += step;
    if (rx) rxDays += step;
    if (rx && !inRx) {
      inRx = true;
      start = date.getTime();
      starts.push(start);
    }
    if (!rx && inRx) {
      inRx = false;
      periods.push((date.getTime() - start) / 86400000);
    }
    date = new Date(date.getTime() + step * 86400000);
  }
  const gaps = starts.slice(1).map((time, index) => (time - starts[index]) / 86400000);
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    daysPerYear: (rxDays / total) * 365.2425,
    meanPeriodDays: mean(periods),
    meanGapDays: mean(gaps)
  };
}
assert.deepEqual(
  astro101RxPhrasesFromMeans(rxMeans(swe.SE_JUPITER), rxMeans(swe.SE_SATURN)),
  ASTRO_101_EPHEMERIS_PHRASES
);
console.log("Astro 101 education helpers passed.");
