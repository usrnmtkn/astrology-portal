import skyPlacementServingManifestV1 from "../../web/src/content/fallbackArchitectureV3/authored-inputs/sky-placement-serving-manifest-v1.json";

export const ownerApprovedReplacementLabel = "Not serving — replaced by owner-approved article";

const servingSkyPlacementArticleKeys = new Set(
  skyPlacementServingManifestV1.releases.flatMap((release) => (
    release.distribution_state === "serving"
      ? release.approved_keys.filter((key) => key.startsWith("fallback-hook/sky-sign-copy/"))
      : []
  ))
);

export function ownerApprovedSkyPlacementArticleKey(contentKey: string) {
  const match = /^sky\.placement\.base\.([^.]+)\.([^.]+)$/u.exec(contentKey);
  if (!match) return null;

  const planet = match[1].replaceAll("_", "-");
  const sign = match[2].replaceAll("_", "-");
  const articleKey = `fallback-hook/sky-sign-copy/${planet}/${sign}`;

  return servingSkyPlacementArticleKeys.has(articleKey) ? articleKey : null;
}
