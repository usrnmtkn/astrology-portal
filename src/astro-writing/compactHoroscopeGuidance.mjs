/** Starter/current-guide cleanup, never a replacement for saved owner fields.
 * Callers keep their complete Source archive and explicit scoped exclusions. */
export function compactHoroscopeVoiceGuidance(period) {
  if(!['daily','weekly'].includes(period))throw new Error('Choose Daily or Weekly guidance.');
  return `Write with the point of view, language and development of the complete designated readings. Speak directly to the reader. Learn how those passages make a particular observation understandable; their situations and advice do not become this reading's assignment.

Stay with a supported thought as it becomes more particular. A detail earns its place by explaining what someone wants, notices or does, or why it matters. Several interchangeable purchases, activities or people are still a list. House topics supply a range of possible subjects; choose what belongs to the thought rather than demonstrating the range. Bring in another placement where its meaning changes the interpretation.

Keep unknown personal circumstances conditional. A supported general observation can be direct. Let the complete references guide candor, affection, humor and sentence movement without making any of them a quota.

Advice or reassurance belongs where the developed situation gives it a purpose. An interest need not become a lesson in managing it. End when the thought is complete; a general distinction or polished maxim cannot substitute for its missing development.`;
}

export function compactHoroscopeGuidance(period,{runVariables=false}={}) {
  if(!['daily','weekly'].includes(period))throw new Error('Choose Daily or Weekly guidance.');
  const name=period==='daily'?'Daily':'Weekly';
  return {
    voiceGuidance:compactHoroscopeVoiceGuidance(period),
    structure:[
      `Return one complete ${name} reading for the requested rising sign, using only the supplied headline/body fields. Use connected prose with natural paragraph breaks. Keep drafting notes and source labels outside reader copy.`,
      'Interpret the supplied planets, signs, aspects and calculated whole-sign life areas together. Keep each life area attached to its own placement or event. Unknown circumstances remain possibilities grounded in that interpretation. Never present an invented conversation, personal history, diagnosis or hidden flaw as an established fact. A conditional word does not justify an unsupported accusation. An ordinary motive can be explored when the supported situation gives reason for it.',
      period==='daily'
        ?'Account for significant calculated daily developments with governed meaning, without a compulsory inventory of background planets. On a quiet day, relevant ongoing conditions can support the reading. Ordinary Moon placements and ingresses remain private context; calculated special lunar events may be named. Express houses through their actual life areas without numbered houses or invented sector labels. There is no fixed word or paragraph count.'
        :'Choose the connected developments that matter for this sign and week. This is a short, connected Weekly reading, not seven daily summaries. Significant event types are available evidence, not an inventory to print. Name both planets when claiming an aspect; use meets for a conjunction. When naming a house, give its numeric ordinal and a brief relevant life area. Traditional rulers: Mars for Aries and Scorpio; Venus for Taurus and Libra; Mercury for Gemini and Virgo; the Moon for Cancer; the Sun for Leo; Jupiter for Sagittarius and Pisces; Saturn for Capricorn and Aquarius. Identify the ruling planet when its selected major event warrants it. Identify retrograde motion each time a retrograde planet is named.',
      'Use verified local timing. A reference position is not an ingress or a duration; the publication window is not a transit duration. Historical examples supply no current dates, placements or personal history. Exact clock times stay in the separate timing display.',
      'Current scoped owner corrections govern new writing. Complete designated examples govern voice before automatic historical retrieval or supporting style references. Their particular subjects and paragraph shapes do not prescribe this reading. Compare only the complete earlier readings actually supplied. The separate full-edition review compares the set; this call cannot claim to review unseen signs. Only the owner approves exact prose and publication.'
    ].join('\n\n'),
    prompt:[
      ...(period==='weekly'&&runVariables?['WEEKLY PROMPT V2']:[]),
      `Write the requested {{period}} horoscope for the supplied rising sign and local publication window.`,
      'VOICE\n{{voiceGuidance}}',
      'SCOPE AND OUTPUT\n{{structure}}',
      ...(runVariables?[
        'CURRENT OWNER CORRECTIONS\n{{ownerCorrections}}',
        'CURRENT CALCULATED ASTROLOGY AND GOVERNED MEANING\n{{governedFacts}}'
      ]:[]),
      ...(period==='daily'&&runVariables?[
        'RETRIEVED HISTORICAL OWNER READINGS — VOICE SUPPORT\n{{primaryOwnerVoiceSources}}',
        'SUPPORTING COMPLETE OWNER READINGS\n{{supportingOwnerVoiceSources}}'
      ]:[]),
      'COMPLETE DESIGNATED WRITING EXAMPLES\n{{sourceGuidance}}',
      ...(period==='daily'&&runVariables?['CURRENT DESIGNATED COMPARISONS\n{{ownerPositiveComparisons}}']:[]),
      'Write the requested complete reading in the voice demonstrated above. Preserve source text; return only headline and body.'
    ].join('\n\n')
  };
}
