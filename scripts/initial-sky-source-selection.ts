import {skyNodeDisplayPositions} from '../apps/web/src/features/sky/skyHelpers';
import {skyPlacementSelection,skyPlacementSourceInSelection,isSkyPlacementFallbackPartitionKey} from '../apps/web/src/services/skyPlacementSourceScope';
import {isSkyListDashboardRow} from '../apps/web/src/services/skyDashboardScope';
import {skyIngressEssayPublicationKeys} from '../apps/web/src/content/skyIngressEssayPublicationKeys';
import {lunationReaderContentKeys} from '../apps/web/src/content/lunationArticleIdentity';
import {keys as manifestKeys} from '../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json';
import type {ContentPublication} from '../apps/web/src/content/contentPublicationState';
import type {SkySnapshot} from '../apps/web/src/types';

const placementKeys=new Set(manifestKeys.map(key=>key.slice(key.indexOf(':')+1)));
export function selectedInitialSkySourceKey(sky:SkySnapshot) {
  const selection=skyPlacementSelection(sky.positions);
  return (key:string)=>(placementKeys.has(key)||isSkyPlacementFallbackPartitionKey(key)
    ||/^sky-placement\/(?:article|retrograde)\//u.test(key))&&skyPlacementSourceInSelection(key,selection);
}
/** Key discovery must not wait for the full prose renderer to initialize. */
export function requiredInitialSkySourceKeys(sky:SkySnapshot,publications:ContentPublication[]) {
  const selectedKey=selectedInitialSkySourceKey(sky);
  const editions=new Set(skyNodeDisplayPositions(sky.positions).flatMap(position=>skyIngressEssayPublicationKeys(publications,{
    planet:position.planet.toLowerCase().replace(/\s+/gu,'-'),sign:position.sign.toLowerCase()
  })));
  const lunations=new Set(sky.moonEvent?lunationReaderContentKeys({startsAt:sky.moonEvent.occursAt,sign:sky.moonEvent.sign,title:sky.moonEvent.name}):[]);
  return publications.filter(row=>selectedKey(row.content_key)||isSkyListDashboardRow(row)||editions.has(row.content_key)||lunations.has(row.content_key)).map(row=>row.content_key);
}
