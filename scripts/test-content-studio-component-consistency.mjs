#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminSrc = path.join(repoRoot, "apps/admin/src");
const readAdmin = (name) => fs.readFileSync(path.join(adminSrc, name), "utf8");
const controls = readAdmin("StudioControls.tsx");
const systemCss = readAdmin("studio-system.css");
const css = systemCss.slice(systemCss.indexOf("/* Shared Content Studio component treatments."));
const status = readAdmin("ContentLiveStatus.tsx");
const aspectPatterns = readAdmin("AspectPatternWriteups.tsx");
const dashboard = readAdmin("GeneratedContentAdminDashboard.tsx");
const compatibility = readAdmin("studioStatusCompatibility.ts");
const rail = readAdmin("TemplateVariablesRail.tsx");
const returnFlow = readAdmin("studioEditorReturn.ts");
const natalEditor = readAdmin("NatalPlacementSourceEditor.tsx");
const attention = readAdmin("NeedsAttentionDashboard.tsx");

assert.doesNotMatch(controls, /import "\.\/studio-component-consistency\.css";/u, "Shared controls must use the canonical Studio stylesheet.");
assert.match(dashboard, /import "\.\/studio-system\.css";/u);
assert.match(readAdmin("main.tsx"), /import "\.\/studio-system\.css";/u);
assert.match(controls, /StudioIconButton/u);
assert.match(controls, /StudioStatusBadge/u);
assert.match(controls, /installStudioStatusCompatibility/u, "The shared Studio control layer must install the legacy-status compatibility boundary.");
assert.match(controls, /Save & return/u, "Nested source publication must expose Save & return.");
assert.match(controls, /Save draft & return/u, "Nested source drafts must expose Save draft & return.");
assert.match(controls, /returnToStudioParentEditor/u, "Nested editor close must return to the parent authoring context.");
assert.match(controls, /text\.includes\("Not live"\)[\s\S]*"Inactive"/u, "Legacy button statuses must normalize Not live to Inactive.");
assert.match(controls, /ariaLabel\?\.startsWith\("Close"\)/u, "Visible close buttons must opt into the shared icon-button treatment.");

assert.match(compatibility, /\.admin-status/u, "Legacy status compatibility must cover old status pills.");
assert.match(compatibility, /\.admin-editor-save-state/u, "Legacy editor footer state must be normalized before it can surface to an editor.");
assert.match(compatibility, /status-draft/u, "Legacy draft pills must resolve to Draft, not a second publication vocabulary.");
assert.match(compatibility, /Published but unwired/u, "Published-but-unwired notices must use their actual condition.");
assert.match(compatibility, /Draft saved/u, "Saved draft feedback must not append a second publication status.");
assert.match(compatibility, /admin-status-guide/u, "The legacy status guide must be rewritten to the canonical vocabulary.");
assert.doesNotMatch(compatibility, /Not live/u, "The compatibility adapter must construct the transport phrase without adding another raw legacy occurrence.");

assert.match(rail, /rememberStudioEditorReturn/u);
assert.match(rail, /onEditSource\(parentSourceRow\)/u, "Variable source editing must preserve its parent template row.");
assert.match(rail, /StudioIconButton[\s\S]*admin-variables-rail-close/u, "Variables rail must use the shared icon-button component.");
assert.match(returnFlow, /notice\.contentKey !== context\.childContentKey/u, "Save-and-return must wait for the exact edited source.");

for (const label of ["Live", "Ready", "Draft", "Inactive", "Archived", "Retired", "Error", "Unavailable"]) {
  assert.ok(status.includes(`\"${label}\"`) || status.includes(`>${label}<`), `Missing canonical Content Studio status: ${label}`);
}
assert.doesNotMatch(status, />\{status\.label\}</u, "The raw Live/Not live transport label must not be shown directly.");
assert.doesNotMatch(natalEditor, /Draft saved · Not live/u, "Draft feedback must not invent a second publication-status vocabulary.");
assert.doesNotMatch(attention, /label: "Not live"/u, "Needs Attention must describe unwired content by its actual condition.");

// A few transport-era strings remain in the very large dashboard source while
// its call sites are migrated. They are forced through the shared compatibility
// boundary above. Pin both the files and occurrence counts so no additional
// legacy status can enter Content Studio unnoticed.
function adminSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return adminSourceFiles(absolute);
    return /\.(?:ts|tsx)$/u.test(entry.name) ? [absolute] : [];
  });
}
const notLiveFiles = adminSourceFiles(adminSrc)
  .filter((file) => fs.readFileSync(file, "utf8").includes("Not live"))
  .map((file) => path.relative(adminSrc, file).replaceAll(path.sep, "/"))
  .sort();
assert.deepEqual(
  notLiveFiles,
  ["AspectPatternWriteups.tsx", "ContentLiveStatus.tsx", "GeneratedContentAdminDashboard.tsx", "StudioControls.tsx"],
  "No new Content Studio source may introduce the legacy Not live vocabulary. Use the canonical status components."
);
assert.equal((status.match(/Not live/gu) ?? []).length, 2, "ContentLiveStatus may contain Not live only in its transport type/validator, never presentation.");
assert.equal((aspectPatterns.match(/Not live/gu) ?? []).length, 1, "Aspect Patterns has one legacy label and StudioButton must normalize it to Inactive.");
assert.equal((dashboard.match(/Not live/gu) ?? []).length, 10, "The legacy dashboard occurrence count is pinned; migrate existing call sites instead of adding more.");
assert.equal((controls.match(/Not live/gu) ?? []).length, 2, "StudioControls may mention Not live only in the shared normalization expression.");

assert.match(css, /\.studio-icon-button/u);
assert.match(css, /\.admin-editor-close/u);
assert.match(css, /\.admin-variables-rail-close/u);
assert.doesNotMatch(css, /button\[aria-label\^="Close/u, "Invisible backdrop dismiss buttons must not receive visible close-button styling.");
assert.match(css, /\.studio-status-badge/u);

for (const token of [
  "--workspace-selected",
  "--workspace-on-selected",
  "--workspace-control-icon-space",
  "--workspace-control-radius",
  "--workspace-positive",
  "--workspace-danger",
  "--font-body",
  "--type-meta-size"
]) assert.ok(css.includes(`var(${token})`), `Shared Content Studio components must consume ${token}.`);

assert.doesNotMatch(css, /--admin-/u, "Shared Content Studio components must not depend on the disconnected legacy admin token set.");
assert.doesNotMatch(css, /font-family:\s*var\(--font-(?:label|ui|display)\)/u, "Shared Studio controls must use the Studio UI sans rather than reader/mono aliases.");
assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/iu, "Component consistency CSS must not introduce raw colors.");
assert.doesNotMatch(css, /font-family:\s*(?:"|'|ui-|system-ui)/u, "Component consistency CSS must use Design System font tokens.");

console.log("Content Studio component consistency contract passed.");
