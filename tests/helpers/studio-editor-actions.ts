import { expect, type Locator } from '@playwright/test';

export async function openEditorMoreActions(editor: Locator) {
  const disclosure = editor.locator('.admin-editor-more-actions');
  await expect(disclosure).toHaveCount(1);
  if (await disclosure.getAttribute('open') === null) await disclosure.locator('summary').click();
}
