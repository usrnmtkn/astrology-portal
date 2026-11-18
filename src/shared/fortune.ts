import type { NatalSect } from './solarHorizon';

export function fortuneLongitude(ascendant: number, sun: number, moon: number, sect: NatalSect) {
  const longitude = ascendant + (sect === 'day' ? moon - sun : sun - moon);
  return ((longitude % 360) + 360) % 360;
}
