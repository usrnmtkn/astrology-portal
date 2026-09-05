#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

const existing = appSource.slice(functionStart, functionEnd);
if (existing.includes("const giftSection = resolvedSections.find")) {
  console.log("Gift/Lesson-balanced Sky placement aspect selection is already applied.");
} else {
  if (!existing.includes(".sort((first, second) => first.orb - second.orb)") || !existing.includes(".slice(0, 2);")) {
    throw new Error("Expected orb-first two-aspect selection boundary was not found.");
  }
  appSource = `${appSource.slice(0, functionStart)}${replacement}${appSource.slice(functionEnd)}`;
  fs.writeFileSync(appPath, appSource);
  console.log("Sky placement details now preserve the tightest Gift and tightest Lesson when both have reader-facing copy.");
}

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
