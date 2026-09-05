#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "apps/admin/src/admin-components.css"), "utf8");

assert.match(dashboard, /const readerUse = aspectContext\?\.label \?\? contentCategoryForRow\(row\)/u);
assert.match(dashboard, /className="admin-review-queue-use">\{readerUse\}<\/span>/u);
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

console.log("Content Studio usability hierarchy passed.");
