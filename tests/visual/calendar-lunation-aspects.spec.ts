import fs from "node:fs";
import { expect, test } from "@playwright/test";
import type { IncomingMessage, ServerResponse } from "node:http";
import calendarHandler from "../../api/calendar";
import skyHandler from "../../api/sky";
import { defaultLocation, getLunarCalendarWeek } from "../../apps/web/src/services/ephemeris";
import { bundledPublications } from "../helpers/bundled-publications";
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioPublicReader } from '../helpers/studio-public-reader-route';
import { watchBrowserErrors } from "./qaRuntimeGuards";

const copy = ["sun-opposition-moon", "moon-square-pluto"].map(name =>
  JSON.parse(fs.readFileSync(`packages/astro-knowledge/data/transits/${name}.json`, "utf8")).readerCopy.body as string);

test('Reusable Full Moon passage survives Calendar to Sky navigation and reload', async ({page}) => {
  test.setTimeout(120_000);
  const body = 'Synthetic reusable Full Moon passage. This whole reading belongs to the Moon in Pisces square Uranus in Gemini.\n\nThe complete approved final sentence survives a direct reload.';
  const store = await studioApiStore([{id:'a0000000-0000-4000-8000-000000000086',
    content_key:'lunation.full.pisces.square.uranus.gemini',surface:'sky',mode:'in_depth',status:'LIVE',lane:'serving',
    review_state:null,target_date:null,flags:[],provider:'manual-admin',headline:null,summary:null,sections:null,
    event_type:'fallback-hook',block_type:'fallback_hook',body,updated_at:'2026-11-18T12:00:00Z',source_snapshot:{}}]);
  try {
    await page.addInitScript(location => localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location)),defaultLocation);
    await bundledPublications(page);
    await page.route('**/api/sky-reader?**',route=>route.fulfill({status:503,json:{error:'Use calculated fixtures'}}));
    await page.route('**/api/**',async route => {
      const url=new URL(route.request().url());
      if (url.pathname==='/api/calendar' || url.pathname==='/api/sky') {
        const res={statusCode:200,body:'',setHeader(){},end(value:string){this.body=value;}};
        await (url.pathname==='/api/calendar'?calendarHandler:skyHandler)({method:'GET',url:url.href} as IncomingMessage,res as unknown as ServerResponse);
        return route.fulfill({status:res.statusCode,contentType:'application/json',body:res.body});
      }
      if (await routeStudioPublicReader(route,url,message=>store.call(message.method==='reader'
        ? {method:'POST',url:'/api/content-reader',body:message.body}:message))) return;
      await route.fallback();
    });
    const whole=(text:string)=>text.replace(/\s+/gu,' ').includes(body.replace(/\s+/gu,' '));
    await page.goto('/?date=2028-09-04#calendar?view=day&date=2028-09-04');
    const card=page.locator('.calendar-day-events .calendar-stoic-card').filter({hasText:/Moon squares Uranus/});
    await expect(card).toBeVisible({timeout:60_000});
    await expect.poll(async()=>whole(await card.innerText())).toBe(true);
    await card.click();
    const article=page.locator('.sky-detail-article');
    await expect.poll(async()=>whole(await article.innerText())).toBe(true);
    await page.reload();
    await expect.poll(async()=>whole(await article.innerText()),{timeout:60_000}).toBe(true);
  } finally {store.close();}
});

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Calendar exact contacts and Full Moon orb ranking ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const assertNoErrors = watchBrowserErrors(page);
    const offline = width === 390 && theme === "dark";
    const old = structuredClone(await getLunarCalendarWeek(defaultLocation, new Date("2026-10-25T16:00:00Z")));
    old.events = old.events.filter(event => !["conjunction", "opposition"].includes(event.aspect ?? ""));
    old.days.forEach(day => { day.events = day.events.filter(event => !["conjunction", "opposition"].includes(event.aspect ?? "")); });
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-10-26T16:00:00Z"));
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme as "light" | "dark" });
    await page.addInitScript(({ theme, old, location }) => {
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
      localStorage.setItem("tldr-lunar-calendar|v13|week|2026-10-25|40.7128|-74.0060|America/New_York",
        JSON.stringify({ savedAt: Date.now(), detail: "full", calendar: old }));
    }, { theme, old, location: defaultLocation });
    await bundledPublications(page);
    const calendarVersions: string[] = [];
    await page.route(/\/api\/(calendar|sky)\?/, async route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/calendar" && url.searchParams.get("mode") !== "range") {
        calendarVersions.push(url.searchParams.get("factsVersion") ?? "");
        if (offline) return route.fulfill({ status: 503, json: { ok: false, error: "Synthetic calendar outage" } });
      }
      const res = { statusCode: 200, body: "", setHeader() {}, end(body: string) { this.body = body; } };
      await (url.pathname === "/api/calendar" ? calendarHandler : skyHandler)(
        { method: "GET", url: url.href } as IncomingMessage, res as unknown as ServerResponse);
      await route.fulfill({ status: res.statusCode, contentType: "application/json", body: res.body });
    });

    await page.goto("/?date=2026-10-25#calendar?view=day&date=2026-10-25");
    const venus = page.locator(".calendar-day-events .calendar-stoic-card").filter({ hasText: /Moon opposes Venus Rx/ });
    await expect(venus).toBeVisible({ timeout: 60_000 });
    await expect(venus).toContainText("6:59p");
    expect(calendarVersions).toContain("calendar-lunation-context-v7");
    expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith("tldr-lunar-calendar|v16|")))).toBe(true);
    await venus.click();
    const detail = page.locator('.sky-detail-article');
    await expect(detail.locator('#sky-detail-title')).toHaveText(/Moon.*Opposition.*Venus/i);
    await expect(detail.locator('.article-body-inner p').first()).not.toBeEmpty();
    await page.getByRole("button", { name: "Close detail", exact: true }).click();

    await page.goto("/?date=2026-10-26#sky/lunation/2026-10-26/taurus");
    const verifyFullMoon = async () => {
      await expect(page.locator("#sky-detail-title")).toHaveText("Full Moon in Taurus", { timeout: 60_000 });
      const aspects = page.locator(".article-related-aspects__copy");
      await expect(aspects.locator("h4")).toHaveText(["Sun Opposition Moon", "Moon Square Pluto"]);
      await expect(aspects.locator(".article-related-aspects__date")).toHaveText(["Exact · October 26", "Exact · October 26"]);
      for (const [index, body] of copy.entries()) await expect(aspects.nth(index).locator("p").last()).toHaveText(body);
    };
    await verifyFullMoon();
    await page.locator(".article-related-aspects-card").screenshot({ path: `test-results/full-moon-aspects-${width}-${theme}.png` });
    await page.reload();
    await verifyFullMoon();
    await page.goto("/?date=2026-10-23#calendar?view=day&date=2026-10-23");
    const conjunction = page.locator(".calendar-day-events .calendar-stoic-card").filter({ hasText: /Sun conjoins Venus Rx/ });
    await expect(conjunction).toBeVisible({ timeout: 60_000 });
    await page.reload();
    await expect(conjunction).toBeVisible({ timeout: 60_000 });
    assertNoErrors();
  });
}

