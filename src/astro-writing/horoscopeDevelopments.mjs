import {HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';

export const horoscopeHouse = (sign, rising) => {
  const placement = HOROSCOPE_SIGNS.indexOf(String(sign).toLowerCase());
  const audience = HOROSCOPE_SIGNS.indexOf(String(rising).toLowerCase());
  if (placement < 0 || audience < 0) throw new Error('A horoscope house requires calculated and audience signs.');
  return (placement - audience + 12) % 12 + 1;
};

export function horoscopeEventPlanet(event) {
  return String(event.type === 'lunation' ? 'Moon' : event.planet ?? '').toLowerCase();
}

function eventTitle(event) {
  if(event.title)return event.title;
  // Older signed briefs stored the phase in the calculation ID, not a title.
  const phase=String(event.id).match(/^lunation-(new-moon|full-moon|first-quarter|last-quarter)-/iu)?.[1];
  const label=phase ? phase.replaceAll('-',' ').replace(/\b\w/gu,c=>c.toUpperCase())
    : `${event.planet??'Moon'} ${event.type==='ingress'?'enters':event.type}`;
  return `${label}${event.type==='ingress'?'':' in'} ${event.sign}`;
}

export function horoscopeEventsInWindow(brief) {
  const start = Date.parse(brief.window.startsAt), end = Date.parse(brief.window.endsAt);
  return (brief.events ?? []).filter(event => {
    const at = Date.parse(event.startsAt);
    return at >= start && at < end;
  }).sort((a,b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
}

export function horoscopeRelationSnapshots(brief) {
  return (brief.relationalContext?.snapshots??[]).filter(s=>s.at>=brief.window.startsAt&&s.at<brief.window.endsAt);
}

// Sampled aspects remain separate from exact events and their dates.
export function horoscopeSampledAspects(brief) {
  return horoscopeRelationSnapshots(brief).flatMap(s=>s.aspects.map((a,i)=>({id:`sample/${s.at}/${i}`,type:'aspect',...a,startsAt:s.at,sampled:true})));
}

/** Each fact retains its own meaning, house and time. Never infer an event from a snapshot. */
export function buildHoroscopeDevelopments(brief, rising, {placements, houses, aspects=[]}) {
  const localTime = new Intl.DateTimeFormat('en-US', {timeZone:brief.window.timeZone,
    weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
  const bind = (planet, sign) => {
    planet = String(planet).toLowerCase(); sign = String(sign).toLowerCase();
    const meaning = placements[`${planet}-${sign}`];
    // Unsupported points remain in the calculated brief, not an invented interpretation.
    if (!meaning) return null;
    const house = rising==='overview'?null:horoscopeHouse(sign,rising);
    const domain = rising==='overview'?'shared experience, no personal house':houses.find(h => h.id === String(house))?.plainTranslation;
    if (!domain) throw new Error('A calculated horoscope house has no governed meaning.');
    return {planet,sign,house,domain,meaning:{sourceId:meaning.id,sourcePath:meaning.sourcePath,
      status:meaning.status,temporaryMeaning:meaning.collective_shift,
      role:'reviewed meaning only; not owner voice or reader copy'}};
  };
  const events = horoscopeEventsInWindow(brief).flatMap(event => {
    if(event.type==='aspect') {
      const definition=aspects.find(a=>a.id===event.aspect&&a.major);
      const first=bind(event.planets?.[0],event.fromSign), second=bind(event.planets?.[1],event.toSign);
      if(!definition||!first||!second)return [];
      return [{id:event.id,type:event.type,planets:event.planets,aspect:event.aspect,placements:[first,second],
        domain:[first.domain,second.domain].join('; '),startsAt:event.startsAt,localTiming:localTime.format(new Date(event.startsAt)),title:eventTitle(event),
        meaning:{sourcePath:'packages/astro-knowledge/data/primitives/aspects.json',sourceId:definition.id,
          traditional:definition.traditional,role:'knowledge-base interpretive meaning; not owner voice or a predicted personal event'},
        timingScope:'exact sky aspect; not a guaranteed personal event or a multi-planet configuration'}];
    }
    const binding = bind(horoscopeEventPlanet(event),event.sign);
    return binding ? [{id:event.id,type:event.type,...binding,startsAt:event.startsAt,
      localTiming:localTime.format(new Date(event.startsAt)),title:eventTitle(event),
      fromSign:event.fromSign ?? null,direction:event.direction ?? null,
      timingScope:'exact sky event; a possible personal development has no guaranteed date'}] : [];
  });
  const background = brief.positions.flatMap(position => {
    const binding = bind(position.planet,position.sign);
    return binding ? [{id:`reference/${binding.planet}`,type:'reference-position',...binding,
      referenceDate:brief.referenceDate,motion:position.motion,
      timingScope:'reference instant only; not an ingress or proof of a period-long placement'}] : [];
  });
  const relationships=brief.relationalContext?{
    schema:brief.relationalContext.schema,coverage:brief.relationalContext.coverage,
    snapshots:horoscopeRelationSnapshots(brief).map(snapshot=>({...snapshot,
      localDate:localTime.format(new Date(snapshot.at)),
      positions:snapshot.positions.map(position=>{
        const binding=bind(position.planet,position.sign);
        return {...position,house:binding?.house??null,domain:binding?.domain??null,meaningSourceId:binding?.meaning.sourceId??null};
      })})),
    use:'Select relationships that explain this reading. Connect the participating life areas through a developed human situation, without listing every snapshot or configuration. All aspects in a configuration coexist at the stated instant. Sampled aspects have their own orb and phase; exact event dates remain in events. Rulers are traditional. No historical recurrence or previous cycle date is supplied.'
  }:null;
  return {schema:'horoscope-developments/v1',period:brief.window.period,timeZone:brief.window.timeZone,
    events,background,relationships,uninterpretedEventIds:horoscopeEventsInWindow(brief).filter(e=>!events.some(d=>d.id===e.id)).map(e=>e.id),
    use:'Choose related developments for this sign. Chronological order is factual context, not a required prose sequence. Background positions are optional context, not a compulsory lead. Each house belongs only to its attached placement or event.'};
}
