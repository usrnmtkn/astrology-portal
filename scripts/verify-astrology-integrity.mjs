#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const fixturePath = path.join(repoRoot, "scripts/fixtures/astrology-integrity-fixtures.json");
const sourceRegistryPath = path.join(repoRoot, "scripts/fixtures/ephemeris-source-registry.json");
const fixturesConfig = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const sourceRegistry = JSON.parse(fs.readFileSync(sourceRegistryPath, "utf8"));
const allowMissingProvider = process.argv.includes("--allow-missing-provider");
const allowReferenceGaps = process.argv.includes("--allow-reference-gaps");
const summaryOnly = process.argv.includes("--summary");
const providerCommand = process.env.TLDR_ASTRO_VERIFY_PROVIDER_COMMAND;
const reportPath = process.env.TLDR_ASTRO_VERIFY_REPORT_PATH;
const summaryPath = process.env.TLDR_ASTRO_VERIFY_SUMMARY_PATH;

function datePart(value) {
  return String(value ?? "").slice(0, 10);
}

function byId(facts, kind, id) {
  return facts.find((fact) => fact.kind === kind && fact.planetOrPointId === id);
}

function numberDiff(first, second) {
  return Math.abs(Number(first) - Number(second));
}

function circularDiff(first, second) {
  const raw = Math.abs((((Number(first) - Number(second)) % 360) + 360) % 360);
  return raw > 180 ? 360 - raw : raw;
}

