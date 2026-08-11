#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REPORT_FACTOR_ELIGIBILITY_RULING,
  SR_OVERLAY_ELIGIBLE_POINTS,
  reportFactors,
  resolveManifestationSets
} from "../api/_lib/report-generation.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(repoRoot, "artifacts", "report-manifestation-coverage-2026-08-10.json");
const houses = Array.from({ length: 12 }, (_, index) => index + 1);
const aspects = ["conjunction", "opposition", "sextile", "square", "trine"];
const slowPlanets = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron"];
const natalTargets = [
  "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Ascendant", "Midheaven"
];
const eclipseConjunctionTargets = [...natalTargets, "Chiron", "North Node"];
const returnPlanets = ["Jupiter", "Saturn", "Uranus"];

function factor(id, factorType, values) {
  return { id, factorType, source: { auditFixture: true }, ...values };
}

const universe = [
  ...houses.map((house) => factor(`audit-profection-${house}`, "profection-year", { house })),
  ...SR_OVERLAY_ELIGIBLE_POINTS.flatMap((overlayPoint) => houses.map((house) => factor(
    `audit-sr-${overlayPoint}-${house}`,
    "sr-overlay",
    { overlayPoint, house }
  ))),
  ...houses.map((house) => factor(`audit-eclipse-house-${house}`, "eclipse-house-placement", { house })),
  ...eclipseConjunctionTargets.flatMap((natalPoint) => houses.map((house) => factor(
    `audit-eclipse-conjunction-${natalPoint}-${house}`,
    "eclipse-on-natal-point",
    { natalPoint, aspect: "conjunction", house }
  ))),
  ...slowPlanets.flatMap((transitPlanet) => natalTargets.flatMap((natalPoint) => aspects.flatMap((aspect) => (
    transitPlanet === natalPoint && aspect === "conjunction"
      ? []
      : houses.map((house) => factor(
        `audit-slow-${transitPlanet}-${aspect}-${natalPoint}-${house}`,
        "slow-transit-to-natal",
        { transitPlanet, natalPoint, aspect, house }
      ))
  )))),
  ...returnPlanets.flatMap((transitPlanet) => houses.map((house) => factor(
    `audit-return-${transitPlanet}-${house}`,
    "return",
    { transitPlanet, natalPoint: transitPlanet, aspect: "conjunction", house }
  )))
];

const coverage = resolveManifestationSets(universe);
const group = (items) => Object.fromEntries(
  [...new Set(items.map((item) => item.factor.factorType))].sort().map((factorType) => [
    factorType,
    items.filter((item) => item.factor.factorType === factorType).map((item) => item.factor)
  ])
);
const gapsByType = Object.fromEntries(
  [...new Set(coverage.gaps.map((gap) => universe.find((item) => item.id === gap.factorId)?.factorType))]
    .filter(Boolean)
    .sort()
    .map((factorType) => [factorType, coverage.gaps
      .filter((gap) => universe.find((item) => item.id === gap.factorId)?.factorType === factorType)
      .map((gap) => gap.requestedKey)
      .sort()])
);

const diagnosticFacts = JSON.parse(fs.readFileSync(path.join(repoRoot, "scripts", "fixtures", "marie-report-frozen-facts.json"), "utf8"));
const diagnosticFactors = reportFactors(diagnosticFacts);
const diagnosticCoverage = resolveManifestationSets(diagnosticFactors);

const artifact = {
  schemaVersion: "report-manifestation-coverage-v2",
  auditedOn: "2026-08-10",
  eligibilityRuling: REPORT_FACTOR_ELIGIBILITY_RULING,
  universeDefinition: {
    houses,
    aspects,
    srOverlayPoints: SR_OVERLAY_ELIGIBLE_POINTS,
    slowTransitPlanets: slowPlanets,
    slowTransitNatalTargets: natalTargets,
    eclipseConjunctionTargets,
    returnPlanets,
    note: "The finite request universe mirrors services/tldrastro-api report_window constants after the owner eligibility exclusions. House is enumerated because it is part of the runtime request key. Ineligible factors are absent rather than counted as gaps."
  },
  totals: {
    eligibleKeys: universe.length,
    resolvedKeys: coverage.resolved.length,
    sourceGaps: coverage.gaps.length
  },
  eligibleCountsByFactorType: Object.fromEntries(Object.entries(group(universe.map((item) => ({ factor: item })))).map(([key, values]) => [key, values.length])),
  gapCountsByFactorType: Object.fromEntries(Object.entries(gapsByType).map(([key, values]) => [key, values.length])),
  remainingGapsByFactorType: gapsByType,
  fixtureDiagnostic: {
    authoritativeForProductionCoverage: false,
    note: "This checked-in fixture is an offline regression aid only. Production coverage claims require scripts/audit-production-report-coverage.mjs against the report's stored facts bundle.",
    factorCount: diagnosticFactors.length,
    resolvedCount: diagnosticCoverage.resolved.length,
    sourceGapCount: diagnosticCoverage.gaps.length,
    sourceGaps: diagnosticCoverage.gaps,
    factorKeys: diagnosticFactors.map((item) => item.id).sort()
  }
};

if (process.argv.includes("--write")) {
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
}

console.log(JSON.stringify({
  totals: artifact.totals,
  gapCountsByFactorType: artifact.gapCountsByFactorType,
  fixtureDiagnostic: {
    authoritativeForProductionCoverage: artifact.fixtureDiagnostic.authoritativeForProductionCoverage,
    factorCount: artifact.fixtureDiagnostic.factorCount,
    resolvedCount: artifact.fixtureDiagnostic.resolvedCount,
    sourceGapCount: artifact.fixtureDiagnostic.sourceGapCount
  },
  artifact: path.relative(repoRoot, outputPath)
}, null, 2));
