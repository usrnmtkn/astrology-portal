#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const controls = fs.readFileSync(new URL("../apps/admin/src/StudioControls.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../apps/admin/src/studio-typography.css", import.meta.url), "utf8");
const skyVariableCss = fs.readFileSync(new URL("../apps/admin/src/sky-variable-key.css", import.meta.url), "utf8");
const natalPreviewCss = fs.readFileSync(new URL("../apps/admin/src/natal-reader-preview.css", import.meta.url), "utf8");

assert.match(
  controls,
  /import "\.\/studio-typography\.css";/u,
  "Studio controls must load the Content Studio typography layer."
);

for (const token of ["--font-body", "--font-mono", "--font-glyph"]) {
  assert.ok(css.includes(`var(${token})`), `Content Studio typography must consume ${token}.`);
}

assert.match(
  css,
  /:is\([\s\S]*h1[\s\S]*h6[\s\S]*font-family: var\(--font-body\)/u,
  "Studio headings must use the reviewed Studio UI sans instead of reader-display typography."
);
assert.match(
  css,
  /label:not\(:has\(> input\[type="checkbox"\]\)\)[\s\S]*font-family: var\(--font-body\)/u,
  "Form labels must use the Studio UI sans."
);
assert.match(
  css,
  /button,[\s\S]*font-family: var\(--font-body\)/u,
  "Buttons and Studio actions must use the Studio UI sans."
);
assert.match(
  css,
  /\.admin-field-hint[\s\S]*font-size: var\(--text-body\)/u,
  "Helper copy must remain readable body text."
);
assert.match(
  css,
  /input:not\(\[type="checkbox"\]\)[\s\S]*font-family: var\(--font-body\)/u,
  "Editable field values must use the body face."
);
assert.match(
  css,
  /:is\(code, pre\)[\s\S]*font-family: var\(--font-mono\)/u,
  "Monospace must be reserved for exact identifiers and technical snippets."
);
assert.doesNotMatch(
  css,
  /text-transform:\s*uppercase/u,
  "Studio labels, eyebrows, controls, and table headings must remain sentence case."
);
assert.doesNotMatch(
  css,
  /font-family:\s*var\(--font-(?:label|ui|display)\)/u,
  "Studio text roles must not fall back to the reader display face or mono label/UI aliases."
);
assert.doesNotMatch(
  css,
  /font-family:\s*(?:"|'|ui-|system-ui|[A-Za-z]+,)/u,
  "The Content Studio typography layer must use Design System font tokens instead of raw font stacks."
);

for (const [name, source] of [["Sky phrase rows", skyVariableCss], ["Natal reader preview", natalPreviewCss]]) {
  assert.doesNotMatch(source, /--admin-/u, `${name} must not depend on the disconnected legacy admin token set.`);
  assert.doesNotMatch(source, /!important/u, `${name} must not override the shared Studio component geometry.`);
  assert.ok(source.includes("var(--workspace-"), `${name} must use the shared Studio workspace tokens.`);
}

console.log("Content Studio typography and component-token contract passed.");
