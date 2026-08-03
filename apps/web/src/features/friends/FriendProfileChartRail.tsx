import type { NatalChartDataTableRow } from "../../components/charts/NatalChartDataTable";
import { NatalChartDataTable } from "../../components/charts/NatalChartDataTable";
import { SynastryWheel } from "../../components/charts/SynastryWheel";
import {
  SkyWheel,
  type HouseSignLabelStyle,
  type InterChartAspectLine
} from "../../components/charts/Wheels";
import type { PlanetPosition, SkySnapshot } from "../../types";
import { FriendNatalViewControl, type FriendNatalChartViewMode } from "./FriendNatalViewControl";
import type { FriendProfileTab } from "./friendsRouting";
import { RelationshipComparePicker, type RelationshipComparisonOption } from "./RelationshipComparePicker";

type WheelSky = Pick<
  SkySnapshot,
  "positions" | "aspects" | "ascendant" | "ascendantLongitude" | "midheavenLongitude"
>;

type FriendProfileChartRailProps = {
  activeTab: FriendProfileTab;
  chartName: string;
  chartIsEvent: boolean;
  comparisonIsSelf: boolean;
  comparisonName: string;
  comparisonOptions: RelationshipComparisonOption[];
  comparisonPickerOpen: boolean;
  comparisonSelectedId: string;
  compositeSky: WheelSky | null;
  currentSkyPositions: PlanetPosition[];
  houseSignLabelStyle: HouseSignLabelStyle;
  natalSky: WheelSky | null;
  natalTableRows: NatalChartDataTableRow[];
  natalViewMode: FriendNatalChartViewMode;
  onComparisonSelect: (id: string) => void;
  onComparisonToggle: () => void;
  onNatalViewModeChange: (mode: FriendNatalChartViewMode) => void;
  outerInitials: string;
  relationshipComparisonSky: WheelSky | null;
  synastryAspects: InterChartAspectLine[];
  transitAspects: InterChartAspectLine[];
};

