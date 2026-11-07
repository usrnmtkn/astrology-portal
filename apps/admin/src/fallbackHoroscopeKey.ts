import { isLunationHoroscopeKey } from '../../../src/shared/lunationHoroscopeIdentity';
import { isLunationEclipseSectionKey } from '../../web/src/content/fallbackArchitectureV3/resolver/lunationStudioRevision.mjs';
import { skyPlacementBodies, skyPlacementSigns } from './skyWriteupRelations';

export type FallbackHoroscopeKind = 'placement' | 'new-moon' | 'full-moon' | 'eclipse';

/** Key validation is shared by the shell guard and the deferred source library. */
export function fallbackHoroscopeKind(key: string): FallbackHoroscopeKind | null {
  const core = key.match(/^house-horoscope-core\/([^/]+)\/([^/]+)\/house-([1-9]|1[0-2])$/u);
  if (core && skyPlacementBodies.includes(core[1] as typeof skyPlacementBodies[number])
    && skyPlacementSigns.includes(core[2] as typeof skyPlacementSigns[number])) return 'placement';
  if (isLunationHoroscopeKey(key)) return key.split('/')[3] as 'new-moon' | 'full-moon';
  return isLunationEclipseSectionKey(key) ? 'eclipse' : null;
}
