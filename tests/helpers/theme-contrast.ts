import { expect, type Page } from '@playwright/test';

// Check the rendered foreground against its composited ancestor surfaces.
// Include below-fold cards, but exclude collapsed, disabled and hidden content.
export async function expectReadableTheme(page: Page, selectors: string, minimumRatio = 0) {
  const results = await page.locator(selectors).evaluateAll((nodes, minimumRatio) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    const rgba = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const pixel = Array.from(context.getImageData(0, 0, 1, 1).data);
      return [pixel[0], pixel[1], pixel[2], pixel[3] / 255];
    };
    const over = (fg: number[], bg: number[]) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3])).concat(1);
    const luminance = (color: number[]) => color.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    return nodes.filter(node => node.getBoundingClientRect().height > 0 && !node.closest('[disabled], [aria-hidden="true"]')).map(node => {
      const style = getComputedStyle(node);
      const ancestors: Element[] = [];
      for (let current: Element | null = node; current; current = current.parentElement) ancestors.unshift(current);
      let background = rgba(getComputedStyle(document.documentElement).getPropertyValue('--bg'));
      for (const ancestor of ancestors) background = over(rgba(getComputedStyle(ancestor).backgroundColor), background);
      const angleRect = node.closest('.zodiac-wheel__angle-badge')?.querySelector('rect');
      if (angleRect) background = rgba(getComputedStyle(angleRect).fill);
      const fg = luminance(over(rgba(node instanceof SVGTextElement ? style.fill : style.color), background));
      const bg = luminance(background);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
      return { selector: node.className, text: node.textContent?.trim().slice(0, 60), ratio: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05), minimum: Math.max(minimumRatio, large ? 3 : 4.5) };
    });
  }, minimumRatio);
  expect(results.length).toBeGreaterThan(0);
  expect(results.filter(result => result.ratio < result.minimum)).toEqual([]);
}


// Sample a screenshot with just the tested text hidden, retaining gradients,
// highlights and surfaces. Computed backgroundColor alone misses those layers.
export async function expectRenderedTextContrast(page: Page, selectors: string, minimum = 7) {
  await page.locator(selectors).first().scrollIntoViewIfNeeded();
  const samples=await page.locator(selectors).evaluateAll(nodes=>{
    const samples:{x:number;y:number;color:string;opacity:number}[]=[];
    for(const node of nodes){
      const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()){
        const text=walker.currentNode,parent=text.parentElement;
        if(!parent||!text.textContent?.trim())continue;
        const style=getComputedStyle(parent);let opacity=1;
        for(let current:Element|null=parent;current;current=current.parentElement)opacity*=Number(getComputedStyle(current).opacity);
        const range=document.createRange();range.selectNodeContents(text);
        for(const rect of range.getClientRects()){
          const x=rect.x+rect.width/2,y=rect.y+rect.height/2,hit=document.elementFromPoint(x,y);
          if(rect.width>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&hit&&parent.contains(hit))samples.push({x,y,color:style.color,opacity});
        }
      }
      node.classList.add('contrast-background-probe');
    }
    return samples;
  });
  const probe=await page.addStyleTag({content:'.contrast-background-probe, .contrast-background-probe * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }'});
  let screenshot:Buffer;
  try{screenshot=await page.screenshot();}finally{await probe.evaluate(node=>node.remove());await page.locator('.contrast-background-probe').evaluateAll(nodes=>nodes.forEach(node=>node.classList.remove('contrast-background-probe')));}
  const ratios=await page.evaluate(async({png,samples})=>{
    const image=new Image();image.src=`data:image/png;base64,${png}`;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(image,0,0);
    const colorCanvas=document.createElement('canvas');colorCanvas.width=colorCanvas.height=1;const colorContext=colorCanvas.getContext('2d')!;
    const luminance=(rgb:number[])=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    return samples.map(sample=>{
      const background=Array.from(context.getImageData(Math.floor(sample.x*image.width/innerWidth),Math.floor(sample.y*image.height/innerHeight),1,1).data).slice(0,3);
      colorContext.clearRect(0,0,1,1);colorContext.fillStyle=sample.color;colorContext.fillRect(0,0,1,1);const rgba=Array.from(colorContext.getImageData(0,0,1,1).data),alpha=rgba[3]/255*sample.opacity;
      const foreground=rgba.slice(0,3).map((value,i)=>value*alpha+background[i]*(1-alpha));
      const fg=luminance(foreground),bg=luminance(background);
      return {ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05),background,color:sample.color};
    });
  },{png:screenshot!.toString('base64'),samples});
  expect(ratios.length).toBeGreaterThan(0);expect(ratios.filter(sample=>sample.ratio<minimum)).toEqual([]);
}
