import { expect, test } from "../helpers/polish-test";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { bundledPublications } from "../helpers/bundled-publications";
import { readerResponse } from '../helpers/reader-response';
import { calendarPassageRecord } from '../../apps/web/src/features/calendar/calendarPassageTemplates';
import { watchBrowserErrors } from "./qaRuntimeGuards";

const output = "test-results/calendar-ui-qa";

const weeklyDates = ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'];
const weeklyLabels = ['Sunday, October 4, 2026', 'Monday, October 5, 2026', 'Tuesday, October 6, 2026', 'Wednesday, October 7, 2026', 'Thursday, October 8, 2026', 'Friday, October 9, 2026', 'Saturday, October 10, 2026'];

for (const theme of ['light', 'dark'] as const) for (const width of [390, 1440]) {
  test(`Weekly published passages keep the day-card layout ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-10-07T16:00:00Z'));
    await bundledPublications(page);
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'QA reference', latitude: 0, longitude: 0, timeZone: 'America/New_York' }));
    }, theme);
    const key = 'calendar-passage/weekly/2026-10-04/America%2FNew_York';
    const bodies = weeklyDates.map(date => [`Synthetic weekly opening ${date}.`, `Complete weekly ending ${date}.`]);
    bodies[6].push('[Read more](?date=2026-10-10#sky/lunation/2026-10-10/libra)');
    let body = weeklyLabels.map((label, index) => [label, ...bodies[index]].join('\n\n')).join('\n\n');
    await page.route('**/api/content-reader', route => {
      const keys: string[] = route.request().postDataJSON().keys ?? [];
      const record = { ...calendarPassageRecord(key, body), review_status: 'approved' };
      return route.fulfill({ json: readerResponse(keys.includes(key) ? [{
        id: 'qa-weekly-layout', content_key: key, updated_at: '2026-10-07T12:00:00Z', status: 'LIVE', surface: 'sky', mode: 'feed', event_type: 'calendar-passage',
        provider: 'tldrastro-fallback-architecture-v3', body, sections: { packageRecord: record },
        source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', content_role: 'full_copy', review_status: 'approved' }
      }] : []) });
    });
    await page.goto('/?date=2026-10-07#calendar?view=day&date=2026-10-07');
    await page.getByRole('tab', { name: 'Week', exact: true }).click();
    const week = page.getByRole('tabpanel', { name: 'Week', exact: true });
    for (let load = 0; load < 2; load++) {
      await expect(week.locator('.calendar-day-group')).toHaveCount(7);
      await expect(week.getByRole('region', { name: 'Weekly overview', exact: true })).toHaveCount(0);
      for (const [index, date] of weeklyDates.entries()) {
        const card = week.locator(`#calendar-day-group-${date}`);
        await expect(card.locator('.calendar-day-group__blurb p')).toHaveText(bodies[index].map(text => text.startsWith('[Read more]') ? 'Read more' : text));
        await expect(week.getByText(bodies[index][0], { exact: true })).toHaveCount(1);
        expect(await card.evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
      }
      await expect(week.getByRole('link', { name: 'Read more', exact: true })).toHaveAttribute('href', '/?date=2026-10-10#sky/lunation/2026-10-10/libra');
      expect(await week.locator('.calendar-day-group__blurb p').first().evaluate(node => {
        const style = getComputedStyle(node);
        return { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, leading: style.lineHeight, tracking: style.letterSpacing };
      })).toEqual({ family: expect.stringContaining('Newsreader'), size: '19px', weight: '400', leading: '28.5px', tracking: 'normal' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (load === 0) await page.reload();
    }
    await mkdir(output, { recursive: true });
    await page.screenshot({ path: `${output}/weekly-cards-${theme}-${width}.png` });
    await week.getByRole('button', { name: '7 Wednesday · Today', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Day slideout' })).toBeVisible();
    await page.getByRole('dialog', { name: 'Day slideout' }).getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Next week', exact: true }).click();
    await expect(week.locator('#calendar-day-group-2026-10-11')).toBeVisible();
    await expect(week.getByText(bodies[0][0], { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Previous week', exact: true }).click();
    await expect(week.getByText(bodies[0][0], { exact: true })).toBeVisible();
    // A custom overview with no exact day headings must retain every paragraph.
    body = 'Complete custom weekly opening.\n\nComplete custom weekly ending.';
    await page.reload();
    const overview = week.getByRole('region', { name: 'Weekly overview', exact: true });
    await expect(overview.locator('p')).toHaveText(body.split('\n\n'));
    await expect(overview).toHaveClass('calendar-day-group');
    expect(errors).toEqual([]);
  });
}

const jupiterLilithBody = JSON.parse(readFileSync("packages/astro-knowledge/data/transits/jupiter-trine-lilith.json", "utf8")).readerCopy.body as string;

for (const theme of ["light", "dark"] as const) for (const width of [390, 1440]) {
  test(`Calendar aspect keeps its complete passage without a duplicate article link ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(90_000);
    const assertNoErrors = watchBrowserErrors(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-09-24T16:00:00Z"));
    await bundledPublications(page);
    await page.addInitScript(theme => {
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
        label: "New York City, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York"
      }));
    }, theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#calendar?view=day&date=2026-09-24");
    const aspect = page.getByRole("button", { name: "Jupiter trines Lilith", exact: true });
    await aspect.click();
    const reading = page.getByRole("dialog", { name: "Event detail", exact: true });
    await expect(reading.getByRole("heading", { name: "Jupiter trines Lilith", exact: true })).toBeVisible();
    await expect(reading.locator(".calendar-reading__body")).toHaveText(jupiterLilithBody);
    await expect(reading.getByRole("button", { name: "Read article" })).toHaveCount(0);
    await expect(reading.locator(".calendar-reading__article-card")).toHaveCount(0);
    await expect(page).toHaveURL(/#calendar\?view=day&date=2026-09-24$/u);
    expect(await reading.evaluate(panel => panel.scrollWidth <= panel.clientWidth + 1)).toBe(true);
    await mkdir(output, { recursive: true });
    await page.screenshot({ path: `${output}/aspect-article-link-${theme}-${width}.png` });
    await reading.getByRole("button", { name: "Close", exact: true }).click();
    await expect(reading).toHaveCount(0);
    await expect(aspect).toBeVisible();
    assertNoErrors();
  });
}

const virgoBlocks = JSON.parse(readFileSync("apps/web/src/features/calendar/data/lunar-journal.entries.json", "utf8"))
  .entries.find((entry: { type: string; sign: string }) => entry.type === "season" && entry.sign === "Virgo").blocks as Array<{
    type: string; text?: string; label?: string; items?: string[];
  }>;

for (const theme of ["light", "dark"] as const) for (const width of [320, 390, 430, 678, 768, 1440]) {
  test(`Calendar controls and reading spacing ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(90_000);
    const assertNoErrors = watchBrowserErrors(page);
    await page.setViewportSize({ width, height: 844 });
    await page.clock.setFixedTime(new Date("2026-09-21T16:00:00Z"));
    await bundledPublications(page);
    await page.addInitScript(({ theme, prompts }) => {
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:journalPrompts", String(prompts));
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
        label: "New York City, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York"
      }));
    }, { theme, prompts: width >= 430 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#calendar?view=day&date=2026-09-21");
    await expect(page.locator('.lunar-week-day[data-calendar-date="2026-09-21"]')).toBeVisible();
    await mkdir(output, { recursive: true });
    for (const view of ["Day", "Week", "Month"]) {
      await page.getByRole("tab", { name: view, exact: true }).click();
      const tabs = page.locator(".lunar-calendar-segmented");
      const box = (await tabs.boundingBox())!;
      expect(box.height).toBe(width > 760 ? 44 : 42);
      await expect.poll(() => tabs.getByRole('tab', { selected: true }).evaluate(node => {
        const style = getComputedStyle(node);
        return [style.backgroundColor, style.color, style.fontWeight];
      })).toEqual(theme === 'dark' ? ['rgb(236, 238, 242)', 'rgb(18, 20, 24)', '600']
        : width > 760 ? ['rgb(255, 255, 255)', 'rgb(28, 31, 38)', '600']
        : ['rgb(0, 75, 69)', 'rgb(255, 255, 255)', '600']);
      await expect.poll(()=>tabs.evaluate(element=>{
        const box=element.getBoundingClientRect();
        return Array.from(element.querySelectorAll('[role="tab"]')).map(tab=>{
          const item=tab.getBoundingClientRect();return {height:item.height,top:item.y-box.y,bottom:box.bottom-item.bottom};
        });
      })).toEqual(Array.from({length:3},()=>({height:width>760?36:34,top:4,bottom:4})));
      for (const button of await page.locator(".lunar-calendar-controls button").all()) {
        const bounds = (await button.boundingBox())!;
        if (width < 720) expect(Math.min(bounds.width, bounds.height)).toBeGreaterThanOrEqual(44);
      }
      if (view === "Month") {
        await expect.poll(() => page.locator(".calendar-month-chip").count()).toBeGreaterThan(10);
        const clipped = await page.locator(".lunar-calendar-day__events").evaluateAll(groups => groups.flatMap(group => {
          const viewport = group.getBoundingClientRect();
          return Array.from(group.querySelectorAll<HTMLElement>(":scope > .calendar-month-chip")).flatMap(chip => {
            const rect = chip.getBoundingClientRect();
            if (rect.top >= viewport.bottom - 1) return [];
            const issues = rect.bottom > viewport.bottom + 1 ? ["partial event row"] : [];
            if (chip.scrollWidth > chip.clientWidth + 1) issues.push("clipped chip contents");
            return issues;
          });
        }));
        expect(clipped).toEqual([]);
      }
      const contrast = await page.locator(".is-today-disc, .is-full-disc, .calendar-kind--season.is-inverted, .lunar-week-day__season")
        .evaluateAll(nodes => {
          // These visible date labels are aria-hidden because the day button
          // already names the date. They still need visual contrast. Canvas
          // resolves color-mix/sRGB values and alpha against ancestor surfaces.
          const canvas = document.createElement("canvas");canvas.width = canvas.height = 1;
          const context = canvas.getContext("2d", {willReadFrequently:true})!;
          const rgba = (color:string) => {
            context.clearRect(0,0,1,1);context.fillStyle=color;context.fillRect(0,0,1,1);
            const p=Array.from(context.getImageData(0,0,1,1).data);return [p[0],p[1],p[2],p[3]/255];
          };
          const over = (fg:number[],bg:number[]) => fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3])).concat(1);
          const luminance = (color:number[]) => color.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
          return nodes.filter(node=>node.getBoundingClientRect().width>0).map(node=>{
            const ancestors:Element[]=[];
            for(let current:Element|null=node;current;current=current.parentElement)ancestors.unshift(current);
            let background=rgba(getComputedStyle(document.documentElement).getPropertyValue("--bg"));
            for(const ancestor of ancestors)background=over(rgba(getComputedStyle(ancestor).backgroundColor),background);
            const fg=luminance(over(rgba(getComputedStyle(node).color),background)),bg=luminance(background);
            return {className:node.className,text:node.textContent,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};
          });
        });
      if (view === "Month") expect(contrast.length).toBeGreaterThan(2);
      expect(contrast.filter(item=>item.ratio<4.5)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: `${output}/mobile-${theme}-${width}-${view.toLowerCase()}.png` });
    }
    await page.locator('.lunar-calendar-day[data-calendar-date="2026-09-25"]').click();
    const day = page.getByRole("dialog", { name: "Day slideout", exact: true });
    await expect(day).toBeVisible();
    const toolbar = (await day.locator(".calendar-slideout__toolbar").boundingBox())!;
    const date = (await day.locator(".calendar-sky-card__date").boundingBox())!;
    expect(date.y - (toolbar.y + toolbar.height)).toBeGreaterThanOrEqual(0);
    if (width < 720) expect(date.y - (toolbar.y + toolbar.height)).toBeLessThanOrEqual(24);
    await page.screenshot({ path: `${output}/mobile-${theme}-${width}-day-reading.png` });
    await day.evaluate(panel => { panel.scrollTop = panel.scrollHeight; });
    if (width < 720) await expect(day.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
    await day.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("tab", { name: "Day", exact: true }).click();
    await page.locator('.lunar-week-day[data-calendar-date="2026-09-21"]').click();
    await page.locator(width < 720 ? ".calendar-season-pill" : ".calendar-header-season").click();
    const reading = page.getByRole("dialog", { name: "Event detail", exact: true });
    await expect(reading.getByRole("heading", { level: 2, name: /Virgo/ })).toBeVisible();
    const body = reading.locator(".calendar-reading__body");
    for (const block of virgoBlocks) {
      if (block.text) await expect(body).toContainText(block.text);
      for (const item of block.items ?? []) await expect(body).toContainText(item);
    }
    await expect(reading.locator(".calendar-reading__mark")).toHaveCount(0);
    const spacing = await reading.locator(".calendar-reading__card").evaluateAll(cards => cards.flatMap(card => {
      const children = Array.from(card.children);
      return children.slice(1).map((child, i) => child.getBoundingClientRect().top - children[i].getBoundingClientRect().bottom);
    }));
    for (const gap of spacing) expect(gap).toBeGreaterThanOrEqual(8);
    const bodyStyles = await body.locator("p, li").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
    }));
    expect(new Set(bodyStyles.map(style => JSON.stringify(style))).size).toBe(1);
    const prompt = reading.locator(".calendar-reading__card").filter({ hasText: "Journal prompt" });
    await prompt.scrollIntoViewIfNeeded();
    if (width < 720) await expect(reading.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
    await page.screenshot({ path: `${output}/mobile-${theme}-${width}-prompts.png` });
    if (width >= 430) {
      const write = reading.getByRole("button", { name: "Write about this" });
      expect((await write.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await write.click();
      const checkIn = page.getByRole("dialog", { name: "Check-in", exact: true });
      await expect(checkIn).toBeVisible();
      await expect(checkIn.getByRole("heading", { name: virgoBlocks.find(block => block.type === "prompt")!.text!, exact: true })).toBeVisible();
      await expect(checkIn.locator("textarea")).toBeEditable();
    }
    assertNoErrors();
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`Calendar season countdown clears view controls in ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    const assertNoErrors = watchBrowserErrors(page);
    await page.addInitScript(theme => {
      localStorage.setItem("tldrastro:theme", theme);
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
        label: "New York City, NY", latitude: 40.7128, longitude: -74.006,
        timeZone: "America/New_York"
      }));
    }, theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mkdir(output, { recursive: true });
    for (const date of ["2026-09-24", "2026-12-31"]) {
      await page.goto(`/#calendar?view=day&date=${date}`);
      await expect(page.locator(".lunar-week-strip .lunar-week-day")).toHaveCount(7);
      await expect(page.locator(`.lunar-week-day[data-calendar-date="${date}"]`)).toBeVisible();
      for (const view of ["Day", "Week"]) {
        await page.getByRole("tab", { name: view, exact: true }).click();
        await expect(page.getByRole("tab", { name: view, exact: true })).toHaveAttribute("aria-selected", "true");
        for (const width of [1440, 1280, 1080, 960, 820, 768, 720, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => document.fonts.ready);
          const defects = await page.locator(".lunar-calendar-header").evaluate(header => {
            const bounds = header.getBoundingClientRect();
            const items = Array.from(header.querySelectorAll("h1, .lunar-calendar-controls, .calendar-header-season, .lunar-calendar-segmented, .lunar-calendar-subscribe"))
              .map(node => ({ label: node.className || node.tagName, rect: node.getBoundingClientRect() }))
              .filter(({ rect }) => rect.width && rect.height);
            return items.flatMap(({ label, rect }, index) => {
              const issues = rect.left < bounds.left - 1 || rect.right > bounds.right + 1 ? [`${label} exceeds header`] : [];
              for (const other of items.slice(index + 1)) {
                if (Math.min(rect.right, other.rect.right) - Math.max(rect.left, other.rect.left) > 1 &&
                    Math.min(rect.bottom, other.rect.bottom) - Math.max(rect.top, other.rect.top) > 1) {
                  issues.push(`${label} overlaps ${other.label}`);
                }
              }
              return issues;
            });
          });
          expect(defects, `${date} ${view} ${width}px ${theme}`).toEqual([]);
          if (width === 1440) {
            const column = await page.locator(".calendar-layout").boundingBox();
            const strip = await page.locator(".lunar-week-strip").boundingBox();
            expect(column!.width).toBe(1080);
            expect(Math.abs(strip!.x - column!.x)).toBeLessThan(1);
            expect(Math.abs(strip!.width - column!.width)).toBeLessThan(1);
          }
          if (date === "2026-09-24" && [1440, 768, 390].includes(width)) {
            await page.screenshot({ path: `${output}/header-${theme}-${width}-${view.toLowerCase()}.png` });
          }
        }
      }
    }
    assertNoErrors();
  });
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [320, 768, 1440]) {
    test(`lunar geometry and calendar layout at ${width}px in ${theme}`, async ({ page }) => {
      test.setTimeout(60_000);
      const assertNoErrors = watchBrowserErrors(page);
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((theme) => {
        localStorage.setItem("tldrastro:theme", theme);
        localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
          label: "New York City, NY", latitude: 40.7128, longitude: -74.006,
          timeZone: "America/New_York"
        }));
      }, theme);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/#calendar?view=day&date=2026-09-07");
      await expect(page.locator(".lunar-week-strip .lunar-week-day")).toHaveCount(7);
      await mkdir(output, { recursive: true });

      for (const view of ["Day", "Week", "Month"]) {
        await page.getByRole("tab", { name: view, exact: true }).click();
        await expect(page.getByRole("tab", { name: view, exact: true })).toHaveAttribute("aria-selected", "true");
        await expect(page.locator(".lunar-milestones")).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        const clippedControls = await page.locator(".lunar-calendar-controls button, .lunar-calendar-segmented button, .calendar-day-panel")
          .evaluateAll((nodes) => nodes.filter((node) => {
            const box = node.getBoundingClientRect();
            return box.left < 0 || box.right > innerWidth + 1;
          }).map((node) => node.textContent));
        expect(clippedControls, "Controls and event times remain visible, even inside overflow-clipped parents").toEqual([]);
        if (view === "Month") {
          const overlaps = await page.locator(".lunar-calendar-day").evaluateAll((days) => days.flatMap((day) => {
            const lunar = day.querySelector(".lunar-calendar-day__lunar")?.getBoundingClientRect();
            const phase = day.querySelector(".lunar-calendar-day__phase")?.getBoundingClientRect();
            return lunar && phase && lunar.bottom > phase.top + 1 ? [day.getAttribute("data-calendar-date")] : [];
          }));
          expect(overlaps, "Moon/sign and illumination rows do not overlap").toEqual([]);
        }
        if (view === "Day" && width === 1440) {
          const clippedTimes = await page.locator(".lunar-week-day__events .event-void span:last-child")
            .evaluateAll((nodes) => nodes.filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.textContent));
          expect(clippedTimes).toEqual([]);
        }
        await page.screenshot({ path: `${output}/${theme}-${width}-${view.toLowerCase()}.png`, fullPage: true });
      }
      assertNoErrors();
    });
  }
}
