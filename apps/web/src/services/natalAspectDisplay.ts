export type NatalAspectDisplayCandidate = {
  from: string;
  to: string;
  type: string;
};

function normalizeNatalAspectType(aspectType: string) {
  const normalized = aspectType.trim().toLowerCase();

  return normalized === "inconjunct" ? "quincunx" : normalized;
}

function normalizeNatalAspectPoint(point: string) {
  const normalized = point.trim().toLowerCase();

  return normalized === "true node" ? "north node" : normalized;
}

export function isDisplayableNatalAspect(aspect: NatalAspectDisplayCandidate) {
  if (normalizeNatalAspectType(aspect.type) === "quincunx") {
    return false;
  }

  const points = new Set([
    normalizeNatalAspectPoint(aspect.from),
    normalizeNatalAspectPoint(aspect.to)
  ]);

  return !(points.has("north node") && points.has("south node"));
}
