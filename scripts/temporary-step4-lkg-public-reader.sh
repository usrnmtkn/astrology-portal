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
PY
