const luminance = color => color.map(value => value / 255).map(value => value <= 0.04045
  ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);

// Compare the same clip with and without this glyph. Unrelated wheel marks
// cannot count as paint, and antialiased edges contribute fractional ink area.
export function glyphPaintContrast(painted, blank, ink) {
  if (painted.width !== blank.width || painted.height !== blank.height
    || painted.data.length !== blank.data.length || painted.data.length !== painted.width * painted.height * 4) {
    throw new Error('Glyph paint comparison requires identical complete pixel bounds');
  }
  const backgrounds = new Map();
  let paintedArea = 0;
  for (let offset = 0; offset < blank.data.length; offset += 4) {
    const background = [...blank.data.slice(offset, offset + 3)];
    const key = background.join(',');
    backgrounds.set(key, (backgrounds.get(key) ?? 0) + 1);
    const expected = background.map((value, index) => (ink[index] - value) * ink[3]);
    const denominator = expected.reduce((sum, value) => sum + value * value, 0);
    const projection = expected.reduce((sum, value, index) => sum + value * (painted.data[offset + index] - background[index]), 0);
    paintedArea += denominator ? Math.max(0, Math.min(1, projection / denominator)) : 0;
  }
  const background = [...backgrounds].sort((a, b) => b[1] - a[1])[0]?.[0].split(',').map(Number);
  if (!background) throw new Error('Glyph paint comparison requires nonempty pixels');
  const foreground = background.map((value, index) => value + (ink[index] - value) * ink[3]);
  const levels = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return { paintedArea, inkContrast: (levels[0] + 0.05) / (levels[1] + 0.05), background };
}
