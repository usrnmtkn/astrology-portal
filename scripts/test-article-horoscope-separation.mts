import assert from 'node:assert/strict';
import {articleHoroscopeSection, articleTemplateWithHoroscopes, separateArticleHoroscopeRow} from '../apps/web/src/content/skyArticleHoroscopes.mjs';
import {compileSkyArticleEdition} from '../apps/web/src/content/skyArticleTemplateCompiler.ts';

const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const opening='# Test Article\n\nKeep the entire article opening.\n\nKeep its final paragraph.';
const horoscope=signs.map(sign=>`### ${sign} & ${sign} Rising\n\n${sign} complete opening.\n\n{{transitThreads}}\n\n${sign} complete ending.`).join('\n\n');
for(const planet of ['sun','mercury','venus','mars','jupiter','chiron','neptune','pluto','uranus']) {
 for(const sign of signs) {
  const row={content_key:`sky/article-template/${planet}/${sign.toLowerCase()}`,body:`${opening}\n\n## ${planet} in ${sign} Horoscopes\n\n${horoscope}`,sections:{unrelated:'keep'},status:'REVIEWED',updated_at:'2026-09-11T01:00:00Z',source_snapshot:{review_status:'approved'}};
  const separated=separateArticleHoroscopeRow(row);
  assert.equal(separated.body,opening);
  const section=articleHoroscopeSection(separated.sections)!;
  assert.equal(section.passages.length,12);
  assert.equal(new Set(section.passages.map(p=>p.house)).size,12);
  assert.equal(section.passages.find(p=>p.risingSign===sign.toLowerCase())!.house,1);
  assert.equal(articleTemplateWithHoroscopes(separated.body,separated.sections),row.body);
  assert.equal(separated.status,row.status);
  assert.equal(separateArticleHoroscopeRow(separated),separated);
  assert.equal((separated.source_snapshot as any).horoscopeSeparation.originalBody,row.body);
  assert.equal(separated.sections.unrelated,'keep');
 }
}
const row={content_key:'sky/article-template/sun/aries',body:`${opening}\n\n## Horoscopes\n\n${horoscope}`,sections:{}};
const separated=separateArticleHoroscopeRow(row);
assert.throws(()=>separateArticleHoroscopeRow({...row,body:row.body.replace('Aries complete ending.','Different ending.'),sections:separated.sections}),/different versions/);
assert.throws(()=>separateArticleHoroscopeRow({...row,body:row.body.replace('Pisces & Pisces Rising','Aries & Aries Rising')}),/distinct rising signs/);
assert.throws(()=>separateArticleHoroscopeRow({...row,body:row.body.replace('Pisces & Pisces Rising','Unknown & Unknown Rising')}),/distinct rising signs/);
assert.throws(()=>separateArticleHoroscopeRow({...row,body:row.body+'\n\n## Important article close\nNever lose me.'}),/sections follow/);
assert.throws(()=>separateArticleHoroscopeRow({...row,sections:['unrelated preserved text']}),/manual review/);
const generic=separateArticleHoroscopeRow({content_key:'sky/article-template/uranus/ingress',body:opening+'\n\n## Horoscopes\n\nRead your rising sign.\n\n{{risingBlocks}}',sections:{}});
assert.equal(articleHoroscopeSection(generic.sections)!.passages.length,0);
assert.equal(articleTemplateWithHoroscopes(generic.body,generic.sections),opening+'\n\n## Horoscopes\n\nRead your rising sign.\n\n{{risingBlocks}}');
const edition=await compileSkyArticleEdition({templateKey:row.content_key,templateBody:separated.body,templateSections:separated.sections,
 planet:'sun',sign:'aries',entryYear:2026,validFrom:'2026-03-20',validTo:'2026-04-20',transitStartInstant:'2026-03-20T00:00:00Z',transitEndInstant:'2026-04-20T00:00:00Z',
 slotValues:{transitThreads:'Calculated fixture thread.'},housePassages:[],tldr:'Explicit fixture summary.'});
assert.equal(edition.body,opening.replace('# Test Article\n\n',''));
assert.equal(edition.housePassages.length,12);
for(const passage of edition.housePassages){
 assert(passage.body.endsWith(`${signs.find(s=>s.toLowerCase()===passage.risingSign)} complete ending.`));
 assert(passage.body.includes('Calculated fixture thread.'));
 assert(!passage.body.includes('{{'));
}
assert.equal((edition.compiledMarkdown.match(/Aries complete ending\./gu)??[]).length,1);
assert(!edition.body.includes('complete ending.'));
console.log('PASS 108 article identities: lossless separation, correct house mapping, malformed/conflicting rejection, generic slots, full compiled horoscope copy without article duplication.');
