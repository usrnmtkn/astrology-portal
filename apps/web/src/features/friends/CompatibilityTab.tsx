import { FormattedProse } from "../../components/FormattedProse";
import { CardReadMore } from "../../components/CardReadMore";
import type { KeyboardEvent } from "react";

import { zodiacAssetHref, zodiacSignIconFiles } from "../../components/charts/chartAssets";
import { zodiacElementForSign } from "../../services/chartMath";
import { compatibilityCardParagraphs } from "./compatibilityCardCopy";
import { AspectBadge } from "../../components/charts/AspectBadge";

export type CompatibilityPlanetCard = {
  id: string;
  glyph: string;
  planet: string;
  comparisonLabel: string;
  youSign: string;
  friendName: string;
  friendSign: string;
  goDeeper: {
    glyph: string;
    match: string;
    body?: string;
    function: string;
    yourLine: string;
    theirLine: string;
    sameSign: boolean;
    sameSignLine: string;
    verdict: string;
    relationship: string;
    contentTrace?: string;
  };
  summary?: {
    function: string;
    nouns: string;
    shared: string;
    different: string;
    watch: string;
    try: string;
    relationship: string;
    contentTrace?: string;
  };
  exactAspectLabel?: string;
  contentTrace?: string;
};

export type CompatibilityDynamic = {
  id: string;
  heading: "What flows" | "Challenges" | "Mixed or charged dynamics";
  glyphs: string;
  aspect?: string;
  title: string;
  summary: string;
  meta: string;
};

export type CompatibilityTabProps = {
  cards: CompatibilityPlanetCard[];
  daily?: { body: string; dateLabel: string } | null;
  dynamics: CompatibilityDynamic[];
  friendName: string;
  onOpenCard?: (card: CompatibilityPlanetCard, paragraphs: string[]) => void;
};

function CompatibilitySignLabel({ sign }: { sign: string }) {
  const iconHref = zodiacAssetHref(zodiacSignIconFiles[sign]);

  return (
    <span className="compatibility-sign-label">
      {iconHref ? <img src={iconHref} alt="" aria-hidden="true" /> : null}
      <span>{sign}</span>
    </span>
  );
}


export function CompatibilityTab({
  cards,
  daily,
  dynamics,
  friendName,
  onOpenCard
}: CompatibilityTabProps) {
  const groupedDynamics = dynamics.reduce<Record<CompatibilityDynamic["heading"], CompatibilityDynamic[]>>((groups, dynamic) => {
    groups[dynamic.heading].push(dynamic);
    return groups;
  }, {
    "What flows": [],
    "Challenges": [],
    "Mixed or charged dynamics": []
  });

  return (
    <div className="friend-tab-pane friend-compat-stage friend-compatibility-stage" aria-label={`${friendName} compatibility`}>
      <div className="friend-profile-copy-column compatibility-column">
        {daily ? (
          <section className="daily-horoscope-summary friend-daily-forecast" aria-label={`Today - ${daily.dateLabel}`}>
            <span className="eyebrow section-label friend-section-label">Today - {daily.dateLabel}</span>
            <FormattedProse text={daily.body} />
          </section>
        ) : null}
        <section className="compatibility-comparisons" aria-labelledby="compatibility-comparisons-title">
          <h2 className="chart-section-title" id="compatibility-comparisons-title">Planet by planet</h2>
          <div className="compatibility-card-list">
          {cards.map((card) => {
            const writeup = card.goDeeper;
            const contentTrace = writeup.contentTrace ?? card.contentTrace;
            const sameSign = writeup.sameSign;
            const fullParagraphs = compatibilityCardParagraphs(card);
            const opensDetail = fullParagraphs.length > 0 && Boolean(onOpenCard);
            const openDetail = () => {
              if (opensDetail) {
                onOpenCard?.(card, fullParagraphs);
              }
            };
            const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
              if (!opensDetail) {
                return;
              }

              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail();
              }
            };

            return (
            <article
              aria-label={opensDetail ? `Read more about ${card.planet} compatibility` : undefined}
              className={`compatibility-card${opensDetail ? " compatibility-card--clickable" : ""}`}
              data-content-trace={contentTrace}
              data-you-element={zodiacElementForSign(card.youSign)}
              data-friend-element={zodiacElementForSign(card.friendSign)}
              key={card.id}
              onClick={openDetail}
              onKeyDown={handleKeyDown}
              role={opensDetail ? "button" : undefined}
              tabIndex={opensDetail ? 0 : undefined}
            >
              <header className="compatibility-card__header">
                <span className="compatibility-card__glyph" aria-hidden="true">{writeup.glyph || card.glyph}</span>
                {writeup.match ? <span className={`compatibility-card__match${sameSign ? " is-same-sign" : ""}`}>{writeup.match}</span> : null}
                <div>
                  <div className="compatibility-card__title-row">
                    <h3>{card.planet}</h3>

                  </div>
                </div>
              </header>
              <div className="compatibility-card__signs" aria-label={`${card.planet} signs`}>
                <span><strong>{card.comparisonLabel}</strong>: <CompatibilitySignLabel sign={card.youSign} /></span>
                <span><strong>{card.friendName}</strong>: <CompatibilitySignLabel sign={card.friendSign} /></span>
              </div>
              <div className="compatibility-card__preview" aria-hidden={opensDetail ? true : undefined}>
                {fullParagraphs.map((paragraph, index) => <FormattedProse key={`${card.id}-${index}`} text={paragraph} />)}
              </div>
              {opensDetail ? <CardReadMore appearance="icon" className="compatibility-card__action" /> : null}
            </article>
          )})}
          </div>
        </section>

        {dynamics.length > 0 ? (
          <section className="compatibility-dynamics" aria-label="Compatibility dynamics">
            {(Object.keys(groupedDynamics) as CompatibilityDynamic["heading"][]).map((heading) => (
              groupedDynamics[heading].length > 0 ? (
                <div className="compatibility-dynamics__group" key={heading}>
                  <span className="eyebrow section-label friend-section-label">{heading}</span>
                  <div className="list you-aspects-list aspect-row-list friend-aspect-list">
                    {groupedDynamics[heading].map((dynamic) => (
                      <article className="aspect-row aspect-row-static friend-aspect-row compatibility-dynamic-row" key={dynamic.id}>
                        {dynamic.aspect ? <AspectBadge aspect={dynamic.aspect} className="aspect-row-glyphs" /> : null}
                        <span className="aspect-row-copy">
                          <h4>{dynamic.title}</h4>
                          <FormattedProse text={dynamic.summary} />
                          <span className="aspect-row-subtitle ui-pill ui-pill--muted compatibility-dynamic-row__tag">
                            {dynamic.meta}
                          </span>
                        </span>
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
