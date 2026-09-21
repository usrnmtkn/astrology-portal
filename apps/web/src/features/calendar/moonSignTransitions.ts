export const zodiacSignOrder = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
] as const;

export function nextZodiacSignName(sign: string) {
  const index = zodiacSignOrder.indexOf(sign.toLowerCase().trim() as typeof zodiacSignOrder[number]);
  return index >= 0 ? zodiacSignOrder[(index + 1) % zodiacSignOrder.length] : "";
}

/** Owner-provided pair-specific Moon sign-change copy. Not generated summaries. */
export const moonSignTransitions: Record<string, string> = {
  "pisces-aries": "Early in the day, you may still be sitting with a feeling, a half-formed idea, or something you cannot quite name. Once the Moon enters Aries, it gets easier to stop waiting for certainty and do one thing about it.",
  "aries-taurus": "The urgency starts to wear off once the Moon enters Taurus. You may care less about getting it done fast and more about making the plan something your body, budget, or schedule can actually support.",
  "taurus-gemini": "What felt simple enough to leave alone can turn into a question once the Moon enters Gemini. You may want one more detail, another conversation, or a little more information before you decide.",
  "gemini-cancer": "The conversation can keep moving until the Moon enters Cancer, when the part that actually bothered you becomes harder to talk around. You may want less input and more time to figure out how you feel about it.",
  "cancer-leo": "Once the Moon enters Leo, it can be easier to come out of yourself enough to say what you want, show someone what you made, or admit that you hoped they would notice.",
  "leo-virgo": "After the moment has been seen or felt, Virgo brings your attention to what happens next. The idea may need an edit, the plan may need a list, or the thing you were proud of may need one more round of work.",
  "virgo-libra": "Once the Moon enters Libra, attention moves from the task to the people affected by it. You may notice the tone, the timing, or that the same person keeps making the compromise.",
  "libra-scorpio": "Keeping things pleasant can stop feeling useful once the Moon enters Scorpio. The thing that has been implied, avoided, or softened may need to be said more plainly.",
  "scorpio-sagittarius": "Something that has been sitting under the surface may be harder to ignore early on. By afternoon, it can be easier to stop circling the same problem and decide what you want to do next.",
  "sagittarius-capricorn": "The bigger idea still matters, but Capricorn brings you back to the part that needs a date, a budget, or a next step. You may feel better once the plan stops being theoretical.",
  "capricorn-aquarius": "Once the Moon enters Aquarius, finishing the task may matter less than understanding why the same problem keeps showing up. A little distance can make the pattern easier to see.",
  "aquarius-pisces": "The plan may make sense on paper, but Pisces can make the part you have been overriding harder to ignore. Fatigue, atmosphere, and what you have been absorbing from other people may start to matter more."
};

export { moonSignTransitionKey } from "../../services/generatedContentKeys";

export function moonSignTransitionPair(fromSign: string, toSign: string) {
  return `${fromSign.toLowerCase().trim()}-${toSign.toLowerCase().trim()}`;
}

export function moonSignTransitionForPair(fromSign: string, toSign: string, override?: string | null) {
  return override?.trim() || moonSignTransitions[moonSignTransitionPair(fromSign, toSign)] || "";
}
