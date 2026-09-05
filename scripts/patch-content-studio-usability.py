from pathlib import Path

DASHBOARD = Path('apps/admin/src/GeneratedContentAdminDashboard.tsx')
COMPONENTS = Path('apps/admin/src/admin-components.css')
TEST = Path('scripts/test-admin-content-studio-usability.mjs')

text = DASHBOARD.read_text()

def once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)

once(
    '''            const saved = row.rawGlobalRow;
            const rowRole = contentRoleDetails(contentRoleForRecord(row));
            const aspectContext = aspectContextForRow(row);
            return (''',
    '''            const saved = row.rawGlobalRow;
            const aspectContext = aspectContextForRow(row);
            const readerUse = aspectContext?.label ?? contentCategoryForRow(row);
            return (''',
    'review-row context'
)

once(
    '''                  <div className="admin-review-queue-copy">
                    <h3>{rowTitle(row)}</h3>
                    <code>{row.contentKey}</code>
                  </div>''',
    '''                  <div className="admin-review-queue-copy">
                    <h3 title={rowTitle(row)}>{rowTitle(row)}</h3>
                    <span className="admin-review-queue-use">{readerUse}</span>
                    <code title={row.contentKey}>{row.contentKey}</code>
                  </div>''',
    'review-row identity hierarchy'
)

aspect_block = '''                    {aspectContext && (
                      <span className="ui-pill admin-status admin-aspect-context-pill" title={aspectContext.detail}>
                        {aspectContext.label}
                      </span>
                    )}
'''
if text.count(aspect_block) < 1:
    raise SystemExit('review-row aspect badge block missing')
text = text.replace(aspect_block, '', 1)

for old, label in [
    ('                    <span className="ui-pill admin-status">{contentClassLabel(contentClassForRow(row))}</span>\n', 'review content-class badge'),
    ('                    <span className="ui-pill admin-status" title={rowRole.detail}>{rowRole.label}</span>\n', 'review content-role badge'),
]:
    if text.count(old) < 1:
        raise SystemExit(f'{label}: missing')
    text = text.replace(old, '', 1)

once(
    '''        : fallbackHookEditorTitle
            ? `Edit ${fallbackHookEditorTitle}`
            : "Edit saved row"''',
    '''        : fallbackHookEditorTitle
            ? `Edit ${fallbackHookEditorTitle}`
            : selectedRow
              ? `Edit ${rowTitle(selectedRow)}`
              : currentDraft.headline.trim()
                ? `Edit ${currentDraft.headline.trim()}`
                : `Edit ${titleFromKey(currentDraft.contentKey)}`''',
    'editor meaningful heading'
)

heading_tail = '''              : isTemplateDraft
                ? isCompatibilityWorkspaceDraft ? "Create compatibility template" : "Create reader-copy template"
                : "Create saved row";
    const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {'''
heading_tail_new = '''              : isTemplateDraft
                ? isCompatibilityWorkspaceDraft ? "Create compatibility template" : "Create reader-copy template"
                : "Create saved row";
    const editorUseLabel = aspectContext?.label
      ?? (selectedRow
        ? contentCategoryForRow(selectedRow)
        : isArticleDraft
          ? "Articles"
          : isVocabularyDraft
            ? "Vocabulary & phrases"
            : isTemplateDraft
              ? "Templates & assembly"
              : "Content Studio");
    const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {'''
once(heading_tail, heading_tail_new, 'editor use label')

once(
    '''            <p className="admin-eyebrow">{isVocabularyDraft ? "Phrase editor" : isArticleDraft ? "Article editor" : "Content editor"}</p>
            <h2>{editorHeading}</h2>
          </div>''',
    '''            <p className="admin-eyebrow">{isVocabularyDraft ? "Phrase editor" : isArticleDraft ? "Article editor" : "Content editor"}</p>
            <h2>{editorHeading}</h2>
            <p className="admin-editor-context-line">
              <span><strong>Use:</strong> {editorUseLabel}</span>
              <code title={currentDraft.contentKey}>{currentDraft.contentKey}</code>
            </p>
          </div>''',
    'editor context line'
)

DASHBOARD.write_text(text)

css = COMPONENTS.read_text()
marker = '/* Content Studio usability hierarchy: title first, context second, implementation details last. */'
block = r'''

/* Content Studio usability hierarchy: title first, context second, implementation details last. */
.admin-dashboard .admin-review-queue-copy h3 {
  display: block;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
  white-space: normal;
  -webkit-box-orient: initial;
  -webkit-line-clamp: unset;
}

.admin-dashboard .admin-review-queue-use {
  color: var(--admin-muted);
  font-size: var(--admin-ui-type-caption);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-meta);
}

.admin-dashboard .admin-review-queue-copy code {
  color: var(--admin-text-disabled);
  font-size: var(--admin-ui-type-caption);
  font-weight: var(--weight-regular);
  max-width: 100%;
}

.admin-dashboard .admin-review-queue-meta-strip {
  justify-content: flex-start;
}

.admin-dashboard .admin-editor-context-line {
  align-items: baseline;
  color: var(--admin-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--admin-ui-type-caption);
  gap: var(--admin-space-sm) var(--admin-space-lg);
  line-height: var(--leading-meta);
  margin: var(--admin-space-sm) 0 0;
  min-width: 0;
}

.admin-dashboard .admin-editor-context-line span {
  flex: 0 0 auto;
}

.admin-dashboard .admin-editor-context-line code {
  color: var(--admin-text-disabled);
  font-size: inherit;
  font-weight: var(--weight-regular);
  max-width: 100%;
  overflow-wrap: anywhere;
  white-space: normal;
}
'''
if marker not in css:
    COMPONENTS.write_text(css.rstrip() + block + '\n')

TEST.write_text(r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "apps/admin/src/admin-components.css"), "utf8");

assert.match(dashboard, /const readerUse = aspectContext\?\.label \?\? contentCategoryForRow\(row\)/u);
assert.match(dashboard, /className="admin-review-queue-use">\{readerUse\}<\/span>/u);
assert.doesNotMatch(dashboard, /<span className="ui-pill admin-status">\{contentClassLabel\(contentClassForRow\(row\)\)\}<\/span>/u);
assert.doesNotMatch(dashboard, /<span className="ui-pill admin-status" title=\{rowRole\.detail\}>\{rowRole\.label\}<\/span>/u);
assert.match(dashboard, /selectedRow\s*\? `Edit \$\{rowTitle\(selectedRow\)\}`/u);
assert.match(dashboard, /className="admin-editor-context-line"/u);
assert.match(dashboard, /<span><strong>Use:<\/strong> \{editorUseLabel\}<\/span>/u);
assert.match(dashboard, /<code title=\{currentDraft\.contentKey\}>\{currentDraft\.contentKey\}<\/code>/u);

const marker = "/* Content Studio usability hierarchy: title first, context second, implementation details last. */";
const rules = css.slice(css.lastIndexOf(marker));
assert.ok(rules.includes("-webkit-line-clamp: unset;"));
assert.ok(rules.includes("overflow: visible;"));
assert.ok(rules.includes(".admin-editor-context-line"));

console.log("Content Studio usability hierarchy passed.");
''')
