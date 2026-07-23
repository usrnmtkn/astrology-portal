import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(import.meta.dirname, "..");
const articlePath = path.join(
  repoRoot,
  "apps/web/src/content/sky-writing/sky-articles-authored-v1.json"
);
const articles = JSON.parse(fs.readFileSync(articlePath, "utf8"));
const bundlePath = path.join(os.tmpdir(), `sky-writing-package-${Date.now()}.mjs`);

await build({
  absWorkingDir: repoRoot,
  bundle: true,
  entryPoints: ["apps/web/src/content/skyWriting.ts"],
  format: "esm",
  outfile: bundlePath,
  platform: "node",
  target: "node20",
  logLevel: "silent"
});

const { formatSkyWritingAspectBeat, resolveSkyWritingArticle } = await import(
  pathToFileURL(bundlePath).href
);

assert.equal(articles.length, 216, "Sky package must expose all 216 author-final units.");
assert.equal(new Set(articles.map((article) => article.key)).size, 216, "Sky keys must be unique.");
assert.equal(articles.filter((article) => article.type === "direct").length, 120);
assert.equal(articles.filter((article) => article.type === "retrograde").length, 96);

const forbidden = /for everyone at once|TODAY left/iu;

for (const article of articles) {
  const [, planet, sign, suffix] = article.key.split(".");
  const placement = {
    planet,
    sign,
    motion: suffix === "rx" ? "retrograde" : "direct",
    transitEnd: "2026-08-09T00:00:00.000Z",
    retrogradeStart: "2026-06-29T00:00:00.000Z",
    retrogradeEnd: "2026-07-23T00:00:00.000Z",
    retrogradeShadowStart: "2026-06-12T00:00:00.000Z",
    retrogradeShadowEnd: "2026-08-06T00:00:00.000Z",
    cazimiDate: "2026-07-12T00:00:00.000Z"
  };
  const rendered = resolveSkyWritingArticle(placement, [{
    aspect: "square",
    dateLine: "Jul 21–24",
    from: "Mercury",
    to: "Saturn"
  }]);

  assert.ok(rendered, `${article.key} must resolve.`);
  assert.equal(rendered.layer, "authored", `${article.key} must never fall through to synthesis.`);
  assert.ok(rendered.sourceKeys.includes(article.key), `${article.key} must preserve its source key.`);
  assert.ok(rendered.paragraphs.length > 0, `${article.key} must render display-final text.`);
  assert.doesNotMatch(rendered.paragraphs.join("\n"), forbidden, `${article.key} contains retired copy.`);

  if (article.type === "retrograde") {
    assert.ok(article.key.endsWith(".rx"));
    assert.equal(rendered.paragraphs[1], article.header.what, `${article.key} must serve its Rx guide.`);
    assert.ok(
      rendered.paragraphs.includes(article.sections.s1_header),
      `${article.key} must retain authored section headers.`
    );
  }
}

assert.equal(
  formatSkyWritingAspectBeat({
    aspect: "square",
    dateLine: "Jul 21–24",
    from: "Mercury",
    to: "Saturn"
  }),
  "",
  "A computed aspect without authored narration must render no line, never a bare label."
);

const mercuryCancerRx = resolveSkyWritingArticle({
  planet: "Mercury",
  sign: "Cancer",
  motion: "retrograde",
  retrogradeStart: "2026-06-29T00:00:00.000Z",
  retrogradeEnd: "2026-07-23T00:00:00.000Z",
  retrogradeShadowEnd: "2026-08-06T00:00:00.000Z",
  cazimiDate: "2026-07-12T00:00:00.000Z"
});

assert.ok(mercuryCancerRx?.sourceKeys.includes("sky.mercury.cancer.rx"));
assert.match(mercuryCancerRx?.paragraphs.join("\n") ?? "", /THE PAST GETS TALKATIVE/u);
assert.match(mercuryCancerRx?.paragraphs.join("\n") ?? "", /THE COLLECTIVE REVIEW/u);
assert.doesNotMatch(mercuryCancerRx?.paragraphs.join("\n") ?? "", /The messenger planet moves into Cancer/u);

console.log("Sky writing package contract passed: 216 authored placement routes.");
