import assert from "node:assert/strict";
import { mergeContentInventory } from "../apps/admin/src/contentStudioState.ts";
import { calendarMonthlyCompatibilityPattern, calendarMonthlyEditorialPattern, calendarOverviewFields, calendarOverviewPattern, calendarOverviewWriting } from "../apps/admin/src/calendarOverviewTemplate.ts";
import { calendarPreviewValues, calendarResolveOverviewField, calendarTemplateSegments } from "../apps/admin/src/calendarPreviewModel.ts";
import { calendarTemplateDefinitionInputs, calendarTemplateDefinitions, validateCalendarTemplateDefinitions } from "../apps/admin/src/calendarTemplateDefinitions.ts";
import { monthlyPhraseVariable, monthlyPhraseVariables } from "../src/content-studio/monthlyPhraseVariables.ts";
const full = { id: "one", updated_at: "2026-09-07T10:00:01Z", body: "Saved owner copy", sections: { packageDraft: { body: "Revision" } } };
const inventory = { id: "one", updated_at: full.updated_at, inventory_only: true, body: "", sections: {} };
assert.deepEqual(mergeContentInventory([full], [inventory]), [full], "Inventory refresh must retain the hydrated proposal needed for publishing.");
assert.deepEqual(mergeContentInventory([full], [{ ...inventory, updated_at: "2026-09-07T10:00:00Z" }]), [full], "Late pages must not overwrite a newer save.");
const newer = { ...inventory, updated_at: "2026-09-07T10:00:02Z" };
assert.deepEqual(mergeContentInventory([full], [newer]), [newer], "A newer external version must remain visible, requiring rehydration.");
assert.deepEqual(mergeContentInventory([full], []), [full], "Partial pages must retain rows not loaded yet.");
assert.deepEqual(mergeContentInventory([full], [], false), [], "A complete reload must remove rows no longer present.");
const starter = { id: "package:authored/calendar-season-transition/virgo/libra", content_key: "authored/calendar-season-transition/virgo/libra", package_starter: true, status: "DRAFT" };
const saved = { id: "saved-season", content_key: starter.content_key, status: "LIVE", package_starter: false };
assert.deepEqual(
  mergeContentInventory([starter], [saved]).map((row) => row.id),
  ["saved-season"],
  "A saved live row must replace the unpublished package starter for the same key."
);
assert.deepEqual(
  mergeContentInventory([], [starter, saved]).map((row) => row.id),
  ["saved-season"],
  "A mixed incoming page must keep the saved row and drop the starter for the same key."
);
assert.deepEqual(
  mergeContentInventory([saved], [starter]).map((row) => row.id),
  ["saved-season"],
  "A later starter-only page must not reintroduce a draft beside the saved live row."
);

const nestedValues = (values) => Object.fromEntries(Object.entries(values).map(([name, text]) => [name, { text, kind: "fact" }]));
const templates = { monthlyOverview: "{{monthName}} brings attention to {{seasonOverview}}.", seasonOverview: "{{openingSeasonSign}}{{#hasSeasonChange}} into {{closingSeasonSign}}{{/hasSeasonChange}}" };
let nested = calendarTemplateSegments(templates.monthlyOverview, nestedValues({ monthName: "September", openingSeasonSign: "Virgo", closingSeasonSign: "Libra", hasSeasonChange: "yes" }), templates, ["monthlyOverview"]).map(segment => segment.text).join("");
assert.equal(nested, "September brings attention to Virgo into Libra.");
nested = calendarTemplateSegments(templates.monthlyOverview, nestedValues({ monthName: "September", openingSeasonSign: "Virgo", closingSeasonSign: "{{monthlyOverview}}", hasSeasonChange: "yes" }), templates, ["monthlyOverview"]).map(segment => segment.text).join("");
assert.equal(nested, "September brings attention to Virgo into {{monthlyOverview}}.", "literal facts do not execute");
const cyclic = calendarTemplateSegments("{{seasonOverview}}", {}, { monthlyOverview: "{{seasonOverview}}", seasonOverview: "{{monthlyOverview}}" }, ["monthlyOverview"]).map(segment => segment.text).join("");
assert.equal(cyclic, "{{monthlyOverview}}", "circular overview references stop at an unresolved token");
const missing = calendarTemplateSegments("{{monthName}} · {{notWrittenYet}}", nestedValues({ monthName: "September" })).map(segment => segment.text).join("");
assert.equal(missing, "September · {{notWrittenYet}}");

