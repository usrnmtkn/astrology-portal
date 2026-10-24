import type { Route } from '@playwright/test';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';

/** Reader sources now resolve in the background, including while a source editor is open. */
export async function routeStudioPublicReader(route: Route, url: URL, call: (message: any) => Promise<any>) {
  if (url.pathname === '/api/content-publications') {
    const publications = canonicalPublicationLedger(await call({ method: 'publications' }));
    await route.fulfill({ headers: { etag: await publicationLedgerTag(publications) }, json: { schema: 'tldr-publications/v1', publications } });
  } else if (url.pathname === '/api/content-reader') {
    const result = await call({ method: 'reader', body: route.request().postDataJSON() });
    await route.fulfill({ status: result.status, json: result.payload });
  } else if (url.pathname === '/api/calendar') {
    await route.fulfill({ json: { ok: true, calendar: { days: [] } } });
  } else return false;
  return true;
}
