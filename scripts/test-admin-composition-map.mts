import assert from "node:assert/strict";
import { buildCompositionMap, isCompositionTemplateRow, type CompositionMapRow } from "../apps/admin/src/compositionMap";

const baseRow: CompositionMapRow = {
  id: "base",
  content_key: "fallback-hook/base",
  headline: "Base",
  summary: "",
  body: "Fallback copy.",
  surface: "you",
  status: "DRAFT",
  sections: []
};

assert.equal(isCompositionTemplateRow({
  ...baseRow,
  id: "legacy-template",
  content_key: "fallback-hook/empty-house/bridge-template/standard",
  body: "{{houseN}}",
  sections: { packageRecord: { content_role: "template" } }
}), true, "Explicit template metadata should preserve legacy template namespaces.");
assert.equal(isCompositionTemplateRow({
  ...baseRow,
  id: "mis-typed-hook",
  content_key: "fallback-hook/friends.compatibility.planet-card",
  block_type: "fallback_template"
}), false, "A fallback-hook key without explicit template metadata should remain a hook.");

const template: CompositionMapRow = {
  ...baseRow,
  id: "sky-template",
  content_key: "fallback-template/sky-placement-frame-v3",
  headline: "{{planetTitle}} in {{signTitle}}",
  body: "{{windowFrame}} {{planetFrame}} {{signLore}} {{signCopy}} {{currentAspects}}",
  surface: "sky",
  block_type: "fallback_template",
  sections: { packageRecord: { content_role: "template" } }
};
const sourceKeys = [
  "fallback-hook/sky-placement/jupiter",
  "fallback-hook/sky-placement-frame/jupiter",
  "fallback-hook/sky-placement-lore/leo",
  "fallback-hook/sky-sign-copy/jupiter/leo",
  "fallback-hook/sky-aspect-exact/jupiter/trine/saturn"
];
const map = buildCompositionMap([
  template,
  ...sourceKeys.map((content_key, index): CompositionMapRow => ({
    ...baseRow,
    id: `source-${index}`,
    content_key,
    headline: content_key,
    surface: "sky",
    block_type: "fallback_hook"
  }))
]);

assert.equal(map.length, 1);
assert.deepEqual(map[0].issues, [], "Canonical Sky source families should not create false IA flags.");
assert.ok(map[0].slots.filter((slot) => slot.sourceKind === "saved-copy").every((slot) => slot.sources.length > 0), "Every saved-copy Sky slot should link to an editable source row.");

console.log("Admin Composition Map classification and source-link tests passed.");
