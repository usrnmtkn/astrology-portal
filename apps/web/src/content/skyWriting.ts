import authoredArticlesRaw from "./sky-writing/sky-articles-authored-v1.json";
import fallbackAtomsRaw from "./sky-writing/fallback-atoms-v1.json";
import signColorsRaw from "./sky-writing/sign-colors-v1.json";

export type SkyWritingAspectBeat = {
  aspect: string;
  dateLine?: string | null;
  from: string;
  to: string;
};

export type SkyWritingPlacement = {
  planet: string;
  sign: string;
  motion?: "direct" | "retrograde";
  transitEnd?: string | null;
  retrogradeStart?: string | null;
  retrogradeEnd?: string | null;
  retrogradeShadowStart?: string | null;
  retrogradeShadowEnd?: string | null;
  cazimiDate?: string | null;
};

export type SkyWritingArticle = {
  layer: "authored" | "fallback";
  sourceKeys: string[];
  paragraphs: string[];
};

type AuthoredBeat = {
  slot?: string;
  text?: string;
};

type AuthoredArticle = {
  key: string;
  type: "direct" | "retrograde";
  sections?: Record<string, unknown>;
  header?: Record<string, unknown>;
  version?: string;
};

type FallbackAtoms = {
  planetFunctions?: Record<string, string>;
  signMechanics?: Record<string, string>;
  doDont?: Record<string, { do?: string[]; dont?: string[] }>;
  collectiveFrames?: Record<string, string>;
  signSubjects?: Record<string, string>;
};

const authoredArticles = authoredArticlesRaw as AuthoredArticle[];
const fallbackAtoms = fallbackAtomsRaw as FallbackAtoms;
const signColors = signColorsRaw as Record<string, string>;

const directSectionOrder = [
  "opening",
  "mechanics",
  "lived",
  "shadow",
  "truth",
  "collective",
  "walkthrough",
  "directive",
  "handoff"
] as const;

const rxSectionOrder = [
  "s1_header",
  "s1",
  "s2_header",
  "s2",
  "s3_header",
  "s3",
  "s4_header",
  "s4",
  "do_dont",
  "handoff"
] as const;

function keyPart(value: string) {
  return value.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function displayDate(value?: string | null, options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" }) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(date);
}

function replaceSlots(value: string, placement: SkyWritingPlacement) {
  return value
    .replace(/\[rx_start\]/g, displayDate(placement.retrogradeStart, { month: "short", day: "numeric", year: "numeric" }))
    .replace(/\[rx_end\]/g, displayDate(placement.retrogradeEnd, { month: "short", day: "numeric", year: "numeric" }))
    .replace(/\[pre_shadow_start\]/g, displayDate(placement.retrogradeShadowStart))
    .replace(/\[post_shadow_end\]/g, displayDate(placement.retrogradeShadowEnd))
    .replace(/\[cazimi_date\]/g, displayDate(placement.cazimiDate));
}

function textValue(value: unknown, placement: SkyWritingPlacement) {
  return typeof value === "string" ? replaceSlots(value.trim(), placement) : "";
}

function cleanParagraphs(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);
}

function articleFor(placement: SkyWritingPlacement) {
  const planet = keyPart(placement.planet);
  const sign = keyPart(placement.sign);
  const suffix = placement.motion === "retrograde" ? ".rx" : "";
  const key = `sky.${planet}.${sign}${suffix}`;

  return authoredArticles.find((article) => article.key === key) ?? null;
}

function beatSortDate(beat: string) {
  const match = beat.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}/i);
  if (!match) return Number.POSITIVE_INFINITY;
  const date = new Date(`${match[0].replace(/\.$/, "")}, 2026 UTC`);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
}

export function formatSkyWritingAspectBeat(beat: SkyWritingAspectBeat) {
  if (!beat.dateLine) return "";
  const aspect = beat.aspect.trim().toLowerCase();
  const fact = `${beat.from} ${aspect} ${beat.to}`;

  return `${beat.dateLine}: ${fact}.`;
}

function walkthroughParagraphs(article: AuthoredArticle, placement: SkyWritingPlacement, beats: SkyWritingAspectBeat[]) {
  const sections = article.sections ?? {};
  const authoredBeats = Array.isArray(sections.walkthrough_authored_beats)
    ? sections.walkthrough_authored_beats
      .map((beat) => textValue((beat as AuthoredBeat).text, placement))
      .filter(Boolean)
    : [];
  const computedBeats = beats.map(formatSkyWritingAspectBeat).filter(Boolean);

  return [...authoredBeats, ...computedBeats]
    .sort((first, second) => beatSortDate(first) - beatSortDate(second));
}

