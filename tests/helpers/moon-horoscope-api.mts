import {Readable} from 'node:stream';
import {randomUUID} from 'node:crypto';
import {lunationHoroscopeIdentities} from '../../src/shared/lunationHoroscopeIdentities';
import {fileURLToPath} from 'node:url';
import {createApiStore} from './calendar-review-api.mjs';
import {readerRouteResponse} from './content-reader-route.mjs';
export const store=await createApiStore([],{sqlMoonLifecycle:true,uuidIds:true,projectSelect:true});
const storeFetch=globalThis.fetch;
process.env.OPENAI_API_KEY='synthetic-moon-browser-key';
process.env.CONTENT_GENERATION_PROVIDER_SKY_ARTICLE='openai';
let generationCalls=0,failSourceReads=false;
globalThis.fetch=async(url:any,init:any={})=>{
  if(failSourceReads&&String(url).includes('/generated_interpretations?')&&new URL(String(url)).searchParams.get('select')?.startsWith('id,content_key,updated_at,status,surface,mode,event_type,target_date,facts'))return Response.json({code:'synthetic-storage-unavailable'},{status:503});
  if(String(url).includes('/rpc/studio_memory_active_snapshot'))return Response.json([{snapshot:{rows:[],writingFeedback:[]}}]);
  if(String(url).includes('studio_writing_feedback'))return Response.json([]);
  if(String(url)==='https://api.openai.com/v1/responses'){
    generationCalls++;
    const request=JSON.parse(init.body),names=Object.keys(request.text.format.schema.properties.slotValues.properties);
    return Response.json({id:'synthetic-moon-browser-response',output_text:JSON.stringify({slotValues:Object.fromEntries(names.map(name=>[name,`${name} synthetic opening.\n\n${name} synthetic final sentence.`]))})});
  }
  return storeFetch(url,init);
};
export async function invoke(method:string,body?:any,url='/api/admin/generated-content'){
  if(method==='generation-calls')return generationCalls;
  if(method==='rows')return [...store.rows.values()];
  if(method==='publications')return store.publication.publications();
  if(method==='close')return store.close();
  if(method==='remove-source')return {removed:store.rows.delete(body.id)};
  if(method==='source-read-failure'){failSourceReads=Boolean(body.enabled);return {enabled:failSourceReads};}
  if(method==='limit-reusable-baseline'){
    let retired=0;
    for(const source of lunationHoroscopeIdentities(body.event.phase,body.event.sign).filter(source=>!body.keepSigns.includes(source.risingSign))){
      const id=randomUUID(),updated_at='2026-01-01T00:00:00.000Z';
      store.rows.set(id,{id,content_key:source.contentKey,status:'ARCHIVED',lane:'reference',mode:'article',surface:'sky',target_date:null,updated_at,body:'Neutral retired reusable fixture.',sections:{},source_snapshot:{},facts:{}});
      const response=await store.publication('https://calendar-api.invalid/rest/v1/rpc/retire_content_everywhere',{method:'POST',body:JSON.stringify({p_content_key:source.contentKey,p_row_id:id,p_expected_updated_at:updated_at})});
      if(!response?.ok)throw new Error('Synthetic reusable retirement was not confirmed.');retired++;
    }
    return {retired};
  }
  if(method==='reader'){const response=(await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify(body)}))!;return {status:response.status,payload:await response.json()};}
  const writing=url.startsWith('/api/admin/sky-article-template-slots');
  if(!writing&&!url.startsWith('/api/admin/lunation-writing'))return store.invoke(method,body,url);
  if(!writing&&method!=='GET'&&!['create-manual','save','stage','archive','restore'].includes(body?.action))throw new Error('This fixture must never generate collective lunar writing.');
  if(writing){
    const event=store.rows.get(body?.moonHoroscopes?.id)?.sections?.moonWritingDraft?.event;
    if(event){const id=`synthetic-reference-${event.phase}`;store.rows.set(id,{id,content_key:`authored/sky-lunation-macro/${event.phase}/${event.sign.toLowerCase()}`,status:'DRAFT',updated_at:'2026-11-01T00:00:00.000Z',headline:'Synthetic lunar reference',body:'Complete synthetic lunar reference opening.\n\nComplete synthetic lunar reference ending.',sections:{},facts:{},source_snapshot:{}});}
  }
  const handler=writing?(await import('../../api/admin/sky-article-template-slots')).default:(await import('../../api/admin/lunation-writing')).default;
  const req=Object.assign(Readable.from(body?[JSON.stringify(body)]:[]),{method,url,headers:{'x-content-generation-secret':'calendar-api-fixture'}});
  const res={statusCode:200,result:{} as any,setHeader(){},end(text:string){this.result=JSON.parse(text);}};
  await handler(req as any,res as any);return {status:res.statusCode,payload:res.result};
}
if(process.argv.includes('--ipc')&&process.argv[1]===fileURLToPath(import.meta.url)){
  process.on('message',async({id,method,body,url}:any)=>{try{process.send?.({id,result:await invoke(method,body,url)});}catch(error){process.send?.({id,error:String(error)});}});
  process.send?.({ready:true});
}
