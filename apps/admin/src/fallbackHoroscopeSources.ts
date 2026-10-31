import { isLunationHoroscopeKey } from '../../../src/shared/lunationHoroscopeIdentity';
import { isLunationEclipseSectionKey } from '../../web/src/content/fallbackArchitectureV3/resolver/lunationStudioRevision.mjs';
import { preferredSkySourceRows, skyPlacementBodies, skyPlacementSigns, type SkyWriteupRelationRow } from './skyWriteupRelations';

export type FallbackHoroscopeKind = 'placement' | 'new-moon' | 'full-moon' | 'eclipse';
export type FallbackHoroscopeIdentity = { kind: FallbackHoroscopeKind; planet: string; sign?: string; risingSign?: string; house?: number };
const bodies = new Set<string>(skyPlacementBodies);
const signs = new Set<string>(skyPlacementSigns);

export function fallbackHoroscopeIdentity(key: string): FallbackHoroscopeIdentity | null {
  const core = key.match(/^house-horoscope-core\/([^/]+)\/([^/]+)\/house-([1-9]|1[0-2])$/u);
  if (core && bodies.has(core[1]) && signs.has(core[2])) {
    const house = Number(core[3]);
    const sign = skyPlacementSigns.indexOf(core[2] as typeof skyPlacementSigns[number]);
    return { kind: 'placement', planet: core[1], sign: core[2], house,
      risingSign: skyPlacementSigns[(sign - house + 13) % 12] };
  }
  if (isLunationHoroscopeKey(key)) {
    const parts = key.split('/');
    return { kind: parts[3] as 'new-moon' | 'full-moon', planet: 'moon', sign: parts[4],
      risingSign: parts[5].slice('rising-'.length), house: Number(parts[6].slice('house-'.length)) };
  }
  if (isLunationEclipseSectionKey(key)) {
    const parts = key.split('/');
    const rising = parts.find(part => part.startsWith('rising-'))?.slice('rising-'.length);
    const house = parts.find(part => /^house-\d+$/u.test(part));
    return { kind: 'eclipse', planet: 'moon', sign: signs.has(parts[2]) ? parts[2] : undefined,
      risingSign: rising, house: house ? Number(house.slice('house-'.length)) : undefined };
  }
  return null;
}

export function fallbackHoroscopeSources<Row extends Pick<SkyWriteupRelationRow, 'id' | 'content_key' | 'updated_at'>>(rows: Row[]) {
  return preferredSkySourceRows(rows.filter(row => fallbackHoroscopeIdentity(row.content_key)))
    .sort((left, right) => left.content_key.localeCompare(right.content_key));
}
