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
const expectedRenderedMoonHouseBody = expectedHouseBody?.replace(
  /^It's in your 6th house, meaning/u,
  "Your Moon is in your 6th house, meaning"
);
const expectedRenderedSunNinthHouseBody = `Your Sun is in your 9th house, meaning this side of you comes out through travel, study, belief, and the big questions.\n\n${expectedSunNinthHouseBody}`;

assert.ok(expectedSignBody, "Moon-in-Scorpio approved sign copy must exist.");
assert.ok(expectedHouseBody, "Moon-in-6th-house approved house copy must exist.");
assert.ok(expectedMercurySignBody, "Mercury-in-Pisces approved sign copy must exist.");
assert.ok(expectedSunNinthHouseBody, "The incremental owner-approved Sun-in-9th-house copy must exist.");

const placementReaderFamilies = [
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

assert.equal(governedPlacementRows.length, 153, "governed natal placement inventory changed; audit new rows before updating the gate");
assert.equal(multiParagraphPlacementRows.length, 143, "multi-paragraph natal placement inventory changed; audit truncation exposure before updating the gate");
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

console.log(
  `Natal placement truncation QA passed: ${governedPlacementRows.length} governed rows, `
  + `${multiParagraphPlacementRows.length} multi-paragraph rows, Node/browser/shipped-dist parity, `
  + "and the complete approved Sun 9th-house route."
);
