#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function buildGeneratedContentMap(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!row?.contentKey || !row?.body) {
      continue;
    }

    if (!map.has(row.contentKey)) {
      map.set(row.contentKey, row);
    }

    for (const alias of row.aliases ?? []) {
      if (alias && !map.has(alias)) {
        map.set(alias, row);
      }
    }
  }

  return map;
}

function mergeGeneratedContentMaps(primary, secondary) {
  return new Map([...secondary, ...primary]);
}

function slugContentPart(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-/g, "_");
}

function calendarRetrogradeKeys(event) {
  const planetPart = slugContentPart(event.planet);
  const signPart = slugContentPart(event.sign);
  const phasePart = event.phase.replace(/-/g, "_");

  return [
    `sky.retrograde.${planetPart}.${signPart}.${phasePart}`,
    `fallback-hook/sky.retrograde/${planetPart}/${signPart}/${event.phase}`
  ];
}

function normalizedContentSlots(content) {
  const slots = content?.sections?.slots;

  return slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
}

function contentMatchesCalendarEventFacts(event, content) {
  if (!content) {
    return false;
  }

  const slots = normalizedContentSlots(content);
  const canonicalKey = typeof content.sourceSnapshot?.canonicalKey === "string"
    ? content.sourceSnapshot.canonicalKey
    : content.contentKey;
  const expected = `sky.retrograde.${slugContentPart(event.planet)}.${slugContentPart(event.sign)}.${event.phase.replace(/-/g, "_")}`;

  return (
    canonicalKey === expected
    && slots.planet === event.planet
    && slots.sign === event.sign
    && slots.phase === event.phase
  );
}

function selectCalendarContent(map, event) {
  for (const key of calendarRetrogradeKeys(event)) {
    const content = map.get(key);

    if (contentMatchesCalendarEventFacts(event, content)) {
      return content;
    }
  }

  return null;
}

function isoDate(value) {
  assert.ok(value, "Expected an ISO timestamp.");
  return String(value).slice(0, 10);
}

function assertNoPattern(source, pattern, message) {
  assert.ok(!pattern.test(source), message);
}

