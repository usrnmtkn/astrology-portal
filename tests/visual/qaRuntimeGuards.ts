import { expect, type Page } from "@playwright/test";
import "./qaUnresolvedContentFixtures";

export const routeReadyTimeoutMs = 15_000;
export const routeLoadBudgetMs = 15_000;

export function watchBrowserErrors(page: Page) {
  const errors: string[] = [];
  const ignoredConsolePatterns = [
    /Failed to load resource/i,
    /net::ERR_/i,
    /favicon/i
  ];

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") return;

    const text = message.text();
    if (ignoredConsolePatterns.some((pattern) => pattern.test(text))) return;

    errors.push(`console.error: ${text}`);
  });

  return () => {
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
