import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const theme = await readFile('apps/admin/src/admin-theme.css', 'utf8');
const studio = await readFile('apps/admin/src/studio-system.css', 'utf8');

const expected = new Map([
  ['--studio-layer-memory-canvas', '0'],
  ['--studio-layer-page-header', '4'],
  ['--studio-layer-memory-panel', '6'],
  ['--studio-layer-create-backdrop', '50'],
  ['--studio-layer-create-menu', '51'],
  ['--studio-layer-editor-backdrop', '70'],
  ['--studio-layer-editor-panel', '71'],
  ['--studio-layer-variables-rail', '73'],
  ['--studio-layer-help-popover', '75'],
  ['--studio-layer-source-repair-backdrop', '80'],
  ['--studio-layer-toast', '90'],
]);

for (const [token, value] of expected) {
  assert.match(
    theme,
    new RegExp(`${token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*:\\s*${value}\\s*;`),
    `${token} must preserve layer ${value}`,
  );
  assert.match(studio, new RegExp(`z-index:\\s*var\\(${token}\\)`), `${token} must be consumed by Studio CSS`);
}

assert.doesNotMatch(studio, /z-index\s*:\s*-?\d+(?:\.\d+)?\s*;/, 'Studio CSS must not contain raw numeric z-index values');

const usedTokens = [...studio.matchAll(/z-index\s*:\s*var\((--studio-layer-[^)]+)\)/g)].map(match => match[1]);
assert.deepEqual(new Set(usedTokens), new Set(expected.keys()), 'Studio z-index declarations must use the approved layer token set');

console.log(`Studio layer tokens passed: ${expected.size} named layers preserve the approved numeric order in admin-theme.css.`);
