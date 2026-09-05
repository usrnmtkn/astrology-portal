#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 1. Preserve one reader-eligible Gift and one Lesson inside the two-card
// placement-detail cap when both tones exist.
const appPath = path.join(repoRoot, "apps/web/src/App.tsx");
let appSource = fs.readFileSync(appPath, "utf8");
const functionStart = appSource.indexOf("function relatedSkyAspectSectionsForPlacement({");
const functionEnd = appSource.indexOf("\nfunction skyPlacementAspectExactMoment(", functionStart);
if (functionStart < 0 || functionEnd < 0) {
  throw new Error("Could not locate relatedSkyAspectSectionsForPlacement.");
}

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

      if (!body) {
        return [];
      }

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

const existingBuilder = appSource.slice(functionStart, functionEnd);
if (!existingBuilder.includes("const giftSection = resolvedSections.find")) {
  if (!existingBuilder.includes(".sort((first, second) => first.orb - second.orb)") || !existingBuilder.includes(".slice(0, 2);")) {
    throw new Error("Expected orb-first two-aspect selection boundary was not found.");
  }
  appSource = `${appSource.slice(0, functionStart)}${replacement}${appSource.slice(functionEnd)}`;
  console.log("Sky placement details now preserve the tightest Gift and tightest Lesson when both have reader-facing copy.");
} else {
  console.log("Gift/Lesson-balanced Sky placement aspect selection is already applied.");
}

// 2. The exact-content registry is lazy. An already-open Sky detail must rebuild
// when that registry finishes loading or it can remain stuck on pre-registry
// phrasebook copy even after exact owner-approved copy becomes available.
const discardedRegistryState = "  const [, setContentRegistryVersion] = useState(0);";
const synchronizedRegistryState = "  const contentRegistryVersion = useContentRegistryRevision();";
if (appSource.includes(discardedRegistryState)) {
  appSource = appSource.replace(discardedRegistryState, synchronizedRegistryState);
} else if (!appSource.includes(synchronizedRegistryState)) {
  throw new Error("Expected Content Registry state boundary was not found.");
}

const staleRefreshKey = '    const refreshKey = `${skyDetailRoutePath}:${fallbackArchitectureV3Version}:${personalizationKey}`;';
const currentRefreshKey = '    const refreshKey = `${skyDetailRoutePath}:${fallbackArchitectureV3Version}:${contentRegistryVersion}:${personalizationKey}`;';
if (appSource.includes(staleRefreshKey)) {
  appSource = appSource.replace(staleRefreshKey, currentRefreshKey);
} else if (!appSource.includes(currentRefreshKey)) {
  throw new Error("Expected open Sky detail refresh key was not found.");
}

const staleDependencies = "  }, [fallbackArchitectureV3Version, profileNatalSky?.ascendant, selectedSkyDetail?.routePath, sky, skyDetailRoutePath, skyGeneratedContent, skyPlacementPersonalizationTransits, userProfile?.rising]);";
const currentDependencies = "  }, [contentRegistryVersion, fallbackArchitectureV3Version, profileNatalSky?.ascendant, selectedSkyDetail?.routePath, sky, skyDetailRoutePath, skyGeneratedContent, skyPlacementPersonalizationTransits, userProfile?.rising]);";
if (appSource.includes(staleDependencies)) {
  appSource = appSource.replace(staleDependencies, currentDependencies);
} else if (!appSource.includes(currentDependencies)) {
  throw new Error("Expected open Sky detail dependency list was not found.");
}

const duplicateRegistryEffect = `  useEffect(() => subscribeContentRegistry(() => {
    setContentRegistryVersion((version) => version + 1);
  }), []);

`;
if (appSource.includes(duplicateRegistryEffect)) {
  appSource = appSource.replace(duplicateRegistryEffect, "");
}
if (/setContentRegistryVersion/u.test(appSource)) {
  throw new Error("Race-prone duplicate Content Registry state remains after patch.");
}
fs.writeFileSync(appPath, appSource);
console.log("Open Sky detail now rebuilds when the synchronized exact-content registry revision changes.");

