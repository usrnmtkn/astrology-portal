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

assert.match(dashboard, /from "\.\/studio-ds\/primitives"/u, "Editor lockups must use Studio atoms.");
assert.match(dashboard, /from "\.\/studio-ds\/patterns"/u, "Editor metadata tiles must use the MetricCard pattern.");
assert.match(dashboard, /surfaceSection\} admin-content-role-panel`\} aria-label="Content role"/u, "Content role must sit on a Studio section surface.");
assert.match(dashboard, /metricGrid\} admin-editor-meta-summary/u, "Row metadata must use the shared metric grid.");
assert.match(dashboard, /<MetricCard label="Mode"/u, "Row metadata must render as MetricCard tiles.");
assert.match(dashboard, /containedDisclosure\} admin-advanced admin-editor-settings/u, "Edit metadata must use the contained disclosure recipe.");
assert.match(dashboard, /containedDisclosure\} admin-advanced admin-editor-key-details/u, "Content key must use the contained disclosure recipe.");
assert.match(dashboard, /containedDisclosure\} admin-advanced admin-review-json/u, "Structured fields must use the contained disclosure recipe.");
assert.match(dashboard, /containedDisclosure\} admin-surface-sources/u, "Content source disclosures must use the contained disclosure recipe.");

const review = fs.readFileSync(path.join(adminSrc, "ReviewWorkflowPanel.tsx"), "utf8");
assert.match(review, /from "\.\/studio-ds\/patterns"/u, "Review status must use the MetricCard pattern.");
assert.match(review, /<MetricCard label="Review"/u, "Review status must render as MetricCard tiles.");
assert.match(review, /containedDisclosure\} admin-workspace-details/u, "Review workflow disclosures must use the contained disclosure recipe.");

const natalFinder = fs.readFileSync(path.join(adminSrc, "NatalPlacementSourceFinder.tsx"), "utf8");
assert.match(natalFinder, /from "\.\/studio-ds\/primitives"/u, "Natal Chart lockups must use Studio atoms.");
assert.match(natalFinder, /from "\.\/studio-ds\/patterns"/u, "Empty-house context must use the MetricCard pattern.");
assert.match(natalFinder, /<MetricCard label="Empty house"/u, "Empty-house context must render as MetricCard tiles.");
assert.match(natalFinder, /<MetricCard label="Planet or point"/u, "Planet placement context must render as MetricCard tiles.");
assert.match(natalFinder, /<MetricCard label="Ruler's house"/u, "The ruler-house value must sit on a MetricCard, not a bare number.");
assert.doesNotMatch(natalFinder, /admin-eyebrow/u, "Natal Chart finders must not use eyebrow chrome.");

const natalAspects = fs.readFileSync(path.join(adminSrc, "NatalAspectSourceFinder.tsx"), "utf8");
assert.match(natalAspects, /<MetricCard label="Aspect"/u, "Natal aspect context must render as MetricCard tiles.");

const houseFinder = fs.readFileSync(path.join(adminSrc, "GeneratedContentAdminDashboard.tsx"), "utf8");
assert.match(houseFinder, /<MetricCard label="Reader's house"/u, "House Transit context must render as MetricCard tiles.");
assert.match(houseFinder, /<MetricCard label="Transiting planet"/u, "Personal Transit context must render as MetricCard tiles.");

const friendsFinder = fs.readFileSync(path.join(adminSrc, "FriendsTransitSectionFinder.tsx"), "utf8");
assert.match(friendsFinder, /from "\.\/studio-ds\/primitives"/u, "Friends Transit destinations must use Studio atoms.");

const transitPreview = fs.readFileSync(path.join(adminSrc, "TransitNatalReaderPreview.tsx"), "utf8");
assert.match(transitPreview, /containedDisclosure\} admin-workspace-details/u, "Transit preview options must use the contained disclosure recipe.");

const skyComposition = fs.readFileSync(path.join(adminSrc, "SkyPlacementComposition.tsx"), "utf8");
assert.match(skyComposition, /<MetricCard label="Planet or point"/u, "Sky placement composition must render context as MetricCard tiles.");
assert.match(skyComposition, /containedDisclosure\} admin-workspace-details/u, "Sky placement reader-selection details must use the contained disclosure recipe.");
assert.match(natalFinder, /function previewFromRow/u, "Natal source cards must not preview a key leaf as writing.");
assert.doesNotMatch(natalFinder, /surfaceSection/u, "Natal Chart finders sit in a tab panel and must stay flat.");
assert.match(
  fs.readFileSync(path.join(process.cwd(), "apps/admin/src/studio-system.css"), "utf8"),
  /:is\(\.studio-surface,\.studio-tab-panel\) \.admin-natal-source-card \{[^}]*background: var\(--workspace-canvas\)/u,
  "Natal source cards inside a tab panel must be canvas tiles, not flattened canvas rows."
);

console.log(`studio editor surface containment: ok (${savebarFiles.length} save bars)`);
