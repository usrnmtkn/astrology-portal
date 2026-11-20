import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {studioApiStore} from '../helpers/studio-api-store';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {normalizeNatalPlacementPreviewInput,renderNatalPlacementPreviewState,renderNatalAspectFriendDraft} from '../../api/admin/natal-placement-preview';
import {servingPackageRecords} from '../../api/_lib/serving-package-records';
import {readerSession} from '../helpers/reader-session';
import {emptyLastKnownGoodSnapshot} from '../helpers/bundled-publications';
import {routeStudioPublicReader} from '../helpers/studio-public-reader-route';
import {natalCompleteEditorTemplate} from '../../scripts/fixtures/natal-complete-editor-template.mjs';

for (const width of [390,1440]) for (const theme of ['light','dark']) test(`Natal aspect complete editor preserves its closing sentence ${width} ${theme}`, async ({page}) => {
  test.setTimeout(90_000);
  const pairKey='fallback-hook/aspect-pair/sun/mercury/conjunction';
  const key='fallback-hook/natal-aspect-lived/sun/conjunction/mercury';
  const pair={...servingPackageRecords.get(pairKey),body:'Synthetic complete You opening. Synthetic pair ending.',body_you:'Synthetic complete You opening. Synthetic pair ending.',body_they:'Synthetic complete Friend opening. Synthetic Friend pair ending.',review_status:'approved'};
  const seed={id:'00000000-0000-4000-8000-000000000072',content_key:pairKey,headline:'Synthetic Sun Mercury pair',body:pair.body,summary:'',status:'LIVE',lane:'serving',review_state:null,
    surface:'you',mode:'in_depth',provider:'tldrastro-fallback-architecture-v3',event_type:'fallback-system',block_type:'fallback_hook',updated_at:'2026-11-20T12:00:00Z',created_at:'2026-11-20T12:00:00Z',
    facts:{fallbackArchitectureV3:true},sections:{packageRecord:pair},source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',review_status:'approved'}};
  const template=natalCompleteEditorTemplate(servingPackageRecords.get('fallback-template/natal.aspect'));
  const templateSeed={...seed,id:'00000000-0000-4000-8000-000000000073',content_key:template.contentKey,headline:'Synthetic natal aspect template',body:template.body,sections:{packageRecord:template}};
  const store=await studioApiStore([seed,templateSeed]);
  let unavailable=true;
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
    await routeStudioInventoryApi(page,{call:store.call,answer:async(route,url)=>{
      if(url.pathname==='/api/admin/natal-placement-preview') {
        if(unavailable) { await route.fulfill({status:503,json:{ok:false,error:'Synthetic publication state unavailable.'}});return true; }
        const input=normalizeNatalPlacementPreviewInput(route.request().postDataJSON());
        await route.fulfill({json:{ok:true,...renderNatalPlacementPreviewState(input),friend:renderNatalAspectFriendDraft(input)}});return true;
      }
      if(url.pathname==='/api/content-reader') {const result=await store.call({method:'POST',url:url.pathname,body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;}
      return false;
    }});
    await page.goto('/admin/content#exact-content?category=Natal+Aspects&first=sun&aspect=conjunction&second=mercury');
    const complete=page.getByRole('button',{name:'Edit complete write-up',exact:true});
    await complete.click();
    await expect(page.getByRole('alert')).toContainText('Synthetic publication state unavailable.');
    expect((await store.call({method:'rows'})).length).toBe(2);
    unavailable=false;await complete.click();
    const editor=page.getByRole('dialog',{name:'Generated content editor',exact:true});
    const you=editor.locator('[data-sky-field="body_you"]');
    const friend=editor.locator('[data-sky-field="body_they"]');
    const expectedYou=pair.body+" Synthetic shared closing for your Sun and Mercury.";
    const expectedFriend=pair.body_they+" Synthetic shared closing for {{Name}}'s Sun and Mercury.";
    await expect(you).toHaveValue(expectedYou);await expect(friend).toHaveValue(expectedFriend);
    await expect(editor.getByLabel('Content key',{exact:true})).toHaveValue(key);
    const edited=expectedYou+' Synthetic revised final sentence.';
    await you.fill(edited);
    await editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save draft',exact:true}).click();
    await expect.poll(async()=>(await store.call({method:'rows'})).find((r:any)=>r.content_key===key)?.sections?.packageRecord?.body_you).toBe(edited);
    await editor.screenshot({path:`test-results/natal-complete-editor-${width}-${theme}.png`});
    await editor.getByRole('button',{name:'Close',exact:true}).click();await page.reload();
    const passages=page.getByRole('region',{name:'Matching natal aspect passages'});
    await passages.getByRole('button',{name:'Edit source',exact:true}).click();
    await expect(you).toHaveValue(edited);await expect(friend).toHaveValue(expectedFriend);
    await editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save & publish',exact:true}).click();
    await expect.poll(async()=>{
      const reader=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[key]}});
      return reader.payload.rows?.[0]?.sections?.packageRecord?.body_you;
    }).toBe(edited);
    const saved=(await store.call({method:'rows'})).find((r:any)=>r.content_key===key);
    const rendered=renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({kind:'natal-aspect',planet:'sun',second:'mercury',aspect:'conjunction',overrides:[{id:saved.id,status:saved.status,lane:saved.lane,provider:saved.provider,updatedAt:saved.updated_at,packageRow:saved.sections.packageRecord}]}));
    expect(rendered.rendered.body).toBe(edited);
    expect(rendered.rendered.body.match(/Synthetic shared closing for your Sun and Mercury/g)).toHaveLength(1);
    expect((await store.call({method:'rows'})).find((r:any)=>r.content_key===pairKey)).toEqual(seed);
    expect((await store.call({method:'rows'})).find((r:any)=>r.content_key===template.contentKey)).toEqual(templateSeed);
    expect(errors).toEqual([]);
  } finally {store.close();}
});

