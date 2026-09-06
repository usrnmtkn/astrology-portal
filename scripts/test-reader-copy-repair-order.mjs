import assert from "node:assert/strict";
import crypto from "node:crypto";
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
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const transit = readJson("../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const fallback = readJson("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const queue = readJson("../packages/astro-knowledge/review/reader-copy-repair-queue-2026-08-21.json");
const manifest = readJson("../apps/web/src/content/fallbackArchitectureV3/bundled-manifest-v3.json");
const lunationBoundaryOverrides = readJson("../apps/web/src/content/fallbackArchitectureV3/owner-overrides/lunation-astrology-boundary-overrides-v1.json");
const app = fs.readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
const browserFallback = fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts", import.meta.url), "utf8");

const transitRows = transit.authoredCards.filter((row) => row.contentKey.startsWith("authored/transit-"));
const exactTransitRows = transitRows.filter((row) => row.approval?.approvalLevel === "exact_owner_approved");
const legacyTransitRows = transitRows.filter((row) => transitReaderTier(row) === "legacy-reviewed");
assert.equal(transitRows.length, 1589);
assert.equal(exactTransitRows.length, 25);
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
assert.equal(sunVirgo, undefined, "The duplicate pending Sun-in-Virgo row must be removed after source repair.");

const astrologyTarotProbe = {
  contentKey: "probe/astrology/tarot",
  review_status: "approved",
  reader_content_type: "astrology",
  body: "The fourth house corresponds to The Chariot in the Major Arcana."
};
assert.equal(isGovernedReaderEligible(astrologyTarotProbe), false);
assert.equal(readerEligibilityReason(astrologyTarotProbe), "tarot-reference-in-astrology-copy");

const tarotSurfaceProbe = {
  ...astrologyTarotProbe,
  contentKey: "probe/tarot/chariot",
  reader_content_type: "tarot"
};
assert.equal(isGovernedReaderEligible(tarotSurfaceProbe), true, "An explicitly designated Tarot surface must remain possible.");
assert.equal(readerEligibilityReason(tarotSurfaceProbe), null);

const mixedProbe = {
  ...astrologyTarotProbe,
  contentKey: "probe/mixed/chariot",
  reader_content_type: "mixed"
};
assert.equal(isGovernedReaderEligible(mixedProbe), false);
assert.equal(readerEligibilityReason(mixedProbe), "mixed-astrology-tarot-owner-approval-required");

const ownerApprovedMixedProbe = {
  ...mixedProbe,
  content_boundary: { mixedOwnerApproved: true },
  approval: {
    approvalLevel: "exact_owner_approved",
    recordPath: "owner/mixed-boundary-probe",
    payloadSha256: "a".repeat(64),
    approvedAt: "2026-09-06"
  }
};
assert.equal(isGovernedReaderEligible(ownerApprovedMixedProbe), true);

const legacyUnclassifiedProbe = {
  contentKey: "legacy/unclassified/lunation",
  review_status: "approved",
  body: "The fifth house corresponds to Strength in the Major Arcana."
};
assert.equal(
  isGovernedReaderEligible(legacyUnclassifiedProbe),
  true,
  "Legacy unclassified rows remain migration-safe until an approved replacement is layered above them."
);

const virgoGeminiKey = "authored/book-ritual-and-the-moon/lunation-horoscope/new-moon/virgo/rising-gemini/house-4";
const historicalVirgoGeminiProbe = {
  contentKey: virgoGeminiKey,
  review_status: "approved",
  body: "The 4th house corresponds to The Chariot in the Major Arcana."
};
assert.equal(
  isGovernedReaderEligible(historicalVirgoGeminiProbe),
  true,
  "Historical untyped source remains intact; the exact-key owner override replaces it at reader projection time."
);

assert.equal(lunationBoundaryOverrides.schema, "lunation-astrology-boundary-overrides/v1");
assert.equal(lunationBoundaryOverrides.count, 1);
const virgoGeminiOverride = lunationBoundaryOverrides.authoredCards[0];
assert.equal(virgoGeminiOverride.contentKey, virgoGeminiKey);
assert.equal(virgoGeminiOverride.reader_content_type, "astrology");
assert.equal(isGovernedReaderEligible(virgoGeminiOverride), true);
assert.equal(sha256(virgoGeminiOverride.body), virgoGeminiOverride.protected_content.body_sha256);
assert.equal(virgoGeminiOverride.body.length, virgoGeminiOverride.protected_content.char_count);
assert.match(
  virgoGeminiOverride.body,
  /All relationships require give and take, and this New Moon can make it easier to see where the balance at home has become uneven\./u
);
assert.doesNotMatch(virgoGeminiOverride.body, /\b(?:tarot|major\s+arcana|minor\s+arcana|chariot)\b/iu);
const projectedVirgoGemini = [historicalVirgoGeminiProbe, virgoGeminiOverride]
  .reverse()
  .find((row) => isGovernedReaderEligible(row));
assert.equal(projectedVirgoGemini, virgoGeminiOverride, "Latest eligible exact-key override must win reader projection.");

const ordinaryAstrologyProbe = {
  contentKey: "probe/astrology/ordinary-card-word",
  review_status: "approved",
  reader_content_type: "astrology",
  body: "A card in the mail could change the plan while the Moon moves through Virgo."
};
assert.equal(isGovernedReaderEligible(ordinaryAstrologyProbe), true, "The word card alone must not trigger the Tarot boundary.");

const exactNatal = renderNatalAspect({
  planetA: "sun",
  aspect: "square",
  planetB: "moon",
  voice: "you"
});
assert.equal(exactNatal.templateKey, "fallback-hook/natal-aspect-lived/sun/square/moon");
assert.equal(exactNatal.provenanceTier, "exact-owner-approved");
assert.ok(exactNatal.body.length > 0);
assert.throws(
  () => renderNatalAspect({ planetA: "ceres", aspect: "sextile", planetB: "pluto", voice: "you" }),
  /SOURCE_GAP: natal aspect pair/u,
  "Generic aspect prose must not replace a missing governed natal pair."
);
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

console.log("reader copy repair order: ok (provenance, registers, source gaps, tarot boundary, and page-layer labels)");
