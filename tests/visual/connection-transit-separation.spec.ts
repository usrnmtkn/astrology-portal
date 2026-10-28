import { test, expect, type Page, type Request, type Locator } from '@playwright/test';
import { readerResponse } from '../helpers/reader-response';
import { fork } from 'node:child_process';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { connectionBridgeTemplates } from '../../apps/web/src/content/connectionTransit';

async function openConnectionFacts(page: Page, name = 'Nikki') {
  await page.getByRole('button', { name: `Why this involves ${name}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: `Why this involves ${name}`, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}
async function expectConnectionFact(dialog: Locator, title: string, orb?: string) {
  const row = dialog.getByRole('listitem').filter({ hasText: title });
  await expect(row).toHaveCount(1);
  if (orb) await expect(row.locator('.connection-facts__orb')).toHaveText(`Orb ${orb}`);
}

const fixtureUserId = 'qa-connection-source-user';
const fixtureFriendName = 'Nikki';
const cadenceLogs = new WeakMap<Page, unknown[]>();
test.afterEach(async({page},testInfo)=>{
  const log=cadenceLogs.get(page);
  if(log) await testInfo.attach('connection-source-cadence',{body:JSON.stringify(log,null,2),contentType:'application/json'});
});
async function isolatedRest(page: Page) {
  await page.route('**/rest/v1/**', async route => {
    const table=new URL(route.request().url()).pathname.split('/').pop();
    if(table==='user_profiles')return route.fulfill({json:{data:{version:1,profile:await page.evaluate(()=>JSON.parse(localStorage.getItem('tldrastro:userProfile')!))}}});
    if(table==='manual_charts')return route.fulfill({status:400,json:{message:'Synthetic unavailable chart sync'}});
    return route.fulfill({json:[]});
  });
}
async function seed(page: Page, theme: string, multipleContacts = false, mixedContacts = false) {
  const user={id:fixtureUserId,email:'qa-connection-source@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{name:'Project Author'}};
  const authKey=`sb-${new URL(process.env.VITE_SUPABASE_URL??'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
  await page.route('**/auth/v1/**',route=>route.fulfill({json:user}));
  await page.addInitScript(({ fixtureUserId, fixtureFriendName, incompleteChart, theme, multipleContacts, mixedContacts, user, authKey }) => {
    if (window.localStorage.getItem("tldrastro:friendsPerformanceSeeded")) {
      return;
    }

    window.localStorage.clear();
    window.localStorage.setItem("tldrastro:friendsPerformanceSeeded", "true");
    window.localStorage.setItem("tldrastro:theme", theme);
    window.localStorage.setItem("tldrastro:pageAnimations", "off");
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
      // Current synthetic chart: legacy repair must not replace the deliberately
      // constructed contacts that this source-isolation suite is exercising.
      solarHorizon: { version: "solar-horizon-v1", instant: "2026-08-08T16:00:00.000Z", altitude: 30 },
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
    const friendNatal = fixtureSky(2);
    if (multipleContacts) {
      for (const point of friendNatal.positions) {
        if (["Venus", "Mercury", "Chiron", "Jupiter"].includes(point.planet)) {
          Object.assign(point, mixedContacts && point.planet === "Venus"
            ? { sign: "Pisces", signGlyph: "♓", degree: 12, longitude: 342 }
            : { sign: "Sagittarius", signGlyph: "♐", degree: 12, longitude: 252 });
        }
      }
    }
    if (mixedContacts) {
      Object.assign(friendNatal.positions.find(point => point.planet === "Saturn")!,
        { sign: "Sagittarius", signGlyph: "♐", degree: 12, longitude: 252 });
    }
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
      natalChart: incompleteChart ? null : friendNatal,
      notes: null,
      createdAt: "2026-08-08T16:00:00.000Z",
      updatedAt: "2026-08-08T16:00:00.000Z"
    };

    window.localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
    window.localStorage.setItem("tldrastro:userProfile", JSON.stringify(profile));
    localStorage.setItem(authKey,JSON.stringify({access_token:"synthetic-connection-token",refresh_token:"synthetic-connection-refresh",expires_at:Math.floor(Date.now()/1000)+3600,token_type:"bearer",user}));
    window.localStorage.setItem(
      `tldrastro:manualCharts:${fixtureUserId}`,
      JSON.stringify([friendChart, { ...friendChart, id: "friend-casey", displayName: "Casey", firstName: "Casey" }])
    );
  }, {
    fixtureUserId,
    fixtureFriendName,
    incompleteChart: false, theme, multipleContacts, mixedContacts, user, authKey
  });
}
test('transit titles identify the sky sign and natal chart owner in both sections', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-10-15T16:00:00Z'));
  await seed(page, testInfo.project.name.endsWith('dark') ? 'dark' : 'light', true);
  await page.route('https://tldrastro-api-27165565299.us-central1.run.app/**', route => route.fulfill({ status: 503, body: 'Isolated calculation fallback.' }));
  await isolatedRest(page);
  await page.route('**/api/content-publications', route => route.fulfill({ json: { schema: 'tldr-publications/v1', publications: [] } }));
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([], []) }));
  await page.goto('/#friends?tab=charts&chart=friend-nikki&view=transits');

  const between = page.getByRole('region', { name: 'Between you two', exact: true });
  const active = page.getByRole('region', { name: 'Short-term themes', exact: true });
  await expect(between.getByRole('heading', { name: "Pluto in Aquarius conjunct Nikki's natal Pluto", exact: true })).toBeVisible({ timeout: 60000 });
  const readerTitle = 'Saturn in Aries trine your natal Mars';
  await expect(between.getByRole('heading', { name: readerTitle, exact: true })).toBeVisible();
  await expect(active).toBeVisible();
  await expect(page.locator('.sky-detail-page h1')).toHaveCount(0);
  expect(await page.locator('.friend-transit-group > .friend-section-label').allTextContents()).toEqual(expect.arrayContaining(['Between you two', 'Active for Nikki']));
  const labels = await page.locator('.friend-transit-group > .friend-section-label').allTextContents();
  expect(labels.indexOf('Between you two')).toBeLessThan(labels.indexOf('Active for Nikki'));

  const activeHeadings = active.getByRole('heading', { level: 3 });
  const activeTitles = await activeHeadings.allTextContents();
  expect(activeTitles.length).toBeGreaterThan(0);
  for (const title of activeTitles) {
    expect(title).toMatch(/^.+ in (?:Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces) (?:conjunct|opposite|square|trine|sextile) Nikki's natal .+$/);
  }
  const titleStyles = await page.locator('.friend-transit-row h3').evaluateAll(headings => headings.map(heading => {
    const style = getComputedStyle(heading);
    return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(property => [property, style[property as keyof CSSStyleDeclaration]]));
  }));
  for (const style of titleStyles) expect(style).toEqual(titleStyles[0]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/friend-transit-titles-${testInfo.project.name}.png`, fullPage: true, animations: 'disabled' });

  const relationshipCard = between.getByRole('button', { name: `Open full entry for ${readerTitle}`, exact: true });
  await expect(relationshipCard).toContainText('This transit may bring your existing Mars connections with Nikki into focus.');
  await expect(relationshipCard).toContainText('Direct transits to both charts:');
  await expect(relationshipCard).not.toContainText('activating the connections');
  await relationshipCard.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(readerTitle);
  await expect(page.locator('.aspect-badge').first()).toHaveAttribute('data-aspect', 'trine');
  const facts = await openConnectionFacts(page);
  await expect(facts.locator('p').first()).toHaveText("This transit may bring your existing Mars connections with Nikki into focus.");
  await expectConnectionFact(facts, "Your natal Mars conjunct Nikki's natal Saturn", '1° 51′');
  for (const point of ['Venus', 'Mercury', 'Chiron', 'Jupiter']) {
    await expectConnectionFact(facts, `Your natal Mars conjunct Nikki's natal ${point}`, '1° 51′');
  }
  await expect(facts.getByRole('heading', {level: 3}).first()).toHaveText('Saturn is touching your Mars');
  await expectConnectionFact(facts, "Saturn in Aries trine Nikki's natal Mercury");
  await expect(facts).toContainText('These natal connections do not by themselves establish a direct Saturn transit to the other chart.');
  const factCopy = await facts.innerText();
  await page.reload();
  await openConnectionFacts(page);
  await expect(facts).toHaveText(factCopy, { useInnerText: true, timeout: 60000 });
  const headings = await facts.locator('h2, h3').allTextContents();
  expect(headings[0]).toEqual('Why this involves Nikki');
  expect(headings[1]).toEqual('Saturn is touching your Mars');
  const factStyles = await facts.locator('.connection-facts__row').first().evaluate(element => {
    const s = getComputedStyle(element), reference = getComputedStyle(document.querySelector('.sky-detail-intro-section p')!);
    return { font: s.fontFamily, size: s.fontSize, line: s.lineHeight, tracking: s.letterSpacing,
      weight: s.fontWeight, expectedFont: reference.fontFamily, expectedSize:reference.fontSize, expectedLine:reference.lineHeight };
  });
  expect(factStyles.font).toBe(factStyles.expectedFont);
  expect(factStyles.size).toBe(factStyles.expectedSize);
  expect(factStyles.weight).toBe('400');
  expect(factStyles.line).toBe(factStyles.expectedLine);
  expect(factStyles.tracking).toBe('normal');
  const headingStyles = await facts.evaluate(element => {
    const title = getComputedStyle(element.querySelector('h2')!);
    const label = getComputedStyle(element.querySelector('h3')!);
    return { titleFont: title.fontFamily, titleSize: title.fontSize,
      articleFont: getComputedStyle(document.querySelector('.sky-detail-page h1')!).fontFamily,
      labelFont: label.fontFamily, labelWeight: label.fontWeight, labelSize: label.fontSize };
  });
  expect(headingStyles.titleFont).toBe(headingStyles.articleFont);
  expect(headingStyles.titleSize).toBe('36px');
  expect(headingStyles.labelFont).toBe(factStyles.font);
  expect(headingStyles.labelWeight).toBe('600');
  expect(headingStyles.labelSize).toBe('22px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/connection-facts-${testInfo.project.name}.png`, fullPage: true, animations: 'disabled' });
  await facts.getByRole('button', { name: 'Close connection details' }).click();
  await page.getByRole('button', { name: 'Close detail', exact: true }).click();
  await expect(active).toBeVisible();
  const personalTitle = activeTitles[0];
  await active.getByRole('button', { name: `Open full entry for ${personalTitle}`, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(personalTitle);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(personalTitle, { timeout: 60000 });

  await page.goto('/#friends?tab=charts&chart=friend-casey&view=transits');
  await expect(page.getByRole('region', { name: 'Short-term themes', exact: true }).getByRole('heading', { level: 3 }).first()).toHaveText(personalTitle.replace("Nikki's", "Casey's"), { timeout: 60000 });
  await expect(page.getByRole('region', { name: 'Between you two', exact: true }).getByRole('heading', { name: "Pluto in Aquarius conjunct Casey's natal Pluto", exact: true })).toBeVisible();
  await page.getByRole('region', { name: 'Between you two', exact: true }).getByRole('button', { name: `Open full entry for ${readerTitle}`, exact: true }).click();
  const switchedFacts = await openConnectionFacts(page, 'Casey');
  await expectConnectionFact(switchedFacts, "Your natal Mars conjunct Casey's natal Saturn", '1° 51′');
  await expect(switchedFacts).not.toContainText('Nikki');
  await expect(page.locator('.sky-detail-page')).not.toContainText('Nikki');
});

test('relationship context separates direct transits from connections through one natal planet', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-10-15T16:00:00Z'));
  await seed(page, testInfo.project.name.endsWith('dark') ? 'dark' : 'light', true, true);
  await page.route('https://tldrastro-api-27165565299.us-central1.run.app/**', route => route.fulfill({ status: 503, body: 'Isolated calculation fallback.' }));
  await isolatedRest(page);
  await page.route('**/api/content-publications', route => route.fulfill({ json: { schema: 'tldr-publications/v1', publications: [] } }));
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([], []) }));
  await page.goto('/#friends?tab=charts&chart=friend-nikki&view=transits');
  const card = page.getByRole('region', { name: 'Between you two', exact: true }).getByRole('button', { name: 'Open full entry for Saturn in Aries trine your natal Mars', exact: true });
  await expect(card).toContainText('This transit may bring your existing Mars connections with Nikki into focus.', { timeout: 60000 });
  await expect(card).toContainText('Direct transits to both charts:');
  await expect(card).toContainText("Other connections through your natal Mars: Nikki's natal Venus.");
  await expect(card).not.toContainText('activating the connections');
  await card.click();
  const facts = await openConnectionFacts(page);
  await expectConnectionFact(facts, "Saturn in Aries trine Nikki's natal Mercury");
  await expectConnectionFact(facts, "Your natal Mars square Nikki's natal Venus", '1° 51′');
  await expect(facts).toContainText('Other connections through your natal Mars:');
  await expect(facts).toContainText('These natal connections do not by themselves establish a direct Saturn transit to the other chart.');
  await expect(facts).not.toContainText("Saturn in Aries square Nikki's natal Venus");
  expect(await facts.getByRole('heading', {level: 3}).allTextContents()).toEqual([
    'Saturn is touching your Mars',
    "Saturn is also touching four of Nikki's natal points",
    'Your Mars already connects to those same four natal points',
    'Other connections through your natal Mars:'
  ]);
  const close = facts.getByRole('button', {name: 'Close connection details'});
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(facts).toHaveCount(0);
  const trigger = page.getByRole('button', {name: 'Why this involves Nikki', exact: true});
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveCSS('border-top-style', 'solid');
  await trigger.press('Enter');
  await expect(facts).toBeVisible();
  await expect(facts.locator('.connection-facts__footer p').last()).toContainText('Saturn in Aries');
  expect(await facts.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  const rowGeometry = await facts.locator('.connection-facts__row').evaluateAll(rows => rows.map(row => {
    const label = row.querySelector('.connection-facts__title')!.getBoundingClientRect();
    const orb = row.querySelector('.connection-facts__orb')!.getBoundingClientRect();
    return {labelRight:label.right, orbLeft:orb.left, orbRight:orb.right};
  }));
  for (const row of rowGeometry) {
    expect(row.labelRight).toBeLessThan(row.orbLeft);
    expect(Math.abs(row.orbRight - rowGeometry[0].orbRight)).toBeLessThan(1);
  }
  const copy = await facts.innerText();
  await page.reload();
  await openConnectionFacts(page);
  await expect(facts).toHaveText(copy, { useInnerText: true, timeout: 60000 });
  await page.screenshot({ path: `test-results/connection-directness-${testInfo.project.name}.png`, fullPage: true, animations: 'disabled' });
  await facts.locator('.connection-facts__footer').scrollIntoViewIfNeeded();
  await expect(facts.locator('.connection-facts__footer p').last()).toBeInViewport();
  await page.screenshot({ path: `test-results/connection-directness-bottom-${testInfo.project.name}.png`, fullPage: true, animations: 'disabled' });
});

