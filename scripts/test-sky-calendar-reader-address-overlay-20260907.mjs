#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const reviewDir = path.join(
  root,
  "packages/astro-knowledge/review/sky-calendar-collective-rewrite-2026-09-07",
);
const overlayPath = path.join(reviewDir, "reader-address-overlay.json");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const payloadFiles = fs
  .readdirSync(reviewDir)
  .filter((name) => /^candidate-payloads-\d{2}\.json$/.test(name))
  .sort();

if (payloadFiles.length !== 8) {
  fail(`expected 8 base payload files, found ${payloadFiles.length}`);
}

const baseEntries = new Map();
for (const fileName of payloadFiles) {
  const payload = readJson(path.join(reviewDir, fileName));
  for (const [key, value] of Object.entries(payload.entries ?? {})) {
    if (baseEntries.has(key)) {
      fail(`duplicate base key: ${key}`);
    }
    baseEntries.set(key, value);
  }
}

const overlay = readJson(overlayPath);
const overlayEntries = Object.entries(overlay.entries ?? {});

if (overlay.reviewStatus !== "needs_review") {
  fail(`overlay reviewStatus must remain needs_review, got ${overlay.reviewStatus}`);
}
if (overlay.directionApproved !== true) {
  fail("overlay directionApproved must be true");
}
if (overlay.ownerApproved !== false) {
  fail("overlay ownerApproved must remain false until exact-text review");
}
if (overlay.promotionAuthorized !== false) {
  fail("overlay promotionAuthorized must remain false");
}
if (overlay.selectionPolicy !== "editorial_not_quota") {
  fail(`unexpected selectionPolicy: ${overlay.selectionPolicy}`);
}
if (overlay.entryCount !== overlayEntries.length) {
  fail(`entryCount says ${overlay.entryCount}, found ${overlayEntries.length}`);
}
if (overlayEntries.length !== 40) {
  fail(`expected 40 selective reader-address entries, found ${overlayEntries.length}`);
}

const directSecondPerson = /\b(?:you|your|yours)\b/i;
const allowedReaderTurn = /\b(?:you may|you might|you can|if you|if this is showing up for you)\b/i;
const riskySentenceStart = /(?:^|[.!?]\s+)(?:You are|You have(?:\s+been)?|You know|You feel|Your\s+[A-Za-z'-]+\s+(?:is|are))\b/;

for (const [key, candidate] of overlayEntries) {
  const base = baseEntries.get(key);
  if (!base) {
    fail(`overlay key does not exist in base 379-row projection: ${key}`);
    continue;
  }

  const summary = candidate?.summary ?? "";
  const body = candidate?.body ?? "";

  if (summary !== base.summary) {
    fail(`${key}: overlay summary must match the collective base summary exactly`);
  }
  if (!body.startsWith(summary)) {
    fail(`${key}: body must begin with its summary`);
  }
  if (directSecondPerson.test(summary)) {
    fail(`${key}: summary must remain collective and cannot contain direct second person`);
  }
  if (!directSecondPerson.test(body)) {
    fail(`${key}: overlay body must contain a selective reader-address turn`);
  }
  if (!allowedReaderTurn.test(body)) {
    fail(`${key}: reader-address turn must be conditional or possibility-based`);
  }
  if (riskySentenceStart.test(body)) {
    fail(`${key}: contains a sentence-start direct personal assertion`);
  }
  if (body.includes("—")) {
    fail(`${key}: em dash is not allowed`);
  }
  if (/\bwhether\b/i.test(body)) {
    fail(`${key}: whether construction is not allowed`);
  }

  const secondPersonSentences = body
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => directSecondPerson.test(sentence));
  if (secondPersonSentences.length > 2) {
    fail(`${key}: reader address should remain selective rather than dominate the passage; found ${secondPersonSentences.length} reader-address sentences`);
  }
}

if (!process.exitCode) {
  console.log(
    `PASS: ${overlayEntries.length} selective reader-address overlays preserve collective summaries and conditional Calendar scope.`,
  );
}
