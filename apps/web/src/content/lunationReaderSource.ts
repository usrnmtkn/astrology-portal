import {datedLunationContentKey,lunationReaderContentKeys} from './lunationArticleIdentity';
export {lunationReaderContentKeys} from './lunationArticleIdentity';
import {resolveCmsSurfaceOverride,type CmsGeneratedContentMap} from './cmsSurfaceOverrides';
import {fallbackArchitectureV3AuthoredContentForKey} from '../services/generatedContent';
import {publicationAllowsContent} from './contentPublicationState';
import {isReusableLunationKey, lunationTimingValues, renderLunationTiming} from '../../../../src/shared/lunationTimingVariables';

type Event=Parameters<typeof datedLunationContentKey>[0];
/** Date-specific approved copy wins. A publication hold/retirement never reveals older copy. */
export function resolveLunationReaderSource(event:Event,content?:CmsGeneratedContentMap|null,timeZone?:string) {
  const keys=lunationReaderContentKeys(event);
  const values=lunationTimingValues(event.startsAt,timeZone);
  const live=resolveCmsSurfaceOverride(content,keys,values);
  if(live){
    if(!isReusableLunationKey(live.contentKey))return live;
    const body=renderLunationTiming(live.body,values);
    return {...live,body,headline:live.headline ? renderLunationTiming(live.headline,values) : null,...(!body?{unavailable:true}:{})};
  }
  const reusable=keys.find(key=>key.startsWith('authored/'));
  if(!reusable)return null;
  if(!publicationAllowsContent(reusable))return {contentKey:reusable,body:'',headline:null,sourceKeys:[reusable],unavailable:true};
  const fallback=fallbackArchitectureV3AuthoredContentForKey(reusable);
  if(!fallback?.body)return null;
  const body=renderLunationTiming(fallback.body,values);
  return {contentKey:reusable,body,headline:null,sourceKeys:[reusable],...(!body?{unavailable:true}:{})};
}
