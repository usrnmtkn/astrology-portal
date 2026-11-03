import { expect, test } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`custom-variable pending saves and dirty navigation retain complete wording ${width} ${theme}`, async ({ page, context, baseURL }) => {
    test.setTimeout(90_000);
    const store = await studioApiStore([], { uuidIds: true });
    const guard = await installSyntheticNetworkGuard(context, new URL(baseURL!).origin);
    let held = false, holdNext = true, corruptNext = false, discard = false, release = () => {};
    const heldReply = new Promise<void>(resolve => { release = resolve; });
    const dialogs: string[] = [], errors: string[] = [], writes: any[] = [];
    const endpoint = '/api/admin/generated-content?variables=true';
    const original = 'Synthetic original opening.\n\nSynthetic original final sentence.';
    const definition = { name: 'retainedOpening', label: 'Retained opening', description: 'Synthetic complete description.',
      tags: [], value: original, overrides: [] };
    try {
      expect((await store.call({ method: 'POST', url: endpoint, body: { variable: definition } })).status).toBe(200);
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', async dialog => { dialogs.push(dialog.message()); await (discard ? dialog.accept() : dialog.dismiss()); });
      await context.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true });
      // This more-specific route delays the actual handler receipt, not a
      // fabricated successful save. The source is already persisted in storage.
      await page.route('**/api/admin/generated-content?variables=true', async route => {
        const request = route.request();
        const body = request.postData() ? request.postDataJSON() : undefined;
        const result = await store.call({ method: request.method(), body, url: endpoint });
        if (request.method() === 'PATCH') {
          writes.push({ body, result: structuredClone(result) });
          if (holdNext) { holdNext = false; held = true; await heldReply; }
          if (corruptNext) { corruptNext = false; result.payload.variable.value = 'Synthetic truncated receipt.'; }
        }
        await route.fulfill({ status: result.status, json: result.payload });
      });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/admin/content#variables?editVariable=retainedOpening');
      const form = page.getByRole('form', { name: 'Edit Retained opening', exact: true });
      const value = form.getByRole('textbox', { name: 'Shared value', exact: true });
      await expect(value).toHaveValue(original);
      const beforeUnload = () => page.evaluate(() => {
        const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented;
      });
      expect(await beforeUnload()).toBe(false);
      const copy = original + '\n\nSynthetic complete newer final paragraph.';
      await value.fill(copy);
      expect(await beforeUnload()).toBe(true);
      await form.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(value).toHaveValue(copy);
      await page.getByLabel('Library', { exact: true }).selectOption('readonly');
      await expect(page.getByLabel('Library', { exact: true })).toHaveValue('custom');
      await expect(value).toHaveValue(copy);
      const menu = page.getByRole('button', { name: 'Open Content Studio navigation', exact: true });
      if (await menu.isVisible()) await menu.click();
      await page.getByRole('button', { name: 'Content Library', exact: true }).click();
      await expect(page).toHaveURL(/#variables\?editVariable=retainedOpening$/u);
      await expect(value).toHaveValue(copy);
      const hideMenu = page.getByRole('button', { name: 'Hide Content Studio navigation', exact: true });
      if (await hideMenu.isVisible()) await hideMenu.click();
      expect(dialogs).toHaveLength(3);

      await form.getByRole('button', { name: 'Save variable', exact: true }).click();
      await expect.poll(() => held).toBe(true);
      await expect(value).toBeDisabled();
      await expect(form.getByLabel('Name', { exact: true })).toBeDisabled();
      await expect(form.getByLabel('Description', { exact: true })).toBeDisabled();
      await expect(form.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await page.getByRole('menuitem', { name: /Create variable/u }).click();
      await expect(form).toBeVisible();
      await expect(page.getByRole('form', { name: 'Create variable', exact: true })).toHaveCount(0);
      await page.getByLabel('Library', { exact: true }).selectOption('editable');
      await expect(page.getByLabel('Library', { exact: true })).toHaveValue('custom');
      expect(await beforeUnload()).toBe(true);
      release();
      await expect(form).toHaveCount(0);
      expect(writes).toHaveLength(1);
      expect(writes[0].body.variable.value).toBe(copy);
      expect(writes[0].result.payload.variable.value).toBe(copy);
      expect(await beforeUnload()).toBe(false);
      await page.reload();
      await expect(value).toHaveValue(copy);
      const final = copy + '\n\nSynthetic retained unsent ending.';
      await value.fill(final);
      corruptNext = true;
      await form.getByRole('button', { name: 'Save variable', exact: true }).click();
      await expect(form.getByRole('alert')).toContainText('Storage did not confirm the complete variable');
      await expect(value).toHaveValue(final);
      expect(writes[1].body.expectedUpdatedAt).toBe(writes[0].result.payload.variable.updatedAt);
      expect(writes[1].result.payload.variable.value).toBe(final);
      const stored = await store.call({ method: 'GET', url: endpoint });
      expect(stored.payload.variables[0].value).toBe(final);
      discard = true;
      await form.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page.reload();
      await expect(value).toHaveValue(final);
      expect(await beforeUnload()).toBe(false);
      discard = false;
      const unsent = final + '\n\nSynthetic not-yet-saved ending.';
      await value.fill(unsent);
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await page.getByRole('menuitem', { name: /Create variable/u }).click();
      await expect(value).toHaveValue(unsent);
      discard = true;
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await page.getByRole('menuitem', { name: /Create variable/u }).click();
      const created = page.getByRole('form', { name: 'Create variable', exact: true });
      await expect(created.getByRole('textbox', { name: 'Shared value', exact: true })).toHaveValue('');
      await created.getByRole('textbox', { name: 'Shared value', exact: true }).fill('Synthetic unsaved new variable.');
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await page.getByRole('menuitem', { name: /Create variable/u }).click();
      await expect(created.getByRole('textbox', { name: 'Shared value', exact: true })).toHaveValue('');
      expect(writes).toHaveLength(2);
      expect((await store.call({ method: 'GET', url: endpoint })).payload.variables[0].value).toBe(final);
      expect(errors).toEqual([]);
      expect(guard.unhandledExternal).toEqual([]);
    } finally {
      release();
      await guard.finishStaticFonts();
      await page.unrouteAll({ behavior: 'wait' });
      await context.unrouteAll({ behavior: 'wait' });
      store.close();
    }
  });
}
