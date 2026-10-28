import { NatalPlacementSections } from "../../components/NatalPlacementSections";
import { NatalChartReadings } from "../../components/NatalChartReadings";
import type { NatalAspectPatternReaderItem } from "../../services/natalAspectPatterns";
import type { SocialPlacementRow } from "../../components/charts/PlacementRows";
import type { NatalAspectPatternsSectionStatus } from "../you/NatalAspectPatternsSection";
import {
  PlacementTableRow,
  dignitiesFor,
  friendPlacementDescription,
  placementTitleFromParts
} from "../../components/charts/PlacementRows";
import { NatalPatternsInsights } from "../you/NatalPatternsInsights";
import { PageLoading } from "../../components/PageLoading";

export type FriendNatalEmptyHouseRow = {
  house: number;
  glyph: string;
  title: string;
  description: string;
  ariaLabel: string;
  detailAvailable?: boolean;
};

export function FriendNatalTab({
  chartId,
  bigThreeRows,
  birthTimeUnknown,
  emptyHouseRows,
  friendName,
  hasNatalChart,
  isEventChart,
  isNatalChartRepairing,
  onOpenEmptyHouse,
  onOpenPattern,
  onOpenPlacement,
  patternItems,
  patternStatus,
  patternTitle,
  placementRows,
  natalSky
}: {
  chartId: string;
  natalSky?: import("../../types").SkySnapshot | null;
  bigThreeRows: SocialPlacementRow[];
  birthTimeUnknown: boolean;
  emptyHouseRows: FriendNatalEmptyHouseRow[];
  friendName: string;
  hasNatalChart: boolean;
  isEventChart: boolean;
  isNatalChartRepairing: boolean;
  onOpenEmptyHouse: (house: number) => void;
  onOpenPattern: (item: NatalAspectPatternReaderItem, nestedItems: NatalAspectPatternReaderItem[]) => void;
  onOpenPlacement: (row: SocialPlacementRow) => void;
  patternItems: NatalAspectPatternReaderItem[];
  patternStatus?: NatalAspectPatternsSectionStatus;
  patternTitle: string;
  placementRows: SocialPlacementRow[];
}) {
  const unreliableAngleLabels = new Set(["Ascendant", "Descendant", "Midheaven", "MC", "Imum Coeli", "IC"]);
  const visibleBigThreeRows = birthTimeUnknown
    ? bigThreeRows.filter((row) => !unreliableAngleLabels.has(row.label))
    : bigThreeRows;
  const visiblePlacementRows = birthTimeUnknown
    ? placementRows.filter((row) => !unreliableAngleLabels.has(row.label))
    : placementRows;
  const visibleEmptyHouseRows = birthTimeUnknown ? [] : emptyHouseRows;

  if (isNatalChartRepairing) {
    return (
      <div
        className="friend-tab-pane friend-compat-stage friend-natal-stage"
        aria-busy="true"
        aria-label="Natal"
      >
        <div className="friend-profile-copy-column">
          <PageLoading message={`Completing ${friendName}'s natal chart`} />
        </div>
      </div>
    );
  }

  return (
    <div className="friend-tab-pane friend-compat-stage friend-natal-stage" aria-label="Natal">
      <div className="friend-profile-copy-column">

        <section className="natal-big-three" aria-label="Big Three">
        <h2 className="eyebrow section-label friend-section-label">Big Three</h2>
        <div className="list you-aspects-list aspect-row-list friend-aspect-list friend-big-three-list" aria-label={`${friendName} big three`}>
          {visibleBigThreeRows.map((row) => {
            const pending = row.sign.toLowerCase().includes("pending");
            const title = pending ? row.label : row.label === "Ascendant"
              ? `Ascendant in ${row.sign}`
              : placementTitleFromParts(row.label, row.sign, row.retrograde);
            const body = birthTimeUnknown && row.label === "Ascendant"
              ? ""
              : row.description ?? friendPlacementDescription(row.label, row.sign);
            const canOpenDetail = hasNatalChart
              && row.detailAvailable !== false
              && !pending;

            const placement = <PlacementTableRow
                asButton={canOpenDetail}
                description={body}
                dignity={dignitiesFor(row.label, row.sign, "they")}
                glyph={row.glyph}
                key={row.id}
                onClick={canOpenDetail ? () => onOpenPlacement(row) : undefined}
                pointName={row.label}
                retrograde={row.retrograde}
                sign={pending ? undefined : row.sign}
                metadata={pending ? "Pending" : undefined}
                title={title}
                variant="friend"
              />;
            return row.label === "Sun" ? <div className="natal-sun-card" key={row.id}>{placement}<NatalChartReadings snapshot={natalSky} audience="they" ownerName={friendName} chartId={chartId} disabled={isEventChart || birthTimeUnknown} presentation="sect" /></div> : placement;
          })}
        </div>
        </section>
        {hasNatalChart && <>
          <NatalPlacementSections snapshot={birthTimeUnknown || isEventChart ? undefined : natalSky} items={visiblePlacementRows.map(row => ({ id: row.id, pointName: row.label, node: <PlacementTableRow
            asButton={row.detailAvailable !== false} degree={`${Math.floor(row.degree)}°`} description={row.description ?? friendPlacementDescription(row.label, row.sign)}
            dignity={dignitiesFor(row.label, row.sign, "they")} glyph={row.glyph} house={row.house} onClick={row.detailAvailable !== false ? () => onOpenPlacement(row) : undefined}
            pointName={row.label} retrograde={row.retrograde} sign={row.sign} title={placementTitleFromParts(row.label, row.sign, row.retrograde)} variant="friend" />
          }))} emptyHouses={visibleEmptyHouseRows.map(row => <PlacementTableRow key={`friend-empty-house-${row.house}`} ariaLabel={row.ariaLabel}
            asButton={row.detailAvailable !== false} description={row.description} glyph={row.glyph} house={row.house}
            onClick={row.detailAvailable !== false ? () => onOpenEmptyHouse(row.house) : undefined} title={row.title} variant="friend" />)} />
          <NatalPatternsInsights snapshot={natalSky} audience="they" ownerName={friendName} chartId={chartId} disabled={isEventChart || birthTimeUnknown} items={patternItems} status={patternStatus} onOpenPattern={onOpenPattern}/>
        </>}
      </div>
    </div>
  );
}
