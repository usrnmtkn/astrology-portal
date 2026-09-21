/** Editorial labels only: stable source keys and owner prose are never renamed. */
import { calendarSeasonTransitionTitle } from "../../web/src/features/calendar/calendarSeasonTransitionTitle.js";

export const lunarSigns = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

export const lunarWorkspaceJobs = [
  "Day and Week Moon story",
  "Event readings",
  "Shared with Sky"
] as const;

export type LunarWorkspaceJob = (typeof lunarWorkspaceJobs)[number];

export const lunarWorkspaceFamilyOrder = [
  "Lunation articles",
  "Moon-sign leftover",
  "Continuation sentences",
  "Sign-change sentences",
  "Season transitions",
  "Lunar journal",
  "Sun daily summary",
  "Moon daily summary"
];

export type LunarContentIdentity = {
  family: string;
  job: LunarWorkspaceJob;
  sign: string;
  variant: number;
  title: string;
  kind: string;
  destination: string;
  selection: string;
  excluded: boolean;
};

export function lunarWorkspaceJobForFamily(family: string): LunarWorkspaceJob {
  if (family === "Lunar journal") return "Event readings";
  if (family === "Sun daily summary" || family === "Moon daily summary") return "Shared with Sky";
  return "Day and Week Moon story";
}

function withJob(identity: Omit<LunarContentIdentity, "job">): LunarContentIdentity {
  return { ...identity, job: lunarWorkspaceJobForFamily(identity.family) };
}

