import { astro101BlocksFromSections, astro101IsLiveOnLearn, astro101ResolvedReaderPath } from "./astro101";
import { publicationAllowsContent } from "./contentPublicationState";
import type { GeneratedContentRow } from "../services/generatedContent";
import { type ForecastContact, type RelationshipForecastDay } from "../services/relationshipForecast";
import { frictionFlowCopy, type FrictionFlowCopy } from "./frictionFlowCopy";
import { transitAspectDefinitions } from "../astrologyConfig";

export const forecastAspectGuideKey = "education/astro-101/chapter/06-aspects";
export const forecastContactLabel = (contact: ForecastContact, friendName?: string, copy: FrictionFlowCopy = frictionFlowCopy()) => copy("contact/label", {
  planet: contact.planet, aspect: contact.aspect === "conjunction" ? "conjunct" : contact.aspect,
  possessive: contact.owner === "reader" ? copy("feed/your") : `${friendName ?? copy("feed/friend")}’s`, target: contact.target
});

/** The complete published block is preserved, including all five aspect paragraphs. */
export function forecastAspectGuide(rows: GeneratedContentRow[]) {
  const row = rows.find(row => row.content_key === forecastAspectGuideKey);
  if (!row || !astro101IsLiveOnLearn(row) || !publicationAllowsContent(row.content_key, row.id, row.updated_at)) return null;
  const block = astro101BlocksFromSections(row.sections).find(block => block.heading?.replaceAll("’", "'") === "Ptolemy's five");
  return block?.body?.trim() ? { contentKey: row.content_key, body: block.body, href: astro101ResolvedReaderPath(row.content_key, row.facts) } : null;
}

export function forecastContactContribution(contact: ForecastContact, copy: FrictionFlowCopy = frictionFlowCopy()) {
  const angle = transitAspectDefinitions.find(definition => definition.type === contact.aspect)?.exact;
  return [angle === undefined ? "" : copy("method/geometry", { aspect: contact.aspect, angle }),
    copy(contact.connections.some(link => link.directContactId) ? "method/overlap" : "method/personal")].filter(Boolean).join(" ");
}

export function forecastRatingExplanation(day: RelationshipForecastDay, copy: FrictionFlowCopy = frictionFlowCopy()) {
  return copy(`explanation/${day.rating}`);
}