assert.equal(monthlyPhraseVariables.length, 11, "Monthly authoring must define the reviewed small phrase registry.");
assert.equal(new Set(monthlyPhraseVariables.map(variable => variable.name)).size, monthlyPhraseVariables.length, "Monthly phrase names must be unique.");
assert.equal(monthlyPhraseVariables.some(variable => variable.name === "monthlyFocus"), false, "The retired catch-all monthlyFocus must not return.");
assert.deepEqual(monthlyPhraseVariable("openingSeasonFocus"), {
  name: "openingSeasonFocus", grammar: "noun-phrase", source: "opening-season",
  description: "Focus of the Sun season active at month start."
});
assert.equal(monthlyPhraseVariable("leadEventOpportunity")?.grammar, "verb-phrase");
assert.equal(monthlyPhraseVariable("secondaryMonthlyThemeFocus")?.source, "edition");
assert.equal(monthlyPhraseVariables.filter(variable => variable.source === "closing-season").length, 3);

const monthlyFields = calendarOverviewFields("monthly-sky");
const monthlyStarter = monthlyFields.find(field => field.name === "monthlyOverview")?.starter;
const seasonStarter = monthlyFields.find(field => field.name === "seasonOverview")?.starter;
assert.ok(monthlyStarter && seasonStarter, "Monthly opening and season overview must expose opt-in sentence-template starters.");
const weeklyStarter = calendarOverviewFields("weekly-sky").find(field => field.name === "weeklyOverview")?.starter;
assert.ok(weeklyStarter, "Weekly overview must expose an opt-in Monday Moon-tone starter.");
assert.match(weeklyStarter, /\{\{mondayMoonSign\}\}/);
assert.match(weeklyStarter, /\{\{mondayWriteup\}\}/);
assert.equal(weeklyStarter.includes("{{weeklyFocus}}"), false);
assert.equal(calendarOverviewWriting({ calendarOverview: { weeklyOverview: "Existing owner weekly passage" } }).weeklyOverview, "Existing owner weekly passage", "Existing weekly prose remains until the owner opts into a starter.");
assert.equal(monthlyStarter.includes("{{monthlyFocus}}"), false, "The monthly starter must not reintroduce the catch-all monthlyFocus.");
assert.match(monthlyStarter, /\{\{#hasMonthlyTheme\}\}/);
assert.match(monthlyStarter, /\{\{#hasSecondaryMonthlyTheme\}\}/);
assert.match(monthlyStarter, /\{\{#hasLeadEvent\}\}/);
assert.equal(calendarOverviewWriting({ calendarOverview: { monthlyOverview: "Existing owner passage" } }).monthlyOverview, "Existing owner passage", "Existing saved prose remains byte-for-byte until the owner opts into a starter.");

const monthlyFieldNames = monthlyFields.map(field => field.name);
assert.deepEqual(monthlyFieldNames.slice(0, 5), ["monthlyOverview", "seasonOverview", "lunarOverview", "transitOverview", "monthlyIntegration"]);
assert.ok(monthlyFieldNames.includes("seasonOpening") && monthlyFieldNames.includes("newMoonOverview") && monthlyFieldNames.includes("fullMoonOverview"));
assert.equal(calendarOverviewFields("weekly-sky").some(field => field.name === "seasonOpening"), false, "Weekly authoring must not gain monthly editorial fields.");
assert.equal(calendarOverviewPattern("monthly-sky"), calendarMonthlyCompatibilityPattern(), "Unsaved Monthly Sky starters use the labeled overview layout.");
assert.match(calendarMonthlyCompatibilityPattern(), /Monthly Overview/);
assert.equal(calendarMonthlyEditorialPattern().includes("Monthly Overview"), false, "The editorial layout must not add the compatibility section labels.");
assert.match(calendarMonthlyEditorialPattern(), /\{\{seasonOpening\}\}/);
assert.match(calendarMonthlyEditorialPattern(), /\{\{#hasNewMoon\}\}/);
assert.match(monthlyFields.find(field => field.name === "seasonOpening")?.starters?.map(starter => starter.value).join("\n") ?? "", /\{\{placementFocus\}\}/);
const monthlyStarterBodies = [
  monthlyStarter,
  seasonStarter,
  ...(monthlyFields.find(field => field.name === "seasonOpening")?.starters?.map(starter => starter.value) ?? []),
  ...(monthlyFields.find(field => field.name === "newMoonOverview")?.starters?.map(starter => starter.value) ?? []),
  ...(monthlyFields.find(field => field.name === "fullMoonOverview")?.starters?.map(starter => starter.value) ?? [])
].join("\n");
assert.equal(/\{\{(newMoonSign|newMoonDate|fullMoonSign|fullMoonDate|openingSeasonSign|closingSeasonSign|seasonChangeDate)\}\}/u.test(monthlyStarterBodies), false, "Monthly editorial starters use contextual names, not labeled lunation or season facts.");
assert.equal(monthlyFields.find(field => field.name === "seasonOpening")?.starters?.length, 3, "The three seasonal openings are alternatives, not stacked paragraphs.");
assert.equal(calendarOverviewWriting({ calendarOverview: { monthlyOverview: "Existing owner passage", seasonOpening: "" } }).monthlyOverview, "Existing owner passage");

const definitionSource = {
  focus: { kind: "phrase", value: "the systems that support daily life", description: "Literal phrase leaf.", grammar: "noun-phrase" },
  sentence: { kind: "template", value: "{{monthName}} brings attention to {{focus}}." },
  wrapper: { kind: "template", value: "{{sentence}}" }
};
const definitions = validateCalendarTemplateDefinitions(definitionSource, ["monthName"]);
assert.deepEqual(calendarTemplateDefinitions({ calendarTemplateDefinitions: definitionSource }), definitions, "Definitions round-trip from the existing sections object.");
assert.equal(definitions.sentence.grammar, "text", "Template definitions default to text grammar.");
const definitionInputs = calendarTemplateDefinitionInputs(definitions);
assert.deepEqual(definitionInputs.phrases, { focus: "the systems that support daily life" });
assert.deepEqual(definitionInputs.templates, { sentence: "{{monthName}} brings attention to {{focus}}.", wrapper: "{{sentence}}" });
const definitionValues = { ...nestedValues({ monthName: "September" }), ...Object.fromEntries(Object.entries(definitionInputs.phrases).map(([name, text]) => [name, { text, kind: "copy" }])) };
const defined = calendarTemplateSegments(definitionInputs.templates.wrapper, definitionValues, definitionInputs.templates, ["wrapper"]).map(segment => segment.text).join("");
assert.equal(defined, "September brings attention to the systems that support daily life.");
assert.throws(() => validateCalendarTemplateDefinitions({ focus: { kind: "phrase", value: "{{monthName}}" } }), /must stay literal/u, "Phrase leaves cannot execute nested tokens.");
assert.throws(() => validateCalendarTemplateDefinitions({ monthName: { kind: "phrase", value: "September" } }, ["monthName"]), /reserved/u, "Calculated facts can be reserved from author definitions.");
assert.throws(() => validateCalendarTemplateDefinitions({ constructor: { kind: "phrase", value: "unsafe" } }), /Invalid or reserved/u, "Unsafe object names are rejected.");

const editorial = calendarTemplateSegments(calendarMonthlyEditorialPattern(), nestedValues({
  monthName: "September", monthRange: "September 1 – September 30",
  hasNewMoon: "yes", hasFullMoon: "yes", hasSeasonTransition: "yes",
  seasonOpening: "Opening argument.", newMoonOverview: "New Moon writing.",
  fullMoonOverview: "Full Moon writing.", seasonOverview: "Incoming season writing.",
  monthlyIntegration: "Closing passage."
})).map(segment => segment.text).join("");
assert.match(editorial, /Opening argument\./);
assert.match(editorial, /New Moon writing\./);
assert.match(editorial, /Incoming season writing\./);
assert.equal(editorial.includes("{{planetaryHighlights}}"), false, "Unselected highlight sections stay absent.");
assert.equal(editorial.includes("{{lunationConnection}}"), false);

const monthDays = Array.from({ length: 30 }, (_, index) => ({
  date: `2026-09-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`, dateKey: `2026-09-${String(index + 1).padStart(2, "0")}`,
  moonSign: "Virgo", moonPhase: "Waxing", events: []
}));
const previewValues = calendarPreviewValues({ sunSign: "", moonSign: "", rows: [], calculation: {
  sky: { generatedAt: "2026-09-15T16:00:00.000Z", positions: [], moonPhase: "Waxing" }, days: monthDays, events: [], seasonIngresses: [], timeZone: "America/New_York"
} });
assert.equal(previewValues.monthName?.text, "September", "Month name must be a calculated preview fact, not authored prose.");

const lunationPreview = calendarPreviewValues({ sunSign: "Virgo", moonSign: "Pisces", rows: [], calculation: {
  sky: { generatedAt: "2026-09-15T16:00:00.000Z", positions: [], moonPhase: "Waxing" },
  days: monthDays,
  events: [
    { id: "nm", type: "lunation", title: "New Moon in Virgo", startsAt: "2026-09-07T16:00:00.000Z", dateKey: "2026-09-07", glyph: "●", primary: true, sign: "Virgo" },
    { id: "fm", type: "lunation", title: "Full Moon Lunar Eclipse in Pisces", startsAt: "2026-09-21T16:00:00.000Z", dateKey: "2026-09-21", glyph: "○", primary: true, sign: "Pisces", eclipseType: "lunar" }
  ],
  seasonIngresses: [
    { id: "leo", type: "ingress", title: "Sun enters Leo", startsAt: "2026-07-22T12:00:00.000Z", dateKey: "2026-07-22", glyph: "☉", primary: true, planet: "Sun", toSign: "Leo" },
    { id: "virgo", type: "ingress", title: "Sun enters Virgo", startsAt: "2026-08-22T12:00:00.000Z", dateKey: "2026-08-22", glyph: "☉", primary: true, planet: "Sun", toSign: "Virgo" },
    { id: "libra", type: "ingress", title: "Sun enters Libra", startsAt: "2026-09-22T16:00:00.000Z", dateKey: "2026-09-22", glyph: "☉", primary: true, planet: "Sun", toSign: "Libra" },
    { id: "scorpio", type: "ingress", title: "Sun enters Scorpio", startsAt: "2026-10-23T12:00:00.000Z", dateKey: "2026-10-23", glyph: "☉", primary: true, planet: "Sun", toSign: "Scorpio" }
  ],
  timeZone: "America/New_York"
} });
assert.equal(lunationPreview.hasNewMoon?.text, "yes");
assert.equal(lunationPreview.hasFullMoon?.text, "yes");
assert.equal(lunationPreview.hasLunarEclipse?.text, "yes");
assert.equal(lunationPreview.hasSolarEclipse, undefined);
assert.equal(lunationPreview.newMoonSign?.text, "Virgo");
assert.equal(lunationPreview.fullMoonSign?.text, "Pisces");
assert.equal(lunationPreview.signTitle?.text, "Virgo");
assert.equal(lunationPreview.hasSeasonTransition?.text, "yes");
assert.ok(lunationPreview.entryDate?.text);
assert.ok(lunationPreview.exitDate?.text);
assert.notEqual(lunationPreview.entryDate?.text, lunationPreview.exitDate?.text, "Season dates must come from the opening visit, not the calendar month.");

const lunationCalculation = {
  sky: { generatedAt: "2026-09-15T16:00:00.000Z", positions: [], moonPhase: "Waxing" },
  days: monthDays,
  events: [
    { id: "nm", type: "lunation", title: "New Moon in Virgo", startsAt: "2026-09-07T16:00:00.000Z", dateKey: "2026-09-07", glyph: "●", primary: true, sign: "Virgo" },
    { id: "nm2", type: "lunation", title: "New Moon in Cancer", startsAt: "2026-09-08T16:00:00.000Z", dateKey: "2026-09-08", glyph: "●", primary: true, sign: "Cancer" },
    { id: "fm", type: "lunation", title: "Full Moon Lunar Eclipse in Pisces", startsAt: "2026-09-21T16:00:00.000Z", dateKey: "2026-09-21", glyph: "○", primary: true, sign: "Pisces", eclipseType: "lunar" }
  ],
  seasonIngresses: [
    { id: "leo", type: "ingress", title: "Sun enters Leo", startsAt: "2026-07-22T12:00:00.000Z", dateKey: "2026-07-22", glyph: "☉", primary: true, planet: "Sun", toSign: "Leo" },
    { id: "virgo", type: "ingress", title: "Sun enters Virgo", startsAt: "2026-08-22T12:00:00.000Z", dateKey: "2026-08-22", glyph: "☉", primary: true, planet: "Sun", toSign: "Virgo" },
    { id: "libra", type: "ingress", title: "Sun enters Libra", startsAt: "2026-09-22T16:00:00.000Z", dateKey: "2026-09-22", glyph: "☉", primary: true, planet: "Sun", toSign: "Libra" },
    { id: "scorpio", type: "ingress", title: "Sun enters Scorpio", startsAt: "2026-10-23T12:00:00.000Z", dateKey: "2026-10-23", glyph: "☉", primary: true, planet: "Sun", toSign: "Scorpio" }
  ],
  timeZone: "America/New_York"
};
const openingContext = calendarResolveOverviewField("seasonOpening", "The Sun moves through {{signTitle}}.", lunationPreview, {}, lunationCalculation);
assert.match(openingContext, /Virgo/);
assert.equal(/Libra/.test(openingContext), false, "Opening-season signTitle must not use the incoming ingress.");
const incomingContext = calendarResolveOverviewField("seasonOverview", "The Sun enters {{signTitle}}.", lunationPreview, {}, lunationCalculation);
assert.match(incomingContext, /Libra/);
assert.equal(/Virgo/.test(incomingContext), false, "Season transition signTitle must use the incoming visit.");
const newMoonContext = calendarResolveOverviewField("newMoonOverview", "{{signTitle}}{{#hasSolarEclipse}} solar{{/hasSolarEclipse}}", lunationPreview, {}, lunationCalculation);
assert.match(newMoonContext, /Virgo/);
assert.match(newMoonContext, /Cancer/);
assert.equal(/solar/.test(newMoonContext), false);
assert.equal(/Pisces/.test(newMoonContext), false, "New Moon passages must not inherit the Full Moon sign.");
const fullMoonContext = calendarResolveOverviewField("fullMoonOverview", "{{signTitle}}{{#hasLunarEclipse}} eclipse{{/hasLunarEclipse}}{{#hasSolarEclipse}} solar{{/hasSolarEclipse}}", lunationPreview, {}, lunationCalculation);
assert.match(fullMoonContext, /Pisces/);
assert.match(fullMoonContext, /eclipse/);
assert.equal(/solar/.test(fullMoonContext), false, "Full Moon context must not keep a solar-eclipse flag.");
assert.equal(/Virgo/.test(fullMoonContext), false);

const weeklyDays = ["11", "12", "13", "14", "15", "16", "17"].map(day => ({
  date: `2027-01-${day}T17:00:00.000Z`, dateKey: `2027-01-${day}`,
  moonSign: day === "11" ? "Scorpio" : "Sagittarius", moonPhase: "Waxing", events: []
}));
const weeklyMoonRow = {
  id: "moon-scorpio", content_key: "authored/calendar-weekly-moon/scorpio", body: "Scorpio Moon complete weekly passage.",
  status: "LIVE", lane: "serving", source_snapshot: { content_role: "full_copy", review_status: "approved_reuse", focus: "Necessary endings, emotional honesty, powerful truth" }
};
const weeklyPreview = calendarPreviewValues({
  sunSign: "Capricorn", moonSign: "Scorpio", rows: [weeklyMoonRow],
  calculation: { sky: { generatedAt: "2027-01-12T17:00:00.000Z", positions: [], moonPhase: "Waxing" }, days: weeklyDays, events: [], seasonIngresses: [], timeZone: "UTC" }
});
assert.equal(weeklyPreview.mondayMoonSign?.text, "Scorpio");
assert.equal(weeklyPreview.mondayWriteup?.text, weeklyMoonRow.body);
assert.equal(weeklyPreview.mondayMoonFocus?.text, "Necessary endings, emotional honesty, powerful truth");
const signsPreview = calendarPreviewValues({ sunSign: "Capricorn", moonSign: "Scorpio", rows: [weeklyMoonRow] });
assert.equal(signsPreview.mondayMoonSign?.text, "Scorpio", "Choose-signs mode uses the selected Moon as Monday's stand-in.");
assert.equal(signsPreview.mondayWriteup?.text, weeklyMoonRow.body);
const renderedWeeklyStarter = calendarTemplateSegments(weeklyStarter, {
  mondayMoonSign: { text: "Scorpio", kind: "fact" },
  mondayWriteup: { text: weeklyMoonRow.body, kind: "copy" }
}).map(segment => segment.text).join("");
assert.match(renderedWeeklyStarter, /The Moon is in Scorpio, so the emotional tone for this week is:/);
assert.match(renderedWeeklyStarter, /Scorpio Moon complete weekly passage\./);

const adjacentScorpioDays = ["11", "12", "13", "14", "15", "16", "17"].map((day) => ({
  date: `2027-01-${day}T17:00:00.000Z`, dateKey: `2027-01-${day}`,
  moonSign: "Scorpio", moonPhase: "Waxing", events: []
}));
const weeklyMoonVariant = {
  ...weeklyMoonRow,
  id: "moon-scorpio-2",
  content_key: "authored/calendar-weekly-moon/scorpio/variant-2",
  body: "Scorpio Moon second weekly passage."
};
const adjacentPreview = calendarPreviewValues({
  sunSign: "Capricorn", moonSign: "Scorpio", rows: [weeklyMoonRow, weeklyMoonVariant],
  calculation: { sky: { generatedAt: "2027-01-12T17:00:00.000Z", positions: [], moonPhase: "Waxing" }, days: adjacentScorpioDays, events: [], seasonIngresses: [], timeZone: "UTC" }
});
assert.equal(adjacentPreview.mondayWriteup?.text, weeklyMoonRow.body);
assert.equal(
  adjacentPreview.tuesdayWriteup?.text,
  "The Moon spends another day in Scorpio. If the same issue keeps returning, there may be something underneath it that has not been said plainly yet.",
  "After a write-up is surfaced, the next day uses the today template instead of another full passage."
);
assert.equal(adjacentPreview.moonWriteup?.text, adjacentPreview.tuesdayWriteup?.text, "Daily Sky uses the same visit-aware write-up as that weekday.");
assert.equal(
  adjacentPreview.wednesdayWriteup?.text,
  "The Moon remains in Scorpio today. If the same issue keeps returning, there may be something underneath it that has not been said plainly yet."
);
assert.equal(adjacentPreview.wednesdayWriteup?.sourceKey, "generated/calendar-moon-fallback/moonContinuation/2027-01-13");
assert.notEqual(adjacentPreview.mondayWriteup?.text, adjacentPreview.tuesdayWriteup?.text);
const repeatedPreview = calendarPreviewValues({
  sunSign: "Capricorn", moonSign: "Scorpio", rows: [weeklyMoonRow],
  calculation: { sky: { generatedAt: "2027-01-12T17:00:00.000Z", positions: [], moonPhase: "Waxing" }, days: adjacentScorpioDays, events: [], seasonIngresses: [], timeZone: "UTC" }
});
assert.equal(repeatedPreview.mondayWriteup?.text, weeklyMoonRow.body);
assert.equal(
  repeatedPreview.tuesdayWriteup?.text,
  "The Moon spends another day in Scorpio. If the same issue keeps returning, there may be something underneath it that has not been said plainly yet."
);
assert.equal(
  repeatedPreview.wednesdayWriteup?.text,
  "The Moon remains in Scorpio today. If the same issue keeps returning, there may be something underneath it that has not been said plainly yet."
);

const lunationMacroRow = {
  id: "nm-scorpio",
  content_key: "authored/sky-lunation-macro/new-moon/scorpio",
  body: "New Moon article.",
  status: "LIVE",
  lane: "serving",
  source_snapshot: { content_role: "full_copy", review_status: "approved_reuse" }
};
const lunationMondayDays = adjacentScorpioDays.map((day, index) => index === 0 ? {
  ...day,
  events: [{ id: "nm-scorpio-2027-01-11", type: "lunation", title: "New Moon in Scorpio", sign: "Scorpio", dateKey: day.dateKey, startsAt: day.date }]
} : day);
const mondayLunationPreview = calendarPreviewValues({
  sunSign: "Capricorn", moonSign: "Scorpio",
  rows: [weeklyMoonRow, weeklyMoonVariant, lunationMacroRow],
  calculation: {
    sky: { generatedAt: "2027-01-12T17:00:00.000Z", positions: [], moonPhase: "Waxing" },
    days: lunationMondayDays,
    events: lunationMondayDays[0].events,
    seasonIngresses: [],
    timeZone: "UTC"
  }
});
assert.equal(mondayLunationPreview.mondayWriteup?.text, lunationMacroRow.body);
assert.equal(mondayLunationPreview.tuesdayWriteup?.text, weeklyMoonRow.body, "Exact lunation copy does not consume a Moon-sign variant.");
assert.equal(
  mondayLunationPreview.wednesdayWriteup?.text,
  "The Moon remains in Scorpio today. If the same issue keeps returning, there may be something underneath it that has not been said plainly yet. The New Moon was two days ago. Now you know more. Adjust the plan to fit the life you are actually living.",
  "A second leftover write-up is not used once the sign passage has already been shown."
);

const renderedMonthlyStarter = calendarTemplateSegments(monthlyStarter, nestedValues({
  hasMonthlyTheme: "yes", monthName: "September", primaryMonthlyThemeFocus: "the primary theme", primaryMonthlyThemeExperience: "the plan needing revision",
  hasSecondaryMonthlyTheme: "yes", secondaryMonthlyThemeFocus: "the second theme", secondaryMonthlyThemeExperience: "another concern becoming more visible",
  hasLeadEvent: "yes", leadEventDate: "September 15", leadEventClause: "Neptune sextiles Pluto",
  leadEventExperience: "the situation changing", leadEventOpportunity: "revise the plan"
})).map(segment => segment.text).join("");
assert.match(renderedMonthlyStarter, /September brings attention to the primary theme\. You may notice the plan needing revision\./);
assert.match(renderedMonthlyStarter, /It also brings attention to the second theme\. You may notice another concern becoming more visible\./);
assert.match(renderedMonthlyStarter, /On September 15, Neptune sextiles Pluto\./);
const renderedSeasonStarter = calendarResolveOverviewField("seasonOverview", seasonStarter, nestedValues({
  placementFocus: "cooperation and relationships",
  placementChallenge: "making agreement more important than honesty",
  placementPractice: "say what needs to change"
}), {}, lunationCalculation);
assert.match(renderedSeasonStarter, /When the Sun enters Libra on/);
assert.match(renderedSeasonStarter, /attention turns toward cooperation and relationships/);
assert.equal(/Virgo/.test(renderedSeasonStarter), false, "Season transition starter must use the incoming visit, not the opening season.");

console.log("PASS: hydrated editor preservation, recursive Calendar overview fields, scoped monthly phrase registry, opt-in monthly sentence templates, weekly Monday Moon-tone starter, definition validation, and monthly editorial structure");
