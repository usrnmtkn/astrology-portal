import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { weeklyHoroscopeTagItems } from '../apps/web/src/utils/weeklyFocusTags.ts';
import { createServer } from 'vite';
const vite = await createServer({configFile: false, root: 'apps/web', server: {middlewareMode: true, hmr: { port: 0 }}, logLevel: 'error'});
try {
const { ArticlePills } = await vite.ssrLoadModule('/src/components/ArticlePills.tsx');

const tags = weeklyHoroscopeTagItems(' First focus, , second focus, First focus ');
assert.deepEqual(tags, ['First focus', 'second focus']);
assert.deepEqual(weeklyHoroscopeTagItems(null), []);
assert.deepEqual(weeklyHoroscopeTagItems(), []);
assert.deepEqual(weeklyHoroscopeTagItems('One multi-word focus'), ['One multi-word focus']);
const html = renderToStaticMarkup(createElement(ArticlePills, { pills: { labels: tags.map(label => ({label, tone: 'term'})) } }));
assert.equal((html.match(/house-transit-term-tag/g) ?? []).length, 2);
assert.match(html, />First focus<\/span>/);
assert.match(html, />second focus<\/span>/);
assert.doesNotMatch(html, /First focus,.*second focus/);
console.log('Weekly focus tags preserve complete phrases and render as distinct article pills.');

} finally { await vite.close(); }
