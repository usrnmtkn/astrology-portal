type Event = { startsAt: string; title?: string; phase?: string; sign?: string; eclipseType?: string | null };
type Aspect = { from: string; to: string; type: string; fromSign?: string | null; toSign?: string | null };
type Position = { planet: string; sign: string };
const slug = (value: string) => value.trim().toLowerCase().replace(/\s+/gu, '-');

/** Lunar copy belongs to this calculated phase/eclipse and contact, never an ordinary Moon transit. */
export function skyLunationAspectKey(event: Event, aspect: Aspect, positions: Position[] = []) {
  const phase = event.eclipseType === 'solar' ? 'new-moon' : event.eclipseType === 'lunar' ? 'full-moon'
    : event.phase === 'new-moon' || /new moon/iu.test(event.title ?? '') ? 'new-moon'
    : event.phase === 'full-moon' || /full moon/iu.test(event.title ?? '') ? 'full-moon' : null;
  if (!phase || !event.sign || !Number.isFinite(Date.parse(event.startsAt))) return null;
  const kind = event.eclipseType ? `${event.eclipseType}-eclipse` : phase;
  const luminary = aspect.from === 'Moon' || aspect.to === 'Moon' ? 'Moon'
    : phase === 'new-moon' && (aspect.from === 'Sun' || aspect.to === 'Sun') ? 'Sun' : null;
  if (!luminary) return null;
  const reversed = aspect.to === luminary;
  const other = reversed ? aspect.from : aspect.to;
  if (other === 'Moon' || other === 'Sun') return null;
  const sign = (reversed ? aspect.toSign : aspect.fromSign) ?? positions.find(p => p.planet === luminary)?.sign;
  const otherSign = (reversed ? aspect.fromSign : aspect.toSign) ?? positions.find(p => p.planet === other)?.sign;
  if (!sign || !otherSign || slug(sign) !== slug(event.sign)) return null;
  const key = `sky.lunation.${kind}.${slug(event.sign)}.${slug(aspect.type)}.${slug(other)}.${slug(otherSign)}`;
  return key;
}

export function skyLunationAspectKeys(event: Event, sky: { aspects: Aspect[]; positions: Position[] }) {
  return [...new Set(sky.aspects.flatMap(aspect => {
    const key = skyLunationAspectKey(event, aspect, sky.positions);
    return key ? [key] : [];
  }))];
}
