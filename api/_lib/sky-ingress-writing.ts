import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DIGNITY_SIGNS, planetSignDignity } from '../../apps/web/src/services/planetSignDignity.mjs';
import { hasVerifiedSameSignHistory } from '../../apps/web/src/services/retrogradeHistory.js';
import { isSkyIngressEssay, isSkyIngressArticle, skyIngressArticleFields } from '../../apps/web/src/content/skyIngressEssay.mjs';

type Point = { planet: string; sign: string; degree: number; motion: string };
type Event = { id: string; type: string; title: string; startsAt: string; dateLabel: string; timeLabel: string;
  primary: boolean; aspect?: string; planet?: string; sign?: string; period: string; participants: Point[] };
import { INGRESS_WRITER_CONTRACT, ingressWriterContractReceipt } from './transit-ingress-editorial-authority.js';
const version = 'sky-ingress-writing/v3';
const hash = (value: unknown) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const read = (source: string) => JSON.parse(readFileSync(new URL(`../../${source}`, import.meta.url), 'utf8'));
const lower = (value: string) => value.toLowerCase();
const traditional = new Set(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']);

/** Doctrine is derived from the existing sign-level dignity table, never a date table. */
export function ingressDignityEvidence(planet: string, sign: string) {
  const dignity = planetSignDignity(planet, sign);
  const signsFor = (name: string) => DIGNITY_SIGNS.filter(candidate => planetSignDignity(planet, candidate).dignities.some(value => value === name));
  return { ...dignity, domicileSigns: signsFor('domicile'), exaltationSigns: signsFor('exaltation'),
    basis: 'Fall is opposite exaltation. Detriment is opposite domicile. Sign rulership alone establishes neither. Empty sign-level dignity is not a peregrine calculation.' };
}

function positions(event: Event) {
  return event.participants.map(point => {
    if (!Number.isFinite(point.degree) || point.degree < 0 || point.degree >= 30
      || !['direct', 'retrograde'].includes(point.motion)) throw new Error('Incomplete ingress event positions. No writing call was started.');
    const minutes = Math.floor(point.degree * 60 + 1e-7);
    const degree = `${Math.floor(minutes / 60)}°${String(minutes % 60).padStart(2, '0')}′`;
    const dignity = planetSignDignity(point.planet, point.sign).dignities;
    return `${point.planet} at ${degree} ${point.sign}, ${point.motion}${dignity.length ? `, in ${dignity.join(' and ')}` : ''}.`;
  }).join(' ');
}

export function buildSkyIngressWritingContext(facts: Record<string, any>) {
  if (isSkyIngressEssay(facts.articleFormat) && !isSkyIngressArticle(facts.articleFormat)) throw new Error('The retired ingress format cannot prepare new writing. Select the current ingress writer.');
  if (!isSkyIngressArticle(facts.articleFormat) || !Array.isArray(facts.events)
    || !facts.eventCoverage || !Number.isFinite(Date.parse(facts.transitStartInstant))
    || !Number.isFinite(Date.parse(facts.transitEndInstant))) throw new Error('Complete calculated ingress facts are required before writing.');
  const files = {
    placements: 'tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json',
    phases: 'tldr-astro-phrasebank/phrasebank/cc-moon-reviewed.json',
    signs: 'packages/astro-knowledge/data/primitives/signs.json',
    planets: 'packages/astro-knowledge/data/primitives/planets.json',
    aspects: 'packages/astro-knowledge/data/primitives/aspects.json',
  };
  const placementRows = read(files.placements).reviewed;
  const phases = read(files.phases).reviewed;
  const signs = read(files.signs).entries;
  const planets = read(files.planets).entries;
  const aspects = read(files.aspects).entries;
  const ruler = signs.find((entry: any) => entry.id === facts.sign)?.traditionalRuler;
  if (!ruler) throw new Error('The ingress sign has no governed traditional ruler.');
  const events = [...facts.events as Event[]].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
  if (new Set(events.map(event => event.id)).size !== events.length || events.some(event =>
    !event.id || !event.title || !event.dateLabel || !event.timeLabel || !Number.isFinite(Date.parse(event.startsAt))
    || !Array.isArray(event.participants))) throw new Error('Incomplete or duplicate ingress event evidence.');
  const current = events.filter(event => event.period === 'during-ingress-window');
  const exactAspects = current.filter(event => event.type === 'aspect' && aspects.some((aspect: any) => aspect.id === event.aspect && aspect.major));
  const other = (event: Event) => lower(event.participants.find(point => lower(point.planet) !== facts.planet)?.planet ?? '');
  // Develop the most consequential traditional contact and a supportive one;
  // fill the remaining space chronologically. Every remaining primary event is
  // still required in Other dates, so selection cannot silently erase a Moon.
  const selected: Event[] = [];
  const pick = (event: Event | undefined) => { if (event && !selected.includes(event)) selected.push(event); };
  pick(exactAspects.find(event => traditional.has(other(event)) && ['conjunction', 'opposition', 'square'].includes(event.aspect ?? '')));
  pick(exactAspects.find(event => traditional.has(other(event)) && ['trine', 'sextile'].includes(event.aspect ?? '')));
  for (const event of exactAspects) { if (selected.length >= 3) break; pick(event); }
  selected.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const developed = selected.map(event => ({ id: event.id, title: event.title,
    positionsLine: positions(event), event }));
  const developedIds = new Set(developed.map(event => event.id));
  const requiredDates = events.filter(event => !developedIds.has(event.id)
    && !(event.type === 'ingress' && lower(event.planet ?? '') === facts.planet
      && event.period === 'during-ingress-window' && lower(event.participants[0]?.sign ?? '') === facts.sign)
    && (event.period === 'during-ingress-window' && event.primary
      || event.period === 'after-ingress-window' && lower(event.planet ?? '') === ruler))
    .map(event => ({ id: event.id, title: event.title, event,
      prefix: `- ${event.period === 'after-ingress-window' ? 'Follow through: ' : ''}${event.title}: ${event.dateLabel} at ${event.timeLabel}.` }));
  const meaning = new Map<string, any>();
  const add = (sourcePath: string, sourceId: string, body: unknown) => {
    if (body == null || typeof body === 'string' && !body.trim()) throw new Error(`Missing ingress meaning: ${sourceId}.`);
    meaning.set(`${sourcePath}:${sourceId}`, { sourcePath, sourceId, body, bodySha256: hash(body), role: 'meaning-only', positiveVoiceEvidence: false, factUseAuthorized: false });
  };
  const uninterpreted = new Set<string>();
  for (const event of [...selected, ...requiredDates.map(item => item.event)]) {
    for (const point of event.participants) {
      const placement = placementRows.find((entry: any) => entry.body === lower(point.planet) && entry.sign === lower(point.sign) && entry.status === 'REVIEWED_CLAUSE');
      if (placement) add(files.placements, placement.id, placement.collective_shift);
      else uninterpreted.add(`${point.planet} in ${point.sign}`);
      const sign = signs.find((entry: any) => entry.id === lower(point.sign));
      const planet = planets.find((entry: any) => entry.id === lower(point.planet));
      if (sign) add(files.signs, sign.id, sign);
      if (planet) add(files.planets, planet.id, planet);
    }
    if (event.aspect) {
      const aspect = aspects.find((entry: any) => entry.id === event.aspect);
      if (aspect) add(files.aspects, aspect.id, aspect);
    }
    if (event.type === 'lunation') {
      const phase = phases.find((entry: any) => entry.kind === 'moon_phase' && entry.status === 'REVIEWED_CLAUSE'
        && event.title.toLowerCase().startsWith(entry.phase.replaceAll('-', ' ')));
      if (phase) add(files.phases, phase.id, phase.slots);
      else throw new Error('Missing governed phase meaning for a required ingress lunation.');
    }
  }
  const mainSign = signs.find((entry: any) => entry.id === facts.sign);
  add(files.signs, mainSign.id, mainSign);
  const condition = ingressDignityEvidence(facts.planet, facts.sign);
  const participantConditions = [...new Map(events.flatMap(event => event.participants.map(point =>
    [`${point.planet}/${point.sign}`, ingressDignityEvidence(point.planet, point.sign)] as const))).values()];
  const historyInstants: string[] = [];
  const collectInstants = (value: unknown) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/u.test(value) && Number.isFinite(Date.parse(value))) historyInstants.push(value);
    else if (Array.isArray(value)) value.forEach(collectInstants);
    else if (value && typeof value === 'object') Object.values(value).forEach(collectInstants);
  };
  if (facts.retrogradeHistoryIncluded && hasVerifiedSameSignHistory(facts.retrogradeHistory)) {
    for (const field of ['current', 'sameSign', 'nextSameSign', 'previousCrossing', 'degreeMatch']) collectInstants(facts.retrogradeHistory[field]);
  }
  const plan = { version, articleFormat: facts.articleFormat, coverage: facts.eventCoverage, selectedPlanet: facts.planet, selectedSign: facts.sign,
    traditionalRuler: ruler, condition, participantConditions, developed, requiredDates,
    verifiedHistoryInstants: [...new Set(historyInstants)], uninterpreted: [...uninterpreted], meaningSources: [...meaning.values()] };
  // Preserve the complete calculation plan and sources for validation/receipts.
  // The prose writer needs each fact, not repeated formatted position lines,
  // app-owned date bullets or the same dignity explanation for every participant.
  const withoutBasis = ({ basis: _basis, ...condition }: ReturnType<typeof ingressDignityEvidence>) => condition;
  const writerEvidence = { ...plan, condition: withoutBasis(condition),
    participantConditions: participantConditions.map(withoutBasis),
    dignityBasis: condition.basis,
    developed: developed.map(({ positionsLine: _line, ...item }) => item),
    requiredDates: requiredDates.map(({ prefix: _prefix, ...item }) => item) };
  const receipt = { version, writerContract: ingressWriterContractReceipt(), planSha256: hash(plan),
    writerEvidence: { version: 'ingress-writer-evidence/v1', sha256: hash(writerEvidence) },
    developedEventIds: developed.map(event => event.id),
    requiredDateEventIds: requiredDates.map(event => event.id),
    developedEventFacts: developed.map(({ id, event, positionsLine }) => ({ id,
      title: event.title, startsAt: event.startsAt, dateLabel: event.dateLabel, timeLabel: event.timeLabel, positionsLine })),
    meaningSources: [...meaning.values()].map(({ body: _body, ...source }) => source),
    dignitySource: 'apps/web/src/services/planetSignDignity.mjs', ownerApproved: false };
  const prompt = [
    'DATED INGRESS COVERAGE AND EVENT MEANING', JSON.stringify(writerEvidence),
    INGRESS_WRITER_CONTRACT.coverage,
    INGRESS_WRITER_CONTRACT.meaning,
  ].join('\n\n');
  return { plan, receipt, prompt };
}

