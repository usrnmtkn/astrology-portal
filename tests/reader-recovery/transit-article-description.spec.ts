import { expect, test, type Page, type Locator } from "@playwright/test";
import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris";
import { natalSkySnapshotCacheKey, skySnapshotCacheKey, VERIFIED_SKY_CACHE_SCHEMA } from "../../apps/web/src/services/verifiedSkyCache";
import type { SkySnapshot } from "../../apps/web/src/types";

const location = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
const birth = new Date("1978-09-01T16:00:00Z");
const friendBirth = new Date("1988-04-03T13:15:00Z");
const dates = ["2026-09-08", "2026-11-27"];
let natal: SkySnapshot;
let friendNatal: SkySnapshot;
let skies: SkySnapshot[];
test.beforeAll(async () => {
  natal = { ...await getAstrodienstSky(location, birth), birthTimeKnown: true };
  friendNatal = { ...await getAstrodienstSky(location, friendBirth), birthTimeKnown: true };
  skies = [];
  for (const date of dates) skies.push(await getAstrodienstSky(location, new Date(`${date}T12:00:00Z`)));
});

async function prepare(page: Page, theme: string, unknownFriendBirthTime = false) {
  // Isolated QA profile and locally calculated ephemerides; never mutate a live account.
  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", route => route.fulfill({ status: 503, json: {} }));
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: {} }));
  await page.route(/^https:\/\/[^/]+\.supabase\.(?:test|co)\//, route => route.fulfill({ json: [] }));
  const records = [
    { cacheKey: natalSkySnapshotCacheKey(location, birth), snapshot: natal },
    ...skies.map((snapshot, index) => ({ cacheKey: skySnapshotCacheKey(location, dates[index]), snapshot }))
  ];
  await page.addInitScript(({ theme, location, records, friendNatal, schema, unknownFriendBirthTime }) => {
    localStorage.setItem("tldrastro:theme", theme);
    localStorage.setItem("tldrastro:selectedLocation", JSON.stringify(location));
    localStorage.setItem("tldrastro:userProfile", JSON.stringify({
      id: "article-facts-qa", name: "Reader QA", email: "reader@example.test", provider: "email",
      sun: "Virgo", moon: "Leo", rising: "Scorpio", currentLocation: location.label, currentLocationData: location,
      charts: [{ id: "article-facts-chart", name: "Reader QA", type: "Birth chart", birthDate: "1978-09-01", birthTime: "12:00 PM", birthCity: location.label, birthLocation: location }]
    }));
    for (const record of records) localStorage.setItem(record.cacheKey, JSON.stringify({ ...record, schema, verifiedAt: new Date().toISOString() }));
    localStorage.setItem("tldrastro:manualCharts:article-facts-qa", JSON.stringify([{
      id: "facts-friend", ownerUserId: "article-facts-qa", chartType: "person", displayName: "Alisa P", firstName: "Alisa",
      relationshipType: "friend", birthDate: "1988-04-03", birthTime: unknownFriendBirthTime ? null : "09:15", birthTimeUnknown: unknownFriendBirthTime,
      birthPlace: location.label, birthLocation: location, natalChart: { ...friendNatal, birthTimeKnown: !unknownFriendBirthTime },
      createdAt: "2026-09-01T12:00:00Z", updatedAt: "2026-09-01T12:00:00Z", syncStatus: "local"
    }]));
  }, { theme, location, records, friendNatal, schema: VERIFIED_SKY_CACHE_SCHEMA, unknownFriendBirthTime });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const ordinal = (house: number) => `${house}${house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th"}`;
function expectedIdentity(title: string, sky: SkySnapshot, natalChart: SkySnapshot, owner = "your") {
  const match = title.match(/^(.+?) (conjunction|conjunct|opposition|opposite|square|trine|sextile) (?:your |Alisa P's )?(.+)$/)!;
  expect(match, `Unrecognized calculated title: ${title}`).toBeTruthy();
  const transit = sky.positions.find(position => position.planet === match[1])!;
  const target = natalChart.positions.find(position => position.planet === match[3])!;
  const aspect = ({ conjunction: "conjunct", opposition: "opposite" } as Record<string, string>)[match[2]] ?? match[2];
  const house = (signs.indexOf(transit.sign) - signs.indexOf(natalChart.ascendant) + 12) % 12 + 1;
  return `${transit.planet} in ${transit.sign} in ${owner} ${ordinal(house)} house is ${aspect} ${owner} natal ${target.planet} in ${target.sign} in ${owner} ${ordinal(target.house)} house.`;
}

async function verifyFooter(page: Page, footer: Locator, theme: string, surface: string) {
  await expect(footer).toBeVisible();
  await expect(footer.locator("h1, h2, h3")).toHaveCount(0);
  expect(await footer.evaluate(element => element.nextElementSibling?.classList.contains("sky-detail-end"))).toBe(true);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await footer.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const styles = await footer.evaluate(element => {
      const paragraph = element.querySelector("p")!;
      const reference = element.parentElement!.querySelector(".article-section p")!;
      const pick = (node: Element) => { const s = getComputedStyle(node); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing]; };
      return { actual: pick(paragraph), reference: pick(reference) };
    });
    expect(styles.actual).toEqual(styles.reference);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/transit-facts/${surface}-${theme}-${width}.png` });
  }
}

for (const theme of ["light", "dark"]) {
  test(`You transit article closes with both placements (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await prepare(page, theme);
    for (const [index, date] of dates.entries()) {
      await page.goto(`/?date=${date}#you`);
      const row = page.locator("button.updates-aspect-row:has(.updates-aspect-row__title)").first();
      await expect(row).toBeVisible({ timeout: 45_000 });
      const title = await row.locator(".updates-aspect-row__title").innerText();
      const expected = expectedIdentity(title, skies[index], natal);
      await expect(row).not.toContainText(expected);
      await expect(page.getByLabel("Transit details", { exact: true })).toHaveCount(0);
      await row.click();
      const footer = page.getByLabel("Transit details", { exact: true });
      await expect(footer).toHaveText(expected);
      await verifyFooter(page, footer, theme, `you-${date}`);
      await page.getByRole("button", { name: "Back to updates", exact: true }).click();
      await expect(footer).toHaveCount(0);
      // The secondary "Behind this forecast" entry opens the same factual identity.
      await page.locator("button.daily-forecast-label").first().click();
      await expect(footer).toContainText(/in your \d+(?:st|nd|rd|th) house is/);
    }
  });

  test(`Friends transit articles use the friend's houses (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await prepare(page, theme);
    await page.goto("/?date=2026-09-08#friends?tab=charts&chart=facts-friend&view=transits");
    const row = page.locator("button.friend-transit-row:has(.updates-aspect-row__orb)").first();
    await expect(row).toBeVisible({ timeout: 45_000 });
    const title = await row.locator(".updates-aspect-row__title").innerText();
    const expected = expectedIdentity(title, skies[0], friendNatal, "Alisa P's");
    await expect(row).not.toContainText(expected);
    await row.click();
    const footer = page.getByLabel("Transit details", { exact: true });
    await expect(footer).toContainText(expected);
    await verifyFooter(page, footer, theme, "friend");
    await page.reload();
    await expect(footer).toContainText(expected);
    await page.getByRole("button", { name: "Close detail", exact: true }).click();
    const bond = page.locator("button.friend-transit-row").filter({ has: page.locator(".friend-bond-transit-activation") }).filter({ hasText: "Jupiter sextile your Pluto" }).first();
    await expect(bond).toBeVisible();
    const bondTitle = await bond.locator(".updates-aspect-row__title").innerText();
    const isReader = bondTitle.includes(" your ");
    await bond.click();
    await expect(footer).toHaveText(expectedIdentity(bondTitle, skies[0], isReader ? natal : friendNatal, isReader ? "your" : "Alisa P's"));
    await verifyFooter(page, footer, theme, "bond");
    const reading = page.locator('.sky-detail-page:has(.article-section__eyebrow)');
    await expect(reading).toBeVisible();
    await expect(reading.locator(".article-section__eyebrow")).toHaveText("What this activates");
    const section = reading.locator(".article-section").filter({ has: page.locator(".article-section__eyebrow") });
    await expect(section.locator("h2")).toContainText(/^Your /);
    await expect(section.locator("p").first()).not.toHaveText(await section.locator("h2").innerText());
    const glyphLabel = await reading.locator(".article-eyebrow").getAttribute("aria-label");
    expect(glyphLabel).toBe("Aspect: Jupiter sextile Pluto");
    await expect(reading.locator(".article-eyebrow__glyphs")).toHaveText("♃✶♇");
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const card = reading.locator(".sky-detail-card");
      const column = reading.locator(".article-body-inner").first();
      const token = await page.evaluate(() => {
        const s = getComputedStyle(document.documentElement);
        return { padding: s.getPropertyValue("--space-9").trim(), width: parseFloat(s.getPropertyValue("--container-prose")) };
      });
      if (width > 720) await expect(card).toHaveCSS("padding-top", token.padding);
      expect((await column.boundingBox())!.width).toBeLessThanOrEqual(token.width);
      const title = await reading.locator("h1").boundingBox();
      const nav = await page.locator(".topbar").boundingBox();
      const back = await reading.locator(".sky-detail-back").boundingBox();
      const eyebrow = await reading.locator(".article-eyebrow").boundingBox();
      expect(eyebrow!.y).toBeGreaterThan(Math.max(nav!.y + nav!.height, back!.y + back!.height));
      expect(title!.y).toBeGreaterThan(eyebrow!.y + eyebrow!.height);
      await expect(reading.locator(".sky-detail-intro-section")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(reading.locator(".sky-detail-intro-section")).toHaveCSS("box-shadow", "none");
      const typography = await section.evaluate(element => {
        const pick = (e: Element) => { const s = getComputedStyle(e); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing]; };
        return { heading: pick(element.querySelector("h2")!), body: pick(element.querySelector("p")!), reference: pick(element.parentElement!.querySelector(".sky-detail-intro-section p")!) };
      });
      expect(typography.body).toEqual(typography.reference);
      expect(typography.heading[0]).toMatch(/Newsreader/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/friends-article-formatting/${theme}-${width}.png`, fullPage: true });
    }
  });
}


test("Unknown birth time keeps the article's signs without inventing houses", async ({ page }) => {
  test.setTimeout(90_000);
  await prepare(page, "light", true);
  await page.goto("/?date=2026-09-08#friends?tab=charts&chart=facts-friend&view=transits");
  const row = page.locator("button.friend-transit-row:has(.updates-aspect-row__orb)").first();
  await expect(row).toBeVisible({ timeout: 45_000 });
  await row.click();
  const footer = page.getByLabel("Transit details", { exact: true });
  await expect(footer).toContainText(/in [A-Z][a-z]+ is .+ Alisa P's natal/);
  await expect(footer).not.toContainText(/house|undefined|null|NaN/);
  await verifyFooter(page, footer, "light", "unknown-time");
});
