#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  baseKeyForContext,
  resolveDailyGlanceContextualOverride,
  validateDailyGlanceContextualOverrideReferences,
  validateDailyGlanceContextualOverrideRegistry
} = require("../packages/astro-knowledge/scripts/daily-glance-contextual-overrides.js");

const registry = JSON.parse(fs.readFileSync(new URL(
  "../packages/astro-knowledge/config/daily-glance-contextual-overrides-v1.json",
  import.meta.url
), "utf8"));

assert.deepEqual(
  validateDailyGlanceContextualOverrideRegistry(registry),
  { passed: true, errors: [], overrideCount: 0, servingEnabled: false }
);

const context = {
  kind: "aspect",
  transitPlanet: "moon",
  transitSign: "Virgo",
  transitHouse: 4,
  natalPoint: "North Node",
  natalSign: "Cancer",
  natalHouse: 11,
  aspect: "conjunction",
  aspectGroup: "conjunction",
  orb: 1.2,
  housesReliable: true
};
assert.equal(baseKeyForContext(context), "conjunction/north-node");

const approval = {
  status: "approved",
  ownerApproved: true,
  approvalSource: "owner approval fixture",
  exactWordingQuoted: true,
  renderEligible: true
};
const referenceRows = [
  {
    contentKey: "fallback-hook/daily-headline/contextual/conjunction/north-node/transit-house-4",
    content_role: "fallback_hook",
    review_status: "approved"
  },
  {
    contentKey: "fallback-hook/daily-body/contextual/conjunction/north-node/transit-house-4",
    content_role: "fallback_hook",
    review_status: "approved"
  },
  {
    contentKey: "fallback-hook/daily-headline/contextual/conjunction/north-node/transit-house-4-virgo",
    content_role: "fallback_hook",
    review_status: "approved"
  },
  {
    contentKey: "fallback-hook/daily-body/contextual/conjunction/north-node/transit-house-4-virgo",
    content_role: "fallback_hook",
    review_status: "approved"
  },
  {
    contentKey: "fallback-hook/daily-headline/contextual/conjunction/north-node/natal-house-11",
    content_role: "fallback_hook",
    review_status: "approved"
  },
  {
    contentKey: "fallback-hook/daily-body/contextual/conjunction/north-node/natal-house-11",
    content_role: "fallback_hook",
    review_status: "approved"
  },
  {
    contentKey: "fallback-hook/daily-headline/contextual/conjunction/north-node/two-house",
    content_role: "fallback_hook",
    review_status: "approved"
  },
  {
    contentKey: "fallback-hook/daily-body/contextual/conjunction/north-node/two-house",
    content_role: "fallback_hook",
    review_status: "approved"
  }
];

const synthetic = {
  schemaVersion: 1,
  policy: {
    referenceOnly: true,
    servingEnabled: true,
    precedence: [
      "two-house-intersection",
      "natal-house",
      "transit-house",
      "sign-specificity",
      "approved-base-card"
    ],
    eligibleStatuses: ["approved", "approved_reuse", "reviewed"]
  },
  overrides: [
    {
      overrideId: "daily-glance-context/conjunction-north-node/transit-house-4",
      baseKey: "conjunction/north-node",
      when: { transitHouse: 4 },
      headlineRef: referenceRows[0].contentKey,
      bodyRef: referenceRows[1].contentKey,
      approval
    },
    {
      overrideId: "daily-glance-context/conjunction-north-node/transit-house-4-virgo",
      baseKey: "conjunction/north-node",
      when: { transitHouse: 4, transitSign: "Virgo" },
      headlineRef: referenceRows[2].contentKey,
      bodyRef: referenceRows[3].contentKey,
      approval
    },
    {
      overrideId: "daily-glance-context/conjunction-north-node/natal-house-11",
      baseKey: "conjunction/north-node",
      when: { natalHouse: 11 },
      headlineRef: referenceRows[4].contentKey,
      bodyRef: referenceRows[5].contentKey,
      approval
    },
    {
      overrideId: "daily-glance-context/conjunction-north-node/two-house",
      baseKey: "conjunction/north-node",
      when: { transitHouse: 4, natalHouse: 11 },
      headlineRef: referenceRows[6].contentKey,
      bodyRef: referenceRows[7].contentKey,
      approval
    }
  ]
};

assert.equal(validateDailyGlanceContextualOverrideRegistry(synthetic).passed, true);
assert.equal(validateDailyGlanceContextualOverrideReferences(synthetic, referenceRows).passed, true);
assert.equal(
  resolveDailyGlanceContextualOverride(context, { registry: synthetic }).selected.overrideId,
  "daily-glance-context/conjunction-north-node/two-house",
  "An approved two-house intersection must outrank one-house and sign refinements."
);

const noNatalHouse = { ...context, natalHouse: null };
assert.equal(
  resolveDailyGlanceContextualOverride(noNatalHouse, { registry: synthetic }).selected.overrideId,
  "daily-glance-context/conjunction-north-node/transit-house-4-virgo",
  "Sign specificity must break ties inside the transit-house tier."
);

const unreliableHouses = {
  ...context,
  transitHouse: null,
  natalHouse: null,
  housesReliable: false
};
assert.deepEqual(
  resolveDailyGlanceContextualOverride(unreliableHouses, { registry: synthetic }),
  { baseKey: "conjunction/north-node", selected: null, fallback: "approved-base-card" },
  "House-derived overrides must disappear when birth-time houses are unreliable."
);

const disabled = structuredClone(synthetic);
disabled.policy.servingEnabled = false;
assert.equal(
  resolveDailyGlanceContextualOverride(context, { registry: disabled }).selected,
  null,
  "The registry-wide serving switch must keep every contextual row dark."
);
assert.equal(
  resolveDailyGlanceContextualOverride(context, { mode: "review", registry: disabled }).selected.overrideId,
  "daily-glance-context/conjunction-north-node/two-house",
  "Review mode may inspect a matching override without making it serving-eligible."
);

const embeddedCopy = structuredClone(synthetic);
embeddedCopy.overrides[0].body_you = "Inline prose must never live in the selector registry.";
assert.equal(validateDailyGlanceContextualOverrideRegistry(embeddedCopy).passed, false);

const duplicateSelector = structuredClone(synthetic);
duplicateSelector.overrides.push({
  ...structuredClone(duplicateSelector.overrides[0]),
  overrideId: "daily-glance-context/conjunction-north-node/transit-house-4-duplicate"
});
assert.equal(validateDailyGlanceContextualOverrideRegistry(duplicateSelector).passed, false);

const missingReference = validateDailyGlanceContextualOverrideReferences(
  synthetic,
  referenceRows.slice(1)
);
assert.equal(missingReference.passed, false);
assert.ok(missingReference.errors.some((error) => error.includes("references missing row")));

console.log("daily-glance contextual override reference, precedence, approval, and house-reliability checks passed");
