import { location, now, fixtureProfile, seed, authenticate, patternPreview, insightPreview, patternInsightFixtures, inspectMemberSourceFailures, withFinishedSocialReads } from '../helpers/synthetic-member-sources';
import { expect, syntheticMemberTest, test, type Page } from '../helpers/polish-test';
import { expectReadableTheme, expectRenderedTextContrast } from '../helpers/theme-contrast';
import { bundledPublications } from '../helpers/bundled-publications';
import { getAstrodienstSky } from '../../apps/web/src/services/ephemeris';
import { zonedDateTimeToUtc } from '../../apps/web/src/services/timezones';
import { natalSkySnapshotCacheKey, VERIFIED_SKY_CACHE_SCHEMA } from '../../apps/web/src/services/verifiedSkyCache';
import { emptyHoroscopeEdition, horoscopeEditionKey, horoscopeEditionBody } from '../../apps/web/src/content/horoscopeEditions.mjs';
import { READER_ROW_SCHEMA } from '../../apps/web/src/content/readerRowSchema.mjs';
import { readerResponse } from '../helpers/reader-response';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';
import retrogradeCycleCopy from '../../apps/web/src/content/retrogradeCycleNarratives.json' with {type:'json'};

async function showRelationshipOutlooks(page: Page) {
  await expect(page.getByRole('region',{name:'Friction and flow',exact:true})).toBeVisible({timeout:60_000});
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Placement article polish ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1100 });
    await seed(page, theme); await authenticate(page);
    for (const placement of ['pluto/aquarius', 'venus/scorpio']) {
      const url = `/?date=2026-10-13#sky/placement/${placement}`;
      await page.goto(url);
      const cards = page.locator('.article-related-aspects-card');
      await expect(cards.first()).toBeVisible({ timeout: 60_000 });
      await page.evaluate(async () => { await document.fonts.ready; });
      const first = cards.first();
      await expect(first).toHaveCSS('padding', width < 800 ? '32px 24px 28px' : '40px 32px 32px');
      await expect(first).toHaveCSS('border-radius', '32px');
      const label = page.locator('.article-related-aspects__label--outside').first();
      await expect(label).toHaveText('Gifts');
      await expect(label).toHaveCSS('font-family', /system-ui/);
      await expect(label).toHaveCSS('font-size', width < 800 ? '20px' : '22px');
      await expect(label).toHaveCSS('text-transform', 'none');
      const summary = page.locator('.sky-placement-key-dates > summary');
      await expect(summary).toHaveCSS('font-size', '26px');
      await expect(summary).toHaveCSS('line-height', '29.9px');
      await expect(summary).toHaveCSS('align-items', 'baseline');
      await expect(page.locator('.sky-placement-key-dates')).not.toHaveAttribute('open', '');
      const row = first.locator('.article-related-aspects__copy').first();
      const badge = row.locator('.aspect-badge').first();
      const align = await badge.evaluate(node => {
        const r = document.createRange(); r.selectNodeContents(node);
        const glyph = r.getBoundingClientRect(), circle = node.getBoundingClientRect();
        return Math.abs(glyph.x + glyph.width / 2 - circle.x - circle.width / 2);
      });
      expect(align).toBeLessThan(1);
      await expect(row).toHaveCSS('padding', '0px');
      await expect(row.locator('.article-related-aspects__date').first()).toHaveCSS('font-family', /system-ui/);
      await expect(row.locator('.article-related-aspects__date').first()).toHaveCSS('font-size', '14px');
      const narrative = row.locator('p:not(.article-related-aspects__date)').first();
      await expect(narrative).toHaveCSS('font-family', /Newsreader/);
      await expect(narrative).toHaveCSS('font-size', '19px');
      await expect(narrative).toHaveCSS('line-height', '28.5px');
      const paragraphs = await first.locator('p').allTextContents();
      const outline = await page.locator('.article-related-aspects__label--outside, .article-related-aspects__copy h4').allTextContents();
      expect(outline[0]).toBe('Gifts');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expectReadableTheme(page, '.article-related-aspects__label, .article-related-aspects__copy h4, .article-related-aspects__copy p');
      await label.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/placement-polish-${placement.split('/')[0]}-${width}-${theme}.png` });
      await row.getByRole('link').first().click();
      await expect(page.locator('.article-id > .aspect-badge')).toBeVisible();
      await page.getByRole('button', { name: 'Close detail', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#sky/placement/${placement}$`));
      await expect(first.locator('p')).toHaveText(paragraphs);
      await page.reload();
      await expect(first.locator('p')).toHaveText(paragraphs);
      await expect(page.locator('.article-related-aspects__label--outside, .article-related-aspects__copy h4')).toHaveText(outline);
    }
  });
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Aspect card handoff across reader pages ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1100 });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await seed(page, theme); await authenticate(page);
    for (const view of ['transits', 'synastry', 'composite']) {
      await page.goto(`/?date=2026-10-13#friends?tab=charts&chart=fixture-friend&view=${view}`);
      const pane = page.getByLabel(view === 'transits' ? 'Fixture Friend transits' : view === 'synastry' ? 'Synastry' : 'Composite', { exact: true });
      const cards = pane.locator(view === 'composite' ? '.friend-aspect-row' : '.reading-story-card');
      await expect(cards.first()).toBeVisible({ timeout: 60_000 });
      const badge = cards.first().locator('.aspect-badge');
      await expect(badge).toHaveCSS('width', view === 'composite' ? '48px' : '64px');
      await expect(badge).toHaveCSS('border-radius', '50%');
      expect(await badge.textContent()).toMatch(/^[☌☍□△⚹⚻]$/u);
      await expect(cards.first().locator('.inline-glyph-icon')).toHaveCount(0);
      const title = cards.first().locator('h3');
      await expect(title).toHaveCSS('font-family', view === 'composite' ? /system-ui/ : /Newsreader/);
      await expect(title).toHaveCSS('font-size', view === 'composite' ? width < 800 ? '17px' : '18px' : '26px');
      const body = cards.first().locator('p').first();
      await expect(body).toHaveCSS('font-size', '19px');
      await expect(body).toHaveCSS('line-height', '28.5px');
      await expect(cards.first().locator('.card-read-more--icon')).toHaveCSS('width', '44px');
      const cardBox = (await cards.first().boundingBox())!;
      const profileBox = (await page.locator('.friend-chart-page').boundingBox())!;
      if (view !== 'composite' && width > 800) expect(cardBox.width).toBeLessThan(profileBox.width / 2);
      await expectReadableTheme(page, '.friend-aspect-row h3, .friend-aspect-row p, .friend-transit-row h3, .friend-transit-row p');
      await cards.first().screenshot({ path: `test-results/aspect-handoff-${view}-${width}-${theme}.png` });
      const titleText = await title.textContent();
      await cards.first().click();
      const article = page.locator('.article-page');
      await expect(article.locator('h1')).toBeVisible();
      await expect(article.locator('.article-id > .aspect-badge')).toHaveCount(1);
      await page.reload();
      await expect(article.locator('h1')).toBeVisible();
      await page.getByRole('button', { name: /Close detail|Back/ }).first().click();
      await expect(cards.filter({ hasText: titleText! }).first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.goto('/?date=2026-10-13#you?tab=chart');
    await page.locator('.natal-big-three .placement-table-row').first().click();
    const related = page.locator('.article-related-aspect-row');
    await expect(related.first()).toBeVisible();
    await expect(related.first().locator('.aspect-badge')).toHaveCSS('width', '48px');
    await related.first().click();
    await expect(page.locator('.article-id > .aspect-badge')).toHaveCount(1);
    await page.goto('/?date=2026-10-13#sky/placement/venus/scorpio');
    const collective = page.locator('.article-related-aspects__copy-heading .aspect-badge');
    await expect(collective.first()).toBeVisible({ timeout: 60_000 });
    await expect(collective.first()).toHaveCSS('width', '48px');
    await expect(page.locator('.article-related-aspects__copy-heading .inline-glyph-icon')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Compatibility card handoff and complete reading ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1100 });
    await seed(page, theme); await authenticate(page);
    await page.goto('/?date=2026-10-13#friends?tab=charts&chart=fixture-friend&view=compatibility');
    const cards = page.locator('.compatibility-card-list .compatibility-card');
    const first = cards.first();
    await expect(first).toBeVisible({ timeout: 60_000 });
    await expect(first.locator('.compatibility-card__glyph')).toHaveCSS('width', '56px');
    await expect(first.locator('h3')).toHaveCSS('font-size', '26px');
    await expect(first.locator('h3')).toHaveCSS('font-family', /Newsreader/);
    await expect(first.locator('.compatibility-card__action')).toHaveCSS('width', '44px');
    await expect(first.locator('.compatibility-card__action')).toHaveCSS('height', '44px');
    await expect(first.locator('.compatibility-card__preview p').first()).toHaveCSS('font-size', '19px');
    const cardsBox = (await page.locator('.compatibility-card-list').boundingBox())!;
    const railBox = (await page.locator('.friend-chart-page').boundingBox())!;
    expect(cardsBox.width).toBeCloseTo(railBox.width, 0);
    const firstBox = (await first.boundingBox())!;
    if (width > 800) {
      const nextBox = (await cards.nth(2).boundingBox())!;
      expect(nextBox.y).toBeCloseTo(firstBox.y, 0);
      expect(firstBox.width).toBeGreaterThan(300);
    }
    const signs = first.locator('.compatibility-card__signs > span');
    await expect(signs).toHaveCount(2);
    expect((await signs.nth(1).boundingBox())!.y).toBeGreaterThan((await signs.first().boundingBox())!.y);
    await expectReadableTheme(page, '.compatibility-card h3, .compatibility-card__signs, .compatibility-card__action, .compatibility-card__match');
    await expect(page.getByRole('heading', { name: 'Planet by planet', exact: true })).toHaveCSS('font-size', '22px');
    await first.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/compatibility-handoff-${width}-${theme}.png` });
    await first.focus(); await page.keyboard.press('Enter');
    const article = page.locator('.article-page');
    await expect(article.getByRole('heading', { name: 'Sun compatibility', exact: true })).toBeVisible();
    const prose = article.locator('.article-body-inner').first();
    const fullText = await prose.innerText();
    expect(fullText.length).toBeGreaterThan(60);
    expect(fullText).not.toMatch(/…$/u);
    await page.goBack();
    await expect(first).toBeVisible();
    await page.goForward();
    await expect(article.getByRole('heading', { name: 'Sun compatibility', exact: true })).toBeVisible();
    await page.reload();
    await expect(article.getByRole('heading', { name: 'Sun compatibility', exact: true })).toBeVisible();
    await expect(prose).toHaveText(fullText, { useInnerText: true });
    await page.getByRole('button', { name: /Close detail|Back/ }).first().click();
    await expect(first).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const width of [320, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
  test(`Shared navigation clearance across main pages ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1100 });
    await seed(page, theme);
    await authenticate(page);
    const guide = { id: 'spacing-guide', content_key: 'article/guide/spacing-fixture', surface: 'education', headline: 'Spacing fixture guide', body: 'Complete fixture guide opening.\n\nComplete fixture guide ending.', mode: 'article', status: 'LIVE', lane: 'serving', review_state: null, updated_at: now };
    await page.route('**/api/content-reader', route => {
      const query = route.request().postDataJSON();
      if (query.prefix && ['article/manual/', 'article/guide/', 'sky-article/'].includes(query.prefix)) {
        return route.fulfill({ json: readerResponse(guide.content_key.startsWith(query.prefix) ? [guide] : []) });
      }
      if (query.keys?.includes(guide.content_key)) return route.fulfill({ json: readerResponse([guide]) });
      return route.fallback();
    });
    const routes = [
      ['sky', '.sky-page > .today-hero', 'Sky'],
      ['calendar', '.lunar-calendar-header', 'Calendar'],
      ['horoscopes', '.horoscope-periods', 'Horoscopes'],
      ['articles', '.articles-library-header', 'Guide'],
      ['you', '.profile-heading', 'You'],
      ['friends?tab=feed', '.friends-workspace-heading', 'Friends'],
      ['friends?tab=circle', '.friends-workspace-heading', 'Circle'],
      ['friends?tab=charts', '.friends-workspace-heading', 'Charts'],
      ['you?tab=chart', '.profile-heading', 'Natal'],
      ['friends?tab=charts&chart=fixture-friend&view=natal', '.friend-profile-heading', 'Saved chart'],
      ['account', '.account-page-heading', 'Account'],
      ['settings', '.settings-header', 'Settings'],
    ];
    const gaps: number[] = [];
    for (const [route, selector, label] of routes) {
      await page.goto(`/?date=2026-10-13#${route}`);
      const first = page.locator(selector).first();
      await expect(first, label).toBeVisible({ timeout: 60_000 });
      if (route === 'sky') await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
      await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
      const gap = async () => {
        const nav = (await page.locator('.nav-pill').boundingBox())!;
        const element = (await first.boundingBox())!;
        return element.y - nav.y - nav.height;
      };
      await expect.poll(gap, { message: `${label} starts below the shared header gap` }).toBeCloseTo(width <= 720 ? 64 : 80, 0);
      gaps.push(await gap());
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label).toBe(true);
      await page.screenshot({ path: `test-results/design-page-clearance-${label.toLowerCase()}-${width}-${theme}.png` });
    }
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(1);
    // Navigation from the overflow panel and a full reload retain the same placement.
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Guide', exact: true }).click();
    await expect(page.locator('.articles-library-header')).toBeVisible();
    await page.reload();
    await expect(page.locator('.articles-library-header')).toBeVisible();
    await expect(page.getByRole('heading', { name: guide.headline, exact: true })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search articles and guides', exact: true }).fill('No matching fixture');
    await expect(page.getByRole('status')).toHaveText('No articles or guides match “No matching fixture”.');
    const first = (await page.locator('.articles-library-header').boundingBox())!;
    const nav = (await page.locator('.nav-pill').boundingBox())!;
    expect(first.y - nav.y - nav.height).toBeCloseTo(width <= 720 ? 64 : 80, 0);
  });
}

test('Friction and flow: partial failure, retry, consent and birth-time boundaries',async({page})=>{
  test.setTimeout(90_000);await page.setViewportSize({width:1440,height:1100});
  const natal=await seed(page,'light');await authenticate(page);
  await page.route('**/rest/v1/rpc/list_social_friends',route=>route.fulfill({json:[
    {friendship_id:'fixture-known',user_id:'connected-fixture',display_name:'Connected Friend',handle:'connected_friend',natal_chart:natal,viewer_shares_chart:true,friend_shares_chart:true,accepted_at:now},
    {friendship_id:'fixture-unknown',user_id:'unknown-fixture',display_name:'Unknown Time Friend',handle:'unknown_friend',natal_chart:{...natal,birthTimeKnown:false},viewer_shares_chart:true,friend_shares_chart:true,accepted_at:now},
    {friendship_id:'fixture-private',user_id:'private-fixture',display_name:'Private Friend',handle:'private_friend',natal_chart:natal,viewer_shares_chart:false,friend_shares_chart:true,accepted_at:now}
  ]}));
  await page.addInitScript(()=>{
    const OriginalWorker=window.Worker;
    const requests:string[]=[];
    Object.assign(window,{forecastRequests:requests});
    Object.assign(window,{forecastShouldFail:true});
    window.Worker=class extends OriginalWorker {
      postMessage(message:any,transfer:any=[]){
        if(message.kind==='relationship-forecast-day'){
          requests.push(message.args[1]);
          if(message.args[1]==='2026-10-14'&&(window as any).forecastShouldFail){
            setTimeout(()=>this.dispatchEvent(new MessageEvent('message',{data:{id:message.id,ok:false,error:'Synthetic per-day ephemeris failure'}})),1200);return;
          }
        }
        super.postMessage(message,transfer);
      }
    };
  });
  await page.goto('/?date=2026-10-13#friends?tab=feed');
  const pair=page.getByRole('article',{name:'You and Connected Friend',exact:true});
  await expect(pair.locator('.pair-forecast-calculating').first()).toBeVisible();
  await expect(pair.getByRole('button',{name:'Retry Oct 14',exact:true})).toBeVisible();
  await expect(pair.locator('.pair-forecast-rating')).toHaveCount(2);
  await expect(pair.locator('.pair-forecast-day-open').nth(1)).toBeDisabled();
  await expect(page.getByRole('article',{name:'You and Unknown Time Friend',exact:true})).toHaveCount(0);
  await expect(page.getByRole('article',{name:'You and Private Friend',exact:true})).toHaveCount(0);
  const beforeRetry=await page.evaluate(()=>{(window as any).forecastShouldFail=false;return [...(window as any).forecastRequests] as string[];});
  await pair.getByRole('button',{name:'Retry Oct 14',exact:true}).click();
  await expect(pair.locator('.pair-forecast-rating')).toHaveCount(3);
  const requests=await page.evaluate(()=>(window as any).forecastRequests as string[]);
  expect(requests.filter(date=>date==='2026-10-13')).toHaveLength(beforeRetry.filter(date=>date==='2026-10-13').length);
  expect(requests.filter(date=>date==='2026-10-14')).toHaveLength(beforeRetry.filter(date=>date==='2026-10-14').length+1);
  expect(requests.filter(date=>date==='2026-10-15')).toHaveLength(beforeRetry.filter(date=>date==='2026-10-15').length);
  await page.getByRole('combobox',{name:'Filter friends feed',exact:true}).selectOption('charts');
  await expect(pair).toHaveCount(0);
  await page.getByRole('combobox',{name:'Filter friends feed',exact:true}).selectOption('all');
  await expect(pair.locator('.pair-forecast-rating')).toHaveCount(3);
  await pair.getByRole('button',{name:'Options for You and Connected Friend',exact:true}).click();
  await pair.getByRole('button',{name:'Hide card',exact:true}).click();
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(pair.locator('.pair-forecast-rating')).toHaveCount(3);
  await page.goto('/?date=2026-11-01#friends?tab=feed');
  await expect(pair.locator('.pair-forecast-identity > small')).toHaveText('Sun, Nov 1 – Tue, Nov 3');
  await expect(pair.locator('.pair-forecast-rating')).toHaveCount(3);
  await pair.locator('.pair-forecast-day-open').first().click();
  await expect(page.getByRole('dialog').locator('.pair-forecast-detail-date')).toHaveText('Today, Nov 1');
  await page.keyboard.press('Escape');
});

