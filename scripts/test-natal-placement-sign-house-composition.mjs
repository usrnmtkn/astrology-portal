import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";

import { renderNatalPlacement as renderNodePlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import { createFallbackRenderer } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts";

const { natalPlacementReaderSectionCopy } = await tsImport(
  "../apps/web/src/content/natalPlacementReaderSections.ts",
  import.meta.url
);
const fallbackRuntime = await tsImport(
  "../apps/web/src/content/fallbackArchitectureV3Runtime.ts",
  import.meta.url
);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));

const templates = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const rows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const interim = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json");
const shippedDist = await import(`${pathToFileURL(path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js")).href}?natal-placement-integrity=${Date.now()}`);

templates.templates.push(...interim.templates);
rows.vocabularyRows.push(...interim.vocabularyRows);

const renderBrowserPlacement = createFallbackRenderer(templates, rows).renderNatalPlacement;
const renderShippedPlacement = shippedDist.createFallbackRenderer(templates, rows).renderNatalPlacement;
const expectedSignBody = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-sign-final/moon/scorpio"
)?.body;
const expectedHouseBody = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-house-final/moon/6"
)?.body;
const expectedMercurySignBody = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/placement-sign-lived/mercury/pisces"
)?.body;
const expectedSunNinthHouseBody = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/placement-house-lived/sun/9"
)?.body;
const exactChironTaurusTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/taurus/12"
);
const exactChironAriesTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/aries/12"
);
const exactChironGeminiTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/gemini/12"
);
const exactChironCancerTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/cancer/12"
);
const exactChironLeoTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/leo/12"
);
const exactChironVirgoTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/virgo/12"
);
const exactChironLibraTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/libra/12"
);
const exactChironScorpioTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/scorpio/12"
);
const exactChironSagittariusTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/sagittarius/12"
);
const exactChironCapricornTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/capricorn/12"
);
const exactChironAquariusTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/aquarius/12"
);
const exactChironPiscesTwelfth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/chiron/pisces/12"
);
const exactLilithVirgoFourth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/lilith/virgo/4"
);
const exactLilithAriesFourth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/lilith/aries/4"
);
const exactLilithTaurusFourth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/lilith/taurus/4"
);
const exactLilithGeminiFourth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/lilith/gemini/4"
);
const exactLilithCancerFourth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/lilith/cancer/4"
);
const exactLilithLeoFourth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/lilith/leo/4"
);
const exactLilithScorpioFourth = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/natal-you-placement-complete-final/lilith/scorpio/4"
);
const expectedRenderedMoonHouseBody = expectedHouseBody?.replace(
  /^It's in your 6th house, meaning/u,
  "Your Moon is in your 6th house, meaning"
);
const expectedRenderedSunNinthHouseBody = `Your Sun is in your 9th house, meaning this side of you comes out through travel, study, belief, and the big questions.\n\n${expectedSunNinthHouseBody}`;

