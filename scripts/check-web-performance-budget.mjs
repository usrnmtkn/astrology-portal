import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDirectory = resolve(repoRoot, "apps/web/dist/assets");

const budgets = [
  { label: "application entry", prefix: "App-", maximumBytes: 800_000 },
  {
    label: "core fallback content",
    prefix: "fallback-v3-core-content-",
    maximumBytes: 4_500_000
  },
  {
    label: "transit and relationship fallback content",
    prefix: "fallback-v3-transit-relationships-",
    maximumBytes: 3_800_000
  }
];

const assetNames = (await readdir(assetsDirectory)).filter((name) => name.endsWith(".js"));
const failures = [];

function formatKilobytes(bytes) {
  return `${(bytes / 1_000).toFixed(2)} kB`;
}

for (const budget of budgets) {
  const matches = assetNames.filter((name) => name.startsWith(budget.prefix));

  if (matches.length !== 1) {
    failures.push(
      `${budget.label}: expected one ${budget.prefix}*.js asset, found ${matches.length}`
    );
    continue;
  }

  const assetPath = resolve(assetsDirectory, matches[0]);
  const assetSize = (await stat(assetPath)).size;
  const gzipSize = gzipSync(await readFile(assetPath)).byteLength;
  const status = assetSize <= budget.maximumBytes ? "PASS" : "FAIL";

  console.log(
    `${status} ${budget.label}: ${formatKilobytes(assetSize)} raw, ${formatKilobytes(gzipSize)} gzip ` +
      `(budget ${formatKilobytes(budget.maximumBytes)} raw)`
  );

  if (assetSize > budget.maximumBytes) {
    failures.push(
      `${budget.label}: ${formatKilobytes(assetSize)} exceeds ${formatKilobytes(budget.maximumBytes)}`
    );
  }
}

if (failures.length > 0) {
  console.error("\nWeb performance budget failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("Web performance budget passed.");
}
