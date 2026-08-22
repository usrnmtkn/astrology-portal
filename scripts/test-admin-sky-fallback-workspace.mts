import assert from "node:assert/strict";
import {
  packageDraftChanges,
  renderWorkspacePreview,
  setPackageValueAt,
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

const packageDraft = setPackageValueAt(structuredClone(original), "development", "The work keeps its own shape.");
assert.equal(original.development, "The work can keep its own shape.", "The package original must stay immutable.");

const sections = { packageRecord: original, packageDraft };
assert.deepEqual(packageDraftChanges(sections), [{
  key: "development",
  label: "Development",
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
