/** Superseded serving identities; historical source records remain immutable.
 * Requested by the owner on 2026-09-10, task 01a08cdf-ebab-7761-8d18-4e57a820487a.
 * The canonical transit-aspect/return resolver replaces these compositions.
 */
export const retiredCompositionFamilies = [
  "cms/personal-transit-aspect/",
  "fallback-hook/transit-house-event-frame/"
];
export function isRetiredCompositionKey(key) {
  return typeof key === "string" && (key === "fallback-template/transit.house-event"
    || retiredCompositionFamilies.some((prefix) => key.startsWith(prefix)));
}
