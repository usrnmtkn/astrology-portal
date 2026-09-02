from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label} anchor not found")
    return text.replace(old, new, 1)


dashboard_path = Path("apps/admin/src/GeneratedContentAdminDashboard.tsx")
dashboard = dashboard_path.read_text()
dashboard = replace_once(
    dashboard,
    "const generatedContentPageRetryDelaysMs = [350];",
    "const generatedContentPageRetryDelaysMs = [350, 1_000];",
    "retry delay",
)
dashboard = replace_once(
    dashboard,
    '  const pageSize = scope === "compatibility" ? 500 : 1000;',
    '  const pageSize = scope === "compatibility" ? 500 : 400;',
    "page size",
)
dashboard = replace_once(
    dashboard,
    '''    const isContinuousSkyPackage = isPackageDraft && packageRecord.render_policy === "sky-placement-continuous-v2";\n    const showPackageBodyYou = isPackageDraft\n''',
    '''    const isContinuousSkyPackage = isPackageDraft && packageRecord.render_policy === "sky-placement-continuous-v2";\n    const isAuthoredTransitAspectDraft = isPackageDraft\n      && currentDraft.contentKey.startsWith("authored/transit-aspect/");\n    const showPackageBodyYou = isPackageDraft\n''',
    "transit aspect draft",
)
dashboard = replace_once(
    dashboard,
    '''    const showPackageBodyThey = isPackageDraft\n      && !isVocabularyDraft\n      && (typeof editablePackageRecord.body_they === "string" || typeof objectRecord(currentDraft.sections)?.body_they === "string");''',
    '''    const showPackageBodyThey = isPackageDraft\n      && !isVocabularyDraft\n      && (isAuthoredTransitAspectDraft\n        || typeof editablePackageRecord.body_they === "string"\n        || typeof objectRecord(currentDraft.sections)?.body_they === "string");''',
    "showPackageBodyThey",
)
dashboard = replace_once(
    dashboard,
    '''              {isExactNatalAspectDraft && (\n                <small className="admin-field-hint" id="natal-aspect-they-name-hint" role="note">\n                  Name variable: <code>{natalAspectTheyNameVariable}</code>. Enter it exactly where the person&apos;s name should appear; the app replaces it with their name.\n                </small>\n              )}\n              <textarea\n                aria-describedby={isExactNatalAspectDraft ? "natal-aspect-they-name-hint" : undefined}\n''',
    '''              {isExactNatalAspectDraft && (\n                <small className="admin-field-hint" id="natal-aspect-they-name-hint" role="note">\n                  Name variable: <code>{natalAspectTheyNameVariable}</code>. Enter it exactly where the person&apos;s name should appear; the app replaces it with their name.\n                </small>\n              )}\n              {isAuthoredTransitAspectDraft && (\n                <small className="admin-field-hint" id="transit-aspect-they-name-hint" role="note">\n                  Friends uses this complete third-person passage. Use <code>{"{{Name}}"}</code> where the person&apos;s name belongs. If this field is blank, the reader falls back to the legacy automatic conversion of the You passage.\n                </small>\n              )}\n              <textarea\n                aria-describedby={isExactNatalAspectDraft\n                  ? "natal-aspect-they-name-hint"\n                  : isAuthoredTransitAspectDraft ? "transit-aspect-they-name-hint" : undefined}\n''',
    "friend view hint",
)
dashboard = replace_once(
    dashboard,
    '''              {!fallbackEditorGuidance && <small className="admin-field-hint">Used when the app describes this person to a friend or another chart viewer.</small>}''',
    '''              {!fallbackEditorGuidance && !isAuthoredTransitAspectDraft && <small className="admin-field-hint">Used when the app describes this person to a friend or another chart viewer.</small>}\n              {!fallbackEditorGuidance && isAuthoredTransitAspectDraft && <small className="admin-field-hint">This is the editable Friends version of the standalone Transit to Natal write-up. Write it as its own complete passage rather than mechanically changing pronouns in the You copy.</small>}''',
    "friend view generic hint",
)
dashboard_path.write_text(dashboard)

