import assert from "node:assert/strict";
import fs from "node:fs";
import { buildGeneralYearReviewedReportDocument, validateGeneralYearReviewedReportDocument } from "../api/_lib/report-review-document-general-year.ts";
import { chartEarnedDomainEvidence } from "../api/_lib/report-structure.ts";
import { reportKeyDateEventManifest } from "../api/_lib/report-key-dates.ts";
import { reportUnitIds } from "../api/_lib/report-unit-order.ts";
import { REPORT_DRAFT_SCHEMA, REPORT_GENERAL_YEAR_DRAFT_SCHEMA, reportDraftSchemaForPayload } from "../api/_lib/report-writer-chain.ts";

const facts = JSON.parse(fs.readFileSync(new URL("./fixtures/marie-report-frozen-facts.json", import.meta.url), "utf8"));
const benchmark = fs.readFileSync(new URL("../artifacts/marie-satori-year-ahead-2026-FINAL.md", import.meta.url), "utf8");
const headingMap = new Map([
  ["2026 overview", "overview"], ["What 2026 is about", "year-theme"],
  ["Creativity, pleasure, love, and personal projects", "domain:main"],
  ["WINTER 2026", "winter-current"],
  ["SPRING 2026: The old role may stop fitting", "spring"],
  ["SUMMER 2026: Writing, learning, and putting your ideas into circulation", "summer"],
  ["AUTUMN 2026: Make the plan work in real life", "autumn"],
  ["2026 IN REVIEW", "review-current-year"],
  ["WINTER 2027: Career decisions become concrete", "winter-next"]
]);
const generalCategorySchema = REPORT_GENERAL_YEAR_DRAFT_SCHEMA.properties.keyDates.items.properties.category;
const deepDiveCategorySchema = REPORT_DRAFT_SCHEMA.properties.keyDates.items.properties.category;
assert.deepEqual(generalCategorySchema, { type: "string", enum: ["SELF", "WORK", "FRIENDS & FAMILY", "SEX & LOVE"] });
assert.ok(!generalCategorySchema.enum.includes(null), "General 12-month categories must be non-null at the provider schema boundary.");
assert.ok(deepDiveCategorySchema.enum.includes(null), "Deep dives retain the category-free null contract.");
assert.equal(reportDraftSchemaForPayload({ reportDomain: "general", reportHorizon: "12_months" }), REPORT_GENERAL_YEAR_DRAFT_SCHEMA);
assert.equal(reportDraftSchemaForPayload({ reportDomain: "personal_health", reportHorizon: "12_months" }), REPORT_DRAFT_SCHEMA);
const sections = [...benchmark.matchAll(/^## (.+)$/gmu)].map((match, index, matches) => ({
  heading: match[1],
  body: benchmark.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? benchmark.length).trim()
}));
const manifest = reportKeyDateEventManifest(facts, "12_months");
const byDate = new Map(manifest.map((event) => [event.dateLabel, event]));
const units = sections.flatMap((section) => {
  const unitId = headingMap.get(section.heading);
  if (!unitId) return [];
  const lines = section.body.split("\n");
  const timing = /^\*(?:Feb|Mar|Jun|Sep|Dec)\s/u.test(lines[0] ?? "") ? lines.shift().replace(/^\*|\*$/gu, "") : "";
  const keyDatesAt = lines.findIndex((line) => line === "**Key dates**");
  const proseLines = keyDatesAt >= 0 ? lines.slice(0, keyDatesAt) : [...lines];
  while (!proseLines.at(-1)?.trim()) proseLines.pop();
  if (proseLines.at(-1)?.startsWith("*") && proseLines.at(-1)?.endsWith("*")) proseLines.pop();
  const keyDates = keyDatesAt < 0 ? [] : lines.slice(keyDatesAt + 1).filter((line) => line.startsWith("- **")).map((line) => {
    const match = line.match(/^- \*\*([^·*]+) · ([^*]+)\*\* · (SELF|WORK|FRIENDS & FAMILY|SEX & LOVE) · (.+) \*([^*]+)\*$/u);
    assert.ok(match, `Benchmark key-date line must parse: ${line}`);
    const event = byDate.get(match[1].trim());
    assert.ok(event, `Benchmark key date ${match[1]} must resolve to a canonical event.`);
    return { eventId: event.eventId, title: match[2].trim(), category: match[3], sentence: match[4].trim() };
  });
  return [{ unitId, draft: {
    headline: section.heading,
    summary: "",
    body: proseLines.join("\n").trim(),
    action: unitId === "overview" ? "protect your time for the work that needs quiet." : "",
    timing,
    sections: [],
    keyDates
  }, ...(unitId === "domain:main" ? { sourceSnapshot: { sectionSelectionEvidence: chartEarnedDomainEvidence(facts) } } : {}) }];
});

