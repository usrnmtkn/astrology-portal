import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pack = require("../../apps/web/src/features/calendar/data/lunar-journal.entries.json") as {
  entries: Array<{
    contentKey: string;
    start: string;
    end: string;
    type: string;
    sign: string;
    title: string;
    blocks: Array<Record<string, unknown> & { type: string }>;
  }>;
};

export const LUNAR_JOURNAL_PREFIX = "authored/lunar-journal/";

export function isLunarJournalContentKey(key: string) {
  return key.startsWith(LUNAR_JOURNAL_PREFIX);
}

function flattenLunarJournalBody(blocks: Array<Record<string, unknown> & { type: string }>) {
  const parts: string[] = [];
  for (const block of blocks) {
    const text = typeof block.text === "string" ? block.text : "";
    const title = typeof block.title === "string" ? block.title : "";
    const label = typeof block.label === "string" ? block.label : "";
    const items = Array.isArray(block.items) ? block.items : [];
    const steps = Array.isArray(block.steps) ? block.steps : [];
    const notes = Array.isArray(block.notes) ? block.notes : [];
    if (block.type === "para" || block.type === "heading" || block.type === "exact") {
      if (text) parts.push(text);
      continue;
    }
    if (block.type === "intent" || block.type === "prompt" || block.type === "tarot") {
      const value = [label, text].filter(Boolean).join("\n\n");
      if (value) parts.push(value);
      continue;
    }
    if (block.type === "section" || block.type === "cycle" || block.type === "notice") {
      const value = [title, text].filter(Boolean).join("\n\n");
      if (value) parts.push(value);
      continue;
    }
    if (block.type === "bullets" || block.type === "callin") {
      const value = [block.type === "bullets" ? title : label, ...items.filter((item) => typeof item === "string")].join("\n");
      if (value.trim()) parts.push(value);
      continue;
    }
    if (block.type === "ritual") {
      const value = [label, ...steps, ...notes].filter((item) => typeof item === "string" && item).join("\n");
      if (value) parts.push(value);
      continue;
    }
    if (block.type === "times") {
      const value = items.map((item) => {
        if (!item || typeof item !== "object") return "";
        const row = item as { city?: string; time?: string };
        return [row.city, row.time].filter(Boolean).join(": ");
      }).filter(Boolean).join("\n");
      if (value) parts.push(value);
      continue;
    }
    if (block.type === "bysign") {
      const value = [
        title,
        ...items.map((item) => {
          if (!item || typeof item !== "object") return "";
          const row = item as { sign?: string; house?: string; text?: string };
          return `${row.sign ?? ""}${row.house ? ` · ${row.house}` : ""}: ${row.text ?? ""}`;
        })
      ].filter(Boolean).join("\n");
      if (value.trim()) parts.push(value);
    }
  }
  return parts.join("\n\n").trim();
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

export function lunarJournalPackageRecord(entry: (typeof pack.entries)[number]) {
  const body = flattenLunarJournalBody(entry.blocks);
  return {
    contentKey: entry.contentKey,
    content_role: "full_copy",
    surface: "sky",
    headline: entry.title,
    body,
    review_status: "needs_review",
    owner_approved: false,
    serving_enabled: false,
    source_package: "tldrastro-lunar-journal",
    source_keys: [entry.contentKey],
    start: entry.start,
    end: entry.end,
    type: entry.type,
    sign: entry.sign,
    title: entry.title,
    blocks: entry.blocks,
    lunarJournal: {
      start: entry.start,
      end: entry.end,
      type: entry.type,
      sign: entry.sign,
      title: entry.title,
      blocks: entry.blocks
    },
    notes: "Owner lunar journal. Studio drafts stay unpublished until Sign Off. Calendar reads this packaged source until a LIVE row exists.",
    calendarWritingSource: {
      contentKey: entry.contentKey,
      title: entry.title,
      bodySha256: sha256(body),
      blocksSha256: sha256(JSON.stringify(entry.blocks)),
      wordCount: wordCount(body),
      originalBody: body
    }
  };
}

export const lunarJournalPackageRecords = pack.entries.map(lunarJournalPackageRecord);

const lunarJournalPackageRecordByKey = new Map(lunarJournalPackageRecords.map((record) => [record.contentKey, record]));

export function lunarJournalPackageRecordForKey(key: string) {
  return lunarJournalPackageRecordByKey.get(key) ?? null;
}

function packageStarterBase(record: ReturnType<typeof lunarJournalPackageRecord>) {
  return {
    id: `package:${record.contentKey}`,
    content_key: record.contentKey,
    surface: record.surface,
    mode: "in_depth",
    status: "DRAFT",
    lane: "reference",
    review_state: "needs-review",
    provider: "tldrastro-fallback-architecture-v3",
    headline: record.headline,
    block_type: "fallback_hook",
    event_type: "fallback-hook",
    updated_at: null,
    package_starter: true
  };
}

export function lunarJournalInventoryRow(record: ReturnType<typeof lunarJournalPackageRecord>) {
  return {
    ...packageStarterBase(record),
    body: null,
    summary: null,
    sections: null,
    facts: null,
    source_snapshot: null,
    listing_facts: {
      packageRecord: {
        contentKey: record.contentKey,
        content_role: record.content_role,
        review_status: record.review_status,
        owner_approved: false,
        serving_enabled: false
      }
    },
    inventory_only: true
  };
}

export function lunarJournalDetailRow(record: ReturnType<typeof lunarJournalPackageRecord>) {
  return {
    ...packageStarterBase(record),
    summary: "",
    body: record.body,
    sections: {
      packageRecord: record,
      lunarJournal: record.lunarJournal
    },
    facts: { fallbackArchitectureV3: true },
    source_snapshot: {
      sourcePackage: record.source_package,
      content_role: record.content_role,
      review_status: record.review_status
    },
    inventory_only: false
  };
}
