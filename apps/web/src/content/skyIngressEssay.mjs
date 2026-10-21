/** Shared authoring contract. Instructions never enter compiled reader fields. */
export const SKY_INGRESS_ESSAY_FORMAT = "ingress-essay-v2";

export const skyIngressEssayFields = [
  { name: "articleTitle", description: "Calculated title, for example Libra Season 2026." },
  { name: "when", description: "Calculated entry and exit, with exact times in ET." },
  { name: "what", description: "Briefly identify the actual season or planetary ingress and what it brings into focus, using the supplied KB and Calendar meaning. When carries the complete calculated date range. A bare announcement that the Sun enters a sign is not an explanation of the season; connect the event to its meaning without a separate hook or an inventory of attributes." },
  { name: "takeaway", description: "One distinctive implication the reader can recognize. A useful response belongs when it follows from that thought; advice is optional. Qualify possible personal experience where needed. Apply the contextual personification rule: planetary language must interpret the experience rather than substitute for it." },
  { name: "overviewHeading", description: "A short, specific heading for this event." },
  { name: "overviewBody", description: "120–180 words. Begin with the actual season or planetary ingress, its calculated entry date and time, and what the event means. A date already present in Summary does not replace this opening. Follow the complete original author article and saved template's event-led development, using current facts rather than their historical dates. Develop the supplied KB/Calendar meaning across connected sentences in the author's voice, rather than stacking facts and adding an example afterward. Geographic or astronomical context belongs when it helps explain the season. Do not open with a detached anecdote, aphorism or conversational hook. Equinox or solstice framing belongs only to the appropriate solar season and must remain astronomically accurate. The revised Libra article is the primary voice benchmark; Scorpio supports its integrated astrology and human insight without imposing an opening pattern." },
  { name: "majorTransitSections", description: "Each major transit gets its own calculated ## heading and factual position line, followed by 100–180 words of developed interpretation. Each section contributes its contact's own source-supported meaning to the same article. Do not restart a planet-sign-aspect primer, recite the technical inventory, or attach a generic aspect maxim before the human interpretation. Let explanations belong inside the thought they clarify. No uniform introduction, scene or advice ending is required." },
  { name: "priorOccurrenceSection", description: "Optional complete section including its ## heading, supported by a verified recurrence search. Otherwise leave empty; its heading is omitted too." },
  { name: "otherDatesSection", description: "Optional complete section including its ## heading, one bullet per relevant API event. Label any event after the ingress window as follow-through. Empty means omit the section and heading." },
  { name: "closingHeading", description: "A specific heading that fits this article." },
  { name: "closingBody", description: "60–100 words. Finish the article's thought about this season or ingress in the author's voice. A relevant reflection or practical response can belong, without compulsory homework, a worksheet or a chart tutorial. Personal chart context is optional when it helps; use plain language and do not assign a house without a supplied rising sign. Do not instruct the reader to count houses from their rising sign. No generic advice or reassurance is required after the thought has landed." }
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
  "This dated essay uses Summary (When, What, Takeaway), Overview, major transit sections, optional verified prior occurrence, optional other dates, and a close. These fields hold one connected article, not separate knowledge summaries. Do not impose the reusable placement article's older hook, refrain, ladder, or stock closer.",
  "Aim for 600–900 words with two or three major transits. Section ranges are guidance, never permission to shorten fixed owner prose. A twelve-sign horoscope is a separate companion and is not part of this essay.",
  "Write warm, connected prose with sentence lengths and rhythm guided by the thought and complete owner passages. Use the current contextual AI-writing-pattern rules. No em dashes, en dashes, semicolons, canned pivots, decorative triples, generic planet personification, or motivational boilerplate. Do not invent scenes merely to sound specific.",
  "Present possible personal experiences as possibilities, using may, might or could where the claim needs qualification. Do not repeat a hedge in every sentence or turn every transit into a caution. Calculated astronomical facts can be stated directly. Name behavior and its consequence in ordinary language. Use an event-supported example when it clarifies the thought; no scene or advice ending is required in every paragraph.",
  "Only the seven traditional planets rule signs. Outer planets and Chiron do not acquire rulerships or invented dignities. Use governed dignity evidence; absence of a listed dignity is not evidence for peregrine.",
  "All event dates, exact times, degrees and motion come from the supplied calculation API facts. Display times as 8:05 PM ET using America/New_York, including its daylight-saving changes. Never fill missing facts from memory or a web calendar.",
  "NASA/JPL receipts verify only their stated scope. NASA astronomy explanations are factual context, not astrology meaning or voice evidence. Do not claim NASA verified an entire event or recurrence from a single position comparison. If explanatory NASA text was not retrieved, do not invent or attribute it.",
  "A first-since claim needs a complete stated search interval. A previous placement alone does not prove an aspect recurrence. Leave priorOccurrenceSection empty unless that evidence is supplied.",
  "Use only exact events within eventCoverage. Label later follow-through separately. Do not describe a partial event search as complete. Each transit section must give both participants' degrees, signs and motion from its facts.",
  "An optional empty field removes its whole section and heading. Do not return empty headings or internal writing instructions. The close completes this event's meaning. An earned reflection or response is available, without a compulsory chart lookup or counting tutorial. Let its movement follow the article's thought."
].join("\n");

export function isSkyIngressEssay(format) {
  return format === SKY_INGRESS_ESSAY_FORMAT;
}
