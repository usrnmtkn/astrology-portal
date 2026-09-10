import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import bank from "../apps/web/src/content/skyMoonSummaryBank.json" with { type: "json" };
import sources from "../apps/admin/src/skyMoonSummarySources.json" with { type: "json" };
import { moonEventNames, selectedMoonKind, type MoonSummaryKind } from "../apps/web/src/content/skyMoonSummary.ts";
import { skyDailySummaryParts } from "../apps/web/src/content/skyDailySummary.ts";
import { buildSkySummaryComposition } from "../apps/admin/src/skySummaryComposition.ts";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
assert.equal(sha(readFileSync(new URL("../docs/content-review/daily-sky-moon-v6-source.md", import.meta.url), "utf8")), sources.sourceSha256);
assert.equal(sources.rows.length, 60);
assert.equal(sources.rows.filter(row => row.body).length, 35);
for (const source of sources.rows) {
  const [, , , sign, kind] = source.key.split("/");
  const body = bank[sign as keyof typeof bank][kind as MoonSummaryKind];
  assert.equal(body, source.body);
  assert.equal(sha(body), source.sha256);
  assert.equal(body.trim() ? body.split(/\s+/u).length : 0, source.wordCount);
  if (!body) assert.equal(source.status, "NEEDS OWNER COPY");
  else { assert.ok(source.sources.every(url => url.startsWith("https://private-author-source.invalid/"))); assert.ok(!body.endsWith(".") && !body.includes("—")); }
  const title = sign[0].toUpperCase() + sign.slice(1);
  const event = kind === "regular" ? undefined : { name: moonEventNames[kind as MoonSummaryKind], sign: title, degree: 12, isToday: true, countdown: "today", eclipseType: kind === "solarEclipse" ? "solar" as const : kind === "lunarEclipse" ? "lunar" as const : undefined };
  const parts = skyDailySummaryParts({ sun: { sign: "Virgo", degree: 15 }, moon: { sign: title, degree: 29 }, moonIsVoid: false, event });
  const text = parts.map(part => part.text).join("");
  const sourceParts = parts.filter(part => part.sourceKey?.includes("/moon/"));
  assert.equal(sourceParts.length, body ? 1 : 0);
  if (body) assert.equal(sourceParts[0].text, body);
  assert.equal(parts.filter(part => part.action === (event ? "lunation" : "moon")).length, 1);
  if (event) { assert.equal(parts.filter(part => part.action === "moon").length, 0); assert.ok(!text.includes("The next")); }
  const studio = buildSkySummaryComposition("Virgo", title, [], false, null, kind as MoonSummaryKind);
  assert.equal(studio.sources[1].field.key, source.key);
  assert.equal(studio.parts.filter(part => part.sourceKey === source.key).map(part => part.text).join(""), body);
}
assert.equal(selectedMoonKind({ name: "New Moon", eclipseType: "solar", isToday: true }), "solarEclipse");
assert.equal(selectedMoonKind({ name: "Full Moon", eclipseType: "lunar", isToday: true }), "lunarEclipse");
assert.equal(selectedMoonKind({ name: "New Moon", eclipseType: "solar", isToday: false }), "regular");
console.log("V6: 60 source-locked records, 35 exact passages, 25 blank gaps, single Moon selection, and Studio parity passed.");
const { importedSkySummary } = await import("../apps/admin/src/skySummaryImportedCopy.ts");
for (const row of sources.rows) assert.equal(importedSkySummary(row.key), undefined, "Event keys cannot fall back to historical regular Moon imports");
