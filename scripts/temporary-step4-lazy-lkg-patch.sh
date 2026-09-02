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

core_start = text.index('export async function loadFallbackArchitectureV3DashboardBundle()')
core_helper = '''function packageFallbackArchitectureV3CoreRows(\n  rows: GeneratedContentRow[],\n  currentCoreManifest: FallbackArchitectureV3PackageManifest\n): FallbackArchitectureV3Bundle | null {\n  const currentCoreKeys = new Set(currentCoreManifest.keys.map((manifestKey) => {\n    const separatorIndex = manifestKey.indexOf(":");\n    return separatorIndex >= 0 ? manifestKey.slice(separatorIndex + 1) : manifestKey;\n  }));\n  for (const row of rows) {\n    const extensionRecord = { ...packageRecord(row), contentKey: row.content_key };\n    if (isFallbackDashboardRecordAllowed(extensionRecord, currentCoreKeys)) currentCoreKeys.add(row.content_key);\n  }\n  const overlayRows = selectLatestLiveServingDashboardRows(\n    rows,\n    currentCoreKeys,\n    (row) => isApprovedFallbackArchitectureV3Row(row),\n    (row) => isSkyPlacementFallbackPartitionKey(row.content_key)\n  );\n  const authoredCards: AuthoredCard[] = [];\n  const hookRows: HookRow[] = [];\n  const vocabularyRows: VocabRow[] = [];\n  const templates: TemplateRow[] = [];\n  for (const row of overlayRows) {\n    const { contentType, role } = fallbackSystemBucket(row);\n    const destination = fallbackArchitectureV3DashboardPackageDestination({ contentKey: row.content_key, contentType, role });\n    if (destination === "authored") {\n      const value = packageAuthoredCardFromRow(row);\n      if (value) authoredCards.push(value);\n    } else if (destination === "hook") {\n      const value = packageHookRowFromRow(row);\n      if (value) hookRows.push(value);\n    } else if (destination === "vocabulary") {\n      const value = packageVocabRowFromRow(row);\n      if (value) vocabularyRows.push(value);\n    } else if (destination === "template") {\n      const value = packageTemplateRowFromRow(row);\n      if (value) templates.push(value);\n    }\n  }\n  if (!authoredCards.length && !hookRows.length && !vocabularyRows.length && !templates.length) return null;\n  return { transitLib: { authoredCards }, rowsFile: { hookRows, vocabularyRows }, templatesFile: { templates } };\n}\n\nasync function loadContentStudioLastKnownGoodCoreBundle() {\n  try {\n    const manifest = await loadFallbackArchitectureV3BundledCoreManifest();\n    return packageFallbackArchitectureV3CoreRows(await loadContentStudioLastKnownGoodRows(), manifest);\n  } catch {\n    return null;\n  }\n}\n\nfunction packageFallbackArchitectureV3CompatibilityRows(rows: GeneratedContentRow[]) {\n  const seen = new Set<string>();\n  const authoredCards: AuthoredCard[] = [];\n  for (const row of sortGeneratedRowsNewestFirst(rows)) {\n    if (seen.has(row.content_key)) continue;\n    seen.add(row.content_key);\n    if (!row.provider || !isApprovedFallbackArchitectureV3Row(row, row.provider)) continue;\n    if (!isReaderServableGeneratedContentRow(row)) continue;\n    const card = packageAuthoredCardFromRow(row);\n    if (card) authoredCards.push(card);\n  }\n  return authoredCards.length\n    ? { transitLib: { authoredCards }, templatesFile: { templates: [] }, rowsFile: { hookRows: [], vocabularyRows: [] } }\n    : null;\n}\n\nasync function loadContentStudioLastKnownGoodCompatibilityBundle() {\n  return packageFallbackArchitectureV3CompatibilityRows(await loadContentStudioLastKnownGoodRows());\n}\n\n'''
text = text[:core_start] + core_helper + text[core_start:]

