#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(repoRoot, "apps/admin/src/studio-system.css"), "utf8");

assert.match(css, /#root \.admin-dashboard \.admin-nav\s*\{[^}]*gap:\s*var\(--workspace-card-padding\)/su,
  "The navigation groups must keep a visible section break from shared Studio tokens.");
assert.match(css, /#root \.admin-dashboard \.admin-nav-section\s*\{[^}]*gap:\s*var\(--space-1\)/su,
  "Primary sidebar rows must use the tighter shared vertical rhythm.");
assert.match(css, /#root \.admin-dashboard \.admin-nav button\s*\{[^}]*width:\s*100%[^}]*min-height:\s*var\(--studio-nav-height\)[^}]*justify-content:\s*start[^}]*text-align:\s*start/su,
  "Primary navigation must be full-width, left aligned, and use the shared nav height.");
assert.match(css, /#root \.admin-dashboard \.admin-nav-workspace-group\s*\{[^}]*padding-inline-start:\s*var\(--workspace-panel-inset\)/su,
  "Subcategories must express hierarchy through indentation from the shared panel inset.");
assert.doesNotMatch(css, /admin-nav-workspace-group button[^}]*font-size:\s*var\(--admin-ui-type-label\)/su,
  "Subcategory labels must not shrink below the shared Studio control type.");

console.log("Admin sidebar typography/spacing contract passed.");
