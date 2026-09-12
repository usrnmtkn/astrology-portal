import { expect, test } from "@playwright/test";

// Keep this flow in the standard admin smoke run so the actionable queue and its internal navigation cannot drift.
test.describe("Content Studio Needs attention", () => {
  test("shows only actionable required work and keeps actions inside Studio", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("tldrastro:contentAdminSecret", "qa-secret");
    });

    await page.route("**/api/admin/content-coverage", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          generatedAt: "2026-09-06T00:00:00.000Z",
          summary: {
            complete: 5,
            incomplete: 1,
            unresolvedQueue: 1,
            unresolvedIssues: 1,
            unresolvedOptionalQueue: 80,
            unresolvedOptionalIssues: 69,
            unresolvedShadowed: 47,
            unresolvedRetired: 62
          },
          coverage: [
            { id: "healthy", label: "Healthy corpus", missing: 0, state: "complete", detail: "Complete." },
            { id: "missing-corpus", label: "Required corpus", missing: 2, state: "incomplete", detail: "Two required records are missing." }
          ]
        })
      });
    });

    await page.route("**/api/admin/generated-content?**", async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get("status");
      if (status === "LIVE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            nextCursor: null,
            rows: [
              {
                id: "unwired-1",
                content_key: "sky.planetary.jupiter",
                headline: "Jupiter source",
                status: "LIVE",
                lane: "serving",
                review_state: null,
                mode: "article",
                facts: null,
                sections: null,
                source_snapshot: null
              },
              {
                id: "connected-1",
                content_key: "sky.placement.sun.cancer",
                headline: "Sun in Cancer",
                status: "LIVE",
                lane: "serving",
                review_state: null,
                mode: "article",
                facts: null,
                sections: null,
                source_snapshot: null
              }
            ]
          })
        });
        return;
      }
      if (status === "ERROR") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            nextCursor: null,
            rows: [{
              id: "error-1",
              content_key: "article/broken-example",
              headline: "Broken example",
              status: "ERROR",
              lane: "serving",
              review_state: "validation_failed",
              mode: "article"
            }]
          })
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/admin/content/coverage?view=attention", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1, name: "Needs attention" })).toBeVisible();
    await expect(page.getByLabel("Needs attention summary")).toContainText("4");
    await expect(page.getByText("1 required editorial decision", { exact: true })).toBeVisible();
    await expect(page.getByText("Jupiter source", { exact: true })).toBeVisible();
    await expect(page.getByText("Broken example", { exact: true })).toBeVisible();
    await expect(page.getByText("Required corpus", { exact: true })).toBeVisible();
    await expect(page.getByText("69 optional decisions can add rotation or depth later.")).toBeVisible();

    const openContentRow = page.getByRole("link", { name: "Open content row" });
    await expect(openContentRow).toHaveAttribute("href", /\/admin\/content#exact-content/);
    await expect(openContentRow).not.toHaveAttribute("target", "_blank");

    await expect(page.getByRole("link", { name: "Content coverage", exact: true })).toHaveAttribute("href", "/admin/content/coverage");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.locator('.admin-dashboard-header h1')).toHaveCSS('font-size', '22px');
      const sizes = await page.locator('.admin-dashboard').evaluate(root => [...new Set(
        Array.from(root.querySelectorAll<HTMLElement>('*')).filter(element =>
          !element.closest('svg, [aria-hidden="true"]') && element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
          Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && /[A-Za-z0-9]/.test(node.textContent || ''))
        ).map(element => getComputedStyle(element).fontSize)
      )]);
      expect(sizes.every(size => ['12px', '14px', '16px', '22px'].includes(size)), `Coverage at ${width}: ${sizes.join(', ')}`).toBe(true);
    }

  });
});

