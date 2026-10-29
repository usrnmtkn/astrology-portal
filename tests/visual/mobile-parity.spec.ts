import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import type {Page} from '@playwright/test';
import {installSyntheticNetworkGuard} from '../helpers/synthetic-network-guard';
import {expectReadableTheme} from '../helpers/theme-contrast';
let script='',styles='';
test.beforeAll(async()=>{
 const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
 import {FriendChartModal} from './apps/web/src/features/friends/FriendChartModal';
 import {FriendChartDeleteDialog} from './apps/web/src/features/friends/FriendChartDeleteDialog';
 import {ConnectionTransitDisclosure} from './apps/web/src/features/friends/ConnectionTransitDisclosure';
 import {AspectBadge} from './apps/web/src/components/charts/AspectBadge';
 import {SkyDetailArticle} from './apps/web/src/features/sky/SkyDetailArticle';
 import {ThemeToggleButton} from './apps/web/src/components/ThemeControls';
 import CreateChartDialog from './apps/web/src/features/you/CreateChartDialog';
 import HoroscopeSigns from './apps/web/src/features/horoscopes/HoroscopeSigns';
 import './apps/web/src/styles/horoscopes.css';
 import './apps/web/src/styles/friends-detail.css';
 import './apps/web/src/styles/friends-compare-picker.css';
 import {RelationshipChartFullscreen} from './apps/web/src/features/friends/RelationshipChartFullscreen';
 function App(){const [open,setOpen]=useState('');const [deleting,setDeleting]=useState(false);const [theme,setTheme]=useState(document.documentElement.dataset.theme);
 const [form,setForm]=useState({chartType:'person',displayName:'Sample Chart',pronouns:'they',relationshipType:'friend',birthDate:'1990-01-01',birthTime:'12:00',birthTimeUnknown:false,birthPlace:'Test City',birthLocation:null});
 const [own,setOwn]=useState({name:'Sample Reader',birthMonth:'01',birthDay:'01',birthYear:'1990',birthHour:'12',birthMinute:'00',birthMeridiem:'PM',unknownBirthTime:false,birthPlace:'Test City',birthLocation:null,currentLocation:'Test City',currentLocationData:null});
 const facts={summary:'This is the complete calculated relationship context.',caution:'These are connections through one endpoint.',groups:[{key:'primary',heading:'The primary transit',rows:[{key:'contact',title:'Saturn square the natal Midheaven',aspect:'square',orb:'0° 16′'}]},{key:'related',heading:'Related contacts',rows:Array.from({length:8},(_,i)=>({key:'related-'+i,title:'Complete related contact '+i,aspect:'trine',orb:'1° 27′'}))}]};
 const articleCase=new URLSearchParams(location.search).get('article');
 const iconArticle={full:{title:'Full Moon in Libra',glyph:'○'},new:{title:'New Moon in Libra',glyph:'●'},planet:{title:'Sun in Libra',glyph:'○'},unknown:{title:'Quasar in Libra',glyph:'○'},aspect:{title:'Sun sextile Mercury',glyph:'☉'}}[articleCase];
 if(iconArticle)return <SkyDetailArticle detail={{...iconArticle,kicker:'Sky',meta:'October 29, 2026',body:['Synthetic complete opening paragraph.','Synthetic complete ending paragraph.']}} onClose={()=>{}}/>;
 return <><ThemeToggleButton theme={theme} onThemeChange={next=>{setTheme(next);document.documentElement.dataset.theme=next}}/><button id='edit-sample' onClick={()=>setOpen('friend')}>Edit sample chart</button><button onClick={()=>setOpen('own')}>Edit own chart</button><button className='social-secondary-button' onClick={()=>setOpen('wheel')}>Full-screen chart</button><button id='delete-sample' onClick={()=>setOpen('delete')}>Delete sample chart</button>
 {open==='delete'&&<FriendChartDeleteDialog name='Sample Chart' pending={deleting} restoreFocusId='delete-sample' onClose={()=>setOpen('')} onDelete={()=>{window.__mobileDeletes=(window.__mobileDeletes||0)+1;setDeleting(true)}}/>}
 <ConnectionTransitDisclosure heading='Why this involves Sample' facts={facts} description='Complete calculated final description.'/>
 <div className='reading-story-card updates-aspect-row'><AspectBadge aspect='sextile'/><span className='updates-aspect-row__glyphs'><span className='planet-glyph'>♀</span></span></div>
 {open==='wheel'&&<RelationshipChartFullscreen mode='synastry' title='Sample comparison' outerName='Sample' outerInitials='SC' comparisonOptions={[{id:'self',displayName:'You',initials:'SR',subtitle:'Your chart',natalChart:null,isSelf:true}]} comparisonPickerOpen={false} comparisonSelectedId='self' onClose={()=>setOpen('')} onComparisonSelect={()=>{}} onComparisonToggle={()=>{}}><svg viewBox='0 0 100 100' aria-label='Synthetic chart shell fixture'><circle cx='50' cy='50' r='40'/></svg></RelationshipChartFullscreen>}
 <HoroscopeSigns sign='aries' rising={null} sun={null} onSelect={()=>{}}/>
 {open==='friend'&&<FriendChartModal restoreFocusId='edit-sample' form={form} formCopy={{title:'Add chart',editTitle:'Edit chart',subtitle:'Add a saved chart.',editSubtitle:'Update birth details for this saved chart.',nameLabel:'Name',dateLabel:'Birth date',timeLabel:'Birth time',placeLabel:'Birth place',unknownTime:"I don't know their birth time.",saveSubmit:'Save chart',submit:'Create chart'}} isEditing isEventForm={false} isSubmitting={false} message='' onClose={()=>setOpen('')} onChartTypeChange={chartType=>setForm({...form,chartType})} onFieldChange={(key,value)=>setForm({...form,[key]:value})} onSubmit={e=>{e.preventDefault();window.__mobileFriendSaves=(window.__mobileFriendSaves||0)+1}} citySearchField={<label className='add-chart-field'><span>Birth place</span><input value={form.birthPlace} onChange={e=>setForm({...form,birthPlace:e.target.value})}/></label>}/>}
 {open==='own'&&<CreateChartDialog onClose={()=>setOpen('')} form={own} setForm={setOwn} profile={null} step='birth' setStep={()=>{}} saving={false} message='' onSave={()=>{window.__mobileOwnSaves=(window.__mobileOwnSaves||0)+1}}/>}
 </>}
 createRoot(document.getElementById('root')).render(<App/>);
 `},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',outfile:'harness.js',define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'}});
 script=result.outputFiles.find(file=>file.path.endsWith('.js'))!.text;
 styles=result.outputFiles.find(file=>file.path.endsWith('.css'))?.text??'';
});

async function routeMobileHarness(page:Page,theme:string){
 const dist=process.env.PLAYWRIGHT_DIST_ROOT??'apps/web/dist';
 const manifest=JSON.parse(readFileSync(`${dist}/.vite/manifest.json`,'utf8'));
 await page.route('**/__mobile-parity**',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${[...manifest['index.html'].css,manifest['src/styles.css'].file].map(file=>`<link rel="stylesheet" href="/${file}">`).join('')}<style>${styles}</style></head><body><main id="root"></main><script>${script}</script></body></html>`}));
}

