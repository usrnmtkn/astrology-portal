const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { test } = require('node:test');
const { createHash } = require('node:crypto');
const { prepareSynastrySourceInput, synastryContactOwnership, validateSynastryMeaningPlan, synastryMeaningPlanSchema, designatedSynastryVoiceReferences } = require('../../src/astro-writing/synastrySourceContext.cjs');
const { withSynastryKnowledgeSources } = require('../../api/_lib/synastry-knowledge-sources.cjs');

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

test('directional KB records either retain complete meaning or hold their known keyword scaffold without changing evidence', () => {
  // Resolve from the test file, independent of the caller's working directory.
  const path = require('node:path').resolve(__dirname, '../../packages/astro-knowledge/data/synastry/aspects');
  const files = readdirSync(path).filter(name => name.endsWith('.json'));
  assert.equal(files.length, 732);
  let held = 0;
  for (const file of files) {
    const record = JSON.parse(readFileSync(`${path}/${file}`, 'utf8'));
    for (const readerPerson of ['A', 'B']) {
      const authorText = 'Complete synthetic owner passage. Your original wording and punctuation — final sentence.';
      const input = { facts: { planetA: record.planetA, planetB: record.planetB, readerPerson,
        readerPlanet: readerPerson === 'A' ? record.planetA : record.planetB,
        neutralKnowledge: { records: [record] } },
        sourceSnapshot: { knowledgeSource: { record }, knowledgeSources: [{ record }], bookReferences: [{ text: authorText }] } };
      const original = JSON.stringify(input);
      if (record.plainTranslation.startsWith("A's ")) {
        assert.throws(() => prepareSynastrySourceInput(input), /SYNASTRY_KNOWLEDGE_INCOMPLETE/);
        assert.equal(JSON.stringify(input), original);
        held++;
        continue;
      }
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
  assert.equal(held, 364 * 2, 'Every remaining legacy scaffold holds for either reader role.');
});

test('requested advice remains a source possibility without importing an unknown reader perspective', () => {
  const record = { kind: 'interaspect', planetA: 'sun', planetB: 'saturn', advice: 'Person A could ask Person B what they meant.' };
  const projected = prepareSynastrySourceInput({ facts: { planetA: 'Sun', planetB: 'Saturn', adviceRequested: true, neutralKnowledge: { records: [record] } } });
  assert.equal(projected.facts.neutralKnowledge.records[0].advice, record.advice);
});

test('shared generation loads complete registered directional records before planning', () => {
  const path = require('node:path').resolve(__dirname, '../../packages/astro-knowledge/data/synastry/aspects');
  for (const name of readdirSync(path).filter(name => name.endsWith('.json'))) {
    const bytes = readFileSync(`${path}/${name}`, 'utf8'); const record = JSON.parse(bytes);
    const input = { facts: { planetA: record.planetA, planetB: record.planetB, aspect: record.aspect } };
    if (record.plainTranslation.startsWith("A's ")) {
      assert.throws(() => withSynastryKnowledgeSources(input), /SYNASTRY_KNOWLEDGE_INCOMPLETE/);
      assert.equal(input.sourceSnapshot, undefined);
      continue;
    }
    const hydrated = withSynastryKnowledgeSources(input);
    const source = hydrated.sourceSnapshot.knowledgeSources[0];
    assert.deepEqual(source.record, record);
    assert.equal(source.sha256, createHash('sha256').update(bytes).digest('hex'));
    assert.equal(input.sourceSnapshot, undefined);
  }
  const sources = withSynastryKnowledgeSources({ facts: { planetA: 'Moon', planetB: 'Sun', aspect: 'soft' } }).sourceSnapshot.knowledgeSources;
  assert.deepEqual(sources.map(source => source.record.aspect), ['trine', 'sextile']);
  const node = withSynastryKnowledgeSources({ facts: { planetA: 'North Node', planetB: 'Ascendant', aspect: 'conjunction' } });
  assert.equal(node.sourceSnapshot.knowledgeSources[0].record.planetA, 'north-node');
  for (const facts of [{ planetA: '../sun', planetB: 'moon', aspect: 'trine' }, { planetA: 'sun', planetB: 'moon', aspect: 'invented' }]) {
    assert.throws(() => withSynastryKnowledgeSources({ facts }), /KNOWLEDGE_UNAVAILABLE/);
  }
});

test('the repaired neutral draft sources separate exact source commands from interpretation', () => {
  const path = require('node:path');
  const root = path.resolve(__dirname, '../../packages/astro-knowledge');
  const audit = JSON.parse(readFileSync(path.join(root, 'review/synastry-source-separation-20261023.json'), 'utf8'));
  const meaningRepair = JSON.parse(readFileSync(path.join(root, 'review/synastry-meaning-repair-20261024.json'), 'utf8'));
  assert.equal(audit.changes.length, 88);
  assert.equal(audit.ownerProseApproval, false);
  for (const change of audit.changes) {
    const bytes = readFileSync(path.join(root, 'data/synastry/aspects', change.id + '.json'), 'utf8');
    const record = JSON.parse(bytes);
    const later = meaningRepair.changes.find(item => item.id === change.id);
    if (later) assert.equal(later.originalFileSha256, change.updatedFileSha256, 'A later repair must continue the exact prior source revision.');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), later?.updatedFileSha256 ?? change.updatedFileSha256);
    assert.equal(record.status, 'DRAFT');
    assert.equal(record.authoringStatus, 'draft');
    assert.equal(record.voiceNeutral, true);
    assert(record.plainTranslation.trim());
    assert.equal(createHash('sha256').update(record.advice).digest('hex'), change.updatedAdviceSha256);
  }
  for (const planets of ['moon_B-sun', 'sun_B-moon']) for (const aspect of ['trine', 'sextile']) {
    const record = JSON.parse(readFileSync(path.join(root, 'data/synastry/aspects', `A-${planets}_${aspect}.json`), 'utf8'));
    const input = { facts: { planetA: record.planetA, planetB: record.planetB, readerPerson: 'A' }, sourceSnapshot: { knowledgeSources: [{ record }] } };
    const projected = prepareSynastrySourceInput(input).sourceSnapshot.knowledgeSources[0].record;
    assert.equal(projected.tension, undefined);
    assert(!JSON.stringify(projected).includes('Keep it active so comfort does not turn into autopilot'));
    assert(!JSON.stringify(projected).includes('The problem is that easy can become lazy'));
    assert(!JSON.stringify(projected).includes('Failure mode: comfort breeds passivity'));
    assert.equal(projected.advice, undefined);
  }
});

