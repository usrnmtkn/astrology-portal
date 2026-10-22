const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { test } = require('node:test');
const { prepareSynastrySourceInput, synastryContactOwnership, validateSynastryMeaningPlan } = require('../../src/astro-writing/synastrySourceContext.cjs');

test('both chart roles remain explicit, including the same planet in both charts', () => {
  for (const readerPerson of ['A', 'B']) {
    const roles = synastryContactOwnership({ planetA: 'Moon', planetB: 'Moon', readerPlanet: 'Moon', readerPerson });
    assert.equal(roles.readerPerson, readerPerson);
    assert.equal(roles.personA.label, 'Person A');
    assert.equal(roles.personB.label, 'Person B');
  }
  assert.throws(() => synastryContactOwnership({ planetA: 'Sun', planetB: 'Saturn', readerPerson: 'A', readerPlanet: 'Saturn' }), /OWNERSHIP_CONFLICT/);
  assert.throws(() => synastryContactOwnership({ planetA: 'Sun', planetB: 'Saturn', personA: 'you', personB: 'you' }), /OWNERSHIP_CONFLICT/);
  assert.throws(() => synastryContactOwnership({ planetA: 'Sun' }), /OWNERSHIP_REQUIRED/);
  assert.equal(synastryContactOwnership({ planetA: 'Sun', planetB: 'Saturn', personA: 'Rowan', personB: 'Maya' }).readerPerson, null,
    'A named chart pair alone does not establish which person is the reader.');
});

test('all current directional KB records project without changing the original or complete author evidence', () => {
  // Resolve from the test file, independent of the caller's working directory.
  const path = require('node:path').resolve(__dirname, '../../packages/astro-knowledge/data/synastry/aspects');
  const files = readdirSync(path).filter(name => name.endsWith('.json'));
  assert.equal(files.length, 732);
  for (const file of files) {
    const record = JSON.parse(readFileSync(`${path}/${file}`, 'utf8'));
    for (const readerPerson of ['A', 'B']) {
      const authorText = 'Complete synthetic owner passage. Your original wording and punctuation — final sentence.';
      const input = { facts: { planetA: record.planetA, planetB: record.planetB, readerPerson,
        readerPlanet: readerPerson === 'A' ? record.planetA : record.planetB,
        neutralKnowledge: { records: [record] } },
        sourceSnapshot: { knowledgeSource: { record }, knowledgeSources: [{ record }], bookReferences: [{ text: authorText }] } };
      const original = JSON.stringify(input);
      const projected = prepareSynastrySourceInput(input);
      assert.equal(JSON.stringify(input), original);
      assert.equal(projected.sourceSnapshot.bookReferences[0].text, authorText);
      assert.equal(projected.sourceSnapshot.synastrySourceContext.ownership.readerPerson, readerPerson);
      const active = projected.facts.neutralKnowledge.records[0];
      assert.equal(active.plainTranslation, record.plainTranslation, 'The primary relationship meaning is retained complete.');
      assert(active.sourcePerspective.includes('not a binding'));
      assert.equal(active.advice, undefined);
      for (const field of ['summaryShort', 'summaryDeep', 'tension']) {
        if (active[field] !== undefined) {
          assert.equal(active[field], record[field], 'A retained knowledge unit is complete, never synonym-edited.');
          assert(!/\b(?:you|your|yours|yourself|yourselves)\b/iu.test(active[field]));
        }
      }
      assert.deepEqual(projected.sourceSnapshot.knowledgeSource.record, active);
      assert.deepEqual(projected.sourceSnapshot.knowledgeSources[0].record, active);
    }
  }
});

test('requested advice remains a source possibility without importing an unknown reader perspective', () => {
  const record = { kind: 'interaspect', planetA: 'sun', planetB: 'saturn', advice: 'Person A could ask Person B what they meant.' };
  const projected = prepareSynastrySourceInput({ facts: { planetA: 'Sun', planetB: 'Saturn', adviceRequested: true, neutralKnowledge: { records: [record] } } });
  assert.equal(projected.facts.neutralKnowledge.records[0].advice, record.advice);
});

test('internal plans permit uncomplicated support and empty remedy fields, while rejecting an unresolved source reader', () => {
  const plan = { core_tension: '', what_changes: 'Person A expresses appreciation; Person B may respond with affection.',
    constructive_expression: '', overcorrection: '', observable_behaviors: [], possible_consequences: [] };
  assert.equal(validateSynastryMeaningPlan(plan), plan);
  assert.throws(() => validateSynastryMeaningPlan({ ...plan, core_tension: 'Their caution presses on your confidence.' }), /OWNERSHIP_UNRESOLVED/);
  assert.throws(() => validateSynastryMeaningPlan({ core_tension: 'A vague relationship observation.' }), /OWNERSHIP_UNRESOLVED/);
});
