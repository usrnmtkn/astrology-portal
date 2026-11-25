import {createHash} from 'node:crypto';
import {isOrdinaryMoonIngress} from './dailyWriterFacts.mjs';

export const DAILY_COMPONENT_MEANINGS='daily-component-meanings/v1';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const DAILY_PLANET_DEFINITIONS='packages/astro-knowledge/data/primitives/planets.json';
export const DAILY_SIGN_DEFINITIONS='packages/astro-knowledge/data/primitives/signs.json';

/** Neutral component definitions are interpretive evidence, not new sky facts,
 * owner prose, natal biography or instructions for a paragraph sequence. */
export function dailyComponentMeanings(developments,{planets,signs}) {
  const bindings=[...developments.events.filter(event=>!isOrdinaryMoonIngress(event)).flatMap(event=>event.placements??[event]),
    ...developments.background.filter(entry=>entry.planet!=='moon')];
  const unique=new Map(bindings.map(binding=>[`${binding.planet}/${binding.sign}`,binding]));
  const records=[...unique.values()].map(({planet,sign})=>{
    const planetDefinition=planets.find(entry=>entry.id===planet),signDefinition=signs.find(entry=>entry.id===sign);
    if(!signDefinition||signDefinition.voiceNeutral!==true||planetDefinition&&planetDefinition.voiceNeutral!==true)throw new Error('The Daily component meaning source is unavailable.');
    return {planet,sign,
      planetDefinition:planetDefinition?{sourcePath:DAILY_PLANET_DEFINITIONS,sourceId:planetDefinition.id,sourceStatus:planetDefinition.status,
        sourceRecordSha256:digest(planetDefinition),governs:planetDefinition.governs,verb:planetDefinition.verb}:null,
      signDefinition:{sourcePath:DAILY_SIGN_DEFINITIONS,sourceId:signDefinition.id,sourceStatus:signDefinition.status,
        sourceRecordSha256:digest(signDefinition),element:signDefinition.element,modality:signDefinition.mode,
        traditionalRuler:signDefinition.traditionalRuler,keywords:signDefinition.keywords}};
  });
  return {version:DAILY_COMPONENT_MEANINGS,role:'neutral knowledge-base meaning only; not owner voice, reader wording or additional calculated facts',records,
    use:'Planet functions and sign qualities describe different components. Interpret their relationship in the attached calculated life area. A sign is not a house. Source status is retained; these definitions are not approved reader prose. Missing outer-planet definitions remain unknown. The definitions establish no natal biography, hidden motive, personal event or guaranteed outcome.'};
}
