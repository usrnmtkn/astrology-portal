import { FormattedProse } from "../../components/FormattedProse";
import { CardReadMore } from "../../components/CardReadMore";
import type { AspectGiftLessonLabel } from "../../services/aspectGiftLesson";
import type { SkySnapshot } from "../../types";
import { zodiacAssetHref, aspectGlyph } from "../../components/charts/chartAssets";
import { wholeDegreeOrb } from "../sky/skyHelpers";

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

export function FriendSynastryTab({ contactGroups, explainer, friendName, onOpenContact }: {
  contactGroups: FriendSynastryAspectGroup[];
  explainer: string;
  friendName: string;
  innerIsSelf: boolean;
  innerName: string;
  innerSky: SkySnapshot | null;
  onOpenContact: (contactId: string) => void;
  outerSky: SkySnapshot | null | undefined;
}) {
  const contacts = contactGroups.flatMap(group => group.contacts);
  const strongest = [...contacts].sort((a, b) => a.orb - b.orb)[0];
  const groups = [
    { title: "What flows", contacts: contacts.filter(c => ["trine", "sextile"].includes(c.aspect)) },
    { title: "Challenges", contacts: contacts.filter(c => ["square", "opposition", "opposite"].includes(c.aspect)) },
    { title: "Mixed or charged", contacts: contacts.filter(c => !["trine", "sextile", "square", "opposition", "opposite"].includes(c.aspect)) }
  ];
  return <div className="friend-tab-pane friend-compat-stage friend-synastry-stage" aria-label="Synastry">
    <div className="friend-profile-copy-column">
      <div className="friend-profile-intro">
        <article className="relationship-explainer-card relationship-explainer-card--synastry" aria-label="What synastry shows">
          <span className="relationship-explainer-card__glyph" aria-hidden="true"><img src={zodiacAssetHref("tool-synastry.svg") ?? ""} alt="" /></span>
          <span className="relationship-explainer-card__copy"><span className="relationship-explainer-card__kicker">What synastry shows</span><FormattedProse text={explainer} /></span>
        </article>
        {strongest ? <button type="button" className="friend-profile-contact" aria-label={`Open strongest contact: ${strongest.title}`} onClick={() => onOpenContact(strongest.id)}>
          <span className="friend-profile-eyebrow">Strongest contact</span>
          <span className="friend-profile-contact__title">{strongest.title}</span>
          {strongest.description ? <FormattedProse text={strongest.description} /> : null}
        </button> : <article className="friends-logic-card"><h2>Add both charts.</h2><p>Complete birth details for both people will reveal their strongest synastry contacts.</p></article>}
      </div>
      {contacts.length ? <section className="friend-profile-dynamics" aria-labelledby="friend-dynamics-title">
        <h2 id="friend-dynamics-title">Dynamics</h2>
        <div className="friend-profile-dynamics__columns">{groups.map(group => <section key={group.title} aria-label={`${friendName} synastry ${group.title}`}>
          <h3 className="friend-profile-eyebrow">{group.title}</h3>
          <div className="friend-aspect-list">{group.contacts.map(contact => <button type="button"
            className="friend-aspect-row reading-story-card friend-dynamic-card" key={contact.id}
            aria-label={`Open full entry for ${contact.title}`} onClick={() => onOpenContact(contact.id)}>
            <span className="friend-dynamic-card__glyphs" aria-hidden="true"><span>{contact.yourPoint.glyph}︎</span><span data-aspect={contact.aspect}>{aspectGlyph(contact.aspect)}︎</span><span>{contact.friendPoint.glyph}︎</span></span>
            <span className="friend-profile-eyebrow">{contact.yourPoint.name} {contact.aspect} {contact.friendPoint.name} · <span aria-label={`${wholeDegreeOrb(contact.orb)} orb`}>{wholeDegreeOrb(contact.orb)}</span></span>
            <h4>{contact.title}</h4>
            {contact.description ? <FormattedProse className="reading-story-card__preview" text={contact.description} /> : null}
            <CardReadMore appearance="icon" />
          </button>)}</div>
        </section>)}</div>
      </section> : null}
    </div>
  </div>;
}
