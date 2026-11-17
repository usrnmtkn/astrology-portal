import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { prepareChartReport } from "../helpers/chart-report-fixture";

test.describe.configure({ mode: "parallel" });

async function openReport(page: Page, kind: string) {
  if (kind === "sky") {
    await page.goto("/#sky");
    await page.getByRole("button", { name: "Open full current sky chart", exact: true }).click();
  } else if (kind === "natal" || kind === "transit") {
    await page.goto("/#you");
    await expect(page.locator(".chart-layout__visual")).toHaveAttribute("data-chart-calculation-status", "ready", { timeout: 30000 });
    if (kind === "natal") await page.getByRole("tab", { name: "Natal Chart", exact: true }).click();
    await page.getByRole("button", { name: `Open full ${kind} chart`, exact: true }).click();
  } else {
    await page.goto("/#friends?tab=charts");
    await page.getByRole("button", { name: "Open Fixture Friend", exact: true }).click();
    const label = kind === "synastry" ? "Synastry" : "Composite";
    const tab = page.getByRole("tab", { name: label, exact: true });
    if (await tab.isVisible()) await tab.click();
    else { await page.getByRole("button", { name: /More, \d+ sections/ }).click(); await page.getByRole("menuitemradio", { name: new RegExp("^" + label) }).click(); }
    await page.getByRole("button", { name: "Full-screen chart", exact: true }).click();
  }
  await expect(page.locator(`.full-chart[data-chart-kind="${kind}"]`)).toBeVisible();
  await expect(page.locator(".full-chart__wheel svg").first()).toBeVisible();
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) for (const theme of ["light", "dark"]) {
  test(`all five full charts, grids and branded CSV ${viewport.width} ${theme}`, async ({ page }, info) => {
    test.setTimeout(120000);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize(viewport); await prepareChartReport(page, theme, "Fixture Friend");
    for (const kind of ["sky", "natal", "transit", "synastry", "composite"]) {
      await openReport(page, kind);
      const report = page.locator(".full-chart");
      await page.evaluate(() => document.fonts.ready);
      await expect(report.locator("h2")).toHaveText(new RegExp(`^${kind}`, "i"));
      await expect(report.locator("h2")).toHaveCSS("font-family", /Newsreader/);
      await expect(report.locator("h2")).toHaveCSS("font-size", "36px");
      await expect(report.locator("h2")).toHaveCSS("font-weight", "500");
      await expect(report.locator("h2")).toHaveCSS("letter-spacing", "normal");
      await expect(report.locator("h2")).toHaveCSS("line-height", "41.4px");
      await expect(report.locator("h2")).toHaveCSS("margin", "0px");
      await expect(report.locator("h2")).toHaveCSS("text-transform", "none");
      await expect(report.locator("h2")).toHaveCSS("text-align", "start");
      await expect(report.locator("h3")).toHaveText("Aspect grid");
      expect(await report.locator("h2,h3").allTextContents()).toEqual([`${kind.charAt(0).toUpperCase() + kind.slice(1)} chart`, "Aspect grid"]);
      const geometry = await report.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth, document: document.documentElement.scrollWidth, viewport: innerWidth }));
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1); expect(geometry.document).toBeLessThanOrEqual(geometry.viewport + 1);
      const cells = report.locator(".full-chart__grid td");
      await expect(cells).toHaveCount(100);
      await expect(report.locator(".full-chart__grid-unused")).toHaveCount(["transit", "synastry"].includes(kind) ? 0 : 55);
      const aspect = report.locator(".full-chart__grid button").first();
      await aspect.scrollIntoViewIfNeeded(); await aspect.click();
      await expect(aspect).toHaveAttribute("aria-pressed", "true");
      await expect(report.locator(".full-chart__selection")).toContainText("Orb");
      await expect(report.locator(".full-chart__positions tr[data-highlighted]")).toHaveCount(2);
      await report.getByLabel("Points & angles", { exact: true }).check();
      expect(await report.locator(".full-chart__grid td").count()).toBeGreaterThan(100);
      await report.getByLabel("Show orbs", { exact: true }).uncheck();
      await expect(report.locator(".full-chart__grid button").first().locator("span")).toHaveCount(1);
      await report.getByRole("button", { name: "Download", exact: true }).click();
      await report.getByLabel("Download format", { exact: true }).selectOption("csv");
      await report.getByLabel("Include names and chart date").uncheck();
      await report.getByLabel("Points & angles", { exact: true }).uncheck();
      await expect(report.getByLabel("Download format", { exact: true })).toHaveValue("csv");
      await expect(report.getByLabel("Include names and chart date")).not.toBeChecked();
      await expect(report.getByLabel("Show orbs", { exact: true })).not.toBeChecked();
      await report.getByLabel("Points & angles", { exact: true }).check();
      const pending = page.waitForEvent("download"); await report.getByRole("button", { name: "Download CSV", exact: true }).click();
      const file = await pending; expect(file.suggestedFilename()).toBe(`tldr-astro-${kind}-full.csv`);
      const csv = await readFile((await file.path())!, "utf8"); expect(csv).toContain('"Brand","TLDR Astro"'); expect(csv).toContain('"Orb (degrees)"');
      expect(csv).not.toContain("Fixture Friend"); expect(csv).not.toContain("Test Reader");
      await page.screenshot({ path: info.outputPath(`${kind}-overview.png`) });
      await report.locator(".full-chart__grid-scroll").scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`${kind}-grid.png`) });
      await report.getByRole("button", { name: kind === "sky" ? "Back" : "Close full-screen chart", exact: true }).click();
      await expect(report).toBeHidden();
    }
    expect(errors).toEqual([]);
  });
}

