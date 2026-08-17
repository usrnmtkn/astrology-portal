#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { sampleLiveSkyComposedCards } from "./sample-live-sky-composed-cards.mjs";
import {
  SKY_CALENDAR_COMPOSER_SOURCE_FILES,
  SKY_CALENDAR_COMPOSER_VERSION,
  composerSourceSha256,
  loadSkyCalendarServingAuthorization,
} from "./sky-calendar-serving-authorization.mjs";
import {
  auditSkyCalendarTwoPartCards,
  composeSkyCalendarTwoPartCard,
  loadSkyCalendarComponentRegistry,
} from "./sky-calendar-two-part-composer.mjs";

const root = process.cwd();
const registry = loadSkyCalendarComponentRegistry();
const authorization = loadSkyCalendarServingAuthorization();
const plans = JSON.parse(fs.readFileSync(path.join(
  root,
  "packages/astro-knowledge/review/sky-calendar-two-part-composer-v2/worked-card-plans.json",
), "utf8"));

assert.equal(authorization.servingAuthorization, false);
assert.equal(authorization.pilot.required, true);
assert.equal(authorization.pilot.cardCount, 8);
assert.equal(authorization.pilot.ownerConfirmed, false);
assert.equal(authorization.composerVersion, SKY_CALENDAR_COMPOSER_VERSION);
assert.equal(authorization.composerSourceSha256, composerSourceSha256(root));
assert.deepEqual(authorization.composerSourceFiles, SKY_CALENDAR_COMPOSER_SOURCE_FILES);
assert.equal(
  authorization.componentSetSha256,
  "aee970d7c40d1331eaf981886ec5007ea5e99eb3e18c18ed1889cbe470e8a443",
);

assert.throws(
  () => composeSkyCalendarTwoPartCard(registry, plans.cards[0], {
    servingMode: true,
    servingAuthorization: authorization,
    repoRoot: root,
  }),
  (error) => error.code === "sky-calendar-serving-authorization-inactive",
  "Serving must remain inactive until the owner confirms the eight-card pilot",
);

const activeFixture = structuredClone(authorization);
activeFixture.servingAuthorization = true;
activeFixture.pilot.ownerConfirmed = true;
activeFixture.pilot.ownerConfirmationStatementSource = { tool: "test-fixture", date: "2026-08-16" };

const liveCard = composeSkyCalendarTwoPartCard(registry, plans.cards[0], {
  servingMode: true,
  servingAuthorization: activeFixture,
  repoRoot: root,
});
assert.equal(liveCard.status, "COMPOSER AUTHORIZED");
assert.equal(liveCard.generationAllowed, true);
assert.equal(liveCard.servingAuthorization.composerVersion, SKY_CALENDAR_COMPOSER_VERSION);
assert.equal(auditSkyCalendarTwoPartCards([liveCard]).servingEligible, true);

const wrongVersion = structuredClone(activeFixture);
wrongVersion.composerVersion = "sky-calendar-two-part-composer-v2.0.0";
assert.throws(
  () => composeSkyCalendarTwoPartCard(registry, plans.cards[0], {
    servingMode: true,
    servingAuthorization: wrongVersion,
    repoRoot: root,
  }),
  (error) => error.code === "sky-calendar-composer-version-mismatch",
);

const wrongComposerHash = structuredClone(activeFixture);
wrongComposerHash.composerSourceSha256 = "0".repeat(64);
assert.throws(
  () => composeSkyCalendarTwoPartCard(registry, plans.cards[0], {
    servingMode: true,
    servingAuthorization: wrongComposerHash,
    repoRoot: root,
  }),
  (error) => error.code === "sky-calendar-composer-hash-mismatch",
);

const wrongComponentHash = structuredClone(activeFixture);
wrongComponentHash.componentSetSha256 = "f".repeat(64);
assert.throws(
  () => composeSkyCalendarTwoPartCard(registry, plans.cards[0], {
    servingMode: true,
    servingAuthorization: wrongComponentHash,
    repoRoot: root,
  }),
  (error) => error.code === "sky-calendar-component-set-hash-mismatch",
);

const sample = sampleLiveSkyComposedCards({
  cards: [liveCard],
  registry,
  authorization: activeFixture,
  count: 1,
  seed: "standing-audit-regression",
  repoRoot: root,
  sampledAt: "2026-08-16T00:00:00.000Z",
});
assert.equal(sample.cards.length, 1);
assert.equal(sample.cards[0].contentKey, liveCard.contentKey);
assert.ok(Object.keys(sample.cards[0].componentInputs).length >= 3);
assert.equal(sample.cards[0].componentInputs.placementA.payloadSha256.length, 64);

console.log("Sky Calendar serving authorization: PASS (inactive until pilot; version, composer hash, and component hash fail closed)");
