import assert from "node:assert/strict";
import fs from "node:fs";
import { buildCompositionMap, type CompositionMapRow } from "../apps/admin/src/compositionMap";

const sourcePackage = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", import.meta.url),
  "utf8"
));
const templatePackage = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json", import.meta.url),
  "utf8"
));
const skyArticlePackage = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-article-v1.json", import.meta.url),
  "utf8"
));

function normalize(row: Record<string, unknown>): CompositionMapRow {
  const contentKey = String(row.contentKey ?? "");
  const role = String(row.content_role ?? "");
  return {
    id: contentKey,
    content_key: contentKey,
    headline: typeof row.headline === "string" ? row.headline : null,
    summary: typeof row.summary === "string" ? row.summary : null,
    body: typeof row.body === "string" ? row.body : null,
    surface: typeof row.surface === "string" ? row.surface : "you",
    status: row.review_status === "approved" ? "LIVE" : "DRAFT",
    block_type: role === "template" ? "fallback_template" : role === "vocabulary" ? "vocabulary_phrase" : "fallback_hook",
    sections: { packageRecord: row }
  };
}

const rows = [...new Map([
  ...templatePackage.templates,
  ...sourcePackage.vocabularyRows,
  ...sourcePackage.fallbackSourceRows,
  ...sourcePackage.hookRows,
  ...skyArticlePackage.authoredCards,
  ...skyArticlePackage.vocabularyRows,
  ...skyArticlePackage.hookRows
].map((row) => [row.contentKey, normalize(row)])).values()];
const map = buildCompositionMap(rows);
const slots = map.flatMap((template) => template.slots.map((slot) => ({ template, slot })));

assert.equal(map.length, templatePackage.templates.length, "Every packaged template should be included in the atomic provenance audit.");
assert.deepEqual(
  slots.filter(({ slot }) => slot.sourceKind === "saved-copy" && slot.sources.length === 0).map(({ template, slot }) => `${template.row.content_key}:${slot.name}`),
  [],
  "Every editable variable reachable through a template or nested source must resolve to at least one saved row."
);
assert.deepEqual(
  slots.filter(({ slot }) => slot.source === "Runtime resolver").map(({ template, slot }) => `${template.row.content_key}:${slot.name}`),
  [],
  "Every runtime leaf in the composition graph must have a specific atomic provenance definition."
);
assert.deepEqual(
  slots.filter(({ slot }) => slot.sourceKind === "unmapped").map(({ template, slot }) => `${template.row.content_key}:${slot.name}`),
  [],
  "Packaged templates must not declare slots without an active runtime or saved-source provider."
);
assert.deepEqual(
  map.flatMap((template) => template.preview.fields.flatMap((field) => field.paragraphs.flatMap((paragraph) => paragraph.flatMap((segment) => {
    const slot = template.slots.find((candidate) => candidate.name === segment.name);
    return slot?.sourceKind === "saved-copy" && segment.text.trim() && !segment.source
      ? [`${template.row.content_key}:${field.key}:${segment.name}`]
      : [];
  })))),
  [],
  "Every rendered saved-copy span must deep-link to one exact atomic source row."
);

const transit = map.find((template) => template.row.content_key === "fallback-template/transit.aspect");
assert.ok(transit);
assert.deepEqual(
  transit.slots.filter((slot) => slot.depth > 0).map((slot) => slot.name),
  ["natalArea", "transitEffect"],
  "Transit source templates should expand to their deepest editable dependencies."
);
const transitSegments = transit.preview.fields.find((field) => field.key === "body")?.paragraphs.flat() ?? [];
assert.equal(transitSegments.find((segment) => segment.name === "transitTopic")?.source?.row.content_key, "fallback-vocab/planet-topic/saturn");
assert.equal(transitSegments.find((segment) => segment.name === "natalCore")?.source?.row.content_key, "fallback-hook/natal-core/venus");
assert.equal(transitSegments.find((segment) => segment.name === "transitEffect")?.source?.row.content_key, "fallback-hook/transit-effect-soft/saturn/venus");

const synastry = map.find((template) => template.row.content_key === "fallback-template/synastry.aspect-v3");
assert.ok(synastry);
assert.equal(synastry.row.body, "{{pairSentences}}", "The synastry template must model the authored pair body returned by the resolver.");
assert.deepEqual(synastry.issues, [], "The live synastry contract must not expose stale or unwired body variables.");
assert.deepEqual(
  synastry.slots.filter((slot) => ["synAspectLine", "closingLine"].includes(slot.name)).map((slot) => slot.name),
  [],
  "Dead assembled-body variables must not remain in the authored-pair runtime graph."
);
for (const name of ["holder1", "holder1PossCap", "holder2", "holder2Poss"]) {
  const slot = synastry.slots.find((candidate) => candidate.name === name);
  assert.equal(slot?.depth, 1, `${name} should be exposed as a nested atomic dependency.`);
  assert.equal(slot?.sourceKind, "runtime", `${name} should be identified as calculated relationship context.`);
  assert.equal(slot?.sources.length, 0, `${name} must not masquerade as editable saved writing.`);
}

console.log(`Admin atomic variable provenance passed: ${map.length} templates, ${slots.length} reachable variables, 0 wiring gaps.`);
