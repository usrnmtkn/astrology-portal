const compositeSourceBody = "(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|north_node|south_node|ascendant|descendant|midheaven|imum_coeli)";
const compositeSourceKey = new RegExp(`^composite\\.(?:${compositeSourceBody}|house\\.${compositeSourceBody}\\.house_(?:[1-9]|1[0-2])|aspect\\.${compositeSourceBody}\\.(?:conjunction|sextile|square|trine|opposition)\\.${compositeSourceBody})$`, "u");
const compositeAliasKey = new RegExp(`^composite-${compositeSourceBody.replaceAll("_", "-")}-(?:in-(?:aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)|house-?(?:[1-9]|1[0-2]))$`, "u");

export function isReusableCompositeSourceKey(contentKey?: string) {
  return Boolean(contentKey && (compositeSourceKey.test(contentKey) || compositeAliasKey.test(contentKey)));
}
