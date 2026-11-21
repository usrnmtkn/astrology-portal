import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Local previews use their built manifest. Deployed-only checks read the target's
// public manifest, so fault injection always follows the actual hashed assets.
export async function studioBuildAsset(source: string): Promise<string> {
  const web = process.env.STUDIO_PRODUCTION_ENTRY === '1';
  const target = process.env.PLAYWRIGHT_BASE_URL;
  let manifest;
  if (target) {
    const response = await fetch(new URL('/.vite/manifest.json', target), { cache: 'no-store', credentials: 'omit' });
    assert.equal(response.ok, true, 'The deployed Studio build manifest must be available');
    assert.match(response.headers.get('content-type') ?? '', /application\/json/iu);
    manifest = await response.json();
  } else {
    manifest = JSON.parse(readFileSync(new URL(`../../apps/${web ? 'web' : 'admin'}/dist/.vite/manifest.json`, import.meta.url), 'utf8'));
  }
  assert.ok(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'The selected Studio manifest must be an object');
  const key = web && source !== 'index.html' ? `../admin/${source}` : source;
  const asset = manifest[key]?.file;
  assert.equal(typeof asset, 'string', `The selected Studio build must contain ${key}`);
  assert.match(asset, /^assets\/[^/]+\.js$/u);
  return `/${asset}`;
}
