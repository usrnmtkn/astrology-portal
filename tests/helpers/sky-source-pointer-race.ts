import { expect, type Page } from '@playwright/test';

// Delay the real synthetic reader frame's result, not a replacement response.
// Releasing it during a native pointer gesture reproduces the CI layout race.
export async function holdSkySourcesUntilTemplatePointer(page: Page) {
  await page.addInitScript(() => {
    if (window !== window.top) return;
    const state = { held: 0, released: false, clicked: false, trusted: false, expandedAtDown: false, expandedAtUp: false, downY: 0, upY: 0 };
    (window as any).__skySourcePointerRace = state;
    let result: MessageEvent | null = null;
    let pointer: number | null = null;
    let button: HTMLElement | null = null;
    window.addEventListener('message', event => {
      if (!state.released && event.data?.protocol === 'studio-sky-reader-preview/v1' && event.data?.type === 'result') {
        result = event; state.held++; event.stopImmediatePropagation();
      }
    }, true);
    document.addEventListener('pointerdown', event => {
      const target = (event.target as Element)?.closest('button');
      if (state.released || target?.textContent !== 'Edit reusable template') return;
      button = target; pointer = event.pointerId; state.downY = button.getBoundingClientRect().y;
      state.expandedAtDown = Boolean(document.querySelector('[aria-label="Active dated article"]'));
      if (!result) return;
      state.released = true;
      window.dispatchEvent(new MessageEvent('message', { data: result.data, origin: result.origin, source: result.source }));
    }, true);
    document.addEventListener('pointerup', event => {
      if (event.pointerId === pointer && button) {
        state.upY = button.getBoundingClientRect().y;
        state.expandedAtUp = Boolean(document.querySelector('[aria-label="Active dated article"]'));
      }
    }, true);
    document.addEventListener('click', event => {
      if (!state.released || !button || state.clicked) return;
      state.clicked = event.target === button || event.target instanceof Node && button.contains(event.target);
      state.trusted = event.isTrusted;
    }, true);
  });
  return {
    ready: () => expect.poll(() => page.evaluate(() => (window as any).__skySourcePointerRace.held), { timeout: 15000 }).toBeGreaterThan(0),
    activate: async (touch: boolean) => {
      const button = page.getByRole('button', { name: 'Edit reusable template', exact: true });
      await button.scrollIntoViewIfNeeded();
      const bounds = await button.boundingBox();
      expect(bounds).not.toBeNull();
      const point = { x: bounds!.x + bounds!.width / 2, y: bounds!.y + bounds!.height / 2 };
      // Hold native input until React commits the released result. A tap can
      // otherwise finish before the result arrives and never exercise the race.
      if (touch) {
        const input = await page.context().newCDPSession(page);
        try {
          await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
          await expect(page.locator('[aria-label="Active dated article"]')).toBeAttached();
        } finally {
          await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await input.detach();
        }
      } else {
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
        try {
          await expect(page.locator('[aria-label="Active dated article"]')).toBeAttached();
        } finally {
          await page.mouse.up();
        }
      }
    },
    verify: async () => {
      const result = await page.evaluate(() => (window as any).__skySourcePointerRace);
      expect(result).toMatchObject({ released: true, clicked: true, trusted: true, expandedAtDown: false, expandedAtUp: true });
      expect(result.held).toBeGreaterThan(0);
      expect(Math.abs(result.upY - result.downY)).toBeLessThanOrEqual(1);
    },
    verifyCleanup: async () => {
      const result = await page.evaluate(() => {
        const panel = document.querySelector<HTMLElement>('[aria-label="Sky placement reader sources"]')!;
        const button = [...document.querySelectorAll('button')].find(node => node.textContent === 'Edit reusable template')!;
        const hold = () => button.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, pointerId: 73, isPrimary: true, button: 0, clientY: button.getBoundingClientRect().top + 1
        }));
        const restored = () => panel.style.height === '' && panel.style.overflow === '' && panel.style.boxSizing === '';
        hold();
        const pinned = Boolean(panel.style.height) && panel.style.overflow === 'hidden';
        button.dispatchEvent(new Event('blur'));
        const elementBlurStillPinned = Boolean(panel.style.height);
        window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 74 }));
        const otherPointerStillPinned = Boolean(panel.style.height);
        window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 73 }));
        const cancelRestored = restored();
        hold(); window.dispatchEvent(new Event('blur'));
        return { pinned, elementBlurStillPinned, otherPointerStillPinned, cancelRestored, blurRestored: restored() };
      });
      expect(result).toEqual({ pinned: true, elementBlurStillPinned: true, otherPointerStillPinned: true, cancelRestored: true, blurRestored: true });
      await page.evaluate(() => {
        const button = [...document.querySelectorAll('button')].find(node => node.textContent === 'Edit reusable template')!;
        button.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, pointerId: 73, isPrimary: true, button: 0, clientY: button.getBoundingClientRect().top + 1
        }));
        window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 73 }));
      });
      await expect(page.getByRole('region', { name: 'Sky placement reader sources' })).not.toHaveAttribute('style', /height:/u);
    }
  };
}
