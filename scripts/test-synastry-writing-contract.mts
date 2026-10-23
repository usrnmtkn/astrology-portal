import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { REVIEW_FIELDS } from '../src/astro-writing/canonicalInstructions.mjs';
import { RHETORICAL_LABELS, RHETORICAL_WRITER_POLICY } from '../src/astro-writing/rhetoricalPatterns.mjs';
import handler from '../api/generate-content.js';
import { callOpenAIResponses, governedInstructionsForRole } from '../src/astro-writing/openAIResponses.cjs';
import { GHOSTWRITING_SKILL_INSTRUCTIONS } from '../src/astro-writing/ghostwritingSkill.mjs';
import { validateGeneratedContentQuality } from '../api/_lib/content-generation.js';
import { syntheticApprovedTen, syntheticSynastryVoice, encodedSynastryVoice, installSyntheticSynastryApproval } from '../tests/fixtures/synastry-approved-voice.cjs';
const restoreApprovalFixture = installSyntheticSynastryApproval();

const sharedStyle = readFileSync(new URL('../packages/astro-knowledge/voice/tldr-astro/style-guide.md', import.meta.url), 'utf8');

Object.assign(process.env, {
  PRIVATE_REPORT_DOCUMENTS: encodedSynastryVoice(),
  NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'synthetic-synastry-secret',
  OPENAI_API_KEY: 'synthetic', ANTHROPIC_API_KEY: 'synthetic',
  STUDIO_MEMORY_FEEDBACK_ENABLED: 'false', WRITING_KERNEL_GOVERNED_SURFACES: '',
  SUPABASE_URL: 'https://synthetic-synastry.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'synthetic',
  WRITING_KERNEL_SHADOW_SURFACES: '', WRITING_KERNEL_SKY_GLOBAL_ENABLE: '0',
  WRITING_KERNEL_SKY_CANARY_PERCENT: '0'
});

const base = {
  contentKey: 'fallback-hook/synastry-pair/moon/mercury/square',
  surface: 'synastry', mode: 'in_depth', eventType: 'synastry-aspect', save: false,
  headline: 'Mercury square Moon', knowledgeIds: ['synastry-mercury-square-moon'],
  facts: { blockType: 'synastry_aspect', planetA: 'Mercury', planetB: 'Moon', aspect: 'square',
    personA: 'Rowan', personB: 'you', housesExcluded: true, signsExcluded: true },
  sourceSnapshot: { meaning: 'Complete synthetic meaning source, including its final sentence.' },
  voiceNotes: 'Synthetic owner direction: retain the Moon reader and do not add advice.'
};
const draft = {
  headline: base.headline, tldr: 'A synthetic relationship observation.',
  summary: 'You notice a difference in what the two of you understood.',
  body: 'You tell Rowan what you understood. The synthetic fixture retains the Moon reader and the other person’s Mercury.\n\nTheir reply adds information you did not have. This complete fixture has an ending without an instruction.',
  action: '', timing: '', sections: [],
  sceneLock: { sceneType: 'conversation', sceneArena: 'Synthetic relationship conversation',
    currentPressure: 'Different interpretations', personalSensitivity: 'Wanting to be understood',
    chosenScene: 'A possible exchange, not a verified event.', excludedMeanings: ['Dates, signs, houses and biography'] },
  astrologyDrilldown: { title: 'Why this?', summary: 'The fixture uses only the supplied contact.',
    factors: [
      { label: 'Their Mercury', technicalFact: 'Mercury belongs to the other chart.', plainMeaning: 'Their way of explaining.' },
      { label: 'Your Moon', technicalFact: 'The reader’s Moon is squared by their Mercury.', plainMeaning: 'Your emotional response.' }
    ], whyThisScene: 'The conversation is a possible interpretation of the supplied contact; no external event, signs, houses or personal history are asserted.', timingNote: '' }
};
const requests: any[] = [];
let nextDraft: any = draft;
const validPlan = { core_tension: 'Person A and Person B understand the synthetic exchange differently.',
  what_changes: '', constructive_expression: '', overcorrection: '', observable_behaviors: [], possible_consequences: [] };
