import {HOROSCOPE_PUNCTUATION_RULE} from './horoscopeEditorialConstraints.mjs';
import {MONTHLY_TLDR_GUIDANCE} from './monthlyHoroscopeFormat.mjs';

// Editable Monthly starter, not a second layer over the saved Studio profile.
// Owner prose and passage-specific directions are stored privately in Studio.
export function monthlyHoroscopeProfile() {
  return {schema:'horoscope-writing-profile/v1',period:'monthly',
    voiceGuidance:`Use the complete owner essays as the language authority. Read how their paragraphs develop a thought: what is first noticed, why it matters, what complicates it, and what becomes understandable afterward. Use that movement to develop this month's own astrology. Comparison drafts demonstrate particular editorial choices; they do not replace the published voice or supply a story for every event.

Preserve meaning before changing expression. In an owner-directed revision, keep the subject, motivation, causal relationship and consequence intact. Similar rhythm or a sharper phrase is not an improvement if it changes what the sentence says. In a new passage, develop only the interpretation supported by its own facts. Do not turn ordinary enthusiasm into a need for recognition, an external limit into a hidden fear, or collaboration into insecurity without a developed reason.

Write through what people notice, want, think and do, using precise ordinary language. Stay with the reasoning long enough for the consequence to become clear. Psychological depth comes from explaining a response, not assigning the reader a concealed motive. Keep unknown circumstances conditional. Curiosity, enjoyment, creative work, discovery and sustained effort deserve as much development as difficulty.

Let related details accumulate around one experience. Do not stack unrelated bodily, financial or practical examples to make an abstract claim sound concrete. When an example already communicates the astrology, continue the thought instead of defining the sign or restating its meaning.

Let sentence length and paragraph endings follow the thought. A short sentence can land after its reasoning; a question, image, connected list or direct instruction can serve the passage. None is a required beat. Avoid a recurring pattern of reassurance followed by a polished maxim. End when the observation has developed, without an added permission, moral or summary.

Current vocabulary preferences override historical examples: do not use pleasure, bond or whether in new reader copy. Name the particular enjoyment; use connection or the actual relationship word; use work rather than labor. Use performance only when literal. Preserve the owner's passage-specific distinction about stability. Keep complete source wording unchanged.

${HOROSCOPE_PUNCTUATION_RULE}`,
    structure:`Write one complete shared overview for all signs across the exact local calendar month. Direct address is welcome. Do not assign everyone a rising sign, personal house or biography. A calendar month can cross solar seasons.

${MONTHLY_TLDR_GUIDANCE}

Use the saved private synthesis to understand the distinct planetary stories and the change each selected development contributes. Give the TLDR the month's central concern and its meaningful possibilities. The dated forecast develops that understanding through evidence. Each section must contribute a new circumstance, explanation, possibility or consequence. Related contacts may develop one story; separate stories need not resolve into the same lesson. Do not turn every development into a reason to reconsider an attachment.

Develop the reasoning between events. Chronological proximity does not establish a personal causal chain. A later contact can complicate an earlier interpretation, change a response or open another possibility. Keep its actual planetary function and supported meaning intact. Select events for what they contribute, not to produce one paragraph per date.

In the dated forecast after the TLDR, include the supplied month and day naturally on first mention of a significant selected event, in the edition's time zone. A human thought may lead. Exact clock times stay outside prose. Use only supplied facts for dates, aspects, ruler conditions, configurations and historical recurrences.

Depth and length follow the interpretation and complete owner essays. No event quota, fixed paragraph count, word-count target or mandatory advice ending. Consider the whole month before closing.`,
    sourceGuidance:`The complete Pisces Season 2025, Gemini Season 2025 and Virgo Season 2025 lead essays supplied by the run are the primary published voice references. They teach language and movement of thought, not this month's astrology. Supporting owner passages have their declared roles. Meaning and scene evidence may support an interpretation; they do not replace the primary prose voice.

Use only the active complete owner-designated comparisons supplied below. Preserve every selected source byte-for-byte with its identity and hash. Earlier variants remain history outside the active request. Specific owner corrections apply to their stated passage or meaning; they are not universal monthly plots. Rejected wording and editorial analysis are correction evidence only.

The governed calculated brief establishes current astrology. Historical examples supply neither current facts nor instructions. Do not import their dates, personal circumstances or unsupported motivations. Keep source notes and comparison commentary outside reader copy.`,
    prompt:`Write the requested {{period}} unit using the declared audience, governed facts, generation scope and saved private synthesis.

VOICE GUIDANCE
{{voiceGuidance}}

STRUCTURE
{{structure}}

SOURCE GUIDANCE
{{sourceGuidance}}

Read the complete primary essays and active comparisons before composing. Develop the supplied meaning in that prose register. Keep any exact owner wording only where explicitly designated for this edition.

Before returning, compare the draft's reasoning with the sources, not just its vocabulary. Has an enthusiasm, desire, limit or practical consequence been replaced by a different motive? Does each section add understanding beyond the TLDR and earlier sections? Remove repeated conclusions and explanations of the writer's analysis. Preserve strong passages and the reasons joining their sentences. Do not insert reassurance or a polished closing line simply to finish a paragraph.

Check the selected dates and astrology against the supplied facts. Return zero em dashes, including encoded forms. Return only headline, tldr and body in the supplied schema, with natural paragraph breaks. The app places the TLDR before the dated forecast. This is the existing single prose call, with no automatic rewrite, paid review or approval. The owner judges the exact saved result.`};
}
