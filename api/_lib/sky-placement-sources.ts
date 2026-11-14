import { createRequire } from "node:module";
import { mergeStudioPackagePatch } from "../../src/shared/studioPackagePatch.js";
// @ts-ignore The editor uses the same approved corpus and correction layer as the reader.
import { applySkyV4ContinuousCorpusCorrection, skyV4ContentStudioRecords } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";

const require = createRequire(import.meta.url);
const chunks = [
  require("../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-1.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-2.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-4.json")
];
export const skyPlacementSourceCorpus = applySkyV4ContinuousCorpusCorrection(require("../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json"), {
  ...require("../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1.json"), chunks, records: chunks.flatMap(chunk => chunk.records)
});
export const skyPlacementSourceRecords = new Map<string, Record<string, any>>(
  skyV4ContentStudioRecords(skyPlacementSourceCorpus)
    .filter((row: Record<string, any>) => row.serving_enabled === true)
    .map((row: Record<string, any>) => [row.contentKey, row])
);

// Sparse imported records override only the fields they actually contain.
// Preserve explicit clears and serving flags; inherited copy is editor data.
export function skyPlacementStudioRecord(contentKey: string, record: Record<string, any>) {
  const baseline = skyPlacementSourceRecords.get(contentKey);
  if (!baseline || baseline.studio_content_type !== "continuous-placement"
    || record.contentKey !== contentKey || record.studio_content_type !== "continuous-placement"
    || String(record.planet).toLowerCase() !== String(baseline.planet).toLowerCase()
    || String(record.sign).toLowerCase() !== String(baseline.sign).toLowerCase()) return record;
  let fallback = record.fallback;
  if (!Object.hasOwn(record, "fallback")) fallback = structuredClone(baseline.fallback);
  else if (fallback && typeof fallback === "object" && !Array.isArray(fallback) && Object.keys(fallback).length) {
    fallback = mergeStudioPackagePatch(baseline.fallback, fallback);
  }
  return { ...record, fallback,
    ...(!Object.hasOwn(record, "studio_editable_fields")
      ? { studio_editable_fields: structuredClone(baseline.studio_editable_fields.filter((field: { path: string }) => field.path.startsWith("fallback."))) } : {}) };
}

export function isApprovedSkyPlacementFallback(contentKey: string, path: string, value: string) {
  const match = /^packageDraft\.fallback\.(hook|lived|turn)$/u.exec(path);
  return Boolean(match && skyPlacementSourceRecords.get(contentKey)?.fallback?.[match[1]] === value);
}
