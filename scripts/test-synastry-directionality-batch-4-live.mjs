import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { releaseSynastryDirections, sha256 } from './release-synastry-directionality.mjs';
import { classifySynastryDirectionality } from './synastry-directionality-human-review.mjs';
import { createTransitSynastryRenderer } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import { renderSynastryAspect } from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs';
const root = 'apps/web/src/content/fallbackArchitectureV3';
const read = path => JSON.parse(fs.readFileSync(`${root}/${path}`, 'utf8'));
const source = read('source-rows/fallback-source-rows-v3.json');
const release = read('authored-inputs/synastry-directionality-live-v1.json');
const bundled = read('bundled-relationship-hook-rows-v3.json');
const templates = read('templates/fallback-templates-v3.json');
const lib = read('source-rows/transit-synastry-rows-v1.json');
const compiled = await build({ entryPoints: [`${root}/resolver/renderTransitSynastry.browser.ts`], bundle: true, format: 'esm', platform: 'browser', write: false });
const browser = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const renderers = [
  { renderSynastryAspect },
  browser.createTransitSynastryRenderer(lib, templates, source),
  createTransitSynastryRenderer(lib, templates, { hookRows: bundled.hookRows, vocabularyRows: source.vocabularyRows })
];
const synastry = source.hookRows.filter(r => r.contentKey.startsWith('fallback-hook/synastry-pair/'));
assert.equal(synastry.length, 483);
assert.equal(new Set(synastry.map(r => r.contentKey)).size, 483);
const counts = {};
for (const row of synastry) { const action = classifySynastryDirectionality(row.contentKey).action; counts[action] = (counts[action] ?? 0) + 1; }
assert.deepEqual(counts, { AUTHOR_REVERSE: 397, RECIPROCAL_NO_REVERSE: 76, NEEDS_DIRECTION_REVIEW: 10 });
assert.equal(release.rows.length, 24);
assert.deepEqual(releaseSynastryDirections(source.hookRows, release), source.hookRows);
for (const patch of release.rows) {
  const row = synastry.find(r => r.contentKey === patch.contentKey);
  assert.equal(row.body_you, patch.body_you);
  assert.equal(sha256(row.body_you), patch.approved_body_sha256);
  assert.equal(sha256(row.body_they), patch.expected_before_sha256.body_they);
  const shipped = bundled.hookRows.find(r => r.contentKey === row.contentKey);
  assert.equal(shipped.body_you, row.body_you);
  assert.equal(shipped.body_they, row.body_they);
  const [, , first, second, group] = patch.contentKey.split('/');
  for (const aspect of group === 'hard' ? ['square', 'opposition'] : group === 'soft' ? ['trine', 'sextile'] : ['conjunction']) {
    for (const inverse of [false, true]) {
      for (const name of ['Sofia', '{{Name}}']) {
        const facts = { planetA: inverse ? second : first, planetB: inverse ? first : second, aspect, otherName: name };
        const results = renderers.map(r => r.renderSynastryAspect(facts));
        for (const result of results) {
          assert.equal(result.contentKey, patch.contentKey);
          assert.equal(result.body, results[0].body, `${patch.contentKey}: Node/browser/dist drift`);
          assert.doesNotMatch(result.body, /\{\{holder[12]/);
          if (!inverse) assert.equal(result.body, patch.body_you.replaceAll('{{holder2}}', name));
          if (name !== '{{Name}}') assert.doesNotMatch(result.body, /\{\{/);
        }
      }
    }
  }
}
// The release guard must refuse unapproved changes even on an idempotent rerun.
for (const field of ['body_you', 'body_they']) {
  const changed = structuredClone(source.hookRows);
  changed.find(r => r.contentKey === release.rows[0].contentKey)[field] += ' Unexpected edit.';
  assert.throws(() => releaseSynastryDirections(changed, release), /changed|conflicting/);
}
for (const action of ['RECIPROCAL_NO_REVERSE', 'NEEDS_DIRECTION_REVIEW']) {
  for (const row of synastry.filter(r => classifySynastryDirectionality(r.contentKey).action === action)) {
    const invalid = { ...release, rows: [{ ...release.rows[0], contentKey: row.contentKey }] };
    assert.throws(() => releaseSynastryDirections(source.hookRows, invalid), new RegExp(action));
  }
}
// Synthetic approved fixture exercises the opposite storage orientation without publishing it.
const key = 'fallback-hook/synastry-pair/sun/saturn/conjunction';
const base = source.hookRows.find(r => r.contentKey === key);
const body = '{{holder1}} test-only reverse fixture.';
const patch = { contentKey: key, ...classifySynastryDirectionality(key), body_they: body, expected_before_sha256: { body_you: sha256(base.body_you), body_they: sha256(base.body_they) }, approved_body_sha256: sha256(body) };
const result = releaseSynastryDirections([base], { ...release, rows: [patch] })[0];
assert.equal(result.body_you, base.body_you);
assert.equal(result.body_they, body);
assert.throws(() => releaseSynastryDirections([base], { ...release, rows: [{ ...patch, body_you: 'overwrite' }] }), /must preserve/);
assert.throws(() => releaseSynastryDirections([base], { ...release, rows: [{ ...patch, missingSemanticDirection: 'saturn_to_sun' }] }), /map mismatch/);
assert.throws(() => releaseSynastryDirections([base], { ...release, rows: [{ ...patch, body_they: 'unapproved' }] }), /hash mismatch/);
console.log('PASS: 24 canonical releases, Node/browser/dist, 80 aspect orientations, placeholders, preserved hashes, 76 reciprocal + 10 unresolved refusals, both target fields.');

const studio = JSON.parse(fs.readFileSync('packages/astro-knowledge/review/synastry-directionality-batch-4-live-2026-09-10/content-studio-parity.json', 'utf8'));
assert.equal(studio.rows.length, 24);
for (const patch of release.rows) {
 const live = studio.rows.find(r => r.content_key === patch.contentKey);
 assert.equal(live.status, 'LIVE'); assert.equal(live.lane, 'serving'); assert.equal(live.review_state, null);
 assert.equal(live.body_you_sha256, patch.approved_body_sha256);
 assert.equal(live.body_they_sha256, patch.expected_before_sha256.body_they);
 assert.equal(live.package_body_you_sha256, live.body_you_sha256);
 assert.equal(live.package_body_they_sha256, live.body_they_sha256);
}
console.log('PASS: live Content Studio field + packageRecord hashes match all 24 canonical rows in both directions.');
