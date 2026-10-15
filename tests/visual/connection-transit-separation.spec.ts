import { test, expect, type Page } from '@playwright/test';
import { readerResponse } from '../helpers/reader-response';
import { fork } from 'node:child_process';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
const fixtureUserId = 'qa-connection-source-user';
const fixtureFriendName = 'Nikki';
async function seed(page: Page, theme: string) {
  await page.addInitScript(({ fixtureUserId, fixtureFriendName, incompleteChart, theme }) => {
    if (window.localStorage.getItem("tldrastro:friendsPerformanceSeeded")) {
      return;
    }

    window.localStorage.clear();
    window.localStorage.setItem("tldrastro:friendsPerformanceSeeded", "true");
    window.localStorage.setItem("tldrastro:theme", theme);
    window.localStorage.setItem("tldrastro:sunriseOrb", "true");
    window.localStorage.setItem("tldrastro:dyslexiaFont", "false");
    window.localStorage.setItem("tldrastro:friendsTab", "charts");

    const location = {
      label: "New York, NY",
      latitude: 40.7128,
      longitude: -74.006,
      timeZone: "America/New_York"
    };
    const signs = [
      ["Aries", "♈"], ["Taurus", "♉"], ["Gemini", "♊"], ["Cancer", "♋"],
      ["Leo", "♌"], ["Virgo", "♍"], ["Libra", "♎"], ["Scorpio", "♏"],
      ["Sagittarius", "♐"], ["Capricorn", "♑"], ["Aquarius", "♒"], ["Pisces", "♓"]
    ];
    const planets = [
      ["Sun", "☉", "core self"], ["Moon", "☽", "inner world"],
      ["Mercury", "☿", "communication"], ["Venus", "♀", "values"],
      ["Mars", "♂", "energy"], ["Jupiter", "♃", "growth"],
      ["Saturn", "♄", "structure"], ["Uranus", "♅", "change"],
      ["Neptune", "♆", "dreams"], ["Pluto", "♇", "power"],
      ["Chiron", "⚷", "repair"], ["Lilith", "⚸", "refusal"],
      ["North Node", "☊", "growth edge"], ["South Node", "☋", "familiar pattern"]
    ];
    const fixtureSky = (signOffset: number) => ({
      location,
      generatedAt: "2026-08-08T16:00:00.000Z",
      ascendant: signs[(11 + signOffset) % signs.length][0],
      ascendantLongitude: (330 + signOffset * 30) % 360,
      midheaven: signs[(8 + signOffset) % signs.length][0],
      midheavenLongitude: (240 + signOffset * 30) % 360,
      moonPhase: "Waxing Crescent",
      dominantElement: signOffset % 2 === 0 ? "Fire" : "Water",
      positions: planets.map(([planet, glyph, theme], index) => {
        const [sign, signGlyph] = signs[(index + signOffset) % signs.length];
        const longitude = ((index + signOffset) * 27 + 6) % 360;

        return {
          planet,
          glyph,
          sign,
          signGlyph,
          longitude,
          degree: longitude % 30,
          house: (index % 12) + 1,
          motion: index === 2 || index === 6 ? "retrograde" : "direct",
          theme
        };
      }),
      aspects: [
        { from: "Sun", to: "Moon", type: "trine", orb: 1.2, meaning: "Flowing emotional rhythm." },
        { from: "Venus", to: "Mars", type: "square", orb: 2.1, meaning: "Creative friction." }
      ]
    });
    const profile = {
      id: fixtureUserId,
      name: "Project Author",
      email: "qa-friends-performance@example.com",
      provider: "email",
      sun: "Aquarius",
      moon: "Scorpio",
      rising: "Gemini",
      currentLocation: location.label,
      currentLocationData: location,
      charts: [{
        id: "profile-birth-chart",
        name: "Project Author",
        type: "Birth chart",
        birthDate: "1990-01-01",
        birthTime: "12:00 PM",
        birthCity: location.label,
        birthLocation: location
      }]
    };
    const friendChart = {
      id: incompleteChart ? "friend-incomplete" : "friend-nikki",
      ownerUserId: fixtureUserId,
      chartType: "person",
      displayName: incompleteChart ? "Casey" : fixtureFriendName,
      firstName: incompleteChart ? "Casey" : fixtureFriendName,
      lastName: null,
      relationshipType: "friend",
      birthDate: "1988-04-03",
      birthTime: "09:15",
      birthTimeUnknown: false,
      birthPlace: location.label,
      birthLocation: location,
      natalChart: incompleteChart ? null : fixtureSky(2),
      notes: null,
      createdAt: "2026-08-08T16:00:00.000Z",
      updatedAt: "2026-08-08T16:00:00.000Z"
    };

    window.localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
    window.localStorage.setItem("tldrastro:userProfile", JSON.stringify(profile));
    window.localStorage.setItem(
      `tldrastro:manualCharts:${fixtureUserId}`,
      JSON.stringify([friendChart])
    );
  }, {
    fixtureUserId,
    fixtureFriendName,
    incompleteChart: false, theme
  });
}
for (const activationLive of [false, true]) test(`connection detail separates transit and ${activationLive ? 'published' : 'unpublished'} activation`, async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date('2026-10-15T16:00:00Z'));
  await seed(page,testInfo.project.name.endsWith('dark')?'dark':'light');
  await page.route('https://tldrastro-api-27165565299.us-central1.run.app/**', route => route.fulfill({ status:503,body:'Isolated calculation fallback.' }));
  await page.route('**/rest/v1/**', route => route.fulfill({json:[]}));
  await page.route('**/api/content-publications', route => route.fulfill({json:{schema:'tldr-publications/v1',publications:[]}}));
  await page.route('**/api/content-reader', route => {
    const keys = route.request().postDataJSON()?.keys ?? [];
    const rows = keys.filter((key:string) => key.startsWith('authored/connection-activation/')).map((key:string) => ({
      id:key,content_key:key,status:activationLive?'LIVE':'DRAFT',lane:'serving',review_state:null,updated_at:'2026-10-15T12:00:00Z',
      surface:'friends',mode:'in_depth',provider:'tldrastro-fallback-architecture-v3',body:'You talk to {{holder1}}. This is the final activation sentence.',
      source_snapshot:{contentType:'connection-activation',content_role:'full_copy',review_status:'approved'},
      sections:{packageRecord:{contentKey:key,content_role:'full_copy',review_status:'approved',body_you:'You talk to {{holder1}}. This is the final activation sentence.',body_they:'Never substitute this perspective.'}}
    }));
    const publications=rows.map((row:any)=>({content_key:row.content_key,state:'live',revision:10,row_id:row.id,row_updated_at:row.updated_at,updated_at:row.updated_at}));
    return route.fulfill({json:readerResponse(rows,publications)});
  });
  await page.goto('/#friends?tab=charts&chart=friend-nikki&view=transits');
  const group=page.getByRole('region',{name:'Between you two',exact:true});
  await expect(group).toBeVisible({timeout:60000});
  const button=group.getByRole('button').first();
  const opening=await button.locator('.updates-aspect-row__description').first().innerText();
  await button.click();
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await expect(page.locator('.sky-detail-intro-section, .sky-detail-section').first()).not.toContainText(opening);
  await expect(page.locator('main')).not.toContainText('{{untilDate}}');
  if(activationLive){
    await expect(page.getByText('You talk to Nikki. This is the final activation sentence.',{exact:true}).first()).toBeVisible();
    await expect(page.getByText(/connecting this transit to the pattern below/).first()).toBeVisible();
  } else {
    await expect(page.getByText('What this activates',{exact:true})).toHaveCount(0);
    await expect(page.getByText(/connecting this transit to the pattern below/)).toHaveCount(0);
  }
  await page.screenshot({path:`test-results/connection-transit-${activationLive?'published':'draft'}-${testInfo.project.name}.png`,fullPage:true,animations:'disabled'});
  const detailUrl=page.url();
  await page.reload();
  await expect(page.getByRole('heading',{level:1})).toBeVisible({timeout:60000});
  expect(page.url()).toBe(detailUrl);
});

