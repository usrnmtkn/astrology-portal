from pathlib import Path

DASHBOARD = Path("apps/admin/src/GeneratedContentAdminDashboard.tsx")
CSS_FILE = Path("apps/admin/src/admin-components.css")
TEST_FILE = Path("scripts/test-admin-reader-destination-labels.mjs")

text = DASHBOARD.read_text()

resolved_anchor = '''  }) {
    const resolved = skySourceForCandidates(source.candidateKeys);
    return ('''
if text.count(resolved_anchor) != 1:
    raise SystemExit(f"shared source renderer anchor mismatch: {text.count(resolved_anchor)}")
resolved_new = '''  }) {
    const resolved = skySourceForCandidates(source.candidateKeys);
    const sourceReaderDestination = skyWriteupWorkspaceView === "transits-to-natal"
      ? friendsTransitAudience ? "Friends → Transits → Active for {{Name}}" : "You → Personal Transits"
      : friendsTransitAudience ? "Friends → Transits → Where it lands" : "You → House Transits";
    return ('''
text = text.replace(resolved_anchor, resolved_new, 1)

scope_line = '          <p>{source.scope}</p>'
if text.count(scope_line) != 1:
    raise SystemExit(f"shared transit source scope line mismatch: {text.count(scope_line)}")
scope_new = '''          <p>{source.scope}</p>
          <p className="admin-reader-destination-line"><strong>Where readers see this:</strong> {sourceReaderDestination}</p>'''
text = text.replace(scope_line, scope_new, 1)

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

assert.equal((dashboard.match(/className="admin-reader-destination-line"/gu) ?? []).length, 1, "Personal and House Transit cards should share one destination renderer.");
assert.match(dashboard, /const sourceReaderDestination = skyWriteupWorkspaceView === "transits-to-natal"/u);
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
