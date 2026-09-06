#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "apps/admin/src/admin-components.css"), "utf8");
const primitives = fs.readFileSync(path.join(root, "apps/admin/src/AdminStudioPrimitives.tsx"), "utf8");
const workflowCss = fs.readFileSync(path.join(root, "apps/admin/src/admin-content-studio-ux-compat.css"), "utf8");
const editorCss = fs.readFileSync(path.join(root, "apps/admin/src/admin-content-studio-editor-redesign.css"), "utf8");

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

// AdminStudioPrimitives is eagerly imported by the real /admin/content dashboard.
// Keep both workflow and redesign layers on that production path.
assert.match(primitives, /import "\.\/admin-content-studio-ux-compat\.css";/u);
assert.match(primitives, /import "\.\/admin-content-studio-editor-redesign\.css";/u);

assert.match(workflowCss, /admin-editor-toolbar-actions > \.admin-aspect-context-pill[\s\S]*display: none;/u);
assert.match(workflowCss, /> \.admin-sky-edition-fields \{\s*order: 2;/u, "Editable copy must precede preview and technical verification.");
assert.match(workflowCss, /\[aria-label="Production-parity SKY V4 preview"\] \{\s*order: 6;/u, "Canonical resolver preview must follow the editorial copy loop.");

assert.match(editorCss, /code\[title\^="sky\.aspect\."\]/u, "Calendar Aspect editors need a dedicated wider desktop workspace.");
assert.match(editorCss, /width: min\(78vw, 1040px\)/u);
assert.match(editorCss, /admin-content-role-panel[\s\S]*padding: var\(--admin-space-2xl\) var\(--admin-space-4xl\)/u);
assert.match(editorCss, /admin-sky-edition-fields textarea[\s\S]*min-height: 170px/u, "Editable copy needs a usable writing target.");
assert.match(editorCss, /\[aria-label="Rendered fallback preview"\][\s\S]*grid-column: 1/u);
assert.match(editorCss, /\[aria-label="Review fallback changes"\][\s\S]*grid-column: 2/u);
assert.match(editorCss, /code\[title\^="sky\.aspect\."\][\s\S]*admin-editor-savebar[\s\S]*admin-danger-button[\s\S]*margin: 0 auto 0 0/u, "Calendar Aspect Archive must stay separated from save/publish actions.");

console.log("Content Studio usability hierarchy passed.");
