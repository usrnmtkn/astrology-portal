import {expect,test} from '../helpers/polish-test';
import {compileSkyArticleEdition} from '../../apps/web/src/content/skyArticleTemplateCompiler';
import {skyIngressEssayFields} from '../../apps/web/src/content/skyIngressEssay.mjs';
import {bundledPublications} from '../helpers/bundled-publications';
import {readerResponse} from '../helpers/reader-response';
import {expectReadableTheme} from '../helpers/theme-contrast';
import skyHandler from '../../api/sky';
import type {IncomingMessage,ServerResponse} from 'node:http';

async function venusArticle() {
  const slotValues=Object.fromEntries(skyIngressEssayFields.map(({name})=>[name,`Synthetic ${name}.`]));
  Object.assign(slotValues,{articleTitle:'Venus Rx in Scorpio 2026',overviewHeading:'Synthetic overview',overviewBody:'Complete fixture opening.\n\nComplete fixture final sentence.',closingHeading:'Synthetic closing',closingBody:'Synthetic complete close.',priorOccurrenceSection:'',otherDatesSection:'',majorTransitSections:'Synthetic supported contact.'});
  const edition=await compileSkyArticleEdition({format:'ingress-essay-v2',planet:'venus',sign:'scorpio',entryYear:2026,
    validFrom:'2026-09-10',validTo:'2027-01-07',transitStartInstant:'2026-09-10T00:00:00Z',transitEndInstant:'2027-01-07T00:00:00Z',
    referenceTimeZone:'America/New_York',templateKey:'sky/article-template/venus/scorpio',templateBody:'',tldr:'Synthetic saved dated summary.',slotValues,housePassages:[]});
  return {id:'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',content_key:edition.contentKey,surface:'sky',mode:'article',status:'LIVE',lane:'serving',review_state:null,
    event_type:'sky-article-edition',block_type:'sky_article',updated_at:'2026-10-01T00:00:00Z',headline:edition.headline,body:edition.body,summary:edition.tldr,
    sections:{skyArticleEdition:edition},source_snapshot:{ownerApproval:{approved:true,action:'approve-sky-article-edition',contentKey:edition.contentKey,
      templateKey:edition.templateKey,templateHash:edition.templateHash,fixedProseHash:edition.fixedProseHash,compiledHash:edition.compiledHash}}};
}

for(const width of [390,1440])for(const theme of ['light','dark'])test(`Sky placement date labels ${width} ${theme}`,async({page})=>{
  test.setTimeout(120_000);await page.setViewportSize({width,height:1000});
  await page.clock.setFixedTime(new Date('2026-10-02T16:00:00Z'));await bundledPublications(page);
  await page.addInitScript(theme=>{
    localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:pageAnimations','off');
    localStorage.setItem('tldrastro:selectedLocation',JSON.stringify({label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'}));
  },theme);
  const row=await venusArticle();
  await page.route('**/api/content-reader',route=>route.fulfill({json:readerResponse([row])}));
  await page.route('**/api/sky?**',async route=>{
    const response={statusCode:200,setHeader(){},end(body:string){void route.fulfill({status:this.statusCode,contentType:'application/json',body});}};
    await skyHandler({method:'GET',url:route.request().url()} as IncomingMessage,response as unknown as ServerResponse);
  });
  await page.goto('/?date=2026-10-02#sky/placement/venus/scorpio');
  await expect(page.locator('#sky-detail-title')).toHaveText('Venus Rx in Scorpio 2026',{timeout:60_000});
  const dates=page.locator('.sky-detail-id .article-duration');
  const expected=['Venus Rx September 10 to October 25, 2026','Venus in Scorpio September 10, 2026 to January 7, 2027'];
  await expect(dates).toHaveText(expected);
  const paragraphs=page.locator('.article-body-inner').first();
  await expect(paragraphs).toContainText('Complete fixture opening.');await expect(paragraphs).toContainText('Complete fixture final sentence.');
  const copy=await paragraphs.innerText();
  await expectReadableTheme(page,'.sky-detail-id .article-duration');
  await expect(dates.first()).toHaveCSS('font-size',width<800?'14px':'18px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/sky-placement-date-labels-${width}-${theme}.png`});
  await page.reload();await expect(dates).toHaveText(expected,{timeout:60_000});await expect(paragraphs).toHaveText(copy,{useInnerText:true});
  await page.goto('/?date=2026-10-24#sky/placement/mercury/scorpio');
  await expect(page.locator('#sky-detail-title')).toHaveText('Mercury Rx in Scorpio',{timeout:60_000});
  await expect(dates.first()).toHaveText(/^Mercury Rx Oct 24, 2026 - Nov 13, 2026$/u);
  await expect(dates.nth(1)).toContainText('Mercury in Scorpio');
  await page.goto('/?date=2026-10-02#sky/placement/sun/libra');
  await expect(dates.first()).toHaveText('September 22 to October 23, 2026',{timeout:60_000});
  await expect(dates.first()).not.toContainText('Rx');
});
