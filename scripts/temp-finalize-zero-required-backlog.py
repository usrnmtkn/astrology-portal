from pathlib import Path
import json


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    path.write_text(text.replace(old, new, 1))


builder = Path("scripts/build-content-unresolved-queue.mjs")
replace_once(builder,
'''function workClassFor(contentKey) {
  if (contentKey.startsWith("daily-glance-variant/")) return "optional-rotation";
  if (contentKey.startsWith("authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-")
    || contentKey.startsWith("authored/sky-lunation-macro/")) return "full-copy-review";
  if (contentKey.startsWith("fallback-hook/lunation-")) return "shared-fallback-authoring";
  if (contentKey.startsWith("fallback-template/natal.planet-in-sign/")) return "template-review";
  return "editorial-review";
}
''',
'''function workClassFor(contentKey) {
  if (contentKey.startsWith("daily-glance-variant/")) return "optional-rotation";
  if (contentKey.startsWith("authored/sky-lunation-macro/")) return "optional-lunation-macro";
  if (contentKey.startsWith("fallback-hook/lunation-opening-situation/")) return "optional-lunation-opening";
  if (contentKey.startsWith("fallback-hook/lunation-ruler-house/")) return "optional-lunation-ruler";
  if (contentKey.startsWith("fallback-template/natal.planet-in-sign/")) return "optional-template";
  return "editorial-review";
}

function isOptionalWorkClass(workClass) {
  return workClass.startsWith("optional-");
}
''', "builder work classes")
replace_once(builder,
'''const retiredItems = [];
const shadowedItems = [];
const actionableItems = [];
''',
'''const retiredItems = [];
const shadowedItems = [];
const optionalItems = [];
const actionableItems = [];
''', "builder optional collection")
replace_once(builder,
'''  const eligiblePeers = eligiblePeersFor(item);
  if (!eligiblePeers.length) {
    actionableItems.push({ ...item, workClass: workClassFor(item.contentKey) });
    continue;
  }
''',
'''  const eligiblePeers = eligiblePeersFor(item);
  if (!eligiblePeers.length) {
    const classified = { ...item, workClass: workClassFor(item.contentKey) };
    if (isOptionalWorkClass(classified.workClass)) optionalItems.push(classified);
    else actionableItems.push(classified);
    continue;
  }
''', "builder optional routing")
replace_once(builder,
'''const actionableContentKeys = [...new Set(actionableItems.map((item) => item.contentKey))].sort();
function workloadSummary(items) {
  const order = ["full-copy-review", "shared-fallback-authoring", "template-review", "optional-rotation", "editorial-review"];
''',
'''const actionableContentKeys = [...new Set(actionableItems.map((item) => item.contentKey))].sort();
const optionalContentKeys = [...new Set(optionalItems.map((item) => item.contentKey))].sort();
function workloadSummary(items) {
  const order = ["editorial-review", "optional-lunation-macro", "optional-lunation-opening", "optional-lunation-ruler", "optional-template", "optional-rotation"];
''', "builder workload order")
replace_once(builder,
'''  workload: workloadSummary(actionableItems),
  reasonCounts: reasonCounts(actionableItems),
  items: actionableItems,
  shadowedCount: shadowedItems.length,
''',
'''  workload: workloadSummary(actionableItems),
  reasonCounts: reasonCounts(actionableItems),
  items: actionableItems,
  optionalCount: optionalItems.length,
  optionalIssueCount: optionalContentKeys.length,
  optionalContentKeys,
  optionalWorkload: workloadSummary(optionalItems),
  optionalReasonCounts: reasonCounts(optionalItems),
  optionalItems,
  shadowedCount: shadowedItems.length,
''', "builder optional report")
for old, new in [
    ('count: "Actionable unresolved source records."', 'count: "Required unresolved source records."'),
    ('issueCount: "Unique actionable content keys, which is the closer measure of owner/editorial decisions remaining."', 'issueCount: "Unique required content keys that still need an editorial decision before required reader coverage can be complete."'),
    ('items: "Actionable unresolved records with no governed retirement and no reader-eligible peer using the same contentKey."', 'items: "Required unresolved records with no governed retirement, no reader-eligible peer using the same contentKey, and no resolver-supported optional classification."')
]:
    replace_once(builder, old, new, f"builder semantics {old[:16]}")
