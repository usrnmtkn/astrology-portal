import type { PlanetPosition, SkySnapshot } from "../../types";
import { zodiacSigns } from "../../services/chartMath";
import { isDisplayRetrograde } from "../../services/astrologyDisplay";
import { formatPlanetDegree } from "../../features/sky/skyHelpers";
import type { NatalChartDataTableRow } from "./NatalChartDataTable";
import { placementPlanetOrder, type SocialPlacementRow } from "./PlacementRows";

function chartTableHouse(label: string, house?: number | null) {
  if (label === "Ascendant") {
    return 1;
  }

  return typeof house === "number" && house >= 1 && house <= 12 ? house : null;
}

function formatChartTableDegree(degree?: number | null) {
  if (typeof degree !== "number" || !Number.isFinite(degree)) {
    return "";
  }

  const normalized = ((degree % 30) + 30) % 30;
  const wholeDegrees = Math.floor(normalized);
  const minutes = Math.round((normalized - wholeDegrees) * 60);

  if (minutes >= 60) {
    return `${wholeDegrees + 1}°00'`;
  }

  return `${wholeDegrees}°${String(minutes).padStart(2, "0")}'`;
}

function natalChartTableSortValue(row: NatalChartDataTableRow) {
  const house = row.house ?? 99;
  const pointOrder: readonly string[] = placementPlanetOrder;
  const pointIndex = pointOrder.indexOf(row.label);

  return {
    house,
    pointIndex: pointIndex >= 0 ? pointIndex : 99,
    label: row.label
  };
}

function sortNatalChartTableRows(rows: NatalChartDataTableRow[]) {
  return rows.slice().sort((first, second) => {
    const firstSort = natalChartTableSortValue(first);
    const secondSort = natalChartTableSortValue(second);

    if (firstSort.house !== secondSort.house) {
      return firstSort.house - secondSort.house;
    }

    if (firstSort.pointIndex !== secondSort.pointIndex) {
      return firstSort.pointIndex - secondSort.pointIndex;
    }

    return firstSort.label.localeCompare(secondSort.label);
  });
}

function signAtWholeSignHouse(ascendant: string, house: number) {
  const ascendantIndex = zodiacSigns.indexOf(ascendant);

  if (ascendantIndex < 0 || house < 1) {
    return "";
  }

  return zodiacSigns[(ascendantIndex + house - 1) % 12] ?? "";
}

export function natalChartTableRowFromPosition(position: PlanetPosition): NatalChartDataTableRow {
  return {
    id: `natal-table-${position.planet}`,
    degree: formatPlanetDegree(position),
    glyph: position.glyph,
    house: chartTableHouse(position.planet, position.house),
    label: position.planet,
    retrograde: isDisplayRetrograde(position),
    sign: position.sign
  };
}

export function natalChartTableRowFromSocial(row: SocialPlacementRow): NatalChartDataTableRow {
  return {
    id: `friend-natal-table-${row.id}`,
    degree: formatChartTableDegree(row.degree),
    glyph: row.glyph,
    house: chartTableHouse(row.label, row.house),
    label: row.label,
    retrograde: row.retrograde,
    sign: row.sign
  };
}

export function completeNatalChartTableRows(sky: SkySnapshot, rows: NatalChartDataTableRow[]) {
  const occupiedHouses = new Set(
    rows
      .map((row) => row.house)
      .filter((house): house is number => typeof house === "number" && house >= 1 && house <= 12)
  );
  const emptyHouseRows: NatalChartDataTableRow[] = Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((house) => !occupiedHouses.has(house))
    .map((house) => ({
      id: `natal-table-empty-house-${house}`,
      degree: "",
      glyph: "",
      house,
      label: "Empty house",
      sign: signAtWholeSignHouse(sky.ascendant, house) || "—"
    }));

  return sortNatalChartTableRows([...rows, ...emptyHouseRows]);
}
