import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Exercise the real saved inventory, rather than an empty dashboard fixture.
const inventory = JSON.parse(readFileSync(new URL("../../apps/web/public/content-studio-last-known-good.json", import.meta.url), "utf8")).rows as Array<{ id: string; content_key: string }>;
// Recovery includes two deliberate failures, backoff, and the complete paged inventory.
// Keep it within the existing 15-second reader/Studio readiness budget.
const recoveryReadiness = { timeout: 15_000 };
const studioPath = process.env.STUDIO_PRODUCTION_ENTRY === "1" ? "/admin/content" : "/";

async function mockStudio(page: Page, malformedStatus = false) {
  await page.addInitScript(() => localStorage.setItem("tldrastro:contentAdminSecret", "studio-recovery-fixture"));
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const data: any = { ok: true, rows: [], statuses: [], nextCursor: null };
    if (url.pathname.endsWith("/generated-content")) {
      const cursor = Number(url.searchParams.get("cursor") ?? 0);
      const key = url.searchParams.get("contentKeys");
      data.rows = key ? inventory.filter(row => key.split(",").includes(row.content_key)) : inventory.slice(cursor, cursor + 400);
      if (!key && cursor + 400 < inventory.length) data.nextCursor = String(cursor + 400);
    }
    if (url.pathname.endsWith("/content-live-status")) {
      const input = route.request().postDataJSON();
      data.statuses = (input.ids ?? []).map((id: string) => ({
        id, live: true, label: malformedStatus ? { invalid: true } : "Live", detail: "Fixture status",
        source: "fixture", updatedAt: null
      }));
    }
    await route.fulfill({ json: data });
  });
}

async function openStudioPage(page: Page, name: string) {
  await expect(page.locator("#admin-content-navigation")).toBeAttached();
  const navigation = page.getByRole("button", { name: "Open Content Studio navigation", exact: true });
  if (await navigation.isVisible()) await navigation.click();
  await page.getByRole("button", { name, exact: true }).click();
}

async function selectSaturnPlacement(page: Page) {
  await page.getByLabel("Sky placement planet or point").selectOption("saturn");
  await page.getByLabel("Sky placement zodiac sign").selectOption("aries");
}