replace_once(builder,
'''    shadowedItems: "Pending source records retained as audit evidence but excluded from owner/editorial backlog because an exact-key reader-eligible peer already exists.",
''',
'''    optionalItems: "Non-serving enrichment candidates retained for future editorial work but excluded from the required backlog because current reader coverage resolves without them.",
    shadowedItems: "Pending source records retained as audit evidence but excluded from required owner/editorial work because an exact-key reader-eligible peer already exists.",
''', "builder optional semantics")
replace_once(builder,
'''  console.log(`Content unresolved queue is current (${actionableItems.length} actionable records / ${actionableContentKeys.length} decisions, ${shadowedItems.length} shadowed, ${retiredItems.length} retired).`);
''',
'''  console.log(`Content unresolved queue is current (${actionableItems.length} required records / ${actionableContentKeys.length} decisions, ${optionalItems.length} optional records / ${optionalContentKeys.length} optional decisions, ${shadowedItems.length} shadowed, ${retiredItems.length} retired).`);
''', "builder check log")
replace_once(builder,
'''  console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${actionableItems.length} actionable records / ${actionableContentKeys.length} decisions, ${shadowedItems.length} shadowed, ${retiredItems.length} retired).`);
''',
'''  console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${actionableItems.length} required records / ${actionableContentKeys.length} decisions, ${optionalItems.length} optional records / ${optionalContentKeys.length} optional decisions, ${shadowedItems.length} shadowed, ${retiredItems.length} retired).`);
''', "builder write log")

retirements = Path("config/content-unresolved-retirements-v1.json")
data = json.loads(retirements.read_text())
additions = [
    {
        "id": "retired-lunation-uranus-reader-layer",
        "contentKeyPrefix": "fallback-hook/lunation-uranus-layer/",
        "reason": "governed-reader-layer-retirement",
        "evidence": "docs/decisions/2026-08-23-remove-uranus-lunation-reader-layer.md",
        "replacement": "No Uranus-only secondary lunation paragraph; current lunation assembly uses the common governed composition path."
    },
    {
        "id": "superseded-lunar-eclipse-dedicated-book-cells",
        "contentKeyPrefix": "authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-lunar/",
        "reason": "superseded-by-protected-evergreen-eclipse-assembly",
        "evidence": "packages/astro-knowledge/review/lunation-card-assembly-v1/spec.md#33-solar-and-lunar-eclipses-owner-language-candidate; apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs#renderLunationHoroscope",
        "replacement": "Owner-approved Full Moon book cell plus separately protected eclipse sections; exact eclipse preview cells are intentionally not selected by the runtime."
    }
]
ids = {item.get("id") for item in data["families"]}
for addition in additions:
    if addition["id"] not in ids:
        data["families"].append(addition)
retirements.write_text(json.dumps(data, indent=2) + "\n")

