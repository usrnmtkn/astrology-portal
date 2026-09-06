import assert from "node:assert/strict";
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
  assert.match(resolver, /kind === "eclipse-lunar"\s*\? "full-moon"/u);
  assert.match(resolver, /else if \(evergreenBookCell\?\.body\)/u);
  const weekly = fs.readFileSync("apps/web/src/services/weeklyHoroscope.ts", "utf8");
  assert.match(weekly, /Macro coverage is intentionally sparse/u);
  const calendar = fs.readFileSync("apps/web/src/features/calendar/LunarCalendar.tsx", "utf8");
  assert.match(calendar, /function weeklyLunationArticleOpening[\s\S]*renderLunationMacro[\s\S]*return calendarEventPackageFailure\(event, error\);/u);
  assert.match(report.semantics.items, /Required unresolved/u);
  assert.match(report.semantics.optionalItems, /enrichment candidates/u);
  console.log("Required unresolved queue passed: 0 required / 69 optional decisions / 47 shadowed / 85 retired.");
} finally {
  fs.rmSync(output, { force: true });
}
