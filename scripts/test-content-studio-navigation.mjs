import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
const closeEditorStart = source.indexOf("  function closeEditor() {");
const navigateStart = source.indexOf("  function navigateAdminPage(");

assert.ok(closeEditorStart >= 0, "Content Studio closeEditor helper must exist.");
assert.ok(navigateStart > closeEditorStart, "Content Studio navigation helper must follow closeEditor.");

const closeEditor = source.slice(closeEditorStart, navigateStart);
assert.match(
  closeEditor,
  /const hasOpenEditor = Boolean\([\s\S]*selectedRow[\s\S]*draft[\s\S]*compositionEditorContext[\s\S]*skyArticleEditor[\s\S]*skyArticleEditionForm[\s\S]*\);/u,
  "Background dashboard loading must only block navigation when an editor is actually open."
);
assert.match(
  closeEditor,
  /if \(isLoading && hasOpenEditor\) \{[\s\S]*return false;[\s\S]*\}/u,
  "An in-flight editor operation may still protect the open editor."
);
assert.doesNotMatch(
  closeEditor,
  /if \(isLoading\) return false;/u,
  "Dashboard-wide loading must not silently disable section navigation."
);

const navigation = source.slice(navigateStart, source.indexOf("  function navigatePrimaryAdminItem", navigateStart));
assert.match(navigation, /if \(!closeEditor\(\)\) return;/u);
assert.match(navigation, /applyAdminRouteState\(page, params \?\? new URLSearchParams\(\)\);/u);
assert.match(navigation, /setAdminHash\(adminHashForPage\(page, params\)\);/u);

console.log("Content Studio navigation contract passed.");
