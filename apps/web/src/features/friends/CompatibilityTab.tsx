import type { KeyboardEvent } from "react";

import { zodiacAssetHref, zodiacSignIconFiles } from "../../components/charts/chartAssets";

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
  title: string;
  summary: string;
  meta: string;
};

export type CompatibilityTabProps = {
  cards: CompatibilityPlanetCard[];
  dynamics: CompatibilityDynamic[];
  friendName: string;
  onOpenCard?: (card: CompatibilityPlanetCard, paragraphs: string[]) => void;
};

const compatibilityCardPreviewCharacterLimit = 620;

function CompatibilitySignLabel({ sign }: { sign: string }) {
  const iconHref = zodiacAssetHref(zodiacSignIconFiles[sign]);

  return (
    <span className="compatibility-sign-label">
      {iconHref ? <img src={iconHref} alt="" aria-hidden="true" /> : null}
      <span>{sign}</span>
    </span>
  );
}

function compatibilityFriendCopy(copy: string, friendName: string) {
  return copy.replace(/\{friend\}('s)?/g, (_match, possessive: string | undefined) => (
    possessive ? `${friendName}'s` : friendName
  ))
    .replace(/\bthey is\b/g, "they are")
    .replace(/\bthey was\b/g, "they were")
    .replace(/\bthey needs\b/g, "they need")
    .replace(/\bthey wants\b/g, "they want")
    .replace(/\bthey feels\b/g, "they feel")
    .replace(/\bthey handles\b/g, "they handle")
    .replace(/\bthey keeps\b/g, "they keep")
    .replace(/\bthey pulls\b/g, "they pull")
    .replace(/\bthey retreats\b/g, "they retreat")
    .replace(/\bthey bolts\b/g, "they bolt")
    .replace(/\bthey goes\b/g, "they go")
    .replace(/\bthey holds\b/g, "they hold");
}

function compatibilityContentSourceLabel(contentTrace?: string) {
  if (typeof window === "undefined") {
    return null;
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
    return null;
  }

  if (contentTrace?.includes("source=authored/compat-pair/")
    || contentTrace?.includes("source=authored/compat-deep/")) {
    return "Authored";
  }

  return null;
}

function truncateAtSentenceBoundary(text: string, characterLimit: number) {
  if (text.length <= characterLimit) {
    return text;
  }

  const minimumBoundary = Math.floor(characterLimit * 0.6);
  const boundary = [". ", "? ", "! "]
    .map((marker) => text.lastIndexOf(marker, characterLimit))
    .filter((index) => index >= minimumBoundary)
    .sort((first, second) => second - first)[0];

  if (typeof boundary === "number") {
    return text.slice(0, boundary + 1).trim();
  }

  return `${text.slice(0, characterLimit).trim().replace(/[,.!?;:]?$/u, "")}...`;
}

function appendContinuationMarker(text: string) {
  return `${text.trim().replace(/(?:\.{3}|[.!?])$/u, "")}...`;
}

function compatibilityPreviewParagraphs(paragraphs: string[]) {
  const preview: string[] = [];
  let usedCharacters = 0;
  let truncated = false;

  for (const paragraph of paragraphs) {
    const separatorCharacters = preview.length > 0 ? 2 : 0;
    const remainingCharacters = compatibilityCardPreviewCharacterLimit - usedCharacters - separatorCharacters;

    if (remainingCharacters <= 0) {
      truncated = true;
      break;
    }

    if (paragraph.length <= remainingCharacters) {
      preview.push(paragraph);
      usedCharacters += separatorCharacters + paragraph.length;
      continue;
    }

    preview.push(truncateAtSentenceBoundary(paragraph, remainingCharacters));
    truncated = true;
    break;
  }

  if (paragraphs.length > preview.length) {
    truncated = true;
  }

  if (truncated && preview.length > 0) {
    preview[preview.length - 1] = appendContinuationMarker(preview[preview.length - 1]);
  }

  return { paragraphs: preview, truncated };
}

export function CompatibilityTab({
  cards,
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
        <section className="compatibility-card-list" aria-label="Planet comparisons">
          {cards.map((card) => {
            const writeup = card.goDeeper;
            const contentTrace = writeup.contentTrace ?? card.contentTrace;
            const sourceLabel = compatibilityContentSourceLabel(contentTrace);
            const sameSign = writeup.sameSign;
            const bodyCopy = writeup.body ? compatibilityFriendCopy(writeup.body, card.friendName) : "";
            const bodyParagraphs = bodyCopy.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
            const functionCopy = compatibilityFriendCopy(writeup.function, card.friendName);
            const yourLine = compatibilityFriendCopy(writeup.yourLine, card.friendName);
            const theirLine = compatibilityFriendCopy(writeup.theirLine, card.friendName);
            const sameSignLine = compatibilityFriendCopy(writeup.sameSignLine, card.friendName);
            const verdict = compatibilityFriendCopy(writeup.verdict, card.friendName);
            const fallbackParagraphs = [
              functionCopy,
              yourLine,
              sameSign ? sameSignLine : theirLine,
              verdict
            ].filter(Boolean);
            const fullParagraphs = bodyParagraphs.length > 0 ? bodyParagraphs : fallbackParagraphs;
            const preview = compatibilityPreviewParagraphs(fullParagraphs);
            const opensDetail = preview.truncated && Boolean(onOpenCard);
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
              key={card.id}
              onClick={openDetail}
              onKeyDown={handleKeyDown}
              role={opensDetail ? "button" : undefined}
              tabIndex={opensDetail ? 0 : undefined}
            >
              <header className="compatibility-card__header">
                <span className="compatibility-card__glyph" aria-hidden="true">{writeup.glyph || card.glyph}</span>
                <div>
                  <div className="compatibility-card__title-row">
                    <h3>{card.planet}</h3>
                    {sourceLabel ? (
                      <span className="compatibility-card__source" title={contentTrace ?? undefined}>
                        {sourceLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </header>
              <div className="compatibility-card__signs" aria-label={`${card.planet} signs`}>
                <span><strong>{card.comparisonLabel}</strong>: <CompatibilitySignLabel sign={card.youSign} /></span>
                <span><strong>{card.friendName}</strong>: <CompatibilitySignLabel sign={card.friendSign} /></span>
              </div>
              <div className="compatibility-card__body compatibility-card__reading">
                {preview.paragraphs.map((paragraph, index) => (
                  <p
                    className={!preview.truncated && index === preview.paragraphs.length - 1 ? "compatibility-card__verdict" : undefined}
                    key={`${card.id}-preview-${index}`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
              {card.exactAspectLabel ? (
                <p className="compatibility-card__receipt">{card.exactAspectLabel}</p>
              ) : null}
            </article>
          )})}
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
                        <span className="aspect-row-glyphs" aria-hidden="true">{dynamic.glyphs}</span>
                        <span className="aspect-row-copy">
                          <h4>{dynamic.title}</h4>
                          <p>{dynamic.summary}</p>
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
