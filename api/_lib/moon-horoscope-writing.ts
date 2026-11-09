import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {AdminHttpError,adminFetchJson,adminStorageRows} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {lunationArticleEvents} from './lunation-article-facts.js';
import {moonWritingDraft} from '../../apps/admin/src/moonHoroscopeDraft.js';
import {assertMoonHoroscopeSection,moonHoroscopeKey} from '../../src/shared/datedLunationHoroscopes.mjs';
import {generateSkyArticleTemplateSlots,skyArticleTemplateSlotsExport,type GenerateSkyArticleTemplateSlotsInput} from './content-generation.js';
import {loadLunarSavedWriting} from './lunar-saved-writing.js';
import {lunarSavedWritingInput} from '../../src/astro-writing/lunationSavedWriting.mjs';

/** A missing-sign batch writes only to its version-pinned private recovery row.
 * A durable claim prevents double dispatch, including after a lost connection. */
export async function writeMoonHoroscopes(body:Record<string,any>) {
  const input=body.moonHoroscopes;
  if(Object.keys(body).some(k=>!['moonHoroscopes','preview','voiceNotes'].includes(k))
    ||!input||typeof input!=='object'||Array.isArray(input)
    ||Object.keys(input).some(k=>!['id','expectedUpdatedAt','action','acknowledgeUnknownOutcome'].includes(k))
    ||typeof input.id!=='string'||!input.id||typeof input.expectedUpdatedAt!=='string'||!input.expectedUpdatedAt
    ||!['generate','status','release'].includes(input.action)
    ||body.voiceNotes!==undefined&&(typeof body.voiceNotes!=='string'||body.voiceNotes.length>6000))throw new AdminHttpError(400,'Open a saved Moon horoscope draft.');
  const {url,headers}=studioStorage();
  const result=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${input.id}`,select:'*',limit:'1'})}`,{headers});
  if(!result.ok)throw new AdminHttpError(503,'The saved draft could not be verified.');
  let row:any=adminStorageRows(result.payload)[0];
  const draft=moonWritingDraft(row);
  if(!draft||draft.compiledDraft)throw new AdminHttpError(409,'Open a private Moon horoscope writing draft before generating.');
  const state=()=>row.source_snapshot?.moonHoroscopeGeneration;
  if(input.action==='status')return {ok:true,rows:[row],generation:state()??null,saved:true,published:false};
  if(row.updated_at!==input.expectedUpdatedAt)throw new AdminHttpError(409,'This draft changed. Reload it before generating; your writing is preserved.');
  const persist=async(patch:Record<string,unknown>)=>{
    const storedPatch=JSON.parse(JSON.stringify(patch));
    const response=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${row.id}`,updated_at:`eq.${row.updated_at}`})}`,{method:'PATCH',headers:{...headers,prefer:'return=representation'},body:JSON.stringify({...storedPatch,updated_at:new Date(Math.max(Date.now(),Date.parse(row.updated_at)+1)).toISOString()})});
    const rows=adminStorageRows<any>(response.payload);
    if(!response.ok||rows.length!==1||rows[0].id!==row.id||rows[0].updated_at===row.updated_at
      ||Object.entries(storedPatch).some(([key,value])=>!isDeepStrictEqual(rows[0][key],value)))throw new AdminHttpError(409,'The draft changed or storage did not confirm the save. Check generation before retrying.');
    row=rows[0];return row;
  };
  if(input.action==='release'){
    if(body.preview||input.acknowledgeUnknownOutcome!==true||state()?.status!=='running')throw new AdminHttpError(409,'Check the running request before releasing it.');
    // Explicit release invalidates the worker's exact version. A late response
    // cannot overwrite text or a newer request, even if it incurred a charge.
    await persist({source_snapshot:{...row.source_snapshot,moonHoroscopeGeneration:{...state(),status:'released',releasedAt:new Date().toISOString()}}});
    return {ok:true,rows:[row],saved:true,published:false};
  }
  if(state()?.status==='running')throw new AdminHttpError(409,'Generation is already running or its outcome is unknown. Check generation before starting another request.');
  if(draft.target){
    const target=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${draft.target.id}`,select:'id,content_key,updated_at,status',limit:'1'})}`,{headers});
    if(!target.ok)throw new AdminHttpError(503,'The original Moon readings could not be verified. No generation was started.');
    const current=adminStorageRows<any>(target.payload)[0];
    if(!current||current.content_key!==moonHoroscopeKey(draft.event)||current.updated_at!==draft.target.updatedAt||!['DRAFT','LIVE'].includes(current.status))throw new AdminHttpError(409,'The original Moon readings changed. Reopen them before generating; your private draft is preserved.');
  }
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:draft.event.timeZone,year:'numeric',month:'2-digit'}).formatToParts(new Date(draft.event.startsAt));
  const month=`${parts.find(p=>p.type==='year')!.value}-${parts.find(p=>p.type==='month')!.value}`;
  const event=(await lunationArticleEvents(month,draft.event.timeZone)).find(e=>e.id===draft.event.id);
  if(!event||moonHoroscopeKey(event)!==moonHoroscopeKey(draft.event)||event.startsAt!==draft.event.startsAt
    ||event.phase!==draft.event.phase||event.sign.toLowerCase()!==draft.event.sign.toLowerCase()
    ||event.eclipseType!==(draft.event.eclipseType??null))throw new AdminHttpError(409,'The saved Moon event does not match the calculated event. Choose the Moon again before generating.');
  const missing=draft.section.passages.filter(p=>!p.body.trim());
  if(!missing.length)throw new AdminHttpError(409,'All twelve signs already have readings. Your writing is unchanged.');
  try {
    // Validate saved headings, houses and existing prose before billing. For
    // this validation only, an empty body uses its sign heading as a sentinel.
    // The original section, including every blank, remains untouched.
    assertMoonHoroscopeSection({...draft.section,passages:draft.section.passages.map(p=>p.body.trim()?p:{...p,body:p.heading})},event);
  }catch(error){throw new AdminHttpError(400,(error as Error).message);}
  const savedWriting=await loadLunarSavedWriting(event);
  const generationInput:GenerateSkyArticleTemplateSlotsInput={
    templateKey:`${moonHoroscopeKey(event)}/writing`,templateContextRole:'existing-draft',templateBody:lunarSavedWritingInput(savedWriting).join('\n\n'),
    planet:'moon',sign:event.sign.toLowerCase(),surface:'sky',eventType:event.phase,
    facts:{schema:'moon-horoscope-writing/v1',moonEvent:{name:event.phase,sign:event.sign.toLowerCase()},event,
      houseSystem:'whole-sign',readings:missing.map(p=>({risingSign:p.risingSign,house:p.house})),
      placementScope:'Dated New or Full Moon horoscopes by rising sign. Houses are calculated from the Moon sign and rising sign using whole-sign houses, not an individual natal chart. No personal biography, natal contacts, future events or guaranteed results are supplied.'},
    knowledgeIds:[`sky-lunation-${event.phase}-${event.sign.toLowerCase()}`,...missing.map(p=>`house/${p.house}`)],
    requestedSlots:missing.map(p=>({name:`${p.risingSign}Body`,description:`Write one complete second-person ${event.title} horoscope for ${p.risingSign} Sun or Rising, in whole-sign house ${p.house}. Use the supplied lunar phase/sign and house meaning. A New Moon concerns a possible intention or beginning; a Full Moon concerns reflection or culmination, never a guaranteed personal event. Do not turn this into an ordinary two-day Moon transit or a natal description. Return natural reader paragraphs only, without sign headings, dates, placeholders, drafting notes or approval claims.`})),
    voiceNotes:body.voiceNotes,
    // The shared writer still loads current corrections and eligible complete
    // voice examples. Generic article memory must not impose an ingress spine.
    writingMemory:null
  };
  if(body.preview)return {ok:true,writingExport:await skyArticleTemplateSlotsExport(generationInput),saved:false,published:false};
  const operation={id:randomUUID(),status:'running',startedAt:new Date().toISOString(),signs:missing.map(p=>p.risingSign)};
  await persist({source_snapshot:{...row.source_snapshot,moonHoroscopeGeneration:operation}});
  try {
    const generation=await generateSkyArticleTemplateSlots(generationInput);
    const section={...draft.section,passages:draft.section.passages.map(p=>p.body.trim()?p:{...p,body:generation.slotValues[`${p.risingSign}Body`]})};
    assertMoonHoroscopeSection(section,event);
    await persist({sections:{...row.sections,moonWritingDraft:{...draft,section}},source_snapshot:{...row.source_snapshot,
      moonHoroscopeGeneration:{...operation,status:'complete',completedAt:new Date().toISOString(),provider:generation.provider,model:generation.model,responseId:generation.responseId??null,
        savedWriting:savedWriting.references.map(({id,contentKey,bodySha256,wordCount,provenance}:any)=>({id,contentKey,bodySha256,wordCount,provenance})),
        generationMetadata:generation.generation_metadata??null,ownerApproved:false,promotionAuthorized:false}}});
    return {ok:true,rows:[row],saved:true,published:false};
  } catch(error) {
    // Preserve an unresolved claim after provider/transport/storage failures.
    // A caller must check or explicitly release it; never retry a paid call.
    throw new AdminHttpError(503,'Generation could not be confirmed. Your saved writing is preserved. Check generation before starting another request.');
  }
}
