import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import {
  createTransitSynastryRenderer,
  SourceGapError
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import transitRows from "../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json" with { type: "json" };
import sourceRows from "../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json" with { type: "json" };
import skyArticleV1 from "../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-article-v1.json" with { type: "json" };
import skyPlacementVoicePassV1 from "../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-inventories-voice-pass-v1.json" with { type: "json" };
import skyPlanetFramesV1 from "../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-planet-frames-v1.json" with { type: "json" };
import skySignCopySunV1 from "../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-sign-copy-sun-v1.json" with { type: "json" };
import templates from "../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json" with { type: "json" };

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const browserResolverPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts"
);
const browserResolver = fs.readFileSync(browserResolverPath, "utf8");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const skyPlacementResolver = browserResolver.slice(
  browserResolver.indexOf("function renderSkyPlacement"),
  browserResolver.indexOf("// ---- Calendar page")
);

assert.equal(skyArticleV1.authoredCards.length, 2);
assert.equal(skyArticleV1.hookRows.length, 14);
assert.ok(!skyArticleV1.hookRows.some((row) => (
  /^fallback-hook\/sky-placement-(?:you|practice)\//u.test(row.contentKey)
)));
assert.equal(skyArticleV1.vocabularyRows.length, 25);
assert.equal(skyPlanetFramesV1.rows.length, 23);
assert.equal(
  skyPlanetFramesV1.rows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-placement-frame/")).length,
  14
);
assert.equal(
  skyPlanetFramesV1.rows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-placement-retro-frame/")).length,
  9
);
assert.ok(skyPlanetFramesV1.rows.every((row) => row.review_status === "approved"));
assert.ok(skyPlanetFramesV1.rows.every((row) => row.body_you === row.body_they));
assert.equal(skyPlacementVoicePassV1.rows.length, 42);
assert.equal(new Set(skyPlacementVoicePassV1.rows.map((row) => row.contentKey)).size, 42);
assert.ok(skyPlacementVoicePassV1.rows.every((row) => row.review_status === "needs_review"));
assert.ok(skyPlacementVoicePassV1.rows.every((row) => row.body_you === row.body_they));
assert.equal(skySignCopySunV1.rows.length, 1);
assert.equal(skySignCopySunV1.rows[0].contentKey, "fallback-hook/sky-sign-copy/sun/leo");
assert.equal(skySignCopySunV1.rows[0].review_status, "approved");
assert.equal(skySignCopySunV1.rows[0].render_policy, "sky-placement-continuous-v2");
assert.ok(skySignCopySunV1.rows.every((row) => row.body_you === row.body_they));
assert.ok(skySignCopySunV1.rows.every((row) => (
  row.contentKey.startsWith("fallback-hook/sky-sign-copy/sun/")
)));
assert.equal(skySignCopySunV1.superseded_rows.length, 14);
assert.equal(new Set(skySignCopySunV1.superseded_rows.map((row) => row.contentKey)).size, 12);
assert.ok(skySignCopySunV1.superseded_rows.every((row) => row.review_status === "superseded"));
assert.ok(skyArticleV1.hookRows.every((row) => row.review_status === "approved"));
assert.ok(skyArticleV1.vocabularyRows.every((row) => row.review_status === "approved"));
assert.ok(skyArticleV1.vocabularyRows.every((row) => row.contentKey.startsWith("fallback-vocab/sky-")));
assert.ok(!skyArticleV1.vocabularyRows.some((row) => (
  row.contentKey.startsWith("fallback-vocab/sign-style/")
  || row.contentKey.startsWith("fallback-vocab/planet-function/")
)));
assert.doesNotMatch(skyPlacementResolver, /fallback-vocab\/sign-style\//u);
assert.doesNotMatch(skyPlacementResolver, /fallback-vocab\/planet-function\//u);
assert.match(skyPlacementResolver, /fallback-vocab\/sky-sign-style\//u);
assert.match(
  skyPlacementResolver,
  /fallback-hook\/sky-placement-frame\//u,
  "Sky Placement fallback pages must use the reviewed planet-explanation hook family."
);
assert.doesNotMatch(
  skyPlacementResolver,
  /2026-08-18|afterAxisFlip/u,
  "Node placement copy must use the True Node sign supplied by the ephemeris, not a hardcoded axis date."
);
assert.match(
  appSource,
  /transitSynastryFallbackRendererV3\.renderSkyPlacement\(\{/u,
  "Sky placement pages must resolve through the approved reader renderer."
);
assert.match(
  appSource,
  /rendered\.templateKey === "sky-placement-frame-v3"[\s\S]*rendered\.templateKey === "sky-placement-article-v2"[\s\S]*\? "authored" : "fallback"/u,
  "Approved V3 assemblies must outrank stale generated Sky copy."
);
assert.match(
  appSource,
  /const isContinuousFallback = placementSection\?\.sourceKeys\.includes\("sky-placement-continuous-v2"\)[\s\S]*isRegistryArticle \|\| isContinuousFallback \? null : effectiveTransitRangeLabel[\s\S]*isRegistryArticle \|\| isContinuousFallback \? undefined : effectiveTransitRangeLabel/u,
  "Continuous fallback pages must not repeat the transit range in detail metadata or duration."
);
assert.doesNotMatch(
  JSON.stringify(skyArticleV1),
  /the month takes on this sign's subject/iu,
  "The retired generic Sun frame may not return."
);

const sharedBankHash = (prefix) => crypto
  .createHash("sha256")
  .update(JSON.stringify(sourceRows.vocabularyRows.filter((row) => row.contentKey.startsWith(prefix))))
  .digest("hex");
assert.equal(
  sharedBankHash("fallback-vocab/sign-style/"),
  "c909a72c8f840182d7e448fc37f28c127d8996676b1a49dca5a179cf26b8ea67"
);
assert.equal(
  sharedBankHash("fallback-vocab/planet-function/"),
  "06e31114ce19c9230b817f053581f731f6973b0a2c5c55f49bc0f8f8fa68a0b9"
);

const literalSkyRowDate = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{4})\b/u;
for (const row of skyArticleV1.hookRows) {
  assert.doesNotMatch(row.body_you, literalSkyRowDate, row.contentKey);
}

const combinedRows = {
  ...sourceRows,
  hookRows: [
    ...sourceRows.hookRows,
    ...skyArticleV1.hookRows,
    ...skyPlanetFramesV1.rows,
    ...skyPlacementVoicePassV1.rows,
    ...skySignCopySunV1.rows
  ],
  vocabularyRows: [...sourceRows.vocabularyRows, ...skyArticleV1.vocabularyRows]
};
const archive = skyArticleV1.authoredCards.find((row) => row.contentKey === "sky-article/saturn/pisces/2023");
const saturnAries = skyArticleV1.authoredCards.find((row) => row.contentKey === "sky-article/saturn/aries/2026");
assert.ok(archive);
assert.ok(saturnAries);
const combinedTransit = {
  authoredCards: [...transitRows.authoredCards, ...skyArticleV1.authoredCards]
};
const renderer = createTransitSynastryRenderer(combinedTransit, templates, combinedRows);
const outOfWindowSaturnPisces = renderer.renderSkyPlacement({
  planet: "saturn",
  sign: "pisces",
  asOfDate: "2025-01-15T12:00:00Z",
  entryDate: "March 7, 2023",
  exitDate: "May 24, 2025"
});
assert.equal(outOfWindowSaturnPisces.templateKey, "sky-placement-frame-v3");
assert.equal(outOfWindowSaturnPisces.contentKey, "fallback-hook/sky-placement/saturn");

const previewRenderer = createTransitSynastryRenderer(
  combinedTransit,
  templates,
  combinedRows,
  { allowUnreviewed: true }
);
assert.throws(
  () => renderer.renderSkyPlacement({
    planet: "venus",
    sign: "virgo",
    asOfDate: "2026-09-20T12:00:00Z",
    entryDate: "Sep 19, 2026",
    exitDate: "Oct 13, 2026"
  }),
  /SOURCE_GAP: continuous sky placement sign copy venus\/virgo/u,
  "Unstamped legacy Venus modules must remain dark in this source-only renderer."
);

const sunLeo = renderer.renderSkyPlacement({
  planet: "sun",
  sign: "leo",
  asOfDate: "2026-07-29T12:00:00Z",
  entryDate: "July 22, 2026",
  exitDate: "August 23, 2026",
  events: [
    {
      type: "aspect",
      a: "sun",
      b: "jupiter",
      aspect: "conjunction",
      aSign: "leo",
      bSign: "leo",
      exactDate: "July 29, 2026"
    },
    {
      type: "aspect",
      a: "sun",
      b: "mars",
      aspect: "square",
      aSign: "leo",
      bSign: "taurus",
      exactDate: "August 1, 2026"
    }
  ]
});
assert.equal(sunLeo.templateKey, "sky-placement-continuous-v2");
assert.equal(sunLeo.contentKey, "fallback-hook/sky-sign-copy/sun/leo");
assert.equal(sunLeo.parts[0], "July 22 to August 23, 2026");
assert.equal(sunLeo.parts[1], skySignCopySunV1.rows[0].opening.replaceAll("{{entryDate}}", "July 22"));
assert.equal(sunLeo.parts[2], skySignCopySunV1.rows[0].tension);
assert.equal(sunLeo.parts[3], skySignCopySunV1.rows[0].development);
assert.match(sunLeo.parts[4], /^On July 29, the Sun meets Jupiter in Leo\./u);
assert.equal(sunLeo.parts[5], skySignCopySunV1.rows[0].aspect_units[0].check);
assert.equal(sunLeo.parts[6], skySignCopySunV1.rows[0].close.replaceAll("{{exitDate}}", "August 23"));
assert.equal(sunLeo.articleSections.length, 3);
assert.equal(sunLeo.articleSections.filter((section) => section.kind === "dated-aspect").length, 1);
assert.equal(sunLeo.articleSections[1].heading, "Sun conjunct Jupiter in Leo");
assert.equal(sunLeo.articleSections[1].body.split(/\n{2,}/u).length, 2);
assert.equal(Object.hasOwn(sunLeo, "moves"), false, "Sky Placement renders must not expose a Try this section.");
assert.equal(Object.hasOwn(sunLeo, "movesPresentation"), false);
assert.doesNotMatch(sunLeo.body, /[\u2013\u2014]/u);
assert.doesNotMatch(sunLeo.body, /Somewhere along the way|rescheduling a decision|version of yourself|The useful version|The distortion/iu);
assert.equal(sunLeo.body.split("July 22").length - 1, 2);
assert.equal(sunLeo.body.split("August 23").length - 1, 2);
assert.equal(sunLeo.body.split("2026").length - 1, 1);
assert.doesNotMatch(sunLeo.body, /August 1, 2026/u, "Only one active major-aspect section may render.");
assert.equal(sunLeo.tagline, null);
assert.equal(sunLeo.closingCharge, null);

const previewSunLeo = previewRenderer.renderSkyPlacement({
  planet: "sun",
  sign: "leo",
  asOfDate: "2026-07-29T12:00:00Z",
  entryDate: "July 22, 2026",
  exitDate: "August 23, 2026"
});
const sunLeoSignCopy = skySignCopySunV1.rows.find((row) => (
  row.contentKey === "fallback-hook/sky-sign-copy/sun/leo"
));
assert.ok(sunLeoSignCopy);
assert.equal(previewSunLeo.templateKey, "sky-placement-continuous-v2");
assert.equal(previewSunLeo.contentKey, sunLeoSignCopy.contentKey);
assert.equal(previewSunLeo.parts.length, 5);
assert.equal(Object.hasOwn(previewSunLeo, "moves"), false);
const noAspectWordCount = previewSunLeo.parts
  .join(" ")
  .match(/[A-Za-z0-9’']+/gu)?.length ?? 0;
assert.ok(noAspectWordCount >= 190 && noAspectWordCount <= 350);
for (const unapprovedSign of ["aries", "taurus", "gemini", "cancer", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]) {
  assert.throws(
    () => previewRenderer.renderSkyPlacement({
      planet: "sun",
      sign: unapprovedSign,
      entryDate: "March 20, 2027",
      exitDate: "April 20, 2027"
    }),
    SourceGapError,
    `Superseded ${unapprovedSign} modules must never render, including in preview.`
  );
}

for (const facts of [
  { planet: "mercury", sign: "leo", entryDate: "Jun 29, 2026", exitDate: "Aug 10, 2026" },
  { planet: "venus", sign: "virgo", entryDate: "Sep 19, 2026", exitDate: "Oct 13, 2026" }
]) {
  assert.throws(
    () => previewRenderer.renderSkyPlacement({ ...facts, asOfDate: "2026-07-29T16:00:00Z" }),
    /SOURCE_GAP: continuous sky placement sign copy/u,
    `${facts.planet}/${facts.sign} must remain unavailable without its approved continuous source row.`
  );
}

for (const facts of [
  { planet: "saturn", sign: "aries", entryDate: "Feb 13, 2026", exitDate: "Apr 12, 2028", isRetrograde: true },
  { planet: "north-node", sign: "aquarius", entryDate: "Jul 26, 2026", exitDate: "Mar 26, 2028" },
  { planet: "south-node", sign: "leo", entryDate: "Jul 26, 2026", exitDate: "Mar 26, 2028" }
]) {
  const rendered = previewRenderer.renderSkyPlacement({
    ...facts,
    asOfDate: "2026-07-29T16:00:00Z",
    priorSign: "pisces",
    priorSignEntryDate: "January 1, 2025",
    priorSignExitDate: "January 1, 2026",
    previousResidencyEntryDate: "January 1, 2000",
    previousResidencyExitDate: "January 1, 2001"
  });
  assert.equal(
    rendered.templateKey,
    "sky-placement-frame-v3",
    `${facts.planet}/${facts.sign} must use the stamped four-slot frame, not the retired module stack.`
  );
}

const archived = renderer.renderSkyPlacement({
  planet: "saturn",
  sign: "pisces",
  articleMode: "archive",
  articleKey: archive.contentKey,
  asOfDate: "2026-07-29T12:00:00Z",
  hasPriorIngress: true
});
assert.equal(archived.contentKey, archive.contentKey);
assert.equal(archived.articleMode, "archive");
assert.equal(archived.keyDates.length, 0);
assert.equal(archived.parts[0], archive.preview_note);
assert.ok(archived.parts.includes(archive.history_echo));
assert.equal(archived.parts.at(-1), archive.closing_charge);

assert.throws(
  () => renderer.renderSkyPlacement({
    planet: "saturn",
    sign: "pisces",
    articleMode: "archive",
    articleKey: "sky-article/saturn/pisces/1900",
    asOfDate: "2026-07-29T12:00:00Z"
  }),
  SourceGapError
);

const liveCalibration = {
  ...archive,
  archive_only: false
};
const liveRenderer = createTransitSynastryRenderer(
  { authoredCards: [...transitRows.authoredCards, liveCalibration] },
  templates,
  combinedRows
);
for (const isShadowPhase of [false, true]) {
  const rendered = liveRenderer.renderSkyPlacement({
    planet: "saturn",
    sign: "pisces",
    asOfDate: "2024-07-01T12:00:00Z",
    entryDate: "March 7, 2023",
    exitDate: "May 24, 2025",
    isShadowPhase
  });
  assert.equal(rendered.templateKey, "sky-placement-frame-v3");
  assert.notEqual(rendered.templateKey, "sky-placement-standalone-hook-v1");
}
assert.equal(
  templates.templates.some((template) => template.contentKey === "fallback-template/sky.placement-article"),
  false,
  "The obsolete unframed Sky Placement template must remain retired."
);

const fastDirectArticle = {
  ...archive,
  contentKey: "sky-article/sun/pisces/2023",
  planet: "sun",
  archive_only: false
};
const fastRenderer = createTransitSynastryRenderer(
  { authoredCards: [...transitRows.authoredCards, fastDirectArticle] },
  templates,
  combinedRows
);
const fastDirect = fastRenderer.renderSkyPlacement({
  planet: "sun",
  sign: "pisces",
  asOfDate: "2024-07-01T12:00:00Z",
  articleMode: "archive",
  articleKey: fastDirectArticle.contentKey
});
assert.ok(!fastDirect.parts.includes(archive.history_echo));

const risingSigns = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
const risingHouseMap = Object.fromEntries(
  risingSigns.map((risingSign, index) => [risingSign, ((5 - index + 12) % 12) + 1])
);
const finalArticleBase = {
  contentKey: "sky-article/mercury/virgo/2026",
  content_role: "authored_card",
  planet: "mercury",
  sign: "virgo",
  valid_from: "2026-08-25",
  valid_to: "2026-09-15",
  archive_only: false,
  headline: "Mercury in Virgo",
  article_structure: "final-v1",
  article_sections: [
    {
      kind: "collective-read",
      body: "The plan gets sharper, but perfection is still a trap. What gets simpler now?"
    },
    {
      kind: "seasonal-context",
      body: "During Virgo season, the details are already loud."
    },
    {
      kind: "dated-aspect",
      a: "mercury",
      b: "uranus",
      aspect: "square",
      exact_date: "2026-09-07",
      degree: 15,
      heading: "The Mercury-Uranus Square: {{aspectDate}}",
      body: "The plan meets a surprise at {{aspectDegree}} degrees."
    },
    {
      kind: "ingress",
      body: "Mercury entered Virgo on {{entryDate}}."
    },
    {
      kind: "exit-tone-shift",
      body: "Mercury continues through Virgo until {{exitDate}}, then the tone shifts."
    },
    {
      kind: "historic-movement",
      body: "The prior passage ran from {{historyEntryDate}} to {{historyExitDate}} across {{historyDegreeRange}}."
    },
    {
      kind: "retrograde-variant",
      body: "The retrograde edition reviews the same ground."
    }
  ],
  rising_horoscopes: risingSigns.map((risingSign) => ({
    rising_sign: risingSign,
    body: "Mercury moves through your {{houseOrdinal}} house. You are allowed to use a simpler system."
  })),
  review_status: "approved"
};
const finalArticleRenderer = createTransitSynastryRenderer(
  { authoredCards: [...transitRows.authoredCards, finalArticleBase] },
  templates,
  combinedRows
);
const finalArticleFacts = {
  planet: "mercury",
  sign: "virgo",
  asOfDate: "2026-09-01T12:00:00Z",
  entryDate: "August 25, 2026",
  exitDate: "September 15, 2026",
  historyEntryDate: "August 30, 2016",
  historyExitDate: "September 20, 2016",
  historyDegreeRange: "0 to 29 degrees Virgo",
  risingHouseMap,
  events: [{
    type: "aspect",
    a: "mercury",
    b: "uranus",
    aspect: "square",
    exactDate: "September 7",
    exactDateKey: "2026-09-07",
    exactDegree: 15
  }]
};
const finalArticleDirect = finalArticleRenderer.renderSkyPlacement(finalArticleFacts);
assert.equal(finalArticleDirect.templateKey, "sky-article-final-v1");
assert.equal(finalArticleDirect.tagline, null);
assert.equal(Object.hasOwn(finalArticleDirect, "moves"), false);
assert.deepEqual(finalArticleDirect.keyDates, []);
assert.deepEqual(
  finalArticleDirect.articleSections.map((section) => section.kind),
  ["seasonal-context", "ingress", "collective-read", "dated-aspect", "exit-tone-shift"]
);
assert.doesNotMatch(finalArticleDirect.body, /prior passage|retrograde edition/u);
assert.equal(finalArticleDirect.risingHoroscopes.length, 12);
assert.match(finalArticleDirect.risingHoroscopes[0].body, /6th house/u);
assert.ok(!finalArticleDirect.parts.some((part) => /workable route between them/u.test(part)));

const finalArticleRetrograde = finalArticleRenderer.renderSkyPlacement({
  ...finalArticleFacts,
  isRetrograde: true
});
assert.match(finalArticleRetrograde.body, /prior passage/u);
assert.match(finalArticleRetrograde.body, /retrograde edition/u);

const finalRetrogradeEdition = {
  ...finalArticleBase,
  contentKey: "sky-article/mercury/virgo/2026/retrograde",
  article_variant: "retrograde",
  article_sections: finalArticleBase.article_sections.map((section) => (
    section.kind === "collective-read"
      ? { ...section, body: "This is the authored retrograde collective read." }
      : section
  ))
};
const variantRenderer = createTransitSynastryRenderer(
  {
    authoredCards: [
      ...transitRows.authoredCards,
      finalArticleBase,
      finalRetrogradeEdition
    ]
  },
  templates,
  combinedRows
);
assert.equal(
  variantRenderer.renderSkyPlacement(finalArticleFacts).contentKey,
  finalArticleBase.contentKey
);
assert.equal(
  variantRenderer.renderSkyPlacement({
    ...finalArticleFacts,
    isRetrograde: true
  }).contentKey,
  finalRetrogradeEdition.contentKey
);

const finalSlowArticle = {
  ...finalArticleBase,
  contentKey: "sky-article/saturn/virgo/2026",
  planet: "saturn",
  headline: "Saturn in Virgo"
};
const finalSlowRenderer = createTransitSynastryRenderer(
  { authoredCards: [...transitRows.authoredCards, finalSlowArticle] },
  templates,
  combinedRows
);
const finalSlow = finalSlowRenderer.renderSkyPlacement({
  ...finalArticleFacts,
  planet: "saturn",
  historyEntryDate: "August 30, 1996",
  historyExitDate: "September 20, 1998"
});
assert.match(finalSlow.body, /prior passage/u);

const emDashArticle = {
  ...finalArticleBase,
  contentKey: "sky-article/venus/virgo/2026",
  planet: "venus",
  headline: "Venus in Virgo",
  article_sections: finalArticleBase.article_sections.map((section) => (
    section.kind === "collective-read"
      ? { ...section, body: "Useful care — without a performance." }
      : section
  ))
};
const emDashRenderer = createTransitSynastryRenderer(
  { authoredCards: [...transitRows.authoredCards, emDashArticle] },
  templates,
  combinedRows
);
assert.throws(
  () => emDashRenderer.renderSkyPlacement({
    ...finalArticleFacts,
    planet: "venus"
  }),
  /prohibited em dash/u
);

const literalDateArticle = {
  ...finalArticleBase,
  contentKey: "sky-article/mars/virgo/2026",
  planet: "mars",
  headline: "Mars in Virgo",
  article_sections: finalArticleBase.article_sections.map((section) => (
    section.kind === "ingress"
      ? { ...section, body: "Mars entered Virgo on September 1, 2026." }
      : section
  ))
};
const literalDateRenderer = createTransitSynastryRenderer(
  { authoredCards: [...transitRows.authoredCards, literalDateArticle] },
  templates,
  combinedRows
);
assert.throws(
  () => literalDateRenderer.renderSkyPlacement({
    ...finalArticleFacts,
    planet: "mars"
  }),
  /hardcodes a date or degree/u
);

assert.throws(
  () => finalArticleRenderer.renderSkyPlacement({
    ...finalArticleFacts,
    events: [{
      type: "aspect",
      a: "mercury",
      b: "uranus",
      aspect: "square",
      exactDate: "September 8",
      exactDateKey: "2026-09-08",
      exactDegree: 15
    }]
  }),
  /event date contradicts the ephemeris/u
);
assert.throws(
  () => finalArticleRenderer.renderSkyPlacement({
    ...finalArticleFacts,
    events: [{
      type: "aspect",
      a: "mercury",
      b: "uranus",
      aspect: "square",
      exactDate: "September 7",
      exactDateKey: "2026-09-07",
      exactDegree: 16
    }]
  }),
  /event degree contradicts the ephemeris/u
);

function localDateKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const vite = await createServer({
  root: path.join(repoRoot, "apps/web"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent"
});

try {
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const location = ephemeris.defaultLocation;
  const timeZone = location.timeZone;
  const stationEvents = await ephemeris.getLunarCalendarRangeEvents(
    location,
    new Date("2023-01-01T00:00:00Z"),
    new Date("2026-03-01T00:00:00Z")
  );
  const saturnStations = stationEvents.filter((event) => (
    event.type === "station" && event.planet === "Saturn"
  ));
  const validateStationKeyDate = (keyDate) => {
    const direction = keyDate.event === "station-retrograde" ? "retrograde" : "direct";
    const event = saturnStations.find((candidate) => (
      candidate.dateKey === keyDate.date && candidate.direction === direction
    ));
    assert.ok(event, `${keyDate.label}: missing ephemeris station`);
    assert.equal(event.sign.toLowerCase(), keyDate.sign, `${keyDate.label}: station sign`);
    assert.equal(
      Math.floor(((event.longitude % 30) + 30) % 30),
      keyDate.degree,
      `${keyDate.label}: station degree`
    );
  };

  async function saturnPosition(date) {
    const sky = await ephemeris.getAstrodienstSky(location, date);
    const saturn = sky.positions.find((position) => position.planet === "Saturn");
    assert.ok(saturn, `Missing Saturn ephemeris position for ${date.toISOString()}`);
    return saturn;
  }

  async function boundaryFor(record) {
    const center = new Date(`${record.date}T00:00:00Z`).getTime();
    let lowTime = center - 18 * 60 * 60_000;
    let lowPosition = await saturnPosition(new Date(lowTime));
    let highTime = lowTime;
    let highPosition = lowPosition;

    for (let offset = 6; offset <= 60; offset += 6) {
      highTime = lowTime + 6 * 60 * 60_000;
      highPosition = await saturnPosition(new Date(highTime));
      if (lowPosition.sign.toLowerCase() !== record.sign && highPosition.sign.toLowerCase() === record.sign) {
        break;
      }
      lowTime = highTime;
      lowPosition = highPosition;
    }

    assert.notEqual(lowPosition.sign.toLowerCase(), record.sign, `${record.label}: missing sign boundary`);
    assert.equal(highPosition.sign.toLowerCase(), record.sign, `${record.label}: missing target sign`);

    for (let iteration = 0; iteration < 14; iteration += 1) {
      const middleTime = Math.floor((lowTime + highTime) / 2);
      const middlePosition = await saturnPosition(new Date(middleTime));
      if (middlePosition.sign.toLowerCase() === record.sign) {
        highTime = middleTime;
        highPosition = middlePosition;
      } else {
        lowTime = middleTime;
        lowPosition = middlePosition;
      }
    }

    return { date: new Date(highTime), position: highPosition };
  }

  for (const keyDate of archive.key_dates) {
    if (keyDate.event.startsWith("station-")) {
      validateStationKeyDate(keyDate);
      continue;
    }

    const boundary = await boundaryFor(keyDate);
    assert.equal(localDateKey(boundary.date, timeZone), keyDate.date, `${keyDate.label}: local date`);
    assert.equal(boundary.position.sign.toLowerCase(), keyDate.sign);
    assert.equal(
      Math.min(29, Math.floor(boundary.position.degree)),
      keyDate.degree,
      `${keyDate.label}: boundary degree`
    );
  }
  const saturnAriesExit = await boundaryFor({
    date: saturnAries.valid_to,
    label: "Saturn completes its passage through Aries",
    sign: "taurus"
  });
  assert.equal(
    localDateKey(saturnAriesExit.date, timeZone),
    saturnAries.valid_to,
    "Saturn in Aries article validity must end on the computed sign exit"
  );

  const stationCalibration = archive.key_dates.find((keyDate) => (
    keyDate.event === "station-retrograde"
  ));
  assert.ok(stationCalibration);
  assert.throws(
    () => validateStationKeyDate({
      ...stationCalibration,
      degree: stationCalibration.degree + 1,
      label: "Deliberately wrong station"
    }),
    /station degree/u
  );

} finally {
  await vite.close();
}

console.log(
  "Sky article v1 passed: 2 registry articles, 14 approved V3 slot rows, 23 approved three-beat frames, "
  + "42 review-gated voice-pass rows, 1 approved continuous Sun unit, 14 superseded Sun rows, 25 approved vocab rows, "
  + "9/9 archive ephemeris facts, wrong-station rejection, retrograde fallback, shared-bank hashes, "
  + "True Node sign-through, FINAL section order, article/slot exclusivity, twelve public rising blocks, "
  + "history/retrograde gates, and seeded punctuation/date/degree failures."
);
