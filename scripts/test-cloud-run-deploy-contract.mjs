import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cloudBuildPath = path.join(root, "services", "tldrastro-api", "cloudbuild.yaml");
const cloudBuild = fs.readFileSync(cloudBuildPath, "utf8");

assert.match(
  cloudBuild,
  /--add-volume=name=swisseph-data,type=cloud-storage,bucket=\$\{_EPHEMERIS_BUCKET\},readonly=true/,
  "Cloud Run deploys must reuse the stable swisseph-data volume name."
);
assert.match(
  cloudBuild,
  /--add-volume-mount=volume=swisseph-data,mount-path=\$\{_EPHEMERIS_PATH\}/,
  "The stable ephemeris volume must be mounted at the configured path."
);
assert.doesNotMatch(
  cloudBuild,
  /--add-volume=mount-path=/,
  "Anonymous mount-path volumes generate a new Cloud Run volume name on every deploy."
);
assert.equal(
  cloudBuild.match(/--add-volume=/g)?.length,
  1,
  "The deployment contract should declare exactly one ephemeris volume."
);

console.log("Cloud Run deploy contract passed: one stable Swiss Ephemeris volume and mount.");
