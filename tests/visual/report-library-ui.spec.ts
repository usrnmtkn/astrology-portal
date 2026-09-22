import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/content_publications*", route => route.fulfill({ json: [] }));
});

test("Reports route keeps the TLDR navigation and design system across themes and viewports", async ({ browser }) => {
  const bodyBackgrounds = new Map<string, string>();

  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 }
  ] as const) {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      await page.route("**/rest/v1/content_publications*", route => route.fulfill({ json: [] }));

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
      await expect(page.locator(".report-library-header")).toHaveText("Reports");
      await expect(page.locator(".report-library-header > *")).toHaveCount(1);
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

      await page.screenshot({ path: test.info().outputPath(`reports-header-${viewport.name}-${theme}.png`) });
      await context.close();
    }
  }

  expect(bodyBackgrounds.get("desktop-light")).not.toBe(bodyBackgrounds.get("desktop-dark"));
  expect(bodyBackgrounds.get("mobile-light")).not.toBe(bodyBackgrounds.get("mobile-dark"));
});

test("Reports context menu paints above neighboring row dividers and controls", async ({ page }) => {
  await page.goto("/reports/");
  await expect(page.locator(".report-library-list")).toBeVisible();
  await page.evaluate(() => {
    const list = document.querySelector<HTMLElement>(".report-library-list");
    if (!list) throw new Error("Reports list did not mount.");
    list.innerHTML = `
      <article class="report-library-row">
        <button class="report-library-row__open" type="button">
          <span class="report-library-row__icon">A</span><span>First report</span>
        </button>
        <div class="report-library-row__actions">
          <button class="report-library-row__menu-trigger" type="button">...</button>
          <div class="report-library-row__menu" role="menu" aria-label="First report options">
            <button class="report-library-row__menu-item" type="button">Share</button>
            <button class="report-library-row__menu-item" type="button">Stop sharing</button>
            <button class="report-library-row__menu-item" type="button">Archive</button>
          </div>
        </div>
      </article>
      <article class="report-library-row">
        <button class="report-library-row__open" type="button">
          <span class="report-library-row__icon">B</span><span>Second report</span>
        </button>
        <div class="report-library-row__actions">
          <button class="report-library-row__menu-trigger" data-underlay-control type="button">...</button>
        </div>
      </article>`;
  });

  const menu = page.getByRole("menu", { name: "First report options" });
  await expect(menu).toBeVisible();
  const result = await page.evaluate(() => {
    const menuElement = document.querySelector<HTMLElement>('.report-library-row__menu[aria-label="First report options"]');
    const inactiveActions = document.querySelectorAll<HTMLElement>(".report-library-row__actions")[1];
    if (!menuElement || !inactiveActions) throw new Error("Synthetic Reports menu did not mount.");
    const box = menuElement.getBoundingClientRect();
    const probe = document.elementFromPoint(box.right - 12, box.top + Math.min(box.height - 12, box.height * 0.7));
    const menuStyle = getComputedStyle(menuElement);
    return {
      topElementIsMenu: Boolean(probe?.closest(".report-library-row__menu")),
      inactiveActionZIndex: getComputedStyle(inactiveActions).zIndex,
      menuBackground: menuStyle.backgroundColor,
      menuZIndex: menuStyle.zIndex
    };
  });

  expect(result.topElementIsMenu, "neighbor row controls must not paint through the open menu").toBe(true);
  expect(result.inactiveActionZIndex).toBe("auto");
  expect(result.menuZIndex).not.toBe("auto");
  expect(result.menuBackground).not.toBe("rgba(0, 0, 0, 0)");
});

test("a shared Friends reading opens from a compact vanity URL without an owner session", async ({ page }) => {
  const shareKey = "K7m4q9W2xP8vR3tN5cY6Zg";
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

  await page.goto(`/reports/2026-09-06-nikki#s=${shareKey}`);

  await expect(page).toHaveURL(new RegExp(`/reports/2026-09-06-nikki#s=${shareKey}$`));
  await expect(page.getByRole("heading", { level: 1, name: "What's going on with Nikki right now?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  await expect(page.locator(".topbar")).toBeVisible();
  await expect(page.locator(".article-shell")).toBeVisible();
  await expect(page.getByText("The second paragraph stays inside the article page.")).toBeVisible();
  expect(page.url()).not.toContain("/generated/");
  expect(page.url()).not.toContain("?share=");
});

test('a preparing report advances and opens without a reload, preserving state through a transient error', async ({ page }) => {
  const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: "email" }, user_metadata: {}, email: 'progress@example.test' };
  const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
  await page.addInitScript(({ user, storageKey }) => {
    localStorage.setItem(storageKey, JSON.stringify({ access_token: 'fixture-token', refresh_token: 'fixture-refresh', expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer', user }));
  }, { user, storageKey });
  const row = { id: '00000000-0000-4000-8000-000000000002', subject_type: 'you_day_reading', status: 'DRAFT', body: '', headline: 'Daily progress fixture', target_date: '2026-09-11', created_at: '2026-09-11T12:00:00Z', updated_at: '2026-09-11T12:00:00Z', you_report_entitlement_id: 'fixture-entitlement', source_snapshot: { reportProgress: { stage: 'writing' } } };
  let failNext = false;
  await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/**', async route => {
    const table = new URL(route.request().url()).pathname.split('/').pop();
    if (table === 'user_generated_interpretations') {
      if (failNext) { failNext = false; return route.fulfill({ status: 500, json: { message: 'temporary fixture failure' } }); }
      return route.fulfill({ json: route.request().headers().accept?.includes('vnd.pgrst.object') ? row : [row] });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/reports/');
  await expect(page.getByText('Writing', { exact: true })).toBeVisible();
  await page.getByRole('button').filter({ hasText: 'Daily progress fixture' }).click();
  await expect(page.getByRole('status')).toContainText('Writing. This page updates automatically');
  failNext = true;
  row.source_snapshot.reportProgress.stage = 'checking';
  await expect(page.getByRole('status')).toContainText('Checking.', { timeout: 12000 });
  row.body = 'The completed fixture report is now available.';
  await expect(page.getByText(row.body, { exact: true })).toBeVisible();
});