test('twenty repaired directional sources retain sourced meaning, role ownership and exact separated legacy units', () => {
  const path = require('node:path');
  const root = path.resolve(__dirname, '../../packages/astro-knowledge');
  const audit = JSON.parse(readFileSync(path.join(root, 'review/synastry-meaning-repair-20261024.json'), 'utf8'));
  assert.equal(audit.changes.length, 20);
  assert.equal(audit.readerProseApproval, false);
  assert.equal(audit.publicationAuthorized, false);
  const sha = text => createHash('sha256').update(text).digest('hex');
  for (const change of audit.changes) {
    const bytes = readFileSync(path.join(root, 'data/synastry/aspects', change.id + '.json'), 'utf8');
    const record = JSON.parse(bytes);
    assert.equal(sha(bytes), change.updatedFileSha256);
    assert.equal(sha(record.plainTranslation), change.updatedMeaningSha256);
    assert.equal(sha(record.advice), change.updatedAdviceSha256);
    assert(record.plainTranslation.includes(`Person A (${record.planetA[0].toUpperCase() + record.planetA.slice(1)})`));
    assert(record.plainTranslation.includes(`Person B (${record.planetB[0].toUpperCase() + record.planetB.slice(1)})`));
    assert(!/\b(?:you|your|yours)\b/iu.test(record.plainTranslation));
    assert.equal(record.status, 'DRAFT');
    assert.equal(record.authoringStatus, 'draft');
    const active = prepareSynastrySourceInput({ facts: { planetA: record.planetA, planetB: record.planetB },
      sourceSnapshot: { knowledgeSources: [{ record }] } }).sourceSnapshot.knowledgeSources[0].record;
    assert.equal(active.plainTranslation, record.plainTranslation);
    assert.equal(active.advice, undefined);
    for (const unit of change.movedUnits) {
      assert(record.advice.split('\n\n').some(text => sha(text) === unit.sha256), 'Complete moved text remains in its advice role.');
      assert(!JSON.stringify(active).includes(record.advice.split('\n\n').find(text => sha(text) === unit.sha256)));
    }
  }
  const source = (pair, aspect) => JSON.parse(readFileSync(path.join(root, 'data/synastry/aspects', `A-${pair}_${aspect}.json`), 'utf8')).plainTranslation;
  assert(source('venus_B-jupiter', 'trine').includes('affection'));
  assert(source('venus_B-jupiter', 'trine').includes('admiration'));
  assert(source('jupiter_B-venus', 'square').includes('generosity'));
  assert(source('mars_B-saturn', 'trine').includes('trust'));
  assert(source('saturn_B-mars', 'opposition').includes('authority'));
  assert(source('mars_B-mercury', 'square').includes('defending'));
});