let nextPlan: any = validPlan;
let feedbackRows: any[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  if (String(url) === 'https://synthetic-synastry.supabase.co/rest/v1/rpc/studio_memory_active_snapshot') {
    assert.equal(init.method, 'POST');
    assert.equal(init.body, '{}');
    return Response.json([{ snapshot: { writingFeedback: feedbackRows } }]);
  }
  const openai = String(url) === 'https://api.openai.com/v1/responses';
  assert(openai || String(url) === 'https://api.anthropic.com/v1/messages', 'All storage and unexpected network calls are forbidden.');
  const body = JSON.parse(String(init.body));
  const kind = openai ? body.text.format.name : body.tools[0].name;
  requests.push({ kind, provider: openai ? 'openai' : 'claude', body });
  let result: unknown = nextDraft;
  if (kind === 'tldr_astro_meaning_plan') result = nextPlan;
  if (kind === 'tldr_astro_cold_rendered_prose_review') result = {
    decision: 'PASS', cold_rendered_prose: { status: 'PASS', reason: 'Synthetic review.' }, violations: []
  };
  if (kind === 'tldr_astro_marie_review') result = {
    decision: 'PASS', violations: [],
    ...Object.fromEntries(REVIEW_FIELDS.map(field => [field, { status: 'PASS', reason: 'Synthetic review.' }])),
    rhetoric: { checks: RHETORICAL_LABELS.map(label => ({ label, outcome: 'pass', reason: 'Synthetic review.' })), findings: [] }
  };
  return Response.json(openai ? { id: 'synthetic-synastry-response', output_text: JSON.stringify(result) }
    : { id: 'synthetic-synastry-response', content: [{ type: 'tool_use', name: kind, input: result }] });
};

async function generate(body: any, authorized = true) {
  const response = { statusCode: 0, result: {} as any, setHeader() {}, end(value: string) { this.result = JSON.parse(value); } };
  await handler({ method: 'POST', headers: authorized ? { authorization: `Bearer ${process.env.CONTENT_GENERATION_SECRET}` } : {}, body } as any, response as any);
  return response;
}

