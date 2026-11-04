import assert from 'node:assert/strict';
import { extractArticleHoroscopes, articleTemplateWithHoroscopes, separateArticleHoroscopeRow } from '../apps/web/src/content/skyArticleHoroscopes.mjs';

const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const contentKey = 'sky/article-template/sun/scorpio';
const opening = '# Synthetic comparison template\n\nComplete synthetic opening.\n\nComplete synthetic final paragraph.';
let controls = 0;
function check(label, verify) {
  try { verify(); controls++; }
  catch (error) { error.message = `${label}: ${error.message}`; throw error; }
}
function reverseKeys(value) {
  if (Array.isArray(value)) return value.map(reverseKeys);
  return value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseKeys(item)])) : value;
}
for (const authored of [false, true]) {
  const introduction = 'Complete synthetic horoscope introduction.\n\n' + (authored ? 'Complete introduction ending.' : '{{risingBlocks}}');
  const raw = `${opening}\n\n## Horoscopes\n\n${introduction}${authored ? '\n\n' + signs.map(sign => `### ${sign} & ${sign} Rising\n\nSynthetic ${sign} opening.\n\nSynthetic ${sign} final sentence.`).join('\n\n') : ''}`;
  const section = extractArticleHoroscopes(raw, contentKey).articleHoroscopes;
  const row = value => ({ content_key: contentKey, body: raw, status: 'DRAFT', updated_at: '2026-11-04T00:00:00Z',
    sections: { unrelated: { '\u00e9': 'composed', 'e\u0301': 'decomposed' }, articleHoroscopes: value },
    source_snapshot: { horoscopeSeparation: { originalBody: 'Preserve earlier original provenance.' } } });
  for (const [label, value] of [['canonical keys', section], ['reversed keys at every depth', reverseKeys(section)],
    ['database-shaped key order', { schema: section.schema, heading: section.heading, passages: section.passages.map(reverseKeys), introduction: section.introduction }]]) {
    check(`${authored ? 'twelve passages' : 'generic'}: ${label}`, () => {
      const input = row(value), before = structuredClone(input);
      const saved = separateArticleHoroscopeRow(input);
      assert.equal(saved.body, opening);
      assert.equal(saved.sections.articleHoroscopes.heading, '## Horoscopes');
      assert.equal(articleTemplateWithHoroscopes(saved.body, saved.sections), raw);
      assert.deepEqual(saved.sections.unrelated, input.sections.unrelated);
      assert.deepEqual(saved.source_snapshot, input.source_snapshot);
      assert.equal(saved.status, 'DRAFT'); assert.equal(saved.updated_at, input.updated_at);
      assert.deepEqual(input, before, 'Normalization never edits the input object');
    });
  }
  const conflicts = [
    ['heading text', value => { value.heading = '## Different Horoscopes'; }],
    ['introduction text', value => { value.introduction += ' Different final sentence.'; }],
    ['introduction whitespace', value => { value.introduction += ' '; }],
    ['distinct composed Unicode key', value => { value['\u00e9'] = 'Keep composed.'; }],
    ['distinct decomposed Unicode key', value => { value['e\u0301'] = 'Keep decomposed.'; }],
    ['both Unicode keys', value => { value['\u00e9'] = 'Composed value.'; value['e\u0301'] = 'Different decomposed value.'; }],
  ];
  for (const unknown of [null, false, 0, '', ['complete', 'array'], { nested: { b: 2, a: 1 } }]) {
    conflicts.push([`unknown field ${JSON.stringify(unknown)}`, value => { value.unexpected = unknown; }]);
  }
  if (authored) conflicts.push(
    ['passage order', value => { value.passages.reverse(); }],
    ['passage final text', value => { value.passages[0].body += ' Different final sentence.'; }],
    ['passage heading text', value => { value.passages[0].heading += ' Different heading.'; }],
    ['house assignment order', value => { [value.passages[0].house, value.passages[1].house] = [value.passages[1].house, value.passages[0].house]; }],
    ['nested unknown field', value => { value.passages[0].unexpected = { full: ['first', 'last'] }; }],
    ['nested composed and decomposed keys', value => { value.passages[0]['\u00e9'] = false; value.passages[0]['e\u0301'] = null; }],
  );
  for (const [label, change] of conflicts) check(`${authored ? 'twelve passages' : 'generic'} refuses ${label}`, () => {
    const value = reverseKeys(section); change(value);
    const input = row(value), before = structuredClone(input);
    assert.throws(() => separateArticleHoroscopeRow(input), /different versions/u);
    assert.deepEqual(input, before, 'A refusal leaves the full source untouched');
  });
}
console.log(JSON.stringify({ passed: controls, failed: 0, scope: 'actual pure separation function',
  protectedReads: 0, private51Reads: 0, backendCalls: 0, productionWrites: 0 }));
