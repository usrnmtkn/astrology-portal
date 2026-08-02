import type { AspectGiftLessonLabel } from "../../services/aspectGiftLesson";
import type { SkySnapshot } from "../../types";
import { AspectGiftLessonGroup } from "../../components/charts/AspectGiftLessonGroup";
import {
  aspectGlyph,
  aspectIconFiles,
  normalizeAspectType,
  pointIconFiles,
  zodiacAssetHref
} from "../../components/charts/chartAssets";
import { InlineGlyphIcon } from "../../components/charts/PlacementRows";
import { wholeDegreeOrb } from "../sky/skyHelpers";
import { SynastryPlacementsComparison } from "./FriendPlacementTables";

export type FriendSynastryAspectGroup = {
  key: string;
  label: AspectGiftLessonLabel;
  contacts: Array<{
    id: string;
    aspect: string;
    orb: number;
    title: string;
    subtitle: string;
    description: string;
    yourPoint: { name: string; glyph: string };
    friendPoint: { name: string; glyph: string };
  }>;
};

export function FriendSynastryTab({
  contactGroups,
  explainer,
  friendName,
  innerIsSelf,
  innerName,
  innerSky,
  onOpenContact,
  outerSky
}: {
  contactGroups: FriendSynastryAspectGroup[];
  explainer: string;
  friendName: string;
  innerIsSelf: boolean;
  innerName: string;
  innerSky: SkySnapshot | null;
  onOpenContact: (contactId: string) => void;
  outerSky: SkySnapshot | null | undefined;
}) {
  const contactCount = contactGroups.reduce((count, group) => count + group.contacts.length, 0);

  return (
    <div className="friend-tab-pane friend-compat-stage" aria-label="Synastry">
      <div className="friend-profile-copy-column">
        <article className="relationship-explainer-card relationship-explainer-card--synastry" aria-label="What synastry shows">
          <span className="relationship-explainer-card__glyph" aria-hidden="true">
            <img src={zodiacAssetHref("tool-synastry.svg") ?? ""} alt="" />
          </span>
          <span className="relationship-explainer-card__copy">
            <span className="relationship-explainer-card__kicker">What synastry shows</span>
            <p>{explainer}</p>
          </span>
        </article>
        <SynastryPlacementsComparison
          outerName={friendName}
          outerSky={outerSky}
          innerName={innerName}
          innerSky={innerSky}
          innerIsSelf={innerIsSelf}
        />
        {contactGroups.map((group) => (
          <AspectGiftLessonGroup
            ariaLabel={`${friendName} synastry ${group.label}`}
            key={group.key}
            label={group.label}
            listAriaLabel={`${friendName} compatibility ${group.label.toLowerCase()}`}
            listClassName="friend-aspect-list"
          >
            {group.contacts.map((contact) => (
              <button
                type="button"
                className="aspect-row aspect-row-button friend-aspect-row"
                key={contact.id}
                aria-label={`Open full entry for ${contact.title}`}
                onClick={() => onOpenContact(contact.id)}
              >
                <span className="aspect-row-glyphs" aria-hidden="true">
                  <InlineGlyphIcon fallback={contact.yourPoint.glyph} href={zodiacAssetHref(pointIconFiles[contact.yourPoint.name])} label={contact.yourPoint.name} preferTextGlyph />
                  <InlineGlyphIcon fallback={aspectGlyph(contact.aspect)} href={zodiacAssetHref(aspectIconFiles[normalizeAspectType(contact.aspect)])} label={contact.aspect} preferTextGlyph />
                  <InlineGlyphIcon fallback={contact.friendPoint.glyph} href={zodiacAssetHref(pointIconFiles[contact.friendPoint.name])} label={contact.friendPoint.name} preferTextGlyph />
                </span>
                <span className="aspect-row-copy">
                  <h3>{contact.title}</h3>
                  {contact.description ? <p className="synastry-contact-description">{contact.description}</p> : null}
                  <span className="aspect-row-subtitle ui-pill ui-pill--muted">{contact.subtitle}</span>
                </span>
                <span className="aspect-row-meta" aria-label={`${wholeDegreeOrb(contact.orb)} orb`}>
                  <span className="aspect-row-dot" aria-hidden="true" />
                  <span>{wholeDegreeOrb(contact.orb)}</span>
                </span>
              </button>
            ))}
          </AspectGiftLessonGroup>
        ))}
        {contactCount === 0 && (
          <article className="friends-logic-card">
            <span>Interaspects</span>
            <h3>Add both charts.</h3>
            <p>Complete birth details for both people will reveal their strongest synastry contacts.</p>
          </article>
        )}
      </div>
    </div>
  );
}
