import {createHash} from 'node:crypto';
import {HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {SEASONAL_SOURCE_ROOT} from './seasonalHoroscopeEvidence.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
export const WEEKLY_EVIDENCE_VERSION='weekly-owner-evidence/v1';

/** Resolve whole sign sections in the existing corpus, including every paragraph.
 * The manifest verifies the original; the voice index supplies authorship authority.
 * Heading syntax is not an editorial eligibility decision. No second prose corpus. */
export function loadWeeklyOwnerEvidence(read,voice) {
  const manifest=JSON.parse(read(`${SEASONAL_SOURCE_ROOT}manifest.json`));
  const registered=Object.values(manifest.cohorts).flat();
  const authorized=voice.entries.filter(e=>e.surface==='weekly-astrology'
    &&e.authorityClass==='owner_authored_final'&&e.ownerAuthored===true
    &&e.ownerApproved===true&&e.useAsPositiveVoiceEvidence===true);
  const entries=[];
  for(const sourcePath of [...new Set(authorized.map(e=>e.sourcePath))].sort()) {
    const record=registered.find(s=>`${SEASONAL_SOURCE_ROOT}${s.file}`===sourcePath);
    if(!record||record.format!=='weekly-overview')throw new Error('Weekly owner source registration is missing.');
    const source=read(sourcePath);
    if(hash(source)!==record.sha256)throw new Error('The complete weekly owner source changed.');
    const headings=[...source.matchAll(new RegExp(`^(?:#{1,6} )?(${HOROSCOPE_SIGNS.join('|')})(?: / \\1 Rising(?=\\r?$| )|(?=\\r?$))`,'gimu'))];
    if(headings.length!==12||headings.some((m,i)=>m[1].toLowerCase()!==HOROSCOPE_SIGNS[i]))throw new Error('Weekly owner sign boundaries need review.');
    for(const [i,heading] of headings.entries()) {
      const start=heading.index,end=headings[i+1]?.index??source.length;
      const text=source.slice(start,end).trimEnd();
      // Every prose paragraph must already be governed as positive owner evidence.
      // A revoked or unindexed paragraph cannot be laundered by combining sections.
      const prose=text.replace(/^(?:#{1,6} )?[A-Za-z]+(?: \/ [A-Za-z]+ Rising)?\s*/iu,'');
      const paragraphs=prose.split(/\n\s*\n/u).filter(p=>p.trim());
      const matching=authorized.filter(e=>e.sourcePath===sourcePath);
      if(!paragraphs.length||paragraphs.some(p=>!matching.some(e=>e.text.includes(p))))continue;
      const sign=heading[1].toLowerCase(),id=`owner-weekly:${record.sourceSlug}:${sign}`;
      entries.push({id,sourceId:id,contentKey:id,text,sourcePath,sourceRecordSha256:hash(text),
        sourceArticleSha256:record.sha256,wordCount:text.split(/\s+/u).length,
        family:'weekly-astrology',surface:'weekly-astrology',register:'second_person',
        horoscopePeriod:'weekly',horoscopeAudienceSign:sign,structuralFunction:'complete weekly sign reading',
        authorityClass:'owner_authored_final',ownerAuthored:true,ownerApproved:true,useAsPositiveVoiceEvidence:true,
        canonical:false,factUseAuthorized:false,provenance:{manifest:`${SEASONAL_SOURCE_ROOT}manifest.json`,
          sourceSlug:record.sourceSlug,start,end:start+text.length,authoritySourceIds:matching.filter(e=>text.includes(e.text)||e.text.includes(prose)).map(e=>e.sourceId)}});
    }
  }
  return entries;
}

const stop=new Set('a an and are as at be been but by can could do does for from has have how i if in into is it its may might more not of on or our that the their them there these they this those to was we what when which who will with would you your'.split(' '));
const terms=text=>new Set((String(text??'').toLowerCase().match(/[a-z]+/gu)??[]).filter(w=>w.length>3&&!stop.has(w)&&!HOROSCOPE_SIGNS.includes(w)));
/** Auditable lexical relevance, not a semantic-quality verdict. Query the actual
 * sign's outline and calculated developments, not only the reference Sun sign. */
export function weeklyEvidenceMatch(entry,query) {
  const source=terms(entry.text),matches={};
  for(const key of ['humanSituation','mechanism'])matches[key]=[...terms(query[key])].filter(t=>source.has(t)).sort();
  const surface=entry.structuralFunction==='complete weekly sign reading';
  return {score:matches.humanSituation.length*4+matches.mechanism.length*2,
    surfaceCompatibility:surface?'complete weekly sign reading':'supporting owner article; not a weekly length template',
    proseFunction:entry.structuralFunction??entry.articleBeat??'owner passage',matches,
    basis:'Lexical matches to the saved outline, calculated life areas and governed meanings; historical sign labels are not a relevance boost.'};
}
