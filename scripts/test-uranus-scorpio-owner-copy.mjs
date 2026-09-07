import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderNatalPlacementPreviewState, normalizeNatalPlacementPreviewInput, natalPlacementPackageSources } from "../api/admin/natal-placement-preview.ts";
import { renderNatalPlacement as referencePlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import { createFallbackRenderer as sourceRenderer } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts";
import { natalPlacementResolverDependencyKeys } from "../apps/admin/src/natalPlacementSources.ts";
const body = readFileSync("docs/content-management/owner-copy/uranus-in-scorpio-2026-09-07.txt", "utf8").trimEnd();
const receipt = JSON.parse(readFileSync("docs/content-management/owner-copy/uranus-in-scorpio-2026-09-07.json", "utf8"));
assert.equal(createHash("sha256").update(body).digest("hex"), receipt.bodySha256);
assert.equal(body.split(/\s+/u).length, receipt.wordCount);
for (const house of ["", ...Array.from({ length: 12 }, (_, index) => String(index + 1))]) {
  for (const motion of ["direct", "retrograde"]) {
    const state = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({ planet: "uranus", sign: "scorpio", house, motion, audience: "you", overrides: [] }));
    assert.equal(state.rendered.parts[0].slice(0, body.length), body, `${house || "sign only"} / ${motion} must preserve the complete owner passage`);
    assert.equal(state.rendered.partKeys[0], receipt.contentKey);
    assert(state.rendered.body.startsWith(body));
    const facts = { planet: "uranus", sign: "scorpio", ...(house ? { house: Number(house) } : {}), isRetrograde: motion === "retrograde", voice: "you" };
    const sources = natalPlacementPackageSources(natalPlacementResolverDependencyKeys("uranus", "scorpio", house, motion));
    const browser = sourceRenderer({ templates: sources.filter((row) => row.content_role === "template") }, {
      hookRows: sources.filter((row) => row.content_role !== "template" && row.content_role !== "vocabulary"),
      vocabularyRows: sources.filter((row) => row.content_role === "vocabulary")
    }).renderNatalPlacement(facts);
    assert.equal(browser.body, state.rendered.body, "Browser source and shipped artifact must agree.");
    assert.equal(referencePlacement(facts).body, state.rendered.body, "Node reference and shipped artifact must agree.");
  }
}
console.log("PASS: Uranus Scorpio owner text, hash, word count, and shipped reader payload in every house/motion");
