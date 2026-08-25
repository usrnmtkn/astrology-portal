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
const browserRenderer = createFallbackRenderer(templates, rows);

const natalAspectRows = rows.hookRows
  .filter((row) => row.contentKey.startsWith("fallback-hook/natal-aspect-lived/"))
  .sort((a, b) => a.contentKey.localeCompare(b.contentKey));
assert.equal(natalAspectRows.length, 242, "The protected exact natal-aspect calibration set must contain the 241-row baseline plus the owner-approved Sun square Ascendant row.");
assert.ok(natalAspectRows.every((row) => row.review_status === "approved"));
assert.ok(natalAspectRows.every((row) => row.approval?.approvalLevel === "exact_owner_approved"));
assert.ok(natalAspectRows.every((row) => row.reader_only === true && row.render_policy === "reader-only-exact-lived-v1"));

const sunSquareAscendantKey = "fallback-hook/natal-aspect-lived/sun/square/ascendant";
const baselineNatalAspectRows = natalAspectRows.filter((row) => row.contentKey !== sunSquareAscendantKey);
assert.equal(baselineNatalAspectRows.length, 241, "The pre-existing exact natal-aspect calibration set must remain intact.");

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
  "63b47f1b808d136ea53b0f74172aa3c3f0b5350df1c6dc44a520f5a7229643d1",
  "Approved natal-aspect bodies or provenance changed outside owner approval."
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
assert.equal(sunSquareAscendant.body, sunSquareAscendantApproval.payload.body);
assert.equal(sunSquareAscendant.approval.payloadSha256, sunSquareAscendantApproval.payloadSha256);

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
  assert.equal(rendered.body, sunSquareAscendant.body, `${name} must serve the owner-authored Sun square Ascendant wording verbatim on You.`);
  assert.equal(rendered.templateKey, sunSquareAscendant.contentKey);
  assert.throws(
    () => renderAspect({ planetA: "sun", aspect: "square", planetB: "ascendant", voice: "Alex" }),
    /SOURCE_GAP: natal aspect pair/u,
    `${name} must keep Friend fail-closed until separately authored observer-position wording exists.`
  );
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

console.log("natal exact-copy routing: ok (241-row frozen baseline plus owner-approved Sun square Ascendant, dashboard hook lane, contextual house bridges, matching subgroup labels)");
