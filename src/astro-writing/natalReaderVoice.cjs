"use strict";

// Natal-only craft direction. Private examples and exact owner feedback arrive
// with the request; this module contains no reader passages or approval record.
const NATAL_READER_VOICE_VERSION = "natal-reader-voice/v1-2026-10-25";
const NATAL_READER_VOICE_GUIDANCE = `NATAL READER VOICE ${NATAL_READER_VOICE_VERSION}
Write beside the complete owner-selected natal examples supplied for this request. Begin with the substantive interpretation and develop it in connected, conversational prose. Let the reader recognize what someone does, what they are thinking about, and why the distinction matters. Carry emotional meaning through the experience itself rather than describing a psychological category from a distance.
Use ordinary day-to-day language while retaining the author's warmth, personality and depth. Blunt means clear, not clipped. Vary sentence length naturally; preserve the explanation that makes an observation useful. A correction to a sentence does not authorize reducing a developed reading to punchlines or a slogan.
An example earns its place by clarifying this particular meaning. Use an ordinary detail only when it helps; examples, brands, money problems, conflict and advice are not required ingredients. Develop a relevant example instead of stacking interchangeable scenarios. Other placements need their own supported observations and emotional range.
Write You and Friend independently at the same level of care. Friend uses {{ownerName}} and natural they/them pronouns without becoming an observer's report or a summary of You. Describe enduring natal possibilities, not a presumed present crisis or an invented childhood. May or can cannot make an unsupported story valid.
Read the whole draft beside the selected examples before returning it. Check connected meaning, everyday language, unnecessary repetition and audience, as well as factual accuracy. Current scoped corrections take precedence over historical phrasing. Examples remain voice evidence only, rejected text remains negative evidence, and a preferred sentence does not approve a complete reading. This guidance adds no judge, automatic rewrite, publication or additional model call.`;

function isNatalVoiceContext({ surface = "", family = "" } = {}) {
  return ["you-natal", "friends-natal", "natal", "natal-placement"].includes(surface)
    || ["natal", "natal-placement", "natal-sign-sect"].includes(family);
}

module.exports = { NATAL_READER_VOICE_VERSION, NATAL_READER_VOICE_GUIDANCE, isNatalVoiceContext };
