const eligibleTransitReturnBodies = new Set([
  "sun",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "chiron",
  "uranus",
  "north-node"
]);

function normalizeReturnBody(value: string) {
  return value.trim().toLowerCase().replace(/[\s_]+/gu, "-");
}

export function isEligibleTransitReturn(transiting: string, natal: string, aspect: string) {
  const body = normalizeReturnBody(transiting);
  return aspect.toLowerCase() === "conjunction"
    && body === normalizeReturnBody(natal)
    && eligibleTransitReturnBodies.has(body);
}