for (const [width, theme, zone] of [[1440, 'light', 'America/New_York'], [1440, 'dark', 'America/New_York'], [390, 'light', 'America/New_York'], [390, 'dark', 'America/New_York'], [390, 'dark', 'UTC']] as const) {
  test(`Published eclipse contact and fresh general aspect survive both reader routes ${width} ${theme} ${zone}`, async ({page}) => {
    test.setTimeout(180_000);
    const location={...defaultLocation,timeZone:zone};
    const lunarBody = 'Synthetic eclipse contact opening. The calculated contact belongs to this lunar event.\n\nThe full approved lunar final sentence remains visible.';
    const generalBody = 'Synthetic revised general aspect opening. This complete owner revision replaces the older bundled interpretation.\n\nThe approved general final sentence remains visible.';
    const mercuryBody = 'Synthetic approved Sun Mercury opening. This separate exact source replaces its generic conjunction reading.\n\nThe approved Mercury final sentence remains visible.';
    const mercuryLunarBody = 'Synthetic lunar Mercury opening. This separate Moon contact retains its own complete source.\n\nThe lunar Mercury final sentence remains visible in its matching reading.';
    const newMoonBody = 'Synthetic Capricorn New Moon contact opening. The Moon reaches its exact Venus conjunction after entering Aquarius.\n\nThe full approved out-of-sign final sentence remains visible.';
    const base = {surface:'sky', mode:'in_depth', status:'LIVE', lane:'serving', review_state:null,
      target_date:null, flags:[], provider:'manual-admin', headline:null, summary:null, sections:null, updated_at:'2026-11-17T12:00:00Z'};
    const store = await studioApiStore([
      {...base, id:'a0000000-0000-4000-8000-000000000081', content_key:'sky.lunation.lunar-eclipse.pisces.square.uranus.gemini',
        event_type:'lunation-aspect', block_type:'fallback_hook', body:lunarBody, source_snapshot:{review_status:'approved', content_role:'full_copy'}},
      {...base, id:'a0000000-0000-4000-8000-000000000083', content_key:'sky.lunation.new-moon.capricorn.conjunction.venus.aquarius',
        event_type:'lunation-aspect', block_type:'fallback_hook', body:newMoonBody, source_snapshot:{review_status:'approved', content_role:'full_copy'}},
      {...base, id:'a0000000-0000-4000-8000-000000000082', content_key:'sky.aspect.sun.opposition.moon',
        event_type:'sky-aspect-owner-approved-exact', block_type:'fallback_hook', body:generalBody,
        source_snapshot:{contentStudioExactAspect:true, review_status:'approved', exactSkyAspectIdentity:{a:'sun',aspect:'opposition',b:'moon'}}},
      {...base, id:'a0000000-0000-4000-8000-000000000085', content_key:'sky.lunation.lunar-eclipse.pisces.opposition.mercury.virgo',
        event_type:'lunation-aspect', block_type:'fallback_hook', body:mercuryLunarBody, source_snapshot:{review_status:'approved', content_role:'full_copy'}},
      {...base, id:'a0000000-0000-4000-8000-000000000084', content_key:'sky.aspect.sun.conjunction.mercury',
        event_type:'sky-aspect-owner-approved-exact', block_type:'fallback_hook', body:mercuryBody,
        source_snapshot:{contentStudioExactAspect:true, review_status:'approved', exactSkyAspectIdentity:{a:'sun',aspect:'conjunction',b:'mercury'}}}
    ]);
    try {
      await page.setViewportSize({width, height:1000});
      await page.clock.setFixedTime(new Date('2026-08-28T16:00:00Z'));
      await page.emulateMedia({reducedMotion:'reduce', colorScheme:theme});
      await page.addInitScript(({theme,location}) => {
        localStorage.setItem('tldrastro:theme',theme);
        localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));
      }, {theme,location});
      await bundledPublications(page);
      await page.route('**/api/sky-reader?**',route=>route.fulfill({status:503,json:{error:'Use the actual calculation fixture'}}));
      await page.route('**/api/**', async route => {
        const url=new URL(route.request().url());
        if (url.pathname==='/api/calendar' || url.pathname==='/api/sky') {
          const res={statusCode:200,body:'',setHeader(){},end(body:string){this.body=body;}};
          await (url.pathname==='/api/calendar'?calendarHandler:skyHandler)({method:'GET',url:url.href} as IncomingMessage,res as unknown as ServerResponse);
          return route.fulfill({status:res.statusCode,contentType:'application/json',body:res.body});
        }
        if (await routeStudioPublicReader(route,url,message=>store.call(message.method==='reader'
          ? {method:'POST',url:'/api/content-reader',body:message.body} : message))) return;
        await route.fallback();
      });
      const whole = (text:string, expected:string) => text.replace(/\s+/gu,' ').includes(expected.replace(/\s+/gu,' '));
      const verifyLunar = async () => {
        const related=page.locator('.article-related-aspects-card');
        await expect(related).toContainText('Moon Square Uranus',{timeout:60_000});
        await expect.poll(async()=>whole(await related.innerText(),lunarBody)).toBe(true);
        await expect.poll(async()=>whole(await related.innerText(),generalBody)).toBe(true);
        await expect.poll(async()=>whole(await related.innerText(),mercuryBody)).toBe(true);
        await expect(related).not.toContainText(mercuryLunarBody);
        await expect(page.locator('.article-related-aspects__copy h4')).toHaveText(['Sun Opposition Moon','Sun Conjunction Mercury','Moon Square Uranus']);
      };
      await page.goto('/?date=2026-08-28#sky/lunation/2026-08-28/pisces');
      await verifyLunar();
      await page.reload();
      await verifyLunar();
      await page.goto('/?date=2026-08-28#calendar?view=day&date=2026-08-28');
      const article=page.locator('.sky-detail-article');
      const mercuryCard=page.locator('.calendar-day-events .calendar-stoic-card').filter({hasText:/Moon opposes Mercury/});
      await expect(mercuryCard).toBeVisible({timeout:60_000});
      await expect.poll(async()=>whole(await mercuryCard.innerText(),mercuryLunarBody)).toBe(true);
      await mercuryCard.click();
      await expect.poll(async()=>whole(await article.innerText(),mercuryLunarBody)).toBe(true);
      await page.goto('/?date=2026-08-28#calendar?view=day&date=2026-08-28');
      const card=page.locator('.calendar-day-events .calendar-stoic-card').filter({hasText:/Moon squares Uranus/});
      await expect(card).toBeVisible({timeout:60_000});
      await expect.poll(async()=>whole(await card.innerText(),lunarBody)).toBe(true);
      await card.click();
      await expect.poll(async()=>whole(await article.innerText(),lunarBody)).toBe(true);
      await page.reload();
      await expect.poll(async()=>whole(await article.innerText(),lunarBody),{timeout:60_000}).toBe(true);
      await page.goto('/?date=2026-01-18#sky/lunation/2026-01-18/capricorn');
      await expect.poll(async()=>whole(await page.locator('.article-related-aspects-card').innerText(),newMoonBody),{timeout:60_000}).toBe(true);
      const venusDate=zone==='UTC'?'2026-01-19':'2026-01-18';
      await page.goto(`/?date=${venusDate}#calendar?view=day&date=${venusDate}`);
      const venus=page.locator('.calendar-day-events .calendar-stoic-card').filter({hasText:/Moon conjoins Venus/});
      await expect(venus).toBeVisible({timeout:60_000});
      await expect.poll(async()=>whole(await venus.innerText(),newMoonBody)).toBe(true);
      await venus.click();
      await expect.poll(async()=>whole(await article.innerText(),newMoonBody)).toBe(true);
      await page.reload();
      await expect.poll(async()=>whole(await article.innerText(),newMoonBody),{timeout:60_000}).toBe(true);
    } finally {store.close();}
  });
}
