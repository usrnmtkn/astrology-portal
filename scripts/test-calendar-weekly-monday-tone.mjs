#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRows = JSON.parse(fs.readFileSync(path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json"
), "utf8")).authoredCards;
const serviceSource = fs.readFileSync(path.join(
  repoRoot,
  "apps/web/src/services/weeklyHoroscope.ts"
), "utf8");
const calendarSource = fs.readFileSync(path.join(
  repoRoot,
  "apps/web/src/features/calendar/LunarCalendar.tsx"
), "utf8");
const phaseLabelSource = fs.readFileSync(path.join(
  repoRoot,
  "apps/web/src/features/calendar/calendarPhaseLabel.ts"
), "utf8");
const ephemerisSource = fs.readFileSync(path.join(
  repoRoot,
  "apps/web/src/services/ephemeris.ts"
), "utf8");
const resolverSource = fs.readFileSync(path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts"
), "utf8");
const ownerReviewCandidate = JSON.parse(fs.readFileSync(path.join(
  repoRoot,
  "packages/astro-knowledge/review/calendar-weekly-overview-2026-08-03-owner-review-candidate.json"
), "utf8"));

const signs = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
];

for (const sign of signs) {
  const row = sourceRows.find((candidate) => (
    candidate.contentKey === `authored/calendar-weekly-moon/${sign}`
  ));

  assert.ok(row, `Missing owner-authored weekly Moon row for ${sign}.`);
  assert.equal(row.review_status, "approved_reuse");
  assert.match(row.notes ?? "", /Owner-authored weekly Moon-sign tone/u);
  assert.ok((row.body ?? "").trim().split(/\s+/u).length >= 45);
}

assert.match(
  ephemerisSource,
  /const daysSinceMonday = weekdayIndex === 0 \? 6 : Math\.max\(0, weekdayIndex - 1\);/u,
  "The seven-day Calendar range must begin on Monday."
);
assert.match(
  calendarSource,
  /const daysSinceMonday = weekday === 0 \? 6 : weekday - 1;/u,
  "Calendar cache and same-week navigation must use the Monday boundary."
);

