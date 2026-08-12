import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderNatalPlacement as renderNodePlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import { createFallbackRenderer } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));

const templates = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const rows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const interim = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json");

templates.templates.push(...interim.templates);
rows.vocabularyRows.push(...interim.vocabularyRows);

const renderBrowserPlacement = createFallbackRenderer(templates, rows).renderNatalPlacement;
const expectedSignBody = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/placement-sign-lived/moon/scorpio"
)?.body;
const expectedHouseBody = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/placement-house-lived/moon/6"
)?.body;
const expectedMercurySignBody = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/placement-sign-lived/mercury/pisces"
)?.body;
const expectedTenthHouseBody = rows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/house-lived/10"
)?.body;

assert.ok(expectedSignBody, "Moon-in-Scorpio approved sign copy must exist.");
assert.ok(expectedHouseBody, "Moon-in-6th-house approved house copy must exist.");
assert.ok(expectedMercurySignBody, "Mercury-in-Pisces approved sign copy must exist.");
assert.ok(expectedTenthHouseBody, "Approved 10th-house copy must exist.");

for (const [rendererName, renderPlacement] of [
  ["Node", renderNodePlacement],
  ["browser", renderBrowserPlacement]
]) {
  const you = renderPlacement({ planet: "moon", sign: "scorpio", house: 6, voice: "you" });
  assert.deepEqual(
    you.parts,
    [expectedSignBody, expectedHouseBody],
    `${rendererName} You placement must preserve both approved exact rows in sign-then-house order.`
  );
  assert.deepEqual(
    you.partKeys,
    [
      "fallback-hook/placement-sign-lived/moon/scorpio",
      "fallback-hook/placement-house-lived/moon/6"
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
  assert.deepEqual(
    mercuryYou.parts,
    [expectedMercurySignBody, expectedTenthHouseBody],
    `${rendererName} Mercury-in-Pisces placement must preserve sign copy before the shared 10th-house copy.`
  );
  assert.deepEqual(
    mercuryYou.partKeys,
    ["fallback-hook/placement-sign-lived/mercury/pisces", "fallback-hook/house-lived/10"],
    `${rendererName} Mercury-in-Pisces placement must expose exact per-section provenance.`
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

console.log("natal placement sign + house composition: ok (Moon and Mercury You routes; Friend composed rows)");
