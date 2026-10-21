import assert from 'node:assert/strict';
import { REVIEW_FIELDS } from '../src/astro-writing/canonicalInstructions.mjs';
import { RHETORICAL_LABELS } from '../src/astro-writing/rhetoricalPatterns.mjs';
import handler from '../api/generate-content.js';

Object.assign(process.env, {
  NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'synthetic-synastry-secret',
  OPENAI_API_KEY: 'synthetic', ANTHROPIC_API_KEY: 'synthetic',
  STUDIO_MEMORY_FEEDBACK_ENABLED: 'false', WRITING_KERNEL_GOVERNED_SURFACES: '',
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
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const openai = String(url) === 'https://api.openai.com/v1/responses';
  assert(openai || String(url) === 'https://api.anthropic.com/v1/messages', 'All storage and unexpected network calls are forbidden.');
  const body = JSON.parse(String(init.body));
  const kind = openai ? body.text.format.name : body.tools[0].name;
  requests.push({ kind, provider: openai ? 'openai' : 'claude', body });
  let result: unknown = nextDraft;
  if (kind === 'tldr_astro_meaning_plan') result = {};
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
  const schema = request.provider === 'openai' ? request.body.text.format.schema : request.body.tools[0].input_schema;
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
  assert(prompt.includes('owner_authored_final'), 'Existing eligible owner retrieval is retained.');
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
        facts: { ...base.facts, planetA: 'Moon', planetB: 'Venus', aspect: 'conjunction' } }]) {
      const start = requests.length;
      const response = await generate({ ...variant, provider });
      assert.equal(response.statusCode, 200, JSON.stringify(response.result));
      const writers = requests.slice(start).filter(request => ['tldr_astro_generated_content'].includes(request.kind));
      assert.equal(writers.length, 1, 'No added writer stage or rewrite on a valid result.');
      assert.deepEqual(requests.slice(start).map(request => request.kind), provider === 'openai'
        ? ['tldr_astro_meaning_plan', 'tldr_astro_generated_content', 'tldr_astro_cold_rendered_prose_review', 'tldr_astro_marie_review']
        : ['tldr_astro_generated_content'], 'The existing provider call sequence is unchanged.');
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
    nextDraft = draft;
  }
  // Other surfaces retain their own existing output and scene contracts.
  for (const provider of ['openai', 'claude'] as const) {
    const start = requests.length;
    await generate({ ...base, surface: 'composite', eventType: 'composite-aspect', provider,
      knowledgeIds: ['composite-moon-square-mercury'], facts: { planetA: 'Mercury', planetB: 'Moon', aspect: 'square' } });
    const request = requests.slice(start).find(request => request.kind === 'tldr_astro_generated_content');
    assert(request, 'Composite still reaches its existing writer.');
    const prompt = provider === 'openai' ? request.body.input : request.body.messages[0].content[0].text;
    assert(!prompt.includes('OUTPUT SHAPE FOR SYNASTRY ASPECT'));
    assert(prompt.includes('action: one specific useful move.'));
  }
  console.log('PASS synastry actual handler and both providers: directional facts, complete source and owner evidence, developed interpretation without forced advice, unchanged schema, valid and invalid results, denied access and composite isolation. All provider responses intercepted; zero billed calls.');
} finally { globalThis.fetch = originalFetch; }
