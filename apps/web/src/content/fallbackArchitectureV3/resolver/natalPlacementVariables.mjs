/** Fill only the declared name variable; authored pronouns and prose stay intact. */
export function natalPlacementOwnerCopy(body, voice) {
  return voice === "you" ? body : body.split("{{ownerName}}").join(voice);
}

/** Variables supplied by renderNatalPlanet, including inside its shared house hook. */
export function natalPlacementVariableNames(contentKey) {
  const signTemplate = /^fallback-template\/natal\.planet-in-sign(?:\/[^/]+)?$/u.test(contentKey)
    || contentKey === "fallback-template/natal.node-in-sign";
  const houseTemplate = contentKey === "fallback-template/natal.house-context"
    || /^fallback-hook\/house-meaning\/(?:[1-9]|1[0-2])$/u.test(contentKey);
  if (!signTemplate && !houseTemplate) return [];
  return ["possessive", "planetTitle", "planetRef", "planetRefCap", "signTitle",
    "planetTopic", "planetCore", "planetExcess", "planetProductive", "planetVerb",
    "signStyle", "signNeed", "signAdverb", ...(houseTemplate ? ["houseOrdinal"] : [])];
}