const words = (value: string) => value.replace(/[-_.]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

export function lunarWorkspaceSelectionFromQuery(query: string) {
  const key = query.trim();
  if (!/^(?:authored|fallback-hook|cms)\//.test(key)) return null;
  const identity = lunarContentIdentity(key);
  if (!identity) return null;
  return { key, family: identity.family, job: identity.job, sign: identity.sign || "all" };
}

const moonDailyKindLabels: Record<string, string> = {
  regular: "Regular",
  newMoon: "New Moon",
  fullMoon: "Full Moon",
  solarEclipse: "Solar eclipse",
  lunarEclipse: "Lunar eclipse"
};

export function lunarContentIdentity(key: string): LunarContentIdentity | null {
  const sunSummary = key.match(/^cms\/sky-daily-summary\/sun\/([^/]+)$/);
  if (sunSummary) {
    return withJob({
      family: "Sun daily summary",
      sign: sunSummary[1],
      variant: 1,
      title: `Sun in ${words(sunSummary[1])}`,
      kind: "Complete passage",
      destination: "Calendar Day card and Sky daily overview",
      selection: "The Calendar Day card opens with this Sun sentence. The same sentence appears on the Sky daily overview.",
      excluded: false
    });
  }
  const moonDaily = key.match(/^cms\/sky-daily-summary\/moon\/([^/]+)(?:\/([^/]+))?$/);
  if (moonDaily) {
    const kind = moonDaily[2] ?? "regular";
    const kindLabel = moonDailyKindLabels[kind] ?? words(kind);
    return withJob({
      family: "Moon daily summary",
      sign: moonDaily[1],
      variant: 1,
      title: kind === "regular" ? `Moon in ${words(moonDaily[1])}` : `Moon in ${words(moonDaily[1])} · ${kindLabel}`,
      kind: "Complete passage",
      destination: "Sky daily overview",
      selection: "This is the Sky daily-overview Moon sentence, including New Moon and Full Moon variants. It is grouped here so it can be edited next to Calendar Day writing. Calendar Day and Week leftover does not use it.",
      excluded: false
    });
  }
  if (key.startsWith("cms/sky-daily-summary/")) return null;
  const lunationMacro = key.match(/^authored\/sky-lunation-macro\/(new-moon|full-moon)\/([^/]+)$/);
  if (lunationMacro) {
    const phase = lunationMacro[1] === "new-moon" ? "New Moon" : "Full Moon";
    return withJob({
      family: "Lunation articles",
      sign: lunationMacro[2],
      variant: 1,
      title: `${phase} in ${words(lunationMacro[2])}`,
      kind: "Complete passage",
      destination: "Calendar Day and Week on lunation dates",
      selection: "On New Moon and Full Moon dates, Calendar Day and Week use this lunation article when it is available. Quiet days in the same Moon visit then use leftover.",
      excluded: false
    });
  }
  const moonSummary = key.match(/^authored\/calendar-moon-continuation-summary\/([^/]+)$/);
  if (moonSummary) {
    return withJob({
      family: "Continuation sentences",
      sign: moonSummary[1],
      variant: 1,
      title: `Moon in ${words(moonSummary[1])} · Continuation`,
      kind: "Timing sentence",
      destination: "Calendar leftover after the Moon-sign leftover is used",
      selection: "This sentence describes what is different about a leftover day in the sign. It is not a full passage, and it is used once the leftover for this Moon visit is already on the calendar.",
      excluded: false
    });
  }
  const seasonTransition = key.match(/^authored\/calendar-season-transition\/([^/]+)\/([^/]+)(?:\/variant-(\d+))?$/);
  if (seasonTransition) {
    return withJob({
      family: "Season transitions",
      sign: seasonTransition[1],
      variant: Number(seasonTransition[3] ?? 1),
      title: calendarSeasonTransitionTitle(seasonTransition[1], seasonTransition[2], Number(seasonTransition[3] ?? 1)),
      kind: "Timing sentence",
      destination: "Calendar Day and Week when a season is ending",
      selection: "This pair-specific passage is used when a zodiac season is ending. Ends opens with the current season ending. Begins opens with the next season starting. The Begins passages rotate so the same pair does not repeat across the last days of a season.",
      excluded: false
    });
  }
  const moonTransition = key.match(/^authored\/calendar-moon-transition\/([^/]+)\/([^/]+)$/);
  if (moonTransition) {
    return withJob({
      family: "Sign-change sentences",
      sign: moonTransition[1],
      variant: 1,
      title: `Moon ${words(moonTransition[1])} to ${words(moonTransition[2])}`,
      kind: "Timing sentence",
      destination: "Calendar leftover on Moon ingress days",
      selection: "This pair-specific sentence is the second line on a Moon sign-change day. It is not two leftover passages joined together.",
      excluded: false
    });
  }
  const moon = key.match(/^authored\/calendar-weekly-moon\/([^/]+)(?:\/variant-(\d+))?$/);
  if (moon) {
    return withJob({
      family: "Moon-sign leftover",
      sign: moon[1],
      variant: Number(moon[2] ?? 1),
      title: `Moon in ${words(moon[1])} · Leftover ${moon[2] ?? 1}`,
      kind: "Complete passage",
      destination: "Calendar Day and Week leftover",
      selection: "Calendar uses one leftover per Moon visit on a quiet day, after the lunation article. Alternatives are never joined together.",
      excluded: key === "authored/calendar-weekly-moon/cancer"
    });
  }
  const journal = key.match(/^authored\/lunar-journal\/([^/]+)\/([^/]+)\/([^/]+)(?:\/(\d+))?$/);
  if (journal) {
    const typeLabels: Record<string, string> = {
      season: "Season",
      new: "New Moon",
      full: "Full Moon",
      firstq: "First quarter",
      lastq: "Last quarter",
      eclipse: "Eclipse",
      equinox: "Equinox"
    };
    const type = journal[1] ?? "";
    const slug = journal[2] ?? "";
    const sign = lunarSigns.includes(slug) ? slug : "";
    return withJob({
      family: "Lunar journal",
      sign,
      variant: Number(journal[4] ?? 1),
      title: `${typeLabels[type] ?? words(type)} · ${words(slug)}`,
      kind: "Complete passage",
      destination: "Calendar event reading",
      selection: "The Calendar matches this passage to the season, lunation, eclipse, or equinox the reader opens. A saved draft is not reader copy until it is published. The packaged owner source is used until then.",
      excluded: false
    });
  }
  if (!/lunar|lunation|moon-phase|moon-sign|eclipse|(?:new|full)-moon|cms\/calendar-day/.test(key)) return null;
  const parts = key.split('/');
  const sign = parts.find(part => lunarSigns.includes(part)) ?? '';
  const variant = parts.at(-1)?.match(/^(?:v|variant-)(\d+)$/)?.[1];
  const family = key.includes('eclipse') ? 'Eclipse passages' : key.includes('moon-phase') ? 'Moon phases' : key.startsWith('cms/calendar-day/') ? 'Day-card templates' : 'Lunar supporting copy';
  const name = parts.filter(part => !['cc', 'fallback-hook', 'authored', 'fallback-template', 'cms', sign].includes(part) && !/^(?:v|variant-)\d+$/.test(part)).map(words).join(' · ');
  return withJob({
    family,
    sign,
    variant: Number(variant ?? 1),
    title: `${name}${sign ? ` · ${words(sign)}` : ''}${variant ? ` · Variant ${variant}` : ''}`,
    kind: key.includes('template') || key.startsWith('cms/') ? 'Template' : 'Supporting passage',
    destination: 'Calendar / lunar sources',
    selection: 'Review this source and its declared variables. A saved or published row alone does not prove the Calendar selects it. The composition view shows missing source links.',
    excluded: false
  });
}
