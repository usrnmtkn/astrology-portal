import type { BrowserContext } from '@playwright/test';

/** A second same-origin document imports metadata without sending a Studio edit notice. */
export async function publicationStorageEmitter(context: BrowserContext) {
  const emitter = await context.newPage();
  await emitter.route('**/__publication-storage-fixture', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><title>Synthetic publication emitter</title>'
  }));
  await emitter.goto('/__publication-storage-fixture');
  return async (publications: unknown[]) => emitter.evaluate(records => {
    localStorage.setItem('tldrastro:content-publications:v1', JSON.stringify(records));
  }, publications);
}
