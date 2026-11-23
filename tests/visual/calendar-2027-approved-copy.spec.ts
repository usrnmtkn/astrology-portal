import { expect, test } from "@playwright/test";
import type { IncomingMessage, ServerResponse } from "node:http";
import calendarHandler from "../../api/calendar";
import skyHandler from "../../api/sky";
import { calendar2027ApprovedCopyCases, installCalendarApprovedSnapshot, unfoldCalendarDescription, visiblePassage } from "../helpers/calendar-2027-approved-copy";
import { calendarSubscriptionFixture } from "../helpers/calendar-subscription-fixture";
import { bundledSkyPublications } from "../helpers/bundled-publications";
import { readerResponse } from "../helpers/reader-response";
import { isSkyListPublicationKey } from "../../apps/web/src/content/skyListPublicationScope";
import { calendarFeedCategories } from "../../apps/web/src/features/calendar/calendarSubscription";
import { canonicalPublicationLedger, publicationLedgerTag } from "../../apps/web/src/services/publicationLedgerTransport";

const { cases, snapshot } = await calendar2027ApprovedCopyCases();
let fixture: Awaited<ReturnType<typeof calendarSubscriptionFixture>>;
let feedEntries: string[];
test.beforeAll(async () => {
  fixture = await calendarSubscriptionFixture(); await installCalendarApprovedSnapshot(fixture.db, snapshot);
  const subscription = (await fixture.invoke("/api/calendar-subscriptions", "POST", { include: [...calendarFeedCategories], reminder: "None", timeZone: "America/New_York" })).json().subscription;
  const feed = await fixture.invoke(`/feed/${subscription.token}.ics`);
  expect(feed.status).toBe(200);
  feedEntries = feed.body.replace(/\r\n[ \t]/gu, "").split("BEGIN:VEVENT");
});
test.afterAll(async () => { await fixture.close(); });

for (const [index, item] of cases.entries()) test(`complete approved text ${item.event.startsAt.slice(0, 10)} ${item.event.title}`, async ({ page }, info) => {
  test.setTimeout(90000);
  const { event, units } = item;
  await page.setViewportSize({ width: index % 2 ? 390 : 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(theme => {
    localStorage.setItem("tldrastro:theme", theme);
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "Synthetic New York", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" }));
  }, index % 4 < 2 ? "light" : "dark");
  // The Vite preview serves UI assets; use the actual calculation handlers for
  // native article reloads rather than an HTML response at an API URL.
  for (const [path, handler] of [["calendar", calendarHandler], ["sky", skyHandler]] as const) {
    await page.route(`**/api/${path}?*`, async route => {
      const response = { statusCode: 200, body: "", setHeader() {}, end(value: string) { this.body = value; } };
      await handler({ method: "GET", url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
      await route.fulfill({ status: response.statusCode, contentType: "application/json", body: response.body });
    });
  }
  await bundledSkyPublications(page);
  await page.route("**/api/content-reader", async route => {
    const requested: string[] | undefined = route.request().postDataJSON()?.keys;
    await route.fulfill({ json: readerResponse(snapshot.rows.filter(r => !requested || requested.includes(r.content_key)), snapshot.publications) });
  });
  await page.route(/\/api\/content-publications(?:\?|$)/, async route => {
    const scoped = new URL(route.request().url()).searchParams.get("scope") === "sky-list";
    const publications = canonicalPublicationLedger(scoped ? snapshot.publications.filter(r => isSkyListPublicationKey(r.content_key)) : snapshot.publications);
    await route.fulfill({ headers: { etag: await publicationLedgerTag(publications) }, json: {
      schema: scoped ? "tldr-sky-list-publications/v1" : "tldr-publications/v1", publications
    } });
  });
  await page.route("**/api/calendar-reading?*", async route => {
    const url = new URL(route.request().url()); const result = await fixture.invoke(url.pathname + url.search);
    await route.fulfill({ status: result.status, headers: result.headers, body: result.body });
  });
  const response = await fixture.invoke(`/api/calendar-reading?${new URLSearchParams({ id: event.id, date: event.dateKey, timeZone: "America/New_York" })}`);
  expect(response.status).toBe(200);
  const reading = response.json().reading;
  for (const unit of units) expect(reading.body).toContain(unit);
  const entry = feedEntries.find(entry => entry.includes(`event=${encodeURIComponent(event.id)}`));
  expect(entry).toBeTruthy();
  const description = unfoldCalendarDescription(entry!);
  for (const unit of units) expect(description).toContain(unit);
  await page.goto(`/?date=${event.dateKey}#calendar?view=day&date=${event.dateKey}`);
  const name = event.type === "aspect" ? new RegExp(`${event.planets![0]}.*${event.planets![1]}`) : new RegExp(event.type === "station" ? `Chiron.*stations.*${event.direction}` : "Chiron enters Taurus");
  const card = page.locator('[aria-label="Selected lunar day"]').getByRole("button", { name }).first();
  await expect(card).toBeVisible({ timeout: 60000 });
  if (event.type !== "ingress") for (const unit of units) await expect.poll(async () => visiblePassage(await card.innerText())).toContain(visiblePassage(unit));
  await card.click();
  const article = page.locator(".sky-detail-article");
  await expect(article).toBeVisible({ timeout: 60000 });
  for (const unit of units) await expect.poll(async () => visiblePassage(await article.innerText())).toContain(visiblePassage(unit));
  await page.screenshot({ path: `test-results/calendar-2027-reading-${index + 1}.png`, fullPage: true, animations: "disabled" });
  await page.reload();
  // A cold native event route reconstructs the dated placement in the Swiss
  // worker. Wait for that article, as for the calculated Calendar card above,
  // before applying the unchanged complete-copy assertions.
  await expect(article).toBeVisible({ timeout: 60000 });
  for (const unit of units) await expect.poll(async () => visiblePassage(await article.innerText())).toContain(visiblePassage(unit));
  const exportLink = new URL(reading.url);
  await page.goto(exportLink.pathname + exportLink.search + exportLink.hash);
  const dialog = page.getByRole("dialog", { name: event.title, exact: true });
  await expect(dialog).toBeVisible();
  for (const unit of units) await expect.poll(async () => visiblePassage(await dialog.innerText())).toContain(visiblePassage(unit));
  await info.attach("approved-source-parity", { body: JSON.stringify({ date: event.dateKey, title: event.title, sourceKeys: item.sourceKeys, completePassages: units.length, calendar: "pass", reload: "pass", exportedReading: "pass" }), contentType: "application/json" });
});
