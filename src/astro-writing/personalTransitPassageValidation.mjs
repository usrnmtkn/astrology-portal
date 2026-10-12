import contracts from './transitNatalContract.cjs';
import { readerRuleFindings } from './personalTransitReaderRules.mjs';
import { readerCopyIssues } from '../../apps/web/src/content/editorialCopyBoundary.mjs';
const allowedBodies = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron','lilith','north-node','south-node','ascendant','descendant','midheaven','ic','imum-coeli'];
const aspects = ['conjunction','sextile','square','trine','opposition'];
const verb = a => ({ conjunction: 'conjunct', opposition: 'opposite' }[a] ?? a);
const display = s => s.split('-').map(x => x[0].toUpperCase() + x.slice(1)).join(' ');
export function identity(key) {
  const match = /^authored\/transit-aspect\/([^/]+)\/([^/]+)\/([^/]+)$/u.exec(key);
  if (!match || !allowedBodies.includes(match[1]) || !allowedBodies.includes(match[2]) || !aspects.includes(match[3])) throw Error('EXACT_TRANSIT_REQUIRED');
  return { transiting: match[1], natal: match[2], aspect: match[3] };
}

export function validatePassage(text, contact, passage) {
  const findings = [];
  const add = (code, detail) => findings.push({ code, detail });
  if (typeof text !== 'string' || !text.trim()) return { passed: false, findings: [{ code: 'EMPTY_BODY', detail: 'A complete passage is required.' }], ownerReview: [] };
  for (const issue of readerCopyIssues({ [passage.field]: text })) add('READER_COPY_BOUNDARY', issue.reason);
  for (const f of contracts.transitNatalPlaceholderFindings(text, passage.contract)) add('PLACEHOLDER_CONTRACT', f.detail);
  if (/[{}]/u.test(text.replace(/\{\{[A-Za-z][A-Za-z0-9]*\}\}/gu, ''))) add('MALFORMED_TEMPLATE', 'Unmatched or unsupported braces.');
  const rules = readerRuleFindings(text);
  findings.push(...rules.findings);
  if (/\b(?:drafting note|for the writer|internal only|do not publish|todo|tbd)\b|```|<\/?[a-z][^>]*>/iu.test(text)) add('READER_COPY_BOUNDARY', 'Editorial notes, markup or code are not reader copy.');
  if (passage.perspective === 'friend' && /\b(?:you|your|yours|yourself)\b/iu.test(text)) add('WRONG_PERSPECTIVE', 'Friend contains second-person address.');
  if (passage.perspective === 'you' && /\b(?:their|his|her)\s+natal\b/iu.test(text)) add('WRONG_PERSPECTIVE', 'You contains another-person natal framing.');
  if (!new RegExp(passage.perspective === 'you' ? '\\b(?:you|your|yours)\\b' : '\\b(?:they|them|their)\\b', 'iu').test(text)) add('MISSING_PERSPECTIVE', 'Required audience address is absent.');
  const planet = '(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Lilith|North Node|South Node|Ascendant|Descendant|Midheaven|Imum Coeli|IC)';
  // The destination key/title binds exact identity. Check named body claims
  // without imposing a new requirement to repeat the title inside the paragraph.
  const aspect = '(conjunct(?:ion)?|sextile|square|trine|opposite|opposition)';
  const named = [...text.matchAll(new RegExp(`\\b(?:transiting\\s+)?${planet}\\s+${aspect}\\s+(?:(?:your|their)\\s+)?(?:natal\\s+)?${planet}\\b`, 'giu'))];
  const expected = identity(contact.contentKey);
  if (Object.keys(expected).some(key => expected[key] !== contact.facts[key])) add('TRANSIT_DESTINATION_MISMATCH', 'Destination facts do not match the exact content key.');
  const normalized = value => { const key=value.toLowerCase().replaceAll(' ', '-'); return key==='ic'?'imum-coeli':key; };
  const normAspect = value => ({ conjunct:'conjunction', opposite:'opposition' }[value.toLowerCase()] ?? value.toLowerCase());
  for (const m of named) if (normalized(m[1]) !== normalized(contact.facts.transiting) || normalized(m[3]) !== normalized(contact.facts.natal) || normAspect(m[2]) !== contact.facts.aspect) add('TRANSIT_IDENTITY_MISMATCH', m[0]);
  for (const m of text.matchAll(new RegExp(`\\b${planet}\\b`, 'giu'))) if (![contact.facts.transiting, contact.facts.natal].map(normalized).includes(normalized(m[1]))) add('UNSUPPORTED_BODY', m[1]);
  const placement = contact.placementFacts ?? {};
  for (const match of text.matchAll(/\b(?:Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/gu))
    if (match[0].toLowerCase() !== String(placement.sign ?? '').toLowerCase()) add('UNSUPPORTED_SIGN', `No ${match[0]} placement is supplied.`);
  const ordinals = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
  const houses = [placement.transitHouse,placement.natalHouse].filter(Boolean).map(Number);
  if (!houses.length && /\bhouses?\b/iu.test(text)) add('UNSUPPORTED_ASTROLOGY_DETAIL', 'No house fact is supplied.');
  for (const match of text.matchAll(/\b(\d+(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+house\b/giu)) {
    const house = /^\d/u.test(match[1]) ? parseInt(match[1],10) : ordinals.indexOf(match[1].toLowerCase()) + 1;
    if (!houses.includes(house)) add('UNSUPPORTED_ASTROLOGY_DETAIL', `No house ${house} fact is supplied.`);
  }
  if (/\bretrograde\b|\d+\s*(?:degrees?\b|°)/iu.test(text)) add('UNSUPPORTED_ASTROLOGY_DETAIL', 'No motion or degree fact is supplied.');
  if (/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d|\b\d{4}-\d{2}-\d{2}\b/u.test(text)) add('INVENTED_DATE', 'Use the runtime date placeholder.');
  const ownerReview = [];
  ownerReview.push(...rules.signals.map(signal=>signal.instruction));
  if (/\b(?:people|observers|friends|anyone)\b.{0,30}\b(?:notice|see|watch)\b/iu.test(text)) ownerReview.push('Possible observer scaffolding; owner decides stylistic quality.');
  return { passed: findings.length === 0, findings, ownerReview, meaningAssessment:'owner-review-pending', voiceAssessment:'owner-review-pending', readerRuleBundleSha256:rules.ruleBundleSha256, contextualRules:rules.contextualRules, contextualApproval:'owner-required', limitation: 'Deterministic checks do not establish semantic accuracy, supported biography/incidents, or voice quality. Owner review remains required.' };
}
