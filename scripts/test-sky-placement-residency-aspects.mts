#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json"
);
const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
const sunScorpio = canonical.content.continuous.find(
  (row: { contentKey?: string }) => row.contentKey === "sky-placement/article/sun/scorpio"
);
assert.ok(sunScorpio, "Sun in Scorpio canonical placement article must remain present.");
const canonicalSunScorpioBytes = JSON.stringify(sunScorpio);

const vite = await createServer({
  root: path.join(repoRoot, "apps", "web"),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true }
});

try {
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const engineFacts = await ephemeris.getSkyPlacementTransitFacts({
    planet: "sun",
    sign: "scorpio",
    referenceDate: new Date("2026-11-01T12:00:00.000Z"),
    timeZone: "America/New_York"
  });
  const chronologicalEngineEvents = [...engineFacts.rankedEventsDuringTransit]
    .sort((first, second) => first.occursAt.localeCompare(second.occursAt));
  assert.deepEqual(
    chronologicalEngineEvents.map((event) => `${event.planet} ${event.aspect} ${event.otherPlanet}`),
    [
      "Sun conjunction Venus",
      "Sun square Pluto",
      "Sun conjunction Mercury",
      "Sun square Jupiter",
      "Sun square Mars"
    ],
    "The calculation engine itself must expose all five Sun in Scorpio residency aspects, including conjunctions."
  );
  assert.deepEqual(
    chronologicalEngineEvents.map((event) => event.dateKey),
    ["2026-10-23", "2026-10-26", "2026-11-04", "2026-11-18", "2026-11-19"],
    "Engine-owned Sun in Scorpio reader-local exact-aspect dates drifted."
  );

  const residency = await vite.ssrLoadModule("/src/services/skyPlacementResidencyAspects.ts");
  const result = await residency.skyPlacementResidencyAspectSections({
    planet: "sun",
    sign: "scorpio",
    referenceDate: "2026-11-01T12:00:00.000Z",
    timeZone: "America/New_York"
  });

  assert.equal(result.status, "resolved");
  assert.deepEqual(
    result.events.map((event: { heading: string }) => event.heading),
    [
      "Sun Conjunction Venus",
      "Sun Square Pluto",
      "Sun Conjunction Mercury",
      "Sun Square Jupiter",
      "Sun Square Mars"
    ],
    "Sun in Scorpio 2026 must expose the complete chronological major-aspect sequence."
  );
  const expectedDateLines = [
    "October 23, 2026",
    "October 26, 2026",
    "November 4, 2026",
    "November 18, 2026",
    "November 19, 2026"
  ];
  assert.deepEqual(
    result.events.map((event: { dateLine: string }) => event.dateLine),
    expectedDateLines,
    "Residency aspect dates must come from the engine and remain chronological in the reader timezone."
  );
  assert.equal(result.events.length, 5);
  assert.equal(result.sections.length, 5);
  assert.deepEqual(result.unresolvedEventIds, []);
  assert.ok(result.events.every((event: { resolution: string }) => event.resolution === "resolved-approved-exact"));
  assert.ok(result.sections.every((section: { role?: string }) => section.role === "aspect"));
  assert.deepEqual(
    result.sections.map((section: { body: string }) => section.body.split("\n\n", 1)[0]),
    expectedDateLines,
    "Each residency aspect card must surface the engine-owned exact date as its first paragraph."
  );
  assert.ok(result.sections.every((section: { body: unknown }) => typeof section.body === "string" && section.body.length > 0));
  assert.ok(result.sections.every((section: { body: string }) => !/\{\{/u.test(section.body)));
  assert.equal(new Set(result.events.map((event: { id: string }) => event.id)).size, 5, "Residency events must not duplicate.");
  assert.ok(
    result.sections.every((section: { group?: string }) => section.group === "lessons"),
    "The pilot must reuse the app's existing Gifts/Lessons classifier; conjunctions and squares remain Lessons."
  );

  const sunVirgo = await residency.skyPlacementResidencyAspectSections({
    planet: "sun",
    sign: "virgo",
    referenceDate: "2026-09-07T12:00:00.000Z",
    timeZone: "America/New_York"
  });
  const virgoLilithEvents = sunVirgo.events.filter((event: { heading: string }) => event.heading === "Sun Trine Lilith");
  const virgoLilithSections = sunVirgo.sections.filter((section: { heading: string }) => section.heading === "Sun Trine Lilith");
  assert.equal(virgoLilithEvents.length, 2, "Sun in Virgo must preserve both exact Sun trine Lilith events for auditability.");
  assert.equal(virgoLilithSections.length, 1, "A repeated exact aspect must render one reader passage, not repeat the prose.");
  assert.equal(
    (virgoLilithSections[0]?.body as string).split("\n\n", 1)[0],
    "September 2 and September 10, 2026",
    "Repeated exact hits must share one natural-language exact-date line."
  );
  assert.deepEqual(
    sunVirgo.sections.map((section: { heading: string }) => section.heading),
    [...new Set((sunVirgo.events as Array<{ heading: string }>).map((event) => event.heading))],
    "Gifts/Lessons must include every unique in-sign exact heading, including facts-only cards."
  );
  const firstVirgoEventTimeByHeading = new Map<string, number>();
  for (const event of sunVirgo.events as Array<{ heading: string; occursAt: string }>) {
    const time = new Date(event.occursAt).getTime();
    firstVirgoEventTimeByHeading.set(
      event.heading,
      Math.min(firstVirgoEventTimeByHeading.get(event.heading) ?? Number.POSITIVE_INFINITY, time)
    );
  }
  for (const group of ["gifts", "lessons"] as const) {
    const sectionTimes = sunVirgo.sections
      .filter((section: { group?: string }) => section.group === group)
      .map((section: { heading: string }) => firstVirgoEventTimeByHeading.get(section.heading) ?? Number.POSITIVE_INFINITY);
    assert.deepEqual(
      sectionTimes,
      [...sectionTimes].sort((first, second) => first - second),
      `Sun in Virgo ${group} must be ordered from earliest exact date to latest.`
    );
  }

  const unsupported = await residency.skyPlacementResidencyAspectSections({
    planet: "mars",
    sign: "scorpio",
    referenceDate: "2026-11-01T12:00:00.000Z",
    timeZone: "America/New_York"
  });
  assert.deepEqual(unsupported, {
    status: "unsupported-pilot",
    sections: [],
    events: [],
    unresolvedEventIds: []
  }, "The first implementation must remain Sun-only rather than silently expanding expensive residency scans.");

  const helper = await vite.ssrLoadModule("/src/services/skyPlacementInSignAspectSections.ts");
  const factsOnly = helper.skyPlacementInSignAspectSections([
    {
      id: "facts-only-missing-copy",
      occursAt: "2026-09-20T16:00:00.000Z",
      planet: "Sun",
      aspect: "square",
      otherPlanet: "Not A Planet"
    }
  ], "America/New_York");
  assert.deepEqual(factsOnly.unresolvedEventIds, ["facts-only-missing-copy"]);
  assert.equal(factsOnly.sections.length, 1);
  assert.equal(factsOnly.sections[0].heading, "Sun Square Not A Planet");
  assert.equal(factsOnly.sections[0].group, "lessons");
  assert.equal(factsOnly.sections[0].body, "September 20, 2026");
  assert.match(
    fs.readFileSync(path.join(repoRoot, "apps/web/src/features/sky/SkyDetailArticle.tsx"), "utf8"),
    /exactDateLine\s*\?\s*null/u,
    "Facts-only Gifts/Lessons cards must not reprint the exact date as a second paragraph."
  );

  const canonicalAfter = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
  const sunScorpioAfter = canonicalAfter.content.continuous.find(
    (row: { contentKey?: string }) => row.contentKey === "sky-placement/article/sun/scorpio"
  );
  assert.equal(JSON.stringify(sunScorpioAfter), canonicalSunScorpioBytes, "Sun in Scorpio canonical base copy drifted.");

  const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
  assert.match(
    appSource,
    /function skyPlacementArticleAspects\([\s\S]*?applyingPriority[\s\S]*?conjunctionPriority[\s\S]*?\.slice\(0, 1\)/u,
    "Compact/current-state placement aspect selection must retain the one-aspect cap."
  );
  assert.match(
    appSource,
    /skyPlacementInSignAspectSections\(\s*matchingAspectFacts\.inSign,\s*matchingAspectFacts\.timeZone,\s*generatedContent\s*\)/u,
    "Placement Gifts/Lessons must use the same in-sign exact list as Key dates."
  );
  assert.match(
    appSource,
    /placementResidencyContext:[\s\S]*?normalizeContentIdPart\(position\.planet\) === "sun"[\s\S]*?inSignAspectSections\.length === 0/u,
    "Swiss residency rescan remains a Sun-only fallback when the in-sign exact list is empty."
  );

  const ephemerisSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/ephemeris.ts"), "utf8");
  assert.match(ephemerisSource, /function findSkyPlacementResidencyAspects/u);
  assert.match(ephemerisSource, /planet === "Sun"[\s\S]*?findSkyPlacementResidencyAspects/u);
  assert.match(
    ephemerisSource,
    /function findSkyAspects\([\s\S]*?previousDistance === 0 \|\| previousDistance \* currentDistance < 0/u,
    "The existing Calendar scanner must remain byte-behaviorally separate from the residency-specific conjunction fix."
  );

  const detailSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/sky/SkyDetailArticle.tsx"), "utf8");
  assert.match(detailSource, /skyPlacementResidencyAspectSections/u);
  assert.match(
    detailSource,
    /hasInlineAspectSections/u,
    "Inline in-sign Gifts/Lessons cards must skip the extra Swiss residency scan."
  );
assert.match(
  detailSource,
  /residencyAspectSections[\s\S]*?residencyAspectSections\.some/u,
  "Residency enrichment must keep existing exact aspect content visible while loading and preserve unmatched approved aspects afterward."
);
  assert.doesNotMatch(
    detailSource,
    /relatedAspectGrouping\s*=\s*residencyContext[\s\S]*?"event"/u,
    "Residency enrichment must not replace the existing Gifts/Lessons aspect UI with an event-only group."
  );
  assert.match(
    detailSource,
    /\{ id: "gifts" as const, label: "Gifts" \}[\s\S]*?\{ id: "lessons" as const, label: "Lessons" \}/u,
    "Sky Placement must retain the existing Gifts and Lessons aspect section pattern."
  );
  assert.doesNotMatch(detailSource, /section\.dateLine/u, "Residency date rendering should remain inside the dynamically loaded aspect body.");
  assert.match(
    detailSource,
    /skyAspectExactDateLinePattern[\s\S]*?and\\s/u,
    "Sky placement exact-date parsing must accept a natural-language list of repeated exact dates."
  );

  console.log("Sky Placement residency aspects pilot: PASS (engine 5/5; exact approved copy 5/5; Gifts/Lessons UI preserved; compact selector preserved; base copy drift 0). ");
} finally {
  await vite.close();
}