import {expect,type Page,type Locator} from '@playwright/test';

/** A reload opens the saved edition directly. Verify restoration before using
 * the shared Dates control to return to its library for a separate reopen. */
export async function showSavedHoroscopeEditions(page:Page,studio:Locator) {
  const linked=new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('edition');
  const dates=studio.getByRole('button',{name:'1 · Dates',exact:true});
  const restored=studio.locator('.admin-horoscope-summary');
  const list=studio.getByText(/^Continue a saved edition/);
  if(linked){
    await expect(restored).toBeVisible();
    await expect(restored).toContainText(/\d+\/\d+ readings ready/);
    expect(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('edition')).toBe(linked);
    await expect(dates).toBeEnabled();
    await dates.click();
  }else{
    await expect(restored.or(list).first()).toBeVisible();
    if(await restored.isVisible()){
      await expect(dates).toBeEnabled();
      await dates.click();
    }
  }
  await expect(list).toBeVisible();
  await list.click();
}
