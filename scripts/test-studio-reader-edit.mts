import {calendarPlanetaryReaderEntry} from '../apps/admin/src/calendarPlanetaryReaderEntry';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStudioPassageEdit, skyPassageEditPlacement, skyPassageEditSource, studioPassageEditHref } from '../src/shared/studioPassageEdit';
import { calendarPassageReviewParams } from '../apps/admin/src/calendarPassageReviewRoute';

test('Review Queue derives the exact dated Calendar context from its canonical source key', () => {
  for (const [date,timeZone] of [['2026-10-21','America/New_York'],['2026-11-01','America/New_York'],
    ['2026-10-22','Asia/Tokyo'],['2026-10-21','UTC'],['2026-10-21','Etc/GMT+5']]) {
    const sourceKey=`calendar-passage/daily/${date}/${encodeURIComponent(timeZone)}`;
    const params=calendarPassageReviewParams(sourceKey);
    assert.equal(params?.get('view'),'daily-sky');
    assert.deepEqual(parseStudioPassageEdit(`#calendar-writeups?${params}`),{surface:'calendar',date,timeZone,sourceKey});
  }
  for (const key of ['calendar-passage/daily/2026-02-30/UTC','calendar-passage/daily/2026-10-21/bad-zone',
    'calendar-passage/daily/2026-10-21/America%252FNew_York','calendar-passage/daily/2026-10-21/%ZZ',
    'calendar-passage/daily/2026-10-21/America/New_York','calendar-passage/daily/2026-10-21/UTC/extra',
    'calendar-passage/daily/template','authored/calendar-moon-transition/aquarius/pisces','sky-article/sun/libra/2026/2026-09-22']) {
    assert.equal(calendarPassageReviewParams(key),null,key);
  }
});

test('reader handoffs preserve exact dates, zones and source keys without credentials or cross-origin destinations', () => {
  for (const context of [
    { surface:'calendar',date:'2026-10-21',timeZone:'America/New_York',sourceKey:'calendar-passage/daily/2026-10-21/America%2FNew_York' },
    { surface:'calendar',date:'2026-10-21',timeZone:'Asia/Tokyo',sourceKey:'authored/calendar-moon-transition/aquarius/pisces' },
    { surface:'sky',date:'2026-10-21',timeZone:'America/New_York',sourceKey:'sky-article/sun/libra/2026/2026-09-22' },
    { surface:'sky',date:'2026-10-24',timeZone:'UTC',sourceKey:'sky-placement/article/saturn/aries' },
    { surface:'sky',date:'2026-11-07',timeZone:'America/New_York',sourceKey:'sky-placement/article/mercury/scorpio',instant:'2026-11-07T17:00:00.000Z' },
  ] as const) {
    const href=studioPassageEditHref(context)!;
    assert.ok(href.startsWith('/admin/content#'));
    assert.deepEqual(parseStudioPassageEdit(new URL(href,'https://example.test').hash),context);
    if(context.surface==='sky') {
      const params=new URLSearchParams(href.split('?')[1]);
      assert.equal(params.get('planet'),skyPassageEditPlacement(context.sourceKey).planet);
      assert.equal(params.get('sign'),skyPassageEditPlacement(context.sourceKey).sign);
    }
  }
  for (const query of ['date=2026-02-30&timeZone=UTC&editSource=sky-placement/article/sun/libra',
    'date=2026-10-21&timeZone=bad-zone&editSource=sky-placement/article/sun/libra',
    'date=2026-10-21&timeZone=UTC&editSource=https://example.test',
    'date=2026-10-21&timeZone=UTC&editSource=sky-article-revision/sun/libra/2026/2026-09-22']) {
    assert.equal(parseStudioPassageEdit(`#sky-writeups?${query}`),null);
  }
  for(const instant of ['bad','2026-11-08T17:00:00Z','2026-11-07T00:00:00Z'])
    assert.equal(parseStudioPassageEdit(`#sky-writeups?date=2026-11-07&timeZone=America%2FNew_York&editSource=sky-placement/article/mercury/scorpio&instant=${instant}`),null);
  assert.equal(parseStudioPassageEdit('#calendar-writeups?date=2026-10-21&timeZone=UTC&editSource=calendar-passage/daily/2026-10-22/UTC'),null);
});