for(const width of [390,1440]) for(const theme of ['light','dark']) test(`Friend Fortune aspects use calculated day/night positions and exact copy ${width} ${theme}`,async({page})=>{
  await checkFriendFortune(page,width,theme,false);
});
test('Friend Fortune aspects stay unavailable with an unknown birth time',async({page})=>{
  await checkFriendFortune(page,390,'light',true);
});

async function checkFriendFortune(page: import('@playwright/test').Page,width:number,theme:string,unknown:boolean){
  test.setTimeout(90_000);
  const key='fallback-hook/natal-aspect-lived/mercury/conjunction/part-of-fortune';
  const supplied=process.env.TLDR_FORTUNE_READER_ROWS
    ? JSON.parse(readFileSync(process.env.TLDR_FORTUNE_READER_ROWS,'utf8')).rows.find((row:any)=>row.content_key===key)?.sections?.packageRecord?.body_they
    : undefined;
  const friend=supplied??'{{Name}} keeps this Fortune opening exactly.\n\nThey keep the complete approved Fortune ending exactly.';
  if(process.env.TLDR_FORTUNE_READER_ROWS && typeof supplied!=='string')throw new Error('The requested approved Fortune source is missing.');
  const record={contentKey:key,content_role:'full_copy',grammar_frame:'complete_sentence',reader_only:true,render_policy:'reader-only-exact-lived-v1',review_status:'needs_review',body:''};
  const store=await studioApiStore([{
    id:'00000000-0000-4000-8000-000000000063',content_key:key,headline:'Mercury conjunction Part Of Fortune',body:'',summary:'',
    status:'DRAFT',lane:'reference',review_state:'needs-review',surface:'you',mode:'in_depth',provider:'tldrastro-fallback-architecture-v3',event_type:'fallback-system',block_type:'fallback_hook',
    updated_at:'2026-11-17T12:00:00Z',created_at:'2026-11-17T12:00:00Z',facts:{fallbackArchitectureV3:true},sections:{packageRecord:record},
    source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',content_role:'full_copy',review_status:'needs_review'}
  }]);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  try{
    const initial=(await store.call({method:'rows'}))[0];
    const draft=await store.call({method:'PATCH',body:{id:initial.id,expectedUpdatedAt:initial.updated_at,status:'DRAFT',sections:{packageDraft:{...record,body_they:friend}}}});
    expect(draft.status).toBe(200);const saved=draft.payload.rows[0];
    const published=await store.call({method:'PATCH',body:{id:saved.id,expectedUpdatedAt:saved.updated_at,ownerAction:'approve-package-revision'}});
    expect(published.status).toBe(200);expect(published.payload.rows[0].sections.packageRecord.body_they).toBe(friend);
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(({theme,unknown})=>{
      const location={label:'Synthetic New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'};
      const names=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron','Lilith','North Node','South Node'];
      const longitudes=[10,40,theme==='light'?150:90,55,100,170,195,220,245,280,305,330,80,260];
      const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
      const instant='2026-11-17T12:00:00Z';
      const sky={location,generatedAt:instant,birthTimeKnown:!unknown,solarHorizon:{version:'solar-horizon-v1',instant,altitude:theme==='light'?30:-30},
        ascendant:'Leo',ascendantLongitude:120,midheaven:'Scorpio',midheavenLongitude:210,moonPhase:'Waxing Crescent',dominantElement:'Fire',
        aspects:[{from:'Mercury',to:'Part Of Fortune',type:'opposition',orb:0}],
        positions:names.map((planet,i)=>({planet,glyph:'',longitude:longitudes[i],sign:signs[Math.floor(longitudes[i]/30)],degree:longitudes[i]%30,house:i%12+1,motion:'direct',theme:''}))};
      localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:pageAnimations','off');localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));
      localStorage.setItem('tldrastro:userProfile',JSON.stringify({id:'synthetic-fortune-reader',name:'Test Reader',provider:'email',sun:'Aries',moon:'Taurus',rising:'Leo',currentLocation:location.label,currentLocationData:location,
        charts:[{id:'synthetic-birth-chart',name:'Test Reader',type:'Birth chart',birthDate:'1990-01-01',birthTime:'12:00 PM',birthCity:location.label,birthLocation:location}]}));
      localStorage.setItem('tldrastro:manualCharts:synthetic-fortune-reader',JSON.stringify([{id:'synthetic-fortune-friend',ownerUserId:'synthetic-fortune-reader',chartType:'person',displayName:'ExampleFriend',firstName:'ExampleFriend',lastName:null,relationshipType:'friend',birthDate:'1988-04-03',birthTime:unknown?null:'9:15 AM',birthTimeUnknown:unknown,birthPlace:location.label,birthLocation:location,natalChart:sky,notes:null,createdAt:instant,updatedAt:instant}]));
    },{theme,unknown});
    await readerSession(page,'synthetic-fortune-reader');await emptyLastKnownGoodSnapshot(page);
    await page.route('**/api/**',async route=>{if(await routeStudioPublicReader(route,new URL(route.request().url()),message=>store.call(message.method==='reader'?{method:'POST',url:'/api/content-reader',body:message.body}:message)))return;
      await route.fulfill({status:503,json:{error:'Synthetic unavailable calculation service'}});});
    const open=async()=>{await page.goto('/#friends?tab=charts&chart=synthetic-fortune-friend&view=natal&detail=natal-placement-mercury');await expect(page.locator('.sky-detail-article')).toContainText('Mercury');};
    await open();const article=page.locator('.sky-detail-article');const contact=article.getByRole('button',{name:/Mercury.*Conjunction.*Part Of Fortune/});
    if(unknown){await expect(contact).toHaveCount(0);await expect(article).not.toContainText('Part Of Fortune');expect(errors).toEqual([]);return;}
    await expect(contact).toBeVisible();await expect(article).not.toContainText('Mercury Opposition Part Of Fortune');await contact.click();
    const expected=friend.replaceAll('{{Name}}','ExampleFriend');await expect(article).toContainText(expected);
    await article.screenshot({path:`test-results/friend-fortune-${width}-${theme}.png`});
    await page.reload();await open();await article.getByRole('button',{name:/Mercury.*Conjunction.*Part Of Fortune/}).click();await expect(article).toContainText(expected);
    expect((await store.call({method:'rows'}))[0].body).toBe('');expect(errors).toEqual([]);
  }finally{store.close();}
}

