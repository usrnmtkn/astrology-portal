#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  SKY_CALENDAR_COMPOSER_VERSION,
  composerSourceSha256,
} from "./sky-calendar-serving-authorization.mjs";

const root = process.cwd();
const packageDir = "packages/astro-knowledge/review/sky-calendar-sign-aware-semantic-layer-v2";
const binding = JSON.parse(fs.readFileSync(path.join(root, packageDir, "semantic-layer-binding.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(root, binding.semanticAuthority.registryPath), "utf8"));
const authorization = JSON.parse(fs.readFileSync(path.join(root, binding.composerBinding.authorizationRecordPath), "utf8"));
const workbook = fs.readFileSync(path.join(root, binding.correctedWorkbook.path));

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(binding.status, "REVIEW ARTIFACT");
assert.equal(sha256(workbook), binding.correctedWorkbook.sha256, "Corrected workbook bytes changed without updating the governed binding");

assert.equal(registry.approval.componentSetSha256, binding.semanticAuthority.componentSetSha256);
assert.deepEqual(registry.counts, binding.semanticAuthority.counts);
assert.equal(registry.signUnits.length, 144);
assert.equal(registry.aspectMechanisms.length, 5);
assert.equal(registry.modalityUnits.length, 9);
assert.equal(registry.elementUnits.length, 16);
assert.equal(registry.signUnits.filter((unit) => unit.key.startsWith("sky-sign/chiron/")).length, 12);
assert.equal(registry.signUnits.every((unit) => unit.owner_review_status === "OWNER APPROVED"), true);

assert.equal(SKY_CALENDAR_COMPOSER_VERSION, binding.composerBinding.composerVersion);
assert.equal(composerSourceSha256(root), binding.composerBinding.composerSourceSha256);
assert.equal(authorization.composerVersion, binding.composerBinding.composerVersion);
assert.equal(authorization.composerSourceSha256, binding.composerBinding.composerSourceSha256);
assert.equal(authorization.componentSetSha256, binding.semanticAuthority.componentSetSha256);
assert.equal(authorization.servingAuthorization, false);
assert.equal(authorization.pilot.ownerConfirmed, false);
assert.equal(binding.composerBinding.failClosed, true);

assert.equal(binding.registerPolicy.surface, "sky_calendar_collective");
assert.equal(binding.registerPolicy.eventRemainsCollectiveAndTemporary, true);
assert.equal(binding.registerPolicy.directReaderAddress, "allowed_in_forecast_what_can_move_guidance");
assert.equal(binding.registerPolicy.secondPersonInDetails, false);
assert.equal(binding.registerPolicy.standingPatternLanguage, false);

assert.deepEqual(binding.supersededWorkbookLayers, [
  "Pair Meaning",
  "Aspect Behavior",
  "Planet Sign Layer",
  "Sign-Aware Composer",
]);
assert.equal(binding.scope.modelCalls, 0);
assert.equal(binding.scope.readerCopyChanged, false);
assert.equal(binding.scope.servingChanged, false);
assert.equal(binding.scope.componentWordingChanged, false);

console.log("Sky Calendar sign-aware semantic layer: PASS (174 governed components, workbook and composer hashes pinned, serving inactive)");