core_start = text.index('export async function loadFallbackArchitectureV3DashboardBundle()')
assembly_start = text.index('  let currentCoreManifest: FallbackArchitectureV3PackageManifest;', core_start)
compat_start = text.index('\nexport async function loadFallbackArchitectureV3CompatibilityDashboardBundle()', assembly_start)
core_close = text.rfind('\n}', assembly_start, compat_start)
assert core_close > assembly_start
replacement = '''  let currentCoreManifest: FallbackArchitectureV3PackageManifest;\n  try {\n    currentCoreManifest = await loadFallbackArchitectureV3BundledCoreManifest();\n  } catch (error) {\n    console.warn("Fallback architecture V3 current key manifest failed to load; cached/local copy remains active.", error);\n    return cached?.bundle ?? null;\n  }\n  const bundle = packageFallbackArchitectureV3CoreRows(rows, currentCoreManifest);\n  if (!bundle) {\n    clearCachedFallbackArchitectureV3Bundle();\n    return null;\n  }\n  cacheFallbackArchitectureV3Bundle(dashboardVersion || fallbackArchitectureV3DashboardVersionFromRows(rows), bundle);\n  return bundle;\n'''
text = text[:assembly_start] + replacement + text[core_close:]

compat_start = text.index('export async function loadFallbackArchitectureV3CompatibilityDashboardBundle()')
seen_start = text.index('  const seen = new Set<string>();', compat_start)
sky_start = text.index('\nexport async function loadFallbackArchitectureV3SkyPlacementDashboardBundle()', seen_start)
compat_close = text.rfind('\n}', seen_start, sky_start)
assert compat_close > seen_start
text = text[:seen_start] + '  return packageFallbackArchitectureV3CompatibilityRows(rows);\n' + text[compat_close:]
generated.write_text(text)

planet = Path('apps/web/src/services/planetTopicVocabulary.ts')
source = planet.read_text()
source = source.replace('import { getSupabaseClient } from "./auth";\n', '', 1)
source = source.replace('import { loadContentStudioLastKnownGoodRows } from "./contentStudioLastKnownGood";\n', '', 1)
source = source.replace('import { isReaderServableGeneratedContentRow } from "./generatedContent";\n', 'import { loadLiveGeneratedContentForSurfaces } from "./generatedContent";\n', 1)
type_start = source.index('type PlanetTopicVocabularyRow = {')
type_end = source.index('\n};', type_start) + 3
source = source[:type_start] + '''type PlanetTopicVocabularyRow = {\n  content_key: string;\n  body: string | null;\n  sections: unknown;\n};''' + source[type_end:]
source = source.replace('let cachedVocabularySource: "live" | "lkg" | null = null;\n', '')
source = source.replace('  cachedVocabularySource = null;\n', '')
hydrate_start = source.index('function hydratePlanetTopicVocabularyRows(')
load_start = source.index('export async function loadPlanetTopicVocabulary()', hydrate_start)
source = source[:hydrate_start] + '''function hydratePlanetTopicVocabularyRows(rows: PlanetTopicVocabularyRow[]) {\n  cachedVocabulary = planetTopicVocabularyFromRows(rows);\n  cachedSignStyles = signStyleVocabularyFromRows(rows);\n  cachedSignNeeds = signNeedVocabularyFromRows(rows);\n  return cachedVocabulary;\n}\n\n''' + source[load_start:]
load_start = source.index('export async function loadPlanetTopicVocabulary()')
source = source[:load_start] + '''export async function loadPlanetTopicVocabulary() {\n  if (loadingVocabulary) return loadingVocabulary;\n  loadingVocabulary = (async () => {\n    const rows = [...(await loadLiveGeneratedContentForSurfaces(["modifier"])).values()]\n      .filter((row) => row.contentKey.startsWith("fallback-vocab/")\n        || row.contentKey.startsWith("cc/planet/")\n        || row.contentKey.startsWith("cc/sign/"))\n      .map((row) => ({ content_key: row.contentKey, body: row.body, sections: row.sections }));\n    return hydratePlanetTopicVocabularyRows(rows);\n  })();\n  try {\n    return await loadingVocabulary;\n  } finally {\n    loadingVocabulary = null;\n  }\n}\n'''
planet.write_text(source)

