#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const controls = fs.readFileSync(new URL("../apps/admin/src/StudioControls.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../apps/admin/src/studio-typography.css", import.meta.url), "utf8");

assert.match(
  controls,
  /import "\.\/studio-typography\.css";/u,
  "Studio controls must load the Content Studio typography layer."
);

for (const token of ["--font-display", "--font-body", "--font-label", "--font-ui", "--font-glyph"]) {
  assert.ok(css.includes(`var(${token})`), `Content Studio typography must consume ${token}.`);
}

assert.match(
  css,
  /label:not\(:has\(> input\[type="checkbox"\]\)\)/u,
  "Form labels must receive the semantic label treatment without forcing checkbox copy into tiny caps."
);
assert.match(
  css,
  /text-transform: uppercase;/u,
  "Form labels and eyebrows must use the tiny uppercase Design System treatment."
);
assert.match(
  css,
  /\.admin-field-hint[\s\S]*font-family: var\(--font-body\)/u,
  "Helper copy must remain narrative body text rather than metadata typography."
);
assert.match(
  css,
  /input:not\(\[type="checkbox"\]\)[\s\S]*font-family: var\(--font-body\)/u,
  "Editable field values must use the body face."
);
assert.match(
  css,
  /\.admin-natal-source-card h4[\s\S]*font-family: var\(--font-display\)/u,
  "Source-card titles must use the display face."
);
assert.doesNotMatch(
  css,
  /font-family:\s*(?:"|'|ui-|system-ui|[A-Za-z]+,)/u,
  "The Content Studio typography layer must use Design System font tokens instead of raw font stacks."
);

console.log("Content Studio typography Design System contract passed.");