test('Sky uses the actual dated reader source before its shared fallback', () => {
  const keys=['compiled-sky-article-edition-v2','sky-placement/article/sun/libra','sky-article/sun/libra/2026/2026-09-22'];
  assert.equal(skyPassageEditSource(keys),keys[2]);
  assert.deepEqual(skyPassageEditPlacement(keys[2]),{planet:'sun',sign:'libra'});
  assert.deepEqual(skyPassageEditPlacement(keys[1]),{planet:'sun',sign:'libra'});
  assert.deepEqual(skyPassageEditPlacement('sky-season-fallback/libra-2026/moon/aries/2026-09-22'),{planet:'moon',sign:'aries'});
  assert.equal(skyPassageEditSource(['sky-v4-canonical-reader-v1']),undefined);
});

test('article facts HTTP handler retains exact reader instants and rejects mismatched local dates', async () => {
  const {build}=await import('esbuild');
  const {mkdtemp,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {pathToFileURL}=await import('node:url');
  const directory=await mkdtemp(join(tmpdir(),'sky-reader-facts-contract-'));
  const secret=process.env.CONTENT_GENERATION_SECRET;
  try {
    process.env.CONTENT_GENERATION_SECRET='synthetic-facts-owner';
    await build({entryPoints:['api/admin/sky-article-facts.ts'],bundle:true,platform:'node',format:'esm',outfile:join(directory,'handler.mjs'),
      plugins:[{name:'isolated-calculation-boundary',setup(build){
        build.onResolve({filter:/\/sky-article-facts\.js$/},()=>({path:'facts',namespace:'fixture'}));
        build.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'js',contents:`export const skyArticlePeriod=value=>{if(value==='current'||value==='visit')return value;if(value==null)return 'visit';throw Error('Unsupported period');}; export const calculateSkyArticleEditionFacts=async(instant,planet,format,period)=>({referenceInstant:instant.toISOString(),planet,format,period});`}));
      }}]});
    const handler=(await import(pathToFileURL(join(directory,'handler.mjs')).href)).default;
    const invoke=(query:string)=>new Promise<any>((resolve,reject)=>{
      const req={method:'GET',url:'/api/admin/sky-article-facts?planet=mercury&period=current&format=ingress-essay-v3&'+query,headers:{authorization:'Bearer synthetic-facts-owner'}};
      const res={statusCode:200,setHeader(){},end(body:string){resolve({status:this.statusCode,payload:JSON.parse(body)});}};
      handler(req,res).catch(reject);
    });
    // Both sides of the DST change and an instant before local midnight are kept exactly.
    for(const [date,zone,instant] of [['2026-10-24','America/New_York','2026-10-24T07:12:00.000Z'],['2026-11-07','America/New_York','2026-11-08T04:30:00.000Z'],['2026-11-08','Asia/Tokyo','2026-11-07T16:30:00.000Z']]){
      const result=await invoke(new URLSearchParams({date,timeZone:zone,instant}).toString());
      assert.equal(result.status,200);assert.equal(result.payload.facts.referenceInstant,instant);assert.equal(result.payload.facts.period,'current');
    }
    for(const values of [{date:'2026-11-07',instant:'bad',timeZone:'UTC'},{date:'2026-11-07',instant:'2026-11-08T12:00:00Z',timeZone:'UTC'},
      {date:'2026-11-07',instant:'2026-11-07T12:00:00Z',timeZone:'bad-zone'}])assert.equal((await invoke(new URLSearchParams(values).toString())).status,400);
    assert.equal((await invoke('date=2026-11-07')).payload.facts.referenceInstant,'2026-11-07T12:00:00.000Z','Older date-only links remain supported.');
  } finally {if(secret===undefined)delete process.env.CONTENT_GENERATION_SECRET;else process.env.CONTENT_GENERATION_SECRET=secret;await rm(directory,{recursive:true,force:true});}
});

