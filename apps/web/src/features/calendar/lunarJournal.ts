import type { LunarCalendarEvent } from "../../services/ephemeris";
import type { LiveGeneratedContent } from "../../services/generatedContent";
import lunarJournalPack from "./data/lunar-journal.entries.json" with { type: "json" };
import { matchLunarJournalIndex, type LunarJournalType } from "./lunarJournalKeys";

export {
  isLunarJournalContentKey,
  journalInstant,
  journalTypeForEvent,
  LUNAR_JOURNAL_PREFIX,
  lunarJournalContentKeyForEvent,
  type LunarJournalType
} from "./lunarJournalKeys";

export const LUNAR_JOURNAL_REVIEW_STATUS = "needs_review";

export type LunarJournalBlock =
  | { type: "para"; text: string }
  | { type: "heading"; text: string }
  | { type: "exact"; text: string }
  | { type: "intent"; label?: string; text: string }
  | { type: "section"; title?: string; text?: string }
  | { type: "cycle"; title?: string; text?: string; link?: string }
  | { type: "notice"; title?: string; text?: string }
  | { type: "prompt"; label?: string; text?: string }
  | { type: "tarot"; label?: string; text?: string }
  | { type: "bullets"; title?: string; items: string[] }
  | { type: "callin"; label?: string; items: string[] }
  | { type: "ritual"; label?: string; steps: string[]; notes?: string[] }
  | { type: "times"; items: Array<{ city?: string; time?: string }> }
  | { type: "bysign"; title?: string; items: Array<{ sign: string; house?: string; text: string }> };

export type LunarJournalEntry = {
  contentKey: string;
  start: string;
  end: string;
  type: LunarJournalType;
  sign: string;
  title: string;
  blocks: LunarJournalBlock[];
};

type LunarJournalPack = {
  schema: string;
  source: string;
  review_status: string;
  entries: LunarJournalEntry[];
};

const pack = lunarJournalPack as LunarJournalPack;

export const LUNAR_JOURNAL_ENTRIES = pack.entries as LunarJournalEntry[];

const CARD_ORDER = ["exact", "times", "section", "bullets", "ritual", "intent", "callin", "prompt", "tarot", "bysign"];
const PROSE_TYPES = new Set(["para", "heading", "cycle", "notice"]);

export const LUNAR_JOURNAL_SIGN_GLYPHS: Record<string, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓"
};

export function lunarJournalSkyParagraphs(blocks: LunarJournalBlock[]) {
  return blocks
    .filter((block): block is Extract<LunarJournalBlock, { type: "para" }> => block.type === "para")
    .map((block) => block.text.trim())
    .filter(Boolean);
}

export function lunarJournalSkyBlurbs(blocks: LunarJournalBlock[], limit = 2) {
  return lunarJournalSkyParagraphs(blocks).slice(0, limit);
}

export function lunarJournalSkyPrompt(blocks: LunarJournalBlock[]) {
  const prompt = blocks.find((block) => block.type === "prompt");
  return prompt && "text" in prompt && prompt.text ? prompt.text.trim() : "";
}

export function flattenLunarJournalBody(blocks: LunarJournalBlock[]) {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "para" || block.type === "heading" || block.type === "exact") {
      if (block.text) parts.push(block.text);
      continue;
    }
    if (block.type === "intent" || block.type === "prompt" || block.type === "tarot") {
      const text = [block.label, block.text].filter(Boolean).join("\n\n");
      if (text) parts.push(text);
      continue;
    }
    if (block.type === "section" || block.type === "cycle" || block.type === "notice") {
      const text = [block.title, block.text].filter(Boolean).join("\n\n");
      if (text) parts.push(text);
      continue;
    }
    if (block.type === "bullets" || block.type === "callin") {
      const items = block.type === "bullets" ? block.items : block.items;
      const text = [block.type === "bullets" ? block.title : block.label, ...items].filter(Boolean).join("\n");
      if (text) parts.push(text);
      continue;
    }
    if (block.type === "ritual") {
      const text = [block.label, ...block.steps, ...(block.notes ?? [])].filter(Boolean).join("\n");
      if (text) parts.push(text);
      continue;
    }
    if (block.type === "times") {
      const text = block.items.map((item) => [item.city, item.time].filter(Boolean).join(": ")).filter(Boolean).join("\n");
      if (text) parts.push(text);
      continue;
    }
    if (block.type === "bysign") {
      const text = [
        block.title,
        ...block.items.map((item) => `${item.sign}${item.house ? ` · ${item.house}` : ""}: ${item.text}`)
      ].filter(Boolean).join("\n");
      if (text) parts.push(text);
    }
  }
  return parts.join("\n\n").trim();
}

