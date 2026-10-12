import { createHash } from 'node:crypto';
import semantics from '../../../src/astro-writing/transitNatalSemantics.cjs';
import { syntheticMeaningRecord } from '../../../scripts/fixtures/personal-transit-writing.mjs';

// Protocol fixtures only, never owner prose, real interpretations or voice gold.
export function syntheticReaderMeanings(records) {
  return records.map(({ contentKey }) => {
    const [transiting, natal, aspect] = contentKey.replace('authored/transit-aspect/', '').split('/');
    const packet = semantics.resolveTransitNatalSemantics({ transiting, natal, aspect });
    const text = `Synthetic meaning fixture for ${transiting}/${natal}/${aspect}.`;
    return syntheticMeaningRecord(contentKey, text, false);
  });
}
