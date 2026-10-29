import assert from 'node:assert/strict';
import SwissEph from 'swisseph-wasm';
import { SKY_INGRESS_ARTICLE_FORMAT } from '../../apps/web/src/content/skyIngressEssay.mjs';
import { compileSkyArticleEdition } from '../../apps/web/src/content/skyArticleTemplateCompiler';
import { skyIngressEssayReaderSection } from '../../apps/web/src/content/skyIngressEssayReader';
import { INGRESS_WRITER_CONTRACT } from '../../api/_lib/transit-ingress-editorial-authority';

/** Independently solve both boundaries from raw Swiss positions, without the app's date helpers or cache. */
async function assertMoonVisitBoundaries(facts: any, referenceDate: string, expectedSign: string) {
  const swiss = new SwissEph(); await swiss.initSwissEph();
  const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  const signAt = (time: number) => {
    const date = new Date(time);
    const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + (date.getUTCSeconds() + date.getUTCMilliseconds() / 1000) / 3600;
    const jd = swiss.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour);
    const longitude = swiss.calc_ut(jd, swiss.SE_MOON, swiss.SEFLG_SWIEPH | swiss.SEFLG_SPEED)[0];
    return signs[Math.floor(((longitude % 360) + 360) % 360 / 30)];
  };
  const reference = Date.parse(referenceDate + 'T12:00:00Z');
  assert.equal(signAt(reference), expectedSign, 'Independent Swiss position agrees with the explicit reference-date sign.');
  assert.equal(facts.sign, expectedSign);
  for (const direction of [-1, 1]) {
    let outside = reference;
    for (let step = 0; step < 16 && signAt(outside) === expectedSign; step++) outside += direction * 6 * 3_600_000;
    assert.notEqual(signAt(outside), expectedSign, 'An independent bounded search brackets the Moon sign change.');
    let lower = Math.min(reference, outside), upper = Math.max(reference, outside);
    while (upper - lower > 1) {
      const middle = Math.floor((lower + upper) / 2);
      if ((signAt(middle) === expectedSign) === (direction < 0)) upper = middle;
      else lower = middle;
    }
    const reported = Date.parse(direction < 0 ? facts.transitStartInstant : facts.transitEndInstant);
    assert(Math.abs(reported - upper) <= 1000, 'The app boundary agrees with independent Swiss to its whole-second calculation precision.');
    assert.equal(signAt(reported + direction * 1000) === expectedSign, false, 'Outside the reported boundary has the adjacent sign.');
    assert.equal(signAt(reported - direction * 1000), expectedSign, 'Inside the reported boundary has the selected sign.');
  }
}

