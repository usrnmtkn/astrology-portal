import {createHash} from 'node:crypto';
import {HOROSCOPE_SIGNS,horoscopeCanonicalJson} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {horoscopeHouse} from './horoscopeDevelopments.mjs';

export const SEASONAL_MEANING_BANK='apps/web/src/content/fallbackArchitectureV3/source-rows/editorial-source-bank-v1.json';
const hash=value=>createHash('sha256').update(typeof value==='string'?value:horoscopeCanonicalJson(value)).digest('hex');
const fail=message=>{throw Object.assign(new Error(message),{code:'SEASONAL_MEANING_UNAVAILABLE'});};

export function seasonalMeaningKeys(brief) {
  if(brief?.window?.period!=='seasonal')return [];
  const sign=brief.window.seasonSign;
  const sun=brief.positions?.find(p=>String(p.planet).toLowerCase()==='sun');
  if(!HOROSCOPE_SIGNS.includes(sign)||String(sun?.sign).toLowerCase()!==sign)fail('The calculated season and Sun must agree before preparing seasonal sources.');
  return [`fallback-hook/zodiac-season/${sign}`,`fallback-hook/zodiac-season-polar-axis/${sign}`];
}

/** Complete meaning sources, separate from voice evidence and dated sky facts. */
export function resolveSeasonalMeaning(brief,bank,rows=[]) {
  const keys=seasonalMeaningKeys(brief);
  if(!keys.length)return null;
  const sign=brief.window.seasonSign;
  const oppositeSign=HOROSCOPE_SIGNS[(HOROSCOPE_SIGNS.indexOf(sign)+6)%12];
  const sources=keys.map((contentKey,index)=>{
    const collection=bank.collections?.find(c=>c.id===(index?'sign-axis-tensions':'sign-season-content'));
    const entry=collection?.entries?.find(e=>index?e.signs?.includes(sign):e.id===sign);
    if(!entry?.body?.trim())fail(`The knowledge base is missing ${contentKey}.`);
    const candidates=rows.filter(r=>r.content_key===contentKey&&['DRAFT','LIVE'].includes(r.status));
    // The authoring plan uses the latest editable draft, otherwise the live source.
    // Archived revisions never override active sources or become positive evidence.
    candidates.sort((a,b)=>(a.status==='DRAFT'?0:1)-(b.status==='DRAFT'?0:1)||String(b.updated_at).localeCompare(String(a.updated_at)));
    const saved=candidates[0];
    if(saved&&(!saved.id||!saved.updated_at))fail(`The saved source version is missing for ${contentKey}.`);
    const copy=saved?.sections?.packageDraft??saved?.sections?.packageRecord;
    if(copy?.contentKey&&copy.contentKey!==contentKey)fail(`The saved source identity does not match ${contentKey}.`);
    const body=saved?(copy?copy.body:saved.body):entry.body;
    // An intentionally empty saved draft must not silently fall back to old prose.
    if(typeof body!=='string'||!body.trim()||/\{\{|\}\}/u.test(body))fail(`Complete the shared ${index?'learning-axis':'zodiac-season'} source for ${sign} in Content Studio, then review the writing plan again.`);
    return {role:index?'learning-axis':'zodiac-season',contentKey,body,bodySha256:hash(body),wordCount:body.trim().split(/\s+/u).length,
      provenance:{kind:saved?'content-studio':'knowledge-base',rowId:saved?.id??null,updatedAt:saved?.updated_at??null,status:saved?.status??'reference',
        sourcePath:SEASONAL_MEANING_BANK,sourceId:`fallback-source/editorial/${collection.id}/${entry.id}`,bankVersion:bank.bankVersion,
        originalBodySha256:hash(entry.body),originalWordCount:entry.body.trim().split(/\s+/u).length},
      use:'Interpretive meaning only. This is not current event timing, personal biography, a voice exemplar, or publication approval.'};
  });
  return {schema:'seasonal-horoscope-meaning/v1',seasonSign:sign,oppositeSign,sources,sha256:hash({sign,oppositeSign,sources})};
}

export function seasonalMeaningForRising(meaning,rising,houses) {
  if(!meaning)return null;
  const areas=[meaning.seasonSign,meaning.oppositeSign].map(sign=>{
    const house=horoscopeHouse(sign,rising),domain=houses.find(h=>h.id===String(house))?.plainTranslation;
    if(!domain)fail('The seasonal learning axis has no governed house meaning.');
    return {sign,house,domain};
  });
  return {...meaning,risingSign:rising,areas,
    scope:'These whole-sign areas express the season’s sign axis for this audience. The opposite sign is not a claim that a planet or lunation is there. Use only the calculated brief for events and dates.'};
}
