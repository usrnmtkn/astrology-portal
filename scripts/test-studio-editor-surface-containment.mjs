import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const adminSrc = path.join(process.cwd(), "apps/admin/src");
const files = fs.readdirSync(adminSrc).filter(name => name.endsWith(".tsx"));

const savebarFiles = [];
for (const name of files) {
  const source = fs.readFileSync(path.join(adminSrc, name), "utf8");
  for (const [lineIndex, line] of source.split("\n").entries()) {
    if (!line.includes("admin-editor-savebar")) continue;
    savebarFiles.push({ name, line: lineIndex + 1 });
    assert.match(line, /studio-surface/u, `${name}:${lineIndex + 1} save bar must sit on the shared Studio card, not the canvas.`);
  }
}
assert.ok(savebarFiles.length >= 3, "Every editor sheet save bar must be covered.");

const dashboard = fs.readFileSync(path.join(adminSrc, "GeneratedContentAdminDashboard.tsx"), "utf8");
assert.match(dashboard, /admin-review-copy-editor studio-surface" data-reader-audience="you"/u, "You-view copy must sit on a Studio card.");
assert.match(dashboard, /admin-review-copy-editor studio-surface" data-reader-audience="they"/u, "Friend-view copy must sit on a Studio card.");
assert.match(dashboard, /studio-surface studio-section admin-fallback-diagnostic-panel/u, "The Sky writing workspace must sit on a Studio card.");
assert.match(dashboard, /studio-surface studio-section admin-sky-edition-builder/u, "Sky article edition writing must sit on a Studio card.");

const phrase = fs.readFileSync(path.join(adminSrc, "SkyFallbackFieldsEditor.tsx"), "utf8");
assert.match(phrase, /surfaceSection\} admin-sky-writing-editor`\} aria-label="Phrase variable editor"/u, "The phrase editor must sit on a Studio card.");
assert.match(phrase, /surfaceSection\} admin-sky-writing-editor`\} aria-label="Writing editor"/u, "Placement writing must sit on a Studio card.");

const glance = fs.readFileSync(path.join(adminSrc, "DailyGlanceStudio.tsx"), "utf8");
assert.match(glance, /surfaceSection\} admin-daily-glance-audience/u, "Daily At-a-Glance phrase blocks must sit on a Studio card.");
assert.match(glance, /admin-editor-savebar studio-surface/u, "The Daily At-a-Glance save bar must sit on a Studio card.");

const house = fs.readFileSync(path.join(adminSrc, "HouseTransitWriteupEditor.tsx"), "utf8");
assert.match(house, /className="admin-hook-detail-section"/u, "House Transit phrase blocks must keep the shared section card inside the tab panel.");
assert.doesNotMatch(house, /surfaceSection\} admin-hook-detail-section/u, "House Transit sections must not use studio-surface inside a connected tab panel.");
assert.match(house, /admin-editor-savebar studio-surface/u, "The House Transit save bar must sit on a Studio card.");

console.log(`studio editor surface containment: ok (${savebarFiles.length} save bars)`);
