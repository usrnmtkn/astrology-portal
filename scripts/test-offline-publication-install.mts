import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

// The existing partitions cover the full admission index without shipping it twice.
const manifest = (name: string) => JSON.parse(readFileSync(`apps/web/src/content/fallbackArchitectureV3/${name}.json`, "utf8"));
assert.deepEqual(new Set([...manifest("bundled-core-manifest-v3").keys, ...manifest("bundled-sky-placement-manifest-v3").keys]),
  new Set(manifest("bundled-manifest-v3").keys));

const snapshot = JSON.parse(readFileSync("apps/web/public/content-studio-last-known-good.json", "utf8"));
const key = "authored/calendar-weekly-moon/taurus/variant-4";
const row = snapshot.rows.find((candidate: any) => candidate.content_key === key);
const publication = snapshot.publications.find((candidate: any) => candidate.content_key === key);
assert(row && publication);
const file = join(mkdtempSync(join(tmpdir(), "studio-offline-install-")), "reader.mjs");
await build({ stdin: { resolveDir: process.cwd(), contents: `
  export { loadContentStudioLastKnownGoodRows } from './apps/web/src/services/generatedContent.ts';
  export { loadDeferredFallbackArchitectureV3Bundle, installFallbackArchitectureV3Bundle,
    transitSynastryFallbackRendererV3 } from './apps/web/src/content/fallbackArchitectureV3Runtime.ts';
  export { installContentPublications, subscribeToContentPublications } from './apps/web/src/content/contentPublicationState.ts';
` }, bundle: true, platform: "node", format: "esm", outfile: file,
  define: { "import.meta.env": "{}" }, logLevel: "silent" });
const qa = await import(pathToFileURL(file).href);
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
let now = originalNow();
const originalSnapshot = { schema: snapshot.schema, rowCount: 1, rows: [row], publications: [publication] };
let servedSnapshot = originalSnapshot;
Date.now = () => now;
globalThis.fetch = async input => {
  assert.equal(String(input), "/content-studio-last-known-good.json");
  return Response.json(servedSnapshot);
};
try {
  await qa.loadDeferredFallbackArchitectureV3Bundle();
  const observed: string[] = [];
  const stop = qa.subscribeToContentPublications(() => {
    try { observed.push(qa.transitSynastryFallbackRendererV3.renderWeeklyMoon({ sign: "taurus", variant: 4 }).body); }
    catch { observed.push("SOURCE_GAP"); }
  });
  await qa.loadContentStudioLastKnownGoodRows();
  stop();
  assert.deepEqual(observed, [row.body], "Publication listeners must see the matching snapshot passage immediately");
  assert.equal(qa.transitSynastryFallbackRendererV3.renderWeeklyMoon({ sign: "taurus", variant: 4 }).body, row.body);

  const updatedAt = "2026-09-11T12:00:00.000Z";
  const snapshotRow = { ...row, id: "newer-offline-row", updated_at: updatedAt, body: "QA newer offline passage." };
  servedSnapshot = { ...originalSnapshot, rows: [snapshotRow], publications: [{ ...publication,
    revision: publication.revision + 1, row_id: snapshotRow.id, row_updated_at: updatedAt, updated_at: updatedAt }] };
  now += 360_000;
  await qa.loadContentStudioLastKnownGoodRows();
  assert.equal(qa.transitSynastryFallbackRendererV3.renderWeeklyMoon({ sign: "taurus", variant: 4 }).body, snapshotRow.body);
  servedSnapshot = originalSnapshot;
  now += 360_000;
  await qa.loadContentStudioLastKnownGoodRows();
  assert.equal(qa.transitSynastryFallbackRendererV3.renderWeeklyMoon({ sign: "taurus", variant: 4 }).body, snapshotRow.body,
    "An older snapshot must preserve a newer previously verified offline passage");
  const newer = { ...row.sections.packageRecord, contentKey: key, content_role: "full_copy", review_status: "approved",
    body: "QA newer published passage.", publicationRowId: "newer-moon-row", publicationRowUpdatedAt: updatedAt };
  qa.installFallbackArchitectureV3Bundle({ transitLib: { authoredCards: [newer] }, templatesFile: { templates: [] }, rowsFile: { hookRows: [], vocabularyRows: [] } });
  qa.installContentPublications([{ ...publication, revision: publication.revision + 2, row_id: newer.publicationRowId,
    row_updated_at: updatedAt, updated_at: updatedAt }]);
  now += 360_000;
  await qa.loadContentStudioLastKnownGoodRows();
  assert.equal(qa.transitSynastryFallbackRendererV3.renderWeeklyMoon({ sign: "taurus", variant: 4 }).body, newer.body,
    "An older offline snapshot must not displace an installed newer publication");
  qa.installContentPublications([{ ...publication, revision: publication.revision + 3, state: "retired", row_id: null, row_updated_at: null, updated_at: updatedAt }]);
  now += 360_000;
  await qa.loadContentStudioLastKnownGoodRows();
  assert.throws(() => qa.transitSynastryFallbackRendererV3.renderWeeklyMoon({ sign: "taurus", variant: 4 }),
    /SOURCE_GAP/, "An older offline snapshot must not revive a retired passage");
  console.log("PASS atomic offline passage/publication installation, newer live precedence, and retirement preservation");
} finally { globalThis.fetch = originalFetch; Date.now = originalNow; }
