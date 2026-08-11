#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(
  packageRoot,
  "sources",
  "authored",
  "sky-aspect-owner-refined-v101.json"
);
const transitRoot = path.join(packageRoot, "data", "transits");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const sourceByTransitKey = new Map();
const importedApproval = "owner-refined Sky aspect v10.1 corpus; owner direction, chat 2026-08-01";

for (const [sourceId, entry] of Object.entries(source)) {
  const key = `${entry.planetA}-${entry.aspect}-${entry.planetB}`;
  sourceByTransitKey.set(key, { sourceId, entry });
}

let imported = 0;
let refreshed = 0;
let preserved = 0;
const missing = [];

for (const fileName of fs.readdirSync(transitRoot).filter((name) => name.endsWith(".json")).sort()) {
  const filePath = path.join(transitRoot, fileName);
  const transit = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const key = `${transit.transiting}-${transit.aspect}-${transit.other}`;
  const match = sourceByTransitKey.get(key);

  if (transit.readerCopy && transit.readerCopy.approvedVia !== importedApproval) {
    preserved += 1;
    continue;
  }

  if (!match) {
    missing.push(key);
    continue;
  }

  const { entry, sourceId } = match;
  const parts = [
    entry.humanMoment,
    entry.developmentDetail,
    entry.planetaryDynamic,
    entry.aspectMechanic,
    entry.conditionalConsequence
  ];

  if (parts.some((part) => typeof part !== "string" || part.trim() === "")) {
    throw new Error(`${sourceId}: owner-refined reader copy is incomplete`);
  }

  const readerCopy = {
    summary: entry.humanMoment.trim(),
    body: parts.map((part) => part.trim()).join(" "),
    approvedVia: importedApproval
  };
  const isRefresh = Boolean(transit.readerCopy);
  transit.readerCopy = readerCopy;
  transit.status = "LIVE";
  fs.writeFileSync(filePath, `${JSON.stringify(transit, null, 2)}\n`);
  if (isRefresh) refreshed += 1;
  else imported += 1;
}

if (missing.length > 0) {
  throw new Error(`Owner-refined Sky aspect corpus is missing transit records: ${missing.join(", ")}`);
}

console.log(`Imported owner-refined Sky aspect reader copy: ${imported}; refreshed: ${refreshed}; preserved explicit overrides: ${preserved}.`);
