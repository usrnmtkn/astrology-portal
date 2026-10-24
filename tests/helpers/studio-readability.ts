import { expect, type Locator } from '@playwright/test';

// Check actual resolved type and contrast, including inherited theme surfaces.
export async function expectStudioReadingType(target: Locator, role: 'body' | 'label' = 'body') {
  const result = await target.evaluate((node, role) => {
    const actual = getComputedStyle(node);
    const probe = document.createElement('span');
    probe.style.cssText = role === 'body'
      ? 'font-family:var(--font-body);font-size:var(--text-body);font-weight:var(--weight-regular);line-height:var(--leading-body);letter-spacing:var(--tracking-body)'
      : 'font-family:var(--font-label);font-size:var(--type-label-size);font-weight:var(--weight-semibold);line-height:var(--leading-label);letter-spacing:var(--tracking-body)';
    node.parentElement!.append(probe);
    const reference = getComputedStyle(probe);
    const props = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;
    const type = props.map(prop => actual[prop]);
    const expected = props.map(prop => reference[prop]);
    probe.remove();
    const rgb = (color: string) => (color.match(/[\d.]+/g) ?? []).map(Number);
    let parent: Element | null = node;
    let background = [255, 255, 255];
    while (parent) {
      const color = rgb(getComputedStyle(parent).backgroundColor);
      if (color.length === 3 || color[3] === 1) { background = color; break; }
      parent = parent.parentElement;
    }
    const luminance = (color: number[]) => color.slice(0, 3).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const foreground = luminance(rgb(actual.color));
    const backdrop = luminance(background);
    return { type, expected, contrast: (Math.max(foreground, backdrop) + 0.05) / (Math.min(foreground, backdrop) + 0.05) };
  }, role);
  expect(result.type).toEqual(result.expected);
  expect(result.contrast).toBeGreaterThanOrEqual(4.5);
}

export async function expectStudioPanel(target: Locator) {
  const style = await target.evaluate(node => {
    const c = getComputedStyle(node);
    return { padding: parseFloat(c.paddingTop), border: parseFloat(c.borderTopWidth), radius: parseFloat(c.borderTopLeftRadius), background: c.backgroundColor };
  });
  expect(style.padding).toBeGreaterThan(0);
  expect(style.border).toBeGreaterThan(0);
  expect(style.radius).toBeGreaterThan(0);
  expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
}