test = Path("scripts/test-content-unresolved-actionable-queue.mjs")
test.write_text('''import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const output = path.join(os.tmpdir(), `tldrastro-unresolved-${process.pid}.json`);
try {
  execFileSync(process.execPath, ["scripts/build-content-unresolved-queue.mjs", `--out=${output}`], { cwd: process.cwd(), stdio: "pipe" });
  const report = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(report.count, 0);
  assert.equal(report.issueCount, 0);
  assert.equal(report.optionalCount, 80);
  assert.equal(report.optionalIssueCount, 69);
  assert.equal(report.shadowedCount, 47);
  assert.equal(report.retiredCount, 85);
  assert.equal(report.count + report.optionalCount + report.shadowedCount + report.retiredCount, 212);
  assert.deepEqual(report.workload, {});
  assert.deepEqual(report.optionalWorkload, {
    "optional-lunation-macro": { records: 1, decisions: 1 },
    "optional-lunation-opening": { records: 11, decisions: 11 },
    "optional-lunation-ruler": { records: 22, decisions: 11 },
    "optional-template": { records: 14, decisions: 14 },
    "optional-rotation": { records: 32, decisions: 32 }
  });
  const optionalKeys = new Set(report.optionalItems.map((item) => item.contentKey));
  assert.ok(optionalKeys.has("authored/sky-lunation-macro/new-moon/aquarius"));
  assert.ok([...optionalKeys].some((key) => key.startsWith("daily-glance-variant/")));
  assert.ok([...optionalKeys].some((key) => key.startsWith("fallback-template/natal.planet-in-sign/")));
  assert.ok([...optionalKeys].some((key) => key.startsWith("fallback-hook/lunation-opening-situation/")));
  assert.ok([...optionalKeys].some((key) => key.startsWith("fallback-hook/lunation-ruler-house/")));
  const retiredKeys = new Set(report.retiredItems.map((item) => item.contentKey));
  assert.ok([...retiredKeys].some((key) => key.startsWith("fallback-hook/lunation-uranus-layer/")));
  assert.equal([...retiredKeys].filter((key) => key.startsWith("authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-lunar/pisces/")).length, 12);
  const resolver = fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs", "utf8");
  assert.match(resolver, /const exactEclipsePreview = null;/u);
  assert.match(resolver, /kind === "eclipse-lunar"\\s*\\? "full-moon"/u);
  assert.match(resolver, /else if \\(evergreenBookCell\\?\\.body\\)/u);
  const weekly = fs.readFileSync("apps/web/src/services/weeklyHoroscope.ts", "utf8");
  assert.match(weekly, /Macro coverage is intentionally sparse/u);
  const calendar = fs.readFileSync("apps/web/src/features/calendar/LunarCalendar.tsx", "utf8");
  assert.match(calendar, /function weeklyLunationArticleOpening[\\s\\S]*renderLunationMacro[\\s\\S]*return calendarEventPackageFailure\\(event, error\\);/u);
  assert.match(report.semantics.items, /Required unresolved/u);
  assert.match(report.semantics.optionalItems, /enrichment candidates/u);
  console.log("Required unresolved queue passed: 0 required / 69 optional decisions / 47 shadowed / 85 retired.");
} finally {
  fs.rmSync(output, { force: true });
}
''')

api = Path("api/admin/content-coverage.ts")
api_text = api.read_text()
api_text = api_text.replace("  unresolvedIssues: Number(unresolved.issueCount ?? unresolved.count ?? 0),\n  unresolvedShadowed:", "  unresolvedIssues: Number(unresolved.issueCount ?? unresolved.count ?? 0),\n  unresolvedOptionalQueue: Number(unresolved.optionalCount ?? 0),\n  unresolvedOptionalIssues: Number(unresolved.optionalIssueCount ?? 0),\n  unresolvedShadowed:", 1)
api_text = api_text.replace("  unresolvedWorkload: unresolved.workload ?? {},\n  unresolvedShadowedReasonCounts:", "  unresolvedWorkload: unresolved.workload ?? {},\n  unresolvedOptionalWorkload: unresolved.optionalWorkload ?? {},\n  unresolvedShadowedReasonCounts:", 1)
if "unresolvedOptionalIssues" not in api_text or "unresolvedOptionalWorkload" not in api_text:
    raise SystemExit("api optional fields were not inserted")
api.write_text(api_text)

ui = Path("apps/admin/src/ContentCoverageDashboard.tsx")
ui_text = ui.read_text()
ui_text = ui_text.replace("  unresolvedIssues: number;\n  unresolvedShadowed:", "  unresolvedIssues: number;\n  unresolvedOptionalQueue: number;\n  unresolvedOptionalIssues: number;\n  unresolvedShadowed:", 1)
ui_text = ui_text.replace("  unresolvedWorkload: Record<string, { records: number; decisions: number }>;\n  unresolvedShadowedReasonCounts:", "  unresolvedWorkload: Record<string, { records: number; decisions: number }>;\n  unresolvedOptionalWorkload: Record<string, { records: number; decisions: number }>;\n  unresolvedShadowedReasonCounts:", 1)
ui_text = ui_text.replace("Actionable decisions", "Required decisions", 1)
ui_text = ui_text.replace("Actionable source records", "Required source records", 1)
marker = '''    <div style={cardStyle}>
      <p className="admin-eyebrow">Required source records</p>'''
