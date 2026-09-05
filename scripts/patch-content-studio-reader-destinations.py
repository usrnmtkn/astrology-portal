from pathlib import Path

DASHBOARD = Path("apps/admin/src/GeneratedContentAdminDashboard.tsx")
CSS_FILE = Path("apps/admin/src/admin-components.css")
TEST_FILE = Path("scripts/test-admin-reader-destination-labels.mjs")

text = DASHBOARD.read_text()

scope_line = '          <p>{source.scope}</p>'
parts = text.split(scope_line)
if len(parts) != 3:
    raise SystemExit(f"expected 2 transit source scope lines, found {len(parts) - 1}")
personal_destination = '\n          <p className="admin-reader-destination-line"><strong>Where readers see this:</strong> {friendsTransitAudience ? "Friends → Transits → Active for {{Name}}" : "You → Personal Transits"}</p>'
house_destination = '\n          <p className="admin-reader-destination-line"><strong>Where readers see this:</strong> {friendsTransitAudience ? "Friends → Transits → Where it lands" : "You → House Transits"}</p>'
text = parts[0] + scope_line + personal_destination + parts[1] + scope_line + house_destination + parts[2]

handle = '    const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {'
if text.count(handle) != 1:
    raise SystemExit(f"editor key handler anchor mismatch: {text.count(handle)}")
destination_logic = '''    const editorReaderDestination =
      activePage === "skyWriteups" && skyWriteupWorkspaceView === "transits-to-natal"
        ? friendsTransitAudience ? "Friends → Transits → Active for {{Name}}" : "You → Personal Transits"
        : activePage === "skyWriteups" && skyWriteupWorkspaceView === "house-transits"
          ? friendsTransitAudience ? "Friends → Transits → Where it lands" : "You → House Transits"
          : activePage === "knowledge" && friendsTransitAudience && fallbackSectionFilter === "friends" && query.includes("bond-effect")
            ? "Friends → Transits → Between you two"
            : null;
'''
text = text.replace(handle, destination_logic + handle, 1)

context = '''              <span><strong>Use:</strong> {editorUseLabel}</span>
              <code title={currentDraft.contentKey}>{currentDraft.contentKey}</code>'''
if text.count(context) != 1:
    raise SystemExit(f"editor context anchor mismatch: {text.count(context)}")
context_new = '''              <span><strong>Use:</strong> {editorUseLabel}</span>
              {editorReaderDestination && (
                <span className="admin-editor-reader-destination"><strong>Where readers see this:</strong> {editorReaderDestination}</span>
              )}
              <code title={currentDraft.contentKey}>{currentDraft.contentKey}</code>'''
text = text.replace(context, context_new, 1)
DASHBOARD.write_text(text)

css = CSS_FILE.read_text()
marker = "/* Reader destination labels: explain the app destination before the technical key. */"
if marker not in css:
    css += '''\n\n/* Reader destination labels: explain the app destination before the technical key. */
.admin-dashboard .admin-reader-destination-line {
  align-items: baseline;
  color: var(--admin-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--admin-ui-type-caption);
  gap: var(--admin-space-sm);
  line-height: var(--leading-meta);
  margin: 0;
}

.admin-dashboard .admin-reader-destination-line strong,
.admin-dashboard .admin-editor-reader-destination strong {
  color: var(--admin-text-secondary);
  font-weight: var(--weight-semibold);
}

.admin-dashboard .admin-editor-reader-destination {
  color: var(--admin-muted);
}
'''
    CSS_FILE.write_text(css)

TEST_FILE.write_text(r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "apps/admin/src/admin-components.css"), "utf8");

assert.equal((dashboard.match(/className="admin-reader-destination-line"/gu) ?? []).length, 2, "Personal and House Transit source cards must both show reader destinations.");
assert.match(dashboard, /Friends → Transits → Active for \{\{Name\}\}/u);
assert.match(dashboard, /Friends → Transits → Where it lands/u);
assert.match(dashboard, /Friends → Transits → Between you two/u);
assert.match(dashboard, /You → Personal Transits/u);
assert.match(dashboard, /You → House Transits/u);
assert.match(dashboard, /const editorReaderDestination =/u);
assert.match(dashboard, /className="admin-editor-reader-destination"/u);
assert.match(dashboard, /<strong>Where readers see this:<\/strong>/u);
assert.match(css, /Reader destination labels: explain the app destination before the technical key/u);
assert.match(css, /\.admin-dashboard \.admin-reader-destination-line/u);
assert.match(css, /\.admin-dashboard \.admin-editor-reader-destination/u);

console.log("Content Studio reader destination labels passed.");
''')