test('Mobile parity: chart forms, close icons, connection sheet and badge centering',async({page,baseURL},info)=>{
 const guard=await installSyntheticNetworkGuard(page.context(),new URL(baseURL!).origin);
 const theme=info.project.name.endsWith('dark')?'dark':'light';
 await routeMobileHarness(page,theme);
 await page.goto('/__mobile-parity');await page.evaluate(()=>document.fonts.ready);
 const themeButton=page.locator('.theme-toggle');
 for(const current of [theme,theme==='dark'?'light':'dark']){
  await expect(themeButton).toHaveAccessibleName(`Switch to ${current==='dark'?'light':'dark'} mode`);
  await expect(themeButton.locator('svg')).toHaveCSS('width','24px');await expect(themeButton.locator('svg')).toHaveCSS('height','24px');
  const box=(await themeButton.boundingBox())!,icon=(await themeButton.locator('svg').boundingBox())!;
  const controlSize=page.viewportSize()!.width<=720?48:56;
  await expect(themeButton).toHaveCSS('width',`${controlSize}px`);await expect(themeButton).toHaveCSS('height',`${controlSize}px`);
  expect(box.width).toBeCloseTo(controlSize,3);expect(box.height).toBeCloseTo(controlSize,3);
  expect(Math.abs(icon.x+icon.width/2-box.x-box.width/2)).toBeLessThan(1);
  expect(Math.abs(icon.y+icon.height/2-box.y-box.height/2)).toBeLessThan(1);
  await themeButton.click();
 }
 for(const selector of ['.aspect-badge','.updates-aspect-row__glyphs > .planet-glyph']){
  await expect(page.locator(selector)).toHaveCSS('text-align','center');
  const centered=await page.locator(selector).evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect(),box=el.getBoundingClientRect();return Math.abs(text.x+text.width/2-box.x-box.width/2)<2;});
  expect(centered).toBe(true);
 }
 await expect(page.locator('.aspect-badge[data-aspect="sextile"]')).toHaveText('⚹');
 expect(await page.locator('.aspect-badge').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Noto Sans Symbols');
 await page.locator('.reading-story-card').screenshot({path:info.outputPath('approved-sextile-icon.png')});
 const signs=page.getByRole('group',{name:'Zodiac signs',exact:true});
 await expect(signs.getByRole('button')).toHaveCount(12);
 for(const sign of await signs.getByRole('button').all()){
  await expect(sign).toHaveCSS('display','grid');
  const glyph=(await sign.locator('img').boundingBox())!,label=(await sign.locator('span').boundingBox())!;
  expect(label.y).toBeGreaterThanOrEqual(glyph.y+glyph.height);
  expect(Math.abs(label.x+label.width/2-glyph.x-glyph.width/2)).toBeLessThan(2);
 }
 await page.getByRole('region',{name:'Explore signs'}).screenshot({path:info.outputPath('explore-signs.png')});
 await page.getByRole('button',{name:'Edit sample chart',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'Edit chart',exact:true});
 await page.mouse.click(1,1);await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'Edit chart',level:2})).toHaveCSS('font-size',page.viewportSize()!.width<=800?'30px':'36px');
 await expect(dialog.getByRole('heading',{name:'Edit chart',level:2})).toHaveCSS('font-weight','400');
 for(const input of ['input[type=date]','input[type=time]']){
  await expect(dialog.locator(input)).toHaveCSS('font-family',/system-ui/);
  expect((await dialog.locator(input).boundingBox())!.width).toBeGreaterThan(Math.min(250,page.viewportSize()!.width-100));
 }
 const close=dialog.getByRole('button',{name:'Close',exact:true});
 await expect(close.locator('svg')).toHaveCSS('width','16px');await expect(close.locator('svg')).toHaveCSS('height','16px');
 await expect(close).toHaveCSS('padding','0px');
 await dialog.getByRole('button',{name:'Save chart',exact:true}).scrollIntoViewIfNeeded();
 await expect(dialog.getByRole('button',{name:'Save chart',exact:true})).toBeInViewport();
 await expect(close).toBeInViewport();
 await dialog.locator('.add-chart-birth-grid').scrollIntoViewIfNeeded();
 await expect(dialog.getByRole('button',{name:'Save chart',exact:true})).toBeInViewport();
 await dialog.getByRole('button',{name:'Save chart',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__mobileFriendSaves)).toBe(1);
 await dialog.locator('input[type=time]').scrollIntoViewIfNeeded();
 await page.screenshot({path:info.outputPath('saved-chart-form.png')});
 await close.click();await expect(page.getByRole('button',{name:'Edit sample chart'})).toBeFocused();
 await page.getByRole('button',{name:'Edit own chart'}).click();
 dialog=page.getByRole('dialog',{name:'Your birth information',exact:true});
 await expect(dialog.getByRole('heading',{name:'Your birth information'})).toHaveCSS('font-size',page.viewportSize()!.width<=800?'30px':'36px');
 await expect(dialog.getByRole('heading',{name:'Your birth information'})).toHaveCSS('font-weight','400');
 await expect(dialog.getByRole('textbox',{name:'Birth year'})).toHaveCSS('font-family',/system-ui/);
 await dialog.getByRole('button',{name:'Save birth details',exact:true}).scrollIntoViewIfNeeded();
 await expect(dialog.getByRole('button',{name:'Close create chart',exact:true})).toBeInViewport();
 await dialog.getByRole('textbox',{name:'Birth year'}).scrollIntoViewIfNeeded();
 await expect(dialog.getByRole('button',{name:'Save birth details',exact:true})).toHaveCSS('justify-self','stretch');
 await dialog.getByRole('button',{name:'Save birth details',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__mobileOwnSaves)).toBe(1);
 await page.screenshot({path:info.outputPath('own-chart-form.png')});
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Delete sample chart',exact:true}).click();
 const confirmation=page.getByRole('alertdialog',{name:'Delete Sample Chart?',exact:true});
 await expect(confirmation.getByRole('button',{name:'Cancel',exact:true})).toBeInViewport();
 await expect(confirmation.getByRole('button',{name:'Delete chart',exact:true})).toBeInViewport();
 await confirmation.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(confirmation).not.toBeVisible();await expect(page.locator('#delete-sample')).toBeFocused();
 expect(await page.evaluate(()=>(window as any).__mobileDeletes||0)).toBe(0);
 await page.locator('#delete-sample').click();
 await confirmation.getByRole('button',{name:'Delete chart',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__mobileDeletes)).toBe(1);
 await expect(confirmation.getByRole('button',{name:'Deleting...',exact:true})).toBeDisabled();
 await expect(confirmation.getByRole('button',{name:'Cancel',exact:true})).toBeDisabled();
 await page.keyboard.press('Escape');await expect(confirmation).toBeVisible();
 await expectReadableTheme(page,'.modal-dialog__header h2, .modal-dialog__content p, .modal-dialog__actions button');
 await page.screenshot({path:info.outputPath('delete-chart-confirmation.png')});
 await page.goto('/__mobile-parity');await page.evaluate(()=>document.fonts.ready);
 await expect(page.getByRole('button',{name:'Why this involves Sample',exact:true})).toHaveCSS('font-family',/system-ui/);
 await page.getByRole('button',{name:'Why this involves Sample',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'Why this involves Sample',exact:true});
 await expect(dialog.locator('.connection-facts__summary')).toHaveCSS('font-size','19px');
 await expect(dialog.locator('.connection-facts__summary')).toHaveCSS('font-family',/Newsreader/);
 await expect(dialog.getByRole('heading',{name:'The primary transit'})).toHaveCSS('font-family',/system-ui/);
 await expect(dialog.locator('.connection-facts__orb').first()).toHaveText('Orb 0° 16′');
 await dialog.locator('.connection-facts__footer').scrollIntoViewIfNeeded();
 await expect(dialog.getByText('Complete calculated final description.',{exact:true})).toBeInViewport();
 await expect(dialog.getByRole('button',{name:'Close connection details'})).toBeInViewport();
 await expectReadableTheme(page,'.modal-dialog__header h2, .connection-facts__title, .connection-facts__orb, .connection-facts__footer p');
 await page.screenshot({path:info.outputPath('connection-sheet.png')});
 await page.keyboard.press('Escape');
 const fullScreen=page.getByRole('button',{name:'Full-screen chart',exact:true});
 await expect(fullScreen).toHaveCSS('font-family',/system-ui/);await expect(fullScreen).toHaveCSS('font-size','15px');
 await fullScreen.click();
 dialog=page.getByRole('dialog',{name:'Sample comparison',exact:true});
 await expect(dialog.locator('.chart-fullscreen-title')).toHaveCSS('font-family',/system-ui/);
 await expect(dialog.locator('.chart-fullscreen-close')).toHaveCSS('padding','0px');
 await expect(dialog.locator('.chart-fullscreen-close svg')).toHaveCSS('width','16px');
 await expect(dialog.locator('.friend-chart-legend')).toHaveCSS('font-family',/system-ui/);
 await expect(dialog.locator('.friend-compare-pill')).toHaveCSS('font-family',/system-ui/);
 await expect(dialog.locator('.friend-compare-pill')).toHaveCSS('font-size','15px');
 await dialog.getByRole('button',{name:'Close full-screen chart'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(guard.unhandledExternal).toEqual([]);
});

