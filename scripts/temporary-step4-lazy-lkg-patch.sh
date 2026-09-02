#!/usr/bin/env bash
set -euo pipefail
python - <<'PY'
from pathlib import Path

generated = Path('apps/web/src/services/generatedContent.ts')
text = generated.read_text()
static_import = '''import {\n  loadContentStudioLastKnownGoodCompatibilityBundle,\n  loadContentStudioLastKnownGoodCoreBundle,\n  loadContentStudioLastKnownGoodRows\n} from "./contentStudioLastKnownGood";\n'''
assert static_import in text
text = text.replace(static_import, '', 1)
anchor = 'import { getSupabaseClient } from "./auth";\n'
row_loader = '''\nlet contentStudioLastKnownGoodRowsPromise: Promise<GeneratedContentRow[]> | null = null;\n\nexport async function loadContentStudioLastKnownGoodRows(): Promise<GeneratedContentRow[]> {\n  if (!contentStudioLastKnownGoodRowsPromise) {\n    contentStudioLastKnownGoodRowsPromise = (async () => {\n      try {\n        const response = await fetch("/content-studio-last-known-good.json", { cache: "no-cache" });\n        if (!response.ok) return [];\n        const snapshot = await response.json() as { schema?: unknown; rowCount?: unknown; rows?: unknown };\n        return snapshot.schema === "content-studio-last-known-good-v1"\n          && Array.isArray(snapshot.rows)\n          && snapshot.rowCount === snapshot.rows.length\n          ? snapshot.rows as GeneratedContentRow[]\n          : [];\n      } catch {\n        return [];\n      }\n    })();\n  }\n  const rows = await contentStudioLastKnownGoodRowsPromise;\n  if (!rows.length) contentStudioLastKnownGoodRowsPromise = null;\n  return rows;\n}\n'''
assert anchor in text
text = text.replace(anchor, anchor + row_loader, 1)

# Reuse the existing production row-to-bundle machinery for the static LKG
# snapshot instead of shipping a second converter module.
core_start = text.index('export async function loadFallbackArchitectureV3DashboardBundle()')
core_helper = '''function packageFallbackArchitectureV3CoreRows(\n  rows: GeneratedContentRow[],\n  currentCoreManifest: FallbackArchitectureV3PackageManifest\n): FallbackArchitectureV3Bundle | null {\n  const currentCoreKeys = new Set(currentCoreManifest.keys.map((manifestKey) => {\n    const separatorIndex = manifestKey.indexOf(":");\n    return separatorIndex >= 0 ? manifestKey.slice(separatorIndex + 1) : manifestKey;\n  }));\n  for (const row of rows) {\n    const extensionRecord = { ...packageRecord(row), contentKey: row.content_key };\n    if (isFallbackDashboardRecordAllowed(extensionRecord, currentCoreKeys)) currentCoreKeys.add(row.content_key);\n  }\n  const overlayRows = selectLatestLiveServingDashboardRows(\n    rows,\n    currentCoreKeys,\n    (row) => isApprovedFallbackArchitectureV3Row(row),\n    (row) => isSkyPlacementFallbackPartitionKey(row.content_key)\n  );\n  const authoredCards: AuthoredCard[] = [];\n  const hookRows: HookRow[] = [];\n  const vocabularyRows: VocabRow[] = [];\n  const templates: TemplateRow[] = [];\n  for (const row of overlayRows) {\n    const { contentType, role } = fallbackSystemBucket(row);\n    const destination = fallbackArchitectureV3DashboardPackageDestination({\n      contentKey: row.content_key, contentType, role\n    });\n    if (destination === "authored") {\n      const value = packageAuthoredCardFromRow(row);\n      if (value) authoredCards.push(value);\n    } else if (destination === "hook") {\n      const value = packageHookRowFromRow(row);\n      if (value) hookRows.push(value);\n    } else if (destination === "vocabulary") {\n      const value = packageVocabRowFromRow(row);\n      if (value) vocabularyRows.push(value);\n    } else if (destination === "template") {\n      const value = packageTemplateRowFromRow(row);\n      if (value) templates.push(value);\n    }\n  }\n  if (!authoredCards.length && !hookRows.length && !vocabularyRows.length && !templates.length) return null;\n  return { transitLib: { authoredCards }, rowsFile: { hookRows, vocabularyRows }, templatesFile: { templates } };\n}\n\nasync function loadContentStudioLastKnownGoodCoreBundle() {\n  try {\n    const manifest = await loadFallbackArchitectureV3BundledCoreManifest();\n    return packageFallbackArchitectureV3CoreRows(await loadContentStudioLastKnownGoodRows(), manifest);\n  } catch {\n    return null;\n  }\n}\n\nfunction packageFallbackArchitectureV3CompatibilityRows(rows: GeneratedContentRow[]) {\n  const seen = new Set<string>();\n  const authoredCards: AuthoredCard[] = [];\n  for (const row of sortGeneratedRowsNewestFirst(rows)) {\n    if (seen.has(row.content_key)) continue;\n    seen.add(row.content_key);\n    if (!row.provider || !isApprovedFallbackArchitectureV3Row(row, row.provider)) continue;\n    if (!isReaderServableGeneratedContentRow(row)) continue;\n    const card = packageAuthoredCardFromRow(row);\n    if (card) authoredCards.push(card);\n  }\n  return authoredCards.length\n    ? { transitLib: { authoredCards }, templatesFile: { templates: [] }, rowsFile: { hookRows: [], vocabularyRows: [] } }\n    : null;\n}\n\nasync function loadContentStudioLastKnownGoodCompatibilityBundle() {\n  return packageFallbackArchitectureV3CompatibilityRows(await loadContentStudioLastKnownGoodRows());\n}\n\n'''
text = text[:core_start] + core_helper + text[core_start:]

