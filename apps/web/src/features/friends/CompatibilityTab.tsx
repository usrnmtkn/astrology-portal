import { HeartHandshake } from "lucide-react";

export type CompatibilityPlanetCard = {
  id: string;
  glyph: string;
  planet: string;
  topic: string;
  youSign: string;
  friendName: string;
  friendSign: string;
  planetFunction: string;
  yourStyle: string;
  friendStyle: string;
  synthesis: string;
  practice: string;
  exactAspectLabel?: string;
  contentTrace?: string;
};

export type CompatibilityDynamic = {
  id: string;
  heading: "What flows" | "What needs care" | "Mixed or charged dynamics";
  glyphs: string;
  title: string;
  summary: string;
  meta: string;
};

export type CompatibilityTabProps = {
  atAGlance: string[];
  cards: CompatibilityPlanetCard[];
  comparisonLabel: string;
  dynamics: CompatibilityDynamic[];
  friendBigThree: Array<{ label: string; value: string }>;
  friendName: string;
  relationshipLabel: string;
};

export function CompatibilityTab({
  atAGlance,
  cards,
  comparisonLabel,
  dynamics,
  friendBigThree,
  friendName,
  relationshipLabel
}: CompatibilityTabProps) {
  const groupedDynamics = dynamics.reduce<Record<CompatibilityDynamic["heading"], CompatibilityDynamic[]>>((groups, dynamic) => {
    groups[dynamic.heading].push(dynamic);
    return groups;
  }, {
    "What flows": [],
    "What needs care": [],
    "Mixed or charged dynamics": []
  });

  return (
    <div className="friend-tab-pane friend-compat-stage friend-compatibility-stage" aria-label={`${friendName} compatibility`}>
      <div className="friend-profile-copy-column compatibility-column">
        <section className="compatibility-summary" aria-labelledby="compatibility-summary-title">
          <span className="compatibility-summary__icon" aria-hidden="true">
            <HeartHandshake size={20} />
          </span>
          <span className="eyebrow section-label friend-section-label">{comparisonLabel}</span>
          <h3 id="compatibility-summary-title">{friendName}</h3>
          <div className="compatibility-summary__meta">
            <span>{relationshipLabel}</span>
            {friendBigThree.map((item) => (
              <span key={item.label}>{item.label} {item.value}</span>
            ))}
          </div>
        </section>

        {atAGlance.length > 0 ? (
          <section className="compatibility-glance" aria-label="At a glance">
            <span className="eyebrow section-label friend-section-label">At a glance</span>
            <div className="compatibility-glance__list">
              {atAGlance.map((sentence) => (
                <p key={sentence}>{sentence}</p>
              ))}
            </div>
          </section>
        ) : null}

        <section className="compatibility-card-list" aria-label="Planet comparisons">
          <span className="eyebrow section-label friend-section-label">Planet comparisons</span>
          {cards.map((card) => (
            <article className="compatibility-card" key={card.id} data-content-trace={card.contentTrace}>
              <header className="compatibility-card__header">
                <span className="compatibility-card__glyph" aria-hidden="true">{card.glyph}</span>
                <span>
                  <h3>{card.planet}</h3>
                  <p>{card.topic}</p>
                </span>
              </header>
              <div className="compatibility-card__signs" aria-label={`${card.planet} signs`}>
                <span>You · {card.youSign}</span>
                <span>{card.friendName} · {card.friendSign}</span>
              </div>
              <p className="compatibility-card__function">{card.planetFunction}</p>
              <div className="compatibility-card__body">
                <p>{card.yourStyle}</p>
                <p>{card.friendStyle}</p>
                <p>{card.synthesis}</p>
                <p>{card.practice}</p>
              </div>
              {card.exactAspectLabel ? (
                <p className="compatibility-card__receipt">{card.exactAspectLabel}</p>
              ) : null}
            </article>
          ))}
        </section>

        {dynamics.length > 0 ? (
          <section className="compatibility-dynamics" aria-label="Exact dynamics">
            <span className="eyebrow section-label friend-section-label">Exact dynamics</span>
            {(Object.keys(groupedDynamics) as CompatibilityDynamic["heading"][]).map((heading) => (
              groupedDynamics[heading].length > 0 ? (
                <div className="compatibility-dynamics__group" key={heading}>
                  <h3>{heading}</h3>
                  <div className="list you-aspects-list aspect-row-list friend-aspect-list">
                    {groupedDynamics[heading].map((dynamic) => (
                      <article className="aspect-row aspect-row-static friend-aspect-row compatibility-dynamic-row" key={dynamic.id}>
                        <span className="aspect-row-glyphs" aria-hidden="true">{dynamic.glyphs}</span>
                        <span className="aspect-row-copy">
                          <h4>{dynamic.title}</h4>
                          <p>{dynamic.summary}</p>
                        </span>
                        <span className="aspect-row-meta">{dynamic.meta}</span>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
