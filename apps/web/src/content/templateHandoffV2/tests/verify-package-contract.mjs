import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

const matrix = readJson('contracts/SURFACE-RESOLUTION-MATRIX.json');
const templates = readJson('contracts/EXECUTABLE-TEMPLATE-CONTRACT.json');
const classification = readJson('contracts/SOURCE-CLASSIFICATION.json');
const cc = readJson('sources/cc-source-phrases.json');
const exemplars = readJson('sources/source-derived-clause-exemplars.json');
const mustacheLibrary = fs.readFileSync(path.join(root, 'TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md'), 'utf8');

assert.equal(matrix.version, '2.0.0');
assert.equal(templates.version, '2.0.0');
assert.equal(classification.version, '2.0.0');

const families = new Set(Object.keys(templates.families));
for (const surface of matrix.surfaces) {
  assert(families.has(surface.templateFamily), `Missing template family for ${surface.surface}: ${surface.templateFamily}`);
  assert(surface.requiredFacts.length > 0, `${surface.surface} has no required facts`);
  assert(surface.sourceGapWhen, `${surface.surface} has no SOURCE_GAP rule`);
}

for (const required of [
  'transits.personalized',
  'home.planetary_horoscope',
  'home.moon_forecast.phase',
  'home.moon_forecast.sign',
  'home.daily_horoscope',
  'sky.planet_sign',
  'me.natal_placement'
]) {
  assert(matrix.surfaces.some((item) => item.surface === required), `Missing required surface: ${required}`);
}

const genericTransitHouse = Object.keys(cc).filter((key) => /^cc\/transit\/.*\/house-/.test(key));
assert(genericTransitHouse.length > 0, 'Expected generic transit-house evidence rows');
const genericRule = classification.rules.find((rule) => rule.match === 'cc/transit/*/house-*');
assert(genericRule, 'Missing generic transit-house classification rule');
assert.equal(genericRule.readerEligible, false, 'Generic transit-house rows must be reader-ineligible');
assert.equal(genericRule.tier, 'REFERENCE_SCAFFOLD');

const pairRows = Object.keys(cc).filter((key) => key.startsWith('cc/aspect-pair/'));
assert(pairRows.length > 0, 'Expected exact aspect-pair evidence rows');
const pairRule = classification.rules.find((rule) => rule.match === 'cc/aspect-pair/*');
assert(pairRule, 'Missing exact-pair classification rule');
assert.equal(pairRule.readerEligible, false, 'Raw exact-pair evidence must be reviewed before reader use');

const exemplarCount = Array.isArray(exemplars) ? exemplars.length : Object.keys(exemplars).length;
assert(exemplarCount > 0, 'Expected reviewed clause exemplars');

assert.equal(templates.global.instructionSourceFirewall, true);
assert.equal(templates.global.optionalSlotsMayBeSuppressed, true);
assert.equal(templates.global.compactMustDifferFromExpanded, true);
assert(mustacheLibrary.includes('{{body}}'), 'Mustache library is missing fact slots');
assert(mustacheLibrary.includes('{{lived_scene}}'), 'Mustache library is missing interpretive slots');
assert(mustacheLibrary.includes('{{#has_exact_date}}'), 'Mustache library is missing conditional blocks');
assert((mustacheLibrary.match(/\{\{/g) || []).length >= 150, 'Mustache library does not contain a complete literal template inventory');

console.log(JSON.stringify({
  status: 'PASS',
  surfaces: matrix.surfaces.length,
  templateFamilies: families.size,
  genericTransitHouseRowsQuarantined: genericTransitHouse.length,
  exactPairEvidenceRowsRequireReview: pairRows.length,
  reviewedExemplarInventory: exemplarCount,
  mustacheTokens: (mustacheLibrary.match(/\{\{/g) || []).length
}, null, 2));
