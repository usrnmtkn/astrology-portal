import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { watchBrowserErrors } from "./qaRuntimeGuards";

let script = "";
test.beforeAll(async () => {
  const output = await build({ stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import React, {useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import {InteractiveZodiacWheel} from './apps/web/src/components/charts/InteractiveZodiacWheel';
    const names = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','North Node','South Node','Lilith','Chiron'];
    const initial = [213.4,39.75,230.2,209.1,135.55,143.15,9.3,64.45,2.6,303.1,327.4,147.4,253.8,28.2];
    const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const params = new URLSearchParams(location.search), kind = params.get('kind') ?? 'sky';
    function Harness() {
      const [changed,setChanged] = useState(false);
      const positions = names.map((planet,index) => {
        let longitude = initial[index];
        if (changed && kind==='sky') longitude = (longitude+35)%360;
        if (kind==='own' && planet==='Saturn') longitude=280;
        if (kind==='mercury' && planet==='Mercury') longitude=335;
        return {planet,longitude,sign:signs[Math.floor(longitude/30)],degree:longitude%30,
          house:1,glyph:'',signGlyph:'',speed:index===2?-0.5:index===6?-0.05:0.1,motion:'direct'};
      });
      const snapshot = {positions,aspects:[],ascendantLongitude:271.2,midheavenLongitude:208.7,
        birthTimeKnown:true,generatedAt:'2026-11-04T17:00:00Z',solarHorizon:{version:'solar-horizon-v1',instant:'2026-11-04T17:00:00Z',altitude:30}};
      return <main style={{maxWidth:520,margin:'auto',padding:16}}>
        <button onClick={()=>setChanged(value=>!value)}>Change selected date</button>
        <InteractiveZodiacWheel snapshot={snapshot} mode={kind==='sky'?'sky':'natal'}
          ownerName={kind==='friend'||kind==='unknown'?'Alisa Hart':undefined}
          birthTimeUnknown={kind==='unknown'} pronouns={params.get('pronouns') ?? undefined}/>
      </main>;
    }
    createRoot(document.getElementById('root')).render(<Harness/>);
  ` }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"production"', "import.meta.env": '{"BASE_URL":"/"}' } });
  script = output.outputFiles[0].text;
});

async function openHarness(page: import("@playwright/test").Page, kind: string, theme = "light", pronouns = "") {
  const dist = process.env.PLAYWRIGHT_DIST_ROOT ?? "apps/web/dist";
  const manifest = JSON.parse(readFileSync(`${dist}/.vite/manifest.json`, "utf8"));
  const wheelStyles = Object.entries(manifest).filter(([key]) => key.endsWith("/InteractiveZodiacWheel.tsx") || key.startsWith("_InteractiveZodiacWheel-") && key.endsWith(".js"))
    .flatMap(([, value]) => (value as { css?: string[] }).css ?? []);
  expect(wheelStyles.length).toBeGreaterThan(0);
  const styles = [...manifest["index.html"].css, manifest["src/styles.css"].file, ...wheelStyles];
  // All fixture positions stay inside this isolated browser harness.
  await page.route("**/__interactive-wheel?**", route => route.fulfill({ contentType: "text/html", body:
    `<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map(file => `<link rel="stylesheet" href="/${file}">`).join("")}</head><body><div id="root"></div><script>${script}</script></body></html>` }));
  await page.goto(`/__interactive-wheel?kind=${kind}&pronouns=${pronouns}`);
  await expect(page.locator(".interactive-zodiac-wheel__svg")).toBeVisible();
  await expect(page.locator(".interactive-zodiac-wheel")).toHaveCSS("display", "grid");
}

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`interactive wheel selection and ruler details ${width} ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1100 });
    await openHarness(page, "sky", theme);
    const root = page.locator(".interactive-zodiac-wheel");
    const sun = root.locator('[data-planet="Sun"] [role="button"]');
    await expect(root.locator(".interactive-wheel-planet")).toHaveCount(15);
    await expect(root.locator(".interactive-wheel-angle")).toHaveCount(4);
    await expect(root.locator(".interactive-wheel-sector[role=button]")).toHaveCount(12);
    expect(await root.locator(".interactive-wheel-paper").evaluateAll(nodes => nodes.map(node => Number(node.getAttribute("r"))))).toEqual([292, 112]);
    await sun.focus(); await page.keyboard.press("Enter");
    await expect(sun).toHaveAttribute("aria-pressed", "true");
    await expect(root.getByRole("region", { name: "Selected chart details" })).toContainText("Sun in Scorpio");
    await expect(root.locator(".interactive-wheel-detail__header .lucide-chevron-right")).toBeVisible();
    await expect(root.locator(".lucide-arrow-up-right")).toHaveCount(0);
    await expect(root.locator(".interactive-wheel-detail__header")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    expect(await root.locator('[data-dimmed="true"]').count()).toBeGreaterThan(0);
    await expect(root.locator('.interactive-wheel-aspects [data-active]')).not.toHaveCount(0);
    const row = root.locator(".interactive-wheel-detail__aspect").first();
    await expect(row).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(row).toHaveCSS("box-shadow", "none");
    const typography = await row.evaluate(element => {
      const reference = document.createElement("div");
      reference.className = "aspect-inspector-summary";
      reference.hidden = true;
      reference.innerHTML = '<div class="aspect-inspector-summary__head"><strong>Reference point</strong></div><div class="aspect-inspector-summary__item"><span></span><span class="aspect-inspector-summary__copy"><strong>Trine</strong> Reference planet</span><span class="aspect-inspector-summary__orb">2.4° orb</span></div>';
      document.body.append(reference);
      const read = (node: Element) => {
        const style = getComputedStyle(node);
        return { font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, leading: style.lineHeight, tracking: style.letterSpacing };
      };
      const result = {
        row: read(element), referenceRow: read(reference.querySelector(".aspect-inspector-summary__item")!),
        aspect: read(element.querySelector("strong")!), referenceAspect: read(reference.querySelector(".aspect-inspector-summary__copy strong")!),
        orb: read(element.querySelector(".interactive-wheel-detail__orb")!), referenceOrb: read(reference.querySelector(".aspect-inspector-summary__orb")!)
      };
      reference.remove();
      return result;
    });
    expect(typography.row).toEqual(typography.referenceRow);
    expect(typography.aspect).toEqual(typography.referenceAspect);
    expect(typography.orb).toEqual(typography.referenceOrb);
    await root.locator(".interactive-wheel-detail").screenshot({ path: info.outputPath(`clean-detail-${theme}-${width}.png`) });
    const partner = await row.locator(".interactive-wheel-detail__partner").innerText();
    await row.click();
    await expect(root.locator(".interactive-wheel-detail__heading")).toContainText(partner);
    await page.keyboard.press("Escape");
    await expect(root.locator(".interactive-wheel-detail")).toHaveCount(0);
    await root.locator('[data-house="1"]').click();
    await expect(root.locator(".interactive-wheel-detail__heading")).toContainText("1st house in Capricorn");
    await expect(root.locator(".interactive-wheel-lord-connector")).toHaveCount(0);
    await expect(root.locator(".interactive-wheel-detail")).not.toContainText("Lord:");
    await root.locator('[data-house="1"]').click();
    await expect(root.locator(".interactive-wheel-detail")).toHaveCount(0);
    await root.locator('[data-house="3"]').focus(); await page.keyboard.press("Enter");
    await expect(root.locator(".interactive-wheel-detail__heading")).toContainText("Empty house");
    await expect(root.locator(".interactive-wheel-detail__empty")).toHaveText("No occupants");
    await page.keyboard.press("Escape");
    await sun.click();
    const svgBox = (await root.locator(".interactive-zodiac-wheel__svg").boundingBox())!;
    await page.mouse.click(svgBox.x + svgBox.width / 2, svgBox.y + svgBox.height / 2);
    await expect(root.locator(".interactive-wheel-detail")).toHaveCount(0);
    await sun.click();
    await page.getByRole("button", { name: "Change selected date" }).click();
    await expect(root.locator(".interactive-wheel-detail")).toHaveCount(0);
    await expect(sun).toHaveAttribute("aria-label", /Sagittarius/);
    await root.locator('[data-angle="ASC"]').focus(); await page.keyboard.press("Space");
    await expect(root.locator(".interactive-wheel-detail__heading")).toContainText("Ascendant in Capricorn");
    await root.screenshot({ path: info.outputPath(`sky-${theme}-${width}.png`) });

    await openHarness(page, "you", theme);
    await root.locator('[data-house="1"]').focus(); await page.keyboard.press("Enter");
    await expect(root.locator(".interactive-wheel-detail__heading")).toContainText("Lord: Saturn in Aries · 4th · Fall · Rx");
    await expect(root.locator('[data-planet="Saturn"]')).not.toHaveAttribute("data-dimmed");
    await root.getByRole("button", { name: "Explore house ruler", exact: true }).hover();
    const lord = root.getByRole("dialog", { name: "House ruler", exact: true });
    await expect(lord).toContainText("Your 1st house ruler is in your 4th");
    const bounds = (await lord.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await expect(lord).toContainText("Capricorn is rising in your chart, so Saturn rules your 1st house.");
    await expect(lord).toContainText("Saturn is retrograde in Aries in the 4th, where it's in its fall.");
    await lord.hover(); await page.waitForTimeout(200);
    await expect(lord).toBeVisible();
    await expect(lord.getByRole("link", { name: "fall", exact: true })).toHaveAttribute("href", "/learn");
    await root.screenshot({ path: info.outputPath(`natal-ruler-${theme}-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape"); await expect(lord).toHaveCount(0);
    await page.keyboard.press("Escape"); await expect(root.locator(".interactive-wheel-detail")).toHaveCount(0);
  });
}

test("friend ruler copy respects names and supplied pronouns; own-house and Mercury conditions stay complete", async ({ page }) => {
  const root = page.locator(".interactive-zodiac-wheel");
  for (const [pronouns, possessive] of [["", "the"], ["she", "her"], ["he", "his"], ["they", "their"]]) {
    await openHarness(page, "friend", "light", pronouns);
    await root.locator('[data-house="1"]').click();
    await root.getByRole("button", { name: "House ruler details", exact: true }).click();
    const lord = root.getByRole("dialog");
    await expect(lord).toContainText(`Alisa's 1st house ruler is in ${possessive} 4th`);
    await expect(lord).not.toContainText("your chart");
    await expect(lord).toContainText("Capricorn is rising in Alisa's chart");
  }
  await openHarness(page, "own");
  await root.locator('[data-house="1"]').click();
  await expect(root.locator(".interactive-wheel-lord-connector")).toHaveCount(0);
  await root.getByRole("button", { name: "House ruler details" }).click();
  await expect(root.getByRole("dialog")).toContainText("Your 1st house ruler is in its own house");
  await expect(root.getByRole("dialog").getByRole("link", { name: "its own sign" })).toBeVisible();
  await openHarness(page, "mercury");
  await root.locator('[data-house="6"]').focus(); await page.keyboard.press("Enter");
  await root.getByRole("button", { name: "House ruler details", exact: true }).click();
  await expect(root.getByRole("dialog")).toContainText("detriment and fall");
  await expect(root.getByRole("dialog")).toContainText("Mercury also rules the 9th.");
});

test.describe("touch and unknown birth time", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("tap selects without hover; missing time removes every timed affordance", async ({ page }) => {
    await openHarness(page, "friend");
    const root = page.locator(".interactive-zodiac-wheel");
    // Select via the house-number ring instead of a wedge bounding-box center.
    await root.locator('[data-house="1"] .interactive-wheel-sector__wedge').tap();
    await root.getByRole("button", { name: "House ruler details", exact: true }).tap();
    await expect(root.getByRole("dialog")).toBeVisible();
    await root.getByRole("button", { name: "Close house ruler details" }).tap();
    const sun = root.locator('[data-planet="Sun"] [role="button"]');
    await sun.tap();
    await expect(root.locator(".interactive-wheel-detail__heading")).toContainText("Sun in Scorpio");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await sun.tap(); await expect(root.locator(".interactive-wheel-detail")).toHaveCount(0);
    await openHarness(page, "unknown");
    await expect(root.locator(".interactive-wheel-sector[role=button], .interactive-wheel-angle, .interactive-wheel-house, .interactive-wheel-lord-connector")).toHaveCount(0);
    await expect(root.locator(".interactive-wheel-planet")).toHaveCount(14);
    await root.locator('[data-planet="Sun"] [role="button"]').tap();
    await expect(root.locator(".interactive-wheel-detail")).not.toContainText(/house|Lord|sect/i);
    await expect(root.locator(".interactive-wheel-detail__aspect").first()).toBeVisible();
  });
});

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Studio wheel tooltip save, reopen, publish and reader ${width} ${theme}`, async ({page, context}, info) => {
    test.setTimeout(90_000);
    const {studioApiStore} = await import('../helpers/studio-api-store');
    const {routeStudioInventoryApi} = await import('../helpers/studio-inventory-route');
    const {installSyntheticNetworkGuard} = await import('../helpers/synthetic-network-guard');
    const guard = await installSyntheticNetworkGuard(context, new URL(info.project.use.baseURL as string).origin);
    await page.route('**/rest/v1/**', route => route.fulfill({json:[]}));
    const store = await studioApiStore([], {uuidIds:true});
    try {
      await routeStudioInventoryApi(page, {call:store.call, actualDocumentRoute:true, answer:async(route,url)=>{
        if(url.pathname==='/api/content-publications') {
          const {routeStudioPublicReader}=await import('../helpers/studio-public-reader-route');
          return routeStudioPublicReader(route,url,store.call);
        }
        if (url.pathname==='/api/content-reader') {
          const result=await store.call({method:route.request().method(),url:url.pathname+url.search,body:route.request().postData()?route.request().postDataJSON():undefined});
          await route.fulfill({status:result.status,json:result.payload});return true;
        }
        return false;
      }});
      await page.addInitScript(theme=>{
        localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme',theme);
      }, theme);
      await page.setViewportSize({width,height:1100});
      await page.goto('/admin/content#wheel-tooltips');
      const section=page.getByRole('region',{name:'Wheel tooltip sources',exact:true});
      await expect(section).toBeVisible();
      if(width===390)await page.getByRole('button',{name:'Open Content Studio navigation',exact:true}).click();
      const zodiacNav=page.getByRole('region',{name:'Zodiac Wheel',exact:true});
      await expect(zodiacNav.getByRole('button',{name:'Tooltips',exact:true})).toHaveAttribute('aria-current','page');
      await expect(page.getByRole('region',{name:'Write',exact:true}).getByRole('button',{name:/tooltips/i})).toHaveCount(0);
      expect(await page.locator('.admin-nav-section > .admin-eyebrow').allTextContents()).toEqual(['Publish','Write','Zodiac Wheel','Compose']);
      const navTypography=await page.locator('.admin-nav').evaluate(nav=>{
        const read=(label:string)=>{const css=getComputedStyle(nav.querySelector(`[aria-label="${label}"] > .admin-eyebrow`)!);return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','marginTop','marginBottom','textTransform','textAlign'].map(key=>[key,css[key as keyof CSSStyleDeclaration]]));};
        return {actual:read('Zodiac Wheel'),reference:read('Write')};
      });
      expect(navTypography.actual).toEqual(navTypography.reference);
      await zodiacNav.screenshot({path:info.outputPath(`zodiac-wheel-navigation-${width}-${theme}.png`)});
      await zodiacNav.getByRole('button',{name:'Tooltips',exact:true}).click();
      await expect(page.locator('h1')).toHaveText('Zodiac Wheel tooltips');
      await expect(page.getByRole('navigation',{name:'Breadcrumb'})).toHaveText('Admin / Zodiac Wheel / Tooltips');
      await expect(section.locator('h2')).toHaveText('Wheel tooltip wording');
      const typography=await section.locator('h2').evaluate(element=>{
        const reference=document.createElement('section');reference.className='admin-editor-guidance';
        reference.innerHTML='<h2>Friction and flow writing</h2>';element.parentElement!.append(reference);
        const read=(node:Element)=>{const css=getComputedStyle(node);return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','marginTop','marginBottom','textTransform','textAlign'].map(key=>[key,css[key as keyof CSSStyleDeclaration]]));};
        const result={actual:read(element),reference:read(reference.firstElementChild!)};reference.remove();return result;
      });
      expect(typography.actual).toEqual(typography.reference);
      await section.screenshot({path:info.outputPath(`wheel-tooltip-studio-${width}-${theme}.png`)});
      await page.getByRole('button',{name:'Edit tooltip wording',exact:true}).click();
      const field=page.getByRole('textbox',{name:'Tooltip wording',exact:true});
      await expect(field).toHaveValue('{{ownerPossessive}} {{houseOrdinal}} house ruler is in {{possessive}} {{rulerHouseOrdinal}}');
      expect(await store.call({method:'rows'})).toEqual([]);
      const body='{{ownerPossessive}} {{houseOrdinal}} house ruler: {{possessive}} {{rulerHouseOrdinal}}. Synthetic final sentence.';
      await field.fill('{{unknown}}');
      await expect(page.getByRole('button',{name:'Save & publish',exact:true})).toBeDisabled();
      await expect(page.getByRole('alert',{name:'CMS template errors'})).toContainText('unsupported variable');
      await field.fill(body);
      await page.getByRole('dialog').screenshot({path:info.outputPath(`wheel-tooltip-editor-${width}-${theme}.png`)});
      await page.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect.poll(async()=> (await store.call({method:'rows'})).length).toBe(1);
      let saved=(await store.call({method:'rows'}))[0];
      expect(saved.status).toBe('DRAFT');expect(saved.body).toBe(body);
      await page.reload();await page.getByRole('button',{name:'Edit tooltip wording',exact:true}).click();
      await expect(field).toHaveValue(body);
      await field.fill(body+' Unsaved local edit.');
      await store.call({method:'PATCH',body:{id:saved.id,expectedUpdatedAt:saved.updated_at,body:body+' Newer saved edit.'}});
      await page.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(page.getByRole('alert').filter({hasText:/changed|newer|stale|another|reload/i}).first()).toBeVisible();
      await expect(field).toHaveValue(body+' Unsaved local edit.');
      await page.reload();await page.getByRole('button',{name:'Edit tooltip wording',exact:true}).click();
      await expect(field).toHaveValue(body+' Newer saved edit.');
      await field.fill(body);
      await page.getByRole('button',{name:'Save & publish',exact:true}).click();
      await expect.poll(async()=> (await store.call({method:'rows'}))[0].status).toBe('LIVE');
      saved=(await store.call({method:'rows'}))[0];expect(saved.body).toBe(body);
      for (const kind of ['you','friend']) {
        await openHarness(page,kind,theme,"they");
        await page.mouse.move(0,0);
        await page.locator('[data-house="1"]').focus();await page.keyboard.press('Enter');
        await page.getByRole('button',{name:'House ruler details',exact:true}).focus();await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog',{name:'House ruler',exact:true})).toContainText(kind==='you'
          ? 'Your 1st house ruler: your 4th. Synthetic final sentence.'
          : "Alisa's 1st house ruler: their 4th. Synthetic final sentence.");
      }
      await page.goto('/admin/content#wheel-tooltips');
      await page.getByRole('combobox',{name:'Tooltip group',exact:true}).selectOption('Hover details');
      await page.getByRole('combobox',{name:'Wording source',exact:true}).selectOption('cms/wheel-tooltip/hover/planet-title');
      await page.getByRole('button',{name:'Edit tooltip wording',exact:true}).click();
      await field.fill('Synthetic {{planet}} in {{sign}} · {{degree}}{{house}}. Complete hover ending.');
      await page.getByRole('button',{name:'Save & publish',exact:true}).click();
      await expect.poll(async()=> (await store.call({method:'rows'})).filter((row:any)=>row.status==='LIVE').length).toBe(2);
      await openHarness(page,'sky',theme);
      await page.locator('[data-planet="Sun"] [role="button"]').hover();
      await expect(page.getByRole('tooltip')).toContainText('Synthetic Sun in Scorpio');
      await expect(page.getByRole('tooltip')).toContainText('Complete hover ending.');
      await guard.finishStaticFonts();expect(guard.unhandledExternal).toEqual([]);
    } finally {store.close();}
  });
}

test('Studio wheel tooltip source loading and read failure preserve saved wording',async({page,context},info)=>{
  const {studioApiStore}=await import('../helpers/studio-api-store');
  const {routeStudioInventoryApi}=await import('../helpers/studio-inventory-route');
  const {installSyntheticNetworkGuard}=await import('../helpers/synthetic-network-guard');
  const {wheelTooltipSourceDraft}=await import('../../apps/admin/src/wheelTooltipSources');
  const guard=await installSyntheticNetworkGuard(context,new URL(info.project.use.baseURL as string).origin);
  await page.route('**/rest/v1/**',route=>route.fulfill({json:[]}));
  const store=await studioApiStore([],{uuidIds:true});
  let release=()=>{},entered=false,fail=true;
  const {id:_id,...starter}=wheelTooltipSourceDraft('cms/wheel-tooltip/ruler/title');
  const body='Saved opening. '+starter.body+' Complete saved ending.';
  try {
    await store.call({method:'POST',body:{...starter,body,eventType:'cms-surface-override'}});
    await routeStudioInventoryApi(page,{actualDocumentRoute:true,call:async request=>{
      if(fail&&request.method==='GET'&&new URL(request.url??'','http://fixture').searchParams.get('contentKey')===starter.contentKey){
        entered=true;await new Promise<void>(resolve=>{release=resolve;});
        return {status:500,payload:{error:'Synthetic source unavailable'}};
      }
      return store.call(request);
    }});
    await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
    await page.goto('/admin/content#wheel-tooltips');
    const open=page.getByRole('button',{name:'Edit tooltip wording',exact:true});
    await open.click();await expect.poll(()=>entered).toBe(true);await expect(open).toBeDisabled();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    release();await expect(page.getByText('Synthetic source unavailable',{exact:false}).first()).toBeVisible();
    await expect(open).toBeEnabled();await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await store.call({method:'rows'}))[0].body).toBe(body);
    fail=false;await open.click();
    await expect(page.getByRole('textbox',{name:'Tooltip wording',exact:true})).toHaveValue(body);
    expect((await store.call({method:'rows'})).length).toBe(1);
    await guard.finishStaticFonts();expect(guard.unhandledExternal).toEqual([]);
  } finally {release();store.close();}
});

for (const [width, theme] of [[390, 'dark'], [1440, 'light']] as const) {
  for (const scenario of ['late Daily read', 'late wheel read', 'dirty Daily navigation', 'busy Daily navigation'] as const) {
    test(`wheel and Daily editors retain independent navigation and loading ownership: ${scenario} ${width} ${theme}`, async ({ page, context }, info) => {
      test.setTimeout(90_000);
      const { studioApiStore } = await import('../helpers/studio-api-store');
      const { routeStudioInventoryApi } = await import('../helpers/studio-inventory-route');
      const { installSyntheticNetworkGuard } = await import('../helpers/synthetic-network-guard');
      const { wheelTooltipSourceDraft } = await import('../../apps/admin/src/wheelTooltipSources');
      const network = await installSyntheticNetworkGuard(context, new URL(info.project.use.baseURL as string).origin);
      const assertNoErrors = watchBrowserErrors(page);
      const now = '2026-11-06T12:00:00.000Z';
      const dailyRows = ['headline', 'body'].map((kind, index) => {
        const key = `fallback-hook/daily-${kind}/soft/mars`;
        const you = `Synthetic Daily ${kind}. Complete You ending.`;
        const they = `Synthetic Friend ${kind}. Complete Friend ending.`;
        return {
          id: `32000000-0000-4000-8000-00000000000${index + 1}`, content_key: key,
          surface: 'you', mode: 'feed', status: 'DRAFT', event_type: 'fallback-hook', target_date: null,
          headline: key, summary: 'Synthetic Daily navigation fixture.', body: you,
          sections: { packageRecord: { content_role: 'fallback_hook', contentKey: key, review_status: 'approved', body_you: you, body_they: they } },
          block_type: 'fallback_hook', lane: 'reference', review_state: null,
          facts: { fallbackArchitectureV3: true, review_status: 'approved' }, knowledge_ids: [],
          source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', review_status: 'approved' },
          reviewer_notes: null, prompt_version: 'qa-daily-navigation', provider: 'fallback-architecture-v3', model: null,
          reviewed_at: now, published_at: null, updated_at: now, created_at: now
        };
      });
      const store = await studioApiStore(dailyRows, { uuidIds: true, publicationDb: true });
      const deferred = () => { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; };
      const dailyGate = deferred(), wheelGate = deferred(), prefetchGate = deferred(), saveGate = deferred();
      const late = scenario === 'late Daily read' || scenario === 'late wheel read';
      let dailyReads = 0, wheelReads = 0, saves = 0;
      const completed: Array<{ key: string; status: number; body: string }> = [];
      try {
        const { id: _id, ...starter } = wheelTooltipSourceDraft('cms/wheel-tooltip/ruler/title');
        const wheelBody = 'Synthetic wheel opening. ' + starter.body + ' Complete wheel ending.';
        const created = await store.call({ method: 'POST', body: { ...starter, body: wheelBody, eventType: 'cms-surface-override' } });
        expect(created.status).toBe(200);
        const original = await store.call({ method: 'rows' });
        await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
        await routeStudioInventoryApi(page, { actualDocumentRoute: true, call: async message => {
          const url = new URL(message.url ?? '/', 'http://fixture.test');
          const keys = url.searchParams.getAll('contentKeys');
          if (late && message.method === 'GET' && !url.searchParams.has('id') && dailyRows.every(row => keys.includes(row.content_key))) await prefetchGate.promise;
          if (late && message.method === 'GET' && dailyRows.some(row => row.id === url.searchParams.get('id')) && dailyReads < 2) {
            dailyReads++; await dailyGate.promise;
          }
          if (late && message.method === 'GET' && url.searchParams.get('contentKey') === starter.contentKey && wheelReads < 1) {
            wheelReads++; await wheelGate.promise;
          }
          if (scenario === 'busy Daily navigation' && message.method === 'PATCH' && (message.body as { id?: string })?.id === dailyRows[0].id) {
            saves++; await saveGate.promise;
          }
          return store.call(message);
        } });
        await page.addInitScript(theme => {
          localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
          localStorage.setItem('tldrastro:studio-theme', theme);
        }, theme);
        await page.setViewportSize({ width, height: 1000 });
        const dailyHash = '#fallback-hooks?section=daily';
        const wheelHash = '#wheel-tooltips';
        const navigate = (hash: string) => page.evaluate(value => { window.location.hash = value; }, hash);
        const dailyStudio = page.getByRole('region', { name: 'Daily At-a-Glance editor', exact: true });
        const dailyOpen = dailyStudio.getByRole('button', { name: 'Edit write-up', exact: true });
        const wheelOpen = page.getByRole('button', { name: 'Edit tooltip wording', exact: true });
        const dailyEditor = page.getByRole('dialog', { name: 'Daily At-a-Glance paired editor', exact: true });
        const wheelEditor = page.getByRole('dialog', { name: 'Generated content editor', exact: true });
        const finishRead = async (request: import('@playwright/test').Request, expected: Array<{ content_key: string; body: string }>) => {
          const [response] = await Promise.all([page.waitForResponse(response => response.request() === request), page.waitForEvent('requestfinished', finished => finished === request)]);
          expect(response.status()).toBe(200); expect(await response.finished()).toBeNull(); expect(request.failure()).toBeNull();
          const payload = await response.json(); expect(payload.ok).toBe(true); expect(payload.rows).toHaveLength(expected.length);
          for (const row of expected) {
            expect(payload.rows.find((entry: { content_key: string }) => entry.content_key === row.content_key)?.body).toBe(row.body);
            completed.push({ key: row.content_key, status: response.status(), body: row.body });
          }
        };
        const waitDaily = () => dailyRows.map(row => page.waitForRequest(request => request.method() === 'GET' && new URL(request.url()).searchParams.get('id') === row.id));
        const waitWheel = () => page.waitForRequest(request => request.method() === 'GET' && new URL(request.url()).searchParams.get('contentKey') === starter.contentKey);
        const prefetch = late ? page.waitForRequest(request => {
          const url = new URL(request.url()), keys = url.searchParams.getAll('contentKeys');
          return request.method() === 'GET' && !url.searchParams.has('id') && dailyRows.every(row => keys.includes(row.content_key));
        }) : null;
        if (late) {
          const wheelFirst = scenario === 'late wheel read';
          await page.goto('/admin/content' + (wheelFirst ? wheelHash : dailyHash));
          let wheelRequest: import('@playwright/test').Request;
          let dailyRequests: import('@playwright/test').Request[];
          if (wheelFirst) {
            const pendingWheel = waitWheel(); await wheelOpen.click();
            wheelRequest = await pendingWheel; await expect.poll(() => wheelReads).toBe(1);
            await navigate(dailyHash); await expect(dailyOpen).toBeEnabled();
            const pendingDaily = waitDaily(); await dailyOpen.click();
            dailyRequests = await Promise.all(pendingDaily); await expect.poll(() => dailyReads).toBe(2);
          } else {
            const pendingDaily = waitDaily(); await dailyOpen.click();
            dailyRequests = await Promise.all(pendingDaily); await expect.poll(() => dailyReads).toBe(2);
            await navigate(wheelHash); await expect(wheelOpen).toBeEnabled();
            const pendingWheel = waitWheel(); await wheelOpen.click();
            wheelRequest = await pendingWheel; await expect.poll(() => wheelReads).toBe(1);
          }
          const prefetchCompleted = finishRead(await prefetch!, dailyRows);
          prefetchGate.release(); await prefetchCompleted;
          const completeDaily = () => {
            const reads = dailyRequests.map((request, index) => finishRead(request, [dailyRows[index]]));
            dailyGate.release(); return Promise.all(reads);
          };
          const completeWheel = () => {
            const read = finishRead(wheelRequest, [{ content_key: starter.contentKey, body: wheelBody }]);
            wheelGate.release(); return read;
          };
          if (wheelFirst) {
            await completeWheel();
            await expect(wheelEditor).toHaveCount(0);
            await expect(dailyEditor, 'A stale wheel source cannot replace the pending Daily selection').toHaveCount(0);
            await completeDaily(); await expect(dailyEditor.getByLabel('Headline · You')).toHaveValue(dailyRows[0].body);
            await expect(dailyEditor.getByLabel('Passage · You')).toHaveValue(dailyRows[1].body);
            await expect(dailyEditor.getByLabel('Headline · Friend')).toHaveValue(dailyRows[0].sections.packageRecord.body_they);
            await expect(dailyEditor.getByLabel('Passage · Friend')).toHaveValue(dailyRows[1].sections.packageRecord.body_they);
          } else {
            await completeDaily(); await expect(wheelOpen, 'An old Daily completion cannot release the newer wheel loading owner').toBeDisabled();
            await expect(dailyEditor).toHaveCount(0);
            await completeWheel(); await expect(wheelEditor.getByRole('textbox', { name: 'Tooltip wording', exact: true })).toHaveValue(wheelBody);
          }
          expect(completed).toHaveLength(5);
          expect(await store.call({ method: 'rows' })).toEqual(original);
        } else {
          await page.goto('/admin/content' + dailyHash); await dailyOpen.click();
          const writing = { 'Headline · You': 'Synthetic unsaved headline.', 'Passage · You': 'Synthetic unsaved passage. Complete ending.', 'Headline · Friend': 'Synthetic unsaved Friend headline.', 'Passage · Friend': 'Synthetic unsaved Friend passage. Complete ending.' };
          for (const [label, value] of Object.entries(writing)) await dailyEditor.getByLabel(label).fill(value);
          if (scenario === 'busy Daily navigation') {
            await dailyEditor.getByRole('button', { name: 'Save draft', exact: true }).click(); await expect.poll(() => saves).toBe(1);
            await navigate(wheelHash); await expect(page).toHaveURL(new RegExp(dailyHash.replace('?', '\\?') + '$'));
            await expect(page.getByText('Finish the current editor operation before leaving this section.', { exact: true })).toBeVisible();
            for (const [label, value] of Object.entries(writing)) await expect(dailyEditor.getByLabel(label)).toHaveValue(value);
            saveGate.release(); await expect(dailyEditor).toContainText('No unsaved changes');
          } else {
            const confirmation = page.waitForEvent('dialog').then(async dialog => {
              expect(dialog.message()).toContain('Discard the unsaved changes'); await dialog.dismiss();
            });
            await navigate(wheelHash); await confirmation;
            await expect(page).toHaveURL(new RegExp(dailyHash.replace('?', '\\?') + '$'));
            for (const [label, value] of Object.entries(writing)) await expect(dailyEditor.getByLabel(label)).toHaveValue(value);
            expect(await store.call({ method: 'rows' })).toEqual(original);
          }
          await expect(page.getByRole('heading', { name: 'Zodiac Wheel tooltips', exact: true })).toHaveCount(0);
        }
        assertNoErrors();
      } finally {
        dailyGate.release(); wheelGate.release(); prefetchGate.release(); saveGate.release();
        try { await page.waitForLoadState('networkidle', { timeout: 5000 }); await network.finishStaticFonts(); }
        finally {
          await page.close(); store.close();
          await info.attach('completed-cross-editor-reads', { contentType: 'application/json', body: JSON.stringify(completed) });
          expect(network.unhandledExternal).toEqual([]);
        }
      }
    });
  }
}

for (const [width,theme] of [[390,'light'],[1440,'dark']] as const) {
  test(`Studio variable wording changes the calculated ruler tooltip ${width} ${theme}`,async({page,context},info)=>{
    test.setTimeout(120_000);
    const {studioApiStore}=await import('../helpers/studio-api-store');
    const {routeStudioInventoryApi}=await import('../helpers/studio-inventory-route');
    const {routeStudioPublicReader}=await import('../helpers/studio-public-reader-route');
    const {installSyntheticNetworkGuard}=await import('../helpers/synthetic-network-guard');
    const guard=await installSyntheticNetworkGuard(context,new URL(info.project.use.baseURL as string).origin);
    await page.route('**/rest/v1/**',route=>route.fulfill({json:[]}));
    const store=await studioApiStore([],{uuidIds:true});
    try {
      await routeStudioInventoryApi(page,{call:store.call,actualDocumentRoute:true,answer:async(route,url)=>{
        if(url.pathname==='/api/content-publications')return routeStudioPublicReader(route,url,store.call);
        if(url.pathname==='/api/content-reader'){
          const result=await store.call({method:'POST',url:url.pathname,body:route.request().postDataJSON()});
          await route.fulfill({status:result.status,json:result.payload});return true;
        }
        return false;
      }});
      await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
      await page.setViewportSize({width,height:1100});
      await page.goto('/admin/content#wheel-tooltips');
      await page.getByRole('button',{name:'Edit variable wording',exact:true}).click();
      const group=page.getByRole('combobox',{name:'Tooltip group',exact:true});
      const source=page.getByRole('combobox',{name:'Wording source',exact:true});
      await expect(group).toHaveValue('Variable wording');
      await expect(source.locator('option')).toHaveCount(10);
      const field=page.getByRole('textbox',{name:'Tooltip wording',exact:true});
      const edit=async(key:string)=>{
        await group.selectOption(key.startsWith('variables/')?'Variable wording':'House ruler popup');
        await source.selectOption('cms/wheel-tooltip/'+key);
        await page.getByRole('button',{name:'Edit tooltip wording',exact:true}).click();
        await expect(field).toBeVisible();
      };
      const finish=async()=>{
        await page.getByRole('button',{name:'Save & publish',exact:true}).click();
        await expect(page.getByRole('dialog').locator('.admin-editor-save-state')).toHaveText(/^(All changes saved|Saved ·)/);
        await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
      };
      const wording={
        'variables/owner-you-title':'My', 'variables/owner-you-body':'my',
        'variables/owner-friend':'{{ownerName}}’s chart', 'variables/possessive-you':'my',
        'variables/possessive-she':'her own', 'variables/possessive-he':'his own',
        'variables/possessive-they':'the', 'variables/possessive-unspecified':'their',
        'variables/house-ordinal':'house {{house}}', 'variables/ruler-house-ordinal':'house {{house}}'
      };
      for(const [key,body]of Object.entries(wording)){
        await edit(key);
        if(key==='variables/house-ordinal'){
          await field.fill('A fixed house');
          await expect(page.getByRole('button',{name:'Save & publish',exact:true})).toBeDisabled();
          await expect(page.getByRole('alert',{name:'CMS template errors'})).toContainText('Keep a calculated house variable');
          await field.fill(body);
          await page.getByRole('button',{name:'Save draft',exact:true}).click();
          await expect(page.getByRole('dialog').locator('.admin-editor-save-state')).toHaveText(/^(All changes saved|Saved ·)/);
          await page.reload();await edit(key);await expect(field).toHaveValue(body);
          await page.getByRole('dialog').screenshot({path:info.outputPath(`editable-house-format-${width}-${theme}.png`)});
        }else await field.fill(body);
        if(key==='variables/owner-you-body'||key==='variables/possessive-you')await expect(page.getByRole('dialog').getByLabel('CMS template preview').locator('p')).toHaveText(body);
        await finish();
      }
      await edit('ruler/title');
      await field.fill('{{ownerPossessive}} {{houseOrdinal}} ruler: {{possessive}} {{rulerHouseOrdinal}}. Synthetic variable ending.');
      await finish();
      const saved=await store.call({method:'rows'});expect(saved.length).toBe(11);expect(saved.every((row:any)=>row.status==='LIVE')).toBe(true);
      const openRuler=async(house:number)=>{
        await page.mouse.move(0,0);await page.locator(`[data-house="${house}"]`).focus();await page.keyboard.press('Enter');
        await page.getByRole('button',{name:'House ruler details',exact:true}).focus();await page.keyboard.press('Enter');
        return page.getByRole('dialog',{name:'House ruler',exact:true});
      };
      await openHarness(page,'you',theme);
      let popup=await openRuler(1);
      await expect(popup).toContainText('My house 1 ruler: my house 4. Synthetic variable ending.');
      await expect(popup).toContainText('Capricorn is rising in my chart');
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      popup=await openRuler(3);await expect(popup).toContainText('My house 3 ruler: my house 8. Synthetic variable ending.');
      for(const [pronouns,possessive]of [['she','her own'],['he','his own'],['they','the'],['','their']]){
        await openHarness(page,'friend',theme,pronouns);popup=await openRuler(1);
        await expect(popup).toContainText(`Alisa’s chart house 1 ruler: ${possessive} house 4. Synthetic variable ending.`);
        await expect(popup).toContainText(pronouns?`Saturn rules ${possessive} house 1 house.`:'Saturn rules Alisa’s chart house 1 house.');
      }
      const retired=saved.find((row:any)=>row.content_key==='cms/wheel-tooltip/variables/possessive-they');
      const result=await store.call({method:'POST',url:'/api/admin/content-publication',body:{action:'retire',id:retired.id,expectedUpdatedAt:retired.updated_at,contentKey:retired.content_key}});
      expect(result.status).toBe(200);
      await openHarness(page,'friend',theme,'they');await page.locator('[data-house="1"]').focus();await page.keyboard.press('Enter');
      await expect(page.getByRole('button',{name:'House ruler details',exact:true})).toHaveCount(0);
      await openHarness(page,'you',theme);popup=await openRuler(1);await expect(popup).toContainText('My house 1 ruler: my house 4');
      await guard.finishStaticFonts();expect(guard.unhandledExternal).toEqual([]);
    } finally {store.close();}
  });
}

for (const [width, theme] of [[390, "dark"], [390, "light"], [1440, "light"], [1280, "dark"]] as const) {
  test(`unpublished variable wording previews on a wheel without a save ${width} ${theme}`,async({page,context},info)=>{
    const {studioApiStore}=await import('../helpers/studio-api-store');
    const {routeStudioInventoryApi}=await import('../helpers/studio-inventory-route');
    const {installSyntheticNetworkGuard}=await import('../helpers/synthetic-network-guard');
    const guard=await installSyntheticNetworkGuard(context,new URL(info.project.use.baseURL as string).origin);
    const ownerId='11111111-1111-4111-8111-111111111111';
    const user={id:ownerId,aud:'authenticated',role:'authenticated',email:'synthetic@example.test',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
    const exp=Math.floor(Date.now()/1000)+3600;
    const token=`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:ownerId,exp,role:'authenticated'})).toString('base64url')}.synthetic`;
    const writes:string[]=[], reads:string[]=[];
    let readFailure=false,empty=false,sourceReadFailure=false;
    page.on('request',request=>{if(['POST','PATCH','DELETE','PUT'].includes(request.method()) && /\/(?:rest\/v1|api\/admin)\//u.test(request.url()) && !request.url().includes('content-live-status'))writes.push(request.method()+' '+new URL(request.url()).pathname);});
    await page.route('**/auth/v1/user',route=>route.fulfill({json:user}));
    await page.route('**/rest/v1/**',async route=>{
      const url=new URL(route.request().url());
      reads.push(url.pathname+url.search);
      expect(route.request().method()).toBe('GET');
      if(readFailure)return route.fulfill({status:503,json:{message:'Synthetic read failure'}});
      if(url.pathname.endsWith('/user_profiles')){
        expect(url.searchParams.get('user_id')).toBe('eq.'+ownerId);
        if(empty)return route.fulfill({json:null});
        return route.fulfill({json:{data:{version:1,profile:{name:'Casey Sample',charts:[{birthDate:'1990-01-01',birthTime:'20:00',birthTimeUnknown:false,birthLocation:{label:'Synthetic City',latitude:0,longitude:0,timeZone:'UTC'}}]}}}});
      }
      if(url.pathname.endsWith('/manual_charts')){
        expect(url.searchParams.get('owner_user_id')).toBe('eq.'+ownerId);
        if(empty)return route.fulfill({json:[]});
        const birth={owner_user_id:ownerId,birth_date:'1996-07-02',birth_time:'09:30',birth_time_unknown:false,birth_place:'Synthetic City',birth_latitude:20,birth_longitude:10,birth_timezone:'UTC'};
        return route.fulfill({json:[{...birth,id:'friend-known',display_name:'Alex Example'},{...birth,id:'friend-unknown',display_name:'Unknown Time',birth_time:null,birth_time_unknown:true}]});
      }
      return route.fulfill({json:[]});
    });
    const store=await studioApiStore([],{uuidIds:true});
    try{
      await routeStudioInventoryApi(page,{call:message=>{
        const key=new URL(message.url??'/', 'http://fixture.test').searchParams.get('contentKey');
        if(sourceReadFailure&&message.method==='GET'&&key==='cms/wheel-tooltip/ruler/placement')return Promise.resolve({status:503,payload:{ok:false,error:'Synthetic tooltip source unavailable'}});
        return store.call(message);
      },actualDocumentRoute:true});
      await page.addInitScript(({user,token,exp,theme})=>{
        localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme',theme);
        localStorage.setItem('sb-visual-smoke-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',expires_at:exp,expires_in:3600,token_type:'bearer',user}));
      },{user,token,exp,theme});
      await page.setViewportSize({width,height:width>720?720:844});
      await page.goto('/admin/content#wheel-tooltips');
      await page.getByRole('button',{name:'Edit variable wording',exact:true}).click();
      await page.getByRole('button',{name:'Edit tooltip wording',exact:true}).click();
      const editor=page.getByRole('dialog',{name:'Generated content editor',exact:true});
      const field=editor.getByRole('textbox',{name:'Tooltip wording',exact:true});
      await field.fill('Draft ownership');
      await editor.getByRole('button',{name:'Preview on wheel',exact:true}).click();
      const preview=editor.getByRole('region',{name:'Unpublished wheel preview'});
      const popup=preview.getByRole('dialog',{name:'House ruler',exact:true});
      await expect(popup).toContainText('Draft ownership');
      expect(reads.filter(url=>url.includes('manual_charts')).length).toBe(1);
      await preview.getByRole('textbox',{name:'Preview wording',exact:true}).fill('My unsaved chart');
      await expect(field).toHaveValue('My unsaved chart');
      await expect(popup).toContainText('My unsaved chart');
      // Navigate the actual calculated 2nd -> 6th ruler from the wheel.
      await preview.locator('[data-house="2"]').focus();await page.keyboard.press('Enter');
      await expect(preview.getByLabel('Wheel preview house',{exact:true})).toHaveValue('2');
      await expect(preview.getByLabel('Wheel preview ruler house',{exact:true})).toHaveValue('6th house · Mercury');
      await popup.getByRole('button',{name:'My unsaved chart 2nd house ruler is in your 6th',exact:true}).click();
      await expect(preview.getByLabel('Preview tooltip group')).toHaveValue('House ruler popup');
      await expect(preview.getByLabel('Preview wording source')).toHaveValue('cms/wheel-tooltip/ruler/title');
      const titleTemplate='{{ownerPossessive}} {{houseOrdinal}} house ruler is in {{possessive}} {{rulerHouseOrdinal}}';
      await expect(field).toHaveValue(titleTemplate);
      await expect(page.locator('section[aria-label="Wheel tooltip selection"] select').nth(1)).toHaveValue('cms/wheel-tooltip/ruler/title');
      await expect(preview.getByLabel('Wheel preview house',{exact:true})).toHaveValue('2');
      await preview.getByRole('textbox',{name:'Preview wording',exact:true}).fill(titleTemplate+' Local title draft.');
      const opening=popup.locator('[data-source="ruler/house"]');
      await opening.focus();await page.keyboard.press('Enter');
      await expect(preview.getByLabel('Preview wording source')).toHaveValue('cms/wheel-tooltip/ruler/house');
      await expect(field).toHaveValue('{{sign}} is {{ownerPossessive}} {{houseOrdinal}} house, so {{ruler}} rules it.');
      await expect(popup).toContainText('Local title draft.');
      await preview.locator('[data-house="1"]').focus();await page.keyboard.press('Enter');
      await expect(preview.getByLabel('Wheel preview house',{exact:true})).toHaveValue('1');
      await expect(preview.getByLabel('Preview wording source')).toHaveValue('cms/wheel-tooltip/ruler/rising');
      await expect(field).toHaveValue('{{sign}} is rising in {{ownerPossessive}} chart, so {{ruler}} rules {{possessive}} {{houseOrdinal}} house.');
      // Source selection also finds a compatible house and preserves chart context.
      await preview.getByLabel('Preview wording source').selectOption('cms/wheel-tooltip/ruler/title-own');
      await expect(popup.locator('strong')).toContainText('its own house');
      await expect(preview.getByLabel('Wheel preview chart')).toHaveValue('own');
      page.once('dialog',dialog=>{expect(dialog.message()).toContain('Discard the unsaved changes');void dialog.dismiss();});
      await editor.getByRole('button',{name:'Close',exact:true}).click();
      await expect(preview.getByLabel('Preview wording source')).toHaveValue('cms/wheel-tooltip/ruler/title-own');
      sourceReadFailure=true;
      await preview.getByLabel('Preview wording source').selectOption('cms/wheel-tooltip/ruler/placement');
      await expect(editor.getByRole('alert').filter({hasText:'Synthetic tooltip source unavailable'})).toBeVisible();
      await expect(preview.getByLabel('Preview wording source')).toHaveValue('cms/wheel-tooltip/ruler/title-own');
      sourceReadFailure=false;
      await preview.getByLabel('Preview wording source').selectOption('cms/wheel-tooltip/ruler/placement');
      await expect(preview.getByLabel('Preview wording source')).toHaveValue('cms/wheel-tooltip/ruler/placement');
      await preview.getByLabel('Preview wording source').selectOption('cms/wheel-tooltip/ruler/title-own');
      await expect(popup.locator('strong')).toContainText('its own house');
      await preview.getByLabel('Wheel preview house',{exact:true}).selectOption('2');
      await expect(preview.getByLabel('Preview wording source')).toHaveValue('cms/wheel-tooltip/ruler/title');
      await expect(field).toHaveValue(titleTemplate+' Local title draft.');
      // Switch away and back to the first unsaved variable, without saving anything.
      await preview.getByLabel('Preview tooltip group').selectOption('Variable wording');
      await expect(field).toHaveValue('My unsaved chart');
      await expect(preview.getByLabel('Wheel preview house',{exact:true})).toHaveValue('2');
      expect(reads.filter(url=>url.includes('manual_charts')).length).toBe(1);
      const wording=preview.getByRole('textbox',{name:'Preview wording',exact:true});
      const writingBox=await wording.boundingBox(),wheelBox=await preview.locator('.interactive-zodiac-wheel__svg').boundingBox();
      expect(writingBox).not.toBeNull();expect(wheelBox).not.toBeNull();
      if(width>720){
        expect(writingBox!.x+writingBox!.width).toBeLessThanOrEqual(wheelBox!.x);
        expect(writingBox!.y).toBeLessThan(wheelBox!.y+wheelBox!.height);
        const popupBox=await popup.boundingBox();
        const visibleEditor=await editor.locator('.admin-post-editor').boundingBox();
        expect(writingBox!.y).toBeGreaterThanOrEqual(visibleEditor!.y);
        expect(popupBox!.y).toBeGreaterThanOrEqual(visibleEditor!.y);
        expect(popupBox!.y+popupBox!.height).toBeLessThanOrEqual(visibleEditor!.y+visibleEditor!.height);
      }else expect(writingBox!.y+writingBox!.height).toBeLessThanOrEqual(wheelBox!.y);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:info.outputPath(`live-editing-layout-${width}-${theme}.png`)});
      expect(writes).toEqual([]);expect(await store.call({method:'rows'})).toEqual([]);
      await preview.getByLabel('Wheel preview chart').selectOption('friend-known');
      await preview.getByLabel('Wheel preview voice').selectOption('they');
      await expect(popup).toContainText("Alex's");
      await preview.getByLabel('Wheel preview voice').selectOption('you');
      await expect(popup).toContainText('My unsaved chart');
      await preview.getByLabel('Wheel preview house').selectOption('3');
      await expect(popup).toContainText('3rd house ruler');
      const selected=preview.locator('.interactive-zodiac-wheel');
      await expect(selected).toHaveAttribute('data-selected-type','house');
      await expect(preview.locator('.admin-daily-glance-context-form label > span:first-child')).toHaveText(['Tooltip group','Wording source','Chart','Preview voice','House','Ruler’s house']);
      await expect(preview.locator('h1,h2,h3,h4,h5,h6')).toHaveCount(0);
      const appearance=await popup.evaluate(element=>{
        const read=(node:Element)=>{const css=getComputedStyle(node);return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','marginTop','marginBottom','textTransform','textAlign','color','backgroundColor','width','height','padding','borderWidth'].map(key=>[key,css[key as keyof CSSStyleDeclaration]]));};
        return {title:read(element.querySelector('strong')!),body:read(element.querySelector('p')!),close:read(element.querySelector('button')!)};
      });
      await preview.screenshot({path:info.outputPath(`unsaved-wheel-${width}-${theme}.png`)});
      await field.fill('{{unsupported}}');
      await expect(preview.getByRole('alert',{name:'Wheel preview wording errors'})).toBeVisible();
      await expect(preview.locator('.interactive-zodiac-wheel')).toHaveCount(0);
      await field.fill('My unsaved chart');
      await expect(popup).toContainText('My unsaved chart');
      await preview.getByLabel('Wheel preview chart').selectOption('friend-unknown');
      await expect(preview.getByRole('status')).toContainText('Birth time is unknown');
      await expect(popup).toHaveCount(0);
      await expect(preview.getByLabel('Wheel preview house')).toBeDisabled();
      await editor.getByRole('button',{name:'Close wheel preview',exact:true}).click();
      await expect(preview.locator('.interactive-zodiac-wheel')).toHaveCount(0);
      await expect(field).toHaveValue('My unsaved chart');
      readFailure=true;
      await editor.getByRole('button',{name:'Preview on wheel',exact:true}).click();
      await expect(preview.getByRole('alert')).toContainText('Your charts could not be loaded');
      readFailure=false;
      await preview.getByRole('button',{name:'Retry chart preview'}).click();
      await expect(popup).toContainText('My unsaved chart');
      await expect(field).toHaveValue('My unsaved chart');
      expect(writes).toEqual([]);expect(await store.call({method:'rows'})).toEqual([]);
      empty=true;
      await editor.getByRole('button',{name:'Close wheel preview',exact:true}).click();
      await editor.getByRole('button',{name:'Preview on wheel',exact:true}).click();
      await expect(preview.getByRole('status')).toContainText('No saved charts');
      await expect(field).toHaveValue('My unsaved chart');
      empty=false;
      await preview.getByRole('button',{name:'Retry chart preview'}).click();
      await expect(popup).toContainText('My unsaved chart');
      if(width===1440){
        await preview.getByLabel('Preview tooltip group').selectOption('House ruler popup');
        await expect(field).toHaveValue(titleTemplate+' Local title draft.');
        await page.getByRole('button',{name:'Save draft',exact:true}).click();
        await expect.poll(async()=> (await store.call({method:'rows'})).length).toBe(1);
        const saved=(await store.call({method:'rows'}))[0];
        expect(saved.content_key).toBe('cms/wheel-tooltip/ruler/title');
        expect(saved.body).toBe(titleTemplate+' Local title draft.');expect(saved.status).toBe('DRAFT');
        await preview.getByLabel('Preview tooltip group').selectOption('Variable wording');
        await expect(field).toHaveValue('My unsaved chart');
      }
      await page.evaluate(()=>{
        const key='sb-visual-smoke-auth-token';const oldValue=localStorage.getItem(key);localStorage.removeItem(key);
        window.dispatchEvent(new StorageEvent('storage',{key,oldValue,newValue:null,storageArea:localStorage}));
      });
      await expect(preview.locator('.interactive-zodiac-wheel')).toHaveCount(0);
      await expect(preview.getByRole('alert')).toContainText('Sign in through the app');
      await expect(field).toHaveValue('My unsaved chart');
      await editor.getByRole('button',{name:'Close wheel preview',exact:true}).click();
      await openHarness(page,'you',theme);
      await page.locator('[data-house="1"]').focus();await page.keyboard.press('Enter');
      await page.getByRole('button',{name:'House ruler details',exact:true}).focus();await page.keyboard.press('Enter');
      const normal=page.getByRole('dialog',{name:'House ruler',exact:true});
      await expect(normal).toContainText('Your 1st house ruler');
      await expect(normal).not.toContainText('My unsaved chart');
      const normalAppearance=await normal.evaluate(element=>{
        const read=(node:Element)=>{const css=getComputedStyle(node);return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','marginTop','marginBottom','textTransform','textAlign','color','backgroundColor','width','height','padding','borderWidth'].map(key=>[key,css[key as keyof CSSStyleDeclaration]]));};
        return {title:read(element.querySelector('strong')!),body:read(element.querySelector('p')!),close:read(element.querySelector('button')!)};
      });
      for(const part of ['title','body'] as const)for(const property of ['width','height']){delete appearance[part][property];delete normalAppearance[part][property];}
      // Studio previews use its shared narrative size; the actual reader uses the reader size.
      expect(appearance.body.fontSize).toBe('16px');expect(appearance.body.lineHeight).toBe('24px');
      for(const property of ['fontSize','lineHeight']){delete appearance.body[property];delete normalAppearance.body[property];}
      // The close control is an SVG icon; only its visible geometry/colors matter.
      for(const property of ['fontFamily','fontSize','lineHeight']){delete appearance.close[property];delete normalAppearance.close[property];}
      expect(appearance).toEqual(normalAppearance);
      await guard.finishStaticFonts();expect(guard.unhandledExternal).toEqual([]);
    }finally{store.close();}
  });
}
