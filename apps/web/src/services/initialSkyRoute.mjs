/** Initial current-Sky readers can share the same exact-selection bootstrap. */
export function isInitialSkyReaderHash(hash) {
  return /^#\/?sky\/?$/u.test(hash)
    || /^#\/?sky\/placement\/[a-z-]+(?:\/[a-z-]+)?\/?$/u.test(hash)
    || /^#\/?sky\/retrograde\/[a-z-]+\/?$/u.test(hash);
}