api_path = Path("api/admin/generated-content.ts")
api = api_path.read_text()
api = replace_once(
    api,
    '''function normalizeNatalAspectTheyNameVariable(contentKey: string | undefined, value: unknown) {\n  if (!contentKey?.startsWith("fallback-hook/natal-aspect-lived/") || typeof value !== "string") return value;\n  return value.replace(/\\{\\{Name\\}\\}|\\{Name\\}/gu, "{{Name}}");\n}''',
    '''function normalizeNatalAspectTheyNameVariable(contentKey: string | undefined, value: unknown) {\n  const supportsNamedFriendCopy = Boolean(\n    contentKey?.startsWith("fallback-hook/natal-aspect-lived/")\n    || contentKey?.startsWith("authored/transit-aspect/")\n  );\n  if (!supportsNamedFriendCopy || typeof value !== "string") return value;\n  return value.replace(/\\{\\{Name\\}\\}|\\{Name\\}/gu, "{{Name}}");\n}''',
    "friend Name normalization",
)
api = replace_once(
    api,
    '''      const isRequiredNatalAspectName = row.content_key.startsWith("fallback-hook/natal-aspect-lived/")\n        && field.endsWith("body_they")\n        && slot === "{{Name}}";\n      if (isRequiredNatalAspectName) continue;''',
    '''      const isAllowedFriendName = (\n        row.content_key.startsWith("fallback-hook/natal-aspect-lived/")\n        || row.content_key.startsWith("authored/transit-aspect/")\n      )\n        && field.endsWith("body_they")\n        && slot === "{{Name}}";\n      if (isAllowedFriendName) continue;''',
    "friend Name placeholder validation",
)
api_path.write_text(api)

source_path = Path("apps/admin/src/transitNatalSources.ts")
source = source_path.read_text()
source = replace_once(
    source,
    '          scope: "An authored complete passage can replace the generic standalone transit-aspect template.",',
    '          scope: "An authored complete passage can replace the generic standalone transit-aspect template. The editor exposes separate You and Friends passages so each reader voice can be authored directly.",',
    "transit natal standalone scope",
)
source_path.write_text(source)

test_path = Path("scripts/test-content-studio-transit-friend-editor.mjs")
test_path.write_text(r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const api = fs.readFileSync(path.join(root, "api/admin/generated-content.ts"), "utf8");
const transitSources = fs.readFileSync(path.join(root, "apps/admin/src/transitNatalSources.ts"), "utf8");

assert.match(dashboard, /const pageSize = scope === "compatibility" \? 500 : 400;/u);
assert.match(dashboard, /const generatedContentPageRetryDelaysMs = \[350, 1_000\];/u);
assert.match(dashboard, /const isAuthoredTransitAspectDraft = isPackageDraft[\s\S]{0,180}authored\/transit-aspect\//u);
assert.match(dashboard, /const showPackageBodyThey = isPackageDraft[\s\S]{0,260}isAuthoredTransitAspectDraft/u);
assert.match(dashboard, /Friends uses this complete third-person passage/u);
assert.match(dashboard, /transit-aspect-they-name-hint/u);
assert.match(api, /authored\/transit-aspect\/[\s\S]{0,220}slot === "\{\{Name\}\}"/u);
assert.match(transitSources, /separate You and Friends passages/u);
console.log("Content Studio Transit to Natal Friends editor contract passed.");
''')

package_path = Path("package.json")
package_text = package_path.read_text()
package_text = replace_once(
    package_text,
    "node --import tsx scripts/test-fallback-dashboard-live-overlay.mjs && node scripts/test-fallback-refresh-wiring.mjs",
    "node --import tsx scripts/test-fallback-dashboard-live-overlay.mjs && node scripts/test-content-studio-transit-friend-editor.mjs && node scripts/test-fallback-refresh-wiring.mjs",
    "test:content insertion",
)
package_path.write_text(package_text)
