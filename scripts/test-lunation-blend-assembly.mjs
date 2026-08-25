#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
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
import {
  sharedLunationEclipseSectionKey
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/lunationEclipseSectionKeys.mjs";

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
const lunationBook = readJson("source-rows/lunation-book-cards-v1.json");
const lunationEclipseVariants = readJson("source-rows/lunation-eclipse-variants-v1.json");
const lunationEclipseHouseLayers = readJson("source-rows/lunation-eclipse-house-layers-v1.json");
const templates = readJson("templates/fallback-templates-v3.json");
const makeRenderer = ({ reader = false, allowUnreviewed = false, includeBook = true } = {}) => createTransitSynastryRenderer(
  {
    authoredCards: [
      ...baseLibrary.authoredCards,
      ...blend.authoredCards,
      ...(includeBook ? lunationBook.authoredCards : []),
      ...lunationEclipseVariants.sectionCards,
      ...lunationEclipseHouseLayers.authoredCards,
      ...lunationEclipseVariants.authoredCards
    ].filter((row) => !reader || isReaderEligible(row))
  },
  templates,
  {
    ...baseRows,
    hookRows: [
      ...baseRows.hookRows,
      ...blend.hookRows
    ].filter((row) => !reader || isReaderEligible(row))
  },
  { allowUnreviewed }
);
const qaRenderer = makeRenderer();
const readerRenderer = makeRenderer({ reader: true });
const noBookReaderRenderer = makeRenderer({ reader: true, includeBook: false });
const eclipsePreviewRenderer = makeRenderer({ allowUnreviewed: true });
const rulerRows = blend.hookRows.filter((row) => row.contentKey.includes("/lunation-ruler-house/"));
const uranusRows = blend.hookRows.filter((row) => row.contentKey.includes("/lunation-uranus-layer/"));
const retainedUranusRows = baseRows.hookRows.filter((row) => (
  row.contentKey.startsWith("fallback-hook/lunation-uranus-layer/")
));

assert.equal(normalizeLunationSign(" Aquarius "), "aquarius");
assert.equal(normalizeLunationSign(null), "");
assert.equal(
  sharedLunationEclipseSectionKey("eclipse-lunar", "mechanics"),
  "authored/lunation-eclipse-section/shared/lunar/mechanics"
);
assert.equal(
  sharedLunationEclipseSectionKey("eclipse-solar", "mechanics"),
  "authored/lunation-eclipse-section/shared/solar/mechanics"
);
assert.equal(sharedLunationEclipseSectionKey("full-moon", "mechanics"), null);
assert.equal(sharedLunationEclipseSectionKey("eclipse-lunar", "opening"), null);

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
const geminiBookCell = lunationBook.authoredCards.find((row) => (
  row.contentKey === "authored/book-ritual-and-the-moon/lunation-horoscope/full-moon/aquarius/rising-gemini/house-9"
));
const geminiUranus = geminiQa.parts.findIndex((part) => part.startsWith("Uranus in your 1st house"));
assert.equal(geminiQa.parts[0], geminiBookCell.body);
assert.equal(
  geminiQa.parts[1],
  "Six months ago, consciously or not, this lunar cycle began with the New Moon in Aquarius on February 17."
);
assert.equal(geminiQa.parts.length, 2, "Direct rulers and generic weekly layers must not pad an exact book cell.");
assert.equal(geminiUranus, -1, "The retained Uranus layer must not render for readers.");
assert.equal(geminiReader.parts[0], geminiBookCell.body);
assert.equal(geminiReader.contentKey, geminiBookCell.contentKey);
assert.doesNotMatch(geminiReader.body, /The friction this week/u);
assert.doesNotMatch(geminiReader.body, /Saturn rules this Full Moon/u);
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
assert.equal(
  leoReader.parts[0],
  lunationBook.authoredCards.find((row) => row.contentKey.endsWith("/full-moon/aquarius/rising-leo/house-7"))?.body
);
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
assert.equal(
  cancerNewMoon.parts[1],
  "This New Moon begins a cycle that will develop over the next six months."
);
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

const piscesDateBoundaryFacts = {
  kind: "full-moon",
  sign: "pisces",
  risingSign: "sagittarius",
  eventDate: "2026-08-28T04:00:00.000Z",
  matchingNewMoon: {
    exactAt: "2026-03-19T01:23:00.000Z",
    sign: "pisces"
  }
};
const newYorkPisces = readerRenderer.renderLunationHoroscope({
  ...piscesDateBoundaryFacts,
  timeZone: "America/New_York"
});
const tokyoPisces = readerRenderer.renderLunationHoroscope({
  ...piscesDateBoundaryFacts,
  timeZone: "Asia/Tokyo"
});
assert.match(newYorkPisces.body, /New Moon in Pisces on March 18\./u);
assert.match(tokyoPisces.body, /New Moon in Pisces on March 19\./u);

const piscesEclipseFacts = {
  ...piscesDateBoundaryFacts,
  kind: "eclipse-lunar",
  timeZone: "America/New_York"
};
const heldPiscesEclipse = readerRenderer.renderLunationHoroscope(piscesEclipseFacts);
const houseFourEvergreen = lunationBook.authoredCards.find((row) => row.contentKey.endsWith(
  "/full-moon/pisces/rising-sagittarius/house-4"
));
assert.ok(houseFourEvergreen, "The approved Pisces Full Moon evergreen fallback must exist.");
assert.equal(heldPiscesEclipse.contentKey, undefined);
assert.equal(heldPiscesEclipse.templateKey, "fallback-template/sky.lunation-horoscope");
assert.equal(heldPiscesEclipse.headline, "Pisces Lunar Eclipse Horoscope");
assert.match(heldPiscesEclipse.parts[0], /^The Pisces lunar eclipse shines upon your 4th house/u);
assert.match(heldPiscesEclipse.body, /Home is where the heart is\. Home isn't just a place - it's a feeling\./u);
assert.doesNotMatch(heldPiscesEclipse.body, /This month's full moon intention is/u);
assert.match(heldPiscesEclipse.body, /New Moon in Pisces on March 18\./u);
assert.match(heldPiscesEclipse.body, /change comes all the same, no matter how tightly you hold on/u);
assert.match(heldPiscesEclipse.body, /allow for endings, mourn if needed/u);
assert.equal(heldPiscesEclipse.reviewFlags, undefined);
assert.equal(heldPiscesEclipse.partSourceKeys.length, heldPiscesEclipse.parts.length);
assert.ok(heldPiscesEclipse.partSourceKeys.every((keys) => keys.length > 0));

const geminiRisingPiscesEclipse = readerRenderer.renderLunationHoroscope({
  ...piscesEclipseFacts,
  risingSign: "gemini",
  moonHouse: 10
});
assert.match(geminiRisingPiscesEclipse.parts[0], /^The Pisces lunar eclipse shines upon your 10th house of career and purpose/u);
assert.match(geminiRisingPiscesEclipse.body, /Invest in yourself and watch magick happen\./u);
assert.match(geminiRisingPiscesEclipse.body, /straddling the line between dream and reality/u);
assert.doesNotMatch(geminiRisingPiscesEclipse.body, /A title, project, or opportunity|schedule, responsibilities, pay/u);
assert.match(geminiRisingPiscesEclipse.body, /New Moon in Pisces on March 18\./u);
assert.match(geminiRisingPiscesEclipse.body, /Reflect on what you've experienced, and respond accordingly\./u);
assert.doesNotMatch(geminiRisingPiscesEclipse.body, /The Sun in Virgo asks for an honest inventory|The goal is not to stop dreaming/u);

const tamperedSections = structuredClone(lunationEclipseVariants.sectionCards);
const tamperedHouseTen = tamperedSections.find((row) => row.contentKey.endsWith("/rising-gemini/house-10/evergreen-body"));
assert.ok(tamperedHouseTen, "House 10 eclipse body fixture must exist.");
tamperedHouseTen.body = tamperedHouseTen.body.replace("Invest in yourself and watch magick happen.", "Invest in yourself.");
const tamperedHash = crypto.createHash("sha256").update(tamperedHouseTen.body).digest("hex");
tamperedHouseTen.approval.payloadSha256 = tamperedHash;
tamperedHouseTen.protected_content.body_sha256 = tamperedHash;
const tamperedRenderer = createTransitSynastryRenderer(
  {
    authoredCards: [
      ...baseLibrary.authoredCards,
      ...blend.authoredCards,
      ...lunationBook.authoredCards,
      ...tamperedSections,
      ...lunationEclipseHouseLayers.authoredCards
    ].filter(isReaderEligible)
  },
  templates,
  {
    ...baseRows,
    hookRows: [...baseRows.hookRows, ...blend.hookRows].filter(isReaderEligible)
  }
);
assert.throws(
  () => tamperedRenderer.renderLunationHoroscope({
    ...piscesEclipseFacts,
    risingSign: "gemini",
    moonHouse: 10
  }),
  /BOOK_BODY_MODIFIED/u,
  "A rehashed paraphrase must still fail against the protected source remainder."
);

const staleHashSections = structuredClone(lunationEclipseVariants.sectionCards);
const staleNature = staleHashSections.find((row) => row.contentKey === "authored/lunation-eclipse-section/shared/lunar/nature");
assert.ok(staleNature, "Shared eclipse nature fixture must exist.");
staleNature.body = `${staleNature.body} Changed.`;
const staleHashRenderer = createTransitSynastryRenderer(
  {
    authoredCards: [
      ...baseLibrary.authoredCards,
      ...blend.authoredCards,
      ...lunationBook.authoredCards,
      ...staleHashSections
    ].filter(isReaderEligible)
  },
  templates,
  {
    ...baseRows,
    hookRows: [...baseRows.hookRows, ...blend.hookRows].filter(isReaderEligible)
  }
);
assert.throws(
  () => staleHashRenderer.renderLunationHoroscope(piscesEclipseFacts),
  /ECLIPSE_SECTION_MODIFIED/u,
  "Any changed approved eclipse section must hard-fail before rendering."
);

const aquariusLunarEclipse = readerRenderer.renderLunationHoroscope({
  ...aquariusFullMoonCycle,
  kind: "eclipse-lunar",
  sign: "aquarius",
  risingSign: "gemini",
  moonHouse: 9,
  sunHouse: 3,
  timeZone: "America/New_York"
});
assert.match(aquariusLunarEclipse.body, /Eclipses warp time and shift the course of events/u);
assert.match(aquariusLunarEclipse.body, /Lunar eclipses are portals into your soul/u);
assert.match(aquariusLunarEclipse.body, /Eclipses happen along the Lunar Nodes, and part of the work is letting the situation unfold/u);
assert.match(aquariusLunarEclipse.body, /Reflect on what you've experienced, and respond accordingly/u);
assert.ok(
  !aquariusLunarEclipse.reviewFlags?.some((flag) => ["nature", "mechanics", "recommendation", "close"].includes(flag.sectionId)),
  "Sign-neutral approved lunar sections must resolve for eclipse signs beyond Pisces."
);
assert.deepEqual(
  aquariusLunarEclipse.reviewFlags?.map((flag) => flag.sectionId),
  ["opening", "evergreen-body"],
  "Only the still-unreviewed sign-specific Aquarius sections should be omitted."
);

const virgoSolarEclipseFacts = {
  kind: "eclipse-solar",
  sign: "virgo",
  risingSign: "aries",
  moonHouse: 6,
  sunHouse: 6,
  ruler: "mercury",
  rulerHouse: 6,
  rulerRetrograde: false,
  eventDate: "2026-09-11T03:27:00.000Z",
  timeZone: "America/New_York"
};
const virgoSolarEclipse = readerRenderer.renderLunationHoroscope(virgoSolarEclipseFacts);
assert.equal(virgoSolarEclipse.headline, "Virgo Solar Eclipse Horoscope");
const solarHouseSix = lunationEclipseHouseLayers.authoredCards.find((row) => row.house === 6);
assert.ok(solarHouseSix, "The approved solar eclipse House 6 layer must exist.");
assert.ok(virgoSolarEclipse.parts.includes(solarHouseSix.body));
assert.match(virgoSolarEclipse.body, /The 6th house corresponds to the Hermit/u);
assert.doesNotMatch(virgoSolarEclipse.body, /set intentions|time to manifest intentions/iu);
assert.doesNotMatch(virgoSolarEclipse.body, /Lunar eclipses are portals into your soul/u);
assert.ok(
  virgoSolarEclipse.reviewFlags?.some((flag) => flag.sectionId === "opening"),
  "Unapproved solar system prose must remain omitted and visible to the review queue."
);
assert.ok(
  !virgoSolarEclipse.reviewFlags?.some((flag) => flag.sectionId === "eclipse-house-layer"),
  "The approved solar house layer must not be reported as missing."
);

const readerWithoutMechanics = createTransitSynastryRenderer(
  {
    authoredCards: [
      ...baseLibrary.authoredCards,
      ...blend.authoredCards,
      ...lunationBook.authoredCards,
      ...lunationEclipseVariants.sectionCards.filter((row) => row.eclipse_section !== "mechanics")
    ].filter(isReaderEligible)
  },
  templates,
  {
    ...baseRows,
    hookRows: [...baseRows.hookRows, ...blend.hookRows].filter(isReaderEligible)
  }
);
const mechanicsFailure = readerWithoutMechanics.renderLunationHoroscope(piscesEclipseFacts);
assert.match(mechanicsFailure.body, /^The Pisces lunar eclipse shines upon/u);
assert.match(mechanicsFailure.body, /Home isn't just a place - it's a feeling\./u);
assert.doesNotMatch(mechanicsFailure.body, /Lunar eclipses are portals into your soul/u);
assert.deepEqual(mechanicsFailure.reviewFlags, [{
  id: "conditional-section-omitted",
  status: "needs_review",
  sectionId: "mechanics",
  omittedContentKey: "authored/lunation-eclipse-section/shared/lunar/mechanics",
  fallbackContentKey: null,
  reason: "missing-or-ineligible"
}]);

const readerWithoutRetroOverlay = createTransitSynastryRenderer(
  {
    authoredCards: [
      ...baseLibrary.authoredCards,
      ...blend.authoredCards,
      ...lunationBook.authoredCards,
      ...lunationEclipseVariants.sectionCards
    ].filter(isReaderEligible)
  },
  templates,
  {
    ...baseRows,
    hookRows: [...baseRows.hookRows, ...blend.hookRows]
      .filter((row) => row.contentKey !== "fallback-hook/lunation-ruler-retro")
      .filter(isReaderEligible)
  }
);
const retroOverlayFailure = readerWithoutRetroOverlay.renderLunationHoroscope({
  ...piscesEclipseFacts,
  ruler: "jupiter",
  rulerHouse: 11,
  rulerRetrograde: true
});
assert.match(retroOverlayFailure.body, /^The Pisces lunar eclipse shines upon/u);
assert.match(retroOverlayFailure.body, /Jupiter rules this Lunar Eclipse from your 11th house/u);
assert.deepEqual(retroOverlayFailure.reviewFlags, [{
  id: "conditional-section-omitted",
  status: "needs_review",
  sectionId: "ruler-retrograde",
  omittedContentKey: "fallback-hook/lunation-ruler-retro",
  fallbackContentKey: null,
  reason: "missing-or-ineligible"
}]);
const previewPiscesEclipse = eclipsePreviewRenderer.renderLunationHoroscope(piscesEclipseFacts);
const houseFourEclipseVariant = lunationEclipseVariants.authoredCards.find((row) => row.house === 4);
assert.equal(previewPiscesEclipse.contentKey, houseFourEclipseVariant.contentKey);
assert.equal(previewPiscesEclipse.headline, "Pisces Lunar Eclipse Horoscope");
assert.equal(previewPiscesEclipse.parts.length, 1, "The exact reviewed template owns the complete eclipse composition.");
assert.match(previewPiscesEclipse.body, /^The Pisces lunar eclipse shines upon your 4th house/u);
assert.match(previewPiscesEclipse.body, /New Moon in Pisces on March 18\./u);
assert.match(previewPiscesEclipse.body, /Home is where the heart is\. Home isn't just a place - it's a feeling\./u);
assert.doesNotMatch(previewPiscesEclipse.body, /This month's full moon intention is/u);
assert.doesNotMatch(previewPiscesEclipse.body, /\{\{/u);
assert.equal(previewPiscesEclipse.reviewFlags, undefined);
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

const eclipseWithoutCycleAnchor = readerRenderer.renderLunationHoroscope({
  kind: "eclipse-lunar",
  sign: "pisces",
  risingSign: "aries",
  eventDate: "2026-08-28T04:00:00.000Z",
  timeZone: "America/New_York"
});
assert.match(eclipseWithoutCycleAnchor.body, /^The Pisces lunar eclipse shines upon/u);
assert.match(eclipseWithoutCycleAnchor.body, /Lunar eclipses are portals into your soul/u);
assert.match(eclipseWithoutCycleAnchor.body, /allow for endings, mourn if needed/u);
assert.deepEqual(
  eclipseWithoutCycleAnchor.reviewFlags,
  [{
    id: "conditional-section-omitted",
    status: "needs_review",
    sectionId: "matching-new-moon-anchor",
    omittedContentKey: "fallback-hook/lunation-matching-new-moon-anchor/full",
    fallbackContentKey: null,
    reason: "missing-or-ineligible"
  }],
  "A missing lunar-eclipse cycle anchor is flagged while the approved evergreen reading still serves."
);

const recoveredAquariusVirgo = readerRenderer.renderLunationHoroscope({
  kind: "new-moon",
  sign: "aquarius",
  risingSign: "virgo",
  moonHouse: 6,
  ruler: "saturn",
  rulerHouse: 8,
  rulerRetrograde: false
});
const recoveredCell = lunationBook.authoredCards.find((row) => row.contentKey.endsWith(
  "/new-moon/aquarius/rising-virgo/house-6"
));
assert.equal(recoveredAquariusVirgo.parts[0], recoveredCell.body);
assert.equal(recoveredAquariusVirgo.contentKey, recoveredCell.contentKey);

const recoveredTaurusNewMoon = readerRenderer.renderLunationHoroscope({
  kind: "new-moon",
  sign: "taurus",
  risingSign: "aries",
  moonHouse: 2,
  ruler: "venus",
  rulerHouse: 3,
  rulerRetrograde: false
});
const recoveredTaurusCell = lunationBook.authoredCards.find((row) => row.contentKey.endsWith(
  "/new-moon/taurus/rising-aries/house-2"
));
assert.equal(recoveredTaurusNewMoon.parts[0], recoveredTaurusCell.body);
assert.equal(recoveredTaurusNewMoon.contentKey, recoveredTaurusCell.contentKey);

const missingSourceFallback = noBookReaderRenderer.renderLunationHoroscope({
  kind: "new-moon",
  sign: "taurus",
  risingSign: "aries",
  moonHouse: 2,
  ruler: "venus",
  rulerHouse: 3,
  rulerRetrograde: false
});
assert.equal(missingSourceFallback.contentKey, undefined);
assert.equal(missingSourceFallback.templateKey, "fallback-template/sky.lunation-horoscope");
assert.match(missingSourceFallback.parts[0], /2nd house/u);
assert.ok(missingSourceFallback.parts.includes(
  "This New Moon begins a cycle that will develop over the next six months."
));

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
      authoredCards: [
        ...baseLibrary.authoredCards,
        ...blend.authoredCards,
        ...lunationBook.authoredCards,
        ...lunationEclipseVariants.sectionCards,
        ...lunationEclipseHouseLayers.authoredCards,
        ...lunationEclipseVariants.authoredCards
      ].filter(isReaderEligible)
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
  assert.deepEqual(
    browserReader.renderLunationHoroscope({ ...piscesDateBoundaryFacts, timeZone: "America/New_York" }),
    newYorkPisces
  );
  assert.deepEqual(
    browserReader.renderLunationHoroscope({ ...piscesDateBoundaryFacts, timeZone: "Asia/Tokyo" }),
    tokyoPisces
  );
  assert.deepEqual(browserReader.renderLunationHoroscope(piscesEclipseFacts), heldPiscesEclipse);
  assert.deepEqual(browserReader.renderLunationHoroscope(virgoSolarEclipseFacts), virgoSolarEclipse);
  const browserPreview = browserModule.createTransitSynastryRenderer(
    {
      authoredCards: [
        ...baseLibrary.authoredCards,
        ...blend.authoredCards,
        ...lunationBook.authoredCards,
        ...lunationEclipseVariants.sectionCards,
        ...lunationEclipseHouseLayers.authoredCards,
        ...lunationEclipseVariants.authoredCards
      ]
    },
    templates,
    {
      ...baseRows,
      hookRows: [...baseRows.hookRows, ...blend.hookRows]
    },
    { allowUnreviewed: true }
  );
  assert.deepEqual(browserPreview.renderLunationHoroscope(piscesEclipseFacts), previewPiscesEclipse);
} finally {
  await vite.close();
}

const ariesMacro = readerRenderer.renderLunationMacro({ kind: "full-moon", sign: "aries" });
assert.match(ariesMacro.headline, /Aries Full Moon/u);
assert.match(ariesMacro.body, /^Full Moons bring what has been building into clearer view\./u);
const piscesMacro = readerRenderer.renderLunationMacro({ kind: "full-moon", sign: "pisces" });
assert.match(piscesMacro.body, /^Full moons are about illuminating that unconscious and that which is unseen\./u);
assert.match(piscesMacro.body, /The Pisces full moon asks you, "what is fantasy and what is real\?"/u);
assert.doesNotMatch(piscesMacro.body, /temporary help that turned into a permanent obligation|unpaid emotional labor|The Sun in Virgo sits directly opposite/u);

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
  "lunation blend assembly checks passed: 288 exact book cells, 30 approved lunar eclipse sections, 12 approved solar house layers, localized cycle anchors, resolver parity, independent section review flags, and evergreen fallback"
);
