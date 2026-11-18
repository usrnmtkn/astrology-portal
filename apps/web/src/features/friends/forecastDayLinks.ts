import { rateRelationshipContacts, type ForecastContact, type ForecastSynastry, type RelationshipForecastDay } from "../../services/relationshipForecast";

export type ForecastDayLink = { link: ForecastSynastry; contacts: ForecastContact[] };

/** Presentation only: use the existing rating's drivers, not the personal
 * mainThemes alias stored in day.drivers. A shared link needs both calculated
 * endpoints; an indirect personal contact cannot establish a pair influence. */
export function forecastDayLinks(day: RelationshipForecastDay): ForecastDayLink[] {
  const contacts = new Map(day.contacts.map(contact => [contact.id, contact]));
  const links = new Map<string, ForecastDayLink>();
  for (const id of rateRelationshipContacts(day.contacts).drivers) {
    const driver = contacts.get(id);
    if (!driver) continue;
    for (const link of driver.connections) {
      const direct = link.directContactId && contacts.get(link.directContactId);
      if (!direct || direct.owner === driver.owner) continue;
      if (!links.has(link.id)) links.set(link.id, { link, contacts: [] });
    }
  }
  for (const group of links.values()) {
    group.contacts = day.contacts.filter(contact => contact.connections.some(link =>
      link.id === group.link.id && link.directContactId && contacts.get(link.directContactId)?.owner !== contact.owner
      && contacts.has(link.directContactId)));
  }
  return [...links.values()].filter(group => group.contacts.length > 0);
}

export const forecastAspectOrder = ["conjunction", "opposition", "square", "trine", "sextile"] as const;
export const forecastTransitIdentity = (contact: Pick<ForecastContact, "planet" | "aspect" | "target">) =>
  `${contact.planet}|${contact.aspect}|${contact.target}`;
