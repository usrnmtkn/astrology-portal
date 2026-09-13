#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const preview = fs.readFileSync(new URL("../apps/admin/src/NatalPlacementReaderPreview.tsx", import.meta.url), "utf8");

assert.match(
  preview,
  /const overrideFingerprint = useMemo\(\(\) => JSON\.stringify\(overrides\)/u,
  "Natal preview must key refreshes to the effective override payload, not every progressive inventory render."
);
assert.match(
  preview,
  /contextChanged \|\| !current\.rendered/u,
  "Natal preview should only replace the reader surface with loading UI for a genuine context change or first load."
);
assert.match(
  preview,
  /background source\/publication refreshes keep the last good/u,
  "Natal preview should document stale-while-refresh behavior so a future refactor does not reintroduce flashing."
);
assert.doesNotMatch(
  preview,
  /\[audience, house, motion, overrides, planet, secret, sign, publicationVersion\]/u,
  "The fetch effect must not depend on the unstable overrides array identity."
);

console.log("Natal placement preview no-flicker contract passed.");
