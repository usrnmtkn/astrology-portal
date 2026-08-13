#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repoRoot, "data/writing/natal-author-from-mechanism-calibration-v1.json");
const output = path.join(repoRoot, "src/astro-writing/mechanismCalibration.generated.mjs");
const fixture = JSON.parse(fs.readFileSync(source, "utf8"));
if (fixture.positive?.length !== 3 || fixture.negative?.length !== 8 || !fixture.loopholeNegative) {
  throw new Error("Natal mechanism calibration must contain exactly three positive, eight rejected-mode, and one photograph-laundering fixture.");
}
fs.writeFileSync(output, `// Generated from data/writing/natal-author-from-mechanism-calibration-v1.json.\n// Do not edit by hand.\nexport const NATAL_MECHANISM_CALIBRATION = Object.freeze(${JSON.stringify(fixture, null, 2)});\n`);
console.log(path.relative(repoRoot, output));