function assertSynastryRequest(request: any, input: typeof base) {
  const prompt = request.provider === 'openai' ? request.body.input : request.body.messages[0].content[0].text;
  const instructions = request.provider === 'openai' ? request.body.instructions : request.body.system;
  const schema = request.provider === 'openai' ? request.body.text.format.schema : request.body.tools[0].input_schema;
  assert(instructions.includes('Show what each person says, hears, wants or does'), 'The actual writer receives interaction-led guidance.');
  assert(instructions.includes('Use plain words for what the person wants or intends to do'), 'The actual writer receives plain-language guidance.');
  assert(instructions.includes('Let each sentence develop the thought instead of restating support, comfort or confidence'), 'Reassurance is not substituted for development in the dispatched instructions.');
  assert(instructions.includes('Prefer direct causal sentences to report transitions'), 'Report-like wording is addressed in the dispatched instructions.');
  assert(instructions.includes('"As a result"'), 'The owner-identified transition is retained as a negative style example.');
  assert(instructions.includes('a feeling word alone does not explain the interaction'));
  assert(instructions.includes('constructive_expression is not a required resolution'));
  assert(instructions.includes('A meaning plan establishes supported interpretation, not reader wording'), 'The writer must not paraphrase planner labels into reader copy.');
  assert(instructions.includes('Do not repeat the same contrast in new vocabulary'), 'Additional sentences must develop the interaction rather than restate it.');
  assert(instructions.includes("Use ordinary sentences about people's feelings and actions without interrupting them with a planetary label"));
  assert(instructions.includes("how one person's response may change what the other does next"), 'The writer must develop a supported reciprocal response rather than repeat two planetary categories.');
  assert(instructions.includes('Keep both people capable of reasoning and emotional understanding'));
  assert(instructions.includes('the aspect is not proof of habitual behavior'));
  assert(instructions.includes('Do not require a cycle, a cost or a remedy'));
  assert(instructions.includes('A requested order in current feedback is scoped to its entry'));
  assert(instructions.includes('New reader fields must contain no em dashes'));
  assert(instructions.includes('SYNASTRY EDITORIAL AUTHORITY synastry-aspect/v12-2026-10-23'));
  assert(instructions.includes('Legacy knowledge and existing drafts may use you for a different planet owner'));
  assert(instructions.includes('Do not reconstruct those excluded fields from old drafts'));
  assert(instructions.includes(GHOSTWRITING_SKILL_INSTRUCTIONS), 'Complete craft guidance remains in the system instructions.');
  // Inspect both actual provider fields: OpenAI's canonical transport can add
  // instructions that are absent from the assembled user prompt.
  const combined = `${instructions}\n${prompt}`;
  assert(!combined.includes('Use a specific situation, a direct consequence, a useful next move,'),
    'The final provider request must not reintroduce default advice through the appended effective rules.');
  assert.equal(combined.split('# Effective TLDR Astro writing rules').length - 1, 1,
    'The final request must contain one effective-rule layer, not conflicting copies in user and system fields.');
  assert(!prompt.includes('PRIMARY NATAL PLACEMENT PRIMITIVES'), 'A relationship writer must not receive the unrelated natal instruction layer.');
  assert(!combined.includes('Lead with how one person makes the other feel'));
  assert(!combined.includes('Open with the felt experience of being around this person.'));
  assert(!instructions.includes(RHETORICAL_WRITER_POLICY), 'The writer receives Ghostwriter craft, without the redundant evaluator specification.');
  assert(!instructions.includes('HARD FLAG – REWRITE'));
  for (const conflict of [
    'SPINE QUALITY GATES', 'SKY PLACEMENT ARTICLE SPINE',
    'Strategy needs at least two short imperatives', 'LONG-FORM SENTENCE ARCHITECTURE',
    '## Natal voice (warm)', '## Transit and Sky voice (direct)', '## Relationship voice (interim)',
    '3 to 5 paragraphs', '1 to 2 paragraphs', 'Gives one practical move.',
    'Flag relationship blocks for a dedicated voice pass', 'Put the readable hook, advice',
    'Write in this order:', 'Daily horoscope rule: include lunar contacts'
  ]) assert(!combined.includes(conflict), `Cross-surface instruction remains: ${conflict}`);
  const universalBans = sharedStyle.match(/^### Universal \(all voices\)[\s\S]*?(?=^### )/mu)?.[0].trim();
  assert(!combined.includes('Build pressure, movement, and consequence inside one charged sequence.'),
    'The old mandatory scene arc must not contradict the current optional-interaction contract.');
  assert(universalBans && prompt.includes(universalBans), 'Complete applicable shared word policy remains intact.');
  assert(prompt.includes('OUTPUT SHAPE FOR SYNASTRY ASPECT'));
  assert(prompt.includes("do not leave the astrological reasoning entirely in the drilldown"));
  assert(prompt.includes('what they want from the exchange'));
  assert(prompt.includes('Keep affection, interest, anticipation, enjoyment and disappointment available'));
  assert(prompt.includes('an imitation of another author'));
  assert(prompt.includes('action: return an empty string unless the owner explicitly requests advice'));
  assert(prompt.includes('Include at least two complete factors'));
  for (const conflict of [
    'Do not explain astrology mechanics in the body.', 'Do not put technical astrology in summary, body',
    'action: one specific useful move.', 'Advice must be one specific action.',
    'useful action or reflection.', 'Pick the most likely supported experience and commit to it.',
    'use one of the approved examples below verbatim', 'GOOD SHAPE', 'three to five paragraphs'
  ]) assert(!prompt.includes(conflict), `Conflicting instruction remains: ${conflict}`);
  assert(prompt.includes(JSON.stringify(input.facts, null, 2)), 'Complete directional facts reach the actual writer.');
  assert(prompt.includes(input.sourceSnapshot.meaning), 'Complete source reaches the writer.');
  assert(prompt.includes(input.voiceNotes));
  if ('planetASign' in input.facts) {
    assert(prompt.includes('SUPPLIED SYNASTRY SIGN CONTEXT'));
    assert(prompt.includes('Rowan: Mercury in Gemini'));
    if ('planetBSign' in input.facts) assert(prompt.includes('you: Moon in Virgo'));
    else assert(!prompt.includes('you: Moon in'), 'An absent counterpart sign is not invented.');
    assert(prompt.includes('Explain how each supplied sign qualifies its own planet'));
    assert(!prompt.includes('This reusable contact has no supplied planet signs'));
  } else {
    assert(prompt.includes('This reusable contact has no supplied planet signs'));
    assert(!prompt.includes('SUPPLIED SYNASTRY SIGN CONTEXT'));
  }
  for (const reference of [...syntheticSynastryVoice().entries, ...syntheticApprovedTen().entries]) {
    assert.equal(prompt.split(reference.text).length - 1, 1, 'The shared writer receives every complete protected benchmark once.');
  }
  assert(!prompt.includes('relationship-year-libra-2025-to-venus-rx-2026'), 'Default protected references replace the old adjacent article.');
  const voiceAt = Math.max(prompt.indexOf('DESIGNATED SYNASTRY VOICE REFERENCES'), prompt.indexOf('APPROVED TLDR ASTRO EXAMPLES'));
  const briefAt = prompt.lastIndexOf('WRITE THE READER INTERPRETATION');
  assert(voiceAt > prompt.indexOf('SOURCE SNAPSHOT') && briefAt > voiceAt,
    'The final task follows complete positive voice evidence, not a plan or rejected draft.');
  assert(prompt.indexOf('EXTRA VOICE NOTES') < voiceAt);
  if (request.provider === 'openai') assert(prompt.indexOf('GOVERNED MEANING PLAN') < voiceAt,
    'The planner must not displace the positive references at the end of the writer request.');
  assert(prompt.slice(briefAt).includes('Current owner corrections still govern'));
  assert(prompt.slice(briefAt).includes('internal chart labels, not names to print in reader fields'));
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, ['headline', 'tldr', 'summary', 'body', 'action', 'timing', 'sections', 'sceneLock', 'astrologyDrilldown']);
  assert.deepEqual(schema.properties.astrologyDrilldown.properties.factors.items.required, ['label', 'technicalFact', 'plainMeaning']);
}

