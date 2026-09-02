from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "apps/web/src/App.tsx"
text = path.read_text()


def patch_effect(loader: str, label: str):
    global text
    loader_index = text.find(loader)
    if loader_index < 0:
        raise RuntimeError(f"{label}: loader not found")
    effect_start = text.rfind("useEffect(() => {", 0, loader_index)
    if effect_start < 0:
        raise RuntimeError(f"{label}: effect start not found")
    effect_end = text.find("}, []);", loader_index)
    if effect_end < 0 or effect_end - loader_index > 1800:
        raise RuntimeError(f"{label}: initial-only effect terminator not found nearby")
    text = text[:effect_end] + "}, [contentRefreshVersion]);" + text[effect_end + len("}, []);"):]


patch_effect("loadPlanetTopicVocabulary()", "planet topic vocabulary")
patch_effect("loadNatalCardTaglines()", "natal card taglines")
path.write_text(text)

# Static regression contract.
test_path = ROOT / "scripts/test-content-studio-reader-cache-rehydrate.mjs"
test_path.write_text(r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const signal = fs.readFileSync("apps/web/src/services/contentUpdateSignal.ts", "utf8");

assert.match(app, /subscribeToContentUpdates\(\(\) => \{[\s\S]{0,500}setContentRefreshVersion\(\(version\) => version \+ 1\)/u,
  "Open reader tabs must react to Content Studio update broadcasts.");

for (const [label, loader] of [
  ["planet/sign vocabulary", "loadPlanetTopicVocabulary"],
  ["natal card taglines", "loadNatalCardTaglines"]
]) {
  const pattern = new RegExp(`useEffect\\(\\(\\) => \\{[\\s\\S]{0,900}${loader}\\(\\)[\\s\\S]{0,900}\\}, \\[contentRefreshVersion\\]\\);`, "u");
  assert.match(app, pattern, `${label} must rehydrate after Content Studio content updates.`);
}

assert.match(signal, /clearPlanetTopicVocabularyCache\(\)/u,
  "The content update subscriber must invalidate planet/sign vocabulary cache.");
assert.match(signal, /clearNatalCardTaglineCache\(\)/u,
  "The content update subscriber must invalidate natal tagline cache.");

console.log("Content Studio reader cache rehydrate contract passed.");
''')

print("Step 4 reader cache rehydrate repair written.")
