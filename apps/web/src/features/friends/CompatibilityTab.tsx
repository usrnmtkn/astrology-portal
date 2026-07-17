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

function compatibilityFriendCopy(copy: string, friendName: string) {
  let friendMentions = 0;
  const namedCopy = copy.replace(/\{friend\}('s)?/g, (_match, possessive: string | undefined) => {
    friendMentions += 1;

    if (friendMentions === 1) {
      return possessive ? `${friendName}'s` : friendName;
    }

    return possessive ? "their" : "they";
  });

  return namedCopy
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

export function CompatibilityTab({
  cards,
  dynamics,
  friendName
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
          <div className="compatibility-card-list__header">
            <span className="eyebrow section-label friend-section-label">Planet comparisons</span>
          </div>
          {cards.map((card) => {
            const writeup = card.goDeeper;
            const sameSign = writeup.sameSign;
            const functionCopy = compatibilityFriendCopy(writeup.function, card.friendName);
            const yourLine = compatibilityFriendCopy(writeup.yourLine, card.friendName);
            const theirLine = compatibilityFriendCopy(writeup.theirLine, card.friendName);
            const sameSignLine = compatibilityFriendCopy(writeup.sameSignLine, card.friendName);
            const verdict = compatibilityFriendCopy(writeup.verdict, card.friendName);

            return (
            <article className="compatibility-card" key={card.id} data-content-trace={writeup.contentTrace ?? card.contentTrace}>
              <header className="compatibility-card__header">
                <span className="compatibility-card__glyph" aria-hidden="true">{writeup.glyph || card.glyph}</span>
                <div>
                  <h3>{card.planet}</h3>
                  <p>{writeup.match}</p>
                </div>
              </header>
              <div className="compatibility-card__signs" aria-label={`${card.planet} signs`}>
                <span><strong>{card.comparisonLabel}</strong>: <CompatibilitySignLabel sign={card.youSign} /></span>
                <span><strong>{card.friendName}</strong>: <CompatibilitySignLabel sign={card.friendSign} /></span>
              </div>
              <div className="compatibility-card__body compatibility-card__reading">
                <p>{functionCopy}</p>
                {sameSign ? (
                  <>
                    <p>{yourLine}</p>
                    {sameSignLine ? <p>{sameSignLine}</p> : null}
                  </>
                ) : (
                  <>
                    <p>{yourLine}</p>
                    <p>{theirLine}</p>
                  </>
                )}
                <p className="compatibility-card__verdict">{verdict}</p>
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
