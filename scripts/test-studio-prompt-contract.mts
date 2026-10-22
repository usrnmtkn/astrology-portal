import assert from 'node:assert/strict';

const env = {
  NODE_ENV: 'test',
  CONTENT_GENERATION_SECRET: 'synthetic-prompt-secret',
  SUPABASE_URL: 'https://studio-prompt.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic',
  OPENAI_API_KEY: 'synthetic',
  ANTHROPIC_API_KEY: 'synthetic',
  TLDRASTRO_API_URL: 'https://calculation-prompt.invalid',
  STUDIO_MEMORY_FEEDBACK_ENABLED: 'false',
  STUDIO_WRITING_FEEDBACK_ENABLED: 'false',
};
Object.assign(process.env, env);
const { default: articleHandler } = await import('../api/admin/sky-article-writing.ts');
const { generateSkyArticleTemplateSlots } = await import('../api/_lib/content-generation.ts');
Object.assign(process.env, env);

const existing = 'Synthetic complete existing article. Its final sentence must reach the writer intact.';
const generated = 'Virgo season brings a temporary focus on the choices you make each day.';
const requests: any[] = [];
const seasonSources = [
  { id: 'synthetic-season', content_key: 'fallback-hook/zodiac-season/virgo', status: 'DRAFT', updated_at: '2026-10-21T12:00:00Z',
    body: 'Complete synthetic season meaning. Preserve its full ending.' },
  { id: 'synthetic-axis', content_key: 'fallback-hook/zodiac-season-polar-axis/virgo', status: 'LIVE', updated_at: '2026-10-21T12:00:00Z',
    body: 'Complete synthetic learning axis. Preserve both sides of its meaning.' },
  { id: 'synthetic-calendar', content_key: 'authored/lunar-journal/season/virgo/20250822t000000z', status: 'DRAFT', updated_at: '2026-10-21T12:00:00Z',
    body: 'Complete synthetic Calendar season passage. Its historical event is not a current fact.' },
];
let nextValues: Record<string, unknown> | null = null;
let sourcesUnavailable = false;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  if (String(url).startsWith(`${env.SUPABASE_URL}/rest/v1/generated_interpretations?`)) {
    assert.equal(init.method ?? 'GET', 'GET', 'Meaning retrieval must never save content.');
    return sourcesUnavailable ? Response.json({ error: 'synthetic outage' }, { status: 503 }) : Response.json(seasonSources);
  }
  if (String(url) === `${env.TLDRASTRO_API_URL}/sky/current`) {
    return Response.json({ generatedAt: '2026-09-01T12:00:00Z', positions: [
      { planet: 'Sun', longitude: 158, sign: 'Virgo', speed: 1, motion: 'direct' },
    ] });
  }
  const openai = String(url) === 'https://api.openai.com/v1/responses';
  const claude = String(url) === 'https://api.anthropic.com/v1/messages';
  assert(openai || claude, `Unexpected test network destination: ${String(url)}`);
  const body = JSON.parse(String(init.body));
  const prompt = openai ? body.input : body.messages[0].content[0].text;
  const schema = openai ? body.text.format.schema : body.tools[0].input_schema;
  requests.push({ provider: openai ? 'openai' : 'claude', prompt, schema });
  const slotValues = nextValues ?? Object.fromEntries(schema.properties.slotValues.required.map((name: string) => [name, generated]));
  return Response.json(openai
    ? { id: 'synthetic-prompt-response', output_text: JSON.stringify({ slotValues }) }
    : { id: 'synthetic-prompt-response', content: [{ type: 'tool_use', name: 'tldr_astro_sky_article_template_slots', input: { slotValues } }] });
};

async function revise(currentText: string, provider: 'openai' | 'claude', authorized = true) {
  const response = { statusCode: 0, result: {} as any, setHeader() {}, end(body: string) { this.result = JSON.parse(body); } };
  await articleHandler({ method: 'POST', headers: authorized ? { 'x-content-generation-secret': env.CONTENT_GENERATION_SECRET } : {},
    body: { planet: 'sun', sign: 'virgo', field: 'placementArticle', referenceDate: '2026-09-01',
      instruction: 'Clarify the last sentence while preserving the subject and source rules.', currentText, provider },
  } as any, response as any);
  return response;
}

function assertOutputContract(request: any, names: string[]) {
  assert.deepEqual(request.schema.required, ['slotValues']);
  assert.equal(request.schema.additionalProperties, false);
  assert.deepEqual(request.schema.properties.slotValues.required, names);
  assert.equal(request.schema.properties.slotValues.additionalProperties, false);
  assert(request.prompt.includes('OUTPUT CONTRACT'), 'The output contract must reach the writer.');
  assert(request.prompt.includes('sole top-level field is slotValues'), 'The enclosing object must be explicit.');
  assert(request.prompt.includes('BEFORE RETURNING'), 'The completion check must reach the writer.');
}

