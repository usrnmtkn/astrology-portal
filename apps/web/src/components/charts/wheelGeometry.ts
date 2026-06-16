type PolarPoint = {
  x: number;
  y: number;
};

type WheelMarkerLayout = {
  angle: number;
  clusterIndex: number;
  clusterSize: number;
  visualAngle: number;
  marker: PolarPoint;
};

type ChartAngleProjectionOptions = {
  midheavenDeg?: number;
  natalOrientation?: boolean;
};

type AngleSegment = readonly [number, number, number, number];

export const chartHouseLabelRadiusFactor = 0.38;
export const wheelViewBox = "-20 -20 640 640";
export const angleAxisOuterPadding = 20;
export const angleLabelOuterPadding = 20;

function normalizedAngle(value: number) {
  return ((value % 360) + 360) % 360;
}

function positiveAngleDistance(from: number, to: number) {
  return normalizedAngle(to - from);
}

function unwrapFrom(start: number, longitude: number) {
  return start + positiveAngleDistance(start, longitude);
}

function interpolateAngle(value: number, start: number, end: number, startAngle: number, endAngle: number) {
  if (Math.abs(end - start) < 0.001) {
    return startAngle;
  }

  const progress = (value - start) / (end - start);
  return startAngle + (endAngle - startAngle) * progress;
}

export function longitudeToNatalChartAngle(longitudeDeg: number, ascendantDeg: number, midheavenDeg: number) {
  const ascendant = normalizedAngle(ascendantDeg);
  const midheaven = normalizedAngle(midheavenDeg);
  const midheavenFromAscendant = positiveAngleDistance(ascendant, midheaven);

  if (midheavenFromAscendant < 0.001 || Math.abs(midheavenFromAscendant - 180) < 0.001) {
    return 180 + normalizedAngle(longitudeDeg - ascendant);
  }

  const value = unwrapFrom(ascendant, longitudeDeg);
  let segments: AngleSegment[];

  if (midheavenFromAscendant < 180) {
    segments = [
      [ascendant, ascendant + midheavenFromAscendant, 180, 270],
      [ascendant + midheavenFromAscendant, ascendant + 180, 270, 360],
      [ascendant + 180, ascendant + midheavenFromAscendant + 180, 360, 450],
      [ascendant + midheavenFromAscendant + 180, ascendant + 360, 450, 540]
    ];
  } else {
    const icFromAscendant = normalizedAngle(midheavenFromAscendant + 180);

    segments = [
      [ascendant, ascendant + icFromAscendant, 180, 90],
      [ascendant + icFromAscendant, ascendant + 180, 90, 0],
      [ascendant + 180, ascendant + midheavenFromAscendant, 0, -90],
      [ascendant + midheavenFromAscendant, ascendant + 360, -90, -180]
    ];
  }

  const segment = segments.find(([start, end]) => value >= start && value <= end) ?? segments[segments.length - 1];
  const [start, end, startAngle, endAngle] = segment;

  return normalizedAngle(interpolateAngle(value, start, end, startAngle, endAngle));
}

function angularDistance(first: number, second: number) {
  const difference = Math.abs(normalizedAngle(first - second));
  return difference > 180 ? 360 - difference : difference;
}

function clusterTangentOffsets(size: number) {
  const presetOffsets: Record<number, number[]> = {
    1: [0],
    2: [-8, 8],
    3: [-12, 0, 12],
    4: [-16, -5, 5, 16],
    5: [-20, -10, 0, 10, 20]
  };

  if (presetOffsets[size]) {
    return presetOffsets[size];
  }

  const spacing = 10;
  const centerOffset = (size - 1) / 2;

  return Array.from({ length: size }, (_, index) => Math.max(-24, Math.min(24, (index - centerOffset) * spacing)));
}

function clusterRadialOffset(index: number, size: number) {
  if (size < 4) {
    return 0;
  }

  return index % 2 === 0 ? -4 : 4;
}

export function longitudeToChartAngle(
  longitudeDeg: number,
  ascendantDeg?: number,
  ascendantAnchored = false,
  options: ChartAngleProjectionOptions = {}
) {
  if (ascendantAnchored && typeof ascendantDeg === "number") {
    if (options.natalOrientation && typeof options.midheavenDeg === "number") {
      return longitudeToNatalChartAngle(longitudeDeg, ascendantDeg, options.midheavenDeg);
    }

    return 180 + normalizedAngle(longitudeDeg - ascendantDeg);
  }

  return 225 + longitudeDeg;
}

export function polarToCartesian(centerX: number, centerY: number, radius: number, angleDeg: number): PolarPoint {
  const rad = (angleDeg * Math.PI) / 180;

  return {
    x: centerX + Math.cos(rad) * radius,
    y: centerY + Math.sin(rad) * radius
  };
}

export function inwardMarkerOffset(center: number, marker: PolarPoint, distance: number): PolarPoint {
  const dx = center - marker.x;
  const dy = center - marker.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: (dx / length) * distance,
    y: (dy / length) * distance
  };
}

