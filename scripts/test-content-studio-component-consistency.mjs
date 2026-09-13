#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const controls = fs.readFileSync(new URL("../apps/admin/src/StudioControls.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../apps/admin/src/studio-component-consistency.css", import.meta.url), "utf8");
const status = fs.readFileSync(new URL("../apps/admin/src/ContentLiveStatus.tsx", import.meta.url), "utf8");
const rail = fs.readFileSync(new URL("../apps/admin/src/TemplateVariablesRail.tsx", import.meta.url), "utf8");
const returnFlow = fs.readFileSync(new URL("../apps/admin/src/studioEditorReturn.ts", import.meta.url), "utf8");
const natalEditor = fs.readFileSync(new URL("../apps/admin/src/NatalPlacementSourceEditor.tsx", import.meta.url), "utf8");
const attention = fs.readFileSync(new URL("../apps/admin/src/NeedsAttentionDashboard.tsx", import.meta.url), "utf8");

assert.match(controls, /import "\.\/studio-component-consistency\.css";/u);
assert.match(controls, /StudioIconButton/u);
assert.match(controls, /StudioStatusBadge/u);
assert.match(controls, /Save & return/u, "Nested source publication must expose Save & return.");
assert.match(controls, /Save draft & return/u, "Nested source drafts must expose Save draft & return.");
assert.match(controls, /returnToStudioParentEditor/u, "Nested editor close must return to the parent authoring context.");
assert.match(controls, /text\.includes\("Not live"\)[\s\S]*"Inactive"/u, "Legacy button statuses must normalize Not live to Inactive.");
assert.match(controls, /ariaLabel\?\.startsWith\("Close"\)/u, "Visible close buttons must opt into the shared icon-button treatment.");

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
  "--font-label",
  "--type-meta-size"
]) assert.ok(css.includes(`var(${token})`), `Shared Content Studio components must consume ${token}.`);

assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/iu, "Component consistency CSS must not introduce raw colors.");
assert.doesNotMatch(css, /font-family:\s*(?:\"|'|ui-|system-ui)/u, "Component consistency CSS must use Design System font tokens.");

console.log("Content Studio component consistency contract passed.");
