export const SKY_PLACEMENT_HOROSCOPE_TIERS = Object.freeze([
  "full-owner-authored-horoscope",
  "compact-house-core"
]);

export function requireUniformSkyPlacementHoroscopeSet(entries, { planet, sign }) {
  if (!Array.isArray(entries) || entries.length !== 12) {
    throw new Error(`SOURCE_GAP: rising horoscope set ${planet}/${sign} requires 12 entries`);
  }
  const tiers = new Set(entries.map((entry) => entry.contentTier));
  if (tiers.size !== 1 || !SKY_PLACEMENT_HOROSCOPE_TIERS.includes([...tiers][0])) {
    throw new Error(
      `SOURCE_GAP: mixed or unknown house horoscope tiers ${planet}/${sign} (${[...tiers].join(", ")})`
    );
  }
  return entries;
}