export function matchLunarJournalEntry(event: LunarCalendarEvent) {
  const hit = matchLunarJournalIndex(event);
  if (!hit?.contentKey) return null;
  return LUNAR_JOURNAL_ENTRIES.find((entry) => entry.contentKey === hit.contentKey) ?? null;
}

export function reorderLunarJournalBlocks(blocks: LunarJournalBlock[]) {
  const prose = blocks.filter((block) => PROSE_TYPES.has(block.type));
  const cards = blocks.filter((block) => !PROSE_TYPES.has(block.type)).sort((left, right) => (
    CARD_ORDER.indexOf(left.type) - CARD_ORDER.indexOf(right.type)
  ));
  const witness = cards.findIndex((block) => {
    if (!("title" in block) && !("label" in block)) return false;
    return /witness/i.test(`${"title" in block ? block.title ?? "" : ""}${"label" in block ? block.label ?? "" : ""}`);
  });
  if (witness >= 0) {
    const [card] = cards.splice(witness, 1);
    if (card) cards.unshift(card);
  }
  return [...prose, ...cards];
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function blocksFromUnknown(value: unknown): LunarJournalBlock[] | null {
  return Array.isArray(value) && value.every((block) => block && typeof block === "object" && typeof (block as { type?: unknown }).type === "string")
    ? value as LunarJournalBlock[]
    : null;
}

function liveJournalBlocks(content: LiveGeneratedContent) {
  const sections = objectRecord(content.sections);
  const lunarJournal = objectRecord(sections?.lunarJournal);
  const fromSection = blocksFromUnknown(lunarJournal?.blocks);
  if (fromSection?.length) return fromSection;
  const packageRecord = objectRecord(sections?.packageRecord);
  const fromPackage = blocksFromUnknown(packageRecord?.blocks) ?? blocksFromUnknown(objectRecord(packageRecord?.lunarJournal)?.blocks);
  if (fromPackage?.length) return fromPackage;
  const body = content.body.trim();
  if (!body) return null;
  return body.split(/\n\n/u).map((text) => ({ type: "para" as const, text }));
}

export type ResolvedLunarJournal = {
  entry: LunarJournalEntry;
  contentKey: string;
  headline: string;
  blocks: LunarJournalBlock[];
  source: "live" | "package";
};

export function resolveLunarJournal(
  event: LunarCalendarEvent,
  generatedContent?: Map<string, LiveGeneratedContent> | null
): ResolvedLunarJournal | null {
  const entry = matchLunarJournalEntry(event);
  if (!entry) return null;
  const live = generatedContent?.get(entry.contentKey);
  const liveBlocks = live ? liveJournalBlocks(live) : null;
  if (live && liveBlocks?.length) {
    return {
      entry,
      contentKey: live.contentKey,
      headline: live.headline?.trim() || entry.title,
      blocks: reorderLunarJournalBlocks(liveBlocks),
      source: "live"
    };
  }
  return {
    entry,
    contentKey: entry.contentKey,
    headline: entry.title,
    blocks: reorderLunarJournalBlocks(entry.blocks),
    source: "package"
  };
}
