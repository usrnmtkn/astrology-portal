import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rowSelectionPath = path.join(root, "apps/admin/src/admin-row-selection.css");
const readabilityPath = path.join(root, "apps/admin/src/admin-content-readability.css");

const rowSelection = fs.readFileSync(rowSelectionPath, "utf8");
const readability = fs.readFileSync(readabilityPath, "utf8");

const requiredRowSelectionSnippets = [
  '@import "./admin-content-readability.css";',
  ".admin-dashboard .admin-col-select,",
  ".admin-dashboard .admin-content-row-check,",
  ".admin-dashboard .admin-content-bulk-bar {",
  "display: none !important;"
];

const requiredReadabilitySnippets = [
  ".admin-dashboard .admin-content-table--browse {",
  "table-layout: fixed;",
  "td.admin-col-source small,",
  "text-overflow: ellipsis;",
  "white-space: nowrap;",
  ".admin-dashboard .admin-content-table--browse td.admin-col-edit button {",
  "width: 100%;",
  ".admin-dashboard .admin-post-editor {",
  "gap: var(--admin-space-4xl);",
  ".admin-dashboard .admin-metadata-fields {",
  "padding: var(--admin-space-2xl);",
  ".admin-dashboard .admin-natal-placement-selectors {",
  "min-width: 0;",
  ".admin-dashboard .admin-editor-savebar:has(.admin-publish-button) {",
  "grid-template-columns: repeat(2, minmax(0, 1fr));",
  ".admin-dashboard .admin-editor-savebar:has(.admin-publish-button) .admin-publish-button {",
  "grid-column: 1 / -1;"
];

for (const snippet of requiredRowSelectionSnippets) {
  if (!rowSelection.includes(snippet)) {
    throw new Error(`Content Studio row-selection contract is missing: ${snippet}`);
  }
}

for (const snippet of requiredReadabilitySnippets) {
  if (!readability.includes(snippet)) {
    throw new Error(`Content Studio readability contract is missing: ${snippet}`);
  }
}

console.log("Content Studio readability contract: PASS");
