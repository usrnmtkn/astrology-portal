import assert from "node:assert/strict";
import { mergeContentInventory } from "../apps/admin/src/contentStudioState.ts";
import { resolveCalendarNestedTemplate } from "../apps/admin/src/calendarOverviewTemplate.ts";

const full = { id: "one", updated_at: "2026-09-07T10:00:01Z", body: "Saved owner copy", sections: { packageDraft: { body: "Revision" } } };
const inventory = { id: "one", updated_at: full.updated_at, inventory_only: true, body: "", sections: {} };
assert.deepEqual(mergeContentInventory([full], [inventory]), [full], "Inventory refresh must retain the hydrated proposal needed for publishing.");
assert.deepEqual(mergeContentInventory([full], [{ ...inventory, updated_at: "2026-09-07T10:00:00Z" }]), [full], "Late pages must not overwrite a newer save.");
const newer = { ...inventory, updated_at: "2026-09-07T10:00:02Z" };
assert.deepEqual(mergeContentInventory([full], [newer]), [newer], "A newer external version must remain visible, requiring rehydration.");
assert.deepEqual(mergeContentInventory([full], []), [full], "Partial pages must retain rows not loaded yet.");
assert.deepEqual(mergeContentInventory([full], [], false), [], "A complete reload must remove rows no longer present.");

const templates = {
  monthlyOverview: "{{monthName}} brings attention to {{seasonOverview}}.",
  seasonOverview: "{{openingSeasonSign}}{{#hasSeasonChange}} into {{closingSeasonSign}}{{/hasSeasonChange}}{{^hasSeasonChange}} season{{/hasSeasonChange}}"
};
let nested = resolveCalendarNestedTemplate("{{monthlyOverview}}", {
  monthName: "September",
  openingSeasonSign: "Virgo",
  closingSeasonSign: "Libra",
  hasSeasonChange: true
}, templates);
assert.deepEqual(nested.errors, []);
assert.deepEqual(nested.missing, []);
assert.equal(nested.text, "September brings attention to Virgo into Libra.");

nested = resolveCalendarNestedTemplate("{{monthlyOverview}}", {
  monthName: "September",
  openingSeasonSign: "Virgo",
  closingSeasonSign: "{{monthlyOverview}}",
  hasSeasonChange: true
}, templates);
assert.equal(nested.text, "September brings attention to Virgo into {{monthlyOverview}}.", "Calculated/source values remain literal and are never executed as templates.");

nested = resolveCalendarNestedTemplate("{{monthlyOverview}}", {
  monthName: "September",
  openingSeasonSign: "Virgo",
  hasSeasonChange: false
}, templates);
assert.equal(nested.text, "September brings attention to Virgo season.");

const cyclic = resolveCalendarNestedTemplate("{{monthlyOverview}}", {}, {
  monthlyOverview: "{{seasonOverview}}",
  seasonOverview: "{{monthlyOverview}}"
});
assert.match(cyclic.errors[0], /Circular Calendar template reference/);

const missing = resolveCalendarNestedTemplate("{{monthlyOverview}}", { monthName: "September" }, {
  monthlyOverview: "{{monthName}} · {{notWrittenYet}}"
});
assert.deepEqual(missing.missing, ["notWrittenYet"]);
assert.equal(missing.text, "September · {{notWrittenYet}}");

for (const malformed of ["{{#thing}}{{/other}}", "{{#thing}}", "{{constructor}}", "{{__proto__.x}}", "{{bad:name}}", "{{missing}"]) {
  assert.ok(resolveCalendarNestedTemplate(malformed, {}, {}).errors.length > 0, `${malformed} must fail safely.`);
}

console.log("PASS: hydrated editor preservation, stale page protection, external updates, progressive inventory, full reload deletion, and safe nested Calendar templates");
