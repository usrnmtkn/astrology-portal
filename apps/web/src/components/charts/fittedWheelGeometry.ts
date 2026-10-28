import { inwardMarkerOffset, normalizedAngle, polarToCartesian, type PolarPoint } from "./wheelGeometry.ts";

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

/** Keep relationship wheels on the natal canvas without shrinking symbols.
 * Prefer house-contained rows. If those rows would enlarge the wheel, spread
 * labels around their fixed ring, as natal labels do. Ticks retain true longitude.
 */
export function fittedWheelMarkerLayouts<T>(
  items: T[],
  keyForItem: (item: T) => string,
  longitudeForItem: (item: T) => number,
  options: Parameters<typeof houseBoundedWheelMarkerLayouts<T>>[3]
) {
  const contained = houseBoundedWheelMarkerLayouts(items, keyForItem, longitudeForItem, options);
  if ([...contained.values()].every(layout => layout.radius <= options.radius + 0.000001)) return contained;

  const { radius, center, minimumSpacing, angleForLongitude } = options;
  const entries = items.map(item => ({
    key: keyForItem(item), longitude: normalizedAngle(longitudeForItem(item))
  })).sort((a, b) => a.longitude - b.longitude || a.key.localeCompare(b.key));
  const gap = 2 * Math.asin(Math.min(1, minimumSpacing / (2 * radius))) * 180 / Math.PI;
  // Cut at the largest empty arc so a cluster across 0° stays together.
  let start = 0;
  let largestGap = 0;
  entries.forEach((entry, index) => {
    const distance = normalizedAngle(entries[(index + 1) % entries.length].longitude - entry.longitude);
    if (distance > largestGap) { largestGap = distance; start = (index + 1) % entries.length; }
  });
  const ordered = [...entries.slice(start), ...entries.slice(0, start)];
  const origin = ordered[0].longitude;
  const blocks: { start: number; end: number; sum: number; count: number }[] = [];
  ordered.forEach((entry, index) => {
    blocks.push({ start: index, end: index, sum: normalizedAngle(entry.longitude - origin) - index * gap, count: 1 });
    while (blocks.length > 1) {
      const left = blocks[blocks.length - 2], right = blocks[blocks.length - 1];
      if (left.sum / left.count <= right.sum / right.count) break;
      blocks.splice(-2, 2, { start: left.start, end: right.end, sum: left.sum + right.sum, count: left.count + right.count });
    }
  });
  // Leave one complete gap across the seam, including the densest supported chart.
  const extent = 360 - ordered.length * gap;
  const lower = -Math.max(0, (ordered.length - 1) * gap - normalizedAngle(ordered.at(-1)!.longitude - origin)) / 2;
  blocks.forEach(block => {
    const offset = Math.max(lower, Math.min(lower + extent, block.sum / block.count));
    for (let index = block.start; index <= block.end; index += 1) {
      const entry = ordered[index];
      const visualAngle = normalizedAngle(angleForLongitude(origin + offset + index * gap));
      contained.set(entry.key, {
        angle: normalizedAngle(angleForLongitude(entry.longitude)), visualAngle,
        marker: polarToCartesian(center, center, radius, visualAngle), radius, scale: 1,
        sectorStartAngle: normalizedAngle(angleForLongitude(Math.floor(entry.longitude / 30) * 30))
      });
    }
  });
  return contained;
}

