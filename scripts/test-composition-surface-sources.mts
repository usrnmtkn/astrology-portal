import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { compositionSurfaceFamilies, compositionSourcesForSurface } from "../apps/admin/src/compositionSurfaceSources";
import { writingSurfaceSourceMap } from "../apps/admin/src/writingSurfaceSourceMap";
import { buildCompositionMap, buildCompositionTemplate, type CompositionMapRow } from "../apps/admin/src/compositionMap";
const target = path.join(os.tmpdir(), `composition-sources-${process.pid}.json`);
try {
  execFileSync(process.execPath, ["scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs", `--out=${target}`]);
  const rows: CompositionMapRow[] = JSON.parse(fs.readFileSync(target, "utf8")).rows.map((row: CompositionMapRow) => ({ ...row, id: row.content_key }));
  assert.deepEqual(Object.keys(compositionSurfaceFamilies).sort(), writingSurfaceSourceMap.map((item) => item.id).sort());
  const maps = buildCompositionMap(rows);
  const coverage = new Set(writingSurfaceSourceMap.flatMap((surface) => compositionSourcesForSurface(surface.id, rows, maps).map((row) => row.content_key)));
  const hooks = rows.filter((row) => row.content_key.startsWith("fallback-hook/"));
  for (const row of hooks) assert.ok(coverage.has(row.content_key), `${row.content_key} needs a surface Composition Map contract`);
  for (const [surface, key] of [
    ["friends-pair-daily", "fallback-hook/pair-daily/opener"],
    ["natal-placement-detail", "fallback-hook/natal-you-placement-sign-final/uranus/scorpio"],
    ["natal-empty-house", "fallback-hook/empty-house-explainer/base"],
    ["sky-placement-detail", "fallback-hook/sky-placement-frame/jupiter"]
  ]) {
    const existing = rows.find((row) => row.content_key === key);
    if (existing) assert.ok(compositionSourcesForSurface(surface, rows, maps).includes(existing));
  }
  const template = rows.find((row) => row.content_key === "fallback-template/natal.planet-in-sign")!;
  const selected = buildCompositionTemplate(template, rows, { exampleValues: { planetTitle: "Uranus", signTitle: "Scorpio" }, includeOptionalSources: true });
  assert.ok(selected.preview.facts.some((fact) => fact.name === "planetTitle" && fact.value === "Uranus"));
  const revision = buildCompositionTemplate({ ...template, sections: { ...(template.sections as object), packageDraft: { body_you: "EDITED TEMPLATE {{planetTitle}}" } } }, rows);
  assert.ok(revision.preview.fields.some((field) => field.rendered.includes("EDITED TEMPLATE")), "Saved template drafts must not preview an older packageRecord");
  console.log(`Composition surface coverage passed: ${hooks.length} hooks across ${writingSurfaceSourceMap.length} maps.`);
} finally { fs.rmSync(target, { force: true }); }
