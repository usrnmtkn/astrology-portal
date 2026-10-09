import { studioListingFacts } from '../../api/_lib/studio-listing-facts.ts';

// Synthetic documents for direct-entry visibility regressions; never owner copy.
const keys = [
  ...['mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron'].flatMap(planet => [`authored/station/${planet}/rx`, `authored/station/${planet}/direct`]),
  'sky.retrograde.venus.scorpio.retrograde_passage', 'sky.retrograde.venus',
  'sky.station.venus.scorpio.retrograde', 'sky.retrograde.saturn.aries.station_retrograde',
  'sky/station/venus/retrograde/scorpio', 'authored/sky-placement/venus/scorpio',
  'compatibility.venus.aries.libra', 'fallback-hook/pair-daily/fixture',
  'vocab/relationship/fixture', 'slot-template/compatibility/fixture', 'fallback-hook/compat-fixture',
  'fixture/compatibility-event', 'fixture/compatibility-block',
  'composite.aspect.sun.trine.moon', 'fixture/surface-only', 'fixture/relationship-block',
  'fallback-hook/custom-natal-ingredient', 'fallback-template/fixture', 'vocab/planet/fixture',
  'authored/week-opener/new-moon', 'fallback-hook/empty-house/bridge-template/standard',
  'vocab.legacy-fixture', 'guide-phrase/fixture', 'unrelated/fixture'
];
export const sectionFixtures = keys.map((key, index) => ({
  id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, content_key: key,
  status: 'DRAFT', lane: key === 'fixture/surface-only' ? 'reference' : 'serving', surface: key.includes('surface-only') ? 'composite' : 'sky',
  mode: 'feed', provider: 'manual-admin', review_state: 'EDITORIAL_REVIEW_REQUIRED',
  headline: `Synthetic ${key}`, summary: '', body: `Synthetic opening for ${key}.\n\nComplete synthetic final sentence for ${key}.`,
  event_type: key.includes('compatibility-event') ? 'friends.compatibility.planet-card' : null,
  block_type: key.includes('compatibility-block') ? 'compatibility_planet_card' : key.includes('relationship-block') ? 'composite_aspect' : key.startsWith('vocab/') ? 'vocab' : key.startsWith('fallback-hook/') ? 'fallback_hook' : key.includes('template/') ? 'fallback_template' : 'calendar_event',
  sections: {}, source_snapshot: key.includes('week-opener/') || key.includes('bridge-template/') ? {content_role:'template'} : {}, facts: {}, flags: [],
  created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-09T00:00:00.000Z'
})).map(row => ({...row, studio_facts:studioListingFacts(row)}));
