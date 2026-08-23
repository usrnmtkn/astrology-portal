import assert from "node:assert/strict";
import {
  packageDraftChanges,
  renderWorkspacePreview,
  setPackageValueAt,
  skyFallbackIdentity,
  skyFallbackWorkspace
} from "../apps/admin/src/skyFallbackWorkspace.ts";

const original = {
  contentKey: "fallback-hook/sky-sign-copy/jupiter/leo",
  content_role: "fallback_hook",
  grammar_frame: "continuous_editorial_unit",
  render_policy: "sky-placement-continuous-v2",
  fact_line: "{{entryDate}} to {{exitDate}}",
  aspect_insert: "{{aspectInsert}}",
  opening: "Jupiter enters Leo on {{entryDate}}.",
  tension: "Attention can become the measure.",
  development: "The work can keep its own shape.",
  close: "Before {{exitDate}}, choose the work.",
  review_status: "approved"
};

const workspace = skyFallbackWorkspace(original.contentKey, { packageRecord: original });
assert.ok(workspace);
assert.equal(workspace.kind, "article");
assert.deepEqual(workspace.variables, ["aspectInsert", "entryDate", "exitDate"]);
assert.deepEqual(workspace.fields.map((field) => field.key), ["fact_line", "opening", "tension", "development", "close"]);
assert.deepEqual(workspace.fields.map((field) => field.label), [
  "Calculated date line",
  "Opening paragraphs",
  "Complication paragraphs",
  "Development / turn",
  "Final paragraph"
]);
assert.deepEqual(skyFallbackIdentity(original.contentKey), {
  title: "Jupiter in Leo",
  typeLabel: "Full Sky Placement article",
  groupKey: "articles",
  groupLabel: "Sky Placement articles"
});
assert.equal(skyFallbackIdentity("house-horoscope-core/jupiter/leo/house-10")?.title, "Jupiter in Leo · 10th House");
assert.deepEqual(skyFallbackIdentity("fallback-hook/sky-placement-lived/jupiter/leo"), {
  title: "Jupiter in Leo · Lived passage",
  typeLabel: "Legacy Sky Placement passage",
  groupKey: "supporting",
  groupLabel: "Supporting fallback rows"
});
assert.equal(
  skyFallbackIdentity("fallback-hook/sky-aspect-sign/sun/leo/trine/chiron/taurus")?.title,
  "Sun in Leo Trine Chiron in Taurus"
);

const packageDraft = setPackageValueAt(structuredClone(original), "development", "The work keeps its own shape.");
assert.equal(original.development, "The work can keep its own shape.", "The package original must stay immutable.");

const sections = { packageRecord: original, packageDraft };
assert.deepEqual(packageDraftChanges(sections), [{
  key: "development",
  label: "Development / turn",
  before: "The work can keep its own shape.",
  after: "The work keeps its own shape."
}]);

const proposed = skyFallbackWorkspace(original.contentKey, sections);
assert.ok(proposed);
assert.deepEqual(renderWorkspacePreview(proposed.fields, {
  entryDate: "June 30, 2026",
  exitDate: "July 26, 2027"
}), [
  "Jupiter enters Leo on June 30, 2026.",
  "Attention can become the measure.",
  "The work keeps its own shape.",
  "Before July 26, 2027, choose the work."
]);

console.log("Admin Sky fallback workspace test passed.");
