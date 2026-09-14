import { isZodiacSeasonSourceKey } from "./resolver/zodiacSeasonVariables.mjs";
import skyReaderRelease from "./authored-inputs/sky-v4-reader-copy-280-serving-release-v1.json" with { type: "json" };
import skyReaderApproval from "./authored-inputs/sky-v4-reader-copy-280-owner-approval-v1.json" with { type: "json" };
import { isDynamicTransitNatalExactKey } from "../transitNatalIdentity.js";
export { isDynamicTransitNatalExactKey } from "../transitNatalIdentity.js";

const canonicalKeys = new Set<string>(skyReaderRelease.serving_enabled ? skyReaderApproval.approved_keys : []);
export function isCanonicalSkyReaderRecord(record: { contentKey: string; source_package?: unknown; serving_enabled?: unknown; owner_approved?: unknown }) {
  return canonicalKeys.has(record.contentKey)
    && record.source_package === "SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30"
    && record.serving_enabled === true && record.owner_approved === true;
}

const retrogradeCapableNatalBodies = new Set([
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "lilith",
  "north-node",
  "south-node"
]);

const natalBodies = new Set([
  "sun",
  "moon",
  ...retrogradeCapableNatalBodies
]);

const zodiacSigns = new Set([
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
]);

const exactNatalPlacementPrefix = "fallback-hook/natal-you-placement-complete-final/";

export type FallbackDashboardExtensionRecord = {
  contentKey: string;
  content_role?: unknown;
  reader_only?: unknown;
  render_policy?: unknown;
  studio_version_status?: unknown;
};

export function isDynamicNatalPlacementExactKey(contentKey: string) {
  if (!contentKey.startsWith(exactNatalPlacementPrefix)) return false;
  const parts = contentKey.slice(exactNatalPlacementPrefix.length).split("/");
  if (parts.length !== 3 && parts.length !== 4) return false;
  const [planet, sign, house, motion] = parts;
  if (!natalBodies.has(planet) || !zodiacSigns.has(sign) || !/^(?:[1-9]|1[0-2])$/u.test(house)) return false;
  if (motion === undefined) return true;
  return motion === "retrograde" && retrogradeCapableNatalBodies.has(planet);
}

export function isDynamicNatalPlacementExactRecord(record: FallbackDashboardExtensionRecord) {
  return isDynamicNatalPlacementExactKey(record.contentKey)
    && record.content_role === "full_copy"
    && record.reader_only === true
    && record.render_policy === "reader-only-exact-lived-v1";
}

const natalAspectBodies = new Set([...natalBodies, "ascendant", "midheaven", "descendant", "imum-coeli", "vertex", "part-of-fortune"]);
const natalAspects = new Set(["conjunction", "opposition", "square", "trine", "sextile", "quincunx", "semisextile", "semisquare", "sesquiquadrate", "quintile", "biquintile"]);
export function isDynamicNatalAspectExactRecord(record: FallbackDashboardExtensionRecord) {
  const prefix = "fallback-hook/natal-aspect-lived/";
  if (!record.contentKey.startsWith(prefix)) return false;
  const parts = record.contentKey.slice(prefix.length).split("/");
  return parts.length === 3 && natalAspectBodies.has(parts[0]) && natalAspects.has(parts[1]) && natalAspectBodies.has(parts[2])
    && parts[0] !== parts[2] && record.content_role === "full_copy" && record.reader_only === true && record.render_policy === "reader-only-exact-lived-v1";
}

export function isDynamicTransitNatalExactRecord(record: FallbackDashboardExtensionRecord) {
  return isDynamicTransitNatalExactKey(record.contentKey)
    && record.content_role === "full_copy"
    && record.reader_only === true
    && record.render_policy === "personal-transit-exact-v1";
}

/** Families already addressed by renderTransitHouse and renderSynastryAspect. */
export function isDynamicHouseTransitRecord(record: FallbackDashboardExtensionRecord) {
  if (record.content_role !== "full_copy") return false;
  const [prefix, family, planet, house, sign, extra] = record.contentKey.split("/");
  if (prefix !== "authored" || !natalBodies.has(planet) || !/^(?:[1-9]|1[0-2])$/u.test(house)) return false;
  if (family === "transit-house-intro" || family === "transit-house") return sign === undefined;
  return family === "transit-house-sign" && zodiacSigns.has(sign) && extra === undefined;
}

export function isDynamicSynastryExactRecord(record: FallbackDashboardExtensionRecord) {
  if (record.content_role !== "full_copy") return false;
  const [prefix, family, first, second, aspect, extra] = record.contentKey.split("/");
  const endpoint = (point: string) => natalBodies.has(point) || ["ascendant", "descendant", "midheaven", "imum-coeli"].includes(point);
  return prefix === "fallback-hook" && family === "synastry-pair" && endpoint(first) && endpoint(second)
    && ["conjunction", "opposition", "square", "trine", "sextile"].includes(aspect) && extra === undefined;
}

export function isFallbackDashboardRecordAllowed(
  record: FallbackDashboardExtensionRecord,
  currentPackageKeys: ReadonlySet<string>
) {
  return (isZodiacSeasonSourceKey(record.contentKey) && record.content_role === "fallback_hook")
    || currentPackageKeys.has(record.contentKey)
    || isDynamicNatalPlacementExactRecord(record)
    || isDynamicNatalAspectExactRecord(record)
    || isDynamicTransitNatalExactRecord(record)
    || isDynamicHouseTransitRecord(record)
    || isDynamicSynastryExactRecord(record)
    || (isCanonicalSkyReaderRecord(record) && record.studio_version_status === "approved-serving-revision");
}
