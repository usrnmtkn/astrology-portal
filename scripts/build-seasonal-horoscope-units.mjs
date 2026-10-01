import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {SEASONAL_EVIDENCE_MANIFEST,SEASONAL_SOURCE_ROOT,loadSeasonalHoroscopeEvidence} from '../src/astro-writing/seasonalHoroscopeEvidence.mjs';

// Explicit reader-field boundaries in the already registered owner articles.
// The entire sign body is preserved, including punctuation and paragraph breaks.
const corpus = JSON.parse(fs.readFileSync(`${SEASONAL_SOURCE_ROOT}manifest.json`,'utf8'));
const sources = ['pisces','gemini','virgo'].map(season => {
  const source = Object.values(corpus.cohorts).flat().find(row => row.sourceSlug === `${season}-season-2025`);
  const article = fs.readFileSync(`${SEASONAL_SOURCE_ROOT}${source.file}`,'utf8');
  const headings = [...article.matchAll(/^#{3,4} (Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces) (?:&|\/) \1 [Rr]ising[^\S\n]*$/gmu)];
  const readings = headings.map((heading,index) => {
    let start = heading.index + heading[0].length;
    let end = headings[index+1]?.index ?? article.length;
    // Pisces has a separate affiliate block following each complete horoscope.
    if (season === 'pisces') {
      const promotion = article.indexOf('\n\nLooking for the perfect gift?',start);
      if (promotion < start || promotion >= end) throw new Error('Review the Pisces reader-field boundary.');
      end = promotion;
    }
    while (/\s/u.test(article[start])) start++;
    while (/\s/u.test(article[end-1])) end--;
    const text = article.slice(start,end);
    return {sign:heading[1].toLowerCase(),start,end,sha256:createHash('sha256').update(text).digest('hex'),wordCount:text.split(/\s+/u).length};
  });
  const introductionEnd = article.search(/^#{2,3} (?:Pisces Seasons Horoscopes|Horoscopes for (?:Gemini|Virgo) Season)$/mu);
  if (introductionEnd < 1 || introductionEnd > headings[0].index) throw new Error('Review the complete seasonal introduction boundary.');
  const overviewText = article.slice(0,introductionEnd).trimEnd();
  const overview = {start:0,end:overviewText.length,sha256:createHash('sha256').update(overviewText).digest('hex'),wordCount:overviewText.split(/\s+/u).length};
  return {season,file:source.file,sha256:source.sha256,overview,readings};
});
const manifest = {schema:'seasonal-horoscope-units/v1',
  assignment:{date:'2026-09-30',reference:'codex-task:01a0ce6e-69e0-7100-bdba-ad413d5c7804',
    scope:'Owner supplied Pisces, Gemini and Virgo season examples and authorized complete seasonal sign readings as voice evidence. No new reader publication or factual authority.'},
  overviewAssignment:{date:'2026-10-01',reference:'codex-task:01a0ce6e-69e0-7100-bdba-ad413d5c7804',scope:'Owner authorized seasonal introductions and shared monthly overviews in the owner voice. Complete collective essays from the same supplied examples are register evidence, not new monthly authorship or current facts.'},sources};
const serialized = `${JSON.stringify(manifest,null,2)}\n`;
if (process.argv.includes('--check')) {
  if (fs.readFileSync(SEASONAL_EVIDENCE_MANIFEST,'utf8') !== serialized) throw new Error('Seasonal horoscope unit manifest is stale.');
} else fs.writeFileSync(SEASONAL_EVIDENCE_MANIFEST,serialized);
const entries = loadSeasonalHoroscopeEvidence(file => fs.readFileSync(file,'utf8'));
console.log(`Verified ${entries.length} complete seasonal sign readings from ${sources.length} unchanged owner articles.`);
