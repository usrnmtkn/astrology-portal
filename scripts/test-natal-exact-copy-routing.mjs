#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFallbackRenderer } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts";
import { renderNatalAspect as renderNodeAspect, renderNatalPlacement as renderNodePlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import { fallbackArchitectureV3DashboardPackageDestination } from "../apps/web/src/services/fallbackArchitectureV3DashboardPackaging.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const templates = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const rows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const sunSquareAscendantApproval = readJson("packages/astro-knowledge/review/natal-sun-square-ascendant-owner-approval-2026-08-22.json");
const angleV15BatchManifest = readJson("packages/astro-knowledge/review/angle-aspects-60-v15/shipping-manifest.json");
const friendsV1Manifest = readJson("packages/astro-knowledge/review/angle-aspects-60-friends-v1/SHIPPING-MANIFEST.json");
const friendsV1Authority = readJson("packages/astro-knowledge/review/angle-aspects-60-friends-v1/ANGLE-ASPECTS-60-FRIENDS-V1-OWNER-APPROVED.json");
const browserRenderer = createFallbackRenderer(templates, rows);

const natalAspectRows = rows.hookRows
  .filter((row) => row.contentKey.startsWith("fallback-hook/natal-aspect-lived/"))
  .sort((a, b) => a.contentKey.localeCompare(b.contentKey));
assert.equal(natalAspectRows.length, 291, "The protected exact natal-aspect set must contain 231 non-V15 rows and the 60-row V15 angle batch.");
assert.ok(natalAspectRows.every((row) => row.review_status === "approved"));
assert.ok(natalAspectRows.every((row) => row.approval?.approvalLevel === "exact_owner_approved"));
assert.ok(natalAspectRows.every((row) => row.reader_only === true && row.render_policy === "reader-only-exact-lived-v1"));

const sunSquareAscendantKey = "fallback-hook/natal-aspect-lived/sun/square/ascendant";
const angleV15BatchKeys = new Set(angleV15BatchManifest.rows.map((row) => row.contentKey));
assert.equal(angleV15BatchKeys.size, 60, "The V15 angle batch manifest must identify exactly 60 distinct content keys.");
assert.equal(natalAspectRows.filter((row) => angleV15BatchKeys.has(row.contentKey)).length, 60, "Every V15 angle batch key must be present in the exact natal-aspect set.");
const baselineNatalAspectRows = natalAspectRows.filter((row) => !angleV15BatchKeys.has(row.contentKey));
assert.equal(baselineNatalAspectRows.length, 231, "The exact natal-aspect rows outside V15 must remain intact.");

const aspectProjection = baselineNatalAspectRows.map(({
  contentKey, body, review_status, approval, governance, source_release, reader_only, render_policy
}) => ({
  contentKey,
  body,
  review_status,
  approval,
  governance: governance ?? null,
  source_release: source_release ?? null,
  reader_only,
  render_policy
}));
assert.equal(
  createHash("sha256").update(JSON.stringify(aspectProjection)).digest("hex"),
  "087d8486c7e82b66da9b5bb115114ef1e0780f36328ca7429c5a06b17e7147d1",
  "Approved natal-aspect bodies or provenance changed outside the V15 batch."
);

function dashboardDescriptor(row) {
  return {
    contentKey: row.contentKey,
    contentType: "authored-content",
    role: row.content_role
  };
}

const exactAspect = natalAspectRows.find((row) => row.contentKey === "fallback-hook/natal-aspect-lived/moon/sextile/saturn");
const sunSquareAscendant = natalAspectRows.find((row) => row.contentKey === sunSquareAscendantKey);
const exactHouse = rows.hookRows.find((row) => row.contentKey === "fallback-hook/placement-house-lived/sun/9");
assert.ok(exactAspect && exactHouse && sunSquareAscendant);
assert.equal(fallbackArchitectureV3DashboardPackageDestination(dashboardDescriptor(exactAspect)), "hook");
assert.equal(fallbackArchitectureV3DashboardPackageDestination(dashboardDescriptor(exactHouse)), "hook");
assert.equal(fallbackArchitectureV3DashboardPackageDestination(dashboardDescriptor(sunSquareAscendant)), "hook");
assert.equal(
  createHash("sha256").update(JSON.stringify(sunSquareAscendantApproval.payload)).digest("hex"),
  sunSquareAscendantApproval.payloadSha256,
  "The owner-approval record payload hash must match its exact wording."
);
assert.notEqual(sunSquareAscendant.body, sunSquareAscendantApproval.payload.body, "The explicitly authorized V15 replacement must supersede the historical Sun square Ascendant body without mutating its record.");
const v15SunSquare = angleV15BatchManifest.rows.find((row) => row.contentKey === sunSquareAscendantKey);
assert.ok(v15SunSquare, "V15 Sun square Ascendant approval is missing.");
const v15SunSquareApproval = readJson(v15SunSquare.recordPath);
assert.notEqual(sunSquareAscendant.body, v15SunSquareApproval.payload.body, "The later You supersession must not rewrite historical V15 evidence.");
const currentSunSquare = friendsV1Manifest.youRevisionRecords.find((row) => row.contentKey === sunSquareAscendantKey);
assert.ok(currentSunSquare, "The later Sun square Ascendant You supersession is missing.");
const currentSunSquareApproval = readJson(currentSunSquare.recordPath);
assert.equal(sunSquareAscendant.body, currentSunSquareApproval.payload.body);
assert.equal(sunSquareAscendant.approval.recordPath, currentSunSquare.recordPath);
assert.equal(sunSquareAscendant.approval.payloadSha256, currentSunSquare.payloadSha256);
assert.ok(sunSquareAscendant.historical_approvals.some((approval) => approval.recordPath === v15SunSquare.recordPath));

for (const [name, renderAspect] of [
  ["Node", renderNodeAspect],
  ["browser", browserRenderer.renderNatalAspect]
]) {
  const rendered = renderAspect({ planetA: "moon", aspect: "sextile", planetB: "saturn", voice: "you" });
  assert.equal(rendered.body, exactAspect.body, `${name} must prefer the exact owner-approved natal-aspect row byte-for-byte.`);
  assert.equal(rendered.templateKey, exactAspect.contentKey);
}

for (const [name, renderAspect] of [
  ["Node", renderNodeAspect],
  ["browser", browserRenderer.renderNatalAspect]
]) {
  const rendered = renderAspect({ planetA: "sun", aspect: "square", planetB: "ascendant", voice: "you" });
  assert.equal(rendered.body, sunSquareAscendant.body, `${name} must serve the exact owner-approved Sun square Ascendant supersession verbatim on You.`);
  assert.equal(rendered.templateKey, sunSquareAscendant.contentKey);
  const friendAuthority = friendsV1Authority.rows.find((row) => row.base_content_key === sunSquareAscendantKey);
  assert.ok(friendAuthority);
  const friendRendered = renderAspect({ planetA: "sun", aspect: "square", planetB: "ascendant", voice: "Alex" });
  assert.equal(friendRendered.body, friendAuthority.body.replaceAll("{{Name}}", "Alex"), `${name} must select separately authored Friends copy.`);
  assert.notEqual(friendRendered.body, rendered.body, `${name} must not expose the You body on Friends.`);
}

for (const [name, renderPlacement] of [
  ["Node", renderNodePlacement],
  ["browser", browserRenderer.renderNatalPlacement]
]) {
  const moon = renderPlacement({ planet: "moon", sign: "scorpio", house: 6, voice: "you" });
  assert.match(moon.parts[1], /^Your Moon is in your 6th house, meaning/u, `${name} Moon house copy needs a contextual bridge.`);
  assert.doesNotMatch(moon.parts[1], /\bIt's in your 6th house\b/u);
  assert.match(moon.parts[1], /One small problem can take over your whole day/u);

  const sun = renderPlacement({ planet: "sun", sign: "aquarius", house: 9, voice: "you" });
  assert.match(sun.parts[1], /^Your Sun is in your 9th house, meaning/u, `${name} exact Sun house copy needs the contextual bridge.`);
  assert.match(sun.parts[1], /Sun in the 9th house wants a worldview large enough to inhabit/u);
  assert.equal(sun.partKeys[1], exactHouse.contentKey);

  const friend = renderPlacement({ planet: "moon", sign: "capricorn", house: 12, voice: "Alex" });
  assert.match(friend.parts[1], /^Their Moon is in their 12th house, meaning/u, `${name} Friend house copy needs an explicit subject.`);
  assert.doesNotMatch(friend.parts[1], /\bIt's in their 12th house\b/u);
}

const youPage = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/you/YouPage.tsx"), "utf8");
assert.match(youPage, /label: "Planetary aspects"/u);
assert.match(youPage, /label: "Angles and points"/u);
assert.match(youPage, /article-related-aspects__group-label/u);
assert.match(
  youPage,
  /<h3 className="eyebrow section-label article-related-aspects__label article-related-aspects__group-label">/u,
  "Natal aspect subgroup labels must be semantic headings with the eyebrow treatment."
);
assert.doesNotMatch(
  youPage,
  /<span className="eyebrow section-label article-related-aspects__label article-related-aspects__group-label">/u,
  "Natal aspect subgroup labels must not fall back to non-semantic spans."
);

console.log("natal exact-copy routing: ok (231-row frozen non-V15 baseline plus 60-row V15 angle batch with governed Friends variants; dashboard hook lane; contextual house bridges; matching subgroup labels)");
