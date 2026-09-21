import { FormattedProse } from "../FormattedProse";
import type { CareerArchetypeProfile } from "../../services/careerArchetype";

type CareerArchetypeCardProps = {
  labelClassName?: string;
  onOpenDetail?: () => void;
  profile: CareerArchetypeProfile;
};

export function CareerArchetypeCard({
  labelClassName = "section-label",
  onOpenDetail,
  profile
}: CareerArchetypeCardProps) {
  const sourceLayer = profile.sections.some((section) => section.layer === "authored")
    ? "Authored"
    : "Fallback";
  const cardClassName = [
    "career-archetype-card",
    onOpenDetail ? "career-archetype-card--button" : ""
  ].filter(Boolean).join(" ");
  const content = (
    <>
      <div className="career-archetype-card__header">
        <div>
          <span className={`eyebrow ${labelClassName}`}>Career archetype</span>
          <h3>
            {profile.title}
            <span className="career-archetype-card__source-badge">{sourceLayer}</span>
          </h3>
        </div>
        <p className="career-archetype-card__tldr">
          <strong>TLDR</strong>
          {profile.tldr}
        </p>
      </div>
      {!onOpenDetail ? (
        <>
          <FormattedProse className="career-archetype-card__summary" text={profile.summary} />
        <div className="career-archetype-card__factors" aria-label="Career factors">
          {profile.factors.map((factor) => (
            <span key={factor.label}>
              <strong>{factor.label}</strong>
              <em>{factor.value}</em>
            </span>
          ))}
        </div>
        <div className="career-archetype-card__sections">
          {profile.sections.map((section) => (
            <article key={section.key}>
              <div>
                <span>{section.label}</span>
                <em>{section.layer === "authored" ? "Authored" : "Fallback"}</em>
              </div>
              <h3>{section.headline}</h3>
              <FormattedProse text={section.body} />
              <small>{section.meta}</small>
            </article>
          ))}
        </div>
        </>
      ) : null}
    </>
  );

  return (
    <>
      <span className={`eyebrow ${labelClassName}`}>Career</span>
      {onOpenDetail ? (
        <button className={cardClassName} type="button" aria-label={`Read ${profile.title}`} onClick={onOpenDetail}>
          {content}
        </button>
      ) : (
        <section className={cardClassName} aria-label="Career archetype">
          {content}
        </section>
      )}
    </>
  );
}
