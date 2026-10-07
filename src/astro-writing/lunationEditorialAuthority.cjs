"use strict";
const { RHETORICAL_WRITER_POLICY } = require("./rhetoricalPatterns.cjs");

// Lunar output constraint, renewed by the owner on 2026-10-07. Source passages
// remain intact; this checks generated reader fields, not evidence or metadata.
const LUNATION_REQUIRED_VOCABULARY = 'REQUIRED LUNAR WORDING: Never use the word "whether" in generated titles, summaries, body text or journal questions, including borrowed lines. Recast the thought naturally. Preserve the complete source passages unchanged as evidence. This explicit output constraint is not an advisory voice score.';

const LUNATION_ARGUMENT_GUIDANCE = 'OPENING AND DEVELOPMENT: Dated New Moon, Full Moon and eclipse articles begin the first body sentence with On, the full calculated date in bold, and the named lunar event and sign. Use the supplied local opening date. Establish the astrology before describing a possible human experience: date and event, then phase and sign meaning, then their implications. The date belongs in the body even when the editor also displays it in a header. This owner-directed date opening takes precedence over scene-first hooks or historical opener-variety guidance. Reusable sign readings stay date-free because the app supplies each occurrence date; begin their body with the phase and sign. Explain the conjunction for a New Moon or the Sun–Moon opposition for a Full Moon, including both signs. Develop the meaning in connected prose, not a glossary or list of keywords. Use eligible owner passages for vocabulary, sentence movement and tone within this opening direction. Do not manufacture a schedule, message or conversation merely to make an opening concrete. A sequence of ordinary actions is not an insight. Each paragraph must add a reason, distinction or consequence that the previous paragraph has not explained. Let ruler condition and relevant contacts change or complicate the interpretation instead of illustrating the same advice again. A sign-level care prompt is one possible implication, not the entire argument. Use examples when they clarify the interpretation; stop explaining once the point is made. Let the ending follow what the passage has developed.';

const LUNATION_EDITORIAL_AUTHORITY = `LUNAR EDITORIAL AUTHORITY: Write a lunar reading for its declared surface from the supplied phase, sign and, for dated articles, verified event-time relationships. The saved lunar guidance and eligible owner lunation passages govern the opening, cadence, paragraph movement and ending. Meaning sources establish interpretation, not ready-made sentences or a compulsory moral. A lunar reading has no Sky placement scene quota, cultural thesis, standalone pull-quote requirement, strategy-command sequence or unhedged-close requirement. Use short or long sentences as the thought and owner prose require. Preserve factual boundaries, source licensing, the declared register, output schema and exact owner approval. Historical writing is voice evidence, never current astrology or personal biography.

${LUNATION_ARGUMENT_GUIDANCE}

${LUNATION_REQUIRED_VOCABULARY}

${RHETORICAL_WRITER_POLICY}`;

module.exports = { LUNATION_REQUIRED_VOCABULARY, LUNATION_ARGUMENT_GUIDANCE, LUNATION_EDITORIAL_AUTHORITY };
