#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import {
  liveOmittedSectionsStorageKey,
  readLiveOmittedSectionQueue,
  recordLiveOmittedSections
} from "../apps/web/src/services/conditionalSectionReviewQueue.ts";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

const storage = new MemoryStorage();
const flag = {
  id: "conditional-section-omitted",
  status: "needs_review",
  sectionId: "ruler-condition",
  omittedContentKey: "lunation/ruler-condition/mars/retrograde",
  fallbackContentKey: null,
  reason: "missing-or-ineligible"
};
const context = {
  surface: "you-daily",
  headline: "Pisces Lunar Eclipse for Sagittarius Rising",
  eventDate: "2025-09-07T18:08:00.000Z",
  eventKind: "eclipse-lunar",
  sign: "pisces",
  risingSign: "sagittarius",
  timeZone: "America/New_York"
};

recordLiveOmittedSections([flag], context, {
  storage,
  now: new Date("2026-08-24T12:00:00.000Z")
});
recordLiveOmittedSections([flag], context, {
  storage,
  now: new Date("2026-08-24T13:00:00.000Z")
});

const [item] = readLiveOmittedSectionQueue(storage);
assert.ok(item, "Expected the omitted section to be recorded.");
assert.equal(item.occurrenceCount, 2, "Repeated renders must update one stable queue row.");
assert.equal(item.firstSeenAt, "2026-08-24T12:00:00.000Z");
assert.equal(item.lastSeenAt, "2026-08-24T13:00:00.000Z");
assert.equal(item.headline, context.headline);
assert.equal(item.omittedContentKey, flag.omittedContentKey);

recordLiveOmittedSections([flag], { ...context, surface: "weekly-horoscope" }, {
  storage,
  now: new Date("2026-08-24T14:00:00.000Z")
});
assert.equal(readLiveOmittedSectionQueue(storage).length, 2, "Daily and weekly occurrences remain distinguishable.");

const beforeInvalid = storage.getItem(liveOmittedSectionsStorageKey);
recordLiveOmittedSections([{ ...flag, status: "approved" }], context, { storage });
assert.equal(storage.getItem(liveOmittedSectionsStorageKey), beforeInvalid, "Non-review metadata must not enter the queue.");

const appSource = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const weeklySource = fs.readFileSync("apps/web/src/services/weeklyHoroscope.ts", "utf8");
const adminSource = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
assert.match(appSource, /reportLiveOmittedSections\(JSON\.parse\(dailyOmittedReviewFlagsJson\)/u);
assert.match(weeklySource, /surface: "weekly-horoscope"/u);
assert.match(adminSource, /Live with omitted sections/u);
assert.match(adminSource, /Horoscope stayed live/u);
assert.match(adminSource, /\/api\/admin\/content-review-events\?limit=250/u);
assert.doesNotMatch(adminSource, /clearLiveOmitted/u, "The requested queue must remain read-only.");

console.log("Live omitted-section review queue passed: flags persist, deduplicate, stay surface-specific, and appear read-only in Content Studio.");
