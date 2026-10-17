import {transitWritingBodies, transitWritingAspects} from './transitWritingIdentity.js';
/** Exact Between You Two openings use a known transiting body and major aspect. */
export function isDynamicBondEffectExactRecord(record: {contentKey: string; content_role?: unknown}) {
  const match = /^fallback-hook\/bond-effect-([^/]+)\/([^/]+)$/u.exec(record.contentKey);
  return Boolean(match && record.content_role === 'fallback_hook'
    && (transitWritingBodies as readonly string[]).includes(match[2])
    && (transitWritingAspects as readonly string[]).includes(match[1]));
}