assert.ok(expectedSignBody, "Moon-in-Scorpio approved sign copy must exist.");
assert.ok(expectedHouseBody, "Moon-in-6th-house approved house copy must exist.");
assert.ok(expectedMercurySignBody, "Mercury-in-Pisces approved sign copy must exist.");
assert.ok(expectedSunNinthHouseBody, "The incremental owner-approved Sun-in-9th-house copy must exist.");
assert.ok(exactChironTaurusTwelfth?.body, "The owner-approved complete Chiron-in-Taurus-in-the-12th-house copy must exist.");
assert.ok(exactChironAriesTwelfth?.body, "The owner-approved complete Chiron-in-Aries-in-the-12th-house copy must exist.");
assert.ok(exactChironGeminiTwelfth?.body, "The owner-approved complete Chiron-in-Gemini-in-the-12th-house copy must exist.");
assert.ok(exactChironCancerTwelfth?.body, "The owner-approved complete Chiron-in-Cancer-in-the-12th-house copy must exist.");
assert.ok(exactChironLeoTwelfth?.body, "The owner-approved complete Chiron-in-Leo-in-the-12th-house copy must exist.");
assert.ok(exactChironVirgoTwelfth?.body, "The owner-approved complete Chiron-in-Virgo-in-the-12th-house copy must exist.");
assert.ok(exactChironLibraTwelfth?.body, "The owner-approved complete Chiron-in-Libra-in-the-12th-house copy must exist.");
assert.ok(exactChironScorpioTwelfth?.body, "The owner-approved complete Chiron-in-Scorpio-in-the-12th-house copy must exist.");
assert.ok(exactChironSagittariusTwelfth?.body, "The owner-approved complete Chiron-in-Sagittarius-in-the-12th-house copy must exist.");
assert.ok(exactChironCapricornTwelfth?.body, "The owner-approved complete Chiron-in-Capricorn-in-the-12th-house copy must exist.");
assert.ok(exactChironAquariusTwelfth?.body, "The owner-approved complete Chiron-in-Aquarius-in-the-12th-house copy must exist.");
assert.ok(exactChironPiscesTwelfth?.body, "The owner-approved complete Chiron-in-Pisces-in-the-12th-house copy must exist.");
assert.ok(exactLilithAriesFourth?.body, "The owner-approved complete Lilith-in-Aries-in-the-4th-house copy must exist.");
assert.ok(exactLilithTaurusFourth?.body, "The owner-approved complete Lilith-in-Taurus-in-the-4th-house copy must exist.");
assert.ok(exactLilithGeminiFourth?.body, "The owner-approved complete Lilith-in-Gemini-in-the-4th-house copy must exist.");
assert.ok(exactLilithCancerFourth?.body, "The owner-approved complete Lilith-in-Cancer-in-the-4th-house copy must exist.");
assert.ok(exactLilithLeoFourth?.body, "The owner-approved complete Lilith-in-Leo-in-the-4th-house copy must exist.");
assert.ok(exactLilithVirgoFourth?.body, "The owner-approved complete Lilith-in-Virgo-in-the-4th-house copy must exist.");
assert.ok(exactLilithScorpioFourth?.body, "The owner-approved complete Lilith-in-Scorpio-in-the-4th-house copy must exist.");

const placementReaderFamilies = [
  "fallback-hook/natal-you-placement-complete-final/",
  "fallback-hook/natal-you-placement-sign-final/",
  "fallback-hook/natal-you-placement-house-final/",
  "fallback-hook/placement-sign-lived/",
  "fallback-hook/placement-house-lived/",
  "fallback-hook/sign-lived/",
  "fallback-hook/house-lived/"
];
const governedPlacementRows = rows.hookRows.filter((row) =>
  row.reader_only === true
  && row.render_policy === "reader-only-exact-lived-v1"
  && placementReaderFamilies.some((prefix) => row.contentKey.startsWith(prefix))
);
const multiParagraphPlacementRows = governedPlacementRows.filter((row) => /\n{2,}/u.test(row.body ?? ""));

assert.equal(governedPlacementRows.length, 172, "governed natal placement inventory changed; audit new rows before updating the gate");
assert.equal(multiParagraphPlacementRows.length, 162, "multi-paragraph natal placement inventory changed; audit truncation exposure before updating the gate");
for (const row of governedPlacementRows) {
  assert.equal(
    natalPlacementReaderSectionCopy(row.body, row.contentKey),
    row.body.replace(/\s+/gu, " ").trim(),
    `${row.contentKey}: app normalization must retain the complete selected reader section.`
  );
}

