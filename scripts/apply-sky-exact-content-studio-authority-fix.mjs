#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(repoRoot, relativePath), content);
}

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Could not find ${label}.`);
  if (source.indexOf(before, index + before.length) >= 0) {
    throw new Error(`${label} is not unique.`);
  }
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
}

// 1. Sky placement details keep one reader-facing Gift and one Lesson when both exist.
const appPath = "apps/web/src/App.tsx";
let appSource = read(appPath);
const relatedStart = appSource.indexOf("function relatedSkyAspectSectionsForPlacement({");
const relatedEnd = appSource.indexOf("\nfunction skyPlacementAspectExactMoment(", relatedStart);
if (relatedStart < 0 || relatedEnd < 0) throw new Error("Could not locate relatedSkyAspectSectionsForPlacement.");
const relatedReplacement = `function relatedSkyAspectSectionsForPlacement({
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
const existingRelated = appSource.slice(relatedStart, relatedEnd);
if (!existingRelated.includes("const giftSection = resolvedSections.find")) {
  if (!existingRelated.includes(".sort((first, second) => first.orb - second.orb)") || !existingRelated.includes(".slice(0, 2)")) {
    throw new Error("Expected orb-first two-aspect placement selection boundary was not found.");
  }
  appSource = `${appSource.slice(0, relatedStart)}${relatedReplacement}${appSource.slice(relatedEnd)}`;
}

// 2. An open Sky detail must rebuild after the lazy exact-content registry arrives.
if (appSource.includes("const [, setContentRegistryVersion] = useState(0);")) {
  appSource = replaceOnce(
    appSource,
    "const [, setContentRegistryVersion] = useState(0);",
    "const [contentRegistryVersion, setContentRegistryVersion] = useState(0);",
    "content registry version state"
  );
} else if (!appSource.includes("const [contentRegistryVersion, setContentRegistryVersion] = useState(0);")) {
  throw new Error("Content registry version state shape changed.");
}

const staleRefreshKey = "const refreshKey = `${skyDetailRoutePath}:${fallbackArchitectureV3Version}:${personalizationKey}`;";
const currentRefreshKey = "const refreshKey = `${skyDetailRoutePath}:${fallbackArchitectureV3Version}:${contentRegistryVersion}:${personalizationKey}`;";
if (appSource.includes(staleRefreshKey)) {
  appSource = replaceOnce(appSource, staleRefreshKey, currentRefreshKey, "Sky detail refresh key");
} else if (!appSource.includes(currentRefreshKey)) {
  throw new Error("Sky detail refresh key shape changed.");
}

const staleDependencies = "}, [fallbackArchitectureV3Version, profileNatalSky?.ascendant, selectedSkyDetail?.routePath, sky, skyDetailRoutePath, skyGeneratedContent, skyPlacementPersonalizationTransits, userProfile?.rising]);";
const currentDependencies = "}, [contentRegistryVersion, fallbackArchitectureV3Version, profileNatalSky?.ascendant, selectedSkyDetail?.routePath, sky, skyDetailRoutePath, skyGeneratedContent, skyPlacementPersonalizationTransits, userProfile?.rising]);";
if (appSource.includes(staleDependencies)) {
  appSource = replaceOnce(appSource, staleDependencies, currentDependencies, "Sky detail registry refresh dependencies");
} else if (!appSource.includes(currentDependencies)) {
  throw new Error("Sky detail refresh dependency list changed.");
}

// 3. Content Studio exact copy may fill a true canonical gap, but can never replace
// a different owner-approved exact package body.
const exactFunctionStart = appSource.indexOf("function approvedExactSkyAspectWritingSection(");
const exactFunctionEnd = appSource.indexOf("\nfunction reviewedSkyAspectWritingSection(", exactFunctionStart);
if (exactFunctionStart < 0 || exactFunctionEnd < 0) throw new Error("Could not locate approvedExactSkyAspectWritingSection.");
let exactFunction = appSource.slice(exactFunctionStart, exactFunctionEnd);
if (!exactFunction.includes("const loadedExactRegistry = contentRegistryFor(\"sky\");")) {
  exactFunction = replaceOnce(
    exactFunction,
    "  if (studio) {",
    `  const loadedExactRegistry = contentRegistryFor("sky");\n\n  if (\n    studio\n    && loadedExactRegistry\n    && !loadedExactRegistry.approvedExactSkyAspectCopy(aspect.from, aspect.type, aspect.to)\n  ) {`,
    "Content Studio exact return boundary"
  );
}
appSource = `${appSource.slice(0, exactFunctionStart)}${exactFunction}${appSource.slice(exactFunctionEnd)}`;

// Keep object order aligned with precedence so review tests describe the real rule.
const staleAppCandidateOrder = "      signSpecific: signAwareSection,\n      exact: authoredSection,";
const currentAppCandidateOrder = "      exact: authoredSection,\n      signSpecific: signAwareSection,";
if (appSource.includes(staleAppCandidateOrder)) {
  appSource = replaceOnce(appSource, staleAppCandidateOrder, currentAppCandidateOrder, "App exact/sign-specific candidate order");
}
write(appPath, appSource);

// 4. Shared precedence: composed > canonical exact > sign-specific > phrasebook > generated.
const routingPath = "apps/web/src/services/skyAspectRouting.ts";
let routingSource = read(routingPath);
const stalePrecedence = "  return composed ?? signSpecific ?? exact ?? phrasebook ?? generated ?? fallback ?? null;";
const currentPrecedence = "  return composed ?? exact ?? signSpecific ?? phrasebook ?? generated ?? fallback ?? null;";
if (routingSource.includes(stalePrecedence)) {
  routingSource = replaceOnce(routingSource, stalePrecedence, currentPrecedence, "Sky aspect precedence");
} else if (!routingSource.includes(currentPrecedence)) {
  throw new Error("Sky aspect precedence boundary changed.");
}
write(routingPath, routingSource);

// 5. Calendar exact package copy outranks its Content Studio mirror. The mirror is a
// fallback only when the canonical exact row does not exist.
const calendarPath = "apps/web/src/features/calendar/LunarCalendar.tsx";
let calendarSource = read(calendarPath);
const staleCalendarExact = "      exact: studioExact ?? exact,";
const currentCalendarExact = "      exact: exact ?? studioExact,";
if (calendarSource.includes(staleCalendarExact)) {
  calendarSource = replaceOnce(calendarSource, staleCalendarExact, currentCalendarExact, "Calendar canonical exact authority");
} else if (!calendarSource.includes(currentCalendarExact)) {
  throw new Error("Calendar exact candidate boundary changed.");
}
const staleCalendarOrder = "      signSpecific: packageCandidates.signSpecific,\n      exact: exact ?? studioExact,";
const currentCalendarOrder = "      exact: exact ?? studioExact,\n      signSpecific: packageCandidates.signSpecific,";
if (calendarSource.includes(staleCalendarOrder)) {
  calendarSource = replaceOnce(calendarSource, staleCalendarOrder, currentCalendarOrder, "Calendar exact/sign-specific candidate order");
}
write(calendarPath, calendarSource);

// 6. Refresh corpus routing tests to the current 248-row owner projection and the
// canonical-exact-before-Studio/sign-specific rule.
const routingTestPath = "scripts/test-calendar-exact-sky-aspect-routing.mjs";
let routingTest = read(routingTestPath);
const stalePayloadPath = "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-batch-30/current-owner-payloads.json";
const currentPayloadPath = "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-held-trines-33/current-owner-payloads.json";
if (routingTest.includes(stalePayloadPath)) {
  routingTest = routingTest.replace(stalePayloadPath, currentPayloadPath);
} else if (!routingTest.includes(currentPayloadPath)) {
  throw new Error("Calendar routing owner projection path changed.");
}
const oldBlockStart = routingTest.indexOf("const signSpecificOverride = normalizeCalendarEventSurface(");
const oldBlockEnd = routingTest.indexOf("\nconst phrasebookBeforeGenerated =", oldBlockStart);
if (oldBlockStart >= 0 && oldBlockEnd > oldBlockStart) {
  const newBlock = `const exactBeforeSignSpecific = normalizeCalendarEventSurface(\n  aspectEvent({\n    first: "Venus",\n    second: "Saturn",\n    aspect: "square",\n    fromSign: "Aries",\n    toSign: "Cancer",\n    id: "precedence-exact-over-sign-specific"\n  }),\n  {\n    body: "Generated copy must not outrank exact owner-approved copy.",\n    contentKey: "generated/precedence-test",\n    headline: "Generated precedence test"\n  },\n  "On Tuesday, August 11",\n  null,\n  exactLookup\n);\n\nassert.equal(exactBeforeSignSpecific.sections[0]?.tier, "approved-exact-sky-aspect-v1");\nassert.equal(\n  exactBeforeSignSpecific.sections[0]?.body,\n  exactLookup("Venus", "square", "Saturn")?.body,\n  "Legacy sign-specific copy must not replace an available owner-approved exact aspect body."\n);\n`;
  routingTest = `${routingTest.slice(0, oldBlockStart)}${newBlock}${routingTest.slice(oldBlockEnd)}`;
} else if (!routingTest.includes("const exactBeforeSignSpecific = normalizeCalendarEventSurface(")) {
  throw new Error("Calendar sign-specific precedence regression block changed.");
}
write(routingTestPath, routingTest);

const phrasebookTestPath = "scripts/test-reviewed-sky-aspect-phrasebook.mjs";
let phrasebookTest = read(phrasebookTestPath);
if (phrasebookTest.includes("assert.equal(exactTransitRecords.length, 215);")) {
  phrasebookTest = phrasebookTest.replace("assert.equal(exactTransitRecords.length, 215);", "assert.equal(exactTransitRecords.length, 248);");
} else if (!phrasebookTest.includes("assert.equal(exactTransitRecords.length, 248);")) {
  throw new Error("Reviewed phrasebook exact corpus count changed.");
}
phrasebookTest = phrasebookTest.replace(
  /signSpecific: signAwareSection,\[\\s\\S\]\*exact: authoredSection,/gu,
  "exact: authoredSection,[\\s\\S]*signSpecific: signAwareSection,"
);
write(phrasebookTestPath, phrasebookTest);

const publishedStudioTestPath = "scripts/test-published-calendar-aspect-content-studio.mjs";
write(publishedStudioTestPath, `#!/usr/bin/env node\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\n\nconst dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");\nconst skyContent = fs.readFileSync("apps/web/src/services/skyAspectContent.ts", "utf8");\nconst app = fs.readFileSync("apps/web/src/App.tsx", "utf8");\nconst calendar = fs.readFileSync("apps/web/src/features/calendar/LunarCalendar.tsx", "utf8");\nconst seed = fs.readFileSync("scripts/seed-published-calendar-aspect-content-studio.mjs", "utf8");\nconst mercuryMars = JSON.parse(fs.readFileSync("packages/astro-knowledge/data/transits/mercury-sextile-mars.json", "utf8"));\nconst sunMercury = JSON.parse(fs.readFileSync("packages/astro-knowledge/data/transits/sun-conjunction-mercury.json", "utf8"));\n\nassert.match(dashboard, /contentKey\\.startsWith\\("sky\\.aspect\\."\\)/u, "Published exact aspect rows must appear under Calendar Aspects.");\nassert.match(skyContent, /resolveSkyAspectContentStudioExact/u, "The reader needs a governed exact-aspect Content Studio resolver.");\nassert.match(skyContent, /source\\.contentStudioExactAspect !== true/u, "Exact Studio rows must fail closed without their provenance marker.");\nassert.match(app, /const loadedExactRegistry = contentRegistryFor\\("sky"\\);[\\s\\S]*!loadedExactRegistry\\.approvedExactSkyAspectCopy\\(aspect\\.from, aspect\\.type, aspect\\.to\\)[\\s\\S]*tier: "content-studio-exact-sky-aspect-v1"/u, "Sky detail may use Studio exact copy only for a true canonical exact gap.");\nassert.match(calendar, /exact: exact \\?\\? studioExact/u, "Calendar cards must keep canonical exact copy authoritative over the Studio mirror.");\nassert.match(seed, /studio_content_type: "aspect"/u, "Published exact rows must use versioned aspect editing.");\nassert.match(seed, /content_key: contentKey[\\s\\S]*status: "LIVE"[\\s\\S]*lane: "serving"/u, "The imported baseline must be visible as published.");\nassert.equal(mercuryMars.status, "LIVE");\nassert.equal(mercuryMars.readerCopy.body.startsWith("A direct conversation clears a logistical bottleneck"), true);\nassert.equal(sunMercury.status, "LIVE");\nassert.equal(sunMercury.readerCopy.body.startsWith("Your thoughts can feel unusually personal when saying what you mean also feels like saying who you are."), true);\n\nconsole.log("Published Calendar aspect Content Studio authority contract passed.");\n`);

const authorityTestPath = "scripts/test-sky-placement-exact-aspect-authority.mjs";
write(authorityTestPath, `#!/usr/bin/env node\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\n\nconst app = fs.readFileSync("apps/web/src/App.tsx", "utf8");\nconst routing = fs.readFileSync("apps/web/src/services/skyAspectRouting.ts", "utf8");\nconst calendar = fs.readFileSync("apps/web/src/features/calendar/LunarCalendar.tsx", "utf8");\n\nconst functionStart = app.indexOf("function relatedSkyAspectSectionsForPlacement({");\nconst functionEnd = app.indexOf("\\nfunction skyPlacementAspectExactMoment(", functionStart);\nassert.ok(functionStart >= 0 && functionEnd > functionStart, "Related Sky aspect section builder must exist.");\nconst builder = app.slice(functionStart, functionEnd);\n\nassert.match(builder, /const resolvedSections = aspects[\\s\\S]*?\\.sort\\(\\(first, second\\) => first\\.orb - second\\.orb\\)/u);\nassert.match(builder, /const giftSection = resolvedSections\\.find\\(\\(\\{ section \\}\\) => section\\.group === "gifts"\\);/u);\nassert.match(builder, /const lessonSection = resolvedSections\\.find\\(\\(\\{ section \\}\\) => section\\.group === "lessons"\\);/u);\nassert.match(builder, /if \\(giftSection && lessonSection\\)[\\s\\S]*return \\[giftSection, lessonSection\\][\\s\\S]*\\.map\\(\\(\\{ section \\}\\) => section\\);/u);\nassert.match(routing, /return composed \\?\\? exact \\?\\? signSpecific \\?\\? phrasebook \\?\\? generated \\?\\? fallback \\?\\? null;/u);\nassert.match(calendar, /exact: exact \\?\\? studioExact/u);\nassert.match(app, /const \\[contentRegistryVersion, setContentRegistryVersion\\] = useState\\(0\\);/u);\nassert.match(app, /const refreshKey = `\\$\\{skyDetailRoutePath\\}:\\$\\{fallbackArchitectureV3Version\\}:\\$\\{contentRegistryVersion\\}:\\$\\{personalizationKey\\}`;/u);\nassert.match(app, /\\[contentRegistryVersion, fallbackArchitectureV3Version, profileNatalSky\\?\\.ascendant/u);\nassert.match(app, /const loadedExactRegistry = contentRegistryFor\\("sky"\\);[\\s\\S]*studio[\\s\\S]*loadedExactRegistry[\\s\\S]*!loadedExactRegistry\\.approvedExactSkyAspectCopy/u);\n\nconsole.log("Sky placement exact-aspect authority contract passed.");\n`);

console.log("Applied Sky exact Content Studio authority repair and regression contracts.");
