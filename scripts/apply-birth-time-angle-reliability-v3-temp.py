from pathlib import Path

patch_path = Path("scripts/apply-birth-time-angle-reliability-temp.py")
patch_source = patch_path.read_text()

obsolete_return_block = '''app_replace(
    '      setProfileNatalCalculationError("");\\n    };\\n\\n    if (cachedNatalSky) {',
    '      setProfileNatalCalculationError("");\\n      return reliableNatalSky;\\n    };\\n\\n    if (cachedNatalSky) {',
)
'''
if patch_source.count(obsolete_return_block) != 1:
    raise SystemExit(f"Expected one obsolete return block, found {patch_source.count(obsolete_return_block)}")
patch_source = patch_source.replace(obsolete_return_block, "", 1)

old_cache_patch = '''app_replace(
    "        applyNatalSky(natalSky);\\n        writeCachedSkySnapshot(natalCacheKey, natalSky);",
    "        const reliableNatalSky = applyNatalSky(natalSky);\\n        writeCachedSkySnapshot(natalCacheKey, reliableNatalSky);",
)
'''
new_cache_patch = '''app_replace(
    "        applyNatalSky(natalSky);\\n        writeCachedSkySnapshot(natalCacheKey, natalSky);",
    "        const reliableNatalSky = natalSnapshotWithBirthTimeReliability(natalSky, !unknownBirthTime) ?? natalSky;\\n"
    "        applyNatalSky(reliableNatalSky);\\n"
    "        writeCachedSkySnapshot(natalCacheKey, reliableNatalSky);",
)
'''
if patch_source.count(old_cache_patch) != 1:
    raise SystemExit(f"Expected one network cache patch, found {patch_source.count(old_cache_patch)}")
patch_source = patch_source.replace(old_cache_patch, new_cache_patch, 1)

exec(compile(patch_source, str(patch_path), "exec"), {"__name__": "__main__"})

# Migrate a legacy cached noon snapshot to the fail-closed form immediately on read.
app_path = Path("apps/web/src/App.tsx")
app = app_path.read_text()
old = '''    if (cachedNatalSky) {
      applyNatalSky(cachedNatalSky);
    } else {'''
new = '''    if (cachedNatalSky) {
      const reliableCachedNatalSky = natalSnapshotWithBirthTimeReliability(cachedNatalSky, !unknownBirthTime) ?? cachedNatalSky;
      applyNatalSky(reliableCachedNatalSky);
      writeCachedSkySnapshot(natalCacheKey, reliableCachedNatalSky);
    } else {'''
if app.count(old) != 1:
    raise SystemExit(f"Expected one cached natal branch, found {app.count(old)}")
app_path.write_text(app.replace(old, new, 1))

print("Applied corrected birth-time reliability patch with explicit sanitized cache writes.")
