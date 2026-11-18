import { expect, type Page, type Request } from "@playwright/test";
import "./qaUnresolvedContentFixtures";

export const routeReadyTimeoutMs = 15_000;
export const routeLoadBudgetMs = 15_000;

export function watchBrowserErrors(page: Page, options: { webkitReaderReload?: boolean } = {}) {
  const errors: string[] = [];
  const reloadCancellations: string[] = [];
  let departingOrigin: string | null = null;
  const cancelledAssets: Array<{ request: Request; message: string }> = [];
  const ignoredConsolePatterns = [
    /Failed to load resource/i,
    /net::ERR_/i,
    /favicon/i
  ];

  page.on("pageerror", (error) => {
    const expected = departingOrigin && `Fetch API cannot load ${departingOrigin}/api/content-reader due to access control checks.`;
    // WebKit can report an old document's fetch while an explicit reload commits.
    // Keep this separate from successful reads and close the window at commit.
    if (expected && (error.message === expected || error.stack?.split("\n")[0] === expected)) {
      reloadCancellations.push(expected);
      return;
    }
    errors.push(`pageerror: ${error.message}`);
  });
  page.on("framenavigated", frame => {
    if (frame === page.mainFrame()) departingOrigin = null;
  });

  // API outages are explicitly exercised by reader fixtures. Failed executable
  // assets are different: a visible shell must not hide a broken route chunk.
  page.on("requestfailed", request => {
    const pathname = new URL(request.url()).pathname;
    const failure = request.failure()?.errorText ?? "unknown failure";
    if (/\.(?:js|css)$/u.test(pathname) && !/ERR_ABORTED/u.test(failure)) {
      const message = `asset: ${pathname}: ${failure}`;
      // WebKit reports removed reader-frame downloads as "cancelled". A
      // cancellation in a frame that remains attached is still a test failure.
      if (failure === 'cancelled') cancelledAssets.push({ request, message });
      else errors.push(message);
    }
  });
  page.on("response", response => {
    const pathname = new URL(response.url()).pathname;
    if (response.status() >= 400 && /\.(?:js|css)$/u.test(pathname)) errors.push(`asset: ${pathname}: HTTP ${response.status()}`);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") return;

    const text = message.text();
    if (ignoredConsolePatterns.some((pattern) => pattern.test(text))) return;

    errors.push(`console.error: ${text}`);
  });

  const assertNoErrors = () => {
    for (const { request, message } of cancelledAssets) if (!request.frame().isDetached()) errors.push(message);
    expect(errors, `Unexpected browser errors:\n${errors.join("\n")}`).toEqual([]);
  };
  return Object.assign(assertNoErrors, {
    reloadCancellations,
    async reload() {
      assertNoErrors();
      departingOrigin = options.webkitReaderReload ? new URL(page.url()).origin : null;
      try {
        const response = await page.reload({ waitUntil: "commit" });
        departingOrigin = null;
        expect(response, "The replacement document must return a complete HTTP 200 response").not.toBeNull();
        expect(response!.status()).toBe(200);
        expect(await response!.finished()).toBeNull();
        expect(response!.request().failure()).toBeNull();
      } finally {
        departingOrigin = null;
      }
    }
  });
}

export async function expectRouteLoadsWithin(
  page: Page,
  route: string,
  label: string,
  assertReady: () => Promise<void>,
  budgetMs = routeLoadBudgetMs
) {
  const startedAt = Date.now();
  await page.goto(route);
  await assertReady();
  // The shell can precede the calculated calendar. Keep readiness inside the
  // existing route budget before tests inspect events and approved passages.
  if (new URL(route, page.url()).hash.startsWith("#calendar")) {
    await expect(page.locator(".lunar-calendar-body")).toBeVisible({ timeout: budgetMs });
  }
  const elapsedMs = Date.now() - startedAt;
  expect(elapsedMs, `${label} should become QA-ready within ${budgetMs}ms`).toBeLessThanOrEqual(budgetMs);
}

export async function expectInteractionLoadsWithin(
  label: string,
  action: () => Promise<void>,
  assertReady: () => Promise<void>,
  budgetMs = routeLoadBudgetMs
) {
  const startedAt = Date.now();
  await action();
  await assertReady();
  const elapsedMs = Date.now() - startedAt;
  expect(elapsedMs, `${label} should become QA-ready within ${budgetMs}ms`).toBeLessThanOrEqual(budgetMs);
}
