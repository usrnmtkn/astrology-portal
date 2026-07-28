#!/usr/bin/env node
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const bundleFile = `${os.tmpdir()}/tldrastro-generated-content-verbatim.bundle.mjs`;

await build({
  bundle: true,
  define: {
    "import.meta.env": "{}"
  },
  entryPoints: [path.join(repoRoot, "apps/web/src/services/generatedContent.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

const { generatedContentParagraphs } = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);

const forbiddenScaffold = [
  /conditions/i,
  /coloring the current sky/i,
  /meets life through/i,
  /brings\s+.+\s+through/i,
  /core ways of choosing/i
];

function row({ body = "", contentKey, file, sections, surface }) {
  return {
    id: contentKey,
    contentKey,
    surface,
    mode: "in_depth",
    eventType: null,
    targetDate: null,
    headline: null,
    summary: null,
    body,
    sections,
    blockType: null,
    provider: "manual",
    sourceSnapshot: { file },
    model: "test",
    updatedAt: "2026-07-14T00:00:00.000Z"
  };
}

function renderedBody(rows) {
  return rows.flatMap((item) => generatedContentParagraphs(item)).join("\n\n").trim();
}

function assertVerbatim(label, actual, expected) {
  assert.equal(actual.trim(), expected.trim(), `${label} must render authored field verbatim.`);

  for (const pattern of forbiddenScaffold) {
    assert.equal(pattern.test(actual), false, `${label} must not render scaffold copy matching ${pattern}: ${actual}`);
  }
}

const venusCapricornStory = "You love with commitment and staying power; you invest where it can last";
const venusEighthHouse = "you love deeply and all-in, where trust and intimacy are shared";
const marsGeminiCollectiveShift = "Our action scatters into talk and errands, and we're all busy and a little scattered";
const ascendantGeminiReading = "You come across curious, verbal, and quick, and people register your wit before you say a word. This is the doorway to you, the first impression that colors everything after it, not the whole room behind it.";

const venusPlacementBody = renderedBody([
  row({
    contentKey: "natal.sign.venus.capricorn",
    file: "cc-planet-in-sign-reviewed.json",
    sections: { natal_sign_story: venusCapricornStory },
    surface: "natal"
  }),
  row({
    contentKey: "natal.house.venus.house_8",
    file: "cc-planet-in-house-reviewed.json",
    sections: { house_integration: venusEighthHouse },
    surface: "natal"
  })
]);
assertVerbatim("Venus in Capricorn in the 8th house", venusPlacementBody, `${venusCapricornStory}\n\n${venusEighthHouse}`);

const marsSkyPlacementBody = renderedBody([
  row({
    contentKey: "sky.placement.mars.gemini",
    file: "cc-planet-in-sign-reviewed.json",
    sections: { collective_shift: marsGeminiCollectiveShift },
    surface: "sky"
  })
]);
assertVerbatim("Mars in Gemini sky placement", marsSkyPlacementBody, marsGeminiCollectiveShift);

const ascendantGeminiBody = renderedBody([
  row({
    contentKey: "natal.angle.ascendant.gemini",
    file: "cc-natal-angles-authored.json",
    sections: { reading: ascendantGeminiReading },
    surface: "natal"
  })
]);
assertVerbatim("Ascendant in Gemini", ascendantGeminiBody, ascendantGeminiReading);

console.log(JSON.stringify({
  ascendantGeminiBody,
  marsSkyPlacementBody,
  status: "PASS",
  venusPlacementBody
}, null, 2));