for(const width of [390,1440]) for(const theme of ['light','dark']) test(`Friend natal aspect uses exact approved Friend copy ${width} ${theme}`,async({page})=>{
  test.setTimeout(90_000);
  const key='fallback-hook/natal-aspect-lived/lilith/square/north-node';
  const you='You keep this separate synthetic You opening. You keep this exact You ending.';
  const friend='{{Name}} has a separately approved Friend opening. They can say, “You can leave it here.”\n\nTheir exact Friend final sentence stays unchanged.';
  const store=await studioApiStore([{
    id:'00000000-0000-4000-8000-000000000028',content_key:key,headline:'Lilith square North Node',body:you,summary:'',
    status:'DRAFT',lane:'reference',review_state:'fallback-system-reference',surface:'you',mode:'in_depth',
    provider:'tldrastro-fallback-architecture-v3',event_type:'fallback-system',block_type:'fallback_hook',
    updated_at:'2026-11-15T12:00:00Z',created_at:'2026-11-15T12:00:00Z',facts:{fallbackArchitectureV3:true},
    sections:{packageRecord:{contentKey:key,content_role:'fallback_hook',grammar_frame:'complete_sentence',reader_only:true,
      render_policy:'reader-only-exact-lived-v1',review_status:'approved',body:you}},
    source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',content_role:'fallback_hook',review_status:'approved'}
  }]);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  try{
    const initial=(await store.call({method:'rows'}))[0];
    const draft=await store.call({method:'PATCH',body:{id:initial.id,expectedUpdatedAt:initial.updated_at,status:'DRAFT',sections:{packageDraft:{...initial.sections.packageRecord,body_they:friend}}}});
    expect(draft.status).toBe(200);
    const saved=draft.payload.rows[0];
    const published=await store.call({method:'PATCH',body:{id:saved.id,expectedUpdatedAt:saved.updated_at,ownerAction:'approve-package-revision'}});
    expect(published.status).toBe(200);
    expect(published.payload.rows[0].sections.packageRecord.body_they).toBe(friend);
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(({theme})=>{
      const location={label:'Synthetic New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'};
      const names=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron','Lilith','North Node','South Node'];
      const longitudes=[10,50,20,40,100,150,180,210,240,280,0,0,90,270];
      const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
      const sky={location,generatedAt:'2026-11-15T12:00:00Z',ascendant:'Leo',ascendantLongitude:120,midheaven:'Scorpio',midheavenLongitude:210,
        moonPhase:'Waxing Crescent',dominantElement:'Fire',aspects:[],positions:names.map((planet,i)=>({planet,glyph:'',longitude:longitudes[i],sign:signs[Math.floor(longitudes[i]/30)],degree:longitudes[i]%30,house:i%12+1,motion:'direct',theme:''}))};
      localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:pageAnimations','off');
      localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));
      localStorage.setItem('tldrastro:userProfile',JSON.stringify({id:'synthetic-lilith-reader',name:'Test Reader',provider:'email',sun:'Aries',moon:'Taurus',rising:'Leo',currentLocation:location.label,currentLocationData:location,
        charts:[{id:'synthetic-birth-chart',name:'Test Reader',type:'Birth chart',birthDate:'1990-01-01',birthTime:'12:00 PM',birthCity:location.label,birthLocation:location}]}));
      localStorage.setItem('tldrastro:manualCharts:synthetic-lilith-reader',JSON.stringify([{id:'synthetic-lilith-friend',ownerUserId:'synthetic-lilith-reader',chartType:'person',displayName:'ExampleFriend',firstName:'ExampleFriend',lastName:null,relationshipType:'friend',birthDate:'1988-04-03',birthTime:'9:15 AM',birthTimeUnknown:false,birthPlace:location.label,birthLocation:location,natalChart:sky,notes:null,createdAt:'2026-11-15T12:00:00Z',updatedAt:'2026-11-15T12:00:00Z'}]));
    },{theme});
    await readerSession(page,'synthetic-lilith-reader');
    await emptyLastKnownGoodSnapshot(page);
    await page.route('**/api/**',async route=>{
      if(await routeStudioPublicReader(route,new URL(route.request().url()),message=>store.call(message.method==='reader'
        ? {method:'POST',url:'/api/content-reader',body:message.body} : message)))return;
      await route.fulfill({status:503,json:{error:'Synthetic unavailable calculation service'}});
    });
    const openAspect=async()=>{
      await page.goto('/#friends?tab=charts&chart=synthetic-lilith-friend&view=natal&detail=natal-placement-lilith');
      const placement=page.locator('.sky-detail-article');
      await expect(placement).toContainText('Lilith');
      await expect(placement).toContainText('ExampleFriend has a separately approved Friend opening.');
      await placement.getByRole('button',{name:/Lilith.*North Node|North Node.*Lilith/}).click();
    };
    await openAspect();
    const article=page.locator('.sky-detail-article');
    const expected=friend.replaceAll('{{Name}}','ExampleFriend');
    await expect(article).toContainText(expected.split('\n\n')[0]);
    await expect(article).toContainText(expected.split('\n\n')[1]);
    await expect(article).not.toContainText('You keep this separate synthetic You opening');
    await article.screenshot({path:`test-results/friend-natal-aspect-exact-${width}-${theme}.png`});
    await page.reload();await openAspect();
    await expect(article).toContainText(expected.split('\n\n')[0]);
    await expect(article).toContainText(expected.split('\n\n')[1]);
    expect((await store.call({method:'rows'}))[0].body).toBe(you);
    expect(errors).toEqual([]);
  }finally{store.close();}
});

