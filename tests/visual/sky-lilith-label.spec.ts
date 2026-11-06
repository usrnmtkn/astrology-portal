import { expect, test } from '@playwright/test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import skyHandler from '../../api/sky';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const published of [false, true]) {
  test(`True Black Moon Lilith label ${width} ${theme} ${published ? 'published' : 'bundled'}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-11-04T17:21:35Z'));
    await bundledPublications(page);
    const passage = 'Published label fixture opening.\n\nPublished label fixture final sentence.';
    const what = 'Published label fixture complete TLDR premise.';
    const takeaway = 'Published label fixture complete TLDR takeaway.';
    if (published) {
      const key = 'sky-lilith/article/sagittarius';
      const source = { ...skyPlacementSourceRecords.get(key)!, LilithArticle: passage, TLDR_What: what, TLDR_Takeaway: takeaway,
        body_you: passage, studio_version_status: 'approved-serving-revision' };
      const updatedAt = '2026-11-04T12:00:00.000Z';
      const row = { id: 'qa-lilith-label-publication', content_key: key, surface: 'sky', mode: 'in_depth',
        status: 'LIVE', lane: 'serving', review_state: null, provider: 'tldrastro-fallback-architecture-v3',
        updated_at: updatedAt, headline: 'Lilith in Sagittarius', body: passage, summary: source.summary,
        sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true },
        source_snapshot: { sourcePackage: source.source_package, content_role: source.content_role },
        block_type: 'fallback_hook', event_type: 'fallback-hook' };
      const publication = { content_key: key, state: 'live', revision: 1, row_id: row.id,
        row_updated_at: updatedAt, updated_at: updatedAt };
      await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([row], [publication]) }));
      await page.route('**/rest/v1/**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/content_runtime_revision')
        ? updatedAt : [publication] }));
    }
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({
        label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York'
      }));
    }, theme);
    await page.route('**/api/sky?**', async route => {
      const response = {
        statusCode: 200,
        setHeader() {},
        end(body: string) {
          void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
        }
      };
      await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage,
        response as unknown as ServerResponse);
    });

    await page.goto('/?date=2026-11-04#sky');
    const card = page.getByRole('button', {
      name: 'Read more about True Black Moon Lilith in Sagittarius', exact: true
    });
    const title = card.locator('.planet-placement-row__title');
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius', { timeout: 60_000 });
    await expect(card.locator('.placement-progress > span')).toHaveText('3 days left');
    await expect(card.locator('.planet-placement-row__status')).toHaveCount(0);
    await expect(card.locator('h1,h2,h3,h4,h5,h6')).toHaveCount(0);

    const typography = (element: Element) => {
      const style = getComputedStyle(element);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight,
        style.letterSpacing, style.margin, style.textTransform, style.textAlign];
    };
    const sunTitle = page.getByRole('button', { name: 'Read more about Sun in Scorpio', exact: true })
      .locator('.planet-placement-row__title');
    expect(await title.evaluate(typography)).toEqual(await sunTitle.evaluate(typography));
    expect(await card.locator('.planet-placement-row__topline').evaluate(element =>
      element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await card.screenshot({ path: `test-results/true-black-moon-lilith-${width}-${theme}.png` });

    await card.click();
    await expect(page.locator('#sky-detail-title')).toHaveText('True Black Moon Lilith in Sagittarius');
    const publishedParagraphs = page.locator('.article-body-inner p').filter({ hasText: /^Published label fixture (?:opening|final sentence)\.$/ });
    if (published) await expect(publishedParagraphs).toHaveText(passage.split('\n\n'));
    if (published) {
      await expect(page.locator('.article-card.sky-detail-card')).toContainText(what);
      await expect(page.locator('.article-card.sky-detail-card')).toContainText(takeaway);
    }
    await page.reload();
    await expect(page.locator('#sky-detail-title')).toHaveText('True Black Moon Lilith in Sagittarius');
    if (published) await expect(publishedParagraphs).toHaveText(passage.split('\n\n'));
    if (published) {
      await expect(page.locator('.article-card.sky-detail-card')).toContainText(what);
      await expect(page.locator('.article-card.sky-detail-card')).toContainText(takeaway);
    }
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius');
    await page.reload();
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius', { timeout: 60_000 });
    expect(errors).toEqual([]);
  });
}


test('original fast Lilith reader navigation preserves labels without pageerrors', async ({ page }, info) => {
 test.setTimeout(180_000);
 const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
 const expected = process.env.EXPECTED_APP_SOURCE_SHA;
 if (expected) expect(sourceSha).toBe(expected);
 const errors: string[] = [], denied: string[] = [], snapshots: { positionCount: number; lilithSign?: string }[] = [];
 const { unhandledExternal, finishStaticFonts } = await installSyntheticNetworkGuard(page.context(), new URL(String(info.project.use.baseURL)).origin);
 page.on('pageerror', error => errors.push(error.message));
 await page.route('**/*', route => {
  const request = route.request(), url = new URL(request.url());
  if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && ['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.continue();
  // The shared guard validates exact static-font paths and drains transfers.
  if (request.method() === 'GET' && ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(url.origin)) return route.fallback();
  denied.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort('blockedbyclient');
 });
 await bundledPublications(page);
 await page.clock.setFixedTime(new Date('2026-11-04T17:21:35Z'));
 await page.addInitScript(() => {
  localStorage.setItem('tldrastro:theme', 'light'); localStorage.setItem('tldrastro:pageAnimations', 'off');
  localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label:'New York', latitude:40.7, longitude:-74, timeZone:'America/New_York' }));
 });
 await page.route(/\/api\/sky(?:-reader)?\?/, async route => {
  let payload = '';
  const response = { statusCode:200, setHeader() {}, end(body:string) { payload = body; } };
  await skyHandler({ method:'GET', url:route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
  const sky = JSON.parse(payload).sky;
  if (sky) snapshots.push({ positionCount:sky.positions.length, lilithSign:sky.positions.find((position:any)=>position.planet==='Lilith')?.sign });
  await route.fulfill({ status:response.statusCode, contentType:'application/json', body:payload });
 });
 await page.goto('/?date=2026-11-04#sky');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 const card=page.getByRole('button',{name:'Read more about True Black Moon Lilith in Sagittarius',exact:true});await expect(card.locator('.planet-placement-row__title')).toHaveText('True Black Moon Lilith in Sagittarius',{timeout:60000});
 await expect.poll(()=>snapshots.some(s=>s.positionCount===14&&s.lilithSign==='Sagittarius'),{timeout:60000}).toBe(true);
 expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await card.click();await expect(page).toHaveURL(/#sky\/placement\/lilith\/sagittarius$/);await expect(page.locator('#sky-detail-title')).toHaveText('True Black Moon Lilith in Sagittarius',{timeout:60000});await expect(page.locator('.sky-placement-key-dates > summary')).toContainText('Key dates',{timeout:60000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('live-lilith-sky-heading.png')});const lilithBody=page.locator('.article-body-inner').first();await expect(lilithBody).toContainText('Black Moon Lilith');const completeLilithBody=await lilithBody.innerText();
 await page.locator('.sky-placement-article__previous').click();await expect(page.locator('#sky-detail-title')).toHaveText('South Node in Leo',{timeout:60000});await expect(page).toHaveURL(/#sky\/placement\/south-node\/leo$/);await expect(page.locator('.sky-placement-article__next')).toContainText('True Black Moon Lilith in Sagittarius');await page.locator('.sky-placement-article__next').click();await expect(page).toHaveURL(/#sky\/placement\/lilith\/sagittarius$/);await expect(page.locator('#sky-detail-title')).toHaveText('True Black Moon Lilith in Sagittarius');await expect.poll(()=>lilithBody.innerText(),{timeout:60000}).toBe(completeLilithBody);await page.reload();await expect(page.locator('#sky-detail-title')).toHaveText('True Black Moon Lilith in Sagittarius',{timeout:60000});await expect.poll(()=>lilithBody.innerText(),{timeout:60000}).toBe(completeLilithBody);await page.getByRole('button',{name:'Close detail',exact:true}).click();await expect(page.locator('#sky-detail-title')).toHaveText('South Node in Leo',{timeout:60000});await expect(page).toHaveURL(/#sky\/placement\/south-node\/leo$/);await page.goto('/?date=2026-11-04#sky');await expect(card).toBeVisible({timeout:60000});
 await page.goto('/?date=2026-11-04#horoscopes?period=monthly&sign=gemini&view=planets');const lilith=page.getByRole('link',{name:'True Black Moon Lilith in Sagittarius · Read horoscope',exact:true});await expect(lilith).toBeVisible({timeout:60000});await expect(lilith).toHaveAttribute('href',/#horoscopes\?.*&planet=lilith&placement=sagittarius$/);await lilith.click();
 const article=page.getByRole('article',{name:'True Black Moon Lilith in Sagittarius horoscope',exact:true});await expect(article.locator('.horoscope-reading-date')).toHaveText('True Black Moon Lilith in Sagittarius');await page.getByRole('button',{name:'Previous Chiron Rx in Aries',exact:true}).click();await page.getByRole('button',{name:'Next True Black Moon Lilith in Sagittarius',exact:true}).click();await page.reload();await expect(article.locator('.horoscope-reading-date')).toHaveText('True Black Moon Lilith in Sagittarius');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await finishStaticFonts();expect(unhandledExternal).toEqual([]);expect(denied).toEqual([]);expect(errors).toEqual([]);await page.screenshot({path:info.outputPath('live-lilith-label.png')});writeFileSync(info.outputPath('original-fast-local-evidence.json'),JSON.stringify({sourceSha,scope:'fresh local App; real Swiss Sky handler and bundled synthetic reader transport',snapshots,denied,errors},null,2));
});