test("invalid secondary responses do not block saved Studio content", async ({ page }) => {
  await mockStudio(page);
  await page.route(/\/api\/admin\/(review-records|user-generated-content|content-review-events)\?/, route => route.fulfill({ json: null }));
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${studioPath}#sky-writeups`);
  await expect(page.getByLabel("Sky write-up rows").locator("tbody tr").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected", recoveryReadiness);
  await expect(page.getByRole("heading", { name: "The dashboard could not load saved CMS rows" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const initialPage of ["review-queue", "articles"]) {
  test(`invalid inventory pages retry automatically before completing from ${initialPage}`, async ({ page }) => {
    await mockStudio(page);
    let attempts = 0;
    await page.route("**/api/admin/generated-content?**", async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("scope") === "all" && !url.searchParams.has("cursor") && ++attempts <= 2) {
        await route.fulfill({ json: attempts === 1 ? null : { rows: null } });
      } else await route.fallback();
    });
    await page.goto(`${studioPath}#${initialPage}`);
    await expect.poll(() => attempts, recoveryReadiness).toBe(3);
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected", recoveryReadiness);
    expect(attempts).toBe(3);
    await openStudioPage(page, "Sky Write-ups");
    await expect(page.getByLabel("Sky write-up rows").locator("tbody tr").first()).toBeVisible();
  });

  test(`persistent invalid inventory stops retrying and can recover manually from ${initialPage}`, async ({ page }) => {
    await mockStudio(page);
    let invalid = true;
    let attempts = 0;
    await page.route("**/api/admin/generated-content?**", async route => {
      if (invalid && new URL(route.request().url()).searchParams.get("scope") === "all") {
        attempts += 1;
        await route.fulfill({ json: null });
      } else await route.fallback();
    });
    await page.goto(`${studioPath}#${initialPage}`);
    await expect(page.getByRole("heading", { name: "The dashboard could not load saved CMS rows" })).toBeVisible(recoveryReadiness);
    await expect(page.getByText(/Expected a JSON object\. The response was empty or invalid/).first()).toBeVisible();
    expect(attempts).toBe(3);
    invalid = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected", recoveryReadiness);
  });
}

test("Sky Write-ups navigation remains usable with a malformed status response", async ({ page }) => {
  await mockStudio(page, true);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${studioPath}#review-queue`);
  await openStudioPage(page, "Sky Write-ups");
  await expect(page.getByLabel("Sky placement planet or point")).toBeVisible();
  const savedStatus = page.getByLabel("Sky write-up rows").locator("tbody tr").first().locator(".admin-col-visibility .admin-status");
  await expect(savedStatus).toHaveText("Unavailable");
  await expect(savedStatus).toHaveAttribute("title", "Reader serving status could not be verified. Refresh to retry.");
  await openStudioPage(page, "Content Library");
  await openStudioPage(page, "Sky Write-ups");
  await expect(page.getByLabel("Sky write-up rows").locator("tbody tr").first()).toBeVisible();
  expect(errors).toEqual([]);
});

for (const theme of ["light", "dark"]) for (const width of [390, 1440]) {
  test(`Studio recovers from a page crash ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await mockStudio(page);
    // Fault injection is confined to the test browser's module response.
    let recoverOnReload = false;
    await page.route("**/SkyPlacementComposition-*.js", route => route.fulfill({
      contentType: "text/javascript",
      body: recoverOnReload ? 'export default function(){return null;}' : 'export default function(){if(!document.documentElement.hasAttribute("data-qa-recovered"))throw new Error("Studio recovery fixture");return null;}'
    }));
    await page.goto(`${studioPath}#review-queue`);
    await page.evaluate(value => document.documentElement.setAttribute("data-theme", value), theme);
    await openStudioPage(page, "Sky Write-ups");
    // A complete placement mounts the map and exercises the injected failure.
    await selectSaturnPlacement(page);
    await expect(page.getByRole("alert").filter({ hasText: "This page could not load." })).toBeVisible();
    await page.getByText("Error details", { exact: true }).click();
    await expect(page.getByText("Error: Studio recovery fixture", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reload page", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/studio-recovery-${width}-${theme}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    // Retry remounts the dashboard and reloads its inventory without clearing authentication.
    await page.evaluate(() => document.documentElement.setAttribute("data-qa-recovered", ""));
    await page.getByRole("button", { name: "Retry page", exact: true }).click();
    await expect(page.getByLabel("Sky placement planet or point")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("tldrastro:contentAdminSecret"))).toBe("studio-recovery-fixture");

    // A repeated crash can be escaped through a separate Studio destination.
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected", recoveryReadiness);
    await openStudioPage(page, "Review Queue");
    await page.evaluate(() => document.documentElement.removeAttribute("data-qa-recovered"));
    await openStudioPage(page, "Sky Write-ups");
    await selectSaturnPlacement(page);
    await expect(page.getByRole("alert").filter({ hasText: "This page could not load." })).toBeVisible();
    await page.getByRole("link", { name: "Open Review Queue", exact: true }).click();
    await expect(page).toHaveURL(/#review-queue$/);
    await expect(page.getByRole("heading", { name: "Review Queue", exact: true })).toBeVisible();
    await openStudioPage(page, "Sky Write-ups");
    await selectSaturnPlacement(page);
    await expect(page.getByRole("alert").filter({ hasText: "This page could not load." })).toBeVisible();
    recoverOnReload = true;
    await Promise.all([
      page.waitForEvent("load"),
      page.getByRole("button", { name: "Reload page", exact: true }).click()
    ]);
    await expect(page.getByLabel("Sky placement planet or point")).toBeVisible();
    await selectSaturnPlacement(page);
    await expect(page.getByRole("alert").filter({ hasText: "This page could not load." })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("tldrastro:contentAdminSecret"))).toBe("studio-recovery-fixture");
  });
}

for (const action of ['Retry page', 'Open Review Queue']) {
  test(`Studio recovers a missing deployment chunk through ${action}`, async ({ page }) => {
    await mockStudio(page);
    let missing = true;
    let documents = 0;
    page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
    await page.route('**/SkyPlacementComposition-*.js', route => missing ? route.abort('failed') : route.continue());
    await page.goto(`${studioPath}#review-queue`);
    await openStudioPage(page, 'Sky Write-ups');
    await selectSaturnPlacement(page);
    const recovery = page.getByRole('region', { name: 'Page recovery', exact: true });
    await expect(recovery).toBeVisible();
    await recovery.getByText('Error details', { exact: true }).click();
    // Vite must reject the import with its real failure, not resolve undefined
    // and poison React.lazy with "reading default" for every future Retry.
    await expect(recovery.locator('pre')).toContainText(/Failed to fetch dynamically imported module|Importing a module script failed|Unable to preload/);
    expect(documents).toBe(1); // Authoring pages never reload without an action.
    missing = false;
    await recovery.getByRole(action === 'Retry page' ? 'button' : 'link', { name: action, exact: true }).click();
    await expect.poll(() => documents).toBe(2);
    if (action === 'Open Review Queue') {
      await expect(page.getByRole('heading', { name: 'Review Queue', exact: true })).toBeVisible();
      await openStudioPage(page, 'Sky Write-ups');
    }
    await expect(page.getByLabel('Sky placement planet or point')).toBeVisible();
    await selectSaturnPlacement(page);
    await expect(page.getByRole('region', { name: 'Sky placement composition map', exact: true })).toBeVisible();
    await expect(recovery).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('tldrastro:contentAdminSecret'))).toBe('studio-recovery-fixture');
  });
}

test('reader startup keeps its guarded reload and manual recovery', async ({ page }) => {
  test.skip(process.env.STUDIO_PRODUCTION_ENTRY !== '1', 'Reader startup requires the production web entry.');
  await mockStudio(page);
  let missing = true;
  let documents = 0;
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
  await page.route('**/App-*.js', route => missing ? route.abort('failed') : route.continue());
  await page.goto('/#sky', { waitUntil: 'commit' });
  await expect(page.locator('#app-startup')).toHaveAttribute('role', 'alert');
  expect(documents).toBe(2);
  missing = false;
  await page.locator('#app-startup button').click();
  await expect(page.locator('.topbar')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#app-startup')).toHaveCount(0);
  expect(documents).toBe(3);
});
