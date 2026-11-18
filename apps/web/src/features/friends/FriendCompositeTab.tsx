import { FormattedProse } from "../../components/FormattedProse";
import type { RelationshipCompareResponse } from "../../services/tldrastroApi";
import type { AspectGiftLessonLabel } from "../../services/aspectGiftLesson";
import { PlacementTableRow, placementTitleFromParts, socialPlacementDegree, type SocialPlacementRow } from "../../components/charts/PlacementRows";
import { NatalPlacementSections } from "../../components/NatalPlacementSections";
import { emptyNatalHouseNumbers, natalHouseCardRuler } from "../../services/natalHouseCards";
import type { SkySnapshot } from "../../types";
import { zodiacSigns } from "../../services/chartMath";
import { zodiacAssetHref } from "../../components/charts/chartAssets";
import { RelationshipApiSummary, type RelationshipCompareStatus } from "./RelationshipApiSummary";

export type FriendCompositeAspectGroup = {
  key: string;
  label: AspectGiftLessonLabel;
  aspects: Array<{
    from: string;
    type: string;
    to: string;
    orb: number;
    summary: string;
  }>;
};

export function FriendCompositeTab({ aspectGroups, compositeAvailable, compositeSky, housesReliable = compositeSky?.birthTimeKnown === true, placementRows, onPlacementClick, onAspectClick, relationshipCompare, relationshipCompareStatus }: {
  aspectGroups: FriendCompositeAspectGroup[];
  compositeAvailable: boolean;
  compositeSky?: SkySnapshot | null;
  housesReliable?: boolean;
  placementRows: SocialPlacementRow[];
  onPlacementClick?: (row: SocialPlacementRow) => void;
  onAspectClick?: (aspect: FriendCompositeAspectGroup["aspects"][number]) => void;
  relationshipCompare: RelationshipCompareResponse | null;
  relationshipCompareStatus: RelationshipCompareStatus;
}) {
  const aspects = aspectGroups.flatMap(group => group.aspects).sort((a, b) => a.orb - b.orb);
  const strongest = aspects.find(aspect => aspect.summary);
  const emptyHouses = compositeSky && housesReliable ? emptyNatalHouseNumbers(compositeSky.positions) : [];
  return <div className="friend-tab-pane friend-compat-stage friend-composite-stage" aria-label="Composite">
    <div className="friend-profile-copy-column">
      <div className="friend-profile-intro">
        <article className="relationship-explainer-card relationship-explainer-card--composite" aria-label="What a composite chart is">
          <span className="relationship-explainer-card__glyph" aria-hidden="true"><img src={zodiacAssetHref("tool-composite.svg") ?? ""} alt="" /></span>
          <span className="relationship-explainer-card__copy"><span className="relationship-explainer-card__kicker">What a composite chart is</span><p>A composite chart is the relationship&apos;s own chart, built from the midpoints between two people&apos;s planets. It&apos;s read like a natal chart, but the placements describe the relationship instead of either person.</p></span>
        </article>
        {relationshipCompare || relationshipCompareStatus === "loading" ? <RelationshipApiSummary mode="composite" response={relationshipCompare} status={relationshipCompareStatus} /> : strongest ? <section className="friend-profile-contact" aria-label="Composite pattern">
          <span className="friend-profile-eyebrow">Composite pattern</span>
          <h2 className="friend-profile-contact__title"><button className="friend-profile-pattern-open" type="button" aria-label={`Open full entry for ${strongest.from} ${strongest.type} ${strongest.to}`} onClick={() => onAspectClick?.(strongest)} disabled={!onAspectClick}>{strongest.from} {strongest.type} {strongest.to}</button></h2>
          <FormattedProse text={strongest.summary} />
          <div className="friend-profile-pattern-chips">{aspects.filter(aspect => aspect !== strongest && aspect.summary).slice(0, 4).map(aspect => <button type="button" key={`${aspect.from}-${aspect.type}-${aspect.to}`} onClick={() => onAspectClick?.(aspect)} disabled={!onAspectClick}>{aspect.from} {aspect.type} {aspect.to}</button>)}</div>
        </section> : null}
      </div>
      {compositeAvailable ? <NatalPlacementSections planetTitle="Composite planets" supplementalAngleDescriptions={false} includeLuminaries snapshot={compositeSky && housesReliable ? {...compositeSky, birthTimeKnown: true} : undefined}
        items={placementRows.map(row => ({ id: row.id, pointName: row.label, node: <PlacementTableRow textGlyphs
          asButton={Boolean(onPlacementClick) && row.detailAvailable !== false} degree={socialPlacementDegree(row.degree)} description={row.description ?? ""}
          glyph={row.glyph} house={row.house} onClick={onPlacementClick && row.detailAvailable !== false ? () => onPlacementClick(row) : undefined} pointName={row.label} readMoreAppearance="icon"
          retrograde={row.retrograde} sign={row.sign} title={placementTitleFromParts(row.label, row.sign, row.retrograde)} variant="composite" /> }))}
        emptyHouses={emptyHouses.map(house => {
          const sign = zodiacSigns[(zodiacSigns.indexOf(compositeSky!.ascendant) + house - 1) % 12];
          const ruler = natalHouseCardRuler(compositeSky, house);
          return <PlacementTableRow textGlyphs key={house} glyph={String(house)} glyphBadgePointName={ruler?.name} metadata={ruler?.metadata} title={`${house}${house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th"} House in ${sign}`} variant="composite" />;
        })} /> : <article className="friends-logic-card"><h2>Composite chart needs both birth charts.</h2><p>Add complete birth data for both people to generate the composite chart view.</p></article>}
    </div>
  </div>;
}
