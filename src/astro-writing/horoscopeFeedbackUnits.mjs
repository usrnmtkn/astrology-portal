import {createHash} from 'node:crypto';
import {HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';

export const HOROSCOPE_FEEDBACK_UNIT_SELECTION='horoscope-feedback-units/v1';
const names=HOROSCOPE_SIGNS.join('|');

/** Recognize a complete twelve-sign collection only. Unknown/mixed documents
 * retain their full transport. Select a whole requested-sign unit, not a quote
 * or summary; the immutable rejection and its scope remain in the feedback store. */
export function horoscopeFeedbackUnit(text,sign) {
  if(!HOROSCOPE_SIGNS.includes(sign))throw new Error('Choose a valid horoscope feedback sign.');
  const headings=[...text.matchAll(new RegExp(`^(?:#{1,4}[ \\t]+)?(${names})[ \\t]*(?:&|/)[ \\t]*(${names})[ \\t]+Rising[ \\t]*\\r?$`,'gimu'))];
  if(headings.length!==12||headings.some((h,i)=>h[1].toLowerCase()!==HOROSCOPE_SIGNS[i]||h[2].toLowerCase()!==HOROSCOPE_SIGNS[i]))return null;
  const starts=headings.map(h=>{
    const before=text.slice(0,h.index),label=before.match(new RegExp(`(?:^|\\n)(${names})[ \\t]*\\r?\\n(?:[ \\t]*\\r?\\n)?$`,'iu'));
    return label&&label[1].toLowerCase()===h[1].toLowerCase()?before.length-label[0].length+(label[0].startsWith('\n')?1:0):h.index;
  });
  if(text.slice(0,starts[0]).trim()||headings.some((h,i)=>!text.slice(h.index+h[0].length,starts[i+1]??text.length).trim()))return null;
  const index=HOROSCOPE_SIGNS.indexOf(sign),start=starts[index],end=starts[index+1]??text.length,selected=text.slice(start,end);
  return {text:selected,selection:{version:HOROSCOPE_FEEDBACK_UNIT_SELECTION,sign,start,end,
    originalRejectedTextSha256:createHash('sha256').update(text).digest('hex'),
    selectedUnitSha256:createHash('sha256').update(selected).digest('hex'),
    use:'Complete requested-sign negative example. Original correction targets and owner reason remain unchanged; the full twelve-sign rejection stays in its source and full-set review.'}};
}
