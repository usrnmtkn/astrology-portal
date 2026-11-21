import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
const readerUrl='/admin/content/memory?view=writing-standard';
const aspectPath='docs/writing/SKY_CALENDAR_ASPECT_STANDARD.md';
const amendmentPath='docs/writing/RHETORICAL_PATTERN_PROTECTIONS.md';
const first="Write planetary aspect interpretations that help readers understand what's happening in the sky, how the planets interact, and how that interaction might show up in everyday life.";
const last='And if the reader has to work to understand what a sentence means, rewrite the sentence.';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const proseWords=(text:string)=>text.replace(/^\s*\d+[.)]\s+/gmu,'').match(/[\p{L}\p{N}]+/gu)??[];
// Independent full-word-order check across Markdown constructs. Formatting
// markers/list counters/fence language names are not owner prose.
function sourceWords(body:string,title:string){
  let fenced=false,removedTitle=false;
  const text=body.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u,'').split('\n').map(line=>{
    if(/^\s*(`{3,}|~{3,})/u.test(line)){fenced=!fenced;return '';}
    if(!fenced){if(!removedTitle&&/^#{1,6}\s+/u.test(line)&&line.replace(/^#{1,6}\s+/u,'')===title){removedTitle=true;return '';}
      line=line.replace(/^#{1,6}\s+/u,'').replace(/^(\s*)\*\*(?=\d+[.)]\s)/u,'$1');}
    return line;
  }).join('\n');return proseWords(text);
}
for(const width of [1440,390])for(const theme of ['light','dark'] as const){
  test(`all writing rules are one complete authenticated page ${width} ${theme}`,async({page})=>{
    test.setTimeout(150_000);await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme});
    await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','memory-browser-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
    const modes:string[]=[];let failOnce=true;
    await page.route('**/api/admin/memory-graph?**',async route=>{const mode=new URL(route.request().url()).searchParams.get('mode')||'graph';modes.push(mode);
      if(mode==='rules'&&failOnce){failOnce=false;await route.fulfill({status:503,json:{ok:false,authFailure:'temporary',error:'Synthetic temporary verification failure'}});}else await route.continue();});
    await page.goto('/admin/content/memory');await expect(page.getByRole('button',{name:'Fit',exact:true})).toBeVisible();modes.length=0;
    const repoResponse=page.waitForResponse(r=>new URL(r.url()).searchParams.get('mode')==='rules'&&r.status()===200);
    const liveResponse=page.waitForResponse(r=>new URL(r.url()).searchParams.get('mode')==='live-rules'&&r.status()===200);
    await page.getByRole('link',{name:'Writing standard',exact:true}).click();const repo=(await(await repoResponse).json()).rulebook;const live=(await(await liveResponse).json()).live;
    const book=page.getByRole('region',{name:'All writing rules',exact:true});await expect(book).toHaveAttribute('data-complete','true');
    await expect(page.locator('h1')).toHaveText('All writing rules');await expect(page.locator('main')).toHaveAttribute('data-studio-theme',theme);
    await expect(book.locator('article[data-source-path]')).toHaveCount(repo.documents.length);
    for(const doc of repo.documents){
      const source=fs.readFileSync(doc.path,'utf8');expect(doc.body,doc.path).toBe(source);expect(doc.bodySha256,doc.path).toBe(hash(source));
      const article=book.locator(`article[data-source-path="${doc.path}"]`);await expect(article).toHaveAttribute('data-source-sha256',hash(source));
      if(doc.records){for(let i=0;i<doc.records.length;i++)expect(await article.getByRole('region',{name:`Correction ${i+1}`,exact:true}).locator('[data-field]').allTextContents()).toEqual(Object.values(doc.records[i]).map(value=>typeof value==='string'?value:JSON.stringify(value,null,2)));}
      else{
        const text=await article.locator('.writing-reference-copy').first().innerText();
        expect(proseWords(text),doc.path).toEqual(sourceWords(source,doc.title));
      }
    }
    const enforcement=book.getByRole('region',{name:'Effective rule enforcement',exact:true});
    await expect(enforcement.locator('[data-rule-id]')).toHaveCount(repo.registry.rules.length);
    for(const rule of repo.registry.rules){const row=enforcement.locator(`[data-rule-id="${rule.id}"]`);await expect(row.getByText(`${rule.tier} · ${rule.surface.join(', ')}`,{exact:true})).toBeVisible();if(rule.promptText)expect(await row.locator('.memory-detail-content').textContent()).toBe(rule.promptText);}
    const aspect=book.locator(`article[data-source-path="${aspectPath}"]`);await expect(aspect.getByText(first,{exact:true})).toBeVisible();await expect(aspect.getByText(last,{exact:true})).toBeVisible();
    const amendments=book.locator(`article[data-source-path="${amendmentPath}"]`);
    for(const title of ['Aphorisms and maxims — November 6 owner amendment','No mixed metaphors — November 6 owner amendment','Horoscope endings — November 6 owner amendment'])await expect(amendments.getByRole('heading',{name:title,exact:true})).toBeVisible();
    await expect(amendments.getByText(/A horoscope has no required concluding paragraph\./u)).toBeVisible();
    for(const row of live.profiles.rows){const article=book.getByRole('article',{name:`${row.profile.period} horoscope instructions`,exact:true});
      for(const field of ['voiceGuidance','structure','sourceGuidance','prompt']){const value=article.locator(`[data-field="${field}"]`);await expect(value).toHaveText(row.profile[field]);expect(await value.textContent()).toBe(row.profile[field]);await expect(value).toHaveAttribute('data-field-sha256',hash(row.profile[field]));}
      if(!row.id)await expect(article.getByText('Default profile · not saved',{exact:true})).toBeVisible();}
    for(const row of live.feedback.writing){const article=book.getByRole('article',{name:`Owner instruction ${row.id}`,exact:true});expect(await article.locator('[data-field="reason"]').textContent()).toBe(row.reason);expect(await article.locator('[data-field="rejected"]').textContent()).toBe(row.rejected);}
    for(const row of live.feedback.edits){const article=book.getByRole('article',{name:`Studio correction ${row.id}`,exact:true});for(const [field,value]of Object.entries({owner_reason:row.reason,bad:row.before,corrected:row.after}))expect(await article.locator(`[data-field="${field}"]`).textContent()).toBe(value);await expect(article.getByText('These are complete reader-field documents.',{exact:false})).toBeVisible();}
    expect(modes.filter(x=>x==='rules')).toHaveLength(2);expect(modes.filter(x=>x==='live-rules')).toHaveLength(1);expect(modes).not.toContain('visual');await expect(page.locator('.memory-reference-root')).toHaveCount(0);await expect(page.getByRole('alert')).toHaveCount(0);
    const levels=await book.getByRole('heading').evaluateAll(nodes=>nodes.map(n=>Number(n.tagName.slice(1))));expect(levels[0]).toBe(1);levels.slice(1).forEach((n,i)=>expect(n).toBeLessThanOrEqual(levels[i]+1));
    const styles=await book.evaluate(book=>{const fields=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textTransform','marginTop','marginBottom'];return ['h1','h2','h3','p','li'].map(tag=>{const node=book.querySelector(tag)!,ref=document.createElement(tag);document.querySelector('main')!.append(ref);const a=getComputedStyle(node),b=getComputedStyle(ref);const out={tag,actual:Object.fromEntries(fields.map(f=>[f,a[f as keyof CSSStyleDeclaration]])),expected:Object.fromEntries(fields.map(f=>[f,b[f as keyof CSSStyleDeclaration]]))};ref.remove();return out;});});for(const style of styles)expect(style.actual,style.tag).toEqual(style.expected);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:test.info().outputPath(`all-writing-rules-${width}-${theme}.png`)});
    await page.getByRole('link',{name:'Horoscope endings',exact:true}).click();await expect(amendments.getByRole('heading',{name:'Horoscope endings — November 6 owner amendment',exact:true})).toBeInViewport();await page.screenshot({path:test.info().outputPath(`all-writing-rules-endings-${width}-${theme}.png`)});
    await page.reload();await expect(book).toHaveAttribute('data-complete','true');await expect(book.locator('article[data-source-path]')).toHaveCount(repo.documents.length);await expect(amendments.getByText(/A horoscope has no required concluding paragraph\./u)).toBeVisible();
    for(const mode of ['rules','live-rules'])expect((await page.request.get(`/api/admin/memory-graph?mode=${mode}`)).status()).toBe(401);
    await page.getByRole('link',{name:'Memory graph',exact:true}).click();await expect(page.getByRole('button',{name:'Fit',exact:true})).toBeVisible();
  });
}

test('repository failure remains explicit and Try again recovers the real complete reference',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','memory-browser-fixture'));let fail=true;
  await page.route('**/api/admin/memory-graph?mode=rules',route=>fail?route.fulfill({status:500,json:{ok:false,error:'Synthetic repository source unavailable'}}):route.continue());
  await page.goto(readerUrl);await expect(page.getByRole('alert')).toContainText('Synthetic repository source unavailable');await expect(page.getByRole('region',{name:'All writing rules',exact:true})).toHaveCount(0);fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByRole('region',{name:'All writing rules',exact:true})).toHaveAttribute('data-complete','true');
});

for(const failed of ['profiles','feedback'])test(`unavailable ${failed} is not an empty success and retries independently`,async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','memory-browser-fixture'));let fail=true,repoReads=0;
  await page.route('**/api/admin/memory-graph?**',async route=>{const mode=new URL(route.request().url()).searchParams.get('mode');if(mode==='rules')repoReads++;
    if(mode==='live-rules'&&fail){const response=await route.fetch(),data=await response.json();data.live.complete=false;data.live[failed]={status:'unavailable',error:`Synthetic ${failed} service unavailable`};await route.fulfill({response,json:data});}else await route.continue();});
  await page.goto(readerUrl);const book=page.getByRole('region',{name:'All writing rules',exact:true});await expect(book).toHaveAttribute('data-complete','false');await expect(page.getByRole('alert')).toHaveCount(1);await expect(page.getByText('No active Studio corrections were returned by the complete current snapshot.',{exact:true})).toHaveCount(0);
  if(failed==='profiles')await expect(book.getByRole('article',{name:/^Owner instruction /u}).first()).toBeVisible();else await expect(book.getByRole('article',{name:'daily horoscope instructions',exact:true})).toBeVisible();
  const count=repoReads;fail=false;await page.getByRole('button',{name:'Retry Studio guidance',exact:true}).click();await expect(book).toHaveAttribute('data-complete','true');expect(repoReads).toBe(count);await expect(page.getByRole('alert')).toHaveCount(0);
});

test('reference formatting safely renders tables, code, quotes and literal untrusted HTML',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','memory-browser-fixture'));
  const body='# Synthetic formatting boundary\n\n> Complete **quoted** paragraph.\n\n| First | Second |\n| --- | --- |\n| Full value | Final value |\n\n```js\nconst full = "Do not execute";\n```\n\n<img src="https://invalid.test/private" onerror="alert(1)">\n\n[Danger](javascript:alert(1))\n';
  await page.route('**/api/admin/memory-graph?mode=rules',async route=>{const response=await route.fetch();const data=await response.json();data.rulebook.documents.push({id:'synthetic-format',title:'Synthetic formatting boundary',path:'tests/synthetic-reference.md',role:'Synthetic renderer control',kind:'rule',body,bodySha256:hash(body),sourceUrl:null,qualifiedBy:[]});await route.fulfill({response,json:data});});
  await page.goto(readerUrl);const article=page.getByRole('article',{name:'Synthetic formatting boundary',exact:true});await expect(article.locator('table')).toBeVisible();await expect(article.locator('td')).toHaveText(['Full value','Final value']);await expect(article.locator('pre code')).toHaveText('const full = "Do not execute";');await expect(article.locator('blockquote strong')).toHaveText('quoted');await expect(article.locator('img,script,a[href^="javascript:"]')).toHaveCount(0);await expect(article.getByText('<img src="https://invalid.test/private" onerror="alert(1)">',{exact:true})).toBeVisible();
});

test('anonymous full-rulebook page preserves the existing owner sign-in boundary and return URL',async({page})=>{
  await page.goto(readerUrl);await expect(page.getByRole('heading',{name:'Writing standard',exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'All writing rules',exact:true})).toHaveCount(0);await expect(page.getByLabel('Emergency admin secret',{exact:true})).toHaveAttribute('type','password');const href=await page.getByRole('link',{name:'Sign in as owner',exact:true}).getAttribute('href');expect(new URL(href!,'http://localhost').searchParams.get('returnTo')).toBe(readerUrl);
});