taglines = Path('apps/web/src/services/natalPlacementTaglines.ts')
source = taglines.read_text()
source = source.replace('import { getSupabaseClient } from "./auth";\n', '', 1)
source = source.replace('import { loadContentStudioLastKnownGoodRows } from "./contentStudioLastKnownGood";\n', '', 1)
source = source.replace('import { isReaderServableGeneratedContentRow } from "./generatedContent";\n', 'import { loadLiveGeneratedContentForKeys } from "./generatedContent";\n', 1)
type_start = source.index('type NatalCardTaglineRow = {')
type_end = source.index('\n};', type_start) + 3
source = source[:type_start] + '''type NatalCardTaglineRow = {\n  content_key: string;\n  body: string | null;\n  sections: unknown;\n};''' + source[type_end:]
source = source.replace('let cachedTaglineSource: "live" | "lkg" | null = null;\n', '')
source = source.replace('  cachedTaglineSource = null;\n', '')
hydrate_start = source.index('async function hydrateNatalCardTaglinesFromLastKnownGood()')
load_start = source.index('export async function loadNatalCardTaglines()', hydrate_start)
source = source[:hydrate_start] + source[load_start:]
load_start = source.index('export async function loadNatalCardTaglines()')
source = source[:load_start] + '''export async function loadNatalCardTaglines() {\n  if (loadingTaglines) return loadingTaglines;\n  loadingTaglines = (async () => {\n    const content = await loadLiveGeneratedContentForKeys(natalCardTaglinePoints.map(natalCardTaglineContentKey));\n    cachedTaglines = natalCardTaglinesFromRows([...content.values()].map((row) => ({\n      content_key: row.contentKey, body: row.body, sections: row.sections\n    })));\n    return cachedTaglines;\n  })();\n  try {\n    return await loadingTaglines;\n  } finally {\n    loadingTaglines = null;\n  }\n}\n'''
taglines.write_text(source)

runtime = Path('apps/web/src/services/contentStudioLastKnownGood.ts')
assert runtime.exists()
runtime.unlink()

# Keep the update broadcaster transport-only. App already owns the caches and
# can invalidate them without creating extra dependency edges here.
signal = Path('apps/web/src/services/contentUpdateSignal.ts')
source = signal.read_text()
source = source.replace('import { clearSharedGeneratedContentCache } from "./sharedGeneratedContentCache";\n', '')
source = source.replace('import { clearPlanetTopicVocabularyCache } from "./planetTopicVocabulary";\n', '')
source = source.replace('import { clearNatalCardTaglineCache } from "./natalPlacementTaglines";\n\n', '')
old_notify = '''  const notify = (notice: ContentUpdateNotice) => {\n    clearSharedGeneratedContentCache();\n    clearPlanetTopicVocabularyCache();\n    clearNatalCardTaglineCache();\n    listener(notice);\n  };\n'''
assert old_notify in source
source = source.replace(old_notify, '')
source = source.replace('if (notice) notify(notice);', 'if (notice) listener(notice);')
source = source.replace('if (event.data) notify(event.data);', 'if (event.data) listener(event.data);')
signal.write_text(source)

app = Path('apps/web/src/App.tsx')
source = app.read_text()
old = 'import { loadNatalCardTaglines, natalCardTagline } from "./services/natalPlacementTaglines";'
new = 'import { clearNatalCardTaglineCache, loadNatalCardTaglines, natalCardTagline } from "./services/natalPlacementTaglines";'
assert old in source
source = source.replace(old, new, 1)
old = 'import { loadPlanetTopicVocabulary, planetTopicPhrase, signNeedPhrase, signStylePhrase, signStyleShortPhrase, type PlanetTopicVariant } from "./services/planetTopicVocabulary";'
new = 'import { clearPlanetTopicVocabularyCache, loadPlanetTopicVocabulary, planetTopicPhrase, signNeedPhrase, signStylePhrase, signStyleShortPhrase, type PlanetTopicVariant } from "./services/planetTopicVocabulary";'
assert old in source
source = source.replace(old, new, 1)
needle = '  useEffect(() => subscribeToContentUpdates(() => {\n    clearSharedGeneratedContentCache();\n'
assert needle in source
source = source.replace(needle, '  useEffect(() => subscribeToContentUpdates(() => {\n    clearSharedGeneratedContentCache();\n    clearPlanetTopicVocabularyCache();\n    clearNatalCardTaglineCache();\n', 1)
app.write_text(source)

