#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleDir = path.join(repoRoot, "node_modules/.cache/tldrastro");
const bundleFile = path.join(bundleDir, "calendar-civil-date-anchor.bundle.mjs");

fs.mkdirSync(bundleDir, { recursive: true });
await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/services/ephemeris.ts")],
  external: ["swisseph-wasm"],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});
const {
  calendarDateKeyAnchor,
  getLunarCalendarWeek
} = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);

const location = {
  label: "Portsmouth, NH",
  latitude: 43.0718,
  longitude: -70.7626,
  timeZone: "America/New_York"
};
const formatterFor = (timeZone) => new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

for (const { dateKey, weekEnd } of [
  { dateKey: "2026-07-13", weekEnd: "2026-07-19" },
  { dateKey: "2026-08-03", weekEnd: "2026-08-09" }
]) {
  const anchor = calendarDateKeyAnchor(dateKey, location.timeZone);
  const calendar = await getLunarCalendarWeek(location, anchor, { detail: "basic" });

  assert.equal(formatterFor(location.timeZone).format(anchor), dateKey);
  assert.equal(calendar.days[0]?.dateKey, dateKey, `${dateKey} must remain the Monday week anchor.`);
  assert.equal(calendar.days.at(-1)?.dateKey, weekEnd, `${dateKey} must load its complete Monday-Sunday week.`);
}

for (const timeZone of ["Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
  const dateKey = "2026-08-03";
  const anchor = calendarDateKeyAnchor(dateKey, timeZone);

  assert.equal(
    formatterFor(timeZone).format(anchor),
    dateKey,
    `Civil date anchors must survive conversion in ${timeZone}.`
  );
}

assert.throws(
  () => calendarDateKeyAnchor("2026-02-31", "UTC"),
  /Invalid calendar date key/,
  "Impossible civil dates must fail closed."
);

fs.rmSync(bundleFile, { force: true });

console.log("Calendar civil-date anchors passed: Monday boundaries and timezone edges remain stable.");
