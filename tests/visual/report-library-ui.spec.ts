import { expect, test } from "@playwright/test";

test("Reports route keeps the TLDR navigation and design system across themes and viewports", async ({ browser }) => {
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
      const topbar = page.locator(".topbar");
      const navPill = page.locator(".nav-pill");
      const primaryNavigation = page.getByRole("navigation", { name: "Primary navigation" });
      const menuToggle = page.getByRole("button", { name: "Open menu" });

      await expect(heading).toBeVisible();
      await expect(tabs).toBeVisible();
      await expect(topbar).toBeVisible();
      await expect(navPill).toBeVisible();
      await expect(menuToggle).toBeVisible();
      await expect(page.locator(".report-route-root")).toHaveClass(new RegExp(`theme-${theme}`));

      if (viewport.name === "desktop") {
        await expect(primaryNavigation).toBeVisible();
        await expect(primaryNavigation.getByRole("button", { name: "Sky" })).toBeVisible();
        await expect(primaryNavigation.getByRole("button", { name: "Calendar" })).toBeVisible();
        await expect(primaryNavigation.getByRole("button", { name: "You" })).toBeVisible();
        await expect(primaryNavigation.getByRole("button", { name: "Friends" })).toBeVisible();
      } else {
        await expect(primaryNavigation).toBeHidden();
      }

      await menuToggle.click();
      const siteMenu = page.getByRole("menu", { name: "Site menu" });
      await expect(siteMenu).toBeVisible();
      await expect(siteMenu.getByRole("menuitem", { name: "Reports" })).toBeVisible();
      await page.getByRole("button", { name: "Close menu" }).click();

      const computed = await page.evaluate(() => {
        const headingElement = document.querySelector<HTMLElement>("#report-library-title");
        const pageElement = document.querySelector<HTMLElement>(".report-library-page");
        const tabsElement = document.querySelector<HTMLElement>(".report-library-tabs");
        const navElement = document.querySelector<HTMLElement>(".nav-pill");
        if (!headingElement || !pageElement || !tabsElement || !navElement) throw new Error("Reports UI did not mount.");

        const headingStyle = getComputedStyle(headingElement);
        const pageStyle = getComputedStyle(pageElement);
        const tabsStyle = getComputedStyle(tabsElement);
        const navStyle = getComputedStyle(navElement);
        const bodyStyle = getComputedStyle(document.body);
        const topbarBox = document.querySelector<HTMLElement>(".topbar")?.getBoundingClientRect();
        const headingBox = headingElement.getBoundingClientRect();

        return {
          htmlTheme: document.documentElement.dataset.theme,
          headingFontFamily: headingStyle.fontFamily,
          headingFontWeight: headingStyle.fontWeight,
          pageDisplay: pageStyle.display,
          tabsDisplay: tabsStyle.display,
          navBorderRadius: navStyle.borderRadius,
          bodyBackgroundImage: bodyStyle.backgroundImage,
          bodyBackgroundColor: bodyStyle.backgroundColor,
          headingClearsTopbar: !topbarBox || headingBox.top > topbarBox.bottom,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
        };
      });

      expect(computed.htmlTheme, `${viewport.name} ${theme}: saved theme reaches the Reports route`).toBe(theme);
      expect(computed.headingFontFamily, `${viewport.name} ${theme}: page title uses TLDR Newsreader`).toContain("Newsreader");
      expect(computed.headingFontWeight, `${viewport.name} ${theme}: page title is not browser-default bold`).not.toBe("700");
      expect(computed.pageDisplay, `${viewport.name} ${theme}: route CSS is attached`).toBe("grid");
      expect(["grid", "inline-grid"], `${viewport.name} ${theme}: shared segmented control is styled`).toContain(computed.tabsDisplay);
      expect(computed.navBorderRadius, `${viewport.name} ${theme}: the TLDR navigation pill is styled`).not.toBe("0px");
      expect(computed.bodyBackgroundImage, `${viewport.name} ${theme}: TLDR background treatment is present`).not.toBe("none");
      expect(computed.headingClearsTopbar, `${viewport.name} ${theme}: Reports content clears the fixed main navigation`).toBe(true);
      expect(computed.horizontalOverflow, `${viewport.name} ${theme}: Reports does not overflow horizontally`).toBe(false);
      bodyBackgrounds.set(`${viewport.name}-${theme}`, computed.bodyBackgroundColor);

      await context.close();
    }
  }

  expect(bodyBackgrounds.get("desktop-light")).not.toBe(bodyBackgrounds.get("desktop-dark"));
  expect(bodyBackgrounds.get("mobile-light")).not.toBe(bodyBackgrounds.get("mobile-dark"));
});

test("a shared Friends reading opens from a vanity URL without an owner session", async ({ page }) => {
  const shareKey = "11111111-1111-4111-8111-111111111111";
  await page.route(`**/api/report-share?share=${shareKey}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sourceKind: "generated_interpretation",
        reportKind: "friend_transit_reading",
        report: {
          id: "a0ab8f1a-5ea0-4f96-bab6-40b914b449d5",
          subjectType: "friend_transit_reading",
          subjectId: "66d2d042-f3e8-4cb4-8fb6-4262e42461ae",
          subjectLabel: "Nikki",
          contentKey: "friend-transit-reading/66d2d042-f3e8-4cb4-8fb6-4262e42461ae/2026-09-06",
          status: "DRAFT",
          eventType: "friend_transit_reading",
          targetDate: "2026-09-06",
          headline: "What's going on with Nikki right now?",
          summary: "A concise saved reading for Nikki.",
          body: "The first paragraph of the shared reading.\n\nThe second paragraph stays inside the article page.",
          createdAt: "2026-09-07T01:04:58.197Z",
          updatedAt: "2026-09-07T01:04:58.197Z"
        }
      })
    });
  });

  await page.goto(`/reports/2026-09-06-nikki#share=${shareKey}`);

  await expect(page).toHaveURL(new RegExp(`/reports/2026-09-06-nikki#share=${shareKey}$`));
  await expect(page.getByRole("heading", { level: 1, name: "What's going on with Nikki right now?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  await expect(page.locator(".topbar")).toBeVisible();
  await expect(page.locator(".article-shell")).toBeVisible();
  await expect(page.getByText("The second paragraph stays inside the article page.")).toBeVisible();
  expect(page.url()).not.toContain("/generated/");
  expect(page.url()).not.toContain("?share=");
});
