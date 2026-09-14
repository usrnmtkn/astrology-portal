import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const manifestUrl = new URL("../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-placement-serving-manifest-v1.json", import.meta.url);
const outputUrl = new URL("../apps/admin/src/skyPlacementServingKeys.json", import.meta.url);
const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"));
// Studio's status lookup needs keys only. The full approval and provenance
// records remain in the canonical manifest; this projection cannot edit them.
const keys = [...new Set(manifest.releases.flatMap(release => release.distribution_state === "serving"
  ? release.approved_keys.filter(key => key.startsWith("fallback-hook/sky-sign-copy/")).map(key => key.slice("fallback-hook/sky-sign-copy/".length)) : []))].sort();
const output = `${JSON.stringify(keys, null, 2)}\n`;
if (process.argv.includes("--check")) assert.equal(readFileSync(outputUrl, "utf8"), output, "Studio serving keys must match the complete canonical manifest");
else writeFileSync(outputUrl, output);
console.log(`Studio serving projection verified: ${keys.length} exact keys.`);
