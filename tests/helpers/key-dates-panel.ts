import { expect, type Locator } from '@playwright/test';

export async function expectKeyDatesHeaderCentered(panel: Locator) {
  await expect(panel.locator(':scope > summary')).toBeVisible();
  await expect.poll(() => panel.evaluate(node => {
    const summary = node.querySelector('summary')!;
    const center = (element: Element) => {
      const box = element.getBoundingClientRect();
      return box.top + box.height / 2;
    };
    const controls = summary.querySelectorAll('.key-dates-panel__title, .key-dates-panel__count, .key-dates-panel__chevron');
    const controlsCentered = [...controls].every(element => Math.abs(center(element) - center(summary)) < 1);
    const collapsedCardCentered = node.hasAttribute('open') || Math.abs(center(summary) - center(node)) < 1;
    return controlsCentered && collapsedCardCentered;
  })).toBe(true);
}
