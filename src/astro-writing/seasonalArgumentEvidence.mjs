import {createHash} from 'node:crypto';
import {SEASONAL_SOURCE_ROOT} from './seasonalHoroscopeEvidence.mjs';

export const SEASONAL_ARGUMENT_MANIFEST = 'data/writing/seasonal-argument-evidence.json';
export const SEASONAL_ARGUMENT_SOURCES = Object.freeze([
  {slug:'full-moon-in-taurus',heading:'### Taurus Full Moon Horoscopes',planet:'moon',sign:'taurus',family:'sky-lunation'},
  {slug:'gemini-season-2025',heading:'### Horoscopes for Gemini Season',planet:'sun',sign:'gemini',family:'sky-season'},
  {slug:'libra-season-autumn-equinox',heading:'### Monthly Horoscopes for Libra Season',planet:'sun',sign:'libra',family:'sky-season'}
]);
const sha = text => createHash('sha256').update(text).digest('hex');

// Resolve complete lead essays at their published section boundaries, in place.
// The owner's explicit source choice takes precedence over generic topical rank.
export function loadSeasonalArgumentEvidence(read) {
  const manifest=JSON.parse(read(SEASONAL_ARGUMENT_MANIFEST));
  const corpus=JSON.parse(read(`${SEASONAL_SOURCE_ROOT}manifest.json`));
  if(manifest.schema!=='seasonal-argument-evidence/v1'||manifest.sources?.length!==3)throw new Error('Seasonal argument evidence is incomplete.');
  return SEASONAL_ARGUMENT_SOURCES.map(({slug,heading,planet,sign,family})=>{
    const records=manifest.sources.filter(s=>s.sourceSlug===slug),record=records[0];
    const original=Object.values(corpus.cohorts).flat().find(s=>s.sourceSlug===slug);
    if(records.length!==1||!original||record.file!==original.file||record.sha256!==original.sha256)throw new Error('Seasonal argument source registration changed.');
    const sourcePath=`${SEASONAL_SOURCE_ROOT}${original.file}`,article=read(sourcePath);
    if(sha(article)!==record.sha256)throw new Error('Seasonal argument source integrity failed.');
    const boundary=article.indexOf(`\n${heading}\n`);
    if(boundary<1)throw new Error('Review the complete seasonal essay boundary.');
    const text=article.slice(0,boundary).trimEnd(),unit=record.essay;
    if(unit?.start!==0||unit.end!==text.length||unit.sha256!==sha(text)||unit.wordCount!==text.split(/\s+/u).length)throw new Error('The complete seasonal argument passage changed.');
    const id=`owner-seasonal-argument:${slug}`;
    return {id,sourceId:id,contentKey:id,text,sourcePath,sourceRecordSha256:unit.sha256,sourceSha256:unit.sha256,
      sourceArticleSha256:record.sha256,wordCount:unit.wordCount,family,surface:family,register:'second_person',planet,sign,
      seasonalArgumentPrimary:true,structuralFunction:'complete collective lead essay',
      authorityClass:'owner_authored_final',ownerAuthored:true,ownerApproved:true,useAsPositiveVoiceEvidence:true,
      factUseAuthorized:false,canonical:false,useAsSceneEvidence:false,
      provenance:{manifest:SEASONAL_ARGUMENT_MANIFEST,sourceSlug:slug,start:0,end:unit.end,assignment:manifest.assignment,
        role:'primary seasonal voice and argument movement only; historical astrology is not current fact'}};
  });
}