function authoredDirectArticle(article: AuthoredArticle, placement: SkyWritingPlacement, beats: SkyWritingAspectBeat[]): SkyWritingArticle {
  const sections = article.sections ?? {};
  const paragraphs = directSectionOrder.flatMap((sectionKey) => {
    if (sectionKey === "walkthrough") {
      return walkthroughParagraphs(article, placement, beats);
    }

    return cleanParagraphs([textValue(sections[sectionKey], placement)]);
  });

  return {
    layer: "authored",
    sourceKeys: ["sky-writing-v1", article.key, article.version ?? ""].filter(Boolean),
    paragraphs
  };
}

function doDontParagraphs(value: { do?: string[]; dont?: string[] } | undefined) {
  if (!value) return [];
  const list = (label: string, items?: string[]) => {
    const cleanItems = items?.map((item) => item.trim()).filter(Boolean) ?? [];
    return cleanItems.length > 0 ? `${label}: ${cleanItems.join("; ")}.` : "";
  };

  return cleanParagraphs([
    list("Do", value.do),
    list("Don't", value.dont)
  ]);
}

function authoredRetrogradeArticle(article: AuthoredArticle, placement: SkyWritingPlacement): SkyWritingArticle {
  const sections = article.sections ?? {};
  const header = article.header ?? {};
  const paragraphs = cleanParagraphs([
    textValue(header.whenSlot, placement) ? `When: ${textValue(header.whenSlot, placement)}` : "",
    textValue(header.what, placement) ? `What: ${textValue(header.what, placement)}` : "",
    textValue(header.tldr, placement) ? `TLDR: ${textValue(header.tldr, placement)}` : ""
  ]);

  rxSectionOrder.forEach((sectionKey) => {
    if (sectionKey === "do_dont") {
      paragraphs.push(...doDontParagraphs({
        do: Array.isArray(sections.do) ? sections.do.map(String) : [],
        dont: Array.isArray(sections.dont) ? sections.dont.map(String) : []
      }));
      return;
    }

    const text = textValue(sections[sectionKey], placement);
    if (text) paragraphs.push(text);
  });

  return {
    layer: "authored",
    sourceKeys: ["sky-writing-v1", article.key, article.version ?? ""].filter(Boolean),
    paragraphs
  };
}

function nextSign(sign: string) {
  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const index = signs.findIndex((item) => keyPart(item) === keyPart(sign));
  return index >= 0 ? signs[(index + 1) % signs.length] : "";
}

function fallbackArticle(placement: SkyWritingPlacement, beats: SkyWritingAspectBeat[]): SkyWritingArticle | null {
  const planet = keyPart(placement.planet);
  const sign = keyPart(placement.sign);
  const mode = placement.motion === "retrograde" ? "retrograde" : "direct";
  const collectiveFrame = fallbackAtoms.collectiveFrames?.[planet];
  const signSubjects = fallbackAtoms.signSubjects?.[sign];
  const collective = collectiveFrame && signSubjects
    ? collectiveFrame.replace(/\[SIGN SUBJECTS\]/g, signSubjects)
    : "";
  const handoffDate = displayDate(placement.transitEnd);
  const handoffSign = nextSign(placement.sign);
  const handoff = handoffDate && handoffSign
    ? `${placement.planet} moves into ${handoffSign} on ${handoffDate}.`
    : "";

  const paragraphs = cleanParagraphs([
    fallbackAtoms.planetFunctions?.[planet],
    signColors[`${planet}.${sign}`],
    fallbackAtoms.signMechanics?.[sign],
    collective,
    ...beats.map(formatSkyWritingAspectBeat),
    ...doDontParagraphs(fallbackAtoms.doDont?.[`${planet}.${mode}`]),
    handoff
  ]);

  if (paragraphs.length === 0) return null;

  return {
    layer: "fallback",
    sourceKeys: ["sky-writing-v1", "fallback-atoms-v1", `sky.${planet}.${sign}.${mode}`],
    paragraphs
  };
}

export function resolveSkyWritingArticle(placement: SkyWritingPlacement, beats: SkyWritingAspectBeat[] = []): SkyWritingArticle | null {
  const article = articleFor(placement);

  if (article?.type === "retrograde") {
    return authoredRetrogradeArticle(article, placement);
  }

  if (article?.type === "direct") {
    return authoredDirectArticle(article, placement, beats);
  }

  return fallbackArticle(placement, beats);
}
