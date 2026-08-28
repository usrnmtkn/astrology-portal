import assert from "node:assert/strict";
import {
  accountProfileBootstrapAction,
  profileBootstrapLocalOwnerIds,
  revealProfileAndScheduleEnhancements
} from "../apps/web/src/services/profileBootstrap.ts";

assert.equal(
  accountProfileBootstrapAction({
    accountId: "member-1",
    appliedAccountId: null,
    remoteProfileReady: false
  }),
  "start",
  "A new authenticated account must start profile bootstrap."
);

assert.deepEqual(
  profileBootstrapLocalOwnerIds({
    accountId: "account-id",
    cachedProfileId: "cached-id",
    persistedProfileId: "persisted-id",
    legacyOwnerIds: ["legacy-a", "legacy-b"]
  }),
  ["cached-id", "persisted-id", "account-id", "legacy-a", "legacy-b"],
  "Background migration must retain every current, persisted, account, and legacy chart owner id."
);
assert.deepEqual(
  profileBootstrapLocalOwnerIds({
    accountId: "account-id",
    cachedProfileId: "cached-id",
    legacyOwnerIds: ["legacy-a"]
  }),
  ["cached-id", undefined, "account-id", "legacy-a"],
  "Fallback profile hydration must still retain cached, account, and legacy chart owner ids."
);
assert.equal(
  accountProfileBootstrapAction({
    accountId: "member-1",
    appliedAccountId: "member-1",
    remoteProfileReady: false
  }),
  "reuse-pending",
  "A repeated auth notification must not duplicate an in-flight profile bootstrap."
);
assert.equal(
  accountProfileBootstrapAction({
    accountId: "member-1",
    appliedAccountId: "member-1",
    remoteProfileReady: true
  }),
  "reuse-ready",
  "A repeated auth notification may reuse an already hydrated profile."
);

const events = [];
const scheduledCallbacks = [];
let finishMigration;
let finishSocialProfile;
const migrationPending = new Promise((resolve) => {
  finishMigration = resolve;
});
const socialProfilePending = new Promise((resolve) => {
  finishSocialProfile = resolve;
});

const enhancementPromises = revealProfileAndScheduleEnhancements({
  isCancelled: () => false,
  revealProfile: () => events.push("profile-revealed"),
  scheduleAfterPaint: (callback) => scheduledCallbacks.push(callback),
  enhancements: [
    async () => {
      events.push("migration-started");
      await migrationPending;
      events.push("migration-finished");
    },
    async () => {
      events.push("social-profile-started");
      await socialProfilePending;
      events.push("social-profile-finished");
    }
  ]
});

assert.deepEqual(
  events,
  ["profile-revealed"],
  "The authenticated profile must be published before background enhancements start."
);
assert.equal(scheduledCallbacks.length, 1, "Background profile work must yield a browser paint once.");
assert.equal(enhancementPromises.length, 2, "Every background enhancement must expose a completion promise for tests and diagnostics.");

scheduledCallbacks[0]();
await Promise.resolve();
assert.deepEqual(
  events,
  ["profile-revealed", "migration-started", "social-profile-started"],
  "Migration and social-profile hydration must start together after the profile becomes visible."
);

finishSocialProfile();
finishMigration();
await Promise.all(enhancementPromises);
assert.deepEqual(events, [
  "profile-revealed",
  "migration-started",
  "social-profile-started",
  "social-profile-finished",
  "migration-finished"
]);

let cancelledWorkStarted = false;
const cancelledCallbacks = [];
revealProfileAndScheduleEnhancements({
  isCancelled: () => true,
  revealProfile: () => {
    throw new Error("A cancelled bootstrap must not reveal a profile.");
  },
  scheduleAfterPaint: (callback) => cancelledCallbacks.push(callback),
  enhancements: [async () => {
    cancelledWorkStarted = true;
  }]
});
assert.equal(cancelledCallbacks.length, 0);
assert.equal(cancelledWorkStarted, false);

console.log(JSON.stringify({
  status: "PASS",
  surface: "You profile bootstrap performance",
  contract: "One account bootstrap reveals the verified profile before migration and social hydration continue in parallel after paint."
}, null, 2));
