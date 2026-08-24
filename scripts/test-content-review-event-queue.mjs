#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import {
  contentReviewEventFingerprint,
  normalizeContentReviewEventRequest
} from "../api/_lib/content-review-events.ts";

const raw = {
  flags: [{
    id: "conditional-section-omitted",
    status: "needs_review",
    sectionId: "opening",
    omittedContentKey: "authored/lunation-eclipse-section/virgo/rising-aries/house-6/opening",
    fallbackContentKey: "authored/book-ritual-and-the-moon/lunation-horoscope/new-moon/virgo/rising-aries/house-6",
    reason: "missing-or-ineligible",
    prose: "must never cross the boundary"
  }],
  context: {
    surface: "you-daily",
    eventDate: "2026-09-11T03:27:00.000Z",
    eventKind: "eclipse-solar",
    sign: "virgo",
    risingSign: "aries",
    headline: "not persisted",
    timeZone: "America/New_York",
    userId: "not persisted",
    birthData: "not persisted"
  }
};

const normalized = normalizeContentReviewEventRequest(raw);
assert.deepEqual(Object.keys(normalized.context).sort(), ["eventDate", "eventKind", "risingSign", "sign", "surface"]);
assert.deepEqual(Object.keys(normalized.flags[0]).sort(), [
  "fallbackContentKey",
  "id",
  "omittedContentKey",
  "reason",
  "sectionId",
  "status"
]);
assert.equal(contentReviewEventFingerprint(normalized.flags[0], normalized.context).length, 64);
assert.equal(
  contentReviewEventFingerprint(normalized.flags[0], normalized.context),
  contentReviewEventFingerprint(normalized.flags[0], { ...normalized.context, eventDate: "2026-09-11T23:59:00.000Z" }),
  "One event/section/rising-sign combination should deduplicate within the local calendar date."
);
assert.throws(
  () => normalizeContentReviewEventRequest({ ...raw, context: { ...raw.context, surface: "friends" } }),
  /Unknown review-event surface/u
);
assert.throws(
  () => normalizeContentReviewEventRequest({ ...raw, flags: [{ ...raw.flags[0], status: "approved" }] }),
  /Only omitted conditional sections/u
);
assert.throws(
  () => normalizeContentReviewEventRequest({
    ...raw,
    flags: [{ ...raw.flags[0], omittedContentKey: "attacker-controlled/arbitrary-row" }]
  }),
  /Unknown omitted conditional section/u,
  "Authenticated clients must not be able to turn the admin queue into arbitrary storage."
);

const migration = fs.readFileSync("apps/web/supabase/migrations/20260824220000_content_runtime_review_events.sql", "utf8");
const migrationDdl = migration.replace(/^--.*$/gmu, "");
const userEndpoint = fs.readFileSync("api/content-review-events.ts", "utf8");
const adminEndpoint = fs.readFileSync("api/admin/content-review-events.ts", "utf8");
const reporter = fs.readFileSync("apps/web/src/services/conditionalSectionReviewReporter.ts", "utf8");
assert.match(migration, /enable row level security/u);
assert.match(migration, /revoke all on table public\.content_runtime_review_events from anon, authenticated/u);
assert.doesNotMatch(migrationDdl, /\buser_id\b|birth|longitude|latitude|timezone|prose/iu);
assert.match(userEndpoint, /\/auth\/v1\/user/u, "The write endpoint must authenticate the reader session.");
assert.match(adminEndpoint, /isContentAdminAuthorized/u, "The queue endpoint must remain admin-only.");
assert.match(reporter, /recordLiveOmittedSections\(flags, context\)/u, "Remote reporting must preserve the local fallback first.");

console.log("Shared omitted-section queue passed: authenticated writes are redacted, deduplicated, RLS-protected, and admin-only to read.");
