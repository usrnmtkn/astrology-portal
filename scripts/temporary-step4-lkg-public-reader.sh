#!/usr/bin/env bash
set -euo pipefail
python - <<'PY'
from pathlib import Path

refresh = Path('scripts/refresh-content-studio-last-known-good.mjs')
text = refresh.read_text()
text = text.replace(
'''const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\\/$/u, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!supabaseUrl || !serviceRoleKey) throw new Error("VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");''',
'''const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "https://hdmdufozrgrajkfhydit.supabase.co").replace(/\\/$/u, "");
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_iX90KdzcQzw8a8OydBHHXA_COnEMcns";
if (!supabaseUrl || !publishableKey) throw new Error("A Supabase project URL and publishable key are required.");''')
text = text.replace('apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`', 'apikey: publishableKey, authorization: `Bearer ${publishableKey}`')
text = text.replace('const pageSize = 1000;', 'const pageSize = 200;')
text = text.replace('for (let page = 0; page < 20; page += 1) {', 'for (let page = 0; page < 100; page += 1) {')
text = text.replace('if (page === 19) throw new Error("Snapshot pagination hit its safety page limit; refusing a partial snapshot.");', 'if (page === 99) throw new Error("Snapshot pagination hit its safety page limit; refusing a partial snapshot.");')
refresh.write_text(text)

workflow = Path('.github/workflows/content-studio-last-known-good.yml')
text = workflow.read_text()
text = text.replace('''    env:\n      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}\n      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n''', '')
workflow.write_text(text)

test = Path('scripts/test-content-studio-last-known-good.mjs')
text = test.read_text()
text = text.replace('assert.match(workflow, /SUPABASE_SERVICE_ROLE_KEY/u);', 'assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY/u, "nightly fallback must not require service-role access");\nassert.match(fs.readFileSync("scripts/refresh-content-studio-last-known-good.mjs", "utf8"), /sb_publishable_/u, "nightly fallback must use the public reader boundary");')
test.write_text(text)

vocab = Path('apps/web/src/services/planetTopicVocabulary.ts')
text = vocab.read_text()
text = text.replace('let cachedSignNeeds: SignNeedVocabulary | null = null;\nlet loadingVocabulary:', 'let cachedSignNeeds: SignNeedVocabulary | null = null;\nlet cachedVocabularySource: "live" | "lkg" | null = null;\nlet loadingVocabulary:', 1)
text = text.replace('  cachedSignNeeds = null;\n  loadingVocabulary = null;', '  cachedSignNeeds = null;\n  cachedVocabularySource = null;\n  loadingVocabulary = null;', 1)
text = text.replace('function hydratePlanetTopicVocabularyRows(rows: PlanetTopicVocabularyRow[]) {', 'function hydratePlanetTopicVocabularyRows(rows: PlanetTopicVocabularyRow[], source: "live" | "lkg" = "live") {', 1)
text = text.replace('  cachedSignNeeds = signNeedVocabularyFromRows(servableRows);\n  return cachedVocabulary;', '  cachedSignNeeds = signNeedVocabularyFromRows(servableRows);\n  cachedVocabularySource = source;\n  return cachedVocabulary;', 1)
text = text.replace('  return hydratePlanetTopicVocabularyRows(rows);\n}\n\nexport async function loadPlanetTopicVocabulary()', '  return hydratePlanetTopicVocabularyRows(rows, "lkg");\n}\n\nexport async function loadPlanetTopicVocabulary()', 1)
text = text.replace('if (cachedVocabulary) {\n    return cachedVocabulary;\n  }', 'if (cachedVocabulary && cachedVocabularySource === "live") {\n    return cachedVocabulary;\n  }', 1)
text = text.replace('console.warn("Planet topic vocabulary failed to load; using the nightly reader-safe snapshot.", error);', 'console.warn("Planet topic vocabulary failed to load; using the nightly reader-safe snapshot while live content remains retryable.", error);', 1)
vocab.write_text(text)

taglines = Path('apps/web/src/services/natalPlacementTaglines.ts')
text = taglines.read_text()
text = text.replace('let cachedTaglines: NatalCardTaglineMap | null = null;\nlet loadingTaglines:', 'let cachedTaglines: NatalCardTaglineMap | null = null;\nlet cachedTaglineSource: "live" | "lkg" | null = null;\nlet loadingTaglines:', 1)
text = text.replace('  cachedTaglines = null;\n  loadingTaglines = null;', '  cachedTaglines = null;\n  cachedTaglineSource = null;\n  loadingTaglines = null;', 1)
text = text.replace('  cachedTaglines = natalCardTaglinesFromRows(rows.filter(isReaderServableGeneratedContentRow));\n  return cachedTaglines;\n}\n\nexport async function loadNatalCardTaglines()', '  cachedTaglines = natalCardTaglinesFromRows(rows.filter(isReaderServableGeneratedContentRow));\n  cachedTaglineSource = "lkg";\n  return cachedTaglines;\n}\n\nexport async function loadNatalCardTaglines()', 1)
text = text.replace('if (cachedTaglines) {\n    return cachedTaglines;\n  }', 'if (cachedTaglines && cachedTaglineSource === "live") {\n    return cachedTaglines;\n  }', 1)
text = text.replace('console.warn("Natal card taglines failed to load; using the nightly reader-safe snapshot.", error);', 'console.warn("Natal card taglines failed to load; using the nightly reader-safe snapshot while live content remains retryable.", error);', 1)
text = text.replace('    cachedTaglines = natalCardTaglinesFromRows((data ?? []).filter(isReaderServableGeneratedContentRow));\n    return cachedTaglines;', '    cachedTaglines = natalCardTaglinesFromRows((data ?? []).filter(isReaderServableGeneratedContentRow));\n    cachedTaglineSource = "live";\n    return cachedTaglines;', 1)
taglines.write_text(text)

cache_test = Path('scripts/test-content-studio-runtime-cache-invalidation.mjs')
text = cache_test.read_text()
text = text.replace('assert.match(vocabulary, /topic slots will be blank until the next retry/u, "A transient vocabulary read failure must remain retryable.");', 'assert.match(vocabulary, /cachedVocabularySource === "live"/u, "A nightly vocabulary fallback must not suppress the next live retry.");\nassert.match(vocabulary, /live content remains retryable/u, "A transient vocabulary read failure must remain retryable while LKG is shown.");')
text = text.replace('assert.match(taglines, /code fallbacks will be used until the next retry/u, "A transient tagline read failure must remain retryable.");', 'assert.match(taglines, /cachedTaglineSource === "live"/u, "A nightly tagline fallback must not suppress the next live retry.");\nassert.match(taglines, /live content remains retryable/u, "A transient tagline read failure must remain retryable while LKG is shown.");')
cache_test.write_text(text)
PY
