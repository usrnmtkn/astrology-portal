import { expect, test } from "../helpers/polish-test";
import { bundledSkyPublications } from "../helpers/bundled-publications";

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) test(`Sky dignity requires two planets ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date("2026-11-12T17:00:00Z"));
  await page.addInitScript(value => localStorage.setItem("tldrastro:theme", value), theme);
  await bundledSkyPublications(page);
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  const section = page.locator(".sky-debility-ledger");
  const placements = page.locator(".sky-placement-group .planet-placement-row");

  // The real ephemeris supplies two distinct qualifying planets on this date.
  await page.goto("/?date=2009-10-15#sky");
  await expect(section.locator(".sky-debility-card")).toHaveCount(2, { timeout: 60_000 });
  await expect(section.locator(".sky-debility-card strong")).toHaveText(["Sun in Libra", "Mars in Cancer"]);
  await expect(page.getByRole("button", { name: "What is dignity?", exact: true })).toBeVisible();
  await page.reload();
  await expect(section.locator(".sky-debility-card")).toHaveCount(2, { timeout: 60_000 });

  // Only Saturn qualifies on the reported date. Its normal placement remains.
  await page.goto("/?date=2026-11-12#sky");
  await expect(placements).toHaveCount(14, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Read more about Saturn Rx in Aries", exact: true })).toBeVisible();
  await expect(section).toHaveCount(0);
  await expect(page.getByRole("button", { name: "What is dignity?", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(placements).toHaveCount(14, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Read more about Saturn Rx in Aries", exact: true })).toBeVisible();
  await expect(section).toHaveCount(0);
  await expect(page.getByRole("button", { name: "What is dignity?", exact: true })).toHaveCount(0);
});
