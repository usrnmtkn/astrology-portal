#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderPairDaily } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(
  repoRoot,
  "packages/astro-knowledge/review/between-you-two-v2-2026-09-05"
);
const outputPath = path.join(outputDir, "v1-render-audit.json");

const scenarios = [
  {
    id: "different-days-moon-earth",
    purpose: "Two unrelated personal daily clauses followed by a generic shared Moon condition.",
    variant: 1,
    reader: {
      handle: "reader",
      clauseKey: "fallback-hook/pair-daily/clause/square/venus"
    },
    friend: {
      handle: "friend",
      displayName: "Friend",
      clauseKey: "fallback-hook/pair-daily/clause/house/4"
    },
    shared: { kind: "moon", element: "earth" }
  },
  {
    id: "same-driver-hard-bond",
    purpose: "Exact same-clause collapse followed by a hard shared bond condition.",
    variant: 1,
    reader: {
      handle: "reader",
      clauseKey: "fallback-hook/pair-daily/clause/opposition/saturn"
    },
    friend: {
      handle: "friend",
      displayName: "Friend",
      clauseKey: "fallback-hook/pair-daily/clause/opposition/saturn"
    },
    shared: { kind: "bond", family: "hard", transiting: "jupiter" }
  },
  {
    id: "reactivity-vs-information-hard-saturn",
    purpose: "Different personal pressures plus a Saturn relationship-friction bridge and closing advice.",
    variant: 1,
    reader: {
      handle: "reader",
      clauseKey: "fallback-hook/pair-daily/clause/square/mars"
    },
    friend: {
      handle: "friend",
      displayName: "Friend",
      clauseKey: "fallback-hook/pair-daily/clause/square/mercury"
    },
    shared: { kind: "bond", family: "hard", transiting: "saturn" }
  },
  {
    id: "approval-vs-uncertainty-hard-mercury",
    purpose: "Identity/approval pressure and uncertainty joined to a Mercury relationship-friction bridge.",
    variant: 2,
    reader: {
      handle: "reader",
      clauseKey: "fallback-hook/pair-daily/clause/square/sun"
    },
    friend: {
      handle: "friend",
      displayName: "Friend",
      clauseKey: "fallback-hook/pair-daily/clause/square/neptune"
    },
    shared: { kind: "bond", family: "hard", transiting: "mercury" }
  },
  {
    id: "soft-venus-bond",
    purpose: "Two distinct personal pressures joined to a Venus relationship-support bridge.",
    variant: 10,
    reader: {
      handle: "reader",
      clauseKey: "fallback-hook/pair-daily/clause/square/venus"
    },
    friend: {
      handle: "friend",
      displayName: "Friend",
      clauseKey: "fallback-hook/pair-daily/clause/opposition/moon"
    },
    shared: { kind: "bond", family: "soft", transiting: "venus" }
  },
  {
    id: "soft-jupiter-bond",
    purpose: "Different personal pressures joined to a Jupiter relationship-support bridge.",
    variant: 3,
    reader: {
      handle: "reader",
      clauseKey: "fallback-hook/pair-daily/clause/square/jupiter"
    },
    friend: {
      handle: "friend",
      displayName: "Friend",
      clauseKey: "fallback-hook/pair-daily/clause/square/mercury"
    },
    shared: { kind: "bond", family: "soft", transiting: "jupiter" }
  },
  {
    id: "moon-fire-fallback",
    purpose: "No bond transit; shared sentence comes only from today's Moon element.",
    variant: 2,
    reader: {
      handle: "reader",
      clauseKey: "fallback-hook/pair-daily/clause/square/mars"
    },
    friend: {
      handle: "friend",
      displayName: "Friend",
      clauseKey: "fallback-hook/pair-daily/clause/opposition/moon"
    },
    shared: { kind: "moon", element: "fire" }
  },
  {
    id: "no-shared-condition",
    purpose: "Both daily clauses exist but there is no defensible shared condition.",
    variant: 3,
    reader: {
      handle: "reader",
      clauseKey: "fallback-hook/pair-daily/clause/square/venus"
    },
    friend: {
      handle: "friend",
      displayName: "Friend",
      clauseKey: "fallback-hook/pair-daily/clause/square/saturn"
    },
    shared: { kind: null }
  }
];

function wordCount(value) {
  return String(value ?? "").trim().split(/\s+/u).filter(Boolean).length;
}

const outputs = scenarios.map((scenario) => {
  try {
    const rendered = renderPairDaily(scenario);
    return {
      ...scenario,
      status: "rendered",
      body: rendered.body,
      wordCount: wordCount(rendered.body),
      sourceKeys: rendered.sourceKeys
    };
  } catch (error) {
    return {
      ...scenario,
      status: "source-gap",
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    note: "Diagnostic only. No V2 copy in this artifact is serving or approved.",
    scenarioCount: outputs.length,
    outputs
  }, null, 2)}\n`
);

console.log(`Wrote ${path.relative(repoRoot, outputPath)} with ${outputs.length} V1 scenarios.`);
