import type { SkySnapshot } from "../types";

/** Initial and fully hydrated lunar articles use the same calculated ordering. */
export function lunationAspectCandidates(aspects: SkySnapshot["aspects"]) {
  const orb = (aspect: SkySnapshot["aspects"][number]) => typeof aspect.separation === 'number' && typeof aspect.exactAngle === 'number'
    ? Math.abs(aspect.separation - aspect.exactAngle) : aspect.orb;
  return aspects.filter(aspect => [aspect.from, aspect.to].some(planet => planet === 'Moon' || planet === 'Sun'))
    .sort((first, second) => orb(first) - orb(second)
      || Number(second.from === 'Moon' || second.to === 'Moon') - Number(first.from === 'Moon' || first.to === 'Moon'));
}
