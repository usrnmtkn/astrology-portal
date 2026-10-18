import { fallbackArchitectureV3BundledManifestSummary, fallbackArchitectureV3ManifestForBundle,
  type FallbackArchitectureV3Bundle, type FallbackArchitectureV3PackageManifest } from "../content/fallbackArchitectureV3Runtime";

export type FallbackArchitectureV3MirrorMetadata = {
  packageVersion: string;
  contentHash: string;
  keyManifestHash: string;
  keyCount: number;
};

export async function fallbackArchitectureV3BundleManifestIfValid(
  bundle: FallbackArchitectureV3Bundle,
  metadata: FallbackArchitectureV3MirrorMetadata,
  loadBundledPartitionManifest: () => Promise<FallbackArchitectureV3PackageManifest>,
  { allowEditorialContentOverrides = false }: { allowEditorialContentOverrides?: boolean } = {}
): Promise<FallbackArchitectureV3PackageManifest | null> {
  if (metadata.packageVersion !== fallbackArchitectureV3BundledManifestSummary.packageVersion) return null;

  const manifest = fallbackArchitectureV3ManifestForBundle(bundle, metadata.packageVersion);
  const bundledManifest = await loadBundledPartitionManifest();

  if (
    manifest.keyManifestHash !== bundledManifest.keyManifestHash
    || manifest.keyCount !== bundledManifest.keyCount
    || manifest.keyManifestHash !== metadata.keyManifestHash
    || manifest.keyCount !== metadata.keyCount
    || (
      !allowEditorialContentOverrides
      && (
        manifest.contentHash !== bundledManifest.contentHash
        || manifest.contentHash !== metadata.contentHash
      )
    )
  ) {
    return null;
  }

  return manifest;
}

