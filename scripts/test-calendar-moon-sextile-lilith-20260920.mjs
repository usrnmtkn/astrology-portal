#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const review = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/review/sky-calendar-moon-sextile-lilith-2026-09-20/owner-authorization.json"), "utf8"));
const transit = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/data/transits/moon-sextile-lilith.json"), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

assert.equal(review.authority, "owner");
assert.equal(review.decision, "approve");
assert.equal(review.ownerStatement, "please replace the copy");
assert.equal(review.contentKey, "sky.aspect.moon.sextile.lilith");
assert.equal(review.payload.body, review.ownerExactCopy);
assert.equal(review.payload.body.startsWith(review.payload.summary), true);
assert.equal(sha256(review.payload.summary), review.summarySha256);
assert.equal(sha256(review.payload.body), review.bodySha256);
assert.equal(sha256(JSON.stringify(review.payload)), review.payloadSha256);
assert.equal(review.payload.body.includes("—"), false);
assert.equal(/[^\x00-\x7F]/u.test(review.payload.body), false);

assert.equal(transit.id, "moon-sextile-lilith");
assert.equal(transit.status, "LIVE");
assert.equal(transit.readerCopy.summary, review.payload.summary);
assert.equal(transit.readerCopy.body, review.payload.body);
assert.match(transit.readerCopy.approvedVia, /moon-sextile-lilith-owner-rewrite-2026-09-20/u);
assert.notEqual(transit.readerCopy.body, review.supersedes.body);
