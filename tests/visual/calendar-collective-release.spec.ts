import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("Calendar renders complete collective passages after Studio hydration and reload", async ({ page }) => {
  test.setTimeout(120_000);
  const copies = ["mercury-trine-pluto", "saturn-square-lilith"].map((name) =>
    JSON.parse(fs.readFileSync(`packages/astro-knowledge/data/transits/${name}.json`, "utf8")).readerCopy
  );
  await page.goto("/#calendar?view=day&date=2026-09-12");
  for (let load = 0; load < 2; load += 1) {
    const exactToday = page.getByRole("region", { name: /^Exact today$/i });
    for (const copy of copies) {
      // Full equality includes the approved opening and final sentence.
      await expect(exactToday.getByText(copy.body, { exact: true })).toBeVisible({ timeout: 60_000 });
    }
    if (load === 0) await page.reload();
  }
});
