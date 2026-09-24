let sentenceSegmenter: Intl.Segmenter | undefined;

/** Sky uses the first two sentences; the shared source remains complete.
 * Slice the original string at sentence boundaries, never by character
 * count, and keep shorter copy unchanged. Calendar does not opt in.
 */
export function skySunSummaryExcerpt(body: string): string {
  if (!body.trim() || typeof Intl.Segmenter !== "function") return body;
  sentenceSegmenter ??= new Intl.Segmenter("en", { granularity: "sentence" });
  let sentences = 0;
  let boundary = 0;
  for (const { segment, index } of sentenceSegmenter.segment(body)) {
    if (!segment.trim()) continue;
    if (sentences === 2) return body.slice(0, boundary).trimEnd();
    sentences += 1;
    boundary = index + segment.length;
  }
  return body;
}
