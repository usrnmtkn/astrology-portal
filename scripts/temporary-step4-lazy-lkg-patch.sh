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
row_loader = '''\nasync function loadContentStudioLastKnownGoodRows() {\n  const module = await import("./contentStudioLastKnownGood");\n  return module.loadContentStudioLastKnownGoodRows();\n}\n'''
assert anchor in text
text = text.replace(anchor, anchor + row_loader, 1)

# Reuse the existing V3 row conversion machinery for live and last-known-good
# rows instead of shipping a second copy in the deferred LKG module.
core_start = text.index('export async function loadFallbackArchitectureV3DashboardBundle()')
helper_anchor = core_start
core_helper = '''function packageFallbackArchitectureV3CoreRows(\n  rows: GeneratedContentRow[],\n  currentCoreManifest: FallbackArchitectureV3PackageManifest\n): FallbackArchitectureV3Bundle | null {\n  const currentCoreKeys = new Set(currentCoreManifest.keys.map((manifestKey) => {\n    const separatorIndex = manifestKey.indexOf(":");\n    return separatorIndex >= 0 ? manifestKey.slice(separatorIndex + 1) : manifestKey;\n  }));\n  for (const row of rows) {\n    const extensionRecord = { ...packageRecord(row), contentKey: row.content_key };\n    if (isFallbackDashboardRecordAllowed(extensionRecord, currentCoreKeys)) currentCoreKeys.add(row.content_key);\n  }\n  const overlayRows = selectLatestLiveServingDashboardRows(\n    rows,\n    currentCoreKeys,\n    (row) => isApprovedFallbackArchitectureV3Row(row),\n    (row) => isSkyPlacementFallbackPartitionKey(row.content_key)\n  );\n  const authoredCards: AuthoredCard[] = [];\n  const hookRows: HookRow[] = [];\n  const vocabularyRows: VocabRow[] = [];\n  const templates: TemplateRow[] = [];\n  for (const row of overlayRows) {\n    const { contentType, role } = fallbackSystemBucket(row);\n    const destination = fallbackArchitectureV3DashboardPackageDestination({\n      contentKey: row.content_key, contentType, role\n    });\n    if (destination === "authored") {\n      const value = packageAuthoredCardFromRow(row);\n      if (value) authoredCards.push(value);\n    } else if (destination === "hook") {\n      const value = packageHookRowFromRow(row);\n      if (value) hookRows.push(value);\n    } else if (destination === "vocabulary") {\n      const value = packageVocabRowFromRow(row);\n      if (value) vocabularyRows.push(value);\n    } else if (destination === "template") {\n      const value = packageTemplateRowFromRow(row);\n      if (value) templates.push(value);\n    }\n  }\n  if (!authoredCards.length && !hookRows.length && !vocabularyRows.length && !templates.length) return null;\n  return { transitLib: { authoredCards }, rowsFile: { hookRows, vocabularyRows }, templatesFile: { templates } };\n}\n\nasync function loadContentStudioLastKnownGoodCoreBundle() {\n  try {\n    const manifest = await loadFallbackArchitectureV3BundledCoreManifest();\n    return packageFallbackArchitectureV3CoreRows(\n      (await loadContentStudioLastKnownGoodRows()) as GeneratedContentRow[],\n      manifest\n    );\n  } catch {\n    return null;\n  }\n}\n\nfunction packageFallbackArchitectureV3CompatibilityRows(rows: GeneratedContentRow[]) {\n  const seen = new Set<string>();\n  const authoredCards: AuthoredCard[] = [];\n  for (const row of sortGeneratedRowsNewestFirst(rows)) {\n    if (seen.has(row.content_key)) continue;\n    seen.add(row.content_key);\n    if (!row.provider || !isApprovedFallbackArchitectureV3Row(row, row.provider)) continue;\n    if (!isReaderServableGeneratedContentRow(row)) continue;\n    const card = packageAuthoredCardFromRow(row);\n    if (card) authoredCards.push(card);\n  }\n  return authoredCards.length\n    ? { transitLib: { authoredCards }, templatesFile: { templates: [] }, rowsFile: { hookRows: [], vocabularyRows: [] } }\n    : null;\n}\n\nasync function loadContentStudioLastKnownGoodCompatibilityBundle() {\n  return packageFallbackArchitectureV3CompatibilityRows(\n    (await loadContentStudioLastKnownGoodRows()) as GeneratedContentRow[]\n  );\n}\n\n'''
text = text[:helper_anchor] + core_helper + text[helper_anchor:]

# Replace the live core assembly with the shared packaging helper while keeping
# the live manifest failure/cache semantics intact.
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

# Vocabulary/tagline loaders dynamically import only the tiny row loader so the
# LKG path stays off the reader boot graph and remains live-retryable.
for path in [
    Path('apps/web/src/services/planetTopicVocabulary.ts'),
    Path('apps/web/src/services/natalPlacementTaglines.ts')
]:
    source = path.read_text()
    static = 'import { loadContentStudioLastKnownGoodRows } from "./contentStudioLastKnownGood";\n'
    assert static in source
    source = source.replace(static, '', 1)
    anchor = 'import { getSupabaseClient } from "./auth";\n'
    wrapper = '''\nasync function loadContentStudioLastKnownGoodRows() {\n  const module = await import("./contentStudioLastKnownGood");\n  return module.loadContentStudioLastKnownGoodRows();\n}\n'''
    assert anchor in source
    source = source.replace(anchor, anchor + wrapper, 1)
    path.write_text(source)

# Assert both the static JSON boundary and the dynamic helper boundary.
test = Path('scripts/test-content-studio-last-known-good.mjs')
source = test.read_text()
insert = '''\nfor (const runtimeSource of [generated, vocabulary, taglines]) {\n  assert.doesNotMatch(runtimeSource, /from \"\\.\\/contentStudioLastKnownGood\"/u, "LKG helper must not be statically imported into reader startup bundles.");\n  assert.match(runtimeSource, /import\\(\"\\.\\/contentStudioLastKnownGood\"\\)/u, "LKG helper must stay behind a dynamic import.");\n}\nassert.match(generated, /packageFallbackArchitectureV3CoreRows/u, "LKG core rows must reuse the production V3 packaging path.");\nassert.match(generated, /packageFallbackArchitectureV3CompatibilityRows/u, "LKG compatibility rows must reuse the production packaging path.");\n'''
needle = 'assert.match(taglines, /loadContentStudioLastKnownGoodRows/u);\n'
assert needle in source
source = source.replace(needle, needle + insert, 1)
test.write_text(source)
PY
