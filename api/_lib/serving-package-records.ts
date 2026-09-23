import { calendarMoonIngressPackageRecords } from "./calendar-moon-ingress-sources.js";
import { createRequire } from "node:module";
import { calendarWritingSourceStarters } from "./calendar-writing-sources.js";
import { calendarSeasonTransitionPackageRecords } from "./calendar-season-transition-sources.js";
import { lunarJournalPackageRecords } from "./lunar-journal-sources.js";
import { skyPlacementSourceRecords } from "./sky-placement-sources.js";

const require = createRequire(import.meta.url);
const readerPartitions = [
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-core-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-shared-placement-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-empty-house-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-relationship-authored-cards-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-authored-cards-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-initial-reader-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-lunation-book-cards-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-lunation-eclipse-sections-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-lunation-eclipse-house-layers-v3.json"),
];

export const servingPackageRecords = new Map<string, Record<string, any>>();
for (const partition of readerPartitions as Record<string, any>[]) {
  for (const bucket of ["authoredCards", "hookRows", "vocabularyRows", "templates"]) {
    for (const record of partition[bucket] ?? []) servingPackageRecords.set(record.contentKey, record);
  }
}
for (const record of calendarWritingSourceStarters) servingPackageRecords.set(record.contentKey, record);
for (const record of lunarJournalPackageRecords) servingPackageRecords.set(record.contentKey, record);
for (const record of calendarSeasonTransitionPackageRecords) servingPackageRecords.set(record.contentKey, record);
for (const record of calendarMoonIngressPackageRecords) servingPackageRecords.set(record.contentKey, record);
for (const [key, record] of skyPlacementSourceRecords) servingPackageRecords.set(key, record);

export function isSkyPartitionKey(key: string) {
  return key.startsWith("fallback-hook/sky-sign-copy/") || key.startsWith("fallback-hook/sky-placement-") || key.startsWith("house-horoscope-core/") || key.startsWith("fallback-hook/sky-planet-education/");
}
