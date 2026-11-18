import { angularSeparation, calculateNatalAspects, calculateSkyAspects, normalizeDegrees } from "@tldr/astro-knowledge/sky-aspect-engine";
import { transitAspectDefinitions, transitToNatalOrbLimit } from "../astrologyConfig";
import { synastryWheelAspectOrbLimit } from "./chartMath";
import { wheelDegree, wheelSigns, zodiacWheelFacts, type ZodiacWheelSnapshot } from "./zodiacWheelFacts";
import { pointGlyph } from "../../../../src/shared/components/charts/chartAssets";

export type ChartKind = "sky" | "natal" | "transit" | "synastry" | "composite";
export type ChartReportSource = {
  kind: ChartKind;
  primary: ZodiacWheelSnapshot;
  secondary?: ZodiacWheelSnapshot | null;
  primaryLabel?: string;
  secondaryLabel?: string;
  subtitle?: string;
  birthTimeUnknown?: boolean;
};
export type ReportPoint = { name: string; longitude: number; sign: string; degree: number; house: number | null; retrograde: boolean; speed?: number | null; extra: boolean };
export type ReportAspect = { id: string; row: string; column: string; type: string; orb: number; applying?: boolean };
export type ChartReport = {
  kind: ChartKind; title: string; subtitle: string; rectangular: boolean;
  rowLabel: string; columnLabel: string; rows: ReportPoint[]; columns: ReportPoint[];
  aspects: ReportAspect[]; notes: string[]; identity: string;
};
export const aspectSymbols: Record<string, string> = { conjunction: "☌", sextile: "⚹", square: "□", trine: "△", quincunx: "⚻", opposition: "☍" };
export const chartTitles: Record<ChartKind, string> = { sky: "Sky chart", natal: "Natal chart", transit: "Transit chart", synastry: "Synastry chart", composite: "Composite chart" };
export function reportPointGlyph(name: string) { return name === "Lot of Fortune" ? "⊗" : pointGlyph(name); }
const planets = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]);
export function reportDegree(point: ReportPoint) { return `${wheelDegree(point.degree)} ${point.sign}${point.retrograde ? " Rx" : ""}`; }

function points(snapshot: ZodiacWheelSnapshot, kind: ChartKind, unknown = false): ReportPoint[] {
  const facts = zodiacWheelFacts(snapshot, kind === "sky" || kind === "transit" ? "sky" : "natal", unknown || snapshot.birthTimeKnown === false);
  return [
    ...facts.planets.map(point => ({ name: point.name, longitude: point.longitude, sign: point.sign, degree: point.degree, house: point.house,
      retrograde: kind !== "composite" && point.retrograde, speed: kind === "composite" ? undefined : point.speed, extra: !planets.has(point.name) })),
    ...facts.angles.filter(angle => angle.key === "ASC" || angle.key === "MC").map(angle => ({ name: angle.key === "ASC" ? "Ascendant" : "Midheaven", longitude: angle.longitude,
      sign: wheelSigns[Math.floor(normalizeDegrees(angle.longitude) / 30)], degree: normalizeDegrees(angle.longitude) % 30, house: angle.house,
      retrograde: false, speed: undefined, extra: true }))
  ];
}

