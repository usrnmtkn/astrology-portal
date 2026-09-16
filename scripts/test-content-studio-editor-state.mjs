import assert from "node:assert/strict";
import { mergeContentInventory } from "../apps/admin/src/contentStudioState.ts";
import { calendarTemplateSegments } from "../apps/admin/src/calendarPreviewModel.ts";
import { calendarTemplateDefinitionInputs, calendarTemplateDefinitions, validateCalendarTemplateDefinitions } from "../apps/admin/src/calendarTemplateDefinitions.ts";
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

console.log("PASS: hydrated editor preservation, stale page protection, external updates, progressive inventory, full reload deletion, recursive Calendar overview fields, and phrase/template definition validation");
