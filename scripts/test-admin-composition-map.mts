import assert from "node:assert/strict";
import { buildCompositionMap, buildCompositionTemplate, isCompositionTemplateRow, type CompositionMapRow } from "../apps/admin/src/compositionMap";

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
    requiredSlots: ["transitTopic", "natalCore", "aspectVerb"],
    headline: "{{transitTitle}} {{aspectName}} your {{natalTitle}}",
    headline_they: "{{transitTitle}} {{aspectName}} {{otherPoss}} {{natalTitle}}",
    body: "{{transitRef}} is {{aspectAdj}} your natal {{natalTitle}}. This {{aspectVerb}}. {{transitTypeLine}}",
    body_they: "{{transitRef}} is {{aspectAdj}} {{otherPoss}} natal {{natalTitle}}. This {{aspectVerb}}. {{transitTypeLine}}"
  } }
};
const transitMap = buildCompositionMap([
  transitTemplate,
  ...["conjunction", "trine"].map((aspect): CompositionMapRow => ({
    ...baseRow,
    id: `aspect-${aspect}`,
    content_key: `fallback-hook/transit-aspect-type/${aspect}`,
    sections: { packageRecord: { content_role: "fallback_hook", body_you: `${aspect} works for you.`, body_they: `${aspect} works for them.` } }
  })),
  {
    ...baseRow,
    id: "aspect-verb-trine",
    content_key: "fallback-vocab/aspect-verb/trine",
    body: "puts {{transitTopic}} solidly behind {{natalCore}}",
    block_type: "vocabulary_phrase"
  },
  {
    ...baseRow,
    id: "saturn-topic",
    content_key: "fallback-vocab/planet-topic/saturn",
    body: "Saturn's focus",
    block_type: "vocabulary_phrase"
  },
  {
    ...baseRow,
    id: "venus-core",
    content_key: "fallback-hook/natal-core/venus",
    body: "Venus themes",
    block_type: "fallback_hook"
  }
]);
assert.equal(transitMap[0].preview.fields.find((field) => field.key === "body")?.rendered, "transiting Saturn is trine your natal Venus. This puts Saturn's focus solidly behind Venus themes. trine works for you.", "A trine preview should select nested saved phrases and direct-reader voice.");
assert.equal(transitMap[0].preview.fields.find((field) => field.key === "body_they")?.rendered, "transiting Saturn is trine Maya's natal Venus. This puts Saturn's focus solidly behind Venus themes. trine works for them.", "The third-person preview should keep its possessive and nested sources consistent.");
assert.equal(transitMap[0].preview.fields.find((field) => field.key === "headline_they")?.rendered, "Saturn trine Maya's Venus", "Third-person previews should use their third-person headline.");
assert.equal(transitMap[0].preview.fields.find((field) => field.key === "body")?.audience, "you", "The main direct-reader passage should not appear in third-person previews.");
assert.equal(transitMap[0].preview.fields.find((field) => field.key === "body_they")?.audience, "they", "The third-person passage should not appear in direct-reader previews.");
const transitSegments = transitMap[0].preview.fields.find((field) => field.key === "body")?.paragraphs.flat() ?? [];
assert.equal(transitSegments.find((segment) => segment.name === "transitRef")?.kind, "fact", "Calculated preview values should carry their fact color group.");
assert.equal(transitSegments.find((segment) => segment.name === "transitTypeLine")?.source?.row.content_key, "fallback-hook/transit-aspect-type/trine", "Rendered hook text should deep-link to the matching editable source.");
assert.equal(transitMap[0].slots.find((slot) => slot.name === "transitTopic")?.sourceKind, "saved-copy", "Resolver-selected planet topics should be editable slots.");
assert.equal(transitMap[0].slots.find((slot) => slot.name === "natalCore")?.sources[0]?.row.content_key, "fallback-hook/natal-core/venus", "Declared nested dependencies should link to their saved source family.");
assert.equal(transitSegments.find((segment) => segment.name === "transitTopic")?.source?.row.content_key, "fallback-vocab/planet-topic/saturn", "Nested preview text should deep-link to the exact transiting-planet vocabulary row.");
assert.equal(transitSegments.find((segment) => segment.name === "natalCore")?.source?.row.content_key, "fallback-hook/natal-core/venus", "Nested preview text should deep-link to the preferred natal-core hook.");

const transitFallbackMap = buildCompositionMap([
  transitTemplate,
  {
    ...baseRow,
    id: "fallback-aspect-verb-trine",
    content_key: "fallback-vocab/aspect-verb/trine",
    body: "puts {{transitTopic}} solidly behind {{natalCore}}",
    block_type: "vocabulary_phrase"
  },
  {
    ...baseRow,
    id: "fallback-saturn-topic",
    content_key: "fallback-vocab/planet-topic/saturn",
    body: "Saturn's focus",
    block_type: "vocabulary_phrase"
  },
  {
    ...baseRow,
    id: "venus-core-vocabulary-fallback",
    content_key: "fallback-vocab/planet-core/venus",
    body: "Venus themes from vocabulary",
    block_type: "vocabulary_phrase"
  }
]);
const fallbackSegments = transitFallbackMap[0].preview.fields.find((field) => field.key === "body")?.paragraphs.flat() ?? [];
assert.equal(fallbackSegments.find((segment) => segment.name === "natalCore")?.source?.row.content_key, "fallback-vocab/planet-core/venus", "When the preferred natal-core hook is absent, the preview should deep-link to the resolver's vocabulary fallback.");

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

