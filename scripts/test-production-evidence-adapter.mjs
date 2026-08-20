#!/usr/bin/env node

import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const adapter = require("../src/astro-writing/productionEvidenceAdapter.cjs");
const { deriveFromAxisPartner } = require("../src/astro-writing/axisDerivation.cjs");

const skyPoints = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron", "lilith", "north-node", "south-node"
];
const natalTargets = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "north-node", "chiron", "lilith",
  "ascendant", "midheaven"
];
const skyAspects = ["conjunction", "sextile", "square", "trine", "quincunx", "opposition"];
const transitAspects = ["conjunction", "sextile", "square", "trine", "opposition"];
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];

for (const sign of signs) {
  for (const legacyIdentifier of [
    `sky-placement-south-node-${sign}`,
    `sky-south-node-in-${sign}`
  ]) {
    const mapped = adapter.mapLegacyIdentifier(legacyIdentifier, {
      surface: "sky",
      evidenceSurface: "sky"
    });
    assert.deepEqual(mapped.canonicalIds, [`placement-sign/south_node/${sign}`]);
    assert.deepEqual(mapped.targetUsages, ["primary"]);
    assert.ok(mapped.canonicalIds.every((id) => !id.includes("/north_node/")));
    const built = adapter.buildProductionCatalogEvidence({
      contentKey: `sky.placement.base.south_node.${sign}`,
      surface: "sky",
      mode: "feed",
      eventType: "collective-placement-card",
      facts: { placement: { planet: "south-node", sign } },
      knowledgeIds: [legacyIdentifier]
    });
    assert.equal(built.packet.canonicalId, `placement-sign/south_node/${sign}`);
    assert.ok(built.packet.evidence.some((record) => (
      record.store.startsWith("matrix-v9") && record.field === "Copy"
    )), `${legacyIdentifier} did not receive real V9 South Node evidence`);
  }
}

for (const fixture of [
  "placement-sign/descendant/aries",
  "placement-sign/imum_coeli/cancer",
  "placement-sign/south_node/aries",
  "natal-aspect/descendant/mars/conjunction",
  "composite-aspect/imum_coeli/sun/trine"
]) {
  const derived = deriveFromAxisPartner(fixture);
  assert.ok(derived, `${fixture} should have an exact axis-geometry counterpart`);
  assert.equal(derived.semanticRelation, "opposite-pole");
  assert.equal(derived.targetUsage, "mechanism-reference");
  assert.equal(derived.framingAllowed, false);
}

let skyIdentifiers = 0;
for (const from of skyPoints) {
  for (const to of skyPoints) {
    if (from === to) continue;
    for (const aspect of skyAspects) {
      const mapped = adapter.mapLegacyIdentifier(`sky-${from}-${aspect}-${to}`, {
        surface: "sky",
        evidenceSurface: "sky"
      });
      assert.ok([1, 3].includes(mapped.canonicalIds.length));
      assert.equal(mapped.canonicalIds.length, mapped.targetUsages.length);
      assert.ok(mapped.targetUsages.every((usage) => usage === "mechanism-reference"));
      skyIdentifiers += 1;
    }
  }
}

assert.deepEqual(
  adapter.mapLegacyIdentifier("sky-sun-conjunction-chiron", {
    surface: "sky",
    evidenceSurface: "sky"
  }),
  {
    legacyIdentifier: "sky-sun-conjunction-chiron",
    canonicalIds: ["sky-aspect/chiron/sun/conjunction"],
    targetUsages: ["mechanism-reference"],
    mappingBasis: "current-sky-exact-object"
  }
);
assert.equal(
  adapter.mapLegacyIdentifier("sky-jupiter-opposition-moon", {
    surface: "sky",
    evidenceSurface: "sky"
  }).mappingBasis,
  "current-sky-ordered-body-aspect-body"
);

let transitIdentifiers = 0;
for (const transiting of skyPoints) {
  for (const natal of natalTargets) {
    for (const aspect of transitAspects) {
      const mapped = adapter.mapLegacyIdentifier(`transit-natal-${transiting}-${aspect}-${natal}`, {
        surface: "you",
        evidenceSurface: "you-transit"
      });
      assert.ok([1, 3].includes(mapped.canonicalIds.length));
      assert.equal(mapped.canonicalIds.length, mapped.targetUsages.length);
      transitIdentifiers += 1;
    }
  }
}

