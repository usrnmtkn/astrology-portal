// Editorial calibration only. Never generation evidence, serving copy or approval.
const source = 'owner-request:2026-10-09:avoid-ai-writing-patterns';
export const aiWritingPatternCases = [
  {id:'atmosphere-without-event',surface:'you-friend',body:'Quiet resentment may be building beneath the surface of your relationships.',required:['PURPLE_PROSE']},
  {id:'abstract-invitation',surface:'moon-sign-ingress',body:'A subtle shift in your emotional landscape invites you to honor your deeper needs.',required:['PURPLE_PROSE']},
  {id:'planet-replaces-interpretation',surface:'personal-transits',body:'Saturn reminds you to honor your boundaries.',required:['PURPLE_PROSE','GENERIC_ASTROLOGY']},
  {id:'stock-ending',surface:'seasonal',body:'Trust the process.',required:['PURPLE_PROSE','GENERIC_ADVICE']},
  {id:'vague-revelation',surface:'weekly',body:'Something is shifting.',required:['PURPLE_PROSE']},
  {id:'observation-not-atmosphere',surface:'you-friend',body:"You may realize you're angry about an agreement you never actually made. Someone started relying on you to handle something, and you've been doing it long enough that they no longer think to ask.",forbidden:['PURPLE_PROSE']},
  {id:'recognizable-time-cost',surface:'moon-sign-ingress',body:"You may be tired of explaining why you need time to yourself, especially to people who treat your availability as something they're entitled to.",forbidden:['PURPLE_PROSE']},
  {id:'expectation-explained',surface:'personal-transits',body:'You may discover that agreeing to help once has turned into something everyone expects you to keep doing.',forbidden:['PURPLE_PROSE']}
].map(f=>({...f,source,authority:'owner_supplied_calibration',unit:'exact supplied example'}));

aiWritingPatternCases.push(...[
  {id:'literal-quiet',surface:'daily',body:'The house was quiet until the children came home. You finished reading before they arrived.',forbidden:['PURPLE_PROSE']},
  {id:'observable-silence',surface:'natal',body:'You become quiet during an argument when you are trying to remember what was actually said. The pause gives you time to answer the question.',forbidden:['PURPLE_PROSE']},
  {id:'contextual-emotion',surface:'you-friend',body:'The quiet resentment began when your friend started promising your help without asking. You stopped answering her messages because each one seemed to contain another favor.',forbidden:['PURPLE_PROSE']},
  {id:'literal-space-weight-shift',surface:'calendar',body:'The night shift leaves you an hour to clear space on the shelf. Check the weight limit before putting the boxes there.',forbidden:['PURPLE_PROSE']},
  {id:'planet-has-narrative-work',surface:'sky',body:'In the old myth, Saturn swallows his children because he fears one will overthrow him. The story gives this account of Saturn its contradiction: trying to preserve power by destroying the people who could inherit it.',forbidden:['PURPLE_PROSE']},
  {id:'unlisted-decoration',surface:'weekly',body:'A velvet ache unfurls through the architecture of your becoming.',required:['PURPLE_PROSE']},
  {id:'new-personification-variant',surface:'seasonal',body:'Jupiter encourages you to embrace the unknown.',required:['PURPLE_PROSE','GENERIC_ASTROLOGY']},
  {id:'permission-with-information',surface:'natal',body:"It's okay to leave the time field blank if you do not know your birth time. The form will omit houses rather than pretend it knows the hour.",forbidden:['PURPLE_PROSE','CORRECTIO']}
].map(f=>({...f,source,authority:'synthetic_context_control',unit:'synthetic passage; not owner writing'})));
