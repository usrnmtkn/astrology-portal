/** Initial current-Sky readers can share the same exact-selection bootstrap. */
export function isInitialSkyReaderHash(hash) {
  // A fresh bare-homepage visit opens Sky. Respect a saved destination so a
  // restored profile, Calendar or Friends visit does not start Sky requests.
  if (!hash) {
    try {
      const saved = window.localStorage.getItem("tldrastro:portalMode");
      return saved === null || saved === "guest" || saved === "member";
    } catch { return true; }
  }
  return /^#\/?sky\/?$/u.test(hash)
    || /^#\/?sky\/placement\/[a-z-]+(?:\/[a-z-]+)?\/?$/u.test(hash)
    || /^#\/?sky\/retrograde\/[a-z-]+\/?$/u.test(hash);
}