export function FriendProfileChartRail({
  activeTab,
  chartName,
  chartIsEvent,
  comparisonIsSelf,
  comparisonName,
  comparisonOptions,
  comparisonPickerOpen,
  comparisonSelectedId,
  compositeSky,
  currentSkyPositions,
  houseSignLabelStyle,
  natalSky,
  natalTableRows,
  natalViewMode,
  onComparisonSelect,
  onComparisonToggle,
  onNatalViewModeChange,
  outerInitials,
  relationshipComparisonSky,
  synastryAspects,
  transitAspects
}: FriendProfileChartRailProps) {
  return (
    <div
      className="relationship-detail-left friend-detail-chart-column friend-detail-chart-rail chart-layout__visual"
      aria-label={chartIsEvent ? "Event chart" : "Relationship chart"}
    >
      {activeTab === "natal" && natalSky ? (
        <div className="friend-synastry-wheel-shell">
          <FriendNatalViewControl
            value={natalViewMode}
            onChange={onNatalViewModeChange}
            ariaLabel={`${chartName} natal chart display`}
          />
          {natalViewMode === "table" ? (
            <NatalChartDataTable
              rows={natalTableRows}
              title={`${chartName} natal placement table`}
            />
          ) : (
            <div className="chart-shell">
              <div className="wheel natal-wheel friend-wheel chart-frame" aria-label={`${chartName} natal chart wheel`}>
                <SkyWheel
                  positions={natalSky.positions}
                  aspects={natalSky.aspects}
                  ascendant={natalSky.ascendant}
                  ascendantLongitude={natalSky.ascendantLongitude}
                  midheavenLongitude={natalSky.midheavenLongitude}
                  showHouses
                  houseSignLabelStyle={houseSignLabelStyle}
                  variant="natal"
                  aspectInspector
                />
              </div>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "transits" && natalSky ? (
        <div className="friend-synastry-wheel-shell">
          <div className="chart-shell">
            <div className="wheel natal-wheel friend-wheel chart-frame" aria-label={`${chartName} transit chart wheel`}>
              <SkyWheel
                positions={natalSky.positions}
                aspects={[]}
                transitPositions={currentSkyPositions}
                transitAspects={transitAspects}
                ascendant={natalSky.ascendant}
                ascendantLongitude={natalSky.ascendantLongitude}
                midheavenLongitude={natalSky.midheavenLongitude}
                showHouses
                houseSignLabelStyle={houseSignLabelStyle}
                variant="natal"
              />
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "compatibility" && natalSky && relationshipComparisonSky ? (
        <div className="friend-synastry-wheel-shell">
          <div className="chart-shell">
            <div className="wheel natal-wheel friend-wheel chart-frame" aria-label={`${chartName} compatibility chart wheel`}>
              <SynastryWheel
                outerPositions={natalSky.positions}
                innerPositions={relationshipComparisonSky.positions}
                interAspects={synastryAspects}
                ascendant={natalSky.ascendant}
                ascendantLongitude={natalSky.ascendantLongitude}
                midheavenLongitude={natalSky.midheavenLongitude}
                innerAscendant={relationshipComparisonSky.ascendant}
                innerAscendantLongitude={relationshipComparisonSky.ascendantLongitude}
                innerMidheavenLongitude={relationshipComparisonSky.midheavenLongitude}
                houseSignLabelStyle={houseSignLabelStyle}
                aspectInspector
                outerLabel={chartName}
                innerLabel={comparisonName}
              />
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "synastry" && natalSky && relationshipComparisonSky ? (
        <div className="friend-synastry-wheel-shell">
          <div className="chart-shell">
            <div className="wheel natal-wheel friend-wheel chart-frame" aria-label={`${chartName} synastry chart wheel`}>
              <SynastryWheel
                outerPositions={natalSky.positions}
                innerPositions={relationshipComparisonSky.positions}
                interAspects={synastryAspects}
                ascendant={natalSky.ascendant}
                ascendantLongitude={natalSky.ascendantLongitude}
                midheavenLongitude={natalSky.midheavenLongitude}
                innerAscendant={relationshipComparisonSky.ascendant}
                innerAscendantLongitude={relationshipComparisonSky.ascendantLongitude}
                innerMidheavenLongitude={relationshipComparisonSky.midheavenLongitude}
                houseSignLabelStyle={houseSignLabelStyle}
                aspectInspector
                outerLabel={chartName}
                innerLabel={comparisonName}
              />
            </div>
          </div>
          <RelationshipComparePicker
            variant="synastry"
            outerName={chartName}
            outerInitials={outerInitials}
            options={comparisonOptions}
            selectedId={comparisonSelectedId}
            open={comparisonPickerOpen}
            onToggle={onComparisonToggle}
            onSelect={onComparisonSelect}
          />
        </div>
      ) : null}

      {activeTab === "composite" && compositeSky ? (
        <div className="friend-synastry-wheel-shell">
          <div className="chart-shell chart-shell--composite-inspector">
            <div
              className="wheel natal-wheel friend-wheel chart-frame"
              aria-label={`${chartName} and ${comparisonIsSelf ? "you" : comparisonName} composite chart wheel`}
            >
              <SkyWheel
                positions={compositeSky.positions}
                aspects={compositeSky.aspects}
                ascendant={compositeSky.ascendant}
                ascendantLongitude={compositeSky.ascendantLongitude}
                midheavenLongitude={compositeSky.midheavenLongitude}
                showHouses
                houseSignLabelStyle={houseSignLabelStyle}
                variant="composite"
                aspectInspector
                aspectInspectorControls={(
                  <RelationshipComparePicker
                    variant="composite"
                    options={comparisonOptions}
                    selectedId={comparisonSelectedId}
                    open={comparisonPickerOpen}
                    onToggle={onComparisonToggle}
                    onSelect={onComparisonSelect}
                  />
                )}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
