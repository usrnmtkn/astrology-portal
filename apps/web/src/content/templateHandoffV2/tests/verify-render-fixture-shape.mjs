import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const fixtureSet = readJson('fixtures/render-contract-fixtures.json');
const contract = readJson('contracts/EXECUTABLE-TEMPLATE-CONTRACT.json');

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const ids = new Set();

for (const fixture of fixtureSet.fixtures) {
  assert(!ids.has(fixture.id), `Duplicate fixture id: ${fixture.id}`);
  ids.add(fixture.id);

  const family = contract.families[fixture.templateFamily];
  assert(family, `Unknown family for ${fixture.id}: ${fixture.templateFamily}`);
  const mode = family[fixture.mode];
  assert(mode, `Unknown mode for ${fixture.id}: ${fixture.mode}`);

  if (fixture.status === 'SOURCE_GAP') {
    assert.equal(fixture.primarySource, null);
    assert.deepEqual(fixture.renderedFields, {});
    continue;
  }

  assert.equal(fixture.sourceTier, 'REVIEWED_RECORD', `${fixture.id} must be reviewed`);
  assert(fixture.primarySource, `${fixture.id} is missing a primary source`);
  for (const field of mode.required ?? []) {
    assert(fixture.renderedFields[field], `${fixture.id} missing required field ${field}`);
  }
  for (const field of mode.forbidden ?? []) {
    assert(!(field in fixture.renderedFields), `${fixture.id} contains forbidden field ${field}`);
  }

  const values = Object.values(fixture.renderedFields).filter((value) => typeof value === 'string');
  const normalized = values.map(normalize);
  assert.equal(new Set(normalized).size, normalized.length, `${fixture.id} repeats a rendered field value`);
  if (fixture.renderedFields.compactSummary && fixture.renderedFields.expandedNarrative) {
    assert.notEqual(normalize(fixture.renderedFields.compactSummary), normalize(fixture.renderedFields.expandedNarrative), `${fixture.id} compact equals expanded`);
  }
}

const byId = Object.fromEntries(fixtureSet.fixtures.map((fixture) => [fixture.id, fixture]));
assert.notEqual(byId['sky-sun-cancer-collective'].templateFamily, byId['home-sun-cancer-gemini-rising'].templateFamily, 'Collective Sky and Home planetary horoscope must differ');
assert.notEqual(byId['home-moon-phase'].templateFamily, byId['home-moon-sign-cancer'].templateFamily, 'Moon phase and Moon sign must differ');
assert(!('sectClause' in byId['natal-sect-suppressed-unknown-time'].renderedFields), 'Sect must be suppressed without reliable time');

console.log(JSON.stringify({ status: 'PASS', fixtures: fixtureSet.fixtures.length }, null, 2));

