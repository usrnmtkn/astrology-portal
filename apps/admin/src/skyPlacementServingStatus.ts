import skyPlacementServingKeys from "./skyPlacementServingKeys.json";

export const ownerApprovedReplacementLabel = "Not serving — replaced by owner-approved article";

const servingSkyPlacementArticleKeys = new Set(skyPlacementServingKeys);

export function ownerApprovedSkyPlacementArticleKey(contentKey: string) {
  const match = /^sky\.placement\.base\.([^.]+)\.([^.]+)$/u.exec(contentKey);
  if (!match) return null;

  const planet = match[1].replaceAll("_", "-");
  const sign = match[2].replaceAll("_", "-");
  const articleKey = `fallback-hook/sky-sign-copy/${planet}/${sign}`;

  return servingSkyPlacementArticleKeys.has(`${planet}/${sign}`) ? articleKey : null;
}
