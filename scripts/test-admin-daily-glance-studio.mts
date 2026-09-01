import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  dailyGlanceContextSearchParams,
  dailyGlancePackageField,
  dailyGlancePairSearchText,
  dailyGlancePairs,
  dailyGlanceSelectorLabel
} from "../apps/admin/src/dailyGlanceAdmin.ts";

const row = (contentKey: string, bodyYou: string, bodyThey: string) => ({
  id: contentKey,
  content_key: contentKey,
  headline: null,
  summary: "Owner-approved daily source",
  body: bodyYou,
  sections: {
    packageRecord: {
      body_you: bodyYou,
      body_they: bodyThey
    }
  }
});

const rows = [
  row("fallback-hook/daily-headline/soft/mars", "Take the useful opening.", "{{personPreferredName}} may take the useful opening."),
  row("fallback-hook/daily-body/soft/mars", "Act before the moment passes.", "{{personPreferredName}} may act before the moment passes."),
  row("fallback-hook/daily-headline/house/7", "Say what the agreement needs.", "{{personPreferredName}} may say what the agreement needs."),
  row("fallback-hook/daily-body/house/7", "Make the shared expectation explicit.", "{{personPreferredName}} may make the shared expectation explicit."),
  row("fallback-hook/daily-headline/square/sun", "Incomplete source", "Incomplete friend source")
];

const pairs = dailyGlancePairs(rows);
assert.equal(pairs.length, 2, "Only complete headline and passage pairs should appear in the combined editor.");
assert.equal(pairs[0]?.label, "7th House fallback");
assert.equal(dailyGlanceSelectorLabel("soft/mars"), "Moon Soft Contact natal Mars");

const mars = pairs.find((pair) => pair.selector === "soft/mars");
assert.ok(mars, "Expected the Moon soft-contact Mars pair.");
assert.equal(dailyGlancePackageField(mars.headlineRow, "body_you"), "Take the useful opening.");
assert.match(dailyGlancePairSearchText(mars), /act before the moment passes/u, "Combined search must include passage copy.");
assert.match(dailyGlancePairSearchText(mars), /personpreferredname/u, "Combined search must include Friend copy.");

const params = dailyGlanceContextSearchParams({
  date: "2026-09-01",
  person: "Alisa P",
  timeZone: "America/Los_Angeles"
});
assert.equal(params.get("surface"), "dailyGlance");
assert.equal(params.get("startDate"), "2026-09-01");
assert.equal(params.get("endDate"), "2026-09-01");
assert.equal(params.get("timeZone"), "America/Los_Angeles", "The browser-local day boundary must reach the calculation API.");

const repoRoot = path.resolve(import.meta.dirname, "..");
const apiSource = fs.readFileSync(path.join(repoRoot, "api/admin/review-records.ts"), "utf8");
assert.match(apiSource, /selectDailyGlanceCivilDayDriver\(/u, "Content Studio must reuse the app's Daily At-a-Glance selector.");
assert.match(apiSource, /skyForDate\(date, timeZone\)/u, "The current Moon must be calculated at the requested local day boundary.");
assert.match(apiSource, /localCalculationTime: "12:00"/u, "The local civil-day calculation time should remain explicit in provenance.");

console.log("Admin Daily At-a-Glance paired editor checks passed.");
