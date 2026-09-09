#!/usr/bin/env node

import fs from "node:fs";
import assert from "node:assert/strict";
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
// These two return identities have no eligible return unit in the current
// shipped package. They must not borrow ordinary conjunction prose. Any NEW
// gap fails this audit; filling either with approved copy remains allowed.
const knownSourceGaps = new Set(["sun/sun/conjunction", "uranus/uranus/conjunction"]);

await build({
  absWorkingDir: repoRoot,
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: outFile,
  write: true,
  logLevel: "silent",
  define: { "import.meta.env": "{}" },
  loader: { ".css": "empty", ".svg": "dataurl" },
  stdin: {
    resolveDir: repoRoot,
    loader: "tsx",
    contents: `
      import { friendsViewModelDependencies } from "./apps/web/src/App.tsx";
      export const { normalizePersonalTransitSurface, normalizedSurfacePreview, personalTransitPackageWindow, stableTransitCopyVariant } = friendsViewModelDependencies;
      export { fullDetailReaderFacingCopy } from "./apps/web/src/content/readerSafety.ts";
      export { installContentPublications } from "./apps/web/src/content/contentPublicationState.ts";
      export {
        loadDeferredFallbackArchitectureV3Bundle,
        loadRelationshipFallbackArchitectureV3Bundle,
        installFallbackArchitectureV3Bundle,
        SourceGapError,
        transitSynastryFallbackRendererV3
      } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
    `
  }
});

