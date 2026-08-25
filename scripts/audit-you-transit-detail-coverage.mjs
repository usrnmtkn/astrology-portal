#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(import.meta.dirname, "..");
const outFile = path.join(os.tmpdir(), `tldr-you-transit-coverage-${process.pid}-${Date.now()}.mjs`);
const transitingBodies = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron", "lilith", "north-node", "south-node"
];
// The You resolver adds Ascendant and Descendant to the natal points, then
// dedupes opposite axis contacts. Ascendant wins over Descendant and North Node
// wins over South Node, so only the canonical side of each natal axis can reach
// the rendered list.
const natalPoints = [
  ...transitingBodies.filter((body) => body !== "south-node"),
  "ascendant"
];
const aspects = ["conjunction", "sextile", "square", "trine", "opposition"];
const returnBodies = new Set([
  "sun", "mercury", "venus", "mars", "jupiter", "saturn", "chiron", "uranus", "north-node"
]);

await build({
  absWorkingDir: repoRoot,
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: outFile,
  write: true,
  logLevel: "silent",
  stdin: {
    resolveDir: repoRoot,
    loader: "tsx",
    contents: `
      export {
        loadDeferredFallbackArchitectureV3Bundle,
        transitSynastryFallbackRendererV3
      } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
    `
  }
});

try {
  const runtime = await import(pathToFileURL(outFile));
  await runtime.loadDeferredFallbackArchitectureV3Bundle();
  const renderer = runtime.transitSynastryFallbackRendererV3;
  const rows = [];

  for (const transiting of transitingBodies) {
    for (const natal of natalPoints) {
      for (const aspect of aspects) {
        // The production calculator never creates these contacts.
        if (natal === "lilith" && !["conjunction", "opposition"].includes(aspect)) continue;

        const identity = `${transiting}/${natal}/${aspect}`;

        try {
          const isReturn = transiting === natal && aspect === "conjunction" && returnBodies.has(transiting);
          const rendered = isReturn
            ? renderer.renderTransitReturn({ planet: transiting })
            : renderer.renderTransitAspect({
                aspect,
                natal,
                transiting,
                window: "Until September 1"
              });
          const body = (rendered.parts ?? []).join("\n\n").trim();
          const authored = rendered.templateKey?.startsWith("authored/") === true;

          rows.push({
            authored,
            bodyAvailable: Boolean(body),
            identity,
            selectedKey: rendered.contentKey ?? null,
            templateKey: rendered.templateKey ?? null,
            transiting,
            natal,
            aspect,
            reason: authored && body ? "authored-detail" : "generic-composition-rejected-by-reader-gate"
          });
        } catch (error) {
          rows.push({
            authored: false,
            bodyAvailable: false,
            identity,
            selectedKey: null,
            templateKey: null,
            transiting,
            natal,
            aspect,
            reason: error instanceof Error && /SOURCE_GAP/u.test(error.message)
              ? "resolver-source-gap"
              : "resolver-error"
          });
        }
      }
    }
  }

  const available = rows.filter((row) => row.authored && row.bodyAvailable);
  const missing = rows.filter((row) => !row.authored || !row.bodyAvailable);
  const byTransitingBody = Object.fromEntries(transitingBodies.map((body) => {
    const bodyRows = rows.filter((row) => row.transiting === body);
    const authoredCount = bodyRows.filter((row) => row.authored && row.bodyAvailable).length;

    return [body, {
      authored: authoredCount,
      missing: bodyRows.length - authoredCount,
      total: bodyRows.length
    }];
  }));
  const summary = {
    status: missing.length === 0 ? "COMPLETE" : "GAPS_FOUND",
    checked: rows.length,
    authoredDetails: available.length,
    missingAuthoredDetails: missing.length,
    missingReasons: Object.fromEntries([...new Set(missing.map((row) => row.reason))].sort().map((reason) => [
      reason,
      missing.filter((row) => row.reason === reason).length
    ])),
    byTransitingBody,
    screenshotContact: rows.find((row) => row.identity === "lilith/neptune/conjunction") ?? null,
    reversedContact: rows.find((row) => row.identity === "neptune/lilith/conjunction") ?? null,
    missing: process.argv.includes("--all") ? missing : missing.slice(0, 40)
  };

  console.log(JSON.stringify(summary, null, 2));
} finally {
  fs.rmSync(outFile, { force: true });
}
