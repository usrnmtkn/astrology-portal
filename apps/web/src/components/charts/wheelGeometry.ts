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
export const wheelViewBox = "-24 -24 648 648";
export const angleAxisOuterPadding = 20;
export const angleLabelOuterPadding = 20;

export function relationshipWheelViewBox(outerRadius: number) {
  const extra = Math.max(0, outerRadius - 284);
  return `${-24 - extra} ${-24 - extra} ${648 + extra * 2} ${672 + extra * 2}`;
}

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

function clusterTangentOffsets(size: number, customSpacing?: number, maxOffset = 24) {
  if (typeof customSpacing === "number") {
    const centerOffset = (size - 1) / 2;

    return Array.from({ length: size }, (_, index) => {
      const offset = (index - centerOffset) * customSpacing;

      return Math.max(-maxOffset, Math.min(maxOffset, offset));
    });
  }

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

function boundedRadius(value: number, minRadius?: number, maxRadius?: number) {
  if (typeof minRadius === "number" && value < minRadius) {
    return minRadius;
  }

  if (typeof maxRadius === "number" && value > maxRadius) {
    return maxRadius;
  }

  return value;
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
    y: centerY - Math.sin(rad) * radius
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

/** Pack labels inside their own whole-sign house. Crowded houses use centered,
 * staggered rows whose angular order follows longitude across every row.
 * The longitude used for ticks and aspects is kept separate from label placement.
 */
export function houseBoundedWheelMarkerLayouts<T>(
  items: T[],
  keyForItem: (item: T) => string,
  longitudeForItem: (item: T) => number,
  { radius, minimumRadius = radius, center, minimumSpacing, rowSpacing, glyphSize, annotationOffset, angleForLongitude }: {
    radius: number;
    minimumRadius?: number;
    center: number;
    minimumSpacing: number;
    rowSpacing: number;
    glyphSize?: number;
    annotationOffset?: number;
    angleForLongitude: (longitude: number) => number;
  }
) {
  const entries = items.map((item) => {
    const longitude = normalizedAngle(longitudeForItem(item));
    return { key: keyForItem(item), longitude, sector: Math.floor(longitude / 30) };
  }).sort((a, b) => a.longitude - b.longitude || a.key.localeCompare(b.key));
  const layouts = new Map<string, {
    angle: number;
    visualAngle: number;
    marker: PolarPoint;
    radius: number;
    scale: number;
    sectorStartAngle: number;
  }>();

  for (let sector = 0; sector < 12; sector += 1) {
    const group = entries.filter(entry => entry.sector === sector);
    if (!group.length) continue;
    const scale = 1;
    let packingRadius = radius;
    let lanes: { radius: number; gap: number; capacity: number }[];
    // Add full-size rows when a house is crowded. Never shrink its glyphs or
    // degree labels; the caller expands the surrounding rings to fit the rows.
    do {
      lanes = [];
      for (let laneRadius = packingRadius; laneRadius >= minimumRadius - 0.000001; laneRadius -= rowSpacing) {
        const gap = 2 * Math.asin(Math.min(1, minimumSpacing * scale / (2 * laneRadius))) * 180 / Math.PI;
        lanes.push({ radius: laneRadius, gap, capacity: Math.floor(30 / gap) });
      }
      if (lanes.reduce((total, lane) => total + lane.capacity, 0) >= group.length) break;
      packingRadius += rowSpacing;
    } while (true);

    let cursor = 0;
    for (const lane of lanes) {
      const row = group.slice(cursor, cursor + lane.capacity);
      cursor += row.length;
      if (!row.length) continue;
      const padding = lane.gap / 2;
      const isMultiRow = group.length > lanes[0].capacity;
      const upperBound = 30 - padding - (row.length - 1) * lane.gap;
      const blocks: { start: number; end: number; sum: number; count: number }[] = [];
      row.forEach((entry, index) => {
        const target = isMultiRow
          ? 15 + (index - (row.length - 1) / 2) * lane.gap
          : entry.longitude - sector * 30;
        blocks.push({ start: index, end: index, sum: target - index * lane.gap, count: 1 });
        while (blocks.length > 1) {
          const right = blocks[blocks.length - 1];
          const left = blocks[blocks.length - 2];
          if (left.sum / left.count <= right.sum / right.count) break;
          blocks.splice(-2, 2, { start: left.start, end: right.end, sum: left.sum + right.sum, count: left.count + right.count });
        }
      });
      blocks.forEach(block => {
        const offset = Math.max(padding, Math.min(upperBound, block.sum / block.count));
        for (let index = block.start; index <= block.end; index += 1) {
          const entry = row[index];
          const visualAngle = normalizedAngle(angleForLongitude(sector * 30 + offset + index * lane.gap));
          layouts.set(entry.key, {
            angle: normalizedAngle(angleForLongitude(entry.longitude)),
            visualAngle,
            marker: polarToCartesian(center, center, lane.radius, visualAngle),
            radius: lane.radius,
            scale,
            sectorStartAngle: normalizedAngle(angleForLongitude(sector * 30))
          });
        }
      });
    }
    // Read the whole cluster around the wheel, rather than restarting longitude
    // at the beginning of each inner row. Ticks keep their exact longitudes.
    const sectorStart = angleForLongitude(sector * 30);
    const orderedSlots = group.map(entry => layouts.get(entry.key)!).sort((a, b) =>
      normalizedAngle(a.visualAngle - sectorStart) - normalizedAngle(b.visualAngle - sectorStart)
        || b.radius - a.radius
    );
    group.forEach((entry, index) => layouts.set(entry.key, {
      ...orderedSlots[index],
      angle: normalizedAngle(angleForLongitude(entry.longitude))
    }));

    if (glyphSize) {
      // Close up each nearby group using the upright glyph boxes, rather than
      // the larger circular spacing needed to establish safe house boundaries.
      const remaining = new Set(group.map(entry => layouts.get(entry.key)!));
      while (remaining.size) {
        const cluster = [remaining.values().next().value!];
        remaining.delete(cluster[0]);
        for (const member of cluster) {
          for (const candidate of remaining) {
            if (Math.hypot(member.marker.x - candidate.marker.x, member.marker.y - candidate.marker.y) <= minimumSpacing * scale * 1.5) {
              cluster.push(candidate);
              remaining.delete(candidate);
            }
          }
        }
        if (cluster.length < 2) continue;
        const centroid = {
          x: cluster.reduce((sum, entry) => sum + entry.marker.x, 0) / cluster.length,
          y: cluster.reduce((sum, entry) => sum + entry.marker.y, 0) / cluster.length
        };
        let compression = 0.78;
        const clearance = (glyphSize + 1) * scale;
        cluster.forEach((entry, index) => cluster.slice(index + 1).forEach(other => {
          compression = Math.max(compression, Math.min(
            clearance / Math.abs(entry.marker.x - other.marker.x),
            clearance / Math.abs(entry.marker.y - other.marker.y)
          ));
        }));
        compression = Math.min(1, compression);
        if (annotationOffset !== undefined) {
          // Degrees travel with the symbols. Back off compaction if the complete
          // annotations would overlap or cross a house boundary.
          const isClear = (factor: number) => {
            if (cluster.some(entry => Math.hypot(
              centroid.x + (entry.marker.x - centroid.x) * factor - center,
              centroid.y + (entry.marker.y - centroid.y) * factor - center
            ) < minimumRadius - 0.000001)) return false;
            const angularOffsets: number[] = [];
            const boxes = group.flatMap(item => {
              const entry = layouts.get(item.key)!;
              const marker = cluster.includes(entry) ? {
                x: centroid.x + (entry.marker.x - centroid.x) * factor,
                y: centroid.y + (entry.marker.y - centroid.y) * factor
              } : entry.marker;
              angularOffsets.push(normalizedAngle(Math.atan2(center - marker.y, marker.x - center) * 180 / Math.PI - sectorStart));
              const offset = inwardMarkerOffset(center, marker, annotationOffset * scale);
              return [
                { key: item.key, x: marker.x, y: marker.y, halfWidth: glyphSize * scale / 2, halfHeight: glyphSize * scale / 2 },
                { key: item.key, x: marker.x + offset.x, y: marker.y + offset.y, halfWidth: 12 * scale, halfHeight: 6 * scale }
              ];
            });
            if (angularOffsets.some((offset, index) => index > 0 && offset < angularOffsets[index - 1] - 0.000001)) return false;
            return boxes.every((box, index) => {
              for (const dx of [-box.halfWidth, box.halfWidth]) for (const dy of [-box.halfHeight, box.halfHeight]) {
                const angle = Math.atan2(center - box.y - dy, box.x + dx - center) * 180 / Math.PI;
                if (normalizedAngle(angle - sectorStart) > 30) return false;
              }
              return boxes.slice(index + 1).every(other => box.key === other.key
                || Math.abs(box.x - other.x) >= box.halfWidth + other.halfWidth
                || Math.abs(box.y - other.y) >= box.halfHeight + other.halfHeight);
            });
          };
          for (let attempt = 0; attempt < 8 && !isClear(compression); attempt += 1) {
            compression = attempt === 7 ? 1 : (compression + 1) / 2;
          }
        }
        for (const entry of cluster) {
          entry.marker = {
            x: centroid.x + (entry.marker.x - centroid.x) * compression,
            y: centroid.y + (entry.marker.y - centroid.y) * compression
          };
          entry.radius = Math.hypot(entry.marker.x - center, entry.marker.y - center);
          entry.visualAngle = normalizedAngle(Math.atan2(center - entry.marker.y, entry.marker.x - center) * 180 / Math.PI);
        }
      }
    }
  }
  return layouts;
}

export function wheelMarkerLayouts<T>(
  items: T[],
  keyForItem: (item: T) => string,
  angleForItem: (item: T) => number,
  {
    baseRadius,
    center,
    clusterThreshold = 6,
    maxClusterSpan = 24,
    clusterTangentSpacing,
    maxClusterTangentOffset = 24,
    useClusterLane = false,
    radialOffsets,
    minMarkerRadius,
    maxMarkerRadius
  }: {
    baseRadius: number;
    center: number;
    clusterThreshold?: number;
    maxClusterSpan?: number;
    clusterTangentSpacing?: number;
    maxClusterTangentOffset?: number;
    useClusterLane?: boolean;
    radialOffsets?: number[];
    minMarkerRadius?: number;
    maxMarkerRadius?: number;
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
    const tangentOffsets = clusterTangentOffsets(group.length, clusterTangentSpacing, maxClusterTangentOffset);
    const clusterAnchor = group[0]?.angle ?? 0;
    const clusterCenterAngle = group.length > 1
      ? normalizedAngle(
          group.reduce((total, entry) => total + unwrapFrom(clusterAnchor, entry.angle), 0) / group.length
        )
      : clusterAnchor;

    group.forEach((entry, index) => {
      const visualAngle = useClusterLane && group.length > 1 ? clusterCenterAngle : entry.angle;
      const radialOffset = useClusterLane && group.length > 1
        ? 0
        : radialOffsets?.[index % radialOffsets.length] ?? clusterRadialOffset(index, group.length);
      const markerRadius = boundedRadius(baseRadius + radialOffset, minMarkerRadius, maxMarkerRadius);
      const markerBase = polarToCartesian(center, center, markerRadius, visualAngle);
      const tangentRad = ((visualAngle + 90) * Math.PI) / 180;
      const tangentOffset = tangentOffsets[index] ?? 0;
      const marker = {
        x: markerBase.x + Math.cos(tangentRad) * tangentOffset,
        y: markerBase.y - Math.sin(tangentRad) * tangentOffset
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
        `A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${useClockwisePath ? 0 : 1} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
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
