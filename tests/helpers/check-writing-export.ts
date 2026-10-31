import {expect,type Locator,type Page} from '@playwright/test';

/** Exercise the owner-facing copy action without replacing the OS clipboard. */
export async function checkWritingExport(page:Page,scope:Locator,completePassage:string){
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(value:string)=>{(window as any).__copiedWritingPlan=value;}}}));
  const control=scope.locator('details').filter({has:page.locator('summary').filter({hasText:'Complete writing plan · copy or download'})}).first();
  await control.locator('summary').click();
  await expect(control.getByLabel('Complete writing plan',{exact:true})).toHaveCount(0);
  await control.getByRole('button',{name:'Load complete writing plan',exact:true}).click();
  const text=control.getByLabel('Complete writing plan',{exact:true});
  await expect(text).not.toHaveValue('');
  const value=await text.inputValue();
  expect(value.includes(completePassage)||value.includes(JSON.stringify(completePassage).slice(1,-1))).toBe(true);
  expect(value).toContain('### Writing instructions');expect(value).toContain('### Writing material');
  await control.getByRole('button',{name:'Copy all',exact:true}).click();
  await expect(control.getByRole('status')).toHaveText('Complete writing plan copied.');
  expect(await page.evaluate(()=>(window as any).__copiedWritingPlan)).toBe(value);
  await control.locator('summary').click();
}
