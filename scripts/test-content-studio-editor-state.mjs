import assert from "node:assert/strict";
import { mergeContentInventory } from "../apps/admin/src/contentStudioState.ts";
import { calendarTemplateSegments } from "../apps/admin/src/calendarPreviewModel.ts";
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

console.log("PASS: hydrated editor preservation, stale page protection, external updates, progressive inventory, full reload deletion, and recursive Calendar overview fields");