const contextualNatalTemplate: CompositionMapRow = {
  ...baseRow,
  id: "sun-sign-template",
  content_key: "fallback-template/natal.planet-in-sign/sun",
  headline: "Sun in {{signTitle}}",
  body: "{{possessive}} {{planetTitle}} is in {{signTitle}}: you show up {{signAdverb}}.",
  surface: "natal",
  block_type: "fallback_template",
  sections: { packageRecord: {
    content_role: "template",
    headline: "Sun in {{signTitle}}",
    body_you: "{{possessive}} {{planetTitle}} is in {{signTitle}}: you show up {{signAdverb}}.{{#placementSentences}} {{placementSentences}}{{/placementSentences}}"
  } }
};
const contextualNatalPreview = buildCompositionTemplate(contextualNatalTemplate, [
  contextualNatalTemplate,
  {
    ...baseRow,
    id: "aries-style",
    content_key: "fallback-vocab/sign-adverb/aries",
    body: "boldly",
    block_type: "vocabulary_phrase"
  },
  {
    ...baseRow,
    id: "sun-aries-passage",
    content_key: "fallback-hook/placement-sentence/sun/aries",
    body: "You initiate before the room has finished deciding.",
    block_type: "fallback_hook"
  }
], {
  exampleValues: { planetTitle: "Sun", signTitle: "Aries", possessive: "Your" },
  includeOptionalSources: true
});
const contextualNatalField = contextualNatalPreview.preview.fields.find((field) => field.key === "body_you");
assert.equal(contextualNatalField?.rendered, "Your Sun is in Aries: you show up boldly. You initiate before the room has finished deciding.", "A contextual advanced-template preview should use the selected natal placement and include its deterministically matched optional passage.");
const contextualNatalSegments = contextualNatalField?.paragraphs.flat() ?? [];
assert.equal(contextualNatalSegments.find((segment) => segment.name === "signTitle")?.kind, "fact", "Selected chart facts should retain their calculated-fact color group.");
assert.equal(contextualNatalSegments.find((segment) => segment.name === "signAdverb")?.kind, "phrase", "Matched vocabulary should retain its reusable-phrase color group.");
assert.equal(contextualNatalSegments.find((segment) => segment.name === "placementSentences")?.kind, "hook", "Matched placement passages should retain their authored-hook color group.");

const retroArticleMap = buildCompositionMap([
  {
    ...baseRow,
    id: "retro-article-template",
    content_key: "fallback-template/transit.retrograde-article",
    headline: "{{articleHeadline}}",
    body: "{{articleBody}}",
    surface: "sky",
    block_type: "fallback_template",
    sections: {
      packageRecord: {
        content_role: "template",
        requiredSlots: ["articleHeadline", "articleBody"],
        headline: "{{articleHeadline}}",
        body: "{{articleBody}}"
      }
    }
  },
  {
    ...baseRow,
    id: "saturn-retro-article",
    content_key: "fallback-hook/transit-retro-article/saturn",
    headline: "The shortcut always sends the bill later.",
    body: "{{timeOpen}}, {{transitRef}} is retrograde. Review what can no longer run on autopilot.",
    surface: "sky",
    block_type: "fallback_hook",
    sections: {
      packageRecord: {
        content_role: "fallback_hook",
        headline: "The shortcut always sends the bill later.",
        body_you: "{{timeOpen}}, {{transitRef}} is retrograde. Review what can no longer run on autopilot."
      }
    }
  },
  {
    ...baseRow,
    id: "saturn-placement-article",
    content_key: "sky-article/saturn/aries/2026",
    headline: "Saturn in Aries",
    body: "Saturn stationed retrograde on July 27, 2026 in early Aries.",
    surface: "sky"
  }
]);
const retroArticle = retroArticleMap[0];
assert.equal(retroArticle.label, "Current Sky · Planet retrograde article", "The template title should state its retrograde scope.");
assert.equal(retroArticle.preview.lineage, "runtime-traceable", "The preview should be verified only when its template-specific resolver contract is present.");
assert.equal(retroArticle.preview.fields.find((field) => field.key === "headline")?.rendered, "The shortcut always sends the bill later.");
assert.equal(
  retroArticle.preview.fields.find((field) => field.key === "body")?.rendered,
  "From August 12 through September 3, Saturn in Aries is retrograde. Review what can no longer run on autopilot."
);
assert.deepEqual(
  retroArticle.preview.sources.map((source) => source.row.content_key),
  ["fallback-hook/transit-retro-article/saturn"],
  "The verified preview must deep-link only to the source family the runtime resolver reads."
);
assert.equal(
  retroArticle.preview.sources.some((source) => source.row.content_key.startsWith("sky-article/")),
  false,
  "A placement article must never masquerade as the retrograde template source."
);

console.log("Admin Composition Map classification and source-link tests passed.");