assert.deepEqual(units.map((unit) => unit.unitId), reportUnitIds("general", "12_months"), "Benchmark order must equal the declared/rendered order.");
const document = buildGeneralYearReviewedReportDocument({
  id: "marie-package-2", reportDomain: "general", reportHorizon: "12_months",
  periodStart: "2026-02-18", periodEnd: "2027-02-17", factsEngine: "fixture", factsHash: "fixture-hash",
  facts, readerProfile: { handle: "mariesatori", displayName: "Marie Satori" }, units
});
assert.throws(() => buildGeneralYearReviewedReportDocument({
  id: "marie-package-2-no-handle", reportDomain: "general", reportHorizon: "12_months",
  periodStart: "2026-02-18", periodEnd: "2027-02-17", factsEngine: "fixture", factsHash: "fixture-hash",
  facts, readerProfile: { handle: "", displayName: "Marie Satori" }, units
}), /REPORT_PROFILE_HANDLE_REQUIRED/u, "A missing customer handle must fail closed before delivery; no fallback is approved.");
assert.equal(validateGeneralYearReviewedReportDocument(document, facts), true);
assert.equal(document.cover.title, "YOUR YEAR AHEAD REPORT");
assert.equal(document.cover.handleLine, "@mariesatori, protect your time for the work that needs quiet.");
assert.equal(document.cover.glyphLine, "☉ Aquarius · ☽ Scorpio · ↑ Gemini");
assert.equal(document.cover.periodLine, "Feb 18, 2026 - Feb 17, 2027");
assert.equal(document.chapters[0].title, "2026 OVERVIEW");
assert.equal(document.chapters.find((chapter) => chapter.id === "year-theme")?.attributionText, "Libra rises in your Solar Return chart and falls in your natal 5th house. Solar Return Venus is exalted in Pisces in your natal 10th house. At 47, you are in a 12th-house profection year with Venus as Lord of the Year.");
assert.equal(document.chapters.find((chapter) => chapter.id === "domain:main")?.attributionText, "In your Solar Return chart for 2026, Sun, Mars, and Pluto fall in your 5th house of creativity, pleasure, dating, and personal projects.");
assert.deepEqual(document.chapters.map((chapter) => chapter.id), reportUnitIds("general", "12_months"));
assert.equal(document.keyDates.length, 0);
assert.equal(document.chapters.flatMap((chapter) => chapter.keyDates ?? []).length, 19);
assert.deepEqual(document.chapters.filter((chapter) => chapter.attributionText?.startsWith("During this season")).map((chapter) => chapter.attributionText), [
  "During this season, Saturn and Neptune each trine your natal Jupiter (Feb 22, Feb 26). A total lunar eclipse falls on your natal Saturn (Mar 3).",
  "During this season, Uranus squares your natal Sun (Apr 14). Jupiter squares your natal Pluto (May 1) and trines your natal Uranus (May 14). Saturn makes the first of three sextiles to your natal Ascendant (May 19).",
  "During this season, Jupiter returns to its natal place (Jul 4), your Jupiter return. A solar eclipse falls in your natal 3rd house (Aug 12). A lunar eclipse falls on your natal Mercury (Aug 28). Jupiter squares your natal Moon (Aug 27) and opposes your natal Midheaven (Sep 15).",
  "During this season, Jupiter sextiles your natal Pluto (Sep 27) and trines your natal Neptune (Oct 4). Saturn, retrograde, makes its second sextile to your natal Ascendant (Oct 6). Jupiter squares your natal Uranus (Oct 9) and opposes your natal Mars (Oct 20).",
  "During this season, Jupiter retrograde opposes your natal Mars (Feb 5). A solar eclipse falls on your natal Midheaven (Feb 6). Saturn makes its third and final sextile to your natal Ascendant (Feb 10)."
]);
const seasonAttributions = document.chapters.filter((chapter) => chapter.attributionText?.startsWith("During this season")).map((chapter) => chapter.attributionText ?? "");
assert.ok(seasonAttributions.every((line) => !/\bon (?:January|February|March|April|May|June|July|August|September|October|November|December) \d+/u.test(line)), "All deterministic attribution dates, including eclipses, must use parentheticals rather than prose dates.");
assert.equal(document.chapters.find((chapter) => chapter.id === "winter-next")?.paragraphs[0], "Dec 21 - Feb 17");
assert.ok(document.colophon.entries.includes("FOR MARIE SATORI, BORN FEB 18, 1979, 11:20 AM"));
assert.ok(document.colophon.entries.includes("Solar Return: Sun at 29°25' Aquarius, Libra rising, February 17, 2026, 8:59 PM EST."));
assert.ok(document.colophon.entries.includes("Natal: Sun 29°25' Aquarius (9th) · Moon 12°47' Scorpio (6th) · Asc 11°09' Gemini · MC 16°36' Aquarius · Mercury 7°04' Pisces · Venus 14°57' Capricorn · Mars 22°46' Aquarius · Jupiter 0°57' Leo Rx · Saturn 11°25' Virgo Rx · Uranus 20°59' Scorpio · Neptune 20°12' Sagittarius · Pluto 19°00' Libra Rx · houses whole-sign from Gemini."));
assert.ok(!JSON.stringify(document.colophon).includes("fixture-hash"), "Facts engine/hash must remain internal review metadata.");
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
expectFailure("REPORT_STRUCTURE_KEY_DATE_OUT_OF_SEASON", (value) => {
  value.chapters.find((chapter) => chapter.id === "winter-current").keyDates[0].eventId = value.chapters.find((chapter) => chapter.id === "summer").keyDates[0].eventId;
});
expectFailure("REPORT_STRUCTURE_GLOBAL_KEY_DATES_FORBIDDEN", (value) => { value.keyDates.push(value.chapters.find((chapter) => chapter.id === "summer").keyDates[0]); });

