import {parseNatalSectPlacementKey} from './natalSectPlacement.js';

function record(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

const editorialKey=/^cms\/(?:natal-twelfth-ruler\/(?:you|they)\/(?:introduction|ruler-house\/(?:[1-9]|1[0-2]))|natal-chart-context\/(?:you|they)\/sect\/(?:day|night)|natal-planet-sect\/(?:you|they)\/(?:jupiter|venus|mars|saturn)\/(?:day|night))$/u;

/** Reusable editorial sources only; personal chart readings keep their own lifecycle. */
export function natalEditorialRevisionTarget(value:unknown,variant:'in_depth'|'studio-draft'='in_depth'){
  const row=record(value),facts=record(row.facts),snapshot=record(row.source_snapshot??row.sourceSnapshot),sections=record(row.sections);
  const key=row.content_key??row.contentKey;
  if(typeof key!=='string'||row.surface!=='natal'||row.mode!==variant||(row.block_type??row.blockType)!=='essay'
    ||(row.target_date??row.targetDate)!=null||sections.packageRecord!=null||sections.packageDraft!=null
    ||row.provider==='tldrastro-fallback-architecture-v3'||snapshot.sourcePackage==='tldrastro-fallback-architecture-v3'
    ||facts.fallbackArchitectureV3!=null&&facts.fallbackArchitectureV3!==false
    ||facts.scope!=='editorial_library'||snapshot.contentSystem!=='editorial-library'||facts.audience!==key.split('/')[2])return false;
  if(variant==='studio-draft'&&(row.event_type??row.eventType)!=='standalone-article-revision')return false;
  const placement=parseNatalSectPlacementKey(key);
  return editorialKey.test(key)||Boolean(placement&&facts.planet===placement.planet&&facts.sign===placement.sign
    &&facts.house===placement.house&&facts.sect===placement.sect&&facts.houseSystem==='whole-sign');
}
