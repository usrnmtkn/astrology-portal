import type { RelationshipCompareResponse } from "../../services/tldrastroApi";
import type { AspectGiftLessonLabel } from "../../services/aspectGiftLesson";
import type { SocialPlacementRow } from "../../components/charts/PlacementRows";
import { AspectGlyphs } from "../../components/charts/PlacementRows";
import { wholeDegreeOrb } from "../sky/skyHelpers";
import { AspectGiftLessonGroup } from "../../components/charts/AspectGiftLessonGroup";
import { zodiacAssetHref } from "../../components/charts/chartAssets";
import { FriendPlacementTable } from "./FriendPlacementTables";
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

export function FriendCompositeTab({
  aspectGroups,
  compositeAvailable,
  placementRows,
  relationshipCompare,
  relationshipCompareStatus
}: {
  aspectGroups: FriendCompositeAspectGroup[];
  compositeAvailable: boolean;
  placementRows: SocialPlacementRow[];
  relationshipCompare: RelationshipCompareResponse | null;
  relationshipCompareStatus: RelationshipCompareStatus;
}) {
  return (
    <div className="friend-tab-pane friend-compat-stage" aria-label="Composite">
      <div className="friend-profile-copy-column">
        <article className="relationship-explainer-card relationship-explainer-card--composite" aria-label="What a composite chart is">
          <span className="relationship-explainer-card__glyph" aria-hidden="true">
            <img src={zodiacAssetHref("tool-composite.svg") ?? ""} alt="" />
          </span>
          <span className="relationship-explainer-card__copy">
            <span className="relationship-explainer-card__kicker">What a composite chart is</span>
            <p>
              A composite chart is the relationship&apos;s own chart, built from the midpoints between two people&apos;s planets. It&apos;s read like a natal chart, but the placements describe the relationship instead of either person.
            </p>
          </span>
        </article>
        <RelationshipApiSummary
          mode="composite"
          response={relationshipCompare}
          status={relationshipCompareStatus}
        />
        {compositeAvailable && (
          <section className="composite-placements-section">
            <span className="eyebrow section-label friend-section-label">Composite placements</span>
            <FriendPlacementTable
              title="Composite placements"
              rows={placementRows}
              compact
              generatedContext="composite"
              showTitle={false}
            />
          </section>
        )}
        {compositeAvailable ? (
          aspectGroups.length > 0 ? (
            aspectGroups.map((group) => (
              <AspectGiftLessonGroup
                ariaLabel={`Composite aspect ${group.label}`}
                key={group.key}
                label={group.label}
                listAriaLabel={`Composite ${group.label.toLowerCase()}`}
                listClassName="friend-aspect-list"
              >
                {group.aspects.map((aspect) => (
                  <div className="aspect-row aspect-row-static friend-aspect-row" key={`${aspect.from}-${aspect.type}-${aspect.to}`}>
                    <AspectGlyphs from={aspect.from} aspect={aspect.type} to={aspect.to} />
                    <span className="aspect-row-copy">
                      <h3>{aspect.from} {aspect.type} {aspect.to}</h3>
                      <p>{aspect.summary}</p>
                    </span>
                    <span className="aspect-row-meta" aria-label={`${wholeDegreeOrb(aspect.orb)} orb`}>
                      <span className="aspect-row-dot" aria-hidden="true" />
                      <span>{wholeDegreeOrb(aspect.orb)}</span>
                    </span>
                  </div>
                ))}
              </AspectGiftLessonGroup>
            ))
          ) : (
            <article className="friends-logic-card">
              <span>Composite aspects</span>
              <h3>No tight major aspects found.</h3>
              <p>The composite chart is ready, but no single aspect is leading the relationship pattern.</p>
            </article>
          )
        ) : (
          <article className="friends-logic-card">
            <span>Composite</span>
            <h3>Composite chart needs both birth charts.</h3>
            <p>Add complete birth data for both people to generate the composite chart view.</p>
          </article>
        )}
      </div>
    </div>
  );
}