for (const theme of ['light', 'dark'] as const) for (const width of [1440, 390]) {
  test(`standalone coverage shares Studio components ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:contentAdminSecret', 'qa-secret');
      localStorage.setItem('tldrastro:studio-theme', theme);
    }, theme);
    let empty = false;
    await page.route('**/api/admin/content-coverage', route => route.fulfill({ json: {
      ok: true, generatedAt: '2026-09-11T12:00:00Z', authority: 'Fixture owner', readerEligibility: null,
      summary: { complete: 0, incomplete: empty ? 0 : 1, unresolvedQueue: 0, unresolvedIssues: 0,
        unresolvedOptionalQueue: 0, unresolvedOptionalIssues: 0, unresolvedShadowed: 0, unresolvedRetired: 0 },
      coverage: empty ? [] : [{ id: 'fixture-corpus', label: 'Placement coverage', ready: 10, total: 12, missing: 2, percent: 83,
        state: 'incomplete', detail: 'Two passages need review.', source: 'Fixture inventory',
        authority: { id: 'fixture', ownerAuthority: 'Owner', studioOverlay: 'Reviewed copy', servingSource: 'Package',
          resolver: 'placement', readerDestinations: ['Natal chart'], failurePolicy: 'Show unavailable' } }],
      notes: { friendsIntentionalGap: null, unresolvedReasonCounts: {}, unresolvedWorkload: {}, unresolvedOptionalWorkload: {},
        unresolvedShadowedReasonCounts: {}, unresolvedRetiredReasonCounts: {} }
    }}));
    await page.goto('/admin/content/coverage');
    await expect(page.getByRole('heading', { name: 'Placement coverage' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Content coverage', exact: true })).toHaveCSS('font-size', '22px');
    await expect(page.locator('.studio-surface').first()).toHaveCSS('background-color', theme === 'light' ? 'rgb(250, 253, 250)' : 'rgb(29, 37, 35)');
    await page.getByText('Authority chain', { exact: true }).click();
    await expect(page.getByText('Owner authority: Owner')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toHaveAttribute('data-studio-component', 'button');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `outputs/studio-style/standalone-coverage-${theme}-${width}.png`, fullPage: true });
    empty = true;
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Placement coverage' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Coverage summary' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const view of ['attention', 'coverage']) for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
  test(`coverage access error appears at page top ${view} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:contentAdminSecret', 'qa-secret');
      localStorage.setItem('tldrastro:studio-theme', theme);
    }, theme);
    let attempts = 0;
    await page.route('**/api/admin/content-coverage', route => {
      attempts++;
      return route.fulfill({ status: 503, json: { error: 'Coverage is temporarily unavailable. Try again.' } });
    });
    await page.route('**/api/admin/content-inventory**', route => route.fulfill({ json: { ok: true, rows: [] } }));
    await page.goto(`/admin/content/coverage${view === 'attention' ? '?view=attention' : ''}`);
    const alert = page.getByRole('alert');
    const gate = page.getByRole('region', { name: 'Admin access required' });
    const title = page.getByRole('heading', { level: 1 });
    await expect(alert).toHaveText('Coverage is temporarily unavailable. Try again.');
    await expect(gate).toBeVisible();
    expect(await page.locator('.admin-main > :first-child').getAttribute('role')).toBe('alert');
    const errorBox = (await alert.boundingBox())!;
    expect(errorBox.y + errorBox.height).toBeLessThan((await title.boundingBox())!.y);
    await expect(alert).toHaveCSS('padding', '16px');
    await expect(alert).toHaveCSS('font-size', '16px');
    await expect(gate).toHaveCSS('padding', '24px');
    await expect(gate).toHaveCSS('background-color', theme === 'light' ? 'rgb(250, 253, 250)' : 'rgb(29, 37, 35)');
    const intro = (await gate.locator('.admin-access-gate-intro').boundingBox())!;
    const actions = (await gate.locator('.admin-access-gate-actions').boundingBox())!;
    if (width === 390) expect(actions.y).toBeGreaterThan(intro.y + intro.height);
    else expect(actions.x).toBeGreaterThan(intro.x + intro.width);
    const signIn = gate.getByRole('link', { name: 'Sign in as owner' });
    await expect(signIn).toHaveCSS('min-height', '40px');
    await expect(signIn).toHaveAttribute('href', /returnTo=/);
    await expect(gate.getByLabel('Emergency admin secret')).toHaveAttribute('type', 'password');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `outputs/studio-style/access-error-${view}-${theme}-${width}.png`, fullPage: true });
    const previousAttempts = attempts;
    await gate.getByRole('button', { name: 'Verify emergency access' }).click();
    await expect.poll(() => attempts).toBeGreaterThan(previousAttempts);
    await expect(alert).toBeVisible();
    expect(await page.locator('.admin-main > :first-child').getAttribute('role')).toBe('alert');
  });
}
