import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readFileSync } from 'node:fs';
import authority from '../src/astro-writing/transitIngressEditorialAuthority.cjs';
import { generateSkyArticleTemplateSlots, generateWithOpenAI, generateWithClaude } from '../api/_lib/content-generation.ts';
import { ingressProviderSlots, buildSkyIngressWritingContext, buildIngressTemplateReference } from '../api/_lib/sky-ingress-writing.ts';
import { SKY_INGRESS_ESSAY_FORMAT, SKY_INGRESS_ARTICLE_FORMAT } from '../apps/web/src/content/skyIngressEssay.mjs';

assert(authority.INGRESS_WRITER_CONTRACT, 'One canonical ingress contract must be exported for both providers and adapters.');
const { INGRESS_WRITER_CONTRACT: contract } = authority;
assert.equal(contract.format, SKY_INGRESS_ARTICLE_FORMAT);
assert(!/100[–-]180|120[–-]180|60[–-]100|ingressTransitBody\d/u.test(JSON.stringify(contract)));
Object.assign(process.env, { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'synthetic-retired-ingress',
  SUPABASE_URL: 'https://retired-ingress.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic',
  STUDIO_MEMORY_FEEDBACK_ENABLED: 'false', STUDIO_WRITING_FEEDBACK_ENABLED: 'false' });
const { default: handler } = await import('../api/admin/sky-article-template-slots.ts');
process.env.CONTENT_GENERATION_SECRET = 'synthetic-retired-ingress';
const originalFetch = globalThis.fetch;
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error('No provider, storage or calculation request is allowed.'); };
try {
  const req = Object.assign(Readable.from([JSON.stringify({ templateId: 'synthetic', referenceDate: '2026-10-21',
    format: SKY_INGRESS_ESSAY_FORMAT, provider: 'openai' })]), { method: 'POST', url: '/api/admin/sky-article-template-slots',
    headers: { 'x-content-generation-secret': 'synthetic-retired-ingress' } });
  const res = { statusCode: 0, result: {} as any, setHeader() {}, end(value: string) { this.result = JSON.parse(value); } };
  await handler(req, res);
  assert.equal(res.statusCode, 409, 'A stale browser or saved workspace cannot dispatch the retired report writer.');
  assert.match(res.result.error, /retired|current ingress writer/iu);
  const missingMode = Object.assign(Readable.from([JSON.stringify({ templateId: 'synthetic', referenceDate: '2026-10-21' })]),
    { method: 'POST', url: req.url, headers: req.headers });
  await handler(missingMode, res);
  assert.equal(res.statusCode, 400, 'A request cannot silently fall back from ingress to another writer.');
  for (const provider of [generateWithOpenAI, generateWithClaude]) {
    for (const format of [SKY_INGRESS_ESSAY_FORMAT, SKY_INGRESS_ARTICLE_FORMAT]) {
      await assert.rejects(provider({ contentKey: 'sky/article-template/sun/libra', mode: 'article', surface: 'sky',
        eventType: 'sky-article-template-slots', facts: { articleFormat: format } }), /dedicated current ingress writer/iu);
    }
  }
  await assert.rejects(generateSkyArticleTemplateSlots({ templateKey: 'sky/article-template/sun/libra', templateBody: '{{overviewBody}}',
    planet: 'sun', sign: 'libra', facts: { articleFormat: SKY_INGRESS_ESSAY_FORMAT }, requestedSlots: [{ name: 'overviewBody' }] }), /retired|current ingress writer/iu);
  await assert.rejects(generateSkyArticleTemplateSlots({ templateKey: 'sky/article-template/sun/libra', templateBody: '{{articleBody}}',
    planet: 'sun', sign: 'libra', facts: { articleFormat: SKY_INGRESS_ARTICLE_FORMAT }, requestedSlots: [{ name: 'articleBody' }] }), /calculated ingress context/iu);
  await assert.rejects(generateSkyArticleTemplateSlots({ templateKey: 'sky/article-template/sun/libra', templateBody: '{{articleBody}}',
    planet: 'sun', sign: 'libra', facts: { articleFormat: SKY_INGRESS_ARTICLE_FORMAT }, requestedSlots: [{ name: 'articleBody' }],
    ingressWriting: { plan: { articleFormat: SKY_INGRESS_ARTICLE_FORMAT } } as any,
    ingressTemplateReference: buildIngressTemplateReference('sky/article-template/sun/libra', 'Synthetic complete saved guide reference.') }), /KB and Calendar season meaning/iu);
  assert.throws(() => buildSkyIngressWritingContext({ articleFormat: SKY_INGRESS_ESSAY_FORMAT }), /current ingress writer|retired/iu);
  assert.throws(() => ingressProviderSlots([{ name: 'ingressTransitBody1' }], { plan: { articleFormat: SKY_INGRESS_ARTICLE_FORMAT } } as any), /field|contract/iu);
  assert.throws(() => ingressProviderSlots([{ name: 'when' }], { plan: { articleFormat: SKY_INGRESS_ARTICLE_FORMAT } } as any), /writer contract/);
  assert.equal(networkCalls, 0);
} finally { globalThis.fetch = originalFetch; }
const generationSource = readFileSync('api/_lib/content-generation.ts', 'utf8');
const coverageSource = readFileSync('api/_lib/sky-ingress-writing.ts', 'utf8');
assert(!/SKY_INGRESS_ESSAY_INSTRUCTIONS|name: `ingressTransitBody/u.test(generationSource + coverageSource));
console.log('Ingress authority: retired HTTP/direct generation closed, required evidence checked, legacy fragment fields rejected before any network call.');
