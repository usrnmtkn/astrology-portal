import { expect, test, type Page } from "@playwright/test";
import { calendarSubscriptionFixture } from "../helpers/calendar-subscription-fixture";
import { bundledPublications } from "../helpers/bundled-publications";
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