for (const width of [390,1440]) for (const theme of ['light','dark']) test(`Planet and house write-up without a sign ${width} ${theme}`, async ({page}) => {
  test.setTimeout(90_000);
  const key = 'fallback-hook/placement-house-lived/mars/12';
  const you = 'Synthetic saved Mars house opening. Complete saved Mars house ending.';
  const they = 'Synthetic saved Friend house opening. Complete saved Friend house ending.';
  const store = await studioApiStore([{
    id: '00000000-0000-4000-8000-000000000012', content_key: key, headline: 'Mars house source', body: you, summary: '',
    status: 'LIVE', lane: 'serving', provider: 'tldrastro-fallback-architecture-v3', event_type: 'fallback-hook', block_type: 'fallback_hook',
    surface: 'you', mode: 'in_depth', updated_at: '2026-11-15T12:00:00Z', created_at: '2026-11-15T12:00:00Z',
    sections: { packageRecord: { ...servingPackageRecords.get(key), body: you, body_you: you, body_they: they, body_they_review_status: 'approved', body_they_approval: { approvalLevel: 'exact_owner_approved', recordPath: 'synthetic-fixture' }, review_status: 'approved' } },
    facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3' }
  }]);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let failPreview = false;
  let releasePreview!: () => void;
  const previewReady = new Promise<void>(resolve => { releasePreview = resolve; });
  try {
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
      localStorage.setItem('tldrastro:studio-theme',theme);
      localStorage.setItem('tldrastro:studio-palette','green');
    },theme);
    await routeStudioInventoryApi(page,{call:store.call,answer:async(route,url) => {
      if (url.pathname !== '/api/admin/natal-placement-preview') return false;
      await previewReady;
      if (failPreview) {
        await route.fulfill({status:503,json:{ok:false,error:'Synthetic preview unavailable.'}});
        return true;
      }
      await route.fulfill({json:{ok:true,...renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(route.request().postDataJSON()))}});
      return true;
    }});
    await page.goto('/admin/content#exact-content?category=Natal+Chart&planet=mars&house=12');
    const preview = page.locator('.admin-natal-reader-preview');
    await expect(preview).toHaveAttribute('aria-busy','true');
    releasePreview();
    await expect(preview).toHaveAccessibleName('Reader preview for Mars in the 12th house');
    await expect(preview.locator('.admin-natal-reader-preview-part')).toHaveCount(1);
    await expect(preview).toContainText(you);
    await expect(preview.getByRole('heading',{level:3})).toHaveText(['What you see','Mars in the 12th house']);
    const titleStyles = () => preview.getByRole('heading',{level:3}).last().evaluate(element => {
      const style = getComputedStyle(element);
      return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','marginTop','marginBottom','textTransform','textAlign'].map(name => [name,style[name as keyof CSSStyleDeclaration]]));
    });
    const houseTitleStyles = await titleStyles();
    await expect(page.getByRole('combobox',{name:'Natal placement zodiac sign'})).toHaveValue('');
    await expect(preview.getByRole('button',{name:'Create exact override',exact:true})).toHaveCount(0);
    const original = await preview.locator('.admin-natal-reader-preview-part > p').allTextContents();
    await preview.getByRole('button',{name:'Friend',exact:true}).click();
    await expect(preview).toContainText(they);
    await preview.getByRole('button',{name:'You',exact:true}).click();
    await expect(preview).toContainText(you);
    await page.getByRole('combobox',{name:'Natal placement zodiac sign'}).selectOption('aries');
    await expect(preview.locator('.admin-natal-reader-preview-part')).toHaveCount(2);
    expect(await titleStyles()).toEqual(houseTitleStyles);
    expect((await preview.locator('.admin-natal-reader-preview-part > p').allTextContents()).slice(1)).toEqual(original);
    await page.getByRole('combobox',{name:'Natal placement zodiac sign'}).selectOption('');
    await expect(preview.locator('.admin-natal-reader-preview-part')).toHaveCount(1);
    await expect(preview).toContainText(you);
    await page.reload();
    await expect(preview).toContainText(you);
    await expect(page.getByRole('combobox',{name:'Natal placement zodiac sign'})).toHaveValue('');
    const sourceCard = page.locator('.admin-natal-source-card').filter({has:page.locator('code').filter({hasText:key})});
    await sourceCard.getByRole('button',{name:'Edit source',exact:true}).click();
    const dialog = page.getByRole('dialog',{name:'Generated content editor'});
    await expect(dialog.getByRole('textbox',{name:'Reader phrase · You',exact:true})).toHaveValue(you);
    await expect(dialog.getByRole('textbox',{name:'Reader phrase · They',exact:true})).toHaveValue(they);
    await dialog.getByRole('button',{name:'Close',exact:true}).click();
    await preview.screenshot({path:`test-results/natal-house-only-${width}-${theme}.png`});
    failPreview = true;
    const failedWithSavedSources = page.waitForResponse(response => response.url().endsWith('/api/admin/natal-placement-preview')
      && response.status() === 503 && response.request().postDataJSON().overrides.some((candidate: any) => candidate.packageRow.contentKey === key));
    await page.reload();
    await failedWithSavedSources;
    await expect(preview.getByRole('alert')).toContainText('Synthetic preview unavailable.');
    failPreview = false;
    await preview.getByRole('button',{name:'Retry reader preview',exact:true}).click();
    await expect(preview).toContainText(you);
    expect(errors).toEqual([]);
  } finally { releasePreview(); store.close(); }
});

