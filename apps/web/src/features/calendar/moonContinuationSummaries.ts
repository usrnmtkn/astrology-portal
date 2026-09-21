/** Owner-provided continuation sentences. Not leftover Moon-sign passages. */
export const moonContinuationSummaries: Record<string, string> = {
  aries: "If you already started it yesterday, today shows you if you still want it once the first burst wears off.",
  taurus: "Repeat what actually made yesterday easier instead of adding more to the plan.",
  gemini: "The extra information is useful only if it changes the decision.",
  cancer: "Notice what you keep needing once the immediate mood passes.",
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
  if (options?.exactFirstQuarter && moonContinuationOnFirstQuarter[slug]) {
    return moonContinuationOnFirstQuarter[slug];
  }
  return override?.trim() || moonContinuationSummaries[slug] || "";
}
