#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const controls = fs.readFileSync(new URL("../apps/admin/src/StudioControls.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../apps/admin/src/studio-system.css", import.meta.url), "utf8");

assert.doesNotMatch(
  controls,
  /import\s+["'][^"']+\.css["']/u,
  "Studio controls must inherit typography from the canonical studio-system stylesheet."
);

for (const token of ["--font-body", "--font-display", "--font-label", "--font-mono"]) {
  assert.ok(css.includes(`var(${token})`), `Content Studio typography must consume ${token}.`);
}

assert.match(
  css,
  /:is\(h1,h2,h3,h4,h5,h6\)\s*\{[^}]*font-family:\s*var\(--font-display\)/u,
  "Studio headings must use the reviewed display role."
);
assert.match(
  css,
  /:is\(summary,label,legend,dt,th[\s\S]*font-family:\s*var\(--font-label\)/u,
  "Form labels must use the Studio label role."
);
assert.match(
  css,
  /:where\(input:not\(\[type="checkbox"\]\)[\s\S]*font-family:\s*var\(--font-body\)/u,
  "Editable field values must use the body face."
);
assert.match(
  css,
  /:is\(code,pre\)\s*\{[^}]*font-family:\s*var\(--font-mono\)/u,
  "Monospace must be reserved for exact identifiers and technical snippets."
);
assert.doesNotMatch(
  css,
  /text-transform:\s*uppercase/u,
  "Studio labels, eyebrows, controls, and table headings must remain sentence case."
);

for (const selector of [
  ".admin-sky-placement-template > ol > li",
  ".admin-sky-template-comparison",
  ".admin-sky-placement-sources",
  ".admin-natal-reader-preview-part",
  ".admin-review-copy-editor",
  ".aspect-writeups-page",
  ".aspect-writeups-compare",
  ".aspect-pattern-card-grid",
  ".aspect-diagnostics-raw pre"
]) {
  assert.ok(css.includes(selector), `studio-system.css must style ${selector}; disconnected sheets are not live.`);
}

assert.match(css, /container-name:\s*aspect-writeups/u);
assert.match(
  css,
  /@container aspect-writeups \(max-width:\s*1120px\)[\s\S]*?aspect-writeups-layout[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/u,
  "Aspect Patterns must collapse inside its available content container."
);

console.log("Content Studio typography and shipped-system contract passed.");