test('Studio saves and reopens separate activation and editable bridge drafts through the real handler', async({page},testInfo)=>{
  const child=fork(path.resolve('tests/helpers/calendar-review-api.mjs'),['--ipc'],{env:{...process.env,CALENDAR_REVIEW_FIXTURE:path.resolve('tests/fixtures/connection-transit-empty-inventory.json')},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  const pending=new Map<number,{resolve:(v:any)=>void,reject:(e:Error)=>void}>();let sequence=0,stderr='';
  child.stderr?.on('data',data=>{stderr+=data;});
  const ready=new Promise<void>((resolve,reject)=>{
    child.on('message',(message:any)=>{if(message.ready)return resolve();const item=pending.get(message.id);if(item){pending.delete(message.id);message.error?item.reject(new Error(message.error)):item.resolve(message.result);}});
    child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(item=>item.reject(error));});
  });
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  try {
  await ready;
  await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},testInfo.project.name.endsWith('dark')?'dark':'light');
  await routeStudioInventoryApi(page,{call,actualDocumentRoute:true});
  await page.goto('/admin/content#connection-transits');
  await expect(page.getByRole('region',{name:'Connection transit sources',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Open activation draft',exact:true}).click();
  const field=page.getByRole('textbox',{name:'Activation passage',exact:true});
  await expect(field).toHaveValue('');
  expect(await call({method:'rows'})).toEqual([]);
  await field.fill('You talk to {{holder1}}. The complete final sentence remains.');
  await page.getByRole('dialog').getByRole('button',{name:/^Save(?: draft)?$/,exact:true}).click();
  await expect.poll(async()=> (await call({method:'rows'})).length).toBe(1);
  let rows=await call({method:'rows'});expect(rows[0].status).toBe('DRAFT');expect(rows[0].source_snapshot.contentType).toBe('connection-activation');
  await page.reload();
  await page.getByRole('button',{name:'Open activation draft',exact:true}).click();
  await expect(field).toHaveValue('You talk to {{holder1}}. The complete final sentence remains.');
  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  await page.goto('/admin/content#connection-transits');
  await page.getByRole('button',{name:'Edit transit to your chart bridge',exact:true}).click();
  const template=page.locator('textarea[data-sky-field="body"]');
  await expect(template).toHaveValue(/\{\{transitPlanet\}\}/);
  const wording='{{transitPlanet}} is {{transitAspectWord}} your {{endpointPoint}}, also connected to {{holder1}}.';
  await template.fill(wording);
  await page.getByRole('dialog').getByRole('button',{name:/^Save(?: draft)?$/,exact:true}).click();
  await expect.poll(async()=> (await call({method:'rows'})).length).toBe(2);
  rows=await call({method:'rows'});expect(rows.every((row:any)=>row.status==='DRAFT')).toBe(true);
  expect(rows.find((row:any)=>row.source_snapshot.contentType==='connection-transit-bridge').sections.packageDraft?.body??rows.find((row:any)=>row.source_snapshot.contentType==='connection-transit-bridge').sections.packageRecord.body).toBe(wording);
  await page.reload();await page.getByRole('button',{name:'Edit transit to your chart bridge',exact:true}).click();
  await expect(template).toHaveValue(wording);
  await page.screenshot({path:`test-results/connection-transit-studio-${testInfo.project.name}.png`,fullPage:true,animations:'disabled'});
  } finally {child.kill();}
});