try {
  const runtime = await import(pathToFileURL(outFile));
  await runtime.loadDeferredFallbackArchitectureV3Bundle();
  await runtime.loadRelationshipFallbackArchitectureV3Bundle();
  const renderer = runtime.transitSynastryFallbackRendererV3;
  const rows = [];
  const generatedAt = "2026-09-08T12:00:00Z";
  const transitFor = (transiting, natal, aspect, motion = "direct") => ({
    id: `coverage-${transiting}-${natal}-${aspect}`, term: "short-term",
    transitPlanet: transiting, natalPoint: natal, aspect, transitMotion: motion,
    transitSign: "capricorn", natalSign: "aries", natalHouse: 5,
    glyph: "", orb: "1", arc: [], note: "",
    timing: { group: "this-week", phase: "building", engagementStart: "2026-09-01T00:00:00Z", engagementEnd: "2026-09-26T00:00:00Z", passIndex: 1, exactPasses: [] }
  });
  const reader = (transit, voice = "you") => runtime.normalizePersonalTransitSurface(transit, generatedAt, voice);

  for (const transiting of transitingBodies) {
    for (const natal of natalPoints) {
      for (const aspect of aspects) {
        // The production calculator never creates these contacts.
        if (natal === "lilith" && !["conjunction", "opposition"].includes(aspect)) continue;

        for (const voice of ["you", "Alex"]) for (const motion of ["direct", "retrograde"]) {
          const identity = `${transiting}/${natal}/${aspect}/${voice}/${motion}`;
          const transit = transitFor(transiting, natal, aspect, motion);

          try {
            const isReturn = transiting === natal && aspect === "conjunction" && returnBodies.has(transiting);
            const rendered = isReturn
              ? renderer.renderTransitReturn({ planet: transiting })
              : renderer.renderTransitAspect({
                  aspect,
                  natal,
                  transiting,
                  voice,
                  sign: transit.transitSign,
                  isRetrograde: motion === "retrograde",
                  variant: runtime.stableTransitCopyVariant(voice, transit.id),
                  window: runtime.personalTransitPackageWindow(transit, generatedAt)
                });
            const body = runtime.fullDetailReaderFacingCopy(rendered.parts);
            const authored = rendered.templateKey?.startsWith("authored/") === true;
            const surface = reader(transit, voice);
            const meaning = surface.sections.find(section => section.slot === "meaning");
            assert.ok(body, `${identity}: selected resolver result must have writing`);
            assert.equal(meaning?.body, body, `${identity}: reader rejected or changed ${rendered.templateKey}`);
            assert.ok(runtime.normalizedSurfacePreview(surface), `${identity}: card preview must contain writing`);
            assert.doesNotMatch(body, /\{\{/u, `${identity}: unresolved slots`);
            if (!authored) assert.equal(meaning.layer, "fallback", `${identity}: composition must not be labeled authored`);

            rows.push({
              authored,
              bodyAvailable: Boolean(body),
              identity,
              selectedKey: rendered.contentKey ?? null,
              templateKey: rendered.templateKey ?? null,
              transiting,
              natal,
              aspect,
              reason: authored ? "authored-detail" : "approved-composition-detail"
            });
          } catch (error) {
            assert.ok(error instanceof runtime.SourceGapError, `${identity}: unexpected resolver or reader rejection: ${error}`);
            assert.ok(knownSourceGaps.has(`${transiting}/${natal}/${aspect}`), `${identity}: new source gap requires investigation`);
            assert.equal(reader(transit, voice).status, "not-servable", `${identity}: source gaps must stay closed`);
            rows.push({
              authored: false,
              bodyAvailable: false,
              identity,
              selectedKey: null,
              templateKey: null,
              transiting,
              natal,
              aspect,
              reason: "resolver-source-gap"
            });
          }
        }
      }
    }
  }

  const lilith = transitFor("lilith", "pluto", "square", "retrograde");
  const baseline = reader(lilith).sections[0]?.body;
  assert.ok(baseline, "Lilith–Pluto must have approved writing");
  const hookKey = "fallback-hook/transit-effect-hard/lilith";
  runtime.installFallbackArchitectureV3Bundle({
    transitLib: { authoredCards: [] }, templatesFile: { templates: [] },
    rowsFile: { vocabularyRows: [], hookRows: [{ contentKey: hookKey, review_status: "needs_review", content_role: "fallback_hook", body_you: "QA unpublished replacement" }] }
  });
  assert.equal(reader(lilith).sections[0]?.body, baseline, "Draft hydration must preserve approved fallback writing");
  runtime.installFallbackArchitectureV3Bundle(null);
  assert.equal(reader(lilith).sections[0]?.body, baseline, "Missing CMS mirror must preserve approved fallback writing");
  const publish = (content_key, state, revision) => runtime.installContentPublications([{
    content_key, state, revision, row_id: null, row_updated_at: null, updated_at: generatedAt
  }]);
  for (const key of [hookKey, "fallback-template/transit.aspect"]) {
    publish(key, "retired", 1);
    assert.equal(reader(lilith).status, "not-servable", `${key}: retired prose must stay closed`);
    publish(key, "live", 1);
    assert.equal(reader(lilith).status, "not-servable", `${key}: old publication cannot undo retirement`);
    publish(key, "live", 2);
    assert.equal(reader(lilith).sections[0]?.body, baseline, `${key}: explicit republish restores approved writing`);
  }
  const exact = transitFor("chiron", "jupiter", "square");
  const exactKey = "authored/transit-aspect/chiron/jupiter/hard";
  assert.ok(reader(exact).sections[0]?.sourceKeys.includes(exactKey), "Exact authored copy must win first");
  publish(exactKey, "retired", 1);
  assert.equal(reader(exact).status, "not-servable", "Retired exact writing must not expose a generic fallback");
  assert.equal(reader(lilith).sections[0]?.body, baseline, "Retirement must not suppress unrelated fallback writing");

  const available = rows.filter((row) => row.bodyAvailable);
  const missing = rows.filter((row) => !row.bodyAvailable);
  assert.ok(rows.some(row => row.reason === "approved-composition-detail"), "Matrix must cover evergreen fallback writing");
  assert.ok(rows.some(row => row.authored), "Matrix must cover authored precedence");
  assert.equal(rows.length, 3752, "Do not silently shrink the supported transit identity matrix");
  const byTransitingBody = Object.fromEntries(transitingBodies.map((body) => {
    const bodyRows = rows.filter((row) => row.transiting === body);
    const authoredCount = bodyRows.filter((row) => row.authored && row.bodyAvailable).length;

    return [body, {
      authored: authoredCount,
      approvedCompositions: bodyRows.filter(row => row.reason === "approved-composition-detail").length,
      missing: bodyRows.filter(row => !row.bodyAvailable).length,
      total: bodyRows.length
    }];
  }));
  const summary = {
    status: missing.length === 0 ? "COMPLETE" : "GAPS_FOUND",
    checked: rows.length,
    readerDetails: available.length,
    authoredDetails: rows.filter(row => row.authored).length,
    approvedCompositions: rows.filter(row => row.reason === "approved-composition-detail").length,
    sourceGaps: missing.length,
    rejectedApprovedWriting: 0,
    lifecycle: "PASS: draft/missing mirror, retirement, stale publication, republish, exact precedence",
    missingReasons: Object.fromEntries([...new Set(missing.map((row) => row.reason))].sort().map((reason) => [
      reason,
      missing.filter((row) => row.reason === reason).length
    ])),
    byTransitingBody,
    screenshotContact: rows.find((row) => row.identity === "lilith/pluto/square/you/retrograde") ?? null,
    missing: process.argv.includes("--all") ? missing : missing.slice(0, 40)
  };

  console.log(JSON.stringify(summary, null, 2));
} finally {
  fs.rmSync(outFile, { force: true });
}
