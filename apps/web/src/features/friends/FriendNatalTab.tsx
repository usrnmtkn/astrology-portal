import type { AspectGiftLessonLabel } from "../../services/aspectGiftLesson";
import type { NatalAspectPatternReaderItem } from "../../services/natalAspectPatterns";
import type { SocialPlacementRow } from "../../components/charts/PlacementRows";
import type { NatalAspectPatternsSectionStatus } from "../you/NatalAspectPatternsSection";
import { AspectGiftLessonGroup } from "../../components/charts/AspectGiftLessonGroup";
import {
  AspectGlyphs,
  PlacementTableRow,
  dignitiesFor,
  friendPlacementDescription,
  placementTitleFromParts
} from "../../components/charts/PlacementRows";
import { wholeDegreeOrb } from "../sky/skyHelpers";
import { NatalAspectPatternsSection } from "../you/NatalAspectPatternsSection";
import { FriendPlacementTable } from "./FriendPlacementTables";

export type FriendNatalEmptyHouseRow = {
  house: number;
  glyph: string;
  title: string;
  description: string;
  ariaLabel: string;
  detailAvailable?: boolean;
};

export type FriendNatalAspectGroup = {
  key: string;
  label: AspectGiftLessonLabel;
  aspects: Array<{
    id: string;
    from: string;
    type: string;
    to: string;
    orb: number;
    title: string;
    summary: string;
    detailAvailable?: boolean;
  }>;
};

export function FriendNatalTab({
  aspectGroups,
  bigThreeRows,
  birthTimeUnknown,
  emptyHouseRows,
  friendName,
  hasNatalChart,
  isEventChart,
  onOpenAspect,
  onOpenEmptyHouse,
  onOpenPattern,
  onOpenPlacement,
  patternItems,
  patternStatus,
  patternTitle,
  placementRows
}: {
  aspectGroups: FriendNatalAspectGroup[];
  bigThreeRows: SocialPlacementRow[];
  birthTimeUnknown: boolean;
  emptyHouseRows: FriendNatalEmptyHouseRow[];
  friendName: string;
  hasNatalChart: boolean;
  isEventChart: boolean;
  onOpenAspect: (aspectId: string) => void;
  onOpenEmptyHouse: (house: number) => void;
  onOpenPattern: (item: NatalAspectPatternReaderItem, nestedItems: NatalAspectPatternReaderItem[]) => void;
  onOpenPlacement: (row: SocialPlacementRow) => void;
  patternItems: NatalAspectPatternReaderItem[];
  patternStatus?: NatalAspectPatternsSectionStatus;
  patternTitle: string;
  placementRows: SocialPlacementRow[];
}) {
  const placementTitle = isEventChart ? "Event placements" : `${friendName}'s natal placements`;

  return (
    <div className="friend-tab-pane friend-compat-stage friend-natal-stage" aria-label="Natal">
      <div className="friend-profile-copy-column">
        {patternStatus && (
          <NatalAspectPatternsSection
            items={patternItems}
            onOpenDetail={onOpenPattern}
            status={patternStatus}
            title={patternTitle}
          />
        )}
        <span className="eyebrow section-label friend-section-label">Big three</span>
        <div className="list you-aspects-list aspect-row-list friend-aspect-list friend-big-three-list" aria-label={`${friendName} big three`}>
          {bigThreeRows.map((row) => {
            const title = row.label === "Ascendant"
              ? `Ascendant in ${row.sign}`
              : placementTitleFromParts(row.label, row.sign, row.retrograde);
            const body = birthTimeUnknown && row.label === "Ascendant"
              ? ""
              : friendPlacementDescription(row.label, row.sign);
            const canOpenDetail = hasNatalChart
              && row.detailAvailable !== false
              && !row.sign.toLowerCase().includes("pending");

            return (
              <PlacementTableRow
                asButton={canOpenDetail}
                description={body}
                dignity={dignitiesFor(row.label, row.sign, "they")}
                glyph={row.glyph}
                key={row.id}
                onClick={canOpenDetail ? () => onOpenPlacement(row) : undefined}
                pointName={row.label}
                retrograde={row.retrograde}
                sign={row.sign}
                title={title}
                variant="friend"
              />
            );
          })}
        </div>
        {hasNatalChart && (
          <>
            <span className="eyebrow section-label friend-section-label">{placementTitle}</span>
            <FriendPlacementTable
              title={placementTitle}
              rows={placementRows}
              descriptionContext={isEventChart ? "chart" : "person"}
              generatedContext="natal"
              onPlacementClick={onOpenPlacement}
              ownerName={friendName}
              showTitle={false}
            />
            {emptyHouseRows.length > 0 && (
              <>
                <span className="eyebrow section-label friend-section-label">Empty houses</span>
                <div className="list you-list-card planet-placement-list" aria-label={`${friendName} empty houses`}>
                  {emptyHouseRows.map((row) => (
                    <PlacementTableRow
                      ariaLabel={row.detailAvailable !== false ? row.ariaLabel : `${row.title} interpretation unavailable`}
                      asButton={row.detailAvailable !== false}
                      description={row.description}
                      glyph={row.glyph}
                      house={row.house}
                      key={`friend-empty-house-${row.house}`}
                      onClick={row.detailAvailable !== false ? () => onOpenEmptyHouse(row.house) : undefined}
                      title={row.title}
                      variant="friend"
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {aspectGroups.map((group) => (
          <AspectGiftLessonGroup
            ariaLabel={`${friendName} natal aspect ${group.label}`}
            key={group.key}
            label={group.label}
            listAriaLabel={`${friendName} natal ${group.label.toLowerCase()}`}
            listClassName="friend-aspect-list friend-natal-aspects-list"
          >
            {group.aspects.map((aspect) => (
              <button
                aria-label={aspect.detailAvailable !== false
                  ? `Open full entry for ${aspect.title}`
                  : `${aspect.title} interpretation unavailable`}
                className="aspect-row aspect-row-button friend-aspect-row"
                key={aspect.id}
                disabled={aspect.detailAvailable === false}
                onClick={aspect.detailAvailable !== false ? () => onOpenAspect(aspect.id) : undefined}
                type="button"
              >
                <AspectGlyphs from={aspect.from} aspect={aspect.type} to={aspect.to} />
                <span className="aspect-row-copy">
                  <h3>{aspect.title}</h3>
                  {aspect.summary ? <p>{aspect.summary}</p> : null}
                </span>
                <span className="aspect-row-meta" aria-label={`${wholeDegreeOrb(aspect.orb)} orb`}>
                  <span className="aspect-row-dot" aria-hidden="true" />
                  <span>{wholeDegreeOrb(aspect.orb)}</span>
                </span>
              </button>
            ))}
          </AspectGiftLessonGroup>
        ))}
      </div>
    </div>
  );
}
