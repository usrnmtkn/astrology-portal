import assert from 'node:assert/strict';
import { glyphPaintContrast } from '../tests/helpers/glyph-paint-contrast.mjs';

const blank = { width: 3, height: 3, data: new Uint8Array(Array.from({length: 9}, () => [20, 20, 20, 255]).flat()) };
const painted = { ...blank, data: blank.data.slice() };
// The complete muted ring has no pixels above the old absolute brightness 150.
// Its antialiased ink still covers more than one full pixel with adequate contrast.
for (const [index, coverage] of [0.25, 0.5, 1, 0.5, 0.25].entries()) {
  painted.data.set([20 + 120 * coverage, 20 + 120 * coverage, 20 + 120 * coverage, 255], index * 4);
}
const metrics = glyphPaintContrast(painted, blank, [140, 140, 140, 1]);
assert.equal(metrics.paintedArea, 2.5);
assert(metrics.inkContrast >= 3);
assert.equal(glyphPaintContrast(blank, blank, [140, 140, 140, 1]).paintedArea, 0, 'Missing paint cannot inherit wheel contrast');
const wrongInk = { ...blank, data: blank.data.map((value, index) => index % 4 === 3 ? value : 0) };
assert.equal(glyphPaintContrast(wrongInk, blank, [140, 140, 140, 1]).paintedArea, 0, 'A dark rendering error cannot pass on a dark wheel');
assert(glyphPaintContrast(painted, blank, [40, 40, 40, 1]).inkContrast < 3, 'Low-contrast styling still fails independently');
assert.throws(() => glyphPaintContrast({...painted, width: 4}, blank, [140, 140, 140, 1]), /identical complete pixel bounds/);
console.log('PASS glyph paint: antialias coverage, absent/wrong paint, insufficient contrast and identical bounds.');
