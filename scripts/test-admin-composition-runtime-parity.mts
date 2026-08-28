import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { buildCompositionMap, type CompositionMapRow } from "../apps/admin/src/compositionMap";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser";
import { renderTransitRetro } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8"));
}

function dashboardRow(record: Record<string, unknown>, fallbackType: "fallback_template" | "fallback_hook"): CompositionMapRow {
  const contentKey = String(record.contentKey ?? "");
  return {
    id: contentKey,
    content_key: contentKey,
    headline: typeof record.headline === "string" ? record.headline : null,
    summary: typeof record.note === "string" ? record.note : typeof record.notes === "string" ? record.notes : null,
    body: typeof record.body === "string" ? record.body : typeof record.body_you === "string" ? record.body_you : null,
    surface: String(record.surface ?? "sky"),
    status: "DRAFT",
    block_type: fallbackType,
    sections: { packageRecord: record },
    source_snapshot: { content_role: record.content_role }
  };
}

const templates = readJson("../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const sourceRows = readJson("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const transitRows = readJson("../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const skyArticles = readJson("../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-article-v1.json");
const templateRecord = templates.templates.find((row: Record<string, unknown>) => row.contentKey === "fallback-template/transit.retrograde-article");
const saturnHook = sourceRows.hookRows.find((row: Record<string, unknown>) => row.contentKey === "fallback-hook/transit-retro-article/saturn");
const conflictingPlacementRows = [
  ...(skyArticles.authoredCards ?? []),
  ...(skyArticles.hookRows ?? [])
].filter((row: Record<string, unknown>) => String(row.contentKey ?? "").startsWith("sky-article/saturn/"));

assert.ok(templateRecord, "The retrograde article template must exist.");
assert.ok(saturnHook, "The Saturn retrograde article hook must exist.");
assert.ok(conflictingPlacementRows.length > 0, "The regression fixture must include the Saturn placement article that previously won the wrong match.");

const map = buildCompositionMap([
  dashboardRow(templateRecord, "fallback_template"),
  dashboardRow(saturnHook, "fallback_hook"),
  ...conflictingPlacementRows.map((row: Record<string, unknown>) => dashboardRow(row, "fallback_hook"))
]);
const preview = map[0].preview;
const adminResult = {
  headline: preview.fields.find((field) => field.key === "headline")?.rendered,
  body: preview.fields.find((field) => field.key === "body")?.rendered
};
const facts = {
  planet: "saturn",
  sign: "aries",
  window: "From August 12 through September 3",
  format: "article" as const
};
const nodeResult = renderTransitRetro(facts);
const browserResult = createTransitSynastryRenderer(transitRows, templates, sourceRows).renderTransitRetro(facts);

assert.deepEqual(adminResult, { headline: nodeResult.headline, body: nodeResult.body }, "Composition Map must render the same source and substitutions as the Node runtime.");
assert.deepEqual(adminResult, { headline: browserResult.headline, body: browserResult.body }, "Composition Map must render the same source and substitutions as the browser runtime.");
assert.equal(preview.lineage, "runtime-traceable");
assert.deepEqual(preview.sources.map((source) => source.row.content_key), ["fallback-hook/transit-retro-article/saturn"]);
assert.equal(preview.sources.some((source) => source.row.content_key.startsWith("sky-article/")), false);

console.log("Admin Composition Map runtime parity passed for the retrograde-article regression path.");
