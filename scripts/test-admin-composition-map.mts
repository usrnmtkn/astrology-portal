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
assert.equal(map[0].label, "Current Sky · Planet in any sign", "The editor title should describe the template scope instead of repeating raw variables.");
assert.deepEqual(map[0].issues, [], "Canonical Sky source families should not create false IA flags.");
assert.ok(map[0].slots.filter((slot) => slot.sourceKind === "saved-copy").every((slot) => slot.sources.length > 0), "Every saved-copy Sky slot should link to an editable source row.");
assert.equal(map[0].preview.fields.find((field) => field.key === "headline")?.rendered, "Jupiter in Leo", "The default preview should resolve representative runtime facts consistently with the Sky placement example.");
assert.ok(map[0].preview.fields.find((field) => field.key === "body")?.rendered.includes("Fallback copy."), "The default preview should resolve representative saved copy.");
assert.ok(map[0].preview.fields.every((field) => !field.rendered.includes("{{")), "The reader preview should not expose unresolved template tokens.");
assert.equal(map[0].preview.sources.length, sourceKeys.length, "The preview should identify the canonical saved rows used in its representative rendering.");

const audienceMap = buildCompositionMap([{
  ...baseRow,
  id: "audience-template",
  content_key: "fallback-template/natal-planet-in-sign",
  headline: "{{planetTitle}} in {{signTitle}}",
  surface: "natal",
  block_type: "fallback_template",
  sections: {
    packageRecord: {
      content_role: "template",
      headline: "{{planetTitle}} in {{signTitle}}",
      body_you: "Your {{planetTitle}} is in {{signTitle}} and connects with natal {{natalTitle}}.",
      body_they: "{{possessive}} {{planetTitle}} is in {{signTitle}}."
    }
  }
}]);
assert.equal(audienceMap[0].preview.fields.find((field) => field.key === "body_they")?.rendered, "Maya's Sun is in Leo.", "Third-person previews should read naturally instead of exposing a generic possessive example.");
assert.equal(audienceMap[0].preview.fields.find((field) => field.key === "body_you")?.rendered, "Your Sun is in Leo and connects with natal Venus.", "Representative examples should not duplicate qualifiers already present in the template.");

const transitTemplate: CompositionMapRow = {
  ...baseRow,
  id: "transit-template",
  content_key: "fallback-template/transit.aspect",
  headline: "{{transitTitle}} {{aspectName}} your {{natalTitle}}",
  surface: "sky",
  block_type: "fallback_template",
  sections: { packageRecord: {
    content_role: "template",
    headline: "{{transitTitle}} {{aspectName}} your {{natalTitle}}",
    headline_they: "{{transitTitle}} {{aspectName}} {{otherPoss}} {{natalTitle}}",
    body: "{{transitRef}} is {{aspectAdj}} your natal {{natalTitle}}. {{transitTypeLine}}",
    body_they: "{{transitRef}} is {{aspectAdj}} {{otherPoss}} natal {{natalTitle}}. {{transitTypeLine}}"
  } }
};
const transitMap = buildCompositionMap([
  transitTemplate,
  ...["conjunction", "trine"].map((aspect): CompositionMapRow => ({
    ...baseRow,
    id: `aspect-${aspect}`,
    content_key: `fallback-hook/transit-aspect-type/${aspect}`,
    sections: { packageRecord: { content_role: "fallback_hook", body_you: `${aspect} works for you.`, body_they: `${aspect} works for them.` } }
  }))
]);
assert.equal(transitMap[0].preview.fields.find((field) => field.key === "body")?.rendered, "transiting Saturn is trine your natal Venus. trine works for you.", "A trine preview should select trine source copy and direct-reader voice.");
assert.equal(transitMap[0].preview.fields.find((field) => field.key === "body_they")?.rendered, "transiting Saturn is trine Maya's natal Venus. trine works for them.", "The third-person preview should keep its possessive and source voice consistent.");
assert.equal(transitMap[0].preview.fields.find((field) => field.key === "headline_they")?.rendered, "Saturn trine Maya's Venus", "Third-person previews should use their third-person headline.");
assert.equal(transitMap[0].preview.fields.find((field) => field.key === "body")?.audience, "you", "The main direct-reader passage should not appear in third-person previews.");
assert.equal(transitMap[0].preview.fields.find((field) => field.key === "body_they")?.audience, "they", "The third-person passage should not appear in direct-reader previews.");

const jupiterMap = buildCompositionMap([{
  ...baseRow,
  id: "jupiter-template",
  content_key: "fallback-template/natal.planet-in-sign/jupiter",
  headline: "Jupiter in {{signTitle}}",
  body: "{{possessive}} {{planetTitle}} is in {{signTitle}}.",
  surface: "natal",
  block_type: "fallback_template",
  sections: { packageRecord: { content_role: "template", headline: "Jupiter in {{signTitle}}", body_you: "{{possessive}} {{planetTitle}} is in {{signTitle}}." } }
}]);
assert.equal(jupiterMap[0].label, "Natal chart · Jupiter in any sign", "Planet-specific variants should name the planet and make their all-sign scope explicit.");
assert.equal(jupiterMap[0].preview.fields.find((field) => field.key === "headline")?.rendered, "Jupiter in Leo", "Planet-specific examples should show the correct planet and a concrete sign.");
assert.equal(jupiterMap[0].preview.fields.find((field) => field.key === "body_you")?.rendered, "Your Jupiter is in Leo.", "Planet-specific bodies should not fall back to a Sun example.");

console.log("Admin Composition Map classification and source-link tests passed.");
