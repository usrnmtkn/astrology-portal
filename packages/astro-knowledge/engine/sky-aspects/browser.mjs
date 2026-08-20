export const SKY_ASPECT_DEFINITIONS = Object.freeze([
  Object.freeze({ type: "conjunction", exactAngle: 0, maxOrb: 5 }),
  Object.freeze({ type: "sextile", exactAngle: 60, maxOrb: 5 }),
  Object.freeze({ type: "square", exactAngle: 90, maxOrb: 5 }),
  Object.freeze({ type: "trine", exactAngle: 120, maxOrb: 5 }),
  Object.freeze({ type: "quincunx", exactAngle: 150, maxOrb: 3 }),
  Object.freeze({ type: "opposition", exactAngle: 180, maxOrb: 5 })
]);

export const NATAL_ASPECT_DEFINITIONS = Object.freeze([
  Object.freeze({ type: "conjunction", exactAngle: 0, maxOrb: 8, luminaryModifier: 2 }),
  Object.freeze({ type: "sextile", exactAngle: 60, maxOrb: 5, luminaryModifier: 2 }),
  Object.freeze({ type: "square", exactAngle: 90, maxOrb: 7, luminaryModifier: 5 }),
  Object.freeze({ type: "trine", exactAngle: 120, maxOrb: 7, luminaryModifier: 2 }),
  Object.freeze({ type: "quincunx", exactAngle: 150, maxOrb: 3, luminaryModifier: 0 }),
  Object.freeze({ type: "opposition", exactAngle: 180, maxOrb: 8, luminaryModifier: 2 })
]);

export const SKY_ASPECT_POINT_ORDER = Object.freeze([
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith",
  "North Node",
  "South Node"
]);

export const NATAL_ASPECT_POINT_ORDER = Object.freeze([
  ...SKY_ASPECT_POINT_ORDER,
  "Ascendant",
  "Midheaven"
]);

const NATAL_ANGLE_POINTS = new Set(["Ascendant", "Midheaven"]);

export function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

export function shortestAngleDistance(degrees) {
  const normalized = normalizeDegrees(degrees);
  return normalized > 180 ? normalized - 360 : normalized;
}

export function angularSeparation(first, second) {
  const difference = Math.abs(normalizeDegrees(first - second));
  return difference > 180 ? 360 - difference : difference;
}

function pointName(position) {
  return position.planet || position.point || "Unknown";
}

function pointSlug(point) {
  return point.toLowerCase().replaceAll(" ", "_");
}

const LUNAR_NODE_POINTS = new Set(["North Node", "South Node"]);

/** Collapse both lunar-node contacts into one North-Node-keyed editorial event. */
export function canonicalizeNodeAxisAspects(aspects) {
  const canonical = [];
  const nodeContactIndex = new Map();

  for (const aspect of aspects) {
    const fromIsNode = LUNAR_NODE_POINTS.has(aspect.from);
    const toIsNode = LUNAR_NODE_POINTS.has(aspect.to);

    if (fromIsNode && toIsNode) {
      continue;
    }

    if (!fromIsNode && !toIsNode) {
      canonical.push(aspect);
      continue;
    }

    const otherPoint = fromIsNode ? aspect.to : aspect.from;
    const nodePoint = fromIsNode ? aspect.from : aspect.to;
    const existingIndex = nodeContactIndex.get(otherPoint);

    if (existingIndex === undefined) {
      nodeContactIndex.set(otherPoint, canonical.length);
      canonical.push(aspect);
      continue;
    }

    const existing = canonical[existingIndex];
    const existingNode = LUNAR_NODE_POINTS.has(existing.from) ? existing.from : existing.to;

    if (nodePoint === "North Node" && existingNode !== "North Node") {
      canonical[existingIndex] = aspect;
    }
  }

  return canonical.sort((first, second) => first.orb - second.orb);
}

function aspectForSeparation(separation, definitions, from, to) {
  const hasLuminary = from === "Sun" || from === "Moon" || to === "Sun" || to === "Moon";

  return definitions
    .map((definition) => ({
      ...definition,
      orb: Math.abs(separation - definition.exactAngle),
      effectiveMaxOrb: definition.maxOrb + (hasLuminary ? definition.luminaryModifier ?? 0 : 0)
    }))
    .filter(({ orb, effectiveMaxOrb }) => orb <= effectiveMaxOrb)
    .sort((first, second) => first.orb - second.orb)[0] || null;
}

function applyingForAspect(from, to, exactAngle) {
  if (!Number.isFinite(from.speed) || !Number.isFinite(to.speed)) {
    return false;
  }

  const currentDistance = Math.abs(shortestAngleDistance(
    angularSeparation(from.longitude, to.longitude) - exactAngle
  ));
  const nextDistance = Math.abs(shortestAngleDistance(
    angularSeparation(
      normalizeDegrees(from.longitude + from.speed / 4),
      normalizeDegrees(to.longitude + to.speed / 4)
    ) - exactAngle
  ));

  if (currentDistance < 0.01) {
    return false;
  }

  return nextDistance < currentDistance;
}

function calculateAspects(positions, definitions, pointOrder, options = {}) {
  if (!Array.isArray(positions)) {
    throw new TypeError("positions must be an array");
  }

  const usablePositions = positions
    .map((position, index) => ({ position, index }))
    .filter(({ position }) => Number.isFinite(position?.longitude))
    .sort((first, second) => {
      const firstOrder = pointOrder.indexOf(pointName(first.position));
      const secondOrder = pointOrder.indexOf(pointName(second.position));
      const normalizedFirstOrder = firstOrder < 0 ? Number.MAX_SAFE_INTEGER : firstOrder;
      const normalizedSecondOrder = secondOrder < 0 ? Number.MAX_SAFE_INTEGER : secondOrder;

      return normalizedFirstOrder - normalizedSecondOrder || first.index - second.index;
    })
    .map(({ position }) => position);
  const aspects = [];

  usablePositions.forEach((from, fromIndex) => {
    usablePositions.slice(fromIndex + 1).forEach((to) => {
      const separation = angularSeparation(from.longitude, to.longitude);
      const fromName = pointName(from);
      const toName = pointName(to);

      if (options.excludeAnglePairs && NATAL_ANGLE_POINTS.has(fromName) && NATAL_ANGLE_POINTS.has(toName)) {
        return;
      }

      const aspect = aspectForSeparation(separation, definitions, fromName, toName);

      if (!aspect) {
        return;
      }

      aspects.push({
        id: `aspect.${pointSlug(fromName)}.${aspect.type}.${pointSlug(toName)}`,
        bodyA: fromName,
        bodyB: toName,
        from: fromName,
        to: toName,
        type: aspect.type,
        exactAngle: aspect.exactAngle,
        separation: Number(separation.toFixed(4)),
        orb: Number(aspect.orb.toFixed(1)),
        applying: applyingForAspect(from, to, aspect.exactAngle)
      });
    });
  });

  return aspects.sort((first, second) => first.orb - second.orb);
}

export function calculateSkyAspects(positions) {
  return calculateAspects(positions, SKY_ASPECT_DEFINITIONS, SKY_ASPECT_POINT_ORDER);
}

export function calculateNatalAspects(positions) {
  return calculateAspects(positions, NATAL_ASPECT_DEFINITIONS, NATAL_ASPECT_POINT_ORDER, { excludeAnglePairs: true });
}
