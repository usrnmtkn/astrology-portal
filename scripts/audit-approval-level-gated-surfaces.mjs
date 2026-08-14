#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const transitRows = readJson(
  "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json"
).authoredCards;
const fallbackRows = readJson(
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
).hookRows;
const acceptedLevels = new Set(["exact_owner_approved", "owner_signoff_untraced"]);
const accepted = (row) => acceptedLevels.has(row.approval?.approvalLevel);
const preMigrationAccepted = (row) => row.approval?.approvalLevel === "exact_owner_approved";
const explicitOwnerEvidence = (row) => /owner/iu.test(String(row.approved_via ?? ""));

const personal = transitRows.filter((row) => /^authored\/transit-(?:aspect|return)\//u.test(row.contentKey));
const houseArticles = transitRows.filter((row) => row.contentKey.startsWith("authored/transit-house-sign/"));
const houseSupport = transitRows.filter((row) => (
  row.contentKey.startsWith("authored/transit-house-intro/")
  || row.contentKey.startsWith("authored/point-explainer/")
  || row.contentKey.startsWith("authored/transit-aspect-insert/")
));
const bondEffects = fallbackRows.filter((row) => row.contentKey.startsWith("fallback-hook/bond-effect-"));
const compatibility = transitRows.filter((row) => row.contentKey.startsWith("authored/compat-"));
const career = transitRows.filter((row) => row.contentKey.startsWith("authored/career-"));
const skyCalendar = transitRows.filter((row) => (
  /^authored\/(?:sky-|calendar-|station\/|week-opener\/|transit-event\/)/u.test(row.contentKey)
  || row.contentKey.startsWith("sky-article/")
));

const governedSurface = (id, rows, recommendation) => ({
  id,
  gatedToday: true,
  rowCount: rows.length,
  failedBeforePendingMigration: rows.filter((row) => !preMigrationAccepted(row)).length,
  failedAfterPendingMigration: rows.filter((row) => !accepted(row)).length,
  recommendation
});
const ungatedSurface = (id, rows, recommendation) => ({
  id,
  gatedToday: false,
  rowCount: rows.length,
  rowsThatWouldFailIfGateWereEnabledNow: rows.filter((row) => !accepted(row)).length,
  approvedStatusWithExplicitOwnerEvidence: rows.filter((row) => (
    row.review_status === "approved" && explicitOwnerEvidence(row)
  )).length,
  approvedReuseWithOwnerEvidence: rows.filter((row) => (
    row.review_status === "approved_reuse" && explicitOwnerEvidence(row)
  )).length,
  recommendation
});

const report = {
  schemaVersion: 1,
  recordedAt: "2026-08-14",
  acceptedLevels: [...acceptedLevels],
  gatedSurfaces: [
    governedSurface("friends-personal-transit-detail", personal, "migrate_now_pr_229"),
    governedSurface("friends-house-transit-detail", houseArticles, "migrate_now_pr_229"),
    governedSurface("friends-house-transit-detail-support", houseSupport, "migrate_now_pr_229"),
    governedSurface("friends-bond-transit-effect-body", bondEffects, "no_action_already_exact"),
    governedSurface("relationship-lazy-bundle-startup-assertion", bondEffects, "no_action_already_exact")
  ],
  currentlyUngatedSurfaces: [
    ungatedSurface("friends-compatibility", compatibility, "no_action_surface_does_not_gate"),
    ungatedSurface("career", career, "no_action_surface_does_not_gate"),
    ungatedSurface("sky-calendar-station-weekly", skyCalendar, "no_action_surface_does_not_gate")
  ]
};

assert.deepEqual(
  report.gatedSurfaces.map(({ id, rowCount, failedBeforePendingMigration, failedAfterPendingMigration }) => ({
    id, rowCount, failedBeforePendingMigration, failedAfterPendingMigration
  })),
  [
    { id: "friends-personal-transit-detail", rowCount: 385, failedBeforePendingMigration: 385, failedAfterPendingMigration: 0 },
    { id: "friends-house-transit-detail", rowCount: 1008, failedBeforePendingMigration: 996, failedAfterPendingMigration: 0 },
    { id: "friends-house-transit-detail-support", rowCount: 88, failedBeforePendingMigration: 76, failedAfterPendingMigration: 0 },
    { id: "friends-bond-transit-effect-body", rowCount: 139, failedBeforePendingMigration: 0, failedAfterPendingMigration: 0 },
    { id: "relationship-lazy-bundle-startup-assertion", rowCount: 139, failedBeforePendingMigration: 0, failedAfterPendingMigration: 0 }
  ],
  "approval-level gated surface exposure changed"
);
assert.deepEqual(
  report.currentlyUngatedSurfaces.map(({ id, rowCount, rowsThatWouldFailIfGateWereEnabledNow, approvedStatusWithExplicitOwnerEvidence, approvedReuseWithOwnerEvidence }) => ({
    id, rowCount, rowsThatWouldFailIfGateWereEnabledNow, approvedStatusWithExplicitOwnerEvidence, approvedReuseWithOwnerEvidence
  })),
  [
    { id: "friends-compatibility", rowCount: 1008, rowsThatWouldFailIfGateWereEnabledNow: 1008, approvedStatusWithExplicitOwnerEvidence: 679, approvedReuseWithOwnerEvidence: 0 },
    { id: "career", rowCount: 54, rowsThatWouldFailIfGateWereEnabledNow: 54, approvedStatusWithExplicitOwnerEvidence: 0, approvedReuseWithOwnerEvidence: 54 },
    { id: "sky-calendar-station-weekly", rowCount: 113, rowsThatWouldFailIfGateWereEnabledNow: 113, approvedStatusWithExplicitOwnerEvidence: 47, approvedReuseWithOwnerEvidence: 0 }
  ],
  "currently ungated surface exposure changed"
);

console.log(JSON.stringify(report, null, 2));
