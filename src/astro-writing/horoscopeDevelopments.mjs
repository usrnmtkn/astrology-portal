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

export function horoscopeEventsInWindow(brief) {
  const start = Date.parse(brief.window.startsAt), end = Date.parse(brief.window.endsAt);
  return (brief.events ?? []).filter(event => {
    const at = Date.parse(event.startsAt);
    return at >= start && at < end;
  }).sort((a,b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
}

/** Each fact retains its own meaning, house and time. Never infer an event from a snapshot. */
export function buildHoroscopeDevelopments(brief, rising, {placements, houses}) {
  const localTime = new Intl.DateTimeFormat('en-US', {timeZone:brief.window.timeZone,
    weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
  const bind = (planet, sign) => {
    planet = String(planet).toLowerCase(); sign = String(sign).toLowerCase();
    const meaning = placements[`${planet}-${sign}`];
    // Unsupported points remain in the calculated brief, not an invented interpretation.
    if (!meaning) return null;
    const house = horoscopeHouse(sign,rising);
    const domain = houses.find(h => h.id === String(house))?.plainTranslation;
    if (!domain) throw new Error('A calculated horoscope house has no governed meaning.');
    return {planet,sign,house,domain,meaning:{sourceId:meaning.id,sourcePath:meaning.sourcePath,
      status:meaning.status,temporaryMeaning:meaning.collective_shift,
      role:'reviewed meaning only; not owner voice or reader copy'}};
  };
  const events = horoscopeEventsInWindow(brief).flatMap(event => {
    const binding = bind(horoscopeEventPlanet(event),event.sign);
    return binding ? [{id:event.id,type:event.type,...binding,startsAt:event.startsAt,
      localTiming:localTime.format(new Date(event.startsAt)),title:event.title ?? event.id,
      fromSign:event.fromSign ?? null,direction:event.direction ?? null,
      timingScope:'exact sky event; a possible personal development has no guaranteed date'}] : [];
  });
  const background = brief.positions.flatMap(position => {
    const binding = bind(position.planet,position.sign);
    return binding ? [{id:`reference/${binding.planet}`,type:'reference-position',...binding,
      referenceDate:brief.referenceDate,motion:position.motion,
      timingScope:'reference instant only; not an ingress or proof of a period-long placement'}] : [];
  });
  return {schema:'horoscope-developments/v1',period:brief.window.period,timeZone:brief.window.timeZone,
    events,background,uninterpretedEventIds:horoscopeEventsInWindow(brief).filter(e=>!events.some(d=>d.id===e.id)).map(e=>e.id),
    use:'Choose related developments for this sign. Chronological order is factual context, not a required prose sequence. Background positions are optional context, not a compulsory lead. Each house belongs only to its attached placement or event.'};
}