for (const [activationLive, bridgeLive] of [[false,false],[true,false],[true,true]]) test(`connection detail separates transit, activation ${activationLive ? 'published' : 'draft'}, bridge ${bridgeLive ? 'published' : 'draft'}`, async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date('2026-10-15T16:00:00Z'));
  await seed(page,testInfo.project.name.endsWith('dark')?'dark':'light');
  await page.route('https://tldrastro-api-27165565299.us-central1.run.app/**', route => route.fulfill({ status:503,body:'Isolated calculation fallback.' }));
  await isolatedRest(page);
  await page.route('**/api/content-publications', route => route.fulfill({json:{schema:'tldr-publications/v1',publications:[]}}));
  let sourceRequests = 0, pendingSources = 0, lastSourceAt = Date.now();
  let phase = 'cold';
  let placementSourceAttempts=0, holdPlacement=false;
  const placementOutcomes=new Map<Request,{outcome:string,status:number|null,failure:string|null}>();
  page.on('requestfinished',async request=>{if(placementOutcomes.has(request))placementOutcomes.set(request,{outcome:'finished',status:(await request.response())?.status()??null,failure:request.failure()?.errorText??null});});
  const releasePlacements: (()=>void)[]=[];
  const heldPlacementAttempts=new Map<string,number>();
  let holdNextSource=false, releaseHeldRead: (()=>void)|undefined, callerAborts=0;
  const cadence: unknown[] = [];
  cadenceLogs.set(page,cadence);
  page.on('requestfailed',request=>{
    if(request.url().includes('/api/content-reader')){
      if(placementOutcomes.has(request))placementOutcomes.set(request,{outcome:'failed',status:null,failure:request.failure()?.errorText??'request failed'});
      cadence.push({event:'failed',phase,at:Date.now(),error:request.failure()?.errorText});
      if(phase.startsWith('held-read-') && request.postDataJSON()?.keys?.some((key:string)=>key.startsWith('authored/connection-activation/'))) callerAborts++;
    }
  });
  const settled = async()=>{
    // Source cadence starts after the retained profile has finished its daily
    // peak/timing work, including navigation beneath an open detail.
    await expect(page.locator('.app-loading[aria-label="Calculating transits for the selected date…"]')).toHaveCount(0, {timeout:60000});
    await expect.poll(()=>pendingSources).toBe(0);
    await expect.poll(()=>Date.now()-lastSourceAt).toBeGreaterThan(500);
    cadence.push({event:'settled',phase,at:Date.now(),sourceRequests});
  };
  const activationKeys = new Set<string>();
  let publicationVersion=10, activationBody='You talk to {{holder1}}. This is the final activation sentence.';
  let rowUpdatedAt='2026-10-15T12:00:00Z';
  await page.route('**/api/content-reader', route => {
    const query=route.request().postDataJSON();
    const keys = query?.keys ?? [];
    if(phase==='placement-error' && (query?.scope?.startsWith('sky') || keys.some((key:string)=>/^(?:sky-|house-horoscope-core\/|fallback-hook\/sky-)/.test(key)))){placementSourceAttempts++;if(holdPlacement){const queryKey=JSON.stringify(query);const attempt=(heldPlacementAttempts.get(queryKey)??0)+1;heldPlacementAttempts.set(queryKey,attempt);if(attempt<3)return route.fulfill({status:503,json:{error:'Transient isolated placement failure'}});placementOutcomes.set(route.request(),{outcome:'pending',status:null,failure:null});return new Promise<void>(resolve=>releasePlacements.push(()=>{void route.fulfill({status:503,json:{error:'Held isolated placement failure'}}).finally(resolve);}));}return route.fulfill({status:503,json:{error:'Isolated placement source failure'}});}
    const sourceRead = keys.some((key:string)=>key.startsWith('authored/connection-activation/'));
    if(sourceRead){sourceRequests++;pendingSources++;lastSourceAt=Date.now();cadence.push({event:'start',phase,at:lastSourceAt,sourceRequests,keys});}
    for (const key of keys) if(key.startsWith('authored/connection-activation/')) activationKeys.add(key);
    const rows: any[] = keys.filter((key:string) => key.startsWith('authored/connection-activation/')).map((key:string) => ({
      id:key,content_key:key,status:activationLive?'LIVE':'DRAFT',lane:'serving',review_state:null,updated_at:rowUpdatedAt,
      surface:'friends',mode:'in_depth',provider:'tldrastro-fallback-architecture-v3',body:activationBody,
      source_snapshot:{contentType:'connection-activation',content_role:'full_copy',review_status:'approved'},
      sections:{packageRecord:{contentKey:key,content_role:'full_copy',review_status:'approved',body_you:activationBody,body_they:'Never substitute this perspective.'}}
    }));
    rows.push(...connectionBridgeTemplates.filter(template=>keys.includes(template.contentKey)).map(template=>({
      id:template.contentKey,content_key:template.contentKey,status:bridgeLive?'LIVE':'DRAFT',lane:'serving',review_state:null,updated_at:'2026-10-15T12:00:00Z',
      surface:'friends',mode:'in_depth',provider:'tldrastro-fallback-architecture-v3',body:template.body,
      source_snapshot:{contentType:'connection-transit-bridge',content_role:'template',review_status:'approved'},
      sections:{packageRecord:{contentKey:template.contentKey,content_role:'template',review_status:'approved',body:template.body}}
    })));
    const publications=rows.map((row:any)=>({content_key:row.content_key,state:'live',revision:row.content_key.startsWith('authored/connection-activation/')?publicationVersion:10,row_id:row.id,row_updated_at:row.updated_at,updated_at:row.updated_at}));
    const send = () => route.fulfill({json:readerResponse(rows,publications)}).finally(()=>{
      if(sourceRead){pendingSources--;lastSourceAt=Date.now();cadence.push({event:'end',phase,at:lastSourceAt,sourceRequests});}
    });
    if(sourceRead && holdNextSource){
      holdNextSource=false;
      return new Promise<void>((resolve,reject)=>{releaseHeldRead=()=>{void send().then(resolve,reject);};});
    }
    return send();
  });
  await page.goto('/#friends?tab=charts&chart=friend-nikki&view=transits');
  const group=page.getByRole('region',{name:'Between you two',exact:true});
  await expect(group).toBeVisible({timeout:60000});
  // Return cards remain in the unchanged bond list but cannot borrow return
  // readings for A. Exercise an authored transit-aspect contact explicitly.
  const unavailable=group.getByRole('button',{name:"Pluto in Aquarius conjunct Nikki's natal Pluto",exact:true});
  await expect(unavailable).toBeDisabled();
  await expect(unavailable.locator('.card-read-more')).toHaveCount(0);
  await expect(unavailable.locator('.updates-aspect-row__title')).toHaveText("Pluto in Aquarius conjunct Nikki's natal Pluto");
  await expect(page.locator('.sky-detail-page h1')).toHaveCount(0);
  const button=group.getByRole('button',{name:'Open full entry for Saturn in Aries trine your natal Mars',exact:true});
  const opening=await button.locator('.updates-aspect-row__description').first().innerText();
  await button.click();
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await expect(page.locator('.sky-detail-intro-section, .sky-detail-section').first()).not.toContainText(opening);
  await expect(page.locator('main')).not.toContainText('{{untilDate}}');
  const disclosure = await openConnectionFacts(page);
  await expectConnectionFact(disclosure, "Your natal Mars conjunct Nikki's natal Saturn", '1° 51′');
  await disclosure.getByRole('button', {name: 'Close connection details'}).click();
  if(activationLive){
    await expect(page.getByText('You talk to Nikki. This is the final activation sentence.',{exact:true}).first()).toBeVisible();
    if(bridgeLive) await expect(page.getByText(/connecting this transit to the pattern below/).first()).toBeVisible();
    else await expect(page.getByText(/connecting this transit to the pattern below/)).toHaveCount(0);
  } else {
    await expect(page.getByText('About these connections',{exact:true})).toHaveCount(0);
    await expect(page.getByText(/connecting this transit to the pattern below/)).toHaveCount(0);
  }
  await page.screenshot({path:`test-results/connection-transit-${activationLive?'published':'draft'}-bridge-${bridgeLive?'published':'draft'}-${testInfo.project.name}.png`,fullPage:true,animations:'disabled'});
  const hiddenOwner=page.locator('div[hidden][inert]').filter({has:page.locator('.friends-layout')}).last();
  await expect(hiddenOwner).toHaveCount(1);
  await expect(hiddenOwner).toBeHidden();
  expect(await hiddenOwner.evaluate(el=>el.contains(document.activeElement))).toBe(false);
  const unrelated = {content_key:'test/connection-unrelated',state:'live',revision:700,row_id:null,row_updated_at:null,updated_at:'2026-10-15T12:00:00Z'};
  const install = (records: unknown[]) => page.evaluate(({records,phase}) => {
    (window as any).__connectionCadencePhase=phase;
    return window.dispatchEvent(new StorageEvent('storage', {key:'tldrastro:content-publications:v1',newValue:JSON.stringify(records)}));
  },{records,phase});
  const detailUrl=page.url();
  if(activationLive && bridgeLive && testInfo.project.name==='390-dark'){
    const sourceA=page.locator('.sky-detail-intro-section, .sky-detail-section').first();
    const completeA=await sourceA.innerText();
    await page.getByRole('button',{name:'Close detail',exact:true}).click();
    await expect(button).toBeVisible();
    const titles=await group.locator('.updates-aspect-row__title').allTextContents();
    const paragraphs=await group.locator('p').allTextContents();
    const key='authored/transit-aspect/saturn/mars/soft';
    await install([{...unrelated,content_key:key,state:'retired',revision:901,row_id:null,row_updated_at:null}]);
    const retired=group.getByRole('button',{name:'Saturn in Aries trine your natal Mars',exact:true});
    await expect(retired).toBeDisabled();await expect(retired.locator('.card-read-more')).toHaveCount(0);
    expect(await group.locator('.updates-aspect-row__title').allTextContents()).toEqual(titles);
    expect(await group.locator('p').allTextContents()).toEqual(paragraphs);
    await install([{...unrelated,content_key:key,state:'live',revision:902,row_id:null,row_updated_at:null}]);
    await expect(button).toBeEnabled();
    expect(await group.locator('.updates-aspect-row__title').allTextContents()).toEqual(titles);
    expect(await group.locator('p').allTextContents()).toEqual(paragraphs);
    await button.click();await expect(page.getByRole('heading',{level:1})).toHaveText('Saturn in Aries trine your natal Mars');
    await expect(sourceA).toHaveText(completeA,{useInnerText:true});
  }
  if(activationLive && bridgeLive){
    await page.getByRole('button',{name:'Close detail',exact:true}).click();
    const edit=page.getByRole('button',{name:'Edit Nikki',exact:true});
    await expect(edit).toBeVisible();
    await edit.focus();
    await edit.click();
    const name=page.getByRole('dialog').getByRole('textbox',{name:'Name',exact:true});
    await name.fill('Nikki unsaved draft');
    await name.focus();
    await page.goto(detailUrl);
    await expect(page.getByRole('heading',{level:1})).toHaveText('Saturn in Aries trine your natal Mars');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(()=>document.body.classList.contains('modal-open'))).toBe(false);
    await page.getByRole('button',{name:'Close detail',exact:true}).click();
    await expect(name).toBeVisible();
    await expect(name).toHaveValue('Nikki unsaved draft');
    await expect(name).toBeFocused();
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
    await expect(edit).toBeFocused();
    const tabs=page.getByRole('tablist',{name:'Chart profile sections',exact:true});
    await expect(tabs.getByRole('tab')).toHaveText(testInfo.project.name.startsWith('390')?['Compatibility','Transits','Natal']:['Compatibility','Transits','Natal','Synastry','Composite']);
    await tabs.getByRole('tab',{name:'Transits',exact:true}).focus();
    await page.goto(detailUrl);
    await expect(page.getByRole('heading',{level:1})).toBeVisible();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.getByRole('button',{name:'Close detail',exact:true}).click();
    await expect(tabs).toBeVisible();
    if(testInfo.project.name.startsWith('390')){
      await tabs.getByRole('button',{name:'More, 2 sections',exact:true}).click();
      const menu=page.getByRole('menu',{name:'More chart profile sections',exact:true});
      await expect(menu.getByRole('menuitemradio')).toHaveText([/Synastry/,/Composite/]);
      await tabs.getByRole('button',{name:'More, 2 sections',exact:true}).click();
    }else{
      await expect(tabs.getByRole('tab',{name:'Synastry',exact:true})).toBeVisible();
      await expect(tabs.getByRole('tab',{name:'Composite',exact:true})).toBeVisible();
    }
    await page.goto(detailUrl);
    await expect(page.getByRole('heading',{level:1})).toBeVisible();
  }

  phase='reload';
  await page.reload();
  await expect(page.getByRole('heading',{level:1})).toBeVisible({timeout:60000});
  expect(page.url()).toBe(detailUrl);
  // Real publication events: unchanged ledgers cannot trigger another source
  // read, while a newer unrelated publication retains this complete detail.
  await settled();
  const aBody=page.locator('.sky-detail-intro-section, .sky-detail-section').first();
  const completeABody=await aBody.innerText();
  await settled();
  const beforeRequests = sourceRequests;
  phase='unrelated-new';
  cadence.push({event:'install',phase,at:Date.now(),sourceRequests});
  await install([unrelated]);
  await expect.poll(()=>sourceRequests).toBe(beforeRequests+1);
  await settled();
  expect(sourceRequests).toBe(beforeRequests+1);
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  phase='unchanged-ledger';
  cadence.push({event:'install',phase,at:Date.now(),sourceRequests});
  await install([unrelated]);
  await settled();
  expect(sourceRequests).toBe(beforeRequests+1);
  phase='explicit-refresh';
  const beforeRefresh=sourceRequests;
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('tldrastro:content-update',{detail:{contentKey:'*',published:false,updatedAt:'2026-10-15T12:30:00Z'}})));
  await expect.poll(()=>sourceRequests).toBe(beforeRefresh+1);
  await settled();
  expect(sourceRequests).toBe(beforeRefresh+1);
  phase='held-read-chart-change';
  holdNextSource=true;
  releaseHeldRead=undefined;
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('tldrastro:content-update',{detail:{contentKey:'*',published:false,updatedAt:'2026-10-15T12:30:30Z'}})));
  await expect.poll(()=>Boolean(releaseHeldRead)).toBe(true);
  await page.goto('/#friends?tab=charts&chart=friend-casey&view=transits');
  await expect(page.getByRole('region',{name:'Casey chart profile',exact:true})).toBeVisible();
  await expect(page.getByText('You talk to Nikki. This is the final activation sentence.',{exact:true})).toHaveCount(0);
  releaseHeldRead!();
  await settled();
  await page.getByRole('region',{name:'Between you two',exact:true}).getByRole('button',{name:'Open full entry for Saturn in Aries trine your natal Mars',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Saturn in Aries trine your natal Mars');
  if(activationLive) await expect(page.getByText('You talk to Casey. This is the final activation sentence.',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('You talk to Nikki. This is the final activation sentence.',{exact:true})).toHaveCount(0);
  await page.goto(detailUrl);
  await expect(page.getByRole('button',{name:'Why this involves Nikki',exact:true})).toBeVisible();
  if(activationLive) await expect(page.getByText('You talk to Nikki. This is the final activation sentence.',{exact:true}).first()).toBeVisible();
  await settled();
  releaseHeldRead=undefined;
  callerAborts=0;
  if(activationLive){
    const beforeReplacement=sourceRequests;
    phase='activation-replacement';
    publicationVersion=702;
    rowUpdatedAt='2026-10-15T12:00:01Z';
    activationBody='You talk to {{holder1}}. The revised final sentence stays complete.';
    await install([...activationKeys].map(content_key=>({...unrelated,content_key,revision:publicationVersion,row_id:content_key,row_updated_at:rowUpdatedAt})));
    await expect(page.getByText('You talk to Nikki. The revised final sentence stays complete.',{exact:true}).first()).toBeVisible();
    await expect(page.getByText('You talk to Nikki. This is the final activation sentence.',{exact:true})).toHaveCount(0);
    await settled();
    expect(sourceRequests).toBe(beforeReplacement+1);
    await expect(aBody).toHaveText(completeABody);
    phase='bridge-retirement';
    const beforeBridgeRetirement=sourceRequests;
    await install(connectionBridgeTemplates.map(template=>({...unrelated,content_key:template.contentKey,state:'retired',revision:707})));
    await expect(page.getByText(/connecting this transit to the pattern below/)).toHaveCount(0);
    await expect(page.getByText('You talk to Nikki. The revised final sentence stays complete.',{exact:true}).first()).toBeVisible();
    await settled();
    expect(sourceRequests).toBe(beforeBridgeRetirement+1);
    phase='activation-retirement';
    await install([...activationKeys].map(content_key=>({...unrelated,content_key,state:'retired',revision:708})));
    await expect(page.getByText('About these connections',{exact:true})).toHaveCount(0);
    await expect(page.getByText(/connecting this transit to the pattern below/)).toHaveCount(0);
    await expect(page.getByRole('heading',{level:1})).toBeVisible();
    await expect(aBody).toHaveText(completeABody);
  }
  await settled();
  phase='held-read-unmount';
  holdNextSource=true;
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('tldrastro:content-update',{detail:{contentKey:'*',published:false,updatedAt:'2026-10-15T12:31:00Z'}})));
  await expect.poll(()=>Boolean(releaseHeldRead)).toBe(true);
  await page.goto('/#sky');
  await expect.poll(()=>callerAborts).toBe(1);
  releaseHeldRead!();
  await expect(page.getByText('You talk to Nikki. The revised final sentence stays complete.',{exact:true})).toHaveCount(0);
  if(activationLive && bridgeLive){
    phase='placement-error';
    await page.route('**/content-studio-last-known-good.json',route=>route.fulfill({json:{schema:'content-studio-last-known-good-v2',rows:[],publications:[],rowCount:0}}));
    await install([{...unrelated,content_key:'sky-placement/article/sun/libra',revision:800,row_id:'isolated-unavailable-sky-row',row_updated_at:'2026-10-15T12:00:00Z'}]);
    await expect.poll(()=>placementSourceAttempts,{timeout:30000}).toBeGreaterThan(0);
    await expect(page.getByText('The placement readings could not load. Please try again.',{exact:true})).toBeVisible({timeout:30000});
    await page.goto(detailUrl);
    const notice=page.getByRole('status').filter({hasText:'The full placement reading could not load. Approved available copy remains below.'});
    await expect(notice).toBeVisible({timeout:30000});
    await expect(aBody).toHaveText(completeABody);
    const beforeRetry=placementSourceAttempts;
    await notice.getByRole('button',{name:'Retry',exact:true}).click();
    await expect.poll(()=>placementSourceAttempts,{timeout:30000}).toBeGreaterThan(beforeRetry);
    await expect(page.getByRole('heading',{level:1})).toHaveText('Saturn in Aries trine your natal Mars');
    if(testInfo.project.name==='390-dark'){
      await expect(notice).toBeVisible({timeout:30000});
      holdPlacement=true;
      const beforeHeldRetry=placementSourceAttempts;
      await notice.getByRole('button',{name:'Retry',exact:true}).click();
      await expect.poll(()=>releasePlacements.length).toBe(2);
      expect([...heldPlacementAttempts.keys()].map(key=>JSON.parse(key)).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))).toEqual([
        {ids:['isolated-unavailable-sky-row'],keys:['sky-placement/article/sun/libra']},
        {provider:'tldrastro-fallback-architecture-v3',scope:'sky-list'}
      ].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
      await page.goto('/#friends?tab=charts&chart=friend-casey&view=transits');
      try {
        await expect(page.getByRole('region',{name:'Casey chart profile',exact:true})).toBeVisible();
        expect(placementOutcomes.size).toBe(releasePlacements.length);
        expect([...heldPlacementAttempts.values()]).toEqual(Array.from({length:releasePlacements.length},()=>3));
      } finally { for(const release of releasePlacements) release(); }
      await expect.poll(()=>[...placementOutcomes.values()]).toEqual(Array.from({length:releasePlacements.length},()=>({outcome:'finished',status:503,failure:null})));
      await expect(page.getByRole('region',{name:'Casey chart profile',exact:true})).toBeVisible();
      await expect(page.locator('.sky-detail-page h1')).toHaveCount(0);
      await expect(notice).toHaveCount(0);
      await expect(page.getByText('You talk to Nikki. The revised final sentence stays complete.',{exact:true})).toHaveCount(0);
      await page.waitForTimeout(750);
      expect(placementSourceAttempts).toBe(beforeHeldRetry+3*releasePlacements.length);
      expect([...heldPlacementAttempts.values()]).toEqual(Array.from({length:releasePlacements.length},()=>3));
      await expect(page.getByRole('region',{name:'Casey chart profile',exact:true})).toBeVisible();
      await expect(page.locator('.sky-detail-page h1')).toHaveCount(0);
      await expect(notice).toHaveCount(0);
      await expect(page.getByText('You talk to Nikki. The revised final sentence stays complete.',{exact:true})).toHaveCount(0);
      cadence.push({event:'late-placement-failure',requests:[...placementOutcomes].map(([request,result])=>({query:request.postDataJSON(),...result}))});
    }
  }
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
  const activationSource='authored/connection-activation/ascendant/square/saturn';
  const draftModule=/\/(?:admin-source-drafts|connectionTransitSources|studioSourceDraft)-[^/]+\.js$/;
  const moduleReads:Request[]=[];
  const outcomes=new Map<Request,{outcome:'pending'|'finished'|'failed';status:number|null;failure:string|null}>();
  let holdSource=false,sourceStarted=false,releaseSource=()=>{},heldSource:Request|null=null;
  const exactSource=(url:string)=>new URL(url).searchParams.get('contentKey')===activationSource;
  page.on('request',request=>{
    if(draftModule.test(request.url()))moduleReads.push(request);
    if(draftModule.test(request.url())||exactSource(request.url()))outcomes.set(request,{outcome:'pending',status:null,failure:null});
    if(holdSource&&request.method()==='GET'&&exactSource(request.url()))heldSource=request;
  });
  page.on('requestfinished',async request=>{if(outcomes.has(request))outcomes.set(request,{outcome:'finished',status:(await request.response())?.status()??null,failure:request.failure()?.errorText??null});});
  page.on('requestfailed',request=>{if(outcomes.has(request))outcomes.set(request,{outcome:'failed',status:null,failure:request.failure()?.errorText??'request failed'});});
  const successful=async(request:Request)=>{
    await expect.poll(()=>outcomes.get(request)?.outcome).not.toBe('pending');
    expect(outcomes.get(request)).toEqual({outcome:'finished',status:200,failure:null});
  };
  await routeStudioInventoryApi(page,{call:async message=>{
    if(holdSource&&message.method==='GET'&&exactSource(new URL(message.url??'','http://fixture').href)){
      sourceStarted=true;await new Promise<void>(resolve=>{releaseSource=resolve;});
    }
    return call(message);
  },actualDocumentRoute:true});
  await page.goto('/admin/content#connection-transits');
  await expect(page.getByRole('region',{name:'Connection transit sources',exact:true})).toBeVisible();
  let releaseDraftModule=()=>{};
  const prefetched=[...moduleReads];
  const expectedMode=process.env.STUDIO_DRAFT_TRANSPORT_MODE??'late-cold-module';
  const proofKind=prefetched.length?'prefetched-module-and-late-exact-source':'late-cold-module';
  expect(proofKind).toBe(expectedMode);
  if(expectedMode==='prefetched-module-and-late-exact-source'){
    // Standalone Admin may have already loaded this shared factory chunk.
    // Prove that successful prefetch, then exercise the complementary late GET.
    for(const request of prefetched)await successful(request);
    holdSource=true;
    await page.getByRole('button',{name:'Open activation draft',exact:true}).click();
    await expect.poll(()=>sourceStarted).toBe(true);
  }else{
    // The cold production-web path proves late module completion itself.
    let draftModuleStarted=false;
    await page.route(draftModule,async route=>{
      draftModuleStarted=true;const response=await route.fetch();
      await new Promise<void>(resolve=>{releaseDraftModule=resolve;});
      await route.fulfill({response});
    });
    await page.getByRole('button',{name:'Open activation draft',exact:true}).click();
    await expect.poll(()=>draftModuleStarted).toBe(true);
  }
  await page.evaluate(()=>{window.location.hash='connection';});
  await expect(page.getByLabel('CONTENT_GENERATION_SECRET',{exact:true})).toBeVisible();
  if(expectedMode==='prefetched-module-and-late-exact-source'){
    holdSource=false;releaseSource();expect(heldSource).not.toBeNull();await successful(heldSource!);
  }else{
    const completedModule=page.waitForEvent('requestfinished',request=>draftModule.test(request.url()));
    releaseDraftModule();const moduleRequest=await completedModule;await successful(moduleRequest);
    await page.unroute(draftModule);
  }
  await expect(page.getByRole('button',{name:'Check Access',exact:true})).toBeEnabled();
  await expect(page).toHaveURL(/#connection$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await call({method:'rows'})).toEqual([]);
  await testInfo.attach('studio-late-completion-proof',{contentType:'application/json',body:JSON.stringify({kind:proofKind,expectedMode,moduleResponses:moduleReads.map(request=>outcomes.get(request)),sourceResponse:heldSource?outcomes.get(heldSource):null})});
  await page.evaluate(()=>{window.location.hash='connection-transits';});
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


for (const heldStage of ['prepare', 'edition-fetch'] as const) for (const targetChange of ['route', 'date', 'location'] as const) test(heldStage === 'prepare' ? `recovery v3 rejects late prepare success after ${targetChange} change` : `Sky-list edition await rejects late success after ${targetChange} change`, async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date('2026-10-15T16:00:00Z'));
  await seed(page, testInfo.project.name.endsWith('dark') ? 'dark' : 'light');
  const { compileSkyArticleEdition } = await import('../../apps/web/src/content/skyArticleTemplateCompiler');
  const { skyIngressEssayFields } = await import('../../apps/web/src/content/skyIngressEssay.mjs');
  const slots = Object.fromEntries(skyIngressEssayFields.map(({ name }) => [name, `Synthetic ${name}.`]));
  Object.assign(slots, { articleTitle: 'Synthetic recovery edition', when: 'Synthetic calculated field.',
    overviewHeading: 'Overview', overviewBody: 'Synthetic recovery opening. Synthetic recovery final sentence.',
    majorTransitSections: '## Synthetic transit\n\nSynthetic complete transit.', priorOccurrenceSection: '', otherDatesSection: '',
    closingHeading: 'Synthetic close', closingBody: 'Synthetic recovery closing sentence.' });
  const edition = await compileSkyArticleEdition({ format: 'ingress-essay-v2', planet: 'sun', sign: 'libra', entryYear: 2026,
    validFrom: '2026-09-22', validTo: '2026-10-23', transitStartInstant: '2026-09-23T00:05:14Z', transitEndInstant: '2026-10-23T09:37:57Z',
    referenceTimeZone: 'America/New_York', templateKey: 'sky/article-template/sun/libra', templateBody: '',
    tldr: 'Synthetic recovery summary.', slotValues: slots, housePassages: [] });
  const row = { id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', content_key: edition.contentKey, surface: 'sky', mode: 'article',
    status: 'LIVE', lane: 'serving', review_state: null, event_type: 'sky-article-edition', block_type: 'sky_article',
    updated_at: '2026-10-15T00:00:00Z', headline: edition.headline, body: edition.body, summary: edition.tldr,
    sections: { skyArticleEdition: edition }, source_snapshot: { ownerApproval: {
      approved: true, action: 'approve-sky-article-edition', contentKey: edition.contentKey, templateKey: edition.templateKey,
      templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash } } };
  const publications = [{ content_key: row.content_key, state: 'live', revision: 801, row_id: row.id,
    row_updated_at: row.updated_at, updated_at: row.updated_at }];
  await page.route('https://tldrastro-api-27165565299.us-central1.run.app/**', route => route.fulfill({ status: 503, body: 'Isolated calculation fallback.' }));
  await isolatedRest(page);
  await page.route('**/api/content-publications', route => route.fulfill({ json: { schema: 'tldr-publications/v1', publications: phase === 'initial' ? [] : publications } }));
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: { schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 } }));
  let phase: 'initial' | 'fail' | 'retry' | 'changed' | 'released' | 'returning-sky' | 'returned' = 'initial';
  await page.route('**/rest/v1/content_publications?**', route => {
    const filters = new URL(route.request().url()).searchParams.getAll('content_key');
    const rows = phase === 'initial' ? [] : publications.filter(row => filters.every(filter =>
      filter.startsWith('gte.') ? row.content_key >= filter.slice(4) :
      filter.startsWith('lt.') ? row.content_key < filter.slice(3) :
      filter.startsWith('gt.') ? row.content_key > filter.slice(3) : true));
    return route.fulfill({ json: rows });
  });
  const log: { phase: string; query: any; exactEdition: boolean; skyRead: boolean; url: string }[] = [];
  type HeldRead = { query: string; outcome: 'pending' | 'finished' | 'failed'; status: number | null; failure: string | null };
  const heldRequests = new Map<Request, HeldRead>();
  const normalized = (query: any) => JSON.stringify(Object.fromEntries(Object.entries({ ...query, ...(query.keys ? { keys: [...new Set(query.keys)].sort() } : {}) }).sort(([a], [b]) => a.localeCompare(b))));
  const returnRequests = new Map<Request, HeldRead>();
  const recordFor = (request: Request) => heldRequests.get(request) ?? returnRequests.get(request);
  page.on('requestfinished', async request => {
    const read = recordFor(request);
    if (!read) return;
    const response = await request.response();
    read.status = response?.status() ?? null;
    read.outcome = 'finished';
  });
  page.on('requestfailed', request => {
    const read = recordFor(request);
    if (!read) return;
    read.failure = request.failure()?.errorText ?? 'Unknown transport failure';
    read.outcome = 'failed';
  });
  const pendingRead = (query: any): HeldRead => ({ query: normalized(query), outcome: 'pending', status: null, failure: null });
  const requireSuccessfulCompletion = async (reads: Map<Request, HeldRead>, attachment: string) => {
    try {
      await expect.poll(() => reads.size > 0 && [...reads.values()].every(read => read.outcome !== 'pending'), { timeout: 8000 }).toBe(true);
      for (const read of reads.values()) {
        expect(read.outcome, JSON.stringify(read)).toBe('finished');
        expect(read.status, JSON.stringify(read)).toBe(200);
        expect(read.failure, JSON.stringify(read)).toBeNull();
      }
    } finally {
      await testInfo.attach(attachment, { body: JSON.stringify({ heldStage, targetChange, requests: [...reads.values()] }), contentType: 'application/json' });
    }
  };
  cadenceLogs.set(page, log);
  const releases: (() => Promise<void>)[] = [];
  const returnReleases: (() => Promise<void>)[] = [];
  await page.route('**/api/content-reader', async route => {
    const query = route.request().postDataJSON();
    const keys: string[] = query.keys ?? [];
    const exactEdition = keys.length === 1 && keys[0] === row.content_key;
    const skyRead = query.scope?.startsWith('sky') || keys.some(key => /^(?:sky-|house-horoscope-core\/|fallback-hook\/sky-)/.test(key));
    log.push({ phase, query, exactEdition, skyRead, url: page.url() });
    if (phase === 'fail' && (skyRead || exactEdition)) return route.fulfill({ status: 503, json: { error: 'Synthetic recovery failure.' } });
    const send = () => route.fulfill({ json: readerResponse(keys.includes(row.content_key) ? [row] : [], phase === 'initial' ? [] : publications) });
    if (phase === 'retry' && (heldStage === 'edition-fetch' ? exactEdition : skyRead && !exactEdition)) {
      heldRequests.set(route.request(), pendingRead(query));
      await new Promise<void>((resolve, reject) => releases.push(() => send().then(resolve, reject)));
      return;
    }
    if (phase === 'returning-sky' && exactEdition) {
      returnRequests.set(route.request(), pendingRead(query));
      await new Promise<void>((resolve, reject) => returnReleases.push(() => send().then(resolve, reject)));
      return;
    }
    await send();
  });
  await page.goto('/#friends?tab=charts&chart=friend-nikki&view=transits');
  await page.getByRole('region', { name: 'Between you two', exact: true }).getByRole('button', { name: 'Open full entry for Saturn in Aries trine your natal Mars', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Saturn in Aries trine your natal Mars');
  const instanceToken = await page.evaluate(() => {
    const token = crypto.randomUUID();
    (window as any).__recoveryRetainedInstance = token;
    return token;
  });
  const assertRetained = async () => expect(await page.evaluate(() => (window as any).__recoveryRetainedInstance)).toBe(instanceToken);
  const primary = page.getByRole('navigation', { name: 'Primary navigation', exact: true });
  const closeDetail = async () => {
    const close = page.getByRole('button', { name: 'Close detail', exact: true });
    if (await close.isVisible()) {
      await close.click();
      await expect(close).toBeHidden();
    }
  };
  const navigate = async (name: 'Sky' | 'Friends') => {
    await closeDetail();
    const picker=page.getByRole('dialog',{name:/^(Date and location|Transit date)$/});
    if(await picker.isVisible())await page.keyboard.press('Escape');
    const button = primary.getByRole('button', { name, exact: true });
    if (await button.isVisible()) await button.click();
    else {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.getByRole('menu', { name: 'Site menu', exact: true }).getByRole('menuitem', { name, exact: true }).click();
    }
    await assertRetained();
  };
  const openChart = async (name: string) => {
    await navigate('Friends');
    const charts = page.getByRole('tablist', { name: 'Friends views', exact: true }).getByRole('tab', { name: /^Charts(?:\s|$)/ });
    await expect(charts).toBeVisible();
    if (await charts.getAttribute('aria-selected') !== 'true') await charts.click();
    await expect(charts).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('button', { name: `Open ${name}`, exact: true }).click();
    await page.getByRole('tab', { name: 'Transits', exact: true }).click();
    await expect(page.getByRole('region', { name: `${name} chart profile`, exact: true }).getByRole('region', { name: 'Between you two', exact: true })).toBeVisible();
    await assertRetained();
  };
  const aBody = page.locator('.sky-detail-intro-section, .sky-detail-section').first();
  const completeA = await aBody.innerText();
  await navigate('Sky');
  await assertRetained();
  await expect(page.getByRole('list', { name: 'Daily planetary placements' }).getByRole('button', { name: 'Read more about Sun in Libra', exact: true })).toBeVisible({ timeout: 30000 });
  phase = 'fail';
  await page.evaluate(records => window.dispatchEvent(new StorageEvent('storage', {
    key: 'tldrastro:content-publications:v1', newValue: JSON.stringify(records)
  })), publications);
  await expect(page.getByRole('alert').filter({ hasText: 'The placement readings could not load. Please try again.' })).toBeVisible({ timeout: 30000 });
  const notice = page.getByRole('status').filter({ hasText: 'The full placement reading could not load. Approved available copy remains below.' });
  if (heldStage === 'prepare') {
    await openChart('Nikki');
    // Friends retries the captured preparation scope. Its authored transit
    // consumer does not await the unrelated Sky season edition.
    await page.getByRole('region', { name: 'Between you two', exact: true }).getByRole('button', { name: 'Open full entry for Saturn in Aries trine your natal Mars', exact: true }).click();
    await expect(notice).toBeVisible();
    phase = 'retry';
    await notice.getByRole('button', { name: 'Retry', exact: true }).click();
  } else {
    // The ordinary list is the actual owner of its required edition await.
    const listError = page.locator('.load-error').filter({ hasText: 'The placement readings could not load. Please try again.' });
    phase = 'retry';
    await listError.getByRole('button', { name: 'Try again', exact: true }).click();
  }
  let currentCaseyCopy = '';
  const caseyProfile = page.getByRole('region', { name: 'Casey chart profile', exact: true });
  try {
    // Fail if the intended stage never starts; a test that merely navigates away
    // before preparation or edition fetching cannot cover its continuation guard.
    await expect.poll(() => releases.length, { timeout: 30000 }).toBeGreaterThan(0);
    if (heldStage === 'prepare') {
      const originalQueries = new Set(log.filter(read => read.phase === 'fail' && read.skyRead && !read.exactEdition && new URL(read.url).hash.startsWith('#sky')).map(read => normalized(read.query)));
      const expectedSet = [...originalQueries].sort();
      expect(expectedSet.length).toBeGreaterThan(0);
      await expect.poll(() => [...new Set([...heldRequests.values()].map(read => read.query))].sort(), { timeout: 8000 }).toEqual(expectedSet);
    }
    await assertRetained();
    await testInfo.attach('held-recovery-proof', { body: JSON.stringify({ heldStage, targetChange, instanceToken, requests: [...heldRequests.values()] }), contentType: 'application/json' });
    phase = 'changed';
    // Detail hides the date/location controls. Close it through its real control
    // before changing target; this covers the supported user journey, including
    // its route cancellation, rather than claiming an isolated target-only race.
    if (targetChange !== 'route') {
      await closeDetail();
      if (targetChange === 'date') {
        if (heldStage === 'prepare') await page.getByRole('button', { name: /^Pick Date\. Viewing transits/ }).click();
        else {
          await page.locator('.sky-header-date-button').click();
          await page.getByRole('dialog', {name:/^(Date and location|Transit date)$/}).getByRole('tab', { name: 'Date', exact: true }).click();
        }
        const picker=page.getByRole('dialog', {name:/^(Date and location|Transit date)$/});
        if(heldStage==='prepare') await picker.getByRole('tab',{name:'Date',exact:true}).click();
        await picker.getByRole('gridcell', { name: 'Friday, October 16, 2026', exact: true }).click();
        await picker.getByRole('button',{name:'Show Oct 16',exact:true}).click();
        if (heldStage === 'prepare') await expect(page.getByRole('button', { name: /^Pick Date\. Viewing transits/ })).toHaveAttribute('aria-label', /Fri, Oct 16/);
        else await expect(page.locator('.sky-header-date-button')).toHaveAttribute('aria-label', /^Tomorrow,/);
        expect(new URL(page.url()).searchParams.get('date')).toBe('2026-10-16');
      } else {
        // Sky is the product surface exposing location controls.
        await navigate('Sky');
        await assertRetained();
        await page.locator('.sky-header-date-button').click();
        const controls = page.getByRole('dialog', {name:/^(Date and location|Transit date)$/});
        await controls.locator('.mobile-sky-controls__location').click();
        const city = controls.getByRole('textbox', { name: 'City', exact: true });
        await city.fill('Synthetic Recovery City');
        await city.press('Enter');
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tldrastro:selectedLocation') ?? 'null')?.label)).toBe('Synthetic Recovery City');
      }
    }
    await openChart('Casey');
    // The chart rail is lazy. Capture the retained profile only after its real
    // wheel mounts, so late chart code is not mistaken for recovery mutation.
    const caseyWheel = caseyProfile.getByRole('img', { name: 'Planet positions', exact: true });
    await expect(caseyWheel).toBeVisible();
    await expect(caseyWheel.locator('.house-labels > text')).toHaveCount(12);
    currentCaseyCopy = await caseyProfile.innerText();
  } finally {
    phase = 'released';
    await Promise.all(releases.map(release => release()));
  }
  await requireSuccessfulCompletion(heldRequests, 'released-recovery-transport-proof');
  // Successful transport completion precedes promise continuations and React paint.
  // Two animation frames cover the immediate continuation/render turn only;
  // this is not proof that every shared cache consumer has finished its work.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await assertRetained();
  await expect(caseyProfile).toBeVisible();
  expect(await caseyProfile.innerText()).toBe(currentCaseyCopy);
  const heldQuerySet = new Set([...heldRequests.values()].map(request => request.query));
  expect(log.filter(read => read.phase === 'released' && heldQuerySet.has(normalized(read.query)))).toHaveLength(0);
  await expect(page.locator('.sky-detail-page h1')).toHaveCount(0);
  await expect(notice).toHaveCount(0);
  await expect(page.getByText('Synthetic recovery opening. Synthetic recovery final sentence.', { exact: true })).toHaveCount(0);
  await openChart('Nikki');
  await page.getByRole('region', { name: 'Between you two', exact: true }).getByRole('button', { name: 'Open full entry for Saturn in Aries trine your natal Mars', exact: true }).click();
  if (targetChange === 'route') await expect(aBody).toHaveText(completeA);
  else await expect(aBody).toBeVisible();
  if (heldStage === 'edition-fetch' && targetChange === 'route') {
    phase = 'returning-sky';
    try {
      await navigate('Sky');
      await expect.poll(() => returnRequests.size, { timeout: 30000 }).toBeGreaterThan(0);
      const list = page.getByRole('region', {name:'Planets',exact:true}).getByRole('list', { name: 'Daily planetary placements', exact: true });
      await expect(list).toHaveAttribute('aria-busy', 'true');
      await expect(list.getByRole('button', { name: 'Read more about Sun in Libra', exact: true })).toHaveCount(0);
      await assertRetained();
      await testInfo.attach('returned-sky-required-edition-held', { body: JSON.stringify({ instanceToken, requiredKey: row.content_key, requests: returnRequests.size }), contentType: 'application/json' });
    } finally {
      phase = 'returned';
      await Promise.all(returnReleases.map(release => release()));
    }
    await requireSuccessfulCompletion(returnRequests, 'returned-sky-transport-proof');
    const list = page.getByRole('region', {name:'Planets',exact:true}).getByRole('list', { name: 'Daily planetary placements', exact: true });
    await expect(list).toHaveAttribute('aria-busy', 'false');
    await list.getByRole('button', { name: 'Read more about Sun in Libra', exact: true }).click();
    await expect(page.getByText('Synthetic recovery opening. Synthetic recovery final sentence.', { exact: true })).toBeVisible();
    await assertRetained();
  }
});
