import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(os.tmpdir(), `calendar-moon-reader-${process.pid}.mjs`);
await build({
  absWorkingDir: root, bundle: true, format: "esm", platform: "node", outfile: output,
  logLevel: "silent", define: { "import.meta.env": "{}" }, loader: { ".css": "empty" },
  stdin: { resolveDir: root, contents: `
    export { normalizeCalendarEventSurface } from "./apps/web/src/features/calendar/LunarCalendar.tsx";
    export { calendarEventGeneratedContentKeys } from "./apps/web/src/features/calendar/calendarContentKeys.ts";
    export { moonSignTransitions, moonSignTransitionKey } from "./apps/web/src/features/calendar/moonSignTransitions.ts";
    export { installContentPublications } from "./apps/web/src/content/contentPublicationState.ts";
  ` }
});
try {
  const runtime = await import(pathToFileURL(output));
  const resolve = (event, live = null) => runtime.normalizeCalendarEventSurface(event, live, "On Monday",
    null, null, null, live ? new Map([[live.contentKey, live]]) : undefined);
  const eventFor = (fromSign, toSign) => ({ type: "ingress", planet: "Moon", fromSign, toSign,
    sign: toSign, title: `Moon enters ${toSign}`, startsAt: "2026-09-21T17:14:23.000Z", dateKey: "2026-09-21" });
  assert.equal(Object.keys(runtime.moonSignTransitions).length, 12);
  for (const [pair, body] of Object.entries(runtime.moonSignTransitions)) {
    const [from, to] = pair.split("-");
    const event = eventFor(from, to);
    const key = runtime.moonSignTransitionKey(from, to);
    const surface = resolve(event);
    assert.equal(surface.status, "servable");
    assert.equal(surface.sections[0].body, body, `${pair}: preserve the entire owner unit.`);
    assert.deepEqual(surface.sections[0].sourceKeys, [key]);
    assert.deepEqual(runtime.calendarEventGeneratedContentKeys(event), [key], "Request the Calendar key, not Sky article keys.");
  }
  const event = eventFor("Capricorn", "Aquarius");
  const key = runtime.moonSignTransitionKey("Capricorn", "Aquarius");
  const live = { contentKey: key, id: "moon-transition-qa", updatedAt: "2026-09-21T12:00:00.000Z", status: "LIVE",
    body: "QA complete published opening.\n\nQA complete published ending.", summary: "QA shorter summary must not serve." };
  assert.equal(resolve(event, live).sections[0].body, live.body);
  assert.equal(resolve(event, { ...live, status: "DRAFT" }).sections[0].body, runtime.moonSignTransitions["capricorn-aquarius"]);
  assert.deepEqual(resolve(eventFor("Aries", "Aquarius"), live).sections, [], "Reject mismatched transition facts.");
  assert.deepEqual(resolve({ ...event, fromSign: undefined }).sections, [], "Do not guess a missing calculated sign.");
  assert.equal(resolve(event, { ...live, contentKey: "sky-placement-lived/moon/aquarius" }).sections[0].body,
    runtime.moonSignTransitions["capricorn-aquarius"], "Sky prose is not a Calendar source.");
  runtime.installContentPublications([{ content_key: key, state: "live", revision: 1,
    row_id: live.id, row_updated_at: live.updatedAt, updated_at: live.updatedAt }]);
  assert.equal(resolve(event, live).sections[0].body, live.body);
  assert.deepEqual(resolve(event).sections, [], "A missing published replacement cannot resurrect the bundled unit.");
  assert.deepEqual(resolve(event, { ...live, updatedAt: "2026-09-20T12:00:00.000Z" }).sections, [], "Reject stale published copy.");
  runtime.installContentPublications([{ content_key: key, state: "retired", revision: 2,
    row_id: null, row_updated_at: null, updated_at: live.updatedAt }]);
  assert.deepEqual(resolve(event, live).sections, [], "Retirement applies to both live and bundled copy.");
  console.log("Calendar Moon cards: all 12 complete owner passages, exact requests, live precedence, version checks and retirement passed.");
} finally {
  fs.rmSync(output, { force: true });
}
