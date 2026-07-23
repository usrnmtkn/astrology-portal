import lunarCalendarContentLibrary from "../../content/lunar-calendar/content-library.json";
import { slugContentPart } from "../../services/generatedContentKeys";

type LunarCalendarCopyBlock = {
  fallback?: string;
  writeup?: string;
  mantra?: string;
  frame?: string;
  frameNoCycle?: string;
  kicker?: string;
  open?: string;
  action?: string;
  mantraFallbackToSign?: boolean;
};

type LunarCalendarContentLibrary = {
  oppositeSign: Record<string, string>;
  phaseReads: Record<string, LunarCalendarCopyBlock | string>;
  moonBySign: Record<string, LunarCalendarCopyBlock>;
  seasonBySign: Record<string, LunarCalendarCopyBlock>;
  lunationFraming: Record<string, LunarCalendarCopyBlock | string>;
};

export type LunarCalendarLibrarySection = {
  slot: "moon" | "lunation" | "season";
  body: string;
  sourceKeys: string[];
};

const library = lunarCalendarContentLibrary as LunarCalendarContentLibrary;

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{([a-zA-Z]+)\}/g, (_, key: string) => values[key] ?? "");
}

function canonicalPhase(phase: string) {
  const normalized = phase.toLowerCase().replace(/\s+/g, " ").trim();

  if (normalized.includes("new")) return "New Moon";
  if (normalized.includes("waxing crescent")) return "Waxing Crescent";
  if (normalized.includes("first quarter")) return "First Quarter";
  if (normalized.includes("waxing gibbous")) return "Waxing Gibbous";
  if (normalized.includes("full")) return "Full Moon";
  if (normalized.includes("waning gibbous") || normalized.includes("disseminating")) return "Waning Gibbous";
  if (normalized.includes("last quarter") || normalized.includes("third quarter")) return "Last Quarter";
  if (normalized.includes("waning crescent") || normalized.includes("balsamic")) return "Waning Crescent";

  return phase;
}

function asBlock(value: LunarCalendarCopyBlock | string | undefined): LunarCalendarCopyBlock | null {
  return value && typeof value === "object" ? value : null;
}

function sentenceJoin(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
}

function templateValues(sign: string, newMoonSign: string | null) {
  return {
    sign,
    SIGN: sign.toUpperCase(),
    oppositeSign: library.oppositeSign[sign] ?? "",
    newMoonSign: newMoonSign ?? ""
  };
}

function phaseFrame(phase: string, sign: string, newMoonSign: string | null) {
  const phaseBlock = asBlock(library.phaseReads[phase]);
  const template = newMoonSign ? phaseBlock?.frame : phaseBlock?.frameNoCycle ?? phaseBlock?.frame;

  return template ? fillTemplate(template, templateValues(sign, newMoonSign)) : "";
}

export function resolveLunarCalendarLibrarySections(options: {
  moonSign: string;
  moonPhase: string;
  seasonSign: string;
  newMoonSign?: string | null;
  isSeasonStart?: boolean;
  hasPrimaryNewOrFullMoon?: boolean;
}): LunarCalendarLibrarySection[] {
  const phase = canonicalPhase(options.moonPhase);
  const moonBlock = library.moonBySign[options.moonSign];
  const phaseBlock = asBlock(library.phaseReads[phase]);
  const moonValues = templateValues(options.moonSign, options.newMoonSign ?? null);
  const isCheckpoint = phase === "First Quarter" || phase === "Last Quarter";
  const moonFallback = isCheckpoint && phaseBlock?.fallback
    ? fillTemplate(phaseBlock.fallback, moonValues)
    : moonBlock?.fallback ?? "";
  const moonWriteup = sentenceJoin([
    isCheckpoint ? phaseFrame(phase, options.moonSign, options.newMoonSign ?? null) : "",
    moonBlock?.writeup ?? ""
  ]);
  const sections: LunarCalendarLibrarySection[] = [];

  sections.push({
    slot: "moon",
    body: sentenceJoin([moonFallback, moonWriteup, moonBlock?.mantra]),
    sourceKeys: [
      `lunar-calendar.content-library.phaseReads.${slugContentPart(phase)}`,
      `lunar-calendar.content-library.moonBySign.${slugContentPart(options.moonSign)}`
    ]
  });

  if (options.hasPrimaryNewOrFullMoon && (phase === "New Moon" || phase === "Full Moon")) {
    const lunationBlock = asBlock(library.lunationFraming[phase]);
    const lunationValues = templateValues(options.moonSign, options.newMoonSign ?? options.moonSign);
    const signMantra = lunationBlock?.mantraFallbackToSign ? moonBlock?.mantra : "";

    sections.push({
      slot: "lunation",
      body: sentenceJoin([
        lunationBlock?.open ? fillTemplate(lunationBlock.open, lunationValues) : "",
        lunationBlock?.action ?? "",
        signMantra
      ]),
      sourceKeys: [
        `lunar-calendar.content-library.lunationFraming.${slugContentPart(phase)}`,
        `lunar-calendar.content-library.moonBySign.${slugContentPart(options.moonSign)}`
      ]
    });
  }

  if (options.isSeasonStart) {
    const seasonBlock = library.seasonBySign[options.seasonSign];

    sections.push({
      slot: "season",
      body: sentenceJoin([seasonBlock?.fallback, seasonBlock?.writeup, seasonBlock?.mantra]),
      sourceKeys: [`lunar-calendar.content-library.seasonBySign.${slugContentPart(options.seasonSign)}`]
    });
  }

  return sections.filter((section) => section.body.trim().length > 0);
}
