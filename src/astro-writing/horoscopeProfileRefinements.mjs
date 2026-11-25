import {validateHoroscopeProfile} from './horoscopeWritingProfiles.mjs';
import {MONTHLY_TLDR_GUIDANCE} from './monthlyHoroscopeFormat.mjs';
import {compactHoroscopeGuidance} from './compactHoroscopeGuidance.mjs';

// Explicit proposal builders, never applied during request assembly or saved
// automatically. Complete private examples are supplied by the review tooling.
export function proposeWeeklyProfile({profile,demonstrations,languageRules}) {
  if(profile.period!=='weekly'||!demonstrations?.trim()||!languageRules?.trim())throw new Error('Supply the complete Weekly demonstrations and current language rules.');
  const guidance=compactHoroscopeGuidance('weekly',{runVariables:true});
  return validateHoroscopeProfile({...profile,
    voiceGuidance:`${guidance.voiceGuidance}\n\nCURRENT LANGUAGE RULES\n${languageRules}\n\nRETAINED SAVED-GUIDE SOURCE EXAMPLES\nCOMPLETE WEEKLY LANGUAGE DEMONSTRATIONS\n${demonstrations}`,
    prompt:guidance.prompt});
}

export function proposeMonthlyProfile(profile) {
  if(profile.period!=='monthly')throw new Error('Supply a Monthly profile.');
  return validateHoroscopeProfile({...profile,
    voiceGuidance:`Use the current owner-designated final Monthly example as the primary language reference when supplied. The Voice Bank and complete older monthly and seasonal essays support its range. Follow the current source order and scoped corrections; a retrieval heading does not override them. Keep the complete examples, identities, roles and hashes unchanged.

Write with natural contractions, conversational intimacy, conviction and compassion. Carry the owner's point of view and reasoning through paragraph middles and endings. Stay close to what people want, enjoy, fear losing, keep doing or realize has changed. Explain the supported reason behind a response before concluding. Preserve the precise subject, motivation, causal relationship and consequence when revising; a sharper phrase must not substitute a different meaning.

Keep unknown circumstances and motives conditional. Practical limits such as time, income, housing, caregiving or dependence belong when they materially affect this concern; do not assume everyone can immediately leave or change it. Examine power and accountability only when supported, without inventing malicious motives. Give constructive possibilities, affection, curiosity, collaboration and sustained effort as much development as difficulty. Do not reuse the example's attachment narrative or make every transit a conflict, overwork or boundaries story.

Use precise ordinary words, people and actions instead of analytical, managerial or therapeutic shorthand. Keep sensory imagery coherent and related details together. A practical example may deepen an emotional reason; it cannot replace it. Do not list interchangeable scenarios or define astrology after the situation already demonstrates it.

Let sentence length and paragraph movement follow the thought. Questions, meaningful contrasts, imagery, connected lists, early astrology and direct instructions remain available. Return to a concern when a new context, consequence, choice or understanding develops it. Do not shorten developed reasoning merely to reduce words or introduce an unrelated theme for variety. Stop at the strongest supported recognition, consequence, question or response; advice, reassurance, permission and quotable endings are optional.

Current vocabulary: do not use pleasure, bond or whether in new copy. Name the particular enjoyment, use connection or the actual relationship word, and use work rather than labor. Use performance literally. Preserve the designated Taurus passage's distinction about stability; this is not a general ban on security. Keep protected historical wording unchanged. No em dashes, including encoded forms.`,
    structure:`Write one complete shared overview for all signs across the exact local calendar month. Direct address is welcome; no personal rising sign, house or biography applies to everyone. A calendar month can cross solar seasons.

${MONTHLY_TLDR_GUIDANCE}

Use the saved private synthesis to follow the distinct planetary stories across the whole month. A later contact can complicate an earlier development or introduce a constructive possibility; chronological proximity alone does not establish personal causation. Each selected event must add meaning rather than repeat the TLDR or restart the same explanation. Separate stories need not deliver one lesson. Use verified dates, participants, aspects, ruler conditions, configurations and recurrences only. Exact clock times stay outside prose.

Depth and length follow the interpretation and complete owner examples. No word target, fixed paragraph count, event quota or compulsory advice ending.`,
    prompt:`Write the requested {{period}} overview from the governed facts, saved synthesis and declared audience.

VOICE
{{voiceGuidance}}

STRUCTURE
{{structure}}

SOURCE GUIDANCE
{{sourceGuidance}}

PRIMARY OWNER VOICE SOURCES
{{primaryOwnerVoiceSources}}

SUPPORTING OWNER VOICE SOURCES
{{supportingOwnerVoiceSources}}

OWNER POSITIVE COMPARISONS
{{ownerPositiveComparisons}}

OWNER CORRECTIONS
{{ownerCorrections}}

GOVERNED ASTROLOGY
{{governedFacts}}

EDITORIAL CHECK
Read the full draft against the designated primary Monthly example. Preserve developed reasons, strong passages and the precise claim joining sentences. Remove only repeated conclusions, unnecessary definitions, invented motives and analytical commentary. Returning to a concern is development when it adds understanding. Verify selected dates and astrology. Keep all review notes private; this check uses the existing writing call.

Return headline, tldr and body in the supplied schema. The app places the TLDR before the dated forecast. Only the owner judges and approves the exact result.`});
}
