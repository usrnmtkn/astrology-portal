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
const ephemerisSource = fs.readFileSync(path.join(
  repoRoot,
  "apps/web/src/services/ephemeris.ts"
), "utf8");
const resolverSource = fs.readFileSync(path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts"
), "utf8");

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
  serviceSource,
  /headline: `Moon in \$\{title\(normalizedSign\)\} sets the emotional tone`/u,
  "The weekly headline must name the Monday Moon sign and its editorial role."
);
assert.match(
  serviceSource,
  /if \(mondayMoonTone\) \{[\s\S]*?addParagraph\(mondayMoonTone\.body\);[\s\S]*?return paragraphs\.join/u,
  "The hero must use the Monday Moon write-up without appending duplicated day-event prose."
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
  /data-weekly-moon-key=\{weeklyMondayMoonTone\?\.contentKey\}/u,
  "The weekly hero must expose the exact owner source key for QA."
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

console.log("Calendar weekly Monday-Sunday tone contract passed (12 owner sign families; rejected Cancer line excluded). ");
