from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text()


def write(path, text):
    (ROOT / path).write_text(text)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


path = "apps/admin/src/GeneratedContentAdminDashboard.tsx"
text = read(path)

text = replace_once(
    text,
    '''          const revised = await reviseSkyArticleEdition(skyArticleEditor.baseEdition, skyArticleEditor.fields);
          const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
            method: "PATCH",
            body: JSON.stringify({
              id: skyArticleEditor.rowId,
              ownerAction: "save-sky-article-edition-revision",
              sections: { skyArticleEdition: revised }
            })
          });''',
    '''          const revised = await reviseSkyArticleEdition(skyArticleEditor.baseEdition, skyArticleEditor.fields);
          const persistedArticleRow = rows.find((row) => row.id === skyArticleEditor.rowId);
          const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
            method: "PATCH",
            body: JSON.stringify({
              id: skyArticleEditor.rowId,
              ...(persistedArticleRow?.updated_at ? { expectedUpdatedAt: persistedArticleRow.updated_at } : {}),
              ownerAction: "save-sky-article-edition-revision",
              sections: { skyArticleEdition: revised }
            })
          });''',
    "sky article revision autosave version"
)

text = replace_once(
    text,
    '''          const requestBody = form.workspaceId ? {
            id: form.workspaceId,
            headline: `${titleFromKey(facts.planet)} in ${titleFromKey(facts.sign)} article draft`,''',
    '''          const persistedWorkspaceRow = form.workspaceId
            ? rows.find((row) => row.id === form.workspaceId)
            : null;
          const requestBody = form.workspaceId ? {
            id: form.workspaceId,
            ...(persistedWorkspaceRow?.updated_at ? { expectedUpdatedAt: persistedWorkspaceRow.updated_at } : {}),
            headline: `${titleFromKey(facts.planet)} in ${titleFromKey(facts.sign)} article draft`,''',
    "sky article workspace autosave version"
)

text = replace_once(
    text,
    'body: JSON.stringify({ id: row.id, ownerAction: "approve-and-schedule" })',
    'body: JSON.stringify({ id: row.id, ...(row.updated_at ? { expectedUpdatedAt: row.updated_at } : {}), ownerAction: "approve-and-schedule" })',
    "approve and schedule version"
)

text = replace_once(
    text,
    'body: JSON.stringify({ id: row.id, ownerAction: "approve-sky-article-edition" })',
    'body: JSON.stringify({ id: row.id, ...(row.updated_at ? { expectedUpdatedAt: row.updated_at } : {}), ownerAction: "approve-sky-article-edition" })',
    "approve sky article version"
)

text = replace_once(
    text,
    'body: JSON.stringify({ id: revisionRow.id, ownerAction })',
    'body: JSON.stringify({ id: revisionRow.id, ...(revisionRow.updated_at ? { expectedUpdatedAt: revisionRow.updated_at } : {}), ownerAction })',
    "publish sky article revision version"
)

text = replace_once(
    text,
    'body: JSON.stringify({ id: row.id, ownerAction: "approve-package-revision" })',
    'body: JSON.stringify({ id: row.id, ...(row.updated_at ? { expectedUpdatedAt: row.updated_at } : {}), ownerAction: "approve-package-revision" })',
    "approve package revision version"
)

write(path, text)

# Restrict the public revision watermark to the two governed fallback providers.
path = "apps/web/supabase/migrations/20260902060000_content_studio_hydration_crud_reliability.sql"
text = read(path)
text = replace_once(
    text,
    '''  select max(updated_at)
  from public.generated_interpretations
  where provider = p_provider;''',
    '''  select max(updated_at)
  from public.generated_interpretations
  where provider = p_provider
    and p_provider in (
      'tldrastro-fallback-architecture-v3',
      'tldrastro-fallback-architecture-v3-sky-placement'
    );''',
    "runtime revision provider allowlist"
)
write(path, text)

# Static contract: every special Content Studio PATCH must carry the loaded row version.
test = r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
const migration = fs.readFileSync("apps/web/supabase/migrations/20260902060000_content_studio_hydration_crud_reliability.sql", "utf8");

for (const [label, pattern] of [
  ["Sky article revision autosave", /persistedArticleRow\?\.updated_at[\s\S]{0,180}expectedUpdatedAt: persistedArticleRow\.updated_at[\s\S]{0,220}ownerAction: "save-sky-article-edition-revision"/u],
  ["Sky article workspace autosave", /persistedWorkspaceRow\?\.updated_at[\s\S]{0,160}expectedUpdatedAt: persistedWorkspaceRow\.updated_at/u],
  ["Approve and schedule", /row\.updated_at[\s\S]{0,100}expectedUpdatedAt: row\.updated_at[\s\S]{0,120}ownerAction: "approve-and-schedule"/u],
  ["Approve Sky article", /row\.updated_at[\s\S]{0,100}expectedUpdatedAt: row\.updated_at[\s\S]{0,120}ownerAction: "approve-sky-article-edition"/u],
  ["Publish Sky article revision", /revisionRow\.updated_at[\s\S]{0,120}expectedUpdatedAt: revisionRow\.updated_at[\s\S]{0,120}ownerAction/u],
  ["Approve package revision", /row\.updated_at[\s\S]{0,100}expectedUpdatedAt: row\.updated_at[\s\S]{0,120}ownerAction: "approve-package-revision"/u]
]) {
  assert.match(dashboard, pattern, `${label} must send optimistic concurrency identity.`);
}

assert.match(
  migration,
  /p_provider in \([\s\S]*?'tldrastro-fallback-architecture-v3'[\s\S]*?'tldrastro-fallback-architecture-v3-sky-placement'[\s\S]*?\)/u,
  "The public runtime revision RPC must be restricted to governed fallback providers."
);

console.log("Content Studio special mutation concurrency contract passed.");
'''
write("scripts/test-content-studio-special-mutation-concurrency.mjs", test)

print("Final Content Studio concurrency/security patch written.")
