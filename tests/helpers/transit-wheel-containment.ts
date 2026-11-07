import { expect, type Locator } from '@playwright/test';

export async function expectTransitContainment(svg: Locator) {
  await expect(svg.locator('.transit-planet-labels')).not.toHaveAttribute('data-transit-label-layout', 'paired');
  const geometry = await svg.evaluate(root => {
    const svg = root as SVGSVGElement;
    const inner = Number(root.querySelector('.transit-planet-band-outline--inner')!.getAttribute('r'));
    const outer = Number(root.querySelector('.transit-planet-band-outline--outer')!.getAttribute('r'));
    const inverse = svg.getScreenCTM()!.inverse();
    const viewport = svg.getBoundingClientRect();
    const labels = [...root.querySelectorAll<SVGGraphicsElement>('.transit-planet-labels .wheel-placement__glyph, .transit-planet-degree')].map(node => {
      const box = node.getBoundingClientRect();
      const corners = [[box.left, box.top], [box.right, box.top], [box.right, box.bottom], [box.left, box.bottom]]
        .map(([x, y]) => new DOMPoint(x, y).matrixTransform(inverse));
      const left = Math.min(...corners.map(point => point.x)), right = Math.max(...corners.map(point => point.x));
      const top = Math.min(...corners.map(point => point.y)), bottom = Math.max(...corners.map(point => point.y));
      return {
        planet: node.closest('[data-inspector-point-id]')!.getAttribute('data-inspector-point-id'),
        kind: node.classList.contains('transit-planet-degree') ? 'degree' : 'glyph including Rx',
        innerPadding: Math.hypot(Math.max(left, Math.min(300, right)) - 300, Math.max(top, Math.min(300, bottom)) - 300) - inner,
        outerPadding: outer - Math.max(...corners.map(point => Math.hypot(point.x - 300, point.y - 300))),
        clipped: box.left < viewport.left || box.right > viewport.right || box.top < viewport.top || box.bottom > viewport.bottom,
        box: { left, right, top, bottom }
      };
    });
    const overlaps = labels.flatMap((a, index) => labels.slice(index + 1).flatMap(b =>
      Math.min(a.box.right, b.box.right) > Math.max(a.box.left, b.box.left)
      && Math.min(a.box.bottom, b.box.bottom) > Math.max(a.box.top, b.box.top) ? [{ a, b }] : []));
    const band = root.querySelector('.transit-planet-band')!;
    const middle = Number(band.getAttribute('r')), thickness = Number(getComputedStyle(band).strokeWidth.replace('px', ''));
    const styles = getComputedStyle(root);
    const scale = Math.hypot(svg.getScreenCTM()!.a, svg.getScreenCTM()!.b);
    const degree = getComputedStyle(root.querySelector('.transit-planet-degree')!);
    const renderedDegreeSizes = [...root.querySelectorAll('.transit-planet-degree')]
      .map(node => Number.parseFloat(getComputedStyle(node).fontSize) * scale);
    const glyphSvgSizes = [...root.querySelectorAll('.transit-planet-labels .wheel-placement__glyph')]
      .map(node => ({ planet: node.closest('[data-inspector-point-id]')!.getAttribute('data-inspector-point-id'),
        width: node.getBoundingClientRect().width / scale, height: node.getBoundingClientRect().height / scale }));
    const renderedGlyphSizes = [...root.querySelectorAll('.transit-planet-labels .wheel-placement__glyph')]
      .map(node => node.getBoundingClientRect().width);
    const normalizeFamily = (value: string) => value.replace(/["'\s]/g, '').toLowerCase();
    const fontProbe = document.createElement('span');
    fontProbe.style.fontFamily = styles.getPropertyValue('--font-body');
    document.body.append(fontProbe);
    const targetDegreeFamily = normalizeFamily(getComputedStyle(fontProbe).fontFamily);
    fontProbe.remove();
    return { labels, overlaps, inner, outer, bandInner: middle - thickness / 2, bandOuter: middle + thickness / 2,
      renderedDegreeSize: renderedDegreeSizes[0], renderedDegreeSizes,
      renderedGlyphSize: renderedGlyphSizes[0], renderedGlyphSizes,
      targetDegreeSize: Number.parseFloat(styles.getPropertyValue('--chart-transit-degree-size')) * scale,
      glyphSvgSizes,
      degreeFamily: normalizeFamily(degree.fontFamily), targetDegreeFamily,
      degreeWeight: degree.fontWeight, targetDegreeWeight: styles.getPropertyValue('--weight-semibold').trim(),
      degreeTracking: degree.letterSpacing, degreeLeading: degree.lineHeight };
  });
  expect(geometry.bandInner).toBe(geometry.inner);
  expect(geometry.bandOuter).toBe(geometry.outer);
  expect(geometry.inner).toBe(284);
  expect(geometry.outer).toBe(374);
  expect(geometry.labels).toHaveLength(28);
  expect(geometry.labels.filter(label => label.innerPadding < 4 || label.outerPadding < 4 || label.clipped),
    'Every complete transit glyph, Rx asset and degree label has padding inside the band and SVG').toEqual([]);
  expect(geometry.overlaps, 'Crowded transit glyphs and degrees remain separate').toEqual([]);
  expect(geometry.degreeFamily).toBe(geometry.targetDegreeFamily);
  expect(geometry.degreeWeight).toBe(geometry.targetDegreeWeight);
  expect(['normal', '0px']).toContain(geometry.degreeTracking);
  expect(geometry.renderedDegreeSizes).toHaveLength(14);
  expect(geometry.renderedGlyphSizes).toHaveLength(14);
  for (const size of geometry.renderedDegreeSizes) {
    expect(size, 'Every transit degree preserves the original SVG typography').toBeCloseTo(geometry.targetDegreeSize, 1);
  }
  for (const glyph of geometry.glyphSvgSizes) {
    const originalSize = glyph.planet === 'transit:Sun' ? 30 : 28;
    expect(glyph.width, 'Transit glyphs retain their original SVG width').toBeCloseTo(originalSize, 2);
    expect(glyph.height, 'Transit glyphs retain their original SVG height').toBeCloseTo(originalSize, 2);
  }
  await expect(svg).toHaveAttribute('viewBox', '-76 -76 752 752');
  expect(await svg.locator('.wheel-surfaces circle').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('r')))))
    .toEqual([284, 240, 132, 96]);
  return geometry;
}