const generation3 = fs.readFileSync(new URL("../artifacts/marie-satori-generation-3-client-delivery.md", import.meta.url), "utf8");
const generation3Count = [...generation3.matchAll(/^### [A-Z]{3} \d+/gmu)].length;
assert.equal(generation3Count, 22);
assert.equal(generation3Count - document.chapters.flatMap((chapter) => chapter.keyDates ?? []).length, 3, "Package 2 records the 22-to-19 benchmark volume delta without imposing a count gate.");
const rerender = fs.readFileSync(new URL("../artifacts/marie-satori-generation-3-package-2-structural-rerender.md", import.meta.url), "utf8");
assert.equal([...rerender.matchAll(/^## (?:WINTER|SPRING|SUMMER|AUTUMN)/gmu)].length, 5);
assert.equal([...rerender.matchAll(/^\*During this season,/gmu)].length, 5);
assert.equal([...rerender.matchAll(/^- \*\*[A-Z]{3} \d+/gmu)].length, 22);
assert.equal([...rerender.matchAll(/Legacy Generation 3 technical date preserved/gu)].length, 5);
assert.doesNotMatch(rerender, /^## (?:MONEY|Key dates)$/gmu);
assert.match(rerender, /^## WINTER 2027:[\s\S]*?^Dec 21 - Feb 17$/gmu);

console.log("Report package 2 benchmark-derived structure contract passed.");
