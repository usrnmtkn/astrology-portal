import assert from "node:assert/strict";
import { mergeContentInventory } from "../apps/admin/src/contentStudioState.ts";
import { calendarNestedTemplateText } from "../apps/admin/src/calendarPreviewModel.ts";
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
let nested = calendarNestedTemplateText("{{monthlyOverview}}", nestedValues({ monthName: "September", openingSeasonSign: "Virgo", closingSeasonSign: "Libra", hasSeasonChange: "yes" }), templates);
assert.equal(nested.error, "");
assert.equal(nested.text, "September brings attention to Virgo into Libra.");
nested = calendarNestedTemplateText("{{monthlyOverview}}", nestedValues({ monthName: "September", openingSeasonSign: "Virgo", closingSeasonSign: "{{monthlyOverview}}", hasSeasonChange: "yes" }), templates);
assert.equal(nested.text, "September brings attention to Virgo into {{monthlyOverview}}.", "literal facts do not execute");
const cyclic = calendarNestedTemplateText("{{monthlyOverview}}", {}, { monthlyOverview: "{{seasonOverview}}", seasonOverview: "{{monthlyOverview}}" });
assert.match(cyclic.error, /Circular Calendar template reference/);
const missing = calendarNestedTemplateText("{{monthlyOverview}}", nestedValues({ monthName: "September" }), { monthlyOverview: "{{monthName}} · {{notWrittenYet}}" });
assert.equal(missing.text, "September · {{notWrittenYet}}");

console.log("PASS: hydrated editor preservation, stale page protection, external updates, progressive inventory, full reload deletion, and recursive Calendar overview fields");
