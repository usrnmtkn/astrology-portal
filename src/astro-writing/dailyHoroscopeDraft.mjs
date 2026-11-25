import {HOROSCOPE_ENDING_GUIDANCE} from './horoscopeEndingGuidance.mjs';
import {COMPACT_REFERENCE_LEARNING} from './compactReferenceLearning.mjs';

export const DAILY_HOROSCOPE_CONTRACT='daily-horoscope/v18-writer-role-2026-11-18';
// This writer returns headline/body, not a rhetorical review. Keep the current
// owner standard without instructions for finding records, reasons or scores.
export const DAILY_RHETORICAL_WRITING_GUIDANCE=`CURRENT CONTEXTUAL WRITING STANDARD
Use contrast, parallel phrasing and imagery when they carry meaning. Remove artificial reversals, decorative triples, stock advice, empty atmosphere and planetary commands that substitute for an interpretation. Ordinary literal wording, useful imagery, humor and emotional precision remain available; a word or phrase alone is not a defect.
Keep an image's objects and actions in the same literal scene. If they do not fit together, state the meaning plainly. Use aphorisms and maxims sparingly, with a purpose inside this particular reading. A generalization or moral is not a required ending. Preserve the insight, natural rhythm and every complete source passage. Apply these directions while writing the requested reader fields.`;
export const DAILY_HOROSCOPE_INSTRUCTIONS=`DAILY HOROSCOPE
Write the requested rising-sign reading from its calculated day and governed meanings. Current scoped owner corrections and the complete saved Daily guide govern the prose. Follow any explicitly designated complete references in that guide. Additional style references and automatically retrieved historical readings supply voice support within that direction. A retrieval label or evidence count cannot overrule that order. No article, natal or engine-generated paragraph formula applies.

${COMPACT_REFERENCE_LEARNING}

${HOROSCOPE_ENDING_GUIDANCE}

${DAILY_RHETORICAL_WRITING_GUIDANCE}

Isolated source lines labeled as phrases remain voice support, not insertion candidates. Rejected readings are negative evidence only.

Ordinary Moon signs and ingresses are private interpretive context. Do not announce them or turn a late ingress into a promised emotional reset. Calculated New Moons, Full Moons, quarter Moons and eclipses may be named when relevant. Express each calculated house through its actual life area; do not print numbered houses. Ongoing placements are not a required planetary inventory. Keep significant supported developments required by the saved profile.

The approved plan sets factual scope. Source references resolve to the complete bounded passages, with their authorship, approval and meaning-only restrictions in SOURCE AUTHORITY AND ROLES. Keep historical passages intact. Their subject, length, paragraph shape, scenarios and advice are not requirements for this new reading.

Only supplied calculations establish participants, placements, aspects and timing. Each planet keeps its own sign, motion, house and time. A reference instant is not a duration or ingress. Historical source astrology and biography never become current facts. The publication window is not a transit duration. Use the edition's local timing; keep exact clock times and numeric dates in the separate timing display.

Return only headline and body, with natural paragraph breaks. No numbered houses, em dashes, double hyphens, or the words whether, pleasure, bond, preference, preferences, labor, or the phrase out loud. Historical source wording creates no exception. Keep notes, citations, labels, variables and approval claims outside reader copy. This request contains one sign; do not claim to compare unseen readings. Only the owner can approve exact prose and publication.`;

export {buildCompactHoroscopeDraftInput as buildDailyHoroscopeDraftInput} from './compactHoroscopeDraft.mjs';
