/** Technical claims, not a blacklist of words that also have ordinary meanings. */
const bodies: Record<string, string> = {
  'black moon lilith': 'lilith', 'north node': 'north node', 'south node': 'south node',
  'imum coeli': 'ic', sun: 'sun', moon: 'moon', mercury: 'mercury', venus: 'venus',
  mars: 'mars', jupiter: 'jupiter', saturn: 'saturn', uranus: 'uranus', neptune: 'neptune',
  pluto: 'pluto', chiron: 'chiron', lilith: 'lilith', ascendant: 'ascendant',
  descendant: 'descendant', midheaven: 'midheaven', mc: 'midheaven', ic: 'ic'
};
const aspects: Record<string, string> = {
  conjunct: 'conjunction', conjunction: 'conjunction', conjoins: 'conjunction',
  opposes: 'opposition', opposite: 'opposition', opposition: 'opposition', opposing: 'opposition',
  square: 'square', squares: 'square', squaring: 'square',
  trine: 'trine', trines: 'trine', sextile: 'sextile', sextiles: 'sextile'
};
const bodyPattern = Object.keys(bodies).sort((a, b) => b.length - a.length).join('|');
const aspectPattern = Object.keys(aspects).sort((a, b) => b.length - a.length).join('|');
const modifier = '(?:(?:the|your|their|his|her|my|our|its|natal|transiting|birth)\\s+)*';
const signSuffix = '(?:\\s+in\\s+(?:Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces))?';
const relationPrefix = "(?:['’]s)?" + signSuffix
  + '(?:\\s+(?:is|was|are|remains|stays|forms|makes|will\\s+be))?'
  + '(?:\\s+in)?(?:\\s+(?:an?|the))?(?:\\s+(?:exact|close|tight|applying|separating))?\\s+';

export type TransitAspectClaim = {
  text: string;
  index: number;
  end: number;
  transitPlanet: string;
  aspect: string;
  natalPoint: string;
  key: string;
};

export function canonicalTransitBody(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/gu, ' ').replace(/\s+/gu, ' ');
  return bodies[normalized] ?? (normalized === 'rising' ? 'ascendant' : normalized);
}

export function canonicalTransitAspect(value: string) {
  const normalized = value.trim().toLowerCase();
  return aspects[normalized] ?? normalized;
}

export function transitAspectKey(left: string, aspect: string, right: string) {
  return `${canonicalTransitBody(left)}|${canonicalTransitAspect(aspect)}|${canonicalTransitBody(right)}`;
}

/** Recognize direct, nominal and paired-subject claims, including inflections. */
export function extractTransitAspectClaims(text: string): TransitAspectClaim[] {
  const patterns = [
    new RegExp(`\\b(?<left>${bodyPattern})${relationPrefix}(?<aspect>${aspectPattern})(?:\\s+aspect)?(?:\\s+(?:to|with|of))?\\s+${modifier}(?<right>${bodyPattern})\\b`, 'giu'),
    new RegExp(`\\b(?<aspect>${aspectPattern})(?:\\s+aspect)?\\s+between\\s+${modifier}(?<left>${bodyPattern})\\s+and\\s+${modifier}(?<right>${bodyPattern})\\b`, 'giu'),
    new RegExp(`\\b(?<left>${bodyPattern})\\s+and\\s+${modifier}(?<right>${bodyPattern})\\s+(?:are|remain|form)(?:\\s+in)?(?:\\s+(?:an?|the))?\\s+(?<aspect>${aspectPattern})\\b`, 'giu')
  ];
  const found: TransitAspectClaim[] = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const { left, aspect, right } = match.groups!;
      if (found.some((item) => item.index === match.index && item.end === match.index! + match[0].length)) continue;
      found.push({ text: match[0], index: match.index!, end: match.index! + match[0].length,
        transitPlanet: canonicalTransitBody(left), aspect: canonicalTransitAspect(aspect),
        natalPoint: canonicalTransitBody(right), key: transitAspectKey(left, aspect, right) });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

/**
 * Narrow ordinary-language exceptions. A parsed planetary claim always wins;
 * standalone technical uses ("the opposition is exact") still require evidence.
 */
export function isOrdinaryAspectWord(text: string, index: number, word: string) {
  if (extractTransitAspectClaims(text).some((claim) => index >= claim.index && index < claim.end)) return false;
  const before = text.slice(Math.max(0, index - 90), index);
  const after = text.slice(index, index + 160);
  if (new RegExp(`\\b(?:${bodyPattern})(?:['’]s)?\\s+(?:(?:is|was|an?|the|in|exact)\\s+)*$`, 'iu').test(before)) return false;
  switch (word.toLowerCase()) {
    case 'opposite':
      return /^opposite\s+(?:of\b|(?:direction|effect|side|approach|result|view|choice)\b)/iu.test(after);
    case 'square':
    case 'squares':
      return /^(?:square|squares)\s+(?:one\b|away\b|foot\b|feet\b|meter\b|metre\b|deal\b)/iu.test(after)
        || /^squares?\s+with\s+(?:the|their|your|our)\s+(?:facts|plan|account|experience)\b/iu.test(after);
    case 'conjunction':
      return /\bin\s+$/iu.test(before) && /^conjunction\s+with\b/iu.test(after)
        && !new RegExp(`^conjunction\\s+with\\s+${modifier}(?:${bodyPattern})\\b`, 'iu').test(after);
    case 'opposition':
      return /\bin\s+$/iu.test(before) && /^opposition\s+to\b/iu.test(after)
        && !new RegExp(`^opposition\\s+to\\s+${modifier}(?:${bodyPattern})\\b`, 'iu').test(after);
    default:
      return false;
  }
}

/** Only supplied structured transits and explicit source claims license pairs. */
export function transitAspectKeysFromEvidence(evidence: unknown): Set<string> {
  const result = new Set<string>();
  const visit = (value: unknown, field = '', depth = 0) => {
    if (depth > 32) return;
    if (typeof value === 'string') {
      for (const claim of extractTransitAspectClaims(value)) result.add(claim.key);
      return;
    }
    if (Array.isArray(value)) { for (const item of value) visit(item, field, depth + 1); return; }
    if (!value || typeof value !== 'object') return;
    const item = value as Record<string, unknown>;
    const left = item.transitPlanet ?? (field === 'moonDriver' ? 'Moon' : undefined);
    if (typeof left === 'string' && typeof item.aspect === 'string' && typeof item.natalPoint === 'string') {
      result.add(transitAspectKey(left, item.aspect, item.natalPoint));
    }
    for (const [key, entry] of Object.entries(item)) visit(entry, key, depth + 1);
  };
  visit(evidence);
  return result;
}
