import {createHash} from 'node:crypto';
import {HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';

export const SEASONAL_EVIDENCE_MANIFEST = 'data/writing/seasonal-horoscope-units.json';
export const SEASONAL_SOURCE_ROOT = 'packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/';
const seasons = ['pisces','gemini','virgo'];
const sha = text => createHash('sha256').update(text).digest('hex');

/** Resolve complete author-final units in place. No second corpus or prose transformation. */
export function loadSeasonalHoroscopeEvidence(read,{includeOverviews=false}={}) {
  const manifest = JSON.parse(read(SEASONAL_EVIDENCE_MANIFEST));
  const corpus = JSON.parse(read(`${SEASONAL_SOURCE_ROOT}manifest.json`));
  if (manifest.schema !== 'seasonal-horoscope-units/v1' || manifest.sources?.length !== 3) {
    throw new Error('Seasonal owner evidence is incomplete.');
  }
  const entries = [];
  for (const season of seasons) {
    const records = manifest.sources.filter(source => source.season === season);
    const record = records[0];
    const original = Object.values(corpus.cohorts).flat().find(source => source.sourceSlug === `${season}-season-2025`);
    if (records.length !== 1 || !original || record.file !== original.file || record.sha256 !== original.sha256) {
      throw new Error('Seasonal owner source registration changed.');
    }
    const sourcePath = `${SEASONAL_SOURCE_ROOT}${original.file}`;
    const article = read(sourcePath);
    if (sha(article) !== record.sha256 || record.readings?.length !== 12) {
      throw new Error('Seasonal owner source integrity failed.');
    }
    for (const sign of [...(includeOverviews?['overview']:[]),...HOROSCOPE_SIGNS]) {
      const units = sign==='overview'?[record.overview]:record.readings.filter(unit => unit.sign === sign);
      const unit = units[0];
      if (units.length !== 1 || !unit || !Number.isInteger(unit.start) || !Number.isInteger(unit.end)
        || unit.start < 0 || unit.end <= unit.start || unit.end > article.length) {
        throw new Error(`Seasonal ${sign==='overview'?'overview':'sign'} evidence is incomplete.`);
      }
      const text = article.slice(unit.start, unit.end);
      if (!text.trim() || sha(text) !== unit.sha256 || text.split(/\s+/u).length !== unit.wordCount) {
        throw new Error('The complete seasonal owner passage changed.');
      }
      const id = `owner-seasonal:${season}-season-2025:${sign}`;
      entries.push({id,sourceId:id,contentKey:id,text,sourcePath,
        sourceRecordSha256:unit.sha256,sourceSha256:unit.sha256,sourceArticleSha256:record.sha256,wordCount:unit.wordCount,
        family:'sky-season',surface:'sky-season',register:'second_person',planet:'sun',sign:season,
        horoscopeAudienceSign:sign,horoscopePeriod:'seasonal',structuralFunction:sign==='overview'?'complete seasonal collective essay':'complete seasonal sign reading',
        authorityClass:'owner_authored_final',ownerAuthored:true,ownerApproved:true,useAsPositiveVoiceEvidence:true,
        factUseAuthorized:false,canonical:false,useAsSceneEvidence:false,
        provenance:{manifest:SEASONAL_EVIDENCE_MANIFEST,sourceSlug:original.sourceSlug,start:unit.start,end:unit.end,
          assignment:sign==='overview'?manifest.overviewAssignment:manifest.assignment,role:'complete seasonal horoscope register only; historical astrology is not current fact'}});
    }
  }
  return entries;
}