test('Mobile parity: article aspect and lunar icons preserve supplied glyphs',async({page,baseURL},info)=>{
 const guard=await installSyntheticNetworkGuard(page.context(),new URL(baseURL!).origin);
 const theme=info.project.use.colorScheme==='dark'?'dark':'light';
 await routeMobileHarness(page,theme);
 for(const [key,title,glyph] of [
  ['full','Full Moon in Libra','○'],['new','New Moon in Libra','●'],
  ['planet','Sun in Libra','☉'],['unknown','Quasar in Libra','Q'],
  ['aspect','Sun sextile Mercury','⚹']
 ]){
  await page.goto(`/__mobile-parity?article=${key}`);
  const article=page.locator('.sky-detail-article'),header=article.locator('.sky-detail-id');
  await expect(article.getByRole('heading',{level:1})).toHaveText(title);
  await expect(article).toContainText('Synthetic complete opening paragraph.');
  await expect(article).toContainText('Synthetic complete ending paragraph.');
  const cue=key==='aspect'?header.locator('.aspect-badge'):header.locator('.article-eyebrow__glyphs > span').first();
  await expect(cue).toHaveText(glyph);
  if(key!=='aspect')await expect(header.locator('.article-eyebrow__glyphs img')).toHaveAttribute('src',/\/zodiac\/libra\.svg/);
  await page.evaluate(()=>document.fonts.ready);
  await header.screenshot({path:info.outputPath(`article-${key}-icon.png`)});
  if(key==='full'||key==='new'){
   await page.reload();await expect(cue).toHaveText(glyph);
   await expect(article.getByRole('heading',{level:1})).toHaveText(title);
   await expect(article).toContainText('Synthetic complete ending paragraph.');
  }
 }
 await page.evaluate(()=>document.fonts.ready);
 expect(guard.unhandledExternal).toEqual([]);
});
