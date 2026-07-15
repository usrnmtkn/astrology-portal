#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const bundleDir = path.join(repoRoot, "scripts/generated/.source-grounded-v2-test");
const bundleFile = path.join(bundleDir, "source-grounded-v2.bundle.mjs");

fs.mkdirSync(bundleDir, { recursive: true });
await build({
  bundle: true,
  entryPoints: [path.join(repoRoot, "apps/web/src/content/sourceGroundedV2.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

const {
  SOURCE_GROUNDED_V2_TEMPLATE_VERSION,
  resolveSourceGroundedV2,
  v2FixtureContractIds
} = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);

const mustacheModule = await import(`../apps/web/src/content/sourceGroundedMustacheV22.ts?t=${Date.now()}`);
const {
  MUSTACHE_MADLIB_TEMPLATES,
  MUSTACHE_MADLIBS_VERSION,
  renderMustacheMadlib,
  unresolvedMustacheTokens
} = mustacheModule;

const requiredFixtureIds = [
  "personalized-transit-saturn-square-venus-long",
  "personalized-transit-mars-conjunct-asc-short",
  "sky-sun-cancer-collective",
  "home-sun-cancer-gemini-rising",
  "home-moon-phase",
  "home-moon-sign-cancer",
  "natal-sun-aquarius-9h-day",
  "natal-night-sect-eligible",
  "natal-sect-suppressed-unknown-time",
  "personalized-transit-missing-pair"
];

const fixtureIds = new Set(v2FixtureContractIds());
for (const id of requiredFixtureIds) {
  assert.ok(fixtureIds.has(id), `v2 package fixture contract must include ${id}`);
}

assert.equal(MUSTACHE_MADLIBS_VERSION, "tldr-astro-content-runtime-correction-v2.3.0", "Mustache/Madlibs authority version");

function allTemplateSlots(template) {
  const slots = new Set();
  for (const match of template.matchAll(/\{\{[#/^]?([a-zA-Z0-9_.-]+)\}\}/g)) {
    if (match[1] !== ".") slots.add(match[1]);
  }
  return slots;
}

for (const [templateId, template] of Object.entries(MUSTACHE_MADLIB_TEMPLATES)) {
  const context = {};
  for (const slot of allTemplateSlots(template)) {
    const parts = slot.split(".");
    let target = context;
    while (parts.length > 1) {
      const part = parts.shift();
      if (!target[part] || typeof target[part] !== "object") {
        target[part] = {};
      }
      target = target[part];
    }
    if (!target[parts[0]] || typeof target[parts[0]] !== "object") {
      target[parts[0]] = /(^|\.)(has_|is_|diagnostic_mode)/.test(slot) ? true : slot;
    }
  }
  const rendered = renderMustacheMadlib(templateId, context);
  assert.ok(rendered.length > 0, `${templateId} must render non-empty output`);
  assert.deepEqual(unresolvedMustacheTokens(rendered), [], `${templateId} must resolve all Mustache tokens`);
}

const fixtures = [
  {
    id: "personalized-transit-saturn-square-venus-long",
    expectedStatus: "SOURCE_GAP",
    mode: "detail",
    result: resolveSourceGroundedV2("transits.personalized", {
      transitingPoint: "Saturn",
      aspect: "square",
      natalPoint: "Venus",
      activeWindow: "March 23 - November 1",
      orb: "0°",
      exactDate: "July 21, 2026",
      passNumber: "2 of 3",
      natalSign: "Capricorn",
      natalHouse: 8
    })
  },
  {
    id: "personalized-transit-saturn-square-venus-card",
    expectedStatus: "SOURCE_GAP",
    mode: "card",
    result: resolveSourceGroundedV2("transits.personalized", {
      transitingPoint: "Saturn",
      aspect: "square",
      natalPoint: "Venus",
      activeWindow: "March 23 - November 1",
      orb: "0°",
      natalSign: "Capricorn",
      natalHouse: 8
    }, "card")
  },
  {
    id: "personalized-transit-mars-conjunct-asc-short",
    expectedStatus: "SOURCE_GAP",
    mode: "detail",
    result: resolveSourceGroundedV2("transits.personalized", {
      transitingPoint: "Mars",
      aspect: "conjunction",
      natalPoint: "Ascendant",
      activeWindow: "July 12, 2026",
      orb: "0°",
      exactDate: "July 12, 2026"
    })
  },
  {
    id: "sky-sun-cancer-collective",
    expectedStatus: "SOURCE_GAP",
    mode: "detail",
    result: resolveSourceGroundedV2("sky.planet_sign", {
      currentBody: "Sun",
      currentSign: "Cancer",
      activeWindow: "Jun 21 - Jul 22"
    })
  },
  {
    id: "home-sun-cancer-gemini-rising",
    expectedStatus: "SOURCE_GAP",
    mode: "detail",
    result: resolveSourceGroundedV2("home.planetary_horoscope", {
      currentBody: "Sun",
      currentSign: "Cancer",
      risingSign: "Gemini",
      resolvedWholeSignHouse: 2,
      activeWindow: "Jun 21 - Jul 22"
    })
  },
  {
    id: "home-moon-phase",
    expectedStatus: "SOURCE_GAP",
    mode: "detail",
    result: resolveSourceGroundedV2("home.moon_forecast.phase", {
      moonPhase: "Balsamic Moon",
      timestamp: "2026-07-12T12:00:00.000Z"
    })
  },
  {
    id: "home-moon-sign-cancer",
    expectedStatus: "SOURCE_GAP",
    mode: "detail",
    result: resolveSourceGroundedV2("home.moon_forecast.sign", {
      moonSign: "Cancer",
      activeWindow: "Jul 12, 2026"
    })
  },
  {
    id: "natal-sun-aquarius-9h-day",
    expectedStatus: "SOURCE_GAP",
    mode: "detail",
    result: resolveSourceGroundedV2("me.natal_placement", {
      natalBody: "Sun",
      natalSign: "Aquarius",
      natalHouse: 9,
      degree: "29°25'",
      sect: "day",
      reliableBirthTime: true
    })
  },
  {
    id: "natal-night-sect-eligible",
    expectedStatus: "SOURCE_GAP",
    mode: "detail",
    result: resolveSourceGroundedV2("me.natal_placement", {
      natalBody: "Moon",
      natalSign: "Cancer",
      natalHouse: 4,
      sect: "night",
      reliableBirthTime: true
    })
  },
  {
    id: "natal-sect-suppressed-unknown-time",
    expectedStatus: "SOURCE_GAP",
    mode: "detail",
    result: resolveSourceGroundedV2("me.natal_placement", {
      natalBody: "Sun",
      natalSign: "Aquarius",
      natalHouse: 9,
      reliableBirthTime: false
    })
  },
  {
    id: "personalized-transit-missing-pair",
    expectedStatus: "SOURCE_GAP",
    mode: "detail",
    result: resolveSourceGroundedV2("transits.personalized", {
      transitingPoint: "Mars",
      aspect: "square",
      natalPoint: "Neptune",
      activeWindow: "July 12, 2026",
      orb: "1°"
    })
  }
];

const prohibited = [
  /moves through .* circumstances/i,
  /the planet names the topic/i,
  /the sign describes the condition/i,
  /this pattern is active now/i,
  /choose the next concrete response/i,
  /use it while it lasts/i,
  /sourceSnapshot/i,
  /templateVersion/i,
  /codex/i,
  /implementation prompt/i
];

function normalizedSentences(strings) {
  return strings
    .flatMap((value) => String(value).split(/(?<=[.!?])\s+/u))
    .map((sentence) => sentence.replace(/\s+/g, " ").trim().toLowerCase())
    .filter(Boolean);
}

for (const fixture of fixtures) {
  const { result } = fixture;
  assert.equal(result.status, fixture.expectedStatus, `${fixture.id} status`);
  assert.equal(result.templateVersion, SOURCE_GROUNDED_V2_TEMPLATE_VERSION, `${fixture.id} template version`);
  assert.equal(result.provenance.initial, result.provenance.hydrated, `${fixture.id} initial/hydrated parity`);
  assert.equal(result.provenance.initial, result.provenance.adminPreview, `${fixture.id} admin/reader parity`);
  assert.equal(result.runtimeTrace.templateVersion, "2.3.0", `${fixture.id} trace template version`);
  assert.deepEqual(result.runtimeTrace.legacyContributors, [], `${fixture.id} cannot use legacy contributors`);
  assert.equal(result.runtimeTrace.finalText, result.finalVisibleStrings.join("\n\n"), `${fixture.id} trace final text`);

  if (result.status === "SOURCE_GAP") {
    assert.ok(result.missing?.length, `${fixture.id} SOURCE_GAP must name missing source/facts`);
    assert.deepEqual(result.primarySourceKeys, [], `${fixture.id} SOURCE_GAP cannot claim a primary source`);
    assert.equal(result.sourceGap, true, `${fixture.id} must keep SOURCE_GAP provenance internally`);
    assert.equal(result.exactSourceStatus, "absent", `${fixture.id} exact source status`);
    assert.ok(["approved-fallback", "factual-floor", "omitted"].includes(result.readerAuthority), `${fixture.id} reader authority`);
    if (result.readerAuthority === "omitted") {
      assert.equal(result.fallbackId ?? null, null, `${fixture.id} omitted rows should not claim a fallback id`);
      assert.equal(result.fallbackSpecificity ?? null, null, `${fixture.id} omitted rows should not claim fallback specificity`);
    } else {
      assert.ok(result.fallbackId, `${fixture.id} must report a fallback id`);
      assert.ok(["exact-combination", "surface-family", "factual-floor"].includes(result.fallbackSpecificity), `${fixture.id} must report fallback specificity`);
    }
    assert.deepEqual(result.legacyContributors, [], `${fixture.id} must not use legacy contributors`);
    assert.equal(result.runtimeTrace.sourceGap, true, `${fixture.id} trace must keep SOURCE_GAP provenance`);
    assert.equal(result.runtimeTrace.readerAuthority, result.readerAuthority, `${fixture.id} trace reader authority`);
    assert.equal(result.runtimeTrace.fallbackId ?? null, result.fallbackId ?? null, `${fixture.id} trace fallback id`);
    assert.ok(!result.finalVisibleStrings.join("\n").includes("Interpretation unavailable."), `${fixture.id} reader fallback cannot show unavailable copy`);
    continue;
  }

  assert.equal(result.sourceTier, "RENDERED_OUTPUT", `${fixture.id} source tier`);
  assert.equal(result.readerAuthority, "reviewed-exact", `${fixture.id} reviewed content must outrank fallback`);
  assert.equal(result.sourceGap, false, `${fixture.id} reviewed exact output cannot be SOURCE_GAP`);
  assert.equal(result.exactSourceStatus, "present", `${fixture.id} exact source status`);
  assert.ok(result.primarySourceKeys.length > 0, `${fixture.id} must name primary source keys`);
  assert.ok(Object.keys(result.renderedFields).length > 0, `${fixture.id} must render fields`);

  for (const [field, text] of Object.entries(result.renderedFields)) {
    assert.ok(result.fieldMap[field], `${fixture.id}.${field} must map to exactly one component`);
    for (const pattern of prohibited) {
      assert.ok(!pattern.test(text), `${fixture.id}.${field} contains prohibited text ${pattern}`);
    }
  }

  const sentences = normalizedSentences(result.finalVisibleStrings);
  assert.equal(sentences.length, new Set(sentences).size, `${fixture.id} must not repeat normalized sentences`);

  if (result.mode === "card") {
    assert.ok(!("expandedNarrative" in result.renderedFields), `${fixture.id} card must not render expanded narrative`);
    assert.ok(!("astroFooter" in result.renderedFields), `${fixture.id} card must not render astro footer`);
  }

  const astroCount = result.finalVisibleStrings.join("\n").match(/The astro:/g)?.length ?? 0;
  if (result.surface === "transits.personalized" && result.mode === "detail") {
    assert.equal(astroCount, 1, `${fixture.id} transit detail must render one astro footer`);
  } else {
    assert.ok(astroCount <= 1, `${fixture.id} must not repeat astro footer`);
  }
}

const skySun = fixtures.find((fixture) => fixture.id === "sky-sun-cancer-collective").result;
const homeSun = fixtures.find((fixture) => fixture.id === "home-sun-cancer-gemini-rising").result;
assert.notEqual(skySun.templateId, homeSun.templateId, "Collective Sky and Home planetary horoscope must resolve to different templates.");
assert.notEqual(skySun.templateFamily, homeSun.templateFamily, "Collective Sky and Home planetary horoscope must resolve to different template families.");
assert.notEqual(skySun.fallbackId, homeSun.fallbackId, "Collective Sky fallback must not be reused for Home planetary horoscope.");
assert.ok(skySun.fallbackId.startsWith("fallback-hook/sky."), "Sky fallback id must be collective Sky-specific.");
assert.ok(homeSun.fallbackId.startsWith("fallback-hook/home."), "Home fallback id must be Home-specific.");

const moonPhase = fixtures.find((fixture) => fixture.id === "home-moon-phase").result;
const moonSign = fixtures.find((fixture) => fixture.id === "home-moon-sign-cancer").result;
assert.notEqual(moonPhase.templateId, moonSign.templateId, "Moon phase and Moon sign must resolve separately.");

const unknownTime = fixtures.find((fixture) => fixture.id === "natal-sect-suppressed-unknown-time").result;
assert.ok(!("sectClause" in unknownTime.renderedFields), "Unknown birth-time fixture must suppress sect copy.");

const saturnDetail = fixtures.find((fixture) => fixture.id === "personalized-transit-saturn-square-venus-long").result;
const saturnCard = fixtures.find((fixture) => fixture.id === "personalized-transit-saturn-square-venus-card").result;
assert.notEqual(saturnCard.templateId, saturnDetail.templateId, "Compact and expanded Saturn-Venus routes must resolve to separate contract modes even when source-gapped.");

const resolverSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/content/sourceGroundedV2.ts"), "utf8");
assert.match(resolverSource, /readerAuthority:\s*"reviewed-exact"/, "exact reviewed branch must be coded to outrank fallback.");
assert.match(resolverSource, /readerAuthority:\s*"approved-fallback"/, "fallback branch must be coded as approved fallback authority.");

const report = {
  generatedAt: new Date(0).toISOString(),
  templateVersion: SOURCE_GROUNDED_V2_TEMPLATE_VERSION,
  mustacheMadlibsVersion: MUSTACHE_MADLIBS_VERSION,
  mustacheTemplateCount: Object.keys(MUSTACHE_MADLIB_TEMPLATES).length,
  fixtureResults: fixtures.map((fixture) => ({
    id: fixture.id,
    expectedStatus: fixture.expectedStatus,
    status: fixture.result.status,
    surface: fixture.result.surface,
    templateFamily: fixture.result.templateFamily,
    templateId: fixture.result.templateId,
    templateVersion: fixture.result.templateVersion,
    sourceTier: fixture.result.sourceTier,
    primarySourceKeys: fixture.result.primarySourceKeys,
    supportingSourceKeys: fixture.result.supportingSourceKeys,
    calculatedFactKeys: fixture.result.calculatedFactKeys,
    missing: fixture.result.missing ?? [],
    facts: fixture.result.facts,
    fieldMap: fixture.result.fieldMap,
    renderedFields: fixture.result.renderedFields,
    finalVisibleStrings: fixture.result.finalVisibleStrings,
    exactSourceStatus: fixture.result.exactSourceStatus,
    sourceGap: fixture.result.sourceGap,
    readerAuthority: fixture.result.readerAuthority,
    fallbackSpecificity: fixture.result.fallbackSpecificity,
    fallbackId: fixture.result.fallbackId,
    legacyContributors: fixture.result.legacyContributors,
    provenance: fixture.result.provenance
  }))
};

const outputJson = path.join(repoRoot, "scripts/generated/source-grounded-v2-contract-fixtures.json");
const outputMd = path.join(repoRoot, "scripts/generated/source-grounded-v2-contract-fixtures.md");
fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(outputMd, [
  "# Source-Grounded V2 Contract Fixtures",
  "",
  `Template version: ${SOURCE_GROUNDED_V2_TEMPLATE_VERSION}`,
  `Mustache/Madlibs version: ${MUSTACHE_MADLIBS_VERSION}`,
  `Mustache templates: ${Object.keys(MUSTACHE_MADLIB_TEMPLATES).length}`,
  "",
  ...report.fixtureResults.flatMap((fixture) => [
    `## ${fixture.id}`,
    "",
    `- status: ${fixture.status}`,
    `- surface: ${fixture.surface}`,
    `- template: ${fixture.templateId}`,
    `- source tier: ${fixture.sourceTier}`,
    `- reader authority: ${fixture.readerAuthority}`,
    `- fallback: ${fixture.fallbackSpecificity ?? "none"} / ${fixture.fallbackId ?? "none"}`,
    `- primary sources: ${fixture.primarySourceKeys.join(", ") || "SOURCE_GAP"}`,
    `- supporting sources: ${fixture.supportingSourceKeys.join(", ") || "none"}`,
    `- missing: ${fixture.missing.join(", ") || "none"}`,
    `- provenance: ${fixture.provenance.initial} / ${fixture.provenance.hydrated} / ${fixture.provenance.adminPreview}`,
    "",
    "### Rendered fields",
    "",
    "```json",
    JSON.stringify(fixture.renderedFields, null, 2),
    "```",
    "",
    "### Final visible strings",
    "",
    ...fixture.finalVisibleStrings,
    ""
  ])
].join("\n"));

console.log(JSON.stringify({
  status: "PASS",
  fixtures: fixtures.length,
  mustacheTemplates: Object.keys(MUSTACHE_MADLIB_TEMPLATES).length,
  sourceGaps: fixtures.filter((fixture) => fixture.result.status === "SOURCE_GAP").length,
  outputJson,
  outputMd
}, null, 2));
