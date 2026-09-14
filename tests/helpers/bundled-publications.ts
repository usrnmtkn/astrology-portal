import type { Page } from '@playwright/test';

/** These typography/calculation fixtures select the bundled corpus. Resolve an
 * explicitly empty remote plane; DNS failure is not proof of no publication. */
export async function bundledPublications(page: Page) {
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
    schema: 'content-studio-last-known-good-v1', rowCount: 0, rows: [], publications: []
  } }));
}