export function wheelMarkerLayouts<T>(
  items: T[],
  keyForItem: (item: T) => string,
  angleForItem: (item: T) => number,
  {
    baseRadius,
    center,
    clusterThreshold = 6,
    maxClusterSpan = 24
  }: {
    baseRadius: number;
    center: number;
    clusterThreshold?: number;
    maxClusterSpan?: number;
  }
) {
  const entries = items
    .map((item) => ({
      item,
      key: keyForItem(item),
      angle: normalizedAngle(angleForItem(item))
    }))
    .sort((first, second) => first.angle - second.angle);
  const groups: typeof entries[] = [];

  entries.forEach((entry) => {
    const currentGroup = groups[groups.length - 1];
    const previous = currentGroup?.[currentGroup.length - 1];
    const firstInGroup = currentGroup?.[0];

    if (
      previous &&
      firstInGroup &&
      angularDistance(entry.angle, previous.angle) <= clusterThreshold &&
      angularDistance(entry.angle, firstInGroup.angle) <= maxClusterSpan
    ) {
      currentGroup.push(entry);
      return;
    }

    groups.push([entry]);
  });

  if (groups.length > 1) {
    const firstGroup = groups[0];
    const lastGroup = groups[groups.length - 1];
    const first = firstGroup[0];
    const last = lastGroup[lastGroup.length - 1];

    if (
      first &&
      last &&
      angularDistance(first.angle, last.angle) <= clusterThreshold &&
      angularDistance(firstGroup[firstGroup.length - 1].angle, lastGroup[0].angle) <= maxClusterSpan
    ) {
      groups[0] = [...lastGroup, ...firstGroup];
      groups.pop();
    }
  }

  const layouts = new Map<string, WheelMarkerLayout>();
  groups.forEach((group) => {
    const tangentOffsets = clusterTangentOffsets(group.length);

    group.forEach((entry, index) => {
      const visualAngle = entry.angle;
      const radialOffset = clusterRadialOffset(index, group.length);
      const markerRadius = baseRadius + radialOffset;
      const markerBase = polarToCartesian(center, center, markerRadius, visualAngle);
      const tangentRad = ((visualAngle + 90) * Math.PI) / 180;
      const tangentOffset = tangentOffsets[index] ?? 0;
      const marker = {
        x: markerBase.x + Math.cos(tangentRad) * tangentOffset,
        y: markerBase.y + Math.sin(tangentRad) * tangentOffset
      };

      layouts.set(entry.key, {
        angle: entry.angle,
        clusterIndex: index,
        clusterSize: group.length,
        visualAngle,
        marker
      });
    });
  });

  return layouts;
}

export function chartHouseLabelGeometry({
  ascendant,
  ascendantLongitude,
  angleForLongitude,
  center,
  radius,
  signs
}: {
  ascendant?: string;
  ascendantLongitude?: number;
  angleForLongitude: (longitude: number) => number;
  center: number;
  radius: number;
  signs: string[];
}) {
  const ascendantSignIndex = ascendant ? signs.indexOf(ascendant) : -1;
  const startLongitude = ascendantSignIndex >= 0 ? ascendantSignIndex * 30 : 0;
  const hasAscendantAxis = typeof ascendantLongitude === "number";
  const houseCusps = Array.from({ length: 12 }, (_, index) => normalizedAngle(startLongitude + index * 30));

  return Array.from({ length: 12 }, (_, index) => {
    const house = index + 1;
    const start = houseCusps[index];
    const end = houseCusps[(index + 1) % 12];
    const span = normalizedAngle(end - start) || 30;
    const midpointLongitude = normalizedAngle(start + span / 2);
    const angle = angleForLongitude(midpointLongitude);
    const label = polarToCartesian(center, center, radius, angle);

    return {
      house,
      ...label,
      angle,
      ariaLabel: hasAscendantAxis || ascendant ? `${house} house` : `${house} natural house`
    };
  });
}

function normalizeSignedAngle(angle: number) {
  const normalized = normalizedAngle(angle);
  return normalized > 180 ? normalized - 360 : normalized;
}

export function chartSignLabelGeometry({
  angleForLongitude,
  center,
  radius,
  signs
}: {
  angleForLongitude: (longitude: number) => number;
  center: number;
  radius: number;
  signs: string[];
}) {
  const labelArcSpan = 24;

  return signs.map((sign, index) => {
    const midAngle = angleForLongitude(index * 30 + 15);
    const clockwiseTangent = normalizeSignedAngle(midAngle + 90);
    const useClockwisePath = Math.abs(clockwiseTangent) <= 90;
    const startAngle = midAngle + (useClockwisePath ? -labelArcSpan / 2 : labelArcSpan / 2);
    const endAngle = midAngle + (useClockwisePath ? labelArcSpan / 2 : -labelArcSpan / 2);
    const label = polarToCartesian(center, center, radius, midAngle);
    const start = polarToCartesian(center, center, radius, startAngle);
    const end = polarToCartesian(center, center, radius, endAngle);

    return {
      sign,
      isLong: sign.length >= 9,
      x: label.x,
      y: label.y,
      path: [
        `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
        `A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${useClockwisePath ? 1 : 0} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
      ].join(" ")
    };
  });
}

export function chartAngularLabelGeometry({
  ascendantLongitude,
  midheavenLongitude,
  angleForLongitude,
  center,
  radius
}: {
  ascendantLongitude?: number;
  midheavenLongitude?: number;
  angleForLongitude: (longitude: number) => number;
  center: number;
  radius: number;
}) {
  if (typeof ascendantLongitude !== "number") {
    return [];
  }

  const angles: Array<readonly [string, number]> = [
    ["ASC", ascendantLongitude],
    ["DSC", ascendantLongitude + 180]
  ];

  if (typeof midheavenLongitude === "number") {
    angles.push(["MC", midheavenLongitude], ["IC", midheavenLongitude + 180]);
  }

  return angles.map(([label, longitude]) => {
    const angle = angleForLongitude(longitude);
    const point = polarToCartesian(center, center, radius, angle);

    return {
      label,
      x: point.x,
      y: point.y
    };
  });
}
