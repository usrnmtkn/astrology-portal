/** Shared authoring contract. Instructions never enter compiled reader fields. */
export const SKY_INGRESS_ESSAY_FORMAT = "ingress-essay-v2";

export const skyIngressEssayFields = [
  { name: "articleTitle", description: "Calculated title, for example Libra Season 2026." },
  { name: "when", description: "Calculated entry and exit, with exact times in ET." },
  { name: "what", description: "Name the ingress and its defining calculated aspect. State verified facts directly." },
  { name: "takeaway", description: "One distinctive implication and a useful response. Hedge possible experience, without giving the planet agency." },
  { name: "overviewHeading", description: "A short, specific heading for this event." },
  { name: "overviewBody", description: "120–180 words. Explain sign mode, element, traditional ruler, territory and the planet's supported dignity in plain language. Connect these to one or two recognizable behaviors." },
  { name: "majorTransitSections", description: "Each major transit gets its own ## heading and 100–180 words: exact API date, degrees, signs, motion and supported dignities; meaning, possible experience and a useful response in connected prose." },
  { name: "priorOccurrenceSection", description: "Optional complete section including its ## heading, supported by a verified recurrence search. Otherwise leave empty; its heading is omitted too." },
  { name: "otherDatesSection", description: "Optional complete section including its ## heading, one bullet per relevant API event. Label any event after the ingress window as follow-through. Empty means omit the section and heading." },
  { name: "closingHeading", description: "A specific heading that fits this article." },
  { name: "closingBody", description: "60–100 words. Explain conditions and reader choice in language specific to this event, then offer a practice and directions to the sign's whole-sign house. Never repeat a standard agency sentence across articles." }
];

export const SKY_INGRESS_ESSAY_TEMPLATE = `# {{articleTitle}}

## Summary

When: {{when}}

What: {{what}}

Takeaway: {{takeaway}}

## {{overviewHeading}}

{{overviewBody}}

{{majorTransitSections}}

{{priorOccurrenceSection}}

{{otherDatesSection}}

## {{closingHeading}}

{{closingBody}}`;

export const SKY_INGRESS_ESSAY_INSTRUCTIONS = [
  "INGRESS ESSAY FORMAT, owner direction dated 2026-10-09. Output remains an owner-review draft.",
  "This dated essay uses Summary (When, What, Takeaway), Overview, major transit sections, optional verified prior occurrence, optional other dates, and a close. Do not impose the reusable placement article's older hook, refrain, ladder, or stock closer.",
  "Aim for 600–900 words with two or three major transits. Section ranges are guidance, never permission to shorten fixed owner prose. A twelve-sign horoscope is a separate companion and is not part of this essay.",
  "Write warm, connected, mid-length prose. Use the owner corpus for voice and the current contextual AI-writing-pattern rules. No em dashes, en dashes, semicolons, canned pivots, decorative triples, generic planet personification, or motivational boilerplate. Do not invent scenes merely to sound specific.",
  "Possible experiences need may, might, or could; calculated astronomical facts do not. Name behavior and its consequence, not only a theme or emotion. Use an event-supported example, not a required scene in every paragraph.",
  "Only the seven traditional planets rule signs. Outer planets and Chiron do not acquire rulerships or invented dignities. Use governed dignity evidence; absence of a listed dignity is not evidence for peregrine.",
  "All event dates, exact times, degrees and motion come from the supplied calculation API facts. Display times as 8:05 PM ET using America/New_York, including its daylight-saving changes. Never fill missing facts from memory or a web calendar.",
  "NASA/JPL receipts verify only their stated scope. NASA astronomy explanations are factual context, not astrology meaning or voice evidence. Do not claim NASA verified an entire event or recurrence from a single position comparison. If explanatory NASA text was not retrieved, do not invent or attribute it.",
  "A first-since claim needs a complete stated search interval. A previous placement alone does not prove an aspect recurrence. Leave priorOccurrenceSection empty unless that evidence is supplied.",
  "Use only exact events within eventCoverage. Label later follow-through separately. Do not describe a partial event search as complete. Each transit section must give both participants' degrees, signs and motion from its facts.",
  "An optional empty field removes its whole section and heading. Do not return empty headings or internal writing instructions. The close must express reader choice in new event-specific language, followed by a practice and the whole-sign house lookup, without a repeated disclaimer."
].join("\n");

export function isSkyIngressEssay(format) {
  return format === SKY_INGRESS_ESSAY_FORMAT;
}
