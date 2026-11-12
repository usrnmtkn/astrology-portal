import type { LunarCalendarEvent } from "../../services/ephemeris.js";
import type { LiveGeneratedContent } from "../../services/generatedContent.js";
import { slugContentPart } from "../../services/generatedContentKeys.js";

function normalizedContentSlots(content: LiveGeneratedContent | null) {
  const sections = content?.sections;

  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return {};
  }

  const slots = (sections as Record<string, unknown>).slots;

  return slots && typeof slots === "object" && !Array.isArray(slots)
    ? slots as Record<string, unknown>
    : {};
}

export function contentMatchesCalendarEventFacts(event: LunarCalendarEvent, content: LiveGeneratedContent | null) {
  if (!content) {
    return false;
  }

  const headline = content.headline?.trim() ?? "";
  const body = content.body.trim();
  const containsEditorialMetadata = /^(?:ms|fallback-hook)\s*\//i.test(headline)
    || /\b(?:REVIEWED|DRAFT)\s*·\s*[a-z-]+\s*·\s*(?:transit|ingress|station)\s*·/u.test(body);

  if (containsEditorialMetadata) {
    return false;
  }

  const slots = normalizedContentSlots(content);
  const slotText = (key: string) => typeof slots[key] === "string" ? String(slots[key]) : "";
  const slotPlanet = slotText("planet");
  const slotSign = slotText("sign");
  const slotPhase = slotText("phase");
  const canonicalKey = typeof content.sourceSnapshot?.canonicalKey === "string" ? content.sourceSnapshot.canonicalKey : content.contentKey;

  if (event.planet && slotPlanet && slotPlanet !== event.planet) {
    return false;
  }

  if (event.sign && slotSign && slotSign !== event.sign) {
    return false;
  }

  if (event.phase && slotPhase && slotPhase !== event.phase) {
    return false;
  }

  if (event.type === "ingress" && event.planet && content.contentKey === `ms/ingress/${slugContentPart(event.planet)}`) {
    return true;
  }

  if (event.type === "station" && event.planet && event.sign && event.phase === "retrograde-passage") {
    const expected = `sky.retrograde.${slugContentPart(event.planet)}.${slugContentPart(event.sign)}.${event.phase.replace(/-/g, "_")}`;

    if (content.contentKey === `ms/retrograde/${slugContentPart(event.planet)}`) {
      return true;
    }

    return canonicalKey === expected;
  }

  if (event.type === "station" && event.planet && event.sign && event.direction && event.phase !== "retrograde-passage") {
    const planetPart = slugContentPart(event.planet);
    const signPart = slugContentPart(event.sign);
    const expected = `sky.station.${planetPart}.${signPart}.${event.direction}`;
    const expectedRetrogradePhase = event.phase
      ? `sky.retrograde.${planetPart}.${signPart}.${event.phase.replace(/-/g, "_")}`
      : "";

    return canonicalKey === expected || canonicalKey === expectedRetrogradePhase;
  }

  return true;
}