// The grid is uncapped. Reader-card and wheel shortlist limits must never hide a
// calculated contact from a full chart report. Orb policies remain shared.
export function buildChartReport(source: ChartReportSource, includePoints = false): ChartReport {
  const rectangular = source.kind === "transit" || source.kind === "synastry";
  const allRows = points(source.primary, source.kind, source.birthTimeUnknown);
  const allColumns = rectangular && source.secondary ? points(source.secondary, "natal") : allRows;
  const rows = allRows.filter(point => includePoints || !point.extra);
  const columns = allColumns.filter(point => includePoints || !point.extra);
  let aspects: ReportAspect[] = [];
  if (rectangular && source.secondary) {
    aspects = rows.flatMap(row => columns.flatMap(column => {
      const separation = angularSeparation(row.longitude, column.longitude);
      // Natal targets are fixed; instantaneous speed cannot overshoot exactness.
      const separationSpeed = Math.sign(((row.longitude - column.longitude + 540) % 360) - 180) * (row.speed ?? 0);
      const candidates = transitAspectDefinitions.map(definition => {
        const residual = separation - definition.exact;
        const orb = Math.abs(residual);
        const applying = Number.isFinite(row.speed) && row.speed !== 0 && orb >= 0.01
          ? residual * separationSpeed < 0 : undefined;
        return { type: definition.type, orb, applying,
          limit: source.kind === "synastry" ? synastryWheelAspectOrbLimit(definition.type, row.name, column.name)
            : transitToNatalOrbLimit(row.name, applying === undefined ? undefined : applying ? "applying" : "separating") };
      }).filter(candidate => candidate.orb <= candidate.limit).sort((a, b) => a.orb - b.orb);
      const aspect = candidates[0];
      return aspect ? [{ id: `${row.name}|${column.name}`, row: row.name, column: column.name, type: aspect.type, orb: aspect.orb,
        applying: source.kind === "transit" ? aspect.applying : undefined }] : [];
    }));
  } else if (!rectangular) {
    if (source.kind === "composite") {
      aspects = rows.flatMap((row, index) => rows.slice(0, index).flatMap(column => {
        const separation = angularSeparation(row.longitude, column.longitude);
        const aspect = transitAspectDefinitions.map(definition => ({ ...definition, difference: Math.abs(separation - definition.exact) }))
          .filter(definition => definition.difference <= definition.orb).sort((a, b) => a.difference - b.difference)[0];
        return aspect ? [{ id: `${row.name}|${column.name}`, row: row.name, column: column.name, type: aspect.type, orb: aspect.difference }] : [];
      }));
    } else {
      const calculated = (source.kind === "sky" ? calculateSkyAspects : calculateNatalAspects)(rows.map(point => ({ planet: point.name, longitude: point.longitude, speed: point.speed })));
      aspects = calculated.map(aspect => {
        const fromIndex = rows.findIndex(point => point.name === aspect.from), toIndex = rows.findIndex(point => point.name === aspect.to);
        const row = rows[Math.max(fromIndex, toIndex)], column = rows[Math.min(fromIndex, toIndex)];
        return { id: `${row.name}|${column.name}`, row: row.name, column: column.name, type: aspect.type,
          orb: Math.abs(angularSeparation(row.longitude, column.longitude) - aspect.exactAngle),
          applying: source.kind === "sky" && Number.isFinite(row.speed) && Number.isFinite(column.speed) ? aspect.applying : undefined };
      });
    }
  }
  const notes: string[] = [];
  const unknown = source.birthTimeUnknown || source.primary.birthTimeKnown === false || (rectangular && source.secondary?.birthTimeKnown === false);
  if (unknown) notes.push("Birth time unknown: time-dependent houses and angles are omitted for that chart.");
  notes.push(source.kind === "composite" ? "Midpoint composite · motion is not applicable." : "Tropical zodiac · whole-sign houses where birth time is known.");
  if (rectangular && !source.secondary) notes.push("The second chart is unavailable. No comparison aspects can be calculated.");
  const rowLabel = source.primaryLabel ?? (source.kind === "transit" ? "Sky · outer" : source.kind === "synastry" ? "Person B · outer" : "Positions");
  const columnLabel = source.secondaryLabel ?? (source.kind === "transit" ? "Natal · inner" : "Person A · inner");
  return { kind: source.kind, title: chartTitles[source.kind], subtitle: source.subtitle ?? (rectangular ? `${rowLabel} × ${columnLabel}` : source.primaryLabel ?? ""),
    rectangular, rowLabel, columnLabel, rows, columns, aspects, notes,
    identity: JSON.stringify([source.kind, rowLabel, columnLabel, source.subtitle, allRows, allColumns]) };
}
