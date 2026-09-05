#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const write = (relativePath, content) => fs.writeFileSync(path.join(repoRoot, relativePath), content);

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Could not find ${label}.`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`${label} is not unique.`);
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
}

const appPath = "apps/web/src/App.tsx";
let app = read(appPath);

// Preserve one reader-facing Gift and one Lesson inside the existing two-card cap.
const relatedStart = app.indexOf("function relatedSkyAspectSectionsForPlacement({");
const relatedEnd = app.indexOf("\nfunction skyPlacementAspectExactMoment(", relatedStart);
if (relatedStart < 0 || relatedEnd < 0) throw new Error("Could not locate relatedSkyAspectSectionsForPlacement.");
const currentRelated = app.slice(relatedStart, relatedEnd);
if (!currentRelated.includes("const giftSection = resolvedSections.find")) {
  const replacement = `function relatedSkyAspectSectionsForPlacement({
  aspects,
  generatedAt,
  generatedContent,
  pointName,
  positions
}: {
  aspects: SkySnapshot["aspects"];
  generatedAt: string;
  generatedContent: GeneratedContentMap;
  pointName: string;
  positions: PlanetPosition[];
}): SkyDetailSection[] {
  const resolvedSections = aspects
    .filter((aspect) => aspect.from === pointName || aspect.to === pointName)
    .filter((aspect, index, matchingAspects) => uniqueNatalAspectRows(matchingAspects).includes(aspect))
    .slice()
    .sort((first, second) => first.orb - second.orb)
    .flatMap((aspect) => {
      const aspectDetail = currentSkyAspectDetailArticle(aspect, generatedAt, generatedContent, positions);
      const body = aspectDetail.body
        .filter((paragraph): paragraph is string => typeof paragraph === "string")
        .map((paragraph) => stripLegacySkyArticleScaffoldPrefix(stripTldrPrefix(paragraph)).trim())
        .filter((paragraph) => paragraph && isReaderFacingCopy(paragraph))
        .join("\\n\\n");

      if (!body) return [];

      return [{
        orb: aspect.orb,
        section: {
          heading: aspectDetail.title,
          body,
          role: "aspect" as const,
          aspectType: aspect.type,
          group: normalizedAspectToneBucket(aspect.type)
        } satisfies SkyDetailSection
      }];
    });
  const giftSection = resolvedSections.find(({ section }) => section.group === "gifts");
  const lessonSection = resolvedSections.find(({ section }) => section.group === "lessons");

  if (giftSection && lessonSection) {
    return [giftSection, lessonSection]
      .sort((first, second) => first.orb - second.orb)
      .map(({ section }) => section);
  }

  return resolvedSections
    .slice(0, 2)
    .map(({ section }) => section);
}
`;
  app = `${app.slice(0, relatedStart)}${replacement}${app.slice(relatedEnd)}`;
}

// Make the lazy exact registry revision part of open-detail refresh state.
if (app.includes("const [, setContentRegistryVersion] = useState(0);")) {
  app = replaceOnce(
    app,
    "const [, setContentRegistryVersion] = useState(0);",
    "const [contentRegistryVersion, setContentRegistryVersion] = useState(0);",
    "content registry state"
  );
} else if (!app.includes("const [contentRegistryVersion, setContentRegistryVersion] = useState(0);")) {
  throw new Error("Content registry state shape changed.");
}

const oldRefreshKey = "const refreshKey = `${skyDetailRoutePath}:${fallbackArchitectureV3Version}:${personalizationKey}`;";
const newRefreshKey = "const refreshKey = `${skyDetailRoutePath}:${fallbackArchitectureV3Version}:${contentRegistryVersion}:${personalizationKey}`;";
if (app.includes(oldRefreshKey)) {
  app = replaceOnce(app, oldRefreshKey, newRefreshKey, "Sky detail refresh key");
} else if (!app.includes(newRefreshKey)) {
  throw new Error("Sky detail refresh key shape changed.");
}

const oldDeps = "}, [fallbackArchitectureV3Version, profileNatalSky?.ascendant, selectedSkyDetail?.routePath, sky, skyDetailRoutePath, skyGeneratedContent, skyPlacementPersonalizationTransits, userProfile?.rising]);";
const newDeps = "}, [contentRegistryVersion, fallbackArchitectureV3Version, profileNatalSky?.ascendant, selectedSkyDetail?.routePath, sky, skyDetailRoutePath, skyGeneratedContent, skyPlacementPersonalizationTransits, userProfile?.rising]);";
if (app.includes(oldDeps)) {
  app = replaceOnce(app, oldDeps, newDeps, "Sky detail effect dependencies");
} else if (!app.includes(newDeps)) {
  throw new Error("Sky detail effect dependency list changed.");
}

// Content Studio exact copy is allowed only for a true canonical exact gap.
const exactStart = app.indexOf("function approvedExactSkyAspectWritingSection(");
const exactEnd = app.indexOf("\nfunction reviewedSkyAspectWritingSection(", exactStart);
if (exactStart < 0 || exactEnd < 0) throw new Error("Could not locate approvedExactSkyAspectWritingSection.");
let exactFunction = app.slice(exactStart, exactEnd);
if (!exactFunction.includes('const loadedExactRegistry = contentRegistryFor("sky");')) {
  exactFunction = replaceOnce(
    exactFunction,
    "  if (studio) {",
    `  const loadedExactRegistry = contentRegistryFor("sky");

  if (
    studio
    && loadedExactRegistry
    && !loadedExactRegistry.approvedExactSkyAspectCopy(aspect.from, aspect.type, aspect.to)
  ) {`,
    "Content Studio exact return boundary"
  );
}
app = `${app.slice(0, exactStart)}${exactFunction}${app.slice(exactEnd)}`;
write(appPath, app);

// Shared routing keeps canonical exact copy ahead of legacy sign-specific copy.
const routingPath = "apps/web/src/services/skyAspectRouting.ts";
let routing = read(routingPath);
const oldPrecedence = "  return composed ?? signSpecific ?? exact ?? phrasebook ?? generated ?? fallback ?? null;";
const newPrecedence = "  return composed ?? exact ?? signSpecific ?? phrasebook ?? generated ?? fallback ?? null;";
if (routing.includes(oldPrecedence)) {
  routing = replaceOnce(routing, oldPrecedence, newPrecedence, "Sky aspect precedence");
} else if (!routing.includes(newPrecedence)) {
  throw new Error("Sky aspect precedence shape changed.");
}
write(routingPath, routing);

// Calendar canonical exact copy outranks its Content Studio mirror.
const calendarPath = "apps/web/src/features/calendar/LunarCalendar.tsx";
let calendar = read(calendarPath);
if (calendar.includes("      exact: studioExact ?? exact,")) {
  calendar = replaceOnce(
    calendar,
    "      exact: studioExact ?? exact,",
    "      exact: exact ?? studioExact,",
    "Calendar exact authority"
  );
} else if (!calendar.includes("      exact: exact ?? studioExact,")) {
  throw new Error("Calendar exact candidate shape changed.");
}
write(calendarPath, calendar);

// Point the routing parity test at the latest 248-row owner projection.
const routingTestPath = "scripts/test-calendar-exact-sky-aspect-routing.mjs";
let routingTest = read(routingTestPath);
const oldPayloadPath = "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-batch-30/current-owner-payloads.json";
const newPayloadPath = "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-held-trines-33/current-owner-payloads.json";
if (routingTest.includes(oldPayloadPath)) {
  routingTest = routingTest.replace(oldPayloadPath, newPayloadPath);
} else if (!routingTest.includes(newPayloadPath)) {
  throw new Error("Calendar owner payload projection path changed.");
}

const oldBlockStart = routingTest.indexOf("const signSpecificOverride = normalizeCalendarEventSurface(");
const oldBlockEnd = routingTest.indexOf("\nconst phrasebookBeforeGenerated =", oldBlockStart);
if (oldBlockStart >= 0 && oldBlockEnd > oldBlockStart) {
  const replacement = `const exactBeforeSignSpecific = normalizeCalendarEventSurface(
  aspectEvent({
    first: "Venus",
    second: "Saturn",
    aspect: "square",
    fromSign: "Aries",
    toSign: "Cancer",
    id: "precedence-exact-over-sign-specific"
  }),
  {
    body: "Generated copy must not outrank exact owner-approved copy.",
    contentKey: "generated/precedence-test",
    headline: "Generated precedence test"
  },
  "On Tuesday, August 11",
  null,
  exactLookup
);

assert.equal(exactBeforeSignSpecific.sections[0]?.tier, "approved-exact-sky-aspect-v1");
assert.equal(
  exactBeforeSignSpecific.sections[0]?.body,
  exactLookup("Venus", "square", "Saturn")?.body,
  "Legacy sign-specific copy must not replace an available owner-approved exact aspect body."
);
`;
  routingTest = `${routingTest.slice(0, oldBlockStart)}${replacement}${routingTest.slice(oldBlockEnd)}`;
} else if (!routingTest.includes("const exactBeforeSignSpecific = normalizeCalendarEventSurface(")) {
  throw new Error("Calendar sign-specific precedence regression block changed.");
}
write(routingTestPath, routingTest);

// The exact corpus now contains all 248 released rows.
const phrasebookTestPath = "scripts/test-reviewed-sky-aspect-phrasebook.mjs";
let phrasebookTest = read(phrasebookTestPath);
if (phrasebookTest.includes("assert.equal(exactTransitRecords.length, 215);")) {
  phrasebookTest = phrasebookTest.replace(
    "assert.equal(exactTransitRecords.length, 215);",
    "assert.equal(exactTransitRecords.length, 248);"
  );
} else if (!phrasebookTest.includes("assert.equal(exactTransitRecords.length, 248);")) {
  throw new Error("Reviewed Sky aspect exact corpus count changed.");
}
write(phrasebookTestPath, phrasebookTest);

console.log("Applied permanent Sky exact Content Studio authority repair.");
