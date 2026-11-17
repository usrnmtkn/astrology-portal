import { lunationAspectIdentity } from '../../../../src/shared/lunationAspectIdentity';
import type { SkySnapshot } from '../types';
import { datedLunationContentKey } from './lunationArticleIdentity';
import { resolveCmsSurfaceOverride, type CmsGeneratedContentMap } from './cmsSurfaceOverrides';

type Event = Parameters<typeof datedLunationContentKey>[0];
type Aspect = SkySnapshot['aspects'][number];

export function lunationAspectReaderKey(event: Event, aspect: Aspect, positions: SkySnapshot['positions']) {
  const phase = datedLunationContentKey(event).split('/')[3]?.replace('-moon', '');
  if (!phase || !event.sign) return null;
  const reversed = aspect.to === 'Moon';
  if (!reversed && aspect.from !== 'Moon') return null;
  const planet = reversed ? aspect.from : aspect.to;
  const moonSign = (reversed ? aspect.toSign : aspect.fromSign) ?? positions.find(p => p.planet === 'Moon')?.sign;
  const planetSign = (reversed ? aspect.fromSign : aspect.toSign) ?? positions.find(p => p.planet === planet)?.sign;
  if (!moonSign || !planetSign || moonSign.toLowerCase() !== event.sign.toLowerCase()) return null;
  const key = `lunation.${phase}.${moonSign.toLowerCase()}.${aspect.type.toLowerCase()}.${planet.toLowerCase().replaceAll(' ', '-')}.${planetSign.toLowerCase()}`;
  return lunationAspectIdentity(key) ? key : null;
}

export function lunationAspectReaderKeys(event: Event, sky: Pick<SkySnapshot, 'aspects' | 'positions'>) {
  return [...new Set(sky.aspects.flatMap(aspect => {
    const key = lunationAspectReaderKey(event, aspect, sky.positions);
    return key ? [key] : [];
  }))];
}

export function resolveLunationAspectReading(event: Event, aspect: Aspect, positions: SkySnapshot['positions'], content: CmsGeneratedContentMap) {
  const key = lunationAspectReaderKey(event, aspect, positions);
  return key ? resolveCmsSurfaceOverride(content, [key]) : null;
}
