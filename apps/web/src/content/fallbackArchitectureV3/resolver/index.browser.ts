// TLDR Astro content package — single browser entry point.
// Codex: import ONLY from the prebuilt dist/tldr-content.js (or this file if bundling
// yourself). Do not edit or fork the resolver sources; selection stays
// authored-or-v3-or-SOURCE_GAP and grammar is correct by construction.
export * from "./renderFallback.browser";
export * from "./renderTransitSynastry.browser";
export * from "./knowledgeMatrixV9.browser";
export * from "./knowledgeMatrixV13.browser";

// Version stamp: the app must surface this in its debug/about screen and the dashboard
// admin must show it next to the import status, so the owner can verify at a glance
// that the running app and the dashboard are on the current package.
export const PACKAGE_VERSION = "v3-2026-08-11f";

type PackageRow = {
  contentKey: string;
  [key: string]: unknown;
};

export type PackageManifestBundle = {
  transitLib: { authoredCards: PackageRow[] };
  templatesFile: { templates: PackageRow[] };
  rowsFile: {
    hookRows?: PackageRow[];
    vocabularyRows?: PackageRow[];
    dailyGlanceVariants?: {
      keys?: Record<string, {
        headlines?: PackageRow[];
        bodies?: PackageRow[];
        pairings?: PackageRow[];
      }>;
    };
  };
};

export type PackageManifest = {
  packageVersion: string;
  contentHash: string;
  keyManifestHash: string;
  keyCount: number;
  keys: string[];
};

function stablePackageValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stablePackageValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value as Record<string, unknown>)
      // Review state controls whether a row enters the reader bundle. Once it
      // does, the content hash covers the serving record rather than mirror-only
      // approval metadata, which Supabase may normalize for RLS visibility.
      .filter((key) => key !== "review_status" && key !== "reviewStatus")
      .sort()
      .map((key) => [key, stablePackageValue((value as Record<string, unknown>)[key])])
  );
}

function packageRowsByKey(rows: PackageRow[]) {
  const readerEligible = new Set(["approved_reuse", "approved", "reviewed"]);
  const candidates = new Map<string, PackageRow[]>();
  for (const row of rows) {
    const keyed = candidates.get(row.contentKey) ?? [];
    keyed.push(row);
    candidates.set(row.contentKey, keyed);
  }

  return [...candidates.values()]
    .map((keyed) => [...keyed]
      .reverse()
      .find((row) => readerEligible.has(String(row.review_status ?? row.reviewStatus ?? ""))))
    .filter((row): row is PackageRow => Boolean(row))
    .sort((first, second) => first.contentKey.localeCompare(second.contentKey));
}

function packageDailyGlanceVariantRows(variants: PackageManifestBundle["rowsFile"]["dailyGlanceVariants"]) {
  return Object.entries(variants?.keys ?? {}).flatMap(([dailyKey, set]) => [
    ...(set.headlines ?? []).filter((row) => row.id !== "primary").map((row) => ({ ...row, contentKey: `daily-glance-variant/${dailyKey}/headline/${row.id}` })),
    ...(set.bodies ?? []).filter((row) => row.id !== "primary").map((row) => ({ ...row, contentKey: `daily-glance-variant/${dailyKey}/body/${row.id}` })),
    ...(set.pairings ?? []).filter((row) => row.id !== "primary").map((row) => ({ ...row, contentKey: `daily-glance-variant/${dailyKey}/pairing/${row.id}` }))
  ]);
}

function packageHash(value: unknown) {
  const input = JSON.stringify(stablePackageValue(value));
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const hashes = seeds.map((seed) => {
    let hash = seed >>> 0;

    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }

    return hash.toString(16).padStart(8, "0");
  });

  return hashes.join("");
}

export function createPackageManifest(
  bundle: PackageManifestBundle,
  packageVersion = PACKAGE_VERSION
): PackageManifest {
  const records = [
    ...packageRowsByKey(bundle.transitLib.authoredCards).map((row) => ({ bucket: "authored", row })),
    ...packageRowsByKey(bundle.rowsFile.hookRows ?? []).map((row) => ({ bucket: "hook", row })),
    ...packageRowsByKey(bundle.rowsFile.vocabularyRows ?? []).map((row) => ({ bucket: "vocabulary", row })),
    ...packageRowsByKey(packageDailyGlanceVariantRows(bundle.rowsFile.dailyGlanceVariants)).map((row) => ({ bucket: "daily-glance-variant", row })),
    ...packageRowsByKey(bundle.templatesFile.templates).map((row) => ({ bucket: "template", row }))
  ];
  const keys = records.map(({ bucket, row }) => `${bucket}:${row.contentKey}`);

  return {
    packageVersion,
    contentHash: packageHash(records),
    keyManifestHash: packageHash(keys),
    keyCount: keys.length,
    keys
  };
}
