import type { CalendarMoonCycleFacts } from "./calendarMoonCycle";

const PHASE_HOOK_PREFIX = "fallback-hook/moon-phase";

/** Calendar leftover First Quarter copy. Names the New Moon so "intention" has a referent. */
export const calendarFirstQuarterCopy =
  "The First Quarter Moon arrives today, about a week after the New Moon, making this a useful time to revisit any intentions you set then. If following through is harder than you expected, adjust the approach before you abandon the intention.";

/** Waxing crescent leftover when leftover does not already name the New Moon. */
export const calendarWaxingCrescentCopy =
  "Take one small step toward something you've been planning, such as sending the message or starting the draft. It doesn't have to look impressive; trying it gives you a chance to see what works and what needs adjusting.";

/** Waxing crescent leftover when leftover already has New Moon context. */
export const calendarWaxingCrescentAfterNewMoonCopy =
  "Think back to what you wanted to begin or change around the New Moon. Now give that intention a first practical step, such as starting the conversation or making time for the work. You don't need a finished result yet, just a beginning you can learn from.";

function isRetiredWaxingCrescentCopy(body: string) {
  return /seed tests the soil|first visible action on what you planted/i.test(body);
}

export function calendarWaxingCrescentCopyFor(
  facts?: Pick<CalendarMoonCycleFacts, "previousLunationType">
) {
  return facts?.previousLunationType === "new-moon"
    ? calendarWaxingCrescentAfterNewMoonCopy
    : calendarWaxingCrescentCopy;
}

/** Approved `fallback-hook/moon-phase/{phase}` bodies. Exact authored units. */
export const calendarMoonPhaseDefaults: Record<string, string> = {
  "new-moon": "The cycle opens in {{signTitle}}. Plant one intention, small and true; new things grow in the dark first.",
  "waxing-crescent": calendarWaxingCrescentCopy,
  "first-quarter": calendarFirstQuarterCopy,
  "waxing-gibbous": "Almost there is its own phase. Trim what the goal does not need and let the rest ripen.",
  "full-moon": "The high tide of power. Celebrate what arrived, look honestly at what did not, and let the light show you the difference.",
  disseminating: "The light starts giving itself away. Tell someone what this cycle taught you; a lesson settles when it is shared.",
  "last-quarter": "The waning Moon carries things out. Put down what the harvest proved you no longer need.",
  balsamic: "The dark before the next seed. Rest on purpose and leave the ground alone; the next cycle is already forming."
};

export function calendarMoonPhaseSlug(phase: string, facts?: Pick<
  CalendarMoonCycleFacts,
  "exactNewMoon" | "exactFullMoon" | "exactSolarEclipse" | "exactLunarEclipse" | "exactFirstQuarter" | "exactLastQuarter"
>) {
  if (facts?.exactSolarEclipse || facts?.exactNewMoon) return "new-moon";
  if (facts?.exactLunarEclipse || facts?.exactFullMoon) return "full-moon";
  if (facts?.exactFirstQuarter) return "first-quarter";
  if (facts?.exactLastQuarter) return "last-quarter";
  const normalized = phase.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.includes("new")) return "new-moon";
  if (normalized.includes("first quarter")) return "first-quarter";
  if (normalized.includes("waxing crescent")) return "waxing-crescent";
  if (normalized.includes("waxing gibbous")) return "waxing-gibbous";
  if (normalized.includes("full")) return "full-moon";
  if (normalized.includes("disseminating") || normalized.includes("waning gibbous")) return "disseminating";
  if (normalized.includes("last quarter") || normalized.includes("third quarter")) return "last-quarter";
  if (normalized.includes("balsamic") || normalized.includes("waning crescent")) return "balsamic";
  return "";
}

export function calendarMoonPhaseHookKey(phase: string, sign = "") {
  const slug = calendarMoonPhaseSlug(phase);
  if (!slug) return "";
  const signSlug = sign.toLowerCase().trim();
  return signSlug ? `${PHASE_HOOK_PREFIX}/${slug}/${signSlug}` : `${PHASE_HOOK_PREFIX}/${slug}`;
}

function titleCaseSign(sign: string) {
  return sign
    .toLowerCase()
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function filledPhaseBody(body: string, sign: string) {
  const filled = body.replace(/\{\{signTitle\}\}/g, titleCaseSign(sign)).trim();
  return filled && !/\{\{/.test(filled) ? filled : "";
}

export function calendarMoonPhaseCopy(
  facts: Pick<
    CalendarMoonCycleFacts,
    | "moonPhase"
    | "moonSign"
    | "exactNewMoon"
    | "exactFullMoon"
    | "exactSolarEclipse"
    | "exactLunarEclipse"
    | "exactFirstQuarter"
    | "exactLastQuarter"
    | "previousLunationType"
  >,
  lookup: (contentKey: string) => string | null | undefined
) {
  const slug = calendarMoonPhaseSlug(facts.moonPhase, facts);
  if (!slug) return null;
  const exactKey = `${PHASE_HOOK_PREFIX}/${slug}/${facts.moonSign.toLowerCase().trim()}`;
  const genericKey = `${PHASE_HOOK_PREFIX}/${slug}`;
  const exactBody = filledPhaseBody(lookup(exactKey) || "", facts.moonSign);
  if (
    exactBody
    && (slug !== "first-quarter" || exactBody.includes("about a week after the New Moon"))
    && (slug !== "waxing-crescent" || !isRetiredWaxingCrescentCopy(exactBody))
  ) {
    return { body: exactBody, contentKey: exactKey };
  }
  const lookedUp = filledPhaseBody(lookup(genericKey) || "", facts.moonSign);
  if (slug === "first-quarter") {
    const body = lookedUp.includes("about a week after the New Moon") ? lookedUp : calendarFirstQuarterCopy;
    return { body, contentKey: genericKey };
  }
  if (slug === "waxing-crescent") {
    const body = facts.previousLunationType === "new-moon"
      ? calendarWaxingCrescentAfterNewMoonCopy
      : lookedUp && !isRetiredWaxingCrescentCopy(lookedUp)
        ? lookedUp
        : calendarWaxingCrescentCopy;
    return { body, contentKey: genericKey };
  }
  const genericBody = lookedUp || filledPhaseBody(calendarMoonPhaseDefaults[slug] || "", facts.moonSign);
  return genericBody ? { body: genericBody, contentKey: genericKey } : null;
}
