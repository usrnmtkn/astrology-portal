const nodeBlockedKeys = new Set();
export function setNodeBlockedContentKeys(keys) {
  nodeBlockedKeys.clear();
  for (const key of keys) nodeBlockedKeys.add(key);
}
export function assertNodePublicationKey(key, SourceGapError) {
  return assertPublicationKey(key, nodeBlockedKeys, SourceGapError);
}
export function assertPublicationKey(key, blockedKeys, SourceGapError) {
  if (!blockedKeys.has(key)) return;
  const error = new SourceGapError(`SOURCE_GAP: Publication unavailable for ${key}.`);
  error.publicationBlocked = true;
  throw error;
}
export function guardPublicationMap(map, assertKey) {
  const get = map.get.bind(map);
  map.get = (key) => { assertKey(key); return get(key); };
  return map;
}
