import assert from "node:assert/strict";
import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { skyPlacementSourceCorpus as corpus } from "../api/_lib/sky-placement-sources";
import { renderSkyV4ReaderRoute, renderSkyV4StudioPreview } from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
import { renderSkyV4ReaderRoute as shipped } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { skyPlacementVariableFacts, skyPlacementVariableIssues, skyPlacementVariableSegments, isSkyPlacementVariableField } from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";

const outfile = join(tmpdir(), `sky-variables-browser-${process.pid}.mjs`);
await build({ entryPoints: ["apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts"], outfile, platform: "browser", format: "esm", bundle: true, logLevel: "silent" });
const browser = await import(pathToFileURL(outfile).href);
const key = "sky-placement/article/saturn/aries";
const before = JSON.stringify(corpus);
const updated = structuredClone(corpus);
const article = updated.content.continuous.find((row: any) => row.contentKey === key);
const raw = "Fixture: {{planetTitle}} in {{signTitle}}, {{motion}}, {{entryDate}} to {{exitDate}}.";
article.placementArticle = raw;
article.fallback.sections = [{ id: "custom", label: "Fixture", body: raw }, { id: "blank", body: "", label: "Empty" }];
// These are test facts, never production defaults.
const input = { route: "placement", planet: "saturn", sign: "aries", isRetrograde: true, facts: { entryDate: "February 13, 2026", exitDate: "April 12, 2028", planetTitle: "Incorrect override" } };
const expected = "Fixture: Saturn in Aries, retrograde, February 13, 2026 to April 12, 2028.";
for (const render of [renderSkyV4ReaderRoute, browser.renderSkyV4ReaderRoute, shipped]) {
  for (const articleAvailable of [true, false]) {
    const result = render(updated, { ...input, articleAvailable });
    assert.equal(result.mainBody, expected);
    assert(result.readerParts.includes(expected));
    assert(!result.readerParts.join("\n").includes("{{"));
    assert.equal(render(updated, { ...input, articleAvailable, isRetrograde: false }).mainBody, expected.replace("retrograde", "direct"));
    assert.throws(() => render(updated, { ...input, articleAvailable, facts: { entryDate: "" } }), /missing calculated facts/u);
  }
  const inactive = structuredClone(updated);
  inactive.content.continuous.find((row: any) => row.contentKey === key).fallback.sections[0].body = "{{unsupported}}";
  assert.equal(render(inactive, input).mainBody, expected, "an unused fallback cannot reject the selected article");
  assert.throws(() => render(inactive, { ...input, articleAvailable: false }), /Unknown Sky variable/u);
  assert.deepEqual(render(corpus, { ...input }).readerParts, renderSkyV4ReaderRoute(corpus, input).readerParts);
}
assert.equal(renderSkyV4StudioPreview(updated, { ...input, contentKey: key }).mainBody, expected);
const facts = skyPlacementVariableFacts(input);
assert.equal(skyPlacementVariableFacts({}).planetTitle, "");
assert.equal(skyPlacementVariableFacts({}).signTitle, "");
assert.equal(skyPlacementVariableSegments(raw, facts).map((part: any) => part.text).join(""), expected);
assert(skyPlacementVariableSegments(raw, skyPlacementVariableFacts({ planet: "sun", sign: "aries" })).some((part: any) => part.name === "entryDate" && !part.available));
for (const bad of ["{{fallback.hook}}", "{{ascendant}}", "{{#planetTitle}}", "{{signTitle", "{{signTitle}}}}", "{{constructor}}", "{{planetTitle.x}}"])
  assert(skyPlacementVariableIssues(bad).length, bad);
assert.deepEqual(skyPlacementVariableIssues("{{ planetTitle }} in {{signTitle}}"), []);
assert(isSkyPlacementVariableField(key, "fallback.sections.custom"));
assert(!isSkyPlacementVariableField(key, "tldrWhat"));
assert(!isSkyPlacementVariableField("sky-placement/retrograde/saturn", "Body"));
assert.equal(JSON.stringify(corpus), before);
console.log("PASS: Sky inline variables in article/custom fallback, direct/Rx, missing facts, unused-path isolation, editor/Node/browser/shipped parity, unchanged corpus.");
