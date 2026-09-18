import { getSkyPlacementTransitFacts } from "./ephemeris";
import {
  skyPlacementInSignAspectSections,
  type SkyPlacementInSignAspectAuditEvent
} from "./skyPlacementInSignAspectSections";
import type { SkyDetailSection } from "../features/sky/SkyDetailArticle";

export type SkyPlacementResidencyAspectRequest = {
  planet: string;
  sign: string;
  referenceDate: string;
  timeZone: string;
};

export type SkyPlacementResidencyAspectAuditEvent = SkyPlacementInSignAspectAuditEvent;

export type SkyPlacementResidencyAspectResult = {
  status: "resolved" | "unsupported-pilot";
  sections: SkyDetailSection[];
  events: SkyPlacementResidencyAspectAuditEvent[];
  unresolvedEventIds: string[];
};

const PILOT_PLANETS = new Set(["sun"]);

function normalizedPart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

export async function skyPlacementResidencyAspectSections(
  request: SkyPlacementResidencyAspectRequest
): Promise<SkyPlacementResidencyAspectResult> {
  const planet = normalizedPart(request.planet);
  const sign = normalizedPart(request.sign);

  if (!PILOT_PLANETS.has(planet)) {
    return {
      status: "unsupported-pilot",
      sections: [],
      events: [],
      unresolvedEventIds: []
    };
  }

  const referenceDate = new Date(request.referenceDate);
  if (Number.isNaN(referenceDate.getTime())) {
    throw new Error(`Invalid Sky Placement residency aspect reference date: ${request.referenceDate}`);
  }

  const facts = await getSkyPlacementTransitFacts({
    planet,
    sign,
    referenceDate,
    timeZone: request.timeZone
  });

  const built = skyPlacementInSignAspectSections(facts.rankedEventsDuringTransit, facts.timeZone);
  return {
    status: "resolved",
    ...built
  };
}
