const SHARED_ECLIPSE_SECTION_IDS = new Set([
  "nature",
  "mechanics",
  "recommendation",
  "close"
]);

/**
 * Resolve a reviewed eclipse section that is shared across signs.
 *
 * The phase remains part of the namespace so lunar-only language can never
 * leak into a solar eclipse card. House-specific openings and evergreen book
 * bodies deliberately return null and remain under their per-sign keys.
 */
export function sharedLunationEclipseSectionKey(kind, sectionId) {
  if (!SHARED_ECLIPSE_SECTION_IDS.has(sectionId)) return null;
  const phase = kind === "eclipse-lunar"
    ? "lunar"
    : kind === "eclipse-solar"
      ? "solar"
      : null;
  return phase
    ? `authored/lunation-eclipse-section/shared/${phase}/${sectionId}`
    : null;
}
