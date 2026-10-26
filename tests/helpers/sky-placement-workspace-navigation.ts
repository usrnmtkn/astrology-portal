import { expect, type Page } from '@playwright/test';

// Source-editing regressions follow the same disclosure path as the owner.
// The default visit tab deliberately does not expose reusable composition tools.
export async function openSkyPlacementSourceDetails(page: Page) {
  const tab = page.getByRole('tab', { name: 'Writing setup', exact: true });
  await tab.press('Enter');
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  const details = page.getByRole('region', { name: 'Reusable writing setup', exact: true })
    .locator('details').filter({ has: page.getByText('Advanced source details', { exact: true }) });
  if (!await details.evaluate(element => element.hasAttribute('open'))) {
    // Reader status can settle above this disclosure during a pointer click.
    // Native keyboard activation stays on the focused summary as it moves.
    await details.locator(':scope > summary').press('Enter');
  }
  await expect(details).toHaveAttribute('open', '');
}

export async function openSkyPlacementDefaultReading(page: Page) {
  await page.getByRole('tab', { name: 'Default reading', exact: true }).click();
}
