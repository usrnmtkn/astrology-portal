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
assert.equal(skyArticleV1.hookRows.length, 42);
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
assert.equal(skySignCopySunV1.rows.length, 12);
assert.equal(new Set(skySignCopySunV1.rows.map((row) => row.contentKey)).size, 12);
assert.ok(skySignCopySunV1.rows.every((row) => row.review_status === "needs_review"));
assert.ok(skySignCopySunV1.rows.every((row) => row.body_you === row.body_they));
assert.ok(skySignCopySunV1.rows.every((row) => (
  row.contentKey.startsWith("fallback-hook/sky-sign-copy/sun/")
)));
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
assert.match(skyPlacementResolver, /fallback-vocab\/sky-planet-function\//u);
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
  "d996f251504578c5567889f8490241f0c76bf96f5a3a50e4d49d8b0e67f07bd6"
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
const currentFallback = renderer.renderSkyPlacement({
  planet: "saturn",
  sign: "pisces",
  asOfDate: "2025-01-15T12:00:00Z"
});
assert.notEqual(currentFallback.contentKey, archive.contentKey);
assert.equal(currentFallback.templateKey, "fallback-template/sky.placement-article");

const previewRenderer = createTransitSynastryRenderer(
  combinedTransit,
  templates,
  combinedRows,
  { allowUnreviewed: true }
);
const framed = renderer.renderSkyPlacement({
  planet: "venus",
  sign: "virgo",
  asOfDate: "2026-09-20T12:00:00Z",
  entryDate: "Sep 19, 2026",
  exitDate: "Oct 13, 2026"
});
assert.equal(framed.templateKey, "sky-placement-frame-v3");
const venusVirgoHook = combinedRows.hookRows.find((row) => (
  row.contentKey === "fallback-hook/sky-placement-hook/venus/virgo"
  && row.review_status === "approved"
));
const venusVirgoLived = combinedRows.hookRows.find((row) => (
  row.contentKey === "fallback-hook/sky-placement-lived/venus/virgo"
  && row.review_status === "approved"
));
const venusVirgoTurn = combinedRows.hookRows.find((row) => (
  row.contentKey === "fallback-hook/sky-placement-turn/venus/virgo"
  && row.review_status === "approved"
));
const venusVirgoMoves = combinedRows.hookRows.find((row) => (
  row.contentKey === "fallback-hook/sky-placement-moves/venus/virgo"
  && row.review_status === "approved"
));
assert.ok(venusVirgoHook);
assert.ok(venusVirgoLived);
assert.ok(venusVirgoTurn);
assert.ok(venusVirgoMoves);
assert.ok(framed.parts.length >= 6);
assert.match(framed.parts[0], /Sep 19, 2026/u);
assert.match(framed.parts[0], /Oct 13, 2026/u);
assert.ok(framed.parts.includes(venusVirgoHook.body_you));
assert.ok(framed.parts.includes(venusVirgoLived.body_you));
assert.ok(framed.parts.includes(venusVirgoTurn.body_you));
assert.ok(framed.parts.some((part) => /through Oct 13, 2026/u.test(part)));
assert.match(framed.parts.at(-1), /Give your taste a vote/u);
assert.equal(
  framed.parts[1],
  skyPlanetFramesV1.rows.find((row) => row.contentKey === "fallback-hook/sky-placement-frame/venus")?.body_you
);
assert.deepEqual(
  framed.moves,
  venusVirgoMoves.body_you.split(/\r?\n/u).map((move) => move.trim()).filter(Boolean)
);

const sunLeo = renderer.renderSkyPlacement({
  planet: "sun",
  sign: "leo",
  asOfDate: "2026-07-29T12:00:00Z",
  entryDate: "Jul 22, 2026",
  exitDate: "Aug 23, 2026"
});
assert.equal(sunLeo.templateKey, "sky-placement-frame-v3");
assert.match(
  sunLeo.parts[0],
  /^The Sun is in Leo from Jul 22, 2026 to Aug 23, 2026\. When the Sun moves through Leo,/u
);
assert.doesNotMatch(sunLeo.body, /month takes on this sign's subject/iu);
assert.equal(
  sunLeo.parts[1],
  skyPlanetFramesV1.rows.find((row) => row.contentKey === "fallback-hook/sky-placement-frame/sun")?.body_you
);

const previewSunLeo = previewRenderer.renderSkyPlacement({
  planet: "sun",
  sign: "leo",
  asOfDate: "2026-07-29T12:00:00Z",
  entryDate: "Jul 22, 2026",
  exitDate: "Aug 23, 2026"
});
const sunLeoSignCopy = skySignCopySunV1.rows.find((row) => (
  row.contentKey === "fallback-hook/sky-sign-copy/sun/leo"
));
assert.ok(sunLeoSignCopy);
assert.equal(previewSunLeo.templateKey, "sky-placement-article-v2");
assert.equal(previewSunLeo.contentKey, sunLeoSignCopy.contentKey);
assert.equal(
  previewSunLeo.parts[0],
  skyPlacementVoicePassV1.rows.find((row) => row.contentKey === "fallback-hook/sky-placement/sun")?.body_you
    .replaceAll("{{signTitle}}", "Leo")
    .replaceAll("{{entryDate}}", "Jul 22, 2026")
    .replaceAll("{{exitDate}}", "Aug 23, 2026")
    .replaceAll("{{signStyle}}", "warm, visible, unmasked")
);
assert.equal(previewSunLeo.parts[2], sunLeoSignCopy.body_you);
assert.deepEqual(previewSunLeo.moves, []);

const mercuryDirect = renderer.renderSkyPlacement({
  planet: "mercury",
  sign: "leo",
  asOfDate: "2026-07-01T12:00:00Z",
  entryDate: "Jun 29, 2026",
  exitDate: "Aug 10, 2026"
});
const mercuryRetrograde = renderer.renderSkyPlacement({
  planet: "mercury",
  sign: "leo",
  asOfDate: "2026-07-29T12:00:00Z",
  entryDate: "Jun 29, 2026",
  exitDate: "Aug 10, 2026",
  isRetrograde: true
});
assert.equal(
  mercuryDirect.parts[1],
  skyPlanetFramesV1.rows.find((row) => row.contentKey === "fallback-hook/sky-placement-frame/mercury")?.body_you
);
assert.equal(
  mercuryRetrograde.parts[1],
  skyPlanetFramesV1.rows.find((row) => row.contentKey === "fallback-hook/sky-placement-retro-frame/mercury")?.body_you
);
assert.notEqual(mercuryRetrograde.parts[1], mercuryDirect.parts[1]);

const saturnDirect = previewRenderer.renderSkyPlacement({
  planet: "saturn",
  sign: "aries",
  asOfDate: "2026-06-01T12:00:00Z",
  entryDate: "Feb 13, 2026",
  exitDate: "Apr 12, 2028"
});
assert.equal(saturnDirect.templateKey, "sky-placement-frame-v3");
const saturnRetrograde = previewRenderer.renderSkyPlacement({
  planet: "saturn",
  sign: "aries",
  asOfDate: "2026-07-29T12:00:00Z",
  entryDate: "Feb 13, 2026",
  exitDate: "Apr 12, 2028",
  isRetrograde: true
});
assert.equal(saturnRetrograde.contentKey, saturnAries.contentKey);
assert.equal(saturnRetrograde.keyDates.length, 0);
assert.equal(saturnRetrograde.risingHoroscopes.length, 0);
assert.equal(saturnRetrograde.parts.at(-1), saturnAries.closing_charge);
const saturnShadow = previewRenderer.renderSkyPlacement({
  planet: "saturn",
  sign: "aries",
  asOfDate: "2026-12-10T12:00:00Z",
  entryDate: "Feb 13, 2026",
  exitDate: "Apr 12, 2028",
  isShadowPhase: true
});
assert.equal(saturnShadow.contentKey, saturnAries.contentKey);

const nodeBeforeFlip = previewRenderer.renderSkyPlacement({
  planet: "north-node",
  sign: "aquarius",
  asOfDate: "2026-08-17T16:00:00Z",
  entryDate: "Jan 11, 2025",
  exitDate: "Aug 18, 2026"
});
assert.equal(nodeBeforeFlip.templateKey, "sky-placement-frame-v3");
assert.match(nodeBeforeFlip.headline, /North Node in Pisces/u);
const nodeAfterFlip = previewRenderer.renderSkyPlacement({
  planet: "north-node",
  sign: "pisces",
  asOfDate: "2026-08-18T16:00:00Z",
  entryDate: "Aug 18, 2026",
  exitDate: "Mar 26, 2028"
});
assert.equal(nodeAfterFlip.templateKey, "sky-placement-frame-v3");
assert.match(nodeAfterFlip.headline, /North Node in Aquarius/u);

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
assert.equal(archived.keyDates.length, 9);
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
const live = liveRenderer.renderSkyPlacement({
  planet: "saturn",
  sign: "pisces",
  asOfDate: "2024-07-01T12:00:00Z"
});
assert.equal(live.contentKey, archive.contentKey);
assert.ok(!live.parts.includes(archive.preview_note));
assert.ok(live.parts.includes(archive.history_echo));
assert.equal(live.parts.at(-1), archive.closing_charge);

const shadow = liveRenderer.renderSkyPlacement({
  planet: "saturn",
  sign: "pisces",
  asOfDate: "2024-07-01T12:00:00Z",
  isShadowPhase: true
});
assert.equal(shadow.parts[0], archive.preview_note);

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
  asOfDate: "2024-07-01T12:00:00Z"
});
assert.ok(!fastDirect.parts.includes(archive.history_echo));

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
  "Sky article v1 passed: 2 registry articles, 42 approved V3 slot rows, 23 approved three-beat frames, "
  + "42 review-gated voice-pass rows, 12 review-gated Sun sign modules, 25 approved vocab rows, "
  + "9/9 archive ephemeris facts, wrong-station rejection, retrograde fallback, shared-bank hashes, "
  + "and the Aug 18 node-axis flip."
);
