import { fallbackHoroscopeKind, type FallbackHoroscopeKind } from './fallbackHoroscopeKey';
import { preferredSkySourceRows, skyPlacementSigns, type SkyWriteupRelationRow } from './skyWriteupRelations';

export type { FallbackHoroscopeKind } from './fallbackHoroscopeKey';
export type FallbackHoroscopeIdentity = { kind: FallbackHoroscopeKind; planet: string; sign?: string; risingSign?: string; house?: number };
const signs = new Set<string>(skyPlacementSigns);

export function fallbackHoroscopeIdentity(key: string): FallbackHoroscopeIdentity | null {
  const kind = fallbackHoroscopeKind(key);
  if (kind === 'placement') {
    const parts = key.split('/'), house = Number(parts[3].slice('house-'.length));
    const sign = skyPlacementSigns.indexOf(parts[2] as typeof skyPlacementSigns[number]);
    return { kind, planet: parts[1], sign: parts[2], house,
      risingSign: skyPlacementSigns[(sign - house + 13) % 12] };
  }
  if (kind === 'new-moon' || kind === 'full-moon') {
    const parts = key.split('/');
    return { kind, planet: 'moon', sign: parts[4],
      risingSign: parts[5].slice('rising-'.length), house: Number(parts[6].slice('house-'.length)) };
  }
  if (kind === 'eclipse') {
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
