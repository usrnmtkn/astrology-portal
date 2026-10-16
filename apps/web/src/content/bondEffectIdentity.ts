/** Exact Between You Two openings use a known transiting body and major aspect. */
export function isDynamicBondEffectExactRecord(record: {contentKey: string; content_role?: unknown}) {
  return record.content_role === 'fallback_hook'
    && /^fallback-hook\/bond-effect-(?:conjunction|opposition|square|trine|sextile)\/(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith|north-node|south-node)$/u.test(record.contentKey);
}
