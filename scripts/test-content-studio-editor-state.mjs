import assert from "node:assert/strict";
import { mergeContentInventory } from "../apps/admin/src/contentStudioState.ts";
import { calendarTemplateSegments } from "../apps/admin/src/calendarPreviewModel.ts";
import { calendarPhraseVariables } from "../apps/admin/src/calendarOverviewTemplate.ts";
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

const phrases = calendarPhraseVariables("monthly-sky");
assert.equal(phrases.length, 11, "Monthly authoring must expose the reviewed small phrase registry.");
assert.equal(new Set(phrases.map(variable => variable.name)).size, phrases.length, "Monthly phrase names must be unique.");
assert.equal(calendarPhraseVariables("weekly-sky").length, 0, "The monthly phrase registry must not leak into weekly authoring.");
assert.equal(phrases.some(variable => variable.name === "monthlyFocus"), false, "The retired catch-all monthlyFocus must not return.");
assert.deepEqual(phrases.find(variable => variable.name === "openingSeasonFocus"), {
  name: "openingSeasonFocus", label: "Opening season focus", grammar: "noun phrase", source: "opening-season",
  help: "The emphasis of the zodiac season active when the month begins."
});
assert.equal(phrases.find(variable => variable.name === "leadEventOpportunity")?.grammar, "verb phrase");
assert.equal(phrases.find(variable => variable.name === "secondaryMonthlyThemeFocus")?.source, "edition");

console.log("PASS: hydrated editor preservation, recursive Calendar overview fields, and scoped monthly phrase-variable registry");
