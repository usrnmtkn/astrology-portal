#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(path.join(os.tmpdir(), "tldrastro-report-fixture-"));
const outputFile = path.join(tempDir, "fixture.cjs");

await build({
  stdin: {
    contents: `
      import React from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import fixture from "./apps/web/src/components/reports/fixtures/report-article.fixture.json";
      import { ReportArticle } from "./apps/web/src/components/reports/ReportArticle.tsx";
      export const markup = renderToStaticMarkup(<ReportArticle report={fixture} />);
    `,
    loader: "tsx",
    resolveDir: repoRoot,
    sourcefile: "report-article-fixture-test-entry.tsx"
  },
  bundle: true,
  format: "cjs",
  logLevel: "error",
  platform: "node",
  outfile: outputFile
});
const { markup } = createRequire(import.meta.url)(outputFile);

for (const block of ["cover", "chapters", "image-slot", "key-dates", "colophon"]) {
  assert.match(markup, new RegExp(`data-report-block="${block}"`, "u"));
}
assert.match(markup, /FIXTURE_ONLY_REPORT_TITLE/u);
assert.match(markup, /FIXTURE_ONLY_CHAPTER_PARAGRAPH_ONE/u);
assert.match(markup, /During this season, Uranus squares your natal Mercury\./u);
assert.match(markup, /Your Solar Return Sun falls in your natal 4th house\./u);
assert.match(markup, /aria-haspopup="dialog"/u);
assert.match(markup, /FIXTURE_ONLY_FACTS_ENGINE/u);
assert.doesNotMatch(markup, /—/u);

const reportCss = await readFile(path.join(repoRoot, "apps/web/src/styles/report-article.css"), "utf8");
assert.match(reportCss, /@media \(max-width: 700px\)/u);
assert.match(reportCss, /\.report-key-date-modal \.modal-positioner/u);

await rm(tempDir, { recursive: true });

console.log("report article fixture renders cover, chapters, attributions, key dates, colophon, and mobile sheet rules");