test('the placeholder hold is an exact scaffold check, not a ban on ordinary wording or complete selected sources', () => {
  const facts = { planetA: 'Venus', planetB: 'Jupiter' };
  const record = { id: 'synthetic', kind: 'interaspect', planetA: 'venus', planetB: 'jupiter',
    plainTranslation: "A's love and values meets B's growth. The trine lets them flow together easily." };
  assert.throws(() => prepareSynastrySourceInput({ facts, sourceSnapshot: { knowledgeSources: [{ record }] } }), /KNOWLEDGE_INCOMPLETE/);
  const complete = { ...record, plainTranslation: "A's affection can draw a generous response from B. Their mutual appreciation gives each a reason to express more affection." };
  assert.equal(prepareSynastrySourceInput({ facts, sourceSnapshot: { knowledgeSources: [{ record: complete }] } }).sourceSnapshot.knowledgeSources[0].record.plainTranslation, complete.plainTranslation);
});

test('internal plans permit uncomplicated support and empty remedy fields, while rejecting an unresolved source reader', () => {
  const plan = { core_tension: '', what_changes: 'Person A expresses appreciation; Person B may respond with affection.',
    constructive_expression: '', overcorrection: '', observable_behaviors: [], possible_consequences: [] };
  assert.equal(validateSynastryMeaningPlan(plan), plan);
  assert.throws(() => validateSynastryMeaningPlan({ ...plan, core_tension: 'Their caution presses on your confidence.' }), /OWNERSHIP_UNRESOLVED/);
  assert.throws(() => validateSynastryMeaningPlan({ core_tension: 'A vague relationship observation.' }), /OWNERSHIP_UNRESOLVED/);
  const remedy = { ...plan, constructive_expression: 'Person A should ask Person B to listen.' };
  assert.throws(() => validateSynastryMeaningPlan(remedy), /UNREQUESTED_REMEDY/);
  assert.equal(validateSynastryMeaningPlan(remedy, { adviceRequested: true }), remedy);
  const schema = { properties: { constructive_expression: { type: 'string' } } };
  assert.deepEqual(synastryMeaningPlanSchema(schema).properties.constructive_expression.enum, ['']);
  assert.equal(synastryMeaningPlanSchema(schema, { adviceRequested: true }), schema);
});

test('designated complete voice references retain their declared role and cannot be replaced with rejection text or damaged excerpts', () => {
  const text='Complete synthetic approved voice reference. Its final sentence remains intact.';
  const reference={role:'owner_approved_voice_only_not_astrology_for_target',path:'/private/synthetic-reference.txt',text,
    sha256:createHash('sha256').update(text).digest('hex')};
  const snapshot={positiveVoiceReferences:[reference],bookReferences:[{text:'Meaning only.'}],ownerReason:'A proposed rewrite is not positive voice.'};
  assert.equal(designatedSynastryVoiceReferences(snapshot),snapshot.positiveVoiceReferences);
  assert.deepEqual(designatedSynastryVoiceReferences({bookReferences:snapshot.bookReferences,ownerReason:snapshot.ownerReason}),[]);
  for(const invalid of [{...reference,text:'A shortened version.'},{...reference,role:'rejected_draft'},{...reference,path:''}]){
    assert.throws(()=>designatedSynastryVoiceReferences({positiveVoiceReferences:[invalid]}),/VOICE_REFERENCE_INVALID/);
  }
});