function runExternalProvider(fixture) {
  if (!providerCommand) {
    return null;
  }

  const result = spawnSync(providerCommand, {
    input: JSON.stringify(fixture),
    shell: true,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.status !== 0) {
    throw new Error(`Independent provider failed for ${fixture.id}: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function categoryForFact(fact) {
  if (fact.kind === "position") {
    if (fact.targetType === "node") return "nodes";
    if (fact.targetType === "other-point") return "other-points";
    return fact.planetOrPointId === "moon" ? "moon" : "planets";
  }

  if (fact.kind === "angle") return "angles";
  if (fact.kind === "house-cusp") return "cusps";
  if (fact.kind === "aspect") return "aspects";
  if (fact.kind === "event") return "events";
  return "unknown";
}

function capabilityForFact(fact, capabilities = {}) {
  const pointSupported = (pointId, targetType) => {
    if (targetType === "node" || pointId === "north_node") return Boolean(capabilities.nodes);
    if (targetType === "other-point") return pointId === "chiron" ? Boolean(capabilities.chiron) : Boolean(capabilities.otherPoints);
    if (pointId === "moon") return Boolean(capabilities.moon);
    return Boolean(capabilities.planetaryLongitudes);
  };

  if (fact.kind === "position") {
    return pointSupported(fact.planetOrPointId, fact.targetType);
  }

  if (fact.kind === "angle") return Boolean(capabilities.angles);
  if (fact.kind === "house-cusp") return Boolean(capabilities.houseCusps);
  if (fact.kind === "aspect") {
    return Boolean(capabilities.aspectsFromSupportedBodies)
      && pointSupported(fact.planetOrPointId, undefined)
      && pointSupported(fact.targetId, fact.targetType);
  }
  if (fact.kind === "event") return Boolean(capabilities.exactHits);
  return false;
}

function classifyDiscrepancy(field) {
  if (field === "normalizedSign" || field === "normalizedDegree") return "normalization-related";
  if (field === "timeZone" || field === "calculatedAt" || field === "exactDate") return "timezone-related";
  if (field === "house" || field === "houseSystem") return "display-related";
  return "astronomical";
}

function discrepancy(fixture, fact, field, primary, reference, tolerance = null) {
  return {
    fixtureId: fixture.id,
    factId: fact.id,
    category: categoryForFact(fact),
    field,
    primary,
    reference,
    tolerance,
    classification: classifyDiscrepancy(field)
  };
}

function compareReferenceFacts(fixture, primaryFacts, referenceFacts, tolerances) {
  const discrepancies = [];
  const gaps = [];
  const verified = {
    planets: 0,
    moon: 0,
    nodes: 0,
    angles: 0,
    cusps: 0,
    aspects: 0,
    events: 0,
    "other-points": 0
  };
  const capabilities = fixture.referenceCapabilities ?? {};

  for (const primary of primaryFacts) {
    if (!capabilityForFact(primary, capabilities)) {
      gaps.push({
        fixtureId: fixture.id,
        factId: primary.id,
        category: categoryForFact(primary),
        reason: "Independent provider does not support this fact category."
      });
      continue;
    }

    const reference = referenceFacts.find((fact) => fact.id === primary.id)
      ?? referenceFacts.find((fact) => (
        fact.kind === primary.kind
        && fact.planetOrPointId === primary.planetOrPointId
        && fact.targetId === primary.targetId
        && fact.aspectType === primary.aspectType
      ));

    if (!reference) {
      gaps.push({
        fixtureId: fixture.id,
        factId: primary.id,
        category: categoryForFact(primary),
        reason: "Independent provider supports the category but did not return a matching fact."
      });
      continue;
    }

    if (primary.kind === "position") {
      verified[categoryForFact(primary)] += 1;

      if (primary.normalizedSign !== reference.normalizedSign) {
        discrepancies.push(discrepancy(fixture, primary, "normalizedSign", primary.normalizedSign, reference.normalizedSign));
      }

      if (primary.directRetrograde !== reference.directRetrograde) {
        discrepancies.push(discrepancy(fixture, primary, "directRetrograde", primary.directRetrograde, reference.directRetrograde));
      }

      const longitudeDiff = circularDiff(primary.longitude, reference.longitude);
      if (longitudeDiff > tolerances.longitudeDegrees) {
        discrepancies.push(discrepancy(
          fixture,
          primary,
          "longitude",
          primary.longitude,
          reference.longitude,
          tolerances.longitudeDegrees
        ));
      }
    }

    if (primary.kind === "angle") {
      verified.angles += 1;
      const angleDiff = circularDiff(primary.longitude, reference.longitude);
      if (angleDiff > tolerances.angleDegrees) {
        discrepancies.push(discrepancy(fixture, primary, "longitude", primary.longitude, reference.longitude, tolerances.angleDegrees));
      }
    }

    if (primary.kind === "house-cusp") {
      verified.cusps += 1;
      const cuspDiff = circularDiff(primary.longitude, reference.longitude);
      if (cuspDiff > tolerances.houseCuspDegrees) {
        discrepancies.push(discrepancy(fixture, primary, "longitude", primary.longitude, reference.longitude, tolerances.houseCuspDegrees));
      }
    }

    if (primary.kind === "aspect") {
      verified.aspects += 1;
      if (primary.aspectType !== reference.aspectType) {
        discrepancies.push(discrepancy(fixture, primary, "aspectType", primary.aspectType, reference.aspectType));
      }

      if (numberDiff(primary.orb, reference.orb) > tolerances.orbDegrees) {
        discrepancies.push(discrepancy(fixture, primary, "orb", primary.orb, reference.orb, tolerances.orbDegrees));
      }

      if (primary.applyingSeparating !== reference.applyingSeparating) {
        discrepancies.push(discrepancy(
          fixture,
          primary,
          "applyingSeparating",
          primary.applyingSeparating,
          reference.applyingSeparating
        ));
      }
    }
  }

  return { discrepancies, gaps, verified };
}

function assertPosition(fixture, facts, assertion) {
  const fact = byId(facts, "position", assertion.planetOrPointId);

  assert.ok(fact, `${fixture.id}: expected position fact ${assertion.planetOrPointId}.`);
  if (assertion.sign !== undefined) {
    assert.equal(fact.normalizedSign, assertion.sign, `${fixture.id}: sign`);
  }
  if (assertion.motion !== undefined) {
    assert.equal(fact.directRetrograde, assertion.motion, `${fixture.id}: direct/retrograde`);
  }
  if (assertion.retrogradePhase !== undefined) {
    assert.equal(fact.retrogradePhase, assertion.retrogradePhase, `${fixture.id}: retrograde phase`);
  }
  if (assertion.retrogradeStart !== undefined) {
    assert.equal(datePart(fact.stationStart), assertion.retrogradeStart, `${fixture.id}: retrograde start`);
  }
  if (assertion.retrogradeEnd !== undefined) {
    assert.equal(datePart(fact.stationEnd), assertion.retrogradeEnd, `${fixture.id}: retrograde end`);
  }
  if (assertion.longitudeMin !== undefined) {
    assert.ok(
      Number(fact.longitude) >= assertion.longitudeMin,
      `${fixture.id}: ${assertion.planetOrPointId} longitude ${fact.longitude} is below ${assertion.longitudeMin}.`
    );
  }
  if (assertion.longitudeMax !== undefined) {
    assert.ok(
      Number(fact.longitude) <= assertion.longitudeMax,
      `${fixture.id}: ${assertion.planetOrPointId} longitude ${fact.longitude} is above ${assertion.longitudeMax}.`
    );
  }
}

function assertAspect(fixture, facts, assertion) {
  const fact = facts.find((candidate) => (
    candidate.kind === "aspect"
    && candidate.planetOrPointId === assertion.planetOrPointId
    && candidate.targetId === assertion.targetId
    && candidate.aspectType === assertion.aspectType
  ));

  assert.ok(
    fact,
    `${fixture.id}: expected ${assertion.planetOrPointId} ${assertion.aspectType} ${assertion.targetId}.`
  );
  if (assertion.maxOrb !== undefined) {
    assert.ok(
      Number(fact.orb) <= assertion.maxOrb,
      `${fixture.id}: aspect orb ${fact.orb} exceeds ${assertion.maxOrb}.`
    );
  }
  if (assertion.applyingSeparating !== undefined) {
    assert.equal(
      fact.applyingSeparating,
      assertion.applyingSeparating,
      `${fixture.id}: applying/separating`
    );
  }
}

function assertFixtureSpecifics(fixture, facts) {
  const positionAssertions = [
    ...(fixture.assertions?.position ? [fixture.assertions.position] : []),
    ...(fixture.assertions?.positions ?? [])
  ];
  for (const assertion of positionAssertions) {
    assertPosition(fixture, facts, assertion);
  }

  const aspectAssertions = [
    ...(fixture.assertions?.aspect ? [fixture.assertions.aspect] : []),
    ...(fixture.assertions?.aspects ?? [])
  ];
  for (const assertion of aspectAssertions) {
    assertAspect(fixture, facts, assertion);
  }
}

function buildSummary(report) {
  const summary = report.results.reduce(
    (totals, result) => {
      totals.statusCounts[result.status] = (totals.statusCounts[result.status] ?? 0) + 1;
      totals.discrepancies += result.discrepancies?.length ?? 0;
      totals.gaps += result.gaps?.length ?? 0;
      for (const [category, count] of Object.entries(result.verified ?? {})) {
        totals.verified[category] = (totals.verified[category] ?? 0) + count;
      }
      if (result.status === "FAIL_DISCREPANCY" || result.status.startsWith("BLOCKED_")) {
        totals.failedFixtures.push(result.id);
      }
      return totals;
    },
    {
      fixtureCount: report.results.length,
      statusCounts: {},
      discrepancies: 0,
      gaps: 0,
      verified: {},
      failedFixtures: []
    }
  );
  return {
    ok: report.ok,
    generatedAt: report.generatedAt,
    independentProvider: report.independentProvider,
    ...summary
  };
}

function summaryMarkdown(summary) {
  const status = summary.ok ? "PASS" : "FAIL";
  const verifiedRows = Object.entries(summary.verified)
    .map(([category, count]) => `| ${category} | ${count} |`)
    .join("\n");
  const fixtureRows = Object.entries(summary.statusCounts)
    .map(([fixtureStatus, count]) => `| ${fixtureStatus} | ${count} |`)
    .join("\n");
  const failed = summary.failedFixtures.length > 0
    ? summary.failedFixtures.map((fixture) => `- ${fixture}`).join("\n")
    : "- None";

  return `# Ephemeris integrity: ${status}

- Generated: ${summary.generatedAt}
- Independent provider: ${summary.independentProvider}
- Fixtures: ${summary.fixtureCount}
- Supported-fact discrepancies: ${summary.discrepancies}
- Known coverage gaps: ${summary.gaps}

## Fixture statuses

| Status | Count |
| --- | ---: |
${fixtureRows}

## Verified facts

| Category | Count |
| --- | ---: |
${verifiedRows}

## Failed fixtures

${failed}
`;
}

async function main() {
  const vite = await createServer({
    root: path.join(repoRoot, "apps/web"),
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
    appType: "custom",
    logLevel: "error"
  });
  const results = [];
  let blocked = false;

  try {
    const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
    const factsModule = await vite.ssrLoadModule("/src/services/astrologyFacts.ts");

    for (const fixture of fixturesConfig.fixtures) {
      const sky = await ephemeris.getAstrodienstSky(fixture.location, new Date(fixture.date), {
        includeTransitWindows: true
      });
      const facts = sky.facts ?? [];
      const validation = factsModule.validateAstrologyFacts(facts);

      assert.ok(validation.ok, `${fixture.id}: primary facts failed validation: ${validation.diagnostics.join("; ")}`);
      assertFixtureSpecifics(fixture, facts);

      const referencePayload = runExternalProvider(fixture);

      if (!referencePayload) {
        blocked = true;
        results.push({
          id: fixture.id,
          status: "BLOCKED_INDEPENDENT_PROVIDER_MISSING",
          primaryFactCount: facts.length,
          provenance: sky.calculationProvenance
        });
        continue;
      }

      const comparisonFixture = {
        ...fixture,
        referenceCapabilities: referencePayload.capabilities ?? {}
      };
      const comparison = compareReferenceFacts(
        comparisonFixture,
        facts,
        referencePayload.facts ?? [],
        fixturesConfig.tolerances
      );

      const providerGaps = referencePayload.gaps ?? [];
      const gaps = [...comparison.gaps, ...providerGaps.map((gap) => ({ fixtureId: fixture.id, ...gap }))];
      const hasGaps = gaps.length > 0;
      const hasDiscrepancies = comparison.discrepancies.length > 0;

      if (hasDiscrepancies || (hasGaps && !allowReferenceGaps)) {
        blocked = true;
      }

      results.push({
        id: fixture.id,
        status: hasDiscrepancies ? "FAIL_DISCREPANCY" : hasGaps ? "PARTIAL_WITH_GAPS" : "PASS",
        primaryFactCount: facts.length,
        referenceFactCount: referencePayload.facts?.length ?? 0,
        provider: referencePayload.provider ?? null,
        verified: comparison.verified,
        discrepancies: comparison.discrepancies,
        gaps
      });
    }
  } finally {
    await vite.close();
  }

  const report = {
    ok: !blocked,
    generatedAt: new Date().toISOString(),
    independentProvider: providerCommand ? "configured" : "missing",
    referenceGapsAllowed: allowReferenceGaps,
    referenceSources: sourceRegistry,
    tolerances: fixturesConfig.tolerances,
    results
  };
  const summary = buildSummary(report);
  report.summary = summary;

  const reportJson = JSON.stringify(report, null, 2);
  const markdown = summaryMarkdown(summary);
  if (reportPath) {
    fs.writeFileSync(reportPath, `${reportJson}\n`);
  }
  if (summaryPath) {
    fs.writeFileSync(summaryPath, markdown);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  }
  if (summaryOnly) {
    console.log(JSON.stringify({
      ...summary,
      reportPath: reportPath ?? null
    }, null, 2));
  } else {
    console.log(reportJson);
  }

  if (blocked && !allowMissingProvider) {
    if (process.env.GITHUB_ACTIONS === "true") {
      console.error(
        `::error title=Ephemeris integrity failed::${summary.discrepancies} discrepancies; `
        + `failed fixtures: ${summary.failedFixtures.join(", ") || "provider/coverage gate"}`
      );
    }
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
