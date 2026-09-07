import type { FriendTransitReadingBrief, FriendTransitReadingPersonalTransit } from "./friend-transit-reading.js";

export const FRIEND_REPORT_HOUSE_DOMAINS: Record<number, string[]> = {
  1: ["body", "identity", "appearance", "how they enter new situations"],
  2: ["money", "income", "possessions", "what they can rely on"],
  3: ["conversations", "messages", "local routines", "siblings or neighbors"],
  4: ["home", "family", "living situation", "private life"],
  5: ["creativity", "pleasure", "dating", "children"],
  6: ["workday", "routines", "health", "appointments and obligations"],
  7: ["partners", "agreements", "one-to-one relationships", "other people's expectations"],
  8: ["shared money", "debts or taxes", "intimacy", "shared obligations"],
  9: ["travel", "education", "beliefs", "publishing or legal matters"],
  10: ["career", "public role", "reputation", "responsibility and recognition"],
  11: ["friends", "groups", "community", "long-term goals"],
  12: ["rest", "privacy", "endings", "work happening out of view"]
};

export function friendReportHouseDomains(house: number | undefined) {
  return typeof house === "number" ? FRIEND_REPORT_HOUSE_DOMAINS[house] ?? [] : [];
}

function transitWithDomainGuidance(transit: FriendTransitReadingPersonalTransit) {
  const domains = friendReportHouseDomains(transit.evidence.natalHouse);
  if (domains.length === 0) return transit;
  return {
    ...transit,
    summary: `${transit.summary} Lived domains for this natal house: ${domains.join(", ")}. These are areas of life, not claims that a specific event has happened.`
  };
}

export function friendReportWriterBrief(brief: FriendTransitReadingBrief): FriendTransitReadingBrief {
  return {
    ...brief,
    primaryThemes: brief.primaryThemes.map(transitWithDomainGuidance),
    longerCycles: brief.longerCycles.map(transitWithDomainGuidance),
    houseContext: brief.houseContext.map((item) => {
      const domains = friendReportHouseDomains(item.house);
      return domains.length > 0
        ? { ...item, keywords: [...new Set([...item.keywords, ...domains])] }
        : item;
    })
  };
}

export const FRIEND_REPORT_SPECIFICITY_INSTRUCTION = [
  "LIVED-DOMAIN SPECIFICITY",
  "When a selected transit has a natal house, name one or two supplied house domains plainly when they help answer the question.",
  "A house domain is permission to say where the transit may show up, not permission to invent an event.",
  "For example, 4th-house evidence can support home, family, living situation, or private life. It cannot by itself support a claim that the person is moving.",
  "Prefer a concrete supplied domain over vague phrases such as next step, unfinished responsibilities, opportunity, or area of life when the house evidence already tells you where the pressure is landing."
].join("\n");
