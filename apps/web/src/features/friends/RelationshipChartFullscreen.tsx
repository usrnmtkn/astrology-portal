import { CompositeWheel } from "../../components/charts/CompositeWheel";
import { FullChartView } from "../../components/charts/LazyFullChartView";
import type { ChartReportSource } from "../../services/chartReport";
import type { ReactNode } from "react";
import { ModalPortal } from "../../components/ModalPortal";
import { SynastryWheel } from "../../components/charts/SynastryWheel";
import { type HouseSignLabelStyle, type InterChartAspectLine } from "../../components/charts/Wheels";
import type { SkySnapshot } from "../../types";
import { RelationshipComparePicker, type RelationshipComparisonOption } from "./RelationshipComparePicker";

export type RelationshipChartFullscreenMode = "synastry" | "composite";

type RelationshipChartFullscreenProps = {
  children: ReactNode;
  report: ChartReportSource;
  comparisonOptions: RelationshipComparisonOption[];
  comparisonPickerOpen: boolean;
  comparisonSelectedId: string;
  mode: RelationshipChartFullscreenMode;
  outerInitials?: string;
  outerName?: string;
  restoreFocusId?: string;
  onClose: () => void;
  onComparisonSelect: (id: string) => void;
  onComparisonToggle: () => void;
};

export function RelationshipChartFullscreen({
  children,
  report,
  comparisonOptions,
  comparisonPickerOpen,
  comparisonSelectedId,
  mode,
  outerInitials,
  outerName,
  restoreFocusId,
  onClose,
  onComparisonSelect,
  onComparisonToggle
}: RelationshipChartFullscreenProps) {
  const titleId = `relationship-chart-fullscreen-title-${mode}`;

  return (
    <ModalPortal
      className="chart-fullscreen-modal-root"
      panelClassName="full-chart-panel"
      titleId={titleId}
      restoreFocusId={restoreFocusId}
      onClose={onClose}
    >
      <FullChartView source={report} titleId={titleId} onClose={onClose} controls={
        <RelationshipComparePicker variant={mode} outerName={mode === "synastry" ? outerName : undefined}
          outerInitials={mode === "synastry" ? outerInitials : undefined} options={comparisonOptions}
          selectedId={comparisonSelectedId} open={comparisonPickerOpen} onToggle={onComparisonToggle} onSelect={onComparisonSelect}/>
      }>{children}</FullChartView>
    </ModalPortal>
  );
}

type WheelSky = Pick<
  SkySnapshot,
  "positions" | "aspects" | "ascendant" | "ascendantLongitude" | "midheavenLongitude"
> & Partial<Pick<SkySnapshot, "generatedAt" | "birthTimeKnown" | "solarHorizon" | "sharedNatalSect">>;

type FriendProfileChartFullscreenProps = {
  chartName: string;
  comparisonName: string;
  comparisonOptions: RelationshipComparisonOption[];
  comparisonPickerOpen: boolean;
  comparisonSelectedId: string;
  compositeSky: WheelSky | null;
  houseSignLabelStyle: HouseSignLabelStyle;
  mode: RelationshipChartFullscreenMode;
  natalSky: WheelSky | null;
  onClose: () => void;
  onComparisonSelect: (id: string) => void;
  onComparisonToggle: () => void;
  outerInitials: string;
  relationshipComparisonSky: WheelSky | null;
  synastryAspects: InterChartAspectLine[];
};

export function FriendProfileChartFullscreen({
  chartName,
  comparisonName,
  comparisonOptions,
  comparisonPickerOpen,
  comparisonSelectedId,
  compositeSky,
  houseSignLabelStyle,
  mode,
  natalSky,
  onClose,
  onComparisonSelect,
  onComparisonToggle,
  outerInitials,
  relationshipComparisonSky,
  synastryAspects
}: FriendProfileChartFullscreenProps) {
  if (mode === "synastry" && natalSky && relationshipComparisonSky) {
    return (
      <RelationshipChartFullscreen
        restoreFocusId="friend-profile-chart-expand"
        comparisonOptions={comparisonOptions}
        comparisonPickerOpen={comparisonPickerOpen}
        comparisonSelectedId={comparisonSelectedId}
        mode="synastry"
        outerName={chartName}
        outerInitials={outerInitials}
        report={{ kind: "synastry", primary: natalSky, secondary: relationshipComparisonSky, primaryLabel: `${chartName} · outer`, secondaryLabel: `${comparisonName} · inner` }}
        onClose={onClose}
        onComparisonSelect={onComparisonSelect}
        onComparisonToggle={onComparisonToggle}
      >
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
      </RelationshipChartFullscreen>
    );
  }

  if (mode === "composite" && compositeSky) {
    return (
      <RelationshipChartFullscreen
        restoreFocusId="friend-profile-chart-expand"
        comparisonOptions={comparisonOptions}
        comparisonPickerOpen={comparisonPickerOpen}
        comparisonSelectedId={comparisonSelectedId}
        mode="composite"
        report={{ kind: "composite", primary: compositeSky, subtitle: `${chartName} × ${comparisonName}` }}
        onClose={onClose}
        onComparisonSelect={onComparisonSelect}
        onComparisonToggle={onComparisonToggle}
      >
        <CompositeWheel
          positions={compositeSky.positions}
          aspects={compositeSky.aspects}
          ascendant={compositeSky.ascendant}
          ascendantLongitude={compositeSky.ascendantLongitude}
          midheavenLongitude={compositeSky.midheavenLongitude}
          showHouses
          houseSignLabelStyle={houseSignLabelStyle}
          aspectInspector
        />
      </RelationshipChartFullscreen>
    );
  }

  return null;
}