assert.match(
  serviceSource,
  /date\.getUTCDay\(\) !== 1/u,
  "The Calendar weekly tone resolver must fail closed for dates that are not Monday."
);
assert.match(
  serviceSource,
  /renderWeeklyMoon\(\{[\s\S]*?sign: normalizedSign,[\s\S]*?variant/u,
  "The Monday Moon resolver must use the approved weekly Moon renderer."
);
assert.match(
  calendarSource,
  /weeklyDayWriteups\.find\(\(\{ day \}\) => \([\s\S]*?getUTCDay\(\) === 1/u,
  "The Calendar must locate Monday rather than using the first visible Sunday."
);
assert.match(
  calendarSource,
  /mondayDateKey: weeklyMonday\.day\.dateKey,[\s\S]*?moonSign: weeklyMonday\.day\.moonSign/u,
  "The Calendar must send Monday's calculated Moon sign to the resolver."
);
assert.match(
  calendarSource,
  /const weeklyForecastHeadline = weeklyForecast\?\.weeklyHeadline/u,
  "The weekly hero must use its weekly editorial headline rather than promoting Monday's Moon label."
);
assert.match(
  calendarSource,
  /const weeklySupportingShifts = weeklyMainShifts;/u,
  "Key shifts must use the ranked, governed weekly selection."
);
assert.doesNotMatch(
  calendarSource,
  /mondayMoonTone: weeklyMondayMoonTone/u,
  "The weekly hero must not repeat Monday's Moon paragraph."
);
assert.match(
  calendarSource,
  /const weeklyForecastBody = weeklyForecast\?\.weeklyOverview \?\? "";/u,
  "The weekly hero must not assemble its body from duplicated day or event cards."
);
assert.match(
  serviceSource,
  /weeklyHeadline: authored\.weeklyHeadline!/u,
  "An approved authored weekly headline must render verbatim instead of being replaced by an event label."
);
assert.match(
  calendarSource,
  /aria-label="Key shifts"[\s\S]*?<p>Key shifts<\/p>/u,
  "The selective metadata row must be labeled Key shifts."
);
assert.match(
  calendarSource,
  /params\.set\("view", view === "week" \? "day" : view\)/u,
  "The reader-facing URL must say day when the Day view is selected."
);
assert.match(
  calendarSource,
  /className="lunar-calendar-event-pill__label">VoC \{voidLabel\}<\/span>/u,
  "Month cells must show the operative Void-of-Course time instead of an unexplained label."
);
assert.match(
  phaseLabelSource,
  /if \(day\.illumination >= 50\)[\s\S]*?Waning Gibbous[\s\S]*?Waning Crescent/u,
  "Daily phase labels must distinguish broad waning phases from the exact quarter event."
);
assert.match(
  calendarSource,
  /data-weekly-moon-key=\{weeklyMondayMoonTone\?\.contentKey\}/u,
  "The weekly hero must expose the exact owner source key for QA."
);
assert.match(
  calendarSource,
  /function calendarEventEditorialContent\(/u,
  "Day, Week, Weekly, and Month event copy must resolve through one canonical editorial-content adapter."
);
assert.ok(
  (calendarSource.match(/calendarEventEditorialContent\(/gu) ?? []).length >= 5,
  "Every Calendar view must reuse the canonical event editorial-content adapter."
);
assert.match(
  calendarSource,
  /data-content-key=\{editorial\.contentKey\}/u,
  "Rendered event cards must expose their canonical content key for cross-view QA."
);
assert.match(
  calendarSource,
  /function calendarCanonicalEventDateLine\([\s\S]*?weekday: "long",[\s\S]*?month: "long",[\s\S]*?day: "numeric"/u,
  "Every view must assemble event copy with the same absolute local date line."
);
assert.match(
  calendarSource,
  /generated\/calendar-event\/\$\{event\.type\}\/\$\{event\.id\}/u,
  "Generated event content keys must be event-specific rather than shared by an entire event type."
);
assert.match(
  calendarSource,
  /calendarAdjacentCopyIsDistinct\(candidate\.body, previousGuidanceBody\)/u,
  "Adjacent daily Moon guidance must reject substantially repeated copy."
);
assert.match(
  calendarSource,
  /const selectedPackageWeeklyMoon = selectedWeekWriteup[\s\S]*?\? selectedWeekWriteup\.guidance[\s\S]*?: selectedDay/u,
  "Day and Month must honor the same daily Moon source gap resolved by Weekly."
);
assert.match(
  resolverSource,
  /"authored\/calendar-weekly-moon\/cancer"/u,
  "The owner-rejected Cancer base card must be reader-excluded."
);
assert.match(
  resolverSource,
  /rejectedOwnerFeedbackKeys\.has\(key\)/u,
  "Weekly Moon resolution must skip content keys rejected by explicit owner feedback."
);

assert.equal(ownerReviewCandidate.reviewStatus, "needs_review");
assert.equal(ownerReviewCandidate.ownerApproved, false);
assert.equal(ownerReviewCandidate.promotionAuthorized, false);
assert.equal(ownerReviewCandidate.serving, false);
assert.equal(ownerReviewCandidate.weekStart, "2026-08-03");
assert.equal(ownerReviewCandidate.weekEnd, "2026-08-09");
assert.equal(ownerReviewCandidate.headline, "The decision may be easier than maintaining it");
assert.equal(ownerReviewCandidate.keyShifts[0], "Last Quarter Moon in Taurus");
assert.equal(ownerReviewCandidate.keyShifts.at(-1), "Mercury enters Leo");
assert.doesNotMatch(
  ownerReviewCandidate.body,
  /Chiron/u,
  "The owner-review candidate must not pull the preceding Sunday station into the Monday-Sunday week."
);

console.log("Calendar weekly synthesis contract passed (Monday-Sunday chronology, phase precision, owner candidate held for review). ");
