import { expect, test, type Page } from '@playwright/test';
import { bundledPublications } from './bundled-publications';
import { getAstrodienstSky } from '../../apps/web/src/services/ephemeris';
import { zonedDateTimeToUtc } from '../../apps/web/src/services/timezones';
import { natalSkySnapshotCacheKey, VERIFIED_SKY_CACHE_SCHEMA } from '../../apps/web/src/services/verifiedSkyCache';
import { readerResponse } from './reader-response';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const location = {label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'};

export const now = '2026-10-13T16:00:00.000Z';

export const fixtureProfile = {id:'design-reader',name:'Fixture Reader',email:'reader@example.test',provider:'email',sun:'Capricorn',moon:'Pisces',rising:'Aries',currentLocation:location.label,currentLocationData:location,charts:[{id:'design-natal',name:'Fixture Reader',type:'Birth chart',birthDate:'1990-01-01',birthTime:'12:00 PM',birthCity:location.label,birthLocation:location}]};

export async function seed(page: Page, theme: string, animations = 'off', manualNatalExtras: Record<string, unknown> = {}, sect?: 'day' | 'night') {
  const birthTime = sect === 'night' ? '12:00 AM' : '12:00 PM';
  const profile = structuredClone(fixtureProfile); profile.charts[0].birthTime = birthTime;
  const birth = zonedDateTimeToUtc('1990-01-01',birthTime,location.timeZone);
  const natal = {...await getAstrodienstSky(location,birth),birthTimeKnown:true};
  const key = natalSkySnapshotCacheKey(location,birth);
  await page.clock.setFixedTime(new Date(now));
  await bundledPublications(page);
  await page.route('**/auth/v1/**',route=>route.fulfill({json:null}));
  await page.route('https://tldrastro-api-27165565299.us-central1.run.app/**',route=>route.fulfill({status:503,body:'Local fixture'}));
  await page.route('**/api/calendar?**',route=>route.fulfill({json:{ok:true,calendar:{days:[]}}}));
  await page.route('**/api/astrology-facts?**',route=>route.fulfill({json:{ok:true,sky:{aspectPatterns:{patterns:[],relationships:[],interpretationContexts:[],resolvedCopy:[]}}}}));
  await page.route('**/api/sky?**',async route=>{
    const response={statusCode:200,setHeader(){},end(body:string){void route.fulfill({status:this.statusCode,contentType:'application/json',body});}};
    await skyHandler({method:'GET',url:route.request().url()} as IncomingMessage,response as unknown as ServerResponse);
  });
  await page.addInitScript(({location,theme,natal,key,schema,now,profile,animations,manualNatalExtras,birthTime})=>{
    if(localStorage.getItem('designFixtureSeeded'))return;
    localStorage.setItem('designFixtureSeeded','true');
    localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:pageAnimations',animations);
    localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));
    localStorage.setItem('tldrastro:horoscopeLocation',JSON.stringify(location));
    localStorage.setItem('tldrastro:userProfile',JSON.stringify(profile));
    localStorage.setItem(key,JSON.stringify({schema,cacheKey:key,snapshot:natal,verifiedAt:now}));
    localStorage.setItem('tldrastro:manualCharts:design-reader',JSON.stringify([{id:'fixture-friend',ownerUserId:'design-reader',chartType:'person',displayName:'Fixture Friend',firstName:'Fixture',relationshipType:'friend',birthDate:'1990-01-01',birthTime,birthTimeUnknown:false,birthPlace:location.label,birthLocation:location,natalChart:{...natal,...manualNatalExtras},createdAt:now,updatedAt:now}]));
  },{location,theme,natal,key,schema:VERIFIED_SKY_CACHE_SCHEMA,now,profile,animations,manualNatalExtras,birthTime});
  return natal;
}

