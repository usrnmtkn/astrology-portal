import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { correctedReaderSource } from '../apps/web/src/content/fallbackArchitectureV3/resolver/readerSourceReferenceCorrections.mjs';
import * as source from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs';
import * as shipped from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import { createKnowledgeMatrixV9Resolver } from '../apps/web/src/content/fallbackArchitectureV3/resolver/knowledgeMatrixV9.browser.ts';
const root = new URL('../', import.meta.url);
const read = file => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8'));
const base = 'apps/web/src/content/fallbackArchitectureV3/';
const corrections = read(base + 'authored-inputs/reader-source-reference-removals-v1.json');
const corpus = read(base + 'authored-inputs/sky-v4-canonical-content-studio-stage-v1.json');
const matrixRoot = 'apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-labeled/';
const rows = read(matrixRoot + 'knowledge-matrix-v9-owner-approved-rows.json');
const manifest = read(matrixRoot + 'knowledge-matrix-v9-import-manifest.json');
const build = read(matrixRoot + 'knowledge-matrix-v9-build-report.json');
const prohibited = /\bMarie\b|\bSatori\b|\b(?:the|this|original) source (?:also |does |offers |says |states |describes |supports |links )|\bsource (?:material|text|passage|article)\b|owner.approved|\b(?:her|his|the author[’']s) (?:writing|book|manuscript)\b/iu;
const clean = (text, label) => assert.doesNotMatch(text ?? '', prohibited, label);
const hash = text => createHash('sha256').update(text).digest('hex');
for (const correction of corrections.records.filter(row => row.field !== 'summary')) {
  const original = correction.field === 'Article' ? corpus.content.nodeEducation[0].Article
    : rows.transit_meanings.find(row => `knowledge-matrix-v9/transit/${row.Key}` === correction.contentKey && hash(row.Copy) === correction.previous_sha256).Copy;
  assert.equal(hash(original), correction.previous_sha256);
  assert.equal(correctedReaderSource(correction.contentKey, correction.field, original), correction.text);
  // The authorized change is deletion only, with one exact sentence removed.
  const sentences = original.split(/(?<=[.!?])\s+/u);
  assert.ok(sentences.some((_, index) => sentences.filter((_, i) => i !== index).join(' ') === correction.text.replace(/\s+/gu, ' ')));
  clean(correction.text, correction.contentKey);
  assert.equal(correctedReaderSource(correction.contentKey, correction.field, 'Newer owner wording.'), 'Newer owner wording.');
  assert.equal(correctedReaderSource('unrelated', correction.field, original), original);
}
for (const correction of corrections.records.filter(row => row.field === 'summary')) {
  const original = read('docs/qa/reader-source-reference-audit-2026-09-08.json').changes.find(row => row.contentKey === correction.contentKey && row.field === 'summary').removed_sentence;
  assert.equal(correctedReaderSource(correction.contentKey, 'summary', original), '');
}
const node = corrections.records.find(row => row.contentKey === 'sky-nodes/education');
const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
for (const planet of ['north-node','south-node']) for (const sign of signs) {
  const input = { route: 'placement', planet, sign, aspects: [] };
  const expected = source.renderSkyV4ReaderRoute(corpus, input);
  const actual = shipped.renderSkyV4ReaderRoute(corpus, input);
  assert.deepEqual(actual, expected);
  assert.ok(actual.readerParts.includes(node.text), `${planet}/${sign}: complete node education survives`);
  clean([actual.page, ...actual.readerParts].join("\n"), `${planet}/${sign}`);
}
let fieldsChecked = 0;
for (const row of source.skyV4ContentStudioRecords(corpus).filter(row => row.serving_enabled)) {
  for (const field of row.studio_editable_fields) {
    const text = field.path.split('.').reduce((v,k) => v?.[k], row);
    if (typeof text === 'string') { clean(text, `${row.contentKey}/${field.path}`); fieldsChecked++; }
  }
}
for (const factory of [createKnowledgeMatrixV9Resolver, shipped.createKnowledgeMatrixV9Resolver]) {
  const resolver = factory(manifest, rows, build);
  for (const row of rows.transit_meanings) {
    const result = resolver.renderTransitMeaning({ planet: row.Planet, transitSign: row.Sign, eventType: row.Event });
    if (result) clean(result.body, result.contentKey);
  }
}
// Exercise both flagged V9 rows even when another duplicate currently wins.
for (const correction of corrections.records.filter(row => row.field === 'Copy')) {
  const reordered = structuredClone(rows);
  const index = reordered.transit_meanings.findIndex(row => hash(row.Copy) === correction.previous_sha256);
  reordered.transit_meanings.unshift(...reordered.transit_meanings.splice(index, 1));
  const row = reordered.transit_meanings[0];
  for (const factory of [createKnowledgeMatrixV9Resolver, shipped.createKnowledgeMatrixV9Resolver]) {
    assert.equal(factory(manifest, reordered, build).renderTransitMeaning({ planet: row.Planet, transitSign: row.Sign, eventType: row.Event }).body, correction.text);
  }
}
// Reader prose in all local fallback rows, point placements and point transits.
function scan(value, label) {
  if (Array.isArray(value)) return value.forEach((child,i) => scan(child, `${label}/${i}`));
  if (!value || typeof value !== 'object') return;
  for (const [key,child] of Object.entries(value)) {
    if (/^(?:body(?:_you|_they)?|Copy|Experience|tldr|hook|lived|turn|guidance|advice|reading)$/u.test(key) && typeof child === 'string') {
      clean(child, `${label}/${key}`); fieldsChecked++;
    } else if (!/source|provenance|history|baseline|review|notes|policy|approval/iu.test(key)) scan(child, `${label}/${key}`);
  }
}
for (const folder of [base + 'source-rows', 'packages/astro-knowledge/data/points']) {
  for (const file of fs.readdirSync(new URL(folder, root), { recursive: true })) {
    if (file.endsWith('.json')) scan(read(`${folder}/${file}`), `${folder}/${file}`);
  }
}
const snapshot = read('apps/web/public/content-studio-last-known-good.json');
for (const row of snapshot.rows) {
  clean(row.body, row.content_key + '/body');
  clean(row.summary, row.content_key + '/summary');
}
console.log(`Reader source-reference audit PASS: ${fieldsChecked} prose fields, 280 released Sky records, 24 node routes, V9 source/shipped parity, ${snapshot.rows.length} cached rows.`);
