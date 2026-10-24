import type { Page } from '@playwright/test';

// Source-editing regressions follow the same disclosure path as the owner.
// The default visit tab deliberately does not expose reusable composition tools.
export async function openSkyPlacementSourceDetails(page: Page) {
  await page.getByRole('tab', { name: 'Writing setup', exact: true }).click();
  const details = page.getByRole('region', { name: 'Reusable writing setup', exact: true })
    .locator('details').filter({ has: page.getByText('Advanced source details', { exact: true }) });
  if (!await details.evaluate(element => element.hasAttribute('open'))) {
    await details.getByText('Advanced source details', { exact: true }).click();
  }
}

export async function openSkyPlacementDefaultReading(page: Page) {
  await page.getByRole('tab', { name: 'Default reading', exact: true }).click();
}
