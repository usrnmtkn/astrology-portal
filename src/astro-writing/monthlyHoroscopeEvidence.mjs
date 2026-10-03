import {createHash} from 'node:crypto';

export const MONTHLY_EVIDENCE_MANIFEST='data/writing/monthly-horoscope-units.json';
const CORPUS_ROOT='packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/';
const sha=text=>createHash('sha256').update(text).digest('hex');

/**
 * Complete published overview, before the calendar and individual sign readings.
 * The three designated seasonal essays retain their separate primary roles.
 * Historical astrology remains voice evidence only, never current facts.
 */
export function loadMonthlyHoroscopeEvidence(read){
  const manifest=JSON.parse(read(MONTHLY_EVIDENCE_MANIFEST));
  const corpus=JSON.parse(read(`${CORPUS_ROOT}manifest.json`));
  if(manifest.schema!=='monthly-horoscope-units/v1'||manifest.sources?.length!==1)throw new Error('Monthly owner evidence is incomplete.');
  return manifest.sources.map(record=>{
    const source=Object.values(corpus.cohorts??{}).flat().find(entry=>entry.sourceSlug===record.slug);
    if(record.slug!=='monthly-overview-june-2025'||!source||record.file!==source.file||record.sha256!==source.sha256)throw new Error('Monthly owner source registration changed.');
    const sourcePath=`${CORPUS_ROOT}${source.file}`;
    const article=read(sourcePath),unit=record.overview;
    if(sha(article)!==record.sha256)throw new Error('Monthly owner source integrity failed.');
    if(!unit||!Number.isInteger(unit.start)||!Number.isInteger(unit.end)||unit.start<0||unit.end<=unit.start||unit.end>article.length)throw new Error('Monthly overview evidence is incomplete.');
    const text=article.slice(unit.start,unit.end);
    if(!text.trim()||sha(text)!==unit.sha256||text.split(/\s+/u).length!==unit.wordCount)throw new Error('The complete monthly owner passage changed.');
    const id=`owner-monthly-register:${record.slug}`;
    return {id,sourceId:id,contentKey:id,text,sourcePath,sourceRecordSha256:unit.sha256,sourceSha256:unit.sha256,sourceArticleSha256:record.sha256,wordCount:unit.wordCount,
      family:'sky-article-reference',surface:'sky-article-reference',register:'second_person',planet:'sun',sign:null,
      horoscopeAudienceSign:'overview',horoscopePeriod:'monthly',structuralFunction:'complete same-format monthly overview',
      authorityClass:'owner_authored_final',ownerAuthored:true,ownerApproved:true,useAsPositiveVoiceEvidence:true,
      factUseAuthorized:false,canonical:false,useAsSceneEvidence:false,
      provenance:{manifest:MONTHLY_EVIDENCE_MANIFEST,sourceSlug:source.sourceSlug,start:unit.start,end:unit.end,role:'complete monthly overview register only; historical astrology is not current fact'}};
  });
}
