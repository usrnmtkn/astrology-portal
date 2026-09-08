import skyReaderRelease from "./authored-inputs/sky-v4-reader-copy-280-serving-release-v1.json" with { type: "json" };
import skyReaderApproval from "./authored-inputs/sky-v4-reader-copy-280-owner-approval-v1.json" with { type: "json" };

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

export function isFallbackDashboardRecordAllowed(
  record: FallbackDashboardExtensionRecord,
  currentPackageKeys: ReadonlySet<string>
) {
  return currentPackageKeys.has(record.contentKey)
    || isDynamicNatalPlacementExactRecord(record)
    || isDynamicNatalAspectExactRecord(record)
    || (isCanonicalSkyReaderRecord(record) && record.studio_version_status === "approved-serving-revision");
}
