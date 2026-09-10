import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { compositionSurfaceFamilies, compositionSourcesForSurface } from "../apps/admin/src/compositionSurfaceSources";
import { buildCompositionMap, type CompositionMapRow } from "../apps/admin/src/compositionMap";
import { isRetiredCompositionKey } from "../apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs";

const temp = path.join(os.tmpdir(), `composition-lifecycle-${process.pid}.json`);
try {
  execFileSync(process.execPath, ["scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs", `--out=${temp}`], { stdio: "pipe" });
  const mirror = JSON.parse(fs.readFileSync(temp, "utf8"));
  const rows: CompositionMapRow[] = mirror.rows.map((row: CompositionMapRow) => ({ ...row, id: row.content_key }));
  const maps = buildCompositionMap(rows);
  const retired = mirror.rows.filter((row: { content_key: string }) => isRetiredCompositionKey(row.content_key));
  for (const row of retired) {
    assert.equal(row.status, "DRAFT");
    assert.equal(row.lane, "reference");
    assert.equal(row.sections.packageRecord.serving_enabled, false);
  }
  const surfaces = Object.keys(compositionSurfaceFamilies).map((id) => ({
    id, sourceCount: compositionSourcesForSurface(id, rows, maps).length,
    retiredSourceCount: compositionSourcesForSurface(id, rows, maps).filter((row) => isRetiredCompositionKey(row.content_key)).length
  }));
  assert.equal(surfaces.length, 24);
  assert.ok(surfaces.every((surface) => surface.retiredSourceCount === 0));
  const pkg = "apps/web/src/content/fallbackArchitectureV3";
  const shippedFiles = fs.readdirSync(pkg).filter((file) => file.startsWith("bundled-") && file.endsWith(".json"));
  for (const file of shippedFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(pkg, file), "utf8"));
    const visit = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      const object = value as Record<string, unknown>;
      assert.equal(isRetiredCompositionKey(object.contentKey), false, `${file}: retired row ships`);
      Object.values(object).forEach(visit);
    };
    visit(data);
  }
  function sources(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) return ["dist", "node_modules", "fallbackArchitectureV3"].includes(entry.name) ? [] : sources(file);
      return /\.(tsx?|mjs)$/u.test(entry.name) ? [file] : [];
    });
  }
  const files = [...sources("apps/web/src"), ...sources("apps/admin/src"), ...sources("api")];
  const texts = files.map((file) => ({ file, text: fs.readFileSync(file, "utf8") }));
  for (const { file, text } of texts) assert.doesNotMatch(text, /renderTransitHouseEvent|skyArticleAspectPassageForTransit|personalTransitAspectCmsStarter/u, file);
  const resolver = fs.readFileSync(`${pkg}/resolver/renderTransitSynastry.browser.ts`, "utf8");
  const methods = [...resolver.matchAll(/^  function (render\w+)\(/gmu)].map((match) => match[1]);
  const capabilities = methods.map((method) => ({ method, consumers: texts.filter(({ text }) => text.includes(`${method}(`)).map(({ file }) => file) }));
  const report = {
    date: "2026-09-10", packageVersion: "v3-2026-09-10f", scope: "24 surface source maps, materialized Studio mirror, shipped row partitions, resolver consumers; no production database writes",
    superseded: ["house-first transit composition", "Studio four-source reconstruction", "personal-aspect CMS overrides", "compiled Sky natal-aspect fallback selector"],
    retiredSourceKeys: retired.map((row: { content_key: string }) => row.content_key),
    retained: ["Approved exact transit and return units", "Reviewed fallback wants/natal/scenes/effects used after exact lookup", "House introductory and sign writing", "Immutable historical Sky article editions", "Governed generation pipeline and its meaning-plan prompt", "Other active surface composers; missing direct calls alone do not prove a public package export is safe to delete"],
    surfaces, capabilities
  };
  fs.writeFileSync("docs/qa/composition-lifecycle-audit-2026-09-10.json", JSON.stringify(report, null, 2) + "\n");
  console.log(`Composition lifecycle audit passed: ${surfaces.length} surface maps, ${retired.length} reference-only retired rows, ${shippedFiles.length} clean shipped indexes/partitions, ${capabilities.length} resolver capabilities inventoried.`);
} finally { fs.rmSync(temp, { force: true }); }
