import { expect, test, type Page } from "@playwright/test";
import { calendarSubscriptionFixture } from "../helpers/calendar-subscription-fixture";
import { bundledPublications } from "../helpers/bundled-publications";
import { calendarReadingUrl } from "../../apps/web/src/features/calendar/calendarFeedPreview";
let fixture: Awaited<ReturnType<typeof calendarSubscriptionFixture>>;
test.beforeEach(async ({ page }) => {
  fixture = await calendarSubscriptionFixture();
  await bundledPublications(page);
  await page.route("**/api/admin/**", async route => {
    if (!route.request().url().includes("calendar-feed-events")) return route.fulfill({ json: { ok: true, rows: [], nextCursor: null, publications: [], statuses: [], definitions: [], sources: [], variables: [], totals: {}, items: [] } });
    const result = await fixture.invoke(new URL(route.request().url()).pathname, route.request().method(), route.request().postDataJSON() ?? undefined, route.request().headers());
    await route.fulfill({ status: result.status, headers: result.headers, body: result.body });
  });
  await page.route("**/api/calendar-subscriptions", async route => {
    const result = await fixture.invoke("/api/calendar-subscriptions", route.request().method(), route.request().postDataJSON(), route.request().headers());
    await route.fulfill({ status: result.status, headers: result.headers, body: result.body });
  });
  await page.route("**/feed/*.ics", async route => {
    const result = await fixture.invoke(new URL(route.request().url()).pathname, route.request().method(), undefined, route.request().headers());
    await route.fulfill({ status: result.status, headers: result.headers, body: result.body });
  });
  await page.route("**/api/calendar-reading?*", async route => {
    const url = new URL(route.request().url());
    const result = await fixture.invoke(url.pathname + url.search);
    await route.fulfill({ status: result.status, headers: result.headers, body: result.body });
  });
  await page.addInitScript(() => {
    localStorage.setItem("tldrastro:contentAdminSecret", "fixture-owner");
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" }));
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test.afterEach(async () => fixture.close());

async function openSheet(page: Page) {
  await page.goto("/#calendar?date=2026-09-21&view=month");
  await page.getByRole("button", { name: /Add to your calendar|Calendar subscription link/ }).first().click();
  return page.getByRole("dialog", { name: "Add to your calendar" });
}
for (const width of [390, 1440]) for (const theme of ['light', 'dark']) test(`complete monthly planning and subscription categories ${theme} ${width}`, async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(value => localStorage.setItem('tldrastro:theme', value), theme);
  const sheet = await openSheet(page);
  for (const name of ['Quarter Moons', 'Void-of-course Moon', 'Daily planning guidance']) {
    await expect(sheet.getByRole('switch', { name, exact: true })).toHaveAttribute('aria-checked', 'true');
  }
  await sheet.getByRole('button', { name: 'Close calendar subscription' }).click();
  const planning = page.getByRole('region', { name: 'Daily planning', exact: true });
  await expect(planning.getByRole('heading', { name: 'Daily planning · Sep 21', exact: true })).toBeVisible({ timeout: 45000 });
  for (const activity of ['Love', 'Work', 'Creativity', 'Rest']) await expect(planning).toContainText(activity);
  await expect(planning).toContainText('Planetary hours · New York · America/New_York');
  await expect(planning).toContainText('Venus hours');
  await expect(planning).toContainText('Property and land · Saturn hours');
  await expect(planning).toContainText('Leisure · Venus hours');
  await expect(planning).not.toContainText('Moon hours');
  await expect(planning).not.toContainText('Mars hours');
  const initialBody = await planning.innerText();
  expect(initialBody).not.toContain('{{');
  await page.reload();
  await expect(planning).toHaveText(initialBody, { timeout: 45000, useInnerText: true });
  expect(await planning.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await planning.screenshot({ path: `test-results/calendar-daily-planning-${theme}-${width}.png` });
  await page.goto('/#calendar?date=2026-08-13&view=day');
  await expect(page.getByRole('button', { name: 'Moon void of course', exact: true })).toHaveCount(2, { timeout: 45000 });
  await expect(page.getByRole('region', { name: 'Daily planning', exact: true }).getByRole('heading', { level: 3 })).toBeVisible();
  const headings = await page.locator('.calendar-day-panel.is-embedded .calendar-sky-card__title').evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node);
    return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'margin', 'textTransform', 'textAlign'].map(key => [key, style[key as any]]));
  }));
  expect(headings).toHaveLength(2);
  expect(headings[1]).toEqual(headings[0]);
  const readingResponse = await fixture.invoke('/api/calendar-reading?id=daily-2026-09-21&date=2026-09-21&timeZone=Pacific%2FKiritimati&latitude=1.8721&longitude=-157.4278&locationLabel=Kiritimati');
  expect(readingResponse.status).toBe(200);
  const reading = readingResponse.json().reading;
  const linked = new URL(reading.url);
  await page.goto(linked.pathname + linked.search + linked.hash);
  const dialog = page.getByRole('dialog', { name: 'Daily planning · Love, work, creativity & rest', exact: true });
  await expect(dialog.locator('.calendar-reading__body')).toHaveText(reading.body.replace(/\*\*/gu, ''), { useInnerText: true });
});
test('daily planning shows loading, retries an outage and handles unavailable copy', async ({ page }) => {
  let release: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let state: 'held' | 'ready' | 'missing' = 'held';
  await page.route('**/api/calendar-reading?*', async route => {
    if (!new URL(route.request().url()).searchParams.get('id')?.startsWith('daily-')) return route.fallback();
    if (state === 'held') { await held; return route.fulfill({ status: 503, json: { error: 'Unavailable' } }); }
    if (state === 'missing') return route.fulfill({ status: 404, json: { error: 'Unavailable' } });
    return route.fallback();
  });
  await page.goto('/#calendar?date=2026-09-21&view=month');
  await expect(page.getByRole('status').filter({ hasText: 'Loading daily planning…' })).toBeVisible();
  release!();
  await expect(page.getByText('Daily planning couldn’t load.')).toBeVisible();
  state = 'ready';
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Daily planning', exact: true })).toBeVisible();
  state = 'missing';
  const missingResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('id') === 'daily-2026-09-21' && response.status() === 404);
  await page.reload();
  await missingResponse;
  await expect(page.getByRole('status').filter({ hasText: 'Loading daily planning…' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Daily planning', exact: true })).toHaveCount(0);
  await expect(page.getByText('Daily planning couldn’t load.')).toHaveCount(0);
});
for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`free unique subscription, persistent preferences and real feed ${theme} ${width}`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(value => localStorage.setItem("tldrastro:theme", value), theme);
    const sheet = await openSheet(page);
    await expect(sheet.getByRole("heading", { level: 2 })).toHaveText("Add to your calendar");
    await expect(sheet.locator(".calendar-subscribe__label")).toHaveText(["Include", "Remind me"]);
    await page.screenshot({ path: `test-results/calendar-subscriptions-options-${theme}-${width}.png` });
    await expect(sheet).not.toContainText("$11.99");
    await sheet.getByRole("button", { name: "Day before", exact: true }).click();
    await sheet.getByRole("button", { name: "Create my calendar link" }).click();
    await expect(sheet.getByText("Your calendar link is ready", { exact: true })).toBeVisible();
    await expect(sheet).not.toContainText("You're subscribed");
    const typography = await sheet.locator(".calendar-subscribe__title").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node); return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "margin", "textTransform", "textAlign"].map(key => [key, style[key as any]]));
    }));
    expect(typography[1]).toEqual(typography[0]);
    await testInfo.attach("subscription-heading-typography", { body: JSON.stringify(typography), contentType: "application/json" });
    const url = await sheet.getByRole("textbox", { name: "Calendar subscription URL" }).inputValue();
    expect(url).toMatch(/\/feed\/[A-Za-z0-9_-]{43}\.ics$/);
    await expect(sheet.getByRole("link", { name: "Open Apple Calendar" })).toHaveAttribute("href", url.replace(/^https?:/, "webcal:"));
    expect(new URL((await sheet.getByRole("link", { name: "Open Google Calendar" }).getAttribute("href"))!).searchParams.get("cid")).toBe(url.replace(/^https?:/, "webcal:"));
    const response = await page.evaluate(async url => { const response = await fetch(url); return { status: response.status, type: response.headers.get("content-type"), body: await response.text() }; }, url);
    expect(response.status).toBe(200); expect(response.type).toContain("text/calendar"); expect(response.body).toContain("BEGIN:VCALENDAR"); expect(response.body).toContain("TRIGGER:-P1D");
    await page.screenshot({ path: `test-results/calendar-subscriptions-${theme}-${width}.png` });
    expect(await sheet.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await sheet.getByRole("button", { name: "Close calendar subscription" }).click();
    await page.reload();
    await page.getByRole("button", { name: "Calendar subscription link", exact: true }).first().click();
    await expect(sheet.getByRole("button", { name: "Day before", exact: true })).toHaveAttribute("aria-pressed", "true");
    await sheet.getByRole("button", { name: "Save calendar preferences" }).click();
    await expect(sheet.getByRole("textbox", { name: "Calendar subscription URL" })).toHaveValue(url);
    expect(errors).toEqual([]);
  });
}
test("creation failure preserves choices and never reports success", async ({ page }) => {
  test.setTimeout(90000);
  const sheet = await openSheet(page);
  fixture.setStorageFailure(true);
  await sheet.getByRole("button", { name: "Create my calendar link" }).click();
  await expect(sheet.getByRole("alert")).toBeVisible();
  await expect(sheet.getByText("Your calendar link is ready", { exact: true })).toHaveCount(0);
  fixture.setStorageFailure(false);
  await sheet.getByRole("button", { name: "Create my calendar link" }).click();
  await expect(sheet.getByText("Your calendar link is ready", { exact: true })).toBeVisible();
});

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) test(`feed excerpt links open exact full readings ${theme} ${width}`, async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width, height: 950 });
  await page.addInitScript(value => localStorage.setItem("tldrastro:theme", value), theme);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const fullBody = "Published first sentence. Second sentence. Third sentence.\n\nFourth sentence remains in the app. The complete final sentence is preserved.";
  const result = await fixture.invoke("/api/admin/calendar-feed-events", "POST", { action: "publish", event: {
    title: "Community calendar reading", description: fullBody, start: "2026-09-21", end: "2026-09-22", allDay: true, category: "key", url: ""
  } }, { authorization: "Bearer fixture-owner" });
  expect(result.status).toBe(201);
  const id = `event-${result.json().event.id}`;
  const sub = (await fixture.invoke("/api/calendar-subscriptions", "POST", { include: ["key"], reminder: "None", timeZone: "America/New_York" })).json().subscription;
  const feed = (await fixture.invoke(`/feed/${sub.token}.ics`)).body.replace(/\r\n /gu, "");
  const entry = feed.split("BEGIN:VEVENT").find(part => part.includes(`UID:${id}@tldrastro`))!;
  expect(entry).toContain("Published first sentence. Second sentence. Third sentence.");
  expect(entry).not.toContain("Fourth sentence");
  const link = new URL(entry.match(/\r\nURL:([^\r]+)/)![1]);
  expect(entry).toContain(`Read more: ${link.href}`);
  await page.goto(link.pathname + link.search + link.hash);
  const dialog = page.getByRole("dialog", { name: "Community calendar reading" });
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText("Community calendar reading");
  await expect(dialog.locator(".calendar-reading__body")).toContainText("Published first sentence.");
  await expect(dialog.locator(".calendar-reading__body")).toContainText("The complete final sentence is preserved.");
  expect(await dialog.locator("h1,h2,h3").allTextContents()).toEqual(["Community calendar reading"]);
  const typography = await dialog.getByRole("heading").evaluate(node => {
    const properties = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "margin", "textTransform", "textAlign"];
    const snapshot = (element: Element) => Object.fromEntries(properties.map(key => [key, getComputedStyle(element)[key as any]]));
    return snapshot(node);
  });
  await testInfo.attach("linked-reading-typography", { body: JSON.stringify(typography), contentType: "application/json" });
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: `test-results/calendar-linked-reading-${theme}-${width}.png` });
  await page.reload(); await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toHaveCount(0); expect(page.url()).not.toContain("&event=");
  await page.getByRole("button", { name: "Moon enters Aquarius", exact: true }).click();
  const ordinaryTitle = page.locator("#calendar-reading-title");
  await expect(ordinaryTitle).toBeVisible();
  expect(await ordinaryTitle.evaluate(node => {
    const style = getComputedStyle(node);
    return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "margin", "textTransform", "textAlign"].map(key => [key, style[key as any]]));
  })).toEqual(typography);
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  const weekly = new URL(calendarReadingUrl("https://example.com", "2026-09-21", "week-2026-09-21", "America/New_York"));
  await page.goto(weekly.pathname + weekly.search + weekly.hash);
  const weekDialog = page.getByRole("dialog", { name: "Weekly emotional forecast" });
  await expect(weekDialog).toContainText("A Full Moon in Aries arrives this week,");
  await expect(weekDialog).toContainText("before turning one intense moment into a final verdict.");
  await page.goBack(); await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("event links show loading, recover after an outage, and handle missing events", async ({ page }) => {
  test.setTimeout(90000);
  let release: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/calendar-reading?*", async route => { await held; await route.fallback(); });
  const link = new URL(calendarReadingUrl("https://example.com", "2026-09-21", "week-2026-09-21", "UTC"));
  fixture.setStorageFailure(true);
  await page.goto(link.pathname + link.search + link.hash);
  await expect(page.getByRole("status", { name: "Loading event reading…" })).toBeVisible();
  release!();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("This reading could not load");
  fixture.setStorageFailure(false);
  await page.getByRole("dialog").getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Weekly emotional forecast" })).toBeVisible();
  await page.goto(link.pathname + link.search + link.hash.replace("event=week-2026-09-21", "event=event-00000000-0000-4000-8000-000000000000"));
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("This calendar event is not available.");
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
for (const width of [390, 1440]) for (const theme of ["light", "dark"]) test(`owner can draft, publish, edit and cancel an event ${theme} ${width}`, async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width, height: 950 });
  await page.addInitScript(value => localStorage.setItem("tldrastro:studio-theme", value), theme);
  const created = await fixture.invoke("/api/calendar-subscriptions", "POST", { include: ["key"], reminder: "None", timeZone: "UTC" });
  const feedPath = `/feed/${created.json().subscription.token}.ics`;
  await page.goto("/admin/content#calendar-writeups?view=subscription-events");
  const editor = page.getByRole("region", { name: "Subscription events", exact: true });
  await expect(editor.getByRole("heading", { name: "Subscription events", level: 2 })).toBeVisible();
  await expect(page.locator(".admin-dashboard")).toHaveAttribute("data-studio-theme", theme);
  await expect(editor.getByText("No subscription events yet.", { exact: false })).toBeVisible();
  await page.screenshot({ path: `test-results/calendar-subscription-events-empty-${theme}-${width}.png` });
  const typography = await editor.getByRole("heading").evaluate(node => {
    const style = getComputedStyle(node); return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "margin", "textTransform", "textAlign"].map(key => [key, style[key as any]]));
  });
  await testInfo.attach("studio-heading-typography", { body: JSON.stringify(typography), contentType: "application/json" });
  await editor.getByRole("button", { name: "Add event", exact: true }).click();
  await editor.getByLabel("Event title", { exact: true }).fill("Community calendar session");
  await editor.getByLabel("Description", { exact: true }).fill("First complete sentence.\n\nFinal complete sentence.");
  await editor.getByLabel("All day", { exact: true }).check();
  await editor.getByLabel("Starts", { exact: true }).fill("2026-10-04");
  await editor.getByLabel("Ends", { exact: true }).fill("2026-10-05");
  await editor.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(editor.getByRole("status")).toContainText("Draft saved");
  expect((await fixture.invoke(feedPath)).body).not.toContain("Community calendar session");
  await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect(editor.getByRole("status")).toContainText("Event published");
  const first = await fixture.invoke(feedPath); expect(first.body).toContain("Community calendar session"); expect(first.body).toContain("Final complete sentence.");
  await editor.getByLabel("Description", { exact: true }).fill("Revised first complete sentence.\n\nRevised final complete sentence.");
  await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect(editor.getByRole("status")).toContainText("Event published");
  const revised = (await fixture.invoke(feedPath)).body.replace(/\r\n /gu, "");
  expect(revised).toContain("DESCRIPTION:Revised first complete sentence.\\n\\nRevised final complete sentence.");
  await expect(editor.getByLabel("Description", { exact: true })).toHaveValue("Revised first complete sentence.\n\nRevised final complete sentence.");
  await editor.getByRole("heading").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/calendar-subscription-events-published-${theme}-${width}.png` });
  expect(await editor.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await editor.getByRole("button", { name: "Cancel event", exact: true }).click();
  await expect(editor.getByRole("status")).toContainText("Event cancelled");
  expect((await fixture.invoke(feedPath)).body).toContain("STATUS:CANCELLED");
});
