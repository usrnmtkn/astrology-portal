/** Regressions from the owner's Sept 24 report rejection. These exact rejected
 * fragment constructions are negative evidence, never replacement prose. */
const rejectedFragments = [
  "pleasure making one option easier to justify is easier to direct",
  "the next step arriving before full confidence becomes difficult to separate",
  "makes the body registering the situation quickly feel personal"
];
export function transitReportProseIntegrityIssue(body: string): string | null {
  const lower = body.toLowerCase();
  const fragment = rejectedFragments.find(text => lower.includes(text));
  if (fragment) return `The report repeats an owner-rejected source fragment: ${JSON.stringify(fragment)}. Explain the supplied meaning directly in connected prose.`;
  const seen = new Set<string>();
  for (const sentence of body.split(/(?<=[.!?])\s+/u)) {
    const key = sentence.trim().replace(/\s+/gu, " ").toLowerCase();
    if (key.length < 80) continue;
    if (seen.has(key)) return "The body repeats a complete sentence verbatim. Remove the repetition and develop the distinct supplied meaning.";
    seen.add(key);
  }
  return null;
}
