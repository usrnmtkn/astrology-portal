import { Readable } from 'node:stream';
import { readFileSync } from 'node:fs';
import { syntheticTransitSources, encodeTransitSources } from '../../scripts/fixtures/personal-transit-writing.mjs';

const calibration={required:true,id:'synthetic-browser-review',source:'synthetic-owner-request',contentKeys:['authored/transit-aspect/neptune/jupiter/trine']};
const fixtureSources=(reviewed:boolean)=>{
  const sources=syntheticTransitSources({reviewed});
  for(const meaning of sources.meanings) if(meaning.review) meaning.review={...meaning.review,calibrationId:calibration.id};
  return {...sources,calibration};
};

// Isolated browser fixture: real authenticated handler and private source
// loader, intercepted storage and model transport. Never loads real credentials.
const env = { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'synthetic-browser-transit',
  SUPABASE_URL: 'https://transit-browser.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic',
  OPENAI_API_KEY: 'synthetic', ANTHROPIC_API_KEY: 'synthetic', STUDIO_MEMORY_FEEDBACK_ENABLED: 'false',
  PRIVATE_PERSONAL_TRANSIT_SOURCES: encodeTransitSources(fixtureSources(false)) };
Object.assign(process.env, env);
const { default: handler } = await import('../../api/admin/personal-transit-writing.js');
Object.assign(process.env, env);
let providerCalls = 0;
globalThis.fetch = async (url, init = {}) => {
  if (String(url).startsWith(env.SUPABASE_URL)) {
    if (init.method && init.method !== 'GET') throw Error('Fixture forbids writing saved content');
    return Response.json(JSON.parse(readFileSync(process.env.CALENDAR_REVIEW_FIXTURE!, 'utf8')));
  }
  if (String(url) !== 'https://api.openai.com/v1/responses') throw Error('Unexpected fixture network destination');
  providerCalls++;
  const request = JSON.parse(String(init.body));
  const names = request.text.format.schema.properties.slotValues.required;
  return Response.json({ id: 'synthetic-browser-response', output_text: JSON.stringify({ slotValues:
    Object.fromEntries(names.map((name: string) => [name, `${name === 'youDraft' ? 'You' : 'They'} read the complete synthetic result until {{untilDate}}.`])) }) });
};
process.on('message', async (message: any) => {
  try {
    if (message.fixture === 'review-meaning') {
      process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES = encodeTransitSources(fixtureSources(true));
      process.send!({ id: message.id, result: { status: 200, body: { fixtureOnly: true }, providerCalls } });
      return;
    }
    const body = { ...message.body, provider: 'openai' };
    const req = Object.assign(Readable.from([JSON.stringify(body)]), { method: message.method,
      headers: { 'x-content-generation-secret': env.CONTENT_GENERATION_SECRET } });
    const res = { statusCode: 0, result: {} as any, setHeader() {}, end(value: string) { this.result = JSON.parse(value); } };
    await handler(req as any, res as any);
    process.send!({ id: message.id, result: { status: res.statusCode, body: res.result, providerCalls } });
  } catch (error) { process.send!({ id: message.id, error: error instanceof Error ? error.message : String(error) }); }
});
process.send!({ ready: true });