for (const [rendererName, renderPlacement] of [
  ["Node", renderNodePlacement],
  ["browser", renderBrowserPlacement],
  ["shipped dist", renderShippedPlacement]
]) {
  for (const { sign, headline, row } of [
    { sign: "taurus", headline: "Chiron in Taurus in the 12th house", row: exactChironTaurusTwelfth },
    { sign: "aries", headline: "Chiron in Aries in the 12th house", row: exactChironAriesTwelfth },
    { sign: "gemini", headline: "Chiron in Gemini in the 12th house", row: exactChironGeminiTwelfth },
    { sign: "cancer", headline: "Chiron in Cancer in the 12th house", row: exactChironCancerTwelfth },
    { sign: "leo", headline: "Chiron in Leo in the 12th house", row: exactChironLeoTwelfth },
    { sign: "virgo", headline: "Chiron in Virgo in the 12th house", row: exactChironVirgoTwelfth },
    { sign: "libra", headline: "Chiron in Libra in the 12th house", row: exactChironLibraTwelfth },
    { sign: "scorpio", headline: "Chiron in Scorpio in the 12th house", row: exactChironScorpioTwelfth },
    { sign: "sagittarius", headline: "Chiron in Sagittarius in the 12th house", row: exactChironSagittariusTwelfth },
    { sign: "capricorn", headline: "Chiron in Capricorn in the 12th house", row: exactChironCapricornTwelfth },
    { sign: "aquarius", headline: "Chiron in Aquarius in the 12th house", row: exactChironAquariusTwelfth },
    { sign: "pisces", headline: "Chiron in Pisces in the 12th house", row: exactChironPiscesTwelfth }
  ]) {
    const exactChiron = renderPlacement({ planet: "chiron", sign, house: 12, voice: "you" });
    assert.equal(exactChiron.headline, headline);
    assert.deepEqual(exactChiron.parts, [row.body]);
    assert.deepEqual(exactChiron.partKeys, [row.contentKey]);
    assert.equal(exactChiron.templateKey, row.contentKey);
    assert.equal(exactChiron.provenanceTier, "exact-owner-approved");

    const exactChironFriend = renderPlacement({ planet: "chiron", sign, house: 12, voice: "Alex" });
    assert.equal(exactChironFriend.parts.length, 2, `${rendererName} Friend placement must continue using reusable sign and house sources.`);
    assert.notEqual(exactChironFriend.templateKey, row.contentKey);
  }

  const exactLilith = renderPlacement({ planet: "lilith", sign: "virgo", house: 4, voice: "you" });
  assert.equal(exactLilith.headline, "Lilith in Virgo in the 4th house");
  assert.deepEqual(exactLilith.parts, [exactLilithVirgoFourth.body]);
  assert.deepEqual(exactLilith.partKeys, [exactLilithVirgoFourth.contentKey]);
  assert.equal(exactLilith.templateKey, exactLilithVirgoFourth.contentKey);
  assert.equal(exactLilith.provenanceTier, "exact-owner-approved");

  const exactLilithFriend = renderPlacement({ planet: "lilith", sign: "virgo", house: 4, voice: "Alex" });
  assert.equal(exactLilithFriend.parts.length, 2, `${rendererName} Friend placement must continue using reusable sign and house sources.`);
  assert.notEqual(exactLilithFriend.templateKey, exactLilithVirgoFourth.contentKey);

  const exactLilithAries = renderPlacement({ planet: "lilith", sign: "aries", house: 4, voice: "you" });
  assert.equal(exactLilithAries.headline, "Lilith in Aries in the 4th house");
  assert.deepEqual(exactLilithAries.parts, [exactLilithAriesFourth.body]);
  assert.deepEqual(exactLilithAries.partKeys, [exactLilithAriesFourth.contentKey]);
  assert.equal(exactLilithAries.templateKey, exactLilithAriesFourth.contentKey);
  assert.equal(exactLilithAries.provenanceTier, "exact-owner-approved");

  const exactLilithAriesFriend = renderPlacement({ planet: "lilith", sign: "aries", house: 4, voice: "Alex" });
  assert.equal(exactLilithAriesFriend.parts.length, 2, `${rendererName} Friend placement must continue using reusable sign and house sources.`);
  assert.notEqual(exactLilithAriesFriend.templateKey, exactLilithAriesFourth.contentKey);

  const exactLilithTaurus = renderPlacement({ planet: "lilith", sign: "taurus", house: 4, voice: "you" });
  assert.equal(exactLilithTaurus.headline, "Lilith in Taurus in the 4th house");
  assert.deepEqual(exactLilithTaurus.parts, [exactLilithTaurusFourth.body]);
  assert.deepEqual(exactLilithTaurus.partKeys, [exactLilithTaurusFourth.contentKey]);
  assert.equal(exactLilithTaurus.templateKey, exactLilithTaurusFourth.contentKey);
  assert.equal(exactLilithTaurus.provenanceTier, "exact-owner-approved");

  const exactLilithTaurusFriend = renderPlacement({ planet: "lilith", sign: "taurus", house: 4, voice: "Alex" });
  assert.equal(exactLilithTaurusFriend.parts.length, 2, `${rendererName} Friend placement must continue using reusable sign and house sources.`);
  assert.notEqual(exactLilithTaurusFriend.templateKey, exactLilithTaurusFourth.contentKey);

  const exactLilithGemini = renderPlacement({ planet: "lilith", sign: "gemini", house: 4, voice: "you" });
  assert.equal(exactLilithGemini.headline, "Lilith in Gemini in the 4th house");
  assert.deepEqual(exactLilithGemini.parts, [exactLilithGeminiFourth.body]);
  assert.deepEqual(exactLilithGemini.partKeys, [exactLilithGeminiFourth.contentKey]);
  assert.equal(exactLilithGemini.templateKey, exactLilithGeminiFourth.contentKey);
  assert.equal(exactLilithGemini.provenanceTier, "exact-owner-approved");

  const exactLilithGeminiFriend = renderPlacement({ planet: "lilith", sign: "gemini", house: 4, voice: "Alex" });
  assert.equal(exactLilithGeminiFriend.parts.length, 2, `${rendererName} Friend placement must continue using reusable sign and house sources.`);
  assert.notEqual(exactLilithGeminiFriend.templateKey, exactLilithGeminiFourth.contentKey);

  const exactLilithCancer = renderPlacement({ planet: "lilith", sign: "cancer", house: 4, voice: "you" });
  assert.equal(exactLilithCancer.headline, "Lilith in Cancer in the 4th house");
  assert.deepEqual(exactLilithCancer.parts, [exactLilithCancerFourth.body]);
  assert.deepEqual(exactLilithCancer.partKeys, [exactLilithCancerFourth.contentKey]);
  assert.equal(exactLilithCancer.templateKey, exactLilithCancerFourth.contentKey);
  assert.equal(exactLilithCancer.provenanceTier, "exact-owner-approved");

  const exactLilithCancerFriend = renderPlacement({ planet: "lilith", sign: "cancer", house: 4, voice: "Alex" });
  assert.equal(exactLilithCancerFriend.parts.length, 2, `${rendererName} Friend placement must continue using reusable sign and house sources.`);
  assert.notEqual(exactLilithCancerFriend.templateKey, exactLilithCancerFourth.contentKey);

  const exactLilithLeo = renderPlacement({ planet: "lilith", sign: "leo", house: 4, voice: "you" });
  assert.equal(exactLilithLeo.headline, "Lilith in Leo in the 4th house");
  assert.deepEqual(exactLilithLeo.parts, [exactLilithLeoFourth.body]);
  assert.deepEqual(exactLilithLeo.partKeys, [exactLilithLeoFourth.contentKey]);
  assert.equal(exactLilithLeo.templateKey, exactLilithLeoFourth.contentKey);
  assert.equal(exactLilithLeo.provenanceTier, "exact-owner-approved");

  const exactLilithLeoFriend = renderPlacement({ planet: "lilith", sign: "leo", house: 4, voice: "Alex" });
  assert.equal(exactLilithLeoFriend.parts.length, 2, `${rendererName} Friend placement must continue using reusable sign and house sources.`);
  assert.notEqual(exactLilithLeoFriend.templateKey, exactLilithLeoFourth.contentKey);

  const exactLilithScorpio = renderPlacement({ planet: "lilith", sign: "scorpio", house: 4, voice: "you" });
  assert.equal(exactLilithScorpio.headline, "Lilith in Scorpio in the 4th house");
  assert.deepEqual(exactLilithScorpio.parts, [exactLilithScorpioFourth.body]);
  assert.deepEqual(exactLilithScorpio.partKeys, [exactLilithScorpioFourth.contentKey]);
  assert.equal(exactLilithScorpio.templateKey, exactLilithScorpioFourth.contentKey);
  assert.equal(exactLilithScorpio.provenanceTier, "exact-owner-approved");

  const exactLilithScorpioFriend = renderPlacement({ planet: "lilith", sign: "scorpio", house: 4, voice: "Alex" });
  assert.equal(exactLilithScorpioFriend.parts.length, 2, `${rendererName} Friend placement must continue using reusable sign and house sources.`);
  assert.notEqual(exactLilithScorpioFriend.templateKey, exactLilithScorpioFourth.contentKey);

  const you = renderPlacement({ planet: "moon", sign: "scorpio", house: 6, voice: "you" });
  assert.deepEqual(
    you.parts,
    [expectedSignBody, expectedRenderedMoonHouseBody],
    `${rendererName} You placement must preserve both approved exact rows in sign-then-house order.`
  );
  assert.deepEqual(
    you.partKeys,
    [
      "fallback-hook/natal-you-placement-sign-final/moon/scorpio",
      "fallback-hook/natal-you-placement-house-final/moon/6"
    ],
    `${rendererName} You placement must expose per-section provenance.`
  );

  const friend = renderPlacement({ planet: "moon", sign: "scorpio", house: 6, voice: "Alex" });
  assert.equal(friend.parts.length, 2, `${rendererName} Friend placement must retain sign and house sections.`);
  assert.deepEqual(
    friend.partKeys,
    ["fallback-template/natal.planet-in-sign", "fallback-template/natal.house-context"],
    `${rendererName} Friend placement must expose its composed sign and house provenance.`
  );
  assert.doesNotMatch(friend.body, /\byou(?:r|rs|self)?\b/iu, `${rendererName} Friend placement must not leak second person.`);

  const mercuryYou = renderPlacement({ planet: "mercury", sign: "pisces", house: 10, voice: "you" });
  assert.equal(mercuryYou.parts[0], expectedMercurySignBody);
  assert.match(mercuryYou.parts[1], /\bCommunicating\b/u, `${rendererName} composed house copy must retain Mercury-specific manifestation text.`);
  assert.match(mercuryYou.parts[1], /\b10th house\b/u, `${rendererName} composed house copy must name the 10th house.`);
  assert.deepEqual(
    mercuryYou.partKeys,
    ["fallback-hook/placement-sign-lived/mercury/pisces", "fallback-template/natal.house-context"],
    `${rendererName} Mercury-in-Pisces placement must expose exact per-section provenance.`
  );

  const sunNinth = renderPlacement({ planet: "sun", sign: "aquarius", house: 9, voice: "you" });
  assert.equal(sunNinth.parts.at(-1), expectedRenderedSunNinthHouseBody);
  assert.equal(sunNinth.partKeys?.at(-1), "fallback-hook/placement-house-lived/sun/9");
  assert.equal(
    natalPlacementReaderSectionCopy(sunNinth.parts.at(-1), sunNinth.partKeys?.at(-1)),
    expectedRenderedSunNinthHouseBody.replace(/\s+/gu, " ").trim(),
    `${rendererName} app normalization must retain the complete approved Sun-in-9th-house section.`
  );
}

