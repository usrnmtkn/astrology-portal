import {createHash} from 'node:crypto';

const CORPUS_MANIFEST='packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/manifest.json';
const CORPUS_ROOT='packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/';
const sha=text=>createHash('sha256').update(text).digest('hex');

const units=Object.freeze([
  {slug:'monthly-overview-june-2025',endMarker:'\n#### Key Dates',family:'sky-article-reference',sign:null,role:'same-format monthly overview'},
  {slug:'libra-season-autumn-equinox',endMarker:'\n#### The Mars in Scorpio Situation',family:'sky-season',sign:'libra',role:'seasonal collective essay'},
  {slug:'leo-season-2025',endMarker:'\n### Horoscopes for August & Leo Season',family:'sky-season',sign:'leo',role:'seasonal collective essay'},
  {slug:'aquarius-season-2025',endMarker:'\n## Horoscopes for Aquarius Season',family:'sky-season',sign:'aquarius',role:'seasonal collective essay'}
]);

function allSources(manifest){
  return Object.values(manifest.cohorts??{}).flat();
}

/**
 * Monthly overview register evidence. These are exact excerpts from owner-published
 * articles already present in the governed corpus. Historical astrology remains
 * voice evidence only and never supplies current facts.
 */
export function loadMonthlyHoroscopeEvidence(read){
  const manifest=JSON.parse(read(CORPUS_MANIFEST));
  const available=allSources(manifest);
  return units.map(unit=>{
    const source=available.find(entry=>entry.sourceSlug===unit.slug);
    if(!source)throw new Error(`Monthly owner source is unavailable: ${unit.slug}`);
    const sourcePath=`${CORPUS_ROOT}${source.file}`;
    const article=read(sourcePath);
    if(sha(article)!==source.sha256)throw new Error(`Monthly owner source integrity failed: ${unit.slug}`);
    const end=unit.endMarker?article.indexOf(unit.endMarker):article.length;
    if(end<=0)throw new Error(`Monthly owner source boundary is unavailable: ${unit.slug}`);
    const text=article.slice(0,end).trim();
    if(text.split(/\s+/u).length<250)throw new Error(`Monthly owner source is too short: ${unit.slug}`);
    const id=`owner-monthly-register:${unit.slug}`;
    return {id,sourceId:id,contentKey:id,text,sourcePath,sourceRecordSha256:sha(text),sourceSha256:sha(text),sourceArticleSha256:source.sha256,
      family:unit.family,surface:unit.family,register:/\b(?:you|your)\b/iu.test(text)?'second_person':'collective',
      planet:'sun',sign:unit.sign,horoscopeAudienceSign:'overview',horoscopePeriod:'monthly',
      structuralFunction:unit.role,authorityClass:'owner_authored_final',ownerAuthored:true,ownerApproved:true,useAsPositiveVoiceEvidence:true,
      factUseAuthorized:false,canonical:false,useAsSceneEvidence:false,
      provenance:{manifest:CORPUS_MANIFEST,sourceSlug:source.sourceSlug,start:0,end,role:`${unit.role}; historical astrology is not current fact`}};
  });
}