for (const theme of ["light", "dark"]) test(`real downloads render as standalone SVG, PNG and branded PDF ${theme}`, async ({ page }, info) => {
  test.setTimeout(120000);
  await prepareChartReport(page, theme, "Fixture Friend"); await openReport(page, "synastry");
  const report = page.locator(".full-chart");
  const glyphFilters = await report.locator(".full-chart__wheel svg image").evaluateAll(nodes => [...new Set(nodes.map(node => getComputedStyle(node).filter))]);
  await report.getByRole("button", { name: "Download", exact: true }).click();
  await report.getByLabel("Include names and chart date").uncheck();
  await report.getByLabel("Download format", { exact: true }).selectOption("svg");
  await page.route("**/*.woff2", route => route.abort());
  await report.getByRole("button", { name: "Download SVG", exact: true }).click();
  await expect(report.locator(".full-chart__downloads [role=status]")).toHaveText("The download could not be prepared. Please try again.");
  await expect(report.getByRole("button", { name: "Download SVG", exact: true })).toBeEnabled();
  await page.unroute("**/*.woff2");
  for (const format of ["svg", "png", "pdf"]) {
    await report.getByLabel("Download format", { exact: true }).selectOption(format);
    const pending = page.waitForEvent("download"); await report.getByRole("button", { name: `Download ${format.toUpperCase()}`, exact: true }).click();
    const file = await pending; await file.saveAs(info.outputPath(`synastry.${format}`)); const bytes = await readFile((await file.path())!);
    expect(bytes.length).toBeGreaterThan(10000);
    if (format === "svg") {
      const svg = bytes.toString(); expect(svg).toContain("Created with TLDR Astro"); expect(svg).toContain("data:font");
      for (const filter of glyphFilters) expect(svg).toContain(`filter: ${filter}`);
      expect(svg).toContain("text-transform: uppercase");
      expect(svg).not.toContain("Fixture Friend"); expect(svg).not.toContain("Test Reader"); expect(svg).not.toMatch(/(?:href|src)="\//);
      const rendered = await page.evaluate(async text => { const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" })); const image = new Image(); image.src = url; await image.decode(); URL.revokeObjectURL(url); return [image.naturalWidth, image.naturalHeight]; }, svg);
      expect(rendered[0]).toBe(1200); expect(rendered[1]).toBeGreaterThan(1000);
    } else if (format === "png") expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    else { expect(bytes.subarray(0, 8).toString()).toBe("%PDF-1.4"); expect(bytes.toString()).toContain("/Creator (TLDR Astro)"); expect(bytes.toString()).toContain("%%EOF"); }
  }
});

test("saved unknown-time natal chart stays reliable after reload", async ({ page }) => {
  await prepareChartReport(page, "dark", "Fixture Friend", true);
  for (let visit = 0; visit < 2; visit++) {
    await page.goto("/#friends?tab=charts"); await page.getByRole("button", { name: "Open Fixture Friend", exact: true }).click();
    await page.getByRole("tab", { name: "Natal", exact: true }).click();
    await page.getByRole("button", { name: "Open full natal chart", exact: true }).click();
    const report = page.locator(".full-chart"); await expect(report).toBeVisible();
    await report.getByLabel("Points & angles", { exact: true }).check();
    await expect(report.locator(".full-chart__notes")).toContainText("Birth time unknown");
    await expect(report.locator(".full-chart__positions")).not.toContainText("Ascendant");
    await expect(report.locator(".full-chart__positions tbody td:last-child")).toHaveText(Array(await report.locator(".full-chart__positions tbody tr").count()).fill("—"));
    await report.getByRole("button", { name: "Close full-screen chart", exact: true }).click(); await page.reload();
  }
});
