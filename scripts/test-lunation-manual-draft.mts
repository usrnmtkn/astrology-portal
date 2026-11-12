import assert from 'node:assert/strict';
import {rows,invoke,providerFixture,storageFixture} from '../tests/helpers/lunation-writing-api.mts';
import {lunationArticleEvents} from '../api/_lib/lunation-article-facts';
import {datedLunationContentKey} from '../apps/web/src/content/lunationArticleIdentity';
import {LUNATION_ARTICLE_PROTOCOL_VERSION} from '../src/astro-writing/lunationArticleInput.mjs';

const previousRows=new Map(rows),fetchFixture=globalThis.fetch;
const reads:URL[]=[];
let protectedReads=0;
let beforeCreate:null|(()=>void)=null,corruptCreateReceipt=false;
const initialProviderCalls=providerFixture.calls;
let stagedReader:any;
globalThis.fetch=async(input:any,options:any={})=>{
  const url=new URL(String(input));
  if(!options.method||options.method==='GET'){
    reads.push(url);
    const key=url.searchParams.get('content_key')??'';
    if(url.pathname.includes('feedback')||url.origin==='https://api.openai.com'
      ||key==='like.studio-lunation/*'&&url.searchParams.get('select')==='*'&&!url.searchParams.has('id')
      ||url.pathname==='/rest/v1/generated_interpretations'&&key&&!/^(?:eq|like)\.(?:studio-lunation\/|cms\/lunation-article\/)/.test(key)){
      protectedReads++;throw new Error('Manual drafts must not read writing guidance or source passages.');
    }
  }
  if(url.origin==='https://api.openai.com')throw new Error('Manual drafts must not call generation.');
  if(options.method==='POST'&&url.pathname==='/rest/v1/generated_interpretations')beforeCreate?.();
  const response=await fetchFixture(input,options);
  if(corruptCreateReceipt&&options.method==='POST'&&url.pathname==='/rest/v1/generated_interpretations'){
    const saved=await response.json();return Response.json(saved.map((row:any)=>({...row,updated_at:''})),{status:response.status});
  }
  return response;
};
try{
  rows.clear();
  const month='2027-02',timeZone='UTC',event=(await lunationArticleEvents(month,timeZone))[0];
  rows.set('33333333-3333-4333-8333-333333333333',{id:'33333333-3333-4333-8333-333333333333',content_key:'studio-lunation/1900-01-01/new-moon/aries',mode:'article',target_date:null,status:'DRAFT',lane:'reference',headline:'Synthetic existing writer draft',body:'Synthetic protected body never listed.',updated_at:'2026-01-01T00:00:00Z',facts:{lunationArticle:{event}},source_snapshot:{lunationWriting:{preview:{writingProfile:'Synthetic private guidance never listed.'},active:{id:'request-fixture',responseId:'response-fixture',writingProfile:'Synthetic request guidance never listed.'}}}});
  const listed=await invoke('GET',undefined,'/api/admin/lunation-writing?listing=true');
  assert.equal(listed.status,200,JSON.stringify(listed.payload));
  assert(!JSON.stringify(listed.payload).includes('never listed'));
  assert.equal(listed.payload.rows[0].facts.lunationArticle.event.id,event.id);
  assert.equal(listed.payload.rows[0].source_snapshot.lunationWriting.active.responseId,'response-fixture');
  const create={action:'create-manual',month,timeZone,eventId:event.id};
  assert.equal((await invoke('POST',create,undefined,'wrong')).status,401);
  const created=await invoke('POST',create);
  assert.equal(created.status,200,JSON.stringify(created.payload));
  let row=created.payload.rows[0];
  assert.equal(row.status,'DRAFT');assert.equal(row.lane,'reference');
  assert.equal(row.body,'');assert.deepEqual(row.sections,{});
  assert.deepEqual(row.source_snapshot.lunationWriting,{
    version:LUNATION_ARTICLE_PROTOCOL_VERSION,authoringSource:'manual',direction:'',active:null
  });
  assert.equal(row.facts.lunationArticle.event.id,event.id);
  assert.equal(row.facts.lunationArticle.provenance.actualEphemeris,'swiss');
  const snapshot=JSON.stringify([...rows]);
  assert.equal((await invoke('POST',create)).status,409,'Creation cannot replace a saved or archived workspace.');
  assert.equal(JSON.stringify([...rows]),snapshot);
  assert.equal(reads.at(-1)?.searchParams.get('select'),'id','Collision discovery must not load existing plan passages.');
  for(const extra of [{direction:'ignored'},{headline:'unsolicited'},{body:'unsolicited'}]){
    assert.equal((await invoke('POST',{...create,...extra})).status,400);
    assert.equal(JSON.stringify([...rows]),snapshot);
  }
  assert.equal((await invoke('POST',{...create,eventId:'invented'})).status,422);
  const action=(action:string,extra:any={})=>invoke('POST',{action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
  for(const actionName of ['review','export','reject','generate','poll','release']){
    assert.equal((await action(actionName)).status,409,`Manual ${actionName} must not enter the writer.`);
    assert.equal(JSON.stringify([...rows]),snapshot);
  }
  const copy={headline:'Synthetic manual lunar title',body:'Synthetic manual opening.\n\nComplete manual ending.'};
  const oldVersion=row.updated_at;
  const saved=await action('save',copy);assert.equal(saved.status,200,JSON.stringify(saved.payload));row=saved.payload.rows[0];
  assert.equal(row.body,copy.body);assert.equal(row.headline,copy.headline);
  assert.equal((await invoke('POST',{action:'save',id:row.id,expectedUpdatedAt:oldVersion,headline:'Old tab',body:'Stale'})).status,409);
  assert.deepEqual((await invoke('GET',undefined,`/api/admin/lunation-writing?id=${row.id}`)).payload.rows,[row]);
  for(const lifecycle of ['archive','restore','archive','restore']){
    const before=structuredClone(row),result=await action(lifecycle);
    assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
    const content=(value:any)=>Object.fromEntries(Object.entries(value).filter(([key])=>!['status','updated_at'].includes(key)));
    assert.deepEqual(content(row),content(before));
    assert.equal(row.status,lifecycle==='archive'?'ARCHIVED':'DRAFT');
  }
  const newReader=await action('stage');assert.equal(newReader.status,200);assert.equal(newReader.payload.existing,false);
  stagedReader=structuredClone([...rows.values()].find(value=>value.content_key===newReader.payload.contentKey));
  assert.equal(stagedReader.body,copy.body);assert.equal(stagedReader.status,'DRAFT');
  assert.deepEqual(Object.keys(stagedReader.source_snapshot).sort(),['allowedSlots','contentSystem','lunationWorkspace']);
  rows.delete(stagedReader.id);
  // A newer workspace edit cannot be overwritten by a stale save.
  const stale=structuredClone(row);
  storageFixture.beforePatch=()=>rows.set(row.id,{...row,body:'Synthetic concurrent owner edit.',updated_at:'2099-01-01T00:00:00Z'});
  assert.equal((await action('save',{...copy,body:'Must not win a race.'})).status,409);
  assert.equal(rows.get(row.id).body,'Synthetic concurrent owner edit.');
  rows.set(row.id,stale);
  // Reader collision discovery never copies over an existing reader draft or publication.
  const readerKey=datedLunationContentKey(row.facts.lunationArticle.event),reader={id:'11111111-1111-4111-8111-111111111111',content_key:readerKey,mode:'article',target_date:null,status:'LIVE',body:'Synthetic existing reader writing.',updated_at:'2027-01-01T00:00:00Z'};
  rows.set(reader.id,reader);const beforeStage=JSON.stringify([...rows]);
  const staged=await action('stage');assert.equal(staged.status,200);assert.equal(staged.payload.existing,true);
  assert.equal(JSON.stringify([...rows]),beforeStage);
  // A generated workspace collision is detected using identity metadata only.
  rows.set(row.id,{...row,source_snapshot:{lunationWriting:{preview:{privateGuidance:'Synthetic do not load.'}}}});
  const generatedBefore=JSON.stringify([...rows]);
  assert.equal((await invoke('POST',create)).status,409);assert.equal(JSON.stringify([...rows]),generatedBefore);
  assert.equal(reads.at(-1)?.searchParams.get('select'),'id');
  const raceEvent=(await lunationArticleEvents(month,timeZone))[1],raceKey=`studio-lunation/${raceEvent.startsAt.slice(0,10)}/${raceEvent.phase}/${raceEvent.sign.toLowerCase()}`;
  const raceRow={...row,id:'22222222-2222-4222-8222-222222222222',content_key:raceKey,body:'Synthetic concurrently saved article.'};
  beforeCreate=()=>{beforeCreate=null;rows.set(raceRow.id,raceRow);};
  assert.equal((await invoke('POST',{...create,eventId:raceEvent.id})).status,409);
  assert.deepEqual(rows.get(raceRow.id),raceRow,'A concurrent insert must remain unchanged.');
  rows.delete(raceRow.id);corruptCreateReceipt=true;
  assert.equal((await invoke('POST',{...create,eventId:raceEvent.id})).status,503,'A malformed save receipt is not success.');
  corruptCreateReceipt=false;
  assert.equal([...rows.values()].filter(value=>value.content_key===raceKey).length,1,'The uncertain save is not replayed.');
  assert.equal(protectedReads,0);assert.equal(providerFixture.calls,initialProviderCalls);
  console.log('Manual lunation actual-handler lifecycle passed; zero guidance/source reads or generation calls.');
}finally{
  globalThis.fetch=fetchFixture;storageFixture.beforePatch=null;rows.clear();
  for(const [id,row] of previousRows)rows.set(id,row);
}
// The manual handoff uses the ordinary owner publication and actual reader boundary.
const envNames=['NODE_ENV','CONTENT_GENERATION_SECRET','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'] as const;
const previousEnv=Object.fromEntries(envNames.map(name=>[name,process.env[name]]));
const {createApiStore}=await import('../tests/helpers/calendar-review-api.mjs');
const readerStore=await createApiStore([stagedReader]);
try{
  const published=await readerStore.invoke('PATCH',{id:stagedReader.id,expectedUpdatedAt:stagedReader.updated_at,ownerAction:'publish-owner-content'});
  assert.equal(published.status,200,JSON.stringify(published.payload));
  const live=published.payload.rows[0];
  const read=await readerStore.invoke('POST',{keys:[live.content_key]},'/api/content-reader');
  assert.equal(read.status,200);assert.equal(read.payload.rows[0].body,stagedReader.body);
  const retired=await readerStore.invoke('POST',{action:'retire',id:live.id,contentKey:live.content_key,expectedUpdatedAt:live.updated_at},'/api/admin/content-publication');
  assert.equal(retired.status,200);assert.equal((await readerStore.invoke('POST',{keys:[live.content_key]},'/api/content-reader')).payload.rows.length,0);
  console.log('Manual lunation reader handoff passed actual owner publish, complete reader copy and retirement.');
}finally{
  await readerStore.close();globalThis.fetch=fetchFixture;
  for(const name of envNames){if(previousEnv[name]===undefined)delete process.env[name];else process.env[name]=previousEnv[name];}
}
