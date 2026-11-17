import { Expand } from "lucide-react";
import { CompositeWheel } from "../../components/charts/CompositeWheel";
import { ChartFullscreenButton } from "../../components/charts/ChartFullscreenButton";
import { SynastryWheel } from "../../components/charts/SynastryWheel";
import {
  SkyWheel,
  type HouseSignLabelStyle,
  type InterChartAspectLine
} from "../../components/charts/Wheels";
import type { PlanetPosition, SkySnapshot } from "../../types";
import type { FriendProfileTab } from "./friendsRouting";
import { RelationshipComparePicker, type RelationshipComparisonOption } from "./RelationshipComparePicker";
import { InteractiveZodiacWheel } from "../../components/charts/LazyInteractiveZodiacWheel";
import type { PronounChoice } from "../../services/personReferences";

type WheelSky = Pick<
  SkySnapshot,
  "positions" | "aspects" | "ascendant" | "ascendantLongitude" | "midheavenLongitude"
> & Partial<Pick<SkySnapshot, "generatedAt" | "birthTimeKnown" | "solarHorizon" | "sharedNatalSect">>;

type FriendProfileChartRailProps = {
  activeTab: FriendProfileTab;
  chartName: string;
  chartIsEvent: boolean;
  birthTimeUnknown?: boolean;
  pronouns?: PronounChoice;
  comparisonIsSelf: boolean;
  comparisonName: string;
  comparisonOptions: RelationshipComparisonOption[];
  comparisonPickerOpen: boolean;
  comparisonSelectedId: string;
  compositeSky: WheelSky | null;
  currentSkyPositions: PlanetPosition[];
  currentSky?: SkySnapshot | null;
  houseSignLabelStyle: HouseSignLabelStyle;
  natalSky: WheelSky | null;
  onComparisonSelect: (id: string) => void;
  onComparisonToggle: () => void;
  onOpenFullscreen: (mode: "synastry" | "composite") => void;
  relationshipComparisonSky: WheelSky | null;
  synastryAspects: InterChartAspectLine[];
  transitAspects: InterChartAspectLine[];
};

export function FriendProfileChartRail({
  activeTab, chartName, chartIsEvent, birthTimeUnknown = false, pronouns,
  comparisonIsSelf, comparisonName, comparisonOptions, comparisonPickerOpen,
  comparisonSelectedId, compositeSky, currentSkyPositions, currentSky, houseSignLabelStyle,
  natalSky, onComparisonSelect, onComparisonToggle, onOpenFullscreen,
  relationshipComparisonSky, synastryAspects, transitAspects
}: FriendProfileChartRailProps) {
  const synastry = natalSky && relationshipComparisonSky ? (
    <SynastryWheel
      outerPositions={natalSky.positions} innerPositions={relationshipComparisonSky.positions}
      interAspects={synastryAspects} ascendant={natalSky.ascendant}
      ascendantLongitude={natalSky.ascendantLongitude} midheavenLongitude={natalSky.midheavenLongitude}
      innerAscendant={relationshipComparisonSky.ascendant}
      innerAscendantLongitude={relationshipComparisonSky.ascendantLongitude}
      innerMidheavenLongitude={relationshipComparisonSky.midheavenLongitude}
      houseSignLabelStyle={houseSignLabelStyle} showHouseSystemLabel={false} aspectInspector
      outerLabel={chartName} innerLabel={comparisonName}
    />
  ) : null;
  const natal = natalSky ? <InteractiveZodiacWheel snapshot={natalSky} showHouseSystemLabel={false} mode="natal" ownerName={chartName} birthTimeUnknown={birthTimeUnknown} pronouns={pronouns} /> : null;
  const transits = natalSky ? <SkyWheel
    positions={natalSky.positions} aspects={[]} transitPositions={currentSkyPositions}
    transitAspects={transitAspects} ascendant={natalSky.ascendant}
    ascendantLongitude={natalSky.ascendantLongitude} midheavenLongitude={natalSky.midheavenLongitude}
    showHouses showHouseSystemLabel={false} houseSignLabelStyle={houseSignLabelStyle} variant="natal"
  /> : null;
  const wheel = activeTab === "natal" ? natal : activeTab === "transits" ? transits
    : activeTab === "composite" && compositeSky ? <CompositeWheel
      positions={compositeSky.positions} aspects={compositeSky.aspects} ascendant={compositeSky.ascendant}
      ascendantLongitude={compositeSky.ascendantLongitude} midheavenLongitude={compositeSky.midheavenLongitude}
      showHouses showHouseSystemLabel={false} houseSignLabelStyle={houseSignLabelStyle} aspectInspector
    /> : activeTab === "compatibility" || activeTab === "synastry" ? synastry : null;

  return <div className="relationship-detail-left friend-detail-chart-column friend-detail-chart-rail chart-layout__visual"
    aria-label={chartIsEvent ? "Event chart" : "Relationship chart"}>
    <div className="friend-synastry-wheel-shell">
      {wheel && (activeTab === "natal" || activeTab === "transits") ? (
        <ChartFullscreenButton title={activeTab === "natal" ? "Natal chart" : "Transit chart"}
          report={natalSky ? activeTab === "natal"
            ? { kind: "natal", primary: natalSky, primaryLabel: chartName, birthTimeUnknown }
            : currentSky ? { kind: "transit", primary: currentSky, secondary: { ...natalSky, birthTimeKnown: !birthTimeUnknown }, primaryLabel: "Sky · outer", secondaryLabel: `${chartName} · inner` } : undefined
            : undefined}>{wheel}</ChartFullscreenButton>
      ) : wheel ? (
        <button id="friend-profile-chart-expand" type="button" className="natal-chart-expand" aria-label="Full-screen chart"
          onClick={() => onOpenFullscreen(activeTab === "composite" ? "composite" : "synastry")}>
          <Expand size={18} aria-hidden="true" />
        </button>
      ) : null}
      {wheel ? <div className="chart-shell"><div className="wheel natal-wheel friend-wheel chart-frame"
        aria-label={activeTab === "composite" ? `${chartName} and ${comparisonIsSelf ? "you" : comparisonName} composite chart wheel` : `${chartName} ${activeTab} chart wheel`}>{wheel}</div></div> : null}
      {activeTab === "composite" && compositeSky ? <RelationshipComparePicker
        variant="composite" options={comparisonOptions} selectedId={comparisonSelectedId}
        open={comparisonPickerOpen} onToggle={onComparisonToggle} onSelect={onComparisonSelect}
      /> : null}
    </div>
  </div>;
}
