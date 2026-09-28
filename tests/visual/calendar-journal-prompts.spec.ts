import { expect, test } from "@playwright/test";
import { bundledPublications } from "../helpers/bundled-publications";
import { watchBrowserErrors } from "./qaRuntimeGuards";

for (const theme of ["light", "dark"] as const) for (const width of [390, 1440]) {
  test(`New Moon and season prompts open the journal and mood check-in ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(90_000);
    const assertNoErrors = watchBrowserErrors(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-10-10T16:00:00Z"));
    await bundledPublications(page);
    await page.addInitScript(({ theme }) => {
      localStorage.setItem("tldrastro:theme", theme);
      // An old preference must not leave an explicitly opened prompt inert.
      localStorage.setItem("tldrastro:journalPrompts", "false");
      localStorage.setItem("tldrastro:selectedLocation", JSON.stringify({
        label: "New York City, NY", latitude: 40.7128, longitude: -74.006,
        timeZone: "America/New_York"
      }));
    }, { theme });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#calendar?view=day&date=2026-10-10");

    for (const source of ["New Moon", "season"] as const) {
      if (source === "New Moon") {
        await page.getByRole("button", { name: "New Moon in Libra", exact: true }).click();
      } else {
        await page.locator(width < 720 ? ".calendar-season-pill" : ".calendar-header-season").click();
      }
      const reading = page.getByRole("dialog", { name: "Event detail", exact: true });
      const promptCard = reading.getByRole("button", { name: "Write about this", exact: true }).first();
      await expect(promptCard).toBeVisible();
      const prompt = promptCard.locator(".calendar-reading__prompt-text");
      const promptText = await prompt.innerText();
      expect(promptText.length).toBeGreaterThan(10);
      await expect(promptCard).toHaveAccessibleDescription(promptText);
      expect(await promptCard.locator("button, a, input").count()).toBe(0);
      expect((await promptCard.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const typography = await reading.evaluate(panel => {
        const properties = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign"] as const;
        return [".calendar-reading__prompt-text", ".calendar-reading__body p"].map(selector => {
          const style = getComputedStyle(panel.querySelector(selector)!);
          return properties.map(property => style[property]);
        });
      });
      expect(typography[0]).toEqual(typography[1]);
      if (source === "New Moon") {
        // Tapping the words themselves, not just the small action label, opens it.
        await prompt.click();
      } else {
        await promptCard.focus();
        await page.keyboard.press("Enter");
      }
      const checkIn = page.getByRole("dialog", { name: "Check-in", exact: true });
      await expect(reading).toHaveCount(0);
      await expect(checkIn.getByRole("heading", { name: promptText, exact: true })).toBeVisible();
      await expect(checkIn.locator(".calendar-slideout__date")).toContainText("October 10");
      await expect(checkIn.locator("textarea")).toBeEditable();
      await checkIn.locator("textarea").fill(`A ${source} reflection.`);
      for (let step = 0; step < 4; step++) await checkIn.getByRole("button", { name: "Back", exact: true }).click();
      await expect(checkIn.getByRole("heading", { name: "How are you feeling?", exact: true })).toBeVisible();
      for (let step = 0; step < 4; step++) await checkIn.getByRole("button", { name: "Next", exact: true }).click();
      await expect(checkIn.locator("textarea")).toHaveValue(`A ${source} reflection.`);
      await checkIn.getByRole("button", { name: "Close", exact: true }).click();
      await expect(checkIn).toHaveCount(0);
      await expect(page).toHaveURL(/date=2026-10-10$/u);
    }
    assertNoErrors();
  });
}
