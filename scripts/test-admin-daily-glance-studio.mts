import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

import {
  dailyGlanceContextSearchParams,
  dailyGlancePackageField,
  dailyGlancePairSearchText,
  dailyGlancePairs,
  dailyGlanceSelectorLabel
} from "../apps/admin/src/dailyGlanceAdmin.ts";
import {
  dailyGlanceFriendPreviewParts,
  dailyGlanceFriendPreviewSlots,
  dailyGlanceFriendVariableDefinition
} from "../apps/admin/src/dailyGlanceFriendPreview.ts";

const row = (contentKey: string, bodyYou: string, bodyThey: string) => ({
  id: contentKey,
  content_key: contentKey,
  headline: null,
  summary: "Owner-approved daily source",
  body: bodyYou,
  sections: {
    packageRecord: {
      body_you: bodyYou,
      body_they: bodyThey
    }
  }
});

const rows = [
  row("fallback-hook/daily-headline/soft/mars", "Take the useful opening.", "{{personPreferredName}} may take the useful opening."),
  row("fallback-hook/daily-body/soft/mars", "Act before the moment passes.", "{{personPreferredName}} may act before the moment passes."),
  row("fallback-hook/daily-headline/house/7", "Say what the agreement needs.", "{{personPreferredName}} may say what the agreement needs."),
  row("fallback-hook/daily-body/house/7", "Make the shared expectation explicit.", "{{personPreferredName}} may make the shared expectation explicit."),
  row("fallback-hook/daily-headline/square/sun", "Incomplete source", "Incomplete friend source")
];

const pairs = dailyGlancePairs(rows);
assert.equal(pairs.length, 2, "Only complete headline and passage pairs should appear in the combined editor.");
assert.equal(pairs[0]?.label, "7th House fallback");
assert.equal(dailyGlanceSelectorLabel("soft/mars"), "Moon Soft Contact natal Mars");

const mars = pairs.find((pair) => pair.selector === "soft/mars");
assert.ok(mars, "Expected the Moon soft-contact Mars pair.");
assert.equal(dailyGlancePackageField(mars.headlineRow, "body_you"), "Take the useful opening.");
assert.match(dailyGlancePairSearchText(mars), /act before the moment passes/u, "Combined search must include passage copy.");
assert.match(dailyGlancePairSearchText(mars), /personpreferredname/u, "Combined search must include Friend copy.");

const theySlots = dailyGlanceFriendPreviewSlots("Alisa P", "they");
assert.equal(theySlots.personPreferredName, "Alisa P");
assert.equal(theySlots.personObject, "them", "Object pronouns receive an action in the rendered Friend copy.");
assert.equal(theySlots.personReflexive, "themselves", "Reflexive pronouns describe the person acting on themself.");
assert.equal(theySlots.personBePresent, "are");
assert.equal(theySlots.personVerbSuffix, "");

const sheSlots = dailyGlanceFriendPreviewSlots("Alisa P", "she");
assert.equal(sheSlots.personObject, "her");
assert.equal(sheSlots.personReflexive, "herself");
assert.equal(sheSlots.personBePresent, "is");
assert.equal(sheSlots.personVerbSuffix, "s");

const friendParts = dailyGlanceFriendPreviewParts(
  "{{personPreferredName}} gives {{personObject}} time and trusts {{personReflexive}}.",
  theySlots
);
assert.equal(friendParts.map((part) => part.kind === "text" ? part.text : part.value).join(""), "Alisa P gives them time and trusts themselves.");
assert.deepEqual(
  friendParts.filter((part) => part.kind === "variable").map((part) => [part.variable, part.category]),
  [["personPreferredName", "name"], ["personObject", "object"], ["personReflexive", "reflexive"]],
  "Rendered values must keep their source-variable roles for color highlighting."
);
assert.match(dailyGlanceFriendVariableDefinition("personObject").meaning, /receives an action/u);
assert.match(dailyGlanceFriendVariableDefinition("personReflexive").meaning, /acts on themself/u);
const unsupportedName = dailyGlanceFriendPreviewParts("Hello {{Name}}.", theySlots);
assert.deepEqual(
  unsupportedName.filter((part) => part.kind === "variable").map((part) => [part.variable, part.category, part.value]),
  [["Name", "unknown", "{{Name}}"]],
  "Daily must expose unsupported generic Name tokens rather than pretending the runtime can resolve them."
);

const params = dailyGlanceContextSearchParams({
  date: "2026-09-01",
  person: "Alisa P",
  timeZone: "America/Los_Angeles"
});
assert.equal(params.get("surface"), "dailyGlance");
assert.equal(params.get("startDate"), "2026-09-01");
assert.equal(params.get("endDate"), "2026-09-01");
assert.equal(params.get("timeZone"), "America/Los_Angeles", "The browser-local day boundary must reach the calculation API.");

