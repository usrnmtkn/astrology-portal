/** One provider call, two reader sections. No prose is inferred or rewritten. */
export const MONTHLY_HOROSCOPE_FORMAT = 'monthly-tldr/v1';
export const MONTHLY_TLDR_GUIDANCE = `Begin with a true TLDR that explains the core of this particular month before any date. Tell the reader what may change, why that matters, and what they may understand differently by the end. Synthesize the supplied astrology into a recognizable human situation. Do not summarize every transit or make the reader infer the month from an event list. A transit may be named when it explains the central development, but keep calendar dates in the forecast that follows.

Then write the dated forecast. Select events for how they develop, complicate or change that understanding. Related developments must add something, not repeat the same conclusion. Do not force every month into the same conflict or the same early/middle/late story. Date a selected event on its first mention in this forecast, using the supplied local date. The TLDR and forecast are separate parts of one reading, written in the same call.`;

export function composeMonthlyHoroscopeDraft(value) {
  if(!value || typeof value !== 'object' || typeof value.headline !== 'string' || !value.headline.trim() || value.headline.length>200
    || typeof value.tldr !== 'string' || !value.tldr.trim() || typeof value.body !== 'string' || !value.body.trim()) {
    throw new Error('A monthly reading needs its TLDR and dated forecast.');
  }
  const body=`**TLDR**\n\n${value.tldr}\n\n**The month ahead**\n\n${value.body}`;
  if(body.length>20000)throw new Error('The complete monthly reading is too long to save.');
  return {headline:value.headline,body};
}
