import { readerResponse } from '../helpers/reader-response';
import { test, expect, type Request } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { astro101IsLiveOnLearn } from '../../apps/web/src/content/astro101';

test.use({ actionTimeout: 15_000 });

const readerBase = process.env.STUDIO_READER_BASE_URL;
if (readerBase && !['127.0.0.1','localhost'].includes(new URL(readerBase).hostname)) throw new Error('Reader fixture origin must be localhost.');
const readerHref = (pathname: string) => readerBase ? new URL(pathname, readerBase).href : pathname;


const rows = ['chapter', 'article'].map(kind => ({
  id: `format-${kind}`, content_key: `education/astro-101/${kind}/format-${kind}`, surface: 'education', mode: 'all',
  status: 'LIVE', lane: 'serving', review_state: null, headline: `Formatting QA ${kind}`, summary: '', body: 'Original copy stays available.',
  sections: { kind, intro: 'Opening QA paragraph.', blocks: [{ heading: 'QA section', body: 'First line.\n\nFinal line.' }] },
  facts: { slug: `/learn/astro-101/format-${kind}` }, source_snapshot: {}, block_type: 'essay', event_type: null, flags: [],
  updated_at: '2026-09-01T00:00:00Z', created_at: '2026-09-01T00:00:00Z'
}));

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Studio formatting, save, live → draft → live at ${width} ${theme}`, async ({ page, context }) => {
    test.setTimeout(120_000);
    const store = await studioApiStore(rows);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await context.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
        localStorage.setItem('tldrastro:theme', theme);
      }, theme);
      await context.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
      await context.route('**/api/content-reader', async route => {
        const query = route.request().postDataJSON();
        if (query.prefix !== 'education/astro-101/') return route.fulfill({ json: readerResponse([]) });
        expect(query.surfaces).toEqual(['education']);
        return route.fulfill({ json: readerResponse((await store.call({ method: 'rows' })).filter(astro101IsLiveOnLearn)) });
      });
      await routeStudioInventoryApi(page, { call: store.call, answer: async (route, url) => {
        if (url.pathname !== '/api/admin/content-live-status') return false;
        await route.fulfill({ json: { ok: true, statuses: await store.call({ method: 'statuses', body: route.request().postDataJSON() }) } }); return true;
      } });
      await page.setViewportSize({ width, height: 1000 });
      const reader = await context.newPage();
      // Separate localhost origins cannot receive the same-origin update signal.
      const refreshSeparateReader=async()=>{if(new URL(reader.url()).origin!==new URL(page.url()).origin)await reader.reload();};
      reader.on('pageerror', error => errors.push(error.message));
      await reader.setViewportSize({ width, height: 1000 });
      await reader.goto(readerHref('/learn/astro-101/format-chapter'));
      await expect(reader.getByRole('heading', { name: rows[0].headline, exact: true })).toBeVisible();
      await page.goto('/admin/content#astro-101');
      await page.getByText(rows[0].headline, { exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor' });
      await expect(editor.locator('.admin-editor-context-line')).toContainText('Astro 101 · Chapter');
      await expect(editor.locator('.admin-editor-context-line')).toContainText('Visible in app');
      await expect(editor.locator('.admin-editor-context-line')).not.toContainText('all');
      const body = editor.getByRole('textbox', { name: 'Section 1 body', exact: true });
      const original = await body.inputValue();
      await body.locator('..').getByRole('button', { name: 'Format text', exact: true }).click();
      const writing = editor.getByRole('textbox', { name: 'Section 1 body formatted text', exact: true });
      await writing.selectText();
      await editor.getByRole('button', { name: 'Bold', exact: true }).click();
      await expect(writing.locator('strong')).toHaveCount(2);
      await editor.getByRole('button', { name: 'Italic', exact: true }).click();
      await expect(writing.locator('em')).toHaveCount(2);
      await editor.getByRole('button', { name: 'Bulleted list', exact: true }).click();
      await expect(writing.locator('ul > li')).toHaveCount(2);
      await editor.getByRole('button', { name: 'Numbered list', exact: true }).click();
      await expect(writing.locator('ol > li')).toHaveCount(2);
      await editor.getByRole('button', { name: 'Undo formatting', exact: true }).click();
      await expect(writing.locator('ul > li')).toHaveCount(2);
      await editor.getByRole('button', { name: 'Redo formatting', exact: true }).click();
      await expect(writing.locator('ol > li')).toHaveCount(2);
      await expect(editor.getByLabel('Reader status', { exact: true })).toContainText('Live');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await writing.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/studio-format-${width}-${theme}.png`, fullPage: true });
      await editor.getByRole('button', { name: 'Done formatting', exact: true }).click();
      const formatted = await body.inputValue();
      expect(formatted).not.toBe(original);
      await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0].sections.blocks[0].body).toBe(formatted);
      await refreshSeparateReader();
      await expect(reader.locator('.learn-article-body ol > li')).toHaveCount(2);
      await expect(reader.locator('.learn-article-body strong')).toHaveCount(2);
      await expect(reader.locator('.learn-article-body em')).toHaveCount(2);
      await expect(reader.locator('.learn-article-body')).toContainText('Final line.');
      await reader.screenshot({ path: `test-results/studio-formatted-reader-${width}-${theme}.png`, fullPage: true });
      await editor.getByRole('button', { name: 'Move to draft', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0].status).toBe('DRAFT');
      await expect(editor.locator('.admin-editor-context-line')).toContainText('Hidden from app');
      await refreshSeparateReader();
      await expect(reader.getByRole('heading', { name: 'Page not found', exact: true })).toBeVisible();
      await reader.goto(readerHref('/learn'));
      await expect(reader.getByRole('button', { name: rows[0].headline, exact: true })).toHaveCount(0);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await page.getByText(rows[0].headline, { exact: true }).click();
      await expect(body).toHaveValue(formatted);
      await body.locator('..').getByRole('button', { name: 'Format text', exact: true }).click();
      await expect(writing.locator('ol > li')).toHaveCount(2);
      await editor.getByRole('button', { name: 'Done formatting', exact: true }).click();
      await expect(body).toHaveValue(formatted);
      await editor.getByRole('button', { name: 'Publish to app', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0].status).toBe('LIVE');
      await refreshSeparateReader();
      await expect(reader.getByRole('button', { name: rows[0].headline, exact: true })).toBeVisible();
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByText(rows[1].headline, { exact: true }).click();
      await expect(editor.locator('.admin-editor-context-line')).toContainText('Astro 101 · Article');
      await reader.goto(readerHref('/learn/astro-101/format-article'));
      await expect(reader.getByRole('heading', { name: rows[1].headline, exact: true })).toBeVisible();
      await editor.getByRole('button', { name: 'Move to draft', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[1].status).toBe('DRAFT');
      await refreshSeparateReader();
      await expect(reader.getByRole('heading', { name: 'Page not found', exact: true })).toBeVisible();
      expect((await store.call({ method: 'rows' }))[1].sections).toEqual(rows[1].sections);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('button', { name: 'New chapter', exact: true }).click();
      await editor.getByRole('textbox', { name: 'Article intro', exact: true }).locator('..').getByRole('button', { name: 'Format text', exact: true }).click();
      const emptyWriting = editor.getByRole('textbox', { name: 'Article intro formatted text', exact: true });
      await expect(emptyWriting).toHaveText('');
      await emptyWriting.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/studio-format-empty-${width}-${theme}.png`, fullPage: true });
      const typography = (element: Element) => {
        const style = getComputedStyle(element);
        return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
      };
      expect(await emptyWriting.evaluate(typography)).toEqual(await editor.locator('textarea[aria-label="Article intro"]').evaluate(typography));
      await emptyWriting.fill('QA {{custom.my_phrase}} text');
      await emptyWriting.selectText();
      await editor.getByRole('button', { name: 'Bold', exact: true }).click();
      await editor.getByRole('button', { name: 'Done formatting', exact: true }).click();
      await expect(editor.getByRole('textbox', { name: 'Article intro', exact: true })).toHaveValue('**QA {{custom.my_phrase}} text**');
      expect(errors).toEqual([]);
    } finally { await context.unrouteAll({ behavior: "wait" }); store.close(); }
  });
}

test('Held article style module finishes after close without reopening or saving a draft',async({page,context})=>{
  const store=await studioApiStore([rows[0]]);
  let release!:()=>void,held=false,heldRequest:Request|undefined;
  let outcome:{status:number|null;failure:string|null}|undefined;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  page.on('requestfinished',async request=>{if(request===heldRequest)outcome={status:(await request.response())?.status()??null,failure:request.failure()?.errorText??null};});
  page.on('requestfailed',request=>{if(request===heldRequest)outcome={status:null,failure:request.failure()?.errorText??'request failed'};});
  try{
    await context.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
    await routeStudioInventoryApi(page,{call:store.call});
    await page.route('**/assets/ArticleBlockStyleFields-*.js',async route=>{held=true;heldRequest=route.request();await gate;await route.continue();});
    await page.goto('/admin/content#astro-101');
    await page.getByText(rows[0].headline,{exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Generated content editor'});
    await expect.poll(()=>held).toBe(true);
    await expect(editor.getByText('Loading article section styles…',{exact:true})).toBeVisible();
    await expect(editor.getByRole('region',{name:'Article section styles',exact:true})).toHaveCount(0);
    await editor.getByRole('textbox',{name:'Card title',exact:true}).fill('Unsaved held style title');
    page.once('dialog',dialog=>dialog.accept());
    await editor.getByRole('button',{name:'Close',exact:true}).click();
    await expect(editor).toHaveCount(0);
    release();
    await expect.poll(()=>outcome).toEqual({status:200,failure:null});
    await expect(editor).toHaveCount(0);
    expect((await store.call({method:'rows'}))[0].headline).toBe(rows[0].headline);
    await page.getByText(rows[0].headline,{exact:true}).click();
    const styles=editor.getByRole('region',{name:'Article section styles',exact:true});
    await expect(styles).toBeVisible();
    await expect(editor.getByRole('textbox',{name:'Section 1 body',exact:true})).toHaveValue(rows[0].sections.blocks[0].body);
    await editor.getByRole('textbox',{name:'Card title',exact:true}).fill('Saved after actual style module load');
    await editor.getByRole('button',{name:'Save changes',exact:true}).click();
    await expect.poll(async()=>{const row=(await store.call({method:'rows'}))[0];return {headline:row.headline,body:row.sections.blocks[0].body};}).toEqual({headline:'Saved after actual style module load',body:rows[0].sections.blocks[0].body});
    await page.reload();await page.getByText('Saved after actual style module load',{exact:true}).click();
    await expect(editor.getByRole('textbox',{name:'Section 1 body',exact:true})).toHaveValue(rows[0].sections.blocks[0].body);
  }finally{release?.();await store.close();}
});
