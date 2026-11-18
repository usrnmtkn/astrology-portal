import { expect, type Page } from '@playwright/test';

type Theme = 'light' | 'dark';

export async function expectMenuTheme(page: Page, theme: Theme) {
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  const appearance = page.locator('.site-menu-theme');
  for (const option of ['light', 'dark'] as const) {
    await expect(appearance.getByRole('button', { name: option, exact: true }))
      .toHaveAttribute('aria-pressed', String(option === theme));
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
}

export async function selectMenuTheme(page: Page, theme: Theme) {
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  const choice = page.locator('.site-menu-theme').getByRole('button', { name: theme, exact: true });
  await choice.focus();
  await page.keyboard.press('Enter');
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
}