try {
  for (const provider of ['openai', 'claude'] as const) {
    const start = requests.length;
    const revised = await revise(existing, provider);
    assert.equal(revised.statusCode, 200, JSON.stringify(revised.result));
    assert.equal(revised.result.draft, generated);
    assert.equal(requests.length, start + 1, 'One successful rewrite uses one provider request.');
    const request = requests.at(-1);
    assert.equal(request.provider, provider);
    assert(request.prompt.includes('EXISTING ARTICLE CONTEXT'), 'The existing article must have a distinct revision context.');
    assert(!request.prompt.includes("The template's fixed prose is immutable"),
      'Existing article prose must be editable under the owner direction, not declared immutable.');
    assert.equal(request.prompt.split(existing).length - 1, 1, 'The complete existing article is delivered exactly once.');
    assert(!request.prompt.includes('PRIMARY OWNER-AUTHORED ARTICLE'), 'The caller text alone cannot establish owner authorship.');
    assert(request.prompt.includes('occurrence is validation context only'), 'Preserve reusable timing scope.');
    assert(request.prompt.includes('not for a person who has a natal Sun'), 'Preserve the Sky season register.');
    assert(request.prompt.includes('Neutral source notes cannot override calculated facts'), 'Preserve fact authority.');
    assert(request.prompt.includes('not approved and cannot serve by itself'), 'Preserve owner approval.');
    assert(request.prompt.includes('ZODIAC SEASON MEANING SOURCES'), 'Load the actual season sources, not only an instruction to consult them.');
    assert(request.prompt.includes('existing draft text cannot override them'), 'Revision context cannot perpetuate a source-inconsistent argument.');
    for (const source of seasonSources) assert(request.prompt.includes(source.body), 'Deliver every complete selected meaning passage.');
    assert(request.prompt.includes('TRANSIT AND INGRESS EDITORIAL AUTHORITY'), 'Use current writer guidance for reusable seasons too.');
    assert(!request.prompt.includes('One idea per sentence'), 'Historical cadence rules must not replace current owner voice instructions.');
    const meaningReceipt = revised.result.generation.generationMetadata.evidencePacket.seasonMeaning;
    assert.equal(meaningReceipt.sources.length, 3);
    assert.equal(meaningReceipt.sources[0].positiveVoiceEvidence, false);
    assert(!JSON.stringify(meaningReceipt).includes(seasonSources[0].body), 'Receipts expose identities and hashes, not private source bodies.');
    assertOutputContract(request, ['articleDraft']);

    const empty = await revise('', provider);
    assert.equal(empty.statusCode, 200);
    assert(requests.at(-1).prompt.includes('No existing reader-facing article prose was supplied'), 'Identify an empty article honestly.');
    assert(!requests.at(-1).prompt.includes("The template's fixed prose is immutable"), 'Empty article generation is not fixed-template filling.');

    const templateBody = 'Synthetic fixed template. {{opener}} and {{when}}.';
    nextValues = { opener: 'Synthetic complete prose with {{when}} preserved.' };
    const filled = await generateSkyArticleTemplateSlots({
      templateKey: 'sky/article-template/sun/virgo', templateBody, planet: 'sun', sign: 'virgo',
      facts: { planet: 'sun', sign: 'virgo' }, requestedSlots: [{ name: 'opener', description: 'Write the opening.' }],
      licensedVariables: ['when'], provider, writingMemory: null,
    });
    assert.equal(filled.slotValues.opener, nextValues.opener);
    assert(requests.at(-1).prompt.includes("The template's fixed prose is immutable"), 'Fixed templates must retain their protection.');
    assert(requests.at(-1).prompt.includes('and the supplied article or fixed template context for meaning'), 'Unrelated slot callers retain their existing source-authority instruction.');
    assert(requests.at(-1).prompt.includes(templateBody));
    assert(requests.at(-1).prompt.includes('{{when}}'));
    assertOutputContract(requests.at(-1), ['opener']);

    for (const [values, reason] of [
      [{ opener: 'Synthetic prose.', surprise: 'Unrequested field.' }, /unrequested template slots/u],
      [{}, /did not complete template slots/u],
      [{ opener: 'Synthetic prose with {{unlicensed}}.' }, /unresolved placeholder/u],
    ] as const) {
      nextValues = values;
      await assert.rejects(generateSkyArticleTemplateSlots({
        templateKey: 'sky/article-template/sun/virgo', templateBody, planet: 'sun', sign: 'virgo',
        facts: {}, requestedSlots: [{ name: 'opener' }], provider, writingMemory: null,
      }), reason);
    }
    nextValues = null;
  }
  const count = requests.length;
  assert.equal((await revise(existing, 'openai', false)).statusCode, 401);
  assert.equal(requests.length, count, 'An unauthorized request cannot reach a provider.');
  sourcesUnavailable = true;
  assert.equal((await revise(existing, 'openai')).statusCode, 503);
  assert.equal(requests.length, count, 'A meaning-source outage must stop before a paid request.');
  sourcesUnavailable = false;
  const sourceBody = seasonSources[0].body;
  seasonSources[0].body = '';
  assert.equal((await revise(existing, 'claude')).statusCode, 409);
  assert.equal(requests.length, count, 'An empty saved meaning source cannot silently fall back or spend a call.');
  seasonSources[0].body = sourceBody;
  console.log('Studio prompt contract passed: both providers, existing and empty articles, exact source delivery, immutable template filling, licensed variables, unchanged schemas, invalid output rejection and authenticated dispatch.');
} finally {
  globalThis.fetch = originalFetch;
}
