import {createHash} from 'node:crypto';
import {HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {horoscopeHouse,horoscopeEventsInWindow,horoscopeRelationSnapshots} from './horoscopeDevelopments.mjs';
import {isOrdinaryMoonIngress} from './dailyWriterFacts.mjs';

export const HOROSCOPE_CONFIGURATION_EVIDENCE='horoscope-configuration-evidence/v1';
export const HOROSCOPE_SIGN_DEFINITIONS='packages/astro-knowledge/data/primitives/signs.json';
export const HOROSCOPE_DIGNITY_DEFINITIONS='packages/astro-knowledge/data/primitives/dignities.json';
export const HOROSCOPE_DIGNITY_MEANING='packages/astro-knowledge/data/modifiers/dignity.json';
export const CONFIGURATION_RESEARCH_LABEL='CONFIGURATION EVIDENCE — BEFORE COMPOSITION';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Neutral research bindings, not a generated story or another calculation.
 * Every position keeps its reference scope; every event keeps its own time.
 * A connection between dated events does not establish simultaneity. */
export function horoscopeConfigurationEvidence({brief,rising,developments},{signs,dignities,dignityMeaning}) {
  if(!['daily','weekly'].includes(brief.window.period)||!HOROSCOPE_SIGNS.includes(rising))throw new Error('Configuration evidence needs a Daily or Weekly rising-sign audience.');
  const definitions=new Map(signs.map(sign=>[sign.id,sign]));
  for(const sign of HOROSCOPE_SIGNS)if(!definitions.get(sign)?.traditionalRuler||definitions.get(sign).voiceNeutral!==true)throw new Error('Governed traditional ruler definitions are unavailable.');
  if(dignities.some(entry=>entry.voiceNeutral!==true))throw new Error('Dignity evidence must be neutral knowledge, not voice evidence.');
  if(dignityMeaning?.voiceNeutral!==true||!dignityMeaning.definition)throw new Error('The neutral dignity definition is unavailable.');
  const source=(entry,sourcePath)=>({sourcePath,sourceId:entry.id,sourceStatus:entry.status,sourceRecordSha256:hash(entry)});
  const houses=HOROSCOPE_SIGNS.map(sign=>({sign,house:horoscopeHouse(sign,rising),ruler:definitions.get(sign).traditionalRuler,
    source:source(definitions.get(sign),HOROSCOPE_SIGN_DEFINITIONS)})).sort((a,b)=>a.house-b.house);
  const bind=({planet,sign,motion})=>{
    planet=planet?.toLowerCase()??null;sign=sign?.toLowerCase()??null;
    const rulesHouses=houses.filter(house=>house.ruler===planet).map(house=>house.house);
    if(!sign)return {planet,sign:null,house:null,motion:motion??null,rulesHouses,signRuler:null,essentialConditions:[],
      missing:'No participant sign supplied at this event; do not substitute its reference position.'};
    const definition=definitions.get(sign);if(!definition)throw new Error('A calculated sign has no ruler definition.');
    return {planet,sign,house:horoscopeHouse(sign,rising),motion:motion??null,
      rulesHouses,
      signRuler:definition.traditionalRuler,signRulerSource:source(definition,HOROSCOPE_SIGN_DEFINITIONS),
      essentialConditions:dignities.filter(entry=>entry.planet===planet&&entry.signs.includes(sign))
        .map(entry=>({classification:entry.dignity,...source(entry,HOROSCOPE_DIGNITY_DEFINITIONS)}))};
  };
  const positions=brief.positions.map(bind);
  const ruler=definitions.get(rising).traditionalRuler;
  const events=horoscopeEventsInWindow(brief).filter(event=>!isOrdinaryMoonIngress(event)).map(event=>{
    const development=developments.events.find(item=>item.id===event.id);
    const participants=event.type==='aspect'?event.planets.map((planet,index)=>bind({planet,
      sign:index===0?event.fromSign:event.toSign,motion:index===0?event.fromMotion:event.toMotion}))
      :[bind({planet:event.type==='lunation'?'moon':event.planet,sign:event.sign,
        motion:event.type==='station'?event.direction:null})];
    return {id:event.id,type:event.type,startsAt:event.startsAt,participants,
      ...(event.aspect?{aspect:event.aspect}:{}),
      governedMeaning:development?{developmentId:development.id,
        sourceIds:[development.meaning?.sourceId,...(development.placements??[]).map(p=>p.meaning?.sourceId)].filter(Boolean)}:null,
      scope:'Supplied dated event only. A participant state at this event does not establish another planet’s position then.'};
  });
  const eventLinks=[];
  for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++){
    const shared=events[i].participants.filter(a=>events[j].participants.some(b=>a.planet===b.planet)).map(a=>a.planet);
    if(shared.length)eventLinks.push({eventIds:[events[i].id,events[j].id],sharedPlanets:shared,
      simultaneous:events[i].startsAt===events[j].startsAt,
      scope:'Connection among supplied events; not proof of a simultaneous multi-planet configuration.'});
  }
  return {version:HOROSCOPE_CONFIGURATION_EVIDENCE,risingSign:rising,
    role:'Neutral pre-composition research. This is not owner voice, a prose outline, personal biography or additional sky coverage.',
    chartRuler:{planet:ruler,referencePlacement:positions.find(p=>p.planet===ruler)??null,
      suppliedEventIds:events.filter(event=>event.participants.some(p=>p.planet===ruler)).map(event=>event.id)},
    referenceContext:{referenceDate:brief.referenceDate,scope:'Existing reference positions only; not a duration or a claim that conditions last throughout the publication window.',positions,houses,
      dispositorLinks:positions.map(position=>({planet:position.planet,signRuler:position.signRuler,
        rulerReferenceHouse:positions.find(p=>p.planet===position.signRuler)?.house??null}))},
    events,eventLinks,
    suppliedConfigurations:horoscopeRelationSnapshots(brief).flatMap(snapshot=>(snapshot.configurations??[]).map(configuration=>({at:snapshot.at,...configuration,
      scope:'Supplied simultaneous configuration at this snapshot only.'}))),
    conditionMeaning:{...source(dignityMeaning,HOROSCOPE_DIGNITY_MEANING),field:'definition',text:dignityMeaning.definition,
      scope:'Neutral meaning only. This packet classifies only the supplied major sign dignities; no bounds, decan, sect, solar phase or numeric strength score is calculated.'},
    coverage:{signedCalculationCoverage:brief.coverage,relationalSnapshotsSupplied:Boolean(brief.relationalContext),
      missingReferenceRuler:!positions.some(p=>p.planet===ruler),
      note:'No unsupplied aspect, configuration, reception interpretation or historical cycle is inferred. Routine Moon ingresses stay in the existing timing/private context rather than this narrative research. Empty conditions do not establish a default dignity classification. Source status is retained; neutral definitions are not owner-approved prose.'},
    sourceIdentity:{signDefinitions:hash(signs),dignityDefinitions:hash(dignities),dignityMeaning:hash(dignityMeaning)}};
}

export function configurationEvidenceInput(evidence) {
  if(!evidence)return '';
  return `${CONFIGURATION_RESEARCH_LABEL}\n${JSON.stringify(evidence)}\nUse these bindings to develop a configuration-specific interpretation before composing the reading. Resolve meanings through the attached governed sources and develop the argument in the language of the complete designated author passages. House topics alone are not an interpretation. This research packet is not a checklist to narrate, a required problem or a separate reader-facing report.`;
}
