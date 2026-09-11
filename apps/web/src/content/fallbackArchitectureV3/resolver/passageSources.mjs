/** Metadata only: the resolver remains the sole owner of rendered wording. */
export function passageSources(body, contributions, sourceFor, headlineSources = []) {
  const ranges = contributions.map(({ text, keys, start = 0 }) => {
    const from = body.indexOf(text, start);
    if (from < 0) throw new Error("Passage source receipt does not match the rendered text.");
    return { from, to: from + text.length, sources: keys.filter(Boolean).map(sourceFor) };
  });
  const unique = sources => [...new Map(sources.map(source => [`${source.contentKey}:${source.field}`, source])).values()];
  let offset = 0;
  const paragraphs = body.split(/\n\n+/u).map(text => {
    const start = body.indexOf(text, offset);
    const end = start + text.length;
    offset = end;
    return { text, sources: unique(ranges.filter(range => range.from < end && range.to > start).flatMap(range => range.sources)) };
  });
  return {
    paragraphSources: paragraphs,
    sourceKeys: [...new Set(paragraphs.flatMap(paragraph => paragraph.sources.map(source => source.contentKey)))],
    headlineSources
  };
}

export function passageSource(row, audience = "you", field) {
  if (!row) throw new Error("Passage source receipt refers to an unavailable source.");
  const selected = field ?? (audience === "they" && row.body_they != null ? "body_they" : row.body_you != null ? "body_you" : "body");
  return { contentKey: row.contentKey, field: selected, audience };
}
