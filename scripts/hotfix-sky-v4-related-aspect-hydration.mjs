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
  fs.writeFileSync(appPath, appSource);
  console.log("Sky placement details now preserve the tightest Gift and tightest Lesson when both have reader-facing copy.");
} else {
  console.log("Gift/Lesson-balanced Sky placement aspect selection is already applied.");
}

// 2. Exact owner-approved copy is authoritative. A legacy sign-specific
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

// 3. Refresh the exact-corpus count contract after the 33-trine release.
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

// 4. Pin the new exact-over-sign-specific precedence in the Calendar routing
// contract. Sign-specific copy remains available only when no exact row exists.
const exactRoutingTestPath = path.join(repoRoot, "scripts/test-calendar-exact-sky-aspect-routing.mjs");
let exactRoutingTest = fs.readFileSync(exactRoutingTestPath, "utf8");
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
  fs.writeFileSync(exactRoutingTestPath, exactRoutingTest);
  console.log("Calendar routing contract now pins exact copy ahead of legacy sign-specific copy.");
} else if (!exactRoutingTest.includes("const exactBeforeSignSpecific = normalizeCalendarEventSurface(")) {
  throw new Error("Expected Calendar sign-specific precedence test block was not found.");
}
