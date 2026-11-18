import { expect, type Page } from '@playwright/test';

export async function openSkyPlacementChooser(page: Page, keyboard = false) {
  const [section, query] = new URL(page.url()).hash.slice(1).replace(/^\//u, '').split('?');
  if (section === 'sky-writeups') {
    const params = new URLSearchParams(query);
    // Reload restores the saved route after the initial all-placements shell.
    // Wait for that commit before opening a disclosure whose default changes.
    for (const [key, label] of [['planet', 'Sky placement planet or point'], ['sign', 'Sky placement zodiac sign']]) {
      if (params.has(key)) await expect(page.getByLabel(label)).toHaveValue(params.get(key)!);
    }
  }
  const disclosure = page.locator('section[aria-label="Sky write-up filters"]').locator('xpath=ancestor::details[1]');
  if (!await disclosure.evaluate(element => element.hasAttribute('open'))) {
    const summary = disclosure.locator(':scope > summary');
    if (keyboard) await summary.press('Enter');
    else await summary.click();
  }
  await expect(disclosure).toHaveAttribute('open', '');
}

export async function openSkyPlacementReaderSources(page: Page) {
  const summary = page.getByText('Reader preview & source details', { exact: true });
  const disclosure = summary.locator('xpath=ancestor::details[1]');
  if (!await disclosure.evaluate(element => element.hasAttribute('open'))) await summary.press('Enter');
  await expect(disclosure).toHaveAttribute('open', '');
  return page.getByRole('region', { name: 'Sky placement reader sources', exact: true });
}

// Source-editing regressions follow the same disclosure path as the owner.
// The default visit tab deliberately does not expose reusable composition tools.
export async function openSkyPlacementSourceDetails(page: Page) {
  const tab = page.getByRole('tab', { name: 'Templates & sources', exact: true });
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
  // Motion and subsequent placement changes live in their own disclosure.
  // Keep those owner controls available during the source-editing journey.
  await openSkyPlacementChooser(page);
}

export async function openSkyPlacementDefaultReading(page: Page) {
  await page.getByRole('tab', { name: 'Evergreen reading', exact: true }).click();
}
