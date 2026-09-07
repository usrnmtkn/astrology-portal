import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 768, 1024, 1440]) {
    test(`daily summary ${theme} at ${width}px`, async ({ page }) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.setFixedTime(new Date("2026-09-07T16:00:00Z"));
      await page.addInitScript(theme => {
        localStorage.setItem("tldrastro:theme", theme);
        localStorage.setItem("tldrastro:dyslexiaFont", "false");
        localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({ label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" }));
      }, theme);
      await page.goto("/#sky");
      const summary = page.getByLabel("Daily sky summary");
      await expect(summary).toBeVisible({ timeout: 60_000 });
      await expect(summary).toContainText("The Sun is in Virgo");
      await expect(summary).toContainText("The Sun is in Virgo at 15°, making it easier to notice what needs fixing and what could be made simpler, while the Moon moves through Cancer at 29°, bringing more attention to home, family, and whether the care we give is coming back to us.");
      await expect(summary).not.toContainText("Fix what matters");
      await expect(summary).not.toContainText("Tend what feels like home");
      await expect(summary).toContainText("the Moon moves through");
      await expect(summary).toContainText("The next New Moon arrives in Virgo in 3 days.");
      await expect(summary).toContainText("Four planets are retrograde right now: Saturn, Neptune, Pluto, and Chiron.");
      await expect(summary).toContainText("Four planets are retrograde right now: Saturn, Neptune, Pluto, and Chiron. The Moon is void of course for another 49 minutes. The next New Moon arrives in Virgo in 3 days.");
      await expect(summary).not.toContainText("Full Moons mark a culmination");
      await expect(summary.locator("mark.content-highlight").filter({ hasText: "Four planets are retrograde" })).toHaveText("Four planets are retrograde");
      await expect(summary.locator("strong")).toHaveCount(0);
      const highlight = summary.locator("mark.content-highlight").filter({ hasText: "void of course" });
      await expect(highlight).toHaveText("The Moon is void of course for another 49 minutes.");
      const highlightStyle = await highlight.evaluate(el => {
        const style = getComputedStyle(el);
        const probe = document.createElement("span");
        probe.style.cssText = "font-family:var(--font-highlight);font-size:var(--text-highlight);font-weight:var(--weight-highlight);line-height:var(--leading-highlight);letter-spacing:var(--tracking-highlight)";
        el.append(probe);
        const expected = getComputedStyle(probe);
        const matches = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"].every(key => style[key] === expected[key]);
        probe.remove();
        return { matches, background: style.backgroundImage, font: style.fontFamily, wrapping: style.boxDecorationBreak };
      });
      expect(highlightStyle.matches).toBe(true);
      expect(highlightStyle.font).toContain("Mono");
      expect(highlightStyle.background).toContain("linear-gradient");
      expect(highlightStyle.wrapping).toBe("clone");
      for (const name of ["Sun in Virgo", "Moon in Cancer"]) {
        const link = summary.getByRole("link", { name: `Read about ${name}` });
        await expect(link).toBeVisible();
        expect(await link.evaluate(el => getComputedStyle(el).textDecorationLine)).toContain("underline");
      }
      await expect(summary).not.toContainText(/—|undefined|\{\{/);
      await expect(page.locator(".sky-lunar-pills, .next-lun, .sky-today-ledger__row")).toHaveCount(0);
      await expect(page.getByRole("region", { name: "Retrograde planets", exact: true })).toHaveCount(0);
      await expect(page.locator(".retrograde-section")).toHaveCount(0);
      await expect(page.getByRole("region", { name: "Transits", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: /The sky today|Today, simple/i })).toBeVisible();
      const typography = await summary.evaluate(el => {
        const style = getComputedStyle(el);
        const probe = document.createElement("p");
        probe.style.cssText = "font-family:var(--font-body);font-size:var(--text-body);font-weight:var(--weight-regular);line-height:var(--leading-body);letter-spacing:var(--tracking-body)";
        el.append(probe);
        const expected = getComputedStyle(probe);
        const keys = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"] as const;
        const values = Object.fromEntries(keys.map(key => [key, { actual: style[key], expected: expected[key] }]));
        probe.remove();
        return { values, fits: el.scrollWidth <= el.clientWidth };
      });
      expect(typography.fits).toBe(true);
      for (const value of Object.values(typography.values)) expect(value.actual).toBe(value.expected);
      await page.screenshot({ path: `test-results/sky-summary-${theme}-${width}.png`, fullPage: false });
      for (const name of ["Sun in Virgo", "Moon in Cancer"]) {
        await summary.getByRole("link", { name: `Read about ${name}` }).click();
        await expect(page.getByRole("heading", { name: new RegExp(`^(?:The )?${name}$`) }).first()).toBeVisible({ timeout: 15_000 });
        await page.goto("/#sky");
        await expect(summary).toBeVisible();
      }
      for (const [planet, sign] of [["Saturn", "Aries"], ["Neptune", "Aries"], ["Pluto", "Aquarius"], ["Chiron", "Taurus"]]) {
        const link = summary.getByRole("link", { name: `Read about ${planet} in ${sign}`, exact: true });
        await expect(link).toHaveText(planet);
        await expect(link).toHaveAttribute("href", `#sky/placement/${planet.toLowerCase()}/${sign.toLowerCase()}`);
        expect(await link.evaluate(el => getComputedStyle(el).textDecorationLine)).toContain("underline");
        expect(await link.evaluate(el => getComputedStyle(el).fontWeight)).toBe("600");
        await link.click();
        await expect(page.getByRole("heading", { name: new RegExp(`${planet}.*${sign}`, "i") }).first()).toBeVisible({ timeout: 15_000 });
        await page.goto("/#sky");
        await expect(summary).toBeVisible();
      }
      await summary.getByRole("link", { name: "New Moon", exact: true }).click();
      await expect(page.getByRole("heading", { name: /New Moon in Virgo/i }).first()).toBeVisible({ timeout: 15_000 });
      await page.reload();
      await expect(page.getByRole("heading", { name: /New Moon in Virgo/i }).first()).toBeVisible({ timeout: 60_000 });
      await page.goto("/#sky");
      await expect(page.getByLabel("Daily sky summary")).toBeVisible();
      const chartButton = page.getByRole("button", { name: "Open full current sky chart" });
      if (width <= 720) {
        await chartButton.click();
        await expect(page.getByRole("dialog", { name: "Full sky chart" })).toBeVisible();
      } else {
        await expect(chartButton).toBeHidden();
        await expect(page.getByRole("region", { name: "Current sky", exact: true })).toBeVisible();
      }
      expect(errors).toEqual([]);
    });
  }
}

test("Full Moon summary adds the owner-supplied culmination sentence", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-15T16:00:00Z"));
  await page.goto("/#sky");
  const summary = page.getByLabel("Daily sky summary");
  await expect(summary).toBeVisible({ timeout: 60_000 });
  await expect(summary.getByRole("link", { name: "Full Moon", exact: true })).toBeVisible();
  await expect(summary).toContainText("Full Moons mark a culmination, when something that has been building becomes easier to see.");
  await expect(summary).not.toContainText("The next New Moon");
});

for (const [date, label] of [["2026-08-10T16:00:00Z", "Solar Eclipse"], ["2026-08-25T16:00:00Z", "Lunar Eclipse"]]) {
  test(`upcoming ${label} is named from computed eclipse status`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(date));
    await page.goto("/#sky");
    const summary = page.getByLabel("Daily sky summary");
    await expect(summary).toBeVisible({ timeout: 60_000 });
    await expect(summary.getByRole("link", { name: label, exact: true })).toBeVisible();
    await expect(summary).not.toContainText(/The next (?:New Moon|Full Moon)/);
  });
}

for (const width of [390, 1440]) {
  test(`placements without fuller summaries bold only linked facts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-10-10T16:00:00Z"));
    await page.goto("/#sky");
    const summary = page.getByLabel("Daily sky summary");
    await expect(summary).toBeVisible({ timeout: 60_000 });
    await expect(summary).toContainText(/^The Sun is in Libra at \d+°\. The Moon is moving through \w+ at \d+°\./);
    await expect(summary.locator("strong")).toHaveCount(0);
    expect(await summary.locator("span").first().evaluate(el => getComputedStyle(el).fontWeight)).toBe("400");
    expect(await summary.getByRole("link").first().evaluate(el => getComputedStyle(el).fontWeight)).toBe("600");
    await expect(summary.getByRole("link", { name: "Read about Sun in Libra" })).toBeVisible();
    await expect(page.locator(".retrograde-section")).toHaveCount(0);
    await expect(summary).toContainText("Venus");
    await page.screenshot({ path: `test-results/sky-summary-facts-${width}.png` });
  });
}
