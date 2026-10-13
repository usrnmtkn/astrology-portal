import { createHash } from 'node:crypto';

// Personal Transit only. The October 11 owner instruction supersedes the older
// contextual steady/steadier allowance. Source examples are immutable evidence,
// never exemptions for newly generated or owner-edited reader text.
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const PERSONAL_TRANSIT_READER_RULES = freeze({
  id: 'personal-transit-reader-copy-2026-10-13-v2',
  authority: 'thread:01a11216-18b5-7f83-af91-fa040ad41096; owner instruction 2026-10-11; thread:01a12e21-0d00-7112-abcf-6434a30f23b1; everyday-language correction 2026-10-13',
  scope: 'New Personal Transit You/Friend reader copy; existing source text and publication status remain unchanged.',
  precedence: 'Current owner rules override historical wording in every example. Examples never license an exception.',
  hardBannedWords: ['steady', 'steadier', 'steadiness', 'settled', 'pleasure', 'bond', 'whether', 'alignment'],
  hardBannedPunctuation: [{ name: 'em dash', character: '—', encodedPattern: '&mdash;|&#0*8212;|&#x0*2014;|\\\\u2014' }],
  contextual: [
    { id: 'LITERAL_PERFORMANCE', instruction: 'Use performance only in its literal sense. Psychological or interpersonal performance language is prohibited.', signal: '\\bperformance\\b' },
    { id: 'QUIET_FILLER', instruction: 'Do not use quiet as atmospheric emotional or interpersonal filler. Literal sound, silence or a described act of becoming quiet can carry meaning.', signal: '\\bquiet\\b' },
    { id: 'CORRECTIO', instruction: 'Do not use correctio or fake self-correction to manufacture depth. A necessary factual distinction is allowed; a not/but match alone does not establish a violation.', signal: '\\b(?:or rather|this is not about|this isn[’\x27]t about|not .{1,60} but)\\b' },
    { id: 'DECORATIVE_TRICOLON', instruction: 'Do not use a decorative tricolon or three-command coaching chain. Each element must add necessary meaning; a factual list is not automatically decorative.' },
    { id: 'PURPLE_PROSE', instruction: 'Do not use ornate metaphor, atmospheric abstraction or planetary personification in place of recognizable behavior or stakes.' },
    { id: 'EVERYDAY_EXPERIENCE', instruction: 'Explain what the person might experience in clear, everyday language. Name the supported feeling or action directly. If the meaning is hurt or upset, say that rather than using tender or sensitive as a substitute. Explain what changes for the person and connect any suggestion to that experience. Abstract care, emotional patience or room for feelings leaves the reader to supply the meaning. Keep the insight, affection and enthusiasm supported by this contact; clarity does not require a problem, invented scene or practical instruction. Use natural contractions and varied sentences. Do not repeat one point as an opening, explanation and closing. Read the whole passage for understandable meaning, not just acceptable words. These are contextual checks, not bans on individual words or a fixed paragraph formula.', signal: '\\b(?:tender feeling|sensitive feeling|patience with (?:their|your|his|her) feelings|what kind of care)\\b' },
    { id: 'DEVELOPED_CONCERN', instruction: 'Develop one recognizable human concern. Every sentence must add something to that same concern. Use concrete stakes only when the target supports them. Generic emotional-management language, astrology keywords and connective phrases do not satisfy this task. Avoid coaching-script prose, fabricated logistical examples, generic positive-adjective bundles, therapy/reassurance language and abstract recognition endings. Do not force advice, an aphorism or an explanatory summary ending.' },
    { id: 'RETAINED_OWNER_LANGUAGE', instruction: 'Retain the current contextual wording corrections: avoid vague things, reckoning, on paper, shared trust and keep shrinking; avoid security when a concrete statement of reliability is more accurate. Avoid astrology-personification asks, this placement becomes, the planet carries the thread, through X but Y, sets the tone, comes into focus, easier to notice, can involve, get a boost, take up the whole room, as this settles, especially as and might have you unless specifically licensed by a current owner correction. Avoid generic You don’t have to X repetition, repeated Stop + verb and repeated scene-opening ruts. Do not optimize repetition mechanically at the expense of normal language. These contextual rules do not create exemptions from the hard word bans.' }
  ],
  boundaries: [
    'The exact transit and target-supported human meaning are the only factual authority. Do not invent biography, psychological history, an exact incident, a specific request, quoted dialogue, hypothetical replies or another person’s response.',
    'Do not add signs, houses, dates, life status or guaranteed outcomes. Preserve only the destination’s allowed placeholders and emit every required placeholder.',
    'Owner examples supply voice only: sentence movement, directness, development and an earned ending. Their subjects, scenarios, psychology, history, facts, perspective and timing must not transfer. They are not universal plots or sentence templates.',
    'You addresses the reader. Friend describes the selected person with they/them/their. Do not involve the reader in the affected relationship or announce observers. No Friends will notice, Observers will see or People around them will watch scaffolding.',
    'The transit name remains the title. The body may lead with the human concern. No mandatory With transiting opening and no prescribed sentence count or sequence.'
  ],
  validationContract: {
    hardWords: 'Reject exact whole-word matches, case-insensitively, after Unicode NFKC and invisible-format normalization; never rewrite the saved text.',
    punctuation: 'Reject the literal em dash and its HTML or Unicode escape spellings; never rewrite the saved text.',
    contextual: 'Carry every contextual rule to owner review. Lexical signals flag possible issues only; absence of a signal is not a semantic pass. Exact-text owner approval decides contextual compliance and voice. No model reviewer or automatic revision.',
    approval: 'Deterministic passage admission is not owner approval, preferred-evidence eligibility or publication authorization.'
  }
});
export const READER_RULES_JSON = JSON.stringify(PERSONAL_TRANSIT_READER_RULES);
export const READER_RULES_SHA256 = createHash('sha256').update(READER_RULES_JSON).digest('hex');
export const READER_RULES_INSTRUCTION = `CURRENT PERSONAL TRANSIT READER-COPY RULE BUNDLE\n${READER_RULES_JSON}`;

export function readerRuleFindings(text) {
  const normalized = text.normalize('NFKC').replace(/\p{Cf}/gu, '');
  const findings = [];
  for (const word of PERSONAL_TRANSIT_READER_RULES.hardBannedWords) {
    if (new RegExp(`(?<![\\p{L}\\p{N}_])${word}(?![\\p{L}\\p{N}_])`, 'iu').test(normalized)) findings.push({code:'BANNED_VOCABULARY', detail:word});
  }
  for (const rule of PERSONAL_TRANSIT_READER_RULES.hardBannedPunctuation) {
    if (normalized.includes(rule.character) || new RegExp(rule.encodedPattern, 'iu').test(normalized)) findings.push({code:'BANNED_PUNCTUATION',detail:rule.name});
  }
  const signals = PERSONAL_TRANSIT_READER_RULES.contextual.filter(rule => rule.signal && new RegExp(rule.signal,'iu').test(normalized))
    .map(rule => ({id:rule.id, instruction:rule.instruction, status:'owner-context-review-required'}));
  return {findings, signals, contextualRules:PERSONAL_TRANSIT_READER_RULES.contextual,
    ruleBundleSha256:READER_RULES_SHA256, semanticApproval:false};
}
