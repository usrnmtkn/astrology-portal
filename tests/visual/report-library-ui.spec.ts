import { expect, test } from "@playwright/test";

test("standalone Reports route renders with the TLDR design system across themes and viewports", async ({ browser }) => {
  const bodyBackgrounds = new Map<string, string>();

  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 }
  ] as const) {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();

      await page.addInitScript((selectedTheme) => {
        window.localStorage.setItem("tldrastro:theme", selectedTheme);
      }, theme);
      await page.goto("/reports/");

      const heading = page.getByRole("heading", { level: 1, name: "Reports", exact: true });
      const tabs = page.getByRole("tablist", { name: "Report library" });
      const back = page.getByRole("button", { name: "TLDR Astro", exact: true });

      await expect(heading).toBeVisible();
      await expect(tabs).toBeVisible();
      await expect(back).toBeVisible();
      await expect(page.locator(".report-route-root")).toHaveClass(new RegExp(`theme-${theme}`));

      const computed = await page.evaluate(() => {
        const headingElement = document.querySelector<HTMLElement>("#report-library-title");
        const pageElement = document.querySelector<HTMLElement>(".report-library-page");
        const tabsElement = document.querySelector<HTMLElement>(".report-library-tabs");
        const backElement = document.querySelector<HTMLElement>(".report-library-back");
        if (!headingElement || !pageElement || !tabsElement || !backElement) throw new Error("Reports UI did not mount.");

        const headingStyle = getComputedStyle(headingElement);
        const pageStyle = getComputedStyle(pageElement);
        const tabsStyle = getComputedStyle(tabsElement);
        const backStyle = getComputedStyle(backElement);
        const bodyStyle = getComputedStyle(document.body);

        return {
          htmlTheme: document.documentElement.dataset.theme,
          headingFontFamily: headingStyle.fontFamily,
          headingFontWeight: headingStyle.fontWeight,
          pageDisplay: pageStyle.display,
          tabsDisplay: tabsStyle.display,
          backBorderRadius: backStyle.borderRadius,
          bodyBackgroundImage: bodyStyle.backgroundImage,
          bodyBackgroundColor: bodyStyle.backgroundColor,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
        };
      });

      expect(computed.htmlTheme, `${viewport.name} ${theme}: saved theme reaches the standalone route`).toBe(theme);
      expect(computed.headingFontFamily, `${viewport.name} ${theme}: page title uses TLDR Newsreader`).toContain("Newsreader");
      expect(computed.headingFontWeight, `${viewport.name} ${theme}: page title is not browser-default bold`).not.toBe("700");
      expect(computed.pageDisplay, `${viewport.name} ${theme}: route CSS is attached`).toBe("grid");
      expect(computed.tabsDisplay, `${viewport.name} ${theme}: shared segmented control is styled`).toBe("flex");
      expect(computed.backBorderRadius, `${viewport.name} ${theme}: shared back control is not browser-default`).not.toBe("0px");
      expect(computed.bodyBackgroundImage, `${viewport.name} ${theme}: TLDR background treatment is present`).not.toBe("none");
      expect(computed.horizontalOverflow, `${viewport.name} ${theme}: Reports does not overflow horizontally`).toBe(false);
      bodyBackgrounds.set(`${viewport.name}-${theme}`, computed.bodyBackgroundColor);

      await context.close();
    }
  }

  expect(bodyBackgrounds.get("desktop-light")).not.toBe(bodyBackgrounds.get("desktop-dark"));
  expect(bodyBackgrounds.get("mobile-light")).not.toBe(bodyBackgrounds.get("mobile-dark"));
});