test('reader snapshots require owner access and bind complete Swiss facts to the exact location and instant', async () => {
  const {default:handler}=await import('../api/admin/sky-article-facts');
  const {isVerifiedSkySnapshot}=await import('../apps/web/src/services/verifiedSkyCache');
  const secret=process.env.CONTENT_GENERATION_SECRET;
  process.env.CONTENT_GENERATION_SECRET='synthetic-reader-snapshot-owner';
  const base={planet:'south-node',date:'2026-11-09',instant:'2026-11-09T17:00:00.000Z',timeZone:'America/New_York',
    period:'current',format:'ingress-essay-v3',readerSign:'leo',lat:'0',lon:'0'};
  const invoke=async(changes:Record<string,string>={},authorized=true)=>{
    const result={statusCode:200,payload:null as any,setHeader(){},end(body:string){this.payload=JSON.parse(body);}};
    await handler({method:'GET',url:'/api/admin/sky-article-facts?'+new URLSearchParams({...base,...changes}),
      headers:authorized?{'x-content-generation-secret':'synthetic-reader-snapshot-owner'}:{}} as any,result as any);
    return result;
  };
  try {
    assert.equal((await invoke({},false)).statusCode,401);
    const result=await invoke();assert.equal(result.statusCode,200);assert.equal(result.payload.ok,true);
    const sky=result.payload.readerSky;assert.ok(isVerifiedSkySnapshot(sky));
    assert.equal(sky.generatedAt,base.instant);assert.equal(result.payload.facts.generatedAt,base.instant);
    assert.equal(sky.positions.length,14);assert.equal(sky.calculationProvenance.source,'server-swisseph-wasm');
    assert.equal(sky.location.latitude,0);assert.equal(sky.location.longitude,0);assert.equal(sky.location.timeZone,base.timeZone);
    assert.equal(sky.placementAspectFacts.planet,'South Node');assert.equal(sky.placementAspectFacts.sign.toLowerCase(),'leo');
    assert.ok(sky.placementAspectFacts.inSign.length>0);
    for(const invalid of [{readerSign:'aquarius'},{lat:''},{lat:'91'},{lon:'-181'},{timeZone:'bad-zone'},
      {period:'visit'},{format:'saved-template'}])assert.equal((await invoke(invalid)).statusCode,400,JSON.stringify(invalid));
  } finally {if(secret===undefined)delete process.env.CONTENT_GENERATION_SECRET;else process.env.CONTENT_GENERATION_SECRET=secret;}
});


test('exact Calendar reader links validate source workspace, date and zone without entering a creation route',()=>{
  for(const [key,view] of [['sky.ingress.mercury.scorpio','planetary-ingresses'],['sky.ingress.mercury.scorpio.2026-10-21','planetary-ingresses'],
    ['sky-ingress-mercury-scorpio-2026-10-21','planetary-ingresses'],['sky.station.venus.scorpio.retrograde','planetary-stations'],
    ['sky.retrograde.venus.libra.station_direct','planetary-stations'],['fallback-hook/sky.retrograde/venus/libra/station-direct','planetary-stations']]){
    const params=new URLSearchParams({view,editEvent:key,date:'2026-10-21',timeZone:'America/New_York'});
    assert.deepEqual(calendarPlanetaryReaderEntry(`#calendar-writeups?${params}`),{surface:'calendar',sourceKey:key,date:'2026-10-21',timeZone:'America/New_York'});
    for(const [field,value] of [['view','daily-sky'],['date','2026-02-30'],['timeZone','bad-zone'],['editEvent','https://example.test']]){
      const invalid=new URLSearchParams(params);invalid.set(field,value);assert.equal(calendarPlanetaryReaderEntry(`#calendar-writeups?${invalid}`),null);
    }
  }
});