async function main() {
  const appSource = read("apps/web/src/App.tsx");
  const ephemerisSource = read("apps/web/src/services/ephemeris.ts");
  const calendarSource = read("apps/web/src/features/calendar/LunarCalendar.tsx");
  const aliasSource = read("apps/web/src/services/generatedContentKeys.ts");
  const readerSafetySource = read("apps/web/src/content/readerSafety.ts");
  const snapshot = readJson("apps/web/src/content/skyContentSnapshot.json");
  const snapshotSource = JSON.stringify(snapshot);
  const normalizedSnapshotMap = buildGeneratedContentMap(snapshot.rows);
  const hydratedLegacyRemoteMap = buildGeneratedContentMap([
    {
      contentKey: "sky-retrograde-mercury",
      aliases: ["sky-retrograde-mercury", "sky-mercury-in-aries"],
      body: "Mercury is in pre-shadow in Aries. Use the calculated retrograde dates before publishing.",
      sections: { slots: { planet: "Mercury", sign: "Aries", phase: "pre-shadow" } },
      sourceSnapshot: { canonicalKey: "sky.retrograde.mercury.aries.pre_shadow", sourceType: "legacy-dashboard-row" },
      provider: "dashboard-source"
    }
  ]);
  const preHydrationMap = normalizedSnapshotMap;
  const postHydrationMap = mergeGeneratedContentMaps(normalizedSnapshotMap, hydratedLegacyRemoteMap);

  assertNoPattern(snapshotSource, /Use the calculated retrograde dates before publishing/i, "Generated Sky snapshot must not contain editorial publishing instructions.");
  assertNoPattern(calendarSource, /`sky-retrograde-\$\{planetPart\}`/, "Calendar key selection must not ask for generic retrograde planet aliases.");
  assertNoPattern(aliasSource, /addAlias\(aliases,\s*`sky-retrograde-\$\{retrograde\.planet\}`\)/, "Generated content aliasing must not create generic retrograde planet aliases.");
  assertNoPattern(appSource, /\b0th house\b/i, "Reader code must not contain the literal 0th-house display.");
  assertNoPattern(appSource, /is your natal Ascendant/i, "Reader code must not contain the broken transit-perspective sentence.");
  assert.ok(readerSafetySource.includes("before publishing"), "Reader safety must reject editorial publishing instructions.");
  assert.ok(ephemerisSource.includes("retrogradeCycleFactsFor"), "Ephemeris service must expose normalized retrograde cycle facts.");
  assert.ok(ephemerisSource.includes("retrogradePhase: \"retrograde-passage\""), "Ephemeris service must mark active retrograde passage facts.");
  assert.ok(ephemerisSource.includes("retrogradeShadowStart"), "Ephemeris service must calculate shadow facts.");
  assert.ok(ephemerisSource.includes("cazimiOrb"), "Ephemeris service must calculate cazimi facts.");

  const vite = await createServer({
    root: path.join(repoRoot, "apps/web"),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error"
  });

  try {
    const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
    const fixtures = [
      {
        label: "Mercury retrograde in Pisces",
        date: new Date(2026, 2, 10, 12),
        month: new Date(2026, 2, 1, 12),
        sign: "Pisces",
        retrogradeStart: "2026-02-26",
        retrogradeEnd: "2026-03-20",
        contentKey: "sky.retrograde.mercury.pisces.retrograde_passage"
      },
      {
        label: "Mercury retrograde in Cancer",
        date: new Date(2026, 6, 12, 12),
        month: new Date(2026, 6, 1, 12),
        sign: "Cancer",
        retrogradeStart: "2026-06-29",
        retrogradeEnd: "2026-07-23",
        contentKey: "sky.retrograde.mercury.cancer.retrograde_passage"
      },
      {
        label: "Mercury retrograde in Scorpio",
        date: new Date(2026, 10, 1, 12),
        month: new Date(2026, 10, 1, 12),
        sign: "Scorpio",
        retrogradeStart: "2026-10-24",
        retrogradeEnd: "2026-11-13",
        contentKey: "sky.retrograde.mercury.scorpio.retrograde_passage"
      }
    ];
    const fixtureResults = [];

    for (const fixture of fixtures) {
      const sky = await ephemeris.getAstrodienstSky(ephemeris.defaultLocation, fixture.date, {
        includeTransitWindows: true
      });
      const mercury = sky.positions.find((position) => position.planet === "Mercury");

      assert.ok(mercury, `${fixture.label}: Mercury position must be present.`);
      assert.equal(mercury.sign, fixture.sign, `${fixture.label}: calculated sign must match.`);
      assert.equal(mercury.motion, "retrograde", `${fixture.label}: Mercury must be retrograde.`);
      assert.equal(mercury.retrogradePhase, "retrograde-passage", `${fixture.label}: phase must be retrograde passage.`);
      assert.equal(isoDate(mercury.retrogradeStart), fixture.retrogradeStart, `${fixture.label}: retrograde start must match.`);
      assert.equal(isoDate(mercury.retrogradeEnd), fixture.retrogradeEnd, `${fixture.label}: retrograde end must match.`);
      assert.ok(mercury.retrogradeShadowStart, `${fixture.label}: shadow start must be calculated.`);
      assert.ok(mercury.retrogradeShadowEnd, `${fixture.label}: shadow end must be calculated.`);
      assert.equal(typeof mercury.cazimi, "boolean", `${fixture.label}: cazimi state must be boolean.`);
      assert.equal(typeof mercury.cazimiOrb, "number", `${fixture.label}: cazimi orb must be numeric.`);
      assert.ok(Number.isInteger(mercury.house) && mercury.house >= 1 && mercury.house <= 12, `${fixture.label}: house must be 1 through 12.`);

      const calendar = await ephemeris.getLunarCalendarMonth(ephemeris.defaultLocation, fixture.month, {
        detail: "full"
      });
      const dateKey = fixture.date.toLocaleDateString("en-CA", { timeZone: ephemeris.defaultLocation.timeZone });
      const day = calendar.days.find((entry) => entry.dateKey === dateKey);
      const event = day?.events.find((entry) => entry.planet === "Mercury" && entry.title === "Mercury retrograde");

      assert.ok(event, `${fixture.label}: calendar day must expose active Mercury retrograde event.`);
      assert.equal(event.sign, fixture.sign, `${fixture.label}: calendar sign must match calculated sign.`);
      assert.equal(event.direction, "retrograde", `${fixture.label}: calendar direction must be retrograde.`);
      assert.equal(event.phase, "retrograde-passage", `${fixture.label}: calendar phase must be retrograde passage.`);
      assert.equal(isoDate(event.retrogradeStart), fixture.retrogradeStart, `${fixture.label}: calendar retrograde start must match.`);
      assert.equal(isoDate(event.retrogradeEnd), fixture.retrogradeEnd, `${fixture.label}: calendar retrograde end must match.`);
      assert.ok(event.shadowStart, `${fixture.label}: calendar shadow start must be exposed.`);
      assert.ok(event.shadowEnd, `${fixture.label}: calendar shadow end must be exposed.`);
      assert.equal(typeof event.cazimi, "boolean", `${fixture.label}: calendar cazimi state must be boolean.`);
      assert.equal(typeof event.cazimiOrb, "number", `${fixture.label}: calendar cazimi orb must be numeric.`);
      assert.equal(event.cazimi, event.cazimiOrb <= 1, `${fixture.label}: calendar cazimi state must follow the 1 degree orb convention.`);

      const snapshotRow = normalizedSnapshotMap.get(fixture.contentKey);

      assert.ok(snapshotRow, `${fixture.label}: normalized content row must exist.`);
      assert.equal(snapshotRow.sourceSnapshot?.canonicalKey, fixture.contentKey, `${fixture.label}: source provenance must retain canonical key.`);
      assert.equal(snapshotRow.sourceSnapshot?.sourceType, "source-grounded-generated-snapshot", `${fixture.label}: prose source type must identify source-grounded generated snapshot.`);
      assert.equal(snapshotRow.sourceSnapshot?.templateVersion, "final-source-grounded-templates:2026-07-13", `${fixture.label}: content provenance must retain original package template version.`);
      assert.equal(snapshotRow.sections?.slots?.planet, "Mercury", `${fixture.label}: content planet slot must be Mercury.`);
      assert.equal(snapshotRow.sections?.slots?.sign, fixture.sign, `${fixture.label}: content sign slot must match.`);
      assert.equal(snapshotRow.sections?.slots?.phase, "retrograde-passage", `${fixture.label}: content phase slot must match.`);
      assert.ok(snapshotRow.body.includes(`Mercury is moving retrograde through ${fixture.sign}`), `${fixture.label}: copy must name calculated sign and phase.`);
      assertNoPattern(snapshotRow.body, /\bpre-shadow in Aries\b/i, `${fixture.label}: copy must not use the stale Aries pre-shadow row.`);
      assertNoPattern(snapshotRow.body, /before publishing/i, `${fixture.label}: copy must not expose editorial instructions.`);

      const preContent = selectCalendarContent(preHydrationMap, event);
      const postContent = selectCalendarContent(postHydrationMap, event);

      assert.ok(preContent, `${fixture.label}: pre-hydration content must resolve.`);
      assert.ok(postContent, `${fixture.label}: post-hydration content must resolve.`);
      assert.equal(preContent.body, postContent.body, `${fixture.label}: body must be identical before and after hydration.`);
      assert.deepEqual(preContent.sourceSnapshot, postContent.sourceSnapshot, `${fixture.label}: provenance must be identical before and after hydration.`);
      assert.equal(postContent.sourceSnapshot?.canonicalKey, fixture.contentKey, `${fixture.label}: hydrated content must retain exact canonical key.`);

      fixtureResults.push({
        label: fixture.label,
        sign: mercury.sign,
        motion: mercury.motion,
        phase: mercury.retrogradePhase,
        retrogradeStart: isoDate(mercury.retrogradeStart),
        retrogradeEnd: isoDate(mercury.retrogradeEnd),
        shadowStart: isoDate(mercury.retrogradeShadowStart),
        shadowEnd: isoDate(mercury.retrogradeShadowEnd),
        cazimi: mercury.cazimi,
        cazimiOrb: mercury.cazimiOrb,
        house: mercury.house,
        sourceKey: postContent.sourceSnapshot?.canonicalKey
      });
    }

    console.log(JSON.stringify({ ok: true, fixtures: fixtureResults }, null, 2));
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