/** Actual handlers and Swiss calculations, with every network request intercepted. */
export async function verifySkyVisitWriter(invoke: (handler: any, method: string, url: string, body?: unknown, authorized?: boolean) => Promise<any>, handler: any, factsHandler: any) {
  const previousFetch = globalThis.fetch;
  const memory = process.env.STUDIO_MEMORY_FEEDBACK_ENABLED, feedback = process.env.STUDIO_WRITING_FEEDBACK_ENABLED;
  process.env.STUDIO_MEMORY_FEEDBACK_ENABLED = 'false'; process.env.STUDIO_WRITING_FEEDBACK_ENABLED = 'false';
  let providerCalls = 0, templateReads = 0;
  try {
    globalThis.fetch = async (input, options = {}) => {
      const url = new URL(String(input));
      if (url.origin === 'https://ingress.invalid') {
        assert.equal(options.method ?? 'GET', 'GET', 'Visit generation must not save a template, article or profile.');
        if (url.pathname.endsWith('/generated_interpretations') && url.searchParams.get('id') === 'eq.synthetic-unapproved') {
          templateReads++;
          return Response.json([{ id: 'synthetic-unapproved', content_key: 'sky/article-template/moon/gemini',
            event_type: 'sky-article-template', body: 'Synthetic unapproved template.', status: 'DRAFT', lane: 'reference', review_state: null, source_snapshot: {} }]);
        }
        return Response.json([]);
      }
      if (url.origin === 'https://science.nasa.gov') return new Response('<p>Synthetic astronomy explanation.</p>');
      if (url.origin === 'https://ssd.jpl.nasa.gov') return new Response('Synthetic independent-check outage', { status: 503 });
      if (url.href === 'https://api.openai.com/v1/responses') {
        providerCalls++;
        assert.equal(providerCalls, 1, 'One writer request, without a judge, retry or rewrite.');
        const request = JSON.parse(String(options.body));
        assert.equal(request.model, 'gpt-5.6-sol');
        assert(request.instructions.includes(INGRESS_WRITER_CONTRACT.authority), 'The current ingress authority remains in effect.');
        assert(request.instructions.includes(INGRESS_WRITER_CONTRACT.ghostwriter));
        assert(request.input.includes('"selectedPlanet":"moon"') && request.input.includes('"selectedSign":"gemini"'));
        const names = request.text.format.schema.properties.slotValues.required;
        const slotValues = Object.fromEntries(names.map((name: string) => [name, name === 'articleBody'
          ? 'Synthetic complete Moon visit article.\n\nSynthetic final Moon sentence.' : 'Synthetic complete metadata.']));
        return Response.json({ id: 'synthetic-moon-visit-response', output_text: JSON.stringify({ slotValues }) });
      }
      throw new Error(`Unexpected test network origin: ${url.origin}`);
    };
    const body = { visit: { planet: 'moon', sign: 'gemini' }, referenceDate: '2026-10-28', format: SKY_INGRESS_ARTICLE_FORMAT, provider: 'openai' };
    const path = '/api/admin/sky-article-template-slots';
    assert.equal((await invoke(handler, 'POST', path, body, false)).status, 401);
    assert.equal((await invoke(handler, 'POST', path, { ...body, articleScope: 'day' })).status, 409, 'A stale day-generation control cannot silently generate a full-visit article.');
    for (const invalid of [
      { ...body, templateId: 'synthetic-unapproved' }, { ...body, visit: { planet: 'invalid', sign: 'gemini' } },
      { ...body, referenceDate: '2026-02-30' }, { ...body, format: 'saved-template' }
    ]) assert.equal((await invoke(handler, 'POST', path, invalid)).status, 400);
    const mismatched = await invoke(handler, 'POST', path, { ...body, visit: { planet: 'moon', sign: 'capricorn' } });
    assert.equal(mismatched.status, 422, JSON.stringify({ status: mismatched.status, error: mismatched.error }));
    assert.equal((await invoke(handler, 'POST', path, { templateId: 'synthetic-unapproved', referenceDate: body.referenceDate, format: body.format })).status, 422);
    assert.equal(providerCalls, 0); assert.equal(templateReads, 1, 'Saved templates retain their approval guard.');
    const calculated = await invoke(factsHandler, 'GET', '/api/admin/sky-article-facts?planet=moon&date=2026-10-28&format=' + body.format);
    assert.equal(calculated.status, 200); assert.equal(calculated.facts.sign, 'gemini');
    const secondVisit = await invoke(factsHandler, 'GET', '/api/admin/sky-article-facts?planet=moon&date=2026-10-22&format=' + body.format);
    assert.equal(secondVisit.status, 200);
    await assertMoonVisitBoundaries(calculated.facts, '2026-10-28', 'gemini');
    await assertMoonVisitBoundaries(secondVisit.facts, '2026-10-22', 'pisces');
    const start = Date.parse(calculated.facts.transitStartInstant), end = Date.parse(calculated.facts.transitEndInstant);
    assert(start <= Date.parse('2026-10-28T12:00:00Z') && end > Date.parse('2026-10-28T12:00:00Z'));
    assert(end - start > 86_400_000 && end - start < 4 * 86_400_000, 'The article covers the calculated Moon visit, not only October 28.');
    const completedFields = Object.fromEntries(calculated.facts.templateFields.map((field: { name: string }) => [field.name, 'Synthetic retained field.']));
    const legacy = await invoke(handler, 'POST', path, { templateId: 'builtin:moon-ingress-v3', referenceDate: body.referenceDate,
      format: body.format, articleScope: 'visit', existingSlotValues: completedFields });
    assert.equal(legacy.status, 200); assert.equal(legacy.generation, null); assert.equal(providerCalls, 0);
    assert.equal(legacy.facts.transitStartInstant, calculated.facts.transitStartInstant);
    const inspection = await invoke(handler, 'GET', path + '?inspect=ingress-voice&planet=moon&sign=gemini');
    assert.equal(inspection.status, 200); assert.equal(inspection.correctionDelivery.templateKey, 'sky/article-template/moon/gemini');
    assert.equal(inspection.providerCalls, 0); assert.equal(inspection.saved, false); assert.equal(inspection.published, false);
    const result = await invoke(handler, 'POST', path, body);
    assert.equal(result.status, 200, 'The standard layout supports Moon generation without a fabricated saved-template approval.');
    assert.equal(providerCalls, 1); assert.equal(templateReads, 1);
    assert.equal(result.generation.templateOrigin, 'standard-ingress-layout');
    assert.equal(result.generation.ingressValidation.ownerApproved, false);
    assert.equal(result.slotValues.articleBody, 'Synthetic complete Moon visit article.\n\nSynthetic final Moon sentence.');
    const edition = await compileSkyArticleEdition({ ...result.facts, format: body.format,
      templateBody: '', templateKey: 'sky/article-template/moon/gemini', tldr: result.slotValues.what,
      slotValues: { ...result.slotValues, ...result.facts.slotValues }, housePassages: [], aspectPassages: [] });
    const candidate = { id: 'synthetic-moon-visit', contentKey: edition.contentKey, status: 'LIVE', sections: { skyArticleEdition: edition }, sourceSnapshot: {} as Record<string, unknown> };
    const context = { planet: 'moon', sign: 'gemini', activeInstant: '2026-10-28T12:00:00Z' };
    assert.equal(skyIngressEssayReaderSection([candidate], context), null, 'An unapproved generated article never overrides fallback copy.');
    candidate.sourceSnapshot = { ownerApproval: { approved: true, action: 'approve-sky-article-edition', contentKey: edition.contentKey,
      templateKey: edition.templateKey, templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash } };
    assert.equal(skyIngressEssayReaderSection([{ ...candidate, status: 'DRAFT' }], context), null);
    assert.equal(skyIngressEssayReaderSection([candidate], context)?.body, edition.body, 'The exact approved article is selected during the full matching visit.');
    for (const instant of [start - 1, end]) assert.equal(skyIngressEssayReaderSection([candidate], { ...context, activeInstant: new Date(instant).toISOString() }), null);
  } finally {
    globalThis.fetch = previousFetch;
    if (memory === undefined) delete process.env.STUDIO_MEMORY_FEEDBACK_ENABLED; else process.env.STUDIO_MEMORY_FEEDBACK_ENABLED = memory;
    if (feedback === undefined) delete process.env.STUDIO_WRITING_FEEDBACK_ENABLED; else process.env.STUDIO_WRITING_FEEDBACK_ENABLED = feedback;
  }
}
