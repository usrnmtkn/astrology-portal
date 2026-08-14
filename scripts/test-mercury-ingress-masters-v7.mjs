#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderSkyPlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/mercury-ingress-masters-v7");
const source = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json"),
  "utf8"
));
const readerBundle = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-owner-approved-reader-v1.json"),
  "utf8"
));
const ingestionAudit = JSON.parse(fs.readFileSync(path.join(reviewRoot, "ingestion-audit.json"), "utf8"));
const restoration = JSON.parse(fs.readFileSync(path.join(reviewRoot, "restoration-record.json"), "utf8"));
const targetPrefix = "fallback-hook/sky-sign-copy/mercury/";
const variantPrefix = "fallback-hook/sky-sign-copy-hook/mercury/";
const masterOnlyFields = [
  "primary_hook",
  "opening_heading",
  "tension_heading",
  "development_heading",
  "close_heading"
];
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const mercuryRows = source.rows
  .filter((row) => row.contentKey.startsWith(targetPrefix))
  .sort((first, second) => first.contentKey.localeCompare(second.contentKey));
assert.equal(mercuryRows.length, 12, "Exactly twelve restored Mercury placement rows must serve.");
assert.equal(
  sha256(JSON.stringify(mercuryRows)),
  restoration.restoredRowsSha256,
  "The restored owner-approved Mercury rows changed byte-wise."
);
assert.equal(
  source.rows.filter((row) => row.contentKey.startsWith(variantPrefix)).length,
  0,
  "Unapproved V7 alternative-hook variants must not remain in the serving source."
);
assert.ok(mercuryRows.every((row) => masterOnlyFields.every((field) => !Object.hasOwn(row, field))),
  "Unapproved V7 article-master fields must not remain on restored Mercury rows.");
assert.ok(mercuryRows.every((row) => !/\b(?:you|your|yours|yourself|yourselves)\b/iu.test([
  row.opening,
  row.tension,
  row.development,
  row.close
].join("\n"))), "Restored Current Sky Mercury rows must retain collective language.");

assert.equal(ingestionAudit.status, "superseded_owner_rejected_for_serving");
assert.equal(ingestionAudit.servingAuthority, false);
assert.equal(ingestionAudit.ownerApproved, false);
assert.equal(ingestionAudit.reviewStatus, "needs_review");

const readerKeys = new Set(readerBundle.rows.map((row) => row.contentKey));
assert.ok([...readerKeys].every((key) => !key.startsWith(variantPrefix)),
  "The reader bundle must not contain an unapproved V7 hook variant.");

const rendered = renderSkyPlacement({
  planet: "mercury",
  sign: "leo",
  entryDate: "August 9, 2026",
  exitDate: "August 25, 2026",
  priorSign: "Cancer",
  priorSignEntryDate: "July 13, 2026",
  priorSignExitDate: "August 9, 2026",
  events: []
});
assert.equal(rendered.tagline, null, "The unapproved V7 primary hook must not render as a tagline.");
assert.ok(rendered.articleSections.every((section) => section.heading === ""),
  "The unapproved V7 section headings must not render.");
assert.ok(rendered.body.includes("A flat response can feel like failure"),
  "Mercury in Leo must render the restored owner-approved tension.");
assert.ok(!rendered.body.includes("Leo changes Mercury’s delivery"),
  "Mercury in Leo must not render the rejected V7 payload.");

console.log("Mercury placement restoration gate passed: 12 prior owner-approved rows serve; V7 masters and variants do not.");
