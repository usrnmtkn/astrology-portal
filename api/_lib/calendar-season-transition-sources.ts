import { createHash } from "node:crypto";
import {
  calendarSeasonTransitionKey,
  calendarSeasonTransitionTitle,
  calendarSeasonTransitions,
  calendarSeasonTransitionVariantCount
} from "../../apps/web/src/features/calendar/calendarSeasonTransitions.js";

export const CALENDAR_SEASON_TRANSITION_PREFIX = "authored/calendar-season-transition/";

export function isCalendarSeasonTransitionContentKey(key: string) {
  return key.startsWith(CALENDAR_SEASON_TRANSITION_PREFIX);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

export function calendarSeasonTransitionPackageRecord(fromSign: string, toSign: string, variant: number, body: string) {
  const contentKey = calendarSeasonTransitionKey(fromSign, toSign, variant);
  const title = calendarSeasonTransitionTitle(fromSign, toSign, variant);
  return {
    contentKey,
    content_role: "full_copy",
    surface: "sky",
    headline: title,
    body,
    review_status: "needs_review",
    owner_approved: false,
    serving_enabled: false,
    source_package: "tldrastro-calendar-season-transitions",
    source_keys: [contentKey],
    fromSign,
    toSign,
    variant,
    notes: "Owner leftover season-transition passage. Studio drafts stay unpublished until Sign Off. Calendar leftover uses this packaged source until a LIVE row exists.",
    calendarWritingSource: {
      contentKey,
      title,
      bodySha256: sha256(body),
      wordCount: wordCount(body),
      originalBody: body
    }
  };
}

export const calendarSeasonTransitionPackageRecords = Object.entries(calendarSeasonTransitions).flatMap(([pair, pool]) => {
  const [fromSign = "", toSign = ""] = pair.split("-");
  return pool.slice(0, calendarSeasonTransitionVariantCount).map((body, index) => (
    calendarSeasonTransitionPackageRecord(fromSign, toSign, index + 1, body)
  ));
});

const calendarSeasonTransitionPackageRecordByKey = new Map(
  calendarSeasonTransitionPackageRecords.map((record) => [record.contentKey, record])
);

export function calendarSeasonTransitionPackageRecordForKey(key: string) {
  return calendarSeasonTransitionPackageRecordByKey.get(key) ?? null;
}

function packageStarterBase(record: ReturnType<typeof calendarSeasonTransitionPackageRecord>) {
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

export function calendarSeasonTransitionInventoryRow(record: ReturnType<typeof calendarSeasonTransitionPackageRecord>) {
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

export function calendarSeasonTransitionDetailRow(record: ReturnType<typeof calendarSeasonTransitionPackageRecord>) {
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
