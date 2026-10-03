import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { moonStudioRows } from "../tests/helpers/sky-moon-studio";
import { createApiStore } from "../tests/helpers/calendar-review-api.mjs";
import { skyMoonWriteupKeys } from "../apps/admin/src/skyMoonWriteup";
import { skyPlacementSigns, skyWriteupContextForRow, skyWriteupSubjectTypeForRow } from "../apps/admin/src/skyWriteupRelations";
import { skyPlacementAssembly } from "../apps/admin/src/skyPlacementAssembly";
import { isSkyWriteupContentRow } from "../apps/admin/src/articleWorkspace";
import { studioInventoryQuery } from "../apps/admin/src/studioSectionInventory";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const originals = moonStudioRows();
const snapshot = JSON.stringify(originals);
const store = await createApiStore(originals);
const runtimeDirectory = mkdtempSync(join(tmpdir(), "moon-studio-reader-"));
try {
  const prefixes = studioInventoryQuery({ page: "skyWriteups" }).prefixes;
  const listed = [];
  for (const prefix of prefixes) {
    const result = await store.invoke("GET", undefined, `/api/admin/generated-content-inventory?contentKeyPrefix=${encodeURIComponent(prefix)}&status=all&visibility=all`);
    assert.equal(result.status, 200);
    listed.push(...result.payload.rows);
  }
  assert.equal(listed.length, 36, "All twelve complete write-ups are discoverable in Sky Write-ups without Show reference.");
  for (const sign of skyPlacementSigns) {
    const keys = skyMoonWriteupKeys(sign);
    const sources = originals.filter(row => keys.includes(row.content_key));
    for (const row of sources) {
      assert(isSkyWriteupContentRow(row));
      assert.deepEqual(skyWriteupContextForRow(row), { planet: "moon", sign });
      assert.equal(skyWriteupSubjectTypeForRow(row), "planet");
      const detail = await store.invoke("GET", undefined, `/api/admin/generated-content-inventory?contentKey=${encodeURIComponent(row.content_key)}`);
      assert.equal(detail.payload.rows[0].sections.packageRecord.body_you, row.body);
    }
    const parts = skyPlacementAssembly(sources as any, "article").parts;
    assert.deepEqual(parts.map(part => part.row.content_key), keys);
    assert.deepEqual(parts.map(part => part.label), ["Opening", "How it shows up", "Challenge and response"]);
    assert.deepEqual(parts.map(part => part.value), sources.map(row => row.body));
    const renderer = createTransitSynastryRenderer({ authoredCards: [] }, { templates: [] }, {
      hookRows: sources.map(row => row.sections.packageRecord), vocabularyRows: []
    });
    const rendered = renderer.renderSkyPlacement({ planet: "moon", sign, entryDate: "October 2, 2026", exitDate: "October 4, 2026", events: [] });
    assert.equal(rendered.body, parts.map(part => part.value.replaceAll("{{entryDate}}", "October 2").replaceAll("{{exitDate}}", "October 4")).join("\n\n"));
  }
  assert.equal(store.rows.size, 36, "Reading never inserts a draft.");
  const keys = skyMoonWriteupKeys("cancer");
  for (const key of keys) {
    const row = originals.find(row => row.content_key === key)!;
    const body = `Synthetic ${key.split("/")[1]} opening.\n\nSynthetic complete final sentence.`;
    const saved = await store.invoke("PATCH", { id: row.id, expectedUpdatedAt: row.updated_at, reviewStatus: "needs_review",
      sections: { ...row.sections, packageDraft: { ...row.sections.packageRecord, body_you: body } } });
    assert.equal(saved.status, 200, JSON.stringify(saved.payload));
    const draft = saved.payload.rows[0];
    const readback = await store.invoke("GET", undefined, `/api/admin/generated-content-inventory?contentKey=${encodeURIComponent(key)}`);
    assert.equal(skyPlacementAssembly(readback.payload.rows, "article").parts[0].value, body);
    assert.equal(readback.payload.rows[0].sections.packageDraft.body_they, row.sections.packageRecord.body_they);
    const published = await store.invoke("PATCH", { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: "approve-package-revision" });
    assert.equal(published.status, 200, JSON.stringify(published.payload));
    assert.equal(published.payload.rows[0].sections.packageRecord.body_you, body);
    assert.equal(published.payload.rows[0].status, "LIVE");
    const stale = await store.invoke("PATCH", { id: row.id, expectedUpdatedAt: row.updated_at, body: "Stale replacement" });
    assert.equal(stale.status, 409);
  }
  for (const row of originals.filter(row => !keys.includes(row.content_key))) assert.deepEqual(store.rows.get(row.id), row);
  const bundlePath = join(runtimeDirectory, "reader.mjs");
  await build({ bundle: true, format: "esm", platform: "node", outfile: bundlePath, logLevel: "silent",
    define: { "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: "https://calendar-api.invalid", VITE_SUPABASE_PUBLISHABLE_KEY: "moon-studio-fixture" }) },
    stdin: { loader: "ts", resolveDir: process.cwd(), contents: `
      export { loadFallbackArchitectureV3SkyPlacementDashboardBundle } from "./apps/web/src/services/generatedContent.ts";
      export { loadSkyPlacementFallbackArchitectureV3Bundle, installSkyPlacementFallbackArchitectureV3Bundle, transitSynastryFallbackRendererV3 } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
    ` }
  });
  const runtime = await import(pathToFileURL(bundlePath).href);
  const publishedBundle = await runtime.loadFallbackArchitectureV3SkyPlacementDashboardBundle();
  assert(publishedBundle, "The actual reader loader must return the published Moon sources.");
  runtime.installSkyPlacementFallbackArchitectureV3Bundle(publishedBundle);
  await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
  const actual = runtime.transitSynastryFallbackRendererV3.renderSkyPlacement({ planet: "moon", sign: "cancer", entryDate: "October 2, 2026", exitDate: "October 4, 2026", events: [] });
  assert.equal(actual.body, keys.map(key => [...store.rows.values()].find(row => row.content_key === key && row.status === "LIVE")!.sections.packageRecord.body_you).join("\n\n"), "Publication must reach the installed reader through the real loader, in full.");
  assert.equal(JSON.stringify(originals), snapshot, "Approved source corpus is unchanged.");
  assert.equal((await store.invoke("GET", undefined, "/api/admin/generated-content-inventory?contentKeyPrefix=fallback-hook/sky-placement-hook/moon/", "invalid")).status, 401);
  console.log("PASS: twelve complete Moon write-ups, reader-order parity, actual inventory/detail/save/publication/reader loader, sibling preservation, stale-write and access checks.");
} finally { store.close(); rmSync(runtimeDirectory, { recursive: true, force: true }); }