for (const legacyIdentifier of [
  "planetary-return-framework",
  "planetary-return-framework#retrograde-return-series",
  "saturn-return",
  "jupiter-return-cycle",
  "nodal-return-cycle"
]) {
  const mapped = adapter.mapLegacyIdentifier(legacyIdentifier, {
    surface: "you",
    evidenceSurface: "you-transit"
  });
  assert.equal(mapped.canonicalIds.length, 1);
  assert.deepEqual(mapped.targetUsages, ["mechanism-reference"]);
}

for (const legacyIdentifier of [
  "synastry-venus-in-4-house",
  "synastry-venus-in-house-4",
  "relationship-venus-in-house-4"
]) {
  const isRelationship = legacyIdentifier.startsWith("relationship-");
  const mapped = adapter.mapLegacyIdentifier(legacyIdentifier, {
    surface: isRelationship ? "relationship" : "synastry",
    evidenceSurface: "friends-synastry"
  });
  assert.deepEqual(mapped.canonicalIds, ["house-overlay/venus/4"]);
}

assert.deepEqual(
  adapter.mapLegacyIdentifier("natal-sun-in-house4", {
    surface: "you",
    evidenceSurface: "you-natal"
  }).canonicalIds,
  ["placement-house/sun/4"]
);
assert.deepEqual(
  adapter.mapLegacyIdentifier("sky-venus-in-taurus", {
    surface: "sky",
    evidenceSurface: "sky"
  }).canonicalIds,
  ["placement-sign/venus/taurus"]
);
assert.deepEqual(
  adapter.mapLegacyIdentifier("composite-sun-in-taurus", {
    surface: "composite",
    evidenceSurface: "friends-synastry"
  }).canonicalIds,
  ["composite-sign/sun/taurus"]
);
assert.throws(
  () => adapter.mapLegacyIdentifier("composite-venus-in-taurus", {
    surface: "composite",
    evidenceSurface: "friends-synastry"
  }),
  /PRODUCTION_EVIDENCE_CANONICAL_ID_MISSING/u
);

for (const legacyIdentifier of [
  "sky-not-a-body-in-taurus",
  "natal-not-a-body-in-house4",
  "synastry-not-a-body-in-house-4",
  "natal-not-a-body-square-sun"
]) {
  const isSky = legacyIdentifier.startsWith("sky-");
  const isSynastry = legacyIdentifier.startsWith("synastry-");
  assert.throws(
    () => adapter.mapLegacyIdentifier(legacyIdentifier, {
      surface: isSky ? "sky" : isSynastry ? "synastry" : "you",
      evidenceSurface: isSky ? "sky" : isSynastry ? "friends-synastry" : "you-natal"
    }),
    /PRODUCTION_EVIDENCE_IDENTIFIER_UNMAPPED/u
  );
}

const contentKeyFixtures = [
  {
    input: { contentKey: "sky-daily-2026-08-14", surface: "sky", eventType: "daily-sky", facts: { sun: { sign: "Leo" }, moon: { sign: "Pisces" } } },
    ruleId: "sky-daily"
  },
  {
    input: { contentKey: "sky-season-leo-2026-08-14", surface: "sky", eventType: "seasonal-current", facts: { sun: { sign: "Leo" } } },
    ruleId: "sky-season"
  },
  {
    input: { contentKey: "sky-moon-pisces-2026-08-14", surface: "sky", eventType: "lunar-cycle", facts: { moon: { sign: "Pisces" } } },
    ruleId: "sky-moon"
  },
  {
    input: { contentKey: "sky-aspect-jupiter-opposition-moon-2026-08-14", surface: "sky", eventType: "current-aspect", facts: { aspect: { from: "Jupiter", type: "opposition", to: "Moon" } } },
    ruleId: "sky-aspect"
  },
  {
    input: { contentKey: "sky-lunation-full-moon-aquarius-2026-08-14", surface: "sky", eventType: "full-moon", facts: { moonEvent: { name: "Full Moon", sign: "Aquarius" } } },
    ruleId: "sky-lunation"
  },
  {
    input: { contentKey: "sky-retrograde-mercury-2026-08-14", surface: "sky", eventType: "retrograde", facts: { position: { planet: "Mercury" } } },
    ruleId: "sky-retrograde"
  },
  {
    input: { contentKey: "you-transit-v3-saturn-square-sun-2026-08-14", surface: "you", eventType: "you-transit-to-natal", facts: {}, knowledgeIds: ["transit-natal-saturn-square-sun"] },
    ruleId: "you-transit-v3"
  }
];
for (const fixture of contentKeyFixtures) {
  const mapped = adapter.mapProductionInput(fixture.input);
  assert.equal(mapped.contentKeyMapping.ruleId, fixture.ruleId);
  assert.ok(mapped.contentKeyMapping.canonicalIds.length > 0);
}

