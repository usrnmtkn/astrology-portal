#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(repoRoot, "apps/web/src/App.tsx");
let appSource = fs.readFileSync(appPath, "utf8");

const discardedRegistryVersion = "  const [, setContentRegistryVersion] = useState(0);";
const retainedRegistryVersion = "  const [contentRegistryVersion, setContentRegistryVersion] = useState(0);";
const synchronizedRegistryVersion = "  const contentRegistryVersion = useContentRegistryRevision();";
if (appSource.includes(discardedRegistryVersion)) {
  appSource = appSource.replace(discardedRegistryVersion, synchronizedRegistryVersion);
} else if (appSource.includes(retainedRegistryVersion)) {
  appSource = appSource.replace(retainedRegistryVersion, synchronizedRegistryVersion);
} else if (!appSource.includes(synchronizedRegistryVersion)) {
  throw new Error("Expected Content Registry version state was not found.");
}

const adHocSubscription = `  useEffect(() => subscribeContentRegistry(() => {\n    setContentRegistryVersion((version) => version + 1);\n  }), []);\n\n`;
if (appSource.includes(adHocSubscription)) {
  appSource = appSource.replace(adHocSubscription, "");
}
if (/setContentRegistryVersion/u.test(appSource)) {
  throw new Error("Ad-hoc Content Registry version setter remains after synchronization patch.");
}

const staleRefreshKey = '    const refreshKey = `${skyDetailRoutePath}:${fallbackArchitectureV3Version}:${personalizationKey}`;';
const currentRefreshKey = '    const refreshKey = `${skyDetailRoutePath}:${fallbackArchitectureV3Version}:${contentRegistryVersion}:${personalizationKey}`;';
if (appSource.includes(staleRefreshKey)) {
  appSource = appSource.replace(staleRefreshKey, currentRefreshKey);
} else if (!appSource.includes(currentRefreshKey)) {
  throw new Error("Expected open Sky detail refresh key was not found.");
}

const markerIndex = appSource.indexOf(currentRefreshKey);
if (markerIndex < 0) throw new Error("Open Sky detail refresh marker is missing after patch.");
const effectStart = appSource.lastIndexOf("  useEffect(() => {", markerIndex);
const dependencyStart = appSource.indexOf("  }, [", markerIndex);
const dependencyEnd = dependencyStart >= 0 ? appSource.indexOf("]);", dependencyStart) : -1;
if (effectStart < 0 || dependencyStart < 0 || dependencyEnd < 0) {
  throw new Error("Could not locate the open Sky detail refresh effect dependency array.");
}
const dependencyBlock = appSource.slice(dependencyStart, dependencyEnd + 3);
if (!dependencyBlock.includes("contentRegistryVersion")) {
  const insertionPoint = dependencyStart + "  }, [".length;
  appSource = `${appSource.slice(0, insertionPoint)}\n    contentRegistryVersion,${appSource.slice(insertionPoint)}`;
}

fs.writeFileSync(appPath, appSource);
console.log("Open Sky detail synchronizes the current registry revision and refreshes on later registry changes.");

const phrasebookTestPath = path.join(repoRoot, "scripts/test-reviewed-sky-aspect-phrasebook.mjs");
let phrasebookTestSource = fs.readFileSync(phrasebookTestPath, "utf8");
const staleCount = "assert.equal(exactTransitRecords.length, 215);";
const currentCount = "assert.equal(exactTransitRecords.length, 248);";
if (phrasebookTestSource.includes(staleCount)) {
  phrasebookTestSource = phrasebookTestSource.replace(staleCount, currentCount);
} else if (!phrasebookTestSource.includes(currentCount)) {
  throw new Error("Expected exact-transit corpus count assertion was not found.");
}
fs.writeFileSync(phrasebookTestPath, phrasebookTestSource);
console.log("Reviewed Sky aspect corpus contract expects 248 exact records.");