const repoRoot = path.resolve(import.meta.dirname, "..");
const apiSource = fs.readFileSync(path.join(repoRoot, "api/admin/review-records.ts"), "utf8");
assert.match(apiSource, /selectDailyGlanceCivilDayDriver\(/u, "Content Studio must reuse the app's Daily At-a-Glance selector.");
assert.match(apiSource, /skyForDate\(date, timeZone\)/u, "The current Moon must be calculated at the requested local day boundary.");
assert.match(apiSource, /localCalculationTime: "12:00"/u, "The local civil-day calculation time should remain explicit in provenance.");

// Exercise the actual parent navigation functions, including their hash/popstate path.
const dashboardText = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const dashboard = ts.createSourceFile("Dashboard.tsx", dashboardText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodeNamed(name: string, declaration = false): ts.Node {
  const matches: ts.Node[] = [];
  function visit(node: ts.Node) {
    if (declaration ? ts.isVariableDeclaration(node) && node.name.getText(dashboard) === name
      : ts.isFunctionDeclaration(node) && node.name?.text === name) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(dashboard); assert.equal(matches.length, 1, name); return matches[0];
}
function actual(node: ts.Node, scope: Record<string, any>): any {
  const js = ts.transpileModule(`const value = (${node.getText(dashboard)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return new Function("scope", `with (scope) { ${js}; return value; }`)(scope);
}
function navigationFixture(confirm = false) {
  const calls: string[] = [];
  const scope: Record<string, any> = {
    draft: null, selectedRow: null, compositionEditorContext: null, skyArticleEditor: null, skyArticleEditionForm: null,
    dailyGlancePairSelector: "soft/mars", csvBusy: false, houseTransitEditor: null, isLoading: false,
    draftFromRow: () => { throw new Error("Unexpected draft read"); },
    transitExactDismissedKeysRef: { current: new Set() }, houseTransitEditorDrafts: { current: new Map() },
    editorLoadRef: { current: null }, editorReturnFocusRef: { current: null },
    editorBaselineRef: { current: null }, editorSavedInputRef: { current: null }, natalUnsavedSourcesRef: { current: new Set() },
    handledHashRef: { current: "#fallback-hooks" }, acceptedHashRef: { current: "#fallback-hooks" },
    window: { confirm: () => { calls.push("confirm"); return confirm; }, requestAnimationFrame: (fn: () => void) => fn(), scrollTo() {},
      location: { hash: "#surface-map", pathname: "/admin/content", search: "" },
      history: { replaceState: (_: unknown, __: unknown, url: string) => calls.push(`restore:${url}`) } },
    parseAdminHash: () => ({ page: "surfaceMap", params: new URLSearchParams() }),
    canonicalAdminRoute: (page: string, params: URLSearchParams) => ({ page, params }),
    applyAdminRouteState: (page: string) => calls.push(`route:${page}`),
    adminHashForPage: (page: string) => `#${page}`,
  };
  for (const ref of ["subscriptionEventDirtyRef", "lunationWritingDirtyRef", "dailyWritingDirtyRef", "skyPlacementWorkspaceDirtyRef",
    "skyPlacementWorkspaceBusyRef", "aspectPatternDirtyRef", "aspectPatternBusyRef", "customVariableDirtyRef", "customVariableBusyRef",
    "dailyGlanceDirtyRef", "dailyGlanceBusyRef"]) scope[ref] = { current: false };
  for (const ref of ["sourceOpenRequestRef", "houseTransitOpenRequest", "editorSessionRef", "skyArticleAutosaveSequenceRef", "skyArticleWorkspaceAutosaveSequenceRef"]) scope[ref] = { current: 0 };
  for (const setter of new Set(dashboardText.match(/\bset[A-Z]\w+/gu))) scope[setter] = () => calls.push(setter);
  scope.setDailyGlancePairSelector = (value: string | null) => { scope.dailyGlancePairSelector = value; calls.push("setDailyGlancePairSelector"); };
  for (const name of ["hasChangedSavedDraft", "hasPendingArticleChanges", "confirmDiscardEditorChanges", "confirmNatalNavigation", "closeEditor", "navigateAdminPage", "applyHash"]) scope[name] = actual(nodeNamed(name), scope);
  scope.routeNavigationGuardRef = { current: () => scope.confirmNatalNavigation() && scope.closeEditor() };
  const initializer = (nodeNamed("trackDailyGlanceDraft", true) as ts.VariableDeclaration).initializer as ts.CallExpression;
  scope.report = actual(initializer.arguments[0], scope);
  scope.warnBeforeUnload = actual((nodeNamed("warnBeforeUnload", true) as ts.VariableDeclaration).initializer!, scope);
  return { scope, calls };
}
for (const [dirty, busy] of [[true, false], [false, true], [true, true]]) {
  const { scope, calls } = navigationFixture();
  scope.report(dirty, busy);
  let prevented = false;
  scope.warnBeforeUnload({ preventDefault: () => { prevented = true; }, returnValue: undefined });
  assert(prevented, "Unsaved or in-flight paired writing must warn before unload.");
  assert.equal(scope.navigateAdminPage("surfaceMap"), false);
  scope.applyHash();
  assert.equal(scope.dailyGlancePairSelector, "soft/mars", "Cancelled navigation retains the paired editor.");
  assert(!calls.some(call => call.startsWith("route:")));
  assert(calls.includes("restore:/admin/content#fallback-hooks"), "Hash/popstate navigation restores the accepted route.");
  assert.equal(calls.filter(call => call === "confirm").length, busy ? 0 : 2, "Saving blocks navigation before a discard prompt.");
}
for (const dirty of [true, false]) {
  const { scope } = navigationFixture(true);
  scope.report(dirty, false);
  assert.equal(scope.navigateAdminPage("surfaceMap"), true);
  assert.equal(scope.dailyGlancePairSelector, null, "Accepted navigation closes the paired editor.");
  scope.report(false, false);
  let prevented = false;
  scope.warnBeforeUnload({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false, "An unmounted clean paired editor must not leave a stale unload warning.");
}
console.log("Admin Daily At-a-Glance paired editor and parent navigation checks passed.");
