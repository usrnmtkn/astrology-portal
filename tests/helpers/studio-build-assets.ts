import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Resolve fault-injection targets after the selected preview has built. Source
// module identities stay stable when production asset filenames are hashed.
export function studioBuildAsset(source: string): string {
  const web = process.env.STUDIO_PRODUCTION_ENTRY === '1';
  const manifest = JSON.parse(readFileSync(new URL(`../../apps/${web ? 'web' : 'admin'}/dist/.vite/manifest.json`, import.meta.url), 'utf8'));
  const key = web && source !== 'index.html' ? `../admin/${source}` : source;
  const asset = manifest[key]?.file;
  assert.equal(typeof asset, 'string', `The selected Studio build must contain ${key}`);
  assert.match(asset, /^assets\/[^/]+\.js$/u);
  return `/${asset}`;
}
