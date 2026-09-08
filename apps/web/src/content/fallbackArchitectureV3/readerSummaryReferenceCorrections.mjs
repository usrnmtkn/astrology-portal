import corrections from "./authored-inputs/reader-summary-reference-removals-v1.json" with { type: "json" };

// Exact summary versions only. Keep the long-form source records and SHA-256
// implementation outside the initial reader dependency graph.
export function correctedReaderSummary(contentKey, original) {
  const correction = corrections.records.find(record => record.previous_text === original && record.content_keys.includes(contentKey));
  return correction ? correction.text : original;
}
