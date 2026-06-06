import type { Horoscope, HoroscopePeriod, SkySnapshot } from "../types";

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

export function getHoroscope(period: HoroscopePeriod, sky: SkySnapshot): Horoscope {
  const base = periodCopy[period];
  const moon = sky.positions.find((position) => position.planet === "Moon");

  return {
    period,
    ...base,
    summary: `${base.summary} With the Moon in ${moon?.sign ?? "motion"} over ${sky.location.label}, the emotional tone is asking to be noticed before it is interpreted.`
  };
}
