#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { buildPacket } = require("../../../.agents/skills/satori-writer/scripts/compile-writing-packet.js");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"];
const eligibleStatuses = new Set(["approved", "approved_reuse", "reviewed"]);
const continuousPlanets = new Set(["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node"]);

function buildReadinessReport() {
  const sourceRowsPath = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "fallback-source-rows-v3.json");
  const sourceRows = JSON.parse(fs.readFileSync(sourceRowsPath, "utf8"));
  const sunContinuousPath = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "sky-sign-copy-sun-v1.json");
  const sunContinuous = JSON.parse(fs.readFileSync(sunContinuousPath, "utf8"));
  const phrasebookPath = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "sky-aspect-phrasebook-v1.json");
  const phrasebook = JSON.parse(fs.readFileSync(phrasebookPath, "utf8"));
  const ownerApprovedReaderPath = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "bundled-sky-placement-owner-approved-reader-v1.json");
  const ownerApprovedReader = JSON.parse(fs.readFileSync(ownerApprovedReaderPath, "utf8"));
  const hooks = new Map([
    ...(sourceRows.hookRows || []),
    ...(phrasebook.hookRows || []),
    ...(sunContinuous.rows || []),
    ...(ownerApprovedReader.rows || [])
  ].map((row) => [row.contentKey, row]));
  const writerReady = [];
  const writerBlocked = [];
  const retiredPairCoreAvailable = [];
  const retiredPairFullFiveAvailable = [];
  const continuousRowsReady = [];
  const standaloneHookRowsReady = [];
  const runtimeRenderReady = [];
  const runtimeQuarantinedRows = [];

  for (const planet of planets) {
    for (const sign of signs) {
      const placement = `${planet}-${sign}`;
      const families = Object.fromEntries(["tagline", "hook", "lived", "turn", "moves"].map((family) => {
        const key = `fallback-hook/sky-placement-${family}/${planet}/${sign}`;
        const row = hooks.get(key);
        const readerEligible = Boolean(row && eligibleStatuses.has(row.review_status));
        if (row && !readerEligible) runtimeQuarantinedRows.push({ placement, family, contentKey: key, reviewStatus: row.review_status });
        return [family, { present: Boolean(row), readerEligible }];
      }));
      const pairCoreReady = ["hook", "lived", "turn"].every((family) => families[family].readerEligible);
      if (pairCoreReady) retiredPairCoreAvailable.push(placement);
      if (Object.values(families).every((entry) => entry.readerEligible)) retiredPairFullFiveAvailable.push(placement);
      if (continuousPlanets.has(planet)) {
        const row = hooks.get(`fallback-hook/sky-sign-copy/${planet}/${sign}`);
        const standaloneHook = hooks.get(`fallback-hook/sky-placement-sign/${planet}/${sign}`);
        const hasStandaloneHook = Boolean(
          standaloneHook
          && standaloneHook.content_role === "fallback_hook"
          && eligibleStatuses.has(standaloneHook.review_status)
          && typeof standaloneHook.body_you === "string"
          && standaloneHook.body_you.trim()
        );
        if (hasStandaloneHook) standaloneHookRowsReady.push(placement);
        if (row?.render_policy === "sky-placement-continuous-v2" && eligibleStatuses.has(row.review_status)) {
          continuousRowsReady.push(placement);
          runtimeRenderReady.push(placement);
        } else if (hasStandaloneHook) {
          runtimeRenderReady.push(placement);
        }
      } else if (pairCoreReady) {
        runtimeRenderReady.push(placement);
      }

      try {
        buildPacket({
          planet,
          sign,
          requestedBeat: "full_article",
          emphasisBeat: "turn",
          task: `Write one complete Current Sky article for ${planet} in ${sign}.`
        });
        writerReady.push(placement);
      } catch (error) {
        writerBlocked.push({ placement, reason: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const blockedByReason = {};
  for (const entry of writerBlocked) {
    const category = entry.reason.startsWith("Missing placement fact boundary")
      ? "missing_fact_file"
      : entry.reason.startsWith("Placement facts are not verified")
        ? "unverified_fact_file"
        : entry.reason.startsWith("Verified astrology is incomplete")
          ? "incomplete_verified_astrology"
          : "other";
    (blockedByReason[category] ||= []).push(entry.placement);
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    policy: {
      runtimeRows: "Only approved, approved_reuse, or reviewed rows are reader-eligible.",
      writerFacts: "Fact readiness requires a REVIEWED, LIVE, or APPROVED placement fact file and a complete verified astrology boundary. Owner-corpus warmth harvesting is non-blocking; no match compiles as harvest_mode none_found.",
      publication: "Writer output remains needs_review and render-ineligible until exact owner review and separate promotion."
    },
    totals: {
      placements: planets.length * signs.length,
      runtimeRenderReady: runtimeRenderReady.length,
      continuousRowsReady: continuousRowsReady.length,
      standaloneHookRowsReady: standaloneHookRowsReady.length,
      retiredPairCoreAvailable: retiredPairCoreAvailable.length,
      retiredPairFullFiveAvailable: retiredPairFullFiveAvailable.length,
      writerReady: writerReady.length,
      writerBlocked: writerBlocked.length
    },
    runtime: {
      renderReady: runtimeRenderReady,
      continuousRowsReady,
      standaloneHookRowsReady,
      retiredPairRows: {
        note: "Preserved for provenance and non-continuous Moon/Lilith fallback only. Continuous planets do not render these rows.",
        coreAvailable: retiredPairCoreAvailable,
        fullFiveAvailable: retiredPairFullFiveAvailable
      },
      quarantinedRows: runtimeQuarantinedRows
    },
    writer: { ready: writerReady, blockedByReason, blocked: writerBlocked }
  };
}

if (require.main === module) {
  const report = buildReadinessReport();
  const outIndex = process.argv.indexOf("--out");
  if (outIndex >= 0) {
    const outPath = path.resolve(process.argv[outIndex + 1]);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

module.exports = { buildReadinessReport };
