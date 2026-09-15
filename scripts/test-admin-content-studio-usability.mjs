#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(root, "apps/admin/src", file), "utf8");
const dashboard = read("GeneratedContentAdminDashboard.tsx");
const css = read("studio-system.css");
const browse = read("AdminBrowseComponents.tsx");
const primitives = read("AdminStudioPrimitives.tsx");

// Reader context remains next to the title; technical keys live in disclosure details.
assert.match(dashboard, /kind: aspectContext\?\.label \?\? contentCategoryForRow\(row\)/u);
assert.match(browse, /admin-content-row-title">\{row.title\}/u);
assert.match(browse, /admin-content-type-label admin-field-hint">\{row.kind\}/u);
assert.match(browse, /admin-content-expanded-row" hidden=\{!expanded\}/u);
assert.match(browse, /admin-content-row-key">\{row.contentKey\}/u);
assert.match(dashboard, /selectedRow\s*\? `Edit \$\{rowTitle\(selectedRow\)\}`/u);
assert.match(dashboard, /className="admin-editor-context-line"/u);
assert.match(dashboard, /title=\{aspectContext\?\.detail\}>\{editorUseLabel\}/u);
assert.match(dashboard, /className="admin-editor-key-copy"[\s\S]*?title=\{currentDraft.contentKey\}/u);

// The production dashboard owns the canonical stylesheet. Retired layers must
// never be reintroduced to satisfy historical implementation assertions.
assert.match(dashboard, /import "\.\/studio-system\.css";/u);
assert.doesNotMatch(dashboard + primitives, /import ["'][^"']*(?:admin-components|admin-content-studio-ux-compat|admin-content-studio-editor-redesign)\.css/u);
// The context label can share the canonical metadata rule instead of repeating
// the same font declaration in its component layout rule.
assert.match(css, /\.admin-editor-context-line(?:\s|[,)])[^{}]*\{[^}]*font-size: var\(--type-meta-size\)/u);
assert.match(css, /\.admin-editor-panel \{[^}]*width: var\(--studio-sheet-width\)/u);
assert.match(css, /\.admin-post-editor \{[^}]*overflow-y: auto;[^}]*padding: var\(--workspace-card-padding\)/u);
assert.match(css, /textarea \{[^}]*min-height: var\(--studio-textarea-height\)/u);
assert.match(css, /\.admin-editor-savebar \{[^}]*flex-shrink: 0;[^}]*padding: var\(--workspace-panel-inset\) var\(--workspace-card-padding\)/u);
assert.match(css, /\.admin-editor-savebar button \{[^}]*width: 100%/u);

console.log("Content Studio usability hierarchy and canonical styles passed.");