export type SkyIngressWritingContext = ReturnType<typeof buildSkyIngressWritingContext>;

/** Keep the complete saved article available without importing its old facts,
 * immutable wording or separate rising-sign companion into the dated format. */
export function buildIngressTemplateReference(contentKey: string, body: string) {
  if (!/^sky(?:\/|-)article-template\//u.test(contentKey) || typeof body !== 'string' || !body.trim())
    throw new Error('A complete approved article template reference is required before ingress writing.');
  const reference = { contentKey, body, bodySha256: hash(body) };
  return { reference, receipt: { version: 'ingress-template-reference/v1', contentKey, bodySha256: reference.bodySha256,
    role: 'structure-only', ownerAuthorshipEstablished: false, positiveVoiceEvidence: false, factUseAuthorized: false },
    prompt: ['COMPLETE SAVED INGRESS TEMPLATE REFERENCE',
      'Keep this approved, non-serving saved article complete as structural context. The current ingress brief controls the new prose. This reference does not establish immutable wording, owner authorship, current facts or voice authority. Its old variables and separate horoscope companion are not this request’s output fields. Current owner corrections take precedence over historical wording and claims.',
      JSON.stringify(reference)].join('\n\n') };
}

export type IngressTemplateReference = ReturnType<typeof buildIngressTemplateReference>;

export function validateIngressTemplateReference(value: IngressTemplateReference | undefined) {
  const expected = value && buildIngressTemplateReference(value.reference.contentKey, value.reference.body);
  if (!value || !expected || hash(value.reference.body) !== value.reference.bodySha256
    || hash(value.receipt) !== hash(expected.receipt) || value.prompt !== expected.prompt)
    throw new Error('The complete ingress template reference is missing or changed. No writing call was started.');
}

/** Keep the full calculation response in Studio; deliver its writing-relevant
 * facts once. The coverage plan supplies exact event participants separately. */
export function ingressWriterFacts(facts: Record<string, any>) {
  const keys = ['schema', 'articleFormat', 'calculationSource', 'calculationProvenance', 'generatedAt',
    'referenceTimeZone', 'planet', 'sign', 'entryYear', 'validFrom', 'validTo', 'transitStartInstant',
    'transitEndInstant', 'slotValues', 'eventCoverage', 'dignity', 'retrogradeHistoryIncluded'];
  return { ...Object.fromEntries(keys.filter(key => Object.hasOwn(facts, key)).map(key => [key, facts[key]])),
    nasa: { status: facts.nasa?.status ?? 'unavailable', scope: facts.nasa?.scope },
    nasaExplanatoryText: { status: 'not-delivered', role: 'astronomy-explanation-only',
      use: 'The complete source receipt remains in Studio. No NASA explanatory prose is supplied to this writing call; do not invent an attribution.' },
    ...(facts.retrogradeHistoryIncluded ? { retrogradeHistory: facts.retrogradeHistory } : {}) };
}

type Slot = { name: string; description?: string };
/** Internal prose fields adapt back into the existing public string fields. */
export function ingressProviderSlots(requested: Slot[], context: SkyIngressWritingContext): Slot[] {
  if (!isSkyIngressArticle(context.plan.articleFormat)) throw new Error('The retired ingress format cannot dispatch a writer.');
  const allowed = new Set(skyIngressArticleFields.filter(field => !['articleTitle', 'when'].includes(field.name)).map(field => field.name));
  if (requested.some(slot => !allowed.has(slot.name))) throw new Error('Requested fields do not match the current ingress writer contract.');
  return requested.filter(slot => slot.name !== 'otherDatesSection').map(slot => ({ ...slot,
    description: INGRESS_WRITER_CONTRACT.fieldDescriptions[slot.name] }));
}

export function assembleIngressFields(raw: unknown, requested: Slot[], context: SkyIngressWritingContext, partial = false) {
  const values = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const providerNames = ingressProviderSlots(requested, context).map(slot => slot.name);
  if (!partial && (Object.keys(values).some(name => !providerNames.includes(name))
    || providerNames.some(name => typeof values[name] !== 'string' || name !== 'priorOccurrenceSection' && !String(values[name]).trim())))
    throw new Error('The ingress writer must return exactly the requested prose fields.');
  return Object.fromEntries(requested.map(slot => [slot.name, slot.name === 'otherDatesSection'
    ? narrativeDates(context) : typeof values[slot.name] === 'string' ? String(values[slot.name]) : '']));
}

function narrativeDateEvents(context: SkyIngressWritingContext) {
  return [...context.plan.developed, ...context.plan.requiredDates].sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt) || a.id.localeCompare(b.id));
}

