import type { SkySnapshot } from "../../../src/shared/types";
import { isSkyReaderPreviewDate, skyPreviewReferenceDate } from "../../../src/shared/skyReaderPreview";
import { zonedDateTimeToUtc } from "../../web/src/services/timezones";
import { TRADITIONAL_DIGNITY_PLANETS, traditionalSkyDebilities } from "../../web/src/services/planetSignDignity.mjs";
import { skyDebilityInterpretationKey, skyDebilityInterpretationPlacements } from "../../web/src/content/skyDebilityInterpretation";
import { assembleSkyDebilityCopy, joinSkyDebilityList } from "../../web/src/content/skyDebilityAssembly";
import { skyDebilityPlacementLinks, type SkyDebilityDisplayPosition } from "../../web/src/content/skyDebilityPresentation";
import type { SummaryCompositionRow } from "./skySummaryComposition";

export const skyDebilityReviewDraftPrefix = "cms/sky-debility/review-draft/";
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function skyDebilityPreviewRange(now: Date, timeZone: string) {
  const min = skyPreviewReferenceDate(now.toISOString(), timeZone);
  const end = new Date(`${min}T12:00:00Z`);
  const month = end.getUTCMonth();
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  // Feb 29 ends at Feb 28 in a non-leap year, rather than spilling into March.
  if (end.getUTCMonth() !== month) end.setUTCDate(0);
  end.setUTCDate(end.getUTCDate() - 1);
  return { min, max: end.toISOString().slice(0, 10) };
}

export function skyDebilityPreviewInstant(date: string, time: string, timeZone: string, range: { min: string; max: string }) {
  if (!isSkyReaderPreviewDate(date) || date < range.min || date > range.max) throw new Error("Choose a date within the next 12 months.");
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(time)) throw new Error("Choose a valid preview time.");
  const instant = zonedDateTimeToUtc(date, time, timeZone);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
  if (skyPreviewReferenceDate(instant.toISOString(), timeZone) !== date || parts !== time) throw new Error("This local time does not exist during the daylight-saving change. Choose another time.");
  return instant;
}

/** Reject stale, incomplete and fallback-engine facts before selecting any prose. */
export function verifiedSkyDebilityPreviewPositions(sky: SkySnapshot, instant: string): SkyDebilityDisplayPosition[] {
  const provenance = sky.calculationProvenance;
  const planets: readonly string[] = TRADITIONAL_DIGNITY_PLANETS;
  const positions = sky.positions.filter(row => planets.includes(row.planet));
  if (sky.generatedAt !== instant || provenance?.actualEphemeris !== "swiss"
    || provenance.zodiac !== "tropical" || provenance.frame !== "geocentric"
    || traditionalSkyDebilities(positions).knownCount !== 7
    || planets.some(planet => positions.filter(row => row.planet === planet).length !== 1)
    || positions.some(row => row.motion !== "direct" && row.motion !== "retrograde")) {
    throw new Error("Verified positions for all seven planets are unavailable. Refresh the preview.");
  }
  return positions.map(({ planet, sign, motion }) => ({ planet, sign, motion }));
}

/** Metadata binds reference drafts to runtime identities without promoting them. */
export function selectSkyDebilityPreviewDraft(positions: readonly SkyDebilityDisplayPosition[], rows: SummaryCompositionRow[]) {
  const snapshot = traditionalSkyDebilities(positions);
  if (snapshot.knownCount !== 7) throw new Error("All seven classical planet positions are required.");
  if (!snapshot.count) return { snapshot, key: null, row: null };
  const key = skyDebilityInterpretationKey(positions);
  if (!key) throw new Error("The calculated planet, sign, and motion combination is incomplete.");
  const matches = rows.filter(row => {
    const scope = object(row.source_snapshot?.exactReadingScope);
    const placements = skyDebilityInterpretationPlacements(key);
    return row.content_key.startsWith(skyDebilityReviewDraftPrefix) && row.status === "DRAFT"
      && !row.inventory_only && scope.calculatedSky === true && scope.readingKey === key
      && JSON.stringify(objectPlacements(scope.placements)) === JSON.stringify(placements);
  });
  if (matches.length > 1) throw new Error("More than one saved draft matches this exact sky. Review the duplicate bindings before previewing.");
  return { snapshot, key, row: matches[0] ?? null };
}

function objectPlacements(value: unknown) {
  return Array.isArray(value) ? value.map(item => { const row = object(item); return { planet: row.planet, sign: row.sign, motion: row.motion }; }) : null;
}

/** A reversible fact slot lets the production assembler render the complete
 * CURRENT saved body. Older import templates can never restore stale wording. */
export function assembleSkyDebilityDraftPreview(positions: readonly SkyDebilityDisplayPosition[], rows: SummaryCompositionRow[]) {
  const selected = selectSkyDebilityPreviewDraft(positions, rows);
  if (!selected.row || !selected.key) return { ...selected, copy: null };
  const { row, key, snapshot } = selected;
  const placements = skyDebilityInterpretationPlacements(key)!;
  const keys = placements.map(value => `${value.planet.toLowerCase()}/${value.sign.toLowerCase()}`);
  const list = joinSkyDebilityList(skyDebilityPlacementLinks(keys, placements, "reading").map(link => link.text), "and");
  const body = row.body ?? "";
  if (!body.includes(list)) throw new Error("The saved draft does not contain its complete calculated placement list. Open the draft to review its binding.");
  const copy = assembleSkyDebilityCopy(snapshot, undefined, { contentKey: key, headline: row.headline ?? null, body: body.replace(list, "{planetList}") });
  if (!copy.visible || copy.body !== body) throw new Error("The complete saved wording could not be preserved in the reader preview. Open the draft to review it.");
  return { ...selected, copy };
}
