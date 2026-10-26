import { transitWritingAspects, transitWritingBodies } from './transitWritingIdentity.js';

export const SKY_PLACEMENT_ASPECT_BRIDGE_PREFIX = 'fallback-hook/sky-house-aspect-bridge/';
export const SKY_PLACEMENT_ASPECT_BRIDGE_POLICY = 'sky-placement-house-aspect-bridge-v1';
export const placementBridgeBodies = transitWritingBodies;
export const placementBridgeAspects = transitWritingAspects;
export const placementBridgeNatalPoints = [...transitWritingBodies, 'ascendant', 'descendant', 'midheaven', 'imum-coeli'] as const;
export type PlacementAspectBridgeIdentity = { house: number; transiting: string; aspect: string; natal: string };
const datedTiming = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}\b|\b\d{4}-\d{2}-\d{2}\b/iu;

export function skyPlacementAspectBridgeKey({ house, transiting, aspect, natal }: PlacementAspectBridgeIdentity) {
  if (!Number.isInteger(house) || house < 1 || house > 12
    || !(placementBridgeBodies as readonly string[]).includes(transiting)
    || !(placementBridgeAspects as readonly string[]).includes(aspect)
    || !(placementBridgeNatalPoints as readonly string[]).includes(natal)) return null;
  return `${SKY_PLACEMENT_ASPECT_BRIDGE_PREFIX}${house}/${transiting}/${aspect}/${natal}`;
}

export function skyPlacementAspectBridgeIdentity(key: string): PlacementAspectBridgeIdentity | null {
  if (!key.startsWith(SKY_PLACEMENT_ASPECT_BRIDGE_PREFIX)) return null;
  const [house, transiting, aspect, natal, extra] = key.slice(SKY_PLACEMENT_ASPECT_BRIDGE_PREFIX.length).split('/');
  const identity = { house: Number(house), transiting, aspect, natal };
  return extra === undefined && skyPlacementAspectBridgeKey(identity) === key ? identity : null;
}

export function skyPlacementAspectBridgeErrors(key: string, body: string) {
  if (!skyPlacementAspectBridgeIdentity(key)) return ['Choose a supported house and aspect contact.'];
  if (!body.trim()) return ['Write the bridge before publishing.'];
  if (/[{}]/u.test(body)) return ['Write the bridge as complete prose. Timing is supplied by the reader.'];
  if (datedTiming.test(body)) return ['Keep dates in the calculated timing, separate from the bridge.'];
  return [];
}

/** Adds a separate bridge without deleting or rewriting any source text.
 * Source-owned timing stays in place; an existing opening timing sentence
 * precedes the bridge. Untimed sources receive one calculated lead-in.
 */
export function skyPlacementAspectParagraphs(body: string, bridge: string | null | undefined, timing: string | null | undefined) {
  const paragraphs = body.split(/\n\s*\n/u);
  const first = paragraphs[0] ?? '';
  const dated = datedTiming.test(body);
  const duration = /\b(?:for (?:the next|another)|lasts? (?:about |a |an |one |two |three |several |\d)|over the next|this (?:week|month|year)|today|tonight)\b/iu.test(body);
  // A month abbreviation's period is part of the date, not the sentence end.
  const opening = /^(?:(?:Through|Until|From|Between|For the next|Over the next)\b)[^\n]*?[.!?](?=\s(?!\d)|$)/u.exec(first)?.[0];
  const lead = !dated && !duration && timing ? `${timing.replace(/[.!?]$/u, '')}.` : '';
  if (bridge && opening) paragraphs[0] = `${opening} ${bridge}${first.slice(opening.length)}`;
  else if (lead || bridge) paragraphs[0] = `${[lead, bridge].filter(Boolean).join(' ')} ${first}`;
  return paragraphs;
}