# Replace the duplicate live core assembly with the shared package helper while
# preserving current live/cache/manifest semantics.
core_start = text.index('export async function loadFallbackArchitectureV3DashboardBundle()')
assembly_start = text.index('  let currentCoreManifest: FallbackArchitectureV3PackageManifest;', core_start)
compat_start = text.index('\nexport async function loadFallbackArchitectureV3CompatibilityDashboardBundle()', assembly_start)
core_close = text.rfind('\n}', assembly_start, compat_start)
assert core_close > assembly_start
replacement = '''  let currentCoreManifest: FallbackArchitectureV3PackageManifest;\n  try {\n    currentCoreManifest = await loadFallbackArchitectureV3BundledCoreManifest();\n  } catch (error) {\n    console.warn("Fallback architecture V3 current key manifest failed to load; cached/local copy remains active.", error);\n    return cached?.bundle ?? null;\n  }\n  const bundle = packageFallbackArchitectureV3CoreRows(rows, currentCoreManifest);\n  if (!bundle) {\n    clearCachedFallbackArchitectureV3Bundle();\n    return null;\n  }\n  cacheFallbackArchitectureV3Bundle(\n    dashboardVersion || fallbackArchitectureV3DashboardVersionFromRows(rows),\n    bundle\n  );\n  return bundle;\n'''
text = text[:assembly_start] + replacement + text[core_close:]

# Replace duplicate compatibility packaging with the same shared helper.
compat_start = text.index('export async function loadFallbackArchitectureV3CompatibilityDashboardBundle()')
seen_start = text.index('  const seen = new Set<string>();', compat_start)
sky_start = text.index('\nexport async function loadFallbackArchitectureV3SkyPlacementDashboardBundle()', seen_start)
compat_close = text.rfind('\n}', seen_start, sky_start)
assert compat_close > seen_start
text = text[:seen_start] + '  return packageFallbackArchitectureV3CompatibilityRows(rows);\n' + text[compat_close:]
generated.write_text(text)

# These modules already depend on generatedContent, so share the row loader
# through that existing dependency instead of creating a new deferred chunk.
for path in [
    Path('apps/web/src/services/planetTopicVocabulary.ts'),
    Path('apps/web/src/services/natalPlacementTaglines.ts')
]:
    source = path.read_text()
    source = source.replace('import { loadContentStudioLastKnownGoodRows } from "./contentStudioLastKnownGood";\n', '', 1)
    old = 'import { isReaderServableGeneratedContentRow } from "./generatedContent";'
    new = 'import { isReaderServableGeneratedContentRow, loadContentStudioLastKnownGoodRows } from "./generatedContent";'
    assert old in source
    source = source.replace(old, new, 1)
    path.write_text(source)

# The former helper is now redundant; the JSON remains a static public asset.
runtime = Path('apps/web/src/services/contentStudioLastKnownGood.ts')
assert runtime.exists()
runtime.unlink()

# Update the contract test to require the zero-helper-chunk architecture.
test = Path('scripts/test-content-studio-last-known-good.mjs')
source = test.read_text()
source = source.replace('const runtime = fs.readFileSync("apps/web/src/services/contentStudioLastKnownGood.ts", "utf8");\n', '')
source = source.replace('assert.match(runtime, /fetch\\("\\/content-studio-last-known-good\\.json"/u, "The LKG snapshot must be fetched as a static asset, not bundled into application JS.");\nassert.doesNotMatch(runtime, /import\\([^)]*content-studio-last-known-good\\.json/u);\n', 'assert.match(generated, /fetch\\("\\/content-studio-last-known-good\\.json"/u, "The LKG snapshot must be fetched as a static asset, not bundled into application JS.");\nassert.doesNotMatch(generated, /import\\([^)]*content-studio-last-known-good\\.json/u);\nassert.ok(!fs.existsSync("apps/web/src/services/contentStudioLastKnownGood.ts"), "LKG must not create a standalone JavaScript chunk.");\n')
needle = 'assert.match(taglines, /loadContentStudioLastKnownGoodRows/u);\n'
assert needle in source
source = source.replace(needle, needle + 'assert.match(generated, /packageFallbackArchitectureV3CoreRows/u);\nassert.match(generated, /packageFallbackArchitectureV3CompatibilityRows/u);\n')
test.write_text(source)
PY
