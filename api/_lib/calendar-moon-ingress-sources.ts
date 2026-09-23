import { createHash } from "node:crypto";
import { moonSignTransitionKey, moonSignTransitions } from "../../apps/web/src/features/calendar/moonSignTransitions.js";

export const CALENDAR_MOON_INGRESS_PREFIX = "authored/calendar-moon-transition/";

export function isCalendarMoonIngressContentKey(key: string) {
  return calendarMoonIngressPackageRecordByKey.has(key);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

export function calendarMoonIngressPackageRecord(fromSign: string, toSign: string, body: string) {
  const contentKey = moonSignTransitionKey(fromSign, toSign);
  const title = `Moon enters ${toSign[0].toUpperCase()}${toSign.slice(1)}`;
  return {
    contentKey,
    content_role: "full_copy",
    surface: "sky",
    headline: title,
    body,
    review_status: "needs_review",
    owner_approved: false,
    serving_enabled: false,
    source_package: "tldrastro-calendar-lunar-ingresses",
    source_keys: [contentKey],
    fromSign,
    toSign,
    notes: "Complete existing Moon ingress passage. Draft edits stay unpublished until Save & publish. Calendar uses the original passage until a published replacement exists.",
    calendarWritingSource: {
      contentKey,
      title,
      bodySha256: sha256(body),
      wordCount: wordCount(body),
      originalBody: body
    }
  };
}

export const calendarMoonIngressPackageRecords = Object.entries(moonSignTransitions).map(([pair, body]) => {
  const [fromSign, toSign] = pair.split("-");
  return calendarMoonIngressPackageRecord(fromSign, toSign, body);
});

const calendarMoonIngressPackageRecordByKey = new Map(
  calendarMoonIngressPackageRecords.map((record) => [record.contentKey, record])
);

export function calendarMoonIngressPackageRecordForKey(key: string) {
  return calendarMoonIngressPackageRecordByKey.get(key) ?? null;
}

function packageStarterBase(record: ReturnType<typeof calendarMoonIngressPackageRecord>) {
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

export function calendarMoonIngressInventoryRow(record: ReturnType<typeof calendarMoonIngressPackageRecord>) {
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

export function calendarMoonIngressDetailRow(record: ReturnType<typeof calendarMoonIngressPackageRecord>) {
  return {
    ...packageStarterBase(record),
    summary: "",
    body: record.body,
    sections: { packageRecord: record },
    facts: { fallbackArchitectureV3: true },
    source_snapshot: {
      sourcePackage: record.source_package,
      content_role: record.content_role,
      review_status: record.review_status
    },
    inventory_only: false
  };
}
