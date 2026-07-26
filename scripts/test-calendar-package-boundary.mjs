#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
const authoredRows = readJson("source-rows/transit-synastry-rows-v1.json");
const renderer = createTransitSynastryRenderer(
  authoredRows,
  readJson("templates/fallback-templates-v3.json"),
  readJson("source-rows/fallback-source-rows-v3.json")
);

const weeklyMoon = renderer.renderWeeklyMoon({ sign: "scorpio", variant: 2 });
const weeklyMoonRow = authoredRows.authoredCards.find((row) => row.contentKey === weeklyMoon.contentKey);
assert.ok(weeklyMoonRow, `Missing package row ${weeklyMoon.contentKey}`);
assert.equal(
  weeklyMoon.body,
  weeklyMoonRow.body,
  "renderWeeklyMoon reader text must remain byte-identical to its package row."
);
assert.equal(
  weeklyMoon.body,
  "Everything feels intense because everything IS intense. The Scorpio Moon doesn't let you numb out or check out. The emotions you've been managing are demanding to be felt. Power dynamics you've been ignoring are impossible to unsee. Good for therapy, research, intimacy; anything that requires you to stop pretending. The heaviness isn't punishment. It's truth. You're allowed to acknowledge how hard it's actually been."
);
assert.doesNotMatch(weeklyMoon.body, /—/u);

const phase = renderer.renderCalendarPhase({ phase: "waxing-gibbous", sign: "scorpio" });
assert.equal(phase.headline, "Waxing Gibbous Moon in Scorpio");
assert.equal(phase.tagline, "The Refinement");

const calendarSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/calendar/LunarCalendar.tsx"),
  "utf8"
);
const calendarRendererMethods = new Set(
  Array.from(calendarSource.matchAll(/calendarFallbackRendererV3\.(render[A-Z]\w*)/gu), (match) => match[1])
);
for (const method of calendarRendererMethods) {
  assert.equal(
    typeof renderer[method],
    "function",
    `LunarCalendar calls ${method}, but the installed V3 renderer does not expose it.`
  );
}
assert.match(calendarSource, /renderWeeklyMoon\(\{/u);
assert.match(calendarSource, /main: selectedPackageWeeklyMoon \? \[selectedPackageWeeklyMoon\.body\] : \[\]/u);
assert.match(calendarSource, /selectedPackagePhase\?\.headline/u);
assert.match(calendarSource, /selectedPackagePhase\?\.tagline/u);
assert.doesNotMatch(calendarSource, /lunarCalendarLibraryResolver|content-library\.json/u);

const deletedLegacyPaths = [
  "apps/web/src/content/lunar-calendar/content-library.json",
  "apps/web/src/features/calendar/lunarCalendarLibraryResolver.ts"
];
for (const relativePath of deletedLegacyPaths) {
  assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false, `${relativePath} must stay deleted.`);
}

const forbiddenRewrite = [
  "Everything feels intense because it is.",
  "You don't have to numb it or fix it."
].join(" ");
for (const root of ["apps/web/src", "scripts"]) {
  const stack = [path.join(repoRoot, root)];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(entryPath);
      else if (/\.(?:ts|tsx|js|mjs|json|md)$/u.test(entry.name)) {
        assert.equal(
          fs.readFileSync(entryPath, "utf8").includes(forbiddenRewrite),
          false,
          `Forbidden rewritten Calendar copy found in ${path.relative(repoRoot, entryPath)}`
        );
      }
    }
  }
}

console.log("calendar package boundary checks passed");
