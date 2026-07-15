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
const providerCommand = process.env.TLDR_ASTRO_VERIFY_PROVIDER_COMMAND;
const reportPath = process.env.TLDR_ASTRO_VERIFY_REPORT_PATH;

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

function assertFixtureSpecifics(fixture, facts) {
  const assertion = fixture.assertions?.position;

  if (!assertion) {
    return;
  }

  const fact = byId(facts, "position", assertion.planetOrPointId);

  assert.ok(fact, `${fixture.id}: expected position fact ${assertion.planetOrPointId}.`);
  assert.equal(fact.normalizedSign, assertion.sign, `${fixture.id}: sign`);
  assert.equal(fact.directRetrograde, assertion.motion, `${fixture.id}: direct/retrograde`);
  assert.equal(fact.retrogradePhase, assertion.retrogradePhase, `${fixture.id}: retrograde phase`);
  assert.equal(datePart(fact.stationStart), assertion.retrogradeStart, `${fixture.id}: retrograde start`);
  assert.equal(datePart(fact.stationEnd), assertion.retrogradeEnd, `${fixture.id}: retrograde end`);
}

async function main() {
  const vite = await createServer({
    root: path.join(repoRoot, "apps/web"),
    server: { middlewareMode: true },
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

      if (hasGaps || hasDiscrepancies) {
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
    independentProvider: providerCommand ? "configured" : "missing",
    referenceSources: sourceRegistry,
    tolerances: fixturesConfig.tolerances,
    results
  };

  const reportJson = JSON.stringify(report, null, 2);
  if (reportPath) {
    fs.writeFileSync(reportPath, `${reportJson}\n`);
  }
  console.log(reportJson);

  if (blocked && !allowMissingProvider) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
