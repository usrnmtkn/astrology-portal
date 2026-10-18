import type { GeneratedContentRow } from "./generatedContent";
import { rowSourceSnapshot, rowFacts, packageRecord, stringFrom, packageHookRowFromRow, fallbackSystemBucket, isApprovedFallbackArchitectureV3Row, isSkyPlacementFallbackPartitionKey } from "./fallbackArchitectureV3CorePackaging";
import { loadFallbackArchitectureV3BundledSkyPlacementManifest, type FallbackArchitectureV3Bundle, type HookRow } from "../content/fallbackArchitectureV3Runtime";
import { fallbackArchitectureV3BundleManifestIfValid, type FallbackArchitectureV3MirrorMetadata } from "./fallbackArchitectureV3MirrorValidation";

const fallbackArchitectureV3SkyPlacementProvider = "tldrastro-fallback-architecture-v3-sky-placement";

function isSkyPlacementDashboardDistributionEligible(row: GeneratedContentRow) {
  const record = packageRecord(row);
  const isContinuous = record.render_policy === "sky-placement-continuous-v2"
    || row.content_key.startsWith("fallback-hook/sky-sign-copy/");

  if (!isContinuous) return true;

  const sourceSnapshot = rowSourceSnapshot(row);
  const facts = rowFacts(row);
  return stringFrom(
    sourceSnapshot.distributionState,
    sourceSnapshot.distribution_state,
    facts.distributionState,
    facts.distribution_state
  ) === "serving";
}


function fallbackArchitectureV3RowMirrorMetadata(
  row: GeneratedContentRow,
  partition: "core" | "sky-placement"
): FallbackArchitectureV3MirrorMetadata | null {
  const sourceSnapshot = rowSourceSnapshot(row);
  const facts = rowFacts(row);
  const record = packageRecord(row);
  const packageVersion = stringFrom(
    sourceSnapshot.packageVersion,
    sourceSnapshot.package_version,
    facts.packageVersion,
    facts.package_version,
    record.packageVersion,
    record.package_version
  );
  const contentHash = stringFrom(
    sourceSnapshot.packagePartitionContentHash,
    sourceSnapshot.package_partition_content_hash,
    facts.packagePartitionContentHash,
    facts.package_partition_content_hash,
    record.packagePartitionContentHash,
    record.package_partition_content_hash,
    sourceSnapshot.packageContentHash,
    sourceSnapshot.package_content_hash,
    facts.packageContentHash,
    facts.package_content_hash,
    record.packageContentHash,
    record.package_content_hash
  );
  const keyManifestHash = stringFrom(
    sourceSnapshot.packagePartitionKeyManifestHash,
    sourceSnapshot.package_partition_key_manifest_hash,
    facts.packagePartitionKeyManifestHash,
    facts.package_partition_key_manifest_hash,
    record.packagePartitionKeyManifestHash,
    record.package_partition_key_manifest_hash,
    sourceSnapshot.packageKeyManifestHash,
    sourceSnapshot.package_key_manifest_hash,
    facts.packageKeyManifestHash,
    facts.package_key_manifest_hash,
    record.packageKeyManifestHash,
    record.package_key_manifest_hash
  );
  const rowPartition = stringFrom(
    sourceSnapshot.packagePartition,
    sourceSnapshot.package_partition,
    facts.packagePartition,
    facts.package_partition,
    record.packagePartition,
    record.package_partition
  );
  const rawKeyCount = sourceSnapshot.packagePartitionKeyCount
    ?? sourceSnapshot.package_partition_key_count
    ?? facts.packagePartitionKeyCount
    ?? facts.package_partition_key_count
    ?? record.packagePartitionKeyCount
    ?? record.package_partition_key_count
    ?? sourceSnapshot.packageKeyCount
    ?? sourceSnapshot.package_key_count
    ?? facts.packageKeyCount
    ?? facts.package_key_count
    ?? record.packageKeyCount
    ?? record.package_key_count;
  const keyCount = Number(rawKeyCount);

  if (
    !packageVersion
    || (rowPartition && rowPartition !== partition)
    || !contentHash
    || !keyManifestHash
    || !Number.isInteger(keyCount)
    || keyCount <= 0
  ) {
    return null;
  }

  return { packageVersion, contentHash, keyManifestHash, keyCount };
}


function equalFallbackArchitectureV3MirrorMetadata(
  first: FallbackArchitectureV3MirrorMetadata,
  second: FallbackArchitectureV3MirrorMetadata
) {
  return first.packageVersion === second.packageVersion
    && first.contentHash === second.contentHash
    && first.keyManifestHash === second.keyManifestHash
    && first.keyCount === second.keyCount;
}


/** Pure compatibility packaging. No requests, caches, installs or reader state. */
export async function packageLegacySkyPlacementMirror(rows: GeneratedContentRow[]) {
  const approvedRows = rows.filter((row) => (
    isApprovedFallbackArchitectureV3Row(row, fallbackArchitectureV3SkyPlacementProvider)
    && isSkyPlacementFallbackPartitionKey(row.content_key)
    && isSkyPlacementDashboardDistributionEligible(row)
  ));
  const metadataByRow = approvedRows.map((row) => fallbackArchitectureV3RowMirrorMetadata(row, "sky-placement"));
  const metadata = metadataByRow.find((value): value is FallbackArchitectureV3MirrorMetadata => Boolean(value));

  if (
    !metadata
    || metadataByRow.some((value) => !value || !equalFallbackArchitectureV3MirrorMetadata(value, metadata))
  ) {
    return null;
  }

  const seen = new Set<string>();
  const hookRows: HookRow[] = [];

  for (const row of approvedRows) {
    if (seen.has(row.content_key)) {
        return null;
    }
    seen.add(row.content_key);

    const { contentType, role } = fallbackSystemBucket(row);
    if (contentType === "source-material" || !["fallback_hook", "house_horoscope_core"].includes(role)) continue;
    const hook = packageHookRowFromRow(row);
    if (hook) hookRows.push(hook);
  }

  const candidateBundle: FallbackArchitectureV3Bundle = {
    transitLib: { authoredCards: [] },
    templatesFile: { templates: [] },
    rowsFile: { hookRows, vocabularyRows: [] }
  };
  const mirror = await fallbackArchitectureV3BundleManifestIfValid(
    candidateBundle,
    metadata,
    loadFallbackArchitectureV3BundledSkyPlacementManifest,
    { allowEditorialContentOverrides: true }
  );

  if (!mirror) {
    return null;
  }

  const bundle = { ...candidateBundle, packageManifest: mirror };
  return { bundle, mirror };
}