test = Path('scripts/test-content-studio-last-known-good.mjs')
source = test.read_text()
source = source.replace('const runtime = fs.readFileSync("apps/web/src/services/contentStudioLastKnownGood.ts", "utf8");\n', '')
source = source.replace('assert.match(runtime, /fetch\\("\\/content-studio-last-known-good\\.json"/u, "The LKG snapshot must be fetched as a static asset, not bundled into application JS.");\nassert.doesNotMatch(runtime, /import\\([^)]*content-studio-last-known-good\\.json/u);\n', 'assert.match(generated, /fetch\\("\\/content-studio-last-known-good\\.json"/u, "The LKG snapshot must be fetched as a static asset, not bundled into application JS.");\nassert.doesNotMatch(generated, /import\\([^)]*content-studio-last-known-good\\.json/u);\nassert.ok(!fs.existsSync("apps/web/src/services/contentStudioLastKnownGood.ts"), "LKG must not create a standalone JavaScript chunk.");\n')
source = source.replace('assert.match(vocabulary, /loadContentStudioLastKnownGoodRows/u);\n', 'assert.match(vocabulary, /loadLiveGeneratedContentForSurfaces/u);\n')
source = source.replace('assert.match(taglines, /loadContentStudioLastKnownGoodRows/u);\n', 'assert.match(taglines, /loadLiveGeneratedContentForKeys/u);\n')
needle = 'assert.match(generated, /loadContentStudioLastKnownGoodRows/u);\n'
assert needle in source
source = source.replace(needle, needle + 'assert.match(generated, /packageFallbackArchitectureV3CoreRows/u);\nassert.match(generated, /packageFallbackArchitectureV3CompatibilityRows/u);\n')
test.write_text(source)

cache_test = Path('scripts/test-content-studio-runtime-cache-invalidation.mjs')
source = cache_test.read_text()
source = source.replace('const signal = fs.readFileSync("apps/web/src/services/contentUpdateSignal.ts", "utf8");\n', 'const signal = fs.readFileSync("apps/web/src/services/contentUpdateSignal.ts", "utf8");\nconst app = fs.readFileSync("apps/web/src/App.tsx", "utf8");\nconst generated = fs.readFileSync("apps/web/src/services/generatedContent.ts", "utf8");\n')
start = source.index('assert.match(vocabulary, /export function clearPlanetTopicVocabularyCache/u);')
end = source.index('\nassert.match(signal, /clearPlanetTopicVocabularyCache', start)
new_contract = '''assert.match(vocabulary, /export function clearPlanetTopicVocabularyCache/u);\nassert.match(vocabulary, /loadLiveGeneratedContentForSurfaces/u, "Vocabulary hydration must delegate to the shared live/LKG loader.");\nassert.doesNotMatch(vocabulary, /\\.range\\(/u, "Vocabulary hydration must not own OFFSET pagination.");\nassert.match(vocabulary, /finally \\{\\s*loadingVocabulary = null/u);\n\nassert.match(taglines, /export function clearNatalCardTaglineCache/u);\nassert.match(taglines, /loadLiveGeneratedContentForKeys/u, "Tagline hydration must delegate to the shared live/LKG loader.");\nassert.match(taglines, /finally \\{\\s*loadingTaglines = null/u);\n\nassert.match(generated, /\\.gt\\("id", cursorId\\)/u, "Shared Content Studio hydration must use a stable cursor.");\nassert.doesNotMatch(generated, /\\.range\\(from, to\\)/u, "Shared Content Studio hydration must not use OFFSET pagination.");\nassert.match(generated, /loadLastKnownGoodGeneratedContentForSurfaces/u, "Shared surface hydration must retain LKG fallback.");\nassert.match(generated, /loadLastKnownGoodGeneratedContentForKeys/u, "Shared key hydration must retain LKG fallback.");\n'''
source = source[:start] + new_contract + source[end:]
source = source.replace('assert.match(signal, /clearPlanetTopicVocabularyCache\\(\\)/u, "Publishing from Content Studio must invalidate planet/sign vocabulary cache.");\nassert.match(signal, /clearNatalCardTaglineCache\\(\\)/u, "Publishing from Content Studio must invalidate natal tagline cache.");\n', 'assert.doesNotMatch(signal, /clearPlanetTopicVocabularyCache|clearNatalCardTaglineCache/u, "The update transport must not own reader cache modules.");\nassert.match(app, /clearPlanetTopicVocabularyCache\\(\\)/u, "Publishing from Content Studio must invalidate planet/sign vocabulary cache.");\nassert.match(app, /clearNatalCardTaglineCache\\(\\)/u, "Publishing from Content Studio must invalidate natal tagline cache.");\n')
cache_test.write_text(source)
PY
