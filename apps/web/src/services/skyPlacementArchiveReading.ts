import type { LocationInput } from "../types";
import { transitV3AuthoredCardForContentKey } from "../content/fallbackArchitectureV3Runtime";
import { calendarLocalDateKey } from "../features/calendar/calendarPhaseLabel";
import { loadLiveGeneratedContentForKeys, type LiveGeneratedContent } from "./generatedContent";
import { loadSkyDetailContent } from "./skyDetailContent";
import { getSkyPlacementSnapshotOffMainThread } from "./skyCalculationClient";
import { skyPlacementInSignAspectContentKeys } from "./skyPlacementAspectContentKeys";
import { skyDateTimeFromInput } from "./skySelection";

export async function loadSkyPlacementArchiveReading(key: string, location: LocationInput, existing: Map<string, LiveGeneratedContent>) {
  const source = transitV3AuthoredCardForContentKey(key);
  const [, planet, sign] = key.split("/");
  const start = source?.valid_from, end = source?.valid_to;
  if (typeof start !== "string" || typeof end !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(start)
    || !/^\d{4}-\d{2}-\d{2}$/u.test(end) || start > end) throw new Error("Archived placement dates are unavailable.");
  const sky = await getSkyPlacementSnapshotOffMainThread(location, planet, sign,
    skyDateTimeFromInput(start, location, true), true, "placement");
  const facts = sky.placementAspectFacts;
  if (!facts) throw new Error("Archived placement events are unavailable.");
  const timeZone = facts.timeZone;
  const inSign = facts.inSign.filter(event => {
    const day = calendarLocalDateKey(event.occursAt, timeZone);
    return day >= start && day <= end;
  });
  const snapshot = { ...sky, placementAspectFacts: { ...facts, inSign } };
  const keys = skyPlacementInSignAspectContentKeys(inSign, timeZone);
  return { placementSky: snapshot, content: await loadSkyDetailContent(snapshot, existing, [key, ...keys], loadLiveGeneratedContentForKeys, keys) };
}
