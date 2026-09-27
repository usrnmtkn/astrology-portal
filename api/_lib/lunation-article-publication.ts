import {createHash} from 'node:crypto';
import {AdminHttpError} from './admin-http.js';
import {calculateLunationArticleFacts,lunationArticleEvents} from './lunation-article-facts.js';
import {datedLunationContentKey} from '../../apps/web/src/content/lunationArticleIdentity.js';
import {validateLunationArticle} from '../../src/astro-writing/lunationArticleValidation.mjs';

/** Recheck the final reader copy against calculated facts, never client lint or facts. */
export async function lunationPublicationPatch(row:Record<string,any>) {
  if(row.status!=='LIVE'||!String(row.content_key??'').startsWith('cms/lunation-article/'))return {};
  const match=/^cms\/lunation-article\/(\d{4}-\d{2}-\d{2})\/(new-moon|full-moon)\/([a-z]+)$/u.exec(row.content_key);
  if(!match)throw new AdminHttpError(422,'This lunar article has an invalid event identity. Open it from New & Full Moons & Eclipses.');
  const month=match[1].slice(0,7);
  const event=(await lunationArticleEvents(month,'UTC')).find(event=>datedLunationContentKey(event)===row.content_key);
  if(!event)throw new AdminHttpError(422,'This lunar article does not match a calculated event. Open the correct Moon or eclipse before publishing.');
  const facts=await calculateLunationArticleFacts(month,'UTC',event.id);
  const copy={headline:String(row.headline??''),summary:String(row.summary??''),body:String(row.body??'')};
  const lint=validateLunationArticle({...copy,body:[copy.summary,copy.body].filter(Boolean).join('\n\n')},facts);
  if(!lint.passed)throw new AdminHttpError(422,`Correct these article errors before publishing: ${lint.violations.map((finding:any)=>finding.detail).join(' ')}`);
  return {
    facts:{...row.facts,lunationArticle:facts},
    source_snapshot:{...row.source_snapshot,lunationPublicationCheck:{
      checkedAt:new Date().toISOString(),bodyHash:createHash('sha256').update(JSON.stringify(copy)).digest('hex'),
      lint,event: facts.event
    }}
  };
}