const key='fallback-hook/natal-you-placement-complete-final/chiron/taurus/12';
const source=JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json','utf8')).hookRows.find((row:any)=>row.contentKey===key);
for (const width of [390,1440]) for (const theme of ['light','dark']) test(`Planet and house retrograde modifiers create, persist and publish ${width} ${theme}`, async ({page}) => {
  test.setTimeout(90_000);
  const modifierKey='fallback-hook/natal-retrograde-modifier/saturn/4';
  const you='Synthetic Saturn fourth-house modifier opening. Complete synthetic modifier ending.';
  const they='Synthetic Saturn fourth-house Friend opening. Their complete synthetic modifier ending.';
  const store=await studioApiStore([],{uuidIds:true});
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(theme=>{
      localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
      localStorage.setItem('tldrastro:studio-theme',theme);
      localStorage.setItem('tldrastro:studio-palette','green');
    },theme);
    await routeStudioInventoryApi(page,{call:store.call,answer:async(route,url)=>{
      if(url.pathname==='/api/admin/content-live-status'){
        await route.fulfill({json:{ok:true,statuses:await store.call({method:'statuses',body:route.request().postDataJSON()})}});return true;
      }
      if(url.pathname!=='/api/admin/natal-placement-preview')return false;
      const input=route.request().postDataJSON();
      const rows=await store.call({method:'rows'});
      input.overrides=rows.map((row:any)=>({id:row.id,status:row.review_state?'DRAFT':row.status,lane:row.lane,provider:row.provider,updatedAt:row.updated_at,packageRow:row.sections.packageRecord}));
      await route.fulfill({json:{ok:true,...renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(input),await store.call({method:'publications'}))}});return true;
    }});
    const href='/admin/content#exact-content?category=Natal+Chart&planet=saturn&sign=virgo&house=4&motion=retrograde';
    await page.goto(href);
    const card=page.locator('.admin-natal-source-card').filter({has:page.locator('code').filter({hasText:modifierKey})});
    const group=page.locator('.admin-natal-source-group').filter({has:page.locator('code').filter({hasText:modifierKey})});
    await expect(group.getByRole('heading',{level:3})).toHaveText('Saturn retrograde in the 4th house');
    await expect(card).toContainText('across every zodiac sign');
    await expect(card).toContainText('No modifier is saved');
    const preview=page.locator('.admin-natal-reader-preview');
    await expect(preview.locator('.admin-natal-reader-preview-part')).toHaveCount(2);
    const base=await preview.locator('.admin-natal-reader-preview-part > p').allTextContents();
    const metrics=await group.getByRole('heading',{level:3}).evaluate(element=>{
      const properties=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','marginTop','marginBottom','textTransform','textAlign'] as const;
      const comparable=document.querySelector('.admin-natal-source-group > header h3')!;
      const actual=getComputedStyle(element), expected=getComputedStyle(comparable);
      return properties.map(name=>[name,actual[name],expected[name]]);
    });
    for(const [property,actual,expected] of metrics)expect(actual,property).toBe(expected);
    const dialog=page.getByRole('dialog',{name:'Generated content editor'});
    const titleStyles=()=>dialog.getByRole('heading',{level:2}).evaluate(element=>{
      const style=getComputedStyle(element);
      return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','marginTop','marginBottom','textTransform','textAlign'].map(name=>[name,style[name as keyof CSSStyleDeclaration]]));
    });
    await preview.getByRole('button',{name:'Create exact override',exact:true}).click();
    await expect(dialog.getByRole('heading',{level:2})).toHaveText('Create fallback passage');
    const existingTitleStyles=await titleStyles();
    page.once('dialog',confirmation=>confirmation.accept());
    await dialog.getByRole('button',{name:'Close',exact:true}).click();
    await expect(dialog).toBeHidden();
    await card.getByRole('button',{name:'Create retrograde modifier',exact:true}).click();
    await expect(dialog.getByRole('heading',{level:2})).toHaveText('Create Saturn retrograde in the 4th House · Retrograde modifier');
    expect(await titleStyles()).toEqual(existingTitleStyles);
    expect(await dialog.evaluate(element=>{
      const heading=element.querySelector('.admin-editor-toolbar > h2')!;
      const field=element.querySelector('input')!;
      return Boolean(heading.compareDocumentPosition(field)&Node.DOCUMENT_POSITION_FOLLOWING)
        && heading.getBoundingClientRect().top<field.getBoundingClientRect().top;
    })).toBe(true);
    await dialog.screenshot({path:`test-results/natal-retrograde-create-title-${width}-${theme}.png`});
    await expect(dialog).toContainText('Saturn retrograde in the 4th house modifier');
    await expect(dialog.getByText('This exact override is used only in You.',{exact:false})).toHaveCount(0);
    await dialog.locator('textarea[data-sky-field="body"]').fill(you);
    await dialog.locator('textarea[data-sky-field="body_they"]').fill(they);
    await dialog.getByRole('button',{name:'Save draft',exact:true}).click();
    await expect.poll(async()=> (await store.call({method:'rows'})).some((row:any)=>row.content_key===modifierKey&&row.body===you)).toBe(true);
    await page.reload();
    if(!await card.getByRole('textbox',{name:/: Friend copy$/}).count()){
      await card.getByRole('button',{name:/^(?:Load and edit|Edit source)$/}).click();
      await dialog.getByRole('button',{name:'Close',exact:true}).click();
    }
    await expect(card.getByRole('textbox',{name:/: You copy$/})).toHaveValue(you);
    await expect(card.getByRole('textbox',{name:/: Friend copy$/})).toHaveValue(they);
    await card.getByRole('button',{name:'Edit source',exact:true}).click();
    await expect(dialog.getByRole('heading',{level:2})).toHaveText('Edit Saturn retrograde in the 4th House · Retrograde modifier');
    expect(await titleStyles()).toEqual(existingTitleStyles);
    await expect(dialog.locator('textarea[data-sky-field="body"]')).toHaveValue(you);
    await expect(dialog.locator('textarea[data-sky-field="body_they"]')).toHaveValue(they);
    await dialog.screenshot({path:`test-results/natal-retrograde-edit-title-${width}-${theme}.png`});
    await dialog.getByRole('button',{name:'Close',exact:true}).click();
    await expect(preview.locator('.admin-natal-reader-preview-part')).toHaveCount(2);
    await card.getByRole('button',{name:'Save & publish',exact:true}).click();
    await expect(card.getByRole('status')).toHaveText('Published. The reader preview will refresh.');
    await expect(preview.locator('.admin-natal-reader-preview-part')).toHaveCount(3);
    await expect(preview.locator('.admin-natal-reader-preview-part > p').last()).toHaveText(you);
    expect((await preview.locator('.admin-natal-reader-preview-part > p').allTextContents()).slice(0,2)).toEqual(base);
    await preview.getByRole('button',{name:'Friend',exact:true}).click();
    await expect(preview.locator('.admin-natal-reader-preview-part > p').last()).toHaveText(they);
    await page.reload();
    await expect(preview.locator('.admin-natal-reader-preview-part > p').last()).toHaveText(you);
    await group.screenshot({path:`test-results/natal-retrograde-modifier-${width}-${theme}.png`});
    await page.goto(href.replace('motion=retrograde','motion=direct'));
    await expect(preview).not.toContainText(you);
    await expect(page.getByRole('button',{name:'Create retrograde modifier',exact:true})).toHaveCount(0);
    await page.goto(href.replace('house=4','house=5'));
    await expect(preview).not.toContainText(you);
    await page.goto(href.replace('planet=saturn','planet=jupiter'));
    await expect(preview).not.toContainText(you);
    expect(errors).toEqual([]);
  } finally {store.close();}
});
for(const width of [390,1440]) test(`Studio saves and publishes separate complete Friend wording ${width}`,async({page})=>{
  test.setTimeout(90_000);
  const original=source.body;
  const store=await studioApiStore([{id:'fixture-complete-friend',content_key:key,surface:'you',mode:'in_depth',status:'LIVE',lane:'serving',review_state:null,
    provider:'tldrastro-fallback-architecture-v3',body:original,headline:'Chiron in Taurus in the twelfth house',summary:'',updated_at:'2026-10-25T12:00:00Z',
    sections:{packageRecord:source},facts:{fallbackArchitectureV3:true,review_status:'approved'},source_snapshot:{contentType:'fallback-system',review_status:'approved'}}]);
  try{
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
    await routeStudioInventoryApi(page,{call:store.call,answer:async(route,url)=>{
      if(url.pathname==='/api/admin/content-live-status'){
        await route.fulfill({json:{ok:true,statuses:await store.call({method:'statuses',body:route.request().postDataJSON()})}});return true;
      }
      if(url.pathname==='/api/admin/natal-placement-preview'){
        const input=route.request().postDataJSON();
        const rows=await store.call({method:'rows'});
        input.overrides=rows.map((row:any)=>({id:row.id,status:row.review_state?'DRAFT':row.status,lane:row.lane,provider:row.provider,updatedAt:row.updated_at,packageRow:row.sections.packageRecord}));
        await route.fulfill({json:{ok:true,...renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(input),await store.call({method:'publications'}))}});return true;
      }
      return false;
    }});
    await page.goto('/admin/content#exact-content?category=Natal+Chart&planet=chiron&sign=taurus&house=12');
    const card=page.locator('.admin-natal-source-card').filter({has:page.locator('code').filter({hasText:key})});
    await expect(card).toBeVisible();
    const friend=card.getByRole('textbox',{name:/: Friend copy$/});
    if(!await friend.count()){
      await card.getByRole('button',{name:/^(?:Load and edit|Edit source)$/}).click();
      const dialog=page.getByRole('dialog',{name:'Generated content editor'});
      await dialog.getByRole('button',{name:'Close',exact:true}).click();
    }
    await expect(friend).toHaveValue('');
    const body='{{ownerName}} complete Friend opening.\n\nThey retain the exact final paragraph.';
    await friend.fill(body);
    await card.getByRole('button',{name:'Save draft',exact:true}).click();
    await expect(card.getByRole('status')).toHaveText('Draft saved.');
    await page.reload();
    if(!await friend.count()){
      await card.getByRole('button',{name:/^(?:Load and edit|Edit source)$/}).click();
      await page.getByRole('dialog',{name:'Generated content editor'}).getByRole('button',{name:'Close',exact:true}).click();
    }
    await expect(friend).toHaveValue(body);
    await card.getByRole('button',{name:'Save & publish',exact:true}).click();
    await expect(card.getByRole('status')).toHaveText('Published. The reader preview will refresh.');
    const saved=(await store.call({method:'rows'})).find((row:any)=>row.content_key===key);
    expect(saved.sections.packageRecord.body).toBe(original);
    expect(saved.sections.packageRecord.body_they).toBe(body);
    expect(saved.sections.packageRecord.body_they_approval.approvalLevel).toBe('exact_owner_approved');
    await page.reload();
    await expect(card).toContainText(key);
    await page.screenshot({path:`test-results/studio-complete-friend-${width}.png`,fullPage:true});
  }finally{store.close();}
});

