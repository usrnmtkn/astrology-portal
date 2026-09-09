import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(os.tmpdir(), `calendar-station-reader-${process.pid}.mjs`);
await build({
  absWorkingDir: root, bundle: true, format: "esm", platform: "node", outfile: output,
  logLevel: "silent", define: { "import.meta.env": "{}" }, loader: { ".css": "empty" },
  stdin: { resolveDir: root, contents: `
    export { normalizeCalendarEventSurface } from "./apps/web/src/features/calendar/LunarCalendar.tsx";
    export { loadSkyPlacementFallbackArchitectureV3Bundle, skyV4ReaderRenderer } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
    export { installContentPublications } from "./apps/web/src/content/contentPublicationState.ts";
  ` }
});
try {
  const runtime = await import(pathToFileURL(output));
  const event = { type: "station", planet: "Lilith", sign: "Capricorn", direction: "retrograde",
    title: "Lilith stations retrograde in Capricorn", startsAt: "2026-09-09T06:15:00Z", dateKey: "2026-09-09" };
  const resolve = (facts = event) => runtime.normalizeCalendarEventSurface(facts, null);
  assert.equal(resolve().status, "not-servable", "A cold reader must wait for its approved package.");
  await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
  const expected = runtime.skyV4ReaderRenderer.renderRoute({ route: "lilith-station", stationSupported: true }).readerParts.join("\n\n");
  assert.ok(expected.includes("It is to stop pretending the preference does not exist."));
  for (const direction of ["retrograde", "direct"]) {
    const surface = resolve({ ...event, direction });
    assert.equal(surface.status, "servable");
    assert.equal(surface.sections[0].body, expected, "Calendar preserves the complete approved Sky detail unit.");
    assert.deepEqual(surface.sections[0].sourceKeys, ["sky-lilith/station"]);
  }
  const passage = resolve({ ...event, phase: "retrograde-passage" });
  assert.ok(passage.sections.every(section => !section.sourceKeys.includes("sky-lilith/station")),
    "A retrograde passage is not a calculated station.");
  const legacyPassage = resolve({ ...event, title: "Lilith retrograde in Capricorn" });
  assert.ok(legacyPassage.sections.every(section => !section.sourceKeys.includes("sky-lilith/station")),
    "An older ongoing event without a phase field must not borrow station writing.");
  runtime.installContentPublications([{ content_key: "sky-lilith/station", state: "retired", revision: 1,
    row_id: null, row_updated_at: null, updated_at: "2026-09-09T00:00:00Z" }]);
  assert.deepEqual(resolve().sections, [], "Retirement must not expose another fallback.");
  console.log("Calendar station reader: cold load, both motions, complete copy, provenance and retirement passed.");
} finally {
  fs.rmSync(output, { force: true });
}
