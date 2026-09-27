import { isRejectedCalendarMoonCopy } from './calendarMoonCopyRevisions.js';

export const zodiacSignOrder = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
] as const;

export function nextZodiacSignName(sign: string) {
  const index = zodiacSignOrder.indexOf(sign.toLowerCase().trim() as typeof zodiacSignOrder[number]);
  return index >= 0 ? zodiacSignOrder[(index + 1) % zodiacSignOrder.length] : "";
}

/** Pair-specific Moon sign-change copy, including the owner's requested September revisions. */
export const moonSignTransitions: Record<string, string> = {
  "pisces-aries": "Early in the day, you may still be sitting with a feeling, a half-formed idea, or something you cannot quite name. Once the Moon enters Aries, it gets easier to stop waiting for certainty and do one thing about it.",
  "aries-taurus": "In Aries, the Moon emphasizes independence and the impulse to act. In Taurus, the focus turns toward comfort and security. You may feel more drawn to a familiar routine or an unhurried meal than to starting something new.",
  "taurus-gemini": "The shift from Taurus to Gemini brings a different way of working through feelings: from seeking comfort in what is familiar to talking, asking questions, and hearing another point of view. Curiosity may make it easier to consider a possibility you had not thought of.",
  "gemini-cancer": "As the Moon moves from Gemini to Cancer, attention turns from exchanging ideas toward emotional closeness and privacy. You may care more about feeling understood than finding an explanation for every feeling. Familiar company can be comforting; time alone may be just as welcome.",
  "cancer-leo": "Once the Moon enters Leo, it can be easier to come out of yourself enough to say what you want, show someone what you made, or admit that you hoped they would notice.",
  "leo-virgo": "After the moment has been seen or felt, Virgo brings your attention to what happens next. The idea may need an edit, the plan may need a list, or the thing you were proud of may need one more round of work.",
  "virgo-libra": "Once the Moon enters Libra, attention moves from the task to the people affected by it. You may notice the tone, the timing, or that the same person keeps making the compromise.",
  "libra-scorpio": "Keeping things pleasant can stop feeling useful once the Moon enters Scorpio. The thing that has been implied, avoided, or softened may need to be said more plainly.",
  "scorpio-sagittarius": "Something that has been sitting under the surface may be harder to ignore early on. By afternoon, it can be easier to stop circling the same problem and decide what you want to do next.",
  "sagittarius-capricorn": "The bigger idea still matters, but Capricorn brings you back to the part that needs a date, a budget, or a next step. You may feel better once the plan stops being theoretical.",
  "capricorn-aquarius": "Once the Moon enters Aquarius, finishing the task may matter less than understanding why the same problem keeps showing up. A little distance can make the pattern easier to see.",
  "aquarius-pisces": "The plan may make sense on paper, but Pisces can make the part you have been overriding harder to ignore. Fatigue, atmosphere, and what you have been absorbing from other people may start to matter more."
};

export { moonSignTransitionKey } from "../../services/generatedContentKeys.js";

export function moonSignTransitionPair(fromSign: string, toSign: string) {
  return `${fromSign.toLowerCase().trim()}-${toSign.toLowerCase().trim()}`;
}

export function moonSignTransitionForPair(fromSign: string, toSign: string, override?: string | null) {
  const key = `authored/calendar-moon-transition/${fromSign.toLowerCase().trim()}/${toSign.toLowerCase().trim()}`;
  return (isRejectedCalendarMoonCopy(key, override) ? '' : override?.trim()) || moonSignTransitions[moonSignTransitionPair(fromSign, toSign)] || "";
}
