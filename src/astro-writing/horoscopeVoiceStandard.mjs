import forecastProse from './forecastProseDevelopment.cjs';
const {FORECAST_PROSE_DEVELOPMENT}=forecastProse;

// Shared editorial targets, not a sentence template or a measured voice score.
export const HOROSCOPE_VOICE_REVIEW='horoscope-voice-review/v1';
export const HOROSCOPE_VOICE_CRITERIA=Object.freeze({
  interpretation_specificity:'Develop an interpretation from what this configuration does together, including the relevant ruler and house relationships. House keywords alone do not establish a story. Naming a ruler without explaining its bearing on the observation is still a report.',
  development:'Let connected sentences discover something about the observation: what people do, why it matters, or what follows. Follow the complete examples in how a thought develops. Adding scenarios or paraphrasing the same lesson does not develop it.',
  author_voice:'Compose from the designated complete examples: their point of view, specificity, rhythm, humor where present, and willingness to make a point. Keep that voice through the middle as well as the opening. Correct astrology and absence of banned phrases do not establish a voice match.',
  unsupported_story:'Let the supplied facts and attributed meanings support the possibilities. Do not invent evasiveness, an emotional imbalance, a reader flaw or a relationship problem to give the reading something to resolve. A conditional does not supply evidence for a motive or conduct.',
  ending:'Let the ending follow what this reading has developed. Do not append an instruction, permission, reassurance, perspective reset or portable maxim simply to finish. Advice, uncertainty, imagery, contrasts and aphorisms are available when earned by this thought and the examples; none is compulsory or categorically forbidden.'
});
export const HOROSCOPE_SOURCE_LED_COMPOSITION=`SOURCE-LED COMPOSITION
${FORECAST_PROSE_DEVELOPMENT}

Read the complete designated examples before choosing this reading's observation. Use the supplied configuration research and attributed meaning to decide what is particular to this audience and period, then develop that observation in the examples' voice. Work this out before composing; return only the reader fields. These are qualities of the whole reading, not required sections or a fixed emotional arc.
${Object.values(HOROSCOPE_VOICE_CRITERIA).join('\n')}
Before returning, read the complete draft beside the complete examples, including its opening, middle and ending. Repair a report of placements or a lesson assembled around house topics at the level of the interpretation and development, rather than swapping its nouns or polishing isolated phrases. Current owner corrections take precedence; preserve all source text and its declared roles.`;