assert.throws(
  () => adapter.mapLegacyIdentifier("legacy-made-up-factor", { surface: "sky", evidenceSurface: "sky" }),
  /PRODUCTION_EVIDENCE_IDENTIFIER_UNMAPPED/u
);
assert.throws(
  () => adapter.mapProductionInput({
    contentKey: "report:fixture:unit",
    surface: "year_ahead",
    mode: "report",
    eventType: "report_unit",
    facts: {}
  }),
  /PRODUCTION_EVIDENCE_SURFACE_UNMAPPED/u
);

assert.equal(adapter.buildProductionEvidenceShadow({ surface: "sky" }, {}), null);

const originalInfo = console.info;
const logs = [];
console.info = (...values) => logs.push(values.join(" "));
let skyShadow;
let reversedSkyShadow;
let transitShadow;
try {
  skyShadow = adapter.buildProductionEvidenceShadow({
    contentKey: "sky-daily-2026-08-14",
    surface: "sky",
    mode: "feed",
    eventType: "daily-sky",
    facts: { topAspects: [{ from: "Jupiter", type: "opposition", to: "Moon" }] },
    knowledgeIds: ["sky-jupiter-opposition-moon"]
  }, { WRITING_KERNEL_SHADOW_SURFACES: "sky" });
  reversedSkyShadow = adapter.buildProductionEvidenceShadow({
    contentKey: "sky-daily-2026-08-14",
    surface: "sky",
    mode: "feed",
    eventType: "daily-sky",
    facts: { topAspects: [{ from: "Moon", type: "opposition", to: "Jupiter" }] },
    knowledgeIds: ["sky-moon-opposition-jupiter"]
  }, { WRITING_KERNEL_SHADOW_SURFACES: "sky" });
  transitShadow = adapter.buildProductionEvidenceShadow({
    contentKey: "you-transit-v3-saturn-square-sun-2026-08-14",
    surface: "you",
    mode: "in_depth",
    eventType: "you-transit-to-natal",
    facts: { transit: { transitPlanet: "Saturn", aspect: "square", natalPoint: "Sun" } },
    knowledgeIds: ["transit-natal-saturn-square-sun", "saturn-return"]
  }, { WRITING_KERNEL_SHADOW_SURFACES: "you" });
  adapter.recordLegacyPromptShadow(skyShadow, "legacy prompt fixture");
} finally {
  console.info = originalInfo;
}

assert.equal(skyShadow.governedPromptUsed, false);
assert.equal(skyShadow.servingChanged, false);
assert.notEqual(skyShadow.packetSha256, reversedSkyShadow.packetSha256, "ordered target changes must change the packet hash");
assert.deepEqual(transitShadow.canonicalIds.slice(0, 1), ["transit-aspect/saturn/sun/square"]);
assert.ok(logs.every((line) => !line.includes("legacy prompt fixture")), "shadow logs must contain hashes, not prompt prose");
assert.ok(logs.some((line) => line.startsWith("WRITING_KERNEL_SHADOW ")));
assert.ok(logs.some((line) => line.startsWith("WRITING_KERNEL_SHADOW_PROMPT ")));

console.log(JSON.stringify({
  status: "pass",
  skyIdentifiersCovered: skyIdentifiers,
  transitIdentifiersCovered: transitIdentifiers,
  staticAliasesCovered: Object.keys(adapter.STATIC_LEGACY_IDENTIFIERS).length,
  contentKeyRulesCovered: contentKeyFixtures.length,
  shadowPromptUsesGovernedEvidence: false,
  unknownIdentifiersFailClosed: true,
  reportShadowFailsClosedUntilMapped: true
}, null, 2));
