import { expect, test, type Page } from "../helpers/polish-test";
import { expectKeyDatesHeaderCentered } from '../helpers/key-dates-panel';
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";
import { natalSkySnapshotCacheKey, VERIFIED_SKY_CACHE_SCHEMA } from "../../apps/web/src/services/verifiedSkyCache";
import { bundledPublications } from "../helpers/bundled-publications";

const location = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
const birth = new Date("1990-01-01T17:00:00Z");
function sectionPresentation(node: Element) {
  const s = getComputedStyle(node);
  return [node.tagName, node.getAttribute("role"), s.fontFamily, s.fontSize, s.fontWeight,
    s.lineHeight, s.letterSpacing, s.marginTop, s.marginRight, s.marginBottom, s.marginLeft,
    s.textTransform, s.textAlign];
}

async function verifySectionLabels(page: Page) {
  const labels=await page.locator('.you-transit-group:not(.lunation-transit) > .you-transit-group__header h2').allTextContents();
  expect(labels).toEqual(labels.includes('Short-term transits') ? ['Short-term transits','Long-term transits','Planets moving through your houses'] : ['Long-term transits','Planets moving through your houses']);
  const longTerm=await page.getByRole('heading',{name:'Long-term transits',exact:true}).evaluate(sectionPresentation);
  expect(longTerm).toEqual(await page.getByRole('heading',{name:'Planets moving through your houses',exact:true}).evaluate(sectionPresentation));
  expect(longTerm.slice(0,2)).toEqual(['H2',null]);
}

