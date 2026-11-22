import {seed, authenticate, now} from '../helpers/synthetic-member-sources';
import {test, expect} from '../helpers/polish-test';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Friends directory handoff ${width} ${theme}`, async ({page}, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({width, height:1100});
    const natal = await seed(page, theme);
    await authenticate(page);
    await page.addInitScript(() => {
      const key='tldrastro:manualCharts:design-reader';
      if (sessionStorage.getItem('directoryFixtureSeeded')) return;
      const charts=JSON.parse(localStorage.getItem(key) ?? '[]');
      const chart=charts[0];
      localStorage.setItem(key, JSON.stringify([
        {...chart, id:'fixture-unknown', displayName:'Fixture Unknown', birthTime:null, birthTimeUnknown:true},
        {...chart, id:'fixture-known', displayName:'Fixture Known'}
      ]));
      sessionStorage.setItem('directoryFixtureSeeded','true');
    });
    await page.route('**/rest/v1/rpc/list_social_friends', route => route.fulfill({json:[{
      friendship_id:'directory-friendship', user_id:'directory-connected', display_name:'Connected Fixture',
      handle:'directory_fixture', natal_chart:natal, viewer_shares_chart:true, friend_shares_chart:true, accepted_at:now
    }]}));
    await page.goto('/#friends?tab=charts');
    const unknown=page.locator('.manual-chart-row').filter({has:page.getByRole('button',{name:'Open Fixture Unknown',exact:true})});
    const known=page.locator('.manual-chart-row').filter({has:page.getByRole('button',{name:'Open Fixture Known',exact:true})});
    await expect(unknown).toBeVisible();await expect(known).toBeVisible();
    const header=page.locator('.friends-workspace-heading');
    await expect(page.locator('.friends-page')).toHaveCSS('padding-top','0px');
    const headingTop=await header.evaluate(node=>node.getBoundingClientRect().top+scrollY);
    expect(headingTop).toBe(width < 800 ? 104 : 144);
    const addTime=unknown.getByRole('button',{name:'Add birth time',exact:true});
    await expect(addTime).toHaveCSS('border-width','0px');
    const {row, select, action}=await unknown.evaluate(node => {
      const box=(element:Element)=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
      return {row:box(node), select:box(node.querySelector('.crb')!), action:box(node.querySelector('.manual-chart-birth-time-button')!)};
    });
    if (width > 800) {
      expect(action.x).toBeGreaterThanOrEqual(select.x+select.width);
      expect(Math.abs(action.y+action.height/2-row.y-row.height/2)).toBeLessThan(1);
      expect(row.height).toBeLessThanOrEqual(100);
      await expect(unknown).toHaveCSS('border-radius','16px');
    } else {
      await expect(unknown).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
      await expect(unknown).toHaveCSS('box-shadow','none');
      expect(action.y).toBeGreaterThanOrEqual(select.y+select.height);
    }
    await expect(known.getByRole('button',{name:'Add birth time',exact:true})).toHaveCount(0);
    await page.screenshot({path:info.outputPath('charts.png'),fullPage:true});
    await addTime.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
    await known.getByRole('button',{name:'Open Fixture Known',exact:true}).click();
    await expect(page.locator('.friend-profile-heading h1')).toHaveText('Fixture Known');
    const menu=page.getByRole('button',{name:'More actions for Fixture Known',exact:true});
    await menu.focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem',{name:'Edit',exact:true})).toBeFocused();
    await page.getByRole('menuitem',{name:'Edit',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Edit chart',exact:true})).toBeVisible();
    await page.keyboard.press('Escape');await expect(menu).toBeFocused();
    await menu.click();await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Delete Fixture Known?',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(menu).toBeFocused();
    await menu.click();await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
    await page.getByRole('button',{name:'Delete chart',exact:true}).click();
    await expect(page.getByRole('button',{name:'Open Fixture Known',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Open Fixture Unknown',exact:true})).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button',{name:'Open Fixture Known',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Open Fixture Unknown',exact:true})).toBeVisible();
    await page.getByRole('tab',{name:/^Circle/}).click();
    const connected=page.locator('.friends-person-row').filter({hasText:'Connected Fixture'});
    await expect(connected.getByText('Connected Fixture',{exact:true})).toBeVisible();
    await info.attach('directory-position', {contentType:'application/json',body:JSON.stringify(await header.evaluate(node=>{
      const rows=[];for(let e:Element|null=node;e;e=e.parentElement){const s=getComputedStyle(e);rows.push({tag:e.tagName,className:e.className,view:e.getAttribute('data-view'),y:e.getBoundingClientRect().y+scrollY,margin:s.marginTop,padding:s.paddingTop,transform:s.transform});}
      return {scrollY,rows};
    }))});
    await expect.poll(()=>header.evaluate(node=>node.getBoundingClientRect().top+scrollY)).toBeCloseTo(headingTop,0);
    if (width < 800) {
      const geometry=await connected.evaluate(row=>{
        const identity=row.querySelector('.friends-person-identity')!, name=identity.querySelector('strong')!, handle=identity.querySelector('small')!;
        return {name:name.getBoundingClientRect().bottom,handle:handle.getBoundingClientRect().top,copy:row.querySelector('.friends-person-copy')!.getBoundingClientRect().right,arrow:row.querySelector('.friends-row-arrow')!.getBoundingClientRect().left};
      });
      expect(geometry.handle).toBeGreaterThanOrEqual(geometry.name);
      expect(geometry.arrow).toBeGreaterThanOrEqual(geometry.copy);
    }
    await page.screenshot({path:info.outputPath('circle.png'),fullPage:true});
    await page.getByRole('tab',{name:/^Requests/}).click();
    await page.screenshot({path:info.outputPath('requests.png'),fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}
