const compositeSourceBody = "(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|north_node|south_node|ascendant|descendant|midheaven|imum_coeli)";
const compositeSourceKey = new RegExp(`^composite\\.(?:${compositeSourceBody}|house\\.${compositeSourceBody}\\.house_(?:[1-9]|1[0-2])|aspect\\.${compositeSourceBody}\\.(?:conjunction|sextile|square|trine|opposition)\\.${compositeSourceBody})$`, "u");
const compositeAliasKey = new RegExp(`^composite-${compositeSourceBody.replaceAll("_", "-")}-(?:in-(?:aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)|house-?(?:[1-9]|1[0-2]))$`, "u");

export function isReusableCompositeSourceKey(contentKey?: string) {
  return Boolean(contentKey && (compositeSourceKey.test(contentKey) || compositeAliasKey.test(contentKey)));
}

/** Only shared feed sources and their private proposals can use revision publication. */
export function compositeRevisionTarget(row: {
  surface?: string | null; mode?: string | null; content_key?: string; contentKey?: string;
  event_type?: string | null; target_date?: string | null; facts?: Record<string, unknown> | null;
  source_snapshot?: Record<string, unknown> | null; sourceSnapshot?: Record<string, unknown> | null;
} | null | undefined, mode: "feed" | "studio-draft" = "feed") {
  return row?.surface === "composite" && row.mode === mode
    && (mode === "feed" || row.event_type === "standalone-article-revision")
    && row.target_date == null && isReusableCompositeSourceKey(row.content_key ?? row.contentKey)
    && !row.facts?.sampleOnly && !(row.source_snapshot ?? row.sourceSnapshot)?.sampleOnly;
}
