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
assert.match(controls, /returnContext\?\.saveReturns && text === "Save & publish"/u, "Only a trip taken to fix one referenced source may turn publishing into a return.");
assert.match(returnFlow, /saveReturns\?: boolean/u, "A recorded way back must state whether saving returns to the parent.");
assert.match(controls, /returnToStudioParentEditor/u, "Nested editor close must return to the parent authoring context.");
assert.match(controls, /text\.includes\("Not live"\)[\s\S]*"Inactive"/u, "Legacy button statuses must normalize Not live to Inactive.");
assert.match(controls, /ariaLabel\?\.startsWith\("Close"\) && !\/\[A-Za-z\]\/u\.test\(text\)/u, "Labeled close controls with visible words must not shrink to the icon-button treatment.");

assert.match(compatibility, /\.admin-status/u, "Legacy status compatibility must cover old status pills.");
assert.match(compatibility, /\.admin-editor-save-state/u, "Legacy editor footer state must be normalized before it can surface to an editor.");
assert.match(compatibility, /status-draft/u, "Legacy draft pills must resolve to Draft, not a second publication vocabulary.");
assert.match(compatibility, /Published but unwired/u, "Published-but-unwired notices must use their actual condition.");
assert.match(compatibility, /Draft saved/u, "Saved draft feedback must not append a second publication status.");
assert.match(compatibility, /admin-status-guide/u, "The legacy status guide must be rewritten to the canonical vocabulary.");
assert.doesNotMatch(compatibility, /Not live/u, "The compatibility adapter must construct the transport phrase without adding another raw legacy occurrence.");

assert.doesNotMatch(rail, /rememberStudioEditorReturn/u, "One mechanism records the way back. A second copy in the rail loses the template's unsaved writing.");
assert.match(
  dashboard,
  /setSelectedTemplateVariableName\(parentVariableName\); setSelectedTemplateVariableSourceId\(parentVariableSource\)/u,
  "Returning from a variable's source must restore the parent template row, its unsaved writing, and the selected variable."
);
assert.match(rail, /StudioIconButton[\s\S]*admin-variables-rail-close/u, "Variables rail must use the shared icon-button component.");
assert.match(returnFlow, /notice\.contentKey !== context\.childContentKey/u, "Save-and-return must wait for the exact edited source.");

// Opening another row from inside the editor must record a way back, so no
// control can silently replace the row the owner is writing on.
assert.match(dashboard, /async function openFromEditor\(destinationContentKey: string/u, "Content Studio must route in-editor navigation through one guarded helper.");
assert.match(dashboard, /parentDraft\.contentKey === destinationContentKey/u, "Editing a field on the row already open must not be treated as navigation.");
const openFromEditorBody = dashboard.slice(
  dashboard.indexOf("  async function openFromEditor("),
  dashboard.indexOf("\n  }\n", dashboard.indexOf("  async function openFromEditor("))
);
// Read from the helper's own body rather than a character window, which counted the helper's
// growth as a missing way back.
assert.match(
  openFromEditorBody,
  /rememberStudioEditorReturn\(\{ childContentKey: destinationContentKey/u,
  "openFromEditor must register the parent editor as the destination's way back."
);
assert.equal(
  (dashboard.match(/rememberStudioEditorReturn\(/gu) ?? []).length,
  (openFromEditorBody.match(/rememberStudioEditorReturn\(/gu) ?? []).length,
  "The dashboard records the way back only inside openFromEditor. Route new navigation through it instead of repeating the parent capture."
);
// Controls rendered inside the editor are the ones that can replace the row
// being written on. Page surfaces stay visible behind the editor and keep their
// own navigation. Guarded helpers register the way back themselves.
const editorStart = dashboard.indexOf("  function renderEditor() {");
assert.ok(editorStart > 0, "The editor render boundary must stay findable for the navigation contract.");
const editorBody = dashboard.slice(editorStart, dashboard.indexOf("\n  }\n", dashboard.indexOf("</>\n    );", editorStart)));
const guardedHelpers = /openFromEditor\(|openSharedSeasonSource\(|openCalendarWritingSource\(/u;
const unguardedNavigation = editorBody
  .split("\n")
  .filter((line) => /(?:openRow|openContentKeyRow)\(/u.test(line) && !guardedHelpers.test(line))
  .map((line) => line.trim().slice(0, 110));
assert.deepEqual(
  unguardedNavigation,
  [],
  "Every Edit or Open control inside the editor must route through openFromEditor so the owner keeps a named way back."
);
assert.ok(
  (editorBody.match(/openFromEditor\(/gu) ?? []).length >= 5,
  "The editor's in-place navigation controls must keep routing through openFromEditor."
);
assert.doesNotMatch(
  adminSourceFiles(adminSrc).map((file) => fs.readFileSync(file, "utf8")).join("\n"),
  /Edit linked source/u,
  "A control that opens a different content key must name the destination, not say Edit linked source."
);

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
assert.match(dashboard, /StudioIconButton[\s\S]*admin-mobile-nav-toggle/u, "The mobile navigation control must use the shared icon-button component.");
assert.match(css, /\.admin-mobile-nav-toggle/u, "The mobile navigation toggle must share the icon-button geometry.");
assert.doesNotMatch(css, /:not\(\.admin-mobile-nav-toggle\)/u, "The mobile navigation toggle must not be excluded from icon-button sizing.");
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

assert.doesNotMatch(css, /--admin-/u, "Shared Content Studio components must not depend on the disconnected legacy admin token set.");
assert.doesNotMatch(css, /font-family:\s*var\(--font-(?:body|ui|display|mono)\)/u, "Shared Studio controls must use the semantic label font; narrative paragraphs use the body font.");
assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/iu, "Component consistency CSS must not introduce raw colors.");
assert.doesNotMatch(css, /font-family:\s*(?:"|'|ui-|system-ui)/u, "Component consistency CSS must use Design System font tokens.");

console.log("Content Studio component consistency contract passed.");
