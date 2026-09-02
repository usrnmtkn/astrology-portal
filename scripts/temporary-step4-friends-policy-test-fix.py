from pathlib import Path

path = Path("scripts/test-friends-content-loading-policy.mjs")
text = path.read_text()
old = '''assert.match(\n  compatibilityLoaderSource,\n  /isApprovedFallbackArchitectureV3Row\\(row, row\\.provider\\)/,\n  "Compatibility hydration must retain package approval checks for each row's actual provider."\n);\n'''
new = '''assert.match(\n  compatibilityLoaderSource,\n  /return packageFallbackArchitectureV3CompatibilityRows\\(rows\\);/,\n  "Compatibility hydration must delegate row packaging to the governed compatibility helper."\n);\nconst compatibilityPackagerStart = generatedContentSource.indexOf(\n  "function packageFallbackArchitectureV3CompatibilityRows"\n);\nconst compatibilityPackagerEnd = generatedContentSource.indexOf(\n  "async function loadContentStudioLastKnownGoodCompatibilityBundle",\n  compatibilityPackagerStart\n);\nconst compatibilityPackagerSource = generatedContentSource.slice(\n  compatibilityPackagerStart,\n  compatibilityPackagerEnd\n);\nassert.ok(compatibilityPackagerStart >= 0 && compatibilityPackagerEnd > compatibilityPackagerStart);\nassert.match(\n  compatibilityPackagerSource,\n  /isApprovedFallbackArchitectureV3Row\\(row, row\\.provider\\)/,\n  "Compatibility packaging must retain package approval checks for each row's actual provider."\n);\n'''
if old not in text:
    raise SystemExit("stale compatibility assertion anchor not found")
path.write_text(text.replace(old, new, 1))