try {
  for (const provider of ['openai', 'claude'] as const) {
    for (const variant of [base, { ...base, eventType: 'aspect', facts: { ...base.facts, blockType: undefined } },
      { ...base, mode: 'feed', contentKey: 'fixture/synastry-moon-trine-venus', knowledgeIds: ['synastry-moon-trine-venus'],
        facts: { ...base.facts, planetA: 'Venus', planetB: 'Moon', aspect: 'trine' } },
      { ...base, mode: 'article', contentKey: 'fixture/synastry-moon-conjunction-venus', knowledgeIds: ['synastry-moon-conjunction-venus'],
        facts: { ...base.facts, planetA: 'Moon', planetB: 'Venus', aspect: 'conjunction' } },
      { ...base, facts: { ...base.facts, signsExcluded: false, planetASign: 'Gemini', planetBSign: 'Virgo' },
        sourceSnapshot: { meaning: 'Complete synthetic source with an em dash — its original punctuation stays intact.' } },
      { ...base, facts: { ...base.facts, signsExcluded: false, planetASign: 'Gemini' } }]) {
      const start = requests.length;
      const response = await generate({ ...variant, provider });
      assert.equal(response.statusCode, 200, JSON.stringify(response.result));
      const writers = requests.slice(start).filter(request => ['tldr_astro_generated_content'].includes(request.kind));
      assert.equal(writers.length, 1, 'No added writer stage or rewrite on a valid result.');
      assert.deepEqual(requests.slice(start).map(request => request.kind), provider === 'openai'
        ? ['tldr_astro_meaning_plan', 'tldr_astro_generated_content', 'tldr_astro_cold_rendered_prose_review', 'tldr_astro_marie_review']
        : ['tldr_astro_generated_content'], 'The existing provider call sequence is unchanged.');
      if (provider === 'openai') {
        const stages = requests.slice(start);
        assert(stages[0].body.instructions.includes('SYNASTRY MEANING AUTHORITY'));
        assert(stages[0].body.instructions.includes("specific interaction and its supported consequences"), 'The actual planner must retain the source-specific development.');
        assert(stages[0].body.instructions.includes('A broad contrast such as logic versus feelings is incomplete'));
        assert(stages[0].body.instructions.includes('observable_behaviors must describe supported things people say or do'), 'The planner must distinguish behavior from an emotional verdict.');
        assert(stages[0].body.instructions.includes('Do not infer a fear or need merely to explain a planetary function'));
        assert(stages[0].body.instructions.includes("how that response may affect the first person's next response"), 'The meaning plan must retain the supported response to a response.');
        assert(stages[0].body.instructions.includes('Keep each possible intention distinct from its effect'));
        assert(stages[0].body.instructions.includes('A supportive contact may remain uncomplicated'));
        assert(stages[0].body.instructions.includes('unsupported text fields may be empty strings'));
        assert(stages[0].body.instructions.includes('what_changes describes the contact\'s effect'));
        assert.equal(JSON.parse(stages[0].body.input).contactOwnership.personA.planet, variant.facts.planetA);
        assert.equal(JSON.parse(stages[0].body.input).contactOwnership.personB.planet, variant.facts.planetB);
        assert.deepEqual(JSON.parse(stages[0].body.input).governedFacts, JSON.parse(JSON.stringify(variant.facts)), 'Complete directional facts remain unchanged in the planner input.');
        assert(stages[3].body.instructions.includes('SYNASTRY REVIEW AUTHORITY'));
        for (const stage of stages) assert(!stage.body.instructions.includes('SKY PLACEMENT ARTICLE SPINE'));
      }
      assertSynastryRequest(writers[0], variant as typeof base);
      assert.equal(response.result.generated.action, '');
      assert.equal(response.result.generated.body, draft.body);
      assert.equal(response.result.generated.ownerApproved, false);
      assert.deepEqual(response.result.saved, []);
    }
    const count = requests.length;
    assert.equal((await generate({ ...base, provider }, false)).statusCode, 401);
    assert.equal(requests.length, count, 'Unauthorized requests cannot reach a provider.');
    nextDraft = { ...draft, astrologyDrilldown: { ...draft.astrologyDrilldown, factors: draft.astrologyDrilldown.factors.slice(0, 1) } };
    const invalid = await generate({ ...base, provider });
    assert.notEqual(invalid.statusCode, 200, 'The two-factor validator remains enforced.');
    assert.match(invalid.result.error, /at least two astrology factors/u);
    nextDraft = { ...draft, body: '' };
    assert.notEqual((await generate({ ...base, provider })).statusCode, 200, 'Missing body remains invalid.');
    nextDraft = { ...draft, body: 'Synthetic prose with an unlicensed {{unexpected}} variable.' };
    assert.notEqual((await generate({ ...base, provider })).statusCode, 200, 'Unlicensed variables remain invalid.');
    for (const withDash of [
      { ...draft, body: draft.body + ' Synthetic continuation — retained for review.' },
      { ...draft, sections: [{ heading: 'Synthetic section', body: 'Synthetic text — continued.' }] },
      { ...draft, astrologyDrilldown: { ...draft.astrologyDrilldown, whyThisScene: 'Synthetic explanation — continued.' } }
    ]) {
      nextDraft = withDash;
      const invalidDash = await generate({ ...base, provider, allowQualityFallback: true });
      assert.notEqual(invalidDash.statusCode, 200, 'An em dash cannot return a successful synastry draft, including quality fallback.');
      assert.match(invalidDash.result.error, /em dash/u);
      assert(JSON.stringify(withDash).includes('—'), 'Rejected copy must not be silently scrubbed.');
    }
    nextDraft = draft;
  }
  // Reproduce the source leak at the real planner/writer transport, preserving
  // complete owner passages and the caller's original records in both providers.
  const legacyRecord = { id: 'synthetic-sun-saturn', kind: 'interaspect', planetA: 'sun', planetB: 'saturn', aspect: 'square',
    plainTranslation: 'The Sun person expresses identity; the Saturn person evaluates limits.',
    summaryDeep: 'Their caution presses on your confidence. Complete conflicting source ending.',
    tension: 'Person A may seek approval and Person B may impose a condition. Complete neutral ending.',
    advice: 'Keep making an effort. Complete unrequested advice ending.' };
  const sourceFixture = { ...base, headline: 'Sun square Saturn', facts: { ...base.facts, planetA: 'Sun', planetB: 'Saturn', readerPlanet: 'Saturn', otherPlanet: 'Sun',
      neutralKnowledge: { records: [legacyRecord] } },
    sourceSnapshot: { knowledgeSources: [{ record: legacyRecord }],
      bookReferences: [{ text: 'Complete protected owner passage. You retain its advice and original punctuation — final sentence.' }] } };
  const sourceBefore = JSON.stringify(sourceFixture);
  nextDraft = { ...draft, headline: sourceFixture.headline,
    body: 'This synthetic fixture addresses the Saturn reader and Rowan’s Sun. It retains both named roles without making an event claim.\n\nThe complete fixture ends without an instruction.',
    astrologyDrilldown: { ...draft.astrologyDrilldown, factors: [
      { label: 'Their Sun', technicalFact: 'Sun belongs to Rowan.', plainMeaning: 'The other person’s expression.' },
      { label: 'Your Saturn', technicalFact: 'Saturn belongs to the reader.', plainMeaning: 'The reader’s caution.' }
    ] } };
  for (const provider of ['openai', 'claude'] as const) {
    const start = requests.length;
    const generated = await generate({ ...sourceFixture, provider });
    assert.equal(generated.statusCode, 200);
    const receipt = generated.result.generated.generation_metadata.evidencePacket.synastrySourceContext;
    assert.equal(receipt.editorialVersion, 'synastry-aspect/v12-2026-10-23');
    assert.equal(receipt.readerPerson, 'B');
    assert(receipt.exclusions.some((entry: any) => entry.reason === 'advice_not_requested'));
    assert(!JSON.stringify(receipt).includes('Rowan'), 'The persisted source receipt contains no person names or source bodies.');
    const stages = requests.slice(start);
    for (const stage of stages.filter(request => ['tldr_astro_meaning_plan', 'tldr_astro_generated_content'].includes(request.kind))) {
      const prompt = stage.provider === 'openai' ? stage.body.input : stage.body.messages[0].content[0].text;
      assert(prompt.includes(legacyRecord.plainTranslation));
      assert(prompt.includes(legacyRecord.tension));
      assert(!prompt.includes(legacyRecord.summaryDeep), 'Unbound source-reader wording must not reach a paid stage.');
      assert(!prompt.includes(legacyRecord.advice), 'Unrequested knowledge advice must not reach a paid stage.');
    }
    const writer = stages.find(request => request.kind === 'tldr_astro_generated_content');
    const writerText = provider === 'openai' ? writer.body.input : writer.body.messages[0].content[0].text;
    assert(writerText.includes(sourceFixture.sourceSnapshot.bookReferences[0].text), 'Complete protected owner wording is unchanged.');
    for (const example of syntheticSynastryVoice().entries) assert(writerText.includes(example.text), 'Knowledge projection cannot alter complete protected voice examples.');
    if (provider === 'openai') {
      const ownership = JSON.parse(stages[0].body.input).contactOwnership;
      assert.equal(ownership.personA.planet, 'Sun'); assert.equal(ownership.personB.planet, 'Saturn'); assert.equal(ownership.readerPerson, 'B');
      assert.deepEqual(stages[0].body.text.format.schema.properties.constructive_expression.enum, [''],
        'The actual planner schema cannot solicit an unrequested remedy.');
    }
  }
  assert.equal(JSON.stringify(sourceFixture), sourceBefore, 'The original sources and saved input are never mutated.');
  // Use the actual repaired KB records through the real handler, not a second
  // handcrafted interpretation that could conceal the source contamination.
  for (const aspect of ['trine', 'sextile']) {
    const record = JSON.parse(readFileSync(new URL(`../packages/astro-knowledge/data/synastry/aspects/A-moon_B-sun_${aspect}.json`, import.meta.url), 'utf8'));
    const fixture = { ...base, headline: `Moon ${aspect} Sun`, knowledgeIds: [`synastry-moon-${aspect}-sun`],
      facts: { planetA: 'Moon', planetB: 'Sun', personA: 'you', personB: 'Rowan', readerPerson: 'A', aspect },
      sourceSnapshot: { meaning: 'Synthetic context.', knowledgeSources: [{ record }] } };
    nextDraft = { ...draft, headline: fixture.headline,
      body: 'You tell Rowan about a plan. This complete synthetic fixture retains the Moon reader and the other person’s Sun. Its ending is a complete observation.',
      astrologyDrilldown: { ...draft.astrologyDrilldown, factors: [
        { label: 'Your Moon', technicalFact: 'Moon belongs to the reader.', plainMeaning: 'The reader’s emotional response.' },
        { label: 'Their Sun', technicalFact: 'Sun belongs to Rowan.', plainMeaning: 'The other person’s self-expression.' }
      ] } };
    for (const provider of ['openai', 'claude'] as const) {
      const start = requests.length;
      const result = await generate({ ...fixture, provider });
      assert.equal(result.statusCode, 200, JSON.stringify(result.result));
      for (const stage of requests.slice(start).filter(request => ['tldr_astro_meaning_plan', 'tldr_astro_generated_content'].includes(request.kind))) {
        const sent = stage.provider === 'openai' ? stage.body.input : stage.body.messages[0].content[0].text;
        assert(sent.includes(record.plainTranslation));
        assert(!sent.includes(record.advice));
        for (const leak of ['Keep it active so comfort does not turn into autopilot', 'The problem is that easy can become lazy', 'The problem is leaving it half-open']) assert(!sent.includes(leak));
      }
      const receipt = result.result.generated.generation_metadata.evidencePacket.synastrySourceContext;
      assert.equal(receipt.protectedVoice.referenceCount, 18);
      assert.equal(receipt.protectedVoice.sources.length, 2);
      for (const source of receipt.protectedVoice.sources) assert(source.documentSha256);
      for (const reference of [...syntheticSynastryVoice().entries, ...syntheticApprovedTen().entries]) {
        const writer = requests.slice(start).find(request => request.kind === 'tldr_astro_generated_content');
        assert(writer);
        const sent = writer.provider === 'openai' ? writer.body.input : writer.body.messages[0].content[0].text;
        assert.equal(sent.split(reference.text).length - 1, 1, 'Both approved collections reach the actual writer once, completely.');
      }
    }
  }
  for (const provider of ['openai', 'claude'] as const) {
    const start = requests.length;
    process.env.PRIVATE_REPORT_DOCUMENTS = 'invalid';
    const missing = await generate({ ...base, provider });
    assert.notEqual(missing.statusCode, 200);
    assert.match(missing.result.error, /SYNASTRY_APPROVED_VOICE_UNAVAILABLE/);
    assert.equal(requests.length, start, 'Missing protected benchmarks hold before any provider stage.');
    process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice();
  }
  nextDraft = draft;
  const voiceText = 'Complete synthetic designated voice passage. Its original punctuation — and its final sentence remain intact.';
  const reference = { role: 'owner_approved_voice_only_not_astrology_for_target', path: '/private/synthetic-owner-reference.txt',
    text: voiceText, sha256: createHash('sha256').update(voiceText).digest('hex') };
  const benchmarkFixture = { ...base, sourceSnapshot: { meaning: base.sourceSnapshot.meaning, positiveVoiceReferences: [reference] } };
  for (const provider of ['openai', 'claude'] as const) {
    const start = requests.length;
    const result = await generate({ ...benchmarkFixture, provider });
    assert.equal(result.statusCode, 200);
    const writer = requests.slice(start).find(request => request.kind === 'tldr_astro_generated_content');
    const prompt = provider === 'openai' ? writer.body.input : writer.body.messages[0].content[0].text;
    assert(prompt.includes('DESIGNATED SYNASTRY VOICE REFERENCES'));
    assert.equal(prompt.split(voiceText).length - 1, 1, 'Complete designated wording appears once, unchanged.');
    assert(!prompt.includes('relationship-year-libra-2025-to-venus-rx-2026'), 'Designated benchmarks cannot be padded with the automatic adjacent article.');
    const receipt = result.result.generated.generation_metadata.evidencePacket.synastrySourceContext;
    assert.equal(receipt.designatedVoiceReferences[0].textSha256, reference.sha256);
    assert(!JSON.stringify(receipt).includes(voiceText));
    const beforeInvalid = requests.length;
    const invalid = await generate({ ...benchmarkFixture, provider, sourceSnapshot: { ...benchmarkFixture.sourceSnapshot,
      positiveVoiceReferences: [{ ...reference, text: 'A damaged excerpt.' }] } });
    assert.notEqual(invalid.statusCode, 200); assert.match(invalid.result.error, /VOICE_REFERENCE_INVALID/u);
    assert.equal(requests.length, beforeInvalid, 'Damaged designated evidence stops before either provider.');
  }
  // Reproduce the whole-request ordering defect with complete negative evidence,
  // an existing draft and a designated benchmark. No body is shortened or promoted.
  const rejection = { id: 'synthetic-context-rejection', version: 1, status: 'active', kind: 'rejection',
    target_keys: [base.contentKey], rejected_text: 'Complete synthetic rejected passage. It retains its final sentence.',
    source_roles: null, owner_reason: 'Complete synthetic owner reason: this wording was rejected, including its ending.',
    source_uri: 'thread:11111111-1111-4111-8111-111111111111', source_date: '2026-10-22T00:00:00Z' };
  feedbackRows = [rejection]; process.env.STUDIO_MEMORY_FEEDBACK_ENABLED = 'true';
  const existing = { text: 'Complete synthetic existing draft. Its ending remains revision context only.' };
  for (const provider of ['openai', 'claude'] as const) {
    for (const readerPerson of ['A', 'B'] as const) {
      const fixture = { ...benchmarkFixture, facts: { ...base.facts, readerPerson,
        personA: readerPerson === 'A' ? 'you' : 'Rowan', personB: readerPerson === 'B' ? 'you' : 'Rowan' },
        sourceSnapshot: { ...benchmarkFixture.sourceSnapshot, existingDraft: existing } };
      const start = requests.length;
      const result = await generate({ ...fixture, provider });
      assert.equal(result.statusCode, 200);
      const stages = requests.slice(start);
      const writer = stages.find(request => request.kind === 'tldr_astro_generated_content');
      const prompt = provider === 'openai' ? writer.body.input : writer.body.messages[0].content[0].text;
      const rejectedAt = prompt.indexOf('BEGIN REJECTED WRITING AND OWNER CORRECTIONS');
      const rejectedEnd = prompt.indexOf('END REJECTED WRITING AND OWNER CORRECTIONS');
      const voiceAt = prompt.indexOf('DESIGNATED SYNASTRY VOICE REFERENCES');
      const briefAt = prompt.lastIndexOf('WRITE THE READER INTERPRETATION');
      assert(rejectedAt > prompt.indexOf(existing.text));
      assert(rejectedEnd > rejectedAt && voiceAt > rejectedEnd && briefAt > voiceAt);
      for (const exact of [rejection.rejected_text, rejection.owner_reason, voiceText, existing.text]) {
        assert.equal(prompt.split(exact).length - 1, 1, 'Every complete unit is preserved once in its evidence role.');
      }
      assert(prompt.slice(briefAt).includes(`Address the ${readerPerson === 'A' ? 'Mercury' : 'Moon'} person as you.`));
      assert.equal(result.result.generated.generation_metadata.evidencePacket.writingFeedback.selected.length, 1);
      assert(!JSON.stringify(result.result.generated.generation_metadata).includes(rejection.rejected_text),
        'Private rejected wording cannot enter the persisted public evidence shadow.');
      assert.equal(stages.filter(request => request.kind === 'tldr_astro_generated_content').length, 1);
      if (provider === 'openai') assert(prompt.indexOf(JSON.stringify(validPlan, null, 2)) < rejectedAt,
        'Meaning-only planning precedes negative evidence and complete positive references.');
    }
    const start = requests.length;
    const unnamed = await generate({ ...benchmarkFixture, provider, facts: { ...base.facts, personA: 'Rowan', personB: 'Casey' } });
    assert.equal(unnamed.statusCode, 200);
    const writer = requests.slice(start).find(request => request.kind === 'tldr_astro_generated_content');
    const prompt = provider === 'openai' ? writer.body.input : writer.body.messages[0].content[0].text;
    assert(prompt.slice(prompt.lastIndexOf('WRITE THE READER INTERPRETATION')).includes('No reader has been identified'));
  }
  feedbackRows = []; process.env.STUDIO_MEMORY_FEEDBACK_ENABLED = 'false';
  for (const unsafePlan of [{}, { core_tension: 'Their caution presses on your confidence.' },
    { core_tension: 'Person A wants you to agree with Person B.' }]) {
    nextPlan = unsafePlan; const start = requests.length;
    const result = await generate({ ...base, provider: 'openai' });
    assert.notEqual(result.statusCode, 200);
    assert.match(result.result.error, /SYNASTRY_MEANING_OWNERSHIP_UNRESOLVED/u);
    assert.deepEqual(requests.slice(start).map(request => request.kind), ['tldr_astro_meaning_plan'], 'Ambiguous plan stops before writer, reviewer or rewrite.');
  }
  nextPlan = validPlan;
  nextPlan = { ...validPlan, constructive_expression: 'Person A should listen patiently so Person B feels understood.' };
  const remedyStart = requests.length;
  const remedyResult = await generate({ ...base, provider: 'openai' });
  assert.notEqual(remedyResult.statusCode, 200);
  assert.match(remedyResult.result.error, /SYNASTRY_UNREQUESTED_REMEDY/u);
  assert.deepEqual(requests.slice(remedyStart).map(request => request.kind), ['tldr_astro_meaning_plan'],
    'A provider ignoring the empty-remedy schema must stop before the writer; it must not trigger another draft.');
  nextPlan = validPlan;
  const beforeConflict = requests.length;
  const conflict = await generate({ ...base, provider: 'openai', facts: { ...base.facts, readerPlanet: 'Mercury' } });
  assert.notEqual(conflict.statusCode, 200); assert.match(conflict.result.error, /SYNASTRY_OWNERSHIP_CONFLICT/u);
  assert.equal(requests.length, beforeConflict, 'Conflicting reader facts stop before any paid stage.');
  validateGeneratedContentQuality({ ...draft, body: draft.body + ' Synthetic sentence — continued.' } as any,
    { ...base, surface: 'composite', eventType: 'composite-aspect', facts: {} } as any);
  const reviser = governedInstructionsForRole('REVISER', { surface: 'synastry', family: 'synastry-aspect' });
  assert(reviser.includes('Revise only the supplied failed fields'));
  assert(!reviser.includes(RHETORICAL_WRITER_POLICY));
  assert(reviser.includes(GHOSTWRITING_SKILL_INSTRUCTIONS));
  assert(reviser.includes('A meaning plan establishes supported interpretation, not reader wording'));
  assert(!reviser.includes('SKY PLACEMENT ARTICLE SPINE'));
  assert.throws(() => governedInstructionsForRole('WRITER', { surface: 'synastry', family: 'synastry-aspect',
    governedInstructions: 'An unrelated instruction override.' }), /canonical role instructions/);
  await assert.rejects(callOpenAIResponses({ apiKey: 'synthetic', role: 'WRITER', surface: 'synastry', family: 'synastry-aspect',
    request: { input: 'Synthetic request.', instructions: 'An unrelated override.' } }), /may not override/);
  // Sharing a surface name alone cannot change an unrelated call's authority.
  assert(governedInstructionsForRole('WRITER', { surface: 'synastry', family: 'composite-aspect' }).includes('SKY PLACEMENT ARTICLE SPINE'));
  // Other surfaces retain their own existing output and scene contracts.
  for (const provider of ['openai', 'claude'] as const) {
    const start = requests.length;
    await generate({ ...base, surface: 'composite', eventType: 'composite-aspect', provider,
      knowledgeIds: ['composite-moon-square-mercury'], facts: { planetA: 'Mercury', planetB: 'Moon', aspect: 'square' } });
    const request = requests.slice(start).find(request => request.kind === 'tldr_astro_generated_content');
    assert(request, 'Composite still reaches its existing writer.');
    const prompt = provider === 'openai' ? request.body.input : request.body.messages[0].content[0].text;
    const instructions = provider === 'openai' ? request.body.instructions : request.body.system;
    assert(!instructions.includes('Prefer direct causal sentences to report transitions'), 'The refinement stays within directional synastry.');
    assert(!instructions.includes('A meaning plan establishes supported interpretation, not reader wording'));
    assert(!prompt.includes('OUTPUT SHAPE FOR SYNASTRY ASPECT'));
    assert(prompt.includes('action: one specific useful move.'));
  }
  console.log('PASS synastry actual handler and both providers: directional facts, complete source and owner evidence, developed interpretation without forced advice, unchanged schema, valid and invalid results, denied access and composite isolation. All provider responses intercepted; zero billed calls.');
} finally { globalThis.fetch = originalFetch; restoreApprovalFixture(); }
