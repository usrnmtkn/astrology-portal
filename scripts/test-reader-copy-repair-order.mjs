import assert from "node:assert/strict";
import fs from "node:fs";

import {
  isGovernedReaderEligible,
  readerEligibilityReason,
  synastryReaderTier,
  transitReaderTier
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";
import {
  renderNatalAspect
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import {
  renderCalendarPhase,
  renderDailyGlance,
  renderSynastryAspect,
  renderWeeklyMoon
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const readJson = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const transit = readJson("../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const fallback = readJson("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const queue = readJson("../packages/astro-knowledge/review/reader-copy-repair-queue-2026-08-21.json");
const manifest = readJson("../apps/web/src/content/fallbackArchitectureV3/bundled-manifest-v3.json");
const app = fs.readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
const browserFallback = fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts", import.meta.url), "utf8");

const transitRows = transit.authoredCards.filter((row) => row.contentKey.startsWith("authored/transit-"));
const exactTransitRows = transitRows.filter((row) => row.approval?.approvalLevel === "exact_owner_approved");
const legacyTransitRows = transitRows.filter((row) => transitReaderTier(row) === "legacy-reviewed");
assert.equal(transitRows.length, 1588);
assert.equal(exactTransitRows.length, 24);
assert.equal(legacyTransitRows.length, 1564);
assert.ok(exactTransitRows.every((row) => isGovernedReaderEligible(row)));
assert.ok(legacyTransitRows.every((row) => isGovernedReaderEligible(row)));

const calendarRows = transit.authoredCards.filter((row) => row.contentKey.startsWith("authored/calendar-weekly-moon/"));
assert.equal(calendarRows.length, 36);
assert.ok(calendarRows.every((row) => isGovernedReaderEligible(row)));

const dailyRows = fallback.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/daily-"));
assert.equal(dailyRows.length, 136);
assert.ok(dailyRows.every((row) => isGovernedReaderEligible(row)));

const synastryRows = fallback.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/synastry-pair/"));
assert.equal(synastryRows.filter((row) => isGovernedReaderEligible(row)).length, 483);
assert.equal(synastryRows.filter((row) => synastryReaderTier(row) === "exact-owner-approved").length, 55);
assert.equal(synastryRows.filter((row) => synastryReaderTier(row) === "owner-approved-grouped").length, 110);
assert.equal(synastryRows.filter((row) => synastryReaderTier(row) === "legacy-reviewed").length, 318);
assert.equal(
  manifest.keys.filter((key) => /synastry-pair\/.+\/(?:hard|soft)$/u.test(key)).length,
  322
);

const sunVirgo = fallback.hookRows.find((row) => row.contentKey === "fallback-hook/sky-sign-copy/sun/virgo");
assert.ok(sunVirgo);
assert.equal(readerEligibilityReason(sunVirgo), "known-current-contract-failure");

const exactNatal = renderNatalAspect({
  planetA: "sun",
  aspect: "square",
  planetB: "moon",
  voice: "you"
});
assert.equal(exactNatal.templateKey, "fallback-hook/natal-aspect-lived/sun/square/moon");
assert.ok(exactNatal.body.length > 0);
const genericNatal = renderNatalAspect({ planetA: "mars", aspect: "sextile", planetB: "pluto", voice: "you" });
assert.equal(genericNatal.templateKey, "fallback-hook/aspect-lived/sextile");
assert.equal(genericNatal.provenanceTier, "legacy-reviewed");
assert.ok(genericNatal.body.length > 0);
assert.doesNotMatch(browserFallback, /That's your/iu);

function assertRenderedOutputBoundary(body, label) {
  assert.doesNotMatch(body, /\{\{[^}]+\}\}/u, `${label}: unresolved template slot`);
  const paragraphs = body
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim().replace(/\s+/gu, " ").toLowerCase())
    .filter(Boolean);
  assert.equal(new Set(paragraphs).size, paragraphs.length, `${label}: repeated paragraph`);
}

const exactNatalRows = fallback.hookRows.filter((row) => (
  row.contentKey.startsWith("fallback-hook/natal-aspect-lived/")
  && isGovernedReaderEligible(row)
));
for (const row of exactNatalRows) {
  const [, , planetA, aspect, planetB] = row.contentKey.split("/");
  const rendered = renderNatalAspect({ planetA, aspect, planetB, voice: "you" });
  assert.equal(rendered.templateKey, row.contentKey);
  assertRenderedOutputBoundary(rendered.body, row.contentKey);
}

const exactSynastry = synastryRows.find((row) => (
  isGovernedReaderEligible(row)
  && row.contentKey.endsWith("/conjunction")
));
assert.ok(exactSynastry);
const [, , first, second] = exactSynastry.contentKey.split("/");
const renderedSynastry = renderSynastryAspect({
  planetA: first,
  planetB: second,
  aspect: "conjunction",
  otherName: "Alex",
  otherPronouns: { subject: "she", object: "her", possessive: "her" },
  romanticAllowed: false,
  relationshipType: "friend"
});
assert.equal(renderedSynastry.contentKey, exactSynastry.contentKey);
assert.equal(renderedSynastry.synastryTier, "exact-owner-approved");
assertRenderedOutputBoundary(renderedSynastry.body, exactSynastry.contentKey);
const groupedSynastry = renderSynastryAspect({ planetA: first, planetB: second, aspect: "square", otherName: "Alex" });
assert.match(groupedSynastry.contentKey, /\/hard$/u);
assert.ok(["owner-approved-grouped", "legacy-reviewed"].includes(groupedSynastry.synastryTier));
assertRenderedOutputBoundary(groupedSynastry.body, groupedSynastry.contentKey);

const legacyDaily = renderDailyGlance({ natal: "sun", aspect: "square", dateKey: "2026-08-21", userId: "qa" });
assert.ok(legacyDaily.body.length > 0);

const legacyCalendar = renderWeeklyMoon({ sign: "aquarius", variant: 2 });
assert.match(legacyCalendar.contentKey, /^authored\/calendar-weekly-moon\//u);
assert.ok(legacyCalendar.body.length > 0);

assert.equal(queue.ownerApproved, false);
assert.equal(queue.promotionAuthorized, false);
assert.equal(queue.skyAspectGaps.length, 4);
assert.match(app, /layer: "generated",\s+tier: "generated-sky-placement-lint-v1"/u);
assert.match(app, /exact-owner-approved-natal-aspect-v1/u);
assert.match(app, /legacy-reviewed-transit-continuity-v1/u);
assert.doesNotMatch(app, /void friendPronouns/u);
assert.doesNotMatch(app, /void romanticAllowed/u);

console.log("reader copy repair order: ok (provenance, registers, source gaps, and page-layer labels)");