const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
assert.doesNotMatch(
  appSource,
  /if \(rendered\.templateKey\.startsWith\("fallback-hook\/placement-house-lived\/"\)\)/u,
  "The app must not collapse an exact house result into a house-only placement article."
);
assert.match(appSource, /rendered\.partKeys\?\.\[index\]/u, "The app must retain per-section placement provenance.");
assert.match(appSource, /const housePartKey = rendered\.partKeys\?\.\[1\]/u, "The app must classify the house section from its own key.");
assert.match(
  appSource,
  /natalPlacementReaderSectionCopy\([\s\S]*?rendered\.partKeys\?\.\[index\]/u,
  "The app must preserve complete owner-approved final placement sections at its reader boundary."
);
assert.match(
  appSource,
  /fallback-hook\/natal-you-placement-house-final\//u,
  "The app must classify the final Moon house row as exact house copy."
);
assert.match(
  appSource,
  /activePlacementRouteId,\s*fallbackArchitectureV3Version,\s*generatedContent,/u,
  "An open natal placement must refresh after its deferred exact-copy bundle loads."
);

fallbackRuntime.installFallbackArchitectureV3Bundle({
  transitLib: { authoredCards: [] },
  templatesFile: { templates: [] },
  rowsFile: { hookRows: [], vocabularyRows: [] }
});
await fallbackRuntime.loadDeferredFallbackArchitectureV3Bundle();
const dashboardHydratedExactLilith = fallbackRuntime.fallbackRendererV3.renderNatalPlacement({
  planet: "lilith",
  sign: "virgo",
  house: 4,
  voice: "you"
});
assert.equal(
  dashboardHydratedExactLilith.templateKey,
  exactLilithVirgoFourth.contentKey,
  "CMS hydration must layer over, not replace, the bundled exact natal-placement source."
);
assert.deepEqual(dashboardHydratedExactLilith.parts, [exactLilithVirgoFourth.body]);

console.log(
  `Natal placement truncation QA passed: ${governedPlacementRows.length} governed rows, `
  + `${multiParagraphPlacementRows.length} multi-paragraph rows, Node/browser/shipped-dist parity, `
  + "and the complete approved Sun 9th-house route."
);
