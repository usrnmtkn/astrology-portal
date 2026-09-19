import { fallbackHookWords } from "./fallbackHookTitle";
import { transitNatalAspects, transitNatalPlanets, transitNatalPoints, transitNatalSharedFallbackKey } from "./transitNatalSources";

export type BondEffectContact = {
  planet: string;
  aspect: string;
};

export type SynastryPairCandidate = {
  contentKey: string;
  forward: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseBondEffectContentKey(contentKey: string): BondEffectContact | null {
  const normalized = contentKey.startsWith("fallback-hook/") ? contentKey : `fallback-hook/${contentKey}`;
  const match = /^fallback-hook\/bond-effect-([a-z0-9-]+)\/([a-z0-9-]+)(?:\/variant-\d+)?$/u.exec(normalized);
  if (!match) return null;
  return { aspect: match[1], planet: match[2] };
}

export function bondEffectExactContentKey(planet: string, aspect: string) {
  return `fallback-hook/bond-effect-${aspect}/${planet}`;
}

export function friendsTransitCardDestinations(query: string) {
  const parsed = parseAstroContactSearch(query);
  const contact = transitNatalSearchSelection(query);
  return {
    parsed,
    contact,
    betweenYouTwoOpeningKey: parsed.transiting && parsed.aspect
      ? bondEffectExactContentKey(parsed.transiting, parsed.aspect)
      : null,
    activeForNameKey: contact
      ? `authored/transit-aspect/${contact.planet}/${contact.natalPoint}/${contact.aspect}`
      : null
  };
}

const contactSearchStopwords = new Set([
  "a", "an", "the", "your", "you", "natal", "compatibility", "effect", "between", "two", "aspect", "to"
]);

const contactSearchPoints = new Set<string>([...transitNatalPlanets, ...transitNatalPoints]);
const contactSearchAspects = new Map<string, string>([
  ...transitNatalAspects.map((aspect) => [aspect, aspect] as const),
  ["conjunct", "conjunction"],
  ["opposite", "opposition"]
]);

export type AstroContactSearch = {
  transiting: string | null;
  aspect: string | null;
  natal: string | null;
};

export function parseAstroContactSearch(query: string): AstroContactSearch {
  let text = ` ${query.toLowerCase()} `;
  for (const point of [...contactSearchPoints].sort((left, right) => right.length - left.length)) {
    const spaced = point.replace(/-/gu, " ");
    text = text.replaceAll(` ${spaced} `, ` ${point} `);
  }
  const tokens = text
    .replace(/[/_.:,"{}[\]]+/gu, " ")
    .split(/\s+/u)
    .filter((token) => token && !contactSearchStopwords.has(token));
  const aspectToken = tokens.find((token) => contactSearchAspects.has(token));
  const aspect = aspectToken ? contactSearchAspects.get(aspectToken) ?? null : null;
  const points = tokens.filter((token) => token !== aspectToken && contactSearchPoints.has(token));
  return { transiting: points[0] ?? null, aspect, natal: points[1] ?? null };
}

export function matchesBondEffectContactSearch(contentKey: string, query: string) {
  const bond = parseBondEffectContentKey(contentKey);
  const contact = parseAstroContactSearch(query);
  if (!bond || (!contact.transiting && !contact.aspect)) return false;
  if (contact.transiting && contact.transiting !== bond.planet) return false;
  if (!contact.aspect) return true;
  return bond.aspect === contact.aspect || bond.aspect === synastryAspectFamily(contact.aspect);
}

export function transitNatalSearchSelection(query: string) {
  const contact = parseAstroContactSearch(query);
  if (!contact.transiting || !contact.aspect || !contact.natal) return null;
  if (!transitNatalPlanets.includes(contact.transiting as typeof transitNatalPlanets[number])) return null;
  if (!transitNatalAspects.includes(contact.aspect as typeof transitNatalAspects[number])) return null;
  if (!transitNatalPoints.includes(contact.natal as typeof transitNatalPoints[number])) return null;
  return {
    planet: contact.transiting as typeof transitNatalPlanets[number],
    aspect: contact.aspect as typeof transitNatalAspects[number],
    natalPoint: contact.natal as typeof transitNatalPoints[number]
  };
}

export function matchesTransitNatalContactSearch(contentKey: string, query: string) {
  const wanted = parseAstroContactSearch(query);
  if (!wanted.transiting && !wanted.aspect) return false;
  if (!contentKey.startsWith("authored/transit-aspect/")) return false;
  const [, , planet, natal, aspect] = contentKey.split("/");
  if (!planet || !natal || !aspect) return false;
  if (wanted.transiting && wanted.transiting !== planet) return false;
  if (wanted.natal && wanted.natal !== natal) return false;
  if (!wanted.aspect) return true;
  if (wanted.aspect === aspect) return true;
  if (!wanted.transiting || !wanted.natal) return false;
  const shared = transitNatalSharedFallbackKey({
    planet: wanted.transiting as typeof transitNatalPlanets[number],
    natalPoint: wanted.natal as typeof transitNatalPoints[number],
    aspect: wanted.aspect as typeof transitNatalAspects[number]
  });
  return Boolean(shared && (contentKey === shared || contentKey.startsWith(`${shared}/`)));
}

export function synastryAspectFamily(aspect: string) {
  if (aspect === "square" || aspect === "opposition") return "hard";
  if (aspect === "trine" || aspect === "sextile") return "soft";
  return null;
}

export function synastryPairLookupOrder(
  readerPoint: string,
  friendPoint: string,
  aspect: string
): SynastryPairCandidate[] {
  const family = synastryAspectFamily(aspect);
  const candidates: SynastryPairCandidate[] = [
    { contentKey: `fallback-hook/synastry-pair/${readerPoint}/${friendPoint}/${aspect}`, forward: true },
    { contentKey: `fallback-hook/synastry-pair/${friendPoint}/${readerPoint}/${aspect}`, forward: false }
  ];
  if (family) {
    candidates.push(
      { contentKey: `fallback-hook/synastry-pair/${readerPoint}/${friendPoint}/${family}`, forward: true },
      { contentKey: `fallback-hook/synastry-pair/${friendPoint}/${readerPoint}/${family}`, forward: false }
    );
  }
  return candidates;
}

export function fillNamedSlots(text: string, slots: Record<string, string>) {
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/gu, (full, key: string) => slots[key] ?? full);
}

export function synastryHolderSlots(forward: boolean, otherName: string) {
  const name = otherName.trim() || "Name";
  if (forward) {
    return {
      holder1: "you",
      holder2: name,
      holder1Poss: "your",
      holder2Poss: `${name}'s`,
      holder1PossCap: "Your",
      holder2PossCap: `${name}'s`
    };
  }
  return {
    holder1: name,
    holder2: "you",
    holder1Poss: `${name}'s`,
    holder2Poss: "your",
    holder1PossCap: `${name}'s`,
    holder2PossCap: "Your"
  };
}

export function aspectTechnicalVerb(aspect: string) {
  if (aspect === "conjunction") return "conjunct";
  if (aspect === "opposition") return "opposite";
  return aspect;
}

function houseOrdinal(house: string) {
  const value = Number(house);
  if (!Number.isInteger(value) || value < 1 || value > 12) return "";
  const suffix = value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
  return `${value}${suffix}`;
}

export function friendsTransitReaderTitle(planet: string, aspect: string, natalPoint?: string | null) {
  const lead = `${fallbackHookWords(planet)} ${aspectTechnicalVerb(aspect)}`;
  return natalPoint ? `${lead} your ${fallbackHookWords(natalPoint)}` : lead;
}

export const FRIENDS_TRANSIT_COMPOSITION_DEFAULT = {
  planet: "chiron",
  aspect: "sextile",
  natalPoint: "sun"
} as const;

export function friendsTransitCompositionContact(query: string) {
  const parsed = parseAstroContactSearch(query);
  return {
    planet: parsed.transiting ?? FRIENDS_TRANSIT_COMPOSITION_DEFAULT.planet,
    aspect: parsed.aspect ?? FRIENDS_TRANSIT_COMPOSITION_DEFAULT.aspect,
    natalPoint: parsed.natal ?? FRIENDS_TRANSIT_COMPOSITION_DEFAULT.natalPoint
  };
}

export function friendsTransitCompositionQuery(query: string) {
  const contact = friendsTransitCompositionContact(query);
  return friendsTransitReaderTitle(contact.planet, contact.aspect, contact.natalPoint);
}

export function friendsActivationParam(friendPoint: string, aspect: string) {
  return `${friendPoint}/${aspect}`;
}

export function parseFriendsActivationParam(value: string | null | undefined) {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return null;
  const parts = raw.split("/").map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const aspectToken = contactSearchAspects.has(parts[1]) ? parts[1] : parts[0];
  const friendToken = aspectToken === parts[1] ? parts[0] : parts[1];
  const aspect = contactSearchAspects.get(aspectToken);
  if (!aspect || !contactSearchPoints.has(friendToken)) return null;
  return { friendPoint: friendToken, aspect };
}

export function bondEffectPageHeadline(planet: string, aspect: string, natalPoint: string) {
  return friendsTransitReaderTitle(planet, aspect, natalPoint);
}

export function bondActivationHeadline(
  natalPoint: string,
  aspect: string,
  friendName: string,
  friendPoint: string
) {
  const name = friendName.trim() || "Name";
  return `Your ${fallbackHookWords(natalPoint)} ${aspectTechnicalVerb(aspect)} ${name}'s ${fallbackHookWords(friendPoint)}`;
}

export function bondCalculatedFactLine(input: {
  planet: string;
  transitSign: string;
  transitHouse: string;
  aspect: string;
  natalPoint: string;
  natalSign: string;
}) {
  const house = houseOrdinal(input.transitHouse);
  const transiting = [
    fallbackHookWords(input.planet),
    input.transitSign ? `in ${fallbackHookWords(input.transitSign)}` : "",
    house ? `in your ${house} house` : ""
  ].filter(Boolean).join(" ");
  const natal = [
    "your natal",
    fallbackHookWords(input.natalPoint),
    input.natalSign ? `in ${fallbackHookWords(input.natalSign)}` : ""
  ].filter(Boolean).join(" ");
  return `${transiting} is ${aspectTechnicalVerb(input.aspect)} ${natal}.`;
}

export function synastryBodiesFromPayload(payload: unknown) {
  if (!isRecord(payload)) return null;
  const packaged = isRecord(payload.packageSource) ? payload.packageSource : null;
  const row = Array.isArray(payload.rows) && isRecord(payload.rows[0]) ? payload.rows[0] : null;
  const sections = row && isRecord(row.sections) ? row.sections : null;
  const draft = sections && isRecord(sections.packageDraft) ? sections.packageDraft : null;
  const source = packaged ?? draft;
  if (!source) return null;
  const you = typeof source.body_you === "string" ? source.body_you : "";
  const they = typeof source.body_they === "string" ? source.body_they : "";
  const contentKey = typeof source.contentKey === "string"
    ? source.contentKey
    : typeof row?.content_key === "string" ? row.content_key : "";
  if (!you.trim() && !they.trim()) return null;
  return { contentKey, body_you: you, body_they: they };
}
