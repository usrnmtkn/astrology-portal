#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "apps/admin/src/admin-components.css"), "utf8");

assert.equal((dashboard.match(/className="admin-reader-destination-line"/gu) ?? []).length, 1, "Personal and House Transit cards should share one destination renderer.");
assert.match(dashboard, /const sourceReaderDestination = skyWriteupWorkspaceView === "transits-to-natal"/u);
assert.match(dashboard, /Friends → Transits → Active for \{\{Name\}\}/u);
assert.match(dashboard, /Friends → Transits → Where it lands/u);
assert.match(dashboard, /Friends → Transits → Between you two/u);
assert.match(dashboard, /You → Personal Transits/u);
assert.match(dashboard, /You → House Transits/u);
assert.match(dashboard, /const editorReaderDestination =/u);
assert.match(dashboard, /className="admin-editor-reader-destination"/u);
assert.match(dashboard, /<strong>Where readers see this:<\/strong>/u);
assert.match(css, /Reader destination labels: explain the app destination before the technical key/u);
assert.match(css, /\.admin-dashboard \.admin-reader-destination-line/u);
assert.match(css, /\.admin-dashboard \.admin-editor-reader-destination/u);

console.log("Content Studio reader destination labels passed.");
