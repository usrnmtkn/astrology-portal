#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const records = fs.readFileSync("api/_lib/serving-package-records.ts", "utf8");
const liveStatus = fs.readFileSync("api/_lib/content-live-status.ts", "utf8");
const packageSource = fs.readFileSync("api/admin/package-source.ts", "utf8");
const inventory = fs.readFileSync("api/admin/generated-content-inventory.ts", "utf8");
const client = fs.readFileSync("apps/admin/src/generatedContentClient.ts", "utf8");
const vercel = fs.readFileSync("vercel.json", "utf8");

assert.doesNotMatch(records, /astro101|content-live-status|tldr-content/u, "Serving package records must not boot live-status or Astro 101.");
assert.match(liveStatus, /from "\.\/serving-package-records\.js"/u);
assert.match(packageSource, /serving-package-records/u);
assert.doesNotMatch(packageSource, /generated-content-libraries|content-live-status|astro101/u);
assert.match(packageSource, /A single contentKey is required for package source lookup/u);
assert.match(inventory, /allowedStatus/u);
assert.match(inventory, /allowedSurface/u);
assert.match(inventory, /boundedLimit\(requestUrl\.searchParams\.get\("limit"\), 50, 200\)/u);
assert.match(client, /studioInventoryDocumentPath/u);
assert.match(client, /studioPackageSourcePath/u);
assert.match(client, /\/api\/admin\/package-source\?contentKey=/u);
assert.match(client, /status: extras\.status \?\? "all"/u);
assert.match(client, /studioInventoryDocumentPath\(row\.content_key, \{ status: "DRAFT"/u);
assert.match(vercel, /"api\/admin\/package-source\.ts"/u);

const { servingPackageRecords } = await import("../api/_lib/serving-package-records.ts");
assert.ok(servingPackageRecords.get("authored/transit-aspect/sun/north-node/conjunction"), "You-serving transit package records must be readable without content-live-status.");

console.log("Content Studio slim package-source read contract passed.");

const { createApiStore } = await import('../tests/helpers/calendar-review-api.mjs');
const { readStudioContentDocument, saveGeneratedContentDraft } = await import('../apps/admin/src/generatedContentClient.ts');
const { effectivePackageRecord } = await import('../apps/admin/src/skyFallbackWorkspace.ts');
const { mergeStudioPackagePatch } = await import('../src/shared/studioPackagePatch.ts');
const { csvRecordForRow, csvDraftPatch } = await import('../apps/admin/src/studioCsv.ts');

// Read the export through its authenticated handler, using raw sparse storage
// rather than the inventory's hydrated projection.
const exportKey = 'fallback-hook/house-meaning/4';
for (const pending of [false, true]) for (const clear of [undefined, '', null]) {
  const patch = { body: 'Exact synthetic primary edit.\n\nExact synthetic final sentence.', ...(clear === undefined ? {} : { body_you: clear, body_they: clear }) };
  const source = { id: 'partial-export-fixture', content_key: exportKey, status: pending ? 'DRAFT' : 'LIVE', updated_at: '2026-10-01T12:00:00Z', sections: { packageRecord: pending ? {} : patch, ...(pending ? { packageDraft: patch } : {}) } };
  const unchanged = structuredClone(source);
  const store = await createApiStore([source]);
  try {
    const response = await store.invoke('GET', undefined, `/api/admin/generated-content?variables=export&sourceKey=${encodeURIComponent(exportKey)}`);
    assert.equal(response.status, 200);
    const rows = response.payload.rows.filter(row => row.token === '{{houseMeaning}}' && row.version === (pending ? 'Saved draft' : 'Saved live'));
    assert.equal(rows.find(row => row.field === 'body_you')?.content, clear === undefined ? patch.body : '');
    assert.equal(rows.find(row => row.field === 'body_they')?.content, clear === undefined ? servingPackageRecords.get(exportKey).body_they : '');
    assert.deepEqual(store.rows.get(source.id), unchanged, 'Export must not write hydrated text into storage.');
  } finally { await store.close(); }
}

// Both source-card reads and subsequent saves use actual authenticated handlers.
// All requests below are isolated; the transport refuses an external destination.
for (const [key, field] of [
  ['authored/transit-aspect/sun/north-node/conjunction', 'body_you'],
  ['fallback-hook/synastry-pair/sun/moon/soft', 'body_you'],
  ['fallback-template/natal.angle-in-sign', 'body'],
  ['sky-lilith/article/capricorn', 'LilithArticle']
]) {
  const baseline = servingPackageRecords.get(key);
  const original = { contentKey: key, content_role: baseline.content_role, review_status: 'needs_review', owner_approved: false, serving_enabled: false };
  const source = { id: 'source-inheritance-fixture', content_key: key, surface: 'sky', mode: 'in_depth', status: 'LIVE', lane: 'serving',
    headline: 'Synthetic source', summary: '', body: '', event_type: 'fallback-hook', block_type: 'fallback_hook',
    provider: 'tldrastro-fallback-architecture-v3', updated_at: '2026-10-01T12:00:00.123456Z', target_date: null,
    sections: { packageRecord: original, retainedMetadata: { source: 'exact saved metadata' } },
    source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3' }, facts: { fallbackArchitectureV3: true } };
  const unchanged = structuredClone(source);
  const store = await createApiStore([source]);
  const storageFetch = globalThis.fetch;
  globalThis.fetch = async (input, options = {}) => {
    const path = String(input);
    if (!path.startsWith('/api/admin/')) return storageFetch(input, options);
    const result = await store.invoke(options.method ?? 'GET', options.body ? JSON.parse(String(options.body)) : undefined, path);
    return Response.json(result.payload, { status: result.status });
  };
  try {
    const opened = (await readStudioContentDocument(key, 'calendar-api-fixture')).rows[0];
    assert.equal(effectivePackageRecord(opened.sections)[field], baseline[field], key);
    assert.deepEqual(store.rows.get(source.id), unchanged);
    const edited = 'During this transit, synthetic saved source opening.\n\nComplete synthetic final sentence.';
    const draft = await saveGeneratedContentDraft(opened, { ...opened.sections,
      packageDraft: { ...effectivePackageRecord(opened.sections), [field]: edited } }, 'calendar-api-fixture');
    assert.equal(draft.status, 'DRAFT');
    assert.deepEqual(store.rows.get(source.id), unchanged, 'Saving preserves the live parent.');
    assert.deepEqual(draft.sections.packageOriginalRecord, original);
    const reopened = (await readStudioContentDocument(key, 'calendar-api-fixture')).rows[0];
    assert.equal(effectivePackageRecord(reopened.sections)[field], edited);
    await assert.rejects(() => saveGeneratedContentDraft(opened, { ...opened.sections, packageDraft: { [field]: 'Synthetic stale edit.' } }, 'calendar-api-fixture'), /changed|newer|reload|revision|draft/i);
    const cleared = await saveGeneratedContentDraft(reopened, { ...reopened.sections, packageDraft: { ...effectivePackageRecord(reopened.sections), [field]: '' } }, 'calendar-api-fixture');
    const blank = (await readStudioContentDocument(key, 'calendar-api-fixture')).rows[0];
    assert.equal(effectivePackageRecord(blank.sections)[field], '', 'Explicit saved clears survive lookup and reload.');
    assert.equal(cleared.status, 'DRAFT');
    assert.deepEqual(store.rows.get(source.id), unchanged);
    assert.equal(blank.sections.packageRecord.serving_enabled, false);
  } finally { globalThis.fetch = storageFetch; await store.close(); }
}

const nested = { era_layer: { frame: 'Original frame.', handoff: 'Complete unchanged handoff.' }, blocks: [{ body: 'Complete original block.' }], ingress: { enabled: true, sources: { retained: true } } };
for (const value of ['', null, [], {}]) {
  const result = mergeStudioPackagePatch(nested, { era_layer: { frame: value }, blocks: [], ingress: {} });
  assert.deepEqual(result.era_layer.frame, value);
  assert.equal(result.era_layer.handoff, nested.era_layer.handoff);
  assert.deepEqual(result.blocks, []);
  assert.deepEqual(result.ingress, {});
  assert.deepEqual(effectivePackageRecord({ packageRecord: nested, packageDraft: { era_layer: value } }).era_layer, value);
}
const csvRow = { id: 'nested-csv', content_key: 'cms/synthetic/nested', status: 'DRAFT', updated_at: '2026-10-01T12:00:00Z',
  sections: { packageRecord: { ...nested, studio_editable_fields: [{ path: 'era_layer.frame' }, { path: 'era_layer.handoff' }] }, packageDraft: { era_layer: { frame: '' } } } };
const csv = csvRecordForRow(csvRow);
assert.equal(csv['era_layer.frame'], '');
assert.equal(csv['era_layer.handoff'], nested.era_layer.handoff);
const csvPatch = csvDraftPatch(csvRow, { ...csv, 'era_layer.frame': 'Exact synthetic CSV edit.' });
assert.deepEqual(csvPatch.sections.packageDraft.era_layer, { frame: 'Exact synthetic CSV edit.', handoff: nested.era_layer.handoff });
assert.deepEqual(nested.blocks, [{ body: 'Complete original block.' }]);
const independent = mergeStudioPackagePatch(nested, {});
independent.era_layer.frame = 'Unsaved synthetic local edit.';
independent.blocks[0].body = 'Unsaved synthetic local block.';
assert.equal(nested.era_layer.frame, 'Original frame.');
assert.equal(nested.blocks[0].body, 'Complete original block.');
console.log('PASS: generic partial-source read/edit/reload, exact originals, explicit clears, stale-save protection and nested CSV preservation across four content types.');
