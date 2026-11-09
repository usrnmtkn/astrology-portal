import type { Page } from '@playwright/test';
import { readerResponse } from './reader-response';
import { publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';

const emptyPublicationTag = publicationLedgerTag([]);

const emptySnapshot = {
  schema: 'content-studio-last-known-good-v2',
  rowCount: 0,
  rows: [],
  publications: []
};

/** Fixture overlays must not inherit production publication identities from the nightly snapshot. */
export async function emptyLastKnownGoodSnapshot(page: Page) {
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: emptySnapshot }));
}

/** These typography/calculation fixtures select the bundled corpus. Resolve an
 * explicitly empty remote plane; DNS failure is not proof of no publication. */
export async function bundledPublications(page: Page) {
  // A deployed initial reader carries its own live publication ledger. These
  // bundled-source fixtures use the normal calculated fallback instead.
  await page.route('**/api/sky-reader?**', route => route.fulfill({
    status: 503, json: { error: 'Bundled fixture uses the calculation fallback.' }
  }));
  await page.route(/\/api\/content-publications(?:\?|$)/, async route => route.fulfill({
    headers: { etag: await emptyPublicationTag },
    json: {
      schema: new URL(route.request().url()).searchParams.get('scope') === 'sky-list'
        ? 'tldr-sky-list-publications/v1' : 'tldr-publications/v1',
      publications: []
    }
  }));
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([]) }));
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await emptyLastKnownGoodSnapshot(page);
}
