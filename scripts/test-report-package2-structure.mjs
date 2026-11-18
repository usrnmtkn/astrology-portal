import assert from "node:assert/strict";
import fs from "node:fs";
import { buildGeneralYearReviewedReportDocument, validateGeneralYearReviewedReportDocument } from "../api/_lib/report-review-document-general-year.ts";
import { chartEarnedDomainEvidence } from "../api/_lib/report-structure.ts";
import { reportKeyDateEventManifest } from "../api/_lib/report-key-dates.ts";
import { reportSeasonContracts } from "../api/_lib/report-season-contract.ts";
import { reportUnitIds } from "../api/_lib/report-unit-order.ts";
import { REPORT_DRAFT_SCHEMA, REPORT_GENERAL_YEAR_DRAFT_SCHEMA, reportDraftSchemaForPayload } from "../api/_lib/report-writer-chain.ts";

const facts = JSON.parse(fs.readFileSync(new URL("./fixtures/synthetic-report-package2-facts.json", import.meta.url), "utf8"));
const unitIds = reportUnitIds("general", "12_months");
const seasons = reportSeasonContracts(facts);
const seasonById = new Map(seasons.map((season) => [season.unitId, season]));
const manifest = reportKeyDateEventManifest(facts, "12_months");

const generalCategorySchema = REPORT_GENERAL_YEAR_DRAFT_SCHEMA.properties.keyDates.items.properties.category;
const deepDiveCategorySchema = REPORT_DRAFT_SCHEMA.properties.keyDates.items.properties.category;
assert.deepEqual(generalCategorySchema, { type: "string", enum: ["SELF", "WORK", "FRIENDS & FAMILY", "SEX & LOVE"] });
assert.ok(!generalCategorySchema.enum.includes(null));
assert.ok(deepDiveCategorySchema.enum.includes(null));
assert.equal(reportDraftSchemaForPayload({ reportDomain: "general", reportHorizon: "12_months" }), REPORT_GENERAL_YEAR_DRAFT_SCHEMA);
assert.equal(reportDraftSchemaForPayload({ reportDomain: "personal_health", reportHorizon: "12_months" }), REPORT_DRAFT_SCHEMA);

const selectedKeyDates = manifest.filter((event) => event.factorId !== "jupiter-trine-neptune");
assert.equal(selectedKeyDates.length, 19, "The benchmark-derived General contract renders 19 chapter-local key dates.");

const headingById = {
  overview: "FIXTURE_ONLY_OVERVIEW",
  "year-theme": "WHAT 2026 IS ABOUT",
  "domain:main": "CREATIVITY, PLEASURE, LOVE, AND PERSONAL PROJECTS",
  "winter-current": "WINTER 2026",
  spring: "SPRING 2026: THE OLD ROLE MAY STOP FITTING",
  summer: "SUMMER 2026: WRITING, LEARNING, AND PUTTING YOUR IDEAS INTO CIRCULATION",
  autumn: "AUTUMN 2026: MAKE THE PLAN WORK IN REAL LIFE",
  "review-current-year": "2026 IN REVIEW",
  "winter-next": "WINTER 2027: CAREER DECISIONS BECOME CONCRETE"
};
const units = unitIds.map((unitId) => {
  const season = seasonById.get(unitId);
  const keyDates = season
    ? selectedKeyDates.filter((event) => event.sourceUnitId === unitId).map((event, index) => ({
      eventId: event.eventId,
      title: `FIXTURE ONLY DATE ${index + 1}`,
      category: "SELF",
      sentence: "FIXTURE_ONLY_KEY_DATE_SENTENCE."
    }))
    : [];
  return {
    unitId,
    draft: {
      headline: headingById[unitId],
      summary: "",
      body: `FIXTURE_ONLY_${unitId.toUpperCase().replace(/[^A-Z0-9]+/gu, "_")}_BODY`,
      action: unitId === "overview" ? "protect your time for the work that needs quiet." : "",
      timing: season?.dateRange ?? "",
      sections: [],
      keyDates
    },
    ...(unitId === "domain:main" ? { sourceSnapshot: { sectionSelectionEvidence: chartEarnedDomainEvidence(facts) } } : {})
  };
});

assert.deepEqual(units.map((unit) => unit.unitId), unitIds);
const document = buildGeneralYearReviewedReportDocument({
  id: "fixture-package-2", reportDomain: "general", reportHorizon: "12_months",
  periodStart: "2026-02-18", periodEnd: "2027-02-17", factsEngine: "fixture", factsHash: "fixture-hash",
  facts, readerProfile: { handle: "project-author", displayName: "Project Author" }, units
});
assert.throws(() => buildGeneralYearReviewedReportDocument({
  id: "fixture-no-handle", reportDomain: "general", reportHorizon: "12_months",
  periodStart: "2026-02-18", periodEnd: "2027-02-17", factsEngine: "fixture", factsHash: "fixture-hash",
  facts, readerProfile: { handle: "", displayName: "Project Author" }, units
}), /REPORT_PROFILE_HANDLE_REQUIRED/u);

