#!/usr/bin/env bash
set -euo pipefail
python - <<'PY'
from pathlib import Path

# Keep the entire LKG implementation off the normal reader boot graph. The
# static JSON was already lazy; these wrappers make the helper module lazy too.
generated = Path('apps/web/src/services/generatedContent.ts')
text = generated.read_text()
static_import = '''import {\n  loadContentStudioLastKnownGoodCompatibilityBundle,\n  loadContentStudioLastKnownGoodCoreBundle,\n  loadContentStudioLastKnownGoodRows\n} from "./contentStudioLastKnownGood";\n'''
assert static_import in text
text = text.replace(static_import, '', 1)
anchor = 'import { getSupabaseClient } from "./auth";\n'
wrappers = '''\nasync function loadContentStudioLastKnownGoodCoreBundle() {\n  const module = await import("./contentStudioLastKnownGood");\n  return module.loadContentStudioLastKnownGoodCoreBundle();\n}\n\nasync function loadContentStudioLastKnownGoodCompatibilityBundle() {\n  const module = await import("./contentStudioLastKnownGood");\n  return module.loadContentStudioLastKnownGoodCompatibilityBundle();\n}\n\nasync function loadContentStudioLastKnownGoodRows() {\n  const module = await import("./contentStudioLastKnownGood");\n  return module.loadContentStudioLastKnownGoodRows();\n}\n'''
assert anchor in text
text = text.replace(anchor, anchor + wrappers, 1)
generated.write_text(text)

for path in [
    Path('apps/web/src/services/planetTopicVocabulary.ts'),
    Path('apps/web/src/services/natalPlacementTaglines.ts')
]:
    text = path.read_text()
    static = 'import { loadContentStudioLastKnownGoodRows } from "./contentStudioLastKnownGood";\n'
    assert static in text
    text = text.replace(static, '', 1)
    anchor = 'import { getSupabaseClient } from "./auth";\n'
    wrapper = '''\nasync function loadContentStudioLastKnownGoodRows() {\n  const module = await import("./contentStudioLastKnownGood");\n  return module.loadContentStudioLastKnownGoodRows();\n}\n'''
    assert anchor in text
    text = text.replace(anchor, anchor + wrapper, 1)
    path.write_text(text)

test = Path('scripts/test-content-studio-last-known-good.mjs')
text = test.read_text()
insert = '''\nfor (const source of [generated, vocabulary, taglines]) {\n  assert.doesNotMatch(source, /from \"\\.\\/contentStudioLastKnownGood\"/u, "LKG helper must not be statically imported into reader startup bundles.");\n  assert.match(source, /import\\(\"\\.\\/contentStudioLastKnownGood\"\\)/u, "LKG helper must stay behind a dynamic import.");\n}\n'''
needle = 'assert.match(taglines, /loadContentStudioLastKnownGoodRows/u);\n'
assert needle in text
text = text.replace(needle, needle + insert, 1)
test.write_text(text)
PY
