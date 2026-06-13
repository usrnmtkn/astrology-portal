type PolarPoint = {
  x: number;
  y: number;
};

export const chartHouseLabelRadiusFactor = 0.38;
export const wheelViewBox = "-20 -20 640 640";
export const angleAxisOuterPadding = 20;
export const angleLabelOuterPadding = 20;

function normalizedAngle(value: number) {
  return ((value % 360) + 360) % 360;
}

export function longitudeToChartAngle(longitudeDeg: number, ascendantDeg?: number, houseRotated = false) {
  if (houseRotated && typeof ascendantDeg === "number") {
    return 180 - normalizedAngle(longitudeDeg - ascendantDeg);
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
  angleForLongitude,
  center,
  radius
}: {
  ascendantLongitude?: number;
  angleForLongitude: (longitude: number) => number;
  center: number;
  radius: number;
}) {
  if (typeof ascendantLongitude !== "number") {
    return [];
  }

  return ([
    ["ASC", ascendantLongitude],
    ["DSC", ascendantLongitude + 180]
  ] as const).map(([label, longitude]) => {
    const angle = angleForLongitude(longitude);
    const point = polarToCartesian(center, center, radius, angle);

    return {
      label,
      x: point.x,
      y: point.y
    };
  });
}