for(const width of [320,390,960,1440]) for(const theme of ['light','dark']) {
 test(`You Transits handoff layout ${width} ${theme}`,async({page})=>{
  test.setTimeout(120_000);await page.setViewportSize({width,height:1100});await seed(page,theme);await authenticate(page);
  await page.route('**/api/you-report-request',route=>route.fulfill({status:503,json:{error:'Synthetic fixture: generation disabled'}}));
  await page.goto('/?date=2026-10-13#you');
  const profile=page.getByRole('region',{name:'You',exact:true}), summary=profile.getByRole('region',{name:'Daily horoscope summary',exact:true});
  await expect(summary.locator('h2')).toBeVisible({timeout:60_000});
  const daily=profile.getByRole('region',{name:'Short-term transits',exact:true});
  await expect(daily.locator('.updates-aspect-row').first()).toBeVisible({timeout:60_000});
  const heading=profile.locator('.profile-heading'), wheel=profile.locator('.chart-layout__visual'), overview=profile.locator('.you-transit-overview');
  const reports=profile.getByRole('region',{name:'In-depth transit reports',exact:true});
  const boxes=await Promise.all([profile,heading,wheel,overview,reports].map(node=>node.boundingBox()));
  const [outer,head,visual,reading,report]=boxes.map(box=>box!);
  expect(outer.width).toBeLessThanOrEqual(1053);expect(visual.y).toBeGreaterThanOrEqual(head.y+head.height);
  const controls=(await profile.locator('.you-profile-controls').boundingBox())!;
  const identity=(await profile.locator('.you-profile-card').boundingBox())!;
  if(width>800){expect(Math.abs(controls.y+controls.height/2-identity.y-identity.height/2)).toBeLessThan(1);expect(Math.abs(controls.x+controls.width-head.x-head.width)).toBeLessThan(1);}
  if(width>800){expect(visual.x+visual.width).toBeLessThanOrEqual(reading.x);expect(reading.y).toBeLessThan(visual.y+visual.height);}
  else expect(reading.y).toBeGreaterThanOrEqual(visual.y+visual.height);
  expect(report.y).toBeGreaterThanOrEqual(Math.max(visual.y+visual.height,reading.y+reading.height));
  expect(Math.abs(report.x-outer.x)).toBeLessThan(1);expect(Math.abs(report.width-outer.width)).toBeLessThan(1);
  const groups=profile.locator('.you-transit-group');await expect(groups).toHaveCount(3);
  expect(await groups.locator('h2').allTextContents()).toEqual(['Short-term transits','Long-term transits','Planets moving through your houses']);
  const summaryBefore=await summary.locator('p').allTextContents();
  const advice=profile.getByRole('region',{name:"Do and don't",exact:true});
  await expect(advice).toBeVisible();
  const adviceBoxes=await advice.locator(':scope > div').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {x:b.x,y:b.y};}));
  expect(adviceBoxes[0].y).toBe(adviceBoxes[1].y);expect(adviceBoxes[1].x).toBeGreaterThan(adviceBoxes[0].x);
  await expect(summary.locator('h2')).toHaveCSS('font-family',/Newsreader/);await expect(summary.locator('h2')).toHaveCSS('font-size','26px');await expect(summary.locator('h2')).toHaveCSS('font-weight','400');
  await expect(reports.locator('h2')).toHaveCSS('font-size','26px');await expect(reports.locator('h2')).toHaveCSS('font-weight','400');
  for(const group of await groups.all()){
    const cards=group.locator('.you-transit-group__item:visible');expect(await cards.count()).toBeLessThanOrEqual(3);
    const cardBoxes=await cards.evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width};}));
    const cardTitle=cards.first().locator('.updates-aspect-row__headline');
    if(await cardTitle.count()){await expect(cardTitle).toHaveCSS('font-family',/Newsreader/);await expect(cardTitle).toHaveCSS('font-size','26px');await expect(cardTitle).toHaveCSS('font-weight','400');}
    await expect(cards.first().locator('.card-read-more--icon')).toHaveCSS('width','44px');
    const firstGlyph=(await cards.first().locator('.updates-aspect-row__glyphs').boundingBox())!;
    expect(Math.abs(firstGlyph.x+firstGlyph.width/2-cardBoxes[0].x-cardBoxes[0].width/2)).toBeLessThan(1);
    const symbolOffset=await cards.first().locator('.updates-aspect-row__glyphs').evaluate(node=>{
      const range=document.createRange();range.selectNodeContents(node.querySelector('.planet-glyph')??node);const symbol=range.getBoundingClientRect(),circle=node.getBoundingClientRect();
      return Math.abs(symbol.x+symbol.width/2-circle.x-circle.width/2);
    });
    expect(symbolOffset).toBeLessThan(2);
    await expect(cards.first().locator('.updates-aspect-row__description')).toHaveCSS('text-align','center');
    if(width>800 && cardBoxes.length>1){expect(cardBoxes[0].y).toBe(cardBoxes[1].y);expect(cardBoxes[1].x).toBeGreaterThan(cardBoxes[0].x);}
    else if(cardBoxes.length>1)expect(cardBoxes[1].y).toBeGreaterThan(cardBoxes[0].y);
    const toggle=group.locator('.you-transit-group__toggle');
    if(await toggle.count()){
      await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
      expect(await cards.count()).toBe(await group.locator('.you-transit-group__item').count());
      await group.getByRole('button',{name:'Show less',exact:true}).click();expect(await cards.count()).toBe(3);
    }
  }
  await expectReadableTheme(page,'.you-chart-page h1, .you-transit-overview h2, .you-transit-overview p, .daily-dodont li, .you-report-actions h2, .you-report-actions p, .you-transit-group h2, .you-transit-group__toggle, .you-transit-grid .updates-aspect-row__title, .you-transit-grid .updates-aspect-row__headline, .you-transit-grid .updates-aspect-row__description');
  await profile.getByRole('button',{name:'Open full transit chart',exact:true}).click();await expect(page.getByRole('dialog').locator('.sky-wheel-transit-overlay')).toBeVisible();await page.keyboard.press('Escape');
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-results/design-you-transits-overview-${width}-${theme}.png`});
  await daily.scrollIntoViewIfNeeded();await page.screenshot({path:`test-results/design-you-transits-cards-${width}-${theme}.png`});
  const first=daily.locator('button.updates-aspect-row').first(), title=await first.locator('.updates-aspect-row__title').innerText();
  const preview=await first.locator('.transit-card-preview').innerText();await first.click();
  const article=page.locator('.you-transit-article-page');await expect(article.getByRole('heading',{level:1})).toHaveText(title);
  await expect(article).toContainText(preview.replace(/\.\.\.$/,'').slice(0,70));
  await page.getByRole('button',{name:'Back to updates',exact:true}).click();await expect(summary.locator('h2')).toBeVisible();expect(await summary.locator('p').allTextContents()).toEqual(summaryBefore);
  await page.reload();await expect(summary.locator('h2')).toBeVisible({timeout:60_000});expect(await summary.locator('p').allTextContents()).toEqual(summaryBefore);
  await profile.getByRole('tab',{name:'Natal Chart',exact:true}).click();await expect(profile.locator('.natal-big-three')).toBeVisible();
  await profile.getByRole('tab',{name:'Transits',exact:true}).click();await expect(summary.locator('h2')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}

for(const width of [390,1440]) for(const theme of ['light','dark']) {
 test(`You Transits missing city and long identity ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1100});await seed(page,theme);
  await page.addInitScript(()=>{const key='tldrastro:userProfile',profile=JSON.parse(localStorage.getItem(key)!);profile.currentLocation='';delete profile.currentLocationData;profile.name='Fixture Reader With A Longer Display Name';localStorage.setItem(key,JSON.stringify(profile));});
  await page.goto('/?date=2026-10-13#you');
  const profile=page.getByRole('region',{name:'You',exact:true}), prompt=profile.getByRole('region',{name:'Current city needed',exact:true});
  await expect(prompt.getByRole('heading',{name:'Add your current city.',exact:true})).toBeVisible();
  await expect(profile.locator('h1')).toHaveText('Fixture Reader With A Longer Display Name');
  await expect(profile.getByRole('region',{name:'In-depth transit reports',exact:true})).toHaveCount(0);
  await expect(profile.locator('.you-transit-group')).toHaveCount(0);
  const wheel=(await profile.locator('.chart-layout__visual').boundingBox())!, message=(await prompt.boundingBox())!;
  if(width>800)expect(message.x).toBeGreaterThanOrEqual(wheel.x+wheel.width);else expect(message.y).toBeGreaterThanOrEqual(wheel.y+wheel.height);
  await expectReadableTheme(page,'.you-chart-page h1, .you-transit-overview h3, .you-transit-overview p');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/design-you-transits-empty-${width}-${theme}.png`});
  await prompt.getByRole('button',{name:'Add current city →',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await expect(prompt).toBeVisible();
 });
}

for(const width of [320,390,960,1440]) for(const theme of ['light','dark']) {
 test(`friend profile layout across sections ${width} ${theme}`,async({page})=>{
  test.setTimeout(120_000);await page.setViewportSize({width,height:1100});await seed(page,theme);await authenticate(page);
  const friendName=width===320 || width===960 ? 'Fixture Friend With A Longer Display Name' : 'Fixture Friend';
  await page.addInitScript(name=>{const key='tldrastro:manualCharts:design-reader';const charts=JSON.parse(localStorage.getItem(key)??'[]');localStorage.setItem(key,JSON.stringify(charts.map((chart:any)=>({...chart,displayName:name}))));},friendName);
  await page.goto('/?date=2026-10-13#friends?tab=charts&chart=fixture-friend&view=compatibility');
  const profile=page.getByRole('region',{name:`${friendName} chart profile`,exact:true});
  const heading=profile.locator('.friend-profile-heading'), title=heading.locator('h1');
  await expect(title).toHaveText(friendName);
  await expect(profile.locator('.compatibility-card').first()).toBeVisible({timeout:60_000});
  await expect(profile.locator('.sky-wheel-synastry')).toBeVisible();
  await expect(profile.locator('.compatibility-card__source')).toHaveCount(0);
  const tabs=profile.getByRole('tablist',{name:'Chart profile sections',exact:true});
  const edit=profile.getByRole('button',{name:`Edit ${friendName}`,exact:true});
  const style=await title.evaluate(node=>{const s=getComputedStyle(node);return {family:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,tracking:s.letterSpacing};});
  expect(style.family).toContain('Newsreader');expect(style).toMatchObject({size:'36px',weight:'400',line:'40.32px',tracking:'-0.72px'});
  const panelBox=(await profile.boundingBox())!, headerBox=(await heading.boundingBox())!, tabsBox=(await tabs.boundingBox())!, editBox=(await edit.boundingBox())!;
  const backBox=(await page.getByRole('button',{name:'Charts',exact:true}).boundingBox())!, navBox=(await page.locator('.nav-pill').boundingBox())!;
  const logoBox=(await page.locator('.brand-dot').boundingBox())!, menuBox=(await page.getByRole('button',{name:'Open menu',exact:true}).boundingBox())!;
  expect(logoBox.x).toBeGreaterThanOrEqual(navBox.x);
  expect(logoBox.x+logoBox.width).toBeLessThanOrEqual(navBox.x+navBox.width);
  expect(backBox.x).toBeGreaterThanOrEqual(0);
  expect(menuBox.x+menuBox.width).toBeLessThanOrEqual(width);
  expect(await page.locator('.brand-dot').evaluate(node=>{const b=node.getBoundingClientRect();const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return hit===node||Boolean(hit&&node.contains(hit));})).toBe(true);
  expect(Math.abs(backBox.y+backBox.height/2-navBox.y-navBox.height/2)).toBeLessThan(1);
  expect(panelBox.width).toBeLessThanOrEqual(1053);
  expect(headerBox.y).toBeGreaterThan((await page.locator('.nav-pill').boundingBox())!.y+(await page.locator('.nav-pill').boundingBox())!.height);
  expect(Math.abs(editBox.x+editBox.width-panelBox.x-panelBox.width)).toBeLessThan(1);
  if(width>800)expect(tabsBox.width).toBeLessThan(panelBox.width);
  else expect(tabsBox.width).toBeLessThanOrEqual(panelBox.width);
  if(width>800)expect(Math.abs(tabsBox.y+tabsBox.height/2-editBox.y-editBox.height/2)).toBeLessThan(1);
  else expect(tabsBox.y).toBeGreaterThanOrEqual(editBox.y+editBox.height);
  const visual=(await profile.locator('.friend-detail-chart-rail').boundingBox())!, content=(await profile.locator('.friend-daily-forecast').first().boundingBox())!;
  expect(visual.y).toBeGreaterThanOrEqual(headerBox.y+headerBox.height);
  if(width>800){expect(Math.abs(visual.y-content.y)).toBeLessThan(1);expect(visual.x+visual.width).toBeLessThanOrEqual(content.x);}
  else expect(content.y).toBeGreaterThanOrEqual(visual.y+visual.height);
  expect((await profile.getByRole('heading').allTextContents())[0]).toBe(friendName);
  await expect(profile.locator('.compatibility-card h3').first()).toHaveCSS('font-family',/Newsreader/);
  await expect(profile.locator('.compatibility-card h3').first()).toHaveCSS('font-size','26px');
  await expect(profile.locator('.compatibility-card h3').first()).toHaveCSS('font-weight','400');
  const glyphFilter=await profile.locator('.compatibility-sign-label img').first().evaluate(node=>{
    const reference=document.createElement('span');reference.style.filter='var(--filter-glyph-neutral)';node.parentElement!.append(reference);
    const expected=getComputedStyle(reference).filter;reference.remove();return {actual:getComputedStyle(node).filter,expected};
  });
  expect(glyphFilter.actual).toBe(glyphFilter.expected);expect(glyphFilter.actual).not.toBe('none');
  await expectReadableTheme(page,'.friend-profile-heading h1, .friend-view-tab, .compatibility-card h3, .compatibility-card p');
  await page.screenshot({path:`test-results/design-friend-layout-${width}-${theme}.png`});
  const bodyBefore=await profile.locator('.compatibility-card p').allTextContents();
  await edit.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(edit).toBeFocused();
  for(const name of ['Transits','Natal','Synastry','Composite','Compatibility']){
    const tab=tabs.getByRole('tab',{name,exact:true,includeHidden:true});
    if(await tab.isVisible())await tab.click();
    else {
      await profile.getByRole('button',{name:'More, 2 sections',exact:true}).click();
      const menu=page.getByRole('menu',{name:'More chart profile sections',exact:true});await expect(menu).toBeVisible();
      const box=(await menu.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
      await menu.getByRole('menuitemradio',{name:new RegExp(`^${name}`)}).click();
    }
    await expect(tab).toHaveAttribute('aria-selected','true');
    await expect(profile.locator('.friend-detail-chart-rail .sky-wheel')).toBeVisible({timeout:60_000});
    if(name==='Natal') {
      const chart=(await profile.locator('.friend-detail-chart-rail').boundingBox())!;
      const placements=(await profile.locator('.natal-placement-sections').boundingBox())!;
      expect(chart.y).toBeGreaterThanOrEqual((await heading.boundingBox())!.y+(await heading.boundingBox())!.height);
      expect(placements.y).toBeGreaterThanOrEqual(chart.y+chart.height);
    }
    await expect(title).toHaveText(friendName);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await expect(profile.locator('.compatibility-card').first()).toBeVisible();
  expect(await profile.locator('.compatibility-card p').allTextContents()).toEqual(bodyBefore);
  await page.reload();await expect(title).toHaveText(friendName);await expect(profile.locator('.compatibility-card').first()).toBeVisible({timeout:60_000});
  await page.getByRole('button',{name:'Charts',exact:true}).click();await expect(page.getByRole('heading',{level:1,name:'Friends',exact:true})).toBeVisible();
 });
}

for(const width of [390,1440]) for(const theme of ['light','dark']) {
 test(`friend profile event, empty and Circle variants ${width} ${theme}`,async({page})=>{
  test.setTimeout(90_000);await page.setViewportSize({width,height:1100});const natal=await seed(page,theme);await authenticate(page);
  await page.route('**/rest/v1/manual_charts*',route=>route.fulfill({status:503,json:{message:'Synthetic unavailable sync'}}));
  await page.route('**/rest/v1/rpc/list_social_friends',route=>route.fulfill({json:[{friendship_id:'fixture-friendship',user_id:'connected-fixture',display_name:'Connected Friend',handle:'connected_friend',natal_chart:natal,viewer_shares_chart:true,friend_shares_chart:true,accepted_at:now}]}));
  await page.addInitScript(()=>{
    if(localStorage.getItem('designFriendVariantsSeeded'))return;
    localStorage.setItem('designFriendVariantsSeeded','true');
    const key='tldrastro:manualCharts:design-reader',base=JSON.parse(localStorage.getItem(key)!)[0];
    localStorage.setItem(key,JSON.stringify([{...base,id:'fixture-event',displayName:'Fixture Event',chartType:'event'},{...base,id:'fixture-missing',displayName:'Missing Chart',birthDate:'',natalChart:null,birthTimeUnknown:true}]));
  });
  await page.goto('/?date=2026-10-13#friends?tab=charts&chart=fixture-event&view=natal');
  let profile=page.getByRole('region',{name:'Fixture Event chart profile',exact:true});
  await expect(profile.locator('h1')).toHaveText('Fixture Event');await expect(profile.locator('.friend-detail-chart-rail .sky-wheel')).toBeVisible({timeout:60_000});
  await expect(profile.getByRole('tablist',{name:'Chart profile sections',exact:true})).toHaveCount(0);
  const chart=(await profile.locator('.friend-detail-chart-rail').boundingBox())!;
  const placements=(await profile.locator('.natal-placement-sections').boundingBox())!;
  expect(chart.y).toBeGreaterThanOrEqual((await profile.locator('.friend-profile-heading').boundingBox())!.y+(await profile.locator('.friend-profile-heading').boundingBox())!.height);
  expect(placements.y).toBeGreaterThanOrEqual(chart.y+chart.height);
  let box=(await profile.boundingBox())!,edit=(await profile.getByRole('button',{name:'Edit Fixture Event',exact:true}).boundingBox())!;
  expect(Math.abs(edit.x+edit.width-box.x-box.width)).toBeLessThan(1);
  await page.screenshot({path:`test-results/design-friend-event-${width}-${theme}.png`});
  await page.goto('/?date=2026-10-13#friends?tab=charts&chart=fixture-missing&view=natal');
  profile=page.getByRole('region',{name:'Missing Chart chart profile',exact:true});
  await expect(profile).toHaveClass(/relationship-detail-no-chart/);await expect(profile.locator('h1')).toHaveText('Missing Chart');
  box=(await profile.boundingBox())!;const content=(await profile.locator('.natal-big-three').boundingBox())!;
  expect(Math.abs(content.x-box.x)).toBeLessThan(1);expect(Math.abs(content.width-box.width)).toBeLessThan(1);
  await expect(profile.locator('.friend-detail-chart-rail')).toHaveCount(0);
  await expect(profile.locator('.placement-table-row__title')).toHaveText(['Sun', 'Moon']);
  await expect(profile.locator('.placement-table-row__meta')).toHaveText(['Pending', 'Pending']);
  await expect(profile.getByText(/in pending/i)).toHaveCount(0);
  await expect(profile.locator('.placement-table-row:is(button,[role="link"])')).toHaveCount(0);
  for(const row of await profile.locator('.placement-table-row').all()) {
    await expect(row.locator('.placement-table-row__meta')).toHaveCSS('font-size','14px');
    await expect(row.locator('.placement-table-row__meta')).toHaveCSS('font-family',/system-ui/);
  }
  await expectReadableTheme(page,'.friend-profile-heading h1, .friend-view-tab');
  await page.screenshot({path:`test-results/design-friend-empty-${width}-${theme}.png`});
  await page.getByRole('button',{name:'Charts',exact:true}).click();await page.getByRole('tab',{name:/^Circle/}).click();
  await page.getByRole('link',{name:"Open Connected Friend's chart",exact:true}).click();
  profile=page.getByRole('region',{name:'Connected Friend chart profile',exact:true});
  await expect(profile.locator('h1')).toHaveText('Connected Friend');await expect(profile.locator('.friend-kebab')).toHaveCount(0);
  await expect(profile.locator('.friend-detail-chart-rail .sky-wheel')).toBeVisible({timeout:60_000});
  box=(await profile.boundingBox())!;expect(box.width).toBeLessThanOrEqual(1053);
  const tabs=(await profile.getByRole('tablist',{name:'Chart profile sections',exact:true}).boundingBox())!;expect(tabs.x+tabs.width).toBeLessThanOrEqual(box.x+box.width);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
 test(`feed source filter empty states ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1100});await seed(page,theme);await authenticate(page);
  await page.route('**/rest/v1/rpc/**',route=>route.fulfill({json:[]}));
  await page.route('**/rest/v1/manual_charts*',route=>route.fulfill({json:[]}));
  await page.addInitScript(()=>localStorage.setItem('tldrastro:manualCharts:design-reader','[]'));
  await page.goto('/?date=2026-10-13#friends?tab=feed');
  const filter=page.getByRole('combobox',{name:'Filter friends feed',exact:true});
  await expect(filter).toHaveValue('all');
  if(width<800) {
    await expect(filter).toBeVisible();
    await expect(page.getByRole('heading',{level:1,name:'Friends',exact:true})).toBeVisible();
    await expect(page.getByRole('tablist',{name:'Friends views'})).toBeVisible();
    const box=(await filter.boundingBox())!;
    const title=(await page.getByRole('heading',{level:1,name:'Friends',exact:true}).boundingBox())!;
    const tabs=(await page.getByRole('tablist',{name:'Friends views'}).boundingBox())!;
    expect(Math.abs(box.y+box.height/2-title.y-title.height/2)).toBeLessThan(1);
    expect(box.width).toBeGreaterThanOrEqual(80);
    expect(tabs.y).toBeGreaterThanOrEqual(box.y+box.height);
  }
  const heading=page.locator('.friends-unified-empty h2');
  await expect(heading).toHaveText('Transits');
  const styles=[];
  for(const [value,label] of [['all','Transits'],['circle','Your circle’s transits'],['charts','Saved chart transits']]){
    await filter.selectOption(value);await expect(heading).toHaveText(label);
    await expect(page.locator('.pair-forecast')).toHaveCount(0);
    await expect(page.locator('.friends-timing-card')).toHaveCount(0);
    styles.push(await heading.evaluate(node=>{const s=getComputedStyle(node);return {family:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,tracking:s.letterSpacing,margin:s.margin,align:s.textAlign,casing:s.textTransform};}));
    await expectReadableTheme(page,'.friends-unified-empty h2, .friends-unified-empty p');
  }
  expect(styles[0]).toEqual(styles[1]);expect(styles[1]).toEqual(styles[2]);
  expect(styles[0].family).toContain('Newsreader');
  await expect(page.getByRole('heading',{level:1,name:'Friends',exact:true})).toBeVisible();
  await page.reload();await expect(filter).toHaveValue('charts');await expect(heading).toHaveText('Saved chart transits');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/design-feed-sources-empty-${width}-${theme}.png`});
 });
 test(`handoff page hierarchy and existing actions ${width} ${theme}`,async({page})=>{
  test.setTimeout(120_000);await page.setViewportSize({width,height:1100});await seed(page,theme);await authenticate(page);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?date=2026-10-13#sky');
  await expect(page.getByLabel('Daily sky summary')).toBeVisible({timeout:60_000});
  await expect(page.locator('.sky-page > .today-hero h1')).toHaveText('Sky');
  await expect(page.locator('.sky-page .sky-placement-group > h3')).toHaveText(['Planets','Points','Angles']);
  // Learn's angle definitions are natal education, not collective Sky articles.
  await expect(page.locator('.sky-page a[href^="/learn/points/"]')).toHaveCount(0);
  const angleCards=page.locator('.sky-angle-group .placement-table-row');
  const calculatedSky=await getAstrodienstSky(location,new Date(now));
  await expect(angleCards).toHaveText([
    `Ascendant in ${calculatedSky.ascendant}${Math.floor((calculatedSky.ascendantLongitude! % 30))}°${String(Math.round((calculatedSky.ascendantLongitude! % 1)*60)).padStart(2,'0')}'`,
    `Midheaven in ${calculatedSky.midheaven}${Math.floor((calculatedSky.midheavenLongitude! % 30))}°${String(Math.round((calculatedSky.midheavenLongitude! % 1)*60)).padStart(2,'0')}'`
  ]);
  for (const card of await angleCards.all()) {
    await expect(card).toBeDisabled();
    await expect(card.locator('.placement-table-row__title')).toHaveCSS('font-family', /system-ui/);
    const glyph=card.locator('.placement-glyph-pair__planet img');
    await expect(glyph).toBeVisible();
    const bounds=await glyph.boundingBox();expect(bounds!.width).toBeGreaterThanOrEqual(16);expect(bounds!.height).toBeGreaterThanOrEqual(16);
    const background=await card.evaluate(node=>getComputedStyle(node).backgroundColor);
    await card.hover();await expect(card).toHaveCSS('background-color',background);
  }
  await expectRenderedTextContrast(page,'.sky-angle-group .placement-table-row__title, .sky-angle-group .placement-table-row__meta',4.5);
  await expect(page.locator('.sky-angle-group a, .sky-angle-group .card-read-more, .sky-angle-group .placement-table-row__description')).toHaveCount(0);
  await expect(page.locator('.sky-page .zodiac-wheel__angle-badge')).toHaveCount(4);
  await expect(page.locator('.sky-placement-group .planet-placement-row')).toHaveCount(14);
  await expect(page.locator('.placement-progress')).toHaveCount(14);
  await expect(page.getByRole('region',{name:'Points',exact:true}).locator('.planet-placement-row__title')).toHaveText([/North Node/,/South Node/,/Lilith/,/Chiron/]);
  const groupPositions=await page.locator('.sky-page .sky-placement-group > h3').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top));
  expect(groupPositions[1]).toBeGreaterThan(groupPositions[0]);expect(groupPositions[2]).toBeGreaterThan(groupPositions[1]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expectReadableTheme(page, '.sky-page h1, .sky-daily-summary__body, .planet-placement-row__title, .planet-placement-row__description, .planet-placement-row__meta, .sky-debility-card strong');
  await page.screenshot({path:`test-results/design-sky-${width}-${theme}.png`,fullPage:true});
  await page.reload();
  await expect(page.locator('.sky-placement-group .planet-placement-row')).toHaveCount(14);
  await expect(page.locator('.sky-page .sky-placement-group > h3')).toHaveText(['Planets','Points','Angles']);
  await expect(page.locator('.sky-page a[href^="/learn/points/"]')).toHaveCount(0);
  await expect(page.locator('.sky-page .zodiac-wheel__angle-badge')).toHaveCount(4);
  for (const card of await angleCards.all()) await expect(card).toBeDisabled();
  await page.goto('/#you?tab=chart');
  await expect(page.getByRole('region',{name:'You',exact:true}).getByRole('heading',{level:1})).toHaveText('Fixture Reader');
  await page.getByRole('tab',{name:'Natal Chart',exact:true}).click();
  const profile=page.getByRole('region',{name:'You',exact:true});
  await expect(profile.locator('.natal-big-three')).toBeVisible();
  await expect(profile.locator('.natal-big-three .placement-table-row__title').first()).toHaveCSS('font-size','18px');
  await expect(profile.locator('.natal-big-three .placement-table-row__title').first()).toHaveCSS('font-weight','600');
  await expect(profile.locator('.natal-big-three .placement-table-row__description').first()).toHaveCSS('font-size','19px');
  await profile.locator('.natal-big-three .placement-table-row').first().screenshot({path:`test-results/card-natal-${width}-${theme}.png`});
  await expect(profile.locator('.natal-traditional .placement-table-row')).toHaveCount(5);
  await expect(profile.locator('.natal-generational .placement-table-row')).toHaveCount(3);
  await expect(profile.locator('.natal-angles .placement-table-row')).toHaveCount(3);
  await expect(profile.locator('.natal-points .placement-table-row__title')).toHaveText([/North Node/,/South Node/,/Chiron/,/Lilith/]);
  const headingBox=(await profile.locator('.profile-heading').boundingBox())!, chartBox=(await profile.locator('.chart-layout__visual').boundingBox())!, bigBox=(await profile.locator('.natal-big-three').boundingBox())!;
  expect(chartBox.y).toBeGreaterThanOrEqual(headingBox.y+headingBox.height);
  if(width>800) expect(bigBox.x).toBeGreaterThan(chartBox.x);else expect(bigBox.y).toBeGreaterThan(chartBox.y);
  await profile.getByRole('tab',{name:'Table',exact:true}).click();await expect(profile.locator('table')).toBeVisible();
  await profile.getByRole('tab',{name:'Circle',exact:true}).click();await expect(profile.locator('.sky-wheel--handoff')).toBeVisible();
  await profile.getByRole('button',{name:'Open full natal chart',exact:true}).click();
  await expect(page.getByRole('dialog').locator('.sky-wheel--handoff')).toBeVisible();
  await page.keyboard.press('Escape');await expect(profile.getByRole('button',{name:'Open full natal chart',exact:true})).toBeFocused();
  for (const section of await profile.locator('.natal-placement-section').all()) { await section.scrollIntoViewIfNeeded(); await expect(section.locator('.placement-table-row').first()).toBeVisible(); }
  await page.evaluate(()=>scrollTo(0,0));
  await expectReadableTheme(page, '.zodiac-wheel__angle-badge text');
  await expectReadableTheme(page, '.you-chart-page h1, .you-profile-monogram, .placement-table-row__title, .placement-table-row__description, .placement-table-row__meta');
  const glyph = profile.locator('.natal-traditional .placement-glyph-svg').first();
  if (theme === 'dark') await expect(glyph).toHaveCSS('filter', await page.locator('.natal-traditional .placement-sign-glyph-svg').first().evaluate(node => getComputedStyle(node).filter));
  await page.screenshot({path:`test-results/design-you-${width}-${theme}.png`,fullPage:true,style:'.placement-table-row { content-visibility: visible; }'});
  await page.reload();await expect(profile.locator('.natal-big-three')).toBeVisible();
  await profile.getByRole('tab',{name:'Transits',exact:true}).click();
  await expect(profile.locator('.sky-wheel-transit-overlay.sky-wheel--handoff')).toBeVisible();
  await expect(profile.locator('.sky-wheel-transit-overlay .zodiac-wheel__angle-badge')).toHaveCount(4);
  await expect(profile.locator('#sub-transits').getByRole('heading',{name:'Short-term transits',exact:true})).toBeVisible();
  await profile.getByRole('button',{name:'Open full transit chart',exact:true}).click();
  await expect(page.getByRole('dialog').locator('.sky-wheel-transit-overlay')).toBeVisible();await page.keyboard.press('Escape');
  await page.screenshot({path:`test-results/design-you-transits-${width}-${theme}.png`,fullPage:true,style:'.placement-table-row, .you-aspect-row { content-visibility: visible; }'});
  await page.goto('/#friends?tab=charts');
  await expect(page.getByRole('heading',{level:1,name:'Friends',exact:true})).toBeVisible();
  await expect(page.getByRole('tablist',{name:'Friends views'}).getByRole('tab')).toHaveCount(4);
  const before=(await page.locator('.friends-workspace-heading').boundingBox())!;
  await page.getByRole('tab',{name:/Requests/}).click();
  const after=(await page.locator('.friends-workspace-heading').boundingBox())!;
  expect(after).toEqual(before);
  await page.getByRole('tab',{name:/Charts/}).click();await page.getByRole('button',{name:'Add',exact:true}).click();
  await expect(page.getByRole('menuitem',{name:'Add a chart',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Add',exact:true})).toBeFocused();
  await page.screenshot({path:`test-results/design-friends-${width}-${theme}.png`,fullPage:true});
  await page.goto('/#friends?tab=charts&chart=fixture-friend&view=natal');
  await expect(page.locator('.friend-profile-heading h1')).toHaveText('Fixture Friend');
  const friendHeadingBox=(await page.locator('.friend-profile-heading').boundingBox())!, friendChartBox=(await page.locator('.friend-detail-chart-rail').boundingBox())!;
  expect(friendChartBox.y).toBeGreaterThanOrEqual(friendHeadingBox.y+friendHeadingBox.height);
  await expect(page.locator('.friend-natal-stage .natal-big-three')).toBeVisible();
  for (const section of await page.locator('.friend-natal-stage .natal-placement-section').all()) { await section.scrollIntoViewIfNeeded(); await expect(section.locator('.placement-table-row').first()).toBeVisible(); }
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`test-results/design-friend-natal-${width}-${theme}.png`,fullPage:true,style:'.placement-table-row { content-visibility: visible; }'});
  if(width>800) await page.getByRole('tab',{name:'Synastry',exact:true}).click();
  else { await page.getByRole('button',{name:'More, 2 sections',exact:true}).click(); await page.getByRole('menuitemradio',{name:/Synastry/}).click(); }
  await expect(page.locator('.sky-wheel-synastry.sky-wheel--handoff')).toBeVisible();
  await expect(page.locator('.sky-wheel-synastry .planet-marker')).toHaveCount(28);
  await expect(page.locator('.sky-wheel-synastry .zodiac-wheel__angle-badge')).toHaveCount(4);
  await expectReadableTheme(page, '.zodiac-wheel__angle-badge text');
  await page.screenshot({path:`test-results/design-friend-synastry-${width}-${theme}.png`,fullPage:true});
  if(width>800) await page.getByRole('tab',{name:'Composite',exact:true}).click();
  else { await page.getByRole('button',{name:'More, 2 sections',exact:true}).click(); await page.getByRole('menuitemradio',{name:/Composite/}).click(); }
  await expect(page.locator('.sky-wheel-composite.sky-wheel--handoff')).toBeVisible();

  await page.getByRole('button',{name:'Open menu',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('menuitem',{name:/^Reports/})).toHaveCount(1);
  expect((await page.getByRole('menu',{name:'Site menu'}).getByRole('menuitem').allTextContents()).slice(0,6)).toEqual(['Sky','Calendar','Horoscopes','Guide','You','Friends']);
  await expectReadableTheme(page, '.site-menu-profile strong, .site-menu-profile .profile-avatar, .site-menu-theme > span, .site-menu > button, .settings-theme-control button');
  const otherTheme = theme === 'dark' ? 'light' : 'dark';
  await page.locator('.site-menu-theme').getByRole('button',{name:otherTheme,exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme',otherTheme);
  await expectReadableTheme(page, '.site-menu-profile strong, .site-menu-profile .profile-avatar, .site-menu-theme > span, .site-menu > button, .settings-theme-control button');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme',otherTheme);
  await page.getByRole('button',{name:'Open menu',exact:true}).click();
  await page.locator('.site-menu-theme').getByRole('button',{name:theme,exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
  await page.screenshot({path:`test-results/design-menu-${width}-${theme}.png`});
  await expect(page.getByRole('menuitem',{name:'Sign out',exact:true})).toHaveCount(0);
  await page.getByRole('menuitem',{name:'Settings',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Settings',exact:true,level:1})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expectReadableTheme(page, '.settings-page h1, .settings-group-label, .settings-row-title, .settings-row-description, .settings-profile-row .profile-avatar');
  await page.screenshot({path:`test-results/design-settings-${width}-${theme}.png`,fullPage:true});
  expect(errors).toEqual([]);
 });
 test(`date-led published horoscope navigation ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1100});await seed(page,theme);
  const rows=[12,13].map(day=>{
    const edition=emptyHoroscopeEdition({period:'daily',audience:'rising',timeZone:location.timeZone,startsAt:`2026-10-${day}T04:00:00.000Z`,endsAt:`2026-10-${day+1}T04:00:00.000Z`});
    edition.passages=edition.passages.map(p=>({...p,headline:`${p.sign} fixture headline`,body:`Complete ${day} ${p.sign} opening.\n\nComplete ${day} ${p.sign} ending.`}));
    return {id:`aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa${day}`,content_key:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',status:'LIVE',lane:'serving',review_state:null,body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition}};
  });
  await page.route('**/api/content-reader',route=>{const q=route.request().postDataJSON();const matches=q.horoscope?.period==='daily'?rows.filter(row=>row.sections.horoscopeEdition.window.startsAt<=q.horoscope.at&&q.horoscope.at<row.sections.horoscopeEdition.window.endsAt):[];return route.fulfill({json:{schema:READER_ROW_SCHEMA,rows:matches,publications:[],nextCursor:null}});});
  await page.goto('/#horoscopes?period=daily&sign=gemini');
  const article=page.getByRole('article',{name:'Gemini horoscope'});
  await expect(article).toContainText('Complete 13 gemini ending.');
  await expect(article.locator('.horoscope-reading-date')).toHaveText('October 13');
  const order=await page.locator('.horoscope-page h1,h2,h3').allTextContents();expect(order[0]).toBe('Horoscopes');expect(order.indexOf('October 13')).toBeLessThan(order.indexOf('gemini fixture headline'));
  await expect(article.locator('.horoscope-reading-date')).toHaveCSS('font-family',/Newsreader/);
  await expect(article.locator('.horoscope-reading-date')).toHaveCSS('font-size','36px');
  await expect(article.locator('.horoscope-reading-date')).toHaveCSS('line-height','40.32px');
  await expect(page.locator('.horoscope-page h1')).toHaveCount(1);
  for(const paragraph of await article.locator('.horoscope-prose p').all()){await expect(paragraph).toHaveCSS('font-family',/Newsreader/);await expect(paragraph).toHaveCSS('font-size','19px');await expect(paragraph).toHaveCSS('line-height','28.5px');await expect(paragraph).toHaveCSS('font-weight','400');await expect(paragraph).toHaveCSS('letter-spacing','normal');}
  await expectReadableTheme(page,'.horoscope-reading-date, .horoscope-prose p');
  await page.getByRole('button',{name:/^Previous(?: |$)/}).click();await expect(article).toContainText('Complete 12 gemini ending.');
  await page.reload();await expect(article).toContainText('Complete 12 gemini ending.');
  await page.getByRole('button',{name:/^Next(?: |$)/}).click();await expect(article).toContainText('Complete 13 gemini ending.');
  await page.getByRole('button',{name:'Pisces & Pisces Rising',exact:true}).click();await expect(page.getByRole('article',{name:'Pisces horoscope'})).toContainText('Complete 13 pisces ending.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/design-horoscope-${width}-${theme}.png`,fullPage:true});
 });
 test(`auth design retains credentials, error feedback and close controls ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1100});await bundledPublications(page);
  await page.addInitScript(theme=>{localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:pageAnimations','off');},theme);
  await page.route('**/auth/v1/**',route=>route.fulfill({status:400,json:{error:'Synthetic authentication fixture'}}));
  await page.goto('/#you');const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('heading',{level:1,name:'Create an account',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(dialog.getByRole('heading',{level:1,name:'Log in',exact:true})).toBeVisible();
  await expect(dialog.getByRole('button',{name:/Google/})).toBeVisible();
  await expect(dialog.locator('h1')).toHaveCSS('font-size','36px');
  await expect(dialog.getByLabel('Birth date',{exact:true})).toHaveCount(0);
  await dialog.getByLabel('Email',{exact:true}).fill('fixture@example.test');await dialog.getByLabel('Password',{exact:true}).fill('synthetic-password');
  await dialog.getByRole('button',{name:'Show password',exact:true}).click();await expect(dialog.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');
  await dialog.getByRole('button',{name:'Log in',exact:true}).first().click();await expect(dialog.getByRole('status')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expectReadableTheme(page, '.auth-flow-heading h1, .auth-flow-v2 .auth-primary-button, .auth-flow-v2 label');
  await page.screenshot({path:`test-results/design-login-${width}-${theme}.png`,fullPage:true});
  await dialog.getByRole('button',{name:'Close',exact:true}).click();await expect(dialog).toHaveCount(0);
 });

 test(`published profile readings and account controls ${width} ${theme}`,async({page})=>{
  test.setTimeout(90_000);await page.setViewportSize({width,height:1100});
  await seed(page,theme);
  const account=await authenticate(page);
  const keys=[...['day','night'].map(sect=>`cms/natal-chart-context/you/sect/${sect}`),'cms/natal-twelfth-ruler/you/introduction',...Array.from({length:12},(_,i)=>`cms/natal-twelfth-ruler/you/ruler-house/${i+1}`)];
  const rows=keys.map((key,index)=>({id:`bbbbbbbb-bbbb-4bbb-bbbb-${String(index).padStart(12,'0')}`,content_key:key,surface:'natal',mode:'article',status:'LIVE',lane:'serving',review_state:null,body:`Fixture ${key} opening.\n\nComplete ${key} ending.`,updated_at:now}));
  await page.route('**/api/content-reader',route=>{const q=route.request().postDataJSON();return route.fulfill({json:readerResponse(rows.filter(row=>q.keys?.includes(row.content_key)))});});
  await page.goto('/#you?tab=chart');
  const sect=page.getByRole('region',{name:'Chart sect',exact:true});
  await expect(sect.getByRole('link')).toBeVisible({timeout:60_000});
  const sectLabel=await sect.getByRole('link').innerText();
  await sect.getByRole('link').click();
  await expect(page.locator('.natal-sect-article')).toContainText(`Complete cms/natal-chart-context/you/sect/${sectLabel.includes('Day chart')?'day':'night'} ending.`);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Back',exact:true}).click();await expect(sect.getByRole('link')).toBeFocused();
  const insights=page.getByRole('region',{name:'Insights',exact:true});
  await insights.getByRole('link').click();
  const insight=page.locator('.natal-insight-page');
  await expect(insight).toContainText('Complete cms/natal-twelfth-ruler/you/introduction ending.');
  await expect(insight).toContainText(/Complete cms\/natal-twelfth-ruler\/you\/ruler-house\/\d+ ending\./);
  await expect(insight.locator('.natal-sect-intro > p, .natal-sect-sections p')).toHaveCount(4);
  await insight.getByRole('button',{name:'Back',exact:true}).click();
  await expect(insights.getByRole('link')).toBeFocused();
  await page.getByRole('button',{name:'Open menu',exact:true}).click();
  await page.getByRole('menuitem',{name:'Account',exact:true}).click();
  await expect(page.getByRole('heading',{level:1,name:'Account',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Sign out/})).toBeVisible();
  const birthTime=page.getByRole('textbox',{name:'Birth time',exact:true});
  await birthTime.fill('11:30 AM');await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect(birthTime).toHaveValue('11:30');
  await expect.poll(()=>account.savedProfile().charts[0].birthTime).toBe('11:30');
  await page.reload();await expect(birthTime).toHaveValue('11:30');
  for (const item of await page.locator('.account-page .settings-row__value, .account-row-input, .account-page .settings-signout-row').all()) {
    await expect(item).toHaveCSS('font-family',/system-ui/);
    await expect(item).toHaveCSS('font-size','15px');
    await expect(item).toHaveCSS('line-height','22.5px');
    await expect(item).toHaveCSS('letter-spacing','normal');
  }
  for (const input of await page.locator('.account-row-input').all())await expect(input).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expectReadableTheme(page, '.account-page h1, .account-profile-row .profile-avatar, .account-editable-row > span, .account-page .settings-row-title');
  await page.screenshot({path:`test-results/design-account-${width}-${theme}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });

 test(`Circle rows and calculated feed ${width} ${theme}`,async({page})=>{
  test.setTimeout(90_000);await page.setViewportSize({width,height:1100});
  const natal=await seed(page,theme,width===1440&&theme==='light'?'on':'off');await authenticate(page);
  await page.route('**/rest/v1/rpc/list_social_friends',route=>route.fulfill({json:[{friendship_id:'fixture-friendship',user_id:'connected-fixture',display_name:'Connected Friend',handle:'connected_friend',natal_chart:natal,viewer_shares_chart:true,friend_shares_chart:true,accepted_at:now}]}));
  await page.goto('/#friends?tab=circle');
  await expect(page.locator('.friends-person-row').getByText('Connected Friend',{exact:true})).toBeVisible();
  await expect(page.locator('.friends-person-row')).toContainText('@connected_friend');
  await expect(page.getByRole('heading',{level:2,name:/Your circle/})).toBeVisible();
  await page.screenshot({path:`test-results/design-circle-${width}-${theme}.png`,fullPage:true});
  await page.route('**/rest/v1/rpc/create_social_share_invitation',route=>route.fulfill({json:[{invitation_id:'fixture-invite',invitation_token:'fixture-token',expires_at:'2026-11-12T16:00:00.000Z'}]}));
  await page.getByRole('button',{name:'Add',exact:true}).click();
  await page.getByRole('menuitem',{name:/^Invite friend/}).click();
  await page.getByRole('button',{name:'Create invite link',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your invite is ready.',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Copy invite link',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close invitation',exact:true}).click();

  await page.getByRole('tab',{name:/^Circle/}).focus();await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab',{name:'Feed',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('tab',{name:'Feed',exact:true})).toBeFocused();
  await expect(page.locator('.friends-timing-card').first()).toBeVisible({timeout:60_000});
  const feedCard=page.locator('.friends-timing-card').first();
  await expect(feedCard.locator('strong')).toHaveCSS('font-family',/Newsreader/);await expect(feedCard.locator('strong')).toHaveCSS('font-size','26px');await expect(feedCard.locator('strong')).toHaveCSS('font-weight','400');
  await expect(feedCard.locator('.friends-timing-card__body')).toHaveCSS('font-size','19px');await expect(feedCard.locator('.friends-timing-card__body')).toHaveCSS('line-height','28.5px');
  const previewBox=(await feedCard.locator('.friends-timing-card__body').boundingBox())!, arrowBox=(await feedCard.locator('.friends-timing-card__arrow').boundingBox())!;
  expect(arrowBox.y).toBeGreaterThanOrEqual(previewBox.y+previewBox.height+15);await expect(feedCard.locator('.card-read-more--icon')).toHaveCSS('width','44px');
  await expectReadableTheme(page,'.friends-timing-card strong, .friends-timing-card small, .friends-timing-card__body');
  await feedCard.screenshot({path:`test-results/card-feed-${width}-${theme}.png`});
  const sourceFilter=page.getByRole('combobox',{name:'Filter friends feed',exact:true});
  await expect(sourceFilter.locator('option')).toHaveText(['All','Circle','Charts']);
  await showRelationshipOutlooks(page);
  const savedPair=page.getByRole('article',{name:'You and Fixture Friend',exact:true});
  await expect(savedPair.locator('.pair-forecast-rating')).toHaveCount(3);
  await expect(page.locator('.friends-timing-card').filter({hasText:/Fixture Friend.*natal/}).first()).toBeVisible({timeout:60_000});
  await sourceFilter.selectOption('charts');await showRelationshipOutlooks(page);
  await expect(sourceFilter).toHaveValue('charts');
  await expect(page.getByRole('article',{name:'You and Connected Friend',exact:true})).toHaveCount(0);
  await expect(savedPair.locator('.pair-forecast-rating')).toHaveCount(3);
  await expect(page.locator('.friends-timing-card').filter({hasText:'Connected Friend'})).toHaveCount(0);
  await expect(page.locator('.friends-timing-card').first()).toContainText('Fixture Friend');
  await page.reload();await expect(sourceFilter).toHaveValue('charts');await showRelationshipOutlooks(page);
  await expect(savedPair.locator('.pair-forecast-rating')).toHaveCount(3,{timeout:60_000});
  await savedPair.locator('.pair-forecast-day-open').first().click();
  await expect(page.getByRole('dialog',{name:'You and Fixture Friend',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  const savedFeedUrl=page.url();
  await page.locator('.friends-timing-card').first().click();
  await expect(page.locator('.sky-detail-article h1')).toContainText('Fixture Friend');
  await page.reload();await expect(page.locator('.sky-detail-article')).toBeVisible();
  await page.getByRole('button',{name:'Close detail',exact:true}).click();
  await expect(page).toHaveURL(savedFeedUrl);await expect(sourceFilter).toHaveValue('charts');await showRelationshipOutlooks(page);
  await expect(savedPair.locator('.pair-forecast-rating')).toHaveCount(3);
  await sourceFilter.selectOption('all');await showRelationshipOutlooks(page);
  await expect(page.getByRole('article',{name:'You and Connected Friend',exact:true}).locator('.pair-forecast-rating')).toHaveCount(3);
  await expect(savedPair.locator('.pair-forecast-rating')).toHaveCount(3);
  await page.screenshot({path:`test-results/design-feed-all-sources-${width}-${theme}.png`,fullPage:true});
  await page.screenshot({path:`test-results/design-feed-all-sources-overview-${width}-${theme}.png`});
  await sourceFilter.selectOption('circle');await showRelationshipOutlooks(page);
  await expect(savedPair).toHaveCount(0);
  await expect(page.locator('.friends-timing-card').filter({hasText:'Fixture Friend'})).toHaveCount(0);
  await expect(page.locator('.friends-timing-card').first()).toContainText('Connected Friend');
  const pair=page.getByRole('article',{name:'You and Connected Friend',exact:true});
  await expect(pair.locator('.pair-forecast-rating')).toHaveCount(3);
  await expect(pair.locator('.pair-forecast-day-open:disabled')).toHaveCount(0);
  await expect(pair.locator('h3')).toHaveText('You and Connected Friend');
  await expect(page.locator('section.friends-feed-group[aria-label="Today"] > h2')).toHaveText('Today');
  await expect(page.locator('.friends-person-day > h3')).toHaveCount(0);
  await expect(pair.locator('h3')).toHaveCSS('font-size','26px');
  await expect(pair.locator('h3')).toHaveCSS('font-weight','400');
  await expect(pair.locator('h3')).toHaveCSS('line-height','29.9px');
  await expect(pair.locator('h3')).toHaveCSS('font-family',/Newsreader/);
  await expect(pair.locator('h3')).toHaveCSS('letter-spacing','normal');
  const tiles=await pair.locator('.pair-forecast-day').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y};}));
  expect(width<600 ? tiles[1].y>tiles[0].y && tiles[1].x===tiles[0].x : tiles[1].x>tiles[0].x && tiles[1].y===tiles[0].y).toBe(true);
  await expectReadableTheme(page,'.pair-forecast h3, .pair-forecast-identity > small, .pair-forecast-rating, .pair-forecast-contact strong, .pair-forecast-day-open > strong, .pair-forecast-day-open > small');
  for(let day=0;day<3;day++){
    const tile=pair.locator('.pair-forecast-day-open').nth(day);
    const rating=await tile.locator('.pair-forecast-rating').innerText();
    if(rating.includes('Mixed'))expect(await tile.locator('.pair-forecast-contact').count()).toBe(2);
    await tile.click();
    const detail=page.getByRole('dialog',{name:'You and Connected Friend',exact:true});
    await expect(detail.locator('.pair-forecast-detail-date')).toHaveText(`${day===0?'Today':['Tue','Wed','Thu'][day]}, Oct ${13+day}`);
    await expect(detail.locator('.pair-forecast-person')).toHaveCount(2);
    await expectReadableTheme(page,'.pair-forecast-dialog h2, .pair-forecast-dialog h3, .pair-forecast-dialog strong, .pair-forecast-dialog small');
    await page.keyboard.press('Escape');await expect(tile).toBeFocused();
  }
  await pair.getByRole('button',{name:'Options for You and Connected Friend',exact:true}).click();
  await pair.getByRole('button',{name:'How this is rated',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('not a complete Hellenistic judgment or a compatibility score.');
  await page.keyboard.press('Escape');
  await page.screenshot({path:`test-results/design-friction-flow-${width}-${theme}.png`,fullPage:true});
  await pair.screenshot({path:`test-results/design-friction-flow-card-${width}-${theme}.png`});
  await pair.getByRole('button',{name:'Options for You and Connected Friend',exact:true}).click();
  await pair.getByRole('button',{name:'Hide card',exact:true}).click();await expect(pair).toHaveCount(0);
  await page.reload();await expect(page.locator('.friends-timing-card').first()).toBeVisible({timeout:60_000});
  await expect(pair).toHaveCount(0);
  await showRelationshipOutlooks(page);
  await page.getByRole('button',{name:'Show hidden cards (1)',exact:true}).click();
  await expect(pair.locator('.pair-forecast-rating')).toHaveCount(3,{timeout:60_000});
  await expect(page.locator('.friends-birthday-summary h2')).toHaveText('Fixture Friend’s birthday');
  await expect(page.locator('.friends-birthday-summary small')).toHaveText('Fri, Jan 1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/design-feed-${width}-${theme}.png`,fullPage:true});
  const feedUrl=page.url(), feedHistoryLength=await page.evaluate(()=>history.length);
  await page.locator('.friends-timing-card').first().click();
  await expect(page.locator('.sky-detail-article')).toBeVisible();
  await expect(page.locator('.sky-detail-article h1')).toContainText('Connected Friend');
  await expect(page).toHaveURL(/transits/);
  await page.reload();await expect(page.locator('.sky-detail-article')).toBeVisible();
  await page.getByRole('button',{name:'Close detail',exact:true}).click();
  await expect(page).toHaveURL(feedUrl);
  await expect(page.getByRole('tab',{name:'Feed',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.friends-timing-card').first()).toBeVisible();
  // The saved-chart journey above leaves a forward article entry. Opening a
  // Circle reading may replace that entry rather than increase total length.
  expect(await page.evaluate(()=>history.length)).toBeLessThanOrEqual(feedHistoryLength+1);
  await page.goForward();await expect(page.locator('.sky-detail-article')).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await page.goBack();await expect(page).toHaveURL(feedUrl);
  await expect(page.locator('.friends-timing-card').first()).toBeVisible();
  await page.locator('.friends-timing-card').first().click();await expect(page.locator('.sky-detail-article')).toBeVisible();
  const canonicalArticle=page.url();
  await page.getByRole('button',{name:'Close detail',exact:true}).click();
  await expect(page).toHaveURL(feedUrl);
  await page.screenshot({path:`test-results/design-feed-return-${width}-${theme}.png`,fullPage:true});
  // Existing tabs can still contain the old duplicate article/hash entry.
  await page.goto(canonicalArticle);await expect(page.locator('.sky-detail-article')).toBeVisible();
  await page.evaluate(()=>{
    const parent=window.location.href, legacy=new URL(parent), detail=legacy.searchParams.get('detail')!;
    legacy.hash=`friends?tab=charts&chart=social%3Aconnected-fixture&view=transits&detail=${encodeURIComponent(detail)}`;
    history.replaceState({articleParent:parent,articleUrl:legacy.href},'',legacy.href);
  });
  await page.reload();await expect(page.locator('.sky-detail-article')).toBeVisible();
  await page.getByRole('button',{name:'Close detail',exact:true}).click();
  await expect(page.getByRole('tab',{name:'Feed',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.friends-timing-card').first()).toBeVisible();
  // Profile readers keep their profile as the immediate parent.
  await page.goto('/connected_friend/transits');
  await expect(page.locator('.friend-transit-row').first()).toBeVisible({timeout:60_000});
  const profileUrl=page.url();
  await page.locator('.friend-transit-row').first().click();await expect(page.locator('.sky-detail-article')).toBeVisible();
  await page.getByRole('button',{name:'Close detail',exact:true}).click();
  await expect(page).toHaveURL(profileUrl);
  await expect(page.locator('.friend-transit-row').first()).toBeVisible();
 });

 test(`birthday sidebar and saved chart actions ${width} ${theme}`,async({page})=>{
  test.setTimeout(90_000);await page.setViewportSize({width,height:1100});
  await seed(page,theme);await authenticate(page);
  await page.route('**/rest/v1/rpc/**',route=>route.fulfill({json:[]}));
  await page.route('**/rest/v1/manual_charts*',route=>route.fulfill({status:503,json:{message:'Synthetic unavailable sync'}}));
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('birthdays-seeded'))return;
    sessionStorage.setItem('birthdays-seeded','true');
    localStorage.setItem('tldrastro:friendsFeedSource:design-reader','circle');
    const key='tldrastro:manualCharts:design-reader', base=JSON.parse(localStorage.getItem(key)!)[0];
    localStorage.setItem(key,JSON.stringify([
      ['winter','Winter Friend','1990-01-01','person'],['tomorrow','Tomorrow Friend','1990-10-14','person'],
      ['today','Today Friend','1990-10-13','person'],['later','Later Friend','1990-11-20','person'],
      ['past','Past Friend','1990-10-12','person'],['event','Private Event','1990-10-13','event'],
      ['unknown','Unknown Birthday','','person']
    ].map(([id,displayName,birthDate,chartType])=>({...base,id,displayName,birthDate,chartType}))));
  });
  await page.goto('/?date=2026-10-13#friends?tab=feed');
  await expect(page.getByRole('heading',{level:1,name:'Friends',exact:true})).toBeVisible();
  const sidebar=page.locator('.friends-feed-sidebar');
  await expect(sidebar.locator('h2')).toHaveText('Today Friend, Tomorrow Friend, and Later Friend');
  await expect(sidebar.locator('small')).toHaveText('Today · Wed, Oct 14 · Fri, Nov 20');
  await expect(sidebar.getByRole('link')).toHaveCount(0);
  await expect(sidebar.getByText('Your circle',{exact:true})).toHaveCount(0);
  await expect(sidebar.getByText('Saved charts',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{level:2,name:'Your circle’s transits',exact:true})).toBeVisible();
  await expect(page.getByRole('heading')).toHaveText(width>800?['Friends','Your circle’s transits','Today Friend, Tomorrow Friend, and Later Friend']:['Friends','Your circle’s transits']);
  if(width>800){
    await expect(sidebar).toBeVisible();
    const headingStyle=await sidebar.locator('h2').evaluate(node=>{const s=getComputedStyle(node);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,tracking:s.letterSpacing,margin:s.margin,text:s.textTransform,align:s.textAlign};});
    expect(headingStyle).toMatchObject({size:'26px',weight:'400',line:'29.9px',tracking:'normal',margin:'0px',text:'none',align:'center'});
    expect(headingStyle.font).toContain('Newsreader');
    await expectReadableTheme(page,'.friends-birthday-summary > span, .friends-birthday-summary h2, .friends-birthday-summary small, .friends-birthday-more > span');
    await page.screenshot({path:`test-results/design-birthdays-${width}-${theme}.png`,fullPage:true});
    await sidebar.getByRole('button',{name:'2 more birthdays',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Friends’ birthdays',exact:true});
    await expect(dialog.locator('li strong')).toHaveText(['Today Friend','Tomorrow Friend','Later Friend','Winter Friend','Past Friend']);
    await expect(dialog.locator('li small')).toHaveText(['Today','Wed, Oct 14','Fri, Nov 20','Fri, Jan 1','Tue, Oct 12']);
    await expectReadableTheme(page,'.friends-birthdays-dialog h2, .friends-birthdays-dialog strong, .friends-birthdays-dialog small');
    await page.keyboard.press('Escape');await expect(sidebar.getByRole('button',{name:'2 more birthdays',exact:true})).toBeFocused();
    await sidebar.getByRole('button',{name:'View friends’ birthdays',exact:true}).click();
    await dialog.getByRole('button',{name:/Today Friend/}).click();
    await expect(page.locator('.friend-profile-heading h1')).toHaveText('Today Friend');
    await expect(page).toHaveURL(/chart=today.*view=natal/);
    await page.reload();await expect(page.locator('.friend-profile-heading h1')).toHaveText('Today Friend');
    await page.goto('/?date=2026-10-13#friends?tab=feed');
    await expect(sidebar.locator('h2')).toHaveText('Today Friend, Tomorrow Friend, and Later Friend');
  } else await expect(sidebar).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>localStorage.setItem('tldrastro:manualCharts:design-reader','[]'));
  await page.reload();
  await expect(sidebar.locator('h2')).toHaveText('No saved birthdays');
  await expect(sidebar.locator('p')).toHaveText('Birthdays appear here when a saved person’s chart includes a birth date.');
  await expect(sidebar.getByRole('button')).toHaveCount(0);
  if(width>800)await expectReadableTheme(page,'.friends-birthday-summary > span, .friends-birthday-summary h2, .friends-feed-sidebar > p');
  await page.screenshot({path:`test-results/design-birthdays-empty-${width}-${theme}.png`,fullPage:true});
 });

 if(width===1440&&theme==='light')test('birthday sidebar survives transit loading and failure',async({page})=>{
  test.setTimeout(60_000);await page.setViewportSize({width,height:1100});await seed(page,theme);await authenticate(page);
  let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
  const contentKey='authored/transit-aspect/fixture-birthday-check';
  await page.route('**/rest/v1/content_publications*',route=>route.fulfill({json:[{content_key:contentKey,state:'live',revision:1,row_id:'dddddddd-dddd-4ddd-bddd-dddddddddddd',row_updated_at:now,updated_at:now}]}));
  await page.route('**/api/content-reader',async route=>{
    if(route.request().postDataJSON().keys?.includes(contentKey)){await held;await route.fulfill({status:503,json:{error:'Synthetic transit read failure'}});}
    else await route.fulfill({json:readerResponse([])});
  });
  try{
    await page.goto('/?date=2026-10-13#friends?tab=feed');
    await expect(page.getByRole('status').filter({hasText:'Loading transits…'})).toHaveText('Loading transits…');
    await expect(page.locator('.loading-pattern--feed')).toBeVisible();
    await expect(page.locator('.friends-birthday-summary h2')).toHaveText('Fixture Friend’s birthday');
    release();
    await expect(page.getByRole('alert')).toContainText('The transit readings could not load. Please try again.');
    await expect(page.locator('.friends-birthday-summary h2')).toBeVisible();
    await page.locator('.friends-feed-sidebar').getByRole('button',{name:'View friends’ birthdays',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Friends’ birthdays',exact:true})).toContainText('Fixture Friend');
    await page.keyboard.press('Escape');
  }finally{release();}
 });

 test(`Guide and Learn retain complete readings ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1100});await seed(page,theme);
  const rows=[
    {id:'cccccccc-cccc-4ccc-cccc-ccccccccccc1',content_key:'article/guide/design-fixture',surface:'education',headline:'Fixture guide',body:'Complete guide opening.\n\nComplete guide final paragraph.'},
    {id:'cccccccc-cccc-4ccc-cccc-ccccccccccc2',content_key:'education/astro-101/point/ascendant',surface:'education',headline:'Fixture Ascendant',body:'Complete learning opening.\n\nComplete learning final paragraph.',facts:{slug:'/learn/points/ascendant'},sections:{kind:'point'}}
  ].map(row=>({...row,mode:'article',status:'LIVE',lane:'serving',review_state:null,updated_at:now}));
  await page.route('**/api/content-reader',route=>{const q=route.request().postDataJSON();return route.fulfill({json:readerResponse(rows.filter(row=>q.keys?.includes(row.content_key)||(q.prefix&&row.content_key.startsWith(q.prefix))))});});
  await page.goto('/#articles');
  await page.getByRole('searchbox',{name:'Search articles and guides',exact:true}).fill('Fixture');
  const guideTitle=page.locator('.articles-library-card h2').first();await expect(guideTitle).toHaveCSS('font-family',/system-ui/);await expect(guideTitle).toHaveCSS('font-size','15px');await expect(guideTitle).toHaveCSS('font-weight','500');
  await page.locator('.articles-library-card').first().screenshot({path:`test-results/card-guide-${width}-${theme}.png`});
  await page.getByRole('link').filter({has:page.getByRole('heading',{name:'Fixture guide',exact:true})}).click();
  await expect(page.locator('.learn-article-body')).toContainText('Complete guide final paragraph.');
  await page.reload();await expect(page.locator('.learn-article-body')).toContainText('Complete guide final paragraph.');
  await page.screenshot({path:`test-results/design-guide-${width}-${theme}.png`,fullPage:true});
  await page.getByRole('link',{name:'Back to Articles & Guides',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Articles & Guides',exact:true})).toBeVisible();
  await page.goto('/learn/points/ascendant');
  await expect(page.getByRole('heading',{level:1,name:'Fixture Ascendant',exact:true})).toBeVisible();
  await expect(page.locator('.learn-article-body')).toContainText('Complete learning final paragraph.');
  await page.reload();await expect(page.locator('.learn-article-body')).toContainText('Complete learning final paragraph.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/design-learn-${width}-${theme}.png`,fullPage:true});
 });

}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Handoff v4 authentication dialog ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000); await page.setViewportSize({ width, height: 1100 }); await seed(page, theme);
    await page.addInitScript(() => localStorage.removeItem('tldrastro:userProfile'));
    await page.goto('/#friends?tab=circle');
    await expect(page.getByRole('heading', { name: 'Sign in to see your friends', exact: true })).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Friends views' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Continue with Google', exact: true })).toHaveCSS('height', '52px');
    await expect(dialog.getByRole('button', { name: 'Log in', exact: true }).first()).toHaveCSS('height', '52px');
    await expect(dialog.getByRole('heading', { name: 'Log in', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continue with Google', exact: true })).toBeVisible();
    await expect(dialog.getByText('Continue with phone', { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/#friends\?tab=circle$/);
    const panel = (await dialog.boundingBox())!;
    if (width === 390) { expect(panel.x).toBe(0); expect(panel.y).toBe(0); expect(panel.width).toBe(390); expect(panel.height).toBe(1100); }
    else { expect(panel.width).toBeLessThan(600); expect(panel.x).toBeGreaterThan(350); }
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Create an account', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Create an account', exact: true })).toBeVisible();
    await expect(dialog.getByLabel('Birth date', { exact: true })).toHaveCount(0);
    const user = { id: 'new-fixture-reader', email: 'new-reader@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {} };
    await page.route('**/auth/v1/signup**', route => route.fulfill({ json: { user, session: null } }));
    await page.route('**/auth/v1/resend**', route => route.fulfill({ json: { message_id: 'synthetic-email' } }));
    await dialog.getByLabel('Email', { exact: true }).fill(user.email);
    await dialog.getByLabel('Password', { exact: true }).fill('synthetic-password-only');
    await dialog.getByRole('button', { name: 'Create an account', exact: true }).first().click();
    await expect(dialog.getByRole('heading', { name: 'Check your email', exact: true })).toBeVisible();
    await expect(dialog).toContainText(user.email);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tldrastro:pendingSignup') ?? 'null')?.password ?? '')).not.toContain('synthetic-password-only');
    await dialog.getByRole('button', { name: 'Resend email', exact: true }).click();
    await expect(dialog.getByRole('status')).toHaveText('A new confirmation email was sent.');
    await page.screenshot({ path: `test-results/handoff-v4-auth-${width}-${theme}.png` });
    await dialog.getByRole('button', { name: 'Use a different email', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Create an account', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page).toHaveURL(/#friends\?tab=circle$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const path of ['/#calendar', '/#sky/placement/mercury/scorpio']) {
      await page.goto(path);
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.getByRole('menuitem', { name: 'You', exact: true }).click();
      await expect(dialog.getByRole('heading', { name: 'Create an account', exact: true })).toBeVisible();
      expect(new URL(page.url()).hash).toBe(path.slice(1));
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      expect(new URL(page.url()).hash).toBe(path.slice(1));
      if (path.includes('placement')) await expect(page.getByRole('region', { name: 'Mercury in Scorpio', exact: true })).toBeVisible();
    }
  });

  test(`Handoff v4 Sky and retrograde comparison ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000); await page.setViewportSize({ width, height: 1100 }); await seed(page, theme); await authenticate(page);
    await page.goto('/?date=2026-10-13#sky');
    await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
    const effort = page.locator('.sky-debility-ledger');
    await expect(effort).toBeVisible(); await expect(effort.locator('mark')).toHaveCount(0);
    await expect(effort.locator('.sky-today-ledger__head h3')).toHaveCSS('font-size', '36px');
    await expect(effort.locator('.sky-today-ledger__copy p').first()).toHaveCSS('font-size', '19px');
    await expect(effort.getByRole('link').filter({ has: page.locator('.sky-debility-card__copy') }).first()).toBeVisible();
    const head = (await effort.locator('.sky-today-ledger__head').boundingBox())!, copy = (await effort.locator('.sky-today-ledger__copy').boundingBox())!, cards = (await effort.locator('.sky-debility-cards').boundingBox())!;
    expect(Math.abs(head.x - copy.x)).toBeLessThan(1); expect(Math.abs(head.x - cards.x)).toBeLessThan(1);
    const explain = effort.getByRole('button', { name: 'What is dignity?', exact: true });
    const action = (await explain.boundingBox())!;
    if (width === 390) expect(action.y).toBeGreaterThanOrEqual(cards.y + cards.height);
    else expect(Math.abs(action.y + action.height / 2 - head.y - head.height / 2)).toBeLessThan(1);
    await explain.click();
    await expect(page.getByRole('dialog')).toContainText('A planet is in detriment when it is in the sign opposite one it rules.');
    await expect(page.getByRole('dialog')).toContainText('In both cases, it has to work differently to do what usually comes more easily.');
    await page.keyboard.press('Escape'); await expect(explain).toBeFocused();
    await effort.scrollIntoViewIfNeeded(); await page.screenshot({ path: `test-results/handoff-v4-sky-${width}-${theme}.png` });
    await page.goto('/?date=2026-10-24#sky/placement/mercury/scorpio');
    await expect(page.locator('#sky-detail-title')).toHaveText('Mercury Rx in Scorpio', { timeout: 60_000 });
    await expect(page.locator('.article-duration').nth(1)).toContainText('Mercury in Scorpio');
    const cycles = page.locator('.retrograde-cycles--article'); await expect(cycles).toBeVisible({ timeout: 60_000 });
    await expect(cycles.locator('.retrograde-cycles__section[open]')).toHaveCount(0);
    await cycles.locator('.retrograde-cycles__section > summary').first().click();
    const comparison = cycles.locator('.retrograde-cycles__compare'); await comparison.locator('summary').click();
    await expect(comparison.locator('thead th')).toHaveText(['Year', 'Stations retrograde', 'Sign change', 'Stations direct', 'Length']);
    await expect(comparison.locator('tbody tr')).toHaveCount(3); await expect(comparison.locator('.retrograde-cycles__bar')).toHaveCount(3);
    await expect(comparison.locator('tbody .is-current th')).toContainText('2026');
    await expect(comparison.locator('tbody .is-current td').first()).toContainText('Oct 24');
    await expect(comparison.locator('tbody .is-current td').nth(2)).toContainText('Nov 13');
    await expect(comparison.locator('tbody th').first()).toHaveCSS('font-weight', '600');
    await expect(comparison.locator('tbody td').first()).toHaveCSS('font-weight', '400');
    expect(await comparison.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await comparison.scrollIntoViewIfNeeded(); await page.screenshot({ path: `test-results/handoff-v4-cycles-${width}-${theme}.png` });
    await page.reload(); await expect(page.locator('#sky-detail-title')).toBeVisible();
    await expect(page.locator('.retrograde-cycles__section[open]')).toHaveCount(0);
    await page.goto('/?date=2026-10-03#sky/placement/venus/scorpio');
    await expect(page.locator('#sky-detail-title')).toContainText('Venus');
    await expect(cycles.locator('.retrograde-cycles__section')).toHaveCount(2);
    await cycles.locator('.retrograde-cycles__section > summary').first().click();
    const cycleCopy = cycles.locator('p:visible').first();
    await expect(cycleCopy).toHaveText(retrogradeCycleCopy.previousBody);
    await expect(cycleCopy).toHaveCSS('font-family', /Newsreader/);
    await expect(cycleCopy).toHaveCSS('font-size', '19px');
    await expect(cycleCopy).toHaveCSS('font-weight', '400');
    await expect(cycleCopy).toHaveCSS('line-height', '28.5px');
    await expect(cycleCopy).toHaveCSS('letter-spacing', 'normal');
    await cycleCopy.scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/qa-retrograde-body-${width}-${theme}.png`});
    await page.reload();
    await expect(cycles.locator('.retrograde-cycles__section')).toHaveCount(2);
    await expect(cycles.locator('.retrograde-cycles__section[open]')).toHaveCount(0);
    await cycles.locator('.retrograde-cycles__section > summary').first().click();
    await expect(cycleCopy).toHaveText(retrogradeCycleCopy.previousBody);
  });

  test(`Handoff v4 horoscope empty state ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 }); await seed(page, theme);
    await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([]) }));
    await page.goto('/#horoscopes');
    for (const period of ['Daily', 'Weekly', 'Monthly', 'Seasonal']) {
      const button = page.getByRole('button', { name: period, exact: true }); await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('heading', { name: `No ${period.toLowerCase()} reading yet`, exact: true })).toBeVisible();
      await expect(page.locator('.horoscope-empty > p')).toHaveCount(1);
      await expect(page.locator('.horoscope-empty')).toContainText('America/New York');
      await expect(page.locator('.horoscope-empty a, .horoscope-explore')).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Horoscope editions' })).toBeVisible();
    }
    await page.reload(); await expect(page.getByRole('button', { name: 'Seasonal', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'No seasonal reading yet', exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/handoff-v4-empty-${width}-${theme}.png` });
  });
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) test(`Handoff v4 verified signup and unknown birth time ${width} ${theme}`, async ({ page, baseURL }) => {
  test.setTimeout(90_000); await page.setViewportSize({ width, height: 1100 }); await seed(page, theme);
  await page.addInitScript(() => localStorage.removeItem('tldrastro:userProfile'));
  const user = { id: 'new-fixture-reader', email: 'new-reader@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: theme === 'dark' ? 'google' : 'email' }, user_metadata: { name: 'New Fixture' } };
  let authenticated = false, persisted: any = null;
  await page.route('**/auth/v1/**', route => {
    if (route.request().url().includes('/signup')) { authenticated = true; return route.fulfill({ json: { access_token: 'synthetic-signup-session', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user } }); }
    if (route.request().url().includes('/authorize')) return route.fulfill({ contentType: 'text/html', body: '<p>Isolated Google authorization handoff</p>' });
    return route.fulfill({ json: authenticated ? user : null });
  });
  await page.route('**/rest/v1/user_profiles*', route => {
    if (route.request().method() === 'POST') persisted = route.request().postDataJSON().data;
    return route.fulfill({ json: { data: persisted } });
  });
  await page.route('https://api.mapbox.com/search/geocode/v6/forward?**', route => route.fulfill({ json: { features: [{ id: 'fixture-ny', properties: { name: 'New York', place_formatted: 'New York, United States', context: { region: { name: 'New York' } }, coordinates: { latitude: 40.7, longitude: -74 } } }] } }));
  await page.goto('/#friends?tab=charts');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  const dialog = page.getByRole('dialog');
  if (theme === 'dark') {
    await dialog.getByRole('button', { name: 'Continue with Google', exact: true }).click();
    await expect(page).toHaveURL(/auth\/v1\/authorize/);
    const redirect = new URL(page.url()).searchParams.get('redirect_to')!; expect(new URL(redirect).origin).toBe(new URL(baseURL!).origin);
    authenticated = true;
    const authKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
    await page.addInitScript(({ authKey, user, now }) => localStorage.setItem(authKey, JSON.stringify({ access_token: 'synthetic-google-session', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_at: Date.parse(now) / 1000 + 3600, user })), { authKey, user, now });
    await page.goto('/#friends?tab=charts');
  } else {
    await dialog.getByLabel('Email', { exact: true }).fill(user.email); await dialog.getByLabel('Password', { exact: true }).fill('synthetic-password-only');
    await dialog.getByRole('button', { name: 'Create an account', exact: true }).first().click();
  }
  await expect(dialog.getByRole('heading', { name: 'Your chart', exact: true })).toBeVisible();
  await expect(dialog).toContainText('Step 3 of 3');
  await page.reload(); await expect(dialog.getByRole('heading', { name: 'Your chart', exact: true })).toBeVisible();
  await dialog.getByLabel('Name', { exact: true }).fill('New Fixture Reader');
  await dialog.getByRole('button', { name: 'They / Them', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'They / Them', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectReadableTheme(page, '.auth-flow-pronouns button, .auth-flow-v2 legend, .auth-flow-heading h1');
  await dialog.getByLabel('Birth date', { exact: true }).fill('1990-01-01');
  await expect(dialog.getByLabel('Birth date', { exact: true })).toHaveCSS('height', '52px');
  await expect(dialog.locator('.auth-flow-city > label > span').first()).toHaveCSS('text-transform', 'none');
  await expect(dialog.locator('.auth-flow-city > label > span').first()).toHaveCSS('font-size', '14px');
  await dialog.getByRole('checkbox', { name: /I don.t know my birth time/ }).check();
  await expect(dialog.getByLabel('Birth hour', { exact: true })).toBeDisabled(); await expect(dialog.getByLabel('Birth minute', { exact: true })).toHaveValue('');
  await expect(dialog).toContainText('Your chart uses noon. Houses and your Rising sign stay hidden until you add a time.');
  await dialog.getByRole('checkbox', { name: /I don.t know my birth time/ }).uncheck();
  await dialog.getByLabel('Birth hour', { exact: true }).fill('9'); await dialog.getByLabel('Birth minute', { exact: true }).fill('45');
  await dialog.getByRole('button', { name: 'AM', exact: true }).click(); await expect(dialog.getByRole('button', { name: 'AM', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectReadableTheme(page, '.auth-flow-time button');
  await dialog.getByRole('checkbox', { name: /I don.t know my birth time/ }).check();
  for (const label of ['Birth place', 'Current city']) {
    await expect(dialog.getByLabel(label, { exact: true })).toHaveCSS('height', '52px');
    await expect(dialog.getByLabel(label, { exact: true })).toHaveCSS('font-size', '15px');
    await dialog.getByLabel(label, { exact: true }).fill('New York');
    await dialog.getByRole('option', { name: /New York/ }).first().click();
  }
  await page.screenshot({ path: `test-results/handoff-v4-your-chart-${width}-${theme}.png` });
  await dialog.getByRole('button', { name: 'Save chart', exact: true }).click(); await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/#friends\?tab=charts$/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tldrastro:userProfile') ?? '{}').name)).toBe('New Fixture Reader');
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('tldrastro:userProfile')!));
  expect(profile.pronouns).toBe('they'); expect(profile.charts[0].birthTime).toBe('Time unknown'); expect(profile.rising).toBe('Rising pending'); expect(profile.currentLocationData.latitude).toBe(40.7);
  expect(JSON.stringify(profile)).not.toContain('synthetic-password-only');
  await expect.poll(() => persisted?.profile?.name).toBe('New Fixture Reader');
  expect(persisted.profile.pronouns).toBe('they');
  await page.reload();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tldrastro:userProfile') ?? '{}').name)).toBe('New Fixture Reader');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const [width, theme] of [[390, 'dark'], [1440, 'light']] as const) test(`Handoff v4 password recovery ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1100 }); await seed(page, theme);
  await page.addInitScript(() => localStorage.removeItem('tldrastro:userProfile'));
  let recovery: any = null;
  await page.route('**/auth/v1/recover**', route => { recovery = { body: route.request().postDataJSON(), url: route.request().url() }; return route.fulfill({ json: {} }); });
  await page.goto('/#friends?tab=circle'); await page.getByRole('button', { name: 'Log in', exact: true }).click();
  let dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  await dialog.getByLabel('Email', { exact: true }).fill('reader@example.test'); await dialog.getByRole('button', { name: 'Send reset link', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Check your email for a link to reset your password.');
  expect(recovery.body.email).toBe('reader@example.test'); expect(new URL(new URL(recovery.url).searchParams.get('redirect_to')!).searchParams.get('auth')).toBe('recovery');
  await authenticate(page);
  let password = '';
  await page.route('**/auth/v1/user', route => { if (route.request().method() === 'PUT') password = route.request().postDataJSON().password; return route.fulfill({ json: { id: 'design-reader', email: 'reader@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { name: 'Fixture Reader' } } }); });
  await page.goto('/?auth=recovery#you'); dialog = page.getByRole('dialog'); await expect(dialog.getByRole('heading', { name: 'Choose a new password', exact: true })).toBeVisible();
  await dialog.getByLabel('Password', { exact: true }).fill('synthetic-reset-password'); await dialog.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(dialog).toHaveCount(0); expect(password).toBe('synthetic-reset-password'); await expect(page).not.toHaveURL(/auth=recovery/); await expect(page).not.toHaveURL(/friends\?tab=requests/);
});


for (const width of [320,390,768,1440]) test(`Persistent header theme control and dark readability ${width}`,async({page})=>{
  test.setTimeout(180_000);await page.setViewportSize({width,height:1100});
  const natal=await seed(page,'light');await authenticate(page);
  await page.route('**/rest/v1/rpc/list_social_friends',route=>route.fulfill({json:[{friendship_id:'theme-friendship',user_id:'theme-connected',display_name:'Theme Friend',handle:'theme_friend',natal_chart:natal,viewer_shares_chart:true,friend_shares_chart:true,accepted_at:now}]}));
  await page.route('**/rest/v1/user_generated_interpretations?**',route=>route.fulfill({json:[]}));
  const routes=[
    ['sky','.sky-page > .today-hero','.sky-page h1, .sky-daily-summary__body, .planet-placement-row__title, .planet-placement-row__description, .planet-placement-row__meta','.sky-daily-summary__body'],
    ['calendar','.lunar-calendar-header','.lunar-calendar-header h1, .lunar-calendar-header button, .calendar-stoic-card__excerpt',''],
    ['horoscopes','.horoscope-periods','.horoscope-periods button',''],
    ['articles','.articles-library-header','.articles-library-header h1, .articles-library-header p, .articles-library-filters label',''],
    ['you','.you-transit-overview','.you-chart-page h1, .you-transit-overview p, .daily-dodont li, .updates-aspect-row__title, .updates-aspect-row__description','.you-transit-overview p, .daily-dodont li'],
    ['you?tab=chart','.natal-placement-sections','.you-chart-page h1, .placement-table-row__title, .placement-table-row__description, .placement-table-row__meta','.placement-table-row__description'],
    ['friends?tab=feed','.friends-timing-card','.friends-workspace-heading h1, .friends-timing-card strong, .friends-timing-card small, .friends-timing-card__body','.friends-timing-card__body'],
    ['settings','.settings-header','.settings-page h1, .settings-row-title, .settings-row-description',''],
    ['account','.account-page-heading','.account-page h1, .account-editable-row > span',''],
    ['sky/placement/mercury/scorpio','.sky-detail-article','.sky-detail-article h1, .sky-detail-article p, .sky-detail-article summary','.sky-detail-article .article-body-inner p'],
    ['reports','.report-library-header','.report-library-header h1, .report-library-empty .type-card-title, .report-library-empty p','.report-library-empty p'],
  ];
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const [route,first,readable,narrative] of routes){
    await page.goto(route==='reports'?'/reports/':`/?date=2026-10-13#${route}`);
    await expect(page.locator(first).first()).toBeVisible({timeout:60_000});
    if(route==='sky')await expect(page.getByLabel('Daily sky summary')).toBeVisible({timeout:60_000});
    const toggle=page.locator('.topbar-actions > .theme-toggle');
    await expect(toggle).toBeVisible();
    if(await page.locator('html').getAttribute('data-theme')==='dark')await toggle.click();
    await expect(toggle).toHaveAccessibleName('Switch to dark mode');await expect(toggle.locator('svg')).toHaveClass(/lucide-moon/);
    await page.mouse.move(0,0);await expect(toggle).toHaveCSS('transform','none');await expect(page.locator('.menu-toggle')).toHaveCSS('transform','none');
    const geometry=await page.locator('.topbar').evaluate(header=>{
      const nav=header.querySelector('.nav-pill')!.getBoundingClientRect(),theme=header.querySelector('.theme-toggle')!.getBoundingClientRect(),menu=header.querySelector('.menu-toggle')!.getBoundingClientRect();
      return {navRight:nav.right,themeX:theme.x,themeRight:theme.right,menuX:menu.x,themeY:theme.y,menuY:menu.y,navY:nav.y,themeSize:theme.width,menuSize:menu.width,visible:theme.x>=0&&menu.right<=innerWidth};
    });
    expect(geometry.navRight).toBeLessThan(geometry.themeX);expect(geometry.themeRight).toBeLessThan(geometry.menuX);expect(geometry.themeY).toBe(geometry.menuY);expect(geometry.themeY).toBe(geometry.navY);expect(geometry.themeSize).toBe(geometry.menuSize);expect(geometry.themeSize).toBe(width<=720?48:56);expect(geometry.visible).toBe(true);
    await expectReadableTheme(page,readable);
    await toggle.focus();await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(toggle).toHaveAccessibleName('Switch to light mode');await expect(toggle.locator('svg')).toHaveClass(/lucide-sun/);
    await expect.poll(()=>page.evaluate(()=>localStorage.getItem('tldrastro:theme'))).toBe('dark');
    await expect(async()=>await expectReadableTheme(page,readable)).toPass({timeout:2000});
    if(narrative)await expectRenderedTextContrast(page,narrative,7);
    if(route!=='reports'){
      await page.getByRole('button',{name:'Open menu',exact:true}).click();
      const appearance=page.locator('.site-menu-theme');await expect(appearance.getByRole('button',{name:'dark',exact:true})).toHaveAttribute('aria-pressed','true');
      await appearance.getByRole('button',{name:'light',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await expect(toggle).toHaveAccessibleName('Switch to dark mode');
      await page.keyboard.press('Escape');await toggle.click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    }
    await page.reload();await expect(page.locator(first).first()).toBeVisible({timeout:60_000});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(toggle).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`test-results/theme-refinement-${route.replace(/[^a-z]+/g,'-')}-${width}-dark.png`});
  }
  expect(errors).toEqual([]);
});

for(const width of [320,1440]) test(`Dark route error keeps navigation clear ${width}`,async({page})=>{
  test.setTimeout(90_000);await page.setViewportSize({width,height:1000});await seed(page,'dark');await authenticate(page);
  await page.route(/\/assets\/Friends(?:Route|WorkspaceShell)-[^/]+\.js$/,route=>route.abort('failed'));
  await page.goto('/#friends?tab=feed');
  const error=page.locator('.app-shell > .load-error--page');await expect(error).toBeVisible({timeout:60_000});
  const nav=(await page.locator('.nav-pill').boundingBox())!,card=(await error.boundingBox())!;
  expect(card.y-nav.y-nav.height).toBeCloseTo(width<=720?64:80,0);await expect(error.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
  await expectReadableTheme(page,'.load-error--page p, .load-error--page h2, .load-error__retry');
  await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('menuitem',{name:'Guide',exact:true}).click();await expect(page.locator('.articles-library-header')).toBeVisible();
});

async function expectUnifiedSkyBody(page: Page, family = 'Newsreader') {
  const copy=page.locator('.sky-daily-summary__body, .sky-daily-summary__body p, .sky-daily-summary__body a, .sky-daily-summary__body mark, .sky-debility-ledger .sky-today-ledger__copy, .sky-debility-ledger .sky-today-ledger__copy p, .sky-debility-ledger .sky-today-ledger__copy a, .sky-page .planet-placement-row__description');
  const metrics=await copy.evaluateAll(nodes=>nodes.map(node=>{const s=getComputedStyle(node);return {family:s.fontFamily,size:s.fontSize,weight:s.fontWeight,leading:s.lineHeight,tracking:s.letterSpacing};}));
  expect(metrics.length).toBeGreaterThan(20);
  for(const metric of metrics){expect(metric.family).toContain(family);expect(metric.size).toBe('19px');expect(metric.weight).toBe('400');expect(metric.leading).toBe('28.5px');expect(metric.tracking).toBe('normal');}
  const highlight=page.locator('.sky-daily-summary__body mark').first();await expect(highlight).toBeVisible();
  const inline=await highlight.evaluate(node=>{const current=getComputedStyle(node),parent=getComputedStyle(node.parentElement!);return ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing'].every(key=>current[key as keyof CSSStyleDeclaration]===parent[key as keyof CSSStyleDeclaration]);});expect(inline).toBe(true);
}

for(const width of [320,390,768,1440]) for(const theme of ['light','dark']) test(`Unified Sky body typography ${width} ${theme}`,async({page})=>{
  test.setTimeout(90_000);await page.setViewportSize({width,height:1100});await seed(page,theme);
  await page.goto('/?date=2026-10-13#sky');const summary=page.getByLabel('Daily sky summary');await expect(summary).toBeVisible({timeout:60_000});
  const effort=page.locator('.sky-debility-ledger');await expect(effort.locator('.sky-today-ledger__copy p').first()).toBeVisible();await expect(page.locator('.sky-placement-group .planet-placement-row')).toHaveCount(14);
  await page.evaluate(()=>document.fonts.ready);await expectUnifiedSkyBody(page);
  const reading=await summary.locator(':scope > p').allTextContents(),effortParagraphs=await effort.locator('.sky-today-ledger__copy p').allTextContents();
  const headings=await effort.locator('h3').allTextContents();expect(headings).toEqual(['Things may take more effort right now']);
  await effort.getByRole('button',{name:'What is dignity?',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();expect(await dialog.locator('p').count()).toBeGreaterThan(0);
  for(const p of await dialog.locator('p').all()){await expect(p).toHaveCSS('font-family',/Newsreader/);await expect(p).toHaveCSS('font-size','19px');await expect(p).toHaveCSS('line-height','28.5px');}
  await page.keyboard.press('Escape');await expect(effort.getByRole('button',{name:'What is dignity?',exact:true})).toBeFocused();
  await expectReadableTheme(page,'.sky-daily-summary__body p, .sky-daily-summary__body mark, .sky-today-ledger__copy p, .planet-placement-row__description');
  await page.mouse.move(0,0);
  if(theme==='dark'){
    await expectRenderedTextContrast(page,'.sky-daily-summary__body, .sky-debility-ledger .sky-today-ledger__copy',7);
    for(const line of await page.locator('.sky-page .aspect-line-hard line').all()) await expect(line).toHaveCSS('mix-blend-mode','normal');
  }
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-results/sky-body-unified-${width}-${theme}.png`});await effort.screenshot({path:`test-results/sky-body-detriment-${width}-${theme}.png`});
  const destination=summary.getByRole('link').first();await destination.click();await expect(page.locator('.sky-detail-article')).toBeVisible({timeout:60_000});await page.reload();await expect(page.locator('.sky-detail-article')).toBeVisible();await page.getByRole('button',{name:'Close detail',exact:true}).click();
  await expect(summary.locator(':scope > p')).toHaveText(reading);await expect(effort.locator('.sky-today-ledger__copy p')).toHaveText(effortParagraphs);await expectUnifiedSkyBody(page);
  await page.reload();await expect(summary).toBeVisible({timeout:60_000});await expectUnifiedSkyBody(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const [width,theme] of [[390,'light'],[1440,'dark']] as const) test(`Unified Sky body retains accessible font ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1100});await seed(page,theme);await page.addInitScript(()=>localStorage.setItem('tldrastro:dyslexiaFont','true'));
  await page.goto('/?date=2026-10-13#sky');await expect(page.getByLabel('Daily sky summary')).toBeVisible({timeout:60_000});await expect(page.locator('.sky-placement-group .planet-placement-row')).toHaveCount(14);
  await expectUnifiedSkyBody(page,'Atkinson Hyperlegible');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for (const width of [320, 390, 768, 1440]) for (const theme of ['light', 'dark']) test(`Handoff v5 shared type and surfaces ${width} ${theme}`, async ({ page }) => {
  test.setTimeout(180_000); await page.setViewportSize({ width, height: 1100 }); await seed(page, theme); await authenticate(page);
  const guide = { id: 'handoff-five-guide', content_key: 'article/guide/handoff-five', surface: 'education', headline: 'Complete fixture guide', summary: 'Complete fixture summary.', body: 'Complete fixture opening.\n\nComplete fixture final paragraph.', mode: 'article', status: 'LIVE', lane: 'serving', review_state: null, updated_at: now };
  await page.route('**/api/content-reader', route => {
    const query = route.request().postDataJSON();
    if (query.prefix && ['article/manual/', 'article/guide/', 'sky-article/'].includes(query.prefix)) return route.fulfill({ json: readerResponse(guide.content_key.startsWith(query.prefix) ? [guide] : []) });
    if (query.keys?.includes(guide.content_key)) return route.fulfill({ json: readerResponse([guide]) });
    return route.fallback();
  });
  const cases = [
    { route: 'sky', title: '.sky-intro__lead', body: '.sky-daily-summary__body p', surface: '.sky-debility-card' },
    { route: 'you', title: '.you-profile-copy h1', body: '.you-transit-overview .daily-horoscope-summary p, .you-transit-overview .daily-dodont li', surface: '.you-transit-grid .updates-aspect-row' },
    { route: 'you?tab=chart', title: '.you-profile-copy h1', body: '.natal-placement-sections .placement-table-row__description', surface: '.natal-placement-sections .placement-table-row' },
    { route: 'friends?tab=feed', title: '.friends-workspace-heading h1', body: '.friends-timing-card__body', surface: '.friends-timing-card' },
    { route: 'sky/placement/mercury/scorpio', title: '#sky-detail-title', body: '.article-body-inner p', surface: '.sky-detail-card' },
    { route: 'articles', title: '.articles-library-header h1', body: '.articles-library-header p, .articles-library-card p', surface: '.articles-library-card' },
    { route: 'articles/article%2Fguide%2Fhandoff-five', title: '.learn-article-header h1', body: '.learn-article-body p', surface: '.learn-sheet--article' },
    { route: 'calendar', title: '.lunar-calendar-header h1', body: '.calendar-sky-card__body p:not([aria-hidden])', surface: '.calendar-sky-card' },
  ];
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const item of cases) {
    await page.goto(`/?date=2026-10-13#${item.route}`);
    const title = page.locator(item.title); await expect(title).toBeVisible({ timeout: 60_000 });
    await expect(page.locator(item.body).first(), item.route).toBeVisible({ timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await expect(title).toHaveCSS('font-family', /Newsreader/); await expect(title).toHaveCSS('font-size', '36px'); await expect(title).toHaveCSS('font-weight', '400'); await expect(title).toHaveCSS('line-height', '40.32px');
    await expect(page.locator('h1')).toHaveCount(1);
    for (const paragraph of await page.locator(item.body).all()) {
      await expect(paragraph, item.route).toHaveCSS('font-family', /Newsreader/); await expect(paragraph, item.route).toHaveCSS('font-size', '19px'); await expect(paragraph, item.route).toHaveCSS('line-height', '28.5px'); await expect(paragraph, item.route).toHaveCSS('font-weight', '400'); await expect(paragraph, item.route).toHaveCSS('letter-spacing', 'normal');
    }
    const toggle = page.locator('.topbar-actions > .theme-toggle'); await expect(toggle).toBeVisible(); await expect(toggle.locator('svg')).toHaveClass(theme === 'dark' ? /lucide-sun/ : /lucide-moon/);
    await expect(page.locator('.theme-toggle + .menu-toggle')).toBeVisible();
    if (theme === 'dark') {
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 20, 24)'); await expect(page.locator('body')).toHaveCSS('background-image', /^none(?:, none)*$/);
      if(item.route !== 'articles') { const surface = page.locator(item.route === 'sky' && width <= 800 ? '.sky-debility-ledger' : item.surface).first(); await expect(surface).toHaveCSS('background-color', 'rgb(28, 31, 38)'); await expect(surface).toHaveCSS('box-shadow', 'none'); }
      await expect(page.locator('.site-nav button.active')).toHaveCSS('color', 'rgb(143, 245, 214)');
      await page.mouse.move(0, 0); await expectRenderedTextContrast(page, item.body, 7);
    }
    await expectReadableTheme(page, `${item.title}, ${item.body}`);
    if (item.route === 'sky/placement/mercury/scorpio') {
      await expect(page.locator('.sky-placement-article__panel[open], .retrograde-cycles__section[open]')).toHaveCount(0);
      for (const panel of await page.locator('.sky-placement-article__panel > summary, .retrograde-cycles__section > summary').all()) { await expect(panel).toHaveCSS('font-size', '26px'); await expect(panel).toHaveCSS('line-height', '29.9px'); }
    }
    // Compact Calendar intentionally hides the duplicate Today tag.
    if (item.route === 'calendar' && width > 720) await expectReadableTheme(page, '.calendar-sky-card__today, .lunar-calendar-day__number.is-today-disc');
    if (item.route === 'articles') {
      for (const label of await page.locator('.articles-library-filters input').all()) { await expect(label).toHaveCSS('font-family', /system-ui/); await expect(label).toHaveCSS('font-size', '15px'); }
      await expect(page.locator('.articles-library-filters [role=tab]')).toHaveText(['All','Articles','Guides']);
      if (theme === 'dark') await expect(page.locator('.articles-library-search')).toHaveCSS('background-color', 'rgb(39, 43, 52)');
    }
    if (item.route.includes('handoff-five')) {
      await expect(page.locator('.learn-article-body p')).toHaveText(['Complete fixture opening.', 'Complete fixture final paragraph.']);
      await page.reload(); await expect(page.locator('.learn-article-body p')).toHaveText(['Complete fixture opening.', 'Complete fixture final paragraph.']);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), item.route).toBe(true);
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `test-results/handoff-v5-${item.route.replace(/[^a-z]+/g, '-')}-${width}-${theme}.png` });
  }
  expect(errors).toEqual([]);
});


// Fidelity contract from Horoscopes Container / Mobile / Empty States.dc.html:
// an unboxed pair of circular chevrons, separate stacked destination labels,
// a date-first header, two sign chips and a UI-font Explore signs section.
for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
 test(`horoscope handoff fidelity across all periods ${width} ${theme}`, async ({page}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({width,height:1100});await seed(page,theme);
  const windows = [
   {period:'daily',start:'2026-10-13',end:'2026-10-14',before:'2026-10-12',previous:'Oct 12',next:'Oct 14',title:'October 13'},
   {period:'weekly',start:'2026-10-12',end:'2026-10-19',before:'2026-10-05',previous:'Oct 5 – 11',next:'Oct 19 – 25',title:'October 12 – 18'},
   {period:'monthly',start:'2026-10-01',end:'2026-11-01',before:'2026-09-01',previous:'September',next:'November',title:'October'},
   {period:'seasonal',start:'2026-09-23',end:'2026-10-23',before:'2026-08-23',previous:'Virgo season',next:'Scorpio season',title:'Sep 23 – Oct 22'},
  ] as const;
  const instant=(date:string)=>`${date}T04:00:00.000Z`;
  let published=true;
  const rows=windows.flatMap((w,i)=>[false,true].map(earlier=>{
   const period=w.period;
   const edition=emptyHoroscopeEdition({period,audience:period==='monthly'?'collective':'rising',timeZone:location.timeZone,startsAt:instant(earlier?w.before:w.start),endsAt:instant(earlier?w.start:w.end),...(period==='seasonal'?{seasonSign:earlier?'virgo':'libra'}:{})});
   edition.passages=edition.passages.map(p=>({...p,headline:p.sign==='overview'?(period==='monthly'&&!earlier?'October 2026 Overview':`Complete ${period} overview`):`${p.sign[0].toUpperCase()+p.sign.slice(1)} & ${p.sign[0].toUpperCase()+p.sign.slice(1)} Rising`,body:`Full ${period} ${earlier?'earlier':'current'} ${p.sign} opening. Mercury and Moon are named in this fixture.\n\nFull ${period} ${earlier?'earlier':'current'} ${p.sign} ending.`}));
   return {id:`cccccccc-cccc-4ccc-cccc-${String(i*2+Number(earlier)).padStart(12,'0')}`,updated_at:now,content_key:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',status:'LIVE',lane:'serving',review_state:null,body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief:{schema:'horoscope-brief/v1',window:edition.window,calculatedAt:instant(earlier?w.before:w.start).replace('T04:','T16:'),provenance:{actualEphemeris:'swiss'},positions:[{planet:'Mercury',sign:'Scorpio',degree:20,motion:'retrograde'},{planet:'Moon',sign:'Leo',degree:12,motion:'direct'},{planet:'Venus',sign:'Libra',degree:5,motion:'direct'}],signs:[{sign:'gemini',houses:[{planet:'Mercury',house:6},{planet:'Moon',house:3}]}]}}}};
  }));
  await page.route('**/api/content-reader',route=>{
   const q=route.request().postDataJSON();const matches=published?rows.filter(row=>row.sections.horoscopeEdition.window.period===q.horoscope?.period&&row.sections.horoscopeEdition.window.startsAt<=q.horoscope.at&&q.horoscope.at<row.sections.horoscopeEdition.window.endsAt):[];
   return route.fulfill({json:readerResponse(matches)});
  });
  const nav=page.getByRole('navigation',{name:'Horoscope editions'});
  const previous=nav.getByRole('button',{name:/^Previous(?: |$)/});
  const next=nav.getByRole('button',{name:/^Next(?: |$)/});
  async function checkControls(previousLabel:string,nextLabel:string){
   await expect(previous.locator('small')).toHaveText('Previous');
   await expect(next.locator('small')).toHaveText('Next');
   await expect(previous.locator('.horoscope-edition-label > span')).toHaveText(previousLabel);
   await expect(next.locator('.horoscope-edition-label > span')).toHaveText(nextLabel);
   for(const button of [previous,next]){
    await expect(button).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
    await expect(button).toHaveCSS('font-family',/system-ui/);
    await expect(button.locator('.horoscope-edition-label')).toHaveCSS('display','grid');
    const arrow=button.locator('.horoscope-edition-arrow');
    await expect(arrow).toHaveCSS('width','44px');await expect(arrow).toHaveCSS('height','44px');
    await expect(arrow).toHaveCSS('border-radius','50%');await expect(arrow.locator('svg')).toHaveCSS('width','16px');
   }
   const bounds=(await nav.boundingBox())!,left=(await previous.locator('.horoscope-edition-arrow').boundingBox())!,right=(await next.locator('.horoscope-edition-arrow').boundingBox())!;
   expect(left.x).toBeCloseTo(bounds.x,0);expect(right.x+right.width).toBeCloseTo(bounds.x+bounds.width,0);expect(left.y).toBeCloseTo(right.y,0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  for(const w of windows){
   published=true;await page.goto(`/#horoscopes?period=${w.period}&sign=gemini`);
   const article=page.getByRole('article',{name:w.period==='monthly'?'Monthly overview':'Gemini horoscope',exact:true});
   const sign=w.period==='monthly'?'overview':'gemini';
   await expect(article).toContainText(`Full ${w.period} current ${sign} ending.`);
   await expect(article.locator('.horoscope-reading-date')).toHaveText(w.title);
   await expect(page.getByRole('button',{name:w.period[0].toUpperCase()+w.period.slice(1),exact:true})).toHaveCSS('background-color',theme==='dark'?'rgba(143, 245, 214, 0.14)':'rgb(255, 255, 255)');
   await expect(article.locator('.horoscope-reading-date')).toHaveCSS('font-size','36px');
   await expect(article.locator('.horoscope-reading-date')).toHaveCSS('line-height','40.32px');
   await expect(article.locator('.horoscope-reading-header')).toHaveCSS('text-align','center');
   await expect(article.locator('.horoscope-reading-sign')).toHaveCount(w.period==='monthly'?0:2);
   await expect(article.locator('.horoscope-passage-title')).toHaveCount(0);
   await expect(article.locator(':scope > .horoscope-date, :scope > .learn-kicker')).toHaveCount(0);
   const headings=await page.locator('.horoscope-page h1,h2,h3').allTextContents();expect(headings[0]).toBe('Horoscopes');expect(headings).toContain(w.title);
   for(const p of await article.locator('.horoscope-prose p').all()){await expect(p).toHaveCSS('font-size','19px');await expect(p).toHaveCSS('font-family',/Newsreader/);await expect(p).toHaveCSS('line-height','28.5px');}
   await checkControls(w.previous,w.next);await expect(next).toBeDisabled();
   const context=page.getByRole('region',{name:"What's behind it",exact:true});
   await expect(context).toBeVisible();await expect(context.getByRole('link')).toHaveCount(2);
   const mercury=context.getByRole('link',{name:/Mercury Rx in Scorpio/});
   await expect(mercury).toContainText(w.period==='monthly'?'20.0°':'20.0° · House 6');
   if(w.period==='monthly')await expect(context).not.toContainText('House');
   await expect(mercury).toHaveAttribute('href',`/?date=${w.start}#sky/placement/mercury/scorpio`);
   await expect(context.locator('h2')).toHaveCSS('font-size','26px');
   await expect(context.locator('strong').first()).toHaveCSS('font-family',/system-ui/);
   if(w.period==='daily'&&width===1440&&theme==='light'){
    await mercury.click();await expect(page).toHaveURL(/#sky\/placement\/mercury\/scorpio/);
    await expect(page.locator('#sky-detail-title')).toBeVisible({timeout:60_000});
    await page.goBack();await expect(article).toContainText('Full daily current gemini ending.');await expect(context).toBeVisible();
   }
   await expectReadableTheme(page,'.horoscope-reading-date, .horoscope-prose p, .horoscope-edition-label');
   if(w.period!=='monthly'){
    await expect(page.locator('.horoscope-sign-link').first()).toHaveCSS('font-family',/system-ui/);
    await expect(page.locator('.horoscope-personal-signs button').first()).toHaveCSS('font-family',/system-ui/);
   }
   await page.screenshot({path:`test-results/handoff-fidelity-horoscope-${w.period}-${width}-${theme}.png`,fullPage:true});
   await nav.screenshot({path:`test-results/handoff-fidelity-navigation-${w.period}-${width}-${theme}.png`});
   await previous.click();await expect(article).toContainText(`Full ${w.period} earlier ${sign} ending.`);
   if(w.period==='monthly')await expect(article.locator('.horoscope-passage-title')).toHaveText('Complete monthly overview');
   await page.reload();await expect(article).toContainText(`Full ${w.period} earlier ${sign} ending.`);
   await expect(next).toBeEnabled();await next.click();await expect(article).toContainText(`Full ${w.period} current ${sign} ending.`);
   if(w.period==='weekly'){
    await page.getByRole('button',{name:'Pisces & Pisces Rising',exact:true}).click();
    await expect(page.getByRole('article',{name:'Pisces horoscope',exact:true})).toContainText('Full weekly current pisces ending.');
   }
   published=false;await page.goto(`/#horoscopes?period=${w.period}&sign=gemini`);
   await expect(page.getByRole('heading',{name:`No ${w.period} reading yet`,exact:true})).toBeVisible();
   await checkControls(w.period==='seasonal'?'':w.previous,w.period==='seasonal'?'':w.next);
   await expect(page.locator('.horoscope-empty [role="status"]')).toHaveCount(1);await expect(context).toHaveCount(0);
   await page.screenshot({path:`test-results/handoff-fidelity-horoscope-empty-${w.period}-${width}-${theme}.png`,fullPage:true});
  }
  const yearEdition=emptyHoroscopeEdition({period:'weekly',audience:'rising',timeZone:location.timeZone,startsAt:'2026-12-28T05:00:00.000Z',endsAt:'2027-01-04T05:00:00.000Z'});
  yearEdition.passages=yearEdition.passages.map(p=>({...p,headline:'Gemini & Gemini Rising',body:'Full year-boundary fixture opening.\n\nFull year-boundary fixture ending.'}));
  // Deliberately stale context must be refused while the complete edition reads.
  rows.push({...rows[0],id:'cccccccc-cccc-4ccc-cccc-999999999999',content_key:horoscopeEditionKey(yearEdition.window),body:horoscopeEditionBody(yearEdition),sections:{horoscopeEdition:yearEdition}});
  published=true;await page.clock.setFixedTime(new Date('2026-12-30T17:00:00.000Z'));await page.goto('/#horoscopes?period=weekly&sign=gemini');
  const yearArticle=page.getByRole('article',{name:'Gemini horoscope',exact:true});
  await expect(yearArticle).toContainText('Full year-boundary fixture ending.');
  await expect(yearArticle.locator('.horoscope-reading-date')).toContainText('2026');await expect(yearArticle.locator('.horoscope-reading-date')).toContainText('2027');
  await expect(yearArticle.locator('.horoscope-year')).toHaveCount(0);
  await expect(page.getByRole('region',{name:"What's behind it",exact:true})).toHaveCount(0);
  await checkControls('Dec 21 – 27','Jan 4 – 10');
 });
}


for(const width of [390,1440])for(const theme of ['light','dark']){
 test(`shared avatar fidelity ${width} ${theme}`,async({page})=>{
  test.setTimeout(90_000);await page.setViewportSize({width,height:1100});await seed(page,theme);await authenticate(page);
  for(const [route,selector] of [['you','.profile-heading .profile-avatar'],['account','.settings-profile-row .profile-avatar']]){
   await page.goto(`/#${route}`);const avatar=page.locator(selector).first();await expect(avatar).toBeVisible({timeout:60_000});
   await expect(avatar).toHaveCSS('font-family',/system-ui/);await expect(avatar).toHaveCSS('font-size','20px');await expect(avatar).toHaveCSS('font-weight','600');
   await expect(avatar).toHaveCSS('background-color','rgb(0, 75, 69)');await expect(avatar).toHaveCSS('color','rgb(255, 255, 255)');
  }
  await page.goto('/#settings');await expect(page.locator('.settings-header')).toBeVisible();await page.getByRole('button',{name:'Open menu',exact:true}).click();const menuAvatar=page.locator('.site-menu-profile .profile-avatar');
  await expect(menuAvatar).toHaveCSS('font-family',/system-ui/);await expect(menuAvatar).toHaveCSS('background-color','rgb(0, 75, 69)');await expect(menuAvatar).toHaveCSS('color','rgb(255, 255, 255)');
  await page.keyboard.press('Escape');await page.goto('/#friends?tab=charts');
  const friend=page.locator('.manual-chart-avatar').first();await expect(friend).toBeVisible({timeout:60_000});await expect(friend).toHaveCSS('font-family',/system-ui/);
  await page.screenshot({path:`test-results/handoff-fidelity-avatars-${width}-${theme}.png`});
 });
}

for (const width of [390, 1440]) test(`Local theme choice survives a stale saved profile ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await seed(page, 'dark');
  await authenticate(page);
  await page.route('**/rest/v1/user_profiles*', route => route.fulfill({ json: {
    data: { version: 1, profile: structuredClone(fixtureProfile), preferences: { theme: 'light' } }
  } }));
  for (const reload of [false, true]) {
    const restored = page.waitForResponse(response => response.url().includes('/rest/v1/user_profiles') && response.request().method() === 'GET');
    if (reload) await page.reload();
    else await page.goto('/#settings');
    await restored;
    await expect(page.locator('.settings-header')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.topbar-actions > .theme-toggle')).toHaveAccessibleName('Switch to light mode');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tldrastro:theme'))).toBe('dark');
  }
});

for (const width of [320, 390, 768, 820, 1024, 1440, 1920]) for (const theme of ['light', 'dark']) {
  test(`Sky effort section spacing ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1100 });
    await seed(page, theme);
    for (const [date, count] of [['2026-10-26', 1], ['2026-10-13', 4]] as const) {
      await page.goto(`/?date=${date}#sky`);
      const section = page.locator('.sky-debility-ledger');
      const cards = section.locator('.sky-debility-card');
      await expect(cards).toHaveCount(count, { timeout: 60_000 });
      await section.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      const before = await section.locator('.sky-today-ledger__copy p').allTextContents();
      const layout = await section.evaluate(node => {
        const rect = (selector: string) => node.querySelector(selector)!.getBoundingClientRect().toJSON();
        const style = getComputedStyle(node);
        return { root: node.getBoundingClientRect().toJSON(), padding: parseFloat(style.paddingLeft),
          head: rect('.sky-today-ledger__head'), copy: rect('.sky-today-ledger__copy'),
          grid: rect('.sky-debility-cards'), help: rect('.sky-debility-explain'),
          columns: getComputedStyle(node.querySelector('.sky-debility-cards')!).gridTemplateColumns.split(' ').length };
      });
      expect(layout.padding).toBe(width > 1024 ? 48 : 24);
      expect(layout.head.x - layout.root.x).toBeCloseTo(layout.padding, 0);
      expect(layout.copy.x).toBeCloseTo(layout.head.x, 0);
      expect(layout.grid.x).toBeCloseTo(layout.head.x, 0);
      expect(layout.copy.x + layout.copy.width).toBeLessThanOrEqual(layout.root.x + layout.root.width - layout.padding + 1);
      expect(layout.columns).toBe(width > 1024 ? 3 : width > 800 ? 2 : 1);
      if (width > 800) {
        expect(layout.help.x).toBeGreaterThanOrEqual(layout.head.x + layout.head.width);
        expect(layout.help.y + layout.help.height / 2).toBeCloseTo(layout.head.y + layout.head.height / 2, 0);
        expect(layout.help.x + layout.help.width).toBeCloseTo(layout.root.x + layout.root.width - layout.padding, 0);
      } else expect(layout.help.y).toBeGreaterThanOrEqual(layout.grid.y + layout.grid.height);
      for (const card of await cards.all()) {
        expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
        if (width >= 1440) expect(await card.locator('strong').evaluate(node => node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight))).toBeLessThan(1.1);
      }
      await expectReadableTheme(page, '.sky-debility-ledger h3, .sky-debility-explain, .sky-debility-card strong, .sky-debility-card__copy > span');
      await page.mouse.move(0, 0);
      await expectRenderedTextContrast(page, '.sky-debility-ledger .sky-today-ledger__copy', 7);
      const help = section.getByRole('button', { name: 'What is dignity?', exact: true });
      await help.click();
      await expect(page.getByRole('dialog')).toContainText('A planet is in detriment when it is in the sign opposite one it rules.');
      await page.keyboard.press('Escape');
      await expect(help).toBeFocused();
      expect(await section.locator('.sky-today-ledger__copy p').allTextContents()).toEqual(before);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await section.locator('h3').click();
      await section.screenshot({ path: `test-results/sky-effort-layout-${width}-${theme}-${date}.png` });
    }
  });
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Handoff 6 blog covers and complete readings ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({width,height:1100}); await seed(page,theme);
    const titles=['Aries Season: Complete fixture title','Pisces Season: Complete fixture title','Libra New Moon: Complete fixture title','Capricorn Season: Complete fixture title','How to read your chart'];
    const rows=titles.map((headline,index)=>({id:`blog-fixture-${index}`,content_key:index===4?'article/guide/chart':index===1?'sky-article/pisces':'article/manual/fixture-'+index,
      surface:'education',mode:'article',status:'LIVE',lane:'serving',review_state:null,headline,summary:'Preserved optional fixture summary.',body:`Complete fixture opening ${index}.\n\n## Saved section\n\nComplete fixture final sentence ${index}.`,updated_at:`2026-10-${String(13-index).padStart(2,'0')}T12:00:00Z`}));
    let outcome='ready';
    await page.route('**/api/content-reader',route=>{
      const q=route.request().postDataJSON();
      if(outcome==='error')return route.fulfill({status:503,json:{error:'Synthetic unavailable library'}});
      return route.fulfill({json:readerResponse(outcome==='empty'?[]:rows.filter(row=>q.prefix?row.content_key.startsWith(q.prefix):q.keys?.includes(row.content_key)))});
    });
    await page.goto('/#articles');const cards=page.locator('.article-cover-card');await expect(cards).toHaveCount(5,{timeout:60_000});
    await expect(page.locator('.article-cover-card--featured h2')).toHaveText(titles[0]);
    await expect(page.locator('.articles-library-list h2')).toHaveText(titles.slice(1));
    await expect(page.getByRole('tablist',{name:'Article type'}).getByRole('tab')).toHaveText(['All','Articles','Guides']);
    await expect(page.getByRole('combobox')).toHaveCount(0);
    await expect(page.locator('.article-cover__caption h2').first()).toHaveCSS('font-family',/system-ui/);
    await expect(page.locator('.article-cover__caption h2').first()).toHaveCSS('font-size','15px');
    await expect(page.locator('.article-cover__title em').first()).toHaveCSS('font-family',/Newsreader/);
    await expect(page.locator('.article-cover__title em').first()).toHaveCSS('font-style','italic');
    await page.getByRole('tab',{name:'Articles',exact:true}).click();await expect(cards).toHaveCount(4);await expect(cards.locator('h2')).toContainText(titles.slice(0,4));
    await page.getByRole('tab',{name:'Guides',exact:true}).click();await expect(cards).toHaveCount(1);await expect(cards.locator('h2')).toHaveText(titles[4]);
    const search=page.getByRole('searchbox',{name:'Search articles and guides'});await search.fill('No matching fixture');await expect(page.getByRole('status')).toContainText('No matching fixture');
    await search.fill('');await page.getByRole('tab',{name:'All',exact:true}).click();await expect(cards).toHaveCount(5);
    await search.focus(); await expect(search).toHaveCSS('outline-style','none');
    await expect(page.locator('.articles-library-search')).toHaveCSS('outline-style','solid');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const tone of ['fire','water','air','earth','graphite']) {
      await expectRenderedTextContrast(page, `.article-cover--${tone} .article-cover__meta`, 4.5);
      await expectRenderedTextContrast(page, `.article-cover--${tone} .article-cover__title`, 3);
    }
    for(let index=0;index<titles.length;index++) {
      await search.fill(titles[index]); await expect(cards).toHaveCount(1);
      await expectRenderedTextContrast(page, '.article-cover__meta', 4.5);
      await expectRenderedTextContrast(page, '.article-cover__title', 3);
    }
    await search.fill(''); await expect(cards).toHaveCount(5);
    await page.locator('.articles-library-header').scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/handoff6-blog-${width}-${theme}.png`,fullPage:true});
    await cards.first().click();await expect(page.locator('.learn-article-body')).toContainText('Complete fixture final sentence 0.');
    await page.reload();await expect(page.locator('.learn-article-body')).toContainText('Complete fixture final sentence 0.');
    await page.getByRole('link',{name:'Back to Articles & Guides',exact:true}).click();await expect(cards).toHaveCount(5);
    outcome='error';await page.reload();await expect(page.getByRole('alert')).toContainText('Articles and guides could not load.');
    outcome='ready';await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(cards).toHaveCount(5);
    outcome='empty';await page.reload();await expect(page.getByRole('status')).toHaveText('No articles or guides are published yet.');
  });
  test(`Handoff 6 header date and location journey ${width} ${theme}`, async ({ page, context }) => {
    await page.setViewportSize({width,height:1100});await seed(page,theme);await authenticate(page);
    let cityError=false;
    await page.route('https://api.mapbox.com/**',route=>cityError ? route.fulfill({status:503,json:{message:'Synthetic city outage'}}) : route.fulfill({json:{features:Array.from({length:5},(_,index)=>({id:`city-${index}`,properties:{name:`Boston ${index}`,context:{region:{name:'Massachusetts'}},coordinates:{latitude:42.36,longitude:-71.06}}}))}}));
    await page.route('**/utils/timezone',route=>route.fulfill({json:{timeZone:'America/New_York'}}));
    await page.goto('/#sky');const trigger=page.locator('#header-date-trigger');await expect(trigger).toHaveText('Today');await trigger.click();
    const dialog=page.getByRole('dialog',{name:'Date and location',exact:true});await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('tab',{name:'Today',exact:true})).toHaveAttribute('aria-selected','true');
    await dialog.getByRole('tab',{name:'Tomorrow',exact:true}).click();await expect(trigger).toHaveText('Tomorrow');await expect(page).toHaveURL(/date=2026-10-14/);
    await page.reload();await expect(trigger).toHaveText('Tomorrow');await trigger.click();await dialog.getByRole('tab',{name:'Date',exact:true}).click();
    await expect(dialog.getByRole('grid')).toHaveAccessibleName('October 2026');await dialog.getByRole('button',{name:'Next month',exact:true}).click();
    await expect(dialog.getByRole('grid')).toHaveAccessibleName('November 2026');await dialog.getByRole('gridcell',{name:/November 18, 2026/}).click();
    await expect(page).toHaveURL(/date=2026-10-14/);await dialog.getByRole('button',{name:'Show Nov 18',exact:true}).click();await expect(page).toHaveURL(/date=2026-11-18/);
    await page.reload();await trigger.click();await expect(dialog.getByRole('gridcell',{name:/November 18, 2026/})).toHaveAttribute('aria-selected','true');
    const bounds=await dialog.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width+1);
    if(width<800){expect(bounds!.y+bounds!.height).toBeCloseTo(1100,0);await expect(dialog.locator('.header-date-sheet-heading')).toHaveText('Date and place');await expect(dialog.locator('.header-date-sheet-heading')).toHaveCSS('font-size','30px');const close=await dialog.getByRole('button',{name:'Close date and location',exact:true}).boundingBox();expect(close!.height).toBe(44);}else {const anchor=await trigger.boundingBox();expect(bounds!.x+bounds!.width).toBeCloseTo(anchor!.x+anchor!.width,0);expect(bounds!.y).toBeGreaterThan(anchor!.y+anchor!.height);}
    await expectReadableTheme(page,'.header-date-panel .header-date-apply, .header-date-panel .date-picker-grid button, .header-date-panel .header-date-location__label, .header-date-panel .segmented-control__item');
    await page.evaluate(()=>{Object.defineProperty(navigator.geolocation,'getCurrentPosition',{configurable:true,value:(_success:unknown,error:(value:{code:number})=>void)=>error({code:1})});});
    await dialog.getByRole('button',{name:'Use my current location',exact:true}).click();
    await expect(dialog.getByRole('alert')).toHaveText('Could not get your location. Search for a city instead.');
    cityError=true;await dialog.locator('.mobile-sky-controls__location').click();await dialog.getByRole('textbox',{name:'City',exact:true}).fill('Cambridge');
    await expect(dialog.getByText('City suggestions are unavailable right now.',{exact:true})).toBeVisible();
    cityError=false;await dialog.getByRole('textbox',{name:'City',exact:true}).fill('Boston');await expect(dialog.getByRole('option')).toHaveCount(3);
    await page.evaluate(()=>{Reflect.deleteProperty(navigator.geolocation,'getCurrentPosition');});
    await dialog.getByRole('option').first().click();await expect(dialog.locator('.mobile-sky-controls__location')).toContainText('Boston 0');
    await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:42.36,longitude:-71.06});
    await dialog.getByRole('button',{name:'Use my current location',exact:true}).click();await expect(dialog.getByRole('button',{name:'Use my current location',exact:true})).toBeEnabled();
    await page.screenshot({path:`test-results/handoff6-date-${width}-${theme}.png`});
    await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
    await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tldrastro:selectedLocation')!).latitude)).toBeCloseTo(42.36,2);
    await page.goto('/#you');await trigger.click();
    const personal=page.getByRole('dialog',{name:'Transit date',exact:true});await expect(personal).toBeVisible();
    await expect(personal.getByText('Location',{exact:true})).toHaveCount(0);
    await personal.getByRole('tab',{name:'Today',exact:true}).click();await expect(trigger).toHaveText('Today');await expect(page).toHaveURL(/#you$/);
    await page.goto('/#account');await page.getByRole('button',{name:'Open menu',exact:true}).click();
    const menu=page.getByRole('menu',{name:'Site menu'});await expect(menu.getByRole('menuitem').filter({hasText:/^(Sky|Calendar|Horoscopes|Guide|You|Friends)$/})).toHaveText(['Sky','Calendar','Horoscopes','Guide','You','Friends']);
    await expect(menu.getByRole('menuitem',{name:'Account',exact:true})).toHaveCSS('background-color',theme==='dark'?'rgb(39, 43, 52)':'rgb(232, 235, 239)');
    await page.screenshot({path:`test-results/handoff6-menu-${width}-${theme}.png`});
  });
}

for (const width of [390,1440]) for (const theme of ['light','dark']) for (const member of [false,true]) {
  test(`Menu typography includes deferred Reports ${width} ${theme} ${member?'member':'guest'}`,async({page})=>{
    await page.setViewportSize({width,height:900});await seed(page,theme);
    if(member)await authenticate(page);else await page.addInitScript(()=>localStorage.removeItem('tldrastro:userProfile'));
    const inspectMenu=async(expectReports=true)=>{
      const menu=page.getByRole('menu',{name:'Site menu'});
      await expect(menu.getByRole('menuitem',{name:'Sky',exact:true})).toBeVisible();
      if(expectReports)await expect(menu.getByRole('menuitem',{name:/^Reports/})).toBeVisible({timeout:60_000});
      else await expect(menu.getByRole('menuitem',{name:/^Reports/})).toHaveCount(0);
      const typography=await menu.getByRole('menuitem').evaluateAll(nodes=>nodes.map(node=>{
        const style=getComputedStyle(node),label=node.querySelector('span'),text=label?getComputedStyle(label):style;
        return {label:node.textContent?.trim(),family:style.fontFamily,size:style.fontSize,weight:style.fontWeight,labelSize:text.fontSize};
      }));
      expect(typography.length).toBeGreaterThanOrEqual(7);
      expect(typography.filter(row=>row.size!=='15px'||row.labelSize!=='15px'||row.weight!=='400'||!row.family.includes('system-ui'))).toEqual([]);
      await expectReadableTheme(page,'.site-menu [role="menuitem"]');
    };
    await page.goto('/#sky');await page.getByRole('button',{name:'Open menu',exact:true}).click();await inspectMenu(member);
    await page.screenshot({path:`test-results/menu-font-${width}-${theme}-${member?'member':'guest'}.png`});
    if(member)await page.getByRole('menuitem',{name:/^Reports/}).click();else await page.goto('/reports/');
    await expect(page.getByRole('heading',{level:1,name:'Reports',exact:true})).toBeVisible({timeout:60_000});
    await page.getByRole('button',{name:'Open menu',exact:true}).click();await inspectMenu();
    await page.locator('.site-menu-sheet .site-menu-close').click();
    await page.reload();await page.getByRole('button',{name:'Open menu',exact:true}).click();await inspectMenu();
    await page.getByRole('menuitem',{name:'Sky',exact:true}).click();
    await page.getByRole('button',{name:'Open menu',exact:true}).click();await inspectMenu(member);
  });
}

for(const width of [320,390,768,1440]) for(const theme of ['light','dark']) for(const audience of ['you','they']) {
  test(`combined Patterns Insights handoff ${audience} ${width} ${theme}`,async({page})=>{
    test.setTimeout(120_000);await page.setViewportSize({width,height:1100});
    await patternInsightFixtures(page,theme);
    const route=audience==='you'?'/#you?tab=chart':'/#friends?tab=charts&chart=fixture-friend&view=natal';
    await page.goto(route);
    const section=page.getByRole('region',{name:'Patterns & Insights',exact:true});
    const cards=section.locator('.natal-insight-card');
    await expect(cards).toHaveCount(2,{timeout:60_000});await expect(cards.last()).toBeVisible();
    await page.evaluate(async()=>{await document.fonts.ready;});
    await expect(section.getByRole('heading',{name:'Patterns & Insights',exact:true})).toHaveCount(1);
    await expect(section.getByRole('heading',{name:'Insights',exact:true})).toHaveCount(0);
    await expect(cards.first().locator('.natal-insight-card__meta')).toContainText('Yod: Pluto, Neptune, and the Moon');
    await expect(cards.last().locator('.natal-insight-card__meta')).toHaveText(/12th house ruler in the \d+(st|nd|rd|th) house/);
    await expect(cards.last().locator('.natal-insight-card__glyph')).not.toHaveText('✦');
    const placements=page.locator('.natal-placement-sections').last();
    const [before,after]=await Promise.all([placements.boundingBox(),section.boundingBox()]);
    expect(after!.y).toBeGreaterThanOrEqual(before!.y+before!.height);
    for(const card of await cards.all()) {
      await expect(card.locator('.natal-insight-card__meta')).toHaveCSS('font-family',/system-ui/);
      await expect(card.locator('.natal-insight-card__meta')).toHaveCSS('font-size','14px');
      await expect(card.locator('.natal-insight-card__title')).toHaveCSS('font-family',/Newsreader/);
      await expect(card.locator('.natal-insight-card__title')).toHaveCSS('font-size',width<=800?'24px':'26px');
      await expect(card.locator('.natal-insight-card__title')).toHaveCSS('font-weight','400');
      if(width<=800)expect(await card.locator('.natal-insight-card__title').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
      await expect(card.locator('.natal-insight-card__preview')).toHaveCSS('font-size','19px');
      await expect(card.locator('.natal-insight-card__preview')).toHaveCSS('line-height','28.5px');
      await expect(card.locator('.natal-insight-card__preview')).toHaveCSS('-webkit-line-clamp','3');
      await expect(card.locator('.natal-insight-card__glyph')).toHaveCSS('width',width<=800?'52px':'64px');
      await expect(card.locator('.card-read-more--icon')).toHaveCSS('width',width<=800?'32px':'44px');
      const previewBox=(await card.locator('.natal-insight-card__preview').boundingBox())!;
      expect(previewBox.height).toBeLessThanOrEqual(85.6);
      if(width>800){
        const [box,arrow]=await Promise.all([card.boundingBox(),card.locator('.card-read-more--icon').boundingBox()]);
        expect(Math.abs(arrow!.x+arrow!.width/2-box!.x-box!.width/2)).toBeLessThan(1);
        expect(arrow!.y).toBeGreaterThanOrEqual(previewBox.y+previewBox.height);
      }
    }
    const [first,second]=await cards.evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};}));
    if(width<=800){expect(second.y).toBeGreaterThan(first.y+first.height);expect(second.x).toBe(first.x);await expect(cards.first()).toHaveCSS('background-color','rgba(0, 0, 0, 0)');}
    else{expect(second.y).toBe(first.y);expect(second.height).toBe(first.height);expect(second.x).toBeGreaterThan(first.x+first.width);expect(first.width).toBeLessThan(after!.width/2);}
    await expectReadableTheme(page,'.natal-insight-card__meta, .natal-insight-card__title, .natal-insight-card__preview');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await section.scrollIntoViewIfNeeded();
    await section.screenshot({path:`test-results/patterns-insights-${audience}-${width}-${theme}.png`});
    // The preview stores the full saved text; only CSS clips its presentation.
    await expect(cards.last().locator('.natal-insight-card__preview')).toHaveText(insightPreview.replace(/\n+/g,' '));
    await cards.first().focus();await page.keyboard.press('Enter');
    await expect(page.locator('.sky-detail-article h1')).toHaveText(/A good plan can still leave.*out of it/);
    await expect(page.locator('.sky-detail-article')).toContainText('The complete parent reading ending remains.');
    await expect(page.locator('.sky-detail-article')).toContainText('The supporting pattern overview remains.');
    await expect(page.locator('.sky-detail-article')).toContainText('The complete supporting pattern ending remains.');
    await page.getByRole('button',{name:audience==='you'?'Back to natal chart':'Close detail',exact:true}).click();
    await expect(cards).toHaveCount(2);
    await cards.last().focus();await page.keyboard.press('Enter');
    const article=page.locator('.natal-insight-page');await expect(article).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(article).toContainText('The complete insight ending remains.');
    await expect(article).toContainText('The complete ruler-house ending remains.');
    await expect(article.getByText('This paragraph repeats.',{exact:true})).toHaveCount(2);
    await article.getByRole('button',{name:'Back',exact:true}).click();await expect(cards.last()).toBeFocused();
    await page.reload();await expect(cards).toHaveCount(2);await expect(cards.last()).toBeVisible();
  });
}

for(const audience of ['you','they']) test(`combined Patterns Insights missing publications and retry ${audience}`,async({page})=>{
  test.setTimeout(120_000);await page.setViewportSize({width:390,height:1000});
  const fixture=await patternInsightFixtures(page,'dark',{patterns:false,fail:true});
  await page.goto(audience==='you'?'/#you?tab=chart':'/#friends?tab=charts&chart=fixture-friend&view=natal');
  const section=page.getByRole('region',{name:'Patterns & Insights',exact:true});
  await expect(section.getByRole('alert')).toContainText('Patterns & Insights could not load.',{timeout:60_000});
  fixture.recover();await section.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(section.locator('.natal-insight-card')).toHaveCount(1);await expect(section).toBeVisible();
  await page.route('**/api/content-reader',route=>route.fulfill({json:readerResponse([])}));
  await page.reload();await expect(page.locator('.natal-placement-sections')).toBeVisible();
  await expect(page.locator('.natal-patterns-insights')).toHaveCount(1);
  await expect(page.locator('.natal-patterns-insights .app-loading')).toHaveCount(0,{timeout:60_000});
  await expect(page.locator('.natal-patterns-insights')).toBeHidden();
});

for(const audience of ['you','they']) test(`combined Patterns Insights pattern-only ${audience}`,async({page})=>{
  await page.setViewportSize({width:390,height:1000});await patternInsightFixtures(page,'light',{insights:false});
  await page.goto(audience==='you'?'/#you?tab=chart':'/#friends?tab=charts&chart=fixture-friend&view=natal');
  const section=page.getByRole('region',{name:'Patterns & Insights',exact:true});
  await expect(section.locator('.app-loading')).toHaveCount(0);
  await expect(section.locator('.natal-insight-card')).toHaveCount(1);
  await expect(section.locator('.natal-insight-card')).toHaveAccessibleName(/A good plan can still leave.*out of it/);
  await expect(section).toBeVisible();
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const audience of ['you', 'they']) {
  test(`Insight article preserves complete reading ${audience} ${width} ${theme}`, async ({page}) => {
    test.setTimeout(90_000); await page.setViewportSize({width, height:900});
    await patternInsightFixtures(page, theme);
    const keys=['you','they'].flatMap(a => [
      ...['day','night'].map(sect=>`cms/natal-chart-context/${a}/sect/${sect}`),
      `cms/natal-twelfth-ruler/${a}/introduction`,
      ...Array.from({length:12},(_,i)=>`cms/natal-twelfth-ruler/${a}/ruler-house/${i+1}`)
    ]);
    const rows=keys.map((key,i)=>({id:`dddddddd-dddd-4ddd-bddd-${String(i).padStart(12,'0')}`,content_key:key,surface:'natal',mode:'article',status:'LIVE',lane:'serving',review_state:null,
      body:Array.from({length:12},(_,n)=>`Paragraph ${n+1}. This synthetic reading remains complete, with comfortable paragraph spacing and the same body typography as the rest of the app. The reader can continue through the full passage.`).join('\n\n')+`\n\nComplete ${key} ending.`,updated_at:now}));
    await page.route('**/api/content-reader',route=>{const q=route.request().postDataJSON();return route.fulfill({json:readerResponse(rows.filter(row=>q.keys?.includes(row.content_key)))});});
    await page.goto(audience==='you'?'/#you?tab=chart':'/#friends?tab=charts&chart=fixture-friend&view=natal');
    const trigger=page.getByRole('link',{name:'Understanding undoing',exact:true});
    await trigger.click();
    const article=page.locator('.natal-insight-page'),heading=article.getByRole('heading',{level:1});
    await expect(page).toHaveURL(audience==='you'?/\/you\/natal\/twelfth-ruler$/:/\/friends\/fixture-friend\/natal\/twelfth-ruler$/);
    await expect(heading).toBeFocused();await expect(page.getByRole('dialog')).toHaveCount(0);
    const body=article.locator('.natal-sect-intro > p, .natal-sect-sections p');
    await expect(body).toHaveCount(26);await expect(body.first()).toHaveCSS('font-family',/Newsreader/);
    await expect(body.first()).toHaveCSS('font-size','19px');await expect(body.first()).toHaveCSS('line-height','28.5px');
    const complete=await body.allTextContents();
    await body.last().scrollIntoViewIfNeeded();await expect(body.last()).toBeInViewport();
    await page.reload();await expect(body).toHaveText(complete);
    await expectReadableTheme(page,'.natal-insight-page h1, .natal-insight-page h2, .natal-insight-page p');
    await page.setViewportSize({width,height:390});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await article.getByRole('button',{name:'Back',exact:true}).click();await expect(trigger).toBeFocused();
    await page.goForward();await expect(body).toHaveText(complete);
    await page.goto(audience==='you'?'/you/natal/twelfth-ruler':'/friends/fixture-friend/natal/twelfth-ruler');
    await expect(body).toHaveText(complete);
    await article.getByRole('button',{name:'Back',exact:true}).click();await expect(trigger).toBeFocused();
  });
}

for(const width of [390,1440]) for(const theme of ['light','dark']) for(const audience of ['you','they']) test(`Insight article empty and retry states ${audience} ${width} ${theme}`,async({page})=>{
  test.setTimeout(120_000);await page.setViewportSize({width,height:900});
    const fixture=await patternInsightFixtures(page,theme,{patterns:false,fail:true});
    await page.goto(audience==='you'?'/you/natal/twelfth-ruler':'/friends/fixture-friend/natal/twelfth-ruler');
    const article=page.locator('.natal-insight-page');
    await expect(article.getByRole('alert')).toContainText('The chart reading could not load.',{timeout:60_000});
    fixture.recover();await article.getByRole('button',{name:'Try again',exact:true}).click();
    await expect(article).toContainText('The complete insight ending remains.');
    await expect(article).toContainText('The complete ruler-house ending remains.');
    await page.route('**/api/content-reader',route=>route.fulfill({json:readerResponse([])}));
    await page.reload();await expect(article.getByText('This chart reading is not available yet.',{exact:true})).toBeVisible();
    await expect(article.getByRole('heading',{level:1})).toHaveCount(1);
    await expect(article.locator('.natal-sect-sections')).toHaveCount(0);
    await expectReadableTheme(page,'.natal-insight-page h1, .natal-insight-page p');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await article.getByRole('button',{name:'Back',exact:true}).click();
    await expect(page).toHaveURL(audience==='you'?/#you\?tab=chart$/:/#friends\?tab=charts&chart=fixture-friend&view=natal$/);
});

for(const width of [390,1440]) for(const theme of ['light','dark']) test(`dignity modal polish ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:900});await seed(page,theme);await page.goto('/#sky');
  const trigger=page.getByRole('button',{name:'What is dignity?',exact:true});await trigger.click();
  const dialog=page.getByRole('dialog',{name:'What is dignity?',exact:true});
  await expect(dialog.locator('h2')).toHaveCSS('font-size',width<=800?'30px':'36px');
  await expect(dialog.locator('.modal-dialog__body p').first()).toHaveCSS('font-size','19px');
  await expectReadableTheme(page,'.modal-dialog__header h2, .modal-dialog__body p');
  await dialog.screenshot({path:test.info().outputPath(`dignity-${width}-${theme}.png`)});
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
});

for(const width of [390,1440]) for(const theme of ['light','dark']) for(const audience of ['you','they']) for(const sect of ['day','night'] as const) {
 test(`Sect article page ${sect} ${audience} ${width} ${theme}`,async({page})=>{
  test.setTimeout(90_000);await page.setViewportSize({width,height:1000});await seed(page,theme,'off',{},sect);await authenticate(page,sect);
  const roles=sect==='day'?['Sun','Jupiter','Saturn','Mars']:['Moon','Venus','Mars','Saturn'];
  const subject=audience==='you'?'Your':'{{ownerName}}’s';
  const body=`${subject} ${roles[0]} establishes the ${sect} chart. ${roles[1]} is the benefic of sect. ${roles[1]} has a complete saved paragraph that stays verbatim on the page.\n\n${roles[2]} has its complete saved paragraph.\n\n${roles[3]} has its complete saved paragraph.\n\nThe last chart context paragraph remains.\n\nThis paragraph repeats.\n\nThis paragraph repeats.`;
  const key=`cms/natal-chart-context/${audience}/sect/${sect}`;
  const row={id:'eeeeeeee-eeee-4eee-beee-eeeeeeeeeeee',content_key:key,surface:'natal',mode:'article',status:'LIVE',lane:'serving',review_state:null,headline:null,summary:null,body,source_snapshot:{contentType:'mustache-template'},updated_at:now};
  await page.route('**/api/content-reader',route=>{const q=route.request().postDataJSON();return route.fulfill({json:readerResponse(q.keys?.includes(key)?[row]:[])});});
  const parent=audience==='you'?'/?date=2026-10-12#you?tab=chart':'/?date=2026-10-12#friends?tab=charts&chart=fixture-friend&view=natal';
  const child=audience==='you'?'/you/natal/sect':'/friends/fixture-friend/natal/sect';
  await page.goto(parent);
  const pill=page.getByRole('region',{name:'Chart sect',exact:true}).getByRole('link');await expect(pill).toContainText(sect==='day'?'Day chart':'Night chart');
  const expectNoSectStroke=async()=>{
    await expect(pill).toHaveCSS('border-bottom-width','0px');await expect(pill).toHaveCSS('box-shadow','none');await expect(pill).toHaveCSS('outline-style','none');
    expect(await pill.evaluate(node=>{
      const sun=node.closest('.natal-sun-card')!.querySelector(':scope > .placement-table-row')!;
      const style=getComputedStyle(sun);
      return {border:style.borderBottomWidth,shadow:style.boxShadow};
    })).toEqual({border:'0px',shadow:'none'});
  };
  await expectNoSectStroke();await pill.click();
  await expect(page).toHaveURL(new RegExp(`${child}\\?date=2026-10-12$`));
  const article=page.locator('.natal-sect-article'),title=article.getByRole('heading',{level:1,name:sect==='day'?'Day chart':'Night chart',exact:true});
  await expect(title).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(title).toHaveCSS('font-size',width<=800?'34px':'48px');
  await expect(article.locator('.natal-sect-role-planet')).toHaveText(roles);
  await expect(article.locator('.natal-sect-section-header h2')).toHaveText(roles.slice(1));
  const narrative=article.locator('.natal-sect-intro > p, .natal-sect-sections p');
  const expected=body.replaceAll('{{ownerName}}','Fixture Friend').replace(/\s+/gu,' ').trim();
  await expect.poll(async()=> (await narrative.allTextContents()).join(' ').replace(/\s+/gu,' ').trim()).toBe(expected);
  await expect(article.getByText('This paragraph repeats.',{exact:true})).toHaveCount(2);
  for(const p of await narrative.all()){await expect(p).toHaveCSS('font-family',/Newsreader/);await expect(p).toHaveCSS('font-size','19px');await expect(p).toHaveCSS('line-height','28.5px');}
  await expect(article.locator('.natal-sect-meta')).toHaveText(audience==='you'?'Sect · Your natal chart':'Sect · Fixture Friend\'s natal chart');
  const back=page.getByRole('button',{name:'Back',exact:true});
  const layout=await page.evaluate(()=>{
   const article=document.querySelector('.natal-sect-article')!.getBoundingClientRect();
   const back=document.querySelector('.natal-sect-back')!.getBoundingClientRect();
   const nav=document.querySelector('.nav-pill')!.getBoundingClientRect();
   const colors=Array.from(document.querySelectorAll('.natal-sect-role-glyph'),glyph=>getComputedStyle(glyph).color);
   const tokens=getComputedStyle(document.querySelector('.natal-sect-page')!);
   const resolve=(token:string)=>{const span=document.createElement('span');span.style.color=tokens.getPropertyValue(token);document.body.append(span);const color=getComputedStyle(span).color;span.remove();return color;};
   return {articleTop:article.top,backTop:back.top,backLeft:back.left,backHeight:back.height,navTop:nav.top,colors,accent:resolve('--accent'),ink:resolve('--ink'),caution:resolve('--feedback-error-ink')};
  });
  expect(layout.colors).toEqual([layout.accent,layout.accent,layout.ink,layout.caution]);
  if(width>800){
   expect((await article.boundingBox())!.width).toBe(760);await expect(article).toHaveCSS('padding','48px');
   expect(layout.articleTop).toBe(144);expect(layout.backTop).toBe(32);expect(layout.backTop).toBe(layout.navTop);expect(layout.backLeft).toBe(40);expect(layout.backHeight).toBe(56);
   await expect(back).toHaveCSS('font-size','16px');
  }else{
   expect(layout.articleTop).toBe(0);expect(layout.backTop).toBe(24);expect(layout.backLeft).toBe(24);expect(layout.backHeight).toBe(44);
   await expect(article.locator('.natal-sect-roles > div').first()).toHaveCSS('padding','12px');
  }
  await expectReadableTheme(page,'.natal-sect-header h1, .natal-sect-section-header h2, .natal-sect-meta, .natal-sect-sections p, .natal-sect-roles dd');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath(`sect-${sect}-${audience}-${width}-${theme}.png`),fullPage:true});
  await page.reload();await expect(title).toBeVisible();await expect(article).toContainText('The last chart context paragraph remains.');
  await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page).toHaveURL(new RegExp(parent.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'));await expect(pill).toBeFocused();
  await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(pill).toBeFocused();
  await expectNoSectStroke();
  await expect.poll(()=>pill.evaluate(node=>getComputedStyle(node.querySelector('.natal-reading-card__glyph')!).backgroundColor===getComputedStyle(node).color)).toBe(true);
  await page.locator('.natal-sun-card:visible').screenshot({path:test.info().outputPath(`sect-card-${sect}-${audience}-${width}-${theme}.png`)});
  await page.goForward();await expect(title).toBeVisible();await page.goBack();await expect(pill).toBeFocused();
  await page.goto(child);await expect(title).toBeVisible();await page.getByRole('button',{name:'Back',exact:true}).click();await expect(pill).toBeVisible();
  if(width>800){await pill.click();await page.getByRole('button',{name:audience==='you'?'You':'Sky',exact:true}).click();await expect(article).toBeHidden();expect(new URL(page.url()).pathname).toBe('/');}
 });
}

for(const audience of ['you','they']) for(const sect of ['day','night'] as const) test(`Sect page tagged CMS paragraphs ${sect} ${audience}`,async({page})=>{
 await page.setViewportSize({width:390,height:1000});await seed(page,'light','off',{},sect);await authenticate(page,sect);
 const planets=sect==='day'?['Jupiter','Saturn','Mars']:['Venus','Mars','Saturn'];
 const key=`cms/natal-chart-context/${audience}/sect/${sect}`,subject=audience==='you'?'Your':'{{ownerName}}’s';
 const row={id:'eeeeeeee-eeee-4eee-beee-eeeeeeeeeeef',content_key:key,surface:'natal',mode:'article',status:'LIVE',lane:'serving',review_state:null,headline:null,summary:null,
  body:`${subject} exact CMS lead.`,sections:planets.map(planet=>({id:planet.toLowerCase(),heading:planet,body:`${subject} ${planet} paragraph stays complete.\n\nThe second ${planet} paragraph remains.`})),source_snapshot:{contentType:'mustache-template'},updated_at:now};
 await page.route('**/api/content-reader',route=>{const q=route.request().postDataJSON();return route.fulfill({json:readerResponse(q.keys?.includes(key)?[row]:[])});});
 await page.goto(audience==='you'?'/you/natal/sect':'/friends/fixture-friend/natal/sect');
 const article=page.locator('.natal-sect-article');await expect(article.locator('.natal-sect-section-header h2')).toHaveText(planets);
 const saved=(audience==='you'?'Your':'Fixture Friend’s');await expect(article.locator('.natal-sect-intro > p')).toHaveText(`${saved} exact CMS lead.`);
 await expect(article.locator('.natal-sect-sections p')).toHaveText(planets.flatMap(planet=>[`${saved} ${planet} paragraph stays complete.`,`The second ${planet} paragraph remains.`]));
 await expect(article).not.toContainText('{{ownerName}}');
});

for(const audience of ['you','they']) test(`Sect page unavailable writing and network recovery ${audience}`,async({page})=>{
 await page.setViewportSize({width:390,height:900});await seed(page,'light');await authenticate(page);
 let mode='missing';const key=`cms/natal-chart-context/${audience}/sect/day`;
 const row={id:'eeeeeeee-eeee-4eee-beee-eeeeeeeeeefa',content_key:key,surface:'natal',mode:'article',status:'LIVE',lane:'serving',review_state:null,body:'The recovered complete sect paragraph.',updated_at:now};
 await page.route('**/api/content-reader',route=>{const q=route.request().postDataJSON();return mode==='error'&&q.keys?.includes(key)?route.fulfill({status:503,json:{error:'Synthetic unavailable publication'}}):route.fulfill({json:readerResponse(mode==='ready'&&q.keys?.includes(key)?[row]:[])});});
 const path=audience==='you'?'/you/natal/sect':'/friends/fixture-friend/natal/sect';await page.goto(path);
 await expect(page.getByText('This chart reading is not available yet.',{exact:true})).toBeVisible();
 await expect(page.locator('.natal-sect-roles')).toHaveCount(0);
 mode='error';await page.reload();await expect(page.getByRole('alert')).toContainText('The chart reading could not load.');
 mode='ready';await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('.natal-sect-article')).toContainText('The recovered complete sect paragraph.');
});

for(const width of [390,1440])for(const theme of ['light','dark']){
  syntheticMemberTest(`Populated member source contracts ${width} ${theme}`,async({page})=>{
    test.setTimeout(120000);await page.setViewportSize({width,height:1100});
    const assertClean=await inspectMemberSourceFailures(page);
    const fixture=await patternInsightFixtures(page,theme,{cachedSources:true});
    for(const audience of ['you','they']){
      const route=audience==='you'?'/#you?tab=chart':'/#friends?tab=charts&chart=fixture-friend&view=natal';
      const reads:ReadonlyArray<readonly [string,string]>=[['GET','/rest/v1/social_profiles'],['POST','/rest/v1/rpc/list_social_friend_requests'],...(audience==='they'?[['POST','/rest/v1/rpc/list_social_friends']] as const:[])];
      await withFinishedSocialReads(page,`${audience}-initial`,()=>page.goto(route),reads);
      await expect(page.getByRole('heading',{level:1,name:audience==='you'?'Fixture Reader':'Fixture Friend',exact:true})).toBeVisible();
      const section=page.getByRole('region',{name:'Patterns & Insights',exact:true});
      const cards=section.locator('.natal-insight-card');await expect(cards).toHaveCount(2,{timeout:60000});
      await expect(cards.last().locator('.natal-insight-card__preview')).toHaveText(insightPreview.replace(/\n+/g,' '));
      await expect(cards.first().locator('.natal-insight-card__preview')).toHaveText(patternPreview);
      await section.scrollIntoViewIfNeeded();await section.screenshot({path:test.info().outputPath(`member-sources-${audience}-${width}-${theme}.png`)});
      await cards.first().click();await expect(page.locator('.sky-detail-article h1')).toHaveText(/A good plan can still leave.*out of it/);
      await expect(page.locator('.sky-detail-article')).toContainText('The complete parent reading ending remains.');
      await expect(page.locator('.sky-detail-article')).toContainText('The supporting pattern overview remains.');
      await expect(page.locator('.sky-detail-article')).toContainText('The complete supporting pattern ending remains.');
      const back=()=>page.getByRole('button',{name:audience==='you'?'Back to natal chart':'Close detail',exact:true}).click();
      if(audience==='they')await withFinishedSocialReads(page,'friend-back',back,[['POST','/rest/v1/rpc/list_social_friend_requests']]);else await back();
      await expect(section).toBeVisible();await assertClean();
      await withFinishedSocialReads(page,`${audience}-reload`,()=>page.reload(),reads);
      await expect(cards).toHaveCount(2,{timeout:60000});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      if(audience==='they'){
        // A directly loaded Friend detail omits SocialFriendsPanel. Its Charts
        // workspace owns the subscription, so verify a new join there.
        await withFinishedSocialReads(page,'friend-workspace-after-reload',
          ()=>page.getByRole('button',{name:'Charts',exact:true}).click(),
          [['POST','/rest/v1/rpc/list_social_friend_requests']]);
      }
      await assertClean();
    }
    expect(fixture.memberSourceRequests().profileReads).toBeGreaterThan(0);
    expect(fixture.memberSourceRequests().profileSyncs).toBeGreaterThan(0);
    expect(fixture.memberSourceRequests().manualInserts).toBe(0);
    expect(fixture.generationAttempts()).toBe(0);
    await assertClean();
  });
}
