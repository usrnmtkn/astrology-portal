#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "apps/admin/src/admin-components.css"), "utf8");
const editorUx = fs.readFileSync(path.join(root, "apps/admin/src/admin-content-studio-ux-compat.css"), "utf8");

assert.match(dashboard, /const readerUse = aspectContext\?\.label \?\? contentCategoryForRow\(row\)/u);
assert.match(dashboard, /className="admin-review-queue-use admin-aspect-context-pill">\{readerUse\}<\/span>/u);
assert.doesNotMatch(dashboard, /<span className="ui-pill admin-status">\{contentClassLabel\(contentClassForRow\(row\)\)\}<\/span>/u);
assert.doesNotMatch(dashboard, /<span className="ui-pill admin-status" title=\{rowRole\.detail\}>\{rowRole\.label\}<\/span>/u);
assert.match(dashboard, /selectedRow\s*\? `Edit \$\{rowTitle\(selectedRow\)\}`/u);
assert.match(dashboard, /className="admin-editor-context-line"/u);
assert.match(dashboard, /<span><strong>Use:<\/strong> \{editorUseLabel\}<\/span>/u);
assert.match(dashboard, /<code title=\{currentDraft\.contentKey\}>\{currentDraft\.contentKey\}<\/code>/u);

const marker = "/* Content Studio usability hierarchy: title first, context second, implementation details last. */";
const rules = css.slice(css.lastIndexOf(marker));
assert.ok(rules.includes("-webkit-line-clamp: unset;"));
assert.ok(rules.includes("overflow: visible;"));
assert.ok(rules.includes(".admin-editor-context-line"));

assert.match(
  css,
  /^@import "\.\/admin-content-studio-ux-compat\.css";/u,
  "The production-loaded admin component stylesheet must load the Content Studio editor UX layer."
);
assert.match(editorUx, /Production Content Studio editor redesign: editorial task first/u);
assert.match(editorUx, /> \.admin-sky-edition-fields \{\s*order: 3;/u, "Editable copy must precede preview and technical verification.");
assert.match(editorUx, /\[aria-label="Production-parity SKY V4 preview"\][\s\S]*order: 7;/u, "Canonical resolver preview must follow the editorial copy loop.");
assert.match(editorUx, /admin-editor-toolbar-actions > \.admin-aspect-context-pill[\s\S]*display: none;/u, "The duplicate aspect-context pill must stay hidden in the editor header.");
assert.match(editorUx, /admin-editor-savebar \.admin-danger-button[\s\S]*margin: 0 auto 0 0;/u, "Archive must remain isolated from the save/publish action cluster.");
assert.match(editorUx, /code\[title\^="sky\.aspect\."\]/u, "Calendar Aspect editors need the dedicated wider desktop workspace rule.");

console.log("Content Studio usability hierarchy passed.");
