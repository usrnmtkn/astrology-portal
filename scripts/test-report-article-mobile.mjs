#!/usr/bin/env node
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const fixtureUrl = process.env.REPORT_FIXTURE_URL ?? "http://127.0.0.1:5173/report-fixture.html";

async function waitForFixture() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(fixtureUrl);
      if (response.ok) return;
    } catch {
      // The local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Report fixture is not available at ${fixtureUrl}. Start the web dev server first.`);
}

let browser;
try {
  await waitForFixture();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const runtimeErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto(fixtureUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  if (await page.locator('[data-report-block="cover"]').count() === 0) {
    throw new Error(`Report fixture did not render. Runtime errors: ${JSON.stringify(runtimeErrors)}. Body: ${await page.locator("body").innerText()}`);
  }
  assert.equal(await page.locator('[data-report-block="chapters"] .report-chapter').count(), 2);
  assert.equal(await page.locator('[data-report-block="key-dates"] .report-key-date').count(), 1);
  assert.equal(await page.locator('[data-report-block="colophon"]').count(), 1);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    "Mobile report fixture must not overflow horizontally."
  );
  assert.equal(
    await page.locator(".report-chapter").first().evaluate((element) => (
      getComputedStyle(element).gridTemplateColumns.split(" ").length
    )),
    1,
    "Mobile chapters must collapse to one column."
  );

  await page.getByRole("button", { name: /FIXTURE_ONLY_KEY_DATE_TITLE/u }).click();
  const dialog = page.getByRole("dialog", { name: "FIXTURE_ONLY_KEY_DATE_TITLE" });
  await dialog.waitFor();
  await dialog.getByText("Saturn is exact on your natal Saturn on May 3, 2027, the second of three passes.").waitFor();
  const sheetBounds = await dialog.boundingBox();
  assert.ok(sheetBounds);
  assert.ok(
    Math.abs(sheetBounds.y + sheetBounds.height - 844) <= 1,
    `Mobile key-date sheet must meet the viewport bottom; got ${JSON.stringify(sheetBounds)}.`
  );
  await dialog.getByRole("button", { name: "Close key date" }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.deepEqual(runtimeErrors, []);

  console.log("report article fixture renders and opens its bottom sheet at 390x844 without overflow or runtime errors");
} finally {
  await browser?.close();
}
