import { expect, type Page } from "@playwright/test";
import { expectReadableTheme } from "./theme-contrast";

export async function expectPersonalizedPlacementPresentation(page: Page, width: number) {
  const compact = width <= 800;
  const heading = page.getByRole("heading", { level: 2, name: "Where it lands for you", exact: true });
  const card = page.getByRole("region", { name: "Where it lands for you", exact: true });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("font-size", compact ? "20px" : "22px");
  await expect(heading).toHaveCSS("font-weight", "600");
  await expect(heading).toHaveCSS("font-family", /ui-sans-serif/);
  await expect(heading).toHaveCSS("line-height", compact ? "25px" : "27.5px");
  await expect(heading).toHaveCSS("text-transform", "none");
  await expect(heading).toHaveCSS("margin", "0px");
  await expect(card.locator("h2")).toHaveCount(0);
  await expect(card).toHaveCSS("padding", compact ? "28px 24px 32px" : "40px");
  await expect(card).toHaveCSS("border-radius", compact ? "28px" : "32px");
  const labelBounds = (await heading.boundingBox())!;
  const cardBounds = (await card.boundingBox())!;
  expect(cardBounds.y - labelBounds.y - labelBounds.height).toBe(compact ? 10 : 12);
  await expect(card.getByRole("heading", { name: "Aspects to the natal chart" })).toHaveCount(0);
  await expect(card.locator("h4")).toHaveCount(0);

  const bodyStyles = await card.locator("p, p mark, p a, p strong").evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node);
    return { family: style.fontFamily, size: style.fontSize, line: style.lineHeight, tracking: style.letterSpacing };
  }));
  expect(bodyStyles.length).toBeGreaterThan(0);
  for (const style of bodyStyles) {
    expect(style.family).toMatch(/^Newsreader,/);
    expect(style.size).toBe("19px");
    expect(style.line).toBe("28.5px");
    expect(style.tracking).toBe("normal");
  }

  for (const aspect of await card.locator(".sky-detail-personalized-aspect").all()) {
    const title = aspect.getByRole("heading", { level: 3 });
    const glyph = aspect.locator(".sky-detail-personalized-aspect__glyph");
    await expect(title).toHaveCSS("font-size", compact ? "17px" : "18px");
    await expect(title).toHaveCSS("font-weight", "600");
    await expect(title).toHaveCSS("font-family", /ui-sans-serif/);
    await expect(title).toHaveCSS("line-height", compact ? "22.1px" : "23.4px");
    await expect(title).toHaveCSS("letter-spacing", "normal");
    await expect(title).toHaveCSS("margin", "0px");
    await expect(glyph).toHaveAttribute("aria-hidden", "true");
    await expect(glyph).toHaveCSS("width", compact ? "44px" : "52px");
    await expect(glyph).toHaveCSS("height", compact ? "44px" : "52px");
    await expect(glyph).toHaveCSS("font-size", compact ? "19px" : "23px");
    expect(await glyph.textContent()).toMatch(/^[☌☍□△✶⚻ ]+$/u);
    const bounds = (await title.boundingBox())!;
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(cardBounds.x + cardBounds.width);
  }
  await expectReadableTheme(page, ".sky-detail-personalized__label, #sky-personalized-placement p, #sky-personalized-placement h3", 7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
