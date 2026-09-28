import { createHash } from "node:crypto";
import { calendarTransitionPhrases } from "../../apps/admin/src/calendarTransitionPhraseCatalog.js";
import { calendarMoonIngressInventoryRow, calendarMoonIngressDetailRow } from "./calendar-moon-ingress-sources.js";

export const calendarTransitionPhraseRecords = calendarTransitionPhrases.map(field => ({
  contentKey: field.key,
  content_role: "full_copy",
  surface: "sky",
  headline: field.label,
  body: field.body,
  review_status: "needs_review",
  owner_approved: false,
  serving_enabled: false,
  source_package: "tldrastro-calendar-transition-phrases",
  source_keys: [field.key],
  notes: field.when,
  calendarWritingSource: {
    contentKey: field.key,
    title: field.label,
    bodySha256: createHash("sha256").update(field.body).digest("hex"),
    wordCount: field.body.trim().split(/\s+/u).length,
    originalBody: field.body,
  },
}));
const byKey = new Map(calendarTransitionPhraseRecords.map(record => [record.contentKey, record]));
export const calendarTransitionPhraseRecordForKey = (key: string) => byKey.get(key) ?? null;
export const calendarTransitionPhraseInventoryRow = calendarMoonIngressInventoryRow;
export const calendarTransitionPhraseDetailRow = calendarMoonIngressDetailRow;