function datePrefix(event: Event) {
  return `- ${event.period === 'after-ingress-window' ? 'Follow through: ' : ''}${event.title}: ${event.dateLabel} at ${event.timeLabel}.`;
}

function narrativeDates(context: SkyIngressWritingContext) {
  const events = narrativeDateEvents(context);
  return events.length ? `## Key dates\n\n${events.map(item => datePrefix(item.event)).join('\n')}` : '';
}

/** Bounded factual/coverage checks, not a semantic or owner-voice verdict. */
export function validateSkyIngressWriting(values: Record<string, string>, context: SkyIngressWritingContext) {
  const issues: string[] = [];
  const advisories: string[] = [];
  const { plan } = context;
  if (Object.hasOwn(values, 'otherDatesSection')) {
    const bullets = values.otherDatesSection.split('\n').filter(line => /^\s*- /u.test(line));
    const required = narrativeDateEvents(context).map(item => ({ ...item, prefix: datePrefix(item.event) }));
    if (bullets.length !== required.length) issues.push('Other dates must cover each required event once.');
    required.forEach((event, index) => {
      if (bullets[index] !== event.prefix) issues.push(`Missing or changed required event: ${event.title}.`);
    });
  }
  if (values.articleBody) {
    if (/\d{1,2}(?:\.\d+)?\s*(?:degrees?|°)/u.test(values.articleBody)) issues.push('Keep numeric participant positions in the calculated evidence, outside articleBody.');
    // Complete event facts remain available for inspection. These are bounded
    // lexical checks; they do not certify semantic interpretation or voice.
    for (const event of plan.developed) {
      const participants = event.event.participants.map(point => point.planet);
      if (!participants.every(planet => new RegExp(`\\b${planet}\\b`, 'iu').test(values.articleBody)))
        advisories.push(`Review prose coverage of the selected contact: ${event.title}.`);
    }
    const allowedInstants = [...plan.developed, ...plan.requiredDates].map(item => item.event.startsAt)
      .concat(plan.coverage.start, plan.coverage.end, ...plan.verifiedHistoryInstants);
    const allowedPairs = new Set(allowedInstants.flatMap(instant => {
      const date = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(instant));
      const time = `${new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(instant))} ET`;
      return [`${date} at ${time}`, `${date.replace(/, \d{4}$/u, '')} at ${time}`];
    }));
    for (const match of values.articleBody.matchAll(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(?:, \d{4})? at \d{1,2}:\d{2} [AP]M ET\b/gu)) {
      if (!allowedPairs.has(match[0])) issues.push(`Changed calculated date and time: ${match[0]}.`);
    }
  }
  const text = Object.values(values).join('\n');
  if (/\b(?:fall|detriment)\b[^.!?\n]{0,130}\b(?:because|due to)\b[^.!?\n]{0,100}\b(?:ruled|ruler|rulership)\b/iu.test(text))
    issues.push('Sign rulership does not establish fall or detriment.');
  const months = 'January|February|March|April|May|June|July|August|September|October|November|December';
  const dates = [...plan.developed, ...plan.requiredDates].map(item => item.event.dateLabel);
  dates.push(...[plan.coverage.start, plan.coverage.end].map(date =>
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date))));
  dates.push(...plan.verifiedHistoryInstants.map(date =>
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date))));
  const allowedDates = new Set(dates.flatMap(date => [date, date.replace(/, \d{4}$/u, '')]));
  const datePattern = new RegExp(`\\b(${months}) \\d{1,2}(?:[-–—]\\d{1,2})?(?:, \\d{4})?`, 'gu');
  for (const match of text.matchAll(datePattern)) {
    if (!allowedDates.has(match[0]))
      issues.push(`Date outside the supplied event plan: ${match[0]}.`);
  }
  if (/\b(?:your natal|born with|since childhood)\b/iu.test(text)) issues.push('A dated collective ingress is not a natal biography.');
  // The closing lookup may state the method without assigning the season sign
  // to a house. Remove only this exact relationship inside that field; all
  // separate sign/number/life-area claims still receive the same check.
  const houseText = Object.entries(values).map(([field, value]) => field === 'closingBody'
    ? value.replace(/\b(?:with|using|use|treat(?:ing)?)\s+(?:(?:the|your)\s+)?rising sign\s+as\s+(?:(?:the|your)\s+)?first house\b/giu, '')
    : value).join('\n');
  if (/\b(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\d{1,2}(?:st|nd|rd|th))\s+house\b/iu.test(houseText)
    || /\b(?:Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)(?:['’]s)?\s+(?:whole[- ]sign\s+)?house\s+of\b/iu.test(houseText))
    issues.push('No rising sign is supplied; a zodiac sign does not establish a personal house number or house life area.');
  return { version, validationVersion: 'sky-ingress-validation/v3-2026-10-21', passed: issues.length === 0, issues: [...new Set(issues)], advisories,
    planSha256: context.receipt.planSha256, ownerApproved: false };
}
