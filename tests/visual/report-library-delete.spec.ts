import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark'] as const) {
 for (const width of [390, 1440]) {
  test(`report delete confirmation, persistence, and failure at ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({width,height:1000});
    const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',app_metadata: { provider: "email" }, user_metadata: {}, email:'report-delete@example.test'};
    const state: Record<string, unknown>[]=[];
    let writes=0,fail=false;
    const rows=[{id:'00000000-0000-4000-8000-000000000002',subject_type:'you_day_reading',status:'DRAFT',body:'Saved test reading.',headline:'Daily test report',target_date:'2026-09-11',created_at:'2026-09-11T12:00:00Z',updated_at:'2026-09-11T12:00:00Z'},
    {id:'00000000-0000-4000-8000-000000000003',subject_type:'friend_transit_reading',status:'ERROR',body:'',error:'Writing quality gate did not pass after one corrective rewrite and re-judge.',friend_report_entitlement_id:'fixture-entitlement',headline:'Failed test report',target_date:'2026-09-10',created_at:'2026-09-10T12:00:00Z',updated_at:'2026-09-10T12:00:00Z'}];
    state.push({user_id:user.id,source_kind:'generated_interpretation',source_id:rows[1].id,archived_at:'2026-09-11T12:00:00Z'});
    const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
    await page.addInitScript(({user,theme,storageKey})=>{
      localStorage.setItem('tldrastro:theme',theme);
      localStorage.setItem(storageKey,JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}));
    },{user,theme,storageKey});
    await page.route('**/auth/v1/**',route=>route.fulfill({json:user}));
    await page.route('**/rest/v1/**',async route=>{
      const table=new URL(route.request().url()).pathname.split('/').pop();
      if(table==='user_report_library_state' && route.request().method()==='POST') {
        writes++;
        if(fail)return route.fulfill({status:500,json:{message:'test write rejected'}});
        const patch=route.request().postDataJSON();const existing=state.find(s=>s.source_id===patch.source_id);
        if(existing)Object.assign(existing,patch);else state.push(patch);
        return route.fulfill({status:201,body:''});
      }
      return route.fulfill({json:table==='user_generated_interpretations'?rows:table==='user_report_library_state'?state:[]});
    });
    await page.goto('/reports/');
    await expect(page.getByRole('tab',{name:'Reports 1',exact:true})).toBeVisible();
    const menu=page.getByRole('button',{name:'More options for Daily test report',exact:true});
    await menu.click();
    await expect(page.getByRole('menuitem')).toHaveText(['Share','Archive','Delete']);
    page.once('dialog',dialog=>dialog.dismiss());
    await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
    expect(writes).toBe(0);
    await expect(menu).toBeVisible();
    await menu.click();
    page.once('dialog',async dialog=>{expect(dialog.message()).toContain('Daily test report');await dialog.accept();});
    await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
    await expect(page.getByRole('tab',{name:'Reports 0',exact:true})).toBeVisible();
    await page.reload();
    await expect(page.getByRole('tab',{name:'Reports 0',exact:true})).toBeVisible();
    await page.getByRole('tab',{name:'Archived 1',exact:true}).click();
    await expect(page.getByText('Could not finish',{exact:true})).toBeVisible();
    await expect(page.getByText('Needs review',{exact:true})).toHaveCount(0);
    const archivedMenu=page.getByRole('button',{name:'More options for Failed test report',exact:true});
    await archivedMenu.click();
    await expect(page.getByRole('menuitem')).toHaveText(['Restore','Delete']);
    fail=true;page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
    await expect(page.getByRole('status')).toHaveText('This report could not be deleted. Please try again.');
    await expect(archivedMenu).toBeVisible();
    fail=false;await archivedMenu.click();page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
    await expect(page.getByRole('tab',{name:'Archived 0',exact:true})).toBeVisible();
    await expect(page.getByText('Nothing archived',{exact:true})).toBeVisible();
  });
 }
}
