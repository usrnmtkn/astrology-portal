import { expect, type Locator } from "@playwright/test";

/** Assert the rendered gap, not just the source declaration, on both builds and production. */
export async function expectEffortCardSpacing(card: Locator) {
  await card.page().evaluate(() => document.fonts.ready);
  const copy = card.locator(".sky-today-ledger__copy");
  await expect(copy).toHaveCSS("padding-top", "0px");
  await expect(copy.locator("p").first()).toHaveCSS("margin-top", "0px");
  const layout = await card.evaluate(el => {
    const header = el.querySelector<HTMLElement>(".sky-today-ledger__head")!;
    const heading = header.querySelector<HTMLElement>("h3")!;
    const body = el.querySelector<HTMLElement>(".sky-today-ledger__copy")!;
    const paragraphs = body.querySelectorAll<HTMLElement>(":scope > p");
    const headerStyle = getComputedStyle(header);
    const bodyStyle = getComputedStyle(body);
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;width:var(--space-4);height:var(--space-5);font-family:var(--font-body);font-size:var(--text-body);font-weight:var(--weight-regular);line-height:var(--leading-body);letter-spacing:var(--tracking-body)";
    body.append(probe);
    const expected = getComputedStyle(probe);
    const paragraphStyle = getComputedStyle(paragraphs[0]);
    const metrics = {
      headingGap: paragraphs[0].getBoundingClientRect().top - heading.getBoundingClientRect().bottom,
      headerBottomPadding: parseFloat(headerStyle.paddingBottom),
      sidePadding: [bodyStyle.paddingLeft, bodyStyle.paddingRight, headerStyle.paddingLeft, headerStyle.paddingRight],
      bottomPadding: bodyStyle.paddingBottom,
      expectedInset: expected.height,
      paragraphGap: paragraphs[1].getBoundingClientRect().top - paragraphs[0].getBoundingClientRect().bottom,
      expectedParagraphGap: parseFloat(expected.width),
      bodyTypography: ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"].every(key => paragraphStyle[key as any] === expected[key as any]),
    };
    probe.remove();
    return metrics;
  });
  expect(layout.headerBottomPadding).toBeGreaterThan(0);
  expect(layout.headingGap).toBeCloseTo(layout.headerBottomPadding, 1);
  expect(layout.sidePadding).toEqual(Array(4).fill(layout.expectedInset));
  expect(layout.bottomPadding).toBe(layout.expectedInset);
  expect(layout.paragraphGap).toBeCloseTo(layout.expectedParagraphGap, 1);
  expect(layout.bodyTypography).toBe(true);
  return layout;
}
