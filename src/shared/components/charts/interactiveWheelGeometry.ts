import type { WheelPoint } from "../../../../apps/web/src/services/zodiacWheelFacts";

export const interactiveWheelRadii = { outer: 292, sign: 248, planet: 206, house: 146, aspect: 112 };

export function wheelPointAt(longitude: number, radius: number, ascendant: number | null) {
  const angle = (180 + longitude - (ascendant ?? 0)) * Math.PI / 180;
  return { x: 300 + Math.cos(angle) * radius, y: 300 - Math.sin(angle) * radius };
}

export function wheelSector(longitude: number, inner: number, outer: number, ascendant: number | null) {
  const a = wheelPointAt(longitude, outer, ascendant), b = wheelPointAt(longitude + 30, outer, ascendant);
  const c = wheelPointAt(longitude + 30, inner, ascendant), d = wheelPointAt(longitude, inner, ascendant);
  return `M${a.x} ${a.y} A${outer} ${outer} 0 0 0 ${b.x} ${b.y} L${c.x} ${c.y} A${inner} ${inner} 0 0 1 ${d.x} ${d.y} Z`;
}

/** Cut at the largest empty arc before clustering so 359°/1° fan together.
 * Only glyphs move; longitude ticks and aspect endpoints never use this map. */
export function wheelFanLongitudes(points: WheelPoint[]) {
  const sorted = [...points].sort((a, b) => a.longitude - b.longitude);
  if (!sorted.length) return new Map<string, number>();
  let start = 0, largestGap = -1;
  for (let index = 0; index < sorted.length; index++) {
    const next = (index + 1) % sorted.length;
    const gap = (sorted[next].longitude - sorted[index].longitude + 360) % 360;
    if (gap > largestGap) { largestGap = gap; start = next; }
  }
  const unwrapped = Array.from({ length: sorted.length }, (_, index) => {
    const point = sorted[(start + index) % sorted.length];
    return { name: point.name, longitude: point.longitude + (start + index >= sorted.length ? 360 : 0) };
  });
  const clusters: typeof unwrapped[] = [];
  for (const point of unwrapped) {
    const cluster = clusters[clusters.length - 1];
    if (cluster && point.longitude - cluster[cluster.length - 1].longitude <= 9) cluster.push(point);
    else clusters.push([point]);
  }
  const fanned = clusters.flatMap(cluster => {
    const center = cluster.reduce((sum, point) => sum + point.longitude, 0) / cluster.length;
    return cluster.map((point, index) => ({ name: point.name, longitude: center + (index - (cluster.length - 1) / 2) * 11 }));
  });
  for (let index = 1; index < fanned.length; index++) {
    fanned[index].longitude = Math.max(fanned[index].longitude, fanned[index - 1].longitude + 11);
  }
  return new Map(fanned.map(point => [point.name, point.longitude]));
}
