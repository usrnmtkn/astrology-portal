import assert from 'node:assert/strict';
import { SKY_INGRESS_ARTICLE_FORMAT, SKY_INGRESS_ESSAY_FORMAT, skyIngressFieldsForFormat, skyIngressTemplateForFormat } from '../apps/web/src/content/skyIngressEssay.mjs';
import { calculateSkyArticleEditionFacts } from '../api/_lib/sky-article-facts.ts';
import { buildSkyIngressWritingContext, ingressProviderSlots, assembleIngressFields, validateSkyIngressWriting } from '../api/_lib/sky-ingress-writing.ts';
import { compileSkyArticleEdition, assertCompiledSkyArticleEdition } from '../apps/web/src/content/skyArticleTemplateCompiler.ts';
import { skyIngressEssayReaderSection } from '../apps/web/src/content/skyIngressEssayReader.ts';

// Structural fixtures only. No generated or approved prose is stored here.
const originalFetch = globalThis.fetch;
globalThis.fetch = async target => {
  assert(['science.nasa.gov', 'ssd.jpl.nasa.gov'].includes(new URL(String(target)).hostname));
  return new Response('Synthetic independent comparison outage.', { status: 503 });
};
let facts: any, taurus: any;
try {
  facts = await calculateSkyArticleEditionFacts(new Date('2026-10-21T12:00:00Z'), 'sun', SKY_INGRESS_ARTICLE_FORMAT);
  taurus = await calculateSkyArticleEditionFacts(new Date('2027-05-10T12:00:00Z'), 'sun', SKY_INGRESS_ARTICLE_FORMAT);
}
finally { globalThis.fetch = originalFetch; }
const context = buildSkyIngressWritingContext(facts);
const fields = facts.templateFields;
const requested = fields.filter(field => !['articleTitle', 'when', 'priorOccurrenceSection'].includes(field.name));
assert.deepEqual(ingressProviderSlots(requested, context).map(field => field.name), ['what', 'takeaway', 'articleBody']);
assert(!fields.some(field => /overview|closing|majorTransit|ingressTransit/u.test(field.name)));
assert(!/Summary|What:|Takeaway:|overview|closing|majorTransit/u.test(skyIngressTemplateForFormat(SKY_INGRESS_ARTICLE_FORMAT)));
assert.match(skyIngressTemplateForFormat(SKY_INGRESS_ESSAY_FORMAT), /## Summary/);
assert(!/100–180|120–180|60–100|ingressTransitBody|exact event headers and position lines/u.test(context.prompt));
const body = 'Synthetic first paragraph. It contains no literary evidence.\n\nSynthetic second paragraph. It completes the fixture.';
const values = assembleIngressFields({ what: 'Synthetic metadata.', takeaway: 'Synthetic metadata.', articleBody: body }, requested, context);
assert.equal(values.articleBody, body, 'The complete body must pass through without app-inserted prose or headings.');
assert.equal(assembleIngressFields({ what: 'Synthetic metadata.', takeaway: 'Synthetic metadata.', articleBody: body, priorOccurrenceSection: '' },
  [...requested, { name: 'priorOccurrenceSection' }], context).priorOccurrenceSection, '',
  'An optional history section must be able to remain empty rather than force an unsupported recurrence claim.');
const dates = values.otherDatesSection;
for (const event of [...context.plan.developed, ...context.plan.requiredDates]) {
  assert.equal(dates.split(`${event.title}: ${event.event.dateLabel} at ${event.event.timeLabel}.`).length - 1, 1,
    `Exactly one calculated reference entry: ${event.title}.`);
}
assert.match(dates, /## Key dates/);
assert.match(dates, /Follow through: Venus stations direct: November 13, 2026 at 7:27 PM ET/);
assert.equal(validateSkyIngressWriting(values, context).passed, true);
assert.equal(validateSkyIngressWriting({ ...values, articleBody: `${body}\n\nSynthetic timing: October 4, 2026 at 8:29 AM ET.` }, context).passed, true,
  'The writer can use a verified exact time naturally in the article, without being forced into a date heading.');
for (const [bad, expected] of [
  [{ ...values, otherDatesSection: dates.replace('8:29 AM ET', '9:29 AM ET') }, /required event/],
  [{ ...values, articleBody: `${body}\n\nSynthetic date: October 4, 2026 at 9:29 AM ET.` }, /date and time/],
  [{ ...values, articleBody: `${body}\n\nSynthetic position: 99 degrees.` }, /numeric participant positions/],
  [{ ...values, articleBody: `${body}\n\nSynthetic claim: Libra is your seventh house.` }, /No rising sign/],
] as const) {
  const result = validateSkyIngressWriting(bad, context);
  assert.equal(result.passed, false);
  assert.match(result.issues.join(' '), expected);
}
const edition = await compileSkyArticleEdition({
  format: SKY_INGRESS_ARTICLE_FORMAT, planet: 'sun', sign: 'libra', entryYear: 2026,
  templateKey: 'sky/article-template/sun/libra', templateBody: 'Synthetic old source template.',
  validFrom: facts.validFrom, validTo: facts.validTo, transitStartInstant: facts.transitStartInstant,
  transitEndInstant: facts.transitEndInstant, tldr: '{{takeaway}}', housePassages: [],
  slotValues: { ...facts.slotValues, ...values },
});
assert.equal(edition.format, SKY_INGRESS_ARTICLE_FORMAT);
assert(edition.compiledMarkdown.includes(body));
assert(!edition.compiledMarkdown.includes('## Summary'));
assert(!edition.compiledMarkdown.includes('Synthetic metadata.\n\nSynthetic metadata.'));
assertCompiledSkyArticleEdition(edition);
const readerCandidate = { id: 'synthetic-narrative-edition', status: 'LIVE', contentKey: edition.contentKey,
  sections: { skyArticleEdition: edition }, sourceSnapshot: { ownerApproval: {
    approved: true, action: 'approve-sky-article-edition', contentKey: edition.contentKey, templateKey: edition.templateKey,
    templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash,
  } } };
const readerContext = { activeInstant: '2026-10-21T12:00:00Z', planet: 'sun', sign: 'libra' };
assert.equal(skyIngressEssayReaderSection([readerCandidate], readerContext)?.body, edition.body);
assert.equal(skyIngressEssayReaderSection([{ ...readerCandidate, status: 'DRAFT' }], readerContext), null);
assert.equal(skyIngressEssayReaderSection([{ ...readerCandidate, sourceSnapshot: {} }], readerContext), null);
assert.equal(facts.transitStartInstant, '2026-09-23T00:05:13.999Z');
assert.equal(facts.transitEndInstant, '2026-10-23T09:37:56.999Z');
assert.deepEqual(context.receipt.developedEventFacts.map(item => item.id), context.plan.developed.map(item => item.id));
const taurusContext = buildSkyIngressWritingContext(taurus);
assert.equal(taurusContext.plan.selectedSign, 'taurus');
assert(taurusContext.plan.meaningSources.some(source => source.sourceId === 'taurus'));
assert(taurusContext.plan.developed.every(item => item.event.startsAt.startsWith('2027-')));
assert(!taurusContext.prompt.includes('2026-10-04'), 'The narrative contract cannot import Libra event facts into another season.');
console.log('Ingress narrative contract: whole body, calculated complete dates, factual holds and versioned compilation pass. No paid calls or content writes.');
