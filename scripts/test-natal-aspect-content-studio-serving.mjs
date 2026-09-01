#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");

const generatedSection = appSource.match(
  /function generatedNatalAspectSection\([\s\S]*?\n\}\n\nfunction natalAspectDetailArticle/u,
)?.[0] ?? "";

assert.ok(generatedSection, "The reader must define a Content Studio natal-aspect lookup.");
assert.ok(
  generatedSection.includes("`fallback-hook/natal-aspect-lived/${first}/${normalizedAspect}/${second}`"),
  "The reader must request the exact saved natal-aspect hook.",
);
assert.ok(
  generatedSection.includes("`fallback-hook/natal-aspect-lived/${second}/${normalizedAspect}/${first}`"),
  "The reader must support the saved natal-aspect hook in either body order.",
);
assert.match(
  generatedSection,
  /natalAspectContentKey\(first, normalizedAspect, second\)/u,
  "The reader must also request the canonical generated-content alias.",
);
assert.match(
  generatedSection,
  /liveGeneratedContent\(generatedContent, contentKey\)/u,
  "Only runtime-eligible Content Studio rows may override the bundled fallback.",
);
assert.match(
  generatedSection,
  /fullDetailReaderFacingCopy\(generatedContentParagraphs\(generated\)\)/u,
  "The reader must render the full saved Content Studio copy.",
);

const detailArticle = appSource.match(
  /function natalAspectDetailArticle\([\s\S]*?\n\}\n\nfunction skyAspectDisplayTitle/u,
)?.[0] ?? "";

assert.ok(detailArticle, "The reader must define natal-aspect detail selection.");
assert.ok(
  detailArticle.indexOf("generatedNatalAspectSection") < detailArticle.indexOf("normalizeNatalAspectSurface"),
  "Eligible Content Studio copy must take precedence over the bundled fallback renderer.",
);

console.log("Natal aspect Content Studio serving contract passed: exact saved copy overrides bundled fallback in either body order.");
