import type { Horoscope, HoroscopePeriod, SkySnapshot } from "../types";
import { isReaderFacingCopy } from "../content/readerSafety";

type HoroscopeProseLayer = "source-grounded" | "madlib-fallback";

type NormalizedHoroscopeSection = {
  slot: "summary" | "moon-context" | "reflection";
  required: boolean;
  layer: HoroscopeProseLayer;
  tier: string;
  sourceKeys: string[];
  body: string;
};

type NormalizedHoroscopeSurface = {
  surface: "horoscope";
  status: "servable" | "partial" | "not-servable";
  sections: NormalizedHoroscopeSection[];
};

const periodCopy: Record<HoroscopePeriod, Pick<Horoscope, "title" | "summary" | "focus" | "reflection">> = {
  daily: {
    title: "Daily Horoscope",
    summary: "Today asks for precision without losing softness. Start with the one truth your body already knows, then let the schedule form around it.",
    focus: ["Name the priority", "Protect one quiet hour", "Let a conversation stay simple"],
    reflection: "What becomes easier when you stop arguing with the obvious?"
  },
  weekly: {
    title: "Weekly Horoscope",
    summary: "The week gathers around repair, pacing, and emotional clarity. Something that has felt scattered can become workable once you give it a container.",
    focus: ["Review shared expectations", "Choose consistency over intensity", "Close one old loop"],
    reflection: "Where would a smaller promise create more trust?"
  },
  monthly: {
    title: "Monthly Horoscope",
    summary: "This month favors a slower kind of ambition: the kind that notices what is sustainable before it chases what is impressive.",
    focus: ["Refine your rhythm", "Invest in core relationships", "Let taste guide one big choice"],
    reflection: "What future are your daily rituals already voting for?"
  }
};

function normalizedHoroscopeSection(
  slot: NormalizedHoroscopeSection["slot"],
  body: string,
  sourceKeys: string[],
  required = false
): NormalizedHoroscopeSection | null {
  const copy = body.trim();

  if (!isReaderFacingCopy(copy)) {
    return null;
  }

  return {
    slot,
    required,
    layer: "madlib-fallback",
    tier: "source-based-local-horoscope",
    sourceKeys,
    body: copy
  };
}

function normalizeHoroscopeSurface(period: HoroscopePeriod, sky: SkySnapshot): NormalizedHoroscopeSurface {
  const base = periodCopy[period];
  const moon = sky.positions.find((position) => position.planet === "Moon");
  const sections = [
    normalizedHoroscopeSection("summary", base.summary, [`horoscope.period.${period}.summary`], true),
    normalizedHoroscopeSection(
      "moon-context",
      `With the Moon in ${moon?.sign ?? "motion"} over ${sky.location.label}, the emotional tone is asking to be noticed before it is interpreted.`,
      [
        "horoscope.moon-context",
        moon?.sign ? `sky.moon.${moon.sign}` : "sky.moon.motion",
        `sky.location.${sky.location.label}`
      ],
      false
    ),
    normalizedHoroscopeSection("reflection", base.reflection, [`horoscope.period.${period}.reflection`], false)
  ].filter((section): section is NormalizedHoroscopeSection => Boolean(section));

  return {
    surface: "horoscope",
    status: sections.some((section) => section.required) ? "partial" : "not-servable",
    sections
  };
}

export function getHoroscope(period: HoroscopePeriod, sky: SkySnapshot): Horoscope {
  const base = periodCopy[period];
  const normalized = normalizeHoroscopeSurface(period, sky);
  const summary = normalized.sections
    .filter((section) => section.slot === "summary" || section.slot === "moon-context")
    .map((section) => section.body)
    .join(" ");
  const reflection = normalized.sections.find((section) => section.slot === "reflection")?.body ?? "";

  return {
    period,
    ...base,
    summary,
    reflection
  };
}
