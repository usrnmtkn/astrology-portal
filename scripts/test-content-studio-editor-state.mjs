import assert from "node:assert/strict";
import { mergeContentInventory } from "../apps/admin/src/contentStudioState.ts";
import { calendarPreviewValues, calendarTemplateSegments } from "../apps/admin/src/calendarPreviewModel.ts";
import { calendarOverviewFields, calendarOverviewWriting } from "../apps/admin/src/calendarOverviewTemplate.ts";
import { monthlyPhraseVariable, monthlyPhraseVariables } from "../src/content-studio/monthlyPhraseVariables.ts";
const full = { id: "one", updated_at: "2026-09-07T10:00:01Z", body: "Saved owner copy", sections: { packageDraft: { body: "Revision" } } };
const inventory = { id: "one", updated_at: full.updated_at, inventory_only: true, body: "", sections: {} };
assert.deepEqual(mergeContentInventory([full], [inventory]), [full], "Inventory refresh must retain the hydrated proposal needed for publishing.");
assert.deepEqual(mergeContentInventory([full], [{ ...inventory, updated_at: "2026-09-07T10:00:00Z" }]), [full], "Late pages must not overwrite a newer save.");
const newer = { ...inventory, updated_at: "2026-09-07T10:00:02Z" };
assert.deepEqual(mergeContentInventory([full], [newer]), [newer], "A newer external version must remain visible, requiring rehydration.");
assert.deepEqual(mergeContentInventory([full], []), [full], "Partial pages must retain rows not loaded yet.");
assert.deepEqual(mergeContentInventory([full], [], false), [], "A complete reload must remove rows no longer present.");

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
assert.equal(calendarOverviewFields("weekly-sky").some(field => field.starter), false, "Step 3 must not change weekly authoring.");
assert.equal(monthlyStarter.includes("{{monthlyFocus}}"), false, "The monthly starter must not reintroduce the catch-all monthlyFocus.");
assert.match(monthlyStarter, /\{\{#hasMonthlyTheme\}\}/);
assert.match(monthlyStarter, /\{\{#hasSecondaryMonthlyTheme\}\}/);
assert.match(monthlyStarter, /\{\{#hasLeadEvent\}\}/);
assert.equal(calendarOverviewWriting({ calendarOverview: { monthlyOverview: "Existing owner passage" } }).monthlyOverview, "Existing owner passage", "Existing saved prose remains byte-for-byte until the owner opts into a starter.");

const renderedMonthlyStarter = calendarTemplateSegments(monthlyStarter, nestedValues({
  hasMonthlyTheme: "yes", monthName: "September", primaryMonthlyThemeFocus: "the primary theme", primaryMonthlyThemeExperience: "the plan needing revision",
  hasSecondaryMonthlyTheme: "yes", secondaryMonthlyThemeFocus: "the second theme", secondaryMonthlyThemeExperience: "another concern becoming more visible",
  hasLeadEvent: "yes", leadEventDate: "September 15", leadEventClause: "Neptune sextiles Pluto",
  leadEventExperience: "the situation changing", leadEventOpportunity: "revise the plan"
})).map(segment => segment.text).join("");
assert.match(renderedMonthlyStarter, /September brings attention to the primary theme\. You may notice the plan needing revision\./);
assert.match(renderedMonthlyStarter, /It also brings attention to the second theme\. You may notice another concern becoming more visible\./);
assert.match(renderedMonthlyStarter, /On September 15, Neptune sextiles Pluto\./);
const renderedSeasonStarter = calendarTemplateSegments(seasonStarter, nestedValues({
  openingSeasonSign: "Virgo", openingSeasonFocus: "daily rituals and systems", openingSeasonOpportunity: "strengthen what works",
  closingSeasonSign: "Libra", seasonChangeDate: "September 22", closingSeasonFocus: "cooperation and relationships",
  closingSeasonChallenge: "making agreement more important than honesty", closingSeasonPractice: "say what needs to change"
})).map(segment => segment.text).join("");
assert.match(renderedSeasonStarter, /The Sun in Virgo turns our attention to daily rituals and systems, helping us strengthen what works\./);
assert.match(renderedSeasonStarter, /When the Sun enters Libra on September 22/);

const monthDays = Array.from({ length: 30 }, (_, index) => ({
  date: `2026-09-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`, dateKey: `2026-09-${String(index + 1).padStart(2, "0")}`,
  moonSign: "Virgo", moonPhase: "Waxing", events: []
}));
const previewValues = calendarPreviewValues({ sunSign: "", moonSign: "", rows: [], calculation: {
  sky: { generatedAt: "2026-09-15T16:00:00.000Z", positions: [], moonPhase: "Waxing" }, days: monthDays, events: [], seasonIngresses: [], timeZone: "America/New_York"
} });
assert.equal(previewValues.monthName?.text, "September", "Month name must be a calculated preview fact, not authored prose.");

console.log("PASS: hydrated editor preservation, recursive Calendar overview fields, scoped monthly phrase registry, and opt-in monthly sentence templates");
