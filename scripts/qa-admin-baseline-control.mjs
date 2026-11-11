import fs from 'node:fs';

// Diagnostic only: retain the original route/error assertions, but capture the
// three admin surfaces and typography instead of comparing historical goldens.
const file='tests/visual/visual-regression-baseline.spec.ts';
let source=fs.readFileSync(file,'utf8');
for(const name of ['admin-home-mobile','admin-home-desktop','admin-content-library-desktop']){
  const original=`await expect.soft(page).toHaveScreenshot("${name}.png", screenshotOptions);`;
  if(source.split(original).length!==2)throw new Error(`Expected one existing screenshot: ${name}`);
  source=source.replace(original,`await captureAdminControl(page, "${name}");`);
}
source+=`
async function captureAdminControl(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const selectors=['h1','.admin-access-gate-intro > p:nth-of-type(2)','.admin-sidebar button','body'];
  const typography=await page.evaluate(selectors => selectors.map(selector => {
    const element=document.querySelector(selector);
    if(!element)return {selector,missing:true};
    const style=getComputedStyle(element),box=element.getBoundingClientRect();
    return {selector,fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,
      lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,width:box.width,height:box.height};
  }),selectors);
  const session=await page.context().newCDPSession(page);
  await session.send('DOM.enable');await session.send('CSS.enable');
  const {root}=await session.send('DOM.getDocument');
  const resolvedFonts=[];
  for(const selector of selectors){
    const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector});
    if(nodeId){const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});resolvedFonts.push({selector,fonts});}
  }
  await session.detach();
  const output=test.info().outputPath(name);
  await page.screenshot({path:output+'.png',animations:'disabled',fullPage:false});
  const {writeFile}=await import('node:fs/promises');
  await writeFile(output+'.json',JSON.stringify({viewport:page.viewportSize(),typography,resolvedFonts},null,2));
}
`;
fs.writeFileSync(file,source);
console.log('Prepared diagnostic-only three-surface capture; original functional assertions retained');