for (const width of [390,1440]) for (const kind of ['placement','empty-house'] as const) for (const failure of ['response','stall'] as const) {
  test(`Natal ${kind} reader preview recovers ${failure} without leaving the editor ${width}`, async ({page}) => {
    test.setTimeout(60_000);
    const store=await studioApiStore([]);
    let unavailable=failure==='response';
    let expectedParts:string[]=[];
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await page.setViewportSize({width,height:1000});
      await page.addInitScript(stall=>{
        localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
        const schedule=window.setTimeout.bind(window);
        window.setTimeout=((handler,timeout,...args)=>schedule(handler,timeout===45_000?1_000:timeout,...args)) as typeof window.setTimeout;
        (window as any).__stallNatalPreview=stall;
        const fetchRequest=window.fetch.bind(window);
        window.fetch=(input,options)=>{
          const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);
          if (url.pathname==='/api/admin/natal-placement-preview'&&(window as any).__stallNatalPreview) {
            return new Promise<Response>((_resolve,reject)=>{
              const abort=()=>reject(new DOMException('Synthetic stalled preview was interrupted.','AbortError'));
              if(options?.signal?.aborted)abort();
              else options?.signal?.addEventListener('abort',abort,{once:true});
            });
          }
          return fetchRequest(input,options);
        };
      },failure==='stall');
      await routeStudioInventoryApi(page,{call:store.call,answer:async(route,url)=>{
        if(url.pathname!=='/api/admin/natal-placement-preview')return false;
        if(unavailable){
          await route.fulfill({status:503,json:{ok:false,error:'Synthetic reader preview unavailable.'}});
        }else{
          const input=route.request().postDataJSON();
          const result=renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(input),[]);
          expectedParts=kind==='empty-house'?[result.rendered.body]:result.rendered.parts;
          await route.fulfill({json:{ok:true,...result}});
        }
        return true;
      }});
      await page.goto(kind==='empty-house'
        ?'/admin/content#exact-content?category=Natal+Chart&natalView=empty-houses'
        :'/admin/content#exact-content?category=Natal+Chart&planet=neptune&sign=aquarius&house=12');
      const preview=page.locator(kind==='empty-house'?'.admin-empty-house-preview':'.admin-natal-reader-preview');
      const unavailableMessage=kind==='empty-house'?'Empty-house preview unavailable':'Reader preview unavailable';
      await expect(preview.getByText(unavailableMessage,{exact:true})).toBeVisible({timeout:8_000});
      if(failure==='stall')await expect(preview).toContainText('Loading content timed out. Try again; no changes were submitted.');
      const retry=preview.getByRole('button',{name:kind==='empty-house'?'Retry empty-house preview':'Retry reader preview',exact:true});
      await expect(retry).toBeVisible();
      unavailable=false;
      await page.evaluate(()=>{(window as any).__stallNatalPreview=false;});
      await retry.click();
      await expect.poll(async()=>{
        const actual=await preview.locator(kind==='empty-house'?'.admin-empty-house-assembly-copy > p':'.admin-natal-reader-preview-part > p').allTextContents();
        return expectedParts.length>0&&JSON.stringify(actual)===JSON.stringify(expectedParts);
      }).toBe(true);
      await expect(preview.getByText(unavailableMessage,{exact:true})).toBeHidden();
      expect(errors).toEqual([]);
      expect(await store.call({method:'rows'})).toEqual([]);
    }finally{store.close();}
  });
}
