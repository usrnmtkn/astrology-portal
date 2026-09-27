import { isRejectedCalendarMoonCopy } from './calendarMoonCopyRevisions.js';

/** Calendar continuation passages; September revisions retain their original text in calendarMoonCopyRevisions.json. */
export const moonContinuationSummaries: Record<string, string> = {
  aries: "With the Moon in Aries, wanting something and acting on it can feel very close together. That directness can help you speak honestly about what matters to you. Impatience can also make a delay feel like a refusal, even when the answer is simply not yet.",
  taurus: "The Taurus Moon brings attention to comfort and the things that help you feel secure. A familiar routine can be reassuring, especially when you have a lot to manage. The same attachment to familiarity can make a useful change harder to consider.",
  gemini: "With the Moon in Gemini, talking through a feeling can help you understand it. A question or a different point of view may give you words for something you had trouble explaining. There is also room to change your mind as you learn more.",
  cancer: "The Cancer Moon brings attention to home, closeness, and the care you need. You may want the company of someone who knows you well, or more privacy than usual. Caring for someone and needing time to yourself can both be true.",
  leo: "The reaction matters less than knowing what you still care about when nobody is responding.",
  virgo: "Use the second pass to make the system easier, not stricter.",
  libra: "If the compromise keeps landing on the same person, that is part of the story.",
  scorpio: "If the same issue keeps returning, there may be something underneath it that has not been said plainly yet.",
  sagittarius: "A wider view helps, but eventually the idea needs a direction.",
  capricorn: "Keep the plan small enough to follow and concrete enough to finish.",
  aquarius: "Distance is useful if it helps you see something you can actually change.",
  pisces: "Take the mood seriously, not literally."
};

/** Leftover sentences used when First Quarter already carries follow-through. */
export const moonContinuationOnFirstQuarter: Record<string, string> = {
  sagittarius: "Notice which possibility still feels worth following."
};

export function moonContinuationSummaryKey(sign: string) {
  const slug = sign.toLowerCase().trim();
  return slug ? `authored/calendar-moon-continuation-summary/${slug}` : "";
}

export function moonContinuationSummaryForSign(
  sign: string,
  override?: string | null,
  options?: { exactFirstQuarter?: boolean }
) {
  const slug = sign.toLowerCase().trim();
  if (override?.trim() && !isRejectedCalendarMoonCopy(moonContinuationSummaryKey(slug), override)) return override.trim();
  if (options?.exactFirstQuarter && moonContinuationOnFirstQuarter[slug]) {
    return moonContinuationOnFirstQuarter[slug];
  }
  return moonContinuationSummaries[slug] || "";
}
