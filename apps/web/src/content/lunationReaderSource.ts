import {datedLunationContentKey,lunationReaderContentKeys} from './lunationArticleIdentity';
export {lunationReaderContentKeys} from './lunationArticleIdentity';
import {resolveCmsSurfaceOverride,type CmsGeneratedContentMap} from './cmsSurfaceOverrides';
import {fallbackArchitectureV3AuthoredContentForKey} from '../services/generatedContent';
import {contentPublication,publicationAllowsContent} from './contentPublicationState';

type Event=Parameters<typeof datedLunationContentKey>[0];
/** Date-specific approved copy wins. A publication hold/retirement never reveals older copy. */
export function resolveLunationReaderSource(event:Event,content?:CmsGeneratedContentMap|null) {
  const keys=lunationReaderContentKeys(event);
  const live=resolveCmsSurfaceOverride(content,keys);
  if(live)return live;
  const reusable=keys.find(key=>key.startsWith('authored/'));
  if(!reusable)return null;
  if(contentPublication(reusable)||!publicationAllowsContent(reusable))return {contentKey:reusable,body:'',headline:null,sourceKeys:[reusable],unavailable:true};
  const fallback=fallbackArchitectureV3AuthoredContentForKey(reusable);
  return fallback?.body?{contentKey:reusable,body:fallback.body,headline:null,sourceKeys:[reusable]}:null;
}
