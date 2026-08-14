import assert from "node:assert/strict";
import fs from "node:fs";
import { canonicalReportEvents } from "../api/_lib/report-events.ts";
import { reportSeasonContracts } from "../api/_lib/report-season-contract.ts";
import { reportUnitScopeRange } from "../api/_lib/report-unit-scope.ts";
import { buildReviewedReportDocument, resolveReviewedDeliveryBytes, reviewedReportDocumentBytes, reviewedReportDocumentHash } from "../api/_lib/report-review-document.ts";

const facts = JSON.parse(fs.readFileSync(new URL("./fixtures/marie-report-frozen-facts.json", import.meta.url), "utf8"));
const seasons = reportSeasonContracts(facts);
assert.equal(seasons.length, 5);
for (const season of seasons) {
  const payload = { unit: { unitId: season.unitId }, frozenFacts: facts };
  assert.deepEqual(reportUnitScopeRange(payload), { start: season.startMs, end: season.endMs }, `${season.unitId} scope and display must use the same calculation-service period.`);
  const displayEnd = new Date(season.endsAt);
  if (season.unitId === "winter-next") displayEnd.setUTCDate(displayEnd.getUTCDate() - 1);
  assert.equal(season.dateRange, `${new Date(season.startsAt).toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} - ${displayEnd.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`);
}

const saturn = canonicalReportEvents(facts).filter((event) => event.factorId === "saturn-sextile-ascendant");
assert.deepEqual(saturn.map((event) => [event.date, event.natalHouse, event.motion, event.passNumber, event.passCount]), [
  ["2026-05-19", 1, "direct", 1, 3], ["2026-10-06", 1, "retrograde", 2, 3], ["2027-02-10", 1, "direct", 3, 3]
]);
assert.ok(saturn.every((event) => event.eventId.includes(event.date) && event.eventId.includes(`pass-${event.passNumber}-of-3`)));

const units = [
  { unitId: "overview", draft: { headline: "FIXTURE_ONLY_OVERVIEW", summary: "FIXTURE_ONLY_SUBTITLE", body: "FIXTURE_ONLY_OVERVIEW_BODY" } },
  { unitId: "year-theme", draft: { headline: "FIXTURE_ONLY_THEME", summary: "", timing: "Feb 18 - Feb 18", body: "FIXTURE_ONLY_THEME_BODY", sections: [] } },
  { unitId: "key-dates", draft: { headline: "KEY DATES", body: "**MAY 19 · FIXTURE ONLY TITLE** · FIXTURE_ONLY_SENTENCE. · *Saturn sextiles your natal Ascendant in your natal 1st house, pass 1 of 3 (direct).*", sections: [] } }
];
const reviewed = buildReviewedReportDocument({ id: "fixture-report", reportDomain: "general", reportHorizon: "12_months", periodStart: "2026-02-18", periodEnd: "2027-02-17", factsEngine: "fixture", factsHash: "fixture-hash", units });
assert.equal(reviewed.chapters[0].id, "overview");
assert.deepEqual(reviewed.chapters[0].paragraphs, ["FIXTURE_ONLY_OVERVIEW_BODY"]);
assert.equal(reviewed.keyDates.length, 1);
assert.equal(reviewed.keyDates[0].date, "MAY 19");
const reviewedBytes = JSON.stringify(reviewed);
const deliveredBytes = JSON.stringify(resolveReviewedDeliveryBytes(reviewedReportDocumentBytes(reviewed), reviewedReportDocumentHash(reviewed)));
assert.equal(deliveredBytes, reviewedBytes, "The client delivery document must be byte-identical to the reviewed assembly artifact.");

console.log("Report package 1 facts/delivery contract passed.");
