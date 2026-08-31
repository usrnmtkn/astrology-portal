import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildCompositionMap, type CompositionMapRow } from "../apps/admin/src/compositionMap";

const outputPath = path.join(os.tmpdir(), `tldr-composition-catalog-${process.pid}.json`);
const materialize = spawnSync(process.execPath, [
  "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs",
  `--out=${outputPath}`
], { cwd: process.cwd(), encoding: "utf8" });
if (materialize.status !== 0) {
  throw new Error(`Could not materialize the Composition Map catalog:\n${materialize.stdout}\n${materialize.stderr}`);
}

try {
  const payload = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  const rows = payload.rows as CompositionMapRow[];
  const map = buildCompositionMap(rows);
  assert.equal(map.length, payload.counts.templates, "Every materialized template must appear in Composition Map.");
  assert.ok(map.length > 0);

  for (const template of map) {
    assert.ok(template.preview.fields.length > 0, `${template.row.content_key} must expose at least one reader-facing field.`);
    for (const field of template.preview.fields) {
      const optionalSection = /^\{\{#[^}]+\}\}[\s\S]*\{\{\/[^}]+\}\}$/u.test(field.template.trim());
      assert.ok(field.rendered.trim() || optionalSection, `${template.row.content_key}/${field.key} must not render empty unless the entire field is an optional section.`);
      assert.equal(field.rendered.includes("{{"), false, `${template.row.content_key}/${field.key} must not expose unresolved tokens.`);
    }
    for (const source of template.preview.sources) {
      const matchingSlots = template.slots.filter((slot) => slot.sources.some((candidate) => candidate.row.content_key === source.row.content_key));
      assert.ok(matchingSlots.length > 0, `${template.row.content_key} preview source ${source.row.content_key} must belong to a declared slot.`);
      assert.ok(matchingSlots.some((slot) => slot.sourceContract.prefixes.some((prefix) => source.row.content_key.startsWith(prefix))), `${template.row.content_key} preview source ${source.row.content_key} must stay inside its resolver contract.`);
      assert.ok(rows.some((row) => row.id === source.row.id && row.content_key === source.row.content_key), `${source.row.content_key} must deep-link to a real catalog row.`);
    }
    if (template.preview.lineage === "runtime-traceable") {
      const requiredSaved = template.slots.filter((slot) => slot.requirement === "Required" && slot.sourceKind === "saved-copy");
      assert.ok(requiredSaved.every((slot) => slot.sourceContract.confidence !== "inferred"), `${template.row.content_key} cannot claim traceability from inferred namespaces.`);
    } else {
      assert.match(template.preview.lineageNote, /cannot be proven/iu, `${template.row.content_key} must explain incomplete lineage.`);
    }
  }

  const retrogradeArticle = map.find((template) => template.row.content_key === "fallback-template/transit.retrograde-article");
  assert.ok(retrogradeArticle);
  assert.equal(retrogradeArticle.preview.lineage, "runtime-traceable");
  assert.deepEqual(retrogradeArticle.preview.sources.map((source) => source.row.content_key), ["fallback-hook/transit-retro-article/saturn"]);
  assert.equal(retrogradeArticle.preview.fields.find((field) => field.key === "headline")?.rendered, "The shortcut always sends the bill later.");

  const incomplete = map.filter((template) => template.preview.lineage === "not-traceable");
  console.log(`Admin Composition Map catalog audit passed (${map.length} templates, ${map.length - incomplete.length} traceable previews, ${incomplete.length} honestly flagged).`);
} finally {
  fs.rmSync(outputPath, { force: true });
}