if marker not in ui_text:
    raise SystemExit("ui required-source marker missing")
ui_text = ui_text.replace(marker, '''    <div style={cardStyle}>
      <p className="admin-eyebrow">Optional enrichment</p>
      <strong style={{ fontSize: 28 }}>{payload.summary.unresolvedOptionalIssues}</strong>
    </div>
    <div style={cardStyle}>
      <p className="admin-eyebrow">Required source records</p>''', 1)
ui_text = ui_text.replace("Editorial work remaining", "Required editorial work", 1)
ui_text = ui_text.replace("not counted as owner work.", "not counted as required owner work.", 1)
reader_marker = "\n  {payload.readerEligibility && (\n"
optional_panel = '''
  {Object.keys(payload.notes.unresolvedOptionalWorkload).length > 0 && (
    <section style={{ ...cardStyle, marginBottom: 20 }} aria-label="Optional editorial enrichment">
      <p className="admin-eyebrow">Optional enrichment</p>
      {Object.entries(payload.notes.unresolvedOptionalWorkload).map(([workClass, counts]) => (
        <p key={workClass} style={{ margin: "6px 0 0" }}>
          <strong>{workClass.replaceAll("-", " ")}:</strong> {counts.decisions} decisions · {counts.records} source records
        </p>
      ))}
      <p style={{ margin: "8px 0 0", opacity: 0.72 }}>
        These candidates can improve rotation or depth later, but current reader coverage resolves without them.
      </p>
    </section>
  )}
'''
if reader_marker not in ui_text:
    raise SystemExit("ui reader marker missing")
ui_text = ui_text.replace(reader_marker, optional_panel + reader_marker, 1)
ui.write_text(ui_text)

governed = Path("docs/content-management/GOVERNED-APPROVALS.md")
replace_once(governed,
'''This report is an inventory, not an approval grant. Its `items` array is the actionable
editorial backlog: pending records that have neither an exact-key reader-eligible peer
nor a governed retirement/supersession decision. `issueCount` counts unique actionable
content keys, so it is the closer measure of owner/editorial decisions remaining.
`shadowedItems` and `retiredItems` preserve non-actionable source history with the
eligible-peer or retirement evidence that removed those records from the active queue.
No row is approved, deleted, or made reader-eligible by this classification.
''',
'''This report is an inventory, not an approval grant. Its `items` array is the required
editorial backlog after exact-key reader eligibility, governed retirements, and
resolver-supported optionality are accounted for. `issueCount` counts unique required
content keys. `optionalItems` preserves non-serving enrichment candidates that current
reader resolution does not require. `shadowedItems` and `retiredItems` preserve source
history with the eligible-peer or retirement evidence that removed those records from
required owner work. No row is approved, deleted, or made reader-eligible by this classification.
''', "governed semantics")

readme = Path("docs/content-management/README.md")
replace_once(readme,
'''To review the actionable governed package backlog, open Content Studio >
Unresolved Content (`/admin/content#unresolved-content`). Its active inventory is
generated from `content-unresolved-queue-v1.json` and contains only pending records
that still require a decision. Exact-key rows already superseded by reader-eligible
peers and source families with governed retirements remain in the report as audit
history but are not presented as owner work. Editorial issues open
''',
'''To review the required governed package backlog, open Content Studio >
Unresolved Content (`/admin/content#unresolved-content`). Its active inventory is
generated from `content-unresolved-queue-v1.json` and contains only pending records
required to close reader coverage. Resolver-supported optional enrichments, exact-key
rows already superseded by reader-eligible peers, and governed retirements remain in
the report for audit and future enrichment planning but are not presented as required
owner work. Editorial issues open
''', "readme semantics")
