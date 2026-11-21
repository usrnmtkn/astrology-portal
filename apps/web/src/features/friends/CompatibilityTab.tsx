import { FormattedProse } from "../../components/FormattedProse";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { FriendProfileForecast } from "./FriendProfileForecast";
import type { KeyboardEvent } from "react";

import { signGlyph } from "../../components/charts/chartAssets";
import { zodiacElementForSign } from "../../services/chartMath";
import { compatibilityCardParagraphs } from "./compatibilityCardCopy";

export type CompatibilityPlanetCard = {
  id: string;
  glyph: string;
  planet: string;
  headline?: string;
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
  contentTrace?: string;
};

export type CompatibilityTabProps = {
  cards: CompatibilityPlanetCard[];
  dynamics?: CompatibilityDynamic[];
  daily?: { body: string; opening?: string; dateLabel: string } | null;
  friendName: string;
  onOpenCard?: (card: CompatibilityPlanetCard, paragraphs: string[]) => void;
};

export type CompatibilityDynamic = { id: string; title: string; summary: string; glyphs: string };

function CompatibilitySignLabel({ sign }: { sign: string }) {
  return <span className="compatibility-sign-label"><span className="compatibility-sign-glyph" aria-hidden="true">{signGlyph(sign)}︎</span><span>{sign}</span></span>;
}


export function CompatibilityTab({
  cards,
  dynamics = [],
  daily,
  friendName,
  onOpenCard
}: CompatibilityTabProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleCards = showAll ? cards : cards.slice(0, 6);

  return (
    <div className="friend-tab-pane friend-compat-stage friend-compatibility-stage" aria-label={`${friendName} compatibility`}>
      <div className="friend-profile-copy-column compatibility-column">
        {daily ? (
          <FriendProfileForecast className="compatibility-overview" eyebrow={`Between you · ${daily.dateLabel}`} body={daily.body} opening={daily.opening} ariaLabel={`Between you · ${daily.dateLabel}`} />
        ) : null}
        <section className="compatibility-comparisons" aria-labelledby="compatibility-comparisons-title">
          <div className="friend-profile-section-heading"><h2 className="chart-section-title" id="compatibility-comparisons-title">Planet by planet</h2>
            {cards.length > 6 ? <button type="button" className="friend-profile-see-all" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "Show less" : `See all ${cards.length}`} <ChevronRight size={16} aria-hidden="true" /></button> : null}
          </div>
          <div className="compatibility-card-list">
          {visibleCards.map((card) => {
            const writeup = card.goDeeper;
            const contentTrace = writeup.contentTrace ?? card.contentTrace;
            const sameSign = card.youSign === card.friendSign;
            const yourElement = zodiacElementForSign(card.youSign);
            const friendElement = zodiacElementForSign(card.friendSign);
            const elementLabel = sameSign ? card.youSign : yourElement === friendElement ? `${yourElement} signs` : `${yourElement} meets ${friendElement.toLowerCase()}`;
            const tag = `${card.planet} · ${elementLabel}`;
            const headline = card.headline && card.headline.toLowerCase() !== tag.toLowerCase() ? card.headline : "";
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
                <span className="compatibility-card__glyph" aria-hidden="true">{writeup.glyph || card.glyph}︎</span>
                <span className={`compatibility-card__match${sameSign ? " is-same-sign" : ""}`}>{tag}</span>
                <div>
                  <div className="compatibility-card__title-row">
                    {headline ? <h3>{headline}</h3> : null}

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
              {opensDetail ? <span className="compatibility-card__action">Read {card.planet} <ChevronRight size={16} aria-hidden="true" /></span> : null}
            </article>
          )})}
          </div>
        </section>

        {dynamics.length > 0 && <section className="compatibility-comparisons" aria-label="Compatibility dynamics">
          <div className="friend-profile-section-heading"><h2 className="chart-section-title">Challenges</h2></div>
          <div className="compatibility-card-list">{dynamics.map(dynamic => <article className="compatibility-card" key={dynamic.id}>
            <span className="friend-dynamic-card__glyphs" aria-hidden="true">{dynamic.glyphs}</span>
            <h3>{dynamic.title}</h3>
            <FormattedProse text={dynamic.summary} />
          </article>)}</div>
        </section>}

      </div>
    </div>
  );
}
