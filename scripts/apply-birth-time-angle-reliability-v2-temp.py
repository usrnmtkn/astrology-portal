from pathlib import Path

patch_path = Path("scripts/apply-birth-time-angle-reliability-temp.py")
patch_source = patch_path.read_text()

bad_block = '''app_replace(
    '      setProfileNatalCalculationError("");\\n    };\\n\\n    if (cachedNatalSky) {',
    '      setProfileNatalCalculationError("");\\n      return reliableNatalSky;\\n    };\\n\\n    if (cachedNatalSky) {',
)
'''
if patch_source.count(bad_block) != 1:
    raise SystemExit(f"Expected one obsolete applyNatalSky return patch, found {patch_source.count(bad_block)}")
patch_source = patch_source.replace(bad_block, "", 1)

# Execute the guarded base patch after removing only the obsolete anchor.
exec(compile(patch_source, str(patch_path), "exec"), {"__name__": "__main__"})

app_path = Path("apps/web/src/App.tsx")
app = app_path.read_text()
old = '''      setProfileTransits(nextTransits);
      setProfileTransitsTargetDate(sky?.generatedAt.slice(0, 10) ?? null);
      setTransitsDrawn(true);
    };

    if (cachedNatalSky) {'''
new = '''      setProfileTransits(nextTransits);
      setProfileTransitsTargetDate(sky?.generatedAt.slice(0, 10) ?? null);
      setTransitsDrawn(true);
      return reliableNatalSky;
    };

    if (cachedNatalSky) {'''
if app.count(old) != 1:
    raise SystemExit(f"Expected one applyNatalSky end anchor, found {app.count(old)}")
app_path.write_text(app.replace(old, new, 1))

print("Applied corrected birth-time angle reliability patch.")
