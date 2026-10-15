/** Initial current-Sky readers can share the same exact-selection bootstrap. */
export function isInitialSkyReaderHash(hash) {
  return /^#\/?sky\/?$/u.test(hash)
    || /^#\/?sky\/placement\/[a-z-]+(?:\/[a-z-]+)?\/?$/u.test(hash)
    || /^#\/?sky\/retrograde\/[a-z-]+\/?$/u.test(hash);
}

const points = new Set([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus",
  "neptune", "pluto", "chiron", "lilith", "north-node", "south-node"
]);
const signs = new Set([
  "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio",
  "sagittarius", "capricorn", "aquarius", "pisces"
]);

export function eligiblePlacementHintHref(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  if (url.pathname !== "/"
    || ["auth", "code", "access_token", "error", "error_code"].some(key => url.searchParams.has(key))) {
    return false;
  }
  const match = /^#\/?sky\/placement\/([a-z-]+)\/([a-z-]+)\/?$/u.exec(url.hash);
  return Boolean(match && points.has(match[1]) && signs.has(match[2]));
}

export function eligiblePlacementHintContinuation(originalHref, currentHref, workerSupported, initialCaptured) {
  if (!workerSupported || !initialCaptured
    || !eligiblePlacementHintHref(originalHref) || !eligiblePlacementHintHref(currentHref)) {
    return false;
  }
  return new URL(originalHref).origin === new URL(currentHref).origin;
}