// 3. Exact owner-approved copy is authoritative. A legacy sign-specific
// phrasebook row may fill an exact gap, but it must not replace an exact body.
const routingPath = path.join(repoRoot, "apps/web/src/services/skyAspectRouting.ts");
let routingSource = fs.readFileSync(routingPath, "utf8");
const oldPrecedence = "  return composed ?? signSpecific ?? exact ?? phrasebook ?? generated ?? fallback ?? null;";
const newPrecedence = "  return composed ?? exact ?? signSpecific ?? phrasebook ?? generated ?? fallback ?? null;";
if (routingSource.includes(oldPrecedence)) {
  routingSource = routingSource.replace(oldPrecedence, newPrecedence);
  fs.writeFileSync(routingPath, routingSource);
  console.log("Exact owner-approved Sky aspect copy now outranks legacy sign-specific phrasebook copy.");
} else if (!routingSource.includes(newPrecedence)) {
  throw new Error("Expected Sky aspect precedence boundary was not found.");
}

// 4. Refresh the exact-corpus count contract after the 33-trine release.
const phrasebookTestPath = path.join(repoRoot, "scripts/test-reviewed-sky-aspect-phrasebook.mjs");
let phrasebookTestSource = fs.readFileSync(phrasebookTestPath, "utf8");
const staleCount = "assert.equal(exactTransitRecords.length, 215);";
const currentCount = "assert.equal(exactTransitRecords.length, 248);";
if (phrasebookTestSource.includes(staleCount)) {
  phrasebookTestSource = phrasebookTestSource.replace(staleCount, currentCount);
  fs.writeFileSync(phrasebookTestPath, phrasebookTestSource);
} else if (!phrasebookTestSource.includes(currentCount)) {
  throw new Error("Expected exact-transit corpus count assertion was not found.");
}
console.log("Reviewed Sky aspect corpus contract expects 248 exact records.");

// 5. Pin exact-over-sign-specific precedence in Calendar routing and point the
// contract at the latest 248-row owner payload projection.
const exactRoutingTestPath = path.join(repoRoot, "scripts/test-calendar-exact-sky-aspect-routing.mjs");
let exactRoutingTest = fs.readFileSync(exactRoutingTestPath, "utf8");
const stalePayloadPath = "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-batch-30/current-owner-payloads.json";
const currentPayloadPath = "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-held-trines-33/current-owner-payloads.json";
if (exactRoutingTest.includes(stalePayloadPath)) {
  exactRoutingTest = exactRoutingTest.replace(stalePayloadPath, currentPayloadPath);
} else if (!exactRoutingTest.includes(currentPayloadPath)) {
  throw new Error("Expected Calendar exact owner-payload projection path was not found.");
}

const oldBlockStart = exactRoutingTest.indexOf("const signSpecificOverride = normalizeCalendarEventSurface(");
const oldBlockEnd = exactRoutingTest.indexOf("\nconst phrasebookBeforeGenerated =", oldBlockStart);
if (oldBlockStart >= 0 && oldBlockEnd > oldBlockStart) {
  const newBlock = `const exactBeforeSignSpecific = normalizeCalendarEventSurface(
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
  exactRoutingTest = `${exactRoutingTest.slice(0, oldBlockStart)}${newBlock}${exactRoutingTest.slice(oldBlockEnd)}`;
} else if (!exactRoutingTest.includes("const exactBeforeSignSpecific = normalizeCalendarEventSurface(")) {
  throw new Error("Expected Calendar sign-specific precedence test block was not found.");
}
fs.writeFileSync(exactRoutingTestPath, exactRoutingTest);
console.log("Calendar routing contract now uses the 248-row owner projection and pins exact copy ahead of legacy sign-specific copy.");
