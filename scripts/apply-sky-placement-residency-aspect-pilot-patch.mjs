#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function patch(relativePath, replacements) {
  const filePath = path.join(repoRoot, relativePath);
  let source = fs.readFileSync(filePath, "utf8");

  for (const [before, after] of replacements) {
    if (!source.includes(before)) {
      if (source.includes(after)) continue;
      throw new Error(`Patch anchor missing in ${relativePath}: ${before.slice(0, 120)}`);
    }
    source = source.replace(before, after);
  }

  fs.writeFileSync(filePath, source, "utf8");
}

patch("apps/web/src/App.tsx", [
  [
`    articleAspectPassages: placementSection?.articleAspectPassages,
    retrograde: isRetrograde,`,
`    articleAspectPassages: placementSection?.articleAspectPassages,
    placementResidencyContext: articleMode === "current" && normalizeContentIdPart(position.planet) === "sun"
      ? {
          planet: position.planet,
          sign: position.sign,
          referenceDate: generatedAt,
          timeZone: locationTimeZone || position.transitTimeZone || "UTC"
        }
      : undefined,
    retrograde: isRetrograde,`
  ]
]);

patch("apps/web/src/features/sky/SkyDetailArticle.tsx", [
  [
`import { Fragment, isValidElement, useLayoutEffect, type ReactNode } from "react";`,
`import { Fragment, isValidElement, useEffect, useLayoutEffect, useState, type ReactNode } from "react";`
  ],
  [
`export type SkyDetailSection = {
  heading: string;
  body: ReactNode;
  sourceTag?: string;
  sourceKeys?: string[];`,
`export type SkyDetailSection = {
  heading: string;
  body: ReactNode;
  dateLine?: string;
  sourceTag?: string;
  sourceKeys?: string[];`
  ],
  [
`  articleAspectPassages?: { natalPoint: string; aspect: string; body: string; contentKey: string }[];
  subtitle?: string;`,
`  articleAspectPassages?: { natalPoint: string; aspect: string; body: string; contentKey: string }[];
  placementResidencyContext?: {
    planet: string;
    sign: string;
    referenceDate: string;
    timeZone: string;
  };
  subtitle?: string;`
  ],
  [
`  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [detail.title, detail.meta]);

  const metaRows = detailMetaRows(detail.meta);
  const articleBody = detail.body.filter`,
`  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [detail.title, detail.meta]);

  const residencyContext = detail.placementResidencyContext;
  const residencyContextKey = residencyContext
    ? [residencyContext.planet, residencyContext.sign, residencyContext.referenceDate, residencyContext.timeZone].join("|")
    : "";
  const [residencyAspectState, setResidencyAspectState] = useState<{
    key: string;
    sections: SkyDetailSection[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!residencyContext || !residencyContextKey) {
      setResidencyAspectState(null);
      return () => {
        cancelled = true;
      };
    }

    setResidencyAspectState(null);
    void import("../../services/skyPlacementResidencyAspects")
      .then(({ skyPlacementResidencyAspectSections }) => skyPlacementResidencyAspectSections(residencyContext))
      .then((result) => {
        if (!cancelled) {
          setResidencyAspectState({ key: residencyContextKey, sections: result.sections });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("Sky Placement residency aspect enrichment failed closed.", error);
          setResidencyAspectState({ key: residencyContextKey, sections: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [residencyContextKey]);

  const residencyAspectSections = residencyAspectState?.key === residencyContextKey
    ? residencyAspectState.sections
    : null;
  const detailSections = residencyContext
    ? [
        ...(detail.sections ?? []).filter((section) => section.role !== "aspect"),
        ...(residencyAspectSections ?? [])
      ]
    : (detail.sections ?? []);
  const metaRows = detailMetaRows(detail.meta);
  const articleBody = detail.body.filter`
  ],
  [
`  const rawGeneratedSections = (detail.sections ?? []).filter(`,
`  const rawGeneratedSections = detailSections.filter(`
  ],
  [
`  const relatedAspectRows = (detail.relatedAspects?.rows ?? []).map(normalizeRelatedAspectRow);
  const relatedAspectGrouping = detail.relatedAspects?.grouping ?? "tone";
  const aspectGroupDefinitions = relatedAspectGrouping === "event"
    ? ([{ id: "key-aspects" as const, label: "Key aspects" }])`,
`  const relatedAspectRows = (detail.relatedAspects?.rows ?? []).map(normalizeRelatedAspectRow);
  const relatedAspectGrouping = residencyContext
    ? "event"
    : detail.relatedAspects?.grouping ?? "tone";
  const eventAspectLabel = residencyContext
    ? "Aspects shaping this transit"
    : detail.relatedAspects?.heading?.trim() || "Key aspects";
  const aspectGroupDefinitions = relatedAspectGrouping === "event"
    ? ([{ id: "key-aspects" as const, label: eventAspectLabel }])`
  ],
  [
`                            </div>
                          ) : null}
                          {sourceTag && !bodyAlreadyStartsWithTag ? <p>{sourceTag}</p> : null}`,
`                            </div>
                          ) : null}
                          {section.dateLine ? <p>{section.dateLine}</p> : null}
                          {sourceTag && !bodyAlreadyStartsWithTag ? <p>{sourceTag}</p> : null}`
  ]
]);

patch("package.json", [
  [
`node --import tsx scripts/test-sky-placement-engine-facts.mjs && node --import tsx scripts/test-natal-exact-copy-routing.mjs`,
`node --import tsx scripts/test-sky-placement-engine-facts.mjs && node --import tsx scripts/test-sky-placement-residency-aspects.mts && node --import tsx scripts/test-natal-exact-copy-routing.mjs`
  ]
]);

console.log("Sky Placement residency aspect pilot patch applied.");
