import { expect, type Page, type Request } from "@playwright/test";
import "./qaUnresolvedContentFixtures";

export const routeReadyTimeoutMs = 15_000;
export const routeLoadBudgetMs = 15_000;

export function watchBrowserErrors(page: Page) {
  const errors: string[] = [];
  const cancelledAssets: Array<{ request: Request; message: string }> = [];
  const ignoredConsolePatterns = [
    /Failed to load resource/i,
    /net::ERR_/i,
    /favicon/i
  ];

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
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

  return () => {
    for (const { request, message } of cancelledAssets) if (!request.frame().isDetached()) errors.push(message);
    expect(errors, `Unexpected browser errors:\n${errors.join("\n")}`).toEqual([]);
  };
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
