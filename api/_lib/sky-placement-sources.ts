import { createRequire } from "node:module";
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
