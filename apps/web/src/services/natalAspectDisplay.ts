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

function natalAspectDisplayKey(aspect: NatalAspectDisplayCandidate) {
  const normalizeKeyPart = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-");
  const points = [normalizeKeyPart(aspect.from), normalizeKeyPart(aspect.to)].sort();

  return `${points[0]}-${normalizeKeyPart(aspect.type)}-${points[1]}`;
}

export function uniqueDisplayableNatalAspects<T extends NatalAspectDisplayCandidate>(
  aspects: readonly T[]
) {
  const seen = new Set<string>();

  return aspects.filter((aspect) => {
    if (!isDisplayableNatalAspect(aspect)) {
      return false;
    }

    const key = natalAspectDisplayKey(aspect);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
