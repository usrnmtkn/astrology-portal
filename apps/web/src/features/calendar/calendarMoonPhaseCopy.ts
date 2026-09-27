import { renderCalendarMoonWriting } from "./calendarMoonContext.js";
import type { CalendarMoonCycleFacts } from "./calendarMoonCycle.js";
import { isRejectedCalendarMoonCopy } from './calendarMoonCopyRevisions.js';

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

/** Preserve the previous rejection without requiring a magic phrase in every future revision. */
export function isRetiredCalendarMoonPhaseBody(body: string) {
  return body.trim() === "First resistance arrives right on schedule. Adjust the plan, not the intention."
    || ['disseminating', 'last-quarter'].some(phase => isRejectedCalendarMoonCopy(`${PHASE_HOOK_PREFIX}/${phase}`, body))
    || /seed tests the soil|first visible action on what you planted/i.test(body);
}

export function calendarWaxingCrescentCopyFor(
  facts?: Pick<CalendarMoonCycleFacts, "previousLunationType">
) {
  return facts?.previousLunationType === "new-moon"
    ? calendarWaxingCrescentAfterNewMoonCopy
    : calendarWaxingCrescentCopy;
}

/** Calendar phase passages. Revision history and review state are retained separately. */
export const calendarMoonPhaseDefaults: Record<string, string> = {
  "new-moon": "The cycle opens in {{signTitle}}. Plant one intention, small and true; new things grow in the dark first.",
  "waxing-crescent": calendarWaxingCrescentCopy,
  "first-quarter": calendarFirstQuarterCopy,
  "waxing-gibbous": "Almost there is its own phase. Trim what the goal does not need and let the rest ripen.",
  "full-moon": "The high tide of power. Celebrate what arrived, look honestly at what did not, and let the light show you the difference.",
  disseminating: "The Moon is waning after the [Full Moon in {{previousLunationSign}} on {{previousLunationDate}}]({{previousLunationUrl}}). In astrology, this part of the cycle is associated with making sense of recent experiences. You may understand a feeling differently when you put it into words, whether in a conversation or a journal.",
  "last-quarter": "The Last Quarter Moon falls between the [Full Moon in {{previousLunationSign}} on {{previousLunationDate}}]({{previousLunationUrl}}) and the [New Moon in {{nextLunationSign}} on {{nextLunationDate}}]({{nextLunationUrl}}). This phase is associated with reconsidering what you want to continue. If you have been working toward an intention, this is a chance to notice whether it still matters to you and whether your approach needs to change.",
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

function filledPhaseBody(body: string, facts: Partial<CalendarMoonCycleFacts>, contentKey: string) {
  const filled = renderCalendarMoonWriting(body.replace(/\{\{signTitle\}\}/g, titleCaseSign(facts.moonSign ?? "")), contentKey, facts);
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
  > & Partial<CalendarMoonCycleFacts>,
  lookup: (contentKey: string) => string | null | undefined
) {
  const slug = calendarMoonPhaseSlug(facts.moonPhase, facts);
  if (!slug) return null;
  const exactKey = `${PHASE_HOOK_PREFIX}/${slug}/${facts.moonSign.toLowerCase().trim()}`;
  const genericKey = `${PHASE_HOOK_PREFIX}/${slug}`;
  const exactBody = filledPhaseBody(lookup(exactKey) || "", facts, exactKey);
  if (exactBody && !isRetiredCalendarMoonPhaseBody(exactBody)) return { body: exactBody, contentKey: exactKey };
  const lookedUp = filledPhaseBody(lookup(genericKey) || "", facts, genericKey);
  if (lookedUp && !isRetiredCalendarMoonPhaseBody(lookedUp)) return { body: lookedUp, contentKey: genericKey };
  if (slug === "waxing-crescent") return { body: calendarWaxingCrescentCopyFor(facts), contentKey: genericKey };
  const genericBody = filledPhaseBody(calendarMoonPhaseDefaults[slug] || "", facts, genericKey);
  return genericBody ? { body: genericBody, contentKey: genericKey } : null;
}