assert.equal(validateGeneralYearReviewedReportDocument(document, facts), true);
assert.equal(document.cover.title, "YOUR YEAR AHEAD REPORT");
assert.equal(document.cover.handleLine, "@project-author, protect your time for the work that needs quiet.");
assert.equal(document.cover.glyphLine, "☉ Aquarius · ☽ Scorpio · ↑ Gemini");
assert.equal(document.cover.periodLine, "Feb 18, 2026 - Feb 17, 2027");
assert.equal(document.chapters[0].title, "2026 OVERVIEW");
assert.equal(document.chapters.find((chapter) => chapter.id === "year-theme")?.attributionText, "Libra rises in your Solar Return chart and falls in your natal 5th house. Solar Return Venus is exalted in Pisces in your natal 10th house. At 47, you are in a 12th-house profection year with Venus as Lord of the Year.");
assert.equal(document.chapters.find((chapter) => chapter.id === "domain:main")?.attributionText, "In your Solar Return chart for 2026, Sun, Mars, and Pluto fall in your 5th house of creativity, pleasure, dating, and personal projects.");
assert.deepEqual(document.chapters.map((chapter) => chapter.id), unitIds);
assert.equal(document.keyDates.length, 0);
assert.equal(document.chapters.flatMap((chapter) => chapter.keyDates ?? []).length, 19);
assert.deepEqual(document.chapters.filter((chapter) => chapter.attributionText?.startsWith("During this season")).map((chapter) => chapter.attributionText), [
  "During this season, Saturn and Neptune each trine your natal Jupiter (Feb 22, Feb 26). A total lunar eclipse falls on your natal Saturn (Mar 3).",
  "During this season, Uranus squares your natal Sun (Apr 14). Jupiter squares your natal Pluto (May 1) and trines your natal Uranus (May 14). Saturn makes the first of three sextiles to your natal Ascendant (May 19).",
  "During this season, Jupiter returns to its natal place (Jul 4), your Jupiter return. A solar eclipse falls in your natal 3rd house (Aug 12). A lunar eclipse falls on your natal Mercury (Aug 28). Jupiter squares your natal Moon (Aug 27) and opposes your natal Midheaven (Sep 15).",
  "During this season, Jupiter sextiles your natal Pluto (Sep 27) and trines your natal Neptune (Oct 4). Saturn, retrograde, makes its second sextile to your natal Ascendant (Oct 6). Jupiter squares your natal Uranus (Oct 9) and opposes your natal Mars (Oct 20).",
  "During this season, Jupiter retrograde opposes your natal Mars (Feb 5). A solar eclipse falls on your natal Midheaven (Feb 6). Saturn makes its third and final sextile to your natal Ascendant (Feb 10)."
]);
assert.ok(document.chapters.filter((chapter) => chapter.attributionText?.startsWith("During this season")).every((chapter) => !/\bon (?:January|February|March|April|May|June|July|August|September|October|November|December) \d+/u.test(chapter.attributionText)));
assert.equal(document.chapters.find((chapter) => chapter.id === "winter-next")?.paragraphs[0], "Dec 21 - Feb 17");
assert.ok(document.colophon.entries.includes("FOR PROJECT AUTHOR, BORN JAN 1, 1990, 11:20 AM"));
assert.ok(document.colophon.entries.includes("Solar Return: Sun at 29°25' Aquarius, Libra rising, February 17, 2026, 8:59 PM EST."));
assert.ok(document.colophon.entries.includes("Natal: Sun 29°25' Aquarius (9th) · Moon 12°47' Scorpio (6th) · Asc 11°09' Gemini · MC 16°36' Aquarius · Mercury 7°04' Pisces · Venus 14°57' Capricorn · Mars 22°46' Aquarius · Jupiter 0°57' Leo Rx · Saturn 11°25' Virgo Rx · Uranus 20°59' Scorpio · Neptune 20°12' Sagittarius · Pluto 19°00' Libra Rx · houses whole-sign from Gemini."));
assert.ok(!JSON.stringify(document.colophon).includes("fixture-hash"));
assert.equal(document.reviewMetadata?.factsHash, "fixture-hash");

const expectFailure = (code, mutate) => {
  const changed = structuredClone(document);
  mutate(changed);
  assert.throws(() => validateGeneralYearReviewedReportDocument(changed, facts), new RegExp(code));
};
expectFailure("REPORT_STRUCTURE_SECTION_MISSING|REPORT_STRUCTURE_ORDER_MISMATCH", (value) => value.chapters.splice(1, 1));
expectFailure("REPORT_STRUCTURE_ORDER_MISMATCH", (value) => value.chapters.reverse());
expectFailure("REPORT_STRUCTURE_HEADLINE_DUPLICATED", (value) => { value.chapters[0].title = value.cover.title; });
expectFailure("REPORT_STRUCTURE_SEASON_ATTRIBUTION_COUNT", (value) => { value.chapters.find((chapter) => chapter.id === "spring").attributionText = ""; });
expectFailure("REPORT_STRUCTURE_KEY_DATES_BLOCK_MISSING", (value) => { value.chapters.find((chapter) => chapter.id === "summer").keyDates = []; });
expectFailure("REPORT_STRUCTURE_KEY_DATE_CATEGORY_INVALID", (value) => { value.chapters.find((chapter) => chapter.id === "summer").keyDates[0].category = "MONEY"; });
expectFailure("REPORT_STRUCTURE_KEY_DATE_EVENT_UNRESOLVED", (value) => { value.chapters.find((chapter) => chapter.id === "summer").keyDates[0].eventId = "missing"; });
expectFailure("REPORT_STRUCTURE_KEY_DATE_OUT_OF_SEASON", (value) => { value.chapters.find((chapter) => chapter.id === "winter-current").keyDates[0].eventId = value.chapters.find((chapter) => chapter.id === "summer").keyDates[0].eventId; });
expectFailure("REPORT_STRUCTURE_GLOBAL_KEY_DATES_FORBIDDEN", (value) => value.keyDates.push(value.chapters.find((chapter) => chapter.id === "summer").keyDates[0]));

console.log("Report package 2 production structure contract passed.");
