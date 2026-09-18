import { fallbackHookWords } from "./fallbackHookTitle";

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
  const match = /^fallback-hook\/bond-effect-([a-z0-9-]+)\/([a-z0-9-]+)(?:\/variant-\d+)?$/u.exec(contentKey);
  if (!match) return null;
  return { aspect: match[1], planet: match[2] };
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

export function bondEffectPageHeadline(planet: string, aspect: string, natalPoint: string) {
  return `${fallbackHookWords(planet)} ${aspectTechnicalVerb(aspect)} your ${fallbackHookWords(natalPoint)}`;
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