async function seed(page: Page, theme: string) {
  const natal = await getAstrodienstSky(location, birth, { includeDailyEvents: false, includeTransitWindows: false });
  await bundledPublications(page);
  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", route => route.fulfill({ status: 503, body: "Synthetic QA uses local Swiss calculations" }));
  await page.route("**/api/calendar?**", route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  await page.addInitScript(({ location, natal, cacheKey, schema, theme }) => {
    localStorage.setItem("tldrastro:theme", theme);
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
    localStorage.setItem("tldrastro:userProfile", JSON.stringify({
      id: "qa-daily-peaks", name: "Aspect QA", email: "aspect-qa@example.com", provider: "email",
      sun: "Capricorn", moon: "Pisces", rising: natal.ascendant,
      currentLocation: location.label, currentLocationData: location,
      charts: [{ id: "qa-aspects", name: "Aspect QA", type: "Birth chart", birthDate: "1990-01-01", birthTime: "12:00 PM", birthCity: location.label, birthLocation: location }]
    }));
    localStorage.setItem(cacheKey, JSON.stringify({ schema, cacheKey, snapshot: natal, verifiedAt: new Date().toISOString() }));
  }, { location, natal, cacheKey: natalSkySnapshotCacheKey(location, birth), schema: VERIFIED_SKY_CACHE_SCHEMA, theme });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

for (const [width, theme] of [[1440, "light"], [1440, "dark"], [390, "light"], [390, "dark"]] as const) {
  test(`daily peaks, long-term context and complete detail ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await seed(page, theme);
    await page.goto("/?date=2026-10-09#you");
    const daily = page.getByLabel("Areas of your life", { exact: true });
    const ongoing = page.getByLabel("Long-term transits", { exact: true });
    await expect(daily.locator(".updates-aspect-row")).toHaveCount(4, { timeout: 60_000 });
    await expect(daily.locator(".updates-aspect-row__meta-line")).toHaveText([
      /^Exact \d+:\d{2} [AP]M EDT · (?:\d+° \d{2}′|<1′)$/, /^Exact \d+:\d{2} [AP]M EDT · (?:\d+° \d{2}′|<1′)$/, /^Exact \d+:\d{2} [AP]M EDT · (?:\d+° \d{2}′|<1′)$/, /^Exact \d+:\d{2} [AP]M EDT · (?:\d+° \d{2}′|<1′)$/
    ]);
    await expect(daily).toHaveCSS('gap', '24px');
    await expect(daily.locator(".updates-aspect-row__orb").first()).toHaveText(/\d+° \d{2}′|<1′/);
    await expect(ongoing.locator(".updates-aspect-row:is(a,button)").first()).toBeVisible({ timeout: 60_000 });
    await expect(ongoing).not.toContainText("Current contact:");
    await expect(ongoing.locator(".updates-aspect-row__meta-line").first()).toContainText(/ – .* · /);
    const titlePattern = /^.+ in (?:Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces) (?:conjunct|opposite|square|trine|sextile) your natal .+$/;
    for (const row of await daily.locator(".personal-transit-card").all()) expect(await row.getAttribute("data-aspect-name")).toMatch(titlePattern);
    for (const row of await ongoing.locator(".personal-transit-card").all()) expect(await row.getAttribute("data-aspect-name")).toMatch(titlePattern);
    await expect(page.locator('.you-transit-group:not(.lunation-transit) > .you-transit-group__header h2').first()).toHaveCSS('font-size', '28px');
    for (const card of await page.locator('.personal-transit-card').all()) {
      const aspectName = (await card.getAttribute('data-aspect-name'))!;
      const heading = card.getByRole('heading', {level: 3, includeHidden: true});
      await expect(heading).toHaveCount(1);
      await expect(heading).toHaveCSS('font-family', /Newsreader/);
      await expect(heading).toHaveCSS('font-size', '30px');
      await expect(heading).toHaveCSS('line-height', '34.5px');
      await expect(heading).toHaveCSS('font-weight', '400');
      await expect(heading).toHaveCSS('text-wrap', 'balance');
      await expect(card).toHaveCSS('border-radius', '36px');
      await expect(card).toHaveCSS('padding', '36px 32px');
      await expect(card).toHaveCSS('gap', '12px');
      await expect(card.locator('.updates-aspect-row__headline, .updates-aspect-row__identity')).toHaveCount(0);
      await expect(card.locator('.personal-transit-card__aspect-name')).toHaveCount(await heading.textContent() === aspectName ? 0 : 1);
      if (await heading.textContent() !== aspectName) await expect(card.locator('.personal-transit-card__aspect-name')).toHaveText(aspectName);
      const timeline = card.locator('.updates-aspect-row__meta-line');
      await expect(timeline).toHaveCSS('font-size', '16px');
      await expect(timeline.locator(':scope > :last-child')).toHaveClass('updates-aspect-row__orb');
      await expect(card.locator('.personal-transit-icon')).toHaveCSS('width', '88px');
      await expect(card.locator('.personal-transit-icon > svg')).toHaveCSS('width', '34px');
      await expect(card.locator('.personal-transit-icon > svg')).toHaveAttribute('stroke-width', '1.6');
      await expect(card.locator('.personal-transit-icon__planet')).toHaveCSS('width', '30px');
      await expect(card.locator('.personal-transit-icon__planet > span')).toHaveCSS('color', 'rgb(255, 255, 255)');
      if (await card.locator('.transit-card-preview').count()) {
        await expect(card.locator('.transit-card-preview')).toHaveCSS('-webkit-line-clamp', '3');
        await expect(card.locator('.transit-card-preview')).toHaveCSS('font-size', '19px');
        await expect(card.locator('.transit-card-preview')).toHaveCSS('line-height', '28.5px');
      }
      if (await card.getAttribute('href')) {
        await expect(card.locator('a, button')).toHaveCount(0);
        await expect(card.locator('.card-read-more')).toHaveCSS('width', '56px');
        await expect(card.locator('.card-read-more')).toHaveCSS('background-color', 'rgb(238, 241, 245)');
        await expect(card.locator('.card-read-more')).toHaveCSS('color', 'rgb(28, 31, 38)');
      }
    }
    const row = daily.locator(".updates-aspect-row:is(a,button)").filter({ hasText: "Moon in Libra square your natal Jupiter" });
    await expect(row).toBeAttached({ timeout: 60_000 });
    const expand=page.getByRole('region',{name:'Short-term transits',exact:true}).getByRole('button',{name:/See all/});
    if(await expand.count())await expand.click();
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/daily-peaks-${width}-${theme}.png`, fullPage: false });
    const titleColor = await row.locator('.updates-aspect-row__title').evaluate(node => getComputedStyle(node).color);
    await row.hover();
    await expect(row.locator('.updates-aspect-row__title')).toHaveCSS('color', titleColor);
    const readingHref = (await row.getAttribute("href"))!;
    const description = await row.locator(".transit-card-preview").innerText();
    await row.click();
    const article = page.locator(".you-transit-article");
    await expect(article.getByRole("heading", { level: 1 })).toHaveText("Moon in Libra square your natal Jupiter");
    await expect(article.locator(".personal-transit-icon")).toHaveAttribute("data-aspect", "square");
    await expect(article.locator(".personal-transit-icon__planet")).toHaveText("☽");
    const keyDates = article.locator('.key-dates-panel');
    await expect(keyDates).toHaveAttribute('open','');
    await expectKeyDatesHeaderCentered(keyDates);
    await keyDates.locator('summary').focus();await page.keyboard.press('Space');
    await expect(keyDates).not.toHaveAttribute('open','');
    await page.keyboard.press('Enter');
    await expect(keyDates).toHaveAttribute('open','');
    await expectKeyDatesHeaderCentered(keyDates);
    await expect(keyDates.locator('.article-key-dates__label')).toContainText(['Current contact','Exact · Pass 1','Full transit series']);
    await expect(keyDates.locator('.key-dates-panel__count')).toHaveText('3');
    await expect(article).toContainText("Current contact");
    await expect(article).toContainText("Full transit series");
    await expect(article).toContainText("Pass 1");
    await expect(article).toContainText(description.replace(/\.\.\.$/, "").slice(0, 75));
    const paragraphs = await article.locator(".article-section p").allTextContents();
    expect(paragraphs.length).toBeGreaterThan(0);
    expect(paragraphs.at(-1)?.length).toBeGreaterThan(20);
    await page.reload();
    await expect(daily.locator(".updates-aspect-row")).toHaveCount(4, { timeout: 60_000 });
    await page.goto("/?date=2026-10-10#you");
    await expect(daily.locator(".updates-aspect-row__meta-line").first()).toContainText(/^Exact \d+:\d{2} [AP]M EDT · /, { timeout: 60_000 });
    await expect(daily.locator(".updates-aspect-row__meta-line")).not.toContainText(["Exact Oct 9, 2026"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    // The new label uses the same established section role as House transits.
    await verifySectionLabels(page);
    await page.goto(readingHref);
    await expect(page.locator('.you-transit-article h1')).toHaveText('Moon in Libra square your natal Jupiter', {timeout: 60_000});
    await page.reload();
    await expect(page.locator('.you-transit-article h1')).toHaveText('Moon in Libra square your natal Jupiter', {timeout: 60_000});
    await page.getByRole('button', {name: 'Back to updates', exact: true}).click();
    await expect(daily.locator('.personal-transit-card')).toHaveCount(4);
    await page.reload();
    await expect(daily.locator('.personal-transit-card')).toHaveCount(4, {timeout: 60_000});
  });
}

test("daily timing failure remains distinct from an empty day and retries", async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page, "light");
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let rejected = false;
    window.Worker = class extends NativeWorker {
      postMessage(message: any, options?: any) {
        if (message.kind === "natal-daily-peaks" && !rejected) {
          rejected = true;
          setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: { id: message.id, ok: false, error: "Synthetic timing failure" } })), 500);
          return;
        }
        super.postMessage(message, options);
      }
    };
  });
  await page.goto("/?date=2026-10-09#you");
  const failure = page.getByLabel("Daily aspects unavailable");
  await expect(failure).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/No daily aspect highlights/)).toHaveCount(0);
  await failure.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByLabel("Areas of your life", { exact: true }).locator(".updates-aspect-row")).toHaveCount(4, { timeout: 60_000 });
  await expect(failure).toHaveCount(0);
});

test("empty daily selection retains longer-term contacts", async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page, "dark");
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: any, options?: any) {
        if (message.kind === "natal-daily-peaks") {
          setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: { id: message.id, ok: true, value: [] } })), 100);
          return;
        }
        super.postMessage(message, options);
      }
    };
  });
  await page.goto("/?date=2026-10-09#you");
  await expect(page.getByText(/No daily aspect highlights for/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel("Long-term transits", { exact: true }).locator(".updates-aspect-row")).toHaveCount(4);
  await expect(page.getByLabel("Transit setup", { exact: true })).toHaveCount(0);
  await verifySectionLabels(page);
});
