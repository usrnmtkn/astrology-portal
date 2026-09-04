#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(repoRoot, "apps/admin/src/admin-components.css"), "utf8");

const marker = "/* Content Studio sidebar rhythm: hierarchy comes from indentation, not type scale. */";
const markerIndex = css.lastIndexOf(marker);
assert.ok(markerIndex >= 0, "Admin sidebar rhythm override must be present in the last-loaded component stylesheet.");
const rules = css.slice(markerIndex);

assert.match(rules, /\.admin-dashboard \.admin-nav\s*\{[^}]*gap:\s*var\(--admin-space-lg\)/su,
  "The navigation groups must keep a compact but visible section break.");
assert.match(rules, /\.admin-dashboard \.admin-nav-section\s*\{[^}]*gap:\s*var\(--admin-space-2xs\)/su,
  "Primary sidebar rows must use the tighter shared vertical rhythm.");
assert.match(rules, /\.admin-dashboard \.admin-nav button,\s*\.admin-dashboard \.admin-public-link\s*\{[^}]*font-size:\s*var\(--admin-ui-type-body\)[^}]*justify-content:\s*flex-start[^}]*min-height:\s*36px[^}]*text-align:\s*left[^}]*width:\s*100%/su,
  "Primary navigation must be body-sized, compact, full-width, and left aligned.");
assert.match(rules, /\.admin-dashboard \.admin-nav-workspace-group\s*\{[^}]*gap:\s*var\(--admin-space-2xs\)[^}]*margin-left:\s*calc\(16px \+ var\(--admin-space-xl\)\)/su,
  "Subcategories must express hierarchy through indentation and the same tight spacing.");
assert.match(rules, /\.admin-dashboard \.admin-nav-workspace-group button\s*\{[^}]*font-size:\s*var\(--admin-ui-type-body\)[^}]*min-height:\s*36px[^}]*padding-left:\s*0/su,
  "Subcategory labels must use the same font size and row height as parent navigation and align to the indented text rail.");
assert.doesNotMatch(rules, /admin-nav-workspace-group button[^}]*font-size:\s*var\(--admin-ui-type-label\)/su,
  "The final subcategory rule must not shrink child labels below their parent font size.");

console.log("Admin sidebar typography/spacing contract passed.");