export async function authenticate(page:Page, sect?: 'day' | 'night') {
  const user={id:'design-reader',email:'reader@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{name:'Fixture Reader'}};
  const authKey=`sb-${new URL(process.env.VITE_SUPABASE_URL??'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
  await page.addInitScript(({user,authKey,now})=>{localStorage.setItem(authKey,JSON.stringify({access_token:'synthetic-design-session',refresh_token:'synthetic-refresh',expires_at:Date.parse(now)/1000+3600,token_type:'bearer',user}));},{user,authKey,now});
  await page.route('**/auth/v1/**',route=>route.fulfill({json:user}));
  let persisted={version:1,profile:structuredClone(fixtureProfile)};
  if(sect==='night')persisted.profile.charts[0].birthTime='12:00 AM';
  await page.route('**/rest/v1/user_profiles*',route=>{
    if(route.request().method()==='POST')persisted=route.request().postDataJSON().data;
    return route.fulfill({json:{data:persisted}});
  });
  const socialProfile={user_id:user.id,handle:'fixture_reader',display_name:user.user_metadata.name,avatar_url:null,discoverable:false,natal_chart:null as unknown};
  const manualRows: Array<Record<string,unknown>>=[];
  const requests={profileReads:0,profileSyncs:0,manualInserts:0};
  await page.route('**/rest/v1/social_profiles*',route=>{requests.profileReads++;return route.fulfill({json:socialProfile});});
  await page.route('**/rest/v1/rpc/ensure_own_social_profile',route=>{
    requests.profileSyncs++;const input=route.request().postDataJSON();
    Object.assign(socialProfile,{display_name:input.display_name_input,avatar_url:input.avatar_url_input,natal_chart:input.natal_chart_input});
    return route.fulfill({json:socialProfile});
  });
  await page.route('**/rest/v1/manual_charts*',route=>{
    const request=route.request(),method=request.method(),id=new URL(request.url()).searchParams.get('id')?.replace(/^eq\./,'');
    if(method==='GET')return route.fulfill({json:manualRows});
    if(method==='POST'){
      requests.manualInserts++;const input=request.postDataJSON();
      const row={...input,id:manualRows.length?'fixture-import-'+manualRows.length:'fixture-friend',created_at:now,updated_at:now};manualRows.push(row);
      return route.fulfill({status:201,json:row});
    }
    if(method==='PATCH'){
      const row=manualRows.find(row=>row.id===id);
      if(!row)return route.fulfill({status:404,json:{message:'Synthetic chart not found'}});
      Object.assign(row,request.postDataJSON(),{updated_at:now});return route.fulfill({json:row});
    }
    if(method==='DELETE'){const index=manualRows.findIndex(row=>row.id===id);if(index>=0)manualRows.splice(index,1);return route.fulfill({status:204});}
    return route.fulfill({status:405,json:{message:'Unexpected synthetic manual-chart method'}});
  });
  await page.route('**/rest/v1/connections*',route=>route.fulfill(route.request().method()==='GET'?{json:[]}:{status:204}));
  return {savedProfile:()=>persisted.profile,memberSourceRequests:()=>({...requests})};
}

export const patternPreview = 'A shared plan can leave room for a different answer. The complete pattern overview continues beyond the compact preview, with enough saved text to wrap across several lines on a small screen. This final sentence must remain available in the full pattern reading.';

export const insightPreview = 'Sometimes a familiar response needs a second look. The complete insight introduction continues beyond the compact preview, with enough saved text to wrap across several lines on a small screen.\n\nThis paragraph repeats.\n\nThis paragraph repeats.\n\nThe complete insight ending remains.';

export function syntheticCachedTransitRow(url:URL){
  const query=url.searchParams,key=query.get('content_key')?.replace(/^eq\./,'');
  if(query.get('user_id')!=='eq.design-reader'||query.get('subject_type')!=='eq.you_transit'||query.get('subject_id')!=='eq.design-natal'
    ||query.get('status')!=='eq.LIVE'||query.get('target_date')!=='eq.2026-10-13'||!key?.startsWith('you-transit-v3-')||!key.endsWith('-2026-10-13'))throw new Error('Unexpected synthetic cached-transit query');
  return {id:'dddddddd-dddd-4ddd-bddd-000000000001',content_key:key,surface:'you',mode:'in_depth',status:'LIVE',event_type:'you-transit-to-natal',target_date:'2026-10-13',headline:'A saved synthetic transit reading',summary:'A pre-existing test-owned reading.',body:'This complete synthetic transit reading was already saved before this test. It requires no generation.',sections:{},provider:'synthetic-cache',model:null,updated_at:now};
}

export async function patternInsightFixtures(page: Page, theme: string, options: { patterns?: boolean; insights?: boolean; fail?: boolean; cachedSources?: boolean } = {}) {
  const aspectPatterns = {
    patterns: [], relationships: [],
    interpretationContexts: [
      {patternId:'handoff-yod',patternType:'yod',members:[{planet:'Pluto'},{planet:'Neptune'},{planet:'Moon'}],display:{rank:1,isContained:false,parentPatternIds:[],childPatternIds:['handoff-child']}},
      {patternId:'handoff-child',patternType:'yod',members:[],display:{rank:2,isContained:true,parentPatternIds:['handoff-yod'],childPatternIds:[]}}
    ],
    resolvedCopy: [
      {patternId:'handoff-yod',content:{eyebrow:'Yod',headline:'A good plan can still leave you out of it',overview:patternPreview,sections:[{id:'feel',body:'The complete parent reading ending remains.'}],tags:[]}},
      {patternId:'handoff-child',content:{eyebrow:'Yod',headline:'Supporting fixture pattern',overview:'The supporting pattern overview remains.',sections:[{id:'feel',body:'The complete supporting pattern ending remains.'}],tags:[]}}
    ]
  };
  // Saved Friend charts carry their governed pattern copy with the natal snapshot.
  // You also exercises the independent pattern-copy hydration request below.
  const natal=await seed(page,theme,'off',options.patterns===false?{}:{aspectPatterns});
  const member=await authenticate(page);
  await page.route('**/api/astrology-facts?**', route => {
    if(!new URL(route.request().url()).searchParams.has('includeAspectPatternCopy'))return route.fallback();
    return route.fulfill({json:{ok:true,sky:{aspectPatterns:options.patterns===false?{patterns:[],relationships:[],interpretationContexts:[],resolvedCopy:[]}:aspectPatterns}}});
  });
  const keys=['you','they'].flatMap(audience=>[`cms/natal-twelfth-ruler/${audience}/introduction`,...Array.from({length:12},(_,i)=>`cms/natal-twelfth-ruler/${audience}/ruler-house/${i+1}`)]);
  const rows=keys.map((key,index)=>({id:`cccccccc-cccc-4ccc-bccc-${String(index).padStart(12,'0')}`,content_key:key,surface:'natal',mode:'article',status:'LIVE',lane:'serving',review_state:null,body:key.endsWith('introduction')?insightPreview:`Complete ${key} opening.\n\nThe complete ruler-house ending remains.`,updated_at:now}));
  let generationAttempts=0;
  if(options.cachedSources){
    const row={id:'fixture-friend',owner_user_id:'design-reader',display_name:'Fixture Friend',first_name:'Fixture',last_name:null,relationship_type:'friend',birth_date:'1990-01-01',birth_time:'12:00',birth_time_unknown:false,birth_place:location.label,birth_latitude:location.latitude,birth_longitude:location.longitude,birth_timezone:location.timeZone,natal_chart:{...natal,aspectPatterns},created_at:now,updated_at:now};
    await page.addInitScript(()=>{const key='tldrastro:manualCharts:design-reader';const charts=JSON.parse(localStorage.getItem(key)??'[]');localStorage.setItem(key,JSON.stringify(charts.map((chart:any)=>({...chart,birthTime:'12:00'}))));});
    await page.route('**/rest/v1/manual_charts*',route=>route.request().method()==='GET'?route.fulfill({json:[row]}):route.abort('blockedbyclient'));
    await page.route('**/rest/v1/user_generated_interpretations*',route=>{
      const request=route.request(),url=new URL(request.url()),query=url.searchParams;
      const libraryRead=request.method()==='GET'&&query.get('user_id')==='eq.design-reader'
        &&query.get('subject_type')==='in.(friend_transit_reading,you_day_reading,you_week_reading)'
        &&query.get('status')==='in.(DRAFT,LIVE,ARCHIVED,ERROR)'
        &&!query.has('subject_id')&&!query.has('content_key')&&!query.has('target_date');
      if(libraryRead)return route.fallback();
      try{if(request.method()!=='GET')throw new Error('Unexpected method');return route.fulfill({json:[syntheticCachedTransitRow(url)]});}
      catch{return route.fulfill({status:400,json:{message:'Unexpected synthetic cache contract'}});}
    });
    await page.route('**/api/generate-user-content',route=>{generationAttempts++;return route.abort('blockedbyclient');});
  }
  let fail=options.fail;
  await page.route('**/api/content-reader',route=>{
    if(fail)return route.fulfill({status:503,json:{error:'Synthetic unavailable publication'}});
    const q=route.request().postDataJSON();
    return route.fulfill({json:readerResponse(options.insights===false?[]:rows.filter(row=>q.keys?.includes(row.content_key)))});
  });
  return {natal,recover:()=>{fail=false;},memberSourceRequests:member.memberSourceRequests,generationAttempts:()=>generationAttempts};
}

export function observeSyntheticRealtimeReceipt() {
  const observations = { successfulReplies: 0, successfulJoins: 0 };
  Object.assign(window, { __syntheticRealtimeReceipt: observations });
  const NativeWebSocket = window.WebSocket;
  window.WebSocket = new Proxy(NativeWebSocket, {
    construct(target, args, newTarget) {
      const socket = Reflect.construct(target, args, newTarget) as WebSocket;
      const url = new URL(String(args[0]), window.location.href);
      if (url.origin === 'wss://visual-smoke.supabase.test'
        && url.pathname === '/realtime/v1/websocket'
        && url.searchParams.get('apikey') === 'visual-smoke-placeholder'
        && url.searchParams.get('vsn') === '2.0.0') {
        socket.addEventListener('message', event => {
          let frame: unknown;
          try { frame = JSON.parse(String(event.data)); } catch { return; }
          if (!Array.isArray(frame) || frame.length !== 5 || frame[3] !== 'phx_reply'
            || typeof frame[1] !== 'string' || typeof frame[2] !== 'string'
            || frame[4]?.status !== 'ok') return;
          if (frame[2] === 'phoenix' || frame[2].startsWith('realtime:')) observations.successfulReplies++;
          if (frame[2].startsWith('realtime:') && Array.isArray(frame[4]?.response?.postgres_changes)) observations.successfulJoins++;
        });
      }
      return socket;
    }
  });
}

export async function inspectMemberSourceFailures(page:Page){
  await page.addInitScript(observeSyntheticRealtimeReceipt);
  const failures:string[]=[],pending:Array<Promise<void>>=[];let completedCachedReads=0;
  // All supported API routes are installed by the fixture after this fallback.
  await page.route('**/api/**',route=>{failures.push(`Unhandled synthetic API: ${route.request().method()} ${new URL(route.request().url()).pathname}`);return route.abort('blockedbyclient');});
  page.on('pageerror',error=>failures.push(`pageerror: ${error.message}`));
  page.on('console',message=>{if(['warning','error'].includes(message.type()))failures.push(`console ${message.type()}: ${message.text()}`);});
  const isApi=(url:string)=>/^\/(?:api\/|rest\/v1\/|auth\/v1\/)/.test(new URL(url).pathname);
  page.on('requestfailed',request=>{if(isApi(request.url()))failures.push(`requestfailed: ${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`);});
  page.on('response',response=>{
    if(!isApi(response.url()))return;
    pending.push((async()=>{
      const path=new URL(response.url()).pathname;
      if(!response.ok())failures.push(`API HTTP${response.status()}: ${path}`);
      if(await response.finished()){failures.push(`API response did not finish: ${path}`);return;}
      if(response.status()===204)return;
      if(!/application\/json/.test(response.headers()['content-type']??'')){failures.push(`API non-JSON: ${path}`);return;}
      try{
        const value=await response.json(),query=new URL(response.url()).searchParams;
        if(response.status()===200&&path==='/rest/v1/user_generated_interpretations'&&query.get('subject_type')==='eq.you_transit'
          &&Array.isArray(value)&&value[0]?.status==='LIVE'&&value[0]?.content_key===query.get('content_key')?.replace(/^eq\./,''))completedCachedReads++;
      }catch{failures.push(`API invalid JSON: ${path}`);}
    })());
  });
  const assertClean=async()=>{
    await Promise.all(pending);expect(failures,'Populated member sources must not rely on console/API failures').toEqual([]);
    await expect.poll(()=>page.evaluate(()=>(window as unknown as {__syntheticRealtimeReceipt?:{successfulJoins:number}}).__syntheticRealtimeReceipt?.successfulJoins??0),{message:'Browser must receive a successful synthetic join acknowledgement'}).toBeGreaterThan(0);
  };
  return Object.assign(assertClean,{completedCachedReads:()=>completedCachedReads});
}

export async function withFinishedSocialReads(page:Page,label:string,action:()=>Promise<unknown>,keys:ReadonlyArray<readonly [string,string]>){
  const responses=keys.map(async([method,path])=>{
    const response=await page.waitForResponse(response=>response.request().method()===method&&new URL(response.url()).pathname===path&&response.status()===200);
    expect(await response.finished(),`${label}: ${method} ${path} must finish`).toBeNull();
    return {method,path,status:200,responseFinished:true};
  });
  await action();
  await test.info().attach(`completed-social-reads-${label}`,{body:JSON.stringify(await Promise.all(responses),null,2),contentType:'application/json'});
}